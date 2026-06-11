# Collection Catalog Expansion + "Signature Showcase" Design Spec

**Date:** 2026-06-11
**Builds on:** [2026-06-07-collections-page-design.md](2026-06-07-collections-page-design.md), [project-catalog-build-system memory](../../../CLAUDE.md)

## Purpose

Two related pieces of work:

1. **Catalog expansion** — extend the Aliva/Flora reference-site scrape (completed 2026-06-11) to the remaining 11 collections, populating `product catalogue.xlsx` with names, categories, and product photos for as many real products as the reference site provides.
2. **Signature Showcase section** — give each generated `/collections/<slug>/index.html` page more visual "appeal" by adding a featured-product showcase built from real scraped photography, and by switching the page hero from a generic category-fallback image to a real product photo from that collection.

## Part 1 — Catalog Expansion

### Scope: all 11 remaining collections

| Our slug | Reference site category slug |
|---|---|
| `opell-prima` | `opell-prima` |
| `cube` | `cube-collection` |
| `cube-prima` | `cube-prima` |
| `fuzone` | `fuzone` |
| `jp` | `jp` |
| `premium` | `premium` |
| `para-collection` | `para-collection` |
| `allied` | `allied-collection` |
| `zenith-collections` | `zenith-collections` |
| `square-brass-accessories` | `square-brass-accessories` |
| `round-brass-accessories` | `round-accessories` |

### Process (mirrors the Aliva/Flora pilot)

1. For each collection, `scrape-reference-site.js`-style fetch of `product-category/<ref-slug>/` (with pagination) → list of product URLs.
2. For each product page, extract:
   - Name from `<h1 class="product_title entry-title">`
   - Main image from `woocommerce-product-gallery__image` → `data-large_image`
3. Normalize via the same `populate-from-scrape.js` pipeline:
   - Clean/title-case names, fix known source typos (extend the typo map as new ones are discovered)
   - Infer `category` (Faucets/Showers/Accessories) from name keywords — extend `CATEGORY_RULES` if a collection's products don't match existing patterns (e.g. accessories collections may need new keywords like "holder", "hook", "tray", "dispenser")
   - Assign `Product Group` slugs continuing from each collection's existing numbering (most collections start fresh at `<slug>-001`, except where a collection has no existing seed row)
   - Download images to `images/products/<slug>/<group>-main.<ext>`
4. Append new rows to the `Products` sheet — `Finish`, `dimensions`, `Description`, `price`, `Gallery Images`, `Image Alt Text`, SKU codes left **blank** (consistent with the Aliva/Flora pilot — user fills these in later).
5. After all collections are scraped, run `npm run build` once and verify via the link-resolution check (no broken internal links/images across all generated pages).

### Parallelization

Each collection's scrape is independent (different reference-site category, different output rows/images, no shared state other than appending to the same xlsx). Per `/using-superpowers` → `dispatching-parallel-agents`:

- Dispatch **3-4 subagents**, each handling 2-4 collections.
- Each subagent: scrapes its assigned collections into its own intermediate JSON files in `scripts/scrape-output/`, downloads images, but does **not** write to the xlsx directly (avoids concurrent-write conflicts on the single `.xlsx` file).
- After all subagents complete, run `populate-from-scrape.js` (extended to loop over all 13 collections' JSON files) once, sequentially, to append all new rows to the xlsx in one pass.
- Then one `npm run build` + verification pass.

### Known risks / edge cases

- Some reference-site category pages may 404 or be empty (e.g. if "Zenith Collections" or "Square/Round Brass Accessories" don't actually have populated WooCommerce categories) — subagents should report this rather than fail silently; those collections simply get 0 new rows and keep using fallback imagery.
- "Colored Faucets" / "Regency" categories exist on the reference site but don't map to any of our 13 collections — not scraped (out of scope).
- If a collection's product names produce a `Product Group` slug collision with an existing row, the numbering scheme (`nextGroupNumber`) already handles this by skipping used numbers.

## Part 2 — Signature Showcase Section

### What changes on `/collections/<slug>/index.html`

**A. Hero image** (`page-hero img`): currently resolves to `cat-<category>.jpg` when no `Hero Image` is set in the Collections sheet. Change the fallback so that when a collection has product groups with real scraped images (i.e. `image` filename present, not the global placeholder), the hero uses the **first product group's image** for that collection instead of the category fallback. Collections with zero real product images keep the existing `cat-*.jpg` fallback — no regression for unpopulated collections.

**B. New "Signature Showcase" section**, inserted between the hero and "Collection Story":

- Layout: an asymmetric editorial grid — one large `.arch` image (the collection's best/first product photo) paired with 2-3 smaller supporting `.arch` tiles from other products in the same collection, reusing the existing `.arch` (50%/50%/10%/10% radius) crop and `.reveal`/`.stagger-children` animation classes.
- Copy: eyebrow ("Signature Line" for Aliva/Opell Prima, "The Range" for others) + a short framing line pulled from the collection's `Tagline`.
- For **signature collections** (`Is Signature = Yes`): the large image is bigger (e.g. spans 2 of 3 grid columns) and the section includes a pull-quote style line beneath the copy (reusing `.serif`/`em` styling already used elsewhere — no new typography).
- For **non-signature collections**: same component at a more compact scale (large image spans 1 of 3 columns, supporting tiles fill the rest).
- If a collection has fewer than 3 product groups with real images (e.g. still using fallbacks only), the showcase gracefully degrades to a single large image + copy (no empty tile slots).

### New CSS (`css/catalog.css`)

One new component block, `.showcase` + `.showcase-main` + `.showcase-tiles` + `.showcase.is-signature` modifier, built using only existing tokens (`--gold`, `--cream`, `--ink`, `--soft`, `.arch`, `.reveal*`). `/frontend-design` and `/ui-ux-pro-max` will be used to refine the exact grid proportions, spacing, and hover treatment within these constraints.

### Renderer changes (`scripts/lib/render-collection.js` + `read-catalog.js`)

- `read-catalog.js`: when resolving `collection.resolvedHeroImage`, check if any product group in that collection has a non-placeholder `variants[0].image`; if so use it as the hero (and as the showcase's "main" image). Otherwise keep current category-fallback behavior.
- `render-collection.js`: add a `renderShowcase(collection, groups, depth)` function producing the new section's HTML, called between `heroHtml` and `storyHtml` in `renderCollectionPage`. Selects up to 3 additional product groups (different from the hero/main image) for the supporting tiles, preferring groups with real (non-placeholder) images.

### Verification

- `npm run build` — confirm 0 errors, review warning count (should not increase beyond expected "missing Finish" warnings for new rows).
- Run the link-resolution check across all `/collections/<slug>/index.html` and product pages — 0 new broken links/images.
- Visually check, via the local `serve` server, at least: Aliva (signature, has 28 real product images), Flora (non-signature, has 32), and one collection that ends up with zero scraped images (confirms graceful fallback).
