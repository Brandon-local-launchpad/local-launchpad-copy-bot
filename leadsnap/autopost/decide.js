'use strict';

// ── Lead Snap autopost: the prompt mix ───────────────────────────────────────
// The spec's build rules, in order (docs/leadsnap/Autopost_Spec.md). Code decides which
// prompts exist and which photo folder each uses, so the model cannot get the mix wrong.

const THRESHOLD = 3;
const MAX_SERVICE = 4;
const MAX_PROMPTS = 7;
const MIN_PROMPTS = 4;
const TOO_FEW = "Too few prompts. Don't start autopost until the client sends more photos.";
const ALL_JOBS = 'All job photos';
const more = n => `${n} more photo${n === 1 ? '' : 's'}`;
// The folder the photo sort skill creates (Brandon, 6 Nov), en dash and all
const POSTS_ROOT = 'GBP Photos – Posts';
const folderOf = f => `${POSTS_ROOT} / ${f}`;

function decide(intake) {
  const { groups, brand, offer } = intake;
  const ready = groups.filter(g => g.photos >= THRESHOLD);
  const under = groups.filter(g => g.photos < THRESHOLD);
  const hasBrand = brand >= THRESHOLD;
  const jobPhotos = groups.reduce((n, g) => n + g.photos, 0);
  const brandPool = { folder: folderOf('Brand'), photos: brand };

  // Best job photos: the highest value service with enough, else whichever has the most
  const best = ready[0] || [...groups].sort((a, b) => b.photos - a.photos)[0] || null;
  const bestPool = best && best.photos > 0 ? { folder: folderOf(best.folder), photos: best.photos } : { folder: 'None yet', photos: 0 };

  // Trust, tips and a confirmed offer always have their slots. "Other services" exists when
  // anything is left over and brand photos exist, and takes a slot from the service prompts
  // if the total would pass 7.
  let serviceSlots = Math.min(MAX_SERVICE, ready.length);
  const fixed = 2 + (offer ? 1 : 0);
  const wouldHaveOther = hasBrand && (under.length > 0 || ready.length > serviceSlots);
  if (serviceSlots + fixed + (wouldHaveOther ? 1 : 0) > MAX_PROMPTS) serviceSlots = MAX_PROMPTS - fixed - 1;
  const own = ready.slice(0, serviceSlots);
  const overflow = ready.slice(serviceSlots);
  const folded = hasBrand ? groups.filter(g => overflow.includes(g) || under.includes(g)) : [];

  const prompts = [];
  for (const g of own) prompts.push({ kind: 'service', label: g.label, services: g.services, folder: folderOf(g.folder), photos: g.photos, why: `${g.photos} photos; ranked by ${g.wanted ? 'what the client wants most' : g.volume ? 'search volume' : 'page map order'}` });
  if (folded.length) prompts.push({ kind: 'other', label: 'Other services', services: folded.map(g => g.label), covers: folded.map(g => ({ label: g.label, services: g.services })), folder: brandPool.folder, photos: brand, why: `${folded.length} service${folded.length === 1 ? '' : 's'} without a prompt of their own, on brand photos` });
  prompts.push({ kind: 'trust', label: 'Trust / why us', services: [], folder: hasBrand ? brandPool.folder : bestPool.folder, photos: hasBrand ? brand : bestPool.photos, why: hasBrand ? 'always; brand photos' : 'always; no brand photos, so the best job photos' });
  if (offer) prompts.push({ kind: 'offer', label: offer.charAt(0).toUpperCase() + offer.slice(1), services: [], folder: bestPool.folder, photos: bestPool.photos, why: intake.offerSource === 'free_quotes' ? 'the client has confirmed free quotes' : 'offer confirmed on this tab' });
  prompts.push({ kind: 'tips', label: 'Evergreen tips', services: [], folder: jobPhotos ? ALL_JOBS : 'None yet', photos: jobPhotos, why: 'always; all job photos' });
  prompts.forEach((p, i) => { p.n = i + 1; });

  // A service under the threshold is a gap whether or not it is folded in: with photos it can
  // get its own prompt. One with enough photos that only lost out on a slot is not a gap.
  const gaps = under.map(g => ({ label: g.label, photos: g.photos, key: g.key, services: g.services }));
  const notes = [];
  if (overflow.length && !hasBrand) notes.push(`${overflow.map(g => g.label).join(', ')} ${overflow.length === 1 ? 'has' : 'have'} enough photos, but the top ${own.length} services took the service prompts and there are no brand photos for an "other services" prompt, so ${overflow.length === 1 ? 'it gets' : 'they get'} no post.`);
  if (!hasBrand && under.length) notes.push(`Fewer than ${THRESHOLD} brand photos, so the services under ${THRESHOLD} photos get no post at all until photos come in.`);
  if (prompts.length === MIN_PROMPTS) notes.push(`Only ${prompts.length} prompts; the spec aims for 5 to 7. More photos give more prompts.`);
  // Under 4 prompts the same few posts repeat, so autopost waits (Brandon, 6 Nov). The list says
  // which photos would add a prompt: the highest value services first, while service slots are
  // free, then the brand photos that open up "Other services".
  let tooFew = null;
  if (prompts.length < MIN_PROMPTS) {
    const unlock = under.slice(0, MAX_SERVICE - own.length).map(g => `${g.label}: ${more(THRESHOLD - g.photos)} gives it its own prompt (${folderOf(g.folder)})`);
    if (!hasBrand && under.length) unlock.push(`Brand (team, van, premises, logo): ${more(THRESHOLD - brand)} adds an "Other services" prompt (${brandPool.folder})`);
    if (!unlock.length) unlock.push('More photos will not add a prompt: every service already has its own. A standing offer typed below would add one.');
    tooFew = { message: TOO_FEW, unlock };
  }
  return { prompts, gaps, notes, jobPhotos, tooFew };
}

module.exports = { decide, POSTS_ROOT, THRESHOLD, MAX_PROMPTS, MIN_PROMPTS, MAX_SERVICE, ALL_JOBS, TOO_FEW };
