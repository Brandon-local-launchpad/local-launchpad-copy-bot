# Trade facts packs

One research pack per niche: the facts a service page may state (process, signs of failure, rules, bodies, facts, price factors) with sources, researched on Perplexity once per niche, then read by Copybot when it writes service pages.

Files:

- `core.md`: the core research prompt (ask Brandon for it; not in this folder until he adds it)
- `blocks/<niche>.md`: the niche block pasted after the core prompt. The file may wrap the block in a code fence with a note above; only the fenced `=== NICHE BLOCK` part is sent
- `<niche>.md`: the pack the script wrote. First line: `generated <date> · model <model> · verified: no`

Run:

```bash
node scripts/trade-facts.js
```

Every block with no pack is sent to Perplexity (core + block as one user message) and the answer written to `<niche>.md`. `--force` re-runs packs that exist, `--concurrency N` sets parallel calls (default 3), `--dry-run` calls nothing. The key is `PERPLEXITY_API_KEY` (read from `.env`) and is never printed. Perplexity retired the Sonar chat completions endpoint on 27 Sep 2026 and maps the `sonar-deep-research` model to the Agent API `high` preset, so that is what runs (`--preset` changes it).

Verified: a pack is used only after a person has read it and pressed Verify on Copybot's Trade facts page (`/trade-facts.html`). The flag is stored in the database against the pack's fingerprint, so a re-run (new text) makes the pack unverified again; the file's own `verified: no` never changes. Copybot refuses to write a service page for a niche whose pack is missing or unverified; homepage, category and location copy are not affected.

Loader: `trade-facts/pack.js` `packForService(niche, service)` returns, as markdown, the service's rows from Tables A, B and F plus Tables C, D and E in full. This is what the rebuilt service page prompt will receive.

The pack name is the block's file name, the same name as the niche's library CSV (`builder`, `roofer`, `pet-care`, all 28). `packNameFor()` maps a client's niche key, Fillout label or old trade name to it through `niche-library/library.js` keyFor.
