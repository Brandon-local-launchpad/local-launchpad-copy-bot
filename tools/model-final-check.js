'use strict';
// One real run of each test page on the rules as they stand, before a merge: same judge and audit as the model test.
//   node tools/model-final-check.js
const fs = require('fs');
const path = require('path');
const M = require('./model-test');
const { RAW, PAGES, readJson, runDir, costOf } = M;
const { verdictFor } = require('../verdict');
const KEY = process.env.FINAL_KEY || 'F1';
Object.assign(M.ALL_SETUPS, { [KEY]: { ...M.SETUPS.A, label: 'sonnet-5-5 high, final check' } });

(async () => {
  const ro = M.readOnlyPool();
  try { await M.prepareAll(ro, 'prep-final.json'); } finally { await ro.pool.end(); }
  const prep = readJson(path.join(RAW, 'prep-final.json'));
  await Promise.all(Object.keys(PAGES).map(async page => {
    if (!fs.existsSync(path.join(runDir(page, KEY), 'run.json'))) await M.writeOne(page, KEY, prep);
    await M.judgeOne(page, KEY, prep);
  }));
  for (const page of Object.keys(PAGES)) {
    const dir = runDir(page, KEY);
    const r = readJson(path.join(dir, 'record.json')), c = readJson(path.join(dir, 'calls.json')), j = readJson(path.join(dir, 'judge.json'));
    const scores = j.readings.map(x => x.score);
    const v = verdictFor({ block: r.VALIDATION.block, failures: j.readings[0].items.filter(x => !x.pass), claims: r.CLAIMS || null });
    console.log(`\n== ${page}: $${c.reduce((s, x) => s + costOf(x.served_model, x), 0).toFixed(3)}, ${c.filter(x => x.role === 'retry').length} retries, BLOCKs ${r.meta.first_draft_validation.block} → ${r.VALIDATION.block}, flags ${r.VALIDATION.flag}, audit ${j.audit.findings.length}, score ${scores.join('/')}, ${v.label}${v.reasons.length ? ` (${v.reasons.join('; ')})` : ''}`);
    console.log('  style', JSON.stringify(r.meta.style_pass));
    for (const p of r.meta.promises_removed || []) console.log(`  removed ${String(p.field).slice(0, 40)}: "${p.sentence.slice(0, 110)}" (${p.practice})`);
    for (const i of (r.VALIDATION.issues || []).filter(x => x.type === 'BLOCK')) console.log(`  BLOCK ${i.check} · ${i.field}: ${i.message.slice(0, 160)}`);
    for (const f of j.audit.findings) console.log(`  audit ${String(f.field).slice(0, 36)}: ${String(f.quote).slice(0, 80)} | ${String(f.why).slice(0, 80)}`);
    for (const f of (r.faq_items || []).filter(x => x.fixed != null)) console.log(`  FAQ ${f.faq_question}\n    ${f.faq_answer}`);
    const body = r.svc_content_body || r.cat_content_body || r.home_content_block_body || '';
    console.log(`  town links in the page: ${(JSON.stringify([r.faq_items, body]).match(/\]\(\/locations[^)]*\)/g) || []).length}`);
    const out = path.join(M.OUT, 'sonnet-high-rerun', `${PAGES[page].file}_final_check.md`);
    fs.writeFileSync(out, M.blindView(page, KEY, prep));
  }
})().catch(e => { console.error(e); process.exit(1); });
