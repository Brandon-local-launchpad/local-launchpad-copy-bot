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

// The client's confirmed services: [{ gbp, say, category }]
function confirmedServiceList(keyValueMap = {}, serviceParentMap = {}, niche = {}) {
  const out = [];
  for (const [k, v] of Object.entries(keyValueMap)) {
    if (!/^service_\d+$/.test(k) || !v) continue;
    out.push({ gbp: v, say: sayFor(v, niche), category: serviceParentMap[k] || keyValueMap.category_1 || 'Other' });
  }
  return out;
}

module.exports = { sayFor, confirmedServiceList };
