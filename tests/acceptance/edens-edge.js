'use strict';
// Brief §7 acceptance test, live and end to end: allocation pass → decisions →
// generation → validation and retries → reader view. Uses the real Southampton
// dossier and Edens Edge's real page map and GBP sheets, with the §7 client values.
// Costs about 70p in API calls. Run: npm run test:acceptance
// Writes the brief's four outputs (DECISIONS block, raw model output, VALIDATION,
// reader view) plus the record and the table to tests/acceptance/output/edens-edge/.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { buildReaderView, buildJsonDownload } = require(path.join(root, 'v20-reader.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const real = require(path.join(root, 'tests/fixtures/data/edens-edge-real.js'));
const spec = require('./edens-edge-spec');

const OUT = path.join(__dirname, 'output/edens-edge');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const usage = { calls: 0, input: 0, output: 0, cache_read: 0, cache_write: 0 };

async function call({ system, message, maxTokens }) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await client.messages.create({ model: G.V20_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: message }] });
      usage.calls++; usage.input += r.usage.input_tokens; usage.output += r.usage.output_tokens;
      usage.cache_read += r.usage.cache_read_input_tokens || 0; usage.cache_write += r.usage.cache_creation_input_tokens || 0;
      return { text: r.content.map(c => c.text || '').join(''), usage: { ...r.usage, stop_reason: r.stop_reason } };
    } catch (e) {
      if (e.status === 429 && attempt < 3) { await new Promise(r => setTimeout(r, 20000)); continue; }
      throw e;
    }
  }
}

(async () => {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const cv = spec.cv;
  const dossierText = fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8');

  // 1. Allocation pass (live)
  const alloc = await A.runAllocation({
    dossierText, cv, niche: landscaper, keyValueMap: real.keyValueMap, pages: real.pages,
    callModel: async (system, message) => (await call({ system, message, maxTokens: 2048 })).text,
  });
  const parsed = parseDossier(dossierText);
  const allocationData = A.resolveAllocatedItems(alloc, parsed);

  // 2. Decisions
  const DR = computeDecisions({ cv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData });
  if (DR.gates.length) { console.error('GATES:', DR.gates); process.exit(1); }
  const rows = spec.checkDecisions(DR);

  // 3. Generation, validation and retries
  const record = await G.generateV20Homepage({
    cv, niche: landscaper, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, decisionsResult: DR,
    calibrationPack: fs.readFileSync(path.join(root, 'Landscaper_Calibration_Pack_v4.md'), 'utf8'), calibrationPackName: 'Landscaper Gardener',
    allocationSource: 'model', callModel: call,
  });

  // 4. Outputs
  const V = record.VALIDATION;
  fs.writeFileSync(path.join(OUT, '1-decisions-block.txt'), DR.decisionsBlock + '\n');
  fs.writeFileSync(path.join(OUT, '2-raw-model-output.txt'), (record.meta.raw_output || '') + '\n');
  fs.writeFileSync(path.join(OUT, '3-validation.txt'), [
    `First draft: ${record.meta.first_draft_validation.block} BLOCK, ${record.meta.first_draft_validation.flag} FLAG`,
    `After retries: ${V.block} BLOCK, ${V.flag} FLAG (${V.retries.length} retries, ${V.retries.filter(r => r.kept).length} kept)`, '',
    ...V.issues.map(i => `${i.type} ${i.check} · ${i.field}: ${i.message}`), '',
    'Retries:', ...V.retries.map(r => `R${r.round} ${r.kept ? 'kept' : 'not kept'} ${r.field}${r.error ? ` (${r.error})` : ''}: ${r.problems.join(' | ')}`),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, '4-reader-view.md'), buildReaderView(record, record.meta.client_values));
  fs.writeFileSync(path.join(OUT, 'record.json'), buildJsonDownload(record));
  fs.writeFileSync(path.join(OUT, 'acceptance-table.txt'), spec.formatRows(rows) + '\n');

  const cost = (usage.input * 3 + usage.cache_write * 3.75 + usage.cache_read * 0.3 + usage.output * 15) / 1e6;
  console.log(spec.formatRows(rows));
  console.log(`\nAllocation: ${alloc.neighbourhoods.map(id => (parsed.neighbourhoods.find(n => n.id === id) || {}).name).join(' + ')}; faq_B = "${(parsed.symptoms.find(s => s.id === alloc.symptoms.faq_B) || {}).text || 'none'}"`);
  console.log(`Validation: first draft ${record.meta.first_draft_validation.block} BLOCK / ${record.meta.first_draft_validation.flag} FLAG → after retries ${V.block} BLOCK / ${V.flag} FLAG`);
  console.log(`Watermark: ${record.watermark || 'none'}`);
  console.log(`${usage.calls} API calls, about $${cost.toFixed(2)}, ${((Date.now() - t0) / 1000).toFixed(0)}s. Outputs in ${path.relative(root, OUT)}/`);
  const failed = rows.filter(r => !r.pass).length;
  const pass = failed === 0 && V.block === 0;
  console.log(pass ? '\nACCEPTANCE: PASS (table matches, 0 BLOCK)' : `\nACCEPTANCE: FAIL (${failed} table row(s) failed, ${V.block} BLOCK)`);
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
