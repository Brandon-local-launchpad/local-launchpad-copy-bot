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
const { tag: tagOwners, handStepsOf, taskSteps, stageOf } = require('../team/rules');
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
  if (!f.place_id) need('place_id', 'Confirm the Google listing', 'record', 'The rank scans, the GBP checks and the Google link on the Review Us page need the place ID.', f.niche_known);
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
  // ── The site build (the task board, stage 3; 14 Nov 2026): the staging site, its pages, the copy, the images, the
  // legal pages. Only for a client loaded with these facts (f.site_build); without them, the one push line as before. ──
  const sb = f.site_build || null;
  if (!sb) {
    if (f.pushed) did('pushed', `${plural(f.pushed, 'page')} pushed to WordPress`, 'pages');
    else need('push', 'Push the homepage to WordPress', 'pages', 'Only the homepage and the legal pages can be pushed so far.', !!f.homepage_good);
  } else {
    if (sb.connected) did('site_connect', 'Staging site connected to Copybot', 'pages');
    else need('site_connect', 'Build the staging site from the template and connect it to Copybot', 'pages', 'The plugin installed, the field groups in, the site saved on the Pages tab.', !!f.map_pages);
    const made = Math.min(sb.created, sb.inner_total);
    if (made) did('site_pages', `${made} of ${plural(sb.inner_total, 'page')} made on the staging site`, 'pages');
    if (made < sb.inner_total) need('site_pages', `Create ${plural(sb.inner_total - made, 'page')} on the staging site`, 'pages', 'Pages on the site, on the Pages tab: Check the site, then Create.', sb.connected);
    if (sb.pushed) did('pushed', `The copy of ${plural(sb.pushed, 'page')} pushed to the staging site`, 'pages');
    if (sb.to_push) need('push', `Push the copy of ${plural(sb.to_push, 'approved page')} to the staging site`, 'pages', 'Pages on the site, on the Pages tab: Check the copy, then Push the copy.', sb.connected);
    const imgLeft = Math.max(0, p.total - sb.images_approved), toPlace = Math.max(0, sb.images_approved - sb.images_placed);
    if (sb.images_approved) did('images', `Images approved for ${plural(sb.images_approved, 'page')}`, 'images');
    if (p.total && imgLeft) need('images_approve', `Pick and approve the images for ${plural(imgLeft, 'page')}`, 'images', 'Check the picks, fill the gaps, then approve each page.', sb.pushed > 0);
    if (sb.images_placed) did('images_placed', `Images placed on ${plural(sb.images_placed, 'page')}`, 'images');
    if (toPlace) need('images_place', `Place the images of ${plural(toPlace, 'approved page')} on the staging site`, 'images', 'Staging only, behind a confirm.');
    if (sb.legal_pushed >= 3) did('legal', 'The three legal pages pushed', 'record');
    else need('legal', 'Push the three legal pages', 'record', 'Record tab, Legal pages: all three or none. A hold there says what is missing.', sb.connected && recordReady);
  }

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

  // The Review Us page (review-funnel/): its settings go to the site once it is connected and there is a Google
  // link to send; feedback that did not reach the client waits for a person to pass it on
  const rf = f.review_funnel || null;
  if (rf) {
    if (rf.sent_at) did('review_page', 'Review Us page set up on the site', 'reviews', rf.sent_at);
    else need('review_page', 'Set up the Review Us page on the site', 'reviews', 'It sends 4 and 5 star customers to Google, and 1 to 3 star feedback to the client in private.', !!rf.site && !!rf.link);
    if (rf.received > rf.unsent) did('feedback', `${plural(rf.received - rf.unsent, 'private feedback message')} passed to the client`, 'reviews');
    if (rf.unsent) need('feedback_unsent', `Pass on ${plural(rf.unsent, 'private feedback message')} the client has not had`, 'reviews', 'The email to the client did not send, or there is no email on their record.');
  }

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

  // The migration's last steps (stage 3): the redirects, the pre launch check, the launch. Copybot runs the day 7 check itself.
  const mg = f.migration || null;
  if (mg && f.existing_site !== false && f.site_audit === 'ok') {
    if (mg.redirects_pushed) did('redirects', 'Redirects pushed to the staging site', 'site-audit');
    else need('redirects', 'Push the redirects to the staging site', 'site-audit', 'Dry run first: they go into Rank Math.', !!(sb && sb.connected));
    if (mg.pre_launch === 'ok') did('pre_launch', 'Pre launch check passed', 'site-audit');
    else need('pre_launch', mg.pre_launch === 'block' ? 'Fix what the pre launch check blocked, then run it again' : 'Run the pre launch check and the staging test', 'site-audit', 'Nothing launches with a block.', mg.redirects_pushed);
  }
  if (mg && mg.launched_at) did('launched', 'Site launched: every old URL checked on the live domain', 'site-audit', mg.launched_at);
  if (mg && mg.day7_at) did('day7', 'Day 7 check run', 'site-audit', mg.day7_at);

  // The review and referral cards (stage 3): the brief copied, then the four sign off ticks on the Cards tab, in order.
  // Given makes the files; Brandon gets the client's approval and places the order (team/owners.json).
  if (f.cards) {
    const so = f.cards.signoff || {}, at = k => (so[k] && so[k].at) || null;
    let open = recordReady && !!f.place_id;
    const step = (doneNow, doneKey, doneText, when, needIt) => { if (doneNow) did(doneKey, doneText, 'cards', when); else { needIt(open); open = false; } };
    step(!!f.cards.copied_at || !!so.proofs_sent, 'cards_brief_done', 'Cards brief copied for Claude', f.cards.copied_at, ok => need('cards_brief', 'Fill in the cards brief, copy it and make the cards in Claude', 'cards', 'The brief is built from the record: fill what the bar lists.', ok));
    step(!!so.proofs_sent, 'cards_proofs_done', 'Card proofs sent', at('proofs_sent'), ok => need('cards_proofs', 'Check the card proofs and send them to Brandon', 'cards', 'Scan every QR code with a phone, then tick Proofs sent to client.', ok));
    step(!!so.client_approved, 'cards_approval_done', 'Client approved the cards', at('client_approved'), ok => need('cards_approval', 'Get the client\'s approval of the card proofs', 'cards', 'Then tick Client approved on the Cards tab.', ok));
    step(!!so.pdfs_exported, 'cards_export_done', 'Card print files exported', at('pdfs_exported'), ok => need('cards_export', 'Export the card print files and send them to Brandon', 'cards', 'Guides off, then tick Both PDFs exported.', ok));
    step(!!so.sent_to_printer, 'cards_order_done', 'Cards sent to the printer', at('sent_to_printer'), ok => need('cards_order', 'Order the cards from the printer', 'cards', 'Then tick Sent to printer.', ok));
  }

  // ── Onboarding answers from GHL (ghl-onboarding/rules.js stepsOf): nothing for a client with none ──
  // The step's Done button ticks it (`tick`); an access request the client is waiting for goes first.
  if (f.onboarding) {
    const ob = onboardingSteps(f.onboarding);
    for (const d of ob.done) did(d.key, d.text, 'record', d.at);
    for (const n of ob.needs) { const step = { key: n.key, text: n.text, tab: 'record', why: n.why, tick: n.kind, urgent: n.urgent || undefined }; if (n.urgent) needs.unshift(step); else needs.push(step); }
  }

  // ── The task board, stage 2 (team/): the steps done outside Copybot, each opened by what comes before it and ticked
  // Done by a person, and the one off tasks added on the client. Nothing for a client loaded without them (f.hand). ──
  if (f.hand) {
    const hs = handStepsOf({ record: recordReady, place_id: !!f.place_id, locations: !!f.locations_approved, page_map: !!f.map_pages, pages: pagesDone, pushed: !!(sb ? sb.pushed : f.pushed), site: !!(sb && sb.connected), gbp: !!f.gbp_done, prompts: !!f.prompts_done }, f.hand.ticks || {});
    for (const d of hs.done) done.push(d);
    for (const n of hs.needs) needs.push(n);
    later += hs.later;
  }
  for (const t of taskSteps(f.tasks, f.now)) needs.push(t);

  // A line Copybot did through the chain says so, with when (and the cost where the step knows it)
  const UPKEEP_DONE = { competitors: 'Google competitors checked again', citations: 'Directories scanned again', posts: 'Next post batch drafted' };
  const BY_STEP = { locations: 'locations', research: 'research', page_map: 'page_map', homepage: 'pages', category: 'pages', service: 'pages', location: 'pages', gbp: 'gbp', prompts: 'prompts' };
  for (const s of auto.steps) {
    if (s.status !== 'done') continue;
    const line = done.find(d => d.key === BY_STEP[s.step]);
    if (line && !line.auto) { line.auto = true; line.at = s.finished_at || line.at; if (s.detail) line.detail = s.detail; }
    else if (!BY_STEP[s.step]) done.push({ key: 'auto_' + s.step, text: UPKEEP_DONE[s.step] || s.label, tab: s.tab || 'pages', at: s.finished_at, auto: true, detail: s.detail || undefined });
  }

  // The task board (team/rules.js): who does each step, and the SOP it is done from
  tagOwners(needs);
  // The boards (team/board.json): the stage a finished line sits under on its client's board
  for (const d of done) { const stage = stageOf(d); if (stage) d.stage = stage; }

  return { done, needs, later, running: f.running || [], next: needs[0] || null, automation: { enabled: !!auto.enabled, waiting: auto.waiting || null, stopped: auto.steps.some(s => s.status === 'failed') } };
}

module.exports = { trackerOf };
