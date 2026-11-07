'use strict';
// Fixture: a later submission keeps earlier answers. A blank doesn't wipe a filled answer,
// a short form loses nothing, a group answered again replaces as a whole, and blank_clears
// clears only when the question was asked. Postgres in memory, no network, no model.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const I = require(path.join(root, 'fillout/intake.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: a later submission keeps earlier answers ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool);
  await ensureAudioBlobTable(pool);
  await ensurePriceTables(pool);

  // The real map, with one field marked so the rule can be tested
  const map = JSON.parse(JSON.stringify(I.loadFieldMap()));
  const mapField = key => map.fields.find(f => f.key === key);
  mapField('anything_else').blank_clears = true;
  const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), fieldMap: map, log: { info() {}, warn() {}, error() {} },
    fetchAudio: async () => ({ buffer: Buffer.from('ID3'), contentType: 'audio/mpeg' }) });

  const clone = o => JSON.parse(JSON.stringify(o));
  const idOf = key => mapField(key).id;
  const send = async (submissionId, change) => {
    const p = clone(sample);
    p.submission.submissionId = submissionId;
    change(p.submission);
    const r = await svc.receive(p);
    return { row: r.id, out: await svc.process(r.id) };
  };
  const setQ = (s, key, value) => { const q = s.questions.find(x => x.id === idOf(key)); if (!q) throw new Error(`sample lacks ${key}`); q.value = value; };
  const fieldOf = async (clientId, key) => (await svc.record(clientId)).sections.flatMap(s => s.fields).find(f => f.key === key);
  const filledKeys = async clientId => (await svc.record(clientId)).sections.flatMap(s => s.fields).filter(f => f.status === 'filled').map(f => f.key).sort();

  // ── The first form ──
  const first = await send('keep-1', s => {
    setQ(s, 'team_size', '4'); setQ(s, 'tone', 'Friendly'); setQ(s, 'anything_else', 'Closed in August');
  });
  const id = first.out.clientId;
  chk('The first form is stored', (await fieldOf(id, 'team_size')).value === '4' && (await fieldOf(id, 'tone')).value === 'Friendly', '', '');

  // ── The same questions, answers blank ──
  const blankRun = await send('keep-2', s => { setQ(s, 'team_size', ''); setQ(s, 'tone', null); });
  chk('A blank answer keeps the filled one', (await fieldOf(id, 'team_size')).value === '4' && (await fieldOf(id, 'team_size')).status === 'filled', await fieldOf(id, 'team_size'), '4');
  chk('A null answer keeps the filled one', (await fieldOf(id, 'tone')).value === 'Friendly', '', '');
  chk('The result names what was kept', blankRun.out.fields.keptKeys.includes('team_size') && blankRun.out.fields.keptKeys.includes('tone'), blankRun.out.fields.keptKeys, 'both');

  // ── A short form: only the questions needed to find the client ──
  const before = await filledKeys(id);
  const shortRun = await send('keep-3', s => {
    const keep = new Set([map.business_name_question_id, map.business_email_question_id, map.niche_question_id]);
    s.questions = s.questions.filter(q => keep.has(q.id));
  });
  const after = await filledKeys(id);
  chk('A short form lands on the same client', shortRun.out.clientId === id, shortRun.out.clientId, id);
  chk('A short form loses no answer', JSON.stringify(before) === JSON.stringify(after) && before.length > 20, [before.length, after.length], 'same');

  // ── A changed answer still changes ──
  await send('keep-4', s => setQ(s, 'team_size', '6'));
  chk('A new answer still replaces the old one', (await fieldOf(id, 'team_size')).value === '6', '', '6');

  // ── A group answered again replaces as a whole ──
  const services = map.fields.filter(f => f.group === 'services' && f.niche === first.out.niche).map(f => f.key);
  chk('The sample has more than one service group to test with', services.length > 1, services, '2+');
  await send('keep-5', s => { for (const k of services) setQ(s, k, k === services[0] ? ['First'] : ['Second']); });
  chk('Both service groups are ticked', (await fieldOf(id, services[1])).status === 'filled', '', '');
  await send('keep-6', s => { for (const k of services) setQ(s, k, k === services[0] ? ['First'] : []); });
  chk('A service group emptied on a form that ticks others is cleared', (await fieldOf(id, services[1])).status === 'blank' && (await fieldOf(id, services[0])).status === 'filled', await fieldOf(id, services[1]), 'blank');
  await send('keep-7', s => { for (const k of services) setQ(s, k, []); });
  chk('A form with no ticks at all keeps the ticks', (await fieldOf(id, services[0])).status === 'filled', await fieldOf(id, services[0]), 'filled');

  // ── blank_clears ──
  await send('keep-7b', s => setQ(s, 'anything_else', 'Closed in August'));
  await send('keep-8', s => { s.questions = s.questions.filter(q => q.id !== idOf('anything_else')); });
  chk('blank_clears: not cleared when the question is not in the submission', (await fieldOf(id, 'anything_else')).value === 'Closed in August', await fieldOf(id, 'anything_else'), 'kept');
  await send('keep-9', s => setQ(s, 'anything_else', ''));
  chk('blank_clears: cleared when the question was asked and left blank', (await fieldOf(id, 'anything_else')).status === 'blank', await fieldOf(id, 'anything_else'), 'blank');

  // ── Hand edits and Reprocess ──
  await svc.setField(id, 'tone', 'Plain');
  await send('keep-10', s => setQ(s, 'tone', ''));
  chk('A hand edit still wins over a blank', (await fieldOf(id, 'tone')).value === 'Plain' && (await fieldOf(id, 'tone')).source === 'manual', '', '');
  await svc.setField(id, 'facts_and_never_say', '');
  await send('keep-11', s => setQ(s, 'facts_and_never_say', ''));
  chk('An answer blanked by hand stays blank', (await fieldOf(id, 'facts_and_never_say')).status === 'blank', '', '');
  await svc.process(first.row);
  chk('Reprocess of the first form brings its own answer back, as before', (await fieldOf(id, 'team_size')).value === '4', await fieldOf(id, 'team_size'), '4');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
