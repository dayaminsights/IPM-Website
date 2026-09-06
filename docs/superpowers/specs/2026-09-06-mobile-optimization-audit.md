# Mobile Optimization Audit — IPM Bath Fittings

**Date:** 2026-09-06
**Method:** Automated Playwright sweep (Chromium 149, mobile emulation with touch + device pixel ratio) across 8 pages × 10 viewports, plus full-page screenshot review at 360 / 390 / 768.
**Harness:** `scratchpad/audit.js` (probe), `scratchpad/shots.js` (visual), served over a local static server so `fetch()`-driven pages (search index) behave as in production.

---

## 1. Viewport matrix

| Width × Height | DPR | Represents | Share of real traffic (typical India retail) |
|---|---|---|---|
| 320 × 568 | 2 | iPhone SE 1st gen, budget Android | Small but the hard floor — anything that breaks here breaks worst |
| 360 × 740 | 3 | Galaxy A/M series, Redmi, most budget Android | **Largest single bucket** |
| 375 × 667 | 2 | iPhone SE 2/3, iPhone 8 | Common |
| 390 × 844 | 3 | iPhone 14 / 15 / 16 | Common |
| 412 × 915 | 2.6 | Pixel 8/9, Galaxy S flagship | Common |
| 430 × 932 | 3 | iPhone Pro Max | Common |
| 740 × 360 | 3 | Phone in landscape | Low volume, high breakage |
| 744 × 1133 | 2 | iPad mini portrait | Low |
| 768 × 1024 | 2 | iPad portrait | Low |
| 820 × 1180 | 2 | iPad Air portrait | Low |

Pages exercised: `index.html`, `collections.html`, `about.html`, `contact.html`, `search.html`, `404.html`, a generated collection page (`/collections/zenith/`), and a generated product page (`/collections/zenith/bath-spout/`).

---

## 2. What is already right

Worth stating so it does not get "fixed" away:

- Every page ships `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- A real mobile nav exists (`.mob-menu-btn` + `.mob-nav`) with `aria-expanded` / `aria-controls` wired correctly.
- Breakpoints exist at 1100 / 860 / 480 and the major grids do collapse.
- `@media (hover: none)` blocks already neutralise hover-only affordances.
- `prefers-reduced-motion` is honoured on index, about, contact.
- Zero JavaScript errors across all 80 page × viewport combinations.
- Hero video carries `playsinline muted autoplay` — no iOS fullscreen takeover.
- Scroll-reveal animations do fire on touch viewports (verified with realistic scroll pacing — an early blank screenshot was a capture artefact, not a bug).

The site is not *unresponsive*. It is **under-tuned**: it was laid out for desktop and then squeezed, and the squeeze leaks in six measurable ways.

---

## 3. Findings

Severity: **P0** breaks the page · **P1** blocks or frustrates interaction · **P2** degrades reading · **P3** polish / performance.

### P0-1 — `about.html` scrolls sideways on every tablet and landscape phone

| Viewport | Document width | Overflow |
|---|---|---|
| 740 × 360 (landscape phone) | 873 | **+133 px** |
| 744 × 1133 (iPad mini) | 879 | **+135 px** |
| 768 × 1024 (iPad) | 906 | **+138 px** |
| 820 × 1180 (iPad Air) | 969 | **+149 px** |

**Cause:** [about.html:1288](about.html#L1288) sets the Make-in-India emblem to `width: clamp(220px, 56vw, 320px); right: -18vw` under `@media (max-width: 860px)`. Its container `.mii-hero-stage` deliberately has no `overflow` ([about.html:732-738](about.html#L732-L738) — the comment explains it is left open so the emblem's animated flight path is not clipped). At 768 px the emblem's box lands at `left 586 → right 906`, i.e. 138 px past the viewport.

`body { overflow-x: hidden }` does **not** save it: with `html` at `overflow: visible`, the body's overflow value propagates to the viewport and body itself computes back to `visible`. Confirmed — body reports `overflow-x: hidden` while `scrollWidth` is still 906.

The overflow then cascades: `header.site` (fixed, `left:0; right:0`) stretches to 906 px, and every `.mob-nav a` stretches to 850 px.

**Fix:** `overflow-x: clip` on `.mii-hero-stage` (clips horizontally, still allows the vertical flight path — unlike `hidden`, `clip` creates no scroll container) plus `overflow-x: clip` on `html` sitewide as a guard.

---

### P0-2 — `index.html` scrolls sideways at 320 px

Document width 333 vs viewport 320 — **+13 px**.

**Cause:** `.promos-header` ([index.html:770-776](index.html#L770-L776)) is `grid-template-columns: 1fr auto` and never rewraps. At 320 px the "All Collections" `.link-arrow` measures 163 px and lands at `right: 333`. `.cats-header`, `.trip-header`, `.showroom-header` and `.caro-header` share the same two-column pattern and are one long label away from the same failure.

**Fix:** collapse these header rows to a single column at ≤ 480 px so the section heading and its link stack.

---

### P1-1 — Tap targets far below the 44 × 44 px minimum

Measured on phone widths (320–430). WCAG 2.2 AA (2.5.8) requires 24 px; Apple HIG and Material both specify 44 / 48 px. These are the offenders, worst first:

| Element | Measured | Where | Note |
|---|---|---|---|
| `a.wa-link` (WhatsApp icon) | **18 × 18** | header, all 7 pages | 16 px from the screen edge — the single hardest thing on the site to hit |
| `.foot-bottom a` — Terms | **34 × 13** | footer, 4 pages | |
| `.foot-bottom a` — Privacy | **42 × 13** | footer, 4 pages | |
| `.foot-bottom a` — Sitemap | **46 × 13** | footer, 5 pages | |
| `button#mobMenuBtn` | **30 × 23** | header, all 7 pages | the primary navigation control |
| breadcrumb `a` (Home / Zenith / Collections) | **43–81 × 21** | product pages | |
| `button.chip` (38 of them) | **47–137 × 31** | search + collection pages | |
| `a.ql` (404 quick links) | **59–143 × 36** | 404 | |
| `.ss-clear` | **28 × 28** | search sticky bar | |
| `input#stickyQ` | **232–342 × 20** | search + collection pages | 20 px tall input |
| footer column links ("New Arrivals" etc.) | **208–318 × 23** | all pages | wide but only 23 px tall |
| `a.link-arrow` ("See All", "Discover Zenith"…) | **93–207 × 17** | home, collections | |
| `a.brand` | **64 × 28** | header, all pages | |

### P1-2 — iOS Safari zooms the page whenever a field is focused

Safari force-zooms on focus when an input's font-size is under 16 px, then leaves the page zoomed and horizontally scrollable.

- `#stickyQ` — **15 px** ([search.html:750](search.html#L750))
- `.field-group input`, `select`, `textarea` — **14 px** ([contact.html:660](contact.html#L660))

This is the single most jarring defect on the contact form: tapping the first field visibly jumps the layout.

### P1-3 — 1.7 screens of filter chips before the first product

On `search.html` at 360 × 740: **38 filter chips** (6 category + 16 collection + 16 finish), 31 px each, pushing the first product card to **y = 1292 px** — the user scrolls nearly two full screens past filters they mostly did not want. The same chip wall ships on every generated collection page.

Document height is **41,619 px** — all 337 products render at once, no pagination or windowing.

### P1-4 — No safe-area handling on notched / gesture-bar devices

Zero occurrences of `env(safe-area-inset-*)` sitewide. `.fab-cluster` is pinned `bottom: 32px; right: 28px` ([index.html:2197-2200](index.html#L2197-L2200)) so on an iPhone in landscape the "Book a Visit" pill sits partly under the home indicator, and full-bleed sections run under the rounded corners.

---

### P2-1 — Text below the legible floor

Everything under ~11.5 px measured on phone widths. Anything below 12 px on a phone is at or past the practical reading limit; below 10 px it is decoration, not text.

| Size | Element | Content |
|---|---|---|
| **7 px** | `.brand small` | "BATH FITTINGS" — on all 7 pages (**exempt**, see below) |
| **8 px** | `span.badge` | "NEW" |
| **8 px** | `.cg-sig-badge` | "Signature Line" |
| **9 px** | `.tag`, `dt`, `.cg-sub`, `.map-pin-label`, `.card-finish-count`, `.quick-links-label` | address labels, "+2" finish counts, map caption |
| **9.5–10.5 px** | `.sc-eyebrow`, `.gp-globe-hint`, `.gp-leg-item` | about-page eyebrows and globe legend |
| **10 px** | ~45 distinct elements — every `.e` eyebrow, `.link-arrow`, `.filter-label`, `.sort-label`, `.card-coll`, footer `h5`, footer `a`, `.cta-btn-primary`, `.contact-submit` | the site's entire label layer |

The 10 px label layer is a deliberate typographic choice and reads fine on a 27-inch monitor. On a 360 px phone at arm's length it is the difference between a luxury brand and an unreadable one.

**Two exemptions**, both logotypes rather than text: `.brand small` ("BATH FITTINGS", 7 px) and the 404 page's equivalent (9 px). WCAG excludes logotypes from text sizing, and the wordmark's sub-line is letter-spaced to match the width of "IPM" above it — changing its size breaks the lockup. Their tap areas are enlarged; their type is not touched.

### P2-2 — `100vh` hero jumps when the mobile URL bar hides

- [index.html:489](index.html#L489) — `.hero { height: 100vh }`
- [collections.html:385](collections.html#L385) — `height: 100vh; min-height: 780px`

On mobile `100vh` resolves to the *large* viewport height (URL bar hidden). On first paint, with the bar visible, the hero is taller than the screen — the CTA sits below the fold — then the layout shifts as the user scrolls. No `svh` / `dvh` unit appears anywhere in the codebase.

### P2-3 — Text clipped inside its own box

`scrollWidth > clientWidth` on containers that are not intentional scrollers:

| Page | Element | Overflow | Viewports | Verdict |
|---|---|---|---|---|
| contact | `.contact-card` | 310 vs 280 | 320 | real |
| contact | `.contact-submit` | 167 vs 155 | 320, 360 | real |
| contact | `.foot-cols` | 198 vs 192 | 320 | real |
| search / collection | `.search-card`, `.card-body`, `.card-meta` | 127 vs 124 | 320 | real |
| collections | `.cg-card` | 184 vs 134 | all | real |
| about | `.cert-badge` | 288 vs 262 | all | **false positive** |
| about | `.cta-card` | 322 vs 262 | all | **false positive** |

The two `about` entries were run down individually and are not defects: the excess is a decorative absolutely-positioned glow blob (80 px on `.cert-badge::after`, 280 px on `.cta-card::before`) deliberately hung off the card corner behind the card's own `overflow: hidden`. No text is clipped, the grid is already collapsed at 1100 px and the padding already tuned at 860 px. Left alone.

The rest are individually small and collectively the reason the site reads as "squeezed" rather than "designed for this screen".

### P2-4 — Six full-height cards in the category grid

At ≤ 480 px, `.cats` drops to `grid-template-columns: 1fr` ([index.html:1830](index.html#L1830)). Each category card then renders ~430 px tall — six categories become roughly **six screens** of scrolling to see a list of six words. Two columns at a shorter aspect shows all six in about one screen.

---

### P3-1 — Images downloaded at up to 18× the pixels displayed

No `srcset` exists anywhere in the codebase. Worst cases measured at phone widths:

| Page | File | Natural | Displayed | Ratio |
|---|---|---|---|---|
| collections | `Fuzone.jpg` | 2496 px | 134 px | **18.6×** |
| collections | `Aliva.jpg` | 2426 px | 134 px | **18.1×** |
| collections | `Flora.jpg` | 2416 px | 134 px | **18.0×** |
| search / collection | product PNGs (×9 above the fold) | 1400 px | 124 px | **11.3×** |
| collections | `para.jpg` | 2400 px | 312 px | 7.7× (`loading="eager"`) |
| home | product PNGs | 1400 px | 208 px | 6.7× |
| collections / search | `hero.jpg` | 1920 px | 320 px | 6.0× (`loading="eager"`) |

On a metered Indian mobile connection this is the difference between a 2-second and a 15-second first meaningful paint. Fixing it properly means generating derivatives (`sharp` is already a dependency) and emitting `srcset` + `sizes` from the build — a separate piece of work, scoped in §5.

### P3-2 — Missing `-webkit-text-size-adjust`

Absent on all pages. Android Chrome and iOS Safari may inflate text in landscape or in reader-adjacent modes, silently breaking the tuned type scale.

---

## 4. Fix plan (this change)

Delivered as one new stylesheet, `css/mobile.css`, linked **after** each page's inline `<style>` so it wins on equal specificity, plus targeted edits at the four root causes that a stylesheet cannot reach.

| # | Fix | Files |
|---|---|---|
| 1 | `overflow-x: clip` on `.mii-hero-stage` and on `html` | `css/mobile.css` |
| 2 | Section header rows collapse to one column ≤ 480 px | `css/mobile.css` |
| 3 | 44 px minimum on every tap target listed in P1-1 | `css/mobile.css` |
| 4 | 16 px form fields ≤ 860 px | `css/mobile.css` |
| 5 | Filter chips collapse behind a `<details>` disclosure ≤ 860 px | `css/mobile.css` + `search.html` + `scripts/lib/layout.js` |
| 6 | `env(safe-area-inset-*)` on fixed chrome and full-bleed rails | `css/mobile.css` |
| 7 | Type floor: 11 px labels / 12 px prose on phones | `css/mobile.css` |
| 8 | `100svh` hero with `100vh` fallback | `css/mobile.css` |
| 9 | Clipped containers given room to breathe | `css/mobile.css` |
| 10 | Two-column category grid at ≤ 480 px | `css/mobile.css` |
| 11 | `-webkit-text-size-adjust: 100%` | `css/mobile.css` |
| 12 | `<link>` injection into the 7 hand pages and the generated-page shell | 7 × `.html` + `scripts/lib/layout.js` |

Generated pages under `/collections/` are rebuilt via `npm run build` — never hand-edited (per `CLAUDE.md`).

## 5. Deferred — responsive image pipeline

Not in this change; it touches the migration pipeline and adds several hundred files.

Recipe when picked up: extend `scripts/migrate/match-assets.js` to emit 320 / 640 / 960 / 1400 px WebP derivatives with `sharp`, then have `render-product.js` / `render-collection.js` / `layout.js` write `srcset` + `sizes="(max-width: 860px) 50vw, 240px"`. Expected saving on the search page's above-the-fold set alone: ~9 × 1400 px PNG → ~9 × 320 px WebP.

## 6. Verification

Re-run after implementation and compare against `audit-before.json`:

```
node scratchpad/server.js "<repo root>" 8100 &
node scratchpad/audit.js audit-after.json
node scratchpad/summarize.js audit-after.json
```

Pass criteria: zero horizontal overflow on all 80 combinations; no tap target under 44 px; no text under 11 px on phone widths; no new JS errors.

### Two corrections to the harness, made during verification

1. The probe originally reported `Math.max(html.scrollWidth, body.scrollWidth)`. Once `html { overflow-x: clip }` was in place, `body.scrollWidth` still read 1789 px on a page that could not scroll sideways at all. Only the **root** element's `scrollWidth` tells you whether the document actually scrolls; `body`'s tells you what was painted past the edge and then clipped. The probe now reports both, separately.
2. Effective tap area has to account for invisible `::after` hit-expanders. A `getBoundingClientRect()` on the element alone reports the visual box and under-counts a link whose hit area was deliberately grown — `scratchpad/probe6.js` measures the union of the element and its absolutely-positioned pseudo-elements.

---

## 7. Results

Measured on the same 8 pages × 10 viewports after the change.

| Finding | Before | After |
|---|---|---|
| P0-1 · `about` sideways scroll on tablets / landscape | +133 to +149 px | **0 px** |
| P0-2 · `index` sideways scroll at 320 | +13 px | **0 px** |
| — · any page scrolling sideways at any viewport | 5 of 80 combinations | **0 of 80** |
| — · content painted past the viewport edge | present on 5 combinations | **none** |
| P1-1 · tap targets under 44 px | 18×18 worst, ~30 distinct offenders | **none, on all 7 pages** |
| P1-2 · fields that trigger iOS zoom-on-focus | 14 px and 15 px | **16 px everywhere** |
| P1-3 · scroll depth to the first product on search | 1292 px (1.7 screens) | **687 px (0.9 screens)** — 47 % less |
| P1-3 · height of the filter block | ~1100 px | **228 px** |
| P2-1 · text under 11 px on phone widths | ~60 distinct elements | **2, both logotypes (exempt)** |
| P2-4 · category grid at ≤480 px | 1 column, ~6 screens | **2 columns, ~1 screen** |
| — · JavaScript errors | 0 | **0** |

Desktop was re-measured at 1440 px and 1024 px across all six page types: hero height, eyebrow type size, footer link metrics, chip height, the category grid's column count and the brand lockup are all unchanged, and no page scrolls sideways. The mobile layer is inert above 860 px except for the touch-target and 16 px form rules, which also apply on any device reporting `hover: none` — an iPad in landscape is 1024 px wide and still a finger.

### Two regressions caught and fixed during verification

- Making `.chips` a horizontal scroller initially did nothing: it is a flex item of a column-direction `.filter-group` whose `align-items: flex-start` sizes it to its content, so the row rendered 664 px wide and was simply cut off rather than scrolling. `align-self: stretch` plus `min-width: 0` is what actually engages `overflow-x: auto`.
- The `100svh` rule initially included `.sh-hero`, which is authored at `52vh` — that inflated the search hero to a full screen and pushed results *down*. It is now scoped to the two heroes actually authored at `100vh`, and the search hero is separately shortened to `42vh` on phones.
