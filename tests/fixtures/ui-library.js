'use strict';
// Fixture: the redesigned UI's library, settings, model log and intake modules
// (ui/library.js, ui/model-log.js, ui/intake.js) on pg-mem: the niche list and one niche,
// the prompts list, the settings shape (keys never leak values), the model log's cost and
// monthly spend, the website scrape, the Maps link parser, the identity merge (a Fillout
// match on email or phone) and the client create (sources on every value).
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables } = require(path.join(root, 'fillout/service.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const L = require(path.join(root, 'ui/library.js'));
const M = require(path.join(root, 'ui/model-log.js'));
const I = require(path.join(root, 'ui/intake.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the UI library, settings, model log and intake ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  await ensureFilloutTables(pool); await ensureAllocationColumns(pool); await M.ensureModelLogTable(pool);
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to TEXT`);

  // ── Niche library ──
  const niches = await L.nicheList({ pool });
  const land = niches.find(n => n.key === 'landscapers');
  chk('Niche list: every niche, the landscaper has its entry, services library and calibration pack', niches.length >= 20 && land && land.has.entry && land.has.services && land.has.pack && land.ready, JSON.stringify(land), '');
  const detail = await L.nicheDetail({ pool, key: 'landscapers' });
  chk('Niche detail: the entry (trade, words), the briefs by page type, services rows, the pack', detail.entry && detail.entry.trade && detail.briefs.category_page_blocks.length && detail.services.length > 10 && detail.pack.exists, JSON.stringify({ trade: detail.entry && detail.entry.trade, briefs: detail.briefs, services: detail.services.length, pack: detail.pack }), '');
  let threw = null; try { await L.nicheDetail({ pool, key: 'no-such' }); } catch (e) { threw = e.status; }
  chk('An unknown niche is 404', threw === 404, threw, 404);

  // ── Prompts ──
  const prompts = await L.promptList();
  const home = prompts.find(p => /Homepage_Copywriting_Prompt_CORE/.test(p.name));
  chk('Prompts: the CORE number is read off the file name, with a date and a word count', home && home.core === 20 && home.modified && home.words > 100, JSON.stringify(home), '');
  chk('A prompt reads back; a path outside prompts/ is refused', L.promptText(home.name).text.length > 100 && (() => { try { L.promptText('../server.js'); return false; } catch (e) { return e.status === 404; } })(), '', '');

  // ── Settings ──
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-test-not-real';
  const log = M.createModelLog(pool, { log: { error() {} } });
  const st = await L.settings({ pool, modelLog: log });
  chk('Settings: keys say set or not and never carry a value', st.keys.find(k => k.key === 'ANTHROPIC_API_KEY').set === true && st.keys.every(k => !('value' in k) && !JSON.stringify(k).includes('sk-test')), JSON.stringify(st.keys[0]), '');
  chk('Settings: model routing names the homepage, review, claims, allocation and GBP models', st.routing.length >= 10 && st.routing.every(r => r.model) && st.routing.find(r => /Quality review/.test(r.call)).model === 'claude-opus-5-5', JSON.stringify(st.routing.map(r => [r.call, r.model])), '');

  // ── Model log ──
  const usage = { input_tokens: 10000, output_tokens: 2000, cache_read_input_tokens: 50000, cache_creation_input_tokens: 0 };
  const pence = M.costPence('claude-sonnet-5-5', usage);
  chk('Cost: Sonnet 5.5, 10k in, 2k out, 50k cached read = (0.03 + 0.03 + 0.015) USD = 5.85p', pence === 5.85, pence, 5.85);
  await log.record({ model: 'claude-sonnet-5-5', usage, call_type: 'category pages', page_type: 'category', page_key: '/landscaper' });
  log.tagged('homepage', { page_type: 'homepage' })('claude-opus-5-5', { input_tokens: 1000, output_tokens: 500 });
  await new Promise(r => setTimeout(r, 50));
  const sp = await log.spend();
  chk('Spend this month adds the two calls and groups by call type and model', sp.calls === 2 && sp.by.length === 2 && sp.total_pence === Math.round((5.85 + M.costPence('claude-opus-5-5', { input_tokens: 1000, output_tokens: 500 })) * 100) / 100 && sp.last.length === 2, JSON.stringify(sp), '');

  // ── Intake: the scrape, the Maps link, the merge, the create ──
  const html = `<html><head><title>Edens Edge Landscaping | Southampton</title><meta name="description" content="Garden design in Southampton"><link rel="icon" href="/fav.png"></head><body><img src="/img/logo-main.png"><p>Call 023 8012 3456 or email hello@edensedge.co.uk. SO16 7AB.</p><a href="https://www.facebook.com/edensedge">fb</a></body></html>`;
  const sc = I.scrape(html, 'https://www.edensedge.co.uk/');
  chk('Scrape: title, description, phone, email, postcode, social link, the logo image', sc.title.startsWith('Edens Edge') && sc.phones[0] === '023 8012 3456' && sc.emails[0] === 'hello@edensedge.co.uk' && sc.postcodes[0] === 'SO16 7AB' && sc.socials[0] === 'https://www.facebook.com/edensedge' && sc.logo === 'https://www.edensedge.co.uk/img/logo-main.png', JSON.stringify(sc), '');
  const read = await I.readWebsite({ url: 'edensedge.co.uk', fetchFn: async () => ({ ok: true, url: 'https://www.edensedge.co.uk/', text: async () => html }), callModel: async () => ({ text: '```json\n{"name":"Edens Edge Landscaping","town":"Southampton","phone":"","primary_category":"Landscaper","services":["Garden design"],"towns":["Romsey"]}\n```' }) });
  chk('Read website: the model\'s answer wins where it has one, the scrape fills the rest', read.name === 'Edens Edge Landscaping' && read.town === 'Southampton' && read.phone === '023 8012 3456' && read.email === 'hello@edensedge.co.uk' && read.services[0] === 'Garden design' && read.logo.endsWith('logo-main.png') && !read.modelError, JSON.stringify(read), '');
  const bad = await I.readWebsite({ url: 'edensedge.co.uk', fetchFn: async () => ({ ok: true, url: 'https://x/', text: async () => html }), callModel: async () => { throw new Error('no model'); } });
  chk('A failed model read falls back to the scrape (the title before the separator) and says so', bad.modelError === 'no model' && bad.name === 'Edens Edge Landscaping' && bad.phone === '023 8012 3456', JSON.stringify([bad.modelError, bad.name]), '');
  chk('Maps link: a place id, a /maps/place/ name, a q= query', I.placeFromLink('https://www.google.com/maps/place/?q=place_id:ChIJabc123456789').placeId === 'ChIJabc123456789' && I.placeFromLink('https://www.google.com/maps/place/Edens+Edge+Landscaping/@50.9,-1.4,17z').query === 'Edens Edge Landscaping' && I.placeFromLink('https://maps.google.com/?q=Edens+Edge').query === 'Edens Edge', '', '');

  // A Fillout client to match on email, another on phone
  const { rows: [fc] } = await pool.query(`INSERT INTO clients (name, trade, source, niche_key) VALUES ('Brandons Plumbing', 'Plumbing & Heating', 'fillout', 'plumbing-heating') RETURNING id`);
  await pool.query(`INSERT INTO fillout_submissions (submission_id, raw_payload, status, client_id, business_email_norm) VALUES ('s1', '{}', 'processed', $1, 'brandon@gmail.com')`, [fc.id]);
  const { rows: [pc] } = await pool.query(`INSERT INTO clients (name, trade, source, niche_key) VALUES ('Phone Roofing', 'Roofers', 'fillout', 'roofers') RETURNING id`);
  await pool.query(`INSERT INTO client_fields (client_id, field_key, value, status, source) VALUES ($1, 'business_phone', $2, 'filled', 'form')`, [pc.id, JSON.stringify('+44 7700 900123')]);
  const m1 = await I.mergeIdentity({ pool, website: read, place: { place_id: 'p1', name: 'Edens Edge Landscaping Ltd', address: '1 Garden Rd, Southampton SO16 7AB', phone: '02380 123456', rating: 4.9, review_count: 31, primary_type: 'landscaper' }, email: 'Brandon@Gmail.com' });
  chk('Merge: GBP wins for name, address, phone; the typed email; a source on each; matched the Fillout client by email', m1.identity.name.value === 'Edens Edge Landscaping Ltd' && m1.identity.name.source === 'gbp' && m1.identity.phone.value === '02380 123456' && m1.identity.email.value === 'brandon@gmail.com' && m1.identity.email.source === 'hand' && m1.matched && m1.matched.id === fc.id && m1.matched.by === 'email' && m1.niche_key === 'plumbing-heating', JSON.stringify({ name: m1.identity.name, phone: m1.identity.phone, matched: m1.matched, niche: m1.niche_key }), '');
  const m2 = await I.mergeIdentity({ pool, website: { ...read, phone: '07700 900123', email: '' }, place: null, email: '' });
  chk('Merge: a phone match finds the Fillout client too; no GBP → the website\'s values', m2.matched && m2.matched.id === pc.id && m2.matched.by === 'phone' && m2.identity.name.source === 'website', JSON.stringify(m2.matched), '');
  const m3 = await I.mergeIdentity({ pool, website: { ...read, phone: '', email: 'new@example.com' }, place: null });
  chk('Merge: no match → a new client; the niche is suggested from the category', !m3.matched && m3.niche_key === 'landscapers', JSON.stringify([m3.matched, m3.niche_key]), '');

  const made = await I.createClient({ pool, identity: Object.fromEntries(Object.entries(m3.identity).map(([k, v]) => [k, v && typeof v === 'object' && 'value' in v ? v.value : v])), sources: Object.fromEntries(Object.entries(m3.identity).filter(([, v]) => v && v.source).map(([k, v]) => [k, v.source])), nicheKey: 'landscapers', businessType: 'B', existingSite: true, filloutFormUrl: 'https://forms.fillout.com/t/abc' });
  const { rows: [c] } = await pool.query(`SELECT * FROM clients WHERE id = $1`, [made.id]);
  const cv = JSON.parse((await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values'`, [made.id])).rows[0].content);
  chk('Create: a new client allocated to the niche, source wizard, the values seeded with sources, the Fillout link with the email', c.niche_key === 'landscapers' && c.source === 'wizard' && cv.company_name === 'Edens Edge Landscaping' && cv._sources.company_name === 'website' && !cv.phone && cv.business_type === 'B' && cv.primary_category === 'Landscaper' && cv._sources.primary_category === 'website' && made.fillout_link === 'https://forms.fillout.com/t/abc?email=new%40example.com' && !made.merged, JSON.stringify({ c: [c.niche_key, c.source], cv: [cv.company_name, cv._sources, cv.business_type], link: made.fillout_link }), '');
  const merged = await I.createClient({ pool, identity: { name: 'Brandons Plumbing Ltd', phone: '0117 000 0000', email: 'brandon@gmail.com' }, sources: { phone: 'gbp' }, nicheKey: 'plumbing-heating', matchedClientId: fc.id });
  const n = (await pool.query(`SELECT COUNT(*)::int AS n FROM clients`)).rows[0].n;
  const cv2 = JSON.parse((await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values'`, [fc.id])).rows[0].content);
  chk('Create with a match: the existing client is updated, never a second one; the values seeded there', merged.id === fc.id && merged.merged && n === 3 && cv2.phone === '0117 000 0000' && cv2._sources.phone === 'gbp', JSON.stringify([merged, n, cv2.phone]), '');

  // ── Routes ──
  const app = express(); app.use(express.json());
  L.mountLibraryApi(app, { pool, modelLog: log, leadsnap: null });
  I.mountIntakeApi(app, { pool, callModel: null, placesSearch: null, placeDetails: null, fetchFn: async () => ({ ok: true, url: 'https://www.edensedge.co.uk/', text: async () => html }) });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const j = await (await fetch(`${base}/api/settings`)).json();
    chk('GET /api/settings returns keys, routing, spend, users', j.keys && j.routing && j.spend && Array.isArray(j.users), Object.keys(j).join(','), '');
    const p = await fetch(`${base}/api/intake/places?q=x`);
    chk('GET /api/intake/places without a key is 503 with a plain message', p.status === 503 && /GOOGLE_PLACES_API_KEY/.test((await p.json()).error), p.status, 503);
    const w = await (await fetch(`${base}/api/intake/read-website`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'edensedge.co.uk' }) })).json();
    chk('POST /api/intake/read-website with no model gives the scrape', w.name === 'Edens Edge Landscaping' && w.phone === '023 8012 3456', JSON.stringify([w.name, w.phone]), '');
    const nl = await (await fetch(`${base}/api/niche-library/landscapers`)).json();
    chk('GET /api/niche-library/:key', nl.label === 'Landscapers/Gardeners' && nl.services.length > 10, nl.label, 'Landscapers/Gardeners');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  setTimeout(() => process.exit(fail ? 1 : 0), 100);
})().catch(e => { console.error(e); process.exit(1); });
