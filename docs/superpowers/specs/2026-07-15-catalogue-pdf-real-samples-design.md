# Catalogue PDF — Real-Sample-Driven Redesign

**Date:** 2026-07-15
**Status:** Approved
**Supersedes (partially):** `2026-07-14-product-catalogue-pdf-design.md` — that spec was built against the wrong
reference file (`IPM Chrome Catalogue April 2026-2A.pdf`, an old committed catalogue already in the repo,
mistaken for the user's sample). The script and PDF it produced (`scripts/build-catalogue-pdf.py`,
`IPM Catalogue.pdf`) remain in the repo and keep working — they are not deleted, just no longer the target style.

## Correction

User's actual samples: `sample catalogue 1.pdf` (Hindware, 237pp, landscape A4) and
`sample catalogue 2.pdf` (Jaquar, 224pp, portrait A4), saved at repo root. **Two new catalogues are
required, one styled after each sample**, both driven by the same `ITEM MASTER FOR WEBSITE.xlsx` +
`images/products/` data already wired up.

## What each sample actually looks like

### Sample 1 — Hindware ("Italian Collection")
- Page: **landscape, 841×595pt** (A4 landscape).
- Cover: full-bleed lifestyle photo, brand lockup top-left, script tagline over a dark bottom band,
  boxed catalogue title + fine print, QR code bottom-left.
- Collection-opening page: category name as a large bold uppercase two-line heading top-left, brand
  logo top-right, straight into the product grid (no separate divider page — see Non-Goals).
- Grid: **2 columns × 3 rows = 6 products/page.**
- Per-cell: product photo left, name + feature-icon row + `Cat. No.:` line(s) + size line, right side has
  small brand mark + QR + bold price. A short vertical dashed tick separates photo from text.
- Footer: plain, small gray page-number box bottom-right.

### Sample 2 — Jaquar
- Page: **portrait, 595×842pt** (A4 portrait).
- Cover: white with a boxed "CUSTOMER GUIDE / Vol. NN / YYYY" label top-left, brand logo top-right,
  full-bleed dark lifestyle photo below, short caption bottom-left over the photo.
- Collection-opening page: half-page-height lifestyle photo banner with the collection name overlaid in
  white in the photo's top-left corner, straight into the grid below (see Non-Goals for the swatch row
  sample 2 also shows — omitted).
- Grid: **3 columns, rows flow to fit** (~4 rows typical = up to 12/page), with an inline bold-black
  sub-heading (category) whenever the category changes within a collection's run — e.g. `BATH & SHOWER`
  appears above the row where products switch category.
- Per-cell: plain product photo, bold code, small gray 1–3 line description, `Rs. <price>` (bold "Rs.",
  regular number).
- Footer: `jaquar.com` bottom-left, gray page-number box bottom-right.

## Data reality check (why some sample fields are omitted)

`ITEM MASTER FOR WEBSITE.xlsx` gives us: `ItemCode, Item Name, Collection Name, Category, MRP,
Site Image File`. It does **not** give us: physical size dimensions, feature/technology icons (flushing
type, soft-close, water rating), multiple Cat.No. groupings per product, finish-swatch codes, or QR
target URLs. Per the existing project convention (established in the prior spec's Non-Goals — no
fabricated description text), **we do not invent this data.** Both new styles reproduce the sample's
*layout geometry and typographic system* using only the fields we actually have:
`ItemCode, Name, Collection, Category, MRP`.

## Approved decisions

- **Two outputs, not one.** `IPM Catalogue (Hindware Style).pdf` and `IPM Catalogue (Jaquar Style).pdf`.
- **Lifestyle/collection images:** reuse the website's own collection photography. Resolution order per
  collection: (1) a known hero file in `images/collections/` matched by collection name (e.g. `Aliva.jpg`,
  `JP.jpg`, `Cube_Prima.jpg`, `para.jpg`, `pheonix.jpg`, `NEO_COLLECTION.png`, `PEBBLE.png`, and the
  signature `line-aliva.jpg` / `line-opell-prima.jpg` / `line-para.jpg` shots), matched case/punctuation-
  insensitively; (2) else the first included product's own photo for that collection; (3) else the
  category fallback `images/collections/cat-<category>.jpg` (mirrors the logic already used by
  `scripts/lib/read-catalog.js:301-324` for the website itself).
- **Inclusion/omission/report rules from the prior spec carry over unchanged:** only products with a
  resolved on-disk image are included; missing MRP → "Price on request"; omitted/broken/price-req/orphans
  all get reported, never silently dropped.
- **Collection ordering carries over unchanged:** Zenith → Opell Prima → Para signature lines first, then
  sheet order.

## Architecture

Extract the existing data-layer into a shared module so both new renderers (and the original script) use
one source of truth — no duplicated Excel/image-matching logic across three files.

**File structure:**
- **Create `scripts/catalogue_common.py`** — pure data + shared drawing-adjacent helpers, no page-size
  assumptions baked in:
  - `load_products`, `resolve_images` (+ `_index_images`, `_choose_path`, `_collection_slug`),
    `order_collections`, `paginate(groups, per_page)` (per_page now an explicit param — no more implicit
    global COLS/ROWS), `register_fonts`, `_fmt_price`, `write_report`.
  - **New:** `resolve_collection_hero(collection_name, images_collections_dir, category, included_products)`
    → absolute path or `None`, implementing the 3-step fallback above.
- **Modify `scripts/build-catalogue-pdf.py`** — becomes a thin consumer: `from catalogue_common import
  load_products, resolve_images, order_collections, paginate, register_fonts, write_report`. Its own
  drawing code (`draw_cover`, `draw_header`, `draw_footer`, `draw_cell`, `draw_grid_dividers`, `build_pdf`,
  `main`) is untouched. Its `paginate` call site updates to pass `per_page=12` explicitly.
- **Modify `scripts/test_build_catalogue.py`** — update the one `paginate` call site to the new signature;
  everything else is unaffected since the functions are still reachable as module attributes via the
  `from catalogue_common import *`-style import.
- **Create `scripts/build-catalogue-hindware.py`** — landscape renderer: `draw_cover`, `draw_collection_header`
  (big two-line uppercase heading + brand mark, no colored band), `draw_footer`, `draw_cell` (photo + name +
  Cat.No. line + price, no icons/QR — omitted per data reality), `build_pdf`, `main`. Grid: `COLS=2, ROWS=3`.
- **Create `scripts/test_build_catalogue_hindware.py`** — mirrors the existing test file's structure/spirit
  (constants, a build-and-check-page-count smoke test) for the new drawing code.
- **Create `scripts/build-catalogue-jaquar.py`** — portrait renderer: `draw_cover`, `draw_collection_banner`
  (half-page photo + overlaid collection name), `draw_category_subheading`, `draw_footer`, `draw_cell`
  (photo + code + name as description line + `Rs. price`), `build_pdf` (paginates *within* a collection but
  also inserts category sub-heading rows, so its pagination differs slightly from the flat `paginate` —
  implemented locally in this file, not forced into the shared helper), `main`. Grid: `COLS=3`, rows flow
  (target ~4/page → `per_page=12`, but a sub-heading row consumes vertical space so a page may hold fewer).
- **Create `scripts/test_build_catalogue_jaquar.py`** — same spirit as above, plus a test that a category
  change within a collection inserts a sub-heading.

## Style tokens

**Hindware-style:** page 841×595pt; near-black text `#1A1A1A`; gray icon-circle `#EFEFEF` (unused —
no icons, kept only if a later pass adds them); teal-green accent tick `#0F3D2E` for the small divider mark;
fonts Segoe UI family (same rationale as before — ₹ glyph, ships on Windows).

**Jaquar-style:** page 595×842pt; heading gray `#8A8A8A`; body near-black `#1A1A1A`; description gray
`#6E6E6E`; fonts Segoe UI family.

Both reuse `register_fonts()` from `catalogue_common`.

## Report

Each style script writes its own report: `reports/catalogue-build-hindware.md`,
`reports/catalogue-build-jaquar.md` — same sections as the existing report (no-image, broken, price-on-
request, orphans, counts). The underlying included/omitted product sets are identical across all three
scripts (same data layer) — only the presentation differs — so numbers should match the original build's
431/610/19/7 (orphans may shift slightly due to the collection-aware hero-image lookups added here, which
is expected and reported).

## Non-Goals (YAGNI, explicit for this pass)

- No feature/technology icon rows (soft-close, flushing type, water rating) — no source data.
- No QR codes — no target URLs to encode.
- No multi-Cat.No. grouping or physical size dimensions — not in the source sheet.
- No finish-swatch code row (sample 2 shows one on collection-opening pages) — collections are already
  finish-collapsed 1:1 in our data model per `CLAUDE.md`'s variant rule; a swatch row would be redundant.
- No separate full-page arched-cutout category divider (sample 1's "ONE PIECE TOILETS" style pages) —
  the collection-opening page's own header treatment covers the same wayfinding purpose without a second
  page per category; can be added later if requested.
- The original `IPM Catalogue.pdf` / `build-catalogue-pdf.py` output is left as-is, not restyled, not removed.

## Repeatability

```
py scripts/build-catalogue-hindware.py   # -> "IPM Catalogue (Hindware Style).pdf" + reports/catalogue-build-hindware.md
py scripts/build-catalogue-jaquar.py     # -> "IPM Catalogue (Jaquar Style).pdf"   + reports/catalogue-build-jaquar.md
```
Both accept the same `--xlsx --images --out --report` overrides as the original script.
