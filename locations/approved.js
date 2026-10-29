'use strict';

// ── Location Determiner, Stage 6: the approved tiers as the page map and GBP read them ──────
// client_location_tiers (written by the review's Approve, locations/review.js) is the source of
// a client's other towns once an approval exists. No approval = today's behaviour, unchanged:
// the page map takes other_areas from the record, GBP the page map's location rows.
//
//   approvedTiers(pool, clientId) → null, or
//     { approved_at, approved_by, run_at,
//       tier1: [{ place_id, name, slug, categories: [category_key] }], tier2: [...], area_only: [...],
//       towns: [names, Tier 1 then Tier 2]  (the page map's other towns),
//       categories: Map(town slug → Set(category_key))  (the location category pages that passed),
//       gbp_areas: [names, Tier 1, Tier 2, then area only by score, 20 at most] }
//   tiersFromReview(view) builds the same shape from a review view that is not approved yet
//   (the Stage 6 dry run "as the review stands"), so a dry run can show what an approval would do.

const { slugify } = require('../page-map/generator');
const GBP_AREA_LIMIT = 20;

const parse = c => { try { return typeof c === 'string' ? JSON.parse(c) : c || null; } catch (_) { return null; } };

function shape(rows, { approved_at = null, approved_by = '', run_at = null, source = 'approved' } = {}) {
  const town = r => ({ place_id: r.place_id, name: r.name, slug: slugify(r.name), type: r.type, categories: Array.isArray(r.categories) ? r.categories : [], score: Number(r.score) || 0, fallback: Number(r.fallback) || 0, source: r.source || 'scored' });
  const tier1 = rows.filter(r => r.tier === 1).map(town);
  const tier2 = rows.filter(r => r.tier === 2).map(town);
  const areaOnly = rows.filter(r => !r.tier && r.outcome === 'area_only').map(town).sort((a, b) => (b.score - a.score) || (b.fallback - a.fallback));
  const categories = new Map();
  for (const t of [...tier1, ...tier2]) categories.set(t.slug, new Set(t.categories));
  const gbp = [...tier1, ...tier2, ...areaOnly].filter(t => t.type === 'town').slice(0, GBP_AREA_LIMIT).map(t => t.name);
  return { source, approved_at, approved_by, run_at, tier1, tier2, area_only: areaOnly, towns: [...tier1, ...tier2].map(t => t.name), categories, gbp_areas: gbp, counts: { tier1: tier1.length, tier2: tier2.length, area_only: areaOnly.length } };
}

async function approvedTiers(pool, clientId) {
  let rows;
  try { ({ rows } = await pool.query(`SELECT * FROM client_location_tiers WHERE client_id = $1 ORDER BY tier NULLS LAST, name`, [clientId])); }
  catch (e) { if (/client_location_tiers/.test(e.message) && /does not exist/.test(e.message)) return null; throw e; }
  if (!rows.length) return null;
  const typed = rows.map(r => { const s = parse(r.scores) || {}; return { ...r, categories: parse(r.categories) || [], score: s.score, fallback: s.fallback }; });
  return shape(typed, { approved_at: rows[0].approved_at, approved_by: rows[0].approved_by || '', run_at: rows[0].run_at, source: 'approved' });
}

// The same shape from a review view (locations/review.js view), approved or not
function tiersFromReview(view) {
  if (!view || !view.ok) return null;
  const cats = new Map();
  for (const c of view.location_categories || []) { if (!cats.has(c.place_id)) cats.set(c.place_id, []); cats.get(c.place_id).push(c.category_key); }
  const rows = view.list.filter(t => t.to !== 'excluded').map(t => ({ place_id: t.place_id, name: t.name, type: t.type, tier: t.tier, outcome: t.outcome, source: t.source, categories: cats.get(t.place_id) || [], score: t.score, fallback: t.fallback }));
  return shape(rows, { approved_at: view.approval ? view.approval.approved_at : null, approved_by: view.approval ? view.approval.approved_by : '', run_at: view.ran_at, source: view.approval ? 'approved' : 'review (not approved)' });
}

module.exports = { approvedTiers, tiersFromReview, shape, GBP_AREA_LIMIT };
