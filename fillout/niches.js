'use strict';

// ── The niche list: one source of truth ──────────────────────────────────────
// The 28 niches come from fillout/field-map.json (niches[label].key), so adding
// a niche stays a config change. Each has a stable key (the map's key, with
// underscores turned to dashes for URLs) and a display name (the Fillout label).
// "other" is the bucket for clients whose trade matches nothing.
//
// nicheKeyFor(trade) maps what clients.trade can hold today: a Fillout label, an
// old trade catalogue name ("Roofing Company"), or a legacy alias ("Roofer").

const path = require('path');
const fs = require('fs');

const MAP_PATH = path.join(__dirname, 'field-map.json');
const OTHER = { key: 'other', label: 'Other / unsorted' };

// Old trade catalogue names and legacy aliases → the field map's niche label
const TRADE_TO_LABEL = {
  'blinds & curtains': 'Blinds & Curtains Fitters',
  'building company': 'Builders', 'builder': 'Builders',
  'cleaning company': 'Cleaning Companies', 'cleaning': 'Cleaning Companies',
  'dog grooming': 'Dog Grooming',
  'dog training': 'Dog Training', 'dog training & security dogs': 'Dog Training',
  'dog walker': 'Pet Care Services (Dog Walkers)',
  'drainage company': 'Drainage', 'drainage': 'Drainage',
  'driveways & paving': 'Driveways & Paving',
  'electrician': 'Electricians',
  'fencing': 'Fencing',
  'flooring': 'Flooring Fitters (carpet/laminate/LVT)',
  'garage doors': 'Garage Doors Installs',
  'guttering & fascias': 'Guttering & Fascias',
  'hvac': 'HVAC',
  'kitchen & bathroom': 'Kitchen/Bathroom Fitters',
  'landscaper gardener': 'Landscapers/Gardeners', 'landscaper': 'Landscapers/Gardeners', 'landscaping': 'Landscapers/Gardeners',
  'locksmith': 'Locksmith',
  'loft extensions': 'Loft Conversions / Extensions',
  'painter & decorator': 'Painters & Decorators',
  'pest control': 'Pest Control',
  'plumbing & heating': 'Plumbing & Heating',
  'pressure washing': 'Pressure Washing / Exterior Cleaning',
  'removals': 'Removals Company',
  'roofing company': 'Roofers', 'roofer': 'Roofers', 'roofing contractor': 'Roofers',
  'scaffolding': 'Scaffolding',
  'tiling': 'Tiling',
  'tree surgeon': 'Tree Surgeons',
  'window cleaning': 'Window Cleaning',
  // No Fillout niche for these: Other / unsorted
  'carpenter': null, 'plasterer': null, 'skip hire': null,
};

let cache = null;
function loadNiches(file = MAP_PATH) {
  if (cache && cache.file === file) return cache.list;
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Object.entries(map.niches || {}).map(([label, n]) => ({ key: String(n.key).replace(/_/g, '-'), mapKey: n.key, label }));
  cache = { file, list };
  return list;
}

const norm = s => String(s == null ? '' : s).trim().toLowerCase();

function allNiches() { return [...loadNiches(), OTHER]; }
function nicheByKey(key) { return allNiches().find(n => n.key === key) || null; }
function nicheLabel(key) { const n = nicheByKey(key); return n ? n.label : (key || ''); }

// A Fillout label or an old trade name → niche key; 'other' when nothing matches; null for blank
function nicheKeyFor(trade) {
  const t = norm(trade);
  if (!t) return null;
  const byLabel = loadNiches().find(n => norm(n.label) === t);
  if (byLabel) return byLabel.key;
  if (t in TRADE_TO_LABEL) {
    const label = TRADE_TO_LABEL[t];
    if (!label) return OTHER.key;
    const n = loadNiches().find(x => x.label === label);
    return n ? n.key : OTHER.key;
  }
  return OTHER.key;
}

// The suggestion for a new client: only a real match counts (never "other")
function suggestedNicheKey(trade) {
  const k = nicheKeyFor(trade);
  return k && k !== OTHER.key ? k : null;
}

module.exports = { OTHER, TRADE_TO_LABEL, loadNiches, allNiches, nicheByKey, nicheLabel, nicheKeyFor, suggestedNicheKey, norm };
