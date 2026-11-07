'use strict';
// Fixture: legal pages, Stage 3. F-LEGAL through the real service on Postgres in memory, and
// the routes over HTTP: each reason holds, only the exceptions text can be cleared, only with
// the key, only for that exact text. No network, no model, no WordPress.
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { createLegalService } = require(path.join(root, 'legal/service.js'));
const { mountLegalApi } = require(path.join(root, 'legal/routes.js'));
const { legalHold, pushRefusals, sameText } = require(path.join(root, 'legal/hold.js'));
const P = require(path.join(root, 'legal/pages.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: legal pages, Stage 3: the hold, F-LEGAL ===\n');

const KEY = 'test-only-clear-key';
const QIDS = { business_name: 'bwUuvaZTmChegZekppzNNv', business_email: '5EHeuZ2pntQwCaoADHRRrJ' };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool);
  await ensureAudioBlobTable(pool);
  await ensurePriceTables(pool);
  const quiet = { info() {}, warn() {}, error() {} };
  const fillout = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet, fetchAudio: async () => ({ buffer: Buffer.from('ID3'), contentType: 'audio/mpeg' }) });

  const cvs = {};
  let keyNow = KEY;
  const legal = createLegalService({ pool, filloutService: fillout, loadValues: async id => cvs[id] || {}, tradeLowerFor: () => 'plumbing and heating', clearKey: () => keyNow });

  // A client whose form and Client Values are complete, so each test can break one thing
  const deliver = async ({ id, tick = true, notes = null, subs = 'Yes', late = 'Yes', time, extra = {} }) => {
    const p = JSON.parse(JSON.stringify(sample));
    p.submission.submissionId = id;
    p.submission.submissionTime = time;
    const qs = p.submission.questions;
    const set = (q, value) => { const x = qs.find(y => y.id === q); if (x) x.value = value; };
    const map = fillout.map.fields;
    const answers = { full_name: 'Jane Smith', business_address: '1 High Street, Southampton', vat_registered: 'No', deposit: 'No', payment_methods: ['Bank transfer'], primary_town: 'Southampton', ...extra };
    for (const [k, v] of Object.entries(answers)) set(map.find(f => f.key === k).id, v);
    qs.push({ id: 'uses_subcontractors', type: 'MultipleChoice', value: subs }, { id: 'late_payment_interest', type: 'MultipleChoice', value: late },
      { id: 'standard_terms_confirmed', type: 'Checkbox', value: tick }, { id: 'standard_terms_exceptions', type: 'LongAnswer', value: notes });
    const r = await fillout.receive(p);
    return (await fillout.process(r.id)).clientId;
  };
  const GOOD_CV = { company_name: 'Good Plumbing', phone: '01234 567890', email: 'a@example.com', legal_entity: 'sole_trader', live_domain: 'goodplumbing.example', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' };

  // ── Clean ──
  const id = await deliver({ id: 'hold-1', time: '2026-01-01T10:00:00.000Z' });
  cvs[id] = { ...GOOD_CV };
  let s = await legal.status(id);
  chk('A complete client with the box ticked is not held', !s.held && s.code === null && s.reasons.length === 0, s.reasons, []);
  chk('Not held: nothing for a push to refuse', s.refusals.length === 0, s.refusals, []);
  chk('The Service Terms are filled from the real details', /Good Plumbing is the trading name of Jane Smith, a sole trader, of 1 High Street, Southampton\./.test(s.pages[0].text) && /all plumbing and heating work/.test(s.pages[0].text), s.pages[0].text.slice(0, 300), 'filled');
  chk('The page has the date filled, with no leftovers', /Last updated: \d{1,2} [A-Z][a-z]+ \d{4}/.test(s.pages[0].text) && s.pages[0].residue.length === 0, s.pages[0].residue, []);

  const code = reasons => reasons.map(r => r.code);

  // ── Reason: not confirmed ──
  await deliver({ id: 'hold-2', tick: false, time: '2026-01-02T10:00:00.000Z' });
  s = await legal.status(id);
  chk('Not ticked: held', s.held && s.code === 'F-LEGAL' && code(s.reasons).includes('not_confirmed'), s.reasons, 'not_confirmed');
  chk('Held: a push refuses, naming F-LEGAL', s.refusals.length === 1 && s.refusals[0].startsWith('F-LEGAL: '), s.refusals, 'F-LEGAL');
  let threw = '';
  try { await legal.clear(id, { key: KEY, exceptions: '' }); } catch (e) { threw = e.message; }
  chk('Not ticked can\'t be cleared: there is no exceptions text', /no exceptions text/.test(threw), threw, 'refused');
  await deliver({ id: 'hold-3', time: '2026-01-03T10:00:00.000Z' });

  // ── Reason: unclear ──
  cvs[id] = { ...GOOD_CV, insurance_cover: 'yes' };
  s = await legal.status(id);
  chk('Unreadable insurance: held, and the reason quotes it', s.held && s.reasons.some(r => r.code === 'unclear' && /"yes"/.test(r.message)), s.reasons, 'unclear');
  cvs[id] = { ...GOOD_CV, legal_entity: '' };
  s = await legal.status(id);
  chk('No limited or sole trader answer: held', s.held && s.reasons.some(r => r.key === 'legal_entity'), s.reasons, 'legal_entity');
  cvs[id] = { ...GOOD_CV };

  // ── Reason: missing ──
  cvs[id] = { ...GOOD_CV, legal_entity: 'limited' };
  s = await legal.status(id);
  chk('A value on more than one page is one reason, naming the pages', s.reasons.filter(r => r.key === 'company_number').length === 1 && /Service Terms, Privacy Policy, Website Terms of Use/.test(s.reasons.find(r => r.key === 'company_number').message), s.reasons.find(r => r.key === 'company_number'), 'three pages');
  chk('Limited with no details: held, in plain words', s.held && ['Registered company name', 'Company number', 'Registered office'].every(w => s.reasons.some(r => r.code === 'missing' && r.message.includes(w))), s.reasons, 'three');
  chk('A token left because it is missing is reported once, not again as residue', !s.reasons.some(r => r.code === 'residue'), s.reasons, 'no residue');
  cvs[id] = { ...GOOD_CV, adr_member: 'yes' };
  s = await legal.status(id);
  chk('ADR member with no provider or link: held (Brandon, 7 Nov)', s.reasons.some(r => r.key === 'adr_body') && s.reasons.some(r => r.key === 'adr_url'), s.reasons, 'both');
  cvs[id] = { ...GOOD_CV };

  // ── Reason: residue, on the pure rule (the fill reports it as it would a bad template) ──
  const pure = legalHold({ answers: { standard_terms_confirmed: { value: 'yes' } }, pages: [{ key: 'x', title: 'X', missing: [], residue: ['{IF'] }] });
  chk('Leftover template text: held', pure.held && pure.reasons[0].code === 'residue', pure.reasons, 'residue');
  const pureToken = legalHold({ answers: { standard_terms_confirmed: { value: 'yes' } }, pages: [{ key: 'x', title: 'X', missing: [], residue: ['[CV:'] }] });
  chk('A token with no missing key behind it: held as residue', pureToken.held && pureToken.reasons[0].code === 'residue', pureToken.reasons, 'residue');

  // ── Every page is held and shown together ──
  chk('All three pages are in the status', (await legal.status(id)).pages.map(p => p.slug).join() === '/service-terms,/privacy-policy,/terms', (await legal.status(id)).pages.map(p => p.slug), 'three');
  cvs[id] = { ...GOOD_CV, sms_tool: '' };
  s = await legal.status(id);
  chk('No answer on the text messaging tool: held', s.held && s.reasons.some(r => r.key === 'sms_tool'), s.reasons, 'sms_tool');
  cvs[id] = { ...GOOD_CV };

  // ── Reason: exceptions, and clearing ──
  const TEXT = 'We take stage payments only';
  await deliver({ id: 'hold-4', notes: TEXT, time: '2026-01-04T10:00:00.000Z' });
  s = await legal.status(id);
  chk('An exception: held, quoting it, the only clearable reason', s.held && s.reasons.length === 1 && s.reasons[0].code === 'exceptions' && s.reasons[0].clearable && s.reasons[0].message.includes(TEXT), s.reasons, 'exceptions');

  const refused = async opts => { try { await legal.clear(id, opts); return ''; } catch (e) { return `${e.status} ${e.message}`; } };
  chk('Clearing with no key: refused', /^403/.test(await refused({ exceptions: TEXT })), '', '403');
  chk('Clearing with the wrong key: refused', /^403/.test(await refused({ key: 'nope', exceptions: TEXT })), '', '403');
  keyNow = '';
  chk('With no key set on the server, nobody can clear', /^403 LEGAL_CLEAR_KEY/.test(await refused({ key: '', exceptions: TEXT })) && /^403 LEGAL_CLEAR_KEY/.test(await refused({ key: KEY, exceptions: TEXT })), '', '403');
  keyNow = KEY;
  chk('Clearing a text other than the one on record: refused', /^409/.test(await refused({ key: KEY, exceptions: 'Something else' })), '', '409');
  chk('Still held after every refusal', (await legal.status(id)).held, '', 'held');

  s = await legal.clear(id, { key: KEY, exceptions: TEXT, note: 'Wording checked' });
  chk('Cleared with the key and the exact text: not held', !s.held && s.exceptions.cleared, s.reasons, []);
  const { rows: cleared } = await pool.query(`SELECT exceptions, note FROM legal_exception_clearances WHERE client_id = $1`, [id]);
  chk('The clearance is on record, with the text and the note', cleared.length === 1 && cleared[0].exceptions === TEXT && cleared[0].note === 'Wording checked', cleared, 'one row');

  await deliver({ id: 'hold-5', notes: `  ${TEXT.replace(' ', '  ')} `, time: '2026-01-05T10:00:00.000Z' });
  chk('Only the spacing changed: still cleared', !(await legal.status(id)).held, (await legal.status(id)).reasons, []);
  await deliver({ id: 'hold-6', notes: 'We never take stage payments', time: '2026-01-06T10:00:00.000Z' });
  s = await legal.status(id);
  chk('The text changed: held again', s.held && s.reasons[0].code === 'exceptions' && !s.exceptions.cleared, s.reasons, 'exceptions');
  await deliver({ id: 'hold-7', notes: null, time: '2026-01-07T10:00:00.000Z' });
  chk('The client removed the exception: not held', !(await legal.status(id)).held, (await legal.status(id)).reasons, []);

  await deliver({ id: 'hold-8', tick: false, notes: 'Stage payments', time: '2026-01-08T10:00:00.000Z' });
  await legal.clear(id, { key: KEY, exceptions: 'Stage payments' });
  s = await legal.status(id);
  chk('Clearing the exception doesn\'t clear anything else', s.held && code(s.reasons).join() === 'not_confirmed', s.reasons, 'not_confirmed');
  await deliver({ id: 'hold-9', time: '2026-01-09T10:00:00.000Z' });

  // ── A later form: a short one keeps the answers, one that asks the question can clear them ──
  const before = await fillout.legalAnswers(id);
  const short = JSON.parse(JSON.stringify(sample));
  short.submission.submissionId = 'hold-short';
  short.submission.submissionTime = '2026-01-09T12:00:00.000Z';
  short.submission.questions = short.submission.questions.filter(q => [fillout.map.business_name_question_id, fillout.map.business_email_question_id, fillout.map.niche_question_id].includes(q.id));
  const shortRow = await fillout.receive(short);
  await fillout.process(shortRow.id);
  s = await legal.status(id);
  chk('A short form without the questions keeps the sign-off', JSON.stringify(await fillout.legalAnswers(id)) === JSON.stringify(before) && !s.held, s.reasons, []);
  await deliver({ id: 'hold-asks-1', notes: 'An exception', time: '2026-01-09T13:00:00.000Z' });
  chk('A form with an exception holds', (await legal.status(id)).reasons.some(r => r.code === 'exceptions'), '', 'held');
  await deliver({ id: 'hold-asks-2', notes: '', time: '2026-01-09T14:00:00.000Z' });
  chk('A form that asks and is left blank removes the exception', !(await legal.status(id)).held, (await legal.status(id)).reasons, []);
  await deliver({ id: 'hold-asks-3', tick: false, time: '2026-01-09T15:00:00.000Z' });
  chk('A form that asks and is left unticked takes the sign-off back', (await legal.status(id)).reasons.some(r => r.code === 'not_confirmed'), '', 'held');
  await deliver({ id: 'hold-asks-4', time: '2026-01-09T16:00:00.000Z' });

  // ── The shared login can't release the hold ──
  await fillout.setField(id, 'standard_terms_confirmed', true);
  chk('A tick by hand as the newest answer does not count as the sign-off', (await legal.status(id)).reasons.some(r => /ticked by hand/.test(r.message)), (await legal.status(id)).reasons, 'by hand');
  await deliver({ id: 'hold-10', tick: false, time: new Date(Date.now() + 60000).toISOString() });
  await fillout.setField(id, 'standard_terms_confirmed', true);
  s = await legal.status(id);
  chk('A client who did not tick stays held when someone ticks by hand', s.held && s.reasons.some(r => r.code === 'not_confirmed'), s.reasons, 'held');
  await deliver({ id: 'hold-11', notes: 'Client text', time: new Date(Date.now() + 120000).toISOString() });
  await fillout.setField(id, 'standard_terms_exceptions', '');
  s = await legal.status(id);
  chk('Blanking the exception by hand does not release the hold', s.held && s.reasons.some(r => r.code === 'exceptions' && r.message.includes('Client text')), s.reasons, 'held');
  await pool.query(`DELETE FROM client_terms_confirmations WHERE client_id = $1 AND source = 'manual'`, [id]);
  await pool.query(`DELETE FROM client_fields WHERE client_id = $1 AND field_key IN ('standard_terms_confirmed', 'standard_terms_exceptions')`, [id]);
  await deliver({ id: 'hold-12', time: new Date(Date.now() + 180000).toISOString() });

  // ── Brandon's adjusted wording ──
  const master = P.masterTemplate('service-terms');
  const adjusted = master.replace('We will leave the work area tidy.', 'We will leave the work area swept and tidy.');
  const refusedW = async (t, key = KEY) => { try { await legal.setWording(id, 'service-terms', { key, template: t }); return ''; } catch (e) { return `${e.status} ${e.message}`; } };
  chk('Adjusting with the wrong key: refused', /^403/.test(await refusedW(adjusted, 'nope')), '', '403');
  chk('An {IF} with no {END IF}: refused', /^400/.test(await refusedW(`${master}\n{IF x = yes}`)), '', '400');
  chk('A typo in a key: refused, so it can\'t silently drop a section', /late_payment_interst/.test(await refusedW(master.replace('{IF late_payment_interest = yes}', '{IF late_payment_interst = yes}'))), '', 'named');
  chk('Empty wording: refused', /^400/.test(await refusedW('   ')), '', '400');
  chk('The master is untouched by a refusal', !(await legal.status(id)).pages[0].custom, '', 'master');
  s = await legal.setWording(id, 'service-terms', { key: KEY, template: adjusted });
  chk('Adjusted wording is what the page now fills from', s.pages[0].custom && /swept and tidy/.test(s.pages[0].text) && !s.held, s.reasons, 'adjusted');
  const { rows: otherRows } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Other Client', 'Plumbing & Heating') RETURNING id`);
  const other = otherRows[0].id;
  chk('Wording for one client doesn\'t reach another', other !== id && !(await legal.status(other)).pages[0].custom, '', 'separate');
  await pool.query(`UPDATE legal_client_wording SET master_hash = 'old' WHERE client_id = $1`, [id]);
  s = await legal.status(id);
  chk('The master changed since: held until it is looked at', s.held && code(s.reasons).includes('wording_stale'), s.reasons, 'wording_stale');
  s = await legal.resetWording(id, 'service-terms', { key: KEY });
  chk('Back to the master: not custom, not held', !s.pages[0].custom && !s.held && !/swept and tidy/.test(s.pages[0].text), s.reasons, []);

  // ── Pure rule ──
  chk('Whitespace doesn\'t make a different text; a word does', sameText(' a  b\nc ', 'a b c') && !sameText('a b', 'a c'), '', '');
  chk('Nothing given at all: held', legalHold({}).held, '', 'held');
  chk('The refusals are empty only when nothing holds', pushRefusals({ held: false, reasons: [] }).length === 0, '', '');

  // ── The routes ──
  const app = express();
  app.use(express.json());
  mountLegalApi(app, legal);
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const call = (method, url, body) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: srv.address().port, method, path: url, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => {
      let t = ''; res.on('data', d => { t += d; }); res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(t) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
  let r = await call('GET', `/api/clients/${id}/legal`);
  chk('GET: the status', r.status === 200 && r.json.held === false && r.json.pages[0].slug === '/service-terms', r.status, 200);
  chk('GET never gives the key away', !JSON.stringify(r.json).includes(KEY) && r.json.keySet === true, '', '');
  r = await call('GET', `/api/clients/${crypto.randomUUID()}/legal`);
  chk('GET: an unknown client is a 404', r.status === 404, r.status, 404);
  r = await call('POST', `/api/clients/${id}/legal/clear`, { key: 'nope', exceptions: 'x' });
  chk('POST clear: a wrong key is a 403', r.status === 403, r.status, 403);
  r = await call('PUT', `/api/clients/${id}/legal/wording/nothing`, { key: KEY, template: 'x' });
  chk('PUT wording: an unknown page is a 404', r.status === 404, r.status, 404);
  r = await call('DELETE', `/api/clients/${id}/legal/wording/service-terms`, { key: KEY });
  chk('DELETE wording: goes back to the master', r.status === 200 && !r.json.pages[0].custom, r.status, 200);
  await new Promise(res => srv.close(res));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
