'use strict';

// ── Website images for one client (13 Nov 2026) ──────────────────────────────
// What the Images tab calls (images/routes.js):
//   view      every page in the build with its slots: the pick (images/pick.js), a person's choice
//             over it, and whether the page is approved. Reads only.
//   choose    put another photo in a slot, or leave it empty. Un-approves the page.
//   approve   a person says a page's pictures are right (one page, or every page with a photo)
//   placePage shrink, upload and place one approved page's pictures on the staging site. The
//             screen calls it page by page, so a big site never waits on one request.
// Nothing is placed without an approval and a confirm; staging sites only, as the copy push. An
// empty slot is never written, and nothing on the site is deleted. A photo is uploaded once per
// site and size (wp_media), and used again after that.

const { pickImages } = require('./pick');
const { shrink, fileName, fieldsFor, notPlaced, widthFor, cleanCrop, cropKey } = require('./place');
const { ensureUploadTables, createUploads, isUpload } = require('./uploads');

async function ensureImageTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_image_choices (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      identity    TEXT NOT NULL,
      slot        TEXT NOT NULL,
      file_id     TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, identity, slot)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_image_approvals (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      identity    TEXT NOT NULL,
      slots       JSONB NOT NULL,
      approved_by TEXT,
      approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, identity)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wp_media (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      site        TEXT NOT NULL,
      file_id     TEXT NOT NULL,
      width       INTEGER NOT NULL,
      media_id    INTEGER NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, site, file_id, width)
    )`);
  // A crop a person drew for one slot: the box as fractions of the photo (images/place.js cleanCrop)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_image_crops (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      identity    TEXT NOT NULL,
      slot        TEXT NOT NULL,
      crop        TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, identity, slot)
    )`);
  await ensureUploadTables(pool);
}

const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
// The slots that hold a photo, as an approval keeps them
const filled = page => page.slots.filter(s => s.pick).map(s => ({ slot: s.slot, file_id: s.pick, ...(s.crop ? { crop: cropKey(s.crop) } : {}) }));
const sameSlots = (a, b) => JSON.stringify([...a].sort((x, y) => x.slot.localeCompare(y.slot))) === JSON.stringify([...b].sort((x, y) => x.slot.localeCompare(y.slot)));

// pool; pageRows(clientId) → the saved page map rows; readDrive(clientId) → the last Drive read
// ({ files, photo_notes, last_ok_at }) or null; groupsFor(clientId) → [{ folder, services }] or null;
// cardsFor(clientId) → Map page path → [card target paths]; getSite(clientId) → the WordPress site or
// null; getDrive() → the Drive client; createLog(clientId) → { appendLog }; wp: wp/client.js (for tests)
// heroChoiceFor(clientId) → 'photo' | 'illustration' | 'none': the client's onboarding answer (images/pick.js heroChoiceOf)
// describe({ bytes, name }) → the alt text Copybot writes for a photo by looking at it (images/alt.js), or null when
// there is no model to ask
function createImages({ pool, pageRows, readDrive, groupsFor, cardsFor, getSite, getDrive, createLog, heroChoiceFor = async () => 'none', describe = null, wp = require('../wp/client') }) {
  const uploads = createUploads(pool);
  // A photo's bytes: one a person added, or one in Drive
  const bytesOf = (clientId, fileId) => (isUpload(fileId) ? uploads.bytes(clientId, fileId) : getDrive().download(fileId));

  async function state(clientId) {
    const [rows, read, groups, cards, added, { rows: cr }, { rows: ch }, { rows: ap }] = await Promise.all([
      pageRows(clientId), readDrive(clientId), groupsFor(clientId).catch(() => null), cardsFor(clientId).catch(() => new Map()),
      uploads.list(clientId), pool.query(`SELECT identity, slot, crop FROM page_image_crops WHERE client_id = $1`, [clientId]),
      pool.query(`SELECT identity, slot, file_id FROM page_image_choices WHERE client_id = $1`, [clientId]),
      pool.query(`SELECT identity, slots, approved_by, approved_at FROM page_image_approvals WHERE client_id = $1`, [clientId]),
    ]);
    const choices = new Map();
    for (const c of ch) { if (!choices.has(c.identity)) choices.set(c.identity, new Map()); choices.get(c.identity).set(c.slot, c.file_id); }
    const ok = !!(read && read.last_ok_at);
    // A person's choices go into the pick, so the other slots on the page choose around them
    // Photos a person added by hand are in with the Drive photos, but code never picks one: they go where they are put
    const picked = pickImages({ rows, photos: [...(ok ? read.files : []), ...added], notes: ok ? read.photo_notes : null, groups, cards, choices, heroChoice: await heroChoiceFor(clientId).catch(() => 'none') });
    const drive = { read: ok, error: read ? read.error : null, last_ok_at: read ? read.last_ok_at : null, notes: !!(ok && read.photo_notes) };
    const approvals = new Map(ap.map(a => [a.identity, { slots: parse(a.slots) || [], by: a.approved_by, at: a.approved_at }]));
    const crops = new Map(cr.map(c => [`${c.identity}|${c.slot}`, cleanCrop(parse(c.crop))]));
    const pages = picked.pages.map(p => {
      // A crop belongs to the photo in the slot: it is kept only while that slot holds a photo
      const page = { ...p, slots: p.slots.map(sl => { const c = sl.pick && crops.get(`${p.identity}|${sl.slot}`); return c ? { ...sl, crop: c } : sl; }) };
      const a = approvals.get(page.identity);
      const current = !!a && sameSlots(a.slots, filled(page));
      return { ...page, approved: current, approved_at: current ? a.at : null, approved_by: current ? a.by : null, changed_since_approval: !!a && !current };
    });
    return { pages, photos: picked.photos, summary: { ...picked.summary, pages: pages.length, approved: pages.filter(p => p.approved).length, with_photos: pages.filter(p => filled(p).length).length, added: added.length, stock: added.filter(u => u.source === 'stock').length }, drive };
  }

  async function view(clientId) {
    const s = await state(clientId);
    const site = await getSite(clientId);
    return { ...s, site: site ? { url: site.url, staging: !!site.staging } : null };
  }

  async function choose(clientId, { identity, slot, file_id: fileId = '' } = {}) {
    const s = await state(clientId);
    const page = s.pages.find(p => p.identity === identity);
    if (!page) throw bad('That page is not in the build.');
    if (!page.slots.some(x => x.slot === slot)) throw bad('That page has no such slot.');
    if (fileId !== '') {
      const photo = s.photos[fileId];
      if (!photo) throw bad('That photo is not in the client\'s Drive folders or added photos. Read Drive again.');
      if (photo.unusable) throw bad(`That photo can't be used: ${photo.unusable}.`);
      // A photo the code put in another slot moves here and that slot picks again; one a person put there stays
      if (page.slots.some(x => x.slot !== slot && x.chosen && x.pick === fileId)) throw bad('That photo is already in another slot on this page that was chosen by hand.');
    }
    const u = await pool.query(`UPDATE page_image_choices SET file_id = $4, updated_at = NOW() WHERE client_id = $1 AND identity = $2 AND slot = $3`, [clientId, identity, slot, fileId]);
    if (!u.rowCount) await pool.query(`INSERT INTO page_image_choices (client_id, identity, slot, file_id) VALUES ($1, $2, $3, $4)`, [clientId, identity, slot, fileId]);
    // A crop was drawn on the photo that was there: it goes with it
    await pool.query(`DELETE FROM page_image_crops WHERE client_id = $1 AND identity = $2 AND slot = $3`, [clientId, identity, slot]);
    await pool.query(`DELETE FROM page_image_approvals WHERE client_id = $1 AND identity = $2`, [clientId, identity]);
    return view(clientId);
  }

  // A photo dropped in by hand (a stock photo, or one the client sent late): shrunk and kept, and put in the slot
  // it was dropped on when one is named
  async function upload(clientId, { name, bytes, alt = '', source = 'stock', by = '', identity = '', slot = '' } = {}) {
    if (identity) {
      const page = (await state(clientId)).pages.find(p => p.identity === identity);
      if (!page) throw bad('That page is not in the build.');
      if (!page.slots.some(x => x.slot === slot)) throw bad('That page has no such slot.');
    }
    const added = await uploads.add(clientId, { name, bytes, alt, source, by });
    // No alt text typed: Copybot looks at the photo and writes it. A failure leaves it blank, and says so
    const typed = String(alt || '').trim();
    let wrote = '', altError = '';
    if (!typed && describe) {
      try { wrote = await describe({ bytes, name }); if (wrote) await uploads.setAlt(clientId, added.id, wrote); else altError = 'Copybot could not write the alt text for this photo. Type it in.'; }
      catch (e) { altError = `Copybot could not write the alt text (${e.message}). Type it in.`; }
    }
    const v = identity ? await choose(clientId, { identity, slot, file_id: added.id }) : await view(clientId);
    return { ...v, added: { ...added, alt: typed || wrote, alt_by: typed ? 'typed' : wrote ? 'copybot' : '', alt_error: altError } };
  }

  async function setAlt(clientId, { file_id: fileId, alt = '' } = {}) {
    if (!isUpload(fileId)) throw bad("Only a photo added by hand has alt text to type. A Drive photo's comes from the photo sort's notes.");
    await uploads.setAlt(clientId, fileId, alt);
    return view(clientId);
  }

  // Copybot writes (or writes again) the alt text of a photo added by hand, from the copy it kept
  async function writeAlt(clientId, { file_id: fileId } = {}) {
    if (!isUpload(fileId)) throw bad("Only a photo added by hand gets its alt text written here. A Drive photo's comes from the photo sort's notes.");
    if (!describe) throw bad('Copybot has no model to ask (no API key on this server). Type the alt text in.');
    const alt = await describe({ bytes: await uploads.bytes(clientId, fileId), name: (await uploads.list(clientId)).find(u => u.file_id === fileId).name });
    if (!alt) throw bad('Copybot could not write the alt text for this photo. Type it in.', 502);
    await uploads.setAlt(clientId, fileId, alt);
    return { ...(await view(clientId)), alt };
  }

  // crop: { x, y, w, h } as fractions of the photo, or null to clear it
  async function crop(clientId, { identity, slot, crop: box = null } = {}) {
    const page = (await state(clientId)).pages.find(p => p.identity === identity);
    if (!page) throw bad('That page is not in the build.');
    const sl = page.slots.find(x => x.slot === slot);
    if (!sl) throw bad('That page has no such slot.');
    if (!sl.pick) throw bad('There is no photo in that slot to crop.');
    const clean = cleanCrop(box);
    if (box && !clean) throw bad('That crop is too small. Draw a bigger box.');
    await pool.query(`DELETE FROM page_image_crops WHERE client_id = $1 AND identity = $2 AND slot = $3`, [clientId, identity, slot]);
    if (clean) await pool.query(`INSERT INTO page_image_crops (client_id, identity, slot, crop) VALUES ($1, $2, $3, $4)`, [clientId, identity, slot, JSON.stringify(clean)]);
    await pool.query(`DELETE FROM page_image_approvals WHERE client_id = $1 AND identity = $2`, [clientId, identity]);
    return view(clientId);
  }

  // A photo for the screen: one added by hand, at full size or as a thumbnail; and a slot as it will look on the
  // site, with its crop
  async function uploadImage(clientId, fileId, { thumb = false } = {}) {
    const bytes = await uploads.bytes(clientId, fileId);
    if (!thumb) return { bytes, type: 'image/jpeg' };
    return { bytes: (await shrink(bytes, 'card', null, 480)).bytes, type: 'image/webp' };
  }
  async function preview(clientId, { identity, slot, width = 480 } = {}) {
    const page = (await state(clientId)).pages.find(p => p.identity === identity);
    const sl = page && page.slots.find(x => x.slot === slot);
    if (!sl || !sl.pick) throw bad('There is no photo in that slot.', 404);
    return { bytes: (await shrink(await bytesOf(clientId, sl.pick), slot, sl.crop || null, Math.min(1600, Math.max(120, Number(width) || 480)))).bytes, type: 'image/webp' };
  }

  // identity: one page, or '*' for every page that has at least one photo
  async function approve(clientId, { identity, approved = true, by = '' } = {}) {
    const s = await state(clientId);
    const targets = identity === '*' ? s.pages.filter(p => filled(p).length) : s.pages.filter(p => p.identity === identity);
    if (!targets.length) throw bad(identity === '*' ? 'No page has a photo to approve.' : 'That page is not in the build.');
    for (const p of targets) {
      await pool.query(`DELETE FROM page_image_approvals WHERE client_id = $1 AND identity = $2`, [clientId, p.identity]);
      if (approved) {
        if (!filled(p).length) throw bad(`${p.title} has no photo to approve.`);
        await pool.query(`INSERT INTO page_image_approvals (client_id, identity, slots, approved_by) VALUES ($1, $2, $3, $4)`, [clientId, p.identity, JSON.stringify(filled(p)), String(by || '').slice(0, 80)]);
      }
    }
    return view(clientId);
  }

  // The photo on the site at this size: the one uploaded before when the site still has it, else a new upload
  async function mediaFor(clientId, site, photoId, slot, photo, counts, box = null) {
    const width = widthFor(slot);
    // A cropped photo is its own upload: the key carries the box
    const fileId = box ? `${photoId}#${cropKey(box)}` : photoId;
    const { rows } = await pool.query(`SELECT media_id FROM wp_media WHERE client_id = $1 AND site = $2 AND file_id = $3 AND width = $4`, [clientId, site.url, fileId, width]);
    if (rows.length) {
      const there = await wp.wpGet(site, `/wp/v2/media/${rows[0].media_id}?_fields=id`).then(() => true).catch(e => { if (/→ 404/.test(e.message)) return false; throw e; });
      if (there) { counts.reused++; return Number(rows[0].media_id); }
      await pool.query(`DELETE FROM wp_media WHERE client_id = $1 AND site = $2 AND file_id = $3 AND width = $4`, [clientId, site.url, fileId, width]);
    }
    const small = await shrink(await bytesOf(clientId, photoId), slot, box);
    const made = await wp.wpUpload(site, fileName(photo, slot), small.bytes, 'image/webp');
    await wp.wpPost(site, `/wp/v2/media/${made.id}`, { alt_text: photo.shows || '', title: photo.shows || photo.name || '' });
    await pool.query(`INSERT INTO wp_media (client_id, site, file_id, width, media_id) VALUES ($1, $2, $3, $4, $5)`, [clientId, site.url, fileId, width, made.id]);
    counts.uploaded++; counts.bytes += small.bytes.length;
    return Number(made.id);
  }

  async function placePage(clientId, { identity, confirm = false } = {}) {
    if (confirm !== true) throw bad('Placing images needs confirming.');
    const site = await getSite(clientId);
    if (!site) throw bad('This client has no WordPress site connected yet. Add it on the Pages tab.');
    const s = await state(clientId);
    const page = s.pages.find(p => p.identity === identity);
    if (!page) throw bad('That page is not in the build.');
    const log = createLog(clientId);
    const base = { action: 'images', site: site.url, path: page.path, pageType: page.type };
    const refuse = async refusals => { await log.appendLog({ ...base, result: 'refused', refusals }); return { ok: false, refusals, path: page.path, title: page.title }; };
    if (!site.staging) return refuse([`${site.url} is not marked as a staging site. Images are placed on staging sites only for now.`]);
    if (!page.approved) return refuse([page.changed_since_approval ? 'The page\'s pictures changed after it was approved. Approve it again.' : 'Approve the page\'s pictures first.']);
    const entry = page.type === 'homepage' ? await wp.findHomepage(site) : await wp.findInnerPage(site, { page_slug: page.path });
    if (!entry) return refuse([page.type === 'homepage' ? 'The homepage was not found on the site.' : 'The page is not on the site yet. Make the pages first: Pages tab, Pages on the site.']);

    const counts = { uploaded: 0, reused: 0, bytes: 0 };
    try {
      const placed = [];
      for (const sl of page.slots.filter(x => x.pick)) {
        const photo = s.photos[sl.pick];
        placed.push({ slot: sl.slot, media_id: await mediaFor(clientId, site, sl.pick, sl.slot, photo, counts, sl.crop || null), alt: photo.shows || '' });
      }
      const current = entry.acf && !Array.isArray(entry.acf) ? entry.acf : {};
      const { acf, skipped } = fieldsFor(page.type, placed, current);
      const rest = entry.rest || 'pages';
      if (Object.keys(acf).length) await wp.wpPost(site, `/wp/v2/${rest}/${entry.id}`, { acf });
      const after = await wp.readPage(site, entry.id, rest);
      const mismatches = notPlaced(acf, after.acf && !Array.isArray(after.acf) ? after.acf : {});
      const ok = !mismatches.length && !skipped.length;
      const result = mismatches.length ? 'placed, read-back differs' : skipped.length ? 'placed, some left out' : 'placed';
      await log.appendLog({ ...base, result, page: entry.id, slots: placed.length, ...counts, skipped, mismatches });
      return { ok, result, path: page.path, title: page.title, slots: placed.length, ...counts, skipped, mismatches, refusals: [] };
    } catch (e) {
      await log.appendLog({ ...base, result: 'failed', error: e.message, ...counts });
      return { ok: false, error: e.message, path: page.path, title: page.title, ...counts, refusals: [] };
    }
  }

  return { view, choose, approve, placePage, upload, setAlt, writeAlt, crop, uploadImage, preview };
}

module.exports = { ensureImageTables, createImages };
