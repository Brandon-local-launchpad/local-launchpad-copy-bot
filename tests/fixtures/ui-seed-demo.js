'use strict';
// Fixture: the preview environment's demo client (tools/seed-demo-client.js) on pg-mem:
// seeded once from the repo's test data, found by the dashboard, skipped the second time.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));
const { ensureH1Tables } = require(path.join(root, 'h1-research/service.js'));
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const { ensureUiColumns } = require(path.join(root, 'ui/routes.js'));
const D = require(path.join(root, 'ui/dashboard.js'));
const { seedDemoClient, DEMO_NAME } = require(path.join(root, 'tools/seed-demo-client.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => { if (ok) { console.log('✓ ' + label); pass++; } else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; } };
console.log('\n=== FIXTURE: the preview demo client seed ===\n');
const quiet = { log() {}, info() {}, warn() {}, error(...a) { console.error(...a); } };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), use_v20_homepage BOOLEAN NOT NULL DEFAULT FALSE, v20_test_mode BOOLEAN NOT NULL DEFAULT FALSE);
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT, page_title TEXT, url_slug TEXT);
    CREATE TABLE research_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'pending', preset TEXT, locations JSONB NOT NULL DEFAULT '{}');`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool); await ensureWpTables(pool); await ensureUiColumns(pool);
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), fetchAudio: async () => ({ buffer: Buffer.from('x'), contentType: 'audio/mpeg' }), log: quiet });

  const r1 = await seedDemoClient(pool, { log: quiet, filloutService: svc });
  chk('Seeds the demo client once', r1.skipped === false && r1.id, JSON.stringify(r1), '');
  const r2 = await seedDemoClient(pool, { log: quiet, filloutService: svc });
  chk('A second run finds it and does nothing', r2.skipped === true && r2.id === r1.id && (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n === 1, JSON.stringify(r2), '');
  const types = (await pool.query(`SELECT asset_type, COUNT(*)::int AS n FROM client_assets WHERE client_id = $1 GROUP BY asset_type`, [r1.id])).rows;
  const n = t => (types.find(x => x.asset_type === t) || {}).n || 0;
  chk('The values, the files, the dossier and the homepage record are there', n('client_values') === 1 && n('client_file') >= 3 && n('geo_dossier') === 1 && n('v20_page_record') === 1, JSON.stringify(types), '');
  const cv = JSON.parse((await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values'`, [r1.id])).rows[0].content);
  chk('Values carry a source per filled value, two inferred from the website', cv._sources.company_name === 'form' && cv._sources.hours === 'website' && cv._confirmed && typeof cv._confirmed === 'object', JSON.stringify([cv._sources.company_name, cv._sources.hours]), '');
  const rec = await svc.record(r1.id);
  const f = rec.sections.flatMap(s => s.fields);
  chk('The hand set-up: the niche, the base town and the other towns as hand edits', f.find(x => x.key === 'niche').value === 'Landscapers/Gardeners' && f.find(x => x.key === 'primary_town').value === 'Southampton' && f.find(x => x.key === 'primary_town').source === 'manual', JSON.stringify([f.find(x => x.key === 'niche').value, f.find(x => x.key === 'primary_town')]), '');
  const d = await D.loadDashboard({ pool, tradeFacts: { status: async () => ({ verified: true }) }, runners: {} });
  const row = d.clients.find(c => c.name === DEMO_NAME);
  chk('The dashboard shows it at Page map (values and a dossier, no page map yet), with the claim as a blocker once pages exist', row && row.stage === 'Page map' && row.niche_key === 'landscapers', JSON.stringify(row && [row.stage, row.niche_key, row.blocker]), '');
  console.log(`\n${pass} passed, ${fail} failed`);
  setTimeout(() => process.exit(fail ? 1 : 0), 100);
})().catch(e => { console.error(e); process.exit(1); });
