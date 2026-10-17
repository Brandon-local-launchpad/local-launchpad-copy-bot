'use strict';
// Fixture: the Clients landing page's niche tabs and allocation (fillout/niches.js,
// fillout/allocation.js, fillout/client-routes.js) with Postgres in memory and the
// real routes on express, plus the Fillout service for the resubmission rule.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const N = require(path.join(root, 'fillout/niches.js'));
const A = require(path.join(root, 'fillout/allocation.js'));
const { mountClientRoutes } = require(path.join(root, 'fillout/client-routes.js'));
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: clients by niche (tabs, allocation, migration) ===\n');
const SECRET = 'test-secret';
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const quiet = { log() {}, info() {}, warn() {}, error() {} };

(async () => {
  // ── Mapping ──
  chk('28 niches from the field map plus Other, stable dashed keys', N.loadNiches().length === 28 && N.allNiches().length === 29 && N.nicheByKey('window-cleaning').label === 'Window Cleaning' && N.nicheByKey('other').label === 'Other / unsorted', N.allNiches().length, 29);
  chk('Old catalogue names map: Roofing Company, Roofer, Landscaper Gardener, Building Company, Dog Training & Security Dogs', N.nicheKeyFor('Roofing Company') === 'roofers' && N.nicheKeyFor('Roofer') === 'roofers' && N.nicheKeyFor('Landscaper Gardener') === 'landscapers' && N.nicheKeyFor('Building Company') === 'builders' && N.nicheKeyFor('Dog Training & Security Dogs') === 'dog-training', '', '');
  chk('Fillout labels map 1:1, case and whitespace ignored', N.nicheKeyFor('Plumbing & Heating') === 'plumbing-heating' && N.nicheKeyFor('  window cleaning ') === 'window-cleaning' && N.nicheKeyFor('Flooring Fitters (carpet/laminate/LVT)') === 'flooring', '', '');
  chk('Carpenter, Plasterer, Skip Hire and unknown values → other; blank → null', N.nicheKeyFor('Carpenter') === 'other' && N.nicheKeyFor('Plasterer') === 'other' && N.nicheKeyFor('Skip Hire') === 'other' && N.nicheKeyFor('Roofing') === 'other' && N.nicheKeyFor('') === null, '', '');
  chk('A suggestion is only a real niche, never other', N.suggestedNicheKey('Roofers') === 'roofers' && N.suggestedNicheKey('Roofing') === null && N.suggestedNicheKey(null) === null, '', '');

  // ── Database and app ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, page_type TEXT, page_title TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await A.ensureAllocationColumns(pool);
  chk('Allocation columns added idempotently (second call is a no-op)', await A.ensureAllocationColumns(pool).then(() => true), '', '');

  // Existing hand-made clients, as the live table has them
  const ins = async (name, trade, created, extra = '') => (await pool.query(`INSERT INTO clients (name, trade, created_at${extra ? ', ' + extra.split('=')[0] : ''}) VALUES ($1, $2, $3${extra ? ', ' + extra.split('=')[1] : ''}) RETURNING id`, [name, trade, created])).rows[0].id;
  const edens = await ins('Edens Edge', 'Landscaper Gardener', '2026-09-01T10:00:00Z');
  const kestrel = await ins('Kestrel Ridge', 'Roofing Company', '2026-09-15T10:00:00Z');
  const legacy = await ins('Old Roofer', 'Roofer', '2026-08-01T10:00:00Z');
  const chippy = await ins('Chips Carpentry', 'Carpenter', '2026-07-01T10:00:00Z');
  const archivedHand = await ins('Gone Gardens', 'Landscaper Gardener', '2026-06-01T10:00:00Z');
  await pool.query(`UPDATE clients SET archived_at = NOW() WHERE id = $1`, [archivedHand]);
  // Fillout clients: one live (must stay for New Clients), one archived (must not come back)
  const filloutLive = await ins('New Plumber', 'Plumbing & Heating', '2026-10-10T10:00:00Z');
  await pool.query(`UPDATE clients SET source = 'fillout' WHERE id = $1`, [filloutLive]);
  const filloutArchived = await ins('Archived Plumber', 'Plumbing & Heating', '2026-10-09T10:00:00Z');
  await pool.query(`UPDATE clients SET source = 'fillout', archived_at = NOW() WHERE id = $1`, [filloutArchived]);

  // ── Migration ──
  const m1 = await A.migrateAllocations(pool, { log: quiet });
  const row = async id => (await pool.query(`SELECT niche_key, signed_on, allocated_at, allocation_source FROM clients WHERE id = $1`, [id])).rows[0];
  chk('Migration: matched clients placed (Edens → landscapers, Kestrel → roofers, legacy Roofer → roofers), auto, signed on their created date', (await row(edens)).niche_key === 'landscapers' && (await row(kestrel)).niche_key === 'roofers' && (await row(legacy)).niche_key === 'roofers' && (await row(edens)).allocation_source === 'auto' && A.toDate((await row(edens)).signed_on) === '2026-09-01' && !!(await row(edens)).allocated_at, JSON.stringify([await row(edens), await row(kestrel)]), '');
  chk('Migration: unmatched Carpenter → other, allocated', (await row(chippy)).niche_key === 'other' && !!(await row(chippy)).allocated_at, JSON.stringify(await row(chippy)), 'other');
  chk('Migration: live Fillout client left unallocated; archived Fillout client allocated so it never shows in New Clients', !(await row(filloutLive)).allocated_at && !!(await row(filloutArchived)).allocated_at && (await row(filloutArchived)).niche_key === 'plumbing-heating', JSON.stringify([await row(filloutLive), await row(filloutArchived)]), '');
  chk('Migration counts: 5 placed (3 live hand-made, the archived hand-made, the archived Fillout), 1 other, 1 left', m1.matched === 5 && m1.unmatched === 1 && m1.left === 1, JSON.stringify(m1), '{matched:5,unmatched:1,left:1}');
  const snap = async () => JSON.stringify((await pool.query(`SELECT id, niche_key, signed_on, allocated_at, allocation_source FROM clients ORDER BY id`)).rows);
  const before = await snap();
  const m2 = await A.migrateAllocations(pool, { log: quiet });
  chk('Migration is idempotent: a second run changes nothing', m2.matched === 0 && m2.unmatched === 0 && m2.left === 1 && (await snap()) === before, JSON.stringify(m2), 'no changes');

  // ── App: client routes + fillout webhook (for the resubmission rule) ──
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), fetchAudio: async () => ({ buffer: Buffer.from('ID3x'), contentType: 'audio/mpeg' }), log: quiet });
  const app = express();
  routes.mountWebhook(app, svc, { secret: SECRET, log: quiet });
  app.use(express.json());
  routes.mountApi(app, svc);
  mountClientRoutes(app, pool);
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async r => r.json();
  const list = async (q = '') => json(await req('GET', '/api/clients' + q));
  const tabOf = (tabs, key) => tabs.find(t => t.key === key);
  const submit = async (sid, name, email, niche) => {
    const p = clone(sample); p.submission.submissionId = sid;
    const qs = p.submission.questions;
    qs.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = name; qs.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = email;
    if (niche !== undefined) qs.find(q => q.id === 'q_niche_select').value = niche;
    qs.find(q => q.id === 'rygW9ALYDsZ1d5f2K5pRHg').value = null;
    await req('POST', `/api/webhooks/fillout?token=${SECRET}`, p);
    for (let i = 0; i < 300; i++) { const r = (await pool.query(`SELECT client_id, status FROM fillout_submissions WHERE submission_id = $1`, [sid])).rows[0]; if (r && r.status !== 'received') return r.client_id; await sleep(10); }
    throw new Error('never processed');
  };

  try {
    // ── Counts and tabs ──
    let d = await list();
    chk('Tabs: New Clients first, niches alphabetical with counts, Other, All last; archived excluded from every count', d.tabs[0].key === 'new' && d.tabs[0].count === 1 && d.tabs[d.tabs.length - 1].key === 'all' && d.tabs[d.tabs.length - 1].count === 5 && tabOf(d.tabs, 'landscapers').count === 1 && tabOf(d.tabs, 'roofers').count === 2 && tabOf(d.tabs, 'other').count === 1 && !tabOf(d.tabs, 'plumbing-heating'), JSON.stringify(d.tabs), 'new 1, landscapers 1, roofers 2, other 1, all 5');
    chk('Tabs are alphabetical between New and Other', d.tabs.slice(1, -1).filter(t => t.key !== 'other').map(t => t.label).join('|') === 'Landscapers/Gardeners|Roofers', d.tabs.map(t => t.label).join('|'), '');
    chk('Archived clients are hidden by default and shown with ?archived=1', !d.clients.some(c => c.archived_at) && (await list('?archived=1')).clients.some(c => c.id === archivedHand), '', '');
    chk('Niche list carries 29 entries for the dropdowns', d.niches.length === 29 && d.niches.some(n => n.key === 'other'), d.niches.length, 29);

    // ── New Clients membership and suggestion ──
    const cPlumber = await submit('nc-0001', 'Pipes R Us', 'pipes@example.com', 'Plumbing & Heating');
    const cUnknown = await submit('nc-0002', 'Mystery Trade', 'mystery@example.com', 'Roofing');
    d = await list();
    const inNew = d.clients.filter(c => !c.allocated);
    chk('New Clients holds the unallocated Fillout clients only (3), not the migrated ones', inNew.length === 3 && inNew.every(c => c.source === 'fillout') && !inNew.some(c => c.id === edens), inNew.map(c => c.name).join(','), 'New Plumber, Pipes R Us, Mystery Trade');
    const pipes = d.clients.find(c => c.id === cPlumber), mystery = d.clients.find(c => c.id === cUnknown);
    chk('Suggested niche comes from the Fillout dropdown answer, with the form date', pipes.suggested_niche_key === 'plumbing-heating' && pipes.fillout_niche === 'Plumbing & Heating' && !!pipes.submitted_at, JSON.stringify([pipes.suggested_niche_key, pipes.fillout_niche]), 'plumbing-heating');
    chk('An unknown niche answer gives no suggestion but keeps the answer text; the client still shows in New Clients', mystery.suggested_niche_key === null && mystery.fillout_niche === 'Roofing' && !mystery.allocated, JSON.stringify([mystery.suggested_niche_key, mystery.fillout_niche]), '[null,"Roofing"]');
    chk('New Clients tab count is 3', tabOf(d.tabs, 'new').count === 3, tabOf(d.tabs, 'new').count, 3);

    // ── Allocation ──
    let r = await req('POST', `/api/clients/${cPlumber}/allocate`, { niche_key: 'plumbing-heating', signed_on: '2026-10-12' });
    const al = await json(r);
    chk('Allocating saves niche, date, allocated_at, source confirmed, and returns fresh tab counts', r.status === 200 && al.niche_key === 'plumbing-heating' && A.toDate(al.signed_on) === '2026-10-12' && al.allocation_source === 'confirmed' && !!al.allocated_at && tabOf(al.tabs, 'new').count === 2 && tabOf(al.tabs, 'plumbing-heating').count === 1, JSON.stringify(al), '');
    d = await list();
    chk('The client moved to its niche tab and left New Clients; trade now reads the niche label', d.clients.find(c => c.id === cPlumber).allocated && !d.clients.filter(c => !c.allocated).some(c => c.id === cPlumber) && d.clients.find(c => c.id === cPlumber).trade === 'Plumbing & Heating', '', '');
    r = await req('POST', `/api/clients/${cUnknown}/allocate`, { niche_key: 'nope', signed_on: '2026-10-12' });
    chk('Unknown niche key refused', r.status === 400, r.status, 400);
    r = await req('POST', `/api/clients/${cUnknown}/allocate`, { niche_key: 'roofers' });
    chk('Missing date refused', r.status === 400, r.status, 400);
    r = await req('POST', `/api/clients/${cUnknown}/allocate`, { niche_key: 'roofers', signed_on: '2026-10-11' });
    chk('No-suggestion client allocated by picking a niche', r.status === 200 && (await json(r)).niche_key === 'roofers', r.status, 200);
    chk('Allocating does not touch reviewed_at', (await pool.query(`SELECT reviewed_at FROM clients WHERE id = $1`, [cPlumber])).rows[0].reviewed_at === null, '', 'null');

    // ── Resubmission does not reset allocation ──
    const before2 = await row(cPlumber);
    const again = await submit('nc-0001b', 'Pipes R Us', 'pipes@example.com', 'Plumbing & Heating');
    chk('A resubmission merges into the allocated client and leaves niche, date, allocated_at and source as they were', again === cPlumber && JSON.stringify(await row(cPlumber)) === JSON.stringify(before2), JSON.stringify([again === cPlumber, await row(cPlumber)]), JSON.stringify(before2));

    // ── A brand-new niche value still lands in New Clients ──
    const cGutter = await submit('nc-0003', 'Gutter Co', 'gutter@example.com', 'Guttering & Fascias');
    d = await list();
    chk('A Fillout client whose niche has no tab yet still appears in New Clients with its suggestion; the tab appears only after allocation', !d.clients.find(c => c.id === cGutter).allocated && d.clients.find(c => c.id === cGutter).suggested_niche_key === 'guttering' && !tabOf(d.tabs, 'guttering'), JSON.stringify(d.tabs.map(t => t.key)), 'no guttering tab yet');
    await req('POST', `/api/clients/${cGutter}/allocate`, { niche_key: 'guttering', signed_on: '2026-10-13' });
    d = await list();
    chk('…and now the Guttering tab exists with 1', tabOf(d.tabs, 'guttering') && tabOf(d.tabs, 'guttering').count === 1, JSON.stringify(d.tabs.map(t => [t.key, t.count])), 'guttering 1');

    // ── Move to another niche ──
    r = await req('POST', `/api/clients/${legacy}/move`, { niche_key: 'builders' });
    const mv = await json(r);
    // Roofers held Kestrel, the legacy Roofer and the no-suggestion client (3); the legacy one leaves
    chk('Move to another niche: niche changes, source manual, signed date kept, tabs refreshed', r.status === 200 && mv.niche_key === 'builders' && mv.allocation_source === 'manual' && A.toDate(mv.signed_on) === '2026-08-01' && tabOf(mv.tabs, 'roofers').count === 2 && tabOf(mv.tabs, 'builders').count === 1, JSON.stringify(mv.tabs), 'roofers 2, builders 1');

    // ── New Client button: niche and date straight into the tab ──
    r = await req('POST', '/api/clients', { name: 'Hand Made Tiles', niche_key: 'tiling', signed_on: '2026-10-01' });
    const made = await json(r);
    chk('New Client with niche and signed date is allocated (manual) and in its tab at once', r.status === 200 && made.niche_key === 'tiling' && made.allocation_source === 'manual' && A.toDate(made.signed_on) === '2026-10-01' && made.trade === 'Tiling' && tabOf((await list()).tabs, 'tiling').count === 1, JSON.stringify(made), '');
    r = await req('POST', '/api/clients', { name: 'Old Style', trade: 'Roofing Company' });
    const old = await json(r);
    chk('Old callers sending only trade still work: mapped and allocated, trade kept as sent', r.status === 200 && old.niche_key === 'roofers' && old.trade === 'Roofing Company' && old.allocated_at, JSON.stringify(old), '');
    r = await req('POST', '/api/clients', { name: 'No niche' });
    chk('New Client without a niche refused', r.status === 400, r.status, 400);

    // ── Duplicate flag reaches the landing page ──
    const dupId = await submit('nc-0004', 'Pipes R Us', 'other@example.com', 'Plumbing & Heating');
    d = await list();
    chk('Possible duplicate flag shows on the New Clients row', d.clients.find(c => c.id === dupId).duplicate_of && d.clients.find(c => c.id === dupId).duplicate_of.id === cPlumber, JSON.stringify(d.clients.find(c => c.id === dupId).duplicate_of), cPlumber);
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
