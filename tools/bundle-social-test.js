'use strict';
// The first real bundle.social test, one step per command. Nothing touches Copybot's database.
// The key comes from BUNDLE_SOCIAL_API_KEY in the main checkout's .env (or the environment) and is
// never printed. Every reply is saved under tests/quality-runs/bundle-social-test/ (gitignored).
//
//   node tools/bundle-social-test.js list              the source teams and their locations
//   node tools/bundle-social-test.js connect "<loc>"   a "Copybot test" team on that location, read back
//   node tools/bundle-social-test.js schedule-cancel   a post a week ahead with a photo, read back, cancelled
//
// Steps that would put anything on Google are not here yet: each is added only after Brandon's yes.

const fs = require('fs');
const path = require('path');
const { BASE } = require('../publisher/bundle-social');
const { SOURCE_TEAMS } = require('../publisher/index');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/quality-runs/bundle-social-test');
// --team <name>: a separate test team and state file ("--team Edens Edge" → team "Copybot test Edens Edge"),
// so one test never touches another's team or posts
const TEAM_ARG = process.argv.includes('--team') ? process.argv[process.argv.indexOf('--team') + 1] : '';
const STATE = path.join(OUT, TEAM_ARG ? `state-${TEAM_ARG.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json` : 'state.json');
const TEST_TEAM = TEAM_ARG ? `Copybot test ${TEAM_ARG}` : 'Copybot test';
const TYPE = 'GOOGLE_BUSINESS';

function loadKey() {
  if (process.env.BUNDLE_SOCIAL_API_KEY) return process.env.BUNDLE_SOCIAL_API_KEY.trim();
  for (const dir of [ROOT, path.resolve(ROOT, '../../..')]) {
    const f = path.join(dir, '.env');
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*BUNDLE_SOCIAL_API_KEY\s*=\s*(.*)$/);
      if (m && m[1].trim()) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  throw new Error('BUNDLE_SOCIAL_API_KEY is not in .env');
}
const KEY = loadKey();
const hide = s => String(s).split(KEY).join('[hidden]');
fs.mkdirSync(OUT, { recursive: true });
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
let n = 0;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

async function call(method, p, { body, form } = {}) {
  const headers = { 'x-api-key': KEY };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${p}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  const file = path.join(OUT, `${stamp}-${String(++n).padStart(2, '0')}-${method}-${p.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.json`);
  fs.writeFileSync(file, hide(JSON.stringify({ method, path: p, body: body || (form ? '[form]' : null), status: res.status, data }, null, 2)));
  console.log(`${method} ${p} -> ${res.status}`);
  if (!res.ok) { const e = new Error(hide(`bundle.social said ${res.status}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 600)}`)); e.status = res.status; throw e; }
  return data;
}
const show = (label, v) => console.log(`\n${label}:\n${hide(JSON.stringify(v, null, 2))}`);

async function allTeams() {
  const out = [];
  for (let page = 0; page < 20; page++) {
    const d = await call('GET', `/team/?offset=${page * 50}&limit=50`);
    out.push(...(d.items || []));
    if (out.length >= (d.total || 0) || !(d.items || []).length) break;
  }
  return out;
}

async function list() {
  const teams = await allTeams();
  console.log(`\n${teams.length} team(s) on the account: ${teams.map(t => `"${t.name}"`).join(', ')}`);
  for (const name of SOURCE_TEAMS) {
    const t = teams.find(x => x.name === name);
    if (!t) { console.log(`\n"${name}": NOT FOUND on the account`); continue; }
    const accounts = (t.socialAccounts || []).map(a => ({ type: a.type, id: a.id, username: a.username, displayName: a.displayName, externalId: a.externalId, deleteOn: a.deleteOn }));
    show(`"${name}" (team ${t.id}) accounts`, accounts);
    try {
      const acc = await call('POST', '/social-account/refresh-channels', { body: { type: TYPE, teamId: t.id } });
      show(`"${name}" locations`, (acc.channels || []).map(c => ({ channel_id: c.id, name: c.name, username: c.username, address: c.address })));
      show(`"${name}" Google account fields after refresh (keys only, then ids)`, { keys: Object.keys(acc), id: acc.id, externalId: acc.externalId, username: acc.username, displayName: acc.displayName });
    } catch (e) { console.log(`"${name}": ${e.message}`); }
  }
}

async function connect(locName) {
  if (!locName) throw new Error('Name the location: connect "<part of its name>"');
  const teams = await allTeams();
  const source = teams.find(t => t.name === 'Local Launchpad');
  if (!source) throw new Error('No "Local Launchpad" team');
  const acc = await call('POST', '/social-account/refresh-channels', { body: { type: TYPE, teamId: source.id } });
  const matches = (acc.channels || []).filter(c => `${c.name} ${c.address || ''}`.toLowerCase().includes(locName.toLowerCase()));
  if (matches.length !== 1) { show('Locations matching', matches.map(c => ({ id: c.id, name: c.name, address: c.address }))); throw new Error(`Need exactly one location matching "${locName}", found ${matches.length}`); }
  const loc = matches[0];
  console.log(`\nLocation: ${loc.name} (${loc.id})`);
  let team = teams.find(t => t.name === TEST_TEAM);
  if (team) console.log(`Team "${TEST_TEAM}" already exists (${team.id}), reusing it`);
  else { team = await call('POST', '/team/', { body: { name: TEST_TEAM } }); console.log(`Created team "${TEST_TEAM}" (${team.id})`); }
  let mine = await call('GET', `/social-account/by-type?type=${TYPE}&teamId=${encodeURIComponent(team.id)}`).catch(e => { if (e.status === 404 || (e.status === 400 && /does not have/.test(e.message))) return null; throw e; });
  if (!mine || !mine.id) { show('Copy', await call('POST', '/social-account/copy', { body: { fromTeamId: source.id, toTeamId: team.id, socialAccountTypes: [TYPE] } })); }
  else console.log('The test team already has a Google account, not copying again');
  mine = await call('GET', `/social-account/by-type?type=${TYPE}&teamId=${encodeURIComponent(team.id)}`);
  if (mine.externalId !== loc.id || process.argv.includes('--reselect')) {
    if (mine.externalId) { const u = await call('POST', '/social-account/unset-channel', { body: { type: TYPE, teamId: team.id } }); console.log(`After unset, externalId: ${u.externalId}`); }
    const set = await call('POST', '/social-account/set-channel', { body: { type: TYPE, teamId: team.id, channelId: loc.id } });
    console.log(`After set, externalId: ${set.externalId}`);
  } else console.log('The copy is already on this location, nothing to set');
  mine = await call('GET', `/social-account/by-type?type=${TYPE}&teamId=${encodeURIComponent(team.id)}`);
  show('Read back: the test team\'s Google account', mine);
  const holders = Object.entries(mine).filter(([, v]) => v === loc.id).map(([k]) => k);
  console.log(`\nFields holding the location id ${loc.id}: ${holders.length ? holders.join(', ') : 'NONE'}`);
  console.log(`checkAccount reads externalId: ${mine.externalId === loc.id ? 'MATCHES' : `does NOT match (${mine.externalId})`}`);
  Object.assign(state, { team_id: team.id, source_team_id: source.id, channel_id: loc.id, location: loc.name });
  saveState();
}

async function scheduleCancel() {
  if (!state.team_id) throw new Error('Run connect first');
  const photo = fs.readFileSync(path.join(ROOT, 'public/logo.png'));
  const form = new FormData();
  form.append('teamId', state.team_id);
  form.append('file', new Blob([photo], { type: 'image/png' }), 'copybot-test.png');
  const up = await call('POST', '/upload/', { form });
  console.log(`Uploaded: ${up.id}`);
  const when = new Date(Date.now() + 7 * 86400000); when.setUTCHours(10, 0, 0, 0);
  const ref = `copybot-test-${Date.now()}`;
  const post = await call('POST', '/post/', { body: { teamId: state.team_id, title: 'Copybot test, to be cancelled', postDate: when.toISOString(), status: 'SCHEDULED', socialAccountTypes: [TYPE], referenceKey: ref, data: { [TYPE]: { text: 'Copybot test post. This is cancelled before its date and never goes out.', uploadIds: [up.id], topicType: 'STANDARD', callToActionType: 'LEARN_MORE', callToActionUrl: 'https://locallaunchpad.co.uk' } } } });
  show('Created', { id: post.id, status: post.status, postDate: post.postDate });
  const byRef = await call('GET', `/post/reference-key/${encodeURIComponent(ref)}`);
  console.log(`Found by reference key: ${byRef.id === post.id ? 'yes' : 'NO'}`);
  const read = await call('GET', `/post/${post.id}`);
  show('Read back', { status: read.status, postDate: read.postDate, errors: read.errors });
  await call('DELETE', `/post/${post.id}`);
  const after = await call('GET', `/post/${post.id}`).catch(e => ({ status: `HTTP ${e.status}` }));
  show('After cancel', { status: after.status });
  const refAfter = await call('GET', `/post/reference-key/${encodeURIComponent(ref)}`).catch(e => ({ status: `HTTP ${e.status}` }));
  show('Reference key after cancel', { id: refAfter.id, status: refAfter.status });
}

// ── Public steps: Copybot's own publisher code, each only with --yes-public after Brandon's yes ──
const { createBundlePublisher } = require('../publisher/bundle-social');
const pub = () => createBundlePublisher({ apiKey: KEY, log: { error: m => console.error(hide(m)), log: () => {} } });
const needYes = () => {
  if (!process.argv.includes('--yes-public')) throw new Error('This step goes public: add --yes-public, only after Brandon says yes');
  if (!state.team_id) throw new Error('Run connect first');
};

async function postPublic() {
  needYes();
  const p = pub();
  const check = await p.checkAccount({ teamId: state.team_id, channelId: state.channel_id });
  if (!check.ok) throw new Error(check.reason);
  const photo = fs.readFileSync(path.join(ROOT, 'public/logo.png'));
  const uploadId = await p.uploadPhoto({ teamId: state.team_id, bytes: photo, filename: 'local-launchpad.png', mime: 'image/png' });
  const when = { postAt: new Date(Date.now() + 15 * 60000).toISOString() };
  const post = {
    seq: 1, prompt_label: 'Copybot test post', topic: 'STANDARD', cta_type: 'LEARN_MORE', cta_url: 'https://locallaunchpad.co.uk',
    body: 'Local Launchpad builds websites and Google Business Profiles for UK tradespeople, so the people searching for your trade in your area can find you and get in touch. If you run a trade business and want more of your local work to come from Google, have a look at what we do.',
  };
  const made = await p.schedulePost({ teamId: state.team_id, post, uploadId, referenceKey: `copybot-test-public-${Date.now()}`, when });
  state.public_post = { id: made.id, at: when.postAt };
  saveState();
  show('Scheduled to go public', { id: made.id, status: made.status, at: when.postAt });
}

// Step 5: an Offer post, its words read from a JSON file Brandon approved word for word:
//   { "title", "body", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "redeem_url" (optional) }
// Kept apart from step 4's post (state.offer_post), so removing one never touches the other.
async function offerPublic(file) {
  needYes();
  if (!file) throw new Error('Give the approved offer file: offer-public <file> --yes-public');
  const o = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  for (const k of ['title', 'body', 'start', 'end']) if (!String(o[k] || '').trim()) throw new Error(`The offer file has no ${k}`);
  const p = pub();
  const check = await p.checkAccount({ teamId: state.team_id, channelId: state.channel_id });
  if (!check.ok) throw new Error(check.reason);
  const photo = fs.readFileSync(path.join(ROOT, 'public/logo.png'));
  const uploadId = await p.uploadPhoto({ teamId: state.team_id, bytes: photo, filename: 'local-launchpad.png', mime: 'image/png' });
  const { ukToUtc } = require('../publisher/service');
  const when = { postAt: new Date(Date.now() + 15 * 60000).toISOString(), offerStart: ukToUtc(o.start), offerEnd: ukToUtc(o.end) };
  const post = { seq: 2, prompt_label: 'Copybot test offer', topic: 'OFFER', offer_title: o.title, offer_redeem_url: o.redeem_url || undefined, body: o.body };
  const made = await p.schedulePost({ teamId: state.team_id, post, uploadId, referenceKey: `copybot-test-offer-${Date.now()}`, when });
  state.offer_post = { id: made.id, at: when.postAt };
  saveState();
  show('Offer scheduled to go public', { id: made.id, status: made.status, at: when.postAt, start: when.offerStart, end: when.offerEnd });
}

// An Offer post as a bundle.social DRAFT: never published. Built with Copybot's own builder (postData), read
// back to see what bundle.social kept, then deleted. Proves the Offer fields without going near Google.
async function offerDraft(file) {
  if (!state.team_id) throw new Error('Run connect first');
  if (!file) throw new Error('Give the offer file: offer-draft <file>');
  const o = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  for (const k of ['title', 'body', 'start', 'end']) if (!String(o[k] || '').trim()) throw new Error(`The offer file has no ${k}`);
  const { postData } = require('../publisher/bundle-social');
  const { ukToUtc } = require('../publisher/service');
  const photo = fs.readFileSync(path.join(ROOT, 'public/logo.png'));
  const form = new FormData();
  form.append('teamId', state.team_id);
  form.append('file', new Blob([photo], { type: 'image/png' }), 'copybot-offer-test.png');
  const up = await call('POST', '/upload/', { form });
  const when = { offerStart: ukToUtc(o.start), offerEnd: ukToUtc(o.end) };
  const data = postData({ topic: 'OFFER', offer_title: o.title, offer_redeem_url: o.redeem_url || undefined, body: o.body }, up.id, when);
  const later = new Date(Date.now() + 30 * 86400000); later.setUTCHours(10, 0, 0, 0);
  const ref = `copybot-offer-draft-${Date.now()}`;
  const made = await call('POST', '/post/', { body: { teamId: state.team_id, title: 'Copybot offer test, a draft, deleted straight away', postDate: later.toISOString(), status: 'DRAFT', socialAccountTypes: [TYPE], referenceKey: ref, data: { [TYPE]: data } } });
  show('Created as a draft', { id: made.id, status: made.status, postDate: made.postDate });
  try {
    if (made.status !== 'DRAFT') throw new Error(`bundle.social made it ${made.status}, not DRAFT`);
    const read = await call('GET', `/post/${made.id}`);
    const kept = (read.data && read.data[TYPE]) || {};
    show('What bundle.social kept', { status: read.status, topicType: kept.topicType, eventTitle: kept.eventTitle, eventStartDate: kept.eventStartDate, eventEndDate: kept.eventEndDate, text: kept.text, uploadIds: kept.uploadIds, errors: read.errors });
    const sent = { topicType: data.topicType, eventTitle: data.eventTitle, eventStartDate: data.eventStartDate, eventEndDate: data.eventEndDate, text: data.text };
    console.log(`
Every Offer field kept as sent: ${Object.entries(sent).every(([k, v]) => String(kept[k] || '') === String(v || '') || (k.endsWith('Date') && Date.parse(kept[k]) === Date.parse(v))) ? 'YES' : 'NO, see above'}`);
  } finally {
    await call('DELETE', `/post/${made.id}`);
    const after = await call('GET', `/post/${made.id}`).catch(e => ({ status: `HTTP ${e.status}` }));
    show('After delete', { status: after.status });
  }
}

// Which post: step 4's by default, the Offer post with "offer"
const pick = which => {
  const p = which === 'offer' ? state.offer_post : state.public_post;
  if (!p) throw new Error(which === 'offer' ? 'No offer post yet' : 'No public post yet');
  return p;
};
async function status(which) {
  const p = pick(which);
  show('Status', await pub().postStatus(p.id));
  const raw = await call('GET', `/post/${p.id}`);
  show('Raw', { status: raw.status, postedDate: raw.postedDate, externalData: raw.externalData, errors: raw.errors, errorsVerbose: raw.errorsVerbose });
}

async function removePost(which) {
  needYes();
  const p = pick(which);
  show('Removed from Google', await pub().removeLivePost(state.team_id, p.id));
  show('Status after', await pub().postStatus(p.id));
}

const [step, arg] = process.argv.slice(2);
const steps = { list, connect: () => connect(arg), 'schedule-cancel': scheduleCancel, 'post-public': postPublic, 'offer-public': () => offerPublic(arg), 'offer-draft': () => offerDraft(arg), status: () => status(arg), 'remove-post': () => removePost(arg) };
if (!steps[step]) { console.log('Steps: list | connect "<location>" | schedule-cancel | post-public --yes-public | offer-public <file> --yes-public | offer-draft <file> | status [offer] | remove-post [offer] --yes-public'); process.exit(1); }
steps[step]().then(() => console.log(`\nReplies saved in ${OUT}`)).catch(e => { console.error(`\nSTOPPED: ${hide(e.message)}`); process.exit(1); });
