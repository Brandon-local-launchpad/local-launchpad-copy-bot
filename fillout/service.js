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
const P = require('./prices');
const A = require('./attention');
const R = require('./services/resolver');
const { createAdditionalServices } = require('./additional-services');

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

// callModel: anthropic-call.js makeCallModel(client, V20_MODEL), or null when there is no
// API key (price extraction then records extraction_failed and waits for Retry)
function createFilloutService({ pool, audioStore, fetchAudio = defaultFetchAudio, fieldMap = null, log = console, callModel = null, modelName = null }) {
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
      // Price rows from the prices voice answer: in the background, never holding up intake
      setImmediate(() => extractPrices(clientId, { submissionId: sub.submission_id }).catch(err => log.error('[fillout] price extraction failed to start:', err)));
      // Parent categories for the additional services (ticked or typed): also in the background, hash-gated
      setImmediate(() => proposeAdditional(clientId).catch(err => log.error('[fillout] additional services proposal failed to start:', err)));
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
      if (row && row.download_status === 'stored' && row.fillout_url === (v.url || null)) {
        // Same file: no download, but Fillout may have re-transcribed it
        if ((row.transcription || null) !== (v.transcription || null)) await pool.query(`UPDATE client_audio SET transcription = $2, updated_at = NOW() WHERE id = $1`, [row.id, v.transcription || null]);
        kept++; continue;
      }
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
      const { rows: fr } = await pool.query(`SELECT client_id, field_key, status, value FROM client_fields WHERE client_id IN (${ph})`, clientIds);
      for (const f of fr) { if (!byClient.has(f.client_id)) byClient.set(f.client_id, []); byClient.get(f.client_id).push(f); }
    }
    // Price state and rows per client, for the prices unit and the most-wanted warning
    const stateBy = new Map(), rowsBy = new Map();
    if (clientIds.length) {
      const ph = clientIds.map((_, i) => `$${i + 1}`).join(',');
      for (const s of (await pool.query(`SELECT * FROM client_price_state WHERE client_id IN (${ph})`, clientIds)).rows) stateBy.set(s.client_id, s);
      for (const p of (await pool.query(`SELECT client_id, service, matched_to, deleted, inferred, unverified FROM client_price_rows WHERE client_id IN (${ph})`, clientIds)).rows) {
        if (!rowsBy.has(p.client_id)) rowsBy.set(p.client_id, []);
        rowsBy.get(p.client_id).push({ ...p, matched_to: p.matched_to && typeof p.matched_to === 'string' ? JSON.parse(p.matched_to) : p.matched_to });
      }
    }
    return rows.map(r => {
      const used = I.fieldsForNiche(map, r.niche);
      const have = new Map((byClient.get(r.client_id) || []).map(f => [f.field_key, f]));
      const fieldsNow = I.markApplicable(used.map(f => {
        const h = have.get(f.key);
        return { key: f.key, group: f.group, optional: f.optional, tier: f.tier, expectedWhen: f.expectedWhen, status: h ? h.status : 'blank', value: h ? h.value : null };
      }));
      const pstate = stateBy.get(r.client_id) || null;
      const prows = rowsBy.get(r.client_id) || [];
      const pflags = P.priceFlags(prows, fieldsNow, pstate);
      const c = I.completeness([...fieldsNow, pricesUnit({ rows: prows, state: pstate })]);
      return {
        prices: r.client_id ? { status: pstate ? pstate.status : 'pending', rows: prows.filter(p => !p.deleted).length, warnings: pflags.warnings } : null,
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
        key: f.key, label: f.label, section: f.section, panel: f.panel, help: f.help || null, type: f.type, niche: f.niche, questionId: (h && h.question_id) || f.id || null,
        group: f.group || null, optional: !!f.optional, tier: f.tier, manual: !!f.manual, expectedWhen: f.expectedWhen || null,
        value: h ? h.value : null, status: h ? h.status : 'blank', source: h ? h.source : 'form', updatedAt: h ? h.updated_at : null,
        audio: a ? { id: a.id, filloutUrl: a.fillout_url, filename: a.filename, transcription: a.transcription, duration: a.duration,
                     downloadStatus: a.download_status, downloadError: a.download_error, size: a.size_bytes,
                     playable: a.download_status === 'stored' } : null,
      };
    });
    I.markApplicable(fields);
    const sections = map.sections.map(name => ({ name, fields: fields.filter(f => f.section === name) })).filter(s => s.fields.length);
    const { rows: subs } = await pool.query(
      `SELECT s.id, s.submission_id, s.received_at, s.status, s.duplicate_of, d.name AS duplicate_of_name
         FROM fillout_submissions s LEFT JOIN clients d ON d.id = s.duplicate_of WHERE s.client_id = $1 ORDER BY s.received_at DESC`, [clientId]);
    const dupSub = subs.find(s => s.duplicate_of);
    const prices = await priceView(clientId, fields);
    const out = {
      client: { id: client.id, name: client.name, trade: client.trade, createdAt: client.created_at, source: client.source, reviewedAt: client.reviewed_at, archivedAt: client.archived_at },
      niche, nicheKnown: !!(niche && map.niches[niche]), completeness: I.completeness([...fields, pricesUnit(prices)]), sections, prices,
      warnings: prices.warnings,
      submissions: subs.map(s => ({ id: s.id, submissionId: s.submission_id, receivedAt: s.received_at, status: s.status })),
      // "Possible duplicate of": name or email matched another client, but not both (service.findClient)
      duplicateOf: dupSub ? { id: dupSub.duplicate_of, name: dupSub.duplicate_of_name || null } : null,
      // The record page's panels (fillout/field-map.json "panels"): counts by the same unit
      // rules as the headline, so the panels add up to it. The prices unit sits on Prices.
      panels: panelSummary(fields, prices),
    };
    // Whether the niche has a services file (fillout/services/); without one there are no category tabs or page map
    out.servicesConfigured = !!(niche && R.configFor(niche));
    out.attention = A.needsAttention(out);
    return out;
  }

  function panelSummary(fields, prices) {
    return (map.panels || []).map(p => {
      const own = fields.filter(f => f.panel === p.key);
      const units = p.key === 'prices' ? [...own, pricesUnit(prices)] : own;
      const c = I.completeness(units);
      // Required when a needed answer lives here; Recommended when only chase answers do; Optional otherwise
      const tag = c.needed.total > 0 ? 'Required' : c.chase.total > 0 ? 'Recommended' : 'Optional';
      return { key: p.key, label: p.label, group: p.group, description: p.description, tag, status: I.status(c), fields: own.length,
        needed: c.needed, chase: c.chase, optional: c.optional, notApplicable: c.notApplicable };
    });
  }

  // ── Price rows from the prices voice answer (fillout/prices.js) ──
  // One expected completeness unit: filled once a row exists or the VA has marked prices not applicable
  const pricesUnit = prices => ({ key: 'prices', synthetic: true, tier: 'needed', status: (prices.rows.some(r => !r.deleted) || (prices.state && prices.state.status === 'not_applicable')) ? 'filled' : 'blank' });

  const pricesVoiceKey = niche => { const f = I.fieldsForNiche(map, niche).find(f => f.type === 'AudioRecording' && /(^|\.)prices_voice$/.test(f.key)); return f ? f.key : null; };

  // The transcript for the niche's prices voice answer: our audio row first, else the stored field value
  async function priceTranscript(clientId, niche) {
    const key = pricesVoiceKey(niche);
    if (!key) return { key: null, transcript: '' };
    const { rows: a } = await pool.query(`SELECT transcription FROM client_audio WHERE client_id = $1 AND field_key = $2`, [clientId, key]);
    if (a.length && a[0].transcription) return { key, transcript: a[0].transcription };
    const { rows: f } = await pool.query(`SELECT value FROM client_fields WHERE client_id = $1 AND field_key = $2`, [clientId, key]);
    const v = f.length ? f[0].value : null;
    return { key, transcript: v && typeof v === 'object' && v.transcription ? String(v.transcription) : '' };
  }

  async function priceState(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_price_state WHERE client_id = $1`, [clientId]);
    return rows[0] || null;
  }
  async function savePriceState(clientId, patch) {
    const cur = await priceState(clientId);
    const next = { status: 'pending', transcript_hash: null, transcript: null, error: null, model: null, extracted_at: null, ...(cur || {}), ...patch };
    if (cur) await pool.query(`UPDATE client_price_state SET status=$2, transcript_hash=$3, transcript=$4, error=$5, model=$6, extracted_at=$7, updated_at=NOW() WHERE client_id=$1`,
      [clientId, next.status, next.transcript_hash, next.transcript, next.error, next.model, next.extracted_at]);
    else await pool.query(`INSERT INTO client_price_state (client_id, status, transcript_hash, transcript, error, model, extracted_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [clientId, next.status, next.transcript_hash, next.transcript, next.error, next.model, next.extracted_at]);
    return next;
  }

  const priceRunning = new Set();
  const UNREADABLE_REPLY = 'Reply too long or unreadable. Retry, or split the recording.';
  // Runs the model on the transcript. Skipped when the transcript hash hasn't changed since the
  // last successful run, unless force (Re-extract / Retry). Replaces transcript rows only.
  async function extractPrices(clientId, { force = false, submissionId = null } = {}) {
    if (priceRunning.has(clientId)) return { skipped: 'running' };
    priceRunning.add(clientId);
    try {
      const rec = await record(clientId);
      if (!rec) throw new Error('Client not found');
      const niche = rec.niche;
      const { transcript } = await priceTranscript(clientId, niche);
      const hash = transcript.trim() ? P.hashTranscript(transcript) : null;
      const cur = await priceState(clientId);
      if (!transcript.trim()) {
        if (!cur || cur.status !== 'not_applicable') await savePriceState(clientId, { status: 'no_transcript', transcript_hash: null, transcript: '' });
        return { skipped: 'no transcript' };
      }
      if (!force && cur && cur.status === 'done' && cur.transcript_hash === hash) return { skipped: 'unchanged' };
      if (!force && cur && cur.status === 'not_applicable') return { skipped: 'not applicable' };
      if (!callModel) throw new Error('No model available: ANTHROPIC_API_KEY is not set');
      const { system, message } = P.buildPrompt(transcript, niche);
      const reply = await callModel({ system, message, maxTokens: 4096, effort: 'low' });
      let rows;
      try { rows = P.parseReply(reply.text); }
      catch (err) {
        // Cut off at the output limit, or not readable as rows: one plain message for the
        // record (the parser's detail goes to the log). Existing rows are untouched.
        const cut = reply.usage && reply.usage.stop_reason === 'max_tokens';
        log.error(`[fillout] price reply ${cut ? 'cut off at the token limit' : 'unreadable'} for ${clientId}: ${err.message}`);
        throw new Error(UNREADABLE_REPLY);
      }
      rows = P.mergeDuplicateServices(rows); // two prices for one service → one row, as a range
      P.verifyRows(rows, transcript);
      const fields = rec.sections.flatMap(s => s.fields);
      P.matchRows(rows, P.candidatesFrom(fields));
      // Hand work wins: a model row for a service that has a manual row (edited, added, or
      // deleted and kept as a tombstone) is not written again, so nothing is duplicated or revived
      const { rows: existing } = await pool.query(`SELECT id, service, source, deleted FROM client_price_rows WHERE client_id = $1`, [clientId]);
      const manualServices = new Set(existing.filter(r => r.source === 'manual').map(r => r.service.toLowerCase().trim()));
      rows = rows.filter(r => !manualServices.has(r.service.toLowerCase().trim()));
      // Transcript rows are swapped in one transaction: a failure part way leaves the old set
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        await tx.query(`DELETE FROM client_price_rows WHERE client_id = $1 AND source = 'transcript'`, [clientId]);
        let i = 0;
        for (const r of rows) {
          await tx.query(`INSERT INTO client_price_rows (client_id, submission_id, niche, service, from_gbp, up_to_gbp, typical_gbp, unit, what_moves_price, quote_only, inferred, inferred_note, unverified, matched_to, source, transcript_hash, sort_order)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'transcript',$15,$16)`,
            [clientId, submissionId, niche, r.service, r.from_gbp, r.up_to_gbp, r.typical_gbp, r.unit, r.what_moves_price, r.quote_only, r.inferred, r.inferred_note, r.unverified, r.matched_to ? JSON.stringify(r.matched_to) : null, hash, i++]);
        }
        await tx.query('COMMIT');
      } catch (err) {
        await tx.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        tx.release();
      }
      await savePriceState(clientId, { status: 'done', transcript_hash: hash, transcript, error: null, model: (reply.usage && reply.usage.model) || modelName, extracted_at: new Date() });
      return { rows: rows.length, unverified: rows.filter(r => r.unverified).length };
    } catch (err) {
      log.error(`[fillout] price extraction failed for ${clientId}:`, err.message);
      await savePriceState(clientId, { status: 'extraction_failed', error: String(err.message || err).slice(0, 2000) }).catch(e => log.error('[fillout] could not record the price failure:', e));
      return { error: err.message };
    } finally {
      priceRunning.delete(clientId);
    }
  }

  async function priceRows(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_price_rows WHERE client_id = $1 ORDER BY sort_order, created_at`, [clientId]);
    return rows.map(r => ({ ...r, matched_to: r.matched_to && typeof r.matched_to === 'string' ? JSON.parse(r.matched_to) : r.matched_to }));
  }

  async function priceView(clientId, fields) {
    const [state, rows, { transcript }] = await Promise.all([priceState(clientId), priceRows(clientId), priceTranscript(clientId, fields.find(f => f.key === 'niche') && fields.find(f => f.key === 'niche').value)]);
    const { flags, warnings } = P.priceFlags(rows, fields, state);
    return {
      state: state ? { status: state.status, error: state.error, model: state.model, extractedAt: state.extracted_at, transcriptChanged: !!(state.transcript_hash && transcript.trim() && P.hashTranscript(transcript) !== state.transcript_hash) } : { status: 'pending', error: null },
      rows: rows.filter(r => !r.deleted).map(r => ({ id: r.id, service: r.service, from_gbp: r.from_gbp, up_to_gbp: r.up_to_gbp, typical_gbp: r.typical_gbp, unit: r.unit, what_moves_price: P.humaniseNote(r.what_moves_price),
        quote_only: r.quote_only, inferred: r.inferred, inferred_note: P.humaniseNote(r.inferred_note), unverified: r.unverified, matched_to: r.matched_to, source: r.source, sort_order: r.sort_order })),
      transcript, flags, warnings,
    };
  }

  const PRICE_EDITABLE = ['service', 'from_gbp', 'up_to_gbp', 'typical_gbp', 'unit', 'what_moves_price', 'quote_only', 'inferred', 'inferred_note'];
  const cleanRowPatch = patch => {
    const out = {};
    for (const k of PRICE_EDITABLE) {
      if (!(k in patch)) continue;
      const v = patch[k];
      if (['from_gbp', 'up_to_gbp', 'typical_gbp'].includes(k)) { const s = v === null || v === '' ? null : Number(String(v).replace(/[£,\s]/g, '')); if (s !== null && !Number.isFinite(s)) throw new Error(`${k} must be a number`); out[k] = s === null ? null : Math.round(s); }
      else if (['quote_only', 'inferred'].includes(k)) out[k] = v === true || v === 'true';
      else out[k] = v == null ? null : String(v).trim() || null;
    }
    return out;
  };

  // A hand edit: the row becomes manual and a re-run leaves it alone
  async function setPriceRow(clientId, rowId, patch) {
    const p = cleanRowPatch(patch || {});
    if (!Object.keys(p).length) throw new Error('Nothing to change');
    const sets = Object.keys(p).map((k, i) => `${k} = $${i + 3}`);
    const { rowCount } = await pool.query(`UPDATE client_price_rows SET ${sets.join(', ')}, source = 'manual', updated_at = NOW() WHERE id = $1 AND client_id = $2 AND deleted = false`, [rowId, clientId, ...Object.values(p)]);
    if (!rowCount) throw new Error('Price row not found');
    const rows = await priceRows(clientId);
    return rows.find(r => r.id === rowId);
  }

  async function addPriceRow(clientId, patch) {
    const p = cleanRowPatch(patch || {});
    if (!p.service) throw new Error('A service name is needed');
    const rec = await record(clientId);
    const fields = rec.sections.flatMap(s => s.fields);
    const matched = P.matchService(p.service, P.candidatesFrom(fields));
    const { rows: mx } = await pool.query(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM client_price_rows WHERE client_id = $1`, [clientId]);
    const { rows } = await pool.query(`INSERT INTO client_price_rows (client_id, niche, service, from_gbp, up_to_gbp, typical_gbp, unit, what_moves_price, quote_only, inferred, inferred_note, unverified, matched_to, source, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,'manual',$13) RETURNING id`,
      [clientId, rec.niche, p.service, p.from_gbp ?? null, p.up_to_gbp ?? null, p.typical_gbp ?? null, p.unit ?? null, p.what_moves_price ?? null, !!p.quote_only, !!p.inferred, p.inferred_note ?? null, matched ? JSON.stringify(matched) : null, Number(mx[0].m) + 1]);
    return (await priceRows(clientId)).find(r => r.id === rows[0].id);
  }

  // Deleting is a hand edit too: a transcript row is kept as a hidden manual tombstone so a re-run can't bring it back
  async function deletePriceRow(clientId, rowId) {
    const { rowCount } = await pool.query(`UPDATE client_price_rows SET deleted = true, source = 'manual', updated_at = NOW() WHERE id = $1 AND client_id = $2`, [rowId, clientId]);
    if (!rowCount) throw new Error('Price row not found');
    return { deleted: true };
  }

  async function setPricesNotApplicable(clientId, value) {
    const cur = await priceState(clientId);
    if (value) return savePriceState(clientId, { status: 'not_applicable', error: null });
    return savePriceState(clientId, { status: cur && cur.transcript_hash ? 'done' : 'pending' });
  }

  // A hand edit. Survives every later submission and re-run.
  async function setField(clientId, key, value) {
    const rec = await record(clientId);
    if (!rec) throw new Error('Client not found');
    const f = rec.sections.flatMap(s => s.fields).find(x => x.key === key);
    if (!f) throw new Error(`Not a field for this client's niche: ${key}`);
    if (f.type === 'AudioRecording') throw new Error('Voice answers are not edited here; edit the typed field beside it');
    // A checkbox (the manual photos_received field) is filled only when ticked
    const blank = f.type === 'Checkbox' ? !(value === true || value === 'true') : I.isBlank(value);
    const stored = blank ? null : (f.type === 'Checkbox' ? true : value);
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

  // ── Categories and services (fillout/services/resolver.js, fillout/additional-services.js) ──
  const additional = createAdditionalServices({ pool, callModel, modelName, log });

  // The niche config for a client, its ticks and primary override, resolved
  async function servicesView(clientId, { categoryTabRule = 'ticked_only' } = {}) {
    const rec = await record(clientId);
    if (!rec) throw Object.assign(new Error('Client not found'), { status: 404 });
    const config = rec.niche ? R.configFor(rec.niche) : null;
    const { rows: cs } = await pool.query(`SELECT primary_category_key FROM clients WHERE id = $1`, [clientId]);
    const primaryOverride = (cs[0] && cs[0].primary_category_key) || null;
    const add = await additional.view(clientId);
    if (!config) return { niche: rec.niche, hasConfig: false, categoryTabRule, primaryOverride, resolved: null, additional: add, additionalText: '' };
    const fields = rec.sections.flatMap(s => s.fields);
    const ticks = R.ticksFromFields(fields, config);
    const resolved = R.resolve(ticks, config, { categoryTabRule, primaryOverride, additional: add.confirmed });
    const textField = fields.find(f => f.key === config.additionalServicesField);
    const additionalText = textField && typeof textField.value === 'string' ? textField.value : '';
    // Where each additional row came from: the additional-services ticks, the typed answer, or both
    const origins = new Map(R.additionalInputs(resolved.additionalTicks, additionalText, config).map(i => [i.id, i.origin]));
    for (const row of add.rows) row.origin = origins.get(R.norm(row.service)) || null;
    return {
      niche: rec.niche, hasConfig: true, categoryTabRule, primaryOverride, primaryDefault: config.primaryDefault,
      allCategories: config.categories.map(c => ({ key: c.key, name: c.name })),
      // "N of M ticked" per category tick group: ticks that match the group's own tick boxes
      tickCounts: config.categories.map(c => { const v = Array.isArray(ticks[c.tickGroup]) ? ticks[c.tickGroup] : []; const own = new Set((c.ticks || []).map(R.norm)); return { key: c.key, name: c.name, ticked: new Set(v.map(R.norm).filter(id => own.has(id))).size, total: own.size }; }),
      resolved, additional: add, additionalText, additionalTicks: resolved.additionalTicks,
    };
  }

  async function setPrimaryCategory(clientId, key) {
    const v = await servicesView(clientId);
    if (key && (!v.hasConfig || !v.allCategories.some(c => c.key === key))) throw Object.assign(new Error(`Not a category for this niche: ${key}`), { status: 400 });
    await pool.query(`UPDATE clients SET primary_category_key = $2 WHERE id = $1`, [clientId, key || null]);
    return servicesView(clientId);
  }

  async function proposeAdditional(clientId, { force = false } = {}) {
    const v = await servicesView(clientId);
    if (!v.hasConfig) return { skipped: 'no config for this niche' };
    const config = R.configFor(v.niche);
    const tabs = v.resolved.categories.map(c => ({ key: c.key, name: c.name }));
    return additional.propose(clientId, { text: v.additionalText, ticks: v.additionalTicks, tabs, config, force });
  }

  async function decideAdditional(clientId, rowId, body) {
    const v = await servicesView(clientId);
    const tabs = v.resolved ? v.resolved.categories.map(c => ({ key: c.key, name: c.name })) : [];
    await additional.decide(clientId, rowId, { status: body.status, categoryKey: body.category_key || null, tabs });
    return servicesView(clientId);
  }

  return { map, receive, saveRejected, process, recoverPending, listSubmissions, record, setField, audio, setClientFlags,
    servicesView, setPrimaryCategory, proposeAdditional, decideAdditional,
    extractPrices, priceView: clientId => record(clientId).then(r => r && r.prices), setPriceRow, addPriceRow, deletePriceRow, setPricesNotApplicable };
}

module.exports = { ensureFilloutTables, createFilloutService, defaultFetchAudio };
