'use strict';

// ── Location Determiner: a client's inputs, the dry run and the run ──────────────
// Reads the Fillout record (primary_town, other_areas, travel_distance, the addresses),
// Client Values (travel_distance fallback, scan_settings), the page map (categories and
// the current location pages) and the places table; applies locations/rules.js.
//   dryRun  candidates, the keyword plan, the counts and the estimate. Spends nothing:
//           postcodes.io is free, the volume cache and the SERP cache are read only.
//   run     buys the volumes (h1 lookup: the 90-day cache, then DataForSEO) and the SERPs
//           the gate needs (serp store: its cache, then DataForSEO), scores and tiers, and
//           saves the result as a client_assets row of type locations_run.

const path = require('path');
const { searchTerms } = require('../h1-research/research');
const { cleanTowns } = require('../page-map/slugs');
const R = require('./rules');
const G = require('./geocode');
const P = require('./places');

const EXCLUDED_DOMAINS = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'excluded-domains.json'), 'utf8')).domains;
const str = v => (v == null ? '' : String(v)).trim();
const round4 = v => Math.round(Number(v) * 1e4) / 1e4;

function createLocationService({ pool, filloutService, pageMapStore, h1 = null, places, serp = null, geocode = G.geocodePostcode, log = console, now = () => new Date() }) {
  async function clientValues(clientId) {
    if (!pool) return {};
    const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (!rows[0]) return {};
    try { return typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content || {}; } catch (_) { return {}; }
  }

  // Everything the determiner reads for one client
  async function inputsFor(clientId) {
    const rec = await filloutService.record(clientId);
    if (!rec) throw Object.assign(new Error('Client not found'), { status: 404 });
    const fields = rec.sections.flatMap(s => s.fields);
    const field = key => fields.find(f => f.key === key) || null;
    const val = key => { const f = field(key); return f && f.value != null ? (typeof f.value === 'string' ? f.value.trim() : f.value) : ''; };
    const cv = await clientValues(clientId);
    const rows = await pageMapStore.saved(clientId);
    const live = rows.filter(r => r.applies !== false);
    const categories = live.filter(r => r.type === 'category').map(r => ({ key: (r.info || {}).category_key || P.slugify(r.title).replace(/-/g, '_'), name: r.title, primary: !!(r.info || {}).primary }));
    const primary = categories.find(c => c.primary) || null;
    const currentTowns = live.filter(r => r.type === 'location').map(r => ({ town: r.title, phase: (r.info || {}).phase || 1 }));
    const locCats = live.filter(r => r.type === 'location_category');
    return {
      clientId, name: rec.client.name, niche: rec.niche || rec.client.trade || '',
      baseTown: str(val('primary_town')),
      otherAreas: cleanTowns(str(val('primary_town')), str(val('other_areas'))).towns,
      travelFillout: str(val('travel_distance')), travelCv: str(cv.travel_distance),
      addresses: ['business_address', 'postal_address'].map(k => { const f = field(k); return { key: k, label: f ? f.label : k, value: f ? str(f.value) : '' }; }),
      scanSettings: cv.scan_settings && typeof cv.scan_settings === 'object' ? cv.scan_settings : null,
      categories, primaryName: primary ? primary.name : str(cv.primary_category), primaryKey: primary ? primary.key : null,
      currentTowns,
      pageCounts: { location: currentTowns.length, location_phase2: currentTowns.filter(t => t.phase === 2).length, location_category: locCats.length, location_category_phase2: locCats.filter(r => (r.info || {}).phase === 2).length },
    };
  }

  // The average cost of one keyword in past DataForSEO look-ups, or null
  async function averageKeywordCost() {
    if (!pool) return null;
    try {
      const { rows } = await pool.query(`SELECT AVG(cost) AS avg_cost FROM keyword_volumes WHERE cost > 0`);
      const v = rows[0] && rows[0].avg_cost != null ? Number(rows[0].avg_cost) : null;
      return v && v > 0 ? v : null;
    } catch (_) { return null; }
  }

  // The base place (the base town's row in the places table): the town with a population first
  async function basePlace(baseTown, point = null) {
    const matches = await places.matchName(baseTown, point);
    return matches.find(p => !p.is_admin_area && p.type === 'town' && p.population) || matches.find(p => !p.is_admin_area) || null;
  }

  const summaryOf = I => ({ baseTown: I.baseTown, otherAreas: I.otherAreas, travelFillout: I.travelFillout, travelCv: I.travelCv, addresses: I.addresses.map(a => ({ key: a.key, hasPostcode: !!G.extractPostcode(a.value) })), categories: I.categories, primaryName: I.primaryName, currentTowns: I.currentTowns });

  // A page's volume fields from a volumes Map
  const withVolume = (p, volumes) => { const bv = R.bestVolume(p, volumes); return { ...p, best_volume: bv.volume, best_keyword: bv.keyword, volumes_known: bv.known, needs_serp: R.needsSerp(p, bv) }; };

  // The dry run: candidates, the keyword plan, the counts and the estimate. Spends nothing.
  async function dryRun(clientId, { inputs = null } = {}) {
    const I = inputs || await inputsFor(clientId);
    const flags = [], problems = [];
    if (!I.baseTown) problems.push({ code: 'no_base_town', msg: 'No base town (primary_town) on the record.' });
    if (!I.categories.length) problems.push({ code: 'no_categories', msg: 'The page map has no category pages yet: generate it first.' });
    if (!I.primaryName) problems.push({ code: 'no_primary', msg: 'No primary category on the page map or Client Values.' });
    const base = I.baseTown ? await basePlace(I.baseTown) : null;
    if (I.baseTown && !base) problems.push({ code: 'base_not_found', msg: `"${I.baseTown}" is not in the places table.` });
    const travel = R.parseTravel({ fillout: I.travelFillout, cv: I.travelCv });
    flags.push(...travel.flags);
    if (travel.miles == null) problems.push({ code: 'no_travel', msg: 'No travel answer to size the reach.' });
    if (problems.length) return { ok: false, problems, flags, client: { id: I.clientId, name: I.name }, inputs: summaryOf(I), travel };

    const point = await G.basePoint({ addresses: I.addresses, townCentroid: base, geocode });
    const reach = R.reachMiles(travel.miles), outer = R.outerLimitMiles(travel.miles);
    const near = await places.near(point, outer * R.KM_PER_MILE, { includeAdmin: true });
    const parents = await places.byIds(near.filter(p => p.parent_town_id).map(p => p.parent_town_id));
    for (const p of near) if (p.parent_town_id) p.parent_name = (parents.get(p.parent_town_id) || {}).name || '';
    const clientAsked = [];
    for (const typed of I.otherAreas) {
      const matches = await places.matchName(typed, point);
      const best = matches.find(m => !m.is_admin_area) || matches[0] || null;
      if (best && best.parent_town_id && !best.parent_name) best.parent_name = ((await places.byIds([best.parent_town_id])).get(best.parent_town_id) || {}).name || '';
      clientAsked.push({ typed, match: best, note: matches.length ? '' : 'no place of that name in the places table' });
    }
    // Namesakes (Brandon, 29 Oct, evening): a place whose name another place in the table shares is ambiguous
    const nameRows = [...near, ...clientAsked.map(a => a.match).filter(Boolean)];
    const namesakes = places.namesakes ? await places.namesakes(nameRows) : new Map();
    for (const p of nameRows) { const n = namesakes.get(p.id); p.namesakes = n ? n.count : 0; p.namesake_examples = n ? n.examples : []; }
    const cand = R.candidates({ base, places: near, clientAsked, travel: travel.miles });
    const candidateRows = cand.rows.filter(r => r.status === 'candidate');
    const areaOnlyRows = cand.rows.filter(r => r.status === 'area_only');

    const ctx = { primaryName: I.primaryName, primaryKey: I.primaryKey, baseTown: I.baseTown, categoryName: key => (I.categories.find(c => c.key === key) || {}).name, terms: searchTerms(I.niche) };
    const plan = R.keywordPlan({ towns: candidateRows, categories: I.categories, ctx });
    const volumes = h1 ? await h1.cached(plan.keywords) : new Map();
    const townPoint = new Map(candidateRows.map(t => [t.place_id, { lat: t.lat, lng: t.lng }]));
    const pages = plan.pages.map(p => ({ ...withVolume(p, volumes), point: townPoint.get(p.place_id) }));
    const serpPairs = pages.filter(p => p.needs_serp).map(p => ({ keyword: p.serp_keyword, point: p.point }));
    const serpCached = serp ? await serp.cachedCount(serpPairs) : 0;
    const keywordsToBuy = plan.keywords.filter(k => !volumes.has(k)).length;
    const estimate = R.estimate({ keywordsToBuy, avgKeywordCost: await averageKeywordCost(), serpQueries: serpPairs.length - serpCached });

    const scanReach = R.scanReachMiles(I.scanSettings);
    const scan = scanReach == null ? null : { reach_miles: scanReach, moves: candidateRows.filter(r => (r.miles <= scanReach) !== r.inside_reach).map(r => ({ town: r.name, miles: r.miles, now: r.inside_reach ? 'inside reach' : 'beyond reach', under_scan: r.miles <= scanReach ? 'inside reach' : 'beyond reach' })) };

    const inside = candidateRows.filter(r => r.inside_reach), beyond = candidateRows.filter(r => !r.inside_reach);
    return {
      ok: true, problems, flags,
      client: { id: I.clientId, name: I.name, niche: I.niche },
      inputs: summaryOf(I),
      base: base ? { place_id: base.id, name: base.name, population: base.population, lat: base.lat, lng: base.lng, lad_name: base.lad_name || '' } : null,
      point, travel: { miles: travel.miles, from: travel.from, raw: travel.raw }, reach_miles: reach, outer_limit_miles: outer, tier1_band: R.tier1Band(travel.miles), page_town_cap: R.PAGE_TOWN_CAP,
      candidates: cand.rows, unmatched: cand.unmatched,
      counts: {
        considered: cand.rows.length, candidates: candidateRows.length, inside_reach: inside.length, beyond_reach_typed: beyond.length, area_only: areaOnlyRows.length, excluded: cand.rows.filter(r => r.status === 'excluded').length,
        across_water: cand.rows.filter(r => /^across water/.test(r.reason)).length,
        client_asked: cand.rows.filter(r => r.client_asked).length, client_asked_excluded: cand.rows.filter(r => r.client_asked && r.status === 'excluded').length, unmatched: cand.unmatched.length,
        districts_of_base: candidateRows.filter(r => r.type === 'district').length,
        ambiguous_towns: candidateRows.filter(r => r.ambiguous).length, name_shared_districts: cand.rows.filter(r => /^name shared elsewhere/.test(r.reason)).length,
        pages_if_all_pass: { location: candidateRows.length, location_category: candidateRows.length * Math.max(0, I.categories.length - (I.primaryKey ? 1 : 0)) },
      },
      plan: { pages, keyword_count: plan.keywords.length, keywords_cached: plan.keywords.length - keywordsToBuy, keywords_to_buy: keywordsToBuy, serp_eligible_pages: pages.filter(p => p.serp_eligible).length, serp_queries: serpPairs.length, serp_cached: serpCached, serp_to_buy: serpPairs.length - serpCached, keywords: plan.keywords },
      estimate, scan,
      before: I.pageCounts,
    };
  }

  // The run: buy what the dry run planned, then score and tier. onProgress(text) is told each step.
  async function run(clientId, { inputs = null, onProgress = null, persist = true } = {}) {
    const say = t => { if (onProgress) onProgress(t); };
    const dry = await dryRun(clientId, { inputs });
    if (!dry.ok) return dry;
    if (!h1) throw new Error('No volume look-up service (h1) given: the run cannot buy volumes.');
    say(`Looking up ${dry.plan.keyword_count} keywords (${dry.plan.keywords_to_buy} to buy)`);
    const got = await h1.lookup(dry.plan.keywords, { onRetry: r => say(`DataForSEO busy, retry ${r.attempt} of ${r.of} in ${Math.round(r.waitMs / 1000)}s`) });
    const volumes = got.volumes;
    const pages = dry.plan.pages.map(p => ({ ...withVolume(p, volumes), competitors: null, competitor_pages: [], serp_check_url: '', serp_items: null, serp_cached: null }));
    const toSerp = pages.filter(p => p.needs_serp);
    say(`Checking ${toSerp.length} SERPs`);
    let serpCost = 0, serpCalls = 0, serpFromCache = 0;
    const serpFailed = [];
    for (const p of toSerp) {
      if (!serp) break;
      let s;
      try { s = await serp.lookup(p.serp_keyword, p.point, { onRetry: r => say(`SERP "${p.serp_keyword}": DataForSEO busy (${r.message}), retry ${r.attempt} of ${r.of} in ${Math.round(r.waitMs / 1000)}s`) }); }
      catch (e) {
        // A SERP that fails after the retries leaves this combination on volume alone (competitors unknown, never counted)
        p.serp_error = e.message; serpFailed.push({ keyword: p.serp_keyword, town: p.town, error: e.message });
        say(`SERP "${p.serp_keyword}" failed: ${e.message} (volume only for this page)`);
        continue;
      }
      const cp = R.competitorPages(s.items, p.town, EXCLUDED_DOMAINS);
      Object.assign(p, { competitors: cp.count, competitor_pages: cp.pages, serp_check_url: s.check_url || '', serp_items: s.items.filter(i => i.type === 'organic').slice(0, 10), serp_cached: !!s.cached });
      if (s.cached) serpFromCache++; else { serpCalls++; serpCost += Number(s.cost) || 0; }
    }
    const candidateRows = dry.candidates.filter(r => r.status === 'candidate');
    const areaOnlyRows = dry.candidates.filter(r => r.status === 'area_only');
    const tiers = R.scoreAndTier({ towns: candidateRows, pages, travel: dry.travel.miles, areaOnlyRows });
    const result = {
      ...dry, ran_at: now().toISOString(),
      plan: { ...dry.plan, pages },
      costs: { volume_usd: round4(got.cost || 0), keywords_fetched: got.fetched, serp_usd: round4(serpCost), serp_calls: serpCalls, serp_from_cache: serpFromCache, serp_failed: serpFailed, total_usd: round4((got.cost || 0) + serpCost) },
      tiers: { tier1: tiers.tier1, tier2: tiers.tier2, area_only: tiers.area_only, excluded: tiers.excluded, towns: tiers.towns, top_score: tiers.top_score, band: tiers.band, cap: tiers.cap },
      gbp_areas: tiers.gbp_areas, location_categories: tiers.location_categories, no_demand: tiers.no_demand,
      after: { location: tiers.tier1.length + tiers.tier2.length, location_phase2: tiers.tier2.length, location_category: tiers.location_categories.length, location_category_phase2: tiers.location_categories.filter(c => c.phase === 2).length },
    };
    if (persist && pool) {
      try { await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'locations_run', 'locations_run.json', $2)`, [clientId, JSON.stringify(result)]); }
      catch (e) { log.error('[locations] could not save the run:', e.message); result.save_error = e.message; }
    }
    return result;
  }

  // The latest saved run, or null
  async function latestRun(clientId) {
    if (!pool) return null;
    const { rows } = await pool.query(`SELECT content, uploaded_at FROM client_assets WHERE client_id = $1 AND asset_type = 'locations_run' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows[0] ? (typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content) : null;
  }

  return { inputsFor, dryRun, run, latestRun, basePlace, averageKeywordCost, EXCLUDED_DOMAINS };
}

module.exports = { createLocationService, EXCLUDED_DOMAINS };
