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
const { shrink, fileName, fieldsFor, notPlaced, widthFor } = require('./place');

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
}

const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
// The slots that hold a photo, as an approval keeps them
const filled = page => page.slots.filter(s => s.pick).map(s => ({ slot: s.slot, file_id: s.pick }));
const sameSlots = (a, b) => JSON.stringify([...a].sort((x, y) => x.slot.localeCompare(y.slot))) === JSON.stringify([...b].sort((x, y) => x.slot.localeCompare(y.slot)));

// pool; pageRows(clientId) → the saved page map rows; readDrive(clientId) → the last Drive read
// ({ files, photo_notes, last_ok_at }) or null; groupsFor(clientId) → [{ folder, services }] or null;
// cardsFor(clientId) → Map page path → [card target paths]; getSite(clientId) → the WordPress site or
// null; getDrive() → the Drive client; createLog(clientId) → { appendLog }; wp: wp/client.js (for tests)
function createImages({ pool, pageRows, readDrive, groupsFor, cardsFor, getSite, getDrive, createLog, wp = require('../wp/client') }) {
  async function state(clientId) {
    const [rows, read, groups, cards, { rows: ch }, { rows: ap }] = await Promise.all([
      pageRows(clientId), readDrive(clientId), groupsFor(clientId).catch(() => null), cardsFor(clientId).catch(() => new Map()),
      pool.query(`SELECT identity, slot, file_id FROM page_image_choices WHERE client_id = $1`, [clientId]),
      pool.query(`SELECT identity, slots, approved_by, approved_at FROM page_image_approvals WHERE client_id = $1`, [clientId]),
    ]);
    const choices = new Map();
    for (const c of ch) { if (!choices.has(c.identity)) choices.set(c.identity, new Map()); choices.get(c.identity).set(c.slot, c.file_id); }
    const ok = !!(read && read.last_ok_at);
    // A person's choices go into the pick, so the other slots on the page choose around them
    const picked = pickImages({ rows, photos: ok ? read.files : [], notes: ok ? read.photo_notes : null, groups, cards, choices });
    const drive = { read: ok, error: read ? read.error : null, last_ok_at: read ? read.last_ok_at : null, notes: !!(ok && read.photo_notes) };
    const approvals = new Map(ap.map(a => [a.identity, { slots: parse(a.slots) || [], by: a.approved_by, at: a.approved_at }]));
    const pages = picked.pages.map(page => {
      const a = approvals.get(page.identity);
      const current = !!a && sameSlots(a.slots, filled(page));
      return { ...page, approved: current, approved_at: current ? a.at : null, approved_by: current ? a.by : null, changed_since_approval: !!a && !current };
    });
    return { pages, photos: picked.photos, summary: { ...picked.summary, pages: pages.length, approved: pages.filter(p => p.approved).length, with_photos: pages.filter(p => filled(p).length).length }, drive };
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
      if (!photo) throw bad('That photo is not in the client\'s Drive folders. Read Drive again.');
      if (photo.unusable) throw bad(`That photo can't be used: ${photo.unusable}.`);
      // A photo the code put in another slot moves here and that slot picks again; one a person put there stays
      if (page.slots.some(x => x.slot !== slot && x.chosen && x.pick === fileId)) throw bad('That photo is already in another slot on this page that was chosen by hand.');
    }
    const u = await pool.query(`UPDATE page_image_choices SET file_id = $4, updated_at = NOW() WHERE client_id = $1 AND identity = $2 AND slot = $3`, [clientId, identity, slot, fileId]);
    if (!u.rowCount) await pool.query(`INSERT INTO page_image_choices (client_id, identity, slot, file_id) VALUES ($1, $2, $3, $4)`, [clientId, identity, slot, fileId]);
    await pool.query(`DELETE FROM page_image_approvals WHERE client_id = $1 AND identity = $2`, [clientId, identity]);
    return view(clientId);
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
  async function mediaFor(clientId, site, fileId, slot, photo, counts) {
    const width = widthFor(slot);
    const { rows } = await pool.query(`SELECT media_id FROM wp_media WHERE client_id = $1 AND site = $2 AND file_id = $3 AND width = $4`, [clientId, site.url, fileId, width]);
    if (rows.length) {
      const there = await wp.wpGet(site, `/wp/v2/media/${rows[0].media_id}?_fields=id`).then(() => true).catch(e => { if (/→ 404/.test(e.message)) return false; throw e; });
      if (there) { counts.reused++; return Number(rows[0].media_id); }
      await pool.query(`DELETE FROM wp_media WHERE client_id = $1 AND site = $2 AND file_id = $3 AND width = $4`, [clientId, site.url, fileId, width]);
    }
    const small = await shrink(await getDrive().download(fileId), slot);
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
      for (const slot of filled(page)) {
        const photo = s.photos[slot.file_id];
        placed.push({ slot: slot.slot, media_id: await mediaFor(clientId, site, slot.file_id, slot.slot, photo, counts), alt: photo.shows || '' });
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

  return { view, choose, approve, placePage };
}

module.exports = { ensureImageTables, createImages };
