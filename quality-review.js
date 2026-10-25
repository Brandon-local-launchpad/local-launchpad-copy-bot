'use strict';

// ── Copy quality review (16 Oct; category pages 25 Oct) ──────────────────────
// Scores a generated v20 page (the homepage, or a category page) against
// docs/seo/COPY_QUALITY_RUBRIC.md. The page type gives the validator and the reader
// view; a category page adds its own code items (the keyword placement, the town
// page's no-other-town and plain-anchor rules, the ideas check) and a judge item.
// Code items come from the validator and the decisions; judge items and the
// overall score come from one reviewer model call (prompts/Copy_Quality_Review_CORE.md).
// A page is done when every item passes and the score is 8.5 or more.

const fs = require('fs');
const path = require('path');
const { wordCount } = require('./validate-v20');
const { isAdminArea } = require('./client-files');
const { pageTypeOf, pageTypeId } = require('./page-types');
const validateV20 = (record, V) => pageTypeOf(record).validate(record, V);
const buildReaderView = (record, values) => pageTypeOf(record).readerView(record, values);
const { extractJsonObject } = require('./json-extract');

const REVIEW_MODEL = 'claude-opus-5-5';
const PASS_SCORE = 8.5;

// Rubric items scored by code: the validator checks behind each
const CODE_ITEMS = {
  H1: { title: 'H1 is the keyword', checks: ['4a', '4b', '4c', '4d'] },
  H2: { title: 'Final CTA heading names the client\'s category or trade', decisions: 'finalCta' },
  H3: { title: 'Meta description natural, 155 characters or fewer', checks: ['8'], decisions: 'meta' },
  H4: { title: 'Title modifier repeats no keyword', checks: ['N3'] },
  E1: { title: 'Hero sentence 1', checks: ['HERO'] },
  B1: { title: 'Services paragraph lists no services', checks: ['CB-SERVICES'] },
  B2: { title: 'Content block paragraphs of 4 sentences at most', checks: ['CB-PARA'] },
  B3: { title: 'Content block word range', range: 'home_content_block_body' },
  B4: { title: 'Jobs figure out of the content block', checks: ['TRUST-REPEAT'] },
  B5: { title: 'No "we worked in [allocated place]"', checks: ['WORKED'] },
  B6: { title: 'A neighbourhood in one paragraph', checks: ['REPEAT-IN'] },
  S1: { title: 'Cards name only their picked services, 3 at most', checks: ['CARD-COUNT', 'CARD-PICK'] },
  S2: { title: 'Card picks as the rule says: 2 or 3 per card, one card per service (v3: from the category\'s own pages, by jobs_wanted then volume then the core list)', decisions: 'cardPicks' },
  S3: { title: 'No shared card sentence pattern; "We also handle" once', checks: ['CARD-PATTERN', 'N13'] },
  S4: { title: 'No "[category] team"', checks: ['CAT-TEAM'] },
  S5: { title: 'City in two cards at most', checks: ['CARD-FILLER'] },
  S6: { title: '"We also offer" only what no card names', checks: ['MORE-REPEAT'] },
  S7: { title: 'Homeowner words, not raw GBP names', checks: ['RAW-GBP', 'SERVICE'] },
  S8: { title: 'Card links inside a sentence, with the category words', checks: ['CARD-LINK', 'LINK-TEXT', 'N1', 'N2'] },
  S9: { title: 'No local detail in cards', checks: ['CARD-LOCAL'] },
  C1: { title: 'No unconfirmed working practice', checks: ['PRACTICE'] },
  C2: { title: 'No outcome promises', checks: ['OUTCOME'] },
  C3: { title: 'No unconfirmed experience claims', checks: ['EXPERIENCE'] },
  C4: { title: 'Insurance described, never an outcome', checks: ['N11', 'INSURANCE'] },
  C5: { title: 'Claims and figures only from client values', checks: ['N5', 'NUM', 'N22'], skip: /^Claim word|manufacturer warranty/ },
  C8: { title: 'Claim words only with proof', checks: ['N5'], only: /^Claim word/ },
  C10: { title: 'Manufacturer warranties only when confirmed', checks: ['N5'], only: /manufacturer warranty/ },
  C6: { title: 'Never sends the reader to rivals', checks: ['RIVALS'] },
  C7: { title: 'Step 2 names no quote method', checks: ['QUOTE-METHOD'] },
  C9: { title: 'Claims review clear', decisions: 'claims' },
  C11: { title: 'A confirmed practice stated twice at most, in different words', checks: ['PRACTICE-REPEAT'] },
  P1: { title: 'Fixed price 3 times at most, never in a step', checks: ['PROOF-FIXED'] },
  P2: { title: 'Other proofs 3 times at most', checks: ['PROOF-REPEAT', 'N4', 'N20'] },
  P3: { title: 'No phrase in more than two fields', checks: ['REPEAT-PAGE'] },
  P7: { title: '"A price agreed before work starts" once outside step 2', checks: ['PRICE-FIRST'] },
  P8: { title: 'Quote method and the price practice 3 times at most, never in both the cost FAQ and the visits FAQ', checks: ['PROOF-QUOTE'] },
  P4: { title: 'No five word run shared by two fields', checks: ['N21'] },
  P5: { title: 'Stock phrases, words to avoid, sentence openers', checks: ['N23', 'N14', 'N18', 'N8', 'N19', 'N9'] },
  F1: { title: 'FAQ answers first, 15 words or fewer', checks: ['N24'] },
  F2: { title: 'No "Yes" to a which/what/how question', checks: ['FAQ-YES'] },
  F3: { title: 'FAQ answers 30 to 70 words', range: 'faq_answer' },
  F4: { title: 'Nothing points at another part of the page', checks: ['SELF-REF'] },
  F6: { title: 'No FAQ padding: every sentence after the answer brings a new noun or number', checks: ['FAQ-PAD'] },
  A1: { title: 'Coastal wording, no compass directions', checks: ['COAST', 'COAST-DIR', 'HUB-LINK'] },
  A2: { title: 'No council areas', checks: ['AREA-ADMIN', '9'], decisions: 'areaList' },
  T1: { title: 'Final CTA body one plain sentence', checks: ['FINAL-CTA'] },
  Y1: { title: 'Dashes, hyphens, banned phrases, tokens', checks: ['1a', '1b', '2', '3a', '3b', '3c', 'CVLIT', 'TOKEN-UNIT', 'N6', 'N10', 'N17'] },
  Y7: { title: 'No field labels or data talk on the page', checks: ['LEAK'] },
  Y2: { title: 'No sentence over 30 words; fields in range', range: 'other', longSentence: 30 },
  Y3: { title: 'No research wording', checks: ['RESEARCH-LANG'] },
  Y4: { title: 'Pronouns and "team"', checks: ['N15', 'N12'] },
  Y9: { title: 'No padding in the section intros: every sentence after the first brings a new noun or number', checks: ['INTRO-PAD'] },
  Y10: { title: 'No sentence copied from the calibration pack', checks: ['PACK-COPY'] },
  Y11: { title: 'No padding opener ("every garden is different", "wherever you are")', checks: ['PAD-OPENER'] },
  Y12: { title: 'No research detail named for its own sake', checks: ['SCENERY'] },
  C12: { title: 'A visit frequency only from visit_frequency_options', checks: ['FREQUENCY'] },
};
// The category page's own items (25 Oct), on top of the homepage's
const CATEGORY_ITEMS = {
  E1: { title: 'Hero sentence 1: company token, keyword phrase, the wider area on a base page', checks: ['HERO', 'HERO-CAT'] },
  K1: { title: 'Keyword phrase only in hero sentence 1 and content block sentence 1', checks: ['KEYWORD'] },
  B7: { title: 'Content block paragraph 2 links a section 3 page', checks: ['CB-LINKS'] },
  S11: { title: 'Each card links its given target and nothing else', checks: ['CARD-TARGET'] },
  Y8: { title: 'Services intro is two sentences', checks: ['INTRO-SENTENCES'] },
  I1: { title: 'Nothing from IDEAS USED ELSEWHERE made again', checks: ['IDEAS'] },
  T3: { title: 'Town page names no other town', checks: ['TOWN-OTHER'] },
  T4: { title: 'Town page links are plain names: no town in link text', checks: ['LINK-TOWN'] },
  T5: { title: 'Town page cards name no town', checks: ['CARD-TOWN'] },
  A3: { title: 'Town page areas intro names no village (code places the list)', checks: ['AREAS-TOWN'] },
  A4: { title: 'Areas intro never claims every town has a page', checks: ['AREAS-PAGES'] },
  A5: { title: 'Areas intro lists no services', checks: ['AREAS-SERVICES'] },
  B8: { title: 'Content block opens on the place or the work, never on the reader\'s search', checks: ['CB-OPENER'] },
};
// The service page's own items (CORE (17), 25 Oct), on top of the homepage's
const SERVICE_ITEMS = {
  E1: { title: 'Hero sentence 1: company token, keyword phrase, the wider area on a base page', checks: ['HERO', 'HERO-SVC'] },
  K1: { title: 'Keyword phrase only in hero sentence 1 and content block sentence 1', checks: ['KEYWORD'] },
  I1: { title: 'Nothing from IDEAS USED ELSEWHERE made again', checks: ['IDEAS'] },
  T3: { title: 'Town page names no other town', checks: ['TOWN-OTHER'] },
  T4: { title: 'Town page links are plain names: no town in link text', checks: ['LINK-TOWN'] },
  A3: { title: 'Town page areas intro names no village (code places the list)', checks: ['AREAS-TOWN'] },
  A4: { title: 'Areas intro never claims every town has a page', checks: ['AREAS-PAGES'] },
  A5: { title: 'Areas intro lists no services', checks: ['AREAS-SERVICES'] },
  B8: { title: 'Content block opens on the place or the work, never on the reader\'s search', checks: ['CB-OPENER'] },
  V1: { title: 'What\'s Included items are parts of the job: 4 to 10 words, no full stop, no benefit, no proof, no town', checks: ['ITEM'], range: 'item_text' },
  V2: { title: 'Content block: four paragraphs, paragraph 3 from the "what goes wrong" rows, paragraph 2 not the items\' wording', checks: ['CB-PARAS', 'CB-PARA3', 'ITEM-REPEAT'] },
  V3: { title: 'Paragraph 4 links: a base page 2 or 3 area pages, a town page its base page exactly once', checks: ['CB-LINKS', 'BASE-LINK'] },
  V4: { title: 'No standard, regulation or Act by number or name; rules as what usually applies', checks: ['STANDARD'] },
  V5: { title: 'The trade facts timing written once on the page', checks: ['TIMING'] },
  V6: { title: 'No promise of a result the business cannot control', checks: ['RESULT'] },
  V7: { title: 'Each block 4 card a different mechanism, none from MECHANISMS USED', checks: ['MECHANISM'] },
  V8: { title: 'More Services intro names no service or town and carries no link', checks: ['MORE-NAMES'] },
};
function codeItemsFor(record) {
  const id = pageTypeId(record);
  if (id === 'category') return { ...CODE_ITEMS, ...CATEGORY_ITEMS };
  if (id === 'service') return { ...CODE_ITEMS, ...SERVICE_ITEMS };
  return CODE_ITEMS;
}

// Rubric items the reviewer model scores
const JUDGE_ITEMS = {
  E2: 'Hero sentence 2 leads with the strongest confirmed proof the trust line hasn\'t used.',
  B1j: 'The content block\'s services paragraph links each category with a reason (what that work does for the customer) and lists no services.',
  S10: 'Each card says what the customer gets, in sentences that read naturally (no retry artefacts like "We also handle our tree service work for…").',
  C3j: 'No claim of experience with kinds of property or job ("large rural properties", "conservation area gardens") unless the facts say so.',
  P6: 'Each idea has one home: the same point (the base under paving, an insurance example, a technical explanation) isn\'t made in several sections. A confirmed proof (a differentiator, the jobs count, the insurance figure) may appear up to 3 times: code scores that (P1, P2), so don\'t fail P6 for it.',
  F5: 'Each FAQ answer answers the question as asked and the doubt behind it. When the facts don\'t say what the business does (no guarantee, no complaints process, no visit frequency on file), an answer that says what the customer can do and the standard the work is held to passes, and a visits answer that says the schedule is agreed with the customer and no more passes: put the missing fact in missing_facts instead.',
  T2: 'Step bodies follow their step titles and never restate the free quote, the fixed price promise or the start time. Step 2 saying a price is agreed before work starts is the step itself, not a restatement.',
  Y6: 'No padding (a sentence that could sit on any website: "there is a service here for you", "we bring that experience to every job") and no pasted research ("gardens that date mostly from 1908 to 1930", "the geology varies widely"). Memberships and logos only when they are in the facts.',
  Y5: 'Every sentence reads naturally to a homeowner: grammatical, specific, no padding, no contradiction, nothing a reader would stumble on or doubt.',
  L1: 'Every local detail from the research earns its place by saying what it means for the work (rule 6 of USING THE LOCAL RESEARCH): a detail used as scenery, with no consequence for the job ("Cherries line the avenue and Scots pine stand on the estate greens"), fails.',
};
// The judge items for a page: a category page's paragraph 2 links service pages, and a
// town page is about its town only (25 Oct)
function judgeItemsFor(record) {
  const id = pageTypeId(record);
  if (id === 'service') {
    const out = { ...JUDGE_ITEMS };
    out.B1j = 'The content block explains the job: paragraph 2 gives the stages in order from the trade facts in plain words (any trade term explained in the same sentence), paragraph 3 names one concrete consequence of skipping the job or doing it badly without alarming the reader, and paragraph 4 says where the team works (a base page links 2 or 3 area pages as the town name or "[service] in [town]"; a town page links its base page once and names no other town).';
    out.P6 = 'Each idea has one home: the same point (a cause, a stage, a cost factor, an insurance example) isn\'t made in several sections; the What\'s Included items name the stages and paragraph 2 explains them without repeating their wording; nothing under IDEAS USED ELSEWHERE or MECHANISMS USED is made again in other words. A confirmed proof may appear up to 3 times: code scores that (P1, P2), so don\'t fail P6 for it.';
    out.S10 = 'Each What\'s Included item reads as a part of the job someone could check off (a stage, a material, a check, a finish), not a benefit, and each block 4 card reads naturally: the sign, what is behind it, what it leads to if left.';
    out.V9j = 'A rule from the trade facts (planning, building regulations, a standard, a licence) is written as what usually applies, with "usually" or "in most cases", never as legal advice and never with a number; a how long question is answered from the trade facts timing only.';
    if (record.scope === 'town') out.T6j = 'A town page reads as about that town only: no other town is named or implied anywhere (the city, a neighbouring town, "the surrounding towns"), every link reads as the plain service or page name, and the base service page is linked once.';
    return out;
  }
  if (id !== 'category') return JUDGE_ITEMS;
  const out = { ...JUDGE_ITEMS };
  out.B1j = 'The content block\'s paragraph 2 links the service pages given in DECISIONS, each with a reason (what that work does for the customer), never more than two links in a sentence, and lists no other services.';
  out.P6 = 'Each idea has one home: the same point (a drainage cause, a cost factor, an insurance example) isn\'t made in several sections, and nothing listed under IDEAS USED ELSEWHERE is made again in other words. A confirmed proof may appear up to 3 times: code scores that (P1, P2), so don\'t fail P6 for it.';
  if (record.scope === 'town') {
    out.T6j = 'A town page reads as about that town only: no other town is named or implied anywhere (the city, a neighbouring town, "the surrounding towns"), and every link reads as the plain service or page name, never a destination H1 and never with a town in it.';
  }
  return out;
}

function loadReviewPrompt() {
  const text = fs.readFileSync(path.join(__dirname, 'prompts', 'Copy_Quality_Review_CORE.md'), 'utf8').replace(/\r\n/g, '\n');
  const cut = text.indexOf('\n---\n');
  return (cut >= 0 ? text.slice(cut + 5) : text).trim();
}

const lc = s => String(s || '').toLowerCase();

// Decisions tests (code)
function decisionsTests({ record, D, cv, niche }) {
  const out = {};
  const typeId = pageTypeId(record);
  const category = typeId === 'category' || typeId === 'service';
  if (category) {
    // H2 on a category page: the final CTA heading names the page's work noun or its category;
    // on a service page, the service
    const ctaH2 = typeId === 'service' ? record.svc_final_cta_h2 : record.cat_final_cta_h2;
    const h2 = lc(ctaH2);
    const want = (typeId === 'service' ? [D.svc, D.service] : [D.work, D.cat, D.category]).filter(Boolean).map(lc);
    out.finalCta = want.some(w => h2.includes(w)) ? null : `The final CTA heading "${ctaH2}" names neither ${want.join(' nor ')}.`;
    out.meta = null;
    out.cardPicks = null;
    const admin = (typeId === 'service' ? (record.svc_areas_links || []) : (record.cat_areas_links || [])).map(a => a.name).filter(isAdminArea);
    out.areaList = admin.length ? `The area list includes ${admin.join(', ')}.` : null;
    const claims = (record.CLAIMS && record.CLAIMS.findings) || [];
    out.claims = record.CLAIMS && record.CLAIMS.status === 'failed' ? 'The claims review failed to run.' : claims.length ? claims.map(f => `"${f.quote}" (${f.why})`).join('; ') : null;
    return out;
  }
  // H2: the final CTA heading names the primary category or the trade person
  const h2 = lc(record.home_final_cta_h2);
  const okNames = [cv.primary_category, niche.trade_person].filter(Boolean).map(lc);
  const otherCats = (D.d9.main || []).map(c => lc(c.name)).filter(n => !okNames.includes(n));
  const wrong = otherCats.find(n => new RegExp(`\\blocal ${n}\\b`).test(h2));
  out.finalCta = wrong ? `The final CTA heading names "${wrong}", not the client's category.` : (okNames.some(n => h2.includes(n)) ? null : `The final CTA heading "${record.home_final_cta_h2}" names neither ${okNames.join(' nor ')}.`);
  // H3: meta is a sentence, no "[keyword] from [company]" opener
  const meta = record.meta_description || '';
  out.meta = / from /i.test(meta.split('.')[0]) && cv.company_name && meta.includes(`from ${cv.company_name}`) ? 'The meta opens "[keyword] from [company]".' : null;
  // S2: card picks
  const core = Object.fromEntries(Object.entries(niche.core_services || {}).map(([k, v]) => [lc(k), v.map(lc)]));
  const wanted = (cv.jobs_wanted || []).map(lc);
  const problems = [];
  const seen = new Map();
  // v3 page map path (21 Oct): the picks come from the category's own base pages, jobs_wanted,
  // then search volume, then the core list; a card short of two may repeat one (toppedUp).
  // The core list no longer decides the lead or the home, so only the limits are checked here.
  const v3 = D.d9.rule === 'page_map_v3';
  const toppedUp = new Set(Object.values(D.d9.toppedUp || {}).flat());
  for (const c of (D.d9.main || [])) {
    if (v3) {
      const s = c.services || [];
      if (s.length > 3) problems.push(`${c.name} has ${s.length} services`);
      if (s.length < 2) problems.push(`${c.name} names ${s.length ? 'only one service' : 'no services'}`);
      for (const x of s) { if (seen.has(x) && !toppedUp.has(x)) problems.push(`"${x}" is in ${seen.get(x)} and ${c.name}`); seen.set(x, c.name); }
      continue;
    }
    const list = core[lc(c.name)] || [];
    const s = c.services || [];
    if (s.length > 3) problems.push(`${c.name} has ${s.length} services`);
    if (s[0] && list.length && !list.includes(s[0]) && !wanted.some(w => s[0].includes(w) || w.includes(s[0]))) problems.push(`${c.name} leads with "${s[0]}", not a core or wanted service`);
    for (const x of s) {
      if (seen.has(x)) problems.push(`"${x}" is in ${seen.get(x)} and ${c.name}`);
      seen.set(x, c.name);
      const better = Object.entries(core).find(([cat, l]) => cat !== lc(c.name) && l.includes(x) && (D.d9.main || []).some(m => lc(m.name) === cat) && !list.includes(x));
      if (better) problems.push(`"${x}" belongs under ${better[0]}, not ${c.name}`);
    }
  }
  out.cardPicks = problems.length ? problems.join('; ') : null;
  // A2: the area list holds no council area
  const admin = (record.home_areas_links || []).map(a => a.name).filter(isAdminArea);
  out.areaList = admin.length ? `The area list includes ${admin.join(', ')}.` : null;
  // C9: claims review
  const claims = (record.CLAIMS && record.CLAIMS.findings) || [];
  out.claims = record.CLAIMS && record.CLAIMS.status === 'failed' ? 'The claims review failed to run.'
    : claims.length ? claims.map(f => `"${f.quote}" (${f.why})`).join('; ') : null;
  return out;
}

// Code items: pass or fail with the reasons
function scoreCodeItems({ record, V, D, cv, niche }) {
  const issues = validateV20(record, V);
  const dec = decisionsTests({ record, D, cv, niche });
  const items = [];
  const contentField = { category: /cat_content_body/, service: /svc_content_body/ }[pageTypeId(record)] || /home_content_block_body/;
  for (const [id, item] of Object.entries(codeItemsFor(record))) {
    const reasons = [];
    if (item.checks) for (const i of issues) if (item.checks.includes(i.check) && !(item.skip && item.skip.test(i.message)) && !(item.only && !item.only.test(i.message))) reasons.push(`${i.check} · ${i.field}: ${i.message}`);
    if (item.decisions && dec[item.decisions]) reasons.push(dec[item.decisions]);
    if (item.range) {
      for (const i of issues.filter(x => x.check === 'N7' && /words: it must be/.test(x.message))) {
        const isCb = contentField.test(i.field), isFaq = /^faq_answer/.test(i.field);
        if ((item.range === 'home_content_block_body' && isCb) || (item.range === 'faq_answer' && isFaq) || (item.range === 'other' && !isCb && !isFaq)) reasons.push(`${i.field}: ${i.message}`);
      }
      if (item.longSentence) {
        for (const i of issues.filter(x => x.check === 'N7' && /A sentence of (\d+) words/.test(x.message))) {
          if (parseInt(i.message.match(/A sentence of (\d+) words/)[1], 10) > item.longSentence) reasons.push(`${i.field}: ${i.message}`);
        }
      }
    }
    items.push({ id, title: item.title, by: 'code', pass: !reasons.length, reasons });
  }
  return { items, issues };
}

// What code decided, so the reviewer doesn't mark it down (the hero town, the content
// block's link set, each card's services, the step titles, the FAQ questions)
function decisionsSummary(record, D) {
  if (pageTypeId(record) === 'service') {
    return [
      `${D.scope === 'town' ? 'Town service page' : 'Service page'} for ${D.service} (category ${D.category}), H1: ${D.d2_h1}. Keyword phrase in body copy: "${D.keyword}", by rule only in hero sentence 1 and content block sentence 1.`,
      `What's Included items (titles by code, 4 to 10 words each, no full stop): ${(D.included || []).map(i => i.title).join(' / ')}.`,
      `Block 4 cards: ${(D.problems || []).map(p => p.title).join(' / ')}. Block 5 cards: ${(D.cost || []).map(p => p.title).join(' / ')}.`,
      `Steps: ${(D.niche_steps || []).map(s => s.title).join(' / ')}.`,
      `FAQ questions (chosen by code): ${(D.faq || []).map(q => q.question).join(' / ')}.`,
      `More Services cards (placed by code; the intro names none): ${(D.more || []).map(c => c.name).join(', ') || 'none (section hidden)'}.`,
      `Final CTA heading: ${record.svc_final_cta_h2}.`,
      D.scope === 'town'
        ? `By design: the page is about ${D.town} only; paragraph 4 links the base service page ${D.baseLink ? D.baseLink.url : ''} once; the areas list (villages) is placed by code and the areas intro names none of them.`
        : `By design: paragraph 4 links 2 or 3 of these area pages as the town name or "[service] in [town]": ${(D.locationLinks || []).map(l => `${l.name} → ${l.url}`).join('; ') || 'none'}; the area list and the "We also cover" line are placed by code; a confirmed proof can be headlined, explained and mentioned once more (3 times).`,
    ].join('\n');
  }
  if (pageTypeId(record) === 'category') {
    return [
      `${D.scope === 'town' ? 'Location category page' : 'Category page'} for ${D.category}, H1: ${D.d2_h1}. Keyword phrase in body copy: "${D.keyword}", by rule only in hero sentence 1 and content block sentence 1.`,
      `Cards (one service page each, the link target given): ${(D.cards || []).map(c => `${c.name} → ${c.url}`).join('; ')}.`,
      `Also offered (no page): ${(D.alsoOffered || []).join(', ') || 'none'}.`,
      `Block 4 cards: ${(D.problems || []).map(p => p.title).join(' / ')}. Block 5 cards: ${(D.cost || []).map(p => p.title).join(' / ')}.`,
      `Steps: ${(D.niche_steps || []).map(s => s.title).join(' / ')}.`,
      `FAQ questions (chosen by code): ${(D.faq || []).map(q => q.question).join(' / ')}.`,
      `Final CTA heading: ${record.cat_final_cta_h2}.`,
      D.scope === 'town'
        ? `By design: the page is about ${D.town} only; the areas list (villages) is placed by code and the areas intro names none of them; the content block closing line may call [CV: phone].`
        : 'By design: towns are named in the content block\'s paragraph 4 links and the area list; the content block closing line may call [CV: phone]; a confirmed proof can be headlined, explained and mentioned once more (3 times).',
    ].join('\n');
  }
  return [
    `H1: ${D.d2_h1}. Hero town (where the business works, named in hero sentence 1): ${(D.d14_town || {}).name || 'none'}.`,
    `Content block links these categories only (the cards cover the rest): ${(D.d13_links || []).map(l => l.name).join(', ')}.`,
    ...(D.d9.main || []).map(c => `Card ${c.name}: names ${(c.services || []).join(', ') || 'no services'}.`),
    `Steps: ${(D.niche_steps || []).map(s => s.title).join(' / ')}.`,
    `FAQ questions (chosen by code): ${(D.d11_faq || []).map(q => q.question).join(' / ')}.`,
    `Final CTA heading: ${record.home_final_cta_h2}.`,
    'By design: towns are named in the content block\'s closing links, the area list and the "Which areas" answer; a confirmed proof can be headlined, explained and mentioned once more (3 times).',
  ].join('\n');
}

function factsFor(record) {
  const meta = record.meta || {};
  return [meta.client_block || '(no client block)', meta.services_on_file ? `\nCONFIRMED SERVICES (by category):\n${meta.services_on_file}` : ''].join('\n');
}

// The page as a visitor reads it: the reader view without its review notes
function pageText(record) {
  const md = buildReaderView(record, (record.meta && record.meta.client_values) || {});
  const cut = md.indexOf('## Review notes');
  return cut >= 0 ? md.slice(0, cut).trim() : md;
}

async function reviewPage({ record, V, D, cv, niche, callModel }) {
  const { items: codeItems, issues } = scoreCodeItems({ record, V, D, cv, niche });
  const message = [
    'JUDGE ITEMS:', ...Object.entries(judgeItemsFor(record)).map(([id, t]) => `${id}: ${t}`), '',
    'CODE RESULTS:', ...codeItems.map(i => `${i.id} ${i.pass ? 'pass' : 'FAIL'}: ${i.title}${i.pass ? '' : ` (${i.reasons.slice(0, 3).join(' | ')})`}`), '',
    'CODE DECISIONS (made by code on purpose; never fail an item for these):', decisionsSummary(record, D), '',
    'FACTS ON FILE:', factsFor(record), '',
    'PAGE:', pageText(record),
  ].join('\n');
  const r = await callModel({ system: loadReviewPrompt(), message, maxTokens: 16000, model: REVIEW_MODEL });
  const j = extractJsonObject(r.text);
  const judgeItems = Object.entries(judgeItemsFor(record)).map(([id, t]) => {
    const got = (j.items || []).find(x => x.id === id) || { pass: false, why: 'The reviewer did not score this item.' };
    return { id, title: t, by: 'judge', pass: !!got.pass, reasons: got.pass ? [] : [`"${got.quote || ''}": ${got.why || ''}`] };
  });
  const items = [...codeItems, ...judgeItems];
  const failed = items.filter(i => !i.pass);
  const score = typeof j.score === 'number' ? j.score : null;
  return {
    at: new Date().toISOString(), model: REVIEW_MODEL, score, passAll: !failed.length,
    done: !failed.length && score !== null && score >= PASS_SCORE,
    failed: failed.map(i => i.id), items, other_problems: j.other_problems || [], missing_facts: j.missing_facts || [],
    validator: { block: issues.filter(i => i.type === 'BLOCK').length, flag: issues.filter(i => i.type === 'FLAG').length },
    usage: r.usage || null,
  };
}

function formatReview(rv) {
  const L = [`Score: ${rv.score === null ? 'n/a' : rv.score.toFixed(1)} / 10 · ${rv.items.length - rv.failed.length}/${rv.items.length} rubric items pass · ${rv.done ? 'DONE' : 'not done'}`,
    `Validator: ${rv.validator.block} BLOCK, ${rv.validator.flag} FLAG`, ''];
  for (const i of rv.items.filter(x => !x.pass)) {
    L.push(`FAIL ${i.id} (${i.by}) ${i.title}`);
    for (const r of i.reasons) L.push(`  - ${r}`);
  }
  if ((rv.missing_facts || []).length) {
    L.push('', 'Client facts that would make the page better:');
    for (const m of rv.missing_facts) L.push(`  - ${m.fact}: ${m.why}`);
  }
  if (rv.other_problems.length) {
    L.push('', 'Other problems the reviewer noticed:');
    for (const p of rv.other_problems) L.push(`  - "${p.quote}": ${p.why}`);
  }
  return L.join('\n');
}

module.exports = { reviewPage, scoreCodeItems, decisionsTests, decisionsSummary, formatReview, pageText, CODE_ITEMS, CATEGORY_ITEMS, SERVICE_ITEMS, JUDGE_ITEMS, codeItemsFor, judgeItemsFor, REVIEW_MODEL, PASS_SCORE, loadReviewPrompt };
