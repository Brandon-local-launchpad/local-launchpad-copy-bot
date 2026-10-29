'use strict';

// ── Google Search Console: the query report through the API (stage 9, 29 Oct 2026) ────
// A service account (its JSON key in GOOGLE_SERVICE_ACCOUNT_JSON, nowhere else) that Brandon
// adds as a user on each client's Search Console property. The token: a JWT signed RS256 with
// Node's crypto, exchanged at Google's token endpoint (no library). The report: searchanalytics
// query for the last 90 days, country GBR, by query and page, up to 5,000 rows. Nothing here
// is stored; the service (blog/search-console.js) keeps the rows as a client asset.

const crypto = require('crypto');

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://searchconsole.googleapis.com/webmasters/v3/sites';
const DAYS = 90;
const ROW_LIMIT = 5000;

function credentials(env = process.env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw Object.assign(new Error('Search Console is not set up: GOOGLE_SERVICE_ACCOUNT_JSON is missing (the service account key, as one line of JSON).'), { status: 'config' });
  let json;
  try { json = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { throw Object.assign(new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not JSON.'), { status: 'config' }); }
  if (!json.client_email || !json.private_key) throw Object.assign(new Error('GOOGLE_SERVICE_ACCOUNT_JSON has no client_email or private_key.'), { status: 'config' });
  return { email: json.client_email, key: json.private_key, tokenUri: json.token_uri || TOKEN_URL };
}

const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// The signed JWT for the token exchange (an hour's life)
function serviceAccountJwt(creds, { now = Math.floor(Date.now() / 1000), scope = SCOPE } = {}) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: creds.email, scope, aud: creds.tokenUri || TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), creds.key);
  return `${header}.${claims}.${b64url(signature)}`;
}

// A message safe to show: never the key
const safe = (msg, creds) => String(msg || '').split(creds && creds.key ? creds.key : '\u0000').join('[hidden]').slice(0, 300);

async function accessToken(creds, { fetchImpl = fetch, now } = {}) {
  const jwt = serviceAccountJwt(creds, { now });
  const res = await fetchImpl(creds.tokenUri || TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}` });
  let body = null;
  try { body = await res.json(); } catch (_) {}
  if (!res.ok || !body || !body.access_token) throw Object.assign(new Error(`Google refused the service account: ${safe((body && (body.error_description || body.error)) || res.statusText, creds)}`), { status: res.status });
  return body.access_token;
}

// The dates: the last `days` full days up to yesterday (Search Console's data is a day or two behind)
function dateRange(days = DAYS, now = new Date()) {
  const end = new Date(now.getTime() - 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const iso = d => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

// property: the Search Console property as Google names it ("sc-domain:edensedge.co.uk" or "https://edensedge.co.uk/")
// Returns { rows: [{ query, page, clicks, impressions, ctr, position }], startDate, endDate, property }
async function queryReport(property, { env = process.env, fetchImpl = fetch, now = new Date(), days = DAYS, country = 'gbr', token = null } = {}) {
  const prop = String(property || '').trim();
  if (!prop) throw Object.assign(new Error('The client has no Search Console property (the Record tab\'s Blog card).'), { status: 400 });
  const creds = credentials(env);
  const t = token || await accessToken(creds, { fetchImpl, now });
  const { startDate, endDate } = dateRange(days, now);
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const body = { startDate, endDate, dimensions: ['query', 'page'], rowLimit: ROW_LIMIT, startRow, dimensionFilterGroups: country ? [{ filters: [{ dimension: 'country', operator: 'equals', expression: country }] }] : [] };
    const res = await fetchImpl(`${API}/${encodeURIComponent(prop)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (!res.ok || !json) throw Object.assign(new Error(`Search Console answered ${res.status}: ${safe((json && json.error && json.error.message) || res.statusText, creds)}`), { status: res.status });
    const got = Array.isArray(json.rows) ? json.rows : [];
    for (const r of got) rows.push({ query: String((r.keys || [])[0] || ''), page: String((r.keys || [])[1] || ''), clicks: Number(r.clicks) || 0, impressions: Number(r.impressions) || 0, ctr: Number(r.ctr) || 0, position: Number(r.position) || 0 });
    if (got.length < ROW_LIMIT) break;
  }
  return { rows, startDate, endDate, property: prop, days };
}

module.exports = { credentials, serviceAccountJwt, accessToken, dateRange, queryReport, SCOPE, TOKEN_URL, API, DAYS };
