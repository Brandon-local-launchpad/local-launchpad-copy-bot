'use strict';

// ── Scan directories ──────────────────────────────────────────────────────────────
// For each directory on the client's list, find the listing and check its NAP:
//   1. the saved listing URL, when the row has one
//   2. else the client's backlinks (one DataForSEO backlinks call per scan, target the
//      client's site): a referring page on the directory's domain is the listing
//   3. else a DataForSEO SERP: site:<directory domain> "<business name>", the first organic
//      result on that domain whose title or snippet carries the name
//   4. else the same with the phone number as the record writes it, accepted only when the
//      title or snippet carries the number or the name
// The page found is read through DataForSEO's OnPage content parsing (JavaScript on; 3 Nov:
// every listing page answered 403 to a direct request) and compared with the master NAP
// (citations/nap.js). When the page still cannot be read, the search result's title and
// snippet are read instead and the row says "NAP from snippet, low confidence". The method
// used is on every row (scan.method). Confidence:
//   high      the name and the phone (or the postcode) are on the page: listed, NAP match or mismatch
//   medium    the name alone, or the phone alone: listed, NAP needs review (no guessing)
//   low       neither, or a snippet only: not written as listed unless the name is in the
//             title; the candidate kept in the scan detail under needs review
// A listing whose town is not one of the client's towns is a wrong location. Statuses set by
// hand (waiting on client, client declined) are never moved by a scan. A search that fails
// at DataForSEO is tried again in a second and third pass after a pause; a row that still
// fails keeps what it had and says why. Every DataForSEO cost is summed on the scan row and
// logged (citation_api_costs, kind "scan"). Directories with no fixed domain (the newspaper
// patterns, city sites with no URL yet) are skipped with a note.

const DFS = require('./dataforseo');
const { compareNap, namesMatch, normPhone, postcodeOf } = require('./nap');
const { extractNapFromText, extractNapFromSnippet, hostOf } = require('./listing');
const { normaliseName } = require('../locations/places');

const HAND_STATUSES = new Set(['waiting_on_client', 'client_declined']);
const SOCIAL = new Set(['facebook.com', 'instagram.com', 'linkedin.com']);
const RETRY_PASSES = 2;
const RETRY_PAUSE_MS = 20000;
const str = v => (v == null ? '' : String(v)).trim();
const json = v => (v == null ? null : JSON.stringify(v));
const onDomain = (host, domain) => !!host && !!domain && (host === domain || host.endsWith('.' + domain));
const inSnippet = (i, nap) => { const phone = normPhone(nap.phone); const t = `${i.title || ''} ${i.description || ''}`; return namesMatch(i.title, nap.name) || namesMatch(i.description, nap.name) || t.toLowerCase().includes(str(nap.name).toLowerCase()) || (phone.length >= 10 && normPhone(t).includes(phone)); };

// The listing page for one directory, from what the scan already knows. Returns
// { url, how, item } or null; calls the SERP when the backlinks and the saved URL give nothing.
// spend(cost, calls, what) records the DataForSEO spend; it may throw to stop (a spend cap).
async function findListing({ dir, row, nap, backlinks, dfs, opts, spend }) {
  if (row.live_url) return { url: row.live_url, how: row.live_url_source === 'onboarding' ? 'the page link from onboarding' : 'the saved listing URL', item: null };
  const bl = (backlinks || []).find(b => onDomain(b.domain_from, dir.domain));
  if (bl) return { url: bl.url_from, how: 'a backlink to the client\'s site', item: null };
  if (!nap.name) return null;
  const serp = async q => {
    const r = await dfs.serp(q, opts);
    spend(r.cost, 1, { serp: q, results: r.items.length });
    return r.items.find(i => onDomain(hostOf(i.url), dir.domain) && inSnippet(i, nap)) || null;
  };
  const byName = await serp(`site:${dir.domain} "${nap.name}"`);
  if (byName) return { url: byName.url, how: `a search for the name on ${dir.domain}`, item: byName };
  const phone = normPhone(nap.phone);
  if (phone.length >= 10) {
    // Accepted only when the snippet or title carries the number or the name (the first live run took an unrelated page otherwise)
    const byPhone = await serp(`site:${dir.domain} "${str(nap.phone)}"`);
    if (byPhone) return { url: byPhone.url, how: `a search for the phone number on ${dir.domain}`, item: byPhone };
  }
  return null;
}

// Read the page and compare. Returns the fields to write on the row.
async function checkListing({ dir, found, nap, towns, dfs, opts, spend }) {
  const base = { how: found.how, url: found.url, at: new Date().toISOString() };
  let ex = null, method = '', read = null;
  try {
    read = await dfs.contentParsing(found.url, opts);
    spend(read.cost, 1, { onpage: found.url, status: read.status });
    if (read.ok) { ex = extractNapFromText(read.text, read.titles); method = 'DataForSEO content parsing'; }
  } catch (e) { read = { ok: false, status: null, error: e.message }; }
  let snippet = false;
  if (!ex && found.item) { ex = extractNapFromSnippet(found.item); method = 'search snippet'; snippet = true; }
  if (!ex) {
    const why = read && read.error ? read.error : `HTTP ${read && read.status != null ? read.status : '?'}`;
    return { listed: SOCIAL.has(dir.domain) || found.how !== `a search for the phone number on ${dir.domain}` ? 'yes' : 'unchecked', live_url: found.url, nap_status: 'needs_review', nap_diffs: [], scan: { ...base, method: 'none', fetched: false, http_status: read && read.status, confidence: 'low', reason: `the listing page could not be read through DataForSEO (${why}) and the search gave no snippet` }, wrong_location: false };
  }
  const cmp = compareNap({ name: nap.name, phone: nap.phone, address: nap.address || '', website: nap.website }, { name: ex.names, phones: ex.phones, address: ex.address, postcodes: ex.postcodes, websites: ex.websites });
  const nameOk = cmp.verified.includes('name'), phoneOk = cmp.verified.includes('phone'), addrOk = cmp.verified.includes('address');
  const phoneOnPage = phoneOk || ex.phones.some(p => normPhone(p) === normPhone(nap.phone));
  const postcodeOnPage = addrOk || (nap.address && ex.postcodes.includes(postcodeOf(nap.address)));
  let confidence = nameOk && (phoneOnPage || postcodeOnPage) ? 'high' : nameOk || phoneOnPage ? 'medium' : 'low';
  if (snippet) confidence = 'low';
  const locality = str(ex.locality);
  const wrong = !!locality && towns.size > 0 && !towns.has(normaliseName(locality)) && nameOk;
  const scan = { ...base, method, fetched: !!(read && read.ok), http_status: read && read.status, confidence, found: { name: ex.name || ex.names[0] || '', phones: ex.phones.slice(0, 5), postcodes: ex.postcodes.slice(0, 5), address: ex.address, locality, websites: ex.websites.slice(0, 5), source: ex.source }, verified: cmp.verified, missing: cmp.missing };
  if (snippet) {
    // The snippet alone: listed when the name is in the result's title, the NAP left for a person
    return { listed: nameOk ? 'yes' : 'unchecked', live_url: nameOk ? found.url : '', nap_status: 'needs_review', nap_diffs: [], scan: { ...scan, reason: 'NAP from snippet, low confidence', diffs_unconfirmed: cmp.diffs, candidate: found.url }, wrong_location: false };
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

// dfs: citations/dataforseo.js (or a fake); concurrency: rows worked at once
function createScanner({ pool, store, clientCitations, dfs = DFS, env = process.env, log = console, concurrency = 2, retryPasses = RETRY_PASSES, retryPauseMs = RETRY_PAUSE_MS, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
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
    // One retry inside a call (DataForSEO's search errors are transient); the passes below retry the row later
    const opts = { env, retryDelays: [4000] };
    const summary = { found: [], not_found: [], needs_review: [], skipped: [], errors: [], retried: [], methods: {} };
    const failed = new Map(); // directory id → { row, error }
    try {
      // One backlinks call per full scan: the pages linking to the client's site
      let backlinks = [];
      const siteHost = hostOf(nap.website);
      if (!directoryId && siteHost) {
        try { const r = await dfs.backlinks(siteHost, opts); backlinks = r.items; spend(r.cost, 1, { backlinks: siteHost, results: r.items.length }); }
        catch (e) { summary.errors.push(`backlinks: ${e.message}`); log.warn(`[citations] backlinks for ${siteHost} failed: ${e.message}`); }
      }
      const scanRow = async r => {
        const dir = r.directory, row = r.row;
        const at = now();
        if (!dir.domain) { summary.skipped.push({ directory: dir.name, reason: 'no fixed domain: check by hand' }); await writeRow(clientId, dir.id, { listed: row.listed, live_url: '', nap_status: row.nap_status, nap_diffs: row.nap_diffs, scan: { how: 'skipped', reason: 'no fixed domain (a pattern or a site with no URL yet): check by hand', at: at.toISOString() } }, row.status, at); return; }
        const found = await findListing({ dir, row, nap, backlinks, dfs, opts, spend });
        if (!found) {
          summary.not_found.push(dir.name);
          const result = { listed: 'no', live_url: '', nap_status: 'unchecked', nap_diffs: [], scan: { how: 'not found', method: 'search', reason: `no page on ${dir.domain} for the name or the phone`, at: at.toISOString() } };
          await writeRow(clientId, dir.id, result, nextStatus(row.status, result), at);
          return;
        }
        const result = await checkListing({ dir, found, nap, towns, dfs, opts, spend });
        summary.methods[result.scan.method || 'none'] = (summary.methods[result.scan.method || 'none'] || 0) + 1;
        if (result.listed === 'yes') state.found++;
        (result.nap_status === 'needs_review' ? summary.needs_review : summary.found).push({ directory: dir.name, url: found.url, nap: result.nap_status, confidence: result.scan.confidence, method: result.scan.method, reason: result.scan.reason || '', wrong_location: result.wrong_location, diffs: result.nap_diffs });
        await writeRow(clientId, dir.id, result, nextStatus(row.status, result), at);
      };
      const pass = async (list, n) => {
        const queue = [...list];
        const worker = async () => {
          for (let r = queue.shift(); r; r = queue.shift()) {
            try { await scanRow(r); failed.delete(r.directory.id); }
            catch (e) {
              failed.set(r.directory.id, { row: r, error: e.message, pass: n });
              log.warn(`[citations] scan of ${r.directory.name} failed (pass ${n}): ${e.message}`);
              if (!DFS.configured(env) || /DataForSEO is not set up|no credit|40101/.test(e.message)) throw e;
            } finally { if (n === 1) state.rows_done++; }
          }
        };
        await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
      };
      await pass(targets, 1);
      // The rows whose search failed: tried again after a pause, up to retryPasses times
      for (let n = 2; failed.size && n <= 1 + retryPasses; n++) {
        const again = [...failed.values()].map(f => f.row);
        summary.retried.push({ pass: n, rows: again.map(r => r.directory.name) });
        await sleep(retryPauseMs);
        await pass(again, n);
      }
      // What still failed: the error on the row
      for (const [id, f] of failed) {
        const dir = f.row.directory, row = f.row.row, at = now();
        summary.errors.push(`${dir.name}: ${f.error}`);
        await writeRow(clientId, id, { listed: row.listed, live_url: '', nap_status: row.nap_status, nap_diffs: row.nap_diffs, scan: { how: 'failed', method: 'search', reason: `the search failed ${1 + retryPasses} times: ${f.error}. Scan this row again later.`, error: f.error, at: at.toISOString() } }, row.status, at).catch(() => {});
      }
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

module.exports = { createScanner, findListing, checkListing, nextStatus, onDomain, inSnippet };
