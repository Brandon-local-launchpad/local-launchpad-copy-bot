'use strict';
// Fixture: hand edits to a v20 homepage (slice 5). Locked fields, the "facts the
// page was written from" check, the validator on the edited page, the claims review
// with acceptances carried over and "new on unchanged text", the original version
// left untouched, and the push's claims check on an edited version. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { validateV20 } = require(path.join(root, 'validate-v20.js'));
const Ed = require(path.join(root, 'v20-edit.js'));
const { versionOf } = require(path.join(root, 'v20-record.js'));
const { claimsRefusals } = require(path.join(root, 'wp/push.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const throwsMsg = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
console.log('\n=== FIXTURE: v20 hand edits ===\n');

(async () => {
  // The facts as they stand now, and a record written from the same facts
  const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
  const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
  const DR = computeDecisions({ cv: E.cv, niche: landscaper, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true,
    allocationData: A.resolveAllocatedItems(reply.homepage, parsed) });
  const D = DR.decisions;
  const current = {
    V: G.validationContextFor({ cv: E.cv, niche: landscaper, decisions: D, keyValueMap: E.keyValueMap }),
    clientValues: G.clientValueMap(E.cv, D.d1_years_trading),
    decisionsBlock: DR.decisionsBlock,
  };
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'), 'utf8'));
  base.meta = { ...base.meta, client_values: current.clientValues, decisions_block: DR.decisionsBlock };
  const FAQ4 = 'faq_answer (How soon can you start?)', STEP2 = 'step_body (We Visit and Price the Job)', HERO = 'home_hero_intro', CB = 'home_content_block_body';
  const text = (r, label) => Ed.editableFields(r).find(f => f.field === label).text;
  const qFaq4 = 'We can usually start the same week.';
  const qStep = text(base, STEP2).split('.')[0] + '.';
  const qHero = text(base, HERO).split(',')[0];
  base.CLAIMS = { for: versionOf(base), status: 'needs acceptance', first_review: 2, rounds: [],
    findings: [{ field: FAQ4, quote: qFaq4, why: 'usually' }, { field: STEP2, quote: qStep, why: 'visit' }] };
  const frozen = JSON.stringify(base);
  const baseIssues = validateV20(base, current.V);
  const blocksOn = (issues, field) => issues.filter(i => i.type === 'BLOCK' && i.field === field).length;

  // ── Editable fields ──
  const ef = Ed.editableFields(base);
  chk('Editable fields: the model prose only, in page order, with word ranges', ef[0].field === HERO && ef.some(f => f.field === FAQ4) && !ef.some(f => /h1|_h2|faq_question|card_name/.test(f.field)) && ef.find(f => f.field === CB).range.min === 200, ef.map(f => f.field).slice(0, 3).join(', '), 'hero first, no headings');

  const edit = (edits, extra = {}) => Ed.editRecord({ record: base, isLatest: true, edits, current, review: async () => ({ findings: [], at: 'x' }), ...extra });

  // ── Refusals ──
  chk('Locked field (H1) refused', /set by code/.test(await throwsMsg(() => edit([{ field: 'home_hero_h1', text: 'Best Landscaper' }]))), '', 'refused');
  chk('A FAQ question refused', /set by code/.test(await throwsMsg(() => edit([{ field: 'faq_question', text: 'x' }]))), '', 'refused');
  chk('No change refused', /Nothing changed/.test(await throwsMsg(() => edit([{ field: HERO, text: text(base, HERO) + '  ' }]))), '', 'refused');
  chk('Not the latest version refused', /newer version/.test(await throwsMsg(() => edit([{ field: HERO, text: 'x' }], { isLatest: false }))), '', 'refused');
  chk('Client values changed since: refused', /Regenerate/.test(await throwsMsg(() => edit([{ field: HERO, text: 'x' }], { current: { ...current, clientValues: { ...current.clientValues, start_time: 'next month' } } }))), '', 'refused');
  chk('Page decisions changed since: refused', /Regenerate/.test(await throwsMsg(() => edit([{ field: HERO, text: 'x' }], { current: { ...current, decisionsBlock: DR.decisionsBlock + '\nX' } }))), '', 'refused');
  chk('Old record without stored values: refused', /Regenerate/.test(await throwsMsg(() => edit([{ field: HERO, text: 'x' }], { record: { ...base, meta: { ...base.meta, client_values: undefined } } }))), '', 'refused');
  chk('Blocked record refused', /gates/.test(await throwsMsg(() => edit([{ field: HERO, text: 'x' }], { record: { ...base, blocked: true } }))), '', 'refused');

  // ── Validator on the edited page ──
  const dashed = text(base, 'home_final_cta_body').replace(/\.$/, ' — today.');
  let r = await edit([{ field: 'home_final_cta_body', text: dashed }]);
  chk('An edit that adds a dash: BLOCK 1a on that field, validated as a hand edit', r.record.VALIDATION.source === 'hand edit' && r.record.VALIDATION.issues.some(i => i.check === '1a' && i.field === 'home_final_cta_body') && r.record.VALIDATION.block === baseIssues.filter(i => i.type === 'BLOCK').length + 1, JSON.stringify(r.record.VALIDATION.issues.filter(i => i.type === 'BLOCK')), '+1 BLOCK');
  chk('The edit is a new version: edited_at, the changed fields, history; nothing else changed', r.record.meta.edited_at && r.changed.join() === 'home_final_cta_body' && r.record.meta.edit_history.length === 1 && r.record.home_hero_h1 === base.home_hero_h1 && r.record.home_final_cta_body === dashed, JSON.stringify(r.record.meta.edit_history), 'one edit');
  chk('The original version is untouched', JSON.stringify(base) === frozen, '', 'same');
  chk('CLAIMS sits after VALIDATION and is for the edited version', Object.keys(r.record).indexOf('CLAIMS') === Object.keys(r.record).indexOf('VALIDATION') + 1 && r.record.CLAIMS.for === r.record.meta.edited_at && r.record.CLAIMS.status === 'clear', JSON.stringify(r.record.CLAIMS).slice(0, 100), 'after VALIDATION');
  // and editing that version again to clear it
  const r2 = await Ed.editRecord({ record: r.record, isLatest: true, edits: [{ field: 'home_final_cta_body', text: text(base, 'home_final_cta_body') }], current, review: async () => ({ findings: [] }) });
  chk('An edit that clears the BLOCK: back to the original count, history of 2', blocksOn(validateV20(r2.record, current.V), 'home_final_cta_body') === blocksOn(baseIssues, 'home_final_cta_body') && r2.record.VALIDATION.block === baseIssues.filter(i => i.type === 'BLOCK').length && r2.record.meta.edit_history.length === 2, String(r2.record.VALIDATION.block), String(baseIssues.filter(i => i.type === 'BLOCK').length));
  chk('No automatic retries on a hand edit', r.record.VALIDATION.retries.length === 0, '', 'none');

  // ── Claims: carry over, "new on unchanged text", edited fields ──
  const prevAccepted = Ed.withAccepted(base, [qFaq4]);
  chk('Accepting a quote that isn\'t a finding: refused', /Not a finding/.test(await throwsMsg(async () => Ed.withAccepted(base, ['made up']))), '', 'refused');
  const newCb = text(base, CB).replace('Gardens in Southampton vary widely.', 'Every Southampton garden is different, and we have seen them all.');
  const review = async () => ({ at: 'now', model: 'm', findings: [
    { field: FAQ4, quote: qFaq4, why: 'usually' },            // accepted before, field untouched → carried
    { field: STEP2, quote: qStep, why: 'visit' },        // found before, not accepted → still needs a tick
    { field: HERO, quote: qHero, why: 'new' },                // untouched field, not found before → new on unchanged text
    { field: CB, quote: 'we have seen them all', why: 'x' },  // on the edited field
  ] });
  r = await Ed.editRecord({ record: prevAccepted, isLatest: true, edits: [{ field: CB, text: newCb }], current, review });
  const by = q => r.record.CLAIMS.findings.find(f => f.quote === q);
  chk('Accepted on the previous version, same quote, field untouched: carried over', by(qFaq4).carried === true && r.record.CLAIMS.accepted.length === 1 && r.record.CLAIMS.accepted[0].quote === qFaq4 && r.record.CLAIMS.accepted[0].carried_from === versionOf(base), JSON.stringify(r.record.CLAIMS.accepted), 'FAQ 4 carried');
  chk('Found before but not accepted: still needs a tick, no note', !by(qStep).carried && !by(qStep).note, JSON.stringify(by(qStep)), 'plain');
  chk('New finding on an untouched field: marked "new on unchanged text"', by(qHero).note === Ed.NEW_ON_UNCHANGED && !by(qHero).carried, JSON.stringify(by(qHero)), 'note');
  chk('Finding on the edited field: marked as on the edited field, never carried', by('we have seen them all').on_edited_field === true && !by('we have seen them all').note, JSON.stringify(by('we have seen them all')), 'on edited');
  chk('Status: needs acceptance while any finding is unticked', r.record.CLAIMS.status === 'needs acceptance' && r.record.CLAIMS.source === 'hand edit', r.record.CLAIMS.status, 'needs acceptance');
  // the same quote, accepted before, but its field was edited: not carried
  const editedFaq = text(base, FAQ4).replace('Call', 'Ring');
  r = await Ed.editRecord({ record: prevAccepted, isLatest: true, edits: [{ field: FAQ4, text: editedFaq }], current, review: async () => ({ findings: [{ field: FAQ4, quote: qFaq4, why: 'usually' }] }) });
  chk('Accepted quote on a field that was edited: not carried, needs a new tick', !r.record.CLAIMS.findings[0].carried && r.record.CLAIMS.accepted.length === 0 && r.record.CLAIMS.status === 'needs acceptance', JSON.stringify(r.record.CLAIMS.findings[0]), 'not carried');
  // ticks sent with the save are saved on the previous version first
  r = await Ed.editRecord({ record: base, isLatest: true, accepted: [qFaq4, qStep], edits: [{ field: CB, text: newCb }], current, review: async () => ({ findings: [{ field: FAQ4, quote: qFaq4, why: 'u' }, { field: STEP2, quote: qStep, why: 'v' }] }) });
  chk('Ticks sent with the save: saved on the previous version, and every finding carried → "accepted"', r.previous.CLAIMS.accepted.length === 2 && r.record.CLAIMS.status === 'accepted' && r.record.CLAIMS.accepted.length === 2, JSON.stringify({ prev: r.previous.CLAIMS.accepted.length, st: r.record.CLAIMS.status }), 'accepted');
  chk('… and the original object is still untouched', JSON.stringify(base) === frozen, '', 'same');
  // a failed review never loses the edit
  r = await Ed.editRecord({ record: base, isLatest: true, edits: [{ field: CB, text: newCb }], current, review: async () => { throw new Error('overloaded'); } });
  chk('Claims review fails: the edit is kept, CLAIMS failed', r.record.home_content_block_body === newCb && r.record.CLAIMS.status === 'failed' && /overloaded/.test(r.record.CLAIMS.error), JSON.stringify(r.record.CLAIMS), 'failed');

  // ── The push's claims check on an edited version ──
  r = await Ed.editRecord({ record: base, isLatest: true, edits: [{ field: CB, text: newCb }], current, review: async () => ({ findings: [{ field: FAQ4, quote: qFaq4, why: 'u' }] }) });
  chk('Push check: the edited version\'s own review is accepted when ticked', claimsRefusals(r.record, r.record.CLAIMS, true).length === 0, JSON.stringify(claimsRefusals(r.record, r.record.CLAIMS, true)), 'none');
  chk('Push check: the previous version\'s review on the edited version is refused', /different version/.test(claimsRefusals(r.record, base.CLAIMS, true).join(' ')), '', 'refused');
  chk('Push check: failed review refused', /failed/.test(claimsRefusals(r.record, { for: versionOf(r.record), status: 'failed', findings: [] }, true).join(' ')), '', 'refused');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
