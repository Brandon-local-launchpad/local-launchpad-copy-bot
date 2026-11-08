'use strict';

// ── GBP Posts: planning a batch ──────────────────────────────────────────────
// Code decides every post's prompt, photo, date, CTA and type. The model only writes the text, from
// the Lead Snap config's prompts. No database and no network here.
//   planBatch({ size, record, photos, history, clientId, start, today })
//     record:  the saved Lead Snap config (output.prompts, intake)
//     photos:  the client's rows from drive_photos
//     history: the client's earlier posts: { prompt_n, drive_file_id, post_date, topic }
//     site:    the client's live domain, the claim link when the config's button has no link

const { ALL_JOBS } = require('../leadsnap/autopost/decide');
const { BRAND } = require('../drive/photos');

const SIZES = [13, 26, 52];
const OFFER_DAYS = 28;          // Brandon, 7 Nov 2026: each offer runs 28 days, so one ends as the next begins
const MIN_LEAD_DAYS = 3;        // room for a VA to review before the first post
const POST_TIME = '10:00';      // UK time
// Two days a week, the pair by client, so clients do not all post on one day
const DAY_PAIRS = [[1, 4], [2, 5], [3, 6]];
const CTA_TYPES = { 'Call Now': 'CALL', Book: 'BOOK', 'Learn More': 'LEARN_MORE' };

const ukDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const parse = d => new Date(`${d}T12:00:00Z`);
const fmt = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = parse(d); x.setUTCDate(x.getUTCDate() + n); return fmt(x); };
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !Number.isNaN(parse(d).getTime()) && fmt(parse(d)) === d;
const hash = s => [...String(s)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const dayPair = clientId => DAY_PAIRS[hash(clientId) % DAY_PAIRS.length];

// The next `count` post days on or after `from`
function postDays(clientId, from, count) {
  const days = dayPair(clientId), out = [];
  let d = from;
  while (out.length < count) { if (days.includes(parse(d).getUTCDay())) out.push(d); d = addDays(d, 1); }
  return out;
}

// The default first day: a few days away, and after anything already planned
function firstDay(clientId, history, today) {
  const last = history.map(h => h.post_date).filter(Boolean).sort().pop();
  const earliest = addDays(today, MIN_LEAD_DAYS);
  const from = last && addDays(last, 1) > earliest ? addDays(last, 1) : earliest;
  return postDays(clientId, from, 1)[0];
}

// A prompt's pool of photos. Its folder is "GBP Photos – Posts / [label]", or all the job photos.
// A photo Google would refuse (problem) never goes in.
const labelOf = folder => String(folder || '').split(' / ').slice(1).join(' / ');
function poolFor(prompt, photos) {
  const usable = photos.filter(p => p.kind === 'post' && !p.problem);
  if (prompt.folder === ALL_JOBS) return usable.filter(p => p.label.toLowerCase() !== BRAND.toLowerCase());
  const label = labelOf(prompt.folder).toLowerCase();
  return label ? usable.filter(p => p.label.toLowerCase() === label) : [];
}

function ctaFor(intake) {
  const c = intake.cta || {};
  const type = CTA_TYPES[c.type] || '';
  return { cta_type: type, cta_url: type === 'CALL' ? '' : String(c.url || '') };
}

// The offer's Google fields. Nothing but what the client confirmed: the title is the offer, the link
// is where to claim it, and no terms are written, because none are confirmed.
function offerFields(intake, date, site = '') {
  const raw = String(intake.offer || '').trim();
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);
  const c = intake.cta || {};
  // A Call Now client's button has no link, and an offer still needs somewhere to claim it
  return { offer_title: title.slice(0, 58), offer_start: date, offer_end: addDays(date, OFFER_DAYS), offer_redeem_url: String(c.url || site || '') };
}

// Least used first, so everything takes its turn before anything repeats. Ties go to whatever was
// used longest ago, then a stable order.
function pickLeastUsed(items, usedCount, lastUsed, keyOf, prefer = () => 0) {
  return [...items].sort((a, b) => (usedCount.get(keyOf(a)) || 0) - (usedCount.get(keyOf(b)) || 0)
    || prefer(a) - prefer(b)
    || (lastUsed.get(keyOf(a)) ?? -1) - (lastUsed.get(keyOf(b)) ?? -1))[0];
}

function planBatch({ size, record, photos = [], history = [], clientId, start = null, today = ukDate(), site = '' }) {
  const refuse = m => Object.assign(new Error(m), { status: 400 });
  if (!SIZES.includes(Number(size))) throw refuse(`A batch is ${SIZES.join(', ')} posts.`);
  if (!record || !record.output || !Array.isArray(record.output.prompts) || !record.sheet) throw refuse('Write the prompts first (Prompts, on the GBP Posts & Photos tab): posts are written from them.');
  const intake = record.intake || {};
  const pools = new Map(record.output.prompts.map(p => [p.n, poolFor(p, photos)]));
  const live = record.output.prompts.filter(p => pools.get(p.n).length);
  const skipped = record.output.prompts.filter(p => !pools.get(p.n).length);
  const standard = live.filter(p => p.kind !== 'offer');
  const offerPrompt = live.find(p => p.kind === 'offer') || null;
  if (!standard.length) throw refuse('None of the prompts has a usable photo in Drive. Press Read Drive under Photos, or get photos from the client.');

  if (start && !isDate(start)) throw refuse('The start date must be a date.');
  if (start && start < today) throw refuse('The start date is in the past.');
  const days = postDays(clientId, start || firstDay(clientId, history, today), Number(size));

  const promptUsed = new Map(), promptLast = new Map(), photoUsed = new Map(), photoLast = new Map();
  history.forEach((h, i) => {
    if (h.prompt_n != null) { promptUsed.set(h.prompt_n, (promptUsed.get(h.prompt_n) || 0) + 1); promptLast.set(h.prompt_n, i); }
    if (h.drive_file_id) { photoUsed.set(h.drive_file_id, (photoUsed.get(h.drive_file_id) || 0) + 1); photoLast.set(h.drive_file_id, i); }
  });
  let lastOffer = history.filter(h => h.topic === 'OFFER').map(h => h.post_date).sort().pop() || null;
  let tick = history.length, prevFolder = null;

  const posts = days.map((date, i) => {
    const offerDue = offerPrompt && intake.offer && (!lastOffer || date >= addDays(lastOffer, OFFER_DAYS));
    const prompt = offerDue ? offerPrompt : pickLeastUsed(standard, promptUsed, promptLast, p => p.n, p => (p.folder === prevFolder ? 1 : 0));
    const photo = pickLeastUsed(pools.get(prompt.n), photoUsed, photoLast, p => p.file_id);
    if (offerDue) lastOffer = date;
    promptUsed.set(prompt.n, (promptUsed.get(prompt.n) || 0) + 1); promptLast.set(prompt.n, tick);
    photoUsed.set(photo.file_id, (photoUsed.get(photo.file_id) || 0) + 1); photoLast.set(photo.file_id, tick);
    prevFolder = prompt.folder; tick++;
    const base = { seq: i + 1, post_date: date, post_time: POST_TIME, prompt_n: prompt.n, prompt_label: prompt.label, folder: prompt.folder, drive_file_id: photo.file_id, photo_name: photo.name };
    return offerDue
      ? { ...base, topic: 'OFFER', cta_type: '', cta_url: '', ...offerFields(intake, date, site) }
      : { ...base, topic: 'STANDARD', ...ctaFor(intake), offer_title: '', offer_start: '', offer_end: '', offer_redeem_url: '' };
  });

  const notes = [];
  if (skipped.length) notes.push(`${skipped.length} prompt${skipped.length === 1 ? ' has' : 's have'} no usable photo in Drive, so ${skipped.length === 1 ? 'it was' : 'they were'} left out: ${skipped.map(p => p.label).join('; ')}.`);
  if (intake.offer && !offerPrompt) notes.push('The confirmed offer has no prompt with a photo, so this batch has no Offer posts.');
  if (!intake.offer) notes.push('No confirmed offer, so this batch has no Offer posts.');
  const distinct = new Set(posts.map(p => p.drive_file_id)).size;
  if (distinct < posts.length) notes.push(`${posts.length} posts share ${distinct} photos, so some photos repeat. More photos would stop that.`);
  return { posts, notes, start: days[0] };
}

// New dates for the same posts, in order, when the VA moves the start
function redate(posts, clientId, start) {
  const days = postDays(clientId, start, posts.length);
  return posts.map((p, i) => ({ id: p.id, post_date: days[i], ...(p.topic === 'OFFER' ? { offer_start: days[i], offer_end: addDays(days[i], OFFER_DAYS) } : {}) }));
}

// What stops a batch being approved
function blockers(posts, { today = ukDate(), fileIds = null } = {}) {
  const out = [];
  const noClaim = [], noLink = [];
  for (const p of posts) {
    const at = `Post ${p.seq}`;
    if (p.status !== 'written') { out.push(`${at} is not written yet.`); continue; }
    if (p.fails > 0) out.push(`${at} fails a check: ${(p.checks || []).filter(c => c.level === 'fail').map(c => c.detail ? `${c.label} (${c.detail})` : c.label).join('; ')}.`);
    if (!p.drive_file_id) out.push(`${at} has no photo.`);
    else if (fileIds && !fileIds.has(p.drive_file_id)) out.push(`${at}'s photo is no longer in Drive: choose another.`);
    if (p.post_date < today) out.push(`${at}'s date has passed: move the start date.`);
    if (p.topic === 'OFFER' && !p.offer_redeem_url) noClaim.push(p.seq);
    if (p.topic !== 'OFFER' && !p.cta_type) out.push(`${at} has no button.`);
    if (p.topic !== 'OFFER' && p.cta_type && p.cta_type !== 'CALL' && !p.cta_url) noLink.push(p.seq);
  }
  const posts_ = list => (list.length === 1 ? `Post ${list[0]}` : `Posts ${list.join(', ')}`);
  const fill = 'Save the live domain on the Record tab, or a booking page under Post settings, and the links fill in by themselves: nothing needs writing again.';
  if (noLink.length) out.push(`${posts_(noLink)}: the button has no link. ${fill}`);
  if (noClaim.length) out.push(`${posts_(noClaim)}: an Offer post with nowhere to claim it. ${noLink.length ? 'The same link fixes this.' : fill}`);
  return out;
}

module.exports = { planBatch, redate, blockers, poolFor, postDays, firstDay, dayPair, addDays, ukDate, isDate, SIZES, OFFER_DAYS, POST_TIME, MIN_LEAD_DAYS };
