'use strict';

// ── GBP output validator ─────────────────────────────────────────────────────
// The rules in prompts/GBP_Validator.md, run after each step of the GBP job
// (description, services, products). A FAIL blocks the save; a FLAG saves and marks
// the field for Brandon to check. The banned phrase list is read from that file, so
// the file stays the only copy.
//
// Context (ctx): { locked: [{ category, service }], minServices, showPrices, towns,
//   cv, acronyms } — gbp/inputs.js builds it. Every check returns issues:
//   { level: 'FAIL'|'FLAG', rule, field, message }

const fs = require('fs');
const path = require('path');

const VALIDATOR_FILE = path.join(__dirname, '..', 'prompts', 'GBP_Validator.md');

const LIMITS = {
  description: [720, 750],
  service_description: [200, 300],
  product_title: [0, 58],
  product_description: [600, 1000],
};

const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
const count = s => [...String(s == null ? '' : s)].length;

// "Banned phrases, case insensitive: a, b, c" → ['a', 'b', 'c']
function loadBannedPhrases(file = VALIDATOR_FILE) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/Banned phrases[^:\n]*:\s*([^\n]+)/i);
  if (!m) throw new Error(`No "Banned phrases:" line in ${path.basename(file)}`);
  return m[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
let bannedCache = null;
const banned = () => (bannedCache = bannedCache || loadBannedPhrases());

// ── Content patterns ──
const PHONE_RE = /(?:\+44\s?\d|\(?0\d)[\d\s()]{7,}\d/;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:co\.uk|org\.uk|com|uk|org|net|io)\b/i;
const DASH_RE = /[-‐‑‒–—―]/;
const PRICE_RE = /£|\b\d[\d,.]*\s*(?:per|p\/)\b/i;

function dashName(ch) {
  return { '-': 'hyphen', '–': 'en dash', '—': 'em dash' }[ch] || 'dash';
}

function contentIssues(text, field, ctx, { prices = false, towns = false } = {}) {
  const out = [];
  const t = String(text || '');
  if (PHONE_RE.test(t)) out.push({ level: 'FAIL', rule: 'no-phone', field, message: `"${field}" has a phone number ("${t.match(PHONE_RE)[0].trim()}").` });
  if (EMAIL_RE.test(t)) out.push({ level: 'FAIL', rule: 'no-email', field, message: `"${field}" has an email address ("${t.match(EMAIL_RE)[0]}").` });
  if (URL_RE.test(t)) out.push({ level: 'FAIL', rule: 'no-url', field, message: `"${field}" has a URL or domain ("${t.match(URL_RE)[0]}").` });
  const d = t.match(DASH_RE);
  if (d) out.push({ level: 'FAIL', rule: 'no-dash', field, message: `"${field}" has a ${dashName(d[0])} ("${snippet(t, d.index)}").` });
  if (prices && !ctx.showPrices && PRICE_RE.test(t)) out.push({ level: 'FAIL', rule: 'no-prices', field, message: `"${field}" has a price ("${t.match(PRICE_RE)[0]}") and show_prices is not yes.` });
  if (towns) for (const town of ctx.towns || []) {
    if (town && new RegExp(`\\b${escapeRe(town)}\\b`, 'i').test(t)) { out.push({ level: 'FAIL', rule: 'no-town-in-title', field, message: `"${field}" names a town ("${town}").` }); break; }
  }
  for (const w of capsWords(t, ctx)) { out.push({ level: 'FAIL', rule: 'no-caps', field, message: `"${field}" has capitals for emphasis ("${w}").` }); break; }
  const hits = bannedHits(t);
  if (hits.length) out.push({ level: 'FAIL', rule: 'banned-phrase', field, message: `"${field}" uses a banned phrase (${hits.map(h => `"${h}"`).join(', ')}).` });
  return out;
}

function snippet(t, i) { return t.slice(Math.max(0, i - 12), i + 13).replace(/\s+/g, ' ').trim(); }
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function bannedHits(t) {
  const low = ` ${String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  return banned().filter(p => low.includes(` ${p.replace(/[^a-z0-9]+/g, ' ')} `));
}

// Whole words in capitals (two letters or more), minus acronyms the client record carries
function capsWords(t, ctx) {
  const allowed = acronymSet(ctx);
  const out = [];
  for (const m of String(t).matchAll(/\b[A-Z]{2,}\b/g)) if (!allowed.has(m[0])) out.push(m[0]);
  return out;
}
const BASE_ACRONYMS = ['UK', 'VAT', 'DIY', 'GBP', 'FAQ', 'MOT', 'LED', 'UPVC', 'PVC', 'MDF', 'GRP', 'EPDM', 'LTD', 'PLC', 'CSCS', 'NICEIC', 'FMB', 'ISO', 'TV', 'CCTV', 'SEO'];
function acronymSet(ctx) {
  const set = new Set([...BASE_ACRONYMS, ...(ctx.acronyms || [])]);
  const scan = v => { for (const m of String(v == null ? '' : v).matchAll(/\b[A-Z]{2,}\b/g)) set.add(m[0]); };
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); else scan(v); };
  walk(ctx.cv || {});
  for (const l of ctx.locked || []) { scan(l.service); scan(l.category); }
  return set;
}

// ── Facts (FLAG): a year, a number of years, an accreditation, a membership, an insurance
// figure or a guarantee term that the client values don't carry ──
const ACCRED_RE = /\b(accredited|accreditation|member of|members of|membership|registered with|approved by|certified|certificate|certification|checkatrade|trustmark|trust a trader|which\? trusted|fmb|niceic|gas safe|city and guilds|iso \d+|safecontractor|constructionline|chas\b)/i;
const GUARANTEE_RE = /\b(guarantee[sd]?|warrant(?:y|ies|ied))\b/i;

function factIssues(text, field, ctx) {
  const out = [];
  const t = String(text || '');
  const cv = ctx.cv || {};
  const cvText = cvFlat(cv);
  const yearsTrading = tradingYears(cv);
  // Years: 19xx/20xx
  for (const m of t.matchAll(/\b(19\d\d|20\d\d)\b/g)) {
    if (!cvText.includes(m[1])) out.push({ level: 'FLAG', rule: 'fact-year', field, message: `"${field}" names the year ${m[1]}, which is not in the client values.` });
  }
  // "N years", "N+ years", "over N years", words too
  for (const m of t.matchAll(/\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|twenty five|thirty|forty|fifty)\+?\s+years?\b/gi)) {
    const n = wordToNumber(m[1]);
    const ok = n !== null && (String(n) === String(cv.years_trading || '') || n === yearsTrading || String(n) === String(cv.guarantee_years || '') || new RegExp(`\\b${n}\\s*(?:\\+\\s*)?years?\\b`, 'i').test(cvText));
    if (!ok) out.push({ level: 'FLAG', rule: 'fact-years', field, message: `"${field}" says "${m[0]}", which the client values don't give.` });
  }
  // Accreditations and memberships
  const a = t.match(ACCRED_RE);
  if (a) {
    const term = a[1].toLowerCase();
    const logos = (Array.isArray(cv.verified_logos) ? cv.verified_logos : []).map(l => (typeof l === 'string' ? l : l && l.name) || '').join(' ').toLowerCase();
    if (!cvText.includes(term) && !logos.includes(term)) out.push({ level: 'FLAG', rule: 'fact-accreditation', field, message: `"${field}" claims an accreditation or membership ("${a[0]}") that is not in the client values.` });
  }
  // Insurance figures: £5m, £2 million, 5m cover
  for (const m of t.matchAll(/£\s?(\d[\d,.]*)\s*(m|million|k)?\b/gi)) {
    const fig = `${m[1].replace(/,/g, '')}${(m[2] || '').toLowerCase().replace('million', 'm')}`;
    const ins = String(cv.insurance_cover || '').toLowerCase().replace(/[£,\s]/g, '').replace('million', 'm');
    if (!ins || !ins.startsWith(fig)) out.push({ level: 'FLAG', rule: 'fact-insurance', field, message: `"${field}" names a figure ("${m[0]}") that does not match insurance_cover.` });
  }
  if (/\binsur(?:ed|ance)\b/i.test(t) && !cv.insurance_cover) out.push({ level: 'FLAG', rule: 'fact-insurance', field, message: `"${field}" mentions insurance and insurance_cover is blank.` });
  // Guarantees
  if (GUARANTEE_RE.test(t) && !cv.guarantee_years && !cv.manufacturer_warranty && !cv.guarantee_scope) {
    out.push({ level: 'FLAG', rule: 'fact-guarantee', field, message: `"${field}" mentions a guarantee or warranty and the client values carry none.` });
  }
  return out;
}

function cvFlat(cv) {
  const parts = [];
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); else if (v != null && v !== '') parts.push(String(v)); };
  walk(cv);
  return parts.join(' | ').toLowerCase();
}
function tradingYears(cv) {
  const y = parseInt(cv.year_founded, 10);
  return Number.isFinite(y) ? new Date().getFullYear() - y : null;
}
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, 'twenty five': 25, thirty: 30, forty: 40, fifty: 50 };
function wordToNumber(w) {
  const s = String(w).toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return WORDS[s] === undefined ? null : WORDS[s];
}

// ── Near duplicate service names (Brandon, 23 Oct): two names that differ only by a
// plural, the word order, or the words custom, bespoke, services or work are one service ──
const DROP_WORDS = new Set(['custom', 'bespoke', 'service', 'services', 'work']);
function singular(w) {
  if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(ss|us|is)$/.test(w)) return w;
  if (w.length > 4 && /(ches|shes|xes|ses)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && /s$/.test(w)) return w.slice(0, -1);
  return w;
}
function nameKey(name) {
  return norm(name).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !DROP_WORDS.has(w)).map(singular).sort().join(' ');
}
function nearDuplicates(names) {
  const byKey = new Map();
  const pairs = [];
  for (const n of names) {
    const k = nameKey(n);
    if (!k) continue;
    if (byKey.has(k)) { if (norm(byKey.get(k)) !== norm(n)) pairs.push([byKey.get(k), n]); }
    else byKey.set(k, n);
  }
  return pairs;
}

// ── Category phrasing in the description (Brandon, 23 Oct): never "As [category], we";
// one category phrase per sentence at most ──
function categoryRe(cat) {
  // "Tree Service" → tree services?, "Landscaper" → landscapers?
  return new RegExp(`\\b${escapeRe(cat).replace(/\\s+/g, '\\s+')}s?\\b`, 'i');
}
function categoryIssues(text, field, ctx) {
  const out = [];
  const cats = [...(ctx.categories || [])].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!cats.length) return out;
  const t = String(text || '');
  const asOpener = t.match(/\b[Aa]s (?:a |an |the |our |your )?([^,.;]{0,70}?),? (?:we|our|the team|I)\b/);
  if (asOpener && cats.some(c => categoryRe(c).test(asOpener[1]))) out.push({ level: 'FAIL', rule: 'category-opener', field, message: `"${field}" opens a clause with "As [category], we" ("${asOpener[0].slice(0, 60)}"); name the category inside the sentence instead.` });
  for (const sentence of t.split(/(?<=[.!?])\s+/)) {
    let rest = sentence;
    const named = [];
    for (const c of cats) { const re = categoryRe(c); if (re.test(rest)) { named.push(c); rest = rest.replace(new RegExp(re.source, 'gi'), ' '); } }
    if (named.length > 1) { out.push({ level: 'FAIL', rule: 'category-per-sentence', field, message: `"${field}" names ${named.length} categories in one sentence (${named.join(', ')}): one category phrase per sentence at most ("${sentence.slice(0, 80)}").` }); break; }
  }
  // At most three secondary categories named across the whole text (Brandon, 23 Oct)
  const primary = norm(ctx.primaryCategory || '');
  let rest = t;
  const secondariesNamed = [];
  for (const c of cats) { if (norm(c) === primary) continue; const re = categoryRe(c); if (re.test(rest)) { secondariesNamed.push(c); rest = rest.replace(new RegExp(re.source, 'gi'), ' '); } }
  if (secondariesNamed.length > 3) out.push({ level: 'FAIL', rule: 'secondary-count', field, message: `"${field}" names ${secondariesNamed.length} secondary categories (${secondariesNamed.join(', ')}); the limit is three. Name the others' services, not the categories.` });
  return out;
}

// The areas sentence (the one listing two or more of the other areas) does not repeat the
// main town, and no sentence ends with a filler location phrase (Brandon, 23 Oct)
const FILLER_END_RE = /\b(?:around|for|in|across|on|at|to|throughout|near)\s+(?:the|your|our|a|any|every|all)?\s*(?:whole\s+|wider\s+|local\s+|surrounding\s+)?(?:garden|gardens|home|homes|house|houses|area|areas|property|properties|neighbourhood|region|city|town|premises|place|space|outdoor space|outside space)\s*[.!?]?$/i;
function areaIssues(text, field, ctx) {
  const out = [];
  const towns = (ctx.towns || []).filter(Boolean);
  const main = towns[0] || '';
  const others = towns.slice(1);
  const sentences = String(text || '').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  if (main && others.length >= 2) {
    const named = s => others.filter(t => new RegExp(`\\b${escapeRe(t)}\\b`, 'i').test(s)).length;
    const areas = sentences.find((s, i) => i > 0 && named(s) >= 2);
    if (areas && new RegExp(`\\b${escapeRe(main)}\\b`, 'i').test(areas)) out.push({ level: 'FAIL', rule: 'areas-main-town', field, message: `"${field}" repeats the main town (${main}) in the areas sentence ("${areas.slice(0, 80)}"); sentence one has it already.` });
  }
  const filler = sentences.find(s => FILLER_END_RE.test(s));
  if (filler) out.push({ level: 'FAIL', rule: 'filler-ending', field, message: `"${field}" ends a sentence with a filler location phrase ("…${filler.slice(-50)}"); end on the job, the material or the place by name.` });
  return out;
}

// No two consecutive sentences start with the same word (Brandon, 23 Oct): "Our … . Our … ." fails
function openingIssues(text, field) {
  const out = [];
  const firsts = String(text || '').split(/(?<=[.!?])\s+|\n+/).map(s => (s.trim().match(/^["'(]*([A-Za-z0-9’']+)/) || [])[1] || '').map(w => w.toLowerCase());
  for (let i = 1; i < firsts.length; i++) {
    if (firsts[i] && firsts[i] === firsts[i - 1]) { out.push({ level: 'FAIL', rule: 'same-opening', field, message: `"${field}" has two consecutive sentences starting with "${firsts[i]}"; vary the openings.` }); break; }
  }
  return out;
}

// ── Proof point share (Brandon, 23 Oct): no proof point in more than a quarter of the
// service descriptions. ctx.proofPoints: [{ text, detect }], detect a function or RegExp ──
function proofShareIssues(list, ctx) {
  const out = [];
  const points = (ctx.proofPoints || []).filter(p => p && p.detect);
  if (!points.length || !list.length) return out;
  for (const p of points) {
    const hit = t => (typeof p.detect === 'function' ? p.detect(t) : p.detect.test(String(t || '')));
    const n = list.filter(s => hit(s.description)).length;
    if (n / list.length > 0.25) out.push({ level: 'FAIL', rule: 'proof-share', field: 'services', message: `The proof point "${p.text}" appears in ${n} of ${list.length} service descriptions (${Math.round(100 * n / list.length)}%); the limit is a quarter. Spread the proof points and leave most descriptions without one.` });
  }
  return out;
}

// ── Proof points with internal capitals (Brandon, round 3): "Family Run and Independent"
// mid sentence fails; proper nouns (ctx.properNouns) and acronyms are allowed ──
const PROOF_STOP = new Set(['the', 'and', 'with', 'for', 'our', 'your', 'are', 'from', 'that', 'this', 'any', 'all', 'you', 'not', 'but']);
// [start, end) character spans where a phrase from the list occurs (case insensitive, whole words)
function phraseSpans(text, phrases = []) {
  const spans = [];
  for (const p of phrases) {
    if (!p) continue;
    const re = new RegExp(`\\b${escapeRe(p).replace(/\\?\s+/g, '\\s+')}\\b`, 'gi');
    for (const m of String(text || '').matchAll(re)) spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function proofCapsIssues(text, field, ctx) {
  const out = [];
  const points = ctx.proofPoints || [];
  if (!points.length) return out;
  const proofWords = new Set(points.flatMap(p => String(p.text || '').toLowerCase().split(/[^a-z0-9]+/)).filter(w => w.length >= 3 && !PROOF_STOP.has(w)));
  const proper = new Set((ctx.properNouns || []).map(w => String(w).toLowerCase()));
  let offset = 0;
  for (const sentence of String(text || '').split(/(?<=[.!?])\s+|\n+/)) {
    const spans = phraseSpans(sentence, ctx.properPhrases || []);
    const words = sentence.trim().split(/\s+/);
    let pos = sentence.indexOf(words[0]);
    for (let i = 0; i < words.length; i++) {
      const start = sentence.indexOf(words[i], pos); pos = start + words[i].length;
      if (i === 0) continue;
      const core = words[i].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
      if (!/^[A-Z][a-z]+$/.test(core)) continue;                       // Title Case only: acronyms and lower case pass
      const low = core.toLowerCase();
      if (!proofWords.has(low) || proper.has(low)) continue;
      if (spans.some(([a, b]) => start >= a && start < b)) continue;  // inside a trade facts pack name
      void offset;
      out.push({ level: 'FAIL', rule: 'proof-caps', field, message: `"${field}" writes a proof point with capitals inside a sentence ("${words.slice(Math.max(0, i - 1), i + 3).join(' ')}"); proof points are lower case except proper nouns.` });
      return out;
    }
  }
  return out;
}

// ── Closing sentence pattern (Brandon, round 3): no more than a third of the service
// descriptions may end with a sentence that starts with the service name ──
function closingPatternIssues(list) {
  const out = [];
  if (!list.length) return out;
  const endsWithName = list.filter(s => {
    const sentences = String(s.description || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    const last = (sentences[sentences.length - 1] || '').replace(/^["'(]+/, '');
    return norm(s.service) && norm(last).startsWith(norm(s.service));
  });
  if (endsWithName.length / list.length > 1 / 3) out.push({ level: 'FAIL', rule: 'closing-pattern', field: 'services', message: `${endsWithName.length} of ${list.length} service descriptions end with a sentence that starts with the service name (${endsWithName.slice(0, 4).map(s => `"${s.service}"`).join(', ')}${endsWithName.length > 4 ? ', …' : ''}); the limit is a third. Vary the closing sentence.` });
  return out;
}

function lengthIssue(text, field, [min, max], what) {
  const n = count(text);
  if (n < min) return { level: 'FAIL', rule: 'length', field, message: `${what} is ${n} characters; it needs ${min} to ${max}.` };
  if (n > max) return { level: 'FAIL', rule: 'length', field, message: `${what} is ${n} characters; the limit is ${max}.` };
  return null;
}

// ── The three steps ──
function validateDescription(description, ctx) {
  const issues = [];
  const text = String(description || '');
  if (!text.trim()) issues.push({ level: 'FAIL', rule: 'missing', field: 'description', message: 'The description is empty.' });
  else {
    const l = lengthIssue(text, 'description', LIMITS.description, 'The description');
    if (l) issues.push(l);
    issues.push(...contentIssues(text, 'description', ctx));
    issues.push(...categoryIssues(text, 'description', ctx));
    issues.push(...openingIssues(text, 'description'));
    issues.push(...areaIssues(text, 'description', ctx));
    issues.push(...proofCapsIssues(text, 'description', ctx));
    issues.push(...factIssues(text, 'description', ctx));
  }
  return result(issues);
}

function validateServices(services, ctx) {
  const issues = [];
  const list = Array.isArray(services) ? services : [];
  const locked = ctx.locked || [];
  const lockedByName = new Map(locked.map(l => [norm(l.service), l]));
  const minServices = Math.max(20, ctx.minServices || 0);
  if (!list.length) return result([{ level: 'FAIL', rule: 'missing', field: 'services', message: 'No services came back.' }]);

  // Every locked service present, name unchanged, under its category
  const seenLocked = new Set();
  for (const s of list) {
    if (String(s.type || '').toUpperCase() !== 'LOCKED') continue;
    const l = lockedByName.get(norm(s.service));
    if (!l) { issues.push({ level: 'FAIL', rule: 'locked-unknown', field: s.service, message: `"${s.service}" is marked LOCKED but is not a service page in the page map.` }); continue; }
    if (s.service !== l.service) issues.push({ level: 'FAIL', rule: 'locked-renamed', field: s.service, message: `Locked service "${l.service}" came back as "${s.service}"; the name must not change.` });
    if (norm(s.category) !== norm(l.category)) issues.push({ level: 'FAIL', rule: 'locked-category', field: l.service, message: `Locked service "${l.service}" sits under "${s.category}"; the page map puts it under "${l.category}".` });
    seenLocked.add(norm(l.service));
  }
  for (const l of locked) {
    if (seenLocked.has(norm(l.service))) continue;
    const asVariant = list.find(s => norm(s.service) === norm(l.service));
    issues.push({ level: 'FAIL', rule: 'locked-missing', field: l.service, message: asVariant ? `Locked service "${l.service}" came back marked ${asVariant.type || 'without a type'}; it must be LOCKED.` : `Locked service "${l.service}" is missing.` });
  }
  // Every service once; never under two categories
  const byName = new Map();
  for (const s of list) {
    const k = norm(s.service);
    if (!k) { issues.push({ level: 'FAIL', rule: 'missing', field: 'services', message: 'A service has no name.' }); continue; }
    if (byName.has(k)) {
      const first = byName.get(k);
      issues.push({ level: 'FAIL', rule: 'duplicate', field: s.service, message: norm(first.category) === norm(s.category) ? `"${s.service}" appears twice under "${s.category}".` : `"${s.service}" appears under two categories ("${first.category}" and "${s.category}").` });
    } else byName.set(k, s);
  }
  // Near duplicates: a FAIL when the model can change one of the pair (a variant); two
  // locked names that collide are the page map's to fix, so that pair is a FLAG
  for (const [a, b] of nearDuplicates([...byName.values()].map(s => s.service))) {
    const bothLocked = lockedByName.has(norm(a)) && lockedByName.has(norm(b));
    issues.push({ level: bothLocked ? 'FLAG' : 'FAIL', rule: 'near-duplicate', field: b, message: `"${a}" and "${b}" differ only by a plural, the word order, or the words custom, bespoke, services or work: one service, listed once.${bothLocked ? ' Both are page map names, so the page map needs the fix.' : ''}` });
  }
  // Count
  const total = byName.size;
  if (total < minServices) issues.push({ level: 'FAIL', rule: 'count', field: 'services', message: `${total} services; the target is at least ${minServices}${ctx.competitorCount ? ` (competitors list ${ctx.competitorCount} on average)` : ''}.` });
  // Every VARIANT shares a category with a LOCKED parent; the type is one of the two
  const lockedCats = new Set(locked.map(l => norm(l.category)));
  for (const s of list) {
    const type = String(s.type || '').toUpperCase();
    if (type === 'LOCKED') continue;
    if (type !== 'VARIANT') { issues.push({ level: 'FAIL', rule: 'type', field: s.service, message: `"${s.service}" has the type "${s.type || ''}"; it must be LOCKED or VARIANT.` }); continue; }
    if (!lockedCats.has(norm(s.category))) issues.push({ level: 'FAIL', rule: 'variant-category', field: s.service, message: `Variant "${s.service}" sits under "${s.category}", a category with no locked service.` });
  }
  // Each description: length, content, facts. Names: no dash (locked names are the site's own and are exempt)
  for (const s of list) {
    const field = s.service || '(unnamed)';
    const l = lengthIssue(s.description, field, LIMITS.service_description, `The description of "${field}"`);
    if (l) issues.push(l);
    issues.push(...contentIssues(s.description, field, ctx));
    issues.push(...proofCapsIssues(s.description, field, ctx));
    issues.push(...factIssues(s.description, field, ctx));
    if (!lockedByName.has(norm(s.service))) {
      const d = String(s.service || '').match(DASH_RE);
      if (d) issues.push({ level: 'FAIL', rule: 'no-dash', field, message: `The service name "${s.service}" has a ${dashName(d[0])}.` });
    }
  }
  issues.push(...proofShareIssues(list, ctx));
  issues.push(...closingPatternIssues(list));
  return result(issues, { total, locked: seenLocked.size, variants: list.filter(s => String(s.type || '').toUpperCase() === 'VARIANT').length, minServices });
}

function validateProducts(products, ctx) {
  const issues = [];
  const list = Array.isArray(products) ? products : [];
  const locked = ctx.locked || [];
  if (!list.length) return result([{ level: 'FAIL', rule: 'missing', field: 'products', message: 'No products came back.' }]);
  const byService = new Map(list.map(p => [norm(p.service), p]));
  for (const l of locked) if (!byService.has(norm(l.service))) issues.push({ level: 'FAIL', rule: 'product-missing', field: l.service, message: `No product came back for "${l.service}".` });
  const seen = new Set();
  for (const p of list) {
    const field = p.service || p.title || '(unnamed)';
    if (seen.has(norm(p.service))) issues.push({ level: 'FAIL', rule: 'duplicate', field, message: `Two products for "${p.service}".` });
    seen.add(norm(p.service));
    if (!locked.some(l => norm(l.service) === norm(p.service))) issues.push({ level: 'FAIL', rule: 'product-unknown', field, message: `Product "${field}" is for "${p.service}", which is not a locked service with a page.` });
    const title = String(p.title || '');
    if (!title.trim()) issues.push({ level: 'FAIL', rule: 'missing', field, message: `Product "${field}" has no title.` });
    else if (count(title) > LIMITS.product_title[1]) issues.push({ level: 'FAIL', rule: 'length', field, message: `The title of "${field}" is ${count(title)} characters; the limit is ${LIMITS.product_title[1]}.` });
    issues.push(...contentIssues(title, `${field} (title)`, ctx, { prices: true, towns: true }));
    const l = lengthIssue(p.description, field, LIMITS.product_description, `The description of "${field}"`);
    if (l) issues.push(l);
    issues.push(...contentIssues(p.description, field, ctx, { prices: true }));
    issues.push(...proofCapsIssues(p.description, field, ctx));
    issues.push(...factIssues(p.description, field, ctx));
    // Areas: the main town and the five nearest (Brandon, 23 Oct), so six names at most
    const named = (ctx.towns || []).filter(town => town && new RegExp(`\\b${escapeRe(town)}\\b`, 'i').test(String(p.description || '')));
    if (named.length > 6) issues.push({ level: 'FAIL', rule: 'too-many-areas', field, message: `The description of "${field}" names ${named.length} areas (${named.join(', ')}); name the main town and the five nearest only.` });
  }
  return result(issues, { total: list.length });
}

function result(issues, counts = {}) {
  const fails = issues.filter(i => i.level === 'FAIL');
  const flags = issues.filter(i => i.level === 'FLAG');
  return { ok: !fails.length, fails, flags, issues, counts };
}

module.exports = {
  LIMITS, VALIDATOR_FILE, loadBannedPhrases, count,
  validateDescription, validateServices, validateProducts,
  contentIssues, factIssues, bannedHits, capsWords, nameKey, nearDuplicates, categoryIssues, proofShareIssues, proofCapsIssues, closingPatternIssues, openingIssues, areaIssues, phraseSpans, escapeRe,
};
