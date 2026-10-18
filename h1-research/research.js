'use strict';

// ── H1 research: candidates, selection, display ─────────────────────────────
// Pure, no network, no database. Brandon's SOP (18 Oct 2026):
//   - the page name (title) and slug never change; the H1 is the visible headline
//   - service pages: "<service> <base town>", automatic, never researched
//   - candidates, in this order (lower case, no punctuation):
//       homepage           "<primary category> <base town>", "<primary category> services <base town>"
//       category           "<category> <base town>",         "<category> services <base town>"
//       location           "<primary category> <town>",      "<primary category> services <town>"
//       location category "<category> <town>",              "<category> services <town>"
//     then the approved extra terms for the category (h1-research/search-terms.json)
//   - highest volume wins; a tie (Google Ads merges close variants, which come back with
//     identical figures) goes to the first-listed candidate
//   - a winner with volume 10 or less, or null, is "no usable data": no H1 is filled, the
//     first candidate is kept as a suggestion to choose by hand
//   - no two pages share an H1 (Brandon, 18 Oct 2026): pages are assigned in priority order
//     (homepage, categories, locations, location categories) and an H1 already taken (by a
//     page assigned earlier, a manual or accepted H1, or a service page) is skipped
//   - display form: Title Case (shared with the service-page H1s)

const RESEARCHED = ['homepage', 'category', 'location', 'location_category'];
const MIN_USABLE = 10; // volume must be above this

// Lower case, apostrophes dropped ("Chandler's" → "chandlers"), other punctuation to spaces
const keywordOf = s => String(s == null ? '' : s).toLowerCase().replace(/['’‘`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// Title Case for every H1: each word capitalised, small joining words lower case unless first;
// the rest of a word is kept ("CCTV" stays "CCTV", "Chandler's" stays "Chandler's")
const SMALL = new Set(['and', 'or', 'of', 'the', 'in', 'on', 'for', 'to', 'a', 'an', 'at', 'by', 'with', '&']);
function titleCase(text) {
  return String(text == null ? '' : text).trim().replace(/\s+/g, ' ').split(' ').map((w, i) => {
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

// The candidates for one page-map row: the SOP pair first, then the approved extra terms.
// ctx: { primaryName, primaryKey, baseTown, categoryName(key), terms: { [key]: [..], _sitewide: [..] } }
function candidatesFor(row, ctx) {
  const info = row.info || {};
  const terms = ctx.terms || {};
  const list = (what, key, town, sitewide) => {
    const out = [keywordOf(`${what} ${town}`), keywordOf(`${what} services ${town}`)];
    for (const t of [...(terms[key] || []), ...(sitewide ? terms._sitewide || [] : [])]) out.push(keywordOf(`${t} ${town}`));
    return [...new Set(out.filter(Boolean))];
  };
  if (row.type === 'homepage') return ctx.primaryName ? list(ctx.primaryName, ctx.primaryKey, ctx.baseTown, true) : [];
  if (row.type === 'category') return list(row.title, info.category_key, ctx.baseTown, false);
  if (row.type === 'location') return ctx.primaryName ? list(ctx.primaryName, ctx.primaryKey, info.town || row.title, true) : [];
  if (row.type === 'location_category') {
    const cat = ctx.categoryName(info.category_key) || row.title.replace(new RegExp(`\\s+${escapeRe(info.town || '')}$`), '');
    return list(cat, info.category_key, info.town || '', false);
  }
  return [];
}
const escapeRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Which rows are researched: the four types, never a service page, never a row a person has set
function needsResearch(row) {
  return row.applies !== false && RESEARCHED.includes(row.type) && row.h1_source !== 'manual';
}

// candidates: [keyword]; volumes: Map keyword → { volume, cpc }; taken: Map keyword → the page
// that already has it as its H1. Returns the scored list, the chosen keyword (or null) and why.
function select(candidates, volumes, taken = new Map()) {
  const scored = candidates.map((keyword, i) => { const v = volumes.get(keyword) || { volume: null, cpc: null }; return { keyword, volume: v.volume, cpc: v.cpc, order: i, takenBy: taken.get(keyword) || null }; });
  if (!scored.length) return { scored, chosen: null, usable: false, reason: 'no candidates (no primary category)' };
  const open = scored.filter(s => !s.takenBy);
  const takenNote = scored.filter(s => s.takenBy).map(s => `"${s.keyword}" is already the H1 of ${s.takenBy}`).join('; ');
  if (!open.length) return { scored, chosen: null, usable: false, suggestion: null, reason: `no open candidate: ${takenNote}; choose manually` };
  const result = pickFrom(open, scored);
  if (takenNote) result.reason = `${result.reason} (${takenNote})`;
  return result;
}
function pickFrom(open, scored) {
  let best = open[0];
  for (const s of open.slice(1)) if ((s.volume || 0) > (best.volume || 0)) best = s;
  const first = open[0];
  const same = open.filter(s => s !== best && s.volume != null && s.volume === best.volume && s.cpc === best.cpc);
  const vol = best.volume;
  if (vol == null || vol <= MIN_USABLE) {
    return { scored, chosen: null, usable: false, suggestion: first.keyword,
      reason: `no usable data: the best volume is ${vol == null ? 'null' : vol} (needs more than ${MIN_USABLE}); "${first.keyword}" kept as a suggestion, choose manually` };
  }
  const tie = open.filter(s => s !== best && (s.volume || 0) === vol);
  const others = open.filter(s => s !== best).map(s => (s.volume == null ? 'null' : s.volume));
  const reason = best === first
    ? (tie.length ? `ties with ${tie.map(t => `"${t.keyword}"`).join(', ')} at ${vol}${same.length ? ' (same figures: Google merges close variants)' : ''}; the first-listed wins` : `highest volume (${vol}${others.length ? ` vs ${others.join(', ')}` : ''})`)
    : `highest volume (${vol} vs ${first.volume == null ? 'null' : first.volume} for "${first.keyword}")`;
  return { scored, chosen: best.keyword, usable: true, display: displayOf(best.keyword), volume: vol, cpc: best.cpc, beatFirst: best.order !== 0, reason };
}

// The research plan: the pages to research, in priority order (homepage, categories, locations,
// location categories; page-map order within a type), each with its candidates; the unique keywords
const PRIORITY = { homepage: 0, category: 1, location: 2, location_category: 3 };
function plan(rows, ctx) {
  const pages = rows.filter(needsResearch)
    .sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type] || (a.sort_order || 0) - (b.sort_order || 0))
    .map(r => ({ row: r, candidates: candidatesFor(r, ctx) }));
  const keywords = [...new Set(pages.flatMap(p => p.candidates))];
  return { pages, keywords };
}
const TYPE_WORD = { category: 'category page', location: 'location page', location_category: 'location category page', service: 'service page' };
const pageLabel = r => (r.type === 'homepage' ? 'the homepage' : `the ${TYPE_WORD[r.type] || 'page'} "${r.title}"`);

// Choose for every planned page so that no two pages share an H1. H1s already set and not being
// researched (manual, accepted, service pages) are taken first; then each page, in priority
// order, takes its best open candidate. A no-data suggestion is kept distinct too, so using it
// never creates a duplicate.
function assign(planned, volumes, rows) {
  const taken = new Map();
  const researched = new Set(planned.map(p => p.row.page_key));
  for (const r of rows) if (r.applies !== false && !researched.has(r.page_key) && r.h1) taken.set(keywordOf(r.h1), pageLabel(r));
  return planned.map(p => {
    const sel = select(p.candidates, volumes, taken);
    const k = sel.usable ? sel.chosen : sel.suggestion;
    if (k) taken.set(k, pageLabel(p.row));
    return { ...p, sel };
  });
}

module.exports = { RESEARCHED, MIN_USABLE, keywordOf, displayOf, titleCase, searchTerms, candidatesFor, needsResearch, select, plan, assign };
