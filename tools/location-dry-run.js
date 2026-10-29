'use strict';
// The Location Determiner dry run for Edens Edge on the committed files, on pg-mem with the
// real places table. Spends nothing and writes nothing. The live client runs the same code
// through GET /api/clients/:id/locations/dry-run.
//   node tools/location-dry-run.js            the report
//   node tools/location-dry-run.js --json     the raw result
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const { newDb, DataType } = require('pg-mem');
const P = require(path.join(root, 'locations/places.js'));
const S = require(path.join(root, 'locations/serp.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));
const E = require(path.join(root, 'tests/fixtures/data/edens-edge-locations.js'));

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await P.ensurePlacesTables(pool);
  await P.seedPlaces(pool, { log: null });
  await S.ensureSerpTables(pool);
  await pool.query(`CREATE TABLE keyword_volumes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), keyword TEXT NOT NULL, location_code INTEGER NOT NULL, volume INTEGER, cpc NUMERIC, status TEXT NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), cost NUMERIC)`);
  const svc = createLocationService({ pool, filloutService: null, pageMapStore: null, h1: { cached: async () => new Map() }, places: P.createPlacesStore(pool), serp: S.createSerpStore(pool), geocode: async () => null });
  const R = await svc.dryRun('edens-edge-fixture', { inputs: E.inputs() });
  if (process.argv.includes('--json')) { console.log(JSON.stringify(R, null, 2)); return; }

  const L = [];
  L.push(`LOCATION DETERMINER DRY RUN: ${R.client.name} (${R.client.niche})`);
  if (!R.ok) { L.push('Cannot run:'); for (const p of R.problems) L.push(`  - ${p.msg}`); for (const f of R.flags) L.push(`  flag ${f.code}: ${f.msg}`); console.log(L.join('\n')); return; }
  L.push(`Base: ${R.base.name} (population ${R.base.population.toLocaleString('en-GB')}); point from ${R.point.from}: ${R.point.note}`);
  L.push(`Travel: ${R.travel.miles} miles from ${R.travel.from} ("${R.travel.raw}") → reach ${R.reach_miles} mi, outer limit ${R.outer_limit_miles} mi, Tier 1 band ${R.tier1_band.join(' to ')}`);
  for (const f of R.flags) L.push(`  flag ${f.code}: ${f.msg}`);
  L.push(`Categories (${R.inputs.categories.length}): ${R.inputs.categories.map(c => c.name + (c.primary ? ' (primary)' : '')).join(', ')}`);
  L.push('');
  const c = R.counts;
  L.push(`Considered ${c.considered} places within ${R.outer_limit_miles} mi: ${c.candidates} candidates in the volume run (${c.inside_reach} inside reach, ${c.beyond_reach_typed} beyond reach but typed by the client, ${c.districts_of_base} districts of ${R.base.name}), ${c.area_only} area only (beyond reach, not typed), ${c.excluded} excluded (${c.across_water} across water). Client typed ${R.inputs.otherAreas.length}: ${c.client_asked} matched (${c.client_asked_excluded} excluded), ${c.unmatched} unmatched.`);
  L.push('');
  const pad = (s, n) => String(s == null ? '' : s).padEnd(n);
  L.push(pad('CANDIDATES', 26) + pad('type', 10) + pad('pop', 9) + pad('miles', 7) + pad('reach', 8) + pad('source', 13) + 'note');
  for (const r of R.candidates.filter(x => x.status === 'candidate')) L.push(pad(r.name + (r.qualifier ? ` (${r.qualifier})` : ''), 26) + pad(r.type, 10) + pad(r.population == null ? '' : r.population.toLocaleString('en-GB'), 9) + pad(r.miles, 7) + pad(r.inside_reach ? 'inside' : 'beyond', 8) + pad(r.source, 13) + r.reason);
  L.push('');
  L.push(pad('AREA ONLY', 26) + pad('type', 10) + pad('pop', 9) + pad('miles', 7) + 'reason');
  for (const r of R.candidates.filter(x => x.status === 'area_only')) L.push(pad(r.name + (r.qualifier ? ` (${r.qualifier})` : ''), 26) + pad(r.type, 10) + pad(r.population == null ? '' : r.population.toLocaleString('en-GB'), 9) + pad(r.miles, 7) + r.reason);
  L.push('');
  L.push(pad('EXCLUDED', 26) + pad('type', 10) + pad('pop', 9) + pad('miles', 7) + 'reason');
  const ex = R.candidates.filter(x => x.status === 'excluded');
  const shown = ex.filter(x => x.client_asked || x.type !== 'district');
  for (const r of shown.filter(x => x.client_asked || x.type === 'town' || x.is_admin_area).slice(0, 60)) L.push(pad(r.name + (r.qualifier ? ` (${r.qualifier})` : ''), 26) + pad(r.type, 10) + pad(r.population == null ? '' : r.population.toLocaleString('en-GB'), 9) + pad(r.miles, 7) + r.reason + (r.client_asked ? '  [client typed]' : ''));
  const hiddenDistricts = ex.filter(x => !x.client_asked && x.type === 'district').length;
  if (hiddenDistricts) L.push(`  … and ${hiddenDistricts} districts of other towns (part of their town), not listed`);
  if (R.unmatched.length) { L.push(''); L.push('UNMATCHED (typed by the client, not in the places table):'); for (const u of R.unmatched) L.push(`  - "${u.typed}": ${u.note}`); }
  L.push('');
  L.push(`PAGES IF EVERY COMBINATION PASSES: ${c.pages_if_all_pass.location} location pages, ${c.pages_if_all_pass.location_category} location category pages (today: ${R.before.location} location pages, ${R.before.location_phase2} of them phase 2; ${R.before.location_category} location category pages)`);
  L.push('');
  L.push(`KEYWORDS: ${R.plan.keyword_count} unique (${R.plan.keywords_cached} cached, ${R.plan.keywords_to_buy} to buy); SERP QUERIES: up to ${R.plan.serp_queries} (${R.plan.serp_cached} cached) of ${R.plan.serp_eligible_pages} eligible page combinations (towns inside reach only, no districts), one per combination whose best volume is under 10, so fewer once the volumes are known`);
  L.push(`ESTIMATE: volume $${R.estimate.volume.cost_usd} (${R.estimate.volume.tasks} task${R.estimate.volume.tasks === 1 ? '' : 's'}; ${R.estimate.volume.basis}); SERP up to $${R.estimate.serp.cost_usd} (${R.estimate.serp.queries} × $${R.estimate.serp.per_query_usd}); total up to $${R.estimate.total_usd}`);
  L.push('');
  L.push('Sample keywords: ' + R.plan.keywords.slice(0, 12).join(' | '));
  if (R.scan) L.push(`Scan comparison: a locked grid of ${R.scan.reach_miles} mi would move ${R.scan.moves.length} towns`);
  console.log(L.join('\n'));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
