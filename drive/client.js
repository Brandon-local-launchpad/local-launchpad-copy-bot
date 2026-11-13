'use strict';

// ── Google Drive, read only, through a service account ───────────────────────
// The key: GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON on Railway (the whole JSON file). A local run may use
// GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE, the path of the file, so the key never sits in the project.
// The scope is drive.readonly and the account is a Viewer on the folders, so nothing here can change
// Drive. The client's folders are on a shared drive, hence supportsAllDrives on every call.
//   folder(id)    the folder's name, or an error saying who to share it with
//   list(id)      everything directly inside a folder, every page of it
//   download(id)  a photo's bytes
//   thumbnail(id, size)  Google's thumbnail of it, or null
// The key and the tokens never go into an error message or a log.

const crypto = require('crypto');
const fs = require('fs');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/drive/v3/files';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FILE_FIELDS = 'id,name,mimeType,size,md5Checksum,modifiedTime,webViewLink,imageMediaMetadata(width,height)';

const configured = (env = process.env) => !!(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || env.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE);

function credentials(env = process.env) {
  let text = env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!text && env.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE) {
    try { text = fs.readFileSync(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE, 'utf8'); }
    catch (e) { throw Object.assign(new Error(`The Drive key file could not be read (${e.code || 'error'}).`), { status: 503 }); }
  }
  if (!text) throw Object.assign(new Error('Copybot cannot read Drive on this server yet: GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not set.'), { status: 503 });
  let c;
  try { c = JSON.parse(text); }
  catch (_) { throw Object.assign(new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not valid JSON: paste the whole key file as the value.'), { status: 503 }); }
  if (!c.client_email || !c.private_key) throw Object.assign(new Error('The Drive key has no client_email or private_key: use the JSON key file of the service account.'), { status: 503 });
  return c;
}

// The folder id from a Drive link, or the bare id. '' when there is none.
function parseFolderId(text) {
  const s = String(text == null ? '' : text).trim();
  if (!s) return '';
  const inPath = s.match(/\/folders\/([A-Za-z0-9_-]{10,})/);
  if (inPath) return inPath[1];
  const inQuery = s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (inQuery) return inQuery[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(s) ? s : '';
}

const b64url = v => Buffer.from(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function scrub(msg) {
  return String(msg == null ? '' : msg).replace(/ya29\.[A-Za-z0-9._-]+/g, '[token]').replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[key]').slice(0, 300);
}

function createDrive({ env = process.env, fetchImpl = (...a) => fetch(...a), now = () => Date.now() } = {}) {
  let token = null, expiresAt = 0;

  async function accessToken() {
    if (token && now() < expiresAt - 60000) return token;
    const c = credentials(env);
    const iat = Math.floor(now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: c.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }))}`;
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(c.private_key);
    const res = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(signature)}` }).toString() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) throw Object.assign(new Error(`Google refused the Drive key: ${scrub(data.error_description || data.error || res.status)}`), { status: 502 });
    token = data.access_token;
    expiresAt = now() + (Number(data.expires_in) || 3600) * 1000;
    return token;
  }

  async function get(url, what) {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    if (res.status === 404 || res.status === 403) {
      let email = 'the service account';
      try { email = credentials(env).client_email; } catch (_) { /* the message still says what to do */ }
      throw Object.assign(new Error(`Drive cannot see ${what}. Share it with ${email} as a Viewer, and check the link.`), { status: 400 });
    }
    throw Object.assign(new Error(`Drive said ${res.status}: ${scrub(data.error && data.error.message)}`), { status: 502 });
  }

  async function folder(id) {
    const q = new URLSearchParams({ fields: 'id,name,mimeType,trashed', supportsAllDrives: 'true' });
    return get(`${API}/${encodeURIComponent(id)}?${q}`, 'this folder');
  }

  async function list(id) {
    const out = [];
    let pageToken = '';
    do {
      const q = new URLSearchParams({ q: `'${String(id).replace(/'/g, "\\'")}' in parents and trashed = false`, fields: `nextPageToken,files(${FILE_FIELDS})`, pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
      if (pageToken) q.set('pageToken', pageToken);
      const data = await get(`${API}?${q}`, 'this folder');
      out.push(...(data.files || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return out;
  }

  // A photo's bytes. Downloading needs the same read only scope; nothing is made public.
  async function download(id) {
    const res = await fetchImpl(`${API}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (!res.ok) throw Object.assign(new Error(`Drive could not give this photo (${res.status}).`), { status: 502 });
    return Buffer.from(await res.arrayBuffer());
  }

  // Google's own thumbnail of a photo (8 Nov 2026), so a grid of them doesn't pull every full size file.
  // Null when Drive has none yet; the caller falls back to download().
  async function thumbnail(id, size = 400) {
    const q = new URLSearchParams({ fields: 'thumbnailLink', supportsAllDrives: 'true' });
    const meta = await get(`${API}/${encodeURIComponent(id)}?${q}`, 'this photo');
    if (!meta.thumbnailLink) return null;
    const link = meta.thumbnailLink.replace(/=sd+(-[a-z0-9-]+)?$/i, '') + `=s${Math.max(64, Math.min(1600, Number(size) || 400))}`;
    const res = await fetchImpl(link, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (!res.ok) return null;
    return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || 'image/jpeg' };
  }

  // A Google Doc's text (the photo notes file, when the Drive connector saved it as a Doc and not a plain file)
  async function exportText(id) {
    const res = await fetchImpl(`${API}/${encodeURIComponent(id)}/export?mimeType=text%2Fplain`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (!res.ok) throw Object.assign(new Error(`Drive could not give this file (${res.status}).`), { status: 502 });
    return Buffer.from(await res.arrayBuffer()).toString('utf8');
  }

  return { folder, list, download, exportText, thumbnail, accessToken };
}

module.exports = { createDrive, configured, credentials, parseFolderId, FOLDER_MIME, SCOPE };
