'use strict';
// Fixture: Kestrel Ridge Roofing (b) — thin FAQ inputs only (page sections are rich; see kestrel-ridge-thin-page.js): insurance_cover, guarantee_years, start_time blank; business_type B
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
  hours: 'Mon to Fri 8am to 5pm, Sat 8am to 12pm',
  primary_category: 'Roofing contractor',
  year_founded: '2009',
  jobs_completed: '1200',
  rating: '4.8',
  review_count: '112',
  guarantee_years: '',
  manufacturer_warranty: '',
  insurance_cover: '',
  differentiator_1: 'Photos of Every Fault Before We Quote',
  differentiator_1_confirmed: true,
  differentiator_1_sentence: 'We photograph every fault before we quote',
  differentiator_2: 'Family Run and Independent',
  differentiator_2_confirmed: true,
  differentiator_2_sentence: '',
  verified_logos: [
    { name: 'Google', tier: 'ratings' },
    { name: 'NFRC', tier: 'tier1' },
    { name: 'TrustMark', tier: 'tier1' },
  ],
  free_quotes: 'yes',
  quote_method: '',
  price_list: '',
  response_time: 'one working day',
  same_day_available: '',
  out_of_hours_available: '',
  start_time: '',
  owner_name: 'Sarah',
  owner_name_2: '',
  owner_qualification: 'NVQ Level 3 in roof slating and tiling',
  owner_why: 'took over her dad\'s round in 2009',
  owner_promise: 'never recommend replacing anything that can honestly be repaired',
  owner_pronoun: 'she',
  owner_photo: 'yes',
  business_type: 'B',
  materials_methods: ['natural slate', 'clay tile', 'concrete tile', 'breathable membrane'],
  guarantee_scope: '',
  team_size: '6',
  typical_jobs: [],
  emergency_primary: '',
  handles_planning: 'yes',
  finance_options: '',
  complaints_process: '',
  area_wide: 'South East Dorset',
  travel_distance: '15 miles',
  review_themes: [
    { theme: 'On Site When We Say We\'ll Be', approved: true },
    { theme: 'Left No Mess', approved: true },
  ],
  jobs_wanted: [],
  map_embed: '',
  stand_ins: [],
  h1_override: '',
};

const pages = [
  { pageType: 'homepage', pageTitle: 'Kestrel Ridge Roofing', urlSlug: '/', h1: 'Roofer Bournemouth', status: 'live' },
  { pageType: 'category', pageTitle: 'Chimney Services',        urlSlug: '/chimney-services',        h1: 'Chimney Services Bournemouth',       status: 'live' },
  { pageType: 'category', pageTitle: 'Gutter Cleaning Service', urlSlug: '/gutter-cleaning-service', h1: 'Gutter Cleaning Service Bournemouth', status: 'live' },
  { pageType: 'category', pageTitle: 'Waterproofing Service',   urlSlug: '/waterproofing-service',   h1: 'Waterproofing Service Bournemouth',   status: 'live' },
  { pageType: 'category', pageTitle: 'Skylight Contractor',     urlSlug: '',                          h1: '',                                    status: 'not built' },
  { pageType: 'service',  pageTitle: 'Roof Repair',             urlSlug: '/services/roof-repair',          h1: 'Roof Repair Bournemouth',            status: 'live' },
  { pageType: 'service',  pageTitle: 'Roof Replacement',        urlSlug: '/services/roof-replacement',     h1: 'Roof Replacement Bournemouth',       status: 'live' },
  { pageType: 'service',  pageTitle: 'Flat Roofing',            urlSlug: '/services/flat-roofing',         h1: 'Flat Roofing Bournemouth',           status: 'live' },
  { pageType: 'service',  pageTitle: 'Leadwork',                urlSlug: '/services/leadwork',              h1: 'Leadwork Bournemouth',               status: 'live' },
  { pageType: 'service',  pageTitle: 'Fascias and Soffits',     urlSlug: '/services/fascias-and-soffits',  h1: 'Fascias and Soffits Bournemouth',    status: 'live' },
  { pageType: 'service',  pageTitle: 'Emergency Roof Repair',   urlSlug: '/services/emergency-roof-repair', h1: 'Emergency Roof Repair Bournemouth', status: 'live' },
  { pageType: 'location', pageTitle: 'Poole',            urlSlug: '/locations/poole',        h1: 'Roofer Poole',        status: 'live' },
  { pageType: 'location', pageTitle: 'Christchurch',     urlSlug: '/locations/christchurch', h1: 'Roofer Christchurch', status: 'live' },
  { pageType: 'location', pageTitle: 'Highcliffe',       urlSlug: '/locations/highcliffe',   h1: 'Roofer Highcliffe',   status: 'launching' },
  { pageType: 'location', pageTitle: 'Ferndown',         urlSlug: '/locations/ferndown',     h1: 'Roofer Ferndown',     status: 'launching' },
  { pageType: 'location', pageTitle: 'West Moors',       urlSlug: '/locations/west-moors',   h1: 'Roofer West Moors',   status: 'launching' },
  { pageType: 'location', pageTitle: 'Wimborne Minster', urlSlug: '/locations/wimborne',     h1: 'Roofer Wimborne',     status: 'launching' },
  { pageType: 'location', pageTitle: 'Verwood',          urlSlug: '/locations/verwood',      h1: 'Roofer Verwood',      status: 'launching' },
];

const keyValueMap = {
  biz_area_1: 'Bournemouth', biz_area_2: 'Poole', biz_area_3: 'Christchurch',
  biz_area_4: 'Highcliffe',  biz_area_5: 'Ferndown', biz_area_6: 'West Moors',
  biz_area_7: 'Wimborne Minster', biz_area_8: 'Verwood',
};

const result = computeDecisions({
  cv, niche: roofer, pages, keyValueMap, v20TestMode: true, allocationData: null,
});

console.log('\n=== FIXTURE: Kestrel Ridge Thin FAQ ===\n');
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

const faq = D.d11_faq;
const questions = faq.map(q => q.question);
const unique = new Set(questions);
chk('No question appears twice', unique.size === questions.length,
  questions.filter((q,i) => questions.indexOf(q) !== i).join(', '), 'none');

const q2 = faq.find(q => q.slot === 'Q2');
chk('Q2 = faq_C (insurance/complaints both blank)',
  q2 && q2.question === 'How long does a new roof last?',
  q2 && q2.question, 'How long does a new roof last?');

const q3 = faq.find(q => q.slot === 'Q3');
chk('Q3 = faq_3_none (trust, no guarantee, business_type B)',
  q3 && q3.doubt === 'Trust',
  q3 && q3.question + ' [' + (q3 && q3.doubt) + ']', 'faq_3_none [Trust]');

const q4 = faq.find(q => q.slot === 'Q4');
chk('Q4 = faq_D (second fallback, start_time blank)',
  q4 && q4.question === 'Can my roof be repaired or does it need replacing?',
  q4 && q4.question, 'Can my roof be repaired or does it need replacing?');

const allQ = faq.map(q => q.question);
chk('faq_C used exactly once', allQ.filter(q => q === 'How long does a new roof last?').length === 1,
  allQ.filter(q => q === 'How long does a new roof last?').length, 1);
chk('faq_D used exactly once', allQ.filter(q => q === 'Can my roof be repaired or does it need replacing?').length === 1,
  allQ.filter(q => q === 'Can my roof be repaired or does it need replacing?').length, 1);
chk('faq_E not used', allQ.filter(q => q === 'Does a new roof need building regulations approval?').length === 0,
  allQ.filter(q => q === 'Does a new roof need building regulations approval?').length, 0);

chk('No N25 flag', !(result.flags||[]).some(f => f.code === 'N25'),
  (result.flags||[]).filter(f=>f.code==='N25').map(f=>f.msg).join(''), 'none');

chk('CTA band lowercase', D.d8.cta_band === 'Ready to talk to a local roofer?',
  D.d8.cta_band, 'Ready to talk to a local roofer?');

chk('No gate failures', !result.gates || result.gates.length === 0,
  (result.gates||[]).map(g=>g.code).join(', '), 'none');

chk('F-ALLOC flag present', (result.flags||[]).some(f => f.code === 'F-ALLOC'), 'none', 'F-ALLOC');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
