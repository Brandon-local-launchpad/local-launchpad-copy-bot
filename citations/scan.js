'use strict';

// ── Scan directories ──────────────────────────────────────────────────────────────
// For each directory on the client's list, find the listing and check its NAP:
//   1. the saved listing URL, when the row has one
//   2. else the client's backlinks (one DataForSEO backlinks call per scan, target the
//      client's site): a referring page on the directory's domain is the listing
//   3. else a DataForSEO SERP: site:<directory domain> "<business name>", the first organic
//      result on that domain whose title or snippet carries the name
//   4. else the same with the phone number as the record writes it
// The page found is fetched and read (citations/listing.js) and compared with the master
// NAP (citations/nap.js). The row gets listed yes or no, the URL, the NAP status with the
// differing fields, the status, the scan detail and the time. Confidence:
//   high      the name and the phone (or the postcode) are on the page: listed, NAP match or mismatch
//   medium    the name alone, or the phone alone: listed, NAP needs review (no guessing)
//   low       neither: not written as listed; the candidate URL is kept in the scan detail
//             under needs review for a person to look at
// A page that cannot be read (a login wall, a refusal, a timeout) keeps the URL, if there was
// one, and goes to needs review with the reason. A listing whose town is not one of the
// client's towns is a wrong location. Statuses set by hand (waiting on client, client
// declined) are never moved by a scan. Every DataForSEO cost is summed on the scan row and
// logged (citation_api_costs, kind "scan"). Directories with no fixed domain (the newspaper
// patterns, city sites with no URL yet) are skipped with a note.

const DFS = require('./dataforseo');
const { compareNap, namesMatch, normPhone } = require('./nap');
const { fetchPage, extractNap, hostOf } = require('./listing');
const { normaliseName } = require('../locations/places');

const HAND_STATUSES = new Set(['waiting_on_client', 'client_declined']);
const SOCIAL = new Set(['facebook.com', 'instagram.com', 'linkedin.com']);
const str = v => (v == null ? '' : String(v)).trim();
const json = v => (v == null ? null : JSON.stringify(v));
const onDomain = (host, domain) => !!host && !!domain && (host === domain || host.endsWith('.' + domain));

// The listing page for one directory, from what the scan already knows. Returns
// { url, how } or null; calls the SERP when the backlinks and the saved URL give nothing.
async function findListing({ dir, row, nap, backlinks, dfs, opts, spend }) {
  if (row.live_url) return { url: row.live_url, how: row.live_url_source === 'onboarding' ? 'the page link from onboarding' : 'the saved listing URL' };
  const bl = backlinks.find(b => onDomain(b.domain_from, dir.domain));
  if (bl) return { url: bl.url_from, how: 'a backlink to the client\'s site' };
  if (!nap.name) return null;
  const serp = async (q, test) => {
    const r = await dfs.serp(q, opts);
    spend(r.cost, 1, { serp: q, results: r.items.length });
    return r.items.find(i => onDomain(hostOf(i.url), dir.domain) && test(i)) || null;
  };
  const byName = await serp(`site:${dir.domain} "${nap.name}"`, i => namesMatch(i.title, nap.name) || namesMatch(i.description, nap.name) || str(i.title + ' ' + i.description).toLowerCase().includes(nap.name.toLowerCase()));
  if (byName) return { url: byName.url, how: `a search for the name on ${dir.domain}` };
  const phone = normPhone(nap.phone);
  if (phone.length >= 10) {
    const display = str(nap.phone);
    // A phone search result counts only when the snippet or title carries the number or the name
    // (3 Nov: the live run took an unrelated Leeds page off yell.com otherwise)
    const byPhone = await serp(`site:${dir.domain} "${display}"`, i => normPhone(i.description).includes(phone) || normPhone(i.title).includes(phone) || namesMatch(i.title, nap.name) || namesMatch(i.description, nap.name));
    if (byPhone) return { url: byPhone.url, how: `a search for the phone number on ${dir.domain}` };
  }
  return null;
}

// Read the page and compare. Returns the fields to write on the row.
async function checkListing({ dir, found, nap, towns, fetchFn }) {
  const page = await fetchPage(found.url, { fetchFn });
  const base = { how: found.how, url: found.url, final_url: page.finalUrl, fetched: page.ok, http_status: page.status, at: new Date().toISOString() };
  if (!page.ok) {
    return { listed: SOCIAL.has(dir.domain) || found.how !== `a search for the phone number on ${dir.domain}` ? 'yes' : 'unchecked', live_url: found.url, nap_status: 'needs_review', nap_diffs: [], scan: { ...base, confidence: 'low', reason: `the listing page could not be read: ${page.reason}` }, wrong_location: false };
  }
  const ex = extractNap(page.html, { domain: dir.domain });
  const cmp = compareNap({ name: nap.name, phone: nap.phone, address: nap.address || '', website: nap.website }, { name: ex.names, phones: ex.phones, address: ex.address, postcodes: ex.postcodes, websites: ex.websites });
  const nameOk = cmp.verified.includes('name'), phoneOk = cmp.verified.includes('phone'), addrOk = cmp.verified.includes('address');
  const phoneOnPage = phoneOk || ex.phones.some(p => normPhone(p) === normPhone(nap.phone));
  const postcodeOnPage = addrOk || (nap.address && ex.postcodes.includes(require('./nap').postcodeOf(nap.address)));
  const confidence = nameOk && (phoneOnPage || postcodeOnPage) ? 'high' : nameOk || phoneOnPage ? 'medium' : 'low';
  // The town on the listing against the client's towns (a listing in another town is a wrong location)
  const locality = str(ex.locality);
  const wrong = !!locality && towns.size > 0 && !towns.has(normaliseName(locality)) && nameOk;
  const scan = { ...base, confidence, found: { name: ex.name || ex.names[0] || '', phones: ex.phones.slice(0, 5), postcodes: ex.postcodes.slice(0, 5), address: ex.address, locality, websites: ex.websites.slice(0, 5), source: ex.source }, verified: cmp.verified, missing: cmp.missing };
  if (confidence === 'low') return { listed: 'unchecked', live_url: '', nap_status: 'needs_review', nap_diffs: [], scan: { ...scan, reason: 'neither the name nor the phone is on the page: check by hand', candidate: found.url }, wrong_location: false };
  // A page without the business name on it may not be the client's listing at all (a category
  // page carrying the phone): its differences are kept for a person, not reported as a mismatch
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

// dfs: citations/dataforseo.js (or a fake); fetchFn: fetch (or a fake); concurrency: pages read at once
function createScanner({ pool, store, clientCitations, dfs = DFS, fetchFn = global.fetch, env = process.env, log = console, concurrency = 2 }) {
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

  // The scan itself. directoryId: one row only (the Verify link and the row's Scan button)
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
    const state = { id: scanId, client_id: clientId, running: true, status: 'running', scope: directoryId ? 'one' : 'all', started_at: now().toISOString(), rows_total: targets.length, rows_done: 0, found: 0, cost_usd: 0, calls: 0, detail: [] };
    running.set(clientId, state);
    const spend = (cost, calls = 1, what = null) => { state.cost_usd = Math.round((state.cost_usd + (Number(cost) || 0)) * 1e4) / 1e4; state.calls += calls; if (what) state.detail.push(what); };
    // One retry after 4 s: DataForSEO's "Internal SE Server Error" rarely clears within a minute, and
    // three waits per failing row made the first live run take six minutes
    const opts = { env, retryDelays: [4000] };
    const summary = { found: [], not_found: [], needs_review: [], skipped: [], errors: [] };
    try {
      // One backlinks call per full scan: the pages linking to the client's site
      let backlinks = [];
      const siteHost = hostOf(nap.website);
      if (!directoryId && siteHost) {
        try { const r = await dfs.backlinks(siteHost, opts); backlinks = r.items; spend(r.cost, 1, { backlinks: siteHost, results: r.items.length }); }
        catch (e) { summary.errors.push(`backlinks: ${e.message}`); log.warn(`[citations] backlinks for ${siteHost} failed: ${e.message}`); }
      }
      const queue = [...targets];
      const worker = async () => {
        for (let r = queue.shift(); r; r = queue.shift()) {
          const dir = r.directory, row = r.row;
          const at = now();
          try {
            if (!dir.domain) { summary.skipped.push({ directory: dir.name, reason: 'no fixed domain: check by hand' }); await writeRow(clientId, dir.id, { listed: row.listed, live_url: '', nap_status: row.nap_status, nap_diffs: row.nap_diffs, scan: { how: 'skipped', reason: 'no fixed domain (a pattern or a site with no URL yet): check by hand', at: at.toISOString() } }, row.status, at); continue; }
            const found = await findListing({ dir, row, nap, backlinks, dfs, opts, spend });
            if (!found) {
              summary.not_found.push(dir.name);
              const result = { listed: 'no', live_url: '', nap_status: 'unchecked', nap_diffs: [], scan: { how: 'not found', reason: `no page on ${dir.domain} for the name or the phone`, at: at.toISOString() } };
              await writeRow(clientId, dir.id, result, nextStatus(row.status, result), at);
              continue;
            }
            const result = await checkListing({ dir, found, nap, towns, fetchFn });
            if (result.listed === 'yes') state.found++;
            (result.nap_status === 'needs_review' ? summary.needs_review : summary.found).push({ directory: dir.name, url: found.url, nap: result.nap_status, confidence: result.scan.confidence, wrong_location: result.wrong_location });
            await writeRow(clientId, dir.id, result, nextStatus(row.status, result), at);
          } catch (e) {
            summary.errors.push(`${dir.name}: ${e.message}`);
            log.warn(`[citations] scan of ${dir.name} failed: ${e.message}`);
            // The row keeps what it had and says why the scan could not look (DataForSEO's search
            // answered "Internal SE Server Error" on 15 of 44 rows in the first live run, 3 Nov)
            await writeRow(clientId, dir.id, { listed: row.listed, live_url: '', nap_status: row.nap_status, nap_diffs: row.nap_diffs, scan: { how: 'failed', reason: `the search failed: ${e.message}. Scan this row again later.`, at: at.toISOString() } }, row.status, at).catch(() => {});
            if (!DFS.configured(env) || /DataForSEO is not set up|no credit|40101/.test(e.message)) throw e;
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

  return { run, start, status, latest, findListing, checkListing, nextStatus };
}

module.exports = { createScanner, findListing, checkListing, nextStatus, onDomain };
