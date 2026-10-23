'use strict';

// ── The GBP job: description, then services, then products ─────────────────
// Each step is one prompt file (prompts/GBP_*_CORE.md) as the system prompt and a
// message that gbp/inputs.js builds. After each step the validator runs
// (gbp/validator.js): a step that fails runs once more with the failures in the
// message, and if it still fails the step is marked failed with its reasons and
// nothing from it is saved. The next run resumes from the first step not done,
// as the page generator does with its batches.
//
// The record: { version, started_at, updated_at, model, steps: { description, services,
// products } }. A done step: { status: 'done', at, output, validation: { flags, counts },
// attempts, usage }. A failed step: { status: 'failed', at, error, fails, flags, attempts }.

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { extractJsonObject } = require('../json-extract');
const V = require('./validator');
const { descriptionMessage, servicesMessage, productsMessage } = require('./inputs');

const GBP_MODEL = 'claude-sonnet-5-5';
const PROMPTS = {
  description: 'GBP_Description_CORE.md',
  services: 'GBP_Services_CORE.md',
  products: 'GBP_Products_CORE.md',
};
const STEPS = ['description', 'services', 'products'];
const MAX_TOKENS = { description: 2048, services: 12000, products: 12000 };
const PRODUCT_BATCH = 8;

function loadPrompt(step) {
  return fs.readFileSync(path.join(__dirname, '..', 'prompts', PROMPTS[step]), 'utf8').trim();
}

function emptyRecord() {
  return { version: 1, started_at: new Date().toISOString(), updated_at: null, model: GBP_MODEL, steps: { description: null, services: null, products: null } };
}

const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
const addUsage = (a, b) => {
  if (!b) return a;
  const o = a || { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, calls: 0 };
  for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) o[k] += b[k] || 0;
  o.calls += 1;
  return o;
};

// One call, parsed and validated; a failing answer gets one more call with its failures
async function callAndCheck({ step, system, message, callModel, parse, validate, log }) {
  let msg = message;
  let usage = null;
  let last = null;
  const attemptLog = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { text, usage: u } = await callModel({ system: [{ type: 'text', text: system }], message: msg, maxTokens: MAX_TOKENS[step] });
    usage = addUsage(usage, u);
    let output, parseError = null;
    try { output = parse(extractJsonObject(text)); } catch (e) { parseError = e.message; }
    const validation = parseError ? { ok: false, fails: [{ level: 'FAIL', rule: 'parse', field: step, message: `The reply was not the JSON the prompt asks for (${parseError}).` }], flags: [], counts: {} } : validate(output);
    attemptLog.push({ attempt, fails: validation.fails.map(f => f.message) });
    last = { output, validation, raw: text, attempts: attempt, attemptLog };
    if (validation.ok) return { ...last, usage };
    if (log) log(`[gbp] ${step}: attempt ${attempt} failed ${validation.fails.length} check(s)`);
    if (attempt === 2) break;
    msg = `${message}\n\nYOUR PREVIOUS ANSWER FAILED THESE CHECKS. Write the whole answer again as the same JSON, fixing every one:\n${validation.fails.map(f => `- ${f.message}`).join('\n')}\n\nPREVIOUS ANSWER:\n${String(text).slice(0, 24000)}`;
  }
  return { ...last, usage };
}

const str = v => (v == null ? '' : String(v)).trim();

function parseDescription(j) { return { description: str(j.description) }; }
function parseServices(j) {
  const list = Array.isArray(j.services) ? j.services : [];
  return { services: list.map(s => ({ category: str(s.category), service: str(s.service), type: str(s.type).toUpperCase(), description: str(s.description) })) };
}
function parseProducts(j) {
  const list = Array.isArray(j.products) ? j.products : [];
  return { products: list.map(p => ({ service: str(p.service), title: str(p.title), description: str(p.description) })) };
}

// Attach what code decides: URLs for locked services, category and URL for products
function finishServices(services, I) {
  const urlOf = new Map(I.locked.map(l => [norm(l.service), l.url]));
  return services.map(s => ({ ...s, url: s.type === 'LOCKED' ? urlOf.get(norm(s.service)) || '' : '' }));
}
function finishProducts(products, I, categoryOf) {
  const byName = new Map(I.locked.map(l => [norm(l.service), l]));
  return products.map(p => { const l = byName.get(norm(p.service)); return { ...p, category: categoryOf(p.service) || (l && l.category) || '', url: l ? l.url : '' }; });
}

async function runDescription({ I, callModel, log }) {
  return callAndCheck({ step: 'description', system: loadPrompt('description'), message: descriptionMessage(I), callModel, parse: parseDescription, validate: o => V.validateDescription(o.description, I.validatorCtx), log });
}

async function runServices({ I, callModel, log }) {
  const r = await callAndCheck({ step: 'services', system: loadPrompt('services'), message: servicesMessage(I), callModel, parse: parseServices, validate: o => V.validateServices(o.services, I.validatorCtx), log });
  if (r.validation.ok) r.output = { services: finishServices(r.output.services, I) };
  return r;
}

// Products: batches of PRODUCT_BATCH services, each call checked on its own; then the whole set
// partial: products from batches that passed before an earlier run failed (kept on the failed step)
async function runProducts({ I, services, callModel, log, partial = [] }) {
  const catOf = new Map(services.map(s => [norm(s.service), s.category]));
  const descOf = new Map(services.map(s => [norm(s.service), s.description]));
  const categoryOf = name => catOf.get(norm(name)) || '';
  const locked = I.locked.map(l => ({ ...l, gbpDescription: descOf.get(norm(l.service)) || '' }));
  const system = loadPrompt('products');
  const all = [...partial];
  const have = new Set(all.map(p => norm(p.service)));
  const todo = locked.filter(l => !have.has(norm(l.service)));
  let usage = null, attempts = 0;
  const raws = [];
  const attemptLog = [];
  for (let i = 0; i < todo.length; i += PRODUCT_BATCH) {
    const batch = todo.slice(i, i + PRODUCT_BATCH);
    const ctx = { ...I.validatorCtx, locked: batch.map(l => ({ category: l.category, service: l.service })) };
    const r = await callAndCheck({ step: 'products', system, message: productsMessage(I, batch, categoryOf), callModel, parse: parseProducts, validate: o => V.validateProducts(o.products, ctx), log });
    usage = r.usage ? { ...(usage || {}), ...mergeUsage(usage, r.usage) } : usage;
    attempts += r.attempts;
    raws.push(r.raw);
    attemptLog.push(...r.attemptLog.map(a => ({ ...a, batch: `${batch[0].service} to ${batch[batch.length - 1].service}` })));
    if (!r.validation.ok) return { output: null, validation: r.validation, raw: raws.join('\n\n'), attempts, usage, attemptLog, partial: all, batch: { from: all.length + 1, to: all.length + batch.length, of: locked.length } };
    all.push(...r.output.products);
  }
  const validation = V.validateProducts(all, I.validatorCtx);
  return { output: validation.ok ? { products: finishProducts(all, I, categoryOf) } : null, validation, raw: raws.join('\n\n'), attempts, usage, attemptLog };
}
function mergeUsage(a, b) {
  if (!a) return b;
  const o = { ...a };
  for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'calls']) o[k] = (a[k] || 0) + (b[k] || 0);
  return o;
}

// Run every step not yet done, in order; stop at the first failure
async function runGbp({ inputs: I, record = null, callModel, log = null }) {
  const rec = record && record.steps ? record : emptyRecord();
  let failedStep = null;
  for (const step of STEPS) {
    const prev = rec.steps[step];
    if (prev && prev.status === 'done') continue;
    const runner = step === 'description' ? runDescription : step === 'services' ? runServices : runProducts;
    const r = await runner({ I, services: step === 'products' ? rec.steps.services.output.services : null, callModel, log, partial: (prev && prev.partial) || [] });
    const at = new Date().toISOString();
    if (r.validation.ok) {
      rec.steps[step] = { status: 'done', at, output: r.output, validation: { flags: r.validation.flags, counts: r.validation.counts }, attempts: r.attempts, attempt_log: r.attemptLog, usage: r.usage, raw: r.raw };
    } else {
      // A failed products step keeps the batches that passed (partial), so the next run picks up at the failed batch
      rec.steps[step] = { status: 'failed', at, error: `The ${step} step failed ${r.validation.fails.length} check(s)${r.attempts > 1 ? ' after a retry' : ''}${r.batch ? ` (services ${r.batch.from} to ${r.batch.to} of ${r.batch.of}; the ${r.partial.length} before them are kept for the next run)` : ''}; nothing from it is shown.`, fails: r.validation.fails, flags: r.validation.flags, attempts: r.attempts, attempt_log: r.attemptLog, usage: r.usage, raw: r.raw, partial: r.partial || [] };
      failedStep = step;
    }
    rec.updated_at = at;
    if (failedStep) break;
  }
  rec.inputs = { name: I.name, town: I.town, locked: I.locked.length, minServices: I.minServices, competitorCount: I.competitorCount, showPrices: I.showPrices, siteUrl: I.siteUrl, flags: I.flags };
  return { record: rec, failedStep };
}

// ── The four output files ──
const done = (rec, step) => rec && rec.steps && rec.steps[step] && rec.steps[step].status === 'done' ? rec.steps[step] : null;

function filesFor(rec) {
  const files = {};
  const d = done(rec, 'description');
  if (d) files['description.txt'] = d.output.description;
  const s = done(rec, 'services');
  if (s) files['services.csv'] = Papa.unparse({ fields: ['Category', 'Service', 'Type', 'Description', 'Count', 'URL'], data: s.output.services.map(x => [x.category, x.service, x.type, x.description, V.count(x.description), x.url || '']) });
  const p = done(rec, 'products');
  if (p) files['products.csv'] = Papa.unparse({ fields: ['Title', 'Category', 'Description', 'Count', 'URL'], data: p.output.products.map(x => [x.title, x.category, x.description, V.count(x.description), x.url || '']) });
  files['validation.json'] = JSON.stringify(validationFor(rec), null, 2);
  return files;
}

function validationFor(rec) {
  const out = { generated_at: rec.updated_at || rec.started_at, model: rec.model, inputs: rec.inputs || null, steps: {} };
  for (const step of STEPS) {
    const st = rec.steps && rec.steps[step];
    out.steps[step] = !st ? { status: 'not run' } : st.status === 'done'
      ? { status: 'done', at: st.at, attempts: st.attempts, flags: st.validation.flags, counts: st.validation.counts }
      : { status: 'failed', at: st.at, attempts: st.attempts, error: st.error, fails: st.fails, flags: st.flags };
  }
  return out;
}

module.exports = { GBP_MODEL, STEPS, PROMPTS, PRODUCT_BATCH, MAX_TOKENS, loadPrompt, emptyRecord, runGbp, filesFor, validationFor, callAndCheck };
