'use strict';
// ── Model and effort test (6 Nov 2026) ───────────────────────────────────────
// Three pages of the live Edens Edge record, written by each setup in SETUPS, same prompts,
// same record, same retry rules. Reads the live database through a pool that refuses anything
// but SELECT and writes only to files. No WordPress, no live page record.
//
//   node tools/model-test.js --smoke           one tiny call per model: the raw usage block
//   node tools/model-test.js --prep            freeze each page's inputs (no writer call)
//   node tools/model-test.js --run             the writers, a page at a time, its setups in parallel (resumes)
//     --only homepage:A,service:F              just these runs
//     --max-usd 40                             stop starting pages past this total
//   node tools/model-test.js --judge           the judge (two readings) and the claims audit on every run (resumes)
//   node tools/model-test.js --report          the report, the blind reader views and the key
//   node tools/model-test.js --sweep           the hard BLOCKs over the 18 main pages and the 6 repeats
//   node tools/model-test.js --repeats         Haiku high twice more per page, judged, with its own report (resumes)
//
// Raw records: tests/quality-runs/model-test/<date>/ (not committed; they name the setups).
// Outputs: docs/model-test/<date>/.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const { makeCallModel } = require('../anthropic-call');
const G = require('../v20-generate');
const CG = require('../category-generate');
const SG = require('../service-generate');
const Q = require('../quality-review');
const A = require('../allocation');
const P = require('../trade-facts/pack');
const { computeDecisions } = require('../decisions');
const { contextFromPageMap } = require('../v20-context-v3');
const { createV20Store } = require('../v20-store');
const { createCategoryRunner } = require('../category-run');
const { createServiceRunner } = require('../service-run');
const { createFilloutService } = require('../fillout/service');
const { createPageMapStore, inputsFor } = require('../page-map/store');
const { createFaqService } = require('../faq-service');
const { createTradeFactsService } = require('../trade-facts/store');
const { categoryValidationContext } = require('../validate-category');
const { serviceValidationContext } = require('../validate-service');
const { pageTypeOf } = require('../page-types');
const { parseDossier } = require('../geo-dossier');
const calibrationPacks = require('../calibration-packs');
const { runClaimsReview, factsFromRecord } = require('../wp/claims-review');

const DATE = '2026-11-06';
const RAW = path.join(root, 'tests/quality-runs/model-test', DATE);
const OUT = path.join(root, 'docs/model-test', DATE);
const CLIENT_ID = '59e17154-4375-4541-ae11-7301c11f0a19'; // "ednes edge testing"
const SONNET = 'claude-sonnet-5-5', HAIKU = 'claude-haiku-5-5';
const USD_TO_GBP = 0.78; // ui/model-log.js

const SETUPS = {
  A: { label: 'sonnet-5-5, high', model: SONNET, effort: 'high', block_rewrite: null },
  B: { label: 'sonnet-5-5, medium', model: SONNET, effort: 'medium', block_rewrite: null },
  C: { label: 'sonnet-5-5, low', model: SONNET, effort: 'low', block_rewrite: null },
  D: { label: 'haiku-5-5, medium', model: HAIKU, effort: 'medium', block_rewrite: null },
  E: { label: 'haiku-5-5, high', model: HAIKU, effort: 'high', block_rewrite: null },
  F: { label: 'hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium', model: HAIKU, effort: 'medium', block_rewrite: { model: SONNET, effort: 'medium' } },
};
// Repeats of one setup on the same frozen inputs: how much a single run can be trusted
const REPEATS = { E2: { ...SETUPS.E, label: 'haiku-5-5, high, repeat 1' }, E3: { ...SETUPS.E, label: 'haiku-5-5, high, repeat 2' } };
const ALL_SETUPS = { ...SETUPS, ...REPEATS };
const JUDGE = { model: SONNET, effort: 'high' };
const PAGES = {
  service: { label: 'Service page: Lawn Mowing Southampton', file: 'service-lawn-mowing', slug: '/services/lawn-mowing', type: 'service' },
  category: { label: 'Category page: Gardener Southampton', file: 'category-gardener', slug: '/gardener', type: 'category' },
  homepage: { label: 'Homepage', file: 'homepage', slug: 'homepage', type: 'homepage' },
};

// $ per million tokens from the pricing page, 6 Nov 2026: input, output, cache read, 5 minute cache write
const RATES = {
  [SONNET]: [2, 10, 0.10, 2.5],
  [HAIKU]: [0.10, 0.50, 0.01, 0.125],
  'claude-opus-5-5': [4, 20, 0.20, 5],
  'claude-sonnet-4-6': [3, 15, 0.30, 3.75],
  'claude-opus-4-8': [5, 25, 0.50, 6.25],
};
const HAIKU_LONG = [0.50, 2.50, 0.05, 0.625]; // a Haiku prompt over 100k tokens, cached tokens included
const promptTokens = u => (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
function ratesFor(model, u) {
  if (model === HAIKU && promptTokens(u) > 100000) return HAIKU_LONG;
  const r = RATES[model];
  if (!r) throw new Error(`No price for ${model}`);
  return r;
}
function costOf(model, u) {
  const [i, o, cr, cw] = ratesFor(model, u);
  return (u.batch ? 0.5 : 1) * ((u.input_tokens || 0) * i + (u.output_tokens || 0) * o + (u.cache_read_input_tokens || 0) * cr + (u.cache_creation_input_tokens || 0) * cw) / 1e6;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const flag = name => process.argv.includes(name);
const sha = s => crypto.createHash('sha256').update(typeof s === 'string' ? s : JSON.stringify(s)).digest('hex').slice(0, 16);
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const runDir = (page, setup) => path.join(RAW, `${PAGES[page].file}_${setup}`);

// ── The live record, read only ───────────────────────────────────────────────
function readOnlyPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  return {
    pool,
    query(sql, params) {
      const text = typeof sql === 'string' ? sql : sql.text;
      if (!/^\s*(SELECT|WITH)\b/i.test(text) || /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i.test(text.replace(/'[^']*'/g, ''))) throw new Error(`Read only: refused ${text.slice(0, 80)}`);
      return pool.query(sql, params);
    },
  };
}
function clientValuesTemplate() {
  const src = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const m = src.match(/const CLIENT_VALUES_TEMPLATE = (\{[\s\S]*?\n\});/);
  return new Function(`return ${m[1]};`)();
}
const normLoc = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function liveInputs(ro, clientId = CLIENT_ID) {
  const q = (sql, p) => ro.query(sql, p);
  const client = (await q('SELECT id, name, trade, niche_key, v20_test_mode FROM clients WHERE id = $1', [clientId])).rows[0];
  if (!client) throw new Error('The Edens Edge client is not on the live database.');
  const cvRow = (await q(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId])).rows[0];
  let cv = { ...clientValuesTemplate(), ...JSON.parse(cvRow.content) };
  if (!cv.emergency_callouts) {
    const { rows } = await q(`SELECT value FROM client_fields WHERE client_id=$1 AND field_key='emergency_callouts' AND status='filled'`, [clientId]);
    const v = rows.length ? rows[0].value : null;
    if (v != null) cv.emergency_callouts = typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : (v.value || v.text || v.label || JSON.stringify(v));
  }
  const silent = { log() {}, info() {}, warn() {}, error() {} };
  const svc = createFilloutService({ pool: ro, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: silent });
  const store = createPageMapStore({ pool: ro, filloutService: svc });
  const rows = (await store.saved(clientId)).filter(r => r.applies !== false);
  const st = await store.state(clientId);
  const hand = await inputsFor(svc, clientId, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
  const stem = require('../ui/library').stemFor(client.niche_key) || 'landscaper';
  const niche = { ...readJson(path.join(root, `niche-library/${stem}.json`)), service_words: [] };
  const v3 = contextFromPageMap({ rows, hand: { baseTown: hand.baseTown, otherTowns: hand.otherTowns }, cv, niche });
  const dRows = (await q(`SELECT id, content, metadata FROM client_assets WHERE client_id = $1 AND asset_type = 'geo_dossier' AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean) ORDER BY uploaded_at DESC`, [clientId])).rows;
  const seen = new Set(), dossiers = [];
  for (const r of dRows) { const loc = (r.metadata && r.metadata.location_name) || ''; const k = normLoc(loc); if (!loc || seen.has(k)) continue; seen.add(k); dossiers.push({ id: r.id, text: r.content, locationName: loc }); }
  const primary = dossiers.find(d => normLoc(d.locationName) === normLoc(v3.keyValueMap.biz_area_1));
  if (primary && !cv.coastal_city) { const { coastal } = parseDossier(primary.text); if (coastal) cv = { ...cv, coastal_city: coastal }; }
  const allocRow = (await q(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='allocation' ORDER BY uploaded_at DESC LIMIT 1`, [clientId])).rows[0];
  const allocationRecord = allocRow ? JSON.parse(allocRow.content) : { version: 1, pages: {} };
  const packs = calibrationPacks.loadAll({ log() {} });
  const tradeName = calibrationPacks.tradeNameFor(client.trade) || 'Landscaper Gardener';
  const calibrationPack = { name: tradeName, text: packs[tradeName] || '' };
  if (!calibrationPack.text) throw new Error(`No calibration pack for ${tradeName}`);
  const packName = P.packNameFor(client.niche_key && client.niche_key !== 'other' ? client.niche_key : client.trade);
  const tf = createTradeFactsService({ pool: ro });
  const status = packName ? await tf.status(packName) : { exists: false };
  const gate = await tf.serviceGate(packName);
  return {
    client, cv, niche, rows, ctx: { ...v3, cv, keyValueMap: v3.keyValueMap, serviceParentMap: v3.serviceParentMap, v20TestMode: !!client.v20_test_mode }, store, dossiers, primary, allocationRecord, calibrationPack,
    tradeFactsCategory: packName && status.exists ? { niche: packName, file: status.file, verified: !!status.verified } : null,
    tradeFactsService: gate.ok ? { niche: gate.niche, file: gate.file, verified: true } : { niche: gate.niche, file: gate.file, verified: false, reason: gate.reason, message: gate.message },
    reviews: Array.isArray(cv.hand_reviews) ? cv.hand_reviews : [],
    saveAllocation: async () => {},
  };
}

// One saved allocation call for a page that has none: frozen with the page, kept off the live record
const allocate = args => A.runAllocation({ ...args, callModel: async (system, message) => {
  const r = await anthropic.messages.create({ model: A.ALLOCATION_MODEL, max_tokens: 2048, system, messages: [{ role: 'user', content: message }] });
  return r.content.map(c => c.text || '').join('');
} });

// The homepage's decisions as the live route makes them (server.js v20HomepageInputs)
async function prepareHomepage(ro, I, clientId = I.client.id) {
  const parsed = I.primary ? parseDossier(I.primary.text) : null;
  const saved = I.allocationRecord.pages && I.allocationRecord.pages.homepage;
  const flags = [];
  if (!I.primary) flags.push({ code: 'F-ALLOC', msg: 'No saved dossier for the primary city.' });
  if (I.primary && I.allocationRecord.dossier_asset_id !== I.primary.id) flags.push({ code: 'F-ALLOC', msg: 'The allocation was made from an older dossier for the primary city. Re-run the allocation pass.' });
  const homepageRow = I.ctx.pages.find(p => p.pageType === 'homepage');
  let picks = saved || null;
  if (parsed && homepageRow && ((homepageRow.assignedNeighbourhoods || []).length || Object.keys(homepageRow.assignedSymptoms || {}).length)) {
    const applied = A.applyAssigned(saved, homepageRow, parsed);
    picks = applied.allocation; flags.push(...applied.flags);
  }
  const allocationData = picks && parsed ? A.resolveAllocatedItems(picks, parsed) : null;
  const faq = createFaqService({ pool: ro, loadContext: async () => ({ ...I.ctx, trade: I.client.trade }), loadNiche: () => ({ niche: I.niche, error: null }), perplexity: {}, jobs: {}, callSortModel: async () => { throw new Error('not used'); } });
  const { faqResearch } = await faq.homepageFaq(clientId, { ...I.ctx, trade: I.client.trade }, I.niche);
  const decisionsResult = computeDecisions({ cv: I.cv, niche: I.niche, pages: I.ctx.pages, keyValueMap: I.ctx.keyValueMap, serviceParentMap: I.ctx.serviceParentMap, v20TestMode: I.ctx.v20TestMode, allocationData, faqResearch, cardServices: I.ctx.cardServices || null });
  return { decisionsResult, extraFlags: flags.map(f => ({ ...f, source: 'allocation' })), allocationSource: picks ? picks.source || 'model' : null };
}

async function prepareAll(ro, file = 'prep.json') {
  const I = await liveInputs(ro);
  const v20Store = createV20Store(ro);
  const base = { pool: ro, v20Store, generate: async () => { throw new Error('not used'); }, allocate };
  const out = {};

  out.homepage = await prepareHomepage(ro, I, CLIENT_ID);

  // Category and service: the runners' own prepare, with the live written pages as prior ideas
  const inputs = { ctx: I.ctx, niche: I.niche, rows: I.rows, dossiers: I.dossiers, allocationRecord: I.allocationRecord, calibrationPack: I.calibrationPack, reviews: I.reviews, saveAllocation: I.saveAllocation };
  const catRunner = createCategoryRunner({ ...base, loadInputs: async () => inputs });
  const catPage = I.rows.find(r => r.slug === PAGES.category.slug);
  if (!catPage) throw new Error(`${PAGES.category.slug} is not on the live page map.`);
  const catWritten = await catRunner.writtenFor(CLIENT_ID, I.rows, catPage.slug);
  const catPrep = await catRunner.prepare(CLIENT_ID, { ...inputs, tradeFacts: I.tradeFactsCategory }, catPage, catWritten);
  let catFacts = I.tradeFactsCategory;
  if (catFacts && catPrep.decisionsResult.decisions) {
    const D = catPrep.decisionsResult.decisions;
    const pack = P.packForCategory(catFacts.niche, D.category, D.cards.map(c => c.name));
    catFacts = { ...catFacts, markdown: pack.markdown, missing: pack.missing };
  }
  out.category = { decisionsResult: catPrep.decisionsResult, extraFlags: catPrep.extraFlags, tradeFacts: catFacts };

  const svcInputs = { ...inputs, tradeFacts: I.tradeFactsService };
  const svcRunner = createServiceRunner({ ...base, loadInputs: async () => svcInputs });
  const svcPage = I.rows.find(r => r.slug === PAGES.service.slug);
  if (!svcPage) throw new Error(`${PAGES.service.slug} is not on the live page map.`);
  const svcWritten = await svcRunner.writtenFor(CLIENT_ID, I.rows, svcPage.slug);
  const svcPrep = await svcRunner.prepare(CLIENT_ID, svcInputs, svcPage, svcWritten);
  out.service = { decisionsResult: svcPrep.decisionsResult, extraFlags: svcPrep.extraFlags, tradeFacts: svcPrep.tradeFacts };

  const shared = { cv: I.cv, niche: I.niche, keyValueMap: I.ctx.keyValueMap, serviceParentMap: I.ctx.serviceParentMap, calibrationPack: I.calibrationPack };
  writeJson(path.join(RAW, file), { taken: new Date().toISOString(), client: I.client, shared, pages: out });
  for (const [k, p] of Object.entries(out)) {
    const D = p.decisionsResult;
    console.log(`${k}: gates ${JSON.stringify(D.gates || [])}; H1 ${D.decisions && (D.decisions.d2_h1 || D.decisions.h1)}; decisions ${D.decisionsBlock ? D.decisionsBlock.length : 0} chars; flags ${[...(D.flags || []), ...p.extraFlags].map(f => f.code).join(', ') || 'none'}; trade facts ${p.tradeFacts ? `verified ${p.tradeFacts.verified}, ${(p.tradeFacts.markdown || '').length} chars` : 'none'}`);
  }
}

// ── One run ──────────────────────────────────────────────────────────────────
function meteredCall(defaults, sink, roleOf, apiClient = anthropic) {
  const base = makeCallModel(apiClient, defaults.model, { defaultEffort: defaults.effort });
  return async args => {
    const t0 = Date.now();
    const r = await base(args);
    // The attempt that thought until it ran out and wrote nothing: billed, and first in time
    if (r.usage.spent_attempt) { const w = r.usage.spent_attempt; sink.push({ role: `${roleOf(args)} ran out`, requested_model: w.requested_model, served_model: w.model, effort: w.effort, lowered_from: null, rate_limit_waits: 0, stop_reason: w.stop_reason, ms: null, input_tokens: w.input_tokens, output_tokens: w.output_tokens, cache_read_input_tokens: w.cache_read_input_tokens, cache_creation_input_tokens: w.cache_creation_input_tokens, raw_usage: w.raw_usage, text: '', prefix_sha: sha(args.system), message_sha: sha(args.message), system_blocks: Array.isArray(args.system) ? args.system.length : 1 }); }
    sink.push({ role: roleOf(args), requested_model: r.usage.requested_model, served_model: r.usage.model, effort: r.usage.effort, lowered_from: r.usage.lowered_from, rate_limit_waits: r.usage.rate_limit_waits, stop_reason: r.usage.stop_reason, ms: Date.now() - t0, input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens, cache_read_input_tokens: r.usage.cache_read_input_tokens, cache_creation_input_tokens: r.usage.cache_creation_input_tokens, raw_usage: r.usage.raw_usage, text: r.text, prefix_sha: sha(args.system), message_sha: sha(args.message), system_blocks: Array.isArray(args.system) ? args.system.length : 1 });
    return r;
  };
}
const roleFor = args => args.role || (typeof args.system === 'string' ? 'claims' : (args.maxTokens || 0) <= 2048 ? 'retry' : 'writer');

async function writeOne(page, setupKey, prep) {
  const s = ALL_SETUPS[setupKey];
  const { shared } = prep;
  const P0 = prep.pages[page];
  const calls = [];
  const callModel = meteredCall(s, calls, roleFor);
  const modelConfig = { model: s.model, effort: s.effort, block_rewrite: s.block_rewrite };
  const common = { cv: structuredClone(shared.cv), niche: structuredClone(shared.niche), keyValueMap: shared.keyValueMap, serviceParentMap: shared.serviceParentMap, decisionsResult: structuredClone(P0.decisionsResult), calibrationPack: shared.calibrationPack.text, calibrationPackName: shared.calibrationPack.name, extraFlags: structuredClone(P0.extraFlags), callModel, modelConfig };
  const t0 = Date.now();
  let record;
  if (page === 'homepage') record = await G.generateV20Homepage({ ...common, allocationSource: P0.allocationSource });
  if (page === 'category') record = await CG.generateCategoryPage({ ...common, tradeFacts: P0.tradeFacts });
  if (page === 'service') record = await SG.generateServicePage({ ...common, tradeFacts: P0.tradeFacts });
  const wall_ms = Date.now() - t0;
  const dir = runDir(page, setupKey);
  writeJson(path.join(dir, 'record.json'), record);
  writeJson(path.join(dir, 'calls.json'), calls);
  writeJson(path.join(dir, 'run.json'), { page, setup: setupKey, wall_ms, finished: new Date().toISOString() });
  return { wall_ms, calls };
}

function validationFor(page, record, prep) {
  const { shared } = prep;
  const P0 = prep.pages[page];
  const D = P0.decisionsResult.decisions;
  const base = { cv: shared.cv, niche: shared.niche, decisions: D, keyValueMap: shared.keyValueMap, serviceParentMap: shared.serviceParentMap, calibrationPack: shared.calibrationPack.text };
  if (page === 'homepage') return { V: G.validationContextFor(base), D };
  if (page === 'category') return { V: categoryValidationContext(G.validationContextFor({ ...base, tradeFactsText: P0.tradeFacts && P0.tradeFacts.verified ? P0.tradeFacts.markdown || '' : '' }), D), D };
  return { V: serviceValidationContext(G.validationContextFor({ ...base, tradeFactsText: P0.tradeFacts ? P0.tradeFacts.markdown || '' : '' }), D, { tradeFactsRows: (P0.tradeFacts && P0.tradeFacts.rows) || [] }), D };
}

// Two readings by the fixed judge, and a read only claims audit by one fixed model: the writer's own
// claims review follows the writer, so its count alone can't be compared across setups
async function judgeOne(page, setupKey, prep) {
  const dir = runDir(page, setupKey);
  const file = path.join(dir, 'judge.json');
  if (fs.existsSync(file)) return;
  const record = readJson(path.join(dir, 'record.json'));
  const { V, D } = validationFor(page, record, prep);
  const calls = [];
  const callJudge = meteredCall(JUDGE, calls, () => 'judge');
  const readings = [];
  for (let i = 0; i < 2; i++) readings.push(await Q.reviewPage({ record, V, D, cv: prep.shared.cv, niche: prep.shared.niche, callModel: callJudge, judge: JUDGE }));
  const auditCalls = [];
  const callAudit = meteredCall({ model: SONNET, effort: 'medium' }, auditCalls, () => 'claims audit');
  const audit = await runClaimsReview(record, factsFromRecord(record), callAudit).catch(e => ({ error: e.message, findings: [] }));
  writeJson(file, { readings, audit, calls, auditCalls });
}

// ── Metrics ──────────────────────────────────────────────────────────────────
const sum = (a, k) => a.reduce((s, c) => s + (c[k] || 0), 0);
async function countText(model, text) {
  if (!text) return 0;
  const r = await anthropic.post('/v1/messages/count_tokens', { body: { model, messages: [{ role: 'user', content: text }] } });
  return Math.max(0, r.input_tokens - 8);
}
async function thinkingFor(call) {
  const raw = call.raw_usage || {};
  const reported = raw.thinking_tokens != null ? raw.thinking_tokens : raw.output_tokens_details && raw.output_tokens_details.thinking_tokens;
  if (reported != null) return { thinking: reported, reported: true };
  const text = await countText(call.requested_model, call.text).catch(() => null);
  return text == null ? { thinking: null, reported: false } : { thinking: Math.max(0, call.output_tokens - text), reported: false };
}
async function mapLimit(items, limit, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const n = i++; out[n] = await fn(items[n], n); } }));
  return out;
}
async function metricsFor(page, setupKey) {
  const dir = runDir(page, setupKey);
  const record = readJson(path.join(dir, 'record.json'));
  const calls = readJson(path.join(dir, 'calls.json'));
  const run = readJson(path.join(dir, 'run.json'));
  const judge = fs.existsSync(path.join(dir, 'judge.json')) ? readJson(path.join(dir, 'judge.json')) : null;
  const metricsCache = path.join(dir, 'thinking.json');
  let think;
  if (fs.existsSync(metricsCache)) think = readJson(metricsCache);
  else { think = await mapLimit(calls, 4, thinkingFor); writeJson(metricsCache, think); }
  const billed = calls.reduce((s, c) => s + costOf(c.served_model, c), 0);
  const writer = calls.find(c => c.role === 'writer');
  const first = calls.find(c => /^writer/.test(c.role));
  // A first call that started after another setup had warmed the cache read what it would normally have written
  const coldExtra = first && first.cache_read_input_tokens ? first.cache_read_input_tokens * (ratesFor(first.served_model, first)[3] - ratesFor(first.served_model, first)[2]) / 1e6 : 0;
  const ranOut = calls.filter(c => / ran out$/.test(c.role));
  const V = record.VALIDATION || {};
  const rounds = new Set((V.retries || []).map(x => String(x.round) + (x.source === 'claims' ? ' claims' : '')));
  const scores = judge ? judge.readings.map(r => r.score).filter(x => x != null) : [];
  const judgeCost = judge ? [...judge.calls, ...judge.auditCalls].reduce((s, c) => s + costOf(c.served_model, c), 0) : 0;
  const reading = judge ? judge.readings[0] : null;
  const failedCounts = judge ? judge.readings.map(r => r.failed.length) : [];
  return {
    page, setup: setupKey, setup_label: ALL_SETUPS[setupKey].label,
    tokens: { input: sum(calls, 'input_tokens'), output: sum(calls, 'output_tokens'), thinking: think.some(t => t.thinking == null) ? null : think.reduce((s, t) => s + t.thinking, 0), thinking_reported: think.every(t => t.reported), cache_read: sum(calls, 'cache_read_input_tokens'), cache_write: sum(calls, 'cache_creation_input_tokens') },
    calls: { total: calls.length, writer: calls.filter(c => c.role === 'writer').length, retry: calls.filter(c => c.role === 'retry').length, claims: calls.filter(c => c.role === 'claims').length, sonnet_rewrites: calls.filter(c => c.role === 'retry' && c.requested_model === SONNET && ALL_SETUPS[setupKey].model !== SONNET).length },
    retry_rounds: rounds.size, retries_kept: (V.retries || []).filter(x => x.kept).length,
    block_before: record.meta.first_draft_validation ? record.meta.first_draft_validation.block : null, block_after: V.block, flag_before: record.meta.first_draft_validation ? record.meta.first_draft_validation.flag : null, flag_after: V.flag,
    block_codes: (V.issues || []).filter(i => i.type === 'BLOCK').map(i => i.check),
    model_flags: (record.FLAGS || []).map(f => f.code),
    claims_open_writer: record.CLAIMS ? (record.CLAIMS.findings || []).length : null, claims_status: record.CLAIMS ? record.CLAIMS.status : null,
    claims_open_audit: judge ? (judge.audit.error ? null : judge.audit.findings.length) : null,
    judge_score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, judge_readings: scores,
    judge_failed: failedCounts, verdict: reading ? reading.verdict.label : null, edit_list: reading ? (reading.edit_list || []).length : null, judge_failed_ids: reading ? reading.failed : [],
    wall_s: run.wall_ms / 1000, rate_limit_waits: sum(calls, 'rate_limit_waits'), effort_lowered: calls.filter(c => c.lowered_from).length, writer_lowered: calls.some(c => c.role === 'writer' && c.lowered_from), writer_effort: writer ? writer.effort : null, ran_out: ranOut.map(c => ({ role: c.role, effort: c.effort, output_tokens: c.output_tokens, usd: costOf(c.served_model, c) })), served_models: [...new Set(calls.map(c => c.served_model))], truncated: calls.filter(c => c.stop_reason === 'max_tokens' && !/ ran out$/.test(c.role)).length,
    usd_billed: billed, usd: billed + coldExtra, gbp: (billed + coldExtra) * USD_TO_GBP, usd_judge_and_audit: judgeCost,
    max_prompt_tokens: Math.max(...calls.map(promptTokens)),
    caching: writer ? { writer_input: writer.input_tokens, writer_read: writer.cache_read_input_tokens, writer_write: writer.cache_creation_input_tokens, retry_read: sum(calls.filter(c => c.role === 'retry'), 'cache_read_input_tokens'), retry_write: sum(calls.filter(c => c.role === 'retry'), 'cache_creation_input_tokens'), retry_input: sum(calls.filter(c => c.role === 'retry'), 'input_tokens'), prefix_sha: writer.prefix_sha, message_sha: writer.message_sha } : null,
  };
}

// ── Report ───────────────────────────────────────────────────────────────────
const money = n => `$${n.toFixed(3)}`;
const gbp = n => `£${n.toFixed(3)}`;
const score = m => (m.judge_score == null ? '?' : m.judge_score.toFixed(2));
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const K = n => (n == null ? 'n/a' : n.toLocaleString('en-GB'));

function blindView(page, setupKey, prep) {
  const record = readJson(path.join(runDir(page, setupKey), 'record.json'));
  const values = (record.meta && record.meta.client_values) || {};
  const full = pageTypeOf(record).readerView(record, values);
  const cut = full.indexOf('---\n\n## Review notes');
  return (cut >= 0 ? full.slice(0, cut) : full).trimEnd() + '\n';
}

function buildReport(all, tokenCounts) {
  const L = [];
  const spreads = all.filter(m => m.judge_readings.length === 2).map(m => Math.abs(m.judge_readings[0] - m.judge_readings[1]));
  const tol = Math.max(0.25, median(spreads));
  const total = all.reduce((s, m) => s + m.usd_billed + m.usd_judge_and_audit, 0);
  L.push(`# Model and effort test: Edens Edge, ${DATE}`, '');
  L.push(`Live record "ednes edge testing", read only; nothing pushed to WordPress and no live page record written. One run per page and setup, so read small gaps as noise. Judge: ${JUDGE.model}, effort ${JUDGE.effort}, two readings per run, averaged. Total spent on the 18 runs and their judging: ${money(total)} (${gbp(total * USD_TO_GBP)}).`, '');
  const unjudged = [...new Set(all.filter(m => m.judge_score == null).map(m => m.page))];
  if (unjudged.length) L.push(`**Not finished: the judge has not read ${unjudged.join(', ')}.** The Anthropic account ran out of credit after the writers finished, so those pages have no score, verdict or audit, and no winner is called for them. Top up, then run \`node tools/model-test.js --judge\` and \`--report\`: it picks up where it stopped and keeps the blind labels.`, '');
  L.push(`Cost is the writer, the retries and the claims review, with a writer that read another setup's cache priced as a cold start; the judge and the audit are not in it. £ at ${USD_TO_GBP} to the dollar. Time is the page's wall clock with six setups running at once, without the judge.`, '');
  for (const [page, p] of Object.entries(PAGES)) {
    const rows = all.filter(m => m.page === page);
    L.push(`## ${p.label}`, '');
    L.push('| Setup | Cost | £ | Time | Retry rounds (calls) | BLOCKs before → after | Flags before → after | Judge score (readings) | Verdict |', '|---|---|---|---|---|---|---|---|---|');
    for (const m of rows) L.push(`| ${m.setup}: ${m.setup_label} | ${money(m.usd)} | ${gbp(m.gbp)} | ${Math.round(m.wall_s)}s | ${m.retry_rounds} (${m.calls.retry}${m.calls.sonnet_rewrites ? `, ${m.calls.sonnet_rewrites} by Sonnet` : ''}) | ${m.block_before} → ${m.block_after} | ${m.flag_before} → ${m.flag_after} | ${score(m)} (${m.judge_readings.map(x => x.toFixed(1)).join(', ')}) | ${m.verdict || '?'} |`);
    L.push('');
    L.push('| Setup | Input | Output | Thinking | Cache read | Cache write | Largest prompt | Claims left (own review / fixed audit) | Billed |', '|---|---|---|---|---|---|---|---|---|');
    for (const m of rows) L.push(`| ${m.setup} | ${K(m.tokens.input)} | ${K(m.tokens.output)} | ${K(m.tokens.thinking)} | ${K(m.tokens.cache_read)} | ${K(m.tokens.cache_write)} | ${K(m.max_prompt_tokens)} | ${m.claims_open_writer == null ? '?' : m.claims_open_writer} / ${m.claims_open_audit == null ? '?' : m.claims_open_audit} | ${money(m.usd_billed)} |`);
    L.push('');
    for (const m of rows.filter(x => x.ran_out.length)) L.push(`${m.setup}: ${m.ran_out.map(w => `a ${w.role.replace(' ran out', '')} call at ${w.effort} thought through all ${K(w.output_tokens)} tokens and wrote nothing (${money(w.usd)}, in the cost)`).join('; ')}. anthropic-call.js then repeats that call at low${m.writer_lowered ? ', so the first draft on this page was written at low, not at the setup\'s effort' : ''}.`, '');
    const left = rows.filter(m => m.block_after > 0);
    if (left.length) L.push(`BLOCKs left: ${left.map(m => `${m.setup}: ${m.block_codes.join(', ')}`).join('; ')}.`, '');
  }
  L.push('## Cheapest setup that matches A', '');
  L.push(`A match is BLOCKs after retries no higher than A's and a judge score no more than ${tol.toFixed(2)} below A's. That margin is fixed in code as the larger of 0.25 and the median gap between the two readings of one page (${median(spreads).toFixed(2)} here).`, '');
  L.push('| Page type | A: cost, BLOCKs, score, verdict | Cheapest match | Its cost, BLOCKs, score, verdict | Saving on A | Also at or above A with no margin |', '|---|---|---|---|---|---|');
  for (const [page, p] of Object.entries(PAGES)) {
    const rows = all.filter(m => m.page === page);
    const a = rows.find(m => m.setup === 'A');
    const ok = rows.filter(m => m.judge_score != null && m.block_after <= a.block_after && m.judge_score >= a.judge_score - tol).sort((x, y) => x.usd - y.usd);
    const strict = rows.filter(m => m.judge_score != null && m.block_after <= a.block_after && m.judge_score >= a.judge_score).sort((x, y) => x.usd - y.usd);
    if (a.judge_score == null) { L.push(`| ${page} | ${money(a.usd)}, ${a.block_after}, not judged | not decided: the judge has not read this page | | | |`); continue; }
    const w = ok[0];
    L.push(`| ${page} | ${money(a.usd)}, ${a.block_after}, ${score(a)}, ${a.verdict} | ${w.setup}: ${w.setup_label} | ${money(w.usd)}, ${w.block_after}, ${score(w)}, ${w.verdict} | ${Math.round((1 - w.usd / a.usd) * 100)}% | ${strict.map(m => m.setup).join(', ')} |`);
  }
  L.push('');
  L.push('## Caching', '');
  L.push('The system prompt is the core prompt then the client block, which holds the niche entry and the calibration pack, with the breakpoint at the end of the client block (and at the end of the trade facts block on category and service pages). A breakpoint caches everything before it, so a cached writer call covers the core prompt and the niche entry together.', '');
  L.push('| Page | Core + client block + facts, by count_tokens | Writer cached (write + read, by setup) | Writer uncached input | Retry calls: read, write, uncached (all setups) |', '|---|---|---|---|---|');
  for (const [page, p] of Object.entries(PAGES)) {
    const rows = all.filter(m => m.page === page && m.caching);
    L.push(`| ${page} | ${K(tokenCounts[page])} | ${rows.map(m => `${m.setup} ${K(m.caching.writer_write)}+${K(m.caching.writer_read)}`).join(', ')} | ${K(rows[0].caching.writer_input)} to ${K(Math.max(...rows.map(m => m.caching.writer_input)))} | ${K(sum(rows.map(m => m.caching), 'retry_read'))}, ${K(sum(rows.map(m => m.caching), 'retry_write'))}, ${K(sum(rows.map(m => m.caching), 'retry_input'))} |`);
    const same = new Set(rows.map(m => m.caching.prefix_sha)).size === 1 && new Set(rows.map(m => m.caching.message_sha)).size === 1;
    if (!same) L.push(`| ${page} | INPUTS DIFFERED BETWEEN SETUPS | | | |`);
  }
  L.push('');
  const over = all.filter(m => m.max_prompt_tokens > 100000);
  L.push(over.length ? `**Prompts over 100k tokens:** ${over.map(m => `${m.page} ${m.setup} (${K(m.max_prompt_tokens)})`).join(', ')}.` : `**Prompts over 100k tokens:** none; the largest was ${K(Math.max(...all.map(m => m.max_prompt_tokens)))}, so Haiku stayed on its lower rate card.`, '');
  L.push('## How to read this', '');
  L.push('- **A is not what runs live.** The brief calls A the current baseline, but page-models.json and the code before it run every page type at effort medium, which is B. The live setting is unchanged by this test.');
  L.push('- **The judge here is not the usual judge.** The code judge is claude-opus-5-5 at medium; this test used claude-sonnet-5-5 at high as the brief asks. These scores compare with each other, not with earlier rubric scores or the 8.5 bar.');
  L.push('- **Haiku at medium or high often did not write its draft at that effort.** See the notes under each page. D, E and F are what those settings really do under today\'s retry rule, not a clean reading of the effort on the label.');
  L.push('- **Claims.** The claims review runs on the writer\'s model, so a weaker writer also marks its own claims. The fixed audit is one claude-sonnet-5-5 medium reading of each finished page: it changes nothing and is the comparable figure.');
  L.push('- **Not in the totals:** one homepage check run on Haiku before the test (about $0.09) and the failed judge calls (not billed).');
  const lowered = all.filter(m => m.effort_lowered);
  const waits = all.reduce((s, m) => s + m.rate_limit_waits, 0);
  const fallback = all.filter(m => m.served_models.some(x => ![SETUPS[m.setup].model, SONNET].includes(x)));
  L.push(`- Thinking tokens: reported by the API (output_tokens_details) and already inside Output.`);
  L.push(`- Rate limits: ${waits} wait(s) of 20 seconds inside the runs${waits ? ', included in Time' : ''}.`);
  L.push(`- Effort lowered by the "ran out of tokens thinking" fallback in anthropic-call.js: ${lowered.length ? lowered.map(m => `${m.page} ${m.setup} (${m.effort_lowered} call${m.effort_lowered === 1 ? '' : 's'}${m.writer_lowered ? ', the first draft included' : ''})`).join(', ') : 'never'}.`);
  L.push(`- Answered by a fallback model after a refusal: ${fallback.length ? fallback.map(m => `${m.page} ${m.setup} (${m.served_models.join(', ')})`).join(', ') : 'never'}.`);
  L.push(`- Output cut off at max_tokens: ${all.filter(m => m.truncated).map(m => `${m.page} ${m.setup}`).join(', ') || 'never'}.`);
  return L.join('\n') + '\n';
}

function repeatReport(all) {
  const L = [];
  const failFile = path.join(RAW, 'repeat-failures.json');
  const failures = fs.existsSync(failFile) ? readJson(failFile) : [];
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const spend = all.filter(m => m.setup !== 'E' && m.setup !== 'A').reduce((s, m) => s + m.usd_billed + m.usd_judge_and_audit, 0);
  L.push(`# Repeat of Haiku 5.5 high: Edens Edge, ${DATE}`, '');
  L.push(`The same frozen inputs as the main test, written twice more by claude-haiku-5-5 at high and judged the same way (${JUDGE.model}, effort ${JUDGE.effort}, two readings, averaged). Run 1 is setup E from the main test. A is the one Sonnet 5.5 high run, for comparison. The two new runs on each page ran side by side, where the main test ran six setups at once, so compare time with care. The new runs and their judging cost ${money(spend)} (${gbp(spend * USD_TO_GBP)}).`, '');
  for (const [page, p] of Object.entries(PAGES)) {
    const rows = all.filter(m => m.page === page);
    const a = rows.find(m => m.setup === 'A');
    const runs = ['E', 'E2', 'E3'].map(k => rows.find(m => m.setup === k)).filter(Boolean);
    L.push(`## ${p.label}`, '');
    L.push('| Run | Cost | £ | Time | Retry calls | BLOCKs before → after | Flags before → after | Judge score (readings) | Verdict | Claims left, fixed audit | First draft effort |', '|---|---|---|---|---|---|---|---|---|---|---|');
    const row = (name, m) => L.push(`| ${name} | ${money(m.usd)} | ${gbp(m.gbp)} | ${Math.round(m.wall_s)}s | ${m.calls.retry} | ${m.block_before} → ${m.block_after} | ${m.flag_before} → ${m.flag_after} | ${score(m)} (${m.judge_readings.map(x => x.toFixed(1)).join(', ')}) | ${m.verdict} | ${m.claims_open_audit} | ${m.writer_effort} |`);
    runs.forEach((m, i) => row(`Haiku high, run ${i + 1}`, m));
    row('A: Sonnet high', a);
    const scores = runs.map(m => m.judge_score);
    L.push('', `Haiku high over ${runs.length} finished runs: average cost ${money(mean(runs.map(m => m.usd)))}, average score ${mean(scores).toFixed(2)}, scores from ${Math.min(...scores).toFixed(2)} to ${Math.max(...scores).toFixed(2)}, ${runs.filter(m => m.block_after <= a.block_after && m.judge_score >= a.judge_score - 0.25).length} of ${runs.length} runs match A (BLOCKs no higher, score no more than 0.25 below), ${runs.filter(m => m.verdict === 'Ready to edit').length} of ${runs.length} Ready to edit.`, '');
    const failed = failures.filter(x => x.page === page);
    if (failed.length) L.push(`**${failed.length} further attempt${failed.length === 1 ? '' : 's'} failed outright and wrote no page:** "${failed[0].error}" The first draft ran out at high, then ran out again at low, so the run stopped there. Failed attempts are not in the table or any figure here (about $0.04 each for two full calls). So Haiku high produced a page on ${runs.length} of ${runs.length + failed.length} attempts on this page, and the averages cover only the attempts that finished.`, '');
    const out = runs.filter(m => m.ran_out.length);
    if (out.length) L.push(`Calls that thought until they ran out and were repeated at low: ${runs.map((m, i) => `run ${i + 1}: ${m.ran_out.length}${m.writer_lowered ? ' (the first draft included)' : ''}`).join('; ')}. The wasted tokens are in the cost.`, '');
    const left = runs.filter(m => m.block_after > 0);
    if (left.length) L.push(`BLOCKs left: ${left.map(m => `run ${runs.indexOf(m) + 1}: ${m.block_codes.join(', ')}`).join('; ')}.`, '');
  }
  return L.join('\n') + '\n';
}

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  if (flag('--smoke')) {
    for (const [model, effort] of [[HAIKU, 'low'], [SONNET, 'low']]) {
      const call = makeCallModel(anthropic, model, { defaultEffort: effort });
      const r = await call({ system: [{ type: 'text', text: 'Answer in one word.', cache_control: { type: 'ephemeral' } }], message: 'What colour is grass?', maxTokens: 512 });
      console.log(model, JSON.stringify(r.text), JSON.stringify(r.usage));
    }
    return;
  }
  if (flag('--prep')) {
    const ro = readOnlyPool();
    try { await prepareAll(ro); } finally { await ro.pool.end(); }
    return;
  }
  const prep = readJson(path.join(RAW, 'prep.json'));
  if (flag('--sweep')) {
    const { hardChecks } = require('../validate-hard');
    const rows = readJson(path.join(RAW, 'rows.json'));
    const urls = rows.map(r => r.slug).filter(Boolean);
    const CODES = ['LABEL-LEAK', 'TRUNCATED', 'EMPTY-SECTION', 'LINK-MAP', 'RAW-VALUE', 'SECTION-REF', 'ANCHOR-FORCED'];
    const out = [];
    for (const page of Object.keys(PAGES)) for (const k of [...Object.keys(SETUPS), ...Object.keys(REPEATS)]) {
      const dir = runDir(page, k);
      const record = readJson(path.join(dir, 'record.json'));
      const calls = readJson(path.join(dir, 'calls.json'));
      const { V } = validationFor(page, record, prep);
      V.D = { ...V.D, pageMapUrls: urls };
      const issues = [];
      const issue = (type, check, field, message) => issues.push({ type, check, field, message });
      hardChecks(record, V, { issue, fields: pageTypeOf(record).modelFields(record) });
      const cut = calls.filter(c => c.stop_reason === 'max_tokens' && !/ ran out$/.test(c.role)).length;
      out.push({ page, setup: k, label: ALL_SETUPS[k].label, issues, truncated_calls: cut });
    }
    writeJson(path.join(RAW, 'sweep.json'), out);
    const L = ['# Hard BLOCK sweep over the old pages', '', 'The new checks run over the 18 main test pages and the 6 Haiku high repeats, as they were written. Nothing was rewritten. A cell is the number of fields that fail; a blank passes.', ''];
    for (const page of Object.keys(PAGES)) {
      L.push(`## ${PAGES[page].label}`, '', `| Setup | ${CODES.join(' | ')} | Cut calls in the log | Result |`, `|---|${CODES.map(() => '---').join('|')}|---|---|`);
      for (const r of out.filter(x => x.page === page)) {
        const n = c => { const x = r.issues.filter(i => i.check === c).length; return x || ''; };
        const fail = r.issues.length || r.truncated_calls;
        L.push(`| ${r.setup}: ${r.label} | ${CODES.map(n).join(' | ')} | ${r.truncated_calls || ''} | ${fail ? 'FAIL' : 'pass'} |`);
      }
      L.push('');
    }
    L.push('## Every failure', '');
    for (const r of out) if (r.issues.length) { L.push(`**${PAGES[r.page].file}, ${r.setup}**`, ''); for (const i of r.issues) L.push(`- ${i.check} · ${i.field}: ${i.message}`); L.push(''); }
    fs.writeFileSync(path.join(OUT, 'hard-block-sweep.md'), L.join('\n'));
    for (const r of out) console.log(PAGES[r.page].file.padEnd(22), r.setup.padEnd(3), r.issues.length ? CODES.map(c => { const x = r.issues.filter(i => i.check === c).length; return x ? `${c}:${x}` : ''; }).filter(Boolean).join(' ') : 'pass', r.truncated_calls ? `cut calls:${r.truncated_calls}` : '');
    return;
  }
  if (flag('--repeats')) {
    for (const page of Object.keys(PAGES)) {
      const todo = Object.keys(REPEATS).filter(k => !fs.existsSync(path.join(runDir(page, k), 'run.json')));
      if (!todo.length) continue;
      console.log(`${new Date().toISOString().slice(11, 19)} ${page}: ${todo.join(', ')} starting together`);
      await Promise.all(todo.map(async k => {
        try { const { wall_ms, calls } = await writeOne(page, k, prep); console.log(`${new Date().toISOString().slice(11, 19)} ${page} ${k}: done in ${Math.round(wall_ms / 1000)}s, ${calls.length} calls`); }
        catch (e) {
          console.log(`${page} ${k}: FAILED ${e.status || ''} ${e.message}`);
          const f = path.join(RAW, 'repeat-failures.json');
          writeJson(f, [...(fs.existsSync(f) ? readJson(f) : []), { page, setup: k, error: e.message, at: new Date().toISOString() }]);
        }
      }));
    }
    const done = [];
    for (const page of Object.keys(PAGES)) for (const k of Object.keys(REPEATS)) if (fs.existsSync(path.join(runDir(page, k), 'run.json'))) done.push([page, k]);
    await mapLimit(done, 6, async ([page, k]) => {
      try { await judgeOne(page, k, prep); console.log(`judged ${page} ${k}`); }
      catch (e) { console.log(`judge ${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    });
    if (done.length !== Object.keys(PAGES).length * Object.keys(REPEATS).length || done.some(([page, k]) => !fs.existsSync(path.join(runDir(page, k), 'judge.json')))) { console.log('Not all repeats are written and judged: run again to resume.'); if (!flag('--allow-missing')) return; }
    const all = [];
    for (const page of Object.keys(PAGES)) for (const k of ['A', 'E', ...Object.keys(REPEATS)]) if (fs.existsSync(path.join(runDir(page, k), 'judge.json'))) all.push(await metricsFor(page, k));
    const dir = path.join(OUT, 'repeat-haiku-high');
    fs.mkdirSync(dir, { recursive: true });
    writeJson(path.join(dir, 'metrics.json'), all.filter(m => m.setup !== 'A'));
    fs.writeFileSync(path.join(dir, `REPORT_repeat_haiku_high_${DATE}.md`), repeatReport(all));
    for (const page of Object.keys(PAGES)) Object.keys(REPEATS).forEach((k, i) => fs.existsSync(path.join(runDir(page, k), 'judge.json')) && fs.writeFileSync(path.join(dir, `${PAGES[page].file}_repeat${i + 1}.md`), blindView(page, k, prep)));
    console.log(`Written to ${path.relative(root, dir)}.`);
    return;
  }
  if (flag('--run')) {
    const only = arg('--only') ? arg('--only').split(',') : null;
    const maxUsd = parseFloat(arg('--max-usd') || '40');
    let spent = 0;
    for (const page of Object.keys(PAGES)) {
      if (spent > maxUsd) { console.log(`Stopped: $${spent.toFixed(2)} spent, the limit is $${maxUsd}.`); break; }
      const todo = Object.keys(SETUPS).filter(k => (!only || only.includes(`${page}:${k}`)) && !fs.existsSync(path.join(runDir(page, k), 'run.json')));
      if (!todo.length) continue;
      console.log(`${new Date().toISOString().slice(11, 19)} ${page}: ${todo.join(', ')} starting together`);
      await Promise.all(todo.map(async k => {
        try {
          const { wall_ms, calls } = await writeOne(page, k, prep);
          const c = calls.reduce((s, x) => s + costOf(x.served_model, x), 0);
          spent += c;
          console.log(`${new Date().toISOString().slice(11, 19)} ${page} ${k}: done in ${Math.round(wall_ms / 1000)}s, ${calls.length} calls`);
        } catch (e) { console.log(`${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
      }));
    }
    console.log(`Writers finished, $${spent.toFixed(2)} this pass.`);
    return;
  }
  if (flag('--judge')) {
    const todo = [];
    for (const page of Object.keys(PAGES)) for (const k of Object.keys(SETUPS)) if (fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await mapLimit(todo, 6, async ([page, k]) => {
      try { await judgeOne(page, k, prep); console.log(`judged ${page} ${k}`); }
      catch (e) { console.log(`judge ${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    });
    return;
  }
  if (flag('--report')) {
    const all = [];
    for (const page of Object.keys(PAGES)) for (const k of Object.keys(SETUPS)) all.push(await metricsFor(page, k));
    const tokenCounts = {};
    for (const page of Object.keys(PAGES)) {
      const calls = readJson(path.join(runDir(page, 'A'), 'calls.json'));
      const w = calls.find(c => c.role === 'writer');
      tokenCounts[page] = w.cache_read_input_tokens + w.cache_creation_input_tokens;
    }
    fs.mkdirSync(path.join(OUT, 'reader-views'), { recursive: true });
    writeJson(path.join(OUT, 'metrics.json'), all);
    fs.writeFileSync(path.join(OUT, `REPORT_model_test_${DATE}.md`), buildReport(all, tokenCounts));
    const keyFile = path.join(OUT, 'KEY_model_test.md');
    const mapFile = path.join(RAW, 'blind-map.json');
    let map;
    if (fs.existsSync(mapFile)) map = readJson(mapFile);
    else {
      map = {};
      for (const page of Object.keys(PAGES)) {
        const order = Object.keys(SETUPS);
        for (let i = order.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
        map[page] = order;
      }
      writeJson(mapFile, map);
    }
    // Written together in run order, so neither the names nor the file times follow the setups
    const K_ = [`# Key: model and effort test, ${DATE}`, '', 'Open this after comparing the copy.', ''];
    for (const [page, order] of Object.entries(map)) {
      K_.push(`## ${PAGES[page].label}`, '', '| Reader view | Setup |', '|---|---|');
      order.forEach((k, i) => {
        const name = `${PAGES[page].file}_run${i + 1}.md`;
        fs.writeFileSync(path.join(OUT, 'reader-views', name), blindView(page, k, prep));
        K_.push(`| ${name} | ${k}: ${SETUPS[k].label} |`);
      });
      K_.push('');
    }
    fs.writeFileSync(keyFile, K_.join('\n'));
    console.log(`Report and ${Object.keys(map).length * 6} reader views written to ${path.relative(root, OUT)}.`);
    return;
  }
  console.log('Pass --smoke, --prep, --run, --judge or --report.');
}

module.exports = { RAW, OUT, CLIENT_ID, SONNET, HAIKU, PAGES, SETUPS, ALL_SETUPS, JUDGE, USD_TO_GBP, readJson, writeJson, runDir, costOf, mapLimit, money, gbp, score, meteredCall, roleFor, writeOne, judgeOne, metricsFor, blindView, readOnlyPool, liveInputs, allocate, prepareAll, prepareHomepage };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
