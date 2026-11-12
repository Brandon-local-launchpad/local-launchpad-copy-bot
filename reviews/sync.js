'use strict';

// ── Review replies: the sync, and the drafting the queue's buttons share ─────
// Brandon's brief, section 5. runSync() is what the reviews-sync cron service runs every 6 hours:
//   for each connected client: an import of 50, waited for; every page of the list saved by id; the
//   go-live rule (older reviews are backlog, never drafted on their own); a reply already there is
//   already_replied; a draft from the rating's template, checked, written once more on a failure; then
//   a 4 or 5 star draft that passed posts when the client is on automatic, and everything else is queued
//   for a person, who is emailed.
// Safe to run twice: a run takes the lock; each review moves through its states by a claim, so one run
// drafts it and one post goes out; a run that stopped half way is picked up by the next one.

const F = require('./fields');
const D = require('./draft');
const { postReply, recoverPosting, postingEnabled } = require('./post');

const IMPORT_COUNT = 50;
const PAGE = 100;
const MAX_PAGES = 100;
const LOW_CAPACITY = 10;
const STUCK_MS = 10 * 60 * 1000;
const ALERT_MS = 48 * 3600 * 1000;
const LOCK_MS = 60 * 60 * 1000;

const str = v => (v == null ? '' : String(v)).trim();
const norm = s => str(s).replace(/\s+/g, ' ');
const ms = iso => (iso ? Date.parse(iso) : NaN);

// The fields saved for a review, from bundle.social's review object
function fromBundle(b) {
  return {
    id: b.id, team_id: b.teamId, external_review_id: b.externalReviewId, reviewer_name: b.reviewerDisplayName || '',
    stars: F.starsOf(b.starRating) || null, comment: b.comment || '', google_reply: b.reviewReplyComment || null,
    google_reply_at: b.reviewReplyUpdatedAt || null, reply_state: b.reviewReplyState || null, policy_violation: b.reviewReplyPolicyViolation || null,
    create_time: b.createTime || null, update_time: b.updateTime || null, deleted_at: b.deletedAt || null, raw: b,
  };
}
// The go-live rule: created on or after the live from date (a UK date) is live; anything before is backlog
const isLive = (createTime, liveFrom) => !!str(liveFrom) && str(createTime) !== '' && ms(createTime) >= Date.parse(`${str(liveFrom)}T00:00:00Z`) - 3600 * 1000 * (isBst(liveFrom) ? 1 : 0);
function isBst(day) {   // last Sunday of March to last Sunday of October
  const d = new Date(`${day}T12:00:00Z`), y = d.getUTCFullYear();
  const lastSun = m => { const x = new Date(Date.UTC(y, m + 1, 0)); x.setUTCDate(x.getUTCDate() - x.getUTCDay()); return x; };
  return d >= lastSun(2) && d < lastSun(9);
}

function createReviewSync({ store, publishStore, getBundle, callModel, model = null, effort = null, notify = null, env = process.env, now = () => new Date(), sleep = t => new Promise(r => setTimeout(r, t)), pollMs = 15000, maxWaitMs = 15 * 60 * 1000, log = console }) {
  const at = () => now().toISOString();

  // ── One review in, saved or updated, with its status worked out ──
  async function save(clientId, settings, b) {
    const f = fromBundle(b);
    const old = await store.review(f.id);
    if (!old) {
      if (f.deleted_at) return 'gone';
      const status = f.google_reply ? 'already_replied' : isLive(f.create_time, settings.live_from) ? 'new' : 'backlog';
      await store.insertReview(clientId, { ...f, status, source: status === 'new' ? 'sync' : null }, at());
      return status;
    }
    const next = { ...f };
    const flagged = old.flag === 'review_changed' || old.flag === 'reply_rejected';
    if (old.status === 'posting') { delete next.google_reply; delete next.google_reply_at; }
    else if (f.deleted_at && ['new', 'queued', 'backlog', 'drafting'].includes(old.status)) Object.assign(next, { status: 'no_reply', last_error: 'The review was removed from Google.' });
    else if (old.status === 'posted') {
      const changed = (f.stars && old.replied_stars && f.stars !== old.replied_stars) || norm(f.comment) !== norm(old.comment)
        || (f.update_time && old.replied_update_time && ms(f.update_time) > ms(old.replied_update_time) && ms(f.update_time) > ms(old.google_reply_at) + 60000);
      if (f.reply_state === 'REJECTED' && old.reply_state !== 'REJECTED') Object.assign(next, { status: 'new', flag: 'reply_rejected', last_error: `Google rejected the reply${f.policy_violation ? `: ${f.policy_violation}` : ''}.`, notified_at: null, alerted_at: null });
      else if (changed) Object.assign(next, { status: 'new', flag: 'review_changed', last_error: null, notified_at: null, alerted_at: null });
    } else if (['new', 'queued', 'drafting', 'backlog'].includes(old.status) && f.google_reply && !flagged) Object.assign(next, { status: 'already_replied' });
    else if (old.status === 'already_replied' && !f.google_reply) Object.assign(next, { status: isLive(f.create_time, settings.live_from) ? 'new' : 'backlog' });
    await store.updateReview(f.id, next, at());
    return next.status || old.status;
  }

  // ── One draft for a review, saved; the review's draft_id points at it ──
  async function draftFor(review, settings, { source = 'model' } = {}) {
    const recent = review.stars >= 4 ? await store.recentTexts(review.client_id, 10) : [];
    const d = await D.draftReply({ callModel, stars: review.stars, reviewerName: review.reviewer_name, comment: review.comment, fields: settings, recent, model, effort });
    let id = null;
    for (const [i, a] of d.attempts.entries()) id = await store.addDraft({ review_id: review.id, client_id: review.client_id, source, template: d.template, model: (a.usage && a.usage.model) || model, attempt: i + 1, text: a.text, ok: !a.problems.length, problems: a.problems, at: at() });
    return { ...d, id };
  }

  // A review claimed into "drafting": drafted, then posted automatically or queued
  async function draftAndRoute(review, settings) {
    let d;
    try { d = await draftFor(review, settings); }
    catch (e) {
      await store.updateReview(review.id, { status: 'queued', flag: review.flag || 'draft_failed', last_error: `The draft could not be written: ${e.message}`, queued_at: at() }, at());
      return 'queued';
    }
    await store.updateReview(review.id, { draft_id: d.id, last_error: d.ok ? (review.flag ? review.last_error : null) : `The draft failed its checks twice: ${d.problems.map(p => p.msg).join(' ')}`, flag: review.flag || (d.ok ? null : 'draft_failed') }, at());
    if (d.ok && review.stars >= 4 && settings.auto_post && !review.flag && review.source !== 'backlog' && postingEnabled(env)) {
      try {
        const r = await postReply({ store, bundle: getBundle(), reviewId: review.id, automatic: true, env, now });
        if (r.posted) return 'posted';
        return r.status;
      } catch (e) {
        await store.updateReview(review.id, { status: 'queued', last_error: e.message, queued_at: at() }, at());
        return 'queued';
      }
    }
    const current = await store.review(review.id);
    if (current.status === 'drafting') await store.updateReview(review.id, { status: 'queued', queued_at: at(), notified_at: null }, at());
    return 'queued';
  }

  // ── The import: started, then waited for ──
  async function runImport(bundle, teamId) {
    const started = await bundle.startReviewImport(teamId, IMPORT_COUNT);
    if (started.conflict) return { status: 'CONFLICT', note: 'An import was already running for this location, so this client is skipped this run.' };
    let imp = started;
    const until = now().getTime() + maxWaitMs;
    while (!['COMPLETED', 'FAILED'].includes(imp.status)) {
      const left = until - now().getTime();
      if (left <= 0) return { status: imp.status, id: imp.id, note: `The import was still ${imp.status} after ${Math.round(maxWaitMs / 60000)} minutes; the reviews already in bundle.social are used.` };
      const reset = imp.status === 'RATE_LIMITED' ? ms(imp.rateLimitResetAt) - now().getTime() : NaN;
      await sleep(Math.max(1000, Math.min(left, Number.isFinite(reset) && reset > 0 ? reset + 1000 : pollMs)));
      imp = await bundle.reviewImport(imp.id);
    }
    return { status: imp.status, id: imp.id, imported: imp.reviewsImported, note: imp.status === 'FAILED' ? `The import failed: ${imp.error || 'no reason given'}. The reviews already in bundle.social are used.` : '' };
  }

  // Every page, until a page comes back short. The list's own `limit` is the monthly cap, not the page size.
  async function allReviews(bundle, teamId) {
    const out = [];
    let capacity = null, cap = null;
    for (let p = 0; p < MAX_PAGES; p++) {
      const page = await bundle.listReviews(teamId, { limit: PAGE, offset: p * PAGE });
      if (p === 0) { capacity = page.remainingCapacity ?? null; cap = page.limit ?? null; }
      const got = page.reviews || [];
      out.push(...got);
      if (got.length < PAGE) break;
    }
    return { reviews: out, capacity, cap };
  }

  async function syncClient(clientId, settings, conn) {
    const bundle = getBundle();
    const team = conn.team_id;
    const out = { client_id: clientId, imported: null, saved: 0, statuses: {}, drafted: 0, posted: 0, queued: 0, capacity: null, notes: [] };
    const imp = await runImport(bundle, team);
    out.import = imp.status;
    if (imp.note) out.notes.push(imp.note);
    if (imp.status === 'CONFLICT') { out.skipped = true; return out; }
    out.imported = imp.imported ?? null;
    const { reviews, capacity, cap } = await allReviews(bundle, team);
    out.capacity = capacity; out.cap = cap;
    if (capacity != null && capacity <= LOW_CAPACITY) out.notes.push(`Only ${capacity} of this month's review imports are left for this location.`);
    for (const b of reviews) { const s = await save(clientId, settings, b); out.saved++; out.statuses[s] = (out.statuses[s] || 0) + 1; }

    // A run that stopped half way: postings and drafts left behind
    const cutoff = now().getTime() - STUCK_MS;
    for (const r of await store.reviews(clientId, { status: 'posting' })) if (ms(r.posting_at) < cutoff) await recoverPosting({ store, bundle, review: r, now });
    for (const r of await store.reviews(clientId, { status: 'drafting' })) if (ms(r.updated_at) < cutoff) await store.updateReview(r.id, { status: 'new' }, at());

    const gaps = F.missing(settings);
    const fresh = (await store.reviews(clientId, { status: 'new' })).sort((a, b) => str(a.create_time).localeCompare(str(b.create_time)));
    if (gaps.length && fresh.length) { out.notes.push(`${fresh.length} new review${fresh.length === 1 ? '' : 's'} not drafted: ${gaps.join(', ')}.`); out.waiting = fresh.length; return out; }
    for (const r of fresh) {
      if (!(await store.claim(r.id, ['new'], 'drafting', {}, at()))) continue;
      out.drafted++;
      const where = await draftAndRoute({ ...r, status: 'drafting' }, settings);
      if (where === 'posted') out.posted++; else if (where === 'queued') out.queued++;
    }
    return out;
  }

  // ── The emails: new in the queue, and anything waiting 48 hours ──
  async function tell() {
    if (!notify) return { sent: 0 };
    const queue = await store.queue();
    const settingsBy = new Map((await store.allSettings()).map(s => [s.client_id, s]));
    const fresh = queue.filter(r => r.status === 'queued' && !r.notified_at);
    const late = queue.filter(r => r.status === 'queued' && !r.alerted_at && ms(r.queued_at) <= now().getTime() - ALERT_MS);
    const byApprover = new Map();
    const add = (r, kind) => {
      const s = settingsBy.get(r.client_id);
      const to = s && str(s.approver_email);
      if (!to) return;
      if (!byApprover.has(to)) byApprover.set(to, { name: str(s.approver_name), fresh: [], late: [] });
      byApprover.get(to)[kind].push(r);
    };
    fresh.forEach(r => add(r, 'fresh'));
    late.forEach(r => add(r, 'late'));
    let sent = 0;
    for (const [to, g] of byApprover) {
      try {
        if (g.fresh.length) { await notify(require('./notify').queueEmail({ to, ...g })); for (const r of g.fresh) await store.updateReview(r.id, { notified_at: at() }, at()); sent++; }
        if (g.late.length) { await notify(require('./notify').lateEmail({ to, ...g })); for (const r of g.late) await store.updateReview(r.id, { alerted_at: at() }, at()); sent++; }
      } catch (e) { log.error(`[reviews] the email to the approver could not be sent: ${e.message}`); }
    }
    return { sent };
  }

  async function runSync({ clientId = null, holder = `run-${Math.random().toString(36).slice(2)}` } = {}) {
    const started = at();
    if (!(await store.claimLock(holder, started, new Date(now().getTime() + LOCK_MS).toISOString()))) return { ran: false, reason: 'Another review sync is running.' };
    const runId = await store.startRun(started);
    const summary = { clients: [], posting: postingEnabled(env), emails: 0 };
    try {
      const all = await store.allSettings();
      for (const s of all.filter(x => !clientId || x.client_id === clientId)) {
        const entry = { client_id: s.client_id };
        // The live from date alone switches a client on. The Lead Snap tick went on 12 Nov (Brandon): no client is on Lead Snap
        if (!str(s.live_from)) { summary.clients.push({ ...entry, skipped: true, notes: ['Not switched on: the live from date is needed.'] }); continue; }
        const conn = publishStore ? await publishStore.connection(s.client_id) : null;
        if (!conn || conn.status !== 'connected' || !conn.team_id) { summary.clients.push({ ...entry, skipped: true, notes: ['Not connected to bundle.social (the GBP Posts tab, Publishing).'] }); continue; }
        try { summary.clients.push(await syncClient(s.client_id, s, conn)); }
        catch (e) { log.error(`[reviews] ${s.client_id}: ${e.message}`); summary.clients.push({ ...entry, error: e.message }); }
      }
      summary.emails = (await tell()).sent;
    } finally {
      await store.finishRun(runId, at(), summary).catch(() => {});
      await store.releaseLock(holder).catch(() => {});
    }
    return { ran: true, summary };
  }

  // ── The queue's buttons that write a draft ──
  async function draftBacklog(clientId, { limit = 50 } = {}) {
    const settings = await store.settings(clientId);
    const gaps = F.missing(settings);
    if (gaps.length) throw Object.assign(new Error(`Review replies are stopped for this client: ${gaps.join(', ')}.`), { status: 400 });
    const list = (await store.reviews(clientId, { status: 'backlog' })).filter(r => !r.google_reply && !r.deleted_at).slice(0, limit);
    let drafted = 0;
    for (const r of list) {
      if (!(await store.claim(r.id, ['backlog'], 'drafting', { source: 'backlog' }, at()))) continue;
      const d = await draftFor(r, settings).catch(e => ({ error: e.message }));
      await store.updateReview(r.id, { status: 'queued', queued_at: at(), notified_at: null, ...(d.error ? { flag: 'draft_failed', last_error: d.error } : { draft_id: d.id, flag: d.ok ? null : 'draft_failed', last_error: d.ok ? null : `The draft failed its checks twice: ${d.problems.map(p => p.msg).join(' ')}` }) }, at());
      drafted++;
    }
    return { drafted, left: (await store.reviews(clientId, { status: 'backlog' })).length };
  }
  async function regenerate(reviewId, { by = '' } = {}) {
    const r = await store.review(reviewId);
    if (!r || r.status !== 'queued') throw Object.assign(new Error('Only a review in the queue can be drafted again.'), { status: 409 });
    const settings = await store.settings(r.client_id);
    const d = await draftFor(r, settings);
    await store.addAction({ review_id: r.id, client_id: r.client_id, action: 'regenerate', by, at: at() });
    await store.updateReview(r.id, { draft_id: d.id, flag: ['review_changed', 'reply_rejected'].includes(r.flag) ? r.flag : d.ok ? null : 'draft_failed', last_error: d.ok ? null : `The draft failed its checks twice: ${d.problems.map(p => p.msg).join(' ')}` }, at());
    return d;
  }

  return { runSync, syncClient, save, draftFor, draftBacklog, regenerate, tell };
}

module.exports = { createReviewSync, fromBundle, isLive, IMPORT_COUNT, PAGE, LOW_CAPACITY, ALERT_MS };
