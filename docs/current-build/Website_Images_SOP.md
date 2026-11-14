# Phase X.8 Website Images

**VIDEO EXPLAINER:**

Every page on the customer's website has picture slots: a hero background, a content image, a picture on each card, a gallery, and the owner photo on the homepage. Copybot picks a photo for each slot from the customer's sorted photos. You check the picks, fill the gaps, approve them, and Copybot puts them on the website. Everything is done from the Images tab in Copybot.

**Before you start**

- The customer's photos have been sorted (Phase X - Customer Photo Sort). The sort now also saves a file called photo-notes.json in the customer's photo folder. Copybot needs it: it holds each photo's score and what it shows.
- The customer's pages exist on the staging website. In Copybot, open the customer, go to the Pages tab, find Pages on the site and press Check the site, then Create.
- The copy has been pushed for the pages that have cards (the homepage, category pages and location pages). A card's picture hangs on the card the copy creates.
- You have the Envato Elements login from 1Password.

**If the photos were sorted before 14 November 2026**

The customer's folder will have no photo-notes.json. Get one without sorting again:

- In Drive, download the GBP Photos – Posts folder and the GBP Photos – Photo Drip folder as zips.
- Open a new chat in Claude and type: /gbp-photo-sort [paste the Drive folder link] [business name]
- When Claude asks what you want, choose Notes only.
- Drop the zips into the chat when it asks for them (use Opus 5.5).
- Claude looks at every photo and saves photo-notes.json in the folder. It does not move, copy or delete anything.

⚠️ Never choose Full re-sort or Notes + fix folders for a customer who is already sorted. It makes second copies of every photo and can break posts that are already planned.

**Read the photos into Copybot**

- In Copybot, open the customer and go to the GBP Posts & Photos tab.
- Check the Drive photo folder link is the customer's images folder (the one that holds the three GBP Photos folders).
- Press Read Drive.
- Go to the Images tab. The top line should say how many photos have notes from the photo sort.
- If it says "No photo notes file", stop. Go back and run the Notes only step above, then press Read Drive again.

**Check the picks**

- The tab lists every page with its slots and the photo Copybot picked for each.
- Click any photo to see it full size, with its alt text, score and folder.
- Work down the list. For each page check:
  - The photo shows the right service for that page.
  - There is no customer's face, number plate or house number in it.
  - It is sharp and shows finished work where it can.
- If a photo is wrong, press Swap on that slot:
  - Next best for this slot shows Copybot's runners-up.
  - Every other photo shows the rest. Press See it bigger to check one before you choose it.
  - Leave this slot empty takes the photo out and puts nothing in.
- Use the buttons at the top to see only the pages still To approve, or only those With an empty slot.

**Hero backgrounds**

The top of the tab says what the customer chose on the onboarding form.

- The customer chose a real photo of their work: Copybot puts one of their photos in the hero where there is one good enough. A slot marked Site graphic means there isn't, and the website shows its graphic background there instead. That is fine. Do not put a weak photo in a hero to fill it.
- The tab lists the services that have no hero photo ("Ask the client for a wide, clean shot of the finished work for..."). Send that list to Brandon so he can ask the customer.
- The customer chose an illustration, or gave no answer: every hero says Site graphic. Leave them as they are.

⚠️ Never put a stock photo in a hero for a customer who asked for a real photo of their work.

**Fill empty slots with stock photos**

Only do this for a slot marked Empty where the customer has no photo of that service (for example the Garden Steps card when they sent no photos of steps).

- Go to Envato Elements and search for the service.
- Choose a photo that looks like work the customer could have done:
  - A UK style house or garden.
  - No people's faces, no brand names or logos, no text on the photo.
  - No heavy filters.
- Download it. When Envato asks for a project name, type the customer's business name. Every customer is their own project.
- Any size is fine. Copybot shrinks it.
- In Copybot, press Choose on the empty slot.
- Drag the downloaded file onto Drop a photo here.
  - Leave the alt text box blank. Copybot looks at the photo and writes it.
  - Leave the dropdown on A stock photo.
- Read the alt text in the pop-up. If it is wrong, click the photo, correct it and press Save, or press Write it for me to have Copybot try again.
- The photo now shows under Photos you have added in every Choose box, so you can use it again, for example on that service's own page.

If the customer sends one or two more photos later, add them the same way and set the dropdown to From the client. For a big batch, message Brandon.

**Crop a photo**

- Press Crop on any slot where the framing is off. Always check the owner photo on the homepage.
- Pick a shape, or leave it on Free. For the owner photo choose Owner photo 4:3. For a hero choose Hero 16:9.
- Drag a box over the part to keep. For the owner photo, put the owner's face in the middle of the box.
- The owner photo box on the website is 800 x 600, wider than it is tall. If you don't crop it, Copybot cuts the photo to that shape itself, so always look at how it came out.
- Press Save crop. The slot now shows the cropped picture, and that is what goes on the website.
- Remove crop puts the whole photo back.

**Approve**

- Press Approve on each page once its pictures are right.
- When you have checked the whole list, Approve every page does the rest in one click.
- If you swap, add or crop a photo on a page after approving it, the page goes back to not approved. Approve it again.

**Put them on the website**

- Press Place images on [number] approved pages, then Place them.
- Leave the tab open until it finishes. It works through the pages one at a time.
- When it is done it says how many were placed.
- If any are listed under Not placed, read the reason:
  - "The page is not on the site yet": create the pages first (Pages tab, Pages on the site, Create), then place again.
  - "The page has no cards on the site yet": push that page's copy first, then place again.
- Open two or three pages on the staging website and check the pictures look right.

**Swapping stock for real photos later**

- Slots filled with stock say stock photo under them.
- When the customer sends a real photo of that service, add it to the slot (From the client), approve the page and press Place images again.

**The rules:**

- Nothing goes on the website until a person has approved it.
- The customer's real photos come first. Stock only fills a slot the customer has no photo for.
- Stock photos are for the website only. Never upload stock to the Google Business Profile.
- Never use a photo showing a customer's face, a number plate or a house number.
- An empty slot is better than a wrong photo.
- Every stock photo is downloaded under that customer's own project name on Envato.
- A photo can be on the website and on Google. The "every photo once" rule is about the Google profile only.
- iPhone HEIC files show as "can't go on the site". Ask the customer for JPGs, or message Brandon.
- Icons belong to the website design. Copybot doesn't change them.
- Copybot only places images on a staging website. If it refuses because the site isn't marked as staging, message Brandon.

⚠️ Check before the first customer: with Brandon, that the Envato Elements licence covers customer websites.
