'use strict';

// ── Service page record (CORE (17), 25 Oct 2026) ─────────────────────────────
// Merges the model fields with the code decisions into one record, in page order:
// hero, What's Included, content block, block 4, steps, cost (block 5), reviews, areas,
// FAQ, More Services, final CTA. Model text keeps its [CV: key] tokens and Markdown
// links. Hidden sections are marked HIDDEN. The shape follows the category record.

const { LABELS } = require('./page-types/service');

// What the parser should expect, from the decisions result
function expectedFromServiceDecisions(D) {
  return {
    lists: {
      [LABELS.included]: D.included.map(it => it.title),
      [LABELS.block4]:   D.problems.map(p => p.title),
      [LABELS.block5]:   D.cost.map(p => p.title),
      [LABELS.steps]:    D.niche_steps.map(s => s.title),
      [LABELS.faq]:      D.faq.map(q => q.question),
    },
    hidden: { [LABELS.moreIntro]: !D.more.length },
  };
}

function tokenButtons(buttons, cv) {
  return (buttons || []).map(b => (cv.phone && b === `Call ${cv.phone}`) ? 'Call [CV: phone]' : b);
}

function buildServiceRecord({ cv, decisionsResult, parsed, meta, extraFlags = [] }) {
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
    page: 'service',
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
    service:                D.service,
    category:               D.category,
    town:                   D.town,
    page_slug:              D.slug,
    seo_title:              D.d3_title,
    meta_description:       D.d4_meta,
    breadcrumb:             D.breadcrumb,
    svc_hero_h1:            D.d2_h1,
    svc_hero_trust_line:    D.d5_trust || '',
    [LABELS.hero]:          F[LABELS.hero],
    svc_hero_rating_line:   D.d6_rating || '',
    buttons:                tokenButtons(D.d15_buttons, cv),
    svc_included_h2:        D.h2.included,
    [LABELS.includedIntro]: F[LABELS.includedIntro],
    included: D.included.map((it, i) => ({ item_title: it.title, item_text: item(LABELS.included, i, 'item_text') })),
    svc_content_h2:         D.h2.content,
    [LABELS.content]:       F[LABELS.content],
    svc_block4_h2:          D.h2.problems,
    block4: D.problems.map((p, i) => ({ card_title: p.title, card_body: item(LABELS.block4, i, 'card_body') })),
    svc_process_h2:         D.h2.process,
    steps: D.niche_steps.map((s, i) => ({ step_title: s.title, step_body: item(LABELS.steps, i, 'step_body') })),
    svc_block5_h2:          D.h2.cost,
    [LABELS.costIntro]:     F[LABELS.costIntro],
    block5: D.cost.map((p, i) => ({ card_title: p.title, card_body: item(LABELS.block5, i, 'card_body') })),
    svc_cost_price_line:    D.price_line || null,
    svc_reviews_show:       D.reviews.show,
    svc_reviews_h2:         D.reviews.show ? D.h2.reviews : 'HIDDEN',
    reviews:                D.reviews.show ? D.reviews.items.map(r => ({ text: r.text, name: r.name || '', town: r.town || '' })) : [],
    svc_areas_h2:           D.h2.areas,
    [LABELS.areasIntro]:    F[LABELS.areasIntro],
    // Base page: every town with a page for this service or its category is the list; the rest
    // are one "We also cover" line after it. Town page: the villages, unlinked, as the list.
    svc_areas_links: D.scope === 'base'
      ? D.areas.linked.map(a => ({ name: a.name, url: a.url }))
      : D.areas.plain.map(n => ({ name: n, url: null })),
    svc_areas_also_cover: D.scope === 'base' && D.areas.plain.length ? D.areas.plain.slice() : [],
    svc_faq_h2:             D.h2.faq,
    faq_items: D.faq.map((q, i) => ({ faq_question: q.question, faq_answer: item(LABELS.faq, i, 'faq_answer'), doubt: q.doubt })),
    svc_more_h2:            D.more.length ? D.h2.more : 'HIDDEN',
    [LABELS.moreIntro]:     D.more.length ? F[LABELS.moreIntro] : 'HIDDEN',
    more_cards:             D.more.map(c => ({ card_name: c.name, card_url: c.url, card_target: c.target })),
    svc_final_cta_h2:       D.h2.final_cta,
    [LABELS.finalCta]:      F[LABELS.finalCta],
    svc_final_cta_trust_lines: [cv.hours ? '[CV: hours]' : null, D.d6_rating].filter(Boolean),
  });
  record.meta = meta;
  return record;
}

module.exports = { buildServiceRecord, expectedFromServiceDecisions };
