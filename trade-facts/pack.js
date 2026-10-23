'use strict';

// ── Trade facts packs ────────────────────────────────────────────────────────
// One research pack per niche (trade-facts/<niche>.md), written by scripts/trade-facts.js
// from trade-facts/core.md plus trade-facts/blocks/<niche>.md. A pack is markdown with
// seven tables, each under a line naming it ("TABLE A — Service process" … "TABLE G"):
//   A service process, B signs and failure, F price factors: one row per service
//   C rules and standards, D bodies and schemes, E facts: one row per item
//   G gaps, dropped claims, conflicts
// The first line of a pack is its header: "generated <date> · model <model> · verified: no".
// Verification lives in the database (trade-facts/store.js), keyed to the file's
// fingerprint, so a re-run makes the pack unverified again without touching the file.
//
// packForService(niche, service) is the loader for the service page prompt: the
// service's rows from A, B and F plus C, D and E in full, as markdown.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const library = require('../niche-library/library');

// TRADE_FACTS_DIR points the module at another folder (the fixtures use a temp copy)
const DIR = process.env.TRADE_FACTS_DIR || __dirname;
const BLOCKS_DIR = path.join(DIR, 'blocks');
const CORE_FILE = path.join(DIR, 'core.md');

const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');

// A pack name for anything that names a niche: a pack or block that exists under that
// name, else the niche's library file name (niche-library/library.js keyFor: a niche key,
// a Fillout label or an old trade name). Packs and libraries share their names. null for
// blank; a name that matches no niche is used as it is (and shows as a missing pack).
function packNameFor(nicheOrTrade) {
  const n = norm(nicheOrTrade);
  if (!n) return null;
  const direct = n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (direct && (fs.existsSync(packFile(direct)) || fs.existsSync(blockFile(direct)))) return direct;
  return library.keyFor(n) || direct || null;
}

function packFile(niche) { return path.join(DIR, `${niche}.md`); }
function blockFile(niche) { return path.join(BLOCKS_DIR, `${niche}.md`); }
const relative = file => path.relative(path.join(DIR, '..'), file).split(path.sep).join('/');

function fingerprintOf(text) { return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16); }

// "generated 2026-10-20 · model high (openai/x) · verified: no" → { generated, model, verifiedNote }
function parseHeader(text) {
  const first = String(text || '').replace(/^﻿/, '').split(/\r?\n/)[0] || '';
  const m = first.match(/^generated\s+(\S+)\s+·\s+model\s+(.+?)\s+·\s+verified:\s*(yes|no)\s*$/i);
  if (!m) return null;
  return { generated: m[1], model: m[2].trim(), verifiedNote: m[3].toLowerCase() };
}

function header({ generated, model }) { return `generated ${generated} · model ${model} · verified: no`; }

// { niche, file, exists, text, header, fingerprint }
function readPack(niche) {
  const file = packFile(niche);
  if (!fs.existsSync(file)) return { niche, file: relative(file), exists: false, text: '', header: null, fingerprint: null };
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return { niche, file: relative(file), exists: true, text, header: parseHeader(text), fingerprint: fingerprintOf(text) };
}

// Every niche with a block or a pack, sorted
function listNiches() {
  const names = new Set();
  for (const dir of [BLOCKS_DIR, DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md') || f === 'core.md' || f === 'README.md') continue;
      names.add(f.replace(/\.md$/, ''));
    }
  }
  return [...names].sort();
}

function hasBlock(niche) { return fs.existsSync(blockFile(niche)); }

// The block's prompt text: the fenced "=== NICHE BLOCK" part when the file wraps it in
// a code fence with a note above, else the whole file
function readBlock(niche) {
  const text = fs.readFileSync(blockFile(niche), 'utf8').replace(/\r\n/g, '\n');
  const fence = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  const body = fence && /=== NICHE BLOCK/.test(fence[1]) ? fence[1] : text;
  return body.trim();
}

// The core prompt: the fenced part when the file wraps it in a code fence with a note
// above (Brandon's file does), else the whole file
function readCore() {
  if (!fs.existsSync(CORE_FILE)) throw new Error(`The core prompt is missing: put it at ${relative(CORE_FILE)}`);
  const text = fs.readFileSync(CORE_FILE, 'utf8').replace(/\r\n/g, '\n');
  const fence = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  return (fence ? fence[1] : text).trim();
}

// ── Tables ───────────────────────────────────────────────────────────────────

const TABLE_LINE = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*TABLE\s+([A-G])\b([^\n]*)$/i;

function splitCells(line) {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cell = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cell += '|'; i++; continue; }
    if (s[i] === '|') { cells.push(cell.trim()); cell = ''; continue; }
    cell += s[i];
  }
  cells.push(cell.trim());
  return cells;
}

const isSeparator = line => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

// Map letter → { letter, title, columns, rows: [[cells]], text }. The title is the TABLE
// line without heading marks. A table's text is everything to the next TABLE line.
function parseTables(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const tables = new Map();
  let current = null;
  for (const line of lines) {
    const m = line.match(TABLE_LINE);
    if (m) {
      const title = line.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
      current = { letter: m[1].toUpperCase(), title, columns: [], rows: [], lines: [] };
      tables.set(current.letter, current);
      continue;
    }
    if (/^\s*(?:#{1,6}\s*)?(?:\*\*)?END OF PACK(?:\*\*)?\s*$/i.test(line)) { current = null; continue; }
    if (current) current.lines.push(line);
  }
  for (const t of tables.values()) {
    const pipes = t.lines.filter(l => /^\s*\|/.test(l));
    if (pipes.length) {
      t.columns = splitCells(pipes[0]);
      for (const l of pipes.slice(1)) { if (!isSeparator(l)) t.rows.push(splitCells(l)); }
    }
    t.text = t.lines.join('\n').trim();
  }
  return tables;
}

const normName = s => norm(s).replace(/\*\*/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Does a first cell name this service? Exact after normalising; a cell listing several
// services ("Roof repairs; Flat roof repairs") matches on any of them.
function cellNames(cell, service) {
  const want = normName(service);
  if (!want) return false;
  return String(cell).split(/[;/,]/).some(part => normName(part) === want);
}

function renderTable(t, rows) {
  if (!t.columns.length) return t.text || '_(empty)_';
  const row = cells => `| ${cells.map(c => c.replace(/\|/g, '\\|')).join(' | ')} |`;
  return [row(t.columns), `|${t.columns.map(() => '---').join('|')}|`, ...rows.map(row)].join('\n');
}

const TITLES = { A: 'Service process', B: 'Signs and failure', C: 'Rules and standards', D: 'Bodies and schemes', E: 'Facts', F: 'Price factors (no figures)', G: 'Gaps, dropped claims, conflicts' };

// The pack text for one service page: its rows from Tables A, B and F, and Tables C, D
// and E in full, as markdown. Throws when the pack is missing. missing lists what the
// pack lacked ("A:Roof repairs" for a service row, "C" for a whole table).
function packForService(niche, service) {
  const pack = readPack(niche);
  if (!pack.exists) throw Object.assign(new Error(`No trade facts pack for "${niche}": ${pack.file} is missing`), { status: 422 });
  const tables = parseTables(pack.text);
  const out = [`# Trade facts: ${niche} · ${service}`];
  if (pack.header) out.push(`_${pack.file}: generated ${pack.header.generated} · model ${pack.header.model}_`);
  const missing = [];
  for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const t = tables.get(letter);
    const title = t ? t.title : `TABLE ${letter} — ${TITLES[letter]}`;
    out.push('', `## ${title}`);
    if (!t) { out.push(`_Table ${letter} is not in the pack._`); missing.push(letter); continue; }
    if (letter === 'C' || letter === 'D' || letter === 'E') { out.push(renderTable(t, t.rows)); continue; }
    const rows = t.rows.filter(r => cellNames(r[0] || '', service));
    if (!rows.length) { out.push(`_No row for "${service}" in Table ${letter}._`); missing.push(`${letter}:${service}`); continue; }
    out.push(renderTable(t, rows));
  }
  return { markdown: out.join('\n'), missing, header: pack.header, file: pack.file };
}

// Proper nouns the pack names (Brandon, 23 Oct, for the GBP lower casing): the trade
// bodies, accreditations and schemes of Table D (the whole name cell), and the brands,
// standards and bodies written with a capital inside a sentence anywhere in Tables C, D
// and E (sentence openers are left out, the sources column too). Lower case words; the
// caller checks the pack is verified before using them. [] when the pack is missing.
// They come back as phrases ("Tree Preservation Order", "BALI Accredited Contractor",
// "Marshalls"): a run of capitalised words, with "and", "of", "the", "for" allowed inside.
// A one word phrase is kept only when it is an acronym, a Table D name, or a word the pack
// never writes in lower case (a brand); "Guarantee" from "10 Year Guarantee" is dropped.
const CONNECTORS = new Set(['and', 'of', 'the', 'for', '&']);
// Words that are capitalised only because they sit in a title (an Act, a scheme tier, a
// register): never a name on their own. Places and months are left as proper nouns.
const TITLE_WORDS = new Set(('act acts order orders association british national federation institute guild council standard standards code scheme schemes register registered approved accredited assured ' +
  'trusted traders management town country countryside wildlife environmental protection building buildings conservation development planning highways portal level gold silver platinum bronze ' +
  'master member members partner premier contractor contractors builder builders competent person persons skilled worker workers charges rights information programme volume chapter class classes ' +
  'article schedule document documents additional all best minor works search promise pump carbon monoxide vehicles networks industry engineering commercial agency owner craftsmen species habitats ' +
  'dwellings compliance consumer contracts cancellation recommendations reform regulatory regulation regulations requirement requirements where every each use water supply fittings grounds height ' +
  'lifting operations equipment temporary bans behaviour permitted general historic listed areas party wall sustainable type academy confederation workmanship rolled blue elevate gravity skills ' +
  'slating installer installers products product professional roof roofing quality safety health service services system systems total group limited company certified certificate certification ' +
  'guarantee guarantees warranty insurance backed scotland wales england great britain uk city guilds preservation bedroom sanitation screeds gypsum environment chartered landscapers floorlayers').split(/\s+/));
const titleWord = w => TITLE_WORDS.has(w.toLowerCase()) || /['’]s$/.test(w);
function packProperNouns(niche) {
  const pack = readPack(niche);
  if (!pack.exists) return [];
  const tables = parseTables(pack.text);
  const clean = cell => String(cell || '').replace(/\*\*/g, '').replace(/\[[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/[–—]/g, ' ');
  const core = w => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9'’]+$/g, '');
  const isCap = w => /^[A-Z][A-Za-z0-9'’]*$/.test(core(w)) && core(w).length > 1;
  const isAcronym = w => /^[A-Z0-9]{2,}$/.test(core(w)) && /[A-Z]/.test(core(w));
  // Words the pack writes in lower case somewhere (URLs left out: marshalls.co.uk is not prose)
  const prose = pack.text.replace(/https?:\/\/\S+/g, ' ').replace(/\[[^\]]*\]/g, ' ');
  const lowerSeen = new Set(prose.match(/(?<![A-Za-z])[a-z][a-z0-9]+(?![A-Za-z])/g) || []);
  const lowerInPack = w => lowerSeen.has(core(w).toLowerCase());
  const phrases = new Map();   // lower → as written
  const addPhrase = (words, { single }) => {
    const run = words.map(core).filter(Boolean);
    while (run.length && CONNECTORS.has(run[run.length - 1].toLowerCase())) run.pop();
    if (!run.length) return;
    if (run.length === 1 && !single(run[0])) return;
    const text = run.join(' ');
    if (!phrases.has(text.toLowerCase())) phrases.set(text.toLowerCase(), text);
  };
  const scanCell = (cell, { whole }) => {
    const text = clean(cell);
    for (const s of text.split(/(?<=[.!?;:])\s+|\s*\(|\)\s*/)) {
      const ws = s.trim().split(/\s+/).filter(Boolean);
      if (!ws.length) continue;
      if (whole) { if (isCap(ws[0]) || isAcronym(ws[0])) addPhrase(ws, { single: () => true }); continue; }
      // A sentence opener starts a run only when more capitalised words follow ("Tree
      // Preservation Orders" at the start of a cell); alone it is just a sentence start
      let run = [], opener = false;
      const flush = () => {
        const caps = run.filter(w => isCap(w) || isAcronym(w)).length;
        if (!(opener && caps < 2)) addPhrase(run, { single: x => isAcronym(x) || (!lowerInPack(x) && !titleWord(x)) });
        run = []; opener = false;
      };
      ws.forEach((w, i) => {
        if (isCap(w) || isAcronym(w) || (run.length && CONNECTORS.has(w.toLowerCase()))) { if (i === 0 && !isAcronym(w)) opener = true; run.push(w); return; }
        flush();
      });
      flush();
    }
  };
  for (const letter of ['C', 'D', 'E']) {
    const t = tables.get(letter);
    if (!t) continue;
    for (const row of t.rows) row.slice(0, Math.max(1, row.length - 1)).forEach((cell, i) => scanCell(cell, { whole: letter === 'D' && i === 0 }));
  }
  // A brand inside a longer name ("Marshalls Hard Landscape Guarantee") is a name on its own
  // when the pack never writes it in lower case
  for (const p of [...phrases.values()]) {
    if (!/\s/.test(p)) continue;
    for (const w of p.split(/\s+/)) {
      if (CONNECTORS.has(w.toLowerCase()) || w.length < 3 || !isCap(w) || isAcronym(w) || lowerSeen.has(w.toLowerCase()) || titleWord(w)) continue;
      if (!phrases.has(w.toLowerCase())) phrases.set(w.toLowerCase(), w);
    }
  }
  return [...phrases.values()].sort((a, b) => a.localeCompare(b));
}

module.exports = {
  DIR, BLOCKS_DIR, CORE_FILE, packNameFor, packFile, blockFile, relative, readPack, readBlock, readCore, listNiches, hasBlock,
  parseHeader, header, fingerprintOf, parseTables, packForService, packProperNouns, cellNames, normName,
};
