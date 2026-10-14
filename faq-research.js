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

function buildClientBlock({ niche, keyValueMap, serviceParentMap, pages, cv = {} }) {
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
  parseFaqResearch, parseQuestionLine, validateFaqResearch, seenCount,
};
