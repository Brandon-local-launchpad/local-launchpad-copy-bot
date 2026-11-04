'use strict';
// Fixture: copy quality 3 (4 Nov 2026). The homepage keyword by primary category, the service
// override's type, the emergency promise rule on a client with no response time, hours or call
// out fee, and the emergency cost sets and call out question in the entries. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { homepageKeywordWord } = require(path.join(root, 'niche-library/keyword.js'));
const SB = require(path.join(root, 'service-blocks.js'));
const CB = require(path.join(root, 'category-blocks.js'));
const C = require(path.join(root, 'h1-research/claims.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 3 ===\n');

// ── The homepage keyword word ──
chk('homepageKeywordWord: a string applies to every client; a map applies by the primary category, else the default, else null', homepageKeywordWord({ homepage_keyword: 'Roofer' }, 'Roofing services') === 'Roofer' && homepageKeywordWord({ homepage_keyword: { 'blind shop': 'Blinds' } }, 'Blind Shop') === 'Blinds' && homepageKeywordWord({ homepage_keyword: { 'blind shop': 'Blinds' } }, 'Curtain Shop') === null && homepageKeywordWord({ homepage_keyword: { 'blind shop': 'Blinds', default: 'Blind fitter' } }, 'Curtain Shop') === 'Blind fitter' && homepageKeywordWord({}, 'Anything') === null, [homepageKeywordWord({ homepage_keyword: { 'blind shop': 'Blinds' } }, 'Blind Shop'), homepageKeywordWord({ homepage_keyword: { 'blind shop': 'Blinds' } }, 'Curtain Shop')].join(' | '), 'Blinds | null');
const blinds = require(path.join(root, 'niche-library/blinds-curtains.json'));
chk('The entries carry the approved words: Kitchen fitter, Loft conversion, Pest control, Fencing, Driveways, and Blinds for a Blind Shop client only', require(path.join(root, 'niche-library/kitchen-bathroom.json')).homepage_keyword === 'Kitchen fitter' && require(path.join(root, 'niche-library/loft-conversions.json')).homepage_keyword === 'Loft conversion' && require(path.join(root, 'niche-library/pest-control.json')).homepage_keyword === 'Pest control' && require(path.join(root, 'niche-library/fencing.json')).homepage_keyword === 'Fencing' && require(path.join(root, 'niche-library/driveways.json')).homepage_keyword === 'Driveways' && homepageKeywordWord(blinds, 'Blind Shop') === 'Blinds' && homepageKeywordWord(blinds, 'Curtain Shop') === null && require(path.join(root, 'niche-library/flooring.json')).homepage_keyword === 'Flooring', JSON.stringify(blinds.homepage_keyword), 'as approved');
const candsBlind = C.candidatesV2({ type: 'homepage', title: 'Homepage', info: {} }, { primaryName: 'Blind Shop', primaryKey: 'blind_shop', baseTown: 'Southampton', terms: {}, homepageKeyword: homepageKeywordWord(blinds, 'Blind Shop'), categoryName: () => null });
chk('H1 pattern: a Blind Shop client\'s homepage leads with "blinds southampton"', candsBlind[0] && candsBlind[0].keyword === 'blinds southampton', JSON.stringify(candsBlind[0]), 'blinds southampton');

// ── The service override's type ──
const land = landscaper;
const fencing = SB.blocksFor({ niche: land, cv: { business_type: 'A' }, category: 'Gardener', service: 'Fencing' });
const mowing = SB.blocksFor({ niche: land, cv: { business_type: 'A' }, category: 'Gardener', service: 'Lawn mowing' });
chk('Landscaper: Fencing under Gardener reads the type A entry through its override; Lawn mowing under Gardener stays type B', fencing.key === 'A' && fencing.overrideUsed && mowing.key === 'B' && !mowing.overrideUsed, `${fencing.key} / ${mowing.key}`, 'A / B');
chk('Landscaper: Fencing, Lawn seeding and Garden irrigation each read type A with their own cost cards; the Tree Service category and the tree pages read tree cost cards, not groundworks', (() => {
  const pages = ['Fencing', 'Lawn seeding', 'Garden irrigation'];
  const ok1 = pages.every(p => { const b = SB.blocksFor({ niche: land, cv: { business_type: 'A' }, category: p === 'Garden irrigation' ? 'Lawn care service' : 'Gardener', service: p }); return b.key === 'A' && b.overrideUsed && b.entry.cost && b.entry.cost.cards.length === 4; });
  const tree = CB.blocksFor({ niche: land, cv: { business_type: 'A' }, category: 'Tree service' });
  const treeText = JSON.stringify(tree.entry.cost);
  const pruning = SB.blocksFor({ niche: land, cv: { business_type: 'A' }, category: 'Tree service', service: 'Tree pruning and crown reduction' });
  return ok1 && tree.overrideUsed && /tree|climb|timber|crown|branch/i.test(treeText) && !/square metres|slabs|composite|softwood/i.test(treeText) && pruning.overrideUsed && !/square metres|slab|composite/i.test(JSON.stringify(pruning.entry.cost));
})(), '', 'A for the one off pages, tree cards on the tree pages');

// ── A step 2 that promises a look, and a flagged page with no confirmed call outs ──
const nicheNV = { step_2_no_visit: { title: 'We Price Your Job', brief: 'No method named.' } };
const threeSteps = [{ title: 'Tell Us', brief: 'a' }, { title: 'We Walk It and Price the Round', brief: 'b' }, { title: 'We Visit on the Dates Agreed', brief: 'c' }];
chk('overrideStepsFor: a step 2 promising a look goes to the no visit step when site visits are not confirmed, and stays when they are', CB.overrideStepsFor(threeSteps, nicheNV, { confirmed_practices: [] })[1].title === 'We Price Your Job' && CB.overrideStepsFor(threeSteps, nicheNV, { confirmed_practices: ['site_visit_before_quote'] })[1].title === 'We Walk It and Price the Round', '', 'swap only when unconfirmed');
chk('overrideStepsFor: a step 2 that is the job itself stays (We Measure and Draw It, We Test on a Day That Suits You)', ['We Measure and Draw It', 'We Test on a Day That Suits You', 'We Agree the Interval and the Price'].every(t => CB.overrideStepsFor([threeSteps[0], { title: t, brief: 'b' }, threeSteps[2]], nicheNV, {})[1].title === t), '', 'unchanged');
const nc = { h2: 'What Affects the Cost', cards: [1, 2, 3, 4].map(i => ({ title: `Booked ${i}`, brief: 'b' })) };
const nicheNC = { ...land, service_page_blocks: { ...land.service_page_blocks, A: { ...land.service_page_blocks.A, no_callouts: { cost: nc }, emergency: { ...(land.service_page_blocks.A.emergency || {}), cost: { h2: 'Emergency', cards: nc.cards } } } } };
const ncOff = SB.blocksFor({ niche: nicheNC, cv: { business_type: 'A' }, category: 'Paving Contractor', service: 'Patios', emergencyPage: true });
const ncOn = SB.blocksFor({ niche: nicheNC, cv: { business_type: 'A', emergency_primary: 'yes' }, category: 'Paving Contractor', service: 'Patios', emergencyPage: true });
const ncPlain = SB.blocksFor({ niche: nicheNC, cv: { business_type: 'A' }, category: 'Paving Contractor', service: 'Patios', emergencyPage: false });
chk('no_callouts: a flagged page with no confirmed call outs reads it; with call outs the emergency cost set wins; an unflagged page reads neither', ncOff.noCallouts && ncOff.entry.cost.h2 === 'What Affects the Cost' && !ncOn.noCallouts && ncOn.entry.cost.h2 === 'Emergency' && !ncPlain.noCallouts && ncPlain.entry.cost.h2 !== 'Emergency' && ncPlain.entry.cost.h2 !== 'What Affects the Cost', JSON.stringify([ncOff.entry.cost.h2, ncOn.entry.cost.h2, ncPlain.entry.cost.h2]), 'booked, emergency, planned');

// ── EMERG-PROMISE on a client with no response time, hours or call out fee ──
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
const bare = { ...E.cv, response_time: '', out_of_hours_available: '', quote_call_out_fee: '', price_list: '' };
const DR = computeDecisions({ cv: bare, niche: landscaper, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: A.resolveAllocatedItems(reply.homepage, parsed) });
const keys = new Set([...G.buildClientValues(bare, DR.decisions.d1_years_trading).matchAll(/^\[CV: ([a-z0-9_]+)\]/gm)].map(m => m[1]));
const V = buildValidationContext({ cv: bare, niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: keys });
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));
const withIntro = (text, cv = bare, v = V) => { const r = JSON.parse(JSON.stringify(rec)); r.home_services_intro = text; return validateV20(r, v).filter(i => i.check === 'EMERG-PROMISE' && i.field === 'home_services_intro'); };
chk('EMERG-PROMISE: an arrival time with no response_time is a BLOCK', withIntro('Call and someone is with you within the hour, whatever the fault. We cover the city and the villages around it for lawns, hedges and fences.').length === 1 && withIntro('Call and we are usually there in under an hour. We cover the city and the villages around it for lawns, hedges and fences.').length === 1, '', 'BLOCK');
chk('EMERG-PROMISE: hours of cover with no out_of_hours_available is a BLOCK', withIntro('We come out around the clock for a wall that has come down. We cover the city and the villages around it for lawns, hedges and fences.').length === 1 && withIntro('Evenings and weekends we are out for storm damage. We cover the city and the villages around it for lawns, hedges and fences.').length === 1, '', 'BLOCK');
chk('EMERG-PROMISE: a call out charge with no fee or price list is a BLOCK', withIntro('There is no call out charge for a first look. We cover the city and the villages around it for lawns, hedges and fences.').length === 1 && withIntro('Our call out fee is agreed before we set off. We cover the city and the villages around it for lawns, hedges and fences.').length === 1, '', 'BLOCK');
chk('EMERG-PROMISE: what moves the price passes (the time of day, the distance, the access), and the same promises pass once the client values hold them', withIntro('The time of day you call and how far out you are move the price, as does getting a van to the gate. We cover the city and the villages around it for lawns, hedges and fences.').length === 0 && (() => { const cv2 = { ...bare, response_time: 'within the hour', out_of_hours_available: 'yes', quote_call_out_fee: '£60' }; const V2 = buildValidationContext({ cv: cv2, niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: keys }); return withIntro('Call and someone is with you within the hour. We come out around the clock. There is no call out charge for a first look. We cover the city and the villages.', cv2, V2).length === 0; })(), '', 'pass / pass');

chk('EMERG-PROMISE: naming a call out charge at all is a BLOCK without a fee or a price list ("Any call out charge is worth asking about")', withIntro('Any call out charge or out of hours rate is worth asking about on the phone. We cover the city and the villages around it for lawns, hedges and fences.').length === 1, '', 'BLOCK');
const factTalk = (() => { const r = JSON.parse(JSON.stringify(rec)); r.home_services_intro = 'We can\'t confirm evening or weekend visits here, so please ask when you ring. We cover the city and the villages around it for lawns, hedges and fences.'; return validateV20(r, V).filter(i => i.check === 'NO-FACT-TALK' && i.field === 'home_services_intro'); })();
chk('NO-FACT-TALK: the page never says what it cannot confirm', factTalk.length === 1 && factTalk[0].type === 'BLOCK', JSON.stringify(factTalk.map(i => i.message)), 'BLOCK');
const lockN = require(path.join(root, 'niche-library/locksmith.json'));
const hoursQ = cv => CB.pickFaqSlots({ ...lockN.service_page_blocks.A, ...lockN.service_page_blocks.A.emergency }, cv, { max: 8 }).map(s => s.question).join(' | ');
chk('The hours question shows only when out_of_hours_available is set (a client with none of the values never sees it)', !/at night or at the weekend/.test(hoursQ({})) && /at night or at the weekend/.test(hoursQ({ out_of_hours_available: 'yes' })), hoursQ({}), 'no hours question for the bare client');

// ── The emergency cost sets and the call out question in every emergency niche ──
const emergencyNiches = ['locksmith', 'drainage', 'plumbing-heating', 'electrician', 'roofer', 'garage-doors', 'pest-control', 'tree-surgeon', 'scaffolding'];
for (const stem of emergencyNiches) {
  const n = require(path.join(root, 'niche-library', `${stem}.json`));
  const svc = ((n.service_page_blocks || {}).A || {}).emergency || {};
  const cat = ((n.category_page_blocks || {}).A || {}).emergency || {};
  const costOk = b => b && b.cost && Array.isArray(b.cost.cards) && b.cost.cards.length === 4 && b.cost.cards.every(c => c.title && c.brief);
  const text = JSON.stringify([svc.cost, cat.cost]);
  const noPromise = !/\b(within the hour|24 hours a day|around the clock|no call out charge|free call out)\b/i.test(text) && /\[CV: (?:quote_call_out_fee|response_time|out_of_hours_available|price_list)\]/.test(text);
  const q = [...(svc.faq_slots || []), ...(cat.faq_slots || [])].filter(s => s.slot === 'cost').map(s => s.question);
  const qOk = q.length >= 1 && q.every(x => /^How much is an emergency \[TRADE_PERSON\] call out in \[(?:CITY|TOWN)\]\?$/.test(x));
  chk(`${stem}: the emergency variants carry a cost set of four cards, briefs that take promises from the client values only, and the call out question`, costOk(svc) && costOk(cat) && noPromise && qOk, `svc cost ${costOk(svc)}, cat cost ${costOk(cat)}, promises ok ${noPromise}, questions ${JSON.stringify(q)}`, 'all true');
}

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
