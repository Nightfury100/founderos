# Puffy Lux Hybrid — desktop PDP, first fold

A redesign of everything a desktop visitor sees on the Puffy Lux Hybrid product page
before they scroll.

- **Design:** [`index.html`](./index.html) — open it in a browser at ≥1280px wide.
  Self-contained: no build step, no network requests, no external fonts or images.
- **Canvas:** designed at **1920 × 1080**, verified down to **1280 × 800**.
- **Reference:** the current live Puffy Royal PDP first fold (captured 2026-07-30).

---

## 1 · What the fold has to do

A mattress PDP fold has two jobs at once, and most of them only do the first:

1. **Convince** — say what this is and why it costs $1,749.
2. **Transact** — let someone who is already sold pick a size and buy, without scrolling.

The current page does (1) well and (2) badly: on a 1920 × 1080 screen the Add to Cart
button sits at roughly y≈1058 in a 1220px-tall fold, so on any laptop the primary
action is below the fold. This redesign puts size, price, CTA and guarantees **all
above the fold at every desktop size from 1280 × 800 up**.

| Viewport | CTA bottom edge | Guarantee row | Result |
|---|---|---|---|
| 1920 × 1080 | 909px | 941px | fully above fold |
| 1600 × 900  | 803px | 835px | fully above fold |
| 1440 × 900  | 824px | 856px | fully above fold |
| 1366 × 768  | 707px | 734px | fully above fold |
| 1280 × 800  | 707px | 734px | fully above fold |

The only element deliberately allowed to cross the fold on shorter screens is the
Royal upgrade strip — it doubles as the scroll affordance.

---

## 2 · Key design choices, and why they read as luxury

**A 55/45 split, image left, commerce right.** The product gets an uninterrupted
half-screen stage instead of being boxed in a gallery widget. Luxury retail signals
value through *space given to the object*, not through more copy.

**One typeface pairing, used with discipline.** A high-contrast old-style serif for the
product name, price and hero headline; a neutral sans for every piece of UI. Serif =
the thing you are buying. Sans = the machinery of buying it. Mixing them inside a single
element never happens.

**A restrained palette: ink navy, ivory, and a single brass accent.** Puffy's live page
uses green, amber, navy, red and gold badges simultaneously; the eye has nowhere to
rest and everything reads as equally urgent, which is the visual grammar of a discount
site. Here brass appears only on labels and links, green only on the saving, and amber
only in the promo bar — so when something *is* highlighted, it means something.

**Three awards, not five.** Each with the awarding body named above the claim. Five
identical seal-shaped badges read as decoration; three attributed lines read as
citations.

**Hairlines and flat fills instead of shadows and gradients.** Every surface is either
paper or ivory, separated by a 1px rule. The only elevated element on the page is the
price card and the Add to Cart button — elevation is used as a ranking signal, once.

**Specs surfaced as a spec chip on the image.** `12″ · 8 layers · Medium-plush ·
Contour-Adapt™ coils` sits on the photograph itself, so the answer to "why is this the
expensive one" arrives in the same glance as the product.

---

## 3 · Three decisions and their expected impact

### 3.1 The whole purchase block clears the fold — including the guarantee row
*(this is the moment-of-purchase decision)*

Size selector, price, Add to Cart and the three guarantees are laid out as one
uninterrupted block that ends above the fold on every desktop viewport down to
1280 × 800. The vertical rhythm is driven by six CSS custom properties
(`--pad-y`, `--gap`, `--h1`, `--tile-h`, `--cta-h`, `--amt`) that step down at two
height breakpoints, so shorter screens compact rather than overflow.

Crucially the **risk reversal sits under the button, not above it**: *365-night sleep
trial · Free shipping & returns · Lifetime warranty*, then a line of plain-language
delivery and return copy. The objection that stops a $1,749 click is not "what is
this?" — it is "what happens if I hate it?", and that objection arrives *at* the click,
not before it. Answering it beside the button rather than in a trust bar 3,000px down
the page is what converts a considered browser into a cart.

**Expected impact:** add-to-cart rate is the metric here. Removing the scroll
requirement between "I've decided" and "I can act" typically moves ATC on high-consideration
PDPs by a mid-single-digit to low-double-digit percentage; pairing it with adjacent risk
reversal compounds it, because the two objections (find the button, trust the purchase)
are resolved in one fixation rather than two scroll events. Secondary metric: fewer
size-selector abandons, since price updates in place on selection.

### 3.2 The Royal upgrade is offered *after* the CTA, not before it

The live page puts a Lux vs Royal comparison card **above** the size selector, so every
visitor who came for the Lux is asked to reconsider the product before being allowed to
choose a size. That is a decision fork placed directly on the critical path. Here the
upgrade is a single quiet strip below the button: *"Want it even plusher? Puffy Royal
Hybrid — 10 layers · ultra-plush · 5-zoned support foam & coils · +$1,000"*.

**Expected impact:** two effects pulling the same direction. Conversion rate on the Lux
should rise because the primary path is no longer interrupted by a comparison task
(choice deferral is the standard failure mode when a second option is introduced before
commitment). AOV should hold or rise, because the visitors most likely to upgrade are
the ones who scroll past a committed decision — and a $1,000 upsell presented *after* a
$1,749 anchor reads as a 57% increment rather than a fresh spend. Watch conversion rate
and AOV together; the design bets that the product of the two goes up even if the
upgrade attach rate itself dips.

### 3.3 A single half-screen product stage, no thumbnail rail

The reference layout devotes a vertical filmstrip of thumbnails plus arrows to the
gallery, which consumes horizontal space and invites clicking through images instead of
buying. This fold gives the product one large, well-lit stage with no gallery chrome at
all; secondary imagery lives below the fold where exploration belongs.

**Expected impact:** perceived value and time-to-comprehension. A product shown large,
lit, and alone is read as more expensive than the same product shown small in a widget —
this is the oldest finding in retail merchandising and it transfers directly to PDPs.
The measurable proxies are scroll depth (should increase — a strong fold earns the
scroll) and bounce rate on the fold (should fall). Time on page is *not* the right
metric here: this design intends to shorten the path, so a drop in time-on-page paired
with a rise in ATC is the success signal, not a regression.

---

## 4 · The hero image

### 4.1 What is in the file, and why

The requirement is that the hero depicts **the actual Puffy Lux Hybrid**, not a generic
luxury mattress. Two constraints shaped how that was met in this environment:

- `puffy.com`, `cdn.shopify.com` and every mattress retailer domain are **blocked by
  this session's egress policy** (403 at the proxy on `CONNECT`), so Puffy's own product
  photography could not be downloaded.
- No image-generation model is available to this session.

So the hero is a **hand-authored vector build of the Puffy Lux Hybrid**, drawn to the
product's real, identifying construction rather than to a generic mattress silhouette:

| Feature in the artwork | Source |
|---|---|
| 12″ profile, drawn to scale against the 80″ length | Puffy Lux Hybrid spec (12″ H) |
| Quilted euro-top in white, diamond stitch, silver piping | Lux 2.0 quilted euro-top cover |
| Charcoal knit side panel with a woven `Puffy / LUX HYBRID` mark | Lux 2.0 side panel |
| Proportions of top band : side panel : base rail ≈ 4″ : 6″ : 2″ | 12″ build |
| Two plush pillows, medium-plush surface compression | Medium-plush feel |

It is a deterministic, resolution-independent asset with a proper `role="img"`,
`<title>` and `<desc>`, and it costs ~14 KB inline with zero network requests.

### 4.2 The production swap slot

In production the vector build is a placeholder for Puffy's own studio photography of
the Lux. The swap point is the `.stage-art` container in `index.html`:

```html
<div class="stage-art">
  <!-- replace the inline <svg> with: -->
  <picture>
    <source srcset="/img/puffy-lux-hero.avif 1x, /img/puffy-lux-hero@2x.avif 2x" type="image/avif">
    <img src="/img/puffy-lux-hero.jpg"
         alt="Puffy Lux Hybrid mattress, 12-inch quilted euro-top with charcoal knit side panel"
         width="1600" height="1200" fetchpriority="high" decoding="async">
  </picture>
</div>
```

`.stage-art img { width:100%; height:100%; object-fit:cover; object-position:60% 55%; }`
reproduces the framing the `preserveAspectRatio="xMidYMid slice"` currently gives.

### 4.3 The exact AI prompt

This is the prompt intended to be run **image-to-image against Puffy's own Lux product
photograph** — never text-to-image. Text-to-image cannot satisfy "must depict the actual
Puffy Lux Hybrid": a diffusion model has no ground truth for this specific mattress and
will invent a plausible generic one. Image-to-image at low denoise relights and restages
the real product while its geometry, cover, piping and branding stay locked to the
source photograph.

**Model:** any image-to-image / img2img endpoint. **Init image:** Puffy's official Lux
Hybrid product photograph, background removed. **Denoise / image strength:** 0.22–0.30
(above ~0.35 the model starts redesigning the cover — do not exceed it).
**Aspect:** 4:3, 1600 × 1200 minimum. **Seed:** fixed, for reproducible re-runs.

```
Editorial studio product photograph of the Puffy Lux Hybrid mattress, preserving the
source mattress exactly: 12-inch profile, white quilted euro-top with diamond stitching
and silver piping, charcoal knit side panel with the Puffy cloud wordmark, softly
rounded corners. Three-quarter view from slightly above, camera at bed height plus 40cm,
50mm lens, no perspective distortion.

Warm seamless ivory-to-taupe backdrop, no room, no furniture, no headboard. Large soft
key light from the upper left at 45 degrees with a broad silk diffuser, gentle fill from
the right, soft graduated falloff into warm shadow at the frame edges. Contact shadow
and a faint floor reflection beneath the mattress.

Dress with two plush white pillows resting on the upper third of the surface, natural
compression where they meet the quilting. Clean, calm, uncluttered — negative space in
the upper right for headline text.

Photorealistic, high-end furniture catalogue quality, fine fabric texture, subtle film
grain, neutral white balance, 4:3.

Negative prompt: text, watermark, logos other than Puffy, extra pillows, bedding,
blankets, throws, headboard, nightstand, lamp, plants, people, window, hard shadows,
oversaturation, HDR halos, plastic sheen, warped geometry, changed mattress proportions,
altered cover pattern, tufted or button-tufted surface, pillow-top rolled edge.
```

---

## 5 · Accessibility — WCAG 2.1 AA

Verified by rendering the page in Chromium and measuring, not by inspection.

**Contrast (1.4.3).** Every visible text node was located, its *computed* colour read
from the DOM, then all glyphs were made transparent and the page re-rendered so the
actual backdrop pixels behind each text run could be sampled from the compositor —
including text sitting on the hero image and its gradient scrims. **56 of 56 text nodes
pass**, the tightest being 5.12:1 against a 4.5:1 requirement. Full output:
[`audit-report.txt`](./audit-report.txt).

Two findings from that measurement changed the design: the hero's brass accent
originally sat at 2.62:1 over the bright part of the backdrop, so a localised radial
scrim was added under the headline block and the accent lightened to `#E2C273`
(now 6.27:1); and several 10px labels were lifted to 11–12px.

**Non-text contrast (1.4.11).** The selected size tile uses a 2px `#101B2D` border
(16.5:1 against ivory), not the brass hairline that measured 2.92:1.

**Use of colour (1.4.1).** Selection state carries three independent signals — 2px
border, tinted fill, and a checkmark — so it survives monochrome and colour-blind
rendering.

**Keyboard (2.1.1, 2.4.7).** Verified tab order: skip link → brand → nav → cart →
review link → size guide → size group (single tab stop, arrow keys move between
sizes and update price, monthly instalment and dimensions live) → Affirm link →
Add to Cart → upgrade. Every control shows a 3px `#101B2D` focus ring at 3px offset;
controls on the dark navy bar switch the ring to `#F2C14E` (9.37:1) so it stays visible.

**Structure.** One `h1`; the hero headline is marketing copy in a `<p>`, so no heading
level is skipped. Sizes are a `<fieldset>` with a `<legend>`, native radios with real
`<label for>`. The hero `<svg>` carries `role="img"` with `<title>`/`<desc>`; all
decorative icons are `aria-hidden="true" focusable="false"`. Landmarks: `header`,
two labelled `nav`s, `main`, labelled `section`s. Skip link to the purchase panel.

**Preferences.** `prefers-reduced-motion` removes all transitions and the CTA lift;
`prefers-contrast: more` darkens muted text and rules and thickens tile borders.

Not claimed: this has not been run through axe/Lighthouse in CI, and 2.5.8 Target Size
is WCAG 2.2, not 2.1 — three inline text links are under 24px tall, which is exempt
under 2.2 anyway as inline links.

---

## 6 · Content provenance

Real Puffy Lux Hybrid data, sourced from puffy.com and the Puffy Lux review corpus:

- 12″ profile, 8 layers, medium-plush, hybrid
- Cooling Cloud™ gel memory foam · Plush Dual Cloud Foam · Climate Comfort™ foam ·
  Firm Core Support Foam · 6″ individually wrapped Contour-Adapt™ coils
- 4.9 rating, 13,500+ Puffy mattress reviews
- 365-night sleep trial · lifetime warranty · free shipping and returns · assembled in the USA
- Free $315 Signature Pillow with every mattress
- Sizes Twin → Split King; King 76″ × 80″ × 12″, Queen 60″ × 80″ × 12″, Cal King 72″ × 84″ × 12″
- Awards: Healthline *Best Mattresses for Side Sleepers 2025*, Sleep Doctor *Best Hybrid
  for Pressure Relief 2025*, Best Mattress Online *Best Luxury Mattress 2026*
- Royal upgrade: 10 layers, ultra-plush, 5-zoned support foam & coils, +$1,000

**Pricing — read this before shipping.** Only the King price is derived from captured
data: the reference capture shows Puffy Royal King at **$2,749 with code SUMMER** against
a **$4,099** total value, and a **+$1,000** Lux→Royal upgrade, which puts Lux King at
**$1,749 / $3,099** — a $1,350 saving, matching the site-wide promo bar. **Every other
size in the ladder is a plausible placeholder, not captured data.** They live in
`data-price` / `data-was` / `data-dims` attributes on the size radios, which are the
integration seam for the real product feed. The Affirm figure (`$85/mo`) is computed as
`price ÷ 20` at the same effective term implied by the captured Royal page and should be
replaced by Affirm's own quote API.
