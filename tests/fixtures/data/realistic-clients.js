'use strict';

// Realistic test clients (copy quality 6, 5 Nov 2026; Brandon's brief). One thin and one full client each
// for locksmith and cleaning: the list of services a real firm would tick, three towns, and on the full
// client the onboarding answers. Everything here is invented test data for local runs: the firms don't
// exist and nothing here is ever published. Run with:
//   node tools/niche-thin-run.js locksmith --client locksmith-full --trust-pack --quality --one-reading
//
// The thin client has what a thin intake gives: a name, the years and jobs, the insurance figure, one
// differentiator. The full client adds the put right policy, materials and methods, the confirmed
// practices, the quote method, the response time and hours, and the areas worked.
//
// The towns' dossiers are the ones on hand (tests/fixtures/southampton-dossier.md and
// tests/live-snapshots/dossiers), written for a landscaper: their neighbourhoods apply to any trade,
// their symptoms don't, so these clients get local places and no local symptoms.

const THIN = {
  gbp_address_type: 'service_area', year_founded: '2021', jobs_completed: '60', insurance_cover: '2m', free_quotes: 'yes',
  differentiator_1: 'Family Run and Independent', differentiator_1_confirmed: true, differentiator_1_sentence: 'Family run and independent',
};
const TOWNS = ['Romsey', 'Eastleigh'];

const LOCKSMITH_TICKS = { 'locksmith.cat.locksmith': ['Building lockouts', 'Building key copying', 'Door lock and bolt hardware repair', 'Door lock and bolt hardware installation', 'General lock installation', 'Lock rekeying', 'Security door locks', 'Window locks', 'Repair hardware'] };
const CLEANING_TICKS = {
  'cleaning.cat.house_cleaning_service': ['Standard cleaning', 'General housekeeping', 'Deep clean', 'Moving-related cleaning', 'Office and workplace cleaning', 'Mattress cleaning'],
  'cleaning.cat.carpet_cleaning_service': ['Carpet steam cleaning', 'Upholstery cleaning', 'Pet stain and odour removal'],
};

const CLIENTS = {
  'locksmith-thin': {
    stem: 'locksmith', companyName: 'Harbourgate Locksmiths', baseTown: 'Southampton', towns: TOWNS,
    ticks: LOCKSMITH_TICKS, typed: ['uPVC door lock repairs'], services: ['/services/lockouts-and-gaining-entry'],
    cv: { ...THIN, phone: '023 8000 0101', owner_name: 'Dan' },
  },
  'locksmith-full': {
    stem: 'locksmith', companyName: 'Harbourgate Locksmiths', baseTown: 'Southampton', towns: TOWNS,
    ticks: LOCKSMITH_TICKS, typed: ['uPVC door lock repairs', 'Burglary repairs'], services: ['/services/lockouts-and-gaining-entry'],
    cv: {
      ...THIN, phone: '023 8000 0101', email: 'hello@harbourgate.test', year_founded: '2014', jobs_completed: '3200', insurance_cover: '5m',
      rating: '4.9', review_count: '86', review_themes: ['Turned up when they said', 'Clear price before starting'],
      differentiator_1: 'Price Agreed Before We Set Out', differentiator_1_confirmed: true, differentiator_1_sentence: 'The price is agreed on the phone before we set out',
      differentiator_2: 'Family Run and Independent', differentiator_2_confirmed: true, differentiator_2_sentence: 'Family run and independent',
      owner_name: 'Dan', owner_qualification: 'ten years on the tools before starting the firm', owner_why: 'Started the firm after being charged twice over for a lockout of his own', owner_promise: 'You will know the price before I pick up the tools',
      guarantee_years: '1', guarantee_scope: 'the locks we fit and the repairs we make', if_not_happy: 'If a lock we fitted or repaired gives trouble within a year, we come back and put it right at no charge', complaints_process: 'Call Dan directly and he will come out and look at it himself',
      quote_method: 'A price on the phone from what you describe, with a photo of the lock if you can send one', quote_includes: 'the call out, labour and any standard lock parts', start_time: 'usually the same day',
      response_time: 'usually within the hour across Southampton, Romsey and Eastleigh', same_day_available: 'yes', out_of_hours_available: '24/7', emergency_primary: 'yes',
      hours: 'Monday to Saturday 8am to 6pm; lockouts and break ins 24 hours', areas_worked: 'Southampton, Romsey, Eastleigh, Totton, Chandlers Ford and Hedge End', travel_distance: '15 miles', team_size: '3',
      typical_jobs: 'lockouts on timber and uPVC front doors, uPVC gearbox replacements, lock changes after moving in or losing keys',
      materials_methods: ['British Standard mortice deadlock', 'nightlatch with keyless exit', 'anti snap three star cylinder', 'multipoint gearbox replacement', 'hinge and keep adjustment', 'key operated window handles'],
      confirmed_practices: ['price_agreed_before_work', 'extra_work_agreed_first', 'no_subcontractors', 'aftercare_advice', 'return_visit', 'tidy_each_day'],
    },
  },
  'cleaning-thin': {
    stem: 'cleaning', companyName: 'Brightwater Cleaning', baseTown: 'Southampton', towns: TOWNS,
    ticks: CLEANING_TICKS, typed: ['End of tenancy cleaning', 'Oven cleaning'], services: ['/services/end-of-tenancy-cleaning'],
    cv: { ...THIN, phone: '023 8000 0202', owner_name: 'Priya' },
  },
  'cleaning-full': {
    stem: 'cleaning', companyName: 'Brightwater Cleaning', baseTown: 'Southampton', towns: TOWNS,
    ticks: CLEANING_TICKS, typed: ['End of tenancy cleaning', 'Oven cleaning'], services: ['/services/end-of-tenancy-cleaning'],
    cv: {
      ...THIN, phone: '023 8000 0202', email: 'hello@brightwater.test', year_founded: '2016', jobs_completed: '4100', insurance_cover: '5m',
      rating: '4.8', review_count: '112', review_themes: ['Same cleaner every visit', 'Deposit back after the checkout clean'],
      differentiator_1: 'The Same Cleaner Every Visit', differentiator_1_confirmed: true, differentiator_1_sentence: 'The same cleaner every visit',
      differentiator_2: 'Family Run and Independent', differentiator_2_confirmed: true, differentiator_2_sentence: 'Family run and independent',
      owner_name: 'Priya', owner_qualification: 'BICSc trained', owner_why: 'Started out cleaning holiday lets and kept the checklists', owner_promise: 'If it is not right, tell me and we will come back the next day',
      guarantee_scope: 'anything we missed on the checklist', if_not_happy: 'Tell us within 48 hours and we come back and re clean anything missed at no charge', complaints_process: 'Call Priya directly',
      quote_method: 'A fixed price from a short call and a few photos; larger homes get a visit first', quote_includes: 'labour, products and equipment', start_time: 'usually within the week',
      response_time: 'we reply the same working day', same_day_available: '', out_of_hours_available: '', visit_frequency_options: 'weekly, fortnightly or monthly', access_handling: 'a key safe, or a key we hold and sign for',
      hours: 'Monday to Saturday 8am to 6pm', areas_worked: 'Southampton, Romsey, Eastleigh, Totton and Chandlers Ford', travel_distance: '12 miles', team_size: '6',
      typical_jobs: 'fortnightly cleans of family homes, end of tenancy cleans for letting agents, small office contracts',
      materials_methods: ['standard professional products', 'eco or plant based products', 'hot water extraction'],
      confirmed_practices: ['same_team_throughout', 'maintenance_schedule', 'price_agreed_before_work', 'extra_work_agreed_first', 'return_visit', 'waste_removal'],
    },
  },
};

module.exports = { CLIENTS };
