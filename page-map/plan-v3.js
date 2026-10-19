'use strict';

// ── Page map v3: the services list rules, town service pages, the link planner ──
// Spec: docs "Local Service Site Page Structure" (Brandon, 19 Oct 2026). Pure: no network,
// no database. The H1 rules themselves stay in h1-research/claims.js; this module decides
// WHICH pages exist and WHAT each links to.
//
// Services list, three rules in order, before any page is planned:
//   1. Dedupe: names that normalise alike (plural, "services", "&" as "and", word order, case)
//      are one service; the shorter name is kept, merged_from records the rest, and the
//      parents of both are kept so both category pages link to the one page.
//   2. Fold: a service whose "<service> <base town>" keyword falls into the same keyword group
//      as any candidate of a category (its own name or a synonym), or whose name IS a category
//      name, is not a page: it is listed on that category page, which keeps the keyword.
//   3. Page or mention (Brandon, 20 Oct 2026): every remaining service gets a base page by
//      default. A service a person excluded at intake is mentioned instead: one line on its
//      category page, no card, no page. Volume still decides the H1 and the town service pages,
//      and sets copy_priority (the service's best volume anywhere, else 0) for copy generation.
// Town service pages: /locations/<town>/<service>, only where "<service> <town>" is usable AND
// the page wins that keyword under the ownership rules (never on pattern alone).
// Links: base pages link wide, town pages link tight (planLinks below).

const { keywordOf, MIN_USABLE } = require('../h1-research/research');
const C = require('../h1-research/claims');

const TYPES = ['homepage', 'category', 'service', 'location', 'location_category', 'town_service'];
const TYPE_LABEL = { homepage: 'Homepage', category: 'Category', service: 'Service', location: 'Location', location_category: 'Location Category', town_service: 'Town Service' };
const usable = v => !!v && v.volume != null && v.volume > MIN_USABLE;

// The dedupe key: the keyword normalisation plus "service(s)" dropped ("Gardening services"
// and "Gardening" are one service; keywords keep the word, see claims.js)
const dedupeKey = name => C.normalise(name).split(' ').filter(w => w !== 'service').join(' ');

// Every service on the client's tabs, once, with all its parent categories in tab order
function collectServices(resolved) {
  const map = new Map();
  for (const c of resolved.categories) for (const r of c.rows) {
    if (!map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, kind: r.kind, home: r.home || null, parents: [] });
    if (!map.get(r.id).parents.includes(c.key)) map.get(r.id).parents.push(c.key);
  }
  return [...map.values()];
}

// Rule 1
function dedupe(services) {
  const groups = new Map();
  for (const s of services) { const k = dedupeKey(s.name); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
  const out = [];
  for (const members of groups.values()) {
    const keep = members.slice().sort((a, b) => a.name.length - b.name.length)[0];
    const others = members.filter(m => m !== keep);
    const parents = [...new Set(members.flatMap(m => m.parents))];
    out.push({ ...keep, parents, merged_from: others.map(o => o.name), merged_ids: others.map(o => o.id), outcome: null, into: null, reason: null });
    for (const o of others) out.push({ ...o, outcome: 'merged', into: keep.id, intoName: keep.name, reason: `the same service as "${keep.name}" once plurals, "services", "&" and word order are ignored; "${keep.name}" is the shorter name and keeps both categories` });
  }
  return out;
}

// Rule 2. cats: [{ key, name }] with tabs; G: claims.buildGroups over every keyword in play
function fold(services, cats, ctx, G) {
  const catGroups = cats.map(c => {
    const byGroup = new Map();
    for (const x of C.candidatesV2({ type: 'category', title: c.name, info: { category_key: c.key } }, ctx)) { const g = G.groupOf(x.keyword); if (!byGroup.has(g)) byGroup.set(g, x); }
    return { c, byGroup, norm: C.normalise(c.name) };
  });
  for (const s of services) {
    if (s.outcome) continue;
    const kw = keywordOf(`${s.name} ${ctx.baseTown}`);
    const g = G.groupOf(kw);
    const hits = catGroups.filter(x => x.byGroup.has(g) || x.norm === C.normalise(s.name));
    if (!hits.length) continue;
    const hit = hits.find(h => s.parents.includes(h.c.key)) || hits[0];
    const cand = hit.byGroup.get(g);
    s.outcome = 'folded'; s.into = hit.c.key; s.intoName = hit.c.name;
    s.reason = hit.norm === C.normalise(s.name) && !cand ? `its name is the category name "${hit.c.name}"`
      : `"${kw}" is in the same keyword group as the ${hit.c.name} category's candidate "${cand.keyword}"${cand.fit === 'synonym' ? ' (an approved synonym)' : ''}: ${G.why(kw, cand.keyword)}. The category keeps the keyword`;
  }
  return services;
}

// Rule 3. towns: [names]; vol(keyword) → { volume, cpc }; exclude: Set of service ids a person
// excluded at intake. copy_priority: the best volume among the service's base-town candidates and
// its "<service> <town>" keywords, else 0.
function pageOrMention(services, towns, ctx, vol, exclude = new Set()) {
  for (const s of services) {
    if (s.outcome) continue;
    const base = C.candidatesV2({ type: 'service', title: s.name, info: {} }, ctx).map(c => ({ ...c, ...vol(c.keyword) })).filter(usable).sort((a, b) => b.volume - a.volume);
    const townHits = towns.map(t => ({ town: t, keyword: keywordOf(`${s.name} ${t}`), ...vol(keywordOf(`${s.name} ${t}`)) })).filter(usable);
    s.townVolumes = townHits;
    s.copy_priority = Math.max(0, ...base.map(b => b.volume), ...townHits.map(h => h.volume));
    if (exclude.has(s.id) || (s.merged_ids || []).some(id => exclude.has(id))) { s.outcome = 'mentioned'; s.reason = 'excluded at intake'; }
    else if (base.length) { s.outcome = 'page'; s.reason = `a page by default; "${base[0].keyword}" has ${base[0].volume} searches a month in ${ctx.baseTown}`; }
    else if (townHits.length) { s.outcome = 'page'; s.reason = `a page by default; no usable keyword in ${ctx.baseTown}, but ${townHits.map(h => `"${h.keyword}" has ${h.volume}/mo`).join(', ')}`; }
    else { s.outcome = 'page'; s.reason = `a page by default; no keyword above ${MIN_USABLE} searches a month in ${ctx.baseTown} or any town, so the pattern H1 applies and copy_priority is 0`; }
  }
  return services;
}

// Every keyword the three rules and the research need, for one call: category candidates,
// each service's base candidates, and "<service> <town>" (plus "<service> services <town>")
function keywordsFor(services, cats, towns, ctx, { townVariants = true } = {}) {
  const out = new Set();
  for (const c of cats) for (const x of C.candidatesV2({ type: 'category', title: c.name, info: { category_key: c.key } }, ctx)) out.add(x.keyword);
  for (const s of services) {
    if (s.outcome === 'merged' || s.outcome === 'folded') continue;
    for (const x of C.candidatesV2({ type: 'service', title: s.name, info: {} }, ctx)) out.add(x.keyword);
    for (const t of towns) {
      if (townVariants) for (const x of C.candidatesV2({ type: 'town_service', title: `${s.name} ${t}`, info: { town: t, service_name: s.name } }, ctx)) out.add(x.keyword);
      else out.add(keywordOf(`${s.name} ${t}`));
    }
  }
  return [...out];
}

// The location and location category pages' own candidates (synonyms included), so one call
// covers everything the H1 rules will ask for
function pageKeywords(cats, towns, ctx) {
  const out = new Set();
  for (const t of towns) {
    for (const x of C.candidatesV2({ type: 'location', title: t, info: { town: t } }, ctx)) out.add(x.keyword);
    for (const c of cats) for (const x of C.candidatesV2({ type: 'location_category', title: `${c.name} ${t}`, info: { town: t, category_key: c.key } }, ctx)) out.add(x.keyword);
  }
  if (ctx.primaryName) for (const x of C.candidatesV2({ type: 'homepage', title: 'Homepage', info: {} }, ctx)) out.add(x.keyword);
  return [...out];
}

// ── The link planner ──
// Each page gets sections: breadcrumb, cards, areas, more, body, parents (extra category links
// for a service on two tabs), mentioned (names, no link). Anchor text is the plain service or
// category name everywhere; never a destination H1. links_to is the union; links_from is the inverse.
function planLinks(rows, services) {
  const live = rows.filter(r => r.applies !== false);
  const by = { category: new Map(), service: new Map(), location: new Map(), location_category: new Map(), town_service: new Map() };
  for (const r of live) {
    const i = r.info || {};
    if (r.type === 'category') by.category.set(i.category_key, r);
    if (r.type === 'service') by.service.set(i.service_id, r);
    if (r.type === 'location') by.location.set(i.town, r);
    if (r.type === 'location_category') by.location_category.set(`${i.town}|${i.category_key}`, r);
    if (r.type === 'town_service') by.town_service.set(`${i.town}|${i.service_id}`, r);
  }
  const home = live.find(r => r.type === 'homepage');
  const cats = live.filter(r => r.type === 'category');
  const locs = live.filter(r => r.type === 'location');
  const link = (r, anchor) => (r ? { to: r.slug, anchor: anchor || r.title } : null);
  const svcName = r => (r.info && r.info.service_name) || r.title;
  // Paged services of a category, in plan order; mentioned and folded names for its text line
  const catServices = key => live.filter(r => r.type === 'service' && (r.info.parent_keys || []).includes(key));
  const catMentioned = key => services.filter(s => (s.outcome === 'mentioned' && s.parents.includes(key)) || (s.outcome === 'folded' && s.into === key)).map(s => s.name);
  const bc = r => (r.info.category_key && r.info.parent_keys ? by.category.get(r.info.category_key) || by.category.get(r.info.parent_keys[0]) : by.category.get(r.info.category_key));
  const plan = new Map();
  for (const r of live) {
    const i = r.info || {};
    const L = { breadcrumb: [], cards: [], areas: [], more: [], body: [], parents: [], mentioned: [] };
    if (r.type === 'homepage') {
      L.cards = cats.map(c => link(c));
      L.areas = locs.map(l => link(l));
    } else if (r.type === 'category') {
      L.breadcrumb = [link(home, 'Home')];
      L.cards = catServices(i.category_key).map(s => link(s));
      L.areas = locs.map(l => link(by.location_category.get(`${l.info.town}|${i.category_key}`), l.info.town)).filter(Boolean);
      L.mentioned = catMentioned(i.category_key);
    } else if (r.type === 'service') {
      const parents = (i.parent_keys || []).map(k => by.category.get(k)).filter(Boolean);
      const crumb = parents[0];
      L.breadcrumb = [link(home, 'Home'), link(crumb)].filter(Boolean);
      L.parents = parents.slice(1).map(c => link(c));
      L.areas = locs.map(l => link(by.town_service.get(`${l.info.town}|${i.service_id}`) || (crumb && by.location_category.get(`${l.info.town}|${crumb.info.category_key}`)), l.info.town)).filter(Boolean);
      L.more = [...new Set(parents.flatMap(c => catServices(c.info.category_key)))].filter(s => s !== r).map(s => link(s));
    } else if (r.type === 'location') {
      L.breadcrumb = [link(home, 'Home')];
      L.cards = cats.map(c => link(by.location_category.get(`${i.town}|${c.info.category_key}`), c.title)).filter(Boolean);
      // Brandon's prompt (19 Oct): sibling location pages in the areas block. The spec doc says a
      // town page never links to another town; asked, see the dry run report.
      L.areas = locs.filter(l => l !== r).map(l => link(l));
    } else if (r.type === 'location_category') {
      L.breadcrumb = [link(home, 'Home'), link(by.location.get(i.town)), link(by.category.get(i.category_key))].filter(Boolean);
      L.cards = catServices(i.category_key).map(s => link(by.town_service.get(`${i.town}|${s.info.service_id}`) || s, s.title));
      L.more = cats.filter(c => c.info.category_key !== i.category_key).map(c => link(by.location_category.get(`${i.town}|${c.info.category_key}`), c.title)).filter(Boolean);
      L.mentioned = catMentioned(i.category_key);
    } else if (r.type === 'town_service') {
      const base = by.service.get(i.service_id);
      const lc = by.location_category.get(`${i.town}|${i.category_key}`);
      L.breadcrumb = [link(home, 'Home'), link(by.location.get(i.town)), link(lc, lc && by.category.get(i.category_key) ? by.category.get(i.category_key).title : undefined)].filter(Boolean);
      L.body = [link(base, svcName(r))].filter(Boolean);
      L.more = (i.parent_keys || []).flatMap(k => catServices(k)).filter((s, n, a) => a.indexOf(s) === n && s !== base)
        .map(s => link(by.town_service.get(`${i.town}|${s.info.service_id}`) || s, s.title));
      L.areas = []; // villages and neighbourhoods, unlinked
    }
    plan.set(r.page_key, L);
  }
  // links_to and links_from
  const from = new Map(live.map(r => [r.slug, new Set()]));
  for (const r of live) {
    const L = plan.get(r.page_key);
    const targets = [...new Set([...L.breadcrumb, ...L.cards, ...L.areas, ...L.more, ...L.body, ...L.parents].map(x => x.to))];
    r.links_to = targets;
    r.links = L;
    for (const t of targets) if (from.has(t)) from.get(t).add(r.slug);
  }
  for (const r of live) r.links_from = [...from.get(r.slug)];
  return rows;
}

module.exports = { TYPES, TYPE_LABEL, dedupeKey, collectServices, dedupe, fold, pageOrMention, keywordsFor, pageKeywords, planLinks, usable };
