'use strict';

// ── Service page validator (CORE (17), 25 Oct 2026) ──────────────────────────
// The shared checks (validate-v20.js validateCommon and sharedCrossChecks) keyed on the
// service page's fields, plus the service page's own rules:
//   HERO-SVC    BLOCK  hero sentence 1 has no [CV: company_name] or no keyword phrase;
//                      FLAG when a base page's sentence 1 doesn't name the wider area
//   KEYWORD     BLOCK  the keyword phrase anywhere but hero sentence 1 and content block
//                      sentence 1; FLAG when either of those two lacks it
//   TOWN-OTHER  BLOCK  a town page names another service area town (anywhere)
//   LINK-TOWN   BLOCK  link text on a town page carries a town name
//   ITEM        BLOCK  a What's Included item with a full stop, a benefit word (ensure, enjoy,
//                      peace of mind, hassle free), a proof token or a town (the N7 range check holds 4 to 10 words)
//   ITEM-REPEAT FLAG   paragraph 2 repeats an item's wording (four words in a row)
//   CB-PARAS    BLOCK  the content block has fewer than four paragraphs
//   CB-PARA3    FLAG   paragraph 3 shares nothing with the trade facts "what goes wrong" rows (two content words at least)
//   CB-OPENER   BLOCK  the content block opens on the reader's search
//   CB-LINKS    FLAG   a base page's paragraph 4 links none of the area pages; BLOCK over 3
//   BASE-LINK   BLOCK  a town page links its base service page zero times or more than once
//   STANDARD    BLOCK  a standard's number, a regulation, an Act, a Part, a Schedule, a Class or a section number
//   TIMING      FLAG   the trade facts timing (a span of hours, days or weeks, a season window) written more than once on the page
//   RESULT      BLOCK  a promise of a result the business cannot control ("will stay green", "will last 20 years", "for life")
//   MECHANISM   BLOCK  a block 4 card makes a cause from MECHANISMS USED
//   MORE-NAMES  BLOCK  the More Services intro names a service, a town or carries a link
//   AREAS-TOWN  BLOCK  a town page's areas intro names one of its villages (code places the list)
//   AREAS-PAGES BLOCK  the areas intro claims every town has a page
//   AREAS-SERVICES BLOCK the areas intro lists services
//   IDEAS       BLOCK  a sentence remakes an idea from IDEAS USED ELSEWHERE (fuzzy)
//   H1 and area list checks on the code fields (report only)

const { validateCommon, sharedCrossChecks, helpers, RETRY_FLAGS } = require('./validate-v20');
for (const c of ['HERO-SVC', 'KEYWORD', 'CB-LINKS', 'CB-PARA3', 'ITEM-REPEAT', 'TIMING']) RETRY_FLAGS.add(c);
const { LABELS } = require('./page-types/service');
const { matchIdea, contentWords } = require('./ideas');
const { isAdminArea } = require('./client-files');
const { esc, linkUrls, normUrl, scanText, sentences, lc, words } = helpers;

const KEYS = {
  hero: LABELS.hero, content: LABELS.content, finalCta: LABELS.finalCta,
  areasIntro: LABELS.areasIntro, moreLine: LABELS.moreIntro, selfUrl: '/',
};

// The context: the shared one plus the service page's keys and the tagged trade facts rows
function serviceValidationContext(base, D, { tradeFactsRows = [] } = {}) {
  return { ...base, keys: { ...KEYS, selfUrl: D.slug || '/' }, tradeFactsRows };
}

const BENEFIT_RE = /\b(?:ensur(?:e|es|ing)|enjoy(?:s|ing)?|peace of mind|hassle free|stress free|worry free|rest assured|you can relax|guarantee[ds]?|reliable|trusted|expert|professional)\b/i;
const STANDARD_RE = /\bBS\s?\d{3,}|\bEN\s?\d{3,}|\bISO\s?\d{3,}|\bPart\s+[A-P]\b|\bRegulations?\s+\d{4}\b|\bAct\s+\d{4}\b|\bSchedule\s+\d+\b|\bClass\s+[A-Z]\b|\bsection\s+\d+\b|\bregulation\s+\d+\b|\b(?:Order|Act|Regulations|Directive)\s+(?:of\s+)?\d{4}\b/;
const RESULT_RE = /\bwill\s+(?:stay|last|never|always|remain|hold up|keep (?:its|their|looking))\b|\bguaranteed to\b|\bfor life\b|\bnever (?:needs?|have to|again)\b|\bwon't (?:ever )?(?:need|move|rot|fade|come back|return)\b|\blasts? (?:a lifetime|for (?:years|decades)|\d+ years)\b|\bno more (?:weeds|moss|leaks|problems)\b/i;
const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';
const SEASONS = 'spring|summer|autumn|winter';
const NUM = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|forty|fifty|sixty|a few|a couple of|half an)';
const TIMING_RE = new RegExp(`\\b${NUM}\\s*(?:to|or|and|–|-)?\\s*${NUM}?\\s*(?:hours?|days?|weeks?|months?)\\b|\\b(?:between|from)\\s+(?:${MONTHS}|${SEASONS})\\b[^.]{0,20}\\b(?:to|and|through|until)\\s+(?:${MONTHS}|${SEASONS})\\b|\\b(?:weekly|fortnightly|monthly)\\b`, 'i');

function validateService(record, V) {
  const common = validateCommon(record, V);
  const { issues, issue, fields } = common;
  if (record.blocked) return issues;
  const { cv, D } = V;
  const scope = D.scope || record.scope || 'base';
  const town = D.town || record.town || '';
  const svc = lc(D.svc_lower || '');
  const kwRe = svc && town ? new RegExp(`\\b${esc(svc)}\\s+(?:in|around|across|near)\\s+${esc(lc(town))}\\b|\\b${esc(svc)}\\s+${esc(lc(town))}\\b`, 'gi') : null;
  const firstSentence = t => (sentences(t)[0] || '');
  const paragraphsOf = t => String(t || '').split(/\n\n+|\\n\\n/).map(p => p.trim()).filter(Boolean);

  // ── Hero sentence 1 ──
  const hero = fields.find(f => f.ref.key === LABELS.hero);
  if (hero && hero.text.trim()) {
    const s1 = firstSentence(hero.text);
    const blockers = [], problems = [];
    if (!/\[CV: company_name\]/.test(hero.text.split(/(?<=[.!?])\s+/)[0] || '')) blockers.push('it has no [CV: company_name]');
    if (kwRe && !new RegExp(kwRe.source, 'i').test(lc(s1))) blockers.push(`the keyword "${D.keyword}" isn't there as a phrase`);
    if (scope === 'base' && cv.area_wide && !new RegExp(`\\b${esc(lc(cv.area_wide))}\\b`).test(lc(s1))) problems.push(`it doesn't end with the wider area (${cv.area_wide})`);
    if (blockers.length) issue('BLOCK', 'HERO-SVC', hero.label, `Sentence 1: ${blockers.join('; ')}.`, hero.ref);
    if (problems.length) issue('FLAG', 'HERO-SVC', hero.label, `Sentence 1: ${problems.join('; ')}.`, hero.ref);
  }

  // ── Keyword placement: hero sentence 1 and content block sentence 1 only ──
  const cb = fields.find(f => f.ref.key === LABELS.content);
  if (kwRe) {
    for (const f of fields) {
      const s = lc(scanText(f.text));
      const n = (s.match(kwRe) || []).length;
      if (!n) continue;
      const allowed = (f.ref.key === LABELS.hero || f.ref.key === LABELS.content) ? (new RegExp(kwRe.source, 'i').test(lc(firstSentence(f.text))) ? 1 : 0) : 0;
      if (n > allowed) issue('BLOCK', 'KEYWORD', f.label, `The keyword phrase "${D.keyword}" appears here${allowed ? ' beyond sentence 1' : ''}. It belongs in hero sentence 1 and content block sentence 1 only; say "${svc}" or "the work" elsewhere.`, f.ref);
    }
    if (cb && cb.text.trim() && !new RegExp(kwRe.source, 'i').test(lc(firstSentence(cb.text)))) issue('FLAG', 'KEYWORD', cb.label, `Sentence 1 of the content block doesn't carry the keyword "${D.keyword}".`, cb.ref);
  }

  // ── A town page names no other town, and its links are plain names ──
  const otherTowns = (V.towns || []).concat(V.city ? [V.city] : []).filter(t => t && lc(t) !== lc(town) && !isAdminArea(t)).map(t => t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
  if (scope === 'town') {
    for (const f of fields) {
      const s = scanText(f.text);
      const hit = otherTowns.find(t => new RegExp(`\\b${esc(t)}\\b`, 'i').test(s));
      if (hit) issue('BLOCK', 'TOWN-OTHER', f.label, `Names ${hit}. A town page names no other town, anywhere: this page is about ${town} only.`, f.ref);
      for (const m of f.text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        const t = [town, ...otherTowns].find(x => new RegExp(`\\b${esc(x)}\\b`, 'i').test(m[1]));
        if (t) issue('BLOCK', 'LINK-TOWN', f.label, `The link text "${m[1]}" carries a town. On a town page link text is the plain service or page name.`, f.ref);
      }
    }
    const ai = fields.find(f => f.ref.key === LABELS.areasIntro);
    if (ai) {
      const v = ((D.allocated && D.allocated.villages) || []).find(x => x && x.length > 3 && new RegExp(`\\b${esc(x)}\\b`, 'i').test(scanText(ai.text)));
      if (v) issue('BLOCK', 'AREAS-TOWN', ai.label, `Names ${v}. The areas intro names none of the villages; code places the list under it.`, ai.ref);
    }
  }

  // ── What's Included items: a part of the job, never a benefit, a proof or a town ──
  const allTowns = [town, ...otherTowns].filter(Boolean);
  for (const f of fields.filter(x => x.ref.sub === 'item_text')) {
    const t = f.text.trim();
    const problems = [];
    if (/[.!?]$/.test(t)) problems.push('ends with a full stop (no full stop on a tick item)');
    const b = t.match(BENEFIT_RE);
    if (b) problems.push(`"${b[0]}" is a benefit or claim word, not a part of the job`);
    if (/\[CV: /.test(t)) problems.push('carries a client value token (a proof); an item names a part of the job');
    const tw = allTowns.find(x => new RegExp(`\\b${esc(x)}\\b`, 'i').test(t));
    if (tw) problems.push(`names ${tw}; an item names no town`);
    if (linkUrls(t).length) problems.push('carries a link');
    if (problems.length) issue('BLOCK', 'ITEM', f.label, `${problems.join('; ')}. Write the item as a stage, a material, a check or a finish from the trade facts, 4 to 10 words.`, f.ref);
  }

  // ── The content block: four paragraphs, paragraph 3 from the "what goes wrong" rows, the opener ──
  if (cb && cb.text.trim()) {
    const paras = paragraphsOf(cb.text);
    if (paras.length < 4) issue('BLOCK', 'CB-PARAS', cb.label, `${paras.length} paragraph(s): the content block is four short paragraphs (who and where; how the job is done; what goes wrong; where we work) and a closing line, written with \\n\\n between them.`, cb.ref);
    else {
      const wrong = (V.tradeFactsRows || []).filter(r => r.kind === 'what goes wrong').map(r => r.text).join(' ');
      if (wrong) {
        const theirs = contentWords(wrong);
        const mine = contentWords(paras[2]);
        let shared = 0;
        for (const w of mine) if (theirs.has(w)) shared++;
        if (shared < 2) issue('FLAG', 'CB-PARA3', cb.label, 'Paragraph 3 shares nothing with the trade facts "what goes wrong" rows. It names one concrete consequence from those rows (what fails when the job is skipped or done badly), never a scare.', cb.ref);
      }
      // ITEM-REPEAT: paragraph 2 may name a stage an item names, never in the same words
      const p2 = lc(scanText(paras[1])).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ');
      for (const it of record.included || []) {
        const ws = lc(scanText(it.item_text || '')).replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
        for (let i = 0; i + 4 <= ws.length; i++) {
          const g = ws.slice(i, i + 4).join(' ');
          if (p2.includes(g)) { issue('FLAG', 'ITEM-REPEAT', cb.label, `Paragraph 2 repeats the What's Included item "${it.item_title}" word for word ("${g}"). The items name the stages, the paragraph explains them: say it differently.`, cb.ref); break; }
        }
      }
    }
    const s1 = scanText(firstSentence(cb.text));
    const m = s1.match(/^(?:finding|looking for|searching for|choosing|picking|hiring|if you(?:'re| are) (?:looking|searching|hunting|after)|when you(?:'re| are)? (?:look|search|hunt|choose)|anyone (?:looking|searching)|homeowners (?:looking|searching))\b|\b(?:your|the) search\b|\bsearch(?:ing)? for a\b/i);
    if (m) issue('BLOCK', 'CB-OPENER', cb.label, `"${m[0]}": the content block never opens on the reader's search. Open on the place or the work, with the keyword in the sentence.`, cb.ref);
    // Paragraph 4 links: base page 2 or 3 area pages; town page the base page exactly once (anywhere on the page)
    if (scope === 'base') {
      const targets = new Set([...(D.locationLinks || []), ...((D.areas && D.areas.linked) || [])].map(l => normUrl(l.url)));
      const linked = linkUrls(cb.text).map(normUrl).filter(u => targets.has(u));
      if (targets.size && !linked.length) issue('FLAG', 'CB-LINKS', cb.label, 'Paragraph 4 links none of the area pages given in DECISIONS. Link 2 or 3 of them, as the town name or "[service_lower] in [town]".', cb.ref);
      if (linked.length > 3) issue('BLOCK', 'CB-LINKS', cb.label, `The content block links ${linked.length} area pages. Link 3 at most.`, cb.ref);
    }
  }
  if (scope === 'town' && D.baseLink) {
    const base = normUrl(D.baseLink.url);
    let n = 0;
    const where = [];
    for (const f of fields) { const k = linkUrls(f.text).map(normUrl).filter(u => u === base).length; if (k) { n += k; where.push(f.label); } }
    if (!n && cb) issue('BLOCK', 'BASE-LINK', cb.label, `The page never links its base service page ${D.baseLink.url}. Paragraph 4 links it once ("see our full ${svc} service").`, cb.ref);
    if (n > 1) { const f = fields.find(x => x.label === where[where.length - 1]); issue('BLOCK', 'BASE-LINK', f.label, `The base service page ${D.baseLink.url} is linked ${n} times (${where.join(', ')}). Once on the page, in paragraph 4.`, f.ref); }
  }

  // ── Every field: no standard numbers, no result promises, the timing once, mechanisms ──
  let timingSeen = null;
  const mechanisms = (D.mechanismsUsed || []).map(m => ({ ...m, words: contentWords(m.text) })).filter(m => m.words.size >= 2);
  for (const f of fields) {
    const s = scanText(f.text);
    const st = s.match(STANDARD_RE);
    if (st) issue('BLOCK', 'STANDARD', f.label, `"${st[0]}" names a standard, a regulation or an Act by its number or name. Say what usually applies in plain words ("usually", "in most cases") and nothing about the rule itself.`, f.ref);
    const rs = s.match(RESULT_RE);
    if (rs) issue('BLOCK', 'RESULT', f.label, `"${rs[0]}" promises a result the business cannot control. Say what the work does and what it protects against.`, f.ref);
    for (const sen of sentences(f.text)) {
      if (!TIMING_RE.test(sen)) continue;
      if (timingSeen && timingSeen !== f.label) { issue('FLAG', 'TIMING', f.label, `"${sen.slice(0, 70)}…" gives a timing, and ${timingSeen} already does. A timing (how long, when, how soon) is written once on the page.`, f.ref); break; }
      timingSeen = timingSeen || f.label;
    }
    if (f.ref.key === 'block4') {
      const mine = contentWords(f.text);
      const hit = mechanisms.find(m => [...m.words].every(w => mine.has(w)));
      if (hit) issue('BLOCK', 'MECHANISM', f.label, `Makes the cause "${hit.text}", which ${hit.page} already makes (MECHANISMS USED). Each card is a different mechanism: take another cause.`, f.ref);
    }
  }

  // ── The More Services intro names no service, no town, and carries no link ──
  const more = fields.find(f => f.ref.key === LABELS.moreIntro);
  if (more && more.text.trim()) {
    const s = scanText(more.text);
    const problems = [];
    const named = (record.more_cards || []).map(c => c.card_name).find(n => new RegExp(`\\b${esc(n)}\\b`, 'i').test(s));
    if (named) problems.push(`names "${named}" (the cards carry the names)`);
    const tw = allTowns.find(x => new RegExp(`\\b${esc(x)}\\b`, 'i').test(s));
    if (tw) problems.push(`names ${tw}`);
    if (linkUrls(more.text).length) problems.push('carries a link');
    if (problems.length) issue('BLOCK', 'MORE-NAMES', more.label, `${problems.join('; ')}. The More Services intro introduces the other services in this category in one or two sentences: no names, no towns, no links.`, more.ref);
  }

  // ── The areas intro: no services, no claim that every town has a page ──
  const areasIntro = fields.find(f => f.ref.key === LABELS.areasIntro);
  if (areasIntro && areasIntro.text.trim()) {
    const named = [...new Set((V.serviceList || []).filter(sv => sv.say && lc(sv.say) !== svc && new RegExp(`\\b${esc(sv.say)}\\b`, 'i').test(scanText(areasIntro.text))).map(sv => lc(sv.say)))].filter((w, _, all) => !all.some(o => o !== w && o.includes(w)));
    if (named.length >= 2) issue('BLOCK', 'AREAS-SERVICES', areasIntro.label, `Names ${named.join(', ')}. The areas intro says where the business is based and how far it travels; it lists no services.`, areasIntro.ref);
    if ((record.svc_areas_also_cover || []).length) {
      const m = scanText(areasIntro.text).match(/\b(?:each|every|all)\b[^.]{0,40}\b(?:town|place|area|village)s?\b[^.]{0,50}\b(?:pages?)\b|\bpages? of (?:its|their) own\b|\b(?:towns?|places?|areas?)\b[^.]{0,20}\b(?:each|all) (?:have|has|with) (?:a|its own|their own) page/i);
      if (m) issue('BLOCK', 'AREAS-PAGES', areasIntro.label, `"${m[0]}" says every town has a page. ${record.svc_areas_also_cover.length} of the towns have none (they follow the list as "We also cover"). Say the work goes everywhere the business covers, without promising a page.`, areasIntro.ref);
    }
  }

  // ── The final CTA body never opens with "Tell us" (CORE (17)) ──
  const fc = fields.find(f => f.ref.key === LABELS.finalCta);
  if (fc && /^\s*tell us\b/i.test(scanText(fc.text))) issue('FLAG', 'FINAL-CTA', fc.label, 'Opens with "Tell us"; the final CTA body never does. Say what happens when they get in touch.', fc.ref);

  // ── Nothing from IDEAS USED ELSEWHERE (the areas intro is left out: its content is prescribed,
  // "this service in this town and the villages around it", which the category page's hero also
  // says; first real run, 25 Oct) ──
  const ideas = D.ideasUsed || [];
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
  const h1 = record.svc_hero_h1 || '';
  if (/[—–]/.test(h1)) issue('BLOCK', '4a', 'svc_hero_h1', 'H1 contains an em or en dash.');
  if (h1.length > 60) issue('FLAG', '4b', 'svc_hero_h1', `H1 is ${h1.length} characters (max 60).`);
  if (town && !lc(h1).includes(lc(town))) issue('FLAG', '4c', 'svc_hero_h1', `H1 doesn't contain the town "${town}".`);
  if (cv.company_name && lc(h1).includes(lc(cv.company_name))) issue('BLOCK', '4d', 'svc_hero_h1', 'H1 contains the company name.');
  if (scope === 'base') {
    const names = new Set([...(record.svc_areas_links || []).map(a => lc(a.name)), ...(record.svc_areas_also_cover || []).map(lc)]);
    for (const t of V.towns || []) {
      if (isAdminArea(t) || lc(t) === lc(V.city)) continue;
      const short = lc(t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
      if (!names.has(lc(t)) && !names.has(short)) issue('BLOCK', '9', 'svc_areas_links', `The area list (with the "We also cover" line) is missing "${t}".`);
    }
  }
  void words;
  return issues;
}

module.exports = { validateService, serviceValidationContext, KEYS };
