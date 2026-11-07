'use strict';

// ── Drive photos: two new tables ─────────────────────────────────────────────
//   drive_photos        one row per photo, as of the last good read (later stages take photos from here)
//   drive_photo_reads   one row per client: the last try, the last good read, what it found
// A failed read changes no photos: the last good list stands, with the error beside it.

const json = v => JSON.stringify(v == null ? [] : v);
const parse = v => (typeof v === 'string' ? JSON.parse(v) : (v || []));

async function ensureDriveTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drive_photos (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      file_id     TEXT NOT NULL,
      kind        TEXT NOT NULL,
      label       TEXT NOT NULL,
      folder_id   TEXT NOT NULL,
      name        TEXT NOT NULL,
      mime_type   TEXT,
      size_bytes  BIGINT,
      width       INTEGER,
      height      INTEGER,
      md5         TEXT,
      modified_at TIMESTAMPTZ,
      web_link    TEXT,
      problem     TEXT,
      seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, file_id)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drive_photo_reads (
      client_id   UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      folder_id   TEXT,
      folder_name TEXT,
      posts_found BOOLEAN NOT NULL DEFAULT FALSE,
      drip_found  BOOLEAN NOT NULL DEFAULT FALSE,
      folders     JSONB,
      problems    JSONB,
      notes       JSONB,
      last_try_at TIMESTAMPTZ,
      last_ok_at  TIMESTAMPTZ,
      error       TEXT
    )`);
}

function createDriveStore(pool) {
  let ready = null;
  const ensure = () => { if (!ready) ready = ensureDriveTables(pool).catch(e => { ready = null; throw e; }); return ready; };

  async function saveRead(clientId, r) {
    await ensure();
    await pool.query(`DELETE FROM drive_photos WHERE client_id=$1`, [clientId]);
    for (const f of r.files) {
      await pool.query(
        `INSERT INTO drive_photos (client_id, file_id, kind, label, folder_id, name, mime_type, size_bytes, width, height, md5, modified_at, web_link, problem)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [clientId, f.file_id, f.kind, f.label, f.folder_id, f.name, f.mime_type, f.size_bytes, f.width, f.height, f.md5, f.modified_at, f.web_link, f.problem]);
    }
    await pool.query(`DELETE FROM drive_photo_reads WHERE client_id=$1`, [clientId]);
    await pool.query(
      `INSERT INTO drive_photo_reads (client_id, folder_id, folder_name, posts_found, drip_found, folders, problems, notes, last_try_at, last_ok_at, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),NULL)`,
      [clientId, r.folder_id, r.folder_name, r.posts_found, r.drip_found, json(r.folders), json(r.problems), json(r.notes)]);
  }

  async function saveError(clientId, message) {
    await ensure();
    const { rows } = await pool.query(`SELECT client_id FROM drive_photo_reads WHERE client_id=$1`, [clientId]);
    if (rows.length) await pool.query(`UPDATE drive_photo_reads SET last_try_at=NOW(), error=$2 WHERE client_id=$1`, [clientId, message]);
    else await pool.query(`INSERT INTO drive_photo_reads (client_id, last_try_at, error) VALUES ($1, NOW(), $2)`, [clientId, message]);
  }

  // The last read with its photos, or null when Drive has never been tried for this client
  async function read(clientId) {
    await ensure();
    const { rows } = await pool.query(`SELECT * FROM drive_photo_reads WHERE client_id=$1`, [clientId]);
    if (!rows.length) return null;
    const { rows: photos } = await pool.query(`SELECT file_id, kind, label, folder_id, name, mime_type, size_bytes, width, height, md5, modified_at, web_link, problem FROM drive_photos WHERE client_id=$1 ORDER BY label, name`, [clientId]);
    const R = rows[0];
    return {
      folder_id: R.folder_id, folder_name: R.folder_name, posts_found: !!R.posts_found, drip_found: !!R.drip_found,
      folders: parse(R.folders), problems: parse(R.problems), notes: parse(R.notes), last_try_at: R.last_try_at, last_ok_at: R.last_ok_at, error: R.error,
      files: photos.map(p => ({ ...p, size_bytes: Number(p.size_bytes) || 0 })),
    };
  }

  return { ensure, saveRead, saveError, read };
}

module.exports = { ensureDriveTables, createDriveStore };
