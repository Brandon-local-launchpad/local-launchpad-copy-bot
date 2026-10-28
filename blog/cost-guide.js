'use strict';

// ── The cost guide's fixed H2s and table (Brandon's Cost Guide Structure, 28 Oct) ────
// prompts/Cost_Guide_Structure.md sets a cost guide's H2s (five for a service cost guide, four
// for the homepage cost guide), the factors mode H2 1, the wording by cost unit, the fact rows
// each H2 needs (an H2 whose rows are missing is dropped, not padded; under three left the post
// is held, G-STACK), the table, the figures rule and the FAQ sources. The bank supplies the
// FAQ only. This module reads the file; blog/decisions.js applies it.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'prompts', 'Cost_Guide_Structure.md');

const cells = line => line.split('|').slice(1, -1).map(c => c.trim());
const tableAfter = (text, heading) => {
  const i = text.indexOf(heading);
  if (i < 0) return [];
  const rows = [];
  for (const line of text.slice(i).split('\n').slice(1)) {
    if (/^#{2,3} /.test(line) && rows.length) break;
    if (/^#{2,3} /.test(line)) continue;
    if (!/^\|/.test(line)) { if (rows.length) break; continue; }
    const c = cells(line);
    if (c.every(x => /^-+$/.test(x))) continue;
    rows.push(c);
  }
  return rows.slice(1); // the header row off
};

// What each service H2 needs, by its number in the file (the file's fourth column says it in words)
const NEEDS = { 1: ['price'], 2: ['factors'], 3: ['quote'], 4: ['timing'], 5: ['factors'] };
const HOME_NEEDS = { 1: ['price'], 2: ['factors'], 3: ['quote'], 4: ['factors'] };

let cache = null;
function loadStructure() {
  if (cache) return cache;
  let text = '';
  try { text = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n'); } catch (_) { text = ''; }
  const service = tableAfter(text, '### Service cost guide, prices mode').map(c => ({ n: parseInt(c[0], 10), h2: c[1], brief: c[2], rows: c[3] || '' }));
  const home = tableAfter(text, '### Homepage cost guide').map(c => ({ n: parseInt(c[0], 10), h2: c[1], brief: c[2] }));
  const units = {};
  for (const c of tableAfter(text, '### Wording by cost unit')) units[c[0].toLowerCase()] = { type: c[1], h2_1: c[2], h2_4: c[3].replace(/\s*\(.*\)\s*$/, ''), h2_4_note: (c[3].match(/\((.*)\)/) || [])[1] || '' };
  const fm = text.match(/H2 1 becomes \*\*([^*]+)\*\*, with the brief: ([^\n]+?)(?: H2s 2 to 5|$)/m);
  const factors = fm ? { h2: fm[1].trim(), brief: fm[2].trim() } : { h2: 'How Is [SERVICE] Priced in [CITY]?', brief: 'how the job is priced, from cost_unit, and that a figure follows a look at the job; no figures anywhere on the page' };
  cache = { service, home, units, factors, placeholder: /PLACEHOLDER/.test(text) || !service.length, source: path.relative(path.join(__dirname, '..'), FILE), text };
  return cache;
}

const cap = s => String(s || '').replace(/\b([a-z])/g, c => c.toUpperCase());
const lc = s => String(s || '').toLowerCase().trim();

// The H2s for one cost guide.
//   service: the UK page name; city; trade, tradePerson; costUnit ('per job' …); mode 'prices' | 'factors';
//   homepage: the trade level guide; have: { price, factors, quote, timing } what the fact rows give
// Returns { h2s: [{ id, wording, brief, needs, doubt }], dropped: [{ wording, needs }], mode }
function costGuideH2s({ service = '', city = '', trade = '', tradePerson = '', costUnit = 'per job', mode = 'prices', homepage = false, have = {} } = {}) {
  const S = loadStructure();
  const svc = lc(service);
  const fill = s => String(s || '').replace(/\[SERVICE\]/g, svc).replace(/\[CITY\]/g, city || '').replace(/\[TRADE_PERSON\]s/g, `${lc(tradePerson)}s`).replace(/\[TRADE_PERSON\]/g, lc(tradePerson)).replace(/\[TRADE\]/g, lc(trade)).replace(/\s+/g, ' ').replace(/\s+\?/, '?').replace(/\b(a) ([aeiou])/gi, (m, a, v) => `${a}n ${v}`).trim();
  const unit = S.units[lc(costUnit)] || S.units['per job'] || null;
  const list = homepage ? S.home.map(h => ({ ...h, needs: HOME_NEEDS[h.n] || [] })) : S.service.map(h => {
    let h2 = h.h2, brief = h.brief;
    if (h.n === 1 && mode === 'factors') { h2 = S.factors.h2; brief = S.factors.brief; }
    else if (h.n === 1 && unit) h2 = unit.h2_1;
    else if (h.n === 4 && unit) { h2 = unit.h2_4; if (unit.h2_4_note) brief = `${brief} ${cap(unit.h2_4_note)}.`; }
    return { ...h, h2, brief, needs: h.n === 1 && mode === 'factors' ? [] : (NEEDS[h.n] || []) };
  });
  const h2s = [], dropped = [];
  for (const h of list) {
    const missing = h.needs.filter(n => !have[n]);
    const out = { id: `CG-${h.n}`, n: h.n, wording: cap(fill(h.h2)), brief: fill(h.brief), needs: h.needs, doubt: h.n === 4 ? 'Timing' : h.n === 3 ? 'Process' : 'Price', fixed: true };
    if (missing.length) dropped.push({ ...out, missing });
    else h2s.push(out);
  }
  return { h2s, dropped, mode, placeholder: S.placeholder };
}

module.exports = { costGuideH2s, loadStructure, FILE };
