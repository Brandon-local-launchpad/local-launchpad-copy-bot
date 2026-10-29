'use strict';
// Fixture: Location Determiner Stage 6 (locations/approved.js, the page map and GBP reading the
// approved tiers). The generator with tiers (tier on the location rows, location category rows
// only where the combination passed), the store on pg-mem with the seeded Edens Edge record
// (no approval = today's behaviour; an approval replaces the towns, sets the phases by tier with
// the Pages panel ticks overriding, retires the rest with applies = false and the reason, and
// never touches edited fields), the reader's shape, and the GBP service areas.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const G = require(path.join(root, 'page-map/generator.js'));
const R = require(path.join(root, 'fillout/services/resolver.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const { volumes } = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const A = require(path.join(root, 'locations/approved.js'));
const V = require(path.join(root, 'locations/review.js'));
const { buildGbpInputs } = require(path.join(root, 'gbp/inputs.js'));
const S6 = require(path.join(root, 'locations/stage6.js'));
const P = require(path.join(root, 'locations/places.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Location Determiner Stage 6, the approved tiers on the page map and GBP ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const config = R.loadConfig('landscapers-gardeners');
const resolved = R.resolve(ticks, config, { categoryTabRule: 'ticked_only' });
const keys = resolved.categories.map(c => c.key);
const primaryKey = (resolved.categories.find(c => c.primary) || resolved.categories[0]).key;
const input = { resolved, baseTown: S.BASE_TOWN, otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY, niche: 'Landscapers/Gardeners' };

(async () => {
  // ── The generator with tiers ──
  const tiersOpt = { tier1: new Set(['romsey', 'winchester']), tier2: new Set(['eastleigh']), categories: new Map([['romsey', new Set([primaryKey, keys[1]])], ['winchester', new Set(keys)], ['eastleigh', new Set([primaryKey])]]) };
  const m = G.buildPageMap({ ...input, otherTowns: 'Romsey\nWinchester\nEastleigh' }, { volumes: volumes(), launchTowns: new Set(['romsey', 'winchester']), tiers: tiersOpt });
  const locs = m.rows.filter(r => r.type === 'location');
  chk('location rows carry their tier', locs.length === 3 && locs.find(r => r.slug === '/locations/romsey').info.tier === 1 && locs.find(r => r.slug === '/locations/eastleigh').info.tier === 2, JSON.stringify(locs.map(r => [r.slug, r.info.tier])), 'Romsey 1, Winchester 1, Eastleigh 2');
  const lc = t => m.rows.filter(r => r.type === 'location_category' && r.info.town === t);
  chk('location category rows only where the combination passed: Romsey 2, Winchester all, Eastleigh the primary alone', lc('Romsey').length === 2 && lc('Winchester').length === keys.length && lc('Eastleigh').length === 1 && lc('Eastleigh')[0].info.category_key === primaryKey, `${lc('Romsey').length}, ${lc('Winchester').length}, ${lc('Eastleigh').length}`, `2, ${keys.length}, 1`);
  chk('phases follow the launch set: Tier 1 towns phase 1, the Tier 2 town phase 2', locs.find(r => r.slug === '/locations/romsey').info.phase === 1 && locs.find(r => r.slug === '/locations/eastleigh').info.phase === 2 && lc('Eastleigh')[0].info.phase === 2, '', 'Romsey 1, Eastleigh 2');
  const plain = G.buildPageMap({ ...input, otherTowns: 'Romsey\nWinchester\nEastleigh' }, { volumes: volumes() });
  chk('without tiers nothing changes: every town gets every category and no tier is written', plain.rows.filter(r => r.type === 'location_category').length === 3 * keys.length && plain.rows.filter(r => r.type === 'location').every(r => r.info.tier === undefined), '', 'all combinations, no tier');

  // ── The reader on pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool);
  await V.ensureReviewTables(pool);
  const svcF = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper')`);
  await S.seed(pool, { write: true, log() {} });
  const cid = (await pool.query(`SELECT id FROM clients WHERE name = 'ednes edge testing'`)).rows[0].id;
  chk('no approval: the reader says null', (await A.approvedTiers(pool, cid)) === null, '', 'null');

  const store = createPageMapStore({ pool, filloutService: svcF, volumesFor: async () => volumes() });
  await store.generate(cid);
  let rows = await store.saved(cid);
  const byKey = k => rows.find(r => r.page_key === k);
  chk('no approval: the page map is as before (13 location pages from the record, every category per town)', rows.filter(r => r.type === 'location' && r.applies).length === 13 && rows.filter(r => r.type === 'location_category' && r.applies).length === 13 * keys.length, `${rows.filter(r => r.type === 'location' && r.applies).length}`, '13');
  // A person's work on pages that will retire
  const totton = byKey('location:/locations/lockerley');
  await store.setRow(cid, byKey('location:/locations/lockerley').id, { h1: 'Gardeners in Lockerley', meta_title: 'Lockerley gardeners' });
  await store.setRow(cid, byKey('location:/locations/awbridge').id, { status: 'Copy Generated' });

  // An approval: Romsey and Winchester Tier 1, Eastleigh and Totton Tier 2, Lyndhurst area only; the rest gone
  const now = new Date();
  const ins = (name, type, outcome, tier, categories, score) => pool.query(`INSERT INTO client_location_tiers (client_id, place_id, name, type, outcome, tier, phase, source, scores, categories, approved_at, approved_by, run_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scored', $8, $9, $10, 'Brandon', $10)`, [cid, 'p-' + name.toLowerCase(), name, type, outcome, tier, tier, JSON.stringify({ score, fallback: 0 }), JSON.stringify(categories), now]);
  await ins('Romsey', 'town', 'page', 1, [primaryKey, keys[1]], 90);
  await ins('Winchester', 'town', 'page', 1, keys, 270);
  await ins('Eastleigh', 'town', 'page', 2, [primaryKey], 50);
  await ins('Totton', 'town', 'page', 2, [primaryKey, keys[2]], 0);
  await ins('Lyndhurst', 'town', 'area_only', null, [], 5);
  await ins('Bitterne', 'district', 'area_only', null, [], 3);
  const T = await A.approvedTiers(pool, cid);
  chk('the reader: towns Tier 1 then Tier 2, the categories per town, the GBP areas Tier 1, Tier 2, then area only towns (districts never)', T && T.towns.join(',') === 'Romsey,Winchester,Eastleigh,Totton' && T.categories.get('romsey').size === 2 && T.categories.get('winchester').size === keys.length && T.gbp_areas.join(',') === 'Romsey,Winchester,Eastleigh,Totton,Lyndhurst' && T.source === 'approved', JSON.stringify(T && { towns: T.towns, gbp: T.gbp_areas }), 'Romsey,Winchester,Eastleigh,Totton | …,Lyndhurst');

  // ── The store with the approval ──
  const pre = await store.preview(cid);
  chk('the preview takes the other towns from the approval, keeps the record\'s for the state', pre.inputs.otherTowns === 'Romsey\nWinchester\nEastleigh\nTotton' && pre.inputs.otherTownsFromRecord === S.OTHER_TOWNS.join('\n') && pre.inputs.locationTiers.source === 'approved', pre.inputs.otherTowns, 'Romsey\\nWinchester\\nEastleigh\\nTotton');
  chk('the plan: 4 location pages, Tier 1 phase 1 and Tier 2 phase 2, launch towns Romsey and Winchester', pre.plan.rows.filter(r => r.type === 'location').length === 4 && pre.plan.rows.find(r => r.slug === '/locations/romsey').info.phase === 1 && pre.plan.rows.find(r => r.slug === '/locations/totton').info.phase === 2 && pre.plan.launchTowns.join(',') === 'Romsey,Winchester', JSON.stringify(pre.plan.launchTowns), 'Romsey,Winchester');
  chk('location category rows only for the passed combinations (Romsey 2, Eastleigh 1, Totton 2, Winchester all)', ['Romsey', 'Eastleigh', 'Totton', 'Winchester'].map(t => pre.plan.rows.filter(r => r.type === 'location_category' && r.info.town === t).length).join(',') === `2,1,2,${keys.length}`, ['Romsey', 'Eastleigh', 'Totton', 'Winchester'].map(t => pre.plan.rows.filter(r => r.type === 'location_category' && r.info.town === t).length).join(','), `2,1,2,${keys.length}`);
  chk('the diff retires the 10 other towns (13 on the record, 3 of them approved)\' location pages and the failed combinations, adds Totton, keeps the rest', pre.diff.retire.filter(r => r.type === 'location').length === 10 && pre.diff.add.some(r => r.slug === '/locations/totton') && pre.diff.retire.some(r => r.type === 'location_category' && r.info.town === 'Romsey') && !pre.diff.retire.some(r => r.slug === '/locations/romsey'), `retire ${pre.diff.retire.filter(r => r.type === 'location').length} locations`, '10');
  chk('the diff names the retiring pages a person worked on (Lockerley: manual H1; Awbridge: status)', pre.diff.retiringWorkedOn.some(w => /Lockerley/.test(w.title)) && pre.diff.retiringWorkedOn.some(w => /Awbridge/.test(w.title) && w.status === 'Copy Generated'), JSON.stringify(pre.diff.retiringWorkedOn), 'Lockerley, Awbridge');

  // The Pages panel ticks override the tiers
  await store.setLaunchTown(cid, 'Winchester', false);
  await store.setLaunchTown(cid, 'Totton', true);
  const pre2 = await store.preview(cid);
  chk('an untick on a Tier 1 town makes it phase 2; a tick on a Tier 2 town makes it phase 1 (manual ticks override)', pre2.plan.rows.find(r => r.slug === '/locations/winchester').info.phase === 2 && pre2.plan.rows.find(r => r.slug === '/locations/totton').info.phase === 1 && pre2.plan.rows.find(r => r.slug === '/locations/romsey').info.phase === 1, pre2.plan.launchTowns.join(','), 'Romsey,Totton');
  await store.setLaunchTown(cid, 'Winchester', true);
  await store.setLaunchTown(cid, 'Totton', false);

  // Generate: retired rows keep their work, with the reason
  await store.generate(cid);
  rows = await store.saved(cid);
  const lock = byKey('location:/locations/lockerley'), awb = byKey('location:/locations/awbridge');
  chk('retired pages get applies = false with the Stage 6 reason, never deleted', lock && lock.applies === false && /approved locations list/.test(lock.retired_reason) && awb && awb.applies === false, lock && lock.retired_reason, 'not a Tier 1 or Tier 2 town on the approved locations list');
  chk('their edited H1, meta and status are untouched', lock.h1 === 'Gardeners in Lockerley' && lock.h1_source === 'manual' && lock.meta_title === 'Lockerley gardeners' && awb.status === 'Copy Generated', JSON.stringify({ h1: lock.h1, meta: lock.meta_title, st: awb.status }), 'kept');
  const failedCombo = rows.find(r => r.type === 'location_category' && r.info.town === 'Romsey' && r.applies === false);
  chk('a failed combination\'s row is retired with the demand gate reason (the town is plain text in that category\'s areas)', failedCombo && /did not pass the demand gate/.test(failedCombo.retired_reason), failedCombo && failedCombo.retired_reason, 'did not pass the demand gate …');
  chk('live location pages are the 4 approved towns with their tier in info; the state records the tiers', rows.filter(r => r.type === 'location' && r.applies).length === 4 && byKey('location:/locations/romsey').info.tier === 1 && byKey('location:/locations/totton').info.tier === 2 && (await store.state(cid)).inputs.locationTiers.tier1.join(',') === 'Romsey,Winchester', '', '4 live, tiers in info and state');

  // ── tiersFromReview ──
  const view = { ok: true, ran_at: '2026-10-29T19:50:16.719Z', approval: null, list: [
    { place_id: 'a', name: 'Winchester', type: 'town', tier: 1, to: 'tier1', outcome: 'page', source: 'client_asked', score: 276, fallback: 0 },
    { place_id: 'b', name: 'Totton', type: 'town', tier: 2, to: 'tier2', outcome: 'page', source: 'scored', score: 16, fallback: 0 },
    { place_id: 'c', name: 'Botley', type: 'town', tier: null, to: 'area_only', outcome: 'area_only', source: 'scored', score: 58, fallback: 0 },
    { place_id: 'd', name: 'Hill', type: 'district', tier: null, to: 'excluded', outcome: 'excluded', source: 'scored', score: 0, fallback: 0 },
  ], location_categories: [{ place_id: 'a', category_key: primaryKey, primary: true }, { place_id: 'a', category_key: keys[1] }, { place_id: 'b', category_key: primaryKey, primary: true }] };
  const fromView = A.tiersFromReview(view);
  chk('tiersFromReview: the same shape from an unapproved review, marked as such, excluded places left out', fromView.source === 'review (not approved)' && fromView.towns.join(',') === 'Winchester,Totton' && fromView.categories.get('winchester').size === 2 && fromView.gbp_areas.join(',') === 'Winchester,Totton,Botley' && fromView.area_only.length === 1, JSON.stringify({ s: fromView.source, t: fromView.towns, g: fromView.gbp_areas }), 'review (not approved); Winchester,Totton; Winchester,Totton,Botley');

  // ── GBP service areas ──
  const gbpRows = [{ type: 'category', title: 'Gardener', applies: true, info: { category_key: primaryKey, primary: true, links: {} } }, ...['Romsey', 'Eastleigh', 'Lyndhurst'].map(t => ({ type: 'location', title: t, applies: true, info: { town: t } }))];
  const kv = { biz_area_1: 'Southampton', biz_area_2: 'Romsey' };
  const plainGbp = buildGbpInputs({ cv: { company_name: 'Edens Edge', primary_category: 'Gardener' }, rows: gbpRows, keyValueMap: kv });
  chk('GBP without an approval: the service areas are the base town then the page map\'s location rows', plainGbp.serviceAreasPageMap.join(',') === 'Southampton,Romsey,Eastleigh,Lyndhurst' && plainGbp.serviceAreasFrom === 'the page map', plainGbp.serviceAreasPageMap.join(','), 'Southampton,Romsey,Eastleigh,Lyndhurst');
  const many = Array.from({ length: 25 }, (_, i) => `Town ${i + 1}`);
  const withApproval = buildGbpInputs({ cv: { company_name: 'Edens Edge', primary_category: 'Gardener' }, rows: gbpRows, keyValueMap: kv, approvedAreas: ['Winchester', 'Southampton', ...many] });
  chk('GBP with an approval: the base town first, the approved list in order, no repeat, 20 at most', withApproval.serviceAreasPageMap[0] === 'Southampton' && withApproval.serviceAreasPageMap[1] === 'Winchester' && withApproval.serviceAreasPageMap.length === 20 && withApproval.serviceAreasPageMap.filter(t => t === 'Southampton').length === 1 && withApproval.serviceAreasFrom === 'the approved locations list', withApproval.serviceAreasPageMap.length + ' ' + withApproval.serviceAreasPageMap.slice(0, 3).join(','), '20 Southampton,Winchester,Town 1');

  // ── Approve = Stage 6: the confirm's preview, then the approval and the page map in one action ──
  // A second seeded client with a synthetic run (the shape locations/service.js saves) and no approval
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('Approve test', 'Landscaper')`);
  const cid2 = (await pool.query(`SELECT id FROM clients WHERE name = 'Approve test'`)).rows[0].id;
  const towns = [
    { place_id: 'p-romsey', name: 'Romsey', type: 'town', population: 19923, miles: 6.4, lat: 50.9895, lng: -1.4997, inside_reach: true, source: 'client_asked', client_asked: true, total_volume: 120, score: 93.12, fallback: 10000, gate: { pass: true, by: 'volume', volume: 50, competitors: null }, evidence: null, tier: 1, phase: 1, outcome: 'page', why: 'Tier 1' },
    { place_id: 'p-winchester', name: 'Winchester', type: 'town', population: 48486, miles: 10.2, lat: 51.0632, lng: -1.308, inside_reach: true, source: 'client_asked', client_asked: true, total_volume: 430, score: 276.49, fallback: 20000, gate: { pass: true, by: 'volume', volume: 140, competitors: null }, evidence: null, tier: 1, phase: 1, outcome: 'page', why: 'Tier 1' },
    { place_id: 'p-eastleigh', name: 'Eastleigh', type: 'town', population: 48355, miles: 4.1, lat: 50.9697, lng: -1.35, inside_reach: true, source: 'client_asked', client_asked: true, total_volume: 110, score: 94.2, fallback: 30000, gate: { pass: true, by: 'volume', volume: 50, competitors: null }, evidence: null, tier: 2, phase: 2, outcome: 'page', why: 'Tier 2' },
    { place_id: 'p-totton', name: 'Totton', type: 'town', population: 28093, miles: 5.2, lat: 50.92, lng: -1.4863, inside_reach: true, source: 'scored', client_asked: false, total_volume: 20, score: 16.36, fallback: 22980, gate: { pass: false, by: null, volume: null, competitors: 1 }, evidence: null, tier: 2, phase: 2, outcome: 'page', population_rule: true, why: 'Tier 2: population' },
    { place_id: 'p-botley', name: 'Botley', type: 'town', population: 5900, miles: 4.7, lat: 50.915, lng: -1.27, inside_reach: true, source: 'scored', client_asked: false, total_volume: 70, score: 58, fallback: 5000, gate: { pass: false, by: null, volume: null, competitors: 0 }, evidence: null, tier: null, phase: null, outcome: 'area_only', why: 'no demand' },
  ];
  const run = { ok: true, client: { id: cid2, name: 'Approve test', niche: 'Landscapers/Gardeners' }, ran_at: '2026-10-30T09:00:00.000Z', base: { place_id: 'p-soton', name: 'Southampton', population: 249633, lat: 50.9105, lng: -1.4049 }, point: { lat: 50.9105, lng: -1.4049, from: 'town centroid', note: '' }, travel: { miles: 20, from: 'client values', raw: '20 miles' }, reach_miles: 15, outer_limit_miles: 20, tier1_band: [5, 8], page_town_cap: 20, flags: [], scan: null, costs: { total_usd: 0 }, candidates: [], unmatched: [],
    tiers: { tier1: towns.filter(t => t.tier === 1), tier2: towns.filter(t => t.tier === 2), area_only: towns.filter(t => t.outcome === 'area_only'), excluded: [], towns, top_score: 276.49, band: [5, 8], cap: 20 },
    gbp_areas: [], no_demand: [],
    location_categories: [
      { town: 'Romsey', place_id: 'p-romsey', phase: 1, tier: 1, category_key: primaryKey, category: 'Gardener', primary: true, pass: true, by: 'volume', volume: 50 },
      { town: 'Romsey', place_id: 'p-romsey', phase: 1, tier: 1, category_key: keys[1], category: 'x', primary: false, pass: true, by: 'volume', volume: 30 },
      { town: 'Winchester', place_id: 'p-winchester', phase: 1, tier: 1, category_key: primaryKey, category: 'Gardener', primary: true, pass: true, by: 'volume', volume: 140 },
      ...keys.slice(1).map(k => ({ town: 'Winchester', place_id: 'p-winchester', phase: 1, tier: 1, category_key: k, category: k, primary: false, pass: true, by: 'volume', volume: 20 })),
      { town: 'Eastleigh', place_id: 'p-eastleigh', phase: 2, tier: 2, category_key: primaryKey, category: 'Gardener', primary: true, pass: true, by: 'volume', volume: 50 },
      { town: 'Totton', place_id: 'p-totton', phase: 2, tier: 2, category_key: primaryKey, category: 'Gardener', primary: true, pass: true, by: 'population' },
    ],
    after: {}, before: {} };
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, metadata JSONB, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  // The seeded client (cid) has the record and a page map already: use it as the approve client too, with the synthetic run
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'locations_run', 'locations_run.json', $2)`, [cid, JSON.stringify({ ...run, client: { ...run.client, id: cid } })]);
  await pool.query(`DELETE FROM client_location_tiers WHERE client_id = $1`, [cid]);
  await pool.query(`DELETE FROM client_town_flags WHERE client_id = $1`, [cid]);
  const placesStore = P.createPlacesStore(pool);
  const locSvc = createLocationService({ pool, filloutService: svcF, pageMapStore: store, h1: null, places: placesStore, serp: null, geocode: async () => null, log: { error() {} } });
  const review = V.createLocationReview({ pool, places: placesStore, locations: locSvc, log: { log() {} } });
  { const r = (await store.saved(cid)).find(x => x.type === 'location_category' && x.applies && x.info.town === 'Totton' && x.info.category_key === keys[2]); await store.setRow(cid, r.id, { h1: 'Garden design in Totton' }); }
  const v0 = await review.view(cid);
  chk('approve: the review reads the synthetic run (4 page towns, no approval)', v0.ok && v0.counts.tier1 === 2 && v0.counts.tier2 === 2 && v0.approval === null, JSON.stringify(v0.ok && v0.counts), '2 Tier 1, 2 Tier 2');
  const pre6 = await S6.stage6Preview({ review, pageMapStore: store, pool }, cid);
  chk('the Stage 6 preview comes from the unapproved review: 4 other towns, Tier 1 as launch towns, counts by type, nothing written', pre6.ok && pre6.tiers.source === 'review (not approved)' && pre6.other_towns.join(',') === 'Winchester,Romsey,Eastleigh,Totton' && pre6.launch_towns.join(',') === 'Winchester,Romsey' && pre6.by_type.length > 0 && pre6.totals.retire >= 1 && (await A.approvedTiers(pool, cid)) === null, JSON.stringify(pre6.ok && { t: pre6.other_towns, l: pre6.launch_towns, src: pre6.tiers && pre6.tiers.source }), 'Winchester,Romsey,Eastleigh,Totton | Winchester,Romsey | review (not approved)');
  chk('the preview lists the retiring page a person worked on (the Totton category page with a manual H1), with what the work was', pre6.worked_on.length === 1 && /Totton/.test(pre6.worked_on[0].title) && pre6.worked_on[0].worked.some(x => /manual/.test(x)) && pre6.retire.every(r => Array.isArray(r.worked)), JSON.stringify(pre6.worked_on.map(w => [w.title, w.worked])), 'one Totton page, H1 manual');
  const approved = await S6.approveAndGenerate({ review, pageMapStore: store, pool, log: { log() {} } }, cid, { who: 'Brandon' });
  rows = await store.saved(cid);
  const byKey2 = k => rows.find(r => r.page_key === k);
  chk('approveAndGenerate: the approval is written and the page map regenerated in one action (4 live location pages, the rest retired)', approved.view.approval && approved.view.approval.approved_by === 'Brandon' && approved.generated.ok && rows.filter(r => r.type === 'location' && r.applies).length === 4 && byKey2('location:/locations/totton') && byKey2('location:/locations/totton').info.tier === 2 && byKey2('location:/locations/lockerley').applies === false, JSON.stringify({ live: rows.filter(r => r.type === 'location' && r.applies).map(r => r.title), add: approved.generated.totals.add, retire: approved.generated.totals.retire }), '4 live: Romsey, Winchester, Eastleigh, Totton');
  chk('the location category rows follow the passed combinations (Romsey 2, Eastleigh 1, Totton 1) and the phases follow the tiers', ['Romsey', 'Eastleigh', 'Totton'].map(t => rows.filter(r => r.type === 'location_category' && r.applies && r.info.town === t).length).join(',') === '2,1,1' && byKey2('location:/locations/romsey').info.phase === 1 && byKey2('location:/locations/eastleigh').info.phase === 2, ['Romsey', 'Eastleigh', 'Totton'].map(t => rows.filter(r => r.type === 'location_category' && r.applies && r.info.town === t).length).join(','), '2,1,1');
  chk('the GBP areas come back with the approval (Tier 1, Tier 2, then area only)', approved.gbp_areas.join(',') === 'Romsey,Winchester,Eastleigh,Totton,Botley', approved.gbp_areas.join(','), 'Romsey,Winchester,Eastleigh,Totton,Botley');
  chk('the retired pages keep a person\'s work', byKey2('location:/locations/lockerley').h1 === 'Gardeners in Lockerley' && byKey2('location:/locations/awbridge').status === 'Copy Generated', '', 'kept');
  // Move a town and approve again: the same action, the page map follows
  await review.move(cid, { place_id: 'p-botley', to: 'tier2', note: 'the client asked' });
  const again = await S6.approveAndGenerate({ review, pageMapStore: store, pool, log: { log() {} } }, cid, { who: 'Brandon' });
  rows = await store.saved(cid);
  chk('approving again after a move regenerates: Botley is a live Tier 2 location page now, nothing else to do', again.generated.ok && byKey2('location:/locations/botley') && byKey2('location:/locations/botley').applies && byKey2('location:/locations/botley').info.tier === 2 && (await A.approvedTiers(pool, cid)).towns.includes('Botley'), JSON.stringify(byKey2('location:/locations/botley') && { a: byKey2('location:/locations/botley').applies, t: byKey2('location:/locations/botley').info.tier }), 'live, Tier 2');

  await pool.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
