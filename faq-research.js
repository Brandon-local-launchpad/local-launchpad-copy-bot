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
  const cut = text.indexOf('\n---\n');
  return (cut >= 0 ? text.slice(cut + 5) : text).trim();
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
const ONBOARDING_SKIP = /full name|business name|email|phone|website|domain|analytics|search console|limited company|postal address|business address|instagram|facebook|youtube|logo|photos|review platforms|links? to|enquiries you currently receive|testimonials|awards/i;
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

const stripMd = s => String(s || '').replace(/\*\*/g, '').trim();

// "Reddit x6, Mumsnet x3, Citizens Advice; opinions vary" → 10
function seenCount(seen) {
  const main = String(seen || '').split(';')[0];
  let n = 0;
  for (const part of main.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/\bx\s?(\d+)\b/i);
    n += m ? parseInt(m[1], 10) : 1;
  }
  return n;
}

function firstUrl(s) {
  const m = String(s || '').match(/https?:\/\/[^\s)\]|]+/);
  return m ? m[0] : '';
}

function sectionText(text, n) {
  const re = new RegExp(`^##\\s*${n}\\.[^\\n]*$`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = /^##\s*\d+\./m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function parseQuestionLine(line) {
  const body = line.replace(/^\s*[-*]\s*/, '');
  const parts = body.split(/\s+\|\s+/);
  const idm = parts[0].match(/\[?\s*(Q-\d+)\s*\]?/i);
  if (!idm || parts.length < 3) return null;
  const q = {
    id: idm[1].toUpperCase(),
    text: stripMd(parts[1]).replace(/^["“]|["”]$/g, '').trim(),
    doubt: '', page: '', service: '', local: false, town: '', needsFact: false,
    seen: '', seenCount: 0, url: '', dated: '',
  };
  for (const p of parts.slice(2)) {
    const kv = p.match(/^\s*([A-Za-z ]+?)\s*:\s*(.*)$/);
    const key = kv && !/^https?$/i.test(kv[1]) ? kv[1].toLowerCase() : null;
    const val = kv ? stripMd(kv[2]) : '';
    if (key === 'doubt') q.doubt = DOUBTS.find(d => d.toLowerCase() === val.toLowerCase()) || val;
    else if (key === 'page') q.page = PAGE_TYPES.find(d => d.toLowerCase() === val.toLowerCase()) || val;
    else if (key === 'service') q.service = /^general$/i.test(val) ? '' : val;
    else if (key === 'local') q.local = /^y/i.test(val);
    else if (key === 'town') q.town = val === '-' ? '' : val;
    else if (key === 'needs client fact') q.needsFact = /^y/i.test(val);
    else if (key === 'seen') { q.seen = val; q.seenCount = seenCount(val); }
    else {
      if (!q.url) q.url = firstUrl(p);
      const d = p.match(/\(dated:\s*([^)]+)\)/i);
      if (d) q.dated = d[1].trim();
    }
  }
  return q;
}

function bullets(sec) {
  return (sec || '').split('\n').map(l => l.trim()).filter(l => /^[-*]\s+/.test(l)).map(l => l.replace(/^[-*]\s+/, ''));
}

function parseFaqResearch(text) {
  const t = String(text || '').replace(/\r\n/g, '\n');
  const warnings = [];
  const qSec = sectionText(t, 1);
  if (qSec === null) warnings.push('No "## 1. QUESTIONS" section.');

  const questions = [];
  const seenIds = new Set();
  for (const line of (qSec || '').split('\n')) {
    if (!/^\s*[-*]\s*\[?\s*Q-\d+/i.test(line)) continue;
    const q = parseQuestionLine(line);
    if (!q) { warnings.push(`Couldn't read: ${line.trim().slice(0, 80)}`); continue; }
    if (seenIds.has(q.id)) { warnings.push(`${q.id} appears twice; the second is ignored.`); continue; }
    seenIds.add(q.id);
    if (!DOUBTS.includes(q.doubt)) warnings.push(`${q.id}: unknown doubt "${q.doubt}".`);
    if (!PAGE_TYPES.includes(q.page)) warnings.push(`${q.id}: unknown page "${q.page}".`);
    if (!q.url) warnings.push(`${q.id}: no source URL.`);
    questions.push(q);
  }

  // "### 15 most asked" (v4) or "### 10 most asked" (the manual runs)
  const top = [];
  const tm = /^#{2,4}\s*\d*\s*most asked[^\n]*\n([\s\S]*?)(?=^#{2,4}\s|$(?![\s\S]))/im.exec(qSec || '');
  if (tm) for (const m of tm[1].matchAll(/Q-\d+/gi)) { const id = m[0].toUpperCase(); if (seenIds.has(id) && !top.includes(id)) top.push(id); }
  questions.forEach(q => { q.rank = top.includes(q.id) ? top.indexOf(q.id) + 1 : null; });

  const ranges = bullets(sectionText(t, 2)).map(l => {
    const p = l.split(/\s+\|\s+/);
    return { job: stripMd(p[0]), range: stripMd(p[1] || ''), area: stripMd(p[2] || ''), dated: ((l.match(/\(dated:\s*([^)]+)\)/i) || [])[1] || ''), url: firstUrl(l) };
  });
  const rules = bullets(sectionText(t, 3)).map(l => {
    const p = l.split(/\s+\|\s+/);
    return { question: stripMd(p[0]), rule: stripMd(p[1] || ''), url: firstUrl(l) };
  });
  const gaps = bullets(sectionText(t, 4)).map(stripMd);

  return { questions, top, ranges, rules, gaps, warnings };
}

// A run is kept when it has a questions section with at least MIN_QUESTIONS readable questions.
function validateFaqResearch(parsed) {
  if (!parsed.questions.length) return { valid: false, error: 'No questions could be read from the reply.' };
  if (parsed.questions.length < MIN_QUESTIONS) return { valid: false, error: `Only ${parsed.questions.length} questions could be read (at least ${MIN_QUESTIONS} needed).` };
  return { valid: true, error: null };
}

module.exports = {
  FAQ_RESEARCH_PROMPT, DOUBTS, PAGE_TYPES,
  loadFaqResearchPrompt, clientTowns, clientServicesByCategory, buildClientBlock, buildFaqResearchPrompt,
  customerQuestions, onboardingAnswers, confirmedFacts, localKnowledge,
  parseFaqResearch, parseQuestionLine, validateFaqResearch, seenCount,
};
