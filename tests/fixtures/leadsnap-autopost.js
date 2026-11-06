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
const { buildIntake, groupServices, lockedFrom, labelChanges, carryCounts, shortName: S_ } = require(path.join(root, 'leadsnap/autopost/intake.js'));
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
const kinds = D => Object.fromEntries(['service', 'other', 'trust', 'offer', 'tips'].map(k => [k, D.prompts.filter(p => p.kind === k).length]));
chk('plumber: 20 prompts, spread as the spec says', P.prompts.length === 20 && JSON.stringify(kinds(P)) === JSON.stringify({ service: 12, other: 2, trust: 2, offer: 1, tips: 3 }), JSON.stringify(kinds(P)), '');
chk('plumber: few services fill the 20 with more angles each, rather than running short', P.prompts.filter(p => p.folder.endsWith('/ Boilers') && p.kind === 'service').length === 6 && P.prompts.filter(p => p.folder.endsWith('/ Leak repair')).length === 6, row(P), '');
chk('every prompt has one angle, and no service repeats one', P.prompts.every(p => p.angle) && new Set(P.prompts.map(p => p.service + '|' + p.angle)).size === 20, row(P), '');
chk('a grouped label: its prompts take turns over the group', P.prompts.filter(p => p.folder.endsWith('/ Boilers') && p.kind === 'service').map(p => p.service).join() === 'Boiler repair,Boiler installation,Boiler repair,Boiler installation,Boiler repair,Boiler installation', P.prompts.filter(p => p.kind === 'service').map(p => p.service).join(), '');
chk('a label with 6 services and 3 prompts covers 3 different ones', (() => { const tr = decide(buildIntake({ I: inputs({ name: 'X', primary: 'Tree Surgeon', town: 'Bath', areas: [], services: ['Tree planting', 'Tree felling', 'Tree pruning', 'Tree bracing', 'Tree removal', 'Tree grinding'].map(n => [n]) }), trade: 'Tree Surgeons', hand: { counts: { trees: 9 } } })); return new Set(tr.prompts.filter(p => p.kind === 'service').slice(0, 3).map(p => p.service)).size === 3; })(), '', '');
chk('prompts sharing a folder sit together, numbered in order', (() => { const seen = []; for (const p of P.prompts) if (seen[seen.length - 1] !== p.folder) seen.push(p.folder); return new Set(seen).size === seen.length && seen.length === 4 && P.prompts.every((p, i) => p.n === i + 1); })(), row(P), '');
chk('the offer uses the best job photos, beside that folder', P.prompts.find(p => p.kind === 'offer').folder === 'GBP Photos \u2013 Posts / Boilers', '', '');
chk('tips are one each, on all job photos', P.prompts.filter(p => p.kind === 'tips').every(p => p.folder === 'All job photos' && p.photos === 12), '', '');
chk('trust angles stand on the facts it has', P.prompts.filter(p => p.kind === 'trust').map(p => p.angle).join('|') === 'experience and how long the business has been local|the standards the business holds to, from the facts', P.prompts.filter(p => p.kind === 'trust').map(p => p.angle).join('|'), '');
chk('no facts: trust does not lean on experience or accreditations', decide(buildIntake({ I: { ...plumberI, proofPoints: [], accreditations: 'none', validatorCtx: { cv: { company_name: 'X' } } }, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 5 } })).prompts.filter(p => p.kind === 'trust').map(p => p.angle).join('|') === 'how we work with customers|why choose a local business', '', '');
chk('plumber: each other services prompt covers one service under 3 photos', P.prompts.filter(p => p.kind === 'other').map(p => p.service).join() === 'Bathroom fitting,Drain unblocking', row(P), '');
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
chk('no brand photos: trust uses the best job photos', NB.prompts.find(p => p.kind === 'trust').folder === 'GBP Photos – Posts / Boilers', NB.prompts.find(p => p.kind === 'trust').folder, 'GBP Photos – Posts / Boilers');
chk('no brand photos: services under 3 get no post and stay on the gap list', NB.gaps.length === 2 && !NB.prompts.some(p => /bathroom|drain/i.test(p.label)), JSON.stringify(NB.gaps), '');
chk('no brand photos: says why, still fills the 20, and warns on 3 folders', NB.notes.some(n => /no post at all/.test(n)) && NB.prompts.length === 20 && NB.folders === 3 && NB.tooFew, JSON.stringify([NB.notes, NB.folders]), '');
chk('no offer typed: no offer prompt, never invented', !NB.prompts.some(p => p.kind === 'offer'), row(NB), '');
const brandOfTwo = decide(buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 2 } }));
chk('2 brand photos is under the threshold: treated as none', !brandOfTwo.prompts.some(p => p.kind === 'other') && brandOfTwo.prompts.find(p => p.kind === 'trust').folder === 'GBP Photos – Posts / Boilers', row(brandOfTwo), '');
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
chk('Edens Edge: never more than 20 prompts, with every service holding photos', eD.prompts.length === 20, eD.prompts.length, 20);
chk('Edens Edge: at the cap, trust, tips, the offer and other services keep their places', JSON.stringify(kinds(eD)) === JSON.stringify({ service: 12, other: 2, trust: 2, offer: 1, tips: 3 }), JSON.stringify(kinds(eD)), '');
chk('Edens Edge: services with photos but no slot fold into other services, are not gaps, and the rest are named', eD.prompts.filter(p => p.kind === 'other').length === 2 && eD.gaps.length === 0 && eD.notes.some(n => /no post until/.test(n)), JSON.stringify(eD.notes), '');
chk('many services: every folder does not get the same angle', new Set(eD.prompts.filter(p => p.kind === 'service').map(p => p.angle)).size === 8, eD.prompts.filter(p => p.kind === 'service').map(p => p.angle).join('|'), '8 angles');
const eNoFree = { ...eI, validatorCtx: { ...eI.validatorCtx, cv: { ...eI.validatorCtx.cv, free_quotes: 'no' } } };
const eFour = decide(buildIntake({ I: eNoFree, trade: 'Landscapers/Gardeners', hand: { counts: eKeys, brand: 6 } }));
chk('Edens Edge: no offer gives its place to one more service prompt', eFour.prompts.filter(p => p.kind === 'service').length === 13 && eFour.prompts.length === 20, row(eFour), '');
chk('a client who runs out of angles says so rather than repeating one', (() => { const one = decide(buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: [], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: { 'roof-repair': 5 } } })); return one.prompts.length === 13 && one.notes.some(n => /13 of 20 prompts/.test(n)); })(), '', '');
chk('Edens Edge: areas are the main town and 7, and a council area is left out and explained', eIntake.areas.length === 8 && eIntake.areas[0] === 'Southampton' && /nearest first/.test(eIntake.areasWhy), eIntake.areas, '');
const withCouncil = buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: ['New Forest District', 'Brockenhurst'], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: {} } });
chk('a council area is never offered as a place, and is explained', !withCouncil.areas.includes('New Forest District') && /New Forest District/.test(withCouncil.areasWhy), withCouncil.areasWhy, '');
chk('too few areas warns', withCouncil.warnings.some(w => /Only 1 nearby areas/.test(w)), withCouncil.warnings, '');
const noPhone = buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: [], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: {} } });
chk('Call Now with no phone warns; no USPs warns', noPhone.warnings.some(w => /no phone is saved/.test(w)) && noPhone.warnings.includes('Few USPs. Posts will repeat the same facts; confirm more with the client.'), noPhone.warnings, '');
chk('3 USPs warns, word for word; 4 does not', buildIntake({ I: { ...plumberI, proofPoints: ['same day visits available'] }, trade: 'Plumbing & Heating', hand: plumberHand }).warnings.includes('Few USPs. Posts will repeat the same facts; confirm more with the client.') && !plumber.warnings.some(w => /Few USPs/.test(w)), plumber.warnings, '');
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
chk('2 folders: the warning, word for word', few.folders === 2 && few.tooFew && few.tooFew.message === "Too few prompts. Don't start autopost until the client sends more photos.", JSON.stringify(few.tooFew), '');
chk('the warning goes by folders, not prompts: 13 prompts on 2 folders still warns', few.prompts.length === 13 && few.tooFew, few.prompts.length, 13);
chk('it lists which photos unlock more, highest value first, with what each needs', few.tooFew.unlock[0] === 'Leak repair: 2 more photos gives it a folder and prompts of its own (GBP Photos \u2013 Posts / Leak repair)' && few.tooFew.unlock[1].startsWith('Bathroom fitting: 3 more photos') && few.tooFew.unlock[2].startsWith('Drain unblocking: 1 more photo gives'), few.tooFew.unlock.join(' | '), '');
chk('it lists the brand photos that add a folder', few.tooFew.unlock.some(u => /^Brand .*2 more photos adds a folder/.test(u)), few.tooFew.unlock.join(' | '), '');
chk('exactly 3 folders warns', decide(noBrand).folders === 3 && decide(noBrand).tooFew, decide(noBrand).folders, 3);
chk('4 folders, counting all job photos as one: no warning', P.folders === 4 && !P.tooFew, JSON.stringify(P.tooFew), 'null');
chk('no photos at all: none yet is not a folder', decide(none).folders === 0 && decide(none).tooFew, decide(none).folders, 0);
const manyUnder = decide(buildIntake({ I: eI, trade: 'Landscapers/Gardeners', hand: { counts: {}, brand: 0 } }));
chk('it does not list every service: 4 at most, then brand', manyUnder.tooFew.unlock.filter(u => /prompts of its own/.test(u)).length === 4 && /^Brand/.test(manyUnder.tooFew.unlock[4]), manyUnder.tooFew.unlock.join(' | '), '');
const oneService = decide(buildIntake({ I: inputs({ name: 'X', primary: 'Roofer', town: 'Lymington', areas: [], services: [['Roof repair']] }), trade: 'Roofers', hand: { counts: { 'roof-repair': 5 }, brand: 5 } }));
chk('a one service client with photos and brand: says more photos will not add a folder', oneService.folders === 3 && /will not add a folder/.test(oneService.tooFew.unlock[0]), oneService.tooFew && oneService.tooFew.unlock[0], '');
const renamed = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: { counts: { leaks: 4 } } });
chk('counts saved under an old name warn instead of silently reading 0', renamed.warnings.some(w => /no longer match a service \(leaks\)/.test(w)), renamed.warnings, '');

// ── The folder path ──
chk('the path is the one the photo sort skill creates, en dash included', P.prompts[0].folder === 'GBP Photos \u2013 Posts / Boilers' && P.prompts.find(p => p.kind === 'trust').folder === 'GBP Photos \u2013 Posts / Brand', P.prompts[0].folder, '');
chk('all job photos and none yet are not folder paths', P.prompts[19].folder === 'All job photos' && decide(none).prompts[0].folder === 'None yet', P.prompts[19].folder, '');
chk('the format the model is given names the same path, and no old one', G.loadSystem().includes('[GBP Photos \u2013 Posts / folder]') && !G.loadSystem().includes('GBP Posts /'), '', '');

// ── The lock ──
const grp = (label, services, photos = 0) => ({ key: label.toLowerCase().replace(/ /g, '-'), label, folder: label, services, volume: 0, wanted: false, photos });
const fresh = names => groupServices(names.map(s => ({ service: s })));
const oldGroups = [grp('Leak repair', ['Leak repair'], 4), grp('Boilers', ['Boiler repair', 'Boiler installation'], 6), grp('Drain unblocking', ['Drain unblocking'], 2)];
chk('no page map change: nothing to report', labelChanges(oldGroups, fresh(['Leak repair', 'Boiler repair', 'Boiler installation', 'Drain unblocking'])).changed === false, '', '');
const added = labelChanges(oldGroups, fresh(['Leak repair', 'Leak detection', 'Boiler repair', 'Boiler installation', 'Drain unblocking']));
chk('a second leak page renames the folder: the case that started this', added.renames.length === 1 && added.renames[0].from === 'Leak repair' && added.renames[0].to === 'Leaks' && added.addedPages.join() === 'Leak detection', JSON.stringify(added), '');
const boilerAdded = labelChanges(oldGroups, fresh(['Leak repair', 'Boiler repair', 'Boiler installation', 'Boiler servicing', 'Drain unblocking']));
chk('a page joining an existing group renames nothing', !boilerAdded.renames.length && boilerAdded.changed && boilerAdded.addedPages.join() === 'Boiler servicing', JSON.stringify(boilerAdded), '');
const brandNew = labelChanges(oldGroups, fresh(['Leak repair', 'Boiler repair', 'Boiler installation', 'Drain unblocking', 'Bathroom fitting']));
chk('a new service is an addition, not a rename', !brandNew.renames.length && brandNew.added.join() === 'Bathroom fitting', JSON.stringify(brandNew), '');
const gone = labelChanges(oldGroups, fresh(['Leak repair', 'Boiler repair', 'Boiler installation']));
chk('a service dropped from the page map is a removal, not a rename', !gone.renames.length && gone.removed.join() === 'Drain unblocking', JSON.stringify(gone), '');
const oldLabel = [{ ...grp('Boiler repair and installation', ['Boiler repair', 'Boiler installation']), key: 'boilers', folder: 'Boilers' }];
chk('a label changing with the same folder is not a rename: no photos move', !labelChanges(oldLabel, fresh(['Boiler repair', 'Boiler installation'])).renames.length, '', '');
const merged = fresh(['Leak repair', 'Leak detection']);
const carried = carryCounts({ counts: { 'leak-repair': 4, 'old-thing': 9 }, brand: 3, offer: 'x' }, [grp('Leak repair', ['Leak repair'], 4), grp('Old thing', ['Old thing'], 9)], merged);
chk('counts follow their pages to the new name, and the other fields stay', carried.counts.leaks === 4 && carried.brand === 3 && carried.offer === 'x' && !('leak-repair' in carried.counts) && !('old-thing' in carried.counts), JSON.stringify(carried), '');
const mergedCounts = carryCounts({ counts: { a: 2, b: 3 } }, [{ ...grp('A', ['Leak repair']), key: 'a' }, { ...grp('B', ['Leak detection']), key: 'b' }], merged);
chk('groups that merge add their counts together', mergedCounts.counts.leaks === 5, JSON.stringify(mergedCounts), '');
const keepsLocked = buildIntake({ I: { ...plumberI, locked: [...plumberI.locked, { service: 'Leak detection', copyPriority: 0 }] }, trade: 'Plumbing & Heating', hand: plumberHand, locked: plumber.groups });
chk('locked: the tab keeps the saved names and counts when the page map moves', keepsLocked.groups.map(g => g.label).join('|') === 'Boilers|Leak repair|Bathroom fitting|Drain unblocking' && keepsLocked.groups[1].photos === 4 && keepsLocked.labelsLocked, keepsLocked.groups.map(g => g.label).join('|'), '');
chk('locked: it warns what changed and what Generate again would rename', keepsLocked.warnings.some(w => /new pages: Leak detection/.test(w) && /stay as they are until you press Generate again/.test(w)) && keepsLocked.warnings.some(w => /would rename a folder: Leak repair to Leaks/.test(w)), keepsLocked.warnings, '');
chk('unchanged page map: locked, and nothing to warn about', (() => { const k = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', hand: plumberHand, locked: plumber.groups }); return k.labelsLocked && !k.pending.changed && !k.warnings.some(w => /page map has changed|rename/.test(w)); })(), '', '');
chk('no saved config, or a failed first run: nothing is locked', lockedFrom(null) === null && lockedFrom({ failure: {} }) === null && lockedFrom({ sheet: 'x', intake: { groups: [] } }) === null, '', '');

// ── The canned model ──
const ANGLE = 'Build the whole post around this angle:';
function goodSheet(intake, D) {
  const L = [`LEAD SNAP AUTOPOST CONFIG - ${intake.business}`, '', 'SETTINGS', 'Frequency: Custom - twice per week', `Call to action: ${intake.cta.line}`, ''];
  for (const p of D.prompts) {
    L.push(`PROMPT ${p.n} - ${p.label}`, `Tone: ${intake.tone}`, `Images: Choose specific images from GBP or upload -> select from folder: ${p.folder}`, 'Prompt:');
    const about = p.service || (p.kind === 'offer' ? intake.offer : p.label);

    L.push(`Write a Google Business Profile post for ${intake.business} (write the name exactly like that), a ${intake.niche} based in ${intake.mainTown}, about ${about}.`, '', `Facts you may use (no more than two, chosen to fit the angle): ${intake.usps.join(', ')}. Do not use any other facts.`, '', `Areas: ${intake.areas.join(', ')}. Pick ONE area from the list. Use it once or twice and mention no other towns.`, '', `Build the whole post around this ${p.kind === 'tips' ? 'tip' : 'angle'}: ${p.angle}.`, '', `Write 150-250 words in plain UK English, no headings, no hashtags, no emoji. Don't start with "If". Use the service name naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not mention seasons, weather, holidays or dates. No generic filler. Tone: ${intake.tone}. End with one sentence that leads into the button: ${intake.cta.sentence}.`, '');
  }
  L.push('PHOTO GAPS', ...D.gaps.map(g => `- ${g.label}: ${g.photos} photos. Ask the client for 3-4 photos of finished ${g.label.toLowerCase()} from the customer's side.`), '', 'VA CHECKLIST', '[ ] Settings set');
  return L.join('\n');
}
const canned = text => async () => ({ text, usage: { input_tokens: 10, output_tokens: 20 } });

(async () => {
  // ── Generate, the checks, the sheet ──
  let rec = await G.runAutopost({ intake: plumber, callModel: canned(goodSheet(plumber, P)) });
  chk('a good reply passes first time', !rec.failure && rec.attempts === 1 && rec.output.prompts.length === 20, JSON.stringify(rec.failure), '');
  const S = rec.sheet;
  const order = ['LEAD SNAP AUTOPOST CONFIG - Hartley Plumbing & Heating', 'SETTINGS', 'Frequency: Custom - twice per week', 'Call to action: Call Now (uses GBP phone number)', 'PROMPT 1 - Boilers: boiler repair, the problem customers notice', 'Tone: friendly, plain-spoken', 'Images: Choose specific images from GBP or upload -> select from folder: GBP Photos – Posts / Boilers', 'Other services: bathroom fitting', 'PROMPT 18 - Evergreen tip 1', 'PHOTO GAPS', '- Bathroom fitting: 0 photos. Ask the client for', 'VA CHECKLIST', '[ ] Saved and started; first post checked on All Posts page'];
  chk('the sheet follows the spec\'s format and Lead Snap\'s screen order', order.every((s, i) => S.includes(s) && (i === 0 || S.indexOf(s) > S.indexOf(order[i - 1]))), S.slice(0, 400), '');
  chk('settings, labels and folders are code\'s even when the model writes others', (await G.runAutopost({ intake: plumber, callModel: canned(goodSheet(plumber, P).replace(/PROMPT 1 - [^\n]*/, 'PROMPT 1 - Something else').replace('Frequency: Custom - twice per week', 'Frequency: Daily').replace('folder: GBP Photos – Posts / Boilers', 'folder: Wrong')) })).sheet.includes('PROMPT 1 - Boilers: boiler repair, the problem customers notice\nTone: friendly, plain-spoken\nImages: Choose specific images from GBP or upload -> select from folder: GBP Photos – Posts / Boilers'), '', '');
  chk('a fenced reply still parses', !(await G.runAutopost({ intake: plumber, callModel: canned('```text\n' + goodSheet(plumber, P) + '\n```') })).failure, '', '');
  chk('a gap with no line from the model still gets one', (await G.runAutopost({ intake: plumber, callModel: canned(goodSheet(plumber, P).replace(/^- Drain unblocking.*$/m, '')) })).output.gaps[1].line === 'Drain unblocking: 2 photos. Ask the client for 3-4 photos of finished drain unblocking jobs.', '', '');

  const failsFor = text => G.validateSheet(G.parseSheet(text), plumber, P).fails.map(f => f.message).join(' | ');
  const good = goodSheet(plumber, P);
  chk('check: a missing prompt', /has 19 prompts/.test(failsFor(good.replace(/PROMPT 20 - [\s\S]*?(?=PHOTO GAPS)/, ''))), failsFor(good.replace(/PROMPT 20 - [\s\S]*?(?=PHOTO GAPS)/, '')), '');
  chk('check: a missing area', /missing Dagenham/.test(failsFor(good.replace(/Dagenham, /g, ''))), '', '');
  chk('check: a rule dropped', /Do not mention seasons/.test(failsFor(good.replace(/Do not mention seasons, weather, holidays or dates\. /g, ''))), '', '');
  chk('check: a fact dropped', /missing the fact "Gas Safe registered"/.test(failsFor(good.replace(/Gas Safe registered, /g, ''))), '', '');
  chk('check: an angle list is refused', /has a list/.test(failsFor(good.replace(ANGLE, ANGLE + '\n- One angle\n- Another angle'))), '', '');
  chk('check: asking the AI to choose is refused', /asks the AI to choose/.test(failsFor(good.replace(ANGLE, 'Choose ONE of these. ' + ANGLE))), '', '');
  chk('check: two prompts for one service with the same angle', (() => { const lines = good.split('\n'); const angleAt = lines.map((l, i) => (l.startsWith(ANGLE) ? i : -1)).filter(i => i >= 0); const leak = angleAt[8]; lines[angleAt[7]] = lines[leak]; return /has the same angle as prompt/.test(failsFor(lines.join('\n'))); })(), '', '');
  chk('check: a season', /mentions "winter"/.test(failsFor(good.replace(ANGLE, ANGLE + ' Getting ready for winter'))), '', '');
  chk('check: an em dash', /em or en dash/.test(failsFor(good.replace(ANGLE, ANGLE + ' How the job is done — step by step'))), '', '');
  chk('check: the wrong CTA sentence', /CTA sentence/.test(failsFor(good.replace(/invite them to give us a call/g, 'ask them to visit us'))), '', '');
  const noFacts = buildIntake({ I: { ...plumberI, proofPoints: [], accreditations: 'none', validatorCtx: { cv: { ...plumberI.validatorCtx.cv, years_trading: '' } } }, trade: 'Plumbing & Heating', hand: { counts: plumberCounts, brand: 5 } });
  const dN = decide(noFacts);
  const inventions = [['£80', 'a price'], ['a 10 year guarantee', 'a guarantee'], ['same day callouts', 'same day work'], ['Gas Safe engineers', 'an accreditation'], ['24/7 cover', '24/7 cover'], ['free quotes', 'something free'], ['fully insured', 'insurance']];
  for (const [phrase, what] of inventions) {
    const f = G.validateSheet(G.parseSheet(goodSheet(noFacts, dN).replace(ANGLE, `${ANGLE} ${phrase}`)), noFacts, dN).fails.map(x => x.message).join(' | ');
    chk(`check: an invented claim is blocked (${phrase})`, f.includes(`claims ${what}`), f, what);
  }
  chk('check: a claim that IS in the facts passes', !failsFor(good.replace(ANGLE, ANGLE + ' Same day callouts and why a Gas Safe engineer matters')), failsFor(good.replace(ANGLE, ANGLE + ' Same day callouts and why a Gas Safe engineer matters')), '');
  const avoiding = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', answers: { words_to_avoid: 'cheap' }, hand: plumberHand });
  chk('check: the client\'s words to avoid', G.validateSheet(G.parseSheet(goodSheet(avoiding, P).replace(ANGLE, ANGLE + ' Why cheap work costs more')), avoiding, P).fails.some(f => /"cheap"/.test(f.message)), '', '');
  chk('flag, not a fail: a weather word', (() => { const v = G.validateSheet(G.parseSheet(good.replace(ANGLE, ANGLE + ' After a storm')), plumber, P); return v.ok && v.flags.some(f => /storm/.test(f.message)); })(), '', '');

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

  // ── The new prompt rules (Brandon, 6 Nov) ──
  chk('check: the name without its instruction', /write the name exactly like that/.test(failsFor(good.replace(/ \(write the name exactly like that\)/g, ''))), '', '');
  chk('check: a prompt must name its one service', /does not name its service, Boiler repair/.test(failsFor(good.replace(/about Boiler repair\./, 'about boilers.'))), '', '');


  chk('check: facts without "no more than two"', /no more than two/.test(failsFor(good.replace(/ \(no more than two, chosen to fit the angle\)/g, ''))), '', '');
  chk('check: "Choose ONE angle" is the old rule', /Build the whole post around this angle/.test(failsFor(good.replace(ANGLE, 'Choose ONE angle and build the whole post around it:'))), '', '');
  chk('check: the local area angle is dropped', /drop the local area angle/.test(failsFor(good.replace(ANGLE, ANGLE + ' Serving homes in the chosen area'))), '', '');
  chk('check: the old 150-300 words', /150-250 words/.test(failsFor(good.replace(/150-250 words/, '150-300 words'))), '', '');
  chk('check: no "Don\'t start with If"', /start with/.test(failsFor(good.replace(/Don't start with "If"\. /, ''))), '', '');
  chk('check: the old area rule', /mention no other towns/.test(failsFor(good.replace(/Use it once or twice and mention no other towns\./, 'Mention it naturally once.'))), '', '');
  { const listed = good.replace(ANGLE, ANGLE + ' We do Leak repair, Bathroom fitting and Drain unblocking.'); chk('check: a list of other services', /Prompt 1: lists other services/.test(failsFor(listed)), failsFor(listed), ''); }
  const longP = G.validateSheet(G.parseSheet(good.replace(ANGLE, ANGLE + ' ' + 'x'.repeat(1400))), plumber, P);
  chk('over 1,500 characters is a flag to check, not a failure', longP.ok && longP.flags.some(f => /aim for under 1,500/.test(f.message)), JSON.stringify(longP.flags), '');

  // ── Preview posts ──
  const Pv = require(path.join(root, 'leadsnap/autopost/preview.js'));
  const pvRec = await G.runAutopost({ intake: plumber, callModel: canned(good) });
  const boilerP = pvRec.output.prompts[0], otherP = pvRec.output.prompts.find(p => p.kind === 'other');
  const words = n => Array.from({ length: n }, (_, i) => `word${'abcdefghij'[i % 10]}`).join(' ');
  const clean = `Hartley Plumbing & Heating looks after homes in Hornchurch. A boiler repair starts with a proper look at what went wrong. ${words(170)} Give us a call.`;
  const levelOf = (text, id, p = boilerP) => Pv.checkSample(text, p, pvRec.intake).checks.find(c => c.id === id);
  chk('a clean sample passes all eight checks', Pv.checkSample(clean, boilerP, pvRec.intake).warnings === 0 && Pv.checkSample(clean, boilerP, pvRec.intake).checks.length === 8, JSON.stringify(Pv.checkSample(clean, boilerP, pvRec.intake).checks.filter(c => c.level === 'warn')), '');
  chk('preview: a short post does not warn: only a long overrun does', levelOf('Hartley Plumbing & Heating in Hornchurch.', 'words').level === 'pass', '', 'pass');
  chk('preview: 251 to 300 words pass, over 300 warns', levelOf(clean + ' ' + words(60), 'words').level === 'pass' && levelOf(clean + ' ' + words(130), 'words').level === 'warn', Pv.checkSample(clean + ' ' + words(130), boilerP, pvRec.intake).words, '');
  const edens = { ...pvRec.intake, business: 'Edens Edge Landscaping' };
  chk('preview: the name Lead Snap really wrote is caught', Pv.checkName('Edens edge landscaping LTD did this.', 'Edens Edge Landscaping').level === 'warn', '', 'warn');
  chk('preview: the right name with LTD after it is caught', Pv.checkName('Edens Edge Landscaping LTD did this.', 'Edens Edge Landscaping').level === 'warn', '', 'warn');
  chk('preview: a shortened name is caught', Pv.checkName('Edens Edge Landscaping is local. Call Edens Edge today.', 'Edens Edge Landscaping').level === 'warn', '', 'warn');
  chk('preview: no name is caught', Pv.checkName('A local firm.', 'Edens Edge Landscaping').level === 'warn', '', 'warn');
  chk('preview: the exact name passes', Pv.checkName('Edens Edge Landscaping is local. Edens Edge Landscaping can help.', 'Edens Edge Landscaping').level === 'pass', '', 'pass');
  chk('preview: the main town and one area pass, a third town warns', levelOf(clean + ' Also Romford.', 'town').level === 'pass' && levelOf(clean + ' Also Romford and Dagenham.', 'town').level === 'warn', JSON.stringify(levelOf(clean + ' Also Romford and Dagenham.', 'town')), '');
  chk('preview: no town does not warn', levelOf(clean.replace('Hornchurch', 'the area'), 'town').level === 'pass', '', 'pass');
  chk('preview: a town off the short list still counts', Pv.checkSample(clean + ' Also Romford and Basildon.', boilerP, { ...pvRec.intake, allAreas: [...pvRec.intake.areas, 'Basildon'] }).checks.find(c => c.id === 'town').level === 'warn', '', 'warn');
  chk('preview: a second service of a group warns', levelOf(clean + ' We also do boiler installation.', 'group').level === 'warn', '', 'warn');
  chk('preview: the other services prompt warns on a second service', levelOf(clean.replace('A boiler repair starts', 'Bathroom fitting starts') + ' Drain unblocking too.', 'group', otherP).level === 'warn', '', 'warn');
  chk('preview: one service from other services passes', levelOf(clean.replace('A boiler repair starts', 'Bathroom fitting starts'), 'group', otherP).level === 'pass', '', 'pass');
  chk('preview: three facts warn, two pass', levelOf(clean + ' Gas Safe registered, same day visits available, fixed prices agreed before work starts.', 'facts').level === 'warn' && levelOf(clean + ' Gas Safe registered, with fixed prices agreed before work starts.', 'facts').level === 'pass', JSON.stringify(levelOf(clean + ' Gas Safe registered, with fixed prices agreed before work starts.', 'facts')), '');
  chk('preview: the offer and a free quotes USP count as one fact', Pv.factsUsed('Our free no-obligation quote, a free quote for all.', { usps: ['free quotes'], offer: 'free, no-obligation quote' }).length === 1, '', 1);
  for (const [phrase, what] of [['It costs £80.', 'price'], ['We have 300 happy customers.', 'number'], ['A 10 year guarantee.', 'guarantee']]) chk(`preview: an invented ${what} warns`, Pv.checkSample(clean + ' ' + phrase, boilerP, { ...pvRec.intake, usps: [] }).checks.find(c => c.id === 'claims').level === 'warn', '', 'warn');
  chk('preview: a number in the facts passes', levelOf(clean + ' Over 15 years trading.', 'claims').level === 'pass', JSON.stringify(levelOf(clean + ' Over 15 years trading.', 'claims')), 'pass');
  for (const w of ['this winter', 'in December', 'heavy rain', 'by Christmas', 'in 2027']) chk(`preview: "${w}" warns`, levelOf(clean + ' ' + w, 'dated').level === 'warn', '', 'warn');
  for (const w of ['a blocked drain', 'garden drainage', 'the drains', 'grain', 'we train staff', 'a rainwater butt']) chk(`preview: "${w}" is not the word rain`, levelOf(clean + ' ' + w, 'dated').level === 'pass', levelOf(clean + ' ' + w, 'dated').detail, 'pass');
  chk('preview: a year that is a fact passes', Pv.checkSample(clean + ' Trading since 2015.', boilerP, { ...pvRec.intake, usps: ['trading since 2015'] }).checks.find(c => c.id === 'dated').level === 'pass', '', 'pass');
  chk('preview: starting with If warns, in any case', levelOf('If your boiler stops.', 'if').level === 'warn' && levelOf('"if your boiler stops', 'if').level === 'warn', '', 'warn');
  chk('preview: "Iffy" and If later on pass', levelOf('Iffy boilers. If yours stops.', 'if').level === 'pass', '', 'pass');
  const drainP = pvRec.output.prompts.find(p => p.service === 'Drain unblocking');
  chk('rain: a drainage prompt may say it', levelOf(clean + ' after heavy rain', 'dated', drainP).level === 'pass' && levelOf(clean + ' after the rainfall', 'dated', drainP).level === 'pass', '', 'pass');
  chk('rain: other weather words still warn on a drainage prompt', levelOf(clean + ' after a storm', 'dated', drainP).level === 'warn' && levelOf(clean + ' this winter', 'dated', drainP).level === 'warn', '', 'warn');
  chk('rain: every other prompt still warns', levelOf(clean + ' after heavy rain', 'dated').level === 'warn', '', 'warn');
  const noWithin = await Pv.runPreview({ record: pvRec, callModel: async () => ({ text: clean, usage: {} }) });
  chk('within a prompt: identical samples no longer warn', noWithin.prompts.every(p => !('sameness' in p)) && !('alike' in noWithin.summary), JSON.stringify(Object.keys(noWithin.prompts[0])), '');
  const est = Pv.estimate(pvRec.output.prompts);
  chk('the estimate: 4 samples per prompt, in pence, before anything runs', est.samples === 80 && est.per_prompt === 4 && est.pence >= 25 && est.pence <= 45, JSON.stringify(est), '25 to 45p');
  const pvCalls = [];
  const pv = await Pv.runPreview({ record: pvRec, callModel: async a => { pvCalls.push(a); if (pvCalls.length === 3) throw new Error('overloaded'); return { text: clean, usage: { input_tokens: 500, output_tokens: 450 } }; } });
  chk('run: each prompt goes 4 times, the prompt text alone as the message', pvCalls.length === 80 && pvCalls.filter(c => c.message === boilerP.text).length === 4 && pv.prompts.every(p => p.samples.length === 4), pvCalls.length, 80);
  chk('run: a failed call is one failed sample, and the rest stand', pv.summary.failed === 1 && pv.summary.samples === 80 && pv.prompts.flatMap(p => p.samples).find(s => s.error).error === 'overloaded', JSON.stringify(pv.summary), '');
  chk('run: the cost is worked out from what was really used, 79 calls', pv.usage.calls === 79 && pv.usd > 0.3 && pv.pence >= 30, JSON.stringify([pv.usage, pv.usd, pv.pence]), '');
  const boilersFolder = pv.folders.find(f => f.folder.endsWith('/ Boilers'));
  chk('across prompts: every folder with 2 or more prompts is compared, and only those', pv.folders.map(f => f.folder.split('/').pop().trim()).join() === 'Boilers,Leak repair,Brand,All job photos' && boilersFolder.prompts.length === 7, pv.folders.map(f => f.folder).join(), '');
  chk('across prompts: only pairs from different prompts are counted', pv.folders.find(f => f.folder === 'All job photos').compared === 48, pv.folders.find(f => f.folder === 'All job photos').compared, '48: 3 prompts of 4 samples, cross pairs only');
  chk('across prompts: identical posts warn on the opening, placed, and only on the opening', boilersFolder.opening_pairs > 0 && boilersFolder.warnings.every(w => w.type === 'opening') && /^P1\.1, /.test(boilersFolder.warnings[0].message), JSON.stringify(boilersFolder.warnings[0]), '');
  const twoP = { output: { prompts: [{ n: 1, folder: 'F' }, { n: 2, folder: 'F' }, { n: 3, folder: 'G' }] } };
  const shared = 'we always check the pressure before anything else happens here';
  const cross = Pv.folderSameness([
    { n: 1, samples: [{ n: 1, text: `one two ${shared}. Call us.` }, { n: 2, text: `three four ${shared}. Call us.` }] },
    { n: 2, samples: [{ n: 1, text: 'entirely different words in this one. Call us.' }, { n: 2, text: 'and these are different again too. Call us.' }] },
    { n: 3, samples: [{ n: 1, text: `five six ${shared}. Call us.` }] },
  ], twoP);
  chk('across prompts: samples alike within one prompt are not counted, nor another folder', cross.length === 1 && cross[0].folder === 'F' && cross[0].phrase_pairs === 0 && cross[0].opening_pairs === 0 && !cross[0].warnings.length && cross[0].compared === 4, JSON.stringify(cross), '');
  const fTwo = { output: { prompts: [{ n: 1, folder: 'F' }, { n: 2, folder: 'F' }] } };
  const cross2 = Pv.folderSameness([{ n: 1, samples: [{ n: 1, text: `one two ${shared}. Call us.` }] }, { n: 2, samples: [{ n: 3, text: `three four ${shared}. Call us.` }] }], fTwo);
  chk('a shared phrase is kept for information and does not warn', cross2[0].phrase_pairs === 1 && cross2[0].longest === 10 && cross2[0].phrases[0].refs.join() === 'P1.1,P2.3' && !cross2[0].warnings.length, JSON.stringify(cross2[0]), '');
  const cross3 = Pv.folderSameness([{ n: 1, samples: [{ n: 1, text: 'Thinking about a new boiler for you. Call us.' }] }, { n: 2, samples: [{ n: 1, text: 'Thinking about a new boiler this time? Call us.' }] }], fTwo);
  chk('a shared opening between different prompts warns', cross3[0].opening_pairs === 1 && /^P1\.1 and P2\.1 start with the same 5 words: "thinking about a new boiler"/.test(cross3[0].warnings[0].message), JSON.stringify(cross3[0].warnings), '');
  const cta = 'read more about our patio work on our website today please';
  const factLine = 'we offer free quotes and fixed prices with no hidden costs for every job';
  const withFacts = { ...fTwo, intake: { usps: ['free quotes', 'fixed prices with no hidden costs'] } };
  const cross4 = Pv.folderSameness([{ n: 1, samples: [{ n: 1, text: `Aaa bbb ccc. ${factLine}. ${cta}.` }] }, { n: 2, samples: [{ n: 1, text: `Ddd eee fff. ${factLine}. ${cta}.` }] }], withFacts);
  chk('the facts sentence and the CTA sentence are left out of the phrases', cross4[0].phrase_pairs === 0, JSON.stringify(cross4[0].phrases), '');
  chk('what is left of a post after that', Pv.withoutFactsAndCta(`Aaa bbb. ${factLine}. Ccc ddd. ${cta}.`, withFacts.intake) === 'Aaa bbb. Ccc ddd.', Pv.withoutFactsAndCta(`Aaa bbb. ${factLine}. Ccc ddd. ${cta}.`, withFacts.intake), '');
  const cross5 = Pv.folderSameness([{ n: 1, samples: [{ n: 1, text: `A long ${shared}, truly. Call us.` }] }, { n: 2, samples: [{ n: 1, text: `Quite ${shared}, truly. Call us.` }] }], withFacts);
  chk('a phrase outside the facts and the CTA is still found', cross5[0].phrase_pairs === 1, JSON.stringify(cross5[0]), '');
  chk('across prompts: a lone prompt in a folder has nothing to compare', Pv.folderSameness([{ n: 1, samples: [{ n: 1, text: 'x' }] }], { output: { prompts: [{ n: 1, folder: 'F' }] } }).length === 0, '', '');
  chk('run: it remembers which config it tested', pv.config_at === pvRec.generated_at, pv.config_at, pvRec.generated_at);

  // Retry and failure
  const calls = [];
  rec = await G.runAutopost({ intake: plumber, callModel: async a => { calls.push(a); return { text: calls.length === 1 ? 'nonsense' : good, usage: {} }; } });
  chk('a failing reply runs once more, with its failures in the message', !rec.failure && rec.attempts === 2 && /FAILED THESE CHECKS/.test(calls[1].message) && /has 0 prompts/.test(calls[1].message), calls.length, 2);
  chk('the message carries the intake and decisions', /CTA sentence for the end of every prompt: invite them to give us a call/.test(calls[0].message) && /PROMPT \d+ - Other services: bathroom fitting .*the one service, in lower case as in running text: bathroom fitting .*the one angle: .*GBP Photos – Posts \/ Brand/.test(calls[0].message), calls[0].message.slice(0, 300), '');
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
  const sheetFor2 = () => { const i = buildIntake({ I: plumberI, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' }, hand: { counts: { ...plumberCounts, 'bathroom-fitting': 4 }, brand: 5 } }); return goodSheet(i, decide(i)); };
  const quiet = { log() {}, error() {} };
  let routeI = plumberI;
  const mounted = mountLeadSnapApi(app, { pool, log: quiet, callModel: (...a) => { modelCalls++; return model(...a); }, loadInputs: async id => { if (id === noMap.id) throw Object.assign(new Error('GBP output needs a v3 page map'), { status: 400 }); return { I: routeI, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' } }; } });
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
  chk('PUT saves the typed fields; the plan follows, still nothing spent', v.intake.ok && v.plan.prompts.length === 20 && v.hand.counts.boilers === 6 && modelCalls === 0, JSON.stringify(v.plan && v.plan.prompts.length), 6);
  v = (await req('POST', `${api}/generate`)).json();
  chk('POST generate saves the config and the file links', v.record.output.prompts.length === 20 && v.files['autopost-config.txt'] === '/clients/hartley-plumbing/lead-snap/autopost-config.txt', JSON.stringify(v.files), '');
  const f = await req('GET', v.files['autopost-config.txt']);
  chk('autopost-config.txt is served', f.status === 200 && f.text.startsWith('LEAD SNAP AUTOPOST CONFIG - Hartley Plumbing & Heating'), f.status, 200);
  chk('validation.json is served', (await req('GET', v.files['validation.json'])).status === 200, '', 200);
  chk('an unknown file is a 404', (await req('GET', '/clients/hartley-plumbing/lead-snap/nope.txt')).status === 404, '', 404);
  chk('no config for that slug is a 404', (await req('GET', '/clients/no-map/lead-snap/autopost-config.txt')).status === 404, '', 404);
  const before = (await pool.query(`SELECT count(*)::int AS n FROM client_assets WHERE asset_type='leadsnap_autopost'`)).rows[0].n;
  v = (await req('PUT', `${api}/intake`, { counts: { ...plumberCounts, 'bathroom-fitting': 4 }, brand: 5 })).json();
  chk('new photos change the plan before generating again: bathrooms earn a prompt', v.plan.prompts.some(p => p.label.startsWith('Bathroom fitting:')), JSON.stringify(v.plan.prompts.map(p => p.label)), '');
  model = async () => ({ text: goodSheet(buildIntake({ I: plumberI, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' }, hand: { counts: { ...plumberCounts, 'bathroom-fitting': 4 }, brand: 5 } }), v.plan), usage: {} });
  v = (await req('POST', `${api}/generate`)).json();
  const after = (await pool.query(`SELECT count(*)::int AS n FROM client_assets WHERE asset_type='leadsnap_autopost'`)).rows[0].n;
  chk('Generate again replaces the config in place', after === before && /PROMPT \d+ - Bathroom fitting:/.test(v.record.sheet), `${before} ${after}`, '');
  model = canned('nonsense');
  v = (await req('POST', `${api}/generate`)).json();
  chk('a failed run over the route keeps the good config and shows the failure', v.record.failure && v.record.sheet && v.files['autopost-config.txt'], JSON.stringify(v.record.failure && v.record.failure.error), '');
  // ── Preview posts, over the routes ──
  v = (await req('GET', api)).json();
  chk('the cost shows before running, and nothing has run', v.preview.estimate.samples === v.record.output.prompts.length * 4 && v.preview.estimate.pence > 0 && v.preview.saved === null, JSON.stringify(v.preview), '');
  chk('no preview yet: previews.json is a 404', (await req('GET', '/clients/hartley-plumbing/lead-snap/previews.json')).status === 404, '', 404);
  const beforePv = modelCalls;
  const sampleText = `Hartley Plumbing & Heating helps in Hornchurch. ${Array.from({ length: 180 }, () => 'word').join(' ')}`;
  model = async () => ({ text: sampleText, usage: { input_tokens: 500, output_tokens: 450 } });
  const configBefore = (await mounted.store.latest(c.id)).sheet;
  v = (await req('POST', `${api}/preview`)).json();
  chk('POST preview: 4 model calls per prompt, samples saved', modelCalls === beforePv + v.record.output.prompts.length * 4 && v.preview.saved.prompts[0].samples.length === 4 && !v.preview.stale, modelCalls - beforePv, '');
  chk('the preview leaves the config alone', (await mounted.store.latest(c.id)).sheet === configBefore, '', '');
  const pvFile = await req('GET', v.files['previews.json']);
  const goodSamples = (await mounted.store.previews(c.id)).at;
  model = async () => { throw new Error('the API is down'); };
  const allFailed = await req('POST', `${api}/preview`);
  chk('every call failing keeps the last good samples and says why', allFailed.status === 502 && /the API is down/.test(allFailed.json().error) && (await mounted.store.previews(c.id)).at === goodSamples, allFailed.status, 502);
  chk('a failed preview does not leave the button stuck', (await req('GET', api)).json().preview.running === false, '', false);
  chk('previews.json is served with the samples', pvFile.status === 200 && JSON.parse(pvFile.text).prompts[0].samples[0].text === sampleText, pvFile.status, 200);
  model = async () => ({ text: sheetFor2(), usage: {} });
  v = (await req('POST', `${api}/generate`)).json();
  chk('a new config marks the old samples as stale', !v.record.failure && v.preview.stale === true, JSON.stringify(v.record.failure), '');

  // ── The lock, over the routes ──
  const handNow = async () => mounted.store.hand(c.id);
  const sheetFor = (I0, hand0) => { const i = buildIntake({ I: I0, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken' }, hand: hand0 }); return goodSheet(i, decide(i)); };
  const counted = await handNow();
  const savedSheet = (await mounted.store.latest(c.id)).sheet;
  routeI = { ...plumberI, locked: [...plumberI.locked, { service: 'Leak detection', copyPriority: 0 }] };
  v = (await req('GET', api)).json();
  chk('page map moved: the tab keeps its names, the config is untouched, nothing is spent', v.intake.groups.some(g => g.label === 'Leak repair') && !v.intake.groups.some(g => g.label === 'Leaks') && v.record.sheet === savedSheet && v.intake.pending.renames[0].to === 'Leaks', JSON.stringify(v.intake.pending), '');
  chk('page map moved: the plan still uses the saved folders', v.plan.prompts.some(p => p.folder === 'GBP Photos \u2013 Posts / Leak repair'), JSON.stringify(v.plan.prompts.map(p => p.folder)), '');
  v = (await req('PUT', `${api}/intake`, { counts: counted.counts, brand: 5 })).json();
  chk('saving counts while locked keeps the saved names', 'leak-repair' in v.hand.counts && !('leaks' in v.hand.counts), JSON.stringify(v.hand.counts), '');
  const spent = modelCalls;
  const refused = await req('POST', `${api}/generate`);
  chk('Generate again that would rename a folder is refused without the confirm, nothing spent', refused.status === 409 && refused.json().renames[0].from === 'Leak repair' && modelCalls === spent && (await mounted.store.latest(c.id)).sheet === savedSheet, refused.status, 409);
  chk('accept_renames must be true, not just present', (await req('POST', `${api}/generate`, { accept_renames: 'yes' })).status === 409, '', 409);
  model = canned('nonsense');
  v = (await req('POST', `${api}/generate`, { accept_renames: true })).json();
  chk('a confirmed rename whose run fails changes nothing: old names, old counts', v.record.failure && v.record.sheet === savedSheet && 'leak-repair' in (await handNow()).counts && v.intake.groups.some(g => g.label === 'Leak repair'), JSON.stringify(v.record.failure && v.record.failure.error), '');
  const carriedHand = carryCounts(await handNow(), lockedFrom(await mounted.store.latest(c.id)), groupServices(routeI.locked));
  model = async () => ({ text: sheetFor(routeI, carriedHand), usage: {} });
  v = (await req('POST', `${api}/generate`, { accept_renames: true })).json();
  chk('a confirmed rename takes up the new name, and the record says what moved', !v.record.failure && v.record.sheet.includes('GBP Photos \u2013 Posts / Leaks') && v.record.renames[0].to === 'Leaks' && JSON.parse((await req('GET', v.files['validation.json'])).text).folders_renamed[0].from === 'Leak repair', JSON.stringify(v.record.renames), '');
  chk('the photo counts move with it, and the new name is what is locked now', (await handNow()).counts.leaks === counted.counts['leak-repair'] && !('leak-repair' in (await handNow()).counts) && v.intake.groups.some(g => g.label === 'Leaks') && !v.intake.pending.changed, JSON.stringify(await handNow()), '');
  routeI = { ...routeI, locked: [...routeI.locked, { service: 'Boiler servicing', copyPriority: 0 }] };
  model = async () => ({ text: sheetFor(routeI, await handNow()), usage: {} });
  const noRename = await req('POST', `${api}/generate`);
  chk('Generate again with no rename needs no confirm, and clears the last rename notice', noRename.status === 200 && noRename.json().record.renames.length === 0, noRename.status, 200);
  const rec0 = await mounted.store.latest(c.id);
  await mounted.store.save(c.id, { ...rec0, sheet: rec0.sheet.split('GBP Photos \u2013 Posts /').join('GBP Posts /') });
  v = (await req('GET', api)).json();
  chk('a config saved with the old path says so', v.intake.warnings.some(w => /old folder path, GBP Posts/.test(w)), v.intake.warnings, '');
  await mounted.store.save(c.id, rec0);
  v = (await req('GET', api)).json();
  chk('the new path raises no such warning', !v.intake.warnings.some(w => /old folder path/.test(w)), v.intake.warnings, '');

  v = (await req('GET', `/api/clients/${noMap.id}/lead-snap`)).json();
  chk('a client with no v3 page map: the error is shown, not a crash', v.intake === null && /v3 page map/.test(v.error), JSON.stringify(v), '');
  srv.close();

  // ── The tab: placed after GBP ──
  const shell = fs.readFileSync(path.join(root, 'public/app/screens/client.js'), 'utf8');
  chk('the tab sits right after GBP', /\['gbp', 'GBP'\], \['lead-snap', 'Lead Snap'\]/.test(shell) && /'lead-snap': \(\) => import\('\.\.\/tabs\/leadsnap\.js'\)/.test(shell), '', '');

  console.log(`\n${pass} passed, ${fail} failed\n`);
  if (fail) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
