'use strict';
// The Location Determiner run with the REAL DataForSEO API (credentials from .env). Buys the
// volumes and the SERPs the gate needs, records every response to
// tests/fixtures/data/edens-edge-locations-recorded.json (the fixture replays them), and prints
// the Stage 4 report.
//   node tools/location-run.js                      the committed Edens Edge files on pg-mem (writes nothing)
//   node tools/location-run.js --live "<client>"    a live client (DATABASE_URL): its Fillout record, page
//                                                   map, volume cache and SERP cache; the dry run is printed
//                                                   first and the run goes ahead only when the estimate is
//                                                   under --max-usd (default 2); the result is saved as the
//                                                   client's locations_run asset and nothing else is written
//   --dry        stop after the dry run
//   --replay     never call DataForSEO: the recorded file only
//   --json       the raw result
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const P = require(path.join(root, 'locations/places.js'));
const S = require(path.join(root, 'locations/serp.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));
const { createH1Research } = require(path.join(root, 'h1-research/service.js'));

const RECORDED = path.join(root, 'tests/fixtures/data/edens-edge-locations-recorded.json');
const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : dflt; };
const REPLAY = flag('--replay'), DRY = flag('--dry'), JSON_OUT = flag('--json');
const LIVE = opt('--live', null);
const MAX_USD = Number(opt('--max-usd', 2));
const SAMPLES = ['gardener romsey', 'gardener totton', 'gardener bitterne'];

function envFromDotenv() {
  const f = path.join(root, '.env');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
}
const pad = (s, n) => String(s == null ? '' : s).padEnd(n);
const money = v => `$${Number(v).toFixed(4)}`;
const num = v => v == null ? '' : Number(v).toLocaleString('en-GB');

// ── The two set-ups: pg-mem on the committed files, or the live database ──
async function memSetup(recorded) {
  const { newDb, DataType } = require('pg-mem');
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
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-locations.js'));
  return { pool, clientId: 'edens-edge-fixture', inputs: E.inputs(), filloutService: null, pageMapStore: null, geocode: async () => null, persist: false, label: 'the committed Edens Edge files on pg-mem' };
}

async function liveSetup(env, who) {
  if (!env.DATABASE_URL) throw new Error('--live needs DATABASE_URL in .env');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(`SELECT id, name FROM clients WHERE id::text = $1 OR lower(name) = lower($1) OR name ILIKE $2 ORDER BY (lower(name) = lower($1)) DESC, name`, [who, `%${who}%`]);
  if (!rows.length) throw new Error(`No live client matches "${who}"`);
  if (rows.length > 1 && rows[0].name.toLowerCase() !== who.toLowerCase()) throw new Error(`"${who}" matches ${rows.length} clients: ${rows.map(r => r.name).join(', ')}. Give the id or the full name.`);
  const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
  const { createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
  const { createPageMapStore } = require(path.join(root, 'page-map/store.js'));
  const filloutService = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: console });
  const pageMapStore = createPageMapStore({ pool, filloutService });
  await P.ensurePlacesTables(pool);
  const seeded = await P.seedPlaces(pool);
  if (!seeded.seeded) console.error(`  [places] ${seeded.reason} (${seeded.rows} rows)`);
  await S.ensureSerpTables(pool);
  return { pool, clientId: rows[0].id, inputs: null, filloutService, pageMapStore, geocode: undefined, persist: true, label: `live client "${rows[0].name}" (${rows[0].id})` };
}

function dryReport(R) {
  const L = [];
  L.push(`DRY RUN: ${R.client.name} (${R.client.niche || 'no niche'})`);
  if (!R.ok) { L.push('Cannot run:'); for (const p of R.problems) L.push(`  - ${p.msg}`); for (const f of R.flags) L.push(`  flag ${f.code}: ${f.msg}`); return L.join('\n'); }
  L.push(`Base: ${R.base.name} (population ${num(R.base.population)}, ${R.base.lad_name}); point from ${R.point.from}: ${R.point.note}`);
  L.push(`Travel: ${R.travel.miles} miles from ${R.travel.from} ("${R.travel.raw}") → reach ${R.reach_miles} mi, outer limit ${R.outer_limit_miles} mi, Tier 1 band ${R.tier1_band.join(' to ')}, page town cap ${R.page_town_cap}`);
  for (const f of R.flags) L.push(`  flag ${f.code}: ${f.msg}`);
  L.push(`Categories (${R.inputs.categories.length}): ${R.inputs.categories.map(c => c.name + (c.primary ? ' (primary)' : '')).join(', ')}`);
  L.push(`Client typed (${R.inputs.otherAreas.length}): ${R.inputs.otherAreas.join(', ') || 'none'}`);
  const c = R.counts;
  L.push(`Considered ${c.considered} places within ${R.outer_limit_miles} mi: ${c.candidates} candidates in the volume run (${c.inside_reach} inside reach, ${c.beyond_reach_typed} beyond reach but typed, ${c.districts_of_base} districts of ${R.base.name}), ${c.area_only} area only (beyond reach, not typed), ${c.excluded} excluded (${c.across_water} across water). Typed: ${c.client_asked} matched (${c.client_asked_excluded} excluded), ${c.unmatched} unmatched.`);
  const towns = R.candidates.filter(x => x.status === 'candidate' && x.type === 'town');
  L.push(`Candidate towns (${towns.length}): ${towns.map(t => `${t.name}${t.qualifier ? ` (${t.qualifier})` : ''} ${t.miles}mi${t.inside_reach ? '' : ' beyond'}${t.client_asked ? ' typed' : ''}${t.ambiguous ? ` [${t.namesakes} namesake${t.namesakes === 1 ? '' : 's'}]` : ''}`).join(', ')}`);
  const shared = R.candidates.filter(x => /^name shared elsewhere/.test(x.reason) && x.status === 'excluded');
  L.push(`Districts excluded for a shared name (${shared.length}): ${shared.map(t => `${t.name} (${t.namesakes})`).join(', ') || 'none'}`);
  const ao = R.candidates.filter(x => x.status === 'area_only');
  L.push(`Area only (${ao.length}): ${ao.map(t => `${t.name} ${t.miles}mi`).join(', ')}`);
  const exTyped = R.candidates.filter(x => x.status === 'excluded' && x.client_asked);
  if (exTyped.length) L.push(`Typed but excluded (${exTyped.length}): ${exTyped.map(t => `${t.name}: ${t.reason}`).join('; ')}`);
  if (R.unmatched.length) L.push(`Unmatched: ${R.unmatched.map(u => `"${u.typed}" (${u.note})`).join('; ')}`);
  L.push(`Pages if every combination passes: ${c.pages_if_all_pass.location} location, ${c.pages_if_all_pass.location_category} location category (today ${R.before.location} location, ${R.before.location_phase2} phase 2; ${R.before.location_category} location category)`);
  L.push(`Keywords: ${R.plan.keyword_count} unique (${R.plan.keywords_cached} cached, ${R.plan.keywords_to_buy} to buy); SERP queries: up to ${R.plan.serp_queries} (${R.plan.serp_cached} cached) of ${R.plan.serp_eligible_pages} eligible combinations`);
  L.push(`ESTIMATE: volume ${money(R.estimate.volume.cost_usd)} (${R.estimate.volume.tasks} task${R.estimate.volume.tasks === 1 ? '' : 's'}; ${R.estimate.volume.basis}); SERP up to ${money(R.estimate.serp.cost_usd)} (${R.estimate.serp.queries} × $${R.estimate.serp.per_query_usd}); total up to ${money(R.estimate.total_usd)}`);
  if (R.scan) L.push(`Scan comparison: the locked grid (${R.scan.reach_miles} mi) would move ${R.scan.moves.length} towns: ${R.scan.moves.map(m => `${m.town} ${m.miles}mi ${m.now} → ${m.under_scan}`).join('; ')}`);
  return L.join('\n');
}

function runReport(R) {
  const L = [];
  L.push(`LOCATION DETERMINER RUN: ${R.client.name} (${R.client.niche}), ${R.ran_at}`);
  L.push(`Base ${R.base.name}; point from ${R.point.from}; travel ${R.travel.miles} mi from ${R.travel.from}; reach ${R.reach_miles} mi; outer ${R.outer_limit_miles} mi; Tier 1 band ${R.tier1_band.join(' to ')}; page town cap ${R.page_town_cap}`);
  L.push(`Bought this run: ${R.bought.volume_keywords} keywords ${money(R.bought.volume_usd)}, ${R.bought.serp_calls} SERPs ${money(R.bought.serp_usd)} (the rest from the caches or the recording)`);
  L.push(`Counts: ${R.counts.candidates} candidates (${R.counts.inside_reach} inside reach, ${R.counts.beyond_reach_typed} beyond reach typed by the client, ${R.counts.districts_of_base} districts), ${R.counts.area_only} area only before scoring, ${R.counts.excluded} excluded (${R.counts.across_water} across water)`);
  L.push('');
  const gateText = t => t.gate ? `${t.gate.by || 'fail'} (v ${t.gate.volume == null ? '?' : t.gate.volume}${t.gate.competitors == null ? '' : `, c ${t.gate.competitors}`})` : '';
  const townLine = t => pad(t.name + (t.qualifier ? ` (${t.qualifier})` : ''), 26) + pad(t.type, 9) + pad(num(t.population), 9) + pad(t.miles, 6) + pad(t.namesakes == null ? '' : t.namesakes, 6) + pad(t.total_volume, 7) + pad(t.score, 9) + pad(gateText(t), 24) + (t.why || t.reason || '');
  const head = pad('TOWN', 26) + pad('type', 9) + pad('pop', 9) + pad('mi', 6) + pad('names', 6) + pad('vol', 7) + pad('score', 9) + pad('gate', 24) + 'why';
  L.push(`TIER 1 (phase 1 location pages, ${R.tiers.tier1.length}; top score ${R.tiers.top_score})`); L.push(head);
  for (const t of R.tiers.tier1) L.push(townLine(t));
  L.push(''); L.push(`TIER 2 (phase 2 location pages, ${R.tiers.tier2.length})`); L.push(head);
  for (const t of R.tiers.tier2) L.push(townLine(t));
  L.push(''); L.push(`AREA ONLY (${R.tiers.area_only.length}: service areas text and GBP, no page)`); L.push(head);
  for (const t of R.tiers.area_only) L.push(townLine(t));
  const shared = R.candidates.filter(x => /^name shared elsewhere/.test(x.reason) && x.status === 'excluded');
  L.push(''); L.push(`DISTRICTS EXCLUDED FOR A SHARED NAME (${shared.length}): ${shared.map(t => `${t.name} (${t.namesakes}: ${(t.namesake_examples || []).slice(0, 2).join(', ')})`).join('; ') || 'none'}`);
  L.push(''); L.push(`EXCLUDED AFTER SCORING (${R.tiers.excluded.length}: districts of the base town with no volume)`);
  L.push('  ' + R.tiers.excluded.map(t => `${t.name} (v ${t.gate.volume == null ? '?' : t.gate.volume})`).join(', '));
  L.push(''); L.push(`GBP SERVICE AREAS (${R.gbp_areas.length} of 20): ${R.gbp_areas.map(a => `${a.name} [${a.from}]`).join(', ')}`);
  L.push('');
  L.push(`LOCATION CATEGORY PAGES THAT PASS (${R.location_categories.length}; ${R.no_demand.length} combinations with no demand)`);
  const byTown = new Map();
  for (const c of R.location_categories) { if (!byTown.has(c.town)) byTown.set(c.town, []); byTown.get(c.town).push(c); }
  for (const [town, list] of byTown) L.push(`  ${pad(town, 22)} phase ${list[0].phase}: ${list.map(c => `${c.category}${c.primary ? '*' : ''} (${c.by === 'volume' ? `v ${c.volume}` : c.by === 'population' ? `pop ${num(c.population)}` : `c ${c.competitors}`})`).join(', ')}`);
  L.push('  * the primary category, on the location page\'s demand (hub rule)');
  L.push(`  No demand: ${R.no_demand.map(c => `${c.category} ${c.town} (v ${c.volume == null ? '?' : c.volume}${c.competitors == null ? '' : `, c ${c.competitors}`})`).join('; ')}`);
  L.push('');
  if (R.moves) {
    L.push('');
    L.push(`MOVES SINCE THE PREVIOUS SAVED RUN (${R.moves.previous_ran_at}): ${R.moves.list.length}`);
    for (const m of R.moves.list) L.push(`  ${pad(m.name, 26)} ${pad(m.before, 22)} → ${pad(m.after, 22)} ${m.why}`);
  }
  L.push(`PAGES: before ${R.before.location} location (${R.before.location_phase2} phase 2) and ${R.before.location_category} location category; after ${R.after.location} location (${R.after.location_phase2} phase 2) and ${R.after.location_category} location category (${R.after.location_category_phase2} phase 2)`);
  L.push(`COSTS (this run, incl. cache hits at 0): volume ${money(R.costs.volume_usd)} for ${R.costs.keywords_fetched} fetched; SERP ${money(R.costs.serp_usd)} for ${R.costs.serp_calls} calls (${R.costs.serp_from_cache} from cache)`);
  if (R.costs.serp_failed && R.costs.serp_failed.length) L.push(`SERP FAILED after retries (${R.costs.serp_failed.length}, volume only for these): ${R.costs.serp_failed.map(f => `${f.keyword} (${f.error})`).join('; ')}`);
  if (R.save_error) L.push(`SAVE FAILED: ${R.save_error}`);
  L.push('');
  L.push('SERP SAMPLES (top 10 organic at the town\'s coordinates)');
  for (const s of R.samples) {
    L.push(`  "${s.keyword}" at ${s.point ? `${s.point.lat.toFixed(4)}, ${s.point.lng.toFixed(4)}` : '?'}${s.check_url ? `  ${s.check_url}` : ''}${s.error ? `  ERROR ${s.error}` : ''}`);
    for (const i of s.items || []) L.push(`    ${pad(i.rank_group, 3)} ${pad(i.domain, 32)} ${String(i.title || '').slice(0, 60)}  ${i.url}`);
  }
  return L.join('\n');
}

(async () => {
  const recorded = fs.existsSync(RECORDED) ? JSON.parse(fs.readFileSync(RECORDED, 'utf8')) : { volumes: {}, serps: [], samples: [] };
  const env = { ...envFromDotenv(), ...process.env };
  const setup = LIVE ? await liveSetup(env, LIVE) : await memSetup(recorded);
  const { pool } = setup;
  console.error(`Running on ${setup.label}`);
  const serpKey = (k, p) => `${k}@${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
  const recordedSerps = new Map([...recorded.serps, ...(recorded.samples || [])].map(s => [serpKey(s.keyword, s), s]));

  // The volume look-up: the h1 cache (keyword_volumes) and DataForSEO, with every bought keyword recorded
  const bought = { keywords: 0, cost: 0 };
  const searchVolume = async (keywords, opts) => {
    if (REPLAY) throw new Error(`--replay: ${keywords.length} keywords are not recorded`);
    const r = await D.searchVolume(keywords, { ...opts, env });
    bought.keywords += keywords.length; bought.cost += r.cost;
    const per = keywords.length ? r.cost / keywords.length : 0;
    for (const [k, v] of r.results) recorded.volumes[k] = { volume: v.volume, cpc: v.cpc, status: v.status, cost: Math.round(per * 1e7) / 1e7 };
    return r;
  };
  const h1 = createH1Research({ pool, filloutService: setup.filloutService || {}, pageMapStore: setup.pageMapStore || {}, searchVolume, log: console });
  // The SERP: the serp_checks cache (in the store), then the recording, then DataForSEO, recorded
  const serpBought = { calls: 0, cost: 0 };
  const fetchSerpImpl = async ({ keyword, lat, lng }, opts = {}) => {
    const hit = recordedSerps.get(serpKey(keyword, { lat, lng }));
    if (hit) return { items: hit.items, cost: 0, check_url: hit.check_url || '', se_results_count: hit.se_results_count || null };
    if (REPLAY) throw new Error(`--replay: SERP "${keyword}" is not recorded`);
    const got = await S.fetchSerp({ keyword, lat, lng }, { env, ...opts });
    serpBought.calls++; serpBought.cost += got.cost;
    const row = { keyword, lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4, items: got.items, check_url: got.check_url, se_results_count: got.se_results_count, cost: got.cost, fetched_at: new Date().toISOString() };
    recorded.serps.push(row); recordedSerps.set(serpKey(keyword, { lat, lng }), row);
    return got;
  };
  const serp = S.createSerpStore(pool, { fetchSerpImpl });
  const save = () => fs.writeFileSync(RECORDED, JSON.stringify({ _note: 'Real DataForSEO responses for the Edens Edge Location Determiner run (volumes: Google Ads search volume, UK; serps: Google organic top 10 at the town\'s coordinates). Recorded by tools/location-run.js; replayed by tests/fixtures/location-determiner.js.', recorded_at: new Date().toISOString(), ...recorded }, null, 1));

  const svcArgs = { pool, filloutService: setup.filloutService, pageMapStore: setup.pageMapStore, h1, places: P.createPlacesStore(pool), serp };
  if (setup.geocode) svcArgs.geocode = setup.geocode;
  const svc = createLocationService(svcArgs);

  // The dry run first, always printed; the run only when the estimate is under the limit
  const dry = await svc.dryRun(setup.clientId, { inputs: setup.inputs });
  if (!JSON_OUT || DRY) console.log(dryReport(dry) + '\n');
  if (!dry.ok) { if (JSON_OUT) console.log(JSON.stringify(dry, null, 2)); await pool.end(); process.exit(2); }
  if (DRY) { if (JSON_OUT) console.log(JSON.stringify(dry, null, 2)); await pool.end(); return; }
  if (dry.estimate.total_usd > MAX_USD) { console.error(`Not buying: the estimate (${money(dry.estimate.total_usd)}) is over the limit (${money(MAX_USD)}). Raise it with --max-usd.`); await pool.end(); process.exit(3); }

  const previous = setup.persist ? await svc.latestRun(setup.clientId).catch(() => null) : null;
  let R;
  try {
    R = await svc.run(setup.clientId, { inputs: setup.inputs, onProgress: t => console.error('  ' + t), persist: setup.persist });
  } finally { save(); }
  // The three sample SERPs Brandon asked for (Romsey, Totton, a district), through the same cache
  const samplePoints = Object.fromEntries(R.candidates.filter(c => ['Romsey', 'Totton', 'Bitterne'].includes(c.name)).map(c => [c.name.toLowerCase(), { lat: c.lat, lng: c.lng }]));
  const samples = [];
  for (const kw of SAMPLES) {
    const town = kw.split(' ').slice(1).join(' ');
    const pt = samplePoints[town];
    if (!pt) { samples.push({ keyword: kw, town, error: 'town not among the candidates' }); continue; }
    try {
      const s = await serp.lookup(kw, pt);
      const row = recordedSerps.get(serpKey(kw, pt)) || { keyword: kw, lat: pt.lat, lng: pt.lng, items: s.items, check_url: s.check_url };
      if (!recorded.samples.some(x => x.keyword === kw)) recorded.samples.push(row);
      samples.push({ keyword: kw, town, point: pt, items: s.items.filter(i => i.type === 'organic').slice(0, 10), check_url: s.check_url });
    } catch (e) { samples.push({ keyword: kw, town, error: e.message }); }
  }
  save();
  // Volumes served from the cache were never fetched here: record them too, so the replay has every keyword
  const fromCache = await h1.cached(R.plan.keywords);
  for (const [k, v] of fromCache) if (!recorded.volumes[k]) recorded.volumes[k] = { volume: v.volume == null ? null : v.volume, cpc: v.cpc == null ? null : v.cpc, status: v.status || (v.volume == null ? 'null' : 'ok'), cost: 0 };
  save();
  R.samples = samples;
  if (previous && previous.tiers) {
    const state = run => { const m = new Map(); for (const t of run.tiers.towns || []) m.set(t.place_id, { name: t.name, where: t.tier ? `Tier ${t.tier}` : t.outcome === 'area_only' ? 'area only' : 'excluded', why: t.why }); for (const t of run.tiers.area_only || []) if (!m.has(t.place_id)) m.set(t.place_id, { name: t.name, where: 'area only', why: t.why }); for (const c of run.candidates || []) if (!m.has(c.place_id)) m.set(c.place_id, { name: c.name, where: c.status === 'excluded' ? 'excluded' : c.status, why: c.reason }); return m; };
    const was = state(previous), now = state(R);
    const list = [];
    for (const [id, n] of now) { const w = was.get(id); if (w && w.where !== n.where) list.push({ name: n.name, before: w.where, after: n.where, why: n.why || '' }); }
    R.moves = { previous_ran_at: previous.ran_at, list };
  }
  R.bought = { volume_keywords: bought.keywords, volume_usd: Math.round(bought.cost * 1e4) / 1e4, serp_calls: serpBought.calls, serp_usd: Math.round(serpBought.cost * 1e4) / 1e4 };
  await pool.end();
  if (JSON_OUT) { console.log(JSON.stringify(R, null, 2)); return; }
  console.log(runReport(R));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
