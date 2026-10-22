'use strict';
// Fixture: the homepage's inputs from the v3 page map and the hand set-up (21 Oct 2026,
// Brandon's rules). Rows are the live "ednes edge testing" page map of 19 Oct
// (tests/fixtures/data/edens-edge-v3-page-map.json); the expected values are the dry run
// Brandon approved on 21 Oct (docs/h1-research/ednes-edge-testing-homepage-inputs-dry-run.md).
const path = require('path');
const root = path.join(__dirname, '../..');
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { confirmedServiceList, sayFor } = require(path.join(root, 'service-words.js'));
const { buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const V20 = require(path.join(root, 'v20-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const same = (label, got, want) => chk(label, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got), JSON.stringify(want));
console.log('\n=== FIXTURE: homepage inputs from the v3 page map (Edens Edge) ===\n');

// The hand set-up as tools/seed-edens-edge.js fills it
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes' };
const nicheV3 = { ...landscaper, service_words: [] }; // what loadV20Context hands out on the v3 path

const ctx = contextFromPageMap({ rows, hand, cv, niche: landscaper });
const kv = ctx.keyValueMap;
const keys = re => Object.keys(kv).filter(k => re.test(k)).sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10)).map(k => kv[k]);

// ── The three structures ──
same('categories: the six category rows, page map order', keys(/^category_\d+$/), ['Gardener', 'Landscape Gardener', 'Landscape Designer', 'Tree Service', 'Paving Contractor', 'Deck Builder']);
chk('services: the 31 service pages, by their page title', keys(/^service_\d+$/).length === 31 && keys(/^service_\d+$/).includes('Artificial grass installation'), keys(/^service_\d+$/).length, 31);
same('a service sits under its first parent tab', ['service_1', 'service_2'].map(k => `${kv[k]} → ${ctx.serviceParentMap[k]}`), ['Lawn mowing → Gardener', 'Fencing → Gardener']);
const mentioned = keys(/^mentioned_\d+$/);
chk('folded services are mentioned_N entries under their category', mentioned.includes('Garden work') && mentioned.includes('Driveway landscaping') && ctx.serviceParentMap[Object.keys(kv).find(k => kv[k] === 'Driveway landscaping')] === 'Paving Contractor', mentioned.join(', '), 'Garden work … Driveway landscaping (Paving Contractor)');
chk('a folded name never repeats a page name', !mentioned.some(m => keys(/^service_\d+$/).map(s => s.toLowerCase()).includes(m.toLowerCase())), mentioned.join(', '), 'no page names');
same('areas: the base town, then the hand set-up towns in order', keys(/^biz_area_\d+$/).slice(0, 4), ['Southampton', 'Romsey', 'Winchester', 'Eastleigh']);
chk('areas: 14, New Forest District kept (code skips council areas)', keys(/^biz_area_\d+$/).length === 14 && keys(/^biz_area_\d+$/).includes('New Forest District'), keys(/^biz_area_\d+$/).length, 14);

// ── The pages list ──
const P = ctx.pages;
const byType = t => P.filter(p => p.pageType === t);
same('pages by type (no town service pages; retired rows left out)', ['homepage', 'category', 'service', 'location', 'location-category'].map(t => `${t}:${byType(t).length}`), ['homepage:1', 'category:6', 'service:31', 'location:13', 'location-category:78']);
chk('a phase 2 location is "Not built" (plain text, never linkable)', byType('location').find(p => p.pageTitle === 'Ampfield').status === 'Not built', byType('location').find(p => p.pageTitle === 'Ampfield').status, 'Not built');
chk('a phase 1 location keeps its v3 status', byType('location').find(p => p.pageTitle === 'Romsey').status === 'H1 Added', byType('location').find(p => p.pageTitle === 'Romsey').status, 'H1 Added');
chk('the homepage row carries the v3 H1', byType('homepage')[0].h1 === 'Landscaper Southampton', byType('homepage')[0].h1, 'Landscaper Southampton');
chk('location category rows carry town and category', byType('location-category')[0].locationName && byType('location-category')[0].locationCategoryName, JSON.stringify(byType('location-category')[0]), 'town + category');

// ── The decisions (Brandon's dry run, 21 Oct) ──
const R = computeDecisions({ cv, niche: nicheV3, pages: P, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, cardServices: ctx.cardServices });
chk('no gate fails', !R.gates.length, JSON.stringify(R.gates), '[]');
const D = R.decisions;
same('cards: one per category page, page map order', D.d9.main.map(c => c.name), ['Gardener', 'Landscape Gardener', 'Landscape Designer', 'Tree Service', 'Paving Contractor', 'Deck Builder']);
same('card services: jobs_wanted, then volume, then core list, then page map order; 3 at most', D.d9.main.map(c => c.services.join(', ')), [
  'fencing, hedge trimming, weed control',
  'garden maintenance, lawn care, retaining walls',
  'patios, lawn seeding',
  'tree stump removal, tree planting, tree cabling and bracing',
  'block paving, concrete bases and paths',
  'pergolas, composite decking, decking restoration',
]);
same('a card short of two takes from its own base pages (rule 2)', Object.keys(ctx.cardServices.toppedUp).sort(), ['landscape designer', 'paving contractor']);
chk('a service that sits under Landscape Gardener never goes to the Gardener card', !D.d9.main[0].services.includes('garden maintenance'), D.d9.main[0].services.join(', '), 'no garden maintenance');
same('cards carry the v3 research H1s', D.d9.main.map(c => c.h1), ['Gardener Southampton', 'Garden Landscaping Southampton', 'Garden Design Southampton', 'Tree Surgeon Southampton', 'Driveways Southampton', 'Decking Southampton']);
same('"We also offer" is empty with six cards', D.d9.alsoOffer, []);
same('areas: the five launch towns linked', D.d12_areas.linked.map(a => a.name), ['Chandlers Ford', 'Eastleigh', 'Hedge End', 'Romsey', 'Winchester']);
same('areas: phase 2 towns plain text, New Forest District left out', D.d12_areas.plain, ['Ampfield', 'Awbridge', 'Chilworth', 'Kings Worthy', 'Lockerley', 'Lyndhurst', 'Stockbridge']);
same('content block links: jobs_wanted first, four categories', D.d13_links.map(l => l.url), ['/landscape-gardener', '/landscape-designer', '/gardener', '/tree-service']);
chk('hero town: the first phase 1 location in area order', D.d14_town && D.d14_town.name === 'Romsey', JSON.stringify(D.d14_town), 'Romsey');
same('LINKABLE PAGES: the six categories and five phase 1 locations, nothing else', D.linkablePages.map(p => `${p.type} ${p.url}`), [
  'category /gardener', 'category /landscape-gardener', 'category /landscape-designer', 'category /tree-service', 'category /paving-contractor', 'category /deck-builder',
  'location /locations/romsey', 'location /locations/winchester', 'location /locations/eastleigh', 'location /locations/chandlers-ford', 'location /locations/hedge-end',
]);
same('H1 and title unchanged', [D.d2_h1, D.d3_title], ['Landscaper Southampton', 'Landscaper Southampton | Edens Edge Landscaping']);

// ── Names: the page title is the name; service_words only on the old path ──
chk('service_words would translate a GBP name on the old path', sayFor('Sod installation', landscaper) === 'turf laying', sayFor('Sod installation', landscaper), 'turf laying');
chk('on the v3 path the page title is the name', sayFor('Artificial grass installation', nicheV3) === 'artificial grass installation', sayFor('Artificial grass installation', nicheV3), 'artificial grass installation');
const list = confirmedServiceList(kv, ctx.serviceParentMap, nicheV3);
chk('confirmed services: 31 pages plus the folded names, each said as written', list.filter(s => s.kind === 'page').length === 31 && list.filter(s => s.kind === 'mentioned').length === mentioned.length && list.every(s => s.say === s.gbp.toLowerCase()), `${list.filter(s => s.kind === 'page').length} pages, ${list.filter(s => s.kind === 'mentioned').length} mentioned`, `31 pages, ${mentioned.length} mentioned`);
const V = buildValidationContext({ cv, niche: nicheV3, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap });
chk('the validator counts a folded service as confirmed', V.serviceList.some(s => s.kind === 'mentioned' && s.gbp === 'Driveway landscaping'), V.serviceList.filter(s => s.kind === 'mentioned').map(s => s.gbp).join(', '), 'includes Driveway landscaping');
const block = V20.buildServiceList(kv, ctx.serviceParentMap, nicheV3);
chk('the client block lists folded services as prose only, never a card service', /Paving Contractor: block paving; also offered, no page of their own \(name in prose only, never as a card's service\): driveway landscaping/.test(block), block.split('\n').find(l => l.startsWith('Paving Contractor')), 'Paving Contractor: block paving; also offered … driveway landscaping');

// The claims review reads meta.services_on_file: with services on file it must be the full
// list, not the card names (first live v3 run, 22 Oct: a broken regex gave the reviewer only
// the six category names, and it flagged every card's services as unconfirmed)
const onFile = V20.servicesOnFile(kv, ctx.serviceParentMap, nicheV3, D);
chk('the claims review gets the full service list, not the category names', onFile === block && /fencing/.test(onFile), onFile.slice(0, 120), block.slice(0, 120));

// ── The old path is untouched ──
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const old = computeDecisions({ cv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null }).decisions;
chk('without cardServices the uploaded CSV path still gives its seven cards', old.d9.main.length === 7 && old.d9.main[0].services.length > 0, old.d9.main.length, 7);

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
