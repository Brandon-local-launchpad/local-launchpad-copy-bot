'use strict';
// A local demo of the Fillout intake, end to end, with no real database:
//   - the app's own server.js and db.js, with the pg driver pointed at pg-mem
//   - a local server standing in for Fillout's audio host
//   - fixtures/fillout-sample.json delivered to the webhook, plus a second
//     submission from the same business (merge) and one with the same name only
//     (possible duplicate)
// Run: npm run demo:fillout   then open the URLs it prints.
// The webhook secret is a throwaway printed below; nothing here is real.

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const Module = require('module');
const root = path.join(__dirname, '../..');

const { newDb, DataType } = require('pg-mem');
const mem = newDb();
mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
mem.public.registerFunction({ name: 'to_timestamp', args: [DataType.float], returns: DataType.timestamptz, implementation: s => new Date(s * 1000) });
const pgAdapter = mem.adapters.createPg();
const realResolve = Module._resolveFilename;
const PG_ID = '__pgmem__';
Module._resolveFilename = function (request, ...rest) { return request === 'pg' ? PG_ID : realResolve.call(this, request, ...rest); };
require.cache[PG_ID] = { id: PG_ID, filename: PG_ID, loaded: true, exports: pgAdapter };

// The model, unless DEMO_REAL_MODEL=1: price extraction gets a canned reply for the
// sample's prices transcript (five rows), so the demo never spends on the API
const SDK_ID = '__fake_anthropic__';
if (process.env.DEMO_REAL_MODEL !== '1') {
  const realResolve2 = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) { return request === '@anthropic-ai/sdk' ? SDK_ID : realResolve2.call(this, request, ...rest); };
  const canned = JSON.stringify({ rows: [
    { service: 'Typical plumbing job', from_gbp: 50, up_to_gbp: 100, unit: 'per job' },
    { service: 'Bathroom installation', from_gbp: 500, up_to_gbp: 5000 },
    { service: 'Wet room installation', from_gbp: 2000, up_to_gbp: 10000, inferred: true, inferred_note: '"as expensive as ten" read as ten thousand, in line with the other figures' },
    { service: 'Boiler replacement', typical_gbp: 600 },
    { service: 'Boiler repair', typical_gbp: 350 },
  ] });
  // The parent-category prompt (additional services) gets a canned answer too, keyed on the system prompt
  const parents = JSON.stringify({ services: [
    { service: 'Pond installation', category_key: 'landscape_designer', reason: 'ponds are designed garden features' },
    { service: 'Raised beds', category_key: 'unsure', reason: 'could sit under Gardener or Landscape Gardener' },
    { service: 'Water features', category_key: 'landscape_designer', reason: 'water features are designed garden features' },
    { service: 'Garden clearance', category_key: 'gardener', reason: 'clearing a garden is general garden work' },
  ] });
  const reply = async params => ({ stop_reason: 'end_turn', model: 'demo-fake-model', usage: { input_tokens: 0, output_tokens: 0 }, content: [{ type: 'text', text: /Parent category for an additional service/.test(String(params && params.system)) ? parents : canned }] });
  class FakeAnthropic { constructor() { this.messages = { create: reply }; this.beta = { messages: { create: reply } }; } }
  require.cache[SDK_ID] = { id: SDK_ID, filename: SDK_ID, loaded: true, exports: FakeAnthropic };
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'demo-fake-key'; // so the server wires the (fake) model in
}

// DataForSEO, faked: fixed volumes (the 18 Oct 2026 Edens Edge dry run) after a short wait,
// so the H1 research progress bar shows its stages; a balance of $8.40 shows the low warning
process.env.DATAFORSEO_LOGIN = 'demo-login'; process.env.DATAFORSEO_PASSWORD = 'demo-password';
{
  const VOL = { 'gardener southampton': [210, 3.12], 'landscape gardener southampton': [20, 2.79], 'tree service southampton': [20, 3.03], 'paving contractor southampton': [10, null], 'gardener romsey': [50, 1.81], 'gardener winchester': [140, 2.43], 'gardener eastleigh': [50, 2.49], 'gardener chandlers ford': [30, 0.91], 'gardener hedge end': [20, 2.08], 'tree service winchester': [30, null],
    // Page map v3: a few services with volume (base pages) and in towns (town service pages)
    'hedge trimming southampton': [30, 6.49], 'lawn care southampton': [30, 2.31], 'tree stump removal southampton': [40, 2], 'tree removal southampton': [20, 1.5],
    'tree stump removal romsey': [20, null], 'lawn care winchester': [20, 3.42], 'tree surgeon southampton': [320, 4.1], 'tree surgeon winchester': [140, 3.9], 'tree surgeon romsey': [50, 3.66] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (!u.startsWith('https://api.dataforseo.com/')) return realFetch(url, opts);
    await new Promise(r => setTimeout(r, 2500));
    if (u.includes('/appendix/user_data')) return new Response(JSON.stringify({ status_code: 20000, tasks: [{ result: [{ money: { balance: 8.4 } }] }] }), { status: 200 });
    const kws = JSON.parse(opts.body)[0].keywords;
    return new Response(JSON.stringify({ status_code: 20000, status_message: 'Ok.', cost: 0.09, tasks: [{ status_code: 20000, status_message: 'Ok.', cost: 0.09, result: kws.map(k => ({ keyword: k, search_volume: VOL[k] ? VOL[k][0] : null, cpc: VOL[k] ? VOL[k][1] : null })) }] }), { status: 200 });
  };
}

const PORT = process.env.DEMO_PORT || 3992;
const SECRET = 'demo-secret-' + crypto.randomBytes(4).toString('hex');
process.env.PORT = String(PORT);
process.env.DATABASE_URL = 'postgres://pg-mem/demo';
process.env.FILLOUT_WEBHOOK_SECRET = SECRET;
process.env.APP_PASSWORD = '';

(async () => {
  // Fillout's audio host: a tiny mp3-shaped file (not playable audio, but the download path is real)
  const MP3 = Buffer.concat([Buffer.from('ID3'), crypto.randomBytes(3000)]);
  const audioSrv = http.createServer((_req, res) => { res.setHeader('Content-Type', 'audio/mpeg'); res.end(MP3); });
  await new Promise(r => audioSrv.listen(0, '127.0.0.1', r));
  const audioUrl = `http://127.0.0.1:${audioSrv.address().port}/audio.mp3`;

  require(path.join(root, 'server.js'));
  const { pool } = require(path.join(root, 'db.js'));
  for (let i = 0; i < 50; i++) {
    try { await pool.query('SELECT 1 FROM fillout_submissions LIMIT 1'); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }
  await new Promise(r => setTimeout(r, 300));

  const sample = require(path.join(root, 'fixtures/fillout-sample.json'));
  const clone = o => JSON.parse(JSON.stringify(o));
  const base = `http://localhost:${PORT}`;
  const send = async (p, label) => {
    const r = await fetch(`${base}/api/webhooks/fillout?token=${SECRET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    console.log(`  ${label}: ${r.status} ${await r.text()}`);
  };
  const first = clone(sample);
  first.submission.questions.find(q => q.id === 'rygW9ALYDsZ1d5f2K5pRHg').value.url = audioUrl;
  await send(first, 'fixture');
  const again = clone(first); again.submission.submissionId = 'demo-resubmission';
  again.submission.questions.find(q => q.id === 'erroGGUPEgr7tEQqemjQ98').value = '5';
  await send(again, 'resubmission (same name and email: merges)');
  const dup = clone(first); dup.submission.submissionId = 'demo-name-only';
  dup.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'other@example.com';
  dup.submission.questions.find(q => q.id === 'rygW9ALYDsZ1d5f2K5pRHg').value = null;
  await send(dup, 'same name, other email (new client, flagged)');
  // A landscaper with Edens Edge's ticks and typed additional services, for the Categories & services section
  const land = clone(first); land.submission.submissionId = 'demo-edens-edge';
  const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
  const fieldMap = require(path.join(root, 'fillout/field-map.json'));
  land.submission.questions.find(q => q.id === 'q_niche_select').value = 'Landscapers/Gardeners';
  land.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Edens Edge Landscaping';
  land.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'ethan@example.com';
  for (const f of fieldMap.fields.filter(f => f.niche === 'Landscapers/Gardeners')) {
    const q = land.submission.questions.find(q => q.id === f.id);
    q.value = ticks[f.key] !== undefined ? ticks[f.key] : f.key === 'landscapers.other_services' ? 'Pond installation\nRaised beds\nGarden clearance\nWater features' : f.key === 'landscapers.most_wanted_1' ? 'Patio paving' : f.type === 'ShortAnswer' ? 'Garden design' : f.type === 'AudioRecording' ? { url: audioUrl, filename: 'p.mp3', transcription: 'A patio starts at about three thousand.', duration: 5 } : null;
  }
  await send(land, 'Edens Edge landscaper (ticks from the example sheet)');
  const unknown = clone(first); unknown.submission.submissionId = 'demo-unknown-niche';
  unknown.submission.questions.find(q => q.id === 'q_niche_select').value = 'Roofing';
  unknown.submission.questions.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Demo Roofing Co';
  unknown.submission.questions.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'roof@example.com';
  await send(unknown, 'niche with no field map yet');
  await new Promise(r => setTimeout(r, 500));
  const { rows } = await pool.query(`SELECT client_id FROM fillout_submissions WHERE submission_id = $1`, [sample.submission.submissionId]);

  // Clients landing page: hand-made clients across every niche (so the tab bar has 30+
  // tabs), one in Other / unsorted, and a pre-migration client with an old trade name
  const niches = (await (await fetch(base + '/api/clients')).json()).niches.filter(n => n.key !== 'other');
  let day = 1;
  for (const n of niches) {
    await fetch(base + '/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${n.label} Demo Ltd`, niche_key: n.key, signed_on: `2026-09-${String(day++).padStart(2, '0')}` }) });
  }
  await fetch(base + '/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Chips Carpentry', trade: 'Carpenter' }) });
  await fetch(base + '/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Edens Edge (demo)', trade: 'Landscaper Gardener' }) });
  // A hand-made client like the live "ednes edge testing" (no Fillout record, one old page),
  // filled by tools/seed-edens-edge.js, for the Set up by hand editor and the Pages panel
  const { rows: [hand] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper') RETURNING id`);
  await pool.query(`INSERT INTO pages (client_id, page_type, page_title, url_slug, h1, copy_output) VALUES ($1, 'homepage', 'Homepage', '/', 'Landscaper Southampton', 'old copy')`, [hand.id]);
  await require(path.join(root, 'tools/seed-edens-edge.js')).seed(pool, { write: true, log() {} });

  console.log('\nDEMO READY');
  console.log(`  Webhook:  POST ${base}/api/webhooks/fillout?token=${SECRET}`);
  console.log(`  Inbox:    ${base}/submissions.html`);
  console.log(`  Record:   ${base}/client-record.html?id=${rows[0].client_id}`);
  console.log(`  Clients:  ${base}/clients.html`);
  console.log(`  By hand:  ${base}/client-record.html?id=${hand.id}#pages`);
})().catch(e => { console.error('Demo failed:', e); process.exit(1); });
