'use strict';

// ── The live tracker (10 Nov 2026, Brandon): for one client, what Copybot has done and
// what a person has to do next ────────────────────────────────────────────────────
// Pure rules over facts the dashboard already loads (ui/dashboard.js builds `f`); no
// query, no model, no outside call here. Two lists:
//   done   what Copybot did by itself or once started: { key, text, tab, at }
//   needs  what waits on a person now, in the order to do it: { key, text, tab, why }
// A person's step is listed only when the steps before it are finished, so the list is
// what can be done today, not everything left. `later` counts the steps not reachable yet.
// `next` is the first need, the one line the clients table shows.

const { stepsOf: onboardingSteps } = require('../ghl-onboarding/rules');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;

function trackerOf(f) {
  const done = [], needs = [];
  let later = 0;
  const did = (key, text, tab, at = null) => done.push({ key, text, tab, at });
  // ready false: the step exists but something before it is unfinished
  const need = (key, text, tab, why = '', ready = true) => { if (ready) needs.push({ key, text, tab, why }); else later++; };

  // ── The automation chain: a step that stopped or was refused comes first ──
  const auto = f.automation || { enabled: false, steps: [] };
  for (const s of auto.steps) {
    if (s.status === 'failed') need('auto_' + s.step, `Automation stopped at "${s.label}"`, s.tab || 'pages', `${s.error || ''} Press Try again once it is sorted.`.trim());
    // A monthly upkeep step that did not run: said once, for a month, and it comes round again by itself
    else if (s.status === 'skipped' && (!f.now || (new Date(f.now) - new Date(s.started_at)) / 86400000 < 31)) need('auto_' + s.step, `"${s.label}" did not run this month`, s.tab || 'pages', `${s.error || ''} Run it from the tab, or it is tried again next month.`.trim());
    else if (s.status === 'blocked' && s.error && !/already/i.test(s.error)) need('auto_' + s.step, `"${s.label}" is waiting: ${s.error}`, s.tab || 'pages', 'Automation tries again every 30 minutes.');
  }

  // ── Intake ──
  if (f.form_at) did('form', 'Onboarding form received and the record built', 'record', f.form_at);
  if (f.audio && f.audio.transcribed) did('transcripts', `${plural(f.audio.transcribed, 'voice answer')} transcribed`, 'record');
  if (f.prices === 'done') did('prices', 'Prices pulled from the prices recording', 'record');
  const ff = f.form_fill || { filled: 0, to_confirm: 0 };
  if (ff.filled) did('form_values', `${plural(ff.filled, 'record value')} filled from the form`, 'record');
  if (ff.to_confirm) need('form_confirm', `Confirm ${plural(ff.to_confirm, 'value')} read from the form's answers`, 'record', 'They are amber on the Record tab: Copybot read them out of a sentence.');
  // The form is missing answers the build needs: the drafted chase message, then quiet for 3 days once it is copied
  const g = f.form_gaps || { needed: 0, worth: 0 };
  if (g.needed) {
    const days = f.chased_at ? Math.floor(((f.now ? new Date(f.now) : new Date()) - new Date(f.chased_at)) / 86400000) : null;
    if (days === null) need('chase', `Send the client the chase message: ${plural(g.needed, 'needed answer')} missing`, 'record', 'Copybot has drafted it. Copy it and send it yourself.');
    else if (days >= 3) need('chase', `Chase the client again: ${plural(g.needed, 'needed answer')} still missing after ${plural(days, 'day')}`, 'record', 'The drafted message lists what is still missing.');
    else did('chased', `Chase message drafted and copied; waiting on the client for ${plural(g.needed, 'answer')}`, 'record', f.chased_at);
  }
  if (!f.niche_known) need('niche', 'Confirm the niche', 'clients', 'Nothing can be built until the client is in a niche.');
  if (f.audio && f.audio.failed) need('audio', `Retry ${plural(f.audio.failed, 'voice answer')} that failed to copy or transcribe`, 'record', 'Reprocess on the Fillout inbox row retries them.');
  if (f.prices === 'extraction_failed') need('prices', 'Retry the price extraction', 'record', 'The prices recording could not be read.');
  if (f.missing && f.missing.length) need('fields', `Fill in the record: ${f.missing.join(', ')}`, 'record', 'The pages cannot be written without these.', f.niche_known);
  if (f.from_form && !f.reviewed) need('reviewed', 'Read the record and mark it reviewed', 'record', '', f.niche_known);
  if (!f.place_id) need('place_id', 'Confirm the Google listing', 'record', 'The rank scans and the GBP checks need the place ID.', f.niche_known);
  const recordReady = f.niche_known && !(f.missing && f.missing.length);

  // ── Locations, research, page map ──
  if (f.locations_run) did('locations', 'Locations worked out: candidates, demand and tiers', 'locations', f.locations_run_at);
  if (!f.locations_run) need('locations_run', 'Run the locations', 'locations', 'Which towns get a page.', recordReady);
  else if (!f.locations_approved) need('locations_approve', 'Check the towns and approve the locations list', 'locations', 'We decide the towns: the client is not asked. Approving also builds the page map.');
  else if (f.locations_changed) need('locations_approve', 'Approve the locations list again', 'locations', 'A newer run exists than the one approved.');
  if (f.towns_researched) did('research', `${plural(f.towns_researched, 'town')} researched`, 'research');
  if (f.towns_without_dossier && f.towns_without_dossier.length) need('research', `Research ${plural(f.towns_without_dossier.length, 'town')}: ${f.towns_without_dossier.join(', ')}`, 'research', '', f.locations_approved);
  if (f.map_pages) did('page_map', `Page map built: ${plural(f.map_pages, 'page')} at launch`, 'page-map');
  else need('page_map', 'Generate the page map', 'page-map', '', recordReady && (f.locations_approved || !f.locations_run));

  // ── Pages ──
  const p = f.pages || { total: 0, written: 0, records: 0, claims: 0, blocked: 0, failed: 0, approved: 0 };
  if (f.pack_unverified) need('pack', 'Verify the trade facts pack', 'trade-facts', 'Service pages for this niche are refused until it is verified.');
  if (p.written) did('pages', `${p.written} of ${plural(p.total, 'page')} written clean`, 'pages', f.pages_at);
  const researched = !(f.towns_without_dossier && f.towns_without_dossier.length);
  if (p.total && p.records < p.total) need('write', `Write ${plural(p.total - p.records, 'page')}`, 'pages', '', researched);
  if (p.blocked) need('blocked', `Fix ${plural(p.blocked, 'blocked page')}`, 'pages', 'A BLOCK stops a page going out.');
  if (p.failed) need('failed', `Run ${plural(p.failed, 'failed page')} again`, 'pages');
  if (p.claims) need('claims', `Accept or reject ${plural(p.claims, 'claim')}`, 'pages', 'Each claim is something the copy says that is not on the record.');
  if (p.written > p.approved) need('approve', `Read, edit and approve ${plural(p.written - p.approved, 'page')}`, 'pages');
  const pagesDone = p.total > 0 && p.written === p.total;
  if (f.pushed) did('pushed', `${plural(f.pushed, 'page')} pushed to WordPress`, 'pages');
  else need('push', 'Push the homepage to WordPress', 'pages', 'Only the homepage and the legal pages can be pushed so far.', !!f.homepage_good);

  // ── GBP, posts, reviews ──
  if (f.gbp_done) did('gbp', 'GBP description, services and products written', 'gbp');
  else need('gbp', 'Generate the GBP output', 'gbp', '', pagesDone);
  if (f.prompts_done) did('prompts', 'Post prompts and photo folders set', 'gbp-posts');
  else need('prompts', 'Generate the post prompts', 'gbp-posts', '', recordReady && !!f.map_pages);
  const b = f.batches || { draft: 0, approved: 0 };
  if (b.draft) need('batch', `Read and approve ${plural(b.draft, 'post batch', 'post batches')}`, 'gbp-posts', 'Only approved posts are published.');
  if (b.approved) did('batches', `${plural(b.approved, 'post batch', 'post batches')} approved for publishing`, 'gbp-posts');
  const c = f.connection || null;
  if (!c || c.status !== 'connected') need('connect', 'Connect the Google profile for publishing', 'gbp-posts', '', !!f.prompts_done);
  else if (!c.publishing_on) need('publishing', 'Switch publishing on', 'gbp-posts', '', b.approved > 0);
  const pub = f.published || { posted: 0, failed: 0 };
  if (pub.posted) did('published', `${plural(pub.posted, 'post or photo', 'posts and photos')} published to Google`, 'gbp-posts');
  if (pub.failed) need('publish_failed', `Retry ${plural(pub.failed, 'failed post or photo', 'failed posts or photos')}`, 'gbp-posts');
  const r = f.reviews || { queued: 0, posted: 0 };
  if (r.posted) did('reviews', `${plural(r.posted, 'review reply', 'review replies')} posted`, 'reviews');
  if (r.queued) need('reviews', `Approve ${plural(r.queued, 'review reply', 'review replies')}`, 'reviews', 'A 1 to 3 star reply never posts without a person.');

  // ── Citations, rankings, the old site ──
  const ci = f.citations || { rows: 0, scanned: 0, listed: 0, to_submit: 0, waiting: 0 };
  if (ci.scanned) did('citations', `${plural(ci.scanned, 'directory', 'directories')} scanned, ${ci.listed} listed`, 'citations');
  else need('citations_scan', 'Scan the directories', 'citations', '', recordReady && !!f.place_id);
  if (ci.to_submit) need('citations_submit', `Submit ${plural(ci.to_submit, 'directory listing')}`, 'citations', 'Each row has its submission pack.');
  if (ci.waiting) need('citations_wait', `Finish ${plural(ci.waiting, 'listing')} waiting on an email or approval`, 'citations');
  if (f.has_scans) did('rank', 'Baseline rank scan run; the monthly scan repeats by itself', 'rankings');
  else need('rank', 'Run the baseline rank scan', 'rankings', 'It spends credits, so it asks first.', recordReady && !!f.place_id);
  if (f.existing_site !== false) {
    if (f.site_audit === 'ok') did('audit', 'Old site scanned and every URL decision approved', 'site-audit');
    else if (f.site_audit === 'wait') { did('audit_scan', 'Old site scanned and a decision suggested for every URL', 'site-audit'); need('audit', 'Approve the old site URL decisions', 'site-audit', 'The redirects are built from them.'); }
    else if (f.existing_site === true && f.site_audit !== 'run') need('audit_scan', 'Scan the old site', 'site-audit', '', recordReady);
  }

  // ── Onboarding answers from GHL (ghl-onboarding/rules.js stepsOf): nothing for a client with none ──
  // The step's Done button ticks it (`tick`); an access request the client is waiting for goes first.
  if (f.onboarding) {
    const ob = onboardingSteps(f.onboarding);
    for (const d of ob.done) did(d.key, d.text, 'record', d.at);
    for (const n of ob.needs) { const step = { key: n.key, text: n.text, tab: 'record', why: n.why, tick: n.kind, urgent: n.urgent || undefined }; if (n.urgent) needs.unshift(step); else needs.push(step); }
  }

  // A line Copybot did through the chain says so, with when (and the cost where the step knows it)
  const UPKEEP_DONE = { competitors: 'Google competitors checked again', citations: 'Directories scanned again', posts: 'Next post batch drafted' };
  const BY_STEP = { locations: 'locations', research: 'research', page_map: 'page_map', homepage: 'pages', category: 'pages', service: 'pages', location: 'pages', gbp: 'gbp', prompts: 'prompts' };
  for (const s of auto.steps) {
    if (s.status !== 'done') continue;
    const line = done.find(d => d.key === BY_STEP[s.step]);
    if (line && !line.auto) { line.auto = true; line.at = s.finished_at || line.at; if (s.detail) line.detail = s.detail; }
    else if (!BY_STEP[s.step]) done.push({ key: 'auto_' + s.step, text: UPKEEP_DONE[s.step] || s.label, tab: s.tab || 'pages', at: s.finished_at, auto: true, detail: s.detail || undefined });
  }

  return { done, needs, later, running: f.running || [], next: needs[0] || null, automation: { enabled: !!auto.enabled, waiting: auto.waiting || null, stopped: auto.steps.some(s => s.status === 'failed') } };
}

module.exports = { trackerOf };
