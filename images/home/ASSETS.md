# Assets Manifest — IPM Arteriors Homepage

Drop your real media into this `assets/` folder, then replace each placeholder box
in `../index.html` with an `<img>` or `<video>`.

## How to swap a placeholder

Find a placeholder in the HTML, e.g.:

```html
<div class="ph"><span>Campaign hero — full-bleed designed bathroom…</span></div>
```

Replace it with an image:

```html
<img class="media" src="assets/hero.jpg" alt="Designed bathroom with coloured IPM faucet">
```

…or a looping muted video (great for the hero):

```html
<video class="media" src="assets/hero.mp4" autoplay muted loop playsinline poster="assets/hero.jpg"></video>
```

Add this helper rule once (the placeholders already fill their parent via `position:absolute`
or aspect-ratio; an image/video needs to cover the same box):

```css
.media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
/* For boxes that are NOT absolutely positioned (e.g. category tiles use aspect-ratio),
   you can instead drop the <img> in place of the .ph and give it: */
.cat img, .news-vis img{width:100%;height:100%;object-fit:cover;display:block}
```

Keep the `.ph` class only where you still want a placeholder. Once an image is in,
remove the `<span>` caption.

> Tip: for the category/promo/triptych/showroom tiles, the hover-zoom effect targets
> `.ph`. To keep the zoom, either keep the wrapper and put the `<img>` inside it, or
> move the `transform` hover rule onto your `<img>`/`.media`.

---

## Manifest

### 1 · Hero  (image or video)
- **File:** `hero.jpg` (and optionally `hero.mp4`)
- **Aspect / size:** full-bleed, ~16:9, ≥1920px wide; video ≤ ~6MB, muted loop
- **Subject:** designed bathroom with a coloured IPM faucet as the focal point
- Lives in: `<section class="hero">`

### 2–6 · Shop by Category  (5 images, 3:4 portrait)
- `cat-faucets.jpg` — Faucets
- `cat-showers.jpg` — Showers
- `cat-mixers.jpg` — Mixers
- `cat-coloured.jpg` — Coloured Range
- `cat-accessories.jpg` — Accessories

### 7–8 · Our Signature Lines  (2 images, 16:10)
- `line-aliva.jpg` — Aliva collection, lifestyle / full lineup
- `line-opell-prima.jpg` — Opell Prima collection, lifestyle / full lineup

### 9–16 · Product carousel  (8 images, 4:5)
One per product; name by SKU so they're easy to map back to the `PRODUCTS` array in JS:
- `prod-ALV-OHS-200.jpg` — Aliva Shower Head (Rich Gold)
- `prod-OPP-WMC-101.jpg` — Wall Mixer · Crutch (Chrome)
- `prod-ALV-WM3-115.jpg` — Wall Mixer 3-in-1 (Rose Gold)
- `prod-CUB-SNP-090.jpg` — Swan Neck Pillar Tap (Gun Metal)
- `prod-ALV-SLB-130.jpg` — Single Lever Basin Mixer (Rich Gold)
- `prod-OPP-FBS-450.jpg` — Floor-Mounted Bath Spout (Chrome)
- `prod-CUB-CDV-075.jpg` — Concealed Diverter (Rose Gold)
- `prod-ALV-ANV-045.jpg` — Angle Valve (Gun Metal)
> In the JS, each card builds its image from the `cls` gradient. Replace the
> `<div class="ph ...">` inside `.pcard .img` with `<img src="assets/prod-<sku>.jpg">`.

### 17 · Heritage / brand film  (image poster + optional video, 4:3)
- `heritage-poster.jpg` — the workshop, brass being finished
- `heritage.mp4` — optional brand film; wire the ▶ play button to open/play it
- Lives in: `<div class="her-vis">`

### 18–20 · Triptych promo  (3 images, 4:3)
- `promo-instock.jpg` — In-Stock Finishes
- `promo-configure.jpg` — Configure a Finish (configurator preview)
- `promo-catalogue.jpg` — The 2026 Catalogue (catalogue cover)

### 21 · Showroom  (1 image, fills panel ~4:3)
- `showroom-delhi.jpg` — showroom interior, finishes on display, warm light
- Lives in: `<div class="vis">` inside `.showroom`

### 22 · Newsletter  (1 image, tall, fills half)
- `newsletter.jpg` — styled bath vignette
- Lives in: `<div class="news-vis">`

---

## Fonts (optional, for production)
Self-host instead of the Google Fonts `<link>`:
- **Cormorant Garamond** — 400, 500, 600 (+ italics 400/500)
- **Jost** — 300, 400, 500

Place under `assets/fonts/` and add `@font-face` rules, then remove the
`fonts.googleapis.com` `<link>` in `index.html`.
