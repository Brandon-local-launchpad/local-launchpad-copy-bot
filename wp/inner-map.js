'use strict';

// ── Category, service and location records → WordPress (13 Nov 2026) ─────────
// The fields are read off the ACF schema (wp/acf-schema.js INNER_GROUPS), so the push can
// never write a field the site doesn't have, and a field added to the schema is pushed with
// no change here. A field marked push: false (images, icons, alt text, the gallery) is the
// site's and is never sent.
//
// What a record holds that is NOT sent, and where it comes from on the site instead
// (docs/WordPress_Field_Map.md): the rating line and the final CTA trust lines (the template,
// from Client Values), the buttons (the template), the breadcrumb (Rank Math), card_target
// (Copybot's own). The focus keyword is not pushed yet.
//
// A hidden section goes as false, '' or an empty list, never the word HIDDEN: the template
// treats empty as hidden.

const { INNER_GROUPS } = require('./acf-schema');
const { mdToHtml } = require('./markdown');
const { SEO_ADAPTERS } = require('./homepage-map');

const KIND = { text: 'text', wysiwyg: 'html', true_false: 'bool', repeater: 'repeater' };
const sent = f => f.push !== false && KIND[f.type];

const groupsFor = set => INNER_GROUPS.filter(g => g.set === set);

// [name, kind] or [name, 'repeater', { sub: kind }], as wp/homepage-map.js HOMEPAGE_FIELDS
function fieldsFor(set) {
  return groupsFor(set).flatMap(g => g.fields).filter(sent).map(f => (f.type === 'repeater'
    ? [f.name, 'repeater', Object.fromEntries(f.sub_fields.filter(sent).map(s => [s.name, KIND[s.type]]))]
    : [f.name, KIND[f.type]]));
}

// A repeater on the site → the record's list and, where a sub field has another name there, that name
function listSource(set, name) {
  return {
    [`${set}_included_items`]: ['included', {}],
    [`${set}_services_cards`]: ['cards', {}],
    [`${set}_block4`]:         ['block4', {}],
    [`${set}_block5`]:         ['block5', {}],
    [`${set}_process_steps`]:  ['steps', {}],
    [`${set}_reviews`]:        ['reviews', { review_text: 'text', review_name: 'name', review_town: 'town' }],
    [`${set}_areas_links`]:    [`${set}_areas_links`, { area_name: 'name', page_url: 'url' }],
    [`${set}_faq_items`]:      ['faq_items', {}],
    [`${set}_more_cards`]:     ['more_cards', {}],
  }[name];
}

const hidden = v => v === 'HIDDEN' || v === false || v === null || v === undefined;
const text = v => (hidden(v) ? '' : Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v));
const value = (kind, v) => (kind === 'html' ? mdToHtml(text(v)) : kind === 'bool' ? v === true : text(v));

function buildInnerPayload(record, set, { seo = 'rankmath' } = {}) {
  if (!SEO_ADAPTERS[seo]) throw new Error(`Unknown SEO plugin "${seo}". Known: ${Object.keys(SEO_ADAPTERS).join(', ')}`);
  const acf = {};
  for (const [name, kind, subs] of fieldsFor(set)) {
    if (kind !== 'repeater') { acf[name] = value(kind, record[name]); continue; }
    const source = listSource(set, name);
    if (!source) throw new Error(`No record list is mapped to the field ${name}.`);
    const [key, renamed] = source;
    acf[name] = (Array.isArray(record[key]) ? record[key] : []).map(row => Object.fromEntries(Object.entries(subs).map(([sub, k]) => [sub, value(k, row[renamed[sub] || sub])])));
  }
  return { acf, meta: SEO_ADAPTERS[seo](record.seo_title, record.meta_description) };
}

module.exports = { fieldsFor, groupsFor, buildInnerPayload, listSource };
