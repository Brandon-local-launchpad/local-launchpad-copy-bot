'use strict';
// ── Niche entry check (3 Nov 2026) ───────────────────────────────────────────
// Reads niche-library/<stem>.json against what the code expects (niche-library/entry-schema.js,
// the briefGaps of the three block modules, the placeholders, the .md mirror) and prints what
// is missing or looks wrong. Run it after writing or changing an entry:
//
//   node tools/niche-entry-check.js landscaper
//   node tools/niche-entry-check.js roofer --quiet      (problems only)
//
// Exit code 1 on a FAIL. A WARN is for a person to read (a figure in a brief that the trade
// facts pack must state, a type a category points at, an emergency page with no variant).

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'niche-library/entry-schema.js'));
const CB = require(path.join(root, 'category-blocks.js'));
const SB = require(path.join(root, 'service-blocks.js'));
const LB = require(path.join(root, 'location-blocks.js'));
const L = require(path.join(root, 'niche-library/library.js'));

const stem = process.argv[2];
const quiet = process.argv.includes('--quiet');
if (!stem) { console.error('Usage: node tools/niche-entry-check.js <stem>'); process.exit(2); }
const file = path.join(root, 'niche-library', `${stem}.json`);
if (!fs.existsSync(file)) { console.error(`No entry: ${path.relative(root, file)}`); process.exit(1); }

const out = [];
const fail = m => out.push(['FAIL', m]);
const warn = m => out.push(['WARN', m]);
const ok = m => { if (!quiet) out.push(['ok', m]); };

let n;
try { n = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`FAIL ${stem}.json does not parse: ${e.message}`); process.exit(1); }

const isStr = v => typeof v === 'string' && v.trim();
const arr = v => Array.isArray(v) ? v : [];
const lc = s => String(s || '').toLowerCase().trim();

// ── Required and page keys ──
for (const k of S.REQUIRED_KEYS) {
  const v = n[k];
  const empty = v === undefined || v === null || (Array.isArray(v) && !v.length) || (typeof v === 'string' && !v.trim()) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  if (empty) fail(`required slot "${k}" is missing or empty (loadNiche refuses the entry)`);
}
for (const k of S.PAGE_KEYS) if (n[k] === undefined) warn(`page slot "${k}" is missing (${/blocks$/.test(k) ? 'that page type is refused' : 'the pages run without it'})`);
ok(`${S.REQUIRED_KEYS.filter(k => n[k] !== undefined).length}/${S.REQUIRED_KEYS.length} required slots, ${S.PAGE_KEYS.filter(k => n[k] !== undefined).length}/${S.PAGE_KEYS.length} page slots present`);

// ── Identity ──
if (n._source && n._source !== `niche-library/${stem}.json` && !String(n._source).includes(stem)) warn(`_source "${n._source}" does not name ${stem}`);
if (isStr(n.trade) && n.trade_lower !== n.trade.toLowerCase()) warn(`trade_lower "${n.trade_lower}" is not trade in lower case`);
if (n.business_type_default && !S.TYPES.includes(n.business_type_default)) fail(`business_type_default "${n.business_type_default}" is not one of ${S.TYPES.join(' ')}`);
for (const k of ['words_use', 'words_avoid', 'fears', 'why_titles_alt', 'cover_chain']) if (n[k] !== undefined && !(Array.isArray(n[k]) && n[k].every(isStr))) fail(`${k} must be an array of strings`);
if (arr(n.fears).length && (n.fears.length < 3 || n.fears.length > 5)) warn(`fears has ${n.fears.length} entries; the landscaper has 4`);
if (arr(n.why_titles_alt).length !== 2) warn(`why_titles_alt has ${arr(n.why_titles_alt).length} titles, not 2`);
if (n.words_use && n.words_avoid) { const both = n.words_use.filter(w => n.words_avoid.map(lc).includes(lc(w))); if (both.length) fail(`in both words_use and words_avoid: ${both.join(', ')}`); }

// ── Buttons, steps, FAQ slots, logos, materials ──
if (n.buttons && typeof n.buttons === 'object') {
  for (const k of S.BUTTON_KEYS) if (!isStr(n.buttons[k])) fail(`buttons.${k} is missing`);
}
if (!(Array.isArray(n.steps) && n.steps.length === 3 && n.steps.every(s => isStr(s.title) && isStr(s.brief)))) fail('steps must be 3 entries of { title, brief }');
if (n.step_2_no_visit && !(isStr(n.step_2_no_visit.title) && isStr(n.step_2_no_visit.brief))) fail('step_2_no_visit must be { title, brief }');
if (n.steps_emergency && !(Array.isArray(n.steps_emergency) && n.steps_emergency.length === 3 && n.steps_emergency.every(s => isStr(s.title) && isStr(s.brief)))) fail('steps_emergency must be 3 entries of { title, brief }');
for (const s of arr(n.faq_slots)) {
  if (!isStr(s.slot) || !isStr(s.question) || !isStr(s.answer_brief) || !isStr(s.doubt)) fail(`homepage faq_slots entry "${s.slot || s.question || '?'}" needs slot, question, answer_brief and doubt`);
  else if (!S.DOUBTS.includes(s.doubt)) fail(`homepage faq slot "${s.slot}" doubt "${s.doubt}" is not one of ${S.DOUBTS.join(', ')}`);
}
if (n.logo_tiers && !(Array.isArray(n.logo_tiers.ratings) && Array.isArray(n.logo_tiers.tier1))) fail('logo_tiers needs ratings and tier1 arrays');
if (n.materials_tick_list && typeof n.materials_tick_list === 'object') for (const [g, items] of Object.entries(n.materials_tick_list)) if (!(Array.isArray(items) && items.every(isStr))) fail(`materials_tick_list "${g}" must be an array of strings`);
for (const [i, sw] of arr(n.service_words).entries()) if (!(Array.isArray(sw) && isStr(sw[0]))) fail(`service_words[${i}] must be [name, say or null]`);
if (n.core_services && typeof n.core_services === 'object') for (const [k, v] of Object.entries(n.core_services)) { if (k !== lc(k)) warn(`core_services key "${k}" is not lower case`); if (!(Array.isArray(v) && v.every(isStr))) fail(`core_services "${k}" must be an array of strings`); }
if (n.category_work_nouns && typeof n.category_work_nouns === 'object') for (const [k, v] of Object.entries(n.category_work_nouns)) { if (k !== lc(k)) warn(`category_work_nouns key "${k}" is not lower case (the lookup is by lower case GBP category)`); if (!isStr(v)) fail(`category_work_nouns "${k}" is blank`); }
if (n.category_types && typeof n.category_types === 'object') for (const [k, v] of Object.entries(n.category_types)) { if (k !== lc(k)) warn(`category_types key "${k}" is not lower case`); if (!S.TYPES.includes(String(v))) fail(`category_types "${k}" → "${v}" is not a type`); }

// ── The library and the Fillout tabs: GBP categories and the emergency pages ──
// The keys category_types, category_work_nouns and core_services are looked up by are the
// client's category tab names (fillout/services/<niche>.json), lower case; the library's own
// gbp_category column is the fallback where a niche has no services config yet
let lib = null;
try { lib = L.loadLibrary(stem); } catch (_) { lib = null; }
const { stemFor } = require(path.join(root, 'ui/library.js'));
const configDir = path.join(root, 'fillout/services');
const config = fs.readdirSync(configDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(configDir, f), 'utf8'))).find(c => c.nicheKey && stemFor(String(c.nicheKey).replace(/_/g, '-')) === stem) || null;
const libCats = config ? config.categories.map(c => lc(c.name)) : lib ? [...new Set(lib.rows.map(e => lc(e.gbp_category)).filter(c => c && c !== 'additional services'))] : [];
if (config) ok(`Fillout tabs (${path.basename(config.niche || config.nicheKey)}): ${config.categories.map(c => c.name).join(', ')}`);
const emergencyTargets = lib ? [...new Set(lib.rows.filter(e => e.emergency).map(e => e.target))] : [];
const desireTargets = lib ? [...new Set(lib.rows.filter(e => e.desire_led).map(e => e.target))] : [];
// The type keyed overrides (4 Nov 2026) and the niche's own banned phrases
for (const [k, kind] of [['fears_by_type', 'array'], ['faq_slots_by_type', 'slots']]) {
  if (n[k] === undefined) continue;
  if (!n[k] || typeof n[k] !== 'object' || Array.isArray(n[k])) { fail(`${k} must be an object keyed by business type letter`); continue; }
  for (const [t, v] of Object.entries(n[k])) {
    if (!S.TYPES.includes(t)) fail(`${k}: "${t}" is not a business type`);
    if (!Array.isArray(v)) { fail(`${k}.${t} must be an array`); continue; }
    if (kind === 'array' && !v.every(isStr)) fail(`${k}.${t} must be an array of strings`);
    if (kind === 'slots') for (const s of v) { if (!isStr(s.slot) || !isStr(s.question) || !isStr(s.answer_brief) || !isStr(s.doubt)) fail(`${k}.${t}: slot "${s.slot || s.question || '?'}" needs slot, question, answer_brief and doubt`); else if (!S.DOUBTS.includes(s.doubt)) fail(`${k}.${t}: slot "${s.slot}" doubt "${s.doubt}" is not one of ${S.DOUBTS.join(', ')}`); }
  }
}
if (n.banned_phrases !== undefined && !(Array.isArray(n.banned_phrases) && n.banned_phrases.every(isStr))) fail('banned_phrases must be an array of strings');
if (Array.isArray(n.banned_phrases) && Array.isArray(n.words_avoid)) { const both = n.banned_phrases.filter(p => n.words_avoid.map(lc).includes(lc(p))); if (both.length) warn(`in both banned_phrases and words_avoid (the ban wins; drop them from words_avoid): ${both.join(', ')}`); }
if (lib) {
  const nouns = Object.keys(n.category_work_nouns || {});
  const missingNouns = libCats.filter(c => !nouns.includes(c));
  if (missingNouns.length) warn(`category_work_nouns has no noun for the library's GBP categories: ${missingNouns.join(', ')} (their H2s read "[CAT] Services")`);
  const cores = Object.keys(n.core_services || {});
  const missingCore = libCats.filter(c => !cores.includes(c));
  if (missingCore.length) warn(`core_services has no list for: ${missingCore.join(', ')} (the homepage card picks fall back to the client's services)`);
  ok(`library ${lib.file}: ${libCats.length} GBP categories, ${emergencyTargets.length} emergency page(s)${emergencyTargets.length ? ': ' + emergencyTargets.join(', ') : ''}`);
}

// ── The block briefs ──
const types = new Set([n.business_type_default || 'A', ...Object.values(n.category_types || {})]);
const placeholderOk = text => { const bad = [...String(text).matchAll(/\[[A-Z][A-Z_: a-z0-9]*\]/g)].map(m => m[0]).filter(t => !S.PLACEHOLDERS.some(p => t.startsWith(p))); return bad; };
const figure = /(£\s?\d|\d+\s?(%|mm|cm|m\b|metres?|years?|hours?|days?|weeks?|months?|minutes?|degrees|kg|litres?|psi|bar\b|kw|amps?|volts?))/i;
const checkTexts = (where, obj) => {
  const walk = (v, p) => {
    if (typeof v === 'string') {
      const bad = placeholderOk(v); if (bad.length) fail(`${where} ${p}: unknown placeholder ${bad.join(', ')}`);
      if (/[—–]/.test(v)) warn(`${where} ${p}: an em or en dash in a brief (the copy rules forbid them; a brief is read by the model)`);
      if (figure.test(v)) warn(`${where} ${p}: a figure or rule "${v.match(figure)[0]}": the trade facts pack must state it (Table C or E), else take it out`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
  };
  walk(obj, '');
};
const checkEntry = (section, type, entry, gaps, { steps = true } = {}) => {
  for (const g of gaps(entry)) fail(`${section} type ${type}: ${g}`);
  for (const c of arr(entry.problems && entry.problems.cards)) if (!isStr(c.mechanism)) fail(`${section} type ${type}: block 4 card "${c.title}" has no mechanism (its one cause)`);
  if (entry.steps !== undefined && !(Array.isArray(entry.steps) && entry.steps.length === 3 && entry.steps.every(s => isStr(s.title) && isStr(s.brief)))) fail(`${section} type ${type}: steps must be 3 entries of { title, brief }`);
  if (steps && entry.steps === undefined && section === 'category_page_blocks') warn(`${section} type ${type}: no steps (the niche steps are used)`);
  for (const s of arr(entry.faq_slots)) {
    if (!isStr(s.slot) || !isStr(s.question) || !isStr(s.answer_brief) || !isStr(s.doubt)) fail(`${section} type ${type}: FAQ slot "${s.slot || s.question || '?'}" needs slot, question, answer_brief and doubt`);
    else if (!S.DOUBTS.includes(s.doubt)) fail(`${section} type ${type}: FAQ slot "${s.slot}" doubt "${s.doubt}" is not one of ${S.DOUBTS.join(', ')}`);
  }
  if (entry.faq_symptom && !isStr(entry.faq_symptom.answer_brief)) fail(`${section} type ${type}: faq_symptom needs an answer_brief`);
  if (entry.seasonal && !(entry.seasonal.problem_card && isStr(entry.seasonal.problem_card.title) && entry.seasonal.faq_slot && isStr(entry.seasonal.faq_slot.question))) fail(`${section} type ${type}: seasonal needs problem_card { title, brief } and faq_slot { question, answer_brief, doubt }`);
  checkTexts(`${section} ${type}`, entry);
};
const sections = [['category_page_blocks', CB.briefGaps], ['service_page_blocks', SB.briefGaps], ['location_page_blocks', LB.briefGaps]];
for (const [section, gaps] of sections) {
  const all = n[section];
  if (!all || typeof all !== 'object' || !Object.keys(all).length) { fail(`${section} is missing: ${section.replace('_page_blocks', '')} pages are refused ("no ${section.replace('_page_blocks', '')} block briefs for ${stem}")`); continue; }
  for (const t of Object.keys(all)) if (!S.TYPES.includes(t)) fail(`${section}: "${t}" is not a business type (${S.TYPES.join(' ')})`);
  for (const t of types) if (!all[t] && !(t === 'A2' && all.A)) fail(`${section} has no type ${t} entry, but the niche default or a category points at ${t}`);
  for (const [t, entry] of Object.entries(all)) {
    if (!S.TYPES.includes(t)) continue;
    checkEntry(section, t, entry, gaps);
    if (entry.emergency) {
      const merged = { ...entry, ...entry.emergency };
      checkEntry(section, `${t}+emergency`, merged, gaps, { steps: false });
      if (!Array.isArray(entry.emergency.steps)) warn(`${section} type ${t}+emergency: no steps in the variant (the plain steps or steps_emergency are used)`);
    }
    // The desire led variant (service pages, 4 Nov 2026): block 4 as "Is this right for you", situation cards
    if (entry.desire) {
      if (section !== 'service_page_blocks') warn(`${section} type ${t}: a desire variant is read on service pages only`);
      checkEntry(section, `${t}+desire`, { ...entry, ...entry.desire }, gaps, { steps: false });
      const h2 = lc((entry.desire.problems || {}).h2 || '');
      if (/\bsigns?\b|symptom/.test(h2)) fail(`${section} type ${t}+desire: the block 4 H2 "${(entry.desire.problems || {}).h2}" reads as symptoms; a desire led page asks whether the work is right for the reader`);
      for (const c of arr(entry.desire.problems && entry.desire.problems.cards)) if (/\bsymptom|\bsigns? (you|that|of)\b/i.test(`${c.title} ${c.brief}`)) warn(`${section} type ${t}+desire: card "${c.title}" talks of signs or symptoms; a desire led card is the customer's situation`);
    }
  }
  if (section === 'service_page_blocks' && desireTargets.length) {
    const dflt = all[n.business_type_default || 'A'];
    if (dflt && !dflt.desire) warn(`${section}: the library flags ${desireTargets.length} desire led page(s) (${desireTargets.slice(0, 4).join(', ')}${desireTargets.length > 4 ? ', …' : ''}) but type ${n.business_type_default || 'A'} has no desire variant: those pages get "Signs you need it"`);
  }
  if (emergencyTargets.length && section !== 'location_page_blocks') {
    const dflt = all[n.business_type_default || 'A'];
    if (dflt && !dflt.emergency) warn(`${section}: the library flags ${emergencyTargets.length} emergency page(s) but type ${n.business_type_default || 'A'} has no emergency variant: those pages get the plain briefs`);
  }
  ok(`${section}: types ${Object.keys(all).join(', ')}${Object.values(all).some(e => e.emergency) ? ' (with an emergency variant)' : ''}`);
}
if (emergencyTargets.length && n.buttons && !isStr(n.buttons.final_h2_emergency)) warn('buttons.final_h2_emergency is missing: the emergency homepage keeps the plain final H2');
if (emergencyTargets.length && !n.steps_emergency) warn('steps_emergency is missing: the emergency homepage keeps the plain steps');

// ── Briefs that copy the calibration pack (3 Nov 2026) ──
// The model reproduces a brief's own wording, and the validator's PACK-COPY rule blocks any
// sentence that shares a five word run (or 70% of a sentence) with the pack: the first thin
// runs lost their homepages to FAQ briefs that quoted the pack's example answers. So a brief
// may not share such a run with the pack: say the same thing in other words.
try {
  const CP = require(path.join(root, 'calibration-packs.js'));
  const nicheKey = config ? String(config.nicheKey).replace(/_/g, '-') : null;
  const packFile = nicheKey ? CP.fileForNiche(nicheKey) : null;
  if (packFile) {
    const H = require(path.join(root, 'validate-v20.js')).helpers;
    const idx = H.packIndex(CP.readPack(packFile));
    const hits = [];
    const walk = (v, p) => {
      if (typeof v === 'string') { for (const sen of H.sentences(v)) { const h = H.packCopy(sen, idx); if (h) hits.push(`${p}: shares "${h.match}" with the pack: "${sen.slice(0, 80)}"`); } }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
    };
    walk({ faq_slots: n.faq_slots, faq_slots_by_type: n.faq_slots_by_type, steps: n.steps, steps_emergency: n.steps_emergency, step_2_no_visit: n.step_2_no_visit, fears: n.fears, fears_by_type: n.fears_by_type, category_page_blocks: n.category_page_blocks, service_page_blocks: n.service_page_blocks, location_page_blocks: n.location_page_blocks }, '');
    for (const h of hits) fail(`brief copies the pack (${packFile}): ${h}`);
    if (!hits.length) ok(`no brief shares a five word run with ${packFile}`);
  } else warn('no calibration pack found for this niche, so briefs were not checked against one');
} catch (e) { warn(`pack copy check skipped: ${e.message}`); }

// ── The .md mirror ──
const mdName = fs.readdirSync(path.join(root, 'niche-library')).find(f => /^Niche_Library_.*\.md$/i.test(f) && lc(f.replace(/^Niche_Library_|\.md$/gi, '').replace(/_/g, '-')) === stem) || null;
if (!mdName) fail(`no .md mirror: niche-library/Niche_Library_<Niche>.md for ${stem} (the code reads the .json; the .md is the human copy, kept in the same commit)`);
else {
  const md = fs.readFileSync(path.join(root, 'niche-library', mdName), 'utf8');
  const titles = [];
  for (const [section] of sections) for (const entry of Object.values(n[section] || {})) { for (const c of arr(entry.problems && entry.problems.cards)) titles.push([section, c.title]); if (entry.emergency) for (const c of arr(entry.emergency.problems && entry.emergency.problems.cards)) titles.push([section, c.title]); }
  const missing = titles.filter(([, t]) => t && !md.includes(t));
  if (missing.length) fail(`${mdName} does not carry ${missing.length} block 4 card title(s) the .json has: ${missing.slice(0, 5).map(([s, t]) => `"${t}" (${s})`).join(', ')}${missing.length > 5 ? ', …' : ''}`);
  else ok(`${mdName} carries every block 4 card title (${titles.length})`);
}

// ── Report ──
// Per target overrides (copy quality 2, phase 2, 4 Nov 2026): service_overrides keyed by page target,
// category_overrides keyed by category, lower case, each replacing cost, steps, problems or faq_slots
for (const [slot, by] of [['service_overrides', 'page target'], ['category_overrides', 'category']]) {
  const o = n[slot];
  if (o == null) continue;
  if (typeof o !== 'object' || Array.isArray(o)) { fail(`${slot} must be an object keyed by ${by} in lower case`); continue; }
  for (const [k, v] of Object.entries(o)) {
    if (k !== k.toLowerCase()) fail(`${slot} key "${k}" must be lower case`);
    if (!v || typeof v !== 'object') { fail(`${slot} "${k}" must be an object`); continue; }
    const cards4 = c => Array.isArray(c) && c.length === 4 && c.every(x => x && x.title && x.brief);
    if (v.cost && !cards4(v.cost.cards)) fail(`${slot} "${k}": cost needs 4 cards with title and brief`);
    if (v.problems && !cards4(v.problems.cards)) fail(`${slot} "${k}": problems needs 4 cards with title and brief`);
    if (v.steps && (!Array.isArray(v.steps) || v.steps.length !== 3 || v.steps.some(x => !x || !x.title || !x.brief))) fail(`${slot} "${k}": steps needs 3 entries with title and brief`);
    if (v.type && !/^[ABCD]$/.test(String(v.type))) fail(`${slot} "${k}": type must be A, B, C or D`);
    if (v.type && slot === 'service_overrides' && !(n.service_page_blocks || {})[v.type]) fail(`${slot} "${k}": type ${v.type} has no service_page_blocks entry`);
    for (const key of Object.keys(v)) if (!['always_emergency', 'type', 'cost', 'steps', 'problems', 'faq_slots', 'included'].includes(key)) warn(`${slot} "${k}": unknown key ${key}`);
  }
}
const fails = out.filter(o => o[0] === 'FAIL').length, warns = out.filter(o => o[0] === 'WARN').length;
for (const [k, m] of out) console.log(`${k === 'ok' ? '  ok ' : k === 'WARN' ? 'WARN ' : 'FAIL '}${m}`);
console.log(`\n${stem}: ${fails} FAIL, ${warns} WARN`);
process.exit(fails ? 1 : 0);
