'use strict';
// Fixture: Location Determiner Stage 5, the review (locations/review.js) on pg-mem with the real
// places table and the recorded Edens Edge run: the view, moves by hand, a place added by name,
// the client message and reply, the approval into client_location_tiers, the cap.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const P = require(path.join(root, 'locations/places.js'));
const S = require(path.join(root, 'locations/serp.js'));
const V = require(path.join(root, 'locations/review.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));
const E = require(path.join(root, 'tests/fixtures/data/edens-edge-locations.js'));
const STUB = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
const RECORDED = path.join(root, 'tests/fixtures/data/edens-edge-locations-recorded.json');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Location Determiner Stage 5, the review (pg-mem) ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await P.ensurePlacesTables(pool);
  await P.seedPlaces(pool, { log: null });
  await S.ensureSerpTables(pool);
  await V.ensureReviewTables(pool);
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY, name TEXT NOT NULL)`);
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE keyword_volumes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), keyword TEXT NOT NULL, location_code INTEGER NOT NULL, volume INTEGER, cpc NUMERIC, status TEXT NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), cost NUMERIC)`);
  const CLIENT = '11111111-1111-4111-8111-111111111111';
  await pool.query(`INSERT INTO clients (id, name) VALUES ($1, 'Edens Edge (fixture)')`, [CLIENT]);

  // The run, replayed (the determiner fixture explains the stub fallback)
  const recorded = fs.existsSync(RECORDED) ? JSON.parse(fs.readFileSync(RECORDED, 'utf8')) : null;
  const real = !!(recorded && Object.keys(recorded.volumes || {}).length > 100);
  const volumeOf = k => (real ? (recorded.volumes[k] ? recorded.volumes[k].volume : null) : (STUB.TABLE[k] ? STUB.TABLE[k][0] : 0));
  const serpItems = (keyword, lat, lng) => real ? ((([...recorded.serps, ...(recorded.samples || [])].find(s => s.keyword === keyword && Math.abs(s.lat - lat) < 0.001 && Math.abs(s.lng - lng) < 0.001)) || {}).items || []) : [];
  const h1 = { cached: async () => new Map(), lookup: async kws => ({ volumes: new Map(kws.map(k => [k, { volume: volumeOf(k), cpc: null }])), fetched: kws.length, cost: 0 }) };
  const places = P.createPlacesStore(pool);
  const serp = S.createSerpStore(pool, { fetchSerpImpl: async ({ keyword, lat, lng }) => ({ items: serpItems(keyword, lat, lng), cost: 0.002, check_url: '' }) });
  const svc = createLocationService({ pool, filloutService: null, pageMapStore: null, h1, places, serp, geocode: async () => null, log: { error: () => {} } });
  const review = V.createLocationReview({ pool, places, locations: svc, log: { log: () => {} } });

  const before = await review.view(CLIENT);
  chk('no run yet: the view says so and nothing else', !before.ok && before.problems[0].code === 'no_run', JSON.stringify(before.problems), 'no_run');

  const run = await svc.run(CLIENT, { inputs: E.inputs(), persist: true });
  chk('the run saved itself as the client\'s locations_run asset', run.ok && (await svc.latestRun(CLIENT)).ran_at === run.ran_at, '', 'saved');

  let v = await review.view(CLIENT);
  const by = n => v.list.find(t => t.name === n);
  chk('the view carries the run\'s tiers: every Tier 1 town of the run is Tier 1 here, nothing moved yet', v.ok && run.tiers.tier1.every(t => (by(t.name) || {}).to === 'tier1') && v.counts.moved === 0, JSON.stringify(v.counts), 'Tier 1 as the run, moved 0');
  chk('shared-name districts and beyond-reach towns are in the list with the run\'s reason', v.list.some(t => t.to === 'excluded' && /name shared elsewhere/.test(t.why)) && v.list.some(t => t.to === 'area_only' && /beyond reach/.test(t.why)), '', 'both present');
  chk('the list is sorted Tier 1, Tier 2, area only, excluded', (() => { const o = { tier1: 0, tier2: 1, area_only: 2, excluded: 3 }; return v.list.every((t, i) => i === 0 || o[v.list[i - 1].to] <= o[t.to]); })(), v.list.map(t => t.to[0]).join(''), 'non-decreasing');
  chk('GBP areas: 20 at most, towns only, Tier 1 first', v.gbp_areas.length <= 20 && v.gbp_areas.every(g => (by(g.name) || {}).type === 'town') && v.gbp_areas[0].from === 'Tier 1', JSON.stringify(v.gbp_areas.slice(0, 3)), 'Tier 1 towns first');
  chk('the client message lists every page town with a tick box and says to untick', v.message.towns.length === v.counts.tier1 + v.counts.tier2 && /untick/i.test(v.message.text) && v.message.towns.every(t => v.message.text.includes(`[ ] ${t.name}`)), v.message.text.slice(0, 200), 'every page town ticked');
  chk('no approval yet, no warnings', v.approval === null && v.warnings.length === 0, JSON.stringify(v.warnings), 'none');

  // Moves by hand
  const totton = by('Totton');
  chk('Totton is in the run\'s list', !!totton, '', 'present');
  v = await review.move(CLIENT, { place_id: totton.place_id, to: 'tier1', note: 'the client\'s best area' });
  chk('a move to Tier 1 shows as moved, with the note and what it was', by('Totton').to === 'tier1' && by('Totton').moved && /moved by hand to Tier 1: the client's best area \(was /.test(by('Totton').why), by('Totton').why, 'moved by hand to Tier 1: … (was …)');
  chk('a move changes the counts and the GBP order', v.counts.moved === 1 && v.gbp_areas.some(g => g.name === 'Totton' && g.from === 'Tier 1'), JSON.stringify(v.counts), 'moved 1, Totton Tier 1 in GBP');
  v = await review.move(CLIENT, { place_id: totton.place_id, to: 'reset' });
  chk('reset returns the town to the run\'s decision', !by('Totton').moved && by('Totton').to === by('Totton').run_to && v.counts.moved === 0, by('Totton').to + ' / ' + by('Totton').run_to, 'equal, moved 0');
  let err = null;
  try { await review.move(CLIENT, { place_id: totton.place_id, to: 'tier9' }); } catch (e) { err = e; }
  chk('an unknown destination is refused', err && err.status === 400, err && err.message, '400');
  err = null;
  try { await review.move(CLIENT, { place_id: 'nowhere', to: 'tier1' }); } catch (e) { err = e; }
  chk('a place not in the run is refused', err && err.status === 404, err && err.message, '404');

  // A place added by name
  const sug = await review.suggest(CLIENT, 'Andover');
  chk('suggestions find Andover, nearest the base first, with miles', sug.length > 0 && sug[0].name === 'Andover' && sug[0].miles > 15, JSON.stringify(sug[0]), 'Andover, 15+ mi');
  v = await review.addPlace(CLIENT, { name: 'Andover', to: 'tier2' });
  chk('Andover (outside the outer limit, never a candidate) is added by hand as Tier 2, source manual', by('Andover') && by('Andover').source === 'manual' && by('Andover').to === 'tier2' && by('Andover').why === 'added by hand' && v.counts.manual === 1, JSON.stringify(by('Andover') && { s: by('Andover').source, to: by('Andover').to, mi: by('Andover').miles }), 'manual, tier2');
  v = await review.addPlace(CLIENT, { name: 'Bitterne', to: 'tier2' });
  chk('a place the run already judged (Bitterne, excluded for no volume) is moved, not added twice', by('Bitterne') && by('Bitterne').source !== 'manual' && by('Bitterne').to === 'tier2' && by('Bitterne').moved && v.list.filter(t => t.name === 'Bitterne').length === 1, JSON.stringify(by('Bitterne') && { s: by('Bitterne').source, to: by('Bitterne').to }), 'scored, tier2, moved');
  err = null;
  try { await review.addPlace(CLIENT, { name: 'Nowhereville Upon Nothing' }); } catch (e) { err = e; }
  chk('an unknown name is refused with a plain message', err && err.status === 404 && /not in the places table/.test(err.message), err && err.message, '404');
  err = null;
  try { await review.addPlace(CLIENT, { name: 'New Forest' }); } catch (e) { err = e; }
  chk('a council area cannot be added', err && err.status === 400 && /council area/.test(err.message), err && err.message, '400 council area');
  v = await review.move(CLIENT, { place_id: by('Bitterne').place_id, to: 'reset' });
  v = await review.move(CLIENT, { place_id: by('Andover').place_id, to: 'area_only' });
  chk('a manual place can be moved too (Andover to area only)', by('Andover').to === 'area_only' && by('Andover').source === 'manual', by('Andover').to, 'area_only');

  // The client's reply
  const romsey = by('Romsey');
  chk('Romsey is a page town before the reply', romsey && !!romsey.tier, romsey && romsey.to, 'tier1 or tier2');
  v = await review.clientReply(CLIENT, { declined: [romsey.place_id], note: 'WhatsApp, 29 Oct' });
  chk('a declined page town becomes area only with the reply as the reason', by('Romsey').to === 'area_only' && by('Romsey').client_declined && /client declined/.test(by('Romsey').why), by('Romsey').why, 'client declined: …');
  chk('the message no longer lists Romsey, the counts say one declined', !v.message.towns.some(t => t.name === 'Romsey') && v.counts.declined === 1, JSON.stringify(v.counts), 'declined 1');
  chk('the reply is kept with its note and time', v.state.client_reply && v.state.client_reply.note === 'WhatsApp, 29 Oct' && v.state.client_reply.declined.length === 1, JSON.stringify(v.state.client_reply), 'declined [Romsey], note');

  // Approve
  v = await review.approve(CLIENT, { who: 'Brandon' });
  chk('approve writes client_location_tiers with approved_at and who', v.approval && v.approval.approved_by === 'Brandon' && v.approval.approved_at && v.approval.rows.length > 10, JSON.stringify(v.approval && v.approval.counts), 'rows with approved_at');
  chk('the approval holds every Tier 1 and Tier 2 town of the view and the declined town as area only', v.approval.counts.tier1 === v.counts.tier1 && v.approval.counts.tier2 === v.counts.tier2 && v.approval.rows.some(r => r.name === 'Romsey' && r.outcome === 'area_only' && r.scores.client_declined), JSON.stringify(v.approval.counts) + ' vs ' + JSON.stringify(v.counts), 'equal');
  chk('the manual place is in the approval with source manual', v.approval.rows.some(r => r.name === 'Andover' && r.source === 'manual'), '', 'Andover manual');
  chk('districts excluded for a shared name are not in the approval; an excluded row is only there when the client typed it', !v.approval.rows.some(r => r.type === 'district' && r.outcome === 'excluded') && v.approval.rows.filter(r => r.outcome === 'excluded').every(r => r.scores.client_asked), v.approval.rows.filter(r => r.outcome === 'excluded').map(r => r.name + ':' + r.why).join(' | '), 'only typed exclusions');
  const { rows: dbRows } = await pool.query(`SELECT COUNT(*)::int AS n, COUNT(DISTINCT place_id)::int AS d FROM client_location_tiers WHERE client_id = $1`, [CLIENT]);
  chk('one row per place in the table', dbRows[0].n === dbRows[0].d && dbRows[0].n === v.approval.rows.length, JSON.stringify(dbRows[0]), 'n = distinct = rows');
  const again = await review.approve(CLIENT, { who: 'Brandon' });
  chk('approving again replaces the rows (same count, newer time)', again.approval.rows.length === v.approval.rows.length && new Date(again.approval.approved_at) >= new Date(v.approval.approved_at), '', 'replaced');

  // The cap: 21 page towns cannot be approved
  const areaTowns = v.list.filter(t => t.to === 'area_only' && t.type === 'town' && !t.client_declined);
  const need = 21 - (v.counts.tier1 + v.counts.tier2);
  for (const t of areaTowns.slice(0, Math.max(0, need))) v = await review.move(CLIENT, { place_id: t.place_id, to: 'tier2' });
  chk('over the cap the view warns', v.counts.tier1 + v.counts.tier2 >= 21 && v.warnings.some(w => w.code === 'over_cap'), JSON.stringify(v.warnings), 'over_cap');
  err = null;
  try { await review.approve(CLIENT, { who: 'Brandon' }); } catch (e) { err = e; }
  chk('and refuses the approval', err && err.status === 409 && /cap/.test(err.message), err && err.message, '409 cap');

  await pool.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
