'use strict';
// Transcribe a client's stored recordings that have no transcript, then extract the prices.
//   node tools/fillout-transcribe.js "<client name or id>" [--dry-run]
// Runs against DATABASE_URL from .env with OPENAI_API_KEY (the transcriber) and
// ANTHROPIC_API_KEY (the price extraction) from .env. Fillout's own transcripts are
// never touched: only recordings with no text are sent. --dry-run lists them and
// sends nothing. The same step runs on its own after every Fillout delivery and on
// Reprocess from the inbox; this is for a record that arrived before the step
// existed (Ethan's nine, 2 Nov 2026) or after a failed call.

const path = require('path');
const fs = require('fs');
try {
  fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}

const { Pool } = require('pg');
const { createFilloutService, ensureFilloutTables } = require('../fillout/service');
const { createPgAudioStore } = require('../fillout/audio-store');
const { createTranscriber } = require('../fillout/transcribe');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const who = args.find(a => !a.startsWith('--'));
if (!who || !process.env.DATABASE_URL) { console.error('usage: node tools/fillout-transcribe.js "<client name or id>" [--dry-run]  (DATABASE_URL from .env)'); process.exit(2); }

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await ensureFilloutTables(pool); // the transcription columns, on a database the new code has not started against yet
    const isId = /^[0-9a-f-]{36}$/i.test(who);
    const { rows: cs } = await pool.query(isId ? `SELECT id, name FROM clients WHERE id = $1` : `SELECT id, name FROM clients WHERE lower(name) = lower($1) AND archived_at IS NULL`, [who]);
    if (cs.length !== 1) throw new Error(cs.length ? `${cs.length} clients called ${JSON.stringify(who)}; use the id` : `no client ${JSON.stringify(who)}`);
    const client = cs[0];
    const { rows: missing } = await pool.query(`SELECT field_key, duration, size_bytes, transcription_status FROM client_audio WHERE client_id = $1 AND download_status = 'stored' AND (transcription IS NULL OR transcription = '') ORDER BY field_key`, [client.id]);
    console.log(`${client.name} (${client.id}): ${missing.length} stored recording(s) without a transcript`);
    for (const m of missing) console.log(`  ${m.field_key}: ${m.duration || '?'}s, ${Math.round((m.size_bytes || 0) / 1024)} KB${m.transcription_status ? `, last: ${m.transcription_status}` : ''}`);
    if (dryRun || !missing.length) return;

    const transcriber = createTranscriber({ apiKey: process.env.OPENAI_API_KEY || '' });
    if (!transcriber) throw new Error('OPENAI_API_KEY is not set in .env');
    let callModel = null, modelName = null;
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const { makeCallModel } = require('../anthropic-call');
      const v20 = require('../v20-generate');
      modelName = v20.V20_MODEL;
      callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), modelName);
    } else console.warn('ANTHROPIC_API_KEY is not set: transcripts only, no price extraction');
    const svc = createFilloutService({ pool, audioStore: createPgAudioStore(pool), transcriber, callModel, modelName });
    const t = await svc.transcribeMissing(client.id);
    console.log(`transcribed ${t.done} of ${t.missing}${t.failed ? `, ${t.failed} failed` : ''}`);
    const { rows: after } = await pool.query(`SELECT field_key, transcription_status, transcription_error, length(transcription) AS chars FROM client_audio WHERE client_id = $1 AND download_status = 'stored' ORDER BY field_key`, [client.id]);
    for (const a of after) console.log(`  ${a.field_key}: ${a.transcription_status || 'fillout'}${a.chars ? `, ${a.chars} chars` : ''}${a.transcription_error ? ` (${a.transcription_error})` : ''}`);
    if (callModel && t.done) {
      const p = await svc.extractPrices(client.id, { force: true });
      console.log('prices:', JSON.stringify(p).slice(0, 300));
    }
  } finally { await pool.end(); }
})().catch(err => { console.error(err.message); process.exit(1); });
