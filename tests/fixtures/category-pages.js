'use strict';
// Fixture: category pages (CORE (16), 23 Oct 2026). Edens Edge from the live v3 page map
// snapshot: the Gardener base page and the Gardener Winchester town page. Decisions, the
// business type blocks, the parser, the record, the validator's own rules, the ideas
// store, the allocation helpers, the trade facts rows per category and the runner on
// pg-mem with a stub model. No API calls.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { computeCategoryDecisions, keywordWord, isPersonWord } = require(path.join(root, 'category-decisions.js'));
const B = require(path.join(root, 'category-blocks.js'));
const PT = require(path.join(root, 'page-types/category.js'));
const { getPageType } = require(path.join(root, 'page-types'));
const { parseOutput } = require(path.join(root, 'v20-parse.js'));
const { buildCategoryRecord, expectedFromCategoryDecisions } = require(path.join(root, 'category-record.js'));
const { validateCategory, categoryValidationContext } = require(path.join(root, 'validate-category.js'));
const { buildCategoryReaderView } = require(path.join(root, 'category-reader.js'));
const I = require(path.join(root, 'ideas.js'));
const A = require(path.join(root, 'allocation.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { createCategoryRunner, pagesInOrder } = require(path.join(root, 'category-run.js'));
const { generateCategoryPage } = require(path.join(root, 'category-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const same = (label, got, want) => chk(label, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got), JSON.stringify(want));
console.log('\n=== FIXTURE: category pages (Edens Edge, Gardener base and Gardener Winchester) ===\n');

// ── The test briefs: the shape the landscaper entry gets (the real briefs are Brandon's to read first) ──
const card = (t, b) => ({ title: t, brief: b });
const BLOCKS = {
  A: {
    problems: { h2: 'Common [CAT] Problems in [CITY]', cards: [card('Patio holds water', 'The base and the fall.'), card('Fence posts lean', 'Post depth and concrete.'), card('Lawn goes bare', 'Compaction and shade.'), card('Borders overgrown', 'Planting too close.')] },
    cost: { cards: [card('Size of the area', 'Square metres move the price most.'), card('Access to the garden', 'Rear access, skips, barrows.'), card('What has to come out', 'Clearance and waste.'), card('Materials chosen', 'Stone against concrete.')] },
    steps: [card('Tell Us About Your Garden', 'How to get in touch.'), card('We Price Your Job', 'A price agreed first.'), card('We Start on a Date That Suits You', 'The date is agreed.')],
    faq_slots: [
      { slot: 'cost', question: 'How much does [CAT_LOWER] cost in [CITY]?', answer_brief: 'What moves the price.', doubt: 'Price' },
      { slot: 'cover', when: 'guarantee', question: 'Do you guarantee your [CAT_LOWER] work?', answer_brief: 'Yes, then the terms.', doubt: 'Trust' },
      { slot: 'cover', when: 'insurance', question: 'Are you insured for [CAT_LOWER] work?', answer_brief: 'The cover figure.', doubt: 'Trust' },
      { slot: 'cover', question: "What happens if something isn't right after the job?", answer_brief: 'Tell us and we look at it.', doubt: 'Trust' },
      { slot: 'scope', question: 'What does your [CAT_LOWER] work include?', answer_brief: 'From the card list.', doubt: 'Fit' },
      { slot: 'process', question: 'How does a [CAT_LOWER] job start?', answer_brief: 'Step one.', doubt: 'Process' },
      { slot: 'timing', question: 'When is the best time of year for [CAT_LOWER] work?', answer_brief: 'Seasons.', doubt: 'Timing' },
    ],
    faq_symptom: { answer_brief: 'The symptom and its local issue.', doubt: 'Process' },
    seasonal: { problem_card: card('Moss after a wet winter', 'Shade and drainage.'), faq_slot: { question: 'Do you work through the winter?', answer_brief: 'What runs in the cold months.', doubt: 'Timing' } },
    emergency: { steps: [card('Call Us', 'Now.'), card('We Give You a Price and an Arrival Time', 'Then.'), card('We Fix It', 'Done.')] },
  },
  B: {
    problems: { cards: [card('Lawn full of moss', 'Shade and compaction.'), card('Hedges out of control', 'Missed cuts.'), card('Weeds back every month', 'Roots left in.'), card('Beds dry out', 'No mulch.')] },
    cost: { cards: [card('How often we visit', 'Fortnightly against monthly.'), card('Size of the garden', 'Square metres.'), card('What is included in a visit', 'Mowing, edges, beds.'), card('Green waste', 'Taken away or composted.')] },
    faq_slots: [
      { slot: 'cost', question: 'How much does a [CAT_LOWER] cost in [CITY]?', answer_brief: 'Per visit.', doubt: 'Price' },
      { slot: 'cover', when: 'insurance', question: 'Are you insured?', answer_brief: 'The figure.', doubt: 'Trust' },
      { slot: 'cover', question: "What if you miss something on a visit?", answer_brief: 'Tell us.', doubt: 'Trust' },
      { slot: 'scope', question: 'What does a [CAT_LOWER] visit include?', answer_brief: 'The visit.', doubt: 'Fit' },
      { slot: 'process', question: 'How do regular visits work?', answer_brief: 'The schedule.', doubt: 'Process' },
      { slot: 'timing', question: 'Do you garden all year round?', answer_brief: 'Seasons.', doubt: 'Timing' },
    ],
    faq_symptom: { frame: '[SYMPTOM]: what is going on?', answer_brief: 'The symptom.', doubt: 'Process' },
  },
};
const niche = { ...landscaper, service_words: [], category_page_blocks: BLOCKS, category_types: { gardener: 'B' } };
// The practices Edens Edge ticks on Client Values (25 Oct): the ones the briefs may draw on
const TICKED = ['price_agreed_before_work', 'green_waste_choice', 'weed_roots_out', 'soil_covered_after_clearance', 'nesting_bird_check', 'autumn_leaf_clearance', 'maintenance_schedule', 'paths_swept_after_mowing', 'strimmer_edges', 'customer_need_not_be_home', 'pre_season_clearing'];
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes', insurance_cover: '5m', hours: 'Monday to Saturday, 7am to 6pm', confirmed_practices: TICKED };
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
const ctx = contextFromPageMap({ rows, hand, cv, niche });
const kv = ctx.keyValueMap;
const basePage = rows.find(r => r.type === 'category' && r.title === 'Gardener');
const townPage = rows.find(r => r.type === 'location_category' && r.title === 'Gardener Winchester');
const parsedCity = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const cityNames = Object.fromEntries(parsedCity.neighbourhoods.map(n => [n.id, n.name]));
const symptomsFor = (parsed, category) => A.symptomsForCategory(parsed, { category, emergencyNiche: false, limit: 5 }).map(s => {
  const issue = parsed.issues.find(i => i.id === s.issueId);
  return { id: s.id, text: s.text, issueTitle: issue.title, issueText: require(path.join(root, 'geo-dossier.js')).cleanForCopy(issue.body, cityNames) };
});
const allocation = A.resolveAllocatedItems({ neighbourhoods: ['SOU-N07', 'SOU-N11'], symptoms: {}, conservation_areas: ['SOU-N11'] }, parsedCity);
const WINCHESTER = { profile: 'Winchester is a cathedral city of brick terraces, Victorian villas on chalk and newer estates on the edge. Gardens on the chalk drain fast and dry out in summer.', villages: ['Kings Worthy', 'Twyford', 'Olivers Battery'] };

// ── Business type and blocks ──
same('type: the category override wins (Gardener → B on a type A client)', B.typeFor({ niche, cv, category: 'Gardener' }).letter, 'B');
same('type: the client value otherwise', B.typeFor({ niche, cv: { ...cv, business_type: 'B' }, category: 'Landscape Gardener' }).letter, 'B');
same('type: the niche default when the client value is blank', B.typeFor({ niche, cv: { ...cv, business_type: '' }, category: 'Landscape Gardener' }).letter, 'A');
chk('refusal: a niche with no category_page_blocks is refused by name', (() => { try { B.blocksFor({ niche: { ...landscaper, _source: 'landscaper', category_page_blocks: undefined }, cv, category: 'Gardener' }); return ''; } catch (e) { return e.message; } })() === 'no category block briefs for landscaper', 'see', 'no category block briefs for landscaper');
chk('refusal: a type with no entry names the type', /no category block briefs for landscaper type C/.test((() => { try { B.blocksFor({ niche: { ...niche, _source: 'landscaper' }, cv: { ...cv, business_type: 'C' }, category: 'Landscape Gardener' }); return ''; } catch (e) { return e.message; } })()), '', 'type C');
chk('the emergency variant lays over the base entry (steps swapped, blocks kept)', (() => { const r = B.blocksFor({ niche: { ...niche, emergency_niche: true }, cv: { ...cv, emergency_primary: 'yes', business_type: 'A' }, category: 'Landscape Gardener' }); return r.emergencyUsed && r.entry.steps[0].title === 'Call Us' && r.entry.problems.cards.length === 4; })(), '', 'emergency steps, A problems');
same('F-BRIEF: what a short entry lacks', B.briefGaps({ problems: { cards: [card('a', 'b')] }, cost: { cards: [] }, faq_slots: [{ slot: 'cost' }] }), ['block 4 has 1 card brief(s), not 4', 'block 5 has 0 card brief(s), not 4', 'no "cover" FAQ slot', 'no "scope" FAQ slot', 'no "process" FAQ slot', 'no faq_symptom entry']);
same('FAQ slots: the first "cover" whose condition holds (insurance, no guarantee)', B.pickFaqSlots(BLOCKS.A, cv, { quoteFree: 'Free' }).map(q => q.question), ['How much does [CAT_LOWER] cost in [CITY]?', 'Are you insured for [CAT_LOWER] work?', 'What does your [CAT_LOWER] work include?', 'How does a [CAT_LOWER] job start?', 'When is the best time of year for [CAT_LOWER] work?']);
same('FAQ slots: the guarantee question when one is confirmed', B.pickFaqSlots(BLOCKS.A, { ...cv, guarantee_years: '5' }, {}).map(q => q.slot + ':' + q.question)[1], 'cover:Do you guarantee your [CAT_LOWER] work?');
same('FAQ slots: the fallback cover question with nothing confirmed', B.pickFaqSlots(BLOCKS.A, { ...cv, insurance_cover: '' }, {}).map(q => q.question)[1], "What happens if something isn't right after the job?");
{
  const s = B.applySeasonal({ seasonal_trade: true }, BLOCKS.A, { problems: BLOCKS.A.problems.cards, faqs: B.pickFaqSlots(BLOCKS.A, cv, {}) });
  chk('seasonal: card 4 and the timing FAQ swap for the seasonal pair', s.swapped && s.problems[3].title === 'Moss after a wet winter' && s.faqs.find(q => q.slot === 'seasonal').question === 'Do you work through the winter?' && !s.faqs.some(q => q.slot === 'timing'), JSON.stringify([s.problems[3].title, s.faqs.map(q => q.slot)]), '');
  chk('seasonal: nothing swaps without the niche flag', !B.applySeasonal({}, BLOCKS.A, { problems: BLOCKS.A.problems.cards, faqs: [] }).swapped, '', 'off');
  // Type B (Brandon, 25 Oct): insurance is always one of the five, so the seasonal question takes the symptom question's place
  const Bs = { ...BLOCKS.B, seasonal: { problem_card: card('Leaves burying the lawn', 'Autumn.'), faq_slot: { question: 'When should I book for spring?', answer_brief: 'Book ahead.', doubt: 'Timing' } } };
  const sb = B.applySeasonal({ seasonal_trade: true }, Bs, { problems: Bs.problems.cards, faqs: B.pickFaqSlots(Bs, cv, {}), letter: 'B' });
  chk('seasonal (type B): the five slots stay and the seasonal question comes back as the symptom question\'s replacement', sb.swapped && sb.faqs.map(q => q.slot).join(',') === 'cost,cover,scope,process,timing' && sb.symptomSwap && sb.symptomSwap.question === 'When should I book for spring?' && sb.problems[3].title === 'Leaves burying the lawn', JSON.stringify([sb.faqs.map(q => q.slot), sb.symptomSwap]), '');
  const RB = computeCategoryDecisions({ cv, niche: { ...niche, category_page_blocks: { ...BLOCKS, B: Bs } }, keyValueMap: kv, rows, page: basePage, allocation, symptoms: symptomsFor(parsedCity, 'Gardener'), ideasUsed: [], reviews: [], tradeFacts: null });
  chk('seasonal (type B page): six questions, the insurance one kept, the seasonal one where the symptom question was, all four symptoms in the problems block', RB.decisions.faq.map(q => q.slot).join(',') === 'cost,cover,scope,process,timing,seasonal' && !RB.decisions.faq.some(q => q.symptom) && Object.keys(RB.decisions.allocated.symptoms).join(',') === 'problem_1,problem_2,problem_3,problem_4' && !RB.flags.some(f => f.code === 'F-ALLOC' && /symptom question/.test(f.msg)), JSON.stringify([RB.decisions.faq.map(q => q.slot), Object.keys(RB.decisions.allocated.symptoms)]), '');
}

// ── The base page decisions ──
const baseR = computeCategoryDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: symptomsFor(parsedCity, 'Gardener'), ideasUsed: [], reviews: [], tradeFacts: { file: 'trade-facts/landscaper.md', verified: true, missing: [] } });
const D = baseR.decisions;
chk('base: no gate fails', !baseR.gates.length, JSON.stringify(baseR.gates), '[]');
same('base: scope, category, town, type B by the category override', [D.scope, D.category, D.town, D.type.key, D.type.source], ['base', 'Gardener', 'Southampton', 'B', 'category']);
same('base: H1 from the page map, keyword in body form, title keyword first', [D.d2_h1, D.keyword, D.d3_title], ['Gardener Southampton', 'gardener in Southampton', 'Gardener Southampton | Edens Edge Landscaping']);
chk('base: meta reads "is a gardener in Southampton offering [proof]" when the proof itself says "with", under 155', D.d4_meta === 'Edens Edge Landscaping is a gardener in Southampton offering fixed prices with no hidden costs. Get your free quote today.' && D.d4_meta.length <= 155, D.d4_meta, '');
chk('base: meta "with [proof]" for a plain proof; a description of the business goes before the trade', (() => {
  const a = computeCategoryDecisions({ cv: { ...cv, differentiator_1_sentence: 'a 5 year workmanship guarantee' }, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: null }).decisions.d4_meta;
  const b = computeCategoryDecisions({ cv: { ...cv, differentiator_1_sentence: 'Family run and independent' }, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: null }).decisions.d4_meta;
  return a.startsWith('Edens Edge Landscaping is a gardener in Southampton with a 5 year workmanship guarantee.') && b.startsWith('Edens Edge Landscaping is a family run and independent gardener in Southampton.');
})(), '', 'with / description first');
same('keyword word: the H1 without the town; a work word gets "offers"', [keywordWord('Garden Landscaping Southampton', 'Southampton', 'Landscape Gardener'), isPersonWord('Gardener'), isPersonWord('Garden Landscaping'), isPersonWord('Tree Surgeon'), isPersonWord('Driveways')], ['Garden Landscaping', true, false, true, false]);
same('base: trust line, no rating line, buttons, breadcrumb', [D.d5_trust, D.d6_rating, D.d15_buttons, D.breadcrumb.map(b => b.name)], ['100+ Jobs Completed', null, ['Get My Free Quote', 'Call 023 0000 0000'], ['Home', 'Gardener']]);
same('base: the H2 formulas, with the briefs\' block 4 H2 winning', [D.h2.services, D.h2.content, D.h2.problems, D.h2.cost, D.h2.reviews, D.h2.process, D.h2.areas, D.h2.faq, D.h2.final_cta], [
  'Our Gardener Services in Southampton', 'Local Gardening for Southampton Homeowners', 'Common Gardening Problems', 'What Affects the Cost of Gardening in Southampton', 'What Southampton Homeowners Say About Our Gardening',
  'Your Free Quote in 3 Simple Steps', 'Where We Provide Gardening Across Southampton and Nearby Towns', 'Gardening Questions Answered', 'Get a Free Gardening Quote in Southampton']);
chk('work noun: a category with none reads "[CAT] Services" and is flagged', (() => { const r = computeCategoryDecisions({ cv, niche: { ...niche, category_work_nouns: {} }, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: null }); return r.decisions.h2.cost === 'What Affects the Cost of Gardener Services in Southampton' && r.decisions.h2.services === 'Our Gardener Services in Southampton' && r.flags.some(f => f.code === 'F-WORK-NOUN'); })(), '', 'Gardener Services');
same('base: cards are the category\'s six service pages in page map order, linked to the base pages', D.cards.map(c => `${c.name} ${c.url} ${c.target}`), ['Lawn mowing /services/lawn-mowing base', 'Fencing /services/fencing base', 'Lawn seeding /services/lawn-seeding base', 'Hedge trimming /services/hedge-trimming base', 'Mulching /services/mulching base', 'Weed control /services/weed-control base']);
same('base: also offered leaves out GBP variants of the category ("Garden work", "Gardening services"), so the line is HIDDEN', D.alsoOffered, []);
chk('base: a mentioned service that is not a variant stays in also offered', (() => { const rows2 = rows.map(r => r === basePage ? { ...r, info: { ...r.info, links: { ...r.info.links, mentioned: ['Garden work', 'Pond cleaning', 'Lawn mowing services'] } } } : r); const page2 = rows2.find(r => r.type === 'category' && r.title === 'Gardener'); const R2 = computeCategoryDecisions({ cv, niche, keyValueMap: kv, rows: rows2, page: page2, allocation, symptoms: [], tradeFacts: null }); return JSON.stringify(R2.decisions.alsoOffered) === JSON.stringify(['Pond cleaning']); })(), '', 'Pond cleaning only');
same('base: block 4 and block 5 from the type B briefs, with placeholders resolved', [D.problems.map(p => p.title), D.cost.map(p => p.title)], [['Lawn full of moss', 'Hedges out of control', 'Weeds back every month', 'Beds dry out'], ['How often we visit', 'Size of the garden', 'What is included in a visit', 'Green waste']]);
same('base: steps fall back to the niche steps when the type entry has none (no visit practice → step_2_no_visit)', D.niche_steps.map(s => s.title), ['Tell Us About Your Garden', 'We Price Your Job', 'We Start on a Date That Suits You']);
same('base: five FAQ slots plus the symptom question, each with its doubt', D.faq.map(q => `${q.slot}:${q.doubt}`), ['cost:Price', 'cover:Trust', 'scope:Fit', 'process:Process', 'timing:Timing', 'symptom:Process']);
same('base: the symptom question is built from the first assigned symptom with the type\'s frame', D.faq[5].question, 'The lawn stays soggy for days after rain: what is going on?');
chk('base: the FAQ questions carry the keyword word in lower case and the town', D.faq[0].question === 'How much does a gardener cost in Southampton?', D.faq[0].question, '');
same('base: areas link every launch town to its Gardener location category page, phase 2 towns plain, council areas out', [D.areas.linked.map(a => `${a.name} ${a.url}`), D.areas.plain], [['Chandlers Ford /locations/chandlers-ford/gardener', 'Eastleigh /locations/eastleigh/gardener', 'Hedge End /locations/hedge-end/gardener', 'Romsey /locations/romsey/gardener', 'Winchester /locations/winchester/gardener'], ['Ampfield', 'Awbridge', 'Chilworth', 'Kings Worthy', 'Lockerley', 'Lyndhurst', 'Stockbridge']]);
same('base: the two allocated neighbourhoods, one a conservation area, and the symptoms (FAQ first, then four for the problems)', [D.allocated.neighbourhoods.map(n => `${n.name}${n.conservation ? ' (CA)' : ''}`), Object.keys(D.allocated.symptoms)], [['Bassett Heath', 'Portswood Residents’ Gardens (CA)'], ['faq', 'problem_1', 'problem_2', 'problem_3', 'problem_4']]);
same('base: LINKABLE PAGES are the homepage, the six service pages, the five sibling categories and the five Gardener location category pages', D.linkablePages.map(p => p.type).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {}), { homepage: 1, service: 6, category: 5, 'location-category': 5 });
same('base: paragraph 4 gets the first three launch towns\' Gardener pages in area order', D.locationLinks.map(l => l.name), ['Romsey', 'Winchester', 'Eastleigh']);
chk('base: reviews hidden with no review count (F-REVIEWS)', !D.reviews.show && baseR.flags.some(f => f.code === 'F-REVIEWS'), '', 'hidden');
{
  const R3 = computeCategoryDecisions({ cv: { ...cv, review_count: '12' }, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], ideasUsed: [], reviews: [{ text: 'Lovely job.', name: 'Sam', town: 'Romsey' }, { text: 'Tidy and quick.', name: 'Jo', town: '' }], tradeFacts: null });
  chk('reviews: shown with 3+ reviews and the hand picked ones, flagged when fewer than 3 are on file', R3.decisions.reviews.show && R3.decisions.reviews.items.length === 2 && R3.flags.some(f => f.code === 'F-REVIEWS' && /2 hand picked/.test(f.msg)), JSON.stringify(R3.flags.filter(f => f.code === 'F-REVIEWS')), '');
  chk('reviews: 3+ reviews but none picked → hidden', !computeCategoryDecisions({ cv: { ...cv, review_count: '12' }, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], ideasUsed: [], reviews: [], tradeFacts: null }).decisions.reviews.show, '', 'hidden');
}
chk('base: the block names the model fields with the CORE (16) labels in order', (() => { const b = baseR.decisionsBlock; const i = ['MODEL FIELDS:', PT.LABELS.hero, PT.LABELS.servicesIntro, PT.LABELS.cards, PT.LABELS.alsoOffered, PT.LABELS.content, PT.LABELS.block4, PT.LABELS.costIntro, PT.LABELS.block5, PT.LABELS.steps, PT.LABELS.areasIntro, PT.LABELS.faq, PT.LABELS.finalCta, 'MODEL_FLAGS'].map(l => b.indexOf(l)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])); })(), '', 'in order');
chk('base: the block carries the briefs, the symptoms, the neighbourhood profiles and PAGE with page_scope', /page_scope: base/.test(baseR.decisionsBlock) && /Brief: Shade and compaction\./.test(baseR.decisionsBlock) && /Neighbourhood: Bassett Heath/.test(baseR.decisionsBlock) && /Local symptoms for the problems block/.test(baseR.decisionsBlock), '', '');
chk('gates: a page map row with no H1 is G-H1', computeCategoryDecisions({ cv, niche, keyValueMap: kv, rows, page: { ...basePage, h1: '' }, symptoms: [], tradeFacts: null }).gates.some(g => g.code === 'G-H1'), '', 'G-H1');
chk('gates: no briefs for the niche is G-BRIEF with the refusal message', (() => { const r = computeCategoryDecisions({ cv, niche: { ...landscaper, _source: 'landscaper', category_page_blocks: undefined }, keyValueMap: kv, rows, page: basePage, symptoms: [], tradeFacts: null }); return r.gates.some(g => g.code === 'G-BRIEF' && g.msg === 'no category block briefs for landscaper'); })(), '', 'G-BRIEF');
chk('F-BRIEF: a type entry short of cards is flagged, not refused', (() => { const r = computeCategoryDecisions({ cv, niche: { ...niche, category_page_blocks: { B: { ...BLOCKS.B, cost: { cards: BLOCKS.B.cost.cards.slice(0, 2) } } } }, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: null }); return !r.gates.length && r.flags.some(f => f.code === 'F-BRIEF' && /block 5 has 2/.test(f.msg)) && r.decisions.cost.length === 2; })(), '', 'F-BRIEF');

// ── The town page decisions ──
const townR = computeCategoryDecisions({ cv, niche, keyValueMap: kv, rows, page: townPage, town: WINCHESTER, symptoms: [], ideasUsed: [{ page: 'homepage', text: 'Bassett Heath gardens sit on clay that holds water after rain.' }], reviews: [], tradeFacts: { file: 'x', verified: false } });
const T = townR.decisions;
chk('town: no gate fails', !townR.gates.length, JSON.stringify(townR.gates), '[]');
same('town: scope, town, keyword, title, breadcrumb through the location page', [T.scope, T.town, T.keyword, T.d3_title, T.breadcrumb.map(b => `${b.name}${b.url ? ' ' + b.url : ''}`)], ['town', 'Winchester', 'gardener in Winchester', 'Gardener Winchester | Edens Edge Landscaping', ['Home /', 'Winchester /locations/winchester', 'Gardener']]);
same('town: the H2s carry the town and no wider area', [T.h2.services, T.h2.content, T.h2.cost, T.h2.areas, T.h2.final_cta], ['Our Gardener Services in Winchester', 'Local Gardening for Winchester Homeowners', 'What Affects the Cost of Gardening in Winchester', 'Where We Provide Gardening Across Winchester', 'Get a Free Gardening Quote in Winchester']);
same('town: Fencing links the Winchester town service page, the other cards the base pages', T.cards.map(c => `${c.name} ${c.url}`), ['Lawn mowing /services/lawn-mowing', 'Fencing /locations/winchester/fencing', 'Lawn seeding /services/lawn-seeding', 'Hedge trimming /services/hedge-trimming', 'Mulching /services/mulching', 'Weed control /services/weed-control']);
same('town: the areas list is the dossier\'s villages, unlinked', [T.areas.linked, T.areas.plain], [[], ['Kings Worthy', 'Twyford', 'Olivers Battery']]);
same('town: the town profile is the allocated item and the villages are kept for the validator', [T.allocated.neighbourhoods.length, T.allocated.townProfile.slice(0, 24), T.allocated.villages], [0, 'Winchester is a cathedra', ['Kings Worthy', 'Twyford', 'Olivers Battery']]);
same('town: LINKABLE PAGES: the homepage, the cards\' targets plus Fencing\'s base page, the location page and the five sibling pages in Winchester; nothing in another town', [T.linkablePages.map(p => p.type).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {}), T.linkablePages.every(p => !/romsey|eastleigh|southampton/.test(p.url))], [{ homepage: 1, service: 6, 'town-service': 1, location: 1, 'location-category': 5 }, true]);
same('town: paragraph 4 offers the sibling pages in the town by their category names', T.locationLinks.map(l => l.name), ['Landscape Gardener', 'Landscape Designer', 'Tree Service', 'Paving Contractor', 'Deck Builder']);
chk('town: no symptom → no symptom FAQ and F-ALLOC; an unverified pack is F-FACTS and left out', T.faq.length === 5 && townR.flags.some(f => f.code === 'F-ALLOC' && /symptom question/.test(f.msg)) && townR.flags.some(f => f.code === 'F-FACTS' && /not verified/.test(f.msg)) && !T.trade_facts.included, JSON.stringify(townR.flags), '');
chk('town: IDEAS USED ELSEWHERE is in the block', /IDEAS USED ELSEWHERE[\s\S]*\(homepage\) Bassett Heath gardens sit on clay/.test(townR.decisionsBlock), '', 'listed');
chk('town: no dossier → F-ALLOC for the profile and the villages', (() => { const r = computeCategoryDecisions({ cv, niche, keyValueMap: kv, rows, page: townPage, town: null, symptoms: [], tradeFacts: null }); return r.flags.filter(f => f.code === 'F-ALLOC').length >= 3 && r.decisions.areas.plain.length === 0; })(), '', 'F-ALLOC');

// ── A page the model could write: the output builder the runner stub uses ──
const FILL = ['We keep the garden tidy as we go.', 'You get a clear plan before anything starts.', 'The team works the way you would want in your own garden.', 'Every visit ends with the paths swept.', 'We talk through what the garden can take.', 'You decide what stays and what goes.', 'The work is planned around how the garden is used.', 'We leave the borders ready for the season ahead.'];
const padTo = (text, min, max) => {
  const wc = t => t.replace(/\[CV: [a-z_]+\]/g, 'X').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length;
  let i = 0, t = text;
  while (wc(t) < min) t += ' ' + FILL[i++ % FILL.length];
  if (wc(t) > max) throw new Error(`too long (${wc(t)}): ${t}`);
  return t;
};
function outputFor(D, { scope, town, kw, cardLink = null, hero = null, content = null } = {}) {
  const L = ['=== MODEL OUTPUT: category ==='];
  L.push(`${PT.LABELS.hero}: ${hero || padTo(`[CV: company_name] is a local ${kw} looking after gardens ${scope === 'base' ? 'across the city and the Hampshire towns around it' : 'in the city and the villages around it'}. Our prices are agreed before we start and never grow once the job is under way.`, 20, 49)}`);
  L.push(`${PT.LABELS.servicesIntro}: ${padTo('Lawns, hedges, beds and fences, looked after on a regular round or put right in one visit. It suits homeowners who want the garden kept in shape without doing it themselves.', 30, 60)}`);
  L.push(`${PT.LABELS.cards}:`);
  D.cards.forEach((c, i) => {
    const link = cardLink ? cardLink(c, i) : `[${c.name.toLowerCase()}](${c.url})`;
    const opens = ['A garden that has got away from you is a common place to start, and our', 'Wondering what a tidy round looks like? Our', 'Regular', 'Spring is when most people ask about', 'Done badly this work leaves gaps and bare patches, so our', 'The result most people want is a garden that looks cared for, and our', 'Busy households suit our', 'Good tools and the right timing matter most for our'];
    L.push(`  - card_name: ${c.name} | card_text: ${padTo(`${opens[i % opens.length]} ${link} visits keep it in shape through the year, with the cuttings cleared at the end of each visit.`, 40, 55)}`);
  });
  L.push(`${PT.LABELS.alsoOffered}: ${D.alsoOffered.length ? `We also take on ${D.alsoOffered.map(s => s.toLowerCase()).join(' and ')} where a garden calls for it.` : 'HIDDEN'}`);
  const links = D.contentLinks.slice(0, 2).map(l => `[${l.name.toLowerCase()}](${l.url})`);
  const para1 = scope === 'base'
    ? `Most of our work as a ${kw} is on family gardens, and the gardens here differ street by street. In Bassett Heath the larger plots on sandy ground dry fast, so the planting is chosen with that in mind and the lawns are fed in spring. In Portswood the small Victorian gardens need careful access and light tools, and a hedge is often the only boundary. Our prices are agreed before we start, so the round costs what we said it would.`
    : `Most of our work as a ${kw} is on the brick terraces and villas of the city, where gardens on the chalk drain fast and dry out in summer, so the lawns are fed in spring and mown high through July. The newer estates on the edge have lighter soil and more lawn to keep, which suits a regular round. Our prices are agreed before we start, so the round costs what we said it would.`;
  const para2 = `The round covers ${links[0]} for the lawn and ${links[1]} for the boundaries, each done when the season calls for it rather than on a fixed date. Beds and borders are kept clear so the planting has room to fill out. The cuttings go with us at the end of the round, and the paths are swept before we leave.`;
  const para3 = `Some people worry about a firm that has not looked after a garden like theirs before, so the first round is a walk round the garden with you, with nothing cut until you have said what matters.`;
  const para4 = scope === 'base'
    ? `We cover the whole area, including [${D.locationLinks[0].name}](${D.locationLinks[0].url}) and [${D.locationLinks[1].name}](${D.locationLinks[1].url}), with the same round in each place and the same person each time where we can.`
    : `This is our work in the city itself, round by round, with the same care on every garden and the same person each time where we can.`;
  L.push(`${PT.LABELS.content}: ${content || padTo(`${para1}\\n\\n${para2}\\n\\n${para3}\\n\\n${para4} Call [CV: phone] and tell us what the garden is doing.`, 200, 250)}`);
  L.push(`${PT.LABELS.block4}:`);
  D.problems.forEach((p, i) => L.push(`  - card_title: ${p.title} | card_body: ${padTo(`${['Moss shows up where the grass is thin and the ground stays damp, usually under trees or on the shaded side of the house.', 'A hedge left two seasons grows wide at the top and bare at the base, and the light stops reaching the lower growth.', 'Weeds that come straight back have left their roots behind, often in beds that were cleared in a hurry.', 'Beds that dry out in the first warm week have bare soil between the plants and nothing to hold the moisture.'][i % 4]} We deal with the cause on the next round and keep on top of it from then on.`, 40, 60)}`));
  L.push(`${PT.LABELS.costIntro}: ${padTo('The price depends on the size of the garden and how often we come. We give you a figure for the regular round before the first visit so you know where you stand.', 30, 50)}`);
  L.push(`${PT.LABELS.block5}:`);
  D.cost.forEach((p, i) => L.push(`  - card_title: ${p.title} | card_body: ${padTo(`${['A regular round keeps on top of growth, so each visit is lighter work than a catch up after a long gap.', 'A larger lawn takes longer to cut and edge, and more borders mean more weeding on each visit.', 'A visit that covers the lawn, the edges and the beds takes longer than a cut on its own.', 'Taking the green waste away adds to the visit; leaving it for the council bin keeps the price down.'][i % 4]}`, 30, 45)}`));
  L.push(`${PT.LABELS.steps}:`);
  D.niche_steps.forEach((s, i) => L.push(`  - step_title: ${s.title} | step_body: ${padTo(['Send us a note about the garden and what you would like kept on top of, with a photo if you have one.', 'We agree what each round covers and what it costs, so there is nothing left to work out later on.', 'The first visit goes in the diary on a day that suits you, and the round follows from there.'][i % 3], 20, 30)}`));
  L.push(`${PT.LABELS.areasIntro}: ${padTo(scope === 'base' ? `We are based in the city and travel [CV: travel_distance] inland and along the coast for garden rounds. Every service we offer goes everywhere we cover.` : `We cover the whole of the city and the villages around it on the same round, so the garden gets the same care wherever it sits.`, 40, 60)}`);
  L.push(`${PT.LABELS.faq}:`);
  D.faq.forEach((q, i) => L.push(`  - faq_question: ${q.question} | faq_answer: ${padTo(`${['It depends on the size of the garden and how often we come.', 'Yes, we are insured up to £[CV: insurance_cover].', 'A visit covers the lawn, the edges, the hedges and the beds.', 'It starts with a note from you about the garden.', 'Most work runs through the year, with the heavy cutting in autumn.', 'The ground under the lawn holds water, so the roots sit wet.', 'Yes, with the lighter jobs kept for the cold months.'][i % 7]} ${i === 2 ? `Our [${D.cards[0].name.toLowerCase()}](${D.cards[0].url}) rounds are the usual starting point.` : ''}`, 30, 70)}`));
  L.push(`${PT.LABELS.finalCta}: ${padTo('Send us a few lines about the garden and we will come back with a price for the round.', 15, 25)}`);
  L.push('MODEL_FLAGS: none');
  return L.join('\n');
}

// ── Parser and record ──
const raw = outputFor(D, { scope: 'base', town: 'Southampton', kw: 'gardener in Southampton' });
const parsed = parseOutput(raw, PT.OUTPUT_SPEC, expectedFromCategoryDecisions(D));
same('parser: no flags on a complete output', parsed.flags, []);
same('parser: six cards, four problems, four factors, three steps, six FAQs, given titles kept', [parsed.fields[PT.LABELS.cards].length, parsed.fields[PT.LABELS.block4].length, parsed.fields[PT.LABELS.block5].length, parsed.fields[PT.LABELS.steps].length, parsed.fields[PT.LABELS.faq].length, parsed.fields[PT.LABELS.block4][0].card_title], [6, 4, 4, 3, 6, 'Lawn full of moss']);
chk('parser: a hidden also offered line is checked', parseOutput(raw.replace(/^cat_also_offered: .*$/m, 'cat_also_offered: HIDDEN'), PT.OUTPUT_SPEC, { ...expectedFromCategoryDecisions(D), hidden: {} }).flags.some(f => f.code === 'P-EMPTY'), '', 'P-EMPTY');
const meta = { page_type: 'category', page_key: D.slug, generated_at: '2026-10-23T12:00:00.000Z', client_values: G.clientValueMap(cv, D.d1_years_trading), decisions_block: baseR.decisionsBlock };
const record = buildCategoryRecord({ cv, decisionsResult: baseR, parsed, meta });
same('record: page order fields, cards with their urls, hidden reviews, the linked areas list and the "We also cover" towns', [record.page, record.scope, record.cat_hero_h1, record.cards[1].card_url, record.cat_reviews_h2, record.cat_areas_links.length, record.cat_areas_also_cover.length, record.faq_items.length, record.buttons], ['category', 'base', 'Gardener Southampton', '/services/fencing', 'HIDDEN', 5, 7, 6, ['Get My Free Quote', 'Call [CV: phone]']]);
chk('reader: the "We also cover" line follows the linked list', /- \[Winchester\]\(\/locations\/winchester\/gardener\)\n\nWe also cover Ampfield, Awbridge, Chilworth, Kings Worthy, Lockerley, Lyndhurst and Stockbridge\./.test(buildCategoryReaderView(record, meta.client_values)), '', 'We also cover …');
same('record: the page type lists 29 model fields in page order (also offered hidden)', getPageType('category').modelFields(record).length, 1 + 1 + 6 + 0 + 1 + 4 + 1 + 4 + 3 + 1 + 6 + 1);
chk('reader view: headings in order, tokens resolved, hidden reviews left out', (() => { const md = buildCategoryReaderView(record, meta.client_values); const i = ['# Gardener Southampton', '## Our Gardener Services in Southampton', '### [Lawn mowing](/services/lawn-mowing)', '## Common Gardening Problems', '## What Affects the Cost of Gardening', '## Your Free Quote in 3 Simple Steps', '## Where We Provide Gardening', '## Gardening Questions Answered', '## Get a Free Gardening Quote'].map(h => md.indexOf(h)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])) && !/Say About Our/.test(md) && /Edens Edge Landscaping is a local/.test(md); })(), '', 'ordered');

// ── Validator ──
const Vbase = categoryValidationContext(G.validationContextFor({ cv, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D);
const issuesOf = (rec, V) => validateCategory(rec, V || Vbase);
const blocks = iss => iss.filter(i => i.type === 'BLOCK');
const has = (iss, check, fieldPart, msgPart) => iss.some(i => i.check === check && (!fieldPart || i.field.includes(fieldPart)) && (!msgPart || i.message.includes(msgPart)));
const clean = issuesOf(record);
chk('validator: the built page has no BLOCK', !blocks(clean).length, blocks(clean).map(i => `${i.check} ${i.field}: ${i.message}`).join(' | '), 'none');
const withText = (rec, key, text) => { const r = JSON.parse(JSON.stringify(rec)); r[key] = text; return r; };
chk('HERO-CAT: sentence 1 without the company token or the keyword is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.hero, 'We look after gardens across the city. Prices are agreed first.'))), 'HERO-CAT', 'hero', 'no [CV: company_name]'), '', 'HERO-CAT');
chk('KEYWORD: the keyword phrase outside hero and content sentence 1 is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.servicesIntro, 'As a gardener in Southampton we look after lawns, hedges, beds and fences on a regular round or in one visit for homeowners who want the garden kept in shape.'))), 'KEYWORD', 'services_intro'), '', 'KEYWORD');
chk('KEYWORD: "Gardener Southampton" written bare counts as the phrase too', has(blocks(issuesOf(withText(record, PT.LABELS.finalCta, 'Send a few lines to your Gardener Southampton team and we will come back with a price.'))), 'KEYWORD', 'final_cta'), '', 'KEYWORD');
chk('KEYWORD: a content block whose sentence 1 drops the keyword is a FLAG', issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('Most of our work as a gardener in Southampton', 'Most of our work'))).some(i => i.check === 'KEYWORD' && i.type === 'FLAG'), '', 'FLAG');
chk('CARD-TARGET: a card linking another page is a BLOCK; CARD-LINK (shared) catches a card with no link', (() => { const r = JSON.parse(JSON.stringify(record)); r.cards[0].card_text = r.cards[0].card_text.replace('(/services/lawn-mowing)', '(/services/fencing)'); r.cards[1].card_text = r.cards[1].card_text.replace(/\[fencing\]\(\/services\/fencing\)/, 'fencing'); const iss = blocks(issuesOf(r)); return has(iss, 'CARD-TARGET', 'Lawn mowing') && has(iss, 'CARD-LINK', 'Fencing'); })(), '', 'both');
chk('N2 (shared): a link to a page not on LINKABLE PAGES is a BLOCK; the page never links itself', (() => { const iss = blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('(/services/lawn-mowing)', '(/gardener)')))); return has(iss, 'N2', 'content', 'itself'); })(), '', 'N2');
chk('IDEAS: a sentence that remakes a stored idea is a BLOCK, a different point is not', (() => {
  const ideas = [{ page: 'homepage', text: 'In Bassett Heath the larger plots on sandy ground dry out fast, so planting is chosen for that.' }];
  const V2 = { ...Vbase, D: { ...D, ideasUsed: ideas } };
  const iss = blocks(issuesOf(record, V2));
  const ok = !blocks(issuesOf(record, { ...Vbase, D: { ...D, ideasUsed: [{ page: 'homepage', text: 'The team arrives on the agreed morning with the skip booked for the end of the week.' }] } })).some(i => i.check === 'IDEAS');
  return has(iss, 'IDEAS', 'content', 'homepage already made') && ok;
})(), '', 'IDEAS');
chk('PRACTICE (shared): with the practices unticked the hero "prices are agreed before" and the green waste card are BLOCKs', (() => { const V0 = categoryValidationContext(G.validationContextFor({ cv: { ...cv, confirmed_practices: [] }, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D); const iss = blocks(issuesOf(record, V0)); return has(iss, 'PRACTICE', 'hero', 'price is agreed before') && has(iss, 'PRACTICE', 'Green waste', 'Green waste'); })(), '', 'PRACTICE');
chk('INTRO-SENTENCES: a services intro of three sentences is a retried FLAG', (() => { const iss = issuesOf(withText(record, PT.LABELS.servicesIntro, 'Lawns, hedges, beds and fences, looked after on a regular round. It suits homeowners who want the garden kept in shape. They never have to pick up a mower themselves.')); const i = iss.find(x => x.check === 'INTRO-SENTENCES'); return !!i && i.type === 'FLAG' && i.retry; })(), '', 'FLAG, retried');
chk('CARD-LOCAL is a BLOCK: a neighbourhood in a card', (() => { const r = JSON.parse(JSON.stringify(record)); r.cards[2].card_text = r.cards[2].card_text.replace('Regular', 'In Bassett Heath, regular'); return has(blocks(issuesOf(r)), 'CARD-LOCAL', 'Lawn seeding', 'Bassett'); })(), '', 'BLOCK');
chk('CB-LINKS: more than 3 section 3 links in the content block is a BLOCK; 3 pass', (() => { const four = record[PT.LABELS.content].replace('Beds and borders are kept clear', 'Beds and borders are kept clear by [mulching](/services/mulching) and [weed control](/services/weed-control)'); const iss = blocks(issuesOf(withText(record, PT.LABELS.content, four))); return has(iss, 'CB-LINKS', 'content', 'links 4 service pages') && !blocks(issuesOf(record)).some(i => i.check === 'CB-LINKS'); })(), '', 'CB-LINKS');
chk('AREAS-PAGES: an areas intro claiming every town has a page is a BLOCK when some have none', has(blocks(issuesOf(withText(record, PT.LABELS.areasIntro, 'We are based in the city and travel [CV: travel_distance] inland and along the coast for garden rounds. Every town below has its own page, so pick the one nearest you to see how the round works there and what it covers.'))), 'AREAS-PAGES', 'areas_intro'), '', 'AREAS-PAGES');
chk('PRACTICE-REPEAT: a confirmed practice stated three times is a FLAG on the third field', (() => { const r = JSON.parse(JSON.stringify(record)); r[PT.LABELS.costIntro] = 'The price depends on the size of the garden and how often we come, and it is agreed before any work starts. We give you a figure for the regular round before the first visit so you know where you stand.'; r.steps[1].step_body = 'The price is agreed before any work starts, so there is nothing to work out later on and you know the figure from the start.'; r.faq_items[0].faq_answer = r.faq_items[0].faq_answer + ' The price is agreed before any work starts, so nothing changes once we begin.'; const iss = issuesOf(r); return iss.some(i => i.check === 'PRACTICE-REPEAT' && i.type === 'FLAG' && /step_body|faq_answer/.test(i.field) && /already stated in cat_hero_intro and cat_content_body/.test(i.message)) && !issuesOf(record).some(i => i.check === 'PRACTICE-REPEAT'); })(), '', 'PRACTICE-REPEAT');
chk('FAQ-PAD: a sentence after the answer with no new noun or number is a FLAG; a sentence with a new fact is not', (() => { const r = JSON.parse(JSON.stringify(record)); r.faq_items[2].faq_answer = 'A visit covers the lawn, the edges, the beds and the hedges. It covers the lawn and the beds and the hedges as well. Our [lawn mowing](/services/lawn-mowing) rounds are the usual starting point.'; const iss = issuesOf(r); return iss.some(i => i.check === 'FAQ-PAD' && /visit include/.test(i.field)) && !issuesOf(record).some(i => i.check === 'FAQ-PAD'); })(), '', 'FAQ-PAD');
chk('PACK-COPY: a sentence lifted from the calibration pack is a BLOCK; ordinary trade wording is not', (() => {
  const pack = fs.readFileSync(path.join(root, 'Landscaper_Calibration_Pack_v4.md'), 'utf8');
  const Vp = categoryValidationContext(G.validationContextFor({ cv, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap, calibrationPack: pack }), D);
  const bad = withText(record, PT.LABELS.servicesIntro, 'Hedges put on most of their growth between May and July, which is when a privet hedge starts pushing out over the path. It suits homeowners who want the garden kept in shape.');
  return has(blocks(issuesOf(bad, Vp)), 'PACK-COPY', 'services_intro', 'calibration pack') && !issuesOf(record, Vp).some(i => i.check === 'PACK-COPY');
})(), '', 'PACK-COPY');
chk('INTRO-PAD: a section intro sentence that adds no noun or number is a retried FLAG', (() => { const iss = issuesOf(withText(record, PT.LABELS.costIntro, 'The price depends on the size of the garden and how often we come. The garden size and how often we come are what the price depends on.')); const i = iss.find(x => x.check === 'INTRO-PAD'); return !!i && i.type === 'FLAG' && i.retry && !issuesOf(record).some(x => x.check === 'INTRO-PAD'); })(), '', 'INTRO-PAD');
chk('FREQUENCY: a visit frequency with no visit_frequency_options on file is a BLOCK; with the value set it passes', (() => { const bad = withText(record, PT.LABELS.costIntro, 'The price depends on the size of the garden and how often we come. Fortnightly rounds suit most gardens through the growing season.'); const V2 = categoryValidationContext(G.validationContextFor({ cv: { ...cv, visit_frequency_options: 'weekly, fortnightly' }, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D); return has(blocks(issuesOf(bad)), 'FREQUENCY', 'cost_intro', 'Fortnightly') && !issuesOf(bad, V2).some(i => i.check === 'FREQUENCY'); })(), '', 'FREQUENCY');
chk('PAD-OPENER: "every garden is different" is a retried FLAG', (() => { const i = issuesOf(withText(record, PT.LABELS.costIntro, 'Prices vary because every garden is different. We give you a figure for the round before the first cut so you know where you stand.')).find(x => x.check === 'PAD-OPENER'); return !!i && i.type === 'FLAG' && i.retry; })(), '', 'PAD-OPENER');
chk('SCENERY: a research detail with no consequence for the work is a retried FLAG; one that says what it means is not', (() => { const r = JSON.parse(JSON.stringify(record)); r[PT.LABELS.content] = r[PT.LABELS.content].replace('In Portswood the small Victorian gardens', 'Cherries line the avenue and Scots pine stand on the estate greens. In Portswood the small Victorian gardens'); const i = issuesOf(r).find(x => x.check === 'SCENERY'); return !!i && i.type === 'FLAG' && i.retry && !issuesOf(record).some(x => x.check === 'SCENERY'); })(), '', 'SCENERY');
chk('block 4 mechanisms: each card line carries its one cause and the causes are listed as used ideas; the symptom FAQ brief asks for another cause', (() => { const R = computeCategoryDecisions({ cv, niche: { ...niche, category_page_blocks: { ...BLOCKS, B: { ...BLOCKS.B, problems: { cards: BLOCKS.B.problems.cards.map((c, i) => ({ ...c, mechanism: ['shade and damp ground', 'the timing of cuts', 'roots left in the ground', 'bare soil with no mulch'][i] })) } } } }, keyValueMap: kv, rows, page: basePage, allocation, symptoms: symptomsFor(parsedCity, 'Gardener'), ideasUsed: [], reviews: [], tradeFacts: null }); const b = R.decisionsBlock || ''; const ok = [/Mechanism \(this card's one cause[^)]*\): shade and damp ground/.test(b), /\(block 4 card "Weeds that come straight back", on this page\) the cause: roots left in the ground/.test(b), /Give a cause none of the block 4 cards use \(they use: shade and damp ground; the timing of cuts/.test(b)]; return ok.every(Boolean) || JSON.stringify([ok, R.gates, (b.match(/Mechanism[^\n]*/g) || []).slice(0, 2), (b.match(/Give a cause[^\n]*/g) || []).slice(0, 1)]); })(), '', 'mechanisms');
chk('CB-OPENER: a content block opening on the reader\'s search is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('Most of our work as a gardener in Southampton is on family gardens', 'Finding a gardener in Southampton who knows family gardens matters')))), 'CB-OPENER', 'content', 'Finding'), '', 'CB-OPENER');
chk('AREAS-SERVICES: an areas intro listing services is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.areasIntro, 'We are based in the city and travel [CV: travel_distance] inland and along the coast. Lawn mowing, hedge trimming and weed control all come with us to every town we cover, so the garden gets the same round.'))), 'AREAS-SERVICES', 'areas_intro', 'lawn mowing'), '', 'AREAS-SERVICES');
chk('PROOF-QUOTE: the quote method in both the cost FAQ and the visits FAQ is a BLOCK; three mentions pass, a fourth blocks', (() => {
  const cvq = { ...cv, quote_method: 'a visit or photos, then a fixed price' };
  const Vq = categoryValidationContext(G.validationContextFor({ cv: cvq, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D);
  const r = JSON.parse(JSON.stringify(record));
  r.faq_items[0].faq_answer = 'It depends on the size of the garden and how often we come. We price the round from a visit or your photos, and the figure is agreed before we start. Larger gardens take longer and the hedges add to the time on site.';
  r.faq_items[3].faq_answer = 'It starts with a note from you about the garden. We quote from a visit or photos and agree the price before anything begins. Then the first round goes in the diary on a day that suits you and the work carries on from there.';
  const iss = blocks(issuesOf(r, Vq));
  const ok = has(iss, 'PROOF-QUOTE', 'regular visits', 'other FAQ answer') && !blocks(issuesOf(record, Vq)).some(i => i.check === 'PROOF-QUOTE');
  return ok || JSON.stringify([iss.filter(i => i.check === 'PROOF-QUOTE').map(i => [i.field, i.message.slice(0, 60)]), blocks(issuesOf(record, Vq)).filter(i => i.check === 'PROOF-QUOTE').map(i => i.field)]);
})(), '', 'PROOF-QUOTE');
chk('shared checks still run: a banned phrase is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.costIntro, 'Look no further for a tidy garden. The price depends on the size of the garden and how often we come, and we give you a figure before the first visit.'))), '2', 'cost_intro'), '', 'banned');
// The town page's own rules
const rawT = outputFor(T, { scope: 'town', town: 'Winchester', kw: 'gardener in Winchester' });
const parsedT = parseOutput(rawT, PT.OUTPUT_SPEC, expectedFromCategoryDecisions(T));
const recordT = buildCategoryRecord({ cv, decisionsResult: townR, parsed: parsedT, meta: { ...meta, page_key: T.slug, decisions_block: townR.decisionsBlock } });
const Vtown = categoryValidationContext(G.validationContextFor({ cv, niche, decisions: T, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), T);
const cleanT = blocks(issuesOf(recordT, Vtown));
chk('validator (town): the built town page has no BLOCK', !cleanT.length, cleanT.map(i => `${i.check} ${i.field}: ${i.message}`).join(' | '), 'none');
chk('TOWN-OTHER: naming Southampton or Romsey on a town page is a BLOCK', (() => { const iss = blocks(issuesOf(withText(recordT, PT.LABELS.servicesIntro, 'Lawns, hedges, beds and fences across the city, with the same round we run in Romsey, for homeowners who want the garden kept in shape without doing it themselves.'), Vtown)); return has(iss, 'TOWN-OTHER', 'services_intro', 'Romsey'); })(), '', 'TOWN-OTHER');
chk('LINK-TOWN: link text with a town on a town page is a BLOCK', (() => { const r = JSON.parse(JSON.stringify(recordT)); r.cards[1].card_text = r.cards[1].card_text.replace('[fencing](/locations/winchester/fencing)', '[fencing Winchester](/locations/winchester/fencing)'); return has(blocks(issuesOf(r, Vtown)), 'LINK-TOWN', 'Fencing'); })(), '', 'LINK-TOWN');
chk('AREAS-TOWN: a village in the town page areas intro is a BLOCK', has(blocks(issuesOf(withText(recordT, PT.LABELS.areasIntro, 'We cover the whole of the city and the villages around it, Twyford included, on the same round, so the garden gets the same care wherever it sits and whoever looks after it.'), Vtown)), 'AREAS-TOWN', 'areas_intro', 'Twyford'), '', 'AREAS-TOWN');
chk('CARD-TOWN: a town page card naming the town is a BLOCK', (() => { const r = JSON.parse(JSON.stringify(recordT)); r.cards[0].card_text = r.cards[0].card_text.replace('keep it in shape', 'keep it in shape across Winchester'); return has(blocks(issuesOf(r, Vtown)), 'CARD-TOWN', 'Lawn mowing', 'Winchester'); })(), '', 'CARD-TOWN');
chk('the town name itself is allowed on a town page (no TOWN-OTHER for Winchester)', !has(issuesOf(withText(recordT, PT.LABELS.servicesIntro, 'Lawns, hedges, beds and fences across Winchester, on a regular round or put right in one visit, for homeowners who want the garden kept in shape without doing it themselves.'), Vtown), 'TOWN-OTHER'), '', 'allowed');

// ── The rubric reviewer on category pages (code side) ──
{
  const Q = require(path.join(root, 'quality-review.js'));
  const base = Q.scoreCodeItems({ record, V: Vbase, D, cv, niche });
  const ids = base.items.map(i => i.id);
  chk('rubric: a category page is scored with the homepage items plus the category items', ['K1', 'S11', 'I1', 'T3', 'T4', 'T5', 'Y8', 'B7', 'A3', 'H1', 'C1', 'P3'].every(i => ids.includes(i)), ids.join(','), 'homepage + category items');
  chk('rubric: the built base page passes the category items', ['K1', 'S11', 'I1', 'T3', 'T4', 'T5', 'Y8', 'E1'].every(i => base.items.find(x => x.id === i).pass), JSON.stringify(base.items.filter(i => !i.pass).map(i => i.id + ': ' + i.reasons[0])), 'pass');
  const dec = Q.decisionsTests({ record, D, cv, niche });
  chk('rubric: the final CTA heading names the work noun; no card pick or meta test on a category page', dec.finalCta === null && dec.cardPicks === null && dec.meta === null && dec.areaList === null, JSON.stringify(dec), '');
  const townBad = JSON.parse(JSON.stringify(recordT));
  townBad[PT.LABELS.servicesIntro] = 'Lawns, hedges and beds across the city, with the same round we run in Romsey. It suits homeowners who want the garden kept in shape without doing it themselves. Nobody has to pick up a mower. The hedges stay tidy.';
  townBad.cards[0].card_text = townBad.cards[0].card_text.replace('keep it in shape', 'keep it in shape across Winchester');
  const town = Q.scoreCodeItems({ record: townBad, V: Vtown, D: T, cv, niche });
  const fails = Object.fromEntries(town.items.filter(i => !i.pass).map(i => [i.id, i.reasons[0]]));
  chk('rubric (town): T3 fails on Romsey, T5 on Winchester in a card, Y8 on four sentences', /Romsey/.test(fails.T3) && /Winchester/.test(fails.T5) && /4 sentences/.test(fails.Y8), JSON.stringify(Object.keys(fails)), 'T3, T5, Y8');
  const J = Q.judgeItemsFor(recordT);
  chk('rubric (town): the judge gets the town page item and the category paragraph 2 item', !!J.T6j && /service pages given in DECISIONS/.test(J.B1j) && !Q.judgeItemsFor(record).T6j, Object.keys(J).join(','), 'T6j on the town page only');
  chk('rubric: the reviewer reads the category reader view', /Gardener Winchester/.test(Q.pageText(recordT)) && !/Review notes/.test(Q.pageText(recordT)), '', 'category reader');
}

// ── A quality round rewrite must pass the validator ──
(async () => {
  const { runQualityRetries } = require(path.join(root, 'v20-retry.js'));
  const r0 = JSON.parse(JSON.stringify(record));
  let calls = 0;
  const review = async rec => ({ at: 'x', model: 'stub', score: 7, done: false, failed: ['Y5'], items: [{ id: 'Y5', title: 'reads', by: 'judge', pass: false, reasons: [`"${rec[PT.LABELS.costIntro].split('.')[0]}": stilted`] }], other_problems: [], missing_facts: [] });
  const callRetry = async () => { calls++; return { text: 'cat_cost_intro: Look no further for a tidy garden at a fair price. We give you a figure for the round before the first cut so you know where you stand.', usage: {} }; };
  const { rounds } = await runQualityRetries({ record: r0, V: Vbase, callRetry, review, maxRounds: 1 });
  const entry = rounds[0].retries.find(x => x.field === PT.LABELS.costIntro);
  chk('quality retry: a rewrite that brings a BLOCK (banned phrase) is discarded and the earlier text kept', calls === 1 && entry && !entry.kept && /BLOCK \(2\)/.test(entry.error) && r0[PT.LABELS.costIntro] === record[PT.LABELS.costIntro], JSON.stringify(entry && [entry.kept, entry.error]), 'discarded');
})().catch(e => chk('quality retry acceptance', false, e.message, ''));

// ── Ideas ──
{
  const ideas = I.extractIdeas({ ...record, meta: { ...record.meta, ideas_context: { names: ['Bassett Heath', 'Portswood'], proofs: ['Fixed Prices With No Hidden Costs'] } } });
  chk('ideas: the local, proof and technical sentences are pulled out with their kind', ideas.some(i => i.kind === 'local' && /Bassett Heath/.test(i.text)) && ideas.some(i => /moss/i.test(i.text) && i.kind === 'technical') && ideas.every(i => I.contentWords(i.text).size >= 4), JSON.stringify(ideas.slice(0, 3)), '');
  chk('ideas: a reworded sentence matches (60% of content words), a different one does not', !!I.matchIdea('Clay ground under Bassett Heath plots holds water for days after heavy rain.', [{ page: 'h', text: 'In Bassett Heath the clay holds water after rain and the plots stay wet for days.' }]) && !I.matchIdea('Our van is parked on the drive and the gate is closed behind us.', [{ page: 'h', text: 'In Bassett Heath the clay holds water after rain and the plots stay wet for days.' }]), '', 'match / no match');
  same('ideas: from the stored records, with the page named', I.ideasFromRecords([{ page: 'homepage', record: { meta: { ideas: [{ text: 'A stored idea about clay and water in the garden.', kind: 'technical' }] } } }]), [{ page: 'homepage', text: 'A stored idea about clay and water in the garden.', kind: 'technical' }]);
}

// ── Allocation helpers and the trade facts rows ──
{
  const sym = A.symptomsForCategory(parsedCity, { category: 'Gardener', emergencyNiche: false });
  chk('symptoms for a category: one per issue, Gardener tagged, non urgent first', sym.length === 5 && new Set(sym.map(s => s.issueId)).size === 5 && sym.every(s => parsedCity.issues.find(i => i.id === s.issueId).categoryTags.includes('Gardener')), JSON.stringify(sym.map(s => s.id)), '');
  chk('symptoms: taken symptoms and issues are left out', !A.symptomsForCategory(parsedCity, { category: 'Gardener', emergencyNiche: false, takenSymptoms: [sym[0].id], takenIssues: [sym[1].issueId] }).some(s => s.id === sym[0].id || s.issueId === sym[1].issueId), '', 'left out');
  const eligible = A.eligibleItems(parsedCity, { emergencyNiche: false, categories: new Set(['gardener']) });
  const msg = A.buildAllocationMessage({ parsed: parsedCity, eligible, cv, niche, city: 'Southampton', categories: new Set(['gardener']), slots: [], page: { label: 'category page: Gardener', category: 'Gardener', taken: ['Bassett Heath'] } });
  chk('allocation message: a category page names the page, the category and what is taken, and asks for the "page" key', /PAGE: category page: Gardener/.test(msg) && /Bassett Heath/.test(msg) && /key "page"/.test(msg) && /SYMPTOM SLOTS:\n  none/.test(msg), '', '');
  const picks = A.checkPicks({ page: { neighbourhoods: ['SOU-N04', 'SOU-N13'], symptoms: {}, conservation_areas: [] } }, { eligible, slots: [] });
  same('allocation: a reply under "page" is read like one under "homepage"', [picks.picks.neighbourhoods, picks.errors], [['SOU-N04', 'SOU-N13'], []]);
  (async () => {
    const got = await A.runAllocation({ dossierText: fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'), cv, niche, keyValueMap: kv, pages: ctx.pages, page: { label: 'category page: Gardener', category: 'Gardener', takenNeighbourhoods: ['SOU-N07', 'SOU-N11'], slots: [] },
      callModel: async (system, message) => { if (/SOU-N07 \|/.test(message)) throw new Error('taken neighbourhood offered'); return JSON.stringify({ page: { neighbourhoods: ['SOU-N04', 'SOU-N13'], symptoms: {}, conservation_areas: [], reasons: 'test' } }); } });
    same('runAllocation for a page: taken neighbourhoods are removed before the call and the picks come back', [got.neighbourhoods, got.flags.length, got.excluded.some(e => /used by another page/.test(e))], [['SOU-N04', 'SOU-N13'], 0, true]);
  })().catch(e => chk('runAllocation for a page', false, e.message, ''));
  const pack = P.packForCategory('landscaper', 'Gardener', ['Lawn mowing', 'Fencing', 'Lawn seeding', 'Hedge trimming', 'Mulching', 'Weed control']);
  chk('trade facts: the category pack carries a Table A row per service and Tables C to E in full', pack.missing.length === 0 && /\| Lawn mowing \|/.test(pack.markdown) && /\| Mulching \|/.test(pack.markdown) && /TABLE C/.test(pack.markdown) && /TABLE E/.test(pack.markdown), JSON.stringify(pack.missing), '');
  chk('trade facts: a service with no row is listed as missing', P.packForCategory('landscaper', 'Gardener', ['Lawn mowing', 'Moon gardening']).missing.join(',') === 'A:Moon gardening,B:Moon gardening,F:Moon gardening', P.packForCategory('landscaper', 'Gardener', ['Lawn mowing', 'Moon gardening']).missing.join(','), '');
}

// ── The runner on pg-mem: order, resume, a failure, the ideas passing from base to town ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  const v20Store = createV20Store(pool);
  const cid = crypto.randomUUID();
  // Only the Gardener pages, to keep the run short: the base page and the Winchester and Romsey town pages
  const smallRows = rows.filter(r => !['category', 'location_category'].includes(r.type) || (r.info && r.info.category_key === 'gardener' && (r.type === 'category' || ['Winchester', 'Romsey'].includes(r.info.town))));
  const dossiers = [{ id: 'd1', text: fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'), locationName: 'Southampton' },
    { id: 'd2', locationName: 'Winchester', text: `## 1. LOCATION OVERVIEW\n${WINCHESTER.profile}\n\n## 2. NEIGHBOURHOOD PROFILES\n\n### [WIN-N01] Kings Worthy | village\nProfile: Larger plots on chalk with mature hedges. [https://example.org/a]\n\n### [WIN-N02] Twyford | village\nProfile: Brick cottages with long thin gardens. [https://example.org/b]\n\n## 3. LOCAL ISSUES\n\n### [WIN-I01] Thin chalk soils dry out\nDetail: Gardens on the chalk dry out fast in summer. [https://example.org/c]\nCategory tags: Gardener; Landscape Gardener\nService tags: lawn care\n\n## 4. SYMPTOMS\n\n- [WIN-S01] | “The lawn goes brown by June.” | WIN-I01 | Urgent: N\n\n## 5. RULES & COUNCIL\n\n## 6. DEMAND BY AREA\n\n## 7. NEARBY CONTRAST\n\n## 8. GAPS\n\n## 9. SOURCES CONSULTED\n` }];
  const allocationRecord = { version: 1, pages: { homepage: { neighbourhoods: ['SOU-N07', 'SOU-N11'], symptoms: {}, conservation_areas: ['SOU-N11'] } } };
  const calls = [];
  let failNext = false;
  const inputs = { ctx: { ...ctx, cv }, niche, rows: smallRows, dossiers, allocationRecord, calibrationPack: { name: null, text: '' }, tradeFacts: null, reviews: [], saveAllocation: async r => { inputs.allocationRecord = r; } };
  const runner = createCategoryRunner({
    pool, v20Store, log: () => {},
    loadInputs: async () => inputs,
    allocate: async ({ page }) => ({ neighbourhoods: ['SOU-N04', 'SOU-N13'], conservation_areas: [], reasons: 'stub', flags: [], source: 'model' }),
    generate: async args => {
      const Dd = args.decisionsResult.decisions;
      calls.push({ key: Dd.slug, ideas: Dd.ideasUsed.length, neighbourhoods: Dd.allocated.neighbourhoods.map(n => n.name) });
      if (failNext) { failNext = false; throw new Error('model down'); }
      const scope = Dd.scope, town = Dd.town;
      return generateCategoryPage({ ...args, retries: false, claimsReview: false, callModel: async () => ({ text: outputFor(Dd, { scope, town, kw: Dd.keyword }), usage: {} }) });
    },
  });
  same('runner: base pages first, then town pages, page map order', pagesInOrder(smallRows).map(p => p.slug), ['/gardener', '/locations/romsey/gardener', '/locations/winchester/gardener']);
  // A homepage record whose ideas the base page must avoid
  await v20Store.insert(cid, { page: 'homepage', meta: { page_type: 'homepage', ideas: [{ text: 'The clay in Bassett holds water for days after rain, so patios need a proper base.', kind: 'technical' }] }, home_hero_intro: 'x' }, { type: 'homepage', key: 'homepage' });
  failNext = true; // the first page (the base page) fails on the model
  let st = await runner.run(cid, { resume: false });
  same('runner: a failed page is recorded and the run carries on', st.pages.map(p => `${p.key}:${p.status}`), ['/gardener:failed', '/locations/romsey/gardener:done', '/locations/winchester/gardener:done']);
  chk('runner: the failed page\'s record keeps the error and the decisions block', (await v20Store.latest(cid, { type: 'category', key: '/gardener' })).record.error === 'model down' && !!(await v20Store.latest(cid, { type: 'category', key: '/gardener' })).record.meta.decisions_block, '', '');
  chk('runner: the base page got the allocation pass with the homepage\'s neighbourhoods taken, saved on the allocation record', calls[0].neighbourhoods.join(',') === 'Hollybrook and Dale Valley,Uplands Estate, Highfield' && inputs.allocationRecord.pages['category:/gardener'].neighbourhoods.join(',') === 'SOU-N04,SOU-N13', JSON.stringify([calls[0], Object.keys(inputs.allocationRecord.pages)]), '');
  chk('runner: the town pages saw the homepage ideas', calls[1].ideas >= 1 && calls[2].ideas >= 1, JSON.stringify(calls), '');
  const winRec = (await v20Store.latest(cid, { type: 'category', key: '/locations/winchester/gardener' })).record;
  chk('runner: the Winchester page used its own dossier (profile, villages, symptom question)', /Winchester is a cathedral city/.test(winRec.meta.decisions_block) && winRec.cat_areas_links.map(a => a.name).join(',') === 'Kings Worthy,Twyford' && winRec.faq_items.some(f => /lawn goes brown/.test(f.faq_question)), JSON.stringify([winRec.cat_areas_links, winRec.faq_items.map(f => f.faq_question)]), '');
  chk('runner: a good record has no BLOCK and its ideas stored', winRec.VALIDATION.block === 0 && Array.isArray(winRec.meta.ideas) && winRec.meta.ideas.length > 0, JSON.stringify(winRec.VALIDATION.issues.filter(i => i.type === 'BLOCK')), '');
  const before = calls.length;
  st = await runner.run(cid, { resume: true });
  same('runner: resume keeps the good pages and writes the failed one again', [st.pages.map(p => `${p.key}:${p.status}`), calls.length - before], [['/gardener:done', '/locations/romsey/gardener:kept', '/locations/winchester/gardener:kept'], 1]);
  chk('runner: the base page written on resume saw the town pages\' ideas? no: only siblings and the homepage', calls[before].ideas >= 1, JSON.stringify(calls[before]), '');
  const view = await runner.view(cid, smallRows);
  same('runner: the panel view lists every page with its record summary and the run state', [view.pages.map(p => `${p.key} ${p.record ? (p.record.good ? 'good' : 'bad') : 'none'}`), !!view.run.finished_at, view.running], [['/gardener good', '/locations/romsey/gardener good', '/locations/winchester/gardener good'], true, null]);
  const one = await runner.run(cid, { resume: false, keys: ['/locations/romsey/gardener'] });
  same('runner: one page on its own', one.pages.map(p => `${p.key}:${p.status}`), ['/locations/romsey/gardener:done']);
  const written = await runner.writtenFor(cid, smallRows, '/locations/winchester/gardener');
  same('runner: the written set for one page leaves that page out', written.pages.map(p => p.record.page_slug), ['/gardener', '/locations/romsey/gardener']);
  const prep = await runner.prepare(cid, inputs, smallRows.find(r => r.slug === '/locations/winchester/gardener'), written);
  chk('runner: prepare gives today\'s decisions for a saved page (for re-validation on edit)', prep.decisionsResult.decisions && prep.decisionsResult.decisions.ideasUsed.length >= 2, '', '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
