// Add client (27 Oct 2026): a wizard, one question per screen, a progress bar, Back and
// Continue. (1) Website or no website, multi-location. (2) Reading the website (running
// state). (3) The Google profile via Places, a Maps link, or none. (4) Organising the
// details (running state): website, GBP and any Fillout submission merged. (5) Confirm the
// identity. (6) Done: the record is seeded, the Fillout link shown, the client at Onboarding.

import { h, attr, api, card, running, toast, empty, copyBtn, wire } from '../ui.js';

const STEPS = ['Website', 'Reading the website', 'Google profile', 'Organising', 'Confirm', 'Done'];
const TYPES = [['A', 'A: one-off projects, quotes and site visits'], ['B', 'B: maintenance and repeat visits'], ['C', 'C: emergency and call-outs'], ['D', 'D: showroom or retail led'], ['split', 'Split: more than one of these']];

export async function render(root, params, ctx) {
  ctx.setTitle('Add client');
  const S = { step: 0, url: '', noSite: false, multi: false, website: null, place: null, places: [], placeQuery: '', merged: null, identity: {}, sources: {}, niche_key: '', business_type: 'A', existing_site: true, result: null, email: '', phone: '' };

  const draw = () => {
    const pct = Math.round(((S.step + 1) / STEPS.length) * 100);
    root.innerHTML = `
      <div class="wizard">
        <div class="crumbs"><a href="/clients" data-link>Clients</a> / Add client</div>
        <div class="muted small">Step ${S.step + 1} of ${STEPS.length} · ${h(STEPS[S.step])}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <section class="card" id="stepBody">${step()}</section>
      </div>`;
    wire(root);
    after();
  };

  const nav = (backOk = true, continueLabel = 'Continue', continueOk = true) => `<div class="nav"><button class="btn btn-ghost" data-back ${backOk ? '' : 'disabled'}>Back</button><button class="btn btn-primary" data-next ${continueOk ? '' : 'disabled'}>${h(continueLabel)}</button></div>`;

  function step() {
    const I = S.identity;
    switch (S.step) {
      case 0: return `
        <div class="q">What is the business's website?</div><div class="q-help">The site tells us the name, the town, the phone number, the logo and the social links.</div>
        <div class="field"><input class="input" id="url" type="url" placeholder="https://www.example.co.uk" value="${attr(S.url)}" ${S.noSite ? 'disabled' : ''}></div>
        <label class="check" style="margin-bottom:10px"><input type="checkbox" id="noSite" ${S.noSite ? 'checked' : ''}> This business doesn't have a website</label><br>
        <label class="check"><input type="checkbox" id="multi" ${S.multi ? 'checked' : ''}> Multi-location business (more than one base)</label>
        ${nav(false, S.noSite ? 'Continue without a site' : 'Read the website', true)}`;
      case 1: return `
        <div class="q">Reading the website</div>
        ${S.website ? websiteSummary() : S.readError ? `<div class="state failed"><h3>The site could not be read</h3><p>${h(S.readError)}</p><div class="btn-row" style="justify-content:center"><button class="btn btn-ghost" data-retry>Retry</button><button class="btn btn-ghost" data-skip-site>Continue without the site</button></div></div>` : running({ now: `Fetching ${S.url} and reading what it says`, next: 'Then the Google profile: the name and town are searched on Places' })}
        ${S.website || S.readError ? nav(true, 'Continue') : ''}`;
      case 2: return `
        <div class="q">Find the Google Business Profile</div><div class="q-help">Searched on Places with the name and town. Pick the listing, paste a Maps link, or continue without one.</div>
        <div class="btn-row" style="margin-bottom:12px"><input class="input" id="pq" style="flex:1" placeholder="Business name and town" value="${attr(S.placeQuery)}"><button class="btn btn-ghost" data-search>Search</button></div>
        <div id="placeList">${S.placesError ? `<div class="notice warn">${h(S.placesError)}</div>` : S.places.length ? S.places.map((p, i) => `<label class="choice${S.place && S.place.place_id === p.place_id ? ' selected' : ''}" data-pick="${i}"><strong>${h(p.name)}</strong> ${p.rating ? `<span class="muted small">${p.rating} ★ (${p.review_count})</span>` : ''}<span class="sub">${h(p.address || '')}${p.primary_type ? ` · ${h(p.primary_type)}` : ''}${p.website ? ` · ${h(p.website.replace(/^https?:\/\/(www\.)?/, ''))}` : ''}</span></label>`).join('') : S.searched ? empty({ title: 'No listing found', text: 'Try another spelling or the town, or paste a Maps link.' }) : ''}</div>
        <div class="btn-row" style="margin:12px 0"><input class="input" id="mapsLink" style="flex:1" placeholder="Or paste a Google Maps link"><button class="btn btn-ghost" data-link-search>Use link</button></div>
        <div class="nav"><button class="btn btn-ghost" data-back>Back</button><span class="btn-row"><button class="btn btn-ghost" data-no-place>Continue without</button><button class="btn btn-primary" data-next ${S.place ? '' : 'disabled'}>Use this listing</button></span></div>`;
      case 3: return `
        <div class="q">Organising the details</div>
        ${S.merged ? '' : S.mergeError ? `<div class="state failed"><h3>The details could not be merged</h3><p>${h(S.mergeError)}</p><button class="btn btn-ghost" data-retry>Retry</button></div>` : running({ now: 'Merging what the website, the Google profile and any Fillout submission say', next: 'Then you confirm the business identity' })}
        ${S.merged ? nav(true, 'Continue') : ''}`;
      case 4: { const f = (k, label, type = 'text', opts = null) => `<div class="field"><label>${h(label)} ${S.sources[k] ? `<span class="tag ${h(S.sources[k])}">${h({ form: 'Form', website: 'Website', gbp: 'GBP', dossier: 'Dossier', hand: 'Hand' }[S.sources[k]] || S.sources[k])}</span>` : ''}</label>${opts ? `<select class="input" data-id="${k}">${opts.map(([v, l]) => `<option value="${attr(v)}"${I[k] === v ? ' selected' : ''}>${h(l)}</option>`).join('')}</select>` : `<input class="input" data-id="${k}" value="${attr(I[k] || '')}">`}</div>`;
        return `
        <div class="q">Confirm the business identity</div><div class="q-help">${S.merged && S.merged.matched ? `<span class="pill wait">Matches the Fillout client "${h(S.merged.matched.name)}" by ${h(S.merged.matched.by)}: the details merge into that record, no second client.</span>` : 'Each value shows where it came from. Change anything that is wrong.'}</div>
        <div class="grid grid-2">
          <div>${f('name', 'Business name')}${f('address', I.gbp_address_type === 'service_area' ? 'Service area (no street address shown)' : 'Address')}${f('phone', 'Phone')}${f('email', 'Email')}${f('website', 'Website')}</div>
          <div>${f('primary_category', 'Primary category')}
            <div class="field"><label>Niche</label><select class="input" data-id="niche_key"><option value="">Choose…</option>${(S.merged ? S.merged.niches : []).map(n => `<option value="${attr(n.key)}"${S.niche_key === n.key ? ' selected' : ''}>${h(n.label)}</option>`).join('')}</select></div>
            <div class="field"><label>Business type</label><select class="input" data-id="business_type">${TYPES.map(([v, l]) => `<option value="${v}"${S.business_type === v ? ' selected' : ''}>${h(l)}</option>`).join('')}</select><div class="help">Emergency and A2 markers are set per category on the page briefs; the letter here is the client's default.</div></div>
            <div class="field"><label>Site</label><select class="input" data-id="existing_site"><option value="1"${S.existing_site ? ' selected' : ''}>Existing site to replace</option><option value="0"${!S.existing_site ? ' selected' : ''}>New build</option></select></div>
          </div>
        </div>
        ${nav(true, S.merged && S.merged.matched ? 'Merge into the record' : 'Create the client', true)}`; }
      case 5: return S.result ? `
        <div class="q">Done: ${h(S.identity.name)} is at Onboarding</div>
        <div class="q-help">${S.result.merged ? 'The details merged into the existing Fillout record.' : 'The record is seeded with what the website and Google profile said, each value tagged with its source.'}</div>
        ${S.result.fillout_link ? `<div class="field"><label>Send the client the onboarding form</label><div class="btn-row"><input class="input" readonly value="${attr(S.result.fillout_link)}">${copyBtn(S.result.fillout_link, 'Copy link')}</div><div class="help">A submission from this email or phone merges into this record.</div></div>` : '<div class="notice warn">No Fillout form link is set on the server (FILLOUT_FORM_URL). Send the client the form by hand.</div>'}
        <div class="btn-row" style="margin-top:16px"><a class="btn btn-primary" href="/clients/${h(S.result.id)}/record" data-link>Open the client</a><a class="btn btn-ghost" href="/dashboard" data-link>Dashboard</a><a class="btn btn-ghost" href="/add-client" data-link>Add another</a></div>` : S.createError ? `<div class="state failed"><h3>The client was not created</h3><p>${h(S.createError)}</p><button class="btn btn-ghost" data-back>Back</button></div>` : running({ now: 'Creating the client and seeding its record', next: 'Then the Fillout link to send' });
    }
  }
  function websiteSummary() {
    const w = S.website;
    const row = (k, v) => (Array.isArray(v) ? v.length : v) ? `<dt>${h(k)}</dt><dd>${h(Array.isArray(v) ? v.join(', ') : v)}</dd>` : '';
    const any = ['name', 'town', 'area', 'phone', 'email', 'address', 'primary_category'].some(k => w[k]) || w.services.length || w.towns.length;
    return `<div class="notice ${any ? 'good' : 'warn'}" style="margin-bottom:12px">Read ${h(w.url)}${any ? '' : ': it says nothing usable about a business'}${w.modelError ? ` <span class="muted">(the model read failed, the quick scan filled in: ${h(w.modelError)})</span>` : ''}</div>
      <div style="display:flex;gap:16px;align-items:flex-start">${w.logo ? `<img src="${attr(w.logo)}" alt="logo" onerror="this.remove()" style="width:72px;height:72px;object-fit:contain;border:1px solid var(--border);border-radius:8px;background:#fff">` : ''}
      <dl class="kv" style="flex:1">${row('Name', w.name)}${row('Town', w.town)}${row('Area', w.area)}${row('Phone', w.phone)}${row('Email', w.email)}${row('Address', w.address)}${row('Category', w.primary_category)}${row('Services', w.services.slice(0, 12))}${row('Towns', w.towns.slice(0, 12))}${row('Socials', w.socials)}${row('Owner', w.owner)}${row('Years', w.years)}</dl></div>`;
  }

  // What each step does when it opens
  function after() {
    if (S.step === 1 && !S.website && !S.readError) readSite();
    if (S.step === 2 && !S.searched && !S.places.length && S.placeQuery) searchPlaces();
    if (S.step === 3 && !S.merged && !S.mergeError) merge();
    if (S.step === 5 && !S.result && !S.createError) create();
  }
  async function readSite() {
    try { S.website = await api('/api/intake/read-website', { method: 'POST', body: { url: S.url } }); S.placeQuery = [S.website.name, S.website.town].filter(Boolean).join(' '); }
    catch (e) { S.readError = e.message; }
    draw();
  }
  async function searchPlaces() {
    S.placesError = null;
    try { const r = await api(`/api/intake/places?q=${encodeURIComponent(S.placeQuery)}`); S.places = r.places; S.searched = true; }
    catch (e) { S.placesError = e.message; S.searched = true; }
    draw();
  }
  async function merge() {
    try {
      const m = await api('/api/intake/merge', { method: 'POST', body: { website: S.website, place: S.place, email: S.email, phone: S.phone } });
      S.merged = m;
      const I = {}, src = {};
      for (const [k, v] of Object.entries(m.identity)) { if (v && typeof v === 'object' && 'value' in v) { I[k] = v.value; if (v.source) src[k] = v.source; } else I[k] = v; }
      S.identity = { ...I, website: I.website || S.url }; S.sources = src; S.niche_key = m.niche_key || '';
      S.existing_site = !S.noSite;
    } catch (e) { S.mergeError = e.message; }
    draw();
  }
  async function create() {
    try {
      S.result = await api('/api/intake/create', { method: 'POST', body: { identity: S.identity, sources: S.sources, niche_key: S.niche_key, business_type: S.business_type, existing_site: S.existing_site, multi_location: S.multi, matched_client_id: S.merged && S.merged.matched ? S.merged.matched.id : null } });
      toast(S.result.merged ? 'Merged into the existing record' : 'Client created');
    } catch (e) { S.createError = e.message; }
    draw();
  }

  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'noSite') { S.noSite = t.checked; draw(); return; }
    if (t.id === 'multi') { S.multi = t.checked; return; }
    if (t.id === 'url') { S.url = t.value.trim(); return; }
    if (t.id === 'pq') { S.placeQuery = t.value.trim(); return; }
    if (t.dataset.id) {
      const k = t.dataset.id;
      if (k === 'niche_key') S.niche_key = t.value; else if (k === 'business_type') S.business_type = t.value; else if (k === 'existing_site') S.existing_site = t.value === '1';
      else { S.identity[k] = t.value.trim(); S.sources[k] = 'hand'; }
    }
  });
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-back]')) { S.step = Math.max(0, S.step - 1); if (S.step === 1 && S.noSite) S.step = 0; if (S.step === 3) S.step = 2; return draw(); }
    if (e.target.closest('[data-retry]')) { if (S.step === 1) { S.readError = null; S.website = null; } if (S.step === 3) { S.mergeError = null; } return draw(); }
    if (e.target.closest('[data-skip-site]')) { S.noSite = true; S.website = null; S.step = 2; return draw(); }
    if (e.target.closest('[data-search]')) { S.placeQuery = root.querySelector('#pq').value.trim(); if (!S.placeQuery) return toast('Type the name and town', 'bad'); return searchPlaces(); }
    if (e.target.closest('[data-link-search]')) { const link = root.querySelector('#mapsLink').value.trim(); if (!link) return; try { const r = await api('/api/intake/place-link', { method: 'POST', body: { link } }); S.places = r.places; S.searched = true; S.place = r.places[0] || null; S.placesError = null; } catch (err) { S.placesError = err.message; } return draw(); }
    const pick = e.target.closest('[data-pick]'); if (pick) { S.place = S.places[+pick.dataset.pick]; return draw(); }
    if (e.target.closest('[data-no-place]')) { S.place = null; S.merged = null; S.step = 3; return draw(); }
    if (e.target.closest('[data-next]')) {
      if (S.step === 0) { S.url = (root.querySelector('#url') || {}).value || ''; S.url = S.url.trim(); if (!S.noSite && !S.url) return toast('Enter the website address, or tick "no website"', 'bad'); S.website = null; S.readError = null; S.step = S.noSite ? 2 : 1; if (S.noSite) S.placeQuery = ''; return draw(); }
      if (S.step === 1) { S.step = 2; S.searched = false; S.places = []; return draw(); }
      if (S.step === 2) { S.merged = null; S.step = 3; return draw(); }
      if (S.step === 3) { S.step = 4; return draw(); }
      if (S.step === 4) { root.querySelectorAll('[data-id]').forEach(i => i.dispatchEvent(new Event('change', { bubbles: true }))); if (!S.identity.name) return toast('The business name is needed', 'bad'); if (!S.niche_key) return toast('Pick the niche', 'bad'); S.result = null; S.createError = null; S.step = 5; return draw(); }
    }
  });
  draw();
}
