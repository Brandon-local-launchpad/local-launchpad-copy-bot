'use strict';

// ── Location page block briefs by business type (CORE (18), 27 Oct 2026) ─────
// A niche entry carries `location_page_blocks`, keyed by business type (A, A2, B, C, D),
// each with an optional `emergency` variant, in the shape of `category_page_blocks`
// (category-blocks.js). The briefs are town wide: the problems and price movers of the
// town's homes across the trade, not one category. One entry gives:
//   problems   { h2, cards: [{ title, brief, mechanism }] x4 }   block 4 ([TOWN] stays in the H2)
//   cost       { h2, cards: [{ title, brief }] x4 }              block 5
//   steps      [{ title, brief }] x3   optional: else the same type's category_page_blocks steps, else the niche steps
//   faq_slots  [{ slot, when?, question, answer_brief, doubt }]  five at most; one of them the town
//              question (slot "town": "How soon can you get to [TOWN]?" when start_time is set, else "Do you cover [TOWN]?")
// No seasonal swap and no symptom question on a location page: the town's category pages
// carry those. The type is the client's (business_type, else the niche default), never a
// category override: the page is about the town, not one category. Placeholders: [WORK],
// [WORK_LOWER], [CAT], [CAT_LOWER], [TOWN], [CITY]. Until a niche has the section, the job
// refuses its location pages: "no location block briefs for [niche]".

const C = require('./category-blocks');

class NoBriefsError extends Error {
  constructor(msg, detail) { super(msg); this.code = 'G-BRIEF'; this.status = 422; this.detail = detail; }
}

// The block entry for a location page: the client's type, A2 when the marker holds and an
// A2 entry exists, the emergency variant laid over it.
function blocksFor({ niche, cv = {} }) {
  const nicheName = niche._source || niche.trade_lower || niche.trade || 'this niche';
  const all = niche.location_page_blocks;
  if (!all || typeof all !== 'object' || !Object.keys(all).length) {
    throw new NoBriefsError(`no location block briefs for ${nicheName}`, { niche: nicheName });
  }
  const t = C.typeFor({ niche, cv, category: null });
  const key = t.a2 && all.A2 ? 'A2' : t.letter;
  const base = all[key];
  if (!base) throw new NoBriefsError(`no location block briefs for ${nicheName} type ${key}`, { niche: nicheName, type: key });
  const entry = t.emergencyOn && base.emergency ? { ...base, ...base.emergency } : base;
  return { ...t, key, entry, emergencyUsed: !!(t.emergencyOn && base.emergency) };
}

// The steps a location page uses: the entry's own, else the same type's category page
// steps, else null (the caller falls back to the niche steps)
function stepsFor(niche, key, entry, { emergencyOn = false } = {}) {
  const pick = e => (e && Array.isArray(e.steps) && e.steps.length ? (emergencyOn && Array.isArray(e.steps_emergency) && e.steps_emergency.length ? e.steps_emergency : e.steps) : null);
  return pick(entry) || pick((niche.category_page_blocks || {})[key]) || null;
}

// What a block entry lacks, as F-BRIEF messages (the page still runs with what there is)
function briefGaps(entry) {
  const gaps = [];
  const cards = b => (entry[b] && Array.isArray(entry[b].cards) ? entry[b].cards : []);
  if (cards('problems').length < 4) gaps.push(`block 4 has ${cards('problems').length} card brief(s), not 4`);
  if (cards('cost').length < 4) gaps.push(`block 5 has ${cards('cost').length} card brief(s), not 4`);
  for (const b of ['problems', 'cost']) for (const c of cards(b)) if (!c.title || !c.brief) gaps.push(`block ${b === 'problems' ? 4 : 5} card "${c.title || '(untitled)'}" has no ${c.title ? 'brief' : 'title'}`);
  for (const c of cards('problems')) if (c.title && !c.mechanism) gaps.push(`block 4 card "${c.title}" has no mechanism`);
  const slots = Array.isArray(entry.faq_slots) ? entry.faq_slots : [];
  for (const s of ['cost', 'cover', 'town', 'process']) if (!slots.some(x => x.slot === s)) gaps.push(`no "${s}" FAQ slot`);
  return gaps;
}

module.exports = { blocksFor, briefGaps, stepsFor, pickFaqSlots: C.pickFaqSlots, typeFor: C.typeFor, NoBriefsError };
