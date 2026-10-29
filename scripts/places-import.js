'use strict';

// ── The places import: builds locations/data/places.csv.gz from the public sources ──
// Usage: node scripts/places-import.js [--dir <cache dir>] [--out <file>] [--skip-fetch]
//
// Sources (all fetched into the cache dir, reused when already there):
//   ONS Open Geography (ArcGIS feature services, services1.arcgis.com/ESMARspQHYMw9BZ9):
//     BUA_2022_GB                       Built-up Areas 2022: codes, names, centroids (LAT, LONG)
//     BUA_2022_GB (geometry)            the same areas' polygons, generalised to 25 m, in BNG
//     OA21_BUA22_LAD22_RGN22_EW_LU      Output Area 2021 to Built-up Area 2022 lookup
//     Local_Authority_Districts_December_2024_Boundaries_UK_BUC, Counties_and_Unitary_
//     Authorities_December_2024_Boundaries_UK_BUC, National_Parks_December_2022_Boundaries_GB_BUC
//                                       the admin areas with centroids
//   Nomis NM_2021_1 (Census 2021 TS001, usual residents) by Output Area (TYPE150): the
//     population of a built-up area is the sum of its output areas (Nomis has no
//     built-up area geography of its own)
//   OS Open Names (api.os.uk, CSV GB zip, ~103 MB): the populatedPlace rows (City, Town,
//     Village, Hamlet, Suburban Area, Other Settlement) with BNG coordinates
//
// Rules:
//   - England and Wales only (BUA22CD E/W, OS COUNTRY England/Wales, admin codes E/W).
//   - A built-up area is a town. Its name loses the ONS qualifier ("West End (Eastleigh)"
//     → name West End, qualifier Eastleigh). Population null when no output area sits in it.
//   - An OS populated place inside a built-up area polygon: the same place when the
//     names match (merged: the OS id is kept on the town row), else a district of it.
//   - An OS populated place outside every polygon: a town with no population, unless a
//     built-up area of the same name sits within 2 km (merged).
//   - Two OS rows with one name and local type within 1 km are one place.
//   - Admin areas: one row per ONS code; type admin, is_admin_area true.

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const AdmZip = require('adm-zip');
const P = require('../locations/places.js');

const ARCGIS = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const OS_ZIP_URL = 'https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=CSV&redirect';
const NOMIS_OA = off => `https://www.nomisweb.co.uk/api/v01/dataset/NM_2021_1.data.csv?date=latest&geography=TYPE150&c2021_restype_3=0&measures=20100&select=geography_code,obs_value&RecordLimit=25000&RecordOffset=${off}`;

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIR = arg('--dir', path.join(require('os').tmpdir(), 'copybot-places-sources'));
const OUT = arg('--out', P.DATA_FILE);
const SKIP_FETCH = args.includes('--skip-fetch');

const log = (...a) => console.log(...a);
const ensureDir = d => fs.mkdirSync(d, { recursive: true });

async function fetchTo(url, file, { timeoutMs = 300000 } = {}) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return false;
  if (SKIP_FETCH) throw new Error(`missing ${file} and --skip-fetch given`);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    ensureDir(path.dirname(file));
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(file + '.part'));
    fs.renameSync(file + '.part', file);
    return true;
  } finally { clearTimeout(t); }
}
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// ArcGIS feature services page at 1,000 rows
async function fetchFeatures(layer, { where = '1=1', outFields = '*', geometry = false, extra = '' }, name) {
  const dir = path.join(DIR, name);
  ensureDir(dir);
  const base = `${ARCGIS}/${layer}/FeatureServer/0/query?where=${encodeURIComponent(where)}&outFields=${encodeURIComponent(outFields)}&returnGeometry=${geometry}${extra}&f=json`;
  const countFile = path.join(dir, 'count.json');
  await fetchTo(`${ARCGIS}/${layer}/FeatureServer/0/query?where=${encodeURIComponent(where)}&returnCountOnly=true&f=json`, countFile);
  const count = readJson(countFile).count;
  const features = [];
  for (let off = 0, i = 0; off < count; off += 1000, i++) {
    const f = path.join(dir, `p_${i}.json`);
    await fetchTo(`${base}&resultOffset=${off}&resultRecordCount=1000`, f);
    const j = readJson(f);
    if (j.error) throw new Error(`${layer} page ${i}: ${JSON.stringify(j.error).slice(0, 200)}`);
    features.push(...j.features);
  }
  if (features.length !== count) log(`  warning: ${layer} gave ${features.length} rows, count said ${count}`);
  return features;
}

function parseCsvLine(line) { const o = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; }

// The OS Open Names populatedPlace rows, cached as JSON once scanned
async function osPopulatedPlaces() {
  const cache = path.join(DIR, 'os', 'populated-places.json');
  if (fs.existsSync(cache)) return readJson(cache);
  const zipFile = path.join(DIR, 'os', 'opname_csv_gb.zip');
  if (await fetchTo(OS_ZIP_URL, zipFile, { timeoutMs: 900000 })) log('  downloaded OS Open Names zip');
  const zip = new AdmZip(zipFile);
  const entries = zip.getEntries();
  const headerEntry = entries.find(e => /^doc\/.*header.*\.csv$/i.test(e.entryName));
  if (!headerEntry) throw new Error('OS Open Names zip has no Doc/OS_Open_Names_Header.csv');
  const header = headerEntry.getData().toString('utf8').replace(/^﻿/, '').trim().split(/\r?\n/)[0].split(',');
  const iType = header.indexOf('TYPE');
  const keep = ['ID', 'NAME1', 'NAME1_LANG', 'NAME2', 'NAME2_LANG', 'LOCAL_TYPE', 'GEOMETRY_X', 'GEOMETRY_Y', 'POSTCODE_DISTRICT', 'DISTRICT_BOROUGH', 'COUNTY_UNITARY', 'COUNTRY'];
  const idx = keep.map(k => header.indexOf(k));
  const out = [];
  let files = 0;
  for (const e of entries) {
    if (e.isDirectory || !/^data\/.*\.csv$/i.test(e.entryName)) continue;
    files++;
    for (const line of e.getData().toString('utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      if (!line) continue;
      const cells = parseCsvLine(line);
      if (cells[iType] !== 'populatedPlace') continue;
      out.push(Object.fromEntries(keep.map((k, i) => [k, cells[idx[i]] || ''])));
    }
  }
  log(`  scanned ${files} OS data files: ${out.length} populated places`);
  fs.writeFileSync(cache, JSON.stringify(out));
  return out;
}

// The OS place's local authority: the district or borough, else the county or unitary
const osLad = r => String(r.DISTRICT_BOROUGH || r.COUNTY_UNITARY || '').trim();
const splitQualifier = nm => { const m = String(nm || '').trim().match(/^(.*?)\s*\(([^()]+)\)\s*$/); return m ? { name: m[1].trim(), qualifier: m[2].trim() } : { name: String(nm || '').trim(), qualifier: '' }; };
const countryOfCode = code => (code.startsWith('E') ? 'England' : code.startsWith('W') ? 'Wales' : code.startsWith('S') ? 'Scotland' : 'Northern Ireland');
const adminKind = code => (/^(E06|W06)/.test(code) ? 'unitary authority' : /^E07/.test(code) ? 'local authority district' : /^E08/.test(code) ? 'metropolitan district' : /^E09/.test(code) ? 'London borough' : /^E10/.test(code) ? 'county' : /^(E26|W18)/.test(code) ? 'national park' : 'admin area');

async function main() {
  log(`Places import: sources cached in ${DIR}`);

  // 1. Built-up areas: attributes and centroids
  log('1. ONS Built-up Areas 2022 (attributes)');
  const buaAttrs = (await fetchFeatures('BUA_2022_GB', { outFields: 'BUA22CD,BUA22NM,BUA22NMW,LAT,LONG,BNG_E,BNG_N,Shape__Area' }, 'ons-bua'))
    .map(f => f.attributes).filter(a => /^[EW]/.test(a.BUA22CD));
  log(`  ${buaAttrs.length} built-up areas in England and Wales`);

  // 2. Their polygons (generalised 25 m, BNG)
  log('2. ONS Built-up Areas 2022 (polygons)');
  const polyFeatures = await fetchFeatures('BUA_2022_GB', { where: "BUA22CD LIKE 'E%' OR BUA22CD LIKE 'W%'", outFields: 'BUA22CD', geometry: true, extra: '&outSR=27700&maxAllowableOffset=25&geometryPrecision=0' }, 'ons-bua-poly');
  const polys = new Map();
  for (const f of polyFeatures) {
    const rings = (f.geometry && f.geometry.rings) || [];
    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
    for (const r of rings) for (const [x, y] of r) { if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
    polys.set(f.attributes.BUA22CD, { rings, xmin, ymin, xmax, ymax });
  }
  log(`  ${polys.size} polygons`);

  // 3. Population: output areas to built-up areas, output area populations from Nomis
  log('3. Census 2021 population (Nomis output areas summed by built-up area)');
  const oaLookup = await fetchFeatures('OA21_BUA22_LAD22_RGN22_EW_LU', { outFields: 'OA21CD,BUA22CD' }, 'ons-oa-bua');
  const oaPop = new Map();
  for (let i = 0; i < 8; i++) {
    const f = path.join(DIR, 'nomis', `oa_${i}.csv`);
    await fetchTo(NOMIS_OA(i * 25000), f);
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(1)) { if (!line) continue; const [c, v] = parseCsvLine(line); oaPop.set(c, Number(v)); }
  }
  const buaPop = new Map();
  let oaWithout = 0;
  for (const f of oaLookup) {
    const a = f.attributes;
    if (!a.BUA22CD || /^[EW]99/.test(a.BUA22CD)) { oaWithout++; continue; }
    const p = oaPop.get(a.OA21CD);
    if (p == null) continue;
    buaPop.set(a.BUA22CD, (buaPop.get(a.BUA22CD) || 0) + p);
  }
  log(`  ${oaPop.size} output areas with population, ${oaWithout} outside every built-up area, ${buaPop.size} built-up areas with a population`);

  // 3b. Built-up area to local authority district (a built-up area may span several)
  log('3b. ONS Built-up Area 2022 to Local Authority District 2022 lookup');
  const buaLad = new Map();
  for (const f of await fetchFeatures('Built_Up_Area_to_Local_Authority_District_(December_2022)_Lookup_in_Great_Britain', { outFields: 'BUA22CD,LAD22CD,LAD22NM,WHOLE_PART' }, 'ons-bua-lad')) {
    const a = f.attributes; if (!a.BUA22CD || !a.LAD22NM) continue;
    if (!buaLad.has(a.BUA22CD)) buaLad.set(a.BUA22CD, []);
    buaLad.get(a.BUA22CD).push(String(a.LAD22NM).trim());
  }
  log(`  ${buaLad.size} built-up areas with a local authority`);

  // 4. Admin areas
  log('4. Admin areas (districts, counties, unitaries, national parks)');
  const admin = new Map();
  const addAdmin = (code, name, alt, lat, lng) => { if (!/^[EW]/.test(code) || admin.has(code)) return; admin.set(code, { code, name: String(name).trim(), alt: String(alt || '').trim() || '', lat, lng }); };
  for (const f of await fetchFeatures('Local_Authority_Districts_December_2024_Boundaries_UK_BUC', { outFields: 'LAD24CD,LAD24NM,LAD24NMW,LAT,LONG' }, 'ons-lad')) addAdmin(f.attributes.LAD24CD, f.attributes.LAD24NM, f.attributes.LAD24NMW, f.attributes.LAT, f.attributes.LONG);
  for (const f of await fetchFeatures('Counties_and_Unitary_Authorities_December_2024_Boundaries_UK_BUC', { outFields: 'CTYUA24CD,CTYUA24NM,CTYUA24NMW,LAT,LONG' }, 'ons-ctyua')) addAdmin(f.attributes.CTYUA24CD, f.attributes.CTYUA24NM, f.attributes.CTYUA24NMW, f.attributes.LAT, f.attributes.LONG);
  for (const f of await fetchFeatures('National_Parks_December_2022_Boundaries_GB_BUC', { outFields: 'NPARK22CD,NPARK22NM,NPARK22NMW,LAT,LONG' }, 'ons-npark')) addAdmin(f.attributes.NPARK22CD, f.attributes.NPARK22NM, f.attributes.NPARK22NMW, f.attributes.LAT, f.attributes.LONG);
  log(`  ${admin.size} admin areas`);

  // 5. OS Open Names populated places
  log('5. OS Open Names populated places');
  const os = (await osPopulatedPlaces()).filter(r => r.COUNTRY === 'England' || r.COUNTRY === 'Wales');
  log(`  ${os.length} in England and Wales`);

  // ── Build the rows ──
  const rows = [];
  const towns = new Map(); // BUA22CD → row
  for (const a of buaAttrs) {
    const { name, qualifier } = splitQualifier(a.BUA22NM);
    const row = { id: a.BUA22CD, name, slug: P.slugify(name), type: 'town', lat: round6(a.LAT), lng: round6(a.LONG), population: buaPop.has(a.BUA22CD) ? buaPop.get(a.BUA22CD) : null, parent_town_id: null, country: countryOfCode(a.BUA22CD), is_admin_area: false, kind: 'built-up area', qualifier, alt_name: String(a.BUA22NMW || '').trim() || '', source: 'ons_bua22', os_id: '', lad_name: (buaLad.get(a.BUA22CD) || []).join('; ') };
    towns.set(a.BUA22CD, row);
    rows.push(row);
  }
  // A grid of polygons by 10 km cell for the containment test
  const CELL = 10000;
  const grid = new Map();
  for (const [code, p] of polys) {
    for (let cx = Math.floor(p.xmin / CELL); cx <= Math.floor(p.xmax / CELL); cx++) for (let cy = Math.floor(p.ymin / CELL); cy <= Math.floor(p.ymax / CELL); cy++) {
      const k = `${cx}:${cy}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(code);
    }
  }
  const containing = (x, y) => {
    const out = [];
    for (const code of grid.get(`${Math.floor(x / CELL)}:${Math.floor(y / CELL)}`) || []) {
      const p = polys.get(code);
      if (x < p.xmin || x > p.xmax || y < p.ymin || y > p.ymax) continue;
      if (P.pointInRings(x, y, p.rings)) out.push(code);
    }
    return out;
  };
  // Towns by normalised name for the outside-polygon merge
  const townsByNorm = new Map();
  for (const t of towns.values()) { const k = P.normaliseName(t.name); if (!townsByNorm.has(k)) townsByNorm.set(k, []); townsByNorm.get(k).push(t); }

  const stats = { merged_inside: 0, merged_near: 0, district: 0, town_no_pop: 0, dup_os: 0, suburb_outside: 0 };
  const seenOs = []; // { norm, local, x, y }
  const osRows = [];
  for (const r of os) {
    const x = Number(r.GEOMETRY_X), y = Number(r.GEOMETRY_Y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    // English name first (NAME1 is the Welsh form when NAME1_LANG is cym and NAME2 holds English)
    let name = r.NAME1.trim(), alt = r.NAME2.trim();
    if (r.NAME1_LANG === 'cym' && r.NAME2_LANG === 'eng' && alt) { name = alt; alt = r.NAME1.trim(); }
    const norm = P.normaliseName(name);
    // The same OS place twice (two tiles, two entries): one name and local type within 1 km
    if (seenOs.some(s => s.norm === norm && s.local === r.LOCAL_TYPE && Math.hypot(s.x - x, s.y - y) <= 1000)) { stats.dup_os++; continue; }
    seenOs.push({ norm, local: r.LOCAL_TYPE, x, y });
    const inside = containing(x, y);
    const sameName = inside.map(c => towns.get(c)).find(t => P.normaliseName(t.name) === norm || (t.alt_name && P.normaliseName(t.alt_name) === norm));
    if (sameName) { if (!sameName.os_id) sameName.os_id = r.ID; stats.merged_inside++; continue; }
    const { lat, lng } = P.bngToLatLng(x, y);
    const point = { lat: round6(lat), lng: round6(lng) };
    if (inside.length) {
      // Inside a built-up area with another name: a district of the smallest one containing it
      const parent = inside.map(c => towns.get(c)).sort((p1, p2) => (p1.population || 0) - (p2.population || 0))[0];
      // A big place with its own population inside a bigger area keeps it anyway: the floor
      // is the built-up area's job, a district has no population
      osRows.push({ id: r.ID, name, slug: P.slugify(name), type: 'district', ...point, population: null, parent_town_id: parent.id, country: r.COUNTRY, is_admin_area: false, kind: r.LOCAL_TYPE, qualifier: '', alt_name: alt, source: 'os_open_names', os_id: r.ID, lad_name: osLad(r) });
      stats.district++;
      continue;
    }
    // Outside every polygon: a built-up area of the same name within 2 km is the same place
    const near = (townsByNorm.get(norm) || []).find(t => P.kmBetween(t, point) <= 2);
    if (near) { if (!near.os_id) near.os_id = r.ID; stats.merged_near++; continue; }
    if (r.LOCAL_TYPE === 'Suburban Area') {
      // A suburb outside every polygon: a district of the nearest town with a population within 5 km, else a town
      let best = null, bestKm = 5;
      for (const t of towns.values()) { if (!t.population) continue; const km = P.kmBetween(t, point); if (km < bestKm) { bestKm = km; best = t; } }
      if (best) { osRows.push({ id: r.ID, name, slug: P.slugify(name), type: 'district', ...point, population: null, parent_town_id: best.id, country: r.COUNTRY, is_admin_area: false, kind: r.LOCAL_TYPE, qualifier: '', alt_name: alt, source: 'os_open_names', os_id: r.ID, lad_name: osLad(r) }); stats.suburb_outside++; continue; }
    }
    osRows.push({ id: r.ID, name, slug: P.slugify(name), type: 'town', ...point, population: null, parent_town_id: null, country: r.COUNTRY, is_admin_area: false, kind: r.LOCAL_TYPE, qualifier: '', alt_name: alt, source: 'os_open_names', os_id: r.ID, lad_name: osLad(r) });
    stats.town_no_pop++;
  }
  rows.push(...osRows);
  for (const a of admin.values()) rows.push({ id: a.code, name: a.name, slug: P.slugify(a.name), type: 'admin', lat: round6(a.lat), lng: round6(a.lng), population: null, parent_town_id: null, country: countryOfCode(a.code), is_admin_area: true, kind: adminKind(a.code), qualifier: '', alt_name: a.alt, source: 'ons_admin', os_id: '', lad_name: a.name });

  rows.sort((p, q) => p.type.localeCompare(q.type) || p.name.localeCompare(q.name) || p.id.localeCompare(q.id));
  const written = P.writeDataFile(rows, OUT);
  log(`\nWritten ${OUT}: ${written.rows} rows, ${Math.round(written.bytes / 1024)} KB`);
  log('Dedupe:', JSON.stringify(stats));
  const counts = P.countsOf(rows);
  log('Rows by type:', JSON.stringify(counts));
  const townsWithPop = rows.filter(r => r.type === 'town' && r.population != null).length;
  log(`Towns with a population: ${townsWithPop} (built-up areas with none: ${rows.filter(r => r.source === 'ons_bua22' && r.population == null).length}); towns of 5,000 or more: ${rows.filter(r => r.type === 'town' && r.population >= 5000).length}`);
  // Sample: the ten nearest places to Southampton's centre
  const soton = rows.filter(r => r.type === 'town' && r.name === 'Southampton').sort((a, b) => (b.population || 0) - (a.population || 0))[0];
  if (soton) {
    const near = rows.filter(r => r !== soton && r.lat != null).map(r => ({ ...r, km: P.kmBetween(soton, r) })).sort((a, b) => a.km - b.km).slice(0, 10);
    log(`\nSouthampton (${soton.id}, population ${soton.population}) and the ten nearest places:`);
    for (const r of near) log(`  ${r.name.padEnd(24)} ${r.type.padEnd(9)} ${String(r.population == null ? '' : r.population).padStart(7)}  ${r.km.toFixed(1)} km  ${r.kind}${r.parent_town_id ? `  parent ${(towns.get(r.parent_town_id) || {}).name || r.parent_town_id}` : ''}${r.is_admin_area ? '  ADMIN' : ''}`);
  }
}

const round6 = v => (v == null ? null : Math.round(Number(v) * 1e6) / 1e6);

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
