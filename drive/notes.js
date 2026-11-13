'use strict';

// ── The photo notes file (13 Nov 2026) ───────────────────────────────────────
// The gbp-photo-sort skill (skills/gbp-photo-sort/SKILL.md, Step 6) saves photo-notes.json in the
// client's photo folder: for every photo, what it shows, how good it is, whether it suits a hero,
// which service it is. Copybot reads it with the folders (drive/photos.js) and picks website
// images from it (images/pick.js). The folders stay the truth for which service folder a photo
// is in: a person may drag a photo after the sort.
//
// Everything here is pure. A file that can't be read, or an entry that is wrong, is reported and
// left out: the pick falls back to a photo's size and shape, never to a guess from a bad entry.

const NOTES_NAME = 'photo-notes.json';
const TYPES = new Set(['finished job', 'before-after', 'work in progress', 'team', 'van', 'premises', 'logo', 'detail', 'reject']);

const norm = s => String(s == null ? '' : s).trim().toLowerCase();
const isNotesFile = f => /^photo-notes(\.json)?$/i.test(String((f && f.name) || '').trim());

// text → { notes: { version, sorted_on, labels, photos: [clean entries] } | null, problems: [] }
function parseNotes(text) {
  const problems = [];
  let raw;
  try { raw = JSON.parse(String(text || '').replace(/^﻿/, '').trim()); }
  catch (e) { return { notes: null, problems: [`${NOTES_NAME} is not valid JSON, so it was not used (${e.message}).`] }; }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.photos)) return { notes: null, problems: [`${NOTES_NAME} has no "photos" list, so it was not used.`] };
  const photos = [];
  let bad = 0;
  for (const p of raw.photos) {
    const name = p && typeof p.name === 'string' ? p.name.trim() : '';
    if (!name) { bad++; continue; }
    const type = norm(p.type);
    const score = Number(p.score);
    photos.push({
      name, md5: /^[0-9a-f]{32}$/i.test(String(p.md5 || '')) ? String(p.md5).toLowerCase() : '',
      folder: String(p.folder || '').trim(), type: TYPES.has(type) ? type : '',
      service: String(p.service || '').trim(),
      score: Number.isFinite(score) && score >= 1 && score <= 10 ? Math.round(score) : null,
      hero: p.hero === true, staff_face: p.staff_face === true,
      shows: String(p.shows || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      pair: String(p.pair || '').trim(), reject_reason: String(p.reject_reason || '').trim(),
    });
  }
  if (bad) problems.push(`${bad} entr${bad === 1 ? 'y' : 'ies'} in ${NOTES_NAME} ha${bad === 1 ? 's' : 've'} no file name and ${bad === 1 ? 'was' : 'were'} left out.`);
  return { notes: { version: Number(raw.version) || 1, sorted_on: String(raw.sorted_on || ''), labels: Array.isArray(raw.labels) ? raw.labels.map(String) : [], photos }, problems };
}

// A lookup from a Drive photo row to its entry: the MD5 first (a copy keeps its original's), then the
// file name when only one entry has it
function indexNotes(notes) {
  const byMd5 = new Map(), byName = new Map();
  for (const p of (notes && notes.photos) || []) {
    if (p.md5 && !byMd5.has(p.md5)) byMd5.set(p.md5, p);
    const k = norm(p.name);
    byName.set(k, byName.has(k) ? null : p);
  }
  return row => (row && ((row.md5 && byMd5.get(String(row.md5).toLowerCase())) || byName.get(norm(row.name)))) || null;
}

// How many of the read's photos have an entry, for the Photos card
function coverage(notes, files) {
  const find = indexNotes(notes);
  const withNotes = (files || []).filter(f => find(f)).length;
  return { photos: (files || []).length, with_notes: withNotes, heroes: (files || []).filter(f => { const n = find(f); return n && n.hero; }).length };
}

module.exports = { NOTES_NAME, isNotesFile, parseNotes, indexNotes, coverage };
