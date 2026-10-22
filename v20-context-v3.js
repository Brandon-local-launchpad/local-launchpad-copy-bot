'use strict';
// The homepage's inputs from the v3 page map and the hand set-up (Brandon, 21 Oct 2026),
// instead of the uploaded page map and custom values CSVs.
//
// It gives the decisions engine, the generator, the validator, the allocation pass and the
// FAQ sorting the same three structures they already read, so nothing downstream changes shape:
//   pages            the old page map rows (pageType, pageTitle, urlSlug, h1, status …)
//   keyValueMap      category_N, service_N, biz_area_N
//   serviceParentMap service_N → the category it sits under
// plus cardServices: the 2 or 3 services each category card names, picked here from the
// category's own base service pages (decisions.js uses it instead of pickCardServices).
//
// Rules:
// - pages: the homepage, category, service and location rows that still apply, plus the
//   location category rows (never linkable from the homepage, kept for the allocation pass).
//   Town service pages are left out: the homepage never links them.
// - a phase 2 page is "Not built" for the homepage: its town is plain text in the areas list
//   and it is never a LINKABLE PAGE. Phase 1 pages keep the v3 status (Not Started and
//   H1 Added count as Launching, as the old CSV statuses did).
// - categories: the category rows, in page map order. Services: the service rows (the
//   library's UK names; the page's own title), one key each, under the first parent tab.
//   Areas: the base town, then the other towns as the hand set-up lists them.
// - cards: one per category page, in page map order (decisions.js builds them from the
//   category rows when cardServices is given). A card's pool is the base service pages
//   under that category (phase 1). Each service sits in one card: the first card whose
//   niche core list names it, else its first parent's card. Within a card: jobs_wanted
//   first, then the niche's core services order, then by copy_priority (its best search
//   volume), then page map order; 3 at most. No service_words translation: the page title
//   is the name the site uses.

const { cleanTowns } = require('./page-map/slugs');

const lc = s => String(s || '').toLowerCase().trim();

// rows: client_page_map rows (store.saved), applies or not; hand: { baseTown, otherTowns }
// cv: client values (jobs_wanted); niche: the niche entry (core_services)
function contextFromPageMap({ rows, hand, cv = {}, niche = {} }) {
  const live = (rows || []).filter(r => r.applies !== false);
  const byType = t => live.filter(r => r.type === t);
  const cats = byType('category');
  const catName = new Map(cats.map(c => [c.info.category_key, c.title]));
  const phase = r => (r.info && r.info.phase) || 1;
  const status = r => (phase(r) === 2 ? 'Not built' : (r.status || 'Not Started'));

  const pages = [];
  for (const r of live) {
    if (r.type === 'town_service') continue;
    const pageType = r.type === 'location_category' ? 'location-category' : r.type;
    pages.push({
      pageType,
      pageTitle: r.title,
      urlSlug: r.slug,
      h1: r.h1 || '',
      status: status(r),
      v3: { phase: phase(r), status: r.status, h1_source: r.h1_source, copy_priority: (r.info && r.info.copy_priority) || 0, parent_keys: (r.info && r.info.parent_keys) || [] },
      assignedNeighbourhoods: [],
      assignedSymptoms: {},
      locationCategoryName: pageType === 'location-category' ? catName.get(r.info.category_key) || null : null,
      locationName: pageType === 'location-category' ? r.info.town || '' : null,
    });
  }

  const keyValueMap = {};
  const serviceParentMap = {};
  cats.forEach((c, i) => { keyValueMap[`category_${i + 1}`] = c.title; });
  // One service_N entry per service and parent tab (22 Oct: a service under three
  // categories, like Lawn seeding, is confirmed under each; the client block, the validator
  // and the claims review list it under all of them, as the old sheets did with DUPLICATE rows)
  const services = byType('service');
  let n = 0;
  for (const s of services) {
    const parents = (s.info.parent_keys || []).map(k => catName.get(k)).filter(Boolean);
    for (const parent of (parents.length ? parents : [cats[0]?.title || ''])) {
      const key = `service_${++n}`;
      keyValueMap[key] = s.title;
      serviceParentMap[key] = parent;
    }
  }
  // Folded services (the category page lists them, no page of their own): confirmed, so the
  // copy may name them (driveways under Paving Contractor), never as a card's service
  let m = 0;
  const seenMention = new Set(services.map(s => lc(s.title)));
  for (const c of cats) for (const name of ((c.info.links && c.info.links.mentioned) || [])) {
    if (seenMention.has(lc(name))) continue;
    seenMention.add(lc(name));
    const key = `mentioned_${++m}`;
    keyValueMap[key] = name;
    serviceParentMap[key] = c.title;
  }
  const towns = cleanTowns(hand.baseTown, hand.otherTowns).towns.map(t => (typeof t === 'string' ? t : t.name));
  [hand.baseTown, ...towns].filter(Boolean).forEach((t, i) => { keyValueMap[`biz_area_${i + 1}`] = t; });

  return { pages, keyValueMap, serviceParentMap, cardServices: pickCardServices({ cats, services, cv, niche, catName }), source: 'page_map_v3' };
}

// The services each category card names. Returns { [category name lower]: [names] } and,
// for reporting, the pool each card drew from ({ [category name lower]: [{ name, why }] }).
function pickCardServices({ cats, services, cv = {}, niche = {}, catName }) {
  const wanted = (cv.jobs_wanted || []).map(lc).filter(Boolean);
  const core = Object.fromEntries(Object.entries(niche.core_services || {}).map(([k, v]) => [lc(k), v.map(lc)]));
  const cardNames = cats.map(c => lc(c.title));
  const live = services.filter(s => ((s.info && s.info.phase) || 1) === 1);
  const parentsOf = s => (s.info.parent_keys || []).map(k => lc(catName.get(k))).filter(p => cardNames.includes(p));
  // Each service sits in one card where it can: the first of its parent cards whose niche
  // core list names it, else its first parent card. (A page under Landscape Gardener never
  // goes to the Gardener card, whatever the core list says.)
  const home = s => {
    const name = lc(s.title);
    const parents = parentsOf(s);
    return parents.find(p => (core[p] || []).includes(name)) || parents[0] || null;
  };
  const wantRank = s => { const n = lc(s.title); const i = wanted.findIndex(w => w === n || (w.length > 3 && (n.includes(w) || w.includes(n)))); return i < 0 ? Infinity : i; };
  const order = name => {
    const coreList = core[name] || [];
    const coreRank = s => { const i = coreList.indexOf(lc(s.title)); return i < 0 ? Infinity : i; };
    return (a, b) => wantRank(a.s) - wantRank(b.s)
      || ((b.s.info.copy_priority || 0) - (a.s.info.copy_priority || 0)) || coreRank(a.s) - coreRank(b.s) || a.i - b.i;
  };
  const picks = {}, pools = {}, toppedUp = {};
  const indexed = live.map((s, i) => ({ s, i }));
  for (const c of cats) {
    const name = lc(c.title);
    pools[name] = indexed.filter(({ s }) => parentsOf(s).includes(name)).map(({ s }) => s.title);
    const mine = indexed.filter(({ s }) => home(s) === name && lc(s.title) !== name).sort(order(name));
    picks[name] = mine.slice(0, 3).map(({ s }) => lc(s.title));
  }
  // A card left with fewer than two (every page under it sits in another card) takes from
  // its own pool, the least used first, so CARD-COUNT (2 or 3 per card) can hold.
  const used = new Map();
  for (const list of Object.values(picks)) for (const n of list) used.set(n, (used.get(n) || 0) + 1);
  for (const c of cats) {
    const name = lc(c.title);
    if (picks[name].length >= 2) continue;
    const extra = indexed.filter(({ s }) => parentsOf(s).includes(name) && lc(s.title) !== name && !picks[name].includes(lc(s.title)))
      .sort((a, b) => (used.get(lc(a.s.title)) || 0) - (used.get(lc(b.s.title)) || 0) || order(name)(a, b));
    for (const { s } of extra) { if (picks[name].length >= 2) break; picks[name].push(lc(s.title)); used.set(lc(s.title), (used.get(lc(s.title)) || 0) + 1); (toppedUp[name] = toppedUp[name] || []).push(lc(s.title)); }
  }
  return { picks, pools, toppedUp };
}

module.exports = { contextFromPageMap, pickCardServices };
