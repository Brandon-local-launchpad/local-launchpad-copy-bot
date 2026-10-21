'use strict';

// GBP service names → the words a UK homeowner uses (niche service_words: an
// ordered list of [match, say]; the first match in the lower-cased GBP name wins).
// say = null means the service is never named on the page (e.g. "Desert landscaping").
// With no match, the GBP name itself is used, in lower case.

function sayFor(gbpName, niche) {
  const name = (gbpName || '').toLowerCase().trim();
  for (const [match, say] of (niche.service_words || [])) {
    if (name.includes(match)) return say;
  }
  return name;
}

// The client's confirmed services: [{ gbp, say, category, kind }]. kind is "page" for a
// service_N entry and "mentioned" for a mentioned_N entry: a service the v3 page map folds
// into its category page (driveways under Paving Contractor), confirmed and nameable in
// prose but never a card's service, because it has no page of its own.
// On the v3 page map path the niche carries no service_words, so say is the page title.
function confirmedServiceList(keyValueMap = {}, serviceParentMap = {}, niche = {}) {
  const out = [];
  for (const [k, v] of Object.entries(keyValueMap)) {
    const m = k.match(/^(service|mentioned)_\d+$/);
    if (!m || !v) continue;
    out.push({ gbp: v, say: sayFor(v, niche), category: serviceParentMap[k] || keyValueMap.category_1 || 'Other', kind: m[1] === 'mentioned' ? 'mentioned' : 'page' });
  }
  return out;
}

module.exports = { sayFor, confirmedServiceList };
