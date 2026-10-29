'use strict';

// ── DataForSEO SERP: Google organic, live advanced, at a town's coordinates ───────
// One SERP (top 10, desktop) per keyword and point, used by the demand gate only where
// the volume is under 10. Cached in serp_checks for CACHE_DAYS so a re-run does not
// re-buy. Credentials and the safe error message come from h1-research/dataforseo.js.
// Cost: SERP_COST_USD per SERP of 10 results (locations/rules.js).

const D = require('../h1-research/dataforseo');

const ENDPOINT = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
const CACHE_DAYS = 90;
// location_coordinate is "lat,lng,radius": the DataForSEO docs (read 29 Oct 2026) give the radius
// in mm, 199 to 199999, and 200 is their example; organic results follow the point, not the radius
const RADIUS = 200;
const DEPTH = 10;

const round4 = v => Math.round(Number(v) * 1e4) / 1e4;
const pick = i => ({ type: i.type, rank_group: i.rank_group, rank_absolute: i.rank_absolute, url: i.url, domain: i.domain, title: i.title });

// One live SERP. Returns { items (organic and the other top-level item types, trimmed), cost, check_url, se_results_count }
async function fetchSerp({ keyword, lat, lng }, { env = process.env, fetchImpl = fetch, timeoutMs = 60000 } = {}) {
  const creds = D.credentials(env);
  const auth = 'Basic ' + Buffer.from(`${creds.login}:${creds.password}`).toString('base64');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let body = null, res = null;
  try {
    res = await fetchImpl(ENDPOINT, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify([{ keyword, location_coordinate: `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)},${RADIUS}`, language_code: 'en', depth: DEPTH, device: 'desktop', os: 'windows' }]), signal: ctrl.signal });
    try { body = await res.json(); } catch (_) {}
  } catch (e) {
    throw Object.assign(new Error(D.safeMessage(e.name === 'AbortError' ? 'DataForSEO SERP did not answer' : `DataForSEO SERP could not be reached: ${e.message}`, creds)), { status: e.name === 'AbortError' ? 'timeout' : 'network' });
  } finally { clearTimeout(t); }
  const task = body && Array.isArray(body.tasks) ? body.tasks[0] : null;
  const fail = !res.ok ? { status: res.status, message: (body && body.status_message) || res.statusText }
    : !body ? { status: res.status, message: 'DataForSEO sent a reply that is not JSON' }
    : body.status_code !== 20000 ? { status: body.status_code, message: body.status_message }
    : !task ? { status: body.status_code, message: 'DataForSEO sent no task' }
    : task.status_code !== 20000 ? { status: task.status_code, message: task.status_message } : null;
  if (fail) throw Object.assign(new Error(D.safeMessage(fail.message || 'request failed', creds)), { status: fail.status });
  const result = (task.result && task.result[0]) || {};
  return { items: (result.items || []).map(pick), cost: round4(task.cost != null ? task.cost : body.cost || 0), check_url: result.check_url || '', se_results_count: result.se_results_count == null ? null : Number(result.se_results_count) };
}

async function ensureSerpTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS serp_checks (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      keyword     TEXT NOT NULL,
      lat         DOUBLE PRECISION NOT NULL,
      lng         DOUBLE PRECISION NOT NULL,
      fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      items       TEXT NOT NULL,
      cost        NUMERIC,
      check_url   TEXT
    );
    CREATE INDEX IF NOT EXISTS serp_checks_keyword_idx ON serp_checks (keyword);
  `);
}

// The cache then the API. point: { lat, lng } rounded to 4 places (about 10 m) for the key.
function createSerpStore(pool, { fetchSerpImpl = fetchSerp, now = () => new Date() } = {}) {
  const key = p => ({ lat: Math.round(Number(p.lat) * 1e4) / 1e4, lng: Math.round(Number(p.lng) * 1e4) / 1e4 });
  async function cached(keyword, point) {
    const k = key(point);
    const { rows } = await pool.query(`SELECT items, cost, check_url, fetched_at FROM serp_checks WHERE keyword = $1 AND lat = $2 AND lng = $3 ORDER BY fetched_at DESC LIMIT 1`, [keyword, k.lat, k.lng]);
    const r = rows[0];
    if (!r) return null;
    if (now().getTime() - new Date(r.fetched_at).getTime() > CACHE_DAYS * 86400000) return null;
    return { items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, cost: 0, cached: true, check_url: r.check_url || '', fetched_at: r.fetched_at };
  }
  async function lookup(keyword, point, opts = {}) {
    const hit = await cached(keyword, point);
    if (hit) return hit;
    const got = await fetchSerpImpl({ keyword, lat: point.lat, lng: point.lng }, opts);
    const k = key(point);
    await pool.query(`INSERT INTO serp_checks (keyword, lat, lng, items, cost, check_url) VALUES ($1, $2, $3, $4, $5, $6)`, [keyword, k.lat, k.lng, JSON.stringify(got.items), got.cost, got.check_url]);
    return { ...got, cached: false };
  }
  // How many of these (keyword, point) pairs the cache already holds
  async function cachedCount(pairs) {
    let n = 0;
    for (const p of pairs) if (await cached(p.keyword, p.point)) n++;
    return n;
  }
  return { cached, lookup, cachedCount };
}

module.exports = { ENDPOINT, CACHE_DAYS, RADIUS, DEPTH, fetchSerp, ensureSerpTables, createSerpStore };
