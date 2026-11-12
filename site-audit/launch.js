'use strict';

// ── Launch and after (existing site migration, slice 2; Brandon, 12 Nov 2026) ─────────
// Four checks, each BLOCK or WARN like the pre launch check, each read only:
//   liveUrlCheck   every old URL in the approved map, requested on the live site after the switch:
//                  a Keep answers 200 where it was, a 301 lands on its new page, a 410 answers 410.
//                  Run on launch day (the button) and again by itself at day 7.
//   dnsSnapshot    the domain's DNS before launch (A, www, NS, MX, SPF, DMARC, DKIM on the common
//   dnsCompare     selectors, the other TXT), and the same after. A lost MX, SPF, DMARC or DKIM
//                  record means the client's email stops or goes to spam: a BLOCK.
//   contentCheck   on staging, before launch: each top list page's top searches must appear in its
//                  new page's title, H1 or text. A miss is a WARN naming the search.
//   monitorCompare once a month for 90 days after launch: DataForSEO's rankings for the domain against
//                  the old site's scan. The red flags (Brandon, 12 Nov): a top list page's estimated
//                  visits fall by more than half at its new home, or its main search drops out of the
//                  top 20. Red flags go to Brandon through Tell Brandon (brandon/rules.js, kind migration).
// No Search Console connection and no screenshots (Brandon, 12 Nov): the Search Console file upload
// stays the only Search Console source.

const dns = require('dns');
const { fetchChain } = require('./crawl');
const { parsePage } = require('./html');
const { createUrlTools, stripWww, targetOf } = require('./urls');
const { split, issue, domainForms } = require('./validator');

const DAY = 86400000;
const hostOf = s => { try { return new URL(/^https?:\/\//i.test(String(s)) ? String(s) : `https://${s}`).hostname; } catch (_) { return ''; } };
const stripSlash = p => (p && p.length > 1 ? p.replace(/\/+$/, '') : p);
const pathKey = u => { try { const x = new URL(u); return `${stripSlash(x.pathname) || '/'}${x.search}`; } catch (_) { return stripSlash(String(u || '')); } };

// The rows of the map that need checking, with where each should end up
function mapRows(v) {
  return (v.urls || []).filter(u => u.plan && !u.plan.no_action && u.plan.decision).map(u => {
    const p = u.plan;
    const expect = p.decision === 'Keep' ? { code: 200, path: u.path } : p.redirect_type === '410' ? { code: 410 } : p.redirect_type === '301' && p.new_url ? { code: 301, path: p.new_url } : null;
    return { u, expect };
  }).filter(r => r.expect);
}

// Where an old URL's visitors go on the new site: itself when kept, else its 301 destination
const homeOf = u => (u.plan && u.plan.decision === 'Keep' ? u.path : (u.plan && u.plan.redirect_type === '301' && String(u.plan.new_url || '').startsWith('/') ? u.plan.new_url : ''));

// ── The old URLs on the live site ──
async function liveUrlCheck(v, origin, { fetchImpl = (...a) => fetch(...a), wait = async () => {} } = {}) {
  const out = [], results = [];
  const host = stripWww(new URL(origin).hostname);
  const ofSite = h => stripWww(h) === host;
  for (const { u, expect } of mapRows(v)) {
    const important = u.matters || u.top20;
    const level = important ? 'BLOCK' : 'WARN';
    const r = await fetchChain(`${origin}${u.path}`, { fetchImpl, wait, ofSite, maxHops: 5 });
    const got = r.error ? r.error : `${r.status}${r.redirects ? ` after ${r.redirects} ${r.redirects === 1 ? 'redirect' : 'redirects'}` : ''}${r.redirects ? ` at ${pathKey(r.finalUrl)}` : ''}`;
    const res = { path: u.path, expected: expect.code === 301 ? `301 to ${expect.path}` : String(expect.code), got, ok: false };
    results.push(res);
    if (r.error) { out.push(issue(level, `${u.path} didn't answer on the live site: ${r.error}.`, u.path)); continue; }
    if (r.offsite) { out.push(issue(level, `${u.path} goes off the site, to ${r.finalUrl}.`, u.path)); continue; }
    if (r.loop) { out.push(issue('BLOCK', `${u.path} is in a redirect loop on the live site.`, u.path)); continue; }
    const at = pathKey(r.finalUrl);
    if (expect.code === 410) {
      if (r.status === 410) res.ok = true;
      else if (r.status === 404) { res.ok = true; out.push(issue('WARN', `${u.path} answers 404, not 410. Google drops it either way, a little slower.`, u.path)); }
      else out.push(issue('WARN', `${u.path} should answer 410 and answered ${got}.`, u.path));
      continue;
    }
    if (expect.code === 200) {
      if (r.status === 200 && at === pathKey(`${origin}${u.path}`)) res.ok = true;
      else if (r.status === 200 && stripSlash(at.split('?')[0]) === stripSlash(u.path.split('?')[0])) { res.ok = true; }
      else out.push(issue(level, `${u.path} is kept and should answer 200 where it is. It answered ${got}.`, u.path));
      continue;
    }
    // A 301: it must land on its new page, answering 200
    if (r.redirects === 0) { out.push(issue(level, `${u.path} should redirect to ${expect.path} and answered ${r.status}. Are the Copybot redirects turned on (Settings, Copybot redirects)?`, u.path)); continue; }
    if (at !== pathKey(`${origin}${expect.path}`)) { out.push(issue(level, `${u.path} should go to ${expect.path} and goes to ${at}.`, u.path)); continue; }
    if (r.status !== 200) { out.push(issue(level, `${u.path} reaches ${expect.path}, which answers ${r.status}, not 200.`, u.path)); continue; }
    res.ok = true;
    if (r.redirects > 1) out.push(issue('WARN', `${u.path} takes ${r.redirects} redirects to reach ${expect.path}. One is best: check the old address isn't redirected twice.`, u.path));
  }
  return { ...split(out), results, checked: results.length, passed: results.filter(r => r.ok).length };
}

// ── DNS ──
// DKIM keys sit under a selector nobody lists, so the common ones are tried: Google Workspace,
// Microsoft 365, Zoho, Fastmail, Proton, cPanel hosts and the usual defaults.
const DKIM_SELECTORS = ['google', 'selector1', 'selector2', 'default', 'k1', 'k2', 's1', 's2', 'mail', 'dkim', 'smtp', 'zoho', 'zmail', 'fm1', 'fm2', 'fm3', 'protonmail', 'protonmail2', 'protonmail3', 'mxvault', 'hostinger', 'titan1'];
const NONE = /ENODATA|ENOTFOUND|NXDOMAIN|ENONAME|ENOTIMP|EREFUSED/;

function makeResolver() {
  const r = new dns.promises.Resolver({ timeout: 5000, tries: 2 });
  try { r.setServers(['1.1.1.1', '8.8.8.8']); } catch (_) {}
  return r;
}

async function dnsSnapshot(domain, { resolver = makeResolver() } = {}) {
  const host = stripWww(hostOf(domain));
  const errors = [];
  const ask = async (what, fn) => { try { return await fn(); } catch (e) { if (!NONE.test(String(e.code || e.message))) errors.push(`${what}: ${e.code || e.message}`); return []; } };
  const txtOf = async name => (await ask(`TXT ${name}`, () => resolver.resolveTxt(name))).map(parts => parts.join(''));
  const txt = await txtOf(host);
  const dkim = {};
  for (const sel of DKIM_SELECTORS) {
    const found = (await txtOf(`${sel}._domainkey.${host}`)).filter(t => /v=DKIM1|k=rsa|p=/i.test(t));
    const cname = found.length ? [] : await ask(`CNAME ${sel}._domainkey`, () => resolver.resolveCname(`${sel}._domainkey.${host}`));
    if (found.length || cname.length) dkim[sel] = found.length ? found : cname.map(c => `CNAME ${c}`);
  }
  return {
    domain: host,
    at: new Date().toISOString(),
    a: (await ask('A', () => resolver.resolve4(host))).sort(),
    www: [...(await ask('CNAME www', () => resolver.resolveCname(`www.${host}`))).map(c => `CNAME ${c}`), ...(await ask('A www', () => resolver.resolve4(`www.${host}`)))].sort(),
    ns: (await ask('NS', () => resolver.resolveNs(host))).map(s => s.toLowerCase()).sort(),
    mx: (await ask('MX', () => resolver.resolveMx(host))).map(m => ({ exchange: String(m.exchange).toLowerCase(), priority: m.priority })).sort((x, y) => x.priority - y.priority || x.exchange.localeCompare(y.exchange)),
    spf: txt.filter(t => /^v=spf1/i.test(t)),
    dmarc: (await txtOf(`_dmarc.${host}`)).filter(t => /^v=DMARC1/i.test(t)),
    dkim,
    txt: txt.filter(t => !/^v=spf1/i.test(t)).sort(),
    errors,
  };
}

function dnsCompare(before, after) {
  const out = [], changes = [];
  if (!before) return { ...split([issue('WARN', 'No DNS snapshot was taken before launch, so the email records can\'t be compared. Check MX, SPF, DKIM and DMARC by hand at the DNS host.')]), changes };
  if ((after.errors || []).length) out.push(issue('WARN', `Some DNS lookups failed (${after.errors.join('; ')}). Run the check again.`));
  const mxB = before.mx.map(m => m.exchange), mxA = new Set(after.mx.map(m => m.exchange));
  const lostMx = mxB.filter(m => !mxA.has(m));
  if (mxB.length && !after.mx.length) out.push(issue('BLOCK', `The domain has no MX records now (before: ${mxB.join(', ')}). The client's email has stopped arriving. Put them back at the DNS host now.`));
  else if (lostMx.length) out.push(issue('BLOCK', `MX records missing since the snapshot: ${lostMx.join(', ')}. Email may not arrive. Put them back at the DNS host.`));
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (before.spf.length && !after.spf.length) out.push(issue('BLOCK', `The SPF record is gone (it was "${before.spf[0]}"). The client's emails will land in spam. Put it back.`));
  else if (before.spf.length && !same(before.spf, after.spf)) out.push(issue('WARN', `The SPF record changed, from "${before.spf.join(' | ')}" to "${after.spf.join(' | ')}". Check the email provider is still in it.`));
  if (before.dmarc.length && !after.dmarc.length) out.push(issue('BLOCK', `The DMARC record is gone (it was "${before.dmarc[0]}"). Put it back at _dmarc.${after.domain}.`));
  else if (before.dmarc.length && !same(before.dmarc, after.dmarc)) out.push(issue('WARN', 'The DMARC record changed. Check it is what the client\'s email provider wants.'));
  for (const sel of Object.keys(before.dkim || {})) if (!(after.dkim || {})[sel]) out.push(issue('BLOCK', `The DKIM key at ${sel}._domainkey is gone. The client's emails may land in spam. Put it back.`));
  const txtA = new Set(after.txt);
  for (const t of before.txt) if (!txtA.has(t)) out.push(issue('WARN', `A TXT record is gone: "${t.length > 120 ? `${t.slice(0, 120)}…` : t}". Check whether anything needs it (site verification, an email service).`));
  if (!same(before.ns, after.ns)) out.push(issue('WARN', `The DNS host changed (${before.ns.join(', ') || 'none'} to ${after.ns.join(', ') || 'none'}). Check every record moved with it.`));
  if (!same(before.a, after.a)) changes.push(`The domain now points at ${after.a.join(', ') || 'nothing'} (was ${before.a.join(', ') || 'nothing'}). Expected at launch.`);
  if (!same(before.www, after.www)) changes.push(`www now points at ${after.www.join(', ') || 'nothing'} (was ${before.www.join(', ') || 'nothing'}). Expected at launch.`);
  if (!after.a.length) out.push(issue('BLOCK', 'The domain doesn\'t point anywhere (no A record).'));
  return { ...split(out), changes };
}

// ── The top searches on the new pages, on staging ──
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'near', 'me', 'my', 'best', 'cheap', 'local', 'uk', 'services', 'service', 'company', 'companies', 'with', 'by', 'at', 'from', 'how', 'what', 'much', 'does', 'do', 'is', 'cost']);
const stem = w => w.replace(/'s$/, '').replace(/(ies)$/, 'y').replace(/(ses|xes|zes|ches|shes)$/, m => m.slice(0, -2)).replace(/([^s])s$/, '$1');
const wordsOf = s => String(s || '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(Boolean).map(stem);

// Where a search's words are found on a page: 'title', 'h1', 'text', or '' when some are missing
function searchCovered(search, page) {
  const want = [...new Set(wordsOf(search).filter(w => !STOP.has(w)))];
  if (!want.length) return { where: 'text', missing: [] };
  const has = s => { const got = new Set(wordsOf(s)); return want.filter(w => !got.has(w)); };
  if (!has(page.title).length) return { where: 'title', missing: [] };
  if (!has(page.h1).length) return { where: 'h1', missing: [] };
  const missing = has(`${page.title} ${page.h1} ${page.text}`);
  return { where: missing.length ? '' : 'text', missing };
}

async function contentCheck(v, siteUrl, { fetchImpl = (...a) => fetch(...a), wait = async () => {} } = {}) {
  const out = [], results = [];
  const origin = new URL(siteUrl).origin;
  const tools = createUrlTools(origin);
  const byHome = new Map();
  for (const u of (v.urls || []).filter(x => x.top20 && x.kind === 'page')) {
    const home = homeOf(u);
    const searches = (u.top_searches || []).map(s => s.search).filter(Boolean);
    if (!home || !searches.length) continue;
    if (!byHome.has(home)) byHome.set(home, []);
    byHome.get(home).push({ u, searches });
  }
  for (const [home, olds] of byHome) {
    const r = await fetchChain(`${origin}${home}`, { fetchImpl, wait, ofSite: h => stripWww(h) === stripWww(new URL(origin).hostname), maxHops: 3 });
    if (r.error || r.status !== 200 || !r.text) { results.push({ home, skipped: r.error || `answered ${r.status}` }); continue; }
    const p = parsePage(r.text, r.finalUrl, tools);
    const page = { title: p.title, h1: p.h1, text: p.mainText };
    for (const { u, searches } of olds) {
      for (const search of searches) {
        const c = searchCovered(search, page);
        results.push({ home, old: u.path, search, where: c.where, missing: c.missing });
        if (!c.where) out.push(issue('WARN', `"${search}" (a top search of ${u.path}) isn't in ${home}'s title, H1 or text: ${c.missing.map(w => `"${w}"`).join(', ')} missing. The new page may lose that search. Work it in, or tell Brandon if it doesn't belong.`, home));
      }
    }
  }
  return { ...split(out), results };
}

// ── 90 days: the rankings now against the old site's scan ──
function monitorCompare(v, rows, { drop = 0.5, top = 20 } = {}) {
  const flags = [], pages = [];
  const etvAt = new Map();
  const bestPos = new Map();
  for (const r of rows || []) {
    const k = pathKey(r.url);
    etvAt.set(k, (etvAt.get(k) || 0) + Number(r.etv || 0));
    const kw = String(r.keyword || '').toLowerCase().trim();
    if (r.position != null && (!bestPos.has(kw) || r.position < bestPos.get(kw).position)) bestPos.set(kw, { position: Number(r.position), url: r.url });
  }
  for (const u of (v.urls || []).filter(x => x.top20)) {
    const home = homeOf(u);
    if (!home) continue;
    const before = Number(u.est_traffic || 0);
    const now = Math.round((etvAt.get(stripSlash(home)) || etvAt.get(home) || 0) * 100) / 100;
    const main = (u.top_searches || []).find(s => s.search && s.position != null && Number(s.position) <= top) || null;
    const nowPos = main ? (bestPos.get(String(main.search).toLowerCase().trim()) || null) : null;
    const row = { old: u.path, home, before: Math.round(before * 100) / 100, now, search: main ? main.search : '', before_position: main ? Number(main.position) : null, now_position: nowPos ? nowPos.position : null };
    pages.push(row);
    if (before > 0 && now < before * (1 - drop)) flags.push({ key: `visits:${u.path}`, text: `${u.path} (now ${home}): estimated visits fell from ${row.before} to ${now} a month, more than ${Math.round(drop * 100)}% down since the old site.` });
    if (main && (!nowPos || nowPos.position > top)) flags.push({ key: `search:${u.path}:${main.search}`, text: `"${main.search}" was at position ${main.position} for ${u.path} and is ${nowPos ? `now at ${nowPos.position}` : `now not in the top ${top}`}.` });
  }
  return { flags, pages };
}

// ── The service: the launch row per client, the checks, the day 7 and monthly jobs ──
const TABLE = `
  CREATE TABLE IF NOT EXISTS site_launches (
    client_id     UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
    domain        TEXT,
    dns_before    JSONB,
    dns_before_at TIMESTAMPTZ,
    launched_at   TIMESTAMPTZ,
    day7_at       TIMESTAMPTZ,
    monitor       JSONB NOT NULL DEFAULT '[]',
    flags         JSONB NOT NULL DEFAULT '{}',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`;

async function ensureLaunchTable(pool) {
  try { await pool.query('SELECT 1 FROM site_launches LIMIT 1'); } catch (_) { await pool.query(TABLE); }
}

const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
const MONITOR_DAYS = [30, 60, 90];

function createLaunch({ pool, view, loadValues, getSettings, saveCheck, dfs, env = process.env, logCost = async () => {}, polite, resolver = null, now = () => new Date(), log = console }) {
  const err = (status, message) => Object.assign(new Error(message), { status });
  const ready = (async () => { if (pool) await ensureLaunchTable(pool); })();
  ready.catch(e => log.error('[site-audit] the launch table:', e.message)); // surfaced again on first use

  async function row(clientId) {
    await ready;
    const { rows } = await pool.query('SELECT * FROM site_launches WHERE client_id = $1', [clientId]);
    const r = rows[0];
    return r ? { ...r, dns_before: parse(r.dns_before), monitor: parse(r.monitor) || [], flags: parse(r.flags) || {} } : null;
  }
  async function upsert(clientId, fields) {
    await ready;
    const have = await row(clientId);
    if (!have) await pool.query('INSERT INTO site_launches (client_id) VALUES ($1)', [clientId]);
    const keys = Object.keys(fields);
    await pool.query(`UPDATE site_launches SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE client_id = $1`, [clientId, ...keys.map(k => (fields[k] !== null && typeof fields[k] === 'object' && !(fields[k] instanceof Date) ? JSON.stringify(fields[k]) : fields[k]))]);
    return row(clientId);
  }
  const domainOf = async clientId => {
    const cv = await loadValues(clientId);
    const d = stripWww(hostOf(cv.live_domain || ''));
    if (!d) throw err(400, 'Add the live domain on the Record tab first.');
    return d;
  };

  async function snapshotDns(clientId) {
    const domain = await domainOf(clientId);
    const snap = await dnsSnapshot(domain, resolver ? { resolver } : {});
    const have = await row(clientId);
    if (have && have.launched_at) throw err(400, 'The site has launched, so a new snapshot would be of the new set-up. The one from before launch is kept.');
    await upsert(clientId, { domain, dns_before: snap, dns_before_at: new Date(snap.at) });
    return snap;
  }

  // Launch day (the button) and day 7 (the job): the domain's forms, every old URL, the DNS against the snapshot
  async function launchCheck(clientId, { kind = 'after_launch' } = {}) {
    const domain = await domainOf(clientId);
    const v = await view(clientId);
    const { fetchImpl, wait } = polite();
    const forms = await domainForms(domain, { fetchImpl, wait, level: 'BLOCK', label: 'the live domain' });
    const origin = forms.final ? new URL(forms.final).origin : `https://${domain}`;
    const urls = await liveUrlCheck(v, origin, { fetchImpl, wait });
    const have = await row(clientId);
    const after = await dnsSnapshot(domain, resolver ? { resolver } : {});
    const dnsDiff = dnsCompare(have && have.dns_before, after);
    const at = now().toISOString();
    const result = { block: [...forms.block, ...urls.block, ...dnsDiff.block], warn: [...forms.warn, ...urls.warn, ...dnsDiff.warn], forms: forms.forms, final: forms.final, urls: urls.results, checked: urls.checked, passed: urls.passed, dns: { after, changes: dnsDiff.changes, compared: !!(have && have.dns_before) }, at };
    await saveCheck(clientId, kind, domain, result);
    const flags = { ...((have && have.flags) || {}) };
    flags.launch = result.block.map(i => ({ key: `${kind}:${i.text.slice(0, 80)}`, urgent: true, text: `${kind === 'day7' ? 'Day 7 check' : 'Launch day check'}: ${i.text}` }));
    const fields = { domain, flags };
    if (kind === 'after_launch' && !(have && have.launched_at)) fields.launched_at = new Date(at);
    if (kind === 'day7') fields.day7_at = new Date(at);
    await upsert(clientId, fields);
    return result;
  }

  // One month's rankings check. Claimed before it spends, never retried (like the monthly upkeep).
  async function monitorRun(clientId, day) {
    const have = await row(clientId);
    if (!have || !have.launched_at) throw err(400, 'The site hasn\'t launched yet.');
    if (have.monitor.some(m => m.day === day)) return null;
    if (!dfs.configured(env)) throw err(503, 'DataForSEO is not set up on this server.');
    const settings = await getSettings(clientId);
    const monitor = [...have.monitor, { day, status: 'running', started_at: now().toISOString() }];
    await upsert(clientId, { monitor });
    const entry = monitor[monitor.length - 1];
    let cost = 0;
    try {
      const target = targetOf(`https://${have.domain}`);
      const max = Number(settings.monitor_max_usd || 0.5);
      const r = await dfs.rankedKeywords(target, { rowCap: settings.keyword_row_cap, canSpend: est => cost + est <= max, spend: async (c, calls, detail) => { cost += Number(c || 0); await logCost({ kind: 'site_monitor', clientId, cost: c, calls, detail: { target, day, ...detail } }); }, opts: { env } });
      const v = await view(clientId);
      const cmp = monitorCompare(v, r.rows, { drop: Number(settings.monitor_drop ?? 0.5), top: Number(settings.monitor_top ?? 20) });
      Object.assign(entry, { status: 'done', finished_at: now().toISOString(), cost_usd: Math.round(cost * 1e4) / 1e4, rows: r.rows.length, capped: r.capped, pages: cmp.pages, flags: cmp.flags });
      const flags = { ...have.flags, monitor: cmp.flags.map(f => ({ ...f, key: `day${day}:${f.key}`, urgent: true, text: `${day} days after launch: ${f.text}` })) };
      await upsert(clientId, { monitor, flags });
    } catch (e) {
      Object.assign(entry, { status: 'failed', error: e.message, cost_usd: Math.round(cost * 1e4) / 1e4, finished_at: now().toISOString() });
      await upsert(clientId, { monitor });
      log.error('[site-audit] the rankings check failed:', e.message);
    }
    return entry;
  }

  // Hourly: day 7 once, then days 30, 60 and 90. One thing per client per tick.
  async function tick() {
    await ready;
    const { rows } = await pool.query('SELECT client_id FROM site_launches WHERE launched_at IS NOT NULL');
    const done = [];
    for (const { client_id: id } of rows) {
      try {
        const r = await row(id);
        const since = (now() - new Date(r.launched_at)) / DAY;
        if (!r.day7_at && since >= 7) { await launchCheck(id, { kind: 'day7' }); done.push({ id, did: 'day7' }); continue; }
        const due = MONITOR_DAYS.find(d => since >= d && !r.monitor.some(m => m.day === d));
        if (due && dfs.configured(env)) { await monitorRun(id, due); done.push({ id, did: `day${due}` }); }
      } catch (e) { log.error('[site-audit] the launch job:', e.message); }
    }
    return done;
  }

  async function launchView(clientId) {
    const r = await row(clientId);
    if (!r) return null;
    return { domain: r.domain, dns_before: r.dns_before, dns_before_at: r.dns_before_at, launched_at: r.launched_at, day7_at: r.day7_at, monitor: r.monitor, flags: [...(r.flags.launch || []), ...(r.flags.monitor || [])], next: r.launched_at ? nextOf(r) : null };
  }
  const nextOf = r => {
    const at = d => new Date(new Date(r.launched_at).getTime() + d * DAY).toISOString();
    if (!r.day7_at) return { what: 'the day 7 check', at: at(7) };
    const d = MONITOR_DAYS.find(x => !r.monitor.some(m => m.day === x));
    return d ? { what: `the ${d} day rankings check`, at: at(d) } : null;
  };

  // Clears the launch, so a mistaken press can be undone before day 7. The DNS snapshot stays.
  async function undoLaunch(clientId) {
    const r = await row(clientId);
    if (!r || !r.launched_at) throw err(400, 'The site isn\'t marked launched.');
    if (r.day7_at || r.monitor.length) throw err(400, 'The day 7 check has run, so the launch can\'t be undone.');
    await upsert(clientId, { launched_at: null, flags: { ...r.flags, launch: [] } });
    return launchView(clientId);
  }

  return { snapshotDns, launchCheck, monitorRun, tick, launchView, undoLaunch, row };
}

// The red flags for Tell Brandon: one list per client
async function loadMigrationFlags(pool) {
  const out = new Map();
  try {
    const { rows } = await pool.query('SELECT client_id, flags FROM site_launches');
    for (const r of rows) { const f = parse(r.flags) || {}; const list = [...(f.launch || []), ...(f.monitor || [])]; if (list.length) out.set(r.client_id, list); }
  } catch (_) {} // the table isn't there yet
  return out;
}

module.exports = { liveUrlCheck, dnsSnapshot, dnsCompare, searchCovered, contentCheck, monitorCompare, createLaunch, ensureLaunchTable, loadMigrationFlags, homeOf, DKIM_SELECTORS, MONITOR_DAYS };
