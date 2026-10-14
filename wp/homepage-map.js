'use strict';

// ── Homepage record → WordPress (ACF Pro + SEO plugin) ───────────────────────
// Field names follow the build spec's ACF field groups (Homepage Template v2,
// sections 1 to 11). Fields marked NEW are not in the spec yet; the plugin's ACF
// JSON (the master copy, later slice) adds them:
//   home_trusted_show, home_reviews_show (true/false, like home_owner_show)
//   home_services_more_line
//   home_cta_band_heading, home_cta_band_line (the CTA band the brief brought back)
//   home_final_cta_body
// Images, the map, buttons, the rating line and the final CTA trust lines are not
// pushed: Given adds images, and the rest come from the site's Client Values,
// which also resolve the [CV: key] tokens left in the copy (WordPress side).

const { mdToHtml } = require('./markdown');

const SEO_ADAPTERS = {
  // Rank Math stores these as post meta; the plugin exposes them to the REST API
  rankmath: (title, description) => ({ rank_math_title: title, rank_math_description: description }),
  yoast:    (title, description) => ({ _yoast_wpseo_title: title, _yoast_wpseo_metadesc: description }),
};

// Every field the push writes, with its kind: text (plain), html (Markdown → HTML),
// bool, or a repeater with its sub fields
const HOMEPAGE_FIELDS = [
  ['home_hero_h1', 'text'], ['home_hero_trust_line', 'text'], ['home_hero_intro', 'html'],
  ['home_trusted_show', 'bool'], ['home_trusted_logos', 'repeater', { logo_caption: 'text', logo_url: 'text', logo_tier: 'text' }],
  ['home_content_block_h2', 'text'], ['home_content_block_body', 'html'],
  ['home_services_h2', 'text'], ['home_services_intro', 'html'],
  ['home_services_cards', 'repeater', { card_name: 'text', card_text: 'html', card_url: 'text' }],
  ['home_services_more_line', 'html'],
  ['home_why_h2', 'text'], ['home_why_points', 'repeater', { point_title: 'text', point_body: 'html' }],
  ['home_reviews_show', 'bool'], ['home_reviews_h2', 'text'],
  ['home_process_h2', 'text'], ['home_process_steps', 'repeater', { step_title: 'text', step_body: 'html' }],
  ['home_cta_band_heading', 'text'], ['home_cta_band_line', 'text'],
  ['home_owner_show', 'bool'], ['home_owner_h2', 'text'], ['home_owner_body', 'html'],
  ['home_areas_h2', 'text'], ['home_areas_intro', 'html'],
  ['home_areas_links', 'repeater', { area_name: 'text', link_text: 'text', page_url: 'text' }],
  ['home_faq_h2', 'text'], ['home_faq_items', 'repeater', { faq_question: 'text', faq_answer: 'html' }],
  ['home_final_cta_h2', 'text'], ['home_final_cta_body', 'html'],
];

const hidden = v => v === 'HIDDEN' || v === false;
const orEmpty = v => (hidden(v) ? '' : (v || ''));

function buildHomepagePayload(record, { seo = 'rankmath' } = {}) {
  if (!SEO_ADAPTERS[seo]) throw new Error(`Unknown SEO plugin "${seo}". Known: ${Object.keys(SEO_ADAPTERS).join(', ')}`);
  const html = t => mdToHtml(orEmpty(t));
  const logos = Array.isArray(record.home_trusted_logos) ? record.home_trusted_logos : [];

  const acf = {
    home_hero_h1:            record.home_hero_h1,
    home_hero_trust_line:    record.home_hero_trust_line || '',
    home_hero_intro:         html(record.home_hero_intro),
    home_trusted_show:       logos.length > 0,
    home_trusted_logos:      logos.map(l => ({ logo_caption: l.caption || l.name || '', logo_url: l.register_url || '', logo_tier: l.tier || '' })),
    home_content_block_h2:   record.home_content_block_h2,
    home_content_block_body: html(record.home_content_block_body),
    home_services_h2:        record.home_services_h2,
    home_services_intro:     html(record.home_services_intro),
    home_services_cards:     (record.cards || []).map(c => ({ card_name: c.card_name, card_text: html(c.card_text), card_url: c.card_url || '' })),
    home_services_more_line: html(record.home_services_more_line),
    home_why_h2:             record.home_why_h2,
    home_why_points:         (record.points || []).map(p => ({ point_title: p.point_title, point_body: html(p.point_body) })),
    home_reviews_show:       !!record.home_reviews_show,
    home_reviews_h2:         orEmpty(record.home_reviews_h2),
    home_process_h2:         record.home_process_h2,
    home_process_steps:      (record.steps || []).map(s => ({ step_title: s.step_title, step_body: html(s.step_body) })),
    home_cta_band_heading:   record.cta_band ? record.cta_band.heading : '',
    home_cta_band_line:      record.cta_band ? record.cta_band.line : '',
    home_owner_show:         !!record.home_owner_show,
    home_owner_h2:           orEmpty(record.home_owner_h2),
    home_owner_body:         html(record.home_owner_body),
    home_areas_h2:           record.home_areas_h2,
    home_areas_intro:        html(record.home_areas_intro),
    home_areas_links:        (record.home_areas_links || []).map(a => ({ area_name: a.name, link_text: a.name, page_url: a.url || '' })),
    home_faq_h2:             record.home_faq_h2,
    home_faq_items:          (record.faq_items || []).map(f => ({ faq_question: f.faq_question, faq_answer: html(f.faq_answer) })),
    home_final_cta_h2:       record.home_final_cta_h2,
    home_final_cta_body:     html(record.home_final_cta_body),
  };
  return { acf, meta: SEO_ADAPTERS[seo](record.seo_title, record.meta_description) };
}

module.exports = { buildHomepagePayload, HOMEPAGE_FIELDS, SEO_ADAPTERS };
