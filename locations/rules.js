'use strict';

// ── Location Determiner: the rules, no network and no database ─────────────────
// Brandon's brief (29 Oct 2026) with his Step 0 changes and the tiers-are-phases
// decision. This file decides; locations/service.js fetches and stores.
//
//   travel      the Fillout field travel_distance (leading number, 10/20/30/45); else the
//               leading number in Client Values travel_distance snapped to the nearest, flagged
//   REACH       by travel answer: 10 → 10 mi, 20 → 15, 30 → 20, 45 → 25 (always, at first build;
//               a locked scan grid is only compared on the review screen, never applied)
//   OUTER LIMIT min(travel, 25) miles
//   candidates  places inside the outer limit, not admin areas, not the base town: a town of
//               5,000 or more, or a district whose parent is the base town (no floor); plus the
//               client's own typed towns (source client_asked) placed by the same rules but
//               never excluded silently
//   demand gate volume >= 10 OR 2+ competitor pages (a business domain's URL or title holding
//               the town name in the top 10 at the town's coordinates; directories excluded)

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
const GBP_AREA_LIMIT = 20;
const KM_PER_MILE = 1.609344;
const SERP_COST_USD = 0.002;          // DataForSEO Google organic SERP, live advanced, per SERP of 10 (pricing page, 29 Oct 2026)
const VOLUME_TASK_COST_USD = 0.09;    // DataForSEO Google Ads search volume, live, per task of up to 1,000 keywords (fallback when the cache has no cost rows)

const str = v => (v == null ? '' : String(v)).trim();
const leadingNumber = text => { const m = str(text).match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };
const nearestAllowed = n => ALLOWED_TRAVEL.reduce((best, a) => (Math.abs(a - n) < Math.abs(best - n) ? a : best), ALLOWED_TRAVEL[0]);

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
// base: the base town's place row ({ id, name, lat, lng }); point: the base point used for
// distances; places: every non-admin and admin place within the outer limit, each with km;
// clientAsked: [{ typed, match }] (match: a place row with km, or null); miles: travel.
// Returns { rows, unmatched } where rows are every place considered, each with
// { status: 'candidate' | 'excluded', reason, source: 'scored' | 'client_asked', inside_reach, miles }.
function candidates({ base, places, clientAsked = [], travel }) {
  const outer = outerLimitMiles(travel), reach = reachMiles(travel);
  const baseNorm = base ? P.normaliseName(base.name) : '';
  const byId = new Map();
  const consider = (p, source) => {
    if (byId.has(p.id)) { const r = byId.get(p.id); if (source === 'client_asked') { r.source = 'client_asked'; r.client_asked = true; } return r; }
    const miles = Math.round(p.km / KM_PER_MILE * 10) / 10;
    const row = { place_id: p.id, name: p.name, type: p.type, kind: p.kind || '', population: p.population == null ? null : p.population, parent_town_id: p.parent_town_id || null, parent_name: p.parent_name || '', lat: p.lat, lng: p.lng, miles, inside_reach: reach != null && miles <= reach, inside_outer: outer != null && miles <= outer, source, client_asked: source === 'client_asked', is_admin_area: !!p.is_admin_area, qualifier: p.qualifier || '', status: 'candidate', reason: '' };
    const exclude = reason => { row.status = 'excluded'; row.reason = reason; };
    if (row.is_admin_area) exclude('council area');
    else if (base && (p.id === base.id || (p.type === 'town' && P.normaliseName(p.name) === baseNorm && miles < 3))) exclude('the base town');
    else if (!row.inside_outer) exclude(`outside the outer limit (${outer} mi)`);
    else if (p.type === 'district') {
      if (base && p.parent_town_id === base.id) row.reason = `district of ${base.name}`;
      else exclude(`part of ${p.parent_name || 'another town'}`);
    } else if (p.type === 'town') {
      if (p.population != null && p.population >= POPULATION_FLOOR) row.reason = '';
      else if (source === 'client_asked') row.reason = `client asked: under the ${POPULATION_FLOOR.toLocaleString('en-GB')} floor (population ${p.population == null ? 'unknown' : p.population.toLocaleString('en-GB')})`;
      else exclude(`below the ${POPULATION_FLOOR.toLocaleString('en-GB')} floor (population ${p.population == null ? 'unknown' : p.population.toLocaleString('en-GB')})`);
    } else exclude(`type ${p.type}`);
    byId.set(p.id, row);
    return row;
  };
  // The client's own towns first, so a typed village is judged with the floor waived (a place
  // seen once keeps its first judgement)
  const unmatched = [];
  for (const a of clientAsked) {
    if (!a.match) { unmatched.push({ typed: a.typed, note: a.note || 'no place of that name in the places table' }); continue; }
    const row = consider({ ...a.match, km: a.match.km != null ? a.match.km : 0 }, 'client_asked');
    row.typed = a.typed;
    if (a.match.is_admin_area) { row.status = 'excluded'; row.reason = 'council area (typed by the client)'; }
  }
  for (const p of places) consider(p, 'scored');
  const rows = [...byId.values()].sort((x, y) => (x.status === y.status ? x.miles - y.miles : x.status === 'candidate' ? -1 : 1));
  return { rows, unmatched, reach, outer };
}

// ── The keyword plan ──
// For every candidate town: the location page's keywords ("[primary] [town]" and its approved
// synonyms, as the H1 research asks for them) and one set per category. The primary category's
// location category keywords are the location page's, so they are not asked twice.
// categories: [{ key, name, primary }]; ctx: the page map context (primaryName, primaryKey,
// categoryName, terms). Returns { pages: [{ place_id, town, page, category_key, category, keywords, serp_keyword }], keywords }
function keywordPlan({ towns, categories, ctx }) {
  const pages = [];
  const all = new Set();
  for (const t of towns) {
    const loc = C.candidatesV2({ type: 'location', title: t.name, info: { town: t.name } }, ctx).map(c => c.keyword);
    const own = keywordOf(`${ctx.primaryName || ''} ${t.name}`);
    pages.push({ place_id: t.place_id, town: t.name, page: 'location', category_key: ctx.primaryKey || null, category: ctx.primaryName || '', keywords: loc, serp_keyword: loc[0] || own });
    for (const c of categories) {
      if (c.key && c.key === ctx.primaryKey) continue;
      const kws = C.candidatesV2({ type: 'location_category', title: `${c.name} ${t.name}`, info: { town: t.name, category_key: c.key } }, ctx).map(x => x.keyword);
      pages.push({ place_id: t.place_id, town: t.name, page: 'location_category', category_key: c.key, category: c.name, keywords: kws, serp_keyword: kws[0] || keywordOf(`${c.name} ${t.name}`) });
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

// ── Competitor pages ──
// items: DataForSEO organic items ({ type, url, domain, title, rank_group }); town: the town's
// name; excluded: the registrable domains that never count. A page counts when its domain is
// not excluded and its URL or title holds the town's name.
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

// The demand gate: pass on volume, else on competitor pages; { pass, by, volume, competitors }
function demandGate({ volume, competitors }) {
  if (volume != null && volume >= DEMAND_VOLUME) return { pass: true, by: 'volume', volume, competitors: competitors == null ? null : competitors };
  if (competitors != null && competitors >= DEMAND_COMPETITORS) return { pass: true, by: 'competitors', volume, competitors };
  return { pass: false, by: null, volume, competitors: competitors == null ? null : competitors };
}

// ── Cost estimate ──
// keywords to buy (not in the cache) × the average cost per keyword from past rows (else the
// live task price over 1,000); SERP queries × the SERP price. Both shown before any call.
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

module.exports = { ALLOWED_TRAVEL, REACH_MILES, OUTER_CAP_MILES, POPULATION_FLOOR, DEMAND_VOLUME, DEMAND_COMPETITORS, TIER1_BAND, GBP_AREA_LIMIT, KM_PER_MILE, SERP_COST_USD, VOLUME_TASK_COST_USD,
  leadingNumber, parseTravel, reachMiles, outerLimitMiles, tier1Band, scanReachMiles, candidates, keywordPlan, bestVolume, competitorPages, isExcludedDomain, mentionsTown, demandGate, estimate };
