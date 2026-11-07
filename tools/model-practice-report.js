'use strict';
// Every time the PRACTICE rule fired on a test page, with the sentence it fired on.
//   node tools/model-practice-report.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const RAW = path.join(root, 'tests/quality-runs/model-test/2026-11-06');
const OUT = path.join(root, 'docs/model-test/2026-11-06/sonnet-high-rerun');
const SONNET_HIGH = new Set(['A', 'A2', 'A3', 'R1', 'R2', 'R3', 'R4', 'BT']);
const sentenceWith = (text, quote) => {
  const parts = String(text || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').split(/(?<=[.!?])\s+/);
  const q = String(quote || '').toLowerCase();
  return parts.find(s => s.toLowerCase().includes(q)) || String(text || '').slice(0, 200);
};
const parse = m => { const x = String(m).match(/^"([^"]+)" states a practice \("([^"]+)"\)/); return x ? { quote: x[1], practice: x[2] } : null; };
const rows = [];
for (const d of fs.readdirSync(RAW)) {
  const f = path.join(RAW, d, 'record.json');
  if (!fs.existsSync(f)) continue;
  const m = d.match(/^(.+)_([A-Z][A-Z0-9]*)$/);
  if (!m) continue;
  const [, page, setup] = m;
  if (!fs.existsSync(path.join(RAW, d, 'judge.json')) && !SONNET_HIGH.has(setup)) continue;
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const V = r.VALIDATION || {};
  const left = (V.issues || []).filter(i => i.check === 'PRACTICE');
  const seen = new Set();
  for (const e of V.retries || []) for (const p of e.problems || []) {
    const x = parse(p);
    if (!x) continue;
    const k = `${e.field}|${x.quote}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const stillThere = left.some(i => i.field === e.field && parse(i.message) && parse(i.message).quote === x.quote);
    rows.push({ page, setup, field: e.field, quote: x.quote, practice: x.practice, sentence: sentenceWith(e.before, x.quote), result: stillThere ? 'STILL THERE' : 'fixed by a retry' });
  }
  for (const i of left) {
    const x = parse(i.message);
    if (!x || seen.has(`${i.field}|${x.quote}`)) continue;
    const fld = (function find() { for (const it of [...(r.faq_items || []), ...(r.block4 || []), ...(r.block5 || []), ...(r.steps || []), ...(r.included || [])]) { const t = it.faq_answer || it.card_body || it.step_body || it.item_text || ''; if (t.toLowerCase().includes(x.quote.toLowerCase())) return t; } return ''; })();
    rows.push({ page, setup, field: i.field, quote: x.quote, practice: x.practice, sentence: sentenceWith(fld, x.quote), result: 'STILL THERE' });
  }
}
const src = fs.readFileSync(path.join(root, 'validate-v20.js'), 'utf8');
const at = src.indexOf('// PRACTICE: working practices only from confirmed_practices');
const rule = src.slice(at, src.indexOf('\n\n', at)).split('\n').slice(0, 8).join('\n');
const L = ['# The PRACTICE rule and every time it fired', '', '```js', rule.slice(0, 900), '```', ''];
L.push(`It fired ${rows.length} times. "STILL THERE" means the BLOCK was on the finished page.`, '');
L.push('| Page | Run | Field | Words matched | Practice | Sentence | Result |', '|---|---|---|---|---|---|---|');
const order = (a, b) => (SONNET_HIGH.has(b.setup) - SONNET_HIGH.has(a.setup)) || a.page.localeCompare(b.page) || a.setup.localeCompare(b.setup);
for (const r of rows.sort(order)) L.push(`| ${r.page} | ${r.setup} | ${r.field} | ${r.quote} | ${r.practice} | ${r.sentence.replace(/\|/g, '/')} | ${r.result} |`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'practice-failures.md'), L.join('\n') + '\n');
const sh = rows.filter(r => SONNET_HIGH.has(r.setup));
console.log(`all ${rows.length}, sonnet high ${sh.length}, still there ${rows.filter(r => r.result === 'STILL THERE').length}`);
const by = {}; for (const r of sh) { by[r.practice] = (by[r.practice] || 0) + 1; } console.log(by);
for (const r of sh.filter(x => /faq/.test(x.field) || x.result === 'STILL THERE')) console.log(`${r.page} ${r.setup} | ${r.field} | ${r.quote} | ${r.practice} | ${r.sentence.slice(0, 170)} | ${r.result}`);
