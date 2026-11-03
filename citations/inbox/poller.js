'use strict';

// ── The listings inbox poller ─────────────────────────────────────────────────────
// Every minute (server.js), the inbox and spam of listings@locallaunchpad.co.uk are read
// for messages Copybot has not seen (citation_emails, by Gmail id). Each one is matched to
// a client (the recipient address) and a directory (the sender's domain). Only a message
// from a known directory to a known client is acted on:
//   a plain confirmation link   opened with one GET (no login, no form); the row moves from
//                               awaiting email verification (or not started, submitted) to
//                               awaiting approval, and the event sits on the row
//   a code                      shown on the row for the person doing the submission
//   a link that needs a browser shown on the row
//   anything else               recorded on the row as information
// Every message is recorded with what was done and marked read. Nothing is replied to,
// forwarded or deleted.

const { createGmail } = require('./gmail');
const M = require('./match');
const { slugify } = require('../../page-map/slugs');

const str = v => (v == null ? '' : String(v)).trim();
const json = v => (v == null ? null : JSON.stringify(v));
const parse = v => { if (v == null || v === '') return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return null; } };
const MAX_EVENTS = 20;

async function ensureInboxTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS citation_emails (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gmail_id      TEXT UNIQUE NOT NULL,
      received_at   TIMESTAMPTZ,
      seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      label         TEXT NOT NULL DEFAULT 'INBOX',
      from_address  TEXT NOT NULL DEFAULT '',
      from_domain   TEXT NOT NULL DEFAULT '',
      to_address    TEXT NOT NULL DEFAULT '',
      subject       TEXT NOT NULL DEFAULT '',
      snippet       TEXT NOT NULL DEFAULT '',
      client_id     UUID,
      directory_id  UUID,
      action        TEXT NOT NULL DEFAULT '',
      detail        TEXT
    );
    CREATE TABLE IF NOT EXISTS citation_inbox_polls (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status      TEXT NOT NULL,
      listed      INTEGER NOT NULL DEFAULT 0,
      new_count   INTEGER NOT NULL DEFAULT 0,
      acted       INTEGER NOT NULL DEFAULT 0,
      error       TEXT
    );
  `);
  await pool.query(`ALTER TABLE client_citations ADD COLUMN IF NOT EXISTS inbox TEXT`);
}

// fetchFn: for opening confirmation links (never the Gmail API, which has its own)
function createInbox({ pool, store, clientCitations, gmail = null, env = process.env, fetchFn = global.fetch, log = console, now = () => new Date() }) {
  const gm = gmail || createGmail({ env });
  let running = false;

  async function openLink(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetchFn(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Copybot listings', Accept: 'text/html,*/*' }, signal: ctrl.signal });
      const html = await res.text().catch(() => '');
      const text = M.textOf(html).slice(0, 400);
      return { ok: res.ok, status: res.status, final_url: res.url || url, said: text };
    } catch (e) { return { ok: false, status: null, final_url: url, said: e.name === 'AbortError' ? 'no answer within 15s' : e.message }; }
    finally { clearTimeout(t); }
  }

  // The event on the row, and the status move when a confirmation link opened
  async function recordOnRow(clientId, directoryId, event, { newStatus = null } = {}) {
    const location = await clientCitations.primaryLocation(clientId);
    const { rows } = await pool.query(`SELECT id, status, inbox FROM client_citations WHERE client_id = $1 AND location_id = $2 AND directory_id = $3`, [clientId, location.id, directoryId]);
    const events = [event, ...((rows[0] && parse(rows[0].inbox)) || [])].slice(0, MAX_EVENTS);
    const at = now();
    if (rows.length) {
      const moved = newStatus && ['not_started', 'submitted', 'awaiting_email'].includes(rows[0].status) ? newStatus : rows[0].status;
      await pool.query(`UPDATE client_citations SET inbox = $2, status = $3, updated_at = $4 WHERE id = $1`, [rows[0].id, json(events), moved, at]);
      return { status: moved, moved: moved !== rows[0].status };
    }
    const status = newStatus || 'awaiting_email';
    await pool.query(`INSERT INTO client_citations (client_id, location_id, directory_id, status, inbox, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`, [clientId, location.id, directoryId, status, json(events), at]);
    return { status, moved: true };
  }

  // One message, already fetched and parsed. Returns the record written to citation_emails.
  async function handle(parsed, { label = 'INBOX', clients, directories }) {
    const client = M.matchClient(parsed.recipient, clients);
    const dir = M.matchDirectory(parsed.from, directories);
    const rec = { gmail_id: parsed.id, received_at: parsed.received_at, label, from_address: parsed.from.address, from_domain: parsed.from.domain, to_address: parsed.recipient ? parsed.recipient.address : '', subject: parsed.subject, snippet: parsed.snippet.slice(0, 300), client_id: client ? client.id : null, directory_id: dir ? dir.directory.id : null, action: '', detail: {} };
    if (!parsed.recipient) rec.action = 'ignored: not to a listings address';
    else if (!client) rec.action = `ignored: no client for ${parsed.recipient.address}`;
    else if (!dir) rec.action = `ignored: unknown sender ${parsed.from.domain}`;
    else {
      const base = { at: parsed.received_at || now().toISOString(), message_id: parsed.id, subject: parsed.subject, from: parsed.from.address };
      if (parsed.confirm_links.length) {
        const link = parsed.confirm_links[0];
        const opened = await openLink(link.url);
        const event = { ...base, kind: 'link_opened', url: link.url, ok: opened.ok, status: opened.status, final_url: opened.final_url, said: opened.said, codes: parsed.codes };
        const r = await recordOnRow(client.id, dir.directory.id, event, { newStatus: opened.ok ? 'awaiting_approval' : null });
        rec.action = opened.ok ? `opened the confirmation link; row ${r.moved ? 'moved to' : 'stays'} ${r.status}` : `the confirmation link answered ${opened.status || opened.said}; shown on the row`;
        rec.detail = { url: link.url, opened, row_status: r.status, codes: parsed.codes };
      } else if (parsed.codes.length) {
        const event = { ...base, kind: 'code', codes: parsed.codes, browser_links: parsed.browser_links.slice(0, 3) };
        const r = await recordOnRow(client.id, dir.directory.id, event);
        rec.action = `code ${parsed.codes.join(', ')} shown on the row`;
        rec.detail = { codes: parsed.codes, row_status: r.status };
      } else if (parsed.browser_links.length) {
        const event = { ...base, kind: 'browser_link', browser_links: parsed.browser_links.slice(0, 3) };
        const r = await recordOnRow(client.id, dir.directory.id, event);
        rec.action = 'a link that needs a browser shown on the row';
        rec.detail = { browser_links: parsed.browser_links.slice(0, 3), row_status: r.status };
      } else {
        const event = { ...base, kind: 'info', snippet: parsed.snippet.slice(0, 200) };
        const r = await recordOnRow(client.id, dir.directory.id, event);
        rec.action = 'recorded on the row';
        rec.detail = { row_status: r.status };
      }
    }
    await pool.query(`INSERT INTO citation_emails (gmail_id, received_at, label, from_address, from_domain, to_address, subject, snippet, client_id, directory_id, action, detail) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [rec.gmail_id, rec.received_at, rec.label, rec.from_address, rec.from_domain, rec.to_address, rec.subject, rec.snippet, rec.client_id, rec.directory_id, rec.action, json(rec.detail)]);
    return rec;
  }

  async function clientsForMatching() {
    const { rows } = await pool.query(`SELECT id, name FROM clients WHERE archived_at IS NULL`);
    return rows.map(r => ({ id: r.id, name: r.name, slug: slugify(r.name) }));
  }

  // One pass over INBOX and SPAM
  async function poll({ labels = ['INBOX', 'SPAM'], max = 50 } = {}) {
    if (running) return { status: 'busy' };
    if (!gm.configured()) return { status: 'not configured' };
    running = true;
    const out = { status: 'done', listed: 0, new: 0, acted: 0, records: [], error: null, at: now().toISOString() };
    try {
      const [clients, directories] = await Promise.all([clientsForMatching(), store.list({ includeRetired: true })]);
      for (const label of labels) {
        const ids = await gm.list({ label, max });
        out.listed += ids.length;
        for (const { id } of ids) {
          const { rows } = await pool.query(`SELECT 1 FROM citation_emails WHERE gmail_id = $1`, [id]);
          if (rows.length) continue;
          const msg = await gm.get(id);
          const parsed = M.parseEmail(msg);
          const rec = await handle(parsed, { label, clients, directories });
          out.new++;
          if (!/^ignored/.test(rec.action)) out.acted++;
          out.records.push({ id, from: rec.from_address, to: rec.to_address, subject: rec.subject, action: rec.action });
          await gm.markRead(id).catch(e => log.warn(`[inbox] could not mark ${id} read: ${e.message}`));
        }
      }
    } catch (e) {
      out.status = 'failed'; out.error = e.message;
      log.error(`[inbox] poll failed: ${e.message}`);
    } finally {
      running = false;
      await pool.query(`INSERT INTO citation_inbox_polls (at, status, listed, new_count, acted, error) VALUES ($1, $2, $3, $4, $5, $6)`, [now(), out.status, out.listed, out.new, out.acted, out.error]).catch(() => {});
    }
    return out;
  }

  async function status() {
    const { rows: polls } = await pool.query(`SELECT at, status, listed, new_count, acted, error FROM citation_inbox_polls ORDER BY at DESC LIMIT 1`);
    const { rows: emails } = await pool.query(`SELECT e.*, c.name AS client_name, d.name AS directory_name FROM citation_emails e LEFT JOIN clients c ON c.id = e.client_id LEFT JOIN citation_directories d ON d.id = e.directory_id ORDER BY e.received_at DESC NULLS LAST, e.seen_at DESC LIMIT 100`);
    return { configured: gm.configured(), running, last_poll: polls[0] ? { ...polls[0], listed: Number(polls[0].listed), new_count: Number(polls[0].new_count), acted: Number(polls[0].acted) } : null, emails: emails.map(e => ({ ...e, detail: parse(e.detail) })) };
  }
  async function emailsFor(clientId) {
    const { rows } = await pool.query(`SELECT e.*, d.name AS directory_name FROM citation_emails e LEFT JOIN citation_directories d ON d.id = e.directory_id WHERE e.client_id = $1 ORDER BY e.received_at DESC NULLS LAST LIMIT 50`, [clientId]);
    return rows.map(e => ({ ...e, detail: parse(e.detail) }));
  }

  return { poll, handle, status, emailsFor, openLink, recordOnRow };
}

module.exports = { createInbox, ensureInboxTables, MAX_EVENTS };
