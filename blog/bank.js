'use strict';

// ── The blog question bank: one Perplexity run per trade (Brandon, 28 Oct 2026) ──
// The prompt is prompts/Blog_Question_Bank_Perplexity_Prompt.md. The reply is parsed
// here into topics (BT), each with its related questions, the v2 cost topics (CT, one per
// service) and seasonal topics (ST, one per seasonal topic, with its month window and the
// window's source), the ranked list of the 16 with the most search interest, the rules behind
// the rule topics and the gaps. A v1 bank (topics, rules, gaps) still reads; version says which. Two shapes
// are read: the prompt's line format ("### [BT-N] | … | Type: cost | …" and "- [BT-N.a]
// | … | Doubt: Price | …") and the table format the first real run came back in (one
// table of topics, one of related questions, one of ranked ids, one of rules, one of gaps,
// the cells in the prompt's order with no labels). Tolerant of the usual drift (bold,
// missing brackets, a url without brackets, "Type" in any case, a url written twice).
// Nothing throws on a bad line: it is skipped with a warning. The bank is kept per trade
// (blog/bank-store.js) and approved once, like a trade facts pack; the topic queue
// (blog/topics.js) reads an approved bank only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'Blog_Question_Bank_Perplexity_Prompt.md');
const DIR = path.join(__dirname, '..', 'blog-bank');
const TYPES = ['cost', 'decision', 'question'];
const DOUBTS = ['Price', 'Trust', 'Fit', 'Process', 'Timing'];
const MIN_TOPICS = 5;

const stripMd = s => String(s || '').replace(/\*\*|__/g, '').replace(/^\s*[-*•]\s+/, '').trim();
const unquote = s => String(s || '').trim().replace(/^["“'‘]+|["”'’]+$/g, '').trim();
const fingerprintOf = text => crypto.createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);

// The prompt as sent to Perplexity (v2, 28 Oct): the fenced block with RUN FOR, SERVICES and
// SEASONAL TOPICS filled in. The services are the trade's UK page names from the services library
// (every page or alias verdict's target, once each, A to Z: an alias names the UK page too); the seasonal topics are the niche entry's
// (blog.seasonal_topics of a seasonal trade; a trade that is not seasonal sends "none"). The
// runner and the store read them here; a caller may pass its own.
const INPUTS = new Map();
function promptInputs(trade) {
  if (INPUTS.has(trade)) return INPUTS.get(trade);
  let services = [];
  try {
    const { loadLibrary } = require('../niche-library/library');
    const lib = loadLibrary(trade);
    services = [...new Set(((lib && lib.rows) || []).filter(r => (r.verdict === 'page' || r.verdict === 'alias') && r.target).map(r => String(r.target).trim()))].sort((x, y) => x.localeCompare(y));
  } catch (e) { services = []; }
  let seasonalTopics = [];
  try {
    const nicheFile = path.join(__dirname, '..', 'niche-library', `${trade}.json`);
    if (fs.existsSync(nicheFile)) {
      const niche = JSON.parse(fs.readFileSync(nicheFile, 'utf8'));
      const items = niche.seasonal_trade && niche.blog && Array.isArray(niche.blog.seasonal_topics) ? niche.blog.seasonal_topics : [];
      seasonalTopics = items.map(i => require('./blocks').parseSeasonalTopic(i)).filter(t => t.topic);
    }
  } catch (e) { seasonalTopics = []; }
  INPUTS.set(trade, { services, seasonalTopics });
  return INPUTS.get(trade);
}
function buildPrompt(trade, inputs = null) {
  const md = fs.readFileSync(PROMPT_FILE, 'utf8').replace(/\r\n/g, '\n');
  const m = md.match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error('The bank prompt has no fenced block to send.');
  const { services = [], seasonalTopics = [] } = inputs || promptInputs(trade);
  const topics = seasonalTopics.map(t => (t && typeof t === 'object' ? t.topic : String(t || ''))).filter(Boolean);
  const asLines = xs => xs.map(x => '- ' + x).join('\n');
  return m[1]
    .replace(/^RUN FOR:.*$/m, () => 'RUN FOR: ' + trade)
    .replace(/^SERVICES:.*$/m, () => (services.length ? 'SERVICES:\n' + asLines(services) : 'SERVICES: none listed; use the services a UK ' + trade + ' usually offers, by their UK names'))
    .replace(/^SEASONAL TOPICS:.*$/m, () => (topics.length ? 'SEASONAL TOPICS:\n' + asLines(topics) : 'SEASONAL TOPICS: none'));
}

// "generated 2026-10-28 · model pasted · verified: no" (the pack files' header line)
function header({ generated, model }) { return `generated ${generated} · model ${model} · verified: no`; }
function parseHeader(text) {
  const first = String(text || '').replace(/^﻿/, '').split(/\r?\n/)[0] || '';
  const m = first.match(/^generated\s+(\S+)\s+·\s+model\s+(.+?)\s+·\s+verified:\s*(yes|no)\s*$/i);
  return m ? { generated: m[1], model: m[2].trim() } : null;
}
// A hand written sample (the fixtures' and the demo's) says so in its header line's model, so
// the store never saves or approves it for a real trade (Brandon, 28 Oct)
function isTestSample(text) { const h = parseHeader(text); return !!(h && /\btest sample\b/i.test(h.model)); }

// The sections, v1 ("1. TOPICS, 2. RULES, 3. GAPS") and v2 ("1. TOPICS, 2. COST TOPICS,
// 3. SEASONAL TOPICS, 4. RANKED, 5. RULES, 6. GAPS"): read by name, so the number is not trusted
const SECTION_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?[ \t]*(?:section[ \t]*)?([1-6])[ \t]*[.):][ \t]*(?:\*\*|__)?[ \t]*(COST[ \t]+TOPICS|SEASONAL[ \t]+TOPICS|TOPICS|RANKED|RULES(?:[ \t]+BEHIND[ \t]+THE[ \t]+TOPICS)?|GAPS)\b[^\n]*$/i;
const SECTION_OF = { TOPICS: 'topics', 'COST TOPICS': 'cost', 'SEASONAL TOPICS': 'seasonal', RANKED: 'ranked', RULES: 'rules', GAPS: 'gaps' };
function splitSections(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = { topics: [], cost: [], seasonal: [], ranked: [], rules: [], gaps: [] };
  let cur = null;
  for (const line of lines) {
    const m = line.match(SECTION_RE);
    if (m) { const name = m[2].toUpperCase().replace(/\s+/g, ' '); cur = name.startsWith('RULES') ? 'rules' : SECTION_OF[name]; continue; }
    if (cur) out[cur].push(line);
  }
  return out;
}

// Ids: BT-N (a topic), CT-N (a cost topic, v2), ST-N (a seasonal topic, v2), with .a for a related question
const PREFIXES = ['BT', 'CT', 'ST'];
const ID_RE = /\[?\s*((?:BT|CT|ST)\s*-?\s*\d+)\s*(?:\.\s*([a-z]))?\s*\]?/i;
const IDS_RE = /\b(BT|CT|ST)\s*-?\s*(\d+)(?!\s*\.\s*[a-z])/gi;
const RANK_WORDS = new Set('the topics topic with most search interest in rank ranked order by id ids only top sixteen volume priority provisional from sections to and'.split(' '));
const idOf = s => { const m = String(s || '').match(ID_RE); if (!m) return null; const n = m[1].toUpperCase().replace(/\s+/g, '').replace(/^(BT|CT|ST)-?/, '$1-'); return { topic: n, sub: m[2] ? m[2].toLowerCase() : null, prefix: n.slice(0, 2) }; };
const urlOf = s => { const m = String(s || '').match(/https?:\/\/[^\s\]|)]+/); return m ? m[0] : ''; };
// The cells of a line: a table row's (the outer pipes dropped) or a pipe separated line's
function cellsOf(line) {
  const s = stripMd(line);
  const table = /^\|.*\|\s*$/.test(s);
  const parts = (table ? s.replace(/^\|/, '').replace(/\|\s*$/, '') : s).split('|').map(c => c.trim());
  return { cells: parts, table, separator: table && parts.every(c => /^:?-{2,}:?$/.test(c) || !c), head: table && !idOf(parts[0]) && /^(id|topic|question|target)/i.test(parts[0] || '') };
}
const labelled = (parts, label) => { const re = new RegExp('^' + label + '\\s*:\\s*(.*)$', 'i'); for (const p of parts) { const m = p.match(re); if (m) return m[1].trim(); } return ''; };
const typeIn = s => { const v = String(s || '').toLowerCase().replace(/\s.*$/, ''); return TYPES.includes(v) ? v : ''; };
const doubtIn = s => DOUBTS.find(d => d.toLowerCase() === String(s || '').trim().toLowerCase()) || '';
const unlabelled = p => String(p || '').replace(/^(type|service|seen|window|source)\s*:\s*/i, '').trim();
const noWindow = w => !w || /^(no window( stated)?|none|n\/?a|not stated|unknown)\.?$/i.test(w);

// A topic's header line by its block: BT "id | question | Type | Service | Seen | url",
// CT "id | question | Service | Seen | url", ST "id | question | Service | Window | url (the window's)".
// Labelled cells are read by their label; unlabelled ones in the prompt's order for the block.
function topicOf(id, parts, line) {
  const cells = parts.map(unlabelled);
  const isUrl = c => /^\[?https?:/i.test(c || '');
  const t = { id: id.topic, block: id.prefix, question: unquote(parts[1] || ''), url: urlOf(line), related: [] };
  if (id.prefix === 'BT') {
    const typeRaw = labelled(parts, 'Type') || (typeIn(cells[2]) ? cells[2] : '');
    t.type = typeIn(typeRaw); t.typeRaw = typeRaw;
    t.service = labelled(parts, 'Service') || (cells.length >= 4 && !/^seen/i.test(parts[3]) && !isUrl(cells[3]) ? cells[3] : '') || 'General';
    t.seen = labelled(parts, 'Seen') || (cells.length >= 5 && !isUrl(cells[4]) ? cells[4] : '');
  } else if (id.prefix === 'CT') {
    t.type = 'cost';
    t.service = labelled(parts, 'Service') || (cells.length >= 3 && !/^seen/i.test(parts[2]) && !isUrl(cells[2]) ? cells[2] : '') || 'General';
    t.seen = labelled(parts, 'Seen') || (cells.length >= 4 && !isUrl(cells[3]) ? cells[3] : '');
  } else {
    t.type = 'seasonal';
    t.service = labelled(parts, 'Service') || (cells.length >= 3 && !/^window/i.test(parts[2]) && !isUrl(cells[2]) ? cells[2] : '') || 'General';
    const w = labelled(parts, 'Window') || (cells.length >= 4 && !isUrl(cells[3]) ? cells[3] : '');
    t.window = noWindow(unquote(w)) ? '' : unquote(w);
    t.window_url = t.url;
  }
  return t;
}

function parseBank(text) {
  const warnings = [];
  const sections = splitSections(text);
  const all = [];
  const ranked = [];
  const nonLine = [];
  const addRanked = ids => { for (const i of ids) if (!ranked.includes(i)) ranked.push(i); };
  const idsIn = line => [...line.matchAll(IDS_RE)].map(m => m[1].toUpperCase() + '-' + m[2]);
  const sectionName = { topics: 'TOPICS', cost: 'COST TOPICS', seasonal: 'SEASONAL TOPICS' };
  let cur = null;
  for (const section of ['topics', 'cost', 'seasonal']) {
    for (const raw of sections[section]) {
      const line = raw.trim();
      if (!line) continue;
      const { cells: parts, table, separator, head } = cellsOf(line);
      if (separator || head) continue;
      if (/^#{1,6}\s/.test(line) && !idOf(parts[0])) continue; // a sub heading ("### Related questions")
      const id = idOf(parts[0]);
      const isHeader = id && !id.sub && (table ? parts.length >= 3 : (/^#{1,6}\s/.test(line) || (parts.length >= 3 && !/^[-*•]/.test(line))));
      if (isHeader) {
        if (all.some(t => t.id === id.topic)) { warnings.push(id.topic + ': appears twice; the second is skipped.'); cur = null; continue; }
        const t = topicOf(id, parts, line);
        const expected = { topics: 'BT', cost: 'CT', seasonal: 'ST' }[section];
        if (t.block !== expected) warnings.push(t.id + ': listed in the ' + sectionName[section] + ' section; read as a ' + t.block + ' block.');
        if (!t.question) warnings.push(t.id + ': no target question.');
        if (t.block === 'BT' && !t.type) warnings.push(t.id + ': type "' + (t.typeRaw || '(none)') + '" is not cost, decision or question.');
        if (t.block === 'ST' && !t.window) warnings.push(t.id + ': no window stated.');
        if (!t.url) warnings.push(t.id + ': no source url.');
        delete t.typeRaw;
        all.push(t); cur = t; continue;
      }
      if (id && id.sub) {
        const owner = all.find(t => t.id === id.topic) || cur;
        if (!owner) { warnings.push(id.topic + '.' + id.sub + ': a related question before any topic; skipped.'); continue; }
        if (owner.id !== id.topic) warnings.push(id.topic + '.' + id.sub + ': listed under ' + owner.id + '; kept with ' + owner.id + '.');
        const doubtRaw = labelled(parts, 'Doubt') || (doubtIn(parts[2]) ? parts[2] : '');
        const doubt = doubtIn(doubtRaw);
        const needsRaw = labelled(parts, 'Needs client fact') || labelled(parts, 'Needs fact') || labelled(parts, 'Client fact') || (parts.length >= 4 && /^(y|yes|n|no)$/i.test(parts[3]) ? parts[3] : '');
        // Source: a url (Perplexity's), or PAA (Google People also ask through DataForSEO, blog/paa.js: no url)
        const paa = !urlOf(line) && (/^(?:sources*:s*)?paa$/i.test(parts[parts.length - 1] || '') || labelled(parts, 'Source').toUpperCase() === 'PAA');
        const q = { id: owner.id + '.' + id.sub, question: unquote(parts[1] || ''), doubt, needsFact: /^y/i.test(needsRaw), url: urlOf(line), source: paa ? 'PAA' : (urlOf(line) ? 'url' : '') };
        if (!q.question) { warnings.push(q.id + ': no question; skipped.'); continue; }
        if (!doubt) warnings.push(q.id + ': doubt "' + (doubtRaw || parts[2] || '(none)') + '" is not one of ' + DOUBTS.join(', ') + '.');
        if (!q.url && q.source !== 'PAA') warnings.push(q.id + ': no source url.');
        owner.related.push(q); continue;
      }
      // A line (or table row) of topic ids and nothing else worth reading is the ranked list
      // (v1 put it at the end of TOPICS): a line of ids, a numbered list, or a one column table
      const ids = idsIn(line);
      const words = (line.replace(IDS_RE, ' ').toLowerCase().match(/[a-z]+/g) || []).filter(w => !RANK_WORDS.has(w));
      if (ids.length && !words.length && (ids.length >= 3 || /^\s*\d+[.)]/.test(line) || table)) { addRanked(ids); continue; }
      nonLine.push(line);
    }
  }
  // v2: section 4 RANKED, by id only; a line with the question beside the id still gives its id
  for (const raw of sections.ranked) {
    const line = raw.trim(); if (!line) continue;
    const { separator, head } = cellsOf(line);
    if (separator || head) continue;
    const ids = idsIn(line);
    if (ids.length) addRanked(ids); else if (!/^#{1,6}\s/.test(line) && !cellsOf(line).table) nonLine.push(line);
  }
  for (const t of all) {
    if (t.related.length < 6) warnings.push(t.id + ': ' + t.related.length + ' related question' + (t.related.length === 1 ? '' : 's') + ' (6 to 10 asked for).');
    if (t.related.length > 10) warnings.push(t.id + ': ' + t.related.length + ' related questions (10 at most asked for); all kept.');
  }
  for (const id of ranked) if (!all.some(t => t.id === id)) warnings.push('ranked list names ' + id + ', which is not a topic.');
  const rules = [];
  for (const raw of sections.rules) {
    const line = raw.trim(); if (!line) continue;
    const { cells: parts, separator, head } = cellsOf(line);
    if (separator || head) continue;
    const id = idOf(parts[0]);
    if (!id) { if (/^[-*•]/.test(raw) || /\|/.test(line)) warnings.push('rules: a line with no topic id skipped: "' + line.slice(0, 60) + '".'); continue; }
    const text = unquote((parts[1] || '').replace(/\[?https?:\/\/[^\]\s]+\]?/g, '').trim());
    rules.push({ topic: id.topic, text, url: urlOf(line), official: /gov\.uk|planningportal|\.gov\b|council|\.org\.uk/i.test(urlOf(line)) });
    if (!all.some(t => t.id === id.topic)) warnings.push('rules: ' + id.topic + ' is not a topic.');
  }
  const gaps = [];
  for (const raw of sections.gaps) {
    const line = raw.trim(); if (!line) continue;
    const { cells: parts, table, separator } = cellsOf(line);
    if (separator) continue;
    if (table) { if (/^(topic|gap|finding|block|service|id)/i.test(parts[0] || '') && /^(finding|detail|note|found|related|count)/i.test(parts[1] || '')) continue; gaps.push(parts.filter(Boolean).join(': ')); }
    else gaps.push(stripMd(line));
  }
  const topics = all.filter(t => t.block === 'BT');
  const costTopics = all.filter(t => t.block === 'CT');
  const seasonalTopics = all.filter(t => t.block === 'ST');
  const sum = xs => xs.reduce((n, t) => n + t.related.length, 0);
  const counts = {
    topics: topics.length, related: sum(topics), cost: topics.filter(t => t.type === 'cost').length, decision: topics.filter(t => t.type === 'decision').length, question: topics.filter(t => t.type === 'question').length,
    ranked: ranked.length, rules: rules.length, gaps: gaps.length, services: [...new Set(topics.map(t => t.service))].length,
    cost_topics: costTopics.length, cost_related: sum(costTopics), seasonal_topics: seasonalTopics.length, seasonal_related: sum(seasonalTopics),
  };
  const version = costTopics.length || seasonalTopics.length ? 2 : 1;
  return { version, topics, costTopics, seasonalTopics, ranked, rules, gaps, warnings, counts, unread: nonLine.length };
}
// Every block of a parsed bank, BT then CT then ST
const allTopics = parsed => (parsed ? [...(parsed.topics || []), ...(parsed.costTopics || []), ...(parsed.seasonalTopics || [])] : []);

function validateBank(parsed) {
  if (!parsed || !parsed.topics.length) return { valid: false, error: 'No topics could be read from the reply (it should start with "## 1. TOPICS" and list each topic as "### [BT-N] | …" or a table row "| BT-N | …").' };
  if (parsed.topics.length < MIN_TOPICS) return { valid: false, error: `Only ${parsed.topics.length} topics could be read (at least ${MIN_TOPICS} needed).` };
  const withQuestions = parsed.topics.filter(t => t.question).length;
  if (withQuestions < MIN_TOPICS) return { valid: false, error: `Only ${withQuestions} topics carry a target question.` };
  return { valid: true, error: null };
}

// The repo file for a trade (the seed the store loads when the database has none)
const bankFile = trade => path.join(DIR, `${trade}.md`);
const relative = file => path.relative(path.join(DIR, '..'), file).split(path.sep).join('/');
function readBankFile(trade) {
  const file = bankFile(trade);
  if (!fs.existsSync(file)) return { trade, file: relative(file), exists: false, text: '' };
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return { trade, file: relative(file), exists: true, text, header: parseHeader(text), fingerprint: fingerprintOf(text) };
}
function listBankFiles() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter(f => /^[a-z0-9-]+\.md$/.test(f)).map(f => f.replace(/\.md$/, '')).sort();
}

module.exports = { parseBank, validateBank, buildPrompt, promptInputs, allTopics, PREFIXES, header, parseHeader, isTestSample, fingerprintOf, readBankFile, listBankFiles, bankFile, relative, DIR, PROMPT_FILE, TYPES, DOUBTS, MIN_TOPICS };
