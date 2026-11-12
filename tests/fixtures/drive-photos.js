'use strict';
// Fixture: Drive photos on the Lead Snap tab (Stage 1 of the bundle.social build). A fake Drive and
// pg-mem, no network. The folder shape and counts are Edens Edge's real folder, read on 7 Nov 2026
// with tools/drive-photos-dry-run.js. The plumber's labels are the Lead Snap fixture's.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { newDb, DataType } = require('pg-mem');
const root = path.join(__dirname, '../..');
const C = require(path.join(root, 'drive/client.js'));
const P = require(path.join(root, 'drive/photos.js'));
const { viewFor } = require(path.join(root, 'drive/service.js'));
const { createAutopostStore } = require(path.join(root, 'leadsnap/autopost/store.js'));
const { mountLeadSnapApi } = require(path.join(root, 'leadsnap/autopost/routes.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Drive photos ===\n');

const FOLDER = C.FOLDER_MIME;
const POSTS = 'GBP Photos – Posts', DRIP = 'GBP Photos – Photo Drip';
const dir = (id, name) => ({ id, name, mimeType: FOLDER });
const jpg = (id, extra = {}) => ({ id, name: `${id}.jpeg`, mimeType: 'image/jpeg', size: '900000', md5Checksum: `m${id}`, modifiedTime: '2026-11-07T13:28:00.000Z', webViewLink: `https://drive.google.com/file/d/${id}/view`, imageMediaMetadata: { width: 1600, height: 1200 }, ...extra });
const jpgs = (prefix, n) => Array.from({ length: n }, (_, i) => jpg(`${prefix}${i}`));
// tree: folder id → { meta, kids }
function fakeDrive(tree) {
  return {
    calls: 0,
    async folder(id) { this.calls++; if (!tree[id]) throw Object.assign(new Error('Drive cannot see this folder.'), { status: 400 }); return tree[id].meta; },
    async list(id) { this.calls++; if (!tree[id]) throw Object.assign(new Error('Drive cannot see this folder.'), { status: 400 }); return tree[id].kids; },
  };
}
const ROOT_ID = 'edensRootFolder01';
const counts = { Brand: 5, 'Garden drainage': 6, Ponds: 3, 'Garden levelling': 2, Mulching: 2, Paths: 7, Patios: 6, Lawns: 3, Decking: 2, Pergolas: 14, Trees: 6, Fencing: 15 };
function edens() {
  const tree = {
    [ROOT_ID]: { meta: { id: ROOT_ID, name: 'Images from Edens Edge', mimeType: FOLDER }, kids: [dir('posts', POSTS), dir('drip', DRIP), dir('rej', 'GBP Photos – Rejected')] },
    posts: { kids: Object.keys(counts).map(l => dir(`l-${l}`, l)) },
    drip: { kids: jpgs('d', 49) },
    rej: { kids: jpgs('r', 3) },
  };
  for (const [l, n] of Object.entries(counts)) tree[`l-${l}`] = { kids: jpgs(`${l}-`, n) };
  return tree;
}

(async () => {
  // ── The link ──
  chk('a folder link gives its id', C.parseFolderId('https://drive.google.com/drive/folders/1aFXpF6vrqFqhKf8?usp=sharing') === '1aFXpF6vrqFqhKf8', '', '');
  chk('a shared drive link gives its id', C.parseFolderId('https://drive.google.com/drive/u/0/folders/1aFXpF6vrqFqhKf8') === '1aFXpF6vrqFqhKf8', '', '');
  chk('an open?id= link gives its id', C.parseFolderId('https://drive.google.com/open?id=1aFXpF6vrqFqhKf8') === '1aFXpF6vrqFqhKf8', '', '');
  chk('a bare id stands', C.parseFolderId(' 1aFXpF6vrqFqhKf8 ') === '1aFXpF6vrqFqhKf8', '', '');
  chk('anything else gives nothing', C.parseFolderId('not a link at all') === '' && C.parseFolderId('') === '' && C.parseFolderId('https://example.com/x') === '', '', '');

  // ── The client: the key, the token, the calls ──
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const env = { GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'reader@x.iam.gserviceaccount.com', private_key: privateKey }) };
  const seen = { token: 0, urls: [] };
  const ok = data => ({ ok: true, status: 200, json: async () => data });
  const fakeFetch = async (url, opts = {}) => {
    if (String(url).includes('oauth2')) {
      seen.token++;
      const a = new URLSearchParams(opts.body).get('assertion').split('.');
      seen.claims = JSON.parse(Buffer.from(a[1], 'base64url').toString());
      seen.signed = crypto.createVerify('RSA-SHA256').update(`${a[0]}.${a[1]}`).verify(publicKey, Buffer.from(a[2], 'base64url'));
      seen.grant = new URLSearchParams(opts.body).get('grant_type');
      return ok({ access_token: 'ya29.secret', expires_in: 3600 });
    }
    seen.urls.push(String(url)); seen.auth = opts.headers.Authorization;
    if (String(url).includes('denied')) return { ok: false, status: 404, json: async () => ({ error: { message: 'File not found' } }) };
    if (String(url).includes('broken')) return { ok: false, status: 500, json: async () => ({ error: { message: 'bad ya29.leaky thing' } }) };
    return String(url).includes('pageToken=p2') ? ok({ files: [{ id: 'b' }] }) : ok({ files: [{ id: 'a' }], nextPageToken: 'p2' });
  };
  const D = C.createDrive({ env, fetchImpl: fakeFetch });
  const listed = await D.list('abc');
  chk('every page of a folder is read', listed.map(f => f.id).join() === 'a,b', listed.map(f => f.id).join(), 'a,b');
  chk('the token is asked for once and reused', seen.token === 1, seen.token, 1);
  chk('the token request is signed with the key', seen.signed === true && seen.grant.includes('jwt-bearer'), seen.grant, '');
  chk('the scope is read only', seen.claims.scope === 'https://www.googleapis.com/auth/drive.readonly' && seen.claims.iss === 'reader@x.iam.gserviceaccount.com', seen.claims.scope, '');
  chk('shared drives are included', seen.urls.every(u => u.includes('supportsAllDrives=true') && u.includes('includeItemsFromAllDrives=true')), seen.urls[0], '');
  chk('trashed files are left out', decodeURIComponent(seen.urls[0].replace(/\+/g, ' ')).includes('trashed = false'), seen.urls[0], '');
  const denied = await D.folder('denied').catch(e => e);
  chk('no access says who to share with', /Share it with reader@x\.iam\.gserviceaccount\.com as a Viewer/.test(denied.message) && denied.status === 400, denied.message, '');
  const broken = await D.folder('broken').catch(e => e);
  chk('a token never reaches an error message', !/ya29\.leaky/.test(broken.message) && /\[token\]/.test(broken.message), broken.message, '');
  chk('the key is not in an error message', ![denied.message, broken.message].some(m => m.includes('PRIVATE KEY')), '', '');
  const none = await C.createDrive({ env: {}, fetchImpl: fakeFetch }).list('abc').catch(e => e);
  chk('no key says which variable is missing', /GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not set/.test(none.message), none.message, '');
  const notJson = await C.createDrive({ env: { GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: '{nope' }, fetchImpl: fakeFetch }).list('abc').catch(e => e);
  chk('a bad key says so without repeating it', /not valid JSON/.test(notJson.message) && !notJson.message.includes('nope'), notJson.message, '');

  // ── A photo's problem ──
  chk('a normal JPEG has none', P.problemOf(jpg('a')) === '', P.problemOf(jpg('a')), '');
  chk('a PNG and a GIF have none', P.problemOf(jpg('a', { mimeType: 'image/png' })) === '' && P.problemOf(jpg('a', { mimeType: 'image/gif' })) === '', '', '');
  chk('exactly 5 MB passes', P.problemOf(jpg('a', { size: String(5 * 1024 * 1024) })) === '', '', '');
  chk('over 5 MB is flagged', /over the 5 MB limit/.test(P.problemOf(jpg('a', { size: String(6 * 1024 * 1024) }))), P.problemOf(jpg('a', { size: String(6 * 1024 * 1024) })), '');
  chk('HEIC is flagged', /HEIC can't be published/.test(P.problemOf(jpg('a', { mimeType: 'image/heic' }))), P.problemOf(jpg('a', { mimeType: 'image/heic' })), '');
  chk('under 250 x 250 is flagged', /under the 250 x 250/.test(P.problemOf(jpg('a', { imageMediaMetadata: { width: 200, height: 900 } }))), '', '');
  chk('no dimensions from Drive is not a problem', P.problemOf(jpg('a', { imageMediaMetadata: undefined })) === '', '', '');

  // ── Reading the folders: Edens Edge's real shape ──
  const r = await P.readClientPhotos({ drive: fakeDrive(edens()), folderId: ROOT_ID });
  chk('all 120 photos are found', r.files.length === 120, r.files.length, 120);
  chk('12 post folders, Brand among them', r.folders.length === 12 && r.folders.some(f => f.label === 'Brand'), r.folders.length, 12);
  chk('Fencing holds 15', r.files.filter(f => f.label === 'Fencing').length === 15, '', 15);
  chk('Photo Drip holds 49', r.files.filter(f => f.kind === 'drip').length === 49, '', 49);
  chk('the Rejected folder is never read', !r.files.some(f => f.file_id.startsWith('r')) && r.problems.length === 0, r.problems.join(), '');
  chk('a row keeps what later stages need', (() => { const f = r.files[0]; return f.file_id && f.folder_id && f.mime_type === 'image/jpeg' && f.size_bytes === 900000 && f.width === 1600 && f.md5 && f.web_link; })(), JSON.stringify(r.files[0]), '');

  const hyphen = edens(); hyphen[ROOT_ID].kids[0] = dir('posts', 'GBP Photos - Posts');
  const hy = await P.readClientPhotos({ drive: fakeDrive(hyphen), folderId: ROOT_ID });
  chk('a hyphen for the dash is not read, and says why', !hy.posts_found && hy.files.every(f => f.kind === 'drip') && hy.problems.some(p => p.includes('"GBP Photos - Posts"') && p.includes(`exactly "${POSTS}"`)), hy.problems.join(), '');
  const noDrip = edens(); noDrip[ROOT_ID].kids = noDrip[ROOT_ID].kids.filter(k => k.id !== 'drip');
  const nd = await P.readClientPhotos({ drive: fakeDrive(noDrip), folderId: ROOT_ID });
  chk('no Photo Drip folder is a problem, the posts still read', !nd.drip_found && nd.posts_found && nd.files.length === 71 && nd.problems.some(p => p.includes(DRIP)), nd.problems.join(), '');
  const messy = edens();
  messy.posts.kids.push(jpg('loose1'), jpg('loose2'));
  messy['l-Ponds'].kids.push({ id: 'pdf', name: 'quote.pdf', mimeType: 'application/pdf' }, dir('sub', 'Old'));
  const mr = await P.readClientPhotos({ drive: fakeDrive(messy), folderId: ROOT_ID });
  chk('loose photos are not counted, and it says so', mr.files.length === 120 && mr.notes.some(n => /2 photos are loose/.test(n)), mr.notes.join(), '');
  chk('a non photo is left out, and it says so', mr.notes.some(n => /1 file is not a photo/.test(n)), mr.notes.join(), '');
  chk('a folder inside a service folder is reported', mr.notes.some(n => /"Ponds" has a folder inside it \("Old"\)/.test(n)), mr.notes.join(), '');
  const postsLink = edens(); postsLink.posts.meta = { id: 'posts', name: POSTS, mimeType: FOLDER };
  const pl = await P.readClientPhotos({ drive: fakeDrive(postsLink), folderId: 'posts' }).catch(e => e);
  chk('the Posts folder itself is refused, with what to use', /Use the folder that holds it/.test(pl.message), pl.message, '');
  const aFile = edens(); aFile.afile = { meta: { id: 'afile', name: 'x.jpeg', mimeType: 'image/jpeg' }, kids: [] };
  const af = await P.readClientPhotos({ drive: fakeDrive(aFile), folderId: 'afile' }).catch(e => e);
  chk('a file link is refused', /is a file, not a folder/.test(af.message), af.message, '');

  // ── The counts ──
  const groups = [{ key: 'fencing', folder: 'Fencing' }, { key: 'pergolas', folder: 'PERGOLAS' }, { key: 'turf', folder: 'Turf' }];
  const cf = P.countsFrom(groups, r);
  chk('a label gets its folder\'s count, whatever the case', cf.counts.fencing === 15 && cf.counts.pergolas === 14, JSON.stringify(cf.counts), '');
  chk('a label with no folder is 0', cf.counts.turf === 0, cf.counts.turf, 0);
  chk('Brand comes from its folder', cf.brand === 5, cf.brand, 5);
  chk('a carried count stands only where there is no folder', (() => { const c = P.countsFrom(groups, r, { turf: 4, fencing: 99 }).counts; return c.turf === 4 && c.fencing === 15; })(), '', '');
  const empty = edens(); empty['l-Ponds'].kids = [];
  chk('an empty folder is 0, not the carried count', P.countsFrom([{ key: 'ponds', folder: 'Ponds' }], await P.readClientPhotos({ drive: fakeDrive(empty), folderId: ROOT_ID }), { ponds: 9 }).counts.ponds === 0, '', 0);
  const mn = P.matchNotes(groups, r);
  chk('a label with no folder is named', mn.some(n => n.startsWith('No folder yet for: Turf')), mn.join(), '');
  chk('a folder matching no service is named, Brand is not', mn.some(n => n.includes('match no service') && n.includes('Ponds') && !n.includes('Brand')), mn.join(), '');

  // ── The routes on pg-mem ──
  const db = newDb();
  db.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  db.public.none(`CREATE TABLE clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, trade text);
    CREATE TABLE client_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid, asset_type text, filename text, content text, metadata jsonb, uploaded_at timestamptz DEFAULT now());`);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Hartley Plumbing', 'Plumbing & Heating') RETURNING id`);
  const cv = { company_name: 'Hartley Plumbing', phone: '01708 123456', live_domain: 'https://hartley.example', jobs_wanted: [], years_trading: '15', drive_photo_folder: '' };
  const services = [['Boiler repair', 900], ['Boiler installation', 800], ['Leak repair', 300], ['Drain unblocking', 100]];
  const makeI = (list = services) => ({ postCounties: { counties: ['Essex'], why: 'the fixture' }, name: cv.company_name, primary: 'Plumber', town: 'Romford', areas: ['Romford', 'Hornchurch'], serviceAreasPageMap: ['Romford', 'Hornchurch', 'Upminster', 'Gidea Park', 'Harold Wood', 'Collier Row', 'Dagenham', 'Brentwood'], serviceAreasFrom: 'the page map', siteUrl: cv.live_domain, primarySlug: '/plumber', locked: list.map(([service, copyPriority]) => ({ service, copyPriority })), years: 'none', accreditations: 'Gas Safe registered', proofPoints: ['same day visits available', 'fixed prices agreed before work starts'], validatorCtx: { cv } });
  let I = makeI();
  let tree = { rootFolder001: { meta: { id: 'rootFolder001', name: 'Images from Hartley', mimeType: FOLDER }, kids: [dir('p', POSTS), dir('dr', DRIP)] }, p: { kids: [dir('b', 'Boilers'), dir('l', 'Leak repair'), dir('br', 'Brand')] }, b: { kids: jpgs('b', 8) }, l: { kids: jpgs('l', 1) }, br: { kids: [...jpgs('br', 3), jpg('big', { size: String(9 * 1024 * 1024) })] }, dr: { kids: jpgs('dr', 6) } };
  let drive = fakeDrive(tree);
  let driveOff = null, loadFail = null;
  const sent = [];
  const writeCv = async id => { await pool.query(`DELETE FROM client_assets WHERE client_id=$1 AND asset_type='client_values'`, [id]); await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [id, JSON.stringify(cv)]); };
  await writeCv(c.id);
  const app = express();
  app.use(express.json());
  const quiet = { log() {}, error() {} };
  mountLeadSnapApi(app, { pool, log: quiet, saveClientValue: async (id, k, v) => { cv[k] = v; await writeCv(id); }, getDrive: () => { if (driveOff) throw driveOff; return drive; }, callModel: async a => { sent.push(a.message); return { text: 'not a sheet', usage: {} }; }, loadInputs: async () => { if (loadFail) throw loadFail; return { I, trade: 'Plumbing & Heating', answers: { tone: 'Friendly' } }; } });
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const req = (method, p, body) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const q = http.request({ host: '127.0.0.1', port: srv.address().port, method, path: p, agent: false, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(t) })); });
    q.on('error', reject); if (data) q.write(data); q.end();
  });
  const api = `/api/clients/${c.id}/lead-snap`;
  const group = (v, key) => v.intake.groups.find(g => g.key === key);
  const typed = { counts: { boilers: 2, 'leak-repair': 4, 'drain-unblocking': 3 }, brand: 1 };

  let v = (await req('GET', api)).json();
  chk('no folder: Drive is off and counts are asked for', v.drive && v.drive.active === false && v.drive.folder === '' && v.intake.missing.some(m => /Photo counts/.test(m)), JSON.stringify(v.drive), '');
  v = (await req('PUT', `${api}/intake`, typed)).json();
  chk('no folder: the typed counts work as before', group(v, 'boilers').photos === 2 && v.intake.brand === 1 && v.intake.photosEntered, group(v, 'boilers').photos, 2);
  chk('a bad link is refused and not saved', (await req('PUT', `${api}/drive-folder`, { folder: 'https://example.com/nope' })).status === 400 && cv.drive_photo_folder === '', cv.drive_photo_folder, '');
  chk('reading with no folder saved is refused', (await req('POST', `${api}/drive-read`)).status === 400, '', 400);

  const link = 'https://drive.google.com/drive/folders/rootFolder001';
  v = (await req('PUT', `${api}/drive-folder`, { folder: 'https://drive.google.com/drive/folders/rootFolder001?usp=sharing' })).json();
  chk('saving the folder puts it on the client record', cv.drive_photo_folder.includes('/folders/rootFolder001'), cv.drive_photo_folder, link);
  chk('saving reads it: Drive is on', v.drive.active === true && v.drive.total === 19, JSON.stringify({ a: v.drive.active, t: v.drive.total, e: v.drive.error }), 19);
  chk('the counts are Drive\'s', group(v, 'boilers').photos === 8 && group(v, 'leak-repair').photos === 1 && v.intake.brand === 4, JSON.stringify(v.intake.groups.map(g => g.photos)), '');
  chk('a label with no folder reads 0, not its typed count', group(v, 'drain-unblocking').photos === 0, group(v, 'drain-unblocking').photos, 0);
  chk('the plan follows Drive\'s counts', v.plan.prompts.some(p => p.folder.endsWith('Boilers') && p.photos === 8), JSON.stringify(v.plan.prompts[0]), '');
  chk('the file list has each folder', v.drive.folders.map(f => `${f.label}:${f.files.length}`).join() === 'Boilers:8,Leak repair:1,Brand:4', v.drive.folders.map(f => `${f.label}:${f.files.length}`).join(), '');
  chk('Photo Drip is listed', v.drive.drip.found && v.drive.drip.files.length === 6, v.drive.drip.files.length, 6);
  chk('a photo over the limit shows its problem', v.drive.folders.find(f => f.label === 'Brand').files.some(f => f.name === 'big.jpeg' && /over the 5 MB/.test(f.problem)) && v.drive.notes.some(n => /1 photo can't go out/.test(n)), v.drive.notes.join(), '');
  chk('the folder with no photos yet is named', v.drive.notes.some(n => n.startsWith('No folder yet for: Drain unblocking')), v.drive.notes.join(), '');
  const rowCount = async t => (await pool.query(`SELECT count(*)::int AS n FROM ${t} WHERE client_id=$1`, [c.id])).rows[0].n;
  chk('the photos are in the new table', await rowCount('drive_photos') === 19, await rowCount('drive_photos'), 19);

  v = (await req('PUT', `${api}/intake`, { offer: 'Free boiler quote' })).json();
  chk('saving the other fields keeps Drive\'s counts on show', group(v, 'boilers').photos === 8 && v.hand.offer === 'Free boiler quote', group(v, 'boilers').photos, 8);
  const handStore = createAutopostStore(pool);
  const handNow = await handStore.hand(c.id);
  chk('the typed counts stay saved underneath', handNow.counts.boilers === 2 && handNow.brand === 1, JSON.stringify(handNow), '');

  tree.b.kids = jpgs('b', 11);
  v = (await req('POST', `${api}/drive-read`)).json();
  chk('reading again picks up new photos', group(v, 'boilers').photos === 11 && v.drive.total === 22, group(v, 'boilers').photos, 11);
  tree.b.kids = jpgs('b', 5);
  v = (await req('POST', `${api}/drive-read`)).json();
  chk('a photo gone from Drive goes from the list', await rowCount('drive_photos') === 16 && group(v, 'boilers').photos === 5, await rowCount('drive_photos'), 16);

  const before = sent.length;
  await req('POST', `${api}/generate`, {});
  chk('Generate writes from Drive\'s counts', sent.length > before && sent[before].includes('Photo counts: Boilers 5, Leak repair 1, Drain unblocking 0; Brand 4'), sent[before] && sent[before].match(/Photo counts:.*/)[0], '');

  driveOff = Object.assign(new Error('Drive cannot see this folder. Share it with reader@x as a Viewer, and check the link.'), { status: 400 });
  v = (await req('POST', `${api}/drive-read`)).json();
  chk('a failed read shows its error', /Drive cannot see this folder/.test(v.drive.error), v.drive.error, '');
  chk('a failed read keeps the last good list and counts', v.drive.active && v.drive.total === 16 && group(v, 'boilers').photos === 5, v.drive.total, 16);
  driveOff = null;
  v = (await req('POST', `${api}/drive-read`)).json();
  chk('the next good read clears the error', v.drive.error === null && v.drive.active, v.drive.error, null);

  // A rename on Generate: the old folder's count follows it until it is renamed in Drive
  await handStore.save(c.id, { sheet: 'saved', generated_at: 'x', output: { prompts: [] }, intake: { groups: [{ key: 'boilers', label: 'Boilers', folder: 'Boilers', services: ['Boiler repair', 'Boiler installation'], volume: 1700 }, { key: 'leak-repair', label: 'Leak repair', folder: 'Leak repair', services: ['Leak repair'], volume: 300 }, { key: 'drain-unblocking', label: 'Drain unblocking', folder: 'Drain unblocking', services: ['Drain unblocking'], volume: 100 }] } });
  I = makeI([['Boiler repair', 900], ['Boiler installation', 800], ['Leak detection', 300], ['Leak repair', 250], ['Drain unblocking', 100]]);
  v = (await req('GET', api)).json();
  chk('locked names still read their Drive folders', group(v, 'boilers').photos === 5 && group(v, 'leak-repair').photos === 1, JSON.stringify(v.intake.groups.map(g => [g.key, g.photos])), '');
  const refused = await req('POST', `${api}/generate`, {});
  chk('a rename still asks first', refused.status === 409, refused.status, 409);
  const n2 = sent.length;
  await req('POST', `${api}/generate`, { accept_renames: true });
  chk('a renamed folder keeps its old folder\'s count', sent[n2] && /Photo counts:[^\n]*Leaks 1/.test(sent[n2]), sent[n2] && sent[n2].match(/Photo counts:.*/)[0], 'Leaks 1');
  I = makeI();
  await pool.query(`DELETE FROM client_assets WHERE client_id=$1 AND asset_type='leadsnap_autopost'`, [c.id]);

  // A different folder: the old read does not count for it
  cv.drive_photo_folder = 'https://drive.google.com/drive/folders/someOtherFolder';
  await writeCv(c.id);
  v = (await req('GET', api)).json();
  chk('after the link changes the old read is not used', v.drive.active === false && v.drive.stale_folder === true && v.drive.total === 0 && group(v, 'boilers').photos === 2, JSON.stringify({ a: v.drive.active, s: v.drive.stale_folder, b: group(v, 'boilers').photos }), '');
  // Cleared: back to the typed counts
  v = (await req('PUT', `${api}/drive-folder`, { folder: '' })).json();
  chk('clearing the folder goes back to the typed counts', v.drive.active === false && group(v, 'boilers').photos === 2 && v.intake.brand === 1, group(v, 'boilers').photos, 2);
  chk('the tab still opens with a server with no key', viewFor({ read: null, folderText: '', groups: [], env: {} }).configured === false, '', false);
  // No page map yet: the rest of the tab says so, the Drive card still works
  loadFail = Object.assign(new Error('GBP output needs a v3 page map'), { status: 400 });
  v = (await req('PUT', `${api}/drive-folder`, { folder: 'https://drive.google.com/drive/folders/rootFolder001' })).json();
  chk('no page map: the tab reports it, and the folder still saves and reads', /v3 page map/.test(v.error) && v.intake === null && v.drive && v.drive.total === 16 && v.drive.folders.length === 3, JSON.stringify({ e: v.error, t: v.drive && v.drive.total }), '');
  v = (await req('POST', `${api}/drive-read`)).json();
  chk('no page map: Read Drive still works', v.drive && v.drive.error === null && v.drive.total === 16, v.drive && v.drive.error, null);
  loadFail = null;
  // Someone typing a bad link on the client record: the read says so, it does not throw
  cv.drive_photo_folder = 'nonsense link';
  await writeCv(c.id);
  v = (await req('POST', `${api}/drive-read`)).json();
  chk('a bad link from the record shows on the card', /not a Drive folder link/.test(v.drive.error) && v.drive.active === false, v.drive.error, '');

  await new Promise(r => srv.close(r));
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
