'use strict';

// ── Which photo goes in which slot on which page (13 Nov 2026) ───────────────
// Pure. Code picks; a person swaps and approves on the Images tab (images/service.js); nothing
// here reads Drive or a site.
//
// The photos are the client's sorted Drive folders (drive/photos.js) with the sort skill's notes
// (drive/notes.js): a score, whether a photo suits a hero, what it shows, its service.
//   a service page          its own service folder (the town version: the same folder)
//   a category page         its services' folders (the town version: the same)
//   the homepage, a location page   every job photo, and the Photo Drip photos that show no one service
// Brandon's rules (13 Nov): a slot with no suitable photo is left empty and listed; a town page
// reuses the base page's photos, rotated so pages don't all share one hero; the gallery is up to 6.
// No photo is on one page twice. Icons are the template's and are not slots.
//
// With no notes for a photo, it is judged on size and shape only: wide and at least 1600px across
// can be a hero. A photo's alt text is the notes' sentence, as written; with none it is empty.

const { identityOf } = require('../page-map/generator');
const { indexNotes } = require('../drive/notes');
const { BRAND } = require('../drive/photos');

const GALLERY = 6;
const RUNNERS = 5;
// What sharp can read and a browser can show once it is WebP
const WEB_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIN_WIDTH = 800, HERO_WIDTH = 1600;
const PEOPLE = new Set(['team', 'van', 'premises', 'logo']);

const norm = s => String(s == null ? '' : s).trim().toLowerCase();
const words = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;

// A Drive row with what the notes say about it
function describe(row, note) {
  const wide = row.width && row.height ? row.width > row.height : null;
  const type = note ? note.type : '';
  let unusable = '';
  if (!WEB_TYPES.has(String(row.mime_type || ''))) unusable = `${String(row.mime_type || 'this type').replace('image/', '').toUpperCase()} can't go on the site`;
  else if (row.width && row.width < MIN_WIDTH) unusable = `only ${row.width}px wide`;
  else if (type === 'reject') unusable = 'rejected in the photo sort';
  const heroShape = wide === true && row.width >= HERO_WIDTH;
  return {
    file_id: row.file_id, name: row.name, kind: row.kind, label: row.label, width: row.width || null, height: row.height || null, web_link: row.web_link || '',
    noted: !!note, type, score: note && note.score != null ? note.score : null, shows: note ? note.shows : '', staff_face: !!(note && note.staff_face),
    // The notes decide when there are any, but never past the shape: a tall or small photo can't fill a banner
    hero: note ? note.hero && wide !== false && (!row.width || row.width >= 1200) : heroShape,
    service: '', note_service: note ? note.service : '', unusable,
    rank: (note && note.score != null ? note.score : 0) * 1e9 + (row.width || 0) * (row.height || 0),
  };
}

// The Drive folder a service page's photos are in: the saved label groups first (leadsnap/autopost/intake.js
// groupServices: a label and the service pages behind it), then a folder of the page's own name, then the
// longest folder name whose words are all in the title
function folderFor(title, folders, groups) {
  const t = norm(title);
  const have = new Map(folders.map(f => [norm(f), f]));
  for (const g of groups || []) if ((g.services || []).some(s => norm(s) === t) && have.has(norm(g.folder))) return have.get(norm(g.folder));
  if (have.has(t)) return have.get(t);
  const tw = new Set(words(title).map(w => w.replace(/s$/, '')));
  const fits = folders.filter(f => { const fw = words(f).map(w => w.replace(/s$/, '')); return fw.length && fw.every(w => tw.has(w)); });
  return fits.sort((a, b) => b.length - a.length)[0] || null;
}

// rows: the saved page map rows; photos: drive_photos rows; notes: the parsed notes or null;
// groups: [{ folder, services }] or null; cards: Map page path → [card target paths] (from the written copy)
// choices: Map page identity → Map slot → the photo a person chose, or '' for "leave it empty"
function pickImages({ rows = [], photos = [], notes = null, groups = null, cards = new Map(), choices = new Map(), gallerySize = GALLERY } = {}) {
  const find = indexNotes(notes);
  const all = photos.map(r => describe(r, find(r)));
  const folders = [...new Set(photos.filter(p => p.kind === 'post' && p.label !== BRAND).map(p => p.label))];
  const byFolder = new Map(folders.map(f => [norm(f), f]));
  for (const p of all) {
    if (p.kind === 'post' && p.label !== BRAND) p.service = p.label;
    // A Photo Drip photo the notes tie to one service joins that service's photos
    else if (p.kind === 'drip') p.service = byFolder.get(norm(p.note_service)) || '';
  }
  const ok = all.filter(p => !p.unusable);
  const jobs = ok.filter(p => p.service);
  const general = ok.filter(p => !p.service && p.kind === 'drip' && !PEOPLE.has(p.type));
  const brand = ok.filter(p => p.kind === 'post' && p.label === BRAND);

  const pages = rows.filter(live);
  const byPath = new Map(pages.map(r => [r.slug, r]));
  const services = pages.filter(r => r.type === 'service');
  const serviceById = new Map(services.map(r => [r.info && r.info.service_id, r]));
  const folderOf = new Map(services.map(r => [r.info && r.info.service_id, folderFor(r.title, folders, groups)]));
  const servicePool = id => { const f = folderOf.get(id); return f ? jobs.filter(p => p.service === f) : []; };
  const categoryPool = key => { const fs = new Set(services.filter(s => ((s.info && s.info.parent_keys) || []).includes(key)).map(s => folderOf.get(s.info.service_id)).filter(Boolean)); return jobs.filter(p => fs.has(p.service)); };
  const everything = [...jobs, ...general];
  const poolOf = r => {
    if (!r) return [];
    if (r.type === 'service' || r.type === 'town_service') return servicePool(r.info && r.info.service_id);
    if (r.type === 'category' || r.type === 'location_category') return categoryPool(r.info && r.info.category_key);
    return everything;
  };
  const what = r => (r.type === 'service' || r.type === 'town_service' ? ((serviceById.get(r.info && r.info.service_id) || r).title) : r.type === 'category' || r.type === 'location_category' ? r.title : 'this client');

  const uses = new Map();
  const byRank = (a, b) => b.rank - a.rank;
  // The least used first, so pages sharing photos don't all show the same one; then the best
  const spread = (a, b) => ((uses.get(a.file_id) || 0) - (uses.get(b.file_id) || 0)) || byRank(a, b);
  const order = ['homepage', 'category', 'service', 'location', 'location_category', 'town_service'];
  const out = [];
  const byId = new Map(all.map(p => [p.file_id, p]));
  for (const r of pages.filter(p => order.includes(p.type)).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))) {
    const identity = r.type === 'homepage' ? 'homepage' : identityOf(r);
    const pool = poolOf(r);
    // A person's choices come first: their photos are held back from the other slots, which pick around them
    const chosen = choices.get(identity) || new Map();
    const held = id => { const p = byId.get(id); return !!(p && !p.unusable); };
    const taken = new Set([...chosen.values()].filter(held));
    const slots = [];
    const put = (slot, label, cands, sort, why) => {
      const list = cands.filter(p => !taken.has(p.file_id)).sort(sort);
      const ids = n => list.slice(0, n).map(p => p.file_id);
      const c = chosen.has(slot) ? chosen.get(slot) : undefined;
      if (c === '') { slots.push({ slot, label, pick: null, runners: ids(RUNNERS), chosen: true, why: 'Left empty by hand.' }); return null; }
      if (c !== undefined && held(c)) { uses.set(c, (uses.get(c) || 0) + 1); slots.push({ slot, label, pick: c, runners: ids(RUNNERS), chosen: true, why: '' }); return c; }
      const pick = list[0] || null;
      if (pick) { taken.add(pick.file_id); uses.set(pick.file_id, (uses.get(pick.file_id) || 0) + 1); }
      // stale: a person's choice that is no longer in Drive, so the pick stands in
      slots.push({ slot, label, pick: pick ? pick.file_id : null, runners: list.slice(1, 1 + RUNNERS).map(p => p.file_id), why: pick ? '' : why, ...(c !== undefined ? { stale: true } : {}) });
      return pick ? pick.file_id : null;
    };
    const work = pool.filter(p => !PEOPLE.has(p.type));
    put('hero', 'Hero background', work.filter(p => p.hero && (!p.type || p.type === 'finished job')), spread,
      pool.length ? `No photo of ${what(r)} suits a hero: it needs a wide, clean shot of the finished work, at least ${HERO_WIDTH}px across.` : `No photos of ${what(r)} yet.`);
    put('content', 'Content image', work.filter(p => !p.type || p.type === 'finished job' || p.type === 'before-after'), spread, pool.length ? `No second photo of ${what(r)}.` : `No photos of ${what(r)} yet.`);
    if (r.type !== 'service' && r.type !== 'town_service') {
      for (const target of cards.get(r.slug) || []) {
        const t = byPath.get(target);
        const tp = poolOf(t).filter(p => !PEOPLE.has(p.type) && (!p.type || p.type === 'finished job' || p.type === 'before-after'));
        put(`card:${target}`, `Card: ${t ? t.title : target}`, t && t.type !== 'location' ? tp : [], byRank, t ? `No photo of ${t.title}.` : `The card's page (${target}) is not in the build.`);
      }
    }
    if (r.type === 'homepage') {
      const team = brand.filter(p => p.type === 'team' || p.staff_face);
      // With no notes nobody can say which Brand photo is the owner: a person chooses from them
      const got = put('owner', 'Owner photo', team, byRank, brand.length ? 'Choose the owner photo from the Brand folder.' : 'No Brand photos yet.');
      const owner = slots[slots.length - 1];
      if (!got && !owner.chosen && !team.length) owner.runners = brand.filter(p => !taken.has(p.file_id)).sort(byRank).slice(0, RUNNERS).map(p => p.file_id);
    } else {
      // Up to gallerySize, from what is left; one empty slot is shown when there is nothing, so it can be listed
      for (let i = 1; i <= gallerySize; i++) {
        const key = `gallery:${i}`;
        const left = work.some(p => !taken.has(p.file_id));
        if (!left && !chosen.has(key) && i > 1) break;
        put(key, `Gallery ${i}`, work, spread, pool.length ? `No photos of ${what(r)} left for a gallery.` : `No photos of ${what(r)} yet.`);
        if (!left && !chosen.has(key)) break;
      }
    }
    out.push({ identity, path: r.slug, title: r.title, type: r.type, pool: pool.length, slots });
  }
  const photoMap = Object.fromEntries(all.map(p => [p.file_id, { name: p.name, shows: p.shows, score: p.score, hero: p.hero, type: p.type, service: p.service || (p.kind === 'post' ? p.label : ''), kind: p.kind, width: p.width, height: p.height, web_link: p.web_link, noted: p.noted, unusable: p.unusable }]));
  const noFolder = services.filter(s => !folderOf.get(s.info && s.info.service_id)).map(s => s.title);
  return {
    pages: out, photos: photoMap,
    summary: {
      photos: all.length, usable: ok.length, with_notes: all.filter(p => p.noted).length, no_description: ok.filter(p => !p.shows).length,
      empty: out.reduce((n, p) => n + p.slots.filter(s => !s.pick).length, 0), filled: out.reduce((n, p) => n + p.slots.filter(s => s.pick).length, 0),
      services_with_no_folder: noFolder,
    },
  };
}

module.exports = { pickImages, folderFor, describe, GALLERY, HERO_WIDTH };
