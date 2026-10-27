'use strict';
// Fixture: location pages (CORE (18), 27 Oct 2026). Edens Edge Romsey from the live v3 page
// map snapshot: the decisions (the hub H1, the cards, the H2s, the town question, the steps
// fallback, a type B client, a single category client), the parser, the record, the
// validator's own rules, the reader view, the rubric reviewer's code side, the symptom
// picker, the Table A rows and the runner on pg-mem with a stub model (the town's pages
// first, council areas out, order, skip, resume, the allocation pass on the town dossier,
// the mechanisms, ideas and symptoms taken from the town's records). No API calls.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { computeLocationDecisions, categoryWordOf } = require(path.join(root, 'location-decisions.js'));
const LB = require(path.join(root, 'location-blocks.js'));
const PT = require(path.join(root, 'page-types/location.js'));
const { getPageType } = require(path.join(root, 'page-types'));
const { parseOutput } = require(path.join(root, 'v20-parse.js'));
const { buildLocationRecord, expectedFromLocationDecisions } = require(path.join(root, 'location-record.js'));
const { validateLocation, locationValidationContext } = require(path.join(root, 'validate-location.js'));
const { buildLocationReaderView } = require(path.join(root, 'location-reader.js'));
const A = require(path.join(root, 'allocation.js'));
const { parseDossier, cleanForCopy } = require(path.join(root, 'geo-dossier.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { createLocationRunner, pagesInOrder, townPagesOf, paragraphTwo } = require(path.join(root, 'location-run.js'));
const { generateLocationPage, loadCore18 } = require(path.join(root, 'location-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const same = (label, got, want) => chk(label, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got), JSON.stringify(want));

console.log('\n=== FIXTURE: location pages (Edens Edge, Romsey) ===\n');

const niche = { ...landscaper, _source: 'landscaper', service_words: [] };
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes', insurance_cover: '5m', hours: 'Monday to Saturday, 7am to 6pm', confirmed_practices: ['price_agreed_before_work'] };
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
const ctx = contextFromPageMap({ rows, hand, cv, niche });
const kv = ctx.keyValueMap;
const romseyPage = rows.find(r => r.type === 'location' && r.title === 'Romsey');
const winchesterPage = rows.find(r => r.type === 'location' && r.title === 'Winchester');

// The Romsey dossier (the shape Geo Research CORE v7 writes), for the town profile, the villages, the neighbourhoods and the symptoms
const ROMSEY_DOSSIER = `## 1. LOCATION OVERVIEW

Romsey is a market town on the River Test with Victorian terraces near the Abbey and larger plots on the edge of the town. The ground is gravel over chalk that drains fast, and the water table rises close to the surface beside the river meadows.[https://example.org/romsey]

## 2. NEIGHBOURHOOD PROFILES

### [ROM-N01] Abbey Quarter | neighbourhood
Profile: **Terraced streets around the Abbey with small walled gardens and no side access.** Front gardens are short and many have been paved for parking.[https://example.org/abbey]
Linked issues: ROM-I02

### [ROM-N02] Cupernham | neighbourhood
Profile: **Estates from the 1960s and 1970s with long back gardens and timber fences between them.** The ground rises away from the town, so most gardens slope.[https://example.org/cupernham]
Linked issues: ROM-I01

### [ROM-N03] Awbridge | village
Profile: Larger plots with mature trees.[https://example.org/a]

### [ROM-N04] Timsbury | village
Profile: Cottages with long gardens.[https://example.org/b]

## 3. LOCAL ISSUES

### [ROM-I01] Water standing on lawns near the river
Detail: Lawns beside the Test meadows stay soft after rain because the water table sits close to the surface.[https://example.org/c]
Category tags: Landscaper, Gardener
Service tags: Garden drainage

### [ROM-I02] Paved front gardens shedding rain
Detail: Paved fronts on the terraced streets send rain straight to the road and the neighbour's gate.[https://example.org/d]
Category tags: Paving Contractor
Service tags: Patios

### [ROM-I03] Old stumps in lawns
Detail: Felled trees leave stumps in lawns that send up shoots every spring.[https://example.org/e]
Category tags: Tree Service
Service tags: Tree stump removal

## 4. SYMPTOMS

- [ROM-S01] | “The lawn stays soft for days after rain.” | ROM-I01 | Urgent: N
- [ROM-S02] | “Rain runs off the front and pools at the gate.” | ROM-I02 | Urgent: N
- [ROM-S03] | “A stump in the lawn keeps sprouting.” | ROM-I03 | Urgent: N
- [ROM-S04] | “The gutters overflow in a storm.” | ROM-I02 | Urgent: Y

## 5. RULES & COUNCIL

### [ROM-R01] Romsey Conservation Area
Detail: Covers the streets around the Abbey.[https://example.org/f]
Applies to: ROM-N01

## 6. DEMAND BY AREA

## 7. NEARBY CONTRAST

## 8. GAPS

## 9. SOURCES CONSULTED
`;
const parsedRomsey = parseDossier(ROMSEY_DOSSIER);
const romseyNames = Object.fromEntries(parsedRomsey.neighbourhoods.map(n => [n.id, n.name]));
const ROMSEY = { profile: cleanForCopy(parsedRomsey.overview, romseyNames), villages: parsedRomsey.neighbourhoods.map(n => n.name) };
const allocation = A.resolveAllocatedItems({ neighbourhoods: ['ROM-N01', 'ROM-N02'], symptoms: {}, conservation_areas: ['ROM-N01'] }, parsedRomsey);
const resolve = s => { const issue = parsedRomsey.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue.title, issueText: cleanForCopy(issue.body, romseyNames) }; };
const categories = ['Landscaper', ...rows.filter(r => r.type === 'category').map(r => r.title)];

// ── Blocks and the refusal ──
same('blocks: the client\'s type, never a category override (type A client; a type B client gets B)', [LB.blocksFor({ niche, cv }).key, LB.blocksFor({ niche, cv: { ...cv, business_type: 'B' } }).key], ['A', 'B']);
chk('refusal: a niche with no location_page_blocks is refused by name', (() => { try { LB.blocksFor({ niche: { ...niche, location_page_blocks: undefined }, cv }); return ''; } catch (e) { return e.message; } })() === 'no location block briefs for landscaper', '', 'no location block briefs for landscaper');
same('F-BRIEF: what a short entry lacks', LB.briefGaps({ problems: { cards: [{ title: 'x', brief: 'y' }] }, cost: { cards: [] }, faq_slots: [{ slot: 'cost' }] }), ['block 4 has 1 card brief(s), not 4', 'block 5 has 0 card brief(s), not 4', 'block 4 card "x" has no mechanism', 'no "cover" FAQ slot', 'no "town" FAQ slot', 'no "process" FAQ slot']);
chk('briefs: the landscaper entry has A and B with four mechanisms each, none shared with the category or service briefs', (() => {
  const L = landscaper.location_page_blocks;
  const own = k => L[k].problems.cards.map(c => c.mechanism.toLowerCase());
  const theirs = new Set([...['A', 'B'].flatMap(k => landscaper.category_page_blocks[k].problems.cards.map(c => c.mechanism.toLowerCase())), ...['A', 'B'].flatMap(k => landscaper.service_page_blocks[k].problems.cards.map(c => c.mechanism.toLowerCase()))]);
  return own('A').length === 4 && own('B').length === 4 && [...own('A'), ...own('B')].every(m => m && !theirs.has(m)) && !LB.briefGaps(L.A).length && !LB.briefGaps(L.B).length;
})(), '', 'distinct');
chk('briefs: the niche .md carries the same section (titles, mechanisms and questions)', (() => {
  const md = fs.readFileSync(path.join(root, 'niche-library/Niche_Library_Landscaper.md'), 'utf8');
  const L = landscaper.location_page_blocks;
  return /## Location page blocks by business type \(location_page_blocks\)/.test(md) && ['A', 'B'].every(k => L[k].problems.cards.every(c => md.includes(`| ${c.title} | ${c.mechanism} |`)) && L[k].cost.cards.every(c => md.includes(`| ${c.title} |`)) && L[k].faq_slots.every(s => md.includes(s.question)));
})(), '', 'mirrored');

// ── The keyword word off the H1 ──
same('H1: the category word is read off the H1 (the hub pattern, "[Primary] [town]"), else the primary category', [categoryWordOf('Gardener Services in and around Romsey', 'Romsey', 'Landscaper'), categoryWordOf('Landscaper Winchester', 'Winchester', 'Gardener'), categoryWordOf('Pest Control Services in and around Hedge End', 'Hedge End', 'x'), categoryWordOf('', 'Romsey', 'Landscaper'), categoryWordOf('Garden Help', 'Romsey', 'Landscaper')], ['Gardener', 'Landscaper', 'Pest Control', 'Landscaper', 'Landscaper']);

// ── Symptoms for a location page ──
{
  const sym = A.symptomsForLocation(parsedRomsey, { categories, emergencyNiche: false });
  same('symptoms: any issue tagged with a client category, one per issue, urgent out, dossier order', sym.map(s => s.id), ['ROM-S01', 'ROM-S02', 'ROM-S03']);
  same('symptoms: the taken ones and a limit', A.symptomsForLocation(parsedRomsey, { categories, emergencyNiche: false, takenSymptoms: ['ROM-S01'], limit: 1 }).map(s => s.id), ['ROM-S02']);
  same('symptoms: a category list that matches nothing gives none; an empty list means every tagged issue', [A.symptomsForLocation(parsedRomsey, { categories: ['Roofer'], emergencyNiche: false }).length, A.symptomsForLocation(parsedRomsey, { categories: [], emergencyNiche: false }).length], [0, 3]);
}
same('trade facts: every Table A row of the pack as how it\'s done text; none for a missing pack', [P.standardMethodRows('landscaper').length > 30, P.standardMethodRows('landscaper')[0].service, P.standardMethodRows('nope').length, P.standardMethodRows(null).length], [true, 'Lawn mowing', 0, 0]);

// ── The Romsey decisions (multi category client, type A) ──
const symptoms = A.symptomsForLocation(parsedRomsey, { categories, emergencyNiche: false }).map(resolve);
const usedMech = [{ page: 'Gardener Romsey category page', text: 'shade and damp ground' }, { page: 'Tree stump removal Romsey page', text: 'the job left undone' }, { page: 'Paving Contractor Romsey category page', text: landscaper.location_page_blocks.A.problems.cards[0].mechanism }];
const R = computeLocationDecisions({ cv, niche, keyValueMap: kv, rows, page: romseyPage, allocation, town: ROMSEY, symptoms, ideasUsed: [{ page: 'homepage', text: 'The quarter acre plots of Bassett Heath leave room for a patio, a lawn and a border without one crowding the others.' }], mechanismsUsed: usedMech, reviews: [] });
const D = R.decisions;
chk('romsey: no gate fails', !R.gates.length, JSON.stringify(R.gates), '[]');
same('romsey: the H1 is the page map\'s (the hub pattern), the keyword word Gardener, the work noun Landscaping from the primary category, type A, town scope', [D.d2_h1, D.h1_source, D.keyword, D.cat, D.work, D.type.key, D.scope, D.primary_category], ['Gardener Services in and around Romsey', 'page map', 'gardener in Romsey', 'Gardener', 'Landscaping', 'A', 'town', 'Landscaper']);
same('romsey: the meta reads "[company] is a gardener in Romsey offering [proof]"', D.d4_meta, 'Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quote today.');
same('romsey: the H2s carry the work noun, the town stays in the problems H2', D.h2, { services: 'Our Landscaping Services in Romsey', content: 'Local Landscaping for Romsey Homeowners', problems: 'Common Landscaping Problems in Romsey', cost: 'What Affects the Cost of Landscaping in Romsey', reviews: 'What Romsey Homeowners Say About Our Landscaping', process: 'Your Free Quote in 3 Simple Steps', areas: 'Where We Provide Landscaping Around Romsey', faq: 'Landscaping Questions Answered', final_cta: 'Get a Free Landscaping Quote in Romsey' });
same('romsey: the cards are the town\'s six location category pages, page map order, named by the category\'s work noun', D.cards.map(c => `${c.name} ${c.url} ${c.target}`), ['Gardening /locations/romsey/gardener location-category', 'Landscape Gardening /locations/romsey/landscape-gardener location-category', 'Garden Design /locations/romsey/landscape-designer location-category', 'Tree Surgery /locations/romsey/tree-service location-category', 'Paving /locations/romsey/paving-contractor location-category', 'Decking /locations/romsey/deck-builder location-category']);
same('romsey: a category with no work noun keeps its page\'s own H1 word', computeLocationDecisions({ cv, niche: { ...niche, category_work_nouns: { landscaper: 'landscaping' } }, keyValueMap: kv, rows, page: romseyPage, town: ROMSEY, symptoms: [], reviews: [] }).decisions.cards.map(c => c.name), ['Gardener', 'Landscape Gardener', 'Landscape Designer', 'Tree Surgeon', 'Paving Contractor', 'Deck Builder']);
chk('romsey: every card has its own opening shape and link phrase', new Set(D.cards.map(c => c.shape)).size === 6 && new Set(D.cards.map(c => c.link_phrase)).size === 6 && D.cards.every(c => c.link_phrase.includes(`[${c.name.toLowerCase()}](${c.url})`)), '', 'distinct');
same('romsey: five FAQ questions, the town question as "How soon" (start_time is set), every doubt but Fit', [D.faq.map(q => `${q.slot}: ${q.question} [${q.doubt}]`), R.flags.find(f => f.code === 'N25').msg], [['cost: How much does landscaping cost in Romsey? [Price]', 'town: How soon can you get to Romsey? [Timing]', 'cover: Are you insured? [Trust]', 'process: What happens when I ask for a quote in Romsey? [Process]', 'timing: When is the best time of year for landscaping work? [Timing]'], 'FAQ missing doubts: Fit']);
same('romsey: with no start_time the town question is "Do you cover Romsey?" (Fit)', computeLocationDecisions({ cv: { ...cv, start_time: '' }, niche, keyValueMap: kv, rows, page: romseyPage, town: ROMSEY, symptoms: [], reviews: [] }).decisions.faq.find(q => q.slot === 'town').question, 'Do you cover Romsey?');
same('romsey: the steps fall back to the niche steps (type A has none of its own)', D.niche_steps.map(s => s.title), ['Tell Us About Your Garden', 'We Price Your Job', 'We Start on a Date That Suits You']);
same('romsey: block 4 cards take the assigned symptoms in order, the fourth the niche fears; the mechanisms are the briefs\'', [D.problems.map(p => p.source.kind), D.problems.map(p => p.mechanism)], [['symptom', 'symptom', 'symptom', 'fears'], landscaper.location_page_blocks.A.problems.cards.map(c => c.mechanism)]);
same('romsey: MECHANISMS USED drops the causes this page\'s own cards make', D.mechanismsUsed.map(m => m.text), ['shade and damp ground', 'the job left undone']);
same('romsey: the areas list is the dossier\'s neighbourhoods and villages, unlinked; two allocated neighbourhoods with the conservation mark', [D.areas.plain, D.allocated.neighbourhoods.map(n => `${n.name}${n.conservation ? ' (CA)' : ''}`), Object.keys(D.allocated.symptoms)], [['Abbey Quarter', 'Cupernham', 'Awbridge', 'Timsbury'], ['Abbey Quarter (CA)', 'Cupernham'], ['problem_1', 'problem_2', 'problem_3']]);
same('romsey: LINKABLE PAGES: the homepage, the six cards and the three town service pages; nothing in another town; the town prefix', [D.linkablePages.map(p => p.type).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {}), D.linkablePages.every(p => p.url === '/' || p.url.startsWith('/locations/romsey/')), D.townPagePrefix, D.contentLinks.length], [{ homepage: 1, 'location-category': 6, 'town-service': 3 }, true, '/locations/romsey/', 6]);
same('romsey: breadcrumb Home › Romsey; reviews hidden; no trade facts', [D.breadcrumb.map(b => `${b.name}${b.url ? ' ' + b.url : ''}`), D.reviews.show, D.trade_facts], [['Home /', 'Romsey'], false, null]);
chk('romsey: the message carries the town rule, the base once in the areas intro, the travel distance, no how it\'s done, MECHANISMS USED and IDEAS USED ELSEWHERE', ['names Romsey and no other town, anywhere, including Southampton', 'our base in Southampton', '[CV: travel_distance]', 'No how it\'s done sentence', 'MECHANISMS USED', '- (Gardener Romsey category page) shade and damp ground', '- (homepage) The quarter acre plots', 'Trade facts: none for this page', 'Neighbourhood: Abbey Quarter (conservation area)'].every(s => R.decisionsBlock.includes(s)), '', 'all');
chk('romsey: no dossier gives F-ALLOC for the profile, the villages and the neighbourhoods; a blank H1 gets "[primary category] [town]" and F-H1', (() => {
  const a = computeLocationDecisions({ cv, niche, keyValueMap: kv, rows, page: romseyPage, town: null, symptoms: [], reviews: [] });
  const b = computeLocationDecisions({ cv, niche, keyValueMap: kv, rows, page: { ...romseyPage, h1: '' }, town: ROMSEY, symptoms: [], reviews: [] });
  return a.flags.filter(f => f.code === 'F-ALLOC').length === 4 && a.decisions.areas.plain.length === 0 && b.decisions.d2_h1 === 'Landscaper Romsey' && b.decisions.h1_source === 'fallback' && b.decisions.keyword === 'landscaper in Romsey' && b.flags.some(f => f.code === 'F-H1');
})(), '', 'F-ALLOC, F-H1');
same('winchester: "Landscaper Winchester" gives the keyword word Landscaper', (() => { const W = computeLocationDecisions({ cv, niche, keyValueMap: kv, rows, page: winchesterPage, town: null, symptoms: [], reviews: [] }).decisions; return [W.d2_h1, W.keyword, W.cat]; })(), ['Landscaper Winchester', 'landscaper in Winchester', 'Landscaper']);
chk('gates: a blank primary category with no category rows, and a missing niche section', (() => {
  const a = computeLocationDecisions({ cv: { ...cv, primary_category: '' }, niche, keyValueMap: kv, rows: rows.filter(r => r.type !== 'category'), page: romseyPage, town: ROMSEY, symptoms: [], reviews: [] });
  const b = computeLocationDecisions({ cv, niche: { ...niche, location_page_blocks: undefined }, keyValueMap: kv, rows, page: romseyPage, town: ROMSEY, symptoms: [], reviews: [] });
  return a.gates.some(g => g.code === 'G-INPUT' && /primary category/.test(g.msg)) && b.gates.some(g => g.code === 'G-BRIEF' && /no location block briefs/.test(g.msg)) && !b.decisions;
})(), '', 'gates');

// ── A type B client: the B briefs and the category B steps by the fallback ──
{
  const B = computeLocationDecisions({ cv: { ...cv, business_type: 'B', start_time: '' }, niche, keyValueMap: kv, rows, page: romseyPage, town: ROMSEY, symptoms, reviews: [] }).decisions;
  same('type B: the B block 4 and cost cards, the category B steps, the B questions with the town one', [B.type.key, B.problems.map(p => p.title), B.niche_steps.map(s => s.title), B.faq.map(q => q.slot)], ['B', landscaper.location_page_blocks.B.problems.cards.map(c => c.title), ['Tell Us About Your Garden', 'We Agree the Round and the Price', 'We Start on a Date That Suits You'], ['cost', 'town', 'cover', 'process', 'timing']]);
  chk('type B: the visits question carries the frequency rule', /schedule is agreed with you/.test(B.faq.find(q => q.slot === 'process').answer_brief), '', 'frequency rule');
}

// ── A single category client: the cards are the town's service pages ──
{
  const single = rows.filter(r => r.type !== 'category' || r.title === 'Gardener').filter(r => r.type !== 'location_category');
  const S = computeLocationDecisions({ cv, niche, keyValueMap: kv, rows: single, page: romseyPage, town: ROMSEY, symptoms: [], reviews: [] }).decisions;
  same('single category: the cards are Romsey\'s town service pages by their plain names; LINKABLE PAGES is the homepage and those pages', [S.card_mode, S.cards.map(c => `${c.name} ${c.url} ${c.target}`), S.linkablePages.map(p => p.type)], ['services', ['Fencing /locations/romsey/fencing town-service', 'Garden maintenance /locations/romsey/garden-maintenance town-service', 'Tree stump removal /locations/romsey/tree-stump-removal town-service'], ['homepage', 'town-service', 'town-service', 'town-service']]);
  const bare = rows.find(r => r.type === 'location' && !rows.some(t => t.type === 'town_service' && t.info.town === r.info.town));
  chk('single category: a town with no pages gets F-CARDS and still runs', (() => { const r = computeLocationDecisions({ cv, niche, keyValueMap: kv, rows: single, page: bare, town: null, symptoms: [], reviews: [] }); return !!bare && !r.gates.length && r.flags.some(f => f.code === 'F-CARDS') && r.decisions.cards.length === 0; })(), JSON.stringify(bare && bare.title), 'F-CARDS');
}

// ── A model output that passes: the words of a page about Romsey ──
const FILL = ['We keep the area tidy as we go.', 'You get a clear plan before anything starts.', 'The work is planned around how the garden is used.', 'Every visit ends with the paths swept.', 'We talk through what the ground can take.', 'You decide what stays and what goes.', 'The job is done in the order the trade works to.', 'We leave the area ready for use.'];
const padTo = (text, min, max) => {
  const wc = t => t.replace(/\[CV: [a-z_]+\]/g, 'X').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\\n\\n/g, ' ').split(/\s+/).filter(Boolean).length;
  let i = 0, t = text;
  while (wc(t) < min) t += ' ' + FILL[i++ % FILL.length];
  if (wc(t) > max) throw new Error(`too long (${wc(t)}): ${t}`);
  return t;
};
function outputFor(Dd) {
  const kw = Dd.keyword;
  const L = ['=== MODEL OUTPUT: location ==='];
  L.push(`${PT.LABELS.hero}: ${padTo(`[CV: company_name] is a ${kw.replace(' in ', ' working across ')}, from the terraces by the Abbey to the estates on the hill. Our prices are agreed before we start and never grow once the job is under way.`, 20, 49)}`);
  L.push(`${PT.LABELS.servicesIntro}: ${padTo(`Across ${Dd.town} we take on the whole garden, from a new patio and the fences round it to the regular cut that keeps a lawn in shape. It suits homeowners who want one firm for all of it rather than three.`, 30, 60)}`);
  L.push(`${PT.LABELS.cards}:`);
  const cardText = {
    'location-category': [
      'Lawns that have got away, hedges over the path and beds full of weeds are what our [X] work sorts out, with lawn mowing, hedge trimming and weed control on a round that suits you.',
      'Want the garden rebuilt rather than kept? That is the [X] we do: garden levelling, retaining walls and turf laying, so a tired plot becomes one you use.',
      'A plan for the whole plot comes first on a [X] job, so the patios, the paths and the planting sit where the garden earns its keep for the way you live in it.',
      'Autumn and late winter are when most people think about booking [X] work, with tree pruning and crown reduction, tree removal and felling and tree stump removal done while the sap is down.',
      'A drive laid on a thin base sinks inside a year, so our [X] visits start underneath, with block paving, patios and concrete bases and paths built on ground that has been compacted first.',
      'Wanting a deck that stays level and dry is the [X] side of what we do, with decking installation, composite decking and pergolas built on posts set clear of the wet.',
    ],
    'town-service': [
      'Posts that lean and panels that rattle are what our [X] work puts right, with new posts set so the timber stays out of the wet and the panels stay straight.',
      'Want the beds and the hedges kept as well as the lawn? That is the [X] we do, with the borders weeded, the edges cut and the hedges trimmed on each visit.',
      'A stump that keeps sprouting is a [X] job: the stump is ground out below the surface and the hole filled, so the lawn can be laid level over it.',
    ],
  };
  Dd.cards.forEach((c, i) => { const texts = cardText[c.target]; L.push(`  - card_name: ${c.name} | card_text: ${padTo(texts[i % texts.length].replace('[X]', `[${c.name.toLowerCase()}](${c.url})`), 40, 55)}`); });
  const links = Dd.contentLinks;
  const para1 = `A ${kw} works on ground that drains fast, because the town sits on gravel over chalk, so a new lawn here needs the soil built up before it goes down. Closer to the river meadows the water table rises to the surface after rain, and any patio there needs a base that lets the water through rather than a solid one that holds it. The same fast draining ground dries a fence post out in summer, while one set near the water sits wet all year.`;
  const para2 = `The terraced streets around the Abbey have small walled gardens with no side access, so materials come through the house and a skip sits on the road. Out at Cupernham the estates have long back gardens that slope away from the house, which means levels and a retaining edge before a lawn or a patio can go in.`;
  const para3 = `On the fast draining gravel a lawn needs feeding more often, which is what our ${links[0] ? `[${links[0].name.toLowerCase()}](${links[0].url})` : 'gardening'} work keeps on top of through the year, and a plot on a slope is where our ${links[1] ? `[${links[1].name.toLowerCase()}](${links[1].url})` : 'landscaping'} work earns its keep with levels and a retaining edge. We are family run and independent, so the person who quotes is the person who turns up.`;
  const paras = [para1, para2, para3, 'Send us a photo of the garden and we will tell you what it needs.'];
  const wc = t => t.replace(/\[CV: [a-z_]+\]/g, 'X').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length;
  const total = paras.reduce((n, p) => n + wc(p), 0);
  if (total < 200 || total > 250) throw new Error(`content block ${total} words`);
  L.push(`${PT.LABELS.content}: ${paras.join('\\n\\n')}`);
  L.push(`${PT.LABELS.block4}:`);
  const bodies4 = [
    'A lawn that stays soft long after the rain has stopped is sitting on ground that holds water, and close to the river that is the water table rather than the soil. Anything that goes into that ground, a post, a base or a drain, has to allow for it from the start.',
    'Fence panels that lean and gate posts soft at the bottom were put up when the estates were built, and they have reached the end of their life together. Replacing a run of boundary means new posts set to stay dry, not one panel propped up at a time.',
    'A canopy over the whole lawn and roots lifting the path come from trees planted when the garden was bigger than the plot is now. Inside the conservation area a protected tree usually needs the council told before it is touched, so that check comes first.',
    'Rain that runs off a paved front and pools at the gate has nowhere to soak in, and on the terraced streets it heads for the road or the neighbour. A new hard surface at the front usually needs to let water through or drain inside the plot.',
  ];
  Dd.problems.forEach((p, i) => L.push(`  - card_title: ${p.title} | card_body: ${padTo(bodies4[i % 4], 40, 60)}`));
  L.push(`${PT.LABELS.costIntro}: ${padTo('Prices vary here because the gardens do, from a walled yard by the Abbey to a sloping plot on the edge of the town. We look at the garden first, then give you a figure that stays the same.', 30, 50)}`);
  L.push(`${PT.LABELS.block5}:`);
  const bodies5 = [
    'Where the only way to the back garden is through the house, every bag of sand comes through the hall and the skip sits on the road, so the job takes longer than the same work with a side gate.',
    'A garden that slopes away from the house needs the levels taken and a retaining edge built before anything else goes in, which adds digging and materials that a flat plot never needs.',
    'Inside the conservation area a tree with protection on it usually needs the council told before work starts, and the wait for that goes into the timing rather than the price.',
    'Old concrete, a shed base and a hedge that has had thirty years to grow all have to come out and go in a skip before anything new goes in, and older gardens carry more of it.',
  ];
  Dd.cost.forEach((p, i) => L.push(`  - card_title: ${p.title} | card_body: ${padTo(bodies5[i % 4], 30, 45)}`));
  L.push(`${PT.LABELS.steps}:`);
  Dd.niche_steps.forEach((s, i) => L.push(`  - step_title: ${s.title} | step_body: ${padTo(['Send us a note about the garden and what you would like done, with a photo if you have one.', 'We look at the garden and agree what the job covers, so there is nothing left to work out later.', 'The start goes in the diary on a day that suits you, and the work follows from there.'][i % 3], 20, 30)}`));
  L.push(`${PT.LABELS.areasIntro}: ${padTo(`We cover the whole of ${Dd.town} and the villages and hamlets around it from our base in Southampton, [CV: travel_distance] up the valley. Every job we do goes everywhere we cover, with the same people doing the work wherever the garden sits.`, 40, 60)}`);
  L.push(`${PT.LABELS.faq}:`);
  const townLink = links[0] ? `[${links[0].name.toLowerCase()}](${links[0].url})` : '[garden](/)';
  const answers = {
    cost: 'It depends on the size of the garden, the ground and how we get in. A walled yard with no side access costs more to work in than an open plot, and a slope adds digging that a flat lawn never needs.',
    town: `Usually within the same week, and [CV: start_time] for most jobs. The town is inside the area we cover, so there is no extra for the distance, and our ${townLink} visits run there through the year.`,
    cover: 'Tell us and we look at it. Every trade works to a standard of reasonable care and skill, and that is the standard the work is held to, whatever the job was.',
    process: 'Send us a photo and a few lines about what you want. You get a figure for the whole job before anything starts, and it covers what we agreed and nothing else.',
    timing: 'Hard landscaping runs most of the year in dry spells, and planting and turf do well in autumn and spring. Spring fills up first, so a garden wanted for the summer is booked ahead.',
  };
  Dd.faq.forEach(q => L.push(`  - faq_question: ${q.question} | faq_answer: ${padTo(answers[q.slot] || answers.cover, 30, 70)}`));
  L.push(`${PT.LABELS.finalCta}: ${padTo('Send us a few lines about the garden and we will come back with a price for the job.', 15, 25)}`);
  L.push('MODEL_FLAGS: none');
  return L.join('\n');
}

// ── Parser and record ──
const raw = outputFor(D);
const parsed = parseOutput(raw, PT.OUTPUT_SPEC, expectedFromLocationDecisions(D));
same('parser: no flags on a complete output', parsed.flags, []);
same('parser: six cards, four problems, four factors, three steps, five FAQs, given names kept', [parsed.fields[PT.LABELS.cards].length, parsed.fields[PT.LABELS.block4].length, parsed.fields[PT.LABELS.block5].length, parsed.fields[PT.LABELS.steps].length, parsed.fields[PT.LABELS.faq].length, parsed.fields[PT.LABELS.cards][3].card_name], [6, 4, 4, 3, 5, 'Tree Surgery']);
const meta = { page_type: 'location', page_key: D.slug, generated_at: '2026-10-27T12:00:00.000Z', client_values: G.clientValueMap(cv, D.d1_years_trading), decisions_block: R.decisionsBlock, mechanisms: D.problems.map(p => p.mechanism) };
const record = buildLocationRecord({ cv, decisionsResult: R, parsed, meta });
same('record: page order fields, the cards with their urls, hidden reviews, the unlinked areas list, the FAQ', [record.page, record.scope, record.town, record.loc_hero_h1, record.cards.length, record.cards[3].card_url, record.loc_reviews_h2, record.loc_areas_links.map(a => a.url), record.faq_items.length, record.buttons, record.breadcrumb.map(b => b.name)], ['location', 'town', 'Romsey', 'Gardener Services in and around Romsey', 6, '/locations/romsey/tree-service', 'HIDDEN', [null, null, null, null], 5, ['Get My Free Quote', 'Call [CV: phone]'], ['Home', 'Romsey']]);
same('record: the page type lists 25 model fields in page order', getPageType('location').modelFields(record).length, 1 + 1 + 6 + 1 + 4 + 1 + 4 + 3 + 1 + 5 + 1);
chk('record: a gate gives a blocked record with no fields', (() => { const r = buildLocationRecord({ cv, decisionsResult: { gates: [{ code: 'G-MAP', msg: 'x' }], flags: [], decisions: null }, parsed: null, meta }); return r.blocked && r.FLAGS[0].source === 'gate' && !r.cards; })(), '', 'blocked');
chk('reader view: headings in order, the cards linked, the villages unlinked, hidden reviews left out', (() => { const md = buildLocationReaderView(record, meta.client_values); const i = ['# Gardener Services in and around Romsey', '## Our Landscaping Services in Romsey', '### [Gardening](/locations/romsey/gardener)', '## Local Landscaping for Romsey Homeowners', '## Common Landscaping Problems in Romsey', '## What Affects the Cost of Landscaping in Romsey', '## Your Free Quote in 3 Simple Steps', '## Where We Provide Landscaping Around Romsey', '- Abbey Quarter', '## Landscaping Questions Answered', '## Get a Free Landscaping Quote in Romsey'].map(h => md.indexOf(h)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])) && !/Say About Our/.test(md) && !/\[Abbey Quarter\]/.test(md); })(), '', 'ordered');

// ── Validator ──
const howItsDone = { paragraphs: [{ page: 'Tree stump removal Romsey page', text: 'The job starts with a look at the stump and what runs under it, because a pipe or a cable close to the roots changes the method. For most stumps a grinder does the work, taking the wood out in passes below the surface; digging and winching come in where the whole root plate has to come out for a wall or a drive.' }], rows: P.standardMethodRows('landscaper') };
const V = locationValidationContext(G.validationContextFor({ cv, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D, { howItsDone });
const issuesOf = (rec, Vx) => validateLocation(rec, Vx || V);
const blocks = iss => iss.filter(i => i.type === 'BLOCK');
const has = (iss, check, fieldPart, msgPart) => iss.some(i => i.check === check && (!fieldPart || i.field.includes(fieldPart)) && (!msgPart || i.message.includes(msgPart)));
const clean = issuesOf(record);
chk('validator: the built page has no BLOCK', !blocks(clean).length, blocks(clean).map(i => `${i.check} ${i.field}: ${i.message}`).join(' | '), 'none');
chk('validator: the built page has none of the location page\'s own FLAGs', !clean.some(i => ['TOWN-COUNT', 'HOW-DONE', 'FAQ-TOWN-LINK', 'CB-LINKS', 'INTRO-SENTENCES', 'KEYWORD'].includes(i.check)), clean.map(i => `${i.type} ${i.check} ${i.field}: ${i.message}`).join(' | '), 'none');
const withText = (rec, key, text) => { const r = JSON.parse(JSON.stringify(rec)); r[key] = text; return r; };
const withCard = (rec, i, text) => { const r = JSON.parse(JSON.stringify(rec)); r.cards[i].card_text = text; return r; };
const withFaq = (rec, i, text) => { const r = JSON.parse(JSON.stringify(rec)); r.faq_items[i].faq_answer = text; return r; };
chk('HERO-LOC: sentence 1 without the company token or the keyword phrase is a BLOCK; "working across" between the word and the town passes', (() => { const a = blocks(issuesOf(withText(record, PT.LABELS.hero, 'We look after gardens across Romsey. Prices are agreed first.'))); const b = blocks(issuesOf(withText(record, PT.LABELS.hero, '[CV: company_name] looks after the gardens of Romsey. Prices are agreed first.'))); return has(a, 'HERO-LOC', 'hero', 'no [CV: company_name]') && has(b, 'HERO-LOC', 'hero', "isn't there as a phrase") && !has(blocks(clean), 'HERO-LOC'); })(), '', 'HERO-LOC');
chk('KEYWORD: the keyword phrase outside hero and content sentence 1 is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.costIntro, 'Prices for a gardener in Romsey vary because the gardens do, from a walled yard by the Abbey to a sloping plot. We look at the garden first, then give you a figure that stays the same.'))), 'KEYWORD', 'cost_intro'), '', 'KEYWORD');
chk('TOWN-OTHER: another town anywhere is a BLOCK; the base town outside the areas intro is a BLOCK; twice in the areas intro is a BLOCK; once there passes', (() => {
  const a = blocks(issuesOf(withCard(record, 0, record.cards[0].card_text.replace('on a round that suits you', 'on the same round we run in Winchester'))));
  const b = blocks(issuesOf(withText(record, PT.LABELS.costIntro, 'Prices vary here as they do in Southampton, from a walled yard by the Abbey to a sloping plot on the edge of the town. We look at the garden first, then give you a figure that stays the same.')));
  const c = blocks(issuesOf(withText(record, PT.LABELS.areasIntro, record[PT.LABELS.areasIntro].replace('up the valley', 'up the valley from Southampton'))));
  return has(a, 'TOWN-OTHER', 'card_text', 'Winchester') && has(b, 'TOWN-OTHER', 'cost_intro', 'base town') && has(c, 'TOWN-OTHER', 'areas_intro', '2 times') && !has(blocks(clean), 'TOWN-OTHER');
})(), '', 'TOWN-OTHER');
chk('TOWN-COUNT: the town missing from the services intro is a FLAG; a third mention outside the four fields is a BLOCK', (() => {
  const a = issuesOf(withText(record, PT.LABELS.servicesIntro, 'Across the town we take on the whole garden, from a new patio and the fences round it to the regular cut that keeps a lawn in shape. It suits homeowners who want one firm for all of it rather than three.'));
  let r = withCard(record, 1, record.cards[1].card_text.replace('That is the', 'In Romsey that is the'));
  r = withCard(r, 2, r.cards[2].card_text.replace('A plan for the whole plot', 'In Romsey a plan for the whole plot'));
  r = withText(r, PT.LABELS.costIntro, r[PT.LABELS.costIntro].replace('Prices vary here', 'Prices vary in Romsey'));
  const b = issuesOf(r);
  return a.some(i => i.check === 'TOWN-COUNT' && i.type === 'FLAG' && /services_intro/.test(i.field)) && has(blocks(b), 'TOWN-COUNT', 'cost_intro', 'twice at most');
})(), '', 'TOWN-COUNT');
chk('LINK-TOWN: link text with a town is a BLOCK', has(blocks(issuesOf(withCard(record, 0, record.cards[0].card_text.replace('[gardening]', '[gardening romsey]')))), 'LINK-TOWN', 'card_text'), '', 'LINK-TOWN');
chk('CARD-TARGET: a card linking another page is a BLOCK', has(blocks(issuesOf(withCard(record, 0, record.cards[0].card_text + ' See our [fencing](/locations/romsey/fencing) work too.'))), 'CARD-TARGET', 'card_text', '/locations/romsey/fencing'), '', 'CARD-TARGET');
chk('CARD-NBHD: a village or an allocated neighbourhood in a card is a BLOCK', has(blocks(issuesOf(withCard(record, 1, record.cards[1].card_text.replace('a tired plot', 'a tired plot in Timsbury')))), 'CARD-NBHD', 'card_text', 'Timsbury') && has(blocks(issuesOf(withCard(record, 1, record.cards[1].card_text.replace('a tired plot', 'a tired plot in Cupernham')))), 'CARD-NBHD', 'card_text', 'Cupernham'), '', 'CARD-NBHD');
chk('INTRO-SENTENCES: a four sentence services intro is a FLAG', issuesOf(withText(record, PT.LABELS.servicesIntro, 'Across Romsey we take on the whole garden. A new patio and the fences round it. The regular cut that keeps a lawn in shape. It suits homeowners who want one firm for all of it.')).some(i => i.check === 'INTRO-SENTENCES' && i.type === 'FLAG'), '', 'INTRO-SENTENCES');
chk('record: the parser turned the written \\n\\n into paragraph breaks (four paragraphs)', record[PT.LABELS.content].split(/\n\n+/).length === 4, String(record[PT.LABELS.content].split(/\n\n+/).length), '4');
chk('CB-PARAS: a content block of two paragraphs is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace(/\n\n+/g, ' ').replace('Send us a photo', '\n\nSend us a photo')))), 'CB-PARAS', 'content', '2 paragraph'), '', 'CB-PARAS');
chk('CB-OPENER: a content block opening on the reader\'s search is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('A gardener in Romsey works', 'Finding a gardener in Romsey is hard, and most of our work is')))), 'CB-OPENER', 'content'), '', 'CB-OPENER');
chk('CB-LINKS: no link to a card\'s page is a FLAG; four is a BLOCK; three in a sentence is a BLOCK', (() => {
  const none = issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')));
  const four = issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('We are family run', `Our [tree surgery](${D.cards[3].url}) work and our [decking](${D.cards[5].url}) work follow. We are family run`)));
  const three = issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('earns its keep with levels', `earns its keep, with our [tree surgery](${D.cards[3].url}) work, with levels`)));
  return none.some(i => i.check === 'CB-LINKS' && i.type === 'FLAG') && has(blocks(four), 'CB-LINKS', 'content', 'links 4') && has(blocks(three), 'CB-LINKS', 'content', 'carries 3 links');
})(), '', 'CB-LINKS');
chk('CB-PROOF: the insurance figure or the guarantee length in the content block is a BLOCK', (() => {
  const a = blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('We are family run and independent', 'We are insured up to £[CV: insurance_cover] and family run'))));
  const Vg = { ...V, cv: { ...cv, guarantee_years: '5' } };
  const b = blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('We are family run and independent', 'Every job carries our 5 year guarantee and we are family run')), Vg));
  return has(a, 'CB-PROOF', 'content', 'token') && has(b, 'CB-PROOF', 'content', 'guarantee length') && !has(blocks(clean), 'CB-PROOF');
})(), '', 'CB-PROOF');
chk('CB-FACT: a paragraph with no fact from the town profile or the neighbourhoods is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace(/The terraced streets[^\n]*/, 'Some people worry about letting a firm they have not met into the garden, so the first visit is a walk round with you and nothing happens until you have said what matters most.')))), 'CB-FACT', 'content', 'Paragraph 2'), '', 'CB-FACT');
chk('HOW-DONE: a sentence remaking a service page\'s paragraph 2 is a BLOCK; one remaking a Table A row is a BLOCK; a stage opener is a FLAG', (() => {
  const a = blocks(issuesOf(withFaq(record, 2, 'Tell us and we look at it. For most stumps a grinder does the work, taking the wood out in passes below the surface, and digging and winching come in where the whole root plate has to come out for a wall or a drive.')));
  const b = blocks(issuesOf(withFaq(record, 2, 'Tell us and we look at it. We inspect the lawn and remove debris, set the cutting height, mow, edge or strim, collect or disperse the clippings and clear the paths.')));
  const c = issuesOf(withFaq(record, 2, 'Tell us and we look at it. First we look at what went wrong, then we agree what to do about it, and every trade works to a standard of reasonable care and skill.'));
  return has(a, 'HOW-DONE', 'faq_answer', 'Tree stump removal Romsey page') && has(b, 'HOW-DONE', 'faq_answer', 'trade facts') && c.some(i => i.check === 'HOW-DONE' && i.type === 'FLAG' && /First we/.test(i.message)) && !clean.some(i => i.check === 'HOW-DONE');
})(), '', 'HOW-DONE');
chk('MECHANISM: a block 4 card that makes a cause from MECHANISMS USED is a BLOCK', (() => { const r = JSON.parse(JSON.stringify(record)); r.block4[0].card_body = 'Moss comes back within weeks where the grass is thin because of shade and damp ground under the trees, and a tidy up only takes the top off it. A visit deals with the cause rather than what shows, so the lawn stays even between the cuts we make for you.'; return has(blocks(issuesOf(r)), 'MECHANISM', 'Ground that holds', 'shade and damp ground'); })(), '', 'MECHANISM');
chk('AREAS-TOWN: a village in the areas intro is a BLOCK; AREAS-SERVICES: two services listed there is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.areasIntro, record[PT.LABELS.areasIntro].replace('the villages and hamlets around it', 'Awbridge, Timsbury and the hamlets around it')))), 'AREAS-TOWN', 'areas_intro', 'Awbridge') && has(blocks(issuesOf(withText(record, PT.LABELS.areasIntro, record[PT.LABELS.areasIntro].replace('Every job we do', 'Lawn mowing, hedge trimming and fencing')))), 'AREAS-SERVICES', 'areas_intro'), JSON.stringify(blocks(issuesOf(withText(record, PT.LABELS.areasIntro, record[PT.LABELS.areasIntro].replace('Every job we do', 'Lawn mowing, hedge trimming and fencing')))).map(i => i.check)), 'AREAS');
chk('FAQ-TOWN-LINK: no FAQ answer linking a page in the town is a FLAG', issuesOf(withFaq(record, 1, 'Usually within the same week, and [CV: start_time] for most jobs. The town is inside the area we cover, so there is no extra for the distance, and the visits run there through the year.')).some(i => i.check === 'FAQ-TOWN-LINK' && i.type === 'FLAG'), '', 'FAQ-TOWN-LINK');
chk('FINAL-CTA: "Tell us" as the opener is a FLAG', issuesOf(withText(record, PT.LABELS.finalCta, 'Tell us a few things about the garden and we will come back with a price for the job.')).some(i => i.check === 'FINAL-CTA' && /Tell us/.test(i.message)), '', 'FINAL-CTA');
chk('IDEAS: a sentence remaking an idea from IDEAS USED ELSEWHERE is a BLOCK; the areas intro is left out', (() => {
  const Vi = { ...V, D: { ...D, ideasUsed: [{ page: 'Gardener Romsey category page', text: 'Closer to the river meadows the water table rises to the surface after rain, and any patio there needs a base that lets the water through rather than a solid one that holds it.' }, { page: 'Tree Surgeon Romsey category page', text: 'We cover the whole of Romsey and the villages and hamlets around it from our base in Southampton, twenty miles up the valley.' }] } };
  const iss = issuesOf(record, Vi);
  return has(blocks(iss), 'IDEAS', 'content', 'Gardener Romsey category page') && !has(iss, 'IDEAS', 'areas_intro');
})(), '', 'IDEAS');
chk('shared: CARD-LINK wants the card\'s own link inside a sentence; CARD-LOCAL blocks a neighbourhood street', has(blocks(issuesOf(withCard(record, 0, record.cards[0].card_text.replace(/\[gardening\]\([^)]+\)/, 'gardening')))), 'CARD-LINK', 'card_text'), '', 'CARD-LINK');

// ── The rubric reviewer on location pages (code side) ──
{
  const Q = require(path.join(root, 'quality-review.js'));
  const scored = Q.scoreCodeItems({ record, V, D, cv, niche });
  const ids = scored.items.map(i => i.id);
  chk('rubric: a location page is scored with the homepage items plus the location items', ['K1', 'I1', 'T3', 'T4', 'S11', 'Y8', 'A3', 'A5', 'B8', 'B7', 'L2', 'L3', 'L4', 'L5', 'L6', 'V7', 'H1', 'C1', 'P3'].every(i => ids.includes(i)) && !ids.includes('V1') && !ids.includes('T5'), ids.join(','), 'homepage + location items');
  chk('rubric: the built page passes the location items', ['E1', 'K1', 'I1', 'T3', 'T4', 'S11', 'Y8', 'A3', 'A5', 'B8', 'B7', 'L2', 'L3', 'L4', 'L5', 'L6', 'V7'].every(i => scored.items.find(x => x.id === i).pass), JSON.stringify(scored.items.filter(i => !i.pass).map(i => i.id + ': ' + i.reasons[0])), 'pass');
  const dec = Q.decisionsTests({ record, D, cv, niche });
  chk('rubric: the final CTA heading names the work noun; no card pick, meta or area list test fails', dec.finalCta === null && dec.cardPicks === null && dec.meta === null && dec.areaList === null, JSON.stringify(dec), '');
  const bad = withCard(withFaq(record, 1, 'Usually within the same week, and [CV: start_time] for most jobs. The town is inside the area we cover, so there is no extra for the distance, and the visits run there through the year.'), 1, record.cards[1].card_text.replace('a tired plot', 'a tired plot in Timsbury'));
  const fails = Object.fromEntries(Q.scoreCodeItems({ record: bad, V, D, cv, niche }).items.filter(i => !i.pass).map(i => [i.id, i.reasons[0]]));
  chk('rubric: L5 fails on the village in a card, L6 on no town link in the FAQ', /Timsbury/.test(fails.L5) && /links a page in Romsey/.test(fails.L6), JSON.stringify(Object.keys(fails)), 'L5, L6');
  const J = Q.judgeItemsFor(record);
  chk('rubric: the judge gets the location page items (the town paragraphs, the harder local rule, the town only item)', /paragraph 1 gives two or three concrete details/.test(J.B1j) && /applied harder/.test(J.L1) && /plain category or service name/.test(J.T6j) && /MECHANISMS USED/.test(J.P6), Object.keys(J).join(','), 'B1j, L1, T6j, P6');
  chk('rubric: the reviewer reads the location reader view and the decisions summary names the town and the cards', /Gardener Services in and around Romsey/.test(Q.pageText(record)) && !/Review notes/.test(Q.pageText(record)) && /Location page for Romsey/.test(Q.decisionsSummary(record, D)) && /Tree Surgery → \/locations\/romsey\/tree-service/.test(Q.decisionsSummary(record, D)), '', 'location reader');
  const doc = fs.readFileSync(path.join(root, 'docs/seo/COPY_QUALITY_RUBRIC.md'), 'utf8');
  chk('rubric doc: section L lists the location items', /## L\. Location pages \(CORE \(18\)/.test(doc) && ['L2', 'L3', 'L4', 'L5', 'L6'].every(id => new RegExp(`^\\| ${id} \\|`, 'm').test(doc)), '', 'section L');
}

// ── The prompt and the shared rules ──
{
  const core = loadCore18();
  chk('prompt: CORE (18) is read with the shared rules appended under their own heading', /# Location Page Copywriting Prompt — CORE \(18\)/.test(core) && /## SHARED COPY RULES \(prompts\/_shared_copy_rules\.md/.test(core) && /\*\*One home per proof\*\*/.test(core) && core.indexOf('## OUTPUT') < core.indexOf('## SHARED COPY RULES'), '', 'appended');
  chk('prompt: the OUTPUT labels are the page type\'s labels', Object.values(PT.LABELS).every(l => core.includes(`${l}:`)), Object.values(PT.LABELS).filter(l => !core.includes(`${l}:`)).join(','), 'all');
}

// ── The runner on pg-mem: the town's pages first, council areas out, order, skip, resume, the allocation pass, the taken items ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  const v20Store = createV20Store(pool);
  const cid = crypto.randomUUID();
  // Romsey with two of its category pages and one town service page; Winchester with none; New Forest District as a phase 1 council area
  const keepLoc = new Set(['/locations/romsey/gardener', '/locations/romsey/tree-service', '/locations/romsey/tree-stump-removal']);
  const smallRows = rows.filter(r => !['location_category', 'town_service'].includes(r.type) || keepLoc.has(r.slug)).filter(r => r.type !== 'location' || ['Romsey', 'Winchester', 'New Forest District'].includes(r.title))
    .map(r => (r.type === 'location' && r.title === 'New Forest District' ? { ...r, info: { ...r.info, phase: 1 } } : r));
  const dossiers = [{ id: 'd1', text: fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'), locationName: 'Southampton' }, { id: 'd2', locationName: 'Romsey', text: ROMSEY_DOSSIER }];
  const allocationRecord = { version: 1, pages: { homepage: { neighbourhoods: ['SOU-N07', 'SOU-N11'], symptoms: {}, conservation_areas: ['SOU-N11'] }, 'category:/locations/romsey/gardener': { neighbourhoods: ['ROM-N03'], symptoms: {}, conservation_areas: [] } } };
  const calls = [], allocCalls = [];
  let failNext = false;
  const inputs = { ctx: { ...ctx, cv }, niche, rows: smallRows, dossiers, allocationRecord, calibrationPack: { name: null, text: '' }, tradeFacts: { niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: false }, reviews: [], saveAllocation: async r => { inputs.allocationRecord = r; } };
  const runner = createLocationRunner({
    pool, v20Store, log: () => {},
    loadInputs: async () => inputs,
    allocate: async ({ page, dossierText }) => { allocCalls.push({ label: page.label, taken: page.takenNeighbourhoods, romsey: /Abbey Quarter/.test(dossierText) }); return { neighbourhoods: ['ROM-N01', 'ROM-N02'], conservation_areas: [], reasons: 'stub', flags: [], source: 'model' }; },
    generate: async args => {
      const Dd = args.decisionsResult.decisions;
      calls.push({ key: Dd.slug, ideas: Dd.ideasUsed.map(i => i.page), mechanisms: Dd.mechanismsUsed.map(m => m.text), neighbourhoods: Dd.allocated.neighbourhoods.map(n => n.name), symptoms: Object.values(Dd.allocated.symptoms).map(s => s.text), paragraphs: args.howItsDone.paragraphs.length, rows: args.howItsDone.rows.length, flags: args.extraFlags.map(f => f.code) });
      if (failNext) { failNext = false; throw new Error('model down'); }
      return generateLocationPage({ ...args, retries: false, claimsReview: false, callModel: async () => ({ text: outputFor(Dd), usage: {} }) });
    },
  });
  same('runner: the live location pages in page map order, the council area included for the skip', pagesInOrder(smallRows).map(p => p.slug), ['/locations/romsey', '/locations/winchester', '/locations/new-forest-district']);
  same('runner: the town\'s pages are its live location category and town service pages', [townPagesOf(smallRows, 'Romsey').map(r => r.slug), townPagesOf(smallRows, 'Winchester').length], [['/locations/romsey/gardener', '/locations/romsey/tree-service', '/locations/romsey/tree-stump-removal'], 0]);
  let st = await runner.run(cid, { resume: false });
  same('runner: Romsey is skipped until its pages are written, Winchester (no pages in the town) is written, the council area is skipped', st.pages.map(p => `${p.key}:${p.status}${p.error ? ':' + p.error : ''}`), ['/locations/romsey:skipped:Romsey\'s pages not written yet (/locations/romsey/gardener, /locations/romsey/tree-service, /locations/romsey/tree-stump-removal)', '/locations/winchester:done', '/locations/new-forest-district:skipped:New Forest District is a council area, not a town: no location page is written for it']);
  chk('runner: Winchester ran with no dossier (F-ALLOC), no cards (F-CARDS) and nothing taken', calls.length === 1 && calls[0].key === '/locations/winchester' && calls[0].flags.includes('F-ALLOC') && !calls[0].mechanisms.length && !calls[0].symptoms.length && calls[0].rows > 30, JSON.stringify(calls[0]), '');
  // The town's pages get records: two category pages (one blocked) and the service page
  const catRec = (slug, category, mechanisms, symptom, idea) => ({ page: 'category', scope: 'town', category, town: 'Romsey', page_slug: slug, cat_content_body: 'x', VALIDATION: { status: 'run', block: 0, flag: 0 }, meta: { page_type: 'category', page_key: slug, mechanisms, decisions_block: `--- BLOCK 4 ---\n  Local symptoms for the problems block:\n    "${symptom}" (issue: x)\n`, ideas: idea ? [{ field: 'cat_content_body', text: idea, kind: 'local' }] : [] } });
  await v20Store.insert(cid, catRec('/locations/romsey/gardener', 'Gardener', ['shade and damp ground', 'the timing of cuts'], 'The lawn stays soft for days after rain.', 'Lawns beside the Test meadows need a drain put in before any turf goes down, because the water sits just under the grass.'), { type: 'category', key: '/locations/romsey/gardener' });
  await v20Store.insert(cid, { page: 'category', blocked: true, FLAGS: [{ code: 'G-MAP', msg: 'x', source: 'gate' }], meta: { page_type: 'category', page_key: '/locations/romsey/tree-service' } }, { type: 'category', key: '/locations/romsey/tree-service' });
  const svcRec = { page: 'service', scope: 'town', service: 'Tree stump removal', town: 'Romsey', page_slug: '/locations/romsey/tree-stump-removal', svc_content_body: `Most of our stump work is in the town.\n\n${howItsDone.paragraphs[0].text}\n\nA stump left in the ground stays in the way.\n\nSee our full [tree stump removal](/services/tree-stump-removal) service.`, VALIDATION: { status: 'run', block: 0, flag: 0 }, meta: { page_type: 'service', page_key: '/locations/romsey/tree-stump-removal', mechanisms: ['the job left undone'], decisions_block: '', ideas: [] } };
  await v20Store.insert(cid, svcRec, { type: 'service', key: '/locations/romsey/tree-stump-removal' });
  same('runner: paragraph 2 of a service record is the how it\'s done text', paragraphTwo(svcRec).slice(0, 40), howItsDone.paragraphs[0].text.slice(0, 40));
  st = await runner.run(cid, { resume: false, keys: ['/locations/romsey'] });
  same('runner: a blocked category page still counts as unwritten', st.pages.map(p => `${p.key}:${p.status}:${p.error}`), ['/locations/romsey:skipped:Romsey\'s pages not written yet (/locations/romsey/tree-service)']);
  await v20Store.insert(cid, catRec('/locations/romsey/tree-service', 'Tree Service', ['roots lifting a surface', landscaper.location_page_blocks.A.problems.cards[2].mechanism], 'A stump in the lawn keeps sprouting.', null), { type: 'category', key: '/locations/romsey/tree-service' });
  failNext = true;
  st = await runner.run(cid, { resume: false });
  same('runner: a failed page is recorded and the run carries on; the council area stays skipped', st.pages.map(p => `${p.key}:${p.status}`), ['/locations/romsey:failed', '/locations/winchester:done', '/locations/new-forest-district:skipped']);
  { const f = await v20Store.latest(cid, { type: 'location', key: '/locations/romsey' }); chk('runner: the failed page\'s record keeps the error and the decisions block', f.record.error === 'model down' && !!f.record.meta.decisions_block, JSON.stringify([f.record.error]), 'model down'); }
  st = await runner.run(cid, { resume: true });
  same('runner: resume keeps the good page and writes the failed one again', st.pages.map(p => `${p.key}:${p.status}`), ['/locations/romsey:done', '/locations/winchester:kept', '/locations/new-forest-district:skipped']);
  const rom = calls.find(c => c.key === '/locations/romsey' && c.mechanisms.length);
  same('runner: the Romsey page saw the town\'s pages\' mechanisms (its own briefs\' cause left out), their ideas and the homepage\'s, and the symptoms they took were taken out', [rom.mechanisms, rom.ideas, rom.symptoms, rom.paragraphs, rom.rows > 30, rom.flags], [['shade and damp ground', 'the timing of cuts', 'roots lifting a surface', 'the job left undone'], ['Gardener Romsey category page'], ['Rain runs off the front and pools at the gate.'], 1, true, []]);
  same('runner: the allocation pass ran on the Romsey dossier with the town\'s other pages\' neighbourhoods taken, once, and was saved under the page key', [allocCalls, Object.keys(inputs.allocationRecord.pages).includes('location:/locations/romsey'), inputs.allocationRecord.pages['location:/locations/romsey'].neighbourhoods, rom.neighbourhoods], [[{ label: 'location page: Romsey', taken: ['ROM-N03'], romsey: true }], true, ['ROM-N01', 'ROM-N02'], ['Abbey Quarter', 'Cupernham']]);
  const romRec = (await v20Store.latest(cid, { type: 'location', key: '/locations/romsey' })).record;
  chk('runner: the Romsey record is good: 0 BLOCK, the town profile and the villages in it, the mechanisms and the ideas stored', romRec.VALIDATION.block === 0 && /market town on the River Test/.test(romRec.meta.decisions_block) && romRec.loc_areas_links.map(a => a.name).join(',') === 'Abbey Quarter,Cupernham,Awbridge,Timsbury' && romRec.meta.mechanisms.length === 4 && Array.isArray(romRec.meta.ideas) && romRec.meta.ideas.length > 0, JSON.stringify([romRec.VALIDATION.issues.filter(i => i.type === 'BLOCK'), romRec.loc_areas_links]), '');
  const view = await runner.view(cid, smallRows);
  same('runner: the panel view lists every page with its record, the town\'s pages\' state and what it waits on', view.pages.map(p => `${p.key} ${p.record ? (p.record.good ? 'good' : 'bad') : 'none'} ${p.town_pages_written}/${p.town_pages} ${p.ready} ${p.admin_area}`).concat(view.pages.filter(p => p.record && !p.record.good).length ? [JSON.stringify((await v20Store.latest(cid, { type: 'location', key: '/locations/winchester' })).record.VALIDATION.issues.filter(i => i.type === 'BLOCK').map(i => i.check + ' ' + i.field + ': ' + i.message))] : []), ['/locations/romsey good 3/3 true false', '/locations/winchester good 0/0 true false', '/locations/new-forest-district none 0/0 false true']);
  const written = await runner.writtenFor(cid, smallRows, smallRows.find(r => r.slug === '/locations/romsey'));
  same('runner: the written set for the page carries the homepage and the town\'s records', [written.homepage, written.townPages.map(p => p.slug), written.missing], [null, ['/locations/romsey/gardener', '/locations/romsey/tree-service', '/locations/romsey/tree-stump-removal'], []]);
  const prep = await runner.prepare(cid, inputs, smallRows.find(r => r.slug === '/locations/romsey'), written);
  chk('runner: prepare gives today\'s decisions for a saved page (for re-validation on edit), with the town\'s mechanisms and the how it\'s done material', prep.decisionsResult.decisions && prep.townWritten && prep.decisionsResult.decisions.mechanismsUsed.length === 4 && prep.howItsDone.paragraphs.length === 1 && allocCalls.length === 1, JSON.stringify([prep.waitingOn, allocCalls.length]), '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
