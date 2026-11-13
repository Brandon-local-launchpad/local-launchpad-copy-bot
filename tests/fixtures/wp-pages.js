'use strict';
// Fixture: making the inner pages on a client's site (wp/pages.js, 13 Nov 2026), with its table in
// pg-mem and the fake WordPress site. No API calls, no real site.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureWpTables, createDbStore } = require(path.join(root, 'wp/db-store.js'));
const { wantedPages, planPages, ensurePagesTable, createPagesService } = require(path.join(root, 'wp/pages.js'));
const { createFakeWp, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const J = JSON.stringify;
const throwsMsg = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
console.log('\n=== FIXTURE: making the inner pages on the site (pg-mem + fake WordPress) ===\n');

// Page map rows as page-map/store.js saved() gives them
const row = (type, title, slug, info = {}, extra = {}) => ({ page_key: `${type}:${slug}`, type, title, slug, applies: true, info: { phase: 1, ...info }, ...extra });
const ROWS = [
  row('homepage', 'Edens Edge Homepage', '/'),
  row('category', 'Gardener', '/gardener', { category_key: 'gardener' }),
  row('category', 'Paving Contractor', '/paving-contractor', { category_key: 'paving' }),
  row('service', 'Patios', '/services/patios', { service_id: 's1' }),
  row('service', 'Lawn Mowing', '/services/lawn-mowing', { service_id: 's2' }),
  row('service', 'Decking', '/services/decking', { service_id: 's3' }, { applies: false }),
  row('location', 'Romsey', '/locations/romsey', { town: 'Romsey' }),
  row('location', 'Winchester', '/locations/winchester', { town: 'Winchester', phase: 2 }),
  row('location_category', 'Gardener Romsey', '/locations/romsey/gardener', { town: 'Romsey', category_key: 'gardener' }),
  row('town_service', 'Patios Romsey', '/locations/romsey/patios', { town: 'Romsey', service_id: 's1' }),
  row('town_service', 'Patios Winchester', '/locations/winchester/patios', { town: 'Winchester', service_id: 's1', phase: 2 }),
];

(async () => {
  // ── The pages the site should have ──
  const wanted = wantedPages(ROWS);
  chk('The build is the category, service and location pages that apply and are in phase 1: no homepage, no retired page, no phase 2 town',
    J(wanted.map(p => p.path)) === J(['/gardener', '/paving-contractor', '/services/patios', '/services/lawn-mowing', '/locations/romsey', '/locations/romsey/gardener', '/locations/romsey/patios']), J(wanted.map(p => p.path)), '7 pages');
  chk('Each page goes in its own post type', J(wanted.map(p => p.post_type)) === J(['service-category', 'service-category', 'service', 'service', 'location', 'category-location', 'location-service']), J(wanted.map(p => p.post_type)), '');
  chk('Each page carries the identity that survives a URL change', wanted[2].identity === 'service:s1' && wanted[6].identity === 'town_service:romsey:s1' && wanted[5].identity === 'location_category:romsey:gardener', J(wanted.map(p => p.identity)), '');

  // ── The plan (pure) ──
  const site0 = [
    { id: 41, post_type: 'service', status: 'publish', title: 'Patios', path: '/services/patios' },
    { id: 42, post_type: 'service', status: 'draft', title: 'Mowing', path: '/services/lawn-mowing' },
    { id: 43, post_type: 'service', status: 'publish', title: 'test', path: '' },
    { id: 44, post_type: 'location', status: 'draft', title: 'Gardener', path: '/gardener' },
    { id: 45, post_type: 'service-category', status: 'draft', title: 'Paving Contractor', path: '/paving' },
    { id: 46, post_type: 'service', status: 'draft', title: 'Old page', path: '/services/turfing' },
  ];
  const plan0 = planPages(wanted, site0, new Map([['category:paving', 45]]));
  const act = p => plan0.pages.find(x => x.path === p);
  chk('Plan: a page already there is left; a new title is brought into line; a missing page is created', act('/services/patios').action === 'same' && act('/services/lawn-mowing').action === 'update' && /title "Mowing" → "Lawn Mowing"/.test(act('/services/lawn-mowing').changes[0]) && act('/locations/romsey').action === 'create', J(plan0.pages.map(p => [p.path, p.action])), '');
  chk('Plan: a path held by an entry in another post type can\'t be made, and says why', act('/gardener').action === 'conflict' && /post type location; this page belongs in service-category/.test(act('/gardener').why), J(act('/gardener')), '');
  chk('Plan: a page the page map moved is found by its kept id and gets the new URL, not a second entry', act('/paving-contractor').action === 'update' && act('/paving-contractor').id === 45 && /URL \/paving → \/paving-contractor/.test(act('/paving-contractor').changes[0]), J(act('/paving-contractor')), '');
  chk('Plan: entries on the site that are not in the build are listed, with or without a page map URL', J(plan0.extras.map(e => e.id)) === J([43, 46]), J(plan0.extras), '[43,46]');
  chk('Plan: the counts add up', J(plan0.counts) === J({ total: 7, create: 3, update: 2, same: 1, conflict: 1, extras: 2 }), J(plan0.counts), '');
  const taken = planPages(wanted.slice(1, 2), [{ id: 45, post_type: 'service-category', status: 'draft', title: 'Paving Contractor', path: '/paving' }, { id: 50, post_type: 'service-category', status: 'draft', title: 'Other', path: '/paving-contractor' }], new Map([['category:paving', 45]]));
  chk('Plan: a moved page whose new URL another entry holds can\'t be made', taken.pages[0].action === 'conflict' && /Another entry on the site \(50/.test(taken.pages[0].why), J(taken.pages[0]), '');

  // ── The service, on a database and a site ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL)`);
  await ensureWpTables(pool);
  await ensurePagesTable(pool);
  const clientId = (await pool.query(`INSERT INTO clients (name) VALUES ('Edens Edge') RETURNING id`)).rows[0].id;

  const servers = [];
  const start = async opts => { const wp = createFakeWp(opts); const l = await listen(wp.app); servers.push(l.server); return { ...wp, url: l.url }; };
  let rows = ROWS;
  const service = (wp, { staging = true, connected = true } = {}) => createPagesService({
    pool,
    getSite: async () => (connected ? { url: wp.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging } : null),
    pageRows: async () => rows,
    createLog: id => createDbStore(pool, id),
  });
  const log = async () => createDbStore(pool, clientId).listLog();
  const keptRows = async () => (await pool.query(`SELECT identity, wp_id, post_type, path FROM wp_pages WHERE client_id = $1 ORDER BY identity`, [clientId])).rows;

  // What stops it
  const wp = await start({ innerPages: [{ id: 43, post_type: 'service', status: 'publish', title: 'test', path: '' }] });
  chk('No site connected: says so', /no WordPress site connected/.test(await throwsMsg(() => service(wp, { connected: false }).preview(clientId))), '', '');
  const live = await service(wp, { staging: false }).preview(clientId);
  chk('A site not marked staging: refused', live.refusals.some(r => /not marked as a staging site/.test(r)), J(live.refusals), '');
  const oldWp = await start({ pluginVersion: '0.6.0' });
  const old = await service(oldWp).preview(clientId);
  chk('An older plugin on the site: refused, saying which to install', old.refusals.some(r => /has Copybot plugin 0\.6\.0; the latest is/.test(r)) && old.refusals.length === 1, J(old.refusals), '');
  const noType = await service(await start({ missingPostTypes: ['location-service'] })).preview(clientId);
  chk('A post type the site doesn\'t have: refused, naming it', noType.refusals.some(r => /no post type location-service/.test(r)), J(noType.refusals), '');
  const noPlugin = await service(await start({ plugin: false })).preview(clientId);
  chk('No plugin on the site: refused', noPlugin.refusals.some(r => /Can't reach the Copybot plugin/.test(r)), J(noPlugin.refusals), '');
  rows = ROWS.slice(0, 1);
  const empty = await service(wp).preview(clientId);
  chk('No inner pages in the page map: refused', empty.refusals.some(r => /Generate the page map first/.test(r)), J(empty.refusals), '');
  rows = ROWS;
  const refusedRun = await service(wp, { staging: false }).run(clientId, { confirm: true });
  chk('A refused run writes nothing and is logged', refusedRun.ok === false && wp.state.writes === 0 && (await log())[0].result === 'refused' && (await log())[0].action === 'make pages', J([refusedRun.refusals, wp.state.writes]), '');

  // The check, then the run
  const S = service(wp);
  const pre = await S.preview(clientId);
  chk('Check: 7 pages to create, the site\'s own test entry listed, nothing written', pre.counts.create === 7 && pre.counts.same === 0 && pre.extras.length === 1 && pre.extras[0].id === 43 && !pre.refusals.length && wp.state.writes === 0, J([pre.counts, pre.refusals, wp.state.writes]), '');
  chk('A run needs confirming', /needs confirming/.test(await throwsMsg(() => S.run(clientId, {}))) && wp.state.writes === 0, '', '');
  const run1 = await S.run(clientId, { confirm: true });
  const made = wp.state.innerPages.filter(p => p.id !== 43);
  chk('Run: every page made, and read back as right', run1.ok === true && run1.created === 7 && run1.updated === 0 && run1.counts.same === 7 && !run1.errors.length && !run1.notRight.length, J([run1.created, run1.counts, run1.errors, run1.notRight]), '');
  chk('Run: each is a draft, in its post type, at its page map URL, with the page map title', made.length === 7 && made.every(p => p.status === 'draft') && J(made.find(p => p.path === '/locations/romsey/patios')) === J({ id: made.find(p => p.path === '/locations/romsey/patios').id, post_type: 'location-service', status: 'draft', title: 'Patios Romsey', path: '/locations/romsey/patios' }), J(made), '');
  chk('Run: the site\'s own entry is untouched', J(wp.state.innerPages.find(p => p.id === 43)) === J({ id: 43, post_type: 'service', status: 'publish', title: 'test', path: '' }), J(wp.state.innerPages.find(p => p.id === 43)), '');
  const k1 = await keptRows();
  chk('Run: Copybot keeps each page\'s entry id against its identity', k1.length === 7 && k1.every(r => made.some(p => p.id === Number(r.wp_id) && p.path === r.path && p.post_type === r.post_type)), J(k1), '');
  chk('Run: logged with what it did', (await log())[0].result === 'made' && (await log())[0].created === 7, J((await log())[0]), '');

  // Again: nothing made twice
  const writesAfter1 = wp.state.pageWrites;
  const run2 = await S.run(clientId, { confirm: true });
  chk('Run again: nothing is made twice and nothing is sent', run2.ok === true && run2.created === 0 && run2.updated === 0 && run2.same === 7 && wp.state.innerPages.length === 8 && wp.state.pageWrites === writesAfter1, J([run2.created, run2.same, wp.state.innerPages.length, wp.state.pageWrites]), '');

  // The page map moved a page and renamed another; a person published one on the site
  const patios = wp.state.innerPages.find(p => p.path === '/services/patios');
  patios.status = 'publish';
  rows = ROWS.map(r => (r.slug === '/services/patios' ? { ...r, slug: '/services/patio-laying', page_key: 'service:/services/patio-laying' } : r.slug === '/gardener' ? { ...r, title: 'Gardeners' } : r));
  const pre3 = await S.preview(clientId);
  chk('A moved page and a renamed page: two to bring into line, none to create', pre3.counts.update === 2 && pre3.counts.create === 0 && pre3.counts.same === 5, J(pre3.counts), '');
  const run3 = await S.run(clientId, { confirm: true });
  chk('The moved page is the same entry at its new URL, still published; no second entry', run3.ok && run3.updated === 2 && run3.created === 0 && patios.path === '/services/patio-laying' && patios.status === 'publish' && wp.state.innerPages.length === 8 && wp.state.innerPages.find(p => p.path === '/gardener').title === 'Gardeners', J([run3.updated, patios, wp.state.innerPages.length]), '');
  chk('Its kept row follows it', (await keptRows()).find(r => r.identity === 'service:s1').path === '/services/patio-laying', J(await keptRows()), '');
  rows = ROWS;
  await S.run(clientId, { confirm: true });

  // A page that comes into the build later (phase 2 published), and one the site can't save
  rows = ROWS.map(r => ({ ...r, info: { ...r.info, phase: 1 } }));
  const wp2 = await start({ refusePaths: ['/locations/winchester'], innerPages: wp.state.innerPages });
  const S2 = service(wp2);
  const run4 = await S2.run(clientId, { confirm: true });
  chk('A new site: Copybot\'s kept ids from the other site are not used; entries are found by their URL', run4.same === 7 && run4.created === 1, J([run4.same, run4.created]), '7 same, 1 created');
  chk('A page WordPress can\'t save is reported with its reason; the others are still made', run4.ok === false && run4.result === 'made, with problems' && run4.errors.length === 1 && run4.errors[0].path === '/locations/winchester' && /Could not insert/.test(run4.errors[0].message) && run4.notRight.some(n => n.path === '/locations/winchester') && wp2.state.innerPages.some(p => p.path === '/locations/winchester/patios'), J([run4.errors, run4.notRight]), '');
  chk('…and the log says so', (await log())[0].result === 'made, with problems' && (await log())[0].errors.length === 1, J((await log())[0]), '');

  // The site falls over mid run
  const wp3 = await start({ failPageWrites: true });
  const run5 = await service(wp3).run(clientId, { confirm: true });
  chk('The site fails: the run stops, says why, keeps the plan for the screen, and is logged as failed', run5.ok === false && /500/.test(run5.error) && run5.counts && run5.counts.create === 9 && (await log())[0].result === 'failed', J([run5.error, run5.counts]), '');

  // A conflict stops only its own page
  const wp4 = await start({ innerPages: [{ id: 44, post_type: 'location', status: 'draft', title: 'Gardener', path: '/gardener' }] });
  rows = ROWS;
  const run6 = await service(wp4).run(clientId, { confirm: true });
  chk('A URL held by another post type: that page is not made, the rest are, and the entry is left as it was', run6.ok === false && run6.created === 6 && run6.notRight.length === 1 && run6.notRight[0].path === '/gardener' && J(wp4.state.innerPages.find(p => p.id === 44)) === J({ id: 44, post_type: 'location', status: 'draft', title: 'Gardener', path: '/gardener' }), J([run6.created, run6.notRight]), '');

  // Wiring
  const fs = require('fs');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  chk('Server: the check and the run are routes, and the table is made at start-up', server.includes("app.get('/api/clients/:clientId/wp/pages'") && server.includes("app.post('/api/clients/:clientId/wp/pages'") && fs.readFileSync(path.join(root, 'db.js'), 'utf8').includes("require('./wp/pages').ensurePagesTable(pool)"), '', '');
  const tab = fs.readFileSync(path.join(root, 'public/app/tabs/pages.js'), 'utf8');
  chk('Pages tab: Check the site, and Create behind a confirm', tab.includes('data-sitepages="check"') && tab.includes('data-sitepages="make"') && /confirm\(\{ title: `Create/.test(tab) && tab.includes('body: { confirm: true }'), '', '');

  for (const s of servers) s.close();
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
