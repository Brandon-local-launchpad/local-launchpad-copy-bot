'use strict';
// Inputs for the 14 Oct 2026 Edens Edge v20 run (brief §7 acceptance values).
// owner_why, owner_promise, owner_photo and hours are stand-ins (test text), and
// insurance_cover = 5m is the brief's test value: Ethan excluded insurance on his
// form (Master Context Document). See ethanValues() for his documented answers.

const cv = {
  company_name: 'Edens Edge Landscaping', company_name_gbp_checked: true, phone: '023 0000 0000', email: '',
  address: '', gbp_address_type: 'service_area', hours: 'Monday to Saturday, 7am to 6pm', primary_category: 'Landscaper',
  year_founded: '', jobs_completed: '100', rating: '', review_count: '', guarantee_years: '', manufacturer_warranty: '',
  insurance_cover: '5m',
  differentiator_1: 'Fixed Prices With No Hidden Costs', differentiator_1_confirmed: true, differentiator_1_sentence: 'Fixed prices with no hidden costs',
  differentiator_2: 'Family Run and Independent', differentiator_2_confirmed: true, differentiator_2_sentence: 'Family run and independent',
  verified_logos: [], free_quotes: 'yes', quote_method: '', price_list: '', response_time: '', same_day_available: '',
  out_of_hours_available: '', start_time: 'same week',
  owner_name: 'Test Owner', owner_name_2: '', owner_qualification: 'test qualification',
  owner_why: "Started the business after years working on other people's gardens", owner_promise: 'I will always tell you if a job is not worth doing',
  owner_pronoun: '', owner_photo: 'yes', business_type: 'A', materials_methods: [], guarantee_scope: '', team_size: '4',
  typical_jobs: [], emergency_primary: '', handles_planning: '', finance_options: '', complaints_process: '', area_wide: '',
  travel_distance: '20 miles', review_themes: [], jobs_wanted: [], map_embed: '',
  stand_ins: ['owner_why', 'owner_promise', 'owner_photo', 'hours'], h1_override: 'Landscaper Southampton',
};

const cats = ['Landscape Gardener', 'Landscape Designer', 'Gardener', 'Lawn care service', 'Tree service', 'Paving contractor', 'Deck builder'];
const towns = ['Ampfield', 'Chandlers Ford', 'Eastleigh', 'Fair Oak', 'Hedge End', 'Romsey', 'Totton', 'West End', 'Winchester'];
const pages = [
  { pageType: 'homepage', pageTitle: 'Edens Edge Landscaping', urlSlug: '/', h1: 'Landscaper Southampton', status: 'live' },
  ...cats.map(n => ({ pageType: 'category', pageTitle: n, urlSlug: '/' + n.toLowerCase().replace(/ /g, '-'), h1: `${n} Southampton`, status: 'live' })),
  ...towns.map(t => ({ pageType: 'location', pageTitle: t, urlSlug: '/locations/' + t.toLowerCase().replace(/ /g, '-'), h1: `Landscaper ${t}`, status: 'live' })),
  { pageType: 'location', pageTitle: 'New Forest District', urlSlug: '', h1: '', status: 'not built' },
];
const keyValueMap = { biz_area_1: 'Southampton', category_1: 'Landscaper' };
['Romsey', 'Eastleigh', 'Chandlers Ford', 'Fair Oak', 'Hedge End', 'West End', 'Ampfield', 'Totton', 'Winchester', 'New Forest District']
  .forEach((t, i) => { keyValueMap[`biz_area_${i + 2}`] = t; });

// Ethan's documented answers (Master Context Document, 3 Oct 2026): free quote,
// fixed price and same week start are the usable facts; 100 jobs; insurance
// excluded; hours and founding year unusable; no reviews; no owner photo or story.
// travel_distance comes from the brief's §7 list. "Family run" (differentiator_2)
// and the team of four are waiting on Ethan (14 Oct, second pass), so they're left out. No
// practices are confirmed yet. Southampton is coastal.
function ethanValues() {
  return {
    ...cv,
    insurance_cover: '', hours: '',
    owner_name: 'Ethan', owner_qualification: '', owner_why: '', owner_promise: '', owner_photo: 'no',
    differentiator_2_confirmed: false, team_size: '',
    confirmed_practices: [], coastal_city: 'yes',
    stand_ins: [],
  };
}

module.exports = { cv, pages, keyValueMap, ethanValues };
