'use strict';

// Calibration packs (3 Nov 2026): one pack per niche in calibration-packs/, registered
// here by file name. A pack's trade names are the trade catalogue's (server.js
// RESEARCH_MODULE_MAP and VIRTUAL_TRADES), so the catalogue, the legacy path and the v20
// page types all read the same pack; its niche is the Fillout niche key (fillout/niches.js),
// so a client whose trade is a Fillout label ("Electricians") finds its pack too.
// A new niche is a new file and a line here, not code.

const fs = require('fs');
const path = require('path');
const N = require('./fillout/niches');

const DIR = path.join(__dirname, 'calibration-packs');

// file → { trades: the trade catalogue names that use it, niche: the Fillout niche key }
const PACKS = {
  'Blinds_Curtains_Calibration_Pack_v1.md':     { trades: ['Blinds & Curtains'],   niche: 'blinds-curtains' },
  'Builder_Calibration_Pack_v6.md':             { trades: ['Building Company'],    niche: 'builders' },
  'Cleaning_Calibration_Pack_v6.md':            { trades: ['Cleaning Company'],    niche: 'cleaning' },
  'Dog_Grooming_Calibration_Pack_v1.md':        { trades: ['Dog Grooming'],        niche: 'dog-grooming' },
  // One pack for plain dog training and the security dogs variant (v2 covers both)
  'Dog_Training_Calibration_Pack_v2.md':        { trades: ['Dog Training', 'Dog Training & Security Dogs'], niche: 'dog-training' },
  'Drainage_Calibration_Pack_v2.md':            { trades: ['Drainage Company'],    niche: 'drainage' },
  'Driveways_Calibration_Pack_v1.md':           { trades: ['Driveways & Paving'],  niche: 'driveways-paving' },
  'Electrician_Calibration_Pack_v1.md':         { trades: ['Electrician'],         niche: 'electricians' },
  'Fencing_Calibration_Pack_v1.md':             { trades: ['Fencing'],             niche: 'fencing' },
  'Flooring_Calibration_Pack_v1.md':            { trades: ['Flooring'],            niche: 'flooring' },
  'Garage_Doors_Calibration_Pack_v1.md':        { trades: ['Garage Doors'],        niche: 'garage-doors' },
  'Guttering_Calibration_Pack_v1.md':           { trades: ['Guttering & Fascias'], niche: 'guttering' },
  'HVAC_Calibration_Pack_v1.md':                { trades: ['HVAC'],                niche: 'hvac' },
  'Kitchen_Bathroom_Calibration_Pack_v1.md':    { trades: ['Kitchen & Bathroom'],  niche: 'kitchen-bathroom' },
  'Landscaper_Calibration_Pack_v5.md':          { trades: ['Landscaper Gardener'], niche: 'landscapers' },
  'Locksmith_Calibration_Pack_v1.md':           { trades: ['Locksmith'],           niche: 'locksmith' },
  'Loft_Conversions_Calibration_Pack_v1.md':    { trades: ['Loft Extensions'],     niche: 'loft-extensions' },
  'Painters_Decorators_Calibration_Pack_v1.md': { trades: ['Painter & Decorator'], niche: 'painters-decorators' },
  'Pest_Control_Calibration_Pack_v1.md':        { trades: ['Pest Control'],        niche: 'pest-control' },
  'Pet_Care_Calibration_Pack_v1.md':            { trades: ['Dog Walker'],          niche: 'dog-walkers' },
  'Plumbing_Heating_Calibration_Pack_v1.md':    { trades: ['Plumbing & Heating'],  niche: 'plumbing-heating' },
  'Pressure_Washing_Calibration_Pack_v1.md':    { trades: ['Pressure Washing'],    niche: 'pressure-washing' },
  'Removals_Calibration_Pack_v1.md':            { trades: ['Removals'],            niche: 'removals' },
  'Roofer_Calibration_Pack_v6.md':              { trades: ['Roofing Company'],     niche: 'roofers' },
  'Scaffolding_Calibration_Pack_v1.md':         { trades: ['Scaffolding'],         niche: 'scaffolding' },
  'Tiling_Calibration_Pack_v1.md':              { trades: ['Tiling'],              niche: 'tiling' },
  'Tree_Surgeon_Calibration_Pack_v1.md':        { trades: ['Tree Surgeon'],        niche: 'tree-surgeons' },
  'Window_Cleaning_Calibration_Pack_v1.md':     { trades: ['Window Cleaning'],     niche: 'window-cleaning' },
};

const norm = s => String(s == null ? '' : s).trim().toLowerCase();

function pathOf(file) { return path.join(DIR, file); }

// The pack file registered for a Fillout niche key, or null
function fileForNiche(key) {
  const hit = Object.entries(PACKS).find(([, p]) => p.niche === key);
  return hit ? hit[0] : null;
}

// The pack file for a trade: a catalogue name as registered, else the trade read as a
// Fillout label or legacy alias through the niche key ("Electricians" → electricians)
function fileForTrade(trade) {
  const t = norm(trade);
  if (!t) return null;
  const exact = Object.entries(PACKS).find(([, p]) => p.trades.some(x => norm(x) === t));
  if (exact) return exact[0];
  const key = N.nicheKeyFor(trade);
  return key && key !== N.OTHER.key ? fileForNiche(key) : null;
}

// The catalogue name a trade's pack is loaded under (the first registered name), or null
function tradeNameFor(trade) {
  const file = fileForTrade(trade);
  return file ? PACKS[file].trades[0] : null;
}

function readPack(file) {
  return fs.readFileSync(pathOf(file), 'utf8');
}

// Every registered pack by trade name: { 'Building Company': text, ... }. A registered file
// that is missing is logged and skipped, so one bad deploy does not take the others down.
function loadAll({ log = () => {} } = {}) {
  const packs = {};
  for (const [file, p] of Object.entries(PACKS)) {
    if (!fs.existsSync(pathOf(file))) { log(`  CALIBRATION PACK MISSING: ${file} (${p.trades.join(', ')})`); continue; }
    const text = readPack(file);
    for (const trade of p.trades) { packs[trade] = text; log(`  CALIBRATION PACK: ${file} → trade "${trade}"`); }
  }
  return packs;
}

// The pack's standing for the Niche library screen
function statusForNiche(key) {
  const file = fileForNiche(key);
  if (!file || !fs.existsSync(pathOf(file))) return { exists: false, file: file || null };
  const st = fs.statSync(pathOf(file));
  return { exists: true, file, version: (file.match(/_v(\d+)/) || [])[1] || null, size: st.size, modified: st.mtime };
}

module.exports = { DIR, PACKS, pathOf, fileForNiche, fileForTrade, tradeNameFor, readPack, loadAll, statusForNiche };
