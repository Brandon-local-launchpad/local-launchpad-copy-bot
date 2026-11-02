'use strict';
// Deliver a Fillout submission to the Copybot webhook by hand, from the Fillout API.
//   node tools/fillout-redeliver.js <submissionId> --token <FILLOUT_WEBHOOK_SECRET> [--app <base url>]
// For a delivery Fillout refused to make (2 Nov 2026: the webhook had been saved in
// Advanced mode, which sends no query string, and Fillout's "Retry integration"
// replays the original request as first built, so it never delivers that
// submission). Reads FILLOUT_API_KEY and FILLOUT_FORM_ID from .env; the token is
// Railway's FILLOUT_WEBHOOK_SECRET, never in .env, so pass it. The payload is the
// webhook's shape ({ formId, formName, submission }) and a submission already
// stored gets 200 with duplicate: true, nothing else happens.

const path = require('path');
const fs = require('fs');
try {
  fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : ''; };
const submissionId = args.find(a => !a.startsWith('--') && a !== opt('--token') && a !== opt('--app'));
const token = opt('--token') || process.env.FILLOUT_WEBHOOK_SECRET || '';
const app = (opt('--app') || 'https://local-launchpad-copy-bot-production.up.railway.app').replace(/\/$/, '');
const apiKey = process.env.FILLOUT_API_KEY, formId = process.env.FILLOUT_FORM_ID;
if (!submissionId || !token || !apiKey || !formId) {
  console.error('usage: node tools/fillout-redeliver.js <submissionId> --token <webhook secret> [--app <base url>]\n(FILLOUT_API_KEY and FILLOUT_FORM_ID from .env)');
  process.exit(2);
}

(async () => {
  const formRes = await fetch(`https://api.fillout.com/v1/api/forms/${formId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!formRes.ok) throw new Error(`Fillout form lookup: ${formRes.status}`);
  const form = await formRes.json();
  const subRes = await fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions/${submissionId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!subRes.ok) throw new Error(`Fillout submission lookup: ${subRes.status} ${await subRes.text()}`);
  const body = await subRes.json();
  const submission = body.submission || body;
  if (submission.submissionId !== submissionId) throw new Error(`Fillout returned ${submission.submissionId}, not ${submissionId}`);
  const name = (submission.questions || []).find(q => /official business name/i.test(q.name || ''));
  console.log(`Delivering ${submissionId} (${submission.submissionTime}, ${(submission.questions || []).length} questions, ${name ? JSON.stringify(name.value) : 'no business name'}) to ${app}`);
  const payload = { formId: form.id, formName: form.name, submission };
  const r = await fetch(`${app}/api/webhooks/fillout?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  console.log(`webhook reply ${r.status}: ${await r.text()}`);
  process.exit(r.status === 200 ? 0 : 1);
})().catch(err => { console.error(err.message); process.exit(1); });
