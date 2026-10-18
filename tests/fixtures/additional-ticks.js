'use strict';
// Fixture: ticks in a niche's "<Niche> Additional Services" tick group are real services.
// They go into the additional-services flow (parent proposal from the client's tabs only,
// Confirm/Change/Skip) together with the typed answer, deduped against the category
// lists ("already covered"), and never show as unmatched ticks. Uses the ticks of the
// live Window Cleaning record "2weqw" (18 Oct 2026).
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: additional-services ticks (Window Cleaning, record 2weqw) ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

// The 2weqw record as stored on live
const T2 = {
  'window_cleaning.cat.window_cleaning_service': ['Glass and mirror cleaning', 'Gutter cleaning', 'Power/pressure washing', 'Rooftop/skylight cleaning', 'Interior and exterior window cleaning'],
  'window_cleaning.cat.pressure_washing_service': ['Roof cleaning', 'Soft wash cleaning'],
  'window_cleaning.cat.window_cleaning_additional_services': ['Conservatory cleaning', 'Fascia and soffit cleaning', 'Cladding cleaning', 'Solar panel cleaning', 'Sign cleaning', 'Canopy cleaning', 'Patio cleaning', 'Driveway cleaning', 'Decking cleaning', 'Bin store cleaning', 'Graffiti removal'],
};
const ADD = T2['window_cleaning.cat.window_cleaning_additional_services'];

(async () => {
  const wc = R.configFor('Window Cleaning');
  const r = R.resolve(T2, wc);
  chk('2weqw: no unmatched-tick flags; the 11 additional ticks are additionalTicks', !r.flags.some(f => f.code === 'unmatched_tick') && r.additionalTicks.join('|') === ADD.join('|'), JSON.stringify([r.flags.filter(f => f.code === 'unmatched_tick').map(f => f.value), r.additionalTicks.length]), '[[],11]');
  chk('2weqw: the category tabs are unchanged (Window Cleaning Service 5 rows, Pressure Washing Service 7)', r.categories.map(c => `${c.name}:${c.rows.length}`).join(',') === 'Window Cleaning Service:5,Pressure Washing Service:7', r.categories.map(c => `${c.name}:${c.rows.length}`).join(','), '');
  const withKnown = R.resolve({ ...T2, 'window_cleaning.cat.window_cleaning_additional_services': [...ADD, 'Window washing'] }, wc);
  chk('A category service ticked in the additional group is offered (a row), not an additional tick and not unmatched', withKnown.categories[0].rows.some(x => x.name === 'Window washing') && !withKnown.additionalTicks.includes('Window washing') && !withKnown.flags.some(f => f.code === 'unmatched_tick'), JSON.stringify(withKnown.additionalTicks), '');
  const dr = R.configFor('Drainage');
  const drr = R.resolve({ 'drainage.cat.drainage_service': ['Drain Repairs'], 'drainage.cat.drainage_additional_services': ['Interceptor cleaning'], 'drainage.cat.plumbing_additional_services': ['Radiator bleeding'] }, dr);
  chk('Drainage: ticks in both additional groups (Drainage and Plumbing) are additional ticks, never unmatched', drr.additionalTicks.join('|') === 'Interceptor cleaning|Radiator bleeding' && !drr.flags.some(f => f.code === 'unmatched_tick'), JSON.stringify([drr.additionalTicks, drr.flags.map(f => f.code)]), '');
  chk('ticksFromFields reads the additional groups (both for Drainage)', Object.keys(R.ticksFromFields([{ key: 'drainage.cat.drainage_additional_services', value: ['A'] }, { key: 'drainage.cat.plumbing_additional_services', value: ['B'] }], dr)).length === 2, '', '');

  const inputs = R.additionalInputs([...ADD, 'Gutter cleaning'], 'Patio cleaning\nMoss removal\ngutter cleaning', wc);
  chk('Ticks and typed text merge into one list: ticks first, typed after, deduped; a tick also typed is "ticked and typed"; a category service is already covered', inputs.length === 13 && inputs.find(i => i.service === 'Patio cleaning').origin === 'ticked and typed' && inputs.find(i => i.service === 'Moss removal').origin === 'typed' && inputs.find(i => i.service === 'Gutter cleaning').alreadyCovered === true && inputs.filter(i => i.alreadyCovered).length === 1, JSON.stringify(inputs.map(i => [i.service, i.origin, i.alreadyCovered])), '');

  // ── Through the services API with pg-mem and a stubbed model ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool);
  const calls = [], replies = [];
  const callModel = async ({ system, message }) => { calls.push({ system, message }); const next = replies.shift(); if (next === undefined) throw new Error('mock: no reply queued'); return { text: next, usage: { model: 'mock-model' } }; };
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet, callModel, modelName: 'mock-model' });
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('2weqw copy', 'Window Cleaning') RETURNING id`);
  await svc.setField(c.id, 'niche', 'Window Cleaning');
  for (const [k, v] of Object.entries(T2)) await svc.setField(c.id, k, v);

  let v = await svc.servicesView(c.id);
  chk('Services view: no unmatched flags; the 11 ticks are listed as additional ticks', !v.resolved.flags.some(f => f.code === 'unmatched_tick') && v.additionalTicks.length === 11, JSON.stringify(v.resolved.flags.map(f => f.code)), '');
  const reply = JSON.stringify({ services: ADD.map(s => ({ service: s, category_key: /patio|driveway|decking|graffiti|bin store|cladding|canopy|sign|fascia/i.test(s) ? 'pressure_washing_service' : 'window_cleaning_service', reason: 'a cleaning job done with the same kit' })) });
  replies.push(reply);
  let p = await svc.proposeAdditional(c.id);
  v = await svc.servicesView(c.id);
  chk('The ticks go to the parent proposal: 11 rows proposed, each from "ticked", one model call', p.asked === 11 && v.additional.rows.length === 11 && v.additional.rows.every(a => a.status === 'proposed' && a.origin === 'ticked') && calls.length === 1, JSON.stringify([p, v.additional.rows.map(a => [a.service, a.status, a.origin])]), '');
  chk('The model is offered only the client\'s tabs (no Gutter Cleaning Service tab) and exactly the 11 services', /window_cleaning_service: Window Cleaning Service/.test(calls[0].message) && /pressure_washing_service: Pressure Washing Service/.test(calls[0].message) && !/gutter_cleaning_service/.test(calls[0].message) && ADD.every(s => calls[0].message.includes('- ' + s)), calls[0].message.slice(0, 300), '');
  p = await svc.proposeAdditional(c.id);
  chk('Nothing changed: no second model call (hash-gated on ticks and text)', p.skipped === 'unchanged' && calls.length === 1, JSON.stringify(p), '');
  // Confirm one, then type a service that is already ticked plus a new one
  const patio = v.additional.rows.find(a => a.service === 'Patio cleaning');
  await svc.decideAdditional(c.id, patio.id, { status: 'confirmed', category_key: 'pressure_washing_service' });
  await svc.setField(c.id, 'window_cleaning.other_services', 'Patio cleaning\nMoss removal');
  replies.push(JSON.stringify({ services: [{ service: 'Moss removal', category_key: 'pressure_washing_service', reason: 'moss comes off with a soft wash' }] }));
  p = await svc.proposeAdditional(c.id);
  v = await svc.servicesView(c.id);
  chk('Typed text joins the ticks: only the new service goes to the model; the ticked-and-typed one is not asked again', calls.length === 2 && /- Moss removal/.test(calls[1].message) && !/- Patio cleaning/.test(calls[1].message) && v.additional.rows.length === 12, JSON.stringify([calls.length, v.additional.rows.map(a => [a.service, a.status])]), '');
  chk('Confirmed rows keep their decision; Patio cleaning becomes an additional row on Pressure Washing Service', v.additional.rows.find(a => a.service === 'Patio cleaning').status === 'confirmed' && v.additional.rows.find(a => a.service === 'Patio cleaning').origin === 'ticked and typed' && v.resolved.categories.find(k => k.key === 'pressure_washing_service').rows.some(x => x.name === 'Patio cleaning' && x.kind === 'additional'), JSON.stringify(v.additional.rows.find(a => a.service === 'Patio cleaning')), '');
  chk('Still no unmatched flags after confirming', !v.resolved.flags.some(f => f.code === 'unmatched_tick'), '', '');

  // A landscaper's ticked extras (the Landscaper Additional Services group) now reach the flow too
  const land = R.configFor('Landscapers/Gardeners');
  const lr = R.resolve({ 'landscapers.cat.gardener': ['Hedge trimming'], 'landscapers.cat.landscaper_additional_services': ['Garden clearance', 'Sleeper installation'] }, land);
  const li = R.additionalInputs(lr.additionalTicks, '', land);
  chk('Landscapers: ticked extras are additional ticks and go to the proposal (not "already covered")', lr.additionalTicks.length === 2 && li.every(i => !i.alreadyCovered && i.origin === 'ticked'), JSON.stringify(li), '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
