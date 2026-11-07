'use strict';
// ── Full site build through the Batch API, half price (7 Nov 2026) ───────────
// Same decisions, generators, checks and retries as the live runners, with batch-call.js behind them.
// Each tier of pages is written together: homepage, then category and location category pages, then
// service and town service pages, then location pages. Every model round of a tier is one batch, so a
// tier takes as many batches as it has rounds. Live single page generation does not use this.
//
//   node tools/site-batch-build.js --dry                       the pages it would write, spends nothing
//   node tools/site-batch-build.js --pages homepage,/gardener  just these pages (a slug, or "homepage")
//   node tools/site-batch-build.js --client <id>               another client (default Edens Edge)
//   node tools/site-batch-build.js --save                      also store the records on the live client; without it, files only
//   node tools/site-batch-build.js --label BT                  the folder name for the run's files
//
// One limit to know: pages written in the same tier can't see each other, so IDEAS USED ELSEWHERE and
// MECHANISMS USED carry only earlier tiers. The checks still run per page.

const fs = require('fs');
const path = require('path');
const M = require('./model-test');
const Anthropic = require('@anthropic-ai/sdk');
const { makeBatchCallModel } = require('../batch-call');
const PM = require('../page-models');
const R = require('../v20-retry');
const G = require('../v20-generate');
const CG = require('../category-generate');
const SG = require('../service-generate');
const LG = require('../location-generate');
const P = require('../trade-facts/pack');
const { Pool } = require('pg');
const { createV20Store } = require('../v20-store');
const { createCategoryRunner, pagesInOrder: categoryPages } = require('../category-run');
const { createServiceRunner, pagesInOrder: servicePages } = require('../service-run');
const { createLocationRunner, pagesInOrder: locationPages } = require('../location-run');

const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const flag = n => process.argv.includes(n);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const clientId = arg('--client') || M.CLIENT_ID;
const label = arg('--label') || 'batch';

(async () => {
  R.setRetryConcurrency(500); // a round goes up as one batch, not four at a time
  const ro = M.readOnlyPool();
  const I = await M.liveInputs(ro, clientId);
  const baseStore = createV20Store(ro);
  const written = new Map();
  const saving = flag('--save');
  const writePool = saving ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
  const realStore = saving ? createV20Store(writePool) : null;
  const store = {
    ...baseStore,
    latest: async (cid, q) => (written.has(`${q.type}:${q.key}`) ? { record: written.get(`${q.type}:${q.key}`) } : baseStore.latest(cid, q)),
  };

  const inputs = { ctx: I.ctx, niche: I.niche, rows: I.rows, dossiers: I.dossiers, allocationRecord: I.allocationRecord, calibrationPack: I.calibrationPack, reviews: I.reviews, saveAllocation: I.saveAllocation };
  const batches = [];
  const callsByPage = new Map();
  const onBatch = b => { batches.push(b); console.log(`  batch ${b.id}: ${b.requests} request(s), ${Math.round(b.ms / 1000)}s`); };
  const batchers = {};
  const batcherFor = type => {
    const m = PM.forPage(type);
    return batchers[`${m.model}:${m.effort}`] = batchers[`${m.model}:${m.effort}`] || makeBatchCallModel(client, m.model, { defaultEffort: m.effort, onBatch });
  };
  const metered = (type, key) => {
    const sink = [];
    callsByPage.set(key, sink);
    const base = batcherFor(type);
    return async args => {
      const t0 = Date.now();
      const r = await base(args);
      if (r.usage.spent_attempt) { const w = r.usage.spent_attempt; sink.push({ role: `${M.roleFor(args)} ran out`, requested_model: w.requested_model, served_model: w.model, effort: w.effort, stop_reason: w.stop_reason, input_tokens: w.input_tokens, output_tokens: w.output_tokens, cache_read_input_tokens: w.cache_read_input_tokens, cache_creation_input_tokens: w.cache_creation_input_tokens, raw_usage: w.raw_usage, text: '', batch: true }); }
      sink.push({ role: M.roleFor(args), requested_model: r.usage.requested_model, served_model: r.usage.model, effort: r.usage.effort, lowered_from: r.usage.lowered_from, rate_limit_waits: 0, stop_reason: r.usage.stop_reason, ms: Date.now() - t0, input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens, cache_read_input_tokens: r.usage.cache_read_input_tokens, cache_creation_input_tokens: r.usage.cache_creation_input_tokens, raw_usage: r.usage.raw_usage, text: r.text, prefix_sha: JSON.stringify(args.system).length, message_sha: String(args.message).length, batch: true });
      return r;
    };
  };

  const base = { pool: ro, v20Store: store, allocate: M.allocate };
  const catRunner = createCategoryRunner({ ...base, loadInputs: async () => inputs, generate: async args => {
    const D = args.decisionsResult.decisions;
    let tf = args.tradeFacts;
    if (tf && D) { const pack = P.packForCategory(tf.niche, D.category, D.cards.map(c => c.name)); tf = { ...tf, markdown: pack.markdown, missing: pack.missing }; }
    return CG.generateCategoryPage({ ...args, tradeFacts: tf, callModel: metered('category', D.slug) });
  } });
  const svcRunner = createServiceRunner({ ...base, loadInputs: async () => inputs, generate: args => SG.generateServicePage({ ...args, callModel: metered('service', args.decisionsResult.decisions.slug) }) });
  const locRunner = createLocationRunner({ ...base, loadInputs: async () => inputs, generate: args => LG.generateLocationPage({ ...args, callModel: metered('location', args.decisionsResult.decisions.slug) }) });

  const homepageWanted = true;
  const want = arg('--pages') ? new Set(arg('--pages').split(',').map(s => s.trim())) : null;
  const pick = rows => rows.filter(r => !want || want.has(r.slug));
  const tiers = [
    { type: 'homepage', pages: homepageWanted && (!want || want.has('homepage')) ? [{ slug: 'homepage' }] : [] },
    { type: 'category', pages: pick(categoryPages(I.rows)), runner: catRunner, inputs: { ...inputs, tradeFacts: I.tradeFactsCategory } },
    { type: 'service', pages: pick(servicePages(I.rows)), runner: svcRunner, inputs: { ...inputs, tradeFacts: I.tradeFactsService } },
    { type: 'location', pages: pick(locationPages(I.rows)), runner: locRunner, inputs },
  ];
  for (const t of tiers) console.log(`${t.type}: ${t.pages.length} page(s)`);
  if (flag('--dry')) { await ro.pool.end(); return; }

  const dirOf = key => path.join(M.RAW, `batch-${label}`, String(key).replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '_') || 'homepage');
  const t0 = Date.now();
  for (const t of tiers) {
    if (!t.pages.length) continue;
    const started = Date.now();
    if (t.type === 'homepage') {
      const H = await M.prepareHomepage(ro, I);
      const record = await G.generateV20Homepage({ cv: I.cv, niche: I.niche, keyValueMap: I.ctx.keyValueMap, serviceParentMap: I.ctx.serviceParentMap, decisionsResult: H.decisionsResult, calibrationPack: I.calibrationPack.text, calibrationPackName: I.calibrationPack.name, extraFlags: H.extraFlags, allocationSource: H.allocationSource, callModel: metered('homepage', 'homepage') });
      written.set('homepage:homepage', record);
    } else {
      const results = await Promise.all(t.pages.map(async p => {
        const w = await t.runner.writtenFor(clientId, I.rows, t.type === 'location' ? p : p.slug);
        return [p, await t.runner.writePage(clientId, t.inputs, p, w)];
      }));
      for (const [p, record] of results) written.set(`${t.type === 'category' && p.type !== 'category' ? 'category' : t.type}:${p.slug}`, record);
    }
    console.log(`${t.type} tier: ${Math.round((Date.now() - started) / 1000)}s`);
  }
  const wall = Date.now() - t0;

  let usd = 0;
  const summary = [];
  for (const [k, record] of written) {
    const key = k.split(':').slice(1).join(':');
    const calls = callsByPage.get(key) || [];
    const dir = dirOf(key);
    M.writeJson(path.join(dir, 'record.json'), record);
    M.writeJson(path.join(dir, 'calls.json'), calls);
    M.writeJson(path.join(dir, 'run.json'), { page: key, setup: label, wall_ms: wall, finished: new Date().toISOString() });
    const c = calls.reduce((s, x) => s + M.costOf(x.served_model, x), 0);
    usd += c;
    summary.push({ key, usd: c, calls: calls.length, block: record.VALIDATION && record.VALIDATION.block, flag: record.VALIDATION && record.VALIDATION.flag });
    if (saving) { const [type] = k.split(':'); await realStore.insert(clientId, record, { type, key }); }
  }
  M.writeJson(path.join(M.RAW, `batch-${label}`, 'summary.json'), { wall_ms: wall, usd, batches, pages: summary });
  console.log(`Done in ${Math.round(wall / 1000)}s, ${batches.length} batches, $${usd.toFixed(3)} at batch prices.`);
  for (const s of summary) console.log(`  ${s.key}: $${s.usd.toFixed(3)}, ${s.calls} calls, ${s.block} BLOCK, ${s.flag} FLAG`);
  await ro.pool.end();
  if (writePool) await writePool.end();
})().catch(e => { console.error(e); process.exit(1); });
