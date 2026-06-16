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

function validate(output, h1, customValuesText) {
  const issues = [];

  // ── 1a. Em / en dash ────────────────────────────────────────────────────
  const dashMatches = [...output.matchAll(/[—–]/g)];
  if (dashMatches.length > 0) {
    issues.push({
      type: 'BLOCK', check: '1a',
      message: `Em/en dash found (${dashMatches.length} occurrence${dashMatches.length > 1 ? 's' : ''}).`,
    });
  }

  // ── 1b. Hyphenated compound words ────────────────────────────────────────
  const hyphenMatches = [...output.matchAll(/\b[A-Za-z]+-[A-Za-z]+\b/g)].map(m => m[0]);
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
    if (output.toLowerCase().includes(phrase)) {
      issues.push({ type: 'BLOCK', check: '2', message: `Banned phrase: "${phrase}"` });
    }
  }

  // ── 2a. solutions / needs ────────────────────────────────────────────────
  if (/\bsolutions\b/i.test(output)) {
    issues.push({ type: 'FLAG', check: '2a', message: 'Word "solutions" found — verify it is not AI prose.' });
  }
  if (/\bneeds\b/i.test(output)) {
    issues.push({ type: 'FLAG', check: '2a', message: 'Word "needs" found — verify it is not AI prose.' });
  }

  // ── 2b. passionate ───────────────────────────────────────────────────────
  if (/\bpassionate\b/i.test(output)) {
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

  // ── 3b. Generic template leftovers (excluding expected [INSERT H1 FROM AHREFS]) ──
  const strippedOutput = output.replace(/\[INSERT H1 FROM AHREFS\]/gi, '');
  if (/(Put your image|Lorem ipsum|\[INSERT|Client copy goes here|\[TODO)/i.test(strippedOutput)) {
    issues.push({ type: 'BLOCK', check: '3b', message: 'Unresolved template placeholder found (e.g. [INSERT…], Lorem ipsum, [TODO]).' });
  }

  // ── 3c. Unknown / unpopulated custom value keys (prose sections only) ───────
  // Fixed template lines (Map section, VA checklist, Footer, Contact static lines)
  // use keys like google_map_embed / company_address that are expected by the template
  // regardless of whether this client has filled them in yet — skip those blocks.
  if (customValuesText && customValuesText.trim()) {
    const populatedKeys = parsePopulatedKeys(customValuesText);
    if (populatedKeys.size > 0) {
      const prose = extractProseSections(output);
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

      if (category1 && !h1t.toLowerCase().includes(category1.toLowerCase())) {
        issues.push({ type: 'FLAG', check: '4c', message: `H1 does not contain the primary category "${category1}".` });
      }
      if (area1 && !h1t.toLowerCase().includes(area1.toLowerCase())) {
        issues.push({ type: 'FLAG', check: '4c', message: `H1 does not contain the primary area "${area1}".` });
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
  const weakPhrases = [
    'find out more', "see what's included", 'get in touch',
    'find out how we can help', 'click here', 'learn more', 'explore our service',
  ];
  for (const phrase of weakPhrases) {
    if (output.toLowerCase().includes(phrase)) {
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
  for (const m of output.matchAll(/FAQ ANSWER \d+:([\s\S]*?)(?=FAQ \d+:|FAQ TEXT:|VIEW ALL|$)/gi)) {
    const ans = m[1];
    if (/\{\{custom_values\.category_/.test(ans) && /\{\{custom_values\.biz_area_/.test(ans)) {
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
  if (customValuesText && customValuesText.trim()) {
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

/**
 * Extract only the freely-generated prose sections from the output.
 * Strips fixed template blocks (Map section, Footer, VA checklist, Contact static lines)
 * so check 3c doesn't false-positive on keys like google_map_embed or company_address
 * that are expected by the template regardless of client population state.
 */
function extractProseSections(output) {
  let prose = output;

  // Remove MAP SECTION block (static template lines with google_map_embed)
  prose = prose.replace(/\bMAP SECTION\b[\s\S]*?(?=\bSCHEMA\b|\bCONTACT SECTION\b)/gi, '');

  // Remove FOOTER block (biz_area_1-6, company_twilio_phone, company_email, state, etc.)
  prose = prose.replace(/\bFOOTER\b[\s\S]*?(?=\bVA IMPLEMENTATION CHECKLIST\b|$)/gi, '');

  // Remove VA IMPLEMENTATION CHECKLIST (company_address, company_phone_functional, google_map_embed)
  prose = prose.replace(/\bVA IMPLEMENTATION CHECKLIST\b[\s\S]*/gi, '');

  // Remove the static MAP: line that may appear outside the MAP SECTION heading
  prose = prose.replace(/^MAP:.*$/gim, '');

  // Remove Contact Section static lines (company_twilio_phone)
  prose = prose.replace(/^CALL BUTTON:.*$/gim, '');

  return prose;
}

module.exports = { validate, parseCustomValuesMap, parsePopulatedKeys };
