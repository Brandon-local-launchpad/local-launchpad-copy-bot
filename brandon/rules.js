'use strict';

// ── Tell Brandon: the rules (12 Nov 2026, Brandon) ───────────────────────────
// Two halves, both to Brandon only, never to a client:
//   alerts  what Copybot can see for itself (a broken connection, a post failed after Retry, a 1 to 3
//           star review, Photo Drip running out, review imports running low, an Offer post with no
//           link, a client fully set up). detectAlerts turns the facts into alerts; each is told once.
//   asks    the judgement calls a person sends with the Tell Brandon button: a reason from
//           brandon/reasons.json, a line of their own, and the details of the screen it came from.
// Pure: no database, no network. brandon/service.js keeps the state and sends.

const REASONS = require('./reasons.json');

const DRIP_LOW = 8;          // fewer new Photo Drip photos than this (about a month) is worth chasing
const IMPORTS_LOW = 10;      // the same line the Reviews tab warns at (reviews/sync.js LOW_CAPACITY)
const EXCERPT = 280;

const str = v => (v == null ? '' : String(v)).trim();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;
const cut = (s, n = EXCERPT) => { const t = str(s).replace(/\s+/g, ' '); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

// A UK number as WhatsApp wants it: digits only, 44 instead of the leading 0 ("07766 555574" → 447766555574)
function whatsappNumber(raw) {
  let d = str(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `44${d.slice(1)}`;
  return /^\d{10,15}$/.test(d) ? d : '';
}
// Opens WhatsApp (the app, or WhatsApp Web) with the message typed; the person presses send
const whatsappUrl = (number, text) => (number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : '');

const reasonsFor = place => (REASONS[place] && Array.isArray(REASONS[place]) ? REASONS[place] : REASONS.client);
const PLACES = Object.keys(REASONS).filter(k => !k.startsWith('_'));

const base = env => str(env && env.COPYBOT_URL).replace(/\/+$/, '');
// Where a thing is, as a link when the app's address is known
function linkFor({ env, clientId = '', tab = '', path = '' }) {
  const p = path || (clientId ? `/clients/${clientId}${tab ? `/${tab}` : ''}` : '/dashboard');
  return base(env) ? `${base(env)}${p}` : '';
}

// context: [{ label, value }] from the screen the button was on (the review, the directory, the town)
function askMessage({ client, reason, note = '', context = [], by = '', link = '' }) {
  const lines = [`Copybot: ${str(client) || 'a client'}`, str(reason)];
  if (str(note)) lines.push('', str(note));
  const facts = (Array.isArray(context) ? context : []).filter(c => c && str(c.value)).map(c => `${str(c.label)}: ${cut(c.value)}`);
  if (facts.length) lines.push('', ...facts);
  if (link) lines.push('', link);
  if (str(by)) lines.push('', `From ${str(by)}`);
  return lines.join('\n');
}

// ── The alerts ──
// facts: one per client: { id, name, connection: { status, problem, publishing_on }, failed: [items failed
// after a Retry], low_reviews: [1 to 3 star reviews waiting], capacity: n|null, month: 'YYYY-MM',
// drip: { found, left, ran_out } | null, offer_no_link: n, setup: { connected, publishing_on, approved_batch,
// drip_approved, reviews_live } }
// An alert: { client_id, kind, key, urgent, sticky, text, tab }. The key makes it once per event: the same
// key is never told twice while it lasts. sticky: told once ever (set-up done), never cleared.
function detectAlerts(facts) {
  const out = [];
  const add = (f, kind, key, urgent, text, tab, sticky = false) => out.push({ client_id: f.id, client: f.name, kind, key: String(key), urgent, sticky, text, tab });
  for (const f of facts || []) {
    const c = f.connection;
    if (c && c.status === 'problem') add(f, 'connection', cut(c.problem || 'problem', 120), true, `Nothing will go out: the Google connection has a problem${str(c.problem) ? ` (${cut(c.problem, 160)})` : ''}.`, 'gbp-posts?s=publishing');
    for (const i of f.failed || []) add(f, 'failed', i.id, true, `A ${i.kind === 'photo' ? 'Photo Drip photo' : 'post'}${i.due_date ? ` due ${i.due_date}` : ''} failed again after Retry${str(i.error) ? `: ${cut(i.error, 160)}` : ''}.`, 'gbp-posts?s=publishing');
    for (const r of f.low_reviews || []) add(f, 'low_review', r.id, true, `A ${plural(Number(r.stars) || 0, 'star')} review from ${str(r.reviewer_name) || 'someone with no name'}: "${cut(r.comment || '(no text)', 200)}". The client should be ready for the call.`, 'reviews');
    if (f.capacity != null && Number(f.capacity) <= IMPORTS_LOW) add(f, 'imports_low', f.month || '', false, `Only ${f.capacity} of this month's review imports are left for this location.`, 'reviews');
    const d = f.drip;
    if (d && d.found) {
      if (d.ran_out) add(f, 'drip_out', 'out', false, 'Photo Drip has run out of new photos: ask the client for more.', 'gbp-posts?s=publishing');
      else if (Number(d.left) < DRIP_LOW) add(f, 'drip_low', 'low', false, `Photo Drip has ${plural(Number(d.left) || 0, 'new photo')} left (about ${Math.max(0, Math.round((Number(d.left) || 0) / 2))} weeks): ask the client for more.`, 'gbp-posts?s=publishing');
    }
    if (Number(f.offer_no_link) > 0) add(f, 'offer_link', 'offer', false, `${plural(Number(f.offer_no_link), 'Offer post')} with nowhere to claim it: save the live domain on the Record tab (or a booking page under Post settings).`, 'record');
    const s = f.setup;
    if (s && s.connected && s.publishing_on && s.approved_batch && s.drip_approved && s.reviews_live) add(f, 'setup_done', 'done', false, 'Fully set up: connected, a post batch approved, publishing on, Photo Drip approved and review replies live.', 'gbp-posts', true);
  }
  return out;
}

// One email for the alerts of a tick that cannot wait
function urgentEmail({ to, alerts, env }) {
  const n = alerts.length;
  const lines = [`${n === 1 ? 'This needs' : 'These need'} you now:`, ''];
  for (const a of alerts) { lines.push(`${a.client}: ${a.text}`); const l = linkFor({ env, clientId: a.client_id, tab: a.tab }); if (l) lines.push(l); lines.push(''); }
  return { to, subject: n === 1 ? `Copybot: ${alerts[0].client}: ${KIND_TITLE[alerts[0].kind] || 'needs you'}` : `Copybot: ${plural(n, 'thing')} for you now`, text: lines.join('\n').trim() };
}
const KIND_TITLE = { connection: 'nothing will go out', failed: 'a post failed again', low_review: 'a 1 to 3 star review', imports_low: 'review imports running low', drip_out: 'Photo Drip has run out', drip_low: 'Photo Drip running low', offer_link: 'an Offer post has no link', setup_done: 'fully set up' };

// The morning email: what came up since the last one, and the asks still waiting on Brandon
function digestEmail({ to, alerts = [], asks = [], env }) {
  const lines = [];
  if (alerts.length) {
    lines.push('Since yesterday:', '');
    for (const a of alerts) { lines.push(`${a.client}: ${a.text}`); const l = linkFor({ env, clientId: a.client_id, tab: a.tab }); if (l) lines.push(l); lines.push(''); }
  }
  if (asks.length) {
    lines.push(`Still waiting on you (${asks.length}):`, '');
    for (const q of asks) lines.push(`${q.client}: ${q.reason}${str(q.note) ? `: ${cut(q.note, 140)}` : ''} (${q.by ? `${q.by}, ` : ''}${String(q.created_at).slice(0, 10)})`);
    const l = linkFor({ env, path: '/dashboard' });
    if (l) lines.push('', `Mark them done on the dashboard: ${l}`);
  }
  return { to, subject: `Copybot this morning: ${[alerts.length ? plural(alerts.length, 'new thing') : '', asks.length ? `${asks.length} waiting on you` : ''].filter(Boolean).join(', ')}`, text: lines.join('\n').trim() };
}

function askEmail({ to, ask, message }) {
  return { to, subject: `Tell Brandon: ${ask.client}: ${ask.reason}`, text: `${message}\n\n(Sent with the Tell Brandon button. Mark it done on the dashboard when it is sorted.)` };
}

module.exports = { whatsappNumber, whatsappUrl, reasonsFor, PLACES, REASONS, linkFor, askMessage, detectAlerts, urgentEmail, digestEmail, askEmail, KIND_TITLE, DRIP_LOW, IMPORTS_LOW };
