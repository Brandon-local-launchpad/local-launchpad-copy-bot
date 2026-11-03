'use strict';

// ── Gmail for the listings inbox ──────────────────────────────────────────────────
// One mailbox, listings@locallaunchpad.co.uk, read through the Gmail API with an OAuth
// refresh token kept in the environment (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
// GMAIL_REFRESH_TOKEN; the set-up steps are docs/citations/Gmail_OAuth_Setup.md and
// tools/gmail-auth.js). Scope gmail.modify: read the messages, mark them read. Nothing is
// sent, deleted or forwarded from here.
//   accessToken()                       a fresh token, cached until a minute before it expires
//   list({ label, query, max })         message ids in INBOX or SPAM, newest first
//   get(id)                             the message with its headers, text and html decoded
//   markRead(id)                        removes the UNREAD label
// The secrets never go into an error message or a log.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me/';
const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

const configured = (env = process.env) => !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
const b64 = s => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

function scrub(msg, env) {
  let s = String(msg == null ? '' : msg);
  for (const k of ['GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_CLIENT_ID']) if (env[k]) s = s.split(env[k]).join('[hidden]');
  return s.replace(/ya29\.[A-Za-z0-9_-]+/g, '[token]').slice(0, 300);
}

// The parts of a message flattened: the first text/plain and text/html bodies
function bodies(payload) {
  const out = { text: '', html: '' };
  const walk = p => {
    if (!p) return;
    const mime = String(p.mimeType || '').toLowerCase();
    const data = p.body && p.body.data ? b64(p.body.data) : '';
    if (mime === 'text/plain' && data && !out.text) out.text = data;
    if (mime === 'text/html' && data && !out.html) out.html = data;
    for (const c of p.parts || []) walk(c);
  };
  walk(payload);
  return out;
}

function createGmail({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  let token = null, expiresAt = 0;
  const need = () => { if (!configured(env)) throw Object.assign(new Error('The listings inbox is not set up on this server (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN).'), { status: 503 }); };

  async function accessToken() {
    need();
    if (token && now() < expiresAt - 60000) return token;
    const body = new URLSearchParams({ client_id: env.GMAIL_CLIENT_ID, client_secret: env.GMAIL_CLIENT_SECRET, refresh_token: env.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' });
    const res = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    let j = null; try { j = await res.json(); } catch (_) {}
    if (!res.ok || !j || !j.access_token) throw Object.assign(new Error(`Gmail token refresh failed: ${scrub((j && (j.error_description || j.error)) || res.statusText, env)}`), { status: 502 });
    token = j.access_token; expiresAt = now() + (Number(j.expires_in) || 3600) * 1000;
    return token;
  }
  async function api(path, { method = 'GET', body = null } = {}) {
    const t = await accessToken();
    const res = await fetchImpl(API + path, { method, headers: { Authorization: `Bearer ${t}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (_) {}
    if (!res.ok) throw Object.assign(new Error(`Gmail ${method} ${path.split('?')[0]} failed: ${scrub((j && j.error && j.error.message) || res.statusText, env)}`), { status: res.status === 401 ? 502 : res.status });
    return j || {};
  }

  // label: INBOX or SPAM. Returns [{ id, threadId }]
  async function list({ label = 'INBOX', query = 'newer_than:7d', max = 50 } = {}) {
    const j = await api(`messages?labelIds=${encodeURIComponent(label)}&q=${encodeURIComponent(query)}&maxResults=${max}`);
    return j.messages || [];
  }
  async function get(id) {
    const m = await api(`messages/${encodeURIComponent(id)}?format=full`);
    const headers = {};
    for (const h of (m.payload && m.payload.headers) || []) headers[String(h.name).toLowerCase()] = h.value;
    const { text, html } = bodies(m.payload);
    return { id: m.id, threadId: m.threadId, labels: m.labelIds || [], snippet: m.snippet || '', received_at: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null, headers, text, html };
  }
  async function markRead(id) { return api(`messages/${encodeURIComponent(id)}/modify`, { method: 'POST', body: { removeLabelIds: ['UNREAD'] } }); }

  return { accessToken, list, get, markRead, configured: () => configured(env) };
}

module.exports = { createGmail, configured, bodies, scrub, SCOPE, TOKEN_URL, API };
