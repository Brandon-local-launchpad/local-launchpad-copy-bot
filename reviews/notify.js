'use strict';

// ── Review replies: the approver's emails ────────────────────────────────────
// One email per sync run that put reviews in the queue (per approver, not per review), and one alert
// for anything that has waited 48 hours. Sent from listings@locallaunchpad.co.uk through the Gmail
// connection the citations inbox already has (citations/inbox/gmail.js send). The link is
// COPYBOT_URL + /reviews; with no COPYBOT_URL the email says where to look instead.

const str = v => (v == null ? '' : String(v)).trim();
const link = (env = process.env) => (str(env.COPYBOT_URL) ? `${str(env.COPYBOT_URL).replace(/\/+$/, '')}/reviews` : 'Copybot, Review replies in the sidebar');
const stars = n => `${n} star${n === 1 ? '' : 's'}`;
const byClient = list => {
  const m = new Map();
  for (const r of list) { const k = r.client_name || 'A client'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return [...m.entries()];
};
const lines = list => byClient(list).map(([client, rs]) => `${client}: ${rs.length} (${rs.map(r => stars(r.stars)).join(', ')})`).join('\n');

function queueEmail({ to, name = '', fresh = [], env = process.env }) {
  const n = fresh.length;
  const low = fresh.filter(r => r.stars <= 3).length;
  return {
    to,
    subject: `${n} Google review repl${n === 1 ? 'y' : 'ies'} waiting for approval`,
    text: [
      `${name ? `Hi ${name.split(/\s+/)[0]},` : 'Hello,'}`,
      '',
      `${n} new Google review repl${n === 1 ? 'y is' : 'ies are'} in the approval queue${low ? `, ${low} of them 1 to 3 stars` : ''}:`,
      '',
      lines(fresh),
      '',
      'Check each reviewer against the client\'s jobs before you approve. The target is a reply within 24 to 48 hours.',
      '',
      `Open the queue: ${link(env)}`,
    ].join('\n'),
  };
}

function lateEmail({ to, name = '', late = [], env = process.env }) {
  const n = late.length;
  return {
    to,
    subject: `${n} Google review repl${n === 1 ? 'y has' : 'ies have'} waited over 48 hours`,
    text: [
      `${name ? `Hi ${name.split(/\s+/)[0]},` : 'Hello,'}`,
      '',
      `${n} review repl${n === 1 ? 'y has' : 'ies have'} been in the approval queue for more than 48 hours:`,
      '',
      lines(late),
      '',
      `Open the queue: ${link(env)}`,
    ].join('\n'),
  };
}

module.exports = { queueEmail, lateEmail };
