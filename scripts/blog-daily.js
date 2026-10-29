#!/usr/bin/env node
'use strict';

// ── The blog daily job: the Railway cron entry ───────────────────────────────────
// One call a day to the live app, which runs the job for every client (blog/daily.js runAll):
// churn, price changes, holds, publishes and the backfill marks. Railway: a cron service on this
// repo with the command `node scripts/blog-daily.js` and a daily schedule (09:30 Europe/London
// suits the posts' 09:00 publish time). Needs two variables on that service:
//   COPYBOT_URL        the app's address (https://…railway.app)
//   BLOG_JOB_SECRET    the same value as on the app service (the route checks it; the app login is the other way in)
// BLOG_CLOCK=YYYY-MM-DD overrides the day (a rehearsal); DRY=1 lists what would happen and changes nothing.

const { loadDotEnv } = require('./trade-facts');

async function main() {
  loadDotEnv();
  const base = String(process.env.COPYBOT_URL || '').replace(/\/+$/, '');
  const secret = process.env.BLOG_JOB_SECRET || '';
  if (!base || !secret) { console.error('COPYBOT_URL and BLOG_JOB_SECRET must be set.'); process.exitCode = 1; return; }
  const body = { dryRun: process.env.DRY === '1' };
  if (process.env.BLOG_CLOCK) body.now = process.env.BLOG_CLOCK;
  const res = await fetch(`${base}/api/blog/daily-run-all`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-blog-job-secret': secret }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) { console.error(`The job failed: ${res.status} ${text.slice(0, 300)}`); process.exitCode = 1; return; }
  const r = JSON.parse(text);
  console.log(`Blog daily job for ${r.today}${body.dryRun ? ' (dry run)' : ''}: ${r.clients.length} client(s)`);
  for (const c of r.clients) {
    if (c.error) { console.log(`  ${c.name}: ERROR ${c.error}`); continue; }
    console.log(`  ${c.name}${c.churned ? ' (churned)' : ''}${c.site ? '' : ' (no site)'}: ${c.actions.length} action(s)`);
    for (const a of c.actions) console.log(`    ${a.action.padEnd(12)} ${a.slug || ''} ${a.why || ''}${a.to ? ` → ${a.to}` : ''}${a.url ? ` ${a.url}` : ''}`);
  }
}

if (require.main === module) main().catch(err => { console.error(err.message); process.exitCode = 1; });
