'use strict';

// ── The homepage keyword word (4 Nov 2026) ───────────────────────────────────
// A niche entry's `homepage_keyword` is the word the homepage keyword pattern uses in place of
// the primary GBP category ("Roofer Southampton", not "Roofing services Southampton"). It is a
// string for the whole niche, or an object keyed by the client's primary category in lower case
// with an optional "default" ({ "blind shop": "Blinds" }: a Blind Shop client's homepage says
// Blinds, a Curtain Shop client's keeps the category). Null means the primary category as before.
function homepageKeywordWord(entry, primaryName) {
  const hk = entry && entry.homepage_keyword;
  if (!hk) return null;
  if (typeof hk === 'string') return hk.trim() || null;
  if (typeof hk === 'object') {
    const key = String(primaryName || '').toLowerCase().trim();
    const hit = key && Object.entries(hk).find(([k]) => k !== 'default' && k.toLowerCase().trim() === key);
    const word = hit ? hit[1] : hk.default;
    return word ? String(word).trim() || null : null;
  }
  return null;
}

module.exports = { homepageKeywordWord };
