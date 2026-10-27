'use strict';

// ── Page type: location page (CORE (18), 27 Oct 2026) ────────────────────────
// One per town in the service area ("Landscaper Winchester"): the town's hub page, linking
// down to the town's location category pages (the cards; a single category client's cards
// are its town service pages). Always town scope. The field labels match the CORE (18)
// OUTPUT block; a label change there is a change here and nowhere else (LABELS, LIST_KEYS).

const LABELS = {
  hero: 'loc_hero_intro',
  servicesIntro: 'loc_services_intro',
  cards: 'loc_services_cards',
  content: 'loc_content_body',
  block4: 'loc_block4',
  costIntro: 'loc_cost_intro',
  block5: 'loc_block5',
  steps: 'loc_process_steps',
  areasIntro: 'loc_areas_intro',
  faq: 'loc_faq_items',
  finalCta: 'loc_final_cta_body',
};
const LIST_KEYS = {
  [LABELS.cards]:  ['card_name', 'card_text'],
  [LABELS.block4]: ['card_title', 'card_body'],
  [LABELS.block5]: ['card_title', 'card_body'],
  [LABELS.steps]:  ['step_title', 'step_body'],
  [LABELS.faq]:    ['faq_question', 'faq_answer'],
};
// The parser spec (v20-parse.js parseOutput)
const OUTPUT_SPEC = {
  scalars: [LABELS.hero, LABELS.servicesIntro, LABELS.content, LABELS.costIntro, LABELS.areasIntro, LABELS.finalCta],
  lists: LIST_KEYS,
};

// Word ranges by rangeKey (CORE (18) "THE FIELDS YOU WRITE")
const RANGES = {
  loc_hero_intro:     { max: 49, label: 'under 50' },
  loc_services_intro: { min: 30, max: 60, label: '30 to 60' },
  card_text:          { min: 40, max: 55, label: '40 to 55' },
  loc_content_body:   { min: 200, max: 250, label: '200 to 250' },
  block4_body:        { min: 40, max: 60, label: '40 to 60' },
  loc_cost_intro:     { min: 30, max: 50, label: '30 to 50' },
  block5_body:        { min: 30, max: 45, label: '30 to 45' },
  step_body:          { min: 20, max: 30, label: '20 to 30' },
  loc_areas_intro:    { min: 40, max: 60, label: '40 to 60' },
  faq_answer:         { min: 30, max: 70, label: '30 to 70' },
  loc_final_cta_body: { min: 15, max: 25, label: '15 to 25' },
};

// Model fields of a location record, in page order, with a ref to write a rewrite back
function modelFields(record) {
  const out = [];
  const add = (label, ref, text, rangeKey) => out.push({ label, ref, text: text || '', rangeKey });
  add(LABELS.hero, { key: LABELS.hero }, record[LABELS.hero], LABELS.hero);
  add(LABELS.servicesIntro, { key: LABELS.servicesIntro }, record[LABELS.servicesIntro], LABELS.servicesIntro);
  (record.cards || []).forEach((c, i) => add(`card_text (${c.card_name})`, { key: 'cards', index: i, sub: 'card_text' }, c.card_text, 'card_text'));
  add(LABELS.content, { key: LABELS.content }, record[LABELS.content], LABELS.content);
  (record.block4 || []).forEach((p, i) => add(`block4 card_body (${p.card_title})`, { key: 'block4', index: i, sub: 'card_body' }, p.card_body, 'block4_body'));
  add(LABELS.costIntro, { key: LABELS.costIntro }, record[LABELS.costIntro], LABELS.costIntro);
  (record.block5 || []).forEach((p, i) => add(`block5 card_body (${p.card_title})`, { key: 'block5', index: i, sub: 'card_body' }, p.card_body, 'block5_body'));
  (record.steps || []).forEach((s, i) => add(`step_body (${s.step_title})`, { key: 'steps', index: i, sub: 'step_body' }, s.step_body, 'step_body'));
  add(LABELS.areasIntro, { key: LABELS.areasIntro }, record[LABELS.areasIntro], LABELS.areasIntro);
  (record.faq_items || []).forEach((f, i) => add(`faq_answer (${f.faq_question})`, { key: 'faq_items', index: i, sub: 'faq_answer' }, f.faq_answer, 'faq_answer'));
  add(LABELS.finalCta, { key: LABELS.finalCta }, record[LABELS.finalCta], LABELS.finalCta);
  return out;
}

module.exports = {
  id: 'location',
  label: 'Location page',
  // Many per client: the key is the page map slug (/locations/<town>)
  singleKey: null,
  LABELS, LIST_KEYS, OUTPUT_SPEC, RANGES,
  modelFields,
  replyLabels: /loc_[a-z_]+|card_name|card_text|card_title|card_body|step_title|step_body|faq_question|faq_answer|MODEL_FLAGS/,
  ranges: RANGES,
  validate: (record, V) => require('../validate-location').validateLocation(record, V),
  readerView: (record, values) => require('../location-reader').buildLocationReaderView(record, values),
  // The WordPress mapping waits for the location template's field map: no push yet
  wp: {
    label: 'location page',
    fields: [],
    buildPayload: () => { throw new Error('Location pages cannot be pushed yet: the WordPress field map for the location template is not in Copybot.'); },
    findPage: async () => null,
    groups: [],
  },
};
