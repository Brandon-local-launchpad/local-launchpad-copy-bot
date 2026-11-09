'use strict';
// Fixture: the place ID step (Brandon, 9 Nov 2026), with stubbed Places answers and pg-mem. No
// network. Covers: the candidates with name, address and phone; exactly one phone match
// pre-selected, two or none not; the address type suggested from the listing (no street
// address or Google's service area flag: service_area; a street address: storefront); nothing
// saved by a search or a check; the confirm needs confirm: true, an address type and a place the
// step showed; the confirm saves gbp_place_id, gbp_address_type and who confirmed it; a pasted ID
// looked up.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const PID = require(path.join(root, 'gbp/place-id.js'));
const { mountGbpApi } = require(path.join(root, 'gbp/routes.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the place ID step ===\n');

const edens = { place_id: 'ChIJ_edens', name: 'Edens Edge Landscaping', address: 'Southampton, UK', phone: '07580 412717', service_area: true, maps_url: 'https://maps.google.com/?cid=1' };
const shop = { place_id: 'ChIJ_shop', name: 'Edens Garden Centre', address: '12 High Street, Southampton SO14 2AA, UK', phone: '023 8000 0000', service_area: false };
const other = { place_id: 'ChIJ_other', name: 'Eden Landscapes', address: 'Romsey, UK', phone: '', service_area: false };

// ── Pure ──
{
  const r = PID.rankCandidates([edens, shop, other], { phone: '+44 7580 412717' });
  chk('three candidates with name, address and phone', r.candidates.length === 3 && r.candidates[0].name === 'Edens Edge Landscaping' && r.candidates[0].address === 'Southampton, UK' && r.candidates[0].phone === '07580 412717', JSON.stringify(r.candidates[0]), '');
  chk('the one phone match (+44 form on the record) is pre-selected', r.preselect === 'ChIJ_edens' && r.phone_matches === 1, r.preselect, 'ChIJ_edens');
  const two = PID.rankCandidates([edens, { ...shop, phone: '07580 412717' }], { phone: '07580 412717' });
  chk('two listings with the phone: nothing pre-selected', two.preselect === null && two.phone_matches === 2, two.preselect, null);
  const none = PID.rankCandidates([shop, other], { phone: '07580 412717' });
  chk('no phone match: nothing pre-selected', none.preselect === null && none.phone_matches === 0, none.preselect, null);
  chk('no phone on the record: never a match', PID.rankCandidates([edens], { phone: '' }).preselect === null, '', '');
  chk('suggested address type: Google\'s service area flag → service_area', PID.suggestAddressType(edens).value === 'service_area', PID.suggestAddressType(edens).value, 'service_area');
  chk('a street address with a postcode → storefront', PID.suggestAddressType(shop).value === 'storefront', PID.suggestAddressType(shop).value, 'storefront');
  chk('a town only, no flag → service_area', PID.suggestAddressType(other).value === 'service_area' && /no street address/.test(PID.suggestAddressType(other).why), JSON.stringify(PID.suggestAddressType(other)), 'service_area');
}

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, metadata JSONB, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper') RETURNING id`);
  let cv = { company_name: 'Edens Edge Landscaping', phone: '07580 412717', gbp_place_id: '', gbp_address_type: '' };
  const writeCv = async () => { await pool.query(`DELETE FROM client_assets WHERE client_id=$1 AND asset_type='client_values'`, [c.id]); await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'cv.json', $2)`, [c.id, JSON.stringify(cv)]); };
  await writeCv();
  const saved = [];
  const searches = [], details = [];
  const app = express(); app.use(express.json());
  mountGbpApi(app, { pool, loadInputs: async () => ({ town: 'Southampton', validatorCtx: { cv }, locked: [], flags: [] }), callModel: async () => { throw new Error('no'); }, log: { log() {}, error() {} },
    search: async q => { searches.push(q); return [edens, shop, other]; },
    placeDetails: async id => { details.push(id); return id === 'ChIJ_pasted' ? { place_id: 'ChIJ_pasted', name: 'Edens Edge Landscaping LTD', address: 'Southampton, UK', phone: '07580 412717', service_area: true } : null; },
    saveClientValue: async (id, k, v) => { saved.push(k); cv = { ...cv, [k]: v }; await writeCv(); } });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const req = (method, p, body = null) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => { let j = null; try { j = JSON.parse(t); } catch (_) {} resolve({ status: res.statusCode, json: j }); }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
  try {
    let r = await req('GET', `/api/clients/${c.id}/place-id`);
    chk('the view: no place ID, the query "Edens Edge Landscaping Southampton", nothing searched on load', r.json.place_id === '' && r.json.query === 'Edens Edge Landscaping Southampton' && searches.length === 0, JSON.stringify([r.json.query, searches.length]), '');
    r = await req('POST', `/api/clients/${c.id}/place-id/search`, {});
    chk('search: one Places call, three candidates, Edens pre-selected, nothing saved', searches.length === 1 && searches[0] === 'Edens Edge Landscaping Southampton' && r.json.lookup.candidates.length === 3 && r.json.lookup.preselect === 'ChIJ_edens' && saved.length === 0 && cv.gbp_place_id === '', JSON.stringify([searches, r.json.lookup.preselect, saved]), '');
    r = await req('POST', `/api/clients/${c.id}/place-id/confirm`, { place_id: 'ChIJ_edens', address_type: 'service_area' });
    chk('confirm without confirm: true is 400 and saves nothing', r.status === 400 && saved.length === 0, r.status, 400);
    r = await req('POST', `/api/clients/${c.id}/place-id/confirm`, { place_id: 'ChIJ_edens', confirm: true });
    chk('confirm without an address type is 400', r.status === 400 && saved.length === 0, r.status, 400);
    r = await req('POST', `/api/clients/${c.id}/place-id/confirm`, { place_id: 'ChIJ_never_shown', address_type: 'storefront', confirm: true });
    chk('a place ID the step never showed is refused', r.status === 400 && /not shown by the search or the check/.test(r.json.error) && saved.length === 0, r.json && r.json.error, '400');
    r = await req('POST', `/api/clients/${c.id}/place-id/check`, { place_id: 'not an id' });
    chk('a pasted value that is not a place ID is refused before any call', r.status === 400 && details.length === 0, r.status, 400);
    r = await req('POST', `/api/clients/${c.id}/place-id/check`, { place_id: 'ChIJ_pasted' });
    chk('a pasted ID looked up (one details call), shown with its phone match, nothing saved', details.length === 1 && r.json.lookup.checked.place_id === 'ChIJ_pasted' && r.json.lookup.checked.phone_match && saved.length === 0, JSON.stringify(r.json.lookup.checked), '');
    r = await req('POST', `/api/clients/${c.id}/place-id/confirm`, { place_id: 'ChIJ_edens', address_type: 'service_area', confirm: true, by: 'Brandon' });
    chk('the confirm saves gbp_place_id, gbp_address_type and who confirmed it', r.status === 200 && cv.gbp_place_id === 'ChIJ_edens' && cv.gbp_address_type === 'service_area' && cv.gbp_place_confirmed.by === 'Brandon' && cv.gbp_place_confirmed.phone_match === true && r.json.place_id === 'ChIJ_edens', JSON.stringify(cv.gbp_place_confirmed), '');
    r = await req('POST', `/api/clients/${c.id}/place-id/confirm`, { place_id: 'ChIJ_edens', address_type: 'storefront', confirm: true, by: 'Brandon' });
    chk('the saved listing can be confirmed again to change the address type', r.status === 200 && cv.gbp_address_type === 'storefront', cv.gbp_address_type, 'storefront');
  } finally { srv.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
