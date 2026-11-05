'use strict';

// ── Why points and fears (copy quality 6, 5 Nov 2026) ─────────────────────────
// Each Why point answers the niche fear it means something for, not the fear in the same position:
// a track record answers the fear of botched or inexperienced work, the cover answers damage and
// things going wrong. Code scores a point against a fear through what each is about, and the best
// pairs win. A point with no fear in common gets none, rather than one that reads as a non sequitur.

const TOPICS = {
  damage: /\b(?:damag\w*|break\w*|broke\w*|harm\w*|accident\w*|goes? wrong|went wrong|wrong|mess\w*|ruin\w*|stain\w*|mark\w*|insur\w*|cover\w*|guarantee\w*|warrant\w*|put right|liab\w*|claim\w*|injur\w*)\b/i,
  trust: /\b(?:stranger\w*|family|independent|owner\w*|same (?:person|cleaner|team|fitter)|different \w+ every|who (?:turns|comes)|cowboy\w*|rogue\w*|vanish\w*|disappear\w*|trust\w*|local|doorstep|knock\w*|one man|genuine|sub ?contract\w*|hand\w* off|in the home|keys?)\b/i,
  standard: /\b(?:slip\w*|standard\w*|consisten\w*|same \w+ every|cut\w* corners?|corners?|missed|rushed?|sloppy|shoddy|bodge\w*|botch\w*|poor|careless|thorough\w*|method\w*|checklist)\b/i,
  experience: /\b(?:years?|jobs?|completed|experienc\w*|know\w*|botch\w*|bodge\w*|amateur\w*|inexperienc\w*|qualif\w*|certif\w*|trained|accredit\w*|track record|done (?:it|this)|return\w*|come back|came back|fail\w*|again)\b/i,
  price: /\b(?:price\w*|fixed|quote\w*|hidden|charg\w*|pay\w*|cost\w*|money|overcharg\w*|rip\w* off|bill\w*|extra\w*|paying out|deposit\w*|fee\w*|afford\w*)\b/i,
  time: /\b(?:late|on time|turn\w* up|show\w* up|no show|wait\w*|reliab\w*|respon\w*|same day|arriv\w*|prompt\w*|delay\w*|left waiting|hours?|night|weekend|fast|quick\w*|tonight|out of hours)\b/i,
};
const PROOF_TOPICS = { years: ['experience'], jobs: ['experience', 'standard'], guarantee: ['damage'], manufacturer_warranty: ['damage'], insurance: ['damage'], diff1: [], diff2: [], theme: [] };

const topicsOf = text => Object.keys(TOPICS).filter(k => TOPICS[k].test(String(text || '')));

function score(point, fear) {
  const fearTopics = topicsOf(fear);
  const mine = new Set([...(PROOF_TOPICS[point.proof] || []), ...topicsOf(point.title)]);
  return fearTopics.filter(t => mine.has(t)).length;
}

// Every point with the fear it answers, or fear: null. A fear is used once; the strongest pairs go first
function matchFears(points = [], fears = []) {
  const pairs = [];
  points.forEach((p, i) => fears.forEach((f, j) => { const s = score(p, f); if (s > 0) pairs.push({ i, j, s }); }));
  pairs.sort((a, b) => b.s - a.s || a.i - b.i || a.j - b.j);
  const fearOf = new Map();
  const taken = new Set();
  for (const { i, j } of pairs) {
    if (fearOf.has(i) || taken.has(j)) continue;
    fearOf.set(i, j);
    taken.add(j);
  }
  return points.map((p, i) => ({ ...p, fear: fearOf.has(i) ? fears[fearOf.get(i)] : null }));
}

module.exports = { matchFears, topicsOf, score };
