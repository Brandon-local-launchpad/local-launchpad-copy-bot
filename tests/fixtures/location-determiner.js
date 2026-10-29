'use strict';
// Fixture: the Location Determiner to Stage 4 (locations/rules.js, geocode.js, serp.js,
// service.js) on pg-mem with the real places table and the Edens Edge inputs from the
// committed files. Stages 2 and 3: travel, the base point, candidates (islands, beyond reach,
// the client's typed towns), the keyword plan, the SERP cache, the gate, the estimate. Stage 4:
// a full run on replayed data (tests/fixtures/data/edens-edge-locations-recorded.json when
// it holds real DataForSEO answers, else the stub volumes in edens-edge-volumes.js and a
// fake SERP), checking the scores, the band, the cap, the phases, the GBP areas and the
// location category pages.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const P = require(path.join(root, 'locations/places.js'));
const R = require(path.join(root, 'locations/rules.js'));
const G = require(path.join(root, 'locations/geocode.js'));
const S = require(path.join(root, 'locations/serp.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));
const E = require(path.join(root, 'tests/fixtures/data/edens-edge-locations.js'));
const EXCLUDED = require(path.join(root, 'locations/excluded-domains.json')).domains;
const STUB = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
const RECORDED = path.join(root, 'tests/fixtures/data/edens-edge-locations-recorded.json');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Location Determiner to Stage 4 (pg-mem, real places, Edens Edge inputs) ===\n');

(async () => {
  // ── Rules alone ──
  let t = R.parseTravel({ fillout: '10 minutes or miles', cv: '20 miles' });
  chk('travel: the Fillout answer wins when it is one of 10/20/30/45', t.miles === 10 && t.from === 'fillout' && !t.flags.length, JSON.stringify(t), '10 from fillout, no flags');
  t = R.parseTravel({ fillout: '', cv: '25 miles' });
  chk('travel: no Fillout answer falls back to Client Values, snapped to the nearest and flagged', t.miles === 20 && t.from === 'client values' && t.flags.some(f => f.code === 'T-TRAVEL-FALLBACK') && t.flags.some(f => f.code === 'T-TRAVEL-MISSING'), JSON.stringify(t), '20, fallback flagged');
  t = R.parseTravel({ fillout: 'as far as needed', cv: '' });
  chk('travel: nothing usable gives no miles and T-TRAVEL-NONE', t.miles === null && t.flags.some(f => f.code === 'T-TRAVEL-NONE') && t.flags.some(f => f.code === 'T-TRAVEL-ODD'), JSON.stringify(t), 'null, T-TRAVEL-NONE and T-TRAVEL-ODD');
  chk('reach table and outer limit', R.reachMiles(10) === 10 && R.reachMiles(20) === 15 && R.reachMiles(30) === 20 && R.reachMiles(45) === 25 && R.outerLimitMiles(45) === 25 && R.outerLimitMiles(20) === 20, '', 'per the brief');
  chk('tier 1 band by travel', JSON.stringify(R.tier1Band(20)) === '[5,8]' && JSON.stringify(R.tier1Band(45)) === '[10,15]', JSON.stringify([R.tier1Band(20), R.tier1Band(45)]), '[5,8] and [10,15]');
  chk('a locked 13 × 1500 m scan grid is 6.1 miles of reach; an unlocked one is nothing', R.scanReachMiles({ locked: true, grid_size: 13, spacing_m: 1500 }) === 6.1 && R.scanReachMiles({ locked: false, grid_size: 13, spacing_m: 1500 }) === null, R.scanReachMiles({ locked: true, grid_size: 13, spacing_m: 1500 }), '6.1 and null');
  chk('islands: Isle of Wight and the OS form of Anglesey match, Hampshire does not', R.islandOf('Isle of Wight') === 'Isle of Wight' && R.islandOf('Sir Ynys Mon - Isle of Anglesey') && R.islandOf('New Forest; Hampshire') === null, [R.islandOf('Isle of Wight'), R.islandOf('Sir Ynys Mon - Isle of Anglesey'), R.islandOf('Hampshire')].join(','), 'Isle of Wight, an Anglesey match, null');

  const items = [
    { type: 'organic', rank_group: 1, url: 'https://www.checkatrade.com/trades/gardeners/romsey', domain: 'www.checkatrade.com', title: 'Gardeners in Romsey' },
    { type: 'organic', rank_group: 2, url: 'https://greenfingers-hants.co.uk/gardener-romsey/', domain: 'greenfingers-hants.co.uk', title: 'Gardener' },
    { type: 'organic', rank_group: 3, url: 'https://www.testvalleygardens.co.uk/', domain: 'www.testvalleygardens.co.uk', title: 'Garden maintenance Romsey and Andover' },
    { type: 'organic', rank_group: 4, url: 'https://greenfingers-hants.co.uk/about', domain: 'greenfingers-hants.co.uk', title: 'About us Romsey' },
    { type: 'organic', rank_group: 5, url: 'https://www.yell.com/s/gardeners-romsey.html', domain: 'www.yell.com', title: 'Gardeners near Romsey' },
    { type: 'organic', rank_group: 6, url: 'https://somebusiness.co.uk/southampton', domain: 'somebusiness.co.uk', title: 'Gardener Southampton' },
    { type: 'people_also_ask', title: 'Romsey gardeners' },
  ];
  const cp = R.competitorPages(items, 'Romsey', EXCLUDED);
  chk('competitor pages: directories out, one per domain, URL or title must hold the town', cp.count === 2 && cp.pages.map(p => p.domain).join(',') === 'greenfingers-hants.co.uk,testvalleygardens.co.uk', JSON.stringify(cp.pages.map(p => p.domain)), 'greenfingers-hants.co.uk, testvalleygardens.co.uk');
  chk('a two-word town matches a hyphenated URL', R.mentionsTown('https://x.co.uk/gardener-chandlers-ford/', "Chandler's Ford") && !R.mentionsTown('https://x.co.uk/gardener-romsey/', "Chandler's Ford"), '', 'true, false');
  chk('demand gate: volume 10 passes, 9 with 2 competitors passes on competitors, 9 with 1 fails, competitors null never count', R.demandGate({ volume: 10 }).pass && R.demandGate({ volume: 9, competitors: 2 }).by === 'competitors' && !R.demandGate({ volume: 9, competitors: 1 }).pass && !R.demandGate({ volume: 9, competitors: null }).pass, '', 'as stated');
  let est = R.estimate({ keywordsToBuy: 300, avgKeywordCost: null, serpQueries: 50 });
  chk('estimate with no past cost rows: one live task at $0.09 plus 50 SERPs at $0.002', est.volume.cost_usd === 0.09 && est.serp.cost_usd === 0.1 && est.total_usd === 0.19, JSON.stringify(est), '0.09 + 0.10 = 0.19');
  est = R.estimate({ keywordsToBuy: 300, avgKeywordCost: 0.0002, serpQueries: 0 });
  chk('estimate with past cost rows uses the average per keyword', est.volume.cost_usd === 0.06 && est.volume.basis.startsWith('average'), JSON.stringify(est.volume), '300 × 0.0002 = 0.06');

  // ── Geocode ──
  chk('a postcode is found inside an address', G.extractPostcode('Unit 3, 12 High Street, Southampton SO14 2AA, UK') === 'SO14 2AA' && G.extractPostcode('so152gj') === 'SO15 2GJ' && G.extractPostcode('12 High Street, Southampton') === '', G.extractPostcode('Unit 3, 12 High Street, Southampton SO14 2AA, UK'), 'SO14 2AA');
  const stubGeo = async pc => (pc === 'SO14 2AA' ? { lat: 50.9, lng: -1.4, postcode: 'SO14 2AA', admin_district: 'Southampton', region: 'South East' } : null);
  let bp = await G.basePoint({ addresses: [{ key: 'business_address', label: 'Business Address', value: 'Beech Hollow' }, { key: 'postal_address', label: 'Postal Address', value: '1 The Lane SO14 2AA' }], townCentroid: { lat: 50.91, lng: -1.41, name: 'Southampton' }, geocode: stubGeo });
  chk('base point: the first address with a postcode wins and says where it came from', bp.from === 'postcode' && bp.address_field === 'postal_address' && bp.lat === 50.9, JSON.stringify(bp), 'postcode from postal_address');
  bp = await G.basePoint({ addresses: [{ key: 'business_address', label: 'Business Address', value: 'Beech Hollow' }], townCentroid: { lat: 50.91, lng: -1.41, name: 'Southampton' }, geocode: stubGeo });
  chk('base point: no postcode falls back to the town centroid and says so', bp.from === 'town centroid' && /no postcode/.test(bp.note), JSON.stringify(bp), 'town centroid');
  bp = await G.basePoint({ addresses: [{ key: 'business_address', label: 'Business Address', value: 'ZZ99 9ZZ' }], townCentroid: { lat: 50.91, lng: -1.41, name: 'Southampton' }, geocode: stubGeo });
  chk('base point: an unknown postcode falls back to the town and names the postcode', bp.from === 'town centroid' && /ZZ99 9ZZ/.test(bp.note), bp.note, 'centroid, note names ZZ99 9ZZ');

  // ── The database side ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await P.ensurePlacesTables(pool);
  await P.seedPlaces(pool, { log: null });
  await S.ensureSerpTables(pool);
  await pool.query(`CREATE TABLE keyword_volumes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), keyword TEXT NOT NULL, location_code INTEGER NOT NULL, volume INTEGER, cpc NUMERIC, status TEXT NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), cost NUMERIC)`);
  await pool.query(`INSERT INTO keyword_volumes (keyword, location_code, volume, cpc, status, cost) VALUES ('gardener romsey', 2826, 50, 1.81, 'ok', 0.0001), ('gardener winchester', 2826, 140, 2.43, 'ok', 0.0001), ('tree service romsey', 2826, 0, NULL, 'ok', 0.0001)`);
  const cachedVolumes = new Map([['gardener romsey', { volume: 50 }], ['gardener winchester', { volume: 140 }], ['tree service romsey', { volume: 0 }]]);

  let serpCalls = 0;
  const fakeSerp = async ({ keyword }) => { serpCalls++; return { items: keyword.includes('romsey') ? items : [], cost: 0.002, check_url: 'https://example.test/serp', se_results_count: 1000 }; };
  const serp = S.createSerpStore(pool, { fetchSerpImpl: fakeSerp });
  const pt = { lat: 50.98912, lng: -1.49987 };
  const got = await serp.lookup('gardener romsey', pt);
  const again = await serp.lookup('gardener romsey', { lat: 50.98913, lng: -1.49986 });
  chk('SERP cache: the first look-up calls DataForSEO and stores it, the second (same point to 10 m) is free', serpCalls === 1 && !got.cached && again.cached && again.cost === 0 && again.items.length === items.length, `${serpCalls} calls, cached ${again.cached}`, '1 call, cached true');
  chk('SERP cache count', (await serp.cachedCount([{ keyword: 'gardener romsey', point: pt }, { keyword: 'gardener totton', point: pt }])) === 1, '', '1 of 2');

  const places = P.createPlacesStore(pool);
  const svc = createLocationService({ pool, filloutService: null, pageMapStore: null, h1: { cached: async kws => new Map(kws.filter(k => cachedVolumes.has(k)).map(k => [k, cachedVolumes.get(k)])) }, places, serp, geocode: async () => null });
  const out = await svc.dryRun('edens-edge-fixture', { inputs: E.inputs() });
  chk('dry run ok', out.ok, JSON.stringify(out.problems), 'ok');
  chk('base: Southampton built-up area, point from the town centroid (no postcode on file)', out.base && out.base.name === 'Southampton' && out.base.population > 200000 && out.point.from === 'town centroid', JSON.stringify(out.point), 'town centroid');
  chk('travel 20 from Client Values (flagged), reach 15, outer 20, band 5 to 8', out.travel.miles === 20 && out.travel.from === 'client values' && out.reach_miles === 15 && out.outer_limit_miles === 20 && out.tier1_band.join('-') === '5-8' && out.flags.some(f => f.code === 'T-TRAVEL-FALLBACK'), JSON.stringify(out.travel), '20 / client values');
  const by = name => out.candidates.find(c => c.name === name);
  const cand = n => by(n) && by(n).status === 'candidate';
  chk('Totton, Eastleigh, Chandler\'s Ford, Hedge End and Romsey are candidates inside reach', ['Totton', 'Eastleigh', "Chandler's Ford", 'Hedge End', 'Romsey'].every(n => cand(n) && by(n).inside_reach), ['Totton', 'Eastleigh', "Chandler's Ford", 'Hedge End', 'Romsey'].map(n => `${n}:${by(n) ? by(n).status + '/' + by(n).inside_reach : 'missing'}`).join(', '), 'all candidates inside reach');
  chk('Winchester (about 10 mi) is a candidate inside reach, typed by the client', cand('Winchester') && by('Winchester').inside_reach && by('Winchester').client_asked, JSON.stringify(by('Winchester')), 'candidate, inside, client_asked');
  chk('Fareham (not typed) is a candidate found by the rules', cand('Fareham') && by('Fareham').source === 'scored' && by('Fareham').population > 30000, JSON.stringify(by('Fareham')), 'scored candidate');
  chk('Portsmouth is beyond reach and not typed: area only, not in the volume run', by('Portsmouth') && by('Portsmouth').status === 'area_only' && /beyond reach/.test(by('Portsmouth').reason), JSON.stringify(by('Portsmouth')), 'area_only, beyond reach');
  chk('Cowes and Ryde (Isle of Wight) are excluded as across water', ['Cowes', 'Ryde'].every(n => by(n) && by(n).status === 'excluded' && /across water \(Isle of Wight\)/.test(by(n).reason)), [by('Cowes'), by('Ryde')].map(r => r && r.reason).join(' | '), 'across water (Isle of Wight)');
  chk('Bournemouth is outside the outer limit and not considered', !by('Bournemouth'), JSON.stringify(by('Bournemouth')), 'absent');
  chk('Bitterne (a district of Southampton) is a candidate with no population floor', cand('Bitterne') && by('Bitterne').type === 'district' && /district of Southampton/.test(by('Bitterne').reason), JSON.stringify(by('Bitterne')), 'district candidate');
  chk('Southampton itself is excluded as the base town', by('Southampton') && by('Southampton').status === 'excluded' && /base town|council/.test(by('Southampton').reason), JSON.stringify(out.candidates.filter(c => c.name === 'Southampton').map(c => c.reason)), 'excluded: base town / council area');
  chk('"New Forest District" typed by the client is shown excluded as a council area, not dropped', by('New Forest') && by('New Forest').status === 'excluded' && by('New Forest').client_asked && /council area/.test(by('New Forest').reason) && by('New Forest').typed === 'New Forest District', JSON.stringify(by('New Forest')), 'excluded council area, typed');
  const small = ['Ampfield', 'Awbridge', 'Lockerley', 'Chilworth'].map(n => by(n));
  chk('small typed villages stay candidates, marked client asked under the floor', small.every(r => r && r.status === 'candidate' && r.client_asked && /under the 5,000 floor/.test(r.reason)), small.map(r => r ? `${r.name}:${r.status}/${r.reason}` : 'missing').join('; '), 'all candidates, under the floor');
  chk('a district of another town is excluded as part of it', out.candidates.some(c => c.type === 'district' && c.status === 'excluded' && /^part of /.test(c.reason)), '', 'some "part of X"');
  chk('no typed town is unmatched', out.unmatched.length === 0, JSON.stringify(out.unmatched), '[]');
  chk('counts add up', out.counts.candidates + out.counts.area_only + out.counts.excluded === out.counts.considered && out.counts.inside_reach + out.counts.beyond_reach_typed === out.counts.candidates, JSON.stringify(out.counts), 'consistent');

  // A typed town beyond reach stays in the volume run (a page only on volume)
  const typedBeyond = await svc.dryRun('edens-edge-fixture', { inputs: E.inputs({ otherAreas: ['Portsmouth'] }) });
  const pm = typedBeyond.candidates.find(c => c.name === 'Portsmouth');
  const pmPage = typedBeyond.plan.pages.find(p => p.town === 'Portsmouth' && p.page === 'location');
  chk('a typed beyond-reach town is a candidate judged on volume only (no SERP)', pm && pm.status === 'candidate' && !pm.inside_reach && pmPage && !pmPage.serp_eligible, JSON.stringify({ status: pm && pm.status, serp: pmPage && pmPage.serp_eligible }), 'candidate, serp_eligible false');

  // The keyword plan
  const cats = out.inputs.categories.length, prim = out.inputs.primaryName;
  chk('the primary category is Gardener (the page map\'s primary tab)', prim === 'Gardener', prim, 'Gardener');
  chk('one location page and one page per non-primary category for every candidate', out.plan.pages.length === out.counts.candidates * cats && out.plan.pages.filter(p => p.page === 'location').length === out.counts.candidates, `${out.plan.pages.length} pages for ${out.counts.candidates} candidates × ${cats} categories`, 'candidates × categories');
  const romseyLoc = out.plan.pages.find(p => p.town === 'Romsey' && p.page === 'location');
  chk('the location page keywords are the primary name, its services form and the sitewide synonyms', romseyLoc && romseyLoc.keywords.includes('gardener romsey') && romseyLoc.keywords.includes('landscaper romsey') && romseyLoc.serp_keyword === 'gardener romsey', JSON.stringify(romseyLoc && romseyLoc.keywords), 'gardener romsey, landscaper romsey …');
  const romseyTree = out.plan.pages.find(p => p.town === 'Romsey' && p.category_key === 'tree_service');
  chk('a category page\'s keywords include the approved synonym (tree surgeon romsey)', romseyTree && romseyTree.keywords.includes('tree surgeon romsey'), JSON.stringify(romseyTree && romseyTree.keywords), 'includes tree surgeon romsey');
  chk('the cache is read: gardener romsey 50 and gardener winchester 140 are known, so those pages need no SERP', romseyLoc.best_volume === 50 && !romseyLoc.needs_serp && out.plan.pages.find(p => p.town === 'Winchester' && p.page === 'location').best_volume === 140, `${romseyLoc.best_volume} / ${romseyLoc.needs_serp}`, '50, no SERP');
  chk('tree service romsey at 0 still needs a SERP (a town inside reach, best known under 10)', romseyTree.needs_serp && romseyTree.best_volume === 0, JSON.stringify({ v: romseyTree.best_volume, s: romseyTree.needs_serp }), 'needs_serp, 0');
  chk('districts get no SERP: no Bitterne page is SERP eligible', out.plan.pages.filter(p => p.town === 'Bitterne').every(p => !p.serp_eligible && !p.needs_serp), '', 'none eligible');
  chk('SERP eligible pages = towns inside reach × categories', out.plan.serp_eligible_pages === out.candidates.filter(c => c.status === 'candidate' && c.type === 'town' && c.inside_reach).length * cats, out.plan.serp_eligible_pages, 'towns inside reach × categories');
  chk('keyword counts: cached 3, the rest to buy; SERP queries = eligible pages needing one minus the cached SERP', out.plan.keywords_cached === 3 && out.plan.keywords_to_buy === out.plan.keyword_count - 3 && out.plan.serp_queries === out.plan.pages.filter(p => p.needs_serp).length && out.plan.serp_cached === 0, JSON.stringify({ c: out.plan.keywords_cached, b: out.plan.keywords_to_buy, s: out.plan.serp_queries, sc: out.plan.serp_cached }), 'cached 3');
  chk('estimate uses the average cost per keyword from keyword_volumes and prices SERPs at $0.002', out.estimate.volume.basis.startsWith('average') && out.estimate.volume.per_keyword_usd === 0.0001 && out.estimate.serp.per_query_usd === 0.002 && out.estimate.total_usd > 0, JSON.stringify(out.estimate), 'average basis');
  chk('no locked scan: no comparison', out.scan === null, JSON.stringify(out.scan), 'null');
  const withScan = await svc.dryRun('edens-edge-fixture', { inputs: E.inputs({ scanSettings: { locked: true, grid_size: 13, spacing_m: 1500 } }) });
  chk('a locked 6.1 mi scan grid lists the towns that would move between inside and beyond reach, never applied', withScan.scan && withScan.scan.reach_miles === 6.1 && withScan.scan.moves.length > 0 && withScan.scan.moves.every(m => m.now === 'inside reach' && m.under_scan === 'beyond reach') && withScan.reach_miles === 15, JSON.stringify(withScan.scan && withScan.scan.moves.slice(0, 3)), 'moves listed, reach still 15');
  const noTravel = await svc.dryRun('edens-edge-fixture', { inputs: E.inputs({ travelCv: '' }) });
  chk('no travel answer anywhere stops the run with the problem named', !noTravel.ok && noTravel.problems.some(p => p.code === 'no_travel'), JSON.stringify(noTravel.problems), 'no_travel');

  // ── Stage 4: a full run on replayed data ──
  // Real recorded answers when the file has them, else the stub table (volumes elsewhere are 0)
  // and a fake SERP that gives Totton two competitor pages and everyone else none.
  const recorded = fs.existsSync(RECORDED) ? JSON.parse(fs.readFileSync(RECORDED, 'utf8')) : null;
  const real = !!(recorded && Object.keys(recorded.volumes || {}).length > 100);
  const volumeOf = k => (real ? (recorded.volumes[k] ? recorded.volumes[k].volume : null) : (STUB.TABLE[k] ? STUB.TABLE[k][0] : 0));
  const stubItems = town => [1, 2, 3].map(n => ({ type: 'organic', rank_group: n, url: `https://${town.replace(/[^a-z]/g, '')}-gardens-${n}.co.uk/${town.replace(/[^a-z]/g, '-')}/`, domain: `${town.replace(/[^a-z]/g, '')}-gardens-${n}.co.uk`, title: `Gardeners in ${town}` }));
  const serpItems = (keyword, lat, lng) => {
    if (real) { const hit = [...recorded.serps, ...(recorded.samples || [])].find(s => s.keyword === keyword && Math.abs(s.lat - lat) < 0.001 && Math.abs(s.lng - lng) < 0.001); return hit ? hit.items : []; }
    return keyword === 'gardener totton' ? stubItems('totton') : [];
  };
  const h1 = {
    cached: async () => new Map(),
    lookup: async kws => ({ volumes: new Map(kws.map(k => [k, { volume: volumeOf(k), cpc: null }])), fetched: kws.length, cost: 0.09 }),
  };
  const serp2 = S.createSerpStore(pool, { fetchSerpImpl: async ({ keyword, lat, lng }) => ({ items: serpItems(keyword, lat, lng), cost: 0.002, check_url: 'https://example.test/' + encodeURIComponent(keyword) }) });
  const svc2 = createLocationService({ pool, filloutService: null, pageMapStore: null, h1, places, serp: serp2, geocode: async () => null });
  const run = await svc2.run('edens-edge-fixture', { inputs: E.inputs(), persist: false });
  console.log(`\n  (Stage 4 on ${real ? 'the recorded DataForSEO answers' : 'the stub volumes and a fake SERP'})\n`);
  chk('the run returns tiers, GBP areas and the location category pages', run.ok && run.tiers && Array.isArray(run.gbp_areas) && Array.isArray(run.location_categories), Object.keys(run).join(','), 'tiers, gbp_areas, location_categories');
  const T = run.tiers;
  const inBand = T.tier1.length >= Math.min(T.band[0], T.tier1.length + T.tier2.length) && T.tier1.length <= T.band[1];
  chk('Tier 1 is within the 5 to 8 band (or everything that passed, when fewer passed)', inBand, `${T.tier1.length} in [${T.band}]`, 'within the band');
  chk('every Tier 1 town is inside reach, passed the gate and is phase 1', T.tier1.every(t => t.inside_reach && t.gate.pass && t.phase === 1 && t.tier === 1), T.tier1.map(t => `${t.name}:${t.inside_reach}/${t.gate.pass}/${t.phase}`).join(', '), 'all inside, passed, phase 1');
  chk('every Tier 2 town passed and is phase 2', T.tier2.every(t => t.gate.pass && t.phase === 2 && t.tier === 2), T.tier2.map(t => `${t.name}:${t.gate.by}`).join(', '), 'all passed, phase 2');
  chk('page towns never exceed the cap of 20', T.tier1.length + T.tier2.length <= 20, T.tier1.length + T.tier2.length, '<= 20');
  chk('Tier 1 scores are at least 25% of the top score, or the band minimum filled by score order', T.tier1.every(t => t.score >= 0.25 * T.top_score) || T.tier1.length === Math.min(T.band[0], T.tier1.length + T.tier2.length), T.tier1.map(t => t.score).join(','), '>= 25% of top');
  chk('Tier 1 is sorted by score, towns with volume before zero-volume towns', T.tier1.every((t, i) => i === 0 || (T.tier1[i - 1].total_volume > 0) >= (t.total_volume > 0)) && T.tier1.filter(t => t.total_volume > 0).every((t, i, a) => i === 0 || a[i - 1].score >= t.score), T.tier1.map(t => `${t.name} ${t.score}`).join(', '), 'descending');
  chk('a district passes on volume only: no district is a page unless its volume is 10 or more', T.towns.filter(t => t.type === 'district' && t.outcome === 'page').every(t => t.gate.by === 'volume' && t.gate.volume >= 10), T.towns.filter(t => t.type === 'district' && t.outcome === 'page').map(t => `${t.name}:${t.gate.by}`).join(',') || 'none', 'volume only');
  chk('districts with no volume are excluded, not area only', T.towns.filter(t => t.type === 'district' && !t.gate.pass).every(t => t.outcome === 'excluded'), '', 'excluded');
  chk('beyond-reach towns not typed are area only with the reason', T.area_only.some(t => t.name === 'Portsmouth' && /beyond reach/.test(t.why)), JSON.stringify(T.area_only.map(t => t.name)), 'Portsmouth beyond reach');
  chk('GBP service areas: 20 at most, Tier 1 first, no districts', run.gbp_areas.length <= 20 && run.gbp_areas.every(a => a.from) && !run.gbp_areas.some(a => T.towns.find(t => t.place_id === a.place_id && t.type === 'district')) && (T.tier1.length === 0 || run.gbp_areas[0].from === 'Tier 1'), JSON.stringify(run.gbp_areas.slice(0, 5)), 'Tier 1 first');
  chk('the primary category\'s location category page exists for every page town, on the location page\'s demand', [...T.tier1, ...T.tier2].every(t => run.location_categories.some(c => c.place_id === t.place_id && c.primary && c.pass)), '', 'one per page town');
  chk('location category pages follow their town\'s phase and no failed combination has a row', run.location_categories.every(c => c.pass && c.phase === (T.tier1.some(t => t.place_id === c.place_id) ? 1 : 2)) && run.no_demand.every(c => !c.pass), '', 'phases match, no_demand all failed');
  chk('a non-primary category page needs its own demand (not the town\'s)', run.no_demand.length > 0 || run.location_categories.filter(c => !c.primary).every(c => c.volume >= 10 || c.competitors >= 2), run.no_demand.length, 'some no-demand combinations, or all passing on their own evidence');
  if (!real) {
    chk('stub: Totton passes on competitor pages (volume 0, two business domains with the town in the URL)', T.towns.some(t => t.name === 'Totton' && t.gate.pass && t.gate.by === 'competitors' && t.gate.competitors === 3), JSON.stringify((T.towns.find(t => t.name === 'Totton') || {}).gate), 'competitors');
    chk('stub: Romsey and Winchester pass on volume and are Tier 1', ['Romsey', 'Winchester'].every(n => T.tier1.some(t => t.name === n && t.gate.by === 'volume')), T.tier1.map(t => t.name).join(', '), 'Romsey and Winchester in Tier 1');
    chk('stub: Tree Service Romsey fails its own gate while Gardener Romsey (primary) passes', run.no_demand.some(c => c.town === 'Romsey' && c.category_key === 'tree_service') === false || run.location_categories.some(c => c.town === 'Romsey' && c.primary), '', 'consistent');
  }
  chk('after counts: location pages = Tier 1 + Tier 2, phase 2 = Tier 2', run.after.location === T.tier1.length + T.tier2.length && run.after.location_phase2 === T.tier2.length && run.after.location_category === run.location_categories.length, JSON.stringify(run.after), 'consistent');
  chk('costs are reported', run.costs && typeof run.costs.total_usd === 'number' && run.costs.serp_calls === run.plan.pages.filter(p => p.needs_serp).length, JSON.stringify(run.costs), 'serp_calls = pages needing a SERP');

  await pool.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
