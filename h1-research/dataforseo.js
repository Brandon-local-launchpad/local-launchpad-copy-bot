'use strict';

// ── DataForSEO: Google Ads search volume (live) ─────────────────────────────
// Same call as tools/test-dataforseo.js (branch dataforseo-test). Country-level volume
// only: United Kingdom (location_code 2826), English; the town is in the keyword.
// Billing is per task of up to 1,000 keywords, so every client's keywords go in as few
// tasks as possible (chunks of 1,000, one task per call).
//
// Credentials come from the environment (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD) and are
// never logged, stored or put in an error: a failure carries the status code and
// DataForSEO's message only, with the credentials scrubbed from it just in case.

const ENDPOINT = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';
const UK = { location_code: 2826, language_code: 'en' };
const CHUNK = 1000;

function credentials(env = process.env) {
  const login = env.DATAFORSEO_LOGIN, password = env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw Object.assign(new Error('DataForSEO is not set up: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are missing'), { status: 'config' });
  return { login, password };
}

// A message safe to show and store: no credentials, no auth header, short
function safeMessage(msg, creds) {
  let s = String(msg == null ? '' : msg);
  for (const v of [creds && creds.login, creds && creds.password, creds && Buffer.from(`${creds.login}:${creds.password}`).toString('base64')]) if (v) s = s.split(v).join('[hidden]');
  return s.replace(/Basic\s+[A-Za-z0-9+/=]+/g, 'Basic [hidden]').slice(0, 300);
}

// keywords: unique, lower case. Returns { results: Map keyword → { volume, cpc, status }, cost, calls }
// retryDelays: waits before each retry of a busy reply (DataForSEO's Google Ads endpoints answer
// 50301 "Too many requests" when busy); onRetry({ attempt, of, waitMs, status, message }) is told first
const RETRY_DELAYS = [10000, 30000, 60000];
const isBusy = st => st === 'timeout' || st === 'network' || st === 429 || (typeof st === 'number' && ((st >= 500 && st < 600) || st === 40202 || st >= 50000));
async function searchVolume(keywords, { env = process.env, fetchImpl = fetch, target = UK, timeoutMs = 120000, retryDelays = RETRY_DELAYS, onRetry = null, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const creds = credentials(env);
  const auth = 'Basic ' + Buffer.from(`${creds.login}:${creds.password}`).toString('base64');
  const results = new Map();
  let cost = 0, calls = 0;
  for (let i = 0; i < keywords.length; i += CHUNK) {
    const chunk = keywords.slice(i, i + CHUNK);
    let task = null, body = null;
    // A busy reply (429, 5xx, DataForSEO 40202 or 5xxxx, a timeout or a network error) is
    // retried after a wait; anything else (bad credentials, no credit) fails at once
    for (let attempt = 0; ; attempt++) {
      let fail = null;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res = null;
      body = null;
      try {
        calls++;
        res = await fetchImpl(ENDPOINT, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify([{ keywords: chunk, ...target }]), signal: ctrl.signal });
        try { body = await res.json(); } catch (_) {}
      } catch (e) {
        fail = { status: e.name === 'AbortError' ? 'timeout' : 'network', message: e.name === 'AbortError' ? `DataForSEO did not answer within ${Math.round(timeoutMs / 1000)}s` : `DataForSEO could not be reached: ${e.message}` };
      } finally { clearTimeout(timer); }
      if (!fail) {
        task = body && Array.isArray(body.tasks) ? body.tasks[0] : null;
        fail = !res.ok ? { status: res.status, message: (body && body.status_message) || res.statusText }
          : !body ? { status: res.status, message: 'DataForSEO sent a reply that is not JSON' }
          : body.status_code !== 20000 ? { status: body.status_code, message: body.status_message }
          : !task ? { status: body.status_code, message: 'DataForSEO sent no task' }
          : task.status_code !== 20000 ? { status: task.status_code, message: task.status_message } : null;
      }
      if (!fail) break;
      const message = safeMessage(fail.message || 'request failed', creds);
      if (!isBusy(fail.status) || attempt >= retryDelays.length) throw Object.assign(new Error(message), { status: fail.status, cost, calls, attempts: attempt + 1 });
      const wait = retryDelays[attempt];
      if (onRetry) await onRetry({ attempt: attempt + 1, of: retryDelays.length, waitMs: wait, status: fail.status, message });
      await sleep(wait);
    }
    cost += Number(task.cost != null ? task.cost : body.cost) || 0;
    for (const r of task.result || []) {
      if (!r || r.keyword == null) continue;
      const volume = r.search_volume == null ? null : Number(r.search_volume);
      results.set(String(r.keyword).toLowerCase(), { volume, cpc: r.cpc == null ? null : Number(r.cpc), status: volume == null ? 'null' : 'ok' });
    }
    for (const k of chunk) if (!results.has(k)) results.set(k, { volume: null, cpc: null, status: 'null' });
  }
  return { results, cost: Math.round(cost * 10000) / 10000, calls };
}

// The account balance in USD (GET /v3/appendix/user_data, free of charge): money.balance
async function balance({ env = process.env, fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const creds = credentials(env);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://api.dataforseo.com/v3/appendix/user_data', { headers: { Authorization: 'Basic ' + Buffer.from(`${creds.login}:${creds.password}`).toString('base64') }, signal: ctrl.signal });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    const r = body && body.tasks && body.tasks[0] && body.tasks[0].result && body.tasks[0].result[0];
    if (!res.ok || !body || body.status_code !== 20000 || !r || !r.money) throw Object.assign(new Error(safeMessage((body && body.status_message) || res.statusText || 'no balance in the reply', creds)), { status: res.status });
    return Number(r.money.balance);
  } catch (e) {
    if (e.status) throw e;
    throw Object.assign(new Error(safeMessage(e.name === 'AbortError' ? 'DataForSEO did not answer' : e.message, creds)), { status: 'network' });
  } finally { clearTimeout(timer); }
}

module.exports = { searchVolume, balance, credentials, safeMessage, isBusy, ENDPOINT, UK, CHUNK, RETRY_DELAYS };
