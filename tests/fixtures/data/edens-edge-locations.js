'use strict';
// The Location Determiner's inputs for Edens Edge, from the committed files: the live
// page map rows of 21 Oct 2026 (categories and the current location pages) and the
// acceptance Client Values (travel_distance "20 miles", no address). The Fillout record
// is not in the repo, so travelFillout is blank and the Client Values fallback path runs.
// Shared by tools/location-dry-run.js and tests/fixtures/location-determiner.js.
const path = require('path');
const rows = require(path.join(__dirname, 'edens-edge-v3-page-map.json')).rows;
const { cv } = require(path.join(__dirname, 'edens-edge-acceptance.js'));

function inputs(overrides = {}) {
  const live = rows.filter(r => r.applies !== false);
  const categories = live.filter(r => r.type === 'category').map(r => ({ key: r.info.category_key, name: r.title, primary: !!r.info.primary }));
  const primary = categories.find(c => c.primary);
  const currentTowns = live.filter(r => r.type === 'location').map(r => ({ town: r.title, phase: (r.info || {}).phase || 1 }));
  const locCats = live.filter(r => r.type === 'location_category');
  return {
    clientId: 'edens-edge-fixture', name: 'Edens Edge landscaping', niche: 'Landscapers/Gardeners',
    baseTown: 'Southampton',
    otherAreas: currentTowns.map(t => t.town),
    travelFillout: '', travelCv: cv.travel_distance,
    addresses: [{ key: 'business_address', label: 'Business Address', value: '' }, { key: 'postal_address', label: 'Postal Address', value: '' }],
    scanSettings: null,
    categories, primaryName: primary ? primary.name : cv.primary_category, primaryKey: primary ? primary.key : null,
    currentTowns,
    pageCounts: { location: currentTowns.length, location_phase2: currentTowns.filter(t => t.phase === 2).length, location_category: locCats.length, location_category_phase2: locCats.filter(r => (r.info || {}).phase === 2).length },
    ...overrides,
  };
}

module.exports = { inputs };
