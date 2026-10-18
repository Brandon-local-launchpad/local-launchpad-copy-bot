'use strict';
// Fixture: tools/check-against-sheet.js on the real Edens Edge sheet tabs
// (tests/fixtures/edens-edge-real/cat-*.csv). Parsing, keys matching the resolver,
// content and order differences kept apart, a cross-ref tab, the CLI's exit codes,
// and nothing written.
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const C = require(path.join(root, 'tools/check-against-sheet.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: check against a finished sheet (Edens Edge) ===\n');
const dir = path.join(root, 'tests/fixtures/edens-edge-real');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv')).map(f => path.join(dir, f));
const sheets = files.map(f => C.parseSheetFile(fs.readFileSync(f, 'utf8'), f));
const tabs = sheets.filter(s => s.kind === 'tab');
const config = R.loadConfig('landscapers-gardeners');
const resolved = R.resolve(ticks, config, { categoryTabRule: 'ticked_or_propagated' });

chk('Parses the 7 category tabs; page-map.csv is skipped as neither a tab nor a cross-ref', tabs.length === 7 && sheets.find(s => /page-map/.test(s.file)).kind === 'other', JSON.stringify(sheets.map(s => s.kind)), '');
const deck = tabs.find(t => t.name === 'Deck builder');
chk('Deck Builder on the sheet: 16 services, service_63 to service_78, no Porch construction', deck.rows.length === 16 && deck.rows[0].key === 'service_63' && deck.rows[15].key === 'service_78' && !deck.rows.some(r => /porch/i.test(r.name)), JSON.stringify([deck.rows.length, deck.rows[15].key]), '');
chk('Notes parse: "DUPLICATE — also on Cat 2, 3, 4" gives duplicate and Cat 2, 3, 4', (() => { const g = tabs.find(t => t.no === 1).rows.find(r => r.name === 'Grass seeding'); return g.kind === 'duplicate' && g.alsoOnNos.join() === '2,3,4' && C.catNos('DUPLICATE — also on Cat 2 → use service_38').join() === '2'; })(), '', '');

const out = C.compare(sheets, resolved);
chk('ticked_or_propagated: every category and service key matches the sheet (the fixed fixture: 78 services, Deck Builder 16)', !out.content.some(l => /service_\d+ on the sheet|category key/.test(l)) && resolved.counts.services === 78, out.content.join(' | '), 'no key differences');
chk('Content differences are exactly the five known ones (two unique/duplicate notes, two "also on" notes, Hardscaping on Paving Contractor)', out.content.length === 5
  && out.content.some(l => /"Lawn mowing and maintenance" is unique on the sheet, duplicate from the resolver/.test(l))
  && out.content.some(l => /Tab "Landscape Gardener": "Hardscaping" is unique on the sheet/.test(l))
  && out.content.some(l => /"Grass seeding" note says also on gardener, landscape gardener; the resolver has it also on gardener, landscape gardener, lawn care service/.test(l))
  && out.content.some(l => /"Sod installation" note says/.test(l))
  && out.content.some(l => /Tab "Paving Contractor": "Hardscaping" \(service_20\) is in the resolver output, not on the sheet/.test(l)), out.content.join('\n  '), '5');
chk('Order differences are reported apart: Landscape design moved on Landscape Gardener, 9 rows on Landscape Designer', out.order.length === 2 && out.order.some(l => /Landscape Gardener": 1 service out of order: "Landscape design" \(sheet 32, resolver 13\)/.test(l)) && out.order.some(l => /Landscape Designer": 9 services out of order/.test(l)), out.order.join('\n  '), '');

// Order only vs content
const clone = o => JSON.parse(JSON.stringify(o));
let s2 = clone(sheets); const t7 = s2.find(t => t.kind === 'tab' && t.no === 7); [t7.rows[0], t7.rows[1]] = [t7.rows[1], t7.rows[0]];
let o2 = C.compare(s2, resolved);
chk('Swapping two Deck Builder rows is an order difference only', o2.content.length === out.content.length && o2.order.some(l => /Deck Builder": 1 service out of order/.test(l)), o2.order.join(' | '), '');
s2 = clone(sheets); s2.find(t => t.kind === 'tab' && t.no === 7).rows[2].key = 'service_99';
o2 = C.compare(s2, resolved);
chk('A changed key is a content difference', o2.content.some(l => /"Deck design" is service_99 on the sheet, service_65 from the resolver/.test(l)), o2.content.join(' | '), '');
s2 = clone(sheets); s2.find(t => t.kind === 'tab' && t.no === 7).rows.push({ name: 'Porch construction', key: 'service_79', kind: 'unique', alsoOnNos: [], note: 'Unique to this category' });
o2 = C.compare(s2, resolved);
chk('A service on the sheet but not ticked (Porch construction) is a content difference', o2.content.some(l => /Tab "Deck Builder": "Porch construction" \(service_79\) is on the sheet, not in the resolver output/.test(l)), o2.content.join(' | '), '');

// Cross-ref tab
const xref = C.parseSheetFile('MASTER CROSS-REF,,\nService,Key,Appears on\nGrass seeding,{{custom_values.service_4}},"Cat 1, Cat 2, Cat 3, Cat 4"\nHardscaping,{{custom_values.service_20}},"Cat 2, Cat 6"\n', 'xref.csv');
o2 = C.compare([...sheets, xref], resolved);
chk('A cross-ref tab is parsed and compared: matching rows pass, services on 2+ resolver tabs missing from it are listed', xref.kind === 'crossref' && xref.rows.length === 2 && !o2.content.some(l => /Cross-ref: service_4\b.* on the sheet/.test(l)) && !o2.content.some(l => /Cross-ref: service_20 .*on the sheet/.test(l)) && o2.content.some(l => /Cross-ref: service_1 "Lawn mowing and maintenance" .*missing from the sheet's cross-ref/.test(l)), o2.content.filter(l => /Cross-ref/.test(l)).slice(0, 3).join(' | '), '');

// CLI: exit codes, and nothing written
const before = files.map(f => fs.statSync(f).mtimeMs).join();
let code = 0, text = '';
try { text = execFileSync(process.execPath, [path.join(root, 'tools/check-against-sheet.js'), 'landscapers-gardeners', '--ticks', path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'), '--rule', 'ticked_or_propagated', ...files], { encoding: 'utf8' }); } catch (e) { code = e.status; text = e.stdout; }
chk('CLI prints content and order sections separately and exits 1 when content differs', code === 1 && /Content differences \(5\)/.test(text) && /Order differences \(2\)/.test(text) && text.indexOf('Content differences') < text.indexOf('Order differences'), text.slice(0, 200), '');
let usage = 0; try { execFileSync(process.execPath, [path.join(root, 'tools/check-against-sheet.js'), 'landscapers-gardeners'], { stdio: 'pipe' }); } catch (e) { usage = e.status; }
chk('CLI without ticks or files prints usage and exits 2', usage === 2, usage, 2);
chk('Read-only: the sheet files are untouched', files.map(f => fs.statSync(f).mtimeMs).join() === before, '', '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
