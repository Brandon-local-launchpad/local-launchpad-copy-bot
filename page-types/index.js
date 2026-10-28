'use strict';

// ── Page type registry ───────────────────────────────────────────────────────
// Each v20 page type (homepage, category, service and location pages) describes itself once:
//   id, label, singleKey (when a client has only one page of the type)
//   modelFields(record)  the prose fields the model writes, in page order
//   ranges               word ranges by rangeKey
//   validate(record, V)  the validator for this page type
//   readerView(record, values)
//   wp: { label, fields, buildPayload(record, opts), findPage(site, record), groups }
// A record names its type in meta.page_type; records from before page types
// existed are homepages.

const TYPES = new Map();

function registerPageType(def) {
  for (const k of ['id', 'label', 'modelFields', 'validate', 'readerView', 'wp']) {
    if (!def || def[k] === undefined) throw new Error(`Page type is missing "${k}".`);
  }
  TYPES.set(def.id, def);
  return def;
}

function getPageType(id) {
  const t = TYPES.get(id);
  if (!t) throw new Error(`Unknown page type "${id}".`);
  return t;
}

function pageTypeId(record) {
  return (record && ((record.meta && record.meta.page_type) || record.page_type)) || 'homepage';
}

const pageTypeOf = record => getPageType(pageTypeId(record));
const pageTypes = () => [...TYPES.values()];

registerPageType(require('./homepage'));
registerPageType(require('./category'));
registerPageType(require('./service'));
registerPageType(require('./location'));
registerPageType(require('./blog'));

module.exports = { registerPageType, getPageType, pageTypeOf, pageTypeId, pageTypes };
