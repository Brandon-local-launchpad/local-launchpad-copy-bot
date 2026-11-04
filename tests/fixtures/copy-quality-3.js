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
