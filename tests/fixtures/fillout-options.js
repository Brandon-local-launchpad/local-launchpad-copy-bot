'use strict';
// Fixture: the Fillout option labels (tools/fetch-fillout-options.js, no network here: a
// stubbed form), the options recorded in fillout/field-map.json for every niche tick group,
// the generator's ticksFromForm rule (Guttering & Fascias, Tiling, Plumbing & Heating), and
// the niche check comparing additional groups through their examples.
const path = require('path');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const B = require(path.join(root, 'tools/build-niche-services.js'));
const F = require(path.join(root, 'tools/fetch-fillout-options.js'));
const { checkNiche } = require(path.join(root, 'fillout/services/check-niche.js'));
const fieldMap = require(path.join(root, 'fillout/field-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Fillout option labels and ticksFromForm ===\n');
const clone = o => JSON.parse(JSON.stringify(o));
const lines = s => s.split('\n');

// ── The comparison: trivial vs real ──
const c = F.compare(['Obedience training', 'Gutter repair', "Children’s parties", 'Fascia installation', 'Lead  flashing'], ['obedience training', 'Gutter repairs', "Children's parties", 'Roof installation', 'Lead flashing', 'Skylight repair']);
chk('Trivial differences: case, apostrophe style, double spaces', c.trivial.map(t => t.fillout).join('|') === "Obedience training|Children’s parties|Lead  flashing", JSON.stringify(c.trivial), '');
chk('Real differences: a plural paired side by side; a different word is not paired just for sharing "installation"', c.reworded.length === 1 && c.reworded[0].fillout === 'Gutter repair' && c.reworded[0].file === 'Gutter repairs' && c.onlyFillout.join() === 'Fascia installation' && c.onlyFile.join('|') === 'Roof installation|Skylight repair', JSON.stringify(c), '');

// ── withOptions: only niche tick groups, after "type", nothing else changes ──
const tiny = { niches: { 'T': { key: 't', first_question_id: 'q1', last_question_id: 'q3' } }, fields: [
  { id: 'q1', key: 't.cat.a', label: 'A', type: 'Checkboxes', niche: 'T' },
  { id: 'q2', key: 't.other', label: 'Other', type: 'LongAnswer', niche: 'T' },
  { id: 'q3', key: 't.cat.b', label: 'B', type: 'Checkboxes', options: ['One'], niche: 'T' },
  { id: 'q9', key: 'all.x', label: 'X', type: 'Checkboxes', niche: 'all' },
] };
const form = { questions: [{ id: 'q1', type: 'Checkboxes', name: 'A', options: [{ label: 'Alpha' }, { label: 'Beta' }] }, { id: 'q2', type: 'LongAnswer', name: 'Other' }, { id: 'q3', type: 'Checkboxes', name: 'B', options: [{ label: 'One' }] }, { id: 'q9', type: 'Checkboxes', name: 'X', options: [{ label: 'Z' }] }] };
const w = F.withOptions(tiny, form);
chk('withOptions: adds options right after "type" to niche tick groups, leaves recorded ones and non-niche questions alone', JSON.stringify(Object.keys(w.map.fields[0])) === JSON.stringify(['id', 'key', 'label', 'type', 'options', 'niche']) && w.map.fields[0].options.join() === 'Alpha,Beta' && !w.map.fields[3].options && w.changes.map(x => x.kind).join() === 'added,unchanged' && JSON.stringify(tiny.fields[0]) === JSON.stringify({ id: 'q1', key: 't.cat.a', label: 'A', type: 'Checkboxes', niche: 'T' }), JSON.stringify(w), '');

// ── The recorded options ──
const nicheGroups = fieldMap.fields.filter(f => f.niche !== 'all' && f.type === 'Checkboxes');
chk('Options are recorded for all 112 niche tick groups in field-map.json', nicheGroups.length === 112 && nicheGroups.every(f => Array.isArray(f.options) && f.options.length), `${nicheGroups.filter(f => f.options).length} of ${nicheGroups.length}`, '112 of 112');
chk('The landscaper options (from the Master Context Document) are unchanged and match Fillout, "Deck remodelling" included', fieldMap.fields.find(f => f.key === 'landscapers.cat.deck_builder').options.includes('Deck remodelling'), '', '');

// ── ticksFromForm ──
const gut = R.configFor('Guttering & Fascias'), til = R.configFor('Tiling'), ph = R.configFor('Plumbing & Heating');
const gField = fieldMap.fields.find(f => f.key === gut.categories[0].tickGroup);
chk('Guttering & Fascias: the tick boxes are Fillout\'s 6 labels; the All list keeps the PDF\'s 13 and gains the 4 form-only labels at the end', gut.categories[0].ticks.join('|') === gField.options.join('|') && gut.categories[0].ticks.length === 6 && gut.categories[0].services.length === 17 && gut.categories[0].services.slice(0, 13).includes('Roof repair') && gut.categories[0].formOnlyServices.join('|') === 'Gutter repair|Fascia installation|Soffit replacement|Cladding' && gut.categories[0].ticksFromForm === true, JSON.stringify(gut.categories[0].formOnlyServices), '');
chk('Tiling: Fillout\'s 5 labels are the tick boxes and are appended to the 35 PDF entries', til.categories[0].ticks.join('|') === 'Wall tiling|Floor tiling|Bathroom tiling|Kitchen splashback|Mosaic tiling' && til.categories[0].services.length === 40 && til.categories[0].formOnlyServices.length === 5, JSON.stringify(til.categories[0].ticks), '');
chk('Plumbing & Heating: Plumbing Additional Services takes Fillout\'s 31 labels as its examples; its category groups were already identical', ph.extraAdditionalTickGroups[0].examples.length === 31 && ph.extraAdditionalTickGroups[0].examples[0] === 'Power flushing' && ph.categories.filter(k => k.tickGroup).every(k => !k.formOnlyServices), '', '');
chk('PDF entries nobody can now tick are declared (c) "no tick-box home", for review', (gut.knownSourceErrors || []).filter(k => k.code === 'no_home' && k.type === 'c').length === 11 && (til.knownSourceErrors || []).filter(k => k.code === 'no_home' && k.type === 'c').length === 35, '', '');
for (const [cfg, name] of [[gut, 'Guttering & Fascias'], [til, 'Tiling'], [ph, 'Plumbing & Heating']]) {
  const ticks = {};
  for (const k of cfg.categories) if (k.tickGroup) ticks[k.tickGroup] = fieldMap.fields.find(f => f.key === k.tickGroup).options;
  for (const g of [cfg.additionalTickGroup, ...(cfg.extraAdditionalTickGroups || [])].filter(Boolean)) ticks[g.field] = fieldMap.fields.find(f => f.key === g.field).options;
  const r = R.resolve(ticks, cfg);
  chk(`${name}: a client ticking every Fillout option gets rows for every category tick and no unmatched-tick flag`, !r.flags.some(f => f.code === 'unmatched_tick') && cfg.categories.filter(k => k.tickGroup).every(k => k.ticks.every(t => r.categories.find(x => x.key === k.key).rows.some(row => R.norm(row.name) === R.norm(t)))), JSON.stringify(r.flags.filter(f => f.code === 'unmatched_tick').map(f => f.value).slice(0, 5)), '');
}
chk('No other niche uses ticksFromForm', R.configFor('Roofers').categories.every(k => !k.ticksFromForm) && R.configFor('Window Cleaning').categories.every(k => !k.ticksFromForm), '', '');

// The rule on a snippet: options win over the PDF tick list only when the niche asks for it
const fm2 = clone(fieldMap); fm2.fields.find(f => f.key === 'tiling.cat.select_the_tiling_services_you_offer').options = ['Wall tiling', 'Grout repair'];
const snipAll = lines('Tile contractor\n● Grout repair\n● Tile removal'), snipTick = lines('Tile contractor\n● Grout repair\n● Tile removal');
const on = B.buildNiche({ title: 'Tiling', niche: 'Tiling', primary: 'Tile contractor', ticksFromForm: true }, snipAll, snipTick, fm2).config.categories[0];
const off = B.buildNiche({ title: 'Tiling', niche: 'Tiling', primary: 'Tile contractor' }, snipAll, snipTick, fm2).config.categories[0];
chk('ticksFromForm on: ticks = options, a label already in the All list is not added twice; off: ticks = the PDF tick list', on.ticks.join() === 'Wall tiling,Grout repair' && on.services.join() === 'Grout repair,Tile removal,Wall tiling' && on.formOnlyServices.join() === 'Wall tiling' && off.ticks.join() === 'Grout repair,Tile removal' && !off.formOnlyServices, JSON.stringify([on, off]), '');

// ── The niche check: every niche against the real form; additional groups through their examples ──
const fs = require('fs');
const files = fs.readdirSync(path.join(root, 'fillout/services')).filter(f => f.endsWith('.json'));
const results = files.map(f => checkNiche(JSON.parse(fs.readFileSync(path.join(root, 'fillout/services', f), 'utf8')), fieldMap));
chk('Every niche file passes the check against the recorded Fillout options, and none is "options not recorded"', results.every(r => !r.errors.length) && !results.some(r => r.notices.some(n => n.code === 'options_not_recorded')), results.filter(r => r.errors.length).map(r => r.niche + ': ' + r.errors[0].msg).join(' | '), '');
const wc = JSON.parse(JSON.stringify(R.configFor('Window Cleaning'))); wc.additionalTickGroup.examples = wc.additionalTickGroup.examples.filter(x => x !== 'Graffiti removal');
chk('An additional group is compared through its examples: a Fillout option missing from them fails, naming the group and the option', checkNiche(wc, fieldMap).errors.some(e => /checkbox option "Graffiti removal".*window_cleaning_additional_services/.test(e.msg)), checkNiche(wc, fieldMap).errors.map(e => e.msg).join(' | '), '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
