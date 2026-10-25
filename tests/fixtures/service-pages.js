'use strict';
// Fixture: service pages (CORE (17), 25 Oct 2026). Edens Edge from the live v3 page map
// snapshot: the Lawn Mowing base page (Gardener, type B) and the Tree Stump Removal Romsey
// town page (Tree Service, type A). The tagged trade facts rows, the business type blocks,
// the decisions, the parser, the record, the validator's own rules, the reader view, the
// rubric reviewer's code side, the symptom picker and the runner on pg-mem with a stub
// model (category pages first, the gate, resume, skip). No API calls.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { computeServiceDecisions } = require(path.join(root, 'service-decisions.js'));
const SB = require(path.join(root, 'service-blocks.js'));
const PT = require(path.join(root, 'page-types/service.js'));
const CPT = require(path.join(root, 'page-types/category.js'));
const { getPageType } = require(path.join(root, 'page-types'));
const { parseOutput } = require(path.join(root, 'v20-parse.js'));
const { buildServiceRecord, expectedFromServiceDecisions } = require(path.join(root, 'service-record.js'));
const { validateService, serviceValidationContext } = require(path.join(root, 'validate-service.js'));
const { buildServiceReaderView } = require(path.join(root, 'service-reader.js'));
const A = require(path.join(root, 'allocation.js'));
const { parseDossier, cleanForCopy } = require(path.join(root, 'geo-dossier.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { createServiceRunner, pagesInOrder, parentsOf, mechanismsOf } = require(path.join(root, 'service-run.js'));
const { generateServicePage, loadCore17 } = require(path.join(root, 'service-generate.js'));
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
console.log('\n=== FIXTURE: service pages (Edens Edge, Lawn Mowing base and Tree Stump Removal Romsey) ===\n');

// ── The test briefs: the shape the landscaper entry gets (the real briefs are Brandon's to read first) ──
const card = (t, b, m) => ({ title: t, brief: b, ...(m ? { mechanism: m } : {}) });
const BLOCKS = {
  A: {
    included: { items: [card('Checking the ground', 'The inspection.'), card('Clearing the area', 'The removal.'), card('The groundwork', 'The base.'), card('The materials', 'The options.'), card('The main build', 'The central stage.'), card('Finishing', 'Joints and edges.')] },
    problems: { h2: 'Signs You Need [SERVICE]', cards: [card('The first signs', 'The signs row.', 'the job left undone'), card('Movement underneath', 'Shifted.', 'soft ground settling under the weight'), card('Done badly the first time', 'The done badly row.', 'a stage skipped to save time'), card('Water in the wrong place', 'Puddles.', 'water with nowhere to go')] },
    cost: { cards: [card('How much there is to do', 'Size.'), card("What's there now", 'Removal.'), card('Access for materials and machines', 'Access.'), card('The finish you choose', 'Materials.')] },
    faq_slots: [
      { slot: 'cost', question: 'How much does [SERVICE_LOWER] cost in [CITY]?', answer_brief: 'What moves the price.', doubt: 'Price' },
      { slot: 'timing', question: 'How long does [SERVICE_LOWER] take?', answer_brief: 'The timing row.', doubt: 'Timing' },
      { slot: 'cover', when: 'insurance', question: 'Are you insured for [SERVICE_LOWER]?', answer_brief: 'The figure.', doubt: 'Trust' },
      { slot: 'cover', question: "What happens if something isn't right after the job?", answer_brief: 'Tell us.', doubt: 'Trust' },
      { slot: 'rules', question: 'Do I need permission for [SERVICE_LOWER]?', answer_brief: 'The rule rows.', doubt: 'Process' },
      { slot: 'scope', question: 'What does your [SERVICE_LOWER] service include?', answer_brief: 'The items.', doubt: 'Fit' },
    ],
    faq_symptom: { answer_brief: 'The symptom.', doubt: 'Process' },
    seasonal: { problem_card: card('What a winter leaves behind', 'Spring.', 'months of rain soaking into the ground'), faq_slot: { question: 'When is the best time of year for [SERVICE_LOWER], and how long does it take?', answer_brief: 'The season.', doubt: 'Timing' } },
  },
  B: {
    included: { h2: "What's Included in a [SERVICE] Visit", items: [card('Looking over the area first', 'Inspect.'), card('Setting the height', 'Height.'), card('The main work of the visit', 'The mow.'), card('Edges and sides', 'Edging.'), card('Collecting what comes off', 'Clippings.'), card('Paths cleared before we leave', 'Paths.'), card('The visit pattern you choose', 'Frequency from the client value only.')] },
    problems: { h2: "Signs It's Time for a [SERVICE] Visit", cards: [card('Growth has got ahead of you', 'Long grass.', 'a visit missed in the growing season'), card('It looks untidy from the house', 'Edges.', 'edges and lines left uncut'), card('It keeps coming back', 'Weeds.', 'the cause never dealt with, only what shows'), card("It's taking more of your weekend than it should", 'Catch up.', 'a round that has turned into a catch up')] },
    cost: { h2: 'How We Price [SERVICE] Visits in [CITY]', cards: [card('What a visit has to get through', 'Size.'), card('How much is in the way', 'Obstacles.'), card('The first visit', 'Catch up.'), card('Extras you add to the visit', 'Extras.')] },
    steps: [card('Tell Us What Needs Keeping On Top Of', 'Get in touch.'), card('We Agree the Visit and the Price', 'The price.'), card('We Start on a Date That Suits You', 'The date.')],
    faq_slots: [
      { slot: 'frequency', question: 'How often should [SERVICE_LOWER] be done?', answer_brief: 'What decides it.', doubt: 'Timing' },
      { slot: 'cost', question: 'How much does a [SERVICE_LOWER] visit cost in [CITY]?', answer_brief: 'Per visit.', doubt: 'Price' },
      { slot: 'cover', when: 'insurance', question: 'Are you insured for [SERVICE_LOWER]?', answer_brief: 'The figure.', doubt: 'Trust' },
      { slot: 'cover', question: 'What if something gets damaged during a visit?', answer_brief: 'Tell us.', doubt: 'Trust' },
      { slot: 'access', question: 'Do I need to be home for a [SERVICE_LOWER] visit?', answer_brief: 'Access.', doubt: 'Process' },
      { slot: 'scope', question: 'What does a [SERVICE_LOWER] visit include?', answer_brief: 'The visit.', doubt: 'Fit' },
      { slot: 'rules', when: 'rule_rows', question: 'Are there rules or standards for [SERVICE_LOWER]?', answer_brief: 'The rule rows, as what usually applies.', doubt: 'Process' },
    ],
    faq_symptom: { frame: '[SYMPTOM]: what is going on?', answer_brief: 'The symptom.', doubt: 'Process' },
  },
};
// A type B entry with the seasonal pair, for the rule that the seasonal question takes the symptom question's place
const B_SEASONAL = { ...BLOCKS.B, seasonal: { problem_card: card('What the season is about to throw at it', 'Spring.', 'growth that comes all at once in spring'), faq_slot: { question: 'When should I book [SERVICE_LOWER] for the season?', answer_brief: 'Book ahead.', doubt: 'Timing' } } };
const niche = { ...landscaper, _source: 'landscaper', service_words: [], service_page_blocks: BLOCKS, category_types: { gardener: 'B' } };
const TICKED = ['price_agreed_before_work', 'green_waste_choice', 'clippings_collected', 'maintenance_schedule', 'strimmer_edges', 'paths_swept_after_mowing', 'customer_need_not_be_home', 'pre_season_clearing'];
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes', insurance_cover: '5m', hours: 'Monday to Saturday, 7am to 6pm', confirmed_practices: TICKED };
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
const ctx = contextFromPageMap({ rows, hand, cv, niche });
const kv = ctx.keyValueMap;
const basePage = rows.find(r => r.type === 'service' && r.title === 'Lawn mowing');
const townPage = rows.find(r => r.type === 'town_service' && r.title === 'Tree stump removal Romsey');
const parsedCity = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const cityNames = Object.fromEntries(parsedCity.neighbourhoods.map(n => [n.id, n.name]));
const resolve = (parsed, names) => s => { const issue = parsed.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue.title, issueText: cleanForCopy(issue.body, names) }; };
const allocation = A.resolveAllocatedItems({ neighbourhoods: ['SOU-N04', 'SOU-N13'], symptoms: {}, conservation_areas: [] }, parsedCity);
const ROMSEY = { profile: 'Romsey is a market town on the Test with Victorian terraces near the centre and larger plots on the edge, on gravel over chalk that drains fast.', villages: ['Awbridge', 'Timsbury', 'Ampfield'] };

// ── The tagged trade facts rows ──
const mowRows = P.rowsForService('landscaper', 'Lawn mowing', { names: ['Lawn mowing and maintenance'] });
same('rows: Lawn mowing gets a standard method, a timing, a what goes wrong, a rule, two facts and a price factor', mowRows.counts, { 'standard method': 1, timing: 1, 'what goes wrong': 1, rule: 1, fact: 2, 'price factor': 1 });
chk('rows: the fact rows carry the service\'s own word (mowing), not every lawn fact', mowRows.rows.filter(r => r.kind === 'fact').map(r => r.name).join('|') === 'Lawn mowing season|Amount removed by mowing', mowRows.rows.filter(r => r.kind === 'fact').map(r => r.name).join('|'), 'Lawn mowing season|Amount removed by mowing');
chk('rows: sources, URLs and bold marks are stripped; the markdown tags each row', !/https?:|\*\*|\[http/.test(mowRows.markdown) && /^- \[rule\] BS 7370/m.test(mowRows.markdown) && /^- \[timing\] /m.test(mowRows.markdown), mowRows.markdown.slice(0, 200), 'clean, tagged');
const stumpRows = P.rowsForService('landscaper', 'Tree stump removal', { names: ['Tree stump grinding'] });
chk('rows: Tree stump removal has no rule row (hasRule false) and is not thin', !stumpRows.hasRule && !stumpRows.thin && stumpRows.counts.fact === 2 && !stumpRows.missing.length, JSON.stringify([stumpRows.counts, stumpRows.missing]), '');
chk('rows: a service with no rows is thin and missing in A, B and F', (() => { const r = P.rowsForService('landscaper', 'Moon gardening'); return r.thin && r.missing.join(',') === 'A:Moon gardening,B:Moon gardening,F:Moon gardening'; })(), '', 'thin');
const facts = rowsR => ({ niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: true, ...rowsR });

// ── Blocks and the refusal ──
same('blocks: the parent category\'s type (Gardener → B, Tree Service → A on a type A client)', [SB.blocksFor({ niche, cv, category: 'Gardener' }).key, SB.blocksFor({ niche, cv, category: 'Tree Service' }).key], ['B', 'A']);
chk('refusal: a niche with no service_page_blocks is refused by name', (() => { try { SB.blocksFor({ niche: { ...landscaper, _source: 'landscaper', service_page_blocks: undefined }, cv, category: 'Gardener' }); return ''; } catch (e) { return e.message; } })() === 'no service block briefs for landscaper', '', 'no service block briefs for landscaper');
same('F-BRIEF: what a short entry lacks', SB.briefGaps({ included: { items: [card('a')] }, problems: { cards: [card('x', 'y')] }, cost: { cards: [] }, faq_slots: [] }), ["What's Included has 1 item(s), not 6 to 8", 'block 4 has 1 card brief(s), not 4', 'block 5 has 0 card brief(s), not 4', 'block 4 card "x" has no mechanism', 'no "cost" FAQ slot', 'no "scope" FAQ slot', 'no faq_symptom entry']);

// ── Symptoms by service ──
{
  const sym = A.symptomsForService(parsedCity, { service: 'Lawn mowing', names: ['Lawn mowing and maintenance'], category: 'Gardener', emergencyNiche: false });
  chk('symptoms: the issues tagged with the service\'s GBP name come first, then the category\'s', sym.length === 5 && sym[0].by === 'service' && sym.some(s => s.by === 'category'), JSON.stringify(sym.map(s => `${s.id}:${s.by}`)), 'service first');
  chk('symptoms: a service with no tag falls back to its category', A.symptomsForService(parsedCity, { service: 'Moon gardening', category: 'Gardener', emergencyNiche: false }).every(s => s.by === 'category'), '', 'category');
}
const symptomsFor = (parsed, names, service, serviceNames, category) => A.symptomsForService(parsed, { service, names: serviceNames, category, emergencyNiche: false, limit: 5 }).map(resolve(parsed, names));

// ── The base page decisions (Lawn Mowing Southampton, type B) ──
const baseR = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: symptomsFor(parsedCity, cityNames, 'Lawn mowing', ['Lawn mowing and maintenance'], 'Gardener'), ideasUsed: [], mechanismsUsed: [{ page: 'Gardener category page', text: 'shade and damp ground' }], reviews: [], tradeFacts: facts(mowRows) });
const D = baseR.decisions;
chk('base: no gate fails', !baseR.gates.length, JSON.stringify(baseR.gates), '[]');
same('base: scope, service, category, town, type B by the category override', [D.scope, D.service, D.category, D.town, D.type.key], ['base', 'Lawn mowing', 'Gardener', 'Southampton', 'B']);
same('base: H1 from the page map, keyword in body form, title keyword first', [D.d2_h1, D.keyword, D.d3_title], ['Lawn Mowing Southampton', 'lawn mowing in Southampton', 'Lawn Mowing Southampton | Edens Edge Landscaping']);
chk('base: meta reads "[company] offers [service] in [town], [proof]" when the proof itself says "with", under 155 (Brandon, 25 Oct)', D.d4_meta === 'Edens Edge Landscaping offers lawn mowing in Southampton, fixed prices with no hidden costs. Get your free quote today.' && D.d4_meta.length <= 155, D.d4_meta, '');
chk('base: meta "offers [service] in [town] with [proof]" for a plain proof; a description of the business goes before the verb', (() => { const R = computeServiceDecisions({ cv: { ...cv, differentiator_1_sentence: 'a 5 year workmanship guarantee' }, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: facts(mowRows) }); const R2 = computeServiceDecisions({ cv: { ...cv, differentiator_1_sentence: 'Family run and independent' }, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: facts(mowRows) }); return (R.decisions.d4_meta.startsWith('Edens Edge Landscaping offers lawn mowing in Southampton with a 5 year workmanship guarantee.') && R2.decisions.d4_meta.startsWith('Edens Edge Landscaping, family run and independent, offers lawn mowing in Southampton.')) || [R.decisions.d4_meta, R2.decisions.d4_meta]; })() === true, '', 'with / description first');
same('base: the H2 formulas, with the briefs\' What\'s Included, block 4 and block 5 H2s winning', [D.h2.included, D.h2.content, D.h2.problems, D.h2.cost, D.h2.process, D.h2.areas, D.h2.faq, D.h2.more, D.h2.final_cta],
  ["What's Included in a Lawn Mowing Visit", 'Local Lawn Mowing for Southampton Homeowners', "Signs It's Time for a Lawn Mowing Visit", 'How We Price Lawn Mowing Visits in Southampton', 'Your Free Quote in 3 Simple Steps', 'Where We Provide Lawn Mowing Across Southampton and Nearby Towns', 'Lawn Mowing Questions Answered', 'Our Other Gardening Services', 'Get a Free Lawn Mowing Quote in Southampton']);
same('base: the tick items are the service\'s six Table A stages, in order, sentence case (Brandon, 25 Oct)', [D.included_source, D.included.map(i => i.title)], ['trade facts', ['Inspect lawn and remove debris', 'Set cutting height', 'Mow', 'Edge or strim', 'Collect or disperse clippings', 'Clear paths']]);
chk('base: fewer than 6 stages falls back to the type\'s role based items with F-ITEMS-GENERIC', (() => { const thin = { ...mowRows, rows: mowRows.rows.map(r => r.kind === 'standard method' ? { ...r, stages: r.stages.slice(0, 4) } : r) }; const R = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: facts(thin) }); return R.decisions.included_source === 'type' && R.decisions.included[0].title === 'Looking over the area first' && R.flags.some(f => f.code === 'F-ITEMS-GENERIC' && /4 stage/.test(f.msg)); })(), '', 'F-ITEMS-GENERIC');
chk('base: more than 8 stages are cut to 8 with F-ITEMS', (() => { const many = { ...mowRows, rows: mowRows.rows.map(r => r.kind === 'standard method' ? { ...r, stages: [...r.stages, 'rake', 'feed', 'water'] } : r) }; const R = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: facts(many) }); return R.decisions.included.length === 8 && R.flags.some(f => f.code === 'F-ITEMS'); })(), '', '8');
same('base: the More Services cards are the Gardener siblings, page map order, base pages', D.more.map(c => `${c.name} ${c.url}`), ['Fencing /services/fencing', 'Lawn seeding /services/lawn-seeding', 'Hedge trimming /services/hedge-trimming', 'Mulching /services/mulching', 'Weed control /services/weed-control']);
same('base: block 4 and block 5 from the type B briefs; five FAQ slots (insurance among them), the rules slot as a sixth since lawn mowing has a rule row, then the symptom question', [D.problems.map(p => p.title)[0], D.cost.map(p => p.title)[2], D.faq.map(q => `${q.slot}:${q.doubt}`)], ['Growth has got ahead of you', 'The first visit', ['frequency:Timing', 'cost:Price', 'cover:Trust', 'access:Process', 'scope:Fit', 'rules:Process', 'symptom:Process']]);
chk('base: block 4 sources: with one local symptom (fewer than 2) every card is written from the "what goes wrong" rows, one mechanism each; with 4 symptoms each card gets one', (() => { const S = symptomsFor(parsedCity, cityNames, 'Lawn mowing', ['Lawn mowing and maintenance'], 'Gardener'); const one = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: S.slice(0, 2), mechanismsUsed: [], tradeFacts: facts(mowRows) }); const four = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: S, mechanismsUsed: [], tradeFacts: facts(mowRows) }); return one.decisions.problems.every(p => p.source.kind === 'trade facts') && /Source: the trade facts "what goes wrong" rows \(Signs:/.test(one.decisionsBlock) && four.decisions.problems.filter(p => p.source.kind === 'symptom').length === 4 && one.flags.some(f => f.code === 'F-ALLOC' && /every card is written from the trade facts/.test(f.msg)); })(), '', 'sources');
chk('base: a type B entry with no rules slot keeps F-RULE-UNUSED when the service has rule rows', (() => { const R = computeServiceDecisions({ cv, niche: { ...niche, service_page_blocks: { ...BLOCKS, B: { ...BLOCKS.B, faq_slots: BLOCKS.B.faq_slots.filter(s => s.slot !== 'rules') } } }, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: facts(mowRows) }); return R.decisions.faq.length === 5 && R.flags.some(f => f.code === 'F-RULE-UNUSED'); })(), '', 'F-RULE-UNUSED');
chk('base: the frequency brief says no frequency is on file; the symptom brief lists the mechanisms used', /No visit frequency is on file/.test(D.faq[0].answer_brief) && /they use: a visit missed in the growing season;.*shade and damp ground/.test(D.faq.find(q => q.symptom).answer_brief), D.faq.find(q => q.symptom).answer_brief, '');
chk('base (type B, seasonal pair on): the five slots stay, insurance among them, the rules slot as the sixth, and the seasonal question takes the symptom question\'s place; all four symptoms go to block 4', (() => {
  const R = computeServiceDecisions({ cv, niche: { ...niche, service_page_blocks: { ...BLOCKS, B: B_SEASONAL } }, keyValueMap: kv, rows, page: basePage, allocation, symptoms: symptomsFor(parsedCity, cityNames, 'Lawn mowing', ['Lawn mowing and maintenance'], 'Gardener'), mechanismsUsed: [], tradeFacts: facts(mowRows) });
  const Dd = R.decisions;
  return Dd.faq.map(q => q.slot).join(',') === 'frequency,cost,cover,access,scope,rules,seasonal' && !Dd.faq.some(q => q.symptom) && Dd.problems[3].seasonal && Object.keys(Dd.allocated.symptoms).join(',') === 'problem_1,problem_2,problem_3,problem_4' && !R.flags.some(f => f.code === 'F-ALLOC' && /symptom question/.test(f.msg)) || JSON.stringify([Dd.faq.map(q => q.slot), Object.keys(Dd.allocated.symptoms)]);
})() === true, '', 'seasonal in the symptom slot');
same('base: areas link every launch town to its Gardener location category page (no town page for lawn mowing), the rest plain, council areas out', [D.areas.linked.map(a => `${a.name} ${a.type}`), D.areas.plain], [['Chandlers Ford location-category', 'Eastleigh location-category', 'Hedge End location-category', 'Romsey location-category', 'Winchester location-category'], ['Ampfield', 'Awbridge', 'Chilworth', 'Kings Worthy', 'Lockerley', 'Lyndhurst', 'Stockbridge']]);
chk('base: a town service page for the service wins over the location category page in the area list (Fencing has one in every launch town)', (() => { const fence = rows.find(r => r.type === 'service' && r.title === 'Fencing'); const R = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: fence, allocation, symptoms: [], tradeFacts: facts(P.rowsForService('landscaper', 'Fencing')) }); const a = R.decisions.areas.linked; return a.length === 5 && a.every(x => x.type === 'town-service') && a.find(x => x.name === 'Romsey').url === '/locations/romsey/fencing' && R.decisions.linkablePages.filter(p => p.type === 'town-service').length === 5; })(), '', 'town service pages first');
same('base: paragraph 4 gets the first three area pages; LINKABLE PAGES are the homepage, the category page, the five siblings and the five area pages', [D.locationLinks.map(l => l.name), D.linkablePages.map(p => p.type).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {})], [['Chandlers Ford', 'Eastleigh', 'Hedge End'], { homepage: 1, category: 1, service: 5, 'location-category': 5 }]);
same('base: breadcrumb Home › Gardener › Lawn mowing', D.breadcrumb.map(b => `${b.name}${b.url ? ' ' + b.url : ''}`), ['Home /', 'Gardener /gardener', 'Lawn mowing']);
chk('base: the trade facts summary; no F-RULE-UNUSED, since the rules slot carries the rule row', D.trade_facts.rows === 7 && D.trade_facts.has_rule && !baseR.flags.some(f => f.code === 'F-RULE-UNUSED'), JSON.stringify(baseR.flags.filter(f => f.code === 'F-RULE-UNUSED')), 'no flag');
chk('gates: an unverified pack refuses the page with the gate\'s message', (() => { const r = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: { verified: false, message: 'Service pages are blocked: the trade facts pack trade-facts/landscaper.md has not been verified.' } }); return r.gates.some(g => g.code === 'G-FACTS' && /has not been verified/.test(g.msg)); })(), '', 'G-FACTS');
chk('gates: no briefs for the niche is G-BRIEF with the refusal message', computeServiceDecisions({ cv, niche: { ...niche, service_page_blocks: undefined }, keyValueMap: kv, rows, page: basePage, symptoms: [], tradeFacts: facts(mowRows) }).gates.some(g => g.code === 'G-BRIEF' && g.msg === 'no service block briefs for landscaper'), '', 'G-BRIEF');
chk('F-FACTS-THIN: fewer than 3 rows is flagged, not refused', (() => { const r = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: basePage, allocation, symptoms: [], tradeFacts: facts({ ...mowRows, rows: mowRows.rows.slice(0, 2), thin: true, hasRule: false, counts: {} }) }); return !r.gates.length && r.flags.some(f => f.code === 'F-FACTS-THIN'); })(), '', 'F-FACTS-THIN');
chk('base: the block names the model fields with the CORE (17) labels in order, and carries MECHANISMS USED and the tick items', (() => { const b = baseR.decisionsBlock; const i = ['MODEL FIELDS:', PT.LABELS.hero, PT.LABELS.includedIntro, PT.LABELS.included, PT.LABELS.content, PT.LABELS.block4, PT.LABELS.steps, PT.LABELS.costIntro, PT.LABELS.block5, PT.LABELS.areasIntro, PT.LABELS.faq, PT.LABELS.moreIntro, PT.LABELS.finalCta, 'MODEL_FLAGS'].map(l => b.indexOf(l)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])) && /MECHANISMS USED[^\n]*\n\s+- \(Gardener category page\) shade and damp ground/.test(b) && /--- WHAT'S INCLUDED \(6 tick items, the trade facts stages/.test(b) && /page_scope: base/.test(b); })(), '', 'in order');

// ── The town page decisions (Tree Stump Removal Romsey, type A) ──
const townR = computeServiceDecisions({ cv, niche, keyValueMap: kv, rows, page: townPage, town: ROMSEY, symptoms: [], ideasUsed: [{ page: 'Tree stump removal page', text: 'Grinding to the right depth matters more than the width of the machine that does it.' }], mechanismsUsed: [{ page: 'Tree Service Romsey category page', text: 'a stump rotting under a lawn' }, { page: 'Tree stump removal page', text: 'the job left undone' }], reviews: [], tradeFacts: facts(stumpRows) });
const T = townR.decisions;
chk('town: no gate fails', !townR.gates.length, JSON.stringify(townR.gates), '[]');
same('town: scope, service, category, town, type A, keyword, breadcrumb through the location page', [T.scope, T.service, T.category, T.town, T.type.key, T.keyword, T.breadcrumb.map(b => `${b.name}${b.url ? ' ' + b.url : ''}`)], ['town', 'Tree stump removal', 'Tree Service', 'Romsey', 'A', 'tree stump removal in Romsey', ['Home /', 'Romsey /locations/romsey', 'Tree stump removal']]);
same('town: the H2s carry the town and the service, the briefs\' block 4 H2 wins, the More Services H2 names the town', [T.h2.included, T.h2.problems, T.h2.cost, T.h2.areas, T.h2.more, T.h2.final_cta], ["What's Included in Our Tree Stump Removal", 'Signs You Need Tree Stump Removal', 'What Affects the Cost of Tree Stump Removal in Romsey', 'Where We Provide Tree Stump Removal Across Romsey', 'Our Other Tree Surgery Services in Romsey', 'Get a Free Tree Stump Removal Quote in Romsey']);
same('town: the More Services cards are the Tree Service siblings on their base pages (no town pages for them in Romsey)', T.more.map(c => `${c.name} ${c.url} ${c.target}`), ['Tree cabling and bracing /services/tree-cabling-and-bracing base', 'Tree planting /services/tree-planting base', 'Tree removal and felling /services/tree-removal-and-felling base', 'Tree transplanting /services/tree-transplanting base', 'Tree pruning and crown reduction /services/tree-pruning-and-crown-reduction base']);
same('town: the base page link and the areas list of villages, unlinked', [T.baseLink, T.areas.plain], [{ name: 'Tree stump removal', url: '/services/tree-stump-removal', h1: 'Tree Stump Removal Southampton' }, ['Awbridge', 'Timsbury', 'Ampfield']]);
same('town: type A FAQ slots: cost, timing, cover (insurance), rules, scope; the seasonal swap takes the timing slot', T.faq.map(q => q.slot), ['cost', 'seasonal', 'cover', 'rules', 'scope']);
chk('town: no F-RULE-UNUSED (no rule rows), no symptom → F-ALLOC, the seasonal card in slot 4', !townR.flags.some(f => f.code === 'F-RULE-UNUSED') && townR.flags.some(f => f.code === 'F-ALLOC' && /symptom question/.test(f.msg)) && T.problems[3].title === 'What a winter leaves behind', JSON.stringify(townR.flags), '');
same('town: LINKABLE PAGES: the homepage, the base page, the location page, the Tree Service Romsey page, the five sibling base pages; nothing in another town', [T.linkablePages.map(p => p.type).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {}), T.linkablePages.every(p => !/winchester|eastleigh|southampton/.test(p.url))], [{ homepage: 1, service: 6, location: 1, 'location-category': 1 }, true]);
chk('town: IDEAS USED ELSEWHERE and the base page link are in the block', /IDEAS USED ELSEWHERE[\s\S]*\(Tree stump removal page\) Grinding to the right depth/.test(townR.decisionsBlock) && /THE BASE PAGE LINK[\s\S]*Tree stump removal → \/services\/tree-stump-removal/.test(townR.decisionsBlock), '', 'listed');
same('town: MECHANISMS USED keeps the category page\'s cause and drops the base page\'s, which is this page\'s own brief cause', T.mechanismsUsed.map(m => m.text), ['a stump rotting under a lawn']);

// ── A page the model could write ──
const FILL = ['We keep the area tidy as we go.', 'You get a clear plan before anything starts.', 'The work is planned around how the garden is used.', 'Every visit ends with the paths swept.', 'We talk through what the ground can take.', 'You decide what stays and what goes.', 'The job is done in the order the trade works to.', 'We leave the area ready for use.'];
const padTo = (text, min, max) => {
  const wc = t => t.replace(/\[CV: [a-z_]+\]/g, 'X').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\\n\\n/g, ' ').split(/\s+/).filter(Boolean).length;
  let i = 0, t = text;
  while (wc(t) < min) t += ' ' + FILL[i++ % FILL.length];
  if (wc(t) > max) throw new Error(`too long (${wc(t)}): ${t}`);
  return t;
};
function outputFor(D, { scope, kw }) {
  const L = ['=== MODEL OUTPUT: service ==='];
  L.push(`${PT.LABELS.hero}: ${padTo(`[CV: company_name] does ${kw} ${scope === 'base' ? 'and across the Hampshire towns around the city' : 'and the villages around the town'}. Our prices are agreed before we start and never grow once the job is under way.`, 20, 49)}`);
  L.push(`${PT.LABELS.includedIntro}: ${padTo(`A ${D.svc_lower} ${scope === 'base' ? 'visit keeps the grass at a height it can cope with, for homeowners who want the lawn kept in shape without doing it themselves' : 'job takes the stump out of the ground so the lawn can be laid level, for homeowners tired of mowing round it'}. You are left with ${scope === 'base' ? 'an even cut and clear paths' : 'ground ready for turf or planting'}.`, 30, 50)}`);
  L.push(`${PT.LABELS.included}:`);
  const items = scope === 'base'
    ? ['Debris and growth checked before the cut', 'Cutting height set for the season', 'The lawn mown in straight passes', 'Edges strimmed and paths edged', 'Clippings collected or spread', 'Paths swept clear of cuttings', 'Visits at the pattern agreed with you']
    : ['Stump and underground hazards inspected', 'Grinding or digging chosen for the stump', 'Surroundings protected before work starts', 'Stump ground out below the surface', 'Arisings removed or spread as agreed', 'Hole backfilled and levelled'];
  D.included.forEach((it, i) => L.push(`  - item_title: ${it.title} | item_text: ${items[i % items.length]}`));
  const para1 = scope === 'base'
    ? `Most of our ${kw} work is on family lawns, and the ground differs street by street. In Hollybrook and Dale Valley the lawns sit on heavier ground that holds water, so the cut waits for a dry spell and the height stays up. In Uplands Estate the lighter soil dries fast, so the grass is left longer through a hot July. Our prices are agreed before we start, so the visit costs what we said it would.`
    : `Most of our ${kw} work is on the gardens of the market town, where the gravel over chalk drains fast and a stump dries hard, so the grinder takes longer to get through it. The larger plots on the edge give the machine room, and the Victorian terraces near the centre need the narrow one. Our prices are agreed before we start, so the job costs what we said it would.`;
  const para2 = scope === 'base'
    ? `A visit starts with a look over the lawn for stones, toys and anything the mower would catch, then the height is set so no more than a third of the grass comes off in one pass. The mow runs in straight lines with the deck kept level, and the edges are strimmed where the blade cannot reach. The clippings come with us or go on the compost, whichever we have agreed with you. Mowing runs through the growing months and stops in a drought or on frozen ground, when a cut does more harm than good.`
    : `The job starts with a look at the stump and what runs under it, because a pipe or a cable close to the roots changes the method. For most stumps a grinder does the work, taking the wood out in passes below the surface; digging and winching come in where the whole root plate has to come out for a wall or a drive. The surroundings are covered before the machine starts, and the hole is backfilled and firmed once the wood is out. How deep we go depends on what you plan to put there, turf needing less than a new bed or a tree.`;
  const para3 = scope === 'base'
    ? `Left too long, grass gets harder to cut evenly and the clumps left behind shade the blades underneath, so the lawn thins where the cuttings sat. Cutting too much at once scalps the surface and tears the grass rather than cutting it. The torn ends brown off and the lawn looks worse than before the cut. A regular visit keeps each cut light, so none of that gets a chance to start.`
    : `A stump left in the ground stays in the way of the mower and sends up shoots from the roots every spring. As it rots it leaves a void under anything laid over it, so a new surface settles where the hole was never filled properly. Grinding too shallow for what comes next leaves roots where turf or a bed was planned. Both are avoided by going to the depth the next job needs and firming the fill in layers.`;
  const para4 = scope === 'base'
    ? `We cover the whole area, including [${D.locationLinks[0].name}](${D.locationLinks[0].url}) and [${D.locationLinks[1].name}](${D.locationLinks[1].url}), with the same visit in each place.`
    : `This is our work in the town itself, job by job; see our full [tree stump removal](${D.baseLink.url}) service for the whole of what it covers.`;
  // Four paragraphs of 4 sentences at most (the shared CB-PARA check), 250 to 300 words in all
  const wc = t => t.replace(/\[CV: [a-z_]+\]/g, 'X').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length;
  const paras = [para1, para2, para3, `${para4} Send us a photo and we will tell you what the job involves.`];
  const total = paras.reduce((n, p) => n + wc(p), 0);
  if (total < 250 || total > 300) throw new Error(`content block ${total} words`);
  L.push(`${PT.LABELS.content}: ${paras.join('\\n\\n')}`);
  L.push(`${PT.LABELS.block4}:`);
  const bodies4 = scope === 'base'
    ? ['Long grass, edges over the path and clumps of cuttings are the first signs a visit has been missed in the growing season. The longer it is left, the harder it is to cut evenly, and the clumps shade what is underneath.', 'Ragged edges and an uneven line show from the kitchen window before anything else. Edges and lines left uncut make a tidy lawn look neglected, and a visit puts the line back.', 'Weeds that return soon after a tidy up have had the top taken off and nothing else. A visit deals with the cause rather than what shows, so the lawn stays even between cuts.', 'When every cut has turned into a catch up, the mowing takes the whole weekend. A regular visit keeps each cut short, so the lawn stays level and the weekend stays yours.']
    : ['A stump in the way of the mower, shoots coming up round it and a patch that cannot be laid level are the first signs the job has been left undone. Left longer, the roots keep sending up growth.', 'A stump that has started to rot lets the soft ground round it settle under the weight of whatever sits on top. Taking it out and firming the hole gives a new surface something solid underneath.', 'A stump ground too shallow for what came next is a stage skipped to save time: the roots stay where turf or a bed was planned. Doing it properly means grinding to the depth the next job needs.', 'A hole left after a wet winter shows where months of rain have soaked into loose backfill and the ground has dropped. Firming the fill in layers in spring puts the level back.'];
  D.problems.forEach((p, i) => L.push(`  - card_title: ${p.title} | card_body: ${padTo(bodies4[i % 4], 40, 60)}`));
  L.push(`${PT.LABELS.steps}:`);
  D.niche_steps.forEach((s, i) => L.push(`  - step_title: ${s.title} | step_body: ${padTo(['Send us a note about the garden and what you would like done, with a photo if you have one.', 'We agree what the job covers and what it costs, so there is nothing left to work out later on.', 'The first visit goes in the diary on a day that suits you, and the work follows from there.'][i % 3], 20, 30)}`));
  L.push(`${PT.LABELS.costIntro}: ${padTo('The price depends on the size of the area and how much is in the way. We give you a figure before the first visit so you know where you stand.', 30, 50)}`);
  L.push(`${PT.LABELS.block5}:`);
  const bodies5 = scope === 'base'
    ? ['A larger or awkward lawn with long or wet growth takes longer to cut and edge, and more obstacles mean more strimming on each visit.', 'Beds, trees and furniture to work round add time, and a slope or a narrow gate changes the machine we bring.', 'A lawn left a season needs a first visit that is a bigger job, with the growth brought down in stages. After that each visit is priced as a visit.', 'An edge, a feed or a hedge added to the visit each adds to the time on site, so the price moves with what you add.']
    : ['A wider stump with a big root plate takes longer to grind, and grinding deeper for a bed or a tree adds to the time.', 'A stump behind the house with a narrow side path means a smaller machine and more passes, and hidden pipes slow the work.', 'Taking the grindings away adds a trip; leaving them to settle into the hole keeps the price down.', 'Natural stone or a tree to follow means grinding deeper and firming the fill, so the job after it shapes the price of this one.'];
  D.cost.forEach((p, i) => L.push(`  - card_title: ${p.title} | card_body: ${padTo(bodies5[i % 4], 30, 45)}`));
  L.push(`${PT.LABELS.areasIntro}: ${padTo(scope === 'base' ? 'We are based in the city and travel [CV: travel_distance] inland and along the coast for garden visits. Every service we offer goes everywhere we cover.' : 'We cover the whole of the town and the villages around it on the same round, so the garden gets the same care wherever it sits.', 40, 60)}`);
  L.push(`${PT.LABELS.faq}:`);
  // The scope answer links a sibling page, else the category page in this town or the base category page
  const sib = i => D.more.length ? D.more[Math.min(i, D.more.length - 1)] : D.linkablePages.find(p => p.type === 'location-category' || p.type === 'category');
  const sibLink = (i, text) => `[${text}](${sib(i).url})`;
  const answers = scope === 'base'
    ? ['It depends on how fast the grass is growing, and the pattern is agreed with you. Growth is fastest through the warm months and slows right down in a cold or dry spell, so the gap between visits follows the lawn, not the calendar.', 'It depends on the size of the lawn and how much is in the way. A larger lawn takes longer to cut and edge, and beds and trees to work round add to the time on site.', 'Yes, we are insured up to £[CV: insurance_cover], and the cover is there for the work we do in your garden.', 'Most lawns are reached through a side gate, and the mower comes and goes without anyone needing to be home. We sort out keys and gates with you at the start, and nothing changes after that.', `A visit covers the cut, the edges, the clippings and the paths. Our ${sibLink(2, D.more.length ? D.more[Math.min(2, D.more.length - 1)].name.toLowerCase() : 'gardening')} visits can be added to the same round.`, 'The lawn stays wet because the ground under it holds water, so the roots sit in it long after the rain has stopped.']
    : ['It depends on the size of the stump and how deep it has to go. A wide stump with a big root plate takes longer, and grinding deeper for a bed or a tree adds to the time on site.', 'The best time is when the ground is firm enough for the machine, and a typical stump takes an hour or two from arrival to backfill.', 'Yes, we are insured up to £[CV: insurance_cover], and the cover is there for the work we do on your property.', 'In most cases no permission is needed to remove a stump at a home. A tree with a protection order or a garden in a conservation area is usually the exception, and we check that first.', `Taking the stump out, grinding below the surface, clearing the grindings and backfilling the hole. Our ${sibLink(1, D.more.length ? D.more[Math.min(1, D.more.length - 1)].name.toLowerCase() : 'tree surgery')} work can follow when the ground has settled.`];
  D.faq.forEach((q, i) => L.push(`  - faq_question: ${q.question} | faq_answer: ${padTo(answers[i % answers.length], 30, 70)}`));
  L.push(`${PT.LABELS.moreIntro}: ${D.more.length ? padTo('The same team looks after the rest of the garden too, from the boundaries to the beds, on the same visit or a separate one.', 20, 40) : 'HIDDEN'}`);
  L.push(`${PT.LABELS.finalCta}: ${padTo('Send us a few lines about the job and we will come back with a price.', 15, 25)}`);
  L.push('MODEL_FLAGS: none');
  return L.join('\n');
}

// ── Parser and record ──
const raw = outputFor(D, { scope: 'base', kw: 'lawn mowing in Southampton' });
const parsed = parseOutput(raw, PT.OUTPUT_SPEC, expectedFromServiceDecisions(D));
same('parser: no flags on a complete output', parsed.flags, []);
same('parser: six items, four cards, four factors, three steps, seven FAQs, given titles kept', [parsed.fields[PT.LABELS.included].length, parsed.fields[PT.LABELS.block4].length, parsed.fields[PT.LABELS.block5].length, parsed.fields[PT.LABELS.steps].length, parsed.fields[PT.LABELS.faq].length, parsed.fields[PT.LABELS.included][0].item_title], [6, 4, 4, 3, 7, 'Inspect lawn and remove debris']);
const meta = { page_type: 'service', page_key: D.slug, generated_at: '2026-10-25T12:00:00.000Z', client_values: G.clientValueMap(cv, D.d1_years_trading), decisions_block: baseR.decisionsBlock, mechanisms: D.problems.map(p => p.mechanism) };
const record = buildServiceRecord({ cv, decisionsResult: baseR, parsed, meta });
same('record: page order fields, the items, the more cards with their urls, hidden reviews, the linked areas list and the "We also cover" towns', [record.page, record.scope, record.svc_hero_h1, record.included.length, record.more_cards[0].card_url, record.svc_reviews_h2, record.svc_areas_links.length, record.svc_areas_also_cover.length, record.faq_items.length, record.buttons], ['service', 'base', 'Lawn Mowing Southampton', 6, '/services/fencing', 'HIDDEN', 5, 7, 7, ['Get My Free Quote', 'Call [CV: phone]']]);
same('record: the page type lists 28 model fields in page order', getPageType('service').modelFields(record).length, 1 + 1 + 6 + 1 + 4 + 3 + 1 + 4 + 1 + 7 + 1 + 1);
chk('reader view: headings in order, the tick list, the "We also cover" line, the more cards, hidden reviews left out', (() => { const md = buildServiceReaderView(record, meta.client_values); const i = ['# Lawn Mowing Southampton', "## What's Included in a Lawn Mowing Visit", '- **Inspect lawn and remove debris**', '## Local Lawn Mowing for Southampton Homeowners', "## Signs It's Time", '## Your Free Quote in 3 Simple Steps', '## How We Price Lawn Mowing Visits', '## Where We Provide Lawn Mowing', 'We also cover Ampfield', '## Lawn Mowing Questions Answered', '## Our Other Gardening Services', '- [Fencing](/services/fencing)', '## Get a Free Lawn Mowing Quote'].map(h => md.indexOf(h)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])) && !/Say About Our/.test(md); })(), '', 'ordered');
chk('reader view: a hidden More Services block is left out', !/Our Other/.test(buildServiceReaderView({ ...record, svc_more_h2: 'HIDDEN', [PT.LABELS.moreIntro]: 'HIDDEN', more_cards: [] }, meta.client_values)), '', 'hidden');

// ── Validator ──
const Vbase = serviceValidationContext(G.validationContextFor({ cv, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap, tradeFactsText: mowRows.markdown }), D, { tradeFactsRows: mowRows.rows });
const issuesOf = (rec, V) => validateService(rec, V || Vbase);
const blocks = iss => iss.filter(i => i.type === 'BLOCK');
const has = (iss, check, fieldPart, msgPart) => iss.some(i => i.check === check && (!fieldPart || i.field.includes(fieldPart)) && (!msgPart || i.message.includes(msgPart)));
const clean = issuesOf(record);
chk('validator: the built page has no BLOCK', !blocks(clean).length, blocks(clean).map(i => `${i.check} ${i.field}: ${i.message}`).join(' | '), 'none');
const withText = (rec, key, text) => { const r = JSON.parse(JSON.stringify(rec)); r[key] = text; return r; };
const withItem = (rec, i, text) => { const r = JSON.parse(JSON.stringify(rec)); r.included[i].item_text = text; return r; };
chk('HERO-SVC: sentence 1 without the company token or the keyword is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.hero, 'We cut lawns across the city. Prices are agreed first.'))), 'HERO-SVC', 'hero', 'no [CV: company_name]'), '', 'HERO-SVC');
chk('KEYWORD: the keyword phrase outside hero and content sentence 1 is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.includedIntro, 'Our lawn mowing in Southampton keeps the grass at a height it can cope with, for homeowners who want the lawn kept in shape. You are left with an even cut and clear paths.'))), 'KEYWORD', 'included_intro'), '', 'KEYWORD');
chk('ITEM: a full stop, a benefit word, a proof token or a town in a tick item is a BLOCK; the N7 range holds 4 to 10 words', (() => { const iss = [issuesOf(withItem(record, 0, 'Debris and growth checked first.')), issuesOf(withItem(record, 1, 'Cutting height set to ensure a healthy lawn')), issuesOf(withItem(record, 2, 'The lawn mown by a team of [CV: team_size]')), issuesOf(withItem(record, 3, 'Edges strimmed across Southampton')), issuesOf(withItem(record, 4, 'Clippings'))]; return has(blocks(iss[0]), 'ITEM', 'Inspect lawn', 'full stop') && has(blocks(iss[1]), 'ITEM', 'Set cutting', 'ensure') && has(blocks(iss[2]), 'ITEM', '(Mow)', 'token') && has(blocks(iss[3]), 'ITEM', 'Edge or strim', 'Southampton') && iss[4].some(i => i.check === 'N7' && /Collect or disperse/.test(i.field) && /4 to 10/.test(i.message)); })(), '', 'ITEM');
chk('record: the parser turned the written \\n\\n into paragraph breaks (four paragraphs)', record[PT.LABELS.content].split(/\n\n+/).length === 4, String(record[PT.LABELS.content].split(/\n\n+/).length), '4');
chk('CB-PARAS: a content block of two paragraphs is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace(/\n\n+/g, ' ').replace('Left too long', '\n\nLeft too long')))), 'CB-PARAS', 'content', '2 paragraph'), '', 'CB-PARAS');
chk('CB-PARA3: a paragraph 3 that shares nothing with the "what goes wrong" rows is a retried FLAG; the built one passes', (() => { const r = withText(record, PT.LABELS.content, record[PT.LABELS.content].replace(/Left too long[^\n]*/, 'Some people worry about letting a firm they have not met into the garden, so the first visit is a walk round with you and nothing happens until you have said what matters most to you.')); const i = issuesOf(r).find(x => x.check === 'CB-PARA3'); return !!i && i.type === 'FLAG' && i.retry && !issuesOf(record).some(x => x.check === 'CB-PARA3'); })(), '', 'CB-PARA3');
chk('ITEM-REPEAT: paragraph 2 repeating an item word for word is a FLAG', (() => { const r = withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('the edges are strimmed', 'the edges strimmed and paths edged come next')); return issuesOf(r).some(i => i.check === 'ITEM-REPEAT' && /Edge or strim/.test(i.message)); })(), '', 'ITEM-REPEAT');
chk('CB-LINKS: paragraph 4 with none of the area pages is a FLAG; four is a BLOCK', (() => { const none = issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace(/\[Chandlers Ford\]\([^)]+\)/, 'Chandlers Ford').replace(/\[Eastleigh\]\([^)]+\)/, 'Eastleigh'))); const four = issuesOf(withText(record, PT.LABELS.content, record[PT.LABELS.content].replace('with the same visit in each place', `with the same visit in [Hedge End](${D.locationLinks[2].url}) and [Romsey](/locations/romsey/gardener) too`))); return none.some(i => i.check === 'CB-LINKS' && i.type === 'FLAG') && has(blocks(four), 'CB-LINKS', 'content', 'links 4'); })(), '', 'CB-LINKS');
chk('STANDARD: a standard\'s number or an Act is a BLOCK', (() => { const a = issuesOf(withText(record, PT.LABELS.costIntro, 'The price depends on the size of the area and how much is in the way, and the work follows BS 7370 throughout. We give you a figure before the first visit so you know where you stand.')); const b = issuesOf(withItem(record, 5, 'Paths swept under the Environmental Protection Act 1990')); return has(blocks(a), 'STANDARD', 'cost_intro', 'BS 7370') && has(blocks(b), 'STANDARD', 'Clear paths', 'Act 1990'); })(), '', 'STANDARD');
chk('RESULT: a promise of a result the business cannot control is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.costIntro, 'The price depends on the size of the area and how much is in the way, and a regular cut means the lawn will stay green all summer. We give you a figure before the first visit so you know where you stand.'))), 'RESULT', 'cost_intro', 'will stay'), '', 'RESULT');
chk('TIMING: the timing written in two fields is a retried FLAG on the second; once passes', (() => { const r = JSON.parse(JSON.stringify(record)); r.faq_items[0].faq_answer = 'Mowing runs weekly or fortnightly between March and October and pauses in a drought or when the ground is frozen or sodden. Outside the season the visits turn to leaves and tidying up the beds.'; r[PT.LABELS.costIntro] = 'The price depends on the size of the area and how much is in the way, and a visit takes 1 to 2 hours. We give you a figure before the first visit so you know where you stand.'; const i = issuesOf(r).find(x => x.check === 'TIMING'); return !!i && i.type === 'FLAG' && i.retry && /already does/.test(i.message) && !issuesOf(record).some(x => x.check === 'TIMING'); })(), '', 'TIMING');
chk('FREQUENCY (shared): "weekly" with no visit_frequency_options is a BLOCK on a service page too', has(blocks(issuesOf(withItem(record, 5, 'Weekly visits through the growing season'))), 'FREQUENCY', 'Clear paths'), '', 'FREQUENCY');
chk('MECHANISM: a block 4 card that makes a cause from MECHANISMS USED is a BLOCK', (() => { const r = JSON.parse(JSON.stringify(record)); r.block4[2].card_body = 'Moss comes back within weeks where the grass is thin because of shade and damp ground under the trees, and a tidy up only takes the top off it. A visit deals with the cause rather than what shows, so the lawn stays even between the cuts we make.'; return has(blocks(issuesOf(r)), 'MECHANISM', 'It keeps coming back', 'shade and damp ground'); })(), '', 'MECHANISM');
chk('MORE-NAMES: the More Services intro naming a service, a town or carrying a link is a BLOCK', (() => { const a = issuesOf(withText(record, PT.LABELS.moreIntro, 'The same team looks after the rest of the garden too, from fencing to the beds, on the same visit or a separate one.')); const b = issuesOf(withText(record, PT.LABELS.moreIntro, 'The same team looks after the rest of the garden too, across Winchester and the city, on the same visit or a separate one.')); return has(blocks(a), 'MORE-NAMES', 'more_intro', 'Fencing') && has(blocks(b), 'MORE-NAMES', 'more_intro', 'Winchester'); })(), '', 'MORE-NAMES');
chk('AREAS-SERVICES and AREAS-PAGES: an areas intro listing services, or claiming every town has a page, is a BLOCK', (() => { const a = issuesOf(withText(record, PT.LABELS.areasIntro, 'We are based in the city and travel [CV: travel_distance] inland and along the coast. Hedge trimming, mulching and weed control all come with us to every town we cover, so the garden gets the same round.')); const b = issuesOf(withText(record, PT.LABELS.areasIntro, 'We are based in the city and travel [CV: travel_distance] inland and along the coast for garden visits. Every town below has its own page, so pick the one nearest you to see how the visit works there.')); return has(blocks(a), 'AREAS-SERVICES', 'areas_intro', 'hedge trimming') && has(blocks(b), 'AREAS-PAGES', 'areas_intro'); })(), '', 'AREAS');
chk('IDEAS: a sentence that remakes a stored idea is a BLOCK', has(blocks(issuesOf(record, { ...Vbase, D: { ...D, ideasUsed: [{ page: 'Gardener category page', text: 'In Hollybrook and Dale Valley the lawns sit on heavier ground that holds water after rain.' }] } })), 'IDEAS', 'content', 'already made'), '', 'IDEAS');
chk('PRACTICE (shared): with the practices unticked the hero "prices are agreed before" is a BLOCK', (() => { const V0 = serviceValidationContext(G.validationContextFor({ cv: { ...cv, confirmed_practices: [] }, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D); return has(blocks(issuesOf(record, V0)), 'PRACTICE', 'hero', 'price is agreed before'); })(), '', 'PRACTICE');
chk('SERVICE (shared): a term the page\'s trade facts rows give (strimming) is not an unconfirmed service', !issuesOf(record).some(i => i.check === 'SERVICE' && /strim/i.test(i.message)), JSON.stringify(issuesOf(record).filter(i => i.check === 'SERVICE').map(i => i.message)), 'none');
chk('shared checks still run: a banned phrase is a BLOCK', has(blocks(issuesOf(withText(record, PT.LABELS.costIntro, 'Look no further for a tidy lawn. The price depends on the size of the area and how much is in the way, and we give you a figure before the first visit.'))), '2', 'cost_intro'), '', 'banned');
chk('AREA-CLAIM (shared): a sentence claiming work in a named place is a BLOCK; the base town is exempt; a place in areas_worked passes', (() => {
  const texts = ['This is regular work for us around Romsey, and we bring the same care to every garden.', "We've done many jobs in Hollybrook over the years, so the ground holds no surprises.", 'Most of our work is in Winchester these days.', "We're often in Eastleigh on a Tuesday."];
  const blocked = texts.map(t => has(blocks(issuesOf(withText(record, PT.LABELS.costIntro, `${t} The price depends on the size of the area and how much is in the way, and we give you a figure before the first visit.`))), 'AREA-CLAIM', 'cost_intro'));
  const city = !has(issuesOf(withText(record, PT.LABELS.costIntro, 'Most of our work as a gardener in Southampton is on family gardens. The price depends on the size of the area and how much is in the way, and we give you a figure before the first visit.')), 'AREA-CLAIM');
  const Vw = serviceValidationContext(G.validationContextFor({ cv: { ...cv, areas_worked: 'Romsey, Hedge End' }, niche, decisions: D, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap }), D, { tradeFactsRows: mowRows.rows });
  const allowed = !has(issuesOf(withText(record, PT.LABELS.costIntro, `${texts[0]} The price depends on the size of the area and how much is in the way, and we give you a figure before the first visit.`), Vw), 'AREA-CLAIM');
  return (blocked.every(Boolean) && city && allowed) || JSON.stringify([blocked, city, allowed]);
})() === true, '', 'AREA-CLAIM');
chk('LEAK (shared): the model\'s own working or a second label inside the copy is a BLOCK (the live Gardener final CTA, 25 Oct)', has(blocks(issuesOf(withText(record, PT.LABELS.finalCta, 'Tell the story of your lawn and whether you want one cut or regular visits.\n\nWait, that opens with "Tell", which is banned. Corrected version:\n\nsvc_final_cta_body: Send a message about your lawn and we will talk through what a visit involves.'))), 'LEAK', 'final_cta', 'working'), '', 'LEAK');
{
  const R = require(path.join(root, 'v20-retry.js'));
  const reply = 'svc_final_cta_body: Tell the story of your lawn.\n\nWait, that opens with "Tell", which is banned. Corrected version:\n\nsvc_final_cta_body: Send a message about your lawn and we will talk through what a visit involves.';
  chk('retry parser: a reply that corrects itself gives the text after the last label', typeof R.parseRetryReply === 'function' ? R.parseRetryReply(reply, { key: PT.LABELS.finalCta }) === 'Send a message about your lawn and we will talk through what a visit involves.' : true, typeof R.parseRetryReply === 'function' ? R.parseRetryReply(reply, { key: PT.LABELS.finalCta }) : 'not exported', 'the last version');
}
chk('FINAL-CTA: a final CTA body opening "Tell us" is a retried FLAG', (() => { const i = issuesOf(withText(record, PT.LABELS.finalCta, 'Tell us a few lines about the job and we will come back with a price for the work.')).find(x => x.check === 'FINAL-CTA' && /Tell us/.test(x.message)); return !!i && i.type === 'FLAG' && i.retry; })(), '', 'FLAG');
// The town page's own rules
const rawT = outputFor(T, { scope: 'town', kw: 'tree stump removal in Romsey' });
const parsedT = parseOutput(rawT, PT.OUTPUT_SPEC, expectedFromServiceDecisions(T));
same('parser (town): no flags, six items, five FAQs', [parsedT.flags, parsedT.fields[PT.LABELS.included].length, parsedT.fields[PT.LABELS.faq].length], [[], 6, 5]);
const recordT = buildServiceRecord({ cv, decisionsResult: townR, parsed: parsedT, meta: { ...meta, page_key: T.slug, decisions_block: townR.decisionsBlock } });
const Vtown = serviceValidationContext(G.validationContextFor({ cv, niche, decisions: T, keyValueMap: kv, serviceParentMap: ctx.serviceParentMap, tradeFactsText: stumpRows.markdown }), T, { tradeFactsRows: stumpRows.rows });
const cleanT = blocks(issuesOf(recordT, Vtown));
chk('validator (town): the built town page has no BLOCK', !cleanT.length, cleanT.map(i => `${i.check} ${i.field}: ${i.message}`).join(' | '), 'none');
chk('TOWN-OTHER: naming Southampton or Winchester on a town page is a BLOCK', has(blocks(issuesOf(withText(recordT, PT.LABELS.includedIntro, 'A tree stump removal job takes the stump out so the lawn can be laid level, the same job we do in Winchester, for homeowners tired of mowing round it. You are left with ground ready for turf.'), Vtown)), 'TOWN-OTHER', 'included_intro', 'Winchester'), '', 'TOWN-OTHER');
chk('BASE-LINK: a town page that never links its base page is a BLOCK; linking it twice is a BLOCK', (() => { const none = issuesOf(withText(recordT, PT.LABELS.content, recordT[PT.LABELS.content].replace(/\[tree stump removal\]\([^)]+\)/, 'tree stump removal')), Vtown); const twice = JSON.parse(JSON.stringify(recordT)); twice.faq_items[4].faq_answer = twice.faq_items[4].faq_answer.replace('Taking the stump out', `Taking the stump out, as on our [tree stump removal](${T.baseLink.url}) page,`); return has(blocks(none), 'BASE-LINK', 'content', 'never links') && has(blocks(issuesOf(twice, Vtown)), 'BASE-LINK', '', '2 times'); })(), '', 'BASE-LINK');
chk('LINK-TOWN: link text with a town on a town page is a BLOCK', has(blocks(issuesOf(withText(recordT, PT.LABELS.content, recordT[PT.LABELS.content].replace('[tree stump removal]', '[tree stump removal Romsey]')), Vtown)), 'LINK-TOWN', 'content'), '', 'LINK-TOWN');
chk('AREAS-TOWN: a village in the town page areas intro is a BLOCK', has(blocks(issuesOf(withText(recordT, PT.LABELS.areasIntro, 'We cover the whole of the town and the villages around it, Timsbury included, on the same round, so the garden gets the same care wherever it sits and whoever looks after it.'), Vtown)), 'AREAS-TOWN', 'areas_intro', 'Timsbury'), '', 'AREAS-TOWN');
chk('IDEAS: the areas intro is left out (its content is prescribed; the first real run matched it against the category hero)', !has(issuesOf(withText(recordT, PT.LABELS.areasIntro, 'We do stump removal in Romsey and the villages around it, so the stump in your garden gets the same job as any other on our list, however far out of the town centre it sits.'), { ...Vtown, D: { ...T, ideasUsed: [{ page: 'Tree Service Romsey category page', text: 'CVTOKEN is a tree surgeon in Romsey, taking on stump removal and felling in the town and the villages around it.' }] } }), 'IDEAS', 'areas_intro'), '', 'no IDEAS on the areas intro');
chk('the rules answer written as "in most cases" with no number passes; "Part 2, Class A" fails', (() => { const r = JSON.parse(JSON.stringify(recordT)); r.faq_items[3].faq_answer = 'In most cases no permission is needed, as Schedule 2, Part 2, Class A of the planning order allows it. A tree with a protection order is usually the exception, and we check that first with the council before the machine arrives.'; return has(blocks(issuesOf(r, Vtown)), 'STANDARD', 'permission', 'Schedule 2') && !blocks(issuesOf(recordT, Vtown)).some(i => i.check === 'STANDARD'); })(), '', 'STANDARD');

// ── The rubric reviewer on service pages (code side) ──
{
  const Q = require(path.join(root, 'quality-review.js'));
  const base = Q.scoreCodeItems({ record, V: Vbase, D, cv, niche });
  const ids = base.items.map(i => i.id);
  chk('rubric: a service page is scored with the homepage items plus the service items', ['K1', 'I1', 'T3', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'H1', 'C1', 'P3'].every(i => ids.includes(i)) && !ids.includes('S11'), ids.join(','), 'homepage + service items');
  chk('rubric: the built base page passes the service items', ['K1', 'I1', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'E1'].every(i => base.items.find(x => x.id === i).pass), JSON.stringify(base.items.filter(i => !i.pass).map(i => i.id + ': ' + i.reasons[0])), 'pass');
  const dec = Q.decisionsTests({ record, D, cv, niche });
  chk('rubric: the final CTA heading names the service; no card pick or meta test', dec.finalCta === null && dec.cardPicks === null && dec.meta === null && dec.areaList === null, JSON.stringify(dec), '');
  const bad = JSON.parse(JSON.stringify(record));
  bad.included[1].item_text = 'Cutting height set to ensure a healthy lawn';
  bad[PT.LABELS.moreIntro] = 'The same team looks after the rest of the garden too, from fencing to the beds, on the same visit or a separate one.';
  const scored = Q.scoreCodeItems({ record: bad, V: Vbase, D, cv, niche });
  const fails = Object.fromEntries(scored.items.filter(i => !i.pass).map(i => [i.id, i.reasons[0]]));
  chk('rubric: V1 fails on the benefit word, V8 on the named service', /ensure/.test(fails.V1) && /Fencing/.test(fails.V8), JSON.stringify(Object.keys(fails)), 'V1, V8');
  const J = Q.judgeItemsFor(recordT);
  chk('rubric: the judge gets the service page items, and the town item on the town page only', /trade facts/.test(J.B1j) && !!J.V9j && !!J.T6j && !Q.judgeItemsFor(record).T6j, Object.keys(J).join(','), 'B1j, V9j, T6j');
  chk('rubric: the reviewer reads the service reader view and the decisions summary names the items', /Tree Stump Removal Romsey/.test(Q.pageText(recordT)) && !/Review notes/.test(Q.pageText(recordT)) && /What's Included items/.test(Q.decisionsSummary(record, D)), '', 'service reader');
}

// ── The prompt and the shared rules ──
{
  const core = loadCore17();
  chk('prompt: CORE (17) is read with the shared rules appended under their own heading', /# Service Page Copywriting Prompt — CORE \(17\)/.test(core) && /## SHARED COPY RULES \(prompts\/_shared_copy_rules\.md/.test(core) && /\*\*One home per proof\*\*/.test(core) && core.indexOf('## OUTPUT') < core.indexOf('## SHARED COPY RULES'), '', 'appended');
  chk('prompt: the OUTPUT labels are the page type\'s labels', Object.values(PT.LABELS).every(l => core.includes(`${l}:`)), Object.values(PT.LABELS).filter(l => !core.includes(`${l}:`)).join(','), 'all');
  // Both prompts read the one shared rules file: CORE (16) in place of its GLOBAL COPY RULES block, CORE (17) appended
  const { loadSharedRules } = require(path.join(root, 'service-generate.js'));
  const shared = loadSharedRules();
  const { loadCore16 } = require(path.join(root, 'category-generate.js'));
  const c16 = loadCore16();
  const file16 = fs.readFileSync(path.join(root, 'prompts', 'Category_Page_Copywriting_Prompt_CORE (16).md'), 'utf8');
  chk('prompt: the shared rules file holds the claims, proof, keyword, voice, links and custom values rules', shared.source === '_shared_copy_rules.md' && ['**Claims**', '**One home per proof**', '**Keyword placement**', '**Voice**', '**Links**', '**Custom values**'].every(h => shared.text.includes(h)), shared.text.slice(0, 80), 'the block');
  chk('prompt: CORE (16) as read carries the shared rules in its GLOBAL COPY RULES place, once, before OUTPUT; the file on disk holds only the pointer', c16.includes(shared.text) && (c16.match(/## GLOBAL COPY RULES/g) || []).length === 1 && c16.indexOf('## GLOBAL COPY RULES') < c16.indexOf('## OUTPUT') && !file16.includes('**One home per proof**') && /Edit the file, not this block/.test(file16), '', 'inserted');
  chk('prompt: CORE (17) as read carries the same text', core.includes(shared.text), '', 'appended');
}

// ── Mechanisms stored on a category record are read back ──
same('mechanisms: meta.mechanisms first, else the decisions block', [mechanismsOf({ meta: { mechanisms: ['a', 'b'] } }), mechanismsOf({ meta: { decisions_block: '--- BLOCK 4 ---\n  1. Card\n     Mechanism (this card\'s one cause; no other card or answer makes it): shade and damp ground\n     Brief: x' } })], [['a', 'b'], ['shade and damp ground']]);

// ── The runner on pg-mem: the gate, category pages first, order, skip, resume, the ideas and mechanisms passing on ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  const v20Store = createV20Store(pool);
  const cid = crypto.randomUUID();
  // Lawn mowing and Hedge trimming (Gardener) plus Tree stump removal and its Romsey page (Tree Service)
  const keep = new Set(['Lawn mowing', 'Hedge trimming', 'Tree stump removal']);
  const smallRows = rows.filter(r => !['service', 'town_service'].includes(r.type) || (r.type === 'service' && keep.has(r.title)) || (r.type === 'town_service' && r.title === 'Tree stump removal Romsey'));
  const dossiers = [{ id: 'd1', text: fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'), locationName: 'Southampton' },
    { id: 'd2', locationName: 'Romsey', text: `## 1. LOCATION OVERVIEW\n${ROMSEY.profile}\n\n## 2. NEIGHBOURHOOD PROFILES\n\n### [ROM-N01] Awbridge | village\nProfile: Larger plots with mature trees. [https://example.org/a]\n\n### [ROM-N02] Timsbury | village\nProfile: Cottages with long gardens. [https://example.org/b]\n\n## 3. LOCAL ISSUES\n\n### [ROM-I01] Old stumps in lawns\nDetail: Felled trees leave stumps in lawns that send up shoots. [https://example.org/c]\nCategory tags: Tree Service\nService tags: Tree stump removal\n\n## 4. SYMPTOMS\n\n- [ROM-S01] | “A stump in the lawn keeps sprouting.” | ROM-I01 | Urgent: N\n\n## 5. RULES & COUNCIL\n\n## 6. DEMAND BY AREA\n\n## 7. NEARBY CONTRAST\n\n## 8. GAPS\n\n## 9. SOURCES CONSULTED\n` }];
  const allocationRecord = { version: 1, pages: { homepage: { neighbourhoods: ['SOU-N07', 'SOU-N11'], symptoms: {}, conservation_areas: ['SOU-N11'] }, 'category:/gardener': { neighbourhoods: ['SOU-N04', 'SOU-N13'], symptoms: {}, conservation_areas: [] } } };
  const calls = [];
  let failNext = false;
  const gate = { niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: true };
  const inputs = { ctx: { ...ctx, cv }, niche, rows: smallRows, dossiers, allocationRecord, calibrationPack: { name: null, text: '' }, tradeFacts: gate, reviews: [], saveAllocation: async r => { inputs.allocationRecord = r; } };
  const runner = createServiceRunner({
    pool, v20Store, log: () => {},
    loadInputs: async () => inputs,
    allocate: async ({ page }) => ({ neighbourhoods: ['SOU-N09', 'SOU-N14'], conservation_areas: [], reasons: 'stub', flags: [], source: 'model' }),
    generate: async args => {
      const Dd = args.decisionsResult.decisions;
      calls.push({ key: Dd.slug, ideas: Dd.ideasUsed.length, mechanisms: Dd.mechanismsUsed.map(m => m.text), neighbourhoods: Dd.allocated.neighbourhoods.map(n => n.name), rows: Dd.trade_facts.rows });
      if (failNext) { failNext = false; throw new Error('model down'); }
      return generateServicePage({ ...args, retries: false, claimsReview: false, callModel: async () => ({ text: outputFor(Dd, { scope: Dd.scope, kw: Dd.keyword }), usage: {} }) });
    },
  });
  same('runner: base service pages first, then town pages, page map order', pagesInOrder(smallRows).map(p => p.slug), ['/services/lawn-mowing', '/services/hedge-trimming', '/services/tree-stump-removal', '/locations/romsey/tree-stump-removal']);
  same('runner: a page\'s parent category page: the base category page, or the location category page in its town', [parentsOf(smallRows, basePage).parentKey, parentsOf(smallRows, townPage).parentKey], ['/gardener', '/locations/romsey/tree-service']);
  // The gate refuses the run
  inputs.tradeFacts = { niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: false, message: 'Service pages are blocked: the trade facts pack trade-facts/landscaper.md has not been verified. Verify it on the Trade facts page.' };
  chk('runner: an unverified pack refuses the run with the gate\'s message, and no page is written', await runner.run(cid, { resume: false }).then(() => false, e => e.status === 422 && /has not been verified/.test(e.message)) && !calls.length, '', '422');
  inputs.tradeFacts = gate;
  // No category pages yet: every page is skipped
  let st = await runner.run(cid, { resume: false });
  same('runner: with no category page written every service page is skipped with the reason', st.pages.map(p => `${p.status}:${p.error}`), ['skipped:category page not written yet (/gardener)', 'skipped:category page not written yet (/gardener)', 'skipped:category page not written yet (/tree-service)', 'skipped:category page not written yet (/locations/romsey/tree-service)']);
  // The category records: Gardener and Tree Service base pages, with their mechanisms, and the Tree Service Romsey page
  const catRec = (slug, mechanisms, ideas) => ({ page: 'category', page_slug: slug, meta: { page_type: 'category', page_key: slug, mechanisms, ideas }, VALIDATION: { status: 'run', block: 0, flag: 0 } });
  await v20Store.insert(cid, catRec('/gardener', ['shade and damp ground', 'the timing of cuts'], [{ text: 'Bassett Heath plots are large enough for a hedge to become a day of work on its own.', kind: 'local' }]), { type: 'category', key: '/gardener' });
  await v20Store.insert(cid, catRec('/tree-service', ['roots lifting a surface'], []), { type: 'category', key: '/tree-service' });
  await v20Store.insert(cid, catRec('/locations/romsey/tree-service', ['a stump rotting under a lawn'], []), { type: 'category', key: '/locations/romsey/tree-service' });
  await v20Store.insert(cid, { page: 'homepage', meta: { page_type: 'homepage', ideas: [{ text: 'The clay in Bassett holds water for days after rain, so patios need a proper base.', kind: 'technical' }] }, home_hero_intro: 'x' }, { type: 'homepage', key: 'homepage' });
  failNext = true; // the first page fails on the model
  st = await runner.run(cid, { resume: false });
  same('runner: a failed page is recorded and the run carries on', st.pages.map(p => `${p.key}:${p.status}`), ['/services/lawn-mowing:failed', '/services/hedge-trimming:done', '/services/tree-stump-removal:done', '/locations/romsey/tree-stump-removal:done']);
  chk('runner: the failed page\'s record keeps the error and the decisions block', (await v20Store.latest(cid, { type: 'service', key: '/services/lawn-mowing' })).record.error === 'model down' && !!(await v20Store.latest(cid, { type: 'service', key: '/services/lawn-mowing' })).record.meta.decisions_block, '', '');
  chk('runner: a base page got the allocation pass with the homepage\'s and the category page\'s neighbourhoods taken, saved on the allocation record', calls[0].neighbourhoods.join(',') === 'Flowers Estate,Old Woolston' && inputs.allocationRecord.pages['service:/services/lawn-mowing'].neighbourhoods.join(',') === 'SOU-N09,SOU-N14', JSON.stringify([calls[0].neighbourhoods, Object.keys(inputs.allocationRecord.pages)]), '');
  chk('runner: the pages saw the category page\'s mechanisms and the homepage\'s ideas; Hedge trimming saw the Gardener page\'s (the failed sibling adds none), not the Tree Service page\'s', calls[1].mechanisms.join('|') === 'shade and damp ground|the timing of cuts' && calls[1].ideas >= 2 && calls[2].mechanisms.join('|') === 'roots lifting a surface', JSON.stringify(calls.map(c => [c.key, c.mechanisms, c.ideas])), '');
  chk('runner: the Romsey page used the Romsey category page\'s mechanism (its base page\'s four are its own brief\'s, left out) and the stump rows', (() => { const c = calls[3]; return c.mechanisms.join('|') === 'a stump rotting under a lawn' && c.rows === stumpRows.rows.length; })(), JSON.stringify(calls[3]), '');
  const romRec = (await v20Store.latest(cid, { type: 'service', key: '/locations/romsey/tree-stump-removal' })).record;
  chk('runner: the Romsey record carries the town profile, the villages and the symptom question, and stored its mechanisms and ideas', /Romsey is a market town/.test(romRec.meta.decisions_block) && romRec.svc_areas_links.map(a => a.name).join(',') === 'Awbridge,Timsbury' && romRec.faq_items.some(f => /keeps sprouting/.test(f.faq_question)) && romRec.meta.mechanisms.length === 4 && Array.isArray(romRec.meta.ideas), JSON.stringify([romRec.svc_areas_links, romRec.faq_items.map(f => f.faq_question), romRec.meta.mechanisms]), '');
  chk('runner: a good record has no BLOCK', romRec.VALIDATION.block === 0, JSON.stringify(romRec.VALIDATION.issues.filter(i => i.type === 'BLOCK')), 'none');
  const before = calls.length;
  st = await runner.run(cid, { resume: true });
  same('runner: resume keeps the good pages and writes the failed one again', [st.pages.map(p => `${p.key}:${p.status}`), calls.length - before], [['/services/lawn-mowing:done', '/services/hedge-trimming:kept', '/services/tree-stump-removal:kept', '/locations/romsey/tree-stump-removal:kept'], 1]);
  chk('runner: the base page written on resume sees the category page\'s causes; its sibling\'s four are its own brief\'s and are left out', calls[before].mechanisms.join('|') === 'shade and damp ground|the timing of cuts', JSON.stringify(calls[before].mechanisms), '');
  const view = await runner.view(cid, smallRows);
  same('runner: the panel view lists every page with its record summary, its parent\'s state and the run state', [view.pages.map(p => `${p.key} ${p.record ? (p.record.good ? 'good' : 'bad') : 'none'} ${p.parent_written}`), !!view.run.finished_at, view.running], [['/services/lawn-mowing good true', '/services/hedge-trimming good true', '/services/tree-stump-removal good true', '/locations/romsey/tree-stump-removal good true'], true, null]);
  const one = await runner.run(cid, { resume: false, keys: ['/locations/romsey/tree-stump-removal'] });
  same('runner: one page on its own', one.pages.map(p => `${p.key}:${p.status}`), ['/locations/romsey/tree-stump-removal:done']);
  const written = await runner.writtenFor(cid, smallRows, '/services/hedge-trimming');
  same('runner: the written set for one page leaves that page out and carries the category records', [written.pages.map(p => p.record.page_slug), Object.keys(written.categories).sort()], [['/services/lawn-mowing', '/services/tree-stump-removal', '/locations/romsey/tree-stump-removal'], ['/gardener', '/locations/romsey/tree-service', '/tree-service']]);
  const prep = await runner.prepare(cid, inputs, smallRows.find(r => r.slug === '/services/hedge-trimming'), written);
  chk('runner: prepare gives today\'s decisions for a saved page (for re-validation on edit), with the category page\'s mechanisms', prep.decisionsResult.decisions && prep.parentWritten && prep.decisionsResult.decisions.mechanismsUsed.length === 2, JSON.stringify(prep.decisionsResult.decisions && prep.decisionsResult.decisions.mechanismsUsed.length), '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
void CPT;
