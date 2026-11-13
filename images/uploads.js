'use strict';

// ── Photos a person adds by hand (13 Nov 2026) ───────────────────────────────
// A stock photo, or one the client sent late, dropped into a slot on the Images tab. Stock files
// are huge (an Envato download can be 7,000px across), so the photo is shrunk the moment it
// arrives and only that copy is kept: 2,400px on its longest side, a JPEG. The site sizes are cut
// from it later (images/place.js), the same as a Drive photo.
//
// An uploaded photo is never picked by code: it goes where a person puts it. Its id is
// "up:<id>", so the pick, the choices and the placement treat it as one more photo. `source`
// says where it came from ("stock" or "client"), so stock can be found and replaced later.
// The licence for a stock photo is the person's to hold: nothing here checks it.

const crypto = require('crypto');

const MAX_SIDE = 2400;
const MAX_BYTES = 60 * 1024 * 1024;
const PREFIX = 'up:';
const isUpload = id => String(id || '').startsWith(PREFIX);
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

async function ensureUploadTables(pool) {
  // The bytes as base64 text: pg-mem (the fixtures and the demo) has no working BYTEA
  await pool.query(`
    CREATE TABLE IF NOT EXISTS image_uploads (
      id          TEXT NOT NULL,
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      alt         TEXT NOT NULL DEFAULT '',
      source      TEXT NOT NULL DEFAULT 'stock',
      width       INTEGER NOT NULL,
      height      INTEGER NOT NULL,
      size_bytes  INTEGER NOT NULL,
      bytes_b64   TEXT NOT NULL,
      added_by    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, id)
    )`);
}

function createUploads(pool) {
  return {
    // bytes: the file as it was dropped. → the saved row, without its bytes
    async add(clientId, { name = '', bytes, alt = '', source = 'stock', by = '' } = {}) {
      if (!Buffer.isBuffer(bytes) || !bytes.length) throw bad('No photo was sent.');
      if (bytes.length > MAX_BYTES) throw bad(`That file is ${(bytes.length / 1024 / 1024).toFixed(0)} MB. The most Copybot takes is ${MAX_BYTES / 1024 / 1024} MB.`);
      const sharp = require('sharp');
      let out;
      try { out = await sharp(bytes, { failOn: 'none' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true }); }
      catch (e) { throw bad('That file is not a photo Copybot can read. Use a JPG, PNG or WebP.'); }
      const id = crypto.randomUUID();
      const clean = String(name || 'photo').replace(/[\\/]+/g, ' ').trim().slice(0, 120) || 'photo';
      await pool.query(`INSERT INTO image_uploads (id, client_id, name, alt, source, width, height, size_bytes, bytes_b64, added_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, clientId, clean, String(alt || '').replace(/\s+/g, ' ').trim().slice(0, 200), source === 'client' ? 'client' : 'stock', out.info.width, out.info.height, out.data.length, out.data.toString('base64'), String(by || '').slice(0, 80)]);
      return { id: PREFIX + id, name: clean, width: out.info.width, height: out.info.height, size_bytes: out.data.length, original_bytes: bytes.length };
    },
    // Every upload as the pick sees a photo (images/pick.js describe)
    async list(clientId) {
      const { rows } = await pool.query(`SELECT id, name, alt, source, width, height, size_bytes, created_at FROM image_uploads WHERE client_id = $1 ORDER BY created_at DESC`, [clientId]);
      return rows.map(r => ({ file_id: PREFIX + r.id, kind: 'upload', label: 'Added by hand', name: r.name, mime_type: 'image/jpeg', size_bytes: Number(r.size_bytes) || 0, width: r.width, height: r.height, md5: '', web_link: '', problem: '', alt: r.alt, source: r.source }));
    },
    async bytes(clientId, fileId) {
      const { rows } = await pool.query(`SELECT bytes_b64 FROM image_uploads WHERE client_id = $1 AND id = $2`, [clientId, String(fileId).slice(PREFIX.length)]);
      if (!rows.length) throw bad('That photo is not one of this client\'s added photos.', 404);
      return Buffer.from(rows[0].bytes_b64, 'base64');
    },
    async setAlt(clientId, fileId, alt) {
      const u = await pool.query(`UPDATE image_uploads SET alt = $3 WHERE client_id = $1 AND id = $2`, [clientId, String(fileId).slice(PREFIX.length), String(alt || '').replace(/\s+/g, ' ').trim().slice(0, 200)]);
      if (!u.rowCount) throw bad('That photo is not one of this client\'s added photos.', 404);
    },
  };
}

module.exports = { ensureUploadTables, createUploads, isUpload, MAX_SIDE, MAX_BYTES };
