#!/usr/bin/env node
'use strict';

// ── Trade facts: Table H, the option facts (29 Oct 2026) ─────────────────────────────
// A decision post ("turf or seed", "EPDM or GRP") needs facts behind each option, or it is
// held (G-OPTIONS). This runs trade-facts/options-core.md through Perplexity once per trade
// with every decision the trade has: the niche entry's decision pairs (blog.decision_pairs)
// and the decision topics of the trade's blog bank (blog-bank/<trade>.md), each with the two
// option names code reads from it (blog/decisions.js optionsOf, the same reading the post
// gets). The answer, 4 to 6 sourced rows per option (what it is, lifespan, upkeep, where it
// suits, price factor, rule), is written into the trade's pack as TABLE H, after Table G.
// The pack's fingerprint changes, so it is unverified until Verify is pressed on the Trade
// facts page, the same gate as the rest of the pack (blog/decisions.js reads Table H only
// through a verified pack).
//
//   node scripts/trade-facts-options.js landscaper roofer
//   --dry-run        print the decisions and the prompt, call nothing
//   --preset high    the Agent API preset (default high)
//   --force          run again when the pack already has a Table H
// The key comes from PERPLEXITY_API_KEY (.env is read when present) and is never printed.

const fs = require('fs');
const path = require('path');
const P = require('../trade-facts/pack');
const B = require('../blog/bank');
const { optionsOf } = require('../blog/decisions');
const { perplexityAgent, loadDotEnv, DEFAULT_PRESET } = require('./trade-facts');

const OPTIONS_CORE = path.join(__dirname, '..', 'trade-facts', 'options-core.md');

function readOptionsCore() {
  const text = fs.readFileSync(OPTIONS_CORE, 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`${P.relative(OPTIONS_CORE)} has no fenced prompt`);
  return m[1].trim();
}

// The decisions for a trade: the niche entry's pairs, then the bank's decision topics whose
// question names two options; one entry per option pair
function decisionsFor(trade) {
  let niche = null;
  try { niche = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'niche-library', `${trade}.json`), 'utf8')); } catch (_) { niche = null; }
  const out = [], seen = new Set();
  const add = (label, from, question) => {
    const opts = optionsOf(question || label);
    if (!opts) return { label, skipped: 'no two options read from it' };
    const key = opts.map(o => o.toLowerCase()).sort().join('|');
    if (seen.has(key)) return { label, skipped: 'the same pair again' };
    seen.add(key);
    out.push({ label, options: opts, from });
    return null;
  };
  const skipped = [];
  for (const pair of (niche && niche.blog && niche.blog.decision_pairs) || []) { const s = add(pair, 'niche entry'); if (s) skipped.push(s); }
  const bankFile = B.bankFile(trade);
  if (fs.existsSync(bankFile)) {
    const bank = B.parseBank(fs.readFileSync(bankFile, 'utf8'));
    for (const t of bank.topics.filter(t => t.type === 'decision')) { const s = add(t.question, `bank ${t.id}`, t.question); if (s) skipped.push(s); }
  }
  return { trade: (niche && niche.trade) || trade, decisions: out, skipped, bank: fs.existsSync(bankFile) };
}

function buildPrompt(trade) {
  const d = decisionsFor(trade);
  const lines = d.decisions.map((x, i) => `- D${i + 1}: "${x.label}" | options: ${x.options[0]}; ${x.options[1]}`);
  const prompt = readOptionsCore().replace(/\[TRADE\]/g, d.trade.toLowerCase()).replace('[DECISIONS]', lines.join('\n') || '(none)');
  return { ...d, prompt };
}

// The TABLE H section of a reply: from its TABLE H line to END OF PACK (or the end)
function tableHOf(text) {
  const t = String(text || '').replace(/\r\n/g, '\n');
  const i = t.search(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*TABLE\s+H\b/im);
  if (i < 0) return null;
  const rest = t.slice(i);
  const j = rest.search(/^\s*(?:#{1,6}\s*)?(?:\*\*)?END OF PACK/im);
  return (j >= 0 ? rest.slice(0, j) : rest).trim();
}

// The pack text with this TABLE H in place of any earlier one, before END OF PACK
function withTableH(packText, tableH) {
  let t = String(packText).replace(/\r\n/g, '\n');
  const lines = t.split('\n');
  const isH = l => /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*TABLE\s+H\b/i.test(l);
  const isTable = l => /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*TABLE\s+[A-Z]\b/i.test(l);
  const isEnd = l => /^\s*(?:#{1,6}\s*)?(?:\*\*)?END OF PACK/i.test(l);
  const start = lines.findIndex(isH);
  if (start >= 0) {
    let end = start + 1;
    while (end < lines.length && !isTable(lines[end]) && !isEnd(lines[end])) end++;
    lines.splice(start, end - start, ...`${tableH}\n`.split('\n'));
    return lines.join('\n');
  }
  const endAt = lines.findIndex(isEnd);
  if (endAt >= 0) { lines.splice(endAt, 0, ...`${tableH}\n`.split('\n')); return lines.join('\n'); }
  return `${t.trimEnd()}\n\n${tableH}\n`;
}

// Rows per decision and option, from the pack's Table H
function report(trade) {
  const facts = P.optionFacts(trade);
  const by = new Map();
  for (const r of facts) { const k = `${r.decision} | ${r.option}`; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  const lines = [`TABLE H REPORT: ${trade} (${P.relative(P.packFile(trade))}): ${facts.length} rows over ${by.size} option(s)`];
  for (const [k, rows] of by) lines.push(`  ${String(rows.length).padStart(2)} rows  ${k}  [${[...new Set(rows.map(r => r.factKind))].join(', ')}]${rows.length < 4 ? '  UNDER 4' : ''}${rows.some(r => !r.source) ? '  (a row with no source)' : ''}`);
  const d = decisionsFor(trade);
  const have = new Set([...by.keys()].map(k => k.split(' | ')[1].toLowerCase()));
  const none = d.decisions.flatMap(x => x.options.filter(o => !have.has(o.toLowerCase())).map(o => `${x.label}: ${o}`));
  if (none.length) lines.push(`  Options with no rows (${none.length}): ${none.join('; ')}`);
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const trades = args.filter(a => !a.startsWith('-') && !/^(high|medium|low)$/.test(a));
  const dryRun = args.includes('--dry-run'), force = args.includes('--force');
  const pi = args.indexOf('--preset');
  const preset = pi >= 0 ? args[pi + 1] : (process.env.TRADE_FACTS_PRESET || DEFAULT_PRESET);
  if (!trades.length) { console.log('node scripts/trade-facts-options.js <trade> [<trade>…] [--dry-run] [--force] [--preset high]'); process.exitCode = 1; return; }
  loadDotEnv();
  let api = null;
  for (const trade of trades) {
    const pack = P.readPack(trade);
    if (!pack.exists) { console.log(`${trade}: no pack at ${P.relative(P.packFile(trade))}; run scripts/trade-facts.js first`); process.exitCode = 1; continue; }
    const built = buildPrompt(trade);
    if (!built.bank) console.log(`${trade}: no blog bank at ${B.relative(B.bankFile(trade))}; the niche entry's pairs only`);
    console.log(`${trade}: ${built.decisions.length} decision(s), ${built.decisions.length * 2} options${built.skipped.length ? `; ${built.skipped.length} skipped (${built.skipped.map(s => `${s.label}: ${s.skipped}`).join('; ')})` : ''}`);
    for (const d of built.decisions) console.log(`  ${d.label}  →  ${d.options.join(' | ')}  (${d.from})`);
    if (dryRun) { console.log(`\n${trade}: would run, prompt ${built.prompt.length} chars → TABLE H in ${P.relative(P.packFile(trade))}\n\n${built.prompt}\n`); continue; }
    if (P.optionFacts(trade).length && !force) { console.log(`${trade}: the pack already has a Table H (${P.optionFacts(trade).length} rows); use --force to run again`); continue; }
    if (!api) api = perplexityAgent({ apiKey: process.env.PERPLEXITY_API_KEY, preset, onStatus: s => console.log(`${trade}: ${s}`) });
    const started = Date.now();
    console.log(`${trade}: running (perplexity agent ${preset})`);
    const r = await api.research(built.prompt);
    const tableH = tableHOf(r.text);
    if (!tableH) { console.log(`${trade}: the reply has no TABLE H; nothing written. First 400 chars:\n${String(r.text).slice(0, 400)}`); process.exitCode = 1; continue; }
    const text = withTableH(pack.text, tableH);
    fs.writeFileSync(P.packFile(trade), text, 'utf8');
    const secs = Math.round((Date.now() - started) / 1000);
    const cost = r.cost == null ? 'no cost reported' : `$${Number(r.cost).toFixed(2)}`;
    console.log(`${trade}: done in ${secs}s, ${cost}${r.citations ? `, ${r.citations.resolved} sources resolved` : ''}; TABLE H written into ${P.relative(P.packFile(trade))}. The pack is unverified until Verify is pressed on the Trade facts page.`);
    console.log(report(trade));
  }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { decisionsFor, buildPrompt, tableHOf, withTableH, report, readOptionsCore };
