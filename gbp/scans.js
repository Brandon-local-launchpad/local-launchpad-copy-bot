'use strict';

// ── Rank scans (GBP SOP 1.7 baseline, 5.2 monthly) ──────────────────────────
// The code side of the LeadSnap heatmaps: the scan settings (built once, saved on the
// client record as scan_settings and locked after the first run, hard rule 8), the
// credit cost shown before a run, the stored row for a heatmap, the monthly table
// against the baseline, the drop alerts, the top competitors from a heatmap and the
// schedule body. No network here: gbp/routes.js makes the calls.

const GRID_MAX = 13, GRID_SMALL = 7;
const SMALL_AREA_KM = 5;
const MIN_RADIUS_M = 500;
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

// Keywords (Brandon, 23 Oct): "[primary category] [main town]" plus the three highest
// search volume keywords from the page map (hub or service pages with a volume figure),
// nothing under MIN_VOLUME a month. A page's keyword is its researched H1 ("Fencing
// Southampton"), else "[title] [main town]". pages: [{ title, h1, h1_source, volume, type }]
// in page map order (ties keep that order). Never the same keyword twice.
const MIN_VOLUME = 30;
function scanKeywords({ primary, town, pages = [], minVolume = MIN_VOLUME }) {
  const out = [];
  const add = (text, kind, source, volume = null) => { const k = str(text); if (k && !out.some(o => norm(o.keyword) === norm(k))) out.push({ keyword: k, kind, source, volume }); };
  add(`${str(primary)} ${str(town)}`, 'main', 'primary category');
  const ranked = (pages || [])
    .map((p, i) => ({ ...p, i, volume: Number(p.volume) || 0, keyword: str(p.h1_source === 'research' && p.h1 ? p.h1 : `${str(p.title)} ${str(town)}`) }))
    .filter(p => p.volume >= minVolume && p.keyword)
    .sort((a, b) => b.volume - a.volume || a.i - b.i);
  for (const p of ranked) {
    if (out.length >= 4) break;
    add(p.keyword, p.type === 'category' ? 'hub' : 'service', `${p.type === 'category' ? 'hub' : 'service'} page "${p.title}", ${p.volume} searches a month`, p.volume);
  }
  return out;
}

// centre: { lat, lng, from }; areas: [{ name, lat, lng }] (the service area towns with a position)
function gridFor(centre, areas) {
  const withPos = (areas || []).filter(a => a && typeof a.lat === 'number' && typeof a.lng === 'number');
  const distances = withPos.map(a => ({ name: a.name, km: kmBetween(centre, a) }));
  const farthest = distances.reduce((m, d) => (d.km > (m ? m.km : -1) ? d : m), null);
  const allClose = withPos.length > 0 && distances.every(d => d.km <= SMALL_AREA_KM);
  const grid_size = allClose ? GRID_SMALL : GRID_MAX;
  // The grid reaches the farthest town: (grid_size - 1) / 2 steps from the centre, so the
  // 13 grid has 6 steps, which is the SOP's "divided by 6"
  const steps = (grid_size - 1) / 2;
  const radius = farthest ? Math.round((farthest.km * 1000) / steps) : MIN_RADIUS_M;
  return { grid_size, grid_radius_m: Math.max(MIN_RADIUS_M, radius), farthest: farthest ? { name: farthest.name, km: Math.round(farthest.km * 10) / 10 } : null, towns_positioned: withPos.length, towns_total: (areas || []).length, all_within_5km: allClose };
}

// The settings, built once. place: { google_place_id, leadsnap_place_id, leadsnap_location_id, name, how }
function buildScanSettings({ clientName, primary, town, pages = [], centre, areas, place, now = new Date() }) {
  const keywords = scanKeywords({ primary, town, pages });
  const grid = gridFor(centre, areas);
  const settings = {
    version: 1, built_at: now.toISOString(), locked: false,
    client: str(clientName), primary: str(primary), town: str(town),
    keywords, search_type: SEARCH_TYPE,
    grid_size: grid.grid_size, grid_radius_m: grid.grid_radius_m, farthest: grid.farthest, towns_positioned: grid.towns_positioned, towns_total: grid.towns_total, all_within_5km: grid.all_within_5km,
    centre: { lat: centre.lat, lng: centre.lng, from: centre.from || '' },
    place: place || null,
  };
  settings.credits_per_run = creditCost(settings);
  return settings;
}

// One credit per grid point per keyword per run (assumed: the API has no cost field)
function creditCost(settings) {
  return settings.grid_size * settings.grid_size * (settings.keywords || []).length;
}

// The create heatmap body for one keyword
function heatmapBody(settings, keyword) {
  return {
    keyword: [keyword], search_type: [settings.search_type],
    grid_size: settings.grid_size, grid_radius: settings.grid_radius_m, unit: 'm',
    place_id: settings.place && settings.place.google_place_id, lat: settings.centre.lat, lng: settings.centre.lng,
  };
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

// The monthly schedule for one keyword: the baseline's day of the month (28 at most), 06:00 UK
function scheduleBody(settings, keyword, points, { clientName, baselineAt, locationId = null } = {}) {
  const day = Math.min(28, new Date(baselineAt || settings.built_at).getUTCDate() || 1);
  return {
    heatmap_config: {
      name: `${str(clientName || settings.client)} ${keyword} monthly`,
      place_id: settings.place && settings.place.leadsnap_place_id,
      keywords: [keyword], grid_size: settings.grid_size,
      grid_points: (points || []).map(p => ({ lat: p.lat, lng: p.lng })),
      lat: settings.centre.lat, lng: settings.centre.lng,
      ...(locationId ? { location_id: locationId } : {}),
    },
    search_types: [settings.search_type],
    schedule_config: { repeat_type: 'month', repeat_on: day, schedule_hour_minute: '06:00', timezone: '+00:00', skip_weekends: false },
  };
}

module.exports = { scanKeywords, gridFor, buildScanSettings, creditCost, heatmapBody, scanRow, topCompetitors, monthlyTable, dropAlerts, scheduleBody, live, kmBetween, monthOf, GRID_MAX, GRID_SMALL, SMALL_AREA_KM, MIN_RADIUS_M, MIN_VOLUME, DROP_POINTS };
