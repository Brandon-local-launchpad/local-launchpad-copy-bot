'use strict';

// ── H1 research v2: every page type, keyword groups, one page per group ─────
// Pure, no network, no database (Brandon, 19 Oct 2026).
//   - every page type is researched, service pages included
//   - a winner above 10 searches a month is applied at once (h1_source "research"); with no
//     usable data the standard pattern is applied ("pattern"): homepage "<primary category>
//     <base town>", category "<category> <base town>", location "<primary category> <town>",
//     location category "<category> <town>", service "<service> <base town>"
//   - no two pages target the same keyword GROUP. A group joins keywords that normalise alike
//     (lower case, no punctuation, singular/plural, "in" and "near me" dropped, word order
//     ignored), and keywords Google Ads reports with identical volume AND identical CPC (close
//     variants it merges), the latter only when both have a CPC. "Service(s)" is NOT dropped
//     (Brandon, 19 Oct 2026): "lawn care service romsey" and "lawn care romsey" are one group
//     only when their figures are identical
//   - claims: H1s that research must not change (manual, or a page past H1 Added) claim first;
//     then pages take groups by their own preference (highest volume, ties to the first-listed
//     candidate); a contested group goes to (a) the page whose own name gives that exact
//     keyword, then one whose own name only normalises into the group, then a synonym, (b) page type: homepage, category, service, location, location category,
//     (c) plan order. A losing page takes its next best unclaimed group above 10, else the
//     pattern; a pattern that collides with another page's H1 is an "H1 conflict" left empty.
//   - hub pages (Brandon, 19 Oct 2026): where a town has a location category page for the
//     primary category, that page owns "<primary category> <town>". The town's location page does
//     not compete for that keyword group: it takes its best other candidate above 10 searches (a
//     synonym), else the hub pattern "<Primary Category> Services in and around <Town>" ("Services"
//     never doubled). Marked "hub page", never a conflict.
//   - the same between the homepage and the primary category's category page: the homepage owns
//     "<primary category> <base town>"; the category page takes its best other candidate above 10,
//     else "<Category> Services in and around <Base Town>". Marked "primary category page:
//     keyword owned by the homepage", never a conflict. A manual H1 still claims first.
//   - every decision carries its reason; grouping is inferred from Google Ads reporting, so the
//     reason always says why two keywords were treated as one.

const { keywordOf, displayOf, titleCase, MIN_USABLE } = require('./research');

// Town service pages (page map v3, Brandon, 19 Oct 2026) join last: they exist only where
// "<service> <town>" is a usable keyword nobody above them holds
const TYPE_ORDER = { homepage: 0, category: 1, service: 2, location: 3, location_category: 4, town_service: 5 };
const TYPE_WORD = { homepage: 'homepage', category: 'category page', service: 'service page', location: 'location page', location_category: 'location category page', town_service: 'town service page' };
const pageLabel = r => (r.type === 'homepage' ? 'the homepage' : `${TYPE_WORD[r.type]} "${r.title}"`);
const DROP = new Set(['in', 'near', 'me']);
const stem = w => (w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1') : w);

// "Gardeners in Southampton" → "gardener southampton"; "gardener services southampton" stays apart
function normalise(keyword) {
  return keywordOf(keyword).split(' ').map(stem).filter(w => w && !DROP.has(w)).sort().join(' ');
}

// Groups over every keyword in play: union by normalised text, and by identical volume and CPC
// when both CPCs are known. Returns { groupOf(keyword), why(a, b) }.
function buildGroups(keywords, volumes) {
  const parent = new Map();
  const find = k => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  const union = (a, b) => { const x = find(a), y = find(b); if (x !== y) parent.set(x, y); };
  const list = [...new Set(keywords.map(keywordOf).filter(Boolean))];
  for (const k of list) parent.set(k, k);
  const byNorm = new Map(), byFigures = new Map();
  for (const k of list) {
    const n = normalise(k);
    if (byNorm.has(n)) union(k, byNorm.get(n)); else byNorm.set(n, k);
    const v = volumes.get(k);
    if (v && v.volume != null && v.cpc != null) {
      const f = `${v.volume}|${v.cpc}`;
      if (byFigures.has(f)) union(k, byFigures.get(f)); else byFigures.set(f, k);
    }
  }
  const groupOf = k => { const kw = keywordOf(k); if (!parent.has(kw)) parent.set(kw, kw); return find(kw); };
  const why = (a, b) => {
    if (normalise(a) === normalise(b)) return 'the same words once plurals, word order, "in" and "near me" are ignored';
    const x = volumes.get(keywordOf(a)), y = volumes.get(keywordOf(b));
    if (x && y && x.cpc != null && x.volume === y.volume && x.cpc === y.cpc) return `identical Google Ads figures (${x.volume}/mo, CPC ${x.cpc}): treated as close variants`;
    return 'linked through other keywords in the same group';
  };
  return { groupOf, why };
}

// Candidates for one row, each with its fit: "own" (the page's standard pattern, built from its
// own category or service name; for the homepage and location pages, the primary category) or
// "synonym" (an approved extra word). The first candidate is the page's pattern. A name already
// ending in "Service" gets "…services <town>" as its second, never "service services".
function candidatesV2(row, ctx) {
  const info = row.info || {};
  const terms = ctx.terms || {};
  const make = (name, key, town, sitewide) => {
    // "Gutter Cleaning Service" → "gutter cleaning services <town>", never "service services"
    const last = keywordOf(name).split(' ').pop();
    const plural = last === 'services' ? null : last === 'service' ? `${name}s` : `${name} services`;
    const own = [keywordOf(`${name} ${town}`), plural && keywordOf(`${plural} ${town}`)].filter(Boolean);
    const syn = [...(key ? terms[key] || [] : []), ...(sitewide ? terms._sitewide || [] : [])].map(t => keywordOf(`${t} ${town}`));
    const seen = new Set();
    return [...own.map(k => ({ keyword: k, fit: 'own' })), ...syn.map(k => ({ keyword: k, fit: 'synonym' }))].filter(c => c.keyword && !seen.has(c.keyword) && seen.add(c.keyword));
  };
  if (row.type === 'homepage') return ctx.primaryName ? make(ctx.primaryName, ctx.primaryKey, ctx.baseTown, true) : [];
  if (row.type === 'category') return make(row.title, info.category_key, ctx.baseTown, false);
  if (row.type === 'service') return make(row.title, null, ctx.baseTown, false);
  if (row.type === 'location') return ctx.primaryName ? make(ctx.primaryName, ctx.primaryKey, info.town || row.title, true) : [];
  if (row.type === 'location_category') return make(ctx.categoryName(info.category_key) || row.title, info.category_key, info.town || '', false);
  if (row.type === 'town_service') return make(info.service_name || row.title, null, info.town || '', false);
  return [];
}

// Which pages research may change: not manual, and not past H1 Added
const EDITABLE_STATUS = new Set(['Not Started', 'H1 Added']);
const isLockedDefault = r => r.h1_source === 'manual' || (r.status && !EDITABLE_STATUS.has(r.status));

// rows: the client's applying page-map rows. volumes: Map keyword → { volume, cpc }.
// Returns { decisions: [{ row, source, keyword, h1, volume, cpc, reason, lostTo, candidates, locked, suggests }], groups }
// The hub pattern for a location page: "Gardener Services in and around Romsey"; a name already
// ending in "Services" is not doubled, one ending in "Service" becomes "Services"; Title Case
// (niche files spell "Pest control service")
function hubPattern(primaryName, town) {
  const name = String(primaryName || '').trim();
  const last = name.split(/\s+/).pop().toLowerCase();
  const base = last === 'services' ? name : last === 'service' ? `${name}s` : `${name} Services`;
  return `${titleCase(base)} in and around ${String(town || '').trim()}`;
}

// opts.isLocked: which rows research must not change (default: manual, or past H1 Added).
// The primary category page leaves "<primary> <base town>" to the homepage only when the homepage
// actually holds that keyword group (Brandon, 19 Oct 2026): a manual homepage H1 on other words
// leaves it free. So: resolve once; if the homepage ends up in that group, resolve again with the rule.
function resolve(rows, ctx, volumes, opts = {}) {
  const first = resolveOnce(rows, ctx, volumes, opts, false);
  const home = first.decisions.find(d => d.row.type === 'homepage');
  if (first.primaryPage && home && home.h1 && first.primaryGroup && first.groupOf(home.h1) === first.primaryGroup) return resolveOnce(rows, ctx, volumes, opts, true);
  return first;
}

function resolveOnce(rows, ctx, volumes, opts, primaryRule) {
  const isLocked = opts.isLocked || isLockedDefault;
  const live = rows.filter(r => r.applies !== false).slice().sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || (a.sort_order || 0) - (b.sort_order || 0));
  const plan = new Map(live.map((r, i) => [r.page_key, i]));
  const cands = new Map(live.map(r => [r.page_key, candidatesV2(r, ctx)]));
  const all = [...live.flatMap(r => cands.get(r.page_key).map(c => c.keyword)), ...live.filter(r => r.h1).map(r => keywordOf(r.h1))];
  const G = buildGroups(all, volumes);
  const vol = k => volumes.get(k) || { volume: null, cpc: null };

  // 1. Locked H1s claim their group first (manual always keeps its keyword)
  const claim = new Map(); // group → { row, keyword, how }
  const locked = live.filter(isLocked);
  for (const r of locked) if (r.h1) { const g = G.groupOf(r.h1); if (!claim.has(g)) claim.set(g, { row: r, keyword: keywordOf(r.h1), how: r.h1_source === 'manual' ? 'manual' : 'locked' }); }

  // Pages that leave one keyword group to another page: { group, note, pattern }
  //   a location page whose town has a location category page for the primary category (hub page)
  //   the primary category's category page, whose "<primary> <base town>" is the homepage's
  const hubs = new Map();
  const patternGroup = owner => { const c = cands.get(owner.page_key)[0]; return c ? G.groupOf(c.keyword) : null; };
  for (const r of live.filter(x => x.type === 'location')) {
    const town = (r.info || {}).town || r.title;
    const owner = ctx.primaryKey && live.find(x => x.type === 'location_category' && (x.info || {}).category_key === ctx.primaryKey && ((x.info || {}).town || '') === town);
    if (owner) hubs.set(r.page_key, { group: patternGroup(owner), note: `hub page: ${ctx.primaryName} keyword owned by ${pageLabel(owner)}`, pattern: hubPattern(ctx.primaryName, town) });
  }
  const home = live.find(x => x.type === 'homepage');
  const primaryGroup = home ? patternGroup(home) : null;
  const primaryPage = live.find(x => x.type === 'category' && ctx.primaryKey && (x.info || {}).category_key === ctx.primaryKey);
  for (const r of primaryRule && primaryPage ? [primaryPage] : []) {
    if (primaryGroup) hubs.set(r.page_key, { group: patternGroup(home), note: 'primary category page: keyword owned by the homepage', pattern: hubPattern(ctx.categoryName(ctx.primaryKey) || r.title, ctx.baseTown) });
  }

  // 2. Research: each page's options are its candidates' groups with more than 10 searches,
  // best first (highest volume, ties to the first-listed); a contested group goes to the best fit
  const open = live.filter(r => !isLocked(r));
  const options = new Map();
  for (const r of open) {
    const byGroup = new Map();
    // A hub page leaves the owner's keyword group alone
    const hub = hubs.get(r.page_key);
    cands.get(r.page_key).forEach((c, i) => {
      const v = vol(c.keyword);
      if (v.volume == null || v.volume <= MIN_USABLE) return;
      const g = G.groupOf(c.keyword);
      if (hub && g === hub.group) return;
      const cur = byGroup.get(g);
      // Within a group keep the page's best candidate. Fit: "own" when that keyword is built from the
      // page's own name, "variant" when only another of its own keywords is in the group ("Lawn Care
      // Service" normalises like "Lawn care"), else "synonym"
      const ownHere = (cur && cur.ownHere) || c.fit === 'own';
      if (!cur || v.volume > cur.volume) byGroup.set(g, { group: g, keyword: c.keyword, volume: v.volume, cpc: v.cpc, order: i, kwFit: c.fit, ownHere });
      else cur.ownHere = ownHere;
    });
    for (const o of byGroup.values()) o.fit = o.kwFit === 'own' ? 'own' : o.ownHere ? 'variant' : 'synonym';
    options.set(r.page_key, [...byGroup.values()].sort((a, b) => b.volume - a.volume || a.order - b.order));
  }
  const FIT = { own: 0, variant: 1, synonym: 2 };
  const rank = (r, o) => [FIT[o.fit], TYPE_ORDER[r.type], plan.get(r.page_key)];
  const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
  const holder = new Map(); // group → { row, opt }
  const next = new Map(open.map(r => [r.page_key, 0]));
  const queue = open.slice();
  while (queue.length) {
    const r = queue.shift();
    const opts = options.get(r.page_key);
    let i = next.get(r.page_key);
    while (i < opts.length) {
      const o = opts[i++];
      if (claim.has(o.group)) continue; // a locked or manual H1 has it
      const h = holder.get(o.group);
      if (!h) { holder.set(o.group, { row: r, opt: o }); break; }
      if (better(rank(r, o), rank(h.row, h.opt))) { holder.set(o.group, { row: r, opt: o }); queue.unshift(h.row); break; } // the loser resumes at its next option
    }
    next.set(r.page_key, i);
  }
  const won = new Map([...holder.values()].map(h => [h.row.page_key, h.opt]));

  // 3. Pattern for pages without a usable group; a pattern colliding with any claim is a conflict
  const taken = new Map([...claim.entries()].map(([g, c]) => [g, c.row]));
  for (const [g, h] of holder) taken.set(g, h.row);
  const decisions = [];
  for (const r of live) {
    const list = cands.get(r.page_key);
    const scored = list.map(c => ({ ...c, ...vol(c.keyword), group: G.groupOf(c.keyword) }));
    const lostTo = [];
    const d = { row: r, candidates: scored, lostTo };
    if (isLocked(r)) {
      // Research never changes it; say what it would pick now
      Object.assign(d, { source: r.h1_source === 'manual' ? 'manual' : 'locked', keyword: r.h1 ? keywordOf(r.h1) : null, h1: r.h1 || '', reason: r.h1_source === 'manual' ? 'set by a person: never changed' : `status ${r.status}: research never changes the H1 now` });
      const top = scored.filter(s => s.volume != null && s.volume > MIN_USABLE).sort((a, b) => b.volume - a.volume || 0)[0];
      if (top && r.h1 && G.groupOf(top.keyword) !== G.groupOf(r.h1)) d.suggests = displayOf(top.keyword);
      decisions.push(d);
      continue;
    }
    const opts = options.get(r.page_key) || [];
    const mine = won.get(r.page_key);
    const hub = hubs.get(r.page_key);
    if (hub) d.hub = hub.note;
    for (const o of opts) {
      if (mine && o.group === mine.group) break;
      const by = claim.has(o.group) ? claim.get(o.group).row : (holder.get(o.group) || {}).row;
      if (by && by !== r) lostTo.push({ keyword: o.keyword, volume: o.volume, by: pageLabel(by), why: G.why(o.keyword, (claim.get(o.group) || {}).keyword || holder.get(o.group).opt.keyword) });
    }
    if (mine) {
      const v = vol(mine.keyword);
      Object.assign(d, { source: 'research', keyword: mine.keyword, h1: displayOf(mine.keyword), volume: v.volume, cpc: v.cpc,
        reason: `${mine.volume}/mo${lostTo.length ? `, after losing ${lostTo.map(l => `"${l.keyword}" (${l.volume}/mo) to ${l.by}`).join('; ')}` : opts.length > 1 ? `, the highest of ${opts.length} usable candidates` : ', the only candidate above 10 searches a month'}${d.hub ? ` (${d.hub})` : ''}` });
    } else if (hub) {
      // Hub pattern: never the owner's keyword, never a conflict with its owner
      const text = hub.pattern;
      const kw = keywordOf(text);
      const g = G.groupOf(kw);
      const other = taken.get(g);
      if (other && other !== r) Object.assign(d, { source: 'conflict', keyword: kw, h1: '', claimedBy: pageLabel(other), reason: `the hub pattern "${text}" is already the H1 of ${pageLabel(other)}: choose an H1 by hand (${d.hub})` });
      else { taken.set(g, r); Object.assign(d, { source: 'pattern', keyword: kw, h1: text, volume: null, cpc: null, reason: `${d.hub}; no other keyword above 10 searches a month, so "${text}" is used${lostTo.length ? ` (lost ${lostTo.map(l => `"${l.keyword}" (${l.volume}/mo) to ${l.by}`).join('; ')})` : ''}` }); }
    } else {
      const pattern = list[0];
      if (!pattern) { Object.assign(d, { source: 'conflict', keyword: null, h1: '', reason: 'no candidates (no primary category)' }); decisions.push(d); continue; }
      const g = G.groupOf(pattern.keyword);
      const other = taken.get(g);
      const noData = opts.length ? `every usable keyword was claimed by another page: ${lostTo.map(l => `"${l.keyword}" (${l.volume}/mo) by ${l.by}`).join('; ')}` : 'no keyword above 10 searches a month';
      if (other && other !== r) {
        Object.assign(d, { source: 'conflict', keyword: pattern.keyword, h1: '', claimedBy: pageLabel(other), reason: `${noData}; the pattern "${displayOf(pattern.keyword)}" is already the H1 of ${pageLabel(other)} (${G.why(pattern.keyword, other.h1 || (holder.get(g) || {}).opt && holder.get(g).opt.keyword || pattern.keyword)}): choose an H1 by hand` });
      } else {
        taken.set(g, r);
        const v = vol(pattern.keyword);
        Object.assign(d, { source: 'pattern', keyword: pattern.keyword, h1: displayOf(pattern.keyword), volume: v.volume, cpc: v.cpc, reason: `${noData}: the standard pattern is used` });
      }
    }
    decisions.push(d);
  }
  return { decisions, groupOf: G.groupOf, why: G.why, primaryGroup, primaryPage: !!primaryPage };
}

module.exports = { normalise, buildGroups, candidatesV2, resolve, isLocked: isLockedDefault, EDITABLE_STATUS, hubPattern, TYPE_ORDER, pageLabel };
