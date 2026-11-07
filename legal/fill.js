'use strict';

// ── Filling a legal template ────────────────────────────────────────────────
// The legal pages are fixed text. This is the only thing that changes them, and it
// does two things: {IF key = value} ... {END IF} sections go in or out whole, and
// [CV: key] tokens take their values. No model, no rewording.
//
//   {IF key = value} / {IF key != value}: compared ignoring case; a blank value counts
//     as "none". A section can run over several paragraphs. Sections don't nest.
//   A token inside a section that went out never counts as missing.
//   A token with no value stays in the text and is listed in `missing`, so the page
//     can be held rather than published with a gap. Nothing here fills in a default:
//     legal/values.js does that, before this runs.
//   A bullet or table row left with nothing in it goes too, so no empty ones remain.
//
// residueIn() is the last check on any filled page: template text left in it.

const IF_SECTION = /\{IF\s+([a-z0-9_]+)\s*(!=|=)\s*([^}]*?)\s*\}([\s\S]*?)\{END IF\}/g;
const TOKEN = /\[CV: ([a-z0-9_]+)\]/g;
const RESIDUE = [/\[CV:/, /\{IF\b/, /\{END IF\}/, /\(IF\b/, /\(END IF\)/, /Lorem/i];

const compare = v => {
  const s = v === undefined || v === null ? '' : String(v).trim().toLowerCase();
  return s || 'none';
};

// Every key a template asks about, so a fixture can catch a typo that would silently drop a section
function templateKeys(template) {
  const keys = new Set();
  for (const m of template.matchAll(/\{IF\s+([a-z0-9_]+)\s*(?:!=|=)/g)) keys.add(m[1]);
  for (const m of template.matchAll(TOKEN)) keys.add(m[1]);
  return [...keys].sort();
}

// A template fault stops here, whatever the client's values: an IF with no END IF, or one inside another
function checkTemplate(template) {
  const faults = [];
  const opens = (template.match(/\{IF\b/g) || []).length;
  const closes = (template.match(/\{END IF\}/g) || []).length;
  if (opens !== closes) faults.push(`${opens} {IF} but ${closes} {END IF}`);
  for (const m of template.matchAll(IF_SECTION)) {
    if (/\{IF\b/.test(m[4])) faults.push(`an {IF} inside {IF ${m[1]}}`);
  }
  return faults;
}

// Marks where a section went out, so a line that held only that section goes whole
const REMOVED = '\u0000';

// Tidies what a removed section leaves behind. Blanks only: no word changes.
function tidy(text) {
  return text
    .split('\n')
    .filter(l => l.trim() !== REMOVED)
    .map(l => l.split(REMOVED).join(''))
    .map(l => l.replace(/[ \t]+$/, '').replace(/^(- )?[ \t]+/, '$1').replace(/([^ \t])[ \t]{2,}/g, '$1 '))
    .filter(l => !/^-\s*$/.test(l) && !/^\|[\s|]*\|$/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

function fillTemplate(template, values = {}) {
  const source = String(template).replace(/\r\n/g, '\n');
  const faults = checkTemplate(source);
  if (faults.length) throw new Error(`Legal template fault: ${faults.join('; ')}.`);

  const sectioned = source.replace(IF_SECTION, (_all, key, op, want, body) => {
    const same = compare(values[key]) === compare(want);
    return (op === '=' ? same : !same) ? body : REMOVED;
  });

  const missing = new Set();
  const filled = sectioned.replace(TOKEN, (token, key) => {
    const v = values[key];
    if (v === undefined || v === null || String(v).trim() === '') { missing.add(key); return token; }
    return String(v).trim();
  });

  const text = tidy(filled);
  return { text, missing: [...missing].sort(), residue: residueIn(text) };
}

function residueIn(text) {
  return RESIDUE.filter(re => re.test(text)).map(re => (String(text).match(re) || [''])[0]);
}

module.exports = { fillTemplate, residueIn, templateKeys, checkTemplate };
