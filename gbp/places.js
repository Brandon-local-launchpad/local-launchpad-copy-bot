'use strict';

// ── Google Places API (New): text search ────────────────────────────────────
// One call, searchText, with the key from GOOGLE_PLACES_API_KEY only (never logged,
// never sent back to the browser). The fixtures stub searchPlaces with recorded
// responses, so tests never call Google. Read only: nothing here writes to Google.

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.primaryType', 'places.types', 'places.rating', 'places.userRatingCount',
  'places.websiteUri', 'places.googleMapsUri', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.businessStatus', 'places.location',
].join(',');

// A place as the rest of the GBP code reads it
function normalisePlace(p) {
  return {
    place_id: p.id || '',
    name: (p.displayName && p.displayName.text) || p.displayName || '',
    primary_type: p.primaryType || '',
    types: Array.isArray(p.types) ? p.types : [],
    rating: typeof p.rating === 'number' ? p.rating : null,
    review_count: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
    website: p.websiteUri || '',
    maps_url: p.googleMapsUri || (p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : ''),
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    business_status: p.businessStatus || '',
    location: p.location && typeof p.location.latitude === 'number' ? { lat: p.location.latitude, lng: p.location.longitude } : null,
  };
}

// Place Details for one place id: its location (and name), for the landing page map check
async function getPlace(placeId, { apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchFn = global.fetch } = {}) {
  if (!apiKey) throw Object.assign(new Error('GOOGLE_PLACES_API_KEY is not set on the server.'), { status: 503 });
  const res = await fetchFn(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName,location,formattedAddress' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`Place lookup failed: ${(body.error && body.error.message) || `HTTP ${res.status}`}`), { status: 502 });
  return normalisePlace(body);
}

// The client's position for the map check: the saved listing, else the address, else the
// main town, each through Places. { lat, lng, from } or null when nothing resolves.
async function locateClient({ placeId, address, town, search = searchPlaces, details = getPlace }) {
  if (placeId) {
    try { const p = await details(placeId); if (p.location) return { ...p.location, from: `the saved listing (${p.name || placeId})` }; } catch (_) { /* fall through to the address */ }
  }
  for (const [label, q] of [['the address', address], ['the main town', town]]) {
    if (!q) continue;
    const places = await search(String(q).trim());
    const hit = places.find(p => p.location);
    if (hit) return { ...hit.location, from: `${label} (${hit.name || hit.address || q})` };
  }
  return null;
}

// searchPlaces(textQuery) → [place]. Throws with a plain message on a failed call.
async function searchPlaces(textQuery, { apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchFn = global.fetch, pageSize = 10 } = {}) {
  if (!apiKey) throw Object.assign(new Error('GOOGLE_PLACES_API_KEY is not set on the server.'), { status: 503 });
  const res = await fetchFn(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify({ textQuery, languageCode: 'en-GB', regionCode: 'GB', pageSize }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body.error && body.error.message) || `HTTP ${res.status}`;
    throw Object.assign(new Error(`Places search failed: ${msg}`), { status: 502 });
  }
  return (body.places || []).map(normalisePlace);
}

module.exports = { searchPlaces, getPlace, locateClient, normalisePlace, ENDPOINT, FIELD_MASK };
