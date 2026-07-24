# Dataset directory

This directory is the single source of truth for every factual claim the app
makes. The four demos refuse to state anything that does not resolve to a
record here.

## Expected contents after acquisition

| File | Produced by | Contents |
|---|---|---|
| `sources.json` | `npm run acquire` | Manifest: every fetched URL, timestamp, HTTP status, content hash, byte size |
| `raw/*.html` | `npm run acquire` | Raw page snapshots (verbatim) |
| `manuals/*.pdf` | `npm run acquire` | User manual / catalogue PDFs (verbatim) |
| `products.json` | `npm run parse` | One record per unit; every field tagged with its exact source URL |
| `manuals-index.json` | `npm run parse` | Parsed manual text with page numbers, for retrieval + citations |
| `parts.json` | `npm run parse` | **Only written if the manuals actually contain article numbers.** If absent, Demo 2 runs in its honest degraded mode (unit identification + manual lookup + pre-filled email to spareparts@scanbox.se). |

## Current state

**The real dataset has NOT been acquired.** The build environment's network
policy blocks all requests to scanbox.se (proxy CONNECT 403 - see the project
README, "What was blocked"). Nothing here is fabricated in its place.

`fixtures/` contains a tiny, obviously-synthetic dataset ("Demo Line" units
that state on every record that they are not ScanBox products). It exists only
so the UI can be exercised. The app shows a persistent banner whenever
fixtures are active, and refuses to run fixtures without that banner.

To acquire the real dataset, run from an environment that can reach
`www.scanbox.se`:

```
npm run acquire   # crawl (robots.txt-aware, rate-limited) -> raw/ + sources.json
npm run parse     # build products.json, manuals-index.json, coverage report
npm run brand     # sample ScanBox's real brand colours into client/brand.css
npm run label     # regenerate the Demo 2 sample label from real specs
```
