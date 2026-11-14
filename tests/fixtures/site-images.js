'use strict';
// Fixture: website images (13 Nov 2026). The sort skill's photo notes (drive/notes.js), the pick
// (images/pick.js), the sizes and fields (images/place.js), and the Images tab's service
// (images/service.js) on pg-mem, a fake Drive and the fake WordPress site. No network; the photos
// are made here with sharp.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { newDb, DataType } = require('pg-mem');
const root = path.join(__dirname, '../..');
const N = require(path.join(root, 'drive/notes.js'));
const P = require(path.join(root, 'drive/photos.js'));
const { FOLDER_MIME } = require(path.join(root, 'drive/client.js'));
const { createDriveStore } = require(path.join(root, 'drive/store.js'));
const { pickImages, folderFor } = require(path.join(root, 'images/pick.js'));
const PL = require(path.join(root, 'images/place.js'));
const { ensureImageTables, createImages } = require(path.join(root, 'images/service.js'));
const { ensureWpTables, createDbStore } = require(path.join(root, 'wp/db-store.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const J = JSON.stringify;
const throwsMsg = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
console.log('\n=== FIXTURE: website images ===\n');

// ── The client's Drive photos and the notes the sort skill wrote ──
const photo = (id, kind, label, w, h, extra = {}) => ({ file_id: id, kind, label, folder_id: 'f', name: `${id}.jpg`, mime_type: 'image/jpeg', size_bytes: 900000, width: w, height: h, md5: crypto.createHash('md5').update(id).digest('hex'), web_link: `https://drive.test/${id}`, problem: '', ...extra });
const PHOTOS = [
  photo('p1', 'post', 'Patios', 3000, 2000), photo('p2', 'post', 'Patios', 2000, 1500), photo('p3', 'post', 'Patios', 2400, 1600),
  photo('p4', 'post', 'Patios', 2000, 1500), photo('p5', 'post', 'Patios', 2000, 1500), photo('p6', 'post', 'Patios', 1500, 2000),
  photo('d1', 'post', 'Driveways', 2800, 1800), photo('d2', 'post', 'Driveways', 2000, 1500),
  photo('b1', 'post', 'Brand', 2000, 1500), photo('b2', 'post', 'Brand', 2000, 1500),
  photo('g1', 'drip', 'GBP Photos – Photo Drip', 2600, 1700), photo('g2', 'drip', 'GBP Photos – Photo Drip', 2000, 1500), photo('g3', 'drip', 'GBP Photos – Photo Drip', 2000, 1500),
  photo('x1', 'post', 'Patios', 4000, 3000, { mime_type: 'image/heic', name: 'x1.heic' }), photo('x2', 'post', 'Patios', 600, 400), photo('x3', 'post', 'Patios', 3000, 2000),
];
const md5 = id => PHOTOS.find(p => p.file_id === id).md5;
const note = (id, type, service, score, hero, shows, extra = {}) => ({ name: `${id}.jpg`, md5: md5(id), folder: 'x', type, service, score, hero, shows, staff_face: false, pair: '', ...extra });
const NOTES_RAW = {
  version: 1, client: 'Edens Edge', sorted_on: '2026-11-13', labels: ['Patios', 'Driveways', 'Fencing'],
  photos: [
    note('p1', 'finished job', 'Patios', 9, true, 'A porcelain patio with a raised sleeper bed along the fence.'),
    note('p2', 'finished job', 'Patios', 8, false, 'A sandstone patio with a step up to the lawn.'),
    note('p3', 'finished job', 'Patios', 7, true, 'A grey slab patio beside a brick wall.'),
    note('p4', 'work in progress', 'Patios', 5, false, 'A patio base being levelled.'),
    note('p5', 'before-after', 'Patios', 6, true, 'An old cracked patio before the work.'),
    note('p6', 'finished job', 'Patios', 9, true, 'A tall shot of a patio corner.'),
    note('d1', 'finished job', 'Driveways', 8, true, 'A block paved driveway with a brick border.'),
    note('d2', 'finished job', 'Driveways', 7, false, 'A resin driveway beside a garage.'),
    note('b1', 'team', '', 7, false, 'Two of the team beside the van.', { staff_face: true }),
    note('b2', 'van', '', 6, false, 'The van parked on a drive.'),
    note('g1', 'finished job', 'Unclear', 8, true, 'A finished garden with a patio and a lawn.'),
    note('g2', 'finished job', 'Patios', 6, false, 'A small patio by a back door.'),
    note('g3', 'team', '', 5, false, 'A team member carrying slabs.', { staff_face: true }),
    { name: 'x3.jpg', md5: md5('x3'), folder: 'Rejected', type: 'reject', reject_reason: 'burst duplicate' },
    { md5: 'nope' },
  ],
};
const row = (type, title, slug, info = {}, extra = {}) => ({ page_key: `${type}:${slug}`, type, title, slug, applies: true, info: { phase: 1, ...info }, ...extra });
const ROWS = [
  row('homepage', 'Edens Edge Homepage', '/'),
  row('category', 'Paving Contractor', '/paving-contractor', { category_key: 'paving' }),
  row('category', 'Fencing Contractor', '/fencing-contractor', { category_key: 'fence' }),
  row('service', 'Patio installation', '/services/patios', { service_id: 's1', parent_keys: ['paving'] }),
  row('service', 'Driveways', '/services/driveways', { service_id: 's2', parent_keys: ['paving'] }),
  row('service', 'Garden fencing', '/services/fencing', { service_id: 's3', parent_keys: ['fence'] }),
  row('location', 'Romsey', '/locations/romsey', { town: 'Romsey' }),
  row('location_category', 'Paving Contractor Romsey', '/locations/romsey/paving-contractor', { town: 'Romsey', category_key: 'paving' }),
  row('town_service', 'Patio installation Romsey', '/locations/romsey/patios', { town: 'Romsey', service_id: 's1' }),
  row('location', 'Winchester', '/locations/winchester', { town: 'Winchester', phase: 2 }),
  row('service', 'Decking', '/services/decking', { service_id: 's9' }, { applies: false }),
];
const GROUPS = [{ folder: 'Patios', services: ['Patio installation', 'Patio cleaning'] }, { folder: 'Driveways', services: ['Driveways'] }, { folder: 'Fencing', services: ['Garden fencing'] }];
const CARDS = new Map([['/', ['/paving-contractor', '/fencing-contractor']], ['/paving-contractor', ['/services/patios', '/services/driveways', '/services/gone']]]);

(async () => {
  // ── The notes file ──
  const parsed = N.parseNotes(J(NOTES_RAW));
  chk('Notes: every entry with a file name is read; one with none is left out and said', parsed.notes.photos.length === 14 && parsed.problems.length === 1 && /1 entry .* has no file name/.test(parsed.problems[0]), J([parsed.notes.photos.length, parsed.problems]), '14, 1 problem');
  chk('Notes: bad JSON, and a file with no photos list, are not used and say why', N.parseNotes('{oops').notes === null && /not valid JSON/.test(N.parseNotes('{oops').problems[0]) && /no "photos" list/.test(N.parseNotes('{"version":1}').problems[0]), '', '');
  const odd = N.parseNotes(J({ photos: [{ name: ' a.jpg ', md5: 'XYZ', type: 'Selfie', score: 14, hero: 'yes', shows: '  A   patio.  ', service: 'Patios' }] })).notes.photos[0];
  chk('Notes: a made-up MD5, an unknown type, a score off the scale and a hero that is not true are dropped, not trusted', odd.name === 'a.jpg' && odd.md5 === '' && odd.type === '' && odd.score === null && odd.hero === false && odd.shows === 'A patio.', J(odd), '');
  const find = N.indexNotes(parsed.notes);
  chk('Notes: a photo is matched by its MD5 whatever it is called, else by its name; a name two entries share matches neither', find({ md5: md5('p1'), name: 'renamed.jpg' }).shows.startsWith('A porcelain') && find({ md5: '', name: 'P2.JPG' }).score === 8 && find({ md5: '', name: 'other.jpg' }) === null && N.indexNotes({ photos: [{ name: 'a.jpg', md5: '' }, { name: 'a.jpg', md5: '' }] })({ name: 'a.jpg' }) === null, '', '');
  chk('Notes: the file is found by its name', N.isNotesFile({ name: 'photo-notes.json' }) && N.isNotesFile({ name: 'Photo-Notes' }) && !N.isNotesFile({ name: 'notes.json' }), '', '');

  // Read with the folders
  const dir = (id, name) => ({ id, name, mimeType: FOLDER_MIME });
  const img = id => ({ id, name: `${id}.jpg`, mimeType: 'image/jpeg', size: '900000', md5Checksum: md5(id), imageMediaMetadata: { width: 3000, height: 2000 } });
  const drive = (rootKids, texts = {}) => ({
    async folder(id) { return dir(id, 'Edens Edge photos'); },
    async list(id) { return { rootF: rootKids, postsF: [dir('patiosF', 'Patios')], patiosF: [img('p1'), img('p2')], dripF: [img('g1')] }[id] || []; },
    async download(id) { if (texts[id] === undefined) throw new Error('gone'); return Buffer.from(texts[id]); },
    async exportText(id) { return texts[id]; },
  });
  const kids = [dir('postsF', 'GBP Photos – Posts'), dir('dripF', 'GBP Photos – Photo Drip')];
  const r1 = await P.readClientPhotos({ drive: drive([...kids, { id: 'n1', name: 'photo-notes.json', mimeType: 'application/json', modifiedTime: '2026-11-13T10:00:00Z' }], { n1: J(NOTES_RAW) }), folderId: 'rootF' });
  chk('Drive read: the notes file beside the folders is read with them', r1.files.length === 3 && r1.photo_notes && r1.photo_notes.photos.length === 14 && !r1.problems.length, J([r1.files.length, !!r1.photo_notes, r1.problems, r1.notes]), '');
  const r2 = await P.readClientPhotos({ drive: drive([...kids, { id: 'n2', name: 'photo-notes.json', mimeType: 'application/vnd.google-apps.document' }], { n2: J(NOTES_RAW) }), folderId: 'rootF' });
  chk('Drive read: notes saved as a Google Doc are read too', !!r2.photo_notes && r2.photo_notes.photos.length === 14, J(r2.notes), '');
  const r3 = await P.readClientPhotos({ drive: drive(kids), folderId: 'rootF' });
  const r4 = await P.readClientPhotos({ drive: drive([...kids, { id: 'n4', name: 'photo-notes.json', mimeType: 'application/json' }], { n4: 'not json' }), folderId: 'rootF' });
  const r5 = await P.readClientPhotos({ drive: drive([...kids, { id: 'n5', name: 'photo-notes.json', mimeType: 'application/json' }]), folderId: 'rootF' });
  chk('Drive read: no notes file is fine; a broken or unreadable one is a note, never a problem, and the photos are still read', r3.photo_notes === null && !r3.notes.length && r4.photo_notes === null && r4.notes.some(n => /not valid JSON/.test(n)) && r5.notes.some(n => /could not be read/.test(n)) && !r4.problems.length && r4.files.length === 3, J([r3.notes, r4.notes, r5.notes]), '');

  // ── The pick ──
  const pick = pickImages({ rows: ROWS, photos: PHOTOS, notes: parsed.notes, groups: GROUPS, cards: CARDS, heroChoice: 'photo' });
  const pg = p => pick.pages.find(x => x.path === p);
  const slot = (p, s) => pg(p).slots.find(x => x.slot === s);
  const ids = p => pg(p).slots.map(s => s.pick).filter(Boolean);
  chk('Pick: every page in the build, the homepage included; no retired page and no phase 2 town', J(pick.pages.map(p => p.path)) === J(['/', '/paving-contractor', '/fencing-contractor', '/services/patios', '/services/driveways', '/services/fencing', '/locations/romsey', '/locations/romsey/paving-contractor', '/locations/romsey/patios']), J(pick.pages.map(p => p.path)), '9 pages');
  chk('Pick: no photo is on one page twice', pick.pages.every(p => new Set(ids(p.path)).size === ids(p.path).length), '', '');
  const never = ['x1', 'x2', 'x3'];
  chk('Pick: a HEIC, a photo under 800px and a rejected photo are never used, and say why', !pick.pages.some(p => ids(p.path).some(i => never.includes(i))) && /HEIC/.test(pick.photos.x1.unusable) && /600px/.test(pick.photos.x2.unusable) && /rejected/.test(pick.photos.x3.unusable), J([pick.photos.x1.unusable, pick.photos.x2.unusable, pick.photos.x3.unusable]), '');
  const patios = ids('/services/patios');
  chk('Pick: a service page takes from its own folder, found through the saved labels, plus a Photo Drip photo the notes tie to it', patios.length > 0 && patios.every(i => /^p\d$|^g2$/.test(i)) && pg('/services/patios').pool === 7, J(patios), 'p1 to p6, g2');
  const heroes = pick.pages.map(p => p.slots.find(s => s.slot === 'hero').pick).filter(Boolean);
  chk('Pick: a hero is always a wide finished job marked as a hero: never a tall shot, a before, work in progress or the team', heroes.length >= 5 && heroes.every(i => ['p1', 'p3', 'd1', 'g1'].includes(i)), J(heroes), 'from p1, p3, d1, g1');
  chk('Pick: a town page reuses its base page\'s photos, with a different hero when there are two', slot('/locations/romsey/patios', 'hero').pick && slot('/services/patios', 'hero').pick !== slot('/locations/romsey/patios', 'hero').pick && ids('/locations/romsey/patios').every(i => /^p\d$|^g2$/.test(i)), J([slot('/services/patios', 'hero').pick, slot('/locations/romsey/patios', 'hero').pick]), 'two different patio heroes');
  chk('Pick: a category page takes from its services\' folders', ids('/paving-contractor').every(i => /^[pd]\d$|^g2$/.test(i)) && pg('/paving-contractor').pool === 9, J(ids('/paving-contractor')), '');
  const fence = pg('/services/fencing');
  chk('Pick: a service with no photos has every slot empty, listed with the reason', fence.slots.every(s => !s.pick) && /there are no photos of Garden fencing yet/.test(fence.slots[0].why) && /No photos of Garden fencing yet/.test(fence.slots[1].why) && pick.summary.services_with_no_folder.includes('Garden fencing'), J(fence.slots.map(s => s.why)), '');
  chk('Pick: a hero that can\'t be filled says what is needed', /no photo of Driveways suits a hero\. Ask the client for a wide, clean shot of the finished work, at least 1600 by 1000px/.test(pickImages({ rows: ROWS, photos: PHOTOS.filter(p => ['d2'].includes(p.file_id)), notes: parsed.notes, groups: GROUPS, heroChoice: 'photo' }).pages.find(p => p.path === '/services/driveways').slots[0].why), '', '');
  chk('Pick: the gallery is up to 6 and is what is left, work in progress included', pick.pages.every(p => p.slots.filter(s => /^gallery:/.test(s.slot)).length <= 6) && ids('/services/patios').includes('p4'), J(ids('/services/patios')), '');
  chk('Pick: a card shows its own page\'s best photo; a card whose page is not in the build is empty and says so', /^[p]\d$|^g2$/.test(slot('/paving-contractor', 'card:/services/patios').pick) && /^d\d$/.test(slot('/paving-contractor', 'card:/services/driveways').pick) && slot('/paving-contractor', 'card:/services/gone').pick === null && /not in the build/.test(slot('/paving-contractor', 'card:/services/gone').why), J(pg('/paving-contractor').slots.filter(s => /^card/.test(s.slot))), '');
  chk('Pick: the homepage has the owner photo from the Brand folder (the team shot, not the van) and no gallery', slot('/', 'owner').pick === 'b1' && !pg('/').slots.some(s => /^gallery/.test(s.slot)) && slot('/', 'card:/paving-contractor').pick && slot('/', 'card:/fencing-contractor').pick === null, J(pg('/').slots.map(s => [s.slot, s.pick])), '');
  chk('Pick: the homepage and a location page may use a Photo Drip photo that shows no one service; a service page never does', !ids('/services/patios').includes('g1') && !ids('/services/driveways').includes('g1') && pick.pages.filter(p => ['homepage', 'location'].includes(p.type)).some(p => ids(p.path).includes('g1')), '', '');
  chk('Pick: runners-up are offered for a swap', slot('/services/patios', 'hero').runners.length >= 1 && !slot('/services/patios', 'hero').runners.includes(slot('/services/patios', 'hero').pick), J(slot('/services/patios', 'hero')), '');
  chk('Pick: the summary counts photos, notes and slots', pick.summary.photos === 16 && pick.summary.usable === 13 && pick.summary.with_notes === 14 && pick.summary.no_description === 0 && pick.summary.empty > 0 && pick.summary.filled > 20, J(pick.summary), '');

  // The hero follows the client's answer on the onboarding form (Brandon, 13 Nov)
  const { heroChoiceOf } = require(path.join(root, 'images/pick.js'));
  chk('Hero answer: the form\'s two answers are read, and anything else is no answer', heroChoiceOf('A real photo of my work') === 'photo' && heroChoiceOf('An illustration') === 'illustration' && heroChoiceOf('') === 'none' && heroChoiceOf(null) === 'none' && heroChoiceOf('Not sure') === 'none', '', '');
  const illus = pickImages({ rows: ROWS, photos: PHOTOS, notes: parsed.notes, groups: GROUPS, cards: CARDS, heroChoice: 'illustration' });
  chk('The client chose an illustration: no hero is ever filled by code; the site\'s graphic shows, and says why', illus.pages.every(p => p.slots[0].slot === 'hero' && p.slots[0].pick === null && p.slots[0].graphic === true) && /chose an illustration, so the site's graphic shows/.test(illus.pages[0].slots[0].why) && illus.summary.heroes_photo === 0 && illus.summary.heroes_graphic === 9 && !illus.summary.heroes_wanted.length, J(illus.pages[0].slots[0]), '');
  chk('…the rest of the page still gets its photos, and a graphic hero is not counted as an empty slot', illus.pages.find(p => p.path === '/services/patios').slots.filter(s => s.pick).length >= 5 && illus.summary.empty === illus.pages.reduce((n, p) => n + p.slots.filter(s => !s.pick && s.slot !== 'hero').length, 0), J(illus.summary), '');
  chk('…the photos that would have been heroes are offered when a person presses Swap', illus.pages.find(p => p.path === '/services/patios').slots[0].runners.length >= 1, J(illus.pages.find(p => p.path === '/services/patios').slots[0]), '');
  const byHand = pickImages({ rows: ROWS, photos: PHOTOS, notes: parsed.notes, groups: GROUPS, cards: CARDS, heroChoice: 'illustration', choices: new Map([['service:s1', new Map([['hero', 'p1']])]]) });
  chk('…and a person can still put a photo in a hero by hand', byHand.pages.find(p => p.path === '/services/patios').slots[0].pick === 'p1' && !byHand.pages.find(p => p.path === '/services/patios').slots[0].graphic, J(byHand.pages.find(p => p.path === '/services/patios').slots[0]), 'p1');
  const noAnswer = pickImages({ rows: ROWS, photos: PHOTOS, notes: parsed.notes, groups: GROUPS, cards: CARDS });
  chk('No answer on the form: treated as an illustration, and it says so', noAnswer.pages.every(p => p.slots[0].pick === null && p.slots[0].graphic) && /No hero answer on the onboarding form/.test(noAnswer.pages[0].slots[0].why) && noAnswer.summary.hero_choice === 'none', J(noAnswer.pages[0].slots[0]), '');
  chk('The client chose a real photo: a page with no hero quality photo falls back to the graphic and is listed to ask the client about', fence.slots[0].graphic === true && pick.summary.hero_choice === 'photo' && pick.summary.heroes_wanted.includes('Garden fencing') && pick.summary.heroes_wanted.includes('Fencing Contractor') && !pick.summary.heroes_wanted.includes('Patio installation') && pick.summary.heroes_photo + pick.summary.heroes_graphic === 9, J(pick.summary), '');

  const bare = pickImages({ rows: ROWS, photos: PHOTOS, notes: null, groups: GROUPS, cards: CARDS, heroChoice: 'photo' });
  const bHero = bare.pages.find(p => p.path === '/services/patios').slots[0];
  chk('No notes: a hero is judged on shape, wide and 1600px or more; the tall photo and the small one are never one', ['p1', 'p2', 'p3', 'p4', 'p5', 'x3'].includes(bHero.pick) && !bare.pages.some(p => ['p6', 'x2', 'x1'].includes(p.slots[0].pick)), bHero.pick, 'a wide photo');
  const heroCount = {}; for (const p of pick.pages) { const hId = p.slots[0].pick; if (hId) heroCount[hId] = (heroCount[hId] || 0) + 1; }
  chk('Pick: heroes are spread: with four hero photos across eight pages, none is the hero on more than three', Math.max(...Object.values(heroCount)) <= 3 && Object.keys(heroCount).length === 4, J(heroCount), 'spread');
  chk('No notes: nobody can say which Brand photo is the owner, so a person chooses; photos have no description', bare.pages[0].slots.find(s => s.slot === 'owner').pick === null && /Choose the owner photo/.test(bare.pages[0].slots.find(s => s.slot === 'owner').why) && bare.pages[0].slots.find(s => s.slot === 'owner').runners.length === 2 && bare.summary.no_description === bare.summary.usable, J(bare.pages[0].slots.find(s => s.slot === 'owner')), '');
  chk('Folders: the saved label wins, then a folder of the page\'s own name, then a folder whose words are all in the title', folderFor('Patio installation', ['Patios', 'Driveways'], GROUPS) === 'Patios' && folderFor('Driveways', ['Patios', 'Driveways'], null) === 'Driveways' && folderFor('Garden fencing', ['Fencing', 'Patios'], null) === 'Fencing' && folderFor('Tree surgery', ['Fencing', 'Patios'], null) === null, '', '');

  const withChoice = pickImages({ rows: ROWS, photos: PHOTOS, notes: parsed.notes, groups: GROUPS, cards: CARDS, heroChoice: 'photo', choices: new Map([['service:s1', new Map([['hero', 'p2'], ['content', ''], ['gallery:1', 'zzz']])]]) });
  const swapped = withChoice.pages.find(p => p.path === '/services/patios');
  chk('A person\'s choice: any usable photo, "leave it empty", and a photo no longer in Drive (the pick stands in, marked stale)', swapped.slots[0].pick === 'p2' && swapped.slots[0].chosen === true && swapped.slots[1].pick === null && /by hand/.test(swapped.slots[1].why) && swapped.slots.find(s => s.slot === 'gallery:1').stale === true && !!swapped.slots.find(s => s.slot === 'gallery:1').pick, J(swapped.slots.slice(0, 3)), '');
  chk('A person\'s choice: the other slots pick around it, so the photo is still on the page only once', swapped.slots.filter(s => s.pick === 'p2').length === 1 && new Set(swapped.slots.map(s => s.pick).filter(Boolean)).size === swapped.slots.filter(s => s.pick).length, J(swapped.slots.map(s => [s.slot, s.pick])), '');

  // ── Sizes, names and fields ──
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 90, g: 140, b: 60 } } }).jpeg().toBuffer();
  const small = await sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 90, g: 90, b: 90 } } }).jpeg().toBuffer();
  const sh = await PL.shrink(big, 'hero'), sc = await PL.shrink(big, 'card:/x'), sg = await PL.shrink(big, 'gallery:3'), ss = await PL.shrink(small, 'hero');
  const fmt = async b => (await sharp(b).metadata()).format;
  chk('Shrink: a hero is cut to 1920 x 1080, a card is 800px wide, a gallery photo 1200px, all WebP; a small photo is never made bigger', sh.width === 1920 && sh.height === 1080 && sc.width === 800 && sc.height === 533 && sg.width === 1200 && ss.width === 900 && ss.height <= 600 && (await fmt(sh.bytes)) === 'webp' && sh.bytes.length < big.length, J([sh.width, sh.height, sc.width, sg.width, ss.width, ss.height]), '1920x1080, 800, 1200, 900');
  // Given's sizes for the templates (14 Nov 2026)
  const mk = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 80, g: 120, b: 70 } } }).jpeg().toBuffer();
  const h43 = await PL.shrink(await mk(2400, 1800), 'hero'), hMin = await PL.shrink(await mk(1600, 1000), 'hero'), hWide = await PL.shrink(await mk(4000, 1500), 'hero'), hMid = await PL.shrink(await mk(1700, 1100), 'hero');
  chk('Hero size: never over 1920 x 1080 whatever the photo\'s shape, and a 1600 x 1000 photo is left at its size', J([h43.width, h43.height]) === J([1920, 1080]) && J([hWide.width, hWide.height]) === J([1920, 1080]) && J([hMin.width, hMin.height]) === J([1600, 1000]) && hMid.width === 1700 && hMid.height <= 1080, J([[h43.width, h43.height], [hWide.width, hWide.height], [hMin.width, hMin.height], [hMid.width, hMid.height]]), '');
  const hCrop = await PL.shrink(big, 'hero', { x: 0.1, y: 0.2, w: 0.6, h: 0.6 });
  chk('Hero size: a person\'s crop is kept whole and fitted inside 1920 x 1080, not cut again', hCrop.height === 1080 && hCrop.width === 1620, J([hCrop.width, hCrop.height]), '1620x1080');
  const sized = (id, w, h) => photo(id, 'post', 'Patios', w, h);
  const sizeNote = id => ({ name: `${id}.jpg`, md5: '', folder: 'Posts/Patios', type: 'finished job', service: 'Patios', score: 9, hero: true, shows: 'A patio.', staff_face: false, pair: '' });
  const sizePick = list => pickImages({ rows: ROWS, photos: list, notes: { photos: list.map(p => sizeNote(p.file_id)) }, groups: GROUPS, heroChoice: 'photo' }).pages.find(p => p.path === '/services/patios');
  const tooSmall = sizePick([sized('s1', 1500, 1100), sized('s2', 1700, 900)]);
  chk('Hero minimum: a photo under 1600 wide or under 1000 tall is never a hero, even when the notes say it could be', tooSmall.slots[0].pick === null && tooSmall.slots[0].graphic === true && /at least 1600 by 1000px/.test(tooSmall.slots[0].why), J(tooSmall.slots[0]), '');
  chk('Hero minimum: 1600 x 1000 exactly is enough', sizePick([sized('s3', 1600, 1000)]).slots[0].pick === 's3', '', 's3');
  const thin = sizePick([sized('s4', 1000, 500), sized('s5', 900, 700)]);
  chk('Content minimum: a photo under 800 x 600 is not a content image, but can still be in the gallery', thin.slots[1].pick === 's5' && thin.slots.some(x => /^gallery/.test(x.slot) && x.pick === 's4'), J(thin.slots.map(x => [x.slot, x.pick])), '');
  chk('File name: what the photo shows, in lower case with hyphens, and its width', PL.fileName({ shows: 'A porcelain patio with a raised sleeper bed along the fence.', name: 'IMG_1.jpg' }, 'hero') === 'a-porcelain-patio-with-a-raised-sleeper-bed-1920.webp' && PL.fileName({ shows: '', name: 'IMG_2041.JPG' }, 'card:/x') === 'img-2041-800.webp', PL.fileName({ shows: '', name: 'IMG_2041.JPG' }, 'card:/x'), '');
  const svcF = PL.fieldsFor('town_service', [{ slot: 'hero', media_id: 11, alt: 'H' }, { slot: 'content', media_id: 12, alt: 'C' }, { slot: 'gallery:2', media_id: 14, alt: 'G2' }, { slot: 'gallery:1', media_id: 13, alt: 'G1' }]);
  chk('Fields: a service page\'s hero, content image with its alt text, and gallery rows in order', J(svcF.acf) === J({ svc_hero_background_image: 11, svc_content_image: 12, svc_content_image_alt: 'C', svc_gallery: [{ gallery_image: 13, gallery_alt: 'G1' }, { gallery_image: 14, gallery_alt: 'G2' }] }) && !svcF.skipped.length, J(svcF), '');
  const rowsNow = [{ card_name: 'Patios', card_text: '<p>Text.</p>', card_url: '/services/patios' }, { card_name: 'Driveways', card_text: '<p>More.</p>', card_url: '/services/driveways/' }];
  const catF = PL.fieldsFor('category', [{ slot: 'card:/services/patios', media_id: 21, alt: '' }, { slot: 'card:/services/driveways', media_id: 22, alt: '' }], { cat_services_cards: rowsNow });
  chk('Fields: a card\'s picture goes on its own row, and the row\'s text is kept', J(catF.acf.cat_services_cards) === J([{ ...rowsNow[0], card_image: 21 }, { ...rowsNow[1], card_image: 22 }]) && !catF.skipped.length, J(catF), '');
  const noRows = PL.fieldsFor('category', [{ slot: 'hero', media_id: 5, alt: '' }, { slot: 'card:/services/patios', media_id: 21, alt: '' }], {});
  chk('Fields: no cards on the site yet: the cards are left out and it says to push the copy first; the hero still goes', noRows.acf.cat_hero_background_image === 5 && !('cat_services_cards' in noRows.acf) && /push its copy first/.test(noRows.skipped[0]), J(noRows), '');
  const homeF = PL.fieldsFor('homepage', [{ slot: 'hero', media_id: 1, alt: '' }, { slot: 'content', media_id: 2, alt: 'C' }, { slot: 'owner', media_id: 3, alt: 'O' }], {});
  chk('Fields: the homepage\'s hero, content image and owner photo, under their own names', J(homeF.acf) === J({ home_hero_background_image: 1, home_content_block_image: 2, home_content_block_image_alt: 'C', home_owner_photo: 3, home_owner_photo_alt: 'O' }), J(homeF.acf), '');
  chk('Fields: an empty set of slots writes nothing', J(PL.fieldsFor('service', []).acf) === '{}', '', '{}');
  const schema = require(path.join(root, 'wp/acf-schema.js'));
  const siteImages = new Set([...schema.GROUPS, ...schema.INNER_GROUPS].flatMap(g => g.fields.flatMap(f => [f, ...(f.sub_fields || [])])).filter(f => f.push === false || f.type === 'image').map(f => f.name));
  const written = [...Object.keys(svcF.acf), ...Object.keys(catF.acf), ...Object.keys(homeF.acf), 'gallery_image', 'gallery_alt', 'card_image'].filter(k => !/_services_cards$|_gallery$/.test(k));
  chk('Fields: every field written is one of the site\'s own image fields in the schema, which the copy push never sends', written.every(k => siteImages.has(k)), written.filter(k => !siteImages.has(k)).join(), 'all in the schema');
  chk('Read-back: an image field holding another id, or a gallery row missing its picture, is reported', J(PL.notPlaced(svcF.acf, { svc_hero_background_image: { ID: 11 }, svc_content_image: 99, svc_content_image_alt: 'C', svc_gallery: [{ gallery_image: 13 }] })) === J(['svc_content_image', 'svc_gallery[2].gallery_image']), J(PL.notPlaced(svcF.acf, { svc_hero_background_image: { ID: 11 }, svc_content_image: 99, svc_content_image_alt: 'C', svc_gallery: [{ gallery_image: 13 }] })), '');

  // ── The service: choose, approve, place ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL)`);
  await ensureWpTables(pool);
  await ensureImageTables(pool);
  const clientId = (await pool.query(`INSERT INTO clients (name) VALUES ('Edens Edge') RETURNING id`)).rows[0].id;
  const driveStore = createDriveStore(pool);
  await driveStore.saveRead(clientId, { folder_id: 'rootF', folder_name: 'Edens Edge photos', posts_found: true, drip_found: true, folders: [], files: PHOTOS, problems: [], notes: [], photo_notes: parsed.notes });
  const back = await driveStore.read(clientId);
  chk('Store: the notes are saved with the Drive read and come back with it', back.photo_notes && back.photo_notes.photos.length === 14 && back.files.length === 16, J([back.files.length, !!back.photo_notes]), '');

  const entries = [
    { id: 601, post_type: 'service', status: 'draft', title: 'Patio installation', path: '/services/patios' },
    { id: 602, post_type: 'service-category', status: 'draft', title: 'Paving Contractor', path: '/paving-contractor', acf: { cat_services_cards: rowsNow, cat_hero_h1: 'Paving Contractor Southampton' } },
    { id: 603, post_type: 'location-service', status: 'draft', title: 'Patio installation Romsey', path: '/locations/romsey/patios' },
  ];
  const fake = createFakeWp({ pages: [seedHomepage()], innerPages: entries });
  const live = await listen(fake.app);
  let staging = true, connected = true, downloads = 0, driveDown = false, heroMode = 'photo';
  const images = createImages({
    pool, pageRows: async () => ROWS, readDrive: id => driveStore.read(id), groupsFor: async () => GROUPS, cardsFor: async () => CARDS,
    getSite: async () => (connected ? { url: live.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging } : null),
    heroChoiceFor: async () => heroMode,
    getDrive: () => ({ async download() { downloads++; if (driveDown) throw new Error('Drive could not give this photo (500).'); return big; } }),
    createLog: id => createDbStore(pool, id),
  });
  const log = async () => createDbStore(pool, clientId).listLog();
  const entry = id => fake.state.innerPages.find(p => p.id === id);
  const SVC = 'service:s1', CAT = 'category:paving', TOWN = 'town_service:romsey:s1';

  const v0 = await images.view(clientId);
  const page = (v, identity) => v.pages.find(p => p.identity === identity);
  chk('View: every page with its slots, nothing approved, the site named, and nothing written anywhere', v0.pages.length === 9 && v0.summary.approved === 0 && v0.site.url === live.url && v0.drive.read && v0.drive.notes && fake.state.writes === 0 && downloads === 0, J([v0.pages.length, v0.summary]), '');
  chk('Place: needs a confirm, then an approval', /needs confirming/.test(await throwsMsg(() => images.placePage(clientId, { identity: SVC }))) && (await images.placePage(clientId, { identity: SVC, confirm: true })).refusals.some(r => /Approve the page's pictures first/.test(r)) && fake.state.writes === 0, '', '');

  // A person's choice
  const hero0 = page(v0, SVC).slots[0].pick, other = page(v0, SVC).slots[0].runners[0];
  const v1 = await images.choose(clientId, { identity: SVC, slot: 'hero', file_id: other });
  chk('Choose: the slot holds the photo a person chose', page(v1, SVC).slots[0].pick === other && page(v1, SVC).slots[0].chosen === true && other !== hero0, J(page(v1, SVC).slots[0]), other);
  chk('Choose: a photo a person already put in another slot, an unusable photo, an unknown photo and an unknown slot are each refused', /chosen by hand/.test(await throwsMsg(() => images.choose(clientId, { identity: SVC, slot: 'content', file_id: other }))) &&/can't be used/.test(await throwsMsg(() => images.choose(clientId, { identity: SVC, slot: 'hero', file_id: 'x1' }))) && /not in the client's Drive/.test(await throwsMsg(() => images.choose(clientId, { identity: SVC, slot: 'hero', file_id: 'nope' }))) && /no such slot/.test(await throwsMsg(() => images.choose(clientId, { identity: SVC, slot: 'banner', file_id: other }))), '', '');
  const v2 = await images.approve(clientId, { identity: SVC, approved: true, by: 'Brandon' });
  chk('Approve: the page is approved, by whom', page(v2, SVC).approved === true && page(v2, SVC).approved_by === 'Brandon' && v2.summary.approved === 1, J([page(v2, SVC).approved, v2.summary.approved]), '');
  const v3 = await images.choose(clientId, { identity: SVC, slot: 'content', file_id: '' });
  chk('Choose after approval: the page is no longer approved, and the slot is empty by hand', page(v3, SVC).approved === false && page(v3, SVC).slots[1].pick === null, J(page(v3, SVC).slots[1]), '');
  await images.approve(clientId, { identity: SVC, approved: true, by: 'Brandon' });

  // What stops a placement
  staging = false;
  const notStaging = await images.placePage(clientId, { identity: SVC, confirm: true });
  staging = true;
  chk('Place: a site not marked staging is refused, nothing uploaded', notStaging.ok === false && /not marked as a staging site/.test(notStaging.refusals[0]) && fake.state.media.size === 0 && downloads === 0, J(notStaging.refusals), '');
  await images.approve(clientId, { identity: 'service:s2', approved: true });
  const noEntry = await images.placePage(clientId, { identity: 'service:s2', confirm: true });
  chk('Place: a page that is not on the site yet is refused, saying to make the pages first', noEntry.ok === false && /Make the pages first/.test(noEntry.refusals[0]) && fake.state.media.size === 0, J(noEntry.refusals), '');
  connected = false;
  chk('Place: no site connected says so', /no WordPress site connected/.test(await throwsMsg(() => images.placePage(clientId, { identity: SVC, confirm: true }))), '', '');
  connected = true;

  // Place one page
  const want = page(await images.view(clientId), SVC).slots.filter(s => s.pick);
  const placed = await images.placePage(clientId, { identity: SVC, confirm: true });
  const acf = entry(601).acf || {};
  const media = id => fake.state.media.get(id);
  chk('Place: every photo on the page is uploaded once, as WebP, and the page reads back as sent', placed.ok === true && placed.result === 'placed' && placed.uploaded === want.length && placed.reused === 0 && fake.state.media.size === want.length && [...fake.state.media.values()].every(m => m.type === 'image/webp' && /\.webp$/.test(m.file) && m.bytes < big.length), J([placed, fake.state.media.size, want.length]), '');
  chk('Place: the hero is in its field at 1920px, with the notes\' sentence as its alt text', media(acf.svc_hero_background_image) && /-1920\.webp$/.test(media(acf.svc_hero_background_image).file) && media(acf.svc_hero_background_image).alt_text === pick.photos[other].shows, J(media(acf.svc_hero_background_image)), pick.photos[other].shows);
  chk('Place: the slot left empty by hand is not written, and the gallery rows carry a picture and its alt text', !('svc_content_image' in acf) && acf.svc_gallery.length === want.filter(s => /^gallery/.test(s.slot)).length && acf.svc_gallery.every(g => media(g.gallery_image) && g.gallery_alt), J(acf.svc_gallery), '');
  chk('Place: the entry is still a draft and no other entry was touched', entry(601).status === 'draft' && !entry(603).acf && J(entry(602).acf.cat_services_cards) === J(rowsNow), '', '');

  const uploadsAfter = fake.state.media.size, downloadsAfter = downloads;
  const again = await images.placePage(clientId, { identity: SVC, confirm: true });
  chk('Place again: nothing is uploaded or downloaded twice', again.ok === true && again.uploaded === 0 && again.reused === want.length && fake.state.media.size === uploadsAfter && downloads === downloadsAfter, J([again.uploaded, again.reused, fake.state.media.size]), '');
  const heroMedia = acf.svc_hero_background_image;
  fake.state.media.delete(heroMedia);
  const healed = await images.placePage(clientId, { identity: SVC, confirm: true });
  chk('A picture deleted from the site\'s media library is uploaded again', healed.ok === true && healed.uploaded === 1 && entry(601).acf.svc_hero_background_image !== heroMedia && fake.state.media.has(entry(601).acf.svc_hero_background_image), J([healed.uploaded, entry(601).acf.svc_hero_background_image]), '');

  // The town page shares photos with the base page: the same photo at the same size is reused
  await images.approve(clientId, { identity: TOWN, approved: true });
  const town = await images.placePage(clientId, { identity: TOWN, confirm: true });
  chk('A town page that shares photos with its base page reuses the uploads', town.ok === true && town.reused > 0 && entry(603).acf.svc_hero_background_image > 0, J([town.uploaded, town.reused]), '');

  // Cards, and every page at once
  const all = await images.approve(clientId, { identity: '*', approved: true, by: 'Brandon' });
  chk('Approve every page: each page with a photo is approved; a page with none is not', all.summary.approved === all.summary.with_photos && page(all, 'service:s3').approved === false, J(all.summary), '');
  const cat = await images.placePage(clientId, { identity: CAT, confirm: true });
  const cards = entry(602).acf.cat_services_cards;
  chk('A category page: each card gets its picture on its own row, and the copy already on the page is kept', cat.ok === true && cards[0].card_image > 0 && cards[1].card_image > 0 && cards[0].card_image !== cards[1].card_image && cards[0].card_text === '<p>Text.</p>' && entry(602).acf.cat_hero_h1 === 'Paving Contractor Southampton' && entry(602).acf.cat_hero_background_image > 0, J([cat.result, cat.skipped, cards]), '');
  const home = await images.placePage(clientId, { identity: 'homepage', confirm: true });
  const front = fake.state.pages.get(7).acf;
  chk('The homepage: the hero, content image and owner photo are placed; its cards wait for the copy', front.home_hero_background_image > 0 && front.home_content_block_image > 0 && front.home_owner_photo > 0 && media(front.home_owner_photo).alt_text === 'Two of the team beside the van.' && front.home_hero_h1 === seedHomepage().acf.home_hero_h1, J([home.result, home.skipped, Object.keys(front).filter(k => /image|photo/.test(k))]), '');

  // ── A photo added by hand (a stock photo), and a crop ──
  const { createUploads, isUpload } = require(path.join(root, 'images/uploads.js'));
  const huge = await sharp({ create: { width: 6937, height: 6000, channels: 3, background: { r: 120, g: 110, b: 90 } } }).jpeg({ quality: 95 }).toBuffer();
  chk('Crop box: fractions of the photo, held inside it; a tiny box, a box of the whole photo and nonsense are no crop', J(PL.cleanCrop({ x: 0.25, y: 0.1, w: 0.5, h: 0.6 })) === J({ x: 0.25, y: 0.1, w: 0.5, h: 0.6 }) && J(PL.cleanCrop({ x: 0.8, y: 0.8, w: 0.6, h: 0.6 })) === J({ x: 0.8, y: 0.8, w: 0.2, h: 0.2 }) && PL.cleanCrop({ x: 0, y: 0, w: 0.01, h: 0.5 }) === null && PL.cleanCrop({ x: 0, y: 0, w: 1, h: 1 }) === null && PL.cleanCrop('x') === null && PL.cleanCrop(null) === null, J(PL.cleanCrop({ x: 0.8, y: 0.8, w: 0.6, h: 0.6 })), '');
  const cut = await PL.shrink(big, 'owner', { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  const tall = await PL.shrink(big, 'owner', { x: 0.4, y: 0, w: 0.2, h: 1 });
  chk('Shrink with a crop: only the box is kept, then sized for the slot; a narrow box is not blown up', cut.width === 800 && cut.height === 533 && tall.width === 600 && tall.height === 2000, J([cut.width, cut.height, tall.width, tall.height]), '800x533, 600x2000');

  const U = createUploads(pool);
  const up0 = await U.add(clientId, { name: 'garden-steps-envato.jpg', bytes: huge, alt: '  Stone garden steps   between planted borders. ', source: 'stock', by: 'Brandon' });
  chk('Add a photo: a 6,937px stock file is shrunk to 2,400px as it arrives, and only that is kept', isUpload(up0.id) && up0.width === 2400 && up0.height === 2076 && up0.size_bytes < huge.length / 4 && up0.original_bytes === huge.length && (await sharp(await U.bytes(clientId, up0.id)).metadata()).width === 2400, J(up0), '2400 wide');
  chk('Add a photo: a file that is not a photo, and nothing at all, are refused', /not a photo Copybot can read/.test(await throwsMsg(() => U.add(clientId, { name: 'x.pdf', bytes: Buffer.from('%PDF-1.4 not an image') }))) && /No photo was sent/.test(await throwsMsg(() => U.add(clientId, { name: 'x.jpg', bytes: Buffer.alloc(0) }))), '', '');
  const vAdded = await images.view(clientId);
  chk('An added photo is one of the client\'s photos, marked as stock with its alt text, and code never picks it', vAdded.photos[up0.id] && vAdded.photos[up0.id].source === 'stock' && vAdded.photos[up0.id].shows === 'Stone garden steps between planted borders.' && !vAdded.pages.some(p => p.slots.some(sl => sl.pick === up0.id)) && vAdded.summary.added === 1 && vAdded.summary.stock === 1, J([vAdded.photos[up0.id], vAdded.summary.added]), '');

  // Dropped straight onto an empty slot: the Garden fencing page has no photos of its own
  const FEN = 'service:s3';
  const dropped = await images.upload(clientId, { name: 'fence-stock.jpg', bytes: huge, alt: 'A closeboard fence along a lawn.', source: 'stock', identity: FEN, slot: 'content' });
  const fenContent = page(dropped, FEN).slots.find(sl => sl.slot === 'content');
  chk('Dropped on a slot: the photo is added and is in that slot, by hand', isUpload(fenContent.pick) && fenContent.chosen === true && dropped.added.width === 2400 && dropped.photos[fenContent.pick].shows === 'A closeboard fence along a lawn.', J(fenContent), '');
  chk('Dropped on a page or slot that does not exist: refused, and nothing is added', /not in the build/.test(await throwsMsg(() => images.upload(clientId, { name: 'a.jpg', bytes: huge, identity: 'service:zzz', slot: 'content' }))) && /no such slot/.test(await throwsMsg(() => images.upload(clientId, { name: 'a.jpg', bytes: huge, identity: FEN, slot: 'banner' }))) && (await images.view(clientId)).summary.added === 2, '', '');
  const altered = await images.setAlt(clientId, { file_id: fenContent.pick, alt: 'A new closeboard fence beside a lawn.' });
  chk('Its alt text can be typed again; a Drive photo\'s can\'t (it comes from the notes)', altered.photos[fenContent.pick].shows === 'A new closeboard fence beside a lawn.' && /Only a photo added by hand/.test(await throwsMsg(() => images.setAlt(clientId, { file_id: 'p1', alt: 'x' }))), altered.photos[fenContent.pick].shows, '');

  // Copybot writes the alt text of an added photo by looking at it (images/alt.js)
  const A = require(path.join(root, 'images/alt.js'));
  chk('Alt text: the model\'s reply is tidied to one sentence; a label, quotes and "Photo of" are stripped; a full stop is added',
    A.cleanAlt('Alt text: "Photo of stone garden steps between planted borders"') === 'Stone garden steps between planted borders.' && A.cleanAlt('  A closeboard fence   along a lawn.\n\nSecond line.') === 'A closeboard fence along a lawn.', A.cleanAlt('Alt text: "Photo of stone garden steps between planted borders"'), '');
  chk('Alt text: an empty reply, JSON, and a reply that runs on are not used', A.cleanAlt('') === '' && A.cleanAlt('{"findings":[]}') === '' && A.cleanAlt(Array(30).fill('word').join(' ')) === '', '', '');
  chk('Alt text: the instruction holds the skill\'s rule (15 words, only what is visible, no town, no praise)', /15 words or fewer/.test(A.SYSTEM) && /Only what is visible/.test(A.SYSTEM) && /No town/.test(A.SYSTEM) && /No praise/.test(A.SYSTEM), '', '');
  const sent = [];
  const seen = await A.describePhoto({ bytes: huge, name: 'stone-steps-leading-up-through-lush-green-garden-2026-09-22-06-05-08-utc.jpg', model: 'm', effort: 'low', callModel: async args => { sent.push(args); return { text: 'Stone steps rise between green shrubs.', usage: {} }; } });
  const img0 = sent[0].message[0], txt0 = sent[0].message[1];
  const sentMeta = await sharp(Buffer.from(img0.source.data, 'base64')).metadata();
  chk('Alt text: the model is sent a small copy of the photo (1,024px), not the 6,937px file, with the file name as a hint and its date left off', seen.alt === 'Stone steps rise between green shrubs.' && img0.type === 'image' && img0.source.media_type === 'image/jpeg' && Math.max(sentMeta.width, sentMeta.height) === 1024 && /stone steps leading up through lush green garden"/.test(txt0.text) && !/2026/.test(txt0.text) && sent[0].model === 'm' && sent[0].effort === 'low', J([sentMeta.width, sentMeta.height, txt0.text]), '');
  let describeCalls = 0, describeMode = 'ok';
  const withModel = createImages({
    pool, pageRows: async () => ROWS, readDrive: id => driveStore.read(id), groupsFor: async () => GROUPS, cardsFor: async () => CARDS, heroChoiceFor: async () => 'photo',
    getSite: async () => ({ url: live.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true }),
    getDrive: () => ({ async download() { return big; } }), createLog: id => createDbStore(pool, id),
    describe: async () => { describeCalls++; if (describeMode === 'fail') throw new Error('529 overloaded'); return describeMode === 'empty' ? '' : 'A paved path beside a lawn.'; },
  });
  const auto = await withModel.upload(clientId, { name: 'path.jpg', bytes: big });
  chk('Add a photo with no alt text: Copybot writes it, and says it did', auto.added.alt === 'A paved path beside a lawn.' && auto.added.alt_by === 'copybot' && auto.photos[auto.added.id].shows === 'A paved path beside a lawn.' && describeCalls === 1, J(auto.added), '');
  const typedAlt = await withModel.upload(clientId, { name: 'path2.jpg', bytes: big, alt: 'My own words.' });
  chk('Add a photo with alt text typed: the typed words stand and the model is not asked', typedAlt.added.alt === 'My own words.' && typedAlt.added.alt_by === 'typed' && describeCalls === 1, J(typedAlt.added), '');
  describeMode = 'fail';
  const failedAlt = await withModel.upload(clientId, { name: 'path3.jpg', bytes: big });
  describeMode = 'empty';
  const emptyAlt = await withModel.upload(clientId, { name: 'path4.jpg', bytes: big });
  chk('The model fails or gives nothing usable: the photo is still added, its alt text is left blank, and it says to type it', failedAlt.photos[failedAlt.added.id] && failedAlt.added.alt === '' && /could not write the alt text \(529 overloaded\)/.test(failedAlt.added.alt_error) && emptyAlt.added.alt === '' && /Type it in/.test(emptyAlt.added.alt_error), J([failedAlt.added, emptyAlt.added]), '');
  describeMode = 'ok';
  const rewritten = await withModel.writeAlt(clientId, { file_id: failedAlt.added.id });
  chk('Write it for me: the alt text is written from the copy Copybot kept', rewritten.alt === 'A paved path beside a lawn.' && rewritten.photos[failedAlt.added.id].shows === 'A paved path beside a lawn.', J(rewritten.alt), '');
  chk('Write it for me: not for a Drive photo, and it says so when the server has no model', /Only a photo added by hand/.test(await throwsMsg(() => withModel.writeAlt(clientId, { file_id: 'p1' }))) && /no model to ask/.test(await throwsMsg(() => images.writeAlt(clientId, { file_id: failedAlt.added.id }))), '', '');
  chk('The alt text model is set in page-models.json', require(path.join(root, 'page-models.js')).images().model && require(path.join(root, 'page-models.js')).images().effort === 'low', '', '');

  // The added photo on the site: into the Patio installation page's content slot, which was left empty by hand
  const beforeDownloads = downloads, beforeMedia = fake.state.media.size;
  await images.choose(clientId, { identity: SVC, slot: 'content', file_id: up0.id });
  await images.approve(clientId, { identity: SVC, approved: true });
  const withStock = await images.placePage(clientId, { identity: SVC, confirm: true });
  const stockMedia = media(entry(601).acf.svc_content_image);
  chk('Placed: the added photo goes up at the slot\'s size with its alt text, straight from Copybot (no Drive download)', withStock.ok === true && withStock.uploaded === 1 && downloads === beforeDownloads && fake.state.media.size === beforeMedia + 1 && stockMedia && /-1200\.webp$/.test(stockMedia.file) && stockMedia.alt_text === 'Stone garden steps between planted borders.' && entry(601).acf.svc_content_image_alt === 'Stone garden steps between planted borders.', J([withStock, stockMedia]), '');

  // A crop on the hero
  const heroNow = entry(601).acf.svc_hero_background_image;
  const cropped = await images.crop(clientId, { identity: SVC, slot: 'hero', crop: { x: 0.1, y: 0.2, w: 0.6, h: 0.6 } });
  chk('Crop: the slot carries the box, and the page has to be approved again', J(page(cropped, SVC).slots[0].crop) === J({ x: 0.1, y: 0.2, w: 0.6, h: 0.6 }) && page(cropped, SVC).approved === false, J(page(cropped, SVC).slots[0]), '');
  chk('Crop: a box too small, a slot with no photo and an unknown slot are refused', /too small/.test(await throwsMsg(() => images.crop(clientId, { identity: SVC, slot: 'hero', crop: { x: 0, y: 0, w: 0.01, h: 0.01 } }))) && /no photo in that slot/.test(await throwsMsg(() => images.crop(clientId, { identity: 'service:s3', slot: 'hero', crop: { x: 0, y: 0, w: 0.5, h: 0.5 } }))) && /no such slot/.test(await throwsMsg(() => images.crop(clientId, { identity: SVC, slot: 'banner', crop: { x: 0, y: 0, w: 0.5, h: 0.5 } }))), '', '');
  const prev = await images.preview(clientId, { identity: SVC, slot: 'hero', width: 300 });
  const prevMeta = await sharp(prev.bytes).metadata();
  chk('Crop: the preview is the cropped picture, in the crop\'s own shape', prev.type === 'image/webp' && prevMeta.width <= 300 && Math.abs(prevMeta.width / prevMeta.height - 1.5) < 0.02, J([prevMeta.width, prevMeta.height]), 'about 3:2');
  await images.approve(clientId, { identity: SVC, approved: true });
  const placedCrop = await images.placePage(clientId, { identity: SVC, confirm: true });
  chk('Crop: the cropped picture is a new upload in the hero field; the uncropped one is not reused for it', placedCrop.ok === true && placedCrop.uploaded === 1 && entry(601).acf.svc_hero_background_image !== heroNow && fake.state.media.has(entry(601).acf.svc_hero_background_image), J([placedCrop.uploaded, heroNow, entry(601).acf.svc_hero_background_image]), '');
  const againCrop = await images.placePage(clientId, { identity: SVC, confirm: true });
  chk('Crop: placed again, the cropped upload is reused', againCrop.ok === true && againCrop.uploaded === 0, J(againCrop.uploaded), '0');
  const cleared = await images.crop(clientId, { identity: SVC, slot: 'hero', crop: null });
  chk('Crop: removed, the slot is the whole photo again', !page(cleared, SVC).slots[0].crop, J(page(cleared, SVC).slots[0]), '');
  await images.crop(clientId, { identity: SVC, slot: 'hero', crop: { x: 0.1, y: 0.2, w: 0.6, h: 0.6 } });
  const swappedAway = await images.choose(clientId, { identity: SVC, slot: 'hero', file_id: 'p1' });
  chk('Crop: a different photo put in the slot does not inherit the old photo\'s crop', page(swappedAway, SVC).slots[0].pick === 'p1' && !page(swappedAway, SVC).slots[0].crop, J(page(swappedAway, SVC).slots[0]), '');

  // Failures
  driveDown = true;
  // A photo that has never been a hero, so its 1920px size has to be downloaded and uploaded
  await images.choose(clientId, { identity: TOWN, slot: 'hero', file_id: 'p4' });
  await images.approve(clientId, { identity: TOWN, approved: true });
  const dead = await images.placePage(clientId, { identity: TOWN, confirm: true });
  driveDown = false;
  chk('Drive fails mid page: the page is not written, the run says why, and it is logged as failed', dead.ok === false && /Drive could not give this photo/.test(dead.error) && (await log())[0].result === 'failed', J(dead), '');
  fake.state.failMedia = true;
  const noUpload = await images.placePage(clientId, { identity: TOWN, confirm: true });
  fake.state.failMedia = false;
  chk('The site refuses an upload: the run says why', noUpload.ok === false && /POST \/wp\/v2\/media → 500/.test(noUpload.error), J(noUpload), '');
  const L = await log();
  chk('Every placement, refusal and failure is in the push log', L.every(e => e.action === 'images') && L.some(e => e.result === 'placed') && L.some(e => e.result === 'refused') && L.filter(e => e.result === 'failed').length === 2, J(L.map(e => e.result)), '');

  // ── Wiring ──
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const routes = fs.readFileSync(path.join(root, 'images/routes.js'), 'utf8');
  chk('Server: the images routes are mounted and the tables are made at start-up', server.includes("require('./images/routes').mountImagesApi(app") && fs.readFileSync(path.join(root, 'db.js'), 'utf8').includes("require('./images/service').ensureImageTables(pool)") && ["app.get('/api/clients/:id/images'", "app.put('/api/clients/:id/images/choice'", "app.post('/api/clients/:id/images/approve'", "app.post('/api/clients/:id/images/place'"].every(s => routes.includes(s)), '', '');
  const tab = fs.readFileSync(path.join(root, 'public/app/tabs/images.js'), 'utf8');
  {
    const os = require('os'), cp = require('child_process');
    const tmp = path.join(os.tmpdir(), `copybot-images-tab-${process.pid}.mjs`);
    fs.writeFileSync(tmp, tab);
    let err = '';
    try { cp.execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { err = String(e.stderr || e.message).split('\n').slice(0, 4).join(' '); }
    fs.unlinkSync(tmp);
    chk('Images tab: the script parses, and Place sits behind a confirm', !err && /confirm\(\{ title: `Place images on/.test(tab) && tab.includes("body: { identity: pg.identity, confirm: true }"), err, 'no syntax error');
  }
  const skill = fs.readFileSync(path.join(root, 'skills/gbp-photo-sort/SKILL.md'), 'utf8');
  chk('The sort skill writes the file Copybot reads, with the fields the pick uses', skill.includes(N.NOTES_NAME) && ['"md5"', '"score"', '"hero"', '"shows"', '"service"', '"type"', '"staff_face"'].every(k => skill.includes(k)), '', '');

  live.server.close();
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
