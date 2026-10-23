'use strict';

// ── Rank scans (GBP SOP 1.7 baseline, 5.2 monthly) ──────────────────────────
// The code side of the LeadSnap heatmaps: the scan settings (built once, saved on the
// client record as scan_settings and locked after the first run, hard rule 8), the
// credit cost shown before a run, the stored row for a heatmap, the monthly table
// against the baseline, the drop alerts, the top competitors from a heatmap and the
// schedule body. No network here: gbp/routes.js makes the calls.

const GRID_MAX = 13;
const DROP_POINTS = 10;
const SEARCH_TYPE = 'google_maps';

const str = v => (v == null ? '' : String(v)).trim();
const norm = s => str(s).toLowerCase().replace(/\s+/g, ' ');

function kmBetween(a, b) {
  const r = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

// ── The final rules (Brandon, 23 Oct) ──
// Keyword = the primary category, lower case, no town ("landscaper"), plus the optional
// scan_keyword_2 client value (lower case, no town). One 13 × 13 grid per client, centred
// on the GBP pin (LeadSnap's location, else the main town), spaced by the scan_area client
// value (city 1500 m, market town 2000 m, rural 2500 m, default city), and clipped to the
// convex hull of the service area towns plus 3 km so sea and empty country drop out. No
// calibration run and no automatic change: after a baseline the leader's Top 3% is shown
// with the line "over 90: consider the next tighter setting; under 40: the next wider".
const SPACING_M = { city: 1500, market_town: 2000, rural: 2500 };
const HULL_BUFFER_KM = 3;
const lcKeyword = s => str(s).toLowerCase().replace(/\s+/g, ' ');

function scanKeywords({ primary, keyword2 = '' }) {
  const out = [];
  const add = (text, kind, source) => { const k = lcKeyword(text); if (k && !out.some(o => o.keyword === k)) out.push({ keyword: k, kind, source }); };
  add(primary, 'main', 'primary category, lower case, no town');
  add(keyword2, 'second', 'scan_keyword_2 on Client Values');
  return out;
}

function spacingFor(scanArea) {
  const key = str(scanArea).toLowerCase().replace(/[\s-]+/g, '_');
  return { scan_area: SPACING_M[key] ? key : 'city', spacing_m: SPACING_M[key] || SPACING_M.city };
}

// ── Geometry: metres east and north of the centre, the convex hull, a 3 km buffer ──
const R_EARTH = 6371000;
const toLocal = (centre, p) => ({ x: ((p.lng - centre.lng) * Math.PI / 180) * R_EARTH * Math.cos(centre.lat * Math.PI / 180), y: ((p.lat - centre.lat) * Math.PI / 180) * R_EARTH });
const fromLocal = (centre, q) => ({ lat: centre.lat + (q.y / R_EARTH) * 180 / Math.PI, lng: centre.lng + (q.x / (R_EARTH * Math.cos(centre.lat * Math.PI / 180))) * 180 / Math.PI });
function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
// The hull of the towns buffered by HULL_BUFFER_KM: the hull of a ring of points around each town
function servicePolygon(centre, towns, bufferKm = HULL_BUFFER_KM) {
  const positioned = (towns || []).filter(t => t && typeof t.lat === 'number' && typeof t.lng === 'number');
  const seeds = positioned.length ? positioned : [centre];
  const ring = [];
  for (const t of seeds) {
    const c = toLocal(centre, t);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; ring.push({ x: c.x + Math.cos(a) * bufferKm * 1000, y: c.y + Math.sin(a) * bufferKm * 1000 }); }
  }
  const hull = convexHull(ring);
  return { polygon: hull.map(q => fromLocal(centre, q)), towns_used: seeds.length, local: hull };
}
function pointInPolygon(q, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
// The 13 × 13 grid around the centre at the spacing, clipped to the polygon (the local
// generator; the live run asks LeadSnap's grid-points endpoint for the same thing)
function gridPoints(centre, { grid_size = GRID_MAX, spacing_m, polygonLocal = null } = {}) {
  const half = (grid_size - 1) / 2;
  const out = [];
  for (let r = -half; r <= half; r++) for (let c = -half; c <= half; c++) {
    const q = { x: c * spacing_m, y: r * spacing_m };
    if (polygonLocal && polygonLocal.length >= 3 && !pointInPolygon(q, polygonLocal)) continue;
    out.push(fromLocal(centre, q));
  }
  return out;
}

// The settings, built once. place: { google_place_id, leadsnap_place_id, leadsnap_location_id, name, how }
// points: the clipped grid (from LeadSnap's grid-points endpoint when the caller has them, else local)
function buildScanSettings({ clientName, primary, keyword2 = '', scanArea = 'city', town, centre, areas, place, points = null, now = new Date() }) {
  const keywords = scanKeywords({ primary, keyword2 });
  const sp = spacingFor(scanArea);
  const poly = servicePolygon(centre, areas);
  const pts = points && points.length ? points : gridPoints(centre, { grid_size: GRID_MAX, spacing_m: sp.spacing_m, polygonLocal: poly.local });
  const settings = {
    version: 2, built_at: now.toISOString(), locked: false,
    client: str(clientName), primary: str(primary), town: str(town),
    keywords, search_type: SEARCH_TYPE,
    grid_size: GRID_MAX, scan_area: sp.scan_area, spacing_m: sp.spacing_m,
    polygon: poly.polygon, hull_towns: poly.towns_used, buffer_km: HULL_BUFFER_KM,
    points: pts.map(p => ({ lat: Math.round(p.lat * 1e7) / 1e7, lng: Math.round(p.lng * 1e7) / 1e7 })), point_count: pts.length, full_grid: GRID_MAX * GRID_MAX,
    points_from: points && points.length ? 'LeadSnap grid-points' : 'local',
    towns_positioned: (areas || []).filter(a => a && typeof a.lat === 'number').length, towns_total: (areas || []).length,
    centre: { lat: centre.lat, lng: centre.lng, from: centre.from || '' },
    place: place || null,
  };
  settings.credits_per_run = creditCost(settings);
  return settings;
}

// One credit per grid point per keyword per run (assumed: the API has no cost field)
function creditCost(settings) {
  const points = settings.point_count || (settings.points && settings.points.length) || (settings.grid_size * settings.grid_size);
  return points * (settings.keywords || []).length;
}

// The create heatmap body for one keyword: the clipped points, never a bare radius
function heatmapBody(settings, keyword) {
  return {
    keyword: [keyword], search_type: [settings.search_type],
    grid_size: settings.grid_size, points: settings.points,
    place_id: settings.place && settings.place.google_place_id, lat: settings.centre.lat, lng: settings.centre.lng,
  };
}

// The leader's Top 3% from a heatmap's competitors response, with the SOP line
function leaderLine(competitors) {
  const list = (Array.isArray(competitors) ? competitors : []).map(c => ({ name: (c.place && c.place.name) || c.business_name || '', share: num(c.market_share), top3: num(c.top_3_percentage), top3pts: num(c.top_3_points), total: num(c.total_points), pos: num(c.market_share_position) }));
  if (!list.length) return null;
  const lead = list.sort((a, b) => (a.pos || 99) - (b.pos || 99) || (b.share || 0) - (a.share || 0))[0];
  let top3 = lead.top3;
  if (top3 === null && lead.top3pts !== null && lead.total) top3 = Math.round((lead.top3pts / lead.total) * 1000) / 10;
  if (top3 === null) return { name: lead.name, top3: null, line: `Leader ${lead.name}: Top 3% not reported.` };
  const verdict = top3 > 90 ? 'over 90: consider the next tighter setting' : top3 < 40 ? 'under 40: consider the next wider setting' : 'between 40 and 90: the setting fits';
  return { name: lead.name, top3, line: `Leader ${lead.name} at Top 3% ${top3}; ${verdict} (over 90: consider the next tighter setting; under 40: the next wider).` };
}

const monthOf = iso => (iso ? String(iso).slice(0, 7) : '');

// A stored scan row from a LeadSnap heatmap (pending when it has not completed)
function scanRow(heatmap, { keyword, kind, run_type, created_from = 'baseline' }) {
  const h = heatmap || {};
  const completed = String(h.status || '').toLowerCase() === 'completed';
  return {
    heatmap_id: h.id, keyword: keyword || h.keyword || '', kind: kind || 'main', run_type, created_from,
    status: String(h.status || 'queue').toLowerCase(), created_at: h.created_at || null, month: monthOf(h.created_at),
    grid_size: h.grid_size || null, search_type: h.search_type || SEARCH_TYPE,
    // LeadSnap's own shareable map page, the fallback link beside the drawn grid
    share_url: (h.share_link_details && h.share_link_details.url) || h.share_url || null,
    superseded: false,
    top_3_percentage: completed ? num(h.top_3_percentage) : null,
    average: completed ? num(h.average) : null,
    total_points: completed ? num(h.total_points) : null,
    top_3_points: completed ? num(h.top_3_points) : null,
    points: completed && Array.isArray(h.points) ? h.points.map(p => ({ lat: num(p.lat), lng: num(p.lng), rank: p.rank === null || p.rank === undefined ? null : num(p.rank) })) : null,
    competitors: null,
  };
}
const num = v => (v === null || v === undefined || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

// The top competitors of a heatmap by market share
function topCompetitors(list, limit = 5) {
  return (Array.isArray(list) ? list : []).map(c => ({
    name: (c.place && c.place.name) || c.business_name || '', google_place_id: (c.place && c.place.google_place_id) || '', maps_url: (c.place && (c.place.place_url || c.place.map_url)) || '',
    market_share: num(c.market_share), market_share_position: num(c.market_share_position), average: num(c.average), top_3_points: num(c.top_3_points), total_points: num(c.total_points), review_count: num(c.place && c.place.review_count), rating: num(c.place && c.place.ave_review_rating),
  })).sort((a, b) => (b.market_share || 0) - (a.market_share || 0)).slice(0, limit);
}

// Per keyword: the baseline, then each month's latest completed scan with the change from
// the previous month and from the baseline
// Superseded rows (from before a reset) stay stored but never count
const live = scans => (scans || []).filter(s => !s.superseded);
function monthlyTable(scans) {
  const done = live(scans).filter(s => s.status === 'completed' && s.top_3_percentage !== null);
  const byKeyword = new Map();
  for (const s of done) { const k = norm(s.keyword); if (!byKeyword.has(k)) byKeyword.set(k, { keyword: s.keyword, kind: s.kind, baseline: null, months: [] }); }
  for (const [k, row] of byKeyword) {
    const mine = done.filter(s => norm(s.keyword) === k).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    row.baseline = mine.find(s => s.run_type === 'baseline') || mine[0] || null;
    const byMonth = new Map();
    for (const s of mine) byMonth.set(s.month, s);   // the latest in a month wins
    const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    row.months = months.map((s, i) => ({
      month: s.month, heatmap_id: s.heatmap_id, run_type: s.run_type, top_3_percentage: s.top_3_percentage, average: s.average,
      change: i > 0 ? round1(s.top_3_percentage - months[i - 1].top_3_percentage) : null,
      vs_baseline: row.baseline ? round1(s.top_3_percentage - row.baseline.top_3_percentage) : null,
      is_baseline: row.baseline ? s.heatmap_id === row.baseline.heatmap_id : false,
    }));
  }
  return [...byKeyword.values()];
}
const round1 = n => Math.round(n * 10) / 10;

// Keywords whose latest month fell DROP_POINTS or more from the month before
function dropAlerts(scans) {
  const out = [];
  for (const row of monthlyTable(scans)) {
    const m = row.months;
    if (m.length < 2) continue;
    const last = m[m.length - 1], prev = m[m.length - 2];
    if (prev.top_3_percentage - last.top_3_percentage >= DROP_POINTS) {
      out.push({ keyword: row.keyword, from: prev.top_3_percentage, to: last.top_3_percentage, month: last.month, previous_month: prev.month,
        line: `Top 3% dropped ${prev.top_3_percentage} to ${last.top_3_percentage} on ${row.keyword}: check scan settings unchanged, suspension, duplicates, categories` });
    }
  }
  return out;
}

// The one monthly schedule: every keyword, the same clipped grid, the baseline's day of the
// month (28 at most), 06:00 UK. keywords: strings; points: the settings' clipped grid
function scheduleBody(settings, keywords, points, { clientName, baselineAt, locationId = null } = {}) {
  const day = Math.min(28, new Date(baselineAt || settings.built_at).getUTCDate() || 1);
  const list = Array.isArray(keywords) ? keywords : [keywords];
  return {
    heatmap_config: {
      name: `${str(clientName || settings.client)} monthly`,
      place_id: settings.place && settings.place.leadsnap_place_id,
      keywords: list, grid_size: settings.grid_size,
      grid_points: (points || settings.points || []).map(p => ({ lat: p.lat, lng: p.lng })),
      lat: settings.centre.lat, lng: settings.centre.lng,
      ...(locationId ? { location_id: locationId } : {}),
    },
    search_types: [settings.search_type],
    schedule_config: { repeat_type: 'month', repeat_on: day, schedule_hour_minute: '06:00', timezone: '+00:00', skip_weekends: false },
  };
}

module.exports = { scanKeywords, spacingFor, servicePolygon, convexHull, pointInPolygon, gridPoints, toLocal, fromLocal, buildScanSettings, creditCost, heatmapBody, leaderLine, scanRow, topCompetitors, monthlyTable, dropAlerts, scheduleBody, live, kmBetween, monthOf, GRID_MAX, SPACING_M, HULL_BUFFER_KM, DROP_POINTS };
