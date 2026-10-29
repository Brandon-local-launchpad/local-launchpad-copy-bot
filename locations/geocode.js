'use strict';

// ── The base point: a UK postcode from the address, geocoded with postcodes.io ─────
// Brandon (29 Oct 2026): extract a UK postcode (regex) from business_address, then
// postal_address, and geocode it with postcodes.io. If none is found, use the base
// town's centroid from the places table. The review screen shows which was used.
// postcodes.io is free and needs no key; a failure there falls back to the town too.

// A UK postcode anywhere in free text: outward (A9, A99, A9A, AA9, AA99, AA9A) and inward (9AA)
const POSTCODE_RE = /\b([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})\b/i;

function extractPostcode(text) {
  const m = String(text || '').toUpperCase().match(POSTCODE_RE);
  return m ? `${m[1]} ${m[2]}` : '';
}

// { lat, lng, postcode, admin_district, region } or null when postcodes.io does not know it
async function geocodePostcode(postcode, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const pc = extractPostcode(postcode);
  if (!pc) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`, { signal: ctrl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`postcodes.io answered ${res.status}`);
    const body = await res.json();
    const r = body && body.result;
    if (!r || typeof r.latitude !== 'number') return null;
    return { lat: r.latitude, lng: r.longitude, postcode: r.postcode, admin_district: r.admin_district || '', region: r.region || '' };
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'postcodes.io did not answer' : `postcodes.io: ${e.message}`);
  } finally { clearTimeout(t); }
}

// The base point for a client. addresses: [business_address, postal_address] in order;
// townCentroid: { lat, lng, name } from the places table, or null.
// Returns { lat, lng, from, postcode, address_field, note }
async function basePoint({ addresses = [], townCentroid = null, geocode = geocodePostcode } = {}) {
  const notes = [];
  for (const a of addresses) {
    const pc = extractPostcode(a && a.value);
    if (!pc) continue;
    try {
      const g = await geocode(pc);
      if (g) return { lat: g.lat, lng: g.lng, from: 'postcode', postcode: g.postcode, address_field: a.key, note: `${g.postcode} from ${a.label || a.key} (postcodes.io: ${[g.admin_district, g.region].filter(Boolean).join(', ')})` };
      notes.push(`${pc} from ${a.label || a.key} is not a postcode postcodes.io knows`);
    } catch (e) { notes.push(`${pc} from ${a.label || a.key}: ${e.message}`); }
  }
  if (townCentroid && typeof townCentroid.lat === 'number') {
    return { lat: townCentroid.lat, lng: townCentroid.lng, from: 'town centroid', postcode: '', address_field: '', note: `${townCentroid.name} centroid from the places table${notes.length ? ` (${notes.join('; ')})` : ' (no postcode in the addresses)'}` };
  }
  return null;
}

module.exports = { POSTCODE_RE, extractPostcode, geocodePostcode, basePoint };
