'use strict';
// Fixture: Kestrel Ridge Roofing (a) — rich version from paper test
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
  guarantee_years: '10',
  manufacturer_warranty: '',
  insurance_cover: '5m',
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
  quote_method: 'written quote within 48 hours',
  price_list: '',
  response_time: 'one working day',
  same_day_available: 'yes',
  out_of_hours_available: '',
  start_time: 'within two weeks',
  owner_name: 'Sarah',
  owner_name_2: '',
  owner_qualification: 'NVQ Level 3 in roof slating and tiling',
  owner_why: 'took over her dad\'s round in 2009',
  owner_promise: 'never recommend replacing anything that can honestly be repaired',
  owner_pronoun: 'she',
  owner_photo: 'yes',
  business_type: 'A',
  materials_methods: ['natural slate', 'clay tile', 'concrete tile', 'breathable membrane', 'EPDM rubber', 'liquid applied coating', 'uPVC', 'dressed on site'],
  guarantee_scope: 'new roofs 10 years, repairs 2 years',
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
    { theme: 'Photos of the Problem Sent Before We Start', approved: true },
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
