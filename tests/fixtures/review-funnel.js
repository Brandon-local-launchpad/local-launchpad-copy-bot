'use strict';
// Fixture: the Review Us page (review-funnel/, 12 Nov 2026, Brandon). The Google review link (typed,
// else built from the confirmed Google listing), what a private feedback send must hold, the public
// route and its token, the two emails (the client, and the team's copy that says whether the client
// was told), what happens when an email fails or the client has no email, sending the settings to
// the client's site (a fake WordPress site), and the Tracker lines.
// Postgres in memory, a real express app on a local port. No email leaves this test.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const R = require(path.join(root, 'review-funnel/rules.js'));
const S = require(path.join(root, 'review-funnel/service.js'));
const RT = require(path.join(root, 'review-funnel/routes.js'));
const { createFakeWp, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
const { trackerOf } = require(path.join(root, 'ui/tracker.js'));
const { clientValueMap } = require(path.join(root, 'v20-generate.js'));
const { buildClientValuesPayload } = require(path.join(root, 'wp/client-values.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the Review Us page (the Google link, private feedback, the emails, the site set-up) ===\n');

// http.request, not fetch: a fixture that fetches its own server aborts at exit on Windows
const call = (base, method, p, body, headers = {}) => new Promise((resolve, reject) => {
  const u = new URL(p, base);
  const data = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
  const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } }, res => {
    let text = ''; res.on('data', c => { text += c; });
    res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch (_) { /* not JSON */ } resolve({ status: res.statusCode, json, text }); });
  });
  req.on('error', reject); req.end(data);
});

// ── The pure rules ──
const PLACE = 'https://search.google.com/local/writereview?placeid=ChIJ_edens_edge_own';
chk('The link typed on the Record tab is used as typed', JSON.stringify(R.reviewLink({ review_url: ' https://g.page/r/abc/review ', gbp_place_id: 'ChIJ_edens_edge_own' })) === JSON.stringify({ url: 'https://g.page/r/abc/review', source: 'typed' }));
chk('With none typed it is built from the confirmed Google listing', JSON.stringify(R.reviewLink({ review_url: '', gbp_place_id: 'ChIJ_edens_edge_own' })) === JSON.stringify({ url: PLACE, source: 'listing' }), R.reviewLink({ gbp_place_id: 'ChIJ_edens_edge_own' }));
chk('Something typed that is not a link is not used', R.reviewLink({ review_url: 'ask Ethan', gbp_place_id: '' }).url === '' && R.reviewLink({ review_url: 'ask Ethan', gbp_place_id: 'ChIJ_x' }).source === 'listing');
chk('No link and no listing: no link, and nothing is guessed', R.reviewLink({}).url === '' && R.reviewLink().source === '');
chk('The site\'s Client Values carry the built link', clientValueMap({ company_name: 'Edens Edge Landscaping', gbp_place_id: 'ChIJ_edens_edge_own' }).review_url === PLACE && !('review_url' in clientValueMap({ company_name: 'Edens Edge Landscaping' })));
chk('A page written before the link existed does not clear the site\'s link when it is pushed', !('review_url' in buildClientValuesPayload({ meta: { client_values: { company_name: 'Edens Edge Landscaping' } } })) && buildClientValuesPayload({ meta: { client_values: { review_url: PLACE } } }).review_url === PLACE);

const SAM = { stars: 2, name: 'Sam Carter', phone: '07700 900123', email: '', feedback: 'The patio was left uneven.\nNobody called back.', page_url: 'https://edensedge.example/review-us/' };
const ok = R.cleanSubmission({ ...SAM, name: '  Sam\tCarter \n', email: ' ', feedback: 'The patio was left uneven.\r\nNobody called back.  ' });
chk('A good send: tidied, the line break in the feedback kept', ok.ok && ok.value.name === 'Sam Carter' && ok.value.feedback === SAM.feedback && ok.value.email === '', ok);
const errs = b => R.cleanSubmission({ ...SAM, ...b }).errors.join(' ');
chk('4 or 5 stars is refused here: those go to Google', /1, 2 or 3 stars/.test(errs({ stars: 4 })) && /1, 2 or 3 stars/.test(errs({ stars: 5 })) && /1, 2 or 3 stars/.test(errs({ stars: '2.5' })) && R.cleanSubmission({ ...SAM, stars: '3' }).ok);
chk('A name and the feedback are needed', /name is needed/.test(errs({ name: ' ' })) && /feedback is empty/.test(errs({ feedback: '' })));
chk('A phone or an email is needed, either will do', /phone number or an email/.test(errs({ phone: '', email: '' })) && R.cleanSubmission({ ...SAM, phone: '', email: 'Sam@Example.com' }).value.email === 'sam@example.com' && R.cleanSubmission({ ...SAM, phone: '', email: 'sam@example.com' }).ok);
chk('An email that is not one is refused, and so is anything too long', /does not look right/.test(errs({ email: 'sam at example' })) && /too long/.test(errs({ feedback: 'x'.repeat(4001) })) && /too long/.test(errs({ name: 'x'.repeat(121) })));
chk('Nothing but an object is a send', !R.cleanSubmission(null).ok && !R.cleanSubmission([SAM]).ok && !R.cleanSubmission('stars=2').ok);

const fb = { stars: 2, name: 'Sam Carter', phone: '07700 900123', email: '', feedback: SAM.feedback };
const ce = R.clientEmail({ to: 'ethan@edensedge.example', ownerName: 'Ethan Hall', feedback: fb });
chk('The client\'s email: the subject with the stars, the owner\'s first name, that it is private, the details and the feedback',
  ce.to === 'ethan@edensedge.example' && ce.subject === 'A customer left private feedback (2 stars)' && ce.text.startsWith('Hi Ethan,\n') && ce.text.includes('They were not sent to Google: this feedback is private to you.') && ce.text.includes('Name: Sam Carter\nPhone: 07700 900123\nEmail: not given\n\nWhat they said:\nThe patio was left uneven.\nNobody called back.') && ce.text.includes('It is worth getting in touch with them to put it right.'), ce.text);
chk('One star is "1 star"; no owner name is "Hello,"', R.clientEmail({ to: 'x@y.example', feedback: { ...fb, stars: 1 } }).subject === 'A customer left private feedback (1 star)' && R.clientEmail({ to: 'x@y.example', feedback: fb }).text.startsWith('Hello,\n'));
const te = R.teamEmail({ clientName: 'Edens Edge Landscaping', clientTo: 'ethan@edensedge.example', link: 'https://copybot.example/clients/c1/reviews', feedback: fb });
chk('The team\'s copy: to the team address, the client named, that the client was emailed, the link to their Reviews tab', te.to === 'team@locallaunchpad.co.uk' && te.subject === 'Edens Edge Landscaping: private feedback (2 stars)' && te.text.includes('The client was emailed at ethan@edensedge.example.') && te.text.endsWith('https://copybot.example/clients/c1/reviews') && te.text.includes('Nobody called back.'), te.text);
chk('The team\'s copy says when the client was not told, and why', /NOT emailed: there is no email address on their record/.test(R.teamEmail({ clientName: 'X', feedback: fb }).text) && /did NOT send: quota/.test(R.teamEmail({ clientName: 'X', clientTo: 'a@b.example', clientError: 'quota', feedback: fb }).text));

// ── The Tracker ──
const lines = rf => { const t = trackerOf({ niche_known: true, place_id: true, review_funnel: rf }); return { needs: t.needs.map(n => n.key), done: t.done.map(d => d.key), later: t.later, why: t.needs.find(n => n.key === 'review_page') }; };
chk('Tracker: a connected site with a Google link is asked for the Review Us set-up, on the Reviews tab', lines({ site: true, link: true, sent_at: null, received: 0, unsent: 0 }).needs.includes('review_page') && lines({ site: true, link: true, sent_at: null, received: 0, unsent: 0 }).why.tab === 'reviews');
chk('Tracker: no site connected, or no Google link yet: not asked for yet', !lines({ site: false, link: true, sent_at: null, received: 0, unsent: 0 }).needs.includes('review_page') && !lines({ site: true, link: false, sent_at: null, received: 0, unsent: 0 }).needs.includes('review_page'));
chk('Tracker: once sent it is a thing done', lines({ site: true, link: true, sent_at: '2026-11-12T10:00:00Z', received: 0, unsent: 0 }).done.includes('review_page') && !lines({ site: true, link: true, sent_at: '2026-11-12T10:00:00Z', received: 0, unsent: 0 }).needs.includes('review_page'));
chk('Tracker: feedback the client has not had waits on a person; feedback passed on is a thing done', lines({ site: true, link: true, sent_at: '2026-11-12T10:00:00Z', received: 3, unsent: 1 }).needs.includes('feedback_unsent') && lines({ site: true, link: true, sent_at: '2026-11-12T10:00:00Z', received: 3, unsent: 1 }).done.includes('feedback') && !lines({ site: true, link: true, sent_at: '2026-11-12T10:00:00Z', received: 2, unsent: 0 }).needs.includes('feedback_unsent'));
chk('Tracker: a client with no Review Us facts gets no lines', !lines(null).needs.some(k => /review_page|feedback/.test(k)));

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const q = async (sql, p = []) => (await pool.query(sql, p)).rows;
  const newClient = async name => (await q(`INSERT INTO clients (name, trade) VALUES ($1, 'Landscaper') RETURNING id`, [name]))[0].id;
  const edens = await newClient('Edens Edge Landscaping'), kestrel = await newClient('Kestrel Ridge Roofing'), bare = await newClient('No Site Ltd');

  // What each client's record holds
  const VALUES = {
    [edens]: { company_name: 'Edens Edge Landscaping', owner_name: 'Ethan Hall', email: 'ethan@edensedge.example', phone: '07580 412717', review_url: '', gbp_place_id: 'ChIJ_edens_edge_own' },
    [kestrel]: { company_name: 'Kestrel Ridge Roofing', owner_name: '', email: '', review_url: 'https://g.page/r/kestrel/review', gbp_place_id: '' },
    [bare]: { company_name: 'No Site Ltd', email: 'hello@nosite.example' },
  };

  // A fake WordPress site per client; `old` is a site whose plugin has no Review Us routes yet
  const SITE = { user: 'copybot', appPassword: 'test-app-password-not-real' };
  const wpEdens = createFakeWp(SITE), wpOld = createFakeWp({ ...SITE, reviewFunnel: false }), wpDrop = createFakeWp({ ...SITE, dropEndpoint: true });
  const sEdens = await listen(wpEdens.app), sOld = await listen(wpOld.app), sDrop = await listen(wpDrop.app);
  let kestrelSite = sOld.url;
  const sites = { [edens]: () => ({ url: sEdens.url, ...SITE, staging: true }), [kestrel]: () => ({ url: kestrelSite, ...SITE, staging: false }) };
  const basic = s => ({ Authorization: 'Basic ' + Buffer.from(`${s.user}:${s.appPassword}`).toString('base64') });
  const wp = {
    wpPost: async (s, p, body) => { const r = await call(s.url, 'POST', `/wp-json${p}`, body, basic(s)); if (r.status >= 300) throw new Error(`POST ${p} → ${r.status}: ${r.text.slice(0, 200)}`); return r.json; },
    wpGet: async (s, p) => { const r = await call(s.url, 'GET', `/wp-json${p}`, undefined, basic(s)); if (r.status >= 300) throw new Error(`GET ${p} → ${r.status}`); return r.json; },
  };

  let clock = new Date('2026-11-12T09:00:00Z');
  const sent = [];
  let failTo = null; // an address whose email fails
  const send = async m => { if (failTo && m.to === failTo) throw new Error('Gmail POST messages/send failed: quota'); sent.push(m); };
  const quiet = { error: () => {}, info: () => {}, log: () => {} };
  const env = { COPYBOT_URL: 'https://copybot.example/' };
  const make = (over = {}) => S.createReviewFunnel({ pool, loadValues: async id => VALUES[id] || {}, siteFor: async id => (sites[id] ? sites[id]() : null), wp, send, env, now: () => clock, log: quiet, ...over });
  const svc = make();

  const app = express();
  let ms = 0;
  RT.mountPublic(app, svc, { log: quiet, now: () => ms });
  app.use(express.json());
  RT.mountApi(app, svc, { log: quiet });
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const api = (method, p, body) => call(base, method, p, body);

  // ── The card before anything is sent ──
  let v = (await api('GET', `/api/clients/${edens}/review-funnel`)).json;
  chk('The card: the link built from the listing, the client\'s email, the team\'s, the site, nothing sent yet', v.link.url === PLACE && v.link.source === 'listing' && v.client_email === 'ethan@edensedge.example' && v.team_email === 'team@locallaunchpad.co.uk' && v.site.url === sEdens.url && v.site.staging === true && v.sent === null && v.mail_on === true && v.feedback.length === 0, v);
  chk('Looking at the card writes nothing to the site', wpEdens.state.writes === 0);
  chk('A client nobody has: 404', (await api('GET', `/api/clients/${crypto.randomUUID()}/review-funnel`)).status === 404);

  // ── Sending the settings to the site ──
  let r = await api('POST', `/api/clients/${edens}/review-funnel/send-to-site`, { by: 'Ray' });
  chk('Send to the site needs the confirm: refused, and nothing written', r.status === 400 && /confirming/.test(r.json.error) && wpEdens.state.writes === 0, r.json);
  r = await api('POST', `/api/clients/${bare}/review-funnel/send-to-site`, { confirm: true });
  chk('No WordPress site connected: refused, saying so', r.status === 409 && /no WordPress site connected/.test(r.json.error), r.json);
  r = await api('POST', `/api/clients/${kestrel}/review-funnel/send-to-site`, { confirm: true });
  chk('A site whose plugin is too old: refused, saying to install the latest, and nothing recorded as sent', r.status === 409 && /too old for the Review Us page/.test(r.json.error) && (await api('GET', `/api/clients/${kestrel}/review-funnel`)).json.sent === null && Object.keys(wpOld.state.clientValues).length === 0, r.json);
  kestrelSite = sDrop.url;
  r = await api('POST', `/api/clients/${kestrel}/review-funnel/send-to-site`, { confirm: true });
  chk('A site that does not keep the address: an error, the values not sent, nothing recorded', r.status === 502 && /did not keep the address/.test(r.json.error) && Object.keys(wpDrop.state.clientValues).length === 0 && (await api('GET', `/api/clients/${kestrel}/review-funnel`)).json.sent === null, r.json);

  clock = new Date('2026-11-12T09:30:00Z');
  r = await api('POST', `/api/clients/${edens}/review-funnel/send-to-site`, { confirm: true, by: 'Ray' });
  const token = (await q(`SELECT token FROM review_funnel_sites WHERE client_id = $1`, [edens]))[0].token;
  chk('Sent: the site holds the address feedback goes to, on this Copybot, with the client\'s own long token', r.status === 200 && wpEdens.state.reviewEndpoint === `https://copybot.example/api/public/review-feedback/${token}` && /^[0-9a-f]{48}$/.test(token), wpEdens.state.reviewEndpoint);
  chk('Sent: the site holds the company name, the owner name and the Google link, and nothing else was written', JSON.stringify(wpEdens.state.clientValues) === JSON.stringify({ company_name: 'Edens Edge Landscaping', owner_name: 'Ethan Hall', review_url: PLACE }) && wpEdens.state.writes === 2, wpEdens.state.clientValues);
  chk('Sent: the card says when, by whom and where', r.json.sent && r.json.sent.by === 'Ray' && r.json.sent.to === sEdens.url && new Date(r.json.sent.at).toISOString() === '2026-11-12T09:30:00.000Z' && r.json.changed === false, r.json.sent);
  VALUES[edens].review_url = 'https://g.page/r/edens/review';
  v = (await api('GET', `/api/clients/${edens}/review-funnel`)).json;
  chk('A value changed since: the card says to send again', v.changed === true && v.link.source === 'typed');
  r = await api('POST', `/api/clients/${edens}/review-funnel/send-to-site`, { confirm: true, by: 'Ray' });
  chk('Sent again: the same token, the new link on the site', r.json.changed === false && wpEdens.state.clientValues.review_url === 'https://g.page/r/edens/review' && wpEdens.state.reviewEndpoint.endsWith(token) && (await q(`SELECT count(*)::int AS n FROM review_funnel_sites`))[0].n === 2);
  const noBase = make({ env: {} });
  let threw = null; try { await noBase.sendToSite(edens, { confirm: true }); } catch (e) { threw = e; }
  chk('With no address for Copybot itself nothing is sent', threw && /does not know its own address/.test(threw.message));

  // ── Private feedback arrives ──
  const feed = (tok, body) => api('POST', `${RT.baseOf ? S.PUBLIC_PATH : ''}/${tok}`, body);
  r = await feed('0'.repeat(48), SAM);
  chk('A token nobody has: 404, nothing stored', r.status === 404 && (await q(`SELECT count(*)::int AS n FROM review_feedback`))[0].n === 0);
  r = await feed(token, { ...SAM, stars: 5 });
  chk('5 stars sent here: 400 with the reason, nothing stored, nobody emailed', r.status === 400 && /1, 2 or 3 stars/.test(r.json.error) && (await q(`SELECT count(*)::int AS n FROM review_feedback`))[0].n === 0 && sent.length === 0, r.json);
  r = await api('POST', `${S.PUBLIC_PATH}/${token}`, '{not json');
  chk('A body that is not JSON: 400', r.status === 400);

  clock = new Date('2026-11-12T10:00:00Z');
  r = await feed(token, SAM);
  let rows = await q(`SELECT * FROM review_feedback`);
  chk('A good send: 200, stored against the right client', r.status === 200 && r.json.ok === true && rows.length === 1 && rows[0].client_id === edens && rows[0].stars === 2 && rows[0].name === 'Sam Carter' && rows[0].phone === '07700 900123' && rows[0].email === null && rows[0].feedback === SAM.feedback, rows[0]);
  chk('Two emails: the client first, then the team\'s copy', sent.length === 2 && sent[0].to === 'ethan@edensedge.example' && sent[1].to === 'team@locallaunchpad.co.uk', sent.map(m => m.to));
  chk('The client\'s email is their customer\'s feedback, to the owner by first name', sent[0].subject === 'A customer left private feedback (2 stars)' && sent[0].text.startsWith('Hi Ethan,') && sent[0].text.includes('Nobody called back.'));
  chk('The team\'s copy says the client was emailed, and links to the client\'s Reviews tab', sent[1].subject === 'Edens Edge Landscaping: private feedback (2 stars)' && sent[1].text.includes('The client was emailed at ethan@edensedge.example.') && sent[1].text.endsWith(`https://copybot.example/clients/${edens}/reviews`), sent[1].text);
  v = (await api('GET', `/api/clients/${edens}/review-funnel`)).json;
  chk('The card lists it as emailed to the client, nothing waiting', v.feedback.length === 1 && v.feedback[0].client_email === 'ethan@edensedge.example' && !!v.feedback[0].client_emailed_at && !!v.feedback[0].team_emailed_at && v.feedback[0].waiting === false, v.feedback[0]);

  // ── The client's email fails ──
  failTo = 'ethan@edensedge.example'; sent.length = 0;
  r = await feed(token, { ...SAM, name: 'Priya Shah', stars: 1, phone: '', email: 'priya@example.com', feedback: 'Two visits missed.' });
  v = (await api('GET', `/api/clients/${edens}/review-funnel`)).json;
  let priya = v.feedback.find(f => f.name === 'Priya Shah');
  chk('The client\'s email fails: the customer still gets a 200 and the message is kept', r.status === 200 && priya && priya.stars === 1 && priya.email === 'priya@example.com');
  chk('It is marked as not had by the client, with the reason', priya.waiting === true && !priya.client_emailed_at && /quota/.test(priya.client_error), priya);
  chk('The team is still told, and told the client was not', sent.length === 1 && sent[0].to === 'team@locallaunchpad.co.uk' && /did NOT send: Gmail POST messages\/send failed: quota\. Pass this on/.test(sent[0].text), sent.map(m => m.text));
  failTo = null; sent.length = 0;
  clock = new Date('2026-11-12T10:20:00Z');
  r = await api('POST', `/api/clients/${edens}/review-funnel/feedback/${priya.id}/resend`);
  priya = r.json.feedback.find(f => f.name === 'Priya Shah');
  chk('Send again: the client is emailed, the team is not sent a second copy, and it stops waiting', r.status === 200 && sent.length === 1 && sent[0].to === 'ethan@edensedge.example' && priya.waiting === false && !!priya.client_emailed_at && priya.client_error === '', sent.map(m => m.to));
  r = await api('POST', `/api/clients/${kestrel}/review-funnel/feedback/${priya.id}/resend`);
  chk('Another client\'s feedback cannot be sent again from here', r.status === 404);

  // ── A client with no email on the record ──
  kestrelSite = sEdens.url; // any site that keeps what it is sent
  r = await api('POST', `/api/clients/${kestrel}/review-funnel/send-to-site`, { confirm: true });
  const kToken = (await q(`SELECT token FROM review_funnel_sites WHERE client_id = $1`, [kestrel]))[0].token;
  chk('A blank owner name is not sent, so it never clears one on the site; a typed link is sent as typed', r.status === 200 && wpEdens.state.clientValues.owner_name === 'Ethan Hall' && wpEdens.state.clientValues.review_url === 'https://g.page/r/kestrel/review' && kToken !== token, wpEdens.state.clientValues);
  sent.length = 0;
  r = await feed(kToken, { ...SAM, stars: 3 });
  v = (await api('GET', `/api/clients/${kestrel}/review-funnel`)).json;
  chk('No client email: only the team is emailed, and told to pass it on', r.status === 200 && sent.length === 1 && sent[0].to === 'team@locallaunchpad.co.uk' && /NOT emailed: there is no email address on their record\. Pass this on/.test(sent[0].text) && sent[0].subject === 'Kestrel Ridge Roofing: private feedback (3 stars)', sent.map(m => m.text));
  chk('It waits on the card with the reason, and belongs to Kestrel only', v.feedback.length === 1 && v.feedback[0].waiting === true && /No email address on the client record/.test(v.feedback[0].client_error) && (await api('GET', `/api/clients/${edens}/review-funnel`)).json.feedback.length === 2, v.feedback[0]);
  r = await api('POST', `/api/clients/${kestrel}/review-funnel/feedback/${v.feedback[0].id}/handled`, { by: 'Ray' });
  chk('"I passed it on": it stops waiting, with who and when', r.status === 200 && r.json.feedback[0].waiting === false && r.json.feedback[0].handled_by === 'Ray' && !!r.json.feedback[0].handled_at, r.json.feedback[0]);

  // ── Email not connected on the server ──
  const noMail = make({ send: null });
  sent.length = 0;
  const got = await noMail.receive(token, { ...SAM, name: 'Lee Wong' });
  const lee = (await noMail.view(edens)).feedback.find(f => f.name === 'Lee Wong');
  chk('With email not connected the message is still kept, waits, and says why', got.ok === true && sent.length === 0 && lee.waiting === true && /Email is not connected/.test(lee.client_error) && /Email is not connected/.test(lee.team_error) && (await noMail.view(edens)).mail_on === false, lee);

  // ── The hourly limit on one token ──
  const before = (await q(`SELECT count(*)::int AS n FROM review_feedback WHERE client_id = $1`, [bare]))[0].n;
  await svc.tokenFor(bare);
  const bToken = (await q(`SELECT token FROM review_funnel_sites WHERE client_id = $1`, [bare]))[0].token;
  const codes = [];
  for (let i = 0; i < RT.PER_HOUR + 1; i++) codes.push((await feed(bToken, SAM)).status);
  chk(`${RT.PER_HOUR} sends an hour on one token, the next is refused with a 429 and not stored`, codes.slice(0, RT.PER_HOUR).every(c => c === 200) && codes[RT.PER_HOUR] === 429 && (await q(`SELECT count(*)::int AS n FROM review_feedback WHERE client_id = $1`, [bare]))[0].n === before + RT.PER_HOUR, codes.slice(-3));
  ms = 3600001;
  chk('An hour later it is taken again', (await feed(bToken, SAM)).status === 200);
  chk('Asking for a client\'s token twice gives the same one', (await svc.tokenFor(bare)) === bToken);

  // ── The only email to a client is their own customer's feedback ──
  const src = ['rules.js', 'service.js', 'routes.js'].map(f => require('fs').readFileSync(path.join(root, 'review-funnel', f), 'utf8')).join('\n');
  chk('The module sends through the one `send` it is given, and writes to a site only through the two plugin routes', !/nodemailer|sendMail|twilio|whatsapp\.com|https?\.request|fetch\(/i.test(src) && (src.match(/wpPost\(/g) || []).length === 2 && src.includes("'/llp-copybot/v1/review-funnel'") && src.includes("'/llp-copybot/v1/client-values'"));

  srv.close(); sEdens.server.close(); sOld.server.close(); sDrop.server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
