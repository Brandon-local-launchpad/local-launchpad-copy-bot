'use strict';
// Fixture: Scan old site (site-audit/), on pg-mem with fake sites and a fake DataForSEO.
// From the brief: a Wix style site (/post/ URLs), a hacked site with injected spam pages, an orphan
// page only in the sitemap, a redirect chain, a JS only page, a bot challenge homepage, a site with a
// Search Console file and one without. Also: the spam rule on real link data from three sites
// (5 Nov 2026), junk links alone never making a page matter, the phone and temp host issues, the
// domain check (live_domain only), the row and spending limits, a failed source, a restart and
// Resume paying for nothing twice, the page cap, hand overrides, settings reworking for nothing.
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const U = require(path.join(root, 'site-audit/urls.js'));
const H = require(path.join(root, 'site-audit/html.js'));
const SM = require(path.join(root, 'site-audit/sitemap.js'));
const SP = require(path.join(root, 'site-audit/spam.js'));
const M = require(path.join(root, 'site-audit/matters.js'));
const IS = require(path.join(root, 'site-audit/issues.js'));
const { ensureSiteAuditTables } = require(path.join(root, 'site-audit/store.js'));
const { ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));
const { createSiteAudit, domainCheck, DEFAULTS } = require(path.join(root, 'site-audit/service.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: site audit, the scan and the spam filter ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const env = { DATAFORSEO_LOGIN: 'test', DATAFORSEO_PASSWORD: 'test' };

// ── A fake site and a fake DataForSEO ──
// site: { host, pages: { '/path': html | { status, html, location, type, headers } }, robots, www: 'redirect' }
// data: { links: [...], keywords: [...], linked: [...], fail: { endpoint: message } }
function fakeWeb(site, data = {}) {
  const calls = { dfs: {}, urls: [], ua: new Set() };
  const task = (endpoint, cost, items, extra = {}) => ({ status_code: 20000, cost, tasks: [{ id: 't', status_code: 20000, status_message: 'Ok.', cost, result: [{ total_count: extra.total == null ? items.length : extra.total, items, search_after_token: extra.token || null }] }] });
  const impl = async (url, init = {}) => {
    const s = String(url);
    if (s.startsWith('https://api.dataforseo.com/')) {
      const endpoint = s.replace('https://api.dataforseo.com/v3/', '');
      calls.dfs[endpoint] = (calls.dfs[endpoint] || 0) + 1;
      if (data.fail && data.fail[endpoint]) return new Response(JSON.stringify({ status_code: 20000, cost: 0, tasks: [{ id: 't', status_code: 40000, status_message: data.fail[endpoint], cost: 0 }] }), { status: 200 });
      const payload = JSON.parse(init.body)[0];
      if (endpoint.includes('domain_pages_summary')) { const items = data.linked || []; return new Response(JSON.stringify(task(endpoint, 0.024 + items.length * 0.000036, items)), { status: 200 }); }
      if (endpoint.includes('backlinks/backlinks')) {
        const all = data.links || [];
        const start = payload.search_after_token ? Number(payload.search_after_token) : 0;
        const items = all.slice(start, start + 1000).map(l => ({ url_to: l.to, domain_from: l.from, url_from: l.url_from || `https://${l.from}/page`, anchor: l.anchor == null ? 'A link' : l.anchor, backlink_spam_score: l.score === undefined ? 0 : l.score, domain_from_rank: l.rank == null ? 100 : l.rank, page_from_external_links: l.ext == null ? 5 : l.ext, dofollow: true, url_to_status_code: 200 }));
        const more = start + 1000 < all.length;
        return new Response(JSON.stringify(task(endpoint, 0.024 + items.length * 0.000036, items, { total: all.length, token: more ? String(start + 1000) : null })), { status: 200 });
      }
      if (endpoint.includes('ranked_keywords')) {
        const all = data.keywords || [];
        const items = all.slice(payload.offset || 0, (payload.offset || 0) + 1000).map(k => ({ keyword_data: { keyword: k.keyword, keyword_info: { search_volume: k.volume == null ? 100 : k.volume } }, ranked_serp_element: { serp_item: { url: k.url, rank_group: k.position == null ? 5 : k.position, etv: k.etv == null ? 1 : k.etv } } }));
        return new Response(JSON.stringify(task(endpoint, 0.012 + items.length * 0.00012, items, { total: all.length })), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    }
    calls.urls.push(s);
    calls.ua.add(init.headers && init.headers['User-Agent']);
    if (init.method && init.method !== 'GET') throw new Error('The crawl must only GET');
    const u = new URL(s);
    const canonical = `https://${site.host}`;
    // Every other form of the address redirects to the canonical one
    if (site.www !== 'none' && (u.protocol !== 'https:' || u.hostname !== site.host)) {
      const hops = site.twoHops && u.protocol === 'http:' && u.hostname !== site.host ? `https://${u.hostname}${u.pathname}` : `${canonical}${u.pathname}${u.search}`;
      return new Response(null, { status: 301, headers: { location: hops } });
    }
    if (u.pathname === '/robots.txt' && site.robots !== undefined) return new Response(site.robots, { status: 200, headers: { 'content-type': 'text/plain' } });
    const p = site.pages[`${u.pathname}${u.search}`] ?? site.pages[u.pathname.replace(/\/$/, '') || '/'];
    if (p === undefined) return new Response('<html><body>Not found</body></html>', { status: 404, headers: { 'content-type': 'text/html' } });
    const page = typeof p === 'string' ? { html: p } : p;
    if (page.throws) throw Object.assign(new Error('fetch failed'), { cause: { code: page.throws } });
    const headers = { 'content-type': page.type || 'text/html; charset=utf-8', ...(page.location ? { location: page.location } : {}), ...(page.headers || {}) };
    return new Response(page.status && page.status >= 300 && page.status < 400 ? null : (page.html || ''), { status: page.status || 200, headers });
  };
  return { impl, calls };
}

const pageHtml = (title, body, { head = '', nav = '<a href="/">Home</a>' } = {}) => `<!doctype html><html><head><title>${title}</title>${head}</head><body><header>${nav}</header><main><h1>${title}</h1>${body}</main><footer>Footer text</footer></body></html>`;
const WORDS = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');
const sitemapOf = (host, paths) => `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>https://${host}${p}</loc></url>`).join('')}</urlset>`;

async function db() {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT)`);
  await ensurePageMapTables(pool);
  await ensureSiteAuditTables(pool);
  return pool;
}
async function scanOf(pool, web, cv, { connection = null, settings = null, costs = [], data = null } = {}) {
  const { rows } = await pool.query(`INSERT INTO clients (name) VALUES ('Test') RETURNING id`);
  const clientId = rows[0].id;
  const audit = createSiteAudit({ pool, loadValues: async () => cv, getConnection: async () => connection, logCost: async e => { costs.push(e); }, env, fetchImpl: web.impl, sleep: async () => {}, log: quiet, lookup: async () => ({ address: '93.184.216.34' }), retryDelays: [] });
  if (settings) await audit.saveSettings(clientId, settings);
  await audit.start(clientId);
  await audit.wait(clientId);
  return { clientId, audit, view: await audit.view(clientId) };
}
const byPath = (v, p) => v.urls.find(u => u.path === p);

(async () => {
  // ── URLs ──
  const t = U.createUrlTools('https://example.co.uk');
  chk('http, www, a trailing slash, a fragment and tracking parameters are one URL', ['http://example.co.uk/contact/', 'https://www.example.co.uk/contact#form', 'https://example.co.uk/contact?utm_source=x&gclid=1'].every(x => t.key(x) === 'https://example.co.uk/contact'));
  chk('a real query string stays: an old ?id=5 URL is its own page', t.key('https://example.co.uk/page?id=5') === 'https://example.co.uk/page?id=5');
  chk('the homepage keeps its slash; another site is not ours', t.key('http://www.example.co.uk') === 'https://example.co.uk/' && t.key('https://other.co.uk/') === null);
  chk('a www live site keeps www on every URL', U.createUrlTools('https://www.example.co.uk').key('http://example.co.uk/a/') === 'https://www.example.co.uk/a');
  chk('a subdomain stays its own URL', t.key('http://m.example.co.uk/a') === 'https://m.example.co.uk/a');
  chk('the back end, feeds and scripts are not crawled; pages, images and PDFs are', !t.crawlable('https://example.co.uk/wp-json/x') && !t.crawlable('https://example.co.uk/feed/') && !t.crawlable('https://example.co.uk/a.css') && !t.crawlable('https://example.co.uk/?s=hello') && t.crawlable('https://example.co.uk/a') && t.crawlable('https://example.co.uk/a.pdf') && t.crawlable('https://example.co.uk/a.jpg'));
  chk('images and PDFs are told apart from pages', t.kind('https://example.co.uk/a.JPG') === 'image' && t.kind('https://example.co.uk/a.pdf') === 'pdf' && t.kind('https://example.co.uk/post/a') === 'page');

  // ── Reading a page ──
  const html = `<html><head><title> Garden  Design </title><meta name="description" content="Desc"><link rel="canonical" href="/garden/"><meta name="robots" content="noindex, follow"><script>var x = "07000 000000";</script></head>
    <body><header><a class="custom-logo-link" href="https://hh9.f77.myftpupload.com/"><img src="/logo.png" alt="Logo"></a><a href="tel:02381550183">02381 550155</a></header>
    <main><h1>Garden <b>Design</b></h1><p>${WORDS}</p><a href="/services/">Services</a><a href="http://example.co.uk/mixed">Mixed</a><a href="https://www.example.co.uk/www">Www</a><a href="/brochure.pdf">PDF</a><a href="mailto:a@b.co">Mail</a><a href="https://www.facebook.com/x">FB</a></main>
    <footer>SO14 1AA Call 023 8155 0155 or +44 (0)7580 412717</footer></body></html>`;
  const p = H.parsePage(html, 'https://example.co.uk/garden', t);
  chk('title, H1, meta description, canonical and noindex', p.title === 'Garden Design' && p.h1 === 'Garden Design' && p.metaDescription === 'Desc' && p.canonical === 'https://example.co.uk/garden/' && p.noindex === true, p, '');
  chk('internal links include linked PDFs and drop mail links and other sites', p.links.includes('https://example.co.uk/services') && p.links.includes('https://example.co.uk/brochure.pdf') && !p.links.some(l => /mailto|facebook/.test(l)), p.links, '');
  chk('the tap to call link, displayed phones in header and footer, no number from a script', p.facts.tel.join() === '02381550183' && p.facts.phones.map(x => x.digits).sort().join() === '02381550155,07580412717' && !p.facts.phones.some(x => x.digits === '07000000000'), p.facts, '');
  chk('a postcode is read off the page', p.facts.postcodes.join() === 'SO141AA', p.facts.postcodes, 'SO141AA');
  chk('a logo link to another host is named as the logo', p.facts.other_hosts.find(o => o.host === 'hh9.f77.myftpupload.com').where === 'logo', p.facts.other_hosts, '');
  chk('http and other www links are counted', p.facts.http_links === 1 && p.facts.other_www_links === 1, p.facts, '');
  chk('the main text leaves the header, footer and menus out', p.mainText.includes('word5') && !p.mainText.includes('Call 023') && p.wordCount >= 120, p.mainText.slice(0, 80), '');

  // ── The platform comes from the site, and blocks are recognised ──
  chk('WordPress from its file paths, with no generator tag and with Elementor (the test site)', H.detectPlatform('<meta name="generator" content="Elementor 4.3.6"><link href="/wp-content/x.css">').platform === 'WordPress');
  chk('Wix, Squarespace and the GoDaddy builder from their markers', H.detectPlatform('<img src="https://static.wixstatic.com/a.jpg">').platform === 'Wix' && H.detectPlatform('<script src="https://static1.squarespace.com/a.js"></script>').platform === 'Squarespace' && H.detectPlatform('<meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8">').platform === 'GoDaddy builder');
  chk('WordPress on GoDaddy hosting is still WordPress', H.detectPlatform('<link href="/wp-content/x.css"><a href="https://hh9.f77.myftpupload.com/">x</a>').platform === 'WordPress');
  chk('anything else is Other, with the reason', H.detectPlatform('<html></html>').platform === 'Other');
  chk('challenge pages and refusals are recognised; a normal page and a 404 are not', !!H.blockReason(403, '') && !!H.blockReason(503, '<title>Just a moment...</title>') && !!H.blockReason(200, '<div class="cf-chl">Verify you are human</div>') && !H.blockReason(200, pageHtml('Fine', WORDS)) && !H.blockReason(404, 'nope'));

  const contactForm = `<html><body><h1>Contact</h1><p>Call us about your garden today.</p><form><div class="g-recaptcha"></div><p>This site is protected by reCAPTCHA.</p></form><script src="https://www.google.com/recaptcha/api.js"></script>${Array.from({ length: 40 }, (_, i) => `<p>word${i}</p>`).join('')}</body></html>`;
  chk('a contact form with reCAPTCHA is a normal page (the test site\'s /contact)', !H.blockReason(200, contactForm), H.blockReason(200, contactForm), '');
  chk('Cloudflare\'s script on a normal page is a normal page', !H.blockReason(200, `<script src="/cdn-cgi/challenge-platform/h/g/scripts/x.js"></script><body>${WORDS}</body>`));
  chk('a challenge with no words but the script is a block', !!H.blockReason(200, '<body><script src="/cdn-cgi/challenge-platform/h/g/x.js"></script></body>'));

  // ── robots.txt and sitemaps ──
  const rb = SM.parseRobots('Sitemap: https://x.co/a.xml\n# comment\nUser-agent: *\nDisallow: /private/\nAllow: /private/ok\nCrawl-delay: 3\nSitemap: https://x.co/b.xml\n\nUser-agent: Googlebot\nDisallow: /');
  chk('robots.txt: both sitemaps, the rules for everyone, the crawl delay', rb.sitemaps.length === 2 && rb.crawlDelay === 3 && !SM.allowedBy(rb.rules, '/private/x') && SM.allowedBy(rb.rules, '/private/ok') && SM.allowedBy(rb.rules, '/public'));
  chk('a file named sitemap_index that is a plain list reads as a list (the test site)', SM.parseSitemap(sitemapOf('x.co', ['/a'])).type === 'urlset');
  chk('a real index reads as an index', SM.parseSitemap('<sitemapindex><sitemap><loc>https://x.co/s1.xml</loc></sitemap></sitemapindex>').locs[0] === 'https://x.co/s1.xml');

  // ── The spam rule, on real link data ──
  const samples = require(path.join(root, 'tests/fixtures/data/site-audit-spam-samples.json'));
  const toLink = l => ({ domain_from: l.d, url_from: l.u, anchor: l.a, spam_score: l.sp, domain_rank: l.top, external_links: l.ext });
  const counted = name => SP.countDomains(samples[name].map(toLink), DEFAULTS);
  const sh = counted('southamptonhomes.co.uk'), so = counted('solentlandscapes.co.uk'), gt = counted('greenthumb.co.uk');
  chk('Southampton Homes: 75 sites link to it and 3 are real', sh.all === 75 && sh.real === 3 && sh.real_domains.join() === 'localnow.net,trustaine.com,ukpavingtalkgroup.com', sh, '');
  chk('Solent Landscapes: 42 sites and none real, even the two junk sites scoring 20 and 35', so.all === 42 && so.real === 0, so, '');
  chk('Greenthumb: 161 sites and almost all real', gt.all === 161 && gt.real >= 158, gt.real, '>= 158');
  const gtReal = new Set(gt.real_domains);
  chk('real local newspaper directories scoring 50 to 55 stay real', ['basingstokegazette.co.uk', 'wirralglobe.co.uk', 'lancashiretelegraph.co.uk'].every(d => gtReal.has(d)), gt.junk_domains, '');
  const scoreOnly = SP.classifyLink({ domain_from: 'real.co.uk', spam_score: 60, external_links: 2, anchor: 'Visit' }, DEFAULTS);
  chk('a score at the limit is junk, with the reason', !scoreOnly.real && /Spam score 60/.test(scoreOnly.reasons[0]));
  chk('each junk rule gives a plain reason', /link farm/.test(SP.classifyLink({ domain_from: 'a.co.uk', spam_score: 1, external_links: 500 }, DEFAULTS).reasons[0]) && /selling links/.test(SP.classifyLink({ domain_from: 'a.co.uk', spam_score: 1, anchor: 'High Quality Dofollow Backlinks' }, DEFAULTS).reasons[0]) && /gambling/.test(SP.classifyLink({ domain_from: 'bestcasino.com', spam_score: 1 }, DEFAULTS).reasons[0]) && /link selling/.test(SP.classifyLink({ domain_from: 'a.com', url_from: 'https://a.com/pbn-directory/x', spam_score: 1 }, DEFAULTS).reasons[0]) && /\.shop/.test(SP.classifyLink({ domain_from: 'a.shop', spam_score: 1 }, DEFAULTS).reasons[0]));
  const ns = SP.classifyLink({ domain_from: 'a.co.uk', spam_score: null }, DEFAULTS);
  chk('a link with no score counts as real, marked as not scored', ns.real && ns.not_scored);
  chk('www and the bare domain are one site; one real link makes the site real', SP.countDomains([{ domain_from: 'www.a.co.uk', spam_score: 90 }, { domain_from: 'a.co.uk', spam_score: 0 }], DEFAULTS).real === 1 && SP.countDomains([{ domain_from: 'www.a.co.uk', spam_score: 90 }, { domain_from: 'a.co.uk', spam_score: 0 }], DEFAULTS).all === 1);
  chk('the threshold is a setting', SP.classifyLink({ domain_from: 'a.co.uk', spam_score: 40 }, { ...DEFAULTS, spam_threshold: 30 }).real === false);

  // ── What matters ──
  chk('an injected page is recognised by its address, title, script or path', !!M.injectedReason('/cheap-viagra') && !!M.injectedReason('/x', 'Online Casino Bonus') && !!M.injectedReason('/%E8%B4%AD%E4%B9%B0') && !!M.injectedReason('/ru/x'));
  chk('a trade page is not: slot drains, Welsh, plain services', !M.injectedReason('/slot-drains') && !M.injectedReason('/cy/gerddi') && !M.injectedReason('/services/landscaping', 'Landscaping Southampton'));

  // ── Issues ──
  const issues = IS.buildIssues({
    pages: [{ path: '/', facts: { tel: ['02381550183'], phones: [{ digits: '02381550155', raw: '02381 550155' }], postcodes: ['SO141AA'], other_hosts: [{ host: 'hh9.f77.myftpupload.com', where: 'logo' }, { host: 'www.facebook.com', where: 'link' }, { host: 'gmpg.org', where: 'link' }], http_links: 2, other_www_links: 1 } }],
    variants: [{ url: 'http://www.x.co.uk/', hops: 2, final: 'https://x.co.uk/' }, { url: 'https://x.co.uk/', hops: 0, final: 'https://x.co.uk/' }, { url: 'http://x.co.uk/', hops: 0, final: 'http://x.co.uk/' }, { url: 'https://www.x.co.uk/', error: 'ENOTFOUND' }],
    cv: { phone: '02381 550183', address: '1 High St, SO15 2BB' }, siteHost: 'x.co.uk', origin: 'https://x.co.uk',
  });
  const kinds = issues.map(i => i.kind);
  chk('the phone shown against its tap to call link, in plain English', issues.find(i => i.kind === 'phone_mismatch').text.includes('02381 550155') && issues.find(i => i.kind === 'phone_mismatch').text.includes('023 8155 0183'), issues[0], '');
  chk('the phone against the record, a different postcode, the logo on a temporary host', kinds.includes('phone_vs_record') && kinds.includes('address_vs_record') && issues.find(i => i.kind === 'non_live_host').text.startsWith('The logo links to hh9.f77.myftpupload.com'));
  chk('Facebook and other ordinary sites are not temporary hosts', issues.filter(i => i.kind === 'non_live_host').length === 1);
  chk('mixed links, a two hop form, a form that fails, a form showing a second copy', ['mixed_http', 'mixed_www', 'variant_chain', 'variant_fails'].every(k => kinds.includes(k)) && !issues.some(i => i.kind === 'variant_duplicate' && i.text.includes('https://x.co.uk/ shows')), kinds, '');
  chk('a staging subdomain of the site is a temporary host; the site itself is not', IS.isNonLive('staging.x.co.uk', 'x.co.uk') && !IS.isNonLive('x.co.uk', 'x.co.uk') && !IS.isNonLive('www.facebook.com', 'x.co.uk'));

  // ── The domain check: one field, live_domain ──
  const dc = domainCheck;
  chk('no live domain: the scan asks for it', /Add the live domain/.test(dc({ cv: {} }).stop));
  chk('a staging connection on another host is normal', dc({ cv: { live_domain: 'x.co.uk' }, connection: { url: 'https://staging.hostinger.com', staging: true } }).stop === '');
  chk('a connection not marked staging on another domain is a domain change: stop', /change of domain/.test(dc({ cv: { live_domain: 'x.co.uk' }, connection: { url: 'https://new.co.uk', staging: false } }).stop));
  chk('a live connection on the same domain is fine, www or not', dc({ cv: { live_domain: 'https://www.x.co.uk' }, connection: { url: 'https://x.co.uk', staging: false } }).stop === '');
  chk('the wizard having read another domain warns without stopping', dc({ cv: { live_domain: 'x.co.uk', _intake: { website: 'https://old.co.uk' } } }).stop === '' && /old\.co\.uk/.test(dc({ cv: { live_domain: 'x.co.uk', _intake: { website: 'https://old.co.uk' } } }).warnings[0]));

  const pool = await db();
  await ensureSiteAuditTables(pool);
  chk('the tables are safe to create twice', true);

  // ── A plain site: every source, merged ──
  {
    const site = { host: 'plain.co.uk', robots: 'User-agent: *\nDisallow: /private\nSitemap: https://plain.co.uk/sitemap_index.xml', twoHops: true, pages: {
      '/': pageHtml('Home', `${WORDS}<a href="/services">Services</a><a href="/contact/">Contact</a><a href="/private/x">Private</a><a href="/brochure.pdf">Brochure</a><a class="logo" href="https://temp.myftpupload.com/"><img src="/l.png"></a><a href="tel:01234567890">01234 567 891</a>`, { head: '<link href="/wp-content/x.css">' }),
      '/services': pageHtml('Services', `${WORDS}<a href="/">Home</a>`),
      '/contact': { html: pageHtml('Contact', WORDS) },
      '/brochure.pdf': { type: 'application/pdf', html: '%PDF' },
      '/sitemap_index.xml': { type: 'application/xml', html: sitemapOf('plain.co.uk', ['/', '/services', '/contact', '/orphan', '/gone']) },
      '/orphan': pageHtml('Orphan', WORDS),
      '/gone': { status: 410 },
      '/dead-with-links': { status: 404, html: 'Not found' },
    } };
    const data = {
      linked: [{ url: 'https://plain.co.uk/services', referring_domains: 2, backlinks: 2 }],
      links: [
        { to: 'https://plain.co.uk/services', from: 'localpaper.co.uk', score: 0, rank: 200 },
        { to: 'http://www.plain.co.uk/services/', from: 'www.localpaper.co.uk', score: 0, rank: 200 },
        { to: 'https://plain.co.uk/orphan', from: 'cralto.shop', score: 60, ext: 5000, anchor: 'Premium Tiered Link Building' },
        { to: 'https://plain.co.uk/orphan', from: 'websquemolan.com', score: 60, ext: 3000, anchor: 'High Quality Dofollow Backlinks DA 50' },
        { to: 'https://plain.co.uk/dead-with-links', from: 'oldsite.org.uk', score: 5, rank: 50 },
      ],
      keywords: [{ url: 'https://plain.co.uk/', keyword: 'plain landscaper', position: 8, etv: 3.2, volume: 100 }, { url: 'https://plain.co.uk/contact/', keyword: 'plain contact', position: 30, etv: 0.003 }],
    };
    const web = fakeWeb(site, data);
    const costs = [];
    const { view: v, audit, clientId } = await scanOf(pool, web, { live_domain: 'plain.co.uk', phone: '01234 567 890' }, { costs });
    const s = v.scan;
    chk('the scan finishes', s.status === 'done', s, 'done');
    chk('it says who it is, and only ever uses GET', [...web.calls.ua].every(a => /Copybot/.test(a)));
    chk('the platform comes from the site', s.platform === 'WordPress');
    chk('every source is on the URL that it found', byPath(v, '/services').sources.includes('crawl') && byPath(v, '/services').sources.includes('sitemap') && byPath(v, '/services').sources.includes('backlinks') && byPath(v, '/').sources.includes('rankings'), byPath(v, '/services').sources, '');
    chk('http, www and a trailing slash from DataForSEO land on one row', v.urls.filter(u => /services/.test(u.path)).length === 1 && byPath(v, '/contact').status_code === 200);
    chk('a URL only the links know about is fetched: an old dead URL with links', byPath(v, '/dead-with-links').status_code === 404 && byPath(v, '/dead-with-links').sources.join() === 'backlinks');
    chk('a page in the sitemap that nothing links to is an orphan', byPath(v, '/orphan').orphan && !byPath(v, '/services').orphan && s.summary.orphans === 2, s.summary, '');
    chk('a linked PDF has a row', byPath(v, '/brochure.pdf').kind === 'pdf' && byPath(v, '/brochure.pdf').status_code === 200);
    chk('robots.txt is respected: the URL is listed and not fetched', byPath(v, '/private/x').fetch_state === 'robots' && !web.calls.urls.some(u => u.includes('/private/')) && s.warnings.some(w => w.kind === 'robots'));
    chk('word count, H1, inlinks and status are on the row', byPath(v, '/services').word_count >= 120 && byPath(v, '/services').h1 === 'Services' && byPath(v, '/services').inlinks === 1 && byPath(v, '/').inlinks === 3, [byPath(v, '/services').inlinks, byPath(v, '/').inlinks], '');
    chk('all and real referring domains on the page', byPath(v, '/services').all_rd === 1 && byPath(v, '/services').real_rd === 1);
    chk('a page with one real link matters', byPath(v, '/services').matters && /real site/.test(byPath(v, '/services').matters_why[0]));
    chk('junk links alone never make a page matter, and the page says so', !byPath(v, '/orphan').matters && byPath(v, '/orphan').all_rd === 2 && byPath(v, '/orphan').real_rd === 0 && /all junk/.test(byPath(v, '/orphan').matters_why[0]), byPath(v, '/orphan'), '');
    chk('a ranking with estimated traffic above 0 matters', byPath(v, '/').matters && byPath(v, '/contact').matters);
    chk('an old dead URL with one real link still matters', byPath(v, '/dead-with-links').matters);
    chk('the benchmark says it is estimated', s.benchmark === 'estimated');
    chk('the top list is by estimated traffic, with no filler', byPath(v, '/').top20 && byPath(v, '/contact').top20 && !byPath(v, '/orphan').top20 && s.summary.top20 === 2, s.summary, '');
    chk('top searches come from DataForSEO', byPath(v, '/').top_searches[0].search === 'plain landscaper' && byPath(v, '/').top_searches[0].source === 'DataForSEO');
    chk('the logo on a temporary host and the phone mismatch are issues', s.issues.some(i => i.kind === 'non_live_host' && i.text.includes('logo')) && s.issues.some(i => i.kind === 'phone_mismatch'), s.issues, '');
    chk('an http www form taking two hops is an issue', s.issues.some(i => i.kind === 'variant_chain'), s.issues.map(i => i.kind), '');
    chk('the cost is on the scan and logged per call under site_scan', s.cost_usd > 0.06 && s.calls === 3 && costs.length === 3 && costs.every(c => c.kind === 'site_scan' && c.clientId === clientId), { cost: s.cost_usd, calls: s.calls, costs: costs.length }, '');
    const total = s.summary.total_urls;
    chk('a clear total URL count', total === v.urls.length && total === 8, total, 8);

    // Rework for nothing: settings and overrides
    const before = JSON.stringify(web.calls.dfs), urlCount = web.calls.urls.length;
    let w = await audit.saveSettings(clientId, { spam_threshold: 1, min_estimated_traffic: 1 });
    chk('a higher traffic minimum reworks the answer: 0.003 visits no longer matters', !byPath(w, '/contact').matters && byPath(w, '/').matters, byPath(w, '/contact'), '');
    w = await audit.saveSettings(clientId, {});
    chk('settings go back to the defaults', byPath(w, '/contact').matters && w.settings.spam_threshold === 60);
    w = await audit.setOverride(clientId, byPath(w, '/orphan').id, { matters: true, note: 'Ethan says so' });
    chk('a person can say a page matters', byPath(w, '/orphan').matters && byPath(w, '/orphan').override === true && /by hand/.test(byPath(w, '/orphan').matters_why[0]));
    w = await audit.setOverride(clientId, byPath(w, '/services').id, { matters: false });
    chk('or that it does not', !byPath(w, '/services').matters && byPath(w, '/services').override === false);
    w = await audit.setOverride(clientId, byPath(w, '/services').id, { matters: null });
    chk('and clear that', byPath(w, '/services').matters && byPath(w, '/services').override === null);
    chk('none of that bought or fetched anything', JSON.stringify(web.calls.dfs) === before && web.calls.urls.length === urlCount);
    const detail = await audit.urlDetail(clientId, byPath(w, '/orphan').id);
    chk('a URL shows its links, each with real or junk and why', detail.links.length === 2 && detail.links.every(l => !l.real && l.reasons.length) && detail.url.main_text.includes('word1') && detail.url.links_out === undefined, detail.links, '');

    // A hand answer survives a rescan
    await audit.start(clientId);
    await audit.wait(clientId);
    const again = await audit.view(clientId);
    chk('a rescan keeps the hand set answer', byPath(again, '/orphan').matters && byPath(again, '/orphan').override === true);
  }

  // ── Wix style ──
  {
    const site = { host: 'wixy.co.uk', pages: {
      '/': pageHtml('Wixy', `${WORDS}<a href="/post/our-new-patio">Post</a><a href="/copy-of-services">Services</a>`, { head: '<img src="https://static.wixstatic.com/media/a.jpg">' }),
      '/post/our-new-patio': pageHtml('Our new patio', WORDS),
      '/copy-of-services': pageHtml('Services', WORDS),
    } };
    const { view: v } = await scanOf(pool, fakeWeb(site, { keywords: [{ url: 'https://wixy.co.uk/post/our-new-patio', keyword: 'new patio', etv: 2 }] }), { live_domain: 'https://wixy.co.uk' });
    chk('Wix: the platform and its /post/ URLs', v.scan.platform === 'Wix' && byPath(v, '/post/our-new-patio').status_code === 200 && byPath(v, '/post/our-new-patio').matters);
  }

  // ── Hacked ──
  {
    const site = { host: 'hacked.co.uk', robots: 'Sitemap: https://hacked.co.uk/sitemap.xml', pages: {
      '/': pageHtml('Home', `${WORDS}<a href="/services">Services</a>`),
      '/services': pageHtml('Services', WORDS),
      '/sitemap.xml': { type: 'application/xml', html: sitemapOf('hacked.co.uk', ['/', '/services', '/cheap-viagra-online', '/%E8%B4%AD%E4%B9%B0/page', '/news/online-casino-bonus']) },
      '/cheap-viagra-online': pageHtml('Cheap Viagra Online', WORDS),
      '/%E8%B4%AD%E4%B9%B0/page': pageHtml('Page', WORDS),
      '/news/online-casino-bonus': pageHtml('Bonus', WORDS),
    } };
    const data = {
      links: [
        { to: 'https://hacked.co.uk/cheap-viagra-online', from: 'realdirectory.co.uk', score: 0 },
        { to: 'https://hacked.co.uk/services', from: 'betwinnermirror.com', score: 10, ext: 3 },
      ],
      keywords: [{ url: 'https://hacked.co.uk/cheap-viagra-online', keyword: 'cheap viagra', etv: 50 }, { url: 'https://hacked.co.uk/services', keyword: 'buy viagra', etv: 9 }],
    };
    const { view: v } = await scanOf(pool, fakeWeb(site, data), { live_domain: 'hacked.co.uk' });
    chk('an injected page does not matter even with rankings and a clean link, and says why', !byPath(v, '/cheap-viagra-online').matters && byPath(v, '/cheap-viagra-online').injected && /Looks injected/.test(byPath(v, '/cheap-viagra-online').matters_why[0]), byPath(v, '/cheap-viagra-online'), '');
    chk('foreign script and casino paths are injected too', byPath(v, '/%E8%B4%AD%E4%B9%B0/page').injected && byPath(v, '/news/online-casino-bonus').injected);
    chk('injected pages stay off the top list', !v.urls.some(u => u.top20 && u.injected));
    chk('a real page with only junk signals does not matter: a pharma keyword and a betting site link', !byPath(v, '/services').matters && byPath(v, '/services').real_rd === 0 && byPath(v, '/services').est_traffic === 0, byPath(v, '/services'), '');
  }

  // ── A redirect chain ──
  {
    const site = { host: 'chain.co.uk', pages: {
      '/': pageHtml('Home', `${WORDS}<a href="/old">Old</a><a href="/slash/">Slash</a><a href="/elsewhere">Elsewhere</a><a href="/loop-a">Loop</a>`),
      '/old': { status: 301, location: '/older' },
      '/older': { status: 302, location: 'https://chain.co.uk/new' },
      '/new': pageHtml('New', WORDS),
      '/slash': pageHtml('Slash', WORDS),
      '/elsewhere': { status: 301, location: 'https://another-site.co.uk/' },
      '/loop-a': { status: 301, location: '/loop-b' },
      '/loop-b': { status: 301, location: '/loop-a' },
    } };
    const web = fakeWeb(site);
    const { view: v } = await scanOf(pool, web, { live_domain: 'chain.co.uk' });
    const old = byPath(v, '/old');
    chk('a chain records every hop and where it ends', old.status_code === 301 && old.redirect_target === 'https://chain.co.uk/new' && old.redirect_chain.map(c => c.status).join() === '301,302,200', old, '');
    chk('the page at the end of the chain gets its own row', byPath(v, '/new').status_code === 200 && byPath(v, '/new').sources.includes('crawl'));
    chk('a redirect off the site is recorded and never followed', byPath(v, '/elsewhere').redirect_target === 'https://another-site.co.uk/' && !web.calls.urls.some(u => u.includes('another-site')));
    chk('a loop is recorded and stops', byPath(v, '/loop-a').status_code === 301 && !!byPath(v, '/loop-a').redirect_target);
  }

  // ── A JS only page ──
  {
    const site = { host: 'spa.co.uk', pages: { '/': '<html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>' } };
    const { view: v } = await scanOf(pool, fakeWeb(site), { live_domain: 'spa.co.uk' });
    chk('almost no text warns that the crawl may have missed pages', v.scan.warnings.some(w => w.kind === 'js_only' && /may have missed pages/.test(w.text)) && byPath(v, '/').low_text, v.scan.warnings, '');
  }

  // ── A bot challenge homepage ──
  {
    const site = { host: 'walled.co.uk', pages: { '/': { status: 503, html: '<html><title>Just a moment...</title><body>Checking your browser</body></html>' }, '/services': pageHtml('Services', WORDS) } };
    const web = fakeWeb(site, { keywords: [{ url: 'https://walled.co.uk/services', keyword: 'walled services', etv: 4 }], links: [{ to: 'https://walled.co.uk/services', from: 'paper.co.uk', score: 0 }] });
    const { view: v } = await scanOf(pool, web, { live_domain: 'walled.co.uk' });
    chk('a challenge page warns plainly', v.scan.status === 'done' && v.scan.warnings.some(w => w.kind === 'bot_block' && /blocked/.test(w.text)), v.scan.warnings, '');
    chk('no further pages are requested', !web.calls.urls.some(u => u.includes('/services')) && byPath(v, '/services').fetch_state === 'blocked');
    chk('DataForSEO still says what matters', byPath(v, '/services').matters && byPath(v, '/services').real_rd === 1);
    chk('the platform is left unknown rather than guessed', !v.scan.platform);
  }

  // ── A Search Console file ──
  {
    const site = { host: 'gsc.co.uk', pages: { '/': pageHtml('Home', `${WORDS}<a href="/a">A</a><a href="/b">B</a><a href="/c">C</a>`), '/a': pageHtml('A', WORDS), '/b': pageHtml('B', WORDS), '/c': pageHtml('C', WORDS), '/only-in-gsc': pageHtml('Only', WORDS) } };
    const web = fakeWeb(site, { keywords: [{ url: 'https://gsc.co.uk/c', keyword: 'c estimated', etv: 90 }, { url: 'https://gsc.co.uk/a', keyword: 'a estimated', etv: 1 }] });
    const { view: first, audit, clientId } = await scanOf(pool, web, { live_domain: 'gsc.co.uk' });
    chk('with no file the top is by estimated traffic', first.scan.benchmark === 'estimated' && byPath(first, '/c').top20_why.includes('Number 1'));
    const zip = new AdmZip();
    zip.addFile('Pages.csv', Buffer.from('Top pages,Clicks,Impressions,CTR,Position\nhttps://gsc.co.uk/a,120,3000,4%,6.2\nhttps://www.gsc.co.uk/b/,3,100,3%,12\nhttps://gsc.co.uk/only-in-gsc,1,10,10%,20\n'));
    zip.addFile('Queries.csv', Buffer.from('Top queries,Clicks,Impressions,CTR,Position\nlandscaper,50,900,5%,4\n'));
    zip.addFile('Filters.csv', Buffer.from('Filter,Value\nSearch type,Web\nDate,Last 3 months\n'));
    const r = await audit.uploadSearchConsole(clientId, { zip_base64: zip.toBuffer().toString('base64'), filename: 'gsc.zip' });
    await audit.wait(clientId);
    const v = await audit.view(clientId);
    chk('both files are read from Google\'s zip', r.saved.map(x => x.kind).sort().join() === 'pages,queries');
    chk('the benchmark moves to Search Console', v.scan.benchmark === 'search_console');
    chk('clicks land on the right rows, www and slash aside', byPath(v, '/a').clicks === 120 && byPath(v, '/b').clicks === 3 && byPath(v, '/b').matters, byPath(v, '/b'), '');
    chk('the top list is now by clicks, not estimates', byPath(v, '/a').top20_why === 'Number 1 by clicks', byPath(v, '/a').top20_why, '');
    chk('a URL only the file knows about is fetched without buying anything again', byPath(v, '/only-in-gsc').status_code === 200 && byPath(v, '/only-in-gsc').sources.join() === 'search_console' && web.calls.dfs['backlinks/backlinks/live'] === 1);
    chk('three months is called out against the 12 month rule', v.scan.warnings.some(w => w.kind === 'gsc_period' && /Last 3 months/.test(w.text)), v.scan.warnings, '');
    chk('a queries file with no pages says top searches stay with DataForSEO', v.scan.warnings.some(w => w.kind === 'gsc_queries') && byPath(v, '/a').top_searches[0].source === 'DataForSEO', v.scan.warnings, '');
    await audit.uploadSearchConsole(clientId, { csv: 'Query,Page,Clicks,Impressions,CTR,Position\nbest a,https://gsc.co.uk/a,10,100,10%,3\nother a,https://gsc.co.uk/a,20,200,10%,4\n', filename: 'both.csv' });
    await audit.wait(clientId);
    const both = await audit.view(clientId);
    chk('a file with queries and pages gives the page its own top searches, most clicks first', byPath(both, '/a').top_searches[0].search === 'other a' && byPath(both, '/a').top_searches[0].source === 'Search Console', byPath(both, '/a').top_searches, '');
    let bad = '';
    try { await audit.uploadSearchConsole(clientId, { csv: 'not,a,search,console,file\n1,2,3,4,5\n' }); } catch (e) { bad = e.message; }
    chk('a file that is not Search Console is refused with the reason', /column/.test(bad), bad, '');
  }

  // ── Limits, failures, restarts ──
  {
    const pages = { '/': pageHtml('Home', `${WORDS}${Array.from({ length: 30 }, (_, i) => `<a href="/p${i}">P${i}</a>`).join('')}`) };
    for (let i = 0; i < 30; i++) pages[`/p${i}`] = pageHtml(`P${i}`, WORDS);
    pages['/linked-deep'] = pageHtml('Linked deep', WORDS);
    const web = fakeWeb({ host: 'big.co.uk', pages }, { links: [{ to: 'https://big.co.uk/linked-deep', from: 'paper.co.uk', score: 0 }] });
    const { view: v } = await scanOf(pool, web, { live_domain: 'big.co.uk' }, { settings: { page_cap: 5 } });
    chk('the page cap stops the crawl and warns', v.scan.warnings.some(w => w.kind === 'page_cap') && v.urls.some(u => u.fetch_state === 'cap'), v.scan.warnings, '');
    chk('a URL with signals is fetched before the cap, ahead of what the pages link to', byPath(v, '/linked-deep').fetch_state === 'done');
    chk('capped URLs are still counted in the total', v.scan.summary.total_urls === 32 && v.scan.summary.not_fetched > 0, v.scan.summary, '');
  }
  {
    const links = Array.from({ length: 2500 }, (_, i) => ({ to: 'https://many.co.uk/', from: `site${i}.co.uk`, score: 0 }));
    const web = fakeWeb({ host: 'many.co.uk', pages: { '/': pageHtml('Home', WORDS), '/past-the-cap': pageHtml('Past', WORDS) } }, { links, linked: [{ url: 'https://many.co.uk/', referring_domains: 2500 }, { url: 'https://many.co.uk/past-the-cap', referring_domains: 3 }] });
    const { view: v } = await scanOf(pool, web, { live_domain: 'many.co.uk' }, { settings: { backlink_row_cap: 1000 } });
    chk('the link list stops at its row limit and warns', web.calls.dfs['backlinks/backlinks/live'] === 1 && v.scan.warnings.some(w => w.kind === 'source_capped' && /backlinks/.test(w.text)), v.scan.warnings, '');
    chk('a page the cut off list did not reach counts as mattering until checked', byPath(v, '/past-the-cap').matters && /cut off/.test(byPath(v, '/past-the-cap').matters_why[0]));
  }
  {
    const links = Array.from({ length: 2500 }, (_, i) => ({ to: 'https://budget.co.uk/', from: `site${i}.co.uk`, score: 0 }));
    const web = fakeWeb({ host: 'budget.co.uk', pages: { '/': pageHtml('Home', WORDS) } }, { links, keywords: [{ url: 'https://budget.co.uk/', keyword: 'k', etv: 1 }] });
    const { view: v } = await scanOf(pool, web, { live_domain: 'budget.co.uk' }, { settings: { max_usd: 0.12 } });
    chk('the spending limit is never passed, and the scan says what it left out', v.scan.cost_usd <= 0.12 && v.scan.warnings.some(w => w.kind === 'source_capped'), { cost: v.scan.cost_usd, w: v.scan.warnings }, '');
  }
  {
    const web = fakeWeb({ host: 'flaky.co.uk', pages: { '/': pageHtml('Home', WORDS) } }, { fail: { 'dataforseo_labs/google/ranked_keywords/live': 'Internal Error' }, links: [{ to: 'https://flaky.co.uk/', from: 'paper.co.uk', score: 0 }] });
    const costs = [];
    const { view: v, audit, clientId } = await scanOf(pool, web, { live_domain: 'flaky.co.uk' }, { costs });
    chk('a source that fails is shown, and the rest of the scan still finishes', v.scan.status === 'done' && v.scan.warnings.some(w => w.kind === 'source_failed' && /rankings/.test(w.text) && /Internal Error/.test(w.text)), v.scan.warnings, '');
    const paid = web.calls.dfs['backlinks/backlinks/live'];
    await audit.resume(clientId);
    await audit.wait(clientId);
    chk('Resume retries only what failed: the links already paid for are not bought again', web.calls.dfs['backlinks/backlinks/live'] === paid && web.calls.dfs['dataforseo_labs/google/ranked_keywords/live'] === 2);
  }
  {
    // A restart: the crawl dies part way (the database holds what was done)
    const site = { host: 'restart.co.uk', pages: { '/': pageHtml('Home', `${WORDS}<a href="/a">A</a><a href="/b">B</a>`), '/a': pageHtml('A', WORDS), '/b': pageHtml('B', WORDS) } };
    const web = fakeWeb(site, { links: [{ to: 'https://restart.co.uk/a', from: 'paper.co.uk', score: 0 }] });
    const { rows } = await pool.query(`INSERT INTO clients (name) VALUES ('Restart') RETURNING id`);
    const clientId = rows[0].id;
    let dropAfter = 2, seen = 0;
    const impl = async (url, init) => {
      if (!String(url).includes('dataforseo') && /restart\.co\.uk\/(a|b)$/.test(String(url)) && ++seen > 0 && dropAfter-- <= 1) { const e = new Error('The server restarted'); e.fatal = true; throw e; }
      return web.impl(url, init);
    };
    const make = fetchImpl => createSiteAudit({ pool, loadValues: async () => ({ live_domain: 'restart.co.uk' }), env, fetchImpl, sleep: async () => {}, log: quiet, lookup: async () => ({ address: '93.184.216.34' }), retryDelays: [] });
    // A scan row left running by a process that has gone
    const dead = make(impl);
    await dead.start(clientId);
    await dead.wait(clientId);
    await pool.query(`UPDATE site_scans SET status = 'running' WHERE client_id = $1`, [clientId]);
    await pool.query(`UPDATE site_scan_urls SET fetch_state = 'pending' WHERE client_id = $1 AND fetch_state = 'failed'`, [clientId]);
    const paid = { ...web.calls.dfs };
    const after = make(web.impl);
    const n = await after.recover();
    let v = await after.view(clientId);
    chk('after a restart a running scan shows as interrupted, with the reason', n >= 1 && v.scan.status === 'interrupted' && /restarted/.test(v.scan.error), v.scan, '');
    await after.resume(clientId);
    await after.wait(clientId);
    v = await after.view(clientId);
    chk('Resume finishes the pages left and pays DataForSEO nothing more', v.scan.status === 'done' && byPath(v, '/a').status_code === 200 && byPath(v, '/b').status_code === 200 && JSON.stringify(web.calls.dfs) === JSON.stringify(paid), { dfs: web.calls.dfs, paid, urls: v.urls.map(u => [u.path, u.status_code]) }, '');
  }

  // ── A GoHighLevel site, copying edensedge-landscaping.co.uk's pattern (5 Nov): 404 at /, homepage at /home, no sitemap ──
  const GHL_HEAD = '<img src="https://images.leadconnectorhq.com/image/a.jpg"><link href="https://stcdn.leadconnectorhq.com/x.css">';
  const svcLinks = ['/hedge-trimming', '/fencing-installation', '/lawn-mowing-and-maintenance'];
  const ghlPages = () => ({
    '/home': pageHtml('Home - Test Landscaping', `${WORDS}${svcLinks.map(p => `<a href="${p}">${p}</a>`).join('')}<a href="/contact">Contact</a>`, { head: GHL_HEAD, nav: '<a href="/home">Home</a>' }),
    '/hedge-trimming': pageHtml('Hedge trimming', WORDS, { head: GHL_HEAD, nav: '<a href="/home">Home</a>' }),
    '/fencing-installation': pageHtml('Fencing', WORDS, { head: GHL_HEAD, nav: '<a href="/home">Home</a>' }),
    '/lawn-mowing-and-maintenance': pageHtml('Lawn mowing', WORDS, { head: GHL_HEAD, nav: '<a href="/home">Home</a>' }),
  });
  {
    const site = { host: 'ghl.co.uk', robots: '', pages: ghlPages() };
    const { view: v } = await scanOf(pool, fakeWeb(site, { keywords: [{ url: 'https://ghl.co.uk/hedge-trimming', keyword: 'hedge trimming', etv: 2 }] }), { live_domain: 'ghl.co.uk' });
    const s = v.scan;
    chk('GHL: the platform comes from the page', s.platform === 'GoHighLevel' && s.platform_evidence.length > 0, [s.platform, s.platform_evidence], '');
    chk('GHL: /home is recorded as the old homepage, found at a common address', s.summary.homepage.path === '/home' && s.summary.homepage.how === 'common path' && s.summary.homepage.root_status === 404 && s.summary.old_homepage === '/home', s.summary.homepage, '');
    chk('GHL: / is listed with its 404', byPath(v, '/').status_code === 404, byPath(v, '/').status_code, 404);
    chk('GHL: the crawl goes on from /home and reads every page it links to', ['/home', ...svcLinks].every(p => byPath(v, p) && byPath(v, p).status_code === 200 && byPath(v, p).word_count >= 120), v.urls.map(u => [u.path, u.status_code]), '');
    chk('GHL: a dead link it finds is listed too', byPath(v, '/contact').status_code === 404);
    chk('GHL: internal links are counted', byPath(v, '/home').inlinks === 3 && byPath(v, '/hedge-trimming').inlinks === 1, [byPath(v, '/home').inlinks, byPath(v, '/hedge-trimming').inlinks], '');
    const kinds = s.warnings.filter(w => w.loud).map(w => w.kind);
    chk('GHL: a loud warning that / answers 404, naming the homepage it found', s.warnings.some(w => w.kind === 'root_not_page' && w.loud && /answers 404/.test(w.text) && /\/home/.test(w.text)), s.warnings, '');
    chk('GHL: a loud warning that there is no sitemap', s.warnings.some(w => w.kind === 'sitemap_missing' && w.loud), kinds, '');
    chk('GHL: it does not call itself complete', s.summary.complete === false, s.summary.complete, false);
    chk('GHL: the crawl counts are on the scan', s.summary.crawl.reached === 4, s.summary.crawl, '');
  }
  // The same site with a Page Map: a 301 from the old homepage to /
  {
    const site = { host: 'ghl2.co.uk', robots: '', pages: ghlPages() };
    const pages = [{ page_key: 'homepage:/', type: 'homepage', title: 'Home', slug: '/', h1: '', applies: true, info: { phase: 1 } }, { page_key: 'category:/gardener', type: 'category', title: 'Gardener', slug: '/gardener', h1: '', applies: true, info: { primary: true, phase: 1 } }];
    const { rows } = await pool.query(`INSERT INTO clients (name) VALUES ('GHL') RETURNING id`);
    const a = createSiteAudit({ pool, loadValues: async () => ({ live_domain: 'ghl2.co.uk' }), env, fetchImpl: fakeWeb(site).impl, sleep: async () => {}, log: quiet, lookup: async () => ({ address: '93.184.216.34' }), loadPages: async () => ({ rows: pages, baseTown: '' }), retryDelays: [] });
    await a.start(rows[0].id); await a.wait(rows[0].id);
    const v = await a.view(rows[0].id);
    const home = byPath(v, '/home').plan;
    chk('GHL map: the old homepage gets a 301 to /', home.decision === 'Reuse' && home.redirect_type === '301' && home.new_url === '/' && /old site's homepage/.test(home.reason), home, '');
    chk('GHL map: / is the new homepage, kept, saying what happened', byPath(v, '/').plan.decision === 'Keep' && /answers 404/.test(byPath(v, '/').plan.reason) && /\/home/.test(byPath(v, '/').plan.reason), byPath(v, '/').plan, '');
    const text = await a.pageContent(rows[0].id, '/');
    chk('GHL map: its text is saved for the new homepage\'s page view', text.pages.length === 1 && text.pages[0].path === '/home', text.pages.map(p => p.path), '');
    const Val = require(path.join(root, 'site-audit/validator.js'));
    const check = Val.mapCheck(v);
    chk('GHL map: the validator doesn\'t warn about the old homepage going to the homepage', !check.warn.some(i => /\/home goes to the homepage/.test(i.text)), check.warn, '');
    chk('GHL map: it does warn that the scan may be incomplete', check.warn.some(i => /may be incomplete/.test(i.text)), check.warn, '');
  }
  // / redirects to the homepage
  {
    const site = { host: 'moved.co.uk', robots: '', pages: { ...ghlPages(), '/': { status: 301, location: '/home' } } };
    const { view: v } = await scanOf(pool, fakeWeb(site), { live_domain: 'moved.co.uk' });
    chk('redirect: / redirecting to the homepage is followed and recorded', v.scan.summary.homepage.path === '/home' && v.scan.summary.homepage.how === 'redirect' && byPath(v, '/').status_code === 301 && byPath(v, '/home').status_code === 200, v.scan.summary.homepage, '');
    chk('redirect: it says so, and the crawl carries on from it', v.scan.warnings.some(w => w.kind === 'homepage_moved') && byPath(v, '/hedge-trimming').status_code === 200, v.scan.warnings, '');
  }
  // No common address: the most linked URL from DataForSEO
  {
    const pages = { '/landscaping-services': pageHtml('Our Landscaping', `${WORDS}<a href="/a-page">A page</a>`), '/a-page': pageHtml('A page', WORDS), '/little': pageHtml('Little', WORDS) };
    const data = { links: [{ to: 'https://nocommon.co.uk/little', from: 'one.co.uk', score: 0 }, { to: 'https://nocommon.co.uk/landscaping-services', from: 'paper.co.uk', score: 0 }, { to: 'https://nocommon.co.uk/landscaping-services', from: 'club.co.uk', score: 0 }, { to: 'https://nocommon.co.uk/landscaping-services', from: 'cralto.shop', score: 60, ext: 5000 }] };
    const web = fakeWeb({ host: 'nocommon.co.uk', robots: '', pages }, data);
    const { view: v } = await scanOf(pool, web, { live_domain: 'nocommon.co.uk' });
    chk('most linked: the common addresses were tried first', web.calls.urls.some(u => u.endsWith('/home')) && web.calls.urls.some(u => u.endsWith('/index')), web.calls.urls.slice(0, 12), '');
    chk('most linked: the URL most real sites link to is the old homepage', v.scan.summary.homepage.path === '/landscaping-services' && v.scan.summary.homepage.how === 'most linked', v.scan.summary.homepage, '');
    chk('most linked: the warning says how it was found, to check', v.scan.warnings.some(w => w.kind === 'root_not_page' && /most sites link to/.test(w.text) && /Check that's right/.test(w.text)), v.scan.warnings, '');
    chk('most linked: the crawl follows its links', byPath(v, '/a-page').status_code === 200);
  }
  // A /home that says it isn't there
  {
    const pages = { '/home': '<html><head><title>404 - Page Not Found</title></head><body><h1>Page not found</h1></body></html>', '/real-home': pageHtml('Real', WORDS) };
    const { view: v } = await scanOf(pool, fakeWeb({ host: 'soft.co.uk', robots: '', pages }, { links: [{ to: 'https://soft.co.uk/real-home', from: 'paper.co.uk', score: 0 }] }), { live_domain: 'soft.co.uk' });
    chk('a /home answering 200 with "page not found" isn\'t a homepage', v.scan.summary.homepage.path === '/real-home', v.scan.summary.homepage, '');
  }
  // Nothing anywhere
  {
    const { view: v } = await scanOf(pool, fakeWeb({ host: 'nothing.co.uk', robots: '', pages: {} }), { live_domain: 'nothing.co.uk' });
    chk('no homepage at all: loud, not silent, and not complete', v.scan.status === 'done' && v.scan.summary.homepage.how === 'none' && v.scan.warnings.some(w => w.kind === 'no_homepage' && w.loud && /Find the homepage by hand/.test(w.text)) && v.scan.summary.complete === false, v.scan.warnings, '');
  }
  // Every known URL seeds the crawl, and what they link to is followed
  {
    const pages = ghlPages();
    pages['/only-in-sitemap'] = pageHtml('Sitemap', `${WORDS}<a href="/linked-from-sitemap-page">x</a>`);
    pages['/linked-from-sitemap-page'] = pageHtml('Linked', WORDS);
    pages['/only-ranked'] = pageHtml('Ranked', `${WORDS}<a href="/linked-from-ranked-page">x</a>`);
    pages['/linked-from-ranked-page'] = pageHtml('Linked 2', WORDS);
    pages['/only-backlinked'] = pageHtml('Backlinked', `${WORDS}<a href="/linked-from-backlinked-page">x</a>`);
    pages['/linked-from-backlinked-page'] = pageHtml('Linked 3', WORDS);
    pages['/only-in-gsc'] = pageHtml('GSC', `${WORDS}<a href="/linked-from-gsc-page">x</a>`);
    pages['/linked-from-gsc-page'] = pageHtml('Linked 4', WORDS);
    pages['/sitemap.xml'] = { type: 'application/xml', html: sitemapOf('seeds.co.uk', ['/only-in-sitemap']) };
    const web = fakeWeb({ host: 'seeds.co.uk', robots: '', pages }, { keywords: [{ url: 'https://seeds.co.uk/only-ranked', keyword: 'k', etv: 1 }], links: [{ to: 'https://seeds.co.uk/only-backlinked', from: 'paper.co.uk', score: 0 }] });
    const { rows } = await pool.query(`INSERT INTO clients (name) VALUES ('Seeds') RETURNING id`);
    const a = createSiteAudit({ pool, loadValues: async () => ({ live_domain: 'seeds.co.uk' }), env, fetchImpl: web.impl, sleep: async () => {}, log: quiet, lookup: async () => ({ address: '93.184.216.34' }), retryDelays: [] });
    await a.uploadSearchConsole(rows[0].id, { csv: 'Top pages,Clicks,Impressions,CTR,Position\nhttps://seeds.co.uk/only-in-gsc,4,50,8%,3\n', filename: 'p.csv' });
    await a.start(rows[0].id); await a.wait(rows[0].id);
    const v = await a.view(rows[0].id);
    for (const [p, from] of [['/only-in-sitemap', 'sitemap'], ['/only-ranked', 'rankings'], ['/only-backlinked', 'backlinks'], ['/only-in-gsc', 'search_console']]) chk(`seeds: ${p} is read, found by ${from}`, byPath(v, p).status_code === 200 && byPath(v, p).sources.includes(from) && byPath(v, p).word_count > 100, byPath(v, p), '');
    for (const p of ['/linked-from-sitemap-page', '/linked-from-ranked-page', '/linked-from-backlinked-page', '/linked-from-gsc-page']) chk(`seeds: ${p}, reachable only from a seeded page, is crawled too`, byPath(v, p) && byPath(v, p).status_code === 200 && byPath(v, p).sources.includes('crawl'), byPath(v, p), '');
  }
  // The crawl finding far fewer pages than the other sources
  {
    const pages = { '/': pageHtml('Home', WORDS, { nav: '' }) };
    const links = [];
    for (let i = 0; i < 8; i++) { pages[`/known-${i}`] = pageHtml(`Known ${i}`, WORDS, { nav: '' }); links.push({ to: `https://short.co.uk/known-${i}`, from: `s${i}.co.uk`, score: 0 }); }
    pages['/sitemap.xml'] = { type: 'application/xml', html: sitemapOf('short.co.uk', ['/']) };
    const { view: v } = await scanOf(pool, fakeWeb({ host: 'short.co.uk', robots: '', pages }, { links }), { live_domain: 'short.co.uk' });
    const w = v.scan.warnings.find(x => x.kind === 'crawl_short');
    chk('crawl short: a loud warning with the numbers', w && w.loud && /reached 1 page/.test(w.text) && /know of 9 live pages/.test(w.text) && /8 of them not linked/.test(w.text), v.scan.warnings, '');
    chk('crawl short: not complete, though it found them all another way', v.scan.summary.complete === false && v.scan.summary.crawl.reached === 1 && v.scan.summary.crawl.known_elsewhere === 9, v.scan.summary.crawl, '');
  }
  // A healthy site says nothing
  {
    const site = { host: 'healthy.co.uk', robots: 'Sitemap: https://healthy.co.uk/sitemap.xml', pages: { '/': pageHtml('Home', `${WORDS}<a href="/a">A</a><a href="/b">B</a>`), '/a': pageHtml('A', WORDS), '/b': pageHtml('B', WORDS), '/sitemap.xml': { type: 'application/xml', html: sitemapOf('healthy.co.uk', ['/', '/a', '/b']) } } };
    const web = fakeWeb(site);
    const { view: v } = await scanOf(pool, web, { live_domain: 'healthy.co.uk' });
    chk('healthy: no loud warnings, and it counts as complete', v.scan.summary.complete === true && !v.scan.warnings.some(w => w.loud) && v.scan.summary.homepage.path === '/' && v.scan.summary.homepage.how === 'root' && !v.scan.summary.old_homepage, v.scan.warnings, '');
    chk('healthy: no common address is tried when / is a page', !web.calls.urls.some(u => u.endsWith('/home')), web.calls.urls, '');
  }
  // The platform
  chk('platform: GoHighLevel from its files', H.detectPlatform(`<html>${GHL_HEAD}</html>`).platform === 'GoHighLevel');
  chk('platform: a LeadConnector chat widget doesn\'t make a site GoHighLevel', H.detectPlatform('<script src="https://widgets.leadconnectorhq.com/loader.js"></script>').platform === 'Other' && H.detectPlatform('<link href="/wp-content/a.css"><img src="https://images.leadconnectorhq.com/a.jpg">').platform === 'WordPress');
  chk('platform: the GoHighLevel patterns are noted in url-patterns.json', !!require(path.join(root, 'site-audit/url-patterns.json')).platforms.GoHighLevel.note);
  chk('GHL preview and widget addresses aren\'t crawled', !t.crawlable('https://example.co.uk/widget/form/abc') && !t.crawlable('https://example.co.uk/v2/preview/abc'));

  // ── The real run on the test site, replayed: nothing spent, nothing fetched ──
  {
    const { replayer } = require(path.join(root, 'site-audit/replay.js'));
    const recorded = path.join(root, 'tests/fixtures/data/site-audit-southamptonhomes-recorded.json');
    const { view: v } = await scanOf(pool, { impl: replayer(recorded) }, { live_domain: 'https://southamptonhomes.co.uk' });
    const s = v.scan, kinds = s.issues.map(i => i.kind);
    chk('test site: WordPress from the site itself, not DataForSEO\'s "methode"', s.platform === 'WordPress', s.platform, 'WordPress');
    chk('test site: the phone mismatch is found on all 4 pages', s.issues.find(i => i.kind === 'phone_mismatch').page_count === 4 && /02381 550155/.test(s.issues.find(i => i.kind === 'phone_mismatch').text) && /023 8155 0183/.test(s.issues.find(i => i.kind === 'phone_mismatch').text), s.issues, '');
    chk('test site: the temporary host is found on all 4 pages', s.issues.find(i => i.kind === 'non_live_host').page_count === 4 && /hh9\.f77\.myftpupload\.com/.test(s.issues.find(i => i.kind === 'non_live_host').text), s.issues, '');
    chk('test site: http://www taking two hops is found', kinds.includes('variant_chain'), kinds, '');
    chk('test site: 4 pages, with text read from each', s.summary.pages === 4 && ['/', '/contact', '/inspiration', '/garden-design-service'].every(p => byPath(v, p).status_code === 200 && byPath(v, p).word_count > 0), s.summary, '');
    chk('test site: its linked gallery images are counted and told apart', s.summary.media === 50 && s.summary.total_urls === 54, s.summary, '');
    chk('test site: 75 sites link to it and 3 are real', s.summary.all_domains === 75 && s.summary.real_domains === 3 && byPath(v, '/').all_rd === 75 && byPath(v, '/').real_rd === 3, s.summary, '');
    chk('test site: the homepage and /contact matter on rankings', byPath(v, '/').matters && byPath(v, '/contact').matters && /Ranks for 1 search, under 0\.01/.test(byPath(v, '/contact').matters_why[0]));
    chk('test site: pages with no signals do not matter, and nothing matters on junk links', !byPath(v, '/inspiration').matters && !byPath(v, '/garden-design-service').matters && s.summary.matters === 2, s.summary, '');
    chk('test site: the benchmark is the estimated one, and the top searches are stored', s.benchmark === 'estimated' && byPath(v, '/').top_searches.length === 5 && byPath(v, '/').top_searches[0].search === 'landscaping southampton', byPath(v, '/').top_searches, '');
    chk('test site: the measured cost', s.cost_usd > 0.06 && s.cost_usd < 0.07, s.cost_usd, 0.0644);
    chk('test site: no warnings, because nothing blocked it', !s.warnings.length, s.warnings, []);
  }

  // ── Refusals ──
  {
    const { rows } = await pool.query(`INSERT INTO clients (name) VALUES ('Refuse') RETURNING id`);
    const clientId = rows[0].id;
    const make = (cv, extra = {}) => createSiteAudit({ pool, loadValues: async () => cv, env, fetchImpl: fakeWeb({ host: 'x.co.uk', pages: { '/': 'x' } }).impl, sleep: async () => {}, log: quiet, lookup: async () => ({ address: '93.184.216.34' }), ...extra });
    const fails = async a => { try { await a.start(clientId); return ''; } catch (e) { return e.message; } };
    chk('no live domain: no scan', /Add the live domain/.test(await fails(make({}))));
    chk('no DataForSEO login: no scan, with the reason', /DataForSEO is not set up/.test(await fails(make({ live_domain: 'x.co.uk' }, { env: {} }))));
    chk('a domain change: no scan', /change of domain/.test(await fails(make({ live_domain: 'x.co.uk' }, { getConnection: async () => ({ url: 'https://new.co.uk', staging: false }) }))));
    chk('a domain pointing at a private address: no scan', /private address/.test(await fails(make({ live_domain: 'x.co.uk' }, { lookup: async () => ({ address: '192.168.1.5' }) }))));
    chk('a domain that does not exist: no scan, with the reason', /Couldn't find/.test(await fails(make({ live_domain: 'x.co.uk' }, { lookup: async () => { throw Object.assign(new Error('nope'), { code: 'ENOTFOUND' }); } }))));
    const unreachable = fakeWeb({ host: 'down.co.uk', pages: { '/': { throws: 'ECONNREFUSED' } } });
    const a = make({ live_domain: 'down.co.uk' }, { fetchImpl: unreachable.impl });
    await a.start(clientId);
    await a.wait(clientId);
    const v = await a.view(clientId);
    chk('a site that cannot be reached fails plainly, and nothing is bought', v.scan.status === 'failed' && /Couldn't reach/.test(v.scan.error) && !Object.keys(unreachable.calls.dfs).length, v.scan, '');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
