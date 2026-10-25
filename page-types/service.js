'use strict';

// ── Page type: service page (CORE (17), 25 Oct 2026) ─────────────────────────
// One type for the service page (base scope, "Lawn Mowing Southampton") and the town
// service page (town scope, "Tree Stump Removal Romsey"); the record's scope says which.
// The field labels match the CORE (17) OUTPUT block; a label change there is a change
// here and nowhere else (LABELS, LIST_KEYS).

const LABELS = {
  hero: 'svc_hero_intro',
  includedIntro: 'svc_included_intro',
  included: 'svc_included_items',
  content: 'svc_content_body',
  block4: 'svc_block4',
  steps: 'svc_process_steps',
  costIntro: 'svc_cost_intro',
  block5: 'svc_block5',
  areasIntro: 'svc_areas_intro',
  faq: 'svc_faq_items',
  moreIntro: 'svc_more_intro',
  finalCta: 'svc_final_cta_body',
};
const LIST_KEYS = {
  [LABELS.included]: ['item_title', 'item_text'],
  [LABELS.block4]:   ['card_title', 'card_body'],
  [LABELS.block5]:   ['card_title', 'card_body'],
  [LABELS.steps]:    ['step_title', 'step_body'],
  [LABELS.faq]:      ['faq_question', 'faq_answer'],
};
// The parser spec (v20-parse.js parseOutput)
const OUTPUT_SPEC = {
  scalars: [LABELS.hero, LABELS.includedIntro, LABELS.content, LABELS.costIntro, LABELS.areasIntro, LABELS.moreIntro, LABELS.finalCta],
  lists: LIST_KEYS,
};

// Word ranges by rangeKey (CORE (17) "THE FIELDS YOU WRITE")
const RANGES = {
  svc_hero_intro:     { max: 49, label: 'under 50' },
  svc_included_intro: { min: 30, max: 50, label: '30 to 50' },
  item_text:          { min: 4, max: 10, label: '4 to 10' },
  svc_content_body:   { min: 250, max: 300, label: '250 to 300' },
  block4_body:        { min: 40, max: 60, label: '40 to 60' },
  step_body:          { min: 20, max: 30, label: '20 to 30' },
  svc_cost_intro:     { min: 30, max: 50, label: '30 to 50' },
  block5_body:        { min: 30, max: 45, label: '30 to 45' },
  svc_areas_intro:    { min: 40, max: 60, label: '40 to 60' },
  faq_answer:         { min: 30, max: 70, label: '30 to 70' },
  svc_more_intro:     { min: 20, max: 40, label: '20 to 40' },
  svc_final_cta_body: { min: 15, max: 25, label: '15 to 25' },
};

// Model fields of a service record, in page order, with a ref to write a rewrite back
function modelFields(record) {
  const out = [];
  const add = (label, ref, text, rangeKey) => out.push({ label, ref, text: text || '', rangeKey });
  add(LABELS.hero, { key: LABELS.hero }, record[LABELS.hero], LABELS.hero);
  add(LABELS.includedIntro, { key: LABELS.includedIntro }, record[LABELS.includedIntro], LABELS.includedIntro);
  (record.included || []).forEach((it, i) => add(`item_text (${it.item_title})`, { key: 'included', index: i, sub: 'item_text' }, it.item_text, 'item_text'));
  add(LABELS.content, { key: LABELS.content }, record[LABELS.content], LABELS.content);
  (record.block4 || []).forEach((p, i) => add(`block4 card_body (${p.card_title})`, { key: 'block4', index: i, sub: 'card_body' }, p.card_body, 'block4_body'));
  (record.steps || []).forEach((s, i) => add(`step_body (${s.step_title})`, { key: 'steps', index: i, sub: 'step_body' }, s.step_body, 'step_body'));
  add(LABELS.costIntro, { key: LABELS.costIntro }, record[LABELS.costIntro], LABELS.costIntro);
  (record.block5 || []).forEach((p, i) => add(`block5 card_body (${p.card_title})`, { key: 'block5', index: i, sub: 'card_body' }, p.card_body, 'block5_body'));
  add(LABELS.areasIntro, { key: LABELS.areasIntro }, record[LABELS.areasIntro], LABELS.areasIntro);
  (record.faq_items || []).forEach((f, i) => add(`faq_answer (${f.faq_question})`, { key: 'faq_items', index: i, sub: 'faq_answer' }, f.faq_answer, 'faq_answer'));
  if (record[LABELS.moreIntro] !== 'HIDDEN') add(LABELS.moreIntro, { key: LABELS.moreIntro }, record[LABELS.moreIntro], LABELS.moreIntro);
  add(LABELS.finalCta, { key: LABELS.finalCta }, record[LABELS.finalCta], LABELS.finalCta);
  return out;
}

module.exports = {
  id: 'service',
  label: 'Service page',
  // Many per client: the key is the page map slug
  singleKey: null,
  LABELS, LIST_KEYS, OUTPUT_SPEC, RANGES,
  modelFields,
  replyLabels: /svc_[a-z_]+|item_title|item_text|card_title|card_body|step_title|step_body|faq_question|faq_answer|MODEL_FLAGS/,
  ranges: RANGES,
  validate: (record, V) => require('../validate-service').validateService(record, V),
  readerView: (record, values) => require('../service-reader').buildServiceReaderView(record, values),
  // The WordPress mapping waits for the service template's field map: no push yet
  wp: {
    label: 'service page',
    fields: [],
    buildPayload: () => { throw new Error('Service pages cannot be pushed yet: the WordPress field map for the service template is not in Copybot.'); },
    findPage: async () => null,
    groups: [],
  },
};
