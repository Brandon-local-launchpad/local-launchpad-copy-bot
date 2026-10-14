'use strict';
// A fake WordPress site for testing the push: the REST endpoints the push uses,
// Application Password (Basic) auth, ACF fields under `acf` and SEO meta under
// `meta`, as a real site with ACF Pro "Show in REST API" and the companion plugin
// would return them. Counts writes, so tests can prove a dry run writes nothing.
const express = require('express');

const ALL_GROUPS = require('../../wp/acf-schema').GROUPS.map(g => `group_llp_${g.name}`);

// plugin: false → the companion plugin isn't installed (its routes 404)
function createFakeWp({ user = 'copybot', appPassword = 'test-app-password-not-real', frontId = 7, pages = [],
  plugin = true, acfPro = true, seo = 'rankmath', fieldGroups = ALL_GROUPS, clientValues = {} } = {}) {
  const state = { writes: 0, pages: new Map(pages.map(p => [p.id, JSON.parse(JSON.stringify(p))])), frontId, clientValues: { ...clientValues } };
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use('/wp-json', (req, res, next) => {
    const want = 'Basic ' + Buffer.from(`${user}:${appPassword}`).toString('base64');
    if (req.headers.authorization !== want) return res.status(401).json({ code: 'rest_not_logged_in', message: 'You are not currently logged in.' });
    next();
  });
  app.get('/wp-json/wp/v2/settings', (req, res) => res.json({ title: 'Fake site', page_on_front: state.frontId }));
  if (plugin) {
    app.get('/wp-json/llp-copybot/v1/status', (req, res) => res.json({ plugin: '0.1.0', acf_pro: acfPro, seo, front_page: state.frontId, field_groups: fieldGroups }));
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
    if (req.body.acf) p.acf = { ...p.acf, ...req.body.acf };
    if (req.body.meta) p.meta = { ...p.meta, ...req.body.meta };
    if (req.body.status) p.status = req.body.status;
    res.json(p);
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
