'use strict';

// ── Location Determiner: a client's inputs and the dry run ───────────────────────
// Reads the Fillout record (primary_town, other_areas, travel_distance, the addresses),
// Client Values (travel_distance fallback, scan_settings), the page map (categories and
// the current location pages) and the places table; applies locations/rules.js; shows
// the keyword count, the SERP query count and the estimated cost before anything is
// bought. The dry run spends nothing: postcodes.io is free, the volume cache and the SERP
// cache are read only.

const { searchTerms } = require('../h1-research/research');
const { cleanTowns } = require('../page-map/slugs');
const R = require('./rules');
const G = require('./geocode');
const P = require('./places');

const str = v => (v == null ? '' : String(v)).trim();

function createLocationService({ pool, filloutService, pageMapStore, h1 = null, places, serp = null, geocode = G.geocodePostcode, log = console }) {
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
      const { rows } = await pool.query(`SELECT AVG(cost) AS avg_cost, COUNT(*) AS n FROM keyword_volumes WHERE cost > 0`);
      const v = rows[0] && rows[0].avg_cost != null ? Number(rows[0].avg_cost) : null;
      return v && v > 0 ? v : null;
    } catch (_) { return null; }
  }

  // The base place (the base town's row in the places table): the town with a population first
  async function basePlace(baseTown, point = null) {
    const matches = await places.matchName(baseTown, point);
    return matches.find(p => !p.is_admin_area && p.type === 'town' && p.population) || matches.find(p => !p.is_admin_area) || null;
  }

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
    // Every place within the outer limit, admin rows included (shown as excluded), parents named
    const near = await places.near(point, outer * R.KM_PER_MILE, { includeAdmin: true });
    const parents = await places.byIds(near.filter(p => p.parent_town_id).map(p => p.parent_town_id));
    for (const p of near) if (p.parent_town_id) p.parent_name = (parents.get(p.parent_town_id) || {}).name || '';
    // The client's own towns, matched by name nearest the base
    const clientAsked = [];
    for (const typed of I.otherAreas) {
      const matches = await places.matchName(typed, point);
      const best = matches.find(m => !m.is_admin_area) || matches[0] || null;
      if (best && best.parent_town_id && !best.parent_name) best.parent_name = ((await places.byIds([best.parent_town_id])).get(best.parent_town_id) || {}).name || '';
      clientAsked.push({ typed, match: best, note: matches.length ? '' : 'no place of that name in the places table' });
    }
    const cand = R.candidates({ base, places: near, clientAsked, travel: travel.miles });
    const candidateRows = cand.rows.filter(r => r.status === 'candidate');

    // The keyword plan for every candidate (beyond-reach towns too: they can become Tier 2 on demand)
    const ctx = { primaryName: I.primaryName, primaryKey: I.primaryKey, baseTown: I.baseTown, categoryName: key => (I.categories.find(c => c.key === key) || {}).name, terms: searchTerms(I.niche) };
    const plan = R.keywordPlan({ towns: candidateRows, categories: I.categories, ctx });
    const volumes = h1 ? await h1.cached(plan.keywords) : new Map();
    const pages = plan.pages.map(p => {
      const bv = R.bestVolume(p, volumes);
      const needsSerp = bv.volume == null || bv.volume < R.DEMAND_VOLUME;
      return { ...p, best_volume: bv.volume, best_keyword: bv.keyword, volumes_known: bv.known, needs_serp: needsSerp, point: { lat: candidateRows.find(t => t.place_id === p.place_id).lat, lng: candidateRows.find(t => t.place_id === p.place_id).lng } };
    });
    const serpPairs = pages.filter(p => p.needs_serp).map(p => ({ keyword: p.serp_keyword, point: p.point }));
    const serpCached = serp ? await serp.cachedCount(serpPairs) : 0;
    const keywordsToBuy = plan.keywords.filter(k => !volumes.has(k)).length;
    const estimate = R.estimate({ keywordsToBuy, avgKeywordCost: await averageKeywordCost(), serpQueries: serpPairs.length - serpCached });

    // A locked rank scan's radius, compared, never applied
    const scanReach = R.scanReachMiles(I.scanSettings);
    const scan = scanReach == null ? null : { reach_miles: scanReach, moves: candidateRows.filter(r => (r.miles <= scanReach) !== r.inside_reach).map(r => ({ town: r.name, miles: r.miles, now: r.inside_reach ? 'inside reach' : 'beyond reach', under_scan: r.miles <= scanReach ? 'inside reach' : 'beyond reach' })) };

    const inside = candidateRows.filter(r => r.inside_reach), beyond = candidateRows.filter(r => !r.inside_reach);
    return {
      ok: true, problems, flags,
      client: { id: I.clientId, name: I.name, niche: I.niche },
      inputs: summaryOf(I),
      base: base ? { place_id: base.id, name: base.name, population: base.population, lat: base.lat, lng: base.lng } : null,
      point, travel: { miles: travel.miles, from: travel.from, raw: travel.raw }, reach_miles: reach, outer_limit_miles: outer, tier1_band: R.tier1Band(travel.miles),
      candidates: cand.rows, unmatched: cand.unmatched,
      counts: {
        considered: cand.rows.length, candidates: candidateRows.length, inside_reach: inside.length, beyond_reach: beyond.length, excluded: cand.rows.length - candidateRows.length,
        client_asked: cand.rows.filter(r => r.client_asked).length, client_asked_excluded: cand.rows.filter(r => r.client_asked && r.status === 'excluded').length, unmatched: cand.unmatched.length,
        districts_of_base: candidateRows.filter(r => r.type === 'district').length,
        pages_if_all_pass: { location: candidateRows.length, location_category: candidateRows.length * Math.max(0, I.categories.length - (I.primaryKey ? 1 : 0)) },
      },
      plan: { pages, keyword_count: plan.keywords.length, keywords_cached: plan.keywords.length - keywordsToBuy, keywords_to_buy: keywordsToBuy, serp_queries: serpPairs.length, serp_cached: serpCached, serp_to_buy: serpPairs.length - serpCached, keywords: plan.keywords },
      estimate, scan,
      before: I.pageCounts,
    };
  }

  const summaryOf = I => ({ baseTown: I.baseTown, otherAreas: I.otherAreas, travelFillout: I.travelFillout, travelCv: I.travelCv, addresses: I.addresses.map(a => ({ key: a.key, hasPostcode: !!G.extractPostcode(a.value) })), categories: I.categories, primaryName: I.primaryName, currentTowns: I.currentTowns });

  return { inputsFor, dryRun, basePlace, averageKeywordCost };
}

module.exports = { createLocationService };
