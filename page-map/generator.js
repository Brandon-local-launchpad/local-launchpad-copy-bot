'use strict';

// ── Page map generator ──────────────────────────────────────────────────────
// Pure, no AI, no database. The planned list of every page a site needs, from
// the service resolver's output (fillout/services/resolver.js) plus the base town,
// the other towns and the company name. The old Apps Script "PAGE MAP GENERATOR"
// is the spec, with Brandon's fixes (18 Oct 2026):
//   - a service on more than one tab is ONE page and links to ALL its parent
//     category pages (the old script used only the first tab it met)
//   - the homepage links to location pages for the other towns only; the base
//     town has no /locations/<base town> page
//   - no cap on other towns (the old sheet stopped at 14 areas)
//   - status "Pushed to WordPress" replaces "Pasted Into GHL"
//   - slug collisions are reported, never renamed
// Confirmed additional services arrive as resolver rows (kind "additional") and
// are built like any service; unconfirmed proposals are listed as waiting.

const { isAdminArea } = require('../client-files');

const TYPES = ['homepage', 'category', 'service', 'location', 'location_category'];
const TYPE_LABEL = { homepage: 'Homepage', category: 'Category', service: 'Service', location: 'Location', location_category: 'Location Category' };
const STATUSES = ['Not Started', 'H1 Added', 'Copy Generated', 'Pushed to WordPress', 'Live'];
// The old PAGE MAP tab's columns, in its order (the CSV export keeps it)
const CSV_COLUMNS = ['Page Type', 'Page Title', 'URL Slug', 'H1 (Ahrefs)', 'Meta Title', 'Meta Description', 'Links TO', 'Links FROM', 'Status'];

// The old script's slugify, unchanged: lower case, strip punctuation, spaces to hyphens
const slugify = text => String(text == null ? '' : text).toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const pageKey = (type, slug) => `${type}:${slug}`;

// Other towns: one per line (or an array), blanks and the base town dropped, first spelling kept
function cleanTowns(baseTown, otherTowns) {
  const list = Array.isArray(otherTowns) ? otherTowns : String(otherTowns || '').split(/\r?\n/);
  const base = slugify(baseTown);
  const lower = t => t.toLowerCase().replace(/\s+/g, ' ');
  const seen = new Map(); // slug → first spelling
  const out = [];
  const dropped = [];
  const clashes = [];     // two different spellings that make one slug: reported, first kept
  for (const raw of list) {
    const town = String(raw || '').replace(/^[\s\-–—*•\d.)]+/, '').trim();
    if (!town) continue;
    const s = slugify(town);
    if (!s) { clashes.push({ slug: '', names: [`town "${town}"`], msg: `town "${town}" has no letters or numbers to make a slug from, so it has no page` }); continue; }
    if (s === base) { if (lower(town) === lower(baseTown)) dropped.push({ town, why: 'is the base town' }); else clashes.push({ slug: `/locations/${s}`, names: [`town "${town}"`, `base town "${baseTown}"`], msg: `town "${town}" slugs the same as the base town "${baseTown}", so it has no page` }); continue; }
    if (seen.has(s)) {
      if (lower(seen.get(s)) === lower(town)) dropped.push({ town, why: 'is listed twice' });
      else clashes.push({ slug: `/locations/${s}`, names: [`town "${seen.get(s)}"`, `town "${town}"`], msg: `town "${seen.get(s)}" and town "${town}" share the slug /locations/${s}; only "${seen.get(s)}" has a page` });
      continue;
    }
    seen.set(s, town);
    out.push(town);
  }
  return { towns: out, dropped, clashes };
}

// input: { resolved (resolver output), baseTown, otherTowns, companyName, waiting: [{ service, reason }] }
function buildPageMap(input) {
  const { resolved, companyName = '' } = input;
  const baseTown = String(input.baseTown || '').trim();
  const problems = [];
  if (!resolved || !resolved.categories || !resolved.categories.length) problems.push({ code: 'no_categories', msg: 'The resolver has no category tabs, so there is nothing to map.' });
  if (!baseTown) problems.push({ code: 'no_base_town', msg: 'No base town (the town the business is based in).' });
  if (problems.length) return { ok: false, problems, rows: [], collisions: [], waiting: input.waiting || [], droppedTowns: [], counts: {} };

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
    if (claim('category', c.name, slug, '/')) cats.push({ key: c.key, name: c.name, slug, primary: !!c.primary, rows: c.rows });
  }
  // Services: one page per unique service id, parents in tab order
  const services = new Map();
  const skipped = new Set();
  for (const c of cats) for (const r of c.rows) {
    if (skipped.has(r.id)) continue;
    if (!services.has(r.id)) {
      if (!claim('service', r.name, slugify(r.name), '/services/')) { skipped.add(r.id); continue; }
      services.set(r.id, { id: r.id, name: r.name, slug: slugify(r.name), kind: r.kind, parents: [] });
    }
    services.get(r.id).parents.push(c);
  }
  const svcPath = s => `/services/${s.slug}`;
  const catPath = c => `/${c.slug}`;
  const locPath = t => `/locations/${t.slug}`;
  const locCatPath = (t, c) => `/locations/${t.slug}/${c.slug}`;
  const catServices = c => [...new Set(c.rows.filter(r => services.has(r.id)).map(r => svcPath(services.get(r.id))))];

  const rows = [];
  const add = (type, title, slug, h1, linksTo, linksFrom, extra = {}) => rows.push({
    page_key: pageKey(type, slug), type, title, slug,
    h1: h1 || '', h1_source: h1 ? 'auto' : 'needed',
    meta_title: '', meta_description: '',
    links_to: [...new Set(linksTo)], links_from: [...new Set(linksFrom)],
    status: 'Not Started', applies: true, ...extra,
  });

  const allServicePaths = [...services.values()].map(svcPath);
  add('homepage', `${companyName} Homepage`.trim(), '/', '',
    [...cats.map(catPath), ...townSlugs.map(locPath), ...allServicePaths],
    allServicePaths);

  for (const c of cats) add('category', c.name, catPath(c), '', catServices(c), townSlugs.map(t => locCatPath(t, c)), { category_key: c.key, primary: c.primary });

  for (const s of services.values()) add('service', s.name, svcPath(s), `${s.name} ${baseTown}`,
    [...s.parents.map(catPath), ...townSlugs.flatMap(t => s.parents.map(c => locCatPath(t, c))), '/'],
    s.parents.map(catPath),
    { service_id: s.id, additional: s.kind === 'additional', parent_keys: s.parents.map(c => c.key) });

  for (const t of townSlugs) add('location', t.name, locPath(t), '', cats.map(c => locCatPath(t, c)), ['/'], { town: t.name });

  for (const t of townSlugs) for (const c of cats) add('location_category', `${c.name} ${t.name}`, locCatPath(t, c), '',
    [catPath(c), locPath(t), ...catServices(c)],
    [...catServices(c), locPath(t)],
    { town: t.name, category_key: c.key });

  const counts = { homepage: 1, category: cats.length, service: services.size, location: townSlugs.length, location_category: townSlugs.length * cats.length };
  counts.total = rows.length;
  return {
    ok: true, problems: [], rows, collisions, counts, droppedTowns: dropped,
    // Council areas get pages like any town (Brandon to decide); elsewhere Copybot skips them for research
    councilAreas: towns.filter(t => isAdminArea(t)),
    waiting: input.waiting || [],
    arithmetic: `1 homepage + ${cats.length} categories + ${services.size} unique services + ${townSlugs.length} other towns + ${townSlugs.length} towns x ${cats.length} categories (${counts.location_category}) = ${rows.length}`,
  };
}

// ── Regeneration: what a new plan does to the saved rows ──
// saved: rows from client_page_map (applies true or false). Keyed on page_key.
// Only plan-owned fields can change: title, links, applies, and h1 while h1_source
// is "auto" or "needed" (a manual H1 is a person's; a "suggested" one is H1 research's). h1 (manual), meta, status and notes are never touched.
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
    if (!['manual', 'suggested'].includes(s.h1_source) && ((s.h1 || '') !== p.h1 || s.h1_source !== p.h1_source)) { changes.h1 = p.h1; changes.h1_source = p.h1_source; }
    if (s.applies === false) { revive.push({ row: s, changes }); continue; }
    if (Object.keys(changes).length) update.push({ row: s, changes }); else unchanged.push(s);
  }
  for (const s of saved) if (!plannedKeys.has(s.page_key)) (s.applies === false ? stillRetired : retire).push(s);

  // A rename is a new page plus a retired one of the same type: flag it for a person
  const renames = [];
  for (const type of ['category', 'service', 'location', 'location_category']) {
    const a = add.filter(r => r.type === type), r = retire.filter(x => x.type === type);
    // A town rename already explains its location category pages
    if (type === 'location_category' && renames.some(x => x.type === 'location')) continue;
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

// CSV in the old PAGE MAP tab's column order; links one per line inside the cell
function toCsv(rows, { includeRetired = false } = {}) {
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const order = r => TYPES.indexOf(r.type);
  const list = rows.filter(r => includeRetired || r.applies !== false).slice().sort((a, b) => order(a) - order(b) || (a.sort_order || 0) - (b.sort_order || 0));
  const lines = [CSV_COLUMNS.map(cell).join(',')];
  for (const r of list) lines.push([TYPE_LABEL[r.type] + (r.applies === false ? ' (no longer applies)' : ''), r.title, r.slug, r.h1, r.meta_title, r.meta_description, (r.links_to || []).join('\n'), (r.links_from || []).join('\n'), r.status].map(cell).join(','));
  return lines.join('\r\n') + '\r\n';
}

module.exports = { TYPES, TYPE_LABEL, STATUSES, CSV_COLUMNS, slugify, pageKey, cleanTowns, buildPageMap, diffPlan, toCsv };
