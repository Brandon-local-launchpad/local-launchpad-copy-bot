'use strict';

// ── FAQ question research (F1) ───────────────────────────────────────────────
// Runs once per client on Perplexity, like the geo research: prompts/FAQ_Research_CORE.md
// plus a CLIENT block built here from the client's trade, towns and services.
// The reply is parsed into questions, ranges, rules and gaps and stored against
// the client (client_assets 'faq_research'). The sorting step (faq-sort.js) reads it.

const fs   = require('fs');
const path = require('path');
const { sayFor } = require('./service-words');

const FAQ_RESEARCH_PROMPT = 'FAQ_Research_CORE.md';
const DOUBTS = ['Price', 'Trust', 'Fit', 'Process', 'Timing'];
const PAGE_TYPES = ['Homepage', 'Category', 'Service', 'Location'];
const MIN_QUESTIONS = 10;

function loadFaqResearchPrompt() {
  const text = fs.readFileSync(path.join(__dirname, 'prompts', FAQ_RESEARCH_PROMPT), 'utf8');
  // Windows checkouts can have CRLF line endings
  const lf = text.replace(/\r\n/g, '\n');
  const cut = lf.indexOf('\n---\n');
  return (cut >= 0 ? lf.slice(cut + 5) : lf).trim();
}

// The client's towns from biz_area_N, primary city first
function clientTowns(keyValueMap = {}) {
  const out = [];
  for (let i = 1; keyValueMap[`biz_area_${i}`] !== undefined; i++) {
    const t = String(keyValueMap[`biz_area_${i}`] || '').trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// [{ category, services: [{ gbp, say }] }] in GBP category order. Services the
// niche never names (service_words say = null) are left out. With no GBP category
// sheets in the custom values, the page map's category and service rows are used
// (services under the primary category).
function clientServicesByCategory(keyValueMap = {}, serviceParentMap = {}, niche = {}, { pages = [], primaryCategory = '' } = {}) {
  const cats = [];
  for (let i = 1; keyValueMap[`category_${i}`]; i++) cats.push({ category: keyValueMap[`category_${i}`], services: [] });
  const byName = new Map(cats.map(c => [c.category.toLowerCase(), c]));
  const ensure = name => {
    let c = byName.get(name.toLowerCase());
    if (!c) { c = { category: name, services: [] }; cats.push(c); byName.set(name.toLowerCase(), c); }
    return c;
  };
  const keys = Object.keys(keyValueMap).filter(k => /^service_\d+$/.test(k) && keyValueMap[k])
    .sort((a, b) => parseInt(a.slice(8), 10) - parseInt(b.slice(8), 10));
  for (const k of keys) {
    const gbp = keyValueMap[k];
    const say = sayFor(gbp, niche);
    if (!say) continue;
    ensure(serviceParentMap[k] || keyValueMap.category_1 || 'Other').services.push({ gbp, say });
  }
  if (!cats.length && pages.length) {
    if (primaryCategory) ensure(primaryCategory);
    for (const p of pages) if (p.pageType === 'category' && p.pageTitle) ensure(p.pageTitle);
    const home = primaryCategory || (cats[0] && cats[0].category) || 'Other';
    for (const p of pages) {
      if (p.pageType !== 'service' || !p.pageTitle) continue;
      const say = sayFor(p.pageTitle, niche);
      if (say) ensure(home).services.push({ gbp: p.pageTitle, say });
    }
  }
  return cats;
}

// The client's own customers' questions (client value customer_questions, one per line)
function customerQuestions(cv = {}) {
  const v = cv.customer_questions;
  const list = Array.isArray(v) ? v : String(v || '').split('\n');
  return [...new Set(list.map(q => String(q).trim()).filter(Boolean))];
}

// Onboarding answers worth researching from. Contact details, links, logins and
// uploads are left out: they say nothing about what customers ask, and they're
// personal data Perplexity doesn't need.
const ONBOARDING_SKIP = /full name|business name|email|phone|website|domain|analytics|search console|google business profile|limited company|postal address|business address|instagram|facebook|youtube|logo|photos|review platforms|links? to|enquiries you currently receive|testimonials|awards/i;
function onboardingAnswers(onboardingText = '', maxChars = 4000) {
  const out = [];
  let used = 0;
  for (const block of String(onboardingText).split(/\n\s*\n/)) {
    const m = block.match(/^Q:\s*([\s\S]*?)\nA:\s*([\s\S]*)$/);
    if (!m || ONBOARDING_SKIP.test(m[1])) continue;
    const q = m[1].replace(/\s+/g, ' ').trim().slice(0, 160);
    const a = m[2].replace(/\s+/g, ' ').trim().slice(0, 400);
    if (!a) continue;
    const line = `- ${q}: ${a}`;
    if (used + line.length > maxChars) break;
    out.push(line);
    used += line.length;
  }
  return out;
}

// Confirmed client values that change what customers worry about. No identity or
// contact values, no figures that would only ever be the client's to publish.
function confirmedFacts(cvIn = {}) {
  // Stand-in (test) values are not facts about the business
  const stand = new Set(Array.isArray(cvIn.stand_ins) ? cvIn.stand_ins : []);
  const cv = Object.fromEntries(Object.entries(cvIn).filter(([k]) => !stand.has(k)));
  const yes = v => v === 'yes';
  const L = [];
  const add = (label, v) => { if (v) L.push(`- ${label}: ${v}`); };
  add('Free quotes', cv.free_quotes);
  add('Free inspection or first visit', cv.free_inspection);
  add('How quotes are given', cv.quote_method);
  add('What the quote includes', cv.quote_includes);
  add('Deposit and payments', cv.deposit_terms);
  add('Guarantee', parseInt(cv.guarantee_years, 10) > 0 ? `${cv.guarantee_years} years${cv.guarantee_scope ? ` (${cv.guarantee_scope})` : ''}` : (cv.guarantee_years === '0' ? 'none' : ''));
  add('Manufacturer warranty', cv.manufacturer_warranty);
  add('Insured', cv.insurance_cover ? 'yes' : '');
  add('How soon work can start', cv.start_time);
  add('Same day visits', yes(cv.same_day_available) ? 'yes' : '');
  add('Out of hours or emergency work', cv.out_of_hours_available || (yes(cv.emergency_primary) ? 'yes' : ''));
  add('Handles planning or building control', cv.handles_planning);
  add('Finance', cv.finance_options);
  add('Travel distance', cv.travel_distance);
  add('Registered waste carrier', cv.waste_carrier_registered);
  add('Materials and methods', Array.isArray(cv.materials_methods) ? cv.materials_methods.join(', ') : '');
  add('Typical jobs', Array.isArray(cv.typical_jobs) ? cv.typical_jobs.map(j => j && j.job).filter(Boolean).join(', ') : '');
  add('Jobs they want more of', Array.isArray(cv.jobs_wanted) ? cv.jobs_wanted.join(', ') : '');
  const practices = Array.isArray(cv.confirmed_practices) ? cv.confirmed_practices : [];
  if (practices.length) {
    const byKey = Object.fromEntries(require('./practices').PRACTICES.map(p => [p.key, p.label]));
    add('Confirmed working practices', practices.map(k => byKey[k] || k).join('; '));
  }
  return L;
}

// What the area research found, per location: local problems, rules and
// conservation areas, and symptoms in homeowners' words. No URLs or IDs.
function localKnowledge(dossiers = [], { maxIssues = 8, maxRules = 10, maxSymptoms = 6 } = {}) {
  const { parseDossier } = require('./geo-dossier');
  const firstSentence = s => (String(s || '').replace(/\s*\[https?:[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().match(/^.*?[.!?](\s|$)/) || [''])[0].trim().slice(0, 200);
  const out = [];
  for (const d of dossiers) {
    const p = parseDossier(d.text);
    const names = Object.fromEntries(p.neighbourhoods.map(n => [n.id, n.name]));
    const L = [`${d.location}:`];
    const issues = p.issues.slice(0, maxIssues).map(i => `${i.title}${firstSentence(i.detail || i.body) ? `. ${firstSentence(i.detail || i.body)}` : ''}`);
    if (issues.length) L.push(`  Local problems: ${issues.join(' | ')}`);
    const rules = p.rules.slice(0, maxRules).map(r => `${r.name}${r.wholeArea ? ' (whole area)' : r.appliesTo.length ? ` (${r.appliesTo.map(id => names[id] || id).join(', ')})` : ''}`);
    if (rules.length) L.push(`  Rules and council: ${rules.join(' | ')}`);
    const conservation = [...new Set(p.rules.filter(r => /conservation area|article 4/i.test(r.name)).flatMap(r => r.appliesTo.map(id => names[id]).filter(Boolean)))];
    if (conservation.length) L.push(`  Conservation areas: ${conservation.join(', ')}`);
    const symptoms = p.symptoms.slice(0, maxSymptoms).map(s => `"${s.text}"`);
    if (symptoms.length) L.push(`  Problems homeowners describe: ${symptoms.join(', ')}`);
    if (L.length > 1) out.push(L.join('\n'));
  }
  return out;
}

// Everything known about the client, for the research. dossiers: [{ location, text }]
function buildClientBlock({ niche, keyValueMap, serviceParentMap, pages, cv = {}, onboardingText = '', dossiers = [] }) {
  const towns = clientTowns(keyValueMap);
  const L = ['=== CLIENT ==='];
  L.push(`Trade: ${niche.trade_person || niche.trade || ''} (${niche.trade || ''})`);
  L.push(`Primary city: ${towns[0] || ''}`);
  L.push(`Other towns: ${towns.slice(1).join(', ') || 'none'}`);
  L.push('Categories and their services, in the words homeowners use (copy names exactly for Service):');
  for (const c of clientServicesByCategory(keyValueMap, serviceParentMap, niche, { pages, primaryCategory: cv.primary_category })) {
    const says = [...new Set(c.services.map(s => s.say))];
    L.push(`- ${c.category}: ${says.join(', ') || '(no services listed)'}`);
  }
  const own = customerQuestions(cv);
  L.push('', "=== CUSTOMERS' OWN QUESTIONS (what the client's customers ask before booking) ===");
  L.push(...(own.length ? own.map(q => `- ${q}`) : ['none given']));
  const facts = confirmedFacts(cv);
  L.push('', '=== CONFIRMED FACTS ABOUT THE BUSINESS (context only) ===');
  L.push(...(facts.length ? facts : ['none confirmed yet']));
  const answers = onboardingAnswers(onboardingText);
  L.push('', "=== THE CLIENT'S ONBOARDING ANSWERS (context only) ===");
  L.push(...(answers.length ? answers : ['none']));
  const local = localKnowledge(dossiers);
  L.push('', '=== LOCAL KNOWLEDGE FROM THE AREA RESEARCH ===');
  L.push(...(local.length ? local : ['none yet']));
  return L.join('\n');
}

function buildFaqResearchPrompt(input) {
  return [loadFaqResearchPrompt(), buildClientBlock(input)].join('\n\n---\n\n');
}

// ── Parsing ──────────────────────────────────────────────────────────────────
// Perplexity's agent replies vary: a <think> section first, headings as "#",
// "###" or bold, questions as one line each or as a table, numbered lists, and
// citation markers ([1], [web:3]). The parser accepts all of these; when it still
// finds no questions, validateFaqResearch says what it saw.

const stripMd = s => String(s || '').replace(/\*\*|__/g, '').trim();
// Citation markers that aren't links: [1], [12], [web:3]. Links like [https://…] stay.
const stripMarkers = s => String(s || '').replace(/\s*\[(?:web:)?\d+\](?!\()/g, '');

const SECTION_NAMES = { 1: 'QUESTIONS', 2: 'RANGES', 3: 'RULES', 4: 'GAPS' };

// Thinking sections out; an unclosed <think> at the start is dropped up to the first section
function cleanReply(text) {
  let t = String(text || '').replace(/\r\n/g, '\n').replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (/^\s*<think>/i.test(t)) {
    const h = headingRe(1).exec(t);
    t = h ? t.slice(h.index) : t.replace(/^\s*<think>/i, '');
  }
  return t.trim();
}

// A heading line for section n, however it's marked: "## 1. QUESTIONS",
// "# 1) Questions", "**1. QUESTIONS**", "Section 1: Questions"
function headingRe(n) {
  return new RegExp(`^[ \\t]*(?:#{1,6}[ \\t]*)?(?:\\*\\*|__)?[ \\t]*(?:section[ \\t]*)?${n}[ \\t]*[.):][ \\t]*(?:\\*\\*|__)?[ \\t]*${SECTION_NAMES[n]}[^\\n]*$`, 'im');
}
const ANY_SECTION = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?[ \t]*(?:section[ \t]*)?[1-4][ \t]*[.):][ \t]*(?:\*\*|__)?[ \t]*(?:QUESTIONS|RANGES|RULES|GAPS)\b[^\n]*$/im;

function sectionText(text, n) {
  const m = headingRe(n).exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = ANY_SECTION.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

// "Reddit x6, Mumsnet x3, Citizens Advice; opinions vary" → 10
// "Reddit x4; Which?" (the live agent reply separates sources with ";") → 5.
// Notes rather than sources ("opinions vary", "no forum version found") don't count.
function seenCount(seen) {
  const main = String(seen || '').replace(/\(dated:[^)]*\)/gi, '');
  let n = 0;
  for (const part of main.split(/[,;]/)) {
    const p = part.trim();
    if (!p || /\b(opinions|answers|disagree|vary|varies|found|not found)\b|^no\b/i.test(p)) continue;
    const m = p.match(/\bx\s?(\d+)\b/i);
    n += m ? parseInt(m[1], 10) : 1;
  }
  return n;
}

function firstUrl(s) {
  const m = String(s || '').match(/https?:\/\/[^\s)\]|>]+/);
  return m ? m[0].replace(/[.,;]+$/, '') : '';
}

function blankQuestion(id, text) {
  return {
    id, text: stripMd(stripMarkers(text)).replace(/^["“']+|["”']+$/g, '').trim(),
    doubt: '', page: '', service: '', local: false, town: '', needsFact: false,
    seen: '', seenCount: 0, url: '', dated: '',
  };
}

// One labelled value onto a question: key is the label in lower case
function applyField(q, key, rawVal) {
  const val = stripMd(stripMarkers(rawVal));
  if (key === 'doubt') q.doubt = DOUBTS.find(d => d.toLowerCase() === val.toLowerCase()) || val;
  else if (key === 'page') q.page = PAGE_TYPES.find(d => d.toLowerCase() === val.toLowerCase()) || val;
  else if (key === 'service') q.service = /^(general|-|none)?$/i.test(val) ? '' : val;
  else if (key === 'local') q.local = /^y/i.test(val);
  else if (key === 'town') q.town = /^(-|none|n\/a)?$/i.test(val) ? '' : val;
  else if (/needs( client)? fact|client fact/.test(key)) q.needsFact = /^y/i.test(val);
  else if (key === 'seen') {
    // The live reply puts the date in the Seen column: "MyBuilder x1 (dated: November 2020)"
    const d = val.match(/\(dated:\s*([^)]+)\)/i);
    if (d) q.dated = d[1].trim();
    q.seen = val.replace(/\s*\(dated:[^)]*\)/gi, '').trim();
    q.seenCount = seenCount(q.seen);
  }
  else return false;
  return true;
}
function applyRest(q, part) {
  if (!q.url) q.url = firstUrl(part);
  const d = part.match(/\(dated:\s*([^)]+)\)/i);
  if (d) q.dated = d[1].trim();
}

const ID_AT_START = /^\[?\s*(?:\*\*|__)?\s*Q\s*-?\s*(\d+)\s*(?:\*\*|__)?\s*\]?/i;

// One question per line: "- [Q-1] | "question" | Doubt: Price | Page: …"
function parseQuestionLine(line) {
  const body = line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '').replace(/^(?:\*\*|__)(?=\s*\[?\s*Q)/i, '');
  const idm = body.match(ID_AT_START);
  if (!idm) return null;
  const parts = body.slice(idm[0].length).replace(/^\s*(?:\*\*|__)?\s*[|:.\-–—]?\s*/, '').split(/\s*\|\s*/);
  if (!parts[0] || parts.length < 2) return null;
  const q = blankQuestion(`Q-${parseInt(idm[1], 10)}`, parts[0]);
  for (const p of parts.slice(1)) {
    const kv = p.match(/^\s*(?:\*\*)?\s*([A-Za-z][A-Za-z ]*?)\s*(?:\*\*)?\s*:\s*(.*)$/);
    const key = kv && !/^https?$/i.test(kv[1]) ? kv[1].toLowerCase().trim() : null;
    if (!(key && applyField(q, key, kv[2]))) applyRest(q, p);
  }
  return q;
}

// Markdown table rows → questions, using the header row's column names
const COLUMN_KEYS = [
  [/^(id|#|q|no\.?|ref)$/, 'id'], [/question/, 'question'], [/doubt/, 'doubt'], [/^page/, 'page'],
  [/service/, 'service'], [/^local/, 'local'], [/town/, 'town'], [/fact/, 'needs client fact'],
  [/seen/, 'seen'], [/source|url|link/, 'source'],
];
const cellsOf = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
function parseQuestionTable(lines, warnings) {
  const out = [];
  let cols = null;
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) { cols = cols && line.trim() === '' ? cols : (line.trim() ? null : cols); continue; }
    const cells = cellsOf(line);
    if (cells.every(c => /^:?-{2,}:?$/.test(c) || c === '')) continue; // separator row
    const names = cells.map(c => stripMd(c).toLowerCase());
    if (names.some(n => /question/.test(n)) && !cells.some(c => ID_AT_START.test(stripMd(c)) && /\d/.test(c))) {
      cols = names.map(n => (COLUMN_KEYS.find(([re]) => re.test(n)) || [null, null])[1]);
      continue;
    }
    if (!cols) continue;
    const idCell = cells[cols.indexOf('id')] || cells[0];
    const idm = stripMd(idCell).match(ID_AT_START);
    const qText = cells[cols.indexOf('question')];
    if (!idm || !qText) { warnings.push(`Couldn't read table row: ${line.trim().slice(0, 80)}`); continue; }
    const q = blankQuestion(`Q-${parseInt(idm[1], 10)}`, qText);
    cols.forEach((key, i) => {
      if (!key || key === 'id' || key === 'question' || cells[i] === undefined) return;
      if (key === 'source') applyRest(q, cells[i]);
      else applyField(q, key, cells[i]);
    });
    if (!q.url) for (const c of cells) applyRest(q, c);
    out.push(q);
  }
  return out;
}

// Section lines as items: bullets, numbered lines or table rows (header and separator skipped)
function items(sec) {
  const out = [];
  for (const raw of (sec || '').split('\n')) {
    const l = raw.trim();
    if (/^\|/.test(l)) {
      const cells = cellsOf(l);
      if (cells.every(c => /^:?-{2,}:?$/.test(c) || c === '')) continue;
      if (/^(job|question|rule|gap|item)s?$/i.test(stripMd(cells[0]))) continue; // header row
      out.push(cells.join(' | '));
    } else if (/^(?:[-*•]|\d+[.)])\s+/.test(l)) {
      out.push(l.replace(/^(?:[-*•]|\d+[.)])\s+/, ''));
    }
  }
  return out.map(stripMarkers);
}

function parseFaqResearch(text) {
  const t = cleanReply(text);
  const warnings = [];
  let qSec = sectionText(t, 1);
  if (qSec === null) {
    warnings.push('No "1. QUESTIONS" heading: the whole reply was searched for questions.');
    qSec = t;
  }

  const lines = qSec.split('\n');
  const found = [];
  for (const line of lines) {
    if (/^\s*\|/.test(line)) continue;
    if (!/^\s*(?:[-*•]|\d+[.)])?\s*(?:\*\*|__)?\s*\[?\s*(?:\*\*|__)?\s*Q\s*-?\s*\d+/i.test(line)) continue;
    // A line of IDs only (the most asked list, "1. Q-5") is not a question
    if (/^[\s\-*•\d.)\[\]Q,|*_]*$/i.test(line.replace(/Q\s*-?\s*\d+/gi, ''))) continue;
    const q = parseQuestionLine(line);
    if (q) found.push(q); else warnings.push(`Couldn't read: ${line.trim().slice(0, 80)}`);
  }
  if (lines.some(l => /^\s*\|/.test(l))) found.push(...parseQuestionTable(lines, warnings));

  const questions = [];
  const seenIds = new Set();
  for (const q of found) {
    if (seenIds.has(q.id)) { warnings.push(`${q.id} appears twice; the second is ignored.`); continue; }
    if (!q.text) { warnings.push(`${q.id}: no question text.`); continue; }
    seenIds.add(q.id);
    if (!DOUBTS.includes(q.doubt)) warnings.push(`${q.id}: unknown doubt "${q.doubt}".`);
    if (!PAGE_TYPES.includes(q.page)) warnings.push(`${q.id}: unknown page "${q.page}".`);
    if (!q.url) warnings.push(`${q.id}: no source URL.`);
    questions.push(q);
  }

  // "### 15 most asked" (v4) or "### 10 most asked" (the manual runs), in any heading style
  const top = [];
  const tm = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?[ \t]*(?:the[ \t]+)?\d*[ \t]*most[ \t]+asked[^\n]*\n([\s\S]*?)(?=\n[ \t]*\n[ \t]*(?:#|\*\*)|\n[ \t]*#|$(?![\s\S]))/im.exec(t);
  if (tm) for (const m of tm[1].matchAll(/Q\s*-?\s*(\d+)/gi)) { const id = `Q-${parseInt(m[1], 10)}`; if (seenIds.has(id) && !top.includes(id)) top.push(id); }
  questions.forEach(q => { q.rank = top.includes(q.id) ? top.indexOf(q.id) + 1 : null; });

  const ranges = items(sectionText(t, 2)).map(l => {
    const p = l.split(/\s*\|\s*/);
    // A line's "(dated: …)", or the table's own Dated column (the live reply)
    const datedCol = p[3] && !/https?:\/\//.test(p[3]) ? stripMd(p[3]) : '';
    return { job: stripMd(p[0]), range: stripMd(p[1] || ''), area: stripMd(p[2] || ''), dated: ((l.match(/\(dated:\s*([^)]+)\)/i) || [])[1] || datedCol), url: firstUrl(l) };
  });
  const rules = items(sectionText(t, 3)).map(l => {
    const p = l.split(/\s*\|\s*/);
    return { question: stripMd(p[0]).replace(/^["“]+|["”]+$/g, ''), rule: stripMd(p[1] || ''), url: firstUrl(l) };
  });
  const gaps = items(sectionText(t, 4)).map(stripMd);

  // What the reply looked like, for the message when nothing could be read
  const shape = {
    chars: t.length,
    think: /<think>/i.test(String(text || '')),
    questionsHeading: headingRe(1).test(t),
    idLines: (t.match(/\bQ\s*-?\s*\d+\b/gi) || []).length,
    tableRows: (t.match(/^\s*\|/gm) || []).length,
    firstLine: t.split('\n').find(l => l.trim()) || '',
  };
  return { questions, top, ranges, rules, gaps, warnings, shape };
}

// A run is kept when it has at least MIN_QUESTIONS readable questions. The error says
// what the reply looked like, so a new format can be recognised from the card.
function validateFaqResearch(parsed) {
  const s = parsed.shape || {};
  const seen = [
    s.questionsHeading ? 'a "1. QUESTIONS" heading' : 'no "1. QUESTIONS" heading',
    `${s.idLines || 0} mentions of a question ID (Q-1…)`,
    `${s.tableRows || 0} table rows`,
    s.think ? 'a <think> section' : null,
    s.firstLine ? `first line "${s.firstLine.trim().slice(0, 60)}"` : 'an empty reply',
  ].filter(Boolean).join(', ');
  if (!parsed.questions.length) return { valid: false, error: `No questions could be read from the reply (it had ${seen}).` };
  if (parsed.questions.length < MIN_QUESTIONS) return { valid: false, error: `Only ${parsed.questions.length} questions could be read (at least ${MIN_QUESTIONS} needed; the reply had ${seen}).` };
  return { valid: true, error: null };
}

module.exports = {
  FAQ_RESEARCH_PROMPT, DOUBTS, PAGE_TYPES,
  loadFaqResearchPrompt, clientTowns, clientServicesByCategory, buildClientBlock, buildFaqResearchPrompt,
  customerQuestions, onboardingAnswers, confirmedFacts, localKnowledge,
  parseFaqResearch, parseQuestionLine, parseQuestionTable, validateFaqResearch, seenCount, cleanReply,
};
