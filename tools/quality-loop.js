'use strict';
// ── Copy quality loop, local (16 Oct) ────────────────────────────────────────
// Generates a v20 homepage with the real API (as the live app does), then scores
// it against docs/seo/COPY_QUALITY_RUBRIC.md (quality-review.js).
//
//   node tools/quality-loop.js edens-edge            generate + review
//   node tools/quality-loop.js kestrel-rich          generate + review
//   node tools/quality-loop.js kestrel-thin          generate + review
//   node tools/quality-loop.js <client> --review <run dir>   review a saved run again (no generation)
//
// Edens Edge: the real page map and GBP sheets (tests/fixtures/edens-edge-real/) plus the
// live client values, allocation and FAQ questions in tests/live-snapshots/edens-edge.json.
// Kestrel Ridge: the test client in tests/fixtures/data/ (not a real client: no research).
// Writes record.json, reader.md, review.txt and review.json to tests/quality-runs/<client>/<time>/.
// A generation and review costs about 70p to £1.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set in .env.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const G = require(path.join(root, 'v20-generate.js'));
const Q = require(path.join(root, 'quality-review.js'));
const { buildReaderView } = require(path.join(root, 'v20-reader.js'));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const usage = {};
// $ per million tokens: input, output (cache reads at a tenth of input, writes at 1.25x)
const PRICE = { 'claude-sonnet-4-6': [3, 15], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };

// QUALITY_GEN_MODEL tries another writer model locally (the live app uses G.V20_MODEL);
// QUALITY_GEN_EFFORT sets its effort (5.5 models only; default medium)
const GEN_MODEL = process.env.QUALITY_GEN_MODEL || G.V20_MODEL;
const GEN_EFFORT = process.env.QUALITY_GEN_EFFORT || 'medium';
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const call = makeCallModel(client, GEN_MODEL, {
  defaultEffort: GEN_EFFORT,
  onUsage: (model, r) => {
    const u = usage[model] = usage[model] || { calls: 0, input: 0, output: 0, cache_read: 0, cache_write: 0 };
    u.calls++; u.input += r.input_tokens; u.output += r.output_tokens;
    u.cache_read += r.cache_read_input_tokens || 0; u.cache_write += r.cache_creation_input_tokens || 0;
  },
});
const cost = () => Object.entries(usage).reduce((s, [m, u]) => {
  const [i, o] = PRICE[m] || [5, 25];
  return s + (u.input * i + u.cache_read * i * 0.1 + u.cache_write * i * 1.25 + u.output * o) / 1e6;
}, 0);

function inputsFor(name) {
  if (name === 'edens-edge') {
    const real = require(path.join(root, 'tests/fixtures/data/edens-edge-real.js'));
    const snap = JSON.parse(fs.readFileSync(path.join(root, 'tests/live-snapshots/edens-edge.json'), 'utf8'));
    return {
      cv: snap.cv, niche: require(path.join(root, 'niche-library/landscaper.json')),
      pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap,
      v20TestMode: snap.v20TestMode, allocationData: snap.allocated, faqResearch: snap.faqResearch,
      pack: 'Landscaper_Calibration_Pack_v4.md', packName: 'Landscaper Gardener',
    };
  }
  const file = { 'kestrel-rich': 'kestrel-ridge-rich', 'kestrel-thin': 'kestrel-ridge-thin-page' }[name];
  if (!file) throw new Error(`Unknown client "${name}": edens-edge, kestrel-rich or kestrel-thin.`);
  const d = require(path.join(root, 'tests/fixtures/data', `${file}.js`));
  return {
    cv: d.cv, niche: require(path.join(root, 'niche-library/roofer.json')),
    pages: d.pages, keyValueMap: d.keyValueMap, serviceParentMap: {},
    v20TestMode: true, allocationData: null, faqResearch: [],
    pack: 'Roofer_Calibration_Pack_v5.md', packName: 'Roofing Company',
  };
}

(async () => {
  const name = process.argv[2];
  const reviewDir = process.argv[3] === '--review' ? process.argv[4] : null;
  const I = inputsFor(name);
  const DR = computeDecisions({ cv: I.cv, niche: I.niche, pages: I.pages, keyValueMap: I.keyValueMap, serviceParentMap: I.serviceParentMap, v20TestMode: I.v20TestMode, allocationData: I.allocationData, faqResearch: I.faqResearch });
  if (DR.gates.length) { console.error('GATES:', DR.gates); process.exit(1); }
  const t0 = Date.now();
  let record, dir;
  if (reviewDir) {
    dir = reviewDir;
    record = JSON.parse(fs.readFileSync(path.join(dir, 'record.json'), 'utf8'));
  } else {
    record = await G.generateV20Homepage({
      cv: I.cv, niche: I.niche, keyValueMap: I.keyValueMap, serviceParentMap: I.serviceParentMap, decisionsResult: DR,
      calibrationPack: fs.readFileSync(path.join(root, I.pack), 'utf8'), calibrationPackName: I.packName, callModel: call, qualityReview: process.env.QUALITY_PASS !== '0',
    });
    dir = path.join(root, 'tests/quality-runs', name, record.meta.generated_at.replace(/[:.]/g, '-'));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'record.json'), JSON.stringify(record, null, 2));
    fs.writeFileSync(path.join(dir, 'decisions.txt'), DR.decisionsBlock + '\n');
  }
  const V = G.validationContextFor({ cv: I.cv, niche: I.niche, decisions: DR.decisions, keyValueMap: I.keyValueMap, serviceParentMap: I.serviceParentMap });
  const review = await Q.reviewPage({ record, V, D: DR.decisions, cv: I.cv, niche: I.niche, callModel: call });
  fs.writeFileSync(path.join(dir, 'reader.md'), buildReaderView(record, record.meta.client_values || {}));
  fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify(review, null, 2));
  const text = Q.formatReview(review);
  fs.writeFileSync(path.join(dir, 'review.txt'), `${name} · generated ${record.meta.generated_at}\n${text}\n`);
  console.log(`\n${name} · writer ${GEN_MODEL} · generated ${record.meta.generated_at} · ${Math.round((Date.now() - t0) / 1000)}s · about $${cost().toFixed(2)}`);
  console.log(text);
  console.log(`\nSaved in ${path.relative(root, dir)}`);
})().catch(e => { console.error(e); process.exit(1); });
