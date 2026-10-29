'use strict';
// Fixture: the places table (locations/places.js) on pg-mem. The data file seeds the
// table, a second seed is a no-op, the counts by type, the Southampton sample, name
// matching (a typed council area, an apostrophe, a suburb), and the grid conversion.
const path = require('path');
const root = path.join(__dirname, '../..');
const { newDb } = require('pg-mem');
const P = require(path.join(root, 'locations/places.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: places table (pg-mem, the real data file) ===\n');

(async () => {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await P.ensurePlacesTables(pool);

  const first = await P.seedPlaces(pool, { log: null });
  chk('first seed loads the data file', first.seeded && first.rows > 30000, JSON.stringify(first), 'seeded, 30,000+ rows');
  const again = await P.seedPlaces(pool, { log: null });
  chk('a second seed is a no-op (same version, same count)', !again.seeded && again.reason === 'up to date', JSON.stringify(again), 'up to date');

  const store = P.createPlacesStore(pool);
  const counts = await store.counts();
  chk('three types: town, district, admin', Object.keys(counts).sort().join(',') === 'admin,district,town', Object.keys(counts).join(','), 'admin,district,town');
  chk('towns with a Census population of 5,000 or more number over 1,000', (await pool.query(`SELECT COUNT(*)::int AS n FROM places WHERE type = 'town' AND population >= 5000`)).rows[0].n > 1000, '', '> 1000');
  chk('admin rows are all flagged, and only admin rows', (await pool.query(`SELECT COUNT(*)::int AS n FROM places WHERE (type = 'admin') <> is_admin_area`)).rows[0].n === 0, '', '0 mismatches');
  chk('only England and Wales', (await pool.query(`SELECT COUNT(*)::int AS n FROM places WHERE country NOT IN ('England', 'Wales')`)).rows[0].n === 0, '', '0 other countries');
  chk('every district has a parent town', (await pool.query(`SELECT COUNT(*)::int AS n FROM places d LEFT JOIN places t ON t.id = d.parent_town_id AND t.type = 'town' WHERE d.type = 'district' AND t.id IS NULL`)).rows[0].n === 0, '', '0 orphans');

  // Southampton: the built-up area, its population, the admin row beside it
  const sotons = await store.matchName('Southampton');
  const town = sotons.find(s => s.type === 'town' && s.population > 100000);
  chk('Southampton is a town with its Census 2021 population', !!town && town.population > 200000 && town.population < 300000, town && town.population, '200,000 to 300,000');
  chk('Southampton also has an admin row (unitary authority), sorted after the town', sotons.some(s => s.is_admin_area) && !sotons[0].is_admin_area, sotons.map(s => s.type).join(','), 'town first, admin present');
  const near = await store.near(town, 8);
  chk('places within 8 km of Southampton include its suburbs as districts of it', near.some(p => p.type === 'district' && p.parent_town_id === town.id && /Bitterne|Shirley|Portswood|Woolston/.test(p.name)), near.filter(p => p.type === 'district').slice(0, 6).map(p => p.name).join(', '), 'Bitterne, Shirley, Portswood or Woolston');
  chk('and towns of their own nearby (Totton or Eastleigh) with populations', near.some(p => p.type === 'town' && /Totton|Eastleigh|Hedge End/.test(p.name) && p.population > 5000), near.filter(p => p.type === 'town' && p.population).map(p => p.name).join(', '), 'Totton, Eastleigh or Hedge End');
  chk('near() leaves admin rows out by default', !near.some(p => p.is_admin_area), '', 'no admin rows');

  chk('every place carries its local authority name (Cowes: Isle of Wight; Southampton town: Southampton and its neighbours)', (await pool.query(`SELECT COUNT(*)::int AS n FROM places WHERE lad_name IS NULL OR lad_name = ''`)).rows[0].n === 0 && (await store.matchName('Cowes')).some(p => p.lad_name === 'Isle of Wight') && /Southampton/.test(town.lad_name), town.lad_name, 'Southampton; …');

  // Name matching
  const cf = await store.matchName('Chandlers Ford', town);
  chk('"Chandlers Ford" (no apostrophe) matches the built-up area Chandler\'s Ford', cf.some(p => p.type === 'town' && p.population > 20000), cf.map(p => `${p.name}/${p.type}/${p.population}`).join(', '), "Chandler's Ford town, 20,000+");
  const nf = await store.matchName('New Forest District', town);
  chk('"New Forest District" matches the admin row New Forest and nothing else', nf.length && nf.every(p => p.is_admin_area), nf.map(p => `${p.name}/${p.type}`).join(', '), 'admin only');
  const bit = await store.matchName('Bitterne', town);
  chk('"Bitterne" is a district of Southampton', bit.length && bit[0].type === 'district' && bit[0].parent_town_id === town.id, bit.map(p => `${p.name}/${p.type}/${p.parent_town_id}`).join(', '), 'district, parent Southampton');
  const shirley = await store.matchName('Shirley', town);
  chk('"Shirley" near Southampton sorts the Southampton one first (several Shirleys exist)', shirley.length > 1 && shirley[0].parent_town_id === town.id, shirley.map(p => `${p.parent_town_id}@${p.km && p.km.toFixed(0)}km`).join(', '), 'Southampton parent first');
  chk('a made-up name matches nothing', (await store.matchName('Nowhereville Upon Nothing')).length === 0, '', '[]');
  const welsh = await store.matchName('Caerdydd');
  chk('a Welsh name matches through alt_name (Caerdydd → Cardiff)', welsh.some(p => p.name === 'Cardiff'), welsh.map(p => p.name).join(', '), 'Cardiff');

  // Grid conversion: the ONS gives Berwick-upon-Tweed's centroid in both systems
  // (BNG 399257.449, 652237.078; WGS84 55.763482, -2.013401)
  const ll = P.bngToLatLng(399257.4492505938, 652237.077567596);
  chk('BNG to WGS84 lands within 5 m of the ONS centroid', P.kmBetween(ll, { lat: 55.76348231699201, lng: -2.013401249918543 }) < 0.005, JSON.stringify(ll), '55.763482, -2.013401');
  chk('normaliseName: apostrophes, Saint/St., hyphens', P.normaliseName("Chandler's Ford") === 'chandlers ford' && P.normaliseName('St. Mary-le-Bow') === 'st mary le bow' && P.normaliseName('Saint Albans') === 'st albans', '', 'all equal');
  chk('stripAdminSuffix', JSON.stringify(P.stripAdminSuffix('Test Valley Borough Council')) === JSON.stringify({ name: 'Test Valley', suffix: 'borough council' }), JSON.stringify(P.stripAdminSuffix('Test Valley Borough Council')), 'Test Valley / borough council');

  await pool.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
