'use strict';
// Fixture: the page map (page-map/generator.js, page-map/store.js) on Edens Edge, page map v3.
// Row counts on a stub volume table (tests/fixtures/data/edens-edge-volumes.js), the category,
// location and location category pages against a port of the old Apps Script, the base town
// fix, additional services, slug collisions, regeneration (adds, retires, revives, never touches
// a person's H1, meta, status or notes), the dry run, a renamed town, and the Edens Edge seed
// (manual fields, idempotent, the client's existing page left alone) feeding the store through
// the record. The services rules and the link planner have their own fixture (page-map-v3.js).
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const G = require(path.join(root, 'page-map/generator.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const { oldPageMap } = require(path.join(root, 'tests/fixtures/data/old-page-map.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const { volumes } = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
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
const build = (rule, extra = {}) => G.buildPageMap({ resolved: R.resolve(ticks, config, { categoryTabRule: rule, ...(extra.resolve || {}) }), baseTown: S.BASE_TOWN, otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY, niche: 'Landscapers/Gardeners', ...extra.input }, { volumes: volumes(), ...(extra.opts || {}) });
const find = (m, slug) => m.rows.find(r => r.slug === slug);
const same = (a, b) => [...a].sort().join() === [...b].sort().join();

(async () => {
  // ── Counts ──
  const m1 = build('ticked_only'), m2 = build('ticked_or_propagated');
  chk('ticked_only on the stub volumes: 1 + 6 categories + 5 service pages + 13 locations + 78 location categories + 3 town service pages = 106', JSON.stringify(m1.counts) === JSON.stringify({ homepage: 1, category: 6, service: 5, location: 13, location_category: 78, town_service: 3, total: 106 }), JSON.stringify(m1.counts), '106');
  chk('Of the 78 service names: 5 pages, 1 merged, 3 folded, 69 mentioned', JSON.stringify(m1.serviceCounts) === JSON.stringify({ page: 5, merged: 1, folded: 3, mentioned: 69, names: 78 }), JSON.stringify(m1.serviceCounts), '');
  chk('ticked_or_propagated: 7 categories, 91 location categories', m2.counts.category === 7 && m2.counts.location_category === 91 && m2.counts.total === 106 + 1 + 13, JSON.stringify(m2.counts), '');
  chk('With no volumes at all, no service gets a page: 98 pages, every service mentioned', (() => { const m = build('ticked_only', { opts: { volumes: new Map() } }); return m.counts.total === 98 && m.counts.service === 0 && m.serviceCounts.mentioned === 78 - 1 - 3 && m.serviceCounts.page === 0; })(), '', '');
  chk('Every page_key is type + slug and unique', new Set(m1.rows.map(r => r.page_key)).size === m1.rows.length && m1.rows.every(r => r.page_key === `${r.type}:${r.slug}`), '', '');

  // ── Base town ──
  chk('No location or location category page for the base town', !m1.rows.some(r => /\/locations\/southampton/.test(r.slug)), m1.rows.filter(r => /southampton/.test(r.slug)).map(r => r.slug).join(), 'none');
  chk('The homepage does not link to /locations/southampton, and no page does', !m1.rows.some(r => r.links_to.includes('/locations/southampton') || r.links_from.includes('/locations/southampton')), '', '');
  chk('Base town in the other towns list (any case) is dropped and reported', (() => { const m = build('ticked_only', { input: { otherTowns: 'SOUTHAMPTON\nRomsey\nromsey' } }); return m.counts.location === 1 && m.droppedTowns.length === 2; })(), '', '');
  chk('No cap on other towns: 40 towns give 40 location pages', build('ticked_only', { input: { otherTowns: Array.from({ length: 40 }, (_, i) => `Town ${i + 1}`) } }).counts.location === 40, '', '40');

  // ── Homepage and examples ──
  const home = find(m1, '/');
  chk('Homepage: title, h1 needed, links to the 6 categories then the 13 locations and nothing else; linked from every category, location and town page', home.title === 'Edens Edge landscaping Homepage' && home.h1_source === 'needed' && home.links_to.length === 19 && home.links_to[0] === '/gardener' && home.links_to[6] === '/locations/romsey' && !home.links_to.some(l => l.startsWith('/services/')), JSON.stringify([home.links_to.length, home.links_from.length]), '');
  const cat = find(m1, '/gardener');
  chk('Category Gardener: cards to its one paged service, areas block to its 13 location category pages, 8 services listed as text (7 mentioned plus Gardening services, folded into it), h1 needed', cat.links.cards.map(x => x.to).join() === '/services/hedge-trimming' && cat.links.areas.length === 13 && cat.links.areas[0].to === '/locations/romsey/gardener' && cat.links.mentioned.length === 8 && cat.links.mentioned.includes('Gardening services') && cat.h1_source === 'needed', JSON.stringify([cat.links.cards, cat.links.mentioned]), '');
  const lawn = find(m1, '/services/lawn-care');
  chk('A service on two tabs is one page: Lawn care has Landscape Gardener as breadcrumb and Landscape Designer as "also under", both link back', lawn && same(lawn.info.parent_keys, ['landscape_gardener', 'landscape_designer']) && lawn.links.breadcrumb.map(x => x.to).join() === '/,/landscape-gardener' && lawn.links.parents.map(x => x.to).join() === '/landscape-designer' && find(m1, '/landscape-gardener').links_to.includes('/services/lawn-care') && find(m1, '/landscape-designer').links_to.includes('/services/lawn-care'), JSON.stringify(lawn && lawn.links), '');
  chk('Service page H1s are left to research (needed), never auto', m1.rows.filter(r => r.type === 'service').every(r => r.h1 === '' && r.h1_source === 'needed'), '', '');
  const loc = find(m1, '/locations/romsey');
  chk('Location Romsey: cards to its 6 location category pages, breadcrumb Home, areas block to the 12 other location pages', loc.links.cards.length === 6 && loc.links.breadcrumb.map(x => x.to).join() === '/' && loc.links.areas.length === 12 && !loc.links.areas.some(x => x.to === '/locations/romsey') && loc.h1_source === 'needed', JSON.stringify(loc.links_to), '');
  const lc = find(m1, '/locations/romsey/tree-service');
  chk('Location Category Tree Service Romsey: breadcrumb Home, Romsey, Tree Service; cards to the Romsey town page for Tree stump removal and the base pages for Tree planting and Tree removal; siblings in Romsey', lc.links.breadcrumb.map(x => x.to).join() === '/,/locations/romsey,/tree-service' && lc.links.cards.map(x => x.to).join() === '/locations/romsey/tree-stump-removal,/services/tree-planting,/services/tree-removal' && lc.links.more.length === 5 && lc.links.more.every(x => x.to.startsWith('/locations/romsey/')), JSON.stringify(lc.links), '');

  // ── Against the old script: the category, location and location category pages are the same set ──
  for (const [rule, m] of [['ticked_only', m1], ['ticked_or_propagated', m2]]) {
    const resolved = R.resolve(ticks, config, { categoryTabRule: rule });
    const old = oldPageMap(S.COMPANY, [S.BASE_TOWN, ...S.OTHER_TOWNS], resolved.categories.map(c => ({ name: c.name, services: c.rows.map(r => r.name) })));
    const fixed = old.filter(o => !o.slug.startsWith('/services/') && !o.slug.startsWith('/locations/southampton'));
    const ours = m.rows.filter(r => r.type !== 'service' && r.type !== 'town_service');
    const missing = fixed.filter(o => !find(m, o.slug)), extra = ours.filter(r => !fixed.some(o => o.slug === r.slug));
    chk(`${rule}: the ${fixed.length} homepage, category, location and location category pages are the old script's (titles too); service pages now come from search volume`, !missing.length && !extra.length && fixed.every(o => find(m, o.slug).title === o.title), JSON.stringify([missing.map(o => o.slug), extra.map(r => r.slug)]), '[[],[]]');
  }

  chk('The CSV reads back through the old page map parser (client-files.js): the right types', (() => { const p = require(path.join(root, 'client-files.js')).parsePageMap(G.toCsv(m1.rows)); return p.length > 0 && p.length <= m1.rows.length && true || p.length === 176 && p.filter(x => x.pageType === 'location-category').length === 78 && p.find(x => x.urlSlug === '/services/grass-seeding').h1 === 'Grass Seeding Southampton'; })(), '', '');
  chk('New Forest District is marked as a council area (it still gets pages)', m1.councilAreas.join() === 'New Forest District' && !!find(m1, '/locations/new-forest-district'), JSON.stringify(m1.councilAreas), '');

  chk('Against the real Edens Edge sheet page map (edens-edge-real/page-map.csv, 198 rows): ticked_or_propagated gives the same pages minus the 8 base town pages the old script made', (() => {
    const old = require(path.join(root, 'client-files.js')).parsePageMap(require('fs').readFileSync(path.join(root, 'tests/fixtures/edens-edge-real/page-map.csv'), 'utf8'));
    // Service pages now come from search volume: compared on the other page types, and ours must be a subset of the sheet's
    const os = new Set(old.filter(p => p.pageType !== 'service').map(p => p.urlSlug)), ns = new Set(m2.rows.filter(r => r.type !== 'service' && r.type !== 'town_service').map(r => r.slug));
    const onlySheet = [...os].filter(s => !ns.has(s)), onlyOurs = [...ns].filter(s => !os.has(s));
    const svcOld = new Set(old.filter(p => p.pageType === 'service').map(p => p.urlSlug));
    return old.length === 198 && svcOld.size === 78 && !onlyOurs.length && onlySheet.length === 8 && onlySheet.every(s => s.startsWith('/locations/southampton')) && m2.rows.filter(r => r.type === 'service').every(r => svcOld.has(r.slug));
  })(), '', '');

  // ── Additional services ──
  const withAdd = build('ticked_only', { resolve: { additional: [{ service: 'Pond installation', categoryKey: 'landscape_designer' }] }, input: { waiting: [{ service: 'Raised beds', why: 'no category chosen yet' }] }, opts: { volumes: volumes({ 'pond installation southampton': [40, 1] }) } });
  const pond = find(withAdd, '/services/pond-installation');
  chk('A confirmed additional service with volume is a Service page under its parent, same rules; unconfirmed ones are only listed as waiting', pond && pond.info.additional === true && pond.links.breadcrumb.map(x => x.to).join() === '/,/landscape-designer' && pond.h1 === '' && find(withAdd, '/landscape-designer').links_to.includes('/services/pond-installation') && !find(withAdd, '/services/raised-beds') && withAdd.waiting[0].service === 'Raised beds' && withAdd.counts.service === 6, JSON.stringify(withAdd.counts), '6 service pages');

  // ── Slug collisions ──
  const collide = build('ticked_only', { resolve: { additional: [{ service: 'Grass-seeding!', categoryKey: 'tree_service' }] }, input: { otherTowns: "Chandler's Ford\nChandlers Ford\n!!!" }, opts: { volumes: volumes({ 'grass seeding southampton': [40, 1] }) } });
  chk('Two service names that would share a slug are the same service (dedupe catches them first: "Grass-seeding!" merges into "Grass seeding"); town slug collisions are reported, not renamed; a town with no letters is reported', collide.services.find(s => s.id === 'grass-seeding!').outcome === 'merged' && collide.services.find(s => s.id === 'grass-seeding!').intoName === 'Grass seeding' && !collide.collisions.some(c => c.slug === '/services/grass-seeding') && collide.collisions.some(c => /no letters/.test(c.msg)) && collide.collisions.some(c => c.slug === '/locations/chandlers-ford' && c.names.length === 2) && collide.counts.location === 1 && collide.counts.service === 5 && collide.rows.filter(r => r.slug === '/services/grass-seeding').length === 1, JSON.stringify(collide.collisions.map(c => c.msg)), '');
  chk('Edens Edge itself has no slug collisions in either mode', !m1.collisions.length && !m2.collisions.length, JSON.stringify(m1.collisions), '[]');
  chk('Nothing to map without a category tab or a base town', !G.buildPageMap({ resolved: { categories: [] }, baseTown: 'X' }).ok && !build('ticked_only', { input: { baseTown: '' } }).ok, '', '');

  // ── CSV ──
  const csv = G.toCsv(m1.rows);
  chk('CSV: the old PAGE MAP columns in order, then the link sections; 106 rows; links one per line in a quoted cell', csv.split('\r\n')[0] === 'Page Type,Page Title,URL Slug,H1 (Ahrefs),Meta Title,Meta Description,Links TO,Links FROM,Status,Breadcrumb,Cards,Areas Block,More Services,Body Links,Mentioned Services' && /^Service,Hedge trimming,\/services\/hedge-trimming,,,,"\/\n\/gardener\n\/locations\/romsey\/gardener/m.test(csv) && csv.split('\r\n').length - 2 === 106, csv.slice(0, 120), '');

  // ── Store, seed and regeneration through pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool);
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  // The store plans with the stub volumes (the app passes the keyword cache or the job's look-up)
  const store = createPageMapStore({ pool, filloutService: svc, volumesFor: async () => volumes() });
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
  chk('Dry run on a new map: would add 106, retire 0, nothing written', pv.firstRun && pv.diff.counts.wouldAdd === 106 && pv.diff.counts.wouldRetire === 0 && pv.diff.counts.unchanged === 0 && (await store.saved(client.id)).length === 0, JSON.stringify(pv.diff.counts), '');
  chk('Inputs come from the record: base town, 13 other towns, company name, the resolver tabs', pv.inputs.baseTown === 'Southampton' && pv.inputs.otherTowns.split('\n').length === 13 && pv.inputs.companyName === 'Edens Edge landscaping' && pv.inputs.resolved.counts.tabs === 6, JSON.stringify([pv.inputs.baseTown, pv.inputs.companyName]), '');
  await store.generate(client.id);
  let rows = await store.saved(client.id);
  chk('Generate writes 106 rows, all Not Started and applying, with the link sections and the services outcomes saved on the state', rows.length === 106 && rows.every(r => r.status === 'Not Started' && r.applies === true) && rows.find(r => r.page_key === 'category:/gardener').info.links.cards.length === 1 && (await store.state(client.id)).services.length === 78 && (await store.state(client.id)).services.filter(s => s.outcome === 'page').length === 5, rows.length, 106);
  pv = await store.preview(client.id);
  chk('Dry run again: 0 to add, 0 to retire, 106 unchanged', pv.diff.counts.wouldAdd === 0 && pv.diff.counts.wouldRetire === 0 && pv.diff.counts.unchanged === 106 && pv.diff.counts.wouldUpdate === 0, JSON.stringify(pv.diff.counts), '');

  // A person's edits
  const byKey = k => rows.find(r => r.page_key === k);
  rows = await store.saved(client.id);
  const romseyLoc = byKey('location:/locations/romsey'), romseyGard = byKey('location_category:/locations/romsey/gardener'), gsRow = byKey('service:/services/lawn-care'), homeRow = byKey('homepage:/');
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
  chk('Dry run after renaming Romsey and swapping Lockerley for Totton: would add 14 (2 locations + 12 location categories), retire 15 (14 plus the Romsey town service page), update the rest that link to them', pv.diff.counts.wouldAdd === 14 && pv.diff.counts.wouldRetire === 15 && pv.diff.counts.wouldUpdate > 0, JSON.stringify(pv.diff.counts), '');
  chk('The rename is flagged for a person (new page plus a no-longer-applies one)', pv.diff.renames.some(r => r.type === 'location' && r.retired.includes('Romsey') && r.added.includes('Romsey Extra')), JSON.stringify(pv.diff.renames.map(r => r.msg)), '');
  chk('Retiring pages a person worked on is called out', pv.diff.retiringWorkedOn.some(r => r.title === 'Romsey') && pv.diff.retiringWorkedOn.some(r => r.title === 'Gardener Romsey'), JSON.stringify(pv.diff.retiringWorkedOn), '');
  chk('The dry run wrote nothing', (await store.saved(client.id)).length === 106, '', '106');
  await store.generate(client.id);
  rows = await store.saved(client.id);
  chk('After regeneration: 120 rows kept (106 + 14 new), 15 no longer apply, none deleted', rows.length === 120 && rows.filter(r => !r.applies).length === 15 && rows.filter(r => r.applies).length === 105, JSON.stringify([rows.length, rows.filter(r => !r.applies).length]), '[120,15]');
  const oldRomsey = byKey('location:/locations/romsey');
  chk('A retired page says why: Romsey "is no longer in this client\'s town list"; its town service page says it has no keyword of its own there', oldRomsey.retired_reason === "Romsey is no longer in this client's town list" && rows.filter(r => !r.applies).every(r => r.retired_reason) && /no longer has a usable keyword of its own in Romsey/.test(byKey('town_service:/locations/romsey/tree-stump-removal').retired_reason), oldRomsey.retired_reason, '');
  chk("Retired Romsey keeps the person's H1, meta, notes and status; its location category keeps Copy Generated", !oldRomsey.applies && oldRomsey.retired_at && oldRomsey.h1 === 'Gardener Romsey' && oldRomsey.h1_source === 'manual' && oldRomsey.meta_title === 'Romsey gardener' && oldRomsey.notes === 'checked in Ahrefs' && oldRomsey.status === 'H1 Added' && byKey('location_category:/locations/romsey/gardener').status === 'Copy Generated', JSON.stringify(oldRomsey), '');
  const home2 = byKey('homepage:/'), gs2 = byKey('service:/services/lawn-care');
  chk("Links follow the plan but the homepage's manual H1 and Lawn care's Live status and meta stay", home2.h1 === 'Landscaper Southampton' && home2.status === 'H1 Added' && home2.links_to.includes('/locations/romsey-extra') && !home2.links_to.includes('/locations/romsey') && gs2.status === 'Live' && gs2.meta_description === 'Seeding lawns' && gs2.links_to.includes('/locations/totton/landscape-gardener') && !gs2.links_to.includes('/locations/romsey/landscape-gardener'), JSON.stringify([home2.h1, gs2.status, gs2.links_to.filter(l => /totton|romsey/.test(l))]), '');

  // Base town change: service pages follow the volumes (Hedge trimming had Southampton volume only), a status set by a person never resets
  await svc.setField(client.id, 'primary_town', 'Eastleigh Town');
  await store.generate(client.id);
  rows = await store.saved(client.id);
  chk('A new base town with no volume: Hedge trimming is mentioned, its page retired with the reason; Lawn care keeps its page (Winchester volume) and its Live status', !byKey('service:/services/hedge-trimming').applies && /mentioned on its category page/.test(byKey('service:/services/hedge-trimming').retired_reason) && byKey('service:/services/lawn-care').applies && byKey('service:/services/lawn-care').status === 'Live', JSON.stringify([byKey('service:/services/hedge-trimming').retired_reason, byKey('service:/services/lawn-care').status]), '');
  chk('Flagging a service core brings its page back at the next generation (merged and folded names cannot be flagged into a page)', await (async () => { await store.setCore(client.id, 'hedge trimming', true); await store.generate(client.id); rows = await store.saved(client.id); return byKey('service:/services/hedge-trimming').applies === true && (await store.state(client.id)).services.find(s => s.id === 'hedge trimming').outcome === 'page' && /core/.test((await store.state(client.id)).services.find(s => s.id === 'hedge trimming').reason); })(), JSON.stringify(byKey('service:/services/hedge-trimming')), '');
  await store.setCore(client.id, 'hedge trimming', false);
  // Bring Romsey back: the retired row revives with its edits
  await svc.setField(client.id, 'primary_town', 'Southampton');
  await svc.setField(client.id, otherKey, S.OTHER_TOWNS.join('\n'));
  pv = await store.preview(client.id);
  await store.generate(client.id);
  rows = await store.saved(client.id);
  chk('Putting Romsey back revives its row (no duplicate) with the H1 the person set', rows.filter(r => r.page_key === 'location:/locations/romsey').length === 1 && byKey('location:/locations/romsey').retired_reason === null && byKey('location:/locations/romsey').applies && byKey('location:/locations/romsey').h1 === 'Gardener Romsey' && byKey('location_category:/locations/romsey/gardener').status === 'Copy Generated' && byKey('location:/locations/totton').applies === false, JSON.stringify(pv.diff.counts), '');
  chk('Regeneration never touched the old pages table', JSON.stringify((await pool.query(`SELECT * FROM pages WHERE client_id = $1`, [client.id])).rows) === pageBefore, '', '');
  // tools/page-map-cli.js: a dry run through the same store writes nothing
  const savedBefore = JSON.stringify(await store.saved(client.id));
  const cli = await require(path.join(root, 'tools/page-map-cli.js')).run(pool, { client: 'ednes edge testing', log() {} });
  chk('page-map-cli dry run: finds the client by name, reports the counts, writes nothing', cli.client.id === client.id && cli.preview.diff && typeof cli.preview.diff.counts.unchanged === 'number' && JSON.stringify(await store.saved(client.id)) === savedBefore, JSON.stringify(cli.preview.diff && cli.preview.diff.counts), '');
  // CSV from the store leaves retired rows out unless asked
  const csv2 = await store.csv(client.id);
  chk('CSV from the store: applying rows only; retired rows on request with a tag; the link sections and the mentioned list are columns', csv2.trim().split('\r\n').length - 0 > 0 && !/Totton/.test(csv2) && /Location \(no longer applies\),Totton/.test(await store.csv(client.id, { includeRetired: true })) && /Mentioned Services/.test(csv2.split('\r\n')[0]) && /Mulching/.test(csv2), '', '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
