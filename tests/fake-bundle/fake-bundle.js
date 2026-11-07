'use strict';
// A fake bundle.social, for fixtures and the demo: never the real service. It follows the API reference
// as read on 7 Nov 2026, and it is strict where the reference is: a button on an Offer post, two images,
// over 1,500 characters and an unknown media field are all refused, so a wrong call fails here first.
// What the reference leaves open is marked ASSUMED, and is what the first real test has to prove.
//   createFakeBundle({ apiKey }) → { app, state, publish(id), fail(id, message), failNext(path, status), teamNamed(name) }

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const TYPE = 'GOOGLE_BUSINESS';
const CATEGORIES = ['CATEGORY_UNSPECIFIED', 'COVER', 'PROFILE', 'LOGO', 'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'ROOMS', 'TEAMS', 'ADDITIONAL'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const id = p => `${p}_${crypto.randomBytes(6).toString('hex')}`;

function createFakeBundle({ apiKey = 'fake-key' } = {}) {
  const state = { teams: [], accounts: [], uploads: [], posts: [], media: [], calls: [], nextFailure: [] };
  const app = express();
  app.use(express.json());
  const refuse = (res, status, message, issues) => res.status(status).json({ statusCode: status, message, ...(issues ? { issues } : {}) });

  app.use((req, res, next) => {
    state.calls.push(`${req.method} ${req.path}`);
    if (req.headers['x-api-key'] !== apiKey) return refuse(res, 401, 'Unauthorized');
    const at = state.nextFailure.findIndex(f => req.path.includes(f.path));
    if (at >= 0) { const [f] = state.nextFailure.splice(at, 1); return refuse(res, f.status, f.message || 'failed on purpose'); }
    next();
  });

  const teamOf = t => ({ ...t, socialAccounts: state.accounts.filter(a => a.teamId === t.id) });
  app.get('/api/v1/team/', (req, res) => {
    const offset = Number(req.query.offset || 0), limit = Number(req.query.limit || 10);
    res.json({ total: state.teams.length, items: state.teams.slice(offset, offset + limit).map(teamOf) });
  });
  app.post('/api/v1/team/', (req, res) => {
    const name = String((req.body && req.body.name) || '');
    if (name.length < 3 || name.length > 80) return refuse(res, 400, 'Validation failed', [{ path: ['name'], message: 'must be 3 to 80 characters' }]);
    const t = { id: id('team'), name, organizationId: 'org_1', createdById: 'user_1' };
    state.teams.push(t);
    res.json(t);
  });

  const accountIn = teamId => state.accounts.find(a => a.teamId === teamId && a.type === TYPE && !a.deletedAt);
  app.get('/api/v1/social-account/by-type', (req, res) => {
    const a = accountIn(req.query.teamId);
    return a ? res.json(a) : refuse(res, 404, 'Not found');   // ASSUMED: the reference does not say when it answers 404
  });
  // The reference: resetChannel covers only Facebook, Instagram, LinkedIn and YouTube, so a Google
  // Business copy keeps the source team's selected location.
  app.post('/api/v1/social-account/copy', (req, res) => {
    const { fromTeamId, toTeamId, socialAccountTypes } = req.body || {};
    if (!fromTeamId || !toTeamId || !Array.isArray(socialAccountTypes) || !socialAccountTypes.length) return refuse(res, 400, 'Validation failed');
    const source = accountIn(fromTeamId);
    if (!source) return refuse(res, 404, 'Not found');
    const copy = { ...JSON.parse(JSON.stringify(source)), id: id('acct'), teamId: toTeamId };
    state.accounts = state.accounts.filter(a => !(a.teamId === toTeamId && a.type === TYPE));   // one account per network on a team
    state.accounts.push(copy);
    res.json([copy]);
  });
  app.post('/api/v1/social-account/refresh-channels', (req, res) => {
    const a = accountIn(req.body && req.body.teamId);
    return a ? res.json(a) : refuse(res, 404, 'Not found');
  });
  app.post('/api/v1/social-account/set-channel', (req, res) => {
    const a = accountIn(req.body && req.body.teamId);
    if (!a) return refuse(res, 404, 'Not found');
    if (!(a.channels || []).some(c => c.id === req.body.channelId)) return refuse(res, 400, 'That channel is not on this account.');
    if (!state.setChannelIgnored) a.externalId = req.body.channelId;   // ASSUMED: externalId holds the selected location
    res.json(a);
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 90 * 1024 * 1024 } });
  app.post('/api/v1/upload/', upload.single('file'), (req, res) => {
    if (!req.file) return refuse(res, 400, 'No file.');
    const u = { id: id('upload'), type: 'image', teamId: req.body.teamId, fileSize: req.file.size, mime: req.file.mimetype, bytes: req.file.buffer.toString('latin1'), filename: req.file.originalname };
    state.uploads.push(u);
    res.json({ id: u.id, type: u.type, teamId: u.teamId, fileSize: u.fileSize, mime: u.mime, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  });
  const uploadOk = uid => { const u = state.uploads.find(x => x.id === uid); if (!u) return 'unknown upload'; if (!IMAGE_TYPES.includes(u.mime)) return 'not an image Google takes'; if (u.fileSize > 5 * 1024 * 1024) return 'over 5 MB'; return ''; };

  app.get('/api/v1/post/reference-key/:key', (req, res) => {
    const p = state.posts.find(x => x.referenceKey === req.params.key && x.status !== 'DELETED');
    return p ? res.json(p) : refuse(res, 404, 'Not found');
  });
  app.post('/api/v1/post/', (req, res) => {
    const b = req.body || {};
    const issues = [];
    const need = (ok, path, message) => { if (!ok) issues.push({ path: [path], message }); };
    need(b.teamId, 'teamId', 'required'); need(b.title, 'title', 'required'); need(b.postDate, 'postDate', 'required');
    need(['DRAFT', 'SCHEDULED'].includes(b.status), 'status', 'DRAFT or SCHEDULED');
    need(Array.isArray(b.socialAccountTypes) && b.socialAccountTypes.length, 'socialAccountTypes', 'required');
    need(!b.referenceKey || String(b.referenceKey).length <= 128, 'referenceKey', '1 to 128 characters');
    const d = (b.data || {})[TYPE] || {};
    need(d.text && [...d.text].length <= 1500, 'text', 'up to 1,500 characters');
    need(Array.isArray(d.uploadIds) && d.uploadIds.length <= 1, 'uploadIds', '0 or 1 image');
    for (const u of d.uploadIds || []) { const w = uploadOk(u); need(!w, 'uploadIds', w); }
    if (d.topicType === 'OFFER') {
      need(!d.callToActionType, 'callToActionType', 'rejected on an offer');
      need(d.eventStartDate, 'eventStartDate', 'required on an offer');
      need(d.offerCouponCode || d.offerRedeemOnlineUrl || d.offerTermsConditions, 'offer', 'a coupon, a link or terms');
      need(!d.eventTitle || d.eventTitle.length <= 58, 'eventTitle', 'up to 58 characters');
    } else {
      need(!d.callToActionType || ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'].includes(d.callToActionType), 'callToActionType', 'a known type');
      need(!d.callToActionType || d.callToActionType === 'CALL' || d.callToActionUrl, 'callToActionUrl', 'required but for CALL');
    }
    need(accountIn(b.teamId) && accountIn(b.teamId).externalId, 'teamId', 'no location selected');
    if (issues.length) return refuse(res, 400, 'Validation failed', issues);
    const p = { id: id('post'), teamId: b.teamId, title: b.title, referenceKey: b.referenceKey || null, postDate: b.postDate, postedDate: null, status: b.status, data: b.data, error: null, errors: null, errorsVerbose: null, externalData: null };
    state.posts.push(p);
    res.json(p);
  });
  const findPost = i => state.posts.find(x => x.id === i);
  app.get('/api/v1/post/:id', (req, res) => { const p = findPost(req.params.id); return p ? res.json(p) : refuse(res, 404, 'Not found'); });
  app.post('/api/v1/post/:id/retry', (req, res) => {
    const p = findPost(req.params.id);
    if (!p) return refuse(res, 404, 'Not found');
    const gone = (p.data && p.data.GOOGLE_BUSINESS && p.data.GOOGLE_BUSINESS.uploadIds || []).find(u => !state.uploads.some(x => x.id === u));
    if (gone) { p.status = 'ERROR'; p.errors = { GOOGLE_BUSINESS: 'Upload not found' }; return res.json(p); }
    p.status = 'RETRYING'; p.errors = null; p.errorsVerbose = null;
    res.json(p);
  });
  // The reference: this cancels a scheduled post; a published one stays live on Google
  app.delete('/api/v1/post/:id', (req, res) => {
    const p = findPost(req.params.id);
    if (!p) return refuse(res, 404, 'Not found');
    if (p.status === 'POSTED') p.stillLive = true;
    p.status = 'DELETED';
    res.json({ success: true });
  });
  app.delete('/api/v1/misc/google-business/post', (req, res) => {
    const p = findPost(req.body && req.body.postId);
    if (!p || p.teamId !== req.body.teamId) return refuse(res, 404, 'Not found');
    p.removedFromGoogle = true; p.status = 'DELETED';
    res.json({ success: true });
  });

  app.post('/api/v1/misc/google-business/media', (req, res) => {
    const b = req.body || {};
    const unknown = Object.keys(b).filter(k => !['teamId', 'uploadId', 'category', 'description'].includes(k));
    if (unknown.length) return refuse(res, 400, `Unknown fields: ${unknown.join(', ')}`);
    if (!b.teamId || !b.uploadId) return refuse(res, 400, 'teamId and uploadId are required.');
    if (b.category && !CATEGORIES.includes(b.category)) return refuse(res, 400, 'Unknown category.');
    const w = uploadOk(b.uploadId);
    if (w) return refuse(res, 400, w);
    const a = accountIn(b.teamId);
    if (!a || !a.externalId) return refuse(res, 400, 'No location selected.');
    const name = `accounts/1/locations/${a.externalId}/media/${id('m')}`;
    const m = { name, googleUrl: `https://lh3.example/${name}`, mediaFormat: 'PHOTO', locationAssociation: { category: b.category || 'ADDITIONAL' }, teamId: b.teamId, uploadId: b.uploadId, location: a.externalId, at: Date.now() };
    state.media.push(m);
    res.json(m);
  });
  app.delete('/api/v1/misc/google-business/media', (req, res) => {
    const at = state.media.findIndex(m => m.name === (req.body && req.body.mediaName) && m.teamId === req.body.teamId);
    if (at < 0) return refuse(res, 404, 'Not found');
    state.media.splice(at, 1);
    res.json({ success: true });
  });

  return {
    app, state,
    teamNamed: name => state.teams.find(t => t.name === name),
    // A team holding a connected Google login with these locations, its selection on the first
    addSource(name, locations) {
      const t = { id: id('team'), name, organizationId: 'org_1', createdById: 'user_1' };
      state.teams.push(t);
      const channels = locations.map(l => ({ id: l.id, name: l.name, username: null, address: l.address || '', avatarUrl: null, webhook: null, metadata: null }));
      state.accounts.push({ id: id('acct'), type: TYPE, teamId: t.id, channels, externalId: channels.length ? channels[0].id : null, deleteOn: null, deletedAt: null });
      return t;
    },
    publish(postId) { const p = findPost(postId); p.status = 'POSTED'; p.postedDate = new Date().toISOString(); p.externalData = { [TYPE]: { id: 'g1', permalink: `https://business.google.example/${postId}` } }; },
    fail(postId, message) { const p = findPost(postId); p.status = 'ERROR'; p.errors = { [TYPE]: message }; p.errorsVerbose = { [TYPE]: { userFacingMessage: message } }; },
    failNext(path, status, message) { state.nextFailure.push({ path, status, message }); },
    accountIn,
  };
}

module.exports = { createFakeBundle };
