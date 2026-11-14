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

  // ── Stage 2: the steps done by hand ──
  const HAND = require(path.join(root, 'team/hand-steps.json'));
  chk('By hand: every step has a real role, a tab with an owner, and gates the Tracker knows or another step',
    HAND.steps.every(s => R.ROLES.includes(s.role) && OWNERS.by_tab[s.tab] && s.text && (s.after || []).every(g => (g.startsWith('hand:') ? HAND.steps.some(x => x.key === g.slice(5)) : HAND.gates.includes(g)))));
  chk('By hand: no key twice', new Set(HAND.steps.map(s => s.key)).size === HAND.steps.length);
  const hk = x => x.map(n => n.hand).join(',');
  let hs = R.handStepsOf({}, {});
  chk('By hand: nothing is offered before the record is ready', hs.needs.length === 0 && hs.later === HAND.steps.length, hk(hs.needs));
  hs = R.handStepsOf({ record: true, place_id: true, page_map: true, site: true }, {});
  chk('By hand: the record and the listing open the photos and the vault, the connected site the templates', hk(hs.needs) === 'photos_drive,citations_vault,site_templates', hk(hs.needs));
  chk('By hand: each goes to its own person', hs.needs.map(n => n.owner).join(',') === 'brandon,citations,site');
  chk('By hand: the photo step carries the photo sort SOP, the templates none', /Photo Sort/.test(hs.needs[0].sop.section) && hs.needs[2].sop === null);
  chk('By hand: the templates wait for the site to be connected', !hk(R.handStepsOf({ record: true, page_map: true }, {}).needs).includes('site_templates'));
  hs = R.handStepsOf({ record: true, site: true }, { photos_drive: { by: 'Brandon', at: '2026-11-14T10:00:00Z' }, site_templates: { by: 'Given', at: 'x' } });
  chk('By hand: a ticked step opens the one after it (the photo sort) and moves to done', hk(hs.needs) === 'photo_sort' && hs.done.map(d => d.text).join('|') === "Put the client's photos in their Drive folder: ticked done by Brandon|Build the Elementor templates and bind them to the fields: ticked done by Given", hk(hs.needs) + ' / ' + hs.done.map(d => d.text).join('|'));
  hs = R.handStepsOf({ record: true, site: true, pushed: true }, { site_templates: {}, site_check: {}, go_no_go: {} });
  chk('By hand: the launch waits for the check, then go or no go', hk(hs.needs).includes('site_launch') && !hk(R.handStepsOf({ record: true, site: true, pushed: true }, { site_templates: {}, site_check: {} }).needs).includes('site_launch'));
  chk('By hand: what Copybot can see for itself is no longer a tick (the site connection, the cards)', !HAND.steps.some(s => ['site_staging', 'cards_make', 'cards_order'].includes(s.key)));

  // On the Tracker: only for a client loaded with them, after Copybot's own steps
  const base = { niche_known: true, from_form: true, reviewed: true, form_at: 'x', missing: [], place_id: true, locations_run: true, locations_approved: true, map_pages: 3, now: '2026-11-14T12:00:00Z' };
  chk('Tracker: a client loaded without the task board has no by hand steps', !trackerOf(base).needs.some(n => n.hand));
  const th = trackerOf({ ...base, hand: { ticks: {} }, tasks: [{ id: 4, text: 'Ring Ethan about the price list', role: 'ops', person_id: 2, person: 'Ray', due: '2026-11-10', by: 'Brandon', at: '2026-11-09T09:00:00Z' }, { id: 5, text: 'Ask for the logo', role: 'site', due: '2026-11-20' }] });
  chk('Tracker: the by hand steps follow Copybot\'s own, each with its owner', th.needs.filter(n => n.hand).map(n => `${n.hand}:${n.owner}`).join(',') === 'photos_drive:brandon,citations_vault:citations' && th.needs.findIndex(n => n.hand) > 0 && !th.needs.slice(th.needs.findIndex(n => n.hand)).some(n => !n.hand && !n.task), th.needs.map(n => n.key).join(','));
  const t4 = th.needs.find(n => n.task === 4), t5 = th.needs.find(n => n.task === 5);
  chk('Tracker: a one off task is its person\'s, says who added it, and is marked once overdue', t4 && t4.owner === 'ops' && t4.person_id === 2 && t4.urgent === true && t4.why === 'Added by Brandon on 2026-11-09, for Ray. Was due 2026-11-10.', t4 && t4.why);
  chk('Tracker: a task not yet due is not urgent', t5 && !t5.urgent && / Due 2026-11-20\.$/.test(t5.why), t5 && t5.why);
  chk('Tracker: a ticked by hand step is listed as done', trackerOf({ ...base, hand: { ticks: { photos_drive: { by: 'Brandon', at: 'x' } } } }).done.some(d => d.key === 'hand_photos_drive_done'));
  const rows2 = [{ id: 'c1', name: 'Edens Edge', stage: 'Pages', last_activity: 'x', tracker: th, brandon: [] }];
  chk('Tasks: a task given to Ray is Ray\'s, not another operations person\'s', R.tasksOf(rows2, { role: 'ops', personId: 2 })[0].steps.some(s => s.task === 4) && !(R.tasksOf(rows2, { role: 'ops', personId: 9 })[0] || { steps: [] }).steps.some(s => s.task === 4));
  chk('Tasks: the by hand step keeps its key so the screen can tick it', R.tasksOf(rows2, { role: 'brandon' })[0].steps[0].hand === 'photos_drive');

  // ── Stage 3: the site build, the migration's last steps and the cards, from what Copybot already knows ──
  const nk = t => t.needs.map(n => n.key).join(',');
  const built = { ...base, map_pages: 6, pages: { total: 6, written: 6, records: 6, claims: 0, blocked: 0, failed: 0, approved: 6 }, gbp_done: true, prompts_done: true, has_scans: true, existing_site: false, connection: { status: 'connected', publishing_on: true }, citations: { scanned: 1, listed: 1, to_submit: 0, waiting: 0 } };
  const sb0 = { connected: false, inner_total: 5, created: 0, pushed: 0, to_push: 6, images_approved: 0, images_placed: 0, legal_pushed: 0 };
  chk('Site build: a client loaded without these facts keeps the one push line', trackerOf({ ...built, homepage_good: true }).needs.some(n => n.key === 'push' && n.text === 'Push the homepage to WordPress'));
  let s3 = trackerOf({ ...built, site_build: sb0 });
  chk('Site build: no site yet, so connecting it is the one step, and it is Given\'s', nk(s3) === 'site_connect' && s3.needs[0].owner === 'site', nk(s3));
  s3 = trackerOf({ ...built, site_build: { ...sb0, connected: true } });
  chk('Site build: connected, the pages to create, the copy to push and the legal pages open', nk(s3) === 'site_pages,push,legal' && s3.needs[0].text === 'Create 5 pages on the staging site' && s3.needs[1].text === 'Push the copy of 6 approved pages to the staging site', nk(s3) + ' / ' + s3.needs.map(n => n.text).join('|'));
  chk('Site build: creating, pushing and the legal pages are all Given\'s', s3.needs.every(n => n.owner === 'site'), s3.needs.map(n => n.owner).join(','));
  chk('Site build: the images wait for some copy to be on the site', !s3.needs.some(n => n.key === 'images_approve'));
  s3 = trackerOf({ ...built, site_build: { connected: true, inner_total: 5, created: 5, pushed: 4, to_push: 2, images_approved: 3, images_placed: 1, legal_pushed: 3 } });
  chk('Site build: part way, the copy left to push and the images left to approve and place are counted', nk(s3) === 'push,images_approve,images_place' && s3.needs.map(n => n.text).join('|') === 'Push the copy of 2 approved pages to the staging site|Pick and approve the images for 3 pages|Place the images of 2 approved pages on the staging site', s3.needs.map(n => n.text).join('|'));
  chk('Site build: the images are Given\'s and carry the images SOP', s3.needs[1].owner === 'site' && s3.needs[1].sop.title === 'Phase X.8 Website Images SOP');
  chk('Site build: what is finished is listed as done', ['site_connect', 'site_pages', 'pushed', 'images', 'images_placed', 'legal'].every(k => s3.done.some(d => d.key === k)), s3.done.map(d => d.key).join(','));
  chk('Site build: more pages made than the map holds never reads as over', trackerOf({ ...built, site_build: { ...sb0, connected: true, created: 9 } }).done.find(d => d.key === 'site_pages').text === '5 of 5 pages made on the staging site');
  s3 = trackerOf({ ...built, site_build: { connected: true, inner_total: 5, created: 5, pushed: 6, to_push: 0, images_approved: 6, images_placed: 6, legal_pushed: 3 } });
  chk('Site build: everything made, pushed and placed leaves nothing for a person', nk(s3) === '', nk(s3));
  chk('Site build: the connected site opens the Elementor templates as a by hand step', trackerOf({ ...built, hand: { ticks: {} }, site_build: { ...sb0, connected: true } }).needs.some(n => n.hand === 'site_templates'));

  const old = { ...built, existing_site: true, site_audit: 'ok', site_build: { connected: true, inner_total: 5, created: 5, pushed: 6, to_push: 0, images_approved: 6, images_placed: 6, legal_pushed: 3 } };
  s3 = trackerOf({ ...old, migration: { redirects_pushed: false, pre_launch: 'none', launched_at: null, day7_at: null } });
  chk('Migration: the decisions approved, the redirects are next and the pre launch check waits for them', nk(s3) === 'redirects' && s3.needs[0].owner === 'ops' && s3.later >= 1, nk(s3));
  s3 = trackerOf({ ...old, migration: { redirects_pushed: true, pre_launch: 'block', launched_at: null, day7_at: null } });
  chk('Migration: a blocked pre launch check says to fix and run it again', nk(s3) === 'pre_launch' && /^Fix what the pre launch check blocked/.test(s3.needs[0].text), s3.needs.map(n => n.text).join('|'));
  s3 = trackerOf({ ...old, migration: { redirects_pushed: true, pre_launch: 'ok', launched_at: '2026-11-20T09:00:00Z', day7_at: '2026-11-27T09:00:00Z' } });
  chk('Migration: passed and launched, nothing for a person, and the launch and day 7 check are listed', nk(s3) === '' && ['redirects', 'pre_launch', 'launched', 'day7'].every(k => s3.done.some(d => d.key === k)), nk(s3));
  chk('Migration: a new build has no redirect steps', !trackerOf({ ...built, migration: { redirects_pushed: false, pre_launch: 'none' } }).needs.some(n => ['redirects', 'pre_launch'].includes(n.key)));
  chk('Migration: nothing before the URL decisions are approved', !trackerOf({ ...old, site_audit: 'wait', migration: { redirects_pushed: false, pre_launch: 'none' } }).needs.some(n => n.key === 'redirects'));

  const done6 = { connected: true, inner_total: 5, created: 5, pushed: 6, to_push: 0, images_approved: 6, images_placed: 6, legal_pushed: 3 };
  const cardsOf = c => trackerOf({ ...built, site_build: done6, cards: c });
  s3 = cardsOf({ copied_at: null, signoff: {} });
  chk('Cards: nothing copied yet, so the brief is the step, Given\'s, with its SOP, and the four after it wait', nk(s3) === 'cards_brief' && s3.needs[0].owner === 'site' && /X\.9/.test(s3.needs[0].sop.section) && s3.later === 4, `${nk(s3)} later ${s3.later}`);
  chk('Cards: no card steps before the Google listing is confirmed', !trackerOf({ ...built, place_id: false, site_build: done6, cards: { copied_at: null, signoff: {} } }).needs.some(n => /^cards_/.test(n.key)));
  s3 = cardsOf({ copied_at: '2026-11-14T10:00:00Z', signoff: {} });
  chk('Cards: the brief copied, checking the proofs is next', nk(s3) === 'cards_proofs' && s3.done.some(d => d.key === 'cards_brief_done'), nk(s3));
  s3 = cardsOf({ copied_at: 'x', signoff: { proofs_sent: { at: 'x', by: 'Given' } } });
  chk('Cards: proofs sent, the client\'s approval is Brandon\'s', nk(s3) === 'cards_approval' && s3.needs[0].owner === 'brandon', nk(s3));
  s3 = cardsOf({ copied_at: 'x', signoff: { proofs_sent: { at: 'x' }, client_approved: { at: 'x' } } });
  chk('Cards: approved, the print files are Given\'s', nk(s3) === 'cards_export' && s3.needs[0].owner === 'site', nk(s3));
  s3 = cardsOf({ copied_at: 'x', signoff: { proofs_sent: { at: 'x' }, client_approved: { at: 'x' }, pdfs_exported: { at: 'x' } } });
  chk('Cards: exported, the order is Brandon\'s', nk(s3) === 'cards_order' && s3.needs[0].owner === 'brandon' && /X\.12/.test(s3.needs[0].sop.section), nk(s3));
  s3 = cardsOf({ copied_at: 'x', signoff: { proofs_sent: { at: 'x' }, client_approved: { at: 'x' }, pdfs_exported: { at: 'x' }, sent_to_printer: { at: '2026-11-21T09:00:00Z' } } });
  chk('Cards: sent to the printer, nothing left and all five listed as done', nk(s3) === '' && s3.done.filter(d => /^cards_/.test(d.key)).length === 5, nk(s3));

  // ── Stage 2 on pg-mem: ticks and tasks ──
  const CID = '11111111-1111-4111-8111-111111111111';
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY, name TEXT)`);
  await pool.query(`INSERT INTO clients (id, name) VALUES ($1, 'Edens Edge')`, [CID]);
  await team.tickStep(CID, 'photos_drive', { by: 'Brandon' });
  let facts = await S.loadFacts(pool);
  chk('Ticks: a ticked step is on the client\'s facts with who ticked it', facts.ticks.get(CID).photos_drive.by === 'Brandon');
  await team.tickStep(CID, 'photos_drive', { done: false, by: 'Brandon' });
  chk('Ticks: put back, it is open again, and the row is kept', !(await S.loadFacts(pool)).ticks.has(CID) && (await pool.query(`SELECT * FROM team_step_ticks`)).rows.length === 1);
  await team.tickStep(CID, 'photos_drive', { by: 'Ray' });
  chk('Ticks: ticked again is one row, with the new name', (await pool.query(`SELECT * FROM team_step_ticks`)).rows.length === 1 && (await S.loadFacts(pool)).ticks.get(CID).photos_drive.by === 'Ray');
  chk('Ticks: a step that is not in the file is refused', /^404/.test(await refused(() => team.tickStep(CID, 'made_up', {}))));
  chk('Ticks: a client that is not there is refused', /^404/.test(await refused(() => team.tickStep('22222222-2222-4222-8222-222222222222', 'photos_drive', {}))));
  const ray = (await team.list()).find(p => p.name === 'Ray');
  const made = await team.addTask(CID, { text: 'Ring Ethan about the price list', person_id: ray.id, due: '2026-11-20', by: 'Brandon' });
  await team.addTask(CID, { text: 'Ask for the logo', role: 'site' });
  facts = await S.loadFacts(pool);
  chk('Tasks: a task for a person takes that person\'s job and name', made.role === 'ops' && facts.tasks.get(CID)[0].person === 'Ray' && facts.tasks.get(CID)[0].due === '2026-11-20' && facts.tasks.get(CID)[0].by === 'Brandon');
  chk('Tasks: a task for a job has no person', facts.tasks.get(CID)[1].role === 'site' && facts.tasks.get(CID)[1].person_id === null);
  chk('Tasks: no words, nobody, a person who has left, a bad date: all refused', /^400/.test(await refused(() => team.addTask(CID, { text: ' ', role: 'ops' }))) && /^400/.test(await refused(() => team.addTask(CID, { text: 'x' }))) && /^404/.test(await refused(() => team.addTask(CID, { text: 'x', person_id: cit1.id }))) && /^400/.test(await refused(() => team.addTask(CID, { text: 'x', role: 'ops', due: 'tomorrow' }))));
  await team.doneTask(made.id, { by: 'Ray' });
  chk('Tasks: Done takes it off the open list and keeps the row with who did it', (await S.loadFacts(pool)).tasks.get(CID).length === 1 && (await pool.query(`SELECT done_by FROM team_tasks WHERE id = $1`, [made.id])).rows[0].done_by === 'Ray');
  await team.doneTask(made.id, { done: false });
  chk('Tasks: put back, it is open again', (await S.loadFacts(pool)).tasks.get(CID).length === 2);
  chk('Tasks: a task that is not there is a 404', /^404/.test(await refused(() => team.doneTask(999, {}))));

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
