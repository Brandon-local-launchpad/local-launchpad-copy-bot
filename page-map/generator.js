'use strict';

// ── Page map generator (v3) ─────────────────────────────────────────────────
// Pure, no AI, no database. The planned list of every page a site needs, from the
// service resolver's output (fillout/services/resolver.js), the base town, the other
// towns, the company name, and the keyword volumes. Spec: docs "Local Service Site Page
// Structure" (Brandon, 19 Oct 2026):
//   - the services list is cleaned first (page-map/plan-v3.js): names that normalise alike
//     merge, a service whose keyword is a category's candidate folds into that category,
//     and a service gets a base page only with a usable keyword (more than 10 searches a
//     month) in the base town or any town, or a core flag; otherwise it is mentioned
//   - town service pages (/locations/<town>/<service>) exist only where "<service> <town>"
//     is usable AND the page wins that keyword under the H1 ownership rules (claims.js)
//   - links: base pages link wide, town pages link tight (plan-v3.planLinks)
//   - the homepage links to location pages for the other towns only; the base town has
//     no /locations/<base town> page; no cap on other towns; slug collisions are reported,
//     never renamed; "Pushed to WordPress" replaces "Pasted Into GHL"
// Confirmed additional services arrive as resolver rows (kind "additional") and are
// treated like any service; unconfirmed proposals are listed as waiting.

const { isAdminArea } = require('../client-files');
const { keywordOf, searchTerms } = require('../h1-research/research');
const C = require('../h1-research/claims');
const V3 = require('./plan-v3');
const { slugify, pageKey, cleanTowns } = require('./slugs');

const TYPES = ['homepage', 'category', 'service', 'location', 'location_category', 'town_service'];
const TYPE_LABEL = { homepage: 'Homepage', category: 'Category', service: 'Service', location: 'Location', location_category: 'Location Category', town_service: 'Town Service' };
const STATUSES = ['Not Started', 'H1 Added', 'Copy Generated', 'Pushed to WordPress', 'Live'];
// The old PAGE MAP tab's columns, in its order, then the v3 link sections copy generation reads
const CSV_COLUMNS = ['Page Type', 'Page Title', 'URL Slug', 'H1 (Ahrefs)', 'Meta Title', 'Meta Description', 'Links TO', 'Links FROM', 'Status', 'Breadcrumb', 'Cards', 'Areas Block', 'More Services', 'Body Links', 'Mentioned Services'];

// The research context the H1 rules want, from the generator's inputs
function contextFor(input) {
  const cats = input.resolved ? input.resolved.categories : [];
  return {
    primaryName: input.resolved && input.resolved.primaryName, primaryKey: input.resolved && input.resolved.primary,
    baseTown: String(input.baseTown || '').trim(),
    categoryName: key => (cats.find(c => c.key === key) || {}).name,
    terms: input.terms || searchTerms(input.niche),
  };
}

// Every keyword the plan and the research can ask for, so one look-up covers them all
function keywordsFor(input) {
  const ctx = contextFor(input);
  const { towns } = cleanTowns(input.baseTown, input.otherTowns);
  const cats = input.resolved.categories.map(c => ({ key: c.key, name: c.name }));
  const services = V3.dedupe(V3.collectServices(input.resolved));
  return [...new Set([...V3.keywordsFor(services, cats, towns, ctx, { townVariants: true }), ...V3.pageKeywords(cats, towns, ctx)])];
}

// input: { resolved, baseTown, otherTowns, companyName, niche, waiting: [{ service, reason }] }
// opts: volumes (Map keyword → { volume, cpc }; what is missing counts as no data), core (Set of
// service ids a person flagged), saved (the client's saved rows: their manual and locked H1s take
// part in the ownership rules that decide the town service pages)
function buildPageMap(input, opts = {}) {
  const { resolved, companyName = '' } = input;
  const volumes = opts.volumes || new Map();
  const vol = k => volumes.get(k) || { volume: null, cpc: null };
  const baseTown = String(input.baseTown || '').trim();
  const problems = [];
  if (!resolved || !resolved.categories || !resolved.categories.length) problems.push({ code: 'no_categories', msg: 'The resolver has no category tabs, so there is nothing to map.' });
  if (!baseTown) problems.push({ code: 'no_base_town', msg: 'No base town (the town the business is based in).' });
  if (problems.length) return { ok: false, problems, rows: [], services: [], collisions: [], waiting: input.waiting || [], droppedTowns: [], counts: {} };

  const ctx = contextFor(input);
  const { towns, dropped, clashes } = cleanTowns(baseTown, input.otherTowns);
  const townSlugs = towns.map(t => ({ name: t, slug: slugify(t) }));
  const collisions = [...clashes];

  // Category pages, one per tab, in tab order. Two tabs (or two services) that make
  // one slug, or a name with no letters, are reported; the first keeps the page.
  const firstBySlug = new Map();
  const claim = (kind, name, slug, prefix) => {
    if (!slug) { collisions.push({ slug: '', names: [`${kind} "${name}"`], msg: `${kind} "${name}" has no letters or numbers to make a slug from, so it has no page` }); return false; }
    const k = prefix + slug;
    if (firstBySlug.has(k)) { collisions.push({ slug: k, names: [firstBySlug.get(k), `${kind} "${name}"`], msg: `${firstBySlug.get(k)} and ${kind} "${name}" share the slug ${k}; only the first has a page` }); return false; }
    firstBySlug.set(k, `${kind} "${name}"`);
    return true;
  };
  const RESERVED = new Set(['services', 'locations']);
  const cats = [];
  for (const c of resolved.categories) {
    const slug = slugify(c.name);
    if (RESERVED.has(slug)) { collisions.push({ slug: `/${slug}`, names: [`category "${c.name}"`], msg: `category "${c.name}" slugs to /${slug}, a path the site already uses, so it has no page` }); continue; }
    if (claim('category', c.name, slug, '/')) cats.push({ key: c.key, name: c.name, slug, primary: !!c.primary });
  }

  // The services list rules, on the categories that have a page
  const catList = cats.map(c => ({ key: c.key, name: c.name }));
  const allKeywords = [...new Set([...V3.keywordsFor(V3.dedupe(V3.collectServices(resolved)), catList, towns, ctx, { townVariants: true }), ...V3.pageKeywords(catList, towns, ctx)])];
  const G = C.buildGroups(allKeywords, volumes, { towns: [baseTown, ...towns] });
  const services = V3.pageOrMention(V3.fold(V3.dedupe(V3.collectServices(resolved)), catList, ctx, G), towns, ctx, vol, opts.core || new Set());
  const paged = [];
  for (const s of services.filter(x => x.outcome === 'page')) {
    const slug = slugify(s.name);
    if (claim('service', s.name, slug, '/services/')) paged.push({ ...s, slug });
    else { s.outcome = 'mentioned'; s.reason = `its slug collides with another page's (see collisions), so it is mentioned instead`; }
  }

  const catPath = c => `/${c.slug}`;
  const svcPath = s => `/services/${s.slug}`;
  const locPath = t => `/locations/${t.slug}`;
  const locCatPath = (t, c) => `/locations/${t.slug}/${c.slug}`;
  const townSvcPath = (t, s) => `/locations/${t.slug}/${s.slug}`;
  const rows = [];
  const add = (type, title, slug, info) => rows.push({ page_key: pageKey(type, slug), type, title, slug, h1: '', h1_source: 'needed', meta_title: '', meta_description: '', status: 'Not Started', applies: true, links_to: [], links_from: [], info, sort_order: rows.length });
  add('homepage', `${companyName} Homepage`.trim(), '/', {});
  for (const c of cats) add('category', c.name, catPath(c), { category_key: c.key, primary: c.primary });
  for (const s of paged) add('service', s.name, svcPath(s), { service_id: s.id, additional: s.kind === 'additional', parent_keys: s.parents.filter(k => cats.some(c => c.key === k)), merged_from: s.merged_from || [] });
  for (const t of townSlugs) add('location', t.name, locPath(t), { town: t.name });
  for (const t of townSlugs) for (const c of cats) add('location_category', `${c.name} ${t.name}`, locCatPath(t, c), { town: t.name, category_key: c.key });
  // Town service candidates: a usable "<service> <town>"; the ownership rules below keep only the winners
  for (const t of townSlugs) for (const s of paged) {
    if (!V3.usable(vol(keywordOf(`${s.name} ${t.name}`)))) continue;
    const parents = s.parents.filter(k => cats.some(c => c.key === k));
    add('town_service', `${s.name} ${t.name}`, townSvcPath(t, s), { town: t.name, service_id: s.id, service_name: s.name, parent_keys: parents, category_key: s.home && parents.includes(s.home) ? s.home : parents[0] });
  }

  // The H1 rules decide which town service pages win their keyword; the rest are not pages.
  // Saved H1s (manual, or past H1 Added) take part so a person's keyword is never taken.
  const savedBy = new Map((opts.saved || []).map(r => [r.page_key, r]));
  const forResolve = rows.map(r => { const s = savedBy.get(r.page_key); return s ? { ...r, h1: s.h1 || '', h1_source: s.h1_source, status: s.status } : r; });
  const resolved2 = C.resolve(forResolve, ctx, volumes);
  const decisions = new Map(resolved2.decisions.map(d => [d.row.page_key, d]));
  const droppedTownPages = [];
  const kept = rows.filter(r => {
    if (r.type !== 'town_service') return true;
    const d = decisions.get(r.page_key);
    if (d && d.source === 'research') return true;
    droppedTownPages.push({ title: r.title, slug: r.slug, why: d ? d.reason : 'no decision' });
    return false;
  });
  kept.forEach((r, i) => { r.sort_order = i; });
  V3.planLinks(kept, services);
  for (const r of kept) { r.links = r.links || { breadcrumb: [], cards: [], areas: [], more: [], body: [], parents: [], mentioned: [] }; }

  const counts = {};
  for (const t of TYPES) counts[t] = kept.filter(r => r.type === t).length;
  counts.total = kept.length;
  const n = o => services.filter(s => s.outcome === o).length;
  const townPages = kept.filter(r => r.type === 'town_service');
  const perTown = {};
  for (const r of townPages) perTown[r.info.town] = (perTown[r.info.town] || 0) + 1;
  return {
    ok: true, problems: [], rows: kept, services, decisions, droppedTownPages, collisions, counts, droppedTowns: dropped,
    // Council areas get pages like any town (Brandon to decide); elsewhere Copybot skips them for research
    councilAreas: towns.filter(t => isAdminArea(t)),
    waiting: input.waiting || [],
    serviceCounts: { page: n('page'), merged: n('merged'), folded: n('folded'), mentioned: n('mentioned'), names: services.length },
    townServicePages: { count: townPages.length, towns: perTown },
    arithmetic: `1 homepage + ${cats.length} categories + ${counts.service} service pages (of ${services.length} names: ${n('merged')} merged, ${n('folded')} folded, ${n('mentioned')} mentioned) + ${townSlugs.length} other towns + ${townSlugs.length} towns x ${cats.length} categories (${counts.location_category}) + ${counts.town_service} town service pages = ${kept.length}`,
  };
}

// ── Regeneration: what a new plan does to the saved rows ──
// saved: rows from client_page_map (applies true or false). Keyed on page_key.
// Only plan-owned fields can change: title, links (and their sections in info), applies, and h1
// while h1_source is "auto" or "needed" (a manual H1 is a person's; research, pattern and conflict
// are H1 research's). h1 (manual), meta, status and notes are never touched.
function diffPlan(saved, planned) {
  const byKey = new Map(saved.map(r => [r.page_key, r]));
  const plannedKeys = new Set(planned.map(r => r.page_key));
  const add = [], revive = [], update = [], unchanged = [], retire = [], stillRetired = [];
  for (const p of planned) {
    const s = byKey.get(p.page_key);
    if (!s) { add.push(p); continue; }
    const changes = {};
    if (s.title !== p.title) changes.title = p.title;
    if (JSON.stringify(s.links_to || []) !== JSON.stringify(p.links_to)) changes.links_to = p.links_to;
    if (JSON.stringify(s.links_from || []) !== JSON.stringify(p.links_from)) changes.links_from = p.links_from;
    if (JSON.stringify(((s.info || {}).links) || null) !== JSON.stringify(p.links || null)) changes.links = p.links;
    if (['auto', 'needed'].includes(s.h1_source || 'needed') && ((s.h1 || '') !== p.h1 || s.h1_source !== p.h1_source)) { changes.h1 = p.h1; changes.h1_source = p.h1_source; }
    if (s.applies === false) { revive.push({ row: s, changes }); continue; }
    if (Object.keys(changes).length) update.push({ row: s, changes }); else unchanged.push(s);
  }
  for (const s of saved) if (!plannedKeys.has(s.page_key)) (s.applies === false ? stillRetired : retire).push(s);

  // A rename is a new page plus a retired one of the same type: flag it for a person
  const renames = [];
  for (const type of ['category', 'service', 'location', 'location_category', 'town_service']) {
    const a = add.filter(r => r.type === type), r = retire.filter(x => x.type === type);
    // A town rename already explains its location category and town service pages
    if (['location_category', 'town_service'].includes(type) && renames.some(x => x.type === 'location')) continue;
    // Service pages come and go with search volume: not a rename
    if (['service', 'town_service'].includes(type)) continue;
    if (a.length && r.length) renames.push({ type, added: a.map(x => x.title), retired: r.map(x => x.title),
      msg: `${TYPE_LABEL[type]}: ${r.map(x => `"${x.title}"`).join(', ')} no longer applies and ${a.map(x => `"${x.title}"`).join(', ')} is new. If this is a rename, copy any H1, meta or notes across by hand.` });
  }
  const worked = retire.filter(s => s.status !== 'Not Started' || s.h1_source === 'manual');
  return {
    add, revive, update, unchanged, retire, stillRetired, renames,
    retiringWorkedOn: worked.map(s => ({ page_key: s.page_key, title: s.title, status: s.status })),
    counts: { wouldAdd: add.length + revive.length, wouldRetire: retire.length, wouldUpdate: update.length, unchanged: unchanged.length, alreadyRetired: stillRetired.length },
  };
}

// CSV in the old PAGE MAP tab's column order, then the link sections; links one per line inside the cell
function toCsv(rows, { includeRetired = false } = {}) {
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const order = r => TYPES.indexOf(r.type);
  const list = rows.filter(r => includeRetired || r.applies !== false).slice().sort((a, b) => order(a) - order(b) || (a.sort_order || 0) - (b.sort_order || 0));
  const sec = (r, k) => (((r.links || (r.info || {}).links || {})[k]) || []).map(x => (x.anchor && x.anchor !== x.to ? `${x.anchor} → ${x.to}` : x.to)).join('\n');
  const mentioned = r => ((((r.links || (r.info || {}).links || {}).mentioned) || []).join('\n'));
  const lines = [CSV_COLUMNS.map(cell).join(',')];
  for (const r of list) lines.push([TYPE_LABEL[r.type] + (r.applies === false ? ' (no longer applies)' : ''), r.title, r.slug, r.h1, r.meta_title, r.meta_description, (r.links_to || []).join('\n'), (r.links_from || []).join('\n'), r.status,
    sec(r, 'breadcrumb'), sec(r, 'cards'), sec(r, 'areas'), [sec(r, 'more'), sec(r, 'parents')].filter(Boolean).join('\n'), sec(r, 'body'), mentioned(r)].map(cell).join(','));
  return lines.join('\r\n') + '\r\n';
}

module.exports = { TYPES, TYPE_LABEL, STATUSES, CSV_COLUMNS, slugify, pageKey, cleanTowns, contextFor, keywordsFor, buildPageMap, diffPlan, toCsv };
