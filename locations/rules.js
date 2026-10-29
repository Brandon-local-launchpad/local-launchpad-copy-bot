'use strict';

// ── Location Determiner: the rules, no network and no database ─────────────────
// Brandon's brief (29 Oct 2026) with his changes of the same day. This file decides;
// locations/service.js fetches and stores.
//
//   travel       the Fillout field travel_distance (leading number, 10/20/30/45); else the
//                leading number in Client Values travel_distance snapped to the nearest, flagged
//   REACH        by travel answer: 10 → 10 mi, 20 → 15, 30 → 20, 45 → 25 (always, at first build;
//                a locked scan grid is only compared on the review screen, never applied)
//   OUTER LIMIT  min(travel, 25) miles
//   candidates   places inside the outer limit, not admin areas, not the base town, not across
//                water (an island authority the base is not in): a town of 5,000 or more, or a
//                district of the base town (no floor); plus the client's typed towns (source
//                client_asked, the floor waived) placed by the same rules, never dropped silently
//   beyond reach a town between REACH and the outer limit is area only, unless the client typed
//                it and it passes on volume: then Tier 2, flagged "beyond reach". Competitor
//                pages never bring a beyond-reach town in.
//   districts    in the volume run, no SERP check: a district passes on volume >= 10 only
//   demand gate  volume >= 10 OR 2+ competitor pages (a business domain's URL or title holding
//                the town name in the top 10 at the town's coordinates; directories excluded)
//   score        distance_weight = 1 - 0.7 × (miles / outer limit); score = total volume ×
//                distance_weight; zero-volume towns rank after every town with volume, by
//                population × distance_weight
//   tiers        tiers are the launch phases. Tier 1 (phase 1): towns inside REACH that pass,
//                score >= 25% of the top score, clamped to the band 10 → 3-5, 20 → 5-8,
//                30 → 8-12, 45 → 10-15. Tier 2 (phase 2): every other town that passes. At most
//                20 page towns in all, by score; the rest are area only, "over cap", promotable.
//   GBP areas    Tier 1, then Tier 2, then area-only towns by score, 20 at most (districts of
//                the base town are inside it and are never service areas)
//   categories   a location category page per tier town and category where that combination
//                passes the gate (the primary category's page shares the location page's
//                keywords: the 19 Oct hub rule); it follows the town's phase. A failed
//                combination gets no row and the town is plain text in that category's areas.

const path = require('path');
const { keywordOf } = require('../h1-research/research');
const C = require('../h1-research/claims');
const P = require('./places');

const ALLOWED_TRAVEL = [10, 20, 30, 45];
const REACH_MILES = { 10: 10, 20: 15, 30: 20, 45: 25 };
const OUTER_CAP_MILES = 25;
const POPULATION_FLOOR = 5000;
const DEMAND_VOLUME = 10;
const DEMAND_COMPETITORS = 2;
const TIER1_BAND = { 10: [3, 5], 20: [5, 8], 30: [8, 12], 45: [10, 15] };
const TIER1_SCORE_SHARE = 0.25;
const PAGE_TOWN_CAP = 20;
const GBP_AREA_LIMIT = 20;
const KM_PER_MILE = 1.609344;
const SERP_COST_USD = 0.002;          // DataForSEO Google organic SERP, live advanced, per SERP of 10 (pricing page, 29 Oct 2026)
const VOLUME_TASK_COST_USD = 0.09;    // DataForSEO Google Ads search volume, live, per task of up to 1,000 keywords (fallback when the cache has no cost rows)

let ISLANDS = null;
function islandAuthorities() {
  if (!ISLANDS) { try { ISLANDS = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'islands.json'), 'utf8')).authorities || []; } catch (_) { ISLANDS = []; } }
  return ISLANDS;
}
// The island authority a place's local authority name falls in, or null
function islandOf(ladName, islands = islandAuthorities()) {
  const n = P.normaliseName(ladName);
  if (!n) return null;
  return islands.find(i => n.includes(P.normaliseName(i))) || null;
}

const str = v => (v == null ? '' : String(v)).trim();
const leadingNumber = text => { const m = str(text).match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };
const nearestAllowed = n => ALLOWED_TRAVEL.reduce((best, a) => (Math.abs(a - n) < Math.abs(best - n) ? a : best), ALLOWED_TRAVEL[0]);
const fmt = n => (n == null ? 'unknown' : Number(n).toLocaleString('en-GB'));

// { miles, from: 'fillout' | 'client values' | null, raw, flags: [{ code, msg }] }
function parseTravel({ fillout = null, cv = null } = {}) {
  const flags = [];
  const f = leadingNumber(fillout);
  if (f != null && ALLOWED_TRAVEL.includes(f)) return { miles: f, from: 'fillout', raw: str(fillout), flags };
  if (str(fillout)) flags.push({ code: 'T-TRAVEL-ODD', msg: `The Fillout travel answer "${str(fillout)}" is not one of 10, 20, 30 or 45.` });
  else flags.push({ code: 'T-TRAVEL-MISSING', msg: 'No travel answer on the Fillout record.' });
  const c = leadingNumber(cv);
  if (c != null) {
    const snapped = nearestAllowed(c);
    flags.push({ code: 'T-TRAVEL-FALLBACK', msg: `Travel taken from Client Values ("${str(cv)}")${snapped !== c ? `, snapped from ${c} to ${snapped}` : ''}.` });
    return { miles: snapped, from: 'client values', raw: str(cv), flags };
  }
  flags.push({ code: 'T-TRAVEL-NONE', msg: 'No usable travel answer anywhere: the run cannot size the reach.' });
  return { miles: null, from: null, raw: '', flags };
}

const reachMiles = miles => (miles == null ? null : REACH_MILES[miles]);
const outerLimitMiles = miles => (miles == null ? null : Math.min(miles, OUTER_CAP_MILES));
const tier1Band = miles => TIER1_BAND[miles] || null;

// A locked rank scan's half grid width in miles, or null: grid points × spacing / 2
function scanReachMiles(scanSettings) {
  if (!scanSettings || !scanSettings.locked) return null;
  const grid = Number(scanSettings.grid_size), spacing = Number(scanSettings.spacing_m);
  if (!grid || !spacing) return null;
  return Math.round(((grid * spacing) / 2 / 1000 / KM_PER_MILE) * 10) / 10;
}

// ── Candidates ──
// base: the base town's place row; places: every place within the outer limit with km and
// parent_name; clientAsked: [{ typed, match }]; travel: miles. Every place considered comes
// back with status 'candidate' (in the volume run), 'area_only' (no page: beyond reach and not
// typed) or 'excluded', a reason, source and inside_reach.
function candidates({ base, places, clientAsked = [], travel, islands = islandAuthorities() }) {
  const outer = outerLimitMiles(travel), reach = reachMiles(travel);
  const baseNorm = base ? P.normaliseName(base.name) : '';
  const baseIsland = base ? islandOf(base.lad_name, islands) : null;
  const byId = new Map();
  const consider = (p, source) => {
    if (byId.has(p.id)) { const r = byId.get(p.id); if (source === 'client_asked') { r.source = 'client_asked'; r.client_asked = true; } return r; }
    const miles = Math.round(p.km / KM_PER_MILE * 10) / 10;
    const row = { place_id: p.id, name: p.name, type: p.type, kind: p.kind || '', population: p.population == null ? null : p.population, parent_town_id: p.parent_town_id || null, parent_name: p.parent_name || '', lad_name: p.lad_name || '', lat: p.lat, lng: p.lng, miles, inside_reach: reach != null && miles <= reach, inside_outer: outer != null && miles <= outer, source, client_asked: source === 'client_asked', is_admin_area: !!p.is_admin_area, qualifier: p.qualifier || '', status: 'candidate', reason: '' };
    const exclude = reason => { row.status = 'excluded'; row.reason = reason; };
    const island = islandOf(p.lad_name, islands);
    if (row.is_admin_area) exclude('council area');
    else if (base && (p.id === base.id || (p.type === 'town' && P.normaliseName(p.name) === baseNorm && miles < 3))) exclude('the base town');
    else if (!row.inside_outer) exclude(`outside the outer limit (${outer} mi)`);
    else if (island && island !== baseIsland) exclude(`across water (${island})`);
    else if (p.type === 'district') {
      if (base && p.parent_town_id === base.id) row.reason = `district of ${base.name}`;
      else exclude(`part of ${p.parent_name || 'another town'}`);
    } else if (p.type === 'town') {
      if (p.population != null && p.population >= POPULATION_FLOOR) row.reason = '';
      else if (source === 'client_asked') row.reason = `client asked: under the ${fmt(POPULATION_FLOOR)} floor (population ${fmt(p.population)})`;
      else exclude(`below the ${fmt(POPULATION_FLOOR)} floor (population ${fmt(p.population)})`);
    } else exclude(`type ${p.type}`);
    // Beyond reach: area only unless the client typed it (then it can pass on volume alone)
    if (row.status === 'candidate' && !row.inside_reach) {
      if (source === 'client_asked') row.reason = `beyond reach (${reach} mi): typed by the client, a page only on volume`;
      else { row.status = 'area_only'; row.reason = `beyond reach (${reach} mi)`; }
    }
    byId.set(p.id, row);
    return row;
  };
  // The client's own towns first, so a typed village is judged with the floor waived
  const unmatched = [];
  for (const a of clientAsked) {
    if (!a.match) { unmatched.push({ typed: a.typed, note: a.note || 'no place of that name in the places table' }); continue; }
    const row = consider({ ...a.match, km: a.match.km != null ? a.match.km : 0 }, 'client_asked');
    row.typed = a.typed;
    if (a.match.is_admin_area) { row.status = 'excluded'; row.reason = 'council area (typed by the client)'; }
  }
  for (const p of places) consider(p, 'scored');
  const order = { candidate: 0, area_only: 1, excluded: 2 };
  const rows = [...byId.values()].sort((x, y) => (order[x.status] - order[y.status]) || (x.miles - y.miles));
  return { rows, unmatched, reach, outer };
}

// ── The keyword plan ──
// For every candidate town (status candidate): the location page's keywords ("[primary]
// [town]", its services form and the approved synonyms, as the H1 research asks for them)
// and one set per other category. The primary category's location category page shares the
// location page's keywords (the hub rule), so it is not asked twice. A SERP check is only for
// towns (not districts) inside reach. Returns { pages, keywords }
function keywordPlan({ towns, categories, ctx }) {
  const pages = [];
  const all = new Set();
  for (const t of towns) {
    const serpEligible = t.type === 'town' && !!t.inside_reach;
    const loc = C.candidatesV2({ type: 'location', title: t.name, info: { town: t.name } }, ctx).map(c => c.keyword);
    const own = keywordOf(`${ctx.primaryName || ''} ${t.name}`);
    pages.push({ place_id: t.place_id, town: t.name, page: 'location', category_key: ctx.primaryKey || null, category: ctx.primaryName || '', keywords: loc.length ? loc : [own], serp_keyword: loc[0] || own, serp_eligible: serpEligible });
    for (const c of categories) {
      if (c.key && c.key === ctx.primaryKey) continue;
      const kws = C.candidatesV2({ type: 'location_category', title: `${c.name} ${t.name}`, info: { town: t.name, category_key: c.key } }, ctx).map(x => x.keyword);
      pages.push({ place_id: t.place_id, town: t.name, page: 'location_category', category_key: c.key, category: c.name, keywords: kws.length ? kws : [keywordOf(`${c.name} ${t.name}`)], serp_keyword: kws[0] || keywordOf(`${c.name} ${t.name}`), serp_eligible: serpEligible });
    }
  }
  for (const p of pages) for (const k of p.keywords) all.add(k);
  return { pages, keywords: [...all] };
}

// The best volume a page's keywords have in a volumes Map (keyword → { volume }); null when none is known
function bestVolume(page, volumes) {
  let best = null, keyword = null, known = 0;
  for (const k of page.keywords) {
    const v = volumes.get(k);
    if (!v || v.volume == null) continue;
    known++;
    if (best == null || v.volume > best) { best = v.volume; keyword = k; }
  }
  return { volume: best, keyword, known, of: page.keywords.length };
}
// A page needs a SERP when it may do so and its best known volume is under the gate
const needsSerp = (page, best) => !!page.serp_eligible && (best.volume == null || best.volume < DEMAND_VOLUME);

// ── Competitor pages ──
const registrable = d => str(d).toLowerCase().replace(/^www\./, '');
function isExcludedDomain(domain, excluded) {
  const d = registrable(domain);
  return excluded.some(x => d === x || d.endsWith('.' + x));
}
function mentionsTown(text, town) {
  const t = P.normaliseName(town);
  if (!t) return false;
  const hay = ' ' + P.normaliseName(String(text || '').replace(/^https?:\/\//, '').replace(/[-_/.?=&%+]+/g, ' ')) + ' ';
  return hay.includes(' ' + t + ' ') || hay.replace(/ /g, '').includes(t.replace(/ /g, ''));
}
// items: DataForSEO organic items; one page per business domain whose URL or title holds the town
function competitorPages(items, town, excluded) {
  const organic = (items || []).filter(i => i && i.type === 'organic' && i.url);
  const seen = new Set();
  const pages = [];
  for (const i of organic) {
    const d = registrable(i.domain || (i.url.match(/^https?:\/\/([^/]+)/) || [])[1]);
    if (!d || seen.has(d) || isExcludedDomain(d, excluded)) continue;
    if (!mentionsTown(i.url, town) && !mentionsTown(i.title, town)) continue;
    seen.add(d);
    pages.push({ domain: d, url: i.url, title: i.title || '', rank: i.rank_group || i.rank_absolute || null });
  }
  return { count: pages.length, pages, organic: organic.length };
}

// The demand gate: pass on volume, else on competitor pages (null competitors = not allowed to count)
function demandGate({ volume, competitors }) {
  if (volume != null && volume >= DEMAND_VOLUME) return { pass: true, by: 'volume', volume, competitors: competitors == null ? null : competitors };
  if (competitors != null && competitors >= DEMAND_COMPETITORS) return { pass: true, by: 'competitors', volume, competitors };
  return { pass: false, by: null, volume, competitors: competitors == null ? null : competitors };
}

// ── Cost estimate ──
function estimate({ keywordsToBuy, avgKeywordCost = null, serpQueries }) {
  const perKeyword = avgKeywordCost != null && avgKeywordCost > 0 ? avgKeywordCost : VOLUME_TASK_COST_USD / 1000;
  const volumeTasks = Math.ceil(keywordsToBuy / 1000);
  const volumeCost = avgKeywordCost != null && avgKeywordCost > 0 ? keywordsToBuy * perKeyword : volumeTasks * VOLUME_TASK_COST_USD;
  const serpCost = serpQueries * SERP_COST_USD;
  return {
    volume: { keywords: keywordsToBuy, tasks: volumeTasks, per_keyword_usd: round4(perKeyword), cost_usd: round4(volumeCost), basis: avgKeywordCost != null && avgKeywordCost > 0 ? 'average cost per keyword from past keyword_volumes rows' : `${VOLUME_TASK_COST_USD} USD per live task of up to 1,000 keywords (no past cost rows)` },
    serp: { queries: serpQueries, per_query_usd: SERP_COST_USD, cost_usd: round4(serpCost), basis: 'DataForSEO Google organic SERP, live advanced, per SERP of 10' },
    total_usd: round4(volumeCost + serpCost),
  };
}
const round4 = v => Math.round(v * 10000) / 10000;
const round3 = v => Math.round(v * 1000) / 1000;

// ── Stage 4: score and tier ──
// towns: the candidate rows (status candidate); pages: the plan's pages with best_volume,
// competitors (count or null) and competitor_pages; travel: miles; cap: page towns at most.
// Returns { towns (every candidate with score, gate, tier and reason), tier1, tier2, area_only,
// excluded, gbp_areas, location_categories, no_demand }.
function scoreAndTier({ towns, pages, travel, areaOnlyRows = [], cap = PAGE_TOWN_CAP, gbpLimit = GBP_AREA_LIMIT }) {
  const outer = outerLimitMiles(travel);
  const band = tier1Band(travel) || [0, Infinity];
  const byTown = new Map(towns.map(t => [t.place_id, []]));
  for (const p of pages) if (byTown.has(p.place_id)) byTown.get(p.place_id).push(p);
  const scored = towns.map(t => {
    const mine = byTown.get(t.place_id) || [];
    const loc = mine.find(p => p.page === 'location') || null;
    const total = mine.reduce((s, p) => s + (p.best_volume || 0), 0);
    const weight = outer ? Math.max(0, 1 - 0.7 * (t.miles / outer)) : 1;
    const allowCompetitors = t.type === 'town' && t.inside_reach;
    const gate = loc ? demandGate({ volume: loc.best_volume, competitors: allowCompetitors ? loc.competitors : null }) : { pass: false, by: null, volume: null, competitors: null };
    return { ...t, total_volume: total, distance_weight: round3(weight), score: round3(total * weight), fallback: round3((t.population || 0) * weight), gate, evidence: loc ? { volume: loc.best_volume, keyword: loc.best_keyword, competitors: allowCompetitors ? loc.competitors : null, competitor_pages: allowCompetitors ? (loc.competitor_pages || []) : [], serp_check_url: loc.serp_check_url || '' } : null };
  });
  // Towns with volume first by score, then zero-volume towns by population × weight
  const order = (a, b) => ((b.total_volume > 0) - (a.total_volume > 0)) || (b.score - a.score) || (b.fallback - a.fallback) || (a.miles - b.miles);
  scored.sort(order);
  const passed = scored.filter(t => t.gate.pass);
  const eligible1 = passed.filter(t => t.inside_reach);
  const top = eligible1.length ? Math.max(...eligible1.map(t => t.score)) : 0;
  let tier1 = eligible1.filter(t => top > 0 && t.score >= TIER1_SCORE_SHARE * top);
  if (tier1.length < band[0]) tier1 = eligible1.slice(0, Math.min(band[0], eligible1.length));
  if (tier1.length > band[1]) tier1 = tier1.slice(0, band[1]);
  const t1 = new Set(tier1.map(t => t.place_id));
  const rest = passed.filter(t => !t1.has(t.place_id));
  const room = Math.max(0, cap - tier1.length);
  const tier2 = rest.slice(0, room);
  const overCap = rest.slice(room);
  const t2 = new Set(tier2.map(t => t.place_id));
  for (const t of scored) {
    if (t1.has(t.place_id)) { t.tier = 1; t.phase = 1; t.outcome = 'page'; t.why = `Tier 1: score ${t.score}${top ? ` (${Math.round(t.score / top * 100)}% of the top ${top})` : ''}, passed on ${t.gate.by}`; }
    else if (t2.has(t.place_id)) { t.tier = 2; t.phase = 2; t.outcome = 'page'; t.why = `Tier 2: passed on ${t.gate.by}, score ${t.score}${!t.inside_reach ? ', beyond reach' : ''}`; if (!t.inside_reach) t.beyond_reach = true; }
    else if (overCap.some(o => o.place_id === t.place_id)) { t.tier = null; t.outcome = 'area_only'; t.why = `over cap: passed on ${t.gate.by} but the ${cap} page towns are taken; promotable`; }
    else if (t.type === 'district') { t.tier = null; t.outcome = 'excluded'; t.why = `no volume (district of the base town: volume ${fmt(t.gate.volume)}, passes on volume only)`; }
    else if (!t.inside_reach) { t.tier = null; t.outcome = 'area_only'; t.why = `beyond reach, typed by the client, volume ${fmt(t.gate.volume)} under ${DEMAND_VOLUME}`; }
    else { t.tier = null; t.outcome = 'area_only'; t.why = `no demand: volume ${fmt(t.gate.volume)}, ${t.gate.competitors == null ? 'no SERP' : `${t.gate.competitors} competitor page${t.gate.competitors === 1 ? '' : 's'}`}`; }
  }
  const areaOnly = [...scored.filter(t => t.outcome === 'area_only'), ...areaOnlyRows.map(r => ({ ...r, tier: null, outcome: 'area_only', why: r.reason, score: 0, total_volume: 0, gate: null, evidence: null }))];
  const excluded = scored.filter(t => t.outcome === 'excluded');
  // GBP service areas: Tier 1, Tier 2, then area-only towns by score (districts never)
  const gbp = [...tier1, ...tier2, ...areaOnly.filter(t => t.type === 'town').sort((a, b) => (b.score - a.score) || (a.miles - b.miles))].filter(t => t.type === 'town').slice(0, gbpLimit).map(t => ({ place_id: t.place_id, name: t.name, from: t.tier ? `Tier ${t.tier}` : 'area only' }));
  // Location category pages for the page towns
  const locationCategories = [], noDemand = [];
  for (const t of [...tier1, ...tier2]) {
    for (const p of (byTown.get(t.place_id) || [])) {
      if (p.page === 'location') { locationCategories.push({ town: t.name, place_id: t.place_id, phase: t.phase, tier: t.tier, category_key: p.category_key, category: p.category, primary: true, pass: true, by: t.gate.by, volume: p.best_volume, keyword: p.best_keyword, competitors: t.evidence.competitors, note: 'the primary category: shares the location page\'s demand (hub rule)' }); continue; }
      const allowCompetitors = t.type === 'town' && t.inside_reach;
      const g = demandGate({ volume: p.best_volume, competitors: allowCompetitors ? p.competitors : null });
      const row = { town: t.name, place_id: t.place_id, phase: t.phase, tier: t.tier, category_key: p.category_key, category: p.category, primary: false, pass: g.pass, by: g.by, volume: p.best_volume, keyword: p.best_keyword, competitors: g.competitors, competitor_pages: allowCompetitors ? (p.competitor_pages || []) : [] };
      (g.pass ? locationCategories : noDemand).push(row);
    }
  }
  return { towns: scored, tier1, tier2, area_only: areaOnly, excluded, gbp_areas: gbp, location_categories: locationCategories, no_demand: noDemand, top_score: top, band, cap };
}

module.exports = { ALLOWED_TRAVEL, REACH_MILES, OUTER_CAP_MILES, POPULATION_FLOOR, DEMAND_VOLUME, DEMAND_COMPETITORS, TIER1_BAND, TIER1_SCORE_SHARE, PAGE_TOWN_CAP, GBP_AREA_LIMIT, KM_PER_MILE, SERP_COST_USD, VOLUME_TASK_COST_USD,
  islandAuthorities, islandOf, leadingNumber, parseTravel, reachMiles, outerLimitMiles, tier1Band, scanReachMiles, candidates, keywordPlan, bestVolume, needsSerp, competitorPages, isExcludedDomain, mentionsTown, demandGate, estimate, scoreAndTier };
