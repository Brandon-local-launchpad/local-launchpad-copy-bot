'use strict';

// ── Page type: blog post (Blog CORE (1), 28 Oct 2026) ────────────────────────
// One type for the four post types (question, decision, local, cost guide): the record's
// post_type says which, and sets the word ranges. The field labels match the CORE (1) OUTPUT
// block; a label change there is a change here and nowhere else (LABELS, LIST_KEYS). Records
// are keyed by the post's slug (/guides/<slug>) in the v20 store.

const LABELS = {
  answer: 'blog_answer',
  sections: 'blog_sections',
  table: 'blog_table',
  business: 'blog_business',
  faq: 'blog_faq_items',
  closing: 'blog_closing',
};
const LIST_KEYS = {
  [LABELS.sections]: ['h2', 'body'],
  [LABELS.table]:    ['row', 'cells'],
  [LABELS.faq]:      ['faq_question', 'faq_answer'],
};
// The parser spec (v20-parse.js parseOutput)
const OUTPUT_SPEC = {
  scalars: [LABELS.answer, LABELS.business, LABELS.closing],
  lists: LIST_KEYS,
};

// Word ranges by rangeKey (CORE (1) "THE FIELDS YOU WRITE"); a section body's range is the post type's
const SECTION_RANGES = {
  cost_guide: { min: 150, max: 220, label: '150 to 220' },
  decision:   { min: 140, max: 200, label: '140 to 200' },
  question:   { min: 140, max: 200, label: '140 to 200' },
  local:      { min: 120, max: 180, label: '120 to 180' },
};
const RANGES = {
  blog_answer:   { min: 40, max: 60, label: '40 to 60' },
  blog_business: { min: 50, max: 80, label: '50 to 80' },
  faq_answer:    { min: 40, max: 70, label: '40 to 70' },
  blog_closing:  { min: 20, max: 40, label: '20 to 40' },
  'section_body:cost_guide': SECTION_RANGES.cost_guide,
  'section_body:decision':   SECTION_RANGES.decision,
  'section_body:question':   SECTION_RANGES.question,
  'section_body:local':      SECTION_RANGES.local,
};
const POST_TYPES = Object.keys(SECTION_RANGES);
const TYPE_LABEL = { cost_guide: 'cost guide', decision: 'decision', question: 'question', local: 'local' };

// Model fields of a blog record, in page order, with a ref to write a rewrite back
function modelFields(record) {
  const out = [];
  const add = (label, ref, text, rangeKey) => out.push({ label, ref, text: text || '', rangeKey });
  const type = POST_TYPES.includes(record.post_type) ? record.post_type : 'question';
  add(LABELS.answer, { key: LABELS.answer }, record[LABELS.answer], LABELS.answer);
  (record.sections || []).forEach((s, i) => add(`body (${s.h2})`, { key: 'sections', index: i, sub: 'body' }, s.body, `section_body:${type}`));
  if (record.table_show) (record.table_rows || []).forEach((r, i) => add(`cells (${r.row})`, { key: 'table_rows', index: i, sub: 'cells_text' }, r.cells_text, null));
  if (record.blog_business_show && record[LABELS.business] !== 'HIDDEN') add(LABELS.business, { key: LABELS.business }, record[LABELS.business], LABELS.business);
  (record.faq_items || []).forEach((f, i) => add(`faq_answer (${f.faq_question})`, { key: 'faq_items', index: i, sub: 'faq_answer' }, f.faq_answer, 'faq_answer'));
  add(LABELS.closing, { key: LABELS.closing }, record[LABELS.closing], LABELS.closing);
  return out;
}

module.exports = {
  id: 'blog',
  label: 'Blog post',
  // Many per client: the key is the post's slug (/guides/<slug>)
  singleKey: null,
  LABELS, LIST_KEYS, OUTPUT_SPEC, RANGES, SECTION_RANGES, POST_TYPES, TYPE_LABEL,
  modelFields,
  replyLabels: /blog_[a-z_]+|h2|body|row|cells|faq_question|faq_answer|MODEL_FLAGS/,
  ranges: RANGES,
  validate: (record, V) => require('../validate-blog').validateBlog(record, V),
  readerView: (record, values) => require('../blog/reader').buildBlogReaderView(record, values),
  // The WordPress mapping (stage 7): a post in the Guides category at /guides/<slug>/, made by the
  // push when the site has none, scheduled with its publish date (wp/blog-map.js)
  wp: {
    label: 'blog post',
    kind: 'post',
    get fields() { return require('../wp/blog-map').BLOG_FIELDS; },
    buildPayload: (record, opts) => require('../wp/blog-map').buildBlogPayload(record, opts),
    findPage: (site, record) => require('../wp/posts').findPost(site, require('../wp/blog-map').slugOf(record)),
    get groups() { return require('../wp/acf-schema').BLOG_GROUPS; },
  },
};
