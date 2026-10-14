'use strict';
// Fixture: Brandon's round 3 review of the Edens Edge homepage (16 Oct 2026, "8/10").
// Live sentences are word for word from the run generated 2026-10-14T17:42:54Z.
const path = require('path');
const root = path.join(__dirname, '../..');
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { practiceClaims } = require(path.join(root, 'practices.js'));
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const roofer = require(path.join(root, 'niche-library/roofer.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Edens Edge homepage, round 3 review ===\n');

const cv = { ...E.ethanValues(), map_embed: 'x', coastal_city: 'yes', phone: '07850 412717', team_size: '4' };
const decide = extra => computeDecisions({ cv: { ...cv, ...extra }, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null }).decisions;
const D = decide({});
const V = buildValidationContext({ cv, niche: landscaper, decisions: D, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
const card = (D9, name) => (D9.d9.main.find(c => c.name === name) || {}).services || [];
const FILL = ['Hedges grow fast in spring.', 'New patios need a firm base.', 'Plans come before digging.', 'Thin lawns recover with care.', 'Old trees need regular pruning.', 'Driveways start with the ground.', 'Timber decks need sound frames.'];
const page = extra => ({
  cards: D.d9.main.map(c => ({ card_name: c.name, card_url: c.url, card_text: FILL[D.d9.main.indexOf(c) % FILL.length] })),
  home_services_more_line: 'HIDDEN',
  faq_items: D.d11_faq.map(q => ({ faq_question: q.question, faq_answer: 'An answer that is long enough to count.' })),
  ...extra,
});
const checks = (rec, code) => validateV20(rec, V).filter(i => i.check === code);
const withCards = texts => page({ cards: D.d9.main.map(c => ({ card_name: c.name, card_url: c.url, card_text: texts[c.name] || FILL[D.d9.main.indexOf(c) % FILL.length] })) });

// 1. Core services per category
chk('1: both niche files carry core_services', landscaper.core_services && roofer.core_services && landscaper.core_services['landscape gardener'][0] === 'garden makeovers', JSON.stringify(Object.keys(landscaper.core_services || {})), 'present');
chk('1: Landscape Gardener leads with makeovers, patios and planting', card(D, 'Landscape Gardener').join(', ') === 'garden makeovers, patios, planting', card(D, 'Landscape Gardener').join(', '), 'garden makeovers, patios, planting');
chk('1: Tree Service never leads with tree bracing', card(D, 'Tree Service')[0] !== 'tree bracing' && !card(D, 'Tree Service').includes('tree bracing'), card(D, 'Tree Service').join(', '), 'no bracing');
chk('1: no card names artificial grass unless wanted', !D.d9.main.some(c => (c.services || []).includes('artificial grass')), D.d9.main.map(c => c.services.join('/')).join(' | '), 'none');
chk('1: lawn mowing and seeding go under Lawn Care Service, not Gardener', card(D, 'Lawn Care Service').includes('lawn mowing') && card(D, 'Lawn Care Service').includes('seeding lawns') && !card(D, 'Gardener').some(s => /mowing|seeding/.test(s)), `Lawn care: ${card(D, 'Lawn Care Service').join(', ')} | Gardener: ${card(D, 'Gardener').join(', ')}`, 'moved');
const all = D.d9.main.flatMap(c => c.services);
chk('1: no service sits in two cards', all.length === new Set(all).size, all.join(', '), 'unique');
const W = decide({ jobs_wanted: ['artificial grass'] });
chk('1: a wanted specialist service leads its card', card(W, 'Landscape Gardener')[0] === 'artificial grass', card(W, 'Landscape Gardener').join(', '), 'artificial grass first');

// 2. Card sentence patterns
const live = {
  'Gardener': 'A tidy garden takes consistent work. Our [gardener](/gardener/) service covers lawn mowing to keep the grass in good shape week to week. We also handle fencing to define and secure your boundaries, and seeding lawns where bare or thin patches need bringing back.',
  'Landscape Gardener': 'Ready to change how your garden looks? Our [landscape gardener](/landscape-gardener/) work covers artificial grass for a low maintenance surface that holds its look year round. We also handle concrete and block work for solid foundations and driveways built to last.',
  'Landscape Designer': "Starting from scratch or rethinking a garden that's never quite worked? Our [landscape designer](/landscape-designer/) work covers garden design and design and build, taking a plan through to a finished space. We also handle drainage where the ground holds water and needs a proper solution built in from the start.",
};
const pat = checks(withCards(live), 'CARD-PATTERN');
chk('2: the live cards sharing "Our [category] work covers" and "We also handle" are flagged', pat.length >= 2 && pat.some(i => /Landscape Gardener/.test(i.field)) && pat.some(i => /Landscape Designer/.test(i.field)), pat.map(i => `${i.field}: ${i.message}`).join(' | '), 'flagged');
const also = pat.filter(i => /already used once/.test(i.message));
chk('2: "We also handle" a second and third time is flagged twice', also.length === 2, also.map(i => i.field).join(', '), '2');
chk('2: cards with their own shapes pass', checks(page(), 'CARD-PATTERN').length === 0, JSON.stringify(checks(page(), 'CARD-PATTERN')), 'none');

// 3. Self reference
const intro = "We're based in Southampton and travel up to 20 miles inland and along the coast. We work regularly across the Test Valley, the New Forest edge and the towns and villages around Romsey, Winchester and Eastleigh. The full list is in the areas section below.";
const sr = checks(page({ home_areas_intro: intro }), 'SELF-REF');
chk('3: the live areas intro ("the full list is in the areas section below") is a BLOCK', sr.length === 1 && sr[0].type === 'BLOCK', sr.map(i => i.message).join(' | '), 'BLOCK');
const areasIdx = D.d11_faq.findIndex(q => /which areas/i.test(q.question));
const srFaq = checks(page({ faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === areasIdx ? 'We cover Southampton and smaller villages further out. The full list of locations is in the areas section of this page.' : 'An answer that is long enough to count.' })) }), 'SELF-REF');
chk('3: the live areas FAQ pointing at the areas section is a BLOCK', srFaq.length === 1, srFaq.map(i => i.message).join(' | '), 'BLOCK');
const q7 = 'Ask what the price includes below the surface: drainage and preparation are where corners get cut.';
chk('3: "below the surface" is not a page reference', checks(page({ faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === 6 ? q7 : 'An answer that is long enough to count.' })) }), 'SELF-REF').length === 0, '', 'none');

// 4. Outcome promises
const out = checks(withCards({
  'Paving Contractor': "Block paving, concrete bases and new driveways are only as good as what sits beneath them. Our [paving contractor](/paving-contractor/) work addresses the ground first. The finished surface stays level, drains properly and won't settle or crack through the first winter.",
  'Lawn Care Service': 'The grass grows evenly, recovers faster after dry spells, and stays green through the season.',
}), 'OUTCOME');
chk('4: "stays level", "won\'t settle" and "stays green" are flagged', out.some(i => /stays level/.test(i.message)) && out.some(i => /won't settle/.test(i.message)) && out.some(i => /stays green/.test(i.message)) && out.every(i => i.type === 'FLAG'), out.map(i => i.message.split('"')[1]).join(', '), 'all three');

// 5. Experience and the quote/do practice
const exp = checks(page({ points: D.d10_why.map((p, i) => ({ point_title: p.title, point_body: i === 0 ? "We've completed over 100 jobs across Southampton and the surrounding towns, covering gardens from tight city plots to large rural properties." : 'A body for this point that is long enough to count.' })) }), 'EXPERIENCE');
chk('5: "large rural properties" is a BLOCK', exp.length === 1 && exp[0].type === 'BLOCK', exp.map(i => i.message).join(' | '), 'BLOCK');
chk('5: a jobs count on its own passes', checks(page({ points: D.d10_why.map(p => ({ point_title: p.title, point_body: "We've completed over 100 jobs across Southampton and the surrounding towns." })) }), 'EXPERIENCE').length === 0, '', 'none');
const pq = practiceClaims("We're a family run business with a four person team, which means the people who quote the job are the ones who carry it out.", landscaper);
chk('5: "the people who quote the job are the ones who carry it out" is a practice claim', pq.length >= 1, pq.map(c => c.practice.key).join(', '), 'a practice');

// Council areas in the areas intro
const adm = checks(page({ home_areas_intro: 'We travel up to 20 miles inland and along the coast, out to the New Forest and Romsey.' }), 'AREA-ADMIN');
chk('Council area "New Forest" in the areas intro is flagged', adm.length === 1, adm.map(i => i.message).join(' | '), 'flagged');

// False BLOCKs on the live run of 2026-10-14T18:48:48Z, word for word
const lawn = checks(withCards({ "Lawn Care Service": "A good lawn takes more than mowing. Our [lawn care service](/lawn-care-service/) covers lawn mowing, seeding lawns where the coverage has thinned, and laying new lawns from scratch." }), "CARD-COUNT");
chk("CARD-COUNT: the card's own category (\"our lawn care service\") is not a fourth service", lawn.length === 0, lawn.map(i => i.message).join(" | "), "none");
const sched = practiceClaims("The exact date is agreed with you when the job is booked, and we'll confirm it before we schedule anything.", landscaper);
chk("PRACTICE: \"before we schedule anything\" is not a visit schedule claim", !sched.some(c => c.practice.key === "maintenance_schedule"), sched.map(c => c.match).join(", "), "none");
chk("PRACTICE: \"visits on an agreed schedule\" still is", practiceClaims("Regular customers get visits on an agreed schedule.", landscaper).some(c => c.practice.key === "maintenance_schedule"), "", "caught");

// The prompt says it
const core = require('fs').readFileSync(path.join(root, 'prompts/Homepage_Copywriting_Prompt_CORE (20).md'), 'utf8');
chk('CORE (20) carries the round 3 rules', /"We also handle" appears once on the page at most/.test(core) && /The page never points at itself/.test(core) && /won't crack", "stays green"/.test(core) && /large rural properties/.test(core), '', 'all rules');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
