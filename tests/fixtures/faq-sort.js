'use strict';
// Fixture: FAQ sorting step (F2). Replays the real tidy replies of 14 Oct 2026
// (tests/fixtures/faq-sort-replies/, from node tests/acceptance/faq-sort.js) through
// the code checks, then checks the assignment rules: one page per question, facts
// hold questions back until supplied, cost questions held for a Cost Guide page,
// a missing service page moves up to its category page or the question is dropped,
// hand moves and removals, saved pages keep their questions, re-tidy keeps approvals.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: FAQ sorting step ===\n');

async function replayTidy(c) {
  const research = R.parseFaqResearch(fs.readFileSync(c.researchFile, 'utf8'));
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies', `${c.id}.json`), 'utf8'));
  let i = 0;
  const tidy = await S.runTidy({ research, niche: c.niche, keyValueMap: c.keyValueMap, serviceParentMap: c.serviceParentMap, pages: c.pages, cv: c.cvThin, callModel: async () => saved.replies[i++] });
  return { research, tidy, calls: i };
}
const approveAll = qs => qs.map(q => ({ ...q, approved: !q.wording_errors.length }));
const ids = list => list.map(q => q.id).join(' ');

(async () => {
  const edens = C.byId['edens-edge'];
  const kestrel = C.byId['kestrel-ridge'];

  // ── Wording rules ──
  chk('Wording: a clean question passes', !S.checkWording('Do you take a deposit?').length, S.checkWording('Do you take a deposit?').join('; '), 'none');
  const bad = S.checkWording('What is included in the quote—materials, VAT, call-out and the sub-base exactly');
  chk('Wording: dash, hyphens, no question mark and "exactly" are caught',
    bad.some(e => /dash/.test(e)) && bad.some(e => /call-out/.test(e) && /sub-base/.test(e)) && bad.some(e => /question mark/.test(e)) && bad.some(e => /exactly/.test(e)), bad.join('; '), 'all four');
  chk('Wording: more than 14 words is caught', S.checkWording('Will you take on a small job like one slipped tile or a leaking gutter joint please?').some(e => /words/.test(e)), '', 'caught');
  chk('Wording: banned phrases are caught', S.checkWording('Do you offer bespoke garden design?').some(e => /bespoke/.test(e)), '', 'caught');

  // ── Code checks on a reply ──
  const research = R.parseFaqResearch(fs.readFileSync(edens.researchFile, 'utf8'));
  const ctx = { research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv: edens.cvThin };
  const checked = S.checkTidy({ questions: [
    { id: 'Q-4', fact: 'deposit_size', wording: 'How much deposit do you take?' },
    { id: 'Q-5', fact: 'extra_work_agreed_first', service: 'swimming pools', wording: 'How is extra work priced?' },
    { id: 'Q-37', town: 'Bournemouth', wording: 'Is my tree protected?' },
    { id: 'Q-2', covered_by: 'Q12', fact: 'free_inspection', wording: 'Do you charge for a first visit?' },
    { id: 'Q-6', duplicate_of: 'Q-6', fact: 'insurance_cover', wording: 'Are you insured?' },
    { id: 'Q-11', wording: 'What if bad weather stops the work?' },
  ] }, ctx);
  const errs = checked.errors.join('\n');
  chk('Checks: a fact key not in FACTS', /Q-4: fact "deposit_size" is not a key in FACTS/.test(errs), errs, 'Q-4 fact error');
  chk('Checks: a service not in the CLIENT block', /Q-5: service "swimming pools"/.test(errs), errs, 'Q-5 service error');
  chk('Checks: a town not in the CLIENT block', /Q-37: town "Bournemouth"/.test(errs), errs, 'Q-37 town error');
  chk('Checks: a covered_by slot that does not exist', /Q-2: covered_by Q12/.test(errs), errs, 'Q-2 slot error');
  chk('Checks: a duplicate of itself', /Q-6: duplicate_of points at itself/.test(errs), errs, 'Q-6 error');
  chk('Checks: "needs client fact: Y" without a fact', /Q-11: it needs a client fact/.test(errs), errs, 'Q-11 error');
  chk('Checks: every missing ID is listed', /Q-1 is missing/.test(errs) && /Q-40 is missing/.test(errs), '', 'Q-1 and Q-40 missing');

  // ── The client's own customers' questions ──
  const own = S.clientQuestionItems({ customer_questions: ['Will you take the old patio away?', 'Do I need to be in?'] });
  chk("Customers' questions become C-1, C-2, marked as the client's", own.map(q => q.id).join(' ') === 'C-1 C-2' && own.every(q => q.source === 'client' && !q.doubt && !q.page), JSON.stringify(own.map(q => [q.id, q.source])), 'C-1 C-2, client');
  const withOwn = { questions: [...own, ...research.questions] };
  const msg = S.buildSortMessage({ ...ctx, research: withOwn });
  chk("The tidy message lists them first, with ? for doubt and page, marked FROM THE CLIENT'S CUSTOMERS",
    /QUESTIONS:\n  C-1 \| Will you take the old patio away\? \| \? \| page: \? \| local: N \| needs client fact: \? \| FROM THE CLIENT'S CUSTOMERS/.test(msg), (msg.match(/QUESTIONS:\n.*/) || [''])[0], 'C-1 first');
  const ownChecked = S.checkTidy({ questions: [
    { id: 'C-1', doubt: 'Process', page: 'Homepage', fact: 'waste_removal', wording: 'Will you take the old patio away?' },
    { id: 'C-2', doubt: 'Worry', wording: 'Do I need to be in during the work?' },
  ] }, { ...ctx, research: withOwn });
  chk("Checks: a customer's question needs a valid doubt and page", /C-2: doubt "Worry" must be one of/.test(ownChecked.errors.join('\n')) && /C-2: page "" must be one of/.test(ownChecked.errors.join('\n')) && !/C-1: (doubt|page)/.test(ownChecked.errors.join('\n')),
    ownChecked.errors.filter(e => /^C-/.test(e)).join(' | '), 'C-2 doubt and page errors only');
  chk("Checks: a research question needs no doubt or page from the reply", !/Q-4: (doubt|page)/.test(ownChecked.errors.join('\n')), '', 'none');
  const ownTidy = await S.runTidy({ ...ctx, research: { questions: own.slice(0, 1) }, callModel: async () => JSON.stringify({ questions: [{ id: 'C-1', doubt: 'Process', page: 'Homepage', fact: 'waste_removal', wording: 'Will you take the old patio away?' }] }) });
  chk("Tidy: the customer's question takes the reply's doubt and page", ownTidy.questions[0].doubt === 'Process' && ownTidy.questions[0].page === 'Homepage', JSON.stringify([ownTidy.questions[0].doubt, ownTidy.questions[0].page]), 'Process, Homepage');

  // ── The real replies ──
  const E = await replayTidy(edens);
  const K = await replayTidy(kestrel);
  chk('Edens Edge: 2 calls (the first reply had 3 wording problems; the retry fixed them)',
    E.calls === 2 && E.tidy.attempts[0].errors.length === 3 && E.tidy.attempts[1].errors.length === 0, E.tidy.attempts.map(a => a.errors.length).join(', '), '3, 0');
  chk('Kestrel Ridge: 2 calls; the best answer per question is kept across them',
    K.calls === 2 && K.tidy.questions.every(q => !q.wording_errors.length), K.tidy.questions.filter(q => q.wording_errors.length).map(q => q.id).join(' '), 'no question left with wording errors');
  chk('Every question keeps its research text, doubt and page', E.tidy.questions.length === 40 && E.tidy.questions.every(q => q.text && q.doubt && q.page), '', '40 with text, doubt, page');
  chk('All rewritten wording passes the wording rules', [...E.tidy.questions, ...K.tidy.questions].every(q => !S.checkWording(q.wording).length), '', 'all clean');
  const eq = id => E.tidy.questions.find(q => q.id === id);
  chk('Edens Edge Q-6 (public liability) is covered by the homepage insurance question', eq('Q-6').covered_by === 'Q2', eq('Q-6').covered_by, 'Q2');
  chk('Edens Edge Q-4 needs deposit_terms', eq('Q-4').fact === 'deposit_terms', eq('Q-4').fact, 'deposit_terms');
  chk('Edens Edge Q-40 needs waste_carrier_registered', eq('Q-40').fact === 'waste_carrier_registered', eq('Q-40').fact, 'waste_carrier_registered');
  chk('Edens Edge Q-11, Q-12 and Q-5 need the new practices',
    eq('Q-11').fact === 'weather_delays_rebooked' && eq('Q-12').fact === 'property_protected' && eq('Q-5').fact === 'extra_work_agreed_first',
    [eq('Q-11').fact, eq('Q-12').fact, eq('Q-5').fact].join(', '), 'weather_delays_rebooked, property_protected, extra_work_agreed_first');
  chk('Edens Edge Q-7 (references) needs a fact Copybot does not collect', eq('Q-7').new_fact === 'references from past customers', eq('Q-7').new_fact, 'references from past customers');
  chk('Nothing is approved straight after the tidy step', [...E.tidy.questions, ...K.tidy.questions].every(q => !q.approved), '', 'none approved');

  // ── Assignment ──
  const assign = (c, qs, state, extra = {}) => S.assignQuestions({
    questions: qs, cv: state === 'thin' ? c.cvThin : c.cvRich,
    pages: state === 'thin' && c.thinPages ? c.thinPages : c.pages,
    keyValueMap: state === 'thin' && c.thinKeyValueMap ? c.thinKeyValueMap : c.keyValueMap,
    serviceParentMap: c.serviceParentMap, niche: c.niche, ...extra,
  });
  const eQs = approveAll(E.tidy.questions);
  const eThin = assign(edens, eQs, 'thin');
  const eRich = assign(edens, eQs, 'rich');
  const hpIds = a => ids((a.pages['homepage:homepage'] || { questions: [] }).questions);
  chk('Edens Edge homepage questions, in research order: Q-4 Q-11 Q-40 Q-5 Q-12 Q-37 Q-7', hpIds(eThin) === 'Q-4 Q-11 Q-40 Q-5 Q-12 Q-37 Q-7', hpIds(eThin), 'Q-4 Q-11 Q-40 Q-5 Q-12 Q-37 Q-7');
  chk('Q-37 (Location, Southampton) goes to the homepage, as the primary city', eThin.pages['homepage:homepage'].questions.some(q => q.id === 'Q-37' && /primary city/.test(q.route_note)), '', 'on the homepage');
  chk('Thin (Ethan): only Q-37 is usable; the others wait for their facts', ids(S.homepageQuestions(eThin, edens.niche).map(q => ({ id: q.research_id }))) === 'Q-37', ids(S.homepageQuestions(eThin, edens.niche).map(q => ({ id: q.research_id }))), 'Q-37');
  chk('Rich: the facts are supplied, so all but Q-7 are usable', ids(S.homepageQuestions(eRich, edens.niche).map(q => ({ id: q.research_id }))) === 'Q-4 Q-11 Q-40 Q-5 Q-12 Q-37',
    ids(S.homepageQuestions(eRich, edens.niche).map(q => ({ id: q.research_id }))), 'Q-4 Q-11 Q-40 Q-5 Q-12 Q-37');
  chk('Big cost questions are held for a Cost Guide page, even when Q1 covers cost', ids(eThin.held.costGuide) === 'Q-1 Q-16 Q-20 Q-28 Q-33', ids(eThin.held.costGuide), 'Q-1 Q-16 Q-20 Q-28 Q-33');
  chk('Covered questions are never placed', eThin.held.covered.length === 12 && !Object.values(eThin.pages).some(p => p.questions.some(q => q.covered_by)), eThin.held.covered.length, 12);
  chk('Service questions go to the service page (Q-30 fencing → Fencing installation)',
    (eThin.pages['service:/services/fencing-installation'] || { questions: [] }).questions.some(q => q.id === 'Q-30'), '', 'on /services/fencing-installation');
  chk('Category questions go to the category page (Q-21 driveways → Landscape Gardener)',
    (eThin.pages['category:/landscape-gardener'] || { questions: [] }).questions.some(q => q.id === 'Q-21'), '', 'on /landscape-gardener');
  const allPlaced = Object.values(eThin.pages).flatMap(p => p.questions.map(q => q.id));
  chk('No question on two pages', allPlaced.length === new Set(allPlaced).size, allPlaced.length, 'unique');
  chk('Site check finds no repeated wording', !S.siteRepeats(Object.fromEntries(Object.values(eThin.pages).map(p => [p.id, p.questions]))).length, '', 'none');
  chk('Site check catches the same wording on two pages', S.siteRepeats({ a: ['Do you take a deposit?'], b: ['Do you take a deposit?'] }).length === 1, '', '1 repeat');
  const waitLabels = eThin.waitingByFact.map(w => w.label);
  chk('Waiting list (the onboarding list) names the new client values and practices',
    ['Deposit and stage payments', 'Registered waste carrier', 'Extra work is priced and agreed before it is done', 'Weather delays: the customer is told and the work is rebooked', 'The house, drive and access are protected during the work'].every(l => waitLabels.includes(l)),
    waitLabels.join('; '), 'deposit, waste carrier, the three practices');
  const dep = eThin.waitingByFact.find(w => w.fact === 'deposit_terms');
  chk('Each waiting fact carries its onboarding question', dep && /Do you take a deposit\?/.test(dep.question), dep && dep.question, 'Do you take a deposit? …');
  chk('A fact Copybot does not collect is marked so', eThin.waitingByFact.some(w => w.label === 'references from past customers' && w.kind === 'not collected yet'), '', 'references: not collected yet');
  chk('Rich: the new facts no longer wait', !eRich.waitingByFact.some(w => ['deposit_terms', 'waste_carrier_registered', 'weather_delays_rebooked'].includes(w.fact)), eRich.waitingByFact.map(w => w.label).join('; '), 'no deposit, waste carrier or weather');

  // The customers' own questions come first, ahead of the research
  const c1 = { ...ownTidy.questions[0], approved: true };
  const firstA = S.assignQuestions({ questions: [...eQs, c1], cv: { ...edens.cvRich, confirmed_practices: [...edens.cvRich.confirmed_practices, 'waste_removal'] }, pages: edens.pages,
    keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  chk("A customer's question goes first on its page, ahead of the research", hpIds(firstA).startsWith('C-1 Q-4'), hpIds(firstA), 'C-1 Q-4 …');
  chk("…and first to the homepage FAQ", S.homepageQuestions(firstA, edens.niche)[0].research_id === 'C-1', S.homepageQuestions(firstA, edens.niche)[0].research_id, 'C-1');

  // Unapproved questions are placed but not usable
  const eUnapproved = assign(edens, E.tidy.questions, 'rich');
  chk('Without approval nothing reaches the homepage', S.homepageQuestions(eUnapproved, edens.niche).length === 0, S.homepageQuestions(eUnapproved, edens.niche).length, 0);

  // Kestrel Ridge: a missing service page moves up to its category page, or the question is dropped
  const kQs = approveAll(K.tidy.questions);
  const kRich = assign(kestrel, kQs, 'rich');
  const kThin = assign(kestrel, kQs, 'thin');
  chk('Kestrel rich: service questions on their service pages (Q-28 → Flat Roofing)', (kRich.pages['service:/services/flat-roofing'] || { questions: [] }).questions.some(q => q.id === 'Q-28'), '', 'on Flat Roofing');
  chk('Kestrel rich: a service question for a category with a page (Q-35 gutters → Gutter Cleaning Service)', (kRich.pages['category:/gutter-cleaning-service'] || { questions: [] }).questions.some(q => q.id === 'Q-35'), '', 'on Gutter Cleaning Service');
  chk('Kestrel thin: no Roof Replacement page and no category page, so Q-17 is dropped with the reason',
    kThin.held.noPage.some(q => q.id === 'Q-17' && /no page for new roofs or its category/.test(q.held_reason)), (kThin.held.noPage.find(q => q.id === 'Q-17') || {}).held_reason, 'no page for new roofs or its category');
  // Edens Edge without its two fencing service pages: fencing sits under Gardener and Deck builder
  const noFencePages = edens.pages.filter(p => !['Fencing installation', 'Fence building'].includes(p.pageTitle));
  const moved = S.assignQuestions({ questions: eQs, cv: edens.cvRich, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche, pages: noFencePages });
  const q30 = (moved.pages['category:/gardener'] || { questions: [] }).questions.find(q => q.id === 'Q-30');
  chk('No fencing service page: Q-30 moves up to its category page (Gardener, the first that has one)', q30 && /moved up to its category page/.test(q30.route_note), q30 && q30.route_note, 'moved up');
  chk('Kestrel: Q-25 (salt air, Bournemouth) goes to the homepage', kRich.pages['homepage:homepage'].questions.some(q => q.id === 'Q-25'), '', 'on the homepage');

  // Hand moves and removals
  const hand = eQs.map(q => q.id === 'Q-37' ? { ...q, page_override: 'drop' } : q.id === 'Q-6' ? { ...q, page_override: 'location:/locations/romsey' } : q);
  const handA = assign(edens, hand, 'rich');
  chk('Removed by hand: Q-37 leaves the homepage', handA.held.dropped.some(q => q.id === 'Q-37') && !handA.pages['homepage:homepage'].questions.some(q => q.id === 'Q-37'), '', 'dropped');
  chk('Moved by hand: Q-6 (covered) goes where it was moved', (handA.pages['location:/locations/romsey'] || { questions: [] }).questions.some(q => q.id === 'Q-6'), '', 'on Romsey');

  // Saved pages keep their questions
  const pinned = assign(edens, eQs, 'rich', { pins: { [S.normWording(eQs.find(q => q.id === 'Q-25').wording)]: 'homepage:homepage' } });
  chk('A question on the saved homepage stays there and comes first', pinned.pages['homepage:homepage'].questions[0].id === 'Q-25' && pinned.pages['homepage:homepage'].questions[0].pinned, hpIds(pinned), 'Q-25 first');

  // Re-tidy keeps a person's work
  const before = eQs.map(q => q.id === 'Q-4' ? { ...q, wording: 'Do you take a deposit?', edited: true, approved: true } : q.id === 'Q-37' ? { ...q, page_override: 'drop' } : q);
  const after = S.carryOver(E.tidy.questions, before);
  const a4 = after.find(q => q.id === 'Q-4');
  chk('Re-tidy: a hand edit and its approval carry over', a4.wording === 'Do you take a deposit?' && a4.approved && a4.edited, JSON.stringify({ w: a4.wording, a: a4.approved }), 'kept');
  chk('Re-tidy: an approval carries over when the wording is the same', after.find(q => q.id === 'Q-11').approved, '', 'approved');
  chk('Re-tidy: a removal carries over', after.find(q => q.id === 'Q-37').page_override === 'drop', '', 'drop');

  // Answer briefs
  const facts = Object.fromEntries(S.factList(edens.niche).map(f => [f.key, f]));
  chk('Brief for a client value answers from its token only', S.answerBrief({ fact: 'deposit_terms' }, facts) === "Answer from [CV: deposit_terms] only, as it is given. Add no figures, terms or working practices it doesn't state.", S.answerBrief({ fact: 'deposit_terms' }, facts), 'deposit_terms token');
  chk('Brief for a practice states only its claim', /^Answer from this confirmed practice only: if the weather stops the work, the customer is told and the work is rebooked\./.test(S.answerBrief({ fact: 'weather_delays_rebooked' }, facts)), S.answerBrief({ fact: 'weather_delays_rebooked' }, facts), 'practice claim');
  chk('Brief with no fact is general, with no claims', /^A general answer/.test(S.answerBrief({ fact: '' }, facts)), '', 'general');
  chk('Facts: waste carrier only counts when yes', !S.factSupplied(facts.waste_carrier_registered, { waste_carrier_registered: 'no' }) && S.factSupplied(facts.waste_carrier_registered, { waste_carrier_registered: 'yes' }), '', 'no → not supplied');
  chk('Facts: a practice counts when ticked', S.factSupplied(facts.property_protected, { confirmed_practices: ['property_protected'] }) && !S.factSupplied(facts.property_protected, { confirmed_practices: [] }), '', 'ticked only');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
