'use strict';
// A local demo of the WordPress card, end to end, with no real database or site:
//   - the app's own server.js and db.js, with the pg driver pointed at pg-mem
//     (an in-memory Postgres), so initDb creates the real schema
//   - a fake WordPress site (tests/fake-wp) with a draft homepage
//   - one demo client with a v20 homepage record (Ethan's values; one claims
//     finding left to accept)
// Run: node tests/ui/demo-server.js   then open the URL it prints.
// Test credentials only (the fake site's), never real ones.

const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const root = path.join(__dirname, '../..');

const { newDb, DataType } = require('pg-mem');
const mem = newDb();
mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
const pgAdapter = mem.adapters.createPg();
// Every require('pg') in the app gets pg-mem
const realResolve = Module._resolveFilename;
const PG_ID = '__pgmem__';
Module._resolveFilename = function (request, ...rest) { return request === 'pg' ? PG_ID : realResolve.call(this, request, ...rest); };
require.cache[PG_ID] = { id: PG_ID, filename: PG_ID, loaded: true, exports: pgAdapter };

const PORT = process.env.DEMO_PORT || 3991;
process.env.PORT = String(PORT);
process.env.DATABASE_URL = 'postgres://pg-mem/demo';
process.env.COPYBOT_SECRET_KEY = process.env.COPYBOT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
process.env.APP_PASSWORD = '';

(async () => {
  const { createFakeWp, seedHomepage, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
  const fake = createFakeWp({ pages: [seedHomepage()] });
  const wp = await listen(fake.app);

  require(path.join(root, 'server.js'));
  const { pool } = require(path.join(root, 'db.js'));
  for (let i = 0; i < 50; i++) {
    try { await pool.query('SELECT 1 FROM wp_connections LIMIT 1'); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }

  const G = require(path.join(root, 'v20-generate.js'));
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
  const old = require(path.join(root, 'tests/fixtures/v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
  const record = { ...old, meta: { ...old.meta, client_values: G.clientValueMap({ ...E.ethanValues(), phone: '023 0000 0000' }, null) } };
  const ordered = {};
  for (const [k, v] of Object.entries(record)) {
    ordered[k] = v;
    if (k === 'VALIDATION') ordered.CLAIMS = { for: record.meta.generated_at, status: 'needs acceptance', first_review: 3, rounds: [],
      findings: [{ field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: '"usually" qualifies the confirmed start time' }] };
  }
  const clientId = (await pool.query(`INSERT INTO clients (name, trade, use_v20_homepage, v20_test_mode) VALUES ('Edens Edge (demo)', 'Landscaper Gardener', true, true) RETURNING id`)).rows[0].id;
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'v20_page_record', 'homepage_v20.json', $2)`, [clientId, JSON.stringify(ordered)]);

  console.log('\nDEMO READY');
  console.log(`  App:          http://localhost:${PORT}/generate?clientId=${clientId}`);
  console.log(`  Fake WP site: ${wp.url}  (user copybot, Application Password test-app-password-not-real)`);
  console.log(`  Fake site writes so far: GET ${wp.url}/__writes`);
  fake.app.get('/__writes', (req, res) => res.json({ writes: fake.state.writes, h1: fake.state.pages.get(7).acf.home_hero_h1 }));
})().catch(e => { console.error('Demo failed:', e); process.exit(1); });
