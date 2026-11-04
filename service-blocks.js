'use strict';

// ── Service page block briefs by business type (CORE (17), 25 Oct 2026) ──────
// A niche entry carries `service_page_blocks`, keyed by business type (A, A2, B, C, D),
// each with an optional `emergency` variant, in the shape of `category_page_blocks`
// (category-blocks.js) plus the What's Included block. One entry gives:
//   included   { h2, items: [{ title, brief }] x6 to 8 }   the tick items (the stages of the job for A, what a visit covers for B)
//   problems   { h2, cards: [{ title, brief, mechanism }] x4 }   block 4 (A: signs you need it; B: signs it's time for a visit)
//   cost       { h2, cards: [{ title, brief }] x4 }   block 5
//   steps      [{ title, brief }] x3   (A falls back to the niche steps)
//   faq_slots  [{ slot, when?, question, answer_brief, doubt }]   five before the symptom question; the
//              slot names by type: A cost, timing, cover, rules, scope; B frequency, cost, access, scope, timing
//   faq_symptom, seasonal { problem_card, faq_slot }, emergency { ...overrides }
//   no_callouts { cost: { h2, cards x4 } }   (4 Nov 2026) block 5 for a page flagged emergency whose client has not
//              confirmed call outs: booked work on the same fault. The emergency variant wins over it.
//   desire { problems: { h2, cards x4 } ... }   (4 Nov 2026) the desire led variant: block 4 as "Is [SERVICE] right
//              for you", four situation cards (the customer's situation, what decides it, what the work gives them),
//              used on a page the library flags desire_led; never a symptom. The emergency variant wins over it.
// The type is the parent category's (category_types) else the client's, as for category pages.
// Placeholders: [SERVICE], [SERVICE_LOWER], [CAT], [CAT_LOWER], [WORK], [WORK_LOWER], [CITY], [TOWN], [SYMPTOM].
// Until a niche has the section, the job refuses its service pages: "no service block briefs for [niche]".

const C = require('./category-blocks');

class NoBriefsError extends Error {
  constructor(msg, detail) { super(msg); this.code = 'G-BRIEF'; this.status = 422; this.detail = detail; }
}

// The block entry for a service page: the parent category's type (or the client's), A2
// when the marker holds and an A2 entry exists, the desire led variant laid over it on a
// desire led page, the emergency variant over that when the emergency layout is on.
// service_overrides (copy quality 2, phase 2, 4 Nov 2026): the entry may replace block 5 (cost), the
// steps, block 4 or the FAQ slots for one service page, keyed by the page target in lower case, and set
// always_emergency so the page takes the urgent framing and steps whatever the client values say:
//   "service_overrides": { "lockouts and gaining entry": { "always_emergency": true, "cost": { "h2", "cards": [x4] } } }
function blocksFor({ niche, cv = {}, category, emergencyPage = false, desirePage = false, service = '' }) {
  const nicheName = niche._source || niche.trade_lower || niche.trade || 'this niche';
  const all = niche.service_page_blocks;
  if (!all || typeof all !== 'object' || !Object.keys(all).length) {
    throw new NoBriefsError(`no service block briefs for ${nicheName}`, { niche: nicheName });
  }
  const over = C.overrideFor(niche.service_overrides, service);
  const t = C.typeFor({ niche, cv, category, emergencyPage });
  if (over && over.always_emergency) t.emergencyOn = true;
  // type (copy quality 3, 4 Nov 2026): a one off build under a round category (the landscaper's Fencing under
  // Gardener) reads the type the override names instead of the category's
  if (over && over.type && all[String(over.type).toUpperCase()]) { t.letter = String(over.type).toUpperCase(); t.a2 = false; t.source = 'service override'; }
  const key = t.a2 && all.A2 ? 'A2' : t.letter;
  const base = all[key];
  if (!base) throw new NoBriefsError(`no service block briefs for ${nicheName} type ${key}`, { niche: nicheName, type: key });
  const desireUsed = !!(desirePage && base.desire && !(t.emergencyOn && base.emergency));
  const withDesire = desireUsed ? { ...base, ...base.desire } : base;
  // no_callouts (copy quality 3, 4 Nov 2026): a page flagged emergency whose client has not confirmed call outs
  // is booked work, so it reads the type's no_callouts set (its own block 5) instead of the planned cards,
  // which were written for new installs (a liner on a blocked toilet page)
  const noCallouts = !!(emergencyPage && !t.emergencyOn && base.no_callouts);
  const layered = t.emergencyOn && base.emergency ? { ...withDesire, ...base.emergency } : noCallouts ? { ...withDesire, ...base.no_callouts } : withDesire;
  const entry = C.applyOverride(layered, over);
  return { ...t, key, entry, emergencyUsed: !!(t.emergencyOn && base.emergency), desireUsed, noCallouts, overrideUsed: !!over, forcedEmergency: !!(over && over.always_emergency) };
}

// What a block entry lacks, as F-BRIEF messages (the page still runs with what there is)
function briefGaps(entry) {
  const gaps = [];
  const items = entry.included && Array.isArray(entry.included.items) ? entry.included.items : [];
  if (items.length < 6) gaps.push(`What's Included has ${items.length} item(s), not 6 to 8`);
  if (items.length > 8) gaps.push(`What's Included has ${items.length} items; 8 at most are used`);
  for (const it of items) if (!it.title) gaps.push('a What\'s Included item has no title');
  const cards = b => (entry[b] && Array.isArray(entry[b].cards) ? entry[b].cards : []);
  if (cards('problems').length < 4) gaps.push(`block 4 has ${cards('problems').length} card brief(s), not 4`);
  if (cards('cost').length < 4) gaps.push(`block 5 has ${cards('cost').length} card brief(s), not 4`);
  for (const b of ['problems', 'cost']) for (const c of cards(b)) if (!c.title || !c.brief) gaps.push(`block ${b === 'problems' ? 4 : 5} card "${c.title || '(untitled)'}" has no ${c.title ? 'brief' : 'title'}`);
  for (const c of cards('problems')) if (c.title && !c.mechanism) gaps.push(`block 4 card "${c.title}" has no mechanism`);
  const slots = Array.isArray(entry.faq_slots) ? entry.faq_slots : [];
  for (const s of ['cost', 'scope']) if (!slots.some(x => x.slot === s)) gaps.push(`no "${s}" FAQ slot`);
  if (!entry.faq_symptom) gaps.push('no faq_symptom entry');
  return gaps;
}

module.exports = { blocksFor, briefGaps, pickFaqSlots: C.pickFaqSlots, applySeasonal: C.applySeasonal, typeFor: C.typeFor, clientEmergency: C.clientEmergency, emergencyWhy: C.emergencyWhy, NoBriefsError };
