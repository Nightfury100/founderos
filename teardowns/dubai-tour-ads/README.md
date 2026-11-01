# Dubai safari & tour operator ads — scan

Goal: every ad currently running in the UAE from desert-safari and tour operators.

Status (2026-11-01): **ads not pulled yet** — this session's network policy blocks
www.facebook.com, adstransparency.google.com and www.google.com (HTTP 403 at the proxy).

Files:
- `advertisers.csv` — seed list of operators from 2026 web listicles. Rankings and domains are
  **unverified** (several lists are written by the operators themselves). Each row has a
  Meta Ad Library (country=AE, active) and Google Ads Transparency (region=AE) link.
- `keyword-searches.csv` — keyword sweeps in the Meta Ad Library for AE, which catch advertisers
  not on the seed list.

Coverage facts:
- Meta Ad Library website shows all active ads delivered in the UAE. The Meta API does NOT return
  non-political ads for non-EU countries, so UAE commercial ads need the website, not the API.
- Google Ads Transparency Center supports region = United Arab Emirates (verified advertisers only).
- TikTok's Commercial Content Library covers only EEA/CH/UK — UAE TikTok ads are not publicly listed.
- Snapchat publishes only a political ads library — UAE commercial Snap ads are not publicly listed.
