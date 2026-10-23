'use strict';

// ── Google Places API (New): text search ────────────────────────────────────
// One call, searchText, with the key from GOOGLE_PLACES_API_KEY only (never logged,
// never sent back to the browser). The fixtures stub searchPlaces with recorded
// responses, so tests never call Google. Read only: nothing here writes to Google.

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.primaryType', 'places.types', 'places.rating', 'places.userRatingCount',
  'places.websiteUri', 'places.googleMapsUri', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.businessStatus',
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
  };
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

module.exports = { searchPlaces, normalisePlace, ENDPOINT, FIELD_MASK };
