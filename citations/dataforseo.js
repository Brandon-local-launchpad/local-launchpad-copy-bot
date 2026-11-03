'use strict';

// ── DataForSEO for the citations module ───────────────────────────────────────────
// One request core (the credentials, the safe error message, the busy retry and the
// per task cost come from h1-research/dataforseo.js) and the calls the module makes:
//   bulkRanks(domains)                 backlinks/bulk_ranks/live: the DataForSEO domain rank
//                                      (0 to 1000) per domain, 1,000 domains per task. Shown
//                                      as the DA column (Brandon, 3 Nov: filled at seed time).
//   serp(keyword)                      serp/google/organic/live/advanced, United Kingdom, top 10:
//                                      the scan's "site:yell.com "Edens Edge"" look-up
//   backlinks(target)                  backlinks/backlinks/live, one per referring domain: the
//                                      pages that link to the client's site
//   referringDomains(target)           backlinks/referring_domains/live: a competitor's referring
//                                      domains with rank, backlinks and spam score
// Every call returns { items, cost, attempts, ... }; the caller adds the cost up and logs it
// (citations/store.js logCost). Nothing here is called on page load or in a fixture: the
// fixtures pass fetchImpl.

const D = require('../h1-research/dataforseo');

const BASE = 'https://api.dataforseo.com/v3/';
const UK = { location_code: 2826, language_code: 'en' };
const RETRY_DELAYS = [5000, 15000, 30000];
const round4 = v => Math.round(Number(v || 0) * 1e4) / 1e4;

// One task to one endpoint. A busy or failing DataForSEO is retried after RETRY_DELAYS;
// a bad request (40xxx), bad credentials or no credit fails at once with a safe message.
async function call(endpoint, payload, { env = process.env, fetchImpl = fetch, timeoutMs = 60000, retryDelays = RETRY_DELAYS, onRetry = null, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const creds = D.credentials(env);
  const auth = 'Basic ' + Buffer.from(`${creds.login}:${creds.password}`).toString('base64');
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let body = null, res = null, fail = null;
    try {
      res = await fetchImpl(BASE + endpoint, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify([payload]), signal: ctrl.signal });
      try { body = await res.json(); } catch (_) {}
    } catch (e) {
      fail = { status: e.name === 'AbortError' ? 'timeout' : 'network', message: e.name === 'AbortError' ? `DataForSEO ${endpoint} did not answer` : `DataForSEO could not be reached: ${e.message}` };
    } finally { clearTimeout(t); }
    const task = body && Array.isArray(body.tasks) ? body.tasks[0] : null;
    if (!fail) {
      fail = !res.ok ? { status: res.status, message: (body && body.status_message) || res.statusText }
        : !body ? { status: res.status, message: 'DataForSEO sent a reply that is not JSON' }
        : body.status_code !== 20000 ? { status: body.status_code, message: body.status_message }
        : !task ? { status: body.status_code, message: 'DataForSEO sent no task' }
        : task.status_code !== 20000 ? { status: task.status_code, message: task.status_message } : null;
    }
    if (!fail) {
      const result = (task.result && task.result[0]) || {};
      return { result, items: result.items || [], cost: round4(task.cost != null ? task.cost : body.cost), attempts: attempt + 1, id: task.id || null };
    }
    const message = D.safeMessage(fail.message || 'request failed', creds);
    if (!D.isBusy(fail.status) || attempt >= retryDelays.length) throw Object.assign(new Error(message), { status: fail.status, attempts: attempt + 1, endpoint });
    const wait = retryDelays[attempt];
    if (onRetry) await onRetry({ attempt: attempt + 1, of: retryDelays.length, waitMs: wait, status: fail.status, message });
    await sleep(wait);
  }
}

// The domain rank per domain: Map domain → rank (null when DataForSEO has none). Chunks of 1,000.
async function bulkRanks(domains, opts = {}) {
  const list = [...new Set((domains || []).map(d => String(d || '').toLowerCase().replace(/^www\./, '')).filter(Boolean))];
  const ranks = new Map();
  let cost = 0, calls = 0;
  for (let i = 0; i < list.length; i += 1000) {
    const chunk = list.slice(i, i + 1000);
    const r = await call('backlinks/bulk_ranks/live', { targets: chunk }, opts);
    calls++; cost += r.cost;
    for (const it of r.items) if (it && it.target) ranks.set(String(it.target).toLowerCase().replace(/^www\./, ''), it.rank == null ? null : Number(it.rank));
    for (const d of chunk) if (!ranks.has(d)) ranks.set(d, null);
  }
  return { ranks, cost: round4(cost), calls };
}

// Google organic, United Kingdom, desktop, top `depth`. Items trimmed to what the scan reads.
async function serp(keyword, { depth = 10, ...opts } = {}) {
  let r;
  try { r = await call('serp/google/organic/live/advanced', { keyword, ...UK, depth, device: 'desktop', os: 'windows' }, opts); }
  catch (e) {
    // "No Search Results" is DataForSEO's answer to a query Google shows nothing for (a site: search
    // on a domain with no page for the name): an empty result, not a failure (3 Nov, Fixatrader)
    if (/no search results/i.test(e.message)) return { items: [], cost: 0, check_url: '', total: 0, attempts: e.attempts || 1, empty: true };
    throw e;
  }
  const items = r.items.filter(i => i && i.type === 'organic').map(i => ({ rank: i.rank_absolute, url: i.url, domain: i.domain, title: i.title || '', description: i.description || '' }));
  return { items, cost: r.cost, check_url: r.result.check_url || '', total: r.result.se_results_count == null ? null : Number(r.result.se_results_count), attempts: r.attempts };
}

// The pages linking to `target` (a domain), one per referring domain, live index
async function backlinks(target, { limit = 1000, ...opts } = {}) {
  const r = await call('backlinks/backlinks/live', { target, mode: 'one_per_domain', limit, include_subdomains: true, backlinks_status_type: 'live', order_by: ['rank,desc'] }, opts);
  const items = r.items.map(i => ({ domain_from: String(i.domain_from || '').toLowerCase().replace(/^www\./, ''), url_from: i.url_from, url_to: i.url_to, anchor: i.anchor || '', rank: i.rank == null ? null : Number(i.rank), domain_rank: i.domain_from_rank == null ? null : Number(i.domain_from_rank), first_seen: i.first_seen || null, dofollow: !!i.dofollow }));
  return { items, cost: r.cost, total: r.result.total_count == null ? null : Number(r.result.total_count), attempts: r.attempts };
}

// A domain's referring domains with their rank, backlink count and spam score
async function referringDomains(target, { limit = 1000, ...opts } = {}) {
  const r = await call('backlinks/referring_domains/live', { target, limit, include_subdomains: true, backlinks_status_type: 'live', order_by: ['rank,desc'], exclude_internal_backlinks: true }, opts);
  const items = r.items.map(i => ({ domain: String(i.domain || '').toLowerCase().replace(/^www\./, ''), rank: i.rank == null ? null : Number(i.rank), backlinks: Number(i.backlinks || 0), spam_score: i.backlinks_spam_score == null ? null : Number(i.backlinks_spam_score), first_seen: i.first_seen || null, referring_pages: Number(i.referring_pages || 0) }));
  return { items, cost: r.cost, total: r.result.total_count == null ? null : Number(r.result.total_count), attempts: r.attempts };
}

// A listing page read through DataForSEO's OnPage content parsing (JavaScript on), so a site
// that refuses a direct request still gives its text (3 Nov: every listing page answered 403
// to Copybot). Returns { ok, status, text, titles, cost }: the page's text blocks joined with
// newlines, the headings and title as name candidates. ok is false on a non 2xx status or no text.
async function contentParsing(url, opts = {}) {
  const r = await call('on_page/content_parsing/live', { url, enable_javascript: true, accept_language: 'en-GB' }, { timeoutMs: 120000, ...opts });
  const it = r.items[0] || {};
  const texts = [], titles = [];
  const walk = (o, key = '') => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.text === 'string' && o.text.trim()) texts.push(o.text.trim());
    if (typeof o.h_title === 'string' && o.h_title.trim()) titles.push(o.h_title.trim());
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object' && k !== 'text') walk(v, k);
  };
  walk(it.page_content || {});
  const pc = it.page_content || {};
  for (const k of ['title', 'h1']) if (typeof pc[k] === 'string' && pc[k].trim()) titles.unshift(pc[k].trim());
  const status = it.status_code == null ? null : Number(it.status_code);
  const text = texts.join('\n');
  return { ok: !!(status && status >= 200 && status < 300 && text.length > 40), status, text, titles: [...new Set(titles)], cost: r.cost, attempts: r.attempts };
}

// A business's Google Business Profile as Google shows it (business_data/google/my_business_info/live):
// the category and additional categories, the phone, the site, the address. keyword: the name and
// town (or address). Returns null when Google shows no profile for the keyword.
async function businessInfo(keyword, opts = {}) {
  const r = await call('business_data/google/my_business_info/live', { keyword, ...UK }, { timeoutMs: 90000, ...opts });
  const it = r.items[0] || null;
  return { info: it ? { title: it.title || '', category: it.category || '', additional_categories: it.additional_categories || [], phone: it.phone || '', url: it.url || '', address: it.address || '', cid: it.cid || '', place_id: it.place_id || '', rating: it.rating && it.rating.value != null ? Number(it.rating.value) : null, reviews: it.rating && it.rating.votes_count != null ? Number(it.rating.votes_count) : null } : null, cost: r.cost, attempts: r.attempts };
}

const configured = (env = process.env) => !!(env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD);

module.exports = { call, bulkRanks, serp, backlinks, referringDomains, contentParsing, businessInfo, configured, BASE, UK, RETRY_DELAYS };
