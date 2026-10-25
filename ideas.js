'use strict';

// ── Ideas used elsewhere (23 Oct 2026) ───────────────────────────────────────
// A category page must not make a point the homepage, a sibling category page or (for
// a town page) the base page of its category has already made. After each page is
// generated, code pulls its "ideas" out: every sentence of its model fields that names
// an allocated neighbourhood, a symptom or issue, a trade facts method, or a proof. They
// are stored on the record (meta.ideas) and sent to the next page as IDEAS USED
// ELSEWHERE. The validator matches a new page's sentences against them with a fuzzy
// rule: 60% or more of the shorter sentence's content words (four letters or more,
// stemmed, stop words out) appear in the stored one, and both have four such words.

const { helpers } = require('./validate-v20');
const { sentences, scanText, lc, stem, STOPWORDS } = helpers;

const MIN_WORDS = 4;
const SHARE = 0.7;
const GENERIC = new Set('work works working garden gardens home homes property customer customers business team local area areas town towns service services page pages year years time call quote quotes price prices job jobs make makes made need needs needed want wants help helps take takes keep keeps give gives come comes well good right back into over about through around with without after before every each more most some same other than then there here their your what when where which while will would could should also just only such very'.split(' '));

// Content words of a sentence: 4+ letters, stop words and generic words out, stemmed
function contentWords(text) {
  const out = new Set();
  for (const w of lc(scanText(text)).replace(/cvtoken/g, ' ').replace(/[^a-z0-9£' ]+/g, ' ').split(/\s+/)) {
    const t = w.replace(/'s$/, '');
    if (t.length < 4 || STOPWORDS.has(t) || GENERIC.has(t)) continue;
    out.add(stem(t));
  }
  return out;
}

// The sentences of a record's model fields that carry an idea worth guarding
function extractIdeas(record, { names = [], proofs = [] } = {}) {
  const { pageTypeOf } = require('./page-types');
  const fields = pageTypeOf(record).modelFields(record);
  const D = (record.meta && record.meta.ideas_context) || {};
  const markers = [...names, ...(D.names || [])].filter(n => n && n.length > 3).map(n => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
  const proofRes = [...proofs, ...(D.proofs || [])].filter(Boolean).map(p => (p instanceof RegExp ? p : new RegExp(`\\b${String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')));
  const ideas = [];
  for (const f of fields) {
    if (!f.text || f.text === 'HIDDEN') continue;
    for (const s of sentences(f.text)) {
      const plain = scanText(s).trim();
      if (contentWords(plain).size < MIN_WORDS) continue;
      const local = markers.some(re => re.test(plain));
      const proof = proofRes.some(re => re.test(plain)) || /\[CV: (?:insurance_cover|jobs_completed|years_trading|guarantee_years|year_founded|team_size)\]/.test(s);
      const technical = TECH_RE.test(plain);
      if (local || proof || technical) ideas.push({ field: f.label, text: plain, kind: local ? 'local' : proof ? 'proof' : 'technical' });
    }
  }
  return ideas;
}

// Technical points: the mechanisms a page explains once
const TECH_RE = /\b(?:drain|drainage|soakaway|clay|chalk|sandy|soil|sub ?base|base under|hardcore|compact|membrane|root|roots|slope|level|fall|falls|water ?table|flood|frost|shade|moss|thatch|aerat|scarif|mulch|weed|hedge|prun|fell|stump|cut|mow|seed|turf|feed|fertil|paving|slab|block|gravel|resin|timber|post|rail|panel|deck|joist|pergola|patio|fence|fencing|retaining|wall|step|path|lighting|irrigat|planting|border|lawn|tree|branch|canopy|crown|conservation|tpo|preservation order|permit|planning|council)\w*\b/i;

// Does a sentence remake a stored idea? Returns the matching idea or null
function matchIdea(sentence, ideas) {
  const mine = contentWords(sentence);
  if (mine.size < MIN_WORDS) return null;
  for (const idea of ideas || []) {
    const theirs = idea._words || (idea._words = contentWords(idea.text));
    if (theirs.size < MIN_WORDS) continue;
    let shared = 0;
    for (const w of mine) if (theirs.has(w)) shared++;
    if (shared / Math.min(mine.size, theirs.size) >= SHARE) return idea;
  }
  return null;
}

// The ideas a page must avoid: the homepage's, its siblings' and, for a town page, its
// base page's and the location page's. records: [{ page: 'homepage' | 'Gardener' | …, record }]
function ideasFromRecords(records) {
  const out = [];
  for (const { page, record } of records || []) {
    if (!record || record.blocked || record.error) continue;
    const stored = (record.meta && record.meta.ideas) || extractIdeas(record);
    for (const i of stored) out.push({ page, text: i.text, kind: i.kind });
  }
  return out;
}

module.exports = { extractIdeas, matchIdea, ideasFromRecords, contentWords, MIN_WORDS, SHARE };
