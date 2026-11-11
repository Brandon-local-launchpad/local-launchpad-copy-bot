'use strict';
// Posts the brief's example onboarding send to a Copybot instance, as GHL will, so the GHL side
// can be tested before going live. The secret is read from the environment, never typed here.
//
//   GHL_ONBOARDING_SECRET=<the secret> node tools/ghl-onboarding-post.js <base url> [stage] [email]
//   e.g. node tools/ghl-onboarding-post.js http://localhost:3000 domain-access-request
//
// The same thing with curl:
//   curl -X POST "<base url>/api/webhooks/ghl-onboarding" -H "Content-Type: application/json" \
//     -H "X-LL-Secret: $GHL_ONBOARDING_SECRET" -d @tools/ghl-onboarding-example.json
//
// 200 { ok: true, id } means the send was stored. It lands on the client whose GHL contact id or
// email matches; with no such client it waits, and shows on the Dashboard's Unmatched onboarding
// card after 24 hours (a `complete` send shows at once). 401 means the secret is wrong or not set.

const fs = require('fs');
const path = require('path');

const [base, stage, email] = process.argv.slice(2);
const secret = process.env.GHL_ONBOARDING_SECRET || '';
if (!base || !secret) { console.error('Usage: GHL_ONBOARDING_SECRET=<the secret> node tools/ghl-onboarding-post.js <base url> [stage] [email]'); process.exit(1); }

const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghl-onboarding-example.json'), 'utf8'));
if (stage) payload.stage = stage;
if (email) { payload.email = email; payload.provider_login_email = email; }

const url = new URL('/api/webhooks/ghl-onboarding', base);
const data = JSON.stringify(payload);
const req = require(url.protocol === 'https:' ? 'https' : 'http').request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'X-LL-Secret': secret } }, res => {
  let text = '';
  res.on('data', c => { text += c; });
  res.on('end', () => { console.log(`${res.statusCode} ${text}`); process.exitCode = res.statusCode === 200 ? 0 : 1; });
});
req.on('error', err => { console.error(err.message); process.exitCode = 1; });
req.end(data);
