'use strict';

// ── Page type: category page (CORE (16), 23 Oct 2026) ────────────────────────
// One type for the category page (base scope, "Gardener Southampton") and the location
// category page (town scope, "Gardener Winchester"); the record's scope says which.
// The field labels match the CORE (16) OUTPUT block; a label change there is a change
// here and nowhere else (LABELS, LIST_KEYS).

const LABELS = {
  hero: 'cat_hero_intro',
  servicesIntro: 'cat_services_intro',
  cards: 'cat_services_cards',
  alsoOffered: 'cat_also_offered',
  content: 'cat_content_body',
  problems: 'cat_problems',
  costIntro: 'cat_cost_intro',
  cost: 'cat_cost_factors',
  steps: 'cat_process_steps',
  areasIntro: 'cat_areas_intro',
  faq: 'cat_faq_items',
  finalCta: 'cat_final_cta_body',
};
const LIST_KEYS = {
  [LABELS.cards]:    ['card_name', 'card_text'],
  [LABELS.problems]: ['problem_title', 'problem_body'],
  [LABELS.cost]:     ['factor_title', 'factor_body'],
  [LABELS.steps]:    ['step_title', 'step_body'],
  [LABELS.faq]:      ['faq_question', 'faq_answer'],
};
// The parser spec (v20-parse.js parseOutput)
const OUTPUT_SPEC = {
  scalars: [LABELS.hero, LABELS.servicesIntro, LABELS.alsoOffered, LABELS.content, LABELS.costIntro, LABELS.areasIntro, LABELS.finalCta],
  lists: LIST_KEYS,
};

// Word ranges by rangeKey (CORE (16) "THE FIELDS YOU WRITE")
const RANGES = {
  cat_hero_intro:     { max: 49, label: 'under 50' },
  cat_services_intro: { min: 30, max: 60, label: '30 to 60' },
  card_text:          { min: 40, max: 55, label: '40 to 55' },
  cat_also_offered:   { max: 29, label: 'under 30' },
  cat_content_body:   { min: 200, max: 250, label: '200 to 250' },
  problem_body:       { min: 40, max: 60, label: '40 to 60' },
  cat_cost_intro:     { min: 30, max: 50, label: '30 to 50' },
  factor_body:        { min: 30, max: 45, label: '30 to 45' },
  step_body:          { min: 20, max: 30, label: '20 to 30' },
  cat_areas_intro:    { min: 40, max: 60, label: '40 to 60' },
  faq_answer:         { min: 30, max: 70, label: '30 to 70' },
  cat_final_cta_body: { min: 15, max: 25, label: '15 to 25' },
};

// Model fields of a category record, in page order, with a ref to write a rewrite back
function modelFields(record) {
  const out = [];
  const add = (label, ref, text, rangeKey) => out.push({ label, ref, text: text || '', rangeKey });
  add(LABELS.hero, { key: LABELS.hero }, record[LABELS.hero], LABELS.hero);
  add(LABELS.servicesIntro, { key: LABELS.servicesIntro }, record[LABELS.servicesIntro], LABELS.servicesIntro);
  (record.cards || []).forEach((c, i) => add(`card_text (${c.card_name})`, { key: 'cards', index: i, sub: 'card_text' }, c.card_text, 'card_text'));
  if (record[LABELS.alsoOffered] !== 'HIDDEN') add(LABELS.alsoOffered, { key: LABELS.alsoOffered }, record[LABELS.alsoOffered], LABELS.alsoOffered);
  add(LABELS.content, { key: LABELS.content }, record[LABELS.content], LABELS.content);
  (record.problems || []).forEach((p, i) => add(`problem_body (${p.problem_title})`, { key: 'problems', index: i, sub: 'problem_body' }, p.problem_body, 'problem_body'));
  add(LABELS.costIntro, { key: LABELS.costIntro }, record[LABELS.costIntro], LABELS.costIntro);
  (record.cost_factors || []).forEach((p, i) => add(`factor_body (${p.factor_title})`, { key: 'cost_factors', index: i, sub: 'factor_body' }, p.factor_body, 'factor_body'));
  (record.steps || []).forEach((s, i) => add(`step_body (${s.step_title})`, { key: 'steps', index: i, sub: 'step_body' }, s.step_body, 'step_body'));
  add(LABELS.areasIntro, { key: LABELS.areasIntro }, record[LABELS.areasIntro], LABELS.areasIntro);
  (record.faq_items || []).forEach((f, i) => add(`faq_answer (${f.faq_question})`, { key: 'faq_items', index: i, sub: 'faq_answer' }, f.faq_answer, 'faq_answer'));
  add(LABELS.finalCta, { key: LABELS.finalCta }, record[LABELS.finalCta], LABELS.finalCta);
  return out;
}

module.exports = {
  id: 'category',
  label: 'Category page',
  // Many per client: the key is the page map slug
  singleKey: null,
  LABELS, LIST_KEYS, OUTPUT_SPEC, RANGES,
  modelFields,
  replyLabels: /cat_[a-z_]+|card_name|card_text|problem_title|problem_body|factor_title|factor_body|step_title|step_body|faq_question|faq_answer|MODEL_FLAGS/,
  ranges: RANGES,
  validate: (record, V) => require('../validate-category').validateCategory(record, V),
  readerView: (record, values) => require('../category-reader').buildCategoryReaderView(record, values),
  // The WordPress mapping waits for the category template's field map (23 Oct): no push yet
  wp: {
    label: 'category page',
    fields: [],
    buildPayload: () => { throw new Error('Category pages cannot be pushed yet: the WordPress field map for the category template is not in Copybot.'); },
    findPage: async () => null,
    groups: [],
  },
};
