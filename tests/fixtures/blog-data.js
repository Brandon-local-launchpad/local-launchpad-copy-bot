'use strict';
// Fixture: blog posts, stage 1 (data), 28 Oct 2026. Every blog input present or reported
// missing in plain words (blog/inputs.js) for Edens Edge (landscaper, no prices, no launch
// date) and Kestrel Ridge rich (roofer, full data); the niche blog slots and their business
// type defaults (blog/blocks.js); the owner read from the onboarding form; the three settings
// on the client and their routes on pg-mem (blog/db.js, blog/routes.js); blog rows in the page
// map (upsert, a manual H1 kept, a published post never retired, a regeneration leaving them
// alone, the CSV columns). No API calls.
// The dog walker (type C, no category layer) is out of this build (Brandon, 28 Oct): its
// slot is the DOG_WALKER block below, filled in when his test data arrives.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { blogInputsFor, parseOwnerTitle, bylineFor, matchPrices } = require(path.join(root, 'blog/inputs.js'));
const { blocksFor, businessTypeOf } = require(path.join(root, 'blog/blocks.js'));
const { ensureBlogColumns, getBlogSettings, saveBlogSettings } = require(path.join(root, 'blog/db.js'));
const { mountBlogApi, createBlogInputsLoader } = require(path.join(root, 'blog/routes.js'));
const G = require(path.join(root, 'page-map/generator.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { CV_KEYS } = require(path.join(root, 'v20-generate.js'));
const { ALL_KEYS } = require(path.join(root, 'wp/client-values.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const K = require(path.join(__dirname, 'data/kestrel-ridge-rich.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const roofer = require(path.join(root, 'niche-library/roofer.json'));
const { rows: edensRows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const has = (list, re) => (list || []).some(s => re.test(s));
console.log('\n=== FIXTURE: blog posts, stage 1 (data) ===\n');

// ── The owner from the onboarding form, and the byline (B13 with the amendment) ──
const oc = [['Ethan, owner', 'Ethan', 'owner'], ['Sarah - lead roofer', 'Sarah', 'lead roofer'], ['Dan (the owner)', 'Dan', 'owner'], ['Priya: director', 'Priya', 'director'], ['Tom', 'Tom', ''], ['', '', '']];
chk('owner_name_title splits into name and role on a comma, dash, bracket or colon; a bare name has no role', oc.every(([raw, n, r]) => { const o = parseOwnerTitle(raw); return o.name === n && o.role === r; }), JSON.stringify(oc.map(([raw]) => parseOwnerTitle(raw))), JSON.stringify(oc.map(([, n, r]) => ({ name: n, role: r }))));
chk('Byline: name and role at the company; no role reads "owner"; no name reads the company alone',
  bylineFor({ name: 'Sarah', role: 'lead roofer', company: 'Kestrel Ridge Roofing' }) === 'By Sarah, lead roofer at Kestrel Ridge Roofing' && bylineFor({ name: 'Sarah', role: '', company: 'Kestrel Ridge Roofing' }) === 'By Sarah, owner at Kestrel Ridge Roofing' && bylineFor({ name: '', role: '', company: 'Kestrel Ridge Roofing' }) === 'By Kestrel Ridge Roofing',
  bylineFor({ name: 'Sarah', role: '', company: 'Kestrel Ridge Roofing' }), 'By Sarah, owner at Kestrel Ridge Roofing');
chk('owner_role is a client value token and a WordPress client value key', CV_KEYS.includes('owner_role') && ALL_KEYS.some(k => k.key === 'owner_role'), '', 'owner_role');

// ── The niche blog slots ──
const lsA = blocksFor({ niche: { ...landscaper, _source: 'landscaper' }, cv: { business_type: 'A' } });
const lsB = blocksFor({ niche: { ...landscaper, _source: 'landscaper' }, cv: { business_type: 'B' } });
chk('Landscaper type A: the Next step heading, per job, seasonal topics with their windows, safety topics and decision pairs from the entry',
  lsA.type === 'A' && lsA.blog_cta_h2 === 'Talk to a Local [TRADE_PERSON] About [TOPIC]' && lsA.cost_unit === 'per job' && lsA.seasonal && lsA.seasonal_topics.length === 4 && lsA.seasonal_topics[0].topic === 'Lay new turf' && lsA.seasonal_topics[0].window === 'September to October' && lsA.seasonal_topics[0].publish === 'August' && lsA.safety_topics.includes('Electrics for garden lighting') && lsA.decision_pairs.includes('Turf or seed') && lsA.source === 'niche' && !lsA.flags.length,
  JSON.stringify({ t: lsA.type, cta: lsA.blog_cta_h2, unit: lsA.cost_unit, s: lsA.seasonal_topics.length, flags: lsA.flags }), '');
chk('Landscaper type B: "Book a Local [TRADE_PERSON] for [TOPIC]", per visit', lsB.blog_cta_h2 === 'Book a Local [TRADE_PERSON] for [TOPIC]' && lsB.cost_unit === 'per visit', `${lsB.blog_cta_h2} / ${lsB.cost_unit}`, '');
const rfA = blocksFor({ niche: { ...roofer, _source: 'roofer' }, cv: K.cv });
chk('Roofer (type A, not seasonal in its entry): the heading and unit from the entry, the seasonal topics held back until seasonal_trade is set, no flags', rfA.type === 'A' && rfA.cost_unit === 'per job' && !rfA.seasonal && rfA.seasonal_topics.length === 0 && rfA.decision_pairs.includes('Repair or replace') && !rfA.flags.length, JSON.stringify({ seasonal: rfA.seasonal, n: rfA.seasonal_topics.length, flags: rfA.flags }), '');
const none = blocksFor({ niche: { trade: 'Plumbing', trade_person: 'plumber', business_type_default: 'A', buttons: { primary_action: 'Get My [QUOTE_FREE] Quote' } }, cv: {} });
chk('A niche with no blog entry: the business type defaults and one F-BLOG-SLOTS flag, never a refusal', none.source === 'default' && none.blog_cta_h2 === 'Talk to a Local [TRADE_PERSON] About [TOPIC]' && none.cost_unit === 'per job' && none.flags.length === 1 && none.flags[0].code === 'F-BLOG-SLOTS' && !none.seasonal_topics.length && !none.decision_pairs.length, JSON.stringify(none.flags), '1 flag');
const petC = blocksFor({ niche: { trade: 'Dog walking', trade_person: 'dog walker', business_type_default: 'C', buttons: { primary_action: 'Book a Meet and Greet' } }, cv: {} });
chk('Type C default heading follows the niche\'s primary action; per session', petC.type === 'C' && petC.blog_cta_h2 === 'Book a Meet and Greet With a Local [TRADE_PERSON]' && petC.cost_unit === 'per session', `${petC.blog_cta_h2} / ${petC.cost_unit}`, '');
const partial = blocksFor({ niche: { trade: 'X', seasonal_trade: true, business_type_default: 'B', blog: { decision_pairs: ['A or B'] } }, cv: {} });
chk('A partial entry: the slots left out take their defaults and are each named in a flag', partial.cost_unit === 'per visit' && partial.decision_pairs.length === 1 && partial.gaps.length === 4 && partial.flags.every(f => f.code === 'F-BLOG-SLOTS') && has(partial.flags.map(f => f.msg), /seasonal_topics/), JSON.stringify(partial.gaps), '4 gaps');
chk('Business type: the client value wins, "split" and blank fall to the niche default, else A', businessTypeOf({ business_type: 'b' }, { business_type_default: 'A' }) === 'B' && businessTypeOf({ business_type: 'split' }, { business_type_default: 'B' }) === 'B' && businessTypeOf({}, {}) === 'A', '', '');

// ── Edens Edge: no prices, no launch date, the pack unverified ──
const edensCv = { ...E.ethanValues(), owner_name: '', owner_role: '' };
const edens = blogInputsFor({ cv: edensCv, client: { name: 'Edens Edge', trade: 'Landscaper', launch_date: null, status: 'active', search_console_property: '' }, priceRows: [], fields: [{ key: 'owner_name_title', value: 'Ethan, owner', status: 'filled' }], niche: { ...landscaper, _source: 'landscaper' }, rows: edensRows, tradeFacts: { niche: 'landscaper', verified: false, message: 'the landscaper pack is not verified' }, dossiers: [{ locationName: 'Southampton' }] });
chk('Edens Edge: company name and phone on file (G-INPUT ready)', edens.ready === true, edens.ready, true);
chk('Edens Edge: the owner read from the form ("Ethan, owner"), marked inferred, byline "By Ethan, owner at …"', edens.owner.name === 'Ethan' && edens.owner.role === 'owner' && edens.owner.inferred && edens.owner.source === 'onboarding form' && /^By Ethan, owner at /.test(edens.owner.byline) && has(edens.notes, /read from the onboarding form/), JSON.stringify(edens.owner), '');
chk('Edens Edge: the launch date, the Search Console property and the pack are reported missing in plain words', has(edens.missing, /^Launch date: not set/) && has(edens.missing, /^Search Console property: not set/) && has(edens.missing, /^Trade facts pack: the landscaper pack is not verified/), edens.missing.join(' | '), '3 missing');
chk('Edens Edge: no price rows, so every cost guide runs on factors (a note, not a stop)', has(edens.notes, /^Prices: no price rows on file, so every cost guide runs on what affects the cost/) && edens.prices.withPrices === 0 && edens.prices.services.every(s => s.mode === 'factors'), edens.notes.join(' | '), '');
chk('Edens Edge: the service pages come from the v3 page map; Southampton is the one dossier; business type A; the slots from the landscaper entry', edens.page_map.services > 20 && edens.dossiers.join() === 'Southampton' && edens.business_type === 'A' && edens.slots.source === 'niche' && edens.status === 'active', JSON.stringify([edens.page_map, edens.dossiers, edens.business_type]), '');
const noName = blogInputsFor({ cv: { ...edensCv, company_name: '', phone: '' }, client: {}, niche: null, rows: [] });
chk('No company name, phone, niche or page map: each reported as missing; not ready', !noName.ready && has(noName.missing, /^Company name: blank/) && has(noName.missing, /^Phone: blank/) && has(noName.missing, /^Niche entry: none/) && has(noName.missing, /^Page map: not generated/) && /^By \[CV: company_name\]$/.test(noName.owner.byline), noName.missing.join(' | '), '');

// ── Kestrel Ridge rich: full data, prices per service (rows made for this test: the client's paper
// test has none; they exercise the matching, not any copy) ──
const kRows = K.pages.filter(p => p.urlSlug).map((p, i) => ({ page_key: `${p.pageType}:${p.urlSlug}`, type: p.pageType, title: p.pageTitle, slug: p.urlSlug, h1: p.h1, status: p.status === 'live' ? 'Live' : 'Not Started', applies: true, info: { phase: 1, gbp_names: [p.pageTitle] }, sort_order: i }));
const kPrices = [
  { id: 'p1', service: 'Roof repairs', from_gbp: 150, up_to_gbp: 600, typical_gbp: null, unit: 'per job', what_moves_price: 'access and how many tiles', quote_only: false, unverified: false, deleted: false },
  { id: 'p2', service: 'Flat roof replacement', from_gbp: 1500, up_to_gbp: 5000, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: false, deleted: false },
  { id: 'p3', service: 'Roof replacement', from_gbp: null, up_to_gbp: null, typical_gbp: null, unit: null, what_moves_price: '', quote_only: true, unverified: false, deleted: false },
  { id: 'p4', service: 'Leadwork', from_gbp: 300, up_to_gbp: null, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: true, deleted: false },
  { id: 'p5', service: 'Velux windows', from_gbp: 900, up_to_gbp: 1400, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: false, deleted: false },
  { id: 'p6', service: 'Fascias', from_gbp: 800, up_to_gbp: 800, typical_gbp: null, unit: 'per job', what_moves_price: '', quote_only: false, unverified: false, deleted: true },
];
const kestrel = blogInputsFor({ cv: K.cv, client: { name: 'Kestrel Ridge Roofing', trade: 'Roofer', launch_date: new Date('2026-11-02T00:00:00Z'), status: 'active', search_console_property: 'sc-domain:kestrelridgeroofing.co.uk' }, priceRows: kPrices, fields: [], niche: { ...roofer, _source: 'roofer' }, rows: kRows, tradeFacts: { niche: 'roofer', verified: true, message: '' }, dossiers: [{ locationName: 'Bournemouth' }, { locationName: 'Poole' }] });
const kp = Object.fromEntries(kestrel.prices.services.map(s => [s.title, s]));
chk('Kestrel: "Roof repairs" matches the Roof Repair page (stems), "Flat roof replacement" the Flat Roofing page: prices mode with the range and unit',
  kp['Roof Repair'].mode === 'prices' && kp['Roof Repair'].price.text === '£150 to £600 per job' && kp['Flat Roofing'].mode === 'prices' && kp['Flat Roofing'].price.text === '£1,500 to £5,000 per job',
  JSON.stringify([kp['Roof Repair'].mode, kp['Roof Repair'].price && kp['Roof Repair'].price.text, kp['Flat Roofing'].mode]), '');
chk('Kestrel: a quote only row (Roof Replacement) and an unverified figure (Leadwork) give factors mode, with the reason', kp['Roof Replacement'].mode === 'factors' && /quote only/.test(kp['Roof Replacement'].why) && kp['Leadwork'].mode === 'factors' && /unverified/.test(kp['Leadwork'].why), `${kp['Roof Replacement'].why} / ${kp['Leadwork'].why}`, '');
chk('Kestrel: a row naming no page (Velux windows) is listed as unmatched; a deleted row is ignored; 2 of 6 pages priced', kestrel.prices.unmatched.length === 1 && kestrel.prices.unmatched[0].service === 'Velux windows' && kestrel.prices.rows.length === 5 && kestrel.prices.withPrices === 2 && has(kestrel.notes, /^Prices: 2 of 6 service pages have a usable price row/) && has(kestrel.notes, /^No price for: Roof Replacement, Leadwork, Fascias and Soffits, Emergency Roof Repair/) && has(kestrel.notes, /^Price rows naming no service page: "Velux windows"/), kestrel.notes.join(' | '), '');
chk('Kestrel: owner from the client values ("Sarah", no role → owner; the qualification is not the role), launch date, status, property and the verified pack, so only nothing is missing', kestrel.owner.name === 'Sarah' && kestrel.owner.role === '' && kestrel.owner.byline === 'By Sarah, owner at Kestrel Ridge Roofing' && !kestrel.owner.inferred && kestrel.launch.date === '2026-11-02' && kestrel.search_console_property === 'sc-domain:kestrelridgeroofing.co.uk' && kestrel.trade_facts.verified && kestrel.missing.length === 0 && has(kestrel.notes, /^Owner role: blank, so the byline says "owner"/), JSON.stringify({ owner: kestrel.owner, missing: kestrel.missing }), 'nothing missing');
const churned = blogInputsFor({ cv: K.cv, client: { name: 'K', trade: 'Roofer', launch_date: '2026-11-02', status: 'churned', search_console_property: 'x' }, priceRows: [], niche: roofer, rows: kRows, tradeFacts: { verified: true } });
chk('A churned client is noted: scheduled posts become drafts, published posts stay', churned.status === 'churned' && has(churned.notes, /^Status: churned\. The daily job turns every scheduled post into a draft; published posts stay/), churned.notes.join(' | '), '');
chk('matchPrices on its own: no rows and no pages gives empty lists, nothing thrown', (() => { const m = matchPrices([], []); return m.services.length === 0 && m.rows.length === 0 && m.withPrices === 0; })(), '', '');

// ── DOG_WALKER: out of this build (Brandon, 28 Oct). When his test data arrives: cv, v3 rows with no
// category pages, a pet care niche entry (type C), price rows per session; the inputs report must say
// the primary link falls back to the homepage services section for every post. ──

// ── Settings on the client, the routes, blog rows in the page map ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  await ensureBlogColumns(pool); await ensureBlogColumns(pool);
  await ensurePageMapTables(pool);
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  const s0 = await getBlogSettings(pool, c.id);
  chk('ensureBlogColumns twice is harmless; a new client is active with no launch date or property', s0.status === 'active' && s0.launch_date === null && s0.search_console_property === '', JSON.stringify(s0), '');
  const s1 = await saveBlogSettings(pool, c.id, { launch_date: '2026-11-02', status: 'churned', search_console_property: ' sc-domain:edensedge.co.uk ' });
  chk('Save: the date, the status and the trimmed property come back', s1.launch_date === '2026-11-02' && s1.status === 'churned' && s1.search_console_property === 'sc-domain:edensedge.co.uk', JSON.stringify(s1), '');
  const s2 = await saveBlogSettings(pool, c.id, { launch_date: '' });
  chk('A blank date clears it; the other two keep their values', s2.launch_date === null && s2.status === 'churned' && s2.search_console_property === 'sc-domain:edensedge.co.uk', JSON.stringify(s2), '');
  let err = '';
  try { await saveBlogSettings(pool, c.id, { status: 'gone' }); } catch (e) { err = e.message; }
  chk('A status outside active / churned is refused in words', /Status must be one of: active, churned/.test(err), err, '');
  err = '';
  try { await saveBlogSettings(pool, c.id, { launch_date: '2 Nov 2026' }); } catch (e) { err = e.message; }
  chk('A date not written YYYY-MM-DD is refused in words', /Launch date must be a date, as YYYY-MM-DD/.test(err), err, '');
  err = '';
  try { await saveBlogSettings(pool, c.id, { launch_date: '2026-13-45' }); } catch (e) { err = e.message; }
  chk('An impossible date is refused', /is not a real date/.test(err), err, '');
  err = '';
  try { await getBlogSettings(pool, crypto.randomUUID()); } catch (e) { err = e.message; }
  chk('An unknown client: Client not found', err === 'Client not found.', err, '');

  // The loader on the database alone: values, dossiers and the page map; no record service, no niche, no pack
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [c.id, JSON.stringify({ ...edensCv, owner_name: 'Ethan', owner_role: 'owner' })]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'd.md', 'x', $2)`, [c.id, JSON.stringify({ location_name: 'Southampton', superseded: false })]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'd2.md', 'x', $2)`, [c.id, JSON.stringify({ location_name: 'Romsey', superseded: true })]);
  const store = createPageMapStore({ pool, filloutService: null });
  for (const r of edensRows.filter(x => x.type === 'service').slice(0, 3)) await pool.query(`INSERT INTO client_page_map (client_id, page_key, type, title, slug, status, applies, info, sort_order) VALUES ($1, $2, 'service', $3, $4, 'Not Started', TRUE, $5, 0)`, [c.id, r.page_key || `service:${r.slug}`, r.title, r.slug, JSON.stringify(r.info || {})]);
  const load = createBlogInputsLoader({ pool, pageMapStore: store, loadV20Context: async () => { throw new Error('no page map files here'); } });
  const L = await load(c.id);
  chk('Loader: the values, the live dossier only, 3 service pages; the context failure is reported, not thrown; the niche is missing', L.owner.name === 'Ethan' && L.owner.byline === 'By Ethan, owner at Edens Edge Landscaping' && L.dossiers.join() === 'Southampton' && L.page_map.services === 3 && L.problems.some(p => /no page map files here/.test(p)) && has(L.missing, /^Niche entry: none/) && has(L.missing, /^Trade facts pack: no trade facts pack found/), JSON.stringify({ owner: L.owner.byline, d: L.dossiers, p: L.problems, m: L.missing }), '');

  // The routes
  const app = express(); app.use(express.json());
  mountBlogApi(app, { pool, loadBlogInputs: load });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const url = p => `http://127.0.0.1:${server.address().port}${p}`;
  const call = (p, opts = {}) => new Promise((resolve, reject) => { const u = new URL(url(p)); const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null })); }); req.on('error', reject); if (opts.body) req.write(JSON.stringify(opts.body)); req.end(); });
  try {
    const g = await call(`/api/clients/${c.id}/blog-settings`);
    chk('GET blog-settings: the settings and the inputs report', g.status === 200 && g.body.settings.status === 'churned' && g.body.inputs.owner.name === 'Ethan' && Array.isArray(g.body.inputs.missing), JSON.stringify(g.body && g.body.settings), '');
    const p = await call(`/api/clients/${c.id}/blog-settings`, { method: 'PUT', body: { launch_date: '2026-11-09', status: 'active', search_console_property: 'https://www.edensedge.co.uk/' } });
    chk('PUT blog-settings saves and returns the same shape; the launch date leaves the missing list', p.status === 200 && p.body.settings.launch_date === '2026-11-09' && p.body.settings.status === 'active' && !has(p.body.inputs.missing, /^Launch date/) && !has(p.body.inputs.missing, /^Search Console/), JSON.stringify(p.body && p.body.settings), '');
    const bad = await call(`/api/clients/${c.id}/blog-settings`, { method: 'PUT', body: { status: 'paused' } });
    chk('PUT with a bad status: 400 and the reason', bad.status === 400 && /Status must be one of/.test(bad.body.error), JSON.stringify(bad.body), '400');
    const nf = await call(`/api/clients/${crypto.randomUUID()}/blog-settings`);
    chk('GET for an unknown client: 404', nf.status === 404 && nf.body.error === 'Client not found.', JSON.stringify(nf.body), '404');
  } finally { await new Promise(r => server.close(r)); }

  // Blog rows in the page map
  const q1 = [
    { slug: '/guides/landscaping-cost-southampton', title: 'How Much Does Landscaping Cost in Southampton?', h1: 'How Much Does Landscaping Cost in Southampton?', info: { post_type: 'cost_guide', target_query: 'landscaping cost southampton', query_stack: ['Q12', 'Q14', 'Q15'], faq_ids: ['Q20', 'Q21', 'Q22'], primary_link: '/', secondary_links: [], homepage_cost_guide: true, publish_date: '2026-11-09', link_status: 'Scheduled', batch: 'onboarding', source: 'faq_research', source_query: '', not_a_column: 'dropped' } },
    { slug: '/guides/patio-cost-southampton', title: 'How Much Does a Patio Cost in Southampton?', h1: 'How Much Does a Patio Cost in Southampton?', info: { post_type: 'cost_guide', target_query: 'patio cost southampton', query_stack: ['Q2'], faq_ids: ['Q3'], primary_link: '/services/patios', secondary_links: ['/guides/landscaping-cost-southampton'], publish_date: '2026-11-09', batch: 'onboarding', source: 'faq_research' } },
    { slug: '/guides/turf-or-seed', title: 'Turf or Seed: Which Is Better for a New Lawn?', h1: 'Turf or Seed: Which Is Better for a New Lawn?', info: { post_type: 'decision', target_query: 'turf or seed', query_stack: [], faq_ids: [], primary_link: '/services/turfing', secondary_links: [], publish_date: '2026-12-01', batch: 'onboarding', source: 'faq_research' } },
  ];
  let b = await store.upsertBlogRows(c.id, q1);
  chk('upsertBlogRows: three blog rows after every other row, type blog, auto H1 as the question, Not Started, the info columns kept and a stray key dropped', b.length === 3 && b.every(r => r.type === 'blog' && r.h1_source === 'auto' && r.status === 'Not Started' && r.applies === true) && b[0].page_key === 'blog:/guides/landscaping-cost-southampton' && b[0].info.homepage_cost_guide === true && b[0].info.query_stack.length === 3 && b[0].info.not_a_column === undefined && b.every(r => r.sort_order >= 1) && b[2].sort_order > b[0].sort_order, JSON.stringify(b.map(r => [r.page_key, r.sort_order, r.h1])), '');
  await store.setRow(c.id, b[2].id, { h1: 'Turf or Seed for a New Lawn in Southampton?' });
  await store.patchBlogRow(c.id, '/guides/patio-cost-southampton', { status: 'Scheduled', info: { published_url: 'https://example.co.uk/guides/patio-cost-southampton/' } });
  b = await store.upsertBlogRows(c.id, [{ ...q1[0], h1: 'How Much Does Landscaping Cost in Southampton? (v2)', info: { ...q1[0].info, publish_date: '2026-11-16' } }, q1[2]]);
  const byKey = Object.fromEntries(b.map(r => [r.slug, r]));
  chk('A second upsert: the known row follows the queue (new auto H1 and date), a manual H1 is kept, the Scheduled post that left the queue stays (never retired)', byKey['/guides/landscaping-cost-southampton'].h1 === 'How Much Does Landscaping Cost in Southampton? (v2)' && byKey['/guides/landscaping-cost-southampton'].info.publish_date === '2026-11-16' && byKey['/guides/turf-or-seed'].h1 === 'Turf or Seed for a New Lawn in Southampton?' && byKey['/guides/turf-or-seed'].h1_source === 'manual' && byKey['/guides/patio-cost-southampton'].applies === true && byKey['/guides/patio-cost-southampton'].status === 'Scheduled' && byKey['/guides/patio-cost-southampton'].info.published_url, JSON.stringify(b.map(r => [r.slug, r.h1_source, r.status, r.applies])), '');
  b = await store.upsertBlogRows(c.id, [q1[0], q1[1]]);
  chk('A Not Started topic that leaves the queue no longer applies, with the reason; it comes back when the queue lists it again', byKeyOf(b)['/guides/turf-or-seed'].applies === false && /no longer in the blog topic queue/.test(byKeyOf(b)['/guides/turf-or-seed'].retired_reason) && byKeyOf(await store.upsertBlogRows(c.id, q1))['/guides/turf-or-seed'].applies === true, JSON.stringify(b.map(r => [r.slug, r.applies, r.retired_reason])), '');
  function byKeyOf(list) { return Object.fromEntries(list.map(r => [r.slug, r])); }
  // A regeneration (the plan without any blog row) retires none of them
  const saved = await store.saved(c.id);
  const plan = saved.filter(r => r.type !== 'blog').map(r => ({ ...r, links_to: r.links_to, links_from: r.links_from, links: (r.info || {}).links || null }));
  const diff = G.diffPlan(saved, plan);
  chk('diffPlan: a plan with no blog rows retires none and lists none as already retired; the three service rows are unchanged', diff.retire.length === 0 && diff.stillRetired.length === 0 && diff.unchanged.length === 3 && diff.counts.wouldRetire === 0, JSON.stringify(diff.counts), '');
  chk('Blog in the generator\'s types, "Scheduled" in the statuses, "Blog posts" label', G.TYPES.includes('blog') && G.TYPE_LABEL.blog === 'Blog' && G.STATUSES.includes('Scheduled') && G.BLOG_COLUMNS.length === 15, '', '');
  const csv = await store.csv(c.id, { includeRetired: true });
  const lines = csv.split('\r\n');
  const head = lines[0].split(',');
  const blogLine = lines.find(l => l.startsWith('Blog,How Much Does Landscaping Cost'));
  chk('CSV: the blog columns at the end; a blog row carries post type, query stack one per line, yes for the homepage cost guide, the publish date and the source; a service row leaves them blank', head.slice(-15).join(',') === 'Post type,Target query,Query stack,FAQ IDs,Primary link,Secondary links,Town,Homepage cost guide,Publish date,Link status,Last checked,Review due,Batch,Source,Source query' && /,cost_guide,landscaping cost southampton,"Q12\nQ14\nQ15","Q20\nQ21\nQ22",\/,,,yes,2026-11-09,Scheduled,,,onboarding,faq_research,$/.test(csv.replace(/\r\n/g, '\n').split('\n').find(l => l.startsWith('Blog,How Much Does Landscaping Cost') ) ? csv.replace(/\r\n/g, '\n').slice(csv.replace(/\r\n/g, '\n').indexOf('Blog,How Much Does Landscaping Cost')).split('\nBlog,')[0] : '') && lines.find(l => l.startsWith('Service,')).endsWith(',,,,,,,,,,,,,,,'), blogLine, '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
