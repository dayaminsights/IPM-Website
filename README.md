# Handoff: IPM Bath Fittings — Homepage (Arteriors Edition)

## Overview
A redesigned homepage for **IPM Bath Fittings** (a 50-year-old Delhi manufacturer of solid-brass faucets & fittings), styled after the editorial luxury feel of arteriorshome.com. The page is content-led and image-driven: a full-bleed campaign hero, a "Shop by Category" tile row, two signature-line collection tiles (Aliva / Opell Prima), a horizontal product carousel, a heritage/about block with value props, three promo tiles, a single showroom feature, a newsletter, and a footer. It ships with a **Light/Dark theme toggle** (defaults to Light) that persists in `localStorage`.

## About the Design Files
The file in this bundle — **`index.html`** (a copy of `styles/arteriors.html`) — is a **design reference created in HTML**. It is a prototype showing the intended look, layout, and behavior. It is **not** production code to ship as-is.

The task is to **recreate this design in your target environment** using its established patterns and component library (React/Next, Vue, Astro, plain HTML+CSS, etc.). If no codebase exists yet, pick the framework that best fits the project and implement there. All copy, colors, type, spacing, and interactions below are specified so this can be rebuilt faithfully without having been in the original session.

You can also just use `index.html` directly as a starting point and replace the placeholder boxes with real media (see **Assets**) — it is fully self-contained except for the Google Fonts link.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all defined. Recreate pixel-faithfully, then swap placeholders for real photography/video. The only intentionally "unfinished" parts are the striped grey **placeholder boxes** (`.ph`), which mark where real media goes.

---

## Tech notes
- **Single file**, no build step. All CSS is in one `<style>` block; all JS in one `<script>` at the end.
- **External dependency:** Google Fonts — `Cormorant Garamond` (display serif) + `Jost` (sans labels/body). Self-host these in production for performance/offline.
- **Theming:** driven by `data-theme="light|dark"` on `<html>`. All colors are CSS custom properties redefined per theme. The toggle writes to `localStorage` key `ipm_arteriors_theme`.
- **Product carousel** is rendered from a `PRODUCTS` array in JS and scrolls via `scroll-snap` + prev/next buttons. Card width is `312px` + `26px` gap (referenced as `step` in JS — keep in sync if you change card width).
- No framework, no icons library (a couple of unicode glyphs are used: ‹ › ▶ ♡ ☏). Replace with your icon set in production.

---

## Page structure (top → bottom)
1. **Utility bar** (`.util`) — phone, shipping message, "Find a Showroom", "Trade Program". Single line, vertically centered.
2. **Header** (`header.site`, sticky) — left nav (New / Faucets / Collections / Heritage), centered wordmark **IPM / BATH FITTINGS**, right: theme toggle. *(No search/account/cart — this is not an e-commerce store.)*
3. **Hero** (`.hero`) — full-bleed media, scrim, centered copy: eyebrow "THE 2026 COLLECTION", H1 "The Colour *of* Water", CTA "Explore the Collection".
4. **Shop by Category** (`#cats`) — centered title; 5 portrait tiles: Faucets, Showers, Mixers, Coloured, Accessories.
5. **Our Signature Lines** — centered title; 2 wide tiles: **Aliva**, **Opell Prima**.
6. **Explore the Collection** (`#collection`) — centered title; horizontal **product carousel**; centered prev/next + "View All Products".
7. **A Heritage of Distinction** (`#heritage`) — copy + brand-film thumbnail (play button); 4 value props (I–IV: Handcrafted Quality / A Legacy of Design / Solid Brass / Made in India).
8. **Triptych promo** — 3 tiles: In-Stock Finishes, Configure a Finish, The 2026 Catalogue.
9. **The IPM Showroom** (`#rooms`) — single showroom feature: image + address / hours / appointments / Get Directions.
10. **Newsletter** (`.news`) — "Design, *Delivered*" + email form + image.
11. **Footer** — wordmark + socials; 4 columns (Categories / Customer Care / Trade / Reach Us); legal row.

---

## Design tokens

### Color — Light theme (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#faf9f6` | page background (warm white) |
| `--paper` | `#ffffff` | pure white surfaces |
| `--cream` | `#f1ede4` | alt section background (heritage, newsletter) |
| `--ink` | `#1a1815` | primary text / near-black |
| `--soft` | `#6b665d` | secondary text |
| `--faint` | `#a39c90` | tertiary / placeholder labels |
| `--line` | `#e6e1d6` | hairline borders |
| `--line-2` | `#d8d2c5` | stronger borders |
| `--accent` | `#8a6a3c` | brass accent (used sparingly) |
| `--accent-2` | `#a8854f` | lighter brass |
| `--on-accent` | `#ffffff` | text on accent |

### Color — Dark theme
| Token | Value |
|---|---|
| `--bg` | `#141210` |
| `--paper` | `#1a1714` |
| `--cream` | `#1e1a15` |
| `--ink` | `#ece6da` |
| `--soft` | `#9d9587` |
| `--faint` | `#6a6457` |
| `--line` | `rgba(236,230,218,.12)` |
| `--line-2` | `rgba(236,230,218,.20)` |
| `--accent` | `#c6a86b` |
| `--accent-2` | `#dcc592` |
| `--on-accent` | `#141210` |

Scrim tokens (image overlays): `--scrim` / `--scrim-2` (light: `rgba(26,22,17,.30/.62)`, dark: `rgba(0,0,0,.34/.66)`).

### Typography
- **Display serif:** `'Cormorant Garamond', Georgia, serif` — weights 400/500/600, with italics for emphasis (`<em>`). Used for H1/H2/H3, wordmark, product names, value-prop numerals.
- **Sans:** `'Jost', system-ui, sans-serif` — weights 300/400/500. Body weight is **300**. Used for nav, labels, eyebrows, microcopy, buttons.
- **Eyebrow / label style:** Jost, ~11px, `letter-spacing: .26em–.3em`, `text-transform: uppercase`. Accent-colored eyebrows use `--accent`.
- **H1 (hero):** Cormorant 500, `clamp(54px, 8vw, 112px)`, line-height .96.
- **H2 (section):** Cormorant 500, `clamp(34px, 4.6vw, 56px)`, line-height ~1.04.
- **H3 (tiles):** Cormorant 500, ~32–38px.
- **Product card name:** Cormorant 500, 22px.

### Layout / spacing
- Content max width: `1400px`, side padding `40px` (`24px` on mobile).
- Section vertical padding: `104px` desktop / `72px` mobile (`.sec`). Many sections set `padding-top:0` to pair with the one above.
- Tile grid gaps: categories `18px`, promos `18px`, carousel `26px`, footer cols `40px`.
- Card hover: image `scale(1.04–1.06)` over `.7–.8s cubic-bezier(.2,.6,.2,1)`.

### Breakpoints
- `≤1080px`: categories → 3 cols, value props → 2 cols.
- `≤820px`: hide left nav; promos/heritage/triptych/newsletter/showroom → 1 col; reduce section padding.

---

## Interactions & behavior
- **Theme toggle:** sets `data-theme` on `<html>`, animates a sliding pill, persists to `localStorage('ipm_arteriors_theme')`. Default `light`. Color transitions are `.5s`.
- **Product carousel:** prev/next buttons call `scrollBy({left: ±step*2, behavior:'smooth'})`; `step = 312 + 26`. Cards use `scroll-snap-align:start`. Scrollbar hidden.
- **Hover:** category/promo/triptych/showroom images zoom; underline links shift to accent; nav links darken to `--ink`.
- **Anchor nav:** header/utility links jump to `#cats`, `#collection`, `#heritage`, `#rooms` via smooth scroll.
- All `href="#"` and the newsletter form are **non-functional placeholders** — wire to real routes / endpoints.

---

## State
Minimal. Only client state is the **theme** (`light`/`dark`) persisted in `localStorage`. Carousel position is native scroll state. The `PRODUCTS` array is static data — replace with a CMS/API feed if desired (fields below).

`PRODUCTS[]` item shape:
```js
{ n: 'Aliva Shower Head', sku: 'ALV-OHS-200', dim: 'Dia: 200mm',
  fin: 'Rich Gold', cls: 'c-richgold', badge: 'NEW' }
```
`cls` maps to a finish gradient class (`c-chrome`, `c-richgold`, `c-rosegold`, `c-gunmetal`) used only as a stand-in for the product photo — replace the card image with the real shot.

---

## Assets
Replace each striped placeholder box (`.ph`) with real media. Drop files into **`assets/`** and point the markup at them (swap `<div class="ph"><span>…</span></div>` for an `<img>`/`<video>` sized to fill its container with `object-fit:cover`). See `assets/ASSETS.md` for the full manifest with suggested filenames and aspect ratios.

Quick list:
| # | Location | Type | Aspect | Suggested file |
|---|---|---|---|---|
| 1 | Hero | image **or** video | full-bleed (~16:9, ≥1920w) | `hero.jpg` / `hero.mp4` |
| 2–6 | Shop by Category (5) | image | 3:4 portrait | `cat-faucets.jpg` … `cat-accessories.jpg` |
| 7 | Aliva tile | image | 16:10 | `line-aliva.jpg` |
| 8 | Opell Prima tile | image | 16:10 | `line-opell-prima.jpg` |
| 9–16 | Product carousel (8) | image | 4:5 | `prod-<sku>.jpg` |
| 17 | Heritage / brand film | image (poster) + video | 4:3 | `heritage-poster.jpg` / `heritage.mp4` |
| 18 | Triptych: In-Stock | image | 4:3 | `promo-instock.jpg` |
| 19 | Triptych: Configure | image | 4:3 | `promo-configure.jpg` |
| 20 | Triptych: Catalogue | image | 4:3 | `promo-catalogue.jpg` |
| 21 | Showroom | image | ~4:3 / fills panel | `showroom-delhi.jpg` |
| 22 | Newsletter | image | tall, fills half | `newsletter.jpg` |

**Fonts:** Cormorant Garamond + Jost (Google Fonts). Self-host for production.

---

## Files
- **`index.html`** — the complete homepage design (copy of `styles/arteriors.html`). Open directly in a browser to preview.
- **`assets/ASSETS.md`** — detailed media manifest + how to swap placeholders for `<img>`/`<video>`.
- **`assets/`** — empty; drop your images/videos here.

## Brand / content notes
- Company: **IPM Bath Fittings**, est. 1974, Delhi. Solid brass, made in India, 16 hand-perfected finishes.
- Address: 459 Patparganj Industrial Area, Delhi – 110092. Phone: 011-43048462 / +91 98189 39899. Email: ipmbathfittings@gmail.com.
- Signature lines: **Aliva**, **Opell Prima** (also referenced: Cube Prima). Keep finish names accurate: Chrome, Rich Gold, Rose Gold, Gun Metal Black, plus the matt/profile families.
