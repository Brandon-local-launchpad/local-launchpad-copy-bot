'use strict';

// ── Blog post record (Blog CORE (1), stage 4) ────────────────────────────────
// Merges the model fields with the code decisions into one record, in page order: the
// header (H1, byline, dates), the quick answer, the sections with the table under its
// section, the business block, the FAQ, the next step. Model text keeps its [CV: key]
// tokens and Markdown links. Hidden parts are marked HIDDEN. B5 builds the meta
// description here, from the first sentence of blog_answer plus the niche's meta CTA, at
// 155 characters; over, the CTA goes; still over, F-LEN-META.

const PT = require('../page-types/blog');
const { helpers } = require('../validate-v20');
const { sentences, scanText } = helpers;

const META_MAX = 155;

// B5: the meta description. Returns { text, how, flag }
function metaDescriptionFor(answer, metaCta) {
  const first = (sentences(answer || '')[0] || '').trim();
  if (!first) return { text: '', how: 'no answer', flag: { code: 'F-LEN-META', msg: 'No first sentence in blog_answer to build the meta description from.' } };
  const withCta = metaCta ? `${first} ${metaCta}`.trim() : first;
  if (withCta.length <= META_MAX) return { text: withCta, how: metaCta ? 'first sentence and the meta CTA' : 'first sentence', flag: null };
  if (first.length <= META_MAX) return { text: first, how: 'first sentence (the CTA dropped: over 155 with it)', flag: null };
  return { text: first, how: 'first sentence, over 155', flag: { code: 'F-LEN-META', msg: `The meta description is ${first.length} characters at its shortest (155 at most): the first sentence of blog_answer is too long.` } };
}

// "a ; b ; c" → ['a', 'b', 'c'], one cell per column after the row label
function splitCells(text, n) {
  const cells = String(text || '').split(/\s*;\s*/).map(c => c.trim()).filter((c, i, a) => c || i < a.length - 1);
  while (cells.length < n) cells.push('');
  return cells.slice(0, n);
}

function tokenButtons(buttons, cv) {
  return (buttons || []).map(b => (cv.phone && b === `Call ${cv.phone}`) ? 'Call [CV: phone]' : b);
}

function buildBlogRecord({ cv = {}, decisionsResult, parsed, meta, extraFlags = [] }) {
  const { gates = [], flags = [], decisions: D } = decisionsResult;
  const allFlags = [
    ...gates.map(g => ({ ...g, source: 'gate' })),
    ...flags.map(f => ({ ...f, source: 'code' })),
    ...extraFlags,
    ...(parsed ? parsed.flags.map(f => ({ ...f, source: 'parse' })) : []),
    ...(parsed ? parsed.modelFlags.map(f => ({ ...f, source: 'model' })) : []),
  ];
  const standIns = (cv.stand_ins || []).filter(Boolean);
  const record = {
    page: 'blog',
    ...(standIns.length ? { watermark: 'TEST: CONTAINS STAND-IN VALUES', can_mark_done: false } : {}),
    FLAGS: allFlags,
    VALIDATION: { status: 'not run' },
  };
  if (gates.length || !D) {
    record.blocked = true;
    record.meta = meta;
    return record;
  }
  const F = parsed.fields;
  // Paragraph breaks (Brandon, 28 Oct): a literal "\n\n" the parser kept, or two spaces where the
  // model meant a break, both become a real break
  const paras = s => { let t = String(s || '').replace(/\\n\\n|\\n/g, '\n\n'); if (!/\n/.test(t) && /\S {2,}\S/.test(t)) t = t.replace(/ {2,}/g, '\n\n'); return t; };
  const item = (list, i, key) => { const v = ((F[list] || [])[i] || {})[key] || ''; return key === 'body' || key === 'faq_answer' ? paras(v) : v; };
  const metaD = metaDescriptionFor(F[PT.LABELS.answer], D.meta_cta);
  if (metaD.flag) record.FLAGS.push({ ...metaD.flag, source: 'code' });
  const cols = D.table.columns || [];
  // cells_text keeps what the model wrote (its cell count included), so a wrong row is a BLOCK the
  // retry can fix (B-CELLS); cells are the split for the page
  const tableRows = D.table.show ? D.table.rows.map((r, i) => { const cellsText = String(item(PT.LABELS.table, i, 'cells') || '').trim(); const cells = splitCells(cellsText, Math.max(0, cols.length - 1)); return { row: r.label, cells, cells_text: cellsText || cells.join(' ; ') }; }) : [];
  if (D.table.show) for (const [i, r] of tableRows.entries()) { const got = String(item(PT.LABELS.table, i, 'cells') || '').split(/\s*;\s*/).filter(Boolean).length; if (got && got !== cols.length - 1) record.FLAGS.push({ code: 'P-CELLS', msg: `Table row "${r.row}": ${got} cell(s) for ${cols.length - 1} column(s).`, source: 'parse' }); }
  Object.assign(record, {
    post_type:              D.post_type,
    source:                 D.source,
    cost_mode:              D.cost_mode,
    page_slug:              D.slug,
    url:                    D.url,
    service:                D.service,
    category:               D.category,
    town:                   D.town,
    seo_title:              D.seo_title,
    meta_description:       metaD.text,
    meta_how:               metaD.how,
    breadcrumb:             [{ name: 'Home', url: '/' }, { name: 'Guides', url: '/guides/' }, { name: D.h1, url: D.url }],
    blog_h1:                D.h1,
    blog_byline:            D.byline,
    blog_last_checked:      D.last_checked,
    blog_last_checked_text: D.last_checked_text,
    blog_review_due:        D.review_due,
    publish_date:           D.publish_date,
    homepage_cost_guide:    !!D.homepage_cost_guide,
    [PT.LABELS.answer]:     paras(F[PT.LABELS.answer]),
    sections:               D.sections.map((s, i) => ({ h2: s.h2, body: item(PT.LABELS.sections, i, 'body'), doubt: s.doubt, id: s.id })),
    table_show:             !!D.table.show,
    table_type:             D.table.type,
    table_after:            D.table.after,
    table_columns:          D.table.show ? cols : [],
    table_rows:             tableRows,
    blog_business_show:     !!D.business.show,
    blog_business_h2:       D.business.show ? D.business.h2 : 'HIDDEN',
    [PT.LABELS.business]:   D.business.show ? paras(F[PT.LABELS.business]) : 'HIDDEN',
    blog_faq_h2:            D.faq_h2,
    faq_items:              D.faq.map((q, i) => ({ faq_question: q.question, faq_answer: item(PT.LABELS.faq, i, 'faq_answer'), doubt: q.doubt, id: q.id })),
    blog_cta_h2:            D.cta_h2,
    [PT.LABELS.closing]:    F[PT.LABELS.closing],
    buttons:                tokenButtons(D.buttons, cv),
    primary_link:           D.primary,
    secondary_links:        D.secondary,
    safety:                 D.safety,
    specificity:            D.specificity,
  });
  record.meta = meta;
  return record;
}

module.exports = { buildBlogRecord, metaDescriptionFor, splitCells, META_MAX };
