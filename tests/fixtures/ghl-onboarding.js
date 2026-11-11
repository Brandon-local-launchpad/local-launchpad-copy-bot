'use strict';
// Fixture: onboarding answers from GoHighLevel (ghl-onboarding/). The webhook's secret, the
// audit trail, which client a send belongs to (contact id, email, nobody), sends that arrive
// before their client exists, what is saved and what is never overwritten, the Tracker steps
// (one per kind however many times a send repeats), the Done ticks, and complete.
// Postgres in memory, a real express app on a local port. No email leaves this test.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const R = require(path.join(root, 'ghl-onboarding/rules.js'));
const S = require(path.join(root, 'ghl-onboarding/service.js'));
const RT = require(path.join(root, 'ghl-onboarding/routes.js'));
const { trackerOf } = require(path.join(root, 'ui/tracker.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: onboarding answers from GHL (webhook, matching, the record, the Tracker) ===\n');

// The brief's example send
const EXAMPLE = {
  ghl_contact_id: 'aB3xK9pQ2', email: 'john@johnselectrical.co.uk', first_name: 'John', last_name: 'Smith', phone: '+447700900123', company_name: 'Johns Electrical',
  stage: 'complete', gbp_status: 'Created a new one', gbp_category: 'Electrician', domain_provider: 'GoDaddy', domain: 'johnselectrical.co.uk', provider_login_email: 'john@johnselectrical.co.uk',
  domain_name_ideas: '', facebook_page: 'Existing page: facebook.com/johnselectrical', instagram_account: 'New account: johnselectrical',
  summary: 'Stage: complete | GBP: Created a new one (Electrician) | Domain: GoDaddy, johnselectrical.co.uk',
};

// ── The pure rules ──
chk('The domain is tidied: lower case, no scheme, no www, no slash or path', R.tidyDomain('https://www.JohnsPlumbing.co.uk/') === 'johnsplumbing.co.uk' && R.tidyDomain('HTTP://Example.co.uk/contact?x=1') === 'example.co.uk' && R.tidyDomain(' johnselectrical.co.uk ') === 'johnselectrical.co.uk' && R.tidyDomain('') === '', R.tidyDomain('https://www.JohnsPlumbing.co.uk/'));
chk('A key that could hold a password is never kept', !('password' in R.clean({ ...EXAMPLE, password: 'hunter2', domain_password: 'x', Passcode: 'y' })) && Object.keys(R.clean({ ...EXAMPLE, password: 'hunter2', domain_password: 'x', Passcode: 'y' })).length === Object.keys(EXAMPLE).length);

let st = R.mergeState(null, { ...EXAMPLE, stage: 'domain', facebook_page: '' }, '2026-11-11T10:00:00.000Z');
chk('A first send: the answers, the stage and its time', st.answers.domain_provider === 'GoDaddy' && st.stage === 'domain' && st.stages.domain === '2026-11-11T10:00:00.000Z' && !st.completed_at && !st.answers.facebook_page);
st = R.mergeState(st, { stage: 'gbp', gbp_status: '', domain_provider: '', domain: '', facebook_page: 'Not sent yet' }, '2026-11-11T10:05:00.000Z');
chk('A later send with empty values never wipes a saved one, and fills what was blank', st.answers.gbp_status === 'Created a new one' && st.answers.domain === 'johnselectrical.co.uk' && st.answers.facebook_page === 'Not sent yet');
chk('The stage is the furthest reached; the earlier stage still gets its own time', st.stage === 'domain' && st.stages.gbp === '2026-11-11T10:05:00.000Z');
st = R.handEdit(st, 'domain_provider', 'IONOS');
st = R.mergeState(st, { ...EXAMPLE }, '2026-11-11T10:10:00.000Z');
chk('A value a person typed is Hand and a later send never replaces it', st.answers.domain_provider === 'IONOS' && st.hand.domain_provider === true && st.completed_at === '2026-11-11T10:10:00.000Z' && st.stage === 'complete');
const old = R.mergeState(st, { stage: 'started', gbp_status: 'Already had one', domain_name_ideas: 'johnsparks.co.uk' }, '2026-11-10T09:00:00.000Z');
chk('An older send merged late only fills blanks', old.answers.gbp_status === 'Created a new one' && old.answers.domain_name_ideas === 'johnsparks.co.uk' && old.stage === 'complete');

// Which client
const CL = [{ id: 'c1', ghl_contact_id: 'aB3xK9pQ2', emails: ['other@x.co.uk'] }, { id: 'c2', ghl_contact_id: '', emails: [' John@JohnsElectrical.co.uk '] }, { id: 'c3', ghl_contact_id: '', emails: ['dup@x.co.uk'] }, { id: 'c4', ghl_contact_id: '', emails: ['dup@x.co.uk'] }];
chk('The GHL contact id comes first', R.pickClient(EXAMPLE, CL).client_id === 'c1' && R.pickClient(EXAMPLE, CL).by === 'contact_id');
chk('Then the email, trimmed and whatever the case', R.pickClient({ ...EXAMPLE, ghl_contact_id: 'zzz', email: '  JOHN@johnselectrical.co.uk' }, CL).client_id === 'c2' && R.pickClient({ ...EXAMPLE, ghl_contact_id: 'zzz' }, CL).by === 'email');
chk('No match: nobody', R.pickClient({ ghl_contact_id: 'zzz', email: 'nobody@x.co.uk' }, CL).client_id === null);
chk('An email on two clients is not guessed', R.pickClient({ email: 'dup@x.co.uk' }, CL).client_id === null && /2 clients/.test(R.pickClient({ email: 'dup@x.co.uk' }, CL).why));

// The Tracker steps
const steps = (answers, more = {}) => R.stepsOf({ answers, stage: '', stages: {}, completed_at: null, ticks: {}, ...more });
const one = (provider, more = {}) => steps({ domain_provider: provider, domain: 'johnselectrical.co.uk', provider_login_email: 'john@johnselectrical.co.uk', domain_name_ideas: 'johnsparks.co.uk', ...more }).needs[0] || {};
chk('GoDaddy: send the access request, with the login email, the domain and where it is done', one('GoDaddy').text === 'Send the GoDaddy access request' && one('GoDaddy').why.includes('Login email: john@johnselectrical.co.uk. Domain: johnselectrical.co.uk.') && one('GoDaddy').why.includes('Manage Sites → Add Site → add new client with "Client account access: Yes"'), one('GoDaddy'));
chk('IONOS: send the access request, with the login email and the domain', one('IONOS').text === 'Send the IONOS access request' && one('IONOS').why === 'Login email: john@johnselectrical.co.uk. Domain: johnselectrical.co.uk.');
chk('Squarespace, Namecheap, Wix, Hostinger, Cloudflare: accept the invite from that provider', ['Squarespace', 'Namecheap', 'Wix', 'Hostinger', 'Cloudflare'].every(p => one(p).text === `Accept the domain invite from ${p}` && one(p).why === 'Domain: johnselectrical.co.uk.'));
chk('123 Reg and Fasthosts: log in with the WhatsApp details, and delete the message after', ['123 Reg', 'Fasthosts'].every(p => one(p).text === 'Log in with the details sent on WhatsApp' && one(p).why.includes('Delete the WhatsApp message after logging in.')));
chk('Wix not connected to a website: message the client; not the invite step', one('Wix (not connected to a website)').text === 'Message the client about their Wix domain');
chk('Other provider: check what access was set up', one('Other provider').text === 'Check what access the client set up');
chk('No domain yet: choose and buy it, with the name ideas', one('No domain yet').text === 'Choose and buy the domain (domain-buying SOP)' && one('No domain yet').why === 'Name ideas: johnsparks.co.uk.');
chk('No provider answered, or one not on the list: no domain step', !steps({}).needs.length && !steps({ domain_provider: 'Something new' }).needs.length);
const urgent = steps({ domain_provider: 'GoDaddy', provider_login_email: 'j@x.co.uk' }, { stages: { 'domain-access-request': '2026-11-11T10:00:00Z' } }).needs[0];
chk('A GoDaddy or IONOS client at the access request step: urgent, and it says the client is waiting', urgent.urgent === true && urgent.text === 'Urgent: Send the GoDaddy access request' && urgent.why.endsWith('The client is waiting for this email.') && !steps({ domain_provider: 'Wix' }, { stages: { 'domain-access-request': 'x' } }).needs[0].urgent);
chk('GBP already had or created: accept the manager invite, with the category', ['Already had one', 'Created a new one'].every(g => steps({ gbp_status: g, gbp_category: 'Electrician' }).needs[0].text === 'Accept the Google Business Profile manager invite') && steps({ gbp_status: 'Already had one', gbp_category: 'Electrician' }).needs[0].why === 'Category the client gave: Electrician.');
chk('GBP started and not finished: help the client finish', steps({ gbp_status: 'Started creating, not finished' }).needs[0].text === 'Help the client finish their Google Business Profile');
chk('Facebook or Instagram "not sent yet": chase', steps({ facebook_page: 'New page: not sent yet', instagram_account: 'NOT SENT YET' }).needs.map(n => n.text).join('|') === 'Chase the client for their Facebook page|Chase the client for their Instagram username');
chk('Empty Facebook and Instagram: nothing until onboarding is complete, then chase', !steps({}).needs.length && steps({}, { stage: 'complete', completed_at: 'x' }).needs.length === 2 && !steps({ facebook_page: 'Existing page: fb.com/x', instagram_account: 'New account: x' }, { completed_at: 'x' }).needs.length);
chk('Complete: a done line', steps({}, { completed_at: '2026-11-11T10:00:00Z' }).done.some(d => d.key === 'onb_complete' && d.text === 'Onboarding answers received from GHL' && d.at === '2026-11-11T10:00:00Z'));

// Into the Tracker
const base = { niche_known: true, missing: [], now: new Date('2026-11-11T12:00:00Z') };
chk('A client GHL has sent nothing about: the Tracker is exactly as it was', JSON.stringify(trackerOf(base)) === JSON.stringify(trackerOf({ ...base, onboarding: null })) && !trackerOf(base).needs.some(n => n.key.startsWith('onb_')));
const tr = trackerOf({ ...base, onboarding: { answers: { domain_provider: 'IONOS', gbp_status: 'Already had one' }, stage: 'domain-access-request', stages: { 'domain-access-request': 'x' }, completed_at: null, ticks: {} } });
chk('The urgent access request is the first thing for a person; the other steps follow the existing ones, each with a Done tick', tr.needs[0].key === 'onb_domain' && tr.next.text === 'Urgent: Send the IONOS access request' && tr.needs[tr.needs.length - 1].key === 'onb_gbp' && tr.needs[0].tick === 'domain' && tr.needs.filter(n => !n.key.startsWith('onb_')).map(n => n.key).join() === trackerOf(base).needs.map(n => n.key).join(), tr.needs.map(n => n.key).join());

// ── The service, on Postgres in memory behind a real app ──
const post = (port, pathName, body, headers = {}) => new Promise((resolve, reject) => {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: pathName, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } }, res => {
    let text = ''; res.on('data', c => { text += c; }); res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch (_) { /* not JSON */ } resolve({ status: res.statusCode, body: json }); });
  });
  req.on('error', reject); req.end(data);
});

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), archived_at TIMESTAMPTZ)`);
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE client_fields (client_id UUID NOT NULL, field_key TEXT NOT NULL, value TEXT, status TEXT)`);
  await S.ensureOnboardingTables(pool);

  const q = async (sql, p = []) => (await pool.query(sql, p)).rows;
  const newClient = async (name, cv = null, field = null) => {
    const id = (await q(`INSERT INTO clients (name, trade) VALUES ($1, 'Electrician') RETURNING id`, [name]))[0].id;
    if (cv) await q(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [id, JSON.stringify(cv)]);
    if (field) await q(`INSERT INTO client_fields (client_id, field_key, value, status) VALUES ($1, 'business_email', $2, 'filled')`, [id, field]);
    return id;
  };
  const cvOf = async id => JSON.parse((await q(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [id]))[0].content);
  const events = () => q(`SELECT id, stage, client_id, matched_by, status, payload FROM onboarding_events ORDER BY received_at`);

  let clock = new Date('2026-11-11T09:00:00Z');
  const tick = (mins = 1) => { clock = new Date(clock.getTime() + mins * 60000); };
  const told = [];
  const quiet = { error: () => {}, info: () => {}, log: () => {} };
  const svc = S.createOnboarding({ pool, now: () => clock, log: quiet, notify: async m => { told.push({ client: m.client.name, stage: m.stage }); } });

  const SECRET = 'a-long-shared-secret-for-the-test';
  const app = express();
  RT.mountWebhook(app, svc, { secret: SECRET, log: quiet });
  const open = express();
  RT.mountWebhook(open, svc, { secret: '', log: quiet });
  app.use(express.json());
  RT.mountApi(app, svc);
  const srv = http.createServer(app), srv2 = http.createServer(open);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  await new Promise(r => srv2.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const send = async (payload, headers = { 'X-LL-Secret': SECRET }) => { tick(); const r = await post(port, RT.PATH, payload, headers); await new Promise(done => setTimeout(done, 5)); await svc.rematch(); await svc.rematch(); return r; };   // the route processes after it answers: wait for that

  // ── The secret ──
  const none = await send(EXAMPLE, {});
  const wrong = await send(EXAMPLE, { 'X-LL-Secret': SECRET + 'x' });
  const query = await post(port, `${RT.PATH}?token=${SECRET}`, EXAMPLE);
  chk('No X-LL-Secret: 401', none.status === 401, none.status);
  chk('The wrong X-LL-Secret: 401', wrong.status === 401, wrong.status);
  chk('The secret anywhere but the header does not count', query.status === 401, query.status);
  chk('GHL_ONBOARDING_SECRET not set: everything is refused', (await post(srv2.address().port, RT.PATH, EXAMPLE, { 'X-LL-Secret': '' })).status === 401 && (await post(srv2.address().port, RT.PATH, EXAMPLE, { 'X-LL-Secret': 'anything' })).status === 401);
  chk('A refused send is not stored', (await events()).length === 0, (await events()).length);
  chk('The comparison is constant time whatever the lengths, and never true for nothing', RT.secretMatches(SECRET, SECRET) && !RT.secretMatches('a', SECRET) && !RT.secretMatches('', SECRET) && !RT.secretMatches(undefined, SECRET) && !RT.secretMatches(SECRET, ''));
  chk('A body that is not a JSON object: 400, not stored', (await send('[1,2]')).status === 400 && (await send('not json')).status === 400 && (await events()).length === 0);

  // ── By contact id ──
  const john = await newClient('Johns Electrical', { email: 'office@johnselectrical.co.uk', phone: '', company_name: 'Johns Electrical Ltd', live_domain: '', primary_category: 'Electrician', _sources: { primary_category: 'hand' } });
  await q(`UPDATE clients SET ghl_contact_id = 'aB3xK9pQ2' WHERE id = $1`, [john]);
  const r1 = await send({ ...EXAMPLE, stage: 'domain-access-request', password: 'hunter2', facebook_page: '', instagram_account: '' });
  let ev = await events();
  chk('The right secret: 200 with the event id, and the send is stored', r1.status === 200 && r1.body.ok === true && ev.length === 1 && ev[0].id === r1.body.id, r1);
  chk('The audit row: the stage, the matched client, how it matched, the full JSON', ev[0].stage === 'domain-access-request' && ev[0].client_id === john && ev[0].matched_by === 'contact_id' && ev[0].status === 'processed' && JSON.parse(ev[0].payload).summary === EXAMPLE.summary, ev[0]);
  chk('A password in the send is not stored anywhere', !/hunter2/.test(JSON.stringify(ev)) && !/hunter2/.test(JSON.stringify(await q(`SELECT state FROM client_onboarding`))));
  let cv = await cvOf(john);
  chk('Phone was empty: filled, with the source Onboarding (GHL)', cv.phone === '+447700900123' && cv._sources.phone === 'ghl' && R.SOURCE_LABEL === 'Onboarding (GHL)', cv);
  chk('Email and company name were already there: left alone', cv.email === 'office@johnselectrical.co.uk' && cv.company_name === 'Johns Electrical Ltd' && !cv._sources.email);
  chk('Live domain was empty: filled with the tidied domain', cv.live_domain === 'johnselectrical.co.uk' && cv._sources.live_domain === 'ghl');
  chk('Primary category is never written from the GBP category', cv.primary_category === 'Electrician' && cv._sources.primary_category === 'hand');
  let v = await svc.view(john);
  chk('The Record card: the stage, the time of the send, each answer with its source', v.has && v.stage === 'domain-access-request' && v.stages.length === 1 && v.answers.find(a => a.key === 'domain_provider').value === 'GoDaddy' && v.answers.find(a => a.key === 'domain_provider').source === 'ghl' && v.answers.find(a => a.key === 'facebook_page').source === '' && v.domain_difference === null, v);
  chk('The operator is told about the access request, once', told.length === 1 && told[0].stage === 'domain-access-request' && told[0].client === 'Johns Electrical', told);

  // ── The same send three times: still one step of each kind ──
  for (let i = 0; i < 3; i++) await send({ ...EXAMPLE, stage: 'domain-access-request', facebook_page: '', instagram_account: '' });
  const facts = async id => (await S.loadOnboardingFacts(pool)).get(id);
  let t = trackerOf({ ...base, onboarding: await facts(john) });
  const onb = x => x.needs.filter(n => n.key.startsWith('onb_')).map(n => n.key);
  chk('Sent four times in all: four audit rows, one domain step, one GBP step', (await events()).length === 4 && onb(t).join() === 'onb_domain,onb_gbp', onb(t).join());
  chk('The operator was not told again', told.length === 1, told.length);

  // ── Done ticks ──
  await svc.tick(john, 'gbp', true, 'Ray');
  t = trackerOf({ ...base, onboarding: await facts(john) });
  chk('Done on the GBP step: it leaves Needs a person and shows as ticked, by whom', onb(t).join() === 'onb_domain' && t.done.some(d => d.key === 'onb_gbp_done' && /ticked done by Ray/.test(d.text)), t.done);
  await send({ ...EXAMPLE, stage: 'domain', facebook_page: '', instagram_account: '' });
  chk('The same answers sent again: the tick holds', onb(trackerOf({ ...base, onboarding: await facts(john) })).join() === 'onb_domain');
  await send({ ...EXAMPLE, stage: 'domain', gbp_status: 'Started creating, not finished', facebook_page: '', instagram_account: '' });
  t = trackerOf({ ...base, onboarding: await facts(john) });
  chk('The GBP answer changes: the step opens again as the new one', t.needs.some(n => n.key === 'onb_gbp' && n.text === 'Help the client finish their Google Business Profile') && !t.done.some(d => d.key === 'onb_gbp_done'));
  chk('Done on a step that is not open: refused', await svc.tick(john, 'facebook', true).then(() => false, e => e.status === 404));

  // ── The client changes provider: the old step closes, the new one opens ──
  await send({ ...EXAMPLE, stage: 'domain', domain_provider: 'No domain yet', domain: '', provider_login_email: '', domain_name_ideas: 'johnsparks.co.uk, sparksbyjohn.co.uk', gbp_status: '', facebook_page: '', instagram_account: '' });
  t = trackerOf({ ...base, onboarding: await facts(john) });
  const dom = t.needs.filter(n => n.key === 'onb_domain');
  chk('GoDaddy to No domain yet: one domain step, now "Choose and buy the domain", and no longer urgent', dom.length === 1 && dom[0].text === 'Choose and buy the domain (domain-buying SOP)' && dom[0].why === 'Name ideas: johnsparks.co.uk, sparksbyjohn.co.uk.' && !t.needs.some(n => /GoDaddy/.test(n.text)), dom);

  // ── A person's correction ──
  await svc.edit(john, 'domain_provider', 'Cloudflare');
  await send({ ...EXAMPLE, stage: 'citations', facebook_page: 'Not sent yet', instagram_account: '' });
  v = await svc.view(john);
  chk('A provider typed on the Record tab is Hand, and the next send does not replace it', v.answers.find(a => a.key === 'domain_provider').value === 'Cloudflare' && v.answers.find(a => a.key === 'domain_provider').source === 'hand');
  chk('Not sent yet: the Facebook chase opens; Instagram is empty and onboarding is not complete, so no chase', onb(trackerOf({ ...base, onboarding: await facts(john) })).join() === 'onb_domain,onb_facebook', onb(trackerOf({ ...base, onboarding: await facts(john) })).join());

  // ── Hand values and the Live domain difference ──
  cv = await cvOf(john);
  cv.live_domain = 'https://www.JohnsElectrical.co.uk/'; cv._sources.live_domain = 'hand'; cv.phone = '023 8000 0000'; cv._sources.phone = 'hand';
  await q(`UPDATE client_assets SET content = $2 WHERE client_id = $1`, [john, JSON.stringify(cv)]);
  await send({ ...EXAMPLE, stage: 'citations', facebook_page: '', instagram_account: '' });
  chk('The same domain written differently is not flagged', (await svc.view(john)).domain_difference === null);
  await send({ ...EXAMPLE, stage: 'citations', domain: 'JohnSparks.co.uk', facebook_page: '', instagram_account: '' });
  cv = await cvOf(john); v = await svc.view(john);
  chk('A different domain: Live domain is kept and the difference is flagged on the record', cv.live_domain === 'https://www.JohnsElectrical.co.uk/' && v.domain_difference && v.domain_difference.given === 'johnsparks.co.uk' && v.domain_difference.live === 'https://www.JohnsElectrical.co.uk/', v.domain_difference);
  chk('A value marked Hand is never overwritten', cv.phone === '023 8000 0000' && cv._sources.phone === 'hand');

  // ── Complete ──
  await send({ ...EXAMPLE, facebook_page: '', instagram_account: '' });
  await send({ ...EXAMPLE, facebook_page: '', instagram_account: '' });
  v = await svc.view(john);
  t = trackerOf({ ...base, onboarding: await facts(john) });
  chk('Complete: marked with the time of the first complete send', v.stage === 'complete' && !!v.completed_at && new Date(v.completed_at).getTime() === clock.getTime() - 60000, v.completed_at);
  chk('"Onboarding answers received from GHL" is on Done by Copybot', t.done.some(d => d.key === 'onb_complete' && d.text === 'Onboarding answers received from GHL'));
  chk('Instagram still empty at complete: chase; Facebook keeps its saved "Not sent yet" and its chase', onb(t).includes('onb_instagram') && onb(t).includes('onb_facebook'));
  chk('The operator is told about complete once, however many times it is sent', told.filter(x => x.stage === 'complete').length === 1 && told.length === 2, told);

  // ── By email ──
  const kes = await newClient('Kestrel Ridge Roofing', null, 'Info@KestrelRidge.co.uk ');
  await send({ ghl_contact_id: 'kes-1', email: ' info@kestrelridge.co.uk', company_name: 'Kestrel Ridge', phone: '07000 000000', stage: 'started' });
  ev = (await events()).pop();
  chk('No contact id on the client: matched by email, trimmed and whatever the case', ev.client_id === kes && ev.matched_by === 'email', ev);
  chk('The contact id is saved on the client', (await q(`SELECT ghl_contact_id FROM clients WHERE id = $1`, [kes]))[0].ghl_contact_id === 'kes-1');
  await send({ ghl_contact_id: 'kes-1', email: 'someone.else@gmail.com', stage: 'gbp', gbp_status: 'Already had one' });
  ev = (await events()).pop();
  chk('The next send, with another email, matches on the contact id', ev.client_id === kes && ev.matched_by === 'contact_id');
  cv = await cvOf(kes);
  chk('A client with no values yet: email, phone and company name filled, each sourced to GHL', cv.email === 'info@kestrelridge.co.uk' && cv.phone === '07000 000000' && cv.company_name === 'Kestrel Ridge' && cv._sources.email === 'ghl' && Object.keys(cv._ghl_filled).sort().join() === 'company_name,email,phone', cv);
  chk('A contact id already on a client is not replaced', await (async () => { await send({ ghl_contact_id: 'another', email: 'info@kestrelridge.co.uk', stage: 'gbp' }); return (await q(`SELECT ghl_contact_id FROM clients WHERE id = $1`, [kes]))[0].ghl_contact_id === 'kes-1'; })());

  // ── Nobody: no client is made, and the send waits ──
  const before = (await q(`SELECT id FROM clients`)).length;
  await send({ ghl_contact_id: 'new-1', email: 'sam@newclient.co.uk', company_name: 'New Client Plumbing', first_name: 'Sam', stage: 'started', summary: 'Stage: started' });
  await send({ ghl_contact_id: 'new-1', email: 'sam@newclient.co.uk', company_name: 'New Client Plumbing', stage: 'gbp', gbp_status: 'Already had one', summary: 'Stage: gbp' });
  ev = (await events()).slice(-2);
  chk('No match: the sends are kept as unmatched and no client is created', ev.every(e => e.status === 'unmatched' && e.client_id === null) && (await q(`SELECT id FROM clients`)).length === before, ev.map(e => e.status));
  chk('Under 24 hours old: not on the Unmatched onboarding card (the client may not exist yet)', (await svc.unmatched()).length === 0);
  // The Fillout form arrives and makes the client: the waiting sends match by themselves, oldest first
  const sam = await newClient('New Client Plumbing', null, 'sam@newclient.co.uk');
  const rm = await svc.rematch();
  ev = (await events()).slice(-2);
  v = await svc.view(sam);
  chk('The client is created: both waiting sends match and are processed in the order they arrived', rm.matched === 2 && ev.every(e => e.status === 'processed' && e.client_id === sam) && v.stage === 'gbp' && v.stages.map(s => s.stage).join() === 'started,gbp' && new Date(v.stages[0].at) < new Date(v.stages[1].at), { rm, stages: v.stages });
  chk('Their stage times are when GHL sent them, not when they matched', new Date(v.stages[1].at).getTime() === clock.getTime());
  chk('Nothing left waiting: another pass does nothing', (await svc.rematch()).waiting === 0);

  // An email set on an existing client later: the same
  const late = await newClient('Late Email Ltd', { email: '' });
  await send({ ghl_contact_id: 'late-1', email: 'boss@lateemail.co.uk', stage: 'started' });
  cv = await cvOf(late); cv.email = 'Boss@LateEmail.co.uk';
  await q(`UPDATE client_assets SET content = $2 WHERE client_id = $1`, [late, JSON.stringify(cv)]);
  const lateRun = await svc.rematch();
  chk('An email typed onto a client later: the waiting send matches on the next pass', lateRun.matched === 1 && (await svc.view(late)).stage === 'started', { lateRun, ev: (await events()).pop() });

  // Archived clients are not matched
  const gone = await newClient('Archived Co', { email: 'old@archived.co.uk' });
  await q(`UPDATE clients SET archived_at = NOW() WHERE id = $1`, [gone]);
  await send({ ghl_contact_id: 'arch-1', email: 'old@archived.co.uk', stage: 'started', company_name: 'Archived Co', summary: 'Stage: started' });
  chk('An archived client is not matched', (await events()).pop().status === 'unmatched');

  // ── The Unmatched onboarding card ──
  await send({ ghl_contact_id: 'lost-1', email: 'lost@nowhere.co.uk', company_name: 'Lost Roofing', stage: 'complete', summary: 'Stage: complete | GBP: Already had one', gbp_status: 'Already had one' });
  let un = await svc.unmatched();
  chk('An unmatched complete shows at once, with the summary, email and company name', un.length === 1 && un[0].company_name === 'Lost Roofing' && un[0].email === 'lost@nowhere.co.uk' && un[0].summary === 'Stage: complete | GBP: Already had one', un);
  tick(24 * 60 + 5);
  un = await svc.unmatched();
  chk('After 24 hours the other unmatched send shows too', un.length === 2 && un.some(e => e.company_name === 'Archived Co'), un.map(e => e.company_name));
  const lost = await newClient('Lost Roofing Ltd');
  const api = await post(port, `/api/onboarding/events/${un.find(e => e.company_name === 'Lost Roofing').id}/attach`, { client_id: lost });
  v = await svc.view(lost);
  chk('Attached by hand: processed as normal, the contact id saved, the Tracker steps there', api.status === 200 && api.body.status === 'processed' && v.completed_at && (await q(`SELECT ghl_contact_id FROM clients WHERE id = $1`, [lost]))[0].ghl_contact_id === 'lost-1' && onb(trackerOf({ ...base, onboarding: await facts(lost) })).join() === 'onb_gbp,onb_facebook,onb_instagram', api.body);
  chk('It leaves the card, and attaching it twice is refused', (await svc.unmatched()).length === 1 && (await post(port, `/api/onboarding/events/${api.body && un[0].id === undefined ? '' : un.find(e => e.company_name === 'Lost Roofing').id}/attach`, { client_id: lost })).status === 409);
  chk('Attach with no client picked: refused', (await post(port, `/api/onboarding/events/${un.find(e => e.company_name === 'Archived Co').id}/attach`, {})).status === 400);

  // ── The operator's email ──
  const mail = S.operatorEmail({ to: 'ray@ll.example', name: 'Ray Smith', client: { id: john, name: 'Johns Electrical' }, stage: 'domain-access-request', state: { answers: { domain_provider: 'GoDaddy', domain: 'johnselectrical.co.uk', provider_login_email: 'john@johnselectrical.co.uk' }, stages: { 'domain-access-request': 'x' } }, link: 'https://copybot.example/clients/1' });
  chk('The email is to the operator, says what the client is waiting for, lists the steps and links to the client', mail.to === 'ray@ll.example' && mail.subject === 'Johns Electrical: the client is waiting for the GoDaddy access request' && mail.text.startsWith('Hi Ray,') && mail.text.includes('- Urgent: Send the GoDaddy access request') && mail.text.endsWith('Open the client: https://copybot.example/clients/1') && !/[—–]/.test(mail.text), mail.text);
  const src = ['rules.js', 'service.js', 'routes.js'].map(f => require('fs').readFileSync(path.join(root, 'ghl-onboarding', f), 'utf8')).join('\n');
  chk('The module never creates a client and has no way to send anything itself', !/INSERT INTO clients/i.test(src) && !/nodemailer|sendMail|twilio|fetch\(|https?\.request|whatsapp\.com/i.test(src));

  srv.close(); srv2.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
