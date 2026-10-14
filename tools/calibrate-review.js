'use strict';
// Calibration check for the copy quality reviewer (16 Oct): score a page Brandon has
// already rated, from its reader view, and compare. Judge items and score only (the
// saved reader view has no record for the code checks).
//   node tools/calibrate-review.js <reader view .md> <client: edens-edge>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const Anthropic = require('@anthropic-ai/sdk');
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const Q = require(path.join(root, 'quality-review.js'));
const { extractJsonObject } = require(path.join(root, 'json-extract.js'));
const { buildV20Request } = require(path.join(root, 'v20-generate.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));

(async () => {
  const md = fs.readFileSync(process.argv[2], 'utf8');
  const page = md.slice(0, md.indexOf('## Review notes') > 0 ? md.indexOf('## Review notes') : undefined);
  const real = require(path.join(root, 'tests/fixtures/data/edens-edge-real.js'));
  const snap = JSON.parse(fs.readFileSync(path.join(root, 'tests/live-snapshots/edens-edge.json'), 'utf8'));
  const niche = require(path.join(root, 'niche-library/landscaper.json'));
  const DR = computeDecisions({ cv: snap.cv, niche, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: snap.allocated, faqResearch: snap.faqResearch });
  const req = buildV20Request({ cv: snap.cv, niche, decisions: DR.decisions, decisionsBlock: DR.decisionsBlock, calibrationPack: '', ctx: {}, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
  const call = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), Q.REVIEW_MODEL);
  const message = ['JUDGE ITEMS:', ...Object.entries(Q.JUDGE_ITEMS).map(([id, t]) => `${id}: ${t}`), '', 'CODE RESULTS:', '(not run for this check)', '', 'FACTS ON FILE:', req.clientBlock, '', 'PAGE:', page].join('\n');
  const r = await call({ system: Q.loadReviewPrompt(), message, maxTokens: 16000 });
  const j = extractJsonObject(r.text);
  console.log(`Score: ${j.score}`);
  for (const i of j.items || []) if (!i.pass) console.log(`FAIL ${i.id}: "${i.quote}" ${i.why}`);
})().catch(e => { console.error(e); process.exit(1); });
