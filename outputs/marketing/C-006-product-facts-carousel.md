# C-006 — Product facts carousel

Status: Final carousel approved by Brand; founder publish approval required

## Final production evidence — 2026-09-24

- Final exports: `C-006-product-facts-carousel-1.png` through `C-006-product-facts-carousel-5.png` (1080 × 1350 each).
- Review sheet: `C-006-product-facts-carousel-review-sheet.png`.
- Reproducible source: `C-006-carousel-source.html` and `scripts/render-c006-carousel.mjs`.
- Typography: local Playfair Display 600 and DM Sans 600/700 font files from `outputs/marketing/fonts`.
- Product imagery: only the approved cover art, demo poster, and three frames from the real demo video at 2.5, 8.5, and 15.5 seconds.
- Visual QA: passed for headline and disclosure readability, safe-area placement, factual qualifiers, CTA visibility, real-asset fidelity, and absence of unapproved claims.
- Approval note: Brand approved the final five-slide export on 2026-09-24. Keep the campaign Draft and do not publish until every remaining release gate below is satisfied.

## Objective

Qualify pre-launch interest with a factual, Etsy-oriented product overview that sends 200 visitors to the product-details page and earns 8 verified feedback-intent conversions. Pen Pad Golf is in development; this package does not imply that the product or an Etsy listing is available.

## Audience

Golfers, tabletop-game fans, gift shoppers, and tactile-game players evaluating what Pen Pad Golf is, how it works, its target price, and where it is intended to launch.

## Platform-ready copy

### Instagram carousel caption

What is Pen Pad Golf? A printed tabletop golf game played with a pen. ⛳

Start in the tee box. Stand your pen upright. Flick toward the hole. Mark where it lands as one stroke. Keep going from the new mark—lowest score wins.

Pen Pad Golf is in development, with a target price of $12 and Etsy planned as the first launch channel. See the current product details and tell us what you think.

**Primary CTA:** See product details.

**Secondary CTA:** Already playtested? Share feedback.

**Hashtags:** #PenPadGolf #TabletopGames #GolfGames #GameInDevelopment

### Pinterest pin

**Title:** Pen Pad Golf: tabletop golf played with a pen

**Description:** Pen Pad Golf turns a pen and a printed course into a quick round of golf you can play almost anywhere. Stand it. Flick it. Mark it. Lowest score wins. In development; see the current product details and gameplay demonstration.

**CTA:** See product details.

### Etsy pre-launch copy — hold, do not publish

**Headline:** A little golf. A lot of fun.

**Body:** Pen Pad Golf is a printed tabletop golf game played with a pen. Start in the tee box, stand the pen upright, flick toward the hole, and mark every landing as one stroke. Lowest score wins.

This is planning copy only. Do not create or publish a live Etsy listing until product availability, shop setup, final listing assets, and founder publish approval are verified.

## Creative direction

Format: 5-slide, 1080 × 1350 carousel. Build every product-bearing frame from the approved real assets; do not generate or redraw the physical product.

| Slide | Visual | On-screen copy | Purpose |
| --- | --- | --- | --- |
| 1 | Full-bleed crop of `PPG_site/assets/pen-pad-golf-cover-hero.png` with a paper-colored text panel. | “What is Pen Pad Golf?” / “Tabletop golf played with a pen.” | Establish the category without implying availability. |
| 2 | `PPG_site/assets/pen-pad-golf-demo-poster.jpg`, preserving the hand, pen, flag, and course. | “Stand it. Flick it. Mark it.” | Show the tactile mechanic. |
| 3 | Three real stills extracted from `PPG_site/assets/pen-pad-golf-demo.mp4`: upright pen, flick, landing/mark. | “Every landing = 1 stroke.” / “Lowest score wins.” | Explain scoring literally. |
| 4 | Reuse the approved cover art with a compact fact card. | “Printed tabletop golf game” / “Target price: $12” / “Planned launch channel: Etsy” | Qualify pre-launch demand with approved facts. |
| 5 | Cover-art crop with generous paper space. | “A little golf. A lot of fun.” / “See product details” / “In development” | Close with the approved promise, CTA, and disclosure. |

### Visual system

- Playfair Display, weight 600, for slide headlines and the master promise.
- DM Sans, weight 500–700, for factual text, CTA, and disclosure.
- Paper `#F7F1E4`, ink `#193225`, green `#31543B`, and olive `#667A47`; use gold `#9B7319` or rust `#9C3F2C` only as restrained accents.
- Preserve the webpage's printed-paper texture and watercolor character.
- Keep text clear of the pen, hand, flag, course path, landing point, and scoring marks.
- Use clean crops and static panels. Do not add glossy gradients, neon color, fake packaging, badges, star ratings, urgency devices, or promotional price treatments.

## Real-product and claims constraints

- Use only `pen-pad-golf-cover-hero.png`, `pen-pad-golf-demo-poster.jpg`, and real frames from `pen-pad-golf-demo.mp4` for product representation.
- Do not fabricate, extend, recolor, or materially alter the course, hand, pen action, cover art, or gameplay result.
- “$12” must always be labeled **target price**, not a live selling price.
- “Etsy” must always be described as the **planned** or **first intended** launch channel, not a live shop.
- Keep “In development” visible on the closing slide and in any standalone adaptation.
- Do not add claims about availability, launch date, shipping, durability, age range, reviews, testimonials, popularity, or performance.

## CTA and tracked destinations

The founder approved `https://ajhoagland2.github.io/PPG_site/` as the temporary public destination on 2026-10-02. The former `/product.html` route returned a GitHub Pages 404, so these links intentionally use the verified homepage. The live feedback form still contains Formspree's `YOUR_FORM_ID` placeholder, and no analytics script was detected; configure both before release. The local files are staging references only and must never appear in a public post.

- Instagram: `https://ajhoagland2.github.io/PPG_site/?utm_source=instagram&utm_medium=organic_social&utm_campaign=ppg_product_facts_carousel&utm_content=product_facts_carousel_v1#how-to-play`
- Pinterest: `https://ajhoagland2.github.io/PPG_site/?utm_source=pinterest&utm_medium=organic_social&utm_campaign=ppg_product_facts_carousel&utm_content=product_facts_pin_v1#how-to-play`
- Future approved Etsy surface: `https://ajhoagland2.github.io/PPG_site/?utm_source=etsy&utm_medium=marketplace&utm_campaign=ppg_product_facts_carousel&utm_content=product_facts_listing_v1#how-to-play`

Canonical campaign: `ppg_product_facts_carousel`

## KPI and evidence plan

- Traffic target: 200 website sessions.
- Lead target: 8 verified feedback-intent conversions.
- Target traffic-to-lead rate: 4%.
- Record sessions only from analytics tied to the campaign UTM.
- Record leads only from verifiable feedback submissions. Anonymous feedback is not a qualified sales lead without explicit purchase-intent evidence.
- Record qualified leads, orders, spend, and Actual Real Revenue only from verifiable sources. Actual Real Revenue means gross sales minus all expenses.
- Until the public URL, analytics, and working feedback path are verified, all actuals remain zero and the campaign remains Planned.

## Source assets and factual references

- `PPG_site/assets/pen-pad-golf-cover-hero.png`
- `PPG_site/assets/pen-pad-golf-demo-poster.jpg`
- `PPG_site/assets/pen-pad-golf-demo.mp4`
- `PPG_site/product.html`
- `PPG_site/index.html#how-to-play`
- Approved rows in the workbook `Brand System`

## Approval and release checklist

- Brand review is Approved for the brief and final five-slide export.
- Founder confirms the product-facts framing, target-price treatment, and intended conversion path.
- Founder supplies or confirms the public base URL.
- Every `{PUBLIC_BASE_URL}` token is replaced and each tagged link resolves.
- Analytics and the feedback submission path pass an end-to-end test.
- Final carousel exports exactly match the approved package and real source assets.
- Founder sets Publish approval to Approved to publish.
- The correct authenticated channel is available.

Do not publish until every release condition is satisfied.

## Brand decision

Brand Agent final-export review (2026-09-24): Approved. All five 1080 × 1350 slides match the approved brief and use the approved cover art, demo poster, and three real demo-video frames. The hook, factual arc, product-details CTA, literal gameplay and scoring, target-price and planned-Etsy qualifiers, exact Playfair Display / DM Sans typography, natural paper palette, safe-area readability, in-development disclosure, and claim boundaries align with the approved brand system. Approval covers these exports only; publication gates remain in force.

## Current blocker

No authenticated social publishing surface is available in this run. Brand approved the brief and final carousel export on 2026-09-24. Publication still depends on a founder-approved public URL and conversion path, working analytics and feedback submission, founder publish approval, and the correct authenticated account.
