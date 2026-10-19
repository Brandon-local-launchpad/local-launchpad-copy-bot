'use strict';
// Fixture: launch phases on the page map (page-map/generator.js, plan-v3.planLinks, store).
// Defaults per page type, the launch-town toggle (base town always phase 1), links to phase-2
// targets suppressed and flagged "links when published", the export's phase and WordPress
// status, and "Publish phase 2" flipping every page to publish and planning the links again.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const G = require(path.join(root, 'page-map/generator.js'));
const R = require(path.join(root, 'fillout/services/resolver.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const { volumes } = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: launch phases ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const config = R.loadConfig('landscapers-gardeners');
const resolved = R.resolve(ticks, config, { categoryTabRule: 'ticked_only' });
const input = { resolved, baseTown: S.BASE_TOWN, otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY, niche: 'Landscapers/Gardeners' };
const build = (opts = {}) => G.buildPageMap(input, { volumes: volumes(), ...opts });
const find = (m, slug) => m.rows.find(r => r.slug === slug);
const phase = (m, slug) => find(m, slug).info.phase;

(async () => {
  // ── Defaults ──
  const m = build();
  chk('Defaults: homepage, category, service and town service pages are phase 1', phase(m, '/') === 1 && phase(m, '/gardener') === 1 && phase(m, '/services/hedge-trimming') === 1 && phase(m, '/locations/romsey/tree-stump-removal') === 1, JSON.stringify(m.rows.filter(r => r.type !== 'location' && r.type !== 'location_category').map(r => [r.slug, r.info.phase]).filter(x => x[1] !== 1)), '[]');
  chk('Defaults: location and location category pages are phase 2 when the town is not a launch town (no toggles yet): 91 pages', m.rows.filter(r => ['location', 'location_category'].includes(r.type)).every(r => r.info.phase === 2) && m.counts.phase2 === 91 && m.counts.phase1 === 83, JSON.stringify([m.counts.phase1, m.counts.phase2]), '[83,91]');
  chk('The base town always counts as a launch town (it has no location page, so nothing changes), and it is listed', m.launchTowns.length === 0 && !m.rows.some(r => /\/locations\/southampton/.test(r.slug)), JSON.stringify(m.launchTowns), '');
  // ── The toggle ──
  const t = build({ launchTowns: new Set(['romsey', 'winchester']) });
  chk('Launch towns: Romsey and Winchester pages become phase 1 (2 locations + 12 location categories), the other towns stay phase 2', phase(t, '/locations/romsey') === 1 && phase(t, '/locations/winchester/gardener') === 1 && phase(t, '/locations/eastleigh') === 2 && phase(t, '/locations/eastleigh/gardener') === 2 && t.counts.phase1 === 83 + 14 && t.counts.phase2 === 91 - 14 && t.launchTowns.join() === 'Romsey,Winchester', JSON.stringify([t.counts.phase1, t.counts.phase2, t.launchTowns]), '');
  // ── Links ──
  const home = find(t, '/'), cat = find(t, '/tree-service'), svc = find(t, '/services/tree-stump-removal'), romsey = find(t, '/locations/romsey'), east = find(t, '/locations/eastleigh'), eastGard = find(t, '/locations/eastleigh/gardener');
  chk('A phase 1 page links only to phase 1 pages: the homepage links to Romsey and Winchester, not the 11 phase-2 locations; links_to leaves them out', home.links_to.filter(l => l.startsWith('/locations/')).sort().join() === '/locations/romsey,/locations/winchester' && home.links.areas.length === 13, JSON.stringify(home.links_to), '');
  chk('A phase-2 target stays in its section as plain text, flagged "links when published", with the phase', home.links.areas.find(x => x.to === '/locations/eastleigh').unlinked === true && home.links.areas.find(x => x.to === '/locations/eastleigh').flag === 'links when published' && home.links.areas.find(x => x.to === '/locations/eastleigh').phase === 2 && !home.links.areas.find(x => x.to === '/locations/romsey').unlinked, JSON.stringify(home.links.areas.slice(0, 3)), '');
  chk('Category and base service pages: areas block entries for phase-2 towns are flagged, Romsey and Winchester linked', cat.links.areas.filter(x => x.unlinked).length === 11 && !cat.links.areas.find(x => x.to === '/locations/winchester/tree-service').unlinked && svc.links.areas.filter(x => x.unlinked).length === 11 && svc.links_to.includes('/locations/romsey/tree-stump-removal') && !svc.links_to.includes('/locations/eastleigh/tree-service'), JSON.stringify(svc.links.areas.map(x => [x.anchor, !!x.unlinked])), '');
  chk('A phase 1 location page (Romsey) links to its sibling Winchester but flags the phase-2 siblings; a phase 2 page (Eastleigh) links to everything, phase 1 and 2', romsey.links.areas.find(x => x.to === '/locations/winchester').unlinked !== true && romsey.links.areas.find(x => x.to === '/locations/eastleigh').unlinked === true && !east.links.areas.some(x => x.unlinked) && east.links_to.includes('/locations/romsey') && east.links_to.includes('/locations/lyndhurst') && !eastGard.links.cards.some(x => x.unlinked) && eastGard.links_to.includes('/gardener'), JSON.stringify([romsey.links_to, east.links_to.length]), '');
  chk('links_from mirrors only real links: Eastleigh is not linked from the homepage, but is from Lyndhurst (phase 2)', !east.links_from.includes('/') && east.links_from.includes('/locations/lyndhurst') && romsey.links_from.includes('/'), JSON.stringify(east.links_from), '');
  // ── Export ──
  const csv = G.toCsv(t.rows);
  const head = csv.split('\r\n')[0];
  const line = slug => csv.split('\r\n').find(l => l.includes(`,${slug},`)) || '';
  chk('The export carries the phase and the WordPress status it implies: publish for phase 1, "draft + noindex" for phase 2', /,Launch Phase,WordPress Status$/.test(head) && /,1,publish$/.test(line('/locations/romsey')) && /,2,draft \+ noindex$/.test(line('/locations/eastleigh')) && /,1,publish$/.test(line('/services/tree-stump-removal')), [line('/locations/romsey').slice(-20), line('/locations/eastleigh').slice(-22)].join(' | '), '');
  chk('A phase-2 target is exported as plain text with the flag, a phase-1 one as a link', /Eastleigh \(links when published\)/.test(line('/services/tree-stump-removal')) && /Romsey → \/locations\/romsey\/tree-stump-removal/.test(line('/services/tree-stump-removal')), line('/services/tree-stump-removal').slice(0, 300), '');
  // ── Publish phase 2 (pure) ──
  const p = build({ launchTowns: new Set(['romsey']), phase2Published: true });
  chk('Published: every page is phase 1, nothing flagged, the homepage links to all 13 locations', p.counts.phase2 === 0 && p.counts.phase1 === p.counts.total && !p.rows.some(r => Object.values(r.links).filter(Array.isArray).flat().some(x => x && x.unlinked)) && find(p, '/').links_to.filter(l => l.startsWith('/locations/')).length === 13 && p.phase2Published === true, JSON.stringify([p.counts.phase1, p.counts.phase2]), '');

  // ── Through the store: the toggle, regeneration, the publish action ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool);
  const svcF = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  const store = createPageMapStore({ pool, filloutService: svcF, volumesFor: async () => volumes() });
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper')`);
  await S.seed(pool, { write: true, log() {} });
  const cid = (await pool.query(`SELECT id FROM clients WHERE name = 'ednes edge testing'`)).rows[0].id;
  await store.generate(cid);
  let rows = await store.saved(cid);
  const byKey = k => rows.find(r => r.page_key === k);
  chk('Generated with no launch towns: 83 phase 1, 91 phase 2, saved in info.phase and the state counts', rows.filter(r => r.info.phase === 2).length === 91 && byKey('location:/locations/romsey').info.phase === 2 && (await store.state(cid)).counts.phase2 === 91, JSON.stringify((await store.state(cid)).counts), '');
  chk('Publish phase 2 is refused before… no: it needs a page map, which exists; a client without one is refused', await store.publishPhase2('00000000-0000-0000-0000-000000000000').then(() => false, e => e.status === 400), '', '400');
  const flags = await store.setLaunchTown(cid, 'Romsey', true);
  chk('The launch-town toggle is stored by slug and read back', flags.has('romsey') && (await store.launchTowns(cid)).size === 1, JSON.stringify([...flags]), '');
  await store.generate(cid);
  rows = await store.saved(cid);
  chk('Regenerating applies the toggle: Romsey and its 6 location category pages move to phase 1 (an update, no new rows); the homepage now links to Romsey', byKey('location:/locations/romsey').info.phase === 1 && byKey('location_category:/locations/romsey/gardener').info.phase === 1 && rows.filter(r => r.info.phase === 2).length === 84 && byKey('homepage:/').links_to.includes('/locations/romsey') && !byKey('homepage:/').links_to.includes('/locations/eastleigh') && rows.length === 174, JSON.stringify([rows.filter(r => r.info.phase === 2).length, rows.length]), '');
  await store.setLaunchTown(cid, 'Romsey', false);
  await store.generate(cid);
  rows = await store.saved(cid);
  chk('Unticking puts the town back to phase 2', byKey('location:/locations/romsey').info.phase === 2 && !byKey('homepage:/').links_to.includes('/locations/romsey'), '', '');
  await store.setRow(cid, byKey('location:/locations/eastleigh').id, { h1: 'Gardeners Eastleigh', status: 'Copy Generated' });
  const out = await store.publishPhase2(cid);
  rows = out.rows;
  const st = await store.state(cid);
  chk('Publish phase 2: every page is phase 1 (publish), the links are planned again (the homepage links to all 13 locations), the time is recorded, nothing added or retired, a person\'s H1 and status untouched', rows.filter(r => r.applies && r.info.phase === 2).length === 0 && byKey('homepage:/').links_to.filter(l => l.startsWith('/locations/')).length === 13 && !!st.phase2_published_at && out.diff.counts.wouldAdd === 0 && out.diff.counts.wouldRetire === 0 && byKey('location:/locations/eastleigh').h1 === 'Gardeners Eastleigh' && byKey('location:/locations/eastleigh').status === 'Copy Generated', JSON.stringify([out.diff.counts, st.phase2_published_at]), '');
  const csv2 = await store.csv(cid);
  chk('After publishing, the export has no "links when published" and every row is publish', !/links when published/.test(csv2) && !/draft \+ noindex/.test(csv2) && /,1,publish\r\n/.test(csv2), '', '');
  await store.setLaunchTown(cid, 'Winchester', true);
  await store.generate(cid);
  rows = await store.saved(cid);
  chk('Once phase 2 is published, later toggles and regenerations keep everything phase 1', rows.filter(r => r.applies && r.info.phase === 2).length === 0, '', '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
