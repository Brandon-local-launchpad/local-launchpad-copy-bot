'use strict';
// Fixture: the live tracker (ui/tracker.js): what Copybot has done and what waits on a
// person, on a thin client, a mid build client and a finished one. Pure rules, no database.
// The dashboard fixture (ui-dashboard.js) covers the row that feeds it.
const path = require('path');
const { trackerOf } = require(path.join(__dirname, '../../ui/tracker.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the live tracker (done by Copybot, needs a person) ===\n');
const keys = list => list.map(x => x.key).join(',');

// A form just in, no niche: the only thing to do is confirm the niche; the rest is later
const fresh = trackerOf({ niche_known: false, from_form: true, reviewed: false, form_at: '2026-11-10T09:00:00Z', audio: { total: 9, transcribed: 9, failed: 0 }, prices: 'done', missing: [], place_id: false, existing_site: null });
chk('Fresh form: Copybot has the form, the transcripts and the prices', keys(fresh.done) === 'form,transcripts,prices', keys(fresh.done));
chk('Fresh form: the one step for a person is the niche; everything after waits', keys(fresh.needs) === 'niche' && fresh.next.key === 'niche' && fresh.later > 5, `${keys(fresh.needs)} later ${fresh.later}`);
chk('Fresh form: the transcripts line counts the answers', fresh.done[1].text === '9 voice answers transcribed', fresh.done[1].text);

// Niche known, fields missing: the record first, locations not offered yet
const thin = trackerOf({ niche_known: true, from_form: true, reviewed: false, form_at: 'x', audio: { total: 2, transcribed: 1, failed: 1 }, prices: 'extraction_failed', missing: ['no phone', 'no quote method'], place_id: false });
chk('Thin: the failed recording and the failed prices are for a person, then the record, the review, the listing', keys(thin.needs) === 'audio,prices,fields,reviewed,place_id', keys(thin.needs));
chk('Thin: the missing fields are named in the step', thin.needs[2].text === 'Fill in the record: no phone, no quote method', thin.needs[2].text);
chk('Thin: locations, the page map, citations and the rank scan are not offered until the record is ready', !thin.needs.some(n => ['locations_run', 'page_map', 'citations_scan', 'rank'].includes(n.key)), keys(thin.needs));

// Record ready: the locations run is next; once run, the approval; once approved, the research
const ready = { niche_known: true, from_form: true, reviewed: true, form_at: 'x', missing: [], place_id: true };
chk('Record ready: run the locations is offered', trackerOf(ready).needs.some(n => n.key === 'locations_run'), keys(trackerOf(ready).needs));
const run = trackerOf({ ...ready, locations_run: true, locations_run_at: 'x' });
chk('Locations run: Copybot did the working out, a person approves', run.done.some(d => d.key === 'locations') && run.needs[0].key === 'locations_approve', keys(run.needs));
const changed = trackerOf({ ...ready, locations_run: true, locations_approved: true, locations_changed: true });
chk('A newer run than the approval asks for the approval again', changed.needs[0].text === 'Approve the locations list again', changed.needs[0].text);

// Mid build: pages part written, claims, a blocked page, the pack, a town to research
const mid = trackerOf({ ...ready, locations_run: true, locations_approved: true, towns_researched: 1, towns_without_dossier: ['Romsey'], map_pages: 12, pack_unverified: true,
  pages: { total: 12, written: 5, records: 7, claims: 3, blocked: 1, failed: 1, approved: 2 }, homepage_good: true, pushed: 0, gbp_done: false, prompts_done: false, has_scans: false });
chk('Mid build: the town, the pack, the blocked and failed pages, the claims, the approvals, the push, in that order', keys(mid.needs).startsWith('research,pack,blocked,failed,claims,approve,push'), keys(mid.needs));
chk('Mid build: writing the rest waits on the research', !mid.needs.some(n => n.key === 'write'), keys(mid.needs));
chk('Mid build: approvals count the clean pages not yet approved (5 written, 2 approved)', mid.needs.find(n => n.key === 'approve').text === 'Read, edit and approve 3 pages', mid.needs.find(n => n.key === 'approve').text);
chk('Mid build: the GBP output waits for every page, the prompts only for the page map', !mid.needs.some(n => n.key === 'gbp') && mid.needs.some(n => n.key === 'prompts'), keys(mid.needs));
chk('Mid build: done lists the research, the page map and the pages', ['research', 'page_map', 'pages'].every(k => mid.done.some(d => d.key === k)) && mid.done.find(d => d.key === 'pages').text === '5 of 12 pages written clean', keys(mid.done));

// Posts, publishing, reviews, citations
const posts = trackerOf({ ...ready, locations_run: true, locations_approved: true, map_pages: 3, pages: { total: 3, written: 3, records: 3, claims: 0, blocked: 0, failed: 0, approved: 3 }, pushed: 1, gbp_done: true, prompts_done: true,
  batches: { draft: 1, approved: 2 }, connection: { status: 'connected', publishing_on: false }, published: { posted: 14, failed: 2 }, reviews: { queued: 2, posted: 6 },
  citations: { rows: 40, scanned: 40, listed: 12, to_submit: 20, waiting: 3 }, has_scans: true, existing_site: false });
chk('Posts: a draft batch to approve, publishing to switch on, two failures to retry, two review replies', keys(posts.needs) === 'batch,publishing,publish_failed,reviews,citations_submit,citations_wait', keys(posts.needs));
chk('Posts: Copybot published 14 and posted 6 replies', posts.done.find(d => d.key === 'published').text === '14 posts and photos published to Google' && posts.done.find(d => d.key === 'reviews').text === '6 review replies posted', '');
chk('A new build has no site audit step', !posts.needs.concat(posts.done).some(x => x.key.startsWith('audit')), '');
const noConn = trackerOf({ ...ready, map_pages: 3, prompts_done: true, connection: null });
chk('No connection and the prompts written: connect the Google profile', noConn.needs.some(n => n.key === 'connect'), keys(noConn.needs));

// The old site
const audit = trackerOf({ ...ready, existing_site: true, site_audit: 'wait' });
chk('An existing site scanned: Copybot suggested the decisions, a person approves them', audit.done.some(d => d.key === 'audit_scan') && audit.needs.some(n => n.key === 'audit'), '');
chk('An existing site not scanned: scan it', trackerOf({ ...ready, existing_site: true, site_audit: 'none' }).needs.some(n => n.key === 'audit_scan'), '');

// Finished: nothing for a person
const fin = trackerOf({ ...ready, locations_run: true, locations_approved: true, towns_researched: 2, towns_without_dossier: [], map_pages: 3, pages: { total: 3, written: 3, records: 3, claims: 0, blocked: 0, failed: 0, approved: 3 }, pushed: 3, gbp_done: true, prompts_done: true,
  batches: { draft: 0, approved: 1 }, connection: { status: 'connected', publishing_on: true }, citations: { rows: 10, scanned: 10, listed: 10, to_submit: 0, waiting: 0 }, has_scans: true, existing_site: false, running: [{ kind: 'research' }] });
chk('Finished: nothing for a person, nothing later, next is null, the running list passed through', fin.needs.length === 0 && fin.later === 0 && fin.next === null && fin.running.length === 1, `${keys(fin.needs)} later ${fin.later}`);
chk('Every step names a tab', [fresh, thin, mid, posts, fin].every(t => t.done.concat(t.needs).every(x => x.tab && x.text)), '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
