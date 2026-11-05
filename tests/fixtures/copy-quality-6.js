'use strict';
// Fixture: copy quality 6 (5 Nov 2026). Briefs filtered by the client's confirmed services; the validator's
// false positives (SERVICE, OUTCOME, the repeat checks); niche idea homes; the cost FAQ rule; META-TALK; the
// article bug; the Why points by meaning; the token warning; the realistic test clients. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const CB = require(path.join(root, 'category-blocks.js'));
const SB = require(path.join(root, 'service-blocks.js'));
const IH = require(path.join(root, 'idea-homes.js'));
const L = require(path.join(root, 'niche-library/library.js'));
const R = require(path.join(root, 'fillout/services/resolver.js'));
const PM = require(path.join(root, 'page-map/generator.js'));
const { slugify } = require(path.join(root, 'page-map/slugs.js'));
const { articleFor, articleBefore, whyAltTitle } = require(path.join(root, 'decisions.js'));
const { computeServiceDecisions } = require(path.join(root, 'service-decisions.js'));
const { matchFears } = require(path.join(root, 'why-fears.js'));
const { helpers } = require(path.join(root, 'validate-v20.js'));
const { elements, targetsOf, report } = require(path.join(root, 'tools/niche-tag-briefs.js'));
const { CLIENTS } = require(path.join(root, 'tests/fixtures/data/realistic-clients.js'));
const { buildReaderView } = require(path.join(root, 'v20-reader.js'));

const locksmith = { ...require(path.join(root, 'niche-library/locksmith.json')), _source: 'locksmith' };
const cleaning = { ...require(path.join(root, 'niche-library/cleaning.json')), _source: 'cleaning' };

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 6 ===\n');

// ── 1. The filter ──
const card = (title, needs) => ({ title, brief: 'b', ...(needs ? { needs } : {}) });
const confirmed = new Set(['lockouts and gaining entry', 'key cutting']);
chk('eligibleFor: no tag always; a tag needs one of its services; no list means nothing is dropped', CB.eligibleFor(card('a'), confirmed) && CB.eligibleFor(card('a', ['Key cutting', 'Safes']), confirmed) && !CB.eligibleFor(card('a', ['Safes']), confirmed) && CB.eligibleFor(card('a', ['Safes']), null), '', 'the rule');
const entry = { problems: { h2: 'H', cards: [card('One'), card('Boarded', ['Burglary repairs and boarding up']), card('Three'), card('Four')] }, cost: { cards: [card('C1'), card('C2'), card('C3'), card('C4')] }, steps: [card('S1'), card('S2', ['Safes']), card('S3')], faq_slots: [{ slot: 'cost', question: 'Q' }, { slot: 'keys', question: 'K', needs: ['Master key systems'] }] };
const spares = [{ problems: { cards: [card('One'), card('Spare tagged', ['Safes']), card('Spare')] }, steps: [card('X'), card('Plain step two'), card('Z')], faq_slots: [{ slot: 'access', question: 'A' }, { slot: 'cost', question: 'dup' }] }];
const f = CB.filterEntry(entry, { confirmed, spares });
chk('filterEntry: a dropped card takes the next eligible one, keeping four and skipping tagged spares', f.problems.cards.map(c => c.title).join() === 'One,Three,Four,Spare', f.problems.cards.map(c => c.title).join(), 'One,Three,Four,Spare');
chk('filterEntry: a dropped step takes the same place from the plain set', f.steps[1].title === 'Plain step two' && f.steps.length === 3, JSON.stringify(f.steps), 'Plain step two');
chk('filterEntry: a dropped FAQ slot takes the next slot name, and no more questions than the entry had', f.faq_slots.map(s => s.slot).join() === 'cost,access', f.faq_slots.map(s => s.slot).join(), 'cost,access');
chk('filterEntry: nothing tagged out changes nothing', CB.filterEntry(entry, { confirmed: new Set(['burglary repairs and boarding up', 'safes', 'master key systems']), spares }).problems === entry.problems, '', 'same object');
chk('filterEntry: no list of services leaves the entry alone', CB.filterEntry(entry, { confirmed: null, spares }) === entry, '', 'same object');
chk('filterEntry: a slot with another variant left under its name needs no spare', CB.filterSlots([{ slot: 'cover', needs: ['Safes'] }, { slot: 'cover', question: 'plain' }], confirmed, spares).length === 1, '', 'one');
const rows = [{ type: 'service', title: 'Key cutting' }, { type: 'town_service', title: 'x', info: { service_name: 'Lock repairs' } }, { type: 'category', title: 'Locksmith', info: { links: { mentioned: ['Window locks'] } } }, { type: 'service', title: 'Safes', applies: false }];
const fromRows = CB.confirmedFromRows(rows);
chk('confirmedFromRows: service pages, town service pages and what a category mentions; not a page that does not apply', ['key cutting', 'lock repairs', 'window locks'].every(n => fromRows.has(n)) && !fromRows.has('safes'), [...fromRows].join(), 'three');
chk('confirmedFromContext: the keys with a parent category', [...CB.confirmedFromContext({ a: 'Key cutting', biz_area_1: 'Southampton' }, { a: 'Locksmith' })].join() === 'key cutting', '', 'key cutting');

// Every niche is tagged, with names the library knows; the owner's three examples hold
const rep = report();
chk('All 28 niches are in the report', rep.length === 28, rep.length, 28);
chk('Tagged elements are few of the whole: under a third everywhere', rep.every(r => r.tagged / r.total < 0.34), JSON.stringify(rep.filter(r => r.tagged / r.total >= 0.34).map(r => [r.stem, r.tagged, r.total])), 'under a third');
chk('At least one element tagged in most niches', rep.filter(r => r.tagged > 0).length >= 24, rep.filter(r => !r.tagged).map(r => r.stem).join(), 'most');
const unknownNames = [];
for (const r of rep) { const e = require(path.join(root, `niche-library/${r.stem}.json`)); const t = targetsOf(r.stem).map(x => x.toLowerCase()); for (const el of elements(e)) for (const n of el.needs || []) if (!t.includes(n.toLowerCase())) unknownNames.push(`${r.stem} ${el.path}: ${n}`); }
chk('Every tag names a page target in the niche library', !unknownNames.length, unknownNames.slice(0, 4).join(' | '), 'none');
const lockEls = elements(locksmith);
const needsOf = (els, re) => [...new Set(els.filter(e => re.test(e.title)).flatMap(e => e.needs || []))];
chk('Locksmith: "Boarded tonight" needs Burglary repairs and boarding up', needsOf(lockEls, /^Boarded tonight/).includes('Burglary repairs and boarding up'), needsOf(lockEls, /^Boarded tonight/).join(), 'that');
chk('Locksmith: "Keys for a let, a shop or a block" needs Master key systems', needsOf(lockEls, /^Keys for a let/).includes('Master key systems'), needsOf(lockEls, /^Keys for a let/).join(), 'that');
chk('Locksmith: "Your insurer has asked" needs British Standard and insurance approved locks', needsOf(lockEls, /^Your insurer has asked/).includes('British Standard and insurance approved locks'), needsOf(lockEls, /^Your insurer has asked/).join(), 'that');

const stemBad = rep.filter(r => require(path.join(root, 'niche-library/library.js')).stemOfEntry(require(path.join(root, `niche-library/${r.stem}.json`))) !== r.stem).map(r => r.stem);
chk('stemOfEntry: every entry finds its own library, as a live client reads it', !stemBad.length, stemBad.join(), 'all 28');

// The realistic clients
const pageMapOf = key => {
  const c = CLIENTS[key];
  const nicheKey = c.stem;
  const config = fs.readdirSync(path.join(root, 'fillout/services')).filter(x => x.endsWith('.json')).map(x => JSON.parse(fs.readFileSync(path.join(root, 'fillout/services', x), 'utf8'))).find(x => String(x.nicheKey || '').replace(/_/g, '-').startsWith(c.stem));
  const primary = config.categories.find(x => x.key === config.primaryDefault) || config.categories[0];
  const resolved = R.resolve(c.ticks, config, { additional: c.typed.map(service => ({ service, categoryKey: primary.key })) });
  const map = PM.buildPageMap({ resolved, baseTown: c.baseTown, otherTowns: c.towns.join('\n'), companyName: c.companyName, terms: { _sitewide: [] }, waiting: [] }, { volumes: new Map(), library: L.loadLibrarySet(nicheKey), launchTowns: new Set(c.towns.map(slugify)), exclude: new Set(), saved: [] });
  for (const r of map.rows) if (!r.h1) r.h1 = `${r.title} ${c.baseTown}`;
  return { c, rows: map.rows.map(r => ({ ...r, applies: r.applies !== false })) };
};
const lockThin = pageMapOf('locksmith-thin');
const lockFull = pageMapOf('locksmith-full');
const cleanFull = pageMapOf('cleaning-full');
chk('Test clients: four, thin and full for locksmith and cleaning, with the same trade list and three towns', Object.keys(CLIENTS).sort().join() === 'cleaning-full,cleaning-thin,locksmith-full,locksmith-thin' && Object.values(CLIENTS).every(c => c.towns.length + 1 === 3), Object.keys(CLIENTS).join(), 'four');
chk('Test clients: a real firm\'s list, at least 7 service pages each', [lockThin, lockFull, cleanFull].every(x => x.rows.filter(r => r.type === 'service').length >= 7), [lockThin, lockFull, cleanFull].map(x => x.rows.filter(r => r.type === 'service').length).join(), '7 or more');
for (const key of ['locksmith-full', 'cleaning-full']) {
  const v = CLIENTS[key].cv;
  chk(`Test clients: ${key} has the onboarding answers`, ['if_not_happy', 'materials_methods', 'confirmed_practices', 'quote_method', 'response_time', 'hours', 'areas_worked'].every(k => v[k] && v[k].length), '', 'all');
}
chk('Test clients: the thin ones have none of those', ['locksmith-thin', 'cleaning-thin'].every(k => ['if_not_happy', 'materials_methods', 'confirmed_practices', 'quote_method', 'response_time', 'hours', 'areas_worked'].every(x => !CLIENTS[k].cv[x])), '', 'none');
const lockoutR = (x, cv) => computeServiceDecisions({ cv: { company_name: x.c.companyName, company_name_gbp_checked: true, primary_category: 'Locksmith', phone: '023', business_type: 'A', year_founded: '2021', ...cv }, niche: { ...locksmith, service_words: [] }, keyValueMap: { biz_area_1: 'Southampton', biz_area_2: 'Romsey' }, rows: x.rows, page: x.rows.find(r => r.slug === '/services/lockouts-and-gaining-entry'), symptoms: [], mechanismsUsed: [], ideasUsed: [], tradeFacts: { niche: 'locksmith', verified: true, rows: [], counts: {}, missing: [], markdown: '' } });
const lockoutD = (x, cv) => { const r = lockoutR(x, cv); if (!r.decisions) throw new Error(JSON.stringify(r.gates)); return r.decisions; };
const thinCards = lockoutD(lockThin, CLIENTS['locksmith-thin'].cv).problems.map(c => c.title);
const fullCards = lockoutD(lockFull, CLIENTS['locksmith-full'].cv).problems.map(c => c.title);
chk('Lockouts page, thin client (no burglary service): four cards, no boarding up card', thinCards.length === 4 && !thinCards.some(t => /^Boarded/.test(t)), thinCards.join(' | '), 'no Boarded');
chk('Lockouts page, full client (burglary service confirmed): the boarding up card stays', fullCards.some(t => /^Boarded/.test(t)), fullCards.join(' | '), 'Boarded');

// ── 2. The validator ──
const terms = helpers.serviceTermsToCheck({ _source: 'locksmith', service_terms: ['anti snap', 'multipoint', 'Master key systems', 'gearbox', 'Safes', 'Burglary repairs'] });
chk('SERVICE: trade vocabulary is not checked; library names are', !terms.includes('anti snap') && !terms.includes('multipoint') && !terms.includes('gearbox') && terms.includes('Master key systems') && terms.includes('Safes') && terms.includes('Burglary repairs'), terms.slice(0, 12).join(', '), 'names only');
chk('SERVICE: every page target is checked, in or out of service_terms', helpers.serviceTermsToCheck({ _source: 'locksmith', service_terms: [] }).includes('Access control and door entry'), '', 'targets');
chk('SERVICE: one whole part of a library name is checked ("crown reduction")', helpers.serviceTermsToCheck({ _source: 'landscaper', service_terms: ['crown reduction', 'scarifying blade'] }).includes('crown reduction') && !helpers.serviceTermsToCheck({ _source: 'landscaper', service_terms: ['scarifying blade'] }).includes('scarifying blade'), '', 'the part, not the tool');
chk('SERVICE: a niche with no library keeps its list', helpers.serviceTermsToCheck({ service_terms: ['anything'] }).join() === 'anything', '', 'kept');
const sym = text => helpers.isSymptomPhrase(text, text.search(/won't|doesn't/));
for (const t of ['A handle that won\'t lift usually means the gearbox has gone.', 'If the lock won\'t turn, stop forcing the key.', 'It starts with a door which doesn\'t shut.']) chk(`OUTCOME: a symptom passes: ${t}`, sym(t), false, true);
for (const t of ['We lay a patio that won\'t crack.', 'The new base is built so it won\'t sink.', 'Your new patio won\'t crack.', 'So the slabs won\'t lift.']) chk(`OUTCOME: a promise still fires: ${t}`, !sym(t), true, false);
const phrases = helpers.requiredWording({ serviceList: [{ gbp: 'Building lockouts' }] }, { keyword: 'lockouts and gaining entry in Southampton', d2_h1: 'Lockouts and Gaining Entry Southampton', svc: 'Lockouts and gaining entry', svc_lower: 'lockouts and gaining entry' });
const cut = t => helpers.cutRequired(t, phrases);
chk('P3/P4: the keyword phrase and the service name are cut before counting', cut('Lockouts and gaining entry in Southampton is work for homes').includes('xbrkx') && !cut('Lockouts and gaining entry in Southampton is work for homes').includes('gaining entry'), cut('Lockouts and gaining entry in Southampton is work for homes'), 'cut');
chk('P3/P4: link text is cut too', !cut('Call about [key cutting and lock repairs](/services/key-cutting) today').includes('key cutting'), cut('Call about [key cutting and lock repairs](/services/key-cutting) today'), 'cut');
chk('P3/P4: other wording still counts', cut('the way in that leaves the least mark').includes('the way in that leaves'), '', 'kept');
for (const t of ['The cards that follow set out what moves the price.', 'The factors are set out here.', 'No figure is given on this site.', 'Below we explain how it works.', 'The cost factors are under What Affects the Cost.', 'All use the services below.', 'As set out earlier, the price varies.']) chk(`META-TALK: fires on "${t}"`, helpers.META_TALK_RE.test(t), false, true);
for (const t of ['The handle below the cylinder is the one that fails.', 'Set out your needs when you call.', 'The figure depends on the door.', 'The steps up to the door matter.', 'Read the meter first.', 'Under the slabs sits the sub base.']) chk(`META-TALK: passes "${t}"`, !helpers.META_TALK_RE.test(t), true, false);

const { ctaBandLine } = require(path.join(root, 'decisions.js'));
const band = { cta_band_line: 'Tell us and we will get back to you within [CV: response_time].', cta_band_line_no_response: 'Tell us and we will get back to you.' };
chk('CTA band: a length of time follows "within"', ctaBandLine(band, { response_time: '2 hours' }).includes('within [CV: response_time]') && ctaBandLine(band, { response_time: 'an hour' }).includes('within [CV: response_time]'), '', 'kept');
chk('CTA band: a value that says within loses the template\'s', ctaBandLine(band, { response_time: 'usually within the hour' }) === 'Tell us and we will get back to you [CV: response_time].', ctaBandLine(band, { response_time: 'usually within the hour' }), 'one within');
chk('CTA band: a sentence or no value takes the plain line', ctaBandLine(band, { response_time: 'we reply the same working day' }) === band.cta_band_line_no_response && ctaBandLine(band, {}) === band.cta_band_line_no_response, '', 'plain');
const repeatPhrases = helpers.requiredWording({ guaranteeScope: 'the locks we fit and the repairs we make' }, {});
chk('P4: the client\'s own guarantee wording is no repeat', helpers.cutRequired('We guarantee the locks we fit and the repairs we make.', repeatPhrases).includes('xbrkx'), '', 'cut');

// ── 3. Idea homes and the cost FAQ ──
const stub = { idea_homes: [{ topic: 'the ID check', home: 'the what to have ready FAQ', elsewhere: 'no card', pages: ['service'] }, { topic: 'everywhere', home: 'x', elsewhere: 'y' }] };
chk('ideaHomeLines: the niche\'s own ideas come first, on the pages they name', (() => { const s = IH.ideaHomeLines('service', stub).join('\n'), c = IH.ideaHomeLines('category', stub).join('\n'); return s.indexOf('the ID check') > 0 && s.indexOf('the ID check') < s.indexOf('The cost factors') && !c.includes('the ID check') && c.includes('everywhere'); })(), '', 'filtered');
chk('ideaHomeLines: no niche, the standard lines', IH.ideaHomeLines('service').join('\n').includes('The cost factors'), '', 'kept');
const lockIdeas = JSON.stringify(locksmith.idea_homes || []).toLowerCase();
chk('Locksmith: the ID check lives in the "what to have ready" FAQ', /(?:id check|proof|right to be)[^}]*what[^}]*ready/.test(lockIdeas), lockIdeas.slice(0, 500), 'declared');
chk('Locksmith: least damage entry lives in content paragraph 2', /(?:damage|least|mark)[^}]*paragraph 2/.test(lockIdeas), lockIdeas.slice(0, 700), 'declared');
const costFaq = CB.pickFaqSlots({ faq_slots: [{ slot: 'cost', question: 'How much?', answer_brief: 'Brief.' }, { slot: 'scope', question: 'What?', answer_brief: 'Scope.' }] }, {}, { max: 5 });
chk('Cost FAQ: code adds the rule to the cost slot only', costFaq[0].answer_brief.includes('moves the price most') && costFaq[0].answer_brief.includes('send photos') && costFaq[0].answer_brief.includes('Never point to another section') && costFaq[1].answer_brief === 'Scope.', JSON.stringify(costFaq), 'rule');
const homes = fs.readFileSync(path.join(root, 'idea-homes.js'), 'utf8');
chk('Cost FAQ: the old wording is gone from the code and every entry', !homes.includes('people do not expect') && !homes.includes('send the reader') && !fs.readdirSync(path.join(root, 'niche-library')).some(x => x.endsWith('.json') && /cards above already give/.test(fs.readFileSync(path.join(root, 'niche-library', x), 'utf8'))), '', 'gone');

// ── 4. Code bugs ──
chk('articleFor: an auto locksmith, a uPVC door, a key, an hour', articleFor('auto locksmith') === 'an' && articleFor('uPVC door') === 'a' && articleFor('key cutting') === 'a' && articleFor('hour') === 'an', '', 'the articles');
chk('articleBefore: "a [X]" follows the value, capital kept, others alone', articleBefore('a [X] visit', { X: 'auto locksmith' }) === 'an [X] visit' && articleBefore('A [X] job', { X: 'emergency callout' }) === 'An [X] job' && articleBefore('a [X] visit', { X: 'key cutting' }) === 'a [X] visit' && articleBefore('a [Y]', { X: 'auto' }) === 'a [Y]', '', 'the phrase');
const fearsClean = cleaning.fears;
const points = [{ key: 'track_record', title: '60+ Jobs Completed', proof: 'jobs' }, { key: 'cover', title: 'Insured up to £2m', proof: 'insurance' }, { key: 'differentiator_1', title: 'Family Run and Independent', proof: 'diff1' }];
const paired = matchFears(points, fearsClean);
const fearOf = k => (paired.find(p => p.key === k).fear || '');
chk('Why: the jobs count answers the slipping standard', /standard|slip/i.test(fearOf('track_record')), fearOf('track_record'), 'a standard that slips');
chk('Why: the insurance answers the fear of damage', /breaks|losing|stain/i.test(fearOf('cover')), fearOf('cover'), 'breaks things');
chk('Why: a fear is used once', new Set(paired.map(p => p.fear).filter(Boolean)).size === paired.filter(p => p.fear).length, JSON.stringify(paired.map(p => p.fear)), 'distinct');
chk('Why: a point with nothing in common gets no fear, never one by position', matchFears([{ key: 'x', title: 'Blue Vans', proof: 'theme' }], fearsClean)[0].fear === null, '', 'null');
chk('Why title: "The Same Clean Every Visit" only with the practice confirmed', whyAltTitle('The Same Clean Every Visit', cleaning, {}) === 'Local Experience Behind Every Job' && whyAltTitle('The Same Clean Every Visit', cleaning, { confirmed_practices: ['same_team_throughout'] }) === 'The Same Clean Every Visit', '', 'gated');
chk('Why title: a title with no promise stands', whyAltTitle('Local Experience on Every Kind of Door', locksmith, {}) === 'Local Experience on Every Kind of Door', '', 'kept');
const alts = fs.readdirSync(path.join(root, 'niche-library')).filter(x => x.endsWith('.json') && !['client-facts.json', 'practices.json'].includes(x)).map(x => JSON.parse(fs.readFileSync(path.join(root, 'niche-library', x), 'utf8')));
chk('Why title: the eleven titles that promise a practice are marked', alts.filter(e => e.why_title_practice).length === 11, alts.filter(e => e.why_title_practice).length, 11);
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));
const withQuote = { ...rec, CLAIMS: { status: 'needs acceptance', findings: [{ field: 'x', quote: 'With [CV: jobs_completed] jobs completed, we know.', why: 'no' }] } };
const md = buildReaderView(withQuote, { ...((rec.meta && rec.meta.client_values) || {}), jobs_completed: '60' });
chk('Token warning: a token quoted in the review notes is not reported as missing', md.includes('[CV: jobs_completed] jobs completed') && !/Tokens with no value on file:[^\n]*jobs_completed/.test(md), (md.match(/Tokens with no value[^\n]*/) || [''])[0], 'no warning');

console.log(`\n=== copy quality 6: ${pass} passed, ${fail} failed ===\n`);
if (fail) process.exitCode = 1;
