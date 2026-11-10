'use strict';
// Fixture: the automation chain (automation/runner.js) on pg-mem with a fake app. The order
// of the steps, every stop for a person, the locations cost cap, a refusal that is tried
// again later, one retry then stopped, Try again, the switch, and that nothing is ever
// approved, pushed, published or scanned. No real call is made.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const AU = require(path.join(root, 'automation/runner.js'));
const { trackerOf } = require(path.join(root, 'ui/tracker.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the automation chain (order, stops, cap, retries, the switch) ===\n');

const ID = crypto.randomUUID();
const pt = (h = [0, 0], c = [0, 0], s = [0, 0], l = [0, 0]) => ({ homepage: { total: h[0], records: h[1] }, category: { total: c[0], records: c[1] }, service: { total: s[0], records: s[1] }, location: { total: l[0], records: l[1] } });
const base = () => ({ id: ID, name: 'Edens Edge', archived: false, running: false, niche_key: 'landscapers-gardeners', missing_fields: [], locations_run: false, locations_approved: false, locations_changed: false, locations_approved_at: null,
  towns_without_dossier: [], page_types: pt(), pages: { total: 0, written: 0 }, pack_unverified: false, gbp_done: false, lead_snap_done: false, tracker: { next: null } });

// ── nextStep, pure ──
const N = (over, once) => AU.nextStep({ ...base(), ...over }, once);
chk('No niche: a person confirms it', N({ niche_key: 'other' }).person === 'Confirm the niche');
chk('Missing fields: a person fills the record, named', N({ missing_fields: [{ text: 'no phone' }] }).person === 'Fill in the record: no phone');
chk('A form with needed answers missing: nothing starts, a person chases the client', N({ form_needed: 3 }).person === 'Chase the client: the form is missing 3 needed answers');
const loc = N({});
chk('Record ready: the locations run, confirmed, with the cost check first', loc.step === 'locations' && loc.path === `/api/clients/${ID}/locations/run` && loc.body.confirm === true && loc.precheck === 'locations', JSON.stringify(loc));
chk('Locations run, not approved: a person approves', /approve the locations list/.test(N({ locations_run: true }).person));
chk('A newer run than the approval: a person approves again', N({ locations_run: true, locations_approved: true, locations_changed: true }).person === 'Approve the locations list again');
const ok = { locations_run: true, locations_approved: true, locations_approved_at: '2026-11-10T10:00:00Z' };
chk('Approved and no page map rows: build the page map', N(ok).step === 'page_map');
const mapped = { ...ok, pages: { total: 6, written: 0 }, page_types: pt([1, 0], [2, 0], [2, 0], [1, 0]) };
const r1 = N({ ...mapped, towns_without_dossier: ['Romsey', 'Totton'] });
chk('Towns with no dossier: research those towns only', r1.step === 'research' && r1.body.towns.join() === 'Romsey,Totton' && r1.label === 'Research 2 towns', JSON.stringify(r1));
chk('Then the FAQ research, then the H1 research, each once per approval', N(mapped).step === 'faq' && N(mapped, k => k === 'faq').step === 'h1');
const all = () => true;
chk('Then the homepage', N(mapped, all).step === 'homepage' && N(mapped, all).path.endsWith('/v20/homepage/generate'));
chk('Then the category pages, resumed', N({ ...mapped, page_types: pt([1, 1], [2, 0], [2, 0], [1, 0]) }, all).step === 'category' && N({ ...mapped, page_types: pt([1, 1], [2, 0], [2, 0], [1, 0]) }, all).body.resume === true);
chk('Service pages with the pack unverified: a person verifies it', N({ ...mapped, pack_unverified: true, page_types: pt([1, 1], [2, 2], [2, 0], [1, 0]) }, all).person === 'Verify the trade facts pack');
chk('Service pages with the pack verified, then the location pages', N({ ...mapped, page_types: pt([1, 1], [2, 2], [2, 1], [1, 0]) }, all).label === 'Write 1 service page' && N({ ...mapped, page_types: pt([1, 1], [2, 2], [2, 2], [1, 0]) }, all).step === 'location');
const written = { ...mapped, page_types: pt([1, 1], [2, 2], [2, 2], [1, 1]) };
chk('Every page has a record but some are not clean: a person, with the tracker\'s next step', N({ ...written, pages: { total: 6, written: 4 }, tracker: { next: { text: 'Accept or reject 3 claims' } } }, all).person === 'Accept or reject 3 claims');
const clean = { ...written, pages: { total: 6, written: 6 } };
chk('Every page clean: the GBP output, then the prompts, then the first batch of 13, then finished', N(clean, all).step === 'gbp' && N({ ...clean, gbp_done: true }, all).step === 'prompts' && N({ ...clean, gbp_done: true, lead_snap_done: true }, k => k !== 'batch').body.size === 13 && N({ ...clean, gbp_done: true, lead_snap_done: true }, all).finished === true);
const everyPath = [N({}), N(ok), r1, N(mapped), N(mapped, k => k === 'faq'), N(mapped, all), N(clean, all), N({ ...clean, gbp_done: true }, all), N({ ...clean, gbp_done: true, lead_snap_done: true }, k => k !== 'batch')].map(s => s.path);
chk('No step is an approval, a push, a publish or a rank scan', !everyPath.some(p => /approve|push|publish|scan|rank|verify/.test(p)), everyPath.join(' '));

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await AU.ensureAutomationTables(pool);

  let row = base(), clock = new Date('2026-11-10T09:00:00Z');
  const calls = [];
  let answer = () => ({ status: 200, body: {} });
  const call = async (method, p, body) => { calls.push({ method, p, body }); return answer(method, p, body); };
  const A = AU.createAutomation({ pool, loadRows: async () => [row], call, now: () => clock, capUsd: 2 });
  const tick = async (min = 1) => { clock = new Date(clock.getTime() + min * 60000); return A.tick(); };
  const steps = async () => (await A.view(ID)).steps;

  // The switch
  await tick();
  chk('Off by default: a tick calls nothing', calls.length === 0);
  await A.setEnabled(ID, true, 'Brandon');
  chk('Switched on: recorded with who', (await A.view(ID)).enabled === true && (await A.view(ID)).enabled_by === 'Brandon');

  // The cost cap
  answer = (m, p) => p.endsWith('/dry-run') ? { status: 200, body: { estimate: { total_usd: 3.4 } } } : { status: 200, body: {} };
  await tick();
  let s = await steps();
  chk('Over the cap: the run is not started, and the reason names both figures', calls.length === 1 && calls[0].method === 'GET' && s[0].status === 'blocked' && /\$3\.40, over the \$2\.00 limit/.test(s[0].error), JSON.stringify(s[0]));
  chk('The refusal shows on the tracker as a person\'s step', trackerOf({ niche_known: true, missing: [], automation: { enabled: true, steps: s } }).needs[0].key === 'auto_locations');
  await tick(5);
  chk('A refused step is left alone for 30 minutes', calls.length === 1, calls.length);
  answer = (m, p) => p.endsWith('/dry-run') ? { status: 200, body: { estimate: { total_usd: 0.42 } } } : { status: 200, body: {} };
  await tick(30);
  s = await steps();
  chk('After 30 minutes it tries again: under the cap, the run starts with confirm and the estimate is kept', calls.length === 3 && calls[2].method === 'POST' && calls[2].body.confirm === true && s[0].status === 'started' && s[0].detail === 'estimated $0.42', JSON.stringify(s[0]));

  // A person's stop, then on
  row = { ...row, locations_run: true };
  await tick();
  s = await steps();
  chk('The run is saved: the step is done and the chain waits for the approval, calling nothing', s[0].status === 'done' && calls.length === 3 && /approve the locations list/.test((await A.view(ID)).waiting), (await A.view(ID)).waiting);
  const t = trackerOf({ niche_known: true, missing: [], locations_run: true, automation: { enabled: true, waiting: 'x', steps: s } });
  chk('The tracker marks the locations line automatic, with the estimate', t.done.find(d => d.key === 'locations').auto === true && t.done.find(d => d.key === 'locations').detail === 'estimated $0.42');

  row = { ...row, ...mapped, towns_without_dossier: ['Romsey'] };
  await tick();
  chk('Approved with a town to research: the research starts for that town', calls[3].p.endsWith('/research/run') && calls[3].body.towns.join() === 'Romsey');
  row = { ...row, running: true };
  await tick(); await tick();
  chk('While it runs nothing else is started', calls.length === 4, calls.length);

  // A step that runs and does not get there: once more, then stopped
  row = { ...row, running: false };
  await tick();
  chk('The research finished and Romsey still has no dossier: one more try', calls.length === 5 && calls[4].p.endsWith('/research/run') && (await steps())[0].attempts === 2);
  await tick();
  s = await steps();
  chk('Still not there after two: stopped, nothing called, the reason in words', calls.length === 5 && s[0].status === 'failed' && /ran 2 times and did not finish/.test(s[0].error) && /Stopped at/.test((await A.view(ID)).waiting), JSON.stringify(s[0]));
  await tick(120);
  chk('Stopped stays stopped', calls.length === 5);
  await A.retry(ID);
  await tick();
  chk('Try again starts it fresh', calls.length === 6 && (await steps())[0].attempts === 1 && (await steps())[0].status === 'started');

  // One off steps, a server error, a busy answer
  row = { ...row, towns_without_dossier: [] };
  await tick();
  chk('Research done: the FAQ research', calls[6].p.endsWith('/faq/research'));
  answer = () => ({ status: 500, body: { error: 'DataForSEO did not answer.' } });
  await tick();
  s = await steps();
  chk('FAQ is not asked for twice; the H1 research fails once and is kept for another try', calls[7].p.endsWith('/h1-research') && s[0].status === 'error' && s[1].step === 'faq' && s[1].status === 'done', JSON.stringify(s.slice(0, 2).map(x => x.step + ':' + x.status)));
  await tick();
  s = await steps();
  chk('A second server error stops the chain with the app\'s own message', calls.length === 9 && s[0].status === 'failed' && s[0].error === 'DataForSEO did not answer.' && s[0].attempts === 2, JSON.stringify(s[0]));
  await A.retry(ID);
  answer = () => ({ status: 409, body: { error: 'A job is already running for this client.' } });
  await tick();
  chk('Already running: looked at again in 2 minutes, and not shown as a person\'s step', (await steps())[0].status === 'blocked' && !trackerOf({ niche_known: true, missing: [], automation: { enabled: true, steps: await steps() } }).needs.some(n => n.key.startsWith('auto_')));
  answer = () => ({ status: 200, body: {} });
  await tick(1); const before = calls.length; await tick(2);
  chk('After 2 minutes the H1 research starts', calls.length === before + 1 && calls[calls.length - 1].p.endsWith('/h1-research'));

  // Through the pages to the end
  const run = async over => { row = { ...row, ...over }; await tick(); return calls[calls.length - 1].p.split('/').slice(4).join('/'); };
  const seq = [];
  seq.push(await run({}));
  seq.push(await run({ page_types: pt([1, 1], [2, 0], [2, 0], [1, 0]) }));
  seq.push(await run({ page_types: pt([1, 1], [2, 2], [2, 0], [1, 0]) }));
  seq.push(await run({ page_types: pt([1, 1], [2, 2], [2, 2], [1, 0]) }));
  chk('Homepage, category, service, location, in that order', seq.join(' ') === 'v20/homepage/generate category-pages/run service-pages/run location-pages/run', seq.join(' '));
  const n = calls.length;
  row = { ...row, page_types: pt([1, 1], [2, 2], [2, 2], [1, 1]), pages: { total: 6, written: 5 }, tracker: { next: { text: 'Fix 1 blocked page' } } };
  await tick();
  chk('A blocked page: the chain waits for a person and writes nothing again', calls.length === n && (await A.view(ID)).waiting === 'Fix 1 blocked page');
  const tail = [];
  tail.push(await run({ pages: { total: 6, written: 6 } }));
  tail.push(await run({ gbp_done: true }));
  answer = (m, p) => p.endsWith('/gbp-posts/batches') ? { status: 400, body: { error: 'Save and read the Drive photo folder (Photos, on the GBP Posts & Photos tab) first.' } } : { status: 200, body: {} };
  tail.push(await run({ lead_snap_done: true }));
  chk('GBP output, the prompts, the first batch', tail.join(' ') === 'gbp/generate lead-snap/generate gbp-posts/batches', tail.join(' '));
  s = await steps();
  chk('The batch refused for the Drive folder: waiting on a person, in the app\'s words', s[0].status === 'blocked' && /Drive photo folder/.test((await A.view(ID)).waiting));
  answer = () => ({ status: 202, body: {} });
  await tick(31); await tick();
  chk('Once the folder is there the batch is written and the chain is finished', (await steps())[0].status === 'done' && /done/.test((await A.view(ID)).waiting), (await A.view(ID)).waiting);
  const m = calls.length; await tick(60);
  chk('Finished: nothing more is called', calls.length === m);
  chk('No call in the whole run was an approval, a push, a publish or a scan', !calls.some(c => /approve|push|publish|scan|rank|verify/.test(c.p)));

  // Off, and archived
  await A.setEnabled(ID, false);
  row = base(); await tick();
  chk('Switched off: a client that needs a step gets none', calls.length === m);
  await A.setEnabled(ID, true); row = { ...base(), archived: true }; await tick();
  chk('An archived client is skipped', calls.length === m);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
