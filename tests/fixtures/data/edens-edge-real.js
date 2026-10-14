'use strict';
// Edens Edge's real page map and GBP category sheets (copied from the client's
// custom values workbook, 14 Oct 2026; tests/fixtures/edens-edge-real/), parsed
// with the app's own parsers. The client sheet (email, phone) isn't in the repo,
// so the 14 service areas are written out here.
const fs = require('fs');
const path = require('path');
const { parsePageMap, parseCustomValues } = require('../../../client-files');

const dir = path.join(__dirname, '../edens-edge-real');
const pages = parsePageMap(fs.readFileSync(path.join(dir, 'page-map.csv'), 'utf8'));
const cats = fs.readdirSync(dir).filter(f => f.startsWith('cat-')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8'));
const { keyValueMap, serviceParentMap } = parseCustomValues(cats);

const AREAS = ['Southampton', 'Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge',
  'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'];
AREAS.forEach((a, i) => { keyValueMap[`biz_area_${i + 1}`] = a; });

module.exports = { pages, keyValueMap, serviceParentMap, AREAS };
