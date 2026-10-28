'use strict';

// ── The niche's blog slots by business type (spec section 3, 28 Oct 2026) ────
// Blogs reuse the homepage slots (trade, trade_person, customer_type, primary_action,
// business_type, seasonal_trade) and add these, read from the niche entry's `blog` object:
//   seasonal_topics  [{ topic, window, publish, tasks }] (or "Topic: window, publish Month" strings); the tasks are
//                    the jobs the season involves, the match words for a seasonal post's related questions;
//                    shared with the quarterly GBP post batch, so both follow one calendar
//   safety_topics    topics that get the safety switch (gas, electrics, structure)
//   blog_cta_h2      the Next step heading: a string, or one per business type { A, B, C, D }
//   cost_unit        how a cost guide prices the job: a string, or one per type
//   decision_pairs   common "X or Y" choices
// Each slot starts from the business type default. A niche with no `blog` entry runs on the
// defaults with an F-BLOG-SLOTS flag (the brief: the other niches get the defaults until
// their entries are written); a slot the entry leaves out takes its default too.

const DEFAULT_CTA = {
  A: 'Talk to a Local [TRADE_PERSON] About [TOPIC]',
  B: 'Book a Local [TRADE_PERSON] for [TOPIC]',
  D: 'Talk to a Local [TRADE_PERSON] About [TOPIC]',
  // C: per pet niche, matching its primary_action ("Book a Meet and Greet With a Local [TRADE_PERSON]")
};
const DEFAULT_COST_UNIT = { A: 'per job', B: 'per visit', C: 'per session', D: 'per move' };
const TYPES = ['A', 'B', 'C', 'D'];

// The client's business type: the client value, else the niche default, else A. "split" is the niche default.
function businessTypeOf(cv = {}, niche = {}) {
  const v = String(cv.business_type || '').trim().toUpperCase();
  if (TYPES.includes(v)) return v;
  const d = String(niche.business_type_default || '').trim().toUpperCase();
  return TYPES.includes(d) ? d : 'A';
}

// "Lay new turf: Sept to Oct, publish Aug" → { topic, window, publish }
function parseSeasonalTopic(item) {
  if (item && typeof item === 'object') return { topic: String(item.topic || '').trim(), window: String(item.window || '').trim(), publish: String(item.publish || item.publish_month || '').trim(), tasks: list(item.tasks) };
  const s = String(item || '').trim();
  const m = s.match(/^(.*?)\s*:\s*(.*?)(?:,\s*publish\s+(.+))?$/i);
  if (!m) return { topic: s, window: '', publish: '' };
  return { topic: m[1].trim(), window: (m[2] || '').trim(), publish: (m[3] || '').trim() };
}

const list = v => (Array.isArray(v) ? v.map(x => String(x || '').trim()).filter(Boolean) : []);

// The C default comes from the niche's own primary action ("Book a Meet and Greet" →
// "Book a Meet and Greet With a Local [TRADE_PERSON]"); with no action, the A wording
function defaultCta(type, niche) {
  if (type !== 'C') return DEFAULT_CTA[type] || DEFAULT_CTA.A;
  const action = String((niche.buttons || {}).primary_action || '').replace(/\[QUOTE_FREE_LOWER\]\s*/g, '').replace(/\[QUOTE_FREE\]\s*/g, '').replace(/\s+/g, ' ').trim();
  return action ? `${action} With a Local [TRADE_PERSON]` : DEFAULT_CTA.A;
}

function blocksFor({ niche = {}, cv = {} } = {}) {
  const type = businessTypeOf(cv, niche);
  const entry = niche.blog && typeof niche.blog === 'object' ? niche.blog : null;
  const nicheName = niche._source || niche.trade || 'this niche';
  const flags = [];
  const gaps = [];
  const byType = (v, fallback) => {
    if (typeof v === 'string' && v.trim()) return { value: v.trim(), source: 'niche' };
    if (v && typeof v === 'object' && typeof v[type] === 'string' && v[type].trim()) return { value: v[type].trim(), source: 'niche' };
    return { value: fallback, source: 'default' };
  };
  const cta = byType(entry && entry.blog_cta_h2, defaultCta(type, niche));
  const unit = byType(entry && entry.cost_unit, DEFAULT_COST_UNIT[type] || DEFAULT_COST_UNIT.A);
  const seasonal = !!niche.seasonal_trade;
  const seasonalTopics = (entry ? list(entry.seasonal_topics).length ? entry.seasonal_topics : [] : []).map(parseSeasonalTopic).filter(t => t.topic);
  const safetyTopics = entry ? list(entry.safety_topics) : [];
  const decisionPairs = entry ? list(entry.decision_pairs) : [];
  if (!entry) flags.push({ code: 'F-BLOG-SLOTS', msg: `No blog slots for ${nicheName}: the business type ${type} defaults are used (CTA heading, cost unit); no seasonal, safety or decision topics.` });
  else {
    if (seasonal && !seasonalTopics.length) gaps.push('seasonal_topics (the niche is seasonal but lists no seasonal topics)');
    if (!safetyTopics.length) gaps.push('safety_topics');
    if (!decisionPairs.length) gaps.push('decision_pairs');
    if (cta.source === 'default') gaps.push(`blog_cta_h2 for type ${type}`);
    if (unit.source === 'default') gaps.push(`cost_unit for type ${type}`);
    for (const g of gaps) flags.push({ code: 'F-BLOG-SLOTS', msg: `${nicheName} blog slots: ${g} not written; the default applies.` });
  }
  return {
    type,
    seasonal,
    // A seasonal niche's topics; a non seasonal niche ignores them (scaling rules: local posts take their slots)
    seasonal_topics: seasonal ? seasonalTopics : [],
    safety_topics: safetyTopics,
    blog_cta_h2: cta.value,
    cost_unit: unit.value,
    decision_pairs: decisionPairs,
    source: entry ? 'niche' : 'default',
    sources: { blog_cta_h2: cta.source, cost_unit: unit.source, seasonal_topics: seasonalTopics.length ? 'niche' : 'none', safety_topics: safetyTopics.length ? 'niche' : 'none', decision_pairs: decisionPairs.length ? 'niche' : 'none' },
    gaps,
    flags,
  };
}

module.exports = { blocksFor, businessTypeOf, parseSeasonalTopic, DEFAULT_CTA, DEFAULT_COST_UNIT };
