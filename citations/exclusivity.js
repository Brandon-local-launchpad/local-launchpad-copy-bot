'use strict';

// ── Exclusivity check ─────────────────────────────────────────────────────────────
// A client's territory is their approved town list (the decisions doc, 3 Nov 2026). Two
// clients in the same niche with overlapping approved towns would compete for the same
// local directories and the same searches, so Copybot warns: on the Citations tab, and on
// the Locations tab before Approve (against the list as the review stands).
//   overlapsFor(clientId, { towns })   the other active clients in the same niche whose
//                                      approved towns share a place with this client's
//                                      (towns: [{ place_id, name }] to check a list that is not
//                                      approved yet; else the client's approved rows)
//   overlapsAll()                      every overlapping pair, for a dashboard line
// Matched by place id, so two spellings of one town are one town; area only places do
// not count (no page, no local directory of their own).

const str = v => (v == null ? '' : String(v)).trim();

function createExclusivity({ pool }) {
  async function approvedTowns(clientId) {
    const { rows } = await pool.query(`SELECT place_id, name, tier FROM client_location_tiers WHERE client_id = $1 AND tier IS NOT NULL`, [clientId]);
    return rows.map(r => ({ place_id: r.place_id, name: r.name, tier: r.tier }));
  }
  async function others(clientId, nicheKey) {
    const { rows } = await pool.query(`SELECT c.id, c.name, t.place_id, t.name AS town, t.tier FROM clients c JOIN client_location_tiers t ON t.client_id = c.id WHERE c.id <> $1 AND c.niche_key = $2 AND c.archived_at IS NULL AND t.tier IS NOT NULL`, [clientId, nicheKey]);
    const by = new Map();
    for (const r of rows) { if (!by.has(r.id)) by.set(r.id, { client_id: r.id, name: r.name, towns: [] }); by.get(r.id).towns.push({ place_id: r.place_id, name: r.town, tier: r.tier }); }
    return [...by.values()];
  }

  async function overlapsFor(clientId, { towns = null } = {}) {
    const { rows: cs } = await pool.query(`SELECT id, name, niche_key FROM clients WHERE id = $1`, [clientId]);
    if (!cs.length) return [];
    const nicheKey = cs[0].niche_key || 'other';
    if (nicheKey === 'other') return [];
    const mine = towns || await approvedTowns(clientId);
    const ids = new Map(mine.map(t => [str(t.place_id), t]));
    if (!ids.size) return [];
    const out = [];
    for (const o of await others(clientId, nicheKey)) {
      const shared = o.towns.filter(t => ids.has(str(t.place_id)));
      if (shared.length) out.push({ client_id: o.client_id, name: o.name, niche_key: nicheKey, shared: shared.map(t => ({ place_id: t.place_id, name: t.name, their_tier: t.tier, my_tier: ids.get(str(t.place_id)).tier || null })), count: shared.length, of_mine: mine.length, of_theirs: o.towns.length, message: `${o.name} (same niche) also has ${shared.length === 1 ? shared[0].name : `${shared.length} of these towns: ${shared.map(t => t.name).join(', ')}`}.` });
    }
    return out.sort((a, b) => b.count - a.count);
  }

  async function overlapsAll() {
    const { rows } = await pool.query(`SELECT c.id, c.name, c.niche_key, t.place_id, t.name AS town FROM clients c JOIN client_location_tiers t ON t.client_id = c.id WHERE c.archived_at IS NULL AND c.niche_key IS NOT NULL AND c.niche_key <> 'other' AND t.tier IS NOT NULL ORDER BY c.name`);
    const clients = new Map();
    for (const r of rows) { if (!clients.has(r.id)) clients.set(r.id, { id: r.id, name: r.name, niche_key: r.niche_key, places: new Map() }); clients.get(r.id).places.set(str(r.place_id), r.town); }
    const list = [...clients.values()];
    const pairs = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.niche_key !== b.niche_key) continue;
      const shared = [...a.places.keys()].filter(p => b.places.has(p)).map(p => a.places.get(p));
      if (shared.length) pairs.push({ niche_key: a.niche_key, a: { id: a.id, name: a.name }, b: { id: b.id, name: b.name }, towns: shared, count: shared.length });
    }
    return pairs.sort((x, y) => y.count - x.count);
  }

  return { overlapsFor, overlapsAll, approvedTowns };
}

module.exports = { createExclusivity };
