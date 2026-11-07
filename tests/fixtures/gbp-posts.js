'use strict';
// Fixture: the GBP Posts tab (Stage 2 of the bundle.social build). pg-mem, a canned model, a fake
// Drive; no network. The rules tested are Brandon's brief (docs/current-build/Bundle_Social_Build_Brief.md):
// 13, 26 or 52 posts at 2 a week, photos spread evenly, one Offer post a month from the confirmed
// offer running 28 days with no button, earlier openings passed on, no phone numbers, nothing
// goes out until a VA approves. The client is the Lead Snap fixture's plumber.
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { newDb, DataType } = require('pg-mem');
const root = path.join(__dirname, '../..');
const P = require(path.join(root, 'gbp-posts/plan.js'));
const W = require(path.join(root, 'gbp-posts/write.js'));
const { mountGbpPostsApi } = require(path.join(root, 'gbp-posts/routes.js'));
const { createAutopostStore } = require(path.join(root, 'leadsnap/autopost/store.js'));
const { createDriveStore } = require(path.join(root, 'drive/store.js'));
const { buildIntake } = require(path.join(root, 'leadsnap/autopost/intake.js'));
const { decide } = require(path.join(root, 'leadsnap/autopost/decide.js'));
const G = require(path.join(root, 'leadsnap/autopost/generate.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: GBP Posts ===\n');

// ── The client: the Lead Snap fixture's plumber, with a real config's shape ──
const CLIENT = '11111111-1111-4111-8111-111111111111';
const TODAY = '2026-11-09';  // a Monday
const I = {
  name: 'Hartley Plumbing & Heating', primary: 'Plumber', town: 'Romford', areas: ['Romford', 'Hornchurch', 'Upminster', 'Gidea Park', 'Harold Wood', 'Collier Row', 'Dagenham', 'Brentwood'],
  serviceAreasPageMap: ['Romford', 'Hornchurch', 'Upminster', 'Gidea Park', 'Harold Wood', 'Collier Row', 'Dagenham', 'Brentwood'], serviceAreasFrom: 'the page map', siteUrl: 'https://hartley.example', primarySlug: '/plumber',
  locked: [['Boiler repair', 900], ['Boiler installation', 800], ['Leak repair', 300], ['Bathroom fitting', 200], ['Drain unblocking', 100]].map(([service, copyPriority]) => ({ service, copyPriority })),
  years: 'none', accreditations: 'Gas Safe registered', proofPoints: ['same day visits available', 'fixed prices agreed before work starts'],
  validatorCtx: { cv: { company_name: 'Hartley Plumbing & Heating', phone: '01708 123456', live_domain: 'https://hartley.example', jobs_wanted: [], years_trading: '15' } },
};
const makeRecord = hand => {
  const intake = buildIntake({ I, trade: 'Plumbing & Heating', answers: { tone: 'Friendly' }, hand });
  const D = decide(intake);
  const prompts = D.prompts.map(d => { const text = G.promptText(d, intake, d.angle); return { n: d.n, kind: d.kind, label: d.label, service: d.service, services: d.services, group: d.group, angle: d.angle, area: d.area, folder: d.folder, photos: d.photos, text, chars: text.length }; });
  return { generated_at: '2026-11-07T10:00:00.000Z', sheet: 'the sheet', intake, output: { prompts, tooFew: D.tooFew || null } };
};
const withOffer = makeRecord({ counts: { boilers: 6, 'leak-repair': 4, 'bathroom-fitting': 0, 'drain-unblocking': 2 }, brand: 5, offer: 'Free boiler quote' });
const hand2 = { counts: { boilers: 6, 'leak-repair': 4, 'bathroom-fitting': 0, 'drain-unblocking': 2 }, brand: 5 };
const noOffer = makeRecord(hand2);
const rowOf = (file_id, label, extra = {}) => ({ file_id, kind: 'post', label, folder_id: `f-${label}`, name: `${file_id}.jpeg`, mime_type: 'image/jpeg', size_bytes: 900000, width: 1600, height: 1200, md5: file_id, modified_at: null, web_link: '', problem: '', ...extra });
const many = (prefix, label, n) => Array.from({ length: n }, (_, i) => rowOf(`${prefix}${i}`, label));
const PHOTOS = [...many('boil', 'Boilers', 6), ...many('leak', 'Leak repair', 4), ...many('drain', 'Drain unblocking', 2), ...many('brand', 'Brand', 5), rowOf('drip1', 'GBP Photos – Photo Drip', { kind: 'drip' })];
const plan = (o = {}) => P.planBatch({ size: 13, record: withOffer, photos: PHOTOS, history: [], clientId: CLIENT, today: TODAY, site: 'https://hartley.example', ...o });
const tally = (list, key) => { const m = new Map(); for (const p of list) m.set(p[key], (m.get(p[key]) || 0) + 1); return m; };
const spread = m => Math.max(...m.values()) - Math.min(...m.values());
const throwsOn = fn => { try { fn(); return null; } catch (e) { return e; } };

// ── Sizes, days and dates ──
chk('13, 26 and 52 are the sizes', P.SIZES.join() === '13,26,52', P.SIZES.join(), '13,26,52');
chk('a batch of 13 has 13 posts', plan().posts.length === 13, plan().posts.length, 13);
chk('a batch of 52 has 52 posts', plan({ size: 52 }).posts.length === 52, '', 52);
chk('any other size is refused', /13, 26, 52/.test((throwsOn(() => plan({ size: 10 })) || {}).message), '', '');
const days = plan({ size: 52 }).posts.map(p => p.post_date);
const pair = P.dayPair(CLIENT);
chk('every post falls on the client\'s two days', days.every(d => pair.includes(new Date(`${d}T12:00:00Z`).getUTCDay())), days.slice(0, 4).join(), pair.join());
chk('two posts a week: 26 weeks for 52 posts', (new Date(days[51]) - new Date(days[0])) / 86400000 < 26 * 7 && (new Date(days[51]) - new Date(days[0])) / 86400000 >= 25 * 7, days[51], '');
chk('dates only go forward, no two on a day', days.every((d, i) => i === 0 || d > days[i - 1]), '', '');
chk('the first post leaves room to review', plan().posts[0].post_date >= P.addDays(TODAY, P.MIN_LEAD_DAYS), plan().posts[0].post_date, '');
chk('a chosen start lands on the next post day', (() => { const s = plan({ start: '2026-12-01' }).posts[0].post_date; return s >= '2026-12-01' && pair.includes(new Date(`${s}T12:00:00Z`).getUTCDay()); })(), '', '');
chk('a past start is refused', /in the past/.test((throwsOn(() => plan({ start: '2026-01-01' })) || {}).message), '', '');
chk('a next batch starts after the last planned post', plan({ history: [{ post_date: '2027-03-01', topic: 'STANDARD' }] }).posts[0].post_date > '2027-03-01', '', '');
chk('the day pair depends on the client', new Set(['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff'].map(c => P.dayPair(c).join())).size > 1, '', '');

// ── Offer posts ──
const big = plan({ size: 52 }).posts;
const offers = big.filter(p => p.topic === 'OFFER');
chk('the first post of a client with an offer is the Offer post', big[0].topic === 'OFFER', big[0].topic, 'OFFER');
chk('about one a month: 7 in 26 weeks', offers.length === 7, offers.length, 7);
chk('each runs 28 days', offers.every(o => o.offer_end === P.addDays(o.offer_start, 28) && o.offer_start === o.post_date), JSON.stringify(offers[0]), '');
chk('one ends as the next begins', offers.slice(1).every((o, i) => o.offer_start === offers[i].offer_end), offers.map(o => o.offer_start).join(), '');
chk('an Offer post has no button', offers.every(o => !o.cta_type && !o.cta_url), '', '');
chk('the title is the confirmed offer', offers[0].offer_title === 'Free boiler quote', offers[0].offer_title, '');
chk('the claim link is the client\'s own', offers[0].offer_redeem_url.startsWith('https://hartley.example'), offers[0].offer_redeem_url, '');
chk('every Offer post uses the offer prompt', offers.every(o => withOffer.output.prompts.find(p => p.n === o.prompt_n).kind === 'offer'), '', '');
chk('no standard post uses the offer prompt', big.filter(p => p.topic !== 'OFFER').every(p => withOffer.output.prompts.find(x => x.n === p.prompt_n).kind !== 'offer'), '', '');
const nf = P.planBatch({ size: 26, record: noOffer, photos: PHOTOS, history: [], clientId: CLIENT, today: TODAY });
chk('no confirmed offer: no Offer posts, and it says so', nf.posts.every(p => p.topic === 'STANDARD') && nf.notes.some(n => /No confirmed offer/.test(n)), '', '');
const after = plan({ history: [{ post_date: '2026-11-10', topic: 'OFFER', prompt_n: 1 }] }).posts;
const firstOffer = after.find(p => p.topic === 'OFFER');
chk('a next batch waits out the running offer', !firstOffer || firstOffer.post_date >= P.addDays('2026-11-10', 28), firstOffer && firstOffer.post_date, '');

// ── Prompts take turns; photos spread evenly ──
const std = big.filter(p => p.topic === 'STANDARD');
chk('every prompt with photos gets used', tally(std, 'prompt_n').size === withOffer.output.prompts.filter(p => p.kind !== 'offer' && P.poolFor(p, PHOTOS).length).length, tally(std, 'prompt_n').size, '');
chk('prompts take turns: at most one apart', spread(tally(std, 'prompt_n')) <= 1, spread(tally(std, 'prompt_n')), '<= 1');
const boil = big.filter(p => p.drive_file_id.startsWith('boil'));
chk('photos spread evenly in a folder: at most one apart', spread(tally(boil, 'drive_file_id')) <= 1 && tally(boil, 'drive_file_id').size === 6, [...tally(boil, 'drive_file_id').values()].join(), '');
chk('a post\'s photo comes from its prompt\'s folder', big.every(p => { const pr = withOffer.output.prompts.find(x => x.n === p.prompt_n); return P.poolFor(pr, PHOTOS).some(f => f.file_id === p.drive_file_id); }), '', '');
chk('the next post is from another folder where it can be', big.slice(1).filter((p, i) => p.folder === big[i].folder).length <= 8, big.slice(1).filter((p, i) => p.folder === big[i].folder).length, '<= 8');
const second = plan({ history: plan().posts });
chk('a next batch carries on the turns', tally([...plan().posts, ...second.posts].filter(p => p.topic === 'STANDARD'), 'prompt_n').size >= 13 && spread(tally([...plan().posts, ...second.posts].filter(p => p.drive_file_id.startsWith('boil')), 'drive_file_id')) <= 1, '', '');
chk('Photo Drip photos are never used on posts', big.every(p => p.drive_file_id !== 'drip1'), '', '');
const badPhotos = [...PHOTOS.filter(p => p.file_id !== 'boil0'), rowOf('boil0', 'Boilers', { problem: '9.0 MB is over the 5 MB limit' })];
chk('a photo with a problem is never used', plan({ size: 52, photos: badPhotos }).posts.every(p => p.drive_file_id !== 'boil0'), '', '');
const tipPrompt = withOffer.output.prompts.find(p => p.kind === 'tips');
chk('All job photos leaves out Brand and Photo Drip', tipPrompt.folder === 'All job photos' && P.poolFor(tipPrompt, PHOTOS).every(f => f.label !== 'Brand' && f.kind === 'post') && P.poolFor(tipPrompt, PHOTOS).length === 12, P.poolFor(tipPrompt, PHOTOS).length, 12);
const noBrand = plan({ size: 26, photos: PHOTOS.filter(p => p.label !== 'Brand') });
chk('a prompt with no photos is left out, and named', noBrand.notes.some(n => /no usable photo/.test(n)) && noBrand.posts.every(p => !p.folder.endsWith('/ Brand')), noBrand.notes.join(), '');
chk('no photos at all is refused', /usable photo/.test((throwsOn(() => plan({ photos: [] })) || {}).message), '', '');
chk('no config is refused', /Lead Snap tab/.test((throwsOn(() => plan({ record: null })) || {}).message), '', '');
chk('photos repeating is noted', plan({ size: 52 }).notes.some(n => /share \d+ photos/.test(n)), plan({ size: 52 }).notes.join(), '');
chk('a standard post gets the button from the config', big.find(p => p.topic === 'STANDARD').cta_type === 'CALL', JSON.stringify(big[1]), 'CALL');
chk('with a Call Now button the offer still has a claim link', offers[0].cta_url === '' && offers[0].offer_redeem_url === 'https://hartley.example', offers[0].offer_redeem_url, '');
const learnRecord = JSON.parse(JSON.stringify(noOffer)); learnRecord.intake.cta = { type: 'Learn More', url: 'https://hartley.example/plumber', line: '' };
const learnPost = P.planBatch({ size: 13, record: learnRecord, photos: PHOTOS, clientId: CLIENT, today: TODAY }).posts[0];
chk('Learn More maps to LEARN_MORE, with its link', learnPost.cta_type === 'LEARN_MORE' && learnPost.cta_url === 'https://hartley.example/plumber', JSON.stringify(learnPost), '');
const dogRecord = JSON.parse(JSON.stringify(noOffer)); dogRecord.intake.cta = { type: 'Book', url: 'https://book.example', line: '' };
chk('Book maps to BOOK', P.planBatch({ size: 13, record: dogRecord, photos: PHOTOS, clientId: CLIENT, today: TODAY }).posts[0].cta_type === 'BOOK', '', '');
const callRecord = JSON.parse(JSON.stringify(noOffer)); callRecord.intake.cta = { type: 'Call Now', url: '', line: '' };
const callPost = P.planBatch({ size: 13, record: callRecord, photos: PHOTOS, clientId: CLIENT, today: TODAY }).posts[0];
chk('Call Now maps to CALL, with no link', callPost.cta_type === 'CALL' && callPost.cta_url === '', JSON.stringify(callPost), '');

// ── The checks: Lead Snap's, plus this build's ──
const prompt = withOffer.output.prompts.find(p => p.kind === 'service');
const good = `Hartley Plumbing & Heating looks after boilers across ${prompt.area}. A boiler repair starts with finding the fault, then fixing it properly. Give the team a look on the website for more.`;
const lvl = (text, key, earlier = []) => (W.checkPost(text, prompt, withOffer.intake, earlier).checks.find(c => c.id === key) || {}).level;
chk('a clean post passes', W.checkPost(good, prompt, withOffer.intake).fails === 0, JSON.stringify(W.checkPost(good, prompt, withOffer.intake).checks.filter(c => c.level === 'fail')), 0);
for (const n of ['01708 123456', '(01708) 123456', '07580 412717', '+44 7580 412717', '0044 7580 412717', '023-8012-3456', '02380123456', '023.8012.3456']) chk(`a phone number fails: ${n}`, lvl(`Call us on ${n} for a quote.`, 'phone') === 'fail', lvl(`Call us on ${n} for a quote.`, 'phone'), 'fail');
for (const n of ['trading since 2015', 'two or three coats', 'over 15 years', 'a 25 mm pipe', 'Gas Safe registered']) chk(`not a phone number: ${n}`, lvl(`We are ${n}.`, 'phone') === 'pass', lvl(`We are ${n}.`, 'phone'), 'pass');
chk('the client\'s own number written oddly fails', lvl('Ring 0 1 7 0 8 1 2 3 4 5 6 today.', 'phone') === 'fail', lvl('Ring 0 1 7 0 8 1 2 3 4 5 6 today.', 'phone'), 'fail');
chk('exactly 1,500 characters passes', lvl('x'.repeat(1500), 'chars') === 'pass', '', '');
chk('1,501 characters fails', lvl('x'.repeat(1501), 'chars') === 'fail', '', '');
chk('Lead Snap\'s claims check still fails a post', W.checkPost(`${good} We offer a lifetime guarantee on everything.`, prompt, withOffer.intake).fails > 0, '', '');
chk('Lead Snap\'s warnings still warn', W.checkPost(`${good} Book before winter.`, prompt, withOffer.intake).checks.find(c => c.id === 'dated').level === 'warn', '', '');
chk('an opening already used warns', lvl(good, 'opening', ['hartley plumbing heating looks after']) === 'warn', lvl(good, 'opening', ['hartley plumbing heating looks after']), 'warn');

(async () => {
  // ── Writing one post ──
  const seen = [];
  const say = texts => async a => { seen.push(a); const t = texts.shift(); return { text: t, usage: { input_tokens: 100, output_tokens: 50 } }; };
  let r = await W.writePost({ prompt, intake: withOffer.intake, earlierOpenings: ['one two three four five', 'six seven eight nine ten'], callModel: say([good]) });
  chk('earlier openings go to the model', seen[0].message.includes('"one two three four five"') && seen[0].message.includes("Don't start with any of these openings"), seen[0].message.slice(-200), '');
  chk('a good post takes one call', r.usage.calls === 1 && r.attempts === 1 && r.body === good, r.usage.calls, 1);
  seen.length = 0;
  r = await W.writePost({ prompt, intake: withOffer.intake, earlierOpenings: [], callModel: say([`${good} Ring 01708 123456.`, good]) });
  chk('a post with a phone number is written again', r.usage.calls === 2 && r.fails === 0 && r.body === good, r.body, good);
  chk('the second try says what was wrong', /broke these rules/.test(seen[1].message) && /No phone number/.test(seen[1].message), seen[1].message.slice(-160), '');
  r = await W.writePost({ prompt, intake: withOffer.intake, earlierOpenings: [], callModel: say([`${good} Ring 01708 123456.`, `${good} Ring 01708 123456 now.`]) });
  chk('failing twice stops at two calls and keeps the FAIL', r.usage.calls === 2 && r.fails > 0, r.usage.calls, 2);
  r = await W.writePost({ prompt, intake: withOffer.intake, earlierOpenings: ['hartley plumbing heating looks after'], callModel: say([good, `A boiler repair starts here. ${good}`]) });
  chk('a repeated opening is written again', r.usage.calls === 2 && !r.repeated, r.opening, '');

  // ── The routes ──
  const db = newDb();
  db.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  db.public.none(`CREATE TABLE clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, trade text);
    CREATE TABLE client_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid, asset_type text, filename text, content text, metadata jsonb, uploaded_at timestamptz DEFAULT now());`);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Hartley Plumbing', 'Plumbing & Heating') RETURNING id`);
  const quiet = { log() {}, error() {} };
  let calls = 0, count = 0, failNext = 0, driveCalls = 0;
  const body = () => { count++; return `Hartley Plumbing & Heating post number${count} covers the boiler work in Romford with care. Have a read on the website.`; };
  const model = async () => { calls++; if (failNext > 0) { failNext--; throw new Error('the model is busy'); } return { text: body(), usage: { input_tokens: 1000, output_tokens: 400 } }; };
  const drive = { download: async id => { driveCalls++; return Buffer.from(`bytes-of-${id}`); } };
  const app = express();
  app.use(express.json());
  const mounted = mountGbpPostsApi(app, { pool, log: quiet, callModel: model, getDrive: () => drive, today: () => TODAY });
  const srv = http.createServer(app);
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const req = (method, p, b) => new Promise((resolve, reject) => {
    const data = b ? JSON.stringify(b) : null;
    const q = http.request({ host: '127.0.0.1', port: srv.address().port, method, path: p, agent: false, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { const chunks = []; res.on('data', d => chunks.push(d)); res.on('end', () => { const t = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, text: t, type: res.headers['content-type'], json: () => JSON.parse(t) }); }); });
    q.on('error', reject); if (data) q.write(data); q.end();
  });
  const api = `/api/clients/${c.id}/gbp-posts`;
  const settle = async () => { while (mounted.writing.size) await new Promise(res => setTimeout(res, 10)); };
  const get = async () => (await req('GET', api)).json();

  let v = await get();
  chk('with nothing set up it says what is needed', v.ok === false && v.needs.length === 2 && v.batches.length === 0 && calls === 0, v.needs.join(), '');
  chk('asking for a batch then is refused, nothing spent', (await req('POST', `${api}/batches`, { size: 13 })).status === 400 && calls === 0, calls, 0);
  const autopost = createAutopostStore(pool);
  await autopost.save(c.id, withOffer);
  v = await get();
  chk('with no Drive read it asks for that', v.needs.length === 1 && /Drive photo folder/.test(v.needs[0]), v.needs.join(), '');
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'v.json', $2)`, [c.id, JSON.stringify({ drive_photo_folder: 'https://drive.google.com/drive/folders/hartleyFolder1', live_domain: 'hartley.example' })]);
  const driveStore = createDriveStore(pool);
  await driveStore.saveRead(c.id, { folder_id: 'hartleyFolder1', folder_name: 'Images', posts_found: true, drip_found: true, folders: [...new Set(PHOTOS.filter(p => p.kind === 'post').map(p => p.label))].map(l => ({ label: l, id: `f-${l}` })), problems: [], notes: [], files: [...PHOTOS, rowOf('bad1', 'Boilers', { problem: 'too big' })] });
  v = await get();
  chk('set up: ready, with the costs', v.ok === true && v.sizes.map(z => z.size).join() === '13,26,52' && v.sizes.every(z => z.pence > 0) && v.offer === 'Free boiler quote', JSON.stringify(v.sizes), '');
  chk('a bad size is refused', (await req('POST', `${api}/batches`, { size: 7 })).status === 400 && calls === 0, calls, 0);

  let res = await req('POST', `${api}/batches`, { size: 13 });
  chk('a batch starts in the background', res.status === 202 && res.json().batches.length === 1, res.status, 202);
  await settle();
  v = await get();
  let b = v.batches[0];
  chk('all 13 are written', b.done === 13 && b.status === 'draft' && b.posts.every(p => p.status === 'written' && p.body), `${b.done} ${b.status}`, '13 draft');
  chk('it took 13 model calls', calls === 13, calls, 13);
  chk('nothing is approved by itself', b.approved_at === null && b.status === 'draft', b.status, 'draft');
  chk('the cost is recorded', b.pence > 0, b.pence, '> 0');
  chk('the tables hold the posts', (await pool.query(`SELECT count(*)::int AS n FROM gbp_posts WHERE client_id=$1`, [c.id])).rows[0].n === 13, '', 13);
  chk('a post holds what Stage 3 needs', (() => { const p = b.posts.find(x => x.topic === 'STANDARD'); return p.drive_file_id && p.post_date && p.post_time === '10:00' && p.cta_type === 'CALL'; })(), JSON.stringify(b.posts[1]), '');
  chk('the first is the Offer post', b.posts[0].topic === 'OFFER' && b.posts[0].offer_end === P.addDays(b.posts[0].post_date, 28), b.posts[0].topic, 'OFFER');
  chk('its claim link comes from the live domain', b.posts[0].offer_redeem_url === 'https://hartley.example', b.posts[0].offer_redeem_url, '');
  chk('the batch keeps its own copy of the config', (await mounted.store.batch(c.id, b.id)).config.output.prompts.length === withOffer.output.prompts.length, '', '');
  chk('a clean batch can be approved', b.blockers.length === 0, b.blockers.join(), '');

  // A person's edit is checked again
  const firstStd = b.posts.find(p => p.topic === 'STANDARD');
  v = (await req('PUT', `${api}/posts/${firstStd.id}`, { body: `${firstStd.body} Ring 01708 123456.` })).json();
  b = v.batches[0];
  let edited = b.posts.find(p => p.id === firstStd.id);
  chk('adding a phone number is caught on save', edited.fails === 1 && edited.edited === true && edited.checks.some(k => k.id === 'phone' && k.level === 'fail'), JSON.stringify(edited.checks.filter(k => k.level === 'fail')), '');
  chk('that stops the batch', b.blockers.some(m => m.includes(`Post ${edited.seq} fails a check`)), b.blockers.join(), '');
  res = await req('POST', `${api}/batches/${b.id}/approve`, {});
  chk('approving is refused while it fails', res.status === 409 && /Fix these first/.test(res.json().error), res.status, 409);
  chk('an empty post is refused', (await req('PUT', `${api}/posts/${firstStd.id}`, { body: '   ' })).status === 400, '', 400);
  chk('a bad date is refused', (await req('PUT', `${api}/posts/${firstStd.id}`, { post_date: 'soon' })).status === 400, '', 400);
  chk('a past date is refused', (await req('PUT', `${api}/posts/${firstStd.id}`, { post_date: '2020-01-01' })).status === 400, '', 400);
  chk('a photo from outside the client is refused', (await req('PUT', `${api}/posts/${firstStd.id}`, { drive_file_id: 'someone-elses' })).status === 400, '', 400);
  chk('a photo with a problem is refused', /can't be used/.test((await req('PUT', `${api}/posts/${firstStd.id}`, { drive_file_id: 'bad1' })).json().error), '', '');
  v = (await req('PUT', `${api}/posts/${firstStd.id}`, { body: firstStd.body, drive_file_id: 'leak1', post_date: '2027-01-15' })).json();
  edited = v.batches[0].posts.find(p => p.id === firstStd.id);
  chk('a fix clears it; photo and date change', edited.fails === 0 && edited.drive_file_id === 'leak1' && edited.photo_name === 'leak1.jpeg' && edited.post_date === '2027-01-15', JSON.stringify([edited.fails, edited.drive_file_id, edited.post_date]), '');
  chk('an edit on an Offer post moves its dates', await (async () => { const o = v.batches[0].posts[0]; const w = (await req('PUT', `${api}/posts/${o.id}`, { post_date: '2026-12-01' })).json().batches[0].posts[0]; return w.offer_start === '2026-12-01' && w.offer_end === '2026-12-29'; })(), '', '');

  // Move the whole batch
  chk('moving to a past start is refused', (await req('PUT', `${api}/batches/${b.id}/start`, { start: '2020-01-01' })).status === 400, '', 400);
  v = (await req('PUT', `${api}/batches/${b.id}/start`, { start: '2027-02-01' })).json();
  b = v.batches[0];
  chk('moving the start moves every date, keeping the order', b.posts.every((p, i) => p.post_date >= '2027-02-01' && (i === 0 || p.post_date > b.posts[i - 1].post_date)), b.posts.map(p => p.post_date).join(), '');
  chk('the offer dates follow', b.posts[0].offer_start === b.posts[0].post_date && b.posts[0].offer_end === P.addDays(b.posts[0].post_date, 28), '', '');

  // Write one again
  const before = calls;
  v = (await req('POST', `${api}/posts/${firstStd.id}/rewrite`)).json();
  chk('Write again spends one call and replaces the text', calls === before + 1 && v.batches[0].posts.find(p => p.id === firstStd.id).body !== firstStd.body, calls - before, 1);

  // Approval
  res = await req('POST', `${api}/batches/${b.id}/approve`, { by: 'A VA' });
  chk('with nothing blocking it approves', res.status === 200 && res.json().batches[0].status === 'approved' && res.json().batches[0].approved_by === 'A VA' && res.json().batches[0].approved_at, res.text.slice(0, 120), '');
  chk('an approved batch cannot be edited', (await req('PUT', `${api}/posts/${firstStd.id}`, { body: 'x' })).status === 409, '', 409);
  chk('nor written again', (await req('POST', `${api}/posts/${firstStd.id}/rewrite`)).status === 409, '', 409);
  chk('nor moved', (await req('PUT', `${api}/batches/${b.id}/start`, { start: '2027-03-01' })).status === 409, '', 409);
  chk('nor deleted', (await req('DELETE', `${api}/batches/${b.id}`)).status === 409, '', 409);
  chk('nor approved twice', (await req('POST', `${api}/batches/${b.id}/approve`, {})).status === 409, '', 409);
  res = await req('POST', `${api}/batches/${b.id}/unapprove`);
  chk('the approval can be taken back', res.status === 200 && res.json().batches[0].status === 'draft' && !res.json().batches[0].approved_at, '', '');
  await req('POST', `${api}/batches/${b.id}/approve`, {});

  // A second batch sees the first
  count = 1000;
  const openingsBefore = (await mounted.store.history(c.id)).map(h => h.opening).filter(Boolean);
  const origCalls = calls;
  res = await req('POST', `${api}/batches`, { size: 13 });
  await settle();
  v = await get();
  const second2 = v.batches[0];
  chk('a second batch is written', v.batches.length === 2 && second2.done === 13 && calls >= origCalls + 13, v.batches.length, 2);
  chk('it starts after the first ends', second2.posts[0].post_date > v.batches[1].posts[12].post_date, second2.posts[0].post_date, '');
  chk('earlier openings are on record for it', openingsBefore.length === 13, openingsBefore.length, 13);

  // A model failure, and the restart
  failNext = 100;
  res = await req('POST', `${api}/batches`, { size: 13 });
  await settle();
  v = await get();
  let third = v.batches[0];
  chk('a model failure leaves the batch stopped', third.stopped === true && third.status === 'writing' && third.done === 0 && third.posts[0].status === 'failed' && /busy/.test(third.posts[0].error), JSON.stringify([third.stopped, third.status, third.done]), '');
  chk('a stopped batch cannot be approved', (await req('POST', `${api}/batches/${third.id}/approve`, {})).status === 409, '', 409);
  failNext = 0;
  chk('Continue is refused on a finished batch', (await req('POST', `${api}/batches/${second2.id}/continue`)).status === 409, '', 409);
  res = await req('POST', `${api}/batches/${third.id}/continue`);
  await settle();
  v = await get();
  third = v.batches[0];
  chk('Continue writes what is left', res.status === 202 && third.done === 13 && third.status === 'draft', third.done, 13);
  chk('a batch not approved can be deleted', (await req('DELETE', `${api}/batches/${third.id}`)).status === 200 && (await get()).batches.length === 2, '', 2);

  // The photo route
  res = await req('GET', `${api}/photo/boil1`);
  chk('a client\'s own photo comes through', res.status === 200 && res.text === 'bytes-of-boil1' && /image\/jpeg/.test(res.type) && driveCalls === 1, res.status, 200);
  res = await req('GET', `${api}/photo/not-this-clients`);
  chk('any other Drive file is refused without touching Drive', res.status === 404 && driveCalls === 1, res.status, 404);

  // A photo that has left Drive stops approval
  await driveStore.saveRead(c.id, { folder_id: 'hartleyFolder1', folder_name: 'Images', posts_found: true, drip_found: true, folders: [], problems: [], notes: [], files: PHOTOS.filter(p => p.file_id !== second2.posts[1].drive_file_id) });
  v = await get();
  chk('a photo gone from Drive blocks its batch', v.batches[0].blockers.some(m => /no longer in Drive/.test(m)), v.batches[0].blockers.join(), '');
  chk('a past date blocks a batch', P.blockers(second2.posts, { today: '2099-01-01' }).some(m => /date has passed/.test(m)), '', '');
  chk('an Offer post with no claim link blocks', P.blockers([{ seq: 1, status: 'written', fails: 0, topic: 'OFFER', drive_file_id: 'a', post_date: '2099-01-01', offer_redeem_url: '' }], { today: TODAY }).some(m => /nowhere to claim it/.test(m)), '', '');
  chk('a button with no link blocks', P.blockers([{ seq: 1, status: 'written', fails: 0, topic: 'STANDARD', drive_file_id: 'a', post_date: '2099-01-01', cta_type: 'LEARN_MORE', cta_url: '' }], { today: TODAY }).some(m => /no link/.test(m)), '', '');

  // ── Nothing else moves ──
  const src = ['gbp-posts/routes.js', 'gbp-posts/plan.js', 'gbp-posts/write.js', 'gbp-posts/store.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  chk('this stage never calls bundle.social or Lead Snap', !/bundle\.social|api\.bundle|leadsnap\/client/i.test(src.replace(/\/\/.*$/gm, '')), '', '');
  const shell = fs.readFileSync(path.join(root, 'public/app/screens/client.js'), 'utf8');
  chk('the tab sits after Lead Snap, and Lead Snap stays', /\['lead-snap', 'Lead Snap'\], \['gbp-posts', 'GBP Posts'\]/.test(shell) && /'gbp-posts': \(\) => import\('\.\.\/tabs\/gbp-posts\.js'\)/.test(shell) && /'lead-snap': \(\) => import/.test(shell), '', '');

  await new Promise(res2 => srv.close(res2));
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
