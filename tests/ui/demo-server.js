'use strict';
// A local demo of the WordPress card, end to end, with no real database or site:
//   - the app's own server.js and db.js, with the pg driver pointed at pg-mem
//     (an in-memory Postgres), so initDb creates the real schema
//   - a fake WordPress site (tests/fake-wp) with a draft homepage
//   - one demo client with a v20 homepage record (Ethan's values; one claims
//     finding left to accept)
// Run: npm run demo:wp   then open the URLs it prints.
// Test credentials only (the fake site's), never real ones.

const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const root = path.join(__dirname, '../..');

const { newDb, DataType } = require('pg-mem');
const mem = newDb();
mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
// research_jobs rows are written with to_timestamp(ms / 1000.0)
mem.public.registerFunction({ name: 'to_timestamp', args: [DataType.float], returns: DataType.timestamptz, implementation: s => new Date(s * 1000) });
const pgAdapter = mem.adapters.createPg();
// Every require('pg') in the app gets pg-mem
const realResolve = Module._resolveFilename;
const PG_ID = '__pgmem__';
Module._resolveFilename = function (request, ...rest) { return request === 'pg' ? PG_ID : realResolve.call(this, request, ...rest); };
require.cache[PG_ID] = { id: PG_ID, filename: PG_ID, loaded: true, exports: pgAdapter };

// The model, unless DEMO_REAL_MODEL=1: a canned claims review that finds FAQ 4's
// "usually" again and one new claim on the hero intro, so the carry-over and the
// "new on unchanged text" mark can be seen without an API call
const SDK_ID = '__fake_anthropic__';
if (process.env.DEMO_REAL_MODEL !== '1') {
  const realResolve2 = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) { return request === '@anthropic-ai/sdk' ? SDK_ID : realResolve2.call(this, request, ...rest); };
  // (The FAQ sorting step needs the real model: run with DEMO_REAL_MODEL=1 to try it.)
  class FakeAnthropic {
    constructor() {
      this.messages = { create: async () => ({ stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 }, content: [{ type: 'text', text: JSON.stringify({ findings: [
        { field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: '"usually" qualifies the confirmed start time' },
        { field: 'home_hero_intro', quote: 'is a landscaper in Southampton', why: 'demo: a made-up finding on text nobody touched' },
      ] }) }] }) };
    }
  }
  require.cache[SDK_ID] = { id: SDK_ID, filename: SDK_ID, loaded: true, exports: FakeAnthropic };
}

const PORT = process.env.DEMO_PORT || (process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 3991);
process.env.PORT = String(PORT);
process.env.DATABASE_URL = 'postgres://pg-mem/demo';
process.env.COPYBOT_SECRET_KEY = process.env.COPYBOT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
process.env.APP_PASSWORD = '';

(async () => {
  const { createFakeWp, seedHomepage, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
  const fake = createFakeWp({ pages: [seedHomepage()] });
  const wp = await listen(fake.app);

  const { v20HomepageInputs } = require(path.join(root, 'server.js'));
  const { pool } = require(path.join(root, 'db.js'));
  for (let i = 0; i < 50; i++) {
    try { await pool.query('SELECT 1 FROM wp_connections LIMIT 1'); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }

  const fs = require('fs');
  const G = require(path.join(root, 'v20-generate.js'));
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
  const clientId = (await pool.query(`INSERT INTO clients (name, trade, use_v20_homepage, v20_test_mode) VALUES ('Edens Edge (demo)', 'Landscaper Gardener', true, true) RETURNING id`)).rows[0].id;
  // Client values, page map and category files, so the field editor can rebuild the page's facts
  const asset = (type, filename, content, metadata = null) => pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, $2, $3, $4, $5)`, [clientId, type, filename, content, metadata && JSON.stringify(metadata)]);
  // coastal_city left blank, so the area research answers it (see the dossier below)
  await asset('client_values', 'client_values.json', JSON.stringify({ ...E.ethanValues(), phone: '023 0000 0000', coastal_city: '' }));
  // The onboarding form's owner field (28 Oct, blog stage 1): the Record tab infers the owner name and role from it while the values are blank
  await pool.query(`INSERT INTO client_fields (client_id, field_key, question_id, value, status, source) VALUES ($1, 'owner_name_title', 'demo', '"Ethan, owner"', 'filled', 'form')`, [clientId]);
  const realDir = path.join(root, 'tests/fixtures/edens-edge-real');
  for (const f of fs.readdirSync(realDir)) {
    await asset('client_file', f, fs.readFileSync(path.join(realDir, f), 'utf8'), { fileType: f === 'page-map.csv' ? 'page_map' : 'custom_values' });
  }
  // Ethan's 14 service areas (the client sheet isn't in the repo; see tests/fixtures/data/edens-edge-real.js)
  const { AREAS } = require(path.join(root, 'tests/fixtures/data/edens-edge-real.js'));
  const areasCsv = ['Client,,,', 'Name,GHL Custom Value Key,Value,Notes', ...AREAS.map((a, i) => `Service area ${i + 1},{{custom_values.biz_area_${i + 1}}},${a},`)].join('\n');
  await asset('client_file', 'client-areas.csv', areasCsv, { fileType: 'custom_values' });
  // The real Southampton dossier (saved 8 Oct), as the area research would have saved it,
  // plus the "Coastal:" line Geo Research CORE v7 adds (the 8 Oct run predates it)
  const dossierText = fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8')
    .replace(/(## 1\. LOCATION OVERVIEW[^\n]*\n[\s\S]*?)(\n## 2\.)/, '$1\nCoastal: Yes [https://www.southampton.gov.uk/media/f2hbzwte/6-environment.pdf]\n$2');
  await asset('geo_dossier', 'Southampton_dossier.md', dossierText,
    { location_name: 'Southampton', location_norm: 'southampton', superseded: false });
  const { ctx, decisionsResult } = await v20HomepageInputs(clientId, null);
  const D = decisionsResult.decisions;
  if (!D) throw new Error('Demo client fails the gates: ' + JSON.stringify(decisionsResult.gates));

  const old = require(path.join(root, 'tests/fixtures/v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
  const record = { ...old, meta: { ...old.meta, client_values: G.clientValueMap(ctx.cv, D.d1_years_trading), decisions_block: decisionsResult.decisionsBlock } };
  const ordered = {};
  for (const [k, v] of Object.entries(record)) {
    ordered[k] = v;
    if (k === 'VALIDATION') ordered.CLAIMS = { for: record.meta.generated_at, status: 'needs acceptance', first_review: 3, rounds: [],
      findings: [{ field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: '"usually" qualifies the confirmed start time' }] };
  }
  await asset('v20_page_record', 'homepage_v20.json', JSON.stringify(ordered));

  // No FAQ research or sorted questions: the FAQ questions card shows the real empty state

  // GBP output (23 Oct): the newest local real run (node tools/gbp-run.js edens-edge) when
  // there is one, so the client page's GBP panel can be seen with real copy. The demo client
  // has no v3 page map, so the panel's readiness line shows that error and the button is off.
  const runsDir = path.join(root, 'tests/quality-runs/gbp/edens-edge');
  const runs = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter(d => fs.existsSync(path.join(runsDir, d, 'record.json'))).sort() : [];
  if (runs.length) await asset('gbp_output', 'gbp.json', fs.readFileSync(path.join(runsDir, runs[runs.length - 1], 'record.json'), 'utf8'));

  console.log('\nDEMO READY');
  console.log(`  Client:       http://localhost:${PORT}/clients/${clientId}/record`);
  console.log(`  Pages:        http://localhost:${PORT}/clients/${clientId}/pages`);
  console.log(`  Page view:    http://localhost:${PORT}/clients/${clientId}/pages/homepage/homepage`);
  console.log(`  Dashboard:    http://localhost:${PORT}/dashboard`);
  console.log(`  Fake WP site: ${wp.url}  (user copybot, Application Password test-app-password-not-real)`);
  console.log(`  Fake site writes so far: GET ${wp.url}/__writes`);
  fake.app.get('/__writes', (req, res) => res.json({ writes: fake.state.writes, h1: fake.state.pages.get(7).acf.home_hero_h1 }));
})().catch(e => { console.error('Demo failed:', e); process.exit(1); });
