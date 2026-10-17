'use strict';

// ── Fillout onboarding intake: storage and processing ───────────────────────
// Tables (ensureFilloutTables):
//   fillout_submissions  every webhook delivery, raw and untouched, with its
//                        status: received → processed | error (and rejected for
//                        bodies the parser refused). One row per submissionId.
//   client_fields        the fields we keep per client, from fillout/field-map.json:
//                        value as submitted, status filled|blank, source form|
//                        transcript|manual. A manual row is never overwritten.
//   client_audio         our copy of each voice answer: the Fillout link and
//                        transcript, plus where the bytes are (audio-store.js)
//   clients              gains source, reviewed_at, archived_at
//
// receive() saves the raw body and returns at once; process() runs afterwards
// (setImmediate in the route) and can be re-run from the inbox.

const crypto = require('crypto');
const I = require('./intake');

async function ensureFilloutTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fillout_submissions (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submission_id        TEXT NOT NULL UNIQUE,
      raw_payload          JSONB NOT NULL,
      status               TEXT NOT NULL DEFAULT 'received',
      error                TEXT,
      processed_at         TIMESTAMPTZ,
      client_id            UUID REFERENCES clients(id) ON DELETE SET NULL,
      niche                TEXT,
      business_name        TEXT,
      business_name_norm   TEXT,
      business_email_norm  TEXT,
      duplicate_of         UUID,
      audio_failed         INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS client_fields (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      field_key     TEXT NOT NULL,
      question_id   TEXT,
      value         JSONB,
      status        TEXT NOT NULL DEFAULT 'blank',
      source        TEXT NOT NULL DEFAULT 'form',
      audio_id      UUID,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, field_key)
    );
    CREATE TABLE IF NOT EXISTS client_audio (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      field_key        TEXT NOT NULL,
      question_id      TEXT,
      fillout_url      TEXT,
      filename         TEXT,
      transcription    TEXT,
      duration         INTEGER,
      download_status  TEXT NOT NULL DEFAULT 'pending',
      download_error   TEXT,
      location         TEXT,
      content_type     TEXT,
      size_bytes       INTEGER,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  `);
}

const jsonb = v => JSON.stringify(v === undefined ? null : v);
// JSONB comes back from the driver already parsed, so a field value that is a
// string stays a string. Only the raw payload, always an object, is parsed if a
// driver hands it over as text.
const parsePayload = v => (typeof v === 'string' ? JSON.parse(v) : v);

// Fillout's audio file, over HTTP. Replaced in tests.
async function defaultFetchAudio(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('empty file');
    return { buffer, contentType: res.headers.get('content-type') || 'audio/mpeg' };
  } finally { clearTimeout(timer); }
}

function createFilloutService({ pool, audioStore, fetchAudio = defaultFetchAudio, fieldMap = null, log = console }) {
  if (!pool) throw new Error('fillout service needs a pool');
  if (!audioStore) throw new Error('fillout service needs an audioStore');
  const map = fieldMap || I.loadFieldMap();
  const running = new Set();
  // One submission at a time, in arrival order: two forms from the same business
  // sent back to back must see each other, or the second makes a second client.
  let queue = Promise.resolve();

  // ── Receipt ──
  // Saves the raw body. Returns {id, duplicate}. A repeat delivery of the same
  // submissionId leaves the first row alone.
  async function receive(payload) {
    const sid = I.submissionId(payload);
    if (!sid) throw new Error('Payload has no submission.submissionId');
    const before = await pool.query(`SELECT id, status FROM fillout_submissions WHERE submission_id = $1`, [sid]);
    if (before.rows.length) return { id: before.rows[0].id, status: before.rows[0].status, duplicate: true };
    await pool.query(
      `INSERT INTO fillout_submissions (submission_id, raw_payload, status) VALUES ($1, $2, 'received') ON CONFLICT (submission_id) DO NOTHING`,
      [sid, jsonb(payload)]);
    const after = await pool.query(`SELECT id, status, received_at FROM fillout_submissions WHERE submission_id = $1`, [sid]);
    // Two deliveries racing: the one whose insert lost sees a row that is not fresh
    const row = after.rows[0];
    return { id: row.id, status: row.status, duplicate: false };
  }

  // A body the parser refused (bad JSON, no submissionId): kept as text so nothing is lost
  async function saveRejected(rawText, reason) {
    const text = String(rawText || '');
    const sid = 'rejected:' + crypto.createHash('sha256').update(text + reason).digest('hex').slice(0, 24);
    await pool.query(
      `INSERT INTO fillout_submissions (submission_id, raw_payload, status, error) VALUES ($1, $2, 'rejected', $3) ON CONFLICT (submission_id) DO NOTHING`,
      [sid, jsonb({ raw: text.slice(0, 1000000) }), reason]);
    return sid;
  }

  // ── Processing ──
  function process(submissionRowId) {
    if (running.has(submissionRowId)) return Promise.resolve({ skipped: 'running' });
    running.add(submissionRowId);
    const turn = queue.then(() => processNow(submissionRowId)).finally(() => running.delete(submissionRowId));
    queue = turn.catch(() => {});
    return turn;
  }

  async function processNow(submissionRowId) {
    try {
      const { rows } = await pool.query(`SELECT * FROM fillout_submissions WHERE id = $1`, [submissionRowId]);
      if (!rows.length) throw new Error(`submission row ${submissionRowId} not found`);
      const sub = rows[0];
      if (sub.status === 'rejected') return { skipped: 'rejected' };
      const payload = parsePayload(sub.raw_payload);
      const rec = I.buildRecord(payload, map);
      const nameNorm = I.norm(rec.businessName);
      const emailNorm = I.norm(rec.businessEmail);

      // Which client. Same business name AND same email as an earlier processed submission: that client.
      // Anything less: a new client, flagged as a possible duplicate when name or email matches.
      let clientId = sub.client_id;
      let duplicateOf = null;
      if (!clientId) {
        const match = await findClient(nameNorm, emailNorm, sub.id);
        clientId = match.clientId;
        duplicateOf = match.duplicateOf;
        if (!clientId) {
          const ins = await pool.query(
            `INSERT INTO clients (name, trade, source) VALUES ($1, $2, 'fillout') RETURNING id`,
            [rec.businessName || `Fillout submission ${rec.submissionId}`, rec.niche || 'Unknown niche']);
          clientId = ins.rows[0].id;
        }
      }
      // The client is known from here, whatever happens to the fields and audio below
      await pool.query(`UPDATE fillout_submissions SET client_id = $2, niche = $3, business_name = $4, business_name_norm = $5, business_email_norm = $6, duplicate_of = $7 WHERE id = $1`,
        [sub.id, clientId, rec.niche, rec.businessName || null, nameNorm || null, emailNorm || null, duplicateOf]);

      const written = await upsertFields(clientId, rec);
      const audio = await storeAudio(clientId, rec, written.skippedKeys);

      await pool.query(
        `UPDATE fillout_submissions SET status = 'processed', error = NULL, processed_at = NOW(), client_id = $2, niche = $3,
           business_name = $4, business_name_norm = $5, business_email_norm = $6, duplicate_of = $7, audio_failed = $8 WHERE id = $1`,
        [sub.id, clientId, rec.niche, rec.businessName || null, nameNorm || null, emailNorm || null, duplicateOf, audio.failed]);
      if (audio.failed) log.warn(`[fillout] ${sub.submission_id}: ${audio.failed} audio download(s) failed; reprocess to retry`);
      return { clientId, niche: rec.niche, nicheKnown: rec.nicheKnown, fields: written, audio, duplicateOf };
    } catch (err) {
      log.error(`[fillout] processing failed for row ${submissionRowId}:`, err);
      await pool.query(`UPDATE fillout_submissions SET status = 'error', error = $2 WHERE id = $1`, [submissionRowId, String(err && err.stack || err).slice(0, 4000)])
        .catch(e => log.error('[fillout] could not record the failure:', e));
      return { error: err.message };
    }
  }

  async function findClient(nameNorm, emailNorm, excludeRowId) {
    if (!nameNorm && !emailNorm) return { clientId: null, duplicateOf: null };
    const { rows } = await pool.query(
      `SELECT s.client_id, s.business_name_norm, s.business_email_norm, c.archived_at
         FROM fillout_submissions s JOIN clients c ON c.id = s.client_id
        WHERE s.client_id IS NOT NULL AND s.id <> $1 ORDER BY s.received_at DESC`, [excludeRowId]);
    let duplicateOf = null;
    for (const r of rows) {
      const nameHit = !!nameNorm && r.business_name_norm === nameNorm;
      const emailHit = !!emailNorm && r.business_email_norm === emailNorm;
      if (nameHit && emailHit && !r.archived_at) return { clientId: r.client_id, duplicateOf: null };
      if ((nameHit || emailHit) && !duplicateOf) duplicateOf = r.client_id;
    }
    if (!duplicateOf && nameNorm) {
      // A client someone created by hand with the same name
      const { rows: byName } = await pool.query(`SELECT id, name FROM clients WHERE archived_at IS NULL`);
      const hit = byName.find(c => I.norm(c.name) === nameNorm);
      if (hit) duplicateOf = hit.id;
    }
    return { clientId: null, duplicateOf };
  }

  // Form values go in unless the row was edited by hand
  async function upsertFields(clientId, rec) {
    const { rows } = await pool.query(`SELECT field_key, source FROM client_fields WHERE client_id = $1`, [clientId]);
    const manual = new Set(rows.filter(r => r.source === 'manual').map(r => r.field_key));
    const existing = new Set(rows.map(r => r.field_key));
    let inserted = 0, updated = 0;
    const skippedKeys = [];
    for (const f of rec.fields) {
      if (manual.has(f.key)) { skippedKeys.push(f.key); continue; }
      if (existing.has(f.key)) {
        await pool.query(`UPDATE client_fields SET value = $3, status = $4, source = 'form', question_id = $5, updated_at = NOW() WHERE client_id = $1 AND field_key = $2`,
          [clientId, f.key, jsonb(f.value), f.status, f.id]);
        updated++;
      } else {
        await pool.query(`INSERT INTO client_fields (client_id, field_key, question_id, value, status, source) VALUES ($1, $2, $3, $4, $5, 'form')`,
          [clientId, f.key, f.id, jsonb(f.value), f.status]);
        inserted++;
      }
    }
    return { inserted, updated, skippedKeys };
  }

  // Our own copy of every filled voice answer. A failed download keeps the Fillout
  // link and transcript and is marked for retry.
  async function storeAudio(clientId, rec, skippedKeys = []) {
    let stored = 0, failed = 0, kept = 0;
    for (const f of rec.fields) {
      if (!I.isAudioField(f) || f.status !== 'filled' || skippedKeys.includes(f.key)) continue;
      const v = f.value || {};
      const { rows } = await pool.query(`SELECT * FROM client_audio WHERE client_id = $1 AND field_key = $2`, [clientId, f.key]);
      let row = rows[0];
      if (row && row.download_status === 'stored' && row.fillout_url === (v.url || null)) { kept++; continue; }
      if (!row) {
        const ins = await pool.query(
          `INSERT INTO client_audio (client_id, field_key, question_id, fillout_url, filename, transcription, duration) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [clientId, f.key, f.id, v.url || null, v.filename || null, v.transcription || null, Number.isFinite(v.duration) ? Math.round(v.duration) : null]);
        row = { id: ins.rows[0].id };
      } else {
        await pool.query(`UPDATE client_audio SET fillout_url = $2, filename = $3, transcription = $4, duration = $5, updated_at = NOW() WHERE id = $1`,
          [row.id, v.url || null, v.filename || null, v.transcription || null, Number.isFinite(v.duration) ? Math.round(v.duration) : null]);
      }
      await pool.query(`UPDATE client_fields SET audio_id = $3 WHERE client_id = $1 AND field_key = $2`, [clientId, f.key, row.id]);
      if (!v.url) {
        await pool.query(`UPDATE client_audio SET download_status = 'no_url', updated_at = NOW() WHERE id = $1`, [row.id]);
        continue;
      }
      try {
        const { buffer, contentType } = await fetchAudio(v.url);
        const saved = await audioStore.save(row.id, buffer, contentType);
        await pool.query(`UPDATE client_audio SET download_status = 'stored', download_error = NULL, location = $2, content_type = $3, size_bytes = $4, updated_at = NOW() WHERE id = $1`,
          [row.id, saved.location, contentType, saved.size]);
        stored++;
      } catch (err) {
        log.error(`[fillout] audio download failed for ${f.key} (${v.url}):`, err.message);
        await pool.query(`UPDATE client_audio SET download_status = 'failed', download_error = $2, updated_at = NOW() WHERE id = $1`, [row.id, String(err.message || err).slice(0, 1000)]);
        failed++;
      }
    }
    return { stored, failed, kept };
  }

  // Rows left at 'received' by a restart mid-processing
  async function recoverPending() {
    const { rows } = await pool.query(`SELECT id FROM fillout_submissions WHERE status = 'received' ORDER BY received_at`);
    for (const r of rows) await process(r.id);
    return rows.length;
  }

  // ── Reading ──
  async function listSubmissions() {
    const { rows } = await pool.query(
      `SELECT s.id, s.received_at, s.submission_id, s.status, s.error, s.processed_at, s.client_id, s.niche, s.business_name, s.duplicate_of, s.audio_failed,
              c.name AS client_name, c.archived_at, c.reviewed_at, d.name AS duplicate_of_name
         FROM fillout_submissions s
         LEFT JOIN clients c ON c.id = s.client_id
         LEFT JOIN clients d ON d.id = s.duplicate_of
        ORDER BY s.received_at DESC`);
    const clientIds = [...new Set(rows.map(r => r.client_id).filter(Boolean))];
    const byClient = new Map();
    if (clientIds.length) {
      const ph = clientIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: fr } = await pool.query(`SELECT client_id, field_key, status FROM client_fields WHERE client_id IN (${ph})`, clientIds);
      for (const f of fr) { if (!byClient.has(f.client_id)) byClient.set(f.client_id, []); byClient.get(f.client_id).push(f); }
    }
    return rows.map(r => {
      const used = I.fieldsForNiche(map, r.niche);
      const have = new Map((byClient.get(r.client_id) || []).map(f => [f.field_key, f.status]));
      const c = I.completeness(used.map(f => ({ status: have.get(f.key) || 'blank' })));
      return {
        id: r.id, receivedAt: r.received_at, submissionId: r.submission_id, status: r.status, error: r.error || null, processedAt: r.processed_at,
        clientId: r.client_id, clientName: r.client_name || null, archived: !!r.archived_at, reviewed: !!r.reviewed_at,
        businessName: r.business_name || r.client_name || null, niche: r.niche || null, nicheKnown: !!(r.niche && map.niches[r.niche]),
        duplicateOf: r.duplicate_of ? { id: r.duplicate_of, name: r.duplicate_of_name || null } : null,
        audioFailed: r.audio_failed || 0, completeness: r.client_id ? c : null,
      };
    });
  }

  // The client record: every field we use for the niche, grouped by form section
  async function record(clientId) {
    const { rows: cs } = await pool.query(`SELECT id, name, trade, created_at, source, reviewed_at, archived_at FROM clients WHERE id = $1`, [clientId]);
    if (!cs.length) return null;
    const client = cs[0];
    const { rows: fr } = await pool.query(`SELECT field_key, question_id, value, status, source, audio_id, updated_at FROM client_fields WHERE client_id = $1`, [clientId]);
    const { rows: ar } = await pool.query(
      `SELECT id, field_key, fillout_url, filename, transcription, duration, download_status, download_error, size_bytes FROM client_audio WHERE client_id = $1`, [clientId]);
    const have = new Map(fr.map(f => [f.field_key, f]));
    const audioByKey = new Map(ar.map(a => [a.field_key, a]));
    const nicheRow = have.get('niche');
    const niche = nicheRow && nicheRow.value ? String(nicheRow.value) : (client.trade || null);
    const used = I.fieldsForNiche(map, niche);
    const fields = used.map(f => {
      const h = have.get(f.key);
      const a = f.type === 'AudioRecording' ? audioByKey.get(f.key) : null;
      return {
        key: f.key, label: f.label, section: f.section, type: f.type, niche: f.niche, questionId: f.id,
        value: h ? h.value : null, status: h ? h.status : 'blank', source: h ? h.source : 'form', updatedAt: h ? h.updated_at : null,
        audio: a ? { id: a.id, filloutUrl: a.fillout_url, filename: a.filename, transcription: a.transcription, duration: a.duration,
                     downloadStatus: a.download_status, downloadError: a.download_error, size: a.size_bytes,
                     playable: a.download_status === 'stored' } : null,
      };
    });
    const sections = map.sections.map(name => ({ name, fields: fields.filter(f => f.section === name) })).filter(s => s.fields.length);
    const { rows: subs } = await pool.query(`SELECT id, submission_id, received_at, status FROM fillout_submissions WHERE client_id = $1 ORDER BY received_at DESC`, [clientId]);
    return {
      client: { id: client.id, name: client.name, trade: client.trade, createdAt: client.created_at, source: client.source, reviewedAt: client.reviewed_at, archivedAt: client.archived_at },
      niche, nicheKnown: !!(niche && map.niches[niche]), completeness: I.completeness(fields), sections,
      submissions: subs.map(s => ({ id: s.id, submissionId: s.submission_id, receivedAt: s.received_at, status: s.status })),
    };
  }

  // A hand edit. Survives every later submission and re-run.
  async function setField(clientId, key, value) {
    const rec = await record(clientId);
    if (!rec) throw new Error('Client not found');
    const f = rec.sections.flatMap(s => s.fields).find(x => x.key === key);
    if (!f) throw new Error(`Not a field for this client's niche: ${key}`);
    if (f.type === 'AudioRecording') throw new Error('Voice answers are not edited here; edit the typed field beside it');
    const blank = I.isBlank(value);
    const stored = blank ? null : value;
    const { rowCount } = await pool.query(
      `UPDATE client_fields SET value = $3, status = $4, source = 'manual', updated_at = NOW() WHERE client_id = $1 AND field_key = $2`,
      [clientId, key, jsonb(stored), blank ? 'blank' : 'filled']);
    if (!rowCount) {
      await pool.query(`INSERT INTO client_fields (client_id, field_key, question_id, value, status, source) VALUES ($1, $2, $3, $4, $5, 'manual')`,
        [clientId, key, f.questionId, jsonb(stored), blank ? 'blank' : 'filled']);
    }
    return { key, value: stored, status: blank ? 'blank' : 'filled', source: 'manual' };
  }

  async function audio(clientId, audioId) {
    const { rows } = await pool.query(`SELECT id, content_type, download_status FROM client_audio WHERE id = $1 AND client_id = $2`, [audioId, clientId]);
    if (!rows.length || rows[0].download_status !== 'stored') return null;
    const got = await audioStore.get(audioId);
    if (!got) return null;
    return { contentType: got.contentType || rows[0].content_type || 'audio/mpeg', buffer: got.buffer };
  }

  async function setClientFlags(clientId, { archived, reviewed }) {
    if (archived !== undefined) await pool.query(`UPDATE clients SET archived_at = ${archived ? 'NOW()' : 'NULL'} WHERE id = $1`, [clientId]);
    if (reviewed !== undefined) await pool.query(`UPDATE clients SET reviewed_at = ${reviewed ? 'NOW()' : 'NULL'} WHERE id = $1`, [clientId]);
    const { rows } = await pool.query(`SELECT id, archived_at, reviewed_at FROM clients WHERE id = $1`, [clientId]);
    return rows[0] || null;
  }

  return { map, receive, saveRejected, process, recoverPending, listSubmissions, record, setField, audio, setClientFlags };
}

module.exports = { ensureFilloutTables, createFilloutService, defaultFetchAudio };
