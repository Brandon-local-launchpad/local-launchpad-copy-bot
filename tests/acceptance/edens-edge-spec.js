'use strict';
// Brief §7 acceptance test for Edens Edge: the client values the brief sets, and
// the decisions table it expects. Shared by the offline fixture
// (tests/fixtures/edens-edge-acceptance-decisions.js) and the live run
// (tests/acceptance/edens-edge.js).

const E = require('../fixtures/data/edens-edge-acceptance');

// §7 values exactly as the brief lists them (stand-ins ticked on owner_why,
// owner_promise, owner_photo and hours), plus the two values added since:
// Southampton is coastal, and no practices are confirmed.
const cv = { ...E.cv, coastal_city: 'yes', confirmed_practices: [] };

const CARDS = ['Gardener', 'Landscape Gardener', 'Landscape Designer', 'Lawn care service', 'Tree service', 'Paving contractor', 'Deck builder'];
const lc = s => (s || '').toLowerCase();

// Rows of the brief's table: { decision, expected, got, pass, note }
function checkDecisions(result) {
  const D = result.decisions;
  const rows = [];
  const row = (decision, expected, got, pass, note = '') => rows.push({ decision, expected, got, pass: !!pass, note });
  const flags = (result.flags || []).map(f => f.code);

  row('Title', 'Landscaper Southampton | Edens Edge Landscaping', D.d3_title, D.d3_title === 'Landscaper Southampton | Edens Edge Landscaping');
  const meta = 'Landscaper Southampton from Edens Edge Landscaping. Fixed prices with no hidden costs. Get your free quote today.';
  row('Meta', meta, D.d4_meta, D.d4_meta === meta);
  row('Trust line', '100+ Jobs Completed', D.d5_trust, D.d5_trust === '100+ Jobs Completed');
  row('Rating line', 'none', D.d6_rating || 'none', !D.d6_rating);
  row('Hidden', 'section 2 (no logos), section 6 (no reviews)', `sec2 ${D.d7.sec2}, sec6 ${D.d7.sec6}, sec9 ${D.d7.sec9}`, D.d7.sec2 === 'HIDDEN' && D.d7.sec6 === 'HIDDEN' && D.d7.sec9 === 'SHOWN');
  row('Content H2', 'Local Landscaping in Southampton and Nearby Towns', D.d8.content, D.d8.content === 'Local Landscaping in Southampton and Nearby Towns');
  const d13 = D.d13_links.map(l => l.name);
  const want13 = ['Landscape Gardener', 'Landscape Designer', 'Gardener', 'Lawn care service'];
  const sameSet = d13.length === 4 && want13.every(w => d13.some(x => lc(x) === lc(w)));
  row('D13 link set', want13.join(', '), d13.join(', '), sameSet,
    sameSet && d13.map(lc).join() !== want13.map(lc).join() ? 'Same four pages; order follows the GBP category order (Gardener is category 1), as D13 says' : '');
  row('D14 town', 'Romsey', D.d14_town && D.d14_town.name, D.d14_town && D.d14_town.name === 'Romsey');
  const cards = D.d9.main.map(c => c.name);
  row('Cards', `7, all linked: ${CARDS.join(', ')}`, `${cards.length}${D.d9.main.every(c => c.linked) ? ', all linked' : ''}: ${cards.join(', ')}`,
    cards.length === 7 && D.d9.main.every(c => c.linked) && CARDS.every(c => cards.some(x => lc(x) === lc(c))),
    'Card headings use the page map titles in title case ("Lawn Care Service"), as the card heading rule says');
  const why = D.d10_why.map(p => p.title);
  const wantWhy = ['Local Experience Behind Every Job', 'Insured up to £5m', 'Fixed Prices With No Hidden Costs', 'Family Run and Independent'];
  row('Why points', wantWhy.join('; '), why.join('; '), why.join('|') === wantWhy.join('|'));
  const faq = D.d11_faq.map(q => q.question);
  const faqOk = faq.length === 8 && /cost/i.test(faq[0]) && /insured/i.test(faq[1]) && /isn't right after the job/.test(faq[2]) &&
    /start/i.test(faq[3]) && /quote free/i.test(faq[4]) && /areas/i.test(faq[5]) && /how long/i.test(faq[6]) && /water sit/i.test(faq[7]) && D.d11_faq[7].symptom_based;
  row('FAQ', '8 questions: cost, insured, "What happens if something isn\'t right after the job?", start, free quote, areas, how long, water on patio or lawn (symptom)', faq.join(' / '), faqOk);
  const A = D.d12_areas;
  const areasOk = A.primaryCity === 'Southampton' && A.linked.length === 12 && A.linked[0].name === 'Ampfield' && A.linked[11].name === 'Winchester' &&
    A.plain.length === 1 && A.plain[0] === 'New Forest';
  row('Area list', 'Southampton, then 12 linked town names A to Z (Ampfield … Winchester), then New Forest as plain text',
    `${A.primaryCity}; ${A.linked.length} linked (${A.linked.map(a => a.name).join(', ')}); plain: ${A.plain.join(', ')}`, areasOk);
  const allocNames = (D.allocated.neighbourhoods || []).map(n => n.name);
  row('Allocation', '2 primary city neighbourhoods, e.g. Bassett Heath and Old Woolston or similar large plot areas', allocNames.join(', ') || 'none',
    allocNames.length === 2 && allocNames.includes('Bassett Heath'));
  const wantFlags = ['F-THIN', 'F-REVIEWS', 'F-MAP-TEST'];
  row('Flags', wantFlags.join(', '), flags.join(', '), wantFlags.every(f => flags.includes(f)) && !flags.includes('F-ALLOC'));
  return rows;
}

function formatRows(rows) {
  return rows.map(r => `${r.pass ? 'PASS' : 'FAIL'}  ${r.decision}\n      expected: ${r.expected}\n      got:      ${r.got}${r.note ? `\n      note:     ${r.note}` : ''}`).join('\n');
}

module.exports = { cv, checkDecisions, formatRows };
