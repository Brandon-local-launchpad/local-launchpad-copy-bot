'use strict';
// A fake WordPress site for testing the push: the REST endpoints the push uses,
// Application Password (Basic) auth, ACF fields under `acf` and SEO meta under
// `meta`, as a real site with ACF Pro "Show in REST API" and the companion plugin
// would return them. Counts writes, so tests can prove a dry run writes nothing.
const express = require('express');

const { LEGAL_GROUPS, LEGAL_TEMPLATE } = require('../../wp/acf-schema');
const { INNER_GROUPS } = require('../../wp/acf-schema');
const ALL_GROUPS = [...require('../../wp/acf-schema').GROUPS, ...LEGAL_GROUPS, ...INNER_GROUPS].map(g => `group_llp_${g.name}`);
// An inner page's post type → the top-level field names of its set of groups (their ACF location is the post type)
const INNER_FIELDS = Object.fromEntries(require('../../wp/post-types').POST_TYPES.map(t => [t.post_type, INNER_GROUPS.filter(g => g.set === t.set).flatMap(g => g.fields.map(f => f.name))]));
const LEGAL_FIELDS = LEGAL_GROUPS.flatMap(g => g.fields.map(f => f.name));
// The homepage groups' top-level field names (their ACF location is the front page)
const POST_TYPES = require('../../wp/post-types').POST_TYPES.map(p => p.post_type);
const HOME_FIELDS = require('../../wp/acf-schema').GROUPS.flatMap(g => g.fields.map(f => f.name));

// plugin: false → the companion plugin isn't installed (its routes 404)
function createFakeWp({ user = 'copybot', appPassword = 'test-app-password-not-real', frontId = 7, pages = [],
  plugin = true, acfPro = true, seo = 'rankmath', fieldGroups = ALL_GROUPS, clientValues = {}, pluginVersion = null,
  failWrites = false, ignoreAcf = [], elementorFront = true, rankMath = true, redirectionsModule = true, failRedirectWrites = false, mangleSource = null, otherRedirects = [], publicPaths = ['/'], publicRedirects = {}, trailingFront = null, reviewFunnel = true, dropEndpoint = false, innerPages = [], missingPostTypes = [], failPageWrites = false, refusePaths = [], noFieldsOn = [] } = {}) {
  // noFieldsOn: post types whose field groups don't attach (a read gives `acf: []` and a write to them is dropped)
  // innerPages: entries already in the inner pages' post types [{ id, post_type, status, title, path }]; missingPostTypes: post types the
  // site reports as missing; failPageWrites: the pages route answers 500; refusePaths: paths WordPress can't save
  // failWrites: page writes return 500; ignoreAcf: fields the site doesn't save (e.g. a field group that isn't there);
  // elementorFront: as the Edens Edge test copy does (3 Nov), a read of the front page that includes `content`
  // (no _fields, or _fields with content) comes back with `acf: []`; a read that names its fields gets the ACF
  const state = { innerPages: innerPages.map(p => ({ ...p })), nextPageId: 500, pageWrites: 0, writes: 0, pages: new Map(pages.map(p => [p.id, JSON.parse(JSON.stringify(p))])), frontId, clientValues: { ...clientValues }, reviewEndpoint: '', feedbackPosts: [], redirects: otherRedirects.map((r, i) => ({ id: 9000 + i, mine: false, status: 'active', code: 301, url_to: '/x', ...r })), nextRedirectId: 1, statusCalls: [], failStatus: {}, redirectCheck: null, publicPaths: new Set(publicPaths), requests: [] };
  const redirectsReady = () => ({ rank_math: !!rankMath, module: !!(rankMath && redirectionsModule), ready: !!(rankMath && redirectionsModule) });
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // The Review Us page as a visitor sees it (no login): the page is the plugin's own PHP, drawn by
  // tests/php/review-box.js; the form's send is passed on to the address Copybot set, as the plugin does
  // (the plugin's real send, with its checks and its email fallback, is tested in wp-plugin-php.js)
  if (plugin && reviewFunnel) {
    app.get('/review-us/', async (req, res) => {
      try { res.type('html').send(await require('../php/review-box').render({ values: state.clientValues, siteUrl: `http://${req.headers.host}` })); }
      catch (e) { console.error('[fake-wp] /review-us/', e); res.status(500).type('text').send(e.message); }
    });
    app.post('/wp-json/llp-copybot/v1/review-feedback', async (req, res) => {
      const { website, ...value } = req.body || {};
      state.feedbackPosts.push(req.body);
      if (website) return res.json({ ok: true });
      if (!state.reviewEndpoint) return res.status(502).json({ code: 'llp_not_sent', message: 'Sorry, that did not send.' });
      try {
        const r = await fetch(state.reviewEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) return res.json({ ok: true, by: 'copybot' });
        res.status(r.status === 400 ? 400 : 502).json({ code: r.status === 400 ? 'llp_bad_feedback' : 'llp_not_sent', message: j.error || 'Sorry, that did not send.' });
      } catch (e) { console.error('[fake-wp] review-feedback', e); res.status(502).json({ code: 'llp_not_sent', message: 'Sorry, that did not send.' }); }
    });
  }

  app.use('/wp-json', (req, res, next) => {
    const want = 'Basic ' + Buffer.from(`${user}:${appPassword}`).toString('base64');
    if (req.headers.authorization !== want) return res.status(401).json({ code: 'rest_not_logged_in', message: 'You are not currently logged in.' });
    next();
  });
  app.get('/wp-json/wp/v2/settings', (req, res) => res.json({ title: 'Fake site', page_on_front: state.frontId }));
  if (plugin) {
    app.get('/wp-json/llp-copybot/v1/status', (req, res) => res.json({ plugin: pluginVersion || require('../../wp/plugin-version').VERSION, redirects: redirectsReady(), acf_pro: acfPro, seo, front_page: state.frontId, field_groups: fieldGroups, page_types: Object.fromEntries(POST_TYPES.map(t => [t, missingPostTypes.includes(t) ? 'missing' : (['service', 'location', 'category-location'].includes(t) ? 'site' : 'plugin')])) }));
    // The inner pages (plugin 0.7.0, page-types.php llp_pages_save_one): a new entry is a draft; one that exists keeps its status
    app.get('/wp-json/llp-copybot/v1/pages', (req, res) => res.json({ items: state.innerPages.filter(p => p.status !== 'trash').map(({ id, post_type, status, title, path }) => ({ id, post_type, status, title, path: path || '' })) }));
    app.post('/wp-json/llp-copybot/v1/pages', (req, res) => {
      if (failPageWrites) return res.status(500).json({ code: 'internal_server_error', message: 'There has been a critical error on this website.' });
      const items = (req.body || {}).items;
      if (!Array.isArray(items) || items.length > 500) return res.status(400).json({ code: 'llp_bad_body', message: 'Send { items: [ … ] }, 500 at most.' });
      state.writes++; state.pageWrites++;
      const alive = () => state.innerPages.filter(p => p.status !== 'trash');
      res.json({ items: items.map(it => {
        const out = { path: it.path, id: it.id || 0, result: 'error', message: '' };
        if (!POST_TYPES.includes(it.post_type)) return { ...out, message: "Not one of the inner pages' post types." };
        if (!it.title || !/^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/.test(it.path || '')) return { ...out, message: 'A page needs a title and a path like /services/patios.' };
        const holder = alive().find(p => p.path === it.path);
        let entry = null;
        if (it.id) {
          entry = alive().find(p => p.id === it.id);
          if (!entry) return { ...out, message: 'That entry is not on the site any more.' };
          if (holder && holder.id !== it.id) return { ...out, message: `Another entry (${holder.id}) is already at this path.` };
        } else if (holder) entry = holder;
        if (entry) {
          if (entry.post_type !== it.post_type) return { ...out, id: entry.id, message: `The entry at this path is a ${entry.post_type}, not a ${it.post_type}.` };
          const changed = entry.path !== it.path || entry.title !== it.title;
          entry.path = it.path; entry.title = it.title;
          return { ...out, id: entry.id, result: changed ? 'updated' : 'unchanged' };
        }
        if (refusePaths.includes(it.path)) return { ...out, message: 'Could not insert post into the database.' };
        const made = { id: state.nextPageId++, post_type: it.post_type, status: 'draft', title: it.title, path: it.path };
        state.innerPages.push(made);
        return { ...out, id: made.id, result: 'created' };
      }) });
    });
    app.get('/wp-json/llp-copybot/v1/client-values', (req, res) => res.json(state.clientValues));
    app.post('/wp-json/llp-copybot/v1/client-values', (req, res) => { state.writes++; Object.assign(state.clientValues, req.body); res.json(state.clientValues); });
    // The Review Us page's settings (plugin 0.5.0, review-funnel.php): where feedback is sent. A site whose
    // plugin is older answers 404 (reviewFunnel: false); dropEndpoint: the site answers but keeps nothing
    if (reviewFunnel) {
      app.get('/wp-json/llp-copybot/v1/review-funnel', (req, res) => res.json({ endpoint: state.reviewEndpoint }));
      app.post('/wp-json/llp-copybot/v1/review-funnel', (req, res) => { state.writes++; if (!dropEndpoint) state.reviewEndpoint = String((req.body || {}).endpoint || ''); res.json({ endpoint: state.reviewEndpoint }); });
    }
  }
  // As real ACF does: the homepage groups attach to the front page only. There every
  // homepage field comes back (null when unset); on any other page homepage fields are
  // left out, writes to them are dropped without an error, and with no fields at all
  // `acf` is an empty array. Other pages keep their own fields.
  const onFront = p => p.id === state.frontId;
  // The legal field attaches only to a page on the legal template
  const onLegal = p => p.template === LEGAL_TEMPLATE;
  const own = (p, acf) => Object.fromEntries(Object.entries(acf || {}).filter(([k]) => (onFront(p) || !HOME_FIELDS.includes(k)) && (onLegal(p) || !LEGAL_FIELDS.includes(k))));
  const view = (p, req = null) => {
    const fields = req && req.query._fields ? String(req.query._fields).split(',').map(s => s.trim()).filter(Boolean) : null;
    const withContent = !fields || fields.includes('content');
    let acf = onFront(p) ? { ...Object.fromEntries(HOME_FIELDS.map(n => [n, null])), ...p.acf } : own(p, p.acf);
    if (onLegal(p)) acf = { ...Object.fromEntries(LEGAL_FIELDS.map(n => [n, null])), ...acf };
    if (elementorFront && onFront(p) && withContent) acf = {};
    const full = { ...p, content: { raw: p.content || '', rendered: `<p>${p.content || ''}</p>` }, acf: Object.keys(acf).length ? acf : [] };
    return fields ? Object.fromEntries(Object.entries(full).filter(([k]) => fields.includes(k))) : full;
  };
  app.get('/wp-json/wp/v2/pages', (req, res) => {
    res.json([...state.pages.values()].filter(p => !req.query.slug || p.slug === req.query.slug).map(p => view(p, req)));
  });
  app.get('/wp-json/wp/v2/pages/:id', (req, res) => {
    const p = state.pages.get(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    res.json(view(p, req));
  });
  app.post('/wp-json/wp/v2/pages/:id', (req, res) => {
    const p = state.pages.get(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    state.writes++;
    if (failWrites) return res.status(500).json({ code: 'internal_server_error', message: 'There has been a critical error on this website.' });
    if (req.body.acf) p.acf = { ...p.acf, ...Object.fromEntries(Object.entries(own(p, req.body.acf)).filter(([k]) => !ignoreAcf.includes(k))) };
    if (req.body.meta) p.meta = { ...p.meta, ...req.body.meta };
    if (req.body.status) p.status = req.body.status;
    res.json(view(p));
  });
  // The media library (images/service.js): an upload is the file's bytes with its name in the header; the alt
  // text and title are set after. state.media: Map id → { id, file, type, bytes, alt_text, title }
  state.media = new Map(); state.nextMediaId = 900;
  app.post('/wp-json/wp/v2/media', express.raw({ type: () => true, limit: '30mb' }), (req, res) => {
    if (state.failMedia) return res.status(500).json({ code: 'rest_upload_unknown_error', message: 'Sorry, you are not allowed to upload this file type.' });
    const file = (String(req.headers['content-disposition'] || '').match(/filename="([^"]+)"/) || [])[1] || '';
    if (!file || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ code: 'rest_upload_no_data', message: 'No data supplied.' });
    state.writes++;
    const m = { id: state.nextMediaId++, file, type: req.headers['content-type'], bytes: req.body.length, alt_text: '', title: '' };
    state.media.set(m.id, m);
    res.status(201).json({ id: m.id, source_url: `http://fake.test/wp-content/uploads/${file}` });
  });
  app.get('/wp-json/wp/v2/media/:id', (req, res) => { const m = state.media.get(Number(req.params.id)); if (!m) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' }); res.json({ id: m.id, alt_text: m.alt_text }); });
  app.post('/wp-json/wp/v2/media/:id', (req, res) => {
    const m = state.media.get(Number(req.params.id));
    if (!m) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    state.writes++;
    if (req.body.alt_text !== undefined) m.alt_text = String(req.body.alt_text);
    if (req.body.title !== undefined) m.title = String(req.body.title);
    res.json({ id: m.id, alt_text: m.alt_text });
  });
  // An inner page through its post type's REST base, as ACF gives it: every field of its set (null when unset)
  for (const type of POST_TYPES) {
    const names = noFieldsOn.includes(type) ? [] : INNER_FIELDS[type];
    const entry = req => state.innerPages.find(p => p.id === Number(req.params.id) && p.post_type === type && p.status !== 'trash');
    const viewInner = p => {
      const acf = { ...Object.fromEntries(names.map(n => [n, null])), ...Object.fromEntries(Object.entries(p.acf || {}).filter(([k]) => names.includes(k))) };
      return { id: p.id, slug: (p.path || '').split('/').pop(), status: p.status, title: { raw: p.title, rendered: p.title }, acf: names.length ? acf : [], meta: p.meta || {} };
    };
    app.get(`/wp-json/wp/v2/${type}/:id`, (req, res) => { const p = entry(req); if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' }); res.json(viewInner(p)); });
    app.post(`/wp-json/wp/v2/${type}/:id`, (req, res) => {
      const p = entry(req);
      if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
      state.writes++;
      if (failWrites) return res.status(500).json({ code: 'internal_server_error', message: 'There has been a critical error on this website.' });
      if (req.body.acf) p.acf = { ...p.acf, ...Object.fromEntries(Object.entries(req.body.acf).filter(([k]) => names.includes(k) && !ignoreAcf.includes(k))) };
      if (req.body.meta) p.meta = { ...p.meta, ...req.body.meta };
      res.json(viewInner(p));
    });
  }
  // Rank Math's redirections through the plugin's routes, behaving as the real ones were read to
  // (5 Nov): only active rows fire, an unknown URL another plugin made is a conflict, a destination
  // holds this site's address, and turning on rebuilds it. rankMath: false, redirectionsModule: false to refuse.
  const R = state.redirects;
  const originOf = req => `${req.protocol}://${req.get('host')}`;
  const viewRedirects = () => {
    const items = R.filter(r => r.mine).map(r => ({ id: r.id, source: r.source, path: r.path, code: r.code, status: r.status, url_to: r.url_to, stored: r.storedAs || r.source, hits: 0 }));
    return { ready: redirectsReady(), items, other: R.filter(r => !r.mine).map(r => ({ id: r.id, source: r.source, status: r.status })), active: items.filter(i => i.status === 'active').length, inactive: items.filter(i => i.status !== 'active').length, check: state.redirectCheck };
  };
  const refuse = res => { res.status(409).json({ code: 'llp_no_redirections', message: 'Rank Math is not ready.' }); return true; };
  if (plugin) {
    app.get('/wp-json/llp-copybot/v1/redirects', (req, res) => res.json(viewRedirects()));
    app.post('/wp-json/llp-copybot/v1/redirects', (req, res) => {
      if (!redirectsReady().ready) return refuse(res);
      if (failRedirectWrites) return res.status(500).json({ code: 'fake', message: 'The write failed.' });
      state.writes++;
      const out = { created: 0, updated: 0, conflicts: [], errors: [] };
      for (const it of req.body.items || []) {
        const other = R.find(r => !r.mine && r.source === it.source);
        if (other) { out.conflicts.push({ source: it.source, id: other.id }); continue; }
        const mine = R.find(r => r.mine && r.source === it.source);
        if (mine) { Object.assign(mine, { path: it.path, code: it.code, status: 'inactive', url_to: it.code === 410 ? '' : `${originOf(req)}${it.path}` }); out.updated++; }
        else { R.push({ id: state.nextRedirectId++, mine: true, source: it.source, path: it.path, code: it.code, status: 'inactive', url_to: it.code === 410 ? '' : `${originOf(req)}${it.path}`, storedAs: mangleSource ? mangleSource(it.source) : it.source }); out.created++; }
      }
      res.json(out);
    });
    app.post('/wp-json/llp-copybot/v1/redirects/delete', (req, res) => {
      if (!redirectsReady().ready) return refuse(res);
      state.writes++;
      const ids = new Set(req.body.all ? R.filter(r => r.mine).map(r => r.id) : (req.body.ids || []).map(Number));
      let deleted = 0;
      for (let i = R.length - 1; i >= 0; i--) if (R[i].mine && ids.has(R[i].id)) { R.splice(i, 1); deleted++; }
      res.json({ deleted });
    });
    app.post('/wp-json/llp-copybot/v1/redirects/status', (req, res) => {
      if (!redirectsReady().ready) return refuse(res);
      state.statusCalls.push(req.body.status);
      if (state.failStatus[req.body.status] > 0) { state.failStatus[req.body.status]--; return res.status(500).json({ code: 'fake', message: 'The status change failed.' }); }
      state.writes++;
      for (const r of R) if (r.mine) { r.status = req.body.status; if (r.code !== 410) r.url_to = `${originOf(req)}${r.path}`; }
      res.json({ status: req.body.status, changed: R.filter(r => r.mine).length });
    });
    app.post('/wp-json/llp-copybot/v1/redirects/check', (req, res) => { state.redirectCheck = req.body; res.json(req.body); });
  }
  app.use('/wp-json', (req, res) => res.status(404).json({ code: 'rest_no_route', message: 'No route was found matching the URL and request method.' }));
  // The public site. Only an active redirect fires; a query string row matches the whole address.
  app.use((req, res) => {
    const full = req.originalUrl;
    const path = full.split('?')[0].replace(/\/+$/, '') || '/';
    state.requests.push(full);
    const hit = R.find(r => r.status === 'active' && (r.source === full || r.source === path));
    if (hit) {
      if (hit.code === 410) return res.status(410).send('Gone');
      return res.redirect(301, hit.url_to);
    }
    if (publicRedirects[path]) return res.redirect(301, publicRedirects[path]);
    if (state.publicPaths.has(path)) return res.status(200).type('html').send(`<html><body><h1>${path}</h1></body></html>`);
    res.status(404).type('html').send('<html><body>Not found</body></html>');
  });
  return { app, state };
}

// A homepage as a draft site would have it before the first push: an old H1 and
// a little GHL-era copy, most fields empty.
function seedHomepage({ id = 7, status = 'draft' } = {}) {
  return {
    id, slug: 'home', status, title: { raw: 'Home' },
    acf: {
      home_hero_h1: 'Gardener Southampton | Edens Edge',
      home_hero_intro: '<p>Edens Edge landscaping provides quality service across Southampton.</p>',
      home_content_block_h2: 'About Us',
      home_services_cards: [{ card_name: 'Gardener', card_text: '<p>Old gardener card.</p>', card_url: '/gardener' }],
      home_owner_show: false,
    },
    meta: { rank_math_title: 'Edens Edge landscaping', rank_math_description: '' },
  };
}

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

module.exports = { createFakeWp, seedHomepage, listen };
