'use strict';

// ── Review replies: the only code that posts ─────────────────────────────────
// Brandon's brief, sections 1, 3, 5 and 7. Every rule is here, not in the screens:
//   - posting is off unless REVIEW_REPLIES_POSTING=1 (and the bundle.social key) is set on the server
//   - a 1 to 3 star reply posts only with an approval record whose text is the text posted, and only once
//   - automatic posting is for 4 and 5 stars only, with the client on automatic and a draft that passed
//   - the review is read fresh straight before the post, and a reply already there is never overwritten
//     unless the person chose "Replace existing reply"
//   - the review is claimed first, so two runs, or a run and a person, can't both post
// Nothing here deletes a reply.

const F = require('./fields');

const postingEnabled = (env = process.env) => !!env.BUNDLE_SOCIAL_API_KEY && env.REVIEW_REPLIES_POSTING === '1';
const same = (a, b) => String(a || '').replace(/\s+/g, ' ').trim() === String(b || '').replace(/\s+/g, ' ').trim();
const refuse = (msg, status = 400, code = 'REFUSED') => Object.assign(new Error(msg), { status, code });
const HARD_LEFTOVER = /\{\{|\}\}|\[(?:[^\]\n]{1,40})\]/;

// The approval this post rests on, or a refusal. Kinds: approve (needs "Real customer checked"),
// approve_neutral (needs "Reported on Google": the neutral reply is for someone who isn't a customer).
async function approvalFor(store, review, actionId) {
  const a = await store.action(actionId);
  if (!a || a.review_id !== review.id) throw refuse('Nothing posts without an approval for this review.', 403, 'NO_APPROVAL');
  if (a.action === 'approve' && !a.real_customer_checked) throw refuse('Approve and post needs the "Real customer checked" tick.', 403, 'NO_TICK');
  if (a.action === 'approve_neutral' && !a.reported) throw refuse('The neutral reply needs the "Reported on Google" tick.', 403, 'NO_TICK');
  if (!['approve', 'approve_neutral'].includes(a.action)) throw refuse('That action is not an approval.', 403, 'NO_APPROVAL');
  if (!String(a.text || '').trim()) throw refuse('The approval has no text.', 403, 'NO_APPROVAL');
  if ((await store.repliesFor(review.id)).some(r => r.action_id === a.id)) throw refuse('That approval has already been posted.', 409, 'USED');
  return a;
}

// → { posted: true } | { posted: false, status, reason }. Throws a refusal before anything is claimed.
//   automatic: the sync's own post of a 4 or 5 star draft. Otherwise actionId names the approval.
async function postReply({ store, bundle, reviewId, actionId = null, automatic = false, env = process.env, now = () => new Date(), by = '' }) {
  const at = () => now().toISOString();
  if (!postingEnabled(env)) throw refuse('Posting review replies is switched off on this server (REVIEW_REPLIES_POSTING).', 503, 'POSTING_OFF');
  const review = await store.review(reviewId);
  if (!review) throw refuse('Review not found.', 404, 'NOT_FOUND');
  const settings = await store.settings(review.client_id);
  const gaps = F.missing(settings);
  if (gaps.length) throw refuse(`Review replies are stopped for this client: ${gaps.join(', ')}.`, 400, 'FIELDS');

  let text, approval = null, from;
  if (automatic) {
    if (!(review.stars >= 4)) throw refuse(`A ${review.stars || '?'} star reply never posts without a person approving it.`, 403, 'NEEDS_APPROVAL');
    if (!settings.auto_post) throw refuse('This client is not on automatic posting.', 403, 'NOT_AUTO');
    if (review.source === 'backlog' || review.flag) throw refuse('A backlog or flagged review is never posted automatically.', 403, 'NEEDS_APPROVAL');
    const draft = await store.draft(review.draft_id);
    if (!draft || !draft.ok || draft.source !== 'model') throw refuse('Only a draft that passed its checks posts automatically.', 403, 'NEEDS_APPROVAL');
    text = draft.text; from = ['drafting'];
  } else {
    approval = await approvalFor(store, review, actionId);
    text = approval.text; from = ['queued'];
  }
  text = String(text).trim();
  if (HARD_LEFTOVER.test(text)) throw refuse('The reply still has a placeholder in it ({{ or [ ]).', 400, 'LEFTOVER');
  if (text.length > 4096) throw refuse('Google takes 4,096 characters at most.', 400, 'LENGTH');
  const replace = !!(approval && approval.replace_existing);

  if (!(await store.claim(review.id, from, 'posting', { posting_text: text, posting_at: at(), posting_action: approval ? approval.id : null, posting_auto: !!automatic }, at()))) {
    throw refuse('This review is already being posted, or has moved on.', 409, 'CLAIMED');
  }
  return finish({ store, bundle, review: { ...review, posting_text: text, posting_action: approval ? approval.id : null, posting_auto: !!automatic }, replace, by, at });
}

// After the claim: read fresh, post, record. Also the recovery for a review left in "posting".
async function finish({ store, bundle, review, replace = false, by = '', at, recovering = false }) {
  const text = review.posting_text;
  const back = (status, fields, reason) => store.updateReview(review.id, { status, posting_text: null, posting_at: null, posting_action: null, posting_auto: null, ...fields }, at()).then(() => ({ posted: false, status, reason }));
  let fresh;
  try { fresh = await bundle.getReview(review.team_id, review.id); }
  catch (e) { return back('queued', { flag: 'post_failed', last_error: `Could not read the review before posting: ${e.message}`, queued_at: review.queued_at || at() }, 'read failed'); }
  if (!fresh || fresh.deletedAt) return back('no_reply', { last_error: 'The review is no longer on Google.' }, 'review gone');

  const existing = fresh.reviewReplyComment;
  if (existing && same(existing, text)) return record(store, review, fresh, { at, by, recovered: true });   // ours got there: an earlier run stopped after the post
  if (existing && !replace) {
    return back('already_replied', { google_reply: existing, google_reply_at: fresh.reviewReplyUpdatedAt || null, last_error: 'Google already had a reply, so nothing was posted.' }, 'already replied');
  }
  if (recovering) return back('queued', { flag: 'post_failed', last_error: 'The post was interrupted before it reached Google. Check it and approve again.', queued_at: review.queued_at || at() }, 'interrupted');

  let made;
  try { made = await bundle.putReviewReply(review.team_id, review.id, text); }
  catch (e) { return back('queued', { flag: 'post_failed', last_error: `bundle.social did not take the reply: ${e.message}`, queued_at: review.queued_at || at() }, 'post failed'); }
  return record(store, review, made || fresh, { at, by, replaced: !!existing });
}

async function record(store, review, g, { at, by, replaced = false, recovered = false }) {
  const already = (await store.repliesFor(review.id)).some(r => same(r.text, review.posting_text) && (r.action_id || null) === (review.posting_action || null));
  if (!already) await store.addReply({ review_id: review.id, client_id: review.client_id, text: review.posting_text, at: at(), action_id: review.posting_action, automatic: !!review.posting_auto, by: review.posting_auto ? 'automatic' : by, replaced, stars: review.stars });
  await store.updateReview(review.id, {
    status: 'posted', flag: null, last_error: null, google_reply: review.posting_text, google_reply_at: g.reviewReplyUpdatedAt || at(),
    reply_state: g.reviewReplyState || null, policy_violation: g.reviewReplyPolicyViolation || null,
    replied_stars: review.stars, replied_update_time: g.updateTime || review.update_time || null,
    posting_text: null, posting_at: null, posting_action: null, posting_auto: null,
  }, at());
  return { posted: true, recovered };
}

// A review left in "posting" by a run that stopped: Google is asked what happened
async function recoverPosting({ store, bundle, review, now = () => new Date() }) {
  return finish({ store, bundle, review, at: () => now().toISOString(), recovering: true });
}

module.exports = { postReply, recoverPosting, postingEnabled };
