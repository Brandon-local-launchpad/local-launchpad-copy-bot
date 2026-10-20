'use strict';

// ── The niche services library ───────────────────────────────────────────────
// One CSV per niche (niche-library/<niche>.csv, Brandon's verdict on every Google Business
// Profile service name): gbp_name, gbp_category, verdict (page / alias / fold / exclude),
// target, note. The page map's services step resolves each GBP name against it before the
// dedupe and fold heuristics (page-map/plan-v3.js resolveLibrary):
//   page     a base service page named by target (the UK name); the GBP name is its source
//   alias    no page of its own: absorbed into the page whose target it names
//   fold     no page: listed on the named category page, which keeps the keyword
//   exclude  no page, not mentioned anywhere
// A name may appear under several GBP categories with different verdicts, so rows are keyed by
// name + category; a row with gbp_category "Additional services" is a free-text intake name.
//
// Matching (Brandon, 20 Oct 2026): every library is loaded, not only the niche's own. A client's
// service is looked up by name + category in its niche's library, then by name there, then the
// same in the other libraries. A free-text "Additional services" row (the typed intake answer,
// kind "additional") is also matched after normalising (case, "&", punctuation, plurals, word
// forms) and then fuzzily (findEntries below); GBP names are matched exactly. A name not found
// anywhere falls through to the heuristics and is flagged "not in library".
//
// Hub mapping: niche-library/<niche>-categories.csv (gbp_category, hub, note) says which category
// page is the hub for each GBP category ("Construction Company" → "Building Firm"). A fold whose
// target is not one of the client's tabs still folds when the client has a tab with the same
// hub. Optional: a niche without the file maps nothing.

const fs = require('fs');
const path = require('path');

const VERDICTS = ['page', 'alias', 'fold', 'exclude'];
const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');

// Which file serves a niche: a file name given directly ("roofer"), else the niche key from
// fillout/niches.js (a Fillout label, an old trade name or the key itself), which is the file
// name except where the two differ below. 28 niches, 28 files.
const KEY_TO_FILE = { builders: 'builder', roofers: 'roofer', landscapers: 'landscaper', electricians: 'electrician', 'tree-surgeons': 'tree-surgeon', 'dog-walkers': 'pet-care', 'driveways-paving': 'driveways', 'loft-extensions': 'loft-conversions' };
function keyFor(niche) {
  const n = norm(niche);
  if (!n) return '';
  const direct = n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (direct && fs.existsSync(path.join(__dirname, `${direct}.csv`))) return direct;
  const niches = require('../fillout/niches');
  const key = niches.nicheByKey(n) ? n : niches.nicheKeyFor(n);
  if (!key || key === 'other') return direct;
  return KEY_TO_FILE[key] || key;
}
function fileFor(niche) {
  const file = path.join(__dirname, `${keyFor(niche)}.csv`);
  return fs.existsSync(file) ? file : null;
}
function categoriesFileFor(niche) {
  const file = path.join(__dirname, `${keyFor(niche)}-categories.csv`);
  return fs.existsSync(file) ? file : null;
}

// A small CSV reader: commas, double quotes with "" escapes, CRLF or LF
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

// ── Name matching ────────────────────────────────────────────────────────────
// matchKey: the loose form of a service name. Case, "&" as "and", punctuation and brackets
// gone, "service(s)" dropped, plurals and a few word forms collapsed, words sorted.
const STEMS = { landscaping: 'landscape', fencing: 'fence', decking: 'deck', paving: 'pave', draining: 'drain', drainage: 'drain', planting: 'plant', fitting: 'fit', fitted: 'fit', installation: 'install', installations: 'install', installing: 'install', repairs: 'repair', repairing: 'repair', cleaning: 'clean', conversions: 'conversion' };
const singular = w => (w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.replace(/ies$/, 'y').replace(/s$/, '') : w);
// A light stem: the list above, else the plural and a common ending dropped ("instalation" → "instal",
// so a typo in a word the list stems still comes close to "install")
function stem(w) {
  if (STEMS[w]) return STEMS[w];
  const s = singular(w);
  for (const end of ['ation', 'ing', 'ed']) if (s.endsWith(end) && s.length - end.length >= 4) return s.slice(0, -end.length);
  return s;
}
function tokens(name) {
  return norm(name).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .filter(w => w && w !== 'service' && w !== 'services' && w !== 'and' && w !== 'the' && w !== 'of')
    .map(stem);
}
const matchKey = name => [...new Set(tokens(name))].sort().join(' ');
const plain = name => norm(name).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// Two words are the same word when they differ by a typo or two
const sameWord = (x, y) => x === y || (x.length >= 4 && y.length >= 4 && 1 - levenshtein(x, y) / Math.max(x.length, y.length) >= 0.8);

// 0..1: the word overlap of two names (Dice), each word allowed a typo. A name whose words
// (two or more) all appear in the other scores 0.85, so "RSJ installation" finds "Steel beam
// (RSJ) installation". Shared suffixes alone ("Pond installation" / "Sod installation") score low.
function similarity(a, b) {
  const ta = [...new Set(tokens(a))], tb = [...new Set(tokens(b))];
  if (!ta.length || !tb.length) return 0;
  const used = new Set();
  let shared = 0;
  for (const x of ta) { const j = tb.findIndex((y, i) => !used.has(i) && sameWord(x, y)); if (j >= 0) { used.add(j); shared++; } }
  const dice = (2 * shared) / (ta.length + tb.length);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const contained = short.length >= 2 && shared === short.length && long.length > short.length;
  return Math.max(dice, contained ? 0.85 : 0);
}
const FUZZY_MIN = 0.8;      // the best match must score at least this
const FUZZY_MARGIN = 0.05;  // and beat the runner-up by this, else it is ambiguous and nothing matches

// { file, niche, entries: Map(norm gbp_name → first entry), rows: [entries], byKey: Map("name|category" → entry),
//   byMatchKey: Map(matchKey → [entries]), problems: [] } or null when the niche has no library
function loadLibrary(niche, { file = fileFor(niche) } = {}) {
  if (!file) return null;
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const head = rows[0].map(h => norm(h));
  const col = name => head.indexOf(name);
  const problems = [];
  for (const c of ['gbp_name', 'verdict', 'target']) if (col(c) < 0) problems.push(`column "${c}" missing`);
  const entries = new Map(), byKey = new Map(), byMatchKey = new Map(), list = [];
  if (!problems.length) {
    rows.slice(1).forEach((r, i) => {
      const e = { gbp_name: (r[col('gbp_name')] || '').trim(), gbp_category: (r[col('gbp_category')] || '').trim(), verdict: norm(r[col('verdict')]), target: (r[col('target')] || '').trim(), note: (r[col('note')] || '').trim(), line: i + 2 };
      if (!e.gbp_name) return;
      if (!VERDICTS.includes(e.verdict)) { problems.push(`line ${e.line}: "${e.gbp_name}" has verdict "${e.verdict}", not one of ${VERDICTS.join(' / ')}`); return; }
      if (e.verdict !== 'exclude' && !e.target) { problems.push(`line ${e.line}: "${e.gbp_name}" (${e.verdict}) has no target`); return; }
      const k = `${norm(e.gbp_name)}|${norm(e.gbp_category)}`;
      if (byKey.has(k)) { problems.push(`line ${e.line}: "${e.gbp_name}" under "${e.gbp_category}" is listed twice; the first line wins`); return; }
      byKey.set(k, e);
      list.push(e);
      if (!entries.has(norm(e.gbp_name))) entries.set(norm(e.gbp_name), e);
      const mk = matchKey(e.gbp_name);
      if (!byMatchKey.has(mk)) byMatchKey.set(mk, []);
      byMatchKey.get(mk).push(e);
    });
  }
  return { file: path.basename(file), niche: path.basename(file, '.csv'), entries, rows: list, byKey, byMatchKey, problems };
}

// niche-library/<niche>-categories.csv: { file, byCategory: Map(norm gbp_category → hub), problems } or null
function loadHubs(niche, { file = categoriesFileFor(niche) } = {}) {
  if (!file) return null;
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const head = rows[0].map(h => norm(h));
  const col = name => head.indexOf(name);
  const problems = [];
  for (const c of ['gbp_category', 'hub']) if (col(c) < 0) problems.push(`${path.basename(file)}: column "${c}" missing`);
  const byCategory = new Map();
  if (!problems.length) {
    rows.slice(1).forEach((r, i) => {
      const cat = (r[col('gbp_category')] || '').trim(), hub = (r[col('hub')] || '').trim();
      if (!cat) return;
      if (!hub) { problems.push(`${path.basename(file)} line ${i + 2}: "${cat}" has no hub`); return; }
      if (byCategory.has(norm(cat))) { problems.push(`${path.basename(file)} line ${i + 2}: "${cat}" is listed twice; the first line wins`); return; }
      byCategory.set(norm(cat), hub);
    });
  }
  return { file: path.basename(file), byCategory, problems };
}

// Every library file, cached by directory listing
let allCache = null;
function loadAllLibraries() {
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.csv') && !f.endsWith('-categories.csv')).sort();
  const sig = files.join('|');
  if (allCache && allCache.sig === sig) return allCache.libs;
  const libs = files.map(f => loadLibrary(null, { file: path.join(__dirname, f) }));
  allCache = { sig, libs };
  return libs;
}

// The niche's own library plus every other, and its hub table.
// { niche, file (own file or null), own, others, hubs, problems }
function loadLibrarySet(niche) {
  const own = loadLibrary(niche);
  const hubs = loadHubs(niche);
  const others = loadAllLibraries().filter(l => !own || l.file !== own.file);
  return { niche: keyFor(niche), file: own ? own.file : null, own, others, hubs, problems: [...(own ? own.problems : []), ...(hubs ? hubs.problems : [])] };
}

// A plain library (old callers and fixtures) or a set → a set
function asSet(lib) {
  if (!lib) return null;
  if (lib.own !== undefined && lib.others !== undefined) return lib;
  return { niche: lib.niche || null, file: lib.file || null, own: lib, others: [], hubs: null, problems: lib.problems || [] };
}

// The library rows that answer for a service name under the given category names.
// Ranked: own library name + category, own name, (own loose/fuzzy), other libraries name +
// category, other name, (other loose/fuzzy). Loose and fuzzy matching only with fuzzy: true
// (free-text intake rows). Each match: { entry, file, own, how: 'name+category' | 'name' |
// 'loose' | 'fuzzy', score }.
function findEntries(set, name, categories = [], { fuzzy = false } = {}) {
  set = asSet(set);
  if (!set) return [];
  const n = norm(name);
  const cats = (categories || []).map(norm).filter(Boolean);
  const out = [];
  const seen = new Set();
  const push = (entry, lib, own, how, score = 1) => {
    const id = `${lib.file}:${entry.line}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ entry, file: lib.file, own, how, score });
  };
  const exact = (lib, own) => {
    for (const c of cats) { const e = lib.byKey.get(`${n}|${c}`); if (e) push(e, lib, own, 'name+category'); }
    for (const e of lib.rows) if (norm(e.gbp_name) === n) push(e, lib, own, 'name');
  };
  const loose = (lib, own) => {
    const mk = matchKey(name);
    for (const e of lib.byMatchKey.get(mk) || []) push(e, lib, own, 'loose', 0.99);
    // fuzzy: the best scoring row, only when it is clear
    const scored = lib.rows.map(e => ({ e, score: similarity(name, e.gbp_name) })).filter(x => x.score >= FUZZY_MIN).sort((a, b) => b.score - a.score);
    if (!scored.length) return;
    const best = scored[0];
    const rivals = scored.filter(x => x !== best && matchKey(x.e.gbp_name) !== matchKey(best.e.gbp_name));
    if (rivals.length && best.score - rivals[0].score < FUZZY_MARGIN) return;
    for (const x of scored.filter(x => matchKey(x.e.gbp_name) === matchKey(best.e.gbp_name))) push(x.e, lib, own, 'fuzzy', x.score);
  };
  if (set.own) { exact(set.own, true); if (fuzzy) loose(set.own, true); }
  for (const lib of set.others) exact(lib, false);
  if (fuzzy) for (const lib of set.others) loose(lib, false);
  return out;
}

// The hub a category name belongs to (itself when the table has no row for it)
function hubOf(set, categoryName) {
  set = asSet(set);
  const h = set && set.hubs ? set.hubs.byCategory.get(norm(categoryName)) : null;
  return h || categoryName;
}

module.exports = { loadLibrary, loadLibrarySet, loadAllLibraries, loadHubs, findEntries, hubOf, asSet, fileFor, categoriesFileFor, keyFor, parseCsv, norm, matchKey, similarity, VERDICTS, FUZZY_MIN };
