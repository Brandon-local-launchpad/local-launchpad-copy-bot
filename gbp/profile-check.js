'use strict';

// ── Profile verification (GBP SOP 3.10) ─────────────────────────────────────
// Compares the client's LeadSnap location (what Google holds) with what Copybot
// built: the primary and secondary categories against the profile fields, the
// service names against services.csv (locked and variants), the hours against the
// record. Each difference is missing (on our side, not on Google), extra (on Google,
// not on our side) or mismatch (the same slot, a different value).

const norm = s => String(s == null ? '' : s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIASES = { mon: 'monday', tue: 'tuesday', tues: 'tuesday', wed: 'wednesday', thu: 'thursday', thur: 'thursday', thurs: 'thursday', fri: 'friday', sat: 'saturday', sun: 'sunday' };
const dayOf = w => { const k = String(w || '').toLowerCase().replace(/[^a-z]/g, ''); return DAYS.includes(k) ? k : DAY_ALIASES[k] || null; };

// "7am" → "07:00", "6.30pm" → "18:30", "17:00" → "17:00"
function timeOf(t) {
  const m = String(t || '').toLowerCase().replace(/\s+/g, '').match(/^(\d{1,2})(?:[:.](\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10); const min = m[2] || '00';
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${min}`;
}

// "Monday to Saturday, 7am to 6pm; Sunday closed" → { monday: ['07:00','18:00'], … }, with what could not be read
const DAY_WORD = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thur?s?|fri|sat|sun)';
const TIME = '\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm)?';
// A day or a day range, then "closed" or a time range: "Monday to Saturday, 7am to 6pm",
// "Mon-Fri 8am-5pm", "Sunday closed", "every day 8 to 6"
const HOURS_RE = new RegExp(`\\b(${DAY_WORD}|every day|daily|7 days(?: a week)?)\\b\\s*(?:(?:to|-|–|through)\\s*(${DAY_WORD})\\b)?\\s*[:,]?\\s*(closed|(${TIME})\\s*(?:to|-|–|until)\\s*(${TIME}))`, 'gi');
function parseHours(text) {
  const hours = {};
  const unparsed = [];
  const src = String(text || '');
  let rest = src;
  for (const m of src.matchAll(HOURS_RE)) {
    rest = rest.replace(m[0], ' ');
    const first = m[1].toLowerCase();
    let days;
    if (/^(every day|daily|7 days)/.test(first)) days = DAYS;
    else { const a = DAYS.indexOf(dayOf(first)); const b = m[2] ? DAYS.indexOf(dayOf(m[2])) : a; days = b >= a ? DAYS.slice(a, b + 1) : [...DAYS.slice(a), ...DAYS.slice(0, b + 1)]; }
    if (/^closed$/i.test(m[3])) { for (const d of days) hours[d] = null; continue; }
    let open = timeOf(m[4]), close = timeOf(m[5]);
    // "7 to 6pm": a first time with no am or pm is in the morning unless that would end before it opens
    if (open && close && !/am|pm/i.test(m[4]) && /pm/i.test(m[5]) && parseInt(open, 10) > parseInt(close, 10)) open = timeOf(m[4] + 'pm');
    if (!open || !close) { unparsed.push(m[0].trim()); continue; }
    for (const d of days) hours[d] = [open, close];
  }
  for (const leftover of rest.split(/[;,.]\s*|\s+and\s+/i).map(s => s.trim()).filter(s => /[a-z0-9]/i.test(s))) unparsed.push(leftover);
  return { hours, unparsed };
}

// LeadSnap working_hours: [{ open_day, close_day, open_time: 'HH:MM:SS', close_time }]
function leadsnapHours(working) {
  const hours = {};
  for (const w of (Array.isArray(working) ? working : [])) {
    const d = dayOf(w.open_day);
    if (!d) continue;
    hours[d] = [String(w.open_time || '').slice(0, 5), String(w.close_time || '').slice(0, 5)];
  }
  return hours;
}

const catName = c => (c && typeof c === 'object' ? c.display_name || c.name || '' : c || '');

// location: the LeadSnap get location response; ours: { primary, secondaries, services: [names], hours: text }
function checkProfile({ location, ours, now = new Date() }) {
  const L = location || {};
  const diffs = [];
  // Categories
  const gPrimary = catName(L.primary_category);
  if (norm(gPrimary) !== norm(ours.primary)) diffs.push({ area: 'primary category', kind: 'mismatch', ours: ours.primary || '', google: gPrimary || '' });
  const gSecondaries = (Array.isArray(L.additional_categories) ? L.additional_categories : []).map(catName).filter(Boolean);
  for (const c of ours.secondaries || []) if (!gSecondaries.some(g => norm(g) === norm(c))) diffs.push({ area: 'secondary categories', kind: 'missing', ours: c, google: '' });
  for (const g of gSecondaries) if (!(ours.secondaries || []).some(c => norm(c) === norm(g))) diffs.push({ area: 'secondary categories', kind: 'extra', ours: '', google: g });
  // Services
  const gServices = (Array.isArray(L.service_items) ? L.service_items : []).map(s => ({ name: s.name || '', category: s.category_name || '' })).filter(s => s.name);
  for (const s of ours.services || []) if (!gServices.some(g => norm(g.name) === norm(s))) diffs.push({ area: 'services', kind: 'missing', ours: s, google: '' });
  for (const g of gServices) if (!(ours.services || []).some(s => norm(s) === norm(g.name))) diffs.push({ area: 'services', kind: 'extra', ours: '', google: `${g.name}${g.category ? ` (${g.category})` : ''}` });
  // Hours
  const parsed = parseHours(ours.hours);
  const gHours = leadsnapHours(L.working_hours);
  const hoursNotes = parsed.unparsed.map(u => `could not read "${u}" in the record's hours`);
  if (ours.hours && !Object.keys(parsed.hours).length) hoursNotes.push('the record\'s hours could not be read at all; compare by eye');
  for (const d of DAYS) {
    const o = parsed.hours[d], g = gHours[d];
    const have = Object.prototype.hasOwnProperty.call(parsed.hours, d);
    if (!have && !g) continue;
    if (have && !g) { if (o) diffs.push({ area: 'hours', kind: 'missing', ours: `${d} ${o[0]} to ${o[1]}`, google: 'closed' }); continue; }
    if (!have && g) { if (Object.keys(parsed.hours).length) diffs.push({ area: 'hours', kind: 'extra', ours: 'closed', google: `${d} ${g[0]} to ${g[1]}` }); continue; }
    if (o === null) { diffs.push({ area: 'hours', kind: 'mismatch', ours: `${d} closed`, google: `${d} ${g[0]} to ${g[1]}` }); continue; }
    if (o[0] !== g[0] || o[1] !== g[1]) diffs.push({ area: 'hours', kind: 'mismatch', ours: `${d} ${o[0]} to ${o[1]}`, google: `${d} ${g[0]} to ${g[1]}` });
  }
  const meta = L.metadata || {};
  return {
    at: now.toISOString(),
    location: { id: L.id, name: L.name || L.location_name || '', place_id: L.place_id || '', completion_percentage: L.completion_percentage === undefined ? null : L.completion_percentage, status: L.location_state || L.status || '', suspension_reason: meta.suspension_reason || null, standing: meta.standing || null, has_pending_edits: !!meta.has_pending_edits, open_status: meta.open_status || null },
    google: { primary: gPrimary, secondaries: gSecondaries, services: gServices.map(s => s.name), hours: gHours },
    ours: { primary: ours.primary || '', secondaries: ours.secondaries || [], services: ours.services || [], hours: parsed.hours, hours_text: ours.hours || '' },
    diffs, counts: { missing: diffs.filter(d => d.kind === 'missing').length, extra: diffs.filter(d => d.kind === 'extra').length, mismatch: diffs.filter(d => d.kind === 'mismatch').length },
    notes: hoursNotes,
  };
}

module.exports = { checkProfile, parseHours, leadsnapHours, timeOf, DAYS };
