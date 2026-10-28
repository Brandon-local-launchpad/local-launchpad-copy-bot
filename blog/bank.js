'use strict';

// ── The blog question bank: one Perplexity run per trade (Brandon, 28 Oct 2026) ──
// The prompt is prompts/Blog_Question_Bank_Perplexity_Prompt.md. The reply is parsed
// here into topics, each with its related questions, the ranked list of the 16 with
// the most search interest, the rules behind the rule topics and the gaps. Two shapes
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

// The prompt as sent to Perplexity: the fenced block with RUN FOR filled in
function buildPrompt(trade) {
  const md = fs.readFileSync(PROMPT_FILE, 'utf8').replace(/\r\n/g, '\n');
  const m = md.match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error('The bank prompt has no fenced block to send.');
  return m[1].replace(/^RUN FOR:.*$/m, `RUN FOR: ${trade}`);
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

const SECTION_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?[ \t]*(?:section[ \t]*)?([1-3])[ \t]*[.):][ \t]*(?:\*\*|__)?[ \t]*(TOPICS|RULES(?:[ \t]+BEHIND[ \t]+THE[ \t]+TOPICS)?|GAPS)\b[^\n]*$/im;
function splitSections(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = { 1: [], 2: [], 3: [] };
  let cur = null;
  for (const line of lines) {
    const m = line.match(SECTION_RE);
    if (m) { cur = m[1]; continue; }
    if (cur) out[cur].push(line);
  }
  return out;
}

const ID_RE = /\[?\s*(BT\s*-?\s*\d+)\s*(?:\.\s*([a-z]))?\s*\]?/i;
const RANK_WORDS = new Set('the topics topic with most search interest in rank ranked order by id ids only top sixteen volume priority provisional'.split(' '));
const idOf = s => { const m = String(s || '').match(ID_RE); if (!m) return null; const n = m[1].toUpperCase().replace(/\s+/g, '').replace(/^BT-?/, 'BT-'); return { topic: n, sub: m[2] ? m[2].toLowerCase() : null }; };
const urlOf = s => { const m = String(s || '').match(/https?:\/\/[^\s\]|)]+/); return m ? m[0] : ''; };
// The cells of a line: a table row's (the outer pipes dropped) or a pipe separated line's
function cellsOf(line) {
  const s = stripMd(line);
  const table = /^\|.*\|\s*$/.test(s);
  const parts = (table ? s.replace(/^\|/, '').replace(/\|\s*$/, '') : s).split('|').map(c => c.trim());
  return { cells: parts, table, separator: table && parts.every(c => /^:?-{2,}:?$/.test(c) || !c), head: table && !idOf(parts[0]) && /^(id|topic|question|target)/i.test(parts[0] || '') };
}
const labelled = (parts, label) => { const re = new RegExp(`^${label}\\s*:\\s*(.*)$`, 'i'); for (const p of parts) { const m = p.match(re); if (m) return m[1].trim(); } return ''; };
const typeIn = s => { const v = String(s || '').toLowerCase().replace(/\s.*$/, ''); return TYPES.includes(v) ? v : ''; };
const doubtIn = s => DOUBTS.find(d => d.toLowerCase() === String(s || '').trim().toLowerCase()) || '';

function parseBank(text) {
  const warnings = [];
  const sections = splitSections(text);
  const topics = [];
  const ranked = [];
  let cur = null;
  const nonLine = [];
  for (const raw of sections[1]) {
    const line = raw.trim();
    if (!line) continue;
    const { cells: parts, table, separator, head } = cellsOf(line);
    if (separator || head) continue;
    if (/^#{1,6}\s/.test(line) && !idOf(parts[0])) continue; // a sub heading ("### Related questions")
    const id = idOf(parts[0]);
    const isHeader = id && !id.sub && (table ? parts.length >= 3 : (/^#{1,6}\s/.test(line) || (parts.length >= 3 && !/^[-*•]/.test(line))));
    if (isHeader) {
      if (topics.some(t => t.id === id.topic)) { warnings.push(`${id.topic}: appears twice; the second is skipped.`); cur = null; continue; }
      // Labelled cells (the line format), else the cells in the prompt's order (the table format)
      const typeRaw = labelled(parts, 'Type') || (typeIn(parts[2]) ? parts[2] : '');
      const t = { id: id.topic, question: unquote(parts[1] || ''), type: typeIn(typeRaw), service: labelled(parts, 'Service') || (parts.length >= 4 && !/^(seen|source|http)/i.test(parts[3]) ? parts[3] : '') || 'General', seen: labelled(parts, 'Seen') || (parts.length >= 5 ? parts[4].replace(/^seen\s*:\s*/i, '') : ''), url: urlOf(line), related: [] };
      if (!t.question) warnings.push(`${t.id}: no target question.`);
      if (!t.type) warnings.push(`${t.id}: type "${typeRaw || '(none)'}" is not cost, decision or question.`);
      if (!t.url) warnings.push(`${t.id}: no source url.`);
      topics.push(t); cur = t; continue;
    }
    if (id && id.sub) {
      const owner = topics.find(t => t.id === id.topic) || cur;
      if (!owner) { warnings.push(`${id.topic}.${id.sub}: a related question before any topic; skipped.`); continue; }
      if (owner.id !== id.topic) warnings.push(`${id.topic}.${id.sub}: listed under ${owner.id}; kept with ${owner.id}.`);
      const doubtRaw = labelled(parts, 'Doubt') || (doubtIn(parts[2]) ? parts[2] : '');
      const doubt = doubtIn(doubtRaw);
      const needsRaw = labelled(parts, 'Needs client fact') || labelled(parts, 'Needs fact') || labelled(parts, 'Client fact') || (parts.length >= 4 && /^(y|yes|n|no)$/i.test(parts[3]) ? parts[3] : '');
      const q = { id: `${owner.id}.${id.sub}`, question: unquote(parts[1] || ''), doubt, needsFact: /^y/i.test(needsRaw), url: urlOf(line) };
      if (!q.question) { warnings.push(`${q.id}: no question; skipped.`); continue; }
      if (!doubt) warnings.push(`${q.id}: doubt "${doubtRaw || parts[2] || '(none)'}" is not one of ${DOUBTS.join(', ')}.`);
      if (!q.url) warnings.push(`${q.id}: no source url.`);
      owner.related.push(q); continue;
    }
    // A line (or table row) of topic ids and nothing else worth reading is the ranked list
    // (the 16 with the most search interest): a line of ids, a numbered list, or a one column table
    const ids = [...line.matchAll(/BT\s*-?\s*(\d+)(?!\s*\.\s*[a-z])/gi)].map(m => `BT-${m[1]}`);
    const words = (line.replace(/BT\s*-?\s*\d+/gi, ' ').toLowerCase().match(/[a-z]+/g) || []).filter(w => !RANK_WORDS.has(w));
    if (ids.length && !words.length && (ids.length >= 3 || /^\s*\d+[.)]/.test(line) || table)) { for (const i of ids) if (!ranked.includes(i)) ranked.push(i); continue; }
    nonLine.push(line);
  }
  for (const t of topics) {
    if (t.related.length < 6) warnings.push(`${t.id}: ${t.related.length} related question${t.related.length === 1 ? '' : 's'} (6 to 10 asked for).`);
    if (t.related.length > 10) warnings.push(`${t.id}: ${t.related.length} related questions (10 at most asked for); all kept.`);
  }
  for (const id of ranked) if (!topics.some(t => t.id === id)) warnings.push(`ranked list names ${id}, which is not a topic.`);
  const rules = [];
  for (const raw of sections[2]) {
    const line = raw.trim(); if (!line) continue;
    const { cells: parts, separator, head } = cellsOf(line);
    if (separator || head) continue;
    const id = idOf(parts[0]);
    if (!id) { if (/^[-*•]/.test(raw) || /\|/.test(line)) warnings.push(`rules: a line with no topic id skipped: "${line.slice(0, 60)}".`); continue; }
    const text = unquote((parts[1] || '').replace(/\[?https?:\/\/[^\]\s]+\]?/g, '').trim());
    rules.push({ topic: id.topic, text, url: urlOf(line), official: /gov\.uk|planningportal|\.gov\b|council|\.org\.uk/i.test(urlOf(line)) });
    if (!topics.some(t => t.id === id.topic)) warnings.push(`rules: ${id.topic} is not a topic.`);
  }
  const gaps = [];
  for (const raw of sections[3]) {
    const line = raw.trim(); if (!line) continue;
    const { cells: parts, table, separator } = cellsOf(line);
    if (separator) continue;
    if (table) { if (/^(topic|gap|finding)/i.test(parts[0] || '') && /^(finding|detail|note)/i.test(parts[1] || '')) continue; gaps.push(parts.filter(Boolean).join(': ')); }
    else gaps.push(stripMd(line));
  }
  const counts = { topics: topics.length, related: topics.reduce((n, t) => n + t.related.length, 0), cost: topics.filter(t => t.type === 'cost').length, decision: topics.filter(t => t.type === 'decision').length, question: topics.filter(t => t.type === 'question').length, ranked: ranked.length, rules: rules.length, gaps: gaps.length, services: [...new Set(topics.map(t => t.service))].length };
  return { topics, ranked, rules, gaps, warnings, counts, unread: nonLine.length };
}

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

module.exports = { parseBank, validateBank, buildPrompt, header, parseHeader, isTestSample, fingerprintOf, readBankFile, listBankFiles, bankFile, relative, DIR, PROMPT_FILE, TYPES, DOUBTS, MIN_TOPICS };
