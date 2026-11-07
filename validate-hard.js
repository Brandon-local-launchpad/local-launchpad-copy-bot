'use strict';

// ── Hard BLOCKs (Brandon, 7 Nov 2026) ────────────────────────────────────────
// Faults a reader could see at once, on every page type, run from validateCommon:
//   LABEL-LEAK     a prompt or output label in the copy ("RETURN:", "card:", "block4", "card_body:")
//   TRUNCATED      a field that stops mid sentence or mid word, or a first draft cut at max_tokens
//   EMPTY-SECTION  a section the page shows whose list or field came back with nothing in it
//   LINK-MAP       an internal link to a page that isn't on the page map
//   RAW-VALUE      a client value dropped into a sentence that doesn't read ("going by same week")
//   SECTION-REF    copy naming another section by its heading, or using internal words ("sibling pages")
//   ANCHOR-FORCED  a link whose text breaks the sentence ("We work in [landscaping in Romsey]")
// RAW-VALUE and ANCHOR-FORCED test known shapes of the fault; a new shape is a line here. The judge reads the rest.

const LABEL_LEAK_CASED = /\bRETURN:|\bMODEL_FLAGS\b|\bCURRENT TEXT:|\bPROBLEMS:|\bFIELD:|\bMODEL FIELDS\b|\bDECISIONS:/;
const LABEL_LEAK = /\bcard:|\bblock ?[45]\b|\b(?:card|step|point|item|faq)_(?:title|body|text|name|question|answer)\b|\b(?:svc|cat|home|loc)_[a-z0-9_]+\b/i;

// Fields written without a full stop: a tick list item is a fragment
const NO_STOP_RANGE = new Set(['item_text']);
const ENDS_A_SENTENCE = /[.!?…]["'’”)\]]*$/;

// A value that is a fragment and reads only with "the" before it ("the same week")
const NEEDS_THE = /^(?:same|next)\b/i;
const BARE_VALUE_KEYS = ['start_time', 'response_time'];
const VALUE_BREAKS = /\b(?:going by|based on|as per|according to|depending on|in line with)\s*$/i;

const INTERNAL_WORDS = /\bsibling (?:page|service)s?\b|\bpage map\b|\blinkable pages?\b|\btrade facts?\b|\bdossier\b|\bproof homes?\b|\ballocated (?:neighbourhood|item|symptom)s?\b|\b(?:custom|client) values?\b|\bmodel fields?\b|\bthe (?:brief|rubric)\b|\bthis (?:page|section|block)\b|\b(?:next|previous|earlier|later) section\b|\bthe (?:cost|faq|areas?|process|services?|pricing) section\b|\b(?:explains?|covers?) the rest\b/i;

const norm = u => String(u || '').split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase() || '/';
const plainText = s => String(s || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
const headingWords = s => plainText(s).toLowerCase().replace(/[^a-z0-9 ']+/g, ' ').replace(/\s+/g, ' ').trim();

// The H2s the record shows. A heading of three words or more, quoted in running text, is a reference to that section
function headingsOf(record) {
  const out = [];
  for (const [k, v] of Object.entries(record)) {
    if (/_h2$/.test(k) && typeof v === 'string' && v && v !== 'HIDDEN' && headingWords(v).split(' ').length >= 3) out.push(v);
  }
  return out;
}

function rawValueProblem(text, cv) {
  for (const key of BARE_VALUE_KEYS) {
    const value = String((cv && cv[key]) || '').trim();
    if (!value) continue;
    const forms = [`[CV: ${key}]`, value];
    for (const form of forms) {
      let at = -1;
      while ((at = text.toLowerCase().indexOf(form.toLowerCase(), at + 1)) >= 0) {
        const before = text.slice(0, at);
        if (VALUE_BREAKS.test(before)) return `"${before.trim().split(/\s+/).slice(-2).join(' ')} ${form}" doesn't read. Say it in a full phrase, such as "we can usually start the ${value}".`;
        if (form.startsWith('[CV:') && NEEDS_THE.test(value) && !/\bthe\s*$/i.test(before)) return `[CV: ${key}] reads as "${value}", which needs "the" before it. Write "the [CV: ${key}]" or reword the sentence.`;
        if (form.startsWith('[CV:') && /^[a-z]/.test(value) && (!before.trim() || /[.!?]\s*$/.test(before))) return `[CV: ${key}] opens a sentence but its value "${value}" starts in lower case. Reword the sentence.`;
      }
    }
  }
  return null;
}

// The word the link hangs on, reading back over any links before it in the same list
function wordBeforeLink(text, start) {
  let before = text.slice(0, start);
  for (;;) {
    const m = before.match(/\[[^\]]+\]\([^)]*\)(?:,\s*|\s+and\s+|,\s+and\s+)$/);
    if (!m) break;
    before = before.slice(0, m.index);
  }
  const w = before.trim().match(/([A-Za-z']+)$/);
  return w ? w[1].toLowerCase() : '';
}
const NEEDS_A_PLACE = new Set(['in', 'across', 'around', 'throughout', 'near', 'within', 'at', 'to', 'into', 'through', 'from', 'over', 'reaches', 'reach', 'visit', 'visiting']);

function hardChecks(record, V, { issue, fields }) {
  const cv = (V && V.cv) || {};
  const pageMap = V && V.D && Array.isArray(V.D.pageMapUrls) && V.D.pageMapUrls.length ? new Set(V.D.pageMapUrls.map(norm)) : null;
  const headings = headingsOf(record);
  const flagsOf = record.FLAGS || [];

  for (const f of fields) {
    const t = String(f.text || '').trim();
    if (!t || t === 'HIDDEN') continue;
    const block = (check, msg) => issue('BLOCK', check, f.label, msg, f.ref);

    const leak = t.match(LABEL_LEAK_CASED) || t.match(LABEL_LEAK);
    if (leak) block('LABEL-LEAK', `The copy contains the prompt label "${leak[0]}". Return only the words a reader sees.`);

    if (!NO_STOP_RANGE.has(f.rangeKey) && !ENDS_A_SENTENCE.test(t)) block('TRUNCATED', `This stops without finishing its sentence ("…${t.slice(-40)}"). End on a complete sentence.`);

    const raw = rawValueProblem(t, cv);
    if (raw) block('RAW-VALUE', raw);

    const plain = headingWords(t);
    for (const h of headings) if (plain.includes(headingWords(h))) { block('SECTION-REF', `This names another section by its heading ("${h}"). Say the point itself; never point at another part of the page.`); break; }
    const inner = plainText(t).match(INTERNAL_WORDS);
    if (inner) block('SECTION-REF', `"${inner[0]}" is an internal word or points at another part of the page. Say the point itself, in the customer's words.`);

    for (const m of t.matchAll(/\[([^\]]+)\]\(([^)]*)\)/g)) {
      const [whole, anchor, url] = m;
      if (/^[A-Za-z][A-Za-z ]* in [A-Z]/.test(anchor) && NEEDS_A_PLACE.has(wordBeforeLink(t, m.index))) {
        block('ANCHOR-FORCED', `"${wordBeforeLink(t, m.index)} ${whole.replace(/\(.*$/, '')}" doesn't read as English. Link the town name alone ("in [${anchor.replace(/^.* in /, '')}](${url})"), or write the sentence so "${anchor}" reads naturally.`);
        break;
      }
    }
    if (pageMap) {
      for (const m of t.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        if (!pageMap.has(norm(m[1]))) block('LINK-MAP', `Links to ${m[1]}, which is not on the page map.`);
      }
    }
  }

  // Links code places: never sent back to the model, so these stop the page
  if (pageMap) {
    const placed = [];
    for (const [k, v] of Object.entries(record)) {
      if (/_links$/.test(k) && Array.isArray(v)) for (const x of v) if (x && x.url) placed.push(x.url);
      if (k === 'more_cards' && Array.isArray(v)) for (const x of v) if (x && x.url) placed.push(x.url);
    }
    for (const u of new Set(placed)) if (/^\//.test(u) && !pageMap.has(norm(u))) issue('BLOCK', 'LINK-MAP', 'code placed links', `Code placed a link to ${u}, which is not on the page map.`);
  }

  // What the parser found missing: nothing was written for a section the page shows
  for (const f of flagsOf) {
    if (f.code === 'P-MISSING' || f.code === 'P-EMPTY' || (f.code === 'P-COUNT' && /got 0\b/.test(f.msg || ''))) issue('BLOCK', 'EMPTY-SECTION', 'page', `A section came back with nothing in it: ${f.msg}`);
  }
  const usage = record.meta && record.meta.usage;
  if (flagsOf.some(f => f.code === 'P-TRUNCATED') || (usage && usage.stop_reason === 'max_tokens')) issue('BLOCK', 'TRUNCATED', 'page', 'The first draft hit the output limit, so the last fields may be cut off.');
}

module.exports = { hardChecks, rawValueProblem, wordBeforeLink, headingsOf };
