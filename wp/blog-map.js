'use strict';

// ── Blog record → WordPress post (ACF Pro + SEO plugin), stage 7, 28 Oct 2026 ──
// A post in the Guides category at /guides/<slug>/ (spec section 10). The ACF field names
// follow spec section 6 (the Blog CORE (1) labels); wp/acf-schema.js BLOG_GROUPS is the
// master copy the plugin's ACF JSON is written from. The post's own fields: the title (the
// H1), the slug from the page map, the category, and the status: "future" with date_gmt
// (the publish date at 09:00 Europe/London) when the date is still to come, "draft" when
// the post has no date (a launch post without a launch date) or its date has passed (the
// daily job publishes; stage 8). A push never sets "publish".
// Images (blog_image, its alt) are the site's. Tokens ([CV: key]) stay for the site to
// resolve. The schema (BlogPosting, FAQPage, BreadcrumbList) goes as JSON-LD text for the
// template to print; the publisher is the LocalBusiness @id in [CV: business_schema_id].

const { mdToHtml } = require('./markdown');
const { SEO_ADAPTERS } = require('./homepage-map');

const PUBLISH_TIME = '09:00';
const GUIDES = { name: 'Guides', slug: 'guides' };

// Every field the push writes, with its kind (the dry run's diff and the read back use it)
const BLOG_FIELDS = [
  ['blog_h1', 'text'], ['blog_byline', 'text'], ['blog_last_checked', 'text'], ['blog_review_due', 'text'],
  ['blog_answer', 'html'],
  ['blog_sections', 'repeater', { section_h2: 'text', section_body: 'html' }],
  ['table_show', 'bool'], ['table_after', 'text'],
  ['table_columns', 'repeater', { column_label: 'text' }],
  ['table_rows', 'repeater', { row_label: 'text', cell_1: 'text', cell_2: 'text', cell_3: 'text' }],
  ['blog_business_show', 'bool'], ['blog_business_h2', 'text'], ['blog_business', 'html'],
  ['blog_faq_h2', 'text'], ['blog_faq_items', 'repeater', { faq_question: 'text', faq_answer: 'html' }],
  ['blog_cta_h2', 'text'], ['blog_closing', 'html'],
  ['blog_buttons', 'repeater', { button_label: 'text', button_url: 'text' }],
  ['blog_schema', 'textarea'],
];

const hidden = v => v === 'HIDDEN' || v === false || v === undefined || v === null;
const orEmpty = v => (hidden(v) ? '' : String(v));

// The slug WordPress gets: the last part of the page map's /guides/<slug>
function slugOf(record) {
  const s = String(record.page_slug || record.url || '').replace(/\/+$/, '');
  return s.split('/').filter(Boolean).pop() || '';
}

// Europe/London wall clock → the UTC instant, as WordPress wants date_gmt ("YYYY-MM-DDTHH:MM:SS")
const londonParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
function londonOffsetMinutes(at) {
  const p = Object.fromEntries(londonParts.formatToParts(at).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}
function londonToUtc(date, time = PUBLISH_TIME) {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], hh, mm, 0);
  let guess = wall;
  for (let i = 0; i < 2; i++) guess = wall - londonOffsetMinutes(new Date(guess)) * 60000;
  return new Date(guess).toISOString().replace(/\.\d{3}Z$/, '');
}

// The post's status and date for a record: future with its date, else a draft, and why
function scheduleFor(record, { now = new Date() } = {}) {
  const dateGmt = londonToUtc(record.publish_date);
  if (!dateGmt) return { status: 'draft', date_gmt: null, why: 'no publish date (the client has no launch date yet): a draft' };
  if (new Date(dateGmt + 'Z').getTime() > now.getTime()) return { status: 'future', date_gmt: dateGmt, why: `scheduled for ${record.publish_date} at ${PUBLISH_TIME} Europe/London` };
  return { status: 'draft', date_gmt: dateGmt, why: `its date (${record.publish_date}) has passed: a draft for the daily job to publish` };
}

// The schema the template prints (spec section 10): BlogPosting with the publisher's @id as a
// token, FAQPage from the FAQ items, BreadcrumbList from the record's trail. Plain text only:
// a Markdown link in an answer is its words.
const plain = t => String(t || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s*\n\s*/g, ' ').trim();
function blogSchema(record) {
  const byline = String(record.blog_byline || '');
  const person = byline.match(/^By\s+(.+?),\s/);
  const author = person ? { '@type': 'Person', name: person[1] } : { '@type': 'Organization', name: '[CV: company_name]' };
  const posting = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: record.blog_h1 || '', author,
    datePublished: record.publish_date || '', dateModified: record.blog_last_checked || '',
    publisher: { '@id': '[CV: business_schema_id]' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': record.url || '' },
  };
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: (record.faq_items || []).map(f => ({ '@type': 'Question', name: f.faq_question, acceptedAnswer: { '@type': 'Answer', text: plain(f.faq_answer) } })),
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: (record.breadcrumb || []).map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url })),
  };
  return JSON.stringify([posting, faq, crumbs], null, 2);
}

// The buttons: the niche's primary action to /contact/, "Call [CV: phone]" as a tel link
function buttonsOf(record) {
  return (record.buttons || []).map(label => ({ button_label: label, button_url: /^call\b/i.test(label) ? 'tel:[CV: phone]' : '/contact/' }));
}

function buildBlogPayload(record, { seo = 'rankmath', now = new Date() } = {}) {
  if (!SEO_ADAPTERS[seo]) throw new Error(`Unknown SEO plugin "${seo}". Known: ${Object.keys(SEO_ADAPTERS).join(', ')}`);
  const html = t => mdToHtml(orEmpty(t));
  const cols = Array.isArray(record.table_columns) ? record.table_columns : [];
  const rows = record.table_show && Array.isArray(record.table_rows) ? record.table_rows : [];
  const cells = r => { const c = Array.isArray(r.cells) ? r.cells : []; return { cell_1: c[0] || '', cell_2: c[1] || '', cell_3: c[2] || '' }; };
  const businessOn = !!record.blog_business_show && !hidden(record.blog_business);
  const acf = {
    blog_h1:            record.blog_h1 || '',
    blog_byline:        record.blog_byline || '',
    blog_last_checked:  record.blog_last_checked_text || record.blog_last_checked || '',
    blog_review_due:    record.blog_review_due || '',
    blog_answer:        html(record.blog_answer),
    blog_sections:      (record.sections || []).map(s => ({ section_h2: s.h2 || '', section_body: html(s.body) })),
    table_show:         !!record.table_show && rows.length > 0,
    table_after:        record.table_show && rows.length ? String(record.table_after || 1) : '',
    table_columns:      record.table_show && rows.length ? cols.map(c => ({ column_label: c })) : [],
    table_rows:         rows.map(r => ({ row_label: r.row || '', ...cells(r) })),
    blog_business_show: businessOn,
    blog_business_h2:   businessOn ? orEmpty(record.blog_business_h2) : '',
    blog_business:      businessOn ? html(record.blog_business) : '',
    blog_faq_h2:        record.blog_faq_h2 || '',
    blog_faq_items:     (record.faq_items || []).map(f => ({ faq_question: f.faq_question || '', faq_answer: html(f.faq_answer) })),
    blog_cta_h2:        record.blog_cta_h2 || '',
    blog_closing:       html(record.blog_closing),
    blog_buttons:       buttonsOf(record),
    blog_schema:        blogSchema(record),
  };
  const schedule = scheduleFor(record, { now });
  const post = { title: record.blog_h1 || '', slug: slugOf(record), status: schedule.status, date_gmt: schedule.date_gmt, category: GUIDES.slug, why: schedule.why };
  return { acf, meta: SEO_ADAPTERS[seo](record.seo_title, record.meta_description), post };
}

module.exports = { buildBlogPayload, BLOG_FIELDS, GUIDES, PUBLISH_TIME, slugOf, scheduleFor, londonToUtc, blogSchema };
