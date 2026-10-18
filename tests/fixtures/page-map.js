'use strict';
// Fixture: the page map (page-map/generator.js, page-map/store.js) on Edens Edge.
// Row counts and links against a port of the old Apps Script, the base town and
// duplicate fixes, additional services, slug collisions, regeneration (adds,
// retires, revives, never touches a person's H1, meta, status or notes), the dry
// run, a renamed town, and the Edens Edge seed (manual fields, idempotent, the
// client's existing page left alone) feeding the store through the record.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const G = require(path.join(root, 'page-map/generator.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const { oldPageMap } = require(path.join(root, 'tests/fixtures/data/old-page-map.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
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
console.log('\n=== FIXTURE: page map (Edens Edge) ===\n');
const config = R.loadConfig('landscapers-gardeners');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const build = (rule, extra = {}) => G.buildPageMap({ resolved: R.resolve(ticks, config, { categoryTabRule: rule, ...(extra.resolve || {}) }), baseTown: S.BASE_TOWN, otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY, ...extra.input });
const find = (m, slug) => m.rows.find(r => r.slug === slug);
const same = (a, b) => [...a].sort().join() === [...b].sort().join();

(async () => {
  // ── Counts ──
  const m1 = build('ticked_only'), m2 = build('ticked_or_propagated');
  chk('ticked_only: 1 + 6 categories + 78 services + 13 locations + 78 location categories = 176', JSON.stringify(m1.counts) === JSON.stringify({ homepage: 1, category: 6, service: 78, location: 13, location_category: 78, total: 176 }), JSON.stringify(m1.counts), '176');
  chk('ticked_or_propagated: 1 + 7 + 78 + 13 + 91 = 190', m2.counts.category === 7 && m2.counts.location_category === 91 && m2.counts.total === 190, JSON.stringify(m2.counts), '190');
  chk('Every page_key is type + slug and unique', new Set(m1.rows.map(r => r.page_key)).size === m1.rows.length && m1.rows.every(r => r.page_key === `${r.type}:${r.slug}`), '', '');

  // ── Base town ──
  chk('No location or location category page for the base town', !m1.rows.some(r => /\/locations\/southampton/.test(r.slug)), m1.rows.filter(r => /southampton/.test(r.slug)).map(r => r.slug).join(), 'none');
  chk('The homepage does not link to /locations/southampton, and no page does', !m1.rows.some(r => r.links_to.includes('/locations/southampton') || r.links_from.includes('/locations/southampton')), '', '');
  chk('Base town in the other towns list (any case) is dropped and reported', (() => { const m = build('ticked_only', { input: { otherTowns: 'SOUTHAMPTON\nRomsey\nromsey' } }); return m.counts.location === 1 && m.droppedTowns.length === 2; })(), '', '');
  chk('No cap on other towns: 40 towns give 40 location pages', build('ticked_only', { input: { otherTowns: Array.from({ length: 40 }, (_, i) => `Town ${i + 1}`) } }).counts.location === 40, '', '40');

  // ── Homepage and examples ──
  const home = find(m1, '/');
  chk('Homepage: title, h1 needed, links to 6 categories then 13 locations then 78 services; links from the 78 services', home.title === 'Edens Edge landscaping Homepage' && home.h1_source === 'needed' && home.links_to.length === 97 && home.links_to[0] === '/gardener' && home.links_to[6] === '/locations/romsey' && home.links_to[19] === '/services/lawn-mowing-and-maintenance' && home.links_from.length === 78 && home.links_from.every(l => l.startsWith('/services/')), JSON.stringify([home.links_to.length, home.links_from.length]), '');
  const cat = find(m1, '/gardener');
  chk('Category Gardener: links to its 8 services, from its 13 location category pages, h1 needed', cat.links_to.length === 8 && cat.links_from.length === 13 && cat.links_from[0] === '/locations/romsey/gardener' && cat.h1_source === 'needed', '', '');
  const gs = find(m1, '/services/grass-seeding');
  chk('Duplicates share one page: Grass seeding is one row with all 3 parents linked to and from', m1.rows.filter(r => r.title === 'Grass seeding').length === 1 && same(gs.links_from, ['/gardener', '/landscape-gardener', '/landscape-designer']) && ['/gardener', '/landscape-gardener', '/landscape-designer'].every(p => gs.links_to.includes(p)), JSON.stringify(gs.links_from), '3 parents');
  chk('Grass seeding links to 3 parents x 13 towns location category pages and "/" (43); H1 auto "Grass Seeding Southampton" (Title Case)', gs.links_to.length === 43 && gs.links_to.includes('/locations/kings-worthy/landscape-designer') && gs.links_to[gs.links_to.length - 1] === '/' && gs.h1 === 'Grass Seeding Southampton' && gs.h1_source === 'auto', gs.links_to.length, 43);
  const loc = find(m1, '/locations/romsey');
  chk('Location Romsey: links to its 6 location category pages, from "/"', loc.links_to.length === 6 && same(loc.links_from, ['/']) && loc.h1_source === 'needed', '', '');
  const lc = find(m1, '/locations/romsey/gardener');
  chk('Location Category Gardener Romsey: to its category, its location and 8 services; from those 8 services and its location', lc.title === 'Gardener Romsey' && lc.links_to.slice(0, 2).join() === '/gardener,/locations/romsey' && lc.links_to.length === 10 && lc.links_from.length === 9 && lc.links_from[8] === '/locations/romsey', '', '');

  // ── Against the old script: only the intended fixes differ ──
  for (const [rule, m] of [['ticked_only', m1], ['ticked_or_propagated', m2]]) {
    const resolved = R.resolve(ticks, config, { categoryTabRule: rule });
    const old = oldPageMap(S.COMPANY, [S.BASE_TOWN, ...S.OTHER_TOWNS], resolved.categories.map(c => ({ name: c.name, services: c.rows.map(r => r.name) })));
    const dupSlugs = new Set(resolved.crossRef.map(x => '/services/' + G.slugify(x.name)));
    const unexpected = [];
    for (const o of old) {
      const n = find(m, o.slug);
      if (!n) { unexpected.push('missing ' + o.slug); continue; }
      // Service H1s are Title Case now (Brandon, 18 Oct 2026): an intended difference, compared without case
      if (o.title !== n.title || o.h1.toLowerCase() !== n.h1.toLowerCase()) unexpected.push('title/h1 ' + o.slug);
      const fixedHome = o.slug === '/' && same(o.linksTo.filter(l => l !== '/locations/southampton'), n.links_to) && same(o.linksFrom, n.links_from);
      const fixedDup = dupSlugs.has(o.slug) && o.linksTo.every(l => n.links_to.includes(l)) && o.linksFrom.every(l => n.links_from.includes(l));
      if (!fixedHome && !fixedDup && !(same(o.linksTo, n.links_to) && same(o.linksFrom, n.links_from))) unexpected.push('links ' + o.slug);
    }
    chk(`${rule}: same ${old.length} pages as the old script; links differ only on the homepage (no base town page) and the ${dupSlugs.size} duplicate services (all parents)`, old.length === m.rows.length && !unexpected.length, unexpected.slice(0, 5).join(', '), 'none');
  }

  chk('The CSV reads back through the old page map parser (client-files.js): 176 pages, the right types', (() => { const p = require(path.join(root, 'client-files.js')).parsePageMap(G.toCsv(m1.rows)); return p.length === 176 && p.filter(x => x.pageType === 'location-category').length === 78 && p.find(x => x.urlSlug === '/services/grass-seeding').h1 === 'Grass Seeding Southampton'; })(), '', '');
  chk('New Forest District is marked as a council area (it still gets pages)', m1.councilAreas.join() === 'New Forest District' && !!find(m1, '/locations/new-forest-district'), JSON.stringify(m1.councilAreas), '');

  chk('Against the real Edens Edge sheet page map (edens-edge-real/page-map.csv, 198 rows): ticked_or_propagated gives the same pages minus the 8 base town pages the old script made', (() => {
    const old = require(path.join(root, 'client-files.js')).parsePageMap(require('fs').readFileSync(path.join(root, 'tests/fixtures/edens-edge-real/page-map.csv'), 'utf8'));
    const os = new Set(old.map(p => p.urlSlug)), ns = new Set(m2.rows.map(r => r.slug));
    const onlySheet = [...os].filter(s => !ns.has(s)), onlyOurs = [...ns].filter(s => !os.has(s));
    return old.length === 198 && old.filter(p => p.pageType === 'service').length === 78 && !onlyOurs.length && onlySheet.length === 8 && onlySheet.every(s => s.startsWith('/locations/southampton'));
  })(), '', '');

  // ── Additional services ──
  const withAdd = build('ticked_only', { resolve: { additional: [{ service: 'Pond installation', categoryKey: 'landscape_designer' }] }, input: { waiting: [{ service: 'Raised beds', why: 'no category chosen yet' }] } });
  const pond = find(withAdd, '/services/pond-installation');
  chk('A confirmed additional service is a Service page under its parent, same rules; unconfirmed ones are only listed as waiting', pond && pond.additional === true && same(pond.links_from, ['/landscape-designer']) && pond.h1 === 'Pond Installation Southampton' && find(withAdd, '/landscape-designer').links_to.includes('/services/pond-installation') && !find(withAdd, '/services/raised-beds') && withAdd.waiting[0].service === 'Raised beds' && withAdd.counts.service === 79, JSON.stringify(withAdd.counts), '79 services');

  // ── Slug collisions ──
  const collide = build('ticked_only', { resolve: { additional: [{ service: 'Grass-seeding!', categoryKey: 'tree_service' }] }, input: { otherTowns: "Chandler's Ford\nChandlers Ford\n!!!" } });
  chk('Slug collisions are reported, not renamed: a service and a town that slug the same as another, and a town with no letters', collide.collisions.some(c => c.slug === '/services/grass-seeding' && c.names.length === 2) && collide.collisions.some(c => /no letters/.test(c.msg)) && collide.collisions.some(c => c.slug === '/locations/chandlers-ford' && c.names.length === 2) && collide.counts.location === 1 && collide.counts.service === 78 && collide.rows.filter(r => r.slug === '/services/grass-seeding').length === 1, JSON.stringify(collide.collisions.map(c => c.msg)), '');
  chk('Edens Edge itself has no slug collisions in either mode', !m1.collisions.length && !m2.collisions.length, JSON.stringify(m1.collisions), '[]');
  chk('Nothing to map without a category tab or a base town', !G.buildPageMap({ resolved: { categories: [] }, baseTown: 'X' }).ok && !build('ticked_only', { input: { baseTown: '' } }).ok, '', '');

  // ── CSV ──
  const csv = G.toCsv(m1.rows);
  chk('CSV: the old PAGE MAP columns in order, 176 rows, links one per line in a quoted cell', csv.split('\r\n')[0] === 'Page Type,Page Title,URL Slug,H1 (Ahrefs),Meta Title,Meta Description,Links TO,Links FROM,Status' && /^Service,Grass seeding,\/services\/grass-seeding,Grass Seeding Southampton,,,"\/gardener\n\/landscape-gardener/m.test(csv), csv.slice(0, 120), '');

  // ── Store, seed and regeneration through pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool);
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  const store = createPageMapStore({ pool, filloutService: svc });
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper') RETURNING id`);
  await pool.query(`INSERT INTO pages (client_id, page_type, page_title, url_slug, h1, copy_output) VALUES ($1, 'homepage', 'Homepage', '/', 'Old H1', 'old copy')`, [client.id]);
  const pageBefore = JSON.stringify((await pool.query(`SELECT * FROM pages WHERE client_id = $1`, [client.id])).rows);

  const dry = await S.seed(pool, { write: false, log() {} });
  chk('Seed dry run lists 11 changes (niche, 7 tick groups, base town, other towns, company)', dry.changes.length === 11 && dry.changes[0].key === 'niche', dry.changes.map(c => c.key).join(), '11');
  chk('Seed dry run wrote nothing', (await pool.query(`SELECT COUNT(*)::int AS n FROM client_fields WHERE client_id = $1`, [client.id])).rows[0].n === 0, '', '0');
  const w1 = await S.seed(pool, { write: true, log() {} });
  const w2 = await S.seed(pool, { write: true, log() {} });
  const fieldRows = (await pool.query(`SELECT field_key, source FROM client_fields WHERE client_id = $1`, [client.id])).rows;
  chk('Seed --write sets every field as manual; a second run changes nothing (idempotent)', w1.changes.length === 11 && w2.changes.length === 0 && w2.unchanged.length === 11 && fieldRows.length === 11 && fieldRows.every(f => f.source === 'manual'), JSON.stringify([w1.changes.length, w2.changes.length, fieldRows.length]), '[11,0,11]');
  chk("Seed leaves the client's existing page untouched", JSON.stringify((await pool.query(`SELECT * FROM pages WHERE client_id = $1`, [client.id])).rows) === pageBefore && w1.pagesBefore === 1 && w1.pagesAfter === 1, '', '');

  // First generation
  let pv = await store.preview(client.id);
  chk('Dry run on a new map: would add 176, retire 0, nothing written', pv.firstRun && pv.diff.counts.wouldAdd === 176 && pv.diff.counts.wouldRetire === 0 && pv.diff.counts.unchanged === 0 && (await store.saved(client.id)).length === 0, JSON.stringify(pv.diff.counts), '');
  chk('Inputs come from the record: base town, 13 other towns, company name, the resolver tabs', pv.inputs.baseTown === 'Southampton' && pv.inputs.otherTowns.split('\n').length === 13 && pv.inputs.companyName === 'Edens Edge landscaping' && pv.inputs.resolved.counts.tabs === 6, JSON.stringify([pv.inputs.baseTown, pv.inputs.companyName]), '');
  await store.generate(client.id);
  let rows = await store.saved(client.id);
  chk('Generate writes 176 rows, all Not Started and applying', rows.length === 176 && rows.every(r => r.status === 'Not Started' && r.applies === true), rows.length, 176);
  pv = await store.preview(client.id);
  chk('Dry run again: 0 to add, 0 to retire, 176 unchanged', pv.diff.counts.wouldAdd === 0 && pv.diff.counts.wouldRetire === 0 && pv.diff.counts.unchanged === 176 && pv.diff.counts.wouldUpdate === 0, JSON.stringify(pv.diff.counts), '');

  // A person's edits
  const byKey = k => rows.find(r => r.page_key === k);
  rows = await store.saved(client.id);
  const romseyLoc = byKey('location:/locations/romsey'), romseyGard = byKey('location_category:/locations/romsey/gardener'), gsRow = byKey('service:/services/grass-seeding'), homeRow = byKey('homepage:/');
  await store.setRow(client.id, homeRow.id, { h1: 'Landscaper Southampton' });
  await store.setRow(client.id, romseyLoc.id, { h1: 'Gardener Romsey', meta_title: 'Romsey gardener', notes: 'checked in Ahrefs' });
  await store.setRow(client.id, romseyGard.id, { status: 'Copy Generated' });
  await store.setRow(client.id, gsRow.id, { status: 'Live', meta_description: 'Seeding lawns' });
  rows = await store.saved(client.id);
  chk('Editing an H1 marks it manual and moves Not Started to H1 Added', byKey('homepage:/').h1_source === 'manual' && byKey('homepage:/').status === 'H1 Added', JSON.stringify([byKey('homepage:/').h1_source, byKey('homepage:/').status]), '');
  chk('An unknown status is refused', await store.setRow(client.id, gsRow.id, { status: 'Pasted Into GHL' }).then(() => false, e => e.status === 400), '', '400');

  // Rename a town (Romsey → Romsey Extra), drop Lockerley, add Totton; change the base town too
  const otherKey = 'other_areas';
  await svc.setField(client.id, otherKey, S.OTHER_TOWNS.filter(t => t !== 'Lockerley').map(t => t === 'Romsey' ? 'Romsey Extra' : t).concat('Totton').join('\n'));
  pv = await store.preview(client.id);
  chk('Dry run after renaming Romsey and swapping Lockerley for Totton: would add 14 (2 locations + 12 location categories), retire 14, update the rest that link to them', pv.diff.counts.wouldAdd === 14 && pv.diff.counts.wouldRetire === 14 && pv.diff.counts.wouldUpdate > 0, JSON.stringify(pv.diff.counts), '');
  chk('The rename is flagged for a person (new page plus a no-longer-applies one)', pv.diff.renames.some(r => r.type === 'location' && r.retired.includes('Romsey') && r.added.includes('Romsey Extra')), JSON.stringify(pv.diff.renames.map(r => r.msg)), '');
  chk('Retiring pages a person worked on is called out', pv.diff.retiringWorkedOn.some(r => r.title === 'Romsey') && pv.diff.retiringWorkedOn.some(r => r.title === 'Gardener Romsey'), JSON.stringify(pv.diff.retiringWorkedOn), '');
  chk('The dry run wrote nothing', (await store.saved(client.id)).length === 176, '', '176');
  await store.generate(client.id);
  rows = await store.saved(client.id);
  chk('After regeneration: 190 rows kept (176 + 14 new), 14 no longer apply, none deleted', rows.length === 190 && rows.filter(r => !r.applies).length === 14 && rows.filter(r => r.applies).length === 176, JSON.stringify([rows.length, rows.filter(r => !r.applies).length]), '[190,14]');
  const oldRomsey = byKey('location:/locations/romsey');
  chk("Retired Romsey keeps the person's H1, meta, notes and status; its location category keeps Copy Generated", !oldRomsey.applies && oldRomsey.retired_at && oldRomsey.h1 === 'Gardener Romsey' && oldRomsey.h1_source === 'manual' && oldRomsey.meta_title === 'Romsey gardener' && oldRomsey.notes === 'checked in Ahrefs' && oldRomsey.status === 'H1 Added' && byKey('location_category:/locations/romsey/gardener').status === 'Copy Generated', JSON.stringify(oldRomsey), '');
  const home2 = byKey('homepage:/'), gs2 = byKey('service:/services/grass-seeding');
  chk("Links follow the plan but the homepage's manual H1 and Grass seeding's Live status and meta stay", home2.h1 === 'Landscaper Southampton' && home2.status === 'H1 Added' && home2.links_to.includes('/locations/romsey-extra') && !home2.links_to.includes('/locations/romsey') && gs2.status === 'Live' && gs2.meta_description === 'Seeding lawns' && gs2.links_to.includes('/locations/totton/gardener'), JSON.stringify([home2.h1, gs2.status]), '');

  // Base town change: auto H1s follow, manual ones never
  await svc.setField(client.id, 'primary_town', 'Eastleigh Town');
  await store.generate(client.id);
  rows = await store.saved(client.id);
  chk('Auto service H1s follow a new base town; a status set by a person is never reset', byKey('service:/services/hedge-trimming').h1 === 'Hedge Trimming Eastleigh Town' && byKey('service:/services/grass-seeding').status === 'Live', byKey('service:/services/hedge-trimming').h1, '');
  // Bring Romsey back: the retired row revives with its edits
  await svc.setField(client.id, 'primary_town', 'Southampton');
  await svc.setField(client.id, otherKey, S.OTHER_TOWNS.join('\n'));
  pv = await store.preview(client.id);
  await store.generate(client.id);
  rows = await store.saved(client.id);
  chk('Putting Romsey back revives its row (no duplicate) with the H1 the person set', rows.filter(r => r.page_key === 'location:/locations/romsey').length === 1 && byKey('location:/locations/romsey').applies && byKey('location:/locations/romsey').h1 === 'Gardener Romsey' && byKey('location_category:/locations/romsey/gardener').status === 'Copy Generated' && byKey('location:/locations/totton').applies === false, JSON.stringify(pv.diff.counts), '');
  chk('Regeneration never touched the old pages table', JSON.stringify((await pool.query(`SELECT * FROM pages WHERE client_id = $1`, [client.id])).rows) === pageBefore, '', '');
  // tools/page-map-cli.js: a dry run through the same store writes nothing
  const savedBefore = JSON.stringify(await store.saved(client.id));
  const cli = await require(path.join(root, 'tools/page-map-cli.js')).run(pool, { client: 'ednes edge testing', log() {} });
  chk('page-map-cli dry run: finds the client by name, reports the counts, writes nothing', cli.client.id === client.id && cli.preview.diff && typeof cli.preview.diff.counts.unchanged === 'number' && JSON.stringify(await store.saved(client.id)) === savedBefore, JSON.stringify(cli.preview.diff && cli.preview.diff.counts), '');
  // CSV from the store leaves retired rows out unless asked
  const csv2 = await store.csv(client.id);
  chk('CSV from the store: applying rows only; retired rows on request with a tag', csv2.trim().split('\r\n').length - 0 > 0 && !/Totton/.test(csv2) && /Location \(no longer applies\),Totton/.test(await store.csv(client.id, { includeRetired: true })), '', '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
