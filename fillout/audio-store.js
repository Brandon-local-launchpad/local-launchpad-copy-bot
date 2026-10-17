'use strict';

// ── Where our copy of each Fillout voice answer lives ────────────────────────
// One interface, save / get / delete, so the bytes can move without touching
// the intake. Today they sit in Postgres (client_audio_blobs), a table that
// nothing but get() ever selects, so list and record queries never drag the
// bytes along.
//
// TODO (before volume grows): move the bytes to a Railway volume or object
// storage. Railway's disk is wiped on deploy and there is no bucket yet, which
// is why Postgres is the first home. A 20 second mp3 is about 300 KB; at a few
// voice answers per client this is fine for the first hundred or so clients,
// not for thousands. See ONBOARDING.md, "Audio storage".

// The bytes are held as base64 text rather than BYTEA: a third bigger, but the
// same code then runs against pg-mem in the tests (which mangles BYTEA) and
// against Postgres live, and this table is a stopgap (see above).
async function ensureAudioBlobTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_audio_blobs (
      audio_id      UUID PRIMARY KEY,
      content_type  TEXT NOT NULL DEFAULT 'audio/mpeg',
      size_bytes    INTEGER NOT NULL,
      data_base64   TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function createPgAudioStore(pool) {
  return {
    kind: 'postgres',
    async save(audioId, buffer, contentType = 'audio/mpeg') {
      if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('audio store: nothing to save');
      await pool.query(`DELETE FROM client_audio_blobs WHERE audio_id = $1`, [audioId]);
      await pool.query(`INSERT INTO client_audio_blobs (audio_id, content_type, size_bytes, data_base64) VALUES ($1, $2, $3, $4)`,
        [audioId, contentType, buffer.length, buffer.toString('base64')]);
      return { location: `pg:client_audio_blobs/${audioId}`, size: buffer.length };
    },
    async get(audioId) {
      const { rows } = await pool.query(`SELECT content_type, data_base64 FROM client_audio_blobs WHERE audio_id = $1`, [audioId]);
      if (!rows.length) return null;
      return { contentType: rows[0].content_type, buffer: Buffer.from(rows[0].data_base64, 'base64') };
    },
    async delete(audioId) {
      await pool.query(`DELETE FROM client_audio_blobs WHERE audio_id = $1`, [audioId]);
    },
  };
}

module.exports = { ensureAudioBlobTable, createPgAudioStore };
