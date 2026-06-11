# Opell Prima Variant Merge, Product Image Fix, and Collection Polish — Design Spec

**Date:** 2026-06-11
**Builds on:** [2026-06-11-collection-showcase-and-catalog-expansion-design.md](2026-06-11-collection-showcase-and-catalog-expansion-design.md)

## Purpose

Three related cleanup passes on the just-expanded catalog, to be executed autonomously:

1. **Opell Prima color-variant merge** — the 61 scraped "products" include genuine color/finish duplicates of the same physical product (e.g. "Bottle Trap" / "Bottle Trap White" / "Black Bottle Trap" / "Beige Bottle Traps"). Merge these into single product pages with a finish picker, using the existing variant-row model — no new architecture needed.
2. **Product image display fix** — source photos from the reference site have inconsistent aspect ratios (portrait hand-showers, wide shower arms, near-square traps) on white backgrounds. The current `.arch img { object-fit: cover }` crops portrait/odd-ratio images, sometimes cutting off part of the product. Switch product-image contexts to `object-fit: contain` so the full product is always visible.
3. **Site-wide link audit + per-collection visual polish** — after the above, run a full link-resolution check across all pages, fix any breakage, and add subtle per-collection accent variations to the Signature Showcase / hero treatment so the 13 collection pages don't feel identical.

## Part 1 — Opell Prima Variant Merge

### Merge criteria (Conservative — approved)

Only merge two product-group rows when:
- Their `SKU Name`, with color/finish words and trailing qualifiers stripped, produce the **same base name** (case-insensitive), AND
- The color/finish word that was stripped maps to a real entry in the `Finishes` sheet (or is unambiguous, e.g. "White" → "Matt White", "Black" → "Matt Black", "Gold" → "Rich Gold", "Beige" → "Matt Beige", "Beige Gold" → "Matt Beige Gold", "Rose Gold" → "Rose Gold", "Black Gold" → "Matt Black Gold").

Do **NOT** merge near-duplicates that differ by structural/spec wording even if similar (e.g. "Pillar Cock Extend" vs "Pillar Cock Extended" vs "Pillar Cock Extended Body", "Basin Mixer Upper Part" vs "Basin Mixer Upper Parts" vs "Basin Mixer Wall Mounted Upper Parts") — these may be different SKUs/lengths and merging risks losing real products. Leave these as separate product groups.

### Identified merge groups (from the 61 Opell Prima rows)

Based on the current data (`opell-prima-001` .. `opell-prima-061`), these color-variant clusters qualify under the conservative criteria:

| Merged base name | Source groups (name -> stripped color) | Resulting Finish values |
|---|---|---|
| **Bottle Trap** | opell-prima-015 "Bottle Trap" (no color -> primary), opell-prima-016 "Bottle Trap White" -> Matt White, opell-prima-014 "Black Bottle Trap" -> Matt Black, opell-prima-011 "Beige Bottle Traps" -> Matt Beige | Matt White (primary, opell-prima-015's image), Matt Black, Matt Beige |
| **Aliva Shower Head** | opell-prima-003 "Aliva Shower Head" (primary), opell-prima-004 "Alive Shower Head" (typo of "Aliva", same product, treat as duplicate listing -> use as a 2nd finish slot ONLY if its image differs; otherwise drop as a pure duplicate) | See note below |
| **Diverter Body** | opell-prima-020 "Diverter Body" (primary, no color), opell-prima-022 "Diverter Body Gold" -> Rich Gold, opell-prima-023 "Diverter Body Matt Beige" -> Matt Beige. ("Diverter Body for ALL Colour and Gold Combination", opell-prima-021, is a distinct catalog/spec entry, NOT a color variant — leave separate.) | Default/Unspecified (primary), Rich Gold, Matt Beige |
| **Shower Head** | opell-prima-044 "Shower Head" (primary, no color), opell-prima-045 "Shower Head Beige" -> Matt Beige | Default/Unspecified (primary), Matt Beige |
| **Hand Shower** | opell-prima-029 "Hand Shower" (primary, no color), opell-prima-030 "Hand Shower Gold" -> Rich Gold. ("Hand Shoer Rose Gold", opell-prima-028, is a typo of "Hand Shower Rose Gold" -> Rose Gold — also merges here.) | Default/Unspecified (primary), Rich Gold, Rose Gold |
| **Shower Arm** | opell-prima-042 "Shower ARM" (primary, no color), opell-prima-043 "Shower ARM Black Gold" -> Matt Black Gold | Default/Unspecified (primary), Matt Black Gold |
| **Single Lever Basin Mixer** | opell-prima-047 "Single Lever Basin Mixer" (primary), opell-prima-059 "Single Liver Basin Mixer" (typo of "Liver"->"Lever", appears to be the SAME product re-listed, not a color variant — different image likely just a different angle/finish photo). Treat as a duplicate listing: use opell-prima-047 as primary and opell-prima-059's image as an additional `Gallery Images` entry (NOT a new Finish row), since no color word is present. | N/A (gallery image addition only) |
| **Single Lever Basin Mixer Tall** | opell-prima-049 "Single Lever Basin Mixer Tall" (primary), opell-prima-060 "Single Liver Basin Mixer Tall" (same typo pattern as above) -> same treatment: gallery image addition, not a Finish variant. | N/A (gallery image addition only) |
| **Alive/Aliva Shower Head** (revisit) | opell-prima-003 "Aliva Shower Head", opell-prima-004 "Alive Shower Head" — both are typo variants of the same name with **different images**. No color word present. Treat as duplicate listing: opell-prima-003 (correct spelling "Aliva") becomes primary `SKU Name`, opell-prima-004's image added as a `Gallery Images` entry. | N/A (gallery image addition only) |

This reduces 61 product groups to roughly **55** (6 groups absorbed: opell-prima-004, 011, 014, 016, 022, 023, 028, 030, 045, 043, 059, 060 — 12 rows absorbed into 6 surviving groups, net -6).

**Implementation mechanics** (fits existing variant-row model, no schema change):
- For a merge target (e.g. "Bottle Trap"), the **primary surviving row** keeps its `Product Group` slug (e.g. `opell-prima-015`), gets `SKU Name` = the cleaned base name ("Bottle Trap"), and `Finish` = the color implied by ITS OWN image (if determinable) or left blank/"Matt White" per the table.
- Each **absorbed row** (e.g. opell-prima-016) becomes a NEW row in the Products sheet with the SAME `Product Group` as the primary (e.g. `opell-prima-015`), its own `SKU` (keep original, e.g. `OPELL-PRIMA-016`), `Finish` set to the mapped finish name, `image` kept as its own scraped image, and `SKU Name`/`category`/`Description`/etc. left blank (inherited from the primary per the "first row wins" grouping rule already implemented in `read-catalog.js`).
- The absorbed row's OLD standalone `Product Group` (e.g. `opell-prima-016`) is removed entirely — it no longer exists as its own page. **Renumbering**: do NOT renumber surviving groups (avoids cascading slug changes / broken bookmarks for groups that don't change). Simply remove the absorbed rows' old group identity; surviving `Product Group` values keep their existing slugs (e.g. `opell-prima-015` stays `opell-prima-015`, NOT renamed to "bottle-trap").
- For **gallery-only merges** (Single Lever Basin Mixer / Tall / Aliva Shower Head), the absorbed row is deleted entirely and its `image` filename is appended to the primary row's `Gallery Images` column (comma-separated).

### Validation pass for other collections

Before declaring Opell Prima the only collection needing this treatment, run the same "strip color word, check for duplicate base name" analysis script across all 13 collections' `SKU Name` values. If any other collection has 2+ groups whose names differ only by a recognized finish/color word, apply the same conservative merge there too (using the identical mechanics above). Collections with 0 such matches are left untouched. Report findings before making changes to collections beyond Opell Prima — but since this is an autonomous run, "report" means: log findings to `scripts/scrape-output/variant-merge-report.txt` and proceed with merges that meet the conservative criteria (do not skip collections just because they weren't enumerated above).

## Part 2 — Product Image Display Fix

### Root cause

`scripts/lib/layout.js:330` — `.arch img { width: 100%; height: 100%; object-fit: cover; display: block; }`. This is shared by collection cards, related-collection cards, product galleries, and showcase tiles. Source product photos (downloaded in the catalog-expansion pass) are arbitrary aspect ratios (portrait hand-showers ~3:4, wide shower arms ~4:1, near-square traps ~5:4) on solid white/transparent backgrounds. `object-fit: cover` crops to fill the `.arch` box's `aspect-ratio` (4/3 for cards/showcase tiles, 16/10 for signature showcase main, 4/3 for product gallery), cutting off parts of tall or wide products.

### Fix

Add a new modifier class, `.arch.product-shot` (or scope via a new `.product-photo` wrapper), applied specifically to **product images** (collection-card thumbnails, showcase tiles, product gallery main + thumbnails, related-product cards) — i.e. any `<img>` whose source is `/images/products/**`. Collection **hero** images and **category fallback** images (`/images/collections/cat-*.jpg`, `/images/collections/hero.jpg`) are NOT product photos in this sense — they're styled lifestyle/category shots already cropped intentionally and should KEEP `object-fit: cover`.

```css
.arch.product-shot img {
  object-fit: contain;
  padding: 6%;  /* breathing room so the product doesn't touch the arch edges */
}
```

`var(--cream)` background (already set on `.arch`) fills the letterboxed space, consistent with the site's warm neutral palette — no new color tokens needed.

### Where `product-shot` applies

In `render-collection.js` and `render-product.js`, every `<div class="arch">...</div>` that wraps an `<img src="{rel(depth, group/variant image)}">` (i.e. sourced from `productGroups[].variants[].image` or `.gallery`) gets `class="arch product-shot"` instead of `class="arch"`. This covers:
- `renderCollectionCard` (collection grid product cards)
- `renderShowcaseTile` (Signature Showcase tiles)
- `renderRelatedCollectionCard` is for COLLECTIONS (uses collection hero images) — NOT changed, stays `cover`.
- Product page gallery main image + thumbnail rail (`render-product.js`)
- Product page "Related Products" cards (same component as collection cards, using product images — gets `product-shot`)

Collection page **hero** (`page-hero img`, using `collection.resolvedHeroImage`) — **special case**: when `resolvedHeroImage` is a real product photo (set in Task 5 of the prior plan), it's still a product photo and would look odd `cover`-cropped at 68vh height. Apply `product-shot`-style `contain` treatment to the hero too, OR (simpler, avoids a giant letterboxed product floating in a tall hero) keep hero `cover` but verify visually after the fact — if a hero photo looks badly cropped, that specific collection's hero falls back to `cat-*.jpg` is also an acceptable degradation.

**Decision for this spec**: hero images use `cover` as today (unchanged) — heroes are large background-style elements where some cropping is visually acceptable/expected (similar to a banner). All smaller product-tile contexts (cards, showcase, gallery, related) get `product-shot`/`contain`. After implementation, spot-check 2-3 hero images that now use real product photos (e.g. Aliva, Flora) — if any look unacceptably cropped, that's a follow-up, not a blocker for this pass.

## Part 3 — Link Audit + Per-Collection Polish

### Link audit

Re-run the link-resolution verification script (same as Task 6 of the prior plan) across all `/collections/**/index.html` pages AFTER the Opell Prima merge (group/page count changes) and the CSS fix. Confirm:
- 0 broken links other than the known pre-existing brochure-PDF placeholder (13 instances, unchanged).
- No dangling links to the now-removed Opell Prima group pages (e.g. old `opell-prima-016/`, `opell-prima-022/`, etc.) — these URLs simply won't be generated anymore; nothing else should reference them by slug (verify no `Related Product Groups` cells reference an absorbed group's old slug — if any do, the build's `resolveRelatedGroups` should already skip/warn on missing references, but confirm no warnings appear for the merged-away slugs specifically introduced by this change).

### Per-collection polish (subtle accents — approved)

Keep the shared page structure (hero, Signature Showcase, Collection Story, product grid, finishes strip, related collections, CTA) identical across all 13 collections. Add **data-driven micro-variation** using fields already in the `Collections` sheet:

1. **Showcase tile arrangement variant**: alternate the supporting-tile layout based on `collection.categories.length` (number of distinct categories the collection spans) — e.g. collections spanning Faucets+Showers+Accessories (3 categories) get supporting tiles in a tighter 3-up row; collections with 1-2 categories get a 2-up arrangement with slightly larger supporting tiles. Implemented via a CSS modifier class on `.showcase` keyed off `collection.categories.length` (e.g. `showcase--wide-range` vs `showcase--focused`), no new HTML structure.

2. **Hover-tint accent**: each collection's showcase/card hover `filter` (`brightness(1.04) saturate(1.08)`) gets a tiny per-collection hue-rotate nudge derived deterministically from the collection's slug (e.g. a small lookup table or hash-based small offset, ±2-4deg `hue-rotate`) — subtle enough not to mismatch product photo colors, just enough that hovering through different collections feels slightly distinct. **Scoped tightly**: this must be a very small effect (a few degrees) — large hue shifts would make brass/gold fixtures look wrong. If in doubt, omit this for collections that are majority gold/brass-finish (Aliva, Opell Prima, signature lines) and only apply to collections with more varied/neutral product photography.

3. **Tagline/quote placement**: signature collections (`Is Signature=Yes`) keep the existing pull-quote under the heading; for non-signature collections, alternate placing the new `.showcase-tagline` line either under the heading (current) or as a caption beneath the main showcase tile, alternating by `collection.categories[0]` (Faucets-primary vs Accessories-primary collections) — purely a template branch, both styles already exist in CSS from the prior pass (or need one small additional CSS rule for the under-tile caption position).

These three are independent, additive, low-risk CSS/template tweaks — if any one proves visually awkward during the build/spot-check, it can be dropped without affecting the others.

## Execution Plan Notes (for the implementation plan)

- **Subagents**: per user instruction, use `/using-superpowers` (subagent-driven-development) for implementation tasks, and `/frontend-design` for the CSS/visual work in Parts 2 and 3.
- **Order**: Part 1 (Opell Prima merge — data change) before Part 2 (CSS fix — needs final image set) before Part 3 (link audit needs final page set from Parts 1+2, polish is independent CSS/template work that can follow immediately after).
- **Verification**: after each part, `npm run build` with 0 errors; after Part 1, verify Opell Prima now generates ~55 product pages (not 61) and the merged groups show a working finish picker (reuse existing `render-product.js` finish-picker logic — already built for multi-variant groups). After Part 2, visually spot-check (via local server screenshot or direct HTML/CSS inspection) that a previously-cropped portrait product (e.g. Hand Shower) now shows the full product. After Part 3, link-check passes and each collection page is reviewed for the polish accents.
- **Autonomous operation**: this is a long-running, multi-part, unsupervised pass. Each part should be a self-contained task (or small set of tasks) with its own commit, so partial progress survives if the session is interrupted (e.g. token limit). The plan should structure tasks so that after EVERY task, the repo is in a buildable, committed state.

## Self-Review

- **Placeholder scan**: no TBD/TODO; the merge table above is complete and specific (exact group numbers, exact finish mappings).
- **Internal consistency**: Part 1's merge mechanics reuse the existing variant-row + "first row wins" grouping model (confirmed in `read-catalog.js`) — no schema/build-script architecture change required beyond the xlsx data edits themselves (and the `populate-from-scrape.js`/`scrape-reference-site.js` scripts are NOT touched, since this is a one-time data cleanup, not a re-scrape).
- **Scope check**: three parts, each independently completable and committable — appropriate for a single plan executed as a sequence of subagent-driven tasks.
- **Ambiguity check**: "conservative merge" criteria are made concrete via the explicit table; "subtle accents" are made concrete via three specific, bounded mechanisms with explicit fallback ("drop if awkward").
