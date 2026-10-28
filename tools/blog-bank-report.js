#!/usr/bin/env node
'use strict';

// ── Blog question bank report (local) ─────────────────────────────────────────
// Reads a trade's bank file (blog-bank/<trade>.md, or a file given) with the parser and prints
// the counts per block: every BT, CT and ST block with its service, its related question count
// and (ST) its window, the ranked list, the rules, the GAPS section as the run wrote it, the
// parser's warnings, and the v2 coverage: the services from the services library with no CT
// block and the niche entry's seasonal topics with no ST block. Nothing is written or approved.
//
//   node tools/blog-bank-report.js landscaper
//   node tools/blog-bank-report.js landscaper path/to/other-bank.md

const fs = require('fs');
const path = require('path');
const B = require('../blog/bank');

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameService = (a, b) => { const x = norm(a), y = norm(b); return x === y || (x.length > 4 && (y.includes(x) || x.includes(y))); };

function report(trade, file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const p = B.parseBank(text);
  const check = B.validateBank(p);
  const inputs = B.promptInputs(trade);
  const L = [];
  L.push(`BANK REPORT: ${trade} (${path.relative(process.cwd(), file).split(path.sep).join('/')}), ${(B.parseHeader(text) || {}).model || 'no header'}, parser v${p.version}`);
  L.push(`${check.valid ? 'usable' : `NOT USABLE: ${check.error}`}; ${p.unread} line(s) not read; ${p.warnings.length} warning(s)`);
  L.push('');
  const block = (title, list, extra = () => '') => {
    L.push(`${title}: ${list.length} block(s), ${list.reduce((n, t) => n + t.related.length, 0)} related questions`);
    for (const t of list) L.push(`  ${t.id.padEnd(6)} ${String(t.related.length).padStart(2)} related  ${t.service.padEnd(34).slice(0, 34)} ${t.question}${extra(t)}`);
    L.push('');
  };
  block('1. TOPICS (BT)', p.topics, t => ` [${t.type || 'no type'}]`);
  block('2. COST TOPICS (CT)', p.costTopics);
  block('3. SEASONAL TOPICS (ST)', p.seasonalTopics, t => `\n         window: ${t.window || 'no window stated'}${t.window_url ? ` (${t.window_url})` : ''}`);
  L.push(`4. RANKED: ${p.ranked.length} id(s): ${p.ranked.join(', ') || 'none'}`);
  L.push('');
  L.push(`5. RULES: ${p.rules.length}`);
  for (const r of p.rules) L.push(`  ${r.topic.padEnd(6)} ${r.official ? 'official' : 'NOT official'}  ${r.text.slice(0, 140)}${r.text.length > 140 ? '…' : ''}  ${r.url}`);
  L.push('');
  L.push(`6. GAPS: ${p.gaps.length} line(s)`);
  for (const g of p.gaps) L.push(`  ${g}`);
  L.push('');
  const noCt = inputs.services.filter(s => !p.costTopics.some(t => sameService(t.service, s)));
  const noSt = inputs.seasonalTopics.filter(s => !p.seasonalTopics.some(t => sameService(t.service, s.topic) || norm(t.question).includes(norm(s.topic).split(' ').slice(-2).join(' '))));
  L.push(`COVERAGE: ${inputs.services.length} service(s) sent, ${inputs.services.length - noCt.length} with a CT block${noCt.length ? `; no CT block: ${noCt.join(', ')}` : ''}`);
  L.push(`          ${inputs.seasonalTopics.length} seasonal topic(s) sent, ${inputs.seasonalTopics.length - noSt.length} with an ST block${noSt.length ? `; no ST block: ${noSt.map(s => s.topic).join(', ')}` : ''}`);
  L.push(`          blocks under 6 related: ${B.allTopics(p).filter(t => t.related.length < 6).map(t => `${t.id} (${t.related.length})`).join(', ') || 'none'}`);
  L.push('');
  L.push(`WARNINGS: ${p.warnings.length}`);
  for (const w of p.warnings) L.push(`  ${w}`);
  return { text: L.join('\n'), parsed: p, check };
}

function main() {
  const args = process.argv.slice(2);
  const trade = (args.find(a => !a.startsWith('-')) || '').toLowerCase();
  const given = args.filter(a => !a.startsWith('-'))[1];
  if (!trade) { console.log('node tools/blog-bank-report.js <trade> [file]'); process.exitCode = 1; return; }
  const file = given ? path.resolve(given) : B.bankFile(trade);
  if (!fs.existsSync(file)) { console.log(`${trade}: no bank file at ${file}`); process.exitCode = 1; return; }
  console.log(report(trade, file).text);
}

if (require.main === module) main();
module.exports = { report };
