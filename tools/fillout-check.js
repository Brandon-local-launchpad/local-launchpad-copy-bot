'use strict';
// Compare what Fillout sent for one question with what the client record shows.
//   node tools/fillout-check.js <question id> [submission id or business name]
// Reads DATABASE_URL from .env. Prints, for each matching submission: the raw
// value in fillout_submissions.raw_payload for that question id, the question's
// name as Fillout sent it, the field the map puts it in, and the value stored in
// client_fields. If the raw value and the stored value differ, the map or the
// processing is wrong; if they are the same, it is what the client typed.

const path = require('path');
try {
  require('fs').readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}

const [qid, which] = process.argv.slice(2);
if (!qid) { console.error('usage: node tools/fillout-check.js <question id> [submission id or business name]'); process.exit(2); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(2); }

const { Pool } = require('pg');
const I = require('../fillout/intake');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const map = I.loadFieldMap();
  const entry = map.fields.find(f => f.id === qid);
  console.log(`Question ${qid}: ${entry ? `mapped to field "${entry.key}" (${entry.section}, niche ${entry.niche})` : 'NOT in the field map'}`);
  const { rows } = await pool.query(
    `SELECT id, submission_id, received_at, status, client_id, business_name, raw_payload FROM fillout_submissions
      WHERE status <> 'rejected' ORDER BY received_at DESC`);
  const picked = rows.filter(r => !which || r.submission_id === which || I.norm(r.business_name) === I.norm(which));
  if (!picked.length) { console.log('No matching submission'); await pool.end(); return; }
  for (const r of picked) {
    const payload = typeof r.raw_payload === 'string' ? JSON.parse(r.raw_payload) : r.raw_payload;
    const q = I.questionsById(payload).get(qid);
    console.log(`\n${r.business_name || '(no name)'}  ${r.submission_id}  ${new Date(r.received_at).toISOString()}  ${r.status}`);
    console.log(`  raw question name: ${q ? JSON.stringify(q.name) : '(question id not in this payload)'}`);
    console.log(`  raw value:         ${q ? JSON.stringify(q.value) : '-'}`);
    if (entry && r.client_id) {
      const f = (await pool.query(`SELECT value, status, source, updated_at FROM client_fields WHERE client_id = $1 AND field_key = $2`, [r.client_id, entry.key])).rows[0];
      console.log(`  stored value:      ${f ? JSON.stringify(f.value) : '(no row)'}  ${f ? `${f.status}, source ${f.source}` : ''}`);
      const same = f && JSON.stringify(f.value) === JSON.stringify(q && !I.isBlank(q.value) ? q.value : null);
      console.log(`  verdict:           ${!f ? 'nothing stored' : f.source === 'manual' ? 'typed in on the record page, not from the form' : same ? 'same as Fillout sent: what the client typed' : 'DIFFERS from the raw payload: mapping or processing error'}`);
    }
    // Any other question whose value equals this one, in case the text came from elsewhere
    if (q && !I.isBlank(q.value)) {
      const twins = [...I.questionsById(payload).values()].filter(o => o.id !== qid && JSON.stringify(o.value) === JSON.stringify(q.value));
      if (twins.length) console.log(`  same text also in:  ${twins.map(t => `${t.id} ${JSON.stringify(t.name)}`).join('; ')}`);
    }
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
