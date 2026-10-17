'use strict';

// ── Client allocation to niches (the Clients landing page) ──────────────────
// clients gains niche_key, signed_on (date), allocated_at, allocation_source
// ("auto" from the migration, "confirmed" from the New Clients tab, "manual"
// from the New Client form or Move to another niche). No allocated_at means
// the client is new and waits in New Clients.
//
// migrateAllocations marks every existing hand-made client allocated once
// (niche from clients.trade through niches.nicheKeyFor, signed_on = created
// date) and archived Fillout clients too, so New Clients only ever shows
// genuinely new arrivals. It is idempotent: it only touches rows with no
// allocated_at, and a second run changes nothing.

const N = require('./niches');

async function ensureAllocationColumns(pool) {
  await pool.query(`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS niche_key TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS signed_on DATE;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMPTZ;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS allocation_source TEXT;
  `);
}

const toDate = d => { if (!d) return null; const s = d instanceof Date ? d.toISOString() : String(d); return s.slice(0, 10); };

async function migrateAllocations(pool, { log = console } = {}) {
  const { rows } = await pool.query(`SELECT id, trade, source, created_at, archived_at FROM clients WHERE allocated_at IS NULL`);
  let matched = 0, unmatched = 0, left = 0;
  for (const c of rows) {
    const fromFillout = c.source === 'fillout';
    if (fromFillout && !c.archived_at) { left++; continue; } // waits in New Clients
    const key = N.nicheKeyFor(c.trade) || N.OTHER.key;
    if (key === N.OTHER.key) unmatched++; else matched++;
    await pool.query(`UPDATE clients SET niche_key = $2, signed_on = $3, allocated_at = NOW(), allocation_source = 'auto' WHERE id = $1 AND allocated_at IS NULL`,
      [c.id, key, toDate(c.created_at) || toDate(new Date())]);
  }
  if (matched || unmatched) log.log(`[clients] allocation migration: ${matched} client(s) placed in a niche, ${unmatched} in Other / unsorted, ${left} Fillout client(s) left for New Clients`);
  return { matched, unmatched, left };
}

// source: confirmed (New Clients tab), manual (New Client form, Move to another niche)
async function allocate(pool, clientId, { nicheKey, signedOn, source = 'confirmed' }) {
  if (!N.nicheByKey(nicheKey)) throw Object.assign(new Error(`Unknown niche: ${nicheKey}`), { status: 400 });
  if (!['confirmed', 'manual', 'auto'].includes(source)) throw Object.assign(new Error(`Unknown allocation source: ${source}`), { status: 400 });
  const date = toDate(signedOn);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('signed_on must be a date (YYYY-MM-DD)'), { status: 400 });
  const { rows } = await pool.query(
    `UPDATE clients SET niche_key = $2, signed_on = $3, allocated_at = NOW(), allocation_source = $4, trade = $5 WHERE id = $1 RETURNING id, name, trade, niche_key, signed_on, allocated_at, allocation_source`,
    [clientId, nicheKey, date, source, N.nicheLabel(nicheKey)]);
  if (!rows.length) throw Object.assign(new Error('Client not found'), { status: 404 });
  return rows[0];
}

// Moving keeps the signed date; the niche and source change
async function move(pool, clientId, nicheKey) {
  if (!N.nicheByKey(nicheKey)) throw Object.assign(new Error(`Unknown niche: ${nicheKey}`), { status: 400 });
  const { rows } = await pool.query(
    `UPDATE clients SET niche_key = $2, allocation_source = 'manual', allocated_at = COALESCE(allocated_at, NOW()), signed_on = COALESCE(signed_on, created_at::date), trade = $3 WHERE id = $1 RETURNING id, name, trade, niche_key, signed_on, allocated_at, allocation_source`,
    [clientId, nicheKey, N.nicheLabel(nicheKey)]);
  if (!rows.length) throw Object.assign(new Error('Client not found'), { status: 404 });
  return rows[0];
}

// What the landing page needs on every client row, on top of the clients columns:
// suggested niche (from the Fillout niche answer), when the form came in, the
// possible-duplicate flag, and the onboarding-record reviewed state.
async function decorate(pool, clients) {
  if (!clients.length) return clients;
  const ids = clients.map(c => c.id);
  const ph = ids.map((_, i) => `$${i + 1}`).join(',');
  const { rows: subs } = await pool.query(
    `SELECT s.client_id, s.received_at, s.niche, s.duplicate_of, d.name AS duplicate_of_name
       FROM fillout_submissions s LEFT JOIN clients d ON d.id = s.duplicate_of
      WHERE s.client_id IN (${ph}) ORDER BY s.received_at DESC`, ids);
  const first = new Map(); // client → newest submission
  const dup = new Map();
  for (const s of subs) {
    if (!first.has(s.client_id)) first.set(s.client_id, s);
    if (s.duplicate_of && !dup.has(s.client_id)) dup.set(s.client_id, { id: s.duplicate_of, name: s.duplicate_of_name || null });
  }
  return clients.map(c => {
    const s = first.get(c.id) || null;
    const nicheAnswer = (s && s.niche) || (c.source === 'fillout' ? c.trade : null);
    return {
      ...c,
      niche_label: c.niche_key ? N.nicheLabel(c.niche_key) : null,
      allocated: !!c.allocated_at,
      submitted_at: s ? s.received_at : null,
      fillout_niche: nicheAnswer || null,
      suggested_niche_key: c.allocated_at ? null : N.suggestedNicheKey(nicheAnswer),
      duplicate_of: dup.get(c.id) || null,
    };
  });
}

// Tabs with counts, excluding archived clients: New Clients, each niche with at least
// one client (alphabetical), Other / unsorted when used, All clients
function tabs(clients) {
  const live = clients.filter(c => !c.archived_at);
  const newClients = live.filter(c => !c.allocated_at);
  const byKey = new Map();
  for (const c of live.filter(c => c.allocated_at)) byKey.set(c.niche_key || N.OTHER.key, (byKey.get(c.niche_key || N.OTHER.key) || 0) + 1);
  const niches = N.loadNiches().filter(n => byKey.has(n.key)).map(n => ({ key: n.key, label: n.label, count: byKey.get(n.key) })).sort((a, b) => a.label.localeCompare(b.label));
  const out = [{ key: 'new', label: 'New Clients', count: newClients.length }, ...niches];
  if (byKey.has(N.OTHER.key)) out.push({ key: N.OTHER.key, label: N.OTHER.label, count: byKey.get(N.OTHER.key) });
  out.push({ key: 'all', label: 'All clients', count: live.length });
  return out;
}

module.exports = { ensureAllocationColumns, migrateAllocations, allocate, move, decorate, tabs, toDate };
