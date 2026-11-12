'use strict';

// ── Tell Brandon: state and sending (12 Nov 2026, Brandon) ───────────────────
// brandon/rules.js decides; this keeps the state and sends.
//   brandon_alerts   one row per alert while it lasts (client, kind, alert_key): told once. A row whose
//                    condition has gone is removed, so the same thing coming back is told again. Set-up
//                    done is sticky: told once, ever.
//   brandon_asks     what a person sent with the Tell Brandon button, open until Brandon marks it done
//   brandon_digests  the morning email, claimed per day before it is sent so a restart never sends two
// To: TELL_BRANDON_EMAIL, else team@locallaunchpad.co.uk (Brandon, 12 Nov). WhatsApp: TELL_BRANDON_WHATSAPP;
// with none set the button still saves and emails the ask, and offers Copy instead.
// Nothing here writes to a client.

const crypto = require('crypto');
const R = require('./rules');

const DEFAULT_EMAIL = 'team@locallaunchpad.co.uk';
const DIGEST_HOUR_UK = 8;
const str = v => (v == null ? '' : String(v)).trim();
const parse = v => { if (v == null) return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return null; } };

async function ensureBrandonTables(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS brandon_alerts (
    client_id   UUID NOT NULL,
    kind        TEXT NOT NULL,
    alert_key   TEXT NOT NULL,
    urgent      BOOLEAN NOT NULL DEFAULT FALSE,
    sticky      BOOLEAN NOT NULL DEFAULT FALSE,
    message     TEXT,
    tab         TEXT,
    first_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    emailed_at  TIMESTAMPTZ,
    digested_at TIMESTAMPTZ,
    PRIMARY KEY (client_id, kind, alert_key)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS brandon_asks (
    id          UUID PRIMARY KEY,
    client_id   UUID,
    place       TEXT,
    reason      TEXT NOT NULL,
    note        TEXT,
    context     TEXT,
    message     TEXT,
    asked_by    TEXT,
    emailed     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    done_at     TIMESTAMPTZ,
    done_by     TEXT
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS brandon_digests (day TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent INTEGER NOT NULL DEFAULT 0)`);
}

// ── The facts the alerts read: a grouped query per table; a table not made yet counts as nothing ──
async function loadFacts(pool, { dripState = null, today, month } = {}) {
  const q = (sql, p = []) => pool.query(sql, p).then(r => r.rows).catch(() => []);
  const clients = await q(`SELECT id, name FROM clients WHERE archived_at IS NULL`);
  const by = list => { const m = new Map(); for (const r of list) { if (!m.has(r.client_id)) m.set(r.client_id, []); m.get(r.client_id).push(r); } return m; };
  const conns = new Map((await q(`SELECT client_id, status, problem, publishing_on FROM bundle_connections`)).map(r => [r.client_id, r]));
  // Failed after a Retry: a second attempt or more (publisher/service.js counts each send)
  const failed = by(await q(`SELECT id, client_id, kind, due_date, error FROM gbp_publish_items WHERE status = 'failed' AND attempts >= 2`));
  // 1 to 3 star reviews in the queue: only ones drafted for approval, never the backlog
  const low = by(await q(`SELECT id, client_id, stars, reviewer_name, comment FROM gbp_reviews WHERE stars <= 3 AND status IN ('new', 'drafting', 'queued') AND deleted_at IS NULL`));
  const run = (await q(`SELECT summary FROM review_sync_runs WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT 1`))[0];
  const capacity = new Map(((parse(run && run.summary) || {}).clients || []).filter(c => c && c.capacity != null).map(c => [c.client_id, Number(c.capacity)]));
  const offers = new Map((await q(`SELECT p.client_id, count(*)::int AS n FROM gbp_posts p JOIN gbp_post_batches b ON b.id = p.batch_id WHERE p.topic = 'OFFER' AND COALESCE(p.offer_redeem_url, '') = '' AND b.status IN ('draft', 'approved') AND p.post_date >= $1 GROUP BY p.client_id`, [today])).map(r => [r.client_id, Number(r.n)]));
  const approved = new Set((await q(`SELECT DISTINCT client_id FROM gbp_post_batches WHERE status = 'approved'`)).map(r => r.client_id));
  const dripOk = new Set((await q(`SELECT DISTINCT client_id FROM gbp_publish_items WHERE kind = 'photo' AND status IN ('queued', 'sending', 'scheduled', 'posted')`)).map(r => r.client_id));
  const live = new Set((await q(`SELECT client_id FROM review_settings WHERE COALESCE(live_from, '') <> ''`)).map(r => r.client_id));
  const out = [];
  for (const c of clients) {
    const conn = conns.get(c.id) || null;
    let drip = null;
    if (dripState && conn && conn.status === 'connected') { try { const d = await dripState(c.id); drip = { found: !!d.found, left: d.left, ran_out: !!d.ran_out }; } catch (_) { drip = null; } }
    out.push({
      id: c.id, name: c.name, month,
      connection: conn ? { status: conn.status, problem: conn.problem, publishing_on: !!conn.publishing_on } : null,
      failed: failed.get(c.id) || [], low_reviews: low.get(c.id) || [],
      capacity: capacity.has(c.id) ? capacity.get(c.id) : null, drip, offer_no_link: offers.get(c.id) || 0,
      setup: { connected: !!(conn && conn.status === 'connected'), publishing_on: !!(conn && conn.publishing_on), approved_batch: approved.has(c.id), drip_approved: dripOk.has(c.id), reviews_live: live.has(c.id) },
    });
  }
  return out;
}

// deps: pool, send({ to, subject, text }) or null, dripState(clientId) or null, env, now(), log
function createBrandon({ pool, send = null, dripState = null, env = process.env, now = () => new Date(), log = () => {} }) {
  const to = () => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(env.TELL_BRANDON_EMAIL)) ? str(env.TELL_BRANDON_EMAIL) : DEFAULT_EMAIL);
  const number = () => R.whatsappNumber(env.TELL_BRANDON_WHATSAPP);
  const ukDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(t);

  // ── Alerts: new ones saved (and the urgent ones emailed at once), gone ones removed ──
  async function tick() {
    const t = now();
    const today = ukDay(t);
    const facts = await loadFacts(pool, { dripState, today, month: today.slice(0, 7) });
    const found = R.detectAlerts(facts);
    const { rows: saved } = await pool.query(`SELECT client_id, kind, alert_key AS key, sticky FROM brandon_alerts`);
    const id = a => `${a.client_id}|${a.kind}|${a.key}`;
    const have = new Set(saved.map(id));
    const now_ = new Set(found.map(id));
    const fresh = found.filter(a => !have.has(id(a)));
    for (const a of fresh) await pool.query(`INSERT INTO brandon_alerts (client_id, kind, alert_key, urgent, sticky, message, tab, first_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [a.client_id, a.kind, a.key, a.urgent, a.sticky, a.text, a.tab, t]);
    const gone = saved.filter(a => !a.sticky && !now_.has(id(a)));
    for (const a of gone) await pool.query(`DELETE FROM brandon_alerts WHERE client_id=$1 AND kind=$2 AND alert_key=$3`, [a.client_id, a.kind, a.key]);
    const urgent = fresh.filter(a => a.urgent);
    let emailed = 0;
    if (urgent.length && send) {
      try {
        await send(R.urgentEmail({ to: to(), alerts: urgent, env }));
        for (const a of urgent) await pool.query(`UPDATE brandon_alerts SET emailed_at=$4 WHERE client_id=$1 AND kind=$2 AND alert_key=$3`, [a.client_id, a.kind, a.key, t]);
        emailed = urgent.length;
        log(`[brandon] emailed ${to()}: ${urgent.length} alert(s)`);
      } catch (e) { log(`[brandon] alert email failed: ${e.message}`); }
    }
    return { found: found.length, fresh: fresh.length, cleared: gone.length, emailed };
  }

  // ── The morning email: once a day from 8am UK, only when there is something to say ──
  async function digest() {
    if (!send) return { sent: 0, why: 'no way to send' };
    const t = now();
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(t));
    if (hour < DIGEST_HOUR_UK) return { sent: 0, why: 'before 8am' };
    const day = ukDay(t);
    if ((await pool.query(`SELECT day FROM brandon_digests WHERE day = $1`, [day])).rows.length) return { sent: 0, why: 'already sent today' };
    await pool.query(`INSERT INTO brandon_digests (day, at, sent) VALUES ($1, $2, 0)`, [day, t]);
    const names = new Map((await pool.query(`SELECT id, name FROM clients`)).rows.map(r => [r.id, r.name]));
    const { rows: alerts } = await pool.query(`SELECT client_id, kind, alert_key AS key, message AS text, tab FROM brandon_alerts WHERE digested_at IS NULL ORDER BY first_at`);
    const asks = await open();
    if (!alerts.length && !asks.length) return { sent: 0, why: 'nothing to say' };
    await send(R.digestEmail({ to: to(), alerts: alerts.map(a => ({ ...a, client: names.get(a.client_id) || 'A client' })), asks, env }));
    await pool.query(`UPDATE brandon_alerts SET digested_at = $1 WHERE digested_at IS NULL`, [t]);
    await pool.query(`UPDATE brandon_digests SET sent = 1 WHERE day = $1`, [day]);
    return { sent: 1, alerts: alerts.length, asks: asks.length };
  }

  // ── Asks: the Tell Brandon button ──
  async function ask({ clientId = null, place = 'client', reason, note = '', context = [], by = '', tab = '' }) {
    const reasons = R.reasonsFor(place);
    if (!reasons.includes(str(reason))) throw Object.assign(new Error('Choose one of the reasons.'), { status: 400 });
    let client = '';
    if (clientId) {
      const { rows } = await pool.query(`SELECT name FROM clients WHERE id = $1`, [clientId]);
      if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
      client = rows[0].name;
    }
    const ctx = (Array.isArray(context) ? context : []).slice(0, 12).map(c => ({ label: str(c && c.label).slice(0, 60), value: str(c && c.value).slice(0, 2000) })).filter(c => c.label && c.value);
    const link = R.linkFor({ env, clientId: clientId || '', tab: str(tab) });
    const message = R.askMessage({ client, reason: str(reason), note: str(note).slice(0, 2000), context: ctx, by: str(by).slice(0, 80), link });
    const id = crypto.randomUUID();
    const t = now();
    await pool.query(`INSERT INTO brandon_asks (id, client_id, place, reason, note, context, message, asked_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, clientId, place, str(reason), str(note).slice(0, 2000), JSON.stringify(ctx), message, str(by).slice(0, 80), t]);
    const row = { id, client_id: clientId, client: client || 'No client', place, reason: str(reason), note: str(note), asked_by: str(by), created_at: t.toISOString() };
    // The copy by email goes whatever happens to the WhatsApp, so nothing rests on someone pressing send
    let emailed = false;
    if (send) {
      try { await send(R.askEmail({ to: to(), ask: row, message })); emailed = true; await pool.query(`UPDATE brandon_asks SET emailed = TRUE WHERE id = $1`, [id]); }
      catch (e) { log(`[brandon] ask email failed: ${e.message}`); }
    }
    return { ask: { ...row, emailed }, message, whatsapp: R.whatsappUrl(number(), message), emailed };
  }

  async function open(clientId = null) {
    const { rows } = await pool.query(`SELECT a.id, a.client_id, c.name AS client, a.place, a.reason, a.note, a.asked_by, a.created_at, a.emailed FROM brandon_asks a LEFT JOIN clients c ON c.id = a.client_id WHERE a.done_at IS NULL${clientId ? ' AND a.client_id = $1' : ''} ORDER BY a.created_at`, clientId ? [clientId] : []);
    return rows.map(r => ({ ...r, client: r.client || 'No client', by: r.asked_by || '', created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at) }));
  }

  async function done(id, by = '') {
    const { rows } = await pool.query(`SELECT id, done_at FROM brandon_asks WHERE id = $1`, [id]);
    if (!rows.length) throw Object.assign(new Error('Not found.'), { status: 404 });
    if (!rows[0].done_at) await pool.query(`UPDATE brandon_asks SET done_at = $2, done_by = $3 WHERE id = $1`, [id, now(), str(by).slice(0, 80)]);
    return { done: true };
  }

  return { tick, digest, ask, open, done, to, number, reasonsFor: R.reasonsFor };
}

function mountBrandonApi(app, { brandon }) {
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) console.error('[brandon]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/brandon/reasons', wrap(async (req, res) => res.json({ place: str(req.query.place) || 'client', reasons: R.reasonsFor(str(req.query.place)), whatsapp: !!brandon.number(), email: brandon.to() })));
  app.get('/api/brandon/asks', wrap(async (req, res) => res.json({ asks: await brandon.open() })));
  app.get('/api/clients/:clientId/brandon/asks', wrap(async (req, res) => res.json({ asks: await brandon.open(req.params.clientId) })));
  app.post('/api/clients/:clientId/brandon/asks', wrap(async (req, res) => {
    const b = req.body || {};
    res.status(201).json(await brandon.ask({ clientId: req.params.clientId, place: str(b.place) || 'client', reason: b.reason, note: b.note, context: b.context, by: b.by, tab: b.tab }));
  }));
  app.post('/api/brandon/asks/:id/done', wrap(async (req, res) => res.json(await brandon.done(req.params.id, (req.body || {}).by))));
}

module.exports = { ensureBrandonTables, loadFacts, createBrandon, mountBrandonApi, DEFAULT_EMAIL };
