'use strict';
// Fixture: legal pages, Stage 1. The four new form answers through the real intake on
// Postgres in memory: the mapping, the tick box, the sign-off history (added to, never
// overwritten, and a Reprocess changes nothing), the defaults for clients who haven't
// answered, the hand-typed Legal details group. No network, no model, no WordPress.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const I = require(path.join(root, 'fillout/intake.js'));
const L = require(path.join(root, 'legal/onboarding.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: legal pages, Stage 1: the onboarding answers ===\n');

// The four questions as the live form has them (GET /v1/api/forms/{id}, 7 Nov 2026)
const answers = ({ subs, late, tick, notes }) => [
  { id: 'uses_subcontractors', name: 'Do you ever use subcontractors on your jobs?', type: 'MultipleChoice', value: subs },
  { id: 'late_payment_interest', name: 'Do you charge interest if a customer pays late?', type: 'MultipleChoice', value: late },
  { id: 'standard_terms_confirmed', name: "These match how I work, or I've told you what's different below", type: 'Checkbox', value: tick },
  { id: 'standard_terms_exceptions', name: "Anything that doesn't match how you work?", type: 'LongAnswer', value: notes },
];
const payload = (submissionId, submissionTime, a) => {
  const p = JSON.parse(JSON.stringify(sample));
  p.submission.submissionId = submissionId;
  p.submission.submissionTime = submissionTime;
  if (a) p.submission.questions.push(...answers(a));
  return p;
};

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
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet,
    fetchAudio: async () => ({ buffer: Buffer.from('ID3'), contentType: 'audio/mpeg' }) });
  const deliver = async p => { const r = await svc.receive(p); return { row: r.id, out: await svc.process(r.id) }; };
  const fieldOf = (rec, key) => rec.sections.flatMap(s => s.fields).find(f => f.key === key);

  // ── The map ──
  const map = I.loadFieldMap();
  for (const k of L.FORM_KEYS) {
    const f = map.fields.find(x => x.key === k);
    chk(`${k} is mapped by its question id, on the Quotes panel`, f && f.id === k && f.panel === 'quotes_process' && f.niche === 'all', f, 'mapped');
  }
  chk('The three answers are worth chasing and the exceptions box is optional', ['uses_subcontractors', 'late_payment_interest', 'standard_terms_confirmed'].every(k => map.fields.find(f => f.key === k).tier === 'chase') && map.fields.find(f => f.key === 'standard_terms_exceptions').tier === 'optional', '', '');

  // ── A client from before the questions existed ──
  const first = await deliver(payload('legal-old', '2025-10-01T09:00:00.000Z', null));
  const clientId = first.out.clientId;
  let rec = await svc.record(clientId);
  chk('Hasn\'t answered: subcontractors defaults to yes, marked defaulted', rec.legalAnswers.uses_subcontractors.value === 'yes' && rec.legalAnswers.uses_subcontractors.defaulted, rec.legalAnswers.uses_subcontractors, 'yes, defaulted');
  chk('Hasn\'t answered: late payment interest defaults to yes, marked defaulted', rec.legalAnswers.late_payment_interest.value === 'yes' && rec.legalAnswers.late_payment_interest.defaulted, rec.legalAnswers.late_payment_interest, 'yes, defaulted');
  chk('Hasn\'t answered: the sign-off is blank', rec.legalAnswers.standard_terms_confirmed.value === '' && rec.legalAnswers.standard_terms_confirmed.at === null, rec.legalAnswers.standard_terms_confirmed, 'blank');
  chk('A payload without the question adds nothing to the history', rec.termsConfirmations.length === 0, rec.termsConfirmations, []);
  chk('The defaults are not written to the record', fieldOf(rec, 'uses_subcontractors').status === 'blank', fieldOf(rec, 'uses_subcontractors'), 'blank');

  // ── Answered: no, no, ticked, with exceptions ──
  const t1 = '2026-01-07T10:00:00.000Z';
  const second = await deliver(payload('legal-1', t1, { subs: 'No', late: 'No', tick: true, notes: 'We take stage payments only' }));
  chk('A resubmission lands on the same client', second.out.clientId === clientId, second.out.clientId, clientId);
  rec = await svc.record(clientId);
  chk('Subcontractors no, not defaulted', rec.legalAnswers.uses_subcontractors.value === 'no' && !rec.legalAnswers.uses_subcontractors.defaulted, rec.legalAnswers.uses_subcontractors, 'no');
  chk('Late payment interest no, not defaulted', rec.legalAnswers.late_payment_interest.value === 'no' && !rec.legalAnswers.late_payment_interest.defaulted, rec.legalAnswers.late_payment_interest, 'no');
  chk('The sign-off is yes, at the time the client submitted', rec.legalAnswers.standard_terms_confirmed.value === 'yes' && new Date(rec.legalAnswers.standard_terms_confirmed.at).toISOString() === t1, rec.legalAnswers.standard_terms_confirmed, t1);
  chk('The exceptions text reaches the answers', rec.legalAnswers.standard_terms_exceptions === 'We take stage payments only', rec.legalAnswers.standard_terms_exceptions, 'the text');
  chk('The tick is stored as a filled field', fieldOf(rec, 'standard_terms_confirmed').status === 'filled' && fieldOf(rec, 'standard_terms_confirmed').value === true, fieldOf(rec, 'standard_terms_confirmed'), 'filled');
  chk('The history has one row, from the form, with the exceptions', rec.termsConfirmations.length === 1 && rec.termsConfirmations[0].source === 'form' && rec.termsConfirmations[0].confirmed && rec.termsConfirmations[0].exceptions === 'We take stage payments only', rec.termsConfirmations, 'one row');

  // ── Reprocess changes nothing ──
  await svc.process(second.row);
  rec = await svc.record(clientId);
  chk('A Reprocess adds no row', rec.termsConfirmations.length === 1, rec.termsConfirmations.length, 1);
  chk('A Reprocess does not move the date', new Date(rec.termsConfirmations[0].answeredAt).toISOString() === t1, rec.termsConfirmations[0].answeredAt, t1);

  // ── A later answer keeps the earlier one ──
  const t2 = '2026-01-08T10:00:00.000Z';
  await deliver(payload('legal-2', t2, { subs: 'Yes', late: 'Yes', tick: false, notes: '' }));
  rec = await svc.record(clientId);
  chk('An unticked later form adds a row', rec.termsConfirmations.length === 2 && rec.termsConfirmations[0].confirmed === false, rec.termsConfirmations, '2 rows');
  chk('The earlier confirmation is still there, unchanged', rec.termsConfirmations[1].confirmed === true && new Date(rec.termsConfirmations[1].answeredAt).toISOString() === t1, rec.termsConfirmations[1], t1);
  chk('The newest answer wins: the sign-off is no longer yes', rec.legalAnswers.standard_terms_confirmed.value === '', rec.legalAnswers.standard_terms_confirmed, 'blank');
  chk('An unticked box is a blank field, not a filled false', fieldOf(rec, 'standard_terms_confirmed').status === 'blank', fieldOf(rec, 'standard_terms_confirmed'), 'blank');

  const t3 = '2026-01-09T10:00:00.000Z';
  const third = await deliver(payload('legal-3', t3, { subs: 'No', late: 'Yes', tick: true, notes: 'Newer exceptions' }));
  rec = await svc.record(clientId);
  chk('Ticked again: three rows, and the sign-off is yes at the newest time', rec.termsConfirmations.length === 3 && new Date(rec.legalAnswers.standard_terms_confirmed.at).toISOString() === t3, rec.legalAnswers.standard_terms_confirmed, t3);

  // ── Reprocessing an old submission must not undo a newer answer ──
  await svc.process(first.row);
  rec = await svc.record(clientId);
  chk('Reprocessing the old blank form keeps the newer exceptions', rec.legalAnswers.standard_terms_exceptions === 'Newer exceptions', rec.legalAnswers.standard_terms_exceptions, 'Newer exceptions');
  chk('Reprocessing the old blank form keeps the newer answers', rec.legalAnswers.uses_subcontractors.value === 'no' && fieldOf(rec, 'standard_terms_confirmed').value === true, rec.legalAnswers.uses_subcontractors, 'no');
  chk('Reprocessing the old blank form adds no row', rec.termsConfirmations.length === 3, rec.termsConfirmations.length, 3);
  await svc.process(third.row);

  // ── By hand ──
  await svc.setField(clientId, 'standard_terms_confirmed', false);
  rec = await svc.record(clientId);
  chk('Unticking by hand adds a row marked manual', rec.termsConfirmations.length === 4 && rec.termsConfirmations[0].source === 'manual' && rec.termsConfirmations[0].confirmed === false, rec.termsConfirmations[0], 'manual');
  chk('The newest answer is by hand, so the sign-off is no longer yes', rec.legalAnswers.standard_terms_confirmed.value === '' && rec.legalAnswers.standard_terms_confirmed.source === 'manual', rec.legalAnswers.standard_terms_confirmed, 'blank');
  chk('The form rows are untouched', rec.termsConfirmations.filter(t => t.source === 'form').length === 3, rec.termsConfirmations, '3 form rows');
  await svc.setField(clientId, 'standard_terms_confirmed', true);
  rec = await svc.record(clientId);
  chk('A tick by hand goes on the history but is not the sign-off', rec.termsConfirmations[0].source === 'manual' && rec.termsConfirmations[0].confirmed === true && rec.legalAnswers.standard_terms_confirmed.value === '' && rec.legalAnswers.standard_terms_confirmed.by_hand === true, rec.legalAnswers.standard_terms_confirmed, 'not yes');
  await svc.setField(clientId, 'standard_terms_exceptions', '');
  rec = await svc.record(clientId);
  chk('Blanking the exceptions by hand keeps the text from the form', rec.legalAnswers.standard_terms_exceptions === 'Newer exceptions', rec.legalAnswers.standard_terms_exceptions, 'Newer exceptions');
  chk('legalAnswers on the service matches the record', JSON.stringify(await svc.legalAnswers(clientId)) === JSON.stringify(rec.legalAnswers), await svc.legalAnswers(clientId), rec.legalAnswers);

  // ── Pure rules ──
  chk('An answer that isn\'t plainly yes or no is unclear, never guessed', L.legalAnswers({ uses_subcontractors: 'sometimes' }).uses_subcontractors.unclear === true && L.legalAnswers({ uses_subcontractors: 'sometimes' }).uses_subcontractors.value === null, '', '');
  chk('Unticked values from the form are blank', ['false', false, '', null, undefined].every(v => !I.checkboxOn(v)), '', '');
  chk('Ticked values from the form are on', [true, 'true', 'Yes'].every(I.checkboxOn), '', '');

  // ── The hand-typed Legal details ──
  const tab = fs.readFileSync(path.join(root, 'public/app/tabs/record.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const handKeys = ['legal_entity', 'legal_name', 'company_number', 'jurisdiction', 'registered_office', 'vat_number', 'ico_number', 'regulatory_body', 'regulatory_number', 'trade_body', 'guarantee_months', 'quote_valid_days', 'callout_fee', 'callout_fee_amount', 'deposit_threshold', 'deposit_percent', 'waste_removal', 'adr_member', 'adr_body', 'adr_url', 'google_ads', 'meta_pixel', 'sms_tool'];
  for (const k of handKeys) chk(`${k} is on the Record tab and in the values template`, tab.includes(`key: '${k}'`) && new RegExp(`\\b${k}: ''`).test(server), k, 'both');
  const { CV_KEYS } = require(path.join(root, 'v20-generate.js'));
  chk('No legal detail is sent to the page model or pushed as a Client Value', handKeys.every(k => !CV_KEYS.includes(k)), handKeys.filter(k => CV_KEYS.includes(k)), []);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
