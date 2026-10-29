'use strict';
// Fixture: blog posts, stage 9 (the Search Console batch, B16), 29 Oct 2026. The service account
// token (a JWT signed with a key made here, verified), the API call with a stub, a Search Console
// export read (CTR as a percentage, thousands with commas), the candidates on a 40 row export for
// Edens Edge (exactly the qualifying queries are new post candidates with a question wording;
// an owned query never is; the page improvements with their page), the batch on pg-mem (six
// posts, one a month across months 7 to 12, in B16's order, beside the onboarding rows; the
// query kept as the post's source; F-SC-THIN on a short batch with refreshes), the routes.
// No API calls.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const root = path.join(__dirname, '../..');
const SC = require(path.join(root, 'search-console/client.js'));
const CSV = require(path.join(root, 'search-console/csv.js'));
const C = require(path.join(root, 'search-console/candidates.js'));
const Q = require(path.join(root, 'blog/queue.js'));
const { createSearchConsoleService } = require(path.join(root, 'blog/search-console.js'));
const { mountBlogApi } = require(path.join(root, 'blog/routes.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { ensureBlogColumns, saveBlogSettings } = require(path.join(root, 'blog/db.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { ensureFilloutTables } = require(path.join(root, 'fillout/service.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const { ensureH1Tables } = require(path.join(root, 'h1-research/service.js'));
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const UR = require(path.join(root, 'ui/routes.js'));
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const FC = require(path.join(__dirname, 'data/faq-clients.js'));
const B = require(path.join(root, 'blog/bank.js'));
const { reserveBlogTopics } = require(path.join(root, 'blog/topics.js'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const has = (list, re) => (list || []).some(x => typeof x === 'string' ? re.test(x) : (re.test(x.code || '') || re.test(x.msg || '')));
console.log('\n=== FIXTURE: blog posts, stage 9 (the Search Console batch) ===\n');

// ── The service account token and the API call ──
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const env = { GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'copybot@test.iam.gserviceaccount.com', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' }) };
const creds = SC.credentials(env);
const jwt = SC.serviceAccountJwt(creds, { now: 1700000000 });
const [hd, cl, sg] = jwt.split('.');
const claims = JSON.parse(Buffer.from(cl, 'base64').toString());
chk('The service account JWT: RS256 over header.claims, signed with the key, the Search Console scope, an hour\'s life, the issuer the account; verifies with the public key; the key never in an error', crypto.verify('RSA-SHA256', Buffer.from(`${hd}.${cl}`), publicKey, Buffer.from(sg.replace(/-/g, '+').replace(/_/g, '/'), 'base64')) && claims.scope === SC.SCOPE && claims.iss === 'copybot@test.iam.gserviceaccount.com' && claims.exp - claims.iat === 3600 && JSON.parse(Buffer.from(hd, 'base64').toString()).alg === 'RS256' && (() => { try { SC.credentials({}); return false; } catch (e) { return /GOOGLE_SERVICE_ACCOUNT_JSON is missing/.test(e.message); } })(), JSON.stringify(claims), '');
const calls = [];
const apiFetch = async (url, opts = {}) => {
  calls.push({ url, body: opts.body ? (opts.headers['Content-Type'] === 'application/json' ? JSON.parse(opts.body) : opts.body) : null, auth: opts.headers.Authorization || '' });
  if (/oauth2\.googleapis\.com\/token$/.test(url)) return { ok: true, status: 200, json: async () => ({ access_token: 'tok-123', expires_in: 3600 }) };
  if (/searchAnalytics\/query$/.test(url)) { const b = JSON.parse(opts.body); return { ok: true, status: 200, json: async () => ({ rows: b.startRow ? [] : [{ keys: ['pergola planning permission southampton', 'https://edensedge.co.uk/'], clicks: 3, impressions: 45, ctr: 0.0667, position: 14.2 }, { keys: ['lawn care southampton', 'https://edensedge.co.uk/services/lawn-care/'], clicks: 2, impressions: 48, ctr: 0.04, position: 15.8 }] }) }; }
  return { ok: false, status: 404, json: async () => ({ error: { message: 'no' } }) };
};
(async () => {
  const report = await SC.queryReport('sc-domain:edensedge.co.uk', { env, fetchImpl: apiFetch, now: new Date('2027-05-10T10:00:00Z') });
  const q = calls.find(c => /searchAnalytics/.test(c.url));
  chk('queryReport: the token exchanged with the JWT (grant_type jwt-bearer), then searchanalytics query on the property (URL encoded) for the last 90 days to yesterday, country GBR, by query and page, 5,000 rows a page; the rows shaped', report.rows.length === 2 && report.rows[0].query === 'pergola planning permission southampton' && report.rows[0].page === 'https://edensedge.co.uk/' && report.rows[0].impressions === 45 && report.startDate === '2027-02-09' && report.endDate === '2027-05-09' && q && /sites\/sc-domain%3Aedensedge\.co\.uk\/searchAnalytics\/query$/.test(q.url) && q.auth === 'Bearer tok-123' && q.body.dimensions.join() === 'query,page' && q.body.rowLimit === 5000 && q.body.dimensionFilterGroups[0].filters[0].expression === 'gbr' && /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=/.test(calls[0].body), JSON.stringify([report.startDate, report.endDate, q && q.url, q && q.body]), '');
})().catch(e => { console.error(e); process.exit(1); });

// ── The export read ──
const csvText = fs.readFileSync(path.join(__dirname, 'data/search-console-edens-edge.csv'), 'utf8');
const parsed = CSV.parseSearchConsoleCsv(csvText);
chk('A Search Console export: the Top queries header, 40 rows, CTR "6.67%" as 0.0667, the position a number; a header with no queries column is refused in words; thousands with commas read', parsed.rows.length === 40 && parsed.rows[0].query === 'pergola planning permission southampton' && parsed.rows[0].impressions === 45 && Math.abs(parsed.rows[0].ctr - 0.0667) < 0.001 && parsed.rows[0].position === 14.2 && !parsed.problems.length && /No "Top queries"/.test(CSV.parseSearchConsoleCsv('A,B\n1,2\n').problems[0]) && CSV.parseSearchConsoleCsv('Query,Clicks,Impressions,CTR,Position\n"a b","1,200","2,400",50%,3\n').rows[0].impressions === 2400, JSON.stringify([parsed.rows.length, parsed.rows[0], parsed.problems]), '');

// ── The candidates on Edens Edge ──
const edens = FC.byId['edens-edge'];
const towns = ['Southampton', 'Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford'];
const pagesOwned = edens.pages.filter(p => p.urlSlug).map(p => ({ type: p.pageType, slug: p.urlSlug, title: p.pageTitle, h1: `${p.pageTitle} Southampton`, info: {} }));
if (!pagesOwned.some(p => p.type === 'homepage')) pagesOwned.push({ type: 'homepage', slug: '/', title: 'Edens Edge Landscaping', h1: 'Landscape Gardener Southampton', info: {} });
const blogRows = [{ slug: '/guides/why-is-my-lawn-always-waterlogged-after-rain', h1: 'Why Is My Lawn Always Waterlogged After Rain?', info: { wording: 'Why Is My Lawn Always Waterlogged After Rain?', target_query: 'why is my lawn always waterlogged after rain', stack: [{ wording: 'Does aerating help a waterlogged lawn?' }], faq: [{ wording: 'Why is my lawn going yellow?' }] } }];
const owned = C.ownedFrom({ pages: pagesOwned, records: new Map(), blogRows });
const cands = C.findCandidates({ rows: parsed.rows, owned, towns });
const newQ = cands.newPosts.map(p => p.query);
const EXPECT_NEW = ['pergola planning permission southampton', 'how much does garden levelling cost', 'block paving sinking', 'resin vs block paving driveway', 'retaining wall sleepers or stone', 'garden drainage romsey', 'composite decking cost', 'hedge cutting winchester', 'patio ideas small garden', 'tree stump removal eastleigh', 'best time to lay turf uk', 'artificial grass for dogs', 'fence height between neighbours uk', 'garden design chandlers ford', 'how to stop weeds in gravel', 'what is hardscaping', 'garden lighting southampton', 'how deep should a patio sub base be', 'landscaper near me'];
chk(`Exactly the qualifying queries are new post candidates (${EXPECT_NEW.length}: 10 or more impressions, off page one, not owned), most impressions first; an owned query never is (the lawn care page's "lawn care southampton" at position 15.8, the post's "why is my lawn going yellow"); page one and low impression queries are left out with the reason`, newQ.length === EXPECT_NEW.length && EXPECT_NEW.every(q => newQ.includes(q)) && newQ[0] === 'pergola planning permission southampton' && cands.newPosts.every((p, i) => i === 0 || p.impressions <= cands.newPosts[i - 1].impressions) && !newQ.includes('lawn care southampton') && !newQ.includes('why is my lawn going yellow') && cands.dropped.some(d => d.query === 'lawn care southampton' && /owned by the page \/services\/lawn-care/.test(d.why)) && cands.dropped.some(d => d.query === 'why is my lawn going yellow' && /owned by the post/.test(d.why)) && cands.dropped.some(d => d.query === 'artificial grass installation southampton' && /page one/.test(d.why)) && cands.dropped.some(d => d.query === 'garden drainage' && /9 impressions/.test(d.why)), JSON.stringify({ newQ, dropped: cands.dropped }), '');
chk('The question wording code writes for a query that is not one: planning permission, cost, or, best, near me, a town as "in Town", "uk" as "in the UK"; a query already a question keeps its words', (() => { const w = Object.fromEntries(cands.newPosts.map(p => [p.query, p.wording])); return w['pergola planning permission southampton'] === 'Does a Pergola Need Planning Permission in Southampton?' && w['how much does garden levelling cost'] === 'How Much Does Garden Levelling Cost?' && w['resin vs block paving driveway'] === 'Resin or Block Paving Driveway: Which Is Better?' && w['best time to lay turf uk'] === 'What Is the Best Time to Lay Turf in the UK?' && w['landscaper near me'] === 'How Do You Choose a Landscaper?' && w['garden drainage romsey'] === 'What Should You Know About Garden Drainage in Romsey?' && w['why is my lawn going yellow'] === undefined && w['how to stop weeds in gravel'] === 'How to Stop Weeds in Gravel?' && cands.newPosts.every(p => /\?$/.test(p.wording) && !/[—–]/.test(p.wording)); })(), JSON.stringify(cands.newPosts.map(p => [p.query, p.wording])), '');
chk('Page improvements: queries at positions 5 to 20 with 20 or more impressions, with the page that owns them and a suggested FAQ question, listed only; a page one query at position 3 is not one', cands.improvements.some(i => i.query === 'fencing installation southampton' && i.page === '/services/fencing-installation' && /^Add an FAQ: /.test(i.suggestion)) && cands.improvements.some(i => i.query === 'lawn care southampton' && i.page === '/services/lawn-care') && !cands.improvements.some(i => i.query === 'artificial grass installation southampton') && cands.improvements.every(i => i.position >= 5 && i.position <= 20 && i.impressions >= 20) && !cands.improvements.some(i => i.query === 'how much does garden levelling cost'), JSON.stringify(cands.improvements.map(i => [i.query, i.page, i.position])), '');

// ── The batch: the reservation in B16's order, the schedule, the service on pg-mem ──
const niche = { ...edens.niche, _source: 'landscaper' };
const sampleBank = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-paa-2026-10-29.md'), 'utf8')); // the People also ask bank, frozen (29 Oct): the blocks a Search Console query takes
const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');
(async () => {
  const research = R.parseFaqResearch(fs.readFileSync(path.join(__dirname, 'faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const replies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  const cv = { ...edens.cvThin, primary_category: 'Gardener', insurance_cover: '5m', differentiator_2_confirmed: true, jobs_wanted: ['Landscape Gardener', 'Landscape Designer'] };
  let i = 0;
  const tidy = await S.runTidy({ research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv, callModel: async () => replies[i++] });
  const questions = tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
  const A = S.assignQuestions({ questions, cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const dossiers = [{ location: 'Southampton', text: dossierText }];
  const alloc = { pages: { homepage: { neighbourhoods: ['SOU-N07'], symptoms: { faq_B: 'SOU-S01' } } } };
  const base = { assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers, allocationRecord: alloc, pageWordings, bank: sampleBank };
  // The onboarding batch first (its rows are the existing ones), then the Search Console batch six months on
  const onboarding = reserveBlogTopics({ ...base, launchDate: '2026-11-09' });
  const onbRows = Q.rowsFor(Q.schedule([...onboarding.topics], '2026-11-09').topics, { held: onboarding.held_back }).map(r => ({ ...r, type: 'blog', applies: true, status: r.status || 'Not Started' }));
  const scQuestions = cands.newPosts.map((p, k) => ({ id: `SC-2027-05-09-${k + 1}`, query: p.query, wording: p.wording, impressions: p.impressions, position: p.position, approved: false, town: towns.find(t => p.query.includes(t.toLowerCase())) || '' }));
  const scRes = reserveBlogTopics({ ...base, batch: 'search_console', batchStart: '2027-05-09', scQuestions, existingRows: onbRows });
  const T = scRes.topics;
  const srcOrder = T.map(t => t.source);
  const firstSc = srcOrder.indexOf('search_console'), lastSeasonal = srcOrder.lastIndexOf('seasonal');
  chk('The Search Console reservation: six posts at most, no cost guides and no bank posts; B16\'s order (a seasonal topic in the window first, then the queries most impressions first, then FAQ leftovers, then local posts); a query post carries its query as the source and a code wording to approve; a question or key an earlier batch took is not taken again', T.length <= 6 && T.length >= 3 && !T.some(t => t.source === 'blog_bank') && T.some(t => t.source === 'search_console') && T.filter(t => t.source === 'search_console').some(t => t.bank_topic) && (lastSeasonal < 0 || firstSc < 0 || lastSeasonal < firstSc) && T.filter(t => t.source === 'search_console').every((t, k, arr) => t.source_query && t.needs_approval && t.wording_source === 'code' && (k === 0 || t.question.impressions <= arr[k - 1].question.impressions)) && !T.some(t => onbRows.some(r => r.slug === t.key || (t.question && r.info.question_id === t.question.id))) && T.every(t => t.batch === 'search_console:2027-05-09'), JSON.stringify(T.map(t => [t.key, t.source, t.source_query, t.query_stack.length, t.faq_ids.length, t.flags.map(f => f.code)])), '');
  const sch = Q.scheduleBatch(T, '2027-05-09');
  chk('scheduleBatch: one post a month across the six months from the batch start (months 1 to 6, no launch posts), dated inside each month; F-QUEUE when short', sch.topics.every(t => t.month >= 1 && t.month <= 6 && t.publish_date && t.publish_date >= '2027-06-01') && new Set(sch.topics.map(t => t.month)).size === sch.topics.length && (sch.topics.length === 6 || has(sch.flags, /^F-QUEUE$/)), JSON.stringify(sch.topics.map(t => [t.month, t.publish_date, t.key])), '');

  // ── The service on pg-mem: the rows asset, the batches, the build beside the onboarding rows, the routes ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT, page_title TEXT, url_slug TEXT);
    CREATE TABLE research_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id TEXT, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'pending', preset TEXT, locations JSONB NOT NULL DEFAULT '{}');`);
  await ensureFilloutTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool); await ensureWpTables(pool); await UR.ensureUiColumns(pool); await ensureBlogColumns(pool);
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  await saveBlogSettings(pool, client.id, { launch_date: '2026-11-09', search_console_property: 'sc-domain:edensedge.co.uk' });
  const store = createPageMapStore({ pool, filloutService: null });
  const v20Store = createV20Store(pool);
  // The page map's pages (owned texts) and the onboarding rows
  let sort = 1;
  const seenKeys = new Set();
  for (const p of pagesOwned) if (!seenKeys.has(`${p.type}:${p.slug}`) && seenKeys.add(`${p.type}:${p.slug}`)) await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order) VALUES ($1, $2, $3, $4, $5, $6, 'auto', '[]', '[]', 'Live', TRUE, '{}', $7)`, [client.id, `${p.type}:${p.slug}`, p.type, p.title, p.slug, p.h1, sort++]);
  await store.upsertBlogRows(client.id, onbRows.map(r => ({ slug: r.slug, title: r.title, h1: r.h1, status: r.status === 'Held' ? 'Held' : undefined, info: r.info })));
  // A fake FAQ service: the reservation on the fixture's sort with the options passed through
  const faqService = { blogTopics: async (clientId, sessionId, opts = {}) => ({ blog: reserveBlogTopics({ ...base, launchDate: '2026-11-09', ...opts }), ctx: { keyValueMap: edens.keyValueMap } }) };
  const svc = createSearchConsoleService({ pool, pageMapStore: store, faqService, v20Store, env, queryReport: (property, opts) => SC.queryReport(property, { ...opts, env, fetchImpl: apiFetch, now: new Date('2027-05-10T10:00:00Z') }), log: { log() {}, error() {} } });
  const s0 = await svc.status(client.id);
  chk('Before any rows: no rows, the property, the batches from the launch date (the first due at month 6, 2027-05-09; none built), the API available', s0.rows === 0 && s0.property === 'sc-domain:edensedge.co.uk' && s0.api && s0.batches[0].start === '2027-05-09' && s0.batches[0].month === 6 && !s0.batches[0].built && s0.next && s0.next.start === '2027-05-09', JSON.stringify(s0), '');
  const s1 = await svc.upload(client.id, csvText);
  chk('An export uploaded: 40 rows kept as a client asset, source csv', s1.rows === 40 && s1.source === 'csv' && (await svc.rowsAsset(client.id)).rows.length === 40, JSON.stringify([s1.rows, s1.source]), '');
  const c1 = await svc.candidates(client.id);
  chk('The candidates from the rows on file, against what the page map owns today (the pages and the onboarding posts)', c1.counts.newPosts >= 15 && c1.newPosts[0].query === 'pergola planning permission southampton' && c1.dropped.some(d => d.query === 'lawn care southampton' && /owned by the page/.test(d.why)), JSON.stringify(c1.counts), '');
  const built = await svc.build(client.id, { today: '2027-05-12' });
  const rowsAfter = await store.blogRows(client.id);
  const scRows = rowsAfter.filter(r => (r.info || {}).batch === 'search_console:2027-05-09');
  chk('The batch built: the rows beside the onboarding rows (none retired), tagged with the batch, dated one a month from month 7, the query post\'s source query and impressions on its row, its wording waiting for approval; the status then says the batch is built and the next one is six months on', built.batch.start === '2027-05-09' && scRows.length === built.counts.rows && scRows.filter(r => r.status !== 'Held').length >= 3 && rowsAfter.filter(r => (r.info || {}).batch === 'onboarding' && r.applies !== false).length === onbRows.filter(r => r.status !== 'Held').length + onbRows.filter(r => r.status === 'Held').length && scRows.filter(r => r.status !== 'Held').every(r => r.info.publish_date >= '2027-06-01' && r.info.month >= 1) && scRows.filter(r => r.status !== 'Held').length === built.counts.new + built.counts.refreshes && scRows.some(r => r.info.source === 'search_console' && r.info.source_query && r.info.impressions > 0 && !r.info.wording_approved) && (await svc.status(client.id)).batches[0].built && (await svc.status(client.id)).next.start === '2027-11-09', JSON.stringify([built.counts, scRows.map(r => [r.slug, r.info.source, r.info.publish_date, r.info.source_query, r.info.impressions])]), '');
  // The API route for the rows
  const s2 = await svc.fetchRows(client.id);
  chk('Fetch from the API: the rows replaced by the report\'s (2), source api with the dates', s2.rows === 2 && s2.source === 'api' && s2.range.start === '2027-02-09', JSON.stringify(s2), '');
  // The routes
  const app = express(); app.use(express.json({ limit: '2mb' }));
  mountBlogApi(app, { pool, loadBlogInputs: async () => ({}), queue: null, runner: null, v20Store, searchConsole: svc });
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const call = (method, p, body) => new Promise((resolve, reject) => { const req = http.request({ port, path: p, method, headers: { 'content-type': 'application/json' } }, res => { let s = ''; res.on('data', d => s += d); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(s || '{}') }); } catch (e) { reject(e); } }); }); req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end(); });
  const g = await call('GET', `/api/clients/${client.id}/search-console`);
  const up = await call('POST', `/api/clients/${client.id}/search-console/upload`, { csv: csvText });
  const cd = await call('GET', `/api/clients/${client.id}/search-console/candidates`);
  const bad = await call('POST', `/api/clients/${client.id}/search-console/upload`, { csv: 'nope' });
  chk('The routes: the status, an upload, the candidates, a bad upload refused in words', g.status === 200 && g.body.property === 'sc-domain:edensedge.co.uk' && up.status === 200 && up.body.rows === 40 && cd.status === 200 && cd.body.counts.newPosts >= 5 && bad.status === 400 && /Top queries/.test(bad.body.error), JSON.stringify([g.status, up.body.rows, cd.body.counts, bad.body]), '');
  server.close();
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
