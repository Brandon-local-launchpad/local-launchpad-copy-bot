---
name: "gbp-photo-sort"
description: "Sort a client's job photos into GBP Posts (one subfolder per Lead Snap service label, plus Brand), Photo Drip and Rejected folders in Google Drive for LeadSnap, removing duplicates and burst shots, and write the photo notes file Copybot uses to pick website images. Use when onboarding a client's photos."
---

# GBP photo sort (Local Launchpad)

One-time job at client signup. Turns a dump of client photos into LeadSnap content:

- **Posts:** photos sorted into one subfolder per service, using the exact labels from the client's Lead Snap tab in Copybot, plus a Brand subfolder. Each Lead Snap autopost prompt draws from one subfolder.
- **Photo Drip:** up to 104 photos (2 a week), each used once only.
- **Photo notes:** one file, `photo-notes.json`, saying what each photo shows and how good it is. Copybot reads it to pick the pictures for the client's website pages. The folders stay exactly as they are.

## Inputs

- The Google Drive folder link for the client's photos (usually `GBP Photos – All` or the folder the client uploaded to).
- The client's business name.
- **The Lead Snap service labels**, copied from the client's Lead Snap tab in Copybot: each label (one or two words, e.g. `Patios`) and the full service names behind it (e.g. `Patios: patio installation, patio cleaning, porcelain patios`). If the user hasn't given them, ask for them before Step 3. Never invent labels or rename them: the folder names must match the tab exactly, or the VA won't find them.

## A client whose photos are already sorted: notes only

If the client's photo folder already has `GBP Photos – Posts`, `GBP Photos – Photo Drip` and `GBP Photos – Rejected` from an earlier sort, and the user asks for the photo notes (or says the photos are already sorted), do **not** sort again. Sorting twice makes second copies of every photo and second folders with the same names.

Instead:

1. Do not create a folder, and do not copy, move or bin any photo.
2. List the photos in each Posts subfolder, in `Brand` and in Photo Drip, with the Drive connector. The folder a photo is in now is its `folder`, and for a Posts subfolder its `service`: a person may have moved it since the sort, and they were right.
3. Get the photos as in Step 1 (ask the user to download `GBP Photos – Posts` and `GBP Photos – Photo Drip` as zips), run the MD5 from Step 2, and review every photo by eye as in Step 3, for the score, hero, what it shows, staff face and type only.
4. A Photo Drip photo gets a `service` label only when the work is clearly that service, otherwise `Unclear`. It stays in Photo Drip either way.
5. Leave the Rejected folder out: no entries for it.
6. Write `photo-notes.json` as in Step 6, and report as in Step 7, the photo notes line only.

## Step 1: Get the photos

The Drive connector can list and copy files but cannot hand over 100+ images for viewing, and it **cannot move or rename existing files** (it only changes files it created). So:

1. Use the Drive connector to list the folder (search `parentId = '<folder id>' and mimeType contains 'image/'`, page through with pageToken, pageSize 80). Save a mapping of file name to file ID.
2. Ask the user to download the folder as a zip from Drive (right-click > Download) and drop it in the chat. Over ~200 MB: split into two zips.
3. Unzip into its own empty directory in the scratchpad.

## Step 2: Automatic checks (Python)

Install `imagehash` if missing (`pip install --break-system-packages imagehash`). For each photo (apply EXIF rotation first):

- MD5 and perceptual hash (phash). Distance <= 8 or same MD5 = exact duplicate.
- Brightness (grayscale mean). Under 55 = flag as dark (do not auto-reject; evening-lit shots are often the best).
- Blur (Laplacian variance on an 800px-wide copy). Under 60 = flag.
- Size: shortest side under 720px = reject. Over 5 MB = note (LeadSnap may need it smaller).

Hashes do NOT catch burst shots taken from a slightly different angle. That is done by eye in Step 3.

## Step 3: Review every photo by eye

Build contact sheets of 16 photos (4 columns, 400px tiles, file number in a yellow label top left), in file-number order so bursts sit next to each other. Read every sheet. Note for each photo:

- **Type:** finished job / before-after / work in progress / team / van / premises / logo / detail / reject.
- **Score, 1 to 10:** how good the photo is as a picture of the work. 9 or 10: sharp, well lit, the finished job fills the frame, a tidy site, nothing distracting. 6 to 8: a good clear photo. 5 or under: usable, but soft, cluttered, badly framed or unfinished. Score every photo you keep, on the same scale across the whole set, so the best one in a folder is clear.
- **Hero:** yes or no. Yes only when the photo is wider than it is tall, at least 1600px wide, the finished work fills the frame, and there is no person, van or text in the middle. It goes full width behind a heading, so a busy or tight photo is a no.
- **What it shows:** one plain sentence of what is in the photo, 15 words or fewer, as you would describe it to someone who can't see it: `A porcelain patio with a raised sleeper bed along the fence.` Only what is visible. No town, no business name, no praise ("stunning", "quality"), no guess at what you can't see.
- **Staff face:** yes if a team member's face can be made out.
- **Pair:** for a before-after, the file number of the other photo of the same job, when both are kept.
- **Service label:** which Lead Snap label the work shows, using the full service names to decide (a stump grinding shot goes under `Trees` if that label covers tree stump removal). Only tag a label when the work is clearly that service. If it could be two services or you can't tell, tag it `Unclear`. A mismatched photo on a post looks worse than no post.

Reject:
- Burst groups and near-duplicates: same scene, same moment, slightly different angle or crop. Keep the single best shot of each group (sharpest, cleanest, no arm or thumb in shot, finished state). Compare neighbours carefully; this is the step most likely to be missed.
- Readable number plates, customers' faces, house numbers.
- Screenshots (black bars), photos of feet, mostly sky/field/road/cars, fog, empty fields with tools.
- Blurry or too dark to see the work (keep deliberate evening-lit shots of finished work).
- Stock images, heavy filters, text or logos added on top.

Team members' faces are fine (they are staff, not customers).

## Step 4: Split

Posts first, then Photo Drip.

1. **Service subfolders:** every finished job, before-after and strong work-in-progress shot with a clear service label goes into that label's Posts subfolder. Put as many good photos in each as there are: Lead Snap rotates photos within a prompt, so a deeper pool means fewer repeats. No upper limit per label.
2. **Brand subfolder:** the best 6–10 team, van, premises and logo shots. These feed the Trust and Other services prompts.
3. **Photo Drip, up to 104:** `Unclear` job photos, remaining team/van/detail shots, and anything left over.
4. Only create subfolders for labels that have at least one photo. A label with no photos gets no folder; list it in the report instead.

Write the decision as a list of file numbers per folder (and per subfolder) plus a reason for every reject, and check the totals add up to the number of photos.

## Step 5: Organise Drive

1. Create three folders inside the client's photo folder: `GBP Photos – Posts`, `GBP Photos – Photo Drip`, `GBP Photos – Rejected`.
2. Inside `GBP Photos – Posts`, create one subfolder per label that has photos, named exactly as the label (e.g. `Patios`, `Leak repair`), plus `Brand`.
3. Copy (`copy_file`, same title, parentId = target folder) each original into its folder. Do not try `update_file` to move: it fails with "The caller does not have permission" even when the user owns the files.
4. Run copies in parallel batches of about 20.
5. If a copy later needs taking out of a folder, use `trash_file` on that copy (it goes to the bin, recoverable), then copy the original into the right folder (or Rejected).
6. Never trash or alter the user's original files.

## Step 6: Write the photo notes

Copybot picks the website pictures from this file, so write it for every sort. It is what you noted in Step 3, saved; don't look at the photos again.

Create one file named `photo-notes.json` in the client's photo folder (the folder that holds the three `GBP Photos` folders, not inside one of them). If a `photo-notes.json` is already there from an earlier sort, read it first and keep its entries for photos you did not sort this time.

```json
{
  "version": 1,
  "client": "Edens Edge Landscaping",
  "sorted_on": "2026-11-13",
  "labels": ["Patios", "Fencing", "Trees"],
  "photos": [
    {
      "name": "IMG_2041.jpg",
      "md5": "9e107d9d372bb6826bd81d3542a419d6",
      "folder": "Posts/Patios",
      "type": "finished job",
      "service": "Patios",
      "score": 9,
      "hero": true,
      "shows": "A porcelain patio with a raised sleeper bed along the fence.",
      "staff_face": false,
      "pair": ""
    },
    {
      "name": "IMG_2077.jpg",
      "md5": "45c48cce2e2d7fbdea1afc51c7c6ad26",
      "folder": "Rejected",
      "type": "reject",
      "reject_reason": "burst duplicate of IMG_2076.jpg"
    }
  ]
}
```

Rules for the file:

- **One entry for every photo you looked at**, rejects included, so the count of entries is the count of photos.
- `name` is the file name exactly as it is in Drive. `md5` is the MD5 from Step 2: Copybot matches a photo by it, so it must be the real one, never made up. Leave `md5` as `""` if you don't have it.
- `folder` is where the copy went: `Posts/<label>`, `Posts/Brand`, `Photo Drip` or `Rejected`.
- `type` is one of: `finished job`, `before-after`, `work in progress`, `team`, `van`, `premises`, `logo`, `detail`, `reject`.
- `service` is one of the labels in `labels`, spelled exactly, or `Unclear`, or `""` for a team, van, premises or logo shot. The same rule as Step 3: a label only when the work is clearly that service.
- `score` is a whole number 1 to 10. `hero` and `staff_face` are `true` or `false`. `pair` is the other photo's file name, or `""`.
- A reject needs only `name`, `md5`, `folder`, `type` and `reject_reason`.
- Valid JSON: check it parses before you save it.

Save it with the Drive connector's `create_file` (title `photo-notes.json`, the JSON as its text content, parentId = the client's photo folder). If the connector can't create a plain file there, give the user the file to download and ask them to drop it into the client's photo folder in Drive.

If the VA later drags a photo into a different service folder, that is fine: Copybot takes the service from the folder the photo is in, and everything else from this file.

## Step 7: Report

Reply with:

- **Photo counts for the Lead Snap tab**, in the tab's label order, ready for the VA to type in: one line per label (`Patios: 7`), then `Brand: 6`. Include labels with 0.
- **Prompt readiness:** which labels have 3+ photos (enough for their own prompt) and which don't. For each that doesn't, say how many more photos to ask the client for and what to shoot (e.g. `Fencing: 2 more, finished fence runs from the front`). Same for Brand if under 3.
- Photo Drip count and weeks covered at 2 a week. If under 52 weeks, say how many more photos to ask the client for.
- Rejects grouped by reason with file numbers, so the user can overrule.
- Links to the three main folders.
- **Photo notes:** that `photo-notes.json` is saved in the client's photo folder, how many photos it covers, how many are marked as heroes, and any service label with no hero (a wide, clean shot of the finished work is worth asking the client for).
- One line: originals are untouched in the main folder; upload to LeadSnap from the sorted folders only.

Then the VA spends 10 minutes scrolling the Posts subfolders and Photo Drip in Drive grid view, drags out anything in the wrong service folder, types the counts into the Lead Snap tab and generates the config. In LeadSnap: Photo Drip, set category per row and spread dates over 52 weeks; Auto Post, upload each prompt's photos from the subfolder the config names.
