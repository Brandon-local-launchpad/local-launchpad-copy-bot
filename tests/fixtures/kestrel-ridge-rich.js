'use strict';
// Fixture: Kestrel Ridge Roofing (a) — rich version from paper test
const path = require('path');
const { computeDecisions } = require(path.join(__dirname, '../../decisions.js'));
const roofer = require(path.join(__dirname, '../../niche-library/roofer.json'));

const { cv, pages, keyValueMap } = require(path.join(__dirname, 'data/kestrel-ridge-rich.js'));

const result = computeDecisions({
  cv, niche: roofer, pages, keyValueMap, v20TestMode: true, allocationData: null,
});

console.log('\n=== FIXTURE: Kestrel Ridge Rich ===\n');
if (result.gates && result.gates.length) {
  console.log('GATE FAILURES:');
  result.gates.forEach(g => console.log('  ' + g.code + ': ' + g.msg));
}
if (result.flags && result.flags.length) {
  console.log('FLAGS: ' + result.flags.map(f => f.code).join(', '));
}
if (!result.decisionsBlock) { console.log('No decisions block.'); process.exit(1); }
console.log('\n' + result.decisionsBlock);

console.log('\n=== CHECKS ===\n');
const D = result.decisions;
let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};

chk('H1 from page map (no override)',
  D.d2_h1 === 'Roofer Bournemouth', D.d2_h1, 'Roofer Bournemouth');

chk('SEO title = Roofer Bournemouth | Kestrel Ridge Roofing',
  D.d3_title === 'Roofer Bournemouth | Kestrel Ridge Roofing',
  D.d3_title, 'Roofer Bournemouth | Kestrel Ridge Roofing');

chk('Cards[0] = Emergency Roof Repair (priority)',
  D.d9.main[0] && D.d9.main[0].name === 'Emergency Roof Repair',
  D.d9.main[0] && D.d9.main[0].name, 'Emergency Roof Repair');

chk('Cards[1] = Roof Repair (priority)',
  D.d9.main[1] && D.d9.main[1].name === 'Roof Repair',
  D.d9.main[1] && D.d9.main[1].name, 'Roof Repair');

// Cards sorted: Emergency Roof Repair(priority), Roof Repair(priority), then linkable pages in order:
// Chimney Services, Gutter Cleaning Service, Waterproofing Service, Roof Replacement,
// Flat Roofing, Leadwork = 8 cards. Slot 9 onwards: Skylight Contractor (category, not built),
// Fascias and Soffits (service). alsoOffer = overflow category pages + overflow services (capped 6).
const alsoOffer = D.d9.alsoOffer || [];
chk('Skylight Contractor in alsoOffer (overflow category page)',
  alsoOffer.includes('Skylight Contractor'),
  alsoOffer.join(', '), 'includes Skylight Contractor');

chk('Fascias and Soffits in alsoOffer (overflow service)',
  alsoOffer.includes('Fascias and Soffits'),
  alsoOffer.join(', '), 'includes Fascias and Soffits');

chk('Trust line = Established in 2009',
  D.d5_trust === 'Established in 2009', D.d5_trust, 'Established in 2009');

chk('Rating line present',
  D.d6_rating === '★★★★★ 4.8 from 112+ Google Reviews',
  D.d6_rating, '★★★★★ 4.8 from 112+ Google Reviews');

chk('9 FAQ questions', D.d11_faq.length === 9, D.d11_faq.length, 9);

const q5 = D.d11_faq.find(q => q.slot === 'Q5');
chk('Q5 = inspection and quote (free_inspection confirmed yes)',
  q5 && q5.question === 'Are the inspection and quote free?' && /inspection and the quote are both free/.test(q5.answer_brief),
  q5 && `${q5.question} → ${q5.answer_brief}`, 'Are the inspection and quote free? → inspection and quote both free');

chk('Why P4 = first approved review theme',
  D.d10_why[3] && D.d10_why[3].title === 'On Site When We Say We\'ll Be',
  D.d10_why[3] && D.d10_why[3].title, 'On Site When We Say We\'ll Be');

chk('Why points have fear attached',
  D.d10_why.every(p => p.fear !== undefined),
  'some missing fear', 'all have fear');

chk('Section 2 SHOWN', D.d7.sec2 === 'SHOWN', D.d7.sec2, 'SHOWN');

chk('Final CTA H2 title-cases [CATEGORY]',
  D.d8.final_cta.includes('Roofing Contractor'),
  D.d8.final_cta, 'includes Roofing Contractor');

chk('CTA band is lowercase trade_person',
  D.d8.cta_band === 'Ready to talk to a local roofer?',
  D.d8.cta_band, 'Ready to talk to a local roofer?');

chk('D14 town is not Bournemouth (primary city)',
  D.d14_town && D.d14_town.name !== 'Bournemouth',
  D.d14_town && D.d14_town.name, 'not Bournemouth');

chk('No gate failures', !result.gates || result.gates.length === 0,
  (result.gates||[]).map(g=>g.code).join(', '), 'none');

chk('F-ALLOC flag present', (result.flags||[]).some(f => f.code === 'F-ALLOC'), 'none', 'F-ALLOC');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
