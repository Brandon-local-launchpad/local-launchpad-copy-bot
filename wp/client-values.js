'use strict';

// ── Client Values on the WordPress site ─────────────────────────────────────
// The plugin keeps one value per key (Settings → Client Values) and replaces
// [CV: key] tokens with them when the page is shown. Copybot pushes the values
// from the page record (meta.client_values, the values the copy was written with)
// plus four the template needs: the map, the Google review link, the primary
// button label and the rating line.

const { CV_KEYS } = require('../v20-generate');

const SITE_KEYS = [
  { key: 'map_embed',      label: 'Google map embed URL' },
  { key: 'review_url',     label: 'Google review link' },
  { key: 'primary_action', label: 'Primary button label' },
  { key: 'rating_line',    label: 'Rating line (hero and final CTA)' },
  { key: 'business_schema_id', label: 'LocalBusiness schema @id (the blog posts\' publisher)' },
];

const label = k => k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const ALL_KEYS = [...CV_KEYS.map(k => ({ key: k, label: label(k) })), ...SITE_KEYS];

// Values to push for a record. Empty values are sent as '' so a value removed in
// Copybot is cleared on the site too.
function buildClientValuesPayload(record, extra = {}) {
  const v = (record.meta && record.meta.client_values) || {};
  const buttons = record.buttons || [];
  const primary = buttons.find(b => !/^Call\b/.test(b)) || '';
  const out = {};
  for (const { key } of ALL_KEYS) out[key] = '';
  Object.assign(out, v, {
    primary_action: primary,
    rating_line: record.home_hero_rating_line || '',
    ...extra,
  });
  return out;
}

module.exports = { ALL_KEYS, SITE_KEYS, buildClientValuesPayload };
