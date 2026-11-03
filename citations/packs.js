'use strict';

// ── Prefilled submission packs ────────────────────────────────────────────────────
// Everything a VA pastes into one directory's add listing form, from the master NAP
// record, the client values, the page map and the GBP output, cut to that directory's
// limits (the row's `fields` JSON: name_max, short_description_max, description_max; the
// defaults below where a directory has none). Each field says its length against the
// limit, so a value that still runs over is visible before it is pasted. The descriptions
// come from the GBP description Copybot wrote (the same words everywhere); none until the
// GBP output has run. A cut lands on a sentence end, else a word end, never mid word, and
// never adds a dash. Logo and photos: Copybot stores none yet (they arrive by WhatsApp), so
// the pack says so rather than linking to nothing.

const { postcodeOf } = require('./nap');
const { liveDomain } = require('../gbp/profile');

const DEFAULT_LIMITS = { name_max: 100, short_description_max: 160, description_max: 750 };
const str = v => (v == null ? '' : String(v)).trim();

// Cut to `limit` characters on a sentence end, else a word end
function cut(text, limit) {
  const s = str(text).replace(/\s+/g, ' ');
  if (!limit || s.length <= limit) return s;
  const head = s.slice(0, limit);
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (sentence >= limit * 0.5) return head.slice(0, sentence + 1).trim();
  const word = head.lastIndexOf(' ');
  return (word > 0 ? head.slice(0, word) : head).replace(/[,;:]$/, '').trim();
}

function createPacks({ pool, store, clientCitations, gbpStore = null, pageRowsFor = async () => [] }) {
  async function packFor(clientId, directoryId) {
    const dir = await store.get(directoryId);
    if (!dir) throw Object.assign(new Error('Directory not found.'), { status: 404 });
    const [view, ctx, saved, rows, gbp] = await Promise.all([clientCitations.view(clientId), clientCitations.context(clientId), clientCitations.rowFor(clientId, directoryId), pageRowsFor(clientId), gbpStore ? gbpStore.latest(clientId).catch(() => null) : null]);
    const limits = { ...DEFAULT_LIMITS, ...(dir.fields && typeof dir.fields === 'object' ? dir.fields : {}) };
    const cv = ctx.cv, nap = view.nap;
    const live = (rows || []).filter(r => r.applies !== false && !r.retired_at);
    const cats = live.filter(r => r.type === 'category');
    const primaryRow = cats.find(r => r.info && r.info.primary);
    const primary = (primaryRow && primaryRow.title) || str(cv.primary_category);
    const secondaries = cats.filter(r => r !== primaryRow).map(r => r.title);
    const services = live.filter(r => r.type === 'service').map(r => r.title);
    const record = gbp && gbp.record;
    const description = record && record.steps && record.steps.description && record.steps.description.status === 'done' ? str(record.steps.description.output.description) : '';
    const notes = [];
    if (!description) notes.push('No GBP description yet: run Generate on the GBP tab and the descriptions fill in.');
    if (!nap.address) notes.push('Service area business: leave the address blank or hidden where the form allows; use the service areas.');
    // The pack's website is the live domain alone (3 Nov, Brandon): never the WordPress connection, which may be a staging host
    const liveSite = liveDomain(cv);
    if (!liveSite) notes.push('No live domain in Client Values: leave the website field blank on the form rather than a staging address. Add the live domain on the Record tab when the site is up.');
    const loginEmail = (saved && saved.login_email) || view.email;
    const f = (key, label, value, limit = null, note = '') => { const v = limit ? cut(value, limit) : str(value); return { key, label, value: v, limit, length: v.length, over: !!limit && str(value).replace(/\s+/g, ' ').length > limit, cut: !!limit && v.length < str(value).replace(/\s+/g, ' ').length, note }; };
    const fields = [
      f('business_name', 'Business name', nap.name, limits.name_max, 'As on the GBP, character for character'),
      f('phone', 'Phone', nap.phone, null, 'The GBP number, never a tracking number'),
      f('email', 'Email (the login and contact email for this listing)', loginEmail, null, 'Verification emails come back to Copybot through this address'),
      f('website', 'Website', liveSite, null, liveSite ? 'The live domain from Client Values' : 'No live domain yet: leave blank'),
      f('address', 'Address', nap.address || '', null, nap.address ? 'The storefront address as on the GBP' : 'Service area business: no address'),
      f('postcode', 'Postcode', nap.address ? (postcodeOf(nap.address).replace(/^(.+)(\d[A-Z]{2})$/, '$1 $2')) : ''),
      f('town', 'Town', view.base_town),
      f('service_areas', 'Service areas', (nap.service_areas || []).join(', ')),
      f('primary_category', 'Primary category', primary),
      f('categories', 'Other categories', secondaries.join(', ')),
      f('short_description', `Short description (${limits.short_description_max})`, description, limits.short_description_max, 'The opening of the GBP description'),
      f('description', `Description (${limits.description_max})`, description, limits.description_max, 'The GBP description'),
      f('services', 'Services', services.slice(0, 30).join(', '), null, services.length > 30 ? `${services.length} on the page map; the first 30` : ''),
      f('opening_hours', 'Opening hours', nap.hours),
      f('year_founded', 'Year established', cv.year_founded),
      f('facebook', 'Facebook', ctx.social.facebook),
      f('instagram', 'Instagram', ctx.social.instagram),
      f('onepassword_item', '1Password item name', (saved && saved.onepassword_item) || `${ctx.client.name} — ${dir.name}`, null, 'Save the login there, never in Copybot'),
    ];
    const downloads = [];
    notes.push('Logo and photos: they arrive by WhatsApp (the record\'s Photos and Logo section); Copybot stores none yet, so take them from the shared folder.');
    return { directory: { id: dir.id, name: dir.name, url: dir.url, verification_method: dir.verification_method, done_by: dir.done_by, cost: dir.cost, cost_text: dir.cost_text, notes: dir.notes, limits }, client: { id: clientId, name: ctx.client.name }, fields, downloads, notes, over: fields.filter(x => x.over).map(x => x.key) };
  }
  return { packFor, cut, DEFAULT_LIMITS };
}

module.exports = { createPacks, cut, DEFAULT_LIMITS };
