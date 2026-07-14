# Product Catalogue PDF — Design Spec

**Date:** 2026-07-14
**Status:** Approved (design), pending spec review

## Goal

Generate a print-ready product catalogue PDF for IPM Bath Fittings that visually
replicates the existing `IPM Chrome Catalogue April 2026-2A.pdf`, but driven by the
client's live product data (`ITEM MASTER FOR WEBSITE.xlsx`) and matched product
photos. The build must be **repeatable**: re-running the script after the Excel or
photos change regenerates the PDF and a discrepancy report.

## Source Materials

- **Data:** `ITEM MASTER FOR WEBSITE.xlsx`, sheet `Item Master + Images`, 1060 rows.
  Relevant columns: `Item Name`, `ItemCode*` (SKU), `Collection Name`, `Category`,
  `MRP`, `Site Image File` (matched web-image filename), `Match Confidence`.
  `ReferenceNo*`, `DESCRIPTION`, `GrossWeight` are entirely empty and unused.
- **Photos:** `images/products/<collection-slug>/<file>.png` (744 files). A row's photo
  is resolved by locating its `Site Image File` value anywhere under `images/products/`.
- **Cover photo:** `images/home/hero.jpg`, desaturated to B&W.
- **Style reference:** `IPM Chrome Catalogue April 2026-2A.pdf` (76 pages).

## Layout to Replicate

Page size **612 × 810 pt** (matches sample).

### Cover page
Full-bleed desaturated `hero.jpg`. IPM logo top-right. Bottom-centered text stack:
`FULFILLING YOUR BATHING DESIRES` → `INDIA MRP LIST` → `W.E.F : 01.04.2026`.

### Product pages
- **3 columns × 4 rows = 12 product cells per page.**
- **Header band** (teal) with a curved cutout cradling the IPM logo on the left, and a
  rounded gray tab on the right showing the collection name in uppercase gray bold
  (e.g. `ZENITH COLLECTION`).
- **Footer:** teal bar with white page number bottom-right.
- **Cell contents (top→bottom):**
  1. Teal **code box** top-left containing the **ItemCode (SKU)**.
  2. Centered product photo on white, scaled to fit the cell's image area.
  3. Product **name in UPPERCASE**, left-aligned.
  4. Price line: `₹ : <MRP>/-` in bold, or `Price on request` when MRP is missing.
- **Dividers:** dotted vertical lines between columns, dashed horizontal lines between rows.
- Collections do **not** share pages — each collection starts on a fresh page; a
  partial final page leaves trailing cells empty (as in the sample).

### Style tokens
- Teal accent `#2E9AA6` (sampled from the reference; exact value tuned during build).
- Gray tab `#D9D9D9`-ish, dark gray tab text.
- Font family **Segoe UI** (`segoeui.ttf` / `seguisb.ttf` semibold / `segoeuib.ttf` bold).
  Chosen because it contains the ₹ (U+20B9) glyph, ships on every Windows machine, and
  closely matches the sample's humanist sans. Registered with reportlab at runtime.

## Data Rules (approved)

- **Inclusion:** only rows whose `Site Image File` resolves to a real file on disk.
  Rows with no image, or with a `Site Image File` that is not present on disk, are
  **omitted** from the PDF and listed in the report.
- **Missing MRP:** included product shows `Price on request` (still needs a valid image
  to appear at all). Flagged in the report.
- **Code box:** shows `ItemCode` (real SKU), not a running sequence.

## Collection Ordering (approved: signature lines first)

1. All collections whose name starts with **Zenith**, in sheet order.
2. All collections whose name starts with **Opell Prima**, in sheet order.
3. All collections whose name starts with **Para**, in sheet order.
4. All remaining collections, in first-appearance (sheet) order.

## Architecture

Single repeatable script: `scripts/build-catalogue-pdf.py` (reportlab). Internally
organized into focused, independently-testable units:

- **`load_products(xlsx_path)`** → list of product dicts
  (`item_code, name, collection, category, mrp, image_filename`). No rendering, no
  disk-image logic. Pure Excel read + normalization.
- **`resolve_images(products, images_root)`** → annotates each product with an absolute
  `image_path` or `None`; returns `(included, omitted_no_image, broken_ref)` partitions
  and the set of orphan photos (files on disk referenced by no row).
- **`order_collections(products)`** → groups into ordered `(collection_name, [products])`
  applying the signature-lines-first rule.
- **`register_fonts()`** → registers Segoe UI regular/semibold/bold with reportlab;
  raises a clear error if the fonts are absent.
- **`draw_cover(canvas, ...)`**, **`draw_header(canvas, collection)`**,
  **`draw_footer(canvas, page_no)`**, **`draw_cell(canvas, rect, product)`** — pure
  drawing primitives, each responsible for one visual region.
- **`build_pdf(groups, out_path)`** — paginates groups into 12-per-page grids and calls
  the draw primitives. Emits the PDF.
- **`write_report(report_path, partitions, price_on_request, orphans)`** — writes
  `reports/catalogue-build.md` and prints a summary to console.
- **`main()`** — wires the pipeline; accepts optional CLI args for xlsx path / output
  path with sensible defaults.

### Rationale for boundaries
Data loading, image resolution, ordering, and drawing are separable concerns with clean
interfaces (data dicts in, structured results out). Each can be unit-tested without a PDF
canvas except the `draw_*` primitives, which are exercised via a small smoke render.

## Reporting (approved: omit + flag, never silently skip)

`reports/catalogue-build.md` + console summary listing:
- **Omitted — no image:** rows with empty `Site Image File`.
- **Omitted — broken image reference:** `Site Image File` set but file not found on disk.
- **Price on request:** included rows with missing MRP.
- **Orphan photos:** image files under `images/products/` referenced by no included row.
- Counts: total rows, included, omitted (by reason), price-on-request.

## Output

- `IPM Catalogue.pdf` at repo root.
- `reports/catalogue-build.md`.

## Non-Goals (YAGNI)

- No per-product description text (source column is empty).
- No multi-price rows (`(With Flange)` / `(Heavy)`); source has one MRP per row.
- No back-cover / technology / index pages from the sample — product grid + cover only,
  unless requested later.
- No re-matching of photos to rows (matching already exists in the sheet); we only
  resolve and report.

## Repeatability

Re-run: `py scripts/build-catalogue-pdf.py`. Reads current Excel + current
`images/products/`, regenerates PDF and report. Optional args:
`--xlsx <path> --out <path>`.
