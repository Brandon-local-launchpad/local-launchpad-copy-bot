'use strict';
// Fixture: the redirect push and the validator (site-audit/redirects.js, validator.js) against a fake
// WordPress with Rank Math's behaviour, over real HTTP. The staging guard, the dry run writing nothing,
// the push inactive with a read back, a conflict, a rollback, the map's BLOCKs and WARNs, staging's,
// the one hop rule, and the staging test always switching the redirects back off, even when it fails
// part way. Plus the images group and the gallery page slot, the two tweaks from 5 Nov.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { createFakeWp, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
const { ensureSiteAuditTables } = require(path.join(root, 'site-audit/store.js'));
const { ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));
const { ensureWpTables, createDbStore } = require(path.join(root, 'wp/db-store.js'));
const { createSiteAudit, DEFAULTS } = require(path.join(root, 'site-audit/service.js'));
const { replayer } = require(path.join(root, 'site-audit/replay.js'));
const R = require(path.join(root, 'site-audit/redirects.js'));
const V = require(path.join(root, 'site-audit/validator.js'));
const D = require(path.join(root, 'site-audit/decide.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: site audit, the redirect push and the validator ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const recorded = path.join(root, 'tests/fixtures/data/site-audit-southamptonhomes-recorded.json');
const stand = require(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json')).rows.filter(r => r.applies !== false).map((r, i) => ({ page_key: `${r.type}:${r.slug}`, sort_order: i, info: {}, ...r }));
const LIVE = 'https://southamptonhomes.co.uk';
const servers = [];

// The real run's recording for the old site; anything else (the staging site) over real HTTP
const web = replay => async (url, init) => { const u = String(url); return /southamptonhomes\.co\.uk|api\.dataforseo\.com/.test(u) ? replay(u, init) : fetch(u, init); };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT)`);
  await ensureWpTables(pool);
  await ensurePageMapTables(pool);
  await ensureSiteAuditTables(pool);

  const setup = async ({ fakeOpts = {}, staging = true, cv = { live_domain: LIVE }, site = null, settings = null, csv = null } = {}) => {
    const fake = createFakeWp({ publicPaths: ['/', '/contact'], ...fakeOpts });
    const wp = await listen(fake.app);
    servers.push(wp.server);
    const clientId = (await pool.query(`INSERT INTO clients (name) VALUES ('Test') RETURNING id`)).rows[0].id;
    const siteRow = site || { url: wp.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging, seo: 'rankmath' };
    const replay = replayer(recorded);
    const audit = createSiteAudit({ pool, loadValues: async () => cv, env: { DATAFORSEO_LOGIN: 'r', DATAFORSEO_PASSWORD: 'r' }, fetchImpl: web(replay), sleep: async () => {}, lookup: async () => ({ address: '8.8.8.8' }), log: quiet, loadPages: async () => ({ rows: stand, baseTown: 'Southampton' }), getSite: async () => siteRow, createLog: id => createDbStore(pool, id) });
    if (settings) await audit.saveSettings(clientId, settings);
    if (csv) await audit.uploadSearchConsole(clientId, { csv, filename: 'gsc.csv' });
    await audit.start(clientId);
    await audit.wait(clientId);
    return { clientId, audit, fake, wp, site: siteRow };
  };
  const pathOf = (v, p) => v.urls.find(u => u.path === p);

  // ── The images group ──
  {
    const { clientId, audit } = await setup();
    const v = await audit.view(clientId);
    const images = v.urls.filter(u => u.kind === 'image');
    chk('images: 50 with no links, rankings or clicks have no decision, and say so', images.length === 50 && images.every(u => u.plan.no_action && !u.plan.decision && !u.plan.approved), images[0].plan, '');
    chk('images: they are not in the decision summary', v.scan.summary.decisions.total === 4 && v.scan.summary.decisions.no_action === 50 && v.scan.summary.decisions.counts.Retire === 2 && v.scan.summary.decisions.counts.Keep === 2, v.scan.summary.decisions, '');
    chk('images: Total URLs still counts them', v.scan.summary.total_urls === 54 && v.scan.summary.media === 50);
    const r = await audit.approve(clientId, { all: true });
    chk('images: approve all has only the 4 pages to approve, and that is all of them', r.approval.approved === 4 && r.scan.summary.decisions.approved === 4 && r.scan.summary.decisions.total === 4, r.approval, '');
    const map = await audit.exportCsv(clientId, 'url-map');
    const auditCsv = await audit.exportCsv(clientId, 'old-site-audit');
    chk('images: the URL map CSV leaves them out, and the Old Site Audit CSV says no action', map.trim().split('\r\n').length === 5 && auditCsv.trim().split('\r\n').length === 55 && auditCsv.includes('No action needed'), map.trim().split('\r\n').length, 5);
  }
  chk('images: an image with a backlink or a ranking stays in the map; a PDF does too', !D.noActionNeeded({ kind: 'image', all_rd: 1 }) && !D.noActionNeeded({ kind: 'image', keywords_count: 1 }) && !D.noActionNeeded({ kind: 'image', clicks: 2 }) && !D.noActionNeeded({ kind: 'pdf' }) && !D.noActionNeeded({ kind: 'page' }) && D.noActionNeeded({ kind: 'image', all_rd: 0, keywords_count: 0, clicks: 0 }));
  {
    const page = (p, extra = {}) => ({ url: `https://x.co.uk${p}`, path: p, kind: 'page', fetch_state: 'done', status_code: 200, title: '', h1: '', matters: false, matters_why: [], injected: false, clicks: 0, est_traffic: 0, real_rd: 0, links_out: [], ...extra });
    const s = D.suggestAll({ urls: [page('/services/patios', { links_out: ['https://x.co.uk/a.jpg', 'https://x.co.uk/b.jpg'] }), page('/a.jpg', { kind: 'image', all_rd: 1, real_rd: 1, matters: true }), page('/b.jpg', { kind: 'image', all_rd: 1 })], pages: [{ page_key: 'service:/services/patios', type: 'service', title: 'Patios', slug: '/services/patios', applies: true, info: {} }], settings: DEFAULTS }).suggestions;
    chk('images: one with a real link has a decision and a 301 to where its page lives', s.get('https://x.co.uk/a.jpg').decision === 'Reuse' && s.get('https://x.co.uk/a.jpg').new_url === '/services/patios', s.get('https://x.co.uk/a.jpg'), '');
    chk('images: one with only a junk link has a decision too, and is in the map', s.get('https://x.co.uk/b.jpg').decision === 'Retire' && s.get('https://x.co.uk/b.jpg').redirect_type === 'none', s.get('https://x.co.uk/b.jpg'), '');
  }

  // ── The gallery slot ──
  chk('gallery: the slot is in the defaults, left empty until Given confirms', DEFAULTS.gallery_page === '');
  {
    const page = (p, extra = {}) => ({ url: `https://x.co.uk${p}`, path: p, kind: 'page', fetch_state: 'done', status_code: 200, title: '', h1: '', matters: false, matters_why: [], injected: false, clicks: 0, est_traffic: 0, real_rd: 0, links_out: [], ...extra });
    const pages = [{ page_key: 'category:/gardener', type: 'category', title: 'Gardener', slug: '/gardener', applies: true, info: { primary: true } }, { page_key: 'service:/services/patios', type: 'service', title: 'Patios', slug: '/services/patios', applies: true, info: {} }];
    const run = (u, gallery) => D.suggestAll({ urls: [u], pages, settings: { ...DEFAULTS, gallery_page: gallery } }).suggestions.get(u.url);
    let s = run(page('/inspiration'), '');
    chk('gallery: empty, and an old gallery page falls to the primary category as before', s.new_url === '/gardener', s, '');
    s = run(page('/inspiration'), '/projects');
    chk('gallery: set, /inspiration goes to it', s.decision === 'Retire' && s.new_url === '/projects' && s.redirect_type === '301', s, '');
    for (const p of ['/gallery', '/our-gallery', '/portfolio', '/projects', '/recent-projects/', '/our-work', '/case-studies']) { const x = run(page(p.replace(/\/$/, '')), '/projects'); chk(`gallery: ${p} goes to it`, x.new_url === '/projects' , x, ''); }
    s = run(page('/patio-gallery'), '/projects');
    chk('gallery: first, ahead of a service page it also resembles', s.new_url === '/projects', s, '');
    s = run(page('/x', { title: 'Our Portfolio - Acme Ltd' }), '/projects');
    chk('gallery: read from the title too', s.new_url === '/projects', s, '');
    s = run(page('/projects'), '/projects');
    chk('gallery: an old page already at that address keeps it', s.decision === 'Keep' && s.new_url === '/projects', s, '');
    s = run(page('/gallery.html', { matters: true, est_traffic: 2 }), '/projects');
    chk('gallery: one that matters and can\'t keep its URL is Reuse, 301 to it', s.decision === 'Reuse' && s.new_url === '/projects', s, '');
    s = run(page('/services/patios'), '/projects');
    chk('gallery: a page at its own Page Map address is untouched', s.decision === 'Keep' && s.new_url === '/services/patios', s, '');
    s = run(page('/about'), '/projects');
    chk('gallery: other pages are untouched', s.decision === 'Keep' && s.new_url === '/about', s, '');
  }

  // ── The staging guard ──
  const G = R.stagingGuard;
  chk('guard: a staging site on another host is allowed', G({ url: 'https://x.hostingersite.com', staging: true }, LIVE).length === 0);
  chk('guard: not marked staging is refused', /isn't marked as staging/.test(G({ url: 'https://x.hostingersite.com', staging: false }, LIVE)[0]));
  chk('guard: the live domain is refused, even marked staging', /live customer site/.test(G({ url: 'https://southamptonhomes.co.uk', staging: true }, LIVE).join(' ')));
  chk('guard: www or not, and any scheme, is the same live domain', /live customer site/.test(G({ url: 'https://www.southamptonhomes.co.uk', staging: true }, 'http://southamptonhomes.co.uk/').join(' ')));
  chk('guard: no connection is refused', G(null, LIVE).length === 1);

  // ── The push: a full round ──
  {
    const csv = 'Top pages,Clicks,Impressions,CTR,Position\nhttps://southamptonhomes.co.uk/garden-design-service?id=5,3,50,6%,8\n';
    const { clientId, audit, fake } = await setup({ csv });
    let v = await audit.view(clientId);
    // With a Search Console file: a 301, a 410 and a query string URL, as the first real push has
    const q = pathOf(v, '/garden-design-service?id=5');
    chk('the test data: a query string URL that matters, a 301; /inspiration a 410', q && q.plan.redirect_type === '301' && pathOf(v, '/inspiration').plan.redirect_type === '410', [q && q.plan, pathOf(v, '/inspiration').plan], '');

    const writes = () => fake.state.writes;
    let w0 = writes();
    let dry = await audit.redirectsDryRun(clientId);
    chk('dry run: refused until the decisions are approved', !dry.pushable && dry.refusals.some(r => /approved yet/.test(r)), dry.refusals, '');
    let refusedPush = await audit.redirectsPush(clientId, { confirm: true });
    chk('push: refused, logged, nothing written', refusedPush.ok === false && writes() === w0, refusedPush.refusals, '');
    await audit.approve(clientId, { all: true });
    let threw = '';
    try { await audit.redirectsPush(clientId, {}); } catch (e) { threw = e.message; }
    chk('push: needs confirming', /needs confirming/.test(threw), threw, '');

    w0 = writes();
    dry = await audit.redirectsDryRun(clientId);
    chk('dry run: allowed, with the diff, and nothing written', dry.pushable && dry.add.length === 3 && !dry.change.length && !dry.remove.length && writes() === w0 && fake.state.redirects.length === 0, dry, '');
    chk('dry run: Keep rows and images aren\'t redirects', !dry.add.some(a => a.source === '/' || a.source === '/contact' || /\.jpe?g/.test(a.source)), dry.add, '');

    const pushed = await audit.redirectsPush(clientId, { confirm: true });
    chk('push: done, and the read back matches', pushed.ok && pushed.result === 'pushed' && !pushed.problems.length && pushed.count === 3, pushed.problems, []);
    chk('push: every row is inactive and tagged as Copybot\'s', fake.state.redirects.length === 3 && fake.state.redirects.every(r => r.status === 'inactive' && r.mine), fake.state.redirects, '');
    chk('push: a 301, a 410 and the query string URL', fake.state.redirects.some(r => r.source === '/garden-design-service?id=5' && r.code === 301) && fake.state.redirects.some(r => r.source === '/inspiration' && r.code === 410), fake.state.redirects, '');
    chk('push: a snapshot of what was there before', !!pushed.snapshotId);

    dry = await audit.redirectsDryRun(clientId);
    chk('dry run again: nothing left to do', dry.same.length === 3 && !dry.add.length && !dry.change.length, dry, '');
    w0 = fake.state.redirects.length;
    const again = await audit.redirectsPush(clientId, { confirm: true });
    chk('push again: no duplicates', again.ok && fake.state.redirects.length === w0 && again.sent.updated === 3 && again.sent.created === 0, again.sent, '');

    // A decision changes: the dry run shows it, and a push changes and removes
    const garden = pathOf(await audit.view(clientId), '/garden-design-service');
    await audit.setDecision(clientId, garden.id, { decision: 'Retire', new_url: '/contact' });
    dry = await audit.redirectsDryRun(clientId);
    chk('dry run: a changed destination is a change', dry.change.length === 1 && dry.change[0].source === '/garden-design-service' && dry.change[0].was.path !== '/contact', dry.change, '');
    await audit.redirectsPush(clientId, { confirm: true });
    await audit.setDecision(clientId, garden.id, { decision: 'Keep' });
    dry = await audit.redirectsDryRun(clientId);
    chk('dry run: a row no longer a redirect is a removal', dry.remove.length === 1 && dry.remove[0].source === '/garden-design-service', dry.remove, '');
    const third = await audit.redirectsPush(clientId, { confirm: true });
    chk('push: removes it', third.ok && !fake.state.redirects.some(r => r.source === '/garden-design-service'), third, '');

    // Rollback to the state before that last push
    const undo = await audit.redirectsRollback(clientId, { snapshotId: third.snapshotId, confirm: true });
    chk('rollback: what was there is back, and the read back matches', undo.ok && fake.state.redirects.some(r => r.source === '/garden-design-service' && r.status === 'inactive'), undo, '');
    threw = '';
    try { await audit.redirectsRollback(clientId, { snapshotId: pushed.snapshotId }); } catch (e) { threw = e.message; }
    chk('rollback: needs confirming', /needs confirming/.test(threw), threw, '');
    const first = await audit.redirectsRollback(clientId, { snapshotId: pushed.snapshotId, confirm: true });
    chk('rollback: to before the first push leaves none of Copybot\'s redirects', first.ok && first.left === 0 && fake.state.redirects.filter(r => r.mine).length === 0, first, '');
    const bad = await audit.redirectsRollback(clientId, { snapshotId: '00000000-0000-0000-0000-000000000000', confirm: true });
    chk('rollback: a snapshot that doesn\'t exist is refused', bad.ok === false && /No redirect snapshot/.test(bad.error), bad, '');
    const view = await audit.redirectsView(clientId);
    chk('the log has the pushes and rollbacks', view.log.some(l => l.action === 'redirects_push' && l.result === 'pushed') && view.log.some(l => l.action === 'redirects_push' && l.result === 'refused') && view.log.some(l => l.action === 'redirects_rollback') && !!view.latest_snapshot, view.log.map(l => [l.action, l.result]), '');
  }

  // ── Refusals ──
  {
    const { clientId, audit, fake } = await setup({ staging: false });
    await audit.approve(clientId, { all: true });
    const r = await audit.redirectsPush(clientId, { confirm: true });
    chk('refused: not marked staging, and nothing written', r.ok === false && r.refusals.some(x => /isn't marked as staging/.test(x)) && fake.state.writes === 0, r.refusals, '');
    const t = await audit.testOnStaging(clientId, { confirm: true });
    chk('the staging test refused too, turning nothing on', t.ok === false && !fake.state.statusCalls.length, t, '');
  }
  {
    const fake = createFakeWp({});
    const wp = await listen(fake.app);
    servers.push(wp.server);
    const host = new URL(wp.url).host;
    const { clientId, audit } = await setup({ site: { url: wp.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true, seo: 'rankmath' }, cv: { live_domain: LIVE } });
    await audit.approve(clientId, { all: true });
    const liveAudit = createSiteAudit({ pool, loadValues: async () => ({ live_domain: `http://${host}` }), env: { DATAFORSEO_LOGIN: 'r', DATAFORSEO_PASSWORD: 'r' }, fetchImpl: fetch, sleep: async () => {}, lookup: async () => ({ address: '8.8.8.8' }), log: quiet, loadPages: async () => ({ rows: stand, baseTown: 'Southampton' }), getSite: async () => ({ url: wp.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true, seo: 'rankmath' }), createLog: id => createDbStore(pool, id) });
    const t = await liveAudit.testOnStaging(clientId, { confirm: true });
    chk('the staging test refuses if the connection\'s host matches the live domain, even marked staging, and turns nothing on', t.ok === false && t.block.some(i => /live customer site/.test(i.text)) && !fake.state.statusCalls.length, t, '');
    const p = await liveAudit.redirectsPush(clientId, { confirm: true });
    chk('the push refuses the same', p.ok === false && p.refusals.some(x => /live customer site/.test(x)) && fake.state.writes === 0, p.refusals, '');
  }
  {
    const { clientId, audit } = await setup({ fakeOpts: { pluginVersion: '0.2.1' } });
    await audit.approve(clientId, { all: true });
    const d = await audit.redirectsDryRun(clientId);
    chk('refused: an old plugin, saying which', !d.pushable && d.refusals.some(x => /has Copybot plugin 0\.2\.1/.test(x)), d.refusals, '');
  }
  {
    const { clientId, audit } = await setup({ fakeOpts: { redirectionsModule: false } });
    await audit.approve(clientId, { all: true });
    const d = await audit.redirectsDryRun(clientId);
    chk('refused: the Redirections module off, saying where to turn it on', !d.pushable && d.refusals.some(x => /Redirections module is off/.test(x)), d.refusals, '');
  }
  {
    const { clientId, audit } = await setup({ fakeOpts: { rankMath: false } });
    await audit.approve(clientId, { all: true });
    const d = await audit.redirectsDryRun(clientId);
    chk('refused: Rank Math not active', !d.pushable && d.refusals.some(x => /Rank Math is not active/.test(x)), d.refusals, '');
  }
  {
    const { clientId, audit, fake } = await setup({ fakeOpts: { plugin: false } });
    await audit.approve(clientId, { all: true });
    const d = await audit.redirectsDryRun(clientId);
    chk('refused: the plugin not installed', !d.pushable && d.refusals.some(x => /plugin is not active/.test(x)) && fake.state.writes === 0, d.refusals, '');
  }
  {
    const { clientId, audit, fake } = await setup({ fakeOpts: { otherRedirects: [{ source: '/inspiration' }] } });
    await audit.approve(clientId, { all: true });
    const d = await audit.redirectsDryRun(clientId);
    chk('refused: Rank Math already has a redirect for that URL from someone else', !d.pushable && d.conflicts.length === 1 && d.refusals.some(x => /isn't Copybot's/.test(x)), d, '');
    chk('their redirect is untouched', fake.state.redirects.length === 1 && fake.state.redirects[0].mine === false);
  }
  {
    const { clientId, audit } = await setup({ fakeOpts: { mangleSource: s => s.replace('inspiration', 'inspiration/') } });
    await audit.approve(clientId, { all: true });
    const p = await audit.redirectsPush(clientId, { confirm: true });
    chk('read back: a row Rank Math stored differently is reported, not called a success', p.ok === false && p.result === 'written, read back differs' && p.problems.some(x => /stored by Rank Math/.test(x)) && !!p.snapshotId, p.problems, '');
  }
  {
    const { clientId, audit } = await setup({ fakeOpts: { failRedirectWrites: true } });
    await audit.approve(clientId, { all: true });
    const p = await audit.redirectsPush(clientId, { confirm: true });
    chk('a write that fails says so, with the snapshot to roll back to', p.ok === false && /The write failed/.test(p.error) && !!p.snapshotId, p, '');
  }

  // ── The map's check ──
  {
    const row = (p, plan, extra = {}) => ({ url: `https://x.co.uk${p}`, path: p, kind: 'page', matters: false, top20: false, all_rd: 0, plan: { decision: 'Retire', redirect_type: '301', new_url: '/a', ...plan }, ...extra });
    const check = urls => V.mapCheck({ urls, settings: DEFAULTS });
    const blocks = urls => check(urls).block.map(i => i.text).join(' | ');
    const warns = urls => check(urls).warn.map(i => i.text).join(' | ');
    chk('BLOCK: a page that matters with no row', /matters and has no row/.test(blocks([row('/x', { decision: '', redirect_type: 'none', new_url: '' }, { matters: true })])));
    chk('BLOCK: a page that matters left out as no action', /matters and has no row/.test(blocks([row('/x.jpg', { no_action: true, decision: '' }, { matters: true, kind: 'image' })])));
    chk('BLOCK: a page that matters going nowhere', /goes nowhere/.test(blocks([row('/x', { redirect_type: 'none', new_url: '' }, { matters: true })])));
    chk('BLOCK: a 410 on a page that matters', /never given a 410/.test(blocks([row('/x', { decision: 'Remove', redirect_type: '410', new_url: '' }, { matters: true })])));
    chk('BLOCK: a top list page with no home', /top list and has no home/.test(blocks([row('/x', { redirect_type: 'none', new_url: '' }, { top20: true })])));
    chk('BLOCK: a 301 with no destination', /no destination/.test(blocks([row('/x', { new_url: '' })])));
    chk('BLOCK: a destination off the domain', /off the domain/.test(blocks([row('/x', { new_url: 'https://elsewhere.co.uk/a' })])));
    chk('BLOCK: a thank-you destination', /thank-you/.test(blocks([row('/x', { new_url: '/thank-you' })])));
    chk('BLOCK: a redirect to itself', /to itself/.test(blocks([row('/x', { new_url: '/x/' })])));
    chk('BLOCK: a chain inside the map', /redirects again/.test(blocks([row('/a', { new_url: '/b' }), row('/b', { new_url: '/c' })])));
    chk('BLOCK: a loop inside the map', /redirect loop/.test(blocks([row('/a', { new_url: '/b' }), row('/b', { new_url: '/a' })])));
    chk('fine: a straight map has no BLOCK or WARN', !check([row('/x', { new_url: '/a' }), row('/a', { decision: 'Keep', redirect_type: 'none', new_url: '/a' })]).all.length, check([row('/x', { new_url: '/a' })]).all, []);
    chk('WARN: the homepage as a destination', /goes to the homepage/.test(warns([row('/x', { new_url: '/' })])));
    chk('not a WARN: a homepage variant going to the homepage', !warns([row('/home', { decision: 'Merge', new_url: '/' })]));
    chk('WARN: Retire with a 410', /Retire with a 410/.test(warns([row('/x', { redirect_type: '410', new_url: '' })])));
    chk('WARN: a file with links and no redirect', /file with links/.test(warns([row('/x.pdf', { redirect_type: 'none', new_url: '' }, { kind: 'pdf', all_rd: 2 })])));
  }

  // ── Staging, and the pre launch check ──
  {
    const { clientId, audit, fake } = await setup({ fakeOpts: { publicPaths: ['/'], publicRedirects: { '/gardener': '/somewhere-else' } } });
    await audit.approve(clientId, { all: true });
    let c = await audit.validate(clientId);
    const text = c.block.map(i => i.text).join(' | ');
    chk('check: a Keep URL missing on staging is a BLOCK', /\/contact is a Keep URL and is missing on staging/.test(text), text, '');
    chk('check: a destination that isn\'t 200 is a BLOCK', /\/landscape-designer is a destination and answers 404/.test(text), text, '');
    chk('check: a destination that redirects on is a BLOCK, because it would be a chain', /\/gardener is a destination and redirects on/.test(text), text, '');
    chk('check: nothing was written but the result, and no redirect turned on', !fake.state.statusCalls.length && fake.state.redirects.length === 0 && fake.state.redirectCheck.block === c.block.length, fake.state.redirectCheck, '');
    chk('check: the old site\'s two hop form only warns before launch', c.warn.some(i => /http:\/\/www\.southamptonhomes\.co\.uk\/ takes 2 redirects/.test(i.text)) && !c.block.some(i => /takes 2 redirects/.test(i.text)), c.warn, '');
    chk('check: the push isn\'t stopped by pages not built yet: the redirects are inactive', (await audit.redirectsDryRun(clientId)).pushable);
    const seen = await audit.redirectsView(clientId);
    chk('check: the result is saved', seen.checks.pre_launch && seen.checks.pre_launch.block === c.block.length);
  }

  // ── The one hop rule ──
  {
    const canned = map => async url => { const e = map[String(url)]; if (!e) throw Object.assign(new Error('nope'), { cause: { code: 'ENOTFOUND' } }); return new Response(e.status === 200 ? 'ok' : null, { status: e.status, headers: e.to ? { location: e.to, 'content-type': 'text/html' } : { 'content-type': 'text/html' } }); };
    const good = { 'http://x.co.uk/': { status: 301, to: 'https://x.co.uk/' }, 'https://x.co.uk/': { status: 200 }, 'http://www.x.co.uk/': { status: 301, to: 'https://x.co.uk/' }, 'https://www.x.co.uk/': { status: 301, to: 'https://x.co.uk/' } };
    let f = await V.domainForms('x.co.uk', { fetchImpl: canned(good), level: 'BLOCK' });
    chk('one hop: every version reaching the final URL in one hop passes', !f.block.length && !f.warn.length && f.final === 'https://x.co.uk' && f.forms.length === 4, f, '');
    const two = { ...good, 'http://www.x.co.uk/': { status: 301, to: 'https://www.x.co.uk/' } };
    f = await V.domainForms('x.co.uk', { fetchImpl: canned(two), level: 'BLOCK' });
    chk('one hop: http://www taking two is a BLOCK after launch, naming the URL', f.block.length === 1 && /http:\/\/www\.x\.co\.uk\/ takes 2 redirects/.test(f.block[0].text), f.block, '');
    f = await V.domainForms('x.co.uk', { fetchImpl: canned(two), level: 'WARN' });
    chk('one hop: the same is a WARN before launch', f.warn.length === 1 && !f.block.length);
    const elsewhere = { ...good, 'https://www.x.co.uk/': { status: 200 } };
    f = await V.domainForms('x.co.uk', { fetchImpl: canned(elsewhere), level: 'BLOCK' });
    chk('one hop: two versions showing the site separately don\'t reach one final URL', f.block.some(i => /one final URL/.test(i.text)), f.block, '');
    const noWww = { 'http://x.co.uk/': good['http://x.co.uk/'], 'https://x.co.uk/': good['https://x.co.uk/'] };
    f = await V.domainForms('x.co.uk', { fetchImpl: canned(noWww), level: 'BLOCK' });
    chk('one hop: a version that doesn\'t answer at all is a BLOCK', f.block.filter(i => /doesn't answer/.test(i.text)).length === 2, f.block, '');

    const { clientId, audit } = await setup();
    const after = await audit.checkAfterLaunch(clientId);
    chk('one hop: after launch, the real recording\'s two hop form is a BLOCK', after.block.some(i => /http:\/\/www\.southamptonhomes\.co\.uk\/ takes 2 redirects/.test(i.text)), after, '');
    const seen = await audit.redirectsView(clientId);
    chk('one hop: the result is saved', seen.checks.after_launch && seen.checks.after_launch.block === after.block.length);
  }

  // ── The staging test ──
  {
    const csv = 'Top pages,Clicks,Impressions,CTR,Position\nhttps://southamptonhomes.co.uk/garden-design-service?id=5,3,50,6%,8\n';
    const { clientId, audit, fake, site } = await setup({ csv, fakeOpts: { publicPaths: ['/', '/contact', '/landscape-designer'] } });
    await audit.approve(clientId, { all: true });
    let threw = '';
    try { await audit.testOnStaging(clientId, {}); } catch (e) { threw = e.message; }
    chk('test: needs confirming', /needs confirming/.test(threw), threw, '');
    const empty = await audit.testOnStaging(clientId, { confirm: true });
    chk('test: nothing pushed yet is refused, turning nothing on', empty.ok === false && !fake.state.statusCalls.length && /Push them first/.test(empty.refused[0]), empty, '');
    await audit.redirectsPush(clientId, { confirm: true });
    chk('before the test: they are off, so an old URL answers 404, as Rank Math would', (await fetch(`${site.url}/inspiration`, { redirect: 'manual' })).status === 404);
    const t = await audit.testOnStaging(clientId, { confirm: true });
    chk('test: each old URL answers as the map says', t.ok && t.results.length === 3 && !t.block.length, t, '');
    chk('test: a 301 to its page, a 410, and the query string URL', t.results.some(r => r.source === '/inspiration' && r.status === 410) && t.results.some(r => r.source === '/garden-design-service?id=5' && r.status === 301) && t.results.some(r => r.source === '/garden-design-service' && r.status === 301), t.results, '');
    chk('test: switched on once and off once', fake.state.statusCalls.join() === 'active,inactive', fake.state.statusCalls, '');
    chk('test: all off afterwards, proved by reading back', t.turned_off === true && t.left_on === 0 && fake.state.redirects.every(r => r.status === 'inactive'), t, '');
    chk('after the test: an old URL answers 404 again', (await fetch(`${site.url}/inspiration`, { redirect: 'manual' })).status === 404);
  }
  // It fails part way: still off
  {
    const { clientId, audit, fake, site } = await setup({ fakeOpts: { publicPaths: ['/', '/contact', '/landscape-designer'] } });
    await audit.approve(clientId, { all: true });
    await audit.redirectsPush(clientId, { confirm: true });
    const api = { get: p => require(path.join(root, 'wp/client.js')).wpGet(site, p), post: (p, b) => require(path.join(root, 'wp/client.js')).wpPost(site, p, b) };
    let calls = 0;
    const dying = async (url, init) => { calls++; if (calls === 2) throw new Error('the network went away'); return fetch(url, init); };
    let t = await V.stagingTest(site, { api, fetchImpl: dying });
    chk('fails part way: the URL that failed is a BLOCK', t.ok === false && t.block.length >= 1, t, '');
    chk('fails part way: still switched back off', fake.state.statusCalls[fake.state.statusCalls.length - 1] === 'inactive' && fake.state.redirects.every(r => r.status === 'inactive') && t.left_on === 0 && t.turned_off === true, t, '');

    fake.state.statusCalls.length = 0;
    const throwing = async () => { throw new Error('a crash in the check itself'); };
    const brokenApi = { get: api.get, post: api.post };
    t = await V.stagingTest(site, { api: brokenApi, fetchImpl: throwing, wait: async () => { throw new Error('a crash in the check itself'); } });
    chk('crashes outright: reported as a BLOCK, and still switched back off', t.ok === false && t.block.some(i => /stopped part way/.test(i.text)) && fake.state.redirects.every(r => r.status === 'inactive') && fake.state.statusCalls.join() === 'active,inactive', t, '');

    // Switching off fails once, then works
    fake.state.statusCalls.length = 0;
    fake.state.failStatus.inactive = 1;
    t = await V.stagingTest(site, { api });
    chk('switching off fails once: tried again, and off', fake.state.redirects.every(r => r.status === 'inactive') && t.left_on === 0 && !t.block.some(i => /switched back off/.test(i.text)), t, '');

    // Switching off keeps failing: said as loudly as possible
    fake.state.statusCalls.length = 0;
    fake.state.failStatus.inactive = 5;
    t = await V.stagingTest(site, { api });
    chk('switching off keeps failing: a BLOCK saying they are still on, and how to turn them off', t.ok === false && t.left_on > 0 && t.block.some(i => /could not be switched back off/.test(i.text) && /Settings, Copybot redirects/.test(i.text)), t, '');
    chk('switching off keeps failing: it really was tried three times', fake.state.statusCalls.filter(s => s === 'inactive').length === 3, fake.state.statusCalls, '');
    fake.state.failStatus.inactive = 0;
    const off = await audit.redirectsRollback(clientId, { snapshotId: (await audit.redirectsView(clientId)).latest_snapshot, confirm: true });
    chk('a rollback switches off anything left on, and removes it', off.ok && fake.state.redirects.filter(r => r.mine).length === 0, off, '');

    // Turning on fails: nothing has fired
    await audit.redirectsPush(clientId, { confirm: true });
    fake.state.statusCalls.length = 0;
    fake.state.failStatus.active = 1;
    t = await V.stagingTest(site, { api });
    chk('turning on fails: a BLOCK, no URL requested, and off asked for anyway', t.ok === false && t.results.length === 0 && t.block.some(i => /stopped part way/.test(i.text)) && fake.state.statusCalls.join() === 'active,inactive', t, '');

    // What compares
    const c = (item, res) => V.compareAnswer(item, 'https://s.test', res);
    chk('compare: a right answer, with or without a trailing slash', !c({ source: '/o', path: '/n', code: 301 }, { status: 301, location: 'https://s.test/n/' }));
    chk('compare: the wrong page', /goes to \/x/.test(c({ source: '/o', path: '/n', code: 301 }, { status: 301, location: 'https://s.test/x' }).text));
    chk('compare: off the site', /off the site/.test(c({ source: '/o', path: '/n', code: 301 }, { status: 301, location: 'https://other.test/n' }).text));
    chk('compare: a 302 isn\'t a 301', /answered 302/.test(c({ source: '/o', path: '/n', code: 301 }, { status: 302, location: '/n' }).text));
    chk('compare: not firing', /isn't firing/.test(c({ source: '/o', path: '/n', code: 301 }, { status: 404 }).text));
    chk('compare: a 410 that isn\'t', /should answer 410/.test(c({ source: '/o', path: '', code: 410 }, { status: 404 }).text));
    chk('compare: a right 410', !c({ source: '/o', path: '', code: 410 }, { status: 410 }));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  for (const s of servers) s.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
