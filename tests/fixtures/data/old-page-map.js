'use strict';
// The old Apps Script PAGE MAP GENERATOR's row logic, ported line for line (no
// sheet code), so the new generator can be compared with it. Input: the category
// tabs as the old sheet had them ([{ name, services: [names] }]) and the biz
// areas, base town first. Returns rows { type, title, slug, h1, linksTo, linksFrom }.
const slugify = text => String(text).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

function oldPageMap(companyName, bizAreas, tabs) {
  const categories = tabs.map(t => ({ name: t.name, slug: slugify(t.name), services: t.services.map(s => ({ name: s, slug: slugify(s) })) }));
  const rows = [];
  const home = { linksTo: [], linksFrom: [] };
  categories.forEach(c => home.linksTo.push('/' + c.slug));
  bizAreas.forEach(a => home.linksTo.push('/locations/' + slugify(a)));
  categories.forEach(c => c.services.forEach(s => { const p = '/services/' + s.slug; if (!home.linksTo.includes(p)) home.linksTo.push(p); }));
  categories.forEach(c => c.services.forEach(s => { const p = '/services/' + s.slug; if (!home.linksFrom.includes(p)) home.linksFrom.push(p); }));
  rows.push({ type: 'Homepage', title: companyName + ' Homepage', slug: '/', h1: '', ...home });
  categories.forEach(cat => rows.push({ type: 'Category', title: cat.name, slug: '/' + cat.slug, h1: '',
    linksTo: cat.services.map(s => '/services/' + s.slug), linksFrom: bizAreas.slice(1).map(a => '/locations/' + slugify(a) + '/' + cat.slug) }));
  const seen = {};
  categories.forEach(cat => cat.services.forEach(s => {
    if (seen[s.slug]) return; seen[s.slug] = true;
    const linksTo = ['/' + cat.slug]; bizAreas.slice(1).forEach(a => linksTo.push('/locations/' + slugify(a) + '/' + cat.slug)); linksTo.push('/');
    rows.push({ type: 'Service', title: s.name, slug: '/services/' + s.slug, h1: s.name + ' ' + bizAreas[0], linksTo, linksFrom: ['/' + cat.slug] });
  }));
  bizAreas.slice(1).forEach(area => rows.push({ type: 'Location', title: area, slug: '/locations/' + slugify(area), h1: '',
    linksTo: categories.map(c => '/locations/' + slugify(area) + '/' + c.slug), linksFrom: ['/'] }));
  bizAreas.slice(1).forEach(area => categories.forEach(cat => rows.push({ type: 'Location Category', title: cat.name + ' ' + area, slug: '/locations/' + slugify(area) + '/' + cat.slug, h1: '',
    linksTo: ['/' + cat.slug, '/locations/' + slugify(area)].concat(cat.services.map(s => '/services/' + s.slug)),
    linksFrom: cat.services.map(s => '/services/' + s.slug).concat(['/locations/' + slugify(area)]) })));
  return rows;
}

module.exports = { oldPageMap };
