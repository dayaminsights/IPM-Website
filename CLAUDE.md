# IPM Bath Fittings — Quick Reference

## Project Essentials
- **Static site** (HTML + CSS + vanilla JS)
- **Pages:** `index.html` (home), `_template.html` (scaffold), `about.html`, `contact.html`, `collections.html` (in progress)
- **No build step.** Edit files directly.
- **Design tokens:** CSS custom properties in each page's `<style>` block (colors, typography, spacing)
- **Navigation:** Sync across all pages — when updating nav links, update: `_template.html:557`, `index.html:2181`, `about.html:1023/1361`, `contact.html:802`

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
