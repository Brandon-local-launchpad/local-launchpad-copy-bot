'use strict';
// A local demo of the WordPress card, end to end, with no real database or site:
//   - the app's own server.js and db.js, with the pg driver pointed at pg-mem
//     (an in-memory Postgres), so initDb creates the real schema
//   - a fake WordPress site (tests/fake-wp) with a draft homepage
//   - one demo client with a v20 homepage record (Ethan's values; one claims
//     finding left to accept)
// Run: npm run demo:wp   then open the URLs it prints.
// Test credentials only (the fake site's), never real ones.

const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const root = path.join(__dirname, '../..');

const { newDb, DataType } = require('pg-mem');
const mem = newDb();
mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
// research_jobs rows are written with to_timestamp(ms / 1000.0)
mem.public.registerFunction({ name: 'to_timestamp', args: [DataType.float], returns: DataType.timestamptz, implementation: s => new Date(s * 1000) });
const pgAdapter = mem.adapters.createPg();
// Every require('pg') in the app gets pg-mem
const realResolve = Module._resolveFilename;
const PG_ID = '__pgmem__';
Module._resolveFilename = function (request, ...rest) { return request === 'pg' ? PG_ID : realResolve.call(this, request, ...rest); };
require.cache[PG_ID] = { id: PG_ID, filename: PG_ID, loaded: true, exports: pgAdapter };

// The model, unless DEMO_REAL_MODEL=1: a canned claims review that finds FAQ 4's
// "usually" again and one new claim on the hero intro, so the carry-over and the
// "new on unchanged text" mark can be seen without an API call
const SDK_ID = '__fake_anthropic__';
if (process.env.DEMO_REAL_MODEL !== '1') {
  const realResolve2 = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) { return request === '@anthropic-ai/sdk' ? SDK_ID : realResolve2.call(this, request, ...rest); };
  // (The FAQ sorting step needs the real model: run with DEMO_REAL_MODEL=1 to try it.)
  class FakeAnthropic {
    constructor() {
      this.messages = { create: async () => ({ stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 }, content: [{ type: 'text', text: JSON.stringify({ findings: [
        { field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: '"usually" qualifies the confirmed start time' },
        { field: 'home_hero_intro', quote: 'is a landscaper in Southampton', why: 'demo: a made-up finding on text nobody touched' },
      ] }) }] }) };
    }
  }
  require.cache[SDK_ID] = { id: SDK_ID, filename: SDK_ID, loaded: true, exports: FakeAnthropic };
}

const PORT = process.env.DEMO_PORT || (process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 3991);
process.env.PORT = String(PORT);
process.env.DATABASE_URL = 'postgres://pg-mem/demo';
process.env.COPYBOT_SECRET_KEY = process.env.COPYBOT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
process.env.APP_PASSWORD = '';
process.env.GHL_ONBOARDING_SECRET = process.env.GHL_ONBOARDING_SECRET || 'demo-ghl-secret'; // the demo only: tools/ghl-onboarding-post.js posts with it
process.env.CITATIONS_SKIP_DA = '1'; // the demo's pg-mem is fresh each start: never buy DataForSEO ranks for it
// Review replies talk to a fake bundle.social started below, never the real one
process.env.DEMO_BUNDLE_PORT = process.env.DEMO_BUNDLE_PORT || String(Number(PORT) + 100);
process.env.BUNDLE_SOCIAL_API_KEY = 'demo-fake-key';
process.env.BUNDLE_SOCIAL_BASE_URL = `http://127.0.0.1:${process.env.DEMO_BUNDLE_PORT}/api/v1`;
process.env.REVIEW_REPLIES_POSTING = '1';
// A stand-in Drive for the GBP Posts & Photos tab: every photo is a generated picture (8 Nov 2026)
{
  const DC = require(path.join(root, 'drive/client.js'));
  const hues = [140, 95, 30, 200, 260, 10, 170, 60];
  const pic = id => { const n = [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0); const hue = hues[n % hues.length]; return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},40%,32%)"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="40" y="560" font-family="sans-serif" font-size="44" fill="#fff" opacity=".85">${String(id).replace(/[^a-z0-9-]/gi, '')}</text></svg>`); };
  DC.createDrive = () => ({ folder: async () => ({}), list: async () => [], download: async id => pic(id), thumbnail: async id => ({ bytes: pic(id), type: 'image/svg+xml' }), accessToken: async () => 'demo' });
}
delete process.env.GBP_PUBLISHING_ENABLED;

(async () => {
  const { createFakeWp, seedHomepage, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
  const fake = createFakeWp({ pages: [seedHomepage()] });
  const wp = await listen(fake.app);

  const { v20HomepageInputs } = require(path.join(root, 'server.js'));
  const { pool } = require(path.join(root, 'db.js'));
  for (let i = 0; i < 50; i++) {
    try { await pool.query('SELECT 1 FROM wp_connections LIMIT 1'); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }

  const fs = require('fs');
  const G = require(path.join(root, 'v20-generate.js'));
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
  const clientId = (await pool.query(`INSERT INTO clients (name, trade, use_v20_homepage, v20_test_mode) VALUES ('Edens Edge (demo)', 'Landscaper Gardener', true, true) RETURNING id`)).rows[0].id;
  // Client values, page map and category files, so the field editor can rebuild the page's facts
  const asset = (type, filename, content, metadata = null) => pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, $2, $3, $4, $5)`, [clientId, type, filename, content, metadata && JSON.stringify(metadata)]);
  // coastal_city left blank, so the area research answers it (see the dossier below)
  await asset('client_values', 'client_values.json', JSON.stringify({ ...E.ethanValues(), phone: '023 0000 0000', coastal_city: '' }));
  const realDir = path.join(root, 'tests/fixtures/edens-edge-real');
  for (const f of fs.readdirSync(realDir)) {
    await asset('client_file', f, fs.readFileSync(path.join(realDir, f), 'utf8'), { fileType: f === 'page-map.csv' ? 'page_map' : 'custom_values' });
  }
  // Ethan's 14 service areas (the client sheet isn't in the repo; see tests/fixtures/data/edens-edge-real.js)
  const { AREAS } = require(path.join(root, 'tests/fixtures/data/edens-edge-real.js'));
  const areasCsv = ['Client,,,', 'Name,GHL Custom Value Key,Value,Notes', ...AREAS.map((a, i) => `Service area ${i + 1},{{custom_values.biz_area_${i + 1}}},${a},`)].join('\n');
  await asset('client_file', 'client-areas.csv', areasCsv, { fileType: 'custom_values' });
  // The real Southampton dossier (saved 8 Oct), as the area research would have saved it,
  // plus the "Coastal:" line Geo Research CORE v7 adds (the 8 Oct run predates it)
  const dossierText = fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8')
    .replace(/(## 1\. LOCATION OVERVIEW[^\n]*\n[\s\S]*?)(\n## 2\.)/, '$1\nCoastal: Yes [https://www.southampton.gov.uk/media/f2hbzwte/6-environment.pdf]\n$2');
  await asset('geo_dossier', 'Southampton_dossier.md', dossierText,
    { location_name: 'Southampton', location_norm: 'southampton', superseded: false });
  const { ctx, decisionsResult } = await v20HomepageInputs(clientId, null);
  const D = decisionsResult.decisions;
  if (!D) throw new Error('Demo client fails the gates: ' + JSON.stringify(decisionsResult.gates));

  const old = require(path.join(root, 'tests/fixtures/v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
  const record = { ...old, meta: { ...old.meta, client_values: G.clientValueMap(ctx.cv, D.d1_years_trading), decisions_block: decisionsResult.decisionsBlock } };
  const ordered = {};
  for (const [k, v] of Object.entries(record)) {
    ordered[k] = v;
    if (k === 'VALIDATION') ordered.CLAIMS = { for: record.meta.generated_at, status: 'needs acceptance', first_review: 3, rounds: [],
      findings: [{ field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: '"usually" qualifies the confirmed start time' }] };
  }
  // A reviewed page, so the Quality card and its verdict can be seen: two judge items failed, listed under Edit before publishing
  ordered.QUALITY = { at: record.meta.generated_at, model: 'demo', score: 7.5, done: false, failed: ['Y5', 'Y6'], other_problems: [], missing_facts: [],
    failures: [{ id: 'Y5', by: 'judge', title: 'Reads naturally', pass: false, reasons: [`"${(ordered.home_services_intro || '').split('. ')[0].split(' ').slice(0, 6).join(' ')}": This opening could sit on any site.`] }, { id: 'Y6', by: 'judge', title: 'No padding', pass: false, reasons: [`"${(ordered.home_final_cta_body || '').split('. ')[0].split(' ').slice(0, 6).join(' ')}": A reader has to parse this twice.`] }] };
  await asset('v20_page_record', 'homepage_v20.json', JSON.stringify(ordered));

  // No FAQ research or sorted questions: the FAQ questions card shows the real empty state

  // GBP output (23 Oct): the newest local real run (node tools/gbp-run.js edens-edge) when
  // there is one, so the client page's GBP panel can be seen with real copy. The demo client
  // has no v3 page map, so the panel's readiness line shows that error and the button is off.
  const runsDir = path.join(root, 'tests/quality-runs/gbp/edens-edge');
  const runs = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter(d => fs.existsSync(path.join(runsDir, d, 'record.json'))).sort() : [];
  if (runs.length) await asset('gbp_output', 'gbp.json', fs.readFileSync(path.join(runsDir, runs[runs.length - 1], 'record.json'), 'utf8'));

  // The Site audit tab on the real test site (5 Nov): the recording of the real scan played back
  // into the database, so nothing is fetched or bought. Scan again needs real credentials in the environment.
  const liveDomain = 'https://southamptonhomes.co.uk';
  // Review replies (8 Nov 2026): the demo client on a fake bundle.social, with a queue to approve from
  {
    const { createFakeBundle } = require(path.join(root, 'tests/fake-bundle/fake-bundle.js'));
    const fb = createFakeBundle({ apiKey: process.env.BUNDLE_SOCIAL_API_KEY });
    const team = fb.addSource('Local Launchpad', [{ id: 'loc_demo', name: 'Edens Edge Landscaping', address: 'Southampton' }]);
    await new Promise(r => { const s = require('http').createServer(fb.app).listen(Number(process.env.DEMO_BUNDLE_PORT), '127.0.0.1', r); });
    await require(path.join(root, 'publisher/store.js')).createPublishStore(pool).saveConnection(clientId, { team_id: team.id, channel_id: 'loc_demo', status: 'connected', location_name: 'Edens Edge Landscaping', source_name: 'Local Launchpad' });
    const rs = require(path.join(root, 'reviews/store.js')).createReviewStore(pool);
    const { fromBundle } = require(path.join(root, 'reviews/sync.js'));
    const D = require(path.join(root, 'reviews/draft.js'));
    const fields = { business_name: 'Edens Edge Landscaping', trade: 'landscaping', main_services: 'patios, decking, turf, fencing', service_area: 'Southampton, Eastleigh and Romsey', contact_name: 'Tom', contact_role: 'Owner', direct_phone: '07580 412717', direct_email: 'tom@edensedge.example', phone_confirmed: true, email_confirmed: false };
    await rs.saveSettings(clientId, { ...fields, live_from: '2026-11-01', approver_name: 'Ray', approver_email: 'ray@example.com', leadsnap_checked: true, leadsnap_checked_by: 'Brandon', leadsnap_checked_at: new Date().toISOString() }, { by: 'demo', at: new Date().toISOString() });
    const hoursAgo = n => new Date(Date.now() - n * 3600000).toISOString();
    const seed = [
      { stars: 1, name: 'Dave Brown', comment: "Your crew showed up an hour late and didn't call ahead.", queued: 50, draft: "I'm sorry we didn't meet your expectations on timing and communication. I understand how frustrating it is when you've planned your day around us. I'd like to personally understand what happened and put it right. Please call me on 07580 412717 or email tom@edensedge.example. Tom, Owner, Edens Edge Landscaping" },
      { stars: 3, name: 'A Google User', comment: 'Good job on the garden overall, a bit pricey though.', queued: 30, draft: "Thank you for the review and for your kind words about the garden. I'm sorry the price felt high, and I have shared your feedback with the team. Tom, Edens Edge Landscaping" },
      { stars: 5, name: 'Mark Lee', comment: 'Tom and the team transformed our back garden. New patio and planting, tidy every day.', queued: 2, draft: 'Mark, thank you, and thanks from Tom and the team too. It was a pleasure transforming your back garden with the new patio and planting. The Edens Edge Landscaping team' },
    ];
    for (const s of seed) {
      const b = fb.addReview(team.id, { stars: s.stars, name: s.name, comment: s.comment, createTime: hoursAgo(s.queued + 3) });
      await rs.insertReview(clientId, { ...fromBundle(b), status: 'queued', source: 'sync', queued_at: hoursAgo(s.queued), notified_at: hoursAgo(s.queued) }, new Date().toISOString());
      const problems = D.validate(s.draft, { stars: s.stars, fields, comment: s.comment, reviewerName: s.name });
      const id = await rs.addDraft({ review_id: b.id, client_id: clientId, source: 'model', template: `star${s.stars}`, model: 'demo', attempt: 1, text: s.draft, ok: !problems.length, problems, at: new Date().toISOString() });
      await rs.updateReview(b.id, { draft_id: id, ...(problems.length ? { flag: 'draft_failed', last_error: `The draft failed its checks twice: ${problems.map(p => p.msg).join(' ')}` } : {}) }, new Date().toISOString());
    }
    const old = fb.addReview(team.id, { stars: 2, comment: 'From before go-live.', createTime: '2026-10-01T10:00:00Z' });
    await rs.insertReview(clientId, { ...fromBundle(old), status: 'backlog' }, new Date().toISOString());
    console.log(`  Review queue: http://localhost:${PORT}/reviews   (fake bundle.social on ${process.env.DEMO_BUNDLE_PORT})`);
  }
  const auditId = (await pool.query(`INSERT INTO clients (name, trade) VALUES ('Southampton Homes (site audit test)', 'Landscaper Gardener') RETURNING id`)).rows[0].id;
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client-values.json', $2)`, [auditId, JSON.stringify({ company_name: 'Southampton Homes Ltd', live_domain: liveDomain })]);
  // It isn't a client, so it has no Page Map of its own: Edens Edge's stands in (a landscaper in Southampton too)
  const standIn = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json'), 'utf8')).rows.filter(r => r.applies !== false);
  for (const [i, r] of standIn.entries()) await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, status, applies, info, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10)`, [auditId, `${r.type}:${r.slug}`, r.type, r.title, r.slug, r.h1 || '', r.h1_source || 'needed', r.status || 'Not Started', JSON.stringify(r.info || {}), i]);
  await pool.query(`INSERT INTO client_page_map_state (client_id, generated_at, inputs) VALUES ($1, NOW(), $2)`, [auditId, JSON.stringify({ baseTown: 'Southampton' })]);
  // GBP Posts & Photos (8 Nov 2026): a Drive read and a written batch to review, on the stand-in Drive above
  {
    const folderLink = 'https://drive.google.com/drive/folders/demoPhotos123';
    await pool.query(`UPDATE client_assets SET content=$2 WHERE client_id=$1 AND asset_type='client_values'`, [auditId, JSON.stringify({ company_name: 'Southampton Homes Ltd', live_domain: liveDomain, drive_photo_folder: folderLink, free_quotes: 'yes' })]);
    const file = (label, i, kind = 'post') => ({ file_id: `${label.toLowerCase().replace(/\W+/g, '-')}-${i}`, kind, label, folder_id: `f-${label}`, name: `${label.toLowerCase().replace(/\W+/g, '-')}-${i}.jpeg`, mime_type: 'image/svg+xml', size_bytes: 900000 + i * 1000, width: 1600, height: 1200, md5: `m-${label}-${i}`, modified_at: null, web_link: '', problem: '' });
    const sets = { Fencing: 6, Trees: 5, Pergolas: 4, Patios: 3, Brand: 3 };
    const files = [...Object.entries(sets).flatMap(([l, n]) => Array.from({ length: n }, (_, i) => file(l, i + 1))), ...Array.from({ length: 8 }, (_, i) => ({ ...file('GBP Photos – Photo Drip', i + 1, 'drip') }))];
    await require(path.join(root, 'drive/store.js')).createDriveStore(pool).saveRead(auditId, { folder_id: 'demoPhotos123', folder_name: 'Images from Southampton Homes', posts_found: true, drip_found: true, folders: Object.keys(sets).map(l => ({ label: l, id: `f-${l}` })), problems: [], notes: [], files });
    const ps = require(path.join(root, 'gbp-posts/store.js')).createPostStore(pool);
    const day = n => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); };
    const body = [
      'Thinking about getting your garden sorted but not sure where to begin? Southampton Homes is offering a free, no-obligation quote for garden work in Romsey, so you can have things looked at and priced without any pressure to go ahead.\n\nWe come and look at the space you have, talk through what you would like done, and then give you a clear price. There is no charge for the visit or the quote.',
      'A fence that leans is hard to ignore. One panel starts to tilt, a gap opens up where there used to be a tight join, and before long the whole boundary looks tired.\n\nThese problems rarely come out of nowhere. Usually they trace back to how the fencing was put up in the first place: posts that weren\'t set firmly enough, or panels that weren\'t fixed properly.\n\nAt Southampton Homes we put the posts in properly, check every one with a level and let them settle before the panels go on. That way the fence stays straight for years, not months.',
      'Does a pergola have to be fixed to the house? No. A pergola can stand entirely on its own, and for many gardens that is the better choice.\n\nA freestanding pergola sits on its own posts, so you can place it wherever suits the garden, whether that\'s over a seating area in the middle of the lawn or at the far end for a quiet spot away from the house.',
      'Tree cabling and bracing is a way of supporting a tree that has a weak limb or a split union, rather than taking the whole tree down. We check how the trunk and main limbs are shaped, where branches join together, and whether any unions are tight or showing signs of splitting.',
    ];
    const posts = [
      { seq: 1, post_date: day(3), post_time: '10:00', topic: 'OFFER', prompt_n: 1, prompt_label: 'Free, no-obligation quote', folder: 'GBP Photos – Posts / Fencing', drive_file_id: 'fencing-1', photo_name: 'fencing-1.jpeg', cta_type: '', cta_url: '', offer_title: 'Free, no-obligation quote', offer_start: day(3), offer_end: day(31), offer_redeem_url: '' },
      { seq: 2, post_date: day(6), post_time: '10:00', topic: 'STANDARD', prompt_n: 2, prompt_label: 'Fencing: the problem customers notice', folder: 'GBP Photos – Posts / Fencing', drive_file_id: 'fencing-2', photo_name: 'fencing-2.jpeg', cta_type: 'LEARN_MORE', cta_url: `${liveDomain}/fencing`, offer_title: '', offer_start: '', offer_end: '', offer_redeem_url: '' },
      { seq: 3, post_date: day(10), post_time: '10:00', topic: 'STANDARD', prompt_n: 3, prompt_label: 'Pergolas: one practical question answered', folder: 'GBP Photos – Posts / Pergolas', drive_file_id: 'pergolas-1', photo_name: 'pergolas-1.jpeg', cta_type: 'LEARN_MORE', cta_url: `${liveDomain}/pergolas`, offer_title: '', offer_start: '', offer_end: '', offer_redeem_url: '' },
      { seq: 4, post_date: day(13), post_time: '10:00', topic: 'STANDARD', prompt_n: 4, prompt_label: 'Trees: how the job is done', folder: 'GBP Photos – Posts / Trees', drive_file_id: 'trees-1', photo_name: 'trees-1.jpeg', cta_type: 'CALL', cta_url: '', offer_title: '', offer_start: '', offer_end: '', offer_redeem_url: '' },
    ];
    const config = { generated_at: new Date().toISOString(), output: { prompts: posts.map(p => ({ n: p.prompt_n, label: p.prompt_label, folder: p.folder, text: 'demo', area: 'Romsey' })) } };
    const bid = await ps.createBatch(auditId, { size: 13, start: day(3), config, notes: [], posts });
    const checks = [[{ level: 'pass', label: 'No phone number' }], [{ level: 'warn', label: 'Names a town beyond its area', detail: 'Totton' }], [{ level: 'pass', label: 'No phone number' }], [{ level: 'fail', label: 'An unconfirmed claim', detail: '"fully insured"' }]];
    for (const [i, p] of (await ps.posts(bid)).entries()) await ps.saveWritten(p.id, { body: body[i], opening: body[i].split(' ').slice(0, 4).join(' '), checks: checks[i], fails: checks[i].filter(c => c.level === 'fail').length, warnings: checks[i].filter(c => c.level === 'warn').length });
    await ps.setStatus(bid, 'draft');
  }
  // The Lead Snap tab: the newest local real run (node tools/leadsnap-autopost-run.js edens-edge) when there is
  // one, so the config can be seen with real prompts. Generate here gets the demo's canned model, so it shows the failed state.
  const lsDir = path.join(root, 'tests/quality-runs/leadsnap/edens-edge');
  const lsRuns = fs.existsSync(lsDir) ? fs.readdirSync(lsDir).filter(d => fs.existsSync(path.join(lsDir, d, 'autopost-config.txt'))).sort() : [];
  if (lsRuns.length) {
    const lsRec = fs.readFileSync(path.join(lsDir, lsRuns[lsRuns.length - 1], 'record.json'), 'utf8');
    const lsParsed = JSON.parse(lsRec);
    await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'leadsnap_autopost', 'leadsnap_autopost.json', $2)`, [auditId, lsRec]);
    await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'leadsnap_autopost_hand', 'leadsnap_autopost_hand.json', $2)`, [auditId, JSON.stringify({ counts: Object.fromEntries(lsParsed.intake.groups.map(g => [g.key, g.photos])), brand: lsParsed.intake.brand })]);
    const lsPv = path.join(lsDir, lsRuns[lsRuns.length - 1], 'previews.json');
    if (fs.existsSync(lsPv)) await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'leadsnap_previews', 'previews.json', $2)`, [auditId, fs.readFileSync(lsPv, 'utf8')]);
  }
  // Its redirects go to the fake site, marked staging. The fake site answers only the pages it has.
  const { encrypt } = require(path.join(root, 'wp/secrets.js'));
  await pool.query(`INSERT INTO wp_connections (client_id, url, wp_user, app_password_enc, staging, seo) VALUES ($1, $2, 'copybot', $3, TRUE, 'rankmath')`, [auditId, wp.url, encrypt('test-app-password-not-real')]);
  for (const p of ['/contact', '/landscape-designer']) fake.state.publicPaths.add(p);
  const replayed = require(path.join(root, 'site-audit/service.js')).createSiteAudit({
    pool, loadValues: async () => ({ live_domain: liveDomain }), env: { DATAFORSEO_LOGIN: 'replay', DATAFORSEO_PASSWORD: 'replay' },
    fetchImpl: require(path.join(root, 'site-audit/replay.js')).replayer(path.join(root, 'tests/fixtures/data/site-audit-southamptonhomes-recorded.json')),
    sleep: async () => {}, lookup: async () => ({ address: '8.8.8.8' }),
  });
  await replayed.start(auditId);
  await replayed.wait(auditId);


  console.log('\nDEMO READY');
  console.log(`  Site audit:   http://localhost:${PORT}/clients/${auditId}/site-audit`);
  console.log(`  Client:       http://localhost:${PORT}/clients/${clientId}/record`);
  console.log(`  Pages:        http://localhost:${PORT}/clients/${clientId}/pages`);
  console.log(`  Page view:    http://localhost:${PORT}/clients/${clientId}/pages/homepage/homepage`);
  console.log(`  Dashboard:    http://localhost:${PORT}/dashboard`);
  console.log(`  Fake WP site: ${wp.url}  (user copybot, Application Password test-app-password-not-real)`);
  console.log(`  Fake site writes so far: GET ${wp.url}/__writes`);
  fake.app.get('/__writes', (req, res) => res.json({ writes: fake.state.writes, h1: fake.state.pages.get(7).acf.home_hero_h1 }));
})().catch(e => { console.error('Demo failed:', e); process.exit(1); });
