'use strict';

// Working practices the copy may state only when the client has confirmed them
// (client value confirmed_practices, a list of practice keys). The list lives in
// niche-library/practices.json; 'trades' is "all" or a niche's trade_person.

const PRACTICES = require('./niche-library/practices.json').practices;

function practicesFor(niche) {
  const trade = ((niche && niche.trade_person) || '').toLowerCase();
  return PRACTICES.filter(p => p.trades.includes('all') || p.trades.includes(trade));
}

function confirmedPractices(cv, niche) {
  const keys = new Set(Array.isArray(cv.confirmed_practices) ? cv.confirmed_practices : []);
  return practicesFor(niche).filter(p => keys.has(p.key));
}

// Practices a piece of copy claims, with the matched words
function practiceClaims(text, niche) {
  const out = [];
  for (const p of practicesFor(niche)) {
    for (const src of p.detect) {
      const m = (text || '').match(new RegExp(src, 'i'));
      if (m) { out.push({ practice: p, match: m[0] }); break; }
    }
  }
  return out;
}

module.exports = { PRACTICES, practicesFor, confirmedPractices, practiceClaims };
