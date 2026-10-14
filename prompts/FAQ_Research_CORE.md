# FAQ question research: CORE (v4, per client)

Sent to Perplexity (the same agent API, key and preset as the geo research) once per client by `faq-research.js`, after the area research has finished. Code adds the CLIENT block after this prompt: trade, primary city, the client's other towns, its services by GBP category in homeowner words, the customers' own questions (client value customer_questions), the confirmed client values that matter to customers, the onboarding answers (contact details, links and uploads left out), and the local knowledge from the saved area dossiers (local problems, rules, conservation areas, problems homeowners describe). Built from the v3 trade question bank prompt and the 14 Oct 2026 manual test runs (`docs/seo/current-build/faq-research/`), which added `Page: Location` and `Local`. v4 adds `Service` and `Town`, both chosen from the CLIENT block. How the questions are used: `docs/seo/current-build/FAQ_Framework_and_Perplexity_Prompt.md`.

Everything below the line is the prompt.

---

You are researching the questions UK homeowners ask before hiring a business like the one in the CLIENT block, and while the work is being done. Cover every service in the CLIENT block, from small repairs to the largest jobs, and the towns it works in. Your job is to FIND QUESTIONS, not to write marketing copy or published answers.

USING THE CLIENT BLOCK
- CUSTOMERS' OWN QUESTIONS are already known: do not return them. Search for how people word those questions and for the questions asked alongside them.
- CONFIRMED FACTS and ONBOARDING ANSWERS show what this business does and what its customers care about (for example emergency work, a guarantee, a long travel distance). Use them to choose where to look. They are context only: never put a fact about this business into a question, and never name the business.
- LOCAL KNOWLEDGE lists the local problems, rules and conservation areas the area research found. Local questions should come from these where people genuinely ask about them; search for those questions rather than inventing them.

WHERE TO LOOK
Search for questions people genuinely ask, in their own words:
- Reddit (r/DIYUK, r/HousingUK, r/UKPersonalFinance)
- Mumsnet, MoneySavingExpert forums, Which? guides and community questions
- Google "People also ask" style questions for the trade and for each service in the CLIENT block
- Q&A sections on Checkatrade, MyBuilder, Rated People and Bark
- Government and trade body pages for questions about rules, permissions and certificates in England
- For the towns in the CLIENT block: council pages, local forums and local news about rules, ground, water, weather and building types that change the job
Use UK sources only. Ignore questions that only apply to the US, Australia or elsewhere.

WHAT TO RETURN

## 1. QUESTIONS
30 to 50 distinct questions. Merge near duplicates into one. Spread them across the client's services, not just the most common job. Up to 10 may be local (about one of the client's towns). For each, one line in exactly this format:
- [Q-N] | "question as a customer would type it" | Doubt: Price / Trust / Fit / Process / Timing | Page: Homepage / Category / Service / Location | Service: one category or service name copied exactly from the CLIENT block, or General | Local: Y/N | Town: one town copied exactly from the CLIENT block, or - | Needs client fact: Y/N | Seen: where you saw it and roughly how often (e.g. "Reddit x4, Mumsnet") | [source URL on the same line]

"Needs client fact" is Y when only the business itself can answer it (its prices, deposit, VAT, guarantee, what its quote includes, its process).

Doubt means what the customer is really worried about:
- Price: cost, value, extras, free quotes
- Trust: insurance, guarantees, accreditation, cowboys, what if it goes wrong
- Fit: coverage area, job size, whether this is the right service for their problem
- Process: what happens, disruption, mess, permissions, what they need to do
- Timing: how soon, how long, best time of year

Page means where the question best belongs: Homepage for general questions about choosing and hiring this kind of business; Category for a type of work; Service for one specific job; Location for a question that depends on one of the client's towns.

Local is Y only when the question depends on something about that town (council or conservation rules, local ground or water, coastal or storm exposure, local building types, access or parking). Town names the town; it is - when Local is N.

Then list the 15 most asked questions in rank order, by ID only, under the heading "### 15 most asked".

## 2. RANGES FOUND (for the client to confirm, never to publish)
Any UK price or timescale ranges you find for the client's main jobs, one line each:
- Job | price range or timescale | UK average or region | (dated: month year) | [source URL]
Keep a maximum of 15.

## 3. RULES THAT CUSTOMERS ASK ABOUT
Any planning, building regulations, certification or permission questions you found, with the rule as stated on an official source:
- Question | what the official source says, in one sentence | [official source URL]
Official sources only (gov.uk, Planning Portal, council, trade body or scheme sites). Rules for England; note where Scotland or Wales differ. If you can't find an official source, say so rather than answering.

## 4. GAPS
Anything you looked for and couldn't find, or questions where sources disagree.

RULES
- Put the full source URL after every question, range and rule, on the same line. Never use [1] or [web:3] style markers.
- Prefer forums, Q&A sites, consumer guides and official pages as sources. Use a local competitor's website only when it is the only place a question appears, and say so in Seen.
- Do not write answers to the questions in section 1.
- Do not invent questions. If you only find 20 real ones, return 20.
- Do not name the business in the CLIENT block in any question.
- Mark anything older than 2 years as (dated: month year).
- No marketing language, no intro, no summary. Start with "## 1. QUESTIONS" and end after section 4.
