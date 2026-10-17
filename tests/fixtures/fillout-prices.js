'use strict';
// Fixture: price rows from the "Prices for your services" voice answer. The model
// is a mock (never the real API): the test decides what it replies. Postgres in
// memory, the real routes on express, the fixture payload delivered to the webhook.
// Covers Brandon's seven cases (17 Oct 2026) plus the number tracing, matching,
// deletion tombstones, the prices completeness unit and the inbox warning.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const P = require(path.join(root, 'fillout/prices.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Fillout price extraction (mock model, pg-mem) ===\n');

const SECRET = 'test-secret';
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const quiet = { info() {}, warn() {}, error() {} };

const T1 = "So prices vary, but for a typical plumbing job it's between £50 and £100. For a bathroom installation, it starts from £500 and can go up to five grand. For a wet room installation, minimum of two grand, but we've done as expensive as ten. For a boiler replacement, it's usually £600. For a boiler repair, £300.";
const T2 = "Pricing depends on what the project is, so don't worry about this one.";
const T3 = "Emergency call outs are forty five pounds an hour. Full rewires are quote only, every house is different.";

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool);

  // The mock model: replies are queued per call; a function reply gets the prompt
  const calls = [];
  const replies = [];
  const callModel = async ({ system, message, maxTokens, effort }) => {
    calls.push({ system, message, maxTokens, effort });
    const next = replies.shift();
    if (next === undefined) throw new Error('mock model: no reply queued');
    if (next instanceof Error) throw next;
    // {text, stop_reason} stands for a reply the API cut off
    if (next && typeof next === 'object') return { text: next.text, usage: { model: 'mock-model', stop_reason: next.stop_reason } };
    return { text: typeof next === 'function' ? next(message) : next, usage: { model: 'mock-model', stop_reason: 'end_turn' } };
  };
  const reply = rows => JSON.stringify({ rows });
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), fetchAudio: async () => ({ buffer: Buffer.from('ID3x'), contentType: 'audio/mpeg' }), log: quiet, callModel, modelName: 'mock-model' });
  const app = express();
  routes.mountWebhook(app, svc, { secret: SECRET, log: quiet });
  app.use(express.json());
  routes.mountApi(app, svc);
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async r => r.json();

  // A submission whose prices voice answer says `transcript`
  const submit = async (sid, name, transcript, extra = {}) => {
    const p = clone(sample);
    p.submission.submissionId = sid;
    const qs = p.submission.questions;
    qs.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = name;
    qs.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = name.toLowerCase().replace(/\s+/g, '') + '@example.com';
    qs.find(q => q.id === 'rygW9ALYDsZ1d5f2K5pRHg').value = transcript === null ? null : { url: 'http://audio.test/a.mp3', filename: 'a.mp3', transcription: transcript, duration: 20 };
    for (const [id, v] of Object.entries(extra)) qs.find(q => q.id === id).value = v;
    await req('POST', `/api/webhooks/fillout?token=${SECRET}`, p);
    for (let i = 0; i < 300; i++) {
      const r = (await pool.query(`SELECT client_id, status FROM fillout_submissions WHERE submission_id = $1`, [sid])).rows[0];
      if (r && r.status !== 'received') {
        // then wait for the background price job to settle
        for (let j = 0; j < 300; j++) { const st = (await pool.query(`SELECT status FROM client_price_state WHERE client_id = $1`, [r.client_id])).rows[0]; if (st && st.status !== 'pending') return r.client_id; await sleep(10); }
        return r.client_id;
      }
      await sleep(10);
    }
    throw new Error('submission never processed');
  };
  const view = async clientId => (await json(await req('GET', `/api/clients/${clientId}/record`)));

  try {
    // ── Pure: the prompt carries the rules; the parser checks the reply ──
    const { system, message } = P.buildPrompt(T1, 'Plumbing & Heating');
    chk('Prompt holds the extraction rules and the transcript', /Never invent, estimate or round/.test(system) && /five grand/.test(system) && message.includes(T1) && /Plumbing & Heating/.test(message), '', '');
    chk('Parser: a reply with text around the JSON still parses, numbers as strings are cleaned', (() => { const r = P.parseReply('Sure:\n```json\n{"rows":[{"service":"Boiler repair","typical_gbp":"£300"}]}\n```'); return r.length === 1 && r[0].typical_gbp === 300 && r[0].quote_only === false; })(), '', '');
    chk('Parser: a row without a service is refused', (() => { try { P.parseReply('{"rows":[{"typical_gbp":300}]}'); return false; } catch (e) { return /service/.test(e.message); } })(), '', '');
    chk('Parser: a non-number price is refused', (() => { try { P.parseReply('{"rows":[{"service":"x","from_gbp":"a ton"}]}'); return false; } catch (e) { return /from_gbp/.test(e.message); } })(), '', '');
    const nums = P.transcriptNumbers(T1);
    chk('Transcript numbers: digits, "five grand", "two grand", "ten" (and ten thousand as a thousands reading)', [50, 100, 500, 5000, 2000, 10, 10000, 600, 300].every(n => nums.has(n)), [...nums].filter(n => n <= 10000).sort((a, b) => a - b).join(' '), '10 50 100 300 500 600 2000 5000 10000');
    chk('Transcript numbers: "forty five", "a ton" is not a number, "1,200", "2.5k", "one and a half k"', (() => { const n = P.transcriptNumbers('forty five pounds, a ton, 1,200 quid, 2.5k, one and a half k'); return n.has(45) && n.has(1200) && n.has(2500) && n.has(1500) && !n.has(100) && !n.has(7); })(), '', '');
    chk('Matching: plural and case ignored, conservative otherwise', P.matchService('Boiler repairs', [{ key: 'm', value: 'boiler repair' }]) !== null && P.matchService('Wet room installation', [{ key: 'c', value: 'Wet rooms' }]) !== null && P.matchService('Bathroom installation', [{ key: 'c', value: 'Kitchen fitting' }]) === null && P.matchService('Repair', [{ key: 'c', value: 'Boiler repair' }]) === null, '', '');

    // ── 1. The sample transcript: five rows ──
    replies.push(reply([
      { service: 'Typical plumbing job', from_gbp: 50, up_to_gbp: 100, unit: 'per job' },
      { service: 'Bathroom installation', from_gbp: 500, up_to_gbp: 5000 },
      { service: 'Wet room installation', from_gbp: 2000, up_to_gbp: 10000, inferred: true, inferred_note: '"as expensive as ten" read as ten thousand, in line with the other figures' },
      { service: 'Boiler replacement', typical_gbp: 600 },
      { service: 'Boiler repair', typical_gbp: 300 },
    ]));
    // most-wanted jobs: 1 matches a row, 2 and 3 don't
    const c1 = await submit('p-0001', 'Brandons Plumbing', T1, { wRxFDYrMJbfr88Y9rLdmX2: 'Boiler repairs', '62NXtm2Nzq6NqwfXuPXt4J': 'Water softener repairs', dJr1hD9w8yY8CxxpuExfUX: 'Stopcock replacement' });
    let v = await view(c1);
    chk('1. Extraction ran in the background after processing, one model call at low effort', v.prices.state.status === 'done' && calls.length === 1 && calls[0].effort === 'low' && v.prices.state.model === 'mock-model', JSON.stringify(v.prices.state), 'done');
    chk('1. Five rows in spoken order', v.prices.rows.length === 5 && v.prices.rows.map(r => r.service).join(' | ') === 'Typical plumbing job | Bathroom installation | Wet room installation | Boiler replacement | Boiler repair', v.prices.rows.map(r => r.service).join(' | '), '5 rows');
    const by = Object.fromEntries(v.prices.rows.map(r => [r.service, r]));
    chk('1. Bathroom from 500 up to 5000', by['Bathroom installation'].from_gbp === 500 && by['Bathroom installation'].up_to_gbp === 5000 && by['Bathroom installation'].typical_gbp === null, JSON.stringify(by['Bathroom installation']), '');
    chk('1. Wet room from 2000 up to 10000, inferred, with a note', by['Wet room installation'].from_gbp === 2000 && by['Wet room installation'].up_to_gbp === 10000 && by['Wet room installation'].inferred === true && /ten thousand/.test(by['Wet room installation'].inferred_note), JSON.stringify(by['Wet room installation']), '');
    chk('1. Boiler replacement and repair typical only', by['Boiler replacement'].typical_gbp === 600 && by['Boiler replacement'].from_gbp === null && by['Boiler repair'].typical_gbp === 300 && by['Boiler repair'].up_to_gbp === null, '', '');
    chk('1. Every number traced to the transcript: nothing unverified; all rows source transcript', v.prices.rows.every(r => r.unverified === false && r.source === 'transcript'), JSON.stringify(v.prices.rows.map(r => [r.service, r.unverified])), 'all verified');
    chk('1. Transcript shown beside the rows; "Inferred value" flag; no "No prices given"', v.prices.transcript === T1 && v.prices.flags.some(f => f.code === 'inferred') && !v.prices.flags.some(f => f.code === 'no_prices'), JSON.stringify(v.prices.flags), '');
    chk('1. Prices unit filled: 47 of 70 (46 fields + prices)', v.completeness.expected === 70 && v.completeness.filled === 47, JSON.stringify(v.completeness), '47 of 70');

    // ── 6. Most-wanted matching ──
    chk('6. "Boiler repair" row matched to most-wanted job 1 "Boiler repairs"', by['Boiler repair'].matched_to && by['Boiler repair'].matched_to.key === 'most_wanted_job_1' && by['Boiler repair'].matched_to.value === 'Boiler repairs', JSON.stringify(by['Boiler repair'].matched_to), 'most_wanted_job_1');
    const mwFlags = v.prices.flags.filter(f => f.code === 'most_wanted_no_price');
    chk('6. Most-wanted jobs 2 and 3 flagged as having no price; job 1 not', mwFlags.length === 2 && mwFlags.every(f => ['most_wanted_job_2', 'most_wanted_job_3'].includes(f.key)) && v.warnings.mostWantedWithoutPrice === 2, JSON.stringify(mwFlags), '2 flags');
    const inbox1 = (await json(await req('GET', '/api/fillout/submissions'))).submissions.find(s => s.submissionId === 'p-0001');
    chk('6. Inbox carries the warning count outside the score and the prices state', inbox1.prices.status === 'done' && inbox1.prices.rows === 5 && inbox1.prices.warnings.mostWantedWithoutPrice === 2 && inbox1.completeness.filled === 47, JSON.stringify(inbox1.prices), '');

    // ── 2. No usable prices ──
    replies.push(reply([]));
    const c2 = await submit('p-0002', 'Vague Plumbing', T2);
    v = await view(c2);
    chk('2. Zero rows, "No prices given" flag, submission processed', v.prices.state.status === 'done' && v.prices.rows.length === 0 && v.prices.flags.some(f => f.code === 'no_prices') && (await pool.query(`SELECT status FROM fillout_submissions WHERE submission_id = 'p-0002'`)).rows[0].status === 'processed', JSON.stringify(v.prices), 'no_prices');
    chk('2. Prices unit blank: 46 of 70', v.completeness.expected === 70 && v.completeness.filled === 46, JSON.stringify(v.completeness), '46 of 70');
    await req('PUT', `/api/clients/${c2}/prices/not-applicable`, { value: true });
    v = await view(c2);
    chk('2. Marked not applicable by the VA: prices unit filled, state not_applicable', v.prices.state.status === 'not_applicable' && v.completeness.filled === 47 && !v.prices.flags.some(f => f.code === 'no_prices'), JSON.stringify([v.prices.state.status, v.completeness.filled]), '["not_applicable",47]');

    // ── 3. Quote only and per hour ──
    replies.push(reply([{ service: 'Emergency call outs', typical_gbp: 45, unit: 'per hour' }, { service: 'Full rewires', quote_only: true, what_moves_price: 'every house is different' }]));
    const c3 = await submit('p-0003', 'Sparks Electrical', T3);
    v = await view(c3);
    const r3 = Object.fromEntries(v.prices.rows.map(r => [r.service, r]));
    chk('3. Per-hour row: typical 45, unit per hour, verified ("forty five")', r3['Emergency call outs'].typical_gbp === 45 && r3['Emergency call outs'].unit === 'per hour' && r3['Emergency call outs'].unverified === false, JSON.stringify(r3['Emergency call outs']), '');
    chk('3. Quote-only row: no numbers, quote_only true, what moves the price kept', r3['Full rewires'].quote_only === true && r3['Full rewires'].from_gbp === null && r3['Full rewires'].typical_gbp === null && r3['Full rewires'].what_moves_price === 'every house is different', JSON.stringify(r3['Full rewires']), '');

    // ── 4. A number the transcript does not contain ──
    replies.push(reply([{ service: 'Boiler repair', typical_gbp: 350 }, { service: 'Boiler replacement', typical_gbp: 600 }]));
    const c4 = await submit('p-0004', 'Invented Numbers Ltd', T1);
    v = await view(c4);
    const r4 = Object.fromEntries(v.prices.rows.map(r => [r.service, r]));
    chk('4. 350 is not in the transcript: row kept, unverified true; 600 verified; flag shown', r4['Boiler repair'].unverified === true && r4['Boiler repair'].typical_gbp === 350 && r4['Boiler replacement'].unverified === false && v.prices.flags.some(f => f.code === 'unverified'), JSON.stringify(v.prices.rows.map(r => [r.service, r.typical_gbp, r.unverified])), 'kept, flagged');

    // ── 5. Manual edits survive; transcript rows are replaced when the transcript changes ──
    const boiler = by['Boiler repair'];
    let r = await req('PUT', `/api/clients/${c1}/prices/${boiler.id}`, { typical_gbp: 320, what_moves_price: 'parts' });
    const edited = await json(r);
    chk('5. Editing a cell sets source manual', r.status === 200 && edited.source === 'manual' && edited.typical_gbp === 320 && edited.what_moves_price === 'parts', JSON.stringify(edited), 'manual 320');
    r = await req('POST', `/api/clients/${c1}/prices`, { service: 'Stopcock replacement', typical_gbp: 90, unit: 'per job' });
    const added = await json(r);
    chk('5. Added row is manual and matched to most-wanted job 3', r.status === 200 && added.source === 'manual' && added.matched_to && added.matched_to.key === 'most_wanted_job_3', JSON.stringify(added.matched_to), 'most_wanted_job_3');
    r = await req('DELETE', `/api/clients/${c1}/prices/${by['Typical plumbing job'].id}`);
    chk('5. Deleting a transcript row hides it', r.status === 200 && !(await view(c1)).prices.rows.some(x => x.service === 'Typical plumbing job'), '', '');
    chk('5. Same transcript again: no second model call (hash unchanged)', (await svc.extractPrices(c1)).skipped === 'unchanged' && calls.length === 4, calls.length, 4);
    // A resubmission with a changed transcript (boiler replacement now £650)
    const T1b = T1.replace('£600', '£650');
    replies.push(reply([
      { service: 'Typical plumbing job', from_gbp: 50, up_to_gbp: 100 },
      { service: 'Bathroom installation', from_gbp: 500, up_to_gbp: 5000 },
      { service: 'Wet room installation', from_gbp: 2000, up_to_gbp: 10000, inferred: true, inferred_note: 'ten read as ten thousand' },
      { service: 'Boiler replacement', typical_gbp: 650 },
      { service: 'Boiler repair', typical_gbp: 300 },
    ]));
    await submit('p-0001b', 'Brandons Plumbing', T1b, { wRxFDYrMJbfr88Y9rLdmX2: 'Boiler repairs' });
    // the state was already "done", so wait for the background re-extraction itself
    for (let i = 0; i < 300 && calls.length < 5; i++) await sleep(10);
    await sleep(100);
    v = await view(c1);
    const after = Object.fromEntries(v.prices.rows.map(x => [x.service, x]));
    chk('5. Changed transcript → re-extracted (5 calls), state done', calls.length === 5 && v.prices.state.status === 'done', calls.length, 5);
    chk('5. Manual edit survived: Boiler repair still 320 / parts / manual', after['Boiler repair'].typical_gbp === 320 && after['Boiler repair'].what_moves_price === 'parts' && after['Boiler repair'].source === 'manual', JSON.stringify(after['Boiler repair']), '320 manual');
    chk('5. Manual added row survived', after['Stopcock replacement'] && after['Stopcock replacement'].source === 'manual', '', '');
    chk('5. Untouched transcript row replaced: Boiler replacement now 650', after['Boiler replacement'].typical_gbp === 650 && after['Boiler replacement'].source === 'transcript', JSON.stringify(after['Boiler replacement']), '650');
    chk('5. Deleted transcript row did not come back', !after['Typical plumbing job'], Object.keys(after).join(' | '), 'no Typical plumbing job');
    chk('5. Rows total: 4 transcript-or-manual rows shown, 1 hidden tombstone in the table', v.prices.rows.length === 5 && (await pool.query(`SELECT COUNT(*)::int AS n FROM client_price_rows WHERE client_id = $1 AND deleted = true`, [c1])).rows[0].n === 1, v.prices.rows.length, 5);

    // ── 7. Model failure, then Retry ──
    replies.push(new Error('model down'));
    const c7 = await submit('p-0007', 'Failing Plumbing', T1);
    v = await view(c7);
    chk('7. Model failure: state extraction_failed with the reason; submission still processed', v.prices.state.status === 'extraction_failed' && /model down/.test(v.prices.state.error) && (await pool.query(`SELECT status FROM fillout_submissions WHERE submission_id = 'p-0007'`)).rows[0].status === 'processed', JSON.stringify(v.prices.state), 'extraction_failed');
    chk('7. Prices unit blank while failed', v.completeness.filled === 46, v.completeness.filled, 46);
    replies.push(reply([{ service: 'Boiler repair', typical_gbp: 300 }]));
    r = await req('POST', `/api/clients/${c7}/prices/extract`);
    const retried = await json(r);
    chk('7. Retry runs the model again and the rows land', r.status === 200 && retried.rows === 1 && retried.prices.state.status === 'done' && retried.prices.rows.length === 1, JSON.stringify(retried), 'done, 1 row');
    const inbox7 = (await json(await req('GET', '/api/fillout/submissions'))).submissions.find(s => s.submissionId === 'p-0007');
    chk('7. Inbox shows the price state after retry', inbox7.prices.status === 'done' && inbox7.prices.rows === 1, JSON.stringify(inbox7.prices), '');

    // ── A bad reply from the model is a failure, not silent rows ──
    replies.push('I cannot help with that.');
    const c8 = await submit('p-0008', 'Bad Reply Ltd', T1);
    v = await view(c8);
    chk('A reply with no JSON → extraction_failed with the plain message, no rows', v.prices.state.status === 'extraction_failed' && v.prices.rows.length === 0 && /Reply too long or unreadable/.test(v.prices.state.error), JSON.stringify(v.prices.state), 'extraction_failed');

    // ── A reply cut off at the output limit ──
    chk('Extraction asks the model for 4096 output tokens', calls.every(c => c.maxTokens === 4096), [...new Set(calls.map(c => c.maxTokens))].join(','), '4096');
    replies.push({ text: '{"rows":[{"service":"Typical plumbing job","from_gbp":50,"up_to_gbp":100},{"service":"Bathroom inst', stop_reason: 'max_tokens' });
    const c10 = await submit('p-0010', 'Long Winded Plumbing', T1);
    v = await view(c10);
    const TOO_LONG = 'Reply too long or unreadable. Retry, or split the recording.';
    chk('Truncated reply (stop reason max_tokens): extraction_failed with the plain message, no rows', v.prices.state.status === 'extraction_failed' && v.prices.state.error === TOO_LONG && v.prices.rows.length === 0, JSON.stringify(v.prices.state), TOO_LONG);
    replies.push({ text: '{"rows":[', stop_reason: 'end_turn' });
    r = await req('POST', `/api/clients/${c10}/prices/extract`);
    v = await view(c10);
    chk('A complete but unreadable reply gets the same message', v.prices.state.status === 'extraction_failed' && v.prices.state.error === TOO_LONG, v.prices.state.error, TOO_LONG);
    replies.push(reply([{ service: 'Boiler repair', typical_gbp: 300 }]));
    r = await req('POST', `/api/clients/${c10}/prices/extract`);
    v = await view(c10);
    chk('Retry after a truncated reply works', v.prices.state.status === 'done' && v.prices.rows.length === 1, JSON.stringify(v.prices.state), 'done');

    // ── A failed re-extraction never touches existing rows ──
    // c1 has transcript rows from its last good run plus manual rows (Boiler repair edited, Stopcock added)
    const before = (await view(c1)).prices.rows;
    const snapshot = rows => JSON.stringify(rows.map(x => [x.id, x.service, x.from_gbp, x.up_to_gbp, x.typical_gbp, x.unit, x.what_moves_price, x.source]));
    chk('Setup: c1 holds transcript and manual rows', before.some(x => x.source === 'transcript') && before.some(x => x.source === 'manual'), before.map(x => x.source).join(','), 'both');
    replies.push({ text: '{"rows":[{"service":"Typical plumbing job","from_gbp":50,"up_to', stop_reason: 'max_tokens' });
    r = await req('POST', `/api/clients/${c1}/prices/extract`);
    v = await view(c1);
    chk('Truncated re-extraction: state extraction_failed with the message, Retry available', r.status === 200 && v.prices.state.status === 'extraction_failed' && v.prices.state.error === TOO_LONG, JSON.stringify(v.prices.state), TOO_LONG);
    chk('Truncated re-extraction: every existing row unchanged, transcript and manual', snapshot(v.prices.rows) === snapshot(before), snapshot(v.prices.rows), snapshot(before));
    chk('Truncated re-extraction: hidden tombstone still there', (await pool.query(`SELECT COUNT(*)::int AS n FROM client_price_rows WHERE client_id = $1 AND deleted = true`, [c1])).rows[0].n === 1, '', 1);
    replies.push('not json at all');
    await req('POST', `/api/clients/${c1}/prices/extract`);
    v = await view(c1);
    chk('Unreadable re-extraction: rows still unchanged', snapshot(v.prices.rows) === snapshot(before) && v.prices.state.error === TOO_LONG, '', '');
    replies.push(new Error('model down'));
    await req('POST', `/api/clients/${c1}/prices/extract`);
    v = await view(c1);
    chk('Model error on re-extraction: rows still unchanged', snapshot(v.prices.rows) === snapshot(before) && /model down/.test(v.prices.state.error), '', '');
    replies.push(reply([{ service: 'Bathroom installation', from_gbp: 500, up_to_gbp: 5000 }, { service: 'Boiler repair', typical_gbp: 300 }]));
    await req('POST', `/api/clients/${c1}/prices/extract`);
    v = await view(c1);
    const afterGood = Object.fromEntries(v.prices.rows.map(x => [x.service, x]));
    chk('Then a good re-extraction replaces transcript rows only: manual Boiler repair (320) and Stopcock kept, old transcript rows gone', v.prices.state.status === 'done' && afterGood['Boiler repair'].typical_gbp === 320 && afterGood['Boiler repair'].source === 'manual' && afterGood['Stopcock replacement'] && afterGood['Bathroom installation'].source === 'transcript' && !afterGood['Wet room installation'] && v.prices.rows.length === 3, Object.keys(afterGood).join(' | '), 'Bathroom installation | Boiler repair | Stopcock replacement');

    // ── No voice answer at all ──
    const c9 = await submit('p-0009', 'Silent Plumbing', null);
    v = await view(c9);
    chk('No recording: state no_transcript, no model call, record fine', v.prices.state.status === 'no_transcript' && v.prices.rows.length === 0 && calls.length === 15, JSON.stringify([v.prices.state.status, calls.length]), '["no_transcript",15]');
  } finally {
    srv.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
