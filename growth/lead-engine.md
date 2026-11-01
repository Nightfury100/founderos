# Tripy Lead Engine — autonomous playbook

Run by a scheduled Claude session daily. No paid data required. Read `.agents/product-marketing.md` first.

## Segments (ICP) — in priority order
1. **EVENT** — Event organizers in the GCC (UAE, KSA, Qatar, Bahrain, Oman, Kuwait) with an event in the next 3–9 months and 1,000+ expected attendees: tech, crypto/web3, AI, fintech, gaming, trade shows, festivals. Tripy sells event intelligence (~$200K/mid event) + attendee travel.
2. **SUPPLIER** — Licensed Dubai/UAE tour & desert-safari operators, dhow cruises, attractions that would list inventory on Tripy (marketplace, commission model).
3. **CORPORATE** — Companies sending delegations to GCC events (exhibitors/sponsors of the EVENT leads) — travel packages for teams.

Skip: government (B2G is founder-led), individual travelers, agencies reselling GetYourGuide.

## Sources (public, free)
- WebSearch: "<city> conference 2027", "<topic> summit Dubai 2027", "Riyadh expo 2027 exhibitors", 10times-style event listings, DWTC/ADNEC/Expo City/Riyadh Front event calendars, press releases.
- The event's own website: organizer company, dates, venue, expected attendance, sponsor/exhibitor list, contact/partnership page.
- Supplier leads: `teardowns/dubai-tour-ads/` (operators currently advertising), DET-licensed operator directories, marketplace listings.
- Contact: ONLY published business contacts — the organization's contact/partnership/sponsorship email, published phone/WhatsApp, or a contact form URL. Record the role-based address (partnerships@, events@, info@).
- If the env var `HUNTER_API_KEY` or `ICYPEAS_API_KEY` exists, you MAY look up one named decision-maker email per qualified lead (score ≥ 70) and must store the source.

Do not scrape LinkedIn or social platforms, do not guess personal emails, do not collect data on private individuals beyond name + work title published by the company.

## Qualification score (0–100)
- Fit to segment definition: 0–30
- Timing (event 3–9 months out = 25, 9–12 = 15, <3 = 5): 0–25
- Size (attendees/exhibitors/fleet): 0–20
- Reachable published business contact: 0–15
- Trigger in last 60 days (announced edition, new venue, raised funding, hiring events staff): 0–10
Keep leads ≥ 60. Write the reason in one line.

## Output
Append to `growth/leads/leads.csv` (dedupe on `domain` + `segment`; never duplicate an existing row):
`date_found,segment,organization,domain,country,event_or_offer,event_date,size_signal,contact_type,contact_value,contact_source_url,score,reason,trigger,outreach_status`
- `outreach_status` = `drafted` when a draft exists.

For every lead with score ≥ 70, write a draft to `growth/leads/drafts/<domain>.md`:
- Subject (≤ 7 words), body ≤ 110 words, from Mohammed Ashraf, Founder & CEO, Tripy.
- One specific line about THEIR event/business (with the fact you found), one Tripy proof point that matches (WTS Dubai: 620 active users, 3-hr sessions; 36K users; MOUs with WTS 4.0, AI Lisbon, SBC Summit; Maldives Gov), one ask: a 15-min call.
- Plain text, no hype, no "I hope this finds you well", no "it's not X, it's Y".

## Each run
- Target: 25 new qualified leads per run (at least 15 EVENT).
- Then write `growth/leads/runs/<YYYY-MM-DD>.md`: counts by segment, top 5 leads, sources that worked, anything blocked.
- Commit as "leads: <date> run (+N)" and push to branch `claude/determined-curie-gyy8wn`.

## Sending
Drafts only until a sending setup exists (secondary domain + warmed inbox + sender API key in env as `SENDER_API_KEY`). When it exists: max 30 new emails/inbox/day, 2 follow-ups at +3 and +7 days, stop on any reply, include an opt-out line.
