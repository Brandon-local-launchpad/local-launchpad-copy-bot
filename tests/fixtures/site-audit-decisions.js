'use strict';
// Fixture: the decisions and the URL map (site-audit/decide.js, decisions.js, export.js) and the Page
// Map slug change (page-map/generator.js, store.js). The five decisions by the brief's rules, each
// rule that can't bend, the destination matching, approving and editing, the two CSVs, the old text
// for the page view whatever the decision, and a kept URL moving a real Page Map page: its links, H1,
// copy and allocation follow, regeneration sees no change, and Undo puts it back.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const D = require(path.join(root, 'site-audit/decide.js'));
const { ensureSiteAuditTables } = require(path.join(root, 'site-audit/store.js'));
const { createSiteAudit, DEFAULTS } = require(path.join(root, 'site-audit/service.js'));
const { replayer } = require(path.join(root, 'site-audit/replay.js'));
const G = require(path.join(root, 'page-map/generator.js'));
const R = require(path.join(root, 'fillout/services/resolver.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const { volumes } = require(path.join(root, 'tests/fixtures/data/edens-edge-volumes.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: site audit, decisions, the URL map and the Page Map slug change ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

// A landscaper's Page Map, as the generator writes it
const pages = [
  { page_key: 'homepage:/', type: 'homepage', title: 'Test Homepage', slug: '/', h1: 'Landscaper Southampton', applies: true, info: { phase: 1 } },
  { page_key: 'category:/landscape-gardener', type: 'category', title: 'Landscape Gardener', slug: '/landscape-gardener', h1: 'Landscape Gardener Southampton', applies: true, info: { category_key: 'lg', primary: true, phase: 1 } },
  { page_key: 'category:/paving-contractor', type: 'category', title: 'Paving Contractor', slug: '/paving-contractor', h1: 'Paving Contractor Southampton', applies: true, info: { category_key: 'pc', phase: 1 } },
  { page_key: 'service:/services/garden-design', type: 'service', title: 'Garden design', slug: '/services/garden-design', h1: 'Garden Design Southampton', applies: true, info: { service_id: 'gd', phase: 1 } },
  { page_key: 'service:/services/patios', type: 'service', title: 'Patios', slug: '/services/patios', h1: 'Patios Southampton', applies: true, info: { service_id: 'pa', phase: 1 } },
  { page_key: 'service:/services/old-retired', type: 'service', title: 'Hedge cutting', slug: '/services/old-retired', h1: '', applies: false, info: { service_id: 'hc', phase: 1 } },
  { page_key: 'location:/locations/winchester', type: 'location', title: 'Winchester', slug: '/locations/winchester', h1: '', applies: true, info: { town: 'Winchester', phase: 1 } },
  { page_key: 'location:/locations/romsey', type: 'location', title: 'Romsey', slug: '/locations/romsey', h1: '', applies: true, info: { town: 'Romsey', phase: 2 } },
];
const row = (p, extra = {}) => ({ url: `https://x.co.uk${p}`, path: p, kind: 'page', fetch_state: 'done', status_code: 200, title: '', h1: '', matters: false, matters_why: [], injected: false, clicks: 0, est_traffic: 0, real_rd: 0, links_out: [], ...extra });
const suggest = (urls, opts = {}) => D.suggestAll({ urls, pages, settings: DEFAULTS, baseTown: 'Southampton', keyOf: k => (String(k).startsWith('/') ? `https://x.co.uk${k}` : String(k).replace(/\/$/, '') || k), ...opts }).suggestions;
const one = (u, opts) => suggest([u], opts).get(u.url);

(async () => {
  // ── Keep ──
  let s = one(row('/'));
  chk('Keep: the homepage, no redirect', s.decision === 'Keep' && s.redirect_type === 'none' && s.new_url === '/', s, '');
  s = one(row('/services/patios'));
  chk('Keep: a page already at its Page Map address, even if it does not matter', s.decision === 'Keep' && s.new_url === '/services/patios' && /Page Map page/.test(s.reason), s, '');
  s = one(row('/contact'));
  chk('Keep: a page every site ships, at its own address', s.decision === 'Keep' && s.new_url === '/contact', s, '');
  for (const p of ['/about', '/privacy-policy', '/terms', '/blog']) chk(`Keep: ${p} is on the site pages list`, one(row(p)).decision === 'Keep');
  s = one(row('/garden-design-ideas', { matters: true, est_traffic: 4 }));
  chk('Keep: it matters, its URL can be kept, and it has a Page Map page elsewhere: propose moving the page', s.decision === 'Keep' && s.new_url === '/garden-design-ideas' && s.proposal && s.proposal.from === '/services/garden-design' && s.proposal.to === '/garden-design-ideas', s, '');
  s = one(row('/our-awards-2019', { matters: true, real_rd: 2 }));
  chk('Keep: it matters and has no Page Map page: it keeps its address and is marked as needing a page', s.decision === 'Keep' && s.needs_page && !s.proposal && /needs building/.test(s.reason), s, '');

  // ── Reuse ──
  s = one(row('/patios.html', { matters: true, est_traffic: 2 }));
  chk('Reuse: it matters but ends in .html: 301 to the match, with the reason', s.decision === 'Reuse' && s.redirect_type === '301' && s.new_url === '/services/patios' && /file extension/.test(s.reason), s, '');
  s = one(row('/post/our-new-patio', { matters: true, est_traffic: 2, title: 'Patios we have laid' }));
  chk('Reuse: a Wix /post/ URL that matters', s.decision === 'Reuse' && /Wix/.test(s.reason) && s.new_url === '/services/patios', s, '');
  s = one(row('/page?id=5', { matters: true, est_traffic: 2, title: 'Patios' }));
  chk('Reuse: a query string that matters', s.decision === 'Reuse' && /query string/.test(s.reason), s, '');
  s = one(row('/Patios', { matters: true, est_traffic: 2 }));
  chk('Reuse: capital letters that matter', s.decision === 'Reuse' && /capital/.test(s.reason), s, '');
  s = one(row('/dead-patios', { status_code: 404, matters: true, real_rd: 1 }));
  chk('Reuse: a dead URL with a real link can\'t be kept: 301 to the closest', s.decision === 'Reuse' && s.redirect_type === '301' && s.new_url === '/services/patios', s, '');
  s = one(row('/zzz.html', { matters: true, real_rd: 1 }));
  chk('Reuse with nothing close: the primary category, marked to check, and not the homepage', s.decision === 'Reuse' && s.new_url === '/landscape-gardener' && s.check, s, '');

  // ── Merge ──
  let m = suggest([row('/patio-services', { est_traffic: 1, matters: true }), row('/patios-southampton', { est_traffic: 3, matters: true }), row('/patio.html')]);
  chk('Merge: several old pages, the one that matters most keeps its address and the Page Map moves', m.get('https://x.co.uk/patios-southampton').decision === 'Keep' && m.get('https://x.co.uk/patios-southampton').proposal.to === '/patios-southampton', [...m.values()], '');
  chk('Merge: the rest 301 to the one kept', m.get('https://x.co.uk/patio-services').decision === 'Merge' && m.get('https://x.co.uk/patio-services').new_url === '/patios-southampton' && m.get('https://x.co.uk/patio.html').decision === 'Merge' && m.get('https://x.co.uk/patio.html').new_url === '/patios-southampton', [...m.values()], '');
  m = suggest([row('/patio-services'), row('/patio.html')]);
  chk('Merge: nothing matters, so all 301 to the Page Map page', [...m.values()].every(x => x.decision === 'Merge' && x.new_url === '/services/patios' && x.redirect_type === '301'), [...m.values()], '');
  m = suggest([row('/services/patios'), row('/patios-old', { matters: true, est_traffic: 9 })]);
  chk('Merge: a page already at the Page Map address wins, and no proposal moves it', m.get('https://x.co.uk/services/patios').decision === 'Keep' && m.get('https://x.co.uk/patios-old').decision === 'Merge' && !m.get('https://x.co.uk/patios-old').proposal, [...m.values()], '');
  s = one(row('/home'));
  chk('Merge: a homepage variant may go to the homepage', s.decision === 'Merge' && s.new_url === '/', s, '');
  for (const p of ['/index.html', '/index.php', '/home-page', '/default.aspx']) chk(`A homepage variant: ${p}`, one(row(p)).new_url === '/');

  // ── Retire ──
  s = one(row('/garden-design-service'));
  chk('Retire: it does not matter and matches at another address: the Page Map address stands, 301 to it, no proposal and no Reuse (Brandon, 5 Nov)', s.decision === 'Retire' && s.new_url === '/services/garden-design' && s.redirect_type === '301' && !s.proposal, s, '');
  s = one(row('/our-patio-gallery'));
  chk('Retire: no match, 301 to the closest category or service page', s.decision === 'Retire' && s.redirect_type === '301' && s.new_url === '/services/patios', s, '');
  s = one(row('/inspiration'));
  chk('Retire: nothing close and no Search Console: it still redirects, to the primary category, marked to check', s.decision === 'Retire' && s.redirect_type === '301' && s.new_url === '/landscape-gardener' && s.check && /Without Search Console/.test(s.reason), s, '');
  chk('It is never the homepage', s.new_url !== '/');
  s = one(row('/inspiration'), { hasSearchConsole: true });
  chk('Retire: nothing close and Search Console says no clicks: a 410, marked to check', s.decision === 'Retire' && s.redirect_type === '410' && !s.new_url && s.check, s, '');
  s = one(row('/thank-you'));
  chk('A thank-you page on the old site is retired like any other', s.decision === 'Retire', s, '');

  // ── Remove ──
  s = one(row('/cheap-viagra', { injected: true, matters_why: ['Looks injected: its address or title is about gambling, pharma or similar, so its rankings and links don\'t count'] }));
  chk('Remove: injected, a 410, never a redirect, with a plain reason', s.decision === 'Remove' && s.redirect_type === '410' && !s.new_url && /Looks injected/.test(s.reason), s, '');
  const tags = Array.from({ length: DEFAULTS.mass_page_minimum }, (_, i) => row(`/tag/thing-${i}`));
  m = suggest(tags);
  chk('Remove: mass tag pages', [...m.values()].every(x => x.decision === 'Remove'));
  s = suggest([row('/tag/patios')]).get('https://x.co.uk/tag/patios');
  chk('A lone tag page is not mass: Retire, not Remove', s.decision === 'Retire' && s.redirect_type === '301', s, '');
  s = suggest([...tags, row('/tag/patios-tag', { matters: true, real_rd: 1 })]).get('https://x.co.uk/tag/patios-tag');
  chk('A tag page that matters is never Removed', s.decision !== 'Remove' && s.redirect_type !== '410', s, '');
  s = one(row('/cheap-viagra', { injected: true, matters: true }));
  chk('An injected page a person says matters is never Removed', s.decision !== 'Remove' && s.redirect_type !== '410', s, '');

  // ── A real trade is never junk ──
  // "specialists" holds the letters of a drug name: this suggested a 410 for a real page until 5 Nov
  const M = require(path.join(root, 'site-audit/matters.js'));
  const SP = require(path.join(root, 'site-audit/spam.js'));
  chk('a specialists page is not injected', !M.injectedReason('/lawn-mowing-specialists', 'Lawn Mowing Specialists'));
  chk('but the drug still is', !!M.injectedReason('/buy-cialis-online') && !!M.injectedReason('/x', 'Cheap Cialis'));
  chk('a specialists site and a Sloane Square site are not junk links', SP.classifyLink({ domain_from: 'drainage-specialists.co.uk', spam_score: 0 }, DEFAULTS).real && SP.classifyLink({ domain_from: 'sloanesquare.co.uk', spam_score: 0 }, DEFAULTS).real);
  chk('but a drug or loans site still is', !SP.classifyLink({ domain_from: 'buycialis.com', spam_score: 0 }, DEFAULTS).real && !SP.classifyLink({ domain_from: 'quickloans.com', spam_score: 0 }, DEFAULTS).real);
  const fs = require('fs');
  const libDir = path.join(root, 'niche-library');
  const flagged = [];
  let names = 0;
  for (const f of fs.readdirSync(libDir).filter(x => x.endsWith('.csv'))) {
    for (const line of fs.readFileSync(path.join(libDir, f), 'utf8').split(/\r?\n/).slice(1)) {
      const name = line.split(',').slice(0, 3).join(' ').replace(/"/g, '');
      if (!name.trim()) continue;
      names++;
      if (M.injectedReason(`/${G.slugify(name)}`, name) || !SP.classifyLink({ domain_from: `${G.slugify(name.split(' ').slice(0, 2).join(''))}.co.uk`, spam_score: 0 }, DEFAULTS).real) flagged.push(`${f}: ${name.slice(0, 60)}`);
    }
  }
  chk(`no service name in the niche libraries looks injected or junk (${names} checked)`, names > 500 && flagged.length === 0, flagged.slice(0, 10), []);

  // ── Rules across every URL ──
  const lots = [row('/'), row('/a.html', { matters: true, real_rd: 1 }), row('/b.html'), row('/nothing-here'), row('/about-us'), row('/contact-us', { matters: true, est_traffic: 1 }), row('/tag/x'), row('/?p=1', { matters: true, est_traffic: 1 })];
  for (const hasSearchConsole of [false, true]) {
    const all = suggest(lots, { hasSearchConsole });
    chk(`no page that matters gets a 410 (Search Console: ${hasSearchConsole})`, lots.filter(u => u.matters).every(u => all.get(u.url).redirect_type !== '410'));
    chk(`nothing but the homepage's own variants goes to the homepage (Search Console: ${hasSearchConsole})`, [...all.entries()].every(([k, v]) => v.new_url !== '/' || k === 'https://x.co.uk/'));
  }
  const noGsc = suggest(lots);
  chk('without Search Console nothing is a 410 except Remove', [...noGsc.values()].every(v => v.redirect_type !== '410' || v.decision === 'Remove'));

  // ── Where a URL may go ──
  s = one(row('/winchester-patios', { title: 'Patios in Winchester' }));
  chk('a URL naming a town goes to that town\'s page when it does not matter', s.new_url === '/locations/winchester', s, '');
  s = one(row('/romsey'));
  chk('a town launching in phase 2 is not a destination: it would not exist at launch', s.new_url !== '/locations/romsey', s, '');
  s = one(row('/hedge-cutting'));
  chk('a Page Map row that no longer applies is not a destination', s.new_url !== '/services/old-retired', s, '');
  s = one(row('/about-us'));
  chk('/about-us goes to /about', s.decision === 'Retire' && s.new_url === '/about', s, '');
  s = one(row('/terms-and-conditions'));
  chk('/terms-and-conditions goes to /terms', s.new_url === '/terms', s, '');
  s = one(row('/privacy'));
  chk('/privacy goes to /privacy-policy', s.new_url === '/privacy-policy', s, '');
  s = one(row('/blog/thoughts-on-mondays'));
  chk('an old blog post with nothing closer goes to /blog', s.new_url === '/blog', s, '');
  const withThanks = D.suggestAll({ urls: [row('/thanks-page')], pages: [...pages, { page_key: 'service:/thank-you', type: 'service', title: 'Thank you', slug: '/thank-you', applies: true, info: {} }], settings: { ...DEFAULTS, site_pages: [...DEFAULTS.site_pages, '/thank-you'] }, baseTown: '' }).suggestions.get('https://x.co.uk/thanks-page');
  chk('a thank-you page is never a destination, even listed', withThanks.new_url !== '/thank-you', withThanks, '');
  chk('a thank-you page test catches its spellings', ['/thank-you', '/thankyou', '/thanks'].every(p => D.neverDestination(p, DEFAULTS)) && !D.neverDestination('/contact', DEFAULTS));

  // ── Redirects and images ──
  m = suggest([row('/old', { status_code: 301, redirect_target: 'https://x.co.uk/services/patios' }), row('/services/patios')]);
  chk('an old redirect carries on to where its target now lives', m.get('https://x.co.uk/old').decision === 'Retire' && m.get('https://x.co.uk/old').new_url === '/services/patios', m.get('https://x.co.uk/old'), '');
  m = suggest([row('/old', { status_code: 301, redirect_target: 'https://x.co.uk/mid', matters: true, real_rd: 1 }), row('/mid', { status_code: 301, redirect_target: 'https://x.co.uk/services/patios' }), row('/services/patios')]);
  chk('a chain is followed to its end, and one that matters is Reuse', m.get('https://x.co.uk/old').decision === 'Reuse' && m.get('https://x.co.uk/old').new_url === '/services/patios', m.get('https://x.co.uk/old'), '');
  s = suggest([row('/gone-away', { status_code: 301, redirect_target: 'https://another-site.co.uk/' })]).get('https://x.co.uk/gone-away');
  chk('a redirect off the site falls back to the primary category, marked to check', s.new_url === '/landscape-gardener' && s.check, s, '');
  m = suggest([row('/a', { status_code: 301, redirect_target: 'https://x.co.uk/b' }), row('/b', { status_code: 301, redirect_target: 'https://x.co.uk/a' })]);
  chk('a redirect loop does not hang, and is marked to check', m.get('https://x.co.uk/a').check, [...m.values()], '');
  m = suggest([row('/services/patios', { links_out: ['https://x.co.uk/p.jpg', 'https://x.co.uk/q.pdf'] }), row('/p.jpg', { kind: 'image' }), row('/q.pdf', { kind: 'pdf', matters: true, real_rd: 1 })]);
  chk('an image nothing depends on: Retire with no redirect', m.get('https://x.co.uk/p.jpg').decision === 'Retire' && m.get('https://x.co.uk/p.jpg').redirect_type === 'none', m.get('https://x.co.uk/p.jpg'), '');
  chk('a PDF with a real link: Reuse, 301 to where the page it sat on now lives', m.get('https://x.co.uk/q.pdf').decision === 'Reuse' && m.get('https://x.co.uk/q.pdf').new_url === '/services/patios', m.get('https://x.co.uk/q.pdf'), '');
  s = one(row('/x', { fetch_state: 'blocked', status_code: null }));
  chk('a URL that was not fetched says so', /not fetched/.test(s.reason), s, '');

  // ── Decline ──
  const proposed = row('/garden-design-ideas', { matters: true, est_traffic: 4 });
  s = one(proposed, { declined: new Set([proposed.url]) });
  chk('a turned down Page Map change: Reuse, 301 to the Page Map page', s.decision === 'Reuse' && s.new_url === '/services/garden-design' && !s.proposal && /turned down/.test(s.reason), s, '');

  // ── The service ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool);
  await ensureSiteAuditTables(pool);
  try { await pool.query(`SELECT metadata FROM client_assets LIMIT 1`); } catch (_) { await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB)`); }

  const recorded = path.join(root, 'tests/fixtures/data/site-audit-southamptonhomes-recorded.json');
  const env = { DATAFORSEO_LOGIN: 'replay', DATAFORSEO_PASSWORD: 'replay' };
  const makeAudit = (extra = {}) => createSiteAudit({ pool, loadValues: async () => ({ live_domain: 'https://southamptonhomes.co.uk' }), env, fetchImpl: replayer(recorded), sleep: async () => {}, lookup: async () => ({ address: '8.8.8.8' }), log: quiet, ...extra });
  const newClient = async name => (await pool.query(`INSERT INTO clients (name, trade) VALUES ($1, 'Landscaper') RETURNING id`, [name])).rows[0].id;
  const pathOf = (v, p) => v.urls.find(u => u.path === p);

  // No Page Map yet: the scan works and the suggestions wait
  {
    const id = await newClient('No map');
    const a = makeAudit();
    await a.start(id); await a.wait(id);
    const v = await a.view(id);
    chk('no Page Map: the scan still finishes and the decisions wait', v.scan.status === 'done' && v.page_map_ready === false && v.scan.summary.decisions === null && !pathOf(v, '/').plan.decision, v.scan.summary.decisions, null);
  }

  // The real test site against a landscaper's Page Map
  const stand = require(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json')).rows.filter(r => r.applies !== false).map((r, i) => ({ page_key: `${r.type}:${r.slug}`, sort_order: i, info: {}, ...r }));
  const id = await newClient('Southampton Homes');
  const a = makeAudit({ loadPages: async () => ({ rows: stand, baseTown: 'Southampton' }) });
  await a.start(id); await a.wait(id);
  let v = await a.view(id);
  chk('test site: the homepage and /contact are kept', pathOf(v, '/').plan.decision === 'Keep' && pathOf(v, '/contact').plan.decision === 'Keep' && pathOf(v, '/contact').plan.new_url === '/contact', [pathOf(v, '/').plan, pathOf(v, '/contact').plan], '');
  chk('test site: /garden-design-service is Retire, 301, not Reuse (Brandon, 5 Nov)', pathOf(v, '/garden-design-service').plan.decision === 'Retire' && pathOf(v, '/garden-design-service').plan.redirect_type === '301' && !!pathOf(v, '/garden-design-service').plan.new_url, pathOf(v, '/garden-design-service').plan, '');
  chk('test site: /inspiration is Retire, 301, marked to check', pathOf(v, '/inspiration').plan.decision === 'Retire' && pathOf(v, '/inspiration').plan.redirect_type === '301' && pathOf(v, '/inspiration').plan.check, pathOf(v, '/inspiration').plan, '');
  chk('test site: the 50 images get no redirect', v.urls.filter(u => u.kind === 'image').length === 50 && v.urls.filter(u => u.kind === 'image').every(u => u.plan.decision === 'Retire' && u.plan.redirect_type === 'none'));
  chk('test site: nothing goes to the homepage, nothing is a 410', v.urls.every(u => u.path === '/' || u.plan.new_url !== '/') && v.urls.every(u => u.plan.redirect_type !== '410'));
  chk('test site: every URL has a row, and nothing is approved yet', v.urls.every(u => u.plan.decision) && v.scan.summary.decisions.approved === 0 && v.scan.summary.decisions.total === 54, v.scan.summary.decisions, '');

  // The text of every HTML page is saved, whatever its decision (Brandon, 5 Nov)
  const garden = pathOf(v, '/garden-design-service');
  let page = await a.pageContent(id, garden.plan.new_url);
  chk('page view: a Retired page\'s text is there for the page it redirects to', page.pages.length === 1 && page.pages[0].path === '/garden-design-service' && page.pages[0].decision === 'Retire' && page.pages[0].main_text.length > 500 && page.pages[0].word_count > 1000, page.pages.map(p => [p.path, p.decision, p.word_count]), '');
  page = await a.pageContent(id, '/');
  chk('page view: the homepage has its own old text', page.pages.length === 1 && page.pages[0].path === '/' && page.pages[0].decision === 'Keep', page.pages.map(p => p.path), '');
  chk('page view: a page with nothing behind it has an empty list', (await a.pageContent(id, '/services/nothing')).pages.length === 0);
  const { rows: texts } = await pool.query(`SELECT path, main_text FROM site_scan_urls WHERE client_id = $1 AND kind = 'page'`, [id]);
  chk('the main text of all 4 HTML pages is saved at scan time, none of them skipped by its decision', texts.length === 4 && texts.every(t => t.main_text && t.main_text.length > 0), texts.map(t => [t.path, (t.main_text || '').length]), '');

  // Approving
  let r = await a.approve(id, { url_ids: [pathOf(v, '/').id, pathOf(v, '/contact').id] });
  chk('approve some rows', r.approval.approved === 2 && pathOf(r, '/').plan.approved && !pathOf(r, '/inspiration').plan.approved && r.scan.summary.decisions.approved === 2, r.approval, '');
  r = await a.approve(id, { all: true });
  chk('approve all takes the rest', r.approval.approved === 52 && r.scan.summary.decisions.approved === 54, r.approval, '');
  let threw = '';
  try { await a.approve(id, {}); } catch (e) { threw = e.message; }
  chk('approving nothing is refused', /Choose some rows/.test(threw), threw, '');

  // Editing, and the rules that can't bend
  const insp = pathOf(r, '/inspiration');
  const refused = async (input, url = insp) => { try { await a.setDecision(id, url.id, input); return ''; } catch (e) { return e.message; } };
  v = await a.setDecision(id, insp.id, { decision: 'Retire', new_url: 'https://www.southamptonhomes.co.uk/services/patios/' });
  chk('edit: a full address on the site is stored as its path', pathOf(v, '/inspiration').plan.new_url === '/services/patios' && pathOf(v, '/inspiration').plan.by_hand && pathOf(v, '/inspiration').plan.approved && pathOf(v, '/inspiration').plan.differs, pathOf(v, '/inspiration').plan, '');
  v = await a.setDecision(id, insp.id, { decision: 'Retire', redirect_type: '410' });
  chk('edit: a person may choose a 410 on a page that does not matter', pathOf(v, '/inspiration').plan.redirect_type === '410' && !pathOf(v, '/inspiration').plan.new_url, pathOf(v, '/inspiration').plan, '');
  v = await a.setDecision(id, insp.id, { reset: true });
  chk('edit: back to the suggestion', !pathOf(v, '/inspiration').plan.approved && pathOf(v, '/inspiration').plan.redirect_type === '301', pathOf(v, '/inspiration').plan, '');
  chk('refused: a destination on another site', /another site/.test(await refused({ decision: 'Reuse', new_url: 'https://elsewhere.co.uk/x' })));
  chk('refused: a thank-you page as a destination', /never a redirect destination/.test(await refused({ decision: 'Retire', new_url: '/thank-you' })));
  chk('refused: a redirect with no destination', /needs a new URL/.test(await refused({ decision: 'Merge', new_url: '' })));
  chk('refused: a URL redirecting to itself', /to itself/.test(await refused({ decision: 'Reuse', new_url: '/inspiration' })));
  chk('refused: a decision that does not exist', /must be one of/.test(await refused({ decision: 'Delete' })));
  const home = pathOf(v, '/');
  chk('refused: a 410 on a page that matters, by Remove', /never given a 410/.test(await refused({ decision: 'Remove' }, home)));
  chk('refused: a 410 on a page that matters, by Retire', /never given a 410/.test(await refused({ decision: 'Retire', redirect_type: '410' }, home)));
  v = await a.setDecision(id, insp.id, { decision: 'Keep' });
  chk('edit: Keep maps to itself with no redirect', pathOf(v, '/inspiration').plan.new_url === '/inspiration' && pathOf(v, '/inspiration').plan.redirect_type === 'none', pathOf(v, '/inspiration').plan, '');

  // An approved 410 that comes to matter loses its approval
  v = await a.setDecision(id, insp.id, { decision: 'Remove' });
  chk('a page that does not matter can be Removed by hand', pathOf(v, '/inspiration').plan.redirect_type === '410');
  v = await a.setOverride(id, insp.id, { matters: true });
  chk('when it comes to matter, the 410 is lifted and the row says why', pathOf(v, '/inspiration').plan.redirect_type !== '410' && !pathOf(v, '/inspiration').plan.approved && /never given a 410/.test(pathOf(v, '/inspiration').plan.lifted), pathOf(v, '/inspiration').plan, '');
  await a.setOverride(id, insp.id, { matters: null });

  // A rescan keeps what was approved
  const garden2 = pathOf(await a.view(id), '/garden-design-service');
  await a.setDecision(id, garden2.id, { decision: 'Retire', new_url: '/services/patios', note: 'Ray says so' });
  const b = makeAudit({ loadPages: async () => ({ rows: stand, baseTown: 'Southampton' }) });
  await b.start(id); await b.wait(id);
  v = await b.view(id);
  chk('a rescan keeps a person\'s decision, with their note', pathOf(v, '/garden-design-service').plan.new_url === '/services/patios' && /Ray says so/.test(pathOf(v, '/garden-design-service').plan.reason), pathOf(v, '/garden-design-service').plan, '');
  chk('and shows what is suggested now beside it', pathOf(v, '/garden-design-service').plan.suggested.new_url !== '/services/patios' && pathOf(v, '/garden-design-service').plan.differs);

  // The CSVs
  const map = await b.exportCsv(id, 'url-map');
  const audit = await b.exportCsv(id, 'old-site-audit');
  const lines = map.trim().split('\r\n');
  chk('URL map CSV: a row per old URL, with the columns the sheet needs', lines.length === 55 && lines[0].startsWith('Old URL,Decision,New URL,Redirect type'), lines.slice(0, 2), '');
  chk('URL map CSV: kept pages map to themselves, full addresses', lines.some(l => l.startsWith('https://southamptonhomes.co.uk/contact,Keep,https://southamptonhomes.co.uk/contact,None')), lines.slice(1, 4), '');
  chk('Old Site Audit CSV: a row per old URL with its findings', audit.trim().split('\r\n').length === 55 && audit.startsWith('Old URL,Type,Found by,Status') && audit.includes('landscaping southampton'), audit.slice(0, 200), '');
  const { toCsv } = require(path.join(root, 'site-audit/export.js'));
  chk('a cell that would run as a formula in a spreadsheet stays text', toCsv(['a'], [['=HYPERLINK("x")']]).includes(`"'=HYPERLINK(""x"")"`), toCsv(['a'], [['=HYPERLINK("x")']]), '');

  // ── A kept URL moves a real Page Map page ──
  const config = R.loadConfig('landscapers-gardeners');
  const resolved = R.resolve(ticks, config, { categoryTabRule: 'ticked_only' });
  const input = { resolved, baseTown: S.BASE_TOWN, otherTowns: S.OTHER_TOWNS.join('\n'), companyName: S.COMPANY, niche: 'Landscapers/Gardeners' };
  const plain = G.buildPageMap(input, { volumes: volumes() });
  const svc = plain.rows.find(x => x.type === 'service');
  const moved = G.buildPageMap(input, { volumes: volumes(), urlOverrides: new Map([[G.identityOf(svc), '/kept-old-address']]) });
  const movedRow = moved.rows.find(x => x.type === 'service' && x.info.service_id === svc.info.service_id);
  chk('generator: the page takes the kept address', movedRow.slug === '/kept-old-address' && movedRow.page_key === 'service:/kept-old-address', movedRow.slug, '/kept-old-address');
  chk('generator: every link to it follows', moved.rows.some(x => (x.links_to || []).includes('/kept-old-address')) && !moved.rows.some(x => (x.links_to || []).includes(svc.slug)), '', '');
  chk('generator: the same number of pages, nothing else moved', moved.rows.length === plain.rows.length && moved.rows.filter(x => x.slug !== plain.rows.find(y => G.identityOf(y) === G.identityOf(x) && y.type === x.type)?.slug).length === 1, moved.rows.length, plain.rows.length);
  chk('generator: a page\'s identity does not change with its address', G.identityOf(movedRow) === G.identityOf(svc));

  const svcF = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper')`);
  await S.seed(pool, { write: true, log() {} });
  const cid = (await pool.query(`SELECT id FROM clients WHERE name = 'ednes edge testing'`)).rows[0].id;
  const store = createPageMapStore({ pool, filloutService: svcF, volumesFor: async () => volumes(), approvedTiers: async () => null });
  await store.generate(cid);
  let saved = await store.saved(cid);
  const target = saved.find(x => x.type === 'service' && x.applies !== false);
  const other = saved.find(x => x.type === 'service' && x.applies !== false && x.id !== target.id);
  const countBefore = saved.filter(x => x.applies !== false).length;
  await store.setRow(cid, target.id, { h1: 'A Hand Written H1' });
  // Copy and an allocation keyed by the slug, and another page's copy linking to it
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'v20_page_record', 'r.json', $2, $3)`, [cid, JSON.stringify({ page: 'service', x: 1 }), JSON.stringify({ page_type: 'service', page_key: target.slug })]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'v20_page_record', 'o.json', $2, $3)`, [cid, JSON.stringify({ body: `see [it](${target.slug})` }), JSON.stringify({ page_type: 'service', page_key: other.slug })]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'allocation', 'a.json', $2)`, [cid, JSON.stringify({ pages: { [`service:${target.slug}`]: { neighbourhoods: ['N1'] } } })]);

  let thrown = '';
  try { await store.applyUrlOverride(cid, { page_key: target.page_key, path: other.slug }); } catch (e) { thrown = e.message; }
  chk('refused: another page is already at that address, and nothing changed', /already at/.test(thrown) && (await store.saved(cid)).find(x => x.id === target.id).slug === target.slug, thrown, '');
  thrown = '';
  try { await store.applyUrlOverride(cid, { page_key: saved.find(x => x.type === 'homepage').page_key, path: '/new-home' }); } catch (e) { thrown = e.message; }
  chk('refused: the homepage never moves', /homepage can't move/.test(thrown), thrown, '');

  const out = await store.applyUrlOverride(cid, { page_key: target.page_key, path: '/kept-old-address', old_url: 'https://x.co.uk/kept-old-address' });
  saved = await store.saved(cid);
  const after = saved.find(x => x.id === target.id);
  chk('store: the same row now has the kept address', after.slug === '/kept-old-address' && after.page_key === 'service:/kept-old-address' && after.applies !== false, after.slug, '');
  chk('store: its H1 and status survive, because it was renamed and not retired', after.h1 === 'A Hand Written H1' && after.h1_source === 'manual', [after.h1, after.h1_source], '');
  chk('store: there is one page for the service, and the page count is unchanged', saved.filter(x => x.applies !== false).length === countBefore && !saved.some(x => x.slug === target.slug), saved.filter(x => x.applies !== false).length, countBefore);
  chk('store: links on other pages follow', saved.some(x => (x.links_to || []).includes('/kept-old-address')) && !saved.some(x => (x.links_to || []).includes(target.slug)));
  const { rows: assets } = await pool.query(`SELECT asset_type, content, metadata FROM client_assets WHERE client_id = $1 AND asset_type IN ('v20_page_record', 'allocation')`, [cid]);
  const meta = x => (typeof x === 'string' ? JSON.parse(x) : x) || {};
  chk('store: the page\'s written copy moves with it', assets.some(x => x.asset_type === 'v20_page_record' && meta(x.metadata).page_key === '/kept-old-address') && !assets.some(x => x.asset_type === 'v20_page_record' && meta(x.metadata).page_key === target.slug), assets.map(x => meta(x.metadata).page_key), '');
  chk('store: its allocation moves with it', JSON.parse(assets.find(x => x.asset_type === 'allocation').content).pages['service:/kept-old-address'].neighbourhoods[0] === 'N1', assets.find(x => x.asset_type === 'allocation').content, '');
  chk('store: written copy still linking to the old address is named for regenerating', out.copy_linking_old.includes(other.slug), out.copy_linking_old, [other.slug]);
  await store.generate(cid);
  const regen = await store.saved(cid);
  chk('store: a later regeneration keeps it, and retires nothing', regen.find(x => x.id === target.id).slug === '/kept-old-address' && regen.filter(x => x.applies !== false).length === countBefore, regen.filter(x => x.applies !== false).length, countBefore);
  chk('store: the change is on file', (await store.listUrlOverrides(cid)).some(o => o.path === '/kept-old-address' && o.from_path === target.slug));

  // Through the audit: a Keep proposal, approved, turned down, undone
  {
    const liveRows = async () => { const r2 = await store.saved(cid); return { rows: r2.filter(x => x.applies !== false), baseTown: S.BASE_TOWN }; };
    await store.clearUrlOverride(cid, G.identityOf(target));
    const back = (await store.saved(cid)).find(x => x.id === target.id);
    chk('undo: the page is back at its planned address, the copy too', back.slug === target.slug && !(await store.listUrlOverrides(cid)).length, back.slug, target.slug);
    const name = target.title;
    const oldSlug = `/${G.slugify(name)}-specialists`;
    const canned = {};
    const home = `<html><head><title>Home</title></head><body><main><h1>Home</h1><p>Welcome to the site, with enough words here for it to count as a real page of text for the reader.</p><a href="${oldSlug}">${name}</a></main></body></html>`;
    canned['https://client.co.uk/'] = home;
    canned[`https://client.co.uk${oldSlug}`] = `<html><head><title>${name}</title></head><body><main><h1>${name}</h1><p>All about this service in enough words to be a page of text for the people reading it here.</p></main></body></html>`;
    const fakeFetch = async (url, init = {}) => {
      const u = String(url);
      if (u.includes('api.dataforseo.com')) {
        const ranked = u.includes('ranked_keywords');
        const items = ranked ? [{ keyword_data: { keyword: `${name} southampton`, keyword_info: { search_volume: 50 } }, ranked_serp_element: { serp_item: { url: `https://client.co.uk${oldSlug}`, rank_group: 4, etv: 6 } } }] : [];
        return new Response(JSON.stringify({ status_code: 20000, cost: 0.01, tasks: [{ id: 't', status_code: 20000, cost: 0.01, result: [{ total_count: items.length, items }] }] }), { status: 200 });
      }
      const k = u.replace(/\/$/, '') === 'https://client.co.uk' ? 'https://client.co.uk/' : u;
      if (canned[k]) return new Response(canned[k], { status: 200, headers: { 'content-type': 'text/html' } });
      return new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } });
    };
    const audit2 = createSiteAudit({ pool, loadValues: async () => ({ live_domain: 'https://client.co.uk' }), env, fetchImpl: fakeFetch, sleep: async () => {}, lookup: async () => ({ address: '8.8.8.8' }), log: quiet, loadPages: liveRows, pageMap: store });
    await audit2.start(cid); await audit2.wait(cid);
    let w = await audit2.view(cid);
    const kept = pathOf(w, oldSlug);
    chk('audit: a URL that matters is Keep, with the Page Map change waiting', kept.plan.decision === 'Keep' && kept.plan.proposal && kept.plan.proposal.from === target.slug && !kept.plan.approved, kept.plan, '');
    const bulk = await audit2.approve(cid, { all: true });
    chk('audit: approve all leaves it waiting: approving it means moving the page', bulk.approval.waiting === 1 && !pathOf(bulk, oldSlug).plan.approved, bulk.approval, '');
    w = await audit2.proposalNo(cid, kept.id);
    chk('audit: turned down: Reuse, 301 to the Page Map page, and the Page Map is untouched', pathOf(w, oldSlug).plan.decision === 'Reuse' && pathOf(w, oldSlug).plan.new_url === target.slug && (await store.saved(cid)).find(x => x.id === target.id).slug === target.slug, pathOf(w, oldSlug).plan, '');
    await audit2.setDecision(cid, kept.id, { reset: true });
    w = await audit2.view(cid);
    chk('audit: back to the suggestion brings the change back', pathOf(w, oldSlug).plan.proposal && pathOf(w, oldSlug).plan.decision === 'Keep', pathOf(w, oldSlug).plan, '');
    w = await audit2.proposalYes(cid, kept.id);
    chk('audit: approved: the page moves, the row is an approved Keep with nothing waiting', pathOf(w, oldSlug).plan.decision === 'Keep' && pathOf(w, oldSlug).plan.approved && !pathOf(w, oldSlug).plan.proposal && (await store.saved(cid)).find(x => x.id === target.id).slug === oldSlug, pathOf(w, oldSlug).plan, '');
    chk('audit: its URL now matches the Page Map, so the suggestion says so', /same address as the Page Map page/.test(pathOf(w, oldSlug).plan.suggested.reason), pathOf(w, oldSlug).plan.suggested, '');
    chk('audit: the change is listed', w.page_map_changes.some(o => o.path === oldSlug));
    w = await audit2.proposalUndo(cid, G.identityOf(target));
    chk('audit: undone: the page goes back and the row is a suggestion again', (await store.saved(cid)).find(x => x.id === target.id).slug === target.slug && !pathOf(w, oldSlug).plan.approved && pathOf(w, oldSlug).plan.proposal && !w.page_map_changes.length, pathOf(w, oldSlug).plan, '');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
