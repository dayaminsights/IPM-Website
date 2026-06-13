# Homepage Bestsellers Carousel — Real Multicoloured Products

## Problem

The "Bestsellers / Explore the Collection" carousel on the homepage (`index.html`,
`.caro-section`) currently renders 8 fully mocked product cards:

- Fake names, SKUs, and dimensions
- Gradient/shimmer placeholder swatches (`.c-chrome`, `.c-richgold`, `.c-rosegold`,
  `.c-gunmetal`) instead of real photos
- Cards are not links — clicking does nothing

Now that real generated product pages exist under `/collections/`, the carousel
should showcase real, colourful (non-chrome finish) products and link each card
to its actual product page.

## Scope

Replace the `PRODUCTS` array and card template in `index.html` only. No changes
to the catalog build system, generated `/collections/` pages, or other homepage
sections. The carousel's existing scroll/autoplay/prev-next JS behavior is
unchanged — only the data source and card markup change.

## Product Lineup (7 cards)

Sourced from Opell Prima (6, real photos) and Aliva (1, placeholder image — no
real photo exists yet for this product). Zenith Collections is excluded: its
only built product page (`zenith-collections-001`) is Chrome, not a multicoloured
finish.

| # | Name | Collection | Finish | Image | Link | Badge |
|---|------|------------|--------|-------|------|-------|
| 1 | Basin Mixer Wall Mounted Upper Parts | Opell Prima | Matt Black Gold | `images/products/opell-prima/opell-prima-006-main.png` | `collections/opell-prima/opell-prima-006/` | — |
| 2 | Bottle Trap | Opell Prima | Rich Gold | `images/products/opell-prima/opell-prima-011-main.png` | `collections/opell-prima/opell-prima-011/` | — |
| 3 | Diverter Body | Opell Prima | Rose Gold | `images/products/opell-prima/opell-prima-020-main.png` | `collections/opell-prima/opell-prima-020/` | NEW |
| 4 | Square Shower Head | Opell Prima | Rich Gold | `images/products/opell-prima/opell-prima-027-main.png` | `collections/opell-prima/opell-prima-027/` | — |
| 5 | Hand Shower | Opell Prima | Rose Gold | `images/products/opell-prima/opell-prima-028-main.png` | `collections/opell-prima/opell-prima-028/` | — |
| 6 | Single Lever Basin Mixer Tall | Opell Prima | Matt Beige | `images/products/opell-prima/opell-prima-038-main.png` | `collections/opell-prima/opell-prima-038/` | — |
| 7 | Aliva Basin Mixer | Aliva | Rich Gold | `images/collections/cat-faucets.jpg` (placeholder) | `collections/aliva/aliva-001/` | NEW |

SKUs shown on cards use the real catalog SKUs (`OPELL-PRIMA-006`, `ALIVA-001-RGD`,
etc.) read from each product page's `current-sku` span.

## Implementation

### 1. `PRODUCTS` array (`index.html` ~line 2508)

Replace each entry's shape from:

```js
{ n:'...', sku:'...', dim:'...', fin:'...', cls:'c-richgold', badge:'...' }
```

to:

```js
{ n:'...', sku:'...', collection:'Opell Prima', fin:'Rich Gold', img:'images/products/opell-prima/opell-prima-011-main.png', link:'collections/opell-prima/opell-prima-011/', badge:'' }
```

- `dim` is dropped (no real dimension data available for these products).
- `collection` is new — used in the meta line alongside `fin`.
- `img` replaces `cls` — real (or placeholder) photo path.
- `link` is new — relative URL from `index.html` to the product page.

Remove the `FINISH_COLORS` map entirely (no longer referenced).

### 2. Card template (`cardHTML`, ~line 2529)

- Wrap the whole `<article class="pcard">` in `<a href="${p.link}">` so the card
  is clickable and opens the real product page.
- Replace `<div class="ph ${p.cls}"><span>${p.n}</span></div>` with
  `<img class="ph" src="${p.img}" alt="${p.n}" loading="lazy">`.
- Replace the `.finish-dot` background lookup (`FINISH_COLORS[p.cls]...`) — drop
  the finish-dot entirely, since the finish name is now shown as text in the
  meta line.
- Meta line changes from `${p.dim} · ${p.fin}` to `${p.collection} · ${p.fin}`.
- The `.pcard-enquire` button stays as-is (decorative hover affordance) but is
  now nested inside the new `<a class="pcard">` wrapper. A `<button>` inside an
  `<a>` is invalid HTML and would otherwise trigger card navigation on click.
  Add a click handler on `.pcard-enquire` that calls `e.preventDefault()` and
  `e.stopPropagation()` so it stays a no-op without navigating, preserving
  today's "decorative, does nothing" behavior.

### 3. CSS (`index.html` ~line 851-980)

- `.pcard .img .ph` becomes an `<img>`: add `width:100%; height:100%;
  object-fit:cover` so real photos fill the existing aspect-ratio box. Keep the
  existing `transform: scale(1.06)` hover zoom (`.pcard:hover .img .ph`).
- For the one placeholder image (`cat-faucets.jpg`, a wide category photo),
  `object-fit:cover` will crop it — acceptable, consistent with how `.coll-card`
  thumbnails already use this same image elsewhere.
- Remove the now-unused shimmer rules: `.c-chrome`, `.c-richgold`, `.c-rosegold`,
  `.c-gunmetal`, and the `@keyframes shimmer` block.
- Remove `.pcard .finish-dot` rules (no longer rendered).
- `.pcard` itself becomes the child of an `<a>` — ensure the anchor has
  `display:block; text-decoration:none; color:inherit` so it doesn't change
  layout or link-styling of the card.

## Out of Scope

- Adding a real photo for the Aliva Basin Mixer (uses category placeholder for now).
- Building additional Zenith Collections product pages.
- Changing carousel scroll/autoplay mechanics.
- "View All Products" link target (remains `#` as today).
