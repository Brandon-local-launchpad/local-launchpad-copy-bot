'use strict';

// ── Lead Snap autopost: the intake ───────────────────────────────────────────
// Everything the autopost config needs, read from what Copybot already holds. Nothing is
// stored twice: the only thing this feature saves of its own is the hand row (store.js),
// the fields no other screen has: photo counts, a standing offer, a booking URL and overrides.
//   I:       the GBP inputs (gbp/inputs.js buildGbpInputs)
//   answers: the Fillout answers that matter here ({ tone, words_to_avoid })
//   hand:    { counts: { groupKey: n }, brand: n, offer, booking_url, cta_type, tone, avoid }
// Code decides here and in decide.js; the model only writes the prompt text.

const { buildNap, liveDomain } = require('../../gbp/profile');
const { nicheKeyFor } = require('../../fillout/niches');
const CTA_NICHES = require('./cta-niches.json');

const AREA_OTHERS = 7;                // main town + 7, as the spec's worked example
const MIN_NEARBY = 6;
const FREE_QUOTE_OFFER = 'free, no-obligation quote';
const NOT_A_TOWN = /\b(district|council|borough|county)\b/i;

const str = v => (v == null ? '' : String(v)).trim();
const norm = s => str(s).toLowerCase().replace(/\s+/g, ' ');

// ── Whole services ──
// The page map holds one row per service page (Edens Edge has 31). A prompt is per whole
// service, so pages that share a thing being worked on are one group: "Boiler repair" and
// "Boiler installation" are boilers. The job words below never make a group on their own,
// nor does a word ending in -ing unless it names the thing itself (decking, fencing).
const JOB_WORDS = new Set(['repair', 'repairs', 'installation', 'installations', 'install', 'replacement', 'replacements', 'service', 'services', 'work', 'works', 'fit', 'design', 'designs', 'construction', 'maintenance', 'removal', 'care', 'control', 'management', 'restoration', 'garden', 'gardens', 'home', 'domestic', 'commercial', 'residential', 'emergency', 'custom', 'bespoke', 'new', 'general', 'specialist', 'local', 'and', 'or', 'of', 'the', 'a', 'an', 'for', 'to', 'with', 'in', 'on']);
const THING_ING = new Set(['decking', 'fencing', 'paving', 'roofing', 'plumbing', 'flooring', 'guttering', 'tiling', 'rendering', 'lighting', 'wiring', 'cladding', 'scaffolding', 'heating', 'shelving']);
const isThing = w => !JOB_WORDS.has(w) && (!w.endsWith('ing') || THING_ING.has(w));
const stem = w => w.replace(/ing$/, '').replace(/[es]+$/, '');
const words = title => norm(title).split(/[^a-z0-9]+/).filter(Boolean);
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// Things sold by the load or the area have no plural: "Turf laying" is the Turf folder
const MASS = new Set(['turf', 'grass', 'gravel', 'concrete', 'tarmac', 'resin', 'glass', 'plaster', 'insulation', 'carpet', 'artificial']);
const plural = w => (/(ing|s)$/.test(w) || MASS.has(w) ? w : `${w}s`);
const keyOf = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// One or two words (Brandon, 6 Nov), and the name is also the folder: GBP Photos – Posts / [name], which
// the photo sort skill creates. Pages sharing a thing are that thing ("Boilers"); a lone page keeps
// its own name, cut down: "Artificial grass installation" is "Artificial grass", "Ponds and water
// features" is "Ponds".
function shortName(title) {
  let w = str(title).split(/\s+(?:and|or|&)\s+/i)[0].split(/\s+/);
  if (w.length > 2) { const kept = w.filter(x => !JOB_WORDS.has(x.toLowerCase())); if (kept.length) w = kept; }
  return cap(w.slice(0, 2).join(' '));
}
const nameFor = g => (g.members.length === 1 ? shortName(g.members[0]) : cap(plural(g.head)));

// locked: [{ service, copyPriority }]. Returns the groups ranked highest value first: a service
// the client said they want most (jobs_wanted) first, then best search volume, then most pages.
function groupServices(locked = [], jobsWanted = []) {
  const counts = new Map();
  for (const l of locked) for (const st of new Set(words(l.service).filter(isThing).map(stem))) counts.set(st, (counts.get(st) || 0) + 1);
  const groups = new Map();
  for (const l of locked) {
    // The thing most pages share; on a tie the one named first
    let head = null;
    for (const w of words(l.service).filter(isThing)) if (!head || counts.get(stem(w)) > counts.get(stem(head))) head = w;
    const shared = head && counts.get(stem(head)) > 1;
    const k = shared ? `s:${stem(head)}` : `t:${norm(l.service)}`;
    if (!groups.has(k)) groups.set(k, { head, members: [], volume: 0 });
    const g = groups.get(k);
    g.members.push(l.service);
    g.volume += Number(l.copyPriority) || 0;
  }
  const wanted = (Array.isArray(jobsWanted) ? jobsWanted : []).map(norm).filter(Boolean);
  const wantedRank = g => {
    for (let i = 0; i < wanted.length; i++) if (g.members.some(m => norm(m).includes(wanted[i]) || wanted[i].includes(norm(m)))) return i;
    return wanted.length;
  };
  const out = [...groups.values()].map((g, order) => {
    const name = nameFor(g);
    const rank = wantedRank(g);
    return { key: keyOf(name), label: name, folder: name, services: g.members, volume: g.volume, wanted: rank < wanted.length, rank, order };
  });
  out.sort((a, b) => (a.rank - b.rank) || (b.volume - a.volume) || (b.services.length - a.services.length) || (a.order - b.order));
  // The key is what the typed counts hang on, so two groups never share one
  const seen = new Set();
  for (const g of out) { let k = g.key, n = 2; while (seen.has(k)) k = `${g.key}-${n++}`; seen.add(k); g.key = k; }
  return out.map(({ order, rank, ...g }) => g);
}

// ── The lock (Brandon, 6 Nov) ──
// Once a config is saved its names are what the Drive folders are called, so the tab keeps them
// (lockedFrom) however the page map moves. Only Generate again takes up the page map's names, and
// labelChanges says what that would do first. A rename is a folder name that changes: a label
// alone changing is not one, because no photos have to move.
const lockedFrom = rec => (rec && rec.sheet && rec.intake && Array.isArray(rec.intake.groups) && rec.intake.groups.length ? rec.intake.groups : null);

// The new group most of an old group's pages went to (the first on a tie), else one of the same name
function successor(old, fresh) {
  const pages = new Set(old.services.map(norm));
  let best = null, most = 0;
  for (const g of fresh) { const n = g.services.filter(s => pages.has(norm(s))).length; if (n > most) { best = g; most = n; } }
  return best || fresh.find(g => g.key === old.key) || null;
}

function labelChanges(locked, fresh) {
  const renames = [], removed = [];
  const reached = new Set();
  for (const old of locked) {
    const next = successor(old, fresh);
    if (!next) { removed.push(old.folder); continue; }
    reached.add(next.key);
    if (next.folder !== old.folder) renames.push({ from: old.folder, to: next.folder });
  }
  const oldPages = new Set(locked.flatMap(g => g.services).map(norm));
  const newPages = new Set(fresh.flatMap(g => g.services).map(norm));
  const addedPages = fresh.flatMap(g => g.services).filter(s => !oldPages.has(norm(s)));
  const removedPages = locked.flatMap(g => g.services).filter(s => !newPages.has(norm(s)));
  const added = fresh.filter(g => !reached.has(g.key)).map(g => g.folder);
  return { renames, added, removed, addedPages, removedPages, changed: !!(renames.length || added.length || removed.length || addedPages.length || removedPages.length) };
}

// The typed counts moved to the new names: an old group's count follows its pages, and groups that
// merge add up. A group that is new has no photos yet.
function carryCounts(hand, locked, fresh) {
  const was = (hand && hand.counts) || {};
  const counts = Object.fromEntries(fresh.map(g => [g.key, 0]));
  for (const old of locked) { const next = successor(old, fresh); if (next) counts[next.key] += Number(was[old.key]) || 0; }
  return { ...hand, counts };
}

// ── The areas: the main town and the first seven others ──
// serviceAreasPageMap is already in order of importance: the approved list's Tier 1, Tier 2, then
// area only by score, or the page map's order (nearest first) when nothing is approved yet.
function pickAreas(I) {
  const main = str(I.town);
  const all = (I.serviceAreasPageMap && I.serviceAreasPageMap.length ? I.serviceAreasPageMap : I.areas) || [];
  const others = all.map(str).filter(a => a && norm(a) !== norm(main));
  const skipped = others.filter(a => NOT_A_TOWN.test(a));
  const towns = others.filter(a => !NOT_A_TOWN.test(a));
  const nearby = towns.slice(0, AREA_OTHERS);
  const order = I.serviceAreasFrom === 'the approved locations list' ? 'the approved locations list, Tier 1 first' : 'page map order, nearest first';
  const why = `${main || 'The main town'} plus the first ${nearby.length} of ${towns.length} other service areas, in ${order}.${skipped.length ? ` Left out as not a place a customer would name: ${skipped.join(', ')}.` : ''}`;
  return { main, nearby, all: [main, ...nearby].filter(Boolean), why };
}

// ── What the client can be said to offer ──
// Prompts run for years unrefreshed, so anything that goes out of date is left out: review
// counts, jobs completed and how soon work starts. Payment terms and materials are not selling
// points. Years are written so they stay true ("trading since 2015").
const LEAVE_OUT = /^(payment terms|quotes:|every quote includes|materials and methods|rated |work starts)|jobs completed/i;
function pickUsps(I) {
  const cv = (I.validatorCtx && I.validatorCtx.cv) || {};
  const out = [];
  const founded = parseInt(cv.year_founded, 10);
  const yrs = parseInt(cv.years_trading, 10);
  if (Number.isFinite(founded)) out.push(`trading since ${founded}`);
  else if (Number.isFinite(yrs)) out.push(`over ${yrs} years trading`);
  if (I.accreditations && I.accreditations !== 'none') out.push(...I.accreditations.split(';').map(str).filter(Boolean));
  out.push(...(I.proofPoints || []).filter(p => !LEAVE_OUT.test(p)));
  return [...new Set(out)];
}

// ── The call to action ──
function pickCta({ nicheKey, hand, learnUrl }) {
  const booking = str(hand.booking_url);
  const urgent = CTA_NICHES.call_now.includes(nicheKey);
  const appointment = CTA_NICHES.book.includes(nicheKey);
  const typed = str(hand.cta_type);
  const type = ['Call Now', 'Book', 'Learn More'].includes(typed) ? typed : urgent ? 'Call Now' : appointment && booking ? 'Book' : 'Learn More';
  const why = typed ? 'typed on this tab' : urgent ? 'an urgent trade' : appointment && booking ? 'an appointment niche with a booking URL' : appointment ? 'an appointment niche with no booking URL yet' : 'the default for this niche';
  if (type === 'Call Now') return { type, url: '', line: 'Call Now (uses GBP phone number)', sentence: 'invite them to give us a call', why };
  if (type === 'Book') return { type, url: booking, line: `Book ${booking}`.trim(), sentence: 'invite them to book online', why };
  return { type, url: learnUrl, line: `Learn More ${learnUrl}`.trim(), sentence: 'invite them to read more on our website', why };
}

// The full intake and what is missing. warnings show in the yellow box; missing stops the run.
// locked: the saved config's groups (lockedFrom), which then stand in for the page map's
function buildIntake({ I, trade = '', answers = {}, hand = {}, locked = null }) {
  const cv = (I.validatorCtx && I.validatorCtx.cv) || {};
  const nap = buildNap({ cv, areas: [] });
  const fromTrade = nicheKeyFor(trade);
  const nicheKey = fromTrade && fromTrade !== 'other' ? fromTrade : (nicheKeyFor(I.primary) || 'other');
  const niche = str(I.primary) || str(trade);
  const counts = hand.counts && typeof hand.counts === 'object' ? hand.counts : null;
  const fresh = groupServices(I.locked || [], cv.jobs_wanted);
  const pending = locked ? labelChanges(locked, fresh) : null;
  const groups = (locked || fresh).map(g => ({ ...g, photos: counts && Number.isFinite(Number(counts[g.key])) ? Number(counts[g.key]) : 0 }));
  const brand = Number.isFinite(Number(hand.brand)) ? Number(hand.brand) : 0;
  const photosEntered = !!counts;
  const areas = pickAreas(I);
  const usps = pickUsps(I);
  const toneAnswer = Array.isArray(answers.tone) ? answers.tone.map(str).filter(Boolean).join(', ') : str(answers.tone);
  const tone = str(hand.tone) || toneAnswer.toLowerCase() || 'friendly and professional';
  const avoid = [str(answers.words_to_avoid), str(hand.avoid)].filter(Boolean).join('; ');
  // A typed offer wins. Otherwise confirmed free quotes are the offer (Brandon, 6 Nov): a confirmed
  // fact, not an invented one. Nothing else becomes an offer on its own.
  const typedOffer = str(hand.offer);
  const freeQuotes = str(cv.free_quotes).toLowerCase() === 'yes';
  const offer = typedOffer || (freeQuotes ? FREE_QUOTE_OFFER : '');
  const offerSource = typedOffer ? 'typed' : freeQuotes ? 'free_quotes' : '';
  // The live domain only: a public post never links to the WordPress connection, which may be a
  // staging host (the same rule as the citation packs)
  const website = liveDomain(cv);
  const slug = str(I.primarySlug);
  const learnUrl = website && slug ? website + (slug.startsWith('/') ? slug : `/${slug}`) : website;
  const cta = pickCta({ nicheKey, hand, learnUrl });

  const missing = [];
  if (!str(cv.company_name) && !str(I.name)) missing.push('Business name (Client Values)');
  if (!niche) missing.push('Niche (the primary category on the client record)');
  if (!areas.main) missing.push('Main town (the set-up on the client record)');
  if (!groups.length) missing.push('Services (generate the page map first)');
  if (!photosEntered) missing.push('Photo counts: type them in below and save');

  const warnings = [];
  if (areas.nearby.length < MIN_NEARBY) warnings.push(`Only ${areas.nearby.length} nearby areas beside ${areas.main || 'the main town'}; the spec asks for 6 to 10. Approve more on the Locations tab if the client covers them.`);
  if (!usps.length) warnings.push('No confirmed USPs on the client record, so the prompts have no facts to lean on and the trust prompt will be thin. Confirm them on Client Values before generating.');
  else if (usps.length < 3) warnings.push(`Only ${usps.length} confirmed USP${usps.length === 1 ? '' : 's'} on the client record; the trust prompt will be thin.`);
  if (cta.type === 'Call Now' && !str(nap.phone)) warnings.push('Call Now uses the GBP phone number, and no phone is saved on Client Values.');
  if (cta.type === 'Book' && !cta.url) warnings.push('Book needs a booking URL: type it in below.');
  if (cta.type === 'Learn More' && !cta.url) warnings.push('No live domain is saved, so Learn More has nowhere to go. Save it on Client Values.');
  if (cta.type === 'Learn More' && CTA_NICHES.book.includes(nicheKey) && !str(hand.cta_type)) warnings.push('This niche normally uses Book, but no booking URL is saved, so the call to action falls back to Learn More. Type the booking URL below if the client has one.');
  if (pending && pending.changed) {
    const bits = [];
    if (pending.addedPages.length) bits.push(`new pages: ${pending.addedPages.join(', ')}`);
    if (pending.removedPages.length) bits.push(`removed pages: ${pending.removedPages.join(', ')}`);
    warnings.push(`The page map has changed since this config was saved${bits.length ? ` (${bits.join('; ')})` : ''}. The labels and folders below stay as they are until you press Generate again.`);
  }
  if (pending && pending.renames.length) warnings.push(`Generate again would rename ${pending.renames.length === 1 ? 'a folder' : `${pending.renames.length} folders`}: ${pending.renames.map(r => `${r.from} to ${r.to}`).join(', ')}. You will be asked to confirm.`);
  // Counts saved under a name the services no longer have would quietly read as 0
  const stale = counts ? Object.keys(counts).filter(k => Number(counts[k]) > 0 && !groups.some(g => g.key === k)) : [];
  if (stale.length) warnings.push(`Saved photo counts no longer match a service (${stale.join(', ')}). Check the counts below and save again.`);
  if (photosEntered && !groups.some(g => g.photos > 0) && brand === 0) warnings.push('Every photo count is 0, so no prompt has any photos yet. Get photos from the client before pasting this in.');

  return {
    business: str(cv.company_name) || str(I.name), phone: str(nap.phone), niche, nicheKey,
    mainTown: areas.main, areas: areas.all, nearby: areas.nearby, areasWhy: areas.why,
    groups, labelsLocked: !!locked, pending, brand, photosEntered, usps, offer, offerSource, tone, avoid, cta,
    missing, warnings, ok: missing.length === 0,
  };
}

module.exports = { buildIntake, groupServices, lockedFrom, labelChanges, carryCounts, shortName, pickAreas, pickUsps, pickCta, AREA_OTHERS, FREE_QUOTE_OFFER };
