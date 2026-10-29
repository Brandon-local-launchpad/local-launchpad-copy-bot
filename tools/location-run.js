'use strict';
// The Location Determiner run for Edens Edge on the committed files, on pg-mem with the real
// places table and the REAL DataForSEO API (credentials from .env). Buys the volumes and the
// SERPs the gate needs, records every response to tests/fixtures/data/edens-edge-locations-recorded.json
// (the fixture replays them), and prints the Stage 4 report.
//   node tools/location-run.js             buy (or replay what is already recorded) and report
//   node tools/location-run.js --replay    never call DataForSEO: the recorded file only
//   node tools/location-run.js --json      the raw result
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const { newDb, DataType } = require('pg-mem');
const P = require(path.join(root, 'locations/places.js'));
const S = require(path.join(root, 'locations/serp.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));
const E = require(path.join(root, 'tests/fixtures/data/edens-edge-locations.js'));

const RECORDED = path.join(root, 'tests/fixtures/data/edens-edge-locations-recorded.json');
const REPLAY = process.argv.includes('--replay');
const SAMPLES = ['gardener romsey', 'gardener totton', 'gardener bitterne'];

function envFromDotenv() {
  const f = path.join(root, '.env');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
}

(async () => {
  const recorded = fs.existsSync(RECORDED) ? JSON.parse(fs.readFileSync(RECORDED, 'utf8')) : { volumes: {}, serps: [], samples: [] };
  const env = { ...envFromDotenv(), ...process.env };
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await P.ensurePlacesTables(pool);
  await P.seedPlaces(pool, { log: null });
  await S.ensureSerpTables(pool);
  await pool.query(`CREATE TABLE keyword_volumes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), keyword TEXT NOT NULL, location_code INTEGER NOT NULL, volume INTEGER, cpc NUMERIC, status TEXT NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), cost NUMERIC)`);
  // The recorded volumes go into the cache first, so only new keywords are bought
  for (const [k, v] of Object.entries(recorded.volumes)) await pool.query(`INSERT INTO keyword_volumes (keyword, location_code, volume, cpc, status, cost) VALUES ($1, 2826, $2, $3, $4, $5)`, [k, v.volume, v.cpc, v.status || (v.volume == null ? 'null' : 'ok'), v.cost == null ? 0.00009 : v.cost]);
  const serpKey = (k, p) => `${k}@${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
  const recordedSerps = new Map([...recorded.serps, ...(recorded.samples || [])].map(s => [serpKey(s.keyword, s), s]));

  // The volume look-up: the h1 cache and DataForSEO, with every bought keyword recorded
  const { createH1Research } = require(path.join(root, 'h1-research/service.js'));
  const bought = { keywords: 0, cost: 0 };
  const searchVolume = async (keywords, opts) => {
    if (REPLAY) throw new Error(`--replay: ${keywords.length} keywords are not recorded`);
    const r = await D.searchVolume(keywords, { ...opts, env });
    bought.keywords += keywords.length; bought.cost += r.cost;
    const per = keywords.length ? r.cost / keywords.length : 0;
    for (const [k, v] of r.results) recorded.volumes[k] = { volume: v.volume, cpc: v.cpc, status: v.status, cost: Math.round(per * 1e7) / 1e7 };
    return r;
  };
  const h1 = createH1Research({ pool, filloutService: {}, pageMapStore: {}, searchVolume, log: console });
  // The SERP: recorded first, else DataForSEO, recorded
  const serpBought = { calls: 0, cost: 0 };
  const fetchSerpImpl = async ({ keyword, lat, lng }) => {
    const hit = recordedSerps.get(serpKey(keyword, { lat, lng }));
    if (hit) return { items: hit.items, cost: 0, check_url: hit.check_url || '', se_results_count: hit.se_results_count || null };
    if (REPLAY) throw new Error(`--replay: SERP "${keyword}" is not recorded`);
    const got = await S.fetchSerp({ keyword, lat, lng }, { env });
    serpBought.calls++; serpBought.cost += got.cost;
    const row = { keyword, lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4, items: got.items, check_url: got.check_url, se_results_count: got.se_results_count, cost: got.cost, fetched_at: new Date().toISOString() };
    recorded.serps.push(row); recordedSerps.set(serpKey(keyword, { lat, lng }), row);
    return got;
  };
  const serp = S.createSerpStore(pool, { fetchSerpImpl });
  const save = () => fs.writeFileSync(RECORDED, JSON.stringify({ _note: 'Real DataForSEO responses for the Edens Edge Location Determiner run (volumes: Google Ads search volume, UK; serps: Google organic top 10 at the town\'s coordinates). Recorded by tools/location-run.js; replayed by tests/fixtures/location-determiner.js.', recorded_at: new Date().toISOString(), ...recorded }, null, 1));

  const svc = createLocationService({ pool, filloutService: null, pageMapStore: null, h1, places: P.createPlacesStore(pool), serp, geocode: async () => null });
  let R;
  try {
    R = await svc.run('edens-edge-fixture', { inputs: E.inputs(), onProgress: t => console.error('  ' + t), persist: false });
  } finally { save(); }
  // The three sample SERPs Brandon asked for (Romsey, Totton, a district), through the same cache
  const samplePoints = Object.fromEntries(R.candidates.filter(c => ['Romsey', 'Totton', 'Bitterne'].includes(c.name)).map(c => [c.name.toLowerCase(), { lat: c.lat, lng: c.lng }]));
  const samples = [];
  for (const kw of SAMPLES) {
    const town = kw.split(' ').slice(1).join(' ');
    const pt = samplePoints[town];
    if (!pt) continue;
    try {
      const s = await serp.lookup(kw, pt);
      const row = recordedSerps.get(serpKey(kw, pt)) || { keyword: kw, lat: pt.lat, lng: pt.lng, items: s.items, check_url: s.check_url };
      if (!recorded.samples.some(x => x.keyword === kw)) recorded.samples.push(row);
      samples.push({ keyword: kw, town, point: pt, items: s.items.filter(i => i.type === 'organic').slice(0, 10), check_url: s.check_url });
    } catch (e) { samples.push({ keyword: kw, town, error: e.message }); }
  }
  save();
  R.samples = samples;
  R.bought = { volume_keywords: bought.keywords, volume_usd: Math.round(bought.cost * 1e4) / 1e4, serp_calls: serpBought.calls, serp_usd: Math.round(serpBought.cost * 1e4) / 1e4 };
  if (process.argv.includes('--json')) { console.log(JSON.stringify(R, null, 2)); return; }

  const L = [];
  const pad = (s, n) => String(s == null ? '' : s).padEnd(n);
  const money = v => `$${Number(v).toFixed(4)}`;
  L.push(`LOCATION DETERMINER RUN: ${R.client.name} (${R.client.niche}), ${R.ran_at}`);
  L.push(`Base ${R.base.name}; travel ${R.travel.miles} mi from ${R.travel.from}; reach ${R.reach_miles} mi; outer ${R.outer_limit_miles} mi; Tier 1 band ${R.tier1_band.join(' to ')}; page town cap ${R.page_town_cap}`);
  L.push(`Bought this run: ${R.bought.volume_keywords} keywords ${money(R.bought.volume_usd)}, ${R.bought.serp_calls} SERPs ${money(R.bought.serp_usd)} (the rest replayed from the recording)`);
  L.push(`Counts: ${R.counts.candidates} candidates (${R.counts.inside_reach} inside reach, ${R.counts.beyond_reach_typed} beyond reach typed by the client, ${R.counts.districts_of_base} districts), ${R.counts.area_only} area only before scoring, ${R.counts.excluded} excluded (${R.counts.across_water} across water)`);
  L.push('');
  const townLine = t => pad(t.name + (t.qualifier ? ` (${t.qualifier})` : ''), 26) + pad(t.type, 9) + pad(t.population == null ? '' : t.population.toLocaleString('en-GB'), 9) + pad(t.miles, 6) + pad(t.total_volume, 7) + pad(t.score, 9) + pad(t.gate ? `${t.gate.by || 'fail'} (v ${t.gate.volume == null ? '?' : t.gate.volume}${t.gate.competitors == null ? '' : `, c ${t.gate.competitors}`})` : '', 24) + (t.why || t.reason || '');
  const head = pad('TOWN', 26) + pad('type', 9) + pad('pop', 9) + pad('mi', 6) + pad('vol', 7) + pad('score', 9) + pad('gate', 24) + 'why';
  L.push(`TIER 1 (phase 1 location pages, ${R.tiers.tier1.length}; top score ${R.tiers.top_score})`); L.push(head);
  for (const t of R.tiers.tier1) L.push(townLine(t));
  L.push(''); L.push(`TIER 2 (phase 2 location pages, ${R.tiers.tier2.length})`); L.push(head);
  for (const t of R.tiers.tier2) L.push(townLine(t));
  L.push(''); L.push(`AREA ONLY (${R.tiers.area_only.length}: service areas text and GBP, no page)`); L.push(head);
  for (const t of R.tiers.area_only) L.push(townLine(t));
  L.push(''); L.push(`EXCLUDED AFTER SCORING (${R.tiers.excluded.length}: districts of the base town with no volume)`);
  L.push('  ' + R.tiers.excluded.map(t => `${t.name} (v ${t.gate.volume == null ? '?' : t.gate.volume})`).join(', '));
  L.push(''); L.push(`GBP SERVICE AREAS (${R.gbp_areas.length} of ${20}): ${R.gbp_areas.map(a => `${a.name} [${a.from}]`).join(', ')}`);
  L.push('');
  L.push(`LOCATION CATEGORY PAGES THAT PASS (${R.location_categories.length}; ${R.no_demand.length} combinations with no demand)`);
  const byTown = new Map();
  for (const c of R.location_categories) { if (!byTown.has(c.town)) byTown.set(c.town, []); byTown.get(c.town).push(c); }
  for (const [town, list] of byTown) L.push(`  ${pad(town, 22)} phase ${list[0].phase}: ${list.map(c => `${c.category}${c.primary ? '*' : ''} (${c.by === 'volume' ? `v ${c.volume}` : `c ${c.competitors}`})`).join(', ')}`);
  L.push('  * the primary category, on the location page\'s demand (hub rule)');
  L.push(`  No demand: ${R.no_demand.map(c => `${c.category} ${c.town} (v ${c.volume == null ? '?' : c.volume}${c.competitors == null ? '' : `, c ${c.competitors}`})`).join('; ')}`);
  L.push('');
  L.push(`PAGES: before ${R.before.location} location (${R.before.location_phase2} phase 2) and ${R.before.location_category} location category; after ${R.after.location} location (${R.after.location_phase2} phase 2) and ${R.after.location_category} location category (${R.after.location_category_phase2} phase 2)`);
  L.push(`COSTS (this run, incl. cache hits at 0): volume ${money(R.costs.volume_usd)} for ${R.costs.keywords_fetched} fetched; SERP ${money(R.costs.serp_usd)} for ${R.costs.serp_calls} calls (${R.costs.serp_from_cache} from cache)`);
  L.push('');
  L.push('SERP SAMPLES (top 10 organic at the town\'s coordinates)');
  for (const s of R.samples) {
    L.push(`  "${s.keyword}" at ${s.point ? `${s.point.lat.toFixed(4)}, ${s.point.lng.toFixed(4)}` : '?'}${s.check_url ? `  ${s.check_url}` : ''}${s.error ? `  ERROR ${s.error}` : ''}`);
    for (const i of s.items || []) L.push(`    ${pad(i.rank_group, 3)} ${pad(i.domain, 32)} ${String(i.title || '').slice(0, 60)}  ${i.url}`);
  }
  console.log(L.join('\n'));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
