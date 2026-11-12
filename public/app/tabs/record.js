// Record tab (27 Oct 2026): the Client Values regrouped (Business · Contact and NAP · Quotes
// and timing · Proof · Practices · Areas · Owner · Reviews, plus the GBP settings), each field
// with its source tag (Form, Website, GBP, Dossier, Hand); inferred values amber until
// confirmed; "What the pages can't say yet" at the top; Save reloads and counts the changed
// fields. The Fillout onboarding form (voice answers, prices, service ticks, launch towns,
// the by-hand set-up) sits under its own sub-tab, ported as is.
//
// Sources and confirmations live inside the same client values JSON (_sources, _confirmed):
// no migration; a value with no source shows as Hand.

import { h, attr, api, card, toast, tag, info, busy, pill, fmtDate } from '../ui.js';
import { userName } from '../shell.js';
import { loadRecordPanels, recordContainer } from './legacy.js';

const GROUPS = [
  { key: 'business', title: 'Business', fields: [
    { key: 'company_name', label: 'Company name', placeholder: 'Exact GBP name (capitals and apostrophes)', sub: [{ key: 'company_name_gbp_checked', label: 'Checked against GBP' }] },
    { key: 'primary_category', label: 'Primary category', type: 'gbp-select' },
    { key: 'business_type', label: 'Business type', type: 'select', options: ['A', 'B', 'C', 'D', 'split'] },
    { key: 'year_founded', label: 'Year founded', placeholder: '4 digits only' },
    { key: 'team_size', label: 'Team size', placeholder: 'Number only' },
    { key: 'county', label: 'County', placeholder: 'Blank: worked out from the approved towns. Two as "Hampshire; West Sussex"', hint: 'The place GBP posts name. Posts never name a town.' },
    { key: 'live_domain', label: 'Live domain', placeholder: 'https://example.co.uk (the site the public sees; the listings and the NAP use it)' },
    { key: 'hours', label: 'Hours', placeholder: 'e.g. Mon to Sat, 8am to 6pm' },
    { key: 'emergency_primary', label: 'Emergency primary', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'handles_planning', label: 'Handles planning', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'finance_options', label: 'Finance options' },
    { key: 'complaints_process', label: 'Complaints process', type: 'textarea' },
    { key: 'map_embed', label: 'Map embed', type: 'textarea', placeholder: 'Full Google Maps embed URL' },
    // Rarely needed: the dossier decides whether the city is coastal and the page map sets the H1
    { key: 'coastal_city', label: 'Primary city is coastal', type: 'select', options: ['', 'yes', 'no'], hint: 'Blank: the area research decides.', rare: true },
    { key: 'h1_override', label: 'Homepage H1 override', placeholder: 'Leave blank to use the page map H1', rare: true },
  ] },
  { key: 'contact', title: 'Contact and NAP', fields: [
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address', type: 'textarea' },
  ] },
  { key: 'quotes', title: 'Quotes and timing', fields: [
    { key: 'free_quotes', label: 'Free quotes', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'free_inspection', label: 'Free inspection', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'quote_method', label: 'Quote method', placeholder: 'e.g. written quote on a site visit' },
    { key: 'quote_includes', label: 'Quote includes', type: 'textarea', placeholder: 'e.g. materials, labour, VAT and taking the waste away' },
    { key: 'deposit_terms', label: 'Deposit and payments', type: 'textarea', placeholder: 'e.g. 20% deposit, balance on completion' },
    { key: 'price_list', label: 'Price list', placeholder: 'URL or blank' },
    { key: 'response_time', label: 'Response time', placeholder: 'e.g. within 24 hours' },
    { key: 'same_day_available', label: 'Same day available', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'out_of_hours_available', label: 'Out of hours', type: 'select', options: ['', 'yes', 'no', '24/7'] },
    { key: 'start_time', label: 'Start time', placeholder: 'e.g. same week' },
    { key: 'visit_frequency_options', label: 'Visit frequencies offered (maintenance)', placeholder: 'weekly, fortnightly, monthly, one off; blank: the schedule is agreed with the customer' },
    { key: 'access_handling', label: 'Access when nobody is home (maintenance)', placeholder: 'e.g. side gate left unlocked on the day' },
    { key: 'if_not_happy', label: 'If the customer is not happy with a visit', placeholder: 'e.g. tell us within 48 hours and we come back' },
    { key: 'clippings_collected', label: 'Clippings and cuttings collected', type: 'select', options: ['', 'yes', 'no', 'customer chooses'] },
    { key: 'typical_jobs', label: 'Typical jobs', type: 'job-rows' },
  ] },
  { key: 'proof', title: 'Proof', fields: [
    { key: 'jobs_completed', label: 'Jobs completed', placeholder: 'Number only, e.g. 150' },
    { key: 'guarantee_years', label: 'Guarantee years', placeholder: 'Number only, e.g. 10' },
    { key: 'guarantee_scope', label: 'Guarantee scope', type: 'textarea', placeholder: 'e.g. new roofs 10 years, repairs 2 years' },
    { key: 'manufacturer_warranty', label: 'Manufacturer warranty', placeholder: 'e.g. 25 year manufacturer warranty' },
    { key: 'insurance_cover', label: 'Insurance cover', placeholder: 'Figure without £, e.g. 5m' },
    { key: 'waste_carrier_registered', label: 'Registered waste carrier', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'differentiator_1', label: 'Differentiator 1 (title)', placeholder: 'e.g. Fixed Prices With No Hidden Costs', sub: [{ key: 'differentiator_1_confirmed', label: 'Confirmed by the client' }] },
    { key: 'differentiator_1_sentence', label: 'Differentiator 1 (sentence)', placeholder: 'e.g. fixed prices with no hidden costs' },
    { key: 'differentiator_2', label: 'Differentiator 2 (title)', placeholder: 'e.g. Family Run and Independent', sub: [{ key: 'differentiator_2_confirmed', label: 'Confirmed by the client' }] },
    { key: 'differentiator_2_sentence', label: 'Differentiator 2 (sentence)' },
    { key: 'materials_methods', label: 'Materials and methods', type: 'materials' },
    { key: 'jobs_wanted', label: 'Jobs wanted (up to 3)', type: 'gbp-multicheck' },
    { key: 'verified_logos', label: 'Verified logos', type: 'logo-rows' },
    { key: 'review_themes', label: 'Review themes', type: 'theme-rows' },
  ] },
  { key: 'practices', title: 'Practices', fields: [
    { key: 'confirmed_practices', label: 'Confirmed practices', type: 'practices', hint: 'The copy states only these.' },
    { key: 'customer_questions', label: 'What customers ask before they book', type: 'lines', placeholder: 'One question per line, in the customer\'s words' },
  ] },
  { key: 'areas', title: 'Areas', fields: [
    { key: 'area_wide', label: 'Area wide', placeholder: 'e.g. Hampshire' },
    { key: 'travel_distance', label: 'Travel distance', placeholder: 'e.g. 20 miles' },
    { key: 'areas_worked', label: 'Places the business has worked in', placeholder: 'towns or neighbourhoods, comma separated', hint: 'The only source for "we have done jobs in [place]". Leave blank and the pages make no local experience claim.' },
    { key: 'scan_area', label: 'Rank scan area', type: 'select', options: ['', 'dense_city', 'city', 'market_town', 'rural'], hint: 'Grid spacing: dense city 1000 m, city 1500, market town 2000, rural 2500. Locked after the baseline scan.' },
    { key: 'scan_keyword_2', label: 'Second rank scan keyword (no town)', placeholder: 'e.g. garden design; the first is always the primary category' },
  ] },
  { key: 'owner', title: 'Owner', fields: [
    { key: 'owner_name', label: 'Owner name', placeholder: 'First name only' },
    { key: 'owner_name_2', label: 'Second owner' },
    { key: 'owner_qualification', label: 'Qualification', placeholder: 'e.g. NVQ Level 3' },
    { key: 'owner_why', label: 'Why they do it', type: 'textarea' },
    { key: 'owner_promise', label: 'Owner promise', type: 'textarea' },
    { key: 'owner_pronoun', label: 'Owner pronoun', type: 'select', options: ['', 'he', 'she', 'they'] },
    { key: 'owner_photo', label: 'Owner photo', type: 'select', options: ['no', 'yes'] },
  ] },
  { key: 'reviews', title: 'Reviews', fields: [
    { key: 'review_url', label: 'Google review link', placeholder: 'https://g.page/r/…/review (also pushed to the site)' },
    { key: 'rating', label: 'Rating', placeholder: 'e.g. 4.9' },
    { key: 'review_count', label: 'Review count', placeholder: 'Number only' },
    { key: 'reviews_per_month', label: 'Reviews a month (target)', placeholder: 'Whole number' },
    { key: 'hand_reviews', label: 'Hand picked reviews', type: 'review-rows', hint: 'Category pages show these once the client has 3 reviews.' },
  ] },
  // The legal pages (7 Nov 2026): typed in here until the form asks. google_ads, meta_pixel and sms_tool stay here for good.
  { key: 'legal', title: 'Legal details', fields: [
    { key: 'legal_entity', label: 'Limited company or sole trader', type: 'select', options: ['', 'limited', 'sole_trader'] },
    { key: 'legal_name', label: 'Registered company name', placeholder: 'As on Companies House (limited companies only)' },
    { key: 'company_number', label: 'Company number', placeholder: 'Limited companies only' },
    { key: 'jurisdiction', label: 'Registered in', type: 'select', options: ['', 'England and Wales', 'Scotland', 'Northern Ireland'] },
    { key: 'registered_office', label: 'Registered office', type: 'textarea', placeholder: 'Limited companies only' },
    { key: 'vat_number', label: 'VAT number', placeholder: 'Only if VAT registered' },
    { key: 'ico_number', label: 'ICO registration number', placeholder: 'e.g. ZA123456; blank if none' },
    { key: 'regulatory_body', label: 'Regulatory body', placeholder: 'e.g. Gas Safe, NICEIC, NAPIT, FENSA; blank if none' },
    { key: 'regulatory_number', label: 'Regulatory registration number' },
    { key: 'trade_body', label: 'Trade body', placeholder: 'e.g. Checkatrade, BALI; blank if none' },
    { key: 'guarantee_months', label: 'Guarantee length in months', placeholder: 'Number only; blank: none on the Service Terms unless Guarantee years is filled' },
    { key: 'quote_valid_days', label: 'Days a quote stays valid', placeholder: 'Number only' },
    { key: 'callout_fee', label: 'Emergency or out of hours charge', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'callout_fee_amount', label: 'Emergency or out of hours charge amount', placeholder: 'e.g. £80' },
    { key: 'deposit_threshold', label: 'Deposit taken on jobs over', placeholder: 'e.g. £1,000' },
    { key: 'deposit_percent', label: 'Deposit percentage', placeholder: 'Number only, e.g. 25' },
    { key: 'waste_removal', label: 'Waste removal included', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'adr_member', label: 'Member of a dispute resolution scheme', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'adr_body', label: 'Dispute resolution provider', placeholder: 'Only if a member' },
    { key: 'adr_url', label: 'Dispute resolution provider link', placeholder: 'Only if a member' },
    { key: 'google_ads', label: 'Google Ads tag on the site', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'meta_pixel', label: 'Meta Pixel on the site', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'sms_tool', label: 'Text messaging provider in use', type: 'select', options: ['', 'yes', 'no'] },
  ] },
  { key: 'gbp', title: 'Google Business Profile settings', fields: [
    { key: 'drive_photo_folder', label: 'Drive photo folder', placeholder: 'The Drive link of the folder holding GBP Photos – Posts', hint: 'Copybot reads the sorted photos from here, read only. The GBP Posts & Photos tab shows the counts and files.' },
    { key: 'competitor_service_count', label: 'Competitor service count (top 5 average)', placeholder: 'Whole number; blank means the services target is 20' },
    { key: 'show_prices', label: 'Show prices in GBP products', type: 'select', options: ['', 'yes', 'no'] },
    { key: 'landing_page_fails', label: 'Landing page fails', type: 'textarea', placeholder: 'Filled by "Check landing page" on the GBP tab' },
  ] },
];
const SOURCES = ['form', 'website', 'gbp', 'dossier', 'hand'];
const SOURCE_LABEL = { ghl: 'Onboarding (GHL)', form: 'Form', form_inferred: 'Form, read from the answer', website: 'Website', gbp: 'GBP', dossier: 'Dossier', hand: 'Hand' };
// form_inferred (10 Nov): a value read out of a free text form answer (fillout/to-values.js), amber until confirmed
const INFERRED = new Set(['website', 'gbp', 'dossier', 'form_inferred']);
const KEY_FIELDS = { phone: 'phone', quote_method: 'free_quotes', primary_category: 'primary_category', practices: 'confirmed_practices' };

export async function render(el, ctx) {
  const { clientId, row, summary } = ctx;
  const sub = ['form', 'legal'].includes(ctx.query.view) ? ctx.query.view : 'values';
  el.innerHTML = `
    ${cantSayBox(row, summary)}
    <div id="onbCard"></div>
    <div class="tabs" id="subtabs"><a class="tab${sub === 'values' ? ' active' : ''}" href="/clients/${clientId}/record" data-link>Client values</a><a class="tab${sub === 'form' ? ' active' : ''}" href="/clients/${clientId}/record?view=form" data-link>Onboarding form${ctx.client.source === 'fillout' ? '' : ' and set-up'}</a><a class="tab${sub === 'legal' ? ' active' : ''}" href="/clients/${clientId}/record?view=legal" data-link>Legal pages</a></div>
    <div id="recBody"></div>`;
  const body = el.querySelector('#recBody');
  renderOnboarding(el.querySelector('#onbCard'), clientId).catch(() => {});
  if (sub === 'legal') return renderLegal(body, clientId);
  if (sub === 'form') {
    body.innerHTML = `<section class="card">${recordContainer({ menu: true })}</section>`;
    const RP = await loadRecordPanels();
    await RP.mount(body.querySelector('.legacy'), clientId, ctx.query.panel || 'overview');
    return;
  }
  return renderValues(body, ctx);
}

// Legal pages: the hold and why, the push to staging, Brandon's clear and adjusted wording, each filled page.
async function renderLegal(body, clientId) {
  const url = `/api/clients/${clientId}/legal`;
  const act = async (path, method, payload) => {
    try { paint(await api(path, { method, body: payload })); toast('Saved'); } catch (e) { toast(e.message, 'bad'); }
  };
  const keyOf = () => (body.querySelector('#legalKey') || {}).value || '';
  let lastSnapshots = [];
  function paint(s) {
    const exc = s.reasons.find(r => r.code === 'exceptions');
    const head = s.held
      ? `<div class="notice bad"><strong>${h(s.code)}: held, these pages will not be pushed</strong><ul style="margin:6px 0 0 18px">${s.reasons.map(r => `<li>${h(r.message)}</li>`).join('')}</ul></div>`
      : '<div class="notice good"><strong>Not held.</strong> Nothing is stopping these pages.</div>';
    const key = `<label for="legalKey">Brandon's key</label><input class="input" id="legalKey" type="password" autocomplete="off"${s.keySet ? '' : ' disabled placeholder="LEGAL_CLEAR_KEY is not set"'}>`;
    const clearBox = exc ? card({ title: 'Clear the exception', body: `<p>Adjust the wording below first if it needs it. Clearing covers this exact text; if the client changes it, the pages are held again.</p><pre class="block">${h(s.exceptions.text)}</pre><label for="legalNote">Note (optional)</label><input class="input" id="legalNote"><div style="margin-top:10px"><button class="btn btn-primary" id="legalClear">I have read this. Clear it</button></div>` }) : '';
    const pushBox = card({ title: 'Push to the staging site', body: `<p>All three pages or none. Staging sites only, and the pages stay drafts if they are drafts.</p><div class="btn-row"><button class="btn btn-ghost" id="legalDry">Dry run</button><button class="btn btn-primary" id="legalPush"${s.held ? ' disabled' : ''}>Push the three pages</button>${lastSnapshots.length ? '<button class="btn btn-ghost" id="legalBack">Undo the last push</button>' : ''}</div><div id="legalResult" style="margin-top:10px"></div>` });
    body.innerHTML = `${head}
      ${s.defaulted.includes('uses_subcontractors') || s.defaulted.includes('late_payment_interest') ? '<div class="notice warn" style="margin-top:12px">The client has not answered on subcontractors or late payment interest, so these count as yes.</div>' : ''}
      <div style="margin-top:16px">${card({ title: 'Adjusting needs a key', body: key })}</div>
      ${pushBox}
      ${clearBox}
      ${s.pages.map(p => card({ title: p.title, sub: `${p.slug}${p.custom ? ' · adjusted wording for this client' : ' · master wording'}`, body: `<pre class="block" style="white-space:pre-wrap">${h(p.text)}</pre>
        <details style="margin-top:10px"><summary>Adjust the wording for this client</summary><textarea class="input" rows="16" data-page="${attr(p.key)}">${h(p.template)}</textarea>
        <div style="margin-top:10px"><button class="btn" data-save="${attr(p.key)}">Save wording</button>${p.custom ? ` <button class="btn" data-reset="${attr(p.key)}">Back to the master</button>` : ''}</div></details>` })).join('')}`;
    const result = html => { body.querySelector('#legalResult').innerHTML = html; };
    const listOf = items => `<ul style="margin:6px 0 0 18px">${items.map(i => `<li>${h(i)}</li>`).join('')}</ul>`;
    body.querySelector('#legalDry').onclick = async () => {
      try {
        const d = await api(`${url}/dry-run`);
        result(`<div class="notice ${d.pushable ? 'good' : 'bad'}"><strong>${d.pushable ? 'A push would be allowed.' : 'A push would be refused.'}</strong> Nothing was written.${listOf(d.pages.map(p => `${p.title}: ${p.page ? `page ${p.page.id}, ${p.page.status}` : 'not found'}, ${p.summary.added + p.summary.changed} to change${p.refusals.length ? `. ${p.refusals.join(' ')}` : ''}`))}</div>`);
      } catch (e) { result(`<div class="notice bad">${h(e.message)}</div>`); }
    };
    body.querySelector('#legalPush').onclick = async () => {
      if (!window.confirm(`Push the three legal pages to the connected staging site?`)) return;
      try {
        const r = await api(`${url}/push`, { method: 'POST', body: { confirm: true } });
        if (r.ok) { lastSnapshots = r.written.map(w => w.snapshotId); paint(await api(url)); result('<div class="notice good">All three pages pushed, and each read back as sent.</div>'); }
        else result(`<div class="notice bad"><strong>Not pushed.</strong>${r.error ? ` ${h(r.error)}` : ''}${listOf(r.refusals || [])}</div>`);
      } catch (e) { result(`<div class="notice bad">${h(e.message)}</div>`); }
    };
    const backBtn = body.querySelector('#legalBack');
    if (backBtn) backBtn.onclick = async () => {
      if (!window.confirm('Put the three pages back as they were before the last push?')) return;
      try {
        const r = await api(`${url}/rollback`, { method: 'POST', body: { confirm: true, snapshotIds: lastSnapshots } });
        if (r.ok) lastSnapshots = [];
        paint(await api(url));
        result(`<div class="notice ${r.ok ? 'good' : 'bad'}">${r.ok ? 'Put back.' : 'The read back after the undo differs. Check the pages.'}</div>`);
      } catch (e) { result(`<div class="notice bad">${h(e.message)}</div>`); }
    };
    const clearBtn = body.querySelector('#legalClear');
    if (clearBtn) clearBtn.onclick = () => act(`${url}/clear`, 'POST', { key: keyOf(), exceptions: s.exceptions.text, note: body.querySelector('#legalNote').value });
    body.querySelectorAll('[data-save]').forEach(b => { b.onclick = () => act(`${url}/wording/${b.dataset.save}`, 'PUT', { key: keyOf(), template: body.querySelector(`textarea[data-page="${b.dataset.save}"]`).value }); });
    body.querySelectorAll('[data-reset]').forEach(b => { b.onclick = () => act(`${url}/wording/${b.dataset.reset}`, 'DELETE', { key: keyOf() }); });
  }
  paint(await api(url));
}

// ── Onboarding answers from GHL (ghl-onboarding/, 11 Nov 2026) ──────────────────────────────
// What the client answered in the GHL onboarding funnel: the stage reached and when each step last
// sent, the answers with their source, a domain that differs from Live domain. Read only until
// Correct is pressed; a value typed here is Hand and a later send never replaces it. Nothing shows
// for a client GHL has sent nothing about.
async function renderOnboarding(el, clientId) {
  const url = `/api/clients/${clientId}/onboarding`;
  let v = await api(url), editing = false;
  const STAGE = { started: 'Started', gbp: 'Google Business Profile', 'domain-access-request': 'Domain access request', domain: 'Domain', citations: 'Citations', complete: 'Complete' };
  const draw = () => {
    if (!v.has) { el.innerHTML = ''; return; }
    const head = v.completed_at ? `${pill('ok', 'onboarding complete')} <span class="muted small">${h(fmtDate(v.completed_at, true))}</span>` : `${pill('wait', `reached: ${STAGE[v.stage] || v.stage || 'nothing yet'}`)}`;
    const times = v.stages.map(s => `${h(STAGE[s.stage] || s.stage)} ${h(fmtDate(s.at, true))}`).join(' · ');
    const diff = v.domain_difference ? `<div class="notice warn" style="margin:10px 0">The client gave the domain <strong>${h(v.domain_difference.given)}</strong> but Live domain is <strong>${h(v.domain_difference.live)}</strong>. Live domain was not changed: check which is right.</div>` : '';
    const rows = v.answers.map(a => editing
      ? `<div class="field"><label>${h(a.label)}</label><input class="input" data-onb="${attr(a.key)}" value="${attr(a.value)}"></div>`
      : `<div class="field" style="margin-bottom:8px"><label>${h(a.label)}${a.source ? ` ${tag(a.source, SOURCE_LABEL[a.source])}` : ''}</label><div>${a.value ? h(a.value) : '<span class="muted">not answered</span>'}</div>${a.key === 'gbp_category' && a.value ? `<div class="help">Primary category is ${v.primary_category ? h(v.primary_category) : 'not set'}. Copybot never sets it from this answer.</div>` : ''}</div>`).join('');
    el.innerHTML = `<div style="margin-bottom:16px">${card({ title: 'Onboarding answers from GHL', sub: `${head}${times ? ` <span class="muted small">· last sent: ${times}</span>` : ''}`, actions: editing ? '<button class="btn btn-primary btn-sm" id="onbSave">Save</button><button class="btn btn-ghost btn-sm" id="onbCancel">Cancel</button>' : '<button class="btn btn-ghost btn-sm" id="onbEdit" title="Type the right answer over one the client got wrong. A typed value is never replaced by a later send.">Correct</button>', body: `${diff}<div class="grid grid-2">${rows}</div>` })}</div>`;
  };
  el.addEventListener('click', async e => {
    if (e.target.closest('#onbEdit')) { editing = true; return draw(); }
    if (e.target.closest('#onbCancel')) { editing = false; return draw(); }
    if (e.target.closest('#onbSave')) {
      try {
        for (const inp of el.querySelectorAll('[data-onb]')) { const a = v.answers.find(x => x.key === inp.dataset.onb); if (a && inp.value.trim() !== a.value) v = await api(`${url}/${a.key}`, { method: 'PUT', body: { value: inp.value } }); }
        editing = false; draw(); toast('Saved');
      } catch (err) { toast(err.message, 'bad'); }
    }
  });
  draw();
}

function cantSayBox(row, summary) {
  const items = [];
  for (const m of row.missing_fields || []) items.push({ text: m.text.replace(/^no /, 'No ') + ' on the record', kind: 'field', key: KEY_FIELDS[m.key] });
  for (const f of summary.missing_facts || []) items.push({ text: f.fact, why: f.why, pages: f.pages.length, kind: 'fact' });
  if (!items.length) return '';
  return `<div class="notice warn" style="margin-bottom:16px"><strong>What the pages can't say yet</strong> ${info('The reviewer asked for these facts while judging the pages, plus the key fields the record is missing. Fill them in below and the next run uses them.')}
    <ul style="margin:6px 0 0 18px">${items.map(i => `<li>${i.key ? `<a href="#f-${h(i.key)}">${h(i.text)}</a>` : h(i.text)}${i.why ? ` <span class="muted">(${h(i.why)})</span>` : ''}${i.pages ? ` <span class="muted">· ${i.pages} page${i.pages === 1 ? '' : 's'}</span>` : ''}</li>`).join('')}</ul></div>`;
}

// ── The Client Values form ────────────────────────────────────────────────────
async function renderValues(body, ctx) {
  const { clientId } = ctx;
  const [cvRes, catRes] = await Promise.all([api(`/api/clients/${clientId}/client-values`), api(`/api/clients/${clientId}/gbp-categories`).catch(() => ({ categories: [] }))]);
  const values = cvRes.values || {};
  const derived = cvRes.derived || {};
  const sources = { ...(values._sources || {}) };
  const confirmed = { ...(values._confirmed || {}) };
  const loaded = JSON.parse(JSON.stringify(values));
  let niche = null;
  const loadNiche = async cat => { if (!cat) return null; try { return await api('/api/niche/' + encodeURIComponent(cat)); } catch (_) { return null; } };
  niche = await loadNiche(values.primary_category);

  const srcOf = key => sources[key] || (hasValue(values[key]) ? 'hand' : '');
  const inferred = key => INFERRED.has(sources[key] || '') && !confirmed[key];

  const field = f => {
    const src = srcOf(f.key);
    const amber = inferred(f.key);
    return `<div class="field" id="f-${h(f.key)}" data-key="${h(f.key)}" style="${amber ? 'border-left:3px solid var(--wait);padding-left:10px;margin-left:-13px' : ''}">
      <label>${h(f.label)}${src ? ` ${tag(src, SOURCE_LABEL[src])}` : ''}${amber ? ` <button class="btn btn-xs" data-confirm="${h(f.key)}" style="color:#b45309;border-color:#f3dcb0">Confirm</button>` : ''}${confirmed[f.key] ? ' <span class="tag ok">confirmed</span>' : ''}</label>
      ${input(f)}
      ${f.hint ? `<div class="help">${h(f.hint)}</div>` : ''}
      ${f.key === 'coastal_city' && !hasValue(values.coastal_city) && derived.coastal_city ? `<div class="help">The area research says: ${h(typeof derived.coastal_city === 'object' ? (derived.coastal_city.value || JSON.stringify(derived.coastal_city)) : derived.coastal_city)}${derived.coastal_city && derived.coastal_city.source ? ` (${h(derived.coastal_city.source)})` : ''} ${tag('dossier', 'Dossier')}</div>` : ''}
      ${(f.sub || []).map(s => `<label class="check" style="margin-top:6px"><input type="checkbox" data-key="${h(s.key)}"${values[s.key] ? ' checked' : ''}> ${h(s.label)}</label>`).join('')}
    </div>`;
  };
  const input = f => {
    const v = values[f.key];
    const t = f.type || 'text';
    if (t === 'textarea') return `<textarea class="input" data-key="${h(f.key)}" rows="2" placeholder="${attr(f.placeholder || '')}">${h(v || '')}</textarea>`;
    if (t === 'lines') return `<textarea class="input" data-key="${h(f.key)}" data-lines="1" rows="4" placeholder="${attr(f.placeholder || '')}">${h((Array.isArray(v) ? v : []).join('\n'))}</textarea>`;
    if (t === 'select') return `<select class="input" data-key="${h(f.key)}">${f.options.map(o => `<option value="${h(o)}"${String(v ?? '') === o ? ' selected' : ''}>${o || '–'}</option>`).join('')}</select>`;
    if (t === 'gbp-select') { const cats = catRes.categories || []; const list = cats.includes(v) || !v ? cats : [v, ...cats]; return `<select class="input" data-key="${h(f.key)}"><option value="">– select –</option>${list.map(o => `<option value="${h(o)}"${v === o ? ' selected' : ''}>${h(o)}</option>`).join('')}</select>${cats.length ? '' : '<div class="help">No GBP categories on file: the category list comes from the custom values files.</div>'}`; }
    if (t === 'gbp-multicheck') { const cats = catRes.categories || []; const set = new Set(Array.isArray(v) ? v : []); return cats.length ? `<div class="chips" data-multi="${h(f.key)}">${cats.map(o => `<label class="chip${set.has(o) ? ' active' : ''}"><input type="checkbox" value="${attr(o)}"${set.has(o) ? ' checked' : ''} style="display:none"> ${h(o)}</label>`).join('')}</div>` : '<div class="help">No GBP categories on file.</div>'; }
    if (t === 'materials') {
      const tl = (niche && niche.materials_tick_list) || {}; const set = new Set(Array.isArray(v) ? v : []);
      const listed = new Set(Object.values(tl).flat());
      const own = [...set].filter(x => !listed.has(x));
      const chip = o => `<label class="chip${set.has(o) ? ' active' : ''}"><input type="checkbox" value="${attr(o)}"${set.has(o) ? ' checked' : ''} style="display:none"> ${h(o)}</label>`;
      return `<div data-multi="${h(f.key)}">${Object.keys(tl).length ? Object.entries(tl).map(([head, items]) => `<div class="sec-title">${h(head)}</div><div class="chips">${items.map(chip).join('')}</div>`).join('') : '<div class="help">No materials list for this category yet (set the primary category and save); add your own below.</div>'}
        <div class="sec-title">Your own</div><div class="chips" data-own>${own.map(chip).join('')}</div>
        <div class="btn-row" style="margin-top:6px"><input class="input" data-own-input placeholder="Add a material or method" style="max-width:260px;padding:5px 8px"><button class="btn btn-ghost btn-xs" data-own-add>Add</button></div></div>`;
    }
    if (t === 'practices') {
      const mine = (niche && niche.practices) || [], all = (niche && niche.all_practices) || mine;
      const set = new Set(Array.isArray(v) ? v : []);
      const showAll = !!f._showAll;
      const list = showAll ? all : [...mine, ...all.filter(p => set.has(p.key) && !mine.some(m => m.key === p.key))];
      if (!list.length) return '<div class="help">No practices list for this niche yet (set the primary category and save).</div>';
      return `<div data-multi="${h(f.key)}" class="stack" style="--gap:4px">${list.map(p => `<label class="check" title="${attr(p.question || '')}" style="display:flex;margin:3px 0"><input type="checkbox" value="${attr(p.key)}"${set.has(p.key) ? ' checked' : ''}> <span>${h(p.label)}<span class="muted small"> · ${h(p.question || '')}</span></span></label>`).join('')}
        ${all.length > mine.length ? `<button class="btn btn-ghost btn-xs" data-show-all="${h(f.key)}" style="margin-top:6px;align-self:flex-start">${showAll ? `Show this niche's only (${mine.length})` : `Show all practices (${all.length})`}</button>` : ''}</div>`;
    }
    if (t === 'job-rows') { const rows = Array.isArray(v) ? v : []; return rowsEditor(f.key, [['name', 'Job name', 2], ['price', 'From £', 1], ['duration', 'Duration', 1]], rows, 3); }
    if (t === 'review-rows') { const rows = Array.isArray(v) ? v : []; return rowsEditor(f.key, [['text', 'The review, as the customer wrote it', 3], ['name', 'First name', 1], ['town', 'Town', 1]], rows, 3); }
    if (t === 'theme-rows') { const rows = Array.isArray(v) ? v : []; return rowsEditor(f.key, [['theme', 'e.g. tidied up every day', 3], ['approved', 'Approved by the client', 'check']], rows, Math.max(1, rows.length), true); }
    if (t === 'logo-rows') { const rows = Array.isArray(v) ? v : []; return rowsEditor(f.key, [['name', 'Name', 2], ['tier', 'ratings|tier1|tier2|tier3', 'select'], ['register_url', 'Register URL', 2], ['caption', 'Caption', 2]], rows, rows.length, true); }
    return `<input class="input" type="text" data-key="${h(f.key)}" value="${attr(v ?? '')}" placeholder="${attr(f.placeholder || '')}">`;
  };
  // A group's card: the usual fields, then the rarely needed ones behind a toggle (open when one holds a value)
  const groupCard = g => {
    const usual = g.fields.filter(f => !f.rare), rare = g.fields.filter(f => f.rare);
    const open = rare.some(f => hasValue(values[f.key]));
    return card({ title: g.title, id: `g-${g.key}`, body: usual.map(field).join('') + (rare.length ? `<details${open ? ' open' : ''}><summary class="small muted" style="cursor:pointer;margin-top:4px">Rarely needed (${rare.length}): the dossier and the page map decide these</summary><div style="margin-top:10px">${rare.map(field).join('')}</div></details>` : '') });
  };
  const rowsEditor = (key, cols, rows, n, addable = false) => {
    const line = (r = {}) => `<div class="row-line" style="display:grid;grid-template-columns:${cols.map(c => typeof c[2] === 'number' ? `${c[2]}fr` : 'auto').join(' ')}${addable ? ' 24px' : ''};gap:6px;margin-bottom:6px;align-items:center">${cols.map(([k, ph, kind]) => kind === 'check' ? `<label class="check small"><input type="checkbox" data-col="${k}"${r[k] ? ' checked' : ''}> ${h(ph)}</label>` : kind === 'select' ? `<select class="input" data-col="${k}" style="width:auto">${ph.split('|').map(o => `<option value="${o}"${r[k] === o ? ' selected' : ''}>${o}</option>`).join('')}</select>` : `<input class="input" data-col="${k}" placeholder="${attr(ph)}" value="${attr(r[k] ?? '')}">`).join('')}${addable ? '<button class="btn btn-xs" data-remove title="Remove">×</button>' : ''}</div>`;
    const list = addable ? rows : [...rows, ...Array(Math.max(0, n - rows.length)).fill({})].slice(0, n);
    return `<div data-rows="${h(key)}">${list.map(line).join('')}${addable ? `<button class="btn btn-ghost btn-xs" data-add>Add</button><template>${line({})}</template>` : ''}</div>`;
  };

  body.innerHTML = `
    <div id="placeCard" style="margin-bottom:16px"></div>
    <div class="btn-row" style="margin-bottom:14px"><button class="btn btn-primary" id="saveCv">Save</button><button class="btn btn-ghost" id="fromForm" title="Copy the onboarding form's answers into the blank fields. Nothing already filled is changed.">Fill from the form</button><button class="btn btn-ghost" id="prefill" title="Read the uploaded custom values and onboarding files into the blanks">Prefill from files</button><span class="muted small">Source tags: Form (Fillout), Website, GBP, Dossier (research), Hand. Amber values were inferred and need confirming.</span></div>
    <div class="grid grid-2" id="cvGroups">${GROUPS.map(groupCard).join('')}</div>`;

  renderPlaceCard(body.querySelector('#placeCard'), ctx);

  // Chips toggle
  body.addEventListener('click', async e => {
    const chip = e.target.closest('[data-multi] label.chip'); if (chip) { setTimeout(() => chip.classList.toggle('active', chip.querySelector('input').checked), 0); }
    const rm = e.target.closest('[data-remove]'); if (rm) { rm.closest('.row-line').remove(); return; }
    const add = e.target.closest('[data-add]'); if (add) { const t = add.parentElement.querySelector('template'); add.insertAdjacentHTML('beforebegin', t.innerHTML); return; }
    const addOwn = e.target.closest('[data-own-add]');
    if (addOwn) { const box = addOwn.closest('[data-multi]'); const inp = box.querySelector('[data-own-input]'); const val = inp.value.trim(); if (!val) return; if ([...box.querySelectorAll('input[type=checkbox]')].some(i => i.value.toLowerCase() === val.toLowerCase())) { toast('Already in the list', 'bad'); return; } box.querySelector('[data-own]').insertAdjacentHTML('beforeend', `<label class="chip active"><input type="checkbox" value="${attr(val)}" checked style="display:none"> ${h(val)}</label>`); inp.value = ''; return; }
    const showAll = e.target.closest('[data-show-all]');
    if (showAll) { const f = GROUPS.flatMap(g => g.fields).find(x => x.key === showAll.dataset.showAll); values[f.key] = collectOne(body, f) ?? values[f.key]; f._showAll = !f._showAll; body.querySelector(`#f-${f.key}`).outerHTML = field(f); return; }
    const conf = e.target.closest('[data-confirm]'); if (conf) { confirmed[conf.dataset.confirm] = true; const f = conf.closest('.field'); f.style.borderLeft = ''; f.style.paddingLeft = ''; f.style.marginLeft = ''; conf.replaceWith(Object.assign(document.createElement('span'), { className: 'tag ok', textContent: 'confirmed' })); return; }
  });
  // A new primary category loads its niche's materials and practices
  const catSel = body.querySelector('[data-key="primary_category"]');
  if (catSel) catSel.addEventListener('change', async () => { niche = await loadNiche(catSel.value); for (const k of ['materials_methods', 'confirmed_practices']) { const f = GROUPS.flatMap(g => g.fields).find(x => x.key === k); const wrap = body.querySelector(`#f-${k}`); if (wrap) { values[k] = collectOne(body, f) ?? values[k]; wrap.outerHTML = field(f); } } });

  const collectOne = (root, f) => {
    const t = f.type || 'text';
    if (['job-rows', 'review-rows', 'theme-rows', 'logo-rows'].includes(t)) {
      const box = root.querySelector(`[data-rows="${f.key}"]`); if (!box) return undefined;
      const rows = [...box.querySelectorAll('.row-line')].map(l => { const o = {}; l.querySelectorAll('[data-col]').forEach(i => { o[i.dataset.col] = i.type === 'checkbox' ? i.checked : i.value.trim(); }); return o; });
      const filled = rows.filter(r => Object.entries(r).some(([k, v]) => k !== 'tier' && k !== 'approved' && v && v !== false));
      return t === 'logo-rows' ? (filled.length ? filled : null) : filled;
    }
    if (['gbp-multicheck', 'materials', 'practices'].includes(t)) { const box = root.querySelector(`[data-multi="${f.key}"]`); if (!box) return undefined; return [...box.querySelectorAll('input:checked')].map(i => i.value); }
    const el = root.querySelector(`[data-key="${f.key}"]`); if (!el) return undefined;
    if (el.dataset.lines) return el.value.split('\n').map(s => s.trim()).filter(Boolean);
    // A number stored as a number stays one when the box still shows it unchanged
    const prev = values[f.key];
    if (typeof prev === 'number' && String(prev) === el.value.trim()) return prev;
    return el.value;
  };
  const collect = () => {
    const out = { ...values };
    for (const g of GROUPS) for (const f of g.fields) {
      const v = collectOne(body, f); if (v !== undefined) out[f.key] = v;
      for (const s of f.sub || []) { const el = body.querySelector(`input[type=checkbox][data-key="${s.key}"]`); if (el) out[s.key] = el.checked; }
    }
    // A value typed by hand over an inferred one becomes Hand; a new value with no source is Hand
    const src = { ...sources };
    for (const k of Object.keys(out)) {
      if (k.startsWith('_')) continue;
      if (JSON.stringify(out[k]) !== JSON.stringify(loaded[k])) { src[k] = 'hand'; delete confirmed[k]; }
      else if (!src[k] && hasValue(out[k])) src[k] = 'hand';
    }
    out._sources = src; out._confirmed = confirmed;
    return out;
  };
  body.querySelector('#saveCv').addEventListener('click', e => busy(e.target, 'Saving…', async () => {
    const out = collect();
    const changed = Object.keys(out).filter(k => !k.startsWith('_') && JSON.stringify(out[k]) !== JSON.stringify(loaded[k])).length;
    try { await api(`/api/clients/${clientId}/client-values`, { method: 'PUT', body: out }); toast(`saved: ${changed} field${changed === 1 ? '' : 's'} changed`); ctx.refresh(); }
    catch (err) { toast(`Not saved: ${err.message}`, 'bad'); }
  }));
  body.querySelector('#fromForm').addEventListener('click', e => busy(e.target, 'Reading the form…', async () => {
    try {
      const r = await api(`/api/clients/${clientId}/client-values/from-form`, { method: 'POST' });
      toast(r.filled.length ? `${r.filled.length} field${r.filled.length === 1 ? '' : 's'} filled from the form${r.to_confirm.length ? `; ${r.to_confirm.length} to confirm (amber)` : ''}` : 'Nothing new on the form for the blank fields');
      if (r.filled.length) ctx.refresh();
    } catch (err) { toast(err.message, 'bad'); }
  }));
  body.querySelector('#prefill').addEventListener('click', e => busy(e.target, 'Reading the files…', async () => {
    try {
      const r = await api(`/api/clients/${clientId}/prefill-client-values`, { method: 'POST' });
      let n = 0;
      for (const [k, v] of Object.entries(r.prefilled || {})) { if (hasValue(v) && !hasValue(values[k])) { values[k] = v; sources[k] = 'form'; n++; } }
      toast(`${n} blank field${n === 1 ? '' : 's'} filled from the files; check them, then Save`);
      renderValuesInto();
    } catch (err) { toast(err.message, 'bad'); }
  }));
  const renderValuesInto = () => { body.querySelector('#cvGroups').innerHTML = GROUPS.map(groupCard).join(''); };
  if (location.hash && body.querySelector(location.hash)) body.querySelector(location.hash).scrollIntoView({ block: 'center' });
}

const hasValue = v => !(v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length) || v === false);

// ── The Google listing (the place ID step, 9 Nov 2026) ───────────────────────
// Search by business name and main town, the top matches with name, address and phone; the one
// match with the record's phone pre-selected; a pasted place ID looked up; the GBP address type
// suggested from the listing. Nothing saves until the Confirm click. The place ID and address
// type are set here only, not on the form below.
async function renderPlaceCard(el, ctx) {
  const { clientId } = ctx;
  let v = null, pick = null, type = '', busyNow = false;
  const typeLabel = t => (t === 'service_area' ? 'service area (address hidden)' : t === 'storefront' ? 'storefront (address shown)' : 'not set');
  const all = () => [...((v.lookup && v.lookup.candidates) || []), ...(v.lookup && v.lookup.checked && !((v.lookup.candidates || []).some(c => c.place_id === v.lookup.checked.place_id)) ? [v.lookup.checked] : [])];
  const choose = id => { pick = id; const c = all().find(x => x.place_id === id); if (c && c.suggested_address_type && c.suggested_address_type.value) type = c.suggested_address_type.value; };
  const load = async () => {
    try { v = await api(`/api/clients/${clientId}/place-id`); } catch (e) { el.innerHTML = card({ title: 'Google listing', body: `<div class="notice warn">${h(e.message)}</div>` }); return; }
    pick = null; type = v.address_type || '';
    if (v.lookup && v.lookup.preselect && !v.place_id) choose(v.lookup.preselect);
    draw();
  };
  const draw = () => {
    const C = v.confirmed;
    const status = v.place_id
      ? `<div class="notice good" style="margin-bottom:10px"><strong>Confirmed</strong> ${h(v.place_id)}${C ? ` · ${h(C.name || '')}${C.address ? ', ' + h(C.address) : ''}${C.phone ? ' · ' + h(C.phone) : ''} · ${h(typeLabel(v.address_type))} · ${h(fmtDate(C.at, true))}${C.by ? ' by ' + h(C.by) : ''}` : ` · ${h(typeLabel(v.address_type))} (set before the confirm step existed)`}</div>`
      : `<div class="notice bad" style="margin-bottom:10px"><strong>Place ID missing.</strong> Find the client's Google listing and confirm it. Rank scans match by place ID only and are blocked until it is set.</div>`;
    const L = v.lookup || {};
    const list = all();
    const rows = list.length ? list.map(c => `<label class="choice${pick === c.place_id ? ' selected' : ''}" style="display:block;cursor:pointer"><input type="radio" name="pidPick" value="${attr(c.place_id)}" ${pick === c.place_id ? 'checked' : ''} style="margin-right:6px"><strong>${h(c.name)}</strong> ${c.phone_match ? pill('ok', 'phone matches the record') : c.phone ? pill('wait', 'phone differs') : pill('none', 'no phone')}${v.place_id === c.place_id ? ' ' + pill('accent', 'saved') : ''}<span class="sub">${h(c.address || 'no address shown')} · ${h(c.phone || 'no phone')}${c.business_status && c.business_status !== 'OPERATIONAL' ? ' · ' + h(c.business_status) : ''} · <span class="mono">${h(c.place_id)}</span> ${c.maps_url ? `<a href="${attr(c.maps_url)}" target="_blank" rel="noopener">Maps</a>` : ''}</span></label>`).join('')
      : L.at ? '<div class="muted">No listing found. Try another spelling, or paste the place ID below.</div>' : '';
    const sel = list.find(c => c.place_id === pick);
    const hint = L.at && !L.preselect && list.length ? `<div class="muted small" style="margin:6px 0">${L.phone_matches > 1 ? `${L.phone_matches} listings carry the record's phone: pick the right one.` : `None of these carries the record's phone (${h(v.phone || 'no phone on the record')}). Pick one only if you are sure, or paste the place ID.`}</div>` : L.preselect ? '<div class="muted small" style="margin:6px 0">Pre-selected: the one listing with the record\'s phone. Check it and confirm.</div>' : '';
    el.innerHTML = card({ title: 'Google listing', sub: 'The place ID and GBP address type, confirmed by a person. A search is one Google Places call (no Local Falcon credits)', body: `
      ${status}
      <div class="btn-row" style="margin-bottom:10px"><input class="input" id="pidQ" style="flex:1" value="${attr((L.q) || v.query)}" placeholder="Business name and main town"><button class="btn btn-ghost" id="pidSearch" ${v.places_on ? '' : 'disabled'}>${L.at ? 'Search again' : 'Find the listing'}</button></div>
      ${L.at ? `<div class="muted small" style="margin-bottom:6px">Searched "${h(L.q)}" ${h(fmtDate(L.at, true))} · record phone ${h(v.phone || 'none')}</div>` : ''}
      ${hint}<div id="pidList">${rows}</div>
      <div class="btn-row" style="margin-top:10px"><input class="input mono" id="pidPaste" style="flex:1" placeholder="Or paste a place ID (ChIJ…)"><button class="btn btn-ghost" id="pidCheck" ${v.details_on ? '' : 'disabled'}>Look it up</button></div>
      ${sel ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
        <div style="margin-bottom:6px"><strong>GBP address type</strong> <span class="muted small">suggested: ${h(typeLabel(sel.suggested_address_type.value))}, because ${h(sel.suggested_address_type.why)}</span></div>
        <label class="small" style="margin-right:14px"><input type="radio" name="pidType" value="service_area" ${type === 'service_area' ? 'checked' : ''}> Service area: the address is hidden (rank maps centre on the main town)</label><br>
        <label class="small"><input type="radio" name="pidType" value="storefront" ${type === 'storefront' ? 'checked' : ''}> Storefront: the address is shown (rank maps centre on the pin)</label>
        <div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" id="pidConfirm" ${type ? '' : 'disabled'}>Confirm ${h(sel.name)} as this client's listing</button></div></div>` : ''}` });
  };
  const act = async (btn, label, fn) => { if (busyNow) return; busyNow = true; const t = btn.textContent; btn.disabled = true; btn.textContent = label; try { await fn(); } catch (e) { toast(e.message, 'bad'); } finally { busyNow = false; if (btn.isConnected) { btn.disabled = false; btn.textContent = t; } } };
  el.addEventListener('change', e => {
    if (e.target.name === 'pidPick') { choose(e.target.value); draw(); }
    if (e.target.name === 'pidType') { type = e.target.value; draw(); }
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'pidSearch') return act(b, 'Searching…', async () => { v = await api(`/api/clients/${clientId}/place-id/search`, { method: 'POST', body: { q: el.querySelector('#pidQ').value.trim() } }); pick = null; type = v.address_type || ''; if (v.lookup && v.lookup.preselect) choose(v.lookup.preselect); draw(); });
    if (b.id === 'pidCheck') return act(b, 'Looking up…', async () => { const id = el.querySelector('#pidPaste').value.trim(); if (!id) throw new Error('Paste a place ID first'); v = await api(`/api/clients/${clientId}/place-id/check`, { method: 'POST', body: { place_id: id } }); if (v.lookup && v.lookup.checked) choose(v.lookup.checked.place_id); draw(); });
    if (b.id === 'pidConfirm') return act(b, 'Saving…', async () => { v = await api(`/api/clients/${clientId}/place-id/confirm`, { method: 'POST', body: { place_id: pick, address_type: type, confirm: true, by: userName() || '' } }); toast('Listing confirmed'); ctx.refresh(); });
  });
  await load();
}
