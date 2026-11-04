'use strict';
// Fixture: copy quality 2, phase 1 (4 Nov 2026). The flag pass, the claims pass instruction, the
// meta builders, the headings' customer word, the question form of a service name, the research
// filler rules, the homepage keyword word and the library's question_name column. No API calls.
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.join(__dirname, '../..');
const { computeDecisions, headingCustomers, weClause, isPersonWord } = require(path.join(root, 'decisions.js'));
const CD = require(path.join(root, 'category-decisions.js'));
const SD = require(path.join(root, 'service-decisions.js'));
const { parseDossier, dropVague } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { runFlagPass, runClaimRetries, FLAG_PASS } = require(path.join(root, 'v20-retry.js'));
const C = require(path.join(root, 'h1-research/claims.js'));
const L = require(path.join(root, 'niche-library/library.js'));
const UL = require(path.join(root, 'ui/library.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 2, phase 1 ===\n');

// The Edens Edge homepage set-up the validator fixture uses
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
const decide = (cv, niche) => computeDecisions({ cv, niche, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: A.resolveAllocatedItems(reply.homepage, parsed) });
const DR = decide(E.cv, landscaper);
const keys = new Set([...G.buildClientValues(E.cv, DR.decisions.d1_years_trading).matchAll(/^\[CV: ([a-z0-9_]+)\]/gm)].map(m => m[1]));
const V = buildValidationContext({ cv: E.cv, niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: keys });
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));

// ── Headings and the meta ──
chk('headingCustomers: the first customer type only', headingCustomers('homeowners and landlords') === 'Homeowners' && headingCustomers('homeowners, tenants and local businesses') === 'Homeowners', headingCustomers('homeowners and landlords'), 'Homeowners');
chk('headingCustomers: a business, landlord or trade first type reads Customers', headingCustomers('landlords and letting agents') === 'Customers' && headingCustomers('local businesses') === 'Customers' && headingCustomers('other trades') === 'Customers' && headingCustomers('dog owners') === 'Dog owners', [headingCustomers('landlords and letting agents'), headingCustomers('dog owners')].join(' | '), 'Customers | Dog owners');
chk('Why H2 and the reviews H2 use the first customer type, never the list', (() => { const d = decide({ ...E.cv, review_count: '25', rating: '4.9' }, { ...landscaper, customer_type: 'homeowners and landlords' }).decisions; const h = d.d8 || {}; return /^Why Southampton Homeowners Choose /.test(h.why || '') && /From Southampton Homeowners$/.test(h.reviews || '') && !/Homeowners And Landlords|Homeowners and Landlords/.test(JSON.stringify(h)); })(), JSON.stringify((decide({ ...E.cv, review_count: '25', rating: '4.9' }, { ...landscaper, customer_type: 'homeowners and landlords' }).decisions.d8 || {})).slice(0, 200), 'Homeowners only');
chk('weClause: "We photograph every fault before we quote" turns into a clause', weClause('We photograph every fault before we quote') === 'and photographs every fault before quoting', weClause('We photograph every fault before we quote'), 'and photographs every fault before quoting');
chk('weClause: a shape that does not turn cleanly returns null (the sentence then stands alone)', weClause('We are a family firm and we care') === null && weClause('We never leave a roof open overnight') === null, '', 'null');
chk('isPersonWord: landscaper and roofer are person words, roofing services and guttering are work words', isPersonWord('landscaper') && isPersonWord('roofer') && !isPersonWord('roofing services') && !isPersonWord('guttering'), '', 'person / work');
const metaGutter = decide({ ...E.cv, h1_override: 'Roofing services Southampton' }, { ...landscaper, trade_person: 'guttering specialist', trade_person_plural: 'guttering specialists' }).decisions.d4_meta;
chk('Homepage meta: a work word keyword reads "is a [trade person] in [city]", never "is a roofing services"', /is a guttering specialist in Southampton/.test(metaGutter) && !/is a roofing services/.test(metaGutter), metaGutter, 'is a guttering specialist in Southampton');
chk('Homepage meta: a person word keyword is kept as it is', /is a landscaper in Southampton/.test(DR.decisions.d4_meta), DR.decisions.d4_meta, 'is a landscaper in Southampton');
const metaWe = CD.metaFor({ cv: { company_name: 'Kestrel Ridge', differentiator_1_confirmed: true, differentiator_1_sentence: 'We photograph every fault before we quote' }, isPerson: false, kwNatural: 'roofing services in Southampton', metaCta: 'Get your free quote today.', yearsTrading: 3, yearFounded: 2023, modifier: '' });
chk('Category meta: a "We ..." proof becomes a clause, never "with we photograph"', /offers roofing services in Southampton and photographs every fault before quoting\./.test(metaWe) && !/with we/.test(metaWe), metaWe, 'and photographs every fault before quoting');
const metaOffering = CD.metaFor({ cv: { company_name: 'Acme', differentiator_1_confirmed: true, differentiator_1_sentence: 'Offering fixed prices with no hidden costs' }, isPerson: false, kwNatural: 'paving in Southampton', metaCta: 'Get your free quote today.', yearsTrading: 3, yearFounded: 2023, modifier: '' });
chk('Category meta: a proof that says "offering" joins with "with", never "offering ... offering"', /offers paving in Southampton with fixed prices with no hidden costs\./.test(metaOffering) && !/offering .*offering/i.test(metaOffering), metaOffering, 'with fixed prices with no hidden costs');

// ── The question form of a service name ──
const q = SD.singularQuestionName;
chk('singularQuestionName: a plain plural becomes a singular with its article', q('patios') === 'a patio' && q('roof repairs') === 'a roof repair' && q('awnings') === 'an awning' && q('canopies') === 'a canopy' && q('hedges') === 'a hedge', [q('patios'), q('roof repairs'), q('awnings'), q('canopies')].join(' | '), 'a patio | a roof repair | an awning | a canopy');
chk('singularQuestionName: an uncountable or a compound name stays as it is, with no article', q('end of tenancy cleaning') === 'end of tenancy cleaning' && q('lockouts and gaining entry') === 'lockouts and gaining entry' && q('ant control') === 'ant control' && q('glass') === 'glass', [q('end of tenancy cleaning'), q('glass')].join(' | '), 'unchanged');
const ctxQ = { svc: 'Patios', svcLower: 'patios', svcQuestion: 'a patio', cat: 'Paving Contractor', catLower: 'paving contractor', work: 'Paving', workLower: 'paving', town: 'Southampton', city: 'Southampton' };
chk('phSvc: a question names the service in its question form; a heading keeps the page name', SD.phSvc('How much does [SERVICE_LOWER] cost in [CITY]?', ctxQ) === 'How much does a patio cost in Southampton?' && SD.phSvc('Is [SERVICE] Right for Your Garden?', ctxQ) === 'Is a patio right for your garden?' && SD.phSvc('Signs You Need [SERVICE]', ctxQ) === 'Signs You Need Patios', [SD.phSvc('How much does [SERVICE_LOWER] cost in [CITY]?', ctxQ), SD.phSvc('Signs You Need [SERVICE]', ctxQ)].join(' | '), 'a patio in the question, Patios in the heading');
chk('phSvc: the library question_name wins over the singulariser (the context carries it)', SD.phSvc('How long does [SERVICE_LOWER] take?', { ...ctxQ, svcQuestion: 'a lockout call out' }) === 'How long does a lockout call out take?', '', 'a lockout call out');
chk('phSvc: after "your", "for" or before "work" and "service" the plain name, never "your a patio work"', SD.phSvc('Do you guarantee your [SERVICE_LOWER] work?', ctxQ) === 'Do you guarantee your patios work?' && SD.phSvc('Are you insured for [SERVICE_LOWER]?', ctxQ) === 'Are you insured for patios?' && SD.phSvc('What does your [SERVICE_LOWER] service include?', ctxQ) === 'What does your patios service include?', [SD.phSvc('Do you guarantee your [SERVICE_LOWER] work?', ctxQ), SD.phSvc('Are you insured for [SERVICE_LOWER]?', ctxQ)].join(' | '), 'plain name');
const ctxWork = { ...ctxQ, svc: 'Emergency tree work', svcLower: 'emergency tree work', svcQuestion: 'emergency tree work' };
chk('phSvc: a name ending in work never doubles it ("your emergency tree work?", "Signs You Need Emergency tree work")', SD.phSvc('Do you guarantee your [SERVICE_LOWER] work?', ctxWork) === 'Do you guarantee your emergency tree work?' && SD.phSvc('Signs You Need [SERVICE] work', ctxWork) === 'Signs You Need Emergency tree work', SD.phSvc('Do you guarantee your [SERVICE_LOWER] work?', ctxWork), 'no "work work"');
chk('singularQuestionName: acronyms keep their capitals, a bracketed note goes, the article follows the sound, a phrase after a preposition is left alone', q('CCTV drain surveys') === 'a CCTV drain survey' && q('EV charger installation') === 'EV charger installation' && q('Roof window installation (Velux)') === 'roof window installation' && q('Utility rooms') === 'a utility room' && q('Tree root removal from drains') === 'tree root removal from drains', [q('CCTV drain surveys'), q('Utility rooms'), q('Tree root removal from drains')].join(' | '), 'a CCTV drain survey | a utility room | tree root removal from drains');

// ── Research filler ──
chk('dropVague: a sentence that only says the soil varies is dropped, the rest kept', dropVague('Victorian terraces on clay. Soils vary across the area. Front gardens are short.') === 'Victorian terraces on clay. Front gardens are short.' && dropVague('The geology varies widely across the city; most plots are on gravel.') === 'most plots are on gravel.', dropVague('Victorian terraces on clay. Soils vary across the area. Front gardens are short.'), 'the varies sentence gone');
chk('RESEARCH-LANG: "the soil varies across the city" and "geology varies" are flagged on the page', (() => { const r = JSON.parse(JSON.stringify(rec)); r.home_content_block_body = r.home_content_block_body + ' The soil varies across the city, and the geology varies from street to street.'; const iss = validateV20(r, V).filter(i => i.check === 'RESEARCH-LANG' && i.field === 'home_content_block_body'); return iss.length >= 1 && /varies/.test(iss.map(i => i.message).join(' ')); })(), '', 'RESEARCH-LANG on varies');

// ── The flag pass ──
(async () => {
  const r1 = JSON.parse(JSON.stringify(rec));
  const long = 'We look after gardens for homeowners across the city and the villages around it, and every visit starts with a walk round so the work suits the garden rather than a standard list, and the lawns, the hedges, the beds and the paths between them are all part of what a visit covers through the year, whatever the season brings and whatever the garden needs most at the time.';
  r1.home_services_intro = long; // 70 odd words against a 30 to 60 range: an N7 flag
  const short = 'We look after gardens across the city and the villages around it. Every visit starts with a walk round the garden, so the work suits what is there rather than a standard list. Lawns, hedges, beds and paths are all part of it.';
  const calls = [];
  const out = await runFlagPass({ record: r1, V, callRetry: async ({ message }) => {
    const field = message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
    calls.push({ field, message });
    if (field === 'home_services_intro') return { text: `home_services_intro: ${short}`, usage: { input_tokens: 1, output_tokens: 1 } };
    return { text: '', usage: {} };
  } });
  const mine = calls.find(c => c.field === 'home_services_intro');
  chk('Flag pass: a field with an N7 range flag is rewritten with its flag message and the shorter text is kept', r1.home_services_intro === short && out.log.some(l => l.field === 'home_services_intro' && l.kept) && mine && /words: it must be \d+ to 60/.test(mine.message), JSON.stringify(out.log.filter(l => l.field === 'home_services_intro').map(l => [l.kept, l.error, l.flags_before, l.flags_after])), 'kept, flags dropped');
  chk('Flag pass: before and after counts and the kept count come back', out.before > out.after && out.kept >= 1, `${out.before} -> ${out.after}, kept ${out.kept}`, 'fewer flags after');
  chk('Flag pass: only fields with a pass flag are tried (every call was for a flagged field)', calls.every(c => validateV20(JSON.parse(JSON.stringify(rec)), V).concat(validateV20(r1, V)).some(i => i.field === c.field && i.type === 'FLAG')), calls.map(c => c.field).join(', '), 'flagged fields only');
  const r2 = JSON.parse(JSON.stringify(rec));
  r2.home_services_intro = long;
  const out2 = await runFlagPass({ record: r2, V, maxRounds: 1, callRetry: async ({ message }) => {
    const field = message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
    if (field === 'home_services_intro') return { text: `home_services_intro: ${short.replace('so the work suits', 'so the work — suits')}`, usage: {} }; // an em dash: a new BLOCK
    return { text: '', usage: {} };
  } });
  chk('Flag pass: a rewrite that adds a BLOCK is not kept', r2.home_services_intro === long && out2.log.some(l => l.field === 'home_services_intro' && !l.kept && /BLOCK/.test(l.error || '')), JSON.stringify(out2.log.filter(l => l.field === 'home_services_intro').map(l => [l.kept, l.error])), 'rejected: the rewrite added a BLOCK');
  chk('Flag pass set: N7, N18, N21, N24, REPEAT-PAGE, REPEAT-IN, PAD-OPENER, ITEM-REPEAT, SERVICE, SCENERY and RESEARCH-LANG are in it', ['N7', 'N18', 'N21', 'N24', 'REPEAT-PAGE', 'REPEAT-IN', 'PAD-OPENER', 'ITEM-REPEAT', 'SERVICE', 'SCENERY', 'RESEARCH-LANG'].every(c => FLAG_PASS.has(c)), [...FLAG_PASS].join(', '), 'all present');

  // ── The claims pass instruction ──
  const r3 = JSON.parse(JSON.stringify(rec));
  let claimMessage = '';
  let round = 0;
  await runClaimRetries({ record: r3, V, maxRounds: 1, review: async () => ({ at: 'now', findings: round++ ? [] : [{ field: 'home_final_cta_body', quote: r3.home_final_cta_body.split('. ')[0], why: 'No practice on file says so.' }] }), callRetry: async ({ message }) => { claimMessage = message; return { text: 'home_final_cta_body: Call us on [CV: phone] and tell us about the garden.', usage: {} }; } });
  chk('Claims pass: the rewrite instruction asks for the trade\'s principle in the third person, never "we" for an unconfirmed practice', /third person/.test(claimMessage) && /a fair landscaper/.test(claimMessage) && /never "we" or "our"/.test(claimMessage), claimMessage.split('\n').find(l => /Unsupported claim/.test(l)) || '', 'third person, a fair landscaper, never we');
  chk('Shared copy rules carry the rule', /Never "we" for an unconfirmed practice/.test(fs.readFileSync(path.join(root, 'prompts/_shared_copy_rules.md'), 'utf8')), '', 'rule present');

  // ── The homepage keyword word ──
  const ctxH = { primaryName: 'Roofing services', primaryKey: 'roofing_services', baseTown: 'Bournemouth', terms: {}, homepageKeyword: 'Roofer', categoryName: () => null };
  const cands = C.candidatesV2({ type: 'homepage', title: 'Homepage', info: {} }, ctxH);
  chk('H1 pattern: the homepage keyword word is the entry\'s homepage_keyword ("roofer bournemouth" first), the category pattern still a candidate', cands[0] && cands[0].keyword === 'roofer bournemouth' && cands[0].fit === 'own' && cands.some(c => c.keyword === 'roofing services bournemouth'), JSON.stringify(cands), 'roofer bournemouth first');
  const candsPlain = C.candidatesV2({ type: 'homepage', title: 'Homepage', info: {} }, { ...ctxH, homepageKeyword: null });
  chk('H1 pattern: without homepage_keyword the primary category pattern leads, as before', candsPlain[0] && candsPlain[0].keyword === 'roofing services bournemouth', JSON.stringify(candsPlain[0]), 'roofing services bournemouth');
  chk('The roofer entry sets homepage_keyword Roofer', require(path.join(root, 'niche-library/roofer.json')).homepage_keyword === 'Roofer', '', 'Roofer');
  chk('stemFor: a Fillout niche key with underscores finds the stem (dog_walkers → pet-care, loft_extensions → loft-conversions)', UL.stemFor('dog_walkers') === 'pet-care' && UL.stemFor('loft_extensions') === 'loft-conversions' && UL.stemFor('roofers') === 'roofer', [UL.stemFor('dog_walkers'), UL.stemFor('loft_extensions')].join(' | '), 'pet-care | loft-conversions');

  // ── The library's question_name column ──
  const csv = 'gbp_name,gbp_category,verdict,target,note,emergency,prose_name,confirm_only,desire_led,question_name\nLock out service,Locksmith,page,Lockouts and gaining entry,,yes,,,,a lockout call out\nPatio paving,Paving contractor,page,Patios,,,,,yes,\n';
  const file = path.join(os.tmpdir(), `copybot-qn-${process.pid}.csv`);
  fs.writeFileSync(file, csv);
  const lib = L.loadLibrary('Question Niche', { file });
  chk('library: question_name is read and the target carries it; a blank stays blank', L.targetFlags(lib, 'Lockouts and gaining entry').question_name === 'a lockout call out' && L.targetFlags(lib, 'Patios').question_name === '', JSON.stringify(L.targetFlags(lib, 'Lockouts and gaining entry')), 'a lockout call out');
  const file2 = path.join(os.tmpdir(), `copybot-qn-old-${process.pid}.csv`);
  fs.writeFileSync(file2, 'gbp_name,gbp_category,verdict,target,note,emergency,prose_name,confirm_only,desire_led\nPatio paving,Paving contractor,page,Patios,,,,,yes\n');
  const lib2 = L.loadLibrary('Old Niche', { file: file2 });
  chk('library: a CSV without the column still loads (question_name blank)', lib2.rows.length > 0 && lib2.rows.every(r => r.question_name === ''), '', 'blank');

  // ── Phase 2: thin page minimums, idea homes, per target overrides ──
  const { effectiveRanges, thinRange } = require(path.join(root, 'validate-v20.js'));
  chk('thinRange: a minimum drops by a third, the maximum and a range with no minimum stay', JSON.stringify(thinRange({ min: 250, max: 300, label: '250 to 300' }, true)) === JSON.stringify({ min: 167, max: 300, label: '167 to 300' }) && thinRange({ max: 49, label: 'under 50' }, true).max === 49 && thinRange({ min: 30, max: 60, label: '30 to 60' }, false).min === 30, JSON.stringify(thinRange({ min: 250, max: 300, label: '250 to 300' }, true)), '167 to 300');
  chk('effectiveRanges: the page type ranges, scaled only when V.thin', effectiveRanges(rec, { thin: true }).home_content_block_body.min === 134 && effectiveRanges(rec, { thin: false }).home_content_block_body.min === 200, JSON.stringify(effectiveRanges(rec, { thin: true }).home_content_block_body), '134 to 250 when thin');
  const thinRec = JSON.parse(JSON.stringify(rec)); thinRec.home_services_intro = 'We look after gardens across the city and the villages around it. Every visit starts with a walk round the garden.';
  const nThin = validateV20(thinRec, { ...V, thin: true }).filter(i => i.check === 'N7' && i.field === 'home_services_intro' && /words: it must be/.test(i.message));
  const nFull = validateV20(thinRec, { ...V, thin: false }).filter(i => i.check === 'N7' && i.field === 'home_services_intro' && /words: it must be/.test(i.message));
  chk('N7: 22 words in a 30 to 60 field passes on a thin page (minimum 20) and flags on a full one', nThin.length === 0 && nFull.length === 1, `${nThin.length} / ${nFull.length}`, '0 / 1');
  const thinD = decide({ ...E.cv, review_count: '', rating: '', year_founded: '' }, landscaper);
  chk('Homepage decisions carry thin and the DECISIONS block lists IDEA HOMES', typeof DR.decisions.thin === 'boolean' && /IDEA HOMES \(one home per idea/.test(DR.decisionsBlock) && /the home of what to tell us and send/.test(DR.decisionsBlock) && /the only home of the insurer point|the one factor people do not expect/.test(DR.decisionsBlock), DR.decisionsBlock.split('\n').filter(l => /IDEA HOMES|THIN PAGE/.test(l)).join(' | '), 'IDEA HOMES present');
  const decisionsNoAlloc = computeDecisions({ cv: E.cv, niche: landscaper, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: null });
  chk('A homepage with no allocated neighbourhoods is thin: THIN PAGE lists the lower minimums', decisionsNoAlloc.decisions.thin === true && /THIN PAGE/.test(decisionsNoAlloc.decisionsBlock) && /home_content_block_body: 134 to 250 words/.test(decisionsNoAlloc.decisionsBlock), decisionsNoAlloc.decisionsBlock.split('\n').filter(l => /THIN PAGE|home_content_block_body:/.test(l)).join(' | '), 'thin, 134 to 250');
  const SB = require(path.join(root, 'service-blocks.js'));
  const CB = require(path.join(root, 'category-blocks.js'));
  const overCards = { h2: 'What Affects the Cost of [SERVICE] in [CITY]', cards: [1, 2, 3, 4].map(i => ({ title: `Override ${i}`, brief: `Override brief ${i}.` })) };
  const nicheO = { ...landscaper, service_overrides: { 'patios': { cost: overCards, always_emergency: true } }, category_overrides: { 'paving contractor': { cost: overCards } } };
  const so = SB.blocksFor({ niche: nicheO, cv: { business_type: 'A' }, category: 'Paving Contractor', service: 'Patios' });
  const soOther = SB.blocksFor({ niche: nicheO, cv: { business_type: 'A' }, category: 'Paving Contractor', service: 'Garden paths' });
  chk('service_overrides: the named page takes the override cost cards and the forced urgent framing; another page does not', so.overrideUsed && so.entry.cost.cards[0].title === 'Override 1' && so.emergencyOn && so.forcedEmergency && !soOther.overrideUsed && soOther.entry.cost.cards[0].title !== 'Override 1' && !soOther.emergencyOn, JSON.stringify([so.overrideUsed, so.emergencyOn, soOther.overrideUsed]), 'override on Patios only');
  const co = CB.blocksFor({ niche: nicheO, cv: { business_type: 'A' }, category: 'Paving Contractor' });
  const coOther = CB.blocksFor({ niche: nicheO, cv: { business_type: 'A' }, category: 'Gardener' });
  chk('category_overrides: the named category takes the override cost cards; another category does not', co.overrideUsed && co.entry.cost.cards[1].title === 'Override 2' && !coOther.overrideUsed, JSON.stringify([co.overrideUsed, coOther.overrideUsed]), 'override on Paving contractor only');
  const lock = require(path.join(root, 'niche-library/locksmith.json'));
  const lockBlocks = SB.blocksFor({ niche: lock, cv: { business_type: 'A' }, category: 'Locksmith', service: 'Lockouts and gaining entry', emergencyPage: true });
  chk('Locksmith entry: Lockouts and gaining entry always takes the urgent framing with its own cost cards (no safes, windows or keys)', lockBlocks.forcedEmergency && lockBlocks.emergencyOn && lockBlocks.overrideUsed && !/safe|window|key cutting|keys to cut/i.test(JSON.stringify(lockBlocks.entry.cost)), JSON.stringify(lockBlocks.entry.cost.cards.map(c => c.title)), 'urgent cost cards');
  const land = require(path.join(root, 'niche-library/landscaper.json'));
  const pav = CB.blocksFor({ niche: land, cv: { business_type: 'A' }, category: 'Paving contractor' });
  chk('Landscaper entry: the Paving contractor category has its own cost cards about slabs, blocks and bases, no boards or posts', pav.overrideUsed && /slab|block|base/i.test(JSON.stringify(pav.entry.cost)) && !/board|post|composite|softwood/i.test(JSON.stringify(pav.entry.cost)), JSON.stringify(pav.entry.cost.cards.map(c => c.title)), 'paving cost cards');

  // ── Phase 3: rubric fairness ──
  const Q = require(path.join(root, 'quality-review.js'));
  chk('F5 and V9j carry the phase 3 rules (a cost answer with no price list; a figure from a verified rule row with its condition)', /one factor that moves the price most/.test(Q.JUDGE_ITEMS.F5) && /verified trade facts rule row/.test(Q.judgeItemsFor({ page_type: 'service' }).V9j), '', 'rules present');
  chk('The reviewer prompt asks for needs (writing or client fact) and score_writing', (() => { const p = fs.readFileSync(path.join(root, 'prompts/Copy_Quality_Review_CORE.md'), 'utf8'); return /"needs"/.test(p) && /score_writing/.test(p) && /client fact/.test(p); })(), '', 'both in the prompt');
  const rvDemo = { score: 7.2, score_writing: 8.1, done: false, failed: ['P4', 'F5'], validator: { block: 0, flag: 3 }, other_problems: [], missing_facts: [{ fact: 'A workmanship guarantee', why: 'The cover answer could then say so.' }], items: [{ id: 'P4', by: 'code', pass: false, needs: 'writing', title: 'No five word run shared by two fields', reasons: ['x'] }, { id: 'F5', by: 'judge', pass: false, needs: 'client fact', title: 'Each FAQ answer answers the question', reasons: ['"…": no guarantee on file'] }, { id: 'E2', by: 'judge', pass: true, needs: null, title: 'Hero sentence 2', reasons: [] }] };
  const fr = Q.formatReview(rvDemo);
  chk('formatReview: both scores, the failures split into fixable in the writing and needs a client fact, the passes listed', /Counting only what the writing can fix: 8\.1 \/ 10 \(1 failure\(s\) fixable in the writing, 1 need a client fact\)/.test(fr) && /Fixable in the writing:\nFAIL P4/.test(fr) && /Needs a client fact:\nFAIL F5/.test(fr) && /PASS E2/.test(fr), fr.split('\n').slice(0, 4).join(' | '), 'split mark sheet');
  const Vrule = { ...V, tradeFactsRows: [{ kind: 'rule', name: 'Front garden paving', text: 'A new or replacement front garden surface over 23 square metres that water cannot soak through usually needs planning permission unless it drains to a lawn or border.' }] };
  const recRule = JSON.parse(JSON.stringify(rec));
  recRule.home_areas_intro = 'A front garden surface over 23 square metres that water cannot soak through usually needs permission unless it drains to a lawn or border in the garden. We cover Romsey and the villages.';
  const recBare = JSON.parse(JSON.stringify(rec));
  recBare.home_areas_intro = 'A front garden surface over 23 square metres needs permission. We cover Romsey and the villages.';
  const recNoRow = JSON.parse(JSON.stringify(recRule));
  const numOf = (r, v) => validateV20(r, v).filter(i => i.check === 'NUM' && i.field === 'home_areas_intro').length;
  chk('NUM: a figure from a verified rule row passes with its condition stated; without the condition, or without the row, it blocks', numOf(recRule, Vrule) === 0 && numOf(recBare, Vrule) === 1 && numOf(recNoRow, V) === 1, `${numOf(recRule, Vrule)} / ${numOf(recBare, Vrule)} / ${numOf(recNoRow, V)}`, '0 / 1 / 1');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
