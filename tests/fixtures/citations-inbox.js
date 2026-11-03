'use strict';
// Fixture: the listings inbox (citations/inbox/*) on pg-mem with a fake Gmail API and the
// recorded sample emails in tests/fixtures/data/citation-emails.json. The reader (links by
// kind, codes), the Gmail message decoding, the match by recipient address and sender
// domain (the directory's sender domains first, then its own domain), a confirmation link
// opened and the row moved to awaiting approval, a code and a browser link shown on the
// row, information recorded, a failed link reported, unknown senders and addresses
// ignored, spam read too, every message marked read and recorded once, the poll log.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const G = require(path.join(root, 'citations/inbox/gmail.js'));
const M = require(path.join(root, 'citations/inbox/match.js'));
const { createInbox, ensureInboxTables } = require(path.join(root, 'citations/inbox/poller.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));
const SAMPLES = require(path.join(__dirname, 'data/citation-emails.json')).messages;

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations listings inbox ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const b64url = s => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

(async () => {
  // ── The Gmail message decoding and the token call, with a fake fetch ──
  const gmailCalls = [];
  const fakeGmailFetch = async (url, init = {}) => {
    gmailCalls.push({ url, method: init.method || 'GET', auth: (init.headers || {}).Authorization || '' });
    if (url === G.TOKEN_URL) return { ok: true, status: 200, json: async () => ({ access_token: 'ya29.fake-token', expires_in: 3600 }) };
    if (/\/messages\?/.test(url)) return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'm-yell-confirm' }] }) };
    if (/\/messages\/m-yell-confirm\?format=full/.test(url)) { const s = SAMPLES[0]; return { ok: true, status: 200, json: async () => ({ id: s.id, threadId: 't1', labelIds: ['INBOX', 'UNREAD'], snippet: s.text.slice(0, 60), internalDate: String(Date.parse(s.received_at)), payload: { mimeType: 'multipart/alternative', headers: Object.entries(s.headers).map(([name, value]) => ({ name: name.replace(/\b\w/g, c => c.toUpperCase()), value })), parts: [{ mimeType: 'text/plain', body: { data: b64url(s.text) } }, { mimeType: 'text/html', body: { data: b64url(s.html) } }] } }) }; }
    if (/\/modify$/.test(url)) return { ok: true, status: 200, json: async () => ({}) };
    return { ok: false, status: 404, json: async () => ({ error: { message: 'no' } }) };
  };
  const env = { GMAIL_CLIENT_ID: 'id', GMAIL_CLIENT_SECRET: 'the-secret', GMAIL_REFRESH_TOKEN: 'the-refresh' };
  const gm = G.createGmail({ env, fetchImpl: fakeGmailFetch });
  const ids = await gm.list({ label: 'INBOX' });
  const msg = await gm.get('m-yell-confirm');
  chk('the Gmail client: one token call then a bearer header, the list, the message decoded (headers lower cased, text and html from the parts, the date)', ids.length === 1 && gmailCalls[0].url === G.TOKEN_URL && gmailCalls[1].auth === 'Bearer ya29.fake-token' && gmailCalls.filter(c => c.url === G.TOKEN_URL).length === 1 && msg.headers.from.includes('mail.yell.com') && msg.headers['x-gm-original-to'] === 'ednes-edge-testing@listings.locallaunchpad.co.uk' && /confirm-email\?token=abc123def456/.test(msg.text) && /<a href/.test(msg.html) && msg.received_at === '2026-11-03T09:00:00.000Z', JSON.stringify({ ids, from: msg.headers.from, at: msg.received_at }), '');
  chk('secrets never appear in an error', !/the-secret|the-refresh/.test(G.scrub('token the-secret and the-refresh ya29.abc', env)) && /\[hidden\]/.test(G.scrub('the-secret', env)), G.scrub('token the-secret and the-refresh ya29.abc', env), '');
  const off = G.createGmail({ env: {}, fetchImpl: fakeGmailFetch });
  const e = await off.list().catch(err => err);
  chk('not configured: a 503 that names the variables', e instanceof Error && e.status === 503 && /GMAIL_REFRESH_TOKEN/.test(e.message), e && e.message, '');

  // ── The reader ──
  const p = M.parseEmail(SAMPLES[0]);
  chk('parseEmail: the sender domain, the recipient slug from X-Gm-Original-To, the confirm link alone (the login and unsubscribe links are browser or other)', p.from.domain === 'mail.yell.com' && p.from.registrable === 'yell.com' && p.recipient.slug === 'ednes-edge-testing' && p.confirm_links.length === 1 && /confirm-email/.test(p.confirm_links[0].url) && p.browser_links.some(l => /login/.test(l.url)) && !p.confirm_links.some(l => /unsubscribe/.test(l.url)), JSON.stringify({ confirm: p.confirm_links, browser: p.browser_links }), '');
  const pb = M.parseEmail(SAMPLES[1]);
  chk('a code next to the word code; no links', pb.codes.join() === '482913' && pb.confirm_links.length === 0, JSON.stringify(pb.codes), '');
  const pt = M.parseEmail(SAMPLES[2]);
  chk('Delivered-To gives the recipient when To is the shared mailbox; a log in link is a browser link, not a confirmation', pt.recipient.slug === 'ednes-edge-testing' && pt.confirm_links.length === 0 && pt.browser_links.length === 1, JSON.stringify(pt.links), '');
  chk('extractCodes: an alphanumeric code near "code", a year or a price alone is not a code', M.extractCodes('Your code: AB12CD9. Thanks.').join() === 'AB12CD9' && M.extractCodes('Founded in 2015, from £1500').length === 0, JSON.stringify([M.extractCodes('Your code: AB12CD9. Thanks.'), M.extractCodes('Founded in 2015, from £1500')]), '');

  // ── The poller on pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await ensureCitationTables(pool); await ensureInboxTables(pool);
  const store = createCitationStore(pool, { log: quiet, dfs: { configured: () => false }, env: {} });
  await store.seedDirectories({ fillDa: false });
  const edens = (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ('ednes edge testing', 'Landscaper', 'landscapers') RETURNING id`)).rows[0].id;
  const C = CL.createClientCitations({ pool, store, clientValues: async () => ({ company_name: 'Edens Edge Landscaping', phone: '07850 412717' }) });
  const yell = await store.byKey('yell'), bark = await store.byKey('bark');
  await store.update(yell.id, { sender_domains: ['mail.yell.com'] });
  await C.saveRow(edens, yell.id, { status: 'awaiting_email' });
  await C.saveRow(edens, bark.id, { status: 'awaiting_email' });
  // The fake Gmail: the samples by label, in Gmail's format; marks recorded
  const marked = [];
  const wrap = s => ({ id: s.id, threadId: 't', labelIds: [s.label, 'UNREAD'], snippet: s.text.slice(0, 60), internalDate: String(Date.parse(s.received_at)), payload: { mimeType: 'multipart/alternative', headers: Object.entries(s.headers).map(([name, value]) => ({ name, value })), parts: [{ mimeType: 'text/plain', body: { data: b64url(s.text) } }, ...(s.html ? [{ mimeType: 'text/html', body: { data: b64url(s.html) } }] : [])] } });
  const gmail = { configured: () => true, list: async ({ label }) => SAMPLES.filter(s => s.label === label).map(s => ({ id: s.id })), get: async id => { const s = SAMPLES.find(x => x.id === id); const m = wrap(s); const headers = {}; for (const h of m.payload.headers) headers[h.name.toLowerCase()] = h.value; return { id: m.id, headers, text: s.text, html: s.html, snippet: m.snippet, received_at: s.received_at, labels: m.labelIds }; }, markRead: async id => { marked.push(id); } };
  const opened = [];
  const fetchFn = async url => { opened.push(url); return url.includes('expired') ? { ok: false, status: 410, url, text: async () => 'Link expired' } : { ok: true, status: 200, url, text: async () => '<html><body>Thanks, your email is confirmed.</body></html>' }; };
  const inbox = createInbox({ pool, store, clientCitations: C, gmail, fetchFn, log: quiet });

  const r = await inbox.poll();
  const act = id => r.records.find(x => x.id === id).action;
  chk('the poll: inbox and spam read, every sample new, the five from known directories to a known client acted on', r.status === 'done' && r.listed === SAMPLES.length && r.new === SAMPLES.length && r.acted === 5, JSON.stringify({ status: r.status, listed: r.listed, new: r.new, acted: r.acted }), '');
  const v = await C.view(edens);
  const rowOf = name => v.tiers.flatMap(t => t.rows).find(x => x.directory.name === name).row;
  const yr = rowOf('Yell');
  chk('Yell (matched by its sender domain mail.yell.com): the confirmation link opened once, the row moved from awaiting email to awaiting approval, the event on the row', opened.includes('https://business.yell.com/confirm-email?token=abc123def456') && opened.filter(u => /yell/.test(u)).length === 1 && yr.status === 'awaiting_approval' && yr.inbox[0].kind === 'link_opened' && yr.inbox[0].ok === true && /opened the confirmation link; row moved to awaiting_approval/.test(act('m-yell-confirm')), JSON.stringify({ status: yr.status, inbox: yr.inbox, action: act('m-yell-confirm') }), '');
  const br = rowOf('Bark');
  chk('Bark: the code shown on the row, the status left alone', br.status === 'awaiting_email' && br.inbox[0].kind === 'code' && br.inbox[0].codes.join() === '482913' && act('m-bark-code') === 'code 482913 shown on the row', JSON.stringify({ status: br.status, inbox: br.inbox }), '');
  const tp = rowOf('Trustpilot');
  chk('Trustpilot (spam, matched by the directory domain): a browser link on the row; the row made as awaiting email', tp.inbox[0].kind === 'browser_link' && /trustpilot\.com\/login/.test(tp.inbox[0].browser_links[0].url) && tp.status === 'awaiting_email' && !opened.some(u => /trustpilot/.test(u)), JSON.stringify(tp.inbox), '');
  const fi = rowOf('FreeIndex');
  chk('FreeIndex: information recorded on the row', fi.inbox[0].kind === 'info' && act('m-freeindex-info') === 'recorded on the row', JSON.stringify(fi.inbox), '');
  const cy = rowOf('Cylex UK');
  chk('Cylex: the link answered 410: shown on the row, the status not moved', cy.inbox[0].kind === 'link_opened' && cy.inbox[0].ok === false && cy.inbox[0].status === 410 && cy.status === 'awaiting_email' && /answered 410/.test(act('m-cylex-broken-link')), JSON.stringify({ status: cy.status, action: act('m-cylex-broken-link') }), '');
  chk('an unknown sender (gmail.com) is ignored and its link never opened; an unknown slug and a non listings address are ignored', /ignored: unknown sender gmail\.com/.test(act('m-unknown-sender')) && !opened.some(u => /evil/.test(u)) && /ignored: no client for nobody-here@/.test(act('m-no-client')) && /ignored: not to a listings address/.test(act('m-not-listings')), [act('m-unknown-sender'), act('m-no-client'), act('m-not-listings')].join(' | '), '');
  chk('every message marked read and recorded once', marked.length === SAMPLES.length && Number((await pool.query(`SELECT COUNT(*)::int AS n FROM citation_emails`)).rows[0].n) === SAMPLES.length, marked.length, SAMPLES.length);
  const r2 = await inbox.poll();
  chk('a second poll sees nothing new', r2.new === 0 && r2.acted === 0 && marked.length === SAMPLES.length, JSON.stringify(r2), '');
  const st = await inbox.status();
  chk('status(): configured, the last poll, the emails with the client and directory names', st.configured && st.last_poll.new_count === 0 && st.emails.length === SAMPLES.length && st.emails.some(x => x.client_name === 'ednes edge testing' && x.directory_name === 'Yell'), JSON.stringify(st.last_poll), '');
  const mine = await inbox.emailsFor(edens);
  chk('emailsFor the client: the six addressed to it (the ignored unknown sender included, so a person can see it)', mine.length === 6, mine.length, 6);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
