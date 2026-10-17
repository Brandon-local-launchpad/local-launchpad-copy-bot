'use strict';

// ── Fillout onboarding intake: the pure parts ───────────────────────────────
// Reads a Fillout webhook payload against fillout/field-map.json and turns it
// into the client fields we keep. No database here; fillout/service.js stores.
//
// Rules (stage 1, 17 Oct 2026):
//   - questions are keyed by id only; names repeat and carry "(5)" suffixes
//   - only the chosen niche's block is read; other niches' questions never leave this file
//   - values are kept exactly as submitted (no splitting, no tidying)
//   - blank = null, "", whitespace only, [], or an audio answer with no url and no transcript

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAP_PATH = path.join(__dirname, 'field-map.json');

function loadFieldMap(file = MAP_PATH) {
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  const seen = new Set();
  for (const f of map.fields) {
    if (!f.id || !f.key || !f.section || !f.niche) throw new Error(`field map: entry missing id, key, section or niche: ${JSON.stringify(f)}`);
    if (f.niche !== 'all' && !map.niches[f.niche]) throw new Error(`field map: field ${f.key} names a niche not under niches: ${f.niche}`);
    const k = `${f.niche}|${f.key}`;
    if (seen.has(k)) throw new Error(`field map: duplicate key ${f.key} for niche ${f.niche}`);
    seen.add(k);
  }
  return map;
}

// "Tree Service (1)" → "Tree Service"
const stripSuffix = name => String(name == null ? '' : name).replace(/\s*\(\d+\)\s*$/, '').trim();

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.every(isBlank);
  if (typeof value === 'object') {
    // AudioRecording: {url, filename, transcription, duration}
    if ('url' in value || 'transcription' in value) return isBlank(value.url) && isBlank(value.transcription);
    return Object.keys(value).length === 0;
  }
  return false;
}

const norm = s => String(s == null ? '' : s).trim().toLowerCase();

// Shared secret check: hash both sides so the comparison is constant time whatever the lengths
function secretMatches(given, expected) {
  if (!expected || typeof given !== 'string' || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// The secret as Fillout can send it: a header or ?token=
function secretFromRequest(req) {
  const h = req.headers || {};
  const auth = String(h.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  return (
    (h['x-fillout-secret'] && String(h['x-fillout-secret'])) ||
    (h['x-webhook-secret'] && String(h['x-webhook-secret'])) ||
    (bearer && bearer[1]) ||
    (req.query && typeof req.query.token === 'string' && req.query.token) ||
    ''
  );
}

function questionsById(payload) {
  const qs = payload && payload.submission && Array.isArray(payload.submission.questions) ? payload.submission.questions : null;
  if (!qs) throw new Error('Payload has no submission.questions array');
  const out = new Map();
  for (const q of qs) if (q && q.id) out.set(q.id, q);
  return out;
}

const submissionId = payload => (payload && payload.submission && payload.submission.submissionId) || null;

function detectNiche(payload, map) {
  const q = questionsById(payload).get(map.niche_question_id);
  const v = q ? q.value : null;
  return isBlank(v) ? null : String(v).trim();
}

// Universal fields plus the chosen niche's block. An unknown niche gets the universal fields only.
function fieldsForNiche(map, niche) {
  const known = !!(niche && map.niches[niche]);
  return map.fields.filter(f => f.niche === 'all' || (known && f.niche === niche));
}

// The client record as one submission gives it. Fields outside the niche are not read at all.
function buildRecord(payload, map) {
  const byId = questionsById(payload);
  const niche = detectNiche(payload, map);
  const nicheKnown = !!(niche && map.niches[niche]);
  const fields = fieldsForNiche(map, niche).map(f => {
    const q = byId.get(f.id);
    const value = q ? q.value : null;
    const blank = isBlank(value);
    return {
      key: f.key, id: f.id, label: f.label || stripSuffix(q && q.name), section: f.section, type: f.type, niche: f.niche,
      group: f.group || null, optional: !!f.optional,
      value: blank ? null : value, status: blank ? 'blank' : 'filled', present: !!q,
    };
  });
  const get = id => { const q = byId.get(id); return q && !isBlank(q.value) ? String(q.value).trim() : ''; };
  return {
    submissionId: submissionId(payload),
    submissionTime: (payload.submission && payload.submission.submissionTime) || null,
    niche, nicheKnown,
    businessName: get(map.business_name_question_id),
    businessEmail: get(map.business_email_question_id),
    fields,
    // Questions in the payload that no map entry covers, for the "didn't fit" report (ids only)
    unmapped: [...byId.keys()].filter(id => !map.fields.some(f => f.id === id)),
  };
}

const isAudioField = f => f.type === 'AudioRecording';

// Completeness counts units, not fields: fields that share a `group` (a voice
// and typed pair, the five accreditation triples) are one unit, filled if any of
// them is. Units whose fields are all `optional` are left out of the expected
// count and reported as optional filled. Headline = filled / expected.
function completeness(fields) {
  const units = new Map();
  fields.forEach((f, i) => {
    const id = f.group || `field:${f.key || i}`;
    const u = units.get(id) || { optional: true, filled: false, keys: [] };
    if (!f.optional) u.optional = false;
    if (f.status === 'filled') u.filled = true;
    u.keys.push(f.key);
    units.set(id, u);
  });
  const all = [...units.values()];
  const expected = all.filter(u => !u.optional);
  const optional = all.filter(u => u.optional);
  const filled = expected.filter(u => u.filled).length;
  return {
    filled, expected: expected.length, pct: expected.length ? Math.round((filled / expected.length) * 100) : 0,
    optionalFilled: optional.filter(u => u.filled).length, optionalTotal: optional.length,
    fields: fields.length,
  };
}

module.exports = {
  MAP_PATH, loadFieldMap, stripSuffix, isBlank, norm, secretMatches, secretFromRequest,
  questionsById, submissionId, detectNiche, fieldsForNiche, buildRecord, isAudioField, completeness,
};
