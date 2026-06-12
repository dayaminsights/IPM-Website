# Opell Prima Full Re-Scrape & Re-Dedup — Design

## Context

The reference site (`https://ipmbathfittings.com/product-category/opell-prima/`) currently
lists **183 product entries across 12 pages**. The original scrape (`scripts/scrape-output/opell-prima-products.json`)
was capped at 10 listing pages and found only **160 unique URLs**, which the
population script (`scripts/populate-from-scrape.js`) deduped-by-title down to
**60 product groups** (`opell-prima-001`..`opell-prima-060`).

Across this and the prior session, 23 of those 60 groups were further merged
as color/finish variants of other groups (e.g. `opell-prima-006/007/008/009`
→ one group with 5 finishes including `058`; `003/012/033`; `024/025/026`;
`038/039/048/049/050`), leaving **37 groups / 58 rows** in the catalog today.

The user has identified that the live site has grown to 183 listings (up from
the ~160 captured before) and wants a full re-scrape so the missing ~23 items
are captured, followed by the same "combine same-looking products into one
page with a finish picker" treatment already applied this session.

## Goal

Re-scrape all 183 Opell Prima listings, regenerate the product set from
scratch (replacing the current 37-group/58-row Opell Prima data), and merge
all color/finish duplicates into single product pages — producing a more
complete and consistent Opell Prima collection than the current 37 groups.

## Approach

### Phase 1 — Re-scrape with raised page cap

- `scripts/scrape-reference-site.js`: raise `fetchAllListingPages`'s hardcoded
  page-loop limit from `page <= 10` to `page <= 15` (covers the current 12
  pages with headroom for future growth).
- Run `node scripts/scrape-reference-site.js opell-prima` → overwrites
  `scripts/scrape-output/opell-prima-products.json` with the full ~183-item
  set (url, title, image per entry).
- This phase only touches the scrape script and its JSON output — no catalog
  changes yet.

### Phase 2 — Wipe and re-populate Opell Prima from scratch

- Remove all 58 existing `Collection Name === "Opell Prima"` rows from
  `product catalogue.xlsx` (Products sheet). All other collections are
  untouched.
- Run `scripts/populate-from-scrape.js opell-prima` against the new ~183-item
  JSON. The existing `cleanName()` + dedupe-by-cleaned-title logic collapses
  exact-title repeats (e.g. "BUTTON SPOUT" × 7 → 1 row), producing a fresh set
  of `opell-prima-001..0NN` groups — expected roughly 65-75 groups (183 raw
  items, similar dedup ratio to the 160→60 seen previously, plus whatever the
  ~23 new items resolve to).
- This re-downloads all Opell Prima product images into
  `images/products/opell-prima/`, overwriting the existing files (filenames
  are deterministic from group slug, so this is safe — but note the renumbering
  means group N's image after re-population may be a *different physical
  product* than group N is today).
- `npm run build` at this point would produce ~65-75 product pages for Opell
  Prima (no finish variants yet — every row has blank `Finish`).

### Phase 3 — Systematic visual dedup pass (re-derive finish-variant merges)

- For every one of the ~65-75 fresh groups, view the main product image.
- Group visually-identical products (same physical item, different
  finish/color) by category + shape, including:
  - Re-deriving the merges already worked out this session (006-009+058,
    003/012/033, 024/025/026, 038/039/048/049/050) — these products still
    exist in the new scrape, likely under different group numbers since the
    renumbering starts fresh from the new 183-item list.
  - Any additional matches surfaced by the ~23 newly-captured items.
- For each merge group, assign `Finish` values per variant using the existing
  16-entry Finishes sheet (Rich Gold, Rose Gold, Polished Gun Metal Black,
  Matt White/Black/Beige/Grey [+Gold variants], Profile White/Black/Beige/Grey
  Gold, Chrome), following the same visual-matching approach used for the
  prior merges (e.g. gold-edged profile → "Profile X Gold"; plain matte body →
  "Matt X"; metallic gold → "Rich Gold"; copper tone → "Rose Gold"; bare
  metal → "Chrome").
- Present the full proposed merge list (survivor group, absorbed groups,
  finish assignments, survivor SKU Name) to the user for approval before
  applying — given the scale (~15-25 merge groups expected), this is reviewed
  as one batch rather than merge-by-merge.
- Apply approved merges via a script following the established
  `FINISH_MERGES` / `SURVIVOR_RENAMES` pattern (row relabeling + reordering so
  the survivor's row stays first for group-level metadata).

### Phase 4 — Rebuild, cleanup, verify, commit

- `npm run build` — regenerates all Opell Prima collection + product pages
  (expected final count: roughly 40-55 groups after the dedup pass).
- Remove stale `collections/opell-prima/<absorbed-group-slug>/` directories
  for any groups that no longer exist after merging.
- Grep for dangling references to removed group slugs across `**/*.html` and
  `sitemap.xml`.
- Spot-check 2-3 merged product pages (title/h1/breadcrumb/finish
  picker/default image) as done in prior merges.
- Commit + push (the user has consistently asked for push-after-verify all
  session).

## Risks / Notes

- **Renumbering**: since Phase 2 wipes and re-populates from scratch, the new
  `opell-prima-NNN` slugs will NOT correspond 1:1 to the current ones. Any
  external links (none currently published beyond this repo's own pages,
  which are all regenerated) are unaffected, but this is a full replacement of
  the Opell Prima URL space (`/collections/opell-prima/opell-prima-*/`).
- **Volume**: ~183 product-page fetches + ~183 image downloads in Phase 1/2
  (at the scraper's existing 400-500ms politeness delay, this is
  roughly 2-3 minutes of scraping). Phase 3's visual review of ~65-75 images
  is the most time-consuming step and will be done in batches.
- **Category/description inference**: `populate-from-scrape.js`'s
  `inferCategory()` and `cleanName()` heuristics are reused as-is — no changes
  planned unless Phase 3 review surfaces new patterns not handled by the
  existing regexes (e.g. new product-type keywords not in `CATEGORY_RULES`).
- **Out of scope**: other collections (Aliva, Flora, etc.) are not touched.
  Only `Collection Name === "Opell Prima"` rows and
  `images/products/opell-prima/**` are affected.
