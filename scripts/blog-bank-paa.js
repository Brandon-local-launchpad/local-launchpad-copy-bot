#!/usr/bin/env node
'use strict';

// ── Blog question bank: the related questions from People also ask (local) ─────────
// Reads blog-bank/<trade>.md (the Perplexity run: the targets, the rules, the windows), sends
// every target question to the DataForSEO SERP API (Google organic, UK, the standard queue,
// People also ask two clicks deep), replaces each block's related questions with the People
// also ask ones (deduped, DIY how to and other trades filtered out, each marked PAA), writes
// the file back and the report to tests/quality-runs/blog/. Nothing is approved.
//
//   node scripts/blog-bank-paa.js landscaper
//   --dry-run     print the targets that would be searched, call nothing
//
// The credentials come from DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD (.env is read when
// present) and are never printed.

const fs = require('fs');
const path = require('path');
const B = require('../blog/bank');
const P = require('../blog/paa');
const { loadDotEnv } = require('./trade-facts');

async function main() {
  const args = process.argv.slice(2);
  const trade = (args.find(a => !a.startsWith('-')) || '').toLowerCase();
  const dryRun = args.includes('--dry-run');
  if (!trade || !/^[a-z0-9-]+$/.test(trade)) { console.log('node scripts/blog-bank-paa.js <trade> [--dry-run]'); process.exitCode = 1; return; }
  const f = B.readBankFile(trade);
  if (!f.exists) { console.log(`${trade}: no bank file at ${f.file}; run scripts/blog-bank.js first`); process.exitCode = 1; return; }
  const parsed = B.parseBank(f.text);
  const targets = B.allTopics(parsed).filter(t => t.question);
  if (dryRun) { console.log(`${trade}: ${targets.length} target question(s) would be searched:\n${targets.map(t => `  ${t.id}  ${t.question}`).join('\n')}`); return; }
  loadDotEnv();
  let niche = null;
  try { niche = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'niche-library', `${trade}.json`), 'utf8')); } catch (_) { niche = null; }
  const started = Date.now();
  const date = new Date().toISOString().slice(0, 10);
  const r = await P.paaPass(f.text, { niche, date, onStatus: s => console.log(`${trade}: ${s}`) });
  fs.writeFileSync(path.join(B.DIR, `${trade}.md`), r.text, 'utf8');
  const reportDir = path.join(__dirname, '..', 'tests', 'quality-runs', 'blog');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `BANK_paa_${trade}_${date}_report.txt`);
  const text = P.formatReport(r.report, { trade, cost: r.cost, calls: r.calls });
  fs.writeFileSync(reportFile, text + '\n', 'utf8');
  const check = B.validateBank(B.parseBank(r.text));
  console.log(`${trade}: done in ${Math.round((Date.now() - started) / 1000)}s, $${r.cost.toFixed(4)}: ${r.report.totals.found} questions found, ${r.report.totals.kept} kept over ${r.report.totals.blocks} blocks (${r.report.totals.thin} under ${P.MIN_PER_BLOCK}); wrote ${B.relative(path.join(B.DIR, `${trade}.md`))} and ${path.relative(process.cwd(), reportFile).split(path.sep).join('/')}${check.valid ? '' : `; NOT USABLE: ${check.error}`}. Not approved.`);
  console.log('');
  console.log(text);
}

if (require.main === module) main().catch(err => { console.error(err.message); process.exitCode = 1; });
