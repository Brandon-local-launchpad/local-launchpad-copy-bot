'use strict';
// Compares the resolver's output for a set of ticks with a finished custom values
// sheet exported as CSV: one file per category tab ("Cat N - <name>"), plus the
// cross-ref tab if you have it. Read-only: it reads files and prints a report.
//
//   node tools/check-against-sheet.js <niche> --ticks <ticks.js|ticks.json> [--rule ticked_only|ticked_or_propagated] <csv files...>
//   node tools/check-against-sheet.js landscapers-gardeners --ticks tests/fixtures/data/edens-edge-ticks.js --rule ticked_or_propagated tests/fixtures/edens-edge-real/cat-*.csv
//
// Content differences (a tab, service, key, unique/duplicate or "also on" note that
// differs) are reported separately from order differences (same content, other
// position). Exit code 1 when there are content differences, else 0.
//
// Sheet format (the Edens Edge example): a "Category N: <name>" row with the key
// {{custom_values.category_N}} and the category name as its value, then one row per
// service: name, {{custom_values.service_N}}, value, and a note "Unique to this
// category" or "DUPLICATE — also on Cat 2, 3" (yellow rows). A cross-ref tab is any
// file with service keys and no "Category N:" row: each row's service key and the
// "Cat N" numbers or category names it mentions.

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'fillout/services/resolver.js'));

const norm = R.norm;
const keyOf = cell => { const m = String(cell || '').match(/custom_values\.((?:service|category)_\d+)/); return m ? m[1] : null; };
const catNos = text => { const m = String(text || '').match(/also on\s+(.*)$/i); if (!m) return []; return [...m[1].replace(/→.*$/, '').matchAll(/(?:Cat\s*)?(\d+)/gi)].map(x => Number(x[1])); };

// Longest common subsequence of two name lists, as a Set of the names kept in order
function lcs(a, b) {
  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const out = new Set();
  for (let i = 0, j = 0; i < a.length && j < b.length;) { if (a[i] === b[j]) { out.add(a[i]); i++; j++; } else if (d[i + 1][j] >= d[i][j + 1]) i++; else j++; }
  return out;
}

// One CSV file → { kind: 'tab', no, name, key, rows: [{ name, key, kind, alsoOnNos }] } | { kind: 'crossref', rows } | { kind: 'other' }
function parseSheetFile(text, file = '') {
  const rows = Papa.parse(String(text).replace(/^﻿/, ''), { skipEmptyLines: true }).data;
  let tab = null;
  for (const r of rows) {
    const m = String(r[0] || '').match(/^Category\s+(\d+):\s*(.+)$/i);
    if (m && keyOf(r[1])) { tab = { kind: 'tab', file, no: Number(m[1]), name: String(r[2] || m[2]).trim(), key: keyOf(r[1]), rows: [] }; continue; }
    if (!tab) continue;
    const key = keyOf(r[1]);
    if (!key || !key.startsWith('service_')) continue;
    const note = String(r[3] || '');
    tab.rows.push({ name: String(r[2] || r[0]).trim(), key, kind: /^\s*duplicate/i.test(note) ? 'duplicate' : /unique/i.test(note) ? 'unique' : 'unknown', alsoOnNos: catNos(note), note });
  }
  if (tab) return tab;
  const svcRows = rows.filter(r => r.some(c => /custom_values\.service_\d+/.test(c)));
  if (svcRows.length) {
    return { kind: 'crossref', file, rows: svcRows.map(r => {
      const cells = r.map(c => String(c || ''));
      const key = cells.map(keyOf).find(Boolean);
      const name = cells.find(c => c.trim() && !/custom_values/.test(c) && !/\bcat\s*\d/i.test(c)) || '';
      return { key, name: name.trim(), nos: [...new Set(cells.join(' ').match(/\bCat\s*(\d+)/gi) || [])].map(x => Number(x.replace(/\D/g, ''))), text: cells.join(' | ') };
    }) };
  }
  return { kind: 'other', file };
}

// sheets: parsed files; resolved: resolver output. Returns { content: [], order: [], notes: [] }
function compare(sheets, resolved) {
  const content = [], order = [], notes = [];
  const tabs = sheets.filter(s => s.kind === 'tab').sort((a, b) => a.no - b.no);
  const crossrefs = sheets.filter(s => s.kind === 'crossref');
  for (const s of sheets.filter(x => x.kind === 'other')) notes.push(`${path.basename(s.file)}: not a category tab or cross-ref, skipped`);
  const byNo = new Map(tabs.map(t => [t.no, t]));
  const rcat = name => resolved.categories.find(c => norm(c.name) === norm(name));

  // Tabs
  for (const t of tabs) if (!rcat(t.name)) content.push(`Tab "${t.name}" (Cat ${t.no}, ${t.key}) is on the sheet but the resolver gives no tab for it`);
  for (const c of resolved.categories) if (!tabs.some(t => norm(t.name) === norm(c.name))) content.push(`Tab "${c.name}" (${c.legacyKey}) is in the resolver output but not on the sheet`);
  const common = tabs.filter(t => rcat(t.name));
  const sheetOrder = common.map(t => norm(t.name)), resOrder = resolved.categories.filter(c => common.some(t => norm(t.name) === norm(c.name))).map(c => norm(c.name));
  if (sheetOrder.join('|') !== resOrder.join('|')) order.push(`Tab order: sheet ${common.map(t => t.name).join(', ')}; resolver ${resolved.categories.filter(c => resOrder.includes(norm(c.name))).map(c => c.name).join(', ')}`);

  for (const t of common) {
    const c = rcat(t.name);
    const where = `Tab "${c.name}"`;
    if (t.key !== c.legacyKey) content.push(`${where}: category key ${t.key} on the sheet, ${c.legacyKey} from the resolver`);
    const rRows = new Map(c.rows.map(r => [norm(r.name), r]));
    const sRows = new Map(t.rows.map(r => [norm(r.name), r]));
    for (const s of t.rows) {
      const r = rRows.get(norm(s.name));
      if (!r) { content.push(`${where}: "${s.name}" (${s.key}) is on the sheet, not in the resolver output`); continue; }
      if (s.key !== r.legacyKey) content.push(`${where}: "${s.name}" is ${s.key} on the sheet, ${r.legacyKey} from the resolver`);
      const rKind = r.kind === 'additional' ? 'unique' : r.kind;
      if (s.kind !== 'unknown' && s.kind !== rKind) content.push(`${where}: "${s.name}" is ${s.kind} on the sheet, ${r.kind} from the resolver`);
      if (s.kind === 'unknown') notes.push(`${where}: "${s.name}" has no Unique/DUPLICATE note ("${s.note}")`);
      // "also on" notes name the sheet's other tabs; compare with the resolver's tabs (not categories without a tab)
      const sheetAlso = s.alsoOnNos.map(n => byNo.get(n) ? norm(byNo.get(n).name) : `cat ${n}`).sort();
      const resAlso = r.alsoOn.filter(a => a.hasTab).map(a => norm(a.name)).sort();
      if (s.kind === 'duplicate' && sheetAlso.join('|') !== resAlso.join('|')) content.push(`${where}: "${s.name}" note says also on ${sheetAlso.join(', ') || 'nothing'}; the resolver has it also on ${resAlso.join(', ') || 'no other tab'}`);
    }
    for (const r of c.rows) if (!sRows.has(norm(r.name))) content.push(`${where}: "${r.name}" (${r.legacyKey}) is in the resolver output, not on the sheet`);
    const both = t.rows.filter(s => rRows.has(norm(s.name))).map(s => norm(s.name));
    const resBoth = c.rows.filter(r => sRows.has(norm(r.name))).map(r => norm(r.name));
    if (both.join('|') !== resBoth.join('|')) {
      // The rows that moved: those outside the longest run kept in the same relative order
      const keep = lcs(both, resBoth);
      const moved = both.filter(n => !keep.has(n)).map(n => `"${t.rows.find(s => norm(s.name) === n).name}" (sheet ${t.rows.findIndex(s => norm(s.name) === n) + 1}, resolver ${c.rows.findIndex(r => norm(r.name) === n) + 1})`);
      order.push(`${where}: ${moved.length} service${moved.length === 1 ? '' : 's'} out of order: ${moved.join('; ')}`);
    }
  }

  // Cross-ref: services on 2 or more tabs
  for (const x of crossrefs) {
    const sheetSet = new Map(x.rows.filter(r => r.key).map(r => [r.key, r]));
    const resSet = new Map(resolved.crossRef.map(r => [r.legacyKey, r]));
    for (const [k, r] of sheetSet) {
      const res = resSet.get(k);
      if (!res) { content.push(`Cross-ref: ${k} ${r.name ? `("${r.name}") ` : ''}is on the sheet's cross-ref, not on 2+ resolver tabs`); continue; }
      if (r.nos.length) {
        const sheetTabs = r.nos.map(n => byNo.get(n) ? norm(byNo.get(n).name) : `cat ${n}`).sort().join('|');
        const resTabs = res.tabs.map(t => norm(t.name)).sort().join('|');
        if (sheetTabs !== resTabs) content.push(`Cross-ref: ${k} "${res.name}" is on ${sheetTabs.replace(/\|/g, ', ')} on the sheet, ${resTabs.replace(/\|/g, ', ')} from the resolver`);
      }
    }
    for (const [k, r] of resSet) if (!sheetSet.has(k)) content.push(`Cross-ref: ${k} "${r.name}" is on ${r.short} in the resolver, missing from the sheet's cross-ref`);
  }
  if (!crossrefs.length) notes.push('No cross-ref file given: the cross-ref was not checked');
  return { content, order, notes, tabs: tabs.length };
}

function loadTicks(file) {
  const p = path.resolve(file);
  return p.endsWith('.json') ? JSON.parse(fs.readFileSync(p, 'utf8')) : require(p);
}

function main(argv) {
  const args = argv.slice(2);
  const niche = args.shift();
  let ticksFile = null, rule = 'ticked_only';
  const files = [];
  while (args.length) {
    const a = args.shift();
    if (a === '--ticks') ticksFile = args.shift();
    else if (a === '--rule') rule = args.shift();
    else files.push(a);
  }
  if (!niche || !ticksFile || !files.length) { console.error('Usage: node tools/check-against-sheet.js <niche> --ticks <ticks.js|ticks.json> [--rule ticked_only|ticked_or_propagated] <csv files...>'); return 2; }
  const config = R.loadConfig(niche) || R.configFor(niche);
  if (!config) { console.error(`No services file for "${niche}" in fillout/services/`); return 2; }
  const resolved = R.resolve(loadTicks(ticksFile), config, { categoryTabRule: rule });
  const sheets = files.map(f => parseSheetFile(fs.readFileSync(f, 'utf8'), f));
  const out = compare(sheets, resolved);
  console.log(`${config.niche}: ${out.tabs} sheet tab${out.tabs === 1 ? '' : 's'} against the resolver (${rule}, ${resolved.counts.tabs} tabs, ${resolved.counts.services} services)\n`);
  console.log(`Content differences (${out.content.length})`); for (const l of out.content) console.log('  - ' + l); if (!out.content.length) console.log('  none');
  console.log(`\nOrder differences (${out.order.length})`); for (const l of out.order) console.log('  - ' + l); if (!out.order.length) console.log('  none');
  if (out.notes.length) { console.log('\nNotes'); for (const l of out.notes) console.log('  - ' + l); }
  return out.content.length ? 1 : 0;
}

module.exports = { parseSheetFile, compare, catNos };
if (require.main === module) process.exit(main(process.argv));
