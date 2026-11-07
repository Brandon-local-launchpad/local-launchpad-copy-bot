'use strict';

// ── A client's sorted photos in Drive ────────────────────────────────────────
// The gbp-photo-sort skill makes the folders, and their names are exact:
//   GBP Photos – Posts / [label]     one folder per Lead Snap label
//   GBP Photos – Posts / Brand       team, van, premises, logo
//   GBP Photos – Photo Drip          flat, the photos for the GBP Photos section
// The client's "Drive photo folder" is the folder holding those. readClientPhotos reads them (no
// database); the rest is pure: what a photo's problem is, and the counts the Lead Snap tab uses.

const { FOLDER_MIME } = require('./client');
const { POSTS_ROOT } = require('../leadsnap/autopost/decide');

const DRIP_ROOT = 'GBP Photos – Photo Drip';
const REJECTED_ROOT = 'GBP Photos – Rejected';
const BRAND = 'Brand';
// bundle.social's limits for a Google Business image (its Platform Limits page, 7 Nov 2026)
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 250;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);
const CONCURRENCY = 4;

const norm = s => String(s == null ? '' : s).trim().toLowerCase();
// For spotting a near miss: dashes and spaces ignored
const loose = s => norm(s).replace(/[\s\-–—_/]+/g, '');
const isFolder = f => f.mimeType === FOLDER_MIME;
const isImage = f => /^image\//.test(String(f.mimeType || ''));

// What stops this photo going out through bundle.social; '' when nothing does
function problemOf(f) {
  const type = String(f.mimeType || '');
  if (!TYPES.has(type)) return `${type.replace('image/', '').toUpperCase() || 'This type'} can't be published: it needs to be JPG, PNG or GIF`;
  const size = Number(f.size) || 0;
  if (size > MAX_BYTES) return `${(size / 1024 / 1024).toFixed(1)} MB is over the 5 MB limit`;
  const m = f.imageMediaMetadata || {};
  if (m.width && m.height && (m.width < MIN_SIDE || m.height < MIN_SIDE)) return `${m.width} x ${m.height} is under the ${MIN_SIDE} x ${MIN_SIDE} minimum`;
  return '';
}

const toRow = (f, kind, label, folderId) => ({
  file_id: f.id, kind, label, folder_id: folderId, name: f.name, mime_type: f.mimeType,
  size_bytes: Number(f.size) || 0, width: (f.imageMediaMetadata || {}).width || null, height: (f.imageMediaMetadata || {}).height || null,
  md5: f.md5Checksum || '', modified_at: f.modifiedTime || null, web_link: f.webViewLink || '', problem: problemOf(f),
});

async function mapLimited(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return out;
}

// { folder_id, folder_name, posts_found, drip_found, folders: [{ label, id }], files: [rows], problems, notes }
// Problems are things a person must fix; notes are things left out. Only an unreadable folder throws.
async function readClientPhotos({ drive, folderId }) {
  const root = await drive.folder(folderId);
  if (root.mimeType !== FOLDER_MIME) throw Object.assign(new Error('That link is a file, not a folder. Use the client\'s photo folder.'), { status: 400 });
  if ([POSTS_ROOT, DRIP_ROOT, REJECTED_ROOT].includes(root.name)) throw Object.assign(new Error(`That link is the "${root.name}" folder. Use the folder that holds it.`), { status: 400 });

  const kids = await drive.list(folderId);
  const problems = [], notes = [], files = [], folders = [];
  const named = want => {
    const hit = kids.find(k => isFolder(k) && k.name === want);
    if (hit) return hit;
    const near = kids.find(k => isFolder(k) && loose(k.name) === loose(want));
    problems.push(near ? `A folder is called "${near.name}". The name has to be exactly "${want}", so it was not read.` : `No "${want}" folder in "${root.name}". Run the photo sort first.`);
    return null;
  };

  let ignored = 0;
  const posts = named(POSTS_ROOT);
  if (posts) {
    const inPosts = await drive.list(posts.id);
    const labels = inPosts.filter(isFolder);
    const looseFiles = inPosts.filter(f => !isFolder(f) && isImage(f));
    if (looseFiles.length) notes.push(`${looseFiles.length} photo${looseFiles.length === 1 ? ' is' : 's are'} loose in "${POSTS_ROOT}", not in a service folder, so ${looseFiles.length === 1 ? 'it is' : 'they are'} not counted.`);
    const lists = await mapLimited(labels, l => drive.list(l.id));
    labels.forEach((l, i) => {
      folders.push({ label: l.name, id: l.id });
      for (const f of lists[i]) {
        if (isFolder(f)) notes.push(`"${l.name}" has a folder inside it ("${f.name}"), which was not read.`);
        else if (isImage(f)) files.push(toRow(f, 'post', l.name, l.id));
        else ignored++;
      }
    });
  }
  const drip = named(DRIP_ROOT);
  if (drip) {
    for (const f of await drive.list(drip.id)) {
      if (isFolder(f)) notes.push(`"${DRIP_ROOT}" has a folder inside it ("${f.name}"), which was not read.`);
      else if (isImage(f)) files.push(toRow(f, 'drip', DRIP_ROOT, drip.id));
      else ignored++;
    }
  }
  if (ignored) notes.push(`${ignored} file${ignored === 1 ? ' is' : 's are'} not a photo and ${ignored === 1 ? 'was' : 'were'} left out.`);
  return { folder_id: folderId, folder_name: root.name, posts_found: !!posts, drip_found: !!drip, folders, files, problems, notes };
}

// ── The counts ──
// groups: the Lead Snap labels. A label's count is the photos in the folder of that name, whatever
// their problems (the problems show beside them); a label with no folder keeps `fallback`'s count,
// which is 0 unless a rename is carrying one across (routes.js).
function countsFrom(groups, read, fallback = {}) {
  const by = new Map();
  for (const f of read.folders || []) by.set(norm(f.label), 0);
  for (const f of read.files || []) if (f.kind === 'post') by.set(norm(f.label), (by.get(norm(f.label)) || 0) + 1);
  const counts = {};
  for (const g of groups) counts[g.key] = by.has(norm(g.folder)) ? by.get(norm(g.folder)) : (Number(fallback[g.key]) || 0);
  return { counts, brand: by.get(norm(BRAND)) || 0 };
}

// Drive stands in for the typed counts only when it has been read from this client's folder
const driveActive = (read, folderId) => !!(read && read.last_ok_at && folderId && read.folder_id === folderId && read.posts_found);

// What a person should know about how the folders match the labels
function matchNotes(groups, read) {
  const have = new Set((read.folders || []).map(f => norm(f.label)));
  const want = new Set(groups.map(g => norm(g.folder)));
  const out = [];
  const noFolder = groups.filter(g => !have.has(norm(g.folder))).map(g => g.folder);
  if (noFolder.length) out.push(`No folder yet for: ${noFolder.join(', ')}. ${noFolder.length === 1 ? 'It counts' : 'They count'} as 0 photos. Use Copy for photo sort so the skill names them exactly.`);
  const spare = (read.folders || []).map(f => f.label).filter(l => !want.has(norm(l)) && norm(l) !== norm(BRAND));
  if (spare.length) out.push(`These folders match no service, so their photos are not used: ${spare.join(', ')}.`);
  const bad = (read.files || []).filter(f => f.problem).length;
  if (bad) out.push(`${bad} photo${bad === 1 ? '' : 's'} can't go out through bundle.social as ${bad === 1 ? 'it is' : 'they are'}: see the list.`);
  return out;
}

module.exports = { readClientPhotos, problemOf, countsFrom, driveActive, matchNotes, DRIP_ROOT, BRAND, MAX_BYTES, MIN_SIDE };
