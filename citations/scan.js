'use strict';

// ── Scan directories ──────────────────────────────────────────────────────────────
// Where is the business listed, and does each listing's NAP match the master record?
//
// Finding the listings (3 Nov, after two live runs): Google no longer honours a site: search,
// so one search per directory found almost nothing and sometimes an unrelated page. The scan
// now searches the way a person would: the business name, with and without the base town,
// through DataForSEO's queued endpoint at depth 100 (about half a cent a search), and reads
// every result whose site is a directory in the database. A result is a listing when its
// title or snippet carries the name (or the phone); on a social site the link must be the
// business's own page, not a post. Google wraps some results in a google.com/goto link that
// cannot be followed, so the site comes from the breadcrumb and such a listing is read from
// its snippet. Sites in the results that are not in the database are reported as "also
// listed on" for the gap check and the database. A saved URL or a backlink from the
// directory to the client's site counts before any search. "Not found" therefore means: not
// in Google's top 100 for the name, which a person's own search would also miss.
//
// Reading a listing: DataForSEO's OnPage content parsing (JavaScript on; the directories
// refuse a direct request), else the search snippet ("NAP from snippet, low confidence").
// The method is on every row. Confidence: high (name and phone or postcode on the page),
// medium (one of them: listed, NAP needs review), low (neither, or a snippet only). A listing
// in another town is a wrong location. Statuses set by hand are never moved. Every DataForSEO
// cost is summed on the scan row and logged. A one row scan (the Verify link, a row's Scan
// button) uses the live search so the person is not kept waiting.

const DFS = require('./dataforseo');
const { compareNap, namesMatch, normPhone, postcodeOf } = require('./nap');
const { extractNapFromText, extractNapFromSnippet, hostOf } = require('./listing');
const { registrableDomain } = require('./seed');
const { normaliseName } = require('../locations/places');

const HAND_STATUSES = new Set(['waiting_on_client', 'client_declined']);
const SOCIAL = { 'facebook.com': /^\/(?!p\/|posts\/|groups\/|events\/|photo|watch|reel|marketplace)[A-Za-z0-9._-]+\/?$/, 'instagram.com': /^\/(?!p\/|reel\/|explore\/|stories\/)[A-Za-z0-9._]+\/?$/, 'linkedin.com': /^\/(company|in|showcase)\/[^/]+\/?$/, 'x.com': /^\/[A-Za-z0-9_]+\/?$/, 'twitter.com': /^\/[A-Za-z0-9_]+\/?$/ };
const DEPTH = 100;
const str = v => (v == null ? '' : String(v)).trim();
const json = v => (v == null ? null : JSON.stringify(v));
const onDomain = (host, domain) => !!host && !!domain && (host === domain || host.endsWith('.' + domain));
const nameWords = name => str(name).toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !['limited', 'services', 'company'].includes(w));
const inSnippet = (i, nap) => { const phone = normPhone(nap.phone); const t = `${i.title || ''} ${i.description || ''}`; return namesMatch(i.title, nap.name) || namesMatch(i.description, nap.name) || t.toLowerCase().includes(str(nap.name).toLowerCase()) || (phone.length >= 10 && normPhone(t).includes(phone)); };

// The phone as people write it, for a quoted search: the digits, and the spaced form
// (023 8044 5123 for a 02 number, 07580 412717 or 01962 123456 for the rest)
function phoneForms(phone) {
  const d = normPhone(phone);
  if (d.length !== 11) return d.length >= 10 ? [d] : [];
  const spaced = d.startsWith('02') ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : `${d.slice(0, 5)} ${d.slice(5)}`;
  return [spaced, d];
}

// The searches a person would make for the business: the name with the town, the name alone,
// the phone in both forms (3 Nov, Brandon), and the name with the postcode when there is one
function discoveryQueries(nap, town) {
  const name = str(nap.name);
  if (!name) return [];
  const qs = [`"${name}" ${str(town)}`.trim(), `"${name}"`];
  for (const f of phoneForms(nap.phone)) qs.push(`"${f}"`);
  const pc = nap.address ? postcodeOf(nap.address) : '';
  if (pc) qs.push(`"${name}" ${pc.slice(0, -3)} ${pc.slice(-3)}`);
  return [...new Set(qs)];
}

// A search result whose title carries no word of the name but whose snippet carries the phone: a list page
// (a category, a town search, a "check a business" page) the business appears on, not its listing
const listPageHit = (item, nap) => !!item && phoneIn(item, nap) && !nameWords(nap.name).some(w => str(item.title).toLowerCase().includes(w)) && !namesMatch(item.title, nap.name);
const phoneIn = (item, nap) => { const p = normPhone(nap.phone); return p.length >= 10 && normPhone(`${item.title || ''} ${item.description || ''}`).includes(p); };

// Is this result the business's listing on this directory? A result carrying the phone number is
// one whatever the name says. Social sites: the page itself, with a word of the name in its address;
// a post, a reel or a stranger's company page is not a listing
function accept(item, nap, dir) {
  if (phoneIn(item, nap) && !SOCIAL[dir.domain]) return true;
  if (!inSnippet(item, nap)) return false;
  const rule = SOCIAL[dir.domain];
  if (!rule) return true;
  const path = (() => { try { return item.url && !item.goto ? new URL(item.url).pathname : ''; } catch (_) { return ''; } })();
  const crumb = String(item.breadcrumb || '').replace(/^https?:\/\/[^\s›]+/, '').replace(/\s*›\s*/g, '/').replace(/\s+/g, '').toLowerCase();
  const where = path || crumb;
  if (!where || !rule.test(path || ('/' + crumb.replace(/^\/+/, '')))) return false;
  const words = nameWords(nap.name);
  return !words.length || words.some(w => where.toLowerCase().includes(w));
}

// The name searches, matched to the directory database. directories: [{ id, name, domain, ... }] with a domain.
// Returns { queries, results: Map query → { items, cost, error }, hits: Map directory domain → [item], others: Map site → [item], cost }
async function discover({ nap, town, directories, dfs, opts = {}, live = false, depth = DEPTH, spend = () => {} }) {
  const queries = discoveryQueries(nap, town);
  const results = new Map();
  if (live || !dfs.serpMany) {
    for (const q of queries) {
      try { const r = await dfs.serp(q, { ...opts, depth: Math.min(depth, 100) }); results.set(q, { items: r.items, cost: r.cost }); }
      catch (e) { results.set(q, { items: [], cost: 0, error: e.message }); }
    }
  } else {
    const m = await dfs.serpMany(queries, { ...opts, depth });
    for (const q of queries) results.set(q, m.get(q) || { items: [], cost: 0, error: 'no answer' });
  }
  let cost = 0;
  for (const [, r] of results) { cost += Number(r.cost) || 0; spend(r.cost || 0, 1, { search: true }); }
  const byDomain = new Map(directories.filter(d => d.domain).map(d => [d.domain, d]));
  const hits = new Map(), others = new Map(), seenUrl = new Set();
  for (const [q, r] of results) {
    for (const item of r.items || []) {
      const site = str(item.site || (item.url && !item.goto ? hostOf(item.url) : ''));
      if (!site) continue;
      const key = item.goto ? `${site}|${item.title}` : item.url;
      if (seenUrl.has(key)) continue;
      seenUrl.add(key);
      const reg = registrableDomain(site);
      const dir = byDomain.get(reg) || [...byDomain.values()].find(d => onDomain(site, d.domain));
      const tagged = { ...item, site, query: q };
      if (dir) {
        if (!accept(tagged, nap, dir)) continue;
        if (!hits.has(dir.domain)) hits.set(dir.domain, []);
        hits.get(dir.domain).push(tagged);
      } else if (inSnippet(tagged, nap) && !/^(google\.|maps\.google|youtube\.|bing\.com$)/.test(site) && reg !== registrableDomain(hostOf(nap.website))) {
        if (!others.has(reg)) others.set(reg, []);
        others.get(reg).push(tagged);
      }
    }
  }
  return { queries, results, hits, others, cost: Math.round(cost * 1e4) / 1e4, errors: [...results].filter(([, r]) => r.error).map(([q, r]) => `${q}: ${r.error}`) };
}

// The listing for one directory from what the scan knows: the saved URL, a backlink, the search hits
function listingFor({ dir, row, backlinks, hits, nap }) {
  if (row.live_url) return { url: row.live_url, how: row.live_url_source === 'onboarding' ? 'the page link from onboarding' : 'the saved listing URL', item: null };
  const bl = (backlinks || []).find(b => onDomain(b.domain_from, dir.domain));
  if (bl) return { url: bl.url_from, how: 'a backlink to the client\'s site', item: null };
  const all = hits.get(dir.domain) || [];
  const hit = (nap && all.find(h => !listPageHit(h, nap))) || all[0]; // a listing page before a list page that carries the phone
  if (hit) return { url: hit.goto ? '' : hit.url, how: `the name search (${hit.query})`, item: hit, goto: !!hit.goto };
  return null;
}

// Read the page and compare. Returns the fields to write on the row.
async function checkListing({ dir, found, nap, towns, dfs, opts, spend }) {
  const base = { how: found.how, url: found.url || '', at: new Date().toISOString(), breadcrumb: found.item ? found.item.breadcrumb : '' };
  let ex = null, method = '', read = null;
  // The phone on a list page: the business is on this directory, but this page is not its listing. Not read
  // (the page would show the phone beside many names); the listing itself is found by hand
  if (listPageHit(found.item, nap)) {
    return { listed: 'yes', live_url: '', nap_status: 'needs_review', nap_diffs: [], scan: { ...base, method: 'search snippet', fetched: false, confidence: 'medium', found: { name: '', phones: [normPhone(nap.phone)], postcodes: [], address: '', locality: '', websites: [], source: 'snippet' }, verified: ['phone'], missing: ['name', 'address'], reason: `the phone number is on a list page on this directory (${str(found.item.title).slice(0, 80)}), not on a listing page: open the directory and search the name for the listing URL`, candidate: found.url || '' }, wrong_location: false };
  }
  if (found.url) {
    try {
      read = await dfs.contentParsing(found.url, opts);
      spend(read.cost, 1, { onpage: found.url, status: read.status });
      if (read.ok) { ex = extractNapFromText(read.text, read.titles); method = 'DataForSEO content parsing'; }
    } catch (e) { read = { ok: false, status: null, error: e.message }; }
  }
  let snippet = false;
  if (!ex && found.item) { ex = extractNapFromSnippet(found.item); method = 'search snippet'; snippet = true; }
  if (!ex) {
    const why = found.goto ? 'Google hid the link and gave no snippet' : read && read.error ? read.error : `HTTP ${read && read.status != null ? read.status : '?'}`;
    return { listed: found.how.startsWith('the name search') ? 'unchecked' : 'yes', live_url: found.url || '', nap_status: 'needs_review', nap_diffs: [], scan: { ...base, method: 'none', fetched: false, http_status: read && read.status, confidence: 'low', reason: `the listing page could not be read through DataForSEO (${why})` }, wrong_location: false };
  }
  const cmp = compareNap({ name: nap.name, phone: nap.phone, address: nap.address || '', website: nap.website }, { name: ex.names, phones: ex.phones, address: ex.address, postcodes: ex.postcodes, websites: ex.websites });
  let nameOk = cmp.verified.includes('name');
  const phoneOk = cmp.verified.includes('phone'), addrOk = cmp.verified.includes('address');
  const phoneOnPage = phoneOk || ex.phones.some(p => normPhone(p) === normPhone(nap.phone));
  const postcodeOnPage = addrOk || (nap.address && ex.postcodes.includes(postcodeOf(nap.address)));
  // The phone on the page is the business (3 Nov, Brandon): high confidence even when the name differs a
  // little; a name that shares a word with the record's passes, one with nothing in common stays a mismatch
  if (phoneOnPage && !nameOk) {
    const words = nameWords(nap.name);
    const shares = ex.names.some(n => { const w = nameWords(n); return words.some(x => w.includes(x)); });
    if (shares) { nameOk = true; cmp.diffs = cmp.diffs.filter(d => d.field !== 'name'); cmp.verified.push('name (by phone)'); cmp.status = cmp.diffs.length ? 'mismatch' : 'match'; }
  }
  let confidence = phoneOnPage || (nameOk && postcodeOnPage) ? 'high' : nameOk ? 'medium' : 'low';
  if (snippet && !phoneOnPage) confidence = 'low';
  if (snippet && phoneOnPage) confidence = 'high';
  const locality = str(ex.locality);
  const wrong = !!locality && towns.size > 0 && !towns.has(normaliseName(locality)) && nameOk;
  const scan = { ...base, method, fetched: !!(read && read.ok), http_status: read && read.status, confidence, found: { name: ex.name || ex.names[0] || '', phones: ex.phones.slice(0, 5), postcodes: ex.postcodes.slice(0, 5), address: ex.address, locality, websites: ex.websites.slice(0, 5), source: ex.source }, verified: cmp.verified, missing: cmp.missing };
  if (snippet) {
    // A snippet with the phone number is the business: listed, high confidence, the NAP from what the snippet shows
    if (phoneOnPage) return { listed: 'yes', live_url: found.url || '', nap_status: cmp.diffs.length ? 'mismatch' : 'needs_review', nap_diffs: cmp.diffs, scan: { ...scan, reason: `NAP from snippet, the phone number is in it${found.goto ? ' (Google hid the link: open the directory and search the name)' : ''}`, candidate: found.url || '' }, wrong_location: false };
    return { listed: nameOk ? 'yes' : 'unchecked', live_url: nameOk ? (found.url || '') : '', nap_status: 'needs_review', nap_diffs: [], scan: { ...scan, reason: found.goto ? 'NAP from snippet, low confidence (Google hid the link: open the directory and search the name)' : 'NAP from snippet, low confidence', diffs_unconfirmed: cmp.diffs, candidate: found.url || '' }, wrong_location: false };
  }
  if (confidence === 'low') return { listed: 'unchecked', live_url: '', nap_status: 'needs_review', nap_diffs: [], scan: { ...scan, reason: 'neither the name nor the phone is on the page: check by hand', candidate: found.url }, wrong_location: false };
  const napStatus = !nameOk ? 'needs_review' : cmp.status === 'mismatch' ? 'mismatch' : confidence === 'high' ? cmp.status : 'needs_review';
  return { listed: 'yes', live_url: found.url, nap_status: napStatus, nap_diffs: nameOk ? cmp.diffs : [], scan: { ...scan, diffs_unconfirmed: nameOk ? undefined : cmp.diffs, reason: confidence === 'medium' ? `only the ${nameOk ? 'name' : 'phone'} was found on the page` : '' }, wrong_location: wrong };
}

function nextStatus(current, result) {
  if (HAND_STATUSES.has(current)) return current;
  if (result.listed !== 'yes') return current === 'live' || current === 'needs_fixing' || current === 'wrong_location' ? 'not_started' : current;
  if (result.wrong_location) return 'wrong_location';
  if (result.nap_status === 'mismatch') return 'needs_fixing';
  if (result.nap_status === 'match') return 'live';
  return current === 'not_started' ? 'submitted' : current; // found but not sure: it exists, keep what a person set
}

// dfs: citations/dataforseo.js (or a fake); concurrency: pages read at once
function createScanner({ pool, store, clientCitations, dfs = DFS, env = process.env, log = console, concurrency = 2, depth = DEPTH }) {
  const running = new Map(); // clientId → the live scan row

  async function latest(clientId) {
    const { rows } = await pool.query(`SELECT * FROM citation_scans WHERE client_id = $1 ORDER BY started_at DESC LIMIT 1`, [clientId]);
    const r = rows[0];
    return r ? { ...r, cost_usd: Number(r.cost_usd), calls: Number(r.calls), rows_total: Number(r.rows_total), rows_done: Number(r.rows_done), found: Number(r.found), summary: r.summary ? JSON.parse(r.summary) : null, running: r.status === 'running' } : null;
  }
  async function status(clientId) { return running.get(clientId) || (await latest(clientId)); }

  async function writeRow(clientId, directoryId, result, statusNow, now) {
    const location = await clientCitations.primaryLocation(clientId);
    const { rows: ex } = await pool.query(`SELECT id, live_url FROM client_citations WHERE client_id = $1 AND location_id = $2 AND directory_id = $3`, [clientId, location.id, directoryId]);
    const live = result.live_url || (ex[0] && ex[0].live_url) || '';
    if (ex.length) await pool.query(`UPDATE client_citations SET listed = $2, live_url = $3, nap_status = $4, nap_diffs = $5, status = $6, scan = $7, last_scanned_at = $8, updated_at = $8 WHERE id = $1`, [ex[0].id, result.listed, live, result.nap_status, json(result.nap_diffs || []), statusNow, json(result.scan), now]);
    else await pool.query(`INSERT INTO client_citations (client_id, location_id, directory_id, listed, live_url, nap_status, nap_diffs, status, scan, last_scanned_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`, [clientId, location.id, directoryId, result.listed, live, result.nap_status, json(result.nap_diffs || []), statusNow, json(result.scan), now]);
  }

  // The scan itself. directoryId: one row only (the Verify link and the row's Scan button), with the live search
  async function run(clientId, { directoryId = null, now = () => new Date() } = {}) {
    if (running.has(clientId)) throw Object.assign(new Error('A scan is already running for this client.'), { status: 409 });
    if (!dfs.configured(env)) throw Object.assign(new Error('DataForSEO is not set up on this server (DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD).'), { status: 503 });
    const view = await clientCitations.view(clientId);
    const all = view.tiers.flatMap(t => t.rows);
    const targets = directoryId ? all.filter(r => r.directory.id === directoryId) : all;
    if (directoryId && !targets.length) throw Object.assign(new Error('That directory is not on this client\'s list.'), { status: 404 });
    const nap = view.nap;
    if (!nap.name) throw Object.assign(new Error('The master NAP has no business name: fill in the client values first.'), { status: 400 });
    const towns = new Set(view.territory.towns.map(normaliseName));
    const { rows: ins } = await pool.query(`INSERT INTO citation_scans (client_id, status, scope, rows_total) VALUES ($1, 'running', $2, $3) RETURNING id`, [clientId, directoryId ? 'one' : 'all', targets.length]);
    const scanId = ins[0].id;
    const state = { id: scanId, client_id: clientId, running: true, status: 'running', scope: directoryId ? 'one' : 'all', started_at: now().toISOString(), rows_total: targets.length, rows_done: 0, found: 0, cost_usd: 0, calls: 0, detail: [], phase: 'searching' };
    running.set(clientId, state);
    const spend = (cost, calls = 1, what = null) => { state.cost_usd = Math.round((state.cost_usd + (Number(cost) || 0)) * 1e4) / 1e4; state.calls += calls; if (what) state.detail.push(what); };
    const opts = { env, retryDelays: [4000] };
    const summary = { queries: [], found: [], not_found: [], needs_review: [], skipped: [], errors: [], methods: {}, also_listed: [], search_errors: [] };
    try {
      // One backlinks call per full scan: the pages linking to the client's site
      let backlinks = [];
      const siteHost = hostOf(nap.website);
      if (!directoryId && siteHost) {
        try { const r = await dfs.backlinks(siteHost, opts); backlinks = r.items; spend(r.cost, 1, { backlinks: siteHost, results: r.items.length }); }
        catch (e) { summary.errors.push(`backlinks: ${e.message}`); log.warn(`[citations] backlinks for ${siteHost} failed: ${e.message}`); }
      }
      // The name searches, once for the whole list (queued), or live for one row
      const directories = await store.list({ includeRetired: true });
      const disc = await discover({ nap, town: view.base_town, directories, dfs, opts, live: !!directoryId, depth, spend });
      summary.queries = disc.queries;
      summary.results = Object.fromEntries([...disc.results].map(([q, r]) => [q, (r.items || []).length])); // results per search, for the report
      summary.search_errors = disc.errors;
      summary.also_listed = [...disc.others].map(([site, items]) => ({ site, url: items[0].goto ? '' : items[0].url, title: items[0].title, count: items.length }));
      if (disc.errors.length === disc.queries.length && disc.queries.length) throw new Error(`every name search failed: ${disc.errors.join('; ')}`);
      state.phase = 'reading';
      const queue = [...targets];
      const worker = async () => {
        for (let r = queue.shift(); r; r = queue.shift()) {
          const dir = r.directory, row = r.row, at = now();
          try {
            if (!dir.domain) { summary.skipped.push({ directory: dir.name, reason: 'no fixed domain: check by hand' }); await writeRow(clientId, dir.id, { listed: row.listed, live_url: '', nap_status: row.nap_status, nap_diffs: row.nap_diffs, scan: { how: 'skipped', reason: 'no fixed domain (a pattern or a site with no URL yet): check by hand', at: at.toISOString() } }, row.status, at); continue; }
            const found = listingFor({ dir, row, backlinks, hits: disc.hits, nap });
            if (!found) {
              summary.not_found.push(dir.name);
              const result = { listed: 'no', live_url: '', nap_status: 'unchecked', nap_diffs: [], scan: { how: 'not found', method: 'search', reason: `not in Google's top ${depth} for the name (${disc.queries.length} searches)`, at: at.toISOString() } };
              await writeRow(clientId, dir.id, result, nextStatus(row.status, result), at);
              continue;
            }
            const result = await checkListing({ dir, found, nap, towns, dfs, opts, spend });
            summary.methods[result.scan.method || 'none'] = (summary.methods[result.scan.method || 'none'] || 0) + 1;
            if (result.listed === 'yes') state.found++;
            (result.nap_status === 'needs_review' ? summary.needs_review : summary.found).push({ directory: dir.name, url: found.url, nap: result.nap_status, confidence: result.scan.confidence, method: result.scan.method, reason: result.scan.reason || '', wrong_location: result.wrong_location, diffs: result.nap_diffs });
            await writeRow(clientId, dir.id, result, nextStatus(row.status, result), at);
          } catch (e) {
            summary.errors.push(`${dir.name}: ${e.message}`);
            log.warn(`[citations] scan of ${dir.name} failed: ${e.message}`);
            await writeRow(clientId, dir.id, { listed: row.listed, live_url: '', nap_status: row.nap_status, nap_diffs: row.nap_diffs, scan: { how: 'failed', reason: `the check failed: ${e.message}. Scan this row again later.`, error: e.message, at: at.toISOString() } }, row.status, at).catch(() => {});
          } finally { state.rows_done++; }
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
      state.status = 'done';
    } catch (e) {
      state.status = 'failed'; state.error = e.message;
      log.error(`[citations] scan ${scanId} failed: ${e.message}`);
    } finally {
      state.running = false; state.finished_at = now().toISOString();
      await pool.query(`UPDATE citation_scans SET status = $2, finished_at = $3, rows_done = $4, found = $5, cost_usd = $6, calls = $7, summary = $8, error = $9 WHERE id = $1`, [scanId, state.status, now(), state.rows_done, state.found, state.cost_usd, state.calls, json({ ...summary, calls: state.detail }), state.error || null]);
      await store.logCost({ kind: directoryId ? 'scan_one' : 'scan', clientId, cost: state.cost_usd, calls: state.calls, detail: { scan_id: scanId, rows: state.rows_total, found: state.found } }).catch(() => {});
      running.delete(clientId);
    }
    return { ...state, summary };
  }

  // Start in the background (the routes); the tab polls status()
  async function start(clientId, { directoryId = null } = {}) {
    if (running.has(clientId)) throw Object.assign(new Error('A scan is already running for this client.'), { status: 409 });
    if (directoryId) return run(clientId, { directoryId }); // one row: quick enough to wait for
    const p = run(clientId, {});
    p.catch(() => {});
    await new Promise(r => setTimeout(r, 50));
    return status(clientId);
  }

  return { run, start, status, latest, discover, listingFor, checkListing, nextStatus };
}

module.exports = { createScanner, discover, discoveryQueries, phoneForms, accept, listPageHit, listingFor, checkListing, nextStatus, onDomain, inSnippet, DEPTH, SOCIAL };
