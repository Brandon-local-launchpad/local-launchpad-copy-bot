'use strict';
// Fixture: the niche file generator (tools/build-niche-services.js) on small synthetic
// snippets for each PDF layout it handles, the resolver's alwaysCreate flag, and the
// generated files (names, flags, drafts not loaded). The PDFs themselves are
// git-ignored; when they are present, the committed files must match a fresh build.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const B = require(path.join(root, 'tools/build-niche-services.js'));
const fieldMap = require(path.join(root, 'fillout/field-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: niche file generator and alwaysCreate ===\n');
const lines = s => s.split('\n');
const sec = s => B.parseSection(lines(s));
const names = r => r.categories.map(c => c.name).join('|');

(async () => {
  // ── Layouts ──
  let r = sec('Drainage Service\n☐ Drain Unblocking\n ☐ CCTV Drain Surveys\n  □ Gully Cleaning\nPlumbing\n- Tap installation\n– Tap repair\n• Shower repair');
  chk('☐ / □ glyphs (with or without leading spaces), "-", "–" and "•" bullets', names(r) === 'Drainage Service|Plumbing' && r.categories[0].services.map(s => s.name).join('|') === 'Drain Unblocking|CCTV Drain Surveys|Gully Cleaning' && r.categories[1].services.length === 3, JSON.stringify(r.categories.map(c => c.services.map(s => s.name))), '');
  r = sec('Category – Pet Groomer\n● Dog grooming\nCategory - Gas Engineer:\n● Boiler service\nCategory - Furnace repair service\n● Furnace repair');
  chk('"Category –" / "Category -" prefixes, with or without a trailing colon', names(r) === 'Pet Groomer|Gas Engineer|Furnace repair service', names(r), '');
  r = sec('FENCE CONTRACTOR\n● Fence installation\nDECK BUILDER\n● Deck repair');
  chk('Upper-case headings become title case', names(r) === 'Fence Contractor|Deck Builder', names(r), '');
  r = sec('Locksmith\n● Car digital and remote key reprogramming (Duplicate: Emergency Locksmith\nService, Key Duplication Service)\n● Delivery\n● Garden maintenance for commercial\nproperties\n● Paving-\nrelated drainage');
  const s0 = r.categories[0].services;
  chk('A bullet wrapped over lines: open bracket, lower-case start, trailing hyphen', s0.length === 4 && s0[0].name === 'Car digital and remote key reprogramming' && s0[0].dup.join('|') === 'Emergency Locksmith Service|Key Duplication Service' && s0[2].name === 'Garden maintenance for commercial properties' && s0[3].name === 'Paving-related drainage', JSON.stringify(s0.map(s => s.name)), '');
  r = sec('Dog Walker\n● Cat sitting (in-home) (Duplicate: Pet sitter)\n● Dog walking');
  chk('Brackets in a service name are kept; only "(Duplicate: …)" is a note', r.categories[0].services[0].name === 'Cat sitting (in-home)' && r.categories[0].services[0].dup.join() === 'Pet sitter', JSON.stringify(r.categories[0].services[0]), '');
  r = sec('Gas Engineer\n(Custom services)\n● Gas safety certificates\nDrainage Service\n● Drain Unblocking (Custom)');
  chk('"(Custom services)" is a category note; a "(Custom)" suffix is a flag, not part of the name', r.categories[0].notes[0].note === '(Custom services)' && r.categories[0].services.length === 1 && r.categories[1].services[0].name === 'Drain Unblocking' && r.categories[1].services[0].custom === true, JSON.stringify(r.categories), '');
  r = sec('Category – Window Cleaning Service\n● Solar panel cleaning\n(Glass and mirror cleaning, Gutter cleaning, Power/pressure washing have been removed as they are already\ncovered above.)\nCategory – Gutter Cleaning Service\nNo unique services (all services already covered above).\nPet sitter\nNo unique services (all services already covered under Dog Walker).');
  chk('Tick-box notes ("… have been removed …" over two lines, "No unique services …") are notes, not services or categories', names(r) === 'Window Cleaning Service|Gutter Cleaning Service|Pet sitter' && r.categories[0].services.length === 1 && /have been removed/.test(r.categories[0].notes[0].note) && r.categories[1].services.length === 0 && /No unique services/.test(r.categories[1].notes[0].note), JSON.stringify(r.categories.map(c => [c.name, c.services.length, c.notes.length])), '');
  r = sec('Blast Cleaning Service\n● No predefined services available in GBP');
  chk('A bullet that says "No predefined services …" is a note: a category with zero services', r.categories[0].services.length === 0 && r.categories[0].notes.length === 1, JSON.stringify(r.categories[0]), '');
  r = sec('Output 2 – All Categories & Services\n(With Duplicate Tracking)\nLocksmith\n● Delivery\nOnboarding Categories & Services\n& Services');
  chk('Boilerplate lines (Output N, "(With Duplicate Tracking)", wrapped heading tails) are skipped', names(r) === 'Locksmith', names(r), 'Locksmith');
  r = sec('Kitchen Renovator\n● Kitchen design\nRemodeller\nNo unique services (all services are already covered above).\nConstruction Company\n● Demolition');
  chk('A category with a note and no bullets has zero own tick-box services', r.categories[1].name === 'Remodeller' && r.categories[1].services.length === 0, JSON.stringify(r.categories[1]), '');
  r = sec('● Roof repair\n● Roof inspection');
  chk('Bullets before any heading are kept as unplaced (the builder gives them to a single-category niche)', r.unplaced.length === 2 && !r.categories.length, JSON.stringify(r.unplaced), '');

  // Additional services question: instructions stripped, examples kept as help text
  const add = B.splitAdditional(lines('Roofing services\n● Roof repair\nRoofer Additional Services\nPlease list any roofing services you offer that weren\'t included in the tick-box options\nabove.\nBe as specific as possible.\nExamples:\n● Chimney repairs\n● Lead flashing\n⚠ Please take a few minutes to be thorough.\nEven if it\'s a service you only provide occasionally, please include it below.'));
  chk('The additional-services question: the tick list stops before it, instructions are dropped, only the examples are kept', add.tick.length === 2 && add.additional.length === 1 && add.additional[0].heading === 'Roofer Additional Services' && add.additional[0].examples.join('|') === 'Chimney repairs|Lead flashing', JSON.stringify(add), '');
  const add2 = B.splitAdditional(lines('Plumbing\n☐ Tap repair\nDrainage Additional Services\nExamples:\n● Drain survey\nPlumbing Additional Services\nExamples:\n● Radiator bleed'));
  chk('Two additional-services questions (Drainage, Heating) are kept apart', add2.additional.length === 2 && add2.additional[1].examples.join() === 'Radiator bleed', JSON.stringify(add2.additional), '');

  // Headings: wrapped titles, Output 1/2 either way round, a niche with no title
  const doc = ['Dog Groomer Onboarding All Categories', '& Services', 'Pet Groomer', '● Dog grooming', 'Dog Groomer Tick Box Onboarding Categories &', 'Services', 'Category – Pet Groomer', '● Dog grooming',
    'Drainage Onboarding All Categories & Services', 'Output 1: Google Categories & Services', 'Drainage Service', '● Drain repairs', 'Drainage Onboarding Tick Box Categories & Services', '', 'Output 2: Tick Box Onboarding Form', 'Drainage Service', '☐ Drain repairs',
    'Output 2 – All Categories & Services', '(With Duplicate Tracking)', 'Locksmith', '● Delivery', 'Output 1 – Tick Box Onboarding Form', '(Deduplicated)', 'Locksmith', '● Delivery',
    'Pressure Washing / Exterior Cleaning', 'Onboarding All Categories & Services', 'Pressure Washing Service', '● Patio cleaning', 'Pressure Washing / Exterior Cleaning Tick Box', 'Onboarding Categories & Services', 'Category – Pressure Washing Service', '● Patio cleaning'].join('\n');
  const split = B.splitNiches(doc);
  chk('Niche headings: wrapped titles, "Output 1/Output 2" the opposite way round, a niche with no title (Locksmith)', split.map(n => n.title).join('|') === 'Dog Groomer|Drainage||Pressure Washing / Exterior Cleaning' && split.every(n => !n.error), JSON.stringify(split.map(n => [n.title, n.error])), '');
  chk('Each niche splits into an All and a Tick section, whichever "Output" number they carry', B.parseSection(split[1].all).categories[0].services[0].name === 'Drain repairs' && B.parseSection(split[1].tick).categories[0].name === 'Drainage Service' && B.parseSection(split[2].all).categories[0].name === 'Locksmith' && B.parseSection(split[3].tick).categories[0].name === 'Pressure Washing Service', '', '');

  // Two copies of the All list: a draft, never loaded
  const twice = sec('Central Heating Service\n● Boiler repair\nPlumber\n● Tap repair\nCategory - Central Heating Service\n- Boiler Repairs\n- Thermostat installation\n- Thermostat installation');
  chk('A category met twice in one All list starts a second copy (Plumbing & Heating)', B.splitCopies(twice.categories).length === 2 && B.splitCopies(twice.categories)[1][0].services.length === 3, JSON.stringify(B.splitCopies(twice.categories).map(c => c.map(x => x.name))), '');

  // A whole niche from snippets: tick group mapping, primary, examples, declared source errors
  const def = { title: 'Window Cleaning', niche: 'Window Cleaning', primary: 'Window Cleaning Service' };
  const built = B.buildNiche(def, lines('Window Cleaning Service\n● Window cleaning\n● Gutter cleaning (Duplicate: Gutter Cleaning Service)\nGutter Cleaning Service\n● Gutter cleaning\n● Fascia cleaning'),
    lines('Category – Window Cleaning Service\n● Window cleaning\n● Gutter cleaning\nCategory – Gutter Cleaning Service\n● Fascia cleaning\nWindow Cleaning Additional Services\nExamples:\n● Conservatory roof cleaning'), fieldMap);
  const wc = built.config;
  chk('A built niche: dropdown label, field-map tick groups, the other services field, examples as help text (not services), primary', wc.niche === 'Window Cleaning' && wc.nicheKey === 'window_cleaning' && wc.categories[0].tickGroup === 'window_cleaning.cat.window_cleaning_service' && wc.categories[1].tickGroup === null && wc.additionalServicesField === 'window_cleaning.other_services' && wc.additionalTickGroup.services.length === 0 && wc.additionalTickGroup.examples.join() === 'Conservatory roof cleaning' && wc.primaryDefault === 'window_cleaning_service', JSON.stringify(wc).slice(0, 300), '');
  chk('Note disagreements the PDF makes are declared for review (reported, not failed); duplicate notes kept verbatim', wc.categories[0].duplicateNotes['Gutter cleaning'].join() === 'Gutter Cleaning Service' && (wc.knownSourceErrors || []).some(k => k.code === 'missing_note' && k.category === 'gutter_cleaning_service' && /Awaiting Brandon/.test(k.why)), JSON.stringify(wc.knownSourceErrors), '');
  chk('A niche label that is not a dropdown label is reported', !!B.buildNiche({ title: 'X', niche: 'Chimney Sweeps', primary: 'x' }, [], [], fieldMap).report.issues.length, '', '');

  // ── alwaysCreate in the resolver ──
  const cfg = { niche: 'T', categories: [
    { key: 'shop', name: 'Shop', tickGroup: 't.shop', ticks: ['Curtain making', 'Blind fitting'], services: ['Curtain making', 'Blind fitting'] },
    { key: 'fitter', name: 'Fitter', tickGroup: null, alwaysCreate: true, ticks: [], services: ['Curtain making'] },
    { key: 'other', name: 'Other', tickGroup: null, ticks: [], services: ['Blind fitting'] },
  ], primaryDefault: 'shop' };
  const tabs = (ticks, rule) => R.resolve(ticks, cfg, { categoryTabRule: rule }).categories.map(c => `${c.key}:${c.rows.length}`).join(',');
  chk('ticked_only: an alwaysCreate category gets a tab though nothing in its own group was ticked (with the services that propagate into it)', tabs({ 't.shop': ['Curtain making', 'Blind fitting'] }, 'ticked_only') === 'shop:2,fitter:1', tabs({ 't.shop': ['Curtain making', 'Blind fitting'] }, 'ticked_only'), 'shop:2,fitter:1');
  chk('ticked_only: an alwaysCreate category gets a tab even when the client ticked nothing at all (empty tab)', tabs({}, 'ticked_only') === 'fitter:0', tabs({}, 'ticked_only'), 'fitter:0');
  chk('ticked_or_propagated ignores the flag: a tab only when services propagate into it', tabs({ 't.shop': ['Blind fitting'] }, 'ticked_or_propagated') === 'shop:1,other:1' && tabs({}, 'ticked_or_propagated') === '', tabs({ 't.shop': ['Blind fitting'] }, 'ticked_or_propagated'), 'shop:1,other:1');
  chk('Without the flag nothing changes: "Other" gets no tab under ticked_only', !tabs({ 't.shop': ['Blind fitting'] }, 'ticked_only').includes('other'), '', '');
  chk('alwaysCreate must be exactly true (a truthy string does not count)', (() => { const c2 = JSON.parse(JSON.stringify(cfg)); c2.categories[1].alwaysCreate = 'yes'; return !R.resolve({}, c2).categories.length; })(), '', '');

  // ── The generated files ──
  const files = fs.readdirSync(path.join(root, 'fillout/services')).filter(f => f.endsWith('.json'));
  const configs = files.map(f => JSON.parse(fs.readFileSync(path.join(root, 'fillout/services', f), 'utf8')));
  chk('28 niche files loaded by the resolver: every Fillout niche, Plumbing & Heating included', configs.length === 28 && Object.keys(fieldMap.niches).every(n => configs.some(c => c.niche === n)), configs.length, 28);
  chk('Every niche name is a Fillout dropdown label, and its nicheKey the field map key', configs.every(c => fieldMap.niches[c.niche] && fieldMap.niches[c.niche].key === c.nicheKey), configs.filter(c => !fieldMap.niches[c.niche]).map(c => c.niche).join(), '');
  chk('alwaysCreate is true only for Curtain Fitter in Blinds & Curtains Fitters', configs.flatMap(c => c.categories.filter(k => k.alwaysCreate === true).map(k => `${c.niche}/${k.name}`)).join() === 'Blinds & Curtains Fitters/Curtain Fitter', configs.flatMap(c => c.categories.filter(k => k.alwaysCreate).map(k => `${c.niche}/${k.name}`)).join(), '');
  chk('Every new file says it is generated; landscapers-gardeners.json is the hand-checked one', configs.filter(c => c.niche !== 'Landscapers/Gardeners').every(c => /tools\/build-niche-services\.js/.test(c._about)) && !/build-niche-services/.test(configs.find(c => c.niche === 'Landscapers/Gardeners')._about), '', '');
  const ph = R.configFor('Plumbing & Heating');
  chk('Plumbing & Heating loads copy 1 ("Boiler repair" wording, 4 categories as the tick box) and keeps copy 2 as an archived reference', ph && ph.categories.map(c => c.name).join('|') === 'Central Heating Service|Plumber|Furnace Repair Service|Gas Engineer' && ph.categories[3].services.includes('Boiler repair') && !ph.categories.some(c => c.services.includes('Boiler Repairs')) && ph.archivedCopies.length === 1 && ph.archivedCopies[0].copy === 2 && ph.archivedCopies[0].categories[3].services.includes('Boiler Repairs') && !fs.existsSync(path.join(root, 'fillout/services/drafts/plumbing-and-heating.draft.json')), '', '');
  const phr = R.resolve({ cat_gas_engineer: ['Boiler repair'], cat_central_heating_service: ['Thermostat installation'] }, ph);
  chk('The archived copy is never read: "Boiler repair" resolves from copy 1; "Boiler Repairs" (copy 2 wording) would be unmatched', phr.categories.some(c => c.rows.some(r => r.name === 'Boiler repair')) && R.resolve({ cat_gas_engineer: ['Boiler Repairs'] }, ph).flags.some(f => f.code === 'unmatched_tick'), JSON.stringify(phr.categories.map(c => c.key)), '');
  const blinds = R.configFor('Blinds & Curtains Fitters');
  const bt = R.resolve({ [blinds.categories[0].tickGroup]: blinds.categories[0].ticks.slice(0, 2) }, blinds);
  chk('Blinds & Curtains Fitters, ticked_only: ticking Curtain Shop only also gives Curtain Fitter its tab', bt.categories.map(c => c.key).join() === 'curtain_shop,curtain_fitter', bt.categories.map(c => c.key).join(), 'curtain_shop,curtain_fitter');

  // When the PDFs are here, the committed files are exactly what the generator builds
  const src = path.join(root, 'docs/niches-source');
  if (fs.existsSync(src) && fs.readdirSync(src).filter(f => /\.pdf$/i.test(f)).length >= 2) {
    const { execFileSync } = require('child_process');
    const before = files.map(f => fs.readFileSync(path.join(root, 'fillout/services', f), 'utf8')).join('\n');
    execFileSync(process.execPath, [path.join(root, 'tools/build-niche-services.js'), '--write'], { stdio: 'pipe' });
    const after = files.map(f => fs.readFileSync(path.join(root, 'fillout/services', f), 'utf8')).join('\n');
    chk('A fresh build from the PDFs reproduces the committed files byte for byte', before === after, '', '');
  } else console.log('  (PDFs not present: the rebuild check is skipped)');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
