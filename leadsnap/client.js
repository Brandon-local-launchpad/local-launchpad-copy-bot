'use strict';

// ── LeadSnap public API client ───────────────────────────────────────────────
// One function per endpoint the GBP rank scans use (leadsnap/openapi.yaml is the
// reference). Bearer token from LEADSNAP_API_TOKEN only, never logged. The docs'
// server line says localhost, so the base URL is LEADSNAP_BASE_URL, else
// https://app.leadsnap.com, and GET /api/leadsnap/ping confirms it with list
// companies before anything else runs. Every create or re-run of a heatmap spends
// credits: nothing here is called from tests (recorded responses) or on page load.

const DEFAULT_BASE = 'https://app.leadsnap.com';
const PREFIX = '/public/api/v1';

function createLeadsnapClient({ token = process.env.LEADSNAP_API_TOKEN, baseUrl = process.env.LEADSNAP_BASE_URL || DEFAULT_BASE, fetchFn = global.fetch } = {}) {
  const base = String(baseUrl || DEFAULT_BASE).replace(/\/+$/, '');

  async function call(method, path, { query = null, body = null } = {}) {
    if (!token) throw Object.assign(new Error('LEADSNAP_API_TOKEN is not set on the server.'), { status: 503 });
    const url = new URL(base + PREFIX + path);
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    const res = await fetchFn(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text.slice(0, 300) }; }
    if (!res.ok) {
      const err = data && data.error;
      const msg = typeof err === 'string' ? err : (err && (err.description || err.title)) || (data && data.message) || `HTTP ${res.status}`;
      throw Object.assign(new Error(`LeadSnap ${method} ${path}: ${msg}`), { status: res.status === 401 ? 502 : 502, leadsnap_status: res.status, body: data });
    }
    return data;
  }

  // Paginated lists come back as { data: [...], total, last_page, ... }; rows() returns the data array
  const rows = r => (r && Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []);

  return {
    baseUrl: base,
    // The first call to make: confirms the base URL and the token
    listCompanies: async (query = {}) => rows(await call('GET', '/companies', { query: { per_page: 5, ...query } })),
    // GBP locations the account manages (Google place id, centre, review link)
    listLocations: async (query = {}) => rows(await call('GET', '/heatmaps/locations', { query: { per_page: 100, ...query } })),
    // One location in full: categories, service items, hours, completion, metadata
    getLocation: id => call('GET', `/locations/${encodeURIComponent(id)}`),
    // The grid's points for a centre, size and spacing, clipped to a polygon; creates nothing, spends nothing
    gridPoints: body => call('POST', '/heatmap/grid-points', { body }),
    // Spends credits: one heatmap per keyword × search type
    createHeatmap: body => call('POST', '/heatmaps', { body }),
    getHeatmap: id => call('GET', `/heatmaps/${encodeURIComponent(id)}`),
    getHeatmapCompetitors: id => call('GET', `/heatmaps/${encodeURIComponent(id)}/competitors`),
    listHeatmaps: async (query = {}) => await call('GET', '/heatmaps', { query: { per_page: 50, sort: '-created_at', ...query } }),
    // Schedules (a scheduled run spends credits when it runs)
    listSchedules: async (query = {}) => rows(await call('GET', '/heatmap/schedules', { query: { per_page: 100, ...query } })),
    createSchedule: body => call('POST', '/heatmap/schedules', { body }),
    getSchedule: id => call('GET', `/heatmap/schedules/${encodeURIComponent(id)}`),
    updateSchedule: (id, body) => call('PATCH', `/heatmap/schedules/${encodeURIComponent(id)}`, { body }),
    pauseSchedule: id => call('POST', `/heatmap/schedules/${encodeURIComponent(id)}/pause`),
    resumeSchedule: id => call('POST', `/heatmap/schedules/${encodeURIComponent(id)}/resume`),
    rows,
  };
}

module.exports = { createLeadsnapClient, DEFAULT_BASE, PREFIX };
