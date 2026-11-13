'use strict';

// ── Shrinking a photo, and where each slot goes on the site (13 Nov 2026) ────
// Pure but for sharp. images/service.js does the Drive, WordPress and database work.
//
// Sizes and format (Brandon, 13 Nov): WebP; a hero 1920px wide, a content image and a gallery
// photo 1200px, a card and the owner photo 800px. A photo is never made bigger than it is.
//
// A slot is an ACF image field on the page's entry (wp/acf-schema.js: the fields marked
// push: false that the copy push never sends). An empty slot is not written, so a picture put
// there by hand stays.

const WIDTHS = { hero: 1920, content: 1200, gallery: 1200, card: 800, owner: 800 };
const QUALITY = 80;
const kindOf = slot => String(slot).split(':')[0];
const widthFor = slot => WIDTHS[kindOf(slot)] || 1200;

// A crop a person drew on the photo for one slot: the box as fractions of the photo, { x, y, w, h } from 0 to 1.
// Null when it is not a usable box. A box of nearly the whole photo is no crop.
function cleanCrop(c) {
  if (!c || typeof c !== 'object') return null;
  const n = k => Number(c[k]);
  const x = Math.min(Math.max(n('x'), 0), 1), y = Math.min(Math.max(n('y'), 0), 1);
  const w = Math.min(n('w'), 1 - x), h = Math.min(n('h'), 1 - y);
  if (![x, y, w, h].every(Number.isFinite) || w < 0.05 || h < 0.05) return null;
  if (w > 0.995 && h > 0.995) return null;
  const r = v => Math.round(v * 10000) / 10000;
  return { x: r(x), y: r(y), w: r(w), h: r(h) };
}
// How a crop is written into a key (the upload kept for it, the approval): "" for none
const cropKey = c => (c ? [c.x, c.y, c.w, c.h].join(',') : '');

// bytes → { bytes, width, height } as WebP at the slot's width (or `width`), turned the right way up, and cut to
// the crop first when there is one
async function shrink(bytes, slot, crop = null, width = null) {
  const sharp = require('sharp');
  let src = bytes;
  const c = cleanCrop(crop);
  if (c) {
    // Turned first, so the box is on the photo as a person saw it
    const up = await sharp(bytes, { failOn: 'none' }).rotate().toBuffer({ resolveWithObject: true });
    const W = up.info.width, H = up.info.height;
    const left = Math.min(Math.round(c.x * W), W - 1), top = Math.min(Math.round(c.y * H), H - 1);
    src = await sharp(up.data).extract({ left, top, width: Math.max(1, Math.min(Math.round(c.w * W), W - left)), height: Math.max(1, Math.min(Math.round(c.h * H), H - top)) }).toBuffer();
  }
  const out = await sharp(src, { failOn: 'none' }).rotate().resize({ width: width || widthFor(slot), withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer({ resolveWithObject: true });
  return { bytes: out.data, width: out.info.width, height: out.info.height };
}

// A file name for the site: what the photo shows, else its own name; letters, digits and hyphens
function fileName(photo, slot) {
  const base = String((photo && (photo.shows || photo.name)) || 'photo').replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-') || 'photo';
  return `${base}-${widthFor(slot)}.webp`;
}

const PREFIX = { category: 'cat', location_category: 'cat', service: 'svc', town_service: 'svc', location: 'loc' };

// The ACF values a page's placed slots make. slots: [{ slot, media_id, alt }] (only slots with a
// photo on the site); type: the page map row type; current: the entry's ACF values now (for the
// card rows, which are written whole so their text stays).
// → { acf, skipped: [why] }
function fieldsFor(type, slots, current = {}) {
  const home = type === 'homepage';
  const p = PREFIX[type];
  if (!home && !p) throw new Error(`No image fields for a ${type} page.`);
  const acf = {}, skipped = [];
  const by = kind => slots.filter(s => kindOf(s.slot) === kind);
  const hero = by('hero')[0], content = by('content')[0], owner = by('owner')[0];
  if (hero) acf[home ? 'home_hero_background_image' : `${p}_hero_background_image`] = hero.media_id;
  if (content) {
    acf[home ? 'home_content_block_image' : `${p}_content_image`] = content.media_id;
    acf[home ? 'home_content_block_image_alt' : `${p}_content_image_alt`] = content.alt || '';
  }
  if (home && owner) { acf.home_owner_photo = owner.media_id; acf.home_owner_photo_alt = owner.alt || ''; }
  const gallery = by('gallery').sort((a, b) => Number(a.slot.split(':')[1]) - Number(b.slot.split(':')[1]));
  if (!home && gallery.length) acf[`${p}_gallery`] = gallery.map(g => ({ gallery_image: g.media_id, gallery_alt: g.alt || '' }));
  // Cards: the rows the copy push made, each with its picture. Without the rows there is nothing to hang one on
  const cards = by('card');
  if (cards.length && type !== 'service' && type !== 'town_service') {
    const field = home ? 'home_services_cards' : `${p}_services_cards`;
    const rows = Array.isArray(current[field]) ? current[field] : [];
    if (!rows.length) skipped.push('The page has no cards on the site yet: push its copy first, then place the images again.');
    else {
      const byUrl = new Map(cards.map(c => [c.slot.slice('card:'.length), c.media_id]));
      let hit = 0;
      const next = rows.map(r => { const id = byUrl.get(String(r.card_url || '').replace(/\/+$/, '') || '/'); if (id) hit++; return id ? { ...r, card_image: id } : r; });
      if (hit) acf[field] = next;
      if (hit < cards.length) skipped.push(`${cards.length - hit} card image${cards.length - hit === 1 ? '' : 's'} had no matching card on the site.`);
    }
  }
  return { acf, skipped };
}

// An image field as the site gives it back: an id, or an object or array carrying one
const idOf = v => (v && typeof v === 'object' ? Number(v.ID || v.id) || 0 : Number(v) || 0);

// What of `acf` the site does not hold (the read-back)
function notPlaced(acf, now = {}) {
  const out = [];
  for (const [k, v] of Object.entries(acf)) {
    if (Array.isArray(v)) {
      const rows = Array.isArray(now[k]) ? now[k] : [];
      v.forEach((row, i) => { for (const sub of ['gallery_image', 'card_image']) if (row[sub] && idOf((rows[i] || {})[sub]) !== Number(row[sub])) out.push(`${k}[${i + 1}].${sub}`); });
    } else if (typeof v === 'number') { if (idOf(now[k]) !== v) out.push(k); }
    else if (String(now[k] == null ? '' : now[k]) !== String(v)) out.push(k);
  }
  return out;
}

module.exports = { WIDTHS, QUALITY, widthFor, kindOf, cleanCrop, cropKey, shrink, fileName, fieldsFor, notPlaced, idOf };
