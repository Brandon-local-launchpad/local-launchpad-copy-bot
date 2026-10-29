'use strict';

// ── Places: the one-off import every client's Location Determiner reads ─────────
// One row per place in England and Wales (country stored so Scotland can be added
// later without a schema change):
//   town      an ONS Built-up Area 2022 (Census 2021 population summed from its output
//             areas), or an OS Open Names populated place outside every built-up area
//             (village, hamlet; population null)
//   district  an OS Open Names populated place inside a built-up area with a different
//             name (a suburb): parent_town_id is that built-up area
//   admin     a local authority district, county, unitary authority or national park
//             (is_admin_area = true): never a candidate, kept so a council area a client
//             types is shown as excluded with the reason
// The data file is locations/data/places.csv.gz, built by scripts/places-import.js from
// the sources; seedPlaces loads it into the places table when the table is empty or the
// file has changed (the file's hash is kept in places_import). Ids are the source codes
// (BUA22CD, the OS Open Names id, the ONS admin code), so a reload keeps every id and
// client_locations.place_id stays valid.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data', 'places.csv.gz');
const COLUMNS = ['id', 'name', 'slug', 'type', 'lat', 'lng', 'population', 'parent_town_id', 'country', 'is_admin_area', 'kind', 'qualifier', 'alt_name', 'source', 'os_id', 'lad_name'];
const TYPES = ['town', 'district', 'admin'];

// ── Names ──
// The same slugify as the page map (page-map/slugs.js), kept here so the data file can
// be built without the server's modules
const slugify = text => String(text == null ? '' : text).toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// The form two spellings of one place share: lower case, ASCII, "St." and "Saint" as
// "st", "upon"/"on" kept, apostrophes and hyphens dropped, one space between words
function normaliseName(name) {
  return String(name == null ? '' : name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bsaint\b/g, 'st').replace(/\bst\./g, 'st')
    .replace(/['’`]/g, '').replace(/[-–—/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// A typed name with a council suffix: "New Forest District" → "new forest" (so it can
// match the admin row), and whether a suffix was there
const ADMIN_SUFFIX_RE = /\s+(district|borough|county|council|unitary authority|authority|national park|metropolitan borough|city council|borough council|district council|county council)$/i;
function stripAdminSuffix(name) {
  const s = String(name || '').trim();
  const m = s.match(ADMIN_SUFFIX_RE);
  return m ? { name: s.slice(0, m.index).trim(), suffix: m[1].toLowerCase() } : { name: s, suffix: '' };
}

// ── Distance ──
const R_EARTH_KM = 6371;
function kmBetween(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h));
}
const milesBetween = (a, b) => kmBetween(a, b) * 0.621371;

// ── British National Grid (OSGB36, EPSG:27700) to WGS84 ──
// The standard inverse transverse Mercator on the Airy 1830 ellipsoid, then the OSGB36
// to WGS84 Helmert shift (about 5 m, fine for a town centre). OS Open Names gives BNG
// eastings and northings only.
function bngToLatLng(E, N) {
  const a = 6377563.396, b = 6356256.909;           // Airy 1830
  const F0 = 0.9996012717, lat0 = 49 * Math.PI / 180, lon0 = -2 * Math.PI / 180, N0 = -100000, E0 = 400000;
  const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b), n2 = n * n, n3 = n * n * n;
  let lat = lat0, M = 0;
  do {
    lat = (N - N0 - M) / (a * F0) + lat;
    const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (lat - lat0);
    const Mb = (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(lat - lat0) * Math.cos(lat + lat0);
    const Mc = ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * (lat - lat0)) * Math.cos(2 * (lat + lat0));
    const Md = (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0));
    M = b * F0 * (Ma - Mb + Mc - Md);
  } while (N - N0 - M >= 0.00001);
  const cosLat = Math.cos(lat), sinLat = Math.sin(lat), tanLat = Math.tan(lat);
  const nu = a * F0 / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;
  const tan2 = tanLat * tanLat, tan4 = tan2 * tan2, tan6 = tan4 * tan2;
  const secLat = 1 / cosLat, nu3 = nu ** 3, nu5 = nu ** 5, nu7 = nu ** 7;
  const VII = tanLat / (2 * rho * nu);
  const VIII = tanLat / (24 * rho * nu3) * (5 + 3 * tan2 + eta2 - 9 * tan2 * eta2);
  const IX = tanLat / (720 * rho * nu5) * (61 + 90 * tan2 + 45 * tan4);
  const X = secLat / nu;
  const XI = secLat / (6 * nu3) * (nu / rho + 2 * tan2);
  const XII = secLat / (120 * nu5) * (5 + 28 * tan2 + 24 * tan4);
  const XIIA = secLat / (5040 * nu7) * (61 + 662 * tan2 + 1320 * tan4 + 720 * tan6);
  const dE = E - E0, dE2 = dE * dE, dE3 = dE2 * dE, dE4 = dE2 * dE2, dE5 = dE3 * dE2, dE6 = dE4 * dE2, dE7 = dE5 * dE2;
  const latOS = lat - VII * dE2 + VIII * dE4 - IX * dE6;
  const lonOS = lon0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7;
  return helmertOsgb36ToWgs84(latOS, lonOS);
}
function helmertOsgb36ToWgs84(lat, lon) {
  // OSGB36 to cartesian, shift, back to WGS84 geodetic
  const a1 = 6377563.396, b1 = 6356256.909, e1 = 1 - (b1 * b1) / (a1 * a1);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat), sinLon = Math.sin(lon), cosLon = Math.cos(lon);
  const nu1 = a1 / Math.sqrt(1 - e1 * sinLat * sinLat);
  let x = nu1 * cosLat * cosLon, y = nu1 * cosLat * sinLon, z = (1 - e1) * nu1 * sinLat;
  const tx = 446.448, ty = -125.157, tz = 542.060, s = -20.4894 / 1e6;
  const rx = (0.1502 / 3600) * Math.PI / 180, ry = (0.2470 / 3600) * Math.PI / 180, rz = (0.8421 / 3600) * Math.PI / 180;
  const x2 = tx + (1 + s) * x - rz * y + ry * z;
  const y2 = ty + rz * x + (1 + s) * y - rx * z;
  const z2 = tz - ry * x + rx * y + (1 + s) * z;
  const a2 = 6378137, b2 = 6356752.3142, e2 = 1 - (b2 * b2) / (a2 * a2);
  const p = Math.sqrt(x2 * x2 + y2 * y2);
  let phi = Math.atan2(z2, p * (1 - e2)), phiP = 2 * Math.PI;
  while (Math.abs(phi - phiP) > 1e-12) { const nu = a2 / Math.sqrt(1 - e2 * Math.sin(phi) ** 2); phiP = phi; phi = Math.atan2(z2 + e2 * nu * Math.sin(phi), p); }
  return { lat: phi * 180 / Math.PI, lng: Math.atan2(y2, x2) * 180 / Math.PI };
}

// ── Point in polygon (even-odd over every ring, so holes count) ──
function pointInRings(x, y, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// ── The data file ──
function csvCell(v) { if (v == null) return ''; const s = String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function parseCsvLine(line) { const o = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; }

function writeDataFile(rows, file = DATA_FILE) {
  const lines = [COLUMNS.join(',')];
  for (const r of rows) lines.push(COLUMNS.map(c => csvCell(r[c])).join(','));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, zlib.gzipSync(Buffer.from(lines.join('\n') + '\n', 'utf8'), { level: 9 }));
  return { rows: rows.length, bytes: fs.statSync(file).size };
}

// Every row of the data file as objects with typed numbers and booleans
function readDataFile(file = DATA_FILE) {
  const text = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');
  const lines = text.split('\n').filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const out = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const r = Object.fromEntries(header.map((h, i) => [h, cells[i] === undefined ? '' : cells[i]]));
    r.lat = r.lat === '' ? null : Number(r.lat);
    r.lng = r.lng === '' ? null : Number(r.lng);
    r.population = r.population === '' ? null : Number(r.population);
    r.parent_town_id = r.parent_town_id || null;
    r.is_admin_area = r.is_admin_area === 'true';
    out.push(r);
  }
  return out;
}
const dataFileVersion = (file = DATA_FILE) => (fs.existsSync(file) ? crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 16) : null);

// ── The tables ──
async function ensurePlacesTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS places (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      name_norm       TEXT NOT NULL,
      slug            TEXT NOT NULL,
      type            TEXT NOT NULL,
      lat             DOUBLE PRECISION,
      lng             DOUBLE PRECISION,
      population      INTEGER,
      parent_town_id  TEXT,
      country         TEXT NOT NULL,
      is_admin_area   BOOLEAN NOT NULL DEFAULT FALSE,
      kind            TEXT,
      qualifier       TEXT,
      alt_name        TEXT,
      source          TEXT,
      os_id           TEXT,
      lad_name        TEXT
    );
    CREATE INDEX IF NOT EXISTS places_name_norm_idx ON places (name_norm);
    CREATE INDEX IF NOT EXISTS places_type_idx ON places (type);
    CREATE INDEX IF NOT EXISTS places_parent_idx ON places (parent_town_id);
    CREATE TABLE IF NOT EXISTS places_import (
      version      TEXT PRIMARY KEY,
      imported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      row_count    INTEGER NOT NULL,
      counts       TEXT
    );
  `);
}

// Load the data file when the table is empty or the file changed. Returns what it did.
async function seedPlaces(pool, { file = DATA_FILE, log = console, batch = 500, force = false } = {}) {
  const version = dataFileVersion(file);
  if (!version) return { seeded: false, reason: 'no data file' };
  const { rows: have } = await pool.query(`SELECT version, row_count FROM places_import ORDER BY imported_at DESC LIMIT 1`);
  const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS n FROM places`);
  if (!force && have[0] && have[0].version === version && cnt[0].n === have[0].row_count && cnt[0].n > 0) return { seeded: false, reason: 'up to date', version, rows: cnt[0].n };
  const rows = readDataFile(file);
  await pool.query(`DELETE FROM places`);
  await pool.query(`DELETE FROM places_import`);
  const cols = ['id', 'name', 'name_norm', 'slug', 'type', 'lat', 'lng', 'population', 'parent_town_id', 'country', 'is_admin_area', 'kind', 'qualifier', 'alt_name', 'source', 'os_id', 'lad_name'];
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const values = [], params = [];
    chunk.forEach((r, k) => {
      const vals = [r.id, r.name, normaliseName(r.name), r.slug, r.type, r.lat, r.lng, r.population, r.parent_town_id, r.country, r.is_admin_area, r.kind || null, r.qualifier || null, r.alt_name || null, r.source || null, r.os_id || null, r.lad_name || null];
      params.push(...vals);
      values.push(`(${vals.map((_, j) => `$${k * cols.length + j + 1}`).join(',')})`);
    });
    await pool.query(`INSERT INTO places (${cols.join(',')}) VALUES ${values.join(',')}`, params);
  }
  const counts = countsOf(rows);
  await pool.query(`INSERT INTO places_import (version, row_count, counts) VALUES ($1, $2, $3)`, [version, rows.length, JSON.stringify(counts)]);
  if (log) log.log(`[places] seeded ${rows.length} places (version ${version}): ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  return { seeded: true, version, rows: rows.length, counts };
}
const countsOf = rows => rows.reduce((o, r) => { o[r.type] = (o[r.type] || 0) + 1; return o; }, {});

// ── Queries the determiner uses ──
function createPlacesStore(pool) {
  const typed = r => ({ ...r, lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng), population: r.population == null ? null : Number(r.population) });
  return {
    async counts() {
      const { rows } = await pool.query(`SELECT type, COUNT(*)::int AS n FROM places GROUP BY type ORDER BY type`);
      return Object.fromEntries(rows.map(r => [r.type, r.n]));
    },
    async byId(id) { const { rows } = await pool.query(`SELECT * FROM places WHERE id = $1`, [id]); return rows[0] ? typed(rows[0]) : null; },
    async byIds(ids) { const list = [...new Set((ids || []).filter(Boolean))]; if (!list.length) return new Map(); const ph = list.map((_, k) => "$" + (k + 1)).join(", "); const { rows } = await pool.query(`SELECT * FROM places WHERE id IN (${ph})`, list); return new Map(rows.map(r => [r.id, typed(r)])); },
    // Every non-admin place within radiusKm of a point (a bounding box in SQL, haversine here)
    async near({ lat, lng }, radiusKm, { includeAdmin = false } = {}) {
      const dLat = radiusKm / 111.2, dLng = radiusKm / (111.2 * Math.cos(lat * Math.PI / 180));
      const { rows } = await pool.query(`SELECT * FROM places WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4${includeAdmin ? '' : ' AND is_admin_area = FALSE'}`, [lat - dLat, lat + dLat, lng - dLng, lng + dLng]);
      return rows.map(typed).map(r => ({ ...r, km: kmBetween({ lat, lng }, r) })).filter(r => r.km <= radiusKm).sort((a, b) => a.km - b.km);
    },
    // Every place whose normalised name matches a typed name (the admin suffix stripped
    // too), nearest a point first when one is given. Admin rows are included and marked.
    async matchName(name, nearPoint = null) {
      const forms = new Set([normaliseName(name)]);
      const stripped = stripAdminSuffix(name);
      if (stripped.suffix) forms.add(normaliseName(stripped.name));
      const list = [...forms].filter(Boolean);
      if (!list.length) return [];
      const ph = list.map((_, i) => '$' + (i + 1)).join(', ');
      const { rows } = await pool.query(`SELECT * FROM places WHERE name_norm IN (${ph}) OR lower(alt_name) IN (${ph})`, list);
      const out = rows.map(typed).map(r => ({ ...r, km: nearPoint && r.lat != null ? kmBetween(nearPoint, r) : null }));
      return out.sort((a, b) => (a.is_admin_area - b.is_admin_area) || ((a.km == null ? 1e9 : a.km) - (b.km == null ? 1e9 : b.km)) || ((b.population || 0) - (a.population || 0)));
    },
    // Namesakes: for each given place row, how many OTHER places in the table share its normalised name,
    // of any type. A place's own council (an admin row of the same name whose authority the place lies
    // in, e.g. the town Winchester and the Winchester district) is the same place and is not counted.
    // Returns a Map place_id → { count, examples: ["Newtown (town, Powys)", …] (3 at most) }
    async namesakes(rowsIn) {
      const rows = (rowsIn || []).filter(Boolean);
      const names = [...new Set(rows.map(r => r.name_norm || normaliseName(r.name)))];
      const found = [];
      for (let i = 0; i < names.length; i += 200) {
        const chunk = names.slice(i, i + 200);
        const ph = chunk.map((_, k) => "$" + (k + 1)).join(", ");
        const { rows: got } = await pool.query(`SELECT id, name, name_norm, type, is_admin_area, lad_name FROM places WHERE name_norm IN (${ph})`, chunk);
        found.push(...got);
      }
      const byNorm = new Map();
      for (const f of found) { if (!byNorm.has(f.name_norm)) byNorm.set(f.name_norm, []); byNorm.get(f.name_norm).push(f); }
      const out = new Map();
      for (const r of rows) {
        const norm = r.name_norm || normaliseName(r.name);
        const ownLad = String(r.lad_name || "").toLowerCase();
        const others = (byNorm.get(norm) || []).filter(f => f.id !== r.id && !(f.is_admin_area && ownLad.includes(String(f.name).toLowerCase())));
        out.set(r.id, { count: others.length, examples: others.slice(0, 3).map(f => `${f.name} (${f.type}${f.lad_name ? ", " + String(f.lad_name).split(";")[0].trim() : ""})`) });
      }
      return out;
    },
    async importInfo() { const { rows } = await pool.query(`SELECT version, imported_at, row_count, counts FROM places_import ORDER BY imported_at DESC LIMIT 1`); return rows[0] || null; },
  };
}

module.exports = { DATA_FILE, COLUMNS, TYPES, slugify, normaliseName, stripAdminSuffix, ADMIN_SUFFIX_RE, kmBetween, milesBetween, bngToLatLng, pointInRings, writeDataFile, readDataFile, dataFileVersion, ensurePlacesTables, seedPlaces, createPlacesStore, countsOf };
