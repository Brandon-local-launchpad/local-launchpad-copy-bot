'use strict';
// ── Sonnet high after the optimisation (7 Nov 2026) ──────────────────────────
// The service, category and homepage twice each with the hard BLOCKs, the retry cap, the style pass and the
// cached claims review in place, one batch run, the same judge as the main test, beside the original A run.
//   node tools/model-rerun.js --prep      freeze the inputs as they now are (no writer call)
//   node tools/model-rerun.js --run       R1 and R2 on each page, in parallel (resumes)
//   node tools/site-batch-build.js --pages homepage,/gardener,/services/lawn-mowing --label BT
//   node tools/model-rerun.js --judge     the judge and the claims audit, batch run included (resumes)
//   node tools/model-rerun.js --prep2     the inputs after the fixed FAQ answers
//   node tools/model-rerun.js --run2      R3 and R4 on the homepage and service page (resumes)
//   node tools/model-rerun.js --reaudit   the claims audit again on every run, with the area list and the acceptable filter
//   node tools/model-rerun.js --report    the report and the reader views

const fs = require('fs');
const path = require('path');
const M = require('./model-test');
const { RAW, OUT, PAGES, USD_TO_GBP, readJson, writeJson, runDir, costOf, mapLimit, money, gbp } = M;
const OUT2 = path.join(OUT, 'sonnet-high-rerun');
const PREP = path.join(RAW, 'prep-r.json');
const SONNET_HIGH = { ...M.SETUPS.A };
Object.assign(M.ALL_SETUPS, { R1: { ...SONNET_HIGH, label: 'sonnet-5-5 high, rerun 1' }, R2: { ...SONNET_HIGH, label: 'sonnet-5-5 high, rerun 2' }, BT: { ...SONNET_HIGH, label: 'sonnet-5-5 high, batch' } });
const PREP2 = path.join(RAW, 'prep-r2.json');
Object.assign(M.ALL_SETUPS, { R3: { ...SONNET_HIGH, label: 'sonnet-5-5 high, rerun 3' }, R4: { ...SONNET_HIGH, label: 'sonnet-5-5 high, rerun 4' } });
const RUNS = ['R1', 'R2'];
const RUNS2 = ['R3', 'R4'];
const PAGES2 = ['service', 'homepage'];
const { runClaimsReview, factsFromRecord } = require('../wp/claims-review');
const { verdictFor } = require('../verdict');
const prepFor = k => (RUNS2.includes(k) ? readJson(PREP2) : readJson(PREP));
const BATCH_DIR = { homepage: 'homepage', category: 'gardener', service: 'services_lawn_mowing' };
const flag = n => process.argv.includes(n);

function copyBatchRun() {
  for (const page of Object.keys(PAGES)) {
    const from = path.join(RAW, 'batch-BT', BATCH_DIR[page]);
    if (!fs.existsSync(path.join(from, 'record.json'))) continue;
    const to = runDir(page, 'BT');
    fs.mkdirSync(to, { recursive: true });
    for (const f of ['record.json', 'calls.json', 'run.json']) fs.copyFileSync(path.join(from, f), path.join(to, f));
  }
}
const rate = calls => {
  const i = calls.reduce((s, c) => s + c.input_tokens, 0), r = calls.reduce((s, c) => s + c.cache_read_input_tokens, 0), w = calls.reduce((s, c) => s + c.cache_creation_input_tokens, 0);
  return i + r + w ? (100 * r) / (i + r + w) : 0;
};

function report(all) {
  const L = [];
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const batchSummary = fs.existsSync(path.join(RAW, 'batch-BT/summary.json')) ? readJson(path.join(RAW, 'batch-BT/summary.json')) : null;
  const fresh = all.filter(m => m.setup !== 'A');
  const spent = fresh.reduce((s, m) => s + m.usd_billed + m.usd_judge_and_audit, 0);
  L.push('# Sonnet 5.5 high, optimised: Edens Edge, 2026-11-07', '');
  L.push(`Every page type on claude-sonnet-5-5 high with the hard BLOCKs, two retry rounds on BLOCKs and the named flags, hyphens fixed in code, one combined style pass, and the claims review cached. Judge: ${M.JUDGE.model}, effort ${M.JUDGE.effort}, two readings averaged, as in the main test. Spent on these runs and their judging: ${money(spent)} (${gbp(spent * USD_TO_GBP)}).`, '');
  L.push('Cost is the writer, retries, style pass and claims review, not the judge or audit. "Batch" on a normal run is half its cost, the discount it would get through the Batch API. The batch run\'s own cost is what it was billed, and its normal figure is twice that. Verdicts are read under today\'s rule. Claims come from the audit with the area list, without findings it marks acceptable, re-run on every row. A ran on the old pipeline and old inputs, with location pages linked before they were built, so it isn\'t a like for like input. R1 and R2 came before the style pass claims check and the fixed FAQ answers.', '');
  for (const [page, p] of Object.entries(PAGES)) {
    L.push(`## ${p.label}`, '');
    L.push('| Run | Cost | Batch | Time | Retry calls | BLOCKs before → after | Flags after | Style flags cleared | Style sentences put back | Claims left, fixed audit | Judge score (readings) | Verdict |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    const rows = ['A', 'R1', 'R2', 'R3', 'R4', 'BT'].map(k => all.find(m => m.page === page && m.setup === k)).filter(Boolean);
    const name = { A: 'A: original', R1: 'Rerun 1', R2: 'Rerun 2', R3: 'Rerun 3 (latest rules)', R4: 'Rerun 4 (latest rules)', BT: 'Batch run' };
    for (const m of rows) {
      const rec = readJson(path.join(runDir(page, m.setup), 'record.json'));
      const sp = rec.meta.style_pass;
      const normal = m.setup === 'BT' ? m.usd * 2 : m.usd;
      const batch = m.setup === 'BT' ? m.usd : m.usd / 2;
      const j = readJson(path.join(runDir(page, m.setup), 'judge.json'));
      const verdict = verdictFor({ block: m.block_after, failures: j.readings[0].items.filter(x => !x.pass), claims: rec.CLAIMS || null }).label;
      L.push(`| ${name[m.setup]} | ${money(normal)} | ${money(batch)} | ${Math.round(m.wall_s)}s | ${m.calls.retry} | ${m.block_before} → ${m.block_after} | ${m.flag_after} | ${sp && sp.flags_before != null ? `${sp.cleared} of ${sp.flags_before}` : 'not run'} | ${sp && sp.claims_reverted ? sp.claims_reverted.length : '-'} | ${m.claims_open_audit} | ${M.score(m)} (${m.judge_readings.map(x => x.toFixed(1)).join(', ')}) | ${verdict} |`);
    }
    const R = rows.filter(m => /^R[34]/.test(m.setup)).length ? rows.filter(m => /^R[34]/.test(m.setup)) : rows.filter(m => /^R/.test(m.setup));
    if (R.length) L.push('', `Average of ${R.map(m => m.setup).join(' and ')}: ${money(mean(R.map(m => m.usd)))}, ${mean(R.map(m => m.calls.retry)).toFixed(0)} retry calls, BLOCKs left ${mean(R.map(m => m.block_after)).toFixed(1)}, claims ${mean(R.map(m => m.claims_open_audit)).toFixed(1)}, score ${mean(R.map(m => m.judge_score)).toFixed(2)}.`);
    L.push('');
    const left = rows.filter(m => m.block_after > 0);
    if (left.length) L.push(`BLOCKs left: ${left.map(m => `${name[m.setup]}: ${m.block_codes.join(', ')}`).join('; ')}.`, '');
    const out = rows.filter(m => m.truncated || m.ran_out.length);
    if (out.length) L.push(`Ran out of tokens or cut off: ${out.map(m => `${name[m.setup]}: ${m.ran_out.length} ran out, ${m.truncated} cut`).join('; ')}.`, '');
  }
  L.push('## Where the service page cost goes', '', 'Thinking is inside output. No run\'s draft came near 64,000 tokens, so raising the limit did not raise the cost: you pay for the tokens used, not the limit.', '');
  L.push('| Run | Writer draft | Draft output tokens | Of which thinking | Retries | Style pass | Claims review | Total |', '|---|---|---|---|---|---|---|---|');
  for (const k of ['A', 'R1', 'R2', 'R3', 'R4']) {
    const f = path.join(runDir('service', k), 'calls.json');
    if (!fs.existsSync(f)) continue;
    const c = readJson(f);
    const sumRole = re => c.filter(x => re.test(x.role)).reduce((s, x) => s + costOf(x.served_model, x), 0);
    const w = c.filter(x => /^writer/.test(x.role));
    const out = w.reduce((s, x) => s + x.output_tokens, 0), th = w.reduce((s, x) => s + ((x.raw_usage.output_tokens_details || {}).thinking_tokens || 0), 0);
    L.push(`| ${k} | ${money(sumRole(/^writer/))} | ${out.toLocaleString('en-GB')} | ${th.toLocaleString('en-GB')} | ${money(sumRole(/^retry/))} | ${money(sumRole(/^style/))} | ${money(sumRole(/^claims/))} | ${money(c.reduce((s, x) => s + costOf(x.served_model, x), 0))} |`);
  }
  L.push('');
  L.push('## Caching', '', 'Share of prompt tokens read from cache. The core prompt, rules and niche entry sit in the cached part of the writer and every retry; the claims prompt and facts are now cached too.', '');
  L.push('| Page | Run | All calls | Writer read + write | Retry calls with a cache read | Retry hit rate | Claims hit rate | Style call hit rate |', '|---|---|---|---|---|---|---|---|');
  for (const [page] of Object.entries(PAGES)) for (const k of ['A', 'R1', 'R2', 'R3', 'R4', 'BT']) {
    const f = path.join(runDir(page, k), 'calls.json');
    if (!fs.existsSync(f)) continue;
    const c = readJson(f);
    const w = c.find(x => x.role === 'writer'), rt = c.filter(x => x.role === 'retry'), cl = c.filter(x => x.role === 'claims'), st = c.filter(x => x.role === 'style');
    L.push(`| ${page} | ${k} | ${rate(c).toFixed(1)}% | ${w ? `${w.cache_read_input_tokens} + ${w.cache_creation_input_tokens}` : ''} | ${rt.filter(x => x.cache_read_input_tokens > 0).length} of ${rt.length} | ${rate(rt).toFixed(1)}% | ${cl.length ? `${rate(cl).toFixed(1)}%` : 'none'} | ${st.length ? `${rate(st).toFixed(1)}%` : 'none'} |`);
  }
  L.push('');
  if (batchSummary) {
    L.push('## Batch timing', '', `The three pages through the Batch API took ${Math.round(batchSummary.wall_ms / 60000)} minutes from start to finish, in ${batchSummary.batches.length} batches, one for each round of model calls.`, '', '| Batch | Requests | Time |', '|---|---|---|');
    batchSummary.batches.forEach((b, i) => L.push(`| ${i + 1} | ${b.requests} | ${Math.round(b.ms / 1000)}s |`));
    L.push('');
  }
  return L.join('\n') + '\n';
}

(async () => {
  if (flag('--prep')) {
    const ro = M.readOnlyPool();
    try { await M.prepareAll(ro, 'prep-r.json'); } finally { await ro.pool.end(); }
    const prep = readJson(PREP);
    for (const [k, p] of Object.entries(prep.pages)) {
      const D = p.decisionsResult.decisions;
      console.log(k, 'gates', JSON.stringify(p.decisionsResult.gates || []), 'links to location pages:', (D.linkablePages || []).filter(x => x.type === 'location').length, 'unbuilt:', (D.unbuiltLocationUrls || []).length, 'hero town:', D.d14_town ? D.d14_town.name : '-');
    }
    return;
  }
  const prep = readJson(PREP);
  if (flag('--prep2')) {
    const ro = M.readOnlyPool();
    try { await M.prepareAll(ro, 'prep-r2.json'); } finally { await ro.pool.end(); }
    const D = readJson(PREP2).pages.service.decisionsResult.decisions;
    for (const q of D.faq.filter(x => x.fixed)) console.log(`${q.question}\n  ${q.fixed}`);
    return;
  }
  if (flag('--run2')) {
    const prep2 = readJson(PREP2);
    const todo = [];
    for (const page of PAGES2) for (const k of RUNS2) if (!fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await Promise.all(todo.map(async ([page, k]) => {
      try { const r = await M.writeOne(page, k, prep2); console.log(`${new Date().toISOString().slice(11, 19)} ${page} ${k}: done in ${Math.round(r.wall_ms / 1000)}s, ${r.calls.length} calls, $${r.calls.reduce((s, c) => s + costOf(c.served_model, c), 0).toFixed(3)}`); }
      catch (e) { console.log(`${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    }));
    return;
  }
  if (flag('--reaudit')) {
    const areas = Object.entries(prep.shared.keyValueMap).filter(([k, v]) => /^biz_area_\d+$/.test(k) && v).map(([, v]) => String(v).trim());
    const todo = [];
    for (const page of Object.keys(PAGES)) for (const k of ['A', 'R1', 'R2', 'BT', 'R3', 'R4']) if (fs.existsSync(path.join(runDir(page, k), 'judge.json'))) todo.push([page, k]);
    await mapLimit(todo, 6, async ([page, k]) => {
      const dir = runDir(page, k);
      const j = readJson(path.join(dir, 'judge.json'));
      if (j.audit_areas) return;
      const record = readJson(path.join(dir, 'record.json'));
      record.meta.area_list = record.meta.area_list || areas;
      const calls = [];
      const callAudit = M.meteredCall({ model: M.SONNET, effort: 'medium' }, calls, () => 'claims audit');
      const audit = await runClaimsReview(record, factsFromRecord(record), callAudit);
      writeJson(path.join(dir, 'judge.json'), { ...j, audit_before_area_list: j.audit, audit, auditCalls: [...j.auditCalls, ...calls], audit_areas: true });
      console.log(`audited ${page} ${k}: ${audit.findings.length}`);
    });
    return;
  }
  if (flag('--run')) {
    const todo = [];
    for (const page of Object.keys(PAGES)) for (const k of RUNS) if (!fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await Promise.all(todo.map(async ([page, k]) => {
      try { const r = await M.writeOne(page, k, prep); console.log(`${new Date().toISOString().slice(11, 19)} ${page} ${k}: done in ${Math.round(r.wall_ms / 1000)}s, ${r.calls.length} calls, $${r.calls.reduce((s, c) => s + costOf(c.served_model, c), 0).toFixed(3)}`); }
      catch (e) { console.log(`${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    }));
    return;
  }
  if (flag('--judge')) {
    copyBatchRun();
    const todo = [];
    for (const page of Object.keys(PAGES)) for (const k of [...RUNS, 'BT', ...RUNS2]) if (fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await mapLimit(todo, 6, async ([page, k]) => {
      try { await M.judgeOne(page, k, prepFor(k)); console.log(`judged ${page} ${k}`); }
      catch (e) { console.log(`judge ${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    });
    return;
  }
  if (flag('--report')) {
    const all = [];
    for (const page of Object.keys(PAGES)) for (const k of ['A', 'R1', 'R2', 'BT', 'R3', 'R4']) if (fs.existsSync(path.join(runDir(page, k), 'judge.json'))) all.push(await M.metricsFor(page, k));
    fs.mkdirSync(OUT2, { recursive: true });
    writeJson(path.join(OUT2, 'metrics.json'), all);
    fs.writeFileSync(path.join(OUT2, 'REPORT_sonnet_high_2026-11-07.md'), report(all));
    const name = { R1: 'rerun1', R2: 'rerun2', BT: 'batch', R3: 'rerun3', R4: 'rerun4' };
    for (const m of all) if (name[m.setup]) fs.writeFileSync(path.join(OUT2, `${PAGES[m.page].file}_${name[m.setup]}.md`), M.blindView(m.page, m.setup, prepFor(m.setup)));
    console.log(`Written to ${path.relative(path.join(__dirname, '..'), OUT2)}.`);
    return;
  }
  console.log('Pass --prep, --run, --judge or --report.');
})().catch(e => { console.error(e); process.exit(1); });
