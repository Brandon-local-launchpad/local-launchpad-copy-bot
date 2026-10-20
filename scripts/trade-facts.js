#!/usr/bin/env node
'use strict';

// ── Trade facts runner ───────────────────────────────────────────────────────
// Writes one research pack per niche: trade-facts/<niche>.md from trade-facts/core.md
// plus trade-facts/blocks/<niche>.md, sent to Perplexity as one user message.
//
//   node scripts/trade-facts.js                 every block with no pack yet
//   node scripts/trade-facts.js roofer builder  only these niches
//   --force          re-run niches that already have a pack
//   --concurrency 3  parallel calls (default 3, or TRADE_FACTS_CONCURRENCY)
//   --preset high    Perplexity Agent API preset (default high, or TRADE_FACTS_PRESET)
//   --dry-run        print what would run and the prompt sizes, call nothing
//
// The key comes from PERPLEXITY_API_KEY (.env is read when present) and is never
// printed. Perplexity ended Sonar chat completions on 27 Sep 2026 and maps the
// sonar-deep-research model to the Agent API "high" preset, so that is the call made:
// POST /v1/agent in background mode, polled until it completes. The pack's header
// records the date, the preset and the model Perplexity reports, and "verified: no";
// the verified flag itself is set in Copybot (Trade facts page), never in the file.

const fs = require('fs');
const path = require('path');
const P = require('../trade-facts/pack');

const AGENT_URL = 'https://api.perplexity.ai/v1/agent';
const DEFAULT_PRESET = 'high';
const POLL_MS = 15000;
const TIMEOUT_MS = 30 * 60 * 1000;
const BACKOFF_MS = [30000, 60000, 120000, 240000];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Reads KEY=value lines from .env without printing anything (dotenv is not a dependency)
function loadDotEnv(file = path.join(__dirname, '..', '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// The answer text of an Agent API response
function responseText(r) {
  if (r.output_text && String(r.output_text).trim()) return String(r.output_text);
  const parts = [];
  for (const item of Array.isArray(r.output) ? r.output : []) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const c of item.content) if ((c.type === 'output_text' || c.type === 'text') && c.text) parts.push(c.text);
  }
  return parts.join('\n');
}

// Perplexity cites as [web:N] markers, N being search_results[].id in the response's
// output. The pack needs URLs (Ray opens every source), so markers become [url]:
// "[url][web:N]" keeps the inline url, a bare "[web:N]" becomes the mapped url, and an
// id with no result is dropped. Returns { text, resolved, unmatched }.
function resolveCitations(text, r) {
  const urls = {};
  for (const item of Array.isArray(r && r.output) ? r.output : []) {
    if (item.type === 'search_results' && Array.isArray(item.results)) {
      for (const s of item.results) if (s.id != null && s.url) urls[s.id] = s.url;
    }
  }
  let resolved = 0, unmatched = 0;
  let out = String(text).replace(/(\[https?:\/\/[^\]]+\])\[web:\d+\]/g, (_, url) => url);
  out = out.replace(/\[web:(\d+)\]/g, (_, n) => {
    const url = urls[parseInt(n, 10)];
    if (url) { resolved++; return `[${url}]`; }
    unmatched++;
    return '';
  });
  return { text: out, resolved, unmatched };
}

// usage.cost.total_cost when Perplexity reports it, else null (no guessing at rates)
function responseCost(r) {
  const c = r && r.usage && r.usage.cost;
  return c && c.total_cost != null && !isNaN(Number(c.total_cost)) ? Number(c.total_cost) : null;
}

// The real API: submit in background mode, poll to completion. Returns
// { text, model, cost, usage }. 429s back off; other errors throw without the key.
function perplexityAgent({ apiKey, preset = DEFAULT_PRESET, fetchFn = global.fetch, pollMs = POLL_MS, timeoutMs = TIMEOUT_MS, backoffMs = BACKOFF_MS, onStatus = () => {} } = {}) {
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY is not set');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
  const errorOf = async (res, what) => new Error(`Perplexity ${what} error ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);

  async function submit(prompt) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchFn(AGENT_URL, { method: 'POST', headers, body: JSON.stringify({ preset, input: prompt, background: true }) });
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers && res.headers.get ? res.headers.get('Retry-After') || '' : '', 10);
        const wait = retryAfter > 0 ? Math.min(retryAfter * 1000, 5 * 60 * 1000) : backoffMs[Math.min(attempt, backoffMs.length - 1)];
        if (attempt >= 8) throw new Error('Perplexity 429 rate limit: gave up after 8 waits');
        onStatus(`rate limited, waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw await errorOf(res, 'submit');
      const body = await res.json();
      if (!body.id) throw new Error('Perplexity submit returned no response id');
      return body;
    }
  }

  async function poll(id) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (Date.now() > deadline) throw new Error(`Perplexity timeout after ${Math.round(timeoutMs / 60000)} min waiting for ${id}`);
      await sleep(pollMs);
      const res = await fetchFn(`${AGENT_URL}/${id}`, { headers });
      // A rate limit on a poll is not a failed job: the research carries on server side
      if (res.status === 429) { onStatus('rate limited while polling, waiting'); await sleep(backoffMs[0]); continue; }
      if (!res.ok) throw await errorOf(res, 'poll');
      const body = await res.json();
      if (body.status === 'completed') return body;
      if (['failed', 'incomplete', 'cancelled'].includes(body.status)) throw new Error(`Perplexity job ${body.status}: ${(body.error && body.error.message) || ''}`.trim());
      onStatus(body.status || 'running');
    }
  }

  return {
    preset,
    async research(prompt) {
      const submitted = await submit(prompt);
      const done = submitted.status === 'completed' ? submitted : await poll(submitted.id);
      const raw = responseText(done);
      if (!raw.trim()) throw new Error('Perplexity returned an empty answer');
      const { text, resolved, unmatched } = resolveCitations(raw, done);
      return { text, model: done.model || null, cost: responseCost(done), usage: done.usage || null, citations: { resolved, unmatched } };
    },
  };
}

const fmtMoney = c => c == null ? 'cost not reported' : `$${c.toFixed(2)}`;
const fmtSecs = ms => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; };

// Runs the packs. api: { preset, research(prompt) }. Returns { results: [{ niche, status, file, cost, error }], totalCost }.
// status: written | skipped | failed | planned (dry run)
async function run({ api, niches = null, force = false, concurrency = 3, dryRun = false, log = console.log, today = () => new Date().toISOString().slice(0, 10) } = {}) {
  const core = P.readCore();
  const all = P.listNiches().filter(P.hasBlock);
  const wanted = niches && niches.length ? niches.map(n => n.toLowerCase()) : all;
  for (const n of wanted) if (!P.hasBlock(n)) throw new Error(`No block for "${n}": expected ${P.relative(P.blockFile(n))}`);
  if (!wanted.length) { log('No blocks found in trade-facts/blocks/. Nothing to do.'); return { results: [], totalCost: 0 }; }

  const todo = [];
  const results = [];
  for (const niche of wanted) {
    const pack = P.readPack(niche);
    if (pack.exists && !force) {
      const when = pack.header ? ` (generated ${pack.header.generated})` : '';
      log(`${niche}: skipped, ${pack.file} exists${when}; use --force to re-run`);
      results.push({ niche, status: 'skipped', file: pack.file, cost: null });
      continue;
    }
    todo.push(niche);
  }

  const modelLabel = api && api.preset ? `perplexity agent ${api.preset}` : 'perplexity';
  const one = async niche => {
    const prompt = `${core}\n\n${P.readBlock(niche)}`;
    const file = P.relative(P.packFile(niche));
    if (dryRun) { log(`${niche}: would run, prompt ${prompt.length} chars → ${file}`); return { niche, status: 'planned', file, cost: null }; }
    const started = Date.now();
    log(`${niche}: running (${modelLabel})`);
    try {
      const r = await api.research(prompt);
      const model = r.model ? `${modelLabel} (${r.model})` : modelLabel;
      const text = `${P.header({ generated: today(), model })}\n\n${r.text.replace(/\r\n/g, '\n').trim()}\n`;
      fs.mkdirSync(path.dirname(P.packFile(niche)), { recursive: true });
      fs.writeFileSync(P.packFile(niche), text, 'utf8');
      const cites = r.citations ? `, ${r.citations.resolved} sources resolved${r.citations.unmatched ? `, ${r.citations.unmatched} citation markers with no url dropped` : ''}` : '';
      log(`${niche}: done in ${fmtSecs(Date.now() - started)}, ${fmtMoney(r.cost)}${cites}, wrote ${file} (${text.length} chars); verify it on the Trade facts page`);
      return { niche, status: 'written', file, cost: r.cost, model };
    } catch (err) {
      log(`${niche}: failed after ${fmtSecs(Date.now() - started)}: ${err.message}`);
      return { niche, status: 'failed', file, cost: null, error: err.message };
    }
  };

  // A small worker pool
  const queue = [...todo];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, async () => {
    while (queue.length) results.push(await one(queue.shift()));
  });
  await Promise.all(workers);

  const written = results.filter(r => r.status === 'written');
  const failed = results.filter(r => r.status === 'failed');
  const totalCost = written.reduce((s, r) => s + (r.cost || 0), 0);
  const unpriced = written.filter(r => r.cost == null).length;
  if (!dryRun) log(`Done: ${written.length} written, ${results.filter(r => r.status === 'skipped').length} skipped, ${failed.length} failed. Cost ${fmtMoney(totalCost)}${unpriced ? ` (${unpriced} without a reported cost)` : ''}.`);
  return { results, totalCost };
}

function parseArgs(argv) {
  const opts = { niches: [], force: false, concurrency: parseInt(process.env.TRADE_FACTS_CONCURRENCY, 10) || 3, preset: process.env.TRADE_FACTS_PRESET || DEFAULT_PRESET, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--concurrency') opts.concurrency = parseInt(argv[++i], 10);
    else if (a.startsWith('--concurrency=')) opts.concurrency = parseInt(a.slice(14), 10);
    else if (a === '--preset') opts.preset = argv[++i];
    else if (a.startsWith('--preset=')) opts.preset = a.slice(9);
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a.startsWith('-')) throw new Error(`Unknown option ${a}`);
    else opts.niches.push(a);
  }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) throw new Error('--concurrency must be a whole number of 1 or more');
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log('node scripts/trade-facts.js [niche ...] [--force] [--concurrency N] [--preset high] [--dry-run]');
    return;
  }
  loadDotEnv();
  const api = opts.dryRun ? { preset: opts.preset } : perplexityAgent({ apiKey: process.env.PERPLEXITY_API_KEY, preset: opts.preset, onStatus: () => {} });
  const { results } = await run({ api, niches: opts.niches, force: opts.force, concurrency: opts.concurrency, dryRun: opts.dryRun });
  if (results.some(r => r.status === 'failed')) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(err => { console.error(err.message); process.exitCode = 1; });
}

module.exports = { run, perplexityAgent, parseArgs, responseText, responseCost, resolveCitations, loadDotEnv, AGENT_URL, DEFAULT_PRESET };
