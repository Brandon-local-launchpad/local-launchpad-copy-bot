'use strict';

// ── Geo dossier parser ───────────────────────────────────────────────────────
// Reads a saved dossier (Geo_Research_CORE v6 format, headings normalised to
// "## N. NAME" by validateAndCleanDossier) into neighbourhoods, issues, symptoms
// and rules. No model calls. Tolerates the common Perplexity drift: IDs with or
// without brackets, symptoms as bullets or as table rows.

const ID_RE  = /[A-Z]{2,4}-[NISR]\d{2,3}/;
const ID_RE_G = /[A-Z]{2,4}-[NISR]\d{2,3}/g;

// Split the dossier into its numbered sections: { 2: '...', 3: '...' }
function splitSections(text) {
  const sections = {};
  const re = /^##\s*(\d+)\.\s*[^\n]*$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(text))) marks.push({ n: parseInt(m[1], 10), start: m.index, bodyStart: re.lastIndex });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length;
    sections[marks[i].n] = text.slice(marks[i].bodyStart, end).replace(/END OF DOSSIER[\s\S]*$/, '').trim();
  }
  return sections;
}

// Split a section into "### heading" blocks: [{ heading, body }]
function splitBlocks(sectionText) {
  if (!sectionText) return [];
  const parts = sectionText.split(/^###\s*/m).slice(1);
  return parts.map(p => {
    const nl = p.indexOf('\n');
    return { heading: (nl < 0 ? p : p.slice(0, nl)).trim(), body: (nl < 0 ? '' : p.slice(nl + 1)).trim() };
  });
}

// "[SOU-N01] Bassett | neighbourhood" → { id, rest: ['Bassett', 'neighbourhood'] }
function parseHeading(heading) {
  const idm = heading.match(ID_RE);
  if (!idm) return null;
  const rest = heading.slice(idm.index + idm[0].length)
    .replace(/^[\]\s|:.\-–—]+/, '')
    .split('|').map(s => s.trim()).filter(Boolean);
  return { id: idm[0], rest };
}

// Value of a "Label: value" field, running until the next known label
function field(body, label, nextLabels) {
  const re = new RegExp(`^\\s*\\**${label}\\**\\s*:\\s*`, 'im');
  const m = re.exec(body);
  if (!m) return '';
  let rest = body.slice(m.index + m[0].length);
  let cut = rest.length;
  for (const nl of nextLabels) {
    const nm = new RegExp(`^\\s*\\**${nl}\\**\\s*:`, 'im').exec(rest);
    if (nm && nm.index < cut) cut = nm.index;
  }
  return rest.slice(0, cut).trim();
}

function splitList(s) {
  return (s || '').split(/[,;\n]/).map(x => x.replace(/^[-*\s]+/, '').trim()).filter(Boolean);
}

const hasSource = text => /https?:\/\//.test(text || '');

function parseNeighbourhoods(sectionText, warnings) {
  const out = [];
  for (const { heading, body } of splitBlocks(sectionText)) {
    const h = parseHeading(heading);
    if (!h) { warnings.push(`Neighbourhood heading without an ID: "${heading.slice(0, 60)}"`); continue; }
    const profile = field(body, 'Profile', ['Linked issues']) || body.replace(/^\s*Linked issues\s*:.*$/im, '').trim();
    const linked  = (field(body, 'Linked issues', []).match(ID_RE_G) || []);
    out.push({ id: h.id, name: h.rest[0] || h.id, type: (h.rest[1] || '').toLowerCase(), profile, linkedIssues: linked, sourced: hasSource(profile) });
  }
  return out;
}

const ISSUE_LABELS = ['Detail', 'Scope', 'Category tags', 'Service tags', 'Angles', 'Condition question', 'Answer material'];

function parseIssues(sectionText, warnings) {
  const out = [];
  for (const { heading, body } of splitBlocks(sectionText)) {
    const h = parseHeading(heading);
    if (!h) { warnings.push(`Issue heading without an ID: "${heading.slice(0, 60)}"`); continue; }
    const others = l => ISSUE_LABELS.filter(x => x !== l);
    out.push({
      id: h.id,
      title: h.rest.join(' | ') || h.id,
      detail: field(body, 'Detail', others('Detail')),
      categoryTags: splitList(field(body, 'Category tags', others('Category tags'))),
      serviceTags:  splitList(field(body, 'Service tags', others('Service tags'))),
      body,
    });
  }
  return out;
}

// Bullet "- [SOU-S01] | words | [SOU-I01] | Urgent: N" or table "| SOU-S01 | words | SOU-I01 | N |"
function parseSymptoms(sectionText, warnings) {
  const out = [];
  for (const line of (sectionText || '').split('\n')) {
    const ids = line.match(ID_RE_G) || [];
    const sid = ids.find(i => /-S\d/.test(i));
    if (!sid) continue;
    const iid = ids.find(i => /-I\d/.test(i)) || null;
    const urg = line.match(/Urgent\s*:?\s*([YN])\b/i) || line.match(/\|\s*([YN])\s*\|?\s*$/i);
    const cells = line.split('|').map(c => c.replace(/[\[\]]/g, '').replace(/^[-*\s]+/, '').trim())
      .filter(c => c && !ID_RE.test(c) && !/^Urgent\b/i.test(c) && !/^[YN]$/i.test(c));
    const text = cells.sort((a, b) => b.length - a.length)[0] || '';
    if (!iid) warnings.push(`Symptom ${sid} has no linked issue`);
    out.push({ id: sid, text: text.replace(/^["“]|["”]$/g, ''), issueId: iid, urgent: urg ? urg[1].toUpperCase() === 'Y' : false });
  }
  return out;
}

function parseRules(sectionText, warnings) {
  const out = [];
  for (const { heading, body } of splitBlocks(sectionText)) {
    const h = parseHeading(heading);
    if (!h) { warnings.push(`Rule heading without an ID: "${heading.slice(0, 60)}"`); continue; }
    const appliesRaw = field(body, 'Applies to', ['Detail']);
    out.push({
      id: h.id,
      name: h.rest.join(' | ') || h.id,
      detail: field(body, 'Detail', ['Applies to']),
      appliesTo: appliesRaw.match(ID_RE_G) || [],
      wholeArea: /whole area/i.test(appliesRaw),
    });
  }
  return out;
}

// "Coastal: Yes [https://…]" in the Location Overview (Geo Research CORE v7 on).
// null when the dossier doesn't say (dossiers from before v7).
function coastalLine(overview) {
  const m = String(overview).match(/^[ \t]*[-*]?[ \t]*(?:\*\*)?Coastal(?:\*\*)?[ \t]*:[ \t]*(?:\*\*)?[ \t]*(yes|no)\b([^\n]*)/im);
  if (!m) return { coastal: null, coastalSource: '' };
  const url = (m[2].match(/https?:\/\/[^\s\])]+/) || [''])[0];
  return { coastal: m[1].toLowerCase(), coastalSource: url };
}

function parseDossier(text) {
  const warnings = [];
  const s = splitSections(text || '');
  const parsed = {
    overview:       s[1] || '',
    neighbourhoods: parseNeighbourhoods(s[2], warnings),
    issues:         parseIssues(s[3], warnings),
    symptoms:       parseSymptoms(s[4], warnings),
    rules:          parseRules(s[5], warnings),
    ...coastalLine(s[1] || ''),
    warnings,
  };
  if (!parsed.neighbourhoods.length) warnings.push('No neighbourhood profiles found (section 2).');
  if (!parsed.symptoms.length)       warnings.push('No symptoms found (section 4).');
  return parsed;
}

// Prepare research text for the copywriter: drop source URLs, swap neighbourhood
// IDs for their names and remove all other reference IDs. Keeps "(inferred)" and
// "(dated: ...)" markers.
function cleanForCopy(text, nameById = {}) {
  return (text || '')
    .replace(/\s*\[(?:https?:\/\/)[^\]]*\]/g, '')                    // [https://...]
    .replace(/\s*\((?:https?:\/\/)[^)]*\)/g, '')                     // (https://...)
    .replace(/https?:\/\/\S+/g, '')                                  // bare URLs
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')   // bold markdown
    // "Bassett Heath [SOU-N07]": a bracketed ID follows the name it tags, so drop it.
    // A bare ID ("affects SOU-N01 and SOU-N02") stands in for the name, so swap it.
    .replace(/\s*[\[(][A-Z]{2,4}-[NISR]\d{2,3}[\])]/g, '')
    .replace(/[A-Z]{2,4}-[NISR]\d{2,3}/g, id => nameById[id] || '')
    .replace(/^\s*(?:Linked issues|Scope|Category tags|Service tags)\s*:.*$/gim, '')
    .replace(/\(\s*(?:see|ref|cf\.?)?\s*[,;\s]*\)/gi, '')            // emptied brackets, "(see )"
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,;])\s*(?=[,;.])/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { parseDossier, cleanForCopy, coastalLine };
