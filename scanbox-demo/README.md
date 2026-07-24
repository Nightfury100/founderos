# ScanBox AI Demo Suite

Four working AI demos for pitching to ScanBox Thermoproducts AB, built so that
**no demo can state anything about ScanBox products that does not resolve to a
record in the scraped dataset**. One deployable app, one command, no login.

```
cd scanbox-demo
npm install
npm start          # http://localhost:4173
```

Optional: `ANTHROPIC_API_KEY` in the environment enables free-text needs
parsing (Demo 1) and label vision (Demo 2). Without it, deterministic
fallbacks run and the UI says so — grounding, validation and refusal behaviour
are identical either way.

## Deploy to Cloudflare (optional, one command)

The same app ships as a Cloudflare Worker (`worker/` + `wrangler.jsonc`):

```
npm run deploy     # bundles the active dataset, then wrangler deploy
```

First run opens a browser login to your Cloudflare account, then prints a
public `https://scanbox-ai-demo.<your-subdomain>.workers.dev` URL. To serve it
on your own domain, either uncomment the `routes` block in `wrangler.jsonc`
(any zone already on your Cloudflare account) and redeploy, or use the
dashboard: Workers & Pages → scanbox-ai-demo → Settings → Domains & Routes →
Add custom domain.

Notes: the Worker bundles whichever dataset exists at deploy time (real if
acquired, otherwise the labelled fixture — re-run `npm run deploy` after
acquisition). Set the model key with `npx wrangler secret put
ANTHROPIC_API_KEY` if you want the LLM features live; without it the
deterministic fallbacks run, same as locally.

---

## What was blocked (read this first)

**Phase 1 (data acquisition) could not be completed in the build environment.**
Its egress proxy denies ALL general web hosts — `www.scanbox.se`, and even
`example.com` — with a CONNECT 403 ("policy denial"). Only package registries
and a handful of allowlisted services are reachable. WebFetch-style tooling
rides the same proxy and fails identically. The user's Google Drive/Gmail were
checked for ScanBox material: none found.

Per the rules of engagement, **the gap was not filled with plausible content**:

- `data/products.json`, `manuals/`, `sources.json` **do not exist yet**.
- The complete acquisition pipeline **does** exist and is ready to run from any
  machine that can reach scanbox.se:
  `npm run acquire && npm run parse && npm run brand && npm run label`
  (robots.txt-aware, rate-limited ≥1.5 s/request, content-hashed manifest,
  coverage report that shows gaps rather than papering over them).
- `pipeline/seeds.json` contains real scanbox.se URLs collected from the web
  search index (the one reachable channel), marked "search index, unverified".
- The app currently runs on a tiny **synthetic fixture dataset** ("Demo Line"
  units that state on every record and on-screen that they are not ScanBox
  products), purely so the UI and grounding architecture are demonstrable. A
  persistent banner marks fixture mode. **Do not pitch on fixture data.**

## Architecture

```
client/  static SPA (no build step): sidebar nav, 4 workspaces, all states designed
server/  Express
  grounding.mjs   THE control layer - dataset load, unit-id validation,
                  field lookup, price/competitor guards, BM25 retrieval + floor
  demos.mjs       the four pipelines (all factual flow goes through grounding)
  llm.mjs         optional Anthropic calls (strict tool use only)
  docx.mjs        dependency-free .docx writer for the tender export
pipeline/ acquisition: crawler, parser, brand sampler, sample-label generator
data/     the dataset (see data/README.md) + clearly-labelled fixtures
qa/       adversarial suite (34 tests) + generated QA_REPORT.md
```

## How zero-hallucination is enforced (as architecture, not prompts)

1. **Retrieval-only.** The model never writes factual sentences. Demo 4 is
   fully *extractive*: answers are verbatim manual passages with page-level
   citation chips. Demos 1 and 3 compose text from deterministic templates
   around values *looked up* from `products.json`.
2. **Schema-validated output.** LLM output is strict tool use
   (`additionalProperties: false`) that returns structure, not prose. Every
   unit id passes `validateUnitIds()`: ids not in the dataset are dropped,
   logged, and surfaced in the UI as "dropped by validator" — never rendered.
   (QA #29 proves it.)
3. **Numbers are never generated.** `lookupField()` is the only path to a
   spec value. A missing field renders exactly
   `Not specified in ScanBox documentation` (localized in tender output).
4. **No prices.** A multilingual price/cost/margin guard short-circuits before
   any model call: "ScanBox does not publish pricing — request a quote."
   (QA #1-5, #34.)
5. **Visible grounding.** Every output has a source panel: which fields, which
   passages, which URLs, and how the needs were extracted.
6. **Refusal path.** Retrieval must clear a score floor AND match ≥2
   content-bearing query terms in the top passage; otherwise an explicit
   "this isn't in ScanBox's published material" + the real support contact
   (spareparts@scanbox.se, 08:00-16:00 CET). Demonstrable live (QA #11-19).
7. **Determinism.** The brief asked for temperature 0-0.2. On the current
   Claude API generation the `temperature` parameter has been **removed**;
   determinism is enforced the stronger way — schema-constrained structured
   output plus lookup-only facts. Flagged here as a deviation from the letter
   of the spec, in favour of its intent.
8. **No invented context.** No testimonials, ROI figures, customer logos, or
   claims about ScanBox internals anywhere in the UI or copy.

## Demo-by-demo status

| Demo | Status | Honest limitation shown in UI |
|---|---|---|
| 1 Needs Advisor | Working (deterministic recommender + optional LLM parsing; ≤3 clarifying questions; quote basket; "ScanBox today" facet filter reproduced for contrast) | Quantity is only computed when capacity is documented; otherwise says so |
| 2 Spare Parts | Working, **degraded by design**: no parts data exists until manuals are parsed; runs as unit ID + manual lookup + pre-filled request to the real spareparts@scanbox.se flow | Degradation banner; sample label has "SAMPLE — NOT A REAL LABEL" baked into the image plus a UI badge |
| 3 Tender Generator | Working: sv/en/fr/de templates, values looked up only, source-field panel, copy + .docx export (minimal OOXML, no deps) | Missing values render the localized "not specified" string |
| 4 Support Assistant | Working: extractive RAG over the manual index, SSE streaming, per-passage citation chips, refusal path | With fixture corpus, only fixture passages are retrievable (labelled) |

## Assumptions & known limitations (flagged, per the brief)

- **HTML selectors in `pipeline/parse.mjs` are heuristic** (JSON-LD, spec
  tables, `<h1>`) because they were written before any page could be fetched.
  After the first crawl, inspect `data/raw/` and tighten them. The parser
  fails loudly (empty dataset + coverage report), never silently.
- **Brand palette is a placeholder** (neutral + one steel-blue accent). The
  brief says sample, don't invent — `npm run brand` samples the real site's
  CSS when reachable; until then `client/brand.css` says so in a comment.
- **parts.json** is only written if manuals actually contain article numbers
  (`npm run parse` checks; the coverage report states the outcome). Demo 2's
  degraded mode is the default assumption, per the brief.
- **Support contact details** (spareparts@scanbox.se, 08:00-16:00 CET) come
  from the project brief's owner-verified facts, tagged as such in code.
- **Facet filter reproduction** (Function / Model / Tray system options) also
  comes from the brief's verified description of scanbox.se/en/products; it
  should be re-verified against the crawled selector page.
- The BM25 floor (1.0 + ≥2 content-term match) is tuned against the fixture
  corpus; re-tune after real acquisition (QA suite automates the check).
- `.docx` export is minimal OOXML (title/paragraph runs) — it opens in Word/
  LibreOffice; it is not a styled template.

## QA

`npm run qa` runs 34 adversarial tests (all the mandated traps included) and
writes `qa/QA_REPORT.md`. Current run: **34/34 pass** against the fixture
corpus — which validates the *architecture* (guards, validation, refusal,
honest missing values). Re-run after real acquisition to validate corpus
coverage; the report header states its scope explicitly.

## Deliverables map

1. Working app — `npm start` (this directory)
2. Dataset + manifest — `data/` (pipeline ready; real data blocked, see above)
3. README — this file
4. QA report — `qa/QA_REPORT.md`
5. 3-minute demo script — `DEMO_SCRIPT.md`
