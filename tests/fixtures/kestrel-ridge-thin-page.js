'use strict';
// Fixture: Kestrel Ridge Roofing (c) — thin page: no reviews, no logos, no owner
// section, under 5 years trading. Also covers link-only page types (Locations Hub,
// Cost Guide, About) and the quote-only Q5 when free_inspection is not confirmed.
const path = require('path');
const { computeDecisions } = require(path.join(__dirname, '../../decisions.js'));
const roofer = require(path.join(__dirname, '../../niche-library/roofer.json'));

const cv = {
  company_name: 'Kestrel Ridge Roofing',
  company_name_gbp_checked: true,
  phone: '01202 000000',
  email: '',
  address: '',
  gbp_address_type: 'service_area',
  hours: '',
  primary_category: 'Roofing contractor',
  year_founded: '2023',
  jobs_completed: '40',
  rating: '',
  review_count: '',
  guarantee_years: '',
  manufacturer_warranty: '',
  insurance_cover: '2m',
  differentiator_1: 'Photos of Every Fault Before We Quote',
  differentiator_1_confirmed: true,
  differentiator_1_sentence: 'We photograph every fault before we quote',
  differentiator_2: 'Family Run and Independent',
  differentiator_2_confirmed: false,
  differentiator_2_sentence: '',
  verified_logos: [],
  free_quotes: 'yes',
  free_inspection: '',
  quote_method: '',
  price_list: '',
  response_time: '',
  same_day_available: '',
  out_of_hours_available: '',
  start_time: '',
  owner_name: 'Sarah',
  owner_name_2: '',
  owner_qualification: '',
  owner_why: '',
  owner_promise: '',
  owner_pronoun: '',
  owner_photo: 'no',
  business_type: 'A',
  materials_methods: [],
  guarantee_scope: '',
  team_size: '',
  typical_jobs: [],
  emergency_primary: '',
  handles_planning: '',
  finance_options: '',
  complaints_process: '',
  area_wide: '',
  travel_distance: '10 miles',
  review_themes: [],
  jobs_wanted: [],
  map_embed: '',
  stand_ins: [],
  h1_override: '',
};

const pages = [
  { pageType: 'homepage',      pageTitle: 'Kestrel Ridge Roofing', urlSlug: '/',                        h1: 'Roofer Bournemouth',            status: 'live' },
  { pageType: 'service',       pageTitle: 'Roof Repair',           urlSlug: '/services/roof-repair',    h1: 'Roof Repair Bournemouth',       status: 'launching' },
  { pageType: 'service',       pageTitle: 'Flat Roofing',          urlSlug: '/services/flat-roofing',   h1: 'Flat Roofing Bournemouth',      status: 'launching' },
  { pageType: 'service',       pageTitle: 'Gutter Repair',         urlSlug: '',                         h1: '',                              status: 'not built' },
  { pageType: 'location',      pageTitle: 'Poole',                 urlSlug: '/locations/poole',         h1: 'Roofer Poole',                  status: 'launching' },
  { pageType: 'location',      pageTitle: 'Christchurch',          urlSlug: '',                         h1: '',                              status: 'not built' },
  { pageType: 'locations-hub', pageTitle: 'Areas We Cover',        urlSlug: '/locations',               h1: 'Areas We Cover',                status: 'live' },
  { pageType: 'cost-guide',    pageTitle: 'Roofing Costs',         urlSlug: '/roofing-costs',           h1: 'Roofing Costs in Bournemouth',  status: 'launching' },
  { pageType: 'about',         pageTitle: 'About Us',              urlSlug: '',                         h1: '',                              status: 'not built' },
];

const keyValueMap = {
  biz_area_1: 'Bournemouth', biz_area_2: 'Poole', biz_area_3: 'Christchurch',
};

const result = computeDecisions({
  cv, niche: roofer, pages, keyValueMap, v20TestMode: true, allocationData: null,
});

console.log('\n=== FIXTURE: Kestrel Ridge Thin Page ===\n');
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
const hasFlag = code => (result.flags || []).some(f => f.code === code);

chk('No gate failures', !result.gates || result.gates.length === 0,
  (result.gates || []).map(g => g.code).join(', '), 'none');

chk('Title has no modifier (under 5 years, no guarantee, no rating)',
  D.d3_title === 'Roofer Bournemouth | Kestrel Ridge Roofing', D.d3_title, 'Roofer Bournemouth | Kestrel Ridge Roofing');
chk('Meta proof = differentiator_1 sentence',
  D.d4_meta.includes('We photograph every fault before we quote.'), D.d4_meta, 'contains differentiator_1 sentence');

chk('Trust line = 40+ Jobs Completed', D.d5_trust === '40+ Jobs Completed', D.d5_trust, '40+ Jobs Completed');
chk('Rating line = none', D.d6_rating === null, D.d6_rating, 'null');

chk('Section 2 (logos) HIDDEN', D.d7.sec2 === 'HIDDEN', D.d7.sec2, 'HIDDEN');
chk('Section 6 (reviews) HIDDEN', D.d7.sec6 === 'HIDDEN', D.d7.sec6, 'HIDDEN');
chk('Section 9 (owner) HIDDEN', D.d7.sec9 === 'HIDDEN', D.d7.sec9, 'HIDDEN');
chk('Owner heading marked hidden', D.d8.owner === '(section hidden)', D.d8.owner, '(section hidden)');

chk('3 Why points: alt title, insurance, differentiator_1 (differentiator_2 unconfirmed)',
  D.d10_why.map(p => p.title).join(' / ') === 'Local Experience Behind Every Job / Insured up to £2m / Photos of Every Fault Before We Quote',
  D.d10_why.map(p => p.title).join(' / '), 'Local Experience Behind Every Job / Insured up to £2m / Photos of Every Fault Before We Quote');

chk('F-THIN, F-REVIEWS flags present', hasFlag('F-THIN') && hasFlag('F-REVIEWS'),
  (result.flags || []).map(f => f.code).join(', '), 'F-THIN, F-REVIEWS');
chk('No F-LOGOS (logos list saved, just empty)', !hasFlag('F-LOGOS'), 'F-LOGOS', 'absent');

const q5 = D.d11_faq.find(q => q.slot === 'Q5');
chk('Q5 = quote only (free_inspection not confirmed)',
  q5 && q5.question === 'Is the quote free and no obligation?', q5 && q5.question, 'Is the quote free and no obligation?');

const questions = D.d11_faq.map(q => q.question);
chk('No question appears twice', new Set(questions).size === questions.length, questions.join(' | '), 'all unique');

chk('Cards: 3 services, unbuilt one unlinked',
  D.d9.main.length === 3 && D.d9.main[2].name === 'Gutter Repair' && D.d9.main[2].linked === false,
  D.d9.main.map(c => `${c.name}${c.linked ? '' : ' (unlinked)'}`).join(', '), 'Roof Repair, Flat Roofing, Gutter Repair (unlinked)');

const linkUrls = D.linkablePages.map(p => p.url);
chk('LINKABLE PAGES includes Locations Hub and Cost Guide',
  linkUrls.includes('/locations') && linkUrls.includes('/roofing-costs'), linkUrls.join(', '), 'includes /locations and /roofing-costs');
chk('LINKABLE PAGES excludes unbuilt About page and homepage',
  !D.linkablePages.some(p => p.type === 'about') && !linkUrls.includes('/'), linkUrls.join(', '), 'no about, no /');

const mf = result.decisionsBlock.slice(result.decisionsBlock.indexOf('MODEL FIELDS:'));
chk('MODEL FIELDS marks owner body HIDDEN', /home_owner_body \(HIDDEN\)/.test(mf), 'see block', 'home_owner_body (HIDDEN)');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
