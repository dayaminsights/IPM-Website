# IPM Bath Fittings — Quick Reference

## Project Essentials
- **Static site** (HTML + CSS + vanilla JS)
- **Pages:** `index.html` (home), `_template.html` (scaffold), `about.html`, `contact.html`, `collections.html`
- **Hand-authored pages have no build step.** Edit `index.html`, `about.html`, `contact.html`, `collections.html` directly.
- **Design tokens:** CSS custom properties in each page's `<style>` block (colors, typography, spacing)
- **Navigation:** Sync across all pages — when updating nav links, update: `_template.html:557`, `index.html:2181`, `about.html:1023/1361`, `contact.html:802`

## Catalog Build (generated collection/product pages)
- `/collections/<slug>/index.html` and `/collections/<slug>/<product>/index.html` are **generated** from `product catalogue.xlsx` — never hand-edit files under `/collections/`.
- Workflow: edit `product catalogue.xlsx` (sheets: Products, Collections, Finishes), then run:
  ```
  npm install   (one-time)
  npm run build
  ```
- Source for the generator: `scripts/build-catalog.js` + `scripts/lib/` (`read-catalog.js` parses/validates the workbook, `render-collection.js`/`render-product.js` render pages, `layout.js` holds shared head/header/footer/CSS/JS, `render-sitemap.js` generates `sitemap.xml`/`robots.txt`).
- Build also regenerates `sitemap.xml` (always) and `robots.txt` (only if missing).
- `SITE_BASE_URL` in `scripts/build-catalog.js` is a placeholder (`https://ipmbathfittings.github.io`) — update it once the live domain is set.
- Images: variant → group primary → category fallback (`images/collections/cat-<category>.jpg`) → `images/products/_placeholder.jpg`. Missing images are logged as warnings, not errors.

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
