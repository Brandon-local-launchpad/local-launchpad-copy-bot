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
    chk('Completeness = filled / fields used', record.completeness.total === rec.fields.length && record.completeness.filled === rec.fields.filter(f => f.status === 'filled').length && record.completeness.pct === Math.round(100 * record.completeness.filled / record.completeness.total), JSON.stringify(record.completeness), '');
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

    // ── The fixture's real audio URL is untouched in what we commit ──
    chk('Fixture still carries the real Fillout audio URL', /prod-fillout-oregon-s3/.test(realUrl), realUrl, 'fillout s3');
  } finally {
    srv.close(); audioSrv.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
