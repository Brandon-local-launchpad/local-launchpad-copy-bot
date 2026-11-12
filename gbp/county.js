'use strict';

// ── The county a client's posts name (Brandon, 12 Nov 2026) ──────────────────
// A GBP post never names a town: an offer is for everyone the client covers, and Copybot cannot
// know which town a photo's job was in. When a post names a place, it is the county.
//   typed:  Client Values `county` (the Record tab), which always wins. "Hampshire", or two
//           counties as "Hampshire; West Sussex".
//   worked out: the same rule as the Citations tab (citations/client.js): the base town and the
//           approved towns, their councils from the places table, and the county that holds those
//           councils from the Places tab (citation_places). The base town's county comes first; a
//           second county is named only when it holds SECOND_MIN of the approved towns, so one
//           border town does not put another county on every offer. Two at most.

const SECOND_MIN = 3;
const MAX = 2;

const str = v => (v == null ? '' : String(v)).trim();
const norm = s => str(s).toLowerCase().replace(/\s+/g, ' ');

// "Hampshire; West Sussex" or "Hampshire, West Sussex". Never split on "and": Tyne and Wear is one county.
function parseCounties(v) {
  const out = [];
  for (const p of str(v).split(/\s*[;,]\s*/).map(str).filter(Boolean)) if (!out.some(x => norm(x) === norm(p))) out.push(p);
  return out.slice(0, MAX);
}
const countyPhrase = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] || '');

// towns: [{ name, main, councils: [names] }]; counties: citation_places county rows ({ name, councils })
function pickCounties(towns, counties) {
  const ofCouncil = new Map();
  for (const c of counties) for (const k of c.councils || []) if (!ofCouncil.has(norm(k))) ofCouncil.set(norm(k), c.name);
  const countyOf = t => { for (const k of t.councils || []) { const c = ofCouncil.get(norm(k)); if (c) return c; } return ''; };
  const main = towns.find(t => t.main);
  const mainCounty = main ? countyOf(main) : '';
  const tally = new Map();
  for (const t of towns.filter(x => !x.main)) { const c = countyOf(t); if (c) tally.set(c, (tally.get(c) || 0) + 1); }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const list = [];
  if (mainCounty) list.push(mainCounty);
  for (const [c, n] of ranked) {
    if (list.length >= MAX || list.includes(c)) continue;
    if (!list.length || n >= SECOND_MIN) list.push(c);
  }
  const counted = c => tally.get(c) || 0;
  const why = list.length
    ? list.map(c => `${c}: ${c === mainCounty ? `${main.name}, ` : ''}${counted(c)} approved town${counted(c) === 1 ? '' : 's'}`).join('; ')
    : '';
  return { counties: list, why };
}

// The live lookup. Any failure is no county: the prompts then wait and say so, never a town.
async function deriveCounties({ baseTown, approved, placesStore, citationStore }) {
  if (!placesStore || !citationStore) return { counties: [], why: '' };
  const towns = [];
  if (str(baseTown)) {
    const m = await placesStore.matchName(baseTown);
    const row = m.find(p => !p.is_admin_area) || m[0];
    if (row) towns.push({ name: str(baseTown), main: true, councils: String(row.lad_name || '').split(';').map(str).filter(Boolean) });
  }
  if (approved) {
    const byId = await placesStore.byIds([...(approved.tier1 || []), ...(approved.tier2 || [])].map(t => t.place_id));
    for (const p of byId.values()) if (!towns.some(t => t.main && norm(t.name) === norm(p.name))) towns.push({ name: p.name, main: false, councils: String(p.lad_name || '').split(';').map(str).filter(Boolean) });
  }
  const councils = [...new Set(towns.flatMap(t => t.councils))];
  if (!councils.length) return { counties: [], why: '' };
  return pickCounties(towns, await citationStore.countiesForCouncils(councils));
}

module.exports = { parseCounties, countyPhrase, pickCounties, deriveCounties, SECOND_MIN };
