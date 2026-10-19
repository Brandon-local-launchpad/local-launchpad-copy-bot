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
// A name not in the library falls through to the heuristics and is flagged "not in library".

const fs = require('fs');
const path = require('path');

const VERDICTS = ['page', 'alias', 'fold', 'exclude'];
const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');

// Which file serves a niche label (fillout/niches.js labels) or key
const FILES = { 'landscapers/gardeners': 'landscaper', landscaper: 'landscaper', landscapers: 'landscaper', roofers: 'roofer', roofer: 'roofer', roofing: 'roofer' };
function fileFor(niche) {
  const n = norm(niche);
  const key = FILES[n] || n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = path.join(__dirname, `${key}.csv`);
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

// { file, entries: Map(norm gbp_name → { gbp_name, gbp_category, verdict, target, note }), problems: [] }
// or null when the niche has no library
function loadLibrary(niche, { file = fileFor(niche) } = {}) {
  if (!file) return null;
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const head = rows[0].map(h => norm(h));
  const col = name => head.indexOf(name);
  const problems = [];
  for (const c of ['gbp_name', 'verdict', 'target']) if (col(c) < 0) problems.push(`column "${c}" missing`);
  const entries = new Map();
  if (!problems.length) {
    rows.slice(1).forEach((r, i) => {
      const e = { gbp_name: (r[col('gbp_name')] || '').trim(), gbp_category: (r[col('gbp_category')] || '').trim(), verdict: norm(r[col('verdict')]), target: (r[col('target')] || '').trim(), note: (r[col('note')] || '').trim(), line: i + 2 };
      if (!e.gbp_name) return;
      if (!VERDICTS.includes(e.verdict)) { problems.push(`line ${e.line}: "${e.gbp_name}" has verdict "${e.verdict}", not one of ${VERDICTS.join(' / ')}`); return; }
      if (e.verdict !== 'exclude' && !e.target) { problems.push(`line ${e.line}: "${e.gbp_name}" (${e.verdict}) has no target`); return; }
      if (entries.has(norm(e.gbp_name))) problems.push(`line ${e.line}: "${e.gbp_name}" is listed twice; the first line wins`);
      else entries.set(norm(e.gbp_name), e);
    });
  }
  return { file: path.basename(file), entries, problems };
}

module.exports = { loadLibrary, fileFor, parseCsv, norm, VERDICTS };
