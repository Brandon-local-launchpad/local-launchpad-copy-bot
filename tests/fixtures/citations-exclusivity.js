'use strict';
// Fixture: the exclusivity check (citations/exclusivity.js) on pg-mem. Two landscapers with
// overlapping approved towns warn each other; a roofer in the same towns does not; an archived
// client does not; area only places do not count; a list that is not approved yet (the Locations
// review) is checked against the others' approvals; every pair for the dashboard.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { createExclusivity } = require(path.join(root, 'citations/exclusivity.js'));
const V = require(path.join(root, 'locations/review.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations exclusivity check ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await V.ensureReviewTables(pool);
  const mk = async (name, niche, archived = false) => (await pool.query(`INSERT INTO clients (name, trade, niche_key, archived_at) VALUES ($1, 'x', $2, $3) RETURNING id`, [name, niche, archived ? new Date() : null])).rows[0].id;
  const tier = (cid, pid, name, t, outcome = 'tier') => pool.query(`INSERT INTO client_location_tiers (client_id, place_id, name, type, outcome, tier, phase, source, approved_at, approved_by) VALUES ($1, $2, $3, 'town', $4, $5, $5, 'scored', NOW(), 'test')`, [cid, pid, name, outcome, t]);
  const edens = await mk('Edens Edge', 'landscapers');
  const green = await mk('Green Fingers', 'landscapers');
  const roofer = await mk('Kestrel Ridge', 'roofers');
  const gone = await mk('Old Landscapes', 'landscapers', true);
  const far = await mk('Northern Gardens', 'landscapers');
  for (const [pid, name, t] of [['E1', 'Southampton', 1], ['E2', 'Romsey', 1], ['E3', 'Winchester', 2]]) await tier(edens, pid, name, t);
  await pool.query(`INSERT INTO client_location_tiers (client_id, place_id, name, type, outcome, tier, phase, source, approved_at, approved_by) VALUES ($1, 'E9', 'Lymington', 'town', 'area_only', NULL, NULL, 'scored', NOW(), 'test')`, [edens]);
  for (const [pid, name, t] of [['E2', 'Romsey', 1], ['E3', 'Winchester', 1], ['E4', 'Eastleigh', 1]]) await tier(green, pid, name, t);
  for (const [pid, name, t] of [['E1', 'Southampton', 1], ['E2', 'Romsey', 1]]) await tier(roofer, pid, name, t);
  for (const [pid, name, t] of [['E1', 'Southampton', 1], ['E9', 'Lymington', 1]]) await tier(gone, pid, name, t);
  for (const [pid, name, t] of [['N1', 'Leeds', 1]]) await tier(far, pid, name, t);
  const X = createExclusivity({ pool });

  const e = await X.overlapsFor(edens);
  chk('Edens Edge: Green Fingers shares Romsey and Winchester; the roofer, the archived client and the Leeds client do not', e.length === 1 && e[0].name === 'Green Fingers' && e[0].count === 2 && e[0].shared.map(t => t.name).join() === 'Romsey,Winchester' && e[0].shared[1].my_tier === 2 && e[0].shared[1].their_tier === 1, JSON.stringify(e), '');
  chk('the message in plain words', e[0].message === 'Green Fingers (same niche) also has 2 of these towns: Romsey, Winchester.', e[0].message, '');
  const g = await X.overlapsFor(green);
  chk('Green Fingers sees Edens Edge back', g.length === 1 && g[0].name === 'Edens Edge' && g[0].count === 2, JSON.stringify(g), '');
  chk('an area only place never counts (Lymington is area only for Edens Edge, approved for the archived client anyway)', !e.some(x => x.shared.some(t => t.name === 'Lymington')), '', '');
  chk('the roofer has no overlap (a different niche)', (await X.overlapsFor(roofer)).length === 0, '', '');
  chk('a list that is not approved yet is checked against the others: Edens Edge adding Eastleigh would share three towns with Green Fingers', (await X.overlapsFor(edens, { towns: [{ place_id: 'E1', name: 'Southampton', tier: 1 }, { place_id: 'E2', name: 'Romsey', tier: 1 }, { place_id: 'E3', name: 'Winchester', tier: 1 }, { place_id: 'E4', name: 'Eastleigh', tier: 2 }] }))[0].count === 3, '', '');
  const all = await X.overlapsAll();
  chk('every pair: one (Edens Edge and Green Fingers), the archived and other niche clients left out', all.length === 1 && all[0].niche_key === 'landscapers' && all[0].count === 2, JSON.stringify(all), '');
  chk('a client with no niche: no check', (await X.overlapsFor(await mk('Nobody', 'other'))).length === 0, '', '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
