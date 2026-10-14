'use strict';
// Fixture: Brandon's round 2 review of the Edens Edge homepage (16 Oct 2026, "7.5/10").
// The live sentences are word for word from the second fresh run (14 Oct, 17:16).
const path = require('path');
const root = path.join(__dirname, '../..');
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { buildV20Request } = require(path.join(root, 'v20-generate.js'));
const C = require(path.join(root, 'wp/claims-review.js'));
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Edens Edge homepage, round 2 review ===\n');

const cv = { ...E.ethanValues(), map_embed: 'x', coastal_city: 'yes', phone: '07850 412717', team_size: '4' };
const res = computeDecisions({ cv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null });
const D = res.decisions;
const V = buildValidationContext({ cv, niche: landscaper, decisions: D, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
const page = extra => ({
  meta_description: D.d4_meta,
  home_hero_intro: '[CV: company_name] is a landscaper in Southampton, covering Romsey and the surrounding areas. Fixed prices with no hidden costs mean the figure you agree before we start is the figure you pay.',
  points: D.d10_why.map(p => ({ point_title: p.title, point_body: 'A body for this point that is long enough to count.' })),
  steps: D.niche_steps.map(s => ({ step_title: s.title, step_body: 'A short body for this step that is long enough to count here.' })),
  cards: D.d9.main.map(c => ({ card_name: c.name, card_url: c.url, card_text: `Some text about ${c.name.toLowerCase()} work.` })),
  home_services_more_line: 'HIDDEN',
  home_final_cta_body: 'We will look at what you need and come back to you with a clear next step.',
  faq_items: D.d11_faq.map(q => ({ faq_question: q.question, faq_answer: 'An answer that is long enough to count.' })),
  ...extra,
});
const checks = (rec, code) => validateV20(rec, V).filter(i => i.check === code);
const cardIdx = name => D.d9.main.findIndex(c => c.name === name);
const withCard = (name, text) => page({ cards: D.d9.main.map((c, i) => ({ card_name: c.name, card_url: c.url, card_text: i === cardIdx(name) ? text : `Some text about ${c.name.toLowerCase()} work.` })) });

// 9. Code picks each card's services; the model never sees the full list
const deck = D.d9.main.find(c => c.name === 'Deck Builder');
chk('9: every category card gets 3 services at most, picked by code', D.d9.main.every(c => Array.isArray(c.services) && c.services.length <= 3), D.d9.main.map(c => `${c.name}: ${(c.services || []).join(', ')}`).join(' | '), 'up to 3 each');
chk('9: the Deck Builder card is not given fencing (a Gardener service)', deck && !deck.services.includes('fencing'), deck && deck.services.join(', '), 'no fencing');
chk('9: the decisions block lists each card\'s services', /Services: /.test(res.decisionsBlock) && res.decisionsBlock.includes(`Services: ${deck.services.join(', ')}`), '', 'Services: line per card');
const wanted = computeDecisions({ cv: { ...cv, jobs_wanted: ['tree removal'] }, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null }).decisions;
const tree = wanted.d9.main.find(c => c.name === 'Tree Service');
chk('9: a jobs_wanted service comes first in its card', tree && tree.services[0] === 'tree removal', tree && tree.services.join(', '), 'tree removal first');
const req = buildV20Request({ cv, niche: landscaper, decisions: D, decisionsBlock: res.decisionsBlock, calibrationPack: null, ctx: {}, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
chk('9: the client block no longer lists every service by category', !/CONFIRMED SERVICES/.test(req.clientBlock) && !/stump grinding.*stump removal/.test(req.clientBlock), req.clientBlock.slice(0, 200), 'no full list');
const facts = C.factsFromRecord({ meta: { client_block: req.clientBlock, services_on_file: 'Tree Service: stump grinding, tree pruning', decisions_block: res.decisionsBlock } });
chk('9: the claims review still gets the full service list', /CONFIRMED SERVICES \(by category\):\nTree Service: stump grinding/.test(facts.clientBlock), facts.clientBlock.slice(-80), 'services on file');

// 2. More than 3 services in a card is a BLOCK
const liveDeck = 'Decking adds usable outdoor space to gardens where a patio is not the right fit. Our [deck builder](/deck-builder/) team installs timber and composite decks, handles deck design, deck repair, fencing, pergolas and covered patios. We also carry out deck cleaning and restoration for existing structures that need bringing back into shape.';
const cc = checks(withCard('Deck Builder', liveDeck), 'CARD-COUNT');
chk('2: the live Deck Builder card (6 services) is a BLOCK', cc.length === 1 && cc[0].type === 'BLOCK', cc.map(i => `${i.type} ${i.message}`).join(' | '), 'BLOCK');
const pick = checks(withCard('Deck Builder', liveDeck), 'CARD-PICK');
chk('9: the live Deck Builder card naming fencing is flagged CARD-PICK', pick.length === 1 && /fencing/.test(pick[0].message), pick.map(i => i.message).join(' | '), 'fencing');

// 5. A category is never a job title
const team = checks(withCard('Deck Builder', liveDeck), 'CAT-TEAM');
chk('5: "our deck builder team" is a BLOCK', team.length === 1 && team[0].type === 'BLOCK', team.map(i => i.message).join(' | '), 'BLOCK');
chk('5: "our deck builder work" passes', checks(withCard('Deck Builder', 'Our [deck builder](/deck-builder/) work adds outdoor space.'), 'CAT-TEAM').length === 0, '', 'none');

// 3. Fixed price three times at most, never in a step
const step2 = 'We agree a price before any work starts. That figure is fixed and appears on your final invoice exactly as quoted, with nothing added once we begin.';
const pf = checks(page({ steps: D.niche_steps.map((s, i) => ({ step_title: s.title, step_body: i === 1 ? step2 : 'A short body for this step that is long enough to count here.' })) }), 'PROOF-FIXED');
chk('3: the live step 2 repeating the fixed price is a BLOCK', pf.length === 1 && pf[0].type === 'BLOCK' && /step/.test(pf[0].message), pf.map(i => i.message).join(' | '), 'BLOCK');
const fcta = checks(page({ home_final_cta_body: "We'll go through exactly what your garden needs and have a fixed price ready before any work is scheduled." }), 'PROOF-FIXED');
chk('3: meta, hero and the Fixed Prices point make three; the live final CTA is a fourth (BLOCK)', fcta.length === 1 && /home_final_cta_body/.test(fcta[0].field) && /meta description/.test(fcta[0].message), fcta.map(i => `${i.field}: ${i.message}`).join(' | '), 'final CTA blocked');
chk('3: meta, hero and the Why point alone pass', checks(page(), 'PROOF-FIXED').length === 0, JSON.stringify(checks(page(), 'PROOF-FIXED')), 'none');

// 4. A phrase in more than two fields
const rp = checks(page({
  home_services_intro: "Whether you need a single project or regular visits, we'll tell you exactly what's involved before any work begins.",
  cards: D.d9.main.map((c, i) => ({ card_name: c.name, card_url: c.url, card_text: i === 4 ? 'We assess the trees properly before any work begins to make sure the right approach is taken.' : `Some text about ${c.name.toLowerCase()} work.` })),
  faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === 3 ? "Once the price is agreed, we'll confirm a start date before work starts." : 'An answer that is long enough to count.' })),
}), 'REPEAT-PAGE').filter(i => /before work begins/.test(i.message));
chk('4: "before any work begins" in three fields (one as "before work starts") is flagged once', rp.length === 1 && /before work begins/.test(rp[0].message), rp.map(i => `${i.field}: ${i.message}`).join(' | '), '1 FLAG');

// 6. The areas FAQ never opens "Yes"
const areasIdx = D.d11_faq.findIndex(q => /which areas/i.test(q.question));
const yes = checks(page({ faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === areasIdx ? 'Yes, we cover Southampton and the towns and villages within 20 miles, inland and along the coast.' : 'An answer that is long enough to count.' })) }), 'FAQ-YES');
chk('6: the live areas answer opening "Yes" is a BLOCK', yes.length === 1 && yes[0].type === 'BLOCK', yes.map(i => i.message).join(' | '), 'BLOCK');
const yesOk = checks(page({ faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: /insured/i.test(q.question) ? 'Yes, we are insured up to £5m.' : 'An answer that is long enough to count.' })) }), 'FAQ-YES');
chk('6: "Yes" to "Are you insured?" is fine', yesOk.length === 0, JSON.stringify(yesOk), 'none');

// 7. Practice claims
const prac = validateV20(page({ points: D.d10_why.map((p, i) => ({ point_title: p.title, point_body: i === D.d10_why.length - 1 ? "We're a small, independent team and every job gets our full attention throughout. When you call, you speak to someone who knows your garden. We don't hand jobs off or disappear once the work is agreed." : 'A body for this point that is long enough to count.' })) }), V).filter(i => i.check === 'PRACTICE');
chk('7: the live Family Run point: "full attention", "someone who knows your garden" and "hand jobs off" are all BLOCKs', prac.length >= 2 && prac.every(i => i.type === 'BLOCK') && prac.some(i => /full attention/.test(i.message) && /someone who knows your/.test(i.message)) && prac.some(i => /hand jobs off/.test(i.message)), prac.map(i => i.message).join(' | '), '3 BLOCKs');

// 8. Content block paragraphs of 4 sentences at most
const liveP1 = "Bassett Heath gives a good example. Detached houses along Saxholm Way and Pinehurst Road sit on generous plots with long, tree rich gardens. Root spread and mature planting carry as much weight in the planning as any new layout. Portswood's conservation area is a different challenge. The early twentieth century gardens around Brookvale Road were built to generous frontages. Knowing that before a spade goes in avoids surprises.";
const para = checks(page({ home_content_block_body: `Gardens across Southampton vary more than most people expect.\n\n${liveP1}\n\nWe cover Romsey and everywhere in between.` }), 'CB-PARA');
chk('8: a 6 sentence content block paragraph is a BLOCK naming paragraph 2', para.length === 1 && para[0].type === 'BLOCK' && /Paragraph 2 has 6/.test(para[0].message), para.map(i => i.message).join(' | '), 'BLOCK');

// Prompts say it
const core = require('fs').readFileSync(path.join(root, 'prompts/Homepage_Copywriting_Prompt_CORE (20).md'), 'utf8');
chk('CORE (20) carries the round 2 rules', /Each paragraph is 4 sentences at most/.test(core) && /naming the services DECISIONS lists for this card/.test(core) && /counting the meta description/.test(core) && /Never follow a category name with "team"/.test(core) && /never "Yes"/.test(core) && !/our \[paving contractor\]\(\/paving-contractor\/\) team"/.test(core), '', 'all rules');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
