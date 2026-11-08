'use strict';

// ── The publisher: what the rest of Copybot may ask for ──────────────────────
// Nothing outside this folder knows who publishes. Google's own API would be a new file with these
// same functions, chosen here.
//   locations(sourceNames)             where each source login can post
//   createTeam, accountFor, copyAccount, setChannel, unsetChannel, checkAccount({ teamId, channelId })
//   uploadPhoto({ teamId, bytes, filename, mime }) → an upload id
//   schedulePost({ teamId, post, uploadId, referenceKey, when }) → { id, status }
//   postStatus(id) → { status: scheduled | posted | failed | deleted, error, link, posted_at }
//   retryPost(id), cancelPost(id), removeLivePost(teamId, id)
//   addPhoto({ teamId, uploadId, category }) → { name, link }, removePhoto(teamId, name)
//
// Two switches, both off until Brandon turns them on. On Railway: BUNDLE_SOCIAL_API_KEY and
// GBP_PUBLISHING_ENABLED=1, without which nothing here calls out. Per client: publishing_on.

const { createBundlePublisher, BASE } = require('./bundle-social');

const SOURCE_TEAMS = require('./source-teams.json').teams;
const DEFAULT_DAILY_LIMIT = 20;   // bundle.social Pro, per location (their support, 7 Nov 2026); photos do not count

const configured = (env = process.env) => !!env.BUNDLE_SOCIAL_API_KEY;
const enabled = (env = process.env) => configured(env) && env.GBP_PUBLISHING_ENABLED === '1';
const dailyLimit = (env = process.env) => { const n = Number(env.BUNDLE_SOCIAL_DAILY_LIMIT); return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT; };

function createPublisher({ env = process.env, fetchImpl, log } = {}) {
  if (!configured(env)) throw Object.assign(new Error('BUNDLE_SOCIAL_API_KEY is not set on this server.'), { status: 503 });
  return createBundlePublisher({ apiKey: env.BUNDLE_SOCIAL_API_KEY, baseUrl: env.BUNDLE_SOCIAL_BASE_URL || BASE, ...(fetchImpl ? { fetchImpl } : {}), ...(log ? { log } : {}) });
}

module.exports = { createPublisher, configured, enabled, dailyLimit, SOURCE_TEAMS, DEFAULT_DAILY_LIMIT };
