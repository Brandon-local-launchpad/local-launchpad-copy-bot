'use strict';

// ── Local Falcon API client (rank scans, 9 Nov 2026) ─────────────────────────
// One function per endpoint the rank scans use. The reference is the OpenAPI spec at
// https://docs.localfalcon.com/openapi.yaml (base https://api.localfalcon.com). The key is
// LOCALFALCON_API_KEY only, sent as the api_key form field and never logged. Bodies are form
// encoded: the API does not read JSON.
//
// What spends credits: runScan (one credit per grid point) and a location search (2 credits,
// not used here). Reading the account, saved locations and reports is free. Nothing here
// retries: the docs say a retried run-scan spends the credits again.

const BASE = 'https://api.localfalcon.com';

function createLocalFalconClient({ key = process.env.LOCALFALCON_API_KEY, baseUrl = process.env.LOCALFALCON_BASE_URL || BASE, fetchFn = global.fetch } = {}) {
  const base = String(baseUrl || BASE).replace(/\/+$/, '');

  async function call(path, fields = {}) {
    if (!key) throw Object.assign(new Error('LOCALFALCON_API_KEY is not set on the server.'), { status: 503 });
    const body = new URLSearchParams();
    body.set('api_key', key);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== '') body.set(k, String(v));
    const res = await fetchFn(base + path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString() });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { message: text.slice(0, 300) }; }
    const ok = res.ok && !(data && data.success === false);
    if (!ok) {
      const msg = (data && (data.message || data.code_desc)) || `HTTP ${res.status}`;
      throw Object.assign(new Error(`Local Falcon ${path}: ${msg}`), { status: 502, lf_status: res.status, body: data });
    }
    return { http: res.status, code: data && data.code, message: data && data.message, data: data ? data.data : null };
  }

  return {
    baseUrl: base,
    // Free: the plan, API access and the credit balance
    account: async () => (await call('/v2/account')).data || {},
    // Free: saved locations matching a query (name, address or place id)
    listLocations: async (query = '') => {
      const d = (await call('/v1/locations/', { query, limit: 100 })).data || {};
      return Array.isArray(d.locations) ? d.locations : Array.isArray(d) ? d : [];
    },
    // Saves a Google listing to the account by place id (the docs give no credit cost)
    addLocation: async placeId => call('/v2/locations/add', { platform: 'google', place_id: placeId }),
    // SPENDS CREDITS: grid_size x grid_size points. eager: answers within 20 s, with a report key
    // and status processing when the scan is still running. Never retried.
    runScan: async ({ place_id, keyword, lat, lng, grid_size, radius_km }) => {
      const r = await call('/v2/run-scan/', { place_id, keyword, lat, lng, grid_size, radius: radius_km, measurement: 'km', platform: 'google', eager: 'true' });
      return { processing: r.http === 202 || (r.data && r.data.status === 'processing'), report_key: (r.data && r.data.report_key) || null, report: r.http === 202 ? null : r.data };
    },
    // Free: one scan report with its grid points (data_points is only sent when asked for)
    getReport: async reportKey => {
      const r = await call(`/v1/reports/${encodeURIComponent(reportKey)}/`, { fieldmask: '*,data_points' });
      return { processing: r.http === 202 || (r.data && r.data.status === 'processing'), report: r.http === 202 ? null : r.data };
    },
    // Free: the scan reports for a place id since a date (MM/DD/YYYY)
    listReports: async ({ place_id, start_date, keyword, limit = 100 } = {}) => {
      const d = (await call('/v1/reports/', { place_id, start_date, keyword, limit })).data || {};
      return Array.isArray(d.reports) ? d.reports : [];
    },
  };
}

module.exports = { createLocalFalconClient, BASE };
