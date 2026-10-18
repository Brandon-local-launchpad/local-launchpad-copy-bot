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
//   - highest volume wins; a tie (Google Ads merges close variants, which come back with
//     identical figures) goes to the first-listed candidate
//   - a winner with volume 10 or less, or null, is "no usable data": no H1 is filled, the
//     first candidate is kept as a suggestion to choose by hand
//   - display form: Title Case

const RESEARCHED = ['homepage', 'category', 'location', 'location_category'];
const MIN_USABLE = 10; // volume must be above this

// Lower case, apostrophes dropped ("Chandler's" → "chandlers"), other punctuation to spaces
const keywordOf = s => String(s == null ? '' : s).toLowerCase().replace(/['’‘`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// "landscape gardener services romsey" → "Landscape Gardener Services Romsey"
const displayOf = kw => keywordOf(kw).split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');

// The candidates for one page-map row, in SOP order. ctx: { primaryName, baseTown, categoryName(key) }
function candidatesFor(row, ctx) {
  const info = row.info || {};
  const pair = (what, town) => [keywordOf(`${what} ${town}`), keywordOf(`${what} services ${town}`)];
  if (row.type === 'homepage') return ctx.primaryName ? pair(ctx.primaryName, ctx.baseTown) : [];
  if (row.type === 'category') return pair(row.title, ctx.baseTown);
  if (row.type === 'location') return ctx.primaryName ? pair(ctx.primaryName, info.town || row.title) : [];
  if (row.type === 'location_category') {
    const cat = ctx.categoryName(info.category_key) || row.title.replace(new RegExp(`\\s+${escapeRe(info.town || '')}$`), '');
    return pair(cat, info.town || '');
  }
  return [];
}
const escapeRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Which rows are researched: the four types, never a service page, never a row a person has set
function needsResearch(row) {
  return row.applies !== false && RESEARCHED.includes(row.type) && row.h1_source !== 'manual';
}

// candidates: [keyword]; volumes: Map keyword → { volume, cpc }. Returns the scored list,
// the chosen keyword (or null) and why.
function select(candidates, volumes) {
  const scored = candidates.map((keyword, i) => { const v = volumes.get(keyword) || { volume: null, cpc: null }; return { keyword, volume: v.volume, cpc: v.cpc, order: i }; });
  if (!scored.length) return { scored, chosen: null, usable: false, reason: 'no candidates (no primary category)' };
  let best = scored[0];
  for (const s of scored.slice(1)) if ((s.volume || 0) > (best.volume || 0)) best = s;
  const same = scored.filter(s => s !== best && s.volume != null && s.volume === best.volume && s.cpc === best.cpc);
  const vol = best.volume;
  if (vol == null || vol <= MIN_USABLE) {
    return { scored, chosen: null, usable: false, suggestion: scored[0].keyword,
      reason: `no usable data: the best volume is ${vol == null ? 'null' : vol} (needs more than ${MIN_USABLE}); "${scored[0].keyword}" kept as a suggestion, choose manually` };
  }
  const tie = scored.filter(s => s !== best && (s.volume || 0) === vol);
  const reason = best.order === 0
    ? (tie.length ? `ties with ${tie.map(t => `"${t.keyword}"`).join(', ')} at ${vol}${same.length ? ' (same figures: Google merges close variants)' : ''}; the first-listed wins` : `highest volume (${vol}${scored.length > 1 ? ` vs ${scored.filter(s => s !== best).map(s => s.volume == null ? 'null' : s.volume).join(', ')}` : ''})`)
    : `highest volume (${vol} vs ${scored[0].volume == null ? 'null' : scored[0].volume} for the first-listed)`;
  return { scored, chosen: best.keyword, usable: true, display: displayOf(best.keyword), volume: vol, cpc: best.cpc, beatFirst: best.order !== 0, reason };
}

// The research plan for a set of page-map rows: per page its candidates; and the unique keywords
function plan(rows, ctx) {
  const pages = rows.filter(needsResearch).map(r => ({ row: r, candidates: candidatesFor(r, ctx) }));
  const keywords = [...new Set(pages.flatMap(p => p.candidates))];
  return { pages, keywords };
}

module.exports = { RESEARCHED, MIN_USABLE, keywordOf, displayOf, candidatesFor, needsResearch, select, plan };
