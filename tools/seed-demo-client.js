'use strict';

// ── A demo client for a preview environment (UI redesign, 27 Oct 2026) ──────────
// Seeds "Edens Edge (demo)" once, from the repo's own test data, so a fresh database
// has something to look at: Ethan's client values (with sources), the real custom
// values and page map files, the Southampton dossier, the hand set-up (niche, service
// ticks, base town, other towns) and the saved homepage record with one claim left to
// accept. Runs at start-up when SEED_DEMO_CLIENT=1 (never set on production); a second
// start finds the client and does nothing. Safe to run again.

const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');

const DEMO_NAME = 'Edens Edge (demo)';

async function seedDemoClient(pool, { log = console, v20HomepageInputs = null, filloutService = null } = {}) {
  const { rows: have } = await pool.query(`SELECT id FROM clients WHERE name = $1`, [DEMO_NAME]);
  if (have.length) return { skipped: true, id: have[0].id };
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
  const { AREAS } = require(path.join(root, 'tests/fixtures/data/edens-edge-real.js'));
  const A = require(path.join(root, 'fillout/allocation.js'));

  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade, use_v20_homepage, v20_test_mode, source) VALUES ($1, 'Landscaper Gardener', true, true, 'wizard') RETURNING id`, [DEMO_NAME]);
  const clientId = c.id;
  await A.allocate(pool, clientId, { nicheKey: 'landscapers', signedOn: new Date().toISOString().slice(0, 10), source: 'confirmed' }).catch(e => log.error('[seed-demo] allocation:', e.message));
  const asset = (type, filename, content, metadata = null) => pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, $2, $3, $4, $5)`, [clientId, type, filename, content, metadata && JSON.stringify(metadata)]);

  // Client values: Ethan's documented values, every filled one tagged Form, two inferred from the website for the amber state
  const cv = { ...E.ethanValues(), phone: '023 8000 0000', coastal_city: '' };
  const sources = {};
  for (const [k, v] of Object.entries(cv)) if (v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length) && v !== false) sources[k] = 'form';
  cv.hours = 'Monday to Saturday, 8am to 6pm'; sources.hours = 'website';
  cv.year_founded = cv.year_founded || '2018'; sources.year_founded = 'website';
  cv._sources = sources; cv._confirmed = {};
  cv._intake = { website: 'https://www.edensedgelandscaping.co.uk', existing_site: true, multi_location: false, at: new Date().toISOString() };
  await asset('client_values', 'client_values.json', JSON.stringify(cv));

  // The real custom values and page map files, and the 14 service areas
  const realDir = path.join(root, 'tests/fixtures/edens-edge-real');
  for (const f of fs.readdirSync(realDir)) await asset('client_file', f, fs.readFileSync(path.join(realDir, f), 'utf8'), { fileType: f === 'page-map.csv' ? 'page_map' : 'custom_values' });
  const areasCsv = ['Client,,,', 'Name,GHL Custom Value Key,Value,Notes', ...AREAS.map((a, i) => `Service area ${i + 1},{{custom_values.biz_area_${i + 1}}},${a},`)].join('\n');
  await asset('client_file', 'client-areas.csv', areasCsv, { fileType: 'custom_values' });

  // The Southampton dossier (saved 8 Oct), with the Coastal line the research core adds now
  const dossier = fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8')
    .replace(/(## 1\. LOCATION OVERVIEW[^\n]*\n[\s\S]*?)(\n## 2\.)/, '$1\nCoastal: Yes [https://www.southampton.gov.uk/media/f2hbzwte/6-environment.pdf]\n$2');
  await asset('geo_dossier', 'Southampton_dossier.md', dossier, { location_name: 'Southampton', location_norm: 'southampton', superseded: false });

  // The hand set-up (niche, ticks, towns, name) through the Fillout service, as hand edits
  if (filloutService) {
    try {
      const S = require(path.join(root, 'tools/seed-edens-edge.js'));
      for (const [key, want] of S.targets()) await filloutService.setField(clientId, key, want);
    } catch (e) { log.error('[seed-demo] hand set-up:', e.message); }
  }

  // The saved homepage record (a real 14 Oct run) with one claim left to accept
  const old = require(path.join(root, 'tests/fixtures/v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
  let meta = { ...old.meta };
  if (v20HomepageInputs) {
    try {
      const G = require(path.join(root, 'v20-generate.js'));
      const { ctx, decisionsResult } = await v20HomepageInputs(clientId, null);
      if (decisionsResult.decisions) meta = { ...meta, client_values: G.clientValueMap(ctx.cv, decisionsResult.decisions.d1_years_trading), decisions_block: decisionsResult.decisionsBlock };
    } catch (e) { log.error('[seed-demo] decisions for the record meta:', e.message); }
  }
  const record = {};
  for (const [k, v] of Object.entries({ ...old, meta })) {
    record[k] = v;
    if (k === 'VALIDATION') record.CLAIMS = { for: meta.generated_at, status: 'needs acceptance', first_review: 1, rounds: [], findings: [{ field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: '"usually" qualifies the confirmed start time' }], accepted: [] };
  }
  await asset('v20_page_record', 'homepage_v20.json', JSON.stringify(record), { page_type: 'homepage', page_key: 'homepage' });
  log.log(`[seed-demo] seeded "${DEMO_NAME}" (${clientId})`);
  return { skipped: false, id: clientId };
}

module.exports = { seedDemoClient, DEMO_NAME };
