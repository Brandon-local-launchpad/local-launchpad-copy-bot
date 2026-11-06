'use strict';
// Fixture: the Lead Snap autopost config, with a canned model and pg-mem. No API calls.
// The four clients the build asked for: the spec's plumber, a client with no brand photos, a dog
// walker (Book), and Edens Edge's 31 live service pages for the grouping. Also: the system prompt
// word for word, the threshold, the 7 prompt cap, the offer rule, the checks and retry, a failed
// run keeping the last good config, the files and the routes.
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { buildIntake, groupServices, shortName: S_ } = require(path.join(root, 'leadsnap/autopost/intake.js'));
const { decide } = require(path.join(root, 'leadsnap/autopost/decide.js'));
const G = require(path.join(root, 'leadsnap/autopost/generate.js'));
const { mountLeadSnapApi } = require(path.join(root, 'leadsnap/autopost/routes.js'));
const { buildGbpInputs } = require(path.join(root, 'gbp/inputs.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows: edensRows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: Lead Snap autopost config ===\n');

// ── The clients: GBP inputs in the shape gbp/inputs.js returns ──
const inputs = ({ name, primary, town, areas, services, cv = {}, site = '' }) => ({
  name, primary, town, areas: [town, ...areas], serviceAreasPageMap: [town, ...areas], serviceAreasFrom: 'the page map', siteUrl: site, primarySlug: '/' + primary.toLowerCase().replace(/\s+/g, '-'),
  locked: services.map(([service, copyPriority = 0]) => ({ service, copyPriority })),
  years: 'none', accreditations: cv.accreditations || 'none', proofPoints: cv.proofPoints || [],
  validatorCtx: { cv: { company_name: name, phone: cv.phone || '', live_domain: site, jobs_wanted: cv.jobs_wanted || [], years_trading: cv.years_trading || '' } },
});
const plumberI = inputs({
  name: 'Hartley Plumbing & Heating', primary: 'Plumber', town: 'Romford',
  areas: ['Hornchurch', 'Upminster', 'Gidea Park', 'Harold Wood', 'Collier Row', 'Dagenham', 'Brentwood'],
  services: [['Boiler repair', 900], ['Boiler installation', 800], ['Leak repair', 300], ['Bathroom fitting', 200], ['Drain unblocking', 100]],
  cv: { phone: '01708 123456', years_trading: '15', accreditations: 'Gas Safe registered', proofPoints: ['same day visits available', 'fixed prices agreed before work starts'] },
});
const plumberCounts = { boilers: 6, 'leak-repair': 4, 'bathroom-fitting': 0, 'drain-unblocking': 2 };
const plumberHand = { counts: plumberCounts, brand: 5, offer: 'Free boiler quote' };
const plumber = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' }, hand: plumberHand });

// ── The system prompt, word for word ──
const spec = fs.readFileSync(path.join(root, 'docs/leadsnap/Autopost_Spec.md'), 'utf8').replace(/\r\n/g, '\n');
const inSpec = spec.slice(spec.indexOf('```text\nYou write Lead Snap') + 8, spec.indexOf('\n```', spec.indexOf('```text\nYou write Lead Snap') + 8));
chk('the system prompt is the spec\'s, word for word, then the format', G.loadSystem().startsWith(inSpec) && /OUTPUT FORMAT/.test(G.loadSystem()), G.loadSystem().slice(0, 60), inSpec.slice(0, 60));

// ── Plumber: the spec's worked example ──
const P = decide(plumber);
const row = D => D.prompts.map(p => `${p.label} | ${p.folder} (${p.photos})`).join('\n');
chk('plumber: short names, and each folder is its name', plumber.groups.map(g => g.label).join('|') === 'Boilers|Leak repair|Bathroom fitting|Drain unblocking' && plumber.groups.every(g => g.folder === g.label), plumber.groups.map(g => g.label).join('|'), '');
chk('plumber: the six prompts of the worked example, in order, with their folders', row(P) === [
  'Boilers | GBP Posts / Boilers (6)', 'Leak repair | GBP Posts / Leak repair (4)', 'Other services | GBP Posts / Brand (5)', 'Trust / why us | GBP Posts / Brand (5)', 'Free boiler quote | GBP Posts / Boilers (6)', 'Evergreen tips | All job photos (12)',
].join('\n'), row(P), 'the spec table');
chk('plumber: other services covers the two under 3 photos', P.prompts[2].services.join(',') === 'Bathroom fitting,Drain unblocking', P.prompts[2].services, '');
chk('plumber: bathrooms (0) and drains (2) are the photo gaps', P.gaps.map(g => `${g.label} ${g.photos}`).join(',') === 'Bathroom fitting 0,Drain unblocking 2', JSON.stringify(P.gaps), '');
chk('plumber: Call Now, no URL, uses the GBP phone', plumber.cta.type === 'Call Now' && plumber.cta.line === 'Call Now (uses GBP phone number)' && plumber.cta.sentence === 'invite them to give us a call', plumber.cta.line, '');
chk('plumber: main town and 7 areas', plumber.areas.length === 8 && plumber.areas[0] === 'Romford', plumber.areas, '');
chk('plumber: the tone comes from the intake answer', plumber.tone === 'friendly, plain-spoken', plumber.tone, '');
chk('plumber: USPs from confirmed values, years written so they stay true', plumber.usps.join('|') === 'over 15 years trading|Gas Safe registered|same day visits available|fixed prices agreed before work starts', plumber.usps.join('|'), '');
chk('plumber: ready, nothing missing', plumber.ok && !plumber.missing.length, plumber.missing, []);

// ── No brand photos ──
const noBrand = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 0 } });
const NB = decide(noBrand);
chk('no brand photos: no other services prompt', !NB.prompts.some(p => p.kind === 'other'), row(NB), '');
chk('no brand photos: trust uses the best job photos', NB.prompts.find(p => p.kind === 'trust').folder === 'GBP Posts / Boilers', NB.prompts.find(p => p.kind === 'trust').folder, 'GBP Posts / Boilers');
chk('no brand photos: services under 3 get no post and stay on the gap list', NB.gaps.length === 2 && !NB.prompts.some(p => /bathroom|drain/i.test(p.label)), JSON.stringify(NB.gaps), '');
chk('no brand photos: says why, and that it is under 5 prompts', NB.notes.some(n => /no post at all/.test(n)) && NB.notes.some(n => /Only 4 prompts/.test(n)), NB.notes, '');
chk('no offer typed: no offer prompt, never invented', !NB.prompts.some(p => p.kind === 'offer'), row(NB), '');
const brandOfTwo = decide(buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 2 } }));
chk('2 brand photos is under the threshold: treated as none', !brandOfTwo.prompts.some(p => p.kind === 'other') && brandOfTwo.prompts.find(p => p.kind === 'trust').folder === 'GBP Posts / Boilers', row(brandOfTwo), '');
const none = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: { counts: {}, brand: 0 } });
chk('all counts 0: warned, and the folder says none yet', none.warnings.some(w => /Every photo count is 0/.test(w)) && decide(none).prompts.find(p => p.kind === 'trust').folder === 'None yet' && decide(none).prompts.find(p => p.kind === 'tips').folder === 'None yet', none.warnings, '');
const noCounts = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: {} });
chk('no counts typed: photo counts are asked for and the run is stopped', !noCounts.ok && noCounts.missing.some(m => /Photo counts/.test(m)), noCounts.missing, '');

// ── Dog walker: Book ──
const dogI = inputs({ name: 'Happy Tails', primary: 'Dog Walker', town: 'Bath', areas: ['Keynsham', 'Saltford', 'Bathford', 'Batheaston', 'Combe Down', 'Odd Down', 'Weston'], services: [['Dog walking', 50], ['Puppy visits', 20], ['Pet sitting', 10]], cv: { proofPoints: ['insured and DBS checked', 'small groups only', 'photo updates after every walk'] }, site: 'https://happytails.example' });
const dog = buildIntake({ I: dogI, trade: 'Pet Care Services (Dog Walkers)', hand: { counts: { 'dog-walking': 8, 'puppy-visits': 4 }, brand: 3, booking_url: 'https://happytails.example/book' } });
chk('dog walker with a booking URL: Book, and the sentence leads into it', dog.cta.type === 'Book' && dog.cta.url === 'https://happytails.example/book' && dog.cta.sentence === 'invite them to book online', dog.cta.line, 'Book');
const dogNoUrl = buildIntake({ I: dogI, trade: 'Pet Care Services (Dog Walkers)', hand: { counts: {}, brand: 3 } });
chk('dog walker with no booking URL: Learn More to the category page, with a warning', dogNoUrl.cta.type === 'Learn More' && dogNoUrl.cta.url === 'https://happytails.example/dog-walker' && dogNoUrl.warnings.some(w => /normally uses Book/.test(w)), dogNoUrl.cta.line, '');
const dogCalled = buildIntake({ I: dogI, trade: 'Pet Care Services (Dog Walkers)', hand: { counts: {}, brand: 3, cta_type: 'Call Now' } });
chk('a CTA typed on the tab wins over the niche default', dogCalled.cta.type === 'Call Now', dogCalled.cta.type, 'Call Now');
const stagingOnly = buildIntake({ I: { ...inputs({ name: 'X', primary: 'Landscaper', town: 'Bath', areas: [], services: [['Patios']] }), siteUrl: 'https://staging.x.example' }, trade: 'Landscapers/Gardeners', hand: { counts: {} } });
chk('the WordPress connection is never the public link: it may be staging', stagingOnly.cta.url === '' && stagingOnly.warnings.some(w => /No live domain/.test(w)), stagingOnly.cta.url, '');
chk('a landscaper with a site gets Learn More', buildIntake({ I: inputs({ name: 'X', primary: 'Landscaper', town: 'Bath', areas: [], services: [['Patios']], site: 'https://x.example/' }), trade: 'Landscapers/Gardeners', hand: { counts: {} } }).cta.line === 'Learn More https://x.example/landscaper', '', '');

// ── 30+ service pages: Edens Edge ──
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'], categories: ['Gardener', 'Landscape Gardener', 'Landscape Designer', 'Tree Service', 'Paving Contractor', 'Deck Builder'] };
const eCv = { ...E.ethanValues(), jobs_wanted: ['Patios'] };
const eCtx = contextFromPageMap({ rows: edensRows, hand, cv: eCv, niche: landscaper });
const eI = buildGbpInputs({ cv: eCv, niche: landscaper, rows: edensRows, keyValueMap: eCtx.keyValueMap, siteUrl: 'https://edensedge.co.uk/' });
const eGroups = groupServices(eI.locked, eCv.jobs_wanted);
const gOf = s => eGroups.find(g => g.services.includes(s));
chk('Edens Edge: 31 service pages, every one in exactly one group', eI.locked.length === 31 && eGroups.flatMap(g => g.services).length === 31 && new Set(eGroups.flatMap(g => g.services)).size === 31, eGroups.flatMap(g => g.services).length, 31);
chk('Edens Edge: 31 pages become far fewer whole services', eGroups.length <= 20, eGroups.length, '20 or fewer');
chk('Edens Edge: the six tree pages are one service', gOf('Tree stump removal').services.length === 6 && gOf('Tree stump removal').label === 'Trees', JSON.stringify(gOf('Tree stump removal')), '');
chk('Edens Edge: decking pages are one service', ['Composite decking', 'Decking restoration', 'Decking installation', 'Decking repairs'].every(s => gOf(s) === gOf('Composite decking')) && gOf('Composite decking').folder === 'Decking', JSON.stringify(gOf('Composite decking')), '');
chk('Edens Edge: every label is one or two words, and every folder matches its label', eGroups.every(g => g.label.split(/\s+/).length <= 2 && g.folder === g.label), eGroups.filter(g => g.label.split(/\s+/).length > 2).map(g => g.label), []);
chk('Edens Edge: pages sharing a thing are that thing', gOf('Retaining walls').label === 'Walls' && gOf('Lawn care').label === 'Lawns', gOf('Retaining walls').label, 'Walls');
chk('a long name is cut down', S_('Artificial grass installation') === 'Artificial grass' && S_('Ponds and water features') === 'Ponds' && S_('Tree pruning and crown reduction') === 'Tree pruning' && S_('Commercial roof cleaning') === 'Roof cleaning' && S_('Landscape architecture services') === 'Landscape architecture', S_('Commercial roof cleaning'), 'Roof cleaning');
chk('Edens Edge: the lawn pages are one service', ['Lawn mowing', 'Lawn seeding', 'Lawn care'].every(s => gOf(s) === gOf('Lawn care')), JSON.stringify(gOf('Lawn care')), '');
chk('Edens Edge: "garden" alone never makes a group', gOf('Garden maintenance') !== gOf('Garden drainage'), JSON.stringify(gOf('Garden drainage')), '');
chk('Edens Edge: "trimming" alone never makes a group', gOf('Hedge trimming').services.length === 1, JSON.stringify(gOf('Hedge trimming')), '');
chk('Edens Edge: what the client wants most ranks first', eGroups[0].services.includes('Patios'), eGroups[0].label, 'Patios');
chk('Edens Edge: group keys are unique, so typed counts cannot collide', new Set(eGroups.map(g => g.key)).size === eGroups.length, eGroups.map(g => g.key), '');
const eKeys = Object.fromEntries(eGroups.map(g => [g.key, 5]));
const eIntake = buildIntake({ I: eI, trade: 'Landscapers/Gardeners', hand: { counts: eKeys, brand: 6, offer: 'Free garden design visit' } });
const eD = decide(eIntake);
chk('Edens Edge: never more than 7 prompts, with every service holding photos', eD.prompts.length === 7, eD.prompts.length, 7);
chk('Edens Edge: at the cap the offer stays and service prompts give way', eD.prompts.filter(p => p.kind === 'service').length === 3 && eD.prompts.some(p => p.kind === 'offer') && eD.prompts.some(p => p.kind === 'other') && eD.prompts.some(p => p.kind === 'trust') && eD.prompts.some(p => p.kind === 'tips'), row(eD), '');
chk('Edens Edge: services with photos but no slot fold into other services, and are not gaps', eD.prompts.find(p => p.kind === 'other').services.length === eGroups.length - 3 && eD.gaps.length === 0, eD.prompts.find(p => p.kind === 'other').services.length, eGroups.length - 3);
const eNoFree = { ...eI, validatorCtx: { ...eI.validatorCtx, cv: { ...eI.validatorCtx.cv, free_quotes: 'no' } } };
const eFour = decide(buildIntake({ I: eNoFree, trade: 'Landscapers/Gardeners', hand: { counts: eKeys, brand: 6 } }));
chk('Edens Edge: 4 service prompts when there is no offer (never more)', eFour.prompts.filter(p => p.kind === 'service').length === 4 && eFour.prompts.length === 7, row(eFour), '');
chk('Edens Edge: areas are the main town and 7, and a council area is left out and explained', eIntake.areas.length === 8 && eIntake.areas[0] === 'Southampton' && /nearest first/.test(eIntake.areasWhy), eIntake.areas, '');
const withCouncil = buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: ['New Forest District', 'Brockenhurst'], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: {} } });
chk('a council area is never offered as a place, and is explained', !withCouncil.areas.includes('New Forest District') && /New Forest District/.test(withCouncil.areasWhy), withCouncil.areasWhy, '');
chk('too few areas warns', withCouncil.warnings.some(w => /Only 1 nearby areas/.test(w)), withCouncil.warnings, '');
const noPhone = buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: [], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: {} } });
chk('Call Now with no phone warns; no USPs warns', noPhone.warnings.some(w => /no phone is saved/.test(w)) && noPhone.warnings.some(w => /No confirmed USPs/.test(w)), noPhone.warnings, '');
const stale = buildIntake({ I: { ...plumberI, proofPoints: ['rated 4.9 from 88 reviews', '300 jobs completed', 'work starts within 2 weeks', 'payment terms: 20% deposit', 'a team of 3'] }, trade: 'Plumbing & Heating', hand: { counts: {} } });
chk('USPs that go out of date are left out: prompts run for years', stale.usps.includes('a team of 3') && !stale.usps.some(u => /reviews|jobs completed|work starts|deposit/.test(u)), stale.usps, '');

// ── Free quotes as the offer (Brandon, 6 Nov) ──
const withCv = (I0, extra) => ({ ...I0, validatorCtx: { ...I0.validatorCtx, cv: { ...I0.validatorCtx.cv, ...extra } } });
const freeI = { ...withCv(plumberI, { free_quotes: 'yes' }), proofPoints: ['free quotes', ...plumberI.proofPoints] };
const free = buildIntake({ I: freeI, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 5 } });
const freeD = decide(free);
const freeOffer = freeD.prompts.find(p => p.kind === 'offer');
chk('confirmed free quotes and no typed offer: the offer is a free, no-obligation quote', free.offer === 'free, no-obligation quote' && free.offerSource === 'free_quotes' && freeOffer && freeOffer.label === 'Free, no-obligation quote' && /confirmed free quotes/.test(freeOffer.why), JSON.stringify(freeOffer), '');
chk('a typed offer wins over free quotes', (() => { const t = buildIntake({ I: freeI, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 5, offer: 'Free boiler quote' } }); return t.offer === 'Free boiler quote' && t.offerSource === 'typed'; })(), '', '');
for (const v of ['no', '', 'maybe']) chk(`free_quotes "${v}" and nothing typed: no offer prompt`, !decide(buildIntake({ I: withCv(plumberI, { free_quotes: v }), trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 5 } })).prompts.some(p => p.kind === 'offer'), v, 'no offer');

// ── Too few prompts (Brandon, 6 Nov) ──
const twoServices = { counts: { boilers: 4, 'leak-repair': 1, 'bathroom-fitting': 0, 'drain-unblocking': 2 }, brand: 1 };
const few = decide(buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: twoServices }));
chk('3 prompts: the warning, word for word', few.prompts.length === 3 && few.tooFew && few.tooFew.message === "Too few prompts. Don't start autopost until the client sends more photos.", JSON.stringify(few.tooFew), '');
chk('it lists which photos unlock more, highest value first, with what each needs', few.tooFew.unlock[0] === 'Leak repair: 2 more photos gives it its own prompt (GBP Posts / Leak repair)' && few.tooFew.unlock[1] === 'Bathroom fitting: 3 more photos gives it its own prompt (GBP Posts / Bathroom fitting)' && few.tooFew.unlock[2] === 'Drain unblocking: 1 more photo gives it its own prompt (GBP Posts / Drain unblocking)', few.tooFew.unlock.join(' | '), '');
chk('it lists the brand photos that open up other services', few.tooFew.unlock.some(u => /^Brand .*2 more photos adds an "Other services" prompt/.test(u)), few.tooFew.unlock.join(' | '), '');
chk('exactly 4 prompts: no warning', decide(noBrand).prompts.length === 4 && !decide(noBrand).tooFew, decide(noBrand).prompts.length, 4);
chk('6 prompts: no warning', !P.tooFew, JSON.stringify(P.tooFew), 'null');
const manyUnder = decide(buildIntake({ I: eI, trade: 'Landscapers/Gardeners', hand: { counts: {}, brand: 0 } }));
chk('it never lists more services than there are prompt slots', manyUnder.tooFew === null || manyUnder.tooFew.unlock.filter(u => /own prompt/.test(u)).length <= 4, manyUnder.tooFew && manyUnder.tooFew.unlock.length, '4 or fewer');
const oneService = decide(buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: [], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: { 'roof-repair': 5 } } }));
chk('a one service client with photos: says photos will not help, and an offer would', oneService.prompts.length === 3 && /will not add a prompt/.test(oneService.tooFew.unlock[0]), oneService.tooFew && oneService.tooFew.unlock[0], '');
const renamed = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: { counts: { leaks: 4 } } });
chk('counts saved under an old name warn instead of silently reading 0', renamed.warnings.some(w => /no longer match a service \(leaks\)/.test(w)), renamed.warnings, '');

// ── The canned model ──
const angles = kind => (kind === 'tips' ? ['Check your stopcock', 'Bleed a radiator', 'Spot a hidden leak', 'What not to put down a sink'] : ['The problem customers notice', 'How the job is done', 'A common question answered', 'What to expect when booking']);
function goodSheet(intake, D) {
  const L = [`LEAD SNAP AUTOPOST CONFIG - ${intake.business}`, '', 'SETTINGS', 'Frequency: Custom - twice per week', `Call to action: ${intake.cta.line}`, ''];
  for (const p of D.prompts) {
    L.push(`PROMPT ${p.n} - ${p.label}`, `Tone: ${intake.tone}`, `Images: Choose specific images from GBP or upload -> select from folder: ${p.folder}`, 'Prompt:');
    const about = p.kind === 'service' ? p.services.join(' and ') : p.kind === 'other' ? `one of ${p.services.join(', ')}` : p.kind === 'offer' ? intake.offer : p.label;
    L.push(`Write a Google Business Profile post for ${intake.business}, a ${intake.niche} based in ${intake.mainTown}, about ${about}.`, '', `Facts you may use: ${intake.usps.join(', ')}. Do not use any other facts.`, '', `Areas: ${intake.areas.join(', ')}. Pick ONE area from the list and mention it naturally once.`, '', `Pick one ${p.kind === 'tips' ? 'tip' : 'angle'} at random for this post:`, ...angles(p.kind).map(a => `- ${a}`), '', `Write 150-300 words in plain UK English, no headings, no hashtags, no emoji. Use the service name with the town or area naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not mention seasons, weather, holidays or dates. No generic filler. Tone: ${intake.tone}. End with one sentence that leads into the button: ${intake.cta.sentence}.`, '');
  }
  L.push('PHOTO GAPS', ...D.gaps.map(g => `- ${g.label}: ${g.photos} photos. Ask the client for 3-4 photos of finished ${g.label.toLowerCase()} from the customer's side.`), '', 'VA CHECKLIST', '[ ] Settings set');
  return L.join('\n');
}
const canned = text => async () => ({ text, usage: { input_tokens: 10, output_tokens: 20 } });

(async () => {
  // ── Generate, the checks, the sheet ──
  let rec = await G.runAutopost({ intake: plumber, callModel: canned(goodSheet(plumber, P)) });
  chk('a good reply passes first time', !rec.failure && rec.attempts === 1 && rec.output.prompts.length === 6, JSON.stringify(rec.failure), '');
  const S = rec.sheet;
  const order = ['LEAD SNAP AUTOPOST CONFIG - Hartley Plumbing & Heating', 'SETTINGS', 'Frequency: Custom - twice per week', 'Call to action: Call Now (uses GBP phone number)', 'PROMPT 1 - Boilers', 'Tone: friendly, plain-spoken', 'Images: Choose specific images from GBP or upload -> select from folder: GBP Posts / Boilers', 'PROMPT 3 - Other services: bathroom fitting, drain unblocking', 'PROMPT 6 - Evergreen tips', 'PHOTO GAPS', '- Bathroom fitting: 0 photos. Ask the client for', 'VA CHECKLIST', '[ ] Saved and started; first post checked on All Posts page'];
  chk('the sheet follows the spec\'s format and Lead Snap\'s screen order', order.every((s, i) => S.includes(s) && (i === 0 || S.indexOf(s) > S.indexOf(order[i - 1]))), S.slice(0, 400), '');
  chk('settings, labels and folders are code\'s even when the model writes others', (await G.runAutopost({ intake: plumber, callModel: canned(goodSheet(plumber, P).replace('PROMPT 1 - Boilers', 'PROMPT 1 - Something else').replace('Frequency: Custom - twice per week', 'Frequency: Daily').replace('folder: GBP Posts / Boilers', 'folder: Wrong')) })).sheet.includes('PROMPT 1 - Boilers\nTone: friendly, plain-spoken\nImages: Choose specific images from GBP or upload -> select from folder: GBP Posts / Boilers'), '', '');
  chk('a fenced reply still parses', !(await G.runAutopost({ intake: plumber, callModel: canned('```text\n' + goodSheet(plumber, P) + '\n```') })).failure, '', '');
  chk('a gap with no line from the model still gets one', (await G.runAutopost({ intake: plumber, callModel: canned(goodSheet(plumber, P).replace(/^- Drain unblocking.*$/m, '')) })).output.gaps[1].line === 'Drain unblocking: 2 photos. Ask the client for 3-4 photos of finished drain unblocking jobs.', '', '');

  const failsFor = text => G.validateSheet(G.parseSheet(text), plumber, P).fails.map(f => f.message).join(' | ');
  const good = goodSheet(plumber, P);
  chk('check: a missing prompt', /has 5 prompts/.test(failsFor(good.replace(/PROMPT 6 - [\s\S]*?(?=PHOTO GAPS)/, ''))), failsFor(good.replace(/PROMPT 6 - [\s\S]*?(?=PHOTO GAPS)/, '')), '');
  chk('check: a missing area', /missing Dagenham/.test(failsFor(good.replace(/Dagenham, /g, ''))), '', '');
  chk('check: a rule dropped', /Do not mention seasons/.test(failsFor(good.replace(/Do not mention seasons, weather, holidays or dates\. /g, ''))), '', '');
  chk('check: a fact dropped', /missing the fact "Gas Safe registered"/.test(failsFor(good.replace(/Gas Safe registered, /g, ''))), '', '');
  chk('check: too few angles', /has 3 angles/.test(failsFor(good.replace(/- What to expect when booking\n/g, ''))), '', '');
  chk('check: a season', /mentions "winter"/.test(failsFor(good.replace('- How the job is done', '- Getting ready for winter'))), '', '');
  chk('check: an em dash', /em or en dash/.test(failsFor(good.replace('- How the job is done', '- How the job is done — step by step'))), '', '');
  chk('check: the wrong CTA sentence', /CTA sentence/.test(failsFor(good.replace(/invite them to give us a call/g, 'ask them to visit us'))), '', '');
  const noFacts = buildIntake({ I: { ...plumberI, proofPoints: [], accreditations: 'none', validatorCtx: { cv: { ...plumberI.validatorCtx.cv, years_trading: '' } } }, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 5 } });
  const dN = decide(noFacts);
  const inventions = [['£80', 'a price'], ['a 10 year guarantee', 'a guarantee'], ['same day callouts', 'same day work'], ['Gas Safe engineers', 'an accreditation'], ['24/7 cover', '24/7 cover'], ['free quotes', 'something free'], ['fully insured', 'insurance']];
  for (const [phrase, what] of inventions) {
    const f = G.validateSheet(G.parseSheet(goodSheet(noFacts, dN).replace('- How the job is done', `- ${phrase}`)), noFacts, dN).fails.map(x => x.message).join(' | ');
    chk(`check: an invented claim is blocked (${phrase})`, f.includes(`claims ${what}`), f, what);
  }
  chk('check: a claim that IS in the facts passes', !failsFor(good.replace('- How the job is done', '- Same day callouts and why a Gas Safe engineer matters')), failsFor(good.replace('- How the job is done', '- Same day callouts and why a Gas Safe engineer matters')), '');
  const avoiding = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', answers: { words_to_avoid: 'cheap' }, hand: plumberHand });
  chk('check: the client\'s words to avoid', G.validateSheet(G.parseSheet(goodSheet(avoiding, P).replace('- How the job is done', '- Why cheap work costs more')), avoiding, P).fails.some(f => /"cheap"/.test(f.message)), '', '');
  chk('flag, not a fail: a weather word', (() => { const v = G.validateSheet(G.parseSheet(good.replace('- How the job is done', '- After a storm')), plumber, P); return v.ok && v.flags.some(f => /storm/.test(f.message)); })(), '', '');

  const fewIntake = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: twoServices });
  const fewRec = await G.runAutopost({ intake: fewIntake, callModel: canned(goodSheet(fewIntake, few)) });
  chk('too few prompts: the warning heads the sheet and the files, before settings', fewRec.sheet.indexOf("WARNING: Too few prompts. Don't start autopost") > 0 && fewRec.sheet.indexOf('WARNING:') < fewRec.sheet.indexOf('SETTINGS') && JSON.parse(G.filesFor(fewRec)['validation.json']).too_few.unlock.length === few.tooFew.unlock.length, fewRec.sheet.slice(0, 200), '');
  chk('enough prompts: no warning in the sheet', !S.includes('WARNING:'), '', '');
  const freeRec = await G.runAutopost({ intake: free, callModel: canned(goodSheet(free, freeD)) });
  chk('the free quote offer passes the checks and reaches the sheet', !freeRec.failure && freeRec.sheet.includes('Free, no-obligation quote'), JSON.stringify(freeRec.failure), '');
  const trees = buildIntake({ I: eI, trade: 'Landscapers/Gardeners', hand: { counts: {}, brand: 4 } });
  const treesD = decide(trees);
  const msg = G.buildMessage(trees, treesD);
  chk('the message tells the model the pages behind a short name', /Trees \(Tree cabling and bracing, Tree stump removal/.test(msg), msg.slice(0, 300), '');
  chk('other services may name a group by its pages', (() => { const t = goodSheet(trees, treesD).replace(/Trees, /g, 'Tree stump removal, '); return !G.validateSheet(G.parseSheet(t), trees, treesD).fails.some(f => /does not list "Trees"/.test(f.message)); })(), '', '');

  // Retry and failure
  const calls = [];
  rec = await G.runAutopost({ intake: plumber, callModel: async a => { calls.push(a); return { text: calls.length === 1 ? 'nonsense' : good, usage: {} }; } });
  chk('a failing reply runs once more, with its failures in the message', !rec.failure && rec.attempts === 2 && /FAILED THESE CHECKS/.test(calls[1].message) && /has 0 prompts/.test(calls[1].message), calls.length, 2);
  chk('the message carries the intake and decisions', /CTA sentence for the end of every prompt: invite them to give us a call/.test(calls[0].message) && /PROMPT 3 - Other services .*Bathroom fitting; Drain unblocking.*GBP Posts \/ Brand/.test(calls[0].message), calls[0].message.slice(0, 300), '');
  const goodRec = rec;
  rec = await G.runAutopost({ intake: plumber, previous: goodRec, callModel: canned('still nonsense') });
  chk('failing twice keeps the last good config and says so', rec.failure && rec.sheet === goodRec.sheet && /last good config is kept/.test(rec.failure.error), rec.failure && rec.failure.error, '');
  rec = await G.runAutopost({ intake: plumber, callModel: canned('still nonsense') });
  chk('failing with nothing before it has no sheet', rec.failure && !rec.sheet && Object.keys(G.filesFor(rec)).length === 0, '', '');

  // ── Routes on pg-mem ──
  const db = newDb();
  db.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  db.public.none(`CREATE TABLE clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, trade text);
    CREATE TABLE client_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid, asset_type text, filename text, content text, metadata jsonb, uploaded_at timestamptz DEFAULT now());`);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Hartley Plumbing', 'Plumbing & Heating') RETURNING id`);
  const { rows: [noMap] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('No Map', 'Roofers') RETURNING id`);
  const app = express();
  app.use(express.json());
  let model = canned(good), modelCalls = 0;
  const quiet = { log() {}, error() {} };
  mountLeadSnapApi(app, { pool, log: quiet, callModel: (...a) => { modelCalls++; return model(...a); }, loadInputs: async id => { if (id === noMap.id) throw Object.assign(new Error('GBP output needs a v3 page map'), { status: 400 }); return { I: plumberI, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' } }; } });
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const req = (method, p, body) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port: srv.address().port, method, path: p, agent: false, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => resolve({ status: res.statusCode, text: t, json: () => JSON.parse(t) })); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
  const api = `/api/clients/${c.id}/lead-snap`;
  let v = (await req('GET', api)).json();
  chk('GET: no config, photo counts asked for, nothing spent', v.record === null && v.intake.missing.some(m => /Photo counts/.test(m)) && modelCalls === 0, JSON.stringify(v.intake.missing), '');
  chk('generate before the counts are typed is refused, nothing spent', (await req('POST', `${api}/generate`)).status === 400 && modelCalls === 0, modelCalls, 0);
  chk('a bad count is refused', (await req('PUT', `${api}/intake`, { counts: { boilers: -1 } })).status === 400, '', 400);
  chk('a bad booking URL is refused', (await req('PUT', `${api}/intake`, { booking_url: 'nope' })).status === 400, '', 400);
  v = (await req('PUT', `${api}/intake`, { counts: plumberCounts, brand: '5', offer: 'Free boiler quote' })).json();
  chk('PUT saves the typed fields; the plan follows, still nothing spent', v.intake.ok && v.plan.prompts.length === 6 && v.hand.counts.boilers === 6 && modelCalls === 0, JSON.stringify(v.plan && v.plan.prompts.length), 6);
  v = (await req('POST', `${api}/generate`)).json();
  chk('POST generate saves the config and the file links', v.record.output.prompts.length === 6 && v.files['autopost-config.txt'] === '/clients/hartley-plumbing/lead-snap/autopost-config.txt', JSON.stringify(v.files), '');
  const f = await req('GET', v.files['autopost-config.txt']);
  chk('autopost-config.txt is served', f.status === 200 && f.text.startsWith('LEAD SNAP AUTOPOST CONFIG - Hartley Plumbing & Heating'), f.status, 200);
  chk('validation.json is served', (await req('GET', v.files['validation.json'])).status === 200, '', 200);
  chk('an unknown file is a 404', (await req('GET', '/clients/hartley-plumbing/lead-snap/nope.txt')).status === 404, '', 404);
  chk('no config for that slug is a 404', (await req('GET', '/clients/no-map/lead-snap/autopost-config.txt')).status === 404, '', 404);
  const before = (await pool.query(`SELECT count(*)::int AS n FROM client_assets WHERE asset_type='leadsnap_autopost'`)).rows[0].n;
  v = (await req('PUT', `${api}/intake`, { counts: { ...plumberCounts, 'bathroom-fitting': 4 }, brand: 5 })).json();
  chk('new photos change the plan before generating again: bathrooms earn a prompt', v.plan.prompts.some(p => p.label === 'Bathroom fitting'), JSON.stringify(v.plan.prompts.map(p => p.label)), '');
  model = async () => ({ text: goodSheet(buildIntake({ I: plumberI, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' }, hand: { counts: { ...plumberCounts, 'bathroom-fitting': 4 }, brand: 5 } }), v.plan), usage: {} });
  v = (await req('POST', `${api}/generate`)).json();
  const after = (await pool.query(`SELECT count(*)::int AS n FROM client_assets WHERE asset_type='leadsnap_autopost'`)).rows[0].n;
  chk('Generate again replaces the config in place', after === before && v.record.sheet.includes('PROMPT 3 - Bathroom fitting'), `${before} ${after}`, '');
  model = canned('nonsense');
  v = (await req('POST', `${api}/generate`)).json();
  chk('a failed run over the route keeps the good config and shows the failure', v.record.failure && v.record.sheet && v.files['autopost-config.txt'], JSON.stringify(v.record.failure && v.record.failure.error), '');
  v = (await req('GET', `/api/clients/${noMap.id}/lead-snap`)).json();
  chk('a client with no v3 page map: the error is shown, not a crash', v.intake === null && /v3 page map/.test(v.error), JSON.stringify(v), '');
  srv.close();

  // ── The tab: placed after GBP ──
  const shell = fs.readFileSync(path.join(root, 'public/app/screens/client.js'), 'utf8');
  chk('the tab sits right after GBP', /\['gbp', 'GBP'\], \['lead-snap', 'Lead Snap'\]/.test(shell) && /'lead-snap': \(\) => import\('\.\.\/tabs\/leadsnap\.js'\)/.test(shell), '', '');

  console.log(`\n${pass} passed, ${fail} failed\n`);
  if (fail) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
