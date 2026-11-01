# Installed marketing skills (Tripy CMO toolkit)

Installed 2026-11-01 into `.claude/skills/` (evals folders stripped). Both MIT licensed.

| Source | Commit | Skills |
|---|---|---|
| https://github.com/coreyhaines31/marketingskills (57.8k★) | 88c79f6 | 53 — ads, ad-creative, competitors, competitor-profiling, reverse-engineer-marketing, launch, copywriting, cro, seo-audit, ai-seo, social, influencer-marketing, events, referrals, pricing, … |
| https://github.com/appeeky/aso-skills (2.2k★) | 3919d7c | 40 — aso-router, keyword-research, apple-search-ads, ua-campaign, app-launch, screenshot-optimization, creator-ugc-marketing, localization, … |

Security review before install: no install hooks; only code is `reverse-engineer-marketing/scripts/teardown.mjs` (reads public sources: SEC, ad libraries, Wayback; optional SCRAPECREATORS_API_KEY) and client-side GTM/form tracking snippets. Some ASO skills optionally call the paid Appeeky API.

Shared product context every skill reads: `.agents/product-marketing.md`.

To update: re-clone the repos and copy `skills/*` over this folder.
