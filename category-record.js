'use strict';

// ── Category page record (23 Oct 2026) ───────────────────────────────────────
// Merges the model fields with the code decisions into one record, in page order.
// Model text keeps its [CV: key] tokens and Markdown links. Hidden sections are
// marked HIDDEN. The shape follows the homepage record (v20-record.js).

const { LABELS } = require('./page-types/category');

// What the parser should expect, from the decisions result
function expectedFromCategoryDecisions(D) {
  return {
    lists: {
      [LABELS.cards]:    D.cards.map(c => c.name),
      [LABELS.problems]: D.problems.map(p => p.title),
      [LABELS.cost]:     D.cost.map(p => p.title),
      [LABELS.steps]:    D.niche_steps.map(s => s.title),
      [LABELS.faq]:      D.faq.map(q => q.question),
    },
    hidden: { [LABELS.alsoOffered]: !D.alsoOffered.length },
  };
}

function tokenButtons(buttons, cv) {
  return (buttons || []).map(b => (cv.phone && b === `Call ${cv.phone}`) ? 'Call [CV: phone]' : b);
}

function buildCategoryRecord({ cv, decisionsResult, parsed, meta, extraFlags = [] }) {
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
    page: 'category',
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
  const item = (list, i, key) => ((F[list] || [])[i] || {})[key] || '';
  Object.assign(record, {
    scope:                  D.scope,
    category:               D.category,
    town:                   D.town,
    page_slug:              D.slug,
    seo_title:              D.d3_title,
    meta_description:       D.d4_meta,
    breadcrumb:             D.breadcrumb,
    cat_hero_h1:            D.d2_h1,
    cat_hero_trust_line:    D.d5_trust || '',
    [LABELS.hero]:          F[LABELS.hero],
    cat_hero_rating_line:   D.d6_rating || '',
    buttons:                tokenButtons(D.d15_buttons, cv),
    cat_services_h2:        D.h2.services,
    [LABELS.servicesIntro]: F[LABELS.servicesIntro],
    cards: D.cards.map((c, i) => ({ card_name: c.name, card_text: item(LABELS.cards, i, 'card_text'), card_url: c.url, card_target: c.target })),
    [LABELS.alsoOffered]:   F[LABELS.alsoOffered],
    cat_content_h2:         D.h2.content,
    [LABELS.content]:       F[LABELS.content],
    cat_problems_h2:        D.h2.problems,
    problems: D.problems.map((p, i) => ({ problem_title: p.title, problem_body: item(LABELS.problems, i, 'problem_body') })),
    cat_cost_h2:            D.h2.cost,
    [LABELS.costIntro]:     F[LABELS.costIntro],
    cost_factors: D.cost.map((p, i) => ({ factor_title: p.title, factor_body: item(LABELS.cost, i, 'factor_body') })),
    cat_cost_price_line:    D.price_line || null,
    cat_reviews_show:       D.reviews.show,
    cat_reviews_h2:         D.reviews.show ? D.h2.reviews : 'HIDDEN',
    reviews:                D.reviews.show ? D.reviews.items.map(r => ({ text: r.text, name: r.name || '', town: r.town || '' })) : [],
    cat_process_h2:         D.h2.process,
    steps: D.niche_steps.map((s, i) => ({ step_title: s.title, step_body: item(LABELS.steps, i, 'step_body') })),
    cat_areas_h2:           D.h2.areas,
    [LABELS.areasIntro]:    F[LABELS.areasIntro],
    cat_areas_links: [
      ...D.areas.linked.map(a => ({ name: a.name, url: a.url })),
      ...D.areas.plain.map(n => ({ name: n, url: null })),
    ],
    cat_faq_h2:             D.h2.faq,
    faq_items: D.faq.map((q, i) => ({ faq_question: q.question, faq_answer: item(LABELS.faq, i, 'faq_answer'), doubt: q.doubt })),
    cat_final_cta_h2:       D.h2.final_cta,
    [LABELS.finalCta]:      F[LABELS.finalCta],
    cat_final_cta_trust_lines: [cv.hours ? '[CV: hours]' : null, D.d6_rating].filter(Boolean),
  });
  record.meta = meta;
  return record;
}

module.exports = { buildCategoryRecord, expectedFromCategoryDecisions };
