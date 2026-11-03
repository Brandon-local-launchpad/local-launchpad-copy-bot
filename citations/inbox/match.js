'use strict';

// ── Reading a listings email ──────────────────────────────────────────────────────
// Every directory email lands in the one mailbox. The client is the recipient address
// (<client-slug>@listings.locallaunchpad.co.uk, in To, X-Gm-Original-To or Delivered-To);
// the directory is the sender's domain (the directory's sender_domains first, else its own
// domain). From the body: the confirmation links (confirm, verify, activate, validate in
// the link or its text, not a login page), the links that need a browser (log in, account,
// dashboard), and the codes (four to eight digits, or six to eight letters and digits, next
// to the words code, PIN, verification or OTP).

const { LISTINGS_DOMAIN } = require('../client');
const { registrableDomain } = require('../seed');

const str = v => (v == null ? '' : String(v)).trim();
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n));
const textOf = html => decode(String(html || '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>|<\/li>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

const addresses = header => [...String(header || '').matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map(m => m[0].toLowerCase());
// The client's address: <slug>@listings.locallaunchpad.co.uk (the subdomain, the set-up in use), or the
// plus form listings+<slug>@locallaunchpad.co.uk, which needs no DNS or routing but some sign-up forms reject
const PLUS_RE = /^listings\+([a-z0-9-]+)@locallaunchpad\.co\.uk$/;
function recipientSlug(headers, domain = LISTINGS_DOMAIN) {
  for (const h of ['x-gm-original-to', 'delivered-to', 'to', 'cc', 'envelope-to', 'x-original-to']) {
    for (const a of addresses(headers[h])) {
      if (a.endsWith('@' + domain)) return { address: a, slug: a.split('@')[0], form: 'subdomain' };
      const m = a.match(PLUS_RE);
      if (m) return { address: a, slug: m[1], form: 'plus' };
    }
  }
  return null;
}

// Gmail's Authentication-Results header: did SPF or DKIM pass for the sender's domain? A directory's
// email is acted on only when it did (3 Nov, Brandon), so a spoofed "from yell.com" opens nothing.
//   dkim=pass with header.i or header.d on the From domain, or spf=pass with smtp.mailfrom on it,
//   or dmarc=pass (which already means the passing domain lines up with From)
function authentication(headers) {
  const raw = [headers['authentication-results'], headers['arc-authentication-results']].filter(Boolean).join(' ; ');
  const dkimDomains = [...raw.matchAll(/dkim=pass[^;]*?header\.(?:i|d)=@?([^\s;]+)/gi)].map(m => m[1].toLowerCase());
  const spfDomain = ((raw.match(/spf=pass[^;]*?smtp\.mailfrom=(?:[^@\s;]+@)?([^\s;]+)/i) || [])[1] || '').toLowerCase();
  return {
    spf: ((raw.match(/\bspf=(\w+)/i) || [])[1] || 'none').toLowerCase(), spf_domain: spfDomain,
    dkim: dkimDomains.length ? 'pass' : ((raw.match(/\bdkim=(\w+)/i) || [])[1] || 'none').toLowerCase(), dkim_domains: dkimDomains,
    dmarc: ((raw.match(/\bdmarc=(\w+)/i) || [])[1] || 'none').toLowerCase(),
    present: !!raw,
  };
}
function senderAuthenticated(auth, fromRegistrable) {
  if (!auth || !fromRegistrable) return false;
  const same = d => !!d && registrableDomain(d) === fromRegistrable;
  return auth.dmarc === 'pass' || auth.dkim_domains.some(same) || (auth.spf === 'pass' && same(auth.spf_domain));
}
function sender(headers) {
  const a = addresses(headers.from)[0] || addresses(headers['reply-to'])[0] || '';
  const host = a.split('@')[1] || '';
  return { address: a, domain: host, registrable: registrableDomain(host) };
}

const CONFIRM_RE = /confirm|verif|activat|validat|approve-email|email-check|click[-_ ]?here/i;
const LOGIN_RE = /log[-_ ]?in|sign[-_ ]?in|account|dashboard|password|unsubscribe|preferences|privacy|terms|help|support/i;
function extractLinks(html, text) {
  const out = [];
  const seen = new Set();
  const push = (url, label) => { const u = str(url).replace(/[),.;'"]+$/, ''); if (!/^https?:\/\//i.test(u) || seen.has(u)) return; seen.add(u); const t = str(label); const kind = CONFIRM_RE.test(u) || (CONFIRM_RE.test(t) && !LOGIN_RE.test(t)) ? (LOGIN_RE.test(u) && !/confirm|verif|activat/i.test(u) ? 'browser' : 'confirm') : LOGIN_RE.test(u + ' ' + t) ? 'browser' : 'other'; out.push({ url: u, text: t.slice(0, 80), kind }); };
  for (const m of String(html || '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) push(decode(m[1]), textOf(m[2]));
  for (const m of String(text || '').matchAll(/https?:\/\/[^\s<>"')\]]+/g)) push(m[0], '');
  return out;
}
const CODE_WORDS = /\b(code|pin|otp|one[- ]time|verification|passcode)\b/i;
function extractCodes(text) {
  const out = new Set();
  const t = String(text || '');
  // Digits of four to eight within 60 characters of a code word, either side
  for (const m of t.matchAll(/\b(\d{4,8})\b/g)) { const a = Math.max(0, m.index - 60), b = Math.min(t.length, m.index + m[0].length + 60); if (CODE_WORDS.test(t.slice(a, b))) out.add(m[1]); }
  for (const m of t.matchAll(/\b([A-Z0-9]{6,8})\b/g)) { if (!/\d/.test(m[1]) || !/[A-Z]/.test(m[1])) continue; const a = Math.max(0, m.index - 60), b = Math.min(t.length, m.index + m[0].length + 60); if (CODE_WORDS.test(t.slice(a, b))) out.add(m[1]); }
  return [...out];
}

// message: { id, headers, text, html, snippet, received_at } (citations/inbox/gmail.js get)
function parseEmail(message, { listingsDomain = LISTINGS_DOMAIN } = {}) {
  const headers = message.headers || {};
  const text = str(message.text) || textOf(message.html);
  const links = extractLinks(message.html, message.text);
  const from = sender(headers);
  const auth = authentication(headers);
  return {
    id: message.id, received_at: message.received_at || null, subject: str(headers.subject),
    from, recipient: recipientSlug(headers, listingsDomain),
    auth, authenticated: senderAuthenticated(auth, from.registrable),
    text, snippet: str(message.snippet),
    links, confirm_links: links.filter(l => l.kind === 'confirm'), browser_links: links.filter(l => l.kind === 'browser'),
    codes: extractCodes(text),
  };
}

// clients: [{ id, name, slug }]; directories: [{ id, name, domain, sender_domains }]
function matchClient(recipient, clients) {
  if (!recipient) return null;
  return clients.find(c => c.slug === recipient.slug) || null;
}
function matchDirectory(from, directories) {
  if (!from || !from.domain) return null;
  const host = from.domain.toLowerCase();
  const on = d => !!d && (host === d || host.endsWith('.' + d));
  const bySender = directories.find(d => (d.sender_domains || []).some(s => on(String(s).toLowerCase().replace(/^www\./, ''))));
  if (bySender) return { directory: bySender, by: 'sender domain' };
  const byDomain = directories.find(d => d.domain && !d.retired && on(d.domain));
  if (byDomain) return { directory: byDomain, by: 'directory domain' };
  return null;
}

module.exports = { parseEmail, matchClient, matchDirectory, extractLinks, extractCodes, recipientSlug, sender, authentication, senderAuthenticated, textOf };
