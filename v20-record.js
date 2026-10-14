'use strict';

// ── v20 page record (Stage 6) ────────────────────────────────────────────────
// Merges the model fields with the code, niche and CV fields into one record,
// in page order, using the brief §5 field names. Model text keeps its [CV: key]
// tokens and Markdown links. Hidden sections are marked false or HIDDEN.

// What the parser should expect, from the decisions result
function expectedFromDecisions(D) {
  return {
    cards:  D.d9.main.map(c => c.name),
    points: D.d10_why.map(p => p.title),
    steps:  (D.niche_steps || []).map(s => s.title),
    faqs:   D.d11_faq.map(q => q.question),
    hidden: {
      home_owner_body:         D.d7.sec9 === 'HIDDEN',
      home_services_more_line: !D.d9.alsoOffer.length,
    },
  };
}

// "Call 023 0000 0000" → "Call [CV: phone]"
function tokenButtons(buttons, cv) {
  return (buttons || []).map(b => (cv.phone && b === `Call ${cv.phone}`) ? 'Call [CV: phone]' : b);
}

function buildPageRecord({ cv, decisionsResult, parsed, meta, extraFlags = [] }) {
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
    page: 'homepage',
    // N16: any stand-in value watermarks the record and it can't be marked Done
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
  const shown = v => v === 'SHOWN';
  const areas = D.d12_areas;

  Object.assign(record, {
    seo_title:              D.d3_title,
    meta_description:       D.d4_meta,
    home_hero_h1:           D.d2_h1,
    home_hero_trust_line:   D.d5_trust || '',
    home_hero_intro:        F.home_hero_intro,
    home_hero_rating_line:  D.d6_rating || '',
    buttons:                tokenButtons(D.d15_buttons, cv),
    home_trusted_logos:     shown(D.d7.sec2) ? D.trusted_logos : 'HIDDEN',
    home_content_block_h2:  D.d8.content,
    home_content_block_body: F.home_content_block_body,
    home_services_h2:       D.d8.services,
    home_services_intro:    F.home_services_intro,
    cards: D.d9.main.map((c, i) => ({
      card_name: c.name,
      card_text: (F.home_services_cards[i] || {}).card_text || '',
      card_url:  c.linked ? c.url : null,
    })),
    home_services_more_line: F.home_services_more_line,
    home_why_h2:            D.d8.why,
    points: D.d10_why.map((p, i) => ({ point_title: p.title, point_body: (F.home_why_points[i] || {}).point_body || '' })),
    home_reviews_show:      shown(D.d7.sec6),
    home_reviews_h2:        shown(D.d7.sec6) ? D.d8.reviews : 'HIDDEN',
    home_process_h2:        D.d8.process,
    steps: (D.niche_steps || []).map((s, i) => ({ step_title: s.title, step_body: (F.home_process_steps[i] || {}).step_body || '' })),
    cta_band: {
      heading: D.cta_band.heading,
      line:    D.cta_band.line,
      buttons: tokenButtons(D.cta_band.buttons, cv),
    },
    home_owner_show:        shown(D.d7.sec9),
    home_owner_h2:          shown(D.d7.sec9) ? D.d8.owner : 'HIDDEN',
    home_owner_body:        shown(D.d7.sec9) ? F.home_owner_body : 'HIDDEN',
    home_areas_h2:          D.d8.areas,
    home_areas_intro:       F.home_areas_intro,
    home_areas_links: [
      ...(areas.primaryCity ? [{ name: areas.primaryCity, url: null }] : []),
      ...areas.linked.map(a => ({ name: a.name, url: a.url })),
      ...areas.plain.map(n => ({ name: n, url: null })),
    ],
    home_faq_h2:            D.d8.faq,
    faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: (F.home_faq_items[i] || {}).faq_answer || '' })),
    home_final_cta_h2:      D.d8.final_cta,
    home_final_cta_body:    F.home_final_cta_body,
    home_final_cta_trust_lines: D.final_cta_trust_lines,
  });
  record.meta = meta;
  return record;
}

module.exports = { buildPageRecord, expectedFromDecisions };
