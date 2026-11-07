'use strict';

// ── The bundle.social publisher ──────────────────────────────────────────────
// One implementation of the interface in publisher/index.js. Every call is here and nowhere else, so
// Google's own API can replace it. The endpoints are bundle.social's API reference, read 7 Nov 2026.
// Photos go up as file uploads: never a public Drive link. The key never goes in a message.
//
// Not yet proven against the real service: the docs do not name the field holding the chosen location.
// They say externalId is empty until a channel is set, so checkAccount reads it as the channel id.

const FormDataCtor = globalThis.FormData;
const BlobCtor = globalThis.Blob;
const TYPE = 'GOOGLE_BUSINESS';
const BASE = 'https://api.bundle.social/api/v1';
const MAX_TEAM_PAGES = 50;

const STATUS = { DRAFT: 'scheduled', SCHEDULED: 'scheduled', PROCESSING: 'scheduled', REVIEW: 'scheduled', RETRYING: 'scheduled', POSTED: 'posted', ERROR: 'failed', DELETED: 'deleted' };

function createBundlePublisher({ apiKey, baseUrl = BASE, fetchImpl = (...a) => fetch(...a), log = console }) {
  const scrub = m => { let s = String(m == null ? '' : m); if (apiKey) s = s.split(apiKey).join('[hidden]'); return s.slice(0, 400); };

  async function call(method, path, { body, form, allow404 = false } = {}) {
    const headers = { 'x-api-key': apiKey };
    if (body) headers['Content-Type'] = 'application/json';
    let res;
    try { res = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) }); }
    catch (e) { throw Object.assign(new Error(`bundle.social could not be reached: ${scrub(e.message)}`), { status: 502, transient: true }); }
    if (allow404 && res.status === 404) return null;
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    const detail = Array.isArray(data.issues) && data.issues.length ? `: ${data.issues.map(i => `${(i.path || []).join('.')} ${i.message}`).join('; ')}` : '';
    throw Object.assign(new Error(`bundle.social said ${res.status}: ${scrub(data.message || 'no reason given')}${scrub(detail)}`), { status: res.status, transient: res.status === 429 || res.status >= 500 });
  }

  // ── Teams and locations ──
  async function teams() {
    const out = [];
    for (let page = 0; page < MAX_TEAM_PAGES; page++) {
      const data = await call('GET', `/team/?offset=${page * 50}&limit=50`);
      out.push(...(data.items || []));
      if (out.length >= (data.total || 0) || !(data.items || []).length) break;
    }
    return out;
  }

  // The source teams by name, each with its current locations. A source that fails says so and the
  // other still lists: [{ name, team_id, locations: [{ channel_id, name, address }], error }]
  async function locations(sourceNames) {
    const all = await teams();
    const out = [];
    for (const name of sourceNames) {
      const team = all.find(t => t.name === name);
      if (!team) { out.push({ name, team_id: '', locations: [], error: `No team called "${name}" on the account.` }); continue; }
      try {
        const account = await call('POST', '/social-account/refresh-channels', { body: { type: TYPE, teamId: team.id } });
        out.push({ name, team_id: team.id, locations: (account.channels || []).map(c => ({ channel_id: c.id, name: c.name || c.username || '', address: c.address || '' })), error: null });
      } catch (e) { log.error(`[publisher] ${name}: ${e.message}`); out.push({ name, team_id: team.id, locations: [], error: e.message }); }
    }
    return out;
  }

  const createTeam = async name => (await call('POST', '/team/', { body: { name: String(name).slice(0, 80).padEnd(3, ' ') } })).id;
  const accountFor = teamId => call('GET', `/social-account/by-type?type=${TYPE}&teamId=${encodeURIComponent(teamId)}`, { allow404: true });
  const copyAccount = (fromTeamId, toTeamId) => call('POST', '/social-account/copy', { body: { fromTeamId, toTeamId, socialAccountTypes: [TYPE] } });
  const setChannel = (teamId, channelId) => call('POST', '/social-account/set-channel', { body: { type: TYPE, teamId, channelId } });

  // Is this team still on this location? Read fresh every time.
  async function checkAccount({ teamId, channelId }) {
    const account = await accountFor(teamId);
    if (!account) return { ok: false, reason: 'The Google Business account is no longer on this client\'s team.' };
    if (account.deleteOn || account.deletedAt) return { ok: false, reason: 'Google has disconnected this account. Reconnect it in the source team.' };
    if (!account.externalId) return { ok: false, reason: 'No location is selected on this client\'s team.' };
    if (account.externalId !== channelId) return { ok: false, reason: `This client's team is on a different location from the one chosen (${account.externalId}).` };
    return { ok: true, account_id: account.id };
  }

  // ── Photos and posts ──
  async function uploadPhoto({ teamId, bytes, filename, mime }) {
    const form = new FormDataCtor();
    form.append('teamId', teamId);
    form.append('file', new BlobCtor([bytes], { type: mime }), filename);
    return (await call('POST', '/upload/', { form })).id;
  }

  function postData(post, uploadId, when) {
    const data = { text: post.body, uploadIds: [uploadId], languageCode: 'en-GB' };
    if (post.topic === 'OFFER') {
      return { ...data, topicType: 'OFFER', eventTitle: post.offer_title, eventStartDate: when.offerStart, eventEndDate: when.offerEnd, offerRedeemOnlineUrl: post.offer_redeem_url };
    }
    return { ...data, topicType: 'STANDARD', callToActionType: post.cta_type, ...(post.cta_type === 'CALL' ? {} : { callToActionUrl: post.cta_url }) };
  }

  async function schedulePost({ teamId, post, uploadId, referenceKey, when }) {
    // A run that stopped after creating this post must not create it again
    const existing = await call('GET', `/post/reference-key/${encodeURIComponent(referenceKey)}`, { allow404: true });
    if (existing && existing.id) return { id: existing.id, status: STATUS[existing.status] || 'scheduled', reused: true };
    const made = await call('POST', '/post/', { body: { teamId, title: post.prompt_label ? String(post.prompt_label).slice(0, 120) : `Post ${post.seq}`, postDate: when.postAt, status: 'SCHEDULED', socialAccountTypes: [TYPE], referenceKey, data: { [TYPE]: postData(post, uploadId, when) } } });
    return { id: made.id, status: STATUS[made.status] || 'scheduled', reused: false };
  }

  async function postStatus(id) {
    const p = await call('GET', `/post/${encodeURIComponent(id)}`, { allow404: true });
    if (!p) return { status: 'deleted', error: 'bundle.social no longer has this post.', link: '', posted_at: null };
    const external = (p.externalData && p.externalData[TYPE]) || {};
    const verbose = p.errorsVerbose && p.errorsVerbose[TYPE];
    return { status: STATUS[p.status] || 'scheduled', error: (verbose && verbose.userFacingMessage) || (p.errors && p.errors[TYPE]) || p.error || '', link: external.permalink || '', posted_at: p.postedDate || null };
  }

  const retryPost = id => call('POST', `/post/${encodeURIComponent(id)}/retry`);
  const cancelPost = id => call('DELETE', `/post/${encodeURIComponent(id)}`);
  // Only this one takes a published post off Google: DELETE /post/{id} leaves it live
  const removeLivePost = (teamId, postId) => call('DELETE', '/misc/google-business/post', { body: { teamId, postId } });

  async function addPhoto({ teamId, uploadId, category }) {
    const m = await call('POST', '/misc/google-business/media', { body: { teamId, uploadId, category } });
    return { name: m.name || '', link: m.googleUrl || '' };
  }
  const removePhoto = (teamId, mediaName) => call('DELETE', '/misc/google-business/media', { body: { teamId, mediaName } });

  return { name: 'bundle.social', locations, createTeam, accountFor, copyAccount, setChannel, checkAccount, uploadPhoto, schedulePost, postStatus, retryPost, cancelPost, removeLivePost, addPhoto, removePhoto };
}

module.exports = { createBundlePublisher, BASE };
