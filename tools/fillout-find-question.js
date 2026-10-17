'use strict';
// Find a Fillout question by position: the one directly between two known ids.
//   node tools/fillout-find-question.js <after id> <before id> [payload.json]
// With a file, reads that payload. Without one, reads DATABASE_URL from .env and
// looks at the most recent submission in fillout_submissions that has such a
// question. Prints the question id, name, type and value, so the id can be put
// into fillout/field-map.json.

const path = require('path');
const fs = require('fs');
try {
  fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}

const I = require('../fillout/intake');
const [after, before, file] = process.argv.slice(2);
if (!after || !before) { console.error('usage: node tools/fillout-find-question.js <after id> <before id> [payload.json]'); process.exit(2); }
const probe = { position: { after, before } };
const show = (label, payload) => {
  const q = I.resolveQuestion(payload, probe);
  if (!q) { console.log(`${label}: no single question sits directly between ${after} and ${before}`); return false; }
  console.log(`${label}:\n  id:    ${q.id}\n  name:  ${JSON.stringify(q.name)}\n  type:  ${q.type}\n  value: ${JSON.stringify(q.value)}`);
  return true;
};

(async () => {
  if (file) { show(path.basename(file), JSON.parse(fs.readFileSync(file, 'utf8'))); return; }
  if (!process.env.DATABASE_URL) { console.error('No payload file given and DATABASE_URL is not set'); process.exit(2); }
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(`SELECT submission_id, received_at, business_name, raw_payload FROM fillout_submissions WHERE status <> 'rejected' ORDER BY received_at DESC`);
  let found = false;
  for (const r of rows) {
    const payload = typeof r.raw_payload === 'string' ? JSON.parse(r.raw_payload) : r.raw_payload;
    try { if (show(`${r.business_name || '(no name)'} ${r.submission_id} ${new Date(r.received_at).toISOString()}`, payload)) { found = true; break; } }
    catch (e) { console.log(`${r.submission_id}: ${e.message}`); }
  }
  if (!found) console.log(`Checked ${rows.length} submission(s); none has a question between those two ids.`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
