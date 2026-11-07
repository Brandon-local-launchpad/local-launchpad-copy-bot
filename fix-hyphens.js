'use strict';

// ── Hyphens fixed in code (Brandon, 7 Nov 2026) ──────────────────────────────
// The copy rule is no hyphenated compounds. A model retry for each one cost more than it was worth, so
// code rewrites them after every draft: "well-drained" becomes "well drained". Left alone: link addresses,
// [CV: x] tokens, place names ("Lee-on-the-Solent"), anything a client value holds, and a prefix where a
// space would read as a typo and joining could change the word ("re-lay", "pre-treat"): those stay flagged
// (1b) and go to the style pass.

const JOIN = new Map([['e-mail', 'email'], ['re-seed', 'reseed'], ['re-turf', 'returf'], ['re-point', 'repoint'], ['re-roof', 'reroof'], ['re-build', 'rebuild'], ['re-plant', 'replant'], ['re-paint', 'repaint'], ['re-felt', 'refelt'], ['re-tile', 'retile'], ['re-grout', 'regrout'], ['re-fit', 'refit'], ['re-grow', 'regrow'], ['re-growth', 'regrowth'], ['re-surface', 'resurface'], ['re-edge', 're edge']]);
const LEAVE_PREFIX = /^(?:re|pre|co|de)-/i;
const COMPOUND = /\b[A-Za-z]+-[A-Za-z]+(?:-[A-Za-z]+)*\b/g;
// A link's address and a client value token are never touched; a link's words are
const PROTECTED = /(\]\([^)]*\)|\[CV: [^\]]+\])/;

function fixWords(text, keep) {
  return text.replace(COMPOUND, word => {
    const lower = word.toLowerCase();
    if (keep(lower)) return word;
    const parts = word.split('-');
    if (parts.slice(1).some(p => /^[A-Z]/.test(p))) return word; // a place or a name
    if (JOIN.has(lower)) { const to = JOIN.get(lower); return /^[A-Z]/.test(word) ? to[0].toUpperCase() + to.slice(1) : to; }
    if (LEAVE_PREFIX.test(word)) return word;
    return parts.join(' ');
  });
}

function fixText(text, keep) {
  return String(text || '').split(PROTECTED).map((part, i) => (i % 2 ? part : fixWords(part, keep))).join('');
}

// Returns how many fields changed
function fixHyphens(record, V) {
  const { modelFields, setField } = require('./validate-v20');
  const held = `${(V && V.cvText) || ''} ${(((V && V.towns) || []).map(t => (typeof t === 'string' ? t : t.name || ''))).join(' ')}`.toLowerCase();
  const keep = lower => held.includes(lower);
  let changed = 0;
  for (const f of modelFields(record)) {
    if (!f.text || f.text === 'HIDDEN') continue;
    const after = fixText(f.text, keep);
    if (after !== f.text) { setField(record, f.ref, after); changed++; }
  }
  return changed;
}

module.exports = { fixHyphens, fixText };
