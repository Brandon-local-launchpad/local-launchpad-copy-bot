'use strict';
// Fixture: the service and category resolver (fillout/services/resolver.js) on the
// Landscapers/Gardeners config, the Edens Edge ticks, both tab rules, duplicate
// propagation, global numbering, the flags, additional-services parsing and the
// proposal step with a stubbed model, plus config validation. Then the same
// through the record API with pg-mem: primary override and decisions survive a
// Reprocess and a resubmission.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'fillout/services/resolver.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const ticks = require(path.join(root, 'tests/fixtures/data/edens-edge-ticks.js'));
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const routes = require(path.join(root, 'fillout/routes.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));
const fieldMap = require(path.join(root, 'fillout/field-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: service resolver (Landscapers/Gardeners, Edens Edge) ===\n');
const config = R.loadConfig('landscapers-gardeners');
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const keyOf = (r, name) => { for (const c of r.categories) for (const row of c.rows) if (row.name === name) return row.legacyKey; return null; };
const tab = (r, key) => r.categories.find(c => c.key === key);

(async () => {
  // ── Config ──
  chk('Config: 7 categories in PDF order, tick groups match field-map keys, primary default Gardener', config.categories.map(c => c.key).join() === 'gardener,landscape_gardener,landscape_designer,lawn_care_service,tree_service,paving_contractor,deck_builder' && config.categories.every(c => fieldMap.fields.some(f => f.key === c.tickGroup && f.niche === 'Landscapers/Gardeners')) && config.primaryDefault === 'gardener', config.categories.map(c => c.key).join(), '');
  const { problems, disagreements } = R.validateConfig(config);
  chk('Config validation finds no problems (the repeated Garden landscaping from the PDF under Landscape Designer is removed from the file, 18 Oct)', problems.length === 0 && config.categories.find(c => c.key === 'landscape_designer').services.filter(x => x === 'Garden landscaping').length === 1, JSON.stringify(problems), '[]');
  chk('Duplicate-note disagreements: exactly the three Gardener services with no note (Lawn mowing, Fencing installation, Garden work)', disagreements.length === 3 && disagreements.every(d => d.code === 'missing_note' && d.category === 'gardener') && disagreements.map(d => d.service).sort().join('|') === 'Fencing installation|Garden work|Lawn mowing and maintenance', JSON.stringify(disagreements.map(d => [d.code, d.service])), '3 missing_note');
  chk('Config validation fails on inconsistent casing', (() => { const c2 = clone(config); c2.categories[1].services[0] = 'Artificial Turf Installation'; return R.validateConfig(c2).problems.some(p => p.code === 'inconsistent_casing'); })(), '', '');
  chk('Config validation fails when a category lists the same service twice', (() => { const c2 = clone(config); c2.categories[4].services.push('Tree removal'); return R.validateConfig(c2).problems.some(p => p.code === 'repeated_in_category' && p.category === 'tree_service'); })(), '', '');
  chk('"Landscape design" and "Landscaping design" are different services; so are "Garden design" and "Garden designs"', R.norm('Landscape design') !== R.norm('Landscaping design') && R.norm('Garden design') !== R.norm('Garden designs') && R.norm('Lawn Care Service') === R.norm('lawn care   service'), '', '');

  // ── Edens Edge, ticked_only ──
  const r1 = R.resolve(ticks, config);
  chk('ticked_only: 6 tabs (no Lawn Care Service), primary Gardener, no flags beyond config notes', r1.counts.tabs === 6 && !tab(r1, 'lawn_care_service') && r1.primary === 'gardener' && !r1.flags.some(f => !f.code.startsWith('config_')), JSON.stringify([r1.counts, r1.flags.map(f => f.code)]), '');
  chk('Cat 1 Gardener: 8 rows service_1 to service_8, Hedge trimming unique, the rest duplicates', tab(r1, 'gardener').legacyKey === 'category_1' && tab(r1, 'gardener').rows.length === 8 && tab(r1, 'gardener').rows.map(x => x.legacyKey).join() === 'service_1,service_2,service_3,service_4,service_5,service_6,service_7,service_8' && tab(r1, 'gardener').rows.find(x => x.name === 'Hedge trimming').kind === 'unique' && tab(r1, 'gardener').rows.filter(x => x.kind === 'duplicate').length === 7, JSON.stringify(tab(r1, 'gardener').rows.map(x => [x.legacyKey, x.kind])), '');
  const lg = tab(r1, 'landscape_gardener');
  chk('Cat 2 Landscape Gardener: 32 rows, service_9 first, service_38 last, Grass seeding = service_4 and Landscape design = service_6 reused', lg.legacyKey === 'category_2' && lg.rows.length === 32 && lg.rows[0].legacyKey === 'service_9' && lg.rows[lg.rows.length - 1].legacyKey === 'service_38' && keyOf(r1, 'Grass seeding') === 'service_4' && keyOf(r1, 'Landscape design') === 'service_6', JSON.stringify([lg.rows.length, lg.rows[0].legacyKey, lg.rows[31].legacyKey]), '[32,"service_9","service_38"]');
  chk('Cat 2 order is PDF order, interleaved: Landscape design sits 13th (after Hardscaping), not last', lg.rows[12].name === 'Landscape design' && lg.rows[11].name === 'Hardscaping' && lg.rows[31].name === 'Garden landscaping', lg.rows.map(x => x.name).slice(10, 14).join('|'), 'Groundskeeping|Hardscaping|Landscape design|Landscape installations');
  chk('Hardscaping = service_20, a duplicate on Landscape Gardener (also Paving Contractor) and a duplicate row on Paving Contractor reusing service_20', keyOf(r1, 'Hardscaping') === 'service_20' && lg.rows.find(x => x.name === 'Hardscaping').kind === 'duplicate' && lg.rows.find(x => x.name === 'Hardscaping').alsoOn.map(a => a.key).join() === 'paving_contractor' && tab(r1, 'paving_contractor').rows.find(x => x.name === 'Hardscaping').kind === 'duplicate' && tab(r1, 'paving_contractor').rows.find(x => x.name === 'Hardscaping').legacyKey === 'service_20', '', '');
  const ld = tab(r1, 'landscape_designer');
  chk('Cat 3 Landscape Designer: starts with duplicates in PDF order, Custom landscape design = service_39, 28 rows (the repeated Garden landscaping shown once)', ld.legacyKey === 'category_3' && ld.rows[0].name === 'Artificial turf installation' && ld.rows[0].kind === 'duplicate' && keyOf(r1, 'Custom landscape design') === 'service_39' && ld.rows.length === 28 && ld.rows.filter(x => x.name === 'Garden landscaping').length === 1, JSON.stringify([ld.rows.length, ld.rows[0].name, keyOf(r1, 'Custom landscape design')]), '');
  chk('Cat 3 interleaves unique and duplicate rows (not grouped)', ld.rows.map(x => x.kind[0]).join('') !== ld.rows.map(x => x.kind[0]).join('').replace(/(u+)(d+)/, '$1$2') || /du+d/.test(ld.rows.map(x => x.kind[0]).join('')), ld.rows.map(x => x.kind[0]).join(''), 'mixed');
  chk('Tree Service starts at service_48 (category_4 in ticked_only), Paving at service_55 (category_5), Deck at service_63 (category_6), 78 services in all (Deck Builder 16: service_63 to service_78)', keyOf(r1, 'Cabling and bracing') === 'service_48' && tab(r1, 'tree_service').legacyKey === 'category_4' && keyOf(r1, 'Brick paver installation') === 'service_55' && tab(r1, 'paving_contractor').legacyKey === 'category_5' && keyOf(r1, 'Composite decks') === 'service_63' && tab(r1, 'deck_builder').legacyKey === 'category_6' && tab(r1, 'deck_builder').rows.length === 16 && tab(r1, 'deck_builder').rows[15].legacyKey === 'service_78' && r1.counts.services === 78, JSON.stringify([keyOf(r1, 'Cabling and bracing'), keyOf(r1, 'Brick paver installation'), keyOf(r1, 'Composite decks'), r1.counts.services]), '');
  chk('crossRef: 21 services on 2+ tabs, each with short and full names; Hardscaping and Grass seeding among them', r1.crossRef.length === 21 && r1.crossRef.every(x => x.short && x.full) && r1.crossRef.some(x => x.name === 'Hardscaping' && x.tabs.length === 2) && r1.crossRef.find(x => x.name === 'Grass seeding').tabs.length === 3, r1.crossRef.length, 21);
  chk('alsoOn marks categories without a tab (Lawn Care Service) so a reader knows the duplicate has no page', tab(r1, 'gardener').rows.find(x => x.name === 'Mulching').alsoOn.some(a => a.key === 'lawn_care_service' && a.hasTab === false), '', '');

  // ── ticked_or_propagated ──
  const r2 = R.resolve(ticks, config, { categoryTabRule: 'ticked_or_propagated' });
  chk('ticked_or_propagated: 7 tabs, Lawn Care Service as category_4 with 8 propagated rows and no new numbers; later tabs renumbered; service numbers identical', r2.counts.tabs === 7 && tab(r2, 'lawn_care_service').legacyKey === 'category_4' && tab(r2, 'lawn_care_service').rows.length === 8 && tab(r2, 'lawn_care_service').tickedHere === false && tab(r2, 'lawn_care_service').rows.every(x => parseInt(x.legacyKey.slice(8)) <= 38) && tab(r2, 'tree_service').legacyKey === 'category_5' && keyOf(r2, 'Cabling and bracing') === 'service_48' && r2.counts.services === 78 && r2.crossRef.length === 26, JSON.stringify([r2.counts, tab(r2, 'lawn_care_service').rows.map(x => x.legacyKey)]), '');

  // ── Flags ──
  const unknown = R.resolve({ ...ticks, 'landscapers.cat.gardener': [...ticks['landscapers.cat.gardener'], 'Hedge trimming and shaping'] }, config);
  chk('A tick matching no known service is flagged (amber) and ignored', unknown.flags.some(f => f.code === 'unmatched_tick' && /Hedge trimming and shaping/.test(f.msg) && f.severity === 'warn') && unknown.counts.services === 78, JSON.stringify(unknown.flags.filter(f => f.code === 'unmatched_tick')), '');
  const noPrimary = R.resolve({ ...ticks, 'landscapers.cat.gardener': [] }, config);
  chk('Primary category with no tab is flagged (red) and not guessed', noPrimary.primary === null && noPrimary.flags.some(f => f.code === 'primary_missing' && f.severity === 'bad'), JSON.stringify([noPrimary.primary, noPrimary.flags.map(f => f.code)]), '');
  const override = R.resolve({ ...ticks, 'landscapers.cat.gardener': [] }, config, { primaryOverride: 'tree_service' });
  chk('A primary override from the client record is used', override.primary === 'tree_service' && tab(override, 'tree_service').primary === true && !override.flags.some(f => f.code === 'primary_missing'), override.primary, 'tree_service');
  const bigConfig = clone(config);
  for (let i = 1; i <= 5; i++) bigConfig.categories.push({ key: `extra_${i}`, name: `Extra ${i}`, tickGroup: `x.cat.extra_${i}`, ticks: [`Extra service ${i}`], services: [`Extra service ${i}`] });
  const bigTicks = { ...ticks, 'landscapers.cat.lawn_care_service': ['Irrigation system repair and maintenance'] };
  for (let i = 1; i <= 5; i++) bigTicks[`x.cat.extra_${i}`] = [`Extra service ${i}`];
  const big = R.resolve(bigTicks, bigConfig);
  chk('More than 10 tabs → "too many categories" flag (red)', big.counts.tabs === 12 && big.flags.some(f => f.code === 'too_many_categories' && f.severity === 'bad' && /choose which to drop/i.test(f.msg)), JSON.stringify([big.counts.tabs, big.flags.map(f => f.code)]), '');
  chk('Bad categoryTabRule is refused', (() => { try { R.resolve(ticks, config, { categoryTabRule: 'everything' }); return false; } catch (e) { return /categoryTabRule/.test(e.message); } })(), '', '');
  const addl = R.resolve({ ...ticks, 'landscapers.cat.landscaper_additional_services': ['Garden clearance', 'Sleeper installation'] }, config);
  chk('Ticks in the additional-services tick group are reported as additionalTicks, not as unmatched', addl.additionalTicks.length === 2 && !addl.flags.some(f => f.code === 'unmatched_tick'), JSON.stringify(addl.additionalTicks), '');
  const withAdd = R.resolve(ticks, config, { additional: [{ service: 'Pond installation', categoryKey: 'landscape_designer' }, { service: 'Nowhere', categoryKey: 'lawn_care_service' }] });
  chk('Confirmed additional services become "additional" rows in their parent tab, numbered after every config service; a parent without a tab is flagged', tab(withAdd, 'landscape_designer').rows.find(x => x.name === 'Pond installation').kind === 'additional' && tab(withAdd, 'landscape_designer').rows.find(x => x.name === 'Pond installation').legacyKey === 'service_79' && withAdd.flags.some(f => f.code === 'additional_parent_missing'), JSON.stringify(withAdd.flags.map(f => f.code)), '');

  // ── Additional services parsing and dedupe ──
  const parsed = R.parseAdditional('garden clearance\n• Pond installation\n- sleeper installation, Raised beds; tree removal\nwater features', config);
  chk('Free text parses one service per line, bullet or comma, tidied, deduped against the services in the category lists (an additional tick option like Garden clearance has no category yet, so it is not "covered")', parsed.map(p => `${p.service}${p.alreadyCovered ? '*' : ''}`).join('|') === 'Garden clearance|Pond installation|Sleeper installation|Raised beds|Tree removal*|Water features', parsed.map(p => `${p.service}${p.alreadyCovered ? '*' : ''}`).join('|'), '');
  chk('Parsing keeps the client\'s wording (only the first letter is capitalised)', parsed.find(p => p.service === 'Raised beds') && parsed.find(p => p.service === 'Water features'), '', '');

  // ── Proposal parsing with a stubbed reply ──
  const tabs = [{ key: 'gardener', name: 'Gardener' }, { key: 'landscape_designer', name: 'Landscape Designer' }];
  const good = AS.parseReply('{"services":[{"service":"Pond installation","category_key":"landscape_designer","reason":"ponds are designed garden features"},{"service":"Raised beds","category_key":"unsure","reason":"could be either"}]}', ['Pond installation', 'Raised beds'], tabs);
  chk('A valid reply gives a category or null (unsure) with a reason, in the services\' order', good[0].categoryKey === 'landscape_designer' && good[1].categoryKey === null && good[1].reason === 'could be either', JSON.stringify(good), '');
  const bad = s => { try { AS.parseReply(s, ['Pond installation'], tabs); return null; } catch (e) { return e.message; } };
  chk('A reply naming a category that is not a tab is refused', /not one of the client/.test(bad('{"services":[{"service":"Pond installation","category_key":"paving_contractor","reason":"x"}]}')), bad('{"services":[{"service":"Pond installation","category_key":"paving_contractor","reason":"x"}]}'), '');
  chk('A reply missing a service, or with no reason, or with a field name in the reason, is refused', /no answer/.test(bad('{"services":[]}')) && /no reason/.test(bad('{"services":[{"service":"Pond installation","category_key":"gardener"}]}')) && /field name/.test(bad('{"services":[{"service":"Pond installation","category_key":"gardener","reason":"set category_key"}]}')), '', '');
  chk('The prompt only allows the client\'s tabs or unsure, never renames, and asks for a plain reason', (() => { const p = require('fs').readFileSync(AS.PROMPT_PATH, 'utf8'); return /ONLY from the category tabs/.test(p) && /Never invent a category/.test(p) && /Never rename/.test(p) && /non-technical/.test(p); })(), '', '');

  // ── Through the record API: primary override and decisions survive Reprocess and resubmission ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool);
  const replies = [];
  const calls = [];
  const callModel = async ({ system, message }) => { calls.push({ system, message }); const next = replies.shift(); if (next === undefined) throw new Error('mock: no reply queued'); if (next instanceof Error) throw next; return { text: next, usage: { model: 'mock-model', stop_reason: 'end_turn' } }; };
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), fetchAudio: async () => ({ buffer: Buffer.from('ID3x'), contentType: 'audio/mpeg' }), log: quiet, callModel, modelName: 'mock-model' });
  const app = express(); routes.mountWebhook(app, svc, { secret: 's', log: quiet }); app.use(express.json()); routes.mountApi(app, svc);
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async r => r.json();
  const landscaperPayload = (sid) => {
    const p = clone(sample); p.submission.submissionId = sid;
    const qs = p.submission.questions;
    qs.find(q => q.id === 'q_niche_select').value = 'Landscapers/Gardeners';
    qs.find(q => q.id === 'bwUuvaZTmChegZekppzNNv').value = 'Edens Edge'; qs.find(q => q.id === '5EHeuZ2pntQwCaoADHRRrJ').value = 'ethan@example.com';
    for (const f of fieldMap.fields.filter(f => f.niche === 'Landscapers/Gardeners')) {
      const q = qs.find(q => q.id === f.id);
      q.value = ticks[f.key] !== undefined ? ticks[f.key] : f.key === 'landscapers.other_services' ? 'Pond installation\nRaised beds\nGarden clearance' : f.type === 'ShortAnswer' ? 'Patio paving' : null;
    }
    return p;
  };
  const deliver = async sid => { await req('POST', `/api/webhooks/fillout?token=s`, landscaperPayload(sid)); for (let i = 0; i < 300; i++) { const r = (await pool.query(`SELECT client_id, status FROM fillout_submissions WHERE submission_id = $1`, [sid])).rows[0]; if (r && r.status !== 'received') { await sleep(150); return r.client_id; } await sleep(10); } throw new Error('never processed'); };
  try {
    // The prices model call comes first (no transcript here, so it is skipped); the additional-services call is next
    replies.push('{"services":[{"service":"Pond installation","category_key":"landscape_designer","reason":"ponds are designed garden features"},{"service":"Raised beds","category_key":"unsure","reason":"could sit under more than one tab"},{"service":"Garden clearance","category_key":"gardener","reason":"clearing a garden is general garden work"}]}');
    const cid = await deliver('ee-0001');
    let v = await json(await req('GET', `/api/clients/${cid}/services`));
    chk('Services view through the API: config found, 6 tabs, Gardener primary, Hardscaping service_20', v.hasConfig && v.resolved.counts.tabs === 6 && v.resolved.primary === 'gardener' && keyOf(v.resolved, 'Hardscaping') === 'service_20', JSON.stringify([v.hasConfig, v.resolved && v.resolved.counts]), '');
    chk('Additional services proposed in the background: Pond installation → Landscape Designer, Raised beds unsure, Garden clearance → Gardener (an additional tick option, not a category service); all typed', v.additional.state.status === 'done' && v.additional.rows.length === 3 && v.additional.rows.find(a => a.service === 'Pond installation').proposedCategoryKey === 'landscape_designer' && v.additional.rows.find(a => a.service === 'Raised beds').proposedCategoryKey === null && v.additional.rows.find(a => a.service === 'Garden clearance').proposedCategoryKey === 'gardener' && v.additional.rows.every(a => a.origin === 'typed') && calls.length === 1, JSON.stringify(v.additional), '');
    chk('The model was given only the client\'s tabs (no Lawn Care Service) and the exact services', /gardener: Gardener/.test(calls[0].message) && !/lawn_care_service/.test(calls[0].message) && /- Pond installation\n- Raised beds\n- Garden clearance/.test(calls[0].message), calls[0].message.split('\n').slice(0, 12).join(' | '), '');
    const pond = v.additional.rows.find(a => a.service === 'Pond installation'), beds = v.additional.rows.find(a => a.service === 'Raised beds');
    v = await json(await req('PUT', `/api/clients/${cid}/services/additional/${pond.id}`, { status: 'confirmed', category_key: 'landscape_designer' }));
    chk('Confirming puts the service in its parent tab as an "additional" row with the next service number', tab(v.resolved, 'landscape_designer').rows.find(x => x.name === 'Pond installation' && x.kind === 'additional' && x.legacyKey === 'service_79') && v.additional.rows.find(a => a.id === pond.id).status === 'confirmed' && v.additional.rows.find(a => a.id === pond.id).source === 'manual', JSON.stringify(v.additional.rows.find(a => a.id === pond.id)), '');
    v = await json(await req('PUT', `/api/clients/${cid}/services/additional/${beds.id}`, { status: 'confirmed', category_key: 'gardener' }));
    chk('Change: an unsure row confirmed under a chosen tab', v.additional.rows.find(a => a.id === beds.id).confirmedCategoryKey === 'gardener' && tab(v.resolved, 'gardener').rows.some(x => x.name === 'Raised beds'), '', '');
    let r = await req('PUT', `/api/clients/${cid}/services/additional/${beds.id}`, { status: 'confirmed', category_key: 'lawn_care_service' });
    chk('Confirming under a category with no tab is refused', r.status === 400, r.status, 400);
    v = await json(await req('PUT', `/api/clients/${cid}/services/primary`, { category_key: 'tree_service' }));
    chk('Primary override saved on the client and applied', v.primaryOverride === 'tree_service' && v.resolved.primary === 'tree_service', JSON.stringify([v.primaryOverride, v.resolved.primary]), '');
    r = await req('PUT', `/api/clients/${cid}/services/primary`, { category_key: 'nope' });
    chk('Unknown primary refused', r.status === 400, r.status, 400);
    // Reprocess and a resubmission with the same text: no model call, decisions kept
    const subId = (await pool.query(`SELECT id FROM fillout_submissions WHERE submission_id = 'ee-0001'`)).rows[0].id;
    await req('POST', `/api/fillout/submissions/${subId}/reprocess`); await sleep(200);
    await deliver('ee-0002');
    v = await json(await req('GET', `/api/clients/${cid}/services`));
    chk('After Reprocess and a resubmission: primary override, confirmed rows and the skipped/unsure decisions survive; no second model call (same text)', v.primaryOverride === 'tree_service' && v.additional.rows.find(a => a.id === pond.id).status === 'confirmed' && v.additional.rows.find(a => a.id === beds.id).confirmedCategoryKey === 'gardener' && calls.length === 1, JSON.stringify([v.primaryOverride, calls.length, v.additional.rows.map(a => [a.service, a.status])]), '');
    // Changed text: only new services go to the model; handled rows are kept
    replies.push('{"services":[{"service":"Water features","category_key":"landscape_designer","reason":"water features are designed garden features"}]}');
    const p3 = landscaperPayload('ee-0003'); p3.submission.questions.find(q => q.id === fieldMap.fields.find(f => f.key === 'landscapers.other_services').id).value = 'Pond installation\nRaised beds\nWater features';
    await req('POST', `/api/webhooks/fillout?token=s`, p3); await sleep(400);
    v = await json(await req('GET', `/api/clients/${cid}/services`));
    chk('Changed answer: the model is asked only about the new service; confirmed rows untouched', calls.length === 2 && /- Water features/.test(calls[1].message) && !/Pond installation/.test(calls[1].message) && v.additional.rows.find(a => a.service === 'Water features').proposedCategoryKey === 'landscape_designer' && v.additional.rows.find(a => a.id === pond.id).status === 'confirmed', JSON.stringify([calls.length, v.additional.rows.map(a => [a.service, a.status])]), '');
    // A bad reply leaves the rows for a person
    replies.push('nonsense');
    const rp = await json(await req('POST', `/api/clients/${cid}/services/additional/propose`));
    chk('A bad reply → extraction_failed on the state, new rows marked for a person, confirmed rows kept', rp.error && rp.view.additional.state.status === 'extraction_failed' && rp.view.additional.rows.find(a => a.service === 'Water features').status === 'extraction_failed' && rp.view.additional.rows.find(a => a.id === pond.id).status === 'confirmed', JSON.stringify(rp.view.additional), '');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
