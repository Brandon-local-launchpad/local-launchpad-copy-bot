'use strict';

// ── The Review Us page: storage, the emails and the site set-up (12 Nov 2026) ────────────────
// Tables (new, nothing else changed):
//   review_funnel_sites   one per client: the token in the address the site sends feedback to,
//                         and when the settings were last sent to the site
//   review_feedback       every private feedback message, and whether each email went
// receive(token, body): the public route. The token says which client; the send is checked,
//   stored, then emailed: the client (Client Values email), and a copy to the team that says
//   whether the client was told. A failed email is kept on the row and can be sent again.
// sendToSite(clientId): a person's click. Writes to the client's WordPress site: the address
//   feedback is sent to, and the three values the page shows (company name, owner name, the
//   Google review link). Nothing else on the site is touched.
// The only email this sends to a client is their own customer's feedback (Brandon, 12 Nov).

const crypto = require('crypto');
const R = require('./rules');

const str = v => (v == null ? '' : String(v)).trim();
const bad = (m, status = 400, extra = {}) => Object.assign(new Error(m), { status, ...extra });
const PUBLIC_PATH = '/api/public/review-feedback';
const SITE_VALUES = ['company_name', 'owner_name', 'review_url'];

async function ensureReviewFunnelTables(pool) {
  // Already there: nothing to do (the tests' in-memory Postgres refuses a second CREATE TABLE IF NOT EXISTS)
  try { await pool.query(`SELECT 1 FROM review_feedback LIMIT 1`); return; } catch (_) { /* not made yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_funnel_sites (
      client_id   UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      token       TEXT NOT NULL UNIQUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at     TIMESTAMPTZ,
      sent_to     TEXT,
      sent_by     TEXT,
      sent_values JSONB
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_feedback (
      id                UUID PRIMARY KEY,
      client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      stars             INTEGER NOT NULL,
      name              TEXT NOT NULL,
      phone             TEXT,
      email             TEXT,
      feedback          TEXT NOT NULL,
      page_url          TEXT,
      received_at       TIMESTAMPTZ NOT NULL,
      client_email      TEXT,
      client_emailed_at TIMESTAMPTZ,
      client_error      TEXT,
      team_emailed_at   TIMESTAMPTZ,
      team_error        TEXT,
      handled_at        TIMESTAMPTZ,
      handled_by        TEXT
    )`);
}

// send: m => Promise (citations/inbox/gmail.js send), or null when Gmail is not connected
// loadValues: clientId → the client's values (unconfirmed form values already blanked)
// siteFor: clientId → { url, user, appPassword, staging } or null; wp: { wpGet, wpPost }
function createReviewFunnel({ pool, loadValues, send = null, siteFor = async () => null, wp = require('../wp/client'), env = process.env, now = () => new Date(), log = console }) {
  // The tables are made on first use (the clients table they point at is made at start-up, after this
  // is created); a failed attempt is tried again on the next call
  let ready = null;
  const q = async (sql, params) => {
    if (!ready) ready = ensureReviewFunnelTables(pool).catch(err => { ready = null; throw err; });
    await ready;
    return pool.query(sql, params);
  };
  const base = given => str(env.COPYBOT_URL || given).replace(/\/+$/, '');

  async function siteRow(clientId) {
    const { rows } = await q(`SELECT * FROM review_funnel_sites WHERE client_id = $1`, [clientId]);
    return rows[0] || null;
  }
  // The client's token, made the first time it is asked for
  async function tokenFor(clientId) {
    const row = await siteRow(clientId);
    if (row) return row.token;
    const token = crypto.randomBytes(24).toString('hex');
    await q(`INSERT INTO review_funnel_sites (client_id, token, created_at) VALUES ($1, $2, $3)`, [clientId, token, now().toISOString()]);
    return token;
  }
  async function clientOf(clientId) {
    const { rows } = await q(`SELECT id, name FROM clients WHERE id = $1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    return rows[0];
  }
  async function feedbackRow(id) {
    const { rows } = await q(`SELECT * FROM review_feedback WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  // Sends whichever of the two emails has not gone yet. Never throws: what failed is on the row.
  async function deliver(id, { baseUrl = '' } = {}) {
    const row = await feedbackRow(id);
    if (!row) throw bad('Feedback not found.', 404);
    const client = await clientOf(row.client_id);
    const cv = (await loadValues(row.client_id)) || {};
    const fb = { stars: row.stars, name: row.name, phone: row.phone || '', email: row.email || '', feedback: row.feedback };
    const stamp = () => now().toISOString();
    const off = 'Email is not connected on this server (the Gmail connection).';
    let clientTo = str(row.client_email), clientError = '';

    if (!row.client_emailed_at) {
      clientTo = str(cv.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientTo)) { clientTo = ''; clientError = ''; await q(`UPDATE review_feedback SET client_email = NULL, client_error = $2 WHERE id = $1`, [id, 'No email address on the client record.']); }
      else {
        try {
          if (!send) throw new Error(off);
          await send(R.clientEmail({ to: clientTo, ownerName: cv.owner_name, feedback: fb }));
          await q(`UPDATE review_feedback SET client_email = $2, client_emailed_at = $3, client_error = NULL WHERE id = $1`, [id, clientTo, stamp()]);
        } catch (err) {
          clientError = err.message;
          log.error(`[review-funnel] the email to the client did not send (${client.name}):`, err.message);
          await q(`UPDATE review_feedback SET client_email = $2, client_error = $3 WHERE id = $1`, [id, clientTo, err.message]);
        }
      }
    }
    if (!row.team_emailed_at) {
      try {
        if (!send) throw new Error(off);
        const b = base(baseUrl);
        await send(R.teamEmail({ to: str(env.REVIEW_FEEDBACK_TEAM_EMAIL) || R.TEAM_EMAIL, clientName: str(cv.company_name) || client.name, clientTo, clientError, link: b ? `${b}/clients/${row.client_id}/reviews` : '', feedback: fb }));
        await q(`UPDATE review_feedback SET team_emailed_at = $2, team_error = NULL WHERE id = $1`, [id, stamp()]);
      } catch (err) {
        log.error(`[review-funnel] the copy to the team did not send (${client.name}):`, err.message);
        await q(`UPDATE review_feedback SET team_error = $2 WHERE id = $1`, [id, err.message]);
      }
    }
    return feedbackRow(id);
  }

  // The public route: stored first, so a failed email never loses the message
  async function receive(token, body, { baseUrl = '' } = {}) {
    const t = str(token);
    const { rows } = t ? await q(`SELECT client_id FROM review_funnel_sites WHERE token = $1`, [t]) : { rows: [] };
    if (!rows.length) throw bad('Not found.', 404);
    const c = R.cleanSubmission(body);
    if (!c.ok) throw bad(c.errors[0], 400, { errors: c.errors });
    const id = crypto.randomUUID();
    const v = c.value;
    await q(`INSERT INTO review_feedback (id, client_id, stars, name, phone, email, feedback, page_url, received_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, rows[0].client_id, v.stars, v.name, v.phone || null, v.email || null, v.feedback, v.page_url || null, now().toISOString()]);
    await deliver(id, { baseUrl });
    return { ok: true, id };
  }

  const shape = r => ({
    id: r.id, stars: r.stars, name: r.name, phone: r.phone || '', email: r.email || '', feedback: r.feedback, page_url: r.page_url || '', received_at: r.received_at,
    client_email: r.client_email || '', client_emailed_at: r.client_emailed_at || null, client_error: r.client_error || '', team_emailed_at: r.team_emailed_at || null, team_error: r.team_error || '',
    handled_at: r.handled_at || null, handled_by: r.handled_by || '',
    // The client has not had it: no email went, and nobody has said they passed it on
    waiting: !r.client_emailed_at && !r.handled_at,
  });

  async function view(clientId, { baseUrl = '' } = {}) {
    await clientOf(clientId);
    const cv = (await loadValues(clientId)) || {};
    const site = await siteFor(clientId).catch(() => null);
    const row = await siteRow(clientId);
    const { rows } = await q(`SELECT * FROM review_feedback WHERE client_id = $1 ORDER BY received_at DESC LIMIT 50`, [clientId]);
    const link = R.reviewLink(cv);
    const values = { company_name: str(cv.company_name), owner_name: str(cv.owner_name), review_url: link.url };
    const sent = row && row.sent_at ? { at: row.sent_at, to: row.sent_to || '', by: row.sent_by || '', values: row.sent_values || {} } : null;
    return {
      link, values, client_email: str(cv.email), team_email: str(env.REVIEW_FEEDBACK_TEAM_EMAIL) || R.TEAM_EMAIL, mail_on: !!send,
      site: site ? { url: site.url, staging: !!site.staging } : null,
      sent, changed: !!sent && SITE_VALUES.some(k => str((sent.values || {})[k]) !== values[k]),
      address_known: !!base(baseUrl),
      feedback: rows.map(shape),
    };
  }

  async function sendToSite(clientId, { confirm = false, by = '', baseUrl = '' } = {}) {
    if (confirm !== true) throw bad('Sending to the site needs confirming.');
    await clientOf(clientId);
    const site = await siteFor(clientId);
    if (!site) throw bad('This client has no WordPress site connected yet. Connect it on the WordPress card first.', 409);
    const b = base(baseUrl);
    if (!b) throw bad('Copybot does not know its own address: set COPYBOT_URL on the server.', 500);
    const cv = (await loadValues(clientId)) || {};
    const link = R.reviewLink(cv);
    const values = { company_name: str(cv.company_name), owner_name: str(cv.owner_name), review_url: link.url };
    if (!values.company_name) throw bad('The company name is blank on the Record tab: the page would thank the customer for choosing nobody.', 409);
    const endpoint = `${b}${PUBLIC_PATH}/${await tokenFor(clientId)}`;
    let saved;
    try { saved = await wp.wpPost(site, '/llp-copybot/v1/review-funnel', { endpoint }); }
    catch (err) {
      if (/→ 404/.test(err.message)) throw bad(`The plugin on ${site.url} is too old for the Review Us page. Install the latest Copybot plugin on the site, then press this again.`, 409);
      throw bad(`The site refused the settings: ${err.message}`, 502);
    }
    if (!saved || saved.endpoint !== endpoint) throw bad('The site did not keep the address feedback is sent to. Nothing else was sent.', 502);
    // Only the values that are filled: a blank here never clears one on the site
    const filled = Object.fromEntries(Object.entries(values).filter(([, v]) => v));
    const back = await wp.wpPost(site, '/llp-copybot/v1/client-values', filled);
    const differs = Object.keys(filled).filter(k => str(back[k]) !== filled[k]);
    if (differs.length) throw bad(`The site did not keep: ${differs.join(', ')}.`, 502);
    await q(`UPDATE review_funnel_sites SET sent_at = $2, sent_to = $3, sent_by = $4, sent_values = $5 WHERE client_id = $1`, [clientId, now().toISOString(), site.url, str(by) || null, JSON.stringify(values)]);
    return view(clientId, { baseUrl });
  }

  async function resend(clientId, feedbackId, { baseUrl = '' } = {}) {
    const row = await feedbackRow(feedbackId);
    if (!row || String(row.client_id) !== String(clientId)) throw bad('Feedback not found.', 404);
    await deliver(feedbackId, { baseUrl });
    return view(clientId, { baseUrl });
  }

  // A person passed it on to the client themselves (the email never went)
  async function markHandled(clientId, feedbackId, { by = '', baseUrl = '' } = {}) {
    const row = await feedbackRow(feedbackId);
    if (!row || String(row.client_id) !== String(clientId)) throw bad('Feedback not found.', 404);
    await q(`UPDATE review_feedback SET handled_at = $2, handled_by = $3 WHERE id = $1`, [feedbackId, now().toISOString(), str(by) || null]);
    return view(clientId, { baseUrl });
  }

  return { receive, view, sendToSite, resend, markHandled, deliver, tokenFor };
}

module.exports = { createReviewFunnel, ensureReviewFunnelTables, PUBLIC_PATH, SITE_VALUES };
