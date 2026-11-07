'use strict';
// Fixture: publishing through bundle.social (Stage 3), against tests/fake-bundle, never the real service.
// The rules are Brandon's brief (docs/current-build/Bundle_Social_Build_Brief.md): nothing goes out
// unless approved; posts 3 days ahead, photos on their day; no public Drive links; ids stored; retry and
// delete; both source teams checked; a Photo Drip photo never used twice, and it stops when they run out.
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const { newDb, DataType } = require('pg-mem');
const root = path.join(__dirname, '../..');
const { createFakeBundle } = require(path.join(__dirname, '../fake-bundle/fake-bundle.js'));
const { createBundlePublisher } = require(path.join(root, 'publisher/bundle-social.js'));
const PUB = require(path.join(root, 'publisher/index.js'));
const { createPublishStore } = require(path.join(root, 'publisher/store.js'));
const { createPublishing, ukToUtc, dripDays, closeness } = require(path.join(root, 'publisher/service.js'));
const { mountPublishingApi } = require(path.join(root, 'publisher/routes.js'));
const { createPostStore } = require(path.join(root, 'gbp-posts/store.js'));
const { createDriveStore } = require(path.join(root, 'drive/store.js'));
const P = require(path.join(root, 'gbp-posts/plan.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: publishing (fake bundle.social) ===\n');

// The small things first
chk('10am UK in winter is 10:00 UTC', ukToUtc('2026-12-01', '10:00') === '2026-12-01T10:00:00.000Z', ukToUtc('2026-12-01', '10:00'), '');
chk('10am UK in summer is 09:00 UTC', ukToUtc('2027-07-01', '10:00') === '2027-07-01T09:00:00.000Z', ukToUtc('2027-07-01', '10:00'), '');
chk('the two source teams are named', PUB.SOURCE_TEAMS.join() === 'Local Launchpad,Agency – team', PUB.SOURCE_TEAMS.join(), '');
chk('with no key nothing is enabled', PUB.enabled({}) === false, '', false);
chk('a key alone does not enable it', PUB.enabled({ BUNDLE_SOCIAL_API_KEY: 'x' }) === false, '', false);
chk('both enable it', PUB.enabled({ BUNDLE_SOCIAL_API_KEY: 'x', GBP_PUBLISHING_ENABLED: '1' }) === true, '', true);
chk('the daily limit is one number to change', PUB.dailyLimit({ BUNDLE_SOCIAL_DAILY_LIMIT: '40' }) === 40 && PUB.dailyLimit({}) === 20 && PUB.dailyLimit({ BUNDLE_SOCIAL_DAILY_LIMIT: 'lots' }) === 20, '', '');
chk('a location matches on the shared words', closeness('Edens Edge Landscaping LTD', 'Edens Edge Landscaping') === 3 && closeness('Other Roofing', 'Edens Edge Landscaping') === 0, '', '');
const CLIENT_DAYS = id => [P.dayPair(id).join(), dripDays(id).join()];
chk('Photo Drip uses other days than the posts', ['a', 'bb', 'ccc', 'dddd'].every(id => CLIENT_DAYS(id)[0] !== CLIENT_DAYS(id)[1]), '', '');

(async () => {
  const fake = createFakeBundle({ apiKey: 'test-key' });
  const LL = fake.addSource('Local Launchpad', [{ id: 'loc_ll', name: 'Local Launchpad', address: 'Southampton' }, { id: 'loc_edens', name: 'Edens Edge Landscaping LTD', address: 'Southampton SO15' }, { id: 'loc_shared', name: 'Shared Roofing', address: 'Leeds' }]);
  const AG = fake.addSource('Agency – team', [{ id: 'loc_other', name: 'Field Tree and Garden Care', address: 'Winchester' }, { id: 'loc_shared_2', name: 'Shared Roofing', address: 'Leeds' }]);
  for (let i = 0; i < 60; i++) fake.state.teams.push({ id: `team_old${i}`, name: `Old client ${i}`, organizationId: 'org_1', createdById: 'user_1' });
  const fakeSrv = http.createServer(fake.app);
  await new Promise(r => fakeSrv.listen(0, '127.0.0.1', r));
  const apiCalls = fake.state.calls;
  const publisher = createBundlePublisher({ apiKey: 'test-key', baseUrl: `http://127.0.0.1:${fakeSrv.address().port}/api/v1`, log: { error() {}, log() {} } });

  const db = newDb();
  db.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  db.public.none(`CREATE TABLE clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, trade text);
    CREATE TABLE client_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid, asset_type text, filename text, content text, metadata jsonb, uploaded_at timestamptz DEFAULT now());`);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge Landscaping', 'Landscaper') RETURNING id`);
  const { rows: [c2] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Second Client', 'Landscaper') RETURNING id`);

  // The clock: a Monday morning, moved by the test
  let clock = new Date('2026-11-09T08:00:00Z');
  const quiet = { log() {}, error() {} };
  const store = createPublishStore(pool), postStore = createPostStore(pool), driveStore = createDriveStore(pool);
  const photoBytes = Buffer.from('jpeg-bytes');
  const driveCalls = [];
  const drive = { download: async id => { driveCalls.push(id); if (id === 'too-big') return Buffer.alloc(6 * 1024 * 1024); return photoBytes; } };
  let limit = 20;
  const svc = createPublishing({ store, postStore, driveStore, getDrive: () => drive, getPublisher: () => publisher, clientName: async id => (await pool.query(`SELECT name FROM clients WHERE id=$1`, [id])).rows[0].name, limit: () => limit, now: () => clock, log: quiet });
  let on = true;
  const app = express();
  app.use(express.json());
  mountPublishingApi(app, { pool, publishing: svc, store, postStore, log: quiet, isEnabled: () => on, isConfigured: () => true, limit: () => limit });
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const req = (method, p, b) => new Promise((resolve, reject) => {
    const data = b ? JSON.stringify(b) : null;
    const q = http.request({ host: '127.0.0.1', port: srv.address().port, method, path: p, agent: false, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(t) })); });
    q.on('error', reject); if (data) q.write(data); q.end();
  });
  const api = `/api/clients/${c.id}/publishing`;
  const get = async () => (await req('GET', api)).json();

  // Seed: Drive's photos, and an approved batch of Offer, Learn More and Call posts
  const postPhoto = (id, label = 'Fencing', extra = {}) => ({ file_id: id, kind: 'post', label, folder_id: `f-${label}`, name: `${id}.jpeg`, mime_type: 'image/jpeg', size_bytes: 900000, width: 1600, height: 1200, md5: `md5-${id}`, modified_at: null, web_link: '', problem: '', ...extra });
  const dripPhoto = (id, extra = {}) => ({ ...postPhoto(id, 'GBP Photos – Photo Drip'), kind: 'drip', ...extra });
  const seedDrive = (files, client = c.id) => driveStore.saveRead(client, { folder_id: 'folder1', folder_name: 'Images', posts_found: true, drip_found: true, folders: [{ label: 'Fencing', id: 'f-Fencing' }], problems: [], notes: [], files });
  const drips = ['d1', 'd2', 'd3'].map(id => dripPhoto(id));
  await seedDrive([postPhoto('p1'), postPhoto('p2'), postPhoto('p3'), postPhoto('p4'), postPhoto('gone-soon'), postPhoto('too-big'), ...drips]);
  const basePost = (seq, date, extra = {}) => ({ seq, post_date: date, post_time: '10:00', topic: 'STANDARD', prompt_n: seq, prompt_label: `Prompt ${seq}`, folder: 'GBP Photos – Posts / Fencing', drive_file_id: `p${seq}`, photo_name: `p${seq}.jpeg`, cta_type: 'LEARN_MORE', cta_url: 'https://edens.example/fencing', offer_title: '', offer_start: '', offer_end: '', offer_redeem_url: '', ...extra });
  const seedBatch = async (client, posts, approve = true) => {
    const id = await postStore.createBatch(client, { size: posts.length, start: posts[0].post_date, config: { generated_at: 'x', intake: {}, output: { prompts: [] } }, notes: [], posts });
    for (const p of await postStore.posts(id)) await postStore.saveWritten(p.id, { body: `Post number ${p.seq} body text.`, opening: `post number ${p.seq}`, checks: [], fails: 0, warnings: 0 });
    await postStore.setStatus(id, 'draft');
    if (approve) await postStore.approve(id, 'A VA');
    return id;
  };
  // Tuesday offer, Friday call, next Tuesday learn more, far away learn more
  const batchId = await seedBatch(c.id, [
    basePost(1, '2026-11-10', { topic: 'OFFER', cta_type: '', cta_url: '', offer_title: 'Free, no-obligation quote', offer_start: '2026-11-10', offer_end: '2026-12-08', offer_redeem_url: 'https://edens.example' }),
    basePost(2, '2026-11-12', { cta_type: 'CALL', cta_url: '' }),
    basePost(3, '2026-11-17'),
    basePost(4, '2026-12-22'),
  ]);
  const draftBatch = await seedBatch(c.id, [basePost(9, '2026-11-11', { drive_file_id: 'p1', photo_name: 'p1.jpeg' })], false);

  // ── Off means off ──
  on = false;
  let v = await get();
  chk('off: the page still loads, and says so', v.enabled === false && v.items.length === 4, v.items.length, 4);
  chk('off: locations are refused', (await req('GET', `${api}/locations`)).status === 503, '', 503);
  chk('off: connecting is refused', (await req('POST', `${api}/connect`, { source_team_id: LL.id, channel_id: 'loc_edens' })).status === 503, '', 503);
  chk('off: switching on is refused', (await req('POST', `${api}/switch`, { on: true })).status === 503, '', 503);
  chk('off: not one call went to bundle.social', apiCalls.length === 0, apiCalls.join(), '');
  on = true;

  // ── The queue holds only what is approved ──
  chk('approved posts are queued', v.items.filter(i => i.kind === 'post').length === 4 && v.items.every(i => i.status === 'queued'), v.items.map(i => i.status).join(), '');
  const draftPosts = await postStore.posts(draftBatch);
  chk('a post not approved is never queued', !(await store.items(c.id)).some(i => i.post_id === draftPosts[0].id), '', '');
  await svc.syncPosts(c.id);
  chk('syncing twice makes no second item', (await store.items(c.id)).length === 4, (await store.items(c.id)).length, 4);

  // ── Connect: both teams, nothing made until a choice ──
  let locs = (await req('GET', `${api}/locations`)).json();
  chk('both source teams are read', locs.sources.map(s => s.name).join() === 'Local Launchpad,Agency – team' && locs.sources.every(s => !s.error), JSON.stringify(locs.sources), '');
  chk('a team is found past the first page of teams', fake.state.teams.length > 50 && locs.sources[1].count === 2, locs.sources[1].count, 2);
  chk('reading the list makes no team', fake.state.teams.length === 62, fake.state.teams.length, 62);
  chk('each location says which login', locs.locations.find(l => l.channel_id === 'loc_other').source_name === 'Agency – team', '', '');
  chk('a location on both logins shows once', locs.locations.filter(l => l.name === 'Shared Roofing').length === 1, locs.locations.filter(l => l.name === 'Shared Roofing').length, 1);
  chk('the closest name comes first', locs.locations[0].channel_id === 'loc_edens', locs.locations[0].name, 'Edens Edge');
  fake.failNext('refresh-channels', 500, 'one login is down');
  locs = (await req('GET', `${api}/locations`)).json();
  chk('one login failing still lists the other, and says so', locs.sources.filter(s => s.error).length === 1 && locs.locations.length > 0, JSON.stringify(locs.sources), '');
  chk('a location not in the list is refused', (await req('POST', `${api}/connect`, { source_team_id: LL.id, channel_id: 'nowhere' })).status === 400, '', 400);
  chk('choosing nothing is refused', (await req('POST', `${api}/connect`, {})).status === 400, '', 400);
  chk('switching on before connecting is refused', (await req('POST', `${api}/switch`, { on: true })).status === 400, '', 400);

  v = (await req('POST', `${api}/connect`, { source_team_id: LL.id, channel_id: 'loc_edens' })).json();
  const conn = v.connection;
  const clientTeam = fake.teamNamed('Edens Edge Landscaping');
  chk('Connect makes a team named after the client', !!clientTeam && conn.team_id === clientTeam.id, conn.team_id, '');
  chk('it holds the chosen location, not the source team\'s', fake.accountIn(clientTeam.id).externalId === 'loc_edens' && fake.accountIn(LL.id).externalId === 'loc_ll', fake.accountIn(clientTeam.id).externalId, 'loc_edens');
  chk('the connection is saved', conn.status === 'connected' && conn.channel_id === 'loc_edens' && conn.location_name === 'Edens Edge Landscaping LTD' && conn.source_name === 'Local Launchpad', JSON.stringify(conn), '');
  chk('connecting does not switch publishing on', conn.publishing_on === false, conn.publishing_on, false);
  const teamsAfter = fake.state.teams.length;
  v = (await req('POST', `${api}/connect`, { source_team_id: LL.id, channel_id: 'loc_edens' })).json();
  chk('pressing it again makes no second team', fake.state.teams.length === teamsAfter && v.connection.team_id === clientTeam.id, fake.state.teams.length, teamsAfter);

  // A connect that stops partway picks up where it stopped
  const api2 = `/api/clients/${c2.id}/publishing`;
  fake.failNext('social-account/copy', 500, 'copy failed');
  const part = await req('POST', `${api2}/connect`, { source_team_id: AG.id, channel_id: 'loc_other' });
  chk('a failed step reports it', part.status === 500 && /copy failed/.test(part.json().error), part.status, 500);
  const teamsPart = fake.state.teams.length;
  const again = await req('POST', `${api2}/connect`, { source_team_id: AG.id, channel_id: 'loc_other' });
  chk('pressing again carries on, with no second team', again.status === 200 && fake.state.teams.length === teamsPart && again.json().connection.status === 'connected', again.status, 200);
  chk('it copies from the login that holds the location', fake.accountIn(fake.teamNamed('Second Client').id).externalId === 'loc_other', '', '');
  // A location that does not read back blocks the client
  fake.state.setChannelIgnored = true;
  const { rows: [c3] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Third Client', 'Landscaper') RETURNING id`);
  const nope = await req('POST', `/api/clients/${c3.id}/publishing/connect`, { source_team_id: LL.id, channel_id: 'loc_edens' });
  chk('a copy still on the source team\'s location is caught', nope.status === 502 && /different location/.test(nope.json().error) && (await store.connection(c3.id)).status === 'problem', nope.json().error, '');
  chk('and that client cannot switch on', (await req('POST', `/api/clients/${c3.id}/publishing/switch`, { on: true })).status === 400, '', 400);
  fake.state.setChannelIgnored = false;

  // ── Publishing off: the job leaves it alone ──
  let run = await svc.runClient(c.id);
  chk('publishing off: the job sends nothing', run.stopped === 'publishing is off' && fake.state.posts.length === 0 && fake.state.uploads.length === 0, JSON.stringify(run), '');
  chk('Send now is refused while off', (await req('POST', `${api}/items/${(await store.items(c.id))[0].id}/send`)).status === 409, '', 409);
  v = (await req('POST', `${api}/switch`, { on: true })).json();
  chk('it can be switched on', v.connection.publishing_on === true, '', true);

  // ── The daily job ──
  run = await svc.runDaily();
  chk('the daily job runs', run.ran === true && run.summary.clients.some(x => x.client === c.id), JSON.stringify(run), '');
  const clientRun = run.summary.clients.find(x => x.client === c.id);
  chk('the two posts within 3 days are scheduled', clientRun.scheduled === 2 && fake.state.posts.length === 2, JSON.stringify(clientRun), '');
  chk('it runs once a day however often it is called', (await svc.runDaily()).ran === false && fake.state.posts.length === 2, fake.state.posts.length, 2);
  v = await get();
  const byDate = d => v.items.find(i => i.due_date === d);
  chk('the post further off stays queued', byDate('2026-11-17').status === 'queued' && byDate('2026-12-22').status === 'queued', byDate('2026-11-17').status, 'queued');
  chk('what went has its status', byDate('2026-11-10').status === 'scheduled' && byDate('2026-11-12').status === 'scheduled', '', '');
  const rows = await store.items(c.id);
  chk('the bundle.social ids are stored', rows.filter(i => i.status === 'scheduled').every(i => i.external_id && i.upload_id), '', '');
  const offer = fake.state.posts.find(p => p.data.GOOGLE_BUSINESS.topicType === 'OFFER');
  const g = offer.data.GOOGLE_BUSINESS;
  chk('the Offer post carries its offer, and no button', g.offerRedeemOnlineUrl === 'https://edens.example' && g.eventTitle === 'Free, no-obligation quote' && !g.callToActionType && !g.callToActionUrl, JSON.stringify(g), '');
  chk('its dates run the 28 days', g.eventStartDate === '2026-11-10T00:00:00.000Z' && g.eventEndDate === '2026-12-08T00:00:00.000Z', `${g.eventStartDate} ${g.eventEndDate}`, '');
  chk('it goes at 10am UK', offer.postDate === '2026-11-10T10:00:00.000Z', offer.postDate, '');
  const callPost = fake.state.posts.find(p => p.data.GOOGLE_BUSINESS.callToActionType === 'CALL');
  chk('a Call post has a button and no link', callPost && !callPost.data.GOOGLE_BUSINESS.callToActionUrl, JSON.stringify(callPost && callPost.data.GOOGLE_BUSINESS), '');
  chk('each post has one image, from a file upload', fake.state.posts.every(p => p.data.GOOGLE_BUSINESS.uploadIds.length === 1) && fake.state.uploads.every(u => u.bytes === photoBytes.toString('latin1') && u.mime === 'image/jpeg'), '', '');
  chk('the photo came from Drive through the account', driveCalls.includes('p1') && driveCalls.includes('p2'), driveCalls.join(), '');
  chk('no Drive link ever reached bundle.social', !JSON.stringify(fake.state.posts).includes('drive.google') && !apiCalls.some(x => /from-url/.test(x)), '', '');
  chk('each post has its reference key', fake.state.posts.every(p => /^gbp-post-/.test(p.referenceKey)), '', '');
  chk('the posts went to the client\'s team, not a source', fake.state.posts.every(p => p.teamId === clientTeam.id), '', '');

  // A restart mid send: the same post is not made twice
  const twice = rows.find(i => i.status === 'scheduled');
  await store.updateItem(twice.id, { status: 'queued', external_id: null });
  const before = fake.state.posts.length;
  clock = new Date('2026-11-09T09:00:00Z');
  await svc.runClient(c.id);
  chk('a post sent before is found by its key, not made again', fake.state.posts.length === before && (await store.item(c.id, twice.id)).external_id, fake.state.posts.length, before);

  // ── Status coming back ──
  clock = new Date('2026-11-10T12:00:00Z');
  const offerItem = (await store.items(c.id)).find(i => i.due_date === '2026-11-10');
  fake.publish(offerItem.external_id);
  await svc.refreshStatuses(c.id);
  v = await get();
  const liveItem = v.items.find(i => i.id === offerItem.id);
  chk('a post that went out shows Posted, with its link', liveItem.status === 'posted' && /business\.google/.test(liveItem.link) && liveItem.posted_at, JSON.stringify(liveItem), '');

  clock = new Date('2026-11-12T12:00:00Z');
  const callItem = (await store.items(c.id)).find(i => i.due_date === '2026-11-12');
  fake.fail(callItem.external_id, 'Google refused the photo');
  await svc.refreshStatuses(c.id);
  v = await get();
  let failedItem = v.items.find(i => i.id === callItem.id);
  chk('a post that failed shows Failed, with the reason', failedItem.status === 'failed' && /Google refused the photo/.test(failedItem.error), JSON.stringify(failedItem), '');
  v = (await req('POST', `${api}/items/${callItem.id}/send`)).json();
  failedItem = v.items.find(i => i.id === callItem.id);
  chk('Retry asks bundle.social to try it again, with no second post', failedItem.status === 'scheduled' && !failedItem.error && apiCalls.some(x => /\/retry$/.test(x)) && fake.state.posts.length === before, JSON.stringify(failedItem), '');

  // ── Delete, by where it has got to ──
  const liveBefore = fake.state.posts.find(p => p.id === offerItem.external_id);
  v = (await req('DELETE', `${api}/items/${offerItem.id}`)).json();
  chk('a published post is taken off Google with Google\'s delete', liveBefore.removedFromGoogle === true && !liveBefore.stillLive && v.items.find(i => i.id === offerItem.id).status === 'deleted', JSON.stringify(liveBefore.removedFromGoogle), true);
  const schedItem = (await store.items(c.id)).find(i => i.id === callItem.id);
  const schedRemote = fake.state.posts.find(p => p.id === schedItem.external_id);
  v = (await req('DELETE', `${api}/items/${callItem.id}`)).json();
  chk('a scheduled post is cancelled', schedRemote.status === 'DELETED' && !schedRemote.removedFromGoogle, schedRemote.status, 'DELETED');
  const queuedItem = (await store.items(c.id)).find(i => i.due_date === '2026-12-22');
  const callsBefore = apiCalls.length;
  v = (await req('DELETE', `${api}/items/${queuedItem.id}`)).json();
  chk('a queued post is deleted without calling anyone', v.items.find(i => i.id === queuedItem.id).status === 'deleted' && apiCalls.length === callsBefore, apiCalls.length - callsBefore, 0);
  await svc.syncPosts(c.id);
  chk('a deleted post is not queued again', (await store.items(c.id)).filter(i => i.post_id === queuedItem.post_id).length === 1, '', '');

  // ── Failures while sending ──
  clock = new Date('2026-11-14T08:00:00Z');
  fake.state.nextFailure.length = 0;
  fake.failNext('/post/', 503, 'busy');
  const nextItem = (await store.items(c.id)).find(i => i.due_date === '2026-11-17');
  run = await svc.runClient(c.id);
  let row = await store.item(c.id, nextItem.id);
  chk('a busy service leaves it queued, with the reason', row.status === 'queued' && /busy/.test(row.error) && run.waiting >= 1, JSON.stringify({ s: row.status, e: row.error }), '');
  await svc.runClient(c.id);
  row = await store.item(c.id, nextItem.id);
  chk('and the next run sends it', row.status === 'scheduled' && !row.error, row.status, 'scheduled');

  // A refusal is a failure, not a retry
  const refused = await seedBatch(c.id, [basePost(5, '2026-11-17', { drive_file_id: 'p4', photo_name: 'p4.jpeg', cta_type: 'LEARN_MORE', cta_url: '' })]);
  await svc.syncPosts(c.id);
  await svc.runClient(c.id);
  const refusedPost = (await postStore.posts(refused))[0];
  const rr = (await store.items(c.id)).find(i => i.post_id === refusedPost.id);
  chk('a post bundle.social refuses is Failed, with why', rr.status === 'failed' && /callToActionUrl/.test(rr.error), JSON.stringify({ s: rr.status, e: rr.error }), '');
  await store.updateItem(rr.id, { status: 'deleted' });

  // A photo that has left Drive, or is too big
  const gone = await seedBatch(c.id, [basePost(6, '2026-11-17', { drive_file_id: 'not-there', photo_name: 'not-there.jpeg' }), basePost(7, '2026-11-17', { drive_file_id: 'too-big', photo_name: 'too-big.jpeg' })]);
  await svc.syncPosts(c.id);
  await svc.runClient(c.id);
  const gonePosts = await postStore.posts(gone);
  const goneRow = (await store.items(c.id)).find(i => i.post_id === gonePosts[0].id);
  const bigRow = (await store.items(c.id)).find(i => i.post_id === gonePosts[1].id);
  chk('a photo gone from Drive fails, and says so', goneRow.status === 'failed' && /no longer in Drive/.test(goneRow.error), goneRow.error, '');
  chk('a download over 5 MB fails, and says so', bigRow.status === 'failed' && /5 MB/.test(bigRow.error), bigRow.error, '');
  await store.updateItem(goneRow.id, { status: 'deleted' }); await store.updateItem(bigRow.id, { status: 'deleted' });

  // A date that passed
  await seedBatch(c.id, [basePost(8, '2026-11-10', { drive_file_id: 'p3', photo_name: 'p3.jpeg' })]);
  await svc.syncPosts(c.id);
  await svc.runClient(c.id);
  const lateRow = (await store.items(c.id)).find(i => i.due_date === '2026-11-10' && i.status !== 'deleted');
  chk('a date already gone does not go out by itself', lateRow.status === 'failed' && /date passed/.test(lateRow.error), JSON.stringify({ s: lateRow.status, e: lateRow.error }), '');
  v = (await req('POST', `${api}/items/${lateRow.id}/send`)).json();
  const sentLate = await store.item(c.id, lateRow.id);
  const lateRemote = fake.state.posts.find(p => p.id === sentLate.external_id);
  chk('Retry sends it soon, never into the past', sentLate.status === 'scheduled' && sentLate.due_date === '2026-11-14' && lateRemote.postDate > clock.toISOString(), JSON.stringify({ s: sentLate.status, d: sentLate.due_date, at: lateRemote && lateRemote.postDate }), '');

  // The daily limit
  limit = 1;
  const capped = await seedBatch(c.id, [basePost(10, '2026-11-17', { drive_file_id: 'p3', photo_name: 'p3.jpeg' })]);
  await svc.syncPosts(c.id);
  const beforeCap = fake.state.posts.length;
  run = await svc.runClient(c.id);
  const capPost = (await postStore.posts(capped))[0];
  const capRow = (await store.items(c.id)).find(i => i.post_id === capPost.id);
  chk('over the daily limit it waits, and says why', capRow.status === 'queued' && /daily limit/.test(capRow.error) && fake.state.posts.length === beforeCap && run.waiting >= 1, JSON.stringify({ s: capRow.status, e: capRow.error }), '');
  limit = 20;
  await svc.runClient(c.id);
  chk('with room it goes', (await store.item(c.id, capRow.id)).status === 'scheduled', (await store.item(c.id, capRow.id)).status, 'scheduled');

  // The limit is per location (bundle.social support, 7 Nov 2026), and photos never count
  const mineBefore = await store.postsOnDay(c.id, '2026-11-17');
  await store.addItem({ client_id: c2.id, kind: 'post', file_name: 'x.jpeg', due_date: '2026-11-17', due_time: '10:00', status: 'scheduled' });
  await store.addItem({ client_id: c.id, kind: 'photo', drive_file_id: 'zz', file_name: 'zz.jpeg', category: 'AT_WORK', due_date: '2026-11-17', due_time: '14:00', status: 'posted' });
  const mineOnDay = await store.postsOnDay(c.id, '2026-11-17');
  chk('another client posts and this client photos leave its limit alone', mineBefore >= 1 && mineOnDay === mineBefore && await store.postsOnDay(c2.id, '2026-11-17') === 1, mineOnDay, mineBefore);
  for (const r of [...await store.items(c2.id), ...(await store.items(c.id)).filter(i => i.drive_file_id === 'zz')]) await store.removeItem(r.id);

  // A failure older than 13 days: bundle.social has removed its photo, so Retry sends it again in full
  const oldId = (await store.item(c.id, capRow.id)).external_id;
  const oldUpload = fake.state.posts.find(p => p.id === oldId).data.GOOGLE_BUSINESS.uploadIds[0];
  clock = new Date('2026-12-02T09:00:00Z');
  fake.fail(oldId, 'Google was down');
  await svc.refreshStatuses(c.id);
  fake.state.uploads = fake.state.uploads.filter(u => u.id !== oldUpload);
  const postsBeforeResend = fake.state.posts.length;
  await req('POST', `${api}/items/${capRow.id}/send`);
  const resent = await store.item(c.id, capRow.id);
  const resentRemote = fake.state.posts.find(p => p.id === resent.external_id);
  chk('an old failure is sent again with a new photo upload, and the old post cancelled', resent.status === 'scheduled' && resent.external_id !== oldId && fake.state.posts.find(p => p.id === oldId).status === 'DELETED' && resentRemote && resentRemote.data.GOOGLE_BUSINESS.uploadIds[0] !== oldUpload && fake.state.posts.length === postsBeforeResend + 1 && resent.due_date === '2026-12-02', JSON.stringify({ s: resent.status, e: resent.error, d: resent.due_date }), '');
  clock = new Date('2026-11-14T08:00:00Z');

  // ── Approval taken back ──
  const undoBatch = await seedBatch(c.id, [basePost(11, '2027-02-01', { drive_file_id: 'p3', photo_name: 'p3.jpeg' })]);
  await svc.syncPosts(c.id);
  await svc.beforeUnapprove(c.id, undoBatch);
  chk('taking back an approval before sending clears its queue', !(await store.items(c.id)).some(i => i.due_date === '2027-02-01'), '', '');
  let blocked = null;
  try { await svc.beforeUnapprove(c.id, batchId); } catch (e) { blocked = e; }
  chk('it is refused once posts have gone to bundle.social', blocked && blocked.status === 409 && /already gone/.test(blocked.message), blocked && blocked.message, '');

  // Found using the tab: once what went out is deleted, the approval can be taken back
  const sentBack = await seedBatch(c.id, [basePost(12, '2027-03-01', { drive_file_id: 'p3', photo_name: 'p3.jpeg' })]);
  await svc.syncPosts(c.id);
  const sentPost = (await postStore.posts(sentBack))[0];
  const sentRow = (await store.items(c.id)).find(i => i.post_id === sentPost.id);
  await svc.sendNow(c.id, sentRow.id);
  let stillBlocked = null;
  try { await svc.beforeUnapprove(c.id, sentBack); } catch (e) { stillBlocked = e; }
  chk('while it is with bundle.social the approval stays', stillBlocked && stillBlocked.status === 409, stillBlocked && stillBlocked.message, '');
  await svc.deleteItem(c.id, sentRow.id);
  let cleared = null;
  try { await svc.beforeUnapprove(c.id, sentBack); } catch (e) { cleared = e; }
  chk('deleted, it can be taken back', cleared === null, cleared && cleared.message, null);

  // ── Photo Drip ──
  let D = (await get()).drip;
  chk('Photo Drip counts its photos', D.found && D.left === 3 && D.planned === 0 && !D.ran_out && D.category === 'AT_WORK', JSON.stringify(D), '');
  v = (await req('POST', `${api}/drip/plan`)).json();
  D = v.drip;
  const planned = v.items.filter(i => i.kind === 'photo');
  chk('a plan takes every new photo, waiting for approval', planned.length === 3 && planned.every(i => i.status === 'planned' && i.category === 'AT_WORK') && D.left === 0, JSON.stringify(planned.map(i => i.status)), '');
  chk('2 a week, on its own days, in the future', planned.every(i => dripDays(c.id).includes(new Date(`${i.due_date}T12:00:00Z`).getUTCDay()) && i.due_date > '2026-11-14'), planned.map(i => i.due_date).join(), '');
  chk('all planned means it has run out, and says so', D.ran_out === true && !!D.last_date, JSON.stringify(D), '');
  clock = new Date(`${planned[0].due_date}T08:00:00Z`);
  await svc.runClient(c.id);
  chk('a plan not approved does not go', fake.state.media.length === 0, fake.state.media.length, 0);
  v = (await req('POST', `${api}/drip/approve`)).json();
  chk('approving queues them', v.items.filter(i => i.kind === 'photo').every(i => i.status === 'queued'), '', '');
  chk('there is then no plan to approve', (await req('POST', `${api}/drip/approve`)).status === 409, '', 409);
  chk('and nothing new to plan', (await req('POST', `${api}/drip/plan`)).status === 409, '', 409);
  await svc.runClient(c.id);
  chk('only the photo due today goes up', fake.state.media.length === 1, fake.state.media.length, 1);
  const media = fake.state.media[0];
  chk('it goes to the GBP Photos section, category AT_WORK, on the client\'s location', media.locationAssociation.category === 'AT_WORK' && media.location === 'loc_edens' && media.teamId === clientTeam.id, JSON.stringify(media), '');
  chk('it is a photo, not a post', fake.state.posts.every(p => !JSON.stringify(p).includes(media.uploadId)), '', '');
  let photos = (await store.items(c.id)).filter(i => i.kind === 'photo');
  chk('it shows Posted with its Google name kept', photos[0].status === 'posted' && photos[0].media_name === media.name && !!photos[0].link, JSON.stringify(photos[0].status), 'posted');

  // Run out means soon: months of photos still planned is not an alarm
  const farAway = dripPhoto('far1');
  await seedDrive([postPhoto('p3'), ...drips, farAway]);
  await store.addItem({ client_id: c.id, kind: 'photo', drive_file_id: 'far1', file_name: 'far1.jpeg', md5: farAway.md5, category: 'AT_WORK', due_date: P.addDays(P.ukDate(clock), 120), due_time: '14:00', status: 'queued' });
  D = (await get()).drip;
  chk('no new photos but months still planned is not run out', D.left === 0 && D.ran_out === false && !!D.last_date, JSON.stringify(D), '');
  const farRow = (await store.items(c.id)).find(i => i.drive_file_id === 'far1');
  await store.removeItem(farRow.id);
  await seedDrive([postPhoto('p3'), ...drips]);

  // Never reused: not a re-plan, not after a delete, not the same picture under another name
  await seedDrive([postPhoto('p3'), ...drips, dripPhoto('copy-of-d1', { md5: 'md5-d1' })]);
  D = (await get()).drip;
  chk('a copy of a used photo under a new name is not new', D.left === 0 && D.ran_out === true, JSON.stringify(D), '');
  v = (await req('DELETE', `${api}/items/${photos[0].id}`)).json();
  chk('deleting a posted photo takes it off Google', fake.state.media.length === 0 && v.items.find(i => i.id === photos[0].id).status === 'deleted', fake.state.media.length, 0);
  D = (await get()).drip;
  chk('and it is never used again', D.left === 0, D.left, 0);
  await seedDrive([postPhoto('p3'), ...drips, dripPhoto('d4')]);
  D = (await get()).drip;
  chk('a new photo is new: it does not need the old ones', D.left === 1 && D.ran_out === false, JSON.stringify(D), '');
  await seedDrive([postPhoto('p3'), ...drips]);

  // A photo stopped mid send is not sent blind
  const mid = (await store.items(c.id)).find(i => i.kind === 'photo' && i.status === 'queued');
  await store.updateItem(mid.id, { status: 'sending' });
  await svc.runClient(c.id);
  row = await store.item(c.id, mid.id);
  chk('a photo left mid send asks a person to check first', row.status === 'failed' && /Check the Google profile/.test(row.error), JSON.stringify({ s: row.status, e: row.error }), '');

  // ── The location stops everything ──
  const beforeStop = [fake.state.posts.length, fake.state.media.length];
  fake.accountIn(clientTeam.id).externalId = 'loc_ll';
  run = await svc.runClient(c.id);
  chk('a client now on another location sends nothing, and it shows', run.stopped === 'the location did not read back' && fake.state.posts.length === beforeStop[0] && fake.state.media.length === beforeStop[1] && /different location/.test((await store.connection(c.id)).problem), JSON.stringify(run), '');
  fake.accountIn(clientTeam.id).externalId = 'loc_edens';
  run = await svc.runClient(c.id);
  chk('put right, it carries on and the problem clears', !run.stopped && !(await store.connection(c.id)).problem, JSON.stringify(run), '');
  fake.accountIn(clientTeam.id).deleteOn = '2026-12-01T00:00:00Z';
  run = await svc.runClient(c.id);
  chk('a disconnected login stops it, and says so', run.stopped && /disconnected/.test((await store.connection(c.id)).problem), (await store.connection(c.id)).problem, '');
  fake.accountIn(clientTeam.id).deleteOn = null;

  // One client's trouble does not stop the next
  await store.saveConnection(c2.id, { publishing_on: true });
  await seedDrive([postPhoto('s1')], c2.id);
  await seedBatch(c2.id, [basePost(1, P.addDays(P.ukDate(clock), 1), { drive_file_id: 's1', photo_name: 's1.jpeg' })]);
  fake.accountIn(clientTeam.id).externalId = 'loc_ll';
  await svc.syncPosts(c2.id);
  const secondTeam = fake.teamNamed('Second Client');
  const beforeSecond = fake.state.posts.filter(p => p.teamId === secondTeam.id).length;
  clock = new Date(clock.getTime() + 2 * 86400000);
  await seedBatch(c2.id, [basePost(2, P.addDays(P.ukDate(clock), 1), { drive_file_id: 's1', photo_name: 's1.jpeg' })]);
  run = await svc.runDaily();
  chk('one client stopping leaves the next running', run.ran && fake.state.posts.filter(p => p.teamId === secondTeam.id).length > beforeSecond, JSON.stringify(run.summary), '');
  fake.accountIn(clientTeam.id).externalId = 'loc_edens';

  // A wrong key says so, without showing it
  const wrong = createBundlePublisher({ apiKey: 'a-secret-key', baseUrl: `http://127.0.0.1:${fakeSrv.address().port}/api/v1` });
  let wrongErr = null;
  try { await wrong.createTeam('Some name'); } catch (e) { wrongErr = e; }
  chk('a refused key is reported and never repeated', wrongErr && wrongErr.status === 401 && !wrongErr.message.includes('a-secret-key'), wrongErr && wrongErr.message, '');

  // ── Nothing else calls out ──
  const src = fs.readFileSync(path.join(root, 'publisher/service.js'), 'utf8');
  chk('only the publisher file knows the service', !/api\.bundle|x-api-key/.test(src), '', '');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  chk('the daily job only starts when enabled', /if \(PUB\.enabled\(\)\) \{\s*const publishTick/.test(server), '', '');

  await new Promise(r => srv.close(r));
  await new Promise(r => fakeSrv.close(r));
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
