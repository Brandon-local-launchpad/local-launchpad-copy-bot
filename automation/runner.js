'use strict';

// ── The automation chain (10 Nov 2026, Brandon; Stage 2 of the automation plan) ──────────
// For a client with Automation on, start the next step whenever the last one has finished,
// and stop at everything that is a person's: approving the locations, verifying the trade
// facts pack, claims and blocked pages, any push, the baseline rank scan. It presses the
// same buttons a person would: every step is one of the app's own run routes, called
// through `call` (server.js: a request to this server; the fixture: a fake).
//
// The order (nextStep, pure):
//   [person: the niche, the record's key fields, a form with needed answers missing] →
//   locations run (a dry run first; over the cap it stops for a person) → [person approves,
//   which builds the page map] → research for the towns with no dossier → FAQ research →
//   H1 research → homepage → category pages → service pages (pack verified) → location
//   pages → [person: claims, blocked pages] → GBP output → post prompts → a first post batch
//
// What an answer means:
//   2xx          the step started. It is finished when the client's row no longer asks for it.
//   409          something is already running: look again in 2 minutes.
//   other 4xx    the app refused in words a person can act on ("Save and read the Drive photo
//                folder first"): shown under Needs a person, tried again every 30 minutes, so
//                the chain carries on by itself once the cause is fixed.
//   5xx, no answer, or a step that ran and did not get there: one more try, then stopped,
//                shown under Needs a person with the reason, until Try again is pressed.
// Spending without a click is approved (Brandon, 10 Nov): the locations run up to CAP_USD.
// Nothing here approves, pushes, publishes or scans ranks.
//
// Monthly upkeep (Stage 5, upkeepStep): once the chain has nothing to start (it is waiting on a person, or
// finished), the same switch keeps three things fresh, each at most once a calendar month:
//   the competitor check   30 days after the last one (or the first, once the listing is confirmed and the
//                          GBP output is written). Google Places, read only.
//   the citations re-scan  30 days after the last full scan a person started, and only when that scan cost
//                          no more than UPKEEP_SCAN_CAP_USD: a scan has no estimate, so the last one is the guide.
//   the next post batch    when publishing is on, no draft batch is waiting, and the approved posts run out
//                          within POSTS_LOW_DAYS: 13 more as a draft. A person still reads and approves it.
// An upkeep step that the app refuses or that fails is not retried: it is marked skipped with the reason,
// shown under Needs a person, and comes round again next month. It never stops the chain.
//
// Tables: automation_state (the switch, what it is waiting on), automation_steps (the log).

const CAP_USD = Number(process.env.AUTOMATION_LOCATIONS_CAP_USD) || 2;
const BATCH_SIZE = 13;
const UPKEEP_DAYS = 30, POSTS_LOW_DAYS = 14;
const UPKEEP_SCAN_CAP_USD = Number(process.env.AUTOMATION_SCAN_CAP_USD) || 2;
const BUSY_RETRY_MIN = 2, BLOCKED_RETRY_MIN = 30, MAX_ATTEMPTS = 2;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;

async function ensureAutomationTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_state (
      client_id   UUID PRIMARY KEY,
      enabled     BOOLEAN NOT NULL DEFAULT FALSE,
      enabled_at  TIMESTAMPTZ,
      enabled_by  TEXT,
      waiting     TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_steps (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL,
      step         TEXT NOT NULL,
      sig          TEXT NOT NULL,
      label        TEXT NOT NULL,
      tab          TEXT,
      status       TEXT NOT NULL,
      attempts     INTEGER NOT NULL DEFAULT 1,
      detail       TEXT,
      error        TEXT,
      retry_after  TIMESTAMPTZ,
      started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at  TIMESTAMPTZ
    )`);
}

// ── The next thing for this client: a step to start, a person to wait for, or nothing ──
// row: the dashboard row (ui/dashboard.js). once(step, sig): has this one-off step been started for this signature?
function nextStep(row, once = () => false) {
  const person = text => ({ person: text });
  const api = p => `/api/clients/${row.id}${p}`;
  const step = (key, sig, label, tab, path, body = {}, extra = {}) => ({ step: key, sig: String(sig), label, tab, method: 'POST', path: api(path), body, ...extra });
  if (row.archived) return person('The client is archived.');
  if (row.niche_key === 'other') return person('Confirm the niche');
  if (row.missing_fields.length) return person(`Fill in the record: ${row.missing_fields.map(m => m.text).join(', ')}`);
  // The form still lacks answers the build needs (towns, services, travel): nothing is bought or written on a half filled record
  if (row.form_needed) return person(`Chase the client: the form is missing ${plural(row.form_needed, 'needed answer')}`);
  if (!row.locations_run) return step('locations', 'first', 'Work out the locations', 'locations', '/locations/run', { confirm: true }, { precheck: 'locations' });
  if (!row.locations_approved) return person('Check the towns and approve the locations list');
  if (row.locations_changed) return person('Approve the locations list again');
  const sig = row.locations_approved_at ? new Date(row.locations_approved_at).toISOString() : 'approved';
  const pt = row.page_types;
  if (!row.pages.total) return step('page_map', sig, 'Build the page map', 'page-map', '/page-map/generate');
  const towns = row.towns_without_dossier;
  if (towns.length) return step('research', towns.join('|'), `Research ${plural(towns.length, 'town')}`, 'research', '/research/run', { towns });
  if (!once('faq', sig)) return step('faq', sig, 'Research the FAQ questions', 'research', '/faq/research');
  if (!once('h1', sig)) return step('h1', sig, 'Research the H1s by search volume', 'page-map', '/h1-research');
  if (pt.homepage.total && !pt.homepage.records) return step('homepage', 'homepage', 'Write the homepage', 'pages', '/v20/homepage/generate');
  const left = t => pt[t].total - pt[t].records;
  if (left('category') > 0) return step('category', pt.category.total, `Write ${plural(left('category'), 'category page')}`, 'pages', '/category-pages/run', { resume: true });
  if (left('service') > 0) {
    if (row.pack_unverified) return person('Verify the trade facts pack');
    return step('service', pt.service.total, `Write ${plural(left('service'), 'service page')}`, 'pages', '/service-pages/run', { resume: true });
  }
  if (left('location') > 0) return step('location', pt.location.total, `Write ${plural(left('location'), 'location page')}`, 'pages', '/location-pages/run', { resume: true });
  if (row.pages.written < row.pages.total) return person(row.tracker && row.tracker.next ? row.tracker.next.text : 'Fix the pages that are not clean');
  if (!row.gbp_done) return step('gbp', 'gbp', 'Write the GBP description, services and products', 'gbp', '/gbp/generate');
  if (!row.lead_snap_done) return step('prompts', 'prompts', 'Write the post prompts', 'gbp-posts', '/lead-snap/generate');
  if (!once('batch', 'first')) return step('batch', 'first', `Write the first ${BATCH_SIZE} posts as a draft batch`, 'gbp-posts', '/gbp-posts/batches', { size: BATCH_SIZE });
  return { finished: true };
}

// ── Monthly upkeep: the next thing to refresh, or null. u = row.upkeep (ui/dashboard.js) ──
function upkeepStep(row, once = () => false, now = new Date()) {
  const u = row.upkeep;
  if (!u || row.archived) return null;
  const month = now.toISOString().slice(0, 7);
  const days = at => (at ? (now - new Date(at)) / 86400000 : Infinity);
  const step = (key, label, tab, p, body = {}) => ({ step: key, sig: month, label, tab, method: 'POST', path: `/api/clients/${row.id}${p}`, body, upkeep: true });
  const due = [];
  if (u.place_id && (u.competitors_at ? days(u.competitors_at) >= UPKEEP_DAYS : row.gbp_done)) due.push(step('competitors', 'Check the Google competitors again', 'gbp', '/gbp/competitors'));
  if (u.scan_at && days(u.scan_at) >= UPKEEP_DAYS && Number(u.scan_cost_usd) <= UPKEEP_SCAN_CAP_USD) due.push(step('citations', 'Scan the directories again', 'citations', '/citations/scan'));
  if (u.publishing_on && !u.draft_batches && u.last_post_date && days(`${u.last_post_date}T00:00:00Z`) >= -POSTS_LOW_DAYS) due.push(step('posts', `Write the next ${BATCH_SIZE} posts as a draft batch`, 'gbp-posts', '/gbp-posts/batches', { size: BATCH_SIZE }));
  return due.find(s => !once(s.step, s.sig)) || null;
}

// deps: pool, loadRows() → the dashboard rows for every client, call(method, path, body) → { status, body },
// now() → Date, log(text)
function createAutomation({ pool, loadRows, call, now = () => new Date(), log = () => {}, capUsd = CAP_USD, background = false }) {
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
  const inflight = new Set();
  let ticking = false;
  const after = min => new Date(now().getTime() + min * 60000);

  const stateOf = async clientId => (await q(`SELECT * FROM automation_state WHERE client_id = $1`, [clientId]))[0] || { client_id: clientId, enabled: false, enabled_at: null, enabled_by: null, waiting: null };
  const stepsOf = async (clientId, limit = 40) => q(`SELECT * FROM automation_steps WHERE client_id = $1 ORDER BY started_at DESC LIMIT ${Number(limit)}`, [clientId]);
  const setWaiting = async (clientId, text) => { await pool.query(`UPDATE automation_state SET waiting = $2, updated_at = NOW() WHERE client_id = $1`, [clientId, text]); };
  const finish = (id, status, fields = {}) => pool.query(`UPDATE automation_steps SET status = $2, error = $3, detail = COALESCE($4, detail), retry_after = $5, finished_at = $6 WHERE id = $1`, [id, status, fields.error || null, fields.detail || null, fields.retry_after || null, now()]);

  async function setEnabled(clientId, enabled, by = '') {
    const cur = await q(`SELECT client_id FROM automation_state WHERE client_id = $1`, [clientId]);
    if (cur.length) await pool.query(`UPDATE automation_state SET enabled = $2, enabled_at = $3, enabled_by = $4, waiting = NULL, updated_at = NOW() WHERE client_id = $1`, [clientId, !!enabled, enabled ? now() : null, enabled ? by || null : null]);
    else await pool.query(`INSERT INTO automation_state (client_id, enabled, enabled_at, enabled_by) VALUES ($1, $2, $3, $4)`, [clientId, !!enabled, enabled ? now() : null, enabled ? by || null : null]);
    return view(clientId);
  }
  // Try again: the stopped and refused steps are set aside, so the next tick starts them fresh
  async function retry(clientId) {
    await pool.query(`UPDATE automation_steps SET status = 'cleared' WHERE client_id = $1 AND status IN ('failed', 'blocked', 'error')`, [clientId]);
    return view(clientId);
  }
  async function view(clientId) {
    const [state, steps] = [await stateOf(clientId), await stepsOf(clientId)];
    return { enabled: !!state.enabled, enabled_at: state.enabled_at, enabled_by: state.enabled_by, waiting: state.waiting, cap_usd: capUsd, steps: steps.map(s => ({ id: s.id, step: s.step, label: s.label, tab: s.tab, status: s.status, attempts: s.attempts, detail: s.detail, error: s.error, started_at: s.started_at, finished_at: s.finished_at })) };
  }

  // The locations run buys data: read the dry run's estimate first and keep under the cap
  async function precheck(row, next) {
    if (next.precheck !== 'locations') return null;
    const r = await call('GET', `/api/clients/${row.id}/locations/dry-run`);
    if (r.status >= 400) return { status: r.status, error: (r.body && r.body.error) || `The locations dry run answered ${r.status}.` };
    const usd = r.body && r.body.estimate ? Number(r.body.estimate.total_usd) : NaN;
    if (!(usd >= 0)) return { status: 400, error: 'The locations dry run gave no cost estimate, so the run was not started.' };
    if (usd > capUsd) return { status: 400, error: `The locations run is estimated at $${usd.toFixed(2)}, over the $${capUsd.toFixed(2)} limit for automatic runs. Run it by hand on the Locations tab.` };
    return { detail: `estimated $${usd.toFixed(2)}` };
  }

  async function tickClient(row) {
    const clientId = row.id;
    if (inflight.has(clientId) || row.running) return 'busy';
    const steps = await stepsOf(clientId, 200);
    const once = (key, sig) => steps.some(s => s.step === key && s.sig === String(sig) && (s.status === 'started' || s.status === 'done' || s.status === 'skipped'));
    let next = nextStep(row, once);
    // Nothing to build right now: the monthly upkeep may have something due. What the chain waits on stays on show.
    let waitingText = null;
    if (next.person || next.finished) {
      const up = upkeepStep(row, once, now());
      if (up) { waitingText = next.person || 'Everything Copybot can do by itself is done.'; next = up; }
    }
    const open = steps.find(s => s.status === 'started') || null;
    const same = s => s && next.step && s.step === next.step && s.sig === next.sig;
    let attempts = 1;
    if (open) {
      if (same(open)) {
        // It ran and the client still needs it
        if (open.attempts >= MAX_ATTEMPTS) { await finish(open.id, 'failed', { error: `"${open.label}" ran ${plural(open.attempts, 'time')} and did not finish. Open the tab to see why.` }); await setWaiting(clientId, `Stopped at: ${open.label}`); return 'failed'; }
        await finish(open.id, 'cleared'); attempts = open.attempts + 1;
      } else await finish(open.id, 'done');
    }
    if (next.person) { await setWaiting(clientId, next.person); return 'person'; }
    if (next.finished) { await setWaiting(clientId, 'Everything Copybot can do by itself is done.'); return 'finished'; }
    const last = steps.find(s => same(s) && s.status !== 'cleared' && s.status !== 'done' && s.status !== 'started') || null;
    if (last && last.status === 'failed') { await setWaiting(clientId, `Stopped at: ${last.label}`); return 'failed'; }
    if (last && last.status === 'blocked') {
      if (last.retry_after && new Date(last.retry_after) > now()) return 'blocked';
      await finish(last.id, 'cleared');
    }
    if (last && last.status === 'error') { attempts = last.attempts + 1; await finish(last.id, 'cleared'); }

    inflight.add(clientId);
    try {
      const pre = await precheck(row, next).catch(err => ({ status: 500, error: err.message }));
      const id = (await q(`INSERT INTO automation_steps (client_id, step, sig, label, tab, status, attempts, detail, started_at) VALUES ($1, $2, $3, $4, $5, 'started', $6, $7, $8) RETURNING id`, [clientId, next.step, next.sig, next.label, next.tab, attempts, pre && pre.detail ? pre.detail : null, now()]))[0].id;
      await setWaiting(clientId, waitingText);
      let r = pre && pre.error ? { status: pre.status, body: { error: pre.error } } : null;
      if (!r) { try { r = await call(next.method, next.path, next.body); } catch (err) { r = { status: 599, body: { error: err.message } }; } }
      const message = (r.body && r.body.error) || `The app answered ${r.status}.`;
      if (r.status < 300) { log(`[automation] ${row.name}: ${next.label}`); return 'started'; }
      // Upkeep is never retried and never stops the chain: skipped with the reason, round again next month
      if (next.upkeep && r.status !== 409) { await finish(id, 'skipped', { error: message }); return 'skipped'; }
      if (r.status === 409) { await finish(id, 'blocked', { error: message, retry_after: after(BUSY_RETRY_MIN) }); return 'blocked'; }
      if (r.status < 500) { await finish(id, 'blocked', { error: message, retry_after: after(BLOCKED_RETRY_MIN) }); await setWaiting(clientId, message); return 'blocked'; }
      if (attempts >= MAX_ATTEMPTS) { await finish(id, 'failed', { error: message }); await setWaiting(clientId, `Stopped at: ${next.label}`); log(`[automation] ${row.name}: stopped at "${next.label}": ${message}`); return 'failed'; }
      await finish(id, 'error', { error: message });
      return 'error';
    } finally { inflight.delete(clientId); }
  }

  // Every enabled client, side by side (background: true on the server, false in the fixture so a tick can be read)
  async function tick() {
    if (ticking) return { skipped: true };
    ticking = true;
    try {
      const on = new Set((await q(`SELECT client_id FROM automation_state WHERE enabled = TRUE`)).map(r => r.client_id));
      if (!on.size) return { clients: 0 };
      const rows = (await loadRows()).filter(r => on.has(r.id) && !r.archived);
      const out = {};
      const work = rows.map(r => tickClient(r).then(x => { out[r.name] = x; }).catch(err => { out[r.name] = 'error'; log(`[automation] ${r.name}: ${err.message}`); }));
      // On the server a step that answers only when it has finished (the locations run, the homepage) is left
      // to finish by itself: that client is skipped as busy until it has, and the other clients are not held up
      if (!background) await Promise.all(work);
      return { clients: rows.length, results: out };
    } finally { ticking = false; }
  }

  return { tick, tickClient, setEnabled, retry, view, stateOf };
}

function mountAutomationApi(app, { automation }) {
  const wrap = fn => async (req, res) => { try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); } };
  app.get('/api/clients/:clientId/automation', wrap(req => automation.view(req.params.clientId)));
  app.put('/api/clients/:clientId/automation', wrap(req => automation.setEnabled(req.params.clientId, !!(req.body && req.body.enabled), String((req.body && req.body.by) || '').slice(0, 80))));
  app.post('/api/clients/:clientId/automation/retry', wrap(req => automation.retry(req.params.clientId)));
}

module.exports = { ensureAutomationTables, createAutomation, mountAutomationApi, nextStep, upkeepStep, CAP_USD, BATCH_SIZE, UPKEEP_DAYS, POSTS_LOW_DAYS, UPKEEP_SCAN_CAP_USD };
