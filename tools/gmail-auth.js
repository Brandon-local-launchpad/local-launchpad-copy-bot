#!/usr/bin/env node
'use strict';

// ── One-off: the Gmail refresh token for the listings inbox ──────────────────────
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node tools/gmail-auth.js
// (or put the two in .env). Prints a Google sign-in link; sign in as
// listings@locallaunchpad.co.uk, allow the gmail.modify scope, and the browser comes back
// to http://localhost:53682/ with a code this script swaps for a refresh token. Put the
// token on Railway as GMAIL_REFRESH_TOKEN. The steps around it: docs/citations/Gmail_OAuth_Setup.md.
// Nothing is stored here; the token is printed once.

const fs = require('fs');
const path = require('path');
const http = require('http');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { SCOPE, TOKEN_URL } = require(path.join(root, 'citations/inbox/gmail.js'));
const id = process.env.GMAIL_CLIENT_ID, secret = process.env.GMAIL_CLIENT_SECRET;
if (!id || !secret) { console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (the OAuth client from Google Cloud) in .env or the environment first.'); process.exit(1); }
const PORT = 53682;
const redirect = `http://localhost:${PORT}/`;
const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', login_hint: 'listings@locallaunchpad.co.uk' })}`;

const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  const code = u.searchParams.get('code');
  if (!code) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('No code in the request.'); return; }
  try {
    const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }).toString() });
    const j = await r.json();
    if (!j.refresh_token) throw new Error(`No refresh token in the reply (${j.error_description || j.error || r.status}). Remove the app from the account's third party access and try again, so Google asks for consent afresh.`);
    res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('Done. Go back to the terminal; you can close this tab.');
    console.log('\nRefresh token (put it on Railway as GMAIL_REFRESH_TOKEN, then restart the service):\n');
    console.log(j.refresh_token);
    console.log(`\nScope granted: ${j.scope}`);
  } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(e.message); console.error(e.message); }
  setTimeout(() => process.exit(0), 200);
});
srv.listen(PORT, '127.0.0.1', () => {
  console.log('1. Open this link in a browser where you can sign in as listings@locallaunchpad.co.uk:\n');
  console.log(url);
  console.log('\n2. Allow the "read, compose, send, and permanently delete" wording Google shows for gmail.modify (Copybot only reads and marks read).');
  console.log(`3. The browser returns to ${redirect} and the token prints here.`);
});
