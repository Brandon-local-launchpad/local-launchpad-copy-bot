'use strict';

// ── Homepage ACF field groups: the master copy ──────────────────────────────
// One source for the plugin's ACF JSON (npm run wp:acf-json writes
// wp-plugin/llp-copybot/acf-json/) and for the push payload. Group and field
// names follow the build spec (Homepage Template v2, sections 1 to 11), plus the
// fields marked NEW. `push: false` fields belong to the template (images, the
// reviews widget) and are filled on the site, not by Copybot.
// Given imports this JSON; field names must not be changed on the site.

const PREFIX = 'llp';

const t = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
const html = (name, label, extra = {}) => ({ name, label, type: 'wysiwyg', ...extra });
const bool = (name, label, extra = {}) => ({ name, label, type: 'true_false', ...extra });
const img = (name, label) => ({ name, label, type: 'image', push: false });
const rep = (name, label, sub_fields, extra = {}) => ({ name, label, type: 'repeater', sub_fields, ...extra });

const GROUPS = [
  { name: 'home_hero', title: 'Homepage: Hero', fields: [
    t('home_hero_h1', 'H1'), t('home_hero_trust_line', 'Trust line'), html('home_hero_intro', 'Intro'),
    img('home_hero_background_image', 'Background image'),
  ] },
  { name: 'home_trusted', title: 'Homepage: Trusted & Rated By', fields: [
    bool('home_trusted_show', 'Show this section', { new: true }),
    rep('home_trusted_logos', 'Logos', [img('logo_image', 'Logo'), t('logo_caption', 'Caption'), t('logo_url', 'Register URL'), t('logo_tier', 'Tier')]),
  ] },
  { name: 'home_content_block', title: 'Homepage: Content block', fields: [
    t('home_content_block_h2', 'H2'), html('home_content_block_body', 'Body'),
    img('home_content_block_image', 'Image'), t('home_content_block_image_alt', 'Image alt text', { push: false }),
  ] },
  { name: 'home_services', title: 'Homepage: Services', fields: [
    t('home_services_h2', 'H2'), html('home_services_intro', 'Intro'),
    rep('home_services_cards', 'Cards', [t('card_name', 'Name'), html('card_text', 'Text'), img('card_image', 'Image'), t('card_url', 'Page URL')]),
    html('home_services_more_line', '"We also offer" line', { new: true }),
  ] },
  { name: 'home_why', title: 'Homepage: Why choose us', fields: [
    t('home_why_h2', 'H2'),
    rep('home_why_points', 'Points', [t('point_title', 'Title'), html('point_body', 'Body'), img('point_icon', 'Icon')]),
  ] },
  { name: 'home_reviews', title: 'Homepage: Reviews', fields: [
    bool('home_reviews_show', 'Show this section', { new: true }), t('home_reviews_h2', 'H2'),
    t('home_reviews_widget', 'Reviews widget shortcode', { push: false }), t('home_reviews_gbp_link', 'Google profile link', { push: false }),
  ] },
  { name: 'home_process', title: 'Homepage: Process', fields: [
    t('home_process_h2', 'H2'),
    rep('home_process_steps', 'Steps', [t('step_title', 'Title'), html('step_body', 'Body'), img('step_icon', 'Icon')]),
  ] },
  { name: 'home_cta_band', title: 'Homepage: CTA band', new: true, fields: [
    t('home_cta_band_heading', 'Heading', { new: true }), t('home_cta_band_line', 'Line', { new: true }),
  ] },
  { name: 'home_owner', title: 'Homepage: Meet the owner', fields: [
    bool('home_owner_show', 'Show this section'), t('home_owner_h2', 'H2'), html('home_owner_body', 'Body'),
    img('home_owner_photo', 'Photo'), t('home_owner_photo_alt', 'Photo alt text', { push: false }),
  ] },
  { name: 'home_areas', title: 'Homepage: Areas', fields: [
    t('home_areas_h2', 'H2'), html('home_areas_intro', 'Intro'),
    rep('home_areas_links', 'Area list', [t('area_name', 'Area'), t('link_text', 'Link text'), t('page_url', 'Page URL')]),
  ] },
  { name: 'home_faq', title: 'Homepage: FAQ', fields: [
    t('home_faq_h2', 'H2'),
    rep('home_faq_items', 'Questions', [t('faq_question', 'Question'), html('faq_answer', 'Answer')]),
  ] },
  { name: 'home_final_cta', title: 'Homepage: Final CTA', fields: [
    t('home_final_cta_h2', 'H2'), html('home_final_cta_body', 'Body', { new: true }),
  ] },
];

// The legal pages: one rich text field, attached by page template. Given makes the template; the
// value below goes in the group's location rule, so it must match (docs/Legal_Pages_Given_Setup.md).
const LEGAL_TEMPLATE = 'templates/legal-page.php';
const LEGAL_GROUPS = [
  { name: 'legal', title: 'Legal page', template: LEGAL_TEMPLATE, description: 'Local Launchpad legal page: fixed wording filled by Copybot.', fields: [html('legal_body', 'Legal page text')] },
];

// ── The inner pages (13 Nov 2026) ────────────────────────────────────────────
// Three sets of groups cover the five inner page types: a base page and its town version
// share a set (docs/WordPress_Field_Map.md). The names are the records' own (page-types/*.js
// LABELS, wp/field-names.js). Each group attaches by post type (wp/post-types.js), so a new
// entry in one of those post types has its fields with nothing set by hand.
const { postTypesForSet } = require('./post-types');

const SET_TITLES = { cat: 'Category', svc: 'Service', loc: 'Location' };

function innerSet(p) {
  const hero = { name: `${p}_hero`, title: 'Hero', fields: [
    t(`${p}_hero_h1`, 'H1'), t(`${p}_hero_trust_line`, 'Trust line'), html(`${p}_hero_intro`, 'Intro'), img(`${p}_hero_background_image`, 'Background image'),
  ] };
  const services = { name: `${p}_services`, title: 'Services', fields: [
    t(`${p}_services_h2`, 'H2'), html(`${p}_services_intro`, 'Intro'),
    rep(`${p}_services_cards`, 'Cards', [t('card_name', 'Name'), html('card_text', 'Text'), img('card_image', 'Image'), t('card_url', 'Page URL')]),
    ...(p === 'cat' ? [html('cat_also_offered', '"We also offer" line')] : []),
  ] };
  const included = { name: 'svc_included', title: 'What is included', fields: [
    t('svc_included_h2', 'H2'), html('svc_included_intro', 'Intro'),
    rep('svc_included_items', 'Items', [t('item_title', 'Title'), t('item_text', 'Text')]),
  ] };
  const content = { name: `${p}_content`, title: 'Content block', fields: [
    t(`${p}_content_h2`, 'H2'), html(`${p}_content_body`, 'Body'),
    img(`${p}_content_image`, 'Image'), t(`${p}_content_image_alt`, 'Image alt text', { push: false }),
  ] };
  const block4 = { name: `${p}_block4`, title: 'Block 4', fields: [
    t(`${p}_block4_h2`, 'H2'), rep(`${p}_block4`, 'Cards', [t('card_title', 'Title'), html('card_body', 'Body')]),
  ] };
  const block5 = { name: `${p}_block5`, title: 'Block 5 (cost)', fields: [
    t(`${p}_block5_h2`, 'H2'), html(`${p}_cost_intro`, 'Intro'),
    rep(`${p}_block5`, 'Cards', [t('card_title', 'Title'), html('card_body', 'Body')]),
    t(`${p}_cost_price_line`, 'Price line'),
  ] };
  const reviews = { name: `${p}_reviews`, title: 'Reviews', fields: [
    bool(`${p}_reviews_show`, 'Show this section'), t(`${p}_reviews_h2`, 'H2'),
    rep(`${p}_reviews`, 'Reviews', [html('review_text', 'Review'), t('review_name', 'Name'), t('review_town', 'Town')]),
  ] };
  const process = { name: `${p}_process`, title: 'Process', fields: [
    t(`${p}_process_h2`, 'H2'),
    rep(`${p}_process_steps`, 'Steps', [t('step_title', 'Title'), html('step_body', 'Body'), img('step_icon', 'Icon')]),
  ] };
  const areas = { name: `${p}_areas`, title: 'Areas', fields: [
    t(`${p}_areas_h2`, 'H2'), html(`${p}_areas_intro`, 'Intro'),
    rep(`${p}_areas_links`, 'Area list', [t('area_name', 'Area'), t('page_url', 'Page URL')]),
    ...(p === 'loc' ? [] : [t(`${p}_areas_also_cover`, '"We also cover" names')]),
  ] };
  const faq = { name: `${p}_faq`, title: 'FAQ', fields: [
    t(`${p}_faq_h2`, 'H2'), rep(`${p}_faq_items`, 'Questions', [t('faq_question', 'Question'), html('faq_answer', 'Answer')]),
  ] };
  const more = { name: 'svc_more', title: 'More services', fields: [
    t('svc_more_h2', 'H2'), html('svc_more_intro', 'Intro'), rep('svc_more_cards', 'Cards', [t('card_name', 'Name'), t('card_url', 'Page URL')]),
  ] };
  const finalCta = { name: `${p}_final_cta`, title: 'Final CTA', fields: [t(`${p}_final_cta_h2`, 'H2'), html(`${p}_final_cta_body`, 'Body')] };
  const gallery = { name: `${p}_gallery`, title: 'Gallery', fields: [
    { ...rep(`${p}_gallery`, 'Photos', [img('gallery_image', 'Photo'), t('gallery_alt', 'Alt text', { push: false })]), push: false },
  ] };
  // Page order, per template
  const order = p === 'svc'
    ? [hero, included, content, block4, process, block5, reviews, areas, faq, more, finalCta, gallery]
    : [hero, services, content, block4, block5, reviews, process, areas, faq, finalCta, gallery];
  return order.map(g => ({
    ...g, set: p, title: `${SET_TITLES[p]} page: ${g.title}`, post_types: postTypesForSet(p),
    description: `Local Launchpad ${SET_TITLES[p].toLowerCase()} page (master copy in the Copybot repo).`,
  }));
}

const INNER_GROUPS = ['cat', 'svc', 'loc'].flatMap(innerSet);

// The ACF field types the push payload's kinds map to
const KIND_TO_TYPE = { text: 'text', html: 'wysiwyg', bool: 'true_false', repeater: 'repeater' };

function key(...parts) { return `field_${PREFIX}_${parts.join('_')}`; }

function acfField(f, parentName) {
  const out = {
    key: parentName ? key(parentName, f.name) : key(f.name),
    label: f.label, name: f.name, type: f.type,
    instructions: f.push === false ? 'Filled on the site, not by Copybot.' : 'Written by Copybot. Edits here are overwritten by the next push.',
    required: 0, conditional_logic: 0, show_in_rest: 1,
  };
  if (f.type === 'wysiwyg') Object.assign(out, { tabs: 'all', toolbar: 'basic', media_upload: 0 });
  if (f.type === 'true_false') Object.assign(out, { ui: 1, default_value: 0 });
  if (f.type === 'image') Object.assign(out, { return_format: 'array', preview_size: 'medium', library: 'all' });
  if (f.type === 'repeater') Object.assign(out, { layout: 'block', button_label: 'Add row', sub_fields: f.sub_fields.map(s => acfField(s, f.name)) });
  return out;
}

function acfGroupJson(g, index) {
  return {
    key: `group_${PREFIX}_${g.name}`,
    title: g.title,
    fields: g.fields.map(f => acfField(f)),
    // A post type rule per post type (any one matches), else the page template, else the front page
    location: g.post_types ? g.post_types.map(pt => [{ param: 'post_type', operator: '==', value: pt }]) : [[g.template ? { param: 'page_template', operator: '==', value: g.template } : { param: 'page_type', operator: '==', value: 'front_page' }]],
    menu_order: index,
    position: 'normal', style: 'default', label_placement: 'top', instruction_placement: 'label',
    hide_on_screen: '', active: true, description: g.description || 'Local Launchpad homepage (master copy in the Copybot repo).',
    show_in_rest: 1,
  };
}

module.exports = { GROUPS, LEGAL_GROUPS, INNER_GROUPS, LEGAL_TEMPLATE, KIND_TO_TYPE, acfGroupJson };
