'use strict';

// ── Scan old site (existing-site clients) ─────────────────────────────────────────
// A background job that builds one URL inventory from every source and records which source
// found each URL: the crawl, robots.txt and the sitemaps, DataForSEO's rankings and backlinks, and
// a Search Console file if one was uploaded. Every URL any source found is fetched once, the
// URLs with signals first, so a page cap never drops one. Read only: nothing here writes to a site.
//
// A restart marks a running scan interrupted. Resume carries on from what is saved: the
// DataForSEO rows already paid for are kept and the pages still pending are fetched.
// analyse() works out the spam counts, what matters, the top 20 and the issues from the saved
// rows, so a setting or an override changes the answer without spending anything.
//
// The live domain is the only domain field: the scan reads Client Values live_domain. A connection
// that is not marked staging and sits on another domain is a domain change, which this build
// does not cover, so the scan stops (Brandon's brief; launch_domain was dropped 5 Nov).

const dns = require('dns');
const AdmZip = require('adm-zip');
const DEFAULTS = require('./defaults.json');
const { createUrlTools, targetOf, stripWww } = require('./urls');
const { fetchChain } = require('./crawl');
const { parsePage, detectPlatform, blockReason, looksNotFound } = require('./html');
const URL_PATTERNS = require('./url-patterns.json');
const { injectedReason } = require('./matters');
const { parseRobots, allowedBy, parseSitemap } = require('./sitemap');
const { analysePages } = require('./matters');
const { buildIssues } = require('./issues');
const { classifyLink, countDomains } = require('./spam');
const { parseSearchConsoleCsv } = require('./search-console-csv');
const SD = require('./dfs');
const { createDecisions, effective } = require('./decisions');
const { auditCsv, urlMapCsv } = require('./export');
const { createRedirects } = require('./redirects');
const { liveDomain } = require('../gbp/profile');

const j = v => JSON.stringify(v);
const round4 = v => Math.round(Number(v || 0) * 1e4) / 1e4;
const err = (status, message) => Object.assign(new Error(message), { status });
const hostOfUrl = s => { try { return new URL(/^https?:\/\//i.test(String(s)) ? String(s) : `https://${s}`).hostname; } catch (_) { return ''; } };

function domainCheck({ cv = {}, connection = null }) {
  const live = stripWww(hostOfUrl(liveDomain(cv)));
  const out = { live_domain: liveDomain(cv), stop: '', warnings: [] };
  if (!live) { out.stop = 'Add the live domain on the Record tab first. The scan reads the old site from it.'; return out; }
  const conn = connection && connection.url ? stripWww(hostOfUrl(connection.url)) : '';
  if (conn && !connection.staging && conn !== live) out.stop = `The WordPress connection is ${conn}, not marked as staging, and the live domain is ${live}. A change of domain isn't covered by this build, so the scan is stopped. Mark the connection as staging, or correct the live domain.`;
  const wizard = cv._intake && cv._intake.website ? stripWww(hostOfUrl(cv._intake.website)) : '';
  if (wizard && wizard !== live) out.warnings.push(`The live domain is ${live}, but the Add client wizard read ${wizard}. If the business is changing domain, stop: a change of domain isn't covered by this build.`);
  return out;
}

const numericSettings = Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'number');
const LOUD = new Set(['bot_block', 'homepage_elsewhere', 'no_homepage', 'root_not_page', 'sitemap_missing', 'crawl_short', 'js_only', 'page_cap', 'fetch_failed', 'source_failed', 'source_capped']);

// The Page Map rows the decisions match against, and the base town. Empty until the Page Map exists.
const pageMapLoader = pool => async clientId => {
  const { rows } = await pool.query(`SELECT page_key, type, title, slug, h1, applies, info FROM client_page_map WHERE client_id = $1 AND applies = TRUE ORDER BY sort_order`, [clientId]);
  const { rows: st } = await pool.query(`SELECT inputs FROM client_page_map_state WHERE client_id = $1`, [clientId]);
  const inputs = st[0] && st[0].inputs;
  return { rows: rows.map(r => ({ ...r, info: typeof r.info === 'string' ? JSON.parse(r.info) : (r.info || {}) })), baseTown: (typeof inputs === 'string' ? JSON.parse(inputs) : inputs || {}).baseTown || '' };
};

function createSiteAudit({ pool, loadValues, getConnection = async () => null, logCost = async () => {}, env = process.env, fetchImpl = (...a) => fetch(...a), sleep = ms => new Promise(r => setTimeout(r, ms)), log = console, lookup = host => dns.promises.lookup(host), dfs = SD, retryDelays = undefined, loadPages = null, pageMap = null, getSite = null, createLog = null }) {
  const running = new Map(); // clientId → the promise of the run under way
  const pagesOf = loadPages || pageMapLoader(pool);
  const decisions = createDecisions({ pool, getSettings: id => getSettings(id), loadPages: pagesOf, pageMap, rework: id => analyse(id) });

  async function getSettings(clientId) {
    const { rows } = await pool.query(`SELECT settings FROM site_audit_settings WHERE client_id = $1`, [clientId]);
    return { ...DEFAULTS, ...((rows[0] && rows[0].settings) || {}) };
  }

  async function latestScan(clientId) {
    const { rows } = await pool.query(`SELECT * FROM site_scans WHERE client_id = $1 ORDER BY started_at DESC LIMIT 1`, [clientId]);
    return rows[0] || null;
  }

  async function assertPublic(host) {
    let addr;
    try { addr = await lookup(host); }
    catch (e) { throw err(400, `Couldn't find ${host} on the internet (${e.code || e.message}). Check the live domain on the Record tab.`); }
    const a = String((addr && addr.address) || '');
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(a)) throw err(400, `${host} points at a private address, so it can't be scanned.`);
  }

  // ── Start, resume ──
  async function start(clientId) {
    if (running.has(clientId)) throw err(409, 'A scan is already running for this client.');
    if (!dfs.configured(env)) throw err(503, 'DataForSEO is not set up on this server (DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD).');
    const check = domainCheck({ cv: await loadValues(clientId), connection: await getConnection(clientId) });
    if (check.stop) throw err(400, check.stop);
    await assertPublic(hostOfUrl(check.live_domain));
    const settings = await getSettings(clientId);
    const { rows } = await pool.query(`INSERT INTO site_scans (client_id, target, settings, state) VALUES ($1, $2, $3, $4) RETURNING id`, [clientId, check.live_domain, j(settings), j({})]);
    launch(clientId, rows[0].id);
    return rows[0].id;
  }

  async function resume(clientId) {
    if (running.has(clientId)) throw err(409, 'A scan is already running for this client.');
    const s = await latestScan(clientId);
    if (!s) throw err(404, 'There is no scan to resume.');
    await pool.query(`UPDATE site_scans SET status = 'running', error = NULL, finished_at = NULL WHERE id = $1`, [s.id]);
    launch(clientId, s.id);
    return s.id;
  }

  function launch(clientId, scanId) {
    const p = run(clientId, scanId)
      .catch(e => log.error('[site-audit] the scan failed:', e.message))
      .finally(() => running.delete(clientId));
    running.set(clientId, p);
  }
  const wait = clientId => running.get(clientId) || Promise.resolve();

  // After a restart: nothing in memory is running, so say so
  async function recover() {
    const { rows } = await pool.query(`SELECT id FROM site_scans WHERE status = 'running'`);
    for (const r of rows) await pool.query(`UPDATE site_scans SET status = 'interrupted', error = $2 WHERE id = $1`, [r.id, 'The server restarted during the scan. Resume carries on from where it stopped and pays for nothing twice.']);
    return rows.length;
  }

  // ── The run ──
  async function run(clientId, scanId) {
    const { rows } = await pool.query(`SELECT * FROM site_scans WHERE id = $1`, [scanId]);
    const scan = rows[0];
    const settings = { ...DEFAULTS, ...(scan.settings || {}) };
    const state = scan.state || {};
    const ctx = { clientId, scanId, settings, state, inv: new Map(), pre: new Map(), cost: Number(scan.cost_usd), calls: Number(scan.calls), last: 0, tools: null };
    try {
      await loadInventory(ctx);
      await discover(ctx);
      await addSearchConsoleUrls(ctx);
      await gather(ctx);
      await homepageFromDataForSeo(ctx);
      await crawl(ctx);
      await setPhase(ctx, 'analyse');
      await analyse(scanId);
      await pool.query(`UPDATE site_scans SET status = 'done', phase = 'done', current_url = NULL, finished_at = NOW() WHERE id = $1`, [scanId]);
    } catch (e) {
      await pool.query(`UPDATE site_scans SET status = 'failed', error = $2, state = $3, finished_at = NOW() WHERE id = $1`, [scanId, e.message, j(ctx.state)]);
      throw e;
    }
  }

  const saveState = ctx => pool.query(`UPDATE site_scans SET state = $2 WHERE id = $1`, [ctx.scanId, j(ctx.state)]);
  const setPhase = (ctx, phase) => pool.query(`UPDATE site_scans SET phase = $2, state = $3 WHERE id = $1`, [ctx.scanId, phase, j(ctx.state)]);

  // One request a second (or the site's own Crawl-delay, up to ten seconds)
  const politeWait = ctx => async () => {
    const delay = Math.max(ctx.settings.request_delay_ms, Math.min(10000, ((ctx.state.robots && ctx.state.robots.crawlDelay) || 0) * 1000));
    const gap = ctx.last ? delay - (Date.now() - ctx.last) : 0;
    if (gap > 0) await sleep(gap);
    ctx.last = Date.now();
  };
  const fetchOf = (ctx, url, extra = {}) => fetchChain(url, { fetchImpl, wait: politeWait(ctx), ofSite: h => (ctx.tools ? ctx.tools.ofSite(h) : true), ...extra });

  async function loadInventory(ctx) {
    const { rows } = await pool.query(`SELECT id, url, kind, sources, priority, fetch_state FROM site_scan_urls WHERE scan_id = $1`, [ctx.scanId]);
    for (const r of rows) ctx.inv.set(r.url, { id: r.id, url: r.url, sources: r.sources || [], priority: r.priority, state: r.fetch_state, kind: r.kind });
    if (ctx.state.origin) ctx.tools = createUrlTools(ctx.state.origin);
  }

  async function addUrl(ctx, key, source, priority, extra = {}) {
    const t = ctx.tools;
    let row = ctx.inv.get(key);
    if (row) {
      if (!row.sources.includes(source)) { row.sources.push(source); await pool.query(`UPDATE site_scan_urls SET sources = $2 WHERE id = $1`, [row.id, j(row.sources)]); }
      if (priority < row.priority && row.state === 'pending') { row.priority = priority; await pool.query(`UPDATE site_scan_urls SET priority = $2 WHERE id = $1`, [row.id, priority]); }
    } else {
      const state = t.crawlable(key) ? 'pending' : 'skipped';
      const { rows } = await pool.query(`INSERT INTO site_scan_urls (scan_id, client_id, url, path, kind, sources, priority, fetch_state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, [ctx.scanId, ctx.clientId, key, t.pathOf(key), t.kind(key), j([source]), priority, state]);
      row = { id: rows[0].id, url: key, sources: [source], priority, state, kind: t.kind(key) };
      ctx.inv.set(key, row);
    }
    if (extra.summary_rd != null) await pool.query(`UPDATE site_scan_urls SET summary_rd = $2 WHERE id = $1`, [row.id, extra.summary_rd]);
    return row;
  }

  // ── The real homepage ──
  // A GoHighLevel site answers 404 at / and keeps its homepage at /home, and most of Local Launchpad's
  // old clients are on GoHighLevel (Brandon, 5 Nov). So / isn't assumed: follow its redirects, try the
  // common paths, and only then ask DataForSEO for the most linked URL, once its rows are in.
  const setPlatform = async (ctx, res) => {
    const p = detectPlatform(res.text, res.headers);
    await pool.query(`UPDATE site_scans SET platform = $2, platform_evidence = $3 WHERE id = $1`, [ctx.scanId, p.platform, j(p.evidence)]);
  };
  const isRealPage = (res, settings) => !res.error && !res.offsite && !res.loop && res.status >= 200 && res.status < 300 && /html/i.test(res.contentType || 'text/html') && !!(res.text || '').trim() && !blockReason(res.status, res.text) && !looksNotFound(res.text, settings);

  async function findHomepage(ctx, root, rootKey) {
    const { state, tools, settings } = ctx;
    const rootStatus = (root.hops && root.hops[0] && root.hops[0].status) || root.status;
    if (isRealPage(root, settings)) {
      const finalKey = tools.key(root.finalUrl);
      if (finalKey === rootKey) state.homepage = { path: '/', how: 'root', root_status: rootStatus };
      else {
        state.homepage = { path: tools.pathOf(finalKey), how: 'redirect', root_status: rootStatus };
        ctx.pre.set(finalKey, root);
        await addUrl(ctx, finalKey, 'crawl', -1);
      }
      await setPlatform(ctx, root);
      return;
    }
    for (const p of URL_PATTERNS.homepage_paths) {
      const res = await fetchOf(ctx, `${state.origin}${p}`);
      const k = res.error ? null : tools.key(res.finalUrl);
      if (k && k !== rootKey && isRealPage(res, settings)) {
        state.homepage = { path: tools.pathOf(k), how: 'common path', root_status: rootStatus };
        ctx.pre.set(k, res);
        await addUrl(ctx, k, 'crawl', -1);
        await setPlatform(ctx, res);
        return;
      }
    }
    // Still none. DataForSEO's rows arrive next, so that's asked after them
    state.homepage = { path: null, how: 'none', root_status: rootStatus, pending: true };
    if (root.text) await setPlatform(ctx, root);
  }

  // The URL other sites link to most, then the one with the most traffic: it's the likeliest homepage
  async function homepageFromDataForSeo(ctx) {
    const { state, tools, settings } = ctx;
    if (!state.homepage || !state.homepage.pending) return;
    const { rows: links } = await pool.query(`SELECT url, domain_from, url_from, anchor, spam_score, external_links FROM site_scan_backlinks WHERE scan_id = $1`, [ctx.scanId]);
    const { rows: keywords } = await pool.query(`SELECT url, etv FROM site_scan_keywords WHERE scan_id = $1`, [ctx.scanId]);
    const by = new Map();
    const row = u => { if (!by.has(u)) by.set(u, { url: u, links: [], etv: 0 }); return by.get(u); };
    for (const l of links) row(l.url).links.push(l);
    for (const k of keywords) row(k.url).etv += Number(k.etv || 0);
    const rootKey = tools.key(`${state.origin}/`);
    const ranked = [...by.values()]
      .filter(c => c.url !== rootKey && tools.kind(c.url) === 'page' && tools.crawlable(c.url) && !injectedReason(tools.pathOf(c.url)))
      .map(c => { const n = countDomains(c.links, settings); return { ...c, real: n.real, all: n.all }; })
      .sort((a, b) => b.real - a.real || b.all - a.all || b.etv - a.etv);
    for (const c of ranked.slice(0, 5)) {
      const res = await fetchOf(ctx, c.url);
      const k = res.error ? null : tools.key(res.finalUrl);
      if (k && k !== rootKey && isRealPage(res, settings)) {
        state.homepage = { path: tools.pathOf(k), how: c.real || c.all ? 'most linked' : 'most traffic', root_status: state.homepage.root_status, sites: c.all };
        ctx.pre.set(k, res);
        await addUrl(ctx, k, 'crawl', -1);
        await setPlatform(ctx, res);
        await saveState(ctx);
        return;
      }
    }
    state.homepage = { ...state.homepage, pending: false };
    await saveState(ctx);
  }

  // ── Homepage, the four forms of the address, robots.txt, the sitemaps ──
  async function discover(ctx) {
    const { state } = ctx;
    if (state.discovered) return;
    await setPhase(ctx, 'discover');
    const { rows } = await pool.query(`SELECT target FROM site_scans WHERE id = $1`, [ctx.scanId]);
    const typed = createUrlTools(rows[0].target);
    ctx.tools = typed;
    const home = await fetchOf(ctx, `${typed.origin}/`);
    if (home.error) throw err(502, `Couldn't reach ${typed.origin}: ${home.error}.`);
    if (home.offsite) {
      state.homepage_elsewhere = home.finalUrl;
    }
    const origin = home.offsite ? typed.origin : new URL(home.finalUrl).origin;
    state.origin = origin;
    ctx.tools = createUrlTools(origin);
    const key = ctx.tools.key(`${origin}/`);
    ctx.pre.set(key, home);
    await addUrl(ctx, key, 'crawl', -1);

    const block = blockReason(home.status, home.text);
    if (block) state.bot_block = block;
    if (!block && !home.offsite) await findHomepage(ctx, home, key);

    if (!block) {
      // The four forms of the address
      const host = ctx.tools.siteHost;
      state.variants = [];
      for (const form of [`http://${host}/`, `https://${host}/`, `http://www.${host}/`, `https://www.${host}/`]) {
        const v = await fetchOf(ctx, form);
        state.variants.push(v.error ? { url: form, error: v.error } : { url: form, hops: v.redirects, final: v.finalUrl, status: v.status });
      }
      // robots.txt names the sitemaps; else the usual places
      const r = await fetchOf(ctx, `${origin}/robots.txt`, { always: true });
      const robots = r.status === 200 && !/<html/i.test(r.text || '') ? parseRobots(r.text) : { sitemaps: [], rules: [], crawlDelay: null };
      state.robots = { found: r.status === 200, sitemaps: robots.sitemaps, rules: robots.rules, crawlDelay: robots.crawlDelay };
      const list = robots.sitemaps.length ? [...robots.sitemaps] : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/wp-sitemap.xml`];
      const seen = new Set();
      let files = 0;
      const found = new Set();
      while (list.length && files < 50) {
        const loc = list.shift();
        const k = ctx.tools.key(loc);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        files++;
        const x = await fetchOf(ctx, loc, { always: true });
        if (x.status !== 200) continue;
        const parsed = parseSitemap(x.text);
        if (parsed.type === 'index') { list.push(...parsed.locs); continue; }
        for (const u of parsed.locs) {
          const uk = ctx.tools.key(u);
          if (!uk) continue;
          await addUrl(ctx, uk, 'sitemap', 1);
          found.add(uk);
        }
      }
      state.sitemap = { files, urls: found.size };
    }
    state.discovered = true;
    await saveState(ctx);
  }

  // A Search Console file names URLs too
  async function addSearchConsoleUrls(ctx) {
    const { rows } = await pool.query(`SELECT rows FROM site_search_console WHERE client_id = $1`, [ctx.clientId]);
    for (const r of rows) for (const row of r.rows || []) {
      const k = row.page ? ctx.tools.key(row.page) : null;
      if (k) await addUrl(ctx, k, 'search_console', 0);
    }
  }

  // ── DataForSEO: what the row caps and the budget allow, and each source only once ──
  async function gather(ctx) {
    const { state, settings, scanId, clientId } = ctx;
    state.dfs = state.dfs || {};
    const target = targetOf(state.origin);
    const canSpend = est => ctx.cost + est <= settings.max_usd;
    const spend = async (cost, calls, detail) => {
      ctx.cost = round4(ctx.cost + Number(cost || 0));
      ctx.calls += calls;
      await pool.query(`UPDATE site_scans SET cost_usd = $2, calls = $3 WHERE id = $1`, [scanId, ctx.cost, ctx.calls]);
      await logCost({ kind: 'site_scan', clientId, cost, calls, detail: { scan: scanId, target, ...detail } });
    };
    const opts = { env, fetchImpl, ...(retryDelays ? { retryDelays } : {}) };
    await setPhase(ctx, 'dataforseo');

    if (!state.dfs.pages || state.dfs.pages.error) {
      try {
        const r = await dfs.pagesWithLinks(target, { canSpend, spend, opts });
        for (const p of r.rows) { const k = ctx.tools.key(p.url); if (k) await addUrl(ctx, k, 'backlinks', 0, { summary_rd: p.referring_domains }); }
        state.dfs.pages = { rows: r.rows.length, total: r.total, capped: r.capped };
      } catch (e) { state.dfs.pages = { error: e.message }; log.error('[site-audit] linked pages:', e.message); }
      await saveState(ctx);
    }
    if (!state.dfs.backlinks || state.dfs.backlinks.error) {
      try {
        const r = await dfs.allBacklinks(target, { rowCap: settings.backlink_row_cap, canSpend, spend, opts });
        await pool.query(`DELETE FROM site_scan_backlinks WHERE scan_id = $1`, [scanId]);
        let kept = 0;
        for (const l of r.rows) {
          const k = ctx.tools.key(l.url_to);
          if (!k) continue;
          await addUrl(ctx, k, 'backlinks', 0);
          await pool.query(`INSERT INTO site_scan_backlinks (scan_id, url, domain_from, url_from, anchor, spam_score, domain_rank, external_links, dofollow) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [scanId, k, l.domain_from, l.url_from, l.anchor, l.spam_score, l.domain_rank, l.external_links, l.dofollow]);
          kept++;
        }
        state.dfs.backlinks = { rows: kept, total: r.total, capped: r.capped };
      } catch (e) { state.dfs.backlinks = { error: e.message }; log.error('[site-audit] backlinks:', e.message); }
      await saveState(ctx);
    }
    if (!state.dfs.keywords || state.dfs.keywords.error) {
      try {
        const r = await dfs.rankedKeywords(target, { rowCap: settings.keyword_row_cap, canSpend, spend, opts });
        await pool.query(`DELETE FROM site_scan_keywords WHERE scan_id = $1`, [scanId]);
        let kept = 0;
        for (const x of r.rows) {
          const k = ctx.tools.key(x.url);
          if (!k) continue;
          await addUrl(ctx, k, 'rankings', 0);
          await pool.query(`INSERT INTO site_scan_keywords (scan_id, url, keyword, position, etv, volume) VALUES ($1, $2, $3, $4, $5, $6)`, [scanId, k, x.keyword, x.position, x.etv, x.volume]);
          kept++;
        }
        state.dfs.keywords = { rows: kept, total: r.total, capped: r.capped };
      } catch (e) { state.dfs.keywords = { error: e.message }; log.error('[site-audit] rankings:', e.message); }
      await saveState(ctx);
    }
  }

  // ── The crawl: signals first, the sitemap next, then whatever the pages link to ──
  async function crawl(ctx) {
    const { state, settings, scanId, tools } = ctx;
    await setPhase(ctx, 'crawl');
    const pending = () => [...ctx.inv.values()].filter(r => r.state === 'pending').sort((a, b) => a.priority - b.priority);
    const fetched = () => [...ctx.inv.values()].filter(r => r.state === 'done' || r.state === 'failed').length;
    let refused = 0;
    if (state.bot_block) {
      for (const r of pending()) { r.state = 'blocked'; await pool.query(`UPDATE site_scan_urls SET fetch_state = 'blocked' WHERE id = $1`, [r.id]); }
    }
    for (;;) {
      const next = pending()[0];
      if (!next) break;
      if (fetched() >= settings.page_cap) {
        state.page_cap_hit = true;
        for (const r of pending()) { r.state = 'cap'; await pool.query(`UPDATE site_scan_urls SET fetch_state = 'cap' WHERE id = $1`, [r.id]); }
        break;
      }
      await pool.query(`UPDATE site_scans SET current_url = $2, pages_done = $3, pages_total = $4 WHERE id = $1`, [scanId, next.url, fetched(), fetched() + pending().length]);
      const path = tools.pathOf(next.url);
      if (state.robots && !allowedBy(state.robots.rules, path)) {
        next.state = 'robots';
        await pool.query(`UPDATE site_scan_urls SET fetch_state = 'robots' WHERE id = $1`, [next.id]);
        state.robots_skipped = (state.robots_skipped || 0) + 1;
        continue;
      }
      let res = ctx.pre.get(next.url) || await fetchOf(ctx, next.url);
      if (res.status === 429) {
        const after = Number(res.headers && res.headers.get && res.headers.get('retry-after')) || 30;
        await sleep(Math.min(60, after) * 1000);
        res = await fetchOf(ctx, next.url);
      }
      const reason = !res.error ? blockReason(res.status, res.text) : '';
      refused = reason ? refused + 1 : 0;
      await store(ctx, next, res);
      if (refused >= 5) {
        state.bot_block = state.bot_block || `the site started refusing requests part way through: ${reason}`;
        for (const r of pending()) { r.state = 'blocked'; await pool.query(`UPDATE site_scan_urls SET fetch_state = 'blocked' WHERE id = $1`, [r.id]); }
        break;
      }
    }
    await pool.query(`UPDATE site_scans SET current_url = NULL, pages_done = $2, pages_total = $2 WHERE id = $1`, [scanId, fetched()]);
    await saveState(ctx);
  }

  async function store(ctx, row, res) {
    const { tools, settings } = ctx;
    row.state = res.error ? 'failed' : 'done';
    if (res.error) {
      await pool.query(`UPDATE site_scan_urls SET fetch_state = 'failed', fetch_error = $2, redirect_chain = $3 WHERE id = $1`, [row.id, res.error, j(res.hops || [])]);
      return;
    }
    const finalKey = res.offsite ? null : tools.key(res.finalUrl);
    const moved = res.redirects > 0 && finalKey !== row.url;
    if (moved || res.offsite || res.loop) {
      const first = (res.hops[0] && res.hops[0].status) || res.status;
      await pool.query(`UPDATE site_scan_urls SET fetch_state = 'done', status_code = $2, redirect_target = $3, redirect_chain = $4 WHERE id = $1`, [row.id, first, res.finalUrl, j(res.hops)]);
      if (finalKey && !res.loop) await addUrl(ctx, finalKey, 'crawl', 1);
      return;
    }
    const isPage = row.kind === 'page' && /html/i.test(res.contentType || 'text/html') && res.status >= 200 && res.status < 300 && !blockReason(res.status, res.text);
    if (!isPage) {
      await pool.query(`UPDATE site_scan_urls SET fetch_state = 'done', status_code = $2 WHERE id = $1`, [row.id, res.status]);
      return;
    }
    const p = parsePage(res.text, res.finalUrl, tools);
    const headerRobots = (res.headers && res.headers.get && res.headers.get('x-robots-tag')) || '';
    await pool.query(
      `UPDATE site_scan_urls SET fetch_state = 'done', status_code = $2, canonical = $3, noindex = $4, title = $5, h1 = $6, meta_description = $7, word_count = $8, low_text = $9, main_text = $10, facts = $11, links_out = $12 WHERE id = $1`,
      [row.id, res.status, p.canonical, p.noindex || /noindex/i.test(headerRobots), p.title, p.h1, p.metaDescription, p.wordCount, p.bodyWords < settings.low_text_words, p.mainText, j(p.facts), j(p.links)]);
    for (const k of p.links) await addUrl(ctx, k, 'crawl', 2);
  }

  // ── Search Console, as saved ──
  async function loadGsc(clientId, tools) {
    const { rows } = await pool.query(`SELECT kind, filename, rows, date_range, problems, uploaded_at FROM site_search_console WHERE client_id = $1`, [clientId]);
    const pages = new Map(), queries = new Map();
    let hasPageData = false, sitewideQueries = 0;
    const pageRows = rows.filter(r => r.kind === 'pages').flatMap(r => r.rows || []);
    const both = rows.filter(r => r.kind === 'queries').flatMap(r => r.rows || []);
    const addClicks = (k, row) => { const was = pages.get(k) || { clicks: 0, impressions: 0 }; pages.set(k, { clicks: was.clicks + Number(row.clicks || 0), impressions: was.impressions + Number(row.impressions || 0) }); };
    for (const r of pageRows) { const k = tools.key(r.page); if (k) { addClicks(k, r); hasPageData = true; } }
    for (const r of both) {
      if (!r.page) { sitewideQueries++; continue; }
      const k = tools.key(r.page);
      if (!k) continue;
      if (!pageRows.length) { addClicks(k, r); hasPageData = true; }
      if (r.query) { if (!queries.has(k)) queries.set(k, []); queries.get(k).push({ query: r.query, clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0), position: Number(r.position || 0) }); }
    }
    return { hasFile: hasPageData, pages, queries, sitewideQueries, files: rows.map(r => ({ kind: r.kind, filename: r.filename, date_range: r.date_range, problems: r.problems, rows: (r.rows || []).length, uploaded_at: r.uploaded_at })) };
  }

  // ── The answer, from the saved rows ──
  async function analyse(scanId) {
    const { rows: ss } = await pool.query(`SELECT * FROM site_scans WHERE id = $1`, [scanId]);
    const scan = ss[0];
    const clientId = scan.client_id;
    const state = scan.state || {};
    const settings = await getSettings(clientId);
    if (!state.origin) return;
    const tools = createUrlTools(state.origin);
    const { rows: urls } = await pool.query(`SELECT id, url, path, kind, sources, status_code, fetch_state, title, facts, links_out, low_text, summary_rd FROM site_scan_urls WHERE scan_id = $1`, [scanId]);
    const { rows: bl } = await pool.query(`SELECT url, domain_from, url_from, anchor, spam_score, domain_rank, external_links FROM site_scan_backlinks WHERE scan_id = $1`, [scanId]);
    const { rows: kw } = await pool.query(`SELECT url, keyword, position, etv, volume FROM site_scan_keywords WHERE scan_id = $1`, [scanId]);
    const { rows: over } = await pool.query(`SELECT url, matters_override FROM site_url_decisions WHERE client_id = $1`, [clientId]);
    const overrides = new Map(over.map(o => [o.url, o.matters_override]));
    const links = new Map(), keywords = new Map();
    for (const l of bl) { if (!links.has(l.url)) links.set(l.url, []); links.get(l.url).push(l); }
    for (const k of kw) { if (!keywords.has(k.url)) keywords.set(k.url, []); keywords.get(k.url).push({ ...k, etv: Number(k.etv) }); }
    const gsc = await loadGsc(clientId, tools);
    const { pages, benchmark } = analysePages({ urls: urls.map(u => ({ url: u.url, path: u.path, title: u.title, override: overrides.has(u.url) ? overrides.get(u.url) : null })), links, keywords, gsc, settings });

    // Internal links: which crawled pages link where
    const inlinks = new Map();
    for (const u of urls) for (const k of u.links_out || []) inlinks.set(k, (inlinks.get(k) || 0) + 1);
    const rootKey = tools.key(`${state.origin}/`);
    const homeKey = state.homepage && state.homepage.path ? tools.key(`${state.origin}${state.homepage.path}`) : rootKey;
    const linksCut = state.dfs && state.dfs.backlinks && state.dfs.backlinks.capped;
    for (const u of urls) {
      const a = pages.get(u.url);
      const inl = inlinks.get(u.url) || 0;
      const orphan = (u.sources || []).includes('sitemap') && inl === 0 && u.url !== homeKey && u.url !== rootKey;
      // The link list was cut off and this page has links the list didn't reach: the safe answer
      if (linksCut && Number(u.summary_rd || 0) > a.all_rd && !a.injected && overrides.get(u.url) !== false && !a.matters) { a.matters = true; a.matters_why = ['The list of links was cut off before this page was reached, so it counts as mattering until checked']; }
      await pool.query(
        `UPDATE site_scan_urls SET inlinks = $2, orphan = $3, clicks = $4, impressions = $5, est_traffic = $6, keywords_count = $7, all_rd = $8, real_rd = $9, matters = $10, matters_why = $11, injected = $12, top20 = $13, top20_why = $14, top_searches = $15 WHERE id = $1`,
        [u.id, inl, orphan, a.clicks, a.impressions, a.est_traffic, a.keywords_count, a.all_rd, a.real_rd, a.matters, j(a.matters_why), a.injected, a.top20, a.top20_why, j(a.top_searches)]);
    }

    // The site wide counts: every link on the site, as one set of domains
    const site = countDomains(bl, settings);
    const cv = await loadValues(clientId);
    const issues = buildIssues({ pages: urls.filter(u => u.facts).map(u => ({ url: u.url, path: u.path, facts: u.facts })), variants: state.variants || [], cv, siteHost: tools.siteHost, origin: state.origin });

    const warn = [];
    if (state.bot_block) warn.push({ kind: 'bot_block', text: `The crawl was blocked: ${state.bot_block}. The page list below is incomplete, so check the site by hand.` });
    if (state.homepage_elsewhere) warn.push({ kind: 'homepage_elsewhere', text: `The homepage redirects to ${state.homepage_elsewhere}, which is another site. Check the live domain on the Record tab.` });
    const fetchedPages = urls.filter(u => u.kind === 'page' && u.status_code >= 200 && u.status_code < 300);
    const low = fetchedPages.filter(u => u.low_text);
    const homeLow = low.some(u => u.url === homeKey);
    if (fetchedPages.length && (homeLow || low.length / fetchedPages.length >= 0.3)) warn.push({ kind: 'js_only', text: `${low.length} of ${fetchedPages.length} pages have almost no text in their HTML. The site probably builds its pages with JavaScript, so the crawl may have missed pages and text.` });
    // The real homepage, and whether the list can be trusted as complete
    const hp = state.homepage;
    if (hp && hp.how === 'none') warn.push({ kind: 'no_homepage', text: `${state.origin}/ answers ${hp.root_status || 'with no page'}, and no homepage could be found at the common addresses or from DataForSEO. The crawl had no homepage to start from, so this list is short. Find the homepage by hand.` });
    else if (hp && hp.path !== '/' && hp.how === 'redirect') warn.push({ kind: 'homepage_moved', text: `${state.origin}/ redirects to ${hp.path}, so that was read as the old homepage. The URL map suggests a 301 from it to / on the new site.` });
    else if (hp && hp.path !== '/') warn.push({ kind: 'root_not_page', text: `${state.origin}/ answers ${hp.root_status || 'with no page'}, so the site has no page at its own address. Its homepage was found at ${hp.path} (${{ 'common path': 'a common address', 'most linked': `the URL most sites link to${hp.sites ? `: ${hp.sites}` : ''}`, 'most traffic': 'the URL with the most traffic' }[hp.how] || hp.how}). Check that's right. The URL map suggests a 301 from it to / on the new site.` });
    if (state.sitemap && !state.sitemap.urls) warn.push({ kind: 'sitemap_missing', text: `No sitemap was found${state.sitemap.files ? ` in the ${state.sitemap.files} places tried` : ''}. Pages that nothing links to can't be found by the crawl, so the list may be short. Ask for a list of pages if the client has one, or upload a Search Console file.` });
    const liveKnown = fetchedPages.filter(u => (u.sources || []).some(s => s !== 'crawl'));
    const reached = new Set(fetchedPages.filter(u => (inlinks.get(u.url) || 0) > 0 || u.url === homeKey).map(u => u.url));
    const unreached = liveKnown.filter(u => !reached.has(u.url));
    if (liveKnown.length >= settings.crawl_short_min && reached.size < liveKnown.length * settings.crawl_short_ratio) warn.push({ kind: 'crawl_short', text: `The crawl reached ${reached.size} ${reached.size === 1 ? 'page' : 'pages'} by following links, but other sources know of ${liveKnown.length} live pages, ${unreached.length} of them not linked from anything crawled. The site's links aren't all readable, so expect more pages than this list shows. Check with Screaming Frog.` });
    else if (reached.size <= 1 && hp && hp.how !== 'none' && !state.bot_block) warn.push({ kind: 'crawl_short', text: `The crawl reached only ${reached.size} ${reached.size === 1 ? 'page' : 'pages'}, with no links to follow. A real site has more than that, so this list is probably short. Check with Screaming Frog.` });
    const failedFetches = urls.filter(u => u.fetch_state === 'failed');
    if (failedFetches.length >= 3 && failedFetches.length / urls.length >= 0.1) warn.push({ kind: 'fetch_failed', text: `${failedFetches.length} of ${urls.length} URLs couldn't be read at all. Resume tries nothing again, so scan again later.` });
    if (state.page_cap_hit) warn.push({ kind: 'page_cap', text: `The crawl stopped at the limit of ${settings.page_cap} URLs. ${urls.filter(u => u.fetch_state === 'cap').length} URLs found weren't fetched.` });
    if (state.robots_skipped) warn.push({ kind: 'robots', text: `robots.txt asks crawlers to stay out of ${state.robots_skipped} URLs, so they weren't fetched.` });
    for (const [key, label] of [['pages', 'linked pages'], ['backlinks', 'backlinks'], ['keywords', 'rankings']]) {
      const d = (state.dfs || {})[key];
      if (d && d.error) warn.push({ kind: 'source_failed', text: `DataForSEO couldn't give the ${label}: ${d.error}. What matters may be understated. Resume tries again.` });
      if (d && d.capped) warn.push({ kind: 'source_capped', text: `DataForSEO's ${label} were cut off at ${d.rows} of ${d.total} rows, by the row or spending limit.` });
    }
    for (const w of domainCheck({ cv, connection: await getConnection(clientId) }).warnings) warn.push({ kind: 'domain', text: w });
    if (gsc.files.length) {
      const dated = gsc.files.filter(f => f.date_range);
      if (!dated.length) warn.push({ kind: 'gsc_period', text: "The Search Console file doesn't say what dates it covers. It needs to be the last 12 months: upload Google's zip to have this checked." });
      else if (dated.some(f => !/12|16/.test(f.date_range))) warn.push({ kind: 'gsc_period', text: `The Search Console file covers "${dated[0].date_range}". The rule is the last 12 months, so upload a longer one.` });
      if (gsc.sitewideQueries && !gsc.queries.size) warn.push({ kind: 'gsc_queries', text: "Search Console's queries file doesn't link queries to pages, so the top searches per page come from DataForSEO." });
    }

    // The scan must never look complete when it isn't: anything here puts a red banner over the list
    for (const w of warn) w.loud = LOUD.has(w.kind);
    const final = await pool.query(`SELECT url, matters, top20, kind, orphan, sources, fetch_state FROM site_scan_urls WHERE scan_id = $1`, [scanId]);
    const by = { crawl: 0, sitemap: 0, rankings: 0, backlinks: 0, search_console: 0 };
    for (const u of final.rows) for (const s of u.sources || []) by[s] = (by[s] || 0) + 1;
    const summary = {
      total_urls: final.rows.length,
      pages: final.rows.filter(u => u.kind === 'page').length,
      media: final.rows.filter(u => u.kind !== 'page').length,
      matters: final.rows.filter(u => u.matters).length,
      top20: final.rows.filter(u => u.top20).length,
      orphans: final.rows.filter(u => u.orphan).length,
      not_fetched: final.rows.filter(u => !['done', 'failed', 'skipped'].includes(u.fetch_state)).length,
      by_source: by,
      links: bl.length,
      all_domains: site.all,
      real_domains: site.real,
      real_domain_names: site.real_domains.slice(0, 50),
      keywords: kw.length,
      est_traffic: Math.round(kw.reduce((s, k) => s + Number(k.etv || 0), 0) * 100) / 100,
      sitemap: state.sitemap || null,
      homepage: hp ? { path: hp.path, how: hp.how, root_status: hp.root_status } : null,
      old_homepage: hp && hp.path && hp.path !== '/' ? hp.path : null,
      crawl: { reached: reached.size, known_elsewhere: liveKnown.length, not_linked: unreached.length },
      complete: !warn.some(w => w.loud),
    };
    // The suggested decision for every URL. They wait until there is a Page Map to match against.
    const refreshed = await decisions.refresh(clientId, scanId, { hasSearchConsole: gsc.hasFile, origin: state.origin, oldHomepage: summary.old_homepage, rootStatus: hp ? hp.root_status : null });
    if (refreshed.ready) {
      const now = await decisions.rowsFor(clientId);
      const counts = { Keep: 0, Reuse: 0, Merge: 0, Retire: 0, Remove: 0 };
      let approved = 0, redirects = 0, gone = 0, total = 0, noAction = 0;
      for (const u of final.rows) {
        const e = effective(now.get(u.url));
        if (e.no_action) { noAction++; continue; }
        total++;
        if (counts[e.decision] !== undefined) counts[e.decision]++;
        if (e.approved) approved++;
        if (e.redirect_type === '301') redirects++;
        if (e.redirect_type === '410') gone++;
      }
      summary.decisions = { counts, approved, redirects, gone, total, no_action: noAction };
    } else summary.decisions = null;
    await pool.query(`UPDATE site_scans SET summary = $2, issues = $3, warnings = $4, benchmark = $5 WHERE id = $1`, [scanId, j(summary), j(issues), j(warn), benchmark]);
    return summary;
  }

  // ── What the tab reads ──
  const URL_COLS = `id, url, path, kind, sources, fetch_state, fetch_error, status_code, redirect_target, redirect_chain, canonical, noindex, title, h1, word_count, low_text, inlinks, orphan, clicks, impressions, est_traffic, keywords_count, all_rd, real_rd, matters, matters_why, injected, top20, top20_why, top_searches`;
  const numeric = u => ({ ...u, clicks: Number(u.clicks), impressions: Number(u.impressions), est_traffic: Number(u.est_traffic) });

  async function view(clientId) {
    const cv = await loadValues(clientId);
    const check = domainCheck({ cv, connection: await getConnection(clientId) });
    const settings = await getSettings(clientId);
    const scan = await latestScan(clientId);
    let urls = [], gsc = { files: [] };
    const overrides = new Map();
    const { rows: mapRows } = await pagesOf(clientId);
    const pageOptions = [
      ...mapRows.filter(p => ((p.info && p.info.phase) || 1) !== 2).map(p => ({ path: p.slug, title: p.title, type: p.type })),
      ...[...settings.site_pages, settings.gallery_page].filter(Boolean).filter(s => !mapRows.some(p => p.slug === s)).map(s => ({ path: s, title: s.replace(/^\//, '') || 'homepage', type: 'site' })),
    ];
    const decided = await decisions.rowsFor(clientId);
    if (scan) {
      const { rows } = await pool.query(`SELECT ${URL_COLS} FROM site_scan_urls WHERE scan_id = $1`, [scan.id]);
      urls = rows.map(numeric).sort((a, b) => (Number(a.kind !== 'page') - Number(b.kind !== 'page')) || (Number(b.top20) - Number(a.top20)) || (Number(b.matters) - Number(a.matters)) || (b.clicks - a.clicks) || (b.est_traffic - a.est_traffic) || (b.real_rd - a.real_rd) || a.url.localeCompare(b.url));
      const { rows: over } = await pool.query(`SELECT url, matters_override, override_note FROM site_url_decisions WHERE client_id = $1`, [clientId]);
      for (const o of over) if (o.matters_override != null) overrides.set(o.url, o);
      if (scan.state && scan.state.origin) gsc = await loadGsc(clientId, createUrlTools(scan.state.origin));
    }
    if (!gsc.files.length) { const { rows } = await pool.query(`SELECT kind, filename, date_range, problems, uploaded_at FROM site_search_console WHERE client_id = $1`, [clientId]); gsc = { files: rows }; }
    return {
      domain: check,
      configured: dfs.configured(env),
      running: running.has(clientId),
      settings, defaults: DEFAULTS,
      scan: scan ? { id: scan.id, status: scan.status, phase: scan.phase, target: scan.target, origin: scan.state && scan.state.origin, current_url: scan.current_url, pages_done: scan.pages_done, pages_total: scan.pages_total, platform: scan.platform, platform_evidence: scan.platform_evidence, summary: scan.summary, issues: scan.issues || [], warnings: scan.warnings || [], benchmark: scan.benchmark, cost_usd: Number(scan.cost_usd), calls: scan.calls, error: scan.error, started_at: scan.started_at, finished_at: scan.finished_at } : null,
      urls: urls.map(u => ({ ...u, override: overrides.has(u.url) ? overrides.get(u.url).matters_override : null, plan: effective(decided.get(u.url)) })),
      search_console: { files: gsc.files },
      page_map_ready: mapRows.length > 0,
      page_options: pageOptions,
      page_map_changes: pageMap ? await pageMap.listUrlOverrides(clientId) : [],
    };
  }

  // ── Decisions ──
  const scanFor = async clientId => {
    const s = await latestScan(clientId);
    if (!s || !s.state || !s.state.origin) throw err(404, 'Scan the old site first.');
    return s;
  };
  async function setDecision(clientId, urlId, input = {}, who = '') {
    const s = await scanFor(clientId);
    await decisions.setDecision(clientId, urlId, input, { origin: s.state.origin, who });
    await analyse(s.id);
    return view(clientId);
  }
  async function approve(clientId, input = {}, who = '') {
    const s = await scanFor(clientId);
    const result = await decisions.approve(clientId, { url_ids: input.url_ids, all: !!input.all, scanId: s.id, who });
    await analyse(s.id);
    return { ...(await view(clientId)), approval: result };
  }
  async function proposalYes(clientId, urlId, who = '') {
    const result = await decisions.proposalYes(clientId, urlId, { who });
    return { ...(await view(clientId)), page_map_change: result };
  }
  async function proposalNo(clientId, urlId, who = '') {
    await decisions.proposalNo(clientId, urlId, { who });
    return view(clientId);
  }
  async function proposalUndo(clientId, identity) {
    const s = await latestScan(clientId);
    const result = await decisions.proposalUndo(clientId, identity, { scanId: s && s.id });
    return { ...(await view(clientId)), page_map_change: result };
  }
  async function pageContent(clientId, path) {
    const s = await latestScan(clientId);
    return { pages: s ? await decisions.pageContent(clientId, s.id, String(path || '')) : [] };
  }
  async function exportCsv(clientId, which) {
    const s = await scanFor(clientId);
    const v = await view(clientId);
    const origin = s.state.origin;
    return which === 'url-map' ? urlMapCsv(v.urls, origin) : auditCsv(v.urls);
  }

  async function urlDetail(clientId, urlId) {
    const { rows } = await pool.query(`SELECT * FROM site_scan_urls WHERE id = $1 AND client_id = $2`, [urlId, clientId]);
    if (!rows.length) throw err(404, 'That URL is not in the scan.');
    const u = numeric(rows[0]);
    const settings = await getSettings(clientId);
    const { rows: bl } = await pool.query(`SELECT domain_from, url_from, anchor, spam_score, domain_rank, external_links, dofollow FROM site_scan_backlinks WHERE scan_id = $1 AND url = $2`, [u.scan_id, u.url]);
    const { rows: kw } = await pool.query(`SELECT keyword, position, etv, volume FROM site_scan_keywords WHERE scan_id = $1 AND url = $2`, [u.scan_id, u.url]);
    const links = bl.map(l => { const c = classifyLink(l, settings); return { ...l, real: c.real, reasons: c.reasons, not_scored: c.not_scored }; }).sort((a, b) => (Number(b.real) - Number(a.real)) || (Number(b.domain_rank || 0) - Number(a.domain_rank || 0)));
    const { rows: over } = await pool.query(`SELECT matters_override, override_note FROM site_url_decisions WHERE client_id = $1 AND url = $2`, [clientId, u.url]);
    return { url: { ...u, links_out: undefined }, links, keywords: kw.map(k => ({ ...k, etv: Number(k.etv) })).sort((a, b) => b.etv - a.etv), override: over[0] || null };
  }

  // A person says this page matters or doesn't (null clears it). Costs nothing: the answer is reworked.
  async function setOverride(clientId, urlId, { matters = null, note = '' } = {}) {
    const { rows } = await pool.query(`SELECT scan_id, url FROM site_scan_urls WHERE id = $1 AND client_id = $2`, [urlId, clientId]);
    if (!rows.length) throw err(404, 'That URL is not in the scan.');
    if (matters !== null && typeof matters !== 'boolean') throw err(400, 'Say yes, no, or clear.');
    const { url, scan_id: scanId } = rows[0];
    const { rows: ex } = await pool.query(`SELECT id FROM site_url_decisions WHERE client_id = $1 AND url = $2`, [clientId, url]);
    if (ex.length) await pool.query(`UPDATE site_url_decisions SET matters_override = $2, override_note = $3, updated_at = NOW() WHERE id = $1`, [ex[0].id, matters, String(note || '')]);
    else await pool.query(`INSERT INTO site_url_decisions (client_id, url, matters_override, override_note) VALUES ($1, $2, $3, $4)`, [clientId, url, matters, String(note || '')]);
    await analyse(scanId);
    return view(clientId);
  }

  async function saveSettings(clientId, input = {}) {
    const clean = {};
    for (const k of numericSettings) {
      if (input[k] === undefined || input[k] === '') continue;
      const v = Number(input[k]);
      if (!Number.isFinite(v) || v < 0) throw err(400, `${k} must be a number, zero or more.`);
      clean[k] = v;
    }
    const { rows } = await pool.query(`SELECT client_id FROM site_audit_settings WHERE client_id = $1`, [clientId]);
    if (rows.length) await pool.query(`UPDATE site_audit_settings SET settings = $2, updated_at = NOW() WHERE client_id = $1`, [clientId, j(clean)]);
    else await pool.query(`INSERT INTO site_audit_settings (client_id, settings) VALUES ($1, $2)`, [clientId, j(clean)]);
    const s = await latestScan(clientId);
    if (s && !running.has(clientId)) await analyse(s.id);
    return view(clientId);
  }

  // A Search Console file: Google's zip (Pages.csv, Queries.csv, Filters.csv) or one CSV. Reworks the
  // answer on the latest scan, and fetches any URL only the file knows about.
  async function uploadSearchConsole(clientId, { csv = '', zip_base64: zip = '', filename = '' } = {}) {
    const files = [];
    let dateRange = null;
    if (zip) {
      let entries;
      try { entries = new AdmZip(Buffer.from(zip, 'base64')).getEntries(); }
      catch (e) { throw err(400, `That file couldn't be opened as a zip: ${e.message}`); }
      const read = name => { const e = entries.find(x => x.entryName.split('/').pop().toLowerCase() === name); return e ? e.getData().toString('utf8') : null; };
      const filters = read('filters.csv');
      if (filters) { const m = filters.match(/^\s*"?Date"?\s*,\s*"?([^"\r\n]+)/im); if (m) dateRange = m[1].trim(); }
      for (const name of ['pages.csv', 'queries.csv']) { const text = read(name); if (text) files.push({ name, text }); }
      if (!files.length) throw err(400, 'That zip has no Pages.csv or Queries.csv.');
    } else {
      if (!String(csv).trim()) throw err(400, 'Choose a Search Console file first.');
      files.push({ name: filename || 'upload.csv', text: String(csv) });
    }
    const out = [];
    for (const f of files) {
      const parsed = parseSearchConsoleCsv(f.text);
      if (!parsed.rows.length) throw err(400, parsed.problems.join(' ') || `No rows in ${f.name}.`);
      const hasQuery = parsed.rows.some(r => r.query);
      const kind = hasQuery ? 'queries' : 'pages';
      await pool.query(`DELETE FROM site_search_console WHERE client_id = $1 AND kind = $2`, [clientId, kind]);
      await pool.query(`INSERT INTO site_search_console (client_id, kind, filename, rows, date_range, problems) VALUES ($1, $2, $3, $4, $5, $6)`, [clientId, kind, filename || f.name, j(parsed.rows), dateRange, j(parsed.problems)]);
      out.push({ kind, rows: parsed.rows.length });
    }
    const s = await latestScan(clientId);
    if (s && s.state && s.state.origin && !running.has(clientId)) {
      await pool.query(`UPDATE site_scans SET status = 'running', error = NULL, finished_at = NULL WHERE id = $1`, [s.id]);
      launch(clientId, s.id);
    }
    return { saved: out };
  }

  // ── The redirect push and the validator (redirects.js, validator.js) ──
  const redirects = createRedirects({ view, getSite: id => (getSite ? getSite(id) : null), loadValues, createLog, pool });
  const politeOpts = () => {
    let last = 0;
    return { fetchImpl, wait: async () => { const gap = last ? DEFAULTS.request_delay_ms - (Date.now() - last) : 0; if (gap > 0) await sleep(gap); last = Date.now(); } };
  };
  const redirectsView = async clientId => ({ log: await redirects.log(clientId), latest_snapshot: await redirects.latestSnapshot(clientId), checks: await redirects.latestChecks(clientId) });

  return { start, resume, wait, recover, run, analyse, view, urlDetail, setOverride, saveSettings, getSettings, uploadSearchConsole, setDecision, approve, proposalYes, proposalNo, proposalUndo, pageContent, exportCsv,
    redirectsView, redirectsDryRun: id => redirects.dryRun(id), redirectsPush: (id, o) => redirects.push(id, o), redirectsRollback: (id, o) => redirects.rollback(id, o),
    validate: id => redirects.validate(id, politeOpts()), checkAfterLaunch: id => redirects.afterLaunch(id, politeOpts()), testOnStaging: (id, o = {}) => redirects.testOnStaging(id, { ...o, ...politeOpts() }) };
}

module.exports = { createSiteAudit, domainCheck, DEFAULTS };
