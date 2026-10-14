'use strict';
// Fixture: rules added after the live Edens Edge homepage of 15 Oct 2026.
// - RIVALS (BLOCK): the client's own site never sends readers to other businesses
//   (the live Q7 answer ended "Get two or three quotes for the same job description").
// - The claims review: findings the reviewer withdraws in its own reason are dropped
//   (two live findings ended "Withdrawing this finding."), and the coastal line is sent
//   as a code decision.
const path = require('path');
const root = path.join(__dirname, '../..');
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const C = require(path.join(root, 'wp/claims-review.js'));
const S = require(path.join(root, 'faq-sort.js'));
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy rules from the live Edens Edge page ===\n');

const cv = { ...E.ethanValues(), map_embed: 'x' };
const result = computeDecisions({ cv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null });
const D = result.decisions;
const V = buildValidationContext({ cv, niche: landscaper, decisions: D, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
const rivalsIn = text => validateV20({ faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === 6 ? text : 'An answer that is long enough to count.' })) }, V)
  .filter(i => i.check === 'RIVALS').map(i => i.message);

const live = 'A reasonable quote reflects the actual scope of the job. Materials and groundwork are the two things that vary most. When quotes differ, check what each one includes for base preparation. Get two or three quotes for the same job description so you are comparing like for like.';
chk('RIVALS: the live Q7 line is a BLOCK', rivalsIn(live).length === 1 && /Get two or three quotes/.test(rivalsIn(live)[0]), rivalsIn(live).join(' | '), 'BLOCK on "Get two or three quotes"');
for (const t of ['It is worth getting several quotes before you decide.', 'Shop around before you choose.', 'Compare quotes from local landscapers.', 'Ask other firms what they would charge.']) {
  chk(`RIVALS catches: "${t}"`, rivalsIn(t).length === 1, rivalsIn(t).join(' | '), 'BLOCK');
}
for (const t of ['Check what the quote includes for base preparation.', 'We give a fixed quote before anything starts.', 'Our quotes are free.']) {
  chk(`RIVALS leaves alone: "${t}"`, rivalsIn(t).length === 0, rivalsIn(t).join(' | '), 'nothing');
}
chk('The brief for a general FAQ answer says never send readers to other businesses', /never tell the reader to get other quotes, compare firms or shop around/.test(S.answerBrief({ fact: '' }, {})), S.answerBrief({ fact: '' }, {}), 'rule present');

// Claims review: withdrawn findings are dropped (the live reason, word for word)
const saved = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
const hero = saved.home_hero_intro;
const quote = hero.split(/(?<=[.!?])s+/)[0];
const reply = JSON.stringify({ findings: [
  { field: 'home_hero_intro', quote, why: "Adds a qualifier, narrowing the confirmed fact; however this is a style/brief compliance issue rather than an unsupported factual claim about the business. Withdrawing this finding." },
  { field: 'home_hero_intro', quote, why: 'Claims something that is not on file.' },
] });
const kept = C.parseFindings(reply, saved).findings;
chk('Claims: a finding withdrawn in its own reason is dropped; a real one is kept', kept.length === 1 && /not on file/.test(kept[0].why), JSON.stringify(kept), '1 finding (the real one)');
const facts = C.factsFromRecord({ meta: { decisions_block: result.decisionsBlock.replace(/Primary city coastal: no/, 'Primary city coastal: yes. Write the travel distance as "inland and along the coast", never compass directions or "in each direction"') } });
chk('Claims: the coastal line is sent as a code decision', /Primary city coastal: yes\. Write the travel distance as "inland and along the coast"/.test(facts.decisions), facts.decisions.slice(-160), 'coastal line');
chk('Claims prompt is CORE (3) and says a step body that follows its title is supported', /CORE \(3\)/.test(require('fs').readFileSync(path.join(root, 'prompts/Claims_Review_CORE.md'), 'utf8')) && /A step body that says what its step title says/.test(C.loadClaimsPrompt()), '', 'CORE (3)');

// ── Second Edens Edge review (15 Oct) ──
// The live hand-edited page (with one field changed per check), validated with today's rules
const coastalCv = { ...cv, coastal_city: 'yes', phone: '07850 412717', team_size: '4' };
const coastalRes = computeDecisions({ cv: coastalCv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null });
const CD = coastalRes.decisions;
const CV2 = buildValidationContext({ cv: coastalCv, niche: landscaper, decisions: CD, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
const page = extra => ({
  steps: CD.niche_steps.map((s, i) => ({ step_title: s.title, step_body: i === 1 ? 'A price is agreed before any work starts, so you know where you stand before anything is booked in.' : 'A short body for this step that is long enough to count here.' })),
  cards: CD.d9.main.map(c => ({ card_name: c.name, card_url: c.url, card_text: `Some text about ${c.name.toLowerCase()} work.` })),
  home_services_more_line: 'HIDDEN',
  home_areas_intro: 'We are based in Southampton and travel up to 20 miles inland and along the coast, covering Romsey, Winchester and Eastleigh.',
  home_final_cta_body: 'We will look at what you need and come back to you with a clear next step.',
  faq_items: CD.d11_faq.map(q => ({ faq_question: q.question, faq_answer: 'An answer that is long enough to count.' })),
  ...extra,
});
const checks = (rec, code) => validateV20(rec, CV2).filter(i => i.check === code);
chk('Step 2 without a visit or quote method is the neutral "We Price Your Job"', CD.niche_steps[1].title === 'We Price Your Job' && /name no method at all/.test(CD.niche_steps[1].brief) && !/from the photos|or a short call/i.test(CD.niche_steps[1].brief), CD.niche_steps[1].title, 'We Price Your Job');
chk('QUOTE-METHOD: a neutral step 2 that prices "from your photos" is a BLOCK', (() => { const r = page(); r.steps[1].step_body = 'Send us photos and a rough sense of what you need, and we will price the job from those.'; return checks(r, 'QUOTE-METHOD').some(i => i.type === 'BLOCK'); })(), '', 'BLOCK');
chk('QUOTE-METHOD: a step 2 that names no method passes', checks(page(), 'QUOTE-METHOD').length === 0, JSON.stringify(checks(page(), 'QUOTE-METHOD')), 'none');
const n11 = validateV20(page({ faq_items: CD.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === 1 ? "Yes. We carry public liability insurance with cover up to £5m. It is what pays out if the work causes damage to someone else's property." : 'An answer that is long enough to count.' })) }), CV2).filter(i => i.check === 'N11');
chk('N11: insurance that "pays out" is a BLOCK (the live hand edit)', n11.some(i => i.type === 'BLOCK' && /pays out/.test(i.message)), n11.map(i => i.message).join(' | '), 'BLOCK');
const dir = checks(page({ home_areas_intro: 'We cover the towns to the north and west, out toward the New Forest, and east toward Eastleigh.' }), 'COAST-DIR');
chk('COAST-DIR: compass directions in a coastal areas intro are a BLOCK (the live first draft)', dir.length === 1 && dir[0].type === 'BLOCK', dir.map(i => i.message).join(' | '), 'BLOCK');
chk('COAST-DIR: "Southampton" itself is not a direction', checks(page(), 'COAST-DIR').length === 0, JSON.stringify(checks(page(), 'COAST-DIR')), 'none');
const cta = checks(page({ home_final_cta_body: 'Call [CV: phone] today. We will get back to you.' }), 'FINAL-CTA');
chk('FINAL-CTA: the phone number is a BLOCK; two sentences a FLAG', cta.some(i => i.type === 'BLOCK') && cta.some(i => i.type === 'FLAG' && /one sentence/.test(i.message)), cta.map(i => `${i.type} ${i.message}`).join(' | '), 'BLOCK and FLAG');
chk('FINAL-CTA: one sentence with "we" passes', checks(page(), 'FINAL-CTA').length === 0, JSON.stringify(checks(page(), 'FINAL-CTA')), 'none');
const filler = checks(page({ cards: CD.d9.main.map(c => ({ card_name: c.name, card_url: c.url, card_text: `Our ${c.name.toLowerCase()} work for gardens across Southampton.` })) }), 'CARD-FILLER');
chk(`CARD-FILLER: "across Southampton" in all ${CD.d9.main.length} cards flags all but two`, filler.length === CD.d9.main.length - 2, filler.length, CD.d9.main.length - 2);
const more = checks(page({ cards: CD.d9.main.map((c, i) => ({ card_name: c.name, card_url: c.url, card_text: i === 0 ? 'Hedge trimming and mulching keep beds tidy.' : 'Some text.' })), home_services_more_line: 'We also offer hedge trimming and pond care.' }), 'MORE-REPEAT');
chk('MORE-REPEAT: "We also offer" naming a service a card names is flagged', more.length === 1 && /hedge trimming/.test(more[0].message), more.map(i => i.message).join(' | '), 'hedge trimming');

// Claims: required wording is approved whatever the reviewer says
const savedRec = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
const reqRec = { ...savedRec, home_areas_intro: 'We are based in Southampton and travel up to 20 miles inland and along the coast.', meta: { ...savedRec.meta, decisions_block: coastalRes.decisionsBlock } };
const reqReply = JSON.stringify({ findings: [
  { field: 'home_areas_intro', quote: 'travel up to 20 miles inland and along the coast', why: "Adds 'along the coast' as a direction of travel; CV confirms 20 miles travel distance but does not specify inland versus coastal direction." },
  { field: 'home_areas_intro', quote: 'We are based in Southampton', why: 'No base town on file.' },
] });
const reqKept = C.parseFindings(reqReply, reqRec).findings;
chk('Claims: "inland and along the coast" (required for a coastal city) is approved; other findings stay', reqKept.length === 1 && reqKept[0].quote === 'We are based in Southampton', JSON.stringify(reqKept), 'only the base town finding');

// Meta and area list
chk('Meta: a natural sentence, no "[keyword] from [company]" opener, only confirmed proofs', D.d4_meta === 'Edens Edge Landscaping is a landscaper in Southampton offering fixed prices with no hidden costs. Get your free quote today.' && !/ from Edens Edge/.test(D.d4_meta), D.d4_meta, 'Edens Edge Landscaping is a landscaper in Southampton offering …');
chk('Area list: New Forest District (a council area) is left out', !D.d12_areas.plain.concat(D.d12_areas.linked.map(a => a.name)).some(a => /New Forest/.test(a)), D.d12_areas.plain.join(', '), 'no New Forest');

// The prompt says it
const core = require('fs').readFileSync(path.join(root, 'prompts/Homepage_Copywriting_Prompt_CORE (20).md'), 'utf8');
chk('CORE (20): content block names categories only; cards describe; "We also offer" only what no card names; final CTA one plain sentence without the phone',
  /Name the categories only: never list individual services here/.test(core) && /naming only the items that no card has named/.test(core) && /with "we" or the customer as its subject/.test(core) && /Never the phone number/.test(core), '', 'all four rules');

// ── After the fresh Edens Edge run (15 Oct), live sentences word for word ──
const liveCb = 'We carry out [landscape gardener](/landscape-gardener) work covering garden makeovers, new lawns and retaining walls. Alongside that, our [landscape designer](/landscape-designer) projects handle drainage, patio design and build, and structural planting planned before anything goes in the ground. Our [gardener](/gardener) covers the ongoing side: regular mowing, weed control, mulching and hedge trimming.';
const cbIssues = checks(page({ home_content_block_body: `Gardens in Southampton vary a lot.\n\n${liveCb}\n\nWe cover Romsey and everywhere in between.` }), 'CB-SERVICES');
chk('CB-SERVICES: the live services paragraph that lists services is flagged', cbIssues.length === 1 && /mulching|hedge trimming|garden makeovers/.test(cbIssues[0].message), cbIssues.map(i => i.message).join(' | '), 'flagged');
const cbGood = checks(page({ home_content_block_body: 'Gardens in Southampton vary a lot.\n\nOur [landscape gardener](/landscape-gardener) work turns a tired garden into one you use, and our [gardener](/gardener) visits keep it that way.\n\nWe cover Romsey and everywhere in between.' }), 'CB-SERVICES');
chk('CB-SERVICES: category links with a reason each pass', cbGood.length === 0, JSON.stringify(cbGood), 'none');
const prac = validateV20(page({ steps: CD.niche_steps.map((s, i) => ({ step_title: s.title, step_body: i === 0 ? "Nothing gets handed off or forgotten, and we stay involved with every job until it's finished properly." : 'A short body for this step that is long enough to count here.' })) }), CV2).filter(i => i.check === 'PRACTICE');
chk('PRACTICE: "nothing gets handed off… we stay involved with every job" is caught (no confirmed practice)', prac.length >= 1 && prac.every(i => i.type === 'BLOCK'), prac.map(i => i.message).join(' | '), 'BLOCK');
const ins = validateV20(page({ faq_items: CD.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === 1 ? 'If something is accidentally damaged during a groundworks job, for example, the cover applies.' : 'An answer that is long enough to count.' })) }), CV2).filter(i => i.check === 'N11');
chk('N11: "the cover applies" is a BLOCK', ins.some(i => i.type === 'BLOCK'), ins.map(i => i.message).join(' | '), 'BLOCK');
const areaRec = page({ home_areas_links: [{ name: CD.d12_areas.primaryCity }, ...CD.d12_areas.linked.map(a => ({ name: a.name, url: a.url })), ...CD.d12_areas.plain.map(n => ({ name: n }))] });
chk('Check 9: the area list without New Forest District is not missing anything', checks(areaRec, '9').length === 0, checks(areaRec, '9').map(i => i.message).join(' | '), 'none');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
