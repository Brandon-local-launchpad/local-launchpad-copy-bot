'use strict';

// ── Lead Snap autopost: the prompt mix ───────────────────────────────────────
// Code decides which prompts exist, the one angle each carries and its photo folder, so the model
// cannot get the mix wrong (docs/leadsnap/Autopost_Spec.md). One prompt gives nearly the same post
// every time, whatever its wording says (tested 6 Nov 2026), so each prompt has ONE fixed angle and
// variety comes from having up to 20 of them (Brandon, 6 Nov).

const THRESHOLD = 3;
const MAX_PROMPTS = 20;
const TIPS = 3;
const TRUST = 2;
const MAX_OTHER = 2;
const MIN_FOLDERS = 4;
const TOO_FEW = "Too few prompts. Don't start autopost until the client sends more photos.";
const ALL_JOBS = 'All job photos';
const NONE_YET = 'None yet';
const more = n => `${n} more photo${n === 1 ? '' : 's'}`;
// The folder the photo sort skill creates (Brandon, 6 Nov), en dash and all
const POSTS_ROOT = 'GBP Photos – Posts';
const folderOf = f => `${POSTS_ROOT} / ${f}`;

// The model still wrote "the question we hear most" with this angle, so generate.js adds
// QUESTION_RULE to every prompt that has it, word for word (Brandon, 6 Nov)
const QUESTION_ANGLE = 'one practical question answered directly, without saying who asks it or how often';
const QUESTION_RULE = 'Open with the answer or the question itself. Never say how often it is asked or who asks it.';

// In the order a service takes them. A client with few services runs further down the list.
const SERVICE_ANGLES = [
  'the problem customers notice',
  'how the job is done',
  // Not "a common question": that wording had the model write "one of the questions we hear most"
  QUESTION_ANGLE,
  'why doing it properly matters',
  'what to expect when booking',
  'what a good finished job looks like',
  'the mistakes to avoid',
  'how to choose who does the work',
];
const OFFER_ANGLE = 'what the offer includes, who it suits and how to claim it';

// Trust angles need something to stand on, so the facts choose them
function trustAngles(usps = []) {
  const facts = usps.join(' ');
  const list = [];
  if (/\b(trading|years?|since)\b/i.test(facts)) list.push('experience and how long the business has been local');
  if (/\b(registered|accredit\w*|guarantee\w*|insur\w*|member\w*|approved|warrant\w*)\b/i.test(facts)) list.push('the standards the business holds to, from the facts');
  list.push('how we work with customers', 'why choose a local business');
  return list.slice(0, TRUST);
}

function decide(intake) {
  const { groups, brand, offer, usps = [] } = intake;
  const ready = groups.filter(g => g.photos >= THRESHOLD);
  const under = groups.filter(g => g.photos < THRESHOLD);
  const hasBrand = brand >= THRESHOLD;
  const jobPhotos = groups.reduce((n, g) => n + g.photos, 0);
  const brandPool = { folder: folderOf('Brand'), photos: brand };

  // Best job photos: the highest value service with enough, else whichever has the most
  const best = ready[0] || [...groups].sort((a, b) => b.photos - a.photos)[0] || null;
  const bestPool = best && best.photos > 0 ? { folder: folderOf(best.folder), photos: best.photos } : { folder: NONE_YET, photos: 0 };

  // What is left of the 20 after tips, trust and the offer, less the other services prompts
  const fixed = TIPS + TRUST + (offer ? 1 : 0);
  let otherSlots = hasBrand ? Math.min(MAX_OTHER, under.length) : 0;
  let slots = MAX_PROMPTS - fixed - otherSlots;
  if (hasBrand && ready.length > slots && otherSlots < MAX_OTHER) { otherSlots = MAX_OTHER; slots = MAX_PROMPTS - fixed - otherSlots; }

  // Every service with photos gets its first angle before any gets its second, highest value first,
  // so no service with photos is left out while another has three
  const taken = new Map(ready.map(g => [g.key, 0]));
  let used = 0;
  for (let round = 0; round < SERVICE_ANGLES.length && used < slots; round++) {
    for (const g of ready) { if (used >= slots) break; taken.set(g.key, round + 1); used++; }
  }
  const own = ready.filter(g => taken.get(g.key) > 0);
  const overflow = ready.filter(g => !taken.get(g.key));
  const folded = hasBrand ? groups.filter(g => overflow.includes(g) || under.includes(g)) : [];

  const prompts = [];
  // Each service starts one further down the angles, so a client with many services does not get
  // the same angle on every folder
  own.forEach((g, start) => {
    for (let i = 0; i < taken.get(g.key); i++) {
      // A label that groups services: a different one on each prompt, where there are enough
      const service = g.services[i % g.services.length];
      const angle = SERVICE_ANGLES[(start + i) % SERVICE_ANGLES.length];
      prompts.push({ kind: 'service', label: `${g.label}: ${g.services.length > 1 ? `${service.toLowerCase()}, ` : ''}${angle}`, service, services: [service], group: g.services.length > 1 ? g.services.map(s => [s]) : null, angle, folder: folderOf(g.folder), photos: g.photos, why: `${g.photos} photos; ranked by ${g.wanted ? 'what the client wants most' : g.volume ? 'search volume' : 'page map order'}` });
    }
  });
  // Each other services prompt covers one service: the model picks the same one every time when
  // left to choose, so code picks. The rest wait for photos and say so in the notes.
  const otherGroup = folded.map(g => [g.label, ...g.services]);
  folded.slice(0, otherSlots).forEach((g, i) => {
    const service = g.services[0];
    prompts.push({ kind: 'other', label: `Other services: ${service.toLowerCase()}`, service, services: [service], group: otherGroup, angle: SERVICE_ANGLES[(own.length + i) % SERVICE_ANGLES.length], folder: brandPool.folder, photos: brand, why: 'no prompts of its own yet, so it runs on brand photos' });
  });
  for (const angle of trustAngles(usps)) prompts.push({ kind: 'trust', label: `Trust: ${angle}`, service: '', services: [], group: null, angle, folder: hasBrand ? brandPool.folder : bestPool.folder, photos: hasBrand ? brand : bestPool.photos, why: hasBrand ? 'brand photos' : 'no brand photos, so the best job photos' });
  if (offer) prompts.push({ kind: 'offer', label: offer.charAt(0).toUpperCase() + offer.slice(1), service: '', services: [], group: null, angle: OFFER_ANGLE, folder: bestPool.folder, photos: bestPool.photos, why: intake.offerSource === 'free_quotes' ? 'the client has confirmed free quotes' : 'offer confirmed on this tab' });
  for (let i = 1; i <= TIPS; i++) prompts.push({ kind: 'tips', label: `Evergreen tip ${i}`, service: '', services: [], group: null, angle: `tip ${i} of ${TIPS}: a practical, year-round tip for this niche, different from the other tips`, folder: jobPhotos ? ALL_JOBS : NONE_YET, photos: jobPhotos, why: 'all job photos' });

  // Prompts sharing a folder sit together, so the VA selects its photos once and reuses them
  const firstAt = new Map();
  prompts.forEach((p, i) => { if (!firstAt.has(p.folder)) firstAt.set(p.folder, i); });
  const ordered = prompts.map((p, i) => ({ p, i })).sort((a, b) => (firstAt.get(a.p.folder) - firstAt.get(b.p.folder)) || (a.i - b.i)).map(x => x.p);
  // One fixed area per prompt, rotating through the list so every area is used (Brandon, 6 Nov):
  // left to choose, the model picks the same town every time
  const areas = intake.areas || [];
  ordered.forEach((p, i) => { p.n = i + 1; p.area = areas.length ? areas[i % areas.length] : ''; });

  // A service under the threshold is a gap whether or not it is folded in: with photos it can
  // get prompts of its own. One with enough photos that only lost out on a slot is not a gap.
  const gaps = under.map(g => ({ label: g.label, photos: g.photos, key: g.key, services: g.services }));
  const notes = [];
  if (overflow.length && !hasBrand) notes.push(`${overflow.map(g => g.label).join(', ')} ${overflow.length === 1 ? 'has' : 'have'} enough photos, but the 20 prompts are full and there are no brand photos for "other services", so ${overflow.length === 1 ? 'it gets' : 'they get'} no post.`);
  if (!hasBrand && under.length) notes.push(`Fewer than ${THRESHOLD} brand photos, so the services under ${THRESHOLD} photos get no post at all until photos come in.`);
  const waiting = folded.slice(otherSlots);
  if (waiting.length) notes.push(`"Other services" has ${otherSlots} prompt${otherSlots === 1 ? '' : 's'}, so ${waiting.map(g => g.label).join(', ')} get${waiting.length === 1 ? 's' : ''} no post until ${waiting.length === 1 ? 'it has' : 'they have'} ${THRESHOLD} photos of ${waiting.length === 1 ? 'its' : 'their'} own.`);
  if (ordered.length < MAX_PROMPTS) notes.push(`${ordered.length} of ${MAX_PROMPTS} prompts: every service with photos already uses all ${SERVICE_ANGLES.length} angles. More services with photos give more prompts.`);

  // Too few folders means the same few photos on every post, so autopost waits (Brandon, 6 Nov).
  // "All job photos" counts: the VA selects it as a folder. The list says what would add a folder:
  // the highest value services first, then the brand photos.
  const folders = new Set(ordered.map(p => p.folder));
  folders.delete(NONE_YET);
  let tooFew = null;
  if (folders.size < MIN_FOLDERS) {
    const unlock = under.slice(0, MIN_FOLDERS).map(g => `${g.label}: ${more(THRESHOLD - g.photos)} gives it a folder and prompts of its own (${folderOf(g.folder)})`);
    if (!hasBrand) unlock.push(`Brand (team, van, premises, logo): ${more(THRESHOLD - brand)} adds a folder for the trust and "Other services" prompts (${brandPool.folder})`);
    if (!unlock.length) unlock.push('More photos will not add a folder: every service already has its own.');
    tooFew = { message: TOO_FEW, folders: folders.size, unlock };
  }
  return { prompts: ordered, gaps, notes, jobPhotos, folders: folders.size, tooFew };
}

module.exports = { decide, QUESTION_ANGLE, QUESTION_RULE, POSTS_ROOT, THRESHOLD, MAX_PROMPTS, MIN_FOLDERS, TIPS, TRUST, MAX_OTHER, SERVICE_ANGLES, ALL_JOBS, NONE_YET, TOO_FEW };
