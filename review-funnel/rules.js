'use strict';

// ── The Review Us page: the rules (12 Nov 2026, Brandon) ─────────────────────────────────────
// The page on every client site (Given's template; the plugin's [llp_review_funnel] shortcode
// draws the star box). 4 or 5 stars goes to the client's Google review page. 1 to 3 stars opens
// a private form (name, phone, email, what went wrong); the site sends it here, and Copybot
// emails the client with a copy to the team.
// Pure: no database, no network. review-funnel/service.js keeps the state and sends.
//   reviewLink       the Google review link: the one typed on the Record tab, else built from
//                    the confirmed Google listing (the place ID). Nothing else is guessed.
//   cleanSubmission  what a feedback send must hold, and the tidied values
//   clientEmail      the email to the client
//   teamEmail        the copy to the team, which says whether the client was told

const TEAM_EMAIL = 'team@locallaunchpad.co.uk';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 120, phone: 40, email: 200, feedback: 4000, page_url: 500 };

const str = v => (v == null ? '' : String(v)).trim();
const line = v => str(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const block = v => str(v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const stars = n => `${n} star${n === 1 ? '' : 's'}`;

// Google's own "write a review" address for a place
const placeReviewUrl = placeId => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(str(placeId))}`;

function reviewLink(cv = {}) {
  const typed = str(cv.review_url);
  if (/^https?:\/\/\S+$/i.test(typed)) return { url: typed, source: 'typed' };
  const placeId = str(cv.gbp_place_id);
  if (placeId) return { url: placeReviewUrl(placeId), source: 'listing' };
  return { url: '', source: '' };
}

// A send from the site's form. 4 and 5 stars never come here: they go to Google.
function cleanSubmission(body) {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const value = {
    stars: Number(b.stars), name: line(b.name), phone: line(b.phone), email: line(b.email).toLowerCase(),
    feedback: block(b.feedback), page_url: line(b.page_url),
  };
  const errors = [];
  if (!Number.isInteger(value.stars) || value.stars < 1 || value.stars > 3) errors.push('The rating must be 1, 2 or 3 stars.');
  if (!value.name) errors.push('A name is needed.');
  if (!value.feedback) errors.push('The feedback is empty.');
  if (!value.phone && !value.email) errors.push('A phone number or an email is needed.');
  if (value.email && !EMAIL.test(value.email)) errors.push('The email address does not look right.');
  for (const [k, max] of Object.entries(LIMITS)) if (value[k].length > max) errors.push(`The ${k.replace('_', ' ')} is too long (${max} characters at most).`);
  return { ok: !errors.length, errors, value };
}

const details = f => [
  `Name: ${f.name}`,
  `Phone: ${f.phone || 'not given'}`,
  `Email: ${f.email || 'not given'}`,
  '',
  'What they said:',
  f.feedback,
];

// To the client. ownerName is the Client Values owner name; only its first word is used.
function clientEmail({ to, ownerName = '', feedback: f }) {
  const first = str(ownerName).split(/\s+/)[0];
  return {
    to,
    subject: `A customer left private feedback (${stars(f.stars)})`,
    text: [
      first ? `Hi ${first},` : 'Hello,',
      '',
      `A customer used your review card and gave ${stars(f.stars)}. They were not sent to Google: this feedback is private to you.`,
      '',
      ...details(f),
      '',
      'It is worth getting in touch with them to put it right.',
      '',
      'Local Launchpad',
    ].join('\n'),
  };
}

// The copy to the team. clientTo: the address the client's email went to ('' when there is none);
// clientError: why it did not send, when it did not.
function teamEmail({ to = TEAM_EMAIL, clientName = '', clientTo = '', clientError = '', link = '', feedback: f }) {
  const told = clientError ? `The email to the client (${clientTo}) did NOT send: ${clientError}. Pass this on to them.`
    : clientTo ? `The client was emailed at ${clientTo}.`
      : 'The client was NOT emailed: there is no email address on their record. Pass this on to them.';
  return {
    to,
    subject: `${clientName || 'A client'}: private feedback (${stars(f.stars)})`,
    text: [
      `A customer of ${clientName || 'a client'} gave ${stars(f.stars)} on the Review Us page and left private feedback.`,
      told,
      '',
      ...details(f),
      ...(link ? ['', link] : []),
    ].join('\n'),
  };
}

module.exports = { TEAM_EMAIL, LIMITS, placeReviewUrl, reviewLink, cleanSubmission, clientEmail, teamEmail, stars };
