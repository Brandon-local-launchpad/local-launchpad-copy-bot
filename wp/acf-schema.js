'use strict';

// ── Homepage and blog ACF field groups: the master copy ─────────────────────
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
const textarea = (name, label, extra = {}) => ({ name, label, type: 'textarea', ...extra });

const HOMEPAGE_GROUPS = [
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
    rep('home_process_steps', 'Steps', [t('step_title', 'Title'), html('step_body', 'Body')]),
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

// ── Blog post field groups (spec section 6; stage 7, 28 Oct 2026) ─────────────
// On every post in the Guides category. The field names are the Blog CORE (1) labels;
// wp/blog-map.js BLOG_FIELDS writes them. blog_image and its alt are the site's (push: false).
const BLOG_LOCATION = [[{ param: 'post_type', operator: '==', value: 'post' }, { param: 'post_category', operator: '==', value: 'category:guides' }]];
const BLOG_GROUPS = [
  { name: 'blog_header', title: 'Blog post: Header', location: BLOG_LOCATION, fields: [
    t('blog_h1', 'H1 (the target question)'), t('blog_byline', 'Byline'), t('blog_last_checked', 'Last checked (shown)'), t('blog_review_due', 'Review due (not shown)'),
    img('blog_image', 'Image'), t('blog_image_alt', 'Image alt text', { push: false }),
  ] },
  { name: 'blog_answer', title: 'Blog post: Quick answer', location: BLOG_LOCATION, fields: [html('blog_answer', 'Quick answer')] },
  { name: 'blog_sections', title: 'Blog post: Question sections', location: BLOG_LOCATION, fields: [
    rep('blog_sections', 'Sections', [t('section_h2', 'H2'), html('section_body', 'Body')]),
  ] },
  { name: 'blog_table', title: 'Blog post: Table', location: BLOG_LOCATION, fields: [
    bool('table_show', 'Show the table'), t('table_after', 'Under which section (1 based)'),
    rep('table_columns', 'Columns', [t('column_label', 'Column')]),
    rep('table_rows', 'Rows', [t('row_label', 'Row label'), t('cell_1', 'Cell 1'), t('cell_2', 'Cell 2'), t('cell_3', 'Cell 3')]),
  ] },
  { name: 'blog_business', title: 'Blog post: How we handle it', location: BLOG_LOCATION, fields: [
    bool('blog_business_show', 'Show this section'), t('blog_business_h2', 'H2'), html('blog_business', 'Body'),
  ] },
  { name: 'blog_faq', title: 'Blog post: FAQ', location: BLOG_LOCATION, fields: [
    t('blog_faq_h2', 'H2'), rep('blog_faq_items', 'Questions', [t('faq_question', 'Question'), html('faq_answer', 'Answer')]),
  ] },
  { name: 'blog_cta', title: 'Blog post: Next step', location: BLOG_LOCATION, fields: [
    t('blog_cta_h2', 'H2'), html('blog_closing', 'Closing'),
    rep('blog_buttons', 'Buttons', [t('button_label', 'Label'), t('button_url', 'URL')]),
    textarea('blog_schema', 'Schema JSON-LD (BlogPosting, FAQPage, BreadcrumbList)'),
  ] },
];
// Every group, the homepage's then the blog's (the plugin's ACF JSON)
const GROUPS = [...HOMEPAGE_GROUPS, ...BLOG_GROUPS];

// The ACF field types the push payload's kinds map to
const KIND_TO_TYPE = { text: 'text', html: 'wysiwyg', bool: 'true_false', repeater: 'repeater', textarea: 'textarea' };

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
  if (f.type === 'textarea') Object.assign(out, { rows: 8, new_lines: '' });
  if (f.type === 'image') Object.assign(out, { return_format: 'array', preview_size: 'medium', library: 'all' });
  if (f.type === 'repeater') Object.assign(out, { layout: 'block', button_label: 'Add row', sub_fields: f.sub_fields.map(s => acfField(s, f.name)) });
  return out;
}

function acfGroupJson(g, index) {
  return {
    key: `group_${PREFIX}_${g.name}`,
    title: g.title,
    fields: g.fields.map(f => acfField(f)),
    location: g.location || [[{ param: 'page_type', operator: '==', value: 'front_page' }]],
    menu_order: index,
    position: 'normal', style: 'default', label_placement: 'top', instruction_placement: 'label',
    hide_on_screen: '', active: true, description: g.location ? 'Local Launchpad blog post (master copy in the Copybot repo).' : 'Local Launchpad homepage (master copy in the Copybot repo).',
    show_in_rest: 1,
  };
}

module.exports = { GROUPS, HOMEPAGE_GROUPS, BLOG_GROUPS, KIND_TO_TYPE, acfGroupJson };
