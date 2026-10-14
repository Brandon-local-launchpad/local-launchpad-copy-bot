'use strict';
// Fixture: WordPress push service (slice 4) with its Postgres tables in pg-mem (an
// in-memory Postgres, dev dependency) and the fake WordPress site. Connection
// storage (encrypted password, never returned), the site test, the claims review
// saved onto a record, dry run, push (confirm, review tick, every claim accepted),
// the push log, and rollback.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureWpTables } = require(path.join(root, 'wp/db-store.js'));
const { createWpService } = require(path.join(root, 'wp/service.js'));
const G = require(path.join(root, 'v20-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const throwsMsg = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
console.log('\n=== FIXTURE: WordPress push service (pg-mem + fake WordPress) ===\n');

(async () => {
  // Postgres in memory, with the tables the service needs
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL);
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id), asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureWpTables(pool);
  const clientId = (await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper Gardener') RETURNING id`)).rows[0].id;

  // A record as generation saves it: client values, and a CLAIMS result with one finding left
  const old = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
  const rec = { ...old, meta: { ...old.meta, client_values: G.clientValueMap({ ...E.ethanValues(), phone: '023 0000 0000' }, null) } };
  const left = { field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: 'test' };
  const withClaims = { ...rec, CLAIMS: { for: rec.meta.generated_at, status: 'needs acceptance', first_review: 2, findings: [left], rounds: [] } };
  const insert = async r => (await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'v20_page_record', 'homepage_v20.json', $2) RETURNING id`, [clientId, JSON.stringify(r)])).rows[0].id;
  const noClaimsId = await insert(rec);
  const claimsId = await insert(withClaims);

  const key = crypto.randomBytes(32).toString('hex');
  const loadRecord = async (cid, id) => {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='v20_page_record' AND id=$2`, [cid, id]);
    if (!rows.length) throw new Error('No v20 homepage has been generated for this client yet.');
    const record = JSON.parse(rows[0].content);
    return { record, id: rows[0].id, values: record.meta.client_values };
  };
  const saveRecordClaims = async (cid, id, CLAIMS) => {
    const { rows } = await pool.query(`SELECT content FROM client_assets WHERE id=$1`, [id]);
    await pool.query(`UPDATE client_assets SET content=$1 WHERE id=$2`, [JSON.stringify({ ...JSON.parse(rows[0].content), CLAIMS }), id]);
  };
  const svc = createWpService({ pool, loadRecord, saveRecordClaims, secretKey: key });

  const fake = createFakeWp({ pages: [seedHomepage()] });
  const { server, url } = await listen(fake.app);
  try {
    // ── Connection ──
    chk('No connection yet', (await svc.connection(clientId)) === null, '', 'null');
    chk('http address refused', /https/.test(await throwsMsg(() => svc.saveConnection(clientId, { url: 'http://example.com', user: 'copybot', appPassword: 'x' }))), '', 'refused');
    chk('Missing user refused', /username/.test(await throwsMsg(() => svc.saveConnection(clientId, { url, appPassword: 'x' }))), '', 'refused');
    chk('Missing password on first save refused', /Application Password/.test(await throwsMsg(() => svc.saveConnection(clientId, { url, user: 'copybot' }))), '', 'refused');
    chk('Unknown SEO plugin refused', /SEO plugin/.test(await throwsMsg(() => svc.saveConnection(clientId, { url, user: 'copybot', appPassword: 'x', seo: 'aioseo' }))), '', 'refused');
    const noKey = createWpService({ pool, loadRecord, saveRecordClaims, secretKey: '' });
    chk('No COPYBOT_SECRET_KEY: refuses to store a password', /COPYBOT_SECRET_KEY/.test(await throwsMsg(() => noKey.saveConnection(clientId, { url, user: 'copybot', appPassword: 'test-app-password-not-real' }))), '', 'refused');
    const saved = await svc.saveConnection(clientId, { url: url + '/some/path', user: 'copybot', appPassword: 'test-app-password-not-real', seo: 'rankmath' });
    chk('Saved: origin only, password never returned', saved.url === url && saved.hasPassword === true && !('appPassword' in saved) && !JSON.stringify(saved).includes('test-app-password'), JSON.stringify(saved), 'no password');
    const row = (await pool.query(`SELECT app_password_enc FROM wp_connections WHERE client_id=$1`, [clientId])).rows[0];
    chk('Stored encrypted, not in plain text', /^v1:/.test(row.app_password_enc) && !row.app_password_enc.includes('test-app-password'), row.app_password_enc.slice(0, 20), 'v1:…');
    await svc.saveConnection(clientId, { url, user: 'copybot', seo: 'rankmath' });
    chk('Saving again without a password keeps the stored one', (await svc.connection(clientId)).hasPassword === true && (await pool.query(`SELECT app_password_enc FROM wp_connections WHERE client_id=$1`, [clientId])).rows[0].app_password_enc === row.app_password_enc, '', 'kept');

    // ── Test, claims review, dry run ──
    const t = await svc.test(clientId);
    chk('Connection test reports the plugin', t.status && t.status.plugin === '0.1.0' && t.status.seo === 'rankmath', JSON.stringify(t), 'plugin 0.1.0');
    const reviewed = await svc.reviewClaims(clientId, { recordId: noClaimsId }, async () => ({ text: JSON.stringify({ findings: [{ field: 'home_final_cta_body', quote: rec.home_final_cta_body.slice(0, 30), why: 'test' }] }) }));
    const stored = JSON.parse((await pool.query(`SELECT content FROM client_assets WHERE id=$1`, [noClaimsId])).rows[0].content);
    chk('Claims review on a record without one: saved onto the record', reviewed.status === 'needs acceptance' && stored.CLAIMS && stored.CLAIMS.findings.length === 1 && stored.CLAIMS.for === rec.meta.generated_at, JSON.stringify(stored.CLAIMS).slice(0, 120), 'saved');
    const d = await svc.dryRun(clientId, { recordId: claimsId, reviewed: true });
    chk('Dry run through the service: pushable checks pass, no payload sent to the browser, nothing written', d.pushable && d.payload === undefined && fake.state.writes === 0 && d.claims.findings.length === 1, JSON.stringify({ pushable: d.pushable, refusals: d.refusals }), 'ok');

    // ── Push ──
    chk('Push without confirm: error', /confirming/.test(await throwsMsg(() => svc.push(clientId, { recordId: claimsId, reviewed: true }))), '', 'error');
    let p = await svc.push(clientId, { recordId: claimsId, reviewed: true, confirm: true });
    chk('Push with a claim not accepted: refused, nothing written', !p.ok && p.refusals.some(x => /claims review found 1/.test(x)) && fake.state.writes === 0, JSON.stringify(p.refusals), 'refused');
    p = await svc.push(clientId, { recordId: claimsId, reviewed: true, confirm: true, acceptedClaims: ['something else'] });
    chk('Push accepting a different quote: still refused', !p.ok && fake.state.writes === 0, '', 'refused');
    p = await svc.push(clientId, { recordId: claimsId, reviewed: false, confirm: true, acceptedClaims: [left.quote] });
    chk('Push without the reviewed tick: refused', !p.ok && p.refusals.some(x => /FLAG/.test(x)) && fake.state.writes === 0, '', 'refused');
    p = await svc.push(clientId, { recordId: claimsId, reviewed: true, confirm: true, acceptedClaims: [left.quote] });
    chk('Push with the tick and the claim accepted: pushed and verified', p.ok && p.result === 'pushed' && fake.state.writes === 2 && fake.state.pages.get(7).acf.home_hero_h1 === 'Landscaper Southampton', JSON.stringify({ result: p.result, refusals: p.refusals }), 'pushed');
    const log = await svc.log(clientId);
    chk('Push log in the database, newest first: pushed, then 3 refusals', log.length === 4 && log[0].result === 'pushed' && log[0].snapshotId === p.snapshotId && log.slice(1).every(l => l.result === 'refused'), JSON.stringify(log.map(l => l.result)), 'pushed, refused x3');

    // ── Rollback ──
    chk('Rollback without confirm: error', /confirming/.test(await throwsMsg(() => svc.rollback(clientId, { snapshotId: p.snapshotId }))), '', 'error');
    const rb = await svc.rollback(clientId, { snapshotId: p.snapshotId, confirm: true });
    chk('Rollback: restored from the database snapshot', rb.ok && fake.state.pages.get(7).acf.home_hero_h1 === 'Gardener Southampton | Edens Edge', JSON.stringify(rb), 'restored');
    chk('Rollback of another client\'s or a made-up snapshot: refused', !(await svc.rollback(clientId, { snapshotId: crypto.randomUUID(), confirm: true })).ok, '', 'refused');
  } finally { await new Promise(res => server.close(res)); }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
