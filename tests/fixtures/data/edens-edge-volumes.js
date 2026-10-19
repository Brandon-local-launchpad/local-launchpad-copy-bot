'use strict';
// A stub keyword table for Edens Edge (NOT DataForSEO figures): enough volume for a few
// service pages, two town service pages and the worked examples in the tests. Shared by
// tests/fixtures/page-map.js, page-map-v3.js and tools/page-map-report.js.
const TABLE = {
  // categories (Southampton) and the approved synonyms
  'gardener southampton': [210, 3.12], 'landscape gardener southampton': [20, 2.79], 'tree service southampton': [20, 3.03], 'tree surgeon southampton': [320, 4.1],
  'paving contractor southampton': [10, null], 'driveways southampton': [140, 2.2], 'landscape designer southampton': [15, null], 'garden design southampton': [20, 7.03], 'decking southampton': [20, 1.1],
  // services in the base town
  'hedge trimming southampton': [30, 6.49], 'lawn care southampton': [30, 2.31], 'tree stump removal southampton': [40, 2], 'tree removal southampton': [20, 1.5], 'garden landscaping southampton': [90, 2.91],
  // towns
  'gardener romsey': [50, 1.81], 'gardener winchester': [140, 2.43], 'gardener eastleigh': [50, 2.49], 'gardener chandlers ford': [30, 0.91], 'gardener hedge end': [20, 2.08],
  'tree surgeon winchester': [140, 3.9], 'tree surgeon romsey': [50, 3.66], 'landscaper winchester': [70, 4.82], 'landscaping winchester': [70, 4.82],
  // services in towns (town service pages)
  'tree stump removal romsey': [20, null], 'lawn care winchester': [20, 3.42], 'tree planting winchester': [20, 1.2],
};
const volumes = (extra = {}) => new Map(Object.entries({ ...TABLE, ...extra }).map(([k, v]) => [k, { volume: v[0], cpc: v[1] }]));
module.exports = { TABLE, volumes };
