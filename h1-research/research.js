'use strict';

// ── H1 research: shared helpers ─────────────────────────────────────────────
// Pure, no network, no database. The rules (candidates, keyword groups, claims, hub pages,
// pattern fallback) are in h1-research/claims.js (H1 research v2, Brandon, 19 Oct 2026).
//   - the page name (title) and slug never change; the H1 is the visible headline
//   - a keyword is usable when its volume is above MIN_USABLE (10)
//   - display form: Title Case (shared with the service-page H1s)

const MIN_USABLE = 10; // volume must be above this

// Lower case, "&" as "and" ("Excavation & grading" → "excavation and grading"), apostrophes
// dropped ("Chandler's" → "chandlers"), other punctuation to spaces
const keywordOf = s => String(s == null ? '' : s).toLowerCase().replace(/&/g, ' and ').replace(/['’‘`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// Title Case for every H1: each word capitalised, small joining words lower case unless first;
// the rest of a word is kept ("CCTV" stays "CCTV", "Chandler's" stays "Chandler's"); "&" is
// written "and" ("Excavation & grading Southampton" → "Excavation and Grading Southampton")
const SMALL = new Set(['and', 'or', 'of', 'the', 'in', 'on', 'for', 'to', 'a', 'an', 'at', 'by', 'with']);
function titleCase(text) {
  return String(text == null ? '' : text).replace(/s*&s*/g, ' and ').trim().replace(/\s+/g, ' ').split(' ').map((w, i) => {
    if (i > 0 && SMALL.has(w.toLowerCase())) return w.toLowerCase();
    return w.replace(/^([("'‘“]?)([a-z])/, (m, p, c) => p + c.toUpperCase());
  }).join(' ');
}
// "landscape gardener services romsey" → "Landscape Gardener Services Romsey"
const displayOf = kw => titleCase(keywordOf(kw));

// Extra candidates per niche and category, approved by Brandon: h1-research/search-terms.json,
// { "<niche>": { "<category key>": ["tree surgeon", …], "_sitewide": [ … ] } }. "_sitewide"
// terms are added for the homepage and the location pages, which use the primary category.
let TERMS = null;
function searchTerms(niche) {
  if (!TERMS) {
    try { TERMS = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'search-terms.json'), 'utf8')); } catch (_) { TERMS = {}; }
  }
  return (niche ? TERMS[niche] : TERMS) || {};
}

module.exports = { MIN_USABLE, keywordOf, displayOf, titleCase, searchTerms };
