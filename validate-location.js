'use strict';

// ── Location page validator (CORE (18), 27 Oct 2026) ─────────────────────────
// The shared checks (validate-v20.js validateCommon and sharedCrossChecks) keyed on the
// location page's fields, plus the location page's own rules:
//   HERO-LOC    BLOCK  hero sentence 1 has no [CV: company_name] or no keyword phrase ("a
//                      landscaper working across Winchester": up to two words may sit between
//                      the category word and in/around/across/near)
//   KEYWORD     BLOCK  the keyword phrase anywhere but hero sentence 1 and content block
//                      sentence 1; FLAG when either of those two lacks it
//   TOWN-OTHER  BLOCK  another service area town, or the base town, anywhere; the base town is
//                      allowed once in the areas intro ("our base in Southampton")
//   TOWN-COUNT  FLAG   the town missing from the hero, the services intro, the content block or
//                      the areas intro; BLOCK when it is named more than twice across the other fields
//   LINK-TOWN   BLOCK  link text carries a town name
//   CARD-TARGET BLOCK  a card links a page other than its given target (CARD-LINK, shared, wants the target)
//   CARD-NBHD   BLOCK  a card names an allocated neighbourhood or a village (CARD-LOCAL, shared, covers the neighbourhoods' streets)
//   INTRO-SENTENCES FLAG the services intro runs past 2 sentences
//   CB-PARAS    BLOCK  the content block has fewer than three paragraphs plus the closing line
//   CB-OPENER   BLOCK  the content block opens on the reader's search
//   CB-LINKS    FLAG   the content block links none of the cards' pages; BLOCK over 3, or over 2 in a sentence
//   CB-PROOF    BLOCK  the content block states the guarantee length or the insurance figure (their FAQ answers are their home)
//   CB-P3       BLOCK  paragraph 3 of the content block opens on something other than a town fact (the company, a proof, "day to day")
//   CAUSE-HOME  FLAG   a block 4 cause made in all three of the content block, block 4 and the FAQ (one home, two at most)
//   CB-FACT     BLOCK  a content block paragraph (the closing line apart) shares fewer than two
//                      content words with the research (the town profile, the neighbourhoods, the symptoms)
//   HOW-DONE    BLOCK  a sentence remakes (ideas.js matchIdea, 70%) paragraph 2 of one of the town's
//                      service pages or a trade facts standard method row; FLAG on a stage opener
//                      ("first we", "then we", "the next step", "we start by")
//   MECHANISM   BLOCK  a block 4 card makes a cause from MECHANISMS USED
//   AREAS-TOWN  BLOCK  the areas intro names one of the villages (code places the list)
//   AREAS-SERVICES BLOCK the areas intro lists services
//   FAQ-TOWN-LINK FLAG no FAQ answer links a page in this town
//   FINAL-CTA   FLAG   the final CTA body opens with "Tell us"
//   IDEAS       BLOCK  a sentence remakes an idea from IDEAS USED ELSEWHERE (fuzzy; the areas intro is left out)
//   H1 checks on the code fields (report only)

const { validateCommon, sharedCrossChecks, helpers, RETRY_FLAGS } = require('./validate-v20');
for (const c of ['HERO-LOC', 'KEYWORD', 'CB-LINKS', 'INTRO-SENTENCES', 'TOWN-COUNT', 'HOW-DONE', 'FAQ-TOWN-LINK', 'CAUSE-HOME']) RETRY_FLAGS.add(c);
const { LABELS } = require('./page-types/location');
const { matchIdea, contentWords } = require('./ideas');
const { isAdminArea } = require('./client-files');
const { esc, linkUrls, normUrl, scanText, sentences, lc } = helpers;

const KEYS = {
  hero: LABELS.hero, content: LABELS.content, finalCta: LABELS.finalCta,
  areasIntro: LABELS.areasIntro, moreLine: 'loc_no_more_line', selfUrl: '/',
};

// The context: the shared one plus the location page's keys and the "how it's done" material
// (howItsDone: { paragraphs: [{ page, text }], rows: [{ service, text }] })
function locationValidationContext(base, D, { howItsDone = null } = {}) {
  // A neighbourhood named after the town ("Romsey Old Town and riverside streets") shortens to the
  // town's name, which the shared REPEAT-IN rule then counts across the content paragraphs; the
  // town is allowed in more than one paragraph here (the third real run, 27 Oct)
  const town = lc(D.town || '');
  const neighbourhoodNames = (base.neighbourhoodNames || []).filter(n => lc(n) !== town);
  return { ...base, neighbourhoodNames, keys: { ...KEYS, selfUrl: D.slug || '/' }, howItsDone: howItsDone || { paragraphs: [], rows: [] } };
}

const STAGE_OPENER_RE = /\b(?:first,? we|then we|next,? we|the next step|the first step|we start by|we begin by|after that,? we|once that is done|step one|step two)\b/i;
const SEARCH_OPENER_RE = /^(?:finding|looking for|searching for|choosing|picking|hiring|if you(?:'re| are) (?:looking|searching|hunting|after)|when you(?:'re| are)? (?:look|search|hunt|choose)|anyone (?:looking|searching)|homeowners (?:looking|searching))\b|\b(?:your|the) search\b|\bsearch(?:ing)? for a\b/i;

function validateLocation(record, V) {
  const common = validateCommon(record, V);
  const { issues, issue, fields } = common;
  if (record.blocked) return issues;
  const { cv, D } = V;
  const town = D.town || record.town || '';
  const cat = lc(D.cat_lower || '');
  // "landscaper in Romsey", "landscaper working across Romsey", "landscaper Romsey"
  const kwRe = cat && town ? new RegExp(`\\b${esc(cat)}\\s+(?:\\w+\\s+){0,2}(?:in|around|across|near|covering|serving)\\s+${esc(lc(town))}\\b|\\b${esc(cat)}\\s+${esc(lc(town))}\\b`, 'gi') : null;
  const firstSentence = t => (sentences(t)[0] || '');
  const paragraphsOf = t => String(t || '').split(/\n\n+|\\n\\n/).map(p => p.trim()).filter(Boolean);
  const townRe = town ? new RegExp(`\\b${esc(town)}\\b`, 'gi') : null;

  // ── Hero sentence 1 ──
  const hero = fields.find(f => f.ref.key === LABELS.hero);
  if (hero && hero.text.trim()) {
    const s1 = firstSentence(hero.text);
    const blockers = [];
    if (!/\[CV: company_name\]/.test(hero.text.split(/(?<=[.!?])\s+/)[0] || '')) blockers.push('it has no [CV: company_name]');
    if (kwRe && !new RegExp(kwRe.source, 'i').test(lc(s1))) blockers.push(`the keyword "${D.keyword}" isn't there as a phrase`);
    if (blockers.length) issue('BLOCK', 'HERO-LOC', hero.label, `Sentence 1: ${blockers.join('; ')}.`, hero.ref);
  }

  // ── Keyword placement: hero sentence 1 and content block sentence 1 only ──
  const cb = fields.find(f => f.ref.key === LABELS.content);
  if (kwRe) {
    for (const f of fields) {
      const s = lc(scanText(f.text));
      const n = (s.match(kwRe) || []).length;
      if (!n) continue;
      const allowed = (f.ref.key === LABELS.hero || f.ref.key === LABELS.content) ? (new RegExp(kwRe.source, 'i').test(lc(firstSentence(f.text))) ? 1 : 0) : 0;
      if (n > allowed) issue('BLOCK', 'KEYWORD', f.label, `The keyword phrase "${D.keyword}" appears here${allowed ? ' beyond sentence 1' : ''}. It belongs in hero sentence 1 and content block sentence 1 only; say "${D.work_lower || cat}" or "the work" elsewhere.`, f.ref);
    }
    if (cb && cb.text.trim() && !new RegExp(kwRe.source, 'i').test(lc(firstSentence(cb.text)))) issue('FLAG', 'KEYWORD', cb.label, `Sentence 1 of the content block doesn't carry the keyword "${D.keyword}".`, cb.ref);
  }

  // ── The town rule: no other town anywhere; the base town once in the areas intro; link text plain ──
  const base = (V.city || '').trim();
  const otherTowns = (V.towns || []).filter(t => t && lc(t) !== lc(town) && lc(t) !== lc(base) && !isAdminArea(t)).map(t => t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
  for (const f of fields) {
    const s = scanText(f.text);
    const hit = otherTowns.find(t => new RegExp(`\\b${esc(t)}\\b`, 'i').test(s));
    if (hit) issue('BLOCK', 'TOWN-OTHER', f.label, `Names ${hit}. A location page names no other town, anywhere: this page is about ${town} only.`, f.ref);
    if (base && lc(base) !== lc(town)) {
      const n = (s.match(new RegExp(`\\b${esc(base)}\\b`, 'gi')) || []).length;
      if (n && f.ref.key !== LABELS.areasIntro) issue('BLOCK', 'TOWN-OTHER', f.label, `Names ${base}, the base town. On a location page the base is named once, in the areas intro only ("our base in ${base}").`, f.ref);
      else if (n > 1) issue('BLOCK', 'TOWN-OTHER', f.label, `Names ${base} ${n} times. The base town is named once in the areas intro ("our base in ${base}").`, f.ref);
    }
    for (const m of f.text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      const t = [town, base, ...otherTowns].filter(Boolean).find(x => new RegExp(`\\b${esc(x)}\\b`, 'i').test(m[1]));
      if (t) issue('BLOCK', 'LINK-TOWN', f.label, `The link text "${m[1]}" carries a town. On a location page link text is the plain category or service name.`, f.ref);
    }
  }

  // ── The town name count: in the hero, the services intro, the content block and the areas intro; twice elsewhere at most ──
  if (townRe) {
    const must = [LABELS.hero, LABELS.servicesIntro, LABELS.content, LABELS.areasIntro];
    let elsewhere = 0;
    for (const f of fields) {
      const n = (scanText(f.text).match(townRe) || []).length;
      if (must.includes(f.ref.key)) { if (!n) issue('FLAG', 'TOWN-COUNT', f.label, `Doesn't name ${town}. The town appears in the hero, the services intro, the content block and the areas intro.`, f.ref); continue; }
      if (!n) continue;
      elsewhere += n;
      if (elsewhere > 2) issue('BLOCK', 'TOWN-COUNT', f.label, `Names ${town}: outside the hero, the services intro, the content block and the areas intro the town is named twice at most on the page, and two other fields already name it. Rewrite this field without "${town}" at all ("here", "the town", or nothing).`, f.ref);
    }
  }

  // ── Cards: their given target and nothing else; no neighbourhood or village ──
  const villages = ((D.allocated && D.allocated.villages) || []).filter(x => x && x.length > 3);
  const nbhds = ((D.allocated && D.allocated.neighbourhoods) || []).map(n => n.name).filter(x => x && x.length > 3);
  (record.cards || []).forEach((c, i) => {
    const f = fields.find(x => x.ref.key === 'cards' && x.ref.index === i);
    if (!f) return;
    if (c.card_url) {
      const other = linkUrls(f.text).map(normUrl).find(u => u !== normUrl(c.card_url));
      if (other) issue('BLOCK', 'CARD-TARGET', f.label, `Links ${other}; this card links only its own page ${c.card_url}.`, f.ref);
    }
    const place = [...nbhds, ...villages].find(p => new RegExp(`\\b${esc(p)}\\b`, 'i').test(scanText(f.text)));
    if (place) issue('BLOCK', 'CARD-NBHD', f.label, `Names ${place}. No neighbourhoods or villages in cards: the content block and the area list carry them.`, f.ref);
  });

  // ── The services intro is two sentences ──
  const intro = fields.find(f => f.ref.key === LABELS.servicesIntro);
  if (intro && intro.text.trim()) {
    const n = sentences(intro.text).length;
    if (n > 2) issue('FLAG', 'INTRO-SENTENCES', intro.label, `${n} sentences: the services intro is 2 sentences, what the business does in the town and for whom.`, intro.ref);
  }

  // ── The content block: three or four paragraphs and a closing line, the opener, the links, a town fact in every paragraph ──
  if (cb && cb.text.trim()) {
    const paras = paragraphsOf(cb.text);
    if (paras.length < 3) issue('BLOCK', 'CB-PARAS', cb.label, `${paras.length} paragraph(s): the content block is three or four short paragraphs (the town; the neighbourhoods; what they do here) and a closing line, written with \\n\\n between them.`, cb.ref);
    const s1 = scanText(firstSentence(cb.text));
    const m = s1.match(SEARCH_OPENER_RE);
    if (m) issue('BLOCK', 'CB-OPENER', cb.label, `"${m[0]}": the content block never opens on the reader's search. Open on the town or the work, with the keyword in the sentence.`, cb.ref);
    const targets = new Set((D.contentLinks || []).map(l => normUrl(l.url)));
    const linked = linkUrls(cb.text).map(normUrl).filter(u => targets.has(u));
    if (targets.size && !linked.length) issue('FLAG', 'CB-LINKS', cb.label, "Paragraph 3 links none of the cards' pages. Link 2 or 3 of them, each with a reason.", cb.ref);
    if (linked.length > 3) issue('BLOCK', 'CB-LINKS', cb.label, `The content block links ${linked.length} of the cards' pages. Link 3 at most, each with its own reason: the cards link the rest.`, cb.ref);
    for (const sen of sentences(cb.text)) {
      const rawSen = cb.text.split(/\n\n+|\\n\\n|(?<=[.!?])\s+(?=["“A-Z0-9£\[])/).find(x => scanText(x).trim() === sen);
      const n = rawSen ? linkUrls(rawSen).length : 0;
      if (n > 2) issue('BLOCK', 'CB-LINKS', cb.label, `A sentence carries ${n} links. Two in one sentence at most, each with a reason.`, cb.ref);
    }
    // CB-PROOF: the guarantee length and the insurance figure have their FAQ answers as their home, never the content block
    {
      const s = scanText(cb.text);
      const hits = [];
      if (/\[CV: (?:insurance_cover|guarantee_years|guarantee_scope|manufacturer_warranty)\]/.test(cb.text)) hits.push('a guarantee or insurance token');
      if (cv.insurance_cover && new RegExp(`£?\\s?${esc(String(cv.insurance_cover))}\\b`, 'i').test(s)) hits.push('the insurance figure');
      if (cv.guarantee_years && new RegExp(`\\b${esc(String(cv.guarantee_years))}\\s*(?:year|yr)s?\\b[^.]{0,30}\\b(?:guarantee|warranty)|\\b(?:guarantee|warranty)\\b[^.]{0,30}\\b${esc(String(cv.guarantee_years))}\\s*(?:year|yr)s?\\b`, 'i').test(s)) hits.push('the guarantee length');
      if (hits.length) issue('BLOCK', 'CB-PROOF', cb.label, `Carries ${hits.join(' and ')}. The content block never states the guarantee length or the insurance figure: their FAQ answers are their home.`, cb.ref);
    }
    // CB-FACT: every paragraph but the closing line carries a fact from the research
    const research = contentWords(V.researchText || '');
    if (research.size >= 4 && paras.length >= 2) {
      const body = paras.length >= 3 ? paras.slice(0, -1) : paras;
      body.forEach((p, i) => {
        let shared = 0;
        for (const w of contentWords(p)) if (research.has(w)) shared++;
        if (shared < 2) issue('BLOCK', 'CB-FACT', cb.label, `Paragraph ${i + 1} carries no fact from the town profile or the neighbourhoods. Every paragraph of the content block names a town fact and says what it means for the work.`, cb.ref);
      });
      // CB-P3: paragraph 3 opens on a town fact like paragraphs 1 and 2; a generic opener (the
      // company, a proof, "day to day") is a BLOCK (Brandon, 27 Oct, after the Romsey runs)
      if (body.length >= 3) {
        const s1 = sentences(body[2])[0] || '';
        let shared = 0;
        for (const w of contentWords(s1)) if (research.has(w)) shared++;
        if (shared < 2) issue('BLOCK', 'CB-P3', cb.label, `Paragraph 3 opens "${scanText(s1).slice(0, 60)}…", not on a town fact. Open it on a fact from the town profile or a neighbourhood, as paragraphs 1 and 2 do, then the links with their reasons.`, cb.ref);
      }
    }
  }

  // ── Every field: no how it's done sentence, no mechanism from MECHANISMS USED ──
  const H = V.howItsDone || { paragraphs: [], rows: [] };
  const howIdeas = [
    ...(H.paragraphs || []).flatMap(p => sentences(p.text || '').map(s => ({ page: p.page || "a service page", text: scanText(s).trim() }))),
    ...(H.rows || []).map(r => ({ page: `the trade facts (${r.service || 'standard method'})`, text: String(r.text || '').replace(/\s*(?:→|->)\s*/g, ', ') })),
  ].filter(i => i.text && contentWords(i.text).size >= 4);
  const mechanisms = (D.mechanismsUsed || []).map(m => ({ ...m, words: contentWords(m.text) })).filter(m => m.words.size >= 2);
  for (const f of fields) {
    let hit = null;
    for (const sen of sentences(f.text)) {
      hit = howIdeas.length ? matchIdea(sen, howIdeas) : null;
      if (hit) { issue('BLOCK', 'HOW-DONE', f.label, `"${scanText(sen).slice(0, 80)}…" explains how a job is done, as ${hit.page} already does ("${hit.text.slice(0, 80)}…"). Nothing on this page explains a job: say what the town's homes need and link the page that explains the work.`, f.ref); break; }
    }
    if (!hit) {
      const m = scanText(f.text).match(STAGE_OPENER_RE);
      if (m) issue('FLAG', 'HOW-DONE', f.label, `"${m[0]}" walks through a job stage by stage. The service pages explain how the work is done; this page says what the town's homes need.`, f.ref);
    }
    if (f.ref.key === 'block4') {
      const mine = contentWords(f.text);
      const used = mechanisms.find(mm => [...mm.words].every(w => mine.has(w)));
      if (used) issue('BLOCK', 'MECHANISM', f.label, `Makes the cause "${used.text}", which ${used.page} already makes (MECHANISMS USED). Each card is a different mechanism: take another cause.`, f.ref);
    }
  }

  // ── One home per cause (Brandon, 27 Oct): a block 4 cause made in all three of the content
  // block, block 4 and the FAQ is a FLAG for rewrite on the FAQ answer (the last of the three) ──
  {
    const causes = (D.problems || []).map(p => ({ title: p.title, text: p.mechanism || '', words: contentWords(p.mechanism || '') })).filter(c => c.words.size >= 2);
    // A field makes a cause when 70% of the cause's content words are in it ("under" and "were"
    // count as content words, so every word is too strict for prose)
    const makes = (text, words) => { const mine = contentWords(text); let n = 0; for (const w of words) if (mine.has(w)) n++; return n / words.size >= 0.7; };
    for (const c of causes) {
      const inContent = !!(cb && makes(cb.text, c.words));
      const inBlock4 = fields.some(f => f.ref.key === 'block4' && makes(f.text, c.words));
      const faqField = fields.find(f => f.ref.sub === 'faq_answer' && makes(f.text, c.words));
      if (inContent && inBlock4 && faqField) issue('FLAG', 'CAUSE-HOME', faqField.label, `Makes the cause "${c.text}" again: the content block and block 4 ("${c.title}") already make it. A cause has one home on the page, two at most: take another angle here.`, faqField.ref);
    }
  }

  // ── The areas intro: none of the villages, no services ──
  const ai = fields.find(f => f.ref.key === LABELS.areasIntro);
  if (ai && ai.text.trim()) {
    const v = villages.find(x => new RegExp(`\\b${esc(x)}\\b`, 'i').test(scanText(ai.text)));
    if (v) issue('BLOCK', 'AREAS-TOWN', ai.label, `Names ${v}. The areas intro names none of the villages; code places the list under it.`, ai.ref);
    const named = [...new Set((V.serviceList || []).filter(sv => sv.say && new RegExp(`\\b${esc(sv.say)}\\b`, 'i').test(scanText(ai.text))).map(sv => lc(sv.say)))].filter((w, _, all) => !all.some(o => o !== w && o.includes(w)));
    if (named.length >= 2) issue('BLOCK', 'AREAS-SERVICES', ai.label, `Names ${named.join(', ')}. The areas intro says the business covers the town and the villages around it, and how it reaches them; it lists no services.`, ai.ref);
  }

  // ── At least one FAQ answer links a page in this town ──
  if (D.townPagePrefix && (record.faq_items || []).length) {
    const prefix = normUrl(D.townPagePrefix).replace(/\/+$/, '') + '/';
    const any = fields.some(f => f.ref.sub === 'faq_answer' && linkUrls(f.text).map(normUrl).some(u => u.startsWith(prefix)));
    if (!any) issue('FLAG', 'FAQ-TOWN-LINK', 'faq_items', `No FAQ answer links a page in ${town}. At least one answer links one of this town's pages (LINKABLE PAGES).`);
  }

  // ── The final CTA body never opens with "Tell us" (CORE (18)) ──
  const fc = fields.find(f => f.ref.key === LABELS.finalCta);
  if (fc && /^\s*tell us\b/i.test(scanText(fc.text))) issue('FLAG', 'FINAL-CTA', fc.label, 'Opens with "Tell us"; the final CTA body never does. Say what happens when they get in touch from the town.', fc.ref);

  // ── Nothing from IDEAS USED ELSEWHERE (the areas intro is left out: its content is prescribed; a
  // proof idea is left out too: the differentiator is on every page by rule and PROOF-REPEAT holds
  // its count; the first real run, 27 Oct, blocked "family run and independent" against the town's
  // service page) ──
  const ideas = (D.ideasUsed || []).filter(i => i.kind !== 'proof');
  if (ideas.length) {
    for (const f of fields) {
      if (f.ref.key === LABELS.areasIntro) continue;
      for (const s of sentences(f.text)) {
        const hit = matchIdea(s, ideas);
        if (hit) { issue('BLOCK', 'IDEAS', f.label, `"${scanText(s).slice(0, 80)}…" remakes an idea the ${hit.page} already made ("${hit.text.slice(0, 80)}…"). Find a different angle.`, f.ref); break; }
      }
    }
  }

  sharedCrossChecks(record, V, common);

  // ── Code fields (report only) ──
  const h1 = record.loc_hero_h1 || '';
  if (/[—–]/.test(h1)) issue('BLOCK', '4a', 'loc_hero_h1', 'H1 contains an em or en dash.');
  if (h1.length > 60) issue('FLAG', '4b', 'loc_hero_h1', `H1 is ${h1.length} characters (max 60).`);
  if (town && !lc(h1).includes(lc(town))) issue('FLAG', '4c', 'loc_hero_h1', `H1 doesn't contain the town "${town}".`);
  if (cv.company_name && lc(h1).includes(lc(cv.company_name))) issue('BLOCK', '4d', 'loc_hero_h1', 'H1 contains the company name.');
  return issues;
}

module.exports = { validateLocation, locationValidationContext, KEYS };
