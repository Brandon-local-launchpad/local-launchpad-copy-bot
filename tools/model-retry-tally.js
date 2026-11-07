'use strict';
// Every retry on the Sonnet high test pages, by the rule that triggered it. Older records keep only the
// problem messages, so a message is matched back to its check through the literal text in the validators.
//   node tools/model-retry-tally.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const RAW = path.join(root, 'tests/quality-runs/model-test/2026-11-06');
const OUT = path.join(root, 'docs/model-test/2026-11-06');
const { RETRY_FLAGS } = require('../validate-v20');
const { FLAG_PASS } = require('../v20-retry');

// (type, check, literal chunks of its message) from the validator sources
const rules = [];
for (const f of ['validate-v20.js', 'validate-service.js', 'validate-category.js', 'validate-location.js', 'validate-hard.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/'(BLOCK|FLAG)',\s*'([A-Za-z0-9-]+)',\s*(?:[^,`'"]+,\s*)?(?:`((?:[^`\\]|\\.)*)`|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    const msg = m[3] || m[4] || m[5] || '';
    const chunks = msg.split(/\$\{[^}]*\}/).map(s => s.replace(/\\(.)/g, '$1').trim()).filter(s => s.length >= 8);
    if (chunks.length) rules.push({ type: m[1], check: m[2], chunks });
  }
}
function classify(problem) {
  let best = null, score = 0;
  for (const r of rules) {
    const hit = r.chunks.filter(c => problem.includes(c)).reduce((s, c) => s + c.length, 0);
    if (hit > score) { score = hit; best = r; }
  }
  return best ? { check: best.check, type: best.type } : { check: 'unmatched', type: '?' };
}

const runs = [['service-lawn-mowing', 'A'], ['category-gardener', 'A'], ['homepage', 'A'], ['service-lawn-mowing', 'A2'], ['service-lawn-mowing', 'A3'], ['category-gardener', 'A2'], ['category-gardener', 'A3']];
const tally = new Map();
const perRun = [];
const unmatched = [];
for (const [page, k] of runs) {
  const dir = path.join(RAW, `${page}_${k}`);
  const r = JSON.parse(fs.readFileSync(path.join(dir, 'record.json'), 'utf8'));
  const calls = JSON.parse(fs.readFileSync(path.join(dir, 'calls.json'), 'utf8')).filter(c => c.role === 'retry');
  const log = r.VALIDATION.retries || [];
  const usd = calls.reduce((s, c) => s + (c.input_tokens * 2 + c.output_tokens * 10 + c.cache_read_input_tokens * 0.1 + c.cache_creation_input_tokens * 2.5) / 1e6, 0);
  const seen = {};
  for (const e of log) {
    const source = e.source === 'claims' ? 'claims' : e.source || 'field round';
    const problems = e.problems || [];
    const checks = source === 'claims' ? [{ check: 'claims review', type: 'claims' }] : [...new Map(problems.map(classify).map(c => [c.check, c])).values()];
    for (const c of checks) {
      if (c.check === 'unmatched') for (const p of problems) if (classify(p).check === 'unmatched') unmatched.push(p.slice(0, 120));
      const key = c.check;
      const t = tally.get(key) || { check: c.check, type: c.type, attempts: 0, kept: 0, runs: new Set(), pages: new Set(), sources: {} };
      t.attempts++; if (e.kept) t.kept++; t.runs.add(`${page} ${k}`); t.pages.add(page);
      t.sources[source] = (t.sources[source] || 0) + 1;
      tally.set(key, t);
      seen[key] = (seen[key] || 0) + 1;
    }
  }
  perRun.push({ page, setup: k, retry_calls: calls.length, log_entries: log.length, kept: log.filter(e => e.kept).length, usd, checks: seen });
}
const rows = [...tally.values()].sort((a, b) => b.attempts - a.attempts);
const L = ['# Every retry on the Sonnet high test pages, by rule', '', `Pages: ${runs.map(([p, k]) => `${p} ${k}`).join(', ')}. One retry can carry several rules, so the rule counts add up to more than the retry calls. "Kept" is how many of those rewrites were accepted.`, ''];
L.push('| Page | Run | Retry calls | Kept | Retry cost |', '|---|---|---|---|---|');
for (const r of perRun) L.push(`| ${r.page} | ${r.setup} | ${r.retry_calls} | ${r.kept} | $${r.usd.toFixed(3)} |`);
L.push('', '| Rule | Type | Retries | Kept | Runs it hit (of 7) | Where it came from | Today |', '|---|---|---|---|---|---|---|');
for (const t of rows) L.push(`| ${t.check} | ${t.type} | ${t.attempts} | ${t.kept} | ${t.runs.size} | ${Object.entries(t.sources).map(([s, n]) => `${s} ${n}`).join(', ')} | ${t.type === 'BLOCK' ? 'retries' : t.type === 'claims' ? 'retries' : [RETRY_FLAGS.has(t.check) ? 'retry list' : null, FLAG_PASS.has(t.check) ? 'flag pass' : null].filter(Boolean).join(', ') || 'targeted round'} |`);
if (unmatched.length) L.push('', `Not matched to a rule (${unmatched.length}):`, ...[...new Set(unmatched)].slice(0, 12).map(u => `- ${u}`));
fs.writeFileSync(path.join(OUT, 'retries-by-rule.md'), L.join('\n') + '\n');
console.log(L.join('\n'));
