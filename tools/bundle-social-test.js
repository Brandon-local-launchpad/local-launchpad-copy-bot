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
const STATE = path.join(OUT, 'state.json');
const TEST_TEAM = 'Copybot test';
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

async function status() {
  if (!state.public_post) throw new Error('No public post yet');
  show('Status', await pub().postStatus(state.public_post.id));
  const raw = await call('GET', `/post/${state.public_post.id}`);
  show('Raw', { status: raw.status, postedDate: raw.postedDate, externalData: raw.externalData, errors: raw.errors, errorsVerbose: raw.errorsVerbose });
}

async function removePost() {
  needYes();
  if (!state.public_post) throw new Error('No public post yet');
  show('Removed from Google', await pub().removeLivePost(state.team_id, state.public_post.id));
  show('Status after', await pub().postStatus(state.public_post.id));
}

const [step, arg] = process.argv.slice(2);
const steps = { list, connect: () => connect(arg), 'schedule-cancel': scheduleCancel, 'post-public': postPublic, status, 'remove-post': removePost };
if (!steps[step]) { console.log('Steps: list | connect "<location>" | schedule-cancel | post-public --yes-public | status | remove-post --yes-public'); process.exit(1); }
steps[step]().then(() => console.log(`\nReplies saved in ${OUT}`)).catch(e => { console.error(`\nSTOPPED: ${hide(e.message)}`); process.exit(1); });
