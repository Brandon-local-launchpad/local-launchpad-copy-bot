'use strict';
// Fixture: the niche library flags (3 Nov 2026): the three optional columns (emergency,
// prose_name, confirm_only) read by the loader and carried by a target; the planner building
// a confirm only page from an exact page row only (an alias, a page row under another name, a
// loose or fuzzy match is mentioned instead); the generator writing the flags into the page
// rows; the emergency switch per page (the client confirms call outs AND the page qualifies:
// a flagged service page, or a category, location or homepage whose cards lead to one), with
// the onboarding answer counting and a hand "no" winning; the prose name on cards, links and
// the decisions block; the renamed targets. Kestrel Ridge (roofer): Roof repairs is an
// emergency page, Roof replacement is not. Edens Edge (landscaper): nothing changes.
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.join(__dirname, '../..');
const L = require(path.join(root, 'niche-library/library.js'));
const V3 = require(path.join(root, 'page-map/plan-v3.js'));
const G = require(path.join(root, 'page-map/generator.js'));
const CB = require(path.join(root, 'category-blocks.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { computeCategoryDecisions } = require(path.join(root, 'category-decisions.js'));
const { computeServiceDecisions } = require(path.join(root, 'service-decisions.js'));
const { computeLocationDecisions } = require(path.join(root, 'location-decisions.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const K = require(path.join(__dirname, 'data/kestrel-ridge-rich.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const roofer = require(path.join(root, 'niche-library/roofer.json'));
const { rows: edensRows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: niche library flags (emergency per page, prose names, confirm only, renames) ===\n');
const vol = m => new Map(Object.entries(m).map(([k, v]) => [k, { volume: v[0], cpc: v[1] }]));
const find = (m, slug) => m.rows.find(r => r.slug === slug);

// ── The loader and the real libraries ──
const rooferLib = L.loadLibrary('roofers');
const gutteringLib = L.loadLibrary('guttering');
const loftLib = L.loadLibrary('loft-conversions');
chk('The loader reads the three optional columns: Roof repairs is flagged emergency on its page row, Roof replacement is not', rooferLib.rows.find(e => e.gbp_name === 'Roof repair').emergency === true && rooferLib.rows.find(e => e.gbp_name === 'Roof installation').emergency === false, '', 'emergency on Roof repairs only');
chk('A target carries its flags from any of its rows in one library: Dry ridge and dry verge is confirm only in the guttering library (alias rows), not in the roofer library', L.targetFlags(gutteringLib, 'Dry ridge and dry verge').confirm_only && !L.targetFlags(rooferLib, 'Dry ridge and dry verge').confirm_only, '', 'guttering only');
chk('prose_name: Velux loft conversions says "roof light loft conversions"', L.targetFlags(loftLib, 'Velux loft conversions').prose_name === 'roof light loft conversions', L.targetFlags(loftLib, 'Velux loft conversions').prose_name, 'roof light loft conversions');
const allLibs = L.loadAllLibraries();
const targets = allLibs.flatMap(l => l.rows.map(e => e.target));
chk('Renamed targets: Made to measure fencing, Made to measure garage doors and Deshedding exist; Bespoke fencing, Bespoke garage doors and De-shedding are no longer targets', ['Made to measure fencing', 'Made to measure garage doors', 'Deshedding'].every(t => targets.includes(t)) && !['Bespoke fencing', 'Bespoke garage doors', 'De-shedding'].some(t => targets.includes(t)), '', 'renamed');
chk('The 24 emergency targets and 6 confirm only targets are set across the libraries', allLibs.reduce((n, l) => n + new Set(l.rows.filter(e => e.emergency).map(e => e.target.toLowerCase())).size, 0) === 24 && allLibs.reduce((n, l) => n + new Set(l.rows.filter(e => e.confirm_only).map(e => e.target.toLowerCase())).size, 0) === 6, '', '24 and 6');
chk('Every library loads without problems after the new columns', allLibs.every(l => !l.problems.length), allLibs.filter(l => l.problems.length).map(l => `${l.file}: ${l.problems.join('; ')}`).join(' | '), 'no problems');

// ── Confirm only in the planner: a small library, read like the real ones ──
const csv = `gbp_name,gbp_category,verdict,target,note,emergency,prose_name,confirm_only
House clearance,Additional services,page,House clearance,Free-text intake name,,,yes
Office clearance,Additional services,alias,House clearance,Free-text intake name,,,yes
Bee extermination,Pest control service,page,Bee removal and relocation,Bees are relocated,,,yes
Awnings,Additional services,page,Awnings,,,,yes
Velux loft conversions,Additional services,page,Velux loft conversions,,,roof light loft conversions,
Emergency plumber,Plumber,page,Emergency plumber and heating engineer,,yes,,
Pipe repair,Plumber,alias,Emergency plumber and heating engineer,,,,
`;
const file = path.join(os.tmpdir(), `copybot-flags-${process.pid}.csv`);
fs.writeFileSync(file, csv);
const lib = L.loadLibrary('Test Niche', { file });
const cats = [
  { key: 'removals', name: 'Removals Company', primary: true, rows: [
    { id: 'house clearance', name: 'House clearance', kind: 'additional', home: 'removals' }, { id: 'office clearance', name: 'Office clearance', kind: 'additional', home: 'removals' },
    { id: 'awnings', name: 'Awnings', kind: 'additional', home: 'removals' }, { id: 'velux loft conversions', name: 'Velux loft conversions', kind: 'additional', home: 'removals' },
    { id: 'house clearances', name: 'House clearances', kind: 'additional', home: 'removals' } ] },
  { key: 'pest', name: 'Pest control service', rows: [
    { id: 'bee extermination', name: 'Bee extermination', kind: 'unique' }, { id: 'emergency plumber', name: 'Emergency plumber', kind: 'unique' }, { id: 'pipe repair', name: 'Pipe repair', kind: 'unique' } ] },
];
const resolved = { categories: cats, primary: 'removals', primaryName: 'Removals Company', crossRef: [], flags: [] };
const R = V3.resolveLibrary(V3.collectServices(resolved), lib, cats.map(c => ({ key: c.key, name: c.name })));
const svc = id => R.services.find(s => s.id === id);
const rec = id => R.records.find(r => r.id === id);
chk('confirm only: the exact page row builds the page ("House clearance" typed → the House clearance page; "Awnings" → Awnings)', svc('house clearance') && svc('house clearance').library === 'page' && svc('house clearance').confirm_only === true && svc('awnings') && svc('awnings').library === 'page', JSON.stringify([svc('house clearance') && svc('house clearance').library, svc('awnings') && svc('awnings').library]), 'page, page');
chk('confirm only: an alias row never builds it: "Office clearance" is mentioned on its category page, with the reason', svc('office clearance') && svc('office clearance').outcome === 'mentioned' && /confirm only/.test(svc('office clearance').reason) && rec('office clearance').flag === 'confirm only', svc('office clearance') && svc('office clearance').reason, 'mentioned, confirm only');
chk('confirm only: a page row under another name counts as an alias: "Bee extermination" ticked does not build Bee removal and relocation', svc('bee extermination') && svc('bee extermination').outcome === 'mentioned' && !R.services.some(s => s.name === 'Bee removal and relocation'), JSON.stringify(R.services.filter(s => /bee/i.test(s.name)).map(s => [s.name, s.outcome])), 'mentioned, no bee page');
chk('confirm only: a fuzzy match of the page name ("House clearances") does not build it either; it is mentioned', svc('house clearances') && svc('house clearances').outcome === 'mentioned', svc('house clearances') && svc('house clearances').outcome, 'mentioned');
chk('The flags ride on the planned page: the emergency page row flags the page, the alias row keeps it; the prose name is carried', svc('emergency plumber and heating engineer') && svc('emergency plumber and heating engineer').emergency === true && svc('emergency plumber and heating engineer').absorbs.includes('Pipe repair') && svc('velux loft conversions').prose_name === 'roof light loft conversions', '', 'emergency + absorbs, prose name');
const input = { resolved, baseTown: 'Southampton', otherTowns: 'Romsey', companyName: 'Acme', terms: { removals: ['removals'], _sitewide: [] }, waiting: [] };
const m = G.buildPageMap(input, { volumes: vol({ 'emergency plumber and heating engineer southampton': [50, 2], 'emergency plumber and heating engineer romsey': [20, 1] }), library: lib, launchTowns: new Set(['romsey']) });
chk('The generator writes the flags into the row info: emergency and prose_name on the service row and its town service row; a plain page has neither', find(m, '/services/emergency-plumber-and-heating-engineer').info.emergency === true && find(m, '/locations/romsey/emergency-plumber-and-heating-engineer').info.emergency === true && find(m, '/services/velux-loft-conversions').info.prose_name === 'roof light loft conversions' && find(m, '/services/house-clearance').info.emergency === false && find(m, '/services/house-clearance').info.prose_name === null, '', 'flags in info');
chk('The library records show the confirm only outcome', m.libraryRecords.find(r => r.gbp_name === 'Office clearance').outcome === 'mentioned' && m.libraryRecords.find(r => r.gbp_name === 'Office clearance').flag === 'confirm only' && m.libraryRecords.find(r => r.gbp_name === 'House clearance').outcome === 'page', JSON.stringify(m.libraryRecords.filter(r => /clearance/i.test(r.gbp_name)).map(r => [r.gbp_name, r.outcome, r.flag])), 'mentioned with the flag, page');

// ── The switch itself ──
chk('clientEmergency: a hand "yes", or the onboarding answer "Yes" when the hand field is blank; a hand "no" wins over the answer', CB.clientEmergency({ emergency_primary: 'yes' }) && CB.clientEmergency({ emergency_primary: '', emergency_callouts: 'Yes' }) && CB.clientEmergency({ emergency_callouts: ['Yes, within the hour'] }) && !CB.clientEmergency({ emergency_primary: 'no', emergency_callouts: 'Yes' }) && !CB.clientEmergency({ emergency_callouts: 'No' }) && !CB.clientEmergency({}), '', 'yes/callouts on, no wins');
chk('typeFor: the layout is on only when the client confirms AND the page qualifies; a confirmed client with an unflagged page gets the plain type', CB.typeFor({ niche: roofer, cv: { emergency_primary: 'yes' }, emergencyPage: true }).emergencyOn && !CB.typeFor({ niche: roofer, cv: { emergency_primary: 'yes' }, emergencyPage: false }).emergencyOn && !CB.typeFor({ niche: roofer, cv: {}, emergencyPage: true }).emergencyOn, '', 'on only with both');
chk('emergencyWhy names the pages, or says what is missing', /Roof repairs is an emergency page and the client confirms/.test(CB.emergencyWhy(true, ['Roof repairs'], {})) && /no page here is flagged/.test(CB.emergencyWhy(false, [], {})) && /has not confirmed/.test(CB.emergencyWhy(false, ['Roof repairs'], {})), '', 'why text');

// ── Kestrel Ridge (roofer): Roof repairs gets the emergency layout, Roof replacement does not ──
const kCats = [{ key: 'roofing_contractor', name: 'Roofing Contractor', primary: true, rows: [{ id: 'roof repair', name: 'Roof repair', kind: 'unique' }, { id: 'roof installation', name: 'Roof installation', kind: 'unique' }] }];
const kResolved = { categories: kCats, primary: 'roofing_contractor', primaryName: 'Roofing Contractor', crossRef: [], flags: [] };
const kInput = { resolved: kResolved, baseTown: 'Bournemouth', otherTowns: 'Poole', companyName: 'Kestrel Ridge Roofing', terms: { roofing_contractor: ['roofer'], _sitewide: [] }, waiting: [] };
const km = G.buildPageMap(kInput, { volumes: vol({ 'roof repairs bournemouth': [90, 3], 'roof replacement bournemouth': [70, 4], 'roof repairs poole': [30, 2] }), library: L.loadLibrarySet('roofers'), launchTowns: new Set(['poole']) });
const kRepairs = find(km, '/services/roof-repairs'), kReplace = find(km, '/services/roof-replacement');
chk('Kestrel page map: Roof repairs (from the GBP tick "Roof repair") is an emergency page; Roof replacement (from "Roof installation") is not; the Poole town service page carries the flag', kRepairs && kRepairs.info.emergency === true && kReplace && kReplace.info.emergency === false && find(km, '/locations/poole/roof-repairs').info.emergency === true, JSON.stringify(km.rows.filter(r => r.type !== 'homepage').map(r => [r.slug, r.info.emergency])), 'repairs true, replacement false');
// No H1 research here: the homepage and the pages take a stand-in H1 so the decisions run; Roof
// replacement takes a prose name by hand to prove the homepage carries it (none is in the library)
for (const r of km.rows) if (!r.h1) r.h1 = r.type === 'homepage' ? 'Roofer Bournemouth' : r.title;
kReplace.info.prose_name = 'new roofs';
const kHand = { baseTown: 'Bournemouth', otherTowns: 'Poole' };
const kCvYes = { ...K.cv, emergency_primary: 'yes' };
const kCtx = contextFromPageMap({ rows: km.rows, hand: kHand, cv: kCvYes, niche: { ...roofer, service_words: [] } });
const kHome = computeDecisions({ cv: kCvYes, niche: roofer, pages: kCtx.pages, keyValueMap: kCtx.keyValueMap, serviceParentMap: kCtx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [], cardServices: kCtx.cardServices || null });
chk('Kestrel pages: the v3 context carries the prose name onto the page (the homepage lists service pages only when they are its cards; the category, service and location blocks say it, see below)', kCtx.pages.some(p => p.urlSlug === '/services/roof-replacement' && p.proseName === 'new roofs' && p.emergency === false) && kCtx.pages.some(p => p.urlSlug === '/services/roof-repairs' && p.emergency === true), JSON.stringify(kCtx.pages.filter(p => p.pageType === 'service').map(p => [p.urlSlug, p.emergency, p.proseName])), 'prose name and flags on the pages');
chk('Kestrel homepage: the emergency layout is on (its cards lead to Roof repairs) and the decisions block says why', !kHome.gates.length && kHome.decisions.emergencyOn && /Roof repairs is an emergency page/.test(kHome.decisions.emergencyWhy) && /Emergency layout: ON \(Roof repairs/.test(kHome.decisionsBlock), kHome.gates.length ? JSON.stringify(kHome.gates) : kHome.decisions.emergencyWhy, 'ON, Roof repairs');
const kRowsNoRepairs = km.rows.filter(r => !/roof-repairs/.test(r.slug));
const kCtx2 = contextFromPageMap({ rows: kRowsNoRepairs, hand: kHand, cv: kCvYes, niche: { ...roofer, service_words: [] } });
const kHome2 = computeDecisions({ cv: kCvYes, niche: roofer, pages: kCtx2.pages, keyValueMap: kCtx2.keyValueMap, serviceParentMap: kCtx2.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [], cardServices: kCtx2.cardServices || null });
chk('Kestrel homepage with only Roof replacement: the plain layout, even though the client confirms call outs', !kHome2.gates.length && !kHome2.decisions.emergencyOn && /no page here is flagged/.test(kHome2.decisions.emergencyWhy), kHome2.gates.length ? JSON.stringify(kHome2.gates) : kHome2.decisions.emergencyWhy, 'off');
const kSvc = page => computeServiceDecisions({ cv: kCvYes, niche: { ...roofer, service_words: [] }, keyValueMap: kCtx.keyValueMap, rows: km.rows, page, tradeFacts: { niche: 'roofer', file: 'trade-facts/roofer.md', verified: true, rows: [], markdown: '' } });
const kA = kSvc(kRepairs), kB = kSvc(kReplace);
chk('Kestrel service pages (the roofer briefs, 3 Nov): Roof repairs gets the emergency layout and the "when it can\'t wait" block 4; Roof replacement gets the plain briefs', !kA.gates.length && kA.decisions.emergencyOn && kA.decisions.type.emergency && /Roof repairs is an emergency page/.test(kA.decisions.emergencyWhy) && !kB.gates.length && !kB.decisions.emergencyOn && !kB.decisions.type.emergency, JSON.stringify([kA.gates, kB.gates, kA.decisions && kA.decisions.emergencyWhy, kB.decisions && kB.decisions.emergencyWhy]), 'repairs on with the variant, replacement off');
chk('Kestrel category page (Roofing services): on, because its cards include Roof repairs', (() => { const c = computeCategoryDecisions({ cv: kCvYes, niche: { ...roofer, service_words: [] }, keyValueMap: kCtx.keyValueMap, rows: km.rows, page: km.rows.find(r => r.type === 'category'), allocation: null, symptoms: [], tradeFacts: null }); return !c.gates.length && c.decisions.emergencyOn && c.decisions.type.emergency; })(), '', 'category on with the variant');

// ── Edens Edge (landscaper): nothing changes; and the same wiring on a client that has briefs ──
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes', insurance_cover: '5m', hours: 'Monday to Saturday, 7am to 6pm' };
const niche = { ...landscaper, service_words: [] };
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh'].join('\n') };
const ctx = contextFromPageMap({ rows: edensRows, hand, cv, niche });
const eHome = computeDecisions({ cv: { ...cv, emergency_primary: 'yes' }, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [] });
chk('Edens Edge: no landscaper page is flagged, so the layout stays off even with the hand field set to yes', !eHome.gates.length && !eHome.decisions.emergencyOn && /no page here is flagged/.test(eHome.decisions.emergencyWhy), eHome.gates.length ? JSON.stringify(eHome.gates) : eHome.decisions.emergencyWhy, 'off');
const gardenerPage = edensRows.find(r => r.slug === '/gardener');
const mowing = edensRows.find(r => r.slug === '/services/lawn-mowing');
const eCat = computeCategoryDecisions({ cv, niche, keyValueMap: ctx.keyValueMap, rows: edensRows, page: gardenerPage, allocation: null, symptoms: [], tradeFacts: null });
chk('Edens Edge Gardener category page: off, and the block says why', !eCat.gates.length && !eCat.decisions.emergencyOn && /Emergency layout: off \(no page here is flagged/.test(eCat.decisionsBlock), eCat.gates.length ? JSON.stringify(eCat.gates) : (eCat.decisionsBlock.match(/Emergency layout:[^\n]*/) || [])[0], 'off with reason');
// The same rows with Lawn mowing flagged and a prose name: the wiring every page type shares
const flagged = edensRows.map(r => r === mowing ? { ...r, info: { ...r.info, emergency: true, prose_name: 'grass cutting' } } : r);
const cvYes = { ...cv, emergency_primary: '', emergency_callouts: 'Yes' };
const fCat = computeCategoryDecisions({ cv: cvYes, niche, keyValueMap: ctx.keyValueMap, rows: flagged, page: gardenerPage, allocation: null, symptoms: [], tradeFacts: null });
chk('Category page: on when a card leads to the flagged page, confirmed by the onboarding answer; the card says its prose name in the link phrase and the decisions block', !fCat.gates.length && fCat.decisions.emergencyOn && /Lawn mowing is an emergency page/.test(fCat.decisions.emergencyWhy) && fCat.decisions.cards.find(c => c.name === 'Lawn mowing').say === 'grass cutting' && /\[grass cutting\]\(\/services\/lawn-mowing/.test(fCat.decisions.cards.find(c => c.name === 'Lawn mowing').link_phrase) && /card_name: Lawn mowing \| say: grass cutting/.test(fCat.decisionsBlock) && /\| say: grass cutting/.test(fCat.decisionsBlock.split('LINKABLE PAGES:')[1]), fCat.gates.length ? JSON.stringify(fCat.gates) : fCat.decisions.emergencyWhy, 'on, say grass cutting');
const otherCat = edensRows.find(r => r.slug === '/tree-service');
const oCat = computeCategoryDecisions({ cv: cvYes, niche, keyValueMap: ctx.keyValueMap, rows: flagged, page: otherCat, allocation: null, symptoms: [], tradeFacts: null });
chk('Another category whose cards do not lead to the flagged page stays plain', oCat.gates.length ? false : !oCat.decisions.emergencyOn, oCat.gates.length ? JSON.stringify(oCat.gates) : '', 'off');
const facts = { niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: true, rows: [], markdown: '' };
const fSvc = computeServiceDecisions({ cv: cvYes, niche, keyValueMap: ctx.keyValueMap, rows: flagged, page: flagged.find(r => r.slug === '/services/lawn-mowing'), tradeFacts: facts });
const fSvc2 = computeServiceDecisions({ cv: cvYes, niche, keyValueMap: ctx.keyValueMap, rows: flagged, page: flagged.find(r => r.slug === '/services/hedge-trimming'), tradeFacts: facts });
chk('Service pages: the flagged page is on, its sibling is off', !fSvc.gates.length && fSvc.decisions.emergencyOn && !fSvc2.gates.length && !fSvc2.decisions.emergencyOn && /Lawn mowing is an emergency page/.test(fSvc.decisions.emergencyWhy), JSON.stringify([fSvc.gates, fSvc2.gates]), 'on / off');
const romsey = edensRows.find(r => r.type === 'location' && r.title === 'Romsey');
const fLoc = computeLocationDecisions({ cv: cvYes, niche, keyValueMap: ctx.keyValueMap, rows: flagged, page: romsey, allocation: null, town: { profile: '', villages: [] }, symptoms: [], reviews: [] });
const fLocOff = computeLocationDecisions({ cv: cv, niche, keyValueMap: ctx.keyValueMap, rows: flagged, page: romsey, allocation: null, town: { profile: '', villages: [] }, symptoms: [], reviews: [] });
chk('Location page: on when a card (the Romsey Gardener page) leads to the flagged page; off when the client has not confirmed, and the block says so', !fLoc.gates.length && fLoc.decisions.emergencyOn && /Lawn mowing/.test(fLoc.decisions.emergencyWhy) && !fLocOff.gates.length && !fLocOff.decisions.emergencyOn && /has not confirmed/.test(fLocOff.decisions.emergencyWhy), JSON.stringify([fLoc.gates, fLoc.decisions && fLoc.decisions.emergencyWhy, fLocOff.decisions && fLocOff.decisions.emergencyWhy]), 'on / off with reasons');
const fHome = computeDecisions({ cv: cvYes, niche, pages: contextFromPageMap({ rows: flagged, hand, cv: cvYes, niche }).pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [] });
const fPages = contextFromPageMap({ rows: flagged, hand, cv: cvYes, niche }).pages;
chk('Homepage: on through the flagged service page (a multi category client: service pages are not homepage links, but the v3 context carries the flag and the prose name)', !fHome.gates.length && fHome.decisions.emergencyOn && /Lawn mowing is an emergency page/.test(fHome.decisions.emergencyWhy) && fPages.some(p => p.urlSlug === '/services/lawn-mowing' && p.emergency === true && p.proseName === 'grass cutting'), fHome.gates.length ? JSON.stringify(fHome.gates) : fHome.decisions.emergencyWhy, 'on, flag and prose name on the page');

// ── Desire led service pages (4 Nov 2026) ──
const dCsv = `gbp_name,gbp_category,verdict,target,note,emergency,prose_name,confirm_only,desire_led
Patio paving,Paving contractor,page,Patios,,,,,yes
Patio laying,Paving contractor,alias,Patios,,,,,
Roof repair,Roofing services,page,Roof repairs,,yes,,,
`;
const dFile = path.join(os.tmpdir(), `copybot-desire-${process.pid}.csv`);
fs.writeFileSync(dFile, dCsv);
const dLib = L.loadLibrary('Desire Niche', { file: dFile });
chk('desire_led: the loader reads the column and the target carries it from any of its rows', dLib.rows.find(e => e.gbp_name === 'Patio paving').desire_led === true && L.targetFlags(dLib, 'Patios').desire_led && !L.targetFlags(dLib, 'Roof repairs').desire_led, '', 'Patios desire led');
const dCats = [{ key: 'paving', name: 'Paving contractor', primary: true, rows: [{ id: 'patio laying', name: 'Patio laying', kind: 'unique' }, { id: 'roof repair', name: 'Roof repair', kind: 'unique' }] }];
const dMap = G.buildPageMap({ resolved: { categories: dCats, primary: 'paving', primaryName: 'Paving contractor', crossRef: [], flags: [] }, baseTown: 'Southampton', otherTowns: 'Romsey', companyName: 'Acme', terms: { paving: ['paving'], _sitewide: [] }, waiting: [] }, { volumes: vol({ 'patios romsey': [30, 2] }), library: dLib, launchTowns: new Set(['romsey']) });
chk('desire_led rides from the planner into the service and town service rows (through an alias row too); an emergency page is not desire led', find(dMap, '/services/patios').info.desire_led === true && find(dMap, '/locations/romsey/patios').info.desire_led === true && find(dMap, '/services/roof-repairs').info.desire_led === false && find(dMap, '/services/roof-repairs').info.emergency === true, JSON.stringify(dMap.rows.filter(r => r.type !== 'homepage').map(r => [r.slug, r.info.desire_led, r.info.emergency])), 'patios desire led, roof repairs emergency');
const SB = require(path.join(root, 'service-blocks.js'));
const desireVariant = { problems: { h2: 'Is [SERVICE] Right for Your Garden?', cards: [1, 2, 3, 4].map(i => ({ title: `Situation ${i}`, mechanism: `what decides it ${i}`, brief: `The customer's situation ${i}, what decides it and what the work gives them.` })) } };
const dNiche = { ...landscaper, service_words: [], service_page_blocks: { ...landscaper.service_page_blocks, A: { ...landscaper.service_page_blocks.A, desire: desireVariant } } };
const dPlain = SB.blocksFor({ niche: dNiche, cv: { business_type: 'A' }, category: 'Paving Contractor' });
const dDesire = SB.blocksFor({ niche: dNiche, cv: { business_type: 'A' }, category: 'Paving Contractor', desirePage: true });
chk('service-blocks: a desire led page reads the desire variant (its H2 and situation cards); a plain page keeps "Signs you need it"', dDesire.desireUsed && dDesire.entry.problems.h2 === desireVariant.problems.h2 && dDesire.entry.problems.cards[0].title === 'Situation 1' && dDesire.entry.included === landscaper.service_page_blocks.A.included && !dPlain.desireUsed && dPlain.entry.problems.h2 === landscaper.service_page_blocks.A.problems.h2, '', 'desire variant on the flagged page only');
const rNiche = { ...roofer, service_words: [], service_page_blocks: { ...roofer.service_page_blocks, A: { ...roofer.service_page_blocks.A, desire: desireVariant } } };
const rBoth = SB.blocksFor({ niche: rNiche, cv: { business_type: 'A', emergency_primary: 'yes' }, category: 'Roofing services', desirePage: true, emergencyPage: true });
chk('service-blocks: the emergency variant wins over the desire variant on a page that is somehow both', rBoth.emergencyUsed && !rBoth.desireUsed && rBoth.entry.problems.h2 === roofer.service_page_blocks.A.emergency.problems.h2, rBoth.entry.problems.h2, 'the emergency H2');
const patios = edensRows.find(r => r.slug === '/services/patios');
const dRows = edensRows.map(r => r === patios ? { ...r, info: { ...r.info, desire_led: true } } : r);
const dSvc = computeServiceDecisions({ cv, niche: dNiche, keyValueMap: ctx.keyValueMap, rows: dRows, page: dRows.find(r => r.slug === '/services/patios'), tradeFacts: facts });
const dSvc2 = computeServiceDecisions({ cv, niche: dNiche, keyValueMap: ctx.keyValueMap, rows: dRows, page: dRows.find(r => r.slug === '/services/hedge-trimming'), tradeFacts: facts });
chk('service decisions: Patios flagged desire led gets the desire H2 and the framing line; Hedge trimming stays problem led', !dSvc.gates.length && dSvc.decisions.type.desire && dSvc.decisions.h2.problems === 'Is Patios Right for Your Garden?' && /Block 4 framing: desire led/.test(dSvc.decisionsBlock) && !dSvc2.gates.length && !dSvc2.decisions.type.desire && /Block 4 framing: problem led/.test(dSvc2.decisionsBlock), JSON.stringify([dSvc.gates, dSvc.decisions && dSvc.decisions.h2.problems, dSvc2.gates]), 'desire on Patios only');

// ── Type keyed fears and FAQ slots, the niche's banned phrases (4 Nov 2026) ──
const tNiche = { ...landscaper, service_words: [], fears_by_type: { B: ['visits that stop without warning', 'a different job each time', 'things left to slip'] }, faq_slots_by_type: { B: [{ slot: 'faq_A', question: 'How often do you need to come?', answer_brief: 'From [CV: visit_frequency_options] only.', doubt: 'Process' }, { slot: 'faq_B_extra', question: 'What does a visit cover?', answer_brief: 'The round.', doubt: 'Fit' }] } };
chk('fearsFor and faqSlotsFor: a B client reads the B fears and the B slot replaces the shared faq_A; an A client reads the shared lists', JSON.stringify(CB.fearsFor(tNiche, { business_type: 'B' })) === JSON.stringify(tNiche.fears_by_type.B) && CB.fearsFor(tNiche, { business_type: 'A' }) === landscaper.fears && CB.faqSlotsFor(tNiche, { business_type: 'B' }).find(s => s.slot === 'faq_A').question === 'How often do you need to come?' && CB.faqSlotsFor(tNiche, { business_type: 'B' }).some(s => s.slot === 'faq_B_extra') && CB.faqSlotsFor(tNiche, { business_type: 'A' }) === landscaper.faq_slots && CB.faqSlotsFor(tNiche, { business_type: 'B' }).length === landscaper.faq_slots.length + 1, '', 'B overrides, A shared');
const tHome = computeDecisions({ cv: { ...cv, business_type: 'B' }, niche: tNiche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [] });
chk('homepage decisions: a B client\'s Why points carry the B fears and its FAQ takes the B question', !tHome.gates.length && tHome.decisions.d10_why.some(p => tNiche.fears_by_type.B.includes(p.fear)) && JSON.stringify(tHome.decisions.d11_faq).includes('How often do you need to come?'), tHome.gates.length ? JSON.stringify(tHome.gates) : JSON.stringify(tHome.decisions.d10_why.map(p => p.fear)), 'B fears and question');

fs.unlinkSync(file);
fs.unlinkSync(dFile);
console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
