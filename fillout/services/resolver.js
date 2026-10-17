'use strict';

// ── Service and category resolver ───────────────────────────────────────────
// Pure, no AI. Takes a niche's config (fillout/services/<niche>.json: categories
// in order, each with its tick group, its home ticks and the full service list
// in the "All Categories & Services" order, plus the PDF's duplicate notes) and
// the client's ticks, and returns the category tabs with their rows, the
// cross-reference of services on more than one tab, and flags.
//
// Rules (Brandon, 17 Oct 2026):
//   - a service id is its normalised name: lower case, trimmed, single spaces;
//     no fuzzy matching ("Garden design" and "Garden designs" differ)
//   - a ticked service is offered; it appears as a row on every category whose
//     list holds it: "unique" when one category lists it, else "duplicate"
//   - categoryTabRule "ticked_only" (default): a category gets a tab only when the
//     client ticked something in that category's own tick group;
//     "ticked_or_propagated": also when a ticked service propagates into it
//   - rows follow the PDF order, unique and duplicate interleaved
//   - legacy keys: category_N in tab order; service_N by walking the tabs in
//     order and each tab's rows in PDF order, numbering a service the first time
//     it is met and reusing the number later
//   - primary = config default unless overridden; no tab for it is a flag
//   - flags: more than 10 tabs, a tick matching no known service, primary
//     missing, config disagreements (duplicate notes vs the lists)

const fs = require('fs');
const path = require('path');

const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
const MAX_TABS = 10;

function loadConfig(nicheKey) {
  const file = path.join(__dirname, `${nicheKey}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Which config applies to a niche label or key (fillout/niches.js keys use dashes)
function configFor(nicheKeyOrLabel) {
  const want = norm(nicheKeyOrLabel).replace(/_/g, '-');
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.json'))) {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    if (norm(c.niche) === norm(nicheKeyOrLabel) || norm(c.nicheKey).replace(/_/g, '-') === want || f.replace(/\.json$/, '') === want) return c;
  }
  return null;
}

// ── Config validation: the category lists are the authority; the PDF's duplicate
// notes are cross-checked and every disagreement is reported, never fixed ──
function validateConfig(config) {
  const problems = [];      // things that break the rules (casing, a list repeating a service)
  const disagreements = []; // duplicate notes that don't match the lists
  const byId = new Map();   // id → { name, categories: [key] }
  const casing = new Map(); // id → Set of spellings seen
  for (const c of config.categories) {
    const seen = new Set();
    c.services.forEach((name, i) => {
      const id = norm(name);
      if (seen.has(id)) problems.push({ code: 'repeated_in_category', category: c.key, service: name, position: i + 1, msg: `${c.name} lists "${name}" twice (positions ${c.services.findIndex(s => norm(s) === id) + 1} and ${i + 1})` });
      seen.add(id);
      if (!byId.has(id)) byId.set(id, { name, categories: [] });
      if (!byId.get(id).categories.includes(c.key)) byId.get(id).categories.push(c.key);
      if (!casing.has(id)) casing.set(id, new Set());
      casing.get(id).add(name);
    });
    for (const t of c.ticks || []) {
      const id = norm(t);
      if (!c.services.some(s => norm(s) === id)) problems.push({ code: 'tick_not_in_list', category: c.key, service: t, msg: `${c.name} tick box "${t}" is not in its All Categories list` });
      if (!casing.has(id)) casing.set(id, new Set());
      casing.get(id).add(t);
    }
  }
  for (const [id, spellings] of casing) if (spellings.size > 1) problems.push({ code: 'inconsistent_casing', service: id, spellings: [...spellings], msg: `"${[...spellings].join('" / "')}" are the same service spelled differently` });
  // Notes vs lists
  const catName = key => (config.categories.find(c => c.key === key) || {}).name || key;
  const keyOf = name => { const n = norm(name); const c = config.categories.find(x => norm(x.name) === n || norm(x.key).replace(/_/g, ' ') === n); return c ? c.key : null; };
  for (const c of config.categories) {
    for (const name of c.services) {
      const id = norm(name);
      const listed = byId.get(id).categories.filter(k => k !== c.key).sort();
      const noted = ((c.duplicateNotes || {})[name] || []).map(keyOf).filter(Boolean).sort();
      const noteRaw = (c.duplicateNotes || {})[name];
      if (noteRaw && noteRaw.some(n => !keyOf(n))) disagreements.push({ code: 'note_names_unknown_category', category: c.key, service: name, note: noteRaw, msg: `${c.name}: "${name}" note names a category that does not exist: ${noteRaw.join(', ')}` });
      if (listed.join() !== noted.join()) {
        disagreements.push({ code: listed.length && !noted.length ? 'missing_note' : !listed.length && noted.length ? 'note_without_duplicate' : 'note_mismatch', category: c.key, service: name,
          listed: listed.map(catName), noted: noted.map(catName),
          msg: `${c.name}: "${name}" ${listed.length ? 'also listed under ' + listed.map(catName).join(', ') : 'listed nowhere else'}; the PDF note says ${noted.length ? noted.map(catName).join(', ') : 'nothing'}` });
      }
    }
  }
  // Every service needs a home: a category whose tick box shows it
  for (const [id, s] of byId) {
    const home = config.categories.filter(c => (c.ticks || []).some(t => norm(t) === id));
    if (!home.length) problems.push({ code: 'no_home', service: s.name, msg: `"${s.name}" is on no tick box, so it has no home category` });
    if (home.length > 1) problems.push({ code: 'two_homes', service: s.name, msg: `"${s.name}" is on ${home.length} tick boxes: ${home.map(c => c.name).join(', ')}` });
  }
  return { problems, disagreements };
}

// ── The resolver ──
// ticks: { [tickGroupFieldKey]: [service names] }   e.g. { 'landscapers.cat.gardener': ['Hedge trimming'] }
// options: { categoryTabRule: 'ticked_only' | 'ticked_or_propagated', primaryOverride: key|null,
//            additional: [{ service, categoryKey }] confirmed additional services }
function resolve(ticks, config, options = {}) {
  const rule = options.categoryTabRule || 'ticked_only';
  if (!['ticked_only', 'ticked_or_propagated'].includes(rule)) throw new Error(`categoryTabRule must be ticked_only or ticked_or_propagated, not ${rule}`);
  const flags = [];
  const { problems, disagreements } = validateConfig(config);
  for (const p of problems) flags.push({ code: 'config_' + p.code, severity: 'warn', msg: p.msg });
  for (const d of disagreements) flags.push({ code: 'config_' + d.code, severity: 'info', msg: d.msg });

  // Known services: id → { name, categories (config order) }
  const known = new Map();
  for (const c of config.categories) for (const name of c.services) {
    const id = norm(name);
    if (!known.has(id)) known.set(id, { id, name, categories: [] });
    if (!known.get(id).categories.includes(c.key)) known.get(id).categories.push(c.key);
  }
  const additionalKnown = new Set(((config.additionalTickGroup || {}).services || []).map(norm));

  // Offered services and which tick groups were used
  const offered = new Set();
  const tickedGroups = new Set();
  const unmatched = [];
  const additionalTicks = [];
  for (const [field, values] of Object.entries(ticks || {})) {
    const cat = config.categories.find(c => c.tickGroup === field);
    for (const v of Array.isArray(values) ? values : []) {
      const id = norm(v);
      if (!id) continue;
      if (cat && cat.services.some(s => norm(s) === id)) { offered.add(id); tickedGroups.add(cat.key); continue; }
      if (config.additionalTickGroup && field === config.additionalTickGroup.field && additionalKnown.has(id)) { additionalTicks.push(v); continue; }
      if (known.has(id)) { offered.add(id); if (cat) tickedGroups.add(cat.key); continue; } // a known service ticked under another group
      unmatched.push({ field, value: v });
    }
  }
  for (const u of unmatched) flags.push({ code: 'unmatched_tick', severity: 'warn', field: u.field, value: u.value, msg: `"${u.value}" (${u.field}) matches no known service: a typo or a form change` });

  // Tabs
  const tabbed = config.categories.filter(c => {
    const hasRows = c.services.some(s => offered.has(norm(s)));
    return rule === 'ticked_only' ? tickedGroups.has(c.key) : (tickedGroups.has(c.key) || hasRows);
  });

  // Rows with global numbering
  const serviceNo = new Map();
  let next = 1;
  const catNo = new Map(tabbed.map((c, i) => [c.key, i + 1]));
  const categories = tabbed.map(c => {
    // A service the PDF repeats within one category (reported by validateConfig) shows once, at its first position
    const seenHere = new Set();
    const rows = c.services.filter(s => offered.has(norm(s)) && !seenHere.has(norm(s)) && seenHere.add(norm(s))).map(name => {
      const id = norm(name);
      if (!serviceNo.has(id)) serviceNo.set(id, next++);
      const cats = known.get(id).categories;
      const alsoOn = cats.filter(k => k !== c.key);
      return { id, name, kind: alsoOn.length ? 'duplicate' : 'unique', legacyKey: `service_${serviceNo.get(id)}`, alsoOn: alsoOn.map(k => ({ key: k, name: config.categories.find(x => x.key === k).name, hasTab: catNo.has(k) })), home: config.categories.find(x => (x.ticks || []).some(t => norm(t) === id)) ? config.categories.find(x => (x.ticks || []).some(t => norm(t) === id)).key : null };
    });
    return { key: c.key, name: c.name, legacyKey: `category_${catNo.get(c.key)}`, tickGroup: c.tickGroup, tickedHere: tickedGroups.has(c.key), rows };
  });

  // Confirmed additional services: rows in their parent tab, numbered after every config service
  for (const a of options.additional || []) {
    const tab = categories.find(c => c.key === a.categoryKey);
    if (!tab) { flags.push({ code: 'additional_parent_missing', severity: 'warn', msg: `Additional service "${a.service}" is confirmed under ${a.categoryKey}, which has no tab` }); continue; }
    const id = norm(a.service);
    if (!serviceNo.has(id)) serviceNo.set(id, next++);
    tab.rows.push({ id, name: a.service, kind: 'additional', legacyKey: `service_${serviceNo.get(id)}`, alsoOn: [], home: a.categoryKey });
  }

  // Primary
  const primaryKey = options.primaryOverride || config.primaryDefault;
  const primary = categories.find(c => c.key === primaryKey) || null;
  if (!primary) flags.push({ code: 'primary_missing', severity: 'bad', msg: `The primary category (${(config.categories.find(c => c.key === primaryKey) || {}).name || primaryKey}) has no tab; choose a primary by hand` });
  else primary.primary = true;
  if (categories.length > MAX_TABS) flags.push({ code: 'too_many_categories', severity: 'bad', msg: `Too many categories: ${categories.length} tabs, the limit is ${MAX_TABS} (1 primary + 9 secondary). Choose which to drop.` });

  // Cross-reference: every service on 2 or more tabs
  const onTabs = new Map();
  for (const c of categories) for (const r of c.rows) { if (!onTabs.has(r.id)) onTabs.set(r.id, { id: r.id, name: r.name, legacyKey: r.legacyKey, tabs: [] }); onTabs.get(r.id).tabs.push({ key: c.key, name: c.name, legacyKey: c.legacyKey }); }
  const crossRef = [...onTabs.values()].filter(s => s.tabs.length > 1).map(s => ({ ...s, short: s.tabs.map(t => t.name).join(' / '), full: `${s.name} (${s.legacyKey}) appears on ${s.tabs.map(t => `${t.name} (${t.legacyKey})`).join(', ')}` }));

  return {
    rule, primary: primary ? primary.key : null, primaryName: primary ? primary.name : null,
    categories, crossRef, flags, additionalTicks,
    counts: { tabs: categories.length, services: serviceNo.size, offered: offered.size },
  };
}

// The client's ticks as the record API gives its fields: { [field key]: [values] }
function ticksFromFields(fields, config) {
  const out = {};
  for (const c of config.categories) { const f = fields.find(x => x.key === c.tickGroup); if (f && Array.isArray(f.value)) out[c.tickGroup] = f.value; }
  if (config.additionalTickGroup) { const f = fields.find(x => x.key === config.additionalTickGroup.field); if (f && Array.isArray(f.value)) out[config.additionalTickGroup.field] = f.value; }
  return out;
}

// ── Additional services: the free-text answer, one service per line, bullet or comma ──
function parseAdditional(text, config) {
  const knownIds = new Set();
  for (const c of config.categories) for (const s of c.services) knownIds.add(norm(s));
  for (const s of ((config.additionalTickGroup || {}).services || [])) knownIds.add(norm(s));
  const parts = String(text || '').split(/\r?\n|[•●▪·]|;|,(?![^(]*\))/).map(s => s.replace(/^[\s\-–—*\d.)]+/, '').trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const raw of parts) {
    const id = norm(raw);
    if (seen.has(id)) continue;
    seen.add(id);
    const tidy = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\s+/g, ' ');
    out.push({ service: tidy, id, alreadyCovered: knownIds.has(id) });
  }
  return out;
}

module.exports = { norm, loadConfig, configFor, validateConfig, resolve, ticksFromFields, parseAdditional, MAX_TABS };
