'use strict';

// ── Price rows from the "Prices for your services" voice answer ─────────────
// The pure parts: the prompt, reading and checking the model's reply, tracing
// each number back to the transcript, matching services to the form answers,
// the flags, and the tables. fillout/service.js runs the job and stores rows.
//
// Rules (Brandon, 17 Oct 2026): only numbers spoken in the transcript; a
// number the code cannot trace to the transcript keeps its row but is marked
// unverified; rows edited, added or deleted by hand (source manual) are never
// touched by a re-run, which only replaces transcript rows.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { extractJsonObject } = require('../json-extract');

const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'Price_Extraction_CORE.md');
const UNITS = ['per job', 'per hour', 'per day', 'per m2', 'per metre', 'per visit'];
const ROW_FIELDS = ['service', 'from_gbp', 'up_to_gbp', 'typical_gbp', 'unit', 'what_moves_price', 'quote_only', 'inferred', 'inferred_note'];

async function ensurePriceTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_price_rows (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      submission_id    TEXT,
      niche            TEXT,
      service          TEXT NOT NULL,
      from_gbp         INTEGER,
      up_to_gbp        INTEGER,
      typical_gbp      INTEGER,
      unit             TEXT,
      what_moves_price TEXT,
      quote_only       BOOLEAN NOT NULL DEFAULT false,
      inferred         BOOLEAN NOT NULL DEFAULT false,
      inferred_note    TEXT,
      unverified       BOOLEAN NOT NULL DEFAULT false,
      matched_to       JSONB,
      source           TEXT NOT NULL DEFAULT 'transcript',
      deleted          BOOLEAN NOT NULL DEFAULT false,
      transcript_hash  TEXT,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS client_price_state (
      client_id        UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      status           TEXT NOT NULL DEFAULT 'pending',
      transcript_hash  TEXT,
      transcript       TEXT,
      error            TEXT,
      model            TEXT,
      extracted_at     TIMESTAMPTZ,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

const hashTranscript = t => crypto.createHash('sha256').update(String(t || '').trim()).digest('hex');

function buildPrompt(transcript, niche) {
  const system = fs.readFileSync(PROMPT_PATH, 'utf8');
  const message = `Trade: ${niche || 'not given'}\n\nTRANSCRIPT:\n"""\n${String(transcript || '').trim()}\n"""\n\nReturn the JSON object now.`;
  return { system, message };
}

// ── The reply, checked field by field. Throws on anything not usable. ──
function toPounds(v, field) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') v = v.replace(/[£,\s]/g, '');
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} is not a number: ${JSON.stringify(v)}`);
  return Math.round(n);
}

function parseReply(text) {
  const obj = extractJsonObject(text);
  if (!obj || !Array.isArray(obj.rows)) throw new Error('reply has no "rows" array');
  return obj.rows.map((r, i) => {
    if (!r || typeof r !== 'object') throw new Error(`row ${i + 1} is not an object`);
    const service = String(r.service || '').trim();
    if (!service) throw new Error(`row ${i + 1} has no service`);
    const unit = r.unit == null || r.unit === '' ? null : String(r.unit).trim();
    return {
      service,
      from_gbp: toPounds(r.from_gbp, 'from_gbp'), up_to_gbp: toPounds(r.up_to_gbp, 'up_to_gbp'), typical_gbp: toPounds(r.typical_gbp, 'typical_gbp'),
      unit, unit_known: unit ? UNITS.includes(unit.toLowerCase()) : null,
      what_moves_price: r.what_moves_price ? String(r.what_moves_price).trim() : null,
      quote_only: r.quote_only === true, inferred: r.inferred === true,
      inferred_note: r.inferred_note ? String(r.inferred_note).trim() : null,
      sort_order: i,
    };
  });
}

// ── Every number that can be read from the transcript ──
const SMALL = { zero: 0, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE = { hundred: 100, thousand: 1000, grand: 1000, k: 1000, million: 1000000 };

function transcriptNumbers(transcript) {
  const found = new Set();
  const text = String(transcript || '').toLowerCase();
  // Digits: £1,200  2.5k  10k  500
  for (const m of text.matchAll(/£?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|grand|thousand)?\b/g)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    found.add(m[2] ? n * 1000 : n);
    if (!m[2]) found.add(n * 1000); // "10" said where the others are in thousands: the model marks it inferred
  }
  // Words: walk tokens, build a number until a token that is not part of one.
  // Punctuation is a boundary ("five grand, two hundred" is two numbers).
  const tokens = text.match(/[a-z]+|[0-9][0-9.,]*|[^\sa-z0-9]/g) || [];
  let total = 0, current = 0, active = false, sawScale = false;
  const flush = () => {
    if (active) {
      const n = total + current;
      found.add(n);
      if (!sawScale) found.add(n * 1000); // "ten" said where the other figures are in thousands (the model marks it inferred)
    }
    total = 0; current = 0; active = false; sawScale = false;
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], next = tokens[i + 1];
    if (t === 'a' || t === 'an') {
      if (active && next === 'half') continue;            // "one and a half"
      flush();
      if (next in SCALE) { current = 1; active = true; }  // "a thousand", "a hundred"
      continue;
    }
    if (t in SMALL) { if (active && current && !(current % 10 === 0 && current < 100)) flush(); current += SMALL[t]; active = true; }
    else if (t in TENS) { if (active && current && current < 100) flush(); current += TENS[t]; active = true; }
    else if (t in SCALE) {
      if (!active) continue;                                 // "k" or "grand" on its own is not a number
      const s = SCALE[t];
      if (s === 100) current *= 100;
      else { total += (current || 1) * s; current = 0; sawScale = true; }
    }
    else if (t === 'and' && active) continue;
    else if (t === 'half' && active) current += 0.5;
    else flush();
  }
  flush();
  for (const n of [...found]) if (!Number.isInteger(n)) { found.delete(n); found.add(Math.round(n)); found.add(Math.round(n * 1000)); }
  return found;
}

// Marks rows whose numbers the transcript does not account for
function verifyRows(rows, transcript) {
  const nums = transcriptNumbers(transcript);
  for (const r of rows) {
    const values = [r.from_gbp, r.up_to_gbp, r.typical_gbp].filter(v => v !== null && v !== undefined);
    r.unverified = values.some(v => !nums.has(v));
  }
  return rows;
}

// ── Matching a row's service to the form: ticked services and the three most-wanted jobs ──
// A word cut to a simple stem: "cleaning", "cleaner", "cleaned", "cleans" → "clean";
// "fences", "fencing", "fence" → "fenc"; short words are left alone.
function stem(word) {
  let w = word;
  if (w.length > 4 && /ies$/.test(w)) w = w.slice(0, -3) + 'y';
  else if (w.length > 5 && /(ss|sh|ch|x|z)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
  else if (w.length > 4 && /(ed|er)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
  if (w.length > 3 && /e$/.test(w)) w = w.slice(0, -1); // "fence" and "fenc(ing)" meet
  return w;
}
const stemWords = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map(stem);
const normService = s => stemWords(s).join(' ');
const allIn = (small, big) => small.every(w => big.includes(w));

// candidates: [{key, value}] with most-wanted jobs first. Equal stems, or one side's
// words all present in the other's as whole stems ("patio clean" in "patio cleaning").
// A lone word never matches a longer name ("repair" is not "boiler repair").
function matchService(service, candidates) {
  const s = stemWords(service);
  if (!s.length) return null;
  const sKey = s.join(' ');
  for (const c of candidates) { if (normService(c.value) === sKey) return { key: c.key, value: c.value }; }
  for (const c of candidates) {
    const v = stemWords(c.value);
    const shorter = v.length <= s.length ? v : s, longer = shorter === v ? s : v;
    if (shorter.length >= 2 && allIn(shorter, longer)) return { key: c.key, value: c.value };
  }
  return null;
}

function matchRows(rows, candidates) {
  for (const r of rows) r.matched_to = matchService(r.service, candidates);
  return rows;
}

// Two (or more) rows for one service, as when the speaker gives two prices ("£50 per
// big letter and £20 per small letter"): one row, from the lowest figure up to the
// highest, the split kept in what_moves_price, inferred true. Only numbers the rows
// already carry are used.
function mergeDuplicateServices(rows) {
  const groups = new Map();
  for (const r of rows) {
    const k = normService(r.service);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const group of groups.values()) {
    if (group.length === 1) { out.push(group[0]); continue; }
    const nums = group.flatMap(r => [r.from_gbp, r.up_to_gbp, r.typical_gbp]).filter(n => n !== null && n !== undefined);
    const first = group[0];
    const parts = group.map(r => {
      const n = [r.typical_gbp, r.from_gbp, r.up_to_gbp].find(x => x !== null && x !== undefined);
      const what = r.what_moves_price || r.unit || r.service;
      return n === undefined ? what : `${what} £${n}`;
    });
    out.push({
      ...first,
      from_gbp: nums.length ? Math.min(...nums) : null,
      up_to_gbp: nums.length > 1 ? Math.max(...nums) : null,
      typical_gbp: nums.length === 1 ? nums[0] : null,
      unit: group.map(r => r.unit).find(Boolean) || null,
      what_moves_price: parts.join(', '),
      quote_only: group.every(r => r.quote_only),
      inferred: true,
      inferred_note: [`${group.length} prices given for one service, kept as one row`, ...group.map(r => r.inferred_note).filter(Boolean)].join('; '),
    });
  }
  return out.map((r, i) => ({ ...r, sort_order: i }));
}

// The form answers a row can match: most-wanted jobs first, then every tick
function candidatesFrom(fields) {
  const out = [];
  for (const f of fields) {
    if (/most_wanted/.test(f.key) && f.status === 'filled' && typeof f.value === 'string') out.push({ key: f.key, value: f.value });
  }
  for (const f of fields) {
    if (f.group === 'services' && Array.isArray(f.value)) for (const v of f.value) if (typeof v === 'string' && v.trim()) out.push({ key: f.key, value: v });
  }
  return out;
}

// Flags above the table and the warning count that stays out of the score
function priceFlags(rows, fields, state) {
  const live = rows.filter(r => !r.deleted);
  const flags = [];
  if (state && state.status === 'done' && !live.length) flags.push({ code: 'no_prices', msg: 'No prices given' });
  const mostWanted = fields.filter(f => /most_wanted/.test(f.key) && f.status === 'filled' && typeof f.value === 'string');
  const unpriced = mostWanted.filter(mw => !live.some(r => r.matched_to && r.matched_to.key === mw.key));
  for (const mw of unpriced) flags.push({ code: 'most_wanted_no_price', key: mw.key, msg: `Most-wanted job has no price: ${mw.value}` });
  if (live.some(r => r.inferred)) flags.push({ code: 'inferred', msg: 'Inferred value' });
  if (live.some(r => r.unverified)) flags.push({ code: 'unverified', msg: 'A number could not be traced to the transcript' });
  return { flags, warnings: { mostWantedWithoutPrice: unpriced.length } };
}

module.exports = { ensurePriceTables, hashTranscript, buildPrompt, parseReply, transcriptNumbers, verifyRows, stem, normService, matchService, matchRows, mergeDuplicateServices, candidatesFrom, priceFlags, UNITS, ROW_FIELDS, PROMPT_PATH };
