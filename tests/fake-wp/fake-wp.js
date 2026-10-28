'use strict';
// A fake WordPress site for testing the push: the REST endpoints the push uses (pages,
// and since stage 7 of the blog build posts and categories),
// Application Password (Basic) auth, ACF fields under `acf` and SEO meta under
// `meta`, as a real site with ACF Pro "Show in REST API" and the companion plugin
// would return them. Counts writes, so tests can prove a dry run writes nothing.
const express = require('express');

const ALL_GROUPS = require('../../wp/acf-schema').GROUPS.map(g => `group_llp_${g.name}`);

// plugin: false → the companion plugin isn't installed (its routes 404)
function createFakeWp({ user = 'copybot', appPassword = 'test-app-password-not-real', frontId = 7, pages = [], posts = [], categories = [],
  plugin = true, acfPro = true, seo = 'rankmath', fieldGroups = ALL_GROUPS, clientValues = {},
  failWrites = false, ignoreAcf = [] } = {}) {
  // failWrites: page writes return 500; ignoreAcf: fields the site doesn't save (e.g. a field group that isn't there)
  // posts, categories: what the site holds before (none by default: the push makes the Guides category and the posts)
  const state = { writes: 0, pages: new Map(pages.map(p => [p.id, JSON.parse(JSON.stringify(p))])), posts: new Map(posts.map(p => [p.id, JSON.parse(JSON.stringify(p))])), categories: new Map(categories.map(c => [c.id, { ...c }])), nextId: 1000, frontId, clientValues: { ...clientValues } };
  let base = '';
  const nextId = () => { while (state.pages.has(state.nextId) || state.posts.has(state.nextId) || state.categories.has(state.nextId)) state.nextId++; return state.nextId++; };
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use('/wp-json', (req, res, next) => {
    base = base || `${req.protocol}://${req.get('host')}`;
    const want = 'Basic ' + Buffer.from(`${user}:${appPassword}`).toString('base64');
    if (req.headers.authorization !== want) return res.status(401).json({ code: 'rest_not_logged_in', message: 'You are not currently logged in.' });
    next();
  });
  app.get('/wp-json/wp/v2/settings', (req, res) => res.json({ title: 'Fake site', page_on_front: state.frontId }));
  if (plugin) {
    app.get('/wp-json/llp-copybot/v1/status', (req, res) => res.json({ plugin: '0.2.0', acf_pro: acfPro, seo, front_page: state.frontId, field_groups: fieldGroups }));
    app.get('/wp-json/llp-copybot/v1/client-values', (req, res) => res.json(state.clientValues));
    app.post('/wp-json/llp-copybot/v1/client-values', (req, res) => { state.writes++; Object.assign(state.clientValues, req.body); res.json(state.clientValues); });
  }
  app.get('/wp-json/wp/v2/pages', (req, res) => {
    res.json([...state.pages.values()].filter(p => !req.query.slug || p.slug === req.query.slug));
  });
  app.get('/wp-json/wp/v2/pages/:id', (req, res) => {
    const p = state.pages.get(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    res.json(p);
  });
  app.post('/wp-json/wp/v2/pages/:id', (req, res) => {
    const p = state.pages.get(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    state.writes++;
    if (failWrites) return res.status(500).json({ code: 'internal_server_error', message: 'There has been a critical error on this website.' });
    if (req.body.acf) p.acf = { ...p.acf, ...Object.fromEntries(Object.entries(req.body.acf).filter(([k]) => !ignoreAcf.includes(k))) };
    if (req.body.meta) p.meta = { ...p.meta, ...req.body.meta };
    if (req.body.status) p.status = req.body.status;
    res.json(p);
  });
  // Categories: list by slug, create
  app.get('/wp-json/wp/v2/categories', (req, res) => res.json([...state.categories.values()].filter(c => !req.query.slug || c.slug === req.query.slug)));
  app.post('/wp-json/wp/v2/categories', (req, res) => {
    const slug = String(req.body.slug || req.body.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const dup = [...state.categories.values()].find(c => c.slug === slug);
    if (dup) return res.status(400).json({ code: 'term_exists', message: 'A term with the name provided already exists.', data: { term_id: dup.id } });
    state.writes++;
    const c = { id: nextId(), name: req.body.name || slug, slug, count: 0 };
    state.categories.set(c.id, c);
    res.status(201).json(c);
  });
  // Posts: list by slug (any status), get, create, update. A post's fields as WordPress with
  // ACF "Show in REST API" returns them (acf, meta, title.raw, status, date_gmt, link)
  const postOut = p => ({ ...p, link: `${base}/guides/${p.slug}/` });
  app.get('/wp-json/wp/v2/posts', (req, res) => {
    const list = [...state.posts.values()].filter(p => !req.query.slug || p.slug === req.query.slug).filter(p => (req.query.status === 'any' || !req.query.status) ? true : p.status === req.query.status);
    res.json(list.map(postOut));
  });
  app.get('/wp-json/wp/v2/posts/:id', (req, res) => {
    const p = state.posts.get(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    res.json(postOut(p));
  });
  const applyPost = (p, body) => {
    if (body.title !== undefined) p.title = { raw: typeof body.title === 'string' ? body.title : (body.title.raw || ''), rendered: typeof body.title === 'string' ? body.title : (body.title.raw || '') };
    if (body.slug !== undefined) p.slug = String(body.slug);
    if (body.status !== undefined) p.status = String(body.status);
    if (body.date_gmt !== undefined) { p.date_gmt = String(body.date_gmt); p.date = p.date_gmt; }
    if (body.categories !== undefined) p.categories = (body.categories || []).map(Number);
    if (body.acf) p.acf = { ...(p.acf || {}), ...Object.fromEntries(Object.entries(body.acf).filter(([k]) => !ignoreAcf.includes(k))) };
    if (body.meta) p.meta = { ...(p.meta || {}), ...body.meta };
    // As WordPress: a future post whose date has passed, or a draft with no date, keeps its status; nothing is published here
    return p;
  };
  app.post('/wp-json/wp/v2/posts', (req, res) => {
    state.writes++;
    if (failWrites) return res.status(500).json({ code: 'internal_server_error', message: 'There has been a critical error on this website.' });
    const slug = String(req.body.slug || '').trim();
    if (slug && [...state.posts.values()].some(p => p.slug === slug)) { /* WordPress would make slug-2; the push never creates twice (it finds the post first) */ }
    const p = applyPost({ id: nextId(), slug: '', status: 'draft', date_gmt: null, title: { raw: '', rendered: '' }, categories: [], acf: {}, meta: {} }, req.body);
    state.posts.set(p.id, p);
    res.status(201).json(postOut(p));
  });
  app.post('/wp-json/wp/v2/posts/:id', (req, res) => {
    const p = state.posts.get(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' });
    state.writes++;
    if (failWrites) return res.status(500).json({ code: 'internal_server_error', message: 'There has been a critical error on this website.' });
    applyPost(p, req.body);
    res.json(postOut(p));
  });
  app.use('/wp-json', (req, res) => res.status(404).json({ code: 'rest_no_route', message: 'No route was found matching the URL and request method.' }));
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
