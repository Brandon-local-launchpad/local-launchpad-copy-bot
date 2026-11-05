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

// A page's target keyword, the page map's h1_keyword, for Rank Math's focus keyword (Brandon, 5 Nov 2026), in the
// H1's form where they match. A hub page's stored keyword is its pattern ("gardener services in and around romsey"),
// which nobody searches: its target is the keyword the pattern stands in for ("Gardener Romsey"). focusKeywords decides
// whether it may have it. No keyword stored: the H1.
const HUB_PATTERN = /^(.+?)\s+services\s+in\s+and\s+around\s+(.+)$/i;
const isHubPattern = text => HUB_PATTERN.test(String(text || '').trim());
function targetKeyword({ h1 = '', keyword = '' } = {}) {
  const heading = String(h1 || '').trim();
  const k = String(keyword || '').trim() || heading;
  const hub = k.match(HUB_PATTERN);
  if (hub) return titleCase(hub[1] + ' ' + hub[2]);
  return heading && heading.toLowerCase() === k.toLowerCase() ? heading : titleCase(k);
}

// Each page's focus keyword (Brandon, 5 Nov 2026): no two pages share one. A hub page whose keyword is already another
// page's target gets none; a page that owns its keyword keeps it. If two pages that aren't hubs ever held the same one,
// the structure document's order decides: Homepage, Category, Service, Location, Location category. Takes page map rows
// and returns a Map of slug to keyword, blank where the page has none. A page that doesn't apply owns nothing.
const FOCUS_ORDER = { homepage: 0, category: 1, service: 2, location: 3, location_category: 4, town_service: 5 };
function focusKeywords(rows = []) {
  const live = (rows || []).filter(r => r && r.applies !== false);
  const order = r => (FOCUS_ORDER[r.type] === undefined ? 9 : FOCUS_ORDER[r.type]);
  const hubOf = r => isHubPattern(r.h1_keyword || r.h1);
  const sorted = [...live].sort((a, b) => Number(hubOf(a)) - Number(hubOf(b)) || order(a) - order(b));
  const taken = new Set();
  const out = new Map();
  for (const r of sorted) {
    const kw = targetKeyword({ h1: r.h1, keyword: r.h1_keyword });
    const key = keywordOf(kw);
    if (!key || taken.has(key)) { out.set(r.slug, ''); continue; }
    taken.add(key);
    out.set(r.slug, kw);
  }
  return out;
}
// One page's: h1 is the H1 the page ended up with, where code fell back from an empty row
function focusKeywordFor(page, rows = [], h1 = '') {
  const mine = { ...page, h1: h1 || page.h1 };
  const others = (rows || []).filter(r => r && r.slug !== page.slug);
  return focusKeywords([...others, mine]).get(page.slug) || '';
}
// Pages sharing a focus keyword, from records or anything with focus_keyword and a slug: [{ keyword, pages }]
function duplicateFocusKeywords(pages = []) {
  const seen = new Map();
  for (const p of pages) {
    const key = keywordOf(p.focus_keyword);
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(p.slug || p.page_slug || '/');
  }
  return [...seen.entries()].filter(([, v]) => v.length > 1).map(([keyword, list]) => ({ keyword, pages: list }));
}

module.exports = { MIN_USABLE, keywordOf, displayOf, titleCase, searchTerms, targetKeyword, isHubPattern, focusKeywords, focusKeywordFor, duplicateFocusKeywords };
