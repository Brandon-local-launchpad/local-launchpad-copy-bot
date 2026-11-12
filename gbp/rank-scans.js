'use strict';

// ── Rank scans through Local Falcon (Brandon, 9 Nov 2026) ─────────────────────
// The rules (the LeadSnap ones carried over, with Brandon's changes of 9 Nov):
//   One map per client: keyword = the primary category, lower case, no town; scan_keyword_2
//   optional, same grid. 13 x 13, radius = spacing x 6 (dense city 1000 m = 6 km, city 1500 m =
//   9 km, market town 2000 m = 12 km, rural 2500 m = 15 km).
//   The client is matched by its Google place id only (gbp_place_id); no place id, no scan.
//   Centre: a hidden address service area business (gbp_address_type = service_area) centres on
//   the main town, and that is correct; anyone else on the GBP pin (Local Falcon's saved listing,
//   else Google Places by place id), else a warned fallback. The confirm always says which.
//   Clip: the convex hull of the service area towns plus 3 km; the outlier towns (over 50 km, or
//   over 3 x the median distance) are left out and listed; no town placed blocks the scan.
//   Local Falcon cannot skip points, so the full grid is paid for (169 points a keyword) and
//   Copybot drops the pins outside the clip: they are never stored, drawn or scored.
//   Every score is Copybot's own, from the kept points (gbp/scans.js scorePoints).
//   Baseline on the first run, settings locked. Monthly: Copybot runs the scan itself (no Local
//   Falcon campaign: a campaign cannot take a centre), on the baseline's day of the month capped
//   at 28. At most one scan per client, keyword and calendar month (UK), claimed in
//   rank_scan_claims before the scan starts, so a restart or a retry never runs it twice. The
//   balance is read first: too low, the scan is skipped and an alert written. Every automatic
//   scan is logged with its points and credits. Reset supersedes the rows, clears the lock and
//   runs a new baseline.
// Network: lf (localfalcon/client.js), locate and search (Places). Nothing here runs on page load.

const SC = require('./scans');

const PROVIDER = 'local_falcon';
const str = v => (v == null ? '' : String(v)).trim();
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

// The UK date parts of a moment: { date: 'YYYY-MM-DD', month: 'YYYY-MM', day, hour }
function ukParts(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, month: `${p.year}-${p.month}`, day: Number(p.day), hour: Number(p.hour) % 24 };
}
const runDayOf = iso => Math.min(28, Number(ukParts(new Date(iso)).day) || 1);

async function ensureRankTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rank_scan_claims (
      client_id     UUID NOT NULL,
      keyword       TEXT NOT NULL,
      month         TEXT NOT NULL,
      run_type      TEXT NOT NULL,
      status        TEXT NOT NULL,
      scan_id       TEXT,
      points_paid   INTEGER,
      points_kept   INTEGER,
      credits       INTEGER,
      balance_before INTEGER,
      error         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, keyword, month, run_type)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rank_scan_alerts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID,
      kind        TEXT NOT NULL,
      message     TEXT NOT NULL,
      day         TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cleared_at  TIMESTAMPTZ
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rank_scan_runs (
      run_date    TEXT PRIMARY KEY,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      summary     JSONB
    )`);
}

// The service area towns placed through Places near the main town, with the outliers left out and listed
async function placeTowns({ names, town, centre, search }) {
  const areas = [];
  for (const name of names || []) {
    try {
      const hits = await search(`${name} near ${town}, UK`);
      const hit = hits.find(p => p.location);
      if (!hit) { areas.push({ name, lat: null, lng: null, note: 'no position found' }); continue; }
      areas.push({ name, lat: hit.location.lat, lng: hit.location.lng, km: Math.round(SC.kmBetween(centre, hit.location) * 10) / 10, found: hit.name || hit.address || '' });
    } catch (e) { areas.push({ name, lat: null, lng: null, note: `not looked up (${e.message})` }); }
  }
  const kms = areas.filter(a => a.lat !== null).map(a => a.km).sort((x, y) => x - y);
  const median = kms.length ? kms[Math.floor(kms.length / 2)] : 0;
  for (const a of areas) {
    if (a.lat === null) continue;
    if (a.km > 50 || (kms.length >= 3 && median > 0 && a.km > 3 * median)) {
      Object.assign(a, { found_lat: a.lat, found_lng: a.lng, lat: null, lng: null, note: `found ${Math.round(a.km)} km from the centre (${a.found || 'another place of that name'}; the towns sit ${median} km away on average)` });
    }
  }
  const excluded = areas.filter(a => a.lat === null).map(a => ({ name: a.name, reason: a.note || 'no position found' }));
  return { areas, excluded };
}

function createRankScans({ pool, store, lf, locate, search, saveClientValue, log = console }) {
  const need = () => { if (!lf) throw bad('Local Falcon is not configured on this server (LOCALFALCON_API_KEY).', 503); return lf; };
  let tablesReady = null;
  const tables = () => (tablesReady = tablesReady || ensureRankTables(pool));

  // ── Claims and alerts ──
  // Inserts the claim; false when one is already there (the guard)
  async function claim(row) {
    await tables();
    try {
      await pool.query(`INSERT INTO rank_scan_claims (client_id, keyword, month, run_type, status, points_paid, credits, balance_before) VALUES ($1,$2,$3,$4,'claimed',$5,$6,$7)`,
        [row.client_id, row.keyword, row.month, row.run_type, row.points_paid || null, row.credits || null, row.balance_before === undefined ? null : row.balance_before]);
      return true;
    } catch (e) {
      if (/duplicate|unique|already exists/i.test(e.message)) return false;
      throw e;
    }
  }
  async function updateClaim(k, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const sets = keys.map((f, i) => `${f}=$${i + 5}`).join(', ');
    await pool.query(`UPDATE rank_scan_claims SET ${sets}, updated_at=NOW() WHERE client_id=$1 AND keyword=$2 AND month=$3 AND run_type=$4`, [k.client_id, k.keyword, k.month, k.run_type, ...keys.map(f => fields[f])]);
  }
  async function claimsFor(clientId, month = null) {
    await tables();
    const { rows } = month
      ? await pool.query(`SELECT * FROM rank_scan_claims WHERE client_id=$1 AND month=$2 ORDER BY created_at`, [clientId, month])
      : await pool.query(`SELECT * FROM rank_scan_claims WHERE client_id=$1 ORDER BY created_at DESC`, [clientId]);
    return rows;
  }
  // One alert of a kind and message a day
  async function alert(clientId, kind, message, now = new Date()) {
    await tables();
    const day = ukParts(now).date;
    const { rows } = await pool.query(`SELECT id FROM rank_scan_alerts WHERE kind=$1 AND message=$2 AND day=$3 AND cleared_at IS NULL`, [kind, message, day]);
    if (rows.length) return;
    await pool.query(`INSERT INTO rank_scan_alerts (client_id, kind, message, day) VALUES ($1,$2,$3,$4)`, [clientId || null, kind, message, day]);
    log.log(`[rank] alert ${kind}${clientId ? ` for ${clientId}` : ''}: ${message}`);
  }
  async function alerts(clientId = null) {
    await tables();
    const { rows } = clientId
      ? await pool.query(`SELECT id, client_id, kind, message, day, created_at FROM rank_scan_alerts WHERE cleared_at IS NULL AND (client_id=$1 OR client_id IS NULL) ORDER BY created_at DESC`, [clientId])
      : await pool.query(`SELECT id, client_id, kind, message, day, created_at FROM rank_scan_alerts WHERE cleared_at IS NULL ORDER BY created_at DESC`);
    return rows.slice(0, 50);
  }
  async function clearAlert(id) { await tables(); await pool.query(`UPDATE rank_scan_alerts SET cleared_at=NOW() WHERE id=$1`, [id]); }

  // ── The settings ──
  // Built fresh unless the locked Local Falcon ones are asked for. Throws 400 with the reason when blocked.
  async function buildSettings(clientId, I, { fresh = false } = {}) {
    const cv = I.validatorCtx.cv || {};
    const cur = cv.scan_settings;
    if (!fresh && cur && cur.locked && cur.provider === PROVIDER) return { settings: cur, saved: true };
    const placeId = str(cv.gbp_place_id);
    if (!placeId) throw bad('No Google place ID for this client: confirm the Google listing on the Record tab (the place ID step). Scans match the client by place ID only, so none can run without it.');
    const town = str(I.town);
    const addressType = str(cv.gbp_address_type).toLowerCase();
    const warnings = [], notes = [];
    // The saved Local Falcon listing (free): its name and pin
    let saved = null;
    if (lf) {
      try { saved = (await lf.listLocations(placeId)).find(l => str(l.place_id) === placeId) || null; }
      catch (e) { notes.push(`Local Falcon's saved locations could not be read (${e.message})`); }
    }
    let centre = null;
    if (addressType === 'service_area') {
      const loc = await locate({ placeId: '', address: '', town: town ? `${town}, UK` : '' });
      if (!loc) throw bad(`The main town (${town || 'none on the record'}) could not be placed on the map, so there is no centre for the grid.`);
      centre = { lat: loc.lat, lng: loc.lng, from: `the main town (${town}). The address is hidden (service area business), so the main town is the correct centre`, kind: 'main town, hidden address' };
    } else {
      const sLat = saved && Number(saved.lat), sLng = saved && Number(saved.lng);
      if (saved && Number.isFinite(sLat) && Number.isFinite(sLng) && sLat !== 0 && sLng !== 0) {
        centre = { lat: sLat, lng: sLng, from: `the GBP pin (Local Falcon's saved listing "${str(saved.name) || placeId}")`, kind: 'GBP pin' };
      } else {
        const loc = await locate({ placeId, address: str(cv.address), town: town ? `${town}, UK` : '' });
        if (!loc) throw bad('No centre for the grid: the listing, the address and the main town could not be placed on the map.');
        const pin = /saved listing/.test(loc.from || '');
        centre = { lat: loc.lat, lng: loc.lng, from: pin ? `the GBP pin (Google Places, ${String(loc.from).replace(/^the saved listing /, '')})` : loc.from, kind: pin ? 'GBP pin' : 'fallback' };
        if (!pin) warnings.push(`The GBP pin could not be read, so the grid centres on ${loc.from}. Check the listing before running.`);
      }
      if (!addressType) warnings.push('GBP address type is blank on the Record tab. If the address is hidden (service area business), set it to service_area so the grid centres on the main town.');
    }
    // The towns, the hull plus 3 km; none placed blocks the scan
    const { areas, excluded } = await placeTowns({ names: I.serviceAreasPageMap || I.areas || [], town, centre, search });
    if (!areas.some(a => a.lat !== null)) throw bad(`No service area town could be placed on the map${areas.length ? ` (${areas.map(a => a.name).join(', ')})` : ' (the page map has none)'}, so the scan is blocked rather than shrunk to a 3 km circle round the centre.`);
    const settings = SC.buildScanSettings({ clientName: I.name, primary: I.primary, keyword2: cv.scan_keyword_2 || '', scanArea: cv.scan_area || 'city', town, centre, areas, place: { google_place_id: placeId, name: str(saved && saved.name) || str(cv.company_name), saved_on_local_falcon: !!saved, how: 'the saved gbp_place_id (place ID only)' } });
    const perKeyword = settings.grid_size * settings.grid_size;
    Object.assign(settings, {
      version: 3, provider: PROVIDER, radius_km: SC.radiusKm(settings.spacing_m),
      points_from: 'local (Local Falcon scans the full grid; Copybot keeps these)',
      points_paid: perKeyword, points_kept: settings.point_count,
      credits_per_run: perKeyword * settings.keywords.length,
      areas, excluded_towns: excluded, notes, warnings, centre_kind: centre.kind,
    });
    return { settings, saved: false };
  }

  async function balance() {
    if (!lf) return null;
    try { const a = await lf.account(); const c = a.credits || {}; return { credits: Number(c.total_usable_credits), api_access: !!(a.permissions && a.permissions.api_access), package: a.package || null }; }
    catch (e) { return { error: e.message }; }
  }

  async function preview(clientId, I, { fresh = false } = {}) {
    const { settings, saved } = await buildSettings(clientId, I, { fresh });
    return { settings, saved, credits: settings.credits_per_run, points_paid: settings.points_paid * settings.keywords.length, points_kept: settings.points_kept * settings.keywords.length, balance: await balance() };
  }

  // ── Running one scan: the claim first, then the call; never retried ──
  // A monthly scan's claim is one per keyword and month; a baseline or reset (asked for and
  // confirmed by hand) gets its own claim, and still counts as that month's scan.
  async function startScan(clientId, settings, k, { run_type, created_from, month, balance_before = null }) {
    const created_at = new Date().toISOString();
    const claim_type = run_type === 'monthly' ? 'monthly' : `${created_from} ${created_at}`;
    const key = { client_id: clientId, keyword: k.keyword, month, run_type: claim_type };
    if (!(await claim({ ...key, points_paid: settings.points_paid, credits: settings.points_paid, balance_before }))) return { keyword: k.keyword, skipped: `already scanned in ${month}` };
    let r;
    try {
      r = await need().runScan({ place_id: settings.place.google_place_id, keyword: k.keyword, lat: settings.centre.lat, lng: settings.centre.lng, grid_size: settings.grid_size, radius_km: settings.radius_km });
    } catch (e) {
      await updateClaim(key, { status: 'failed', error: e.message.slice(0, 500) });
      log.error(`[rank] ${run_type} scan for ${clientId} "${k.keyword}" failed: ${e.message}`);
      return { keyword: k.keyword, error: e.message };
    }
    const scanId = r.report_key || (r.report && r.report.report_key) || `lf-${Date.now()}`;
    const pending = { scan_id: scanId, source: PROVIDER, keyword: k.keyword, kind: k.kind, run_type, created_from, status: 'processing', created_at, month, claim_type, superseded: false, points_paid: settings.points_paid, points_kept: null, report_url: null };
    let row = pending;
    if (r.report && !r.processing) row = SC.localFalconRow(r.report, pending, settings);
    await store.addScan(clientId, row);
    await updateClaim(key, { status: row.status === 'completed' ? 'completed' : 'running', scan_id: String(scanId), points_paid: row.points_paid, points_kept: row.points_kept });
    log.log(`[rank] ${run_type} scan for ${clientId} "${k.keyword}": ${scanId}, ${settings.points_paid} points paid (${settings.points_paid} credits)${row.points_kept !== null ? `, ${row.points_kept} kept` : ''}`);
    if (row.status === 'completed') await afterSettled(clientId, row);
    return { keyword: k.keyword, scan_id: scanId, status: row.status };
  }

  async function afterSettled(clientId, row) {
    if (row.kind === 'main' && row.run_type === 'baseline' && row.status === 'completed') {
      await store.saveRankCompetitors(clientId, { at: new Date().toISOString(), source: row.source, keyword: row.keyword, scan_id: row.scan_id, competitors: row.competitors || [], leader: row.leader || null });
    }
    const month = row.month;
    await updateClaim({ client_id: clientId, keyword: row.keyword, month, run_type: row.claim_type || row.run_type }, { status: row.status, points_kept: row.points_kept, points_paid: row.points_paid }).catch(() => {});
  }

  // The location saved on Local Falcon by place id before the first scan
  async function ensureSaved(settings) {
    const L = need();
    const pid = settings.place.google_place_id;
    const found = (await L.listLocations(pid)).some(l => str(l.place_id) === pid);
    if (!found) { await L.addLocation(pid); settings.place.saved_on_local_falcon = true; settings.place.saved_at = new Date().toISOString(); }
    return !found;
  }

  async function runBaseline(clientId, settings, { now = new Date(), created_from = 'baseline' } = {}) {
    need();
    await ensureSaved(settings);
    const month = ukParts(now).month;
    settings.locked = true; settings.locked_at = now.toISOString();
    settings.run_day = runDayOf(settings.locked_at);
    await saveClientValue(clientId, 'scan_settings', settings);
    const created = [];
    for (const k of settings.keywords) created.push(await startScan(clientId, settings, k, { run_type: 'baseline', created_from, month }));
    return created;
  }

  async function baseline(clientId, I) {
    const live = SC.splitBySource(await store.scans(clientId), PROVIDER).live;
    if (live.some(s => s.run_type === 'baseline')) throw bad('A Local Falcon baseline exists for this client: the settings are locked and the monthly scans run by themselves. Use Reset baseline to start again.', 409);
    const { settings } = await buildSettings(clientId, I, { fresh: true });
    return runBaseline(clientId, settings);
  }

  async function reset(clientId, I) {
    const cv = I.validatorCtx.cv || {};
    const at = new Date().toISOString();
    let superseded = 0;
    for (const row of await store.scans(clientId)) {
      if (row.superseded) continue;
      await store.updateScan(clientId, SC.scanIdOf(row), { ...row, superseded: true, superseded_at: at, source: SC.sourceOf(row) });
      superseded++;
    }
    await saveClientValue(clientId, 'scan_settings', null);
    const I2 = { ...I, validatorCtx: { ...I.validatorCtx, cv: { ...cv, scan_settings: null } } };
    const { settings } = await buildSettings(clientId, I2, { fresh: true });
    settings.reset_from = cv.scan_settings ? { locked_at: cv.scan_settings.locked_at || null, provider: cv.scan_settings.provider || 'leadsnap', keywords: (cv.scan_settings.keywords || []).map(k => k.keyword) } : null;
    const created = await runBaseline(clientId, settings, { created_from: 'reset' });
    return { created, superseded };
  }

  // Reads only: every pending Local Falcon row checked once
  async function settle(clientId, settings) {
    const rows = SC.splitBySource(await store.scans(clientId), PROVIDER).live.filter(SC.isPending);
    const out = [];
    for (const row of rows) {
      try {
        const g = await need().getReport(row.scan_id);
        if (g.processing || !g.report) { out.push({ scan_id: row.scan_id, status: row.status }); continue; }
        const next = SC.localFalconRow(g.report, row, settings || {});
        await store.updateScan(clientId, row.scan_id, next);
        await afterSettled(clientId, next);
        out.push({ scan_id: row.scan_id, status: next.status });
      } catch (e) { out.push({ scan_id: row.scan_id, status: row.status, error: e.message }); }
    }
    return out;
  }

  // ── The daily job: the month's scans on or after the run day, then the pending reports read back ──
  // clients(): [{ client_id, name, cv }] for every unarchived client. Spends credits only on a
  // claimed monthly scan; everything else is a free read.
  async function runDaily({ now = new Date(), clients } = {}) {
    if (!lf) return { skipped: 'Local Falcon is not configured' };
    await tables();
    const uk = ukParts(now);
    const summary = { date: uk.date, started: [], skipped: [], settled: [], alerts: [] };
    const list = (await clients()).filter(c => c.cv && c.cv.scan_settings && c.cv.scan_settings.locked && c.cv.scan_settings.provider === PROVIDER);
    let bal = null;
    const readBalance = async () => { const b = await balance(); bal = b && Number.isFinite(b.credits) ? b.credits : null; return b; };
    for (const c of list) {
      const S = c.cv.scan_settings;
      try {
        const runDay = S.run_day || runDayOf(S.locked_at || S.built_at);
        if (uk.day < runDay) continue;
        const claimed = await claimsFor(c.client_id, uk.month);
        const due = S.keywords.filter(k => !claimed.some(x => x.keyword === k.keyword));
        if (!due.length) continue;
        const cost = S.points_paid * due.length;
        const b = await readBalance();
        if (b && b.error) { summary.skipped.push({ client: c.name, reason: `balance not read: ${b.error}` }); await alert(c.client_id, 'balance_unread', `The monthly scan for ${c.name} did not run: the Local Falcon balance could not be read (${b.error}). It tries again tomorrow.`, now); continue; }
        if (bal === null || bal < cost) {
          summary.skipped.push({ client: c.name, reason: `${bal} credits, ${cost} needed` });
          await alert(c.client_id, 'low_credits', `The monthly scan for ${c.name} was skipped: ${bal} Local Falcon credits left, ${cost} needed. Top up and it runs on the next daily check.`, now);
          continue;
        }
        for (const k of due) {
          const r = await startScan(c.client_id, S, k, { run_type: 'monthly', created_from: 'Copybot monthly', month: uk.month, balance_before: bal });
          summary.started.push({ client: c.name, ...r, points_paid: S.points_paid, credits: S.points_paid });
          if (!r.skipped && !r.error) bal -= S.points_paid;
        }
      } catch (e) { summary.skipped.push({ client: c.name, reason: e.message }); log.error(`[rank] daily for ${c.name}: ${e.message}`); }
    }
    // The reports read back (free)
    for (const c of list) {
      try { const s = await settle(c.client_id, c.cv.scan_settings); if (s.length) summary.settled.push({ client: c.name, rows: s }); }
      catch (e) { summary.settled.push({ client: c.name, error: e.message }); }
    }
    // Low credits for next month's runs across every client
    if (list.length) {
      const b = bal === null ? await readBalance() : { credits: bal };
      const next = list.reduce((s, c) => s + (c.cv.scan_settings.credits_per_run || 0), 0);
      if (b && Number.isFinite(b.credits) && b.credits < next) {
        const msg = `Local Falcon credits are low: ${b.credits} left, ${next} needed for a month of scans across ${list.length} client${list.length === 1 ? '' : 's'}.`;
        summary.alerts.push(msg);
        await alert(null, 'low_credits', msg, now);
      }
    }
    return summary;
  }

  // Once a day from 6am UK however often it is called (the lock is the run date)
  async function dailyTick({ now = new Date(), clients }) {
    const uk = ukParts(now);
    if (uk.hour < 6) return null;
    await tables();
    try { await pool.query(`INSERT INTO rank_scan_runs (run_date) VALUES ($1)`, [uk.date]); }
    catch (e) { if (/duplicate|unique|already exists/i.test(e.message)) return null; throw e; }
    const summary = await runDaily({ now, clients });
    await pool.query(`UPDATE rank_scan_runs SET finished_at=NOW(), summary=$2 WHERE run_date=$1`, [uk.date, JSON.stringify(summary)]);
    log.log(`[rank] daily ${uk.date}: ${summary.started ? summary.started.length : 0} started, ${summary.skipped ? summary.skipped.length : 0} skipped`);
    return summary;
  }

  return { PROVIDER, configured: () => !!lf, buildSettings, preview, baseline, reset, settle, runDaily, dailyTick, claimsFor, alerts, clearAlert, balance, tables };
}

module.exports = { createRankScans, ensureRankTables, ukParts, runDayOf, placeTowns, PROVIDER };
