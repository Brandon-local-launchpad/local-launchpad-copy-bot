'use strict';

// ── Location page record (CORE (18), 27 Oct 2026) ────────────────────────────
// Merges the model fields with the code decisions into one record, in page order:
// hero, services and cards, content block, block 4, cost (block 5), reviews, steps,
// areas, FAQ, final CTA. Model text keeps its [CV: key] tokens and Markdown links.
// Hidden sections are marked HIDDEN. The shape follows the category record.

const { LABELS } = require('./page-types/location');

// What the parser should expect, from the decisions result
function expectedFromLocationDecisions(D) {
  return {
    lists: {
      [LABELS.cards]:  D.cards.map(c => c.name),
      [LABELS.block4]: D.problems.map(p => p.title),
      [LABELS.block5]: D.cost.map(p => p.title),
      [LABELS.steps]:  D.niche_steps.map(s => s.title),
      [LABELS.faq]:    D.faq.map(q => q.question),
    },
    hidden: {},
  };
}

function tokenButtons(buttons, cv) {
  return (buttons || []).map(b => (cv.phone && b === `Call ${cv.phone}`) ? 'Call [CV: phone]' : b);
}

function buildLocationRecord({ cv, decisionsResult, parsed, meta, extraFlags = [] }) {
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
    page: 'location',
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
    scope:                  'town',
    town:                   D.town,
    page_slug:              D.slug,
    seo_title:              D.d3_title,
    meta_description:       D.d4_meta,
    breadcrumb:             D.breadcrumb,
    loc_hero_h1:            D.d2_h1,
    loc_hero_trust_line:    D.d5_trust || '',
    [LABELS.hero]:          F[LABELS.hero],
    loc_hero_rating_line:   D.d6_rating || '',
    buttons:                tokenButtons(D.d15_buttons, cv),
    loc_services_h2:        D.h2.services,
    [LABELS.servicesIntro]: F[LABELS.servicesIntro],
    cards: D.cards.map((c, i) => ({ card_name: c.name, card_text: item(LABELS.cards, i, 'card_text'), card_url: c.url, card_target: c.target })),
    loc_content_h2:         D.h2.content,
    [LABELS.content]:       F[LABELS.content],
    loc_block4_h2:          D.h2.problems,
    block4: D.problems.map((p, i) => ({ card_title: p.title, card_body: item(LABELS.block4, i, 'card_body') })),
    loc_block5_h2:          D.h2.cost,
    [LABELS.costIntro]:     F[LABELS.costIntro],
    block5: D.cost.map((p, i) => ({ card_title: p.title, card_body: item(LABELS.block5, i, 'card_body') })),
    loc_cost_price_line:    D.price_line || null,
    loc_reviews_show:       D.reviews.show,
    loc_reviews_h2:         D.reviews.show ? D.h2.reviews : 'HIDDEN',
    reviews:                D.reviews.show ? D.reviews.items.map(r => ({ text: r.text, name: r.name || '', town: r.town || '' })) : [],
    loc_process_h2:         D.h2.process,
    steps: D.niche_steps.map((s, i) => ({ step_title: s.title, step_body: item(LABELS.steps, i, 'step_body') })),
    loc_areas_h2:           D.h2.areas,
    [LABELS.areasIntro]:    F[LABELS.areasIntro],
    // The villages and neighbourhoods around the town, unlinked (code places the list)
    loc_areas_links:        D.areas.plain.map(n => ({ name: n, url: null })),
    loc_faq_h2:             D.h2.faq,
    faq_items: D.faq.map((q, i) => ({ faq_question: q.question, faq_answer: item(LABELS.faq, i, 'faq_answer'), doubt: q.doubt })),
    loc_final_cta_h2:       D.h2.final_cta,
    [LABELS.finalCta]:      F[LABELS.finalCta],
    loc_final_cta_trust_lines: [cv.hours ? '[CV: hours]' : null, D.d6_rating].filter(Boolean),
  });
  record.meta = meta;
  return record;
}

module.exports = { buildLocationRecord, expectedFromLocationDecisions };
