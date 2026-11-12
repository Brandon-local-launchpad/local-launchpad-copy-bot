'use strict';
// Fixture: Tell Brandon (brandon/, 12 Nov 2026). The rules (the WhatsApp number and link, the message, what
// counts as an alert), the alerts on pg-mem (told once, cleared when gone, told again when back, set-up done
// told once ever, the urgent ones emailed at once), the morning email (once a day, from 8am, only with
// something to say) and the button's asks (a reason from the list, saved, emailed, typed into WhatsApp,
// open until Done) through the routes. The sender is a fake: no email leaves this test.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb } = require('pg-mem');
const R = require(path.join(root, 'brandon/rules.js'));
const S = require(path.join(root, 'brandon/service.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Tell Brandon (alerts, the morning email, the button) ===\n');

const env = { COPYBOT_URL: 'https://copybot.example/', TELL_BRANDON_WHATSAPP: '07766 555574' };

// ── The rules ──
chk('the number: 07766555574 is 447766555574', R.whatsappNumber('07766555574') === '447766555574', R.whatsappNumber('07766555574'));
chk('the number: spaces, +44 and 0044 read the same', ['07766 555574', '+44 7766 555574', '0044 7766 555574'].every(n => R.whatsappNumber(n) === '447766555574'));
chk('the number: nonsense or blank is no number', R.whatsappNumber('call me') === '' && R.whatsappNumber('') === '' && R.whatsappNumber(null) === '');
const wa = R.whatsappUrl('447766555574', 'Copybot: Edens Edge\nA & B?');
chk('the WhatsApp link opens wa.me with the message typed', wa === 'https://wa.me/447766555574?text=Copybot%3A%20Edens%20Edge%0AA%20%26%20B%3F', wa);
chk('no number, no WhatsApp link', R.whatsappUrl('', 'x') === '');
const msg = R.askMessage({ client: 'Edens Edge', reason: 'Does the client recognise this reviewer?', note: 'Not in the job list.', context: [{ label: 'Stars', value: '1' }, { label: 'Review', value: 'Terrible' }, { label: 'Empty', value: '' }], by: 'Ray', link: 'https://copybot.example/clients/x/reviews' });
chk('the message: client, reason, note, details, link, who', msg === 'Copybot: Edens Edge\nDoes the client recognise this reviewer?\n\nNot in the job list.\n\nStars: 1\nReview: Terrible\n\nhttps://copybot.example/clients/x/reviews\n\nFrom Ray', msg);
chk('a long detail is cut', R.askMessage({ client: 'X', reason: 'Y', context: [{ label: 'Review', value: 'a'.repeat(600) }] }).includes('…'));
chk('every screen has reasons, ending in a something else', R.PLACES.length >= 6 && R.PLACES.every(p => R.reasonsFor(p).length >= 2 && /something else/i.test(R.reasonsFor(p).slice(-1)[0])), R.PLACES);
chk('an unknown screen gets the client reasons', R.reasonsFor('nope') === R.reasonsFor('client'));
chk('the link: the client tab with the app address, none without it', R.linkFor({ env, clientId: 'abc', tab: 'reviews' }) === 'https://copybot.example/clients/abc/reviews' && R.linkFor({ env: {}, clientId: 'abc' }) === '');

const F = over => ({ id: 'c1', name: 'Edens Edge', month: '2026-11', connection: { status: 'connected', problem: null, publishing_on: true }, failed: [], low_reviews: [], capacity: null, drip: { found: true, left: 30, ran_out: false }, offer_no_link: 0, setup: { connected: true, publishing_on: true, approved_batch: true, drip_approved: true, reviews_live: false }, ...over });
const kinds = f => R.detectAlerts([f]).map(a => a.kind);
chk('a healthy client not yet live on reviews: nothing', kinds(F()).length === 0, kinds(F()));
chk('a connection problem is urgent', (() => { const a = R.detectAlerts([F({ connection: { status: 'problem', problem: 'Google access removed', publishing_on: false } })]); return a.length === 1 && a[0].kind === 'connection' && a[0].urgent && /Google access removed/.test(a[0].text); })());
chk('a post failed after Retry is urgent, one per item', (() => { const a = R.detectAlerts([F({ failed: [{ id: 'i1', kind: 'post', due_date: '2026-11-20', error: 'Rejected' }, { id: 'i2', kind: 'photo' }] })]); return a.length === 2 && a.every(x => x.urgent && x.kind === 'failed') && /Photo Drip photo/.test(a[1].text); })());
chk('a 1 to 3 star review is urgent and quotes it', (() => { const a = R.detectAlerts([F({ low_reviews: [{ id: 'r1', stars: 2, reviewer_name: 'Sam', comment: 'Late and messy' }] })]); return a.length === 1 && a[0].urgent && /2 stars review from Sam: "Late and messy"/.test(a[0].text); })(), R.detectAlerts([F({ low_reviews: [{ id: 'r1', stars: 2, reviewer_name: 'Sam', comment: 'Late and messy' }] })])[0]);
chk('review imports: 10 left warns, 11 does not; once a month', kinds(F({ capacity: 10 })).includes('imports_low') && !kinds(F({ capacity: 11 })).includes('imports_low') && R.detectAlerts([F({ capacity: 3 })])[0].key === '2026-11');
chk('Photo Drip: under 8 left warns, 8 does not, run out says so instead', kinds(F({ drip: { found: true, left: 7 } })).join() === 'drip_low' && !kinds(F({ drip: { found: true, left: 8 } })).length && kinds(F({ drip: { found: true, left: 0, ran_out: true } })).join() === 'drip_out');
chk('Photo Drip: no folder read, no alert', !kinds(F({ drip: { found: false, left: 0 } })).length && !kinds(F({ drip: null })).length);
chk('an Offer post with no link', kinds(F({ offer_no_link: 2 })).join() === 'offer_link' && /2 Offer posts/.test(R.detectAlerts([F({ offer_no_link: 2 })])[0].text));
chk('set-up done: every step, sticky, not urgent', (() => { const a = R.detectAlerts([F({ setup: { connected: true, publishing_on: true, approved_batch: true, drip_approved: true, reviews_live: true } })]); return a.length === 1 && a[0].kind === 'setup_done' && a[0].sticky && !a[0].urgent; })());
chk('set-up: one step missing, nothing', !kinds(F({ setup: { connected: true, publishing_on: false, approved_batch: true, drip_approved: true, reviews_live: true } })).length);
const ue = R.urgentEmail({ to: 'team@x.example', env, alerts: R.detectAlerts([F({ connection: { status: 'problem', problem: 'Access removed' } })]) });
chk('the urgent email: subject names the client and the thing, the body links the tab', ue.subject === 'Copybot: Edens Edge: nothing will go out' && ue.text.includes('https://copybot.example/clients/c1/gbp-posts?s=publishing'), ue);

// ── The service on pg-mem ──
(async () => {
  const db = newDb();
  db.public.none(`
    CREATE TABLE clients (id uuid PRIMARY KEY, name text, archived_at timestamptz);
    CREATE TABLE bundle_connections (client_id uuid PRIMARY KEY, status text, problem text, publishing_on boolean DEFAULT false);
    CREATE TABLE gbp_publish_items (id uuid PRIMARY KEY, client_id uuid, kind text, due_date text, status text, attempts integer DEFAULT 0, error text);
    CREATE TABLE gbp_reviews (id text PRIMARY KEY, client_id uuid, stars integer, reviewer_name text, comment text, status text, deleted_at text);
    CREATE TABLE review_sync_runs (id uuid PRIMARY KEY, started_at text, finished_at text, summary text);
    CREATE TABLE gbp_post_batches (id uuid PRIMARY KEY, client_id uuid, status text);
    CREATE TABLE gbp_posts (id uuid PRIMARY KEY, batch_id uuid, client_id uuid, topic text, offer_redeem_url text, post_date text);
    CREATE TABLE review_settings (client_id uuid PRIMARY KEY, live_from text);`);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await S.ensureBrandonTables(pool);   // once: pg-mem cannot read IF NOT EXISTS over a composite key; real Postgres can
  const C1 = crypto.randomUUID(), C2 = crypto.randomUUID();
  await pool.query(`INSERT INTO clients (id, name) VALUES ($1, 'Edens Edge'), ($2, 'Kestrel Ridge')`, [C1, C2]);
  await pool.query(`INSERT INTO bundle_connections (client_id, status, problem, publishing_on) VALUES ($1, 'problem', 'Google access was removed', false), ($2, 'connected', NULL, true)`, [C1, C2]);
  const ITEM = crypto.randomUUID();
  await pool.query(`INSERT INTO gbp_publish_items (id, client_id, kind, due_date, status, attempts, error) VALUES ($1, $2, 'post', '2026-11-14', 'failed', 2, 'Rejected by Google'), ($3, $2, 'post', '2026-11-15', 'failed', 1, 'First go')`, [ITEM, C2, crypto.randomUUID()]);
  await pool.query(`INSERT INTO gbp_reviews (id, client_id, stars, reviewer_name, comment, status) VALUES ('r1', $1, 1, 'Sam', 'Never turned up', 'queued'), ('r2', $1, 5, 'Jo', 'Great', 'queued'), ('r3', $1, 2, 'Old', 'Backlog one', 'backlog')`, [C2]);
  await pool.query(`INSERT INTO review_sync_runs (id, started_at, finished_at, summary) VALUES ($1, '2026-11-12T06:00:00Z', '2026-11-12T06:01:00Z', $2)`, [crypto.randomUUID(), JSON.stringify({ clients: [{ client_id: C2, capacity: 4 }] })]);
  const B = crypto.randomUUID();
  await pool.query(`INSERT INTO gbp_post_batches (id, client_id, status) VALUES ($1, $2, 'approved')`, [B, C2]);
  await pool.query(`INSERT INTO gbp_posts (id, batch_id, client_id, topic, offer_redeem_url, post_date) VALUES ($1, $2, $3, 'OFFER', '', '2026-12-01'), ($4, $2, $3, 'OFFER', '', '2026-01-01')`, [crypto.randomUUID(), B, C2, crypto.randomUUID()]);
  let drip = { found: true, left: 5, ran_out: false };
  const sent = [];
  let clock = new Date('2026-11-13T07:00:00Z');   // 7am in London
  const svc = S.createBrandon({ pool, env, now: () => clock, send: async m => { sent.push(m); }, dripState: async () => drip });

  let r = await svc.tick();
  const { rows: a1 } = await pool.query(`SELECT client_id, kind, alert_key AS key FROM brandon_alerts ORDER BY kind`);
  const k1 = a1.map(x => x.kind).sort().join();
  chk('the first tick: the connection, the failed post, the low review, imports, Photo Drip and the offer link', k1 === 'connection,drip_low,failed,imports_low,low_review,offer_link', k1);
  chk('a failed post with one attempt, a 5 star review, the backlog and a past offer are not alerts', a1.filter(x => x.kind === 'failed').length === 1 && a1.filter(x => x.kind === 'low_review').map(x => x.key).join() === 'r1' && a1.filter(x => x.kind === 'offer_link').length === 1);
  chk('Photo Drip is only read for a connected client', a1.filter(x => x.kind === 'drip_low').every(x => x.client_id === C2));
  chk('the urgent ones go in one email at once, to team@ by default', sent.length === 1 && sent[0].to === 'team@locallaunchpad.co.uk' && sent[0].subject === 'Copybot: 3 things for you now' && /Never turned up/.test(sent[0].text) && /Google access was removed/.test(sent[0].text), sent[0] && sent[0].subject, 'Copybot: 3 things for you now');
  chk('the tick reports what it did', r.fresh === 6 && r.emailed === 3, r);
  r = await svc.tick();
  chk('the next tick tells nothing twice', sent.length === 1 && r.fresh === 0, r);
  await pool.query(`UPDATE bundle_connections SET status = 'connected', problem = NULL WHERE client_id = $1`, [C1]);
  r = await svc.tick();
  chk('a problem that has gone is cleared', r.cleared === 1 && !(await pool.query(`SELECT 1 FROM brandon_alerts WHERE kind = 'connection'`)).rows.length, r);
  await pool.query(`UPDATE bundle_connections SET status = 'problem', problem = 'Google access was removed' WHERE client_id = $1`, [C1]);
  r = await svc.tick();
  chk('the same problem coming back is told again', r.fresh === 1 && sent.length === 2 && sent[1].subject === 'Copybot: Edens Edge: nothing will go out', sent[1] && sent[1].subject);

  // Set-up done: told once, kept when a step later changes
  await pool.query(`INSERT INTO review_settings (client_id, live_from) VALUES ($1, '2026-11-14')`, [C2]);
  await pool.query(`INSERT INTO gbp_publish_items (id, client_id, kind, due_date, status, attempts) VALUES ($1, $2, 'photo', '2026-11-20', 'queued', 0)`, [crypto.randomUUID(), C2]);
  r = await svc.tick();
  chk('set-up done is found once every step is there', (await pool.query(`SELECT 1 FROM brandon_alerts WHERE kind = 'setup_done' AND client_id = $1`, [C2])).rows.length === 1, r);
  await pool.query(`UPDATE bundle_connections SET publishing_on = false WHERE client_id = $1`, [C2]);
  await svc.tick();
  chk('set-up done stays, so it is never told twice', (await pool.query(`SELECT 1 FROM brandon_alerts WHERE kind = 'setup_done'`)).rows.length === 1);
  drip = { found: true, left: 0, ran_out: true };
  await svc.tick();
  const dk = (await pool.query(`SELECT kind FROM brandon_alerts WHERE kind LIKE 'drip%'`)).rows.map(x => x.kind).join();
  chk('Photo Drip going from low to run out swaps the alert', dk === 'drip_out', dk);

  // ── The morning email ──
  r = await svc.digest();
  chk('before 8am UK: no morning email', r.sent === 0 && r.why === 'before 8am', r);
  clock = new Date('2026-11-13T08:05:00Z');
  const before = sent.length;
  r = await svc.digest();
  const dg = sent[sent.length - 1];
  chk('after 8am: one morning email with what came up', r.sent === 1 && sent.length === before + 1 && /^Copybot this morning: \d+ new things/.test(dg.subject) && dg.text.startsWith('Since yesterday:') && /Fully set up/.test(dg.text), dg && dg.subject);
  r = await svc.digest();
  chk('only one a day', r.sent === 0 && r.why === 'already sent today', r);
  clock = new Date('2026-11-14T09:00:00Z');
  r = await svc.digest();
  chk('a morning with nothing new and nothing waiting sends nothing', r.sent === 0 && r.why === 'nothing to say', r);

  // ── The button: the routes ──
  const app = express();
  app.use(express.json());
  S.mountBrandonApi(app, { brandon: svc });
  const srv = http.createServer(app);
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const req = (method, p, body) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const q = http.request({ host: '127.0.0.1', port: srv.address().port, method, path: p, agent: false, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => resolve({ status: res.statusCode, json: (() => { try { return JSON.parse(t); } catch (_) { return null; } })() })); });
    q.on('error', reject); if (data) q.write(data); q.end();
  });
  let x = await req('GET', '/api/brandon/reasons?place=review');
  chk('the reasons for a screen, and whether WhatsApp is set', x.status === 200 && x.json.reasons[0] === 'Does the client recognise this reviewer?' && x.json.whatsapp === true && x.json.email === 'team@locallaunchpad.co.uk', x.json);
  x = await req('POST', `/api/clients/${C2}/brandon/asks`, { place: 'review', reason: 'Made up reason', by: 'Ray' });
  chk('a reason not on the list is refused', x.status === 400, x.status, 400);
  x = await req('POST', `/api/clients/${crypto.randomUUID()}/brandon/asks`, { place: 'review', reason: 'Abusive, threatening or personal review' });
  chk('an unknown client is refused', x.status === 404, x.status, 404);
  const n0 = sent.length;
  x = await req('POST', `/api/clients/${C2}/brandon/asks`, { place: 'review', reason: 'Does the client recognise this reviewer?', note: 'Not in the job list', by: 'Ray', tab: 'reviews', context: [{ label: 'Stars', value: '1' }, { label: 'Review', value: 'Never turned up' }] });
  chk('an ask is saved and comes back with the message', x.status === 201 && x.json.ask.reason === 'Does the client recognise this reviewer?' && x.json.message.startsWith('Copybot: Kestrel Ridge\nDoes the client recognise this reviewer?') && x.json.message.includes(`https://copybot.example/clients/${C2}/reviews`), x.json && x.json.message);
  chk('it is emailed to Brandon at once, whatever happens to the WhatsApp', x.json.emailed && sent.length === n0 + 1 && sent[sent.length - 1].subject === 'Tell Brandon: Kestrel Ridge: Does the client recognise this reviewer?' && sent[sent.length - 1].to === 'team@locallaunchpad.co.uk', sent[sent.length - 1] && sent[sent.length - 1].subject);
  chk('the WhatsApp link goes to 447766555574 with the message typed', x.json.whatsapp.startsWith('https://wa.me/447766555574?text=Copybot%3A%20Kestrel%20Ridge'), x.json.whatsapp);
  const askId = x.json.ask.id;
  x = await req('GET', `/api/clients/${C2}/brandon/asks`);
  chk('it is open for the client: Waiting on Brandon', x.json.asks.length === 1 && x.json.asks[0].id === askId && x.json.asks[0].by === 'Ray', x.json.asks);
  x = await req('GET', '/api/brandon/asks');
  chk('and across clients for the dashboard, with the client name', x.json.asks.length === 1 && x.json.asks[0].client === 'Kestrel Ridge');
  clock = new Date('2026-11-15T08:30:00Z');
  r = await svc.digest();
  chk('the next morning lists what is still waiting on Brandon', r.sent === 1 && r.asks === 1 && /Still waiting on you \(1\):\n\nKestrel Ridge: Does the client recognise this reviewer\?: Not in the job list \(Ray, 2026-11-14\)/.test(sent[sent.length - 1].text), sent[sent.length - 1].text);
  x = await req('POST', `/api/brandon/asks/${askId}/done`, { by: 'Brandon' });
  chk('Done clears it', x.status === 200 && (await req('GET', '/api/brandon/asks')).json.asks.length === 0);
  chk('Done twice is fine', (await req('POST', `/api/brandon/asks/${askId}/done`, {})).status === 200);
  chk('Done on a made up ask is a 404', (await req('POST', `/api/brandon/asks/${crypto.randomUUID()}/done`, {})).status === 404);

  // No WhatsApp number, no mailbox: the ask still saves, with no link and no email
  const quiet = S.createBrandon({ pool, env: { TELL_BRANDON_EMAIL: 'brandon@x.example' }, now: () => clock, send: null });
  const q = await quiet.ask({ clientId: C1, place: 'client', reason: 'Something else', note: 'Hello' });
  chk('no number: saved, no WhatsApp link; no mailbox: not emailed', q.ask.id && q.whatsapp === '' && q.emailed === false && quiet.to() === 'brandon@x.example', q);
  chk('a sender that fails does not lose the ask', await (async () => { const bad = S.createBrandon({ pool, env, now: () => clock, send: async () => { throw new Error('Gmail down'); } }); const a = await bad.ask({ clientId: C1, place: 'client', reason: 'Something else' }); return a.emailed === false && (await bad.open(C1)).some(o => o.id === a.ask.id); })());
  await new Promise(ok => srv.close(ok));

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
