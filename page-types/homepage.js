'use strict';

// ── Page type: homepage (v20) ────────────────────────────────────────────────
// What the shared pipeline needs to know about the homepage: its model fields,
// word ranges, validator, reader view and WordPress mapping. Shared modules
// (edits, retries, claims review, re-validation, dry run, push) ask the page
// type registry for these instead of assuming the homepage.
// Requires are lazy: validate-v20 itself asks the registry for modelFields.

// Model fields of a homepage record, in page order, with a ref to write a rewrite back
function modelFields(record) {
  const out = [];
  const add = (label, ref, text, rangeKey) => out.push({ label, ref, text: text || '', rangeKey });
  add('home_hero_intro', { key: 'home_hero_intro' }, record.home_hero_intro, 'home_hero_intro');
  add('home_content_block_body', { key: 'home_content_block_body' }, record.home_content_block_body, 'home_content_block_body');
  add('home_services_intro', { key: 'home_services_intro' }, record.home_services_intro, 'home_services_intro');
  (record.cards || []).forEach((c, i) => add(`card_text (${c.card_name})`, { key: 'cards', index: i, sub: 'card_text' }, c.card_text, 'card_text'));
  if (record.home_services_more_line !== 'HIDDEN') add('home_services_more_line', { key: 'home_services_more_line' }, record.home_services_more_line, null);
  (record.points || []).forEach((p, i) => add(`point_body (${p.point_title})`, { key: 'points', index: i, sub: 'point_body' }, p.point_body, 'point_body'));
  (record.steps || []).forEach((s, i) => add(`step_body (${s.step_title})`, { key: 'steps', index: i, sub: 'step_body' }, s.step_body, 'step_body'));
  if (record.home_owner_body !== 'HIDDEN') add('home_owner_body', { key: 'home_owner_body' }, record.home_owner_body, 'home_owner_body');
  add('home_areas_intro', { key: 'home_areas_intro' }, record.home_areas_intro, 'home_areas_intro');
  (record.faq_items || []).forEach((f, i) => add(`faq_answer (${f.faq_question})`, { key: 'faq_items', index: i, sub: 'faq_answer' }, f.faq_answer, 'faq_answer'));
  add('home_final_cta_body', { key: 'home_final_cta_body' }, record.home_final_cta_body, 'home_final_cta_body');
  return out;
}

module.exports = {
  id: 'homepage',
  label: 'Homepage',
  // One homepage per client, so its key is fixed
  singleKey: 'homepage',
  modelFields,
  // Field labels the model writes; a retry reply carrying another one isn't a single field
  replyLabels: /home_[a-z_]+|card_name|card_text|point_title|point_body|step_title|step_body|faq_question|faq_answer|MODEL_FLAGS/,
  get ranges() { return require('../validate-v20').RANGES; },
  validate: (record, V) => require('../validate-v20').validateV20(record, V),
  readerView: (record, values) => require('../v20-reader').buildReaderView(record, values),
  wp: {
    label: 'homepage',
    get fields() { return require('../wp/homepage-map').HOMEPAGE_FIELDS; },
    buildPayload: (record, opts) => require('../wp/homepage-map').buildHomepagePayload(record, opts),
    findPage: site => require('../wp/client').findHomepage(site),
    get groups() { return require('../wp/acf-schema').GROUPS; },
  },
};
