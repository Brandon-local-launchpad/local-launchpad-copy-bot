'use strict';

// ── GBP profile fields, NAP, internal note and review templates (batch 1, 23 Oct) ───
// Built live on every load from the client values, the page map, the WordPress
// connection and the saved GBP record (the description). Nothing here calls a model.
//   buildProfile({ inputs, record, cv }) →
//     { fields: [{ key, label, value, lines, flag }], nap: {...}, note: 'four lines',
//       templates: { c1, c2 }, flags: [{ code, msg }] }
// The templates are Appendix C of the GBP Workflow SOP (docs/seo/reference/
// GBP_Workflow_SOP.txt): C1 the review request text, C2 the reply to a 1 to 3 star
// review. Per review placeholders ([first name], [name], [job]) stay as they are; the
// business name, owner name, review link and email come from the record.

const GBP_AREA_LIMIT = 20;
const UTM = 'utm_source=google&utm_medium=organic&utm_campaign=gbp';

const str = v => (v == null ? '' : String(v)).trim();

// UK phone to one format: 0xxxx xxxxxx. +44 and spacing in any style; a number that
// is not 11 digits is left as typed and flagged.
function normalisePhone(raw) {
  const s = str(raw);
  if (!s) return { phone: '', flag: null };
  let digits = s.replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+44')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('0044')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('44') && digits.length === 12) digits = '0' + digits.slice(2);
  digits = digits.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return { phone: `${digits.slice(0, 5)} ${digits.slice(5)}`, flag: null };
  return { phone: s, flag: `The phone number "${s}" is not an 11 digit UK number, so it is left as typed.` };
}

// "12 High St, Rd" → "12 High Street, Road": the common abbreviations written out
const ADDRESS_WORDS = [
  ['St', 'Street'], ['Rd', 'Road'], ['Ave', 'Avenue'], ['Av', 'Avenue'], ['Ln', 'Lane'], ['Dr', 'Drive'], ['Cl', 'Close'], ['Ct', 'Court'],
  ['Pl', 'Place'], ['Sq', 'Square'], ['Gdns', 'Gardens'], ['Cres', 'Crescent'], ['Ter', 'Terrace'], ['Terr', 'Terrace'], ['Pk', 'Park'], ['Gr', 'Grove'], ['Hts', 'Heights'],
];
function expandAddress(raw) {
  let s = str(raw);
  for (const [abbr, full] of ADDRESS_WORDS) s = s.replace(new RegExp(`(?<=\\S\\s)${abbr}\\.?(?=\\s*(?:,|$|\\n))`, 'gi'), full);
  return s;
}

// Service areas as the page map spells them: the base town, then the location rows in
// page map order (inputs.serviceAreasPageMap), capped at the GBP limit of 20
function serviceAreas(I) {
  const all = (I.serviceAreasPageMap && I.serviceAreasPageMap.length ? I.serviceAreasPageMap : I.areas) || [];
  const capped = all.slice(0, GBP_AREA_LIMIT);
  const flag = all.length > GBP_AREA_LIMIT ? { code: 'GBP-AREAS-OVER-LIMIT', msg: `The page map has ${all.length} service areas; Google allows ${GBP_AREA_LIMIT}, so the panel shows the first ${GBP_AREA_LIMIT} in page map order (${all.slice(GBP_AREA_LIMIT).join(', ')} left off).` } : null;
  return { all, capped, flag };
}

// competitors: { latest, comparison, reading } from gbp/competitors.js (batch 2), or null;
// scanAlerts: the drop alerts from gbp/scans.js (batch 3), each with a line for the note
function buildProfile({ inputs: I, record = null, cv: cvIn = null, competitors = null, scanAlerts = [] }) {
  const cv = cvIn || (I.validatorCtx && I.validatorCtx.cv) || {};
  const flags = [];
  const site = str(I.siteUrl).replace(/\/+$/, '');
  if (!site) flags.push({ code: 'GBP-NO-SITE-URL', msg: 'No WordPress site URL is saved, so the website and appointment URLs are blank.' });
  const areas = serviceAreas(I);
  if (areas.flag) flags.push(areas.flag);
  const phone = normalisePhone(cv.phone);
  if (phone.flag) flags.push({ code: 'GBP-PHONE-FORMAT', msg: phone.flag });
  const description = record && record.steps && record.steps.description && record.steps.description.status === 'done' ? record.steps.description.output.description : '';
  if (!description) flags.push({ code: 'GBP-NO-DESCRIPTION', msg: 'No GBP description has passed yet; run Generate GBP.' });
  const storefront = str(cv.gbp_address_type).toLowerCase() === 'storefront' && str(cv.address);
  const address = storefront ? expandAddress(cv.address) : '';
  const year = str(cv.year_founded);
  const websiteUtm = site ? `${site}/?${UTM}` : '';
  const appointment = site ? `${site}/contact/` : '';

  const fields = [
    { key: 'business_name', label: 'Business name (NAP)', value: str(cv.company_name) },
    { key: 'primary_category', label: 'Primary category', value: str(I.primary) },
    { key: 'secondary_categories', label: 'Secondary categories', value: (I.secondaries || []).join('\n'), lines: I.secondaries || [] },
    { key: 'service_areas', label: `Service areas (${areas.capped.length}${areas.all.length > areas.capped.length ? ` of ${areas.all.length}` : ''}, page map spelling, one per line)`, value: areas.capped.join('\n'), lines: areas.capped, flag: areas.flag ? areas.flag.msg : null },
    { key: 'description', label: 'Description', value: description },
    { key: 'website_url', label: 'Website URL (with the GBP tracking)', value: websiteUtm },
    { key: 'appointment_url', label: 'Appointment URL (contact page)', value: appointment },
    { key: 'opening_year', label: 'Opening year', value: year },
    { key: 'hours', label: 'Hours', value: str(cv.hours) },
  ];

  const nap = {
    name: str(cv.company_name),
    address: address || null,
    service_areas: address ? null : areas.capped,
    phone: phone.phone,
    website: site,
    email: str(cv.email),
    hours: str(cv.hours),
  };

  return { fields, nap, note: buildNote({ I, cv, site, competitors, scanAlerts }), templates: buildTemplates({ cv, flags }), flags };
}

// Four lines: the primary category and why; targets; landing page fails; blockers.
// With a competitor run saved, "why" is its reading ("4 of 5 competitors use it", or
// "2 of 5 use X, escalate"); without one, "competitor check not done".
function buildNote({ I, cv, site, competitors = null, scanAlerts = [] }) {
  const primary = str(I.primary) || 'none';
  const inPageMap = (I.categories || []).some(c => c.toLowerCase() === primary.toLowerCase());
  const competitor = I.competitorCount !== null && I.competitorCount !== undefined ? I.competitorCount : null;
  const reading = competitors && competitors.reading;
  const run = competitors && competitors.latest;
  const why = reading
    ? `${reading.line}; search "${run.keyword}" on ${new Date(run.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `primary = client's pick, competitor check not done`;
  const l1 = `Primary category: ${primary} (${why}${inPageMap ? '' : '; not one of the page map tabs: ' + ((I.categories || []).join(', ') || 'none')}).`;
  const targets = [];
  if (competitor !== null) targets.push(`beat ${competitor} services (target ${I.minServices})`);
  else targets.push(`services target ${I.minServices} (no competitor count saved)`);
  const cmp = competitors && competitors.comparison;
  if (cmp && cmp.reviews_per_month !== null && cmp.reviews_per_month !== undefined) targets.push(`${cmp.reviews_per_month} reviews a month (the competitors' average change over ${cmp.days} days)`);
  else if (str(cv.reviews_per_month)) targets.push(`${str(cv.reviews_per_month)} reviews a month`);
  const l2 = `Targets: ${targets.join('; ')}.`;
  const lp = str(cv.landing_page_fails);
  const l3 = `Landing page fails: ${lp || 'none saved'}.`;
  const blockers = [];
  const pack = I.packStatus || null;
  if (!pack || !pack.exists) blockers.push('trade facts pack missing');
  else if (!pack.verified) blockers.push('trade facts pack unverified');
  if (competitor === null) blockers.push('no competitor count');
  if (!site) blockers.push('no site URL');
  if (!str(cv.review_url)) blockers.push('no review link');
  const l4 = `Blockers: ${blockers.length ? blockers.join('; ') : 'none'}.`;
  // A rank drop (10 points or more of Top 3% month on month) adds a line per keyword
  return [l1, l2, l3, l4, ...(scanAlerts || []).map(a => a.line)].join('\n');
}

// Appendix C, personalised. Per review placeholders stay: [first name], [name], [job].
function buildTemplates({ cv, flags }) {
  const business = str(cv.company_name) || '[business name]';
  const owner = str(cv.owner_name) || '[owner name]';
  const link = str(cv.review_url) || '[review link]';
  const email = str(cv.email) || '[email]';
  if (!str(cv.owner_name)) flags.push({ code: 'GBP-NO-OWNER-NAME', msg: 'No owner name is saved; the templates keep [owner name].' });
  if (!str(cv.review_url)) flags.push({ code: 'GBP-NO-REVIEW-LINK', msg: 'No Google review link is saved (Client Values, Google Business Profile); the review request keeps [review link].' });
  if (!str(cv.email)) flags.push({ code: 'GBP-NO-EMAIL', msg: 'No email is saved; the review reply keeps [email].' });
  return {
    c1: `Hi [first name], thanks for choosing ${business}. If you have a minute, we'd really appreciate a Google review: ${link}. Thank you! – ${owner}`,
    c2: `Hi [name], thank you for your feedback. We're sorry the [job] didn't meet your expectations, and we understand how frustrating that must be. We'd like to put this right. Please email ${owner} at ${email} so we can talk it through. – ${owner}, ${business}`,
    c2_rule: 'Only after removal is fully denied. Never argue, never share the customer\'s private details, never mention the removal request.',
  };
}

module.exports = { buildProfile, buildNote, buildTemplates, normalisePhone, expandAddress, serviceAreas, GBP_AREA_LIMIT, UTM };
