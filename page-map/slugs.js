'use strict';

// ── Slugs, page keys and the town list ──────────────────────────────────────
// Shared by the generator and the services rules (page-map/plan-v3.js).

// The old Apps Script's slugify, unchanged: lower case, strip punctuation, spaces to hyphens
const slugify = text => String(text == null ? '' : text).toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const pageKey = (type, slug) => `${type}:${slug}`;

// Other towns: one per line (or an array), blanks and the base town dropped, first spelling kept
function cleanTowns(baseTown, otherTowns) {
  const list = Array.isArray(otherTowns) ? otherTowns : String(otherTowns || '').split(/\r?\n/);
  const base = slugify(baseTown);
  const lower = t => t.toLowerCase().replace(/\s+/g, ' ');
  const seen = new Map(); // slug → first spelling
  const out = [];
  const dropped = [];
  const clashes = [];     // two different spellings that make one slug: reported, first kept
  for (const raw of list) {
    const town = String(raw || '').replace(/^[\s\-–—*•\d.)]+/, '').trim();
    if (!town) continue;
    const s = slugify(town);
    if (!s) { clashes.push({ slug: '', names: [`town "${town}"`], msg: `town "${town}" has no letters or numbers to make a slug from, so it has no page` }); continue; }
    if (s === base) { if (lower(town) === lower(baseTown)) dropped.push({ town, why: 'is the base town' }); else clashes.push({ slug: `/locations/${s}`, names: [`town "${town}"`, `base town "${baseTown}"`], msg: `town "${town}" slugs the same as the base town "${baseTown}", so it has no page` }); continue; }
    if (seen.has(s)) {
      if (lower(seen.get(s)) === lower(town)) dropped.push({ town, why: 'is listed twice' });
      else clashes.push({ slug: `/locations/${s}`, names: [`town "${seen.get(s)}"`, `town "${town}"`], msg: `town "${seen.get(s)}" and town "${town}" share the slug /locations/${s}; only "${seen.get(s)}" has a page` });
      continue;
    }
    seen.set(s, town);
    out.push(town);
  }
  return { towns: out, dropped, clashes };
}

module.exports = { slugify, pageKey, cleanTowns };
