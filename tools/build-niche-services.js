'use strict';
// Builds fillout/services/<niche>.json for every niche from the two "Niche By Niche
// Categories & Services" PDFs in docs/niches-source/ (git-ignored), text via
// pdf-parse, never hand-typed. Same shape as landscapers-gardeners.json, which is
// never touched here.
//
//   node tools/build-niche-services.js            report only (writes nothing)
//   node tools/build-niche-services.js --write    also writes the niche files
//
// Per niche the PDF has an "All Categories & Services" list (categories with "●"
// bullets and "(Duplicate: …)" notes) and a "Tick Box … Categories & Services" list
// (the form: each service under its one home category), then an "Additional
// Services" question. Layouts vary; the parser is generic (see parseSection).
// What is data, not code: NICHES below (PDF title → dropdown label, primary,
// alwaysCreate, declared source errors). A niche whose All list holds two
// copies of a category is written as a DRAFT to fillout/services/drafts/ (the
// resolver never reads that folder) with both copies, until Brandon chooses.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const { checkNiche } = require(path.join(root, 'fillout/services/check-niche.js'));

const SRC = path.join(root, 'docs/niches-source');
const OUT = path.join(root, 'fillout/services');
const norm = R.norm;

// PDF title (text before "Onboarding") → the Fillout dropdown label in field-map.json.
// primary: the obvious trade category (Brandon checks these). alwaysCreate: categories
// that always get a tab under ticked_only. knownSourceErrors: PDF mistakes reported,
// not failed.
const NICHES = [
  { title: 'Landscaping', niche: 'Landscapers/Gardeners', skip: 'already built (landscapers-gardeners.json)' },
  { title: 'Cleaning', niche: 'Cleaning Companies', primary: 'House Cleaning Service' },
  { title: 'Roofer', niche: 'Roofers', primary: 'Roofing services' },
  { title: 'Heating', niche: 'Plumbing & Heating', primary: 'Central Heating Service' },
  { title: 'Drainage', niche: 'Drainage', primary: 'Drainage Service' },
  { title: 'Fencing', niche: 'Fencing', primary: 'Fence Contractor' },
  { title: '', niche: 'Locksmith', primary: 'Locksmith' },
  { title: 'Builder', niche: 'Builders', primary: 'Building Firm' },
  { title: 'Dog Walker', niche: 'Pet Care Services (Dog Walkers)', primary: 'Dog Walker' },
  { title: 'Dog Training', niche: 'Dog Training', primary: 'Dog trainer' },
  { title: 'Dog Groomer', niche: 'Dog Grooming', primary: 'Pet Groomer' },
  { title: 'HVAC', niche: 'HVAC', primary: 'HVAC Contractor' },
  { title: 'Electrician', niche: 'Electricians', primary: 'Electrician' },
  { title: 'Tree Surgeon', niche: 'Tree Surgeons', primary: 'Tree service' },
  { title: 'Garage Door Installs', niche: 'Garage Doors Installs', primary: 'Garage door supplier' },
  { title: 'Pressure Washing / Exterior Cleaning', niche: 'Pressure Washing / Exterior Cleaning', primary: 'Pressure Washing Service' },
  { title: 'Guttering and Fascias', niche: 'Guttering & Fascias', primary: 'Roofing services' },
  { title: 'Pest Control', niche: 'Pest Control', primary: 'Pest control service' },
  { title: 'Scaffolding', niche: 'Scaffolding', primary: 'Scaffolding Service' },
  { title: 'Window Cleaning', niche: 'Window Cleaning', primary: 'Window Cleaning Service' },
  { title: 'Driveways & Paving', niche: 'Driveways & Paving', primary: 'Paving Contractor' },
  { title: 'Kitchen / Bathroom Fitters', niche: 'Kitchen/Bathroom Fitters', primary: 'Kitchen Renovator' },
  { title: 'Loft Conversions / Extensions', niche: 'Loft Conversions / Extensions', primary: 'Building Firm' },
  { title: 'Painting & Decorators', niche: 'Painters & Decorators', primary: 'Painter and Decorator' },
  { title: 'Flooring Fitters (carpet/laminate/LVT)', niche: 'Flooring Fitters (carpet/laminate/LVT)', primary: 'Flooring Contractor',
    knownSourceErrors: [{ code: 'note_without_duplicate', category: 'flooring_contractor', service: 'Flooring repair', why: 'The PDF notes Flooring repair as a duplicate of Wood Floor Installation Service, but that category does not list it (Brandon, 18 Oct 2026: source error, report only).' }] },
  { title: 'Tiling', niche: 'Tiling', primary: 'Tile contractor' },
  { title: 'Curtain & Blind Fitters', niche: 'Blinds & Curtains Fitters', primary: 'Curtain Shop', alwaysCreate: ['Curtain Fitter'] },
  { title: 'Removals Company', niche: 'Removals Company', primary: 'Removals Company' },
];

// ── Text helpers ──
const clean = s => String(s).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
const BULLET = /^(?:●|•|☐|□|▪|◦|-|–)\s+(.*)$/;
const balance = s => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
const titleCase = s => s.toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
const keyOf = name => norm(name).replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const fileOf = label => label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// A heading line: "<Title> Onboarding All Categories & Services" / "… Tick Box …", or
// "Output N – All Categories …" with no title (Locksmith). Wrapped over up to three lines.
function findHeadings(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = clean(lines[i]);
    if (!l || BULLET.test(l)) continue;
    const outM = l.match(/^Output\s*\d\s*[–:-]\s*(All Categories|Tick Box)/i);
    // "Output N – …" lines: a heading only when no titled heading sits just above (Locksmith)
    if (outM) { if (!out.some(h => h.title && i - h.line < 5)) out.push({ line: i, type: /all/i.test(outM[1]) ? 'all' : 'tick', title: '' }); continue; }
    if (!/\bOnboarding\b/i.test(l)) continue;
    const next = clean(lines[i + 1] || '');
    // The title is the text before "Onboarding", else the line above ("Loft Conversions / Extensions" / "Onboarding All …")
    let title = clean(l.slice(0, l.search(/\bOnboarding\b/i)));
    let start = i, prev = '';
    if (!title && i > 0) { prev = clean(lines[i - 1]); if (prev && !BULLET.test(prev)) { title = prev; start = i - 1; } }
    const around = `${prev} ${l} ${next}`;
    if (!/All Categories|Tick Box|Cats\b/i.test(around)) continue;
    if (out.some(h => start - h.line < 3)) continue;
    const type = /Tick Box/i.test(`${prev} ${l}`) || (/^Tick Box/i.test(next) && !/All Categories/i.test(l)) ? 'tick' : 'all';
    out.push({ line: start, type, title: title.replace(/\s*Tick Box$/i, '').trim() });
  }
  return out;
}

// ── One section's lines → categories with bullets ──
// Handles: ●/•/☐/□/-/– bullets (with or without leading spaces); a bullet wrapped
// over lines (open bracket, lower-case start, or a trailing hyphen); "Category –" /
// "Category -" prefixes with or without a colon; UPPER-CASE headings; wrapped
// headings; "(Custom services)" and "(… has been removed …)" notes and
// "No unique services …" lines (notes, not services); boilerplate lines.
const SKIP = [/^Output\s*\d/i, /^\((With Duplicate Tracking|Deduplicated)\)$/i, /^Categories & Services$/i, /^& Services$/i, /^Services$/i,
  /^(Tick Box )?Onboarding( Categories)?( & Services)?$/i, /^Onboarding (All |Tick Box )?Categories/i, /^All Categories & Services$/i];
function parseSection(rawLines) {
  const categories = [];
  const unplaced = [];
  let cat = null, item = null, note = null;
  const flushItem = () => { if (item) { (cat ? cat.bullets : unplaced).push(item); item = null; } };
  const flushNote = () => { if (note) { (cat ? cat.notes : unplaced).push({ note: clean(note) }); note = null; } };
  for (const raw of rawLines) {
    const l = clean(raw);
    if (!l) continue;
    if (note !== null) { note += ' ' + l; if (balance(note) <= 0) flushNote(); continue; }
    if (item && (balance(item) > 0 || /-$/.test(item) && !BULLET.test(l))) { item += (/-$/.test(item) ? '' : ' ') + l; continue; }
    const b = l.match(BULLET);
    // A bullet that is a note ("● No predefined services available in GBP"), not a service
    if (b && /^No (predefined|unique|additional) services/i.test(b[1])) { flushItem(); (cat ? cat.notes : unplaced).push({ note: clean(b[1]) }); continue; }
    if (b) { flushItem(); item = b[1]; continue; }
    if (item && /^[a-z]/.test(l)) { item += ' ' + l; continue; }
    if (SKIP.some(r => r.test(l))) continue;
    if (/^\(/.test(l)) { flushItem(); note = l; if (balance(note) <= 0) flushNote(); continue; }
    if (/^No (unique|additional) services/i.test(l)) { flushItem(); (cat ? cat.notes : unplaced).push({ note: l }); continue; }
    // A heading
    flushItem();
    const m = l.match(/^Category\s*[–—-]\s*(.+?)\s*:?$/i);
    let name = clean(m ? m[1] : l.replace(/:$/, ''));
    if (name === name.toUpperCase() && /[A-Z]/.test(name)) name = titleCase(name);
    // A heading wrapped over two lines: the previous heading had no bullets and no notes yet
    if (cat && !cat.bullets.length && !cat.notes.length && !m && cat.raw.length < 60 && !/[.:)]$/.test(cat.raw) && /^[a-z&(]/.test(l)) { cat.name = clean(cat.name + ' ' + name); cat.raw += ' ' + l; continue; }
    cat = { name, raw: l, prefixed: !!m, bullets: [], notes: [] };
    categories.push(cat);
  }
  flushItem(); flushNote();
  // Bullets: split the "(Duplicate: …)" note off the service name
  // and a trailing "(Custom)" marker (Drainage): kept as a flag, not part of the name
  for (const c of categories) c.services = c.bullets.map(t => {
    const d = clean(t).match(/^(.*?)\s*\(Duplicate:\s*(.*)\)\s*$/i);
    let name = clean(d ? d[1] : t), custom = false;
    const cm = name.match(/^(.*?)\s*\(Custom\)$/i);
    if (cm) { name = clean(cm[1]); custom = true; }
    return { name, dup: d ? d[2].split(',').map(clean).filter(Boolean) : null, custom, raw: clean(t) };
  });
  return { categories, unplaced };
}

// The tick section ends where the additional-services question starts
function splitAdditional(lines) {
  const idx = lines.findIndex((l, i) => { const t = clean(l); return t && !BULLET.test(t) && /Additional Services?$|^Additional .*Services$|Additional$/i.test(t) && !/^\(/.test(t); });
  if (idx < 0) return { tick: lines, additional: [] };
  // Several additional questions (Drainage, Heating): each starts with such a heading
  const blocks = [];
  let cur = null;
  for (let i = idx; i < lines.length; i++) {
    const t = clean(lines[i]);
    if (t && !BULLET.test(t) && /Additional Services?$|^Additional .*Services$|Additional$/i.test(t) && !/^\(/.test(t)) {
      cur = { heading: t + (/Additional$/i.test(t) ? ' ' + clean(lines[i + 1] || '') : ''), examples: [], text: [] }; blocks.push(cur); continue;
    }
    if (!cur || !t) continue;
    // The question's bullets are its examples, with or without an "Examples:" line (Fencing has none)
    const b = t.match(BULLET);
    if (b) cur.examples.push(b[1]);
    else if (!/^Examples:?$/i.test(t)) cur.text.push(t);
  }
  return { tick: lines.slice(0, idx), additional: blocks.map(b => ({ heading: clean(b.heading), examples: b.examples.map(clean) })) };
}

// Two copies of the All list (a category name met twice): split into copies
function splitCopies(categories) {
  const copies = [[]];
  for (const c of categories) {
    if (copies[copies.length - 1].some(x => norm(x.name) === norm(c.name))) copies.push([]);
    copies[copies.length - 1].push(c);
  }
  return copies;
}

// ── Build one niche ──
function buildNiche(def, allSec, tickSec, fieldMap) {
  const report = { niche: def.niche, issues: [], unplaced: [], mapping: [], notes: [] };
  const nicheDef = fieldMap.niches[def.niche];
  if (!nicheDef) { report.issues.push(`"${def.niche}" is not a Fillout dropdown label in field-map.json`); return { report }; }
  const fields = fieldMap.fields.filter(f => f.niche === def.niche);
  const groupFields = fields.filter(f => f.type === 'Checkboxes');
  const addFields = groupFields.filter(f => /additional/i.test(f.label));
  const catFields = groupFields.filter(f => !/additional/i.test(f.label));
  const otherField = fields.find(f => /(^|\.)other_services$/.test(f.key));

  const all = parseSection(allSec);
  const copies = splitCopies(all.categories);
  const { tick: tickLines, additional } = splitAdditional(tickSec);
  const tick = parseSection(tickLines);
  report.unplaced.push(...all.unplaced.map(u => `All list: ${u.raw || u.note || JSON.stringify(u)}`));

  // Bullets before any heading in the tick list: the niche's only category, if it has one
  if (tick.unplaced.some(u => typeof u === 'string')) {
    const loose = tick.unplaced.filter(u => typeof u === 'string');
    if (copies[0].length === 1) { tick.categories.unshift({ name: copies[0][0].name, raw: '(no heading)', bullets: loose, notes: [], services: loose.map(t => ({ name: clean(t), dup: null })) }); report.notes.push(`Tick box list has no category heading; its ${loose.length} services go to the only category, ${copies[0][0].name}`); }
    else report.unplaced.push(...loose.map(t => `Tick box: "${t}" has no category`));
  }
  report.unplaced.push(...tick.unplaced.filter(u => typeof u !== 'string').map(u => `Tick box note with no category: ${u.note}`));

  const build = cats => {
    const usedTick = new Set();
    const categories = cats.map(c => {
      // The tick heading for this category: same name, else the tick category whose services all sit in this one
      let t = tick.categories.find(x => !usedTick.has(x) && norm(x.name) === norm(c.name));
      if (!t) {
        const allIds = new Set(c.services.map(s => norm(s.name)));
        t = tick.categories.find(x => !usedTick.has(x) && x.services.length && x.services.every(s => allIds.has(norm(s.name))) && !cats.some(o => o !== c && norm(o.name) === norm(x.name)));
        if (t) report.mapping.push(`Tick box heading "${t.name}" matched to All-list category "${c.name}" by its services`);
      }
      if (t) usedTick.add(t);
      // The field map tick group: label (less a trailing " Services"), the tick heading, or the only group left
      const labels = f => [norm(f.label), norm(f.label.replace(/\s+Services$/i, ''))];
      let g = catFields.find(f => labels(f).includes(norm(c.name)) || (t && labels(f).includes(norm(t.name))));
      const name = g ? g.label.replace(/\s+Services$/i, '').trim() || c.name : t && t.prefixed ? t.name : (t ? t.name : c.name);
      return { c, t, g, name };
    });
    // A niche with one category and one tick group whose names differ (Roofers, Guttering &
    // Fascias, Tiling): pair them. Never in a niche with more than one of either.
    const freeG = catFields.filter(f => !categories.some(x => x.g === f));
    const noG = categories.filter(x => !x.g && x.t && x.t.services.length);
    if (categories.length === 1 && catFields.length === 1 && freeG.length === 1 && noG.length === 1) { noG[0].g = freeG[0]; report.mapping.push(`Category "${noG[0].c.name}" mapped to tick group "${freeG[0].label}" (${freeG[0].key}): the only group left`); }
    for (const x of categories) {
      if (x.g) report.mapping.push(`${x.name} → ${x.g.key}${norm(x.g.label.replace(/\s+Services$/i, '')) !== norm(x.c.name) ? ` (label "${x.g.label}", PDF "${x.c.name}")` : ''}`);
      else report.mapping.push(`${x.name} → no tick group${x.t && x.t.services.length ? ` (MISMATCH: ${x.t.services.length} tick-box services)` : ' (no tick boxes of its own)'}`);
    }
    for (const f of catFields) if (!categories.some(x => x.g === f)) report.mapping.push(`MISMATCH: field-map tick group "${f.label}" (${f.key}) matches no PDF category`);
    for (const t of tick.categories) if (!categories.some(x => x.t === t)) report.unplaced.push(`Tick box category "${t.name}" (${t.services.length} services) matches no All-list category`);

    const seenKeys = new Set();
    const out = categories.map(x => {
      let key = keyOf(x.name); while (seenKeys.has(key)) key += '_2'; seenKeys.add(key);
      const duplicateNotes = {};
      for (const s of x.c.services) if (s.dup) duplicateNotes[s.name] = s.dup;
      const notes = [...x.c.notes, ...(x.t ? x.t.notes : [])].map(n => n.note);
      const custom = x.c.services.filter(s => s.custom).map(s => s.name);
      return { key, name: x.name, tickGroup: x.g ? x.g.key : null, alwaysCreate: (def.alwaysCreate || []).some(n => norm(n) === norm(x.name)), ticks: x.t ? x.t.services.map(s => s.name) : [], services: x.c.services.map(s => s.name), duplicateNotes, ...(custom.length ? { customServices: custom } : {}), ...(notes.length ? { notes } : {}) };
    });
    return out;
  };

  const config = {
    _about: `Categories and services for ${def.niche}, generated by tools/build-niche-services.js from the "Niche By Niche Categories & Services" PDF (All Categories & Services list in its order, with its duplicate notes; ticks = the Tick Box list, each category's home services). Do not hand-edit: change the PDF or the generator's NICHES table and re-run.`,
    niche: def.niche,
    nicheKey: nicheDef.key,
    primaryDefault: null,
    additionalServicesField: otherField ? otherField.key : null,
    additionalTickGroup: addFields.length ? { field: addFields[0].key, services: [], examples: (additional[0] || {}).examples || [] } : null,
  };
  if (addFields.length > 1) config.extraAdditionalTickGroups = addFields.slice(1).map((f, i) => ({ field: f.key, label: f.label, examples: (additional[i + 1] || {}).examples || [] }));
  if (addFields.length !== Math.max(additional.length, addFields.length ? 1 : 0)) report.notes.push(`${additional.length} additional-services question(s) in the PDF, ${addFields.length} additional tick group(s) in field-map.json`);

  if (copies.length > 1) {
    const variants = copies.map(cats => build(cats));
    report.draft = `The All list holds ${copies.length} copies of the categories; written as a DRAFT with both, until Brandon chooses`;
    const draft = { ...config, draft: true, draftReason: report.draft, copies: variants.map((v, i) => ({ copy: i + 1, categories: v })) };
    draft.primaryDefault = keyOf(def.primary);
    return { config: draft, report, draft: true, copies: variants };
  }
  config.categories = build(copies[0]);
  if (!config.additionalTickGroup) delete config.additionalTickGroup;
  const pk = config.categories.find(c => norm(c.name) === norm(def.primary)) || config.categories.find(c => norm(c.key) === norm(keyOf(def.primary)));
  config.primaryDefault = pk ? pk.key : null;
  if (!pk) report.issues.push(`primary "${def.primary}" is not a category`);
  report.primary = pk ? pk.name : null;
  // Every disagreement between the PDF's notes and its lists, and every service with no
  // home in the tick box list, is declared for Brandon's review: reported, not failed.
  // Declarations from NICHES (Brandon's) come first and keep their wording.
  const v = R.validateConfig(config);
  const declared = [...(def.knownSourceErrors || [])];
  const has = (code, category, service) => declared.some(k => k.code === code && (k.category || null) === (category || null) && norm(k.service) === norm(service));
  for (const d of v.disagreements) if (!has(d.code, d.category, d.service)) declared.push({ code: d.code, category: d.category, service: d.service, why: 'Generated: the PDF note disagrees with the category lists (the lists are the authority). Awaiting Brandon\'s review.' });
  for (const p of v.problems.filter(p => p.code === 'no_home')) {
    const isCatName = config.categories.some(k => norm(k.name) === norm(p.service));
    if (!has('no_home', null, p.service)) declared.push({ code: 'no_home', category: null, service: p.service, why: isCatName ? 'Generated: the category name itself, listed as a service in the All list (GBP default) but not a tick box. Awaiting Brandon\'s review.' : 'Generated: in the All list but in no tick box list. Awaiting Brandon\'s review.' });
  }
  for (const p of v.problems.filter(p => p.code === 'tick_not_in_list')) {
    if (!has('tick_not_in_list', p.category, p.service)) declared.push({ code: 'tick_not_in_list', category: p.category, service: p.service, why: 'Generated: a tick box the PDF\'s All list does not have under this category. Awaiting Brandon\'s review.' });
  }
  if (declared.length) config.knownSourceErrors = declared;
  return { config, report };
}

// ── Whole PDFs → niches ──
async function readPdfs() {
  const pdf = require('pdf-parse/lib/pdf-parse.js');
  const files = fs.readdirSync(SRC).filter(f => /\.pdf$/i.test(f)).sort((a, b) => (/25\s*-\s*28/.test(a) ? 1 : 0) - (/25\s*-\s*28/.test(b) ? 1 : 0));
  if (files.length < 2) throw new Error(`Expected the two niche PDFs in docs/niches-source/, found: ${files.join(', ') || 'none'}`);
  const texts = [];
  for (const f of files) texts.push((await pdf(fs.readFileSync(path.join(SRC, f)))).text);
  return { files, text: texts.join('\n') };
}

function splitNiches(text) {
  const lines = text.split(/\r?\n/);
  const heads = findHeadings(lines);
  // Pair headings: each niche has an "all" and a "tick" heading, in either order
  const niches = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i], nx = heads[i + 1];
    if (!nx || h.type === nx.type) { niches.push({ title: h.title, error: `only one heading (${h.type}) found at line ${h.line + 1}` }); continue; }
    const end = heads[i + 2] ? heads[i + 2].line : lines.length;
    const title = h.title || nx.title;
    const sec = (a, b) => lines.slice(a.line + 1, b);
    const allH = h.type === 'all' ? h : nx, tickH = h.type === 'tick' ? h : nx;
    niches.push({ title, all: sec(allH, allH === h ? nx.line : end), tick: sec(tickH, tickH === h ? nx.line : end) });
    i++;
  }
  return niches;
}

module.exports = { NICHES, parseSection, splitAdditional, splitCopies, findHeadings, splitNiches, buildNiche, keyOf, fileOf, clean };

// ── CLI ──
if (require.main === module) {
  (async () => {
    const write = process.argv.includes('--write');
    const fieldMap = JSON.parse(fs.readFileSync(path.join(root, 'fillout/field-map.json'), 'utf8'));
    const { files, text } = await readPdfs();
    const found = splitNiches(text);
    const results = [];
    for (const def of NICHES) {
      const f = found.find(n => norm(n.title).replace(/\s+tick box$/, '') === norm(def.title));
      if (!f) { results.push({ def, missing: true }); continue; }
      if (def.skip) { results.push({ def, skipped: true }); continue; }
      results.push({ def, ...buildNiche(def, f.all, f.tick, fieldMap) });
    }
    const unknownTitles = found.filter(n => !NICHES.some(d => norm(d.title) === norm(n.title).replace(/\s+tick box$/, '')));
    require('./niche-services-report.js').print({ files, results, unknownTitles, fieldMap, checkNiche });
    if (write) {
      fs.mkdirSync(path.join(OUT, 'drafts'), { recursive: true });
      for (const r of results) {
        if (!r.config) continue;
        const file = path.join(OUT, r.draft ? 'drafts' : '', `${fileOf(r.def.niche)}${r.draft ? '.draft' : ''}.json`);
        fs.writeFileSync(file, JSON.stringify(r.config, null, 2) + '\n');
      }
      console.log(`\nWrote ${results.filter(r => r.config && !r.draft).length} niche files and ${results.filter(r => r.draft).length} draft(s).`);
    }
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}
