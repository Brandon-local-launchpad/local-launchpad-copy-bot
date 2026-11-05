'use strict';

// ── The spam filter ───────────────────────────────────────────────────────────────
// A real referring domain has a spam score under the threshold and trips none of the junk rules
// (junk-rules.json: add a line, not code). The rules do most of the work and the score is the
// backstop (5 Nov 2026, tested on three sites, see docs/current-build/Existing_Site_Migration_Plan.md):
// a score alone lets junk through at 20 and 35, and it throws out real local newspaper
// directories at 50 to 55, so the default is under 60. Referring domain rank is shown and never
// decides: junk reached rank 324 on the test site. A link with no score counts as real unless a
// rule fires. Worked out when read, never stored, so changing a setting costs nothing.

const RULES = require('./junk-rules.json');
const { registrableDomain } = require('../citations/seed');

const compile = list => list.map(p => new RegExp(p, 'i'));
const ANCHOR = compile(RULES.anchor_patterns);
const DOMAIN = compile(RULES.domain_patterns);
const LINK_PATH = compile(RULES.link_path_patterns);
const ENDINGS = new Set(RULES.junk_endings.map(e => e.toLowerCase()));

const domainOf = host => { const h = String(host || '').toLowerCase().replace(/^www\./, ''); return registrableDomain(h) || h; };
const pathFrom = url => { try { return new URL(url).pathname; } catch (_) { return ''; } };
const n = v => Number(v).toLocaleString('en-GB');

// link: { domain_from, url_from, anchor, spam_score, external_links }.
// Returns { real, reasons: [plain English], not_scored }
function classifyLink(link, settings) {
  const reasons = [];
  const score = link.spam_score == null || link.spam_score === '' ? null : Number(link.spam_score);
  const host = String(link.domain_from || '').toLowerCase();
  if (score != null && score >= settings.spam_threshold) reasons.push(`Spam score ${score}, and the limit is under ${settings.spam_threshold}`);
  if (Number(link.external_links || 0) >= settings.outgoing_link_limit) reasons.push(`The linking page has ${n(link.external_links)} outgoing links, so it looks like a link farm`);
  const anchor = String(link.anchor || '');
  if (ANCHOR.some(re => re.test(anchor))) reasons.push(`The link text is selling links: "${anchor.replace(/\s+/g, ' ').trim().slice(0, 60)}"`);
  if (DOMAIN.some(re => re.test(host))) reasons.push('The linking site is about gambling, pharma, loans or similar');
  else if (LINK_PATH.some(re => re.test(pathFrom(link.url_from)))) reasons.push('The linking page sits in a link selling section');
  const ending = host.split('.').pop();
  if (ENDINGS.has(ending)) reasons.push(`The linking site ends in .${ending}, which is common for junk sites`);
  return { real: reasons.length === 0, reasons, not_scored: score == null };
}

// links: one page's links. Returns { all, real, real_domains: [...], junk_domains: [...] }: a domain
// counts as real when any one of its links to the page is real.
function countDomains(links, settings) {
  const all = new Set(), real = new Set();
  for (const l of links) {
    const d = domainOf(l.domain_from);
    if (!d) continue;
    all.add(d);
    if (classifyLink(l, settings).real) real.add(d);
  }
  return { all: all.size, real: real.size, real_domains: [...real].sort(), junk_domains: [...all].filter(d => !real.has(d)).sort() };
}

module.exports = { classifyLink, countDomains, domainOf };
