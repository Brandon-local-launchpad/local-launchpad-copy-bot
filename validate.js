'use strict';

/**
 * Parse custom values text into a map of { key: value }.
 * Accepts lines like: category_1: Landscaping  or  category_1 = Landscaping
 */
function parseCustomValuesMap(text) {
  const map = {};
  for (const match of text.matchAll(/^([a-z_][a-z_0-9]*)\s*[=:]\s*(.+)$/gim)) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (val) map[key] = val;
  }
  return map;
}

function parsePopulatedKeys(text) {
  return new Set(Object.keys(parseCustomValuesMap(text)));
}

function validate(output, h1, customValuesText, pageType = 'homepage', pageContext = {}) {
  const issues = [];

  // Checks 1a/1b run only against the fenced template block, not the model's reasoning.
  const templateBlock = extractTemplateBlock(output);

  // ── 1a. Em / en dash ────────────────────────────────────────────────────
  // Per spec, three exclusions apply once scoped to the template block —
  // (1) the model's pre-write reasoning before the fenced block (handled by
  //     extractTemplateBlock above — templateBlock never includes it),
  // (2) structural section-label lines using an em/en dash as a separator
  //     (e.g. "SIGNS SECTION — EYEBROW:", "CONTACT — EYEBROW: GET IN TOUCH", "HOW IT WORKS — BODY:"),
  // (3) VA Implementation Checklist bullet lines that use a dash as a separator
  //     (e.g. "- Google Maps embed — embed the GBP map using...").
  const templateBlock1a = templateBlock.replace(/^VA IMPLEMENTATION CHECKLIST[\s\S]*/im, '');
  const templateLines = templateBlock1a.split('\n');
  const proseLines1a = templateLines.filter(line => {
    const t = line.trim();
    // VA annotation lines: [VA — HYPERLINK…], [VA IMPLEMENTATION…], etc.
    if (/^\[VA/i.test(t)) return false;
    // Structural section-label lines: ALPHANUMERIC LABEL — Capitalised continuation
    if (/^[A-Z0-9 /_-]+ [—–] [A-Z]/.test(t)) return false;
    return true;
  });
  const prose1a = proseLines1a.join('\n');
  const dashMatches = [...prose1a.matchAll(/[—–]/g)];
  if (dashMatches.length > 0) {
    issues.push({
      type: 'BLOCK', check: '1a',
      message: `Em/en dash found (${dashMatches.length} occurrence${dashMatches.length > 1 ? 's' : ''}).`,
    });
  }

  // ── 1b. Hyphenated compound words ────────────────────────────────────────
  // Exclude [VA annotation lines and the VA implementation checklist (which
  // contains URL slug examples like /tree-service-winchester that would false-positive).
  const prose1b = templateBlock
    .replace(/^VA IMPLEMENTATION CHECKLIST[\s\S]*/im, '')
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (/^\[VA/i.test(t)) return false;
      if (/^[━─═]+$/.test(t)) return false;
      if (/^-{2,}$/.test(t)) return false;
      return true;
    })
    .join('\n');
  const hyphenMatches = [...prose1b.matchAll(/\b[A-Za-z]+-[A-Za-z]+\b/g)].map(m => m[0]);
  if (hyphenMatches.length > 0) {
    const unique = [...new Set(hyphenMatches)];
    issues.push({
      type: 'FLAG', check: '1b',
      message: `Hyphenated compounds found: ${unique.slice(0, 8).join(', ')}${unique.length > 8 ? ` (+${unique.length - 8} more)` : ''}.`,
    });
  }

  // ── 2. Banned phrases ────────────────────────────────────────────────────
  const bannedPhrases = [
    'look no further', 'your one-stop shop', 'we pride ourselves',
    'we are passionate', 'competitive prices', 'quality service',
    'going above and beyond', 'state of the art', 'cutting edge',
    'second to none', 'bespoke', 'tailored', 'comprehensive',
    'wide range of', 'full range of', 'professional and reliable',
    'friendly team', 'no job too big or too small',
  ];
  for (const phrase of bannedPhrases) {
    if (templateBlock.toLowerCase().includes(phrase)) {
      issues.push({ type: 'BLOCK', check: '2', message: `Banned phrase: "${phrase}"` });
    }
  }

  // ── 2a. solutions / needs ────────────────────────────────────────────────
  if (/\bsolutions\b/i.test(templateBlock)) {
    issues.push({ type: 'FLAG', check: '2a', message: 'Word "solutions" found — verify it is not AI prose.' });
  }
  if (/\bneeds\b/i.test(templateBlock)) {
    issues.push({ type: 'FLAG', check: '2a', message: 'Word "needs" found — verify it is not AI prose.' });
  }

  // ── 2b. passionate ───────────────────────────────────────────────────────
  if (/\bpassionate\b/i.test(templateBlock)) {
    issues.push({ type: 'BLOCK', check: '2b', message: 'Word "passionate" found (banned in all forms).' });
  }

  // ── 3a. [CLIENT TO CONFIRM] as entire answer ─────────────────────────────
  for (const match of output.matchAll(/\[CLIENT TO CONFIRM/gi)) {
    const before = output.substring(Math.max(0, match.index - 300), match.index);
    // Look for a sentence ending (period + space or end) with meaningful text before it
    const lastSentences = before.split(/\.\s+/).filter(s => s.trim().length > 15);
    if (lastSentences.length === 0) {
      issues.push({ type: 'BLOCK', check: '3a', message: '[CLIENT TO CONFIRM] appears with no substantive content before it — the flag IS the entire answer.' });
    } else {
      issues.push({ type: 'FLAG', check: '3a', message: '[CLIENT TO CONFIRM] present — chase before go-live.' });
    }
  }

  // ── 3b. Generic template leftovers ──────────────────────────────────────
  // Strip valid intentional placeholders before checking.
  const strippedOutput = output
    .replace(/\[INSERT H1 FROM AHREFS\]/gi, '')
    .replace(/\[INSERT H1 FROM SOP INSTRUCTIONS\]/gi, '');
  if (/(Put your image|Lorem ipsum|\[INSERT|Client copy goes here|\[TODO)/i.test(strippedOutput)) {
    issues.push({ type: 'BLOCK', check: '3b', message: 'Unresolved template placeholder found (e.g. [INSERT…], Lorem ipsum, [TODO]).' });
  }

  // ── 3c. Unknown / unpopulated custom value keys (prose sections only) ───────
  // Per spec: scope to an ALLOWLIST of named prose-bearing sections (Title Tag,
  // Meta Description, Hero Subheadline, Services Section body, FAQ answers,
  // Meet the Team body, Schema business description) — not an exclusion list of
  // fixed-template keys. Fixed lines (Map, Footer, VA checklist) are never scanned
  // because they are simply never included in the extracted text below.
  if (customValuesText && customValuesText.trim()) {
    const populatedKeys = parsePopulatedKeys(customValuesText);
    if (populatedKeys.size > 0) {
      const prose = extractProseSections(templateBlock);
      const usedKeys = [...prose.matchAll(/\{\{custom_values\.([^}]+)\}\}/g)].map(m => m[1]);
      const unknown = [...new Set(usedKeys.filter(k => !populatedKeys.has(k)))];
      if (unknown.length > 0) {
        issues.push({
          type: 'BLOCK', check: '3c',
          message: `Custom value keys used in prose but not in your populated list: ${unknown.join(', ')}`,
        });
      }
    }
  }

  // ── H1 checks ────────────────────────────────────────────────────────────
  if (h1 && h1.trim()) {
    const h1t = h1.trim();

    // 4a dash
    if (/[—–]/.test(h1t)) {
      issues.push({ type: 'BLOCK', check: '4a', message: 'H1 contains an em/en dash.' });
    }
    if (/\b[A-Za-z]+-[A-Za-z]+\b/.test(h1t)) {
      issues.push({ type: 'FLAG', check: '4a', message: 'H1 contains a hyphenated compound word.' });
    }

    // 4b length
    if (h1t.length > 45) {
      issues.push({
        type: 'FLAG', check: '4b',
        message: `H1 is ${h1t.length} characters (max recommended: 45). Consider moving extra positioning to the subheadline.`,
      });
    }

    // 4c & 4d — need parsed custom values
    if (customValuesText && customValuesText.trim()) {
      const parsed = parseCustomValuesMap(customValuesText);
      const category1 = parsed['category_1'];
      const area1 = parsed['biz_area_1'];
      const companyName = parsed['company_name'];

      // 4c: the category/service and area to check against depend on page type —
      // a service page's H1 should be checked against its OWN service name, not
      // the primary category, and similarly for location / location-category pages.
      let subject, subjectLabel, subjectArea, subjectAreaLabel;
      if (pageType === 'category') {
        subject = pageContext.pageTitle; subjectLabel = 'this page\'s category';
        subjectArea = area1; subjectAreaLabel = 'the primary area';
      } else if (pageType === 'service') {
        subject = pageContext.pageTitle; subjectLabel = 'this page\'s service';
        subjectArea = area1; subjectAreaLabel = 'the primary area';
      } else if (pageType === 'location') {
        subject = category1; subjectLabel = 'the primary category';
        subjectArea = pageContext.pageTitle; subjectAreaLabel = 'this page\'s location';
      } else if (pageType === 'location-category') {
        subject = pageContext.locationCategoryName || pageContext.pageTitle; subjectLabel = 'this page\'s category';
        subjectArea = pageContext.locationName; subjectAreaLabel = 'this page\'s location';
      } else {
        subject = category1; subjectLabel = 'the primary category';
        subjectArea = area1; subjectAreaLabel = 'the primary area';
      }

      if (subject && !h1t.toLowerCase().includes(subject.toLowerCase())) {
        issues.push({ type: 'FLAG', check: '4c', message: `H1 does not contain ${subjectLabel} "${subject}".` });
      }
      if (subjectArea && !h1t.toLowerCase().includes(subjectArea.toLowerCase())) {
        issues.push({ type: 'FLAG', check: '4c', message: `H1 does not contain ${subjectAreaLabel} "${subjectArea}".` });
      }
      if (companyName && h1t.toLowerCase().includes(companyName.toLowerCase())) {
        issues.push({ type: 'BLOCK', check: '4d', message: `H1 contains the company name "${companyName}" — homepage H1 must be [category] [area] only.` });
      }
    }
  }

  // ── 5a. Star rating + customer/jobs count in same sentence ───────────────
  if (/\d\.\d[\s-]*star[^.]{0,80}(\d+\+?\s*(customers|clients|jobs|projects|gardens|homes))/i.test(output)) {
    issues.push({ type: 'BLOCK', check: '5a', message: 'Star rating combined with customer/jobs count in the same sentence — these are different metrics and must not be merged.' });
  }

  // ── 5b. Review count cross-section consistency ───────────────────────────
  const reviewSublineMatch = output.match(/GOOGLE REVIEWS COUNT[^:]*:\s*Based on (\d+)\+?\s*Google reviews/i);
  if (reviewSublineMatch) {
    const official = reviewSublineMatch[1];
    // Search hero + trust bar for a different review count
    const heroTrustMatch = output.match(/HERO SECTION([\s\S]*?)SERVICES SECTION/i);
    const trustBarMatch = output.match(/TRUST BAR([\s\S]*?)SERVICES SECTION/i);
    const zone = (heroTrustMatch?.[1] || '') + (trustBarMatch?.[1] || '');
    for (const m of zone.matchAll(/(\d+)\+?\s*(google )?reviews?/gi)) {
      if (m[1] !== official) {
        issues.push({
          type: 'BLOCK', check: '5b',
          message: `Review count inconsistency: "${m[1]}" in hero/trust bar vs "${official}" in Google Reviews section.`,
        });
      }
    }
  }

  // ── 6a. Weak link phrases ────────────────────────────────────────────────
  // Per spec: scope to the template block, specifically the Services Section body
  // copy and FAQ answers ONLY — not the model's pre-write reasoning (which often
  // recites this exact phrase list as a self-check step), and not label/eyebrow/
  // VA annotation lines. Isolating the exact in-scope text by field label removes
  // the need to guess at label-line patterns line-by-line.
  const prose6a = extractServicesAndFaqBody(templateBlock);
  const weakPhrases = [
    'find out more', "see what's included", 'get in touch',
    'find out how we can help', 'click here', 'learn more', 'explore our service',
  ];
  for (const phrase of weakPhrases) {
    if (prose6a.toLowerCase().includes(phrase)) {
      issues.push({ type: 'BLOCK', check: '6a', message: `Weak link phrase: "${phrase}"` });
    }
  }

  // ── 6b. Editorial link presence per category block ───────────────────────
  // Match each "N - SERVICES {{custom_values.category_N}}:" block up to the IMAGE: line or next block
  for (const block of output.matchAll(/\d+ - SERVICES (\{\{custom_values\.(category_\d+)\}\}):([\s\S]*?)(?=\n\w+ - SERVICES |\nSERVICES BUTTON:|\nFAQ SECTION|$)/gi)) {
    const catPlaceholder = block[1];
    const catKey = block[2];
    const blockText = block[3];
    if (blockText.trim().length < 10) continue; // empty slot, skip
    const hasCategory = blockText.includes(catPlaceholder);
    const hasArea = /\{\{custom_values\.biz_area_/.test(blockText);
    if (!hasCategory || !hasArea) {
      issues.push({
        type: 'BLOCK', check: '6b',
        message: `Category block for ${catKey} is missing an editorial link that contains both the category placeholder and an area placeholder.`,
      });
    }
  }

  // ── 6c. FAQ editorial link count ─────────────────────────────────────────
  let faqEditorialCount = 0;
  const faqMatches = [...output.matchAll(/FAQ — ANSWER \d+:([\s\S]*?)(?=FAQ — |\bVIEW ALL\b|$)/gi)];
  console.log(`\n── DEBUG 6c: found ${faqMatches.length} FAQ answer block(s) ──`);
  for (const m of faqMatches) {
    console.log(`\n  BLOCK:\n${m[1].slice(0, 400)}${m[1].length > 400 ? '\n  ...(truncated)' : ''}`);
  }
  console.log('──────────────────────────────────────────\n');
  for (const m of faqMatches) {
    const ans = m[1];
    const hasArea = /\{\{custom_values\.biz_area_/.test(ans);
    if (hasArea && (/\{\{custom_values\.category_/.test(ans) || /\{\{custom_values\.service_/.test(ans))) {
      faqEditorialCount++;
    }
  }
  if (faqEditorialCount < 2) {
    issues.push({
      type: 'FLAG', check: '6c',
      message: `Only ${faqEditorialCount} FAQ answer(s) contain editorial links (minimum 2 recommended).`,
    });
  }

  // ── 7. Title tag resolved length ─────────────────────────────────────────
  // Character counting isn't reliable inside the model — do it here instead.
  if (customValuesText && customValuesText.trim()) {
    const parsed = parseCustomValuesMap(customValuesText);

    const titleMatch = output.match(/^TITLE TAG:\s*(.+)$/im);
    if (titleMatch) {
      const resolved = resolvePlaceholders(titleMatch[1].trim(), parsed);
      if (resolved.length > 60) {
        issues.push({
          type: 'FLAG', check: '7',
          message: `Title tag is ${resolved.length} characters once resolved (limit 60). Trim the Key Benefit first — category, area, and company name take priority. Resolved value: "${resolved}"`,
        });
      }
    }

    // ── 8. Meta description resolved length ───────────────────────────────
    const metaMatch = output.match(/^META DESCRIPTION:\s*(.+)$/im);
    if (metaMatch) {
      const resolved = resolvePlaceholders(metaMatch[1].trim(), parsed);
      if (resolved.length > 155) {
        issues.push({
          type: 'FLAG', check: '8',
          message: `Meta description is ${resolved.length} characters once resolved (limit 155). Resolved value: "${resolved}"`,
        });
      }
    }
  }

  // ── 9. Areas We Cover completeness ───────────────────────────────────────
  if (pageType === 'homepage' && customValuesText && customValuesText.trim()) {
    const parsed = parseCustomValuesMap(customValuesText);
    const populatedAreas = [];
    for (let n = 1; n <= 14; n++) {
      if (parsed[`biz_area_${n}`]) populatedAreas.push(`biz_area_${n}`);
    }
    if (populatedAreas.length > 0) {
      const areaListMatch = output.match(/AREAS WE COVER[^:]*?AREA LIST:([\s\S]*?)(?=\nAREAS WE COVER[^:]*?LINK:|\nMAP SECTION|$)/i);
      const areaListText = areaListMatch ? areaListMatch[1] : '';
      for (const key of populatedAreas) {
        if (!areaListText.includes(`{{custom_values.${key}}}`)) {
          issues.push({
            type: 'BLOCK', check: '9',
            message: `Areas We Cover is missing {{custom_values.${key}}} ("${parsed[key]}") — every populated service area must appear here.`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Replace every {{custom_values.X}} in a string with its plain-text value from the
 * parsed map, or leave the placeholder as-is if the key isn't found.
 */
function resolvePlaceholders(text, parsedMap) {
  return text.replace(/\{\{custom_values\.([^}]+)\}\}/g, (match, key) => {
    return parsedMap[key] !== undefined ? parsedMap[key] : match;
  });
}

// A line is a "field label" boundary if it looks like "LABEL:" or "LABEL — SUBLABEL:",
// optionally with inline content following the colon on the same line.
const FIELD_LABEL = /^[A-Z0-9][A-Za-z0-9 /_'{}.—–-]{0,80}:/;

/**
 * Generic allowlist-based section extractor. Walks the template block line by
 * line; whenever a line matches `isTargetLabel`, starts capturing (including any
 * inline content after the colon) until the next field-label line of ANY kind is
 * reached. This isolates exactly the named sections without needing to enumerate
 * or guess at every fixed/static field that should be excluded.
 */
function extractLabeledSections(templateBlock, isTargetLabel) {
  const lines = templateBlock.split('\n');
  const collected = [];
  let capturing = false;

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { if (capturing) collected.push(''); continue; }

    if (FIELD_LABEL.test(t)) {
      if (isTargetLabel(t)) {
        capturing = true;
        const after = t.replace(/^[^:]*:/, '').trim();
        if (after) collected.push(after);
      } else {
        capturing = false;
      }
      continue;
    }

    if (capturing) collected.push(raw);
  }

  return collected.join('\n');
}

/**
 * Extract only the freely-generated prose sections from the template block, per
 * Check 3c's spec: Title Tag, Meta Description, Hero Subheadline, Services Section
 * body copy, FAQ answers, Meet the Team body, and the Schema business description.
 * Everything else (Map section, Footer, VA checklist, etc.) is never captured,
 * so there is no exclusion list to maintain as new fixed-template keys appear.
 */
function extractProseSections(templateBlock) {
  return extractLabeledSections(templateBlock, t => (
    /^TITLE TAG:/i.test(t) ||
    /^META DESCRIPTION:/i.test(t) ||
    /^HERO SUBHEADLINE:/i.test(t) ||
    /^\d+\s*-\s*SERVICES\b.*:/i.test(t) ||
    /^FAQ\s*[—–]?\s*ANSWER\s*\d+:/i.test(t) ||
    /MEET THE TEAM\s*[—–-]*\s*BODY:/i.test(t) ||
    /^BUSINESS DESCRIPTION:/i.test(t)
  ));
}

/**
 * Extract only the Services Section body copy and FAQ answers, per Check 6a's
 * spec scope. Narrower than extractProseSections — excludes Title Tag, Meta
 * Description, Hero Subheadline, Meet the Team, and Schema, since 6a's weak-link
 * phrase list is specifically a concern in service descriptions and FAQ answers.
 */
function extractServicesAndFaqBody(templateBlock) {
  return extractLabeledSections(templateBlock, t => (
    /^\d+\s*-\s*SERVICES\b.*:/i.test(t) ||
    /^FAQ\s*[—–]?\s*ANSWER\s*\d+:/i.test(t)
  ));
}

/**
 * Extract the content inside the first ``` fenced block in the output.
 * Used to scope checks 1a/1b to the template copy only, excluding the model's
 * pre-write reasoning which legitimately contains hyphens and dashes.
 * Falls back to the full output if no fences are found.
 */
function extractTemplateBlock(output) {
  // Match from the opening fence to either the closing fence or end of string.
  // The closing fence may be absent if the output was truncated mid-generation.
  const m = output.match(/```(?:[^\n]*)?\n([\s\S]*?)(?:```|$)/);
  return m ? m[1] : output;
}

module.exports = { validate, parseCustomValuesMap, parsePopulatedKeys };
