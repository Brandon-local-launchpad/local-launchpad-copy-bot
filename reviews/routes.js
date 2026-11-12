'use strict';

// ── Review replies routes ────────────────────────────────────────────────────
//   GET  /api/reviews/queue                         the approval queue across clients, oldest first
//   GET  /api/reviews/count                         how many wait, and how many are over 24 and 48 hours
//   POST /api/reviews/:reviewId/check               { text } → the draft checks on an edited reply
//   POST /api/reviews/:reviewId/approve             { text, real_customer_checked, reported, replace_existing, by }
//   POST /api/reviews/:reviewId/neutral             { reported, by } swaps in the neutral reply
//   POST /api/reviews/:reviewId/regenerate          { by }
//   POST /api/reviews/:reviewId/no-reply            { reason, by }
//   GET  /api/clients/:id/reviews                   the settings (saved, else suggested), counts, backlog, recent
//   PUT  /api/clients/:id/reviews/settings          the settings
//   POST /api/clients/:id/reviews/sync              runs the sync for this client now
//   POST /api/clients/:id/reviews/backlog/draft     drafts the backlog for approval (never posts)
// Posting goes through reviews/post.js only, which holds every rule.

const F = require('./fields');
const D = require('./draft');
const { postReply, postingEnabled } = require('./post');
const { LOW_CAPACITY } = require('./sync');

const str = v => (v == null ? '' : String(v)).trim();
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mountReviewsApi(app, { pool, store, sync, getBundle, suggestFor = async () => ({}), connectionFor = async () => null, bundleConfigured = () => true, env = process.env, now = () => new Date(), log = console }) {
  const at = () => now().toISOString();
  const bad = (m, status = 400) => Object.assign(new Error(m), { status });
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[reviews]', err); res.status(err.status || 500).json({ error: err.message, code: err.code || null, missing: err.missing || null }); }
  };
  const hours = iso => (iso ? Math.max(0, (now().getTime() - Date.parse(iso)) / 3600000) : 0);

  async function item(r, settingsCache = new Map()) {
    if (!settingsCache.has(r.client_id)) settingsCache.set(r.client_id, await store.settings(r.client_id));
    const s = settingsCache.get(r.client_id) || {};
    const d = await store.draft(r.draft_id);
    const actions = await store.actionsFor(r.id);
    return {
      id: r.id, client_id: r.client_id, client_name: r.client_name || '', status: r.status, stars: r.stars, reviewer_name: r.reviewer_name,
      first_name: D.firstName(r.reviewer_name), comment: r.comment, create_time: r.create_time, queued_at: r.queued_at, age_hours: Math.round(hours(r.queued_at) * 10) / 10,
      flag: r.flag, last_error: r.last_error, google_reply: r.google_reply, source: r.source,
      draft: d ? { id: d.id, text: d.text, ok: d.ok, problems: d.problems, source: d.source } : null,
      reported: actions.some(a => a.action === 'neutral' && a.reported), missing: F.missing(s),
    };
  }

  app.get('/api/reviews/queue', wrap(async (req, res) => {
    const cache = new Map();
    const items = [];
    for (const r of await store.queue()) items.push(await item(r, cache));
    res.json({ posting: postingEnabled(env), items });
  }));
  app.get('/api/reviews/count', wrap(async (req, res) => {
    const q = (await store.queue()).filter(r => r.status === 'queued');
    res.json({ queued: q.length, over24: q.filter(r => hours(r.queued_at) >= 24).length, over48: q.filter(r => hours(r.queued_at) >= 48).length });
  }));

  const queued = async id => {
    const r = await store.review(id);
    if (!r) throw bad('Review not found.', 404);
    if (r.status !== 'queued') throw bad('This review is not waiting in the queue any more.', 409);
    return r;
  };
  app.post('/api/reviews/:reviewId/check', wrap(async (req, res) => {
    const r = await store.review(req.params.reviewId);
    if (!r) throw bad('Review not found.', 404);
    const s = await store.settings(r.client_id);
    res.json({ problems: D.validate(str(req.body && req.body.text), { stars: r.stars, fields: s || {}, comment: r.comment, reviewerName: r.reviewer_name, recent: r.stars >= 4 ? await store.recentTexts(r.client_id, 10) : [] }) });
  }));
  app.post('/api/reviews/:reviewId/approve', wrap(async (req, res) => {
    const b = req.body || {};
    if (!postingEnabled(env)) throw bad('Posting review replies is switched off on this server (REVIEW_REPLIES_POSTING). Nothing was recorded.', 503);
    const r = await queued(req.params.reviewId);
    const text = str(b.text);
    if (!text) throw bad('The reply is empty.');
    const d = await store.draft(r.draft_id);
    const neutral = !!(d && d.source === 'neutral' && text.replace(/\s+/g, ' ') === str(d.text).replace(/\s+/g, ' '));
    if (neutral && !b.reported) throw bad('Tick "Reported on Google" before posting the neutral reply.');
    if (!neutral && !b.real_customer_checked) throw bad('Tick "Real customer checked" before you approve.');
    if (r.google_reply && !b.replace_existing) throw bad('Google already has a reply on this review. Tick "Replace existing reply" to overwrite it.');
    const actionId = await store.addAction({ review_id: r.id, client_id: r.client_id, action: neutral ? 'approve_neutral' : 'approve', text, real_customer_checked: !!b.real_customer_checked, reported: !!b.reported, replace_existing: !!b.replace_existing, by: str(b.by).slice(0, 80), at: at() });
    const result = await postReply({ store, bundle: getBundle(), reviewId: r.id, actionId, env, now, by: str(b.by).slice(0, 80) });
    res.json({ ...result, item: await item(await store.review(r.id)) });
  }));
  app.post('/api/reviews/:reviewId/neutral', wrap(async (req, res) => {
    const b = req.body || {};
    const r = await queued(req.params.reviewId);
    if (!b.reported) throw bad('Report the review on Google first (Report review, the closest reason), then tick "Reported on Google".');
    const text = F.neutralReply(await store.settings(r.client_id));
    const id = await store.addDraft({ review_id: r.id, client_id: r.client_id, source: 'neutral', template: 'neutral', text, ok: true, problems: [], at: at() });
    await store.addAction({ review_id: r.id, client_id: r.client_id, action: 'neutral', text, reported: true, by: str(b.by).slice(0, 80), at: at() });
    await store.updateReview(r.id, { draft_id: id }, at());
    res.json({ item: await item(await store.review(r.id)) });
  }));
  app.post('/api/reviews/:reviewId/regenerate', wrap(async (req, res) => {
    await queued(req.params.reviewId);
    await sync.regenerate(req.params.reviewId, { by: str(req.body && req.body.by).slice(0, 80) });
    res.json({ item: await item(await store.review(req.params.reviewId)) });
  }));
  app.post('/api/reviews/:reviewId/no-reply', wrap(async (req, res) => {
    const b = req.body || {};
    const r = await queued(req.params.reviewId);
    const reason = str(b.reason);
    if (!reason) throw bad('Say why there is no reply.');
    await store.addAction({ review_id: r.id, client_id: r.client_id, action: 'no_reply', reason: reason.slice(0, 500), by: str(b.by).slice(0, 80), at: at() });
    if (!(await store.claim(r.id, ['queued'], 'no_reply', { last_error: null }, at()))) throw bad('This review moved on before it could be closed.', 409);
    res.json({ ok: true });
  }));

  // ── One client ──
  async function clientView(clientId) {
    const { rows } = await pool.query(`SELECT id, name FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    const saved = await store.settings(clientId);
    const suggested = await suggestFor(clientId).catch(e => { log.error('[reviews] suggestions:', e.message); return {}; });
    const fields = {};
    const fromSuggestion = [];
    for (const k of F.KEYS) {
      if (saved && str(saved[k])) fields[k] = saved[k];
      else { fields[k] = str(suggested[k]); if (fields[k]) fromSuggestion.push(k); }
    }
    const settings = { ...(saved || {}), ...fields, phone_confirmed: !!(saved && saved.phone_confirmed), email_confirmed: !!(saved && saved.email_confirmed), auto_post: !!(saved && saved.auto_post), leadsnap_checked: !!(saved && saved.leadsnap_checked) };
    const conn = await connectionFor(clientId);
    const counts = await store.counts(clientId);
    const run = await store.lastRun();
    const mine = run && run.summary && (run.summary.clients || []).find(c => c.client_id === clientId);
    const recent = (await store.reviews(clientId)).slice(0, 40).map(r => ({ id: r.id, stars: r.stars, reviewer_name: r.reviewer_name, comment: r.comment, create_time: r.create_time, status: r.status, flag: r.flag, google_reply: r.google_reply, last_error: r.last_error }));
    return {
      client: rows[0].name, fields: F.FIELDS, settings, saved: !!saved, from_suggestion: fromSuggestion, missing: F.missing(saved || {}),
      connection: conn ? { status: conn.status, location_name: conn.location_name, team_id: conn.team_id } : null,
      counts, backlog: counts.backlog || 0, queued: counts.queued || 0,
      capacity: mine && mine.capacity != null ? mine.capacity : null, low_capacity: !!(mine && mine.capacity != null && mine.capacity <= LOW_CAPACITY),
      last_run: run ? { started_at: run.started_at, finished_at: run.finished_at, mine: mine || null } : null,
      posting: postingEnabled(env), bundle: bundleConfigured(), recent,
    };
  }
  app.get('/api/clients/:clientId/reviews', wrap(async (req, res) => res.json(await clientView(req.params.clientId))));
  app.put('/api/clients/:clientId/reviews/settings', wrap(async (req, res) => {
    const b = req.body || {};
    const id = req.params.clientId;
    const { rows } = await pool.query(`SELECT id FROM clients WHERE id=$1`, [id]);
    if (!rows.length) throw bad('Client not found.', 404);
    const old = (await store.settings(id)) || {};
    const f = {};
    for (const k of F.KEYS) if (k in b) f[k] = str(b[k]).slice(0, 300);
    if ('live_from' in b) { const v = str(b.live_from); if (v && !DAY.test(v)) throw bad('The live from date is a date, like 2026-11-10.'); f.live_from = v || null; }
    if ('approver_email' in b) { const v = str(b.approver_email); if (v && !EMAIL.test(v)) throw bad('The approver email is not an email address.'); f.approver_email = v || null; }
    if ('approver_name' in b) f.approver_name = str(b.approver_name).slice(0, 80) || null;
    for (const k of ['phone_confirmed', 'email_confirmed', 'auto_post']) if (k in b) f[k] = !!b[k];
    // A changed number or email needs confirming again
    if ('direct_phone' in f && f.direct_phone !== str(old.direct_phone) && !('phone_confirmed' in b)) f.phone_confirmed = false;
    if ('direct_email' in f && f.direct_email !== str(old.direct_email) && !('email_confirmed' in b)) f.email_confirmed = false;
    if ('leadsnap_checked' in b) Object.assign(f, b.leadsnap_checked ? { leadsnap_checked: true, leadsnap_checked_at: old.leadsnap_checked ? old.leadsnap_checked_at : at(), leadsnap_checked_by: old.leadsnap_checked ? old.leadsnap_checked_by : str(b.by).slice(0, 80) || null } : { leadsnap_checked: false, leadsnap_checked_at: null, leadsnap_checked_by: null });
    if (f.auto_post && !str(f.live_from || old.live_from)) throw bad('Set the live from date before switching on automatic posting.');
    await store.saveSettings(id, f, { by: str(b.by).slice(0, 80), at: at() });
    res.json(await clientView(id));
  }));
  app.post('/api/clients/:clientId/reviews/sync', wrap(async (req, res) => {
    if (!bundleConfigured()) throw bad('BUNDLE_SOCIAL_API_KEY is not set on this server.', 503);
    const r = await sync.runSync({ clientId: req.params.clientId });
    if (!r.ran) throw bad(r.reason, 409);
    res.json({ result: r.summary.clients[0] || null, view: await clientView(req.params.clientId) });
  }));
  app.post('/api/clients/:clientId/reviews/backlog/draft', wrap(async (req, res) => {
    const r = await sync.draftBacklog(req.params.clientId);
    res.json({ ...r, view: await clientView(req.params.clientId) });
  }));
}

module.exports = { mountReviewsApi };
