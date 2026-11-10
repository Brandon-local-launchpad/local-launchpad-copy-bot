'use strict';
// Fixture: the operator's emails (automation/notify.js) and when the chain sends them
// (automation/runner.js). One email per stop, never one per page; who it goes to; the
// morning digest once a day. The sender is a fake: no email leaves this test.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const AU = require(path.join(root, 'automation/runner.js'));
const NO = require(path.join(root, 'automation/notify.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the operator\'s emails (one per stop, the morning digest) ===\n');

const ID = crypto.randomUUID(), ID2 = crypto.randomUUID(), ID3 = crypto.randomUUID();
const env = { COPYBOT_URL: 'https://copybot.example/' };
const needs = n => Array.from({ length: n }, (_, i) => ({ key: 'k' + i, text: `Thing ${i + 1}` }));
const rowOf = over => ({ id: ID, name: 'Edens Edge', pages: { total: 42, written: 34 }, tracker: { needs: [{ key: 'claims', text: 'Accept or reject 6 claims' }, { key: 'blocked', text: 'Fix 2 blocked pages' }] }, ...over });

// ── The emails ──
const e1 = NO.stopEmail({ to: 'ray@ll.example', name: 'Ray Smith', row: rowOf(), stop: 'pages', text: 'Accept or reject 6 claims', env });
chk('Pages written: the subject says how many are clean', e1.subject === 'Edens Edge: the pages are written: 34 of 42 clean' && e1.to === 'ray@ll.example', e1.subject);
chk('It greets by first name, lists what waits, and links to the client', e1.text.startsWith('Hi Ray,') && e1.text.includes('Waiting on you now:\n\n- Accept or reject 6 claims\n- Fix 2 blocked pages') && e1.text.endsWith(`Open the client: https://copybot.example/clients/${ID}`), e1.text);
chk('It says Copybot carries on afterwards', e1.text.includes('Copybot carries on by itself once this is done.'));
chk('The towns: ready to approve', NO.stopEmail({ to: 'a@b.co', row: rowOf(), stop: 'locations_approve', env }).subject === 'Edens Edge: the towns are ready to approve');
const eF = NO.stopEmail({ to: 'a@b.co', row: rowOf(), stop: 'failed:research', text: '"Research 2 towns" failed: Perplexity did not answer.', env });
chk('A stopped step: the reason is in the email, and it says to press Try again', eF.subject === 'Edens Edge: automation has stopped' && eF.text.includes('Perplexity did not answer.') && eF.text.includes('press Try again'));
const eD = NO.stopEmail({ to: 'a@b.co', row: rowOf({ tracker: { needs: [] } }), stop: 'finished', env });
chk('Finished with nothing waiting: no list, no "carries on" line', eD.subject === 'Edens Edge: everything Copybot can do by itself is done' && !eD.text.includes('Waiting on you') && !eD.text.includes('carries on'));
chk('Another stop reads its own words', NO.stopEmail({ to: 'a@b.co', row: rowOf(), stop: 'niche', text: 'Confirm the niche', env }).subject === 'Edens Edge: confirm the niche');
chk('More than 8 things: 8 and a count', NO.stopEmail({ to: 'a@b.co', row: rowOf({ tracker: { needs: needs(11) } }), stop: 'pages', env }).text.includes('- Thing 8\n- and 3 more'));
chk('No COPYBOT_URL: it names the client page instead of a link', NO.stopEmail({ to: 'a@b.co', row: rowOf(), stop: 'pages', env: {} }).text.endsWith('Open the client: Copybot, Clients, Edens Edge'));
const dg = NO.digestEmail({ to: 'a@b.co', name: 'Ray', rows: [rowOf({ tracker: { needs: needs(5) } }), rowOf({ id: ID2, name: 'Kestrel Ridge', tracker: { needs: needs(1) } })], env });
chk('The digest: the count in the subject, each client with its first three things and its link, the queue link', dg.subject === 'Copybot: 2 clients waiting on a person' && dg.text.includes('Edens Edge (5 things)\n- Thing 1\n- Thing 2\n- Thing 3\n- and 2 more') && dg.text.includes('Kestrel Ridge (1 thing)') && dg.text.includes(`https://copybot.example/clients/${ID2}`) && dg.text.endsWith('The whole queue: https://copybot.example/dashboard'), dg.text);

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await AU.ensureAutomationTables(pool); await NO.ensureNotifyTables(pool);
  await pool.query(`CREATE TABLE review_settings (client_id UUID PRIMARY KEY, approver_name TEXT, approver_email TEXT)`);
  await pool.query(`INSERT INTO review_settings VALUES ($1, 'Ray Smith', 'ray@ll.example'), ($2, 'Nobody', 'not an address')`, [ID, ID2]);

  // ── Who is told ──
  const sent = [];
  let clock = new Date('2026-11-10T07:00:00Z');
  let rows = [];
  const mk = (e, send = async m => { sent.push(m); }) => NO.createNotifier({ pool, send, loadRows: async () => rows, env: e, now: () => clock });
  const N = mk(env);
  chk('A client with an approver: the email goes to them', await N.stopped({ row: rowOf(), stop: 'pages', text: 'x' }) === true && sent.length === 1 && sent[0].to === 'ray@ll.example' && sent[0].text.startsWith('Hi Ray,'));
  chk('No approver, or an address that is not one, and no fallback: nobody is told', await N.stopped({ row: rowOf({ id: ID2 }), stop: 'pages' }) === false && await N.stopped({ row: rowOf({ id: ID3 }), stop: 'pages' }) === false && sent.length === 1);
  const NF = mk({ ...env, AUTOMATION_NOTIFY_EMAIL: 'ops@ll.example' });
  chk('With AUTOMATION_NOTIFY_EMAIL set, a client with no approver goes there; one with an approver still goes to the approver', await NF.stopped({ row: rowOf({ id: ID3 }), stop: 'pages' }) === true && sent[1].to === 'ops@ll.example' && (await NF.stopped({ row: rowOf(), stop: 'pages' }), sent[2].to === 'ray@ll.example'));
  chk('No Gmail connection: nothing is sent and nothing breaks', await mk(env, null).stopped({ row: rowOf(), stop: 'pages' }) === false && (await mk(env, null).digest()).sent === 0);

  // ── When the chain sends one ──
  const pt = (h = [0, 0], c = [0, 0], s = [0, 0], l = [0, 0]) => ({ homepage: { total: h[0], records: h[1] }, category: { total: c[0], records: c[1] }, service: { total: s[0], records: s[1] }, location: { total: l[0], records: l[1] } });
  let row = { id: ID, name: 'Edens Edge', archived: false, running: false, niche_key: 'landscapers-gardeners', missing_fields: [], locations_run: true, locations_approved: false, locations_changed: false, towns_without_dossier: [], page_types: pt(), pages: { total: 0, written: 0 }, tracker: { next: null, needs: [] } };
  const told = [];
  let answer = () => ({ status: 200, body: {} });
  let mailOk = true;
  const A = AU.createAutomation({ pool, loadRows: async () => [row], call: async (m, p) => answer(m, p), now: () => clock, notify: async x => { if (!mailOk) throw new Error('Gmail is down'); told.push(x.stop); return true; } });
  const tick = async (min = 1) => { clock = new Date(clock.getTime() + min * 60000); return A.tick(); };
  await A.setEnabled(ID, true);
  await tick(); await tick(); await tick();
  chk('Waiting for the towns to be approved: told once, not every minute', told.join() === 'locations_approve', told.join());
  row = { ...row, locations_approved: true, locations_approved_at: '2026-11-10T08:00:00Z', pages: { total: 3, written: 0 }, page_types: pt([1, 0], [2, 0]) };
  await tick(); await tick(); await tick();
  row = { ...row, page_types: pt([1, 1], [2, 0]) };
  await tick();
  row = { ...row, page_types: pt([1, 1], [2, 2]), pages: { total: 3, written: 1 }, tracker: { next: { text: 'Accept or reject 4 claims' }, needs: [] } };
  await tick();
  chk('Three pages written across two runs: one email when they are all written, none per page or per run', told.join() === 'locations_approve,pages', told.join());
  row = { ...row, tracker: { next: { text: 'Accept or reject 1 claim' }, needs: [] } };
  await tick(); await tick();
  chk('The person works through the claims: the wording changes, no new email', told.length === 2, told.join());
  row = { ...row, pages: { total: 3, written: 3 } };
  answer = () => ({ status: 500, body: { error: 'The model did not answer.' } });
  await tick(); await tick();
  chk('A step that fails twice: one email saying it stopped', told[2] === 'failed:gbp' && told.length === 3, told.join());
  await tick(60);
  chk('Stopped stays quiet', told.length === 3);
  await A.retry(ID);
  answer = () => ({ status: 200, body: {} });
  await tick();
  row = { ...row, gbp_done: true, lead_snap_done: true };
  answer = (m, p) => p.endsWith('/gbp-posts/batches') ? { status: 400, body: { error: 'Save and read the Drive photo folder first.' } } : { status: 200, body: {} };
  await tick(); await tick(5);
  chk('A step the app refuses: one email with the app\'s reason, not one every 30 minutes', told[3] === 'blocked:batch' && told.length === 4 && (await tick(31), await tick(31), told.length === 4), told.join());
  answer = () => ({ status: 202, body: {} });
  await tick(31); await tick();
  chk('Everything done: the last email', told[told.length - 1] === 'finished' && told.length === 5, told.join());
  mailOk = false;
  await A.setEnabled(ID, true);
  row = { ...row, locations_changed: true };
  const r = await tick();
  mailOk = true;
  await tick();
  chk('The email failing does not stop the chain, and it is sent on the next tick', r.results['Edens Edge'] === 'person' && told[told.length - 1] === 'locations_approve' && told.length === 6, told.join());

  // ── The morning digest ──
  sent.length = 0;
  rows = [
    { id: ID, name: 'Edens Edge', archived: false, automation: { enabled: true }, tracker: { needs: needs(2) } },
    { id: ID3, name: 'No Approver Ltd', archived: false, automation: { enabled: true }, tracker: { needs: needs(1) } },
    { id: crypto.randomUUID(), name: 'Switched Off', archived: false, automation: { enabled: false }, tracker: { needs: needs(4) } },
    { id: crypto.randomUUID(), name: 'All Clear', archived: false, automation: { enabled: true }, tracker: { needs: [] } },
  ];
  clock = new Date('2026-11-11T07:30:00Z');
  chk('Before 8am UK: no digest', (await NF.digest()).sent === 0 && sent.length === 0);
  clock = new Date('2026-11-11T08:05:00Z');
  const d1 = await NF.digest();
  chk('At 8am: one email per address, each with its own clients; switched off and clear clients are left out', d1.sent === 2 && d1.clients === 2 && sent.find(m => m.to === 'ray@ll.example').text.includes('Edens Edge (2 things)') && sent.find(m => m.to === 'ops@ll.example').text.includes('No Approver Ltd') && !sent.some(m => /Switched Off|All Clear/.test(m.text)), JSON.stringify(d1));
  chk('Not twice in a day, even after a restart', (await NF.digest()).sent === 0 && (await mk({ ...env, AUTOMATION_NOTIFY_EMAIL: 'ops@ll.example' }).digest()).why === 'already sent today' && sent.length === 2);
  clock = new Date('2026-11-12T09:00:00Z');
  chk('The next morning it goes again', (await NF.digest()).sent === 2);
  clock = new Date('2026-06-15T07:30:00Z');
  chk('In summer 8am UK is 7am UTC', (await NF.digest()).sent === 2);
  rows = [];
  clock = new Date('2026-06-16T09:00:00Z');
  chk('Nothing waiting: no digest email', (await NF.digest()).sent === 0);
  chk('Every email in this run went to an operator address, none to a client', sent.every(m => /@ll\.example$/.test(m.to)));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
