'use strict';

// ── The place ID step (Brandon, 9 Nov 2026) ───────────────────────────────────
// Every client gets its Google place ID confirmed by a person before anything needs it (rank
// scans match by place ID only). A search by business name and main town lists the top matches
// with name, address and phone. Exactly one match with the client record's phone is
// pre-selected; nothing is ever saved without a person's confirm. With no phone match the
// candidates are shown and a place ID can be pasted instead. The same confirm sets the GBP
// address type: service_area suggested for a listing with no street address (or Google's
// pureServiceAreaBusiness flag), storefront for one with a street address.
// Cost: the search is one Places Text Search (Enterprise fields: phone, rating); a pasted ID is
// one Place Details (Enterprise). Each has 1,000 free a month on the shared key, then about
// $0.035 and $0.02. No Local Falcon credits.

const str = v => (v == null ? '' : String(v)).trim();
const digits = p => {
  let d = str(p).replace(/\D/g, '');
  if (d.startsWith('44')) d = '0' + d.slice(2);
  return d;
};
const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

// A street address: a full UK postcode, or a first part that is not just a town (a number or a road word)
function hasStreetAddress(address) {
  const a = str(address);
  if (!a) return false;
  if (POSTCODE.test(a)) return true;
  const first = a.split(',')[0];
  return /\d/.test(first) || /\b(road|street|st|lane|avenue|way|close|drive|court|place|park|house|unit|estate)\b/i.test(first);
}
function suggestAddressType(place) {
  if (!place) return { value: '', why: '' };
  if (place.service_area === true) return { value: 'service_area', why: 'Google marks the listing as a service area business (no shop front)' };
  return hasStreetAddress(place.address)
    ? { value: 'storefront', why: `the listing shows a street address (${place.address})` }
    : { value: 'service_area', why: `the listing shows no street address (${place.address || 'none'})` };
}

// The top matches, each with whether its phone is the client record's. preselect: the one phone match, if exactly one
function rankCandidates(places, { phone = '', limit = 5 } = {}) {
  const own = digits(phone);
  const list = (places || []).filter(p => p && p.place_id).slice(0, limit).map(p => ({
    place_id: p.place_id, name: p.name || '', address: p.address || '', phone: p.phone || '', maps_url: p.maps_url || '',
    business_status: p.business_status || '', primary_type: p.primary_type || '',
    phone_match: !!own && own.length >= 10 && digits(p.phone) === own,
    street_address: hasStreetAddress(p.address), suggested_address_type: suggestAddressType(p),
  }));
  const matches = list.filter(c => c.phone_match);
  return { candidates: list, preselect: matches.length === 1 ? matches[0].place_id : null, phone_matches: matches.length };
}

module.exports = { rankCandidates, suggestAddressType, hasStreetAddress, digits };
