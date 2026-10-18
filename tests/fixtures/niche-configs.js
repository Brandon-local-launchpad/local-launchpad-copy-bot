'use strict';
// Fixture: every niche file in fillout/services/ passes the niche check
// (fillout/services/check-niche.js), so a new niche is covered the moment its file
// is added. Then broken copies, including a temporary niche file on disk, are
// rejected with messages that name the niche, category and service.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const dir = path.join(root, 'fillout/services');
const R = require(path.join(dir, 'resolver.js'));
const { checkNiche } = require(path.join(dir, 'check-niche.js'));
const fieldMap = require(path.join(root, 'fillout/field-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: niche files (fillout/services/*.json) ===\n');
const clone = o => JSON.parse(JSON.stringify(o));
const files = () => fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// ── Every real niche file ──
chk('At least one niche file exists', files().length >= 1, files().join(), '>= 1');
for (const f of files()) {
  const config = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const r = checkNiche(config, fieldMap);
  chk(`${f}: no errors`, !r.errors.length, '\n    ' + r.errors.map(e => e.msg).join('\n    '), 'none');
  // Declared source errors: (a) reported apart from (b) and (c); other notices after
  if (r.declared.a.length) { console.log(`  declared (a) note says duplicate of X, X's list lacks the service: ${r.declared.a.length}`); for (const n of r.declared.a) console.log('    ' + n.msg); }
  if (r.declared.b.length || r.declared.c.length) console.log(`  declared (b) in 2+ categories with no note: ${r.declared.b.length} · (c) other: ${r.declared.c.length}`);
  for (const n of r.notices.filter(n => !n.sourceErrorType)) console.log('  notice: ' + n.msg);
}

// ── Broken copies are rejected, with readable messages ──
const base = R.loadConfig('landscapers-gardeners');
const msgs = (config, map = fieldMap) => checkNiche(config, map).errors.map(e => e.msg);
let c = clone(base); c.categories[6].ticks.push('Hot tub decks');
chk('A tick-box service missing from the All list fails, naming niche, category and service', msgs(c).some(m => /^Landscapers\/Gardeners: category "Deck Builder" has the tick box "Hot tub decks", which is missing from its All list/.test(m)), msgs(c).join(' | '), '');
c = clone(base); const fm = clone(fieldMap); fm.fields.find(x => x.key === 'landscapers.cat.tree_service').options.push('Tree surgery');
chk('A checkbox option with no service fails', msgs(base, fm).some(m => /category "Tree Service": checkbox option "Tree surgery" in field-map.json \(landscapers.cat.tree_service\) has no tick-box service/.test(m)), msgs(base, fm).join(' | '), '');
const fm2 = clone(fieldMap); fm2.fields.find(x => x.key === 'landscapers.cat.tree_service').options = fm2.fields.find(x => x.key === 'landscapers.cat.tree_service').options.filter(o => o !== 'Tree planting');
chk('A tick-box service with no checkbox option fails', msgs(base, fm2).some(m => /category "Tree Service": service "Tree planting" has no matching checkbox option/.test(m)), msgs(base, fm2).join(' | '), '');
chk('Options match on normalised names (case and spaces)', (() => { const f3 = clone(fieldMap); const g = f3.fields.find(x => x.key === 'landscapers.cat.tree_service'); g.options = g.options.map(o => '  ' + o.toUpperCase()); return !msgs(base, f3).some(m => /Tree Service/.test(m)); })(), '', '');
c = clone(base); c.categories[4].services.push('Tree removal');
chk('A category listing a service twice fails', msgs(c).some(m => /category "Tree Service" lists "Tree removal" twice/.test(m)), msgs(c).join(' | '), '');
c = clone(base); c.categories[0].duplicateNotes['Hedge trimming'] = ['Landscape Gardener'];
chk('A duplicate note that disagrees with the lists fails when not declared', msgs(c).some(m => /category "Gardener", service "Hedge trimming".*declare it in knownSourceErrors/.test(m)), msgs(c).join(' | '), '');
c = clone(base); c.knownSourceErrors = [];
chk('Without the declarations, the three missing Gardener notes fail', msgs(c).filter(m => /duplicate|note/i.test(m) && /"Gardener"/.test(m)).length === 3, msgs(c).join(' | '), '3');
chk('Declared source errors are reported as notices, not failures', checkNiche(base, fieldMap).notices.filter(n => n.code === 'missing_note').length === 3, '', '3');
c = clone(base); c.primaryDefault = 'pond_builder';
chk('A primaryDefault that is not a category fails', msgs(c).some(m => /primaryDefault "pond_builder" is not a category in the file/.test(m)), msgs(c).join(' | '), '');
c = clone(base); c.categories[2].tickGroup = 'landscapers.cat.nope';
chk('A tick group missing from the field map fails', msgs(c).some(m => /category "Landscape Designer": tick group landscapers.cat.nope is not in field-map.json/.test(m)), msgs(c).join(' | '), '');

// ── Source-error types: (a) reported apart from (b) and (c) ──
const { classifySourceError } = require(path.join(dir, 'check-niche.js'));
const tc = { niche: 'T', primaryDefault: 'x', categories: [
  { key: 'x', name: 'X', tickGroup: null, ticks: ['One', 'Two', 'Three'], services: ['One', 'Two', 'Three'], duplicateNotes: { One: ['Y'], Three: ['Nowhere'] } },
  { key: 'y', name: 'Y', tickGroup: null, ticks: [], services: ['Two'], duplicateNotes: {} },
] };
chk('Type a: the note says duplicate of Y, but Y does not list the service', classifySourceError(tc, { code: 'note_without_duplicate', category: 'x', service: 'One' }).type === 'a' && classifySourceError(tc, { code: 'note_without_duplicate', category: 'x', service: 'One' }).missingFrom.join() === 'y', '', '');
chk('Type b: in 2+ categories with no note naming the other', classifySourceError(tc, { code: 'missing_note', category: 'x', service: 'Two' }).type === 'b', '', '');
chk('Type c: a note naming something that is not a category, and anything not about notes', classifySourceError(tc, { code: 'note_names_unknown_category', category: 'x', service: 'Three' }).type === 'c' && classifySourceError(tc, { code: 'no_home', category: null, service: 'Four' }).type === 'c', '', '');
const tc2 = JSON.parse(JSON.stringify(tc)); tc2.knownSourceErrors = [{ code: 'note_without_duplicate', category: 'x', service: 'One' }, { code: 'missing_note', category: 'x', service: 'Two' }, { code: 'missing_note', category: 'y', service: 'Two' }, { code: 'note_names_unknown_category', category: 'x', service: 'Three' }];
const rc = checkNiche(tc2, fieldMap);
chk('Validation reports declared source errors grouped: (a) apart from (b) and (c)', rc.declared.a.length === 1 && rc.declared.b.length === 2 && rc.declared.c.length === 1 && !rc.errors.some(e => /duplicate_note/.test(e.code)), JSON.stringify([rc.declared.a.length, rc.declared.b.length, rc.declared.c.length, rc.errors.map(e => e.code)]), '[1,2,1]');
chk('Every generated declaration starts with its type, and the type matches the classifier', files().every(f => { const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return c.niche === 'Landscapers/Gardeners' || (c.knownSourceErrors || []).every(k => Object.keys(k)[0] === 'type' && k.type === classifySourceError(c, k).type); }), '', '');

// ── A deliberately broken temporary niche file on disk, picked up by the loop ──
const tmp = path.join(dir, 'zz-temp-broken-niche.json');
try {
  const broken = { niche: 'Temp Broken Niche', nicheKey: 'temp_broken', primaryDefault: 'missing', categories: [{ key: 'cat_a', name: 'Cat A', tickGroup: 'temp.cat.a', ticks: ['Thing one', 'Thing two'], services: ['Thing one', 'Thing one'], duplicateNotes: {} }] };
  fs.writeFileSync(tmp, JSON.stringify(broken));
  const found = files().includes('zz-temp-broken-niche.json');
  const r = checkNiche(JSON.parse(fs.readFileSync(tmp, 'utf8')), fieldMap);
  const text = r.errors.map(e => e.msg).join('\n');
  chk('A temporary broken niche file is found by the loop and rejected', found && r.errors.length >= 4, text, '>= 4 errors');
  chk('Its messages are readable: niche, category and service named', /^Temp Broken Niche: primaryDefault "missing" is not a category/m.test(text) && /^Temp Broken Niche: category "Cat A" lists "Thing one" twice/m.test(text) && /^Temp Broken Niche: category "Cat A" has the tick box "Thing two", which is missing from its All list/m.test(text) && /^Temp Broken Niche: category "Cat A": tick group temp.cat.a is not in field-map.json/m.test(text), text, '');
  console.log('  sample message:\n    ' + r.errors.map(e => e.msg).join('\n    '));
} finally { fs.rmSync(tmp, { force: true }); }
chk('The temporary file is removed', !files().includes('zz-temp-broken-niche.json'), '', '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
