'use strict';

// ── Category page validator (23 Oct 2026) ────────────────────────────────────
// The shared checks (validate-v20.js validateCommon and sharedCrossChecks) keyed on the
// category page's fields, plus the category page's own rules:
//   HERO-CAT    BLOCK  hero sentence 1 has no [CV: company_name] or no keyword phrase;
//                      FLAG when a base page's sentence 1 doesn't name the wider area
//   TOWN-OTHER  BLOCK  a town page names another service area town (anywhere)
//   CARD-LINK   BLOCK  (shared) every card links its given target inside a sentence
//   CARD-TARGET BLOCK  a card links a page other than its given target
//   LINK-TOWN   BLOCK  link text on a town page carries a town name
//   KEYWORD     BLOCK  the keyword phrase anywhere but hero sentence 1 and content block
//                      sentence 1; FLAG when either of those two lacks it
//   IDEAS       BLOCK  a sentence remakes an idea from IDEAS USED ELSEWHERE (fuzzy)
//   CB-LINKS    FLAG   the content block carries no link to a section 3 page
//   AREAS-TOWN  BLOCK  a town page's areas intro names one of its villages (code places the list)
//   CARD-TOWN   BLOCK  a town page card names the town (Brandon, 25 Oct: fail, not flag)
//   AREAS-PAGES BLOCK  the areas intro claims every town has a page (the "We also cover" towns have none)
//   CB-LINKS    BLOCK  paragraph 2 carries more than 3 section 3 links, or a sentence more than 2
//   INTRO-SENTENCES FLAG the services intro runs past 2 sentences (Brandon, 25 Oct)
//   H1 and area list checks on the code fields (report only)

const { validateCommon, sharedCrossChecks, helpers, RETRY_FLAGS } = require('./validate-v20');
// The category page's own FLAGs are rewritten by the retries like the shared ones
for (const c of ['HERO-CAT', 'KEYWORD', 'CB-LINKS', 'INTRO-SENTENCES']) RETRY_FLAGS.add(c);
const { LABELS } = require('./page-types/category');
const { matchIdea } = require('./ideas');
const { isAdminArea } = require('./client-files');
const { esc, linkUrls, normUrl, scanText, sentences, lc } = helpers;

const KEYS = {
  hero: LABELS.hero, content: LABELS.content, finalCta: LABELS.finalCta,
  areasIntro: LABELS.areasIntro, moreLine: LABELS.alsoOffered, selfUrl: '/',
};

// The context: the shared one plus the category page's keys and lists
function categoryValidationContext(base, D) {
  return { ...base, keys: { ...KEYS, selfUrl: D.slug || '/' } };
}

function validateCategory(record, V) {
  const common = validateCommon(record, V);
  const { issues, issue, fields } = common;
  if (record.blocked) return issues;
  const { cv, D } = V;
  const scope = D.scope || record.scope || 'base';
  const town = D.town || record.town || '';
  const cat = lc(D.cat_lower || '');
  const kwRe = cat && town ? new RegExp(`\\b${esc(cat)}\\s+(?:in|around|across|near)\\s+${esc(lc(town))}\\b|\\b${esc(cat)}\\s+${esc(lc(town))}\\b`, 'gi') : null;
  const firstSentence = t => (sentences(t)[0] || '');

  // ── Hero sentence 1 ──
  const hero = fields.find(f => f.ref.key === LABELS.hero);
  if (hero && hero.text.trim()) {
    const s1 = firstSentence(hero.text);
    const blockers = [], problems = [];
    if (!/\[CV: company_name\]/.test(hero.text.split(/(?<=[.!?])\s+/)[0] || '')) blockers.push('it has no [CV: company_name]');
    if (kwRe && !new RegExp(kwRe.source, 'i').test(lc(s1))) blockers.push(`the keyword "${D.keyword}" isn't there as a phrase`);
    if (scope === 'base' && cv.area_wide && !new RegExp(`\\b${esc(lc(cv.area_wide))}\\b`).test(lc(s1))) problems.push(`it doesn't end with the wider area (${cv.area_wide})`);
    if (blockers.length) issue('BLOCK', 'HERO-CAT', hero.label, `Sentence 1: ${blockers.join('; ')}.`, hero.ref);
    if (problems.length) issue('FLAG', 'HERO-CAT', hero.label, `Sentence 1: ${problems.join('; ')}.`, hero.ref);
  }

  // ── Keyword placement: hero sentence 1 and content block sentence 1 only ──
  const cb = fields.find(f => f.ref.key === LABELS.content);
  if (kwRe) {
    for (const f of fields) {
      const s = lc(scanText(f.text));
      const n = (s.match(kwRe) || []).length;
      if (!n) continue;
      const allowed = (f.ref.key === LABELS.hero || f.ref.key === LABELS.content) ? (new RegExp(kwRe.source, 'i').test(lc(firstSentence(f.text))) ? 1 : 0) : 0;
      if (n > allowed) issue('BLOCK', 'KEYWORD', f.label, `The keyword phrase "${D.keyword}" appears here${allowed ? ' beyond sentence 1' : ''}. It belongs in hero sentence 1 and content block sentence 1 only; say "${cat}" or "the work" elsewhere.`, f.ref);
    }
    if (cb && cb.text.trim() && !new RegExp(kwRe.source, 'i').test(lc(firstSentence(cb.text)))) issue('FLAG', 'KEYWORD', cb.label, `Sentence 1 of the content block doesn't carry the keyword "${D.keyword}".`, cb.ref);
  }

  // ── A town page names no other town ──
  if (scope === 'town') {
    const others = (V.towns || []).concat(V.city ? [V.city] : []).filter(t => t && lc(t) !== lc(town) && !isAdminArea(t)).map(t => t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
    for (const f of fields) {
      const s = scanText(f.text);
      const hit = others.find(t => new RegExp(`\\b${esc(t)}\\b`, 'i').test(s));
      if (hit) issue('BLOCK', 'TOWN-OTHER', f.label, `Names ${hit}. A town page names no other town, anywhere: this page is about ${town} only.`, f.ref);
      // Link text carries no town
      for (const m of f.text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        const t = [town, ...others].find(x => new RegExp(`\\b${esc(x)}\\b`, 'i').test(m[1]));
        if (t) issue('BLOCK', 'LINK-TOWN', f.label, `The link text "${m[1]}" carries a town. On a town page link text is the plain service or page name.`, f.ref);
      }
    }
    // A card never names the town: the page is about the town already
    for (const f of fields.filter(x => x.ref.sub === 'card_text')) {
      if (new RegExp(`\\b${esc(town)}\\b`, 'i').test(scanText(f.text))) issue('BLOCK', 'CARD-TOWN', f.label, `Names ${town}. A town page's cards say what the service does, never where: the page is about ${town} already.`, f.ref);
    }
    // The areas intro names none of the villages: code places the list
    const ai = fields.find(f => f.ref.key === LABELS.areasIntro);
    if (ai) {
      const v = ((D.allocated && D.allocated.villages) || []).find(x => x && x.length > 3 && new RegExp(`\\b${esc(x)}\\b`, 'i').test(scanText(ai.text)));
      if (v) issue('BLOCK', 'AREAS-TOWN', ai.label, `Names ${v}. The areas intro names none of the villages; code places the list under it.`, ai.ref);
    }
  }

  // ── The services intro is two sentences ──
  const intro = fields.find(f => f.ref.key === LABELS.servicesIntro);
  if (intro && intro.text.trim()) {
    const n = sentences(intro.text).length;
    if (n > 2) issue('FLAG', 'INTRO-SENTENCES', intro.label, `${n} sentences: the services intro is 2 sentences, what the work covers and who it is for.`, intro.ref);
  }

  // ── Cards link their given target and nothing else ──
  (record.cards || []).forEach((c, i) => {
    const f = fields.find(x => x.ref.key === 'cards' && x.ref.index === i);
    if (!f || !c.card_url) return;
    const other = linkUrls(f.text).map(normUrl).find(u => u !== normUrl(c.card_url));
    if (other) issue('BLOCK', 'CARD-TARGET', f.label, `Links ${other}; this card links only its own page ${c.card_url}.`, f.ref);
  });

  // ── Content block links a section 3 page: 3 at most, 2 a sentence at most ──
  if (cb && cb.text.trim()) {
    const targets = new Set((D.contentLinks || []).map(l => normUrl(l.url)));
    const s3 = linkUrls(cb.text).map(normUrl).filter(u => targets.has(u));
    if (targets.size && !s3.length) issue('FLAG', 'CB-LINKS', cb.label, 'Paragraph 2 links none of the section 3 pages. Link up to 3 of the service pages given in DECISIONS, each with a reason.', cb.ref);
    if (s3.length > 3) issue('BLOCK', 'CB-LINKS', cb.label, `The content block links ${s3.length} service pages. Link 3 at most, each with its own reason: the cards already link every service.`, cb.ref);
    for (const sen of sentences(cb.text)) {
      // sentences() strips the links, so count them on the raw text of the sentence
      const rawSen = cb.text.split(/\n\n+|(?<=[.!?])\s+(?=["“A-Z0-9£\[])/).find(x => scanText(x).trim() === sen);
      const n = rawSen ? linkUrls(rawSen).length : 0;
      if (n > 2) issue('BLOCK', 'CB-LINKS', cb.label, `A sentence carries ${n} links. Two in one sentence at most, each with a reason.`, cb.ref);
    }
  }
  // ── The areas intro never claims every town has a page ──
  const ai = fields.find(f => f.ref.key === LABELS.areasIntro);
  if (ai && ai.text.trim() && (record.cat_areas_also_cover || []).length) {
    const m = scanText(ai.text).match(/\b(?:each|every|all)\b[^.]{0,40}\b(?:town|place|area|village)s?\b[^.]{0,50}\b(?:pages?)\b|\bpages? of (?:its|their) own\b|\b(?:towns?|places?|areas?)\b[^.]{0,20}\b(?:each|all) (?:have|has|with) (?:a|its own|their own) page/i);
    if (m) issue('BLOCK', 'AREAS-PAGES', ai.label, `"${m[0]}" says every town has a page. ${record.cat_areas_also_cover.length} of the towns have none (they follow the list as "We also cover"). Say the work goes everywhere the business covers, without promising a page.`, ai.ref);
  }

  // ── Nothing from IDEAS USED ELSEWHERE ──
  const ideas = D.ideasUsed || [];
  if (ideas.length) {
    for (const f of fields) {
      for (const s of sentences(f.text)) {
        const hit = matchIdea(s, ideas);
        if (hit) { issue('BLOCK', 'IDEAS', f.label, `"${scanText(s).slice(0, 80)}…" remakes an idea the ${hit.page} already made ("${hit.text.slice(0, 80)}…"). Find a different angle.`, f.ref); break; }
      }
    }
  }

  sharedCrossChecks(record, V, common);

  // ── Code fields (report only) ──
  const h1 = record.cat_hero_h1 || '';
  if (/[—–]/.test(h1)) issue('BLOCK', '4a', 'cat_hero_h1', 'H1 contains an em or en dash.');
  if (h1.length > 60) issue('FLAG', '4b', 'cat_hero_h1', `H1 is ${h1.length} characters (max 60).`);
  if (town && !lc(h1).includes(lc(town))) issue('FLAG', '4c', 'cat_hero_h1', `H1 doesn't contain the town "${town}".`);
  if (cv.company_name && lc(h1).includes(lc(cv.company_name))) issue('BLOCK', '4d', 'cat_hero_h1', 'H1 contains the company name.');
  if (scope === 'base') {
    const names = new Set([...(record.cat_areas_links || []).map(a => lc(a.name)), ...(record.cat_areas_also_cover || []).map(lc)]);
    for (const t of V.towns || []) {
      if (isAdminArea(t) || lc(t) === lc(V.city)) continue;
      const short = lc(t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
      if (!names.has(lc(t)) && !names.has(short)) issue('BLOCK', '9', 'cat_areas_links', `The area list (with the "We also cover" line) is missing "${t}".`);
    }
  }
  return issues;
}

module.exports = { validateCategory, categoryValidationContext, KEYS };
