'use strict';

// ── NAP comparison ────────────────────────────────────────────────────────────────
// A listing's name, address, phone and website against the master NAP record. Each
// field is compared in its normalised form, so these are the same:
//   phone     +44 7850 412717, 07850412717, (0)7850 412 717, 0044 7850 412717
//   name      Edens Edge Landscaping, EDENS EDGE LANDSCAPING LTD, Edens Edge Landscaping Limited,
//             Edens Edge Landscaping & Co (and for &, punctuation dropped)
//   address   12 High St, Southampton, SO14 1AA / 12 High Street Southampton SO141AA
//             (abbreviations written out, the postcode without its space; with a postcode on
//             both sides the postcode decides, else every number and word of the record's
//             address must appear in the listing's)
//   website   https://www.edensedge.co.uk/ and http://edensedge.co.uk (the host only)
// compareNap(expected, found) → { status, diffs, verified, missing }:
//   status    'match' when nothing differs and the name plus the phone (or the postcode) were
//             verified; 'mismatch' when a field differs; 'needs_review' when nothing differed
//             but too little was there to be sure
//   diffs     [{ field, expected, found }] in plain words for the banner
//   verified  the fields that matched; missing: the record's fields the listing did not show

const { expandAddress } = require('../gbp/profile');

const str = v => (v == null ? '' : String(v)).trim();
const lower = s => str(s).toLowerCase();

function normPhone(s) {
  let d = str(s).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('+44')) d = '0' + d.slice(3);
  else if (d.startsWith('0044')) d = '0' + d.slice(4);
  else if (d.startsWith('44') && d.length === 12) d = '0' + d.slice(2);
  return d.replace(/\D/g, '');
}
const NAME_DROP = new Set(['ltd', 'limited', 'llp', 'plc', 'the', 'co', 'company', 'uk']);
function normName(s) {
  return lower(s).replace(/&/g, ' and ').replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !NAME_DROP.has(w)).join(' ');
}
// Loose name match: the same words, one inside the other, or four fifths shared (gbp/competitors.js namesMatch)
function namesMatch(a, b) {
  const ta = normName(a).split(' ').filter(Boolean), tb = normName(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const ja = ta.join(' '), jb = tb.join(' ');
  if (ja === jb || ja.includes(jb) || jb.includes(ja)) return true;
  const shared = ta.filter(t => tb.includes(t)).length;
  return shared / Math.max(ta.length, tb.length) >= 0.8;
}
const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/gi;
function postcodeOf(s) { const m = [...str(s).matchAll(POSTCODE_RE)]; return m.length ? `${m[0][1]}${m[0][2]}`.toUpperCase() : ''; }
function postcodesIn(s) { return [...new Set([...str(s).matchAll(POSTCODE_RE)].map(m => `${m[1]}${m[2]}`.toUpperCase()))]; }
const ADDRESS_DROP = new Set(['united', 'kingdom', 'uk', 'england', 'wales', 'scotland', 'the']);
function addressTokens(s) {
  const expanded = expandAddress(str(s).replace(/,/g, ', '));
  return lower(expanded).replace(POSTCODE_RE, ' ').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !ADDRESS_DROP.has(w));
}
function normWebsite(s) {
  let u = lower(s);
  if (!u) return '';
  if (!/^https?:\/\//.test(u)) u = 'https://' + u;
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return u.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]; }
}

// expected: the master NAP ({ name, phone, address, website }); found: what the listing shows
// ({ name, phones: [], address, postcodes: [], websites: [] } or single values)
function compareNap(expected = {}, found = {}) {
  const diffs = [], verified = [], missing = [];
  const list = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

  // Name
  const eName = str(expected.name);
  const fNames = list(found.name).map(str).filter(Boolean);
  if (eName) {
    if (!fNames.length) missing.push('name');
    else if (fNames.some(n => namesMatch(n, eName))) verified.push('name');
    else diffs.push({ field: 'name', expected: eName, found: fNames[0] });
  }

  // Phone: any phone on the listing equal to the record's
  const ePhone = normPhone(expected.phone);
  const fPhones = list(found.phones != null ? found.phones : found.phone).map(normPhone).filter(d => d.length >= 10);
  if (ePhone) {
    if (!fPhones.length) missing.push('phone');
    else if (fPhones.includes(ePhone)) verified.push('phone');
    else diffs.push({ field: 'phone', expected: str(expected.phone), found: list(found.phones != null ? found.phones : found.phone).map(str).filter(Boolean)[0] });
  }

  // Address: only when the record has one (a service area business has none to compare)
  const eAddr = str(expected.address);
  const fAddr = str(found.address);
  const fPostcodes = [...new Set([...list(found.postcodes).map(p => str(p).replace(/\s+/g, '').toUpperCase()), ...postcodesIn(fAddr)])];
  if (eAddr) {
    const ePc = postcodeOf(eAddr);
    if (!fAddr && !fPostcodes.length) missing.push('address');
    else if (ePc && fPostcodes.length) {
      if (fPostcodes.includes(ePc)) verified.push('address');
      else diffs.push({ field: 'address', expected: eAddr, found: fAddr || fPostcodes[0] });
    } else if (fAddr) {
      const need = addressTokens(eAddr), have = new Set(addressTokens(fAddr));
      if (need.length && need.every(t => have.has(t))) verified.push('address');
      else diffs.push({ field: 'address', expected: eAddr, found: fAddr });
    } else missing.push('address');
  }

  // Website: the host
  const eSite = normWebsite(expected.website);
  const fSites = list(found.websites != null ? found.websites : found.website).map(normWebsite).filter(Boolean);
  if (eSite) {
    if (!fSites.length) missing.push('website');
    else if (fSites.includes(eSite)) verified.push('website');
    else diffs.push({ field: 'website', expected: str(expected.website), found: list(found.websites != null ? found.websites : found.website).map(str).filter(Boolean)[0] });
  }

  const sure = verified.includes('name') && (verified.includes('phone') || verified.includes('address'));
  const status = diffs.length ? 'mismatch' : sure ? 'match' : 'needs_review';
  return { status, diffs, verified, missing };
}

module.exports = { compareNap, normPhone, normName, namesMatch, postcodeOf, postcodesIn, addressTokens, normWebsite, POSTCODE_RE };
