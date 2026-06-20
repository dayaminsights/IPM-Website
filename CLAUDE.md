# IPM Bath Fittings — Quick Reference

## Project Essentials
- **Static site** (HTML + CSS + vanilla JS)
- **Pages:** `index.html` (home), `_template.html` (scaffold), `about.html`, `contact.html`, `collections.html`
- **Hand-authored pages have no build step.** Edit `index.html`, `about.html`, `contact.html`, `collections.html` directly.
- **Design tokens:** CSS custom properties in each page's `<style>` block (colors, typography, spacing)
- **Navigation:** Sync across all pages — when updating nav links, update: `_template.html:557`, `index.html:2181`, `about.html:1023/1361`, `contact.html:802`

## Catalog Build (generated collection/product pages)
- `/collections/<slug>/index.html` and `/collections/<slug>/<product>/index.html` are **generated** — never hand-edit files under `/collections/`.
- **Source of truth:** `ITEM MASTER FOR WEBSITE.xls` (single `ItemMaster` sheet) + client photography zip `PICTURES FOR WEBSITE-*.zip`. The old `product catalogue.xlsx` is **gone** (migrated away).
- Workflow: edit the master `.xls`, then run:
  ```
  npm install            (one-time)
  npm run migrate        (transform → match images → write catalog.generated.xlsx)
  npm run build          (render pages + sitemap + search-index.json)
  ```
  `npm run migrate:data` skips image matching (fast, when only data changed). `npm run migrate:dry` previews matches without copying.
- **Migration pipeline** (`scripts/migrate/`): `transform-master.js` derives finish variants (ItemCode base + finish-suffix; see `lib-migrate.js`), canonicalizes collections/categories → `catalog.model.json`; `match-assets.js` name-matches photos → `images/products/<slug>/`; `write-workbook.js` emits `catalog.generated.xlsx`; `cleanup.js` removes legacy; `qa-check.js` validates. Stage reports in `reports/*.md`.
- **Variant rule:** finish-only. Multiple ItemCodes sharing a base code (after stripping a finish suffix like `-GLD`/`-MB`) collapse into one product with a finish picker. Size/type variants (`-35EXP`, `/1` vs `/2`) stay separate products. Per-finish "collections" (Opell Prima, Zenith) collapse into one each.
- Build consumer (`scripts/build-catalog.js` + `scripts/lib/`): `read-catalog.js` parses `catalog.generated.xlsx`, `render-collection.js`/`render-product.js` render pages, `layout.js` holds shared head/header/footer/CSS/JS + finish swatches, `render-sitemap.js`/`render-search-index.js` emit `sitemap.xml`/`search-index.json`.
- `SITE_BASE_URL` in `scripts/build-catalog.js` is a placeholder (`https://ipmbathfittings.github.io`) — update once the live domain is set.
- Images: variant → group primary → category fallback (`images/collections/cat-<category>.jpg`) → `images/products/_placeholder.jpg`. Categories: `Faucets`, `Kitchen Mixers`, `Shower`.

## Page Template Workflow
All new pages start from `_template.html`. Copy it, fill in three marked blocks:
1. **CSS block** — page-specific styles (`.class-name { ... }`)
2. **HTML block** — page content sections (`<section class="sec">...</section>`)
3. **JS block** — page-specific interactivity (scroll reveals, toggles, etc.)

**Never rebuild boilerplate.** Only add what's unique to that page.

## Current Work
- **Collections page** (`collections.html`) — full design spec in docs/superpowers/specs/2026-06-07-collections-page-design.md
- **Implementation plan** — docs/superpowers/plans/2026-06-07-collections-page.md

## Quick Links
- **Brand info:** 50-year-old Delhi manufacturer, solid brass, 16 finishes
- **Signature lines:** Aliva, Opell Prima
- **Full range:** Cube, Cube Prima, Fuzone, Flora, JP, Premium, Para Collection, Allied, Zenith Collections, Square Brass Accessories, Round Brass Accessories
- **Reference site:** ipmbathfittings.com
