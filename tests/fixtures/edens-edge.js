'use strict';
// Fixture: Edens Edge Landscaping — acceptance test from brief section 7
const path = require('path');
const { computeDecisions } = require(path.join(__dirname, '../../decisions.js'));
const landscaper = require(path.join(__dirname, '../../niche-library/landscaper.json'));

const cv = {
  company_name: 'Edens Edge Landscaping',
  company_name_gbp_checked: true,
  phone: '023 0000 0000',
  email: '',
  address: '',
  gbp_address_type: 'service_area',
  hours: 'Monday to Saturday, 7am to 6pm',
  primary_category: 'Landscaper',
  year_founded: '',
  jobs_completed: '100',
  rating: '',
  review_count: '',
  guarantee_years: '',
  manufacturer_warranty: '',
  insurance_cover: '5m',
  differentiator_1: 'Fixed Prices With No Hidden Costs',
  differentiator_1_confirmed: true,
  differentiator_1_sentence: 'Fixed prices with no hidden costs',
  differentiator_2: 'Family Run and Independent',
  differentiator_2_confirmed: true,
  differentiator_2_sentence: '',
  verified_logos: [],
  free_quotes: 'yes',
  quote_method: '',
  price_list: '',
  response_time: '',
  same_day_available: '',
  out_of_hours_available: '',
  start_time: 'same week',
  owner_name: 'Test Owner',
  owner_name_2: '',
  owner_qualification: 'test qualification',
  owner_why: 'test owner why',
  owner_promise: 'test owner promise',
  owner_pronoun: '',
  owner_photo: 'yes',
  business_type: 'A',
  materials_methods: [],
  guarantee_scope: '',
  team_size: '4',
  typical_jobs: [],
  emergency_primary: '',
  handles_planning: '',
  finance_options: '',
  complaints_process: '',
  area_wide: '',
  travel_distance: '20 miles',
  review_themes: [],
  jobs_wanted: [],
  map_embed: '',
  stand_ins: [],
  h1_override: 'Landscaper Southampton',
};

const pages = [
  { pageType: 'homepage',  pageTitle: 'Edens Edge Landscaping',  urlSlug: '/',                          h1: 'Landscaper Southampton',       status: 'live' },
  { pageType: 'category',  pageTitle: 'Landscape Gardener',       urlSlug: '/landscape-gardener',        h1: 'Landscape Gardener Southampton', status: 'live' },
  { pageType: 'category',  pageTitle: 'Landscape Designer',       urlSlug: '/landscape-designer',        h1: 'Landscape Designer Southampton', status: 'live' },
  { pageType: 'category',  pageTitle: 'Gardener',                 urlSlug: '/gardener',                  h1: 'Gardener Southampton',           status: 'live' },
  { pageType: 'category',  pageTitle: 'Lawn care service',        urlSlug: '/lawn-care-service',         h1: 'Lawn Care Service Southampton',  status: 'live' },
  { pageType: 'category',  pageTitle: 'Tree service',             urlSlug: '/tree-service',              h1: 'Tree Service Southampton',       status: 'live' },
  { pageType: 'category',  pageTitle: 'Paving contractor',        urlSlug: '/paving-contractor',         h1: 'Paving Contractor Southampton',  status: 'live' },
  { pageType: 'category',  pageTitle: 'Deck builder',             urlSlug: '/deck-builder',              h1: 'Deck Builder Southampton',       status: 'live' },
  { pageType: 'location',  pageTitle: 'Ampfield',                 urlSlug: '/locations/ampfield',        h1: 'Landscaper Ampfield',            status: 'live' },
  { pageType: 'location',  pageTitle: 'Chandlers Ford',           urlSlug: '/locations/chandlers-ford',  h1: 'Landscaper Chandlers Ford',      status: 'live' },
  { pageType: 'location',  pageTitle: 'Eastleigh',                urlSlug: '/locations/eastleigh',       h1: 'Landscaper Eastleigh',           status: 'live' },
  { pageType: 'location',  pageTitle: 'Fair Oak',                 urlSlug: '/locations/fair-oak',        h1: 'Landscaper Fair Oak',            status: 'live' },
  { pageType: 'location',  pageTitle: 'Hedge End',                urlSlug: '/locations/hedge-end',       h1: 'Landscaper Hedge End',           status: 'live' },
  { pageType: 'location',  pageTitle: 'Romsey',                   urlSlug: '/locations/romsey',          h1: 'Landscaper Romsey',              status: 'live' },
  { pageType: 'location',  pageTitle: 'Totton',                   urlSlug: '/locations/totton',          h1: 'Landscaper Totton',              status: 'live' },
  { pageType: 'location',  pageTitle: 'West End',                 urlSlug: '/locations/west-end',        h1: 'Landscaper West End',            status: 'live' },
  { pageType: 'location',  pageTitle: 'Winchester',               urlSlug: '/locations/winchester',      h1: 'Landscaper Winchester',          status: 'live' },
  { pageType: 'location',  pageTitle: 'New Forest District',      urlSlug: '',                           h1: '',                               status: 'not built' },
];

const keyValueMap = {
  biz_area_1: 'Southampton',
  biz_area_2: 'Romsey',
  biz_area_3: 'Eastleigh',
  biz_area_4: 'Chandlers Ford',
  biz_area_5: 'Fair Oak',
  biz_area_6: 'Hedge End',
  biz_area_7: 'West End',
  biz_area_8: 'Ampfield',
  biz_area_9: 'Totton',
  biz_area_10: 'Winchester',
  biz_area_11: 'New Forest District',
};

const result = computeDecisions({
  cv, niche: landscaper, pages, keyValueMap, v20TestMode: true, allocationData: null,
});

console.log('\n=== FIXTURE: Edens Edge Landscaping ===\n');
if (result.gates && result.gates.length) {
  console.log('GATE FAILURES:');
  result.gates.forEach(g => console.log('  ' + g.code + ': ' + g.msg));
}
if (result.flags && result.flags.length) {
  console.log('FLAGS: ' + result.flags.map(f => f.code).join(', '));
}
if (!result.decisionsBlock) { console.log('No decisions block.'); process.exit(1); }

console.log('\n' + result.decisionsBlock);

// ── Checks ────────────────────────────────────────────────────────────────────
console.log('\n=== CHECKS ===\n');
const D = result.decisions;
let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};

chk('H1 = Landscaper Southampton',
  D.d2_h1 === 'Landscaper Southampton', D.d2_h1, 'Landscaper Southampton');

chk('Title = Landscaper Southampton | Edens Edge Landscaping',
  D.d3_title === 'Landscaper Southampton | Edens Edge Landscaping',
  D.d3_title, 'Landscaper Southampton | Edens Edge Landscaping');

chk('Trust line = 100+ Jobs Completed',
  D.d5_trust === '100+ Jobs Completed', D.d5_trust, '100+ Jobs Completed');

chk('Rating line = none', D.d6_rating === null, D.d6_rating, 'null');

chk('Section 2 HIDDEN', D.d7.sec2 === 'HIDDEN', D.d7.sec2, 'HIDDEN');
chk('Section 6 HIDDEN', D.d7.sec6 === 'HIDDEN', D.d7.sec6, 'HIDDEN');

chk('Content H2 = Local Landscaping in Southampton and Nearby Towns',
  D.d8.content === 'Local Landscaping in Southampton and Nearby Towns',
  D.d8.content, 'Local Landscaping in Southampton and Nearby Towns');

chk('CTA band lowercase trade_person',
  D.d8.cta_band === 'Ready to talk to a local landscaper?',
  D.d8.cta_band, 'Ready to talk to a local landscaper?');

chk('D13 link set = 4 links',
  D.d13_links.length === 4, D.d13_links.length, 4);

chk('D14 town = Romsey',
  D.d14_town && D.d14_town.name === 'Romsey',
  D.d14_town && D.d14_town.name, 'Romsey');

chk('7 service cards',
  D.d9.main.length === 7, D.d9.main.length, 7);

chk('No items in We also offer (all cards fit)',
  D.d9.alsoOffer.length === 0, D.d9.alsoOffer.length, 0);

chk('4 Why points',
  D.d10_why.length === 4, D.d10_why.length, 4);

chk('Why P1 = alt title (jobs is trust line)',
  D.d10_why[0] && D.d10_why[0].title === 'Local Experience Behind Every Job',
  D.d10_why[0] && D.d10_why[0].title, 'Local Experience Behind Every Job');

chk('Why P2 = Insured up to £5m',
  D.d10_why[1] && D.d10_why[1].title === 'Insured up to £5m',
  D.d10_why[1] && D.d10_why[1].title, 'Insured up to £5m');

chk('Why P3 = Fixed Prices With No Hidden Costs',
  D.d10_why[2] && D.d10_why[2].title === 'Fixed Prices With No Hidden Costs',
  D.d10_why[2] && D.d10_why[2].title, 'Fixed Prices With No Hidden Costs');

chk('Why P4 = Family Run and Independent',
  D.d10_why[3] && D.d10_why[3].title === 'Family Run and Independent',
  D.d10_why[3] && D.d10_why[3].title, 'Family Run and Independent');

const faq = D.d11_faq;
chk('8 FAQ questions', faq.length === 8, faq.length, 8);

const q3 = faq.find(q => q.slot === 'Q3');
chk('Q3 = faq_3_none (no guarantee, type A)',
  q3 && q3.doubt === 'Trust',
  q3 && q3.question, 'faq_3_none question');

chk('New Forest is plain text in area list',
  D.d12_areas.plain.includes('New Forest'),
  D.d12_areas.plain.join(', '), 'includes New Forest');

chk('F-THIN flag present', (result.flags||[]).some(f => f.code === 'F-THIN'), 'none', 'F-THIN');
chk('F-MAP-TEST flag present', (result.flags||[]).some(f => f.code === 'F-MAP-TEST'), 'none', 'F-MAP-TEST');
chk('F-REVIEWS flag present', (result.flags||[]).some(f => f.code === 'F-REVIEWS'), 'none', 'F-REVIEWS');
chk('F-ALLOC flag present', (result.flags||[]).some(f => f.code === 'F-ALLOC'), 'none', 'F-ALLOC');
chk('No gate failures', !result.gates || result.gates.length === 0,
  (result.gates||[]).map(g=>g.code).join(', '), 'none');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
