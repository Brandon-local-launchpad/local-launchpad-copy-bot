'use strict';

// ── Publishing: connecting a client, the queue, Photo Drip, the daily job ────
// Brandon's rules (docs/current-build/Bundle_Social_Build_Brief.md): only approved items go out;
// posts are scheduled up to 3 days ahead; Photo Drip photos go up on their day because bundle.social
// cannot schedule them; a Photo Drip photo is never used twice, and when they run out it stops and
// tells the VA. A client with publishing off is never touched.

const P = require('../gbp-posts/plan');
const { DRIP_ROOT } = require('../drive/photos');
const { SOURCE_TEAMS } = require('./index');

const LOOKAHEAD_DAYS = 3;
const DRIP_CATEGORY = 'AT_WORK';     // Brandon, 7 Nov 2026: all of them, for now
const DRIP_TIME = '14:00';
const DRIP_MAX_PLAN = 52;
const RAN_OUT_DAYS = 28;            // the VA is told this long before the last new photo goes up
const LATE_MINUTES = 10;             // a post sent after its time goes out this far ahead
const MAX_BYTES = 5 * 1024 * 1024;
// bundle.social support (7 Nov 2026): an upload is removed 14 days after the last post using it is
// published, fails or is deleted. A failure older than this is sent again in full, with a new upload.
const UPLOAD_KEEP_DAYS = 13;

const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
const words = s => new Set(norm(s).split(/\s+/).filter(w => w.length > 2 && !['ltd', 'limited', 'the', 'and'].includes(w)));

// How close a location's name is to the client's: the words they share
function closeness(name, client) {
  const a = words(name), b = words(client);
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

// A UK wall clock time as the moment it is, summer time included
function ukToUtc(date, time = '00:00') {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess);
  const v = t => Number(parts.find(p => p.type === t).value);
  const asUk = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'));
  return new Date(guess.getTime() - (asUk - guess.getTime())).toISOString();
}

// Photo Drip days: a different pair from the client's post days
const DAY_PAIRS = [[1, 4], [2, 5], [3, 6]];
function dripDays(clientId) {
  const posts = P.dayPair(clientId).join();
  const i = DAY_PAIRS.findIndex(p => p.join() === posts);
  return DAY_PAIRS[(i + 1) % DAY_PAIRS.length];
}
function nextDays(from, days, count) {
  const out = [];
  let d = from;
  while (out.length < count) { if (days.includes(new Date(`${d}T12:00:00Z`).getUTCDay())) out.push(d); d = P.addDays(d, 1); }
  return out;
}

function createPublishing({ store, postStore, driveStore, getDrive, getPublisher, clientName, limit = () => 20, now = () => new Date(), log = console }) {
  const today = () => P.ukDate(now());
  const bad = (m, status = 400) => Object.assign(new Error(m), { status });

  // ── Connecting ──
  // Reads each source team and creates nothing. One location reachable through both logins shows once.
  async function locations(clientId) {
    const name = await clientName(clientId);
    const sources = await getPublisher().locations(SOURCE_TEAMS);
    const seen = new Set(), list = [];
    for (const s of sources) {
      for (const l of s.locations) {
        const key = `${norm(l.name)}|${norm(l.address)}`;
        if (seen.has(key) || seen.has(l.channel_id)) continue;
        seen.add(key); seen.add(l.channel_id);
        list.push({ ...l, source_name: s.name, source_team_id: s.team_id, match: closeness(l.name, name) });
      }
    }
    list.sort((a, b) => (b.match - a.match) || a.name.localeCompare(b.name));
    return { client: name, locations: list, sources: sources.map(s => ({ name: s.name, count: s.locations.length, error: s.error })) };
  }

  // Each step is saved as it is done, so pressing it again carries on and never makes a second team.
  async function connect(clientId, { source_team_id: sourceTeamId, channel_id: channelId }) {
    if (!sourceTeamId || !channelId) throw bad('Choose a location first.');
    const { locations: list } = await locations(clientId);
    const chosen = list.find(l => l.channel_id === channelId && l.source_team_id === sourceTeamId);
    if (!chosen) throw bad('That location is not in the list any more. Refresh the list and choose again.');
    let conn = await store.connection(clientId);
    if (conn && conn.status === 'connected' && conn.channel_id !== channelId) {
      const live = (await store.items(clientId)).filter(i => ['sending', 'scheduled'].includes(i.status));
      if (live.length) throw bad(`${live.length} item${live.length === 1 ? ' is' : 's are'} already scheduled on the current location. Delete ${live.length === 1 ? 'it' : 'them'} before moving this client.`, 409);
    }
    const pub = getPublisher();
    let teamId = conn && conn.team_id;
    if (!teamId) {
      teamId = await pub.createTeam(await clientName(clientId));
      await store.saveConnection(clientId, { team_id: teamId, status: 'partial', source_team_id: sourceTeamId, source_name: chosen.source_name });
    }
    let account = await pub.accountFor(teamId);
    if (!account) { await pub.copyAccount(sourceTeamId, teamId); account = await pub.accountFor(teamId); }
    // A copy arrives on the source team's own location, and a set location must be unset before another
    if (!account || account.externalId !== channelId) {
      if (account && account.externalId) await pub.unsetChannel(teamId);
      await pub.setChannel(teamId, channelId);
    }
    // Read back: a copy can arrive pointing at the source team's own location
    const check = await pub.checkAccount({ teamId, channelId });
    if (!check.ok) {
      await store.saveConnection(clientId, { status: 'problem', problem: check.reason, publishing_on: false });
      throw bad(`Connected, but the location did not read back: ${check.reason}`, 502);
    }
    await store.saveConnection(clientId, { source_team_id: sourceTeamId, source_name: chosen.source_name, team_id: teamId, account_id: check.account_id, channel_id: channelId, location_name: chosen.name, location_address: chosen.address, status: 'connected', problem: null, connected_at: now().toISOString(), checked_at: now().toISOString() });
    log.log(`[publisher] ${clientId}: connected to "${chosen.name}"`);
    return store.connection(clientId);
  }

  async function setPublishing(clientId, on) {
    const conn = await store.connection(clientId);
    if (on && (!conn || conn.status !== 'connected')) throw bad('Connect this client to a location first.');
    await store.saveConnection(clientId, { publishing_on: !!on });
  }

  // ── The queue ──
  // Every post of an approved batch has one item. A deleted item stays, so it is not made again.
  async function syncPosts(clientId) {
    const have = new Set((await store.items(clientId)).filter(i => i.post_id).map(i => i.post_id));
    for (const b of await postStore.batches(clientId)) {
      if (b.status !== 'approved') continue;
      for (const p of await postStore.posts(b.id)) {
        if (have.has(p.id)) continue;
        await store.addItem({ client_id: clientId, kind: 'post', post_id: p.id, drive_file_id: p.drive_file_id, file_name: p.photo_name, due_date: p.post_date, due_time: p.post_time, status: 'queued' });
      }
    }
  }

  // Taking an approval back: anything that has left Copybot must be dealt with first
  async function beforeUnapprove(clientId, batchId) {
    const ids = new Set((await postStore.posts(batchId)).map(p => p.id));
    const mine = (await store.items(clientId)).filter(i => ids.has(i.post_id));
    const out = mine.filter(i => i.status !== 'deleted' && (!['queued', 'failed'].includes(i.status) || i.external_id));
    if (out.length) throw bad(`${out.length} post${out.length === 1 ? ' has' : 's have'} already gone to bundle.social. Delete ${out.length === 1 ? 'it' : 'them'} on the queue first.`, 409);
    for (const i of mine) await store.removeItem(i.id);
  }

  async function downloadChecked(item) {
    const read = await driveStore.read(item.client_id);
    const photo = read && read.files.find(f => f.file_id === item.drive_file_id);
    if (!photo) throw Object.assign(bad(`${item.file_name} is no longer in Drive.`), { permanent: true });
    if (photo.problem) throw Object.assign(bad(`${item.file_name}: ${photo.problem}.`), { permanent: true });
    const bytes = await getDrive().download(item.drive_file_id);
    if (bytes.length > MAX_BYTES) throw Object.assign(bad(`${item.file_name} is over the 5 MB limit.`), { permanent: true });
    return { bytes, mime: photo.mime_type, md5: photo.md5 };
  }

  // One item, now. Returns its new status. A busy service leaves it queued for the next run.
  async function sendItem(item, conn) {
    const pub = getPublisher();
    await store.updateItem(item.id, { status: 'sending', attempts: (item.attempts || 0) + 1, error: null });
    try {
      if (item.kind === 'photo') {
        const used = (await store.items(item.client_id)).filter(i => i.kind === 'photo' && i.id !== item.id && i.status === 'posted' && (i.drive_file_id === item.drive_file_id || (i.md5 && i.md5 === item.md5)));
        if (used.length) throw Object.assign(bad(`${item.file_name} has already gone up, and a photo is never reused.`), { permanent: true });
      }
      const { bytes, mime } = await downloadChecked(item);
      // A photo uses no post, so its upload is never relied on later: a fresh one each time
      const fresh = item.kind === 'photo' || !!item.external_id;
      const uploadId = (!fresh && item.upload_id) || await pub.uploadPhoto({ teamId: conn.team_id, bytes, filename: item.file_name, mime });
      await store.updateItem(item.id, { upload_id: uploadId });
      if (item.kind === 'photo') {
        const added = await pub.addPhoto({ teamId: conn.team_id, uploadId, category: item.category || DRIP_CATEGORY });
        await store.updateItem(item.id, { status: 'posted', media_name: added.name, link: added.link, posted_at: now().toISOString() });
        return 'posted';
      }
      const post = await postStore.post(item.client_id, item.post_id);
      if (!post) throw Object.assign(bad('This post is no longer in its batch.'), { permanent: true });
      const earliest = new Date(now().getTime() + LATE_MINUTES * 60000).toISOString();
      const due = ukToUtc(item.due_date, item.due_time);
      const when = { postAt: due > earliest ? due : earliest, offerStart: post.offer_start ? ukToUtc(post.offer_start) : null, offerEnd: post.offer_end ? ukToUtc(post.offer_end) : null };
      const made = await pub.schedulePost({ teamId: conn.team_id, post, uploadId, referenceKey: item.external_id ? `gbp-post-${post.id}-after-${item.external_id}` : `gbp-post-${post.id}`, when });
      await store.updateItem(item.id, { status: made.status === 'failed' ? 'failed' : made.status === 'posted' ? 'posted' : 'scheduled', external_id: made.id });
      return 'scheduled';
    } catch (e) {
      const stay = e.transient && !e.permanent;
      if (!e.status || e.status >= 500) log.error(`[publisher] ${item.id}: ${e.message}`);
      await store.updateItem(item.id, { status: stay ? 'queued' : 'failed', error: e.message });
      return stay ? 'queued' : 'failed';
    }
  }

  async function checkOrStop(clientId, conn) {
    const check = await getPublisher().checkAccount({ teamId: conn.team_id, channelId: conn.channel_id });
    if (check.ok) { await store.saveConnection(clientId, { checked_at: now().toISOString(), problem: null, status: 'connected' }); return true; }
    await store.saveConnection(clientId, { status: 'problem', problem: check.reason, checked_at: now().toISOString() });
    log.error(`[publisher] ${clientId} stopped: ${check.reason}`);
    return false;
  }

  async function refreshStatuses(clientId) {
    const pub = getPublisher();
    let changed = 0;
    for (const i of await store.items(clientId)) {
      if (i.kind !== 'post' || i.status !== 'scheduled' || !i.external_id || i.due_date > today()) continue;
      try {
        const s = await pub.postStatus(i.external_id);
        if (s.status === i.status) continue;
        await store.updateItem(i.id, { status: s.status, error: s.status === 'failed' ? s.error || 'bundle.social gave no reason.' : null, link: s.link || i.link || '', posted_at: s.posted_at });
        changed++;
      } catch (e) { log.error(`[publisher] status of ${i.id}: ${e.message}`); }
    }
    return changed;
  }

  // One client's run: refuses to send anything unless publishing is on and the location still reads back
  async function runClient(clientId) {
    const out = { client: clientId, scheduled: 0, posted: 0, failed: 0, waiting: 0, stopped: null };
    const conn = await store.connection(clientId);
    if (!conn || !conn.publishing_on) { out.stopped = 'publishing is off'; return out; }
    if (conn.status !== 'connected' && conn.status !== 'problem') { out.stopped = 'not connected'; return out; }
    if (!(await checkOrStop(clientId, conn))) { out.stopped = 'the location did not read back'; return out; }
    await syncPosts(clientId);
    await refreshStatuses(clientId);
    // Left mid send by a restart. A post is safe to try again (its reference key finds it); a photo may
    // already be on the profile, and bundle.social cannot say, so a person looks first.
    for (const i of await store.items(clientId)) {
      if (i.status !== 'sending') continue;
      await store.updateItem(i.id, i.kind === 'photo' ? { status: 'failed', error: 'The run stopped while this photo was going up. Check the Google profile before pressing Retry.' } : { status: 'queued' });
    }
    const day = today(), ahead = P.addDays(day, LOOKAHEAD_DAYS);
    for (const item of await store.items(clientId)) {
      if (item.status !== 'queued') continue;
      if (item.due_date < day) {
        await store.updateItem(item.id, { status: 'failed', error: 'Its date passed before it went out. Retry sends it now.' });
        out.failed++;
        continue;
      }
      const due = item.kind === 'photo' ? item.due_date === day : item.due_date <= ahead;
      if (!due) continue;
      if (item.kind === 'post' && await store.postsOnDay(clientId, item.due_date) >= limit()) {
        await store.updateItem(item.id, { error: `${limit()} posts are already set for that day on this location, the daily limit. It tries again on the next run.` });
        out.waiting++;
        continue;
      }
      const s = await sendItem(item, conn);
      if (s === 'posted') out.posted++;
      else if (s === 'scheduled') out.scheduled++;
      else if (s === 'failed') out.failed++;
      else out.waiting++;
    }
    return out;
  }

  // The daily job. Once a day however often it is called; one client's trouble never stops the next.
  async function runDaily() {
    const day = today();
    if (!(await store.claimRun(day))) return { ran: false, day };
    const summary = { clients: [] };
    for (const clientId of await store.publishingClients()) {
      try { summary.clients.push(await runClient(clientId)); }
      catch (e) { log.error(`[publisher] ${clientId}: ${e.message}`); summary.clients.push({ client: clientId, stopped: e.message }); }
    }
    await store.finishRun(day, summary);
    return { ran: true, day, summary };
  }

  // A person pressing Send now or Retry. Publishing must be on, and the location must still read back.
  async function sendNow(clientId, itemId) {
    const conn = await store.connection(clientId);
    if (!conn || !conn.publishing_on) throw bad('Switch publishing on for this client first.', 409);
    const item = await store.item(clientId, itemId);
    if (!item) throw bad('No such item.', 404);
    if (!['queued', 'failed'].includes(item.status)) throw bad(`This item is ${item.status}, so there is nothing to send.`, 409);
    if (!(await checkOrStop(clientId, conn))) throw bad((await store.connection(clientId)).problem, 409);
    // A post fails on or after its date, so its date is the earliest the 14 days can have started
    if (item.status === 'failed' && item.external_id && item.kind === 'post' && P.addDays(item.due_date, UPLOAD_KEEP_DAYS) < today()) {
      // Its photo is gone from bundle.social: cancel the old post and send it again. The old id stays
      // on the row until the new post is made, so a run that stops halfway never makes two.
      try { await getPublisher().cancelPost(item.external_id); } catch (e) { if (e.status !== 404) throw e; }
      const fix = item.due_date < today() ? { due_date: today() } : {};
      await store.updateItem(item.id, { status: 'queued', ...fix });
      await sendItem({ ...item, ...fix, status: 'queued' }, conn);
      return store.item(clientId, itemId);
    }
    if (item.status === 'failed' && item.external_id && item.kind === 'post') {
      await getPublisher().retryPost(item.external_id);
      await store.updateItem(item.id, { status: 'scheduled', error: null, attempts: (item.attempts || 0) + 1 });
      return store.item(clientId, itemId);
    }
    // A date already past goes out now, not on the old date
    const fix = item.due_date < today() ? { due_date: today() } : {};
    if (fix.due_date) await store.updateItem(item.id, fix);
    await sendItem({ ...item, ...fix }, conn);
    return store.item(clientId, itemId);
  }

  // Delete by where it has got to: only a published post needs Google's own delete
  async function deleteItem(clientId, itemId) {
    const item = await store.item(clientId, itemId);
    if (!item) throw bad('No such item.', 404);
    const conn = await store.connection(clientId);
    const pub = () => getPublisher();
    if (item.status === 'sending') throw bad('This item is being sent right now. Try again in a moment.', 409);
    if (item.status === 'planned' || item.status === 'queued' && !item.external_id) { /* never left Copybot */ }
    else if (item.kind === 'photo') { if (item.media_name) await pub().removePhoto(conn.team_id, item.media_name); }
    else if (item.external_id) {
      const remote = await pub().postStatus(item.external_id);
      if (remote.status === 'posted') await pub().removeLivePost(conn.team_id, item.external_id);
      else if (remote.status !== 'deleted') await pub().cancelPost(item.external_id);
    }
    // Kept as deleted: a post's item is not made again, and a Photo Drip photo is not used again
    await store.updateItem(item.id, { status: 'deleted', error: null });
    return store.item(clientId, itemId);
  }

  // ── Photo Drip ──
  // Every photo in the folder gets one row, ever. Used before, by file or by its contents: never again.
  async function dripState(clientId) {
    const read = await driveStore.read(clientId);
    const files = read ? read.files.filter(f => f.kind === 'drip') : [];
    const items = (await store.items(clientId)).filter(i => i.kind === 'photo');
    const usedIds = new Set(items.map(i => i.drive_file_id)), usedMd5 = new Set(items.map(i => i.md5).filter(Boolean));
    const seenMd5 = new Set();
    const unused = files.filter(f => {
      if (f.problem || usedIds.has(f.file_id) || (f.md5 && usedMd5.has(f.md5)) || (f.md5 && seenMd5.has(f.md5))) return false;
      if (f.md5) seenMd5.add(f.md5);
      return true;
    });
    const active = items.filter(i => ['planned', 'queued', 'sending', 'failed'].includes(i.status));
    const last = active.map(i => i.due_date).sort().pop() || null;
    return { folder: DRIP_ROOT, found: !!(read && read.drip_found), total: files.length, left: unused.length, unused, planned: items.filter(i => i.status === 'planned').length, queued: items.filter(i => i.status === 'queued').length, posted: items.filter(i => i.status === 'posted').length, problems: files.filter(f => f.problem).length, last_date: last, ran_out: !!(read && read.drip_found) && unused.length === 0 && (!last || last <= P.addDays(today(), RAN_OUT_DAYS)), days: dripDays(clientId), category: DRIP_CATEGORY };
  }

  async function planDrip(clientId) {
    const state = await dripState(clientId);
    if (!state.unused.length) throw bad('Every Photo Drip photo has been used or planned. Ask the client for more photos.', 409);
    const items = (await store.items(clientId)).filter(i => i.kind === 'photo' && i.status !== 'deleted');
    const lastDue = items.map(i => i.due_date).sort().pop();
    const from = lastDue && lastDue >= today() ? P.addDays(lastDue, 1) : P.addDays(today(), 1);
    const list = state.unused.slice(0, DRIP_MAX_PLAN);
    const days = nextDays(from, dripDays(clientId), list.length);
    for (let i = 0; i < list.length; i++) await store.addItem({ client_id: clientId, kind: 'photo', drive_file_id: list[i].file_id, file_name: list[i].name, md5: list[i].md5, category: DRIP_CATEGORY, due_date: days[i], due_time: DRIP_TIME, status: 'planned' });
    return list.length;
  }

  async function approveDrip(clientId) {
    const planned = (await store.items(clientId)).filter(i => i.kind === 'photo' && i.status === 'planned');
    if (!planned.length) throw bad('There is no Photo Drip plan to approve.', 409);
    for (const i of planned) await store.updateItem(i.id, { status: 'queued' });
    return planned.length;
  }

  return { locations, connect, setPublishing, syncPosts, beforeUnapprove, sendItem, runClient, runDaily, refreshStatuses, sendNow, deleteItem, dripState, planDrip, approveDrip };
}

module.exports = { UPLOAD_KEEP_DAYS, createPublishing, ukToUtc, closeness, dripDays, LOOKAHEAD_DAYS, DRIP_CATEGORY, DRIP_TIME };
