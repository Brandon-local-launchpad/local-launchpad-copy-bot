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

// The pack text for one category page (23 Oct): the rows of Tables A, B and F for every
// one of the category's services, and Tables C, D and E in full. Throws when the pack
// is missing. missing lists the services with no row in a table ("A:Mulching").
function packForCategory(niche, category, services) {
  const pack = readPack(niche);
  if (!pack.exists) throw Object.assign(new Error(`No trade facts pack for "${niche}": ${pack.file} is missing`), { status: 422 });
  const tables = parseTables(pack.text);
  const out = [`# Trade facts: ${niche} · ${category}`];
  if (pack.header) out.push(`_${pack.file}: generated ${pack.header.generated} · model ${pack.header.model}_`);
  const missing = [];
  for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const t = tables.get(letter);
    const title = t ? t.title : `TABLE ${letter} — ${TITLES[letter]}`;
    out.push('', `## ${title}`);
    if (!t) { out.push(`_Table ${letter} is not in the pack._`); missing.push(letter); continue; }
    if (letter === 'C' || letter === 'D' || letter === 'E') { out.push(renderTable(t, t.rows)); continue; }
    const rows = [];
    for (const service of services) {
      const mine = t.rows.filter(r => cellNames(r[0] || '', service));
      if (!mine.length) missing.push(`${letter}:${service}`);
      for (const r of mine) if (!rows.includes(r)) rows.push(r);
    }
    if (!rows.length) { out.push(`_No row for this category's services in Table ${letter}._`); continue; }
    out.push(renderTable(t, rows));
  }
  return { markdown: out.join('\n'), missing, header: pack.header, file: pack.file };
}

// ── The rows for one service page, tagged (CORE (17), 25 Oct) ────────────────
// rowsForService(niche, service, { names }) is the service page loader: every row that is
// about this service, each tagged with what it is for the copy:
//   standard method  Table A, the stages and the materials or methods (named as how the job is done)
//   timing           Table A, the timing cell (written once on the page)
//   what goes wrong  Table B (paragraph 3 of the content block, block 4)
//   rule             Table C rows whose services cell names the service (the FAQ's planning
//                    or rules question; what usually applies, never a number)
//   fact             Table E rows whose fact names the service, or carries one of the
//                    service's own words (a word no other Table A service shares)
//   price factor     Table F
// Sources, URLs and bold marks are stripped: nothing here is a citation. names: the
// service's other names (GBP names, absorbed names) a row may use. Returns { rows,
// markdown, missing, counts, hasRule, thin, header, file }; thin is fewer than 3 rows.
// Throws when the pack is missing.
const cleanCell = s => String(s || '').replace(/\[https?:\/\/[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cellMentions = (cell, names) => String(cell).split(/[;/,]/).some(part => { const p = normName(part); return names.some(n => p === n || new RegExp(`(^| )${escRe(n)}( |$)`).test(p)); });
const stemWord = w => w.replace(/(ings?|ers?|ies|s)$/, '');
const SERVICE_GENERIC = new Set(['and', 'or', 'the', 'of', 'service', 'services', 'work', 'works', 'installation', 'install', 'general', 'repair', 'repairs', 'removal', 'maintenance', 'solutions', 'design']);
function rowsForService(niche, service, { names = [] } = {}) {
  const pack = readPack(niche);
  if (!pack.exists) throw Object.assign(new Error(`No trade facts pack for "${niche}": ${pack.file} is missing`), { status: 422 });
  const tables = parseTables(pack.text);
  const all = [...new Set([service, ...names].map(normName).filter(Boolean))];
  const rows = [];
  const missing = [];
  const A = tables.get('A'), Bt = tables.get('B'), C = tables.get('C'), E = tables.get('E'), F = tables.get('F');
  const mine = t => (t ? t.rows.filter(r => all.some(n => cellNames(r[0] || '', n))) : []);
  for (const r of mine(A)) {
    const stages = cleanCell(r[1]), materials = cleanCell(r[2]), timing = cleanCell(r[3]);
    // stages: the sequence as a list ("Inspect lawn and remove debris → set cutting height → …"), for the What's Included items
    if (stages || materials) rows.push({ table: 'A', kind: 'standard method', text: [stages ? `Stages: ${stages}` : '', materials ? `Materials and methods: ${materials}` : ''].filter(Boolean).join('. '), stages: stages.split(/\s*(?:→|->|>|;)\s*/).map(s => s.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean) });
    if (timing) rows.push({ table: 'A', kind: 'timing', text: timing });
  }
  if (!mine(A).length) missing.push(`A:${service}`);
  for (const r of mine(Bt)) rows.push({ table: 'B', kind: 'what goes wrong', text: [r[1] ? `Signs: ${cleanCell(r[1])}` : '', r[2] ? `Skipped: ${cleanCell(r[2])}` : '', r[3] ? `Done badly: ${cleanCell(r[3])}` : ''].filter(Boolean).join('. ') });
  if (!mine(Bt).length) missing.push(`B:${service}`);
  if (C) for (const r of C.rows) if (cellMentions(r[1] || '', all)) rows.push({ table: 'C', kind: 'rule', name: cleanCell(r[0]), text: [cleanCell(r[2]), r[3] ? `What the customer does: ${cleanCell(r[3])}` : ''].filter(Boolean).join('. ') });
  if (E) {
    // The service's own words: the stems of its name that no other Table A service name shares
    const count = new Map();
    for (const r of (A ? A.rows : [])) for (const w of new Set(normName(r[0] || '').split(' ').filter(x => x && !SERVICE_GENERIC.has(x)).map(stemWord))) count.set(w, (count.get(w) || 0) + 1);
    const own = [...new Set(normName(service).split(' ').filter(x => x && !SERVICE_GENERIC.has(x)).map(stemWord))].filter(w => (count.get(w) || 0) <= 1);
    for (const r of E.rows) {
      const title = cleanCell(r[0]);
      const words = new Set(normName(title).split(' ').map(stemWord));
      if (all.some(n => cellMentions(title, [n])) || own.some(w => words.has(w))) rows.push({ table: 'E', kind: 'fact', name: title, text: cleanCell(r[1]) });
    }
  }
  for (const r of mine(F)) rows.push({ table: 'F', kind: 'price factor', text: [r[1] ? `Costs more: ${cleanCell(r[1])}` : '', r[2] ? `Costs less: ${cleanCell(r[2])}` : ''].filter(Boolean).join('. ') });
  if (!mine(F).length) missing.push(`F:${service}`);
  for (const letter of ['A', 'B', 'C', 'E', 'F']) if (!tables.get(letter)) missing.push(letter);
  const counts = {};
  for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1;
  const out = [`# Trade facts: ${niche} · ${service}`, 'Each row is tagged with what it is for the copy. A rule is written as what usually applies, in plain words, never with its number or name. A timing is written once on the page. Never write a source or a URL.', ''];
  for (const r of rows) out.push(`- [${r.kind}]${r.name ? ` ${r.name}:` : ''} ${r.text}`);
  if (!rows.length) out.push('_No rows for this service in the pack._');
  return { rows, markdown: out.join('\n'), missing, counts, hasRule: rows.some(r => r.kind === 'rule'), thin: rows.length < 3, header: pack.header, file: pack.file };
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

// Every Table A row of a pack as "how it's done" text, for the location page validator
// (CORE (18), 27 Oct): a location page explains the town, not the job, so a sentence that
// remakes one of these is a fail. Read whether or not the pack is verified (nothing here is
// sent to the model). [] when the pack or the table is missing.
function standardMethodRows(niche) {
  const pack = niche ? readPack(niche) : { exists: false };
  if (!pack.exists) return [];
  const A = parseTables(pack.text).get('A');
  if (!A) return [];
  return A.rows.map(r => ({ service: cleanCell(r[0]), text: [cleanCell(r[1]), cleanCell(r[2])].filter(Boolean).join('. ') })).filter(r => r.text);
}

// The pack's service for a question with no service page (a blog post, CORE (1) B9: "named
// methods or symptoms from the trade facts"): the Table A service whose own stems the question
// uses most ("Why is my lawn waterlogged" → Lawn care), else null. Its rows are rowsForService's.
function serviceForQuestion(niche, text) {
  const pack = niche ? readPack(niche) : { exists: false };
  if (!pack.exists) return null;
  const A = parseTables(pack.text).get('A');
  if (!A) return null;
  const words = new Set(normName(text).split(' ').filter(w => w && !SERVICE_GENERIC.has(w)).map(stemWord));
  let best = null, bestScore = 0;
  for (const r of A.rows) {
    const name = cleanCell(r[0]);
    const own = [...new Set(normName(name).split(' ').filter(w => w && !SERVICE_GENERIC.has(w)).map(stemWord))];
    // Stems matched, then the share of the name matched ("lay a patio": Patios over Turf laying)
    const hit = own.filter(w => words.has(w)).length;
    const score = hit ? hit + hit / own.length : 0;
    if (score > bestScore) { best = name; bestScore = score; }
  }
  return best;
}
// A blog post's rows: the service page's rows when the pack names that service, else the
// rows of the Table A service the post's service name and question name most ("Fencing
// installation" → Fencing; "Garden work" plus its question → whatever the question names)
function rowsForPost(niche, service, question) {
  if (service) { const r = rowsForService(niche, service); if (r.rows.length) return { ...r, service }; }
  return rowsForQuestion(niche, [service, question].filter(Boolean).join(' '));
}
function rowsForQuestion(niche, text) {
  const service = serviceForQuestion(niche, text);
  return service ? { ...rowsForService(niche, service), service } : { rows: [], service: null };
}

module.exports = {
  serviceForQuestion, rowsForQuestion, rowsForPost,
  DIR, BLOCKS_DIR, CORE_FILE, packNameFor, packFile, blockFile, relative, readPack, readBlock, readCore, listNiches, hasBlock,
  parseHeader, header, fingerprintOf, parseTables, packForService, packForCategory, rowsForService, standardMethodRows, packProperNouns, cellNames, normName,
};
