'use strict';

// ── Competitor check (GBP SOP 2.1) and duplicate finder (SOP 1.3, 5.1) ─────────
// Text search for "[primary category] [main town]"; the first five results that are
// real local businesses: not the client's own place, operating, with a street address,
// not a directory, and one branch per website domain (a second branch of the same
// site is a chain). Every run is stored with its date and keyword, so the next run
// shows the review count change per competitor and the average change, which is the
// reviews a month target. The duplicate finder searches by name and by phone and lists
// what matches either and is not the client's own place.

const DIRECTORY_DOMAINS = ['checkatrade.com', 'yell.com', 'bark.com', 'ratedpeople.com', 'mybuilder.com', 'trustatrader.com', 'thomsonlocal.com', 'yelp.com', 'yelp.co.uk', 'houzz.co.uk', 'houzz.com', 'facebook.com', 'instagram.com', 'nextdoor.co.uk', 'trustpilot.com', 'freeindex.co.uk', 'cylex-uk.co.uk', 'scoot.co.uk', 'hotfrog.co.uk', 'threebestrated.co.uk', 'gumtree.com', 'bizify.co.uk'];
const DIRECTORY_NAMES = /\b(checkatrade|yell|bark|rated people|mybuilder|trustatrader|thomson local|yelp|houzz|three best rated|directory|listings?)\b/i;

const norm = s => String(s == null ? '' : s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const DROP = new Set(['ltd', 'limited', 'the', 'and', 'co', 'uk', 'services', 'service']);
const tokens = s => norm(s).split(' ').filter(w => w && !DROP.has(w));
const phoneDigits = s => { let d = String(s || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, ''); if (d.startsWith('+44')) d = '0' + d.slice(3); else if (d.startsWith('0044')) d = '0' + d.slice(4); else if (d.startsWith('44') && d.length === 12) d = '0' + d.slice(2); return d.replace(/\D/g, ''); };
const domainOf = url => { try { return new URL(String(url)).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; } };

// Fuzzy name match: the same tokens, one inside the other, or four fifths shared
function namesMatch(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const ja = ta.join(' '), jb = tb.join(' ');
  if (ja === jb || ja.includes(jb) || jb.includes(ja)) return true;
  const shared = ta.filter(t => tb.includes(t)).length;
  return shared / Math.max(ta.length, tb.length) >= 0.8;
}

function isOwn(place, { ownPlaceId, clientName, clientPhone }) {
  if (ownPlaceId && place.place_id === ownPlaceId) return true;
  if (!ownPlaceId) {
    const phoneHit = clientPhone && place.phone && phoneDigits(place.phone) === phoneDigits(clientPhone);
    if (phoneHit) return true;
    if (clientName && namesMatch(place.name, clientName)) return true;
  }
  return false;
}

// The filters, in order; null when the place is a competitor, else why it was skipped
function skipReason(place, seenDomains) {
  if (place.business_status && place.business_status !== 'OPERATIONAL') return `not operating (${place.business_status.toLowerCase().replace(/_/g, ' ')})`;
  const dom = domainOf(place.website);
  if (dom && DIRECTORY_DOMAINS.some(d => dom === d || dom.endsWith('.' + d))) return `a directory (${dom})`;
  if (DIRECTORY_NAMES.test(place.name)) return 'a directory';
  if (!place.address || !/\d|\b(street|road|lane|avenue|drive|close|way|court|place|park|unit|estate)\b/i.test(place.address)) return 'no street address';
  if (dom && seenDomains.has(dom)) return `a second branch of ${dom} (chain)`;
  return null;
}

// search(textQuery) → [place]
async function runCompetitorCheck({ primary, town, clientName, clientPhone, ownPlaceId, search, now = new Date() }) {
  const keyword = `${String(primary || '').trim()} ${String(town || '').trim()}`.trim();
  if (!keyword) throw Object.assign(new Error('The competitor check needs the primary category and the main town.'), { status: 400 });
  const results = await search(keyword);
  const competitors = [], skipped = [];
  const seenDomains = new Set();
  let own = ownPlaceId ? { place_id: ownPlaceId, how: 'saved gbp_place_id' } : null;
  for (const p of results) {
    if (competitors.length >= 5) break;
    if (isOwn(p, { ownPlaceId, clientName, clientPhone })) {
      if (!own) own = { place_id: p.place_id, name: p.name, how: clientPhone && p.phone && phoneDigits(p.phone) === phoneDigits(clientPhone) ? 'matched by phone' : 'matched by name' };
      skipped.push({ name: p.name, place_id: p.place_id, reason: "the client's own listing" });
      continue;
    }
    const why = skipReason(p, seenDomains);
    if (why) { skipped.push({ name: p.name, place_id: p.place_id, maps_url: p.maps_url, reason: why }); continue; }
    const dom = domainOf(p.website);
    if (dom) seenDomains.add(dom);
    competitors.push({ name: p.name, place_id: p.place_id, maps_url: p.maps_url, primary_type: p.primary_type, rating: p.rating, review_count: p.review_count, website: p.website, address: p.address });
  }
  const rated = competitors.filter(c => c.rating !== null);
  const average = {
    rating: rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : null,
    review_count: competitors.length ? Math.round(competitors.reduce((s, c) => s + c.review_count, 0) / competitors.length) : 0,
  };
  return { at: now.toISOString(), keyword, primary: String(primary || '').trim(), town: String(town || '').trim(), own, competitors, skipped, average, results_seen: results.length };
}

// The change since the previous run, per competitor by place_id and on the average;
// reviews a month from the average change over the days between the runs
function compareRuns(latest, previous) {
  if (!latest || !previous) return null;
  const prevBy = new Map((previous.competitors || []).map(c => [c.place_id, c]));
  const changes = (latest.competitors || []).map(c => { const p = prevBy.get(c.place_id); return { place_id: c.place_id, name: c.name, review_count: c.review_count, previous: p ? p.review_count : null, change: p ? c.review_count - p.review_count : null }; });
  const days = Math.max(0, (new Date(latest.at) - new Date(previous.at)) / 86400000);
  const avgChange = (latest.average.review_count || 0) - (previous.average.review_count || 0);
  const perMonth = days >= 1 ? Math.round((avgChange / days) * 30.4 * 10) / 10 : null;
  return { previous_at: previous.at, days: Math.round(days * 10) / 10, changes, average_change: avgChange, reviews_per_month: perMonth, previous_keyword: previous.keyword };
}

// How many of the five use the client's primary category (the Places primary type is an
// approximation of the GBP category: "landscaper" for Landscaper, so the match is loose)
function primaryReading(run, primary) {
  if (!run || !run.competitors || !run.competitors.length) return null;
  const want = norm(primary);
  const typeName = t => norm(String(t || '').replace(/_/g, ' '));
  const uses = run.competitors.filter(c => { const t = typeName(c.primary_type); return t && want && (t === want || t.includes(want) || want.includes(t)); }).length;
  const counts = new Map();
  for (const c of run.competitors) { const t = typeName(c.primary_type) || '(no type)'; counts.set(t, (counts.get(t) || 0) + 1); }
  const [topType, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const n = run.competitors.length;
  if (uses >= Math.ceil(n / 2)) return { uses, of: n, line: `primary = ${primary}, ${uses} of ${n} competitors use it`, escalate: false, top: topType, top_count: topCount };
  return { uses, of: n, line: `primary = ${primary}, ${topCount} of ${n} use ${topType}, escalate`, escalate: true, top: topType, top_count: topCount };
}

// ── Duplicates ──
async function findDuplicates({ clientName, clientPhone, town, ownPlaceId, search }) {
  const queries = [];
  if (clientName) queries.push({ by: 'name', q: `${clientName} ${town || ''}`.trim() });
  if (clientPhone) queries.push({ by: 'phone', q: String(clientPhone).trim() });
  const found = new Map();
  for (const { by, q } of queries) {
    const results = await search(q);
    for (const p of results) {
      if (ownPlaceId && p.place_id === ownPlaceId) continue;
      const nameHit = clientName && namesMatch(p.name, clientName);
      const phoneHit = clientPhone && p.phone && phoneDigits(p.phone) === phoneDigits(clientPhone);
      if (!nameHit && !phoneHit) continue;
      const prev = found.get(p.place_id);
      const matched = nameHit && phoneHit ? 'name and phone' : nameHit ? 'name' : 'phone';
      found.set(p.place_id, { place_id: p.place_id, name: p.name, address: p.address, phone: p.phone, maps_url: p.maps_url, business_status: p.business_status, matched: prev && prev.matched !== matched ? 'name and phone' : matched, found_by: [...new Set([...(prev ? prev.found_by : []), by])] });
    }
  }
  return { at: new Date().toISOString(), queries: queries.map(x => x.q), duplicates: [...found.values()] };
}

module.exports = { runCompetitorCheck, compareRuns, primaryReading, findDuplicates, namesMatch, phoneDigits, skipReason, DIRECTORY_DOMAINS };
