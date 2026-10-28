'use strict';

// ── Two questions that mean the same thing (Brandon, 28 Oct) ─────────────────
// "Can I lay turf over the existing lawn" and "Can turf be laid on top of an old lawn" are one
// question. The stems: the question frame and the stop words out, a few equivalents folded
// ("on top of" is "over", "existing" is "old", "laid" is "lay"), the irregular verbs to their
// base, the trade's and the service's own words out when the caller names them. Two questions
// are the same when they share half their stems or more (Jaccard), or when every stem of the
// shorter one is in the longer.

const STOP = new Set('a an the i you my your our we do does did is are it its to in for of and or on at by with from after before always ever can could should would will what which how why when who there this that these those me us them need want get be been being was were has have had if any some all still just also than then there their about into onto up out over under again more most much many very so as not no yes'.split(' '));
// Equivalents folded before stemming: the phrase first, then the word
const PHRASES = [['on top of', 'over'], ['in place of', 'instead'], ['rather than', 'instead'], ['as well as', 'and'], ['how often', 'often'], ['how long', 'long'], ['how much', 'much']];
const WORDS = { existing: 'old', current: 'old', previous: 'old', laid: 'lay', lain: 'lay', lying: 'lay', grown: 'grow', grew: 'grow', built: 'build', done: 'do', made: 'make', sown: 'sow', sowed: 'sow', mown: 'mow', mowed: 'mow', dug: 'dig', cut: 'cut', put: 'put', paid: 'pay', bought: 'buy', brought: 'bring', children: 'child', kids: 'child', pets: 'pet', dogs: 'pet', dog: 'pet', newly: 'new', fresh: 'new', freshly: 'new', pricey: 'expensive', dear: 'expensive', cheaper: 'cheap', costly: 'expensive', waterlogged: 'waterlog', waterlogging: 'waterlog', soggy: 'waterlog', boggy: 'waterlog', puddles: 'puddle', pooling: 'puddle', pools: 'puddle', remove: 'remov', removal: 'remov', removed: 'remov', install: 'instal', installed: 'instal', installation: 'instal', installing: 'instal', fitting: 'instal', fitted: 'instal', fit: 'instal', replace: 'replac', replacement: 'replac', replacing: 'replac', repair: 'repair', repairs: 'repair', repairing: 'repair', fix: 'repair', fixed: 'repair', fixing: 'repair' };

const norm = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const stem = w => (WORDS[w] || w).replace(/(?:ing|ed|es|s)$/, '').replace(/ie$/, 'y');

function questionStems(q, { exclude = [] } = {}) {
  let s = norm(q);
  for (const [a, b] of PHRASES) s = s.replace(new RegExp(`\\b${a}\\b`, 'g'), b);
  const ex = new Set(exclude.flatMap(x => norm(x).split(' ')).filter(Boolean).map(stem));
  return new Set(s.split(' ').filter(w => w && !STOP.has(w)).map(stem).filter(w => w.length >= 3 && !ex.has(w)));
}

function sameQuestion(a, b, opts = {}) {
  const A = questionStems(a, opts), B = questionStems(b, opts);
  if (!A.size || !B.size) return false;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  const shorter = Math.min(A.size, B.size);
  // Two shared stems at least: one word in common ("turf") is a shared subject, not the same question
  if (both < 2) return false;
  return both / (A.size + B.size - both) >= 0.5 || (shorter >= 3 && both === shorter);
}

// The first question in the list the given one means the same as, or null
function findSame(q, list, opts = {}) { return list.find(x => sameQuestion(q, x, opts)) || null; }

module.exports = { questionStems, sameQuestion, findSame, STOP };
