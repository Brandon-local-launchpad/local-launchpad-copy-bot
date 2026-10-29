'use strict';

// ── Blog post decisions: B2 to B15 and the gates (Blog Post Structure, Amendment 1) ──
// Code makes every decision for one post from its page map row (the queue, blog/queue.js),
// the client values, the niche entry's blog slots, the held research questions or the bank's
// related questions, the price rows, the trade facts rows for the service, the town's
// dossier, the allocation record and the pages already written. No model calls. Returns
// { gates, flags, decisions, decisionsBlock } in the service page's shape, so the shared
// pipeline (parser, record, validator, retries, reader, store) runs unchanged.
//
//   row          the blog page map row: slug, h1, info (post_type, question_id, stack, faq, primary_link, …)
//   cv, niche, keyValueMap, pages (the context's rows: pageType, pageTitle, urlSlug, status, h1)
//   questions    the sorted research questions by id (a held topic's target, stack and FAQ)
//   priceRows    client_price_rows (the price list, Amendment 1)
//   tradeFacts   { verified, rows: [{ kind, name, text }], niche } for the post's service, or null
//   dossier      the town's parsed dossier (geo-dossier.js parseDossier) or null
//   ideasUsed    [{ page, text }] the ideas the homepage, the primary page and the earlier posts made
//   blogRows     every blog row of the client (B8's secondary link: a live cost guide for the service)
//   today        'YYYY-MM-DD' (B14), injectable for the tests

const { getLinkStatus, isLinkable } = require('../decisions');
const { bylineFor, matchPrices } = require('./inputs');
const { blocksFor } = require('./blocks');
const { titleCase, question } = require('./topics');
const { costGuideH2s, loadStructure } = require('./cost-guide');
const SQ = require('./same-question');
const LIB = require('../niche-library/library');
const MONTH_RE = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter)\b/i;
const PT = require('../page-types/blog');
const { CV_KEYS } = require('../v20-generate');

const lc = s => String(s || '').toLowerCase().trim();
const norm = s => lc(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BANNED_TITLE = /\bultimate guide\b|\beverything you need to know\b|\b20\d\d\b/i;
const DOUBT_BRIEF = {
  Fit: 'which situations it suits and which it does not, from the facts',
  Process: 'how it is done, step by step, from the trade facts and the client\'s confirmed practices',
  Price: 'what moves the price, in the facts\' words; a figure only from the PRICE rows',
  Timing: 'how long it takes or when it is done, from the trade facts; one timing on the post',
  Trust: 'what protects the reader: the rule, the check or the cover, as what usually applies',
};
// "Is X or Y better", "Should I choose X or Y for my patio": the two options
const DECISION_RE = /^(?:is |are |should i (?:choose |use |go for |lay |pick |have )?)?(.+?) or (.+?)(?:[,:?]| for | which | better| best|$)/i;
// The option is the thing chosen, not the verb round it: "it better to lay turf" → turf, "sow grass seed" → grass seed, "replace it" → replace
const cleanOption = x => lc(x).replace(/^(?:(?:it|is|better|to|lay|sow|choose|use|go|for|pick|have|install|build|fit|get|put|a|an|the|my|your|our|new|some)\s+)+/, '').replace(/\s+(?:it|them|one|instead|myself|yourself|for me)$/, '').replace(/\b(?:my|your|our|the|a|an)\s+/g, '').trim();
// The two options a decision question names, as the post and Table H name them; null when it names
// no pair. "X better than Y", "X vs Y" and "X or Y" all name one; the question's own stem ("can my",
// "should I", "do I need") and what hangs off an option ("be repaired" → repaired, "does it need
// replacing" → replacing) are not part of the name; an acronym keeps its capitals (EPDM, GRP, uPVC).
const BETTER_RE = /^(?:is |are )?(.+?) (?:better than|cheaper than|vs\.?|versus) (.+?)(?:[,:?]| for | in | on |$)/i;
const QUESTION_STEM_RE = /^(?:(?:can|could|should|do|does|is|are|will|would|must)\s+(?:i|we|you|it|my|our|your|the|a|an|this|that)\s+)+(?:(?:need|have|want)\s+(?:to\s+)?)?/i;
const HANGING_RE = /^(?:(?:does|do|will|would|should)\s+(?:it|i|we|they)\s+)?(?:need\s+(?:to\s+)?|have\s+to\s+|be\s+|get\s+|have\s+(?:it\s+)?)+/i;
const keepAcronyms = (name, original) => name.split(' ').map(w => { const o = String(original || '').split(/\s+/).find(x => x.replace(/[^a-z]/gi, '').toLowerCase() === w.toLowerCase().replace(/[^a-z]/g, '')); return o && /^[A-Za-z]*[A-Z]{2,}[A-Za-z]*$/.test(o.replace(/[^A-Za-z]/g, '')) && o.replace(/[^A-Za-z]/g, '').length <= 5 ? o.replace(/[^A-Za-z]/g, '') : w; }).join(' ');
function optionsOf(wording) {
  const raw = String(wording || '').trim();
  const stripped = raw.replace(QUESTION_STEM_RE, '');
  const m = stripped.match(BETTER_RE) || stripped.match(DECISION_RE) || raw.match(DECISION_RE);
  if (!m) return null;
  return [m[1], m[2]].map(x => {
    let o = lc(x).replace(/[,.;:]+\s*$/, '').replace(/^[,.;:]+\s*/, '').trim();
    o = o.replace(QUESTION_STEM_RE, '').replace(HANGING_RE, '');
    // "lead flashing be repaired" → repaired: the thing after "be"
    if (/\bbe\s+\w+$/.test(o) && o.split(' ').length > 2) o = o.replace(/^.*\bbe\s+/, '');
    const name = titleCase(cleanOption(o) || o || lc(x.trim()));
    return keepAcronyms(name, x);
  });
}
// A dossier symptom that reads as a sign of a condition, not a description of the plot
const SYMPTOM_RE = /\b(?:water|puddle|pool|sits|sitting|standing|boggy|soggy|waterlogg|damp|moss|thin|bare|patch|yellow|brown|dies|dying|dead|crack|lift|rock|sink|slip|slump|wobbl|lean|rot|flood|drain|dries|hard|compact|weed|algae|slime|heave|subsid|sag|loose|gap|erod|wash)\w*\b/i;
const TABLE_COLUMNS = {
  local:      ['Sign', 'Likely cause', 'Usual fix'],
  cost_guide_factors: ['Job', 'What affects the price'],
  cost_guide: ['Job', 'Typical price', 'What affects it'],
  decision:   ['Option', 'Suits', 'Cost level', 'Upkeep'],
  question:   ['Cause', 'Sign', 'Fix'],
  rules:      ['Situation', 'Usually needs permission?'],
};
const SAFETY_RE = /\b(gas|boiler|flue|electric|electrical|electrics|wiring|rewire|socket|consumer unit|structural|structure|load bearing|joist|truss|chimney|asbestos)\b/i;
const RULE_RE = /\b(planning|permission|permitted|regulations?|building control|consent|licence|license|tpo|preservation order|conservation)\b/i;

const addMonths = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const longDate = iso => { const d = new Date(`${iso}T00:00:00Z`); return `${d.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

// B3: the H1 from the approved wording, title case, the city added when the question names
// no town and there is room; 70 characters at most, over that the city is dropped
function h1For(wording, { city, town, postType }) {
  const base = question(wording);
  if (!base) return { h1: '', withCity: false, namesPlace: false };
  // The question already names the city or the town (a named town for B9), or the country (no city added)
  const namesPlace = !!((city && new RegExp(`\\b${esc(city)}\\b`, 'i').test(base)) || (town && new RegExp(`\\b${esc(town)}\\b`, 'i').test(base)));
  const hasPlace = namesPlace || /\b(uk|england)\b/i.test(base);
  if (postType !== 'local' && city && !hasPlace) {
    const withCity = `${base.replace(/\?$/, '')} in ${city}?`;
    if (withCity.length <= 70) return { h1: withCity, withCity: true, namesPlace: true };
  }
  return { h1: base, withCity: false, namesPlace };
}

// B4: "[H1 without ?] | [company]" at 60 at most; over, the company goes; still over, the target query's words
function seoTitleFor(h1, cv, targetQuery) {
  const bare = h1.replace(/\?$/, '');
  const full = `${bare} | ${cv.company_name}`;
  if (full.length <= 60) return { title: full, how: 'h1 and company' };
  if (bare.length <= 60) return { title: bare, how: 'h1 alone' };
  // Still over: the H1 without its place clause, then the target query's keyword words (the
  // question frame out), then a cut at a word boundary (Brandon, 28 Oct: never over 60)
  const noPlace = bare.replace(/\s+(?:in|across|around|near)\s+[A-Z][\w' ]+$/, '');
  if (noPlace !== bare && noPlace.length <= 60) return { title: noPlace, how: 'h1 without the place' };
  const FRAME = /\b(?:why|does|do|did|is|are|was|were|can|could|should|would|will|what|how|when|where|which|who|my|your|our|the|a|an|i|you|it|to|for|of|in|on|at|and|or|after|before|with|from|there|this|that|get|much|many)\b/gi;
  const kw = titleCase(String(targetQuery || bare).replace(FRAME, ' ').replace(/\s+/g, ' ').trim());
  if (kw.length <= 60 && kw.length >= 20) return { title: kw, how: 'the target query\'s keyword words' };
  const cut = (kw.length >= 20 ? kw : bare).slice(0, 60).replace(/\s+\S*$/, '');
  return { title: cut, how: 'cut at 60', tooLong: false };
}

// B9: the six specificity facts
function specificity({ price, town, condition, customerWords, process, methods }) {
  const items = [
    ['a price for the service', !!price], ['a named town', !!town], ['a dossier condition', !!condition],
    ['the customer question in their own words', !!customerWords], ['a confirmed process or proof', !!process], ['named methods or symptoms from the trade facts', !!methods],
  ];
  return { count: items.filter(i => i[1]).length, have: items.filter(i => i[1]).map(i => i[0]), missing: items.filter(i => !i[1]).map(i => i[0]) };
}

function computeBlogDecisions({ row, cv = {}, niche = {}, keyValueMap = {}, pages = [], questions = new Map(), priceRows = [], tradeFacts = null, dossier = null, ideasUsed = [], usedQuestions = [], blogRows = [], optionRows = null, optionFacts = null, today = new Date().toISOString().slice(0, 10) } = {}) {
  const gates = [];
  const flags = [];
  const info = (row && row.info) || {};
  const postType = PT.POST_TYPES.includes(info.post_type) ? info.post_type : null;
  if (!row || row.type !== 'blog' || !postType) {
    gates.push({ code: 'G-PAGE', msg: 'Not a blog row, or its post type is not one of cost_guide, decision, question, local.' });
    return { gates, flags, decisions: null, decisionsBlock: null };
  }
  const city = String(keyValueMap.biz_area_1 || '').trim();
  const town = postType === 'local' ? (info.town || city) : '';
  const slots = blocksFor({ niche, cv });
  const wording = String(info.wording || row.h1 || '').trim();
  const source = info.source || 'faq_research';

  // ── Gates ──
  if (!wording) gates.push({ code: 'G-TOPIC', msg: `${row.slug}: no target question.` });
  else if (!info.wording_approved) gates.push({ code: 'G-TOPIC', msg: `${row.slug}: the question "${wording}" is not approved yet (${info.needs_approval ? 'written by code: approve or edit it on the queue' : 'approve it on the FAQ card'}).` });
  if (!cv.company_name || !cv.phone) gates.push({ code: 'G-INPUT', msg: `${!cv.company_name ? 'company_name' : 'phone'} is blank in client values.` });
  const needsPack = ['question', 'decision', 'cost_guide'].includes(postType);
  if (needsPack && !(tradeFacts && tradeFacts.verified)) gates.push({ code: 'G-FACTS', msg: `${row.slug}: the trade facts pack for ${(tradeFacts && tradeFacts.niche) || niche._source || niche.trade || 'this niche'} is ${tradeFacts ? 'not verified' : 'missing'}; the post waits (local posts run without it).` });

  // ── B8: the links ──
  const linkable = pages.filter(p => isLinkable(p));
  const byUrl = u => pages.find(p => norm(p.urlSlug) === norm(u)) || null;
  const servicePage = info.service_slug ? byUrl(info.service_slug) : null;
  const categoryPage = info.category_slug ? byUrl(info.category_slug) : null;
  let primary;
  if (info.homepage_cost_guide) primary = { url: '/', name: 'the homepage', type: 'homepage', status: 'Live' };
  else if (servicePage) primary = { url: servicePage.urlSlug, name: servicePage.pageTitle, type: 'service', status: getLinkStatus(servicePage) };
  else if (categoryPage) primary = { url: categoryPage.urlSlug, name: categoryPage.pageTitle, type: 'category', status: getLinkStatus(categoryPage) };
  else primary = { url: '/#services', name: 'the homepage services section', type: 'homepage', status: 'Live' };
  if (!['Live', 'Launching'].includes(primary.status)) gates.push({ code: 'G-PRIMARY', msg: `${row.slug}: the primary link page ${primary.url} is ${primary.status}; the post waits until it is Live or Launching.` });
  const secondary = [];
  if (postType !== 'cost_guide' && info.service_slug) {
    const guide = blogRows.find(r => r.slug !== row.slug && r.applies !== false && r.info && r.info.post_type === 'cost_guide' && r.info.service_slug === info.service_slug && r.status === 'Live');
    if (guide) secondary.push({ url: `${guide.slug}/`, name: guide.h1 || guide.title, type: 'cost guide' });
  }
  // The homepage cost guide links the live service cost guides, each once, in H2 1 (the structure)
  if (info.homepage_cost_guide) for (const g of blogRows.filter(r => r.slug !== row.slug && r.applies !== false && r.info && r.info.post_type === 'cost_guide' && r.info.service_slug && r.status === 'Live')) secondary.push({ url: `${g.slug}/`, name: g.h1 || g.title, type: 'cost guide' });
  if (postType === 'local' && town) {
    const loc = pages.find(p => p.pageType === 'location' && norm(p.pageTitle) === norm(town) && isLinkable(p));
    const locCat = !loc && servicePage ? null : pages.find(p => p.pageType === 'location-category' && norm(p.locationName || '') === norm(town) && isLinkable(p));
    const pick = loc || locCat;
    if (pick) secondary.push({ url: pick.urlSlug, name: pick.pageTitle, type: pick.pageType });
  }

  // ── The facts this post may use ──
  // The UK page name from the services library, never the Google Business Profile name ("Turf laying", not "Sod installation")
  let lib = null;
  try { lib = LIB.loadLibrary(niche._source || require('../trade-facts/pack').packNameFor(niche.trade)); } catch (_) { lib = null; }
  const ukName = title => { const t = String(title || '').trim(); if (!lib || !t) return t; const e = (lib.rows || []).find(r => lc(r.gbp_name) === lc(t)); return e && e.target && e.verdict !== 'exclude' ? e.target : t; };
  const svcTitle = ukName(info.service || (servicePage && servicePage.pageTitle) || '');
  if (primary.type === 'service') primary.name = ukName(primary.name);
  const prices = matchPrices(servicePage ? [{ type: 'service', title: servicePage.pageTitle, slug: servicePage.urlSlug, applies: true, info: {} }] : [], priceRows);
  const priceList = (prices.services[0] && prices.services[0].rows.filter(r => r.usable)) || [];
  const costMode = postType === 'cost_guide' ? (priceList.length ? 'prices' : 'factors') : null;
  const facts = [];
  const fact = (id, kind, text, extra = {}) => facts.push({ id, kind, text, ...extra });
  // Client values, confirmed and filled, as [CV: key] tokens the model may state
  const cvAllowed = CV_KEYS.filter(k => !['phone', 'email', 'address', 'map_embed', 'owner_pronoun', 'owner_why', 'owner_promise', 'review_themes', 'jobs_wanted', 'typical_jobs'].includes(k) && !/^differentiator_[12]/.test(k) && cv[k] && String(cv[k]).trim && String(cv[k]).trim());
  for (const k of cvAllowed) fact(`CV-${k}`, 'client value', `[CV: ${k}] = ${Array.isArray(cv[k]) ? cv[k].join(', ') : String(cv[k])}`);
  if (cv.differentiator_1_confirmed && cv.differentiator_1) fact('CV-differentiator_1', 'client value', `[CV: differentiator_1] = ${cv.differentiator_1}`);
  if (cv.differentiator_2_confirmed && cv.differentiator_2) fact('CV-differentiator_2', 'client value', `[CV: differentiator_2] = ${cv.differentiator_2}`);
  const practices = Array.isArray(cv.confirmed_practices) ? cv.confirmed_practices : [];
  if (practices.length) { try { const { confirmedPractices } = require('../practices'); confirmedPractices(cv, niche).forEach((p, i) => fact(`PR-${i + 1}`, 'confirmed practice', p.claim)); } catch (_) { practices.forEach((p, i) => fact(`PR-${i + 1}`, 'confirmed practice', String(p).replace(/_/g, ' '))); } }
  priceList.forEach((r, i) => fact(`PRICE-${i + 1}`, 'price', `${r.service}: ${r.text}${r.what_moves_price ? ` (what moves it: ${r.what_moves_price})` : ''}`));
const tfRows = (tradeFacts && tradeFacts.verified && Array.isArray(tradeFacts.rows)) ? [...tradeFacts.rows] : [];
  // A decision post's two options (Brandon, 28 Oct): each needs two trade facts rows at least,
  // from the client's pack or the pack where the post's service lives (resin and block paving
  // from the driveways pack); otherwise the post is held (G-OPTIONS)
  const optionNames = postType === 'decision' ? optionsOf(wording) : null;
  const options = optionNames ? optionNames.map(name => ({ name, rows: [], pack: null })) : [];
  if (options.length) {
    const P = require('../trade-facts/pack');
    const findRows = optionRows || ((o, opts) => P.rowsForOption(o, opts));
    // Table H first (29 Oct): the pack's option facts behind this option, through the verified pack
    const findFacts = optionFacts || ((n, o) => P.rowsForOptionFacts(n, o));
    for (const o of options) {
      o.rows = tfRows.filter(r => P.mentionsOption(`${r.name || ''} ${r.text}`, P.optionStems ? P.optionStems(o.name) : [])).map(r => ({ ...r }));
      if (tradeFacts && tradeFacts.verified && tradeFacts.niche) {
        let hRows = [];
        try { hRows = findFacts(tradeFacts.niche, o.name) || []; } catch (e) { flags.push({ code: 'F-PACK-OTHER', msg: `${o.name}: the pack's Table H could not be read (${e.message}).` }); }
        for (const r of hRows) { if (o.rows.some(x => x.text === r.text)) continue; const row = { ...r }; o.rows.push(row); if (!tfRows.some(x => x.text === r.text)) tfRows.push(row); }
        if (hRows.length) o.pack = tradeFacts.niche;
      }
      if (o.rows.length < 2) {
        let found = { rows: [], niche: null };
        try { found = findRows(o.name, { first: tradeFacts && tradeFacts.niche, service: svcTitle }); } catch (e) { flags.push({ code: 'F-PACK-OTHER', msg: `${o.name}: the other packs could not be read (${e.message}).` }); }
        const extra = (found.rows || []).filter(r => !o.rows.some(x => x.text === r.text));
        if (extra.length && found.niche && found.niche !== (tradeFacts && tradeFacts.niche)) { flags.push({ code: 'F-PACK-OTHER', msg: `${o.name}: ${extra.length} row(s) from the ${found.niche} pack (the service lives there; check it is verified on the Trade facts page).` }); }
        for (const r of extra) { const row = { ...r, from_pack: found.niche }; o.rows.push(row); if (!tfRows.some(x => x.text === r.text)) tfRows.push(row); }
        o.pack = found.niche;
      }
    }
    const thin = options.filter(o => o.rows.length < 2);
    if (thin.length) gates.push({ code: 'G-OPTIONS', hold: true, msg: `${row.slug}: ${thin.map(o => `"${o.name}" has ${o.rows.length} trade facts row${o.rows.length === 1 ? '' : 's'}`).join(' and ')} (2 each needed, from the client's pack or the pack where the service lives). The post is held until a pack covers both options.` });
  }
  // A seasonal post's window from the v2 bank's ST block (Brandon, 28 Oct): a sourced timing row,
  // so the answer's timing, the "When …" wording and B-TIMING read it like a trade facts row
  const bankWindow = info.bank_window && info.bank_window.text ? info.bank_window : null;
  if (bankWindow) tfRows.push({ kind: 'timing', name: `${svcTitle || info.pack_service || 'the job'} window`, text: bankWindow.text, from_bank: bankWindow.id, source_url: bankWindow.url || '' });
  tfRows.forEach((r, i) => fact(`TF-${i + 1}`, r.from_bank ? `seasonal window (the bank's ${r.from_bank}, sourced)` : `trade facts ${r.kind}${r.from_pack ? ` (${r.from_pack} pack)` : ''}`, `${r.name ? `${r.name}: ` : ''}${r.text}${r.source_url ? ` (source: ${r.source_url})` : ''}`, { rowKind: r.kind, name: r.name || '' }));
  const condition = info.dossier_condition || null;
  let dossierRows = [];
  if (dossier) {
    const issue = condition ? (dossier.issues || []).find(i => i.id === condition.id) : null;
    if (issue) { dossierRows.push({ id: issue.id, kind: 'dossier condition', text: `${issue.title}: ${issue.detail || ''}` }); for (const s of (dossier.symptoms || []).filter(x => x.issueId === issue.id).slice(0, 3)) dossierRows.push({ id: s.id, kind: 'dossier symptom', text: s.text }); }
    for (const r of (dossier.rules || []).filter(r => RULE_RE.test(`${r.name} ${r.detail}`)).slice(0, 2)) dossierRows.push({ id: r.id, kind: 'dossier rule', text: `${r.name}: ${r.detail || ''}` });
  }
  for (const d of dossierRows) fact(d.id, d.kind, d.text);
  const customerWords = info.question_source === 'client' ? (questions.get(info.question_id) || {}).text || wording : '';
  if (customerWords) fact('CQ-1', "the customer's own words", customerWords);

  // ── B9: specificity ──
  const spec = specificity({
    price: priceList.length > 0,
    town: !!(town || h1For(wording, { city, town, postType }).namesPlace),
    condition: !!condition || dossierRows.some(d => d.kind === 'dossier condition'),
    customerWords: !!customerWords,
    process: practices.length > 0 || !!cv.quote_method || (cv.differentiator_1_confirmed && cv.differentiator_1) || parseInt(cv.guarantee_years, 10) > 0,
    methods: tfRows.some(r => ['standard method', 'what goes wrong', 'fact'].includes(r.kind)) || dossierRows.some(d => d.kind === 'dossier symptom'),
  });
  // 3 of 6 is enough when the topic has search evidence (a People also ask bank topic, a Search Console
  // query) and one of the three is the client's own fact, a price row or a confirmed process (Brandon, 29 Oct); else 4
  const searchEvidence = source === 'search_console' || !!info.search_evidence;
  const ownFact = spec.have.includes('a price for the service') || spec.have.includes('a confirmed process or proof');
  const threshold = searchEvidence && ownFact ? 3 : 4;
  if (spec.count < threshold) gates.push({ code: 'G-SPECIFIC', msg: `${row.slug}: ${spec.count} of the 6 specificity facts (${threshold} needed${threshold === 3 ? ', 3 with search evidence and the client\'s own fact' : searchEvidence ? ', 3 with search evidence once a price row or a confirmed process is among them' : ''}); missing: ${spec.missing.join(', ')}. The next topic takes its slot.` });

  // ── B2 to B4, B13, B14, the headings ──
  const { h1, withCity } = h1For(wording, { city, town, postType });
  if (h1.length > 70) flags.push({ code: 'F-LEN-TITLE', msg: `The H1 is ${h1.length} characters (70 at most): shorten the question on the queue.` });
  const title = seoTitleFor(h1, cv, info.target_query);
  if (title.tooLong) flags.push({ code: 'F-LEN-TITLE', msg: `The SEO title is ${title.title.length} characters at its shortest (60 at most).` });
  if (BANNED_TITLE.test(title.title)) flags.push({ code: 'F-LEN-TITLE', msg: `The SEO title carries "${title.title.match(BANNED_TITLE)[0]}", which a title never does.` });
  // The work the headings name: the service page, else the category page, else the pack service the
  // topic queue matched (a seasonal or dossier post: "Common Questions About Lawn Care"), else the trade
  const topic = (svcTitle || (categoryPage && categoryPage.pageTitle) || (tradeFacts && tradeFacts.service) || info.pack_service || niche.trade || '').trim();
  const topicTitle = titleCase(lc(topic));
  const ctx = { trade: niche.trade || '', tradeLower: niche.trade_lower || lc(niche.trade), tradePerson: niche.trade_person || '', tradePersonPlural: niche.trade_person_plural || '', city, companyName: cv.company_name || '', quoteFree: cv.free_quotes === 'yes' ? 'Free' : '' };
  const ph = s => String(s || '').replace(/\[TOPIC\]/g, topicTitle).replace(/\[TRADE_PERSON\]/g, ctx.tradePerson).replace(/\[TRADE_PERSON_PLURAL\]/g, ctx.tradePersonPlural).replace(/\[TRADE\]/g, ctx.trade).replace(/\[CITY\]/g, city).replace(/\[QUOTE_FREE\] /g, ctx.quoteFree ? `${ctx.quoteFree} ` : '').replace(/\[QUOTE_FREE\]/g, ctx.quoteFree || '').replace(/\[QUOTE_FREE_LOWER\] /g, ctx.quoteFree ? `${String(ctx.quoteFree).toLowerCase()} ` : '').replace(/\[QUOTE_FREE_LOWER\]/g, ctx.quoteFree ? String(ctx.quoteFree).toLowerCase() : '').replace(/\[CV: company_name\]/g, '[CV: company_name]');
  const byline = bylineFor({ name: cv.owner_name, role: cv.owner_role, company: '[CV: company_name]' });
  const statesRule = tfRows.some(r => r.kind === 'rule') || dossierRows.some(d => d.kind === 'dossier rule') || RULE_RE.test(wording);
  const reviewDue = addMonths(today, (priceList.length || statesRule) ? 12 : 24);
  const primaryAction = ph(String((niche.buttons || {}).primary_action || 'Get a Quote'));
  const emergency = !!(niche.emergency_niche && cv.emergency_primary === 'yes');
  const buttons = emergency ? ['Call [CV: phone]', primaryAction] : [primaryAction, 'Call [CV: phone]'];

  // ── B6, B7: the H2s and the FAQ questions, from the row ──
  const stackQ = (info.stack && info.stack.length ? info.stack : (info.query_stack || []).map(id => ({ id, wording: (questions.get(id) || {}).wording || id, doubt: (questions.get(id) || {}).doubt || '' }))).map(s => ({ ...s, doubt: s.doubt || 'Process' }));
  const faqQ = (info.faq && info.faq.length ? info.faq : (info.faq_ids || []).map(id => ({ id, wording: (questions.get(id) || {}).wording || id, doubt: (questions.get(id) || {}).doubt || '' }))).map(s => ({ ...s, doubt: s.doubt || 'Process' }));
  // A cost guide's H2s are the fixed set from the Cost Guide Structure (Brandon, 28 Oct); the bank gives its FAQ only
  // A cost guide's H2s are the fixed set from the Cost Guide Structure: an H2 whose fact rows are
  // missing is dropped, not padded (F-H2-DROPPED); under three left the post is held
  const have = {
    price: info.homepage_cost_guide ? priceRows.some(r => !r.deleted && !r.quote_only && !r.unverified && (r.from_gbp || r.up_to_gbp || r.typical_gbp)) : priceList.length > 0,
    factors: tfRows.some(r => r.kind === 'price factor') || priceList.some(r => r.what_moves_price),
    quote: !!(cv.quote_includes || cv.quote_method) || practices.length > 0 || tfRows.some(r => r.kind === 'standard method'),
    timing: tfRows.some(r => r.kind === 'timing'),
  };
  const fixedRes = postType === 'cost_guide' ? costGuideH2s({ service: svcTitle || ctx.trade, city, trade: ctx.trade, tradePerson: ctx.tradePerson, costUnit: info.cost_unit || slots.cost_unit || 'per job', mode: costMode || 'factors', homepage: !!info.homepage_cost_guide, have }) : null;
  const fixed = fixedRes ? fixedRes.h2s : null;
  const sections = fixed ? fixed.map(h => ({ id: h.id, h2: /\?$/.test(h.wording) ? question(h.wording) : titleCase(h.wording), doubt: h.doubt, brief: h.brief, needs_fact: false, fixed: true, needs: h.needs }))
    : stackQ.map(s => ({ id: s.id, h2: question(s.wording), doubt: s.doubt, brief: DOUBT_BRIEF[s.doubt] || DOUBT_BRIEF.Process, needs_fact: !!s.needs_fact }));
  if (fixedRes && fixedRes.dropped.length) flags.push({ code: 'F-H2-DROPPED', msg: `${fixedRes.dropped.length} fixed H2${fixedRes.dropped.length === 1 ? '' : 's'} dropped for want of fact rows: ${fixedRes.dropped.map(h => `"${h.wording}" (${h.missing.join(', ')})`).join('; ')}.` });
  if (fixed && loadStructure().placeholder) flags.push({ code: 'F-STRUCTURE', msg: 'The cost guide H2s are the placeholder set: prompts/Cost_Guide_Structure.md waits for Brandon\'s Cost Guide Structure.' });
  // The FAQ never repeats or rephrases an H2 (the structure; Brandon, 28 Oct: same meaning, any words)
  const h2Words = sections.map(s => s.h2);
  const faqAll = faqQ.map(s => ({ id: s.id, question: question(s.wording), doubt: s.doubt, needs_fact: !!s.needs_fact }));
  const faq = faqAll.filter(f => !SQ.findSame(f.question, h2Words, { exclude: [city, svcTitle, info.pack_service || '', ctx.trade] })); // the service words are the shared subject, not the question
  if (faq.length < faqAll.length) flags.push({ code: 'F-FAQ-H2', msg: `${faqAll.length - faq.length} FAQ question${faqAll.length - faq.length === 1 ? '' : 's'} dropped: ${faqAll.filter(f => !faq.includes(f)).map(f => `"${f.question}"`).join(', ')} rephrase${faqAll.length - faq.length === 1 ? 's' : ''} an H2.` });
  // The shape gate (Brandon, 28 Oct): three H2s and three FAQ questions at least, or the post is held
  if (sections.length < 3 || faq.length < 3) gates.push({ code: 'G-STACK', hold: true, msg: `${row.slug}: ${sections.length} H2${sections.length === 1 ? '' : 's'} and ${faq.length} FAQ question${faq.length === 1 ? '' : 's'} (3 of each needed). The post is held, not written.` });
  if (sections.length < 3) flags.push({ code: 'F-STACK', msg: `${sections.length} H2${sections.length === 1 ? '' : 's'} (3 to 5 wanted): held (G-STACK).` });
  // A "When …" H1 needs a month window in the trade facts timing rows (Brandon, 28 Oct)
  if (/^When\b/i.test(wording) && !tfRows.some(r => r.kind === 'timing' && MONTH_RE.test(r.text))) gates.push({ code: 'G-WINDOW', hold: true, msg: `${row.slug}: a "When …" post needs a month window in FACTS ALLOWED (a trade facts timing row naming a month or a season); none for ${svcTitle || info.pack_service || 'this service'}. Reword the topic as "How to …" or hold it.` });
  if (faq.length < 3) flags.push({ code: 'F-FAQ-ITEMS', msg: `${faq.length} FAQ question(s) (3 to 5 wanted).` });

  // ── B11: the table ──
  const isRules = postType === 'decision' && RULE_RE.test(wording);
  // A local post's table takes the question columns (cause, sign, fix)
  let tableType = isRules ? 'rules' : postType;
  let rows = [];
  if (tableType === 'cost_guide') {
    // The price rows for the service (its sub jobs too), then related jobs the trade facts name, "Ask for a quote" in the price cell
    // A related job is a row name that reads as a job: a citation list ("Building Regulations 2010, Part L; Approved Document L…") is not one (the roofer run, 29 Oct)
    const jobName = n => n && n.length <= 60 && !/;/.test(n) && (n.match(/,/g) || []).length < 2;
    const related = tfRows.filter(r => jobName(r.name) && ['fact', 'rule', 'price factor'].includes(r.kind)).map(r => r.name).filter((n, i, a) => a.indexOf(n) === i).slice(0, 4);
    rows = [...priceList.map(r => ({ label: ukName(r.service), from: 'PRICE' })), ...related.map(n => ({ label: n, from: 'TF related job: Ask for a quote' }))];
    if (costMode === 'factors') tableType = 'cost_guide_factors';
  }
  else if (tableType === 'rules') rows = tfRows.filter(r => r.kind === 'rule').map(r => ({ label: r.name || r.text.slice(0, 60), from: 'TF rule' })).concat(dossierRows.filter(d => d.kind === 'dossier rule').map(d => ({ label: d.text.split(':')[0], from: 'dossier rule' })));
  else if (tableType === 'decision') {
    // The two options, each with its rows behind it (G-OPTIONS holds the post otherwise)
    rows = options.filter(o => o.rows.length >= 2).map(o => ({ label: o.name, from: `${o.rows.length} trade facts rows${o.pack ? ` (${o.pack} pack)` : ''}` }));
  } else {
    // Cause, sign, fix (Brandon, 28 Oct): only rows whose facts fit the three columns. A "what
    // goes wrong" row gives the sign (Signs:) and the cause (Skipped: or Done badly:); a dossier
    // symptom fits when it reads as a sign (water sits, moss, cracks), never a plot description;
    // the fix comes from a standard method row, so none of them fit without one
    const method = tfRows.some(r => r.kind === 'standard method');
    const wrong = method ? tfRows.filter(r => r.kind === 'what goes wrong' && /Signs:/i.test(r.text) && /Skipped:|Done badly:/i.test(r.text)) : [];
    const signs = method ? dossierRows.filter(d => d.kind === 'dossier symptom' && SYMPTOM_RE.test(d.text)) : [];
    // A row label is one sign: the first clause of the "Signs:" text, never the whole list (B-CELL-LIST holds for code labels too)
    rows = [...signs.map(d => ({ label: d.text, from: 'dossier symptom' })), ...wrong.map(r => ({ label: r.text.replace(/^Signs:\s*/i, '').split(/[.;]/)[0].split(/,\s*(?=[a-z])/)[0].trim(), from: 'TF what goes wrong' }))].slice(0, 6);
  }
  // A row whose sign means the same as an earlier row's is dropped (Brandon, 28 Oct: "The lawn stays
  // soggy for days after rain" and "Lawn stays waterlogged" are one row)
  if (tableType !== 'decision') {
    const kept = [];
    for (const r of rows) { if (kept.some(k => SQ.sameQuestion(k.label, r.label, { exclude: [city, svcTitle, ctx.trade] }))) { flags.push({ code: 'F-ROW-SAME', msg: `Table row "${r.label}" dropped: it means the same as "${kept.find(k => SQ.sameQuestion(k.label, r.label, { exclude: [city, svcTitle, ctx.trade] })).label}".` }); continue; } kept.push(r); }
    rows = kept;
  }
  // Fewer than three fitting rows and the table is off; the decision table is its two options
  const tableOn = tableType === 'decision' ? rows.length === 2 : rows.length >= 3;
  if (!tableOn && rows.length) flags.push({ code: 'F-TABLE', msg: `${rows.length} row${rows.length === 1 ? '' : 's'} fit the ${tableType === 'rules' ? 'rules' : postType.replace('_', ' ')} table's columns (3 needed): the table is off.` });
  else if (!tableOn) flags.push({ code: 'F-TABLE', msg: `No facts fit the ${tableType === 'rules' ? 'rules' : postType.replace('_', ' ')} table's columns: the table is off.` });
  const table = { show: tableOn, type: tableType, columns: TABLE_COLUMNS[tableType] || TABLE_COLUMNS.question, rows: tableOn ? rows : [], after: postType === 'decision' ? Math.min(2, Math.max(1, sections.length)) : 1 };

  // ── B12: the business block; B15: safety ──
  const businessFacts = [cv.quote_method ? 'quote method' : null, practices.length ? 'confirmed practices' : null, parseInt(cv.guarantee_years, 10) > 0 ? 'guarantee' : null, cv.insurance_cover ? 'insurance' : null, (Array.isArray(cv.verified_logos) && cv.verified_logos.some(l => l.tier === 'tier1' || l.tier === 'tier2')) ? 'accreditation' : null, /^\d{4}$/.test(String(cv.year_founded || '')) ? 'years' : null].filter(Boolean);
  const businessShow = businessFacts.length >= 2;
  const safetyHit = slots.safety_topics.find(t => { const ws = norm(t).split(' ').filter(w => w.length > 3); return ws.length && ws.every(w => norm(wording).includes(w)); }) || null;
  const safetyRow = tfRows.find(r => r.kind === 'rule' && SAFETY_RE.test(`${r.name} ${r.text}`)) || null;
  const safety = !!(safetyHit || safetyRow || SAFETY_RE.test(wording));

  if (gates.length) return { gates, flags, decisions: null, decisionsBlock: null };

  const D = {
    slug: row.slug, url: `${row.slug}/`, post_type: postType, source, cost_mode: costMode, target_query: info.target_query || lc(wording), options: options.map(o => ({ name: o.name, rows: o.rows.length, pack: o.pack })),
    timing_rows: source === 'seasonal' ? tfRows.filter(r => r.kind === 'timing').map(r => r.text) : [],
    service: svcTitle, category: (categoryPage && categoryPage.pageTitle) || info.category || '', town,
    h1, h1_with_city: withCity, seo_title: title.title, title_how: title.how, meta_cta: ph(String((niche.buttons || {}).meta_cta || '')), quoteFree: ctx.quoteFree,
    byline, last_checked: today, last_checked_text: longDate(today), review_due: reviewDue,
    sections, faq, table, business: { show: businessShow, h2: `How [CV: company_name] Handles ${topicTitle}`, facts: businessFacts }, faq_h2: `Common Questions About ${topicTitle}`, cta_h2: titleCase(ph(slots.blog_cta_h2)), buttons,
    primary, secondary, safety: { on: safety, why: safetyHit ? `niche safety topic "${safetyHit}"` : safetyRow ? `trade facts rule "${safetyRow.name || safetyRow.text.slice(0, 40)}"` : safety ? 'the question names gas, electrics or structure' : '' },
    specificity: { ...spec, threshold }, facts, customer_words: customerWords, publish_date: info.publish_date || null, homepage_cost_guide: !!info.homepage_cost_guide,
    // The validator's N2 list: the primary and the secondaries only (the LINKABLE PAGES block)
    linkablePages: [{ type: primary.type, url: primary.url, h1: primary.name }, ...secondary.map(l => ({ type: l.type, url: l.url, h1: l.name }))], ideasUsed: ideasUsed || [],
    // The questions pages and the other posts use (B-N7): never one of this post's FAQ questions
    usedQuestions: [...new Set((usedQuestions || []).filter(Boolean))],
    trade_facts: { rows: tfRows.length, thin: tfRows.length < 3 }, cost_unit: slots.cost_unit,
  };
  if (D.trade_facts.thin && needsPack) flags.push({ code: 'F-FACTS-THIN', msg: `${tfRows.length} trade facts row(s) for ${svcTitle || 'this topic'} (3 wanted).` });
  return { gates, flags, decisions: D, decisionsBlock: formatBlogBlock(D, cv) };
}

// What the parser should expect, from the decisions
function expectedFromBlogDecisions(D) {
  return {
    lists: { [PT.LABELS.sections]: D.sections.map(s => s.h2), [PT.LABELS.table]: D.table.show ? D.table.rows.map(r => r.label) : [], [PT.LABELS.faq]: D.faq.map(q => q.question) },
    hidden: { [PT.LABELS.business]: !D.business.show },
  };
}

function formatBlogBlock(D, cv) {
  const L = [];
  const push = s => L.push(s);
  push(`POST: post_type ${D.post_type}${D.cost_mode ? `, cost_mode ${D.cost_mode}` : ''}, source ${D.source}, URL ${D.url}, target query "${D.target_query}", service: ${D.service || 'none (the trade in general)'}, category: ${D.category || 'none'}${D.town ? `, town: ${D.town}` : ''}`);
  push('');
  push('DECISIONS:');
  push('');
  push(`H1: ${D.h1}`);
  push(`SEO title: ${D.seo_title}`);
  push(`Meta description: code builds it after you write, from the first sentence of blog_answer plus "${D.meta_cta}" (155 characters at most), so that sentence must work on its own`);
  if (D.source === 'seasonal') push(`Timing: a seasonal post, so blog_answer gives the timing from the trade facts timing row${D.timing_rows.length === 1 ? '' : 's'} (${D.timing_rows.map(t => `"${t}"`).join('; ') || 'none on file: say what decides the timing'}), the window and why, in its first sentence`);
  if (D.options && D.options.length) push(`Options: ${D.options.map(o => `${o.name} (${o.rows} rows${o.pack ? `, ${o.pack} pack` : ''})`).join(' · ')}: each section and the table weigh both from their rows`);
  push(`Byline: ${D.byline} · Last checked ${D.last_checked_text}`);
  push(`Publish date: ${D.publish_date || 'not set (a draft until the launch date is set)'}`);
  push(`Buttons: ${D.buttons.join(' | ')}`);
  push(`Switches: table ${D.table.show ? 'ON' : 'off'} · business block ${D.business.show ? 'SHOWN' : 'HIDDEN (write HIDDEN)'} · safety ${D.safety.on ? `ON (${D.safety.why}): what to switch off or avoid, then a qualified professional; never DIY steps` : 'off'}${D.cost_mode ? ` · cost_mode ${D.cost_mode}${D.cost_mode === 'factors' ? ' (no price for this service: what moves the price, no figures)' : ''}` : ''}`);
  push('');
  push(`--- H2s (the query stack, in this order; each body opens by answering its H2; the primary link once in section 1 or 2) ---`);
  D.sections.forEach((s, i) => { push(`  ${i + 1}. ${s.h2} [${s.doubt}]`); push(`     Brief: ${s.brief}${s.needs_fact ? ' (only the business can answer part of this: from the client values and confirmed practices, else say how it is agreed at the quote)' : ''}`); });
  if (!D.sections.length) push('  (none: F-STACK)');
  push('');
  if (D.table.show) {
    push(`--- TABLE (under section ${D.table.after}; columns: ${D.table.columns.join(' | ')}; one row per label, in order; a cell with no fact: "Ask for a quote") ---`);
    D.table.rows.forEach((r, i) => push(`  ${i + 1}. ${r.label} (from ${r.from})`));
  } else push('--- TABLE: none (write HIDDEN) ---');
  push('');
  push(`--- BUSINESS BLOCK: ${D.business.show ? `SHOWN, H2 "${D.business.h2}", from ${D.business.facts.join(', ')} only` : 'HIDDEN (fewer than two confirmed facts)'} ---`);
  push('');
  push(`--- FAQ (H2 "${D.faq_h2}"; one answer per question, in order; none of these is used on any other page) ---`);
  D.faq.forEach((q, i) => push(`  ${i + 1}. ${q.question} [${q.doubt}]${q.needs_fact ? ' (needs a client fact: from the client values and confirmed practices only)' : ''}`));
  if (!D.faq.length) push('  (none)');
  push('');
  push(`--- NEXT STEP (H2 "${D.cta_h2}"; blog_closing links the primary page once; never [CV: phone], never "Tell us") ---`);
  push(`  Primary link: ${D.primary.url} (${D.primary.name}, ${D.primary.type}, ${D.primary.status})`);
  for (const s of D.secondary) push(`  Secondary link (once): ${s.url} (${s.name}, ${s.type})`);
  push('');
  push(`Specificity: ${D.specificity.count} of 6 (${D.specificity.have.join('; ') || 'none'})${D.specificity.missing.length ? `; not available: ${D.specificity.missing.join('; ')}` : ''}. Say F-SPECIFIC in MODEL_FLAGS if fewer were usable.`);
  push(`Trade facts: ${D.trade_facts.rows} row(s) in FACTS ALLOWED${D.trade_facts.thin ? ' (fewer than 3: say F-FACTS-THIN in MODEL_FLAGS and keep to what the rows give)' : ''}.`);
  push('');
  push('FACTS ALLOWED (state nothing that is not here; a price only from a PRICE row; a council fee or rule only from a TF or dossier row, as what usually applies, never its number or name):');
  for (const f of D.facts) push(`  [${f.id}] (${f.kind}) ${f.text}`);
  if (!D.facts.length) push('  (none)');
  push('');
  push('LINKABLE PAGES (the only URLs you may link to; the primary link twice at most, each secondary link once):');
  push(`  [primary] ${D.primary.url} | ${D.primary.name}`);
  for (const s of D.secondary) push(`  [secondary] ${s.url} | ${s.name}`);
  push('');
  push('IDEAS USED ELSEWHERE (never make these again, in any wording; a point made in one H2 is not repeated in the FAQ):');
  if (!D.ideasUsed.length) push('  none yet');
  for (const i of D.ideasUsed) push(`  - (${i.page}) ${i.text}`);
  push('');
  push('MODEL FIELDS:');
  push(`  ${PT.LABELS.answer}`);
  push(`  ${PT.LABELS.sections}`);
  for (const s of D.sections) push(`    - h2: ${s.h2} | body`);
  push(`  ${PT.LABELS.table}${D.table.show ? '' : ' (HIDDEN)'}`);
  if (D.table.show) for (const r of D.table.rows) push(`    - row: ${r.label} | cells: ${D.table.columns.slice(1).map(c => `<${c}>`).join(' ; ')}`);
  push(`  ${PT.LABELS.business}${D.business.show ? '' : ' (HIDDEN)'}`);
  push(`  ${PT.LABELS.faq}`);
  for (const q of D.faq) push(`    - faq_question: ${q.question} | faq_answer`);
  push(`  ${PT.LABELS.closing}`);
  push('  MODEL_FLAGS');
  return L.join('\n');
}

module.exports = { computeBlogDecisions, optionsOf, formatBlogBlock, expectedFromBlogDecisions, h1For, seoTitleFor, specificity, TABLE_COLUMNS, DOUBT_BRIEF };
