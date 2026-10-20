'use strict';
// Fixture: the niche services library (niche-library/library.js, plan-v3.resolveLibrary) on the
// page map. Each verdict (page as the UK name with the GBP source, alias absorbed with every
// parent kept, fold onto the named category which keeps the keyword, exclude with no mention),
// research candidates using the target name, names not in the library falling through to the
// heuristics and flagged, the client exclude applying after the library to pages only, a fold
// whose target category is not in the plan, the CSV reader, and the real landscaper library.
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.join(__dirname, '../..');
const G = require(path.join(root, 'page-map/generator.js'));
const V3 = require(path.join(root, 'page-map/plan-v3.js'));
const L = require(path.join(root, 'niche-library/library.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: niche services library ===\n');

// A small library in a temp file, read like the real ones
const csv = `gbp_name,gbp_category,verdict,target,note
Fencing installation,Gardener,page,Fencing,
Fence building,Deck builder,alias,Fencing,
Deck cleaning,Deck builder,alias,Decking restoration,created from aliases
Wood staining,Deck builder,alias,Decking restoration,
Garden work,Gardener,fold,Gardener,"Just gardening, really"
Lawn pest control,Gardener,fold,Lawn Care Service,not a tab for this client
Desert landscaping,Landscape gardener,exclude,,US only
Bad row,Gardener,maybe,,
No target,Gardener,alias,,
`;
const file = path.join(os.tmpdir(), `copybot-lib-${process.pid}.csv`);
fs.writeFileSync(file, csv);
const lib = L.loadLibrary('Test Niche', { file });
const cats = [
  { key: 'gardener', name: 'Gardener', primary: true, rows: [
    { id: 'fencing installation', name: 'Fencing installation', kind: 'unique' }, { id: 'garden work', name: 'Garden work', kind: 'unique' }, { id: 'lawn pest control', name: 'Lawn pest control', kind: 'unique' },
    { id: 'hedge trimming', name: 'Hedge trimming', kind: 'unique' }, { id: 'garden design', name: 'Garden design', kind: 'unique' }, { id: 'garden designs', name: 'Garden designs', kind: 'unique' } ] },
  { key: 'deck_builder', name: 'Deck Builder', rows: [
    { id: 'fence building', name: 'Fence building', kind: 'unique' }, { id: 'deck cleaning', name: 'Deck cleaning', kind: 'unique' }, { id: 'wood staining', name: 'Wood staining', kind: 'unique' }, { id: 'desert landscaping', name: 'Desert landscaping', kind: 'unique' } ] },
];
const resolved = { categories: cats, primary: 'gardener', primaryName: 'Gardener', crossRef: [], flags: [] };
const input = { resolved, baseTown: 'Southampton', otherTowns: 'Romsey', companyName: 'Acme', terms: { gardener: ['garden maintenance'], _sitewide: [] }, waiting: [] };
const vol = m => new Map(Object.entries(m).map(([k, v]) => [k, { volume: v[0], cpc: v[1] }]));
const volumes = vol({ 'fencing southampton': [210, 2], 'fencing installation southampton': [20, 1], 'hedge trimming southampton': [30, 6], 'garden maintenance southampton': [50, 3], 'fencing romsey': [20, 1] });
const build = (opts = {}) => G.buildPageMap(input, { volumes, library: lib, launchTowns: new Set(['romsey']), ...opts });
const find = (m, slug) => m.rows.find(r => r.slug === slug);
const rec = (m, name) => m.libraryRecords.find(r => r.gbp_name === name);

(async () => {
  chk('The CSV reader: header columns, quoted cells with commas, verdict and target checks; bad rows reported, not loaded', lib.entries.size === 7 && lib.entries.get('garden work').note === 'Just gardening, really' && lib.problems.length === 2 && /"Bad row" has verdict "maybe"/.test(lib.problems[0]) && /"No target" \(alias\) has no target/.test(lib.problems[1]), JSON.stringify(lib.problems), '');
  const m = build();
  // page
  const fencing = find(m, '/services/fencing');
  chk('page: a base service page named by the target (the UK name), the GBP name recorded as its source; no page under the GBP name', fencing && fencing.title === 'Fencing' && fencing.info.gbp_names.join() === 'Fencing installation' && !find(m, '/services/fencing-installation') && rec(m, 'Fencing installation').outcome === 'page' && rec(m, 'Fencing installation').intoName === 'Fencing', JSON.stringify(fencing && fencing.info), '');
  chk('Research candidates use the target name, not the GBP name: "fencing southampton", never "fencing installation southampton"', G.keywordsFor(input, { library: lib }).includes('fencing southampton') && !G.keywordsFor(input, { library: lib }).includes('fencing installation southampton') && m.decisions.get(fencing.page_key).h1 === 'Fencing Southampton' && m.decisions.get(fencing.page_key).volume === 210 && fencing.info.copy_priority === 210, JSON.stringify([m.decisions.get(fencing.page_key).h1, fencing.info.copy_priority]), '');
  // alias
  chk('alias: no page of its own; absorbed into the page whose target it names; the page keeps every parent of every name absorbed, and records "absorbs"', !find(m, '/services/fence-building') && rec(m, 'Fence building').outcome === 'absorbed' && rec(m, 'Fence building').intoName === 'Fencing' && fencing.info.parent_keys.join() === 'gardener,deck_builder' && fencing.info.absorbs.join() === 'Fence building' && find(m, '/gardener').links.cards.some(c => c.to === '/services/fencing') && find(m, '/deck-builder').links.cards.some(c => c.to === '/services/fencing'), JSON.stringify([fencing.info.parent_keys, fencing.info.absorbs]), '');
  const resto = find(m, '/services/decking-restoration');
  chk('alias with no page row for its target: the page is created from the aliases and marked so', resto && resto.info.gbp_names.length === 0 && resto.info.absorbs.join() === 'Deck cleaning,Wood staining' && /page was created from this alias/.test(rec(m, 'Deck cleaning').reason), JSON.stringify(resto && resto.info), '');
  // fold
  chk('fold: no page; listed on the named category page as text, which keeps the keyword; the note travels', !find(m, '/services/garden-work') && rec(m, 'Garden work').outcome === 'folded' && rec(m, 'Garden work').intoName === 'Gardener' && find(m, '/gardener').links.mentioned.includes('Garden work') && !find(m, '/gardener').links_to.some(l => /garden-work/.test(l)) && rec(m, 'Garden work').note === 'Just gardening, really', JSON.stringify([rec(m, 'Garden work'), find(m, '/gardener').links.mentioned]), '');
  chk('fold whose target category is not in the plan: a page under its own name, flagged "fold target missing"', !!find(m, '/services/lawn-pest-control') && rec(m, 'Lawn pest control').outcome === 'page' && rec(m, 'Lawn pest control').flag === 'fold target missing' && /Lawn Care Service/.test(rec(m, 'Lawn pest control').reason), JSON.stringify(rec(m, 'Lawn pest control')), '');
  // exclude
  chk('exclude: no page, not mentioned anywhere', !find(m, '/services/desert-landscaping') && rec(m, 'Desert landscaping').outcome === 'excluded' && !m.rows.some(r => (r.links.mentioned || []).includes('Desert landscaping')) && !G.toCsv(m.rows).includes('Desert landscaping'), '', '');
  // not in library
  chk('Names not in the library fall through to the heuristics and are flagged "not in library": Hedge trimming is a page; Garden designs merges into Garden design, which is a page', rec(m, 'Hedge trimming').flag === 'not in library' && rec(m, 'Hedge trimming').outcome === 'page' && !!find(m, '/services/hedge-trimming') && rec(m, 'Garden designs').outcome === 'merged' && rec(m, 'Garden designs').intoName === 'Garden design' && rec(m, 'Garden designs').flag === 'not in library' && m.libraryCounts.notInLibrary === 3, JSON.stringify(m.libraryRecords.filter(r => !r.in_library).map(r => [r.gbp_name, r.outcome, r.intoName])), '');
  chk('Counts per GBP name: page 4 (Fencing installation, Lawn pest control, and two not in the library), absorbed 3, folded 1, excluded 1, not in library 3 (one merged)', m.libraryCounts.page === 4 && m.libraryCounts.absorbed === 3 && m.libraryCounts.folded === 1 && m.libraryCounts.excluded === 1 && m.libraryCounts.notInLibrary === 3 && m.libraryCounts.merged === 1 && m.libraryCounts.names === 10, JSON.stringify(m.libraryCounts), '');
  chk('Service pages: Fencing, Decking restoration, Lawn pest control, Hedge trimming, Garden design; the Romsey town page for Fencing (20)', m.rows.filter(r => r.type === 'service').map(r => r.title).sort().join() === 'Decking restoration,Fencing,Garden design,Hedge trimming,Lawn pest control' && !!find(m, '/locations/romsey/fencing'), JSON.stringify(m.rows.filter(r => r.type === 'service').map(r => r.title)), '');
  // client exclude, after the library, on pages
  const ex = build({ exclude: new Set(['fencing']) });
  chk('The client exclude applies after the library, to pages: excluding "fencing" makes the Fencing page a mention ("excluded at intake") and the names behind it show it', !find(ex, '/services/fencing') && rec(ex, 'Fencing installation').outcome === 'mentioned' && rec(ex, 'Fence building').outcome === 'mentioned' && find(ex, '/gardener').links.mentioned.includes('Fencing') && ex.services.find(s => s.id === 'fencing').reason === 'excluded at intake', JSON.stringify([rec(ex, 'Fencing installation'), rec(ex, 'Fence building').outcome]), '');
  chk('Excluding a GBP name that is not a page id does nothing (the toggle is on pages)', build({ exclude: new Set(['fence building']) }).rows.some(r => r.slug === '/services/fencing'), '', '');
  // ── Matching across libraries, name + category, fuzzy intake rows, fold beats page, hubs (20 Oct 2026) ──
  const csv2 = `gbp_name,gbp_category,verdict,target,note
Roof installation,Roofing services,page,Roof replacement,
Lawn pest control,Lawn care,page,Lawn pest treatment,another niche's verdict
Patio cleaning,Pressure washing,fold,Gardener,cleaning is the gardener's job here
Deck cleaning,Gardener,exclude,,a different verdict under another category
`;
  const file2 = path.join(os.tmpdir(), `copybot-lib2-${process.pid}.csv`);
  fs.writeFileSync(file2, csv2);
  const lib2 = L.loadLibrary('Other', { file: file2 });
  const ownPlus = `${csv}Patio cleaning,Gardener,page,Patio cleaning,
Deck cleaning,Gardener,exclude,,gardener row
`;
  const file3 = path.join(os.tmpdir(), `copybot-lib3-${process.pid}.csv`);
  fs.writeFileSync(file3, ownPlus);
  const own = L.loadLibrary('Test Niche', { file: file3 });
  chk('A name may appear under several categories with different verdicts: keyed by name + category, no "listed twice" problem', own.problems.length === 2 && own.byKey.get('deck cleaning|deck builder').verdict === 'alias' && own.byKey.get('deck cleaning|gardener').verdict === 'exclude' && own.rows.length === 9, JSON.stringify([own.problems, own.rows.length]), '');
  const hubsFile = path.join(os.tmpdir(), `copybot-hubs-${process.pid}.csv`);
  fs.writeFileSync(hubsFile, `gbp_category,hub,note\nLawn care service,Gardener,lawn care sits on the gardener page\nGardener,Gardener,\n`);
  const hubs = L.loadHubs('x', { file: hubsFile });
  const set = (withHubs = false) => ({ niche: 'test', file: own.file, own, others: [lib2], hubs: withHubs ? hubs : null, problems: [] });
  const cats2 = [
    { key: 'gardener', name: 'Gardener', primary: true, rows: [
      { id: 'fencing installation', name: 'Fencing installation', kind: 'unique' }, { id: 'lawn pest control', name: 'Lawn pest control', kind: 'unique' }, { id: 'patio cleaning', name: 'Patio cleaning', kind: 'unique' },
      { id: 'deck cleaning', name: 'Deck cleaning', kind: 'unique' }, { id: 'roof installation', name: 'Roof installation', kind: 'unique' }, { id: 'fence instalation', name: 'Fence instalation', kind: 'unique' },
      { id: 'hedge trimming', name: 'Hedge trimming', kind: 'unique' } ] },
    { key: 'deck_builder', name: 'Deck Builder', rows: [ { id: 'wood staining', name: 'Wood staining', kind: 'unique' } ] },
  ];
  const input2 = { ...input, resolved: { categories: cats2, primary: 'gardener', primaryName: 'Gardener', crossRef: [], flags: [] } };
  const build2 = (opts = {}) => G.buildPageMap(input2, { volumes, library: set(), launchTowns: new Set(['romsey']), ...opts });
  const m2 = build2();
  const r2 = n => rec(m2, n);
  chk('Name + category: "Deck cleaning" under Gardener takes the Gardener row (exclude), not the Deck builder alias', r2('Deck cleaning').outcome === 'excluded' && r2('Deck cleaning').matched.how === 'name+category' && r2('Deck cleaning').note === 'gardener row', JSON.stringify(r2('Deck cleaning')), '');
  chk('Across libraries: "Roof installation" is not in the niche\'s own library but is in another, so that verdict applies, and the record says where it came from', r2('Roof installation').outcome === 'page' && r2('Roof installation').intoName === 'Roof replacement' && r2('Roof installation').matched.file === path.basename(file2) && r2('Roof installation').matched.own === false && !r2('Roof installation').flag && !!find(m2, '/services/roof-replacement'), JSON.stringify(r2('Roof installation')), '');
  chk('Fold beats page when the client has the fold\'s target category: own library says page for "Patio cleaning", the other says fold into Gardener, and the client has Gardener', r2('Patio cleaning').outcome === 'folded' && r2('Patio cleaning').intoName === 'Gardener' && /in copybot-lib2/.test(r2('Patio cleaning').reason) && !find(m2, '/services/patio-cleaning'), JSON.stringify(r2('Patio cleaning')), '');
  chk('A fold whose target the client lacks gives way to a page row from another library: "Lawn pest control" (fold → Lawn Care Service, no such tab) becomes the "Lawn pest treatment" page, the passed-over fold recorded', r2('Lawn pest control').outcome === 'page' && r2('Lawn pest control').intoName === 'Lawn pest treatment' && r2('Lawn pest control').fold_lost && r2('Lawn pest control').fold_lost.target === 'Lawn Care Service' && !r2('Lawn pest control').flag, JSON.stringify(r2('Lawn pest control')), '');
  chk('A GBP name is matched exactly only: "Fence instalation" (typo) is not in any library', r2('Fence instalation').outcome === 'page' && r2('Fence instalation').flag === 'not in library' && !r2('Fence instalation').in_library, JSON.stringify(r2('Fence instalation')), '');
  const cats3 = JSON.parse(JSON.stringify(cats2));
  cats3[0].rows = cats3[0].rows.filter(r => r.id !== 'fence instalation').concat([{ id: 'fence instalation', name: 'Fence instalation', kind: 'additional', home: 'gardener' }, { id: 'rsj installation', name: 'RSJ installation', kind: 'additional', home: 'gardener' }, { id: 'pond installation', name: 'Pond installation', kind: 'additional', home: 'gardener' }]);
  const m3 = G.buildPageMap({ ...input2, resolved: { ...input2.resolved, categories: cats3 } }, { volumes, library: set(), launchTowns: new Set(['romsey']) });
  chk('A typed intake row (kind additional) is matched loosely and fuzzily: "Fence instalation" joins the Fencing page (fuzzy match of "Fencing installation"); a near miss that shares only a suffix ("Pond installation") matches nothing', rec(m3, 'Fence instalation').outcome === 'page' && rec(m3, 'Fence instalation').intoName === 'Fencing' && rec(m3, 'Fence instalation').matched.how === 'fuzzy' && rec(m3, 'Fence instalation').matched.gbp_name === 'Fencing installation' && rec(m3, 'Pond installation').flag === 'not in library', JSON.stringify([rec(m3, 'Fence instalation').matched, rec(m3, 'Pond installation').outcome]), '');
  chk('similarity: typos, word forms and containment count; shared suffixes do not', L.similarity('Fence instalation', 'Fencing installation') >= 0.8 && L.similarity('RSJ installation', 'Steel beam (RSJ) installation') >= 0.8 && L.similarity('Knock throughs and open plan living', 'Knock-throughs & open-plan living') === 1 && L.similarity('Pond installation', 'Sod installation') < 0.8 && L.similarity('Fan installation', 'Pond installation') < 0.8 && L.matchKey('Fascias') === L.matchKey('fascia'), [L.similarity('Fence instalation', 'Fencing installation'), L.similarity('Pond installation', 'Sod installation')].join(), '');
  chk('findEntries ranks own name+category, own name, others; fuzzy only on request; an ambiguous fuzzy match (two different rows within 5 points) is no match', L.findEntries(set(), 'Deck cleaning', ['Gardener']).map(m => [m.own, m.how].join(':')).join() === 'true:name+category,true:name,false:name+category' && L.findEntries(set(), 'Fence instalation', ['Gardener']).length === 0 && L.findEntries(set(), 'Fence instalation', ['Gardener'], { fuzzy: true })[0].entry.gbp_name === 'Fencing installation', JSON.stringify(L.findEntries(set(), 'Deck cleaning', ['Gardener']).map(m => [m.file, m.how])), '');
  const m4 = build2({ library: set(true) });
  chk('Hub mapping (<niche>-categories.csv): a fold target the client has no tab for still folds when a tab shares its hub: "Lawn pest control" → Lawn Care Service → hub Gardener, so it folds into Gardener', rec(m4, 'Lawn pest control').outcome === 'folded' && rec(m4, 'Lawn pest control').intoName === 'Gardener' && /its hub, for "Lawn Care Service"/.test(rec(m4, 'Lawn pest control').reason) && hubs.problems.length === 0 && L.hubOf(set(true), 'Lawn Care Service') === 'Gardener' && L.hubOf(set(true), 'Deck Builder') === 'Deck Builder', JSON.stringify(rec(m4, 'Lawn pest control')), '');
  chk('A plain library (no set) still works as the niche\'s own, with no others', G.buildPageMap(input2, { volumes, library: own, launchTowns: new Set(['romsey']) }).libraryRecords.find(r => r.gbp_name === 'Roof installation').flag === 'not in library', '', '');
  for (const f of [file2, file3, hubsFile]) fs.unlinkSync(f);
  const all = L.loadAllLibraries();
  chk('Every library CSV loads with no problems (name + category keys), 28 files, builder.csv with its repeated names under different categories', all.length === 28 && all.every(l => l.problems.length === 0) && all.find(l => l.file === 'builder.csv').byKey.get('general repairs|building firm').verdict === 'page' && all.find(l => l.file === 'builder.csv').byKey.get('general repairs|contractor').verdict === 'alias', JSON.stringify(all.map(l => [l.file, l.rows.length, l.problems.length])), '');
  const N = require(path.join(root, 'fillout/niches.js'));
  const allNiches = N.allNiches().filter(n => n.key !== 'other');
  chk('Every one of the 28 niches has a library, found by key and by label; the ten hub files load clean', allNiches.length === 28 && allNiches.every(n => L.fileFor(n.key) && L.fileFor(n.label) === L.fileFor(n.key)) && L.keyFor('Pet Care Services (Dog Walkers)') === 'pet-care' && L.keyFor('loft-extensions') === 'loft-conversions' && L.keyFor('Driveways & Paving') === 'driveways' && allNiches.filter(n => L.categoriesFileFor(n.key)).length === 10 && allNiches.flatMap(n => L.loadHubs(n.key) ? L.loadHubs(n.key).problems : []).join() === 'pet-care-categories.csv line 4: "Pet Sitter" is listed twice; the first line wins' && L.loadHubs('Builders').byCategory.get('construction company') === 'Builder', JSON.stringify(allNiches.filter(n => !L.fileFor(n.key) || L.fileFor(n.label) !== L.fileFor(n.key)).map(n => n.key)), '[]');
  chk('loadLibrarySet for a niche with a library: its own file first, the other 27 as others, its hub table when it has one; for a niche with none: own null, every file as others', (() => { const s = L.loadLibrarySet('Builders'); const t = L.loadLibrarySet('Chimney Sweeps'); return s.file === 'builder.csv' && s.others.length === 27 && s.hubs && s.hubs.file === 'builder-categories.csv' && L.loadLibrarySet('Fencing').hubs === null && t.own === null && t.file === null && t.others.length === 28; })(), '', '');

  // the real library
  const real = L.loadLibrary('Landscapers/Gardeners');
  chk('The landscaper library loads for the niche label, with no problems; the four Driveway names fold into Paving Contractor (20 Oct 2026)', real && real.file === 'landscaper.csv' && real.problems.length === 0 && ['driveway installation', 'driveway replacement', 'driveway landscaping', 'driveway or path paving'].every(k => real.entries.get(k).verdict === 'fold' && real.entries.get(k).target === 'Paving Contractor') && real.entries.get('tree stump grinding').verdict === 'alias' && real.entries.get('tree stump grinding').target === 'Tree stump removal', JSON.stringify(real && [real.entries.size, real.problems]), '');
  chk('A niche with no library file gets none (every name falls through, nothing flagged as missing)', L.loadLibrary('Chimney Sweeps') === null && G.buildPageMap(input, { volumes, library: null }).libraryRecords.every(r => !r.flag) && G.buildPageMap(input, { volumes, library: null }).libraryCounts.library === null, '', '');
  fs.unlinkSync(file);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
