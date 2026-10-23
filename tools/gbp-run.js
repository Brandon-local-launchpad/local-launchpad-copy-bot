'use strict';
// ── GBP job, local real run (23 Oct) ─────────────────────────────────────────
// Runs the three GBP steps with the real API on a fixture client, as the live app
// does, and writes the four files plus the record to tests/quality-runs/gbp/<client>/<time>/.
//
//   node tools/gbp-run.js edens-edge                  the Edens Edge v3 page map and client values
//   node tools/gbp-run.js edens-edge --resume <dir>   run again from a saved record (the failed step on)
//
// Edens Edge: the live page map rows snapshot (tests/fixtures/data/edens-edge-v3-page-map.json),
// the live client values when tests/live-snapshots/edens-edge.json is there (else the fixture
// values), no WordPress site URL and no service page copy (so the products read the GBP
// service descriptions). Needs ANTHROPIC_API_KEY in .env. A run costs about 30p to 60p.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set in .env.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const { buildGbpInputs } = require(path.join(root, 'gbp/inputs.js'));
const G = require(path.join(root, 'gbp/generate.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));

function inputsFor(name) {
  if (name !== 'edens-edge') throw new Error(`Unknown client "${name}". Clients: edens-edge`);
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
  const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
  const { rows } = require(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json'));
  const snapFile = path.join(root, 'tests/live-snapshots/edens-edge.json');
  const cv = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')).cv : { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'] };
  const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
  const ctx = contextFromPageMap({ rows, hand, cv, niche: landscaper });
  return buildGbpInputs({ cv, niche: landscaper, rows, keyValueMap: ctx.keyValueMap, siteUrl: process.env.GBP_SITE_URL || '', serviceCopy: [] });
}

(async () => {
  const name = process.argv[2] || 'edens-edge';
  const resumeDir = process.argv.includes('--resume') ? process.argv[process.argv.indexOf('--resume') + 1] : null;
  const I = inputsFor(name);
  console.log(`${I.name}: ${I.locked.length} locked services, target ${I.minServices}, ${I.confirmedNoPage.length} confirmed with no page, ${I.proofPoints.length} proof points`);
  for (const f of I.flags) console.log(`  flag ${f.code}: ${f.msg}`);
  const usage = {};
  const call = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), G.GBP_MODEL, {
    onUsage: (model, r) => { const u = usage[model] = usage[model] || { calls: 0, input: 0, output: 0 }; u.calls++; u.input += r.input_tokens; u.output += r.output_tokens; },
  });
  const record = resumeDir ? JSON.parse(fs.readFileSync(path.join(resumeDir, 'record.json'), 'utf8')) : null;
  const t0 = Date.now();
  const { record: rec, failedStep } = await G.runGbp({ inputs: I, record, callModel: call, log: m => console.log(m) });
  const dir = path.join(root, 'tests/quality-runs/gbp', name, new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'record.json'), JSON.stringify(rec, null, 2));
  for (const [f, text] of Object.entries(G.filesFor(rec))) fs.writeFileSync(path.join(dir, f), text);
  const cost = Object.entries(usage).reduce((s, [m, u]) => s + (u.input * (/5-5/.test(m) ? 2 : 3) + u.output * (/5-5/.test(m) ? 10 : 15)) / 1e6, 0);
  console.log(`\n${failedStep ? `Stopped at ${failedStep}` : 'All three steps done'} in ${Math.round((Date.now() - t0) / 1000)}s, about £${(cost * 0.78).toFixed(2)}. Written to ${path.relative(root, dir)}`);
  for (const step of G.STEPS) {
    const st = rec.steps[step];
    if (!st) { console.log(`  ${step}: not run`); continue; }
    console.log(`  ${step}: ${st.status}, ${st.attempts} attempt(s)${st.status === 'done' ? `, ${st.validation.flags.length} flag(s)${st.validation.counts.total ? `, ${st.validation.counts.total} total` : ''}` : ''}`);
    for (const f of (st.status === 'done' ? st.validation.flags : st.fails)) console.log(`    ${f.level} ${f.rule}: ${f.message}`);
  }
  process.exit(failedStep ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
