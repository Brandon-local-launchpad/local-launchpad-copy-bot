'use strict';
// Fixture: copy quality 7 (5 Nov 2026). The claims checker's facts, the locksmith card, the Why titles that claim
// experience, the cost intro. The verdict and the targeted round's list are in copy-quality-5.js. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { buildClientValues } = require(path.join(root, 'v20-generate.js'));
const { whyAltTitle } = require(path.join(root, 'decisions.js'));
const IH = require(path.join(root, 'idea-homes.js'));
const { CLIENTS } = require(path.join(root, 'tests/fixtures/data/realistic-clients.js'));
const locksmith = require(path.join(root, 'niche-library/locksmith.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 7 ===\n');

// ── The checker's facts ──
for (const key of ['locksmith-full', 'cleaning-full']) {
  const block = buildClientValues({ ...CLIENTS[key].cv, company_name: 'x' }, 10);
  for (const k of ['guarantee_scope', 'if_not_happy', 'complaints_process', 'materials_methods', 'quote_method', 'quote_includes', 'response_time', 'hours', 'areas_worked', 'typical_jobs']) {
    chk(key + ': the client block the checker reads holds ' + k, block.includes('[CV: ' + k + '] = '), block.slice(0, 200), k);
  }
}
chk('typical_jobs: job rows and a typed sentence both reach the checker', buildClientValues({ typical_jobs: [{ job: 'a lockout' }] }, 1).includes('a lockout') && buildClientValues({ typical_jobs: 'lockouts and lock changes' }, 1).includes('lockouts and lock changes'), '', 'both');
const prompt = fs.readFileSync(path.join(root, 'prompts/Claims_Review_CORE.md'), 'utf8');
chk('Claims prompt: reads every value before listing, and names the onboarding fields', prompt.includes('CORE (8)') && prompt.includes('Read every value before you list') && ['if_not_happy', 'typical_jobs', 'areas_worked', 'out_of_hours_available', 'quote_includes', 'materials_methods'].every(k => prompt.includes('[CV: ' + k + ']')), '', 'the rule');
chk('Claims prompt: a word beyond the value is still a finding', prompt.includes('Only a word that goes beyond the value is a finding'), '', 'kept');

// ── "Proving it's your door" ──
const card = locksmith.service_page_blocks.A.emergency.problems.cards[3];
chk('The card is about what to have ready and why the check protects the customer', card.title === "Proving it's your door" && card.brief.startsWith('What to have to hand') && card.brief.includes('protects the customer'), card.brief.slice(0, 120), 'that');
chk('The card briefs no refusals and no legal cases', !/Table C enforcement|landlord asking|the two cases|says no to/i.test(card.brief) && card.brief.includes('No refusals and no legal cases'), card.brief, 'none');
const md = fs.readFileSync(path.join(root, 'niche-library/Niche_Library_Locksmith.md'), 'utf8');
chk('The card reads the same in the .md', md.includes(card.brief) && !md.includes('the two cases the trade says no to'), '', 'mirrored');

// ── Why titles ──
const plain = 'Our Track Record';
const facts = { year_founded: '2014', jobs_completed: '3200' };
chk('Why title: "Local Experience on Every Kind of Door" is out, even with years and jobs on file', whyAltTitle('Local Experience on Every Kind of Door', locksmith, facts) === plain, whyAltTitle('Local Experience on Every Kind of Door', locksmith, facts), plain);
chk('Why title: "Local Experience Behind Every Job" is out too', whyAltTitle('Local Experience Behind Every Job', locksmith, facts) === plain, '', plain);
chk('Why title: an experience title with no "every" stands on a years or jobs figure, and not without one', whyAltTitle('Years of Local Tiling Behind Us', {}, facts) === 'Years of Local Tiling Behind Us' && whyAltTitle('Years of Local Tiling Behind Us', {}, {}) === plain, '', 'gated');
chk('Why title: a title that claims no experience is left alone', whyAltTitle('Covered If Something Goes Wrong', {}, {}) === 'Covered If Something Goes Wrong', '', 'kept');

// ── The cost intro ──
chk('Cost intro: the note opens on the factor that moves the price most', IH.ideaNote('costIntro') .startsWith('open on the factor that moves the price most'), IH.ideaNote('costIntro'), 'that');
const all = [fs.readFileSync(path.join(root, 'idea-homes.js'), 'utf8'), ...['Category_Page_Copywriting_Prompt_CORE (16).md', 'Service_Page_Copywriting_Prompt_CORE (17).md', 'Location_Page_Copywriting_Prompt_CORE (18).md'].map(f => fs.readFileSync(path.join(root, 'prompts', f), 'utf8'))];
chk('Cost intro: the old wording is gone from the notes and the three prompts', all.every(t => !/why prices vary|why the price/i.test(t)), '', 'gone');
chk('Cost intro: the three prompts open on the factor', all.slice(1).every(t => t.includes('Open on the factor that moves the price most')), '', 'all three');

console.log('\n=== copy quality 7: ' + pass + ' passed, ' + fail + ' failed ===\n');
if (fail) process.exitCode = 1;
