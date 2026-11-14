'use strict';
// Fixture: the task board, stage 1 (team/): who does each Tracker step, the SOP it is done
// from, every open task per person across the clients, and the People list on pg-mem.
// The steps themselves are the Tracker's (ui-tracker.js covers those rules).
const path = require('path');
const fs = require('fs');
const { newDb } = require('pg-mem');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'team/rules.js'));
const S = require(path.join(root, 'team/service.js'));
const OWNERS = require(path.join(root, 'team/owners.json'));
const SOPS = require(path.join(root, 'team/sops.json'));
const { trackerOf } = require(path.join(root, 'ui/tracker.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '') => { if (ok) { console.log('✓ ' + label); pass++; } else { console.log('✗ ' + label + (got !== '' ? '\n  got: ' + got : '')); fail++; } };
console.log('\n=== FIXTURE: the task board (owners, SOPs, tasks per person, the People list) ===\n');

(async () => {
  // ── Owners: Brandon's split of 14 Nov ──
  const own = (key, tab) => R.ownerOf({ key, tab });
  chk('Ray (operations) has the record, locations, research, the page map, page writing, GBP, posts, reviews, rankings and the site audit',
    [['fields', 'record'], ['locations_approve', 'locations'], ['research', 'research'], ['page_map', 'page-map'], ['write', 'pages'], ['claims', 'pages'], ['gbp', 'gbp'], ['batch', 'gbp-posts'], ['reviews', 'reviews'], ['rank', 'rankings'], ['audit', 'site-audit'], ['pack', 'trade-facts'], ['niche', 'clients']].every(([k, t]) => own(k, t) === 'ops'));
  chk('The citations person has every citations step', ['citations_scan', 'citations_submit', 'citations_wait'].every(k => own(k, 'citations') === 'citations'));
  chk('Given has the push, images and the cards', own('push', 'pages') === 'site' && own('anything', 'images') === 'site' && own('anything', 'cards') === 'site');
  chk('An ask sent with Tell Brandon is Brandon\'s', own('ask', '') === 'brandon');
  chk('A step the automation chain stopped at goes to whoever does that tab', own('auto_citations', 'citations') === 'citations' && own('auto_category', 'pages') === 'ops');
  chk('The GHL onboarding steps are operations, the domain step Given\'s', own('onb_gbp', 'record') === 'ops' && own('onb_facebook', 'record') === 'ops' && own('onb_domain', 'record') === 'site');
  chk('A step on a tab nobody was given falls to the default', own('new_step', 'a-new-tab') === OWNERS.default);
  chk('Every owner in the file is a real role', [...Object.values(OWNERS.by_tab), ...Object.values(OWNERS.by_step), ...Object.values(OWNERS.by_prefix), OWNERS.default, ...OWNERS.seed_people.map(p => p.role)].every(r => R.ROLES.includes(r)));

  // The files name real Tracker steps and cover every tab a step is done on
  const src = fs.readFileSync(path.join(root, 'ui/tracker.js'), 'utf8');
  const real = k => k === 'ask' || /^onb_(domain|gbp|facebook|instagram)$/.test(k) || /^auto_/.test(k) || src.includes(`need('${k}'`);
  const stale = R.namedSteps().filter(k => !real(k));
  chk('Every step named in owners.json and sops.json is a step the Tracker has', stale.length === 0, stale.join(', '));
  const tabs = [...new Set([...src.matchAll(/need\('[a-z_]+'.*?[`'], '([a-z-]+)'(?:,|\);)/g)].map(m => m[1]))];
  const unowned = tabs.filter(t => !OWNERS.by_tab[t]);
  chk(`Every tab a Tracker step is done on has an owner (${tabs.length} tabs)`, tabs.length >= 10 && unowned.length === 0, unowned.join(', '));

  // ── SOPs ──
  const sub = R.sopOf({ key: 'citations_submit', tab: 'citations' });
  chk('Submitting citations links to Phase X.5 of the Re-Launch SOP', sub && sub.title === 'Re-Launch 2026 SOP' && /X\.5/.test(sub.section) && sub.url.startsWith('https://docs.google.com/document/d/'), JSON.stringify(sub));
  chk('A citations step with no line of its own takes the tab\'s SOP', /X\.3/.test(R.sopOf({ key: 'auto_x', tab: 'citations' }).section));
  chk('A heading with an id is linked to directly', R.sopOf({ key: 'x', tab: 'cards' }).url.endsWith('#heading=h.4fzlmj6ceyjb'));
  chk('Images link to the website images SOP', R.sopOf({ key: 'x', tab: 'images' }).title === 'Phase X.8 Website Images SOP');
  chk('A step with no SOP yet has none', R.sopOf({ key: 'claims', tab: 'pages' }) === null);
  chk('Every SOP line points at a document in the file', [...Object.values(SOPS.by_step), ...Object.values(SOPS.by_tab)].every(s => SOPS.docs[s.doc]));

  // ── The Tracker carries the owner and the SOP on each step ──
  const t = trackerOf({ niche_known: true, from_form: true, reviewed: true, form_at: 'x', missing: [], place_id: true, locations_run: true, locations_approved: true, map_pages: 3,
    pages: { total: 3, written: 3, records: 3, claims: 2, blocked: 0, failed: 0, approved: 3 }, homepage_good: true, pushed: 0, gbp_done: true, prompts_done: true,
    citations: { rows: 40, scanned: 40, listed: 12, to_submit: 20, waiting: 3 }, has_scans: true, existing_site: false, connection: { status: 'connected', publishing_on: true } });
  const need = k => t.needs.find(n => n.key === k);
  chk('Tracker: every step for a person has an owner', t.needs.length > 0 && t.needs.every(n => R.ROLES.includes(n.owner)), t.needs.map(n => `${n.key}:${n.owner}`).join(','));
  chk('Tracker: the claims are operations, the push Given\'s, the submissions the citations person\'s', need('claims').owner === 'ops' && need('push').owner === 'site' && need('citations_submit').owner === 'citations');
  chk('Tracker: the citations step carries its SOP, the claims step none', !!need('citations_submit').sop && !need('claims').sop);

  // ── Tasks per person across the clients ──
  const rows = [
    { id: 'c1', name: 'Edens Edge', stage: 'Pages', last_activity: '2026-11-10T09:00:00Z', tracker: t, brandon: [{ id: 7, reason: 'Paid sites list for the client', note: 'Checkatrade and TrustMark', by: 'Ray', at: '2026-11-12T10:00:00Z' }] },
    { id: 'c2', name: 'Kestrel Ridge', stage: 'Onboarding', last_activity: '2026-11-02T09:00:00Z', tracker: trackerOf({ niche_known: false, from_form: true, form_at: 'x', missing: [] }), brandon: [] },
    { id: 'c3', name: 'Gone Away', stage: 'Pages', last_activity: '2026-10-01T09:00:00Z', archived: true, tracker: t, brandon: [] },
    { id: 'c4', name: 'All Done', stage: 'Live', last_activity: '2026-11-01T09:00:00Z', tracker: { needs: [], later: 0 }, brandon: [] },
  ];
  const all = R.tasksOf(rows);
  chk('Tasks: an archived client and a client with nothing open are left out', all.map(b => b.client).join(',') === 'Kestrel Ridge,Edens Edge', all.map(b => b.client).join(','));
  chk('Tasks: the longest quiet client is first', all[0].client_id === 'c2');
  const count = R.counts(all);
  chk('Tasks: the counts per role add up to every open step', Object.values(count).reduce((a, b) => a + b, 0) === all.reduce((n, b) => n + b.steps.length, 0) && count.citations === 2 && count.site === 1 && count.brandon === 1, JSON.stringify(count));
  const cit = R.tasksOf(rows, { role: 'citations' });
  chk('Tasks: the citations person sees only the citations steps, on the one client that has them', cit.length === 1 && cit[0].steps.map(s => s.key).join(',') === 'citations_submit,citations_wait', JSON.stringify(cit.map(b => b.steps.map(s => s.key))));
  const br = R.tasksOf(rows, { role: 'brandon' });
  chk('Tasks: Brandon sees the ask sent with Tell Brandon, with who asked and when', br.length === 1 && br[0].steps[0].key === 'ask' && br[0].steps[0].ask_id === 7 && /Paid sites list for the client: Checkatrade/.test(br[0].steps[0].text) && /Asked by Ray on 2026-11-12/.test(br[0].steps[0].why), JSON.stringify(br));
  chk('Tasks: Given sees the push', R.tasksOf(rows, { role: 'site' })[0].steps.map(s => s.key).join(',') === 'push');
  chk('Tasks: a client waiting only on the niche is operations\' alone', R.tasksOf(rows, { role: 'ops' })[0].client === 'Kestrel Ridge' && R.tasksOf(rows, { role: 'ops' })[0].steps[0].key === 'niche');

  // ── The People list on pg-mem ──
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await S.ensureTeamTables(pool);
  await S.seedPeople(pool);   // a second start: pg-mem cannot run CREATE TABLE IF NOT EXISTS twice, real Postgres can
  const team = S.createTeam({ pool });
  let v = await team.view();
  chk('People: the four Brandon named are there once, however often the server starts', v.people.map(p => `${p.name}:${p.role}`).join(',') === 'Brandon:brandon,Ray:ops,Given:site,Citations team:citations', v.people.map(p => `${p.name}:${p.role}`).join(','));
  chk('People: the roles come with their labels', v.roles.ops === 'Operations' && v.roles.site === 'Site and images');
  const cit1 = v.people.find(p => p.role === 'citations');
  let list = await team.update(cit1.id, { name: 'Sam' });
  chk('People: the citations person can be renamed and keeps the job', list.find(p => p.id === cit1.id).name === 'Sam' && list.find(p => p.id === cit1.id).role === 'citations');
  list = await team.add({ name: 'Alex', role: 'citations', email: 'alex@example.com' });
  chk('People: a second citations person can be added', list.filter(p => p.role === 'citations').length === 2 && list.find(p => p.name === 'Alex').email === 'alex@example.com');
  const refused = async fn => { try { await fn(); return ''; } catch (e) { return `${e.status}: ${e.message}`; } };
  chk('People: the same name twice is refused', /^409/.test(await refused(() => team.add({ name: 'ray', role: 'ops' }))));
  chk('People: a role that is not a job is refused', /^400/.test(await refused(() => team.add({ name: 'Jo', role: 'boss' }))));
  chk('People: no name is refused', /^400/.test(await refused(() => team.add({ name: ' ', role: 'ops' }))));
  chk('People: a bad email is refused', /^400/.test(await refused(() => team.update(cit1.id, { email: 'not an email' }))));
  chk('People: nobody there is a 404', /^404/.test(await refused(() => team.update(9999, { name: 'X' }))));
  list = await team.update(cit1.id, { active: false });
  chk('People: a person who leaves is made inactive, never deleted, and sorts last', list.length === 5 && list[list.length - 1].id === cit1.id && list[list.length - 1].active === false);
  await S.seedPeople(pool);
  chk('People: a restart does not seed again once the list has been changed', (await team.list()).length === 5);

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
