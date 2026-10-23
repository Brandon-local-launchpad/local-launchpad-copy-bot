'use strict';
// Fixture: the GBP validator (gbp/validator.js), one check per rule in
// prompts/GBP_Validator.md, pass and fail. No API calls.
const path = require('path');
const root = path.join(__dirname, '../..');
const V = require(path.join(root, 'gbp/validator.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: GBP validator ===\n');

// Text of an exact length from safe sentences (no banned phrases, dashes, digits)
const SAFE = ['We lay patios and paths in Southampton gardens.', 'Each job starts with a visit and a written quote.', 'The team clears the ground, sets the base and lays the stone.', 'Edges are cut clean and the waste goes with us.', 'Call us for a visit this week.'];
function text(n) {
  let out = '';
  for (let i = 0; out.length < n; i++) out += (out ? ' ' : '') + SAFE[i % SAFE.length];
  return out.slice(0, n).replace(/\s+\S*$/, m => ' '.repeat(m.length)).replace(/ +$/, s => 'x'.repeat(s.length));
}
const cv = { company_name: 'Edens Edge Landscaping', insurance_cover: '5m', year_founded: '2015', guarantee_years: '', verified_logos: [], materials_methods: ['Indian sandstone'] };
const locked = [{ category: 'Gardener', service: 'Lawn mowing' }, { category: 'Gardener', service: 'Fencing' }, { category: 'Tree Service', service: 'Tree planting' }];
const ctx = { locked, minServices: 20, competitorCount: 19, showPrices: false, towns: ['Southampton', 'Romsey', 'Hedge End'], cv };
const rules = r => r.issues.map(i => `${i.level}:${i.rule}`).join(',');
const has = (r, rule, level = 'FAIL') => r.issues.some(i => i.rule === rule && i.level === level);

// ── Lengths ──
let r = V.validateDescription(text(735), ctx);
chk('description of 735 characters passes', r.ok, rules(r), 'ok');
r = V.validateDescription(text(719), ctx);
chk('description of 719 characters fails (length)', !r.ok && has(r, 'length') && /719 characters; it needs 720 to 750/.test(r.fails[0].message), rules(r) + ' ' + r.fails.map(f => f.message).join(), 'length');
r = V.validateDescription(text(751), ctx);
chk('description of 751 characters fails (length)', !r.ok && has(r, 'length'), rules(r), 'length');
chk('counting is by character, not byte (£ and accents count once)', V.count('café £5') === 7, V.count('café £5'), 7);

const svc = (service, type, category = 'Gardener', description = text(250)) => ({ category, service, type, description });
const twenty = () => [...locked.map(l => svc(l.service, 'LOCKED', l.category)), ...Array.from({ length: 17 }, (_, i) => svc(`Variant ${i + 1}`, 'VARIANT'))];
r = V.validateServices(twenty(), ctx);
chk('services: 3 locked + 17 variants at 250 characters pass', r.ok && r.counts.total === 20, rules(r) + ' ' + JSON.stringify(r.counts), 'ok, 20');
let list = twenty(); list[0].description = text(199);
r = V.validateServices(list, ctx);
chk('service description of 199 characters fails', !r.ok && has(r, 'length') && r.fails[0].field === 'Lawn mowing', rules(r), 'length on Lawn mowing');
list = twenty(); list[5].description = text(301);
chk('service description of 301 characters fails', !V.validateServices(list, ctx).ok, '', 'fail');
list = twenty(); list[5].description = text(200); list[6].description = text(300);
chk('200 and 300 pass (inclusive)', V.validateServices(list, ctx).ok, rules(V.validateServices(list, ctx)), 'ok');

const prod = (service, title, description = text(800)) => ({ service, title, description });
const products = () => [prod('Lawn mowing', 'Lawn Mowing'), prod('Fencing', 'Fencing'), prod('Tree planting', 'Tree Planting')];
r = V.validateProducts(products(), ctx);
chk('products: one per locked service, titles short, 800 characters, pass', r.ok, rules(r), 'ok');
let P = products(); P[0].title = 'L'.repeat(59);
chk('product title of 59 characters fails', has(V.validateProducts(P, ctx), 'length'), '', 'length');
P = products(); P[0].title = 'Lawn Mowing And Lawn Care For Every Garden In The Area Done'.slice(0, 58);
chk('product title of 58 characters passes', P[0].title.length === 58 && V.validateProducts(P, ctx).ok, P[0].title.length + ' ' + rules(V.validateProducts(P, ctx)), '58 ok');
P = products(); P[1].description = text(599);
chk('product description of 599 characters fails', has(V.validateProducts(P, ctx), 'length'), '', 'length');
P = products(); P[1].description = text(1001);
chk('product description of 1001 characters fails', has(V.validateProducts(P, ctx), 'length'), '', 'length');

// ── Services rules ──
list = twenty().filter(s => s.service !== 'Fencing'); list.push(svc('Variant 18', 'VARIANT'));
r = V.validateServices(list, ctx);
chk('a missing locked service fails', has(r, 'locked-missing') && /"Fencing" is missing/.test(r.fails.find(f => f.rule === 'locked-missing').message), rules(r), 'locked-missing');
list = twenty(); list[1].service = 'Fence installation';
r = V.validateServices(list, ctx);
chk('a renamed locked service fails (as missing, and the new name as an unknown LOCKED)', has(r, 'locked-missing') && has(r, 'locked-unknown'), rules(r), 'locked-missing + locked-unknown');
list = twenty(); list[1].service = 'fencing';
r = V.validateServices(list, ctx);
chk('a locked name with its case changed fails (name unchanged)', has(r, 'locked-renamed'), rules(r), 'locked-renamed');
list = twenty(); list[1].type = 'VARIANT';
r = V.validateServices(list, ctx);
chk('a locked service marked VARIANT fails', has(r, 'locked-missing') && /marked VARIANT/.test(r.fails[0].message), r.fails[0].message, 'marked VARIANT');
list = twenty(); list[2].category = 'Gardener';
r = V.validateServices(list, ctx);
chk('a locked service under the wrong category fails', has(r, 'locked-category'), rules(r), 'locked-category');
list = twenty(); list.push(svc('Lawn mowing', 'VARIANT', 'Tree Service'));
r = V.validateServices(list, ctx);
chk('the same service under two categories fails', has(r, 'duplicate') && /two categories/.test(r.fails.find(f => f.rule === 'duplicate').message), rules(r), 'duplicate (two categories)');
list = twenty(); list.push(svc('Variant 3', 'VARIANT'));
r = V.validateServices(list, ctx);
chk('the same service twice under one category fails', has(r, 'duplicate') && /appears twice/.test(r.fails.find(f => f.rule === 'duplicate').message), rules(r), 'duplicate (twice)');
list = twenty().slice(0, 19);
r = V.validateServices(list, ctx);
chk('19 services fail the count (minimum 20)', has(r, 'count') && /19 services; the target is at least 20/.test(r.fails[0].message), r.fails.map(f => f.message).join(), 'count');
r = V.validateServices(twenty(), { ...ctx, minServices: 35, competitorCount: 34 });
chk('20 services fail when competitors average 34 (target 35)', has(r, 'count') && /at least 35 \(competitors list 34/.test(r.fails[0].message), r.fails.map(f => f.message).join(), 'count 35');
list = [...twenty(), ...Array.from({ length: 15 }, (_, i) => svc(`Extra ${i + 1}`, 'VARIANT'))];
chk('35 services pass that target', V.validateServices(list, { ...ctx, minServices: 35, competitorCount: 34 }).ok, '', 'ok');
list = twenty(); list[3].category = 'Paving Contractor';
r = V.validateServices(list, ctx);
chk('a variant under a category with no locked parent fails', has(r, 'variant-category'), rules(r), 'variant-category');
list = twenty(); list[3].type = 'EXTRA';
chk('a type other than LOCKED or VARIANT fails', has(V.validateServices(list, ctx), 'type'), '', 'type');
list = twenty(); list[3].service = 'Hedge-cutting';
chk('a variant name with a hyphen fails', has(V.validateServices(list, ctx), 'no-dash'), '', 'no-dash');
const ctxHy = { ...ctx, locked: [...locked, { category: 'Gardener', service: 'Re-turfing' }] };
list = [...twenty(), svc('Re-turfing', 'LOCKED')];
chk('a locked name that itself has a hyphen is exempt (the site\'s own name)', V.validateServices(list, ctxHy).ok, rules(V.validateServices(list, ctxHy)), 'ok');

// ── Content rules ──
const d = s => V.validateDescription(s, ctx);
chk('phone number in the description fails', has(d(text(700) + ' Call 023 8000 1234 now.'), 'no-phone'), '', 'no-phone');
chk('mobile number fails', has(d(text(700) + ' Call 07850 412717 today.'), 'no-phone'), '', 'no-phone');
chk('email fails', has(d(text(705) + ' Email hello@edensedge.co.uk.'), 'no-email'), '', 'no-email');
chk('URL fails', has(d(text(710) + ' See www.edensedge.co.uk.'), 'no-url'), '', 'no-url');
chk('bare domain fails', has(d(text(715) + ' See edensedge.co.uk now.'), 'no-url'), '', 'no-url');
chk('hyphen fails and is named', (() => { const x = d(text(710) + ' Family-run and local here.'); return has(x, 'no-dash') && /hyphen/.test(x.fails.find(f => f.rule === 'no-dash').message); })(), '', 'no-dash hyphen');
chk('en dash fails and is named', /en dash/.test((d(text(715) + ' Patios – paths too.').fails.find(f => f.rule === 'no-dash') || {}).message), '', 'en dash');
chk('em dash fails and is named', /em dash/.test((d(text(715) + ' Patios — paths too.').fails.find(f => f.rule === 'no-dash') || {}).message), '', 'em dash');
chk('a service description with a URL fails', (() => { const l = twenty(); l[0].description = text(230) + ' See www.example.com.'; return has(V.validateServices(l, ctx), 'no-url'); })(), '', 'no-url');
P = products(); P[0].description = text(780) + ' Patios from £1,200 each.';
chk('£ in a product fails when show_prices is off', has(V.validateProducts(P, ctx), 'no-prices'), rules(V.validateProducts(P, ctx)), 'no-prices');
P = products(); P[0].description = text(780) + ' Lawn care at 30 per visit.';
chk('"30 per" in a product fails when show_prices is off', has(V.validateProducts(P, ctx), 'no-prices'), '', 'no-prices');
P = products(); P[0].description = text(780) + ' Patios from £1,200 each.';
chk('£ in a product passes when show_prices is on', !has(V.validateProducts(P, { ...ctx, showPrices: true }), 'no-prices'), rules(V.validateProducts(P, { ...ctx, showPrices: true })), 'no no-prices');
chk('£ in the description is a fact flag, not a price fail (prices are a products rule)', (() => { const x = d(text(710) + ' Insured up to £5m.'); return !has(x, 'no-prices') && !has(x, 'fact-insurance', 'FLAG') && x.ok; })(), rules(d(text(710) + ' Insured up to £5m.')), 'ok');
P = products(); P[0].title = 'Lawn Mowing Southampton';
chk('a town in a product title fails', has(V.validateProducts(P, ctx), 'no-town-in-title'), '', 'no-town-in-title');
P = products(); P[0].title = 'Lawn Mowing in Hedge End';
chk('a two word town in a product title fails', has(V.validateProducts(P, ctx), 'no-town-in-title'), '', 'no-town-in-title');
P = products(); P[0].description = text(780) + ' We cover Southampton and Romsey.';
chk('a town in a product description is fine', V.validateProducts(P, ctx).ok, rules(V.validateProducts(P, ctx)), 'ok');
chk('capitals for emphasis fail', has(d(text(720) + ' We are the LOCAL choice.'), 'no-caps'), '', 'no-caps');
chk('UK, VAT and acronyms in the client values pass', d(text(700) + ' UK trade, VAT included, MDF too.').ok, rules(d(text(700) + ' UK trade, VAT included, MDF too.')), 'ok');
chk('an acronym from the client record passes (RHS in verified_logos)', !has(V.validateDescription(text(710) + ' We are RHS members now.', { ...ctx, cv: { ...cv, verified_logos: [{ name: 'RHS' }] } }), 'no-caps'), '', 'no no-caps');
chk('banned phrase "peace of mind" fails, case insensitive', (() => { const x = d(text(705) + ' Total Peace Of Mind for you.'); return has(x, 'banned-phrase') && /peace of mind/.test(x.fails.find(f => f.rule === 'banned-phrase').message); })(), '', 'banned-phrase');
chk('"best" fails (a whole word)', has(d(text(715) + ' The best patios in town.'), 'banned-phrase'), '', 'banned-phrase');
chk('"bested" or "asbestos" does not trip "best"', !has(d(text(705) + ' We remove asbestos sheet roofs.'), 'banned-phrase'), rules(d(text(705) + ' We remove asbestos sheet roofs.')), 'no banned-phrase');
chk('"hassle free" fails', has(d(text(710) + ' A hassle free service here.'), 'banned-phrase'), '', 'banned-phrase');
chk('the banned list comes from GBP_Validator.md (19 phrases, "dedicated team" among them)', V.loadBannedPhrases().length === 19 && V.loadBannedPhrases().includes('dedicated team'), V.loadBannedPhrases().length, 19);

// ── Facts: FLAG, never FAIL ──
let x = d(text(700) + ' Trading since 2015, insured up to £5m.');
chk('a year and an insurance figure in the client values: no flag', x.ok && !x.flags.length, rules(x), 'clean');
x = d(text(705) + ' Trading since 2009 in the city.');
chk('a year not in the client values: FLAG, still ok', x.ok && has(x, 'fact-year', 'FLAG'), rules(x), 'FLAG:fact-year');
x = d(text(700) + ' Over 25 years of garden work here.');
chk('"25 years" not in the client values: FLAG', x.ok && has(x, 'fact-years', 'FLAG'), rules(x), 'FLAG:fact-years');
x = d(text(700) + ' Eleven years of garden work here.');
chk('"eleven years" matching year_founded 2015: no flag', !has(x, 'fact-years', 'FLAG'), rules(x), 'no flag');
x = d(text(700) + ' We are Checkatrade members here.');
chk('an accreditation not in the client values: FLAG', has(x, 'fact-accreditation', 'FLAG'), rules(x), 'FLAG:fact-accreditation');
x = V.validateDescription(text(700) + ' We are Checkatrade members here.', { ...ctx, cv: { ...cv, verified_logos: [{ name: 'Checkatrade' }] } });
chk('an accreditation in verified_logos: no flag', !has(x, 'fact-accreditation', 'FLAG'), rules(x), 'no flag');
x = d(text(700) + ' Insured up to £2m for every job.');
chk('an insurance figure that differs from insurance_cover: FLAG', has(x, 'fact-insurance', 'FLAG'), rules(x), 'FLAG:fact-insurance');
x = d(text(700) + ' Every patio has a ten year guarantee.');
chk('a guarantee with none in the client values: FLAG', has(x, 'fact-guarantee', 'FLAG'), rules(x), 'FLAG:fact-guarantee');
x = V.validateDescription(text(700) + ' Every patio has a ten year guarantee.', { ...ctx, cv: { ...cv, guarantee_years: '10' } });
chk('a guarantee matching guarantee_years: no flag', !x.flags.length, rules(x), 'clean');
x = V.validateDescription(text(700) + ' Fully insured for every job we do.', { ...ctx, cv: { ...cv, insurance_cover: '' } });
chk('"insured" with insurance_cover blank: FLAG', has(x, 'fact-insurance', 'FLAG'), rules(x), 'FLAG');
list = twenty(); list[0].description = text(235) + ' Checkatrade approved.';
r = V.validateServices(list, ctx);
chk('facts are flagged on service descriptions too, and the step still passes', r.ok && r.flags.length === 1 && r.flags[0].field === 'Lawn mowing', rules(r), 'ok + 1 flag');
P = products(); P[2].description = text(770) + ' Done in 2008 for the council.';
r = V.validateProducts(P, ctx);
chk('and on product descriptions', r.ok && has(r, 'fact-year', 'FLAG') && r.flags[0].field === 'Tree planting', rules(r), 'ok + flag');

// ── Products rules ──
P = products().slice(0, 2);
chk('a locked service with no product fails', has(V.validateProducts(P, ctx), 'product-missing'), '', 'product-missing');
P = [...products(), prod('Garden design', 'Garden Design')];
chk('a product for a service that is not locked fails', has(V.validateProducts(P, ctx), 'product-unknown'), '', 'product-unknown');
P = [...products(), prod('Fencing', 'Fencing Again')];
chk('two products for one service fail', has(V.validateProducts(P, ctx), 'duplicate'), '', 'duplicate');
P = products(); P[0].title = 'Lawn Mowing & Care';
chk('a symbol in a title is allowed by code (the prompt forbids it; the validator rules do not)', !has(V.validateProducts(P, ctx), 'no-dash'), '', 'no no-dash');
P = products(); P[0].title = 'Lawn Mowing - Weekly';
chk('a hyphen in a title fails', has(V.validateProducts(P, ctx), 'no-dash'), '', 'no-dash');

// ── Round 2 (Brandon's review, 23 Oct) ──
// Near duplicate names
list = [...twenty(), svc('Garden design', 'VARIANT'), svc('Garden designs', 'VARIANT')];
r = V.validateServices(list, ctx);
chk('two names that differ by a plural fail, the pair reported', has(r, 'near-duplicate') && /"Garden design" and "Garden designs"/.test(r.fails.find(f => f.rule === 'near-duplicate').message), r.fails.map(f => f.message).join(), 'pair');
list = [...twenty(), svc('Landscape design', 'VARIANT'), svc('Custom landscape design', 'VARIANT')];
chk('"Custom landscape design" and "Landscape design" fail', has(V.validateServices(list, ctx), 'near-duplicate'), '', 'near-duplicate');
list = [...twenty(), svc('Decking installation', 'VARIANT'), svc('Installation decking', 'VARIANT')];
chk('word order only: fail', has(V.validateServices(list, ctx), 'near-duplicate'), '', 'near-duplicate');
list = [...twenty(), svc('Lawn mowing services', 'VARIANT')];
r = V.validateServices(list, ctx);
chk('a variant that is a locked name plus "services" fails', has(r, 'near-duplicate') && /"Lawn mowing" and "Lawn mowing services"/.test(r.fails.find(f => f.rule === 'near-duplicate').message), r.fails.map(f => f.message).join(), 'pair');
list = [...twenty(), svc('Garden work', 'VARIANT'), svc('Gardening', 'VARIANT')];
chk('"Garden work" and "Gardening" are different words: no fail', !has(V.validateServices(list, ctx), 'near-duplicate'), '', 'ok');
chk('nameKey: plural, order and the dropped words collapse', V.nameKey('Custom Garden Designs') === V.nameKey('garden design work') && V.nameKey('Bespoke fencing services') === 'fencing', V.nameKey('Custom Garden Designs') + ' / ' + V.nameKey('Bespoke fencing services'), '');
const ctxLL = { ...ctx, locked: [...locked, { category: 'Gardener', service: 'Fencing work' }] };
list = [...twenty(), svc('Fencing work', 'LOCKED')];
r = V.validateServices(list, ctxLL);
chk('two locked names that collide are a FLAG (the page map\'s fix), not a FAIL', r.ok && has(r, 'near-duplicate', 'FLAG'), rules(r), 'FLAG only');

// Category phrasing in the description
const ctxC = { ...ctx, categories: ['Landscaper', 'Gardener', 'Landscape Gardener', 'Landscape Designer', 'Tree Service', 'Paving Contractor', 'Deck Builder'] };
const dc = s => V.validateDescription(s, ctxC);
r = dc(text(680) + ' As gardeners, we handle lawn mowing too.');
chk('"As [category], we" fails', has(r, 'category-opener'), rules(r), 'category-opener');
r = dc(text(680) + ' As a tree service we remove tree stumps.');
chk('"As a [category] we" (no comma) fails', has(r, 'category-opener'), rules(r), 'category-opener');
r = dc(text(660) + ' Our landscape gardeners lay patios. The tree service side removes stumps.');
chk('categories named inside sentences, one each, pass', r.ok && !has(r, 'category-opener') && !has(r, 'category-per-sentence'), rules(r), 'ok');
r = dc(text(660) + ' Our landscape gardeners and deck builders lay patios and fit decking.');
chk('two categories in one sentence fail, both named', has(r, 'category-per-sentence') && /Landscape Gardener, Deck Builder|Deck Builder, Landscape Gardener/.test(r.fails.find(f => f.rule === 'category-per-sentence').message), r.fails.map(f => f.message).join(), 'two named');
r = dc(text(680) + ' Our landscape gardeners lay patios in the garden.');
chk('"landscape gardeners" counts as one category, not Gardener as well', !has(r, 'category-per-sentence'), rules(r), 'ok');
chk('no categories in the context: no category checks', V.validateDescription(text(680) + ' As gardeners, we handle lawn mowing too.', ctx).ok, '', 'ok');

// Proof point share
const pp = [{ text: 'free quotes', detect: /free quote/i }, { text: 'a team of 4', detect: t => /team of/i.test(t) }];
list = twenty(); list.slice(0, 5).forEach(s => { s.description = text(230) + ' Free quotes for every job.'; });
r = V.validateServices(list, { ...ctx, proofPoints: pp });
chk('a proof point in 5 of 20 descriptions (25%) passes', r.ok, rules(r), 'ok');
list = twenty(); list.slice(0, 6).forEach(s => { s.description = text(230) + ' Free quotes for every job.'; });
r = V.validateServices(list, { ...ctx, proofPoints: pp });
chk('a proof point in 6 of 20 (30%) fails, naming the phrase and the count', has(r, 'proof-share') && /"free quotes" appears in 6 of 20/.test(r.fails[0].message), r.fails.map(f => f.message).join(), 'proof-share');
list = twenty(); list.slice(0, 8).forEach(s => { s.description = text(225) + ' A team of four does the work.'; });
chk('a function detector works the same', has(V.validateServices(list, { ...ctx, proofPoints: pp }), 'proof-share'), '', 'proof-share');
chk('no proof points in the context: no share check', V.validateServices(list, ctx).ok, '', 'ok');

// Areas in a product
P = products(); P[0].description = text(700) + ' We cover Southampton, Romsey, Hedge End, Winchester, Eastleigh, Totton and Fareham.';
r = V.validateProducts(P, { ...ctx, towns: ['Southampton', 'Romsey', 'Hedge End', 'Winchester', 'Eastleigh', 'Totton', 'Fareham', 'Lyndhurst'] });
chk('a product naming 7 areas fails', has(r, 'too-many-areas') && /names 7 areas/.test(r.fails[0].message), r.fails.map(f => f.message).join(), 'too-many-areas');
P = products(); P[0].description = text(700) + ' We cover Southampton, Romsey, Hedge End, Winchester, Eastleigh and Totton.';
chk('six areas pass', V.validateProducts(P, { ...ctx, towns: ['Southampton', 'Romsey', 'Hedge End', 'Winchester', 'Eastleigh', 'Totton', 'Fareham', 'Lyndhurst'] }).ok, '', 'ok');

// ── Empty answers ──
chk('an empty description fails', has(V.validateDescription('', ctx), 'missing'), '', 'missing');
chk('no services fails', has(V.validateServices([], ctx), 'missing'), '', 'missing');
chk('no products fails', has(V.validateProducts([], ctx), 'missing'), '', 'missing');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
