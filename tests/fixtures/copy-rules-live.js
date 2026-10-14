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

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
