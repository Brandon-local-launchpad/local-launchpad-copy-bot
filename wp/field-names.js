'use strict';

// ── A page's field names (5 Nov 2026) ────────────────────────────────────────
// Every field a record holds, under the name WordPress knows it by, with its value and whether the model
// wrote it. The homepage's names are its ACF fields (wp/acf-schema.js). Category, service and location pages
// have no ACF fields yet: theirs are the names in their CORE OUTPUT blocks (page-types/*.js LABELS), which is
// what a field map for those templates would use. The page view's "Show field names" reads this.

const { pageTypeOf } = require('../page-types');

const PREFIX = { category: 'cat', service: 'svc', location: 'loc' };

// A list in the record, its field name on the page and its sub fields: [sub field, the record's key]
function listsFor(id, p) {
  if (id === 'homepage') {
    return {
      home_trusted_logos: ['home_trusted_logos', [['logo_caption', 'caption'], ['logo_url', 'register_url'], ['logo_tier', 'tier']]],
      cards: ['home_services_cards', [['card_name'], ['card_text'], ['card_url']]],
      points: ['home_why_points', [['point_title'], ['point_body']]],
      steps: ['home_process_steps', [['step_title'], ['step_body']]],
      home_areas_links: ['home_areas_links', [['area_name', 'name'], ['page_url', 'url']]],
      faq_items: ['home_faq_items', [['faq_question'], ['faq_answer']]],
    };
  }
  return {
    included: [`${p}_included_items`, [['item_title'], ['item_text']]],
    cards: [`${p}_services_cards`, [['card_name'], ['card_text'], ['card_url']]],
    block4: [`${p}_block4`, [['card_title'], ['card_body']]],
    block5: [`${p}_block5`, [['card_title'], ['card_body']]],
    steps: [`${p}_process_steps`, [['step_title'], ['step_body']]],
    reviews: [`${p}_reviews`, [['review_text', 'text'], ['review_name', 'name'], ['review_town', 'town']]],
    [`${p}_areas_links`]: [`${p}_areas_links`, [['area_name', 'name'], ['page_url', 'url']]],
    faq_items: [`${p}_faq_items`, [['faq_question'], ['faq_answer']]],
    more_cards: [`${p}_more_cards`, [['card_name'], ['card_url']]],
  };
}

const MODEL_SUBS = new Set(['card_text', 'point_body', 'step_body', 'faq_answer', 'item_text', 'card_body']);

function fieldNames(record) {
  if (!record || record.blocked) return { onSite: false, fields: [] };
  const type = pageTypeOf(record);
  const id = type.id;
  const p = PREFIX[id];
  const scalarRe = id === 'homepage' ? /^home_/ : new RegExp(`^${p}_`);
  const lists = listsFor(id, p);
  const modelKeys = new Set(type.modelFields(record).filter(f => !('sub' in f.ref)).map(f => f.ref.key));
  const fields = [];
  const add = (name, text, source) => { if (text !== null && text !== undefined && text !== '' && text !== false && text !== 'HIDDEN') fields.push({ name, text: String(text), source }); };
  add('seo_title', record.seo_title, 'code');
  add('meta_description', record.meta_description, 'code');
  for (const [key, value] of Object.entries(record)) {
    if (lists[key]) {
      if (!Array.isArray(value)) continue;
      const [list, subs] = lists[key];
      value.forEach((row, i) => { for (const [sub, from] of subs) add(`${list}[${i + 1}].${sub}`, row[from || sub], MODEL_SUBS.has(sub) ? 'model' : 'code'); });
    } else if (scalarRe.test(key) && !/_show$/.test(key) && !Array.isArray(value)) {
      add(key, value, modelKeys.has(key) ? 'model' : 'code');
    }
  }
  if (record.cta_band) { add('home_cta_band_heading', record.cta_band.heading, 'code'); add('home_cta_band_line', record.cta_band.line, 'code'); }
  return { onSite: (type.wp.fields || []).length > 0, fields };
}

module.exports = { fieldNames };
