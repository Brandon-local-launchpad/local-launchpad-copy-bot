'use strict';

// ── GBP job inputs ───────────────────────────────────────────────────────────
// Everything the three GBP prompts need, from the client values, the v3 page map rows,
// the hand set-up (as keyValueMap: category_N, biz_area_N), the WordPress site URL and
// the generated service page copy. Code decides here; the model only writes prose:
//   - locked services: every service page, under ONE GBP category (its home: the first
//     parent tab whose niche core list names it, else its first parent, as the homepage
//     cards do), with its page URL
//   - confirmed services with no page (the category rows' "mentioned" lists): variant
//     candidates the model may add
//   - core services for the description: the category cards' services, page map order,
//     6 to 8 of them
//   - proof points, years, accreditations, prices and timeframes: from confirmed client
//     values only. Nothing is invented here or in the prompts.

const lc = s => String(s == null ? '' : s).toLowerCase().trim();
const norm = s => lc(s).replace(/\s+/g, ' ');

function buildGbpInputs({ cv = {}, niche = {}, rows = [], keyValueMap = {}, siteUrl = '', serviceCopy = [] }) {
  const live = (rows || []).filter(r => r.applies !== false);
  const cats = live.filter(r => r.type === 'category');
  const catName = new Map(cats.map(c => [c.info && c.info.category_key, c.title]));
  const catOrder = cats.map(c => c.title);
  const core = Object.fromEntries(Object.entries(niche.core_services || {}).map(([k, v]) => [lc(k), (v || []).map(lc)]));
  const flags = [];

  const base = String(siteUrl || '').trim().replace(/\/+$/, '');
  if (!base) flags.push({ code: 'GBP-NO-SITE-URL', msg: 'No WordPress site URL is saved for this client; the service and product URLs are page paths. Save the connection and run again for full URLs.' });
  const urlOf = slug => (base && slug ? base + (slug.startsWith('/') ? slug : '/' + slug) : slug || '');

  // Locked services: one row per service page, under its home category
  const services = live.filter(r => r.type === 'service');
  const locked = [];
  for (const s of services) {
    const parents = ((s.info && s.info.parent_keys) || []).map(k => catName.get(k)).filter(Boolean);
    const home = parents.find(p => (core[lc(p)] || []).includes(lc(s.title))) || parents[0] || catOrder[0] || '';
    if (!parents.length) flags.push({ code: 'GBP-NO-PARENT', msg: `"${s.title}" has no parent category in the page map; it is listed under "${home}".` });
    locked.push({ category: home, service: s.title, slug: s.slug || '', url: urlOf(s.slug || ''), parents, copyPriority: (s.info && s.info.copy_priority) || 0, phase: (s.info && s.info.phase) || 1 });
  }
  locked.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category));

  // Confirmed, no page of their own (folded into a category page)
  const lockedNames = new Set(locked.map(l => norm(l.service)));
  const confirmedNoPage = [];
  const seenNoPage = new Set();
  for (const c of cats) for (const name of (((c.info || {}).links || {}).mentioned || [])) {
    if (lockedNames.has(norm(name)) || seenNoPage.has(norm(name))) continue;
    seenNoPage.add(norm(name));
    confirmedNoPage.push({ category: c.title, service: name });
  }

  // Core services for the description: the cards' services, one from each category in turn
  // (so every category is represented), then the rest by copy priority
  const cardNames = [];
  const cardLists = cats.map(c => (((c.info || {}).links || {}).cards || []).filter(n => lockedNames.has(norm(n))));
  for (let i = 0; cardLists.some(l => i < l.length); i++) for (const l of cardLists) if (l[i] && !cardNames.some(x => norm(x) === norm(l[i]))) cardNames.push(l[i]);
  const byPriority = [...locked].sort((a, b) => b.copyPriority - a.copyPriority).map(l => l.service);
  const coreServices = [];
  for (const n of [...cardNames, ...byPriority]) { if (coreServices.length >= 8) break; if (!coreServices.some(x => norm(x) === norm(n))) coreServices.push(n); }

  // Categories and areas
  const categories = catOrder.length ? catOrder : Object.entries(keyValueMap).filter(([k]) => /^category_\d+$/.test(k)).map(([, v]) => v);
  const primary = String(cv.primary_category || '').trim() || categories[0] || '';
  const secondaries = categories.filter(c => norm(c) !== norm(primary));
  const areas = Object.entries(keyValueMap).filter(([k]) => /^biz_area_\d+$/.test(k))
    .sort((a, b) => parseInt(a[0].split('_')[2], 10) - parseInt(b[0].split('_')[2], 10)).map(([, v]) => String(v || '').trim()).filter(Boolean);
  const town = areas[0] || '';
  const otherAreas = areas.slice(1, 7);

  // Facts from confirmed client values
  const years = yearsLine(cv);
  const accreditations = accreditationsLine(cv);
  const proofPoints = proofPointsFor(cv, niche);
  const showPrices = lc(cv.show_prices) === 'yes';
  const jobs = Array.isArray(cv.typical_jobs) ? cv.typical_jobs : [];
  const prices = showPrices ? jobs.filter(j => j && j.job && (j.price || j.from_price)).map(j => `${j.job}: from ${j.price || j.from_price}`) : [];
  const timeframes = jobs.filter(j => j && j.job && j.duration).map(j => ({ job: j.job, duration: j.duration }));
  const competitorCount = parseInt(cv.competitor_service_count, 10);
  const minServices = Math.max(20, Number.isFinite(competitorCount) ? competitorCount + 1 : 0);
  if (!Number.isFinite(competitorCount)) flags.push({ code: 'GBP-NO-COMPETITOR-COUNT', msg: 'competitor_service_count is blank; the minimum is 20 services.' });

  // What's included, per locked service, from the generated service page copy
  const copies = (serviceCopy || []).map(c => ({ title: c.page_title || c.title || '', slug: c.url_slug || c.slug || '', copy: c.copy_output || c.copy || '' })).filter(c => c.copy);
  const included = {};
  let missingCopy = 0;
  for (const l of locked) {
    const c = copies.find(x => (x.slug && norm(x.slug) === norm(l.slug)) || norm(x.title) === norm(l.service) || norm(x.title) === norm(`${l.service} ${town}`));
    if (c) included[l.service] = whatsIncluded(c.copy, { cv, keyValueMap, town });
    else missingCopy++;
  }
  if (missingCopy) flags.push({ code: 'GBP-NO-SERVICE-COPY', msg: `${missingCopy} of ${locked.length} service pages have no generated copy yet; those products use the GBP service description for what's included.` });

  return {
    name: String(cv.company_name || '').trim(), primary, secondaries, categories, town, otherAreas, areas,
    locked, confirmedNoPage, coreServices,
    years, accreditations, proofPoints, showPrices, prices, timeframes,
    competitorCount: Number.isFinite(competitorCount) ? competitorCount : null, minServices,
    included, siteUrl: base, flags,
    validatorCtx: { locked: locked.map(l => ({ category: l.category, service: l.service })), minServices, competitorCount: Number.isFinite(competitorCount) ? competitorCount : null, showPrices, towns: areas, cv },
  };
}

// "trading since 2015 (11 years)", "12 years trading" or "none"
function yearsLine(cv) {
  const founded = parseInt(cv.year_founded, 10);
  const yt = parseInt(cv.years_trading, 10);
  if (Number.isFinite(founded)) { const n = new Date().getFullYear() - founded; return `founded ${founded}${n > 0 ? ` (${n} years trading)` : ''}`; }
  if (Number.isFinite(yt)) return `${yt} years trading`;
  return 'none';
}

function moneyFor(v) {
  const s = String(v || '').trim().replace(/^£/, '');
  if (!s) return '';
  if (/^\d+(\.\d+)?\s*m$/i.test(s)) return `£${s.replace(/\s+/g, '')}`;
  if (/^\d+(\.\d+)?\s*million$/i.test(s)) return `£${s.replace(/\s*million$/i, 'm')}`;
  if (/^\d{4,}$/.test(s)) return `£${Number(s).toLocaleString('en-GB')}`;
  return `£${s}`;
}

function accreditationsLine(cv) {
  const parts = [];
  const logos = (Array.isArray(cv.verified_logos) ? cv.verified_logos : []).map(l => (typeof l === 'string' ? l : l && (l.name || l.label)) || '').filter(Boolean);
  if (logos.length) parts.push(`memberships and accreditations: ${logos.join(', ')}`);
  if (cv.insurance_cover) parts.push(`public liability insurance up to ${moneyFor(cv.insurance_cover)}`);
  if (cv.guarantee_years) parts.push(`${cv.guarantee_years} year guarantee${cv.guarantee_scope ? ` on ${cv.guarantee_scope}` : ''}`);
  if (cv.manufacturer_warranty) parts.push(`manufacturer warranty: ${cv.manufacturer_warranty}`);
  if (lc(cv.waste_carrier_registered) === 'yes') parts.push('registered waste carrier');
  return parts.length ? parts.join('; ') : 'none';
}

function proofPointsFor(cv, niche) {
  const out = [];
  if (lc(cv.free_quotes) === 'yes') out.push(lc(cv.free_inspection) === 'yes' ? 'free inspection and quote before any work' : 'free quotes');
  if (cv.quote_method) out.push(`quotes: ${cv.quote_method}`);
  if (cv.quote_includes) out.push(`every quote includes ${cv.quote_includes}`);
  if (cv.deposit_terms) out.push(`payment terms: ${cv.deposit_terms}`);
  if (cv.differentiator_1_confirmed && (cv.differentiator_1_sentence || cv.differentiator_1)) out.push(cv.differentiator_1_sentence || cv.differentiator_1);
  if (cv.differentiator_2_confirmed && (cv.differentiator_2_sentence || cv.differentiator_2)) out.push(cv.differentiator_2_sentence || cv.differentiator_2);
  if (cv.jobs_completed) out.push(`${cv.jobs_completed} jobs completed`);
  if (cv.rating && cv.review_count) out.push(`rated ${cv.rating} from ${cv.review_count} reviews`);
  if (cv.team_size) out.push(`a team of ${cv.team_size}`);
  if (cv.response_time) out.push(`replies ${cv.response_time}`);
  if (cv.start_time) out.push(`work starts ${cv.start_time}`);
  if (lc(cv.same_day_available) === 'yes') out.push('same day visits available');
  if (lc(cv.out_of_hours_available) === '24/7') out.push('available 24 hours a day, 7 days a week');
  else if (lc(cv.out_of_hours_available) === 'yes') out.push('out of hours visits available');
  if (cv.hours) out.push(`open ${cv.hours}`);
  if (Array.isArray(cv.materials_methods) && cv.materials_methods.length) out.push(`materials and methods used: ${cv.materials_methods.join(', ')}`);
  try {
    const { confirmedPractices } = require('../practices');
    for (const p of confirmedPractices(cv, niche || {})) out.push(p.claim);
  } catch (_) { /* practices.js reads the niche; without one there are no practice claims */ }
  return out.filter(Boolean);
}

// The part of a generated service page that says what the work includes: the intro
// and middle sections when the copy has the CORE (16) headings, else the first
// paragraphs. GHL tokens are written out or dropped, markdown stripped, 1500 characters.
function whatsIncluded(copy, { cv = {}, keyValueMap = {}, town = '' } = {}) {
  let t = String(copy || '');
  // Sections: keep INTRO PARAGRAPH to the FAQ SECTION when they exist
  const start = t.search(/^#+\s*\d*\.?\s*INTRO PARAGRAPH/im);
  if (start >= 0) {
    const rest = t.slice(start);
    const end = rest.search(/^#+\s*\d*\.?\s*(FAQ SECTION|CONTACT SECTION)/im);
    t = end > 0 ? rest.slice(0, end) : rest;
  }
  t = t.replace(/\{\{\s*custom_values\.([a-z0-9_]+)\s*\}\}/gi, (m, key) => {
    const k = key.toLowerCase();
    if (keyValueMap[k]) return keyValueMap[k];
    if (k === 'company_name' || k === 'business_name') return cv.company_name || '';
    if (/phone|email/.test(k)) return '';
    return cv[k] && typeof cv[k] === 'string' ? cv[k] : '';
  });
  t = t.replace(/\[INSERT[^\]]*\]/g, '').replace(/^#+[^\n]*$/gm, '').replace(/\*\*|__|`/g, '').replace(/^\s*[-*]\s+/gm, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  t = t.split('\n').map(l => l.trim()).filter(l => l && !/^(eyebrow|headline|subheadline|cta button label|label|h2|h3)\s*:/i.test(l)).join('\n').replace(/\n{2,}/g, '\n');
  if (t.length > 1500) { const cut = t.lastIndexOf('. ', 1500); t = t.slice(0, cut > 600 ? cut + 1 : 1500); }
  return t.trim();
}

// ── The message blocks ──
const list = a => (a && a.length ? a.join(', ') : 'none');

function descriptionMessage(I) {
  return [
    'FACTS',
    `- Business name: ${I.name || 'none'}`,
    `- Primary category: ${I.primary || 'none'}`,
    `- Secondary categories: ${list(I.secondaries)}`,
    `- Main town: ${I.town || 'none'}`,
    `- Other areas served: ${list(I.otherAreas)}`,
    `- Core services: ${list(I.coreServices)}`,
    `- Years trading / founded: ${I.years}`,
    `- Accreditations, memberships, insurance: ${I.accreditations}`,
    `- Other proof points: ${list(I.proofPoints)}`,
  ].join('\n');
}

function servicesMessage(I) {
  const L = [
    `BUSINESS: ${I.name || 'none'}, a ${I.primary || 'local service business'} in ${I.town || 'the UK'}, UK.`,
    '',
    'LOCKED SERVICES (from the page map; keep every one, exact name, under the category shown):',
    ...I.locked.map(l => `${l.category}: ${l.service}`),
  ];
  if (I.confirmedNoPage.length) L.push('', 'CONFIRMED, NO PAGE (the business offers these too; add them as VARIANT under the category shown where they fit):', ...I.confirmedNoPage.map(c => `${c.category}: ${c.service}`));
  L.push('', `COMPETITOR TARGET: the top 5 competitors list ${I.competitorCount === null ? 'an unknown number of' : I.competitorCount} services on average. Beat it: at least ${I.minServices} services in total (locked plus variants), each appearing once.`);
  L.push('', `PROOF POINTS (use only these): ${list(I.proofPoints)}`);
  L.push('', `TOWN to name once in each description: ${I.town || 'none'}`);
  return L.join('\n');
}

// batch: the locked services this call covers; categoryOf: service → category from the Services output
function productsMessage(I, batch, categoryOf) {
  const L = [
    `BUSINESS: ${I.name || 'none'}, a ${I.primary || 'local service business'} in ${I.town || 'the UK'}, UK.`,
    '',
    `Areas served: ${list(I.areas)}`,
    `Proof points (use only these): ${list(I.proofPoints)}`,
    `Show prices: ${I.showPrices ? (I.prices.length ? `yes. Approved figures: ${I.prices.join('; ')}` : 'yes, but no approved figures are on file, so name none') : 'no'}`,
    '',
    'SERVICES (one product each):',
  ];
  for (const l of batch) {
    const tf = I.timeframes.find(t => norm(t.job) === norm(l.service) || norm(l.service).includes(norm(t.job)) || norm(t.job).includes(norm(l.service)));
    L.push('', `Service: ${l.service}`, `Category: ${categoryOf(l.service) || l.category}`, `What's included: ${I.included[l.service] || `(no page copy yet) ${l.gbpDescription || ''}`.trim()}`, `Typical timeframe: ${tf ? tf.duration : 'none'}`, `Page URL: ${l.url || 'none'}`);
  }
  return L.join('\n');
}

module.exports = { buildGbpInputs, descriptionMessage, servicesMessage, productsMessage, whatsIncluded, proofPointsFor, accreditationsLine, yearsLine, moneyFor };
