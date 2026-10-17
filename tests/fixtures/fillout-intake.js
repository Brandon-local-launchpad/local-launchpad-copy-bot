'use strict';
// Fixture: Fillout onboarding intake, stage 1. The real routes on a real express
// app, Postgres in memory (pg-mem), a local server standing in for Fillout's audio
// files. Runs fixtures/fillout-sample.json through the webhook and checks: the
// secret, the record, niche detection, blanks, other niches ignored, the audio copy
// and transcript, duplicate delivery, a failed audio download, manual edits that
// survive a resubmission, the merge rule (name AND email), and the inbox.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const I = require(path.join(root, 'fillout/intake.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Fillout intake (pg-mem + express) ===\n');

const SECRET = 'test-webhook-secret-' + crypto.randomBytes(4).toString('hex');
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const quiet = { info() {}, warn() {}, error() {} };

(async () => {
  // ── Postgres in memory ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool);
  await ensureAudioBlobTable(pool);
  await ensurePriceTables(pool);

  // ── A stand-in for Fillout's audio host: the fixture's mp3 URL is rewritten to it ──
  const MP3 = Buffer.concat([Buffer.from('ID3'), crypto.randomBytes(2000)]);
  let audioMode = 'ok';
  const audioSrv = http.createServer((req, res) => {
    if (audioMode === 'fail') { res.statusCode = 500; return res.end('nope'); }
    res.setHeader('Content-Type', 'audio/mpeg'); res.end(MP3);
  });
  await new Promise(r => audioSrv.listen(0, '127.0.0.1', r));
  const audioUrl = `http://127.0.0.1:${audioSrv.address().port}/audio.mp3`;
  const payload = clone(sample);
  const audioQ = payload.submission.questions.find(q => q.id === 'rygW9ALYDsZ1d5f2K5pRHg');
  const realUrl = audioQ.value.url;
  audioQ.value.url = audioUrl;

  // ── The app: webhook before auth, API after ──
  const processed = [];
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  const origProcess = svc.process;
  svc.process = async id => { const r = await origProcess(id); processed.push(r); return r; };
  const app = express();
  routes.mountWebhook(app, svc, { secret: SECRET, log: quiet });
  app.use(express.json({ limit: '4mb' }));
  let authed = true;
  app.use((req, res, next) => authed ? next() : res.status(401).json({ error: 'Unauthorised' }));
  routes.mountApi(app, svc);
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const put = (p, body) => fetch(base + p, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const get = p => fetch(base + p);
  const waitProcessed = async n => { for (let i = 0; i < 200 && processed.length < n; i++) await sleep(10); return processed.length >= n; };
  // Wait until a submission has left 'received' (processing is queued, so counts shift)
  const waitDone = async sid => { for (let i = 0; i < 300; i++) { const r = (await pool.query(`SELECT status FROM fillout_submissions WHERE submission_id = $1`, [sid])).rows[0]; if (r && r.status !== 'received') return r.status; await sleep(10); } return 'timeout'; };

  try {
    // ── Pure parts ──
    chk('Suffix stripped for display', I.stripSuffix('Tree Service (1)') === 'Tree Service' && I.stripSuffix('Most wanted job 1 (23)') === 'Most wanted job 1', I.stripSuffix('Tree Service (1)'), 'Tree Service');
    chk('Blank rule: null, "", "  ", [], [""] are blank; "0" and ["x"] are not',
      [null, '', '   ', [], ['', ' ']].every(I.isBlank) && !I.isBlank('0') && !I.isBlank(['x']) && I.isBlank({ url: null, transcription: '' }) && !I.isBlank({ url: 'x' }), '', '');
    chk('Constant time secret: right accepted, wrong and empty refused', I.secretMatches(SECRET, SECRET) && !I.secretMatches(SECRET + 'x', SECRET) && !I.secretMatches('', SECRET) && !I.secretMatches(SECRET, ''), '', '');
    const map = I.loadFieldMap();
    const rec = I.buildRecord(sample, map);
    chk('Niche detected from q_niche_select', rec.niche === 'Plumbing & Heating' && rec.nicheKnown, rec.niche, 'Plumbing & Heating');
    chk('Record keeps only universal + Plumbing & Heating fields', rec.fields.every(f => f.niche === 'all' || f.niche === 'Plumbing & Heating') && rec.fields.some(f => f.key === 'cat_plumber'), rec.fields.length, '');
    const otherNicheIds = sample.submission.questions.filter(q => ['Roofer', 'Gardener', 'Locksmith', 'Plumbing', 'Drainage Service'].includes(q.name)).map(q => q.id);
    chk('Other niches\' questions (Roofer, Gardener, Locksmith, Drainage "Plumbing") never appear in the record', !rec.fields.some(f => otherNicheIds.includes(f.id)), '', '');
    chk('Values kept exactly as submitted (arrays stay arrays)', JSON.stringify(rec.fields.find(f => f.key === 'cat_plumber').value) === JSON.stringify(['Plumbing leak detection', 'Waste disposal installation', 'Plumbing leak repair']), '', '');
    chk('Blank answers are status blank with null value', rec.fields.find(f => f.key === 'current_website').status === 'blank' && rec.fields.find(f => f.key === 'current_website').value === null, '', '');
    const unknown = clone(sample); unknown.submission.questions.find(q => q.id === 'q_niche_select').value = 'Roofing';
    const recU = I.buildRecord(unknown, map);
    chk('Unknown niche: universal fields only, flagged', recU.nicheKnown === false && recU.fields.every(f => f.niche === 'all'), '', '');

    // ── Secret ──
    let r = await post('/api/webhooks/fillout', payload);
    chk('No secret → 401', r.status === 401, r.status, 401);
    r = await post('/api/webhooks/fillout?token=wrong', payload);
    chk('Wrong secret (query) → 401', r.status === 401, r.status, 401);
    r = await post('/api/webhooks/fillout', payload, { 'x-fillout-secret': 'wrong' });
    chk('Wrong secret (header) → 401', r.status === 401, r.status, 401);
    chk('No submission row was created by refused requests', (await pool.query(`SELECT COUNT(*)::int AS n FROM fillout_submissions`)).rows[0].n === 0, '', 0);

    // ── First delivery ──
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, payload);
    const body1 = await r.json();
    chk('Right secret (query) → 200 with the row id', r.status === 200 && body1.ok && body1.id && body1.duplicate === false, JSON.stringify(body1), '200 ok');
    const rawRow = (await pool.query(`SELECT raw_payload, status FROM fillout_submissions WHERE id = $1`, [body1.id])).rows[0];
    const rawObj = typeof rawRow.raw_payload === 'string' ? JSON.parse(rawRow.raw_payload) : rawRow.raw_payload;
    chk('Raw payload saved untouched (same question count and ids)', rawObj.submission.questions.length === 372 && rawObj.submission.submissionId === sample.submission.submissionId, rawObj.submission.questions.length, 372);
    chk('Processing ran in the background after the 200', await waitProcessed(1), processed.length, 1);
    const sub1 = (await pool.query(`SELECT * FROM fillout_submissions WHERE id = $1`, [body1.id])).rows[0];
    chk('Status processed, niche and business name on the row', sub1.status === 'processed' && sub1.niche === 'Plumbing & Heating' && sub1.business_name === 'brandons plumbing' && sub1.client_id, `${sub1.status} ${sub1.niche} ${sub1.business_name}`, 'processed');
    const clientId = sub1.client_id;
    const client = (await pool.query(`SELECT * FROM clients WHERE id = $1`, [clientId])).rows[0];
    chk('Client record created, marked From Fillout, unreviewed', client && client.name === 'brandons plumbing' && client.trade === 'Plumbing & Heating' && client.source === 'fillout' && !client.reviewed_at, JSON.stringify(client), 'fillout client');
    const fieldRows = (await pool.query(`SELECT field_key, status, source, value FROM client_fields WHERE client_id = $1`, [clientId])).rows;
    const byKey = Object.fromEntries(fieldRows.map(f => [f.key = f.field_key, f]));
    chk('Only mapped fields stored (universal + niche), not 372', fieldRows.length === rec.fields.length && fieldRows.length < 120, fieldRows.length, rec.fields.length);
    chk('No field from another niche block stored, even though the map now covers all 28', !fieldRows.some(f => /^[a-z_]+\./.test(f.field_key)), fieldRows.filter(f => /^[a-z_]+\./.test(f.field_key)).map(f => f.field_key).join(','), 'none');
    chk('Blank fields stored as blank, filled as filled, all source form', byKey.current_website.status === 'blank' && byKey.business_phone.status === 'filled' && fieldRows.every(f => f.source === 'form'), '', '');
    chk('No field from another niche stored', !fieldRows.some(f => ['cat_roofer', 'cat_gardener'].includes(f.field_key)) && !fieldRows.some(f => otherNicheIds.includes(f.question_id)), '', '');

    // ── Audio ──
    const audioRows = (await pool.query(`SELECT * FROM client_audio WHERE client_id = $1`, [clientId])).rows;
    chk('One audio row for the one filled voice answer', audioRows.length === 1 && audioRows[0].field_key === 'prices_voice', audioRows.length, 1);
    const a = audioRows[0];
    chk('Transcript and Fillout details kept', /£50 and £100/.test(a.transcription) && a.duration === 21 && a.filename === 'audio_kzyiaa6CZkus_2026-10-17T09:35:01.058Z.mp3', a.transcription, 'transcript');
    chk('Our own copy stored and the field points to it', a.download_status === 'stored' && a.size_bytes === MP3.length && byKey.prices_voice, a.download_status, 'stored');
    const blob = (await pool.query(`SELECT data_base64, size_bytes FROM client_audio_blobs WHERE audio_id = $1`, [a.id])).rows[0];
    chk('Bytes are in the blob table, byte for byte', blob && Buffer.from(blob.data_base64, 'base64').equals(MP3) && blob.size_bytes === MP3.length, '', '');
    r = await get(`/api/clients/${clientId}/audio/${a.id}`);
    const served = Buffer.from(await r.arrayBuffer());
    chk('Audio served from our copy with its content type', r.status === 200 && r.headers.get('content-type').startsWith('audio/mpeg') && served.equals(MP3), r.status, 200);
    chk('Record query never selects the bytes table', !(JSON.stringify(await svc.record(clientId)).includes('client_audio_blobs')), '', '');

    // ── Duplicate delivery ──
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, payload, { Authorization: `Bearer ${SECRET}` });
    const body2 = await r.json();
    await sleep(50);
    const n = (await pool.query(`SELECT COUNT(*)::int AS n FROM fillout_submissions`)).rows[0].n;
    chk('Duplicate delivery → 200, duplicate: true, still one row', r.status === 200 && body2.duplicate === true && body2.id === body1.id && n === 1, `${body2.duplicate} rows=${n}`, 'true rows=1');
    chk('Duplicate delivery did not reprocess', processed.length === 1, processed.length, 1);
    chk('Still one client', (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n === 1, '', 1);

    // ── Record API and inbox ──
    r = await get(`/api/clients/${clientId}/record`);
    const record = await r.json();
    chk('Record grouped by the form sections, niche known', r.status === 200 && record.sections.length >= 8 && record.sections[0].name === 'Business Information' && record.nicheKnown, record.sections.map(s => s.name).join(', '), 'sections');
    const allFields = record.sections.flatMap(s => s.fields);
    chk('Record shows every field we use for Plumbing & Heating', allFields.length === rec.fields.length && allFields.some(f => f.key === 'cat_gas_engineer'), allFields.length, rec.fields.length);
    // Completeness: units, not fields. Pairs count once, the accreditations are one optional group, optional fields leave the denominator.
    const k = record.completeness;
    chk('Completeness headline = filled / expected units (pairs once, optional out)', k.expected === 70 && k.filled === 46 && k.pct === 66 && k.optionalTotal === 10 && k.optionalFilled === 1 && k.fields === rec.fields.length, JSON.stringify(k), '46 of 70, 1 of 10 optional (prices unit blank)');
    const unitTest = (fs, want, label) => { const c = I.completeness(fs); chk(label, JSON.stringify([c.filled, c.expected, c.optionalFilled, c.optionalTotal]) === JSON.stringify(want), JSON.stringify([c.filled, c.expected, c.optionalFilled, c.optionalTotal]), JSON.stringify(want)); };
    unitTest([{ key: 'a_voice', group: 'a', status: 'filled' }, { key: 'a_text', group: 'a', status: 'blank' }], [1, 1, 0, 0], 'Voice filled, typed blank → one unit, filled');
    unitTest([{ key: 'a_voice', group: 'a', status: 'blank' }, { key: 'a_text', group: 'a', status: 'filled' }], [1, 1, 0, 0], 'Voice blank, typed filled → one unit, filled');
    unitTest([{ key: 'a_voice', group: 'a', status: 'blank' }, { key: 'a_text', group: 'a', status: 'blank' }, { key: 'b', status: 'filled' }], [1, 2, 0, 0], 'Both blank → one unit, blank');
    const accs = allFields.filter(f => f.group === 'accreditations');
    chk('The 15 accreditation fields are one optional group', accs.length === 15 && accs.every(f => f.optional), accs.length, 15);
    unitTest([...accs.map(f => ({ ...f, status: 'blank' })), { key: 'x', status: 'filled' }], [1, 1, 0, 1], 'Accreditations all blank → 0 of 1 optional, not 15 expected');
    unitTest([...accs.map((f, i) => ({ ...f, status: i === 0 ? 'filled' : 'blank' }))], [0, 0, 1, 1], 'One accreditation filled → 1 of 1 optional');
    const optionalKeys = ['town_1', 'town_2', 'town_3', 'anything_else', 'words_to_avoid', 'jobs_not_wanted', 'stand_out_other', 'areas_voice'];
    chk('Optional-by-design fields are marked optional', optionalKeys.every(key => (allFields.find(f => f.key === key) || {}).optional === true), optionalKeys.filter(key => !(allFields.find(f => f.key === key) || {}).optional).join(','), 'none missing');
    chk('jobs_not_wanted is filled ("nope") but counted as optional, not expected', allFields.find(f => f.key === 'jobs_not_wanted').status === 'filled' && k.optionalFilled === 1, '', '');
    chk('Property types question (removed from the form) is not in the map or the record', !map.fields.some(f => f.id === 'gbsoP3SSTnGFW5PdJ1U7zY') && !allFields.some(f => f.key === 'property_types'), '', '');

    // ── Record page panels (fillout/field-map.json "panels") ──
    const panelKeys = new Set(map.panels.map(p => p.key));
    chk('Every field in the map has a panel listed under panels', map.fields.every(f => f.panel && panelKeys.has(f.panel)), map.fields.filter(f => !f.panel || !panelKeys.has(f.panel)).map(f => f.key).join(','), 'none missing');
    chk('A map entry without a panel is refused by loadFieldMap', (() => { const fs2 = require('fs'); const tmp = path.join(require('os').tmpdir(), 'fm-nopanel.json'); const m2 = JSON.parse(JSON.stringify(map)); delete m2.fields[3].panel; fs2.writeFileSync(tmp, JSON.stringify(m2)); try { I.loadFieldMap(tmp); return false; } catch (e) { return /panel/.test(e.message); } })(), '', '');
    chk('Every record field carries its panel', allFields.every(f => f.panel && panelKeys.has(f.panel)), '', '');
    chk('Record has 11 panels with group, tag, description and counts', record.panels.length === 11 && record.panels.every(p => p.group && p.description && ['Required', 'Recommended', 'Optional'].includes(p.tag) && typeof p.filled === 'number' && ['missing', 'complete', 'none'].includes(p.status)), JSON.stringify(record.panels.map(p => [p.key, p.tag, p.status])), '');
    const sum = k => record.panels.reduce((n, p) => n + p[k], 0);
    chk('Panel counts add up to the headline: filled, expected, optional', sum('filled') === record.completeness.filled && sum('expected') === record.completeness.expected && sum('optionalFilled') === record.completeness.optionalFilled && sum('optionalTotal') === record.completeness.optionalTotal, JSON.stringify([sum('filled'), sum('expected'), sum('optionalFilled'), sum('optionalTotal')]), JSON.stringify([record.completeness.filled, record.completeness.expected, record.completeness.optionalFilled, record.completeness.optionalTotal]));
    chk('Panel fields add up to every field once', sum('fields') === allFields.length, sum('fields'), allFields.length);
    const pricesPanel = record.panels.find(p => p.key === 'prices');
    chk('The prices unit sits on the Prices panel (2 fields + prices unit = 3 expected at most)', pricesPanel.expected === 3 || pricesPanel.expected === 2, pricesPanel.expected, '2 or 3');
    chk('Record carries a needs-attention list', Array.isArray(record.attention) && record.attention.some(a => a.code === 'blank_expected' && a.panel === 'business_information'), JSON.stringify((record.attention || []).map(a => a.code)), 'blank_expected…');
    chk('Record carries duplicateOf (null for the first client)', 'duplicateOf' in record && record.duplicateOf === null, JSON.stringify(record.duplicateOf), 'null');

    const pv = allFields.find(f => f.key === 'prices_voice');
    chk('Audio field carries transcript and a playable copy', pv.audio && pv.audio.playable && /boiler repair/.test(pv.audio.transcription), JSON.stringify(pv.audio), 'playable');
    chk('Labels have no numeric suffix', allFields.every(f => !/\(\d+\)\s*$/.test(f.label)), allFields.filter(f => /\(\d+\)\s*$/.test(f.label)).map(f => f.label).join(','), 'none');
    r = await get('/api/fillout/submissions');
    const inbox = (await r.json()).submissions;
    chk('Inbox lists the submission with name, niche, status, completeness', inbox.length === 1 && inbox[0].businessName === 'brandons plumbing' && inbox[0].niche === 'Plumbing & Heating' && inbox[0].status === 'processed' && inbox[0].completeness.pct === record.completeness.pct && inbox[0].clientId === clientId, JSON.stringify(inbox[0]), '');
    authed = false;
    r = await get('/api/fillout/submissions');
    chk('Inbox needs the app login', r.status === 401, r.status, 401);
    authed = true;

    // ── Manual edit survives a resubmission ──
    r = await put(`/api/clients/${clientId}/record/current_website`, { value: 'https://brandonsplumbing.co.uk' });
    chk('Blank field filled by hand → source manual', r.status === 200 && (await r.json()).source === 'manual', r.status, 200);
    r = await put(`/api/clients/${clientId}/record/opening_hours`, { value: '8 am to 6 pm, Monday to Friday' });
    chk('Form field overwritten by hand → source manual', r.status === 200, r.status, 200);
    r = await put(`/api/clients/${clientId}/record/cat_roofer`, { value: 'x' });
    chk('A field outside the niche cannot be set', r.status >= 400, r.status, '4xx');
    r = await put(`/api/clients/${clientId}/record/prices_voice`, { value: 'x' });
    chk('A voice field cannot be typed over', r.status >= 400, r.status, '4xx');

    const resub = clone(payload);
    resub.submission.submissionId = 'resub-0001';
    resub.submission.questions.find(q => q.id === 'gRbng5fQ2nDYgLwKWAMLtP').value = '7 am to 7 pm every day';   // opening hours (manual: must not win)
    resub.submission.questions.find(q => q.id === 'erroGGUPEgr7tEQqemjQ98').value = '6';                         // team size (form: must update)
    resub.submission.questions.find(q => q.id === 'qiSfB8XCPXYmvUe49Sh8mU').value = 'https://other.example';     // website (manual: must not win)
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, resub);
    chk('Resubmission accepted', r.status === 200, r.status, 200);
    await waitProcessed(2);
    const sub2 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'resub-0001'`)).rows[0];
    chk('Same name AND email → merged into the same client, no duplicate flag', sub2.status === 'processed' && sub2.client_id === clientId && !sub2.duplicate_of, `${sub2.client_id} dup=${sub2.duplicate_of}`, clientId);
    const after = Object.fromEntries((await pool.query(`SELECT field_key, value, source FROM client_fields WHERE client_id = $1`, [clientId])).rows.map(f => [f.field_key, f]));
    const val = f => f.value; // JSONB: the driver hands values back parsed
    chk('Manual opening_hours survived the resubmission', val(after.opening_hours) === '8 am to 6 pm, Monday to Friday' && after.opening_hours.source === 'manual', val(after.opening_hours), '8 am to 6 pm, Monday to Friday');
    chk('Manual current_website survived', val(after.current_website) === 'https://brandonsplumbing.co.uk', val(after.current_website), 'https://brandonsplumbing.co.uk');
    chk('Form field team_size updated from the new submission', val(after.team_size) === '6' && after.team_size.source === 'form', val(after.team_size), '6');
    chk('Still one client after the resubmission', (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n === 1, '', 1);
    chk('Audio already stored was kept, not downloaded again', (await pool.query(`SELECT COUNT(*)::int AS n FROM client_audio WHERE client_id = $1`, [clientId])).rows[0].n === 1 && processed[1].audio.kept === 1, JSON.stringify(processed[1].audio), 'kept 1');

    // ── Merge rule: name alone or email alone never merges; flagged as possible duplicate ──
    const nameOnly = clone(payload);
    nameOnly.submission.submissionId = 'name-only-0001';
    nameOnly.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'different@example.com';
    await post(`/api/webhooks/fillout?token=${SECRET}`, nameOnly);
    await waitProcessed(3);
    const sub3 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'name-only-0001'`)).rows[0];
    chk('Same name, different email → new client, flagged possible duplicate of the first', sub3.client_id && sub3.client_id !== clientId && sub3.duplicate_of === clientId, `${sub3.client_id !== clientId} dup=${sub3.duplicate_of}`, `true dup=${clientId}`);
    const emailOnly = clone(payload);
    emailOnly.submission.submissionId = 'email-only-0001';
    emailOnly.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Brandon Heating Ltd';
    await post(`/api/webhooks/fillout?token=${SECRET}`, emailOnly);
    await waitProcessed(4);
    const sub4 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'email-only-0001'`)).rows[0];
    chk('Same email, different name → new client, flagged', sub4.client_id && sub4.client_id !== clientId && sub4.duplicate_of === clientId, `dup=${sub4.duplicate_of}`, clientId);
    const caseOnly = clone(payload);
    caseOnly.submission.submissionId = 'case-0001';
    caseOnly.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = '  BRANDONS Plumbing ';
    caseOnly.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'Brandon@Gmail.com ';
    await post(`/api/webhooks/fillout?token=${SECRET}`, caseOnly);
    await waitProcessed(5);
    const sub5 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'case-0001'`)).rows[0];
    chk('Case and whitespace differences still merge', sub5.client_id === clientId, sub5.client_id, clientId);
    r = await get('/api/fillout/submissions');
    const inbox2 = (await r.json()).submissions;
    chk('Inbox newest first, duplicate flag carries the other client\'s name', inbox2[0].submissionId === 'case-0001' && inbox2.find(s => s.submissionId === 'name-only-0001').duplicateOf.name === 'brandons plumbing', inbox2.map(s => s.submissionId).join(','), 'case-0001 first');

    // ── Two forms from one business back to back: processed in order, one client ──
    const raceA = clone(payload), raceB = clone(payload);
    raceA.submission.submissionId = 'race-a'; raceB.submission.submissionId = 'race-b';
    for (const p of [raceA, raceB]) {
      p.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Race Plumbing';
      p.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'race@example.com';
    }
    const clientsBefore = (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n;
    await Promise.all([post(`/api/webhooks/fillout?token=${SECRET}`, raceA), post(`/api/webhooks/fillout?token=${SECRET}`, raceB)]);
    for (let i = 0; i < 200; i++) { const s = (await pool.query(`SELECT status FROM fillout_submissions WHERE submission_id IN ('race-a','race-b')`)).rows; if (s.length === 2 && s.every(x => x.status === 'processed')) break; await sleep(10); }
    const race = (await pool.query(`SELECT submission_id, client_id, duplicate_of FROM fillout_submissions WHERE submission_id IN ('race-a','race-b')`)).rows;
    chk('Back-to-back submissions from one business → one client, no duplicate flag', race.length === 2 && race[0].client_id && race[0].client_id === race[1].client_id && race.every(r => !r.duplicate_of) && (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n === clientsBefore + 1, JSON.stringify(race), 'same client_id');

    // ── Failed audio download: link kept, flagged, re-run retries ──
    audioMode = 'fail';
    const failSub = clone(payload);
    failSub.submission.submissionId = 'audio-fail-0001';
    failSub.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Audio Fail Ltd';
    failSub.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'fail@example.com';
    await post(`/api/webhooks/fillout?token=${SECRET}`, failSub);
    await waitDone('audio-fail-0001');
    let sub6 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'audio-fail-0001'`)).rows[0];
    let a6 = (await pool.query(`SELECT * FROM client_audio WHERE client_id = $1`, [sub6.client_id])).rows[0];
    chk('Download failed: submission still processed, flagged for audio retry', sub6.status === 'processed' && sub6.audio_failed === 1, `${sub6.status} ${sub6.audio_failed}`, 'processed 1');
    chk('Fillout link and transcript kept on the failed row', a6.download_status === 'failed' && a6.fillout_url === audioUrl && /boiler/.test(a6.transcription) && a6.download_error, a6.download_status, 'failed');
    r = await get(`/api/clients/${sub6.client_id}/record`);
    const pvFail = (await r.json()).sections.flatMap(s => s.fields).find(f => f.key === 'prices_voice');
    chk('Record shows transcript, not playable, with the Fillout link', pvFail.audio && !pvFail.audio.playable && pvFail.audio.filloutUrl === audioUrl, JSON.stringify(pvFail.audio), '');
    audioMode = 'ok';
    r = await post(`/api/fillout/submissions/${sub6.id}/reprocess`, {});
    const rr = await r.json();
    sub6 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'audio-fail-0001'`)).rows[0];
    a6 = (await pool.query(`SELECT * FROM client_audio WHERE client_id = $1`, [sub6.client_id])).rows[0];
    chk('Re-run retried the download: stored, flag cleared, same client', r.status === 200 && rr.audio.stored === 1 && sub6.audio_failed === 0 && a6.download_status === 'stored' && rr.clientId === sub6.client_id, JSON.stringify(rr.audio), 'stored 1');

    // ── Processing failure: raw row stays, status error, can be re-run ──
    const broken = clone(payload);
    broken.submission.submissionId = 'broken-0001';
    broken.submission.questions = 'not an array';
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, broken);
    await waitDone('broken-0001');
    const sub7 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'broken-0001'`)).rows[0];
    chk('Bad payload: 200 at receipt, raw row kept, status error with the reason', r.status === 200 && sub7 && sub7.status === 'error' && /questions/.test(sub7.error), `${sub7 && sub7.status}: ${sub7 && sub7.error}`, 'error');
    chk('No client was created for the failed one', (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n === 5, (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n, 5);

    // ── Rejected bodies: logged and kept ──
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, '{"submission": {"questions": [}');
    chk('Invalid JSON → 400', r.status === 400, r.status, 400);
    const rej = (await pool.query(`SELECT * FROM fillout_submissions WHERE status = 'rejected'`)).rows;
    chk('Invalid JSON body kept as a rejected row with the text', rej.length === 1 && /entity.parse.failed|JSON|Unexpected/.test(rej[0].error) && JSON.stringify(rej[0].raw_payload).includes('questions'), rej.length && rej[0].error, 'rejected row');
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, { hello: 'world' });
    chk('JSON without submissionId → 400 and kept', r.status === 400 && (await pool.query(`SELECT COUNT(*)::int AS n FROM fillout_submissions WHERE status = 'rejected'`)).rows[0].n === 2, r.status, 400);
    const big = { submission: { submissionId: 'big', questions: [{ id: 'x', value: 'a'.repeat(2.5 * 1024 * 1024) }] } };
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, big);
    chk('Body over 2 MB → 413 (and logged)', r.status === 413, r.status, 413);
    const sized = { submission: { submissionId: 'sized-ok', questions: [{ id: 'q_niche_select', name: 'n', type: 'Dropdown', value: 'Plumbing & Heating' }, { id: 'bwUuvaZTmChegZekppzNNv', name: 'b', type: 'ShortAnswer', value: 'Big Co' }, { id: 'x', value: 'a'.repeat(1.5 * 1024 * 1024) }] } };
    r = await post(`/api/webhooks/fillout?token=${SECRET}`, sized);
    chk('Body of 1.5 MB accepted', r.status === 200, r.status, 200);

    // ── Archive and reviewed ──
    r = await post(`/api/clients/${clientId}/archive`, {});
    chk('Archive sets archived_at', r.status === 200 && (await r.json()).archived_at, r.status, 200);
    r = await post(`/api/clients/${clientId}/reviewed`, {});
    chk('Reviewed sets reviewed_at', r.status === 200 && (await r.json()).reviewed_at, r.status, 200);
    const archivedSub = clone(payload);
    archivedSub.submission.submissionId = 'after-archive-0001';
    await post(`/api/webhooks/fillout?token=${SECRET}`, archivedSub);
    await waitDone('after-archive-0001');
    const sub8 = (await pool.query(`SELECT * FROM fillout_submissions WHERE submission_id = 'after-archive-0001'`)).rows[0];
    chk('A matching submission after archive makes a new client, flagged, never merges into the archived one', sub8.client_id !== clientId && sub8.duplicate_of === clientId, `${sub8.client_id !== clientId} dup=${sub8.duplicate_of}`, 'true');
    r = await post(`/api/clients/${clientId}/unarchive`, {});
    chk('Unarchive clears archived_at', r.status === 200 && !(await r.json()).archived_at, r.status, 200);

    // ── Startup recovery ──
    await pool.query(`UPDATE fillout_submissions SET status = 'received' WHERE submission_id = 'resub-0001'`);
    const recovered = await svc.recoverPending();
    chk('Rows left at received are processed at startup', recovered === 1 && (await pool.query(`SELECT status FROM fillout_submissions WHERE submission_id = 'resub-0001'`)).rows[0].status === 'processed', recovered, 1);

    // ── Call-out / survey fee question: found by position, expected only when the quote isn't free ──
    const FEE_ID = 'q_fee_TEST_id';
    const withFee = (quoteFree, fee) => {
      const p = clone(sample);
      const qs = p.submission.questions;
      qs.find(q => q.id === 'q_quote_free').value = quoteFree;
      const at = qs.findIndex(q => q.id === 'eHt6ipCmD9PZXGfmX3wTEZ');
      qs.splice(at, 0, { id: FEE_ID, name: 'If so  how much is the call out/survey fee, and is it taken off the job if the customer goes ahead?', type: 'ShortAnswer', value: fee });
      return p;
    };
    const feeField = p => I.buildRecord(p, map).fields.find(f => f.key === 'quote_call_out_fee');
    const feeEntry = map.fields.find(f => f.key === 'quote_call_out_fee');
    chk('Fee entry sits directly after quote_free in the map, in Quotes Process and Response', map.fields[map.fields.findIndex(f => f.key === 'quote_free') + 1].key === 'quote_call_out_fee' && feeEntry.section === 'Quotes Process and Response' && feeEntry.type === 'ShortAnswer', feeEntry.section, 'Quotes Process and Response');
    chk('Fee question resolved by position, id taken from the payload', feeField(withFee('Call-out fee', '£60, taken off the job')).id === FEE_ID, feeField(withFee('Call-out fee', 'x')).id, FEE_ID);
    chk('Not matched by text: a different label in the same slot still resolves', (() => { const p = withFee('Call-out fee', '£40'); p.submission.questions.find(q => q.id === FEE_ID).name = 'Renamed'; return feeField(p).id === FEE_ID && feeField(p).value === '£40'; })(), '', '');
    chk('A question that is not directly between the two anchors is not taken', (() => { const p = withFee('Call-out fee', '£40'); const qs = p.submission.questions; const at = qs.findIndex(q => q.id === FEE_ID); qs.splice(at + 1, 0, { id: 'q_extra', name: 'Extra', type: 'ShortAnswer', value: 'z' }); const f = feeField(p); return f.id === null && f.status === 'blank'; })(), '', '');
    const c1 = I.completeness(I.buildRecord(withFee('Call-out fee', '£60, taken off the job'), map).fields);
    chk('1. Call-out fee, fee answered → counted as filled (47 of 69)', c1.expected === 69 && c1.filled === 47 && feeField(withFee('Call-out fee', '£60')).applicable === true, JSON.stringify([c1.filled, c1.expected]), '[47,69]');
    const c2 = I.completeness(I.buildRecord(withFee('Survey fee', null), map).fields);
    chk('2. Survey fee, fee blank → expected and missing (46 of 69)', c2.expected === 69 && c2.filled === 46 && feeField(withFee('Survey fee', '')).status === 'blank' && feeField(withFee('Survey fee', '')).applicable === true, JSON.stringify([c2.filled, c2.expected]), '[50,74]');
    const c3 = I.completeness(I.buildRecord(withFee('Yes, no call-out or survey fee', null), map).fields);
    chk('3. Yes, no call-out or survey fee → not in the denominator (46 of 68, 1 not applicable)', c3.expected === 68 && c3.filled === 46 && c3.notApplicable === 1 && feeField(withFee('Yes, no call-out or survey fee', null)).applicable === false, JSON.stringify([c3.filled, c3.expected, c3.notApplicable]), '[46,68,1]');
    const c3b = I.completeness(I.buildRecord(withFee('Not Applicable', null), map).fields);
    chk('3b. Not Applicable → not in the denominator either', c3b.expected === 68 && feeField(withFee('Not Applicable', null)).applicable === false, c3b.expected, 68);
    chk('3c. Fee answered anyway when the quote is free: value kept, still not counted', (() => { const f = feeField(withFee('Yes, no call-out or survey fee', '£20')); return f.value === '£20' && f.status === 'filled' && f.applicable === false; })() && I.completeness(I.buildRecord(withFee('Yes, no call-out or survey fee', '£20'), map).fields).expected === 68, '', '');
    const c4 = I.completeness(I.buildRecord(sample, map).fields);
    chk('4. A submission from before the question existed still builds; fee blank, expected because the sample says Survey fee', c4.expected === 69 && c4.filled === 46 && feeField(sample).present === false && feeField(sample).status === 'blank', JSON.stringify([c4.filled, c4.expected]), '[46,69]');
    chk('4b. Same old submission with a free quote: fee not applicable, 68 expected', (() => { const p = clone(sample); p.submission.questions.find(q => q.id === 'q_quote_free').value = 'Yes, no call-out or survey fee'; const c = I.completeness(I.buildRecord(p, map).fields); return c.expected === 68 && feeField(p).applicable === false; })(), '', '');
    // Through the webhook: the resolved id is what gets stored, and the record and inbox follow the rule
    const feeSub = withFee('Call-out fee', '£60, taken off the job'); feeSub.submission.submissionId = 'fee-0001';
    feeSub.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Fee Plumbing'; feeSub.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'fee@example.com';
    await post(`/api/webhooks/fillout?token=${SECRET}`, feeSub);
    await waitDone('fee-0001');
    const feeRow = (await pool.query(`SELECT s.client_id, f.question_id, f.value, f.status FROM fillout_submissions s JOIN client_fields f ON f.client_id = s.client_id AND f.field_key = 'quote_call_out_fee' WHERE s.submission_id = 'fee-0001'`)).rows[0];
    chk('Stored with the payload question id and value', feeRow && feeRow.question_id === FEE_ID && feeRow.value === '£60, taken off the job' && feeRow.status === 'filled', JSON.stringify(feeRow), FEE_ID);
    const feeRec = await (await get(`/api/clients/${feeRow.client_id}/record`)).json();
    const feeShown = feeRec.sections.find(s => s.name === 'Quotes Process and Response').fields;
    chk('Record: fee directly after Is the quote free, applicable, 47 of 70', feeShown[feeShown.findIndex(f => f.key === 'quote_free') + 1].key === 'quote_call_out_fee' && feeShown.find(f => f.key === 'quote_call_out_fee').applicable === true && feeRec.completeness.filled === 47 && feeRec.completeness.expected === 70, JSON.stringify(feeRec.completeness), '47 of 70');
    const freeSub = withFee('Yes, no call-out or survey fee', null); freeSub.submission.submissionId = 'free-0001';
    freeSub.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Free Quotes Ltd'; freeSub.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'free@example.com';
    await post(`/api/webhooks/fillout?token=${SECRET}`, freeSub);
    await waitDone('free-0001');
    const freeClient = (await pool.query(`SELECT client_id FROM fillout_submissions WHERE submission_id = 'free-0001'`)).rows[0].client_id;
    const freeRec = await (await get(`/api/clients/${freeClient}/record`)).json();
    const freeInbox = (await (await get('/api/fillout/submissions')).json()).submissions.find(s => s.submissionId === 'free-0001');
    chk('Record and inbox: free quote → fee not applicable, 69 expected in both', freeRec.sections.flatMap(s => s.fields).find(f => f.key === 'quote_call_out_fee').applicable === false && freeRec.completeness.expected === 69 && freeInbox.completeness.expected === 69, JSON.stringify([freeRec.completeness.expected, freeInbox.completeness.expected]), '[69,69]');

    // ── All 28 niche blocks mapped (tools/fillout-niche-blocks.js) ──
    const B = require(path.join(root, 'tools/fillout-niche-blocks.js'));
    const nicheLabels = Object.keys(map.niches);
    chk('28 niches in the map, in payload order, with the exact dropdown labels', nicheLabels.length === 28 && JSON.stringify(nicheLabels) === JSON.stringify(B.LABELS_IN_PAYLOAD_ORDER.map(x => x[0])), nicheLabels.length, 28);
    const shape = nicheLabels.map(label => {
      const fs = map.fields.filter(f => f.niche === label);
      const key = map.niches[label].key;
      const pre = label === 'Plumbing & Heating' ? '' : key + '.';
      const cats = fs.filter(f => f.group === 'services');
      const mw = [1, 2, 3].map(n => fs.find(f => f.key === (pre ? `${pre}most_wanted_${n}` : `most_wanted_job_${n}`)));
      const voice = fs.filter(f => f.type === 'AudioRecording');
      const other = fs.find(f => f.key === pre + 'other_services');
      const jnw = fs.find(f => f.key === pre + 'jobs_not_wanted');
      const ok = cats.length >= 1 && cats.every(f => f.type === 'Checkboxes' && !f.optional) && mw.every(f => f && f.type === 'ShortAnswer' && !f.optional && !f.group)
        && voice.length === 1 && voice[0].key === pre + 'prices_voice' && !voice[0].optional && other && other.optional && (label === 'Guttering & Fascias' ? !jnw : (jnw && jnw.optional))
        && fs.every(f => label === 'Plumbing & Heating' || f.key.startsWith(pre)) && fs.every(f => f.section === 'Services & Locations');
      return { label, ok, cats: cats.length, voice: voice.length, mw: mw.filter(Boolean).length };
    });
    chk('Every block: services group, most_wanted_1-3, one prices_voice, optional other_services, optional jobs_not_wanted (none for Guttering), keys namespaced', shape.every(x => x.ok), JSON.stringify(shape.filter(x => !x.ok)), '[]');
    chk('Every block has exactly 3 most-wanted and 1 voice field', shape.every(x => x.mw === 3 && x.voice === 1), '', '');
    const allIds = map.fields.filter(f => f.id).map(f => f.id);
    chk('No question id is mapped twice across the 28 blocks', new Set(allIds).size === allIds.length, allIds.length - new Set(allIds).size, 0);
    chk('Plumbing & Heating keys unchanged (existing records keep working)', ['cat_central_heating_service', 'cat_plumber', 'cat_gas_engineer', 'additional_heating_services', 'additional_plumbing_services', 'most_wanted_job_1', 'most_wanted_job_2', 'most_wanted_job_3', 'prices_voice', 'other_services', 'jobs_not_wanted'].every(k => map.fields.some(f => f.niche === 'Plumbing & Heating' && f.key === k)), '', '');
    chk('Tiling: other services is the "Additional Services" question', (map.fields.find(f => f.key === 'tiling.other_services') || {}).id === 'g4wB2wwLUzLNm1PzYysDyT', (map.fields.find(f => f.key === 'tiling.other_services') || {}).id, 'g4wB2wwLUzLNm1PzYysDyT');
    chk('Guttering: other services is the long "Additional Services..." question, labelled short, and no jobs_not_wanted', (map.fields.find(f => f.key === 'guttering.other_services') || {}).id === 'xxcMTQhLyeiHJXGt8KzJMF' && (map.fields.find(f => f.key === 'guttering.other_services') || {}).label.length < 60 && !map.fields.some(f => f.key === 'guttering.jobs_not_wanted'), '', '');
    chk('Category labels have no numeric suffix', map.fields.filter(f => f.group === 'services').every(f => !/\(\d+\)\s*$/.test(f.label)), map.fields.filter(f => f.group === 'services' && /\(\d+\)\s*$/.test(f.label)).map(f => f.label).join(','), 'none');

    // A synthetic submission for one niche: the sample with the niche switched and that block's questions answered by id
    const forNiche = (label, sid, name, email, answers = {}) => {
      const p = clone(sample);
      const qs = p.submission.questions;
      p.submission.submissionId = sid;
      qs.find(q => q.id === 'q_niche_select').value = label;
      qs.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = name;
      qs.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = email;
      for (const f of map.fields.filter(f => f.niche === label)) {
        const q = qs.find(q => q.id === f.id);
        if (!q) throw new Error('fixture lacks ' + f.id);
        if (f.key in answers) q.value = answers[f.key];
        else if (f.type === 'Checkboxes') q.value = ['Tick A for ' + f.key];
        else if (f.type === 'ShortAnswer') q.value = 'Answer for ' + f.key;
        else if (f.type === 'AudioRecording') q.value = { url: audioUrl, filename: f.key + '.mp3', transcription: 'Transcript for ' + f.key, duration: 5 };
        else q.value = 'Text for ' + f.key;
      }
      return p;
    };
    const deliver = async p => { await post(`/api/webhooks/fillout?token=${SECRET}`, p); const st = await waitDone(p.submission.submissionId); const sub = (await pool.query(`SELECT client_id, status, error FROM fillout_submissions WHERE submission_id = $1`, [p.submission.submissionId])).rows[0]; return { st, sub, rec: sub.client_id ? await (await get(`/api/clients/${sub.client_id}/record`)).json() : null }; };
    const keysOf = rec => rec.sections.flatMap(s => s.fields).map(f => f.key);

    // (2) Landscapers/Gardeners
    const land = await deliver(forNiche('Landscapers/Gardeners', 'niche-land-0001', 'Green Fingers', 'green@example.com', { 'landscapers.cat.gardener': ['Lawn mowing and maintenance', 'Hedge trimming'] }));
    chk('(2) Landscapers: processed, niche known, the landscaper block on the record', land.sub.status === 'processed' && land.rec.niche === 'Landscapers/Gardeners' && land.rec.nicheKnown && keysOf(land.rec).includes('landscapers.cat.gardener') && keysOf(land.rec).includes('landscapers.prices_voice'), land.sub.error || land.rec.niche, 'Landscapers/Gardeners');
    const landF = land.rec.sections.flatMap(s => s.fields);
    chk('(2) Landscapers: values by id, suffix-free label, P&H answers (still in the payload) ignored', JSON.stringify(landF.find(f => f.key === 'landscapers.cat.gardener').value) === JSON.stringify(['Lawn mowing and maintenance', 'Hedge trimming']) && landF.find(f => f.key === 'landscapers.cat.gardener').label === 'Gardener' && !keysOf(land.rec).some(k => k === 'cat_plumber' || k.startsWith('cleaning.') || k.startsWith('fencing.')), keysOf(land.rec).filter(k => k === 'cat_plumber' || k.startsWith('fencing.')).join(','), 'none');
    chk('(2) Landscapers: stored fields are the landscaper block only, none from P&H though answered', !(await pool.query(`SELECT field_key FROM client_fields WHERE client_id = $1`, [land.sub.client_id])).rows.some(r => r.field_key === 'cat_plumber' || r.field_key === 'most_wanted_job_1'), '', '');
    chk('(2) Landscapers: voice answer copied with its transcript, like Plumbing & Heating', landF.find(f => f.key === 'landscapers.prices_voice').audio && landF.find(f => f.key === 'landscapers.prices_voice').audio.playable && landF.find(f => f.key === 'landscapers.prices_voice').audio.transcription === 'Transcript for landscapers.prices_voice', JSON.stringify(landF.find(f => f.key === 'landscapers.prices_voice').audio), 'playable');
    // 8 checkbox groups + 3 most wanted + voice = 5 units, the same 5 the sample's Plumbing & Heating block fills
    chk('(2) Landscapers: completeness counts the 8 groups as one services unit (46 of 70, like the sample)', land.rec.completeness.expected === 70 && land.rec.completeness.filled === 46 && land.rec.completeness.optionalFilled === 2, JSON.stringify(land.rec.completeness), '46 of 70, 2 optional');

    // (3) Window Cleaning: "Window Cleaning Service" and "Pressure Washing Service" also exist in the Cleaning and Pressure Washing blocks, with other ids
    const wcIds = map.fields.filter(f => f.niche === 'Window Cleaning' && f.group === 'services').map(f => f.id);
    const clashIds = map.fields.filter(f => ['Cleaning Companies', 'Pressure Washing / Exterior Cleaning'].includes(f.niche) && /window cleaning service|pressure washing service/i.test(f.label)).map(f => f.id);
    chk('(3) The clashing category names have different ids in the three blocks', clashIds.length === 4 && !clashIds.some(id => wcIds.includes(id)), JSON.stringify({ wcIds, clashIds }), 'disjoint');
    const wcPayload = forNiche('Window Cleaning', 'niche-wc-0001', 'Crystal Panes', 'panes@example.com', { 'window_cleaning.cat.window_cleaning_service': ['Window cleaning for Crystal Panes'] });
    // Answer the Cleaning and Pressure Washing twins too; none of that must land on the record
    for (const id of clashIds) wcPayload.submission.questions.find(q => q.id === id).value = ['WRONG BLOCK'];
    const wc = await deliver(wcPayload);
    const wcF = wc.rec.sections.flatMap(s => s.fields);
    chk('(3) Window Cleaning: its own block, by its own ids', wc.sub.status === 'processed' && wc.rec.nicheKnown && JSON.stringify(wcF.find(f => f.key === 'window_cleaning.cat.window_cleaning_service').value) === JSON.stringify(['Window cleaning for Crystal Panes']) && wcF.find(f => f.key === 'window_cleaning.cat.pressure_washing_service').label === 'Pressure Washing Service', JSON.stringify(wcF.filter(f => f.group === 'services').map(f => [f.key, f.value])), 'own ids');
    chk('(3) Window Cleaning: nothing from the Cleaning or Pressure Washing blocks, no WRONG BLOCK value anywhere', !keysOf(wc.rec).some(k => k.startsWith('cleaning.') || k.startsWith('pressure_washing.')) && !JSON.stringify(wc.rec).includes('WRONG BLOCK') && !(await pool.query(`SELECT field_key, value FROM client_fields WHERE client_id = $1`, [wc.sub.client_id])).rows.some(r => JSON.stringify(r.value).includes('WRONG BLOCK')), '', '');

    // (4) Guttering and Tiling exceptions
    const gut = await deliver(forNiche('Guttering & Fascias', 'niche-gut-0001', 'Gutter Guys', 'gutter@example.com', { 'guttering.other_services': 'Soffit repairs' }));
    const gutF = gut.rec.sections.flatMap(s => s.fields);
    chk('(4) Guttering: processed, other services from the long question, no jobs_not_wanted field', gut.sub.status === 'processed' && gutF.find(f => f.key === 'guttering.other_services').value === 'Soffit repairs' && !gutF.some(f => f.key === 'guttering.jobs_not_wanted') && gutF.filter(f => f.niche === 'Guttering & Fascias').length === 6, gutF.filter(f => f.niche === 'Guttering & Fascias').map(f => f.key).join(','), '6 guttering keys');
    const til = await deliver(forNiche('Tiling', 'niche-til-0001', 'Top Tiles', 'tiles@example.com', { 'tiling.other_services': 'Mosaic work' }));
    const tilF = til.rec.sections.flatMap(s => s.fields);
    chk('(4) Tiling: "Additional Services" is the other-services field, jobs_not_wanted present', til.sub.status === 'processed' && tilF.find(f => f.key === 'tiling.other_services').value === 'Mosaic work' && tilF.some(f => f.key === 'tiling.jobs_not_wanted') && tilF.filter(f => f.niche === 'Tiling').length === 7, tilF.filter(f => f.niche === 'Tiling').map(f => f.key).join(','), '7 tiling keys');

    // (5) A label that matches nothing (exact string equality: a near miss is unknown)
    const nearMiss = clone(sample); nearMiss.submission.submissionId = 'niche-near-0001';
    nearMiss.submission.questions.find(q => q.id === 'q_niche_select').value = 'Roofers ';
    nearMiss.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Near Miss Roofing';
    nearMiss.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'near@example.com';
    const near = await deliver(nearMiss);
    const nearInbox = (await (await get('/api/fillout/submissions')).json()).submissions.find(s => s.submissionId === 'niche-near-0001');
    chk('(5) "Roofers " (trailing space) matches no niche: processed, universal fields only, banner flag on inbox and record', near.sub.status === 'processed' && near.rec.nicheKnown === false && near.rec.niche === 'Roofers ' && keysOf(near.rec).every(k => !k.includes('.') && !['cat_plumber', 'prices_voice'].includes(k)) && nearInbox.nicheKnown === false, JSON.stringify([near.rec.niche, near.rec.nicheKnown, nearInbox.nicheKnown]), '["Roofers ",false,false]');
    chk('(5) Exact label "Roofers" is known', I.fieldsForNiche(map, 'Roofers').some(f => f.key === 'roofers.cat.roofer') && !I.fieldsForNiche(map, 'roofers').some(f => f.niche === 'Roofers'), '', '');

    // ── The fixture's real audio URL is untouched in what we commit ──
    chk('Fixture still carries the real Fillout audio URL', /prod-fillout-oregon-s3/.test(realUrl), realUrl, 'fillout s3');
  } finally {
    srv.close(); audioSrv.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
