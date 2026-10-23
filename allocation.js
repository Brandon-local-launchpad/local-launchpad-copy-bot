'use strict';

// ── Allocation pass (Stage 5) ────────────────────────────────────────────────
// One model call per client picks the homepage's 2 neighbourhoods, one symptom
// per symptom-based FAQ slot, and which picked neighbourhoods are conservation
// areas. Code filters what the model may choose from, checks every pick, retries
// once with the errors, then keeps only valid picks. Saved per page key so
// category pages can be added later.

const fs   = require('fs');
const path = require('path');
const { parseDossier, cleanForCopy } = require('./geo-dossier');

const ALLOCATION_MODEL  = 'claude-sonnet-4-6';
const ALLOCATION_PROMPT = 'Allocation_Pass_CORE.md';
const CONSERVATION_RE   = /conservation area|article 4/i;

function loadAllocationPrompt() {
  const text = fs.readFileSync(path.join(__dirname, 'prompts', ALLOCATION_PROMPT), 'utf8');
  // The system prompt is everything after the header note (first "---" line)
  // Windows checkouts can have CRLF line endings
  const lf = text.replace(/\r\n/g, '\n');
  const cut = lf.indexOf('\n---\n');
  return (cut >= 0 ? lf.slice(cut + 5) : lf).trim();
}

const norm = s => (s || '').toLowerCase().trim();

// The client's GBP categories: primary, category_N custom values, category pages
function clientCategories(cv, keyValueMap = {}, pages = []) {
  const cats = new Set();
  if (cv.primary_category) cats.add(norm(cv.primary_category));
  for (const [k, v] of Object.entries(keyValueMap)) if (/^category_\d+$/.test(k) && v) cats.add(norm(v));
  for (const p of pages) if (p.pageType === 'category' && p.pageTitle) cats.add(norm(p.pageTitle));
  return cats;
}

function symptomSlots(niche) {
  return (niche.faq_slots || []).filter(f => f.symptom_based).map(f => ({ slot: f.slot, question: f.question }));
}

// What the model may choose from, with the reason anything was left out
function eligibleItems(parsed, { emergencyNiche, categories }) {
  const issueById = Object.fromEntries(parsed.issues.map(i => [i.id, i]));
  const excluded = [];
  const neighbourhoods = parsed.neighbourhoods.filter(n => {
    if (!n.sourced) excluded.push(`${n.id} ${n.name}: no sourced detail in its profile`);
    return n.sourced;
  });
  const symptoms = parsed.symptoms.filter(s => {
    const issue = issueById[s.issueId];
    if (!issue)                        { excluded.push(`${s.id}: linked issue ${s.issueId || '(none)'} not in the dossier`); return false; }
    if (s.urgent && !emergencyNiche)   { excluded.push(`${s.id}: urgent, and this is not an emergency niche`); return false; }
    if (!issue.categoryTags.some(t => categories.has(norm(t)))) {
      excluded.push(`${s.id}: issue ${issue.id} is not tagged with any of the client's categories`); return false;
    }
    return true;
  });
  return { neighbourhoods, symptoms, excluded };
}

// page: { label: 'homepage' } (the default), or a category page { label: 'category page: Gardener',
// category: 'Gardener', taken: [neighbourhood names other pages already use] }
function buildAllocationMessage({ parsed, eligible, cv, niche, city, categories, slots, page = null }) {
  const issueIds = new Set(eligible.symptoms.map(s => s.issueId));
  const L = [];
  L.push('CLIENT:');
  L.push(`  Trade: ${niche.trade || ''}`);
  L.push(`  Primary city: ${city}`);
  L.push(`  GBP categories: ${[...categories].join(', ') || '(none)'}`);
  L.push(`  Jobs wanted: ${(cv.jobs_wanted || []).join(', ') || '(blank)'}`);
  L.push('');
  L.push(`PAGE: ${(page && page.label) || 'homepage'}`);
  if (page && page.category) {
    L.push(`  This page is about one category of the work: ${page.category}. Prefer the neighbourhoods whose profiles say most about that kind of work.`);
    L.push(`  Code has already removed the neighbourhoods the homepage and the other category pages use${(page.taken || []).length ? ` (${page.taken.join(', ')})` : ''}; the two you pick must still be in different parts of the city.`);
    L.push('  Return the JSON with the key "page" in place of "homepage".');
  }
  L.push('');
  L.push('LOCATION OVERVIEW:');
  L.push(`  ${(parsed.overview || '(none)').replace(/\n+/g, ' ')}`);
  L.push('');
  L.push('SYMPTOM SLOTS:');
  for (const s of slots) L.push(`  ${s.slot}: ${s.question}`);
  if (!slots.length) L.push('  none');
  L.push('');
  L.push('NEIGHBOURHOODS:');
  for (const n of eligible.neighbourhoods) {
    L.push(`  ${n.id} | ${n.name} | ${n.type}`);
    L.push(`    ${n.profile.replace(/\n+/g, ' ')}`);
  }
  L.push('');
  L.push('SYMPTOMS:');
  for (const s of eligible.symptoms) L.push(`  ${s.id} | "${s.text}" | issue ${s.issueId}`);
  if (!eligible.symptoms.length) L.push('  none');
  L.push('');
  L.push('ISSUES:');
  for (const i of parsed.issues.filter(i => issueIds.has(i.id))) {
    L.push(`  ${i.id} | ${i.title}`);
    L.push(`    ${i.detail.replace(/\n+/g, ' ')}`);
  }
  L.push('');
  L.push('RULES & COUNCIL:');
  for (const r of parsed.rules) {
    L.push(`  ${r.id} | ${r.name} | applies to: ${r.wholeArea ? 'whole area' : (r.appliesTo.join(', ') || '(not stated)')}`);
    if (r.detail) L.push(`    ${r.detail.replace(/\n+/g, ' ')}`);
  }
  if (!parsed.rules.length) L.push('  none');
  return L.join('\n');
}

function parseModelJson(raw) {
  return require('./json-extract').extractJsonObject(raw);
}

// Code is the gate. Returns the valid picks and a plain-words error per bad pick.
function checkPicks(reply, { eligible, slots }) {
  const errors = [];
  const hp = (reply && (reply.homepage || reply.page)) || {};
  const nIds = new Set(eligible.neighbourhoods.map(n => n.id));
  const sById = Object.fromEntries(eligible.symptoms.map(s => [s.id, s]));
  const slotNames = new Set(slots.map(s => s.slot));

  const neighbourhoods = [];
  for (const id of (Array.isArray(hp.neighbourhoods) ? hp.neighbourhoods : [])) {
    if (!nIds.has(id))                { errors.push(`${id} is not one of the NEIGHBOURHOODS you were given`); continue; }
    if (neighbourhoods.includes(id))  { errors.push(`${id} was picked twice`); continue; }
    neighbourhoods.push(id);
  }
  if (neighbourhoods.length > 2) {
    errors.push(`pick exactly 2 neighbourhoods, not ${neighbourhoods.length}`);
    neighbourhoods.length = 2;
  } else if (neighbourhoods.length < 2 && nIds.size >= 2) {
    errors.push(`pick exactly 2 neighbourhoods; you picked ${neighbourhoods.length} and ${nIds.size} are available`);
  }

  const symptoms = {};
  for (const [slot, id] of Object.entries(hp.symptoms || {})) {
    if (!slotNames.has(slot)) { errors.push(`${slot} is not one of the SYMPTOM SLOTS`); continue; }
    if (!sById[id])           { errors.push(`${id} (for ${slot}) is not one of the SYMPTOMS you were given`); continue; }
    symptoms[slot] = id;
  }

  const conservation_areas = (Array.isArray(hp.conservation_areas) ? hp.conservation_areas : [])
    .filter(id => neighbourhoods.includes(id));

  return { picks: { neighbourhoods, symptoms, conservation_areas, reasons: String(hp.reasons || '') }, errors };
}

// Rules whose name is a conservation area or Article 4 direction and that apply
// to a pick. Only the name counts: other rules (e.g. a neighbourhood plan) often
// mention a nearby conservation area in passing, which doesn't designate the
// whole area they apply to. The model still judges the profile text.
function conservationFromRules(parsed, ids) {
  const out = new Set();
  for (const r of parsed.rules) {
    if (!CONSERVATION_RE.test(r.name)) continue;
    for (const id of r.appliesTo) if (ids.includes(id)) out.add(id);
  }
  return [...out];
}

// Run the pass. `callModel(system, message)` returns the model's text reply.
// page (category pages, 23 Oct): { label, category, takenNeighbourhoods: [ids], slots: [] }.
// The eligible neighbourhoods lose the taken ones; the slots are the page's own (none
// for a category page: code assigns its symptoms).
async function runAllocation({ dossierText, cv, niche, keyValueMap, pages, callModel, page = null }) {
  const parsed = parseDossier(dossierText);
  const city = (keyValueMap['biz_area_1'] || '').trim();
  const categories = clientCategories(cv, keyValueMap, pages);
  const slots = page ? (page.slots || []) : symptomSlots(niche);
  const eligible = eligibleItems(parsed, { emergencyNiche: !!niche.emergency_niche, categories });
  const takenIds = new Set((page && page.takenNeighbourhoods) || []);
  if (takenIds.size) {
    const names = parsed.neighbourhoods.filter(n => takenIds.has(n.id)).map(n => n.name);
    eligible.neighbourhoods = eligible.neighbourhoods.filter(n => !takenIds.has(n.id));
    for (const n of names) eligible.excluded.push(`${n}: used by another page`);
    page = { ...page, taken: names };
  }
  const system = loadAllocationPrompt();
  const message = buildAllocationMessage({ parsed, eligible, cv, niche, city, categories, slots, page });

  const attempts = [];
  let best = null;
  let feedback = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const msg = feedback ? `${message}\n\nYOUR LAST REPLY HAD THESE PROBLEMS. Fix them and reply again:\n${feedback}` : message;
    let reply, picksResult;
    try {
      reply = await callModel(system, msg);
      picksResult = checkPicks(parseModelJson(reply), { eligible, slots });
    } catch (e) {
      picksResult = { picks: { neighbourhoods: [], symptoms: {}, conservation_areas: [], reasons: '' }, errors: [`reply could not be read: ${e.message}`] };
    }
    attempts.push({ attempt, errors: picksResult.errors });
    if (!best || picksResult.errors.length < best.errors.length) best = picksResult;
    if (!picksResult.errors.length) break;
    feedback = picksResult.errors.map(e => `- ${e}`).join('\n');
  }

  const picks = best.picks;
  picks.conservation_areas = [...new Set([...picks.conservation_areas, ...conservationFromRules(parsed, picks.neighbourhoods)])];

  const flags = allocationFlags(picks, slots, eligible);
  if (best.errors.length) flags.push({ code: 'F-ALLOC', msg: `Kept the valid picks after 2 attempts. Still wrong: ${best.errors.join('; ')}` });

  return {
    neighbourhoods: picks.neighbourhoods,
    symptoms: picks.symptoms,
    conservation_areas: picks.conservation_areas,
    reasons: picks.reasons,
    source: 'model',
    flags,
    attempts,
    excluded: eligible.excluded,
    parseWarnings: parsed.warnings,
  };
}

function allocationFlags(picks, slots, eligible) {
  const flags = [];
  if (picks.neighbourhoods.length < 2) {
    flags.push({ code: 'F-ALLOC', msg: `Only ${picks.neighbourhoods.length} usable neighbourhood(s) (${eligible.neighbourhoods.length} eligible in the dossier).` });
  }
  const missing = slots.filter(s => !picks.symptoms[s.slot]).map(s => s.slot);
  if (missing.length) flags.push({ code: 'F-ALLOC', msg: `No symptom for ${missing.join(', ')}.` });
  return flags;
}

// Page Map "Assigned neighbourhoods" / "Assigned symptoms" on the homepage row win
// over the saved allocation. Returns { allocation, flags }.
function applyAssigned(allocation, homepageRow, parsed) {
  const flags = [];
  if (!homepageRow) return { allocation, flags };
  const nIds = new Set(parsed.neighbourhoods.map(n => n.id));
  const sIds = new Set(parsed.symptoms.map(s => s.id));
  let out = allocation ? { ...allocation } : { neighbourhoods: [], symptoms: {}, conservation_areas: [], reasons: '', source: 'page_map' };

  const assignedN = homepageRow.assignedNeighbourhoods || [];
  if (assignedN.length) {
    const bad = assignedN.filter(id => !nIds.has(id));
    if (bad.length) flags.push({ code: 'F-ALLOC', msg: `Page map Assigned neighbourhoods not in the dossier: ${bad.join(', ')}` });
    out.neighbourhoods = assignedN.filter(id => nIds.has(id));
    out.conservation_areas = [...new Set([...(out.conservation_areas || []).filter(id => out.neighbourhoods.includes(id)), ...conservationFromRules(parsed, out.neighbourhoods)])];
    out.source = 'page_map';
  }
  const assignedS = homepageRow.assignedSymptoms || {};
  if (Object.keys(assignedS).length) {
    const symptoms = { ...(out.symptoms || {}) };
    for (const [slot, id] of Object.entries(assignedS)) {
      if (sIds.has(id)) symptoms[slot] = id;
      else flags.push({ code: 'F-ALLOC', msg: `Page map Assigned symptom ${slot}=${id} is not in the dossier` });
    }
    out.symptoms = symptoms;
    out.source = 'page_map';
  }
  return { allocation: out, flags };
}

// Turn saved picks into the ALLOCATED ITEMS the decisions engine sends:
// names and full cleaned text, no URLs or reference IDs.
function resolveAllocatedItems(allocation, parsed) {
  if (!allocation) return null;
  const nById = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n]));
  const sById = Object.fromEntries(parsed.symptoms.map(s => [s.id, s]));
  const iById = Object.fromEntries(parsed.issues.map(i => [i.id, i]));
  const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
  const conservation = new Set(allocation.conservation_areas || []);

  const neighbourhoods = (allocation.neighbourhoods || []).filter(id => nById[id]).map(id => ({
    name: nById[id].name,
    type: nById[id].type,
    conservation: conservation.has(id),
    profile: cleanForCopy(nById[id].profile, names),
  }));
  const symptoms = {};
  for (const [slot, id] of Object.entries(allocation.symptoms || {})) {
    const s = sById[id];
    if (!s) continue;
    const issue = iById[s.issueId];
    symptoms[slot] = {
      text: s.text,
      issueTitle: issue ? issue.title : '',
      issueText: issue ? cleanForCopy(issue.body, names) : '',
    };
  }
  return { neighbourhoods, symptoms };
}

// Symptoms for a category page (23 Oct): the dossier's symptoms whose issue is tagged
// with the category, one per issue, the non urgent ones first, in dossier order, leaving
// out any symptom (or issue) another page already uses. Code picks these; no model call.
function symptomsForCategory(parsed, { category, emergencyNiche, takenSymptoms = [], takenIssues = [], limit = 5 }) {
  const issueById = Object.fromEntries(parsed.issues.map(i => [i.id, i]));
  const taken = new Set(takenSymptoms), takenI = new Set(takenIssues);
  const fits = parsed.symptoms.filter(s => {
    const issue = issueById[s.issueId];
    if (!issue || taken.has(s.id) || takenI.has(issue.id)) return false;
    if (s.urgent && !emergencyNiche) return false;
    return issue.categoryTags.some(t => norm(t) === norm(category));
  });
  const out = [];
  const seenIssue = new Set();
  for (const s of [...fits.filter(s => !s.urgent), ...fits.filter(s => s.urgent)]) {
    if (seenIssue.has(s.issueId)) continue;
    seenIssue.add(s.issueId);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = {
  ALLOCATION_MODEL, symptomsForCategory,
  runAllocation, checkPicks, eligibleItems, clientCategories, symptomSlots,
  buildAllocationMessage, conservationFromRules, applyAssigned, resolveAllocatedItems,
  loadAllocationPrompt, parseModelJson,
};
