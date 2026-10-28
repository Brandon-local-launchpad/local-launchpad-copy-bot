#!/usr/bin/env node
'use strict';

// ── Blog question bank runner (local) ─────────────────────────────────────────
// Runs prompts/Blog_Question_Bank_Perplexity_Prompt.md for a trade through the Perplexity
// Agent API (the trade facts runner's call: background mode, polled) and writes
// blog-bank/<trade>.md with the pack files' header line. The live app loads that file as
// the trade's bank when its database has none; approve it on the Trade facts page.
//
//   node scripts/blog-bank.js landscaper            write blog-bank/landscaper.md
//   node scripts/blog-bank.js landscaper --force    overwrite one that exists
//   --preset high        the Agent API preset (default high)
//   --dry-run            print the prompt, call nothing
// After the run the per block report (tools/blog-bank-report.js) is printed: every BT, CT and
// ST block with its related question count, the ranked ids, the rules, the GAPS section and
// the services and seasonal topics sent that came back with no block.
//
// The key comes from PERPLEXITY_API_KEY (.env is read when present) and is never printed.

const fs = require('fs');
const path = require('path');
const B = require('../blog/bank');
const { perplexityAgent, loadDotEnv, DEFAULT_PRESET } = require('./trade-facts');
const { report } = require('../tools/blog-bank-report');

async function main() {
  const args = process.argv.slice(2);
  const trade = (args.find(a => !a.startsWith('-')) || '').toLowerCase();
  const force = args.includes('--force'), dryRun = args.includes('--dry-run');
  const pi = args.indexOf('--preset');
  const preset = pi >= 0 ? args[pi + 1] : (process.env.TRADE_FACTS_PRESET || DEFAULT_PRESET);
  if (!trade || !/^[a-z0-9-]+$/.test(trade)) { console.log('node scripts/blog-bank.js <trade> [--force] [--preset high] [--dry-run]'); process.exitCode = 1; return; }
  const file = B.bankFile(trade);
  if (fs.existsSync(file) && !force && !dryRun) { console.log(`${trade}: ${B.relative(file)} exists; use --force to run again`); return; }
  const prompt = B.buildPrompt(trade);
  if (dryRun) { console.log(`${trade}: would run, prompt ${prompt.length} chars → ${B.relative(file)}\n\n${prompt}`); return; }
  loadDotEnv();
  const api = perplexityAgent({ apiKey: process.env.PERPLEXITY_API_KEY, preset, onStatus: s => console.log(`${trade}: ${s}`) });
  const started = Date.now();
  console.log(`${trade}: running (perplexity agent ${preset})`);
  const r = await api.research(prompt);
  const parsed = B.parseBank(r.text);
  const check = B.validateBank(parsed);
  const text = `${B.header({ generated: new Date().toISOString().slice(0, 10), model: `perplexity agent ${preset}${r.model ? ` (${r.model})` : ''}` })}\n\n${r.text.replace(/\r\n/g, '\n').trim()}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  console.log(`${trade}: done in ${Math.round((Date.now() - started) / 1000)}s, ${r.cost == null ? 'cost not reported' : `${r.cost.toFixed(2)}`}, wrote ${B.relative(file)}: ${parsed.counts.topics} topics, ${parsed.counts.related} related questions, ${parsed.counts.cost_topics} cost topics, ${parsed.counts.seasonal_topics} seasonal topics, ${parsed.warnings.length} warning(s)${check.valid ? '' : `; NOT USABLE: ${check.error}`}. Approve it on the Trade facts page.\n`);
  console.log(report(trade, file).text);
  if (!check.valid) process.exitCode = 1;
}

if (require.main === module) main().catch(err => { console.error(err.message); process.exitCode = 1; });
