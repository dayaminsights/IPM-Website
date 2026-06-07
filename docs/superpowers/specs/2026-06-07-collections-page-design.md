# Collections Page — Design Spec

**Date:** 2026-06-07
**File to create:** `collections.html` (copied from `_template.html`)
**Nav label:** "Collections" (point `index.html#collection` references / add this as the dedicated destination)

## Purpose

Build a dedicated Collections page for IPM Bath Fittings that presents the brand's full roster of named product lines (sourced from the live reference page `ipmbathfittings.com/collection-2/`) with an editorial, gallery-like visual treatment inspired by `obsidianassembly.com/objects`, while staying fully within the existing site's design system (`_template.html` tokens, components, and animation patterns).

## Sources

- **Content reference:** `https://ipmbathfittings.com/collection-2/` — flat grid of 13 collection/brand names plus a separate "Colored Faucets" finish palette (15 finish names). No taglines or descriptions exist on the source; new editorial copy will be written in the site's existing voice.
- **Design inspiration:** `https://obsidianassembly.com/objects` — vertical editorial scroll, objects staged in arched niches against textured backdrops, curved/arc title typography, letter/line reveal animations, organic gold-gradient divider lines, warm cream→brass→charcoal palette (closely aligned with IPM's existing `--gold`/`--cream`/`--ink` tokens).
- **Theme reference:** `_template.html` — defines all tokens, header/footer/utility-bar markup, hero pattern, reveal-animation classes, and page-assembly conventions that this page must follow.

## Page Structure (top → bottom)

### 1. Hero (`page-hero`, `data-header-scheme="dark"`)
- Eyebrow: "The 2026 Collection"
- H1 (word-reveal spans): "The Collections"
- Italic subtitle: one editorial sentence on the breadth/craft of the range (drawing on real brand facts: 50+ years, Delhi manufacture, solid brass, large range of designs)
- Background image: `images/home/hero.jpg` (or `cat-faucets.jpg` if a tighter crop reads better at 68vh)

### 2. Intro strip (`<section class="sec">`)
- Eyebrow + 1–2 sentence editorial intro positioning the collections (adapted from the reference site's About blurb: "Delhi based leading manufacturer... 50 years... large range of designs", rephrased to match the site's established copy voice)
- `reveal` animation class

### 3. Signature Lines (featured editorial blocks)
- Two large asymmetric image+copy blocks, alternating left/right (mirrors the homepage heritage-section layout pattern)
- **Aliva** — `images/home/line-aliva.jpg`, gold eyebrow, serif `<h3>` name, 1–2 line description
- **Opell Prima** — `images/home/line-opell-prima.jpg`, same treatment, opposite alignment
- Images cropped with an **arched-niche treatment**: asymmetric border-radius (e.g. rounded top corners forming an arch, square/soft bottom) — a restrained nod to Obsidian Assembly's gallery-alcove staging that still matches the site's existing rounded-corner language (`page-hero` uses `border-radius: 0 0 40px 40px`)
- `reveal-left` / `reveal-right` classes per block

### 4. The Full Range (grid)
- Grid of the remaining 11 collection names: Cube, Cube Prima, Fuzone, Flora, JP, Premium, Para Collection, Allied, Zenith Collections, Square Brass Accessories, Round Brass Accessories
- Each tile: arched-crop image (reused/cycled from `cat-faucets.jpg`, `cat-showers.jpg`, `cat-mixers.jpg`, `cat-accessories.jpg`, `cat-coloured.jpg` — assigned thematically, e.g. accessories collections get `cat-accessories.jpg`, coloured-leaning names could pull `cat-coloured.jpg`), gold `.eyebrow`-style label, serif collection name, thin gold underline that draws in on hover, image zoom on hover
- Parent uses `.stagger-children` + `.reveal` for cascading scroll-in

### 5. Available in 16 Finishes (swatch strip)
- Section title "Available in 16 Finishes" matches the brand's established copy ("sixteen hand-perfected finishes" / "16+", per `index.html:2330,2348`)
- Compact horizontal strip of finish swatches using the 15 real finish names found on the reference palette: Rich Gold, Rose Gold, Polished Gun Metal Black, Matt White Gold, Matt Black Gold, Matt Beige Gold, Matt Grey Gold, Matt White, Matt Black, Matt Beige, Matt Grey, Profile White Gold, Profile Black Gold, Profile Beige Gold, Profile Grey Gold
- Each swatch: small circular CSS-gradient disc (no photography needed) + finish name label beneath, in a horizontally scrollable or wrapping row
- `stagger-children` reveal

### 6. CTA close
- Centered editorial line + `.link-arrow` style CTA: "Request the 2026 Catalogue" linking to the existing catalogue PDF, alongside "Book a Showroom Visit" tying into the existing floating-CTA pattern already present in `_template.html`

## Editorial Flourishes (full treatment, adapted to the existing system)

- **Arched-niche image framing**: asymmetric `border-radius` crops on collection imagery (signature blocks and grid tiles), echoing Obsidian Assembly's staged-object alcoves while staying consistent with the rounded-corner language already used by `.page-hero`
- **Organic gold gradient divider lines**: thin full-width rules using `linear-gradient(90deg, transparent, var(--gold-2), transparent)` between major sections, replacing hard `border` lines for a softer, flowing transition
- **Word-reveal title animations**: reuse the template's existing `.word > span` reveal pattern (already defined in `_template.html` CSS/animations) for section headings — no new custom letter-scramble system, keeping full consistency with `about.html`/`index.html`
- **Hover interactions**: gold underline draw-in (`width` transition, matches `.link-arrow:hover::after`), image scale-zoom on hover (matches `.page-hero img` / category tile conventions)

## Technical Approach

- New file `collections.html`, created by copying `_template.html` and filling only the marked PAGE-SPECIFIC CSS / PAGE CONTENT / PAGE-SPECIFIC JS blocks — no boilerplate rebuilt
- All styling uses existing design tokens exclusively: `--gold`, `--gold-2`, `--gold-pale`, `--cream`, `--cream-deep`, `--ink`, `--ink-mid`, `--soft`, `--line`, `--shadow-sm/md/lg`, `.serif`, `.eyebrow`, `.wrap`, `.sec`, `.sec-title`, `.link-arrow`, `.reveal`/`.reveal-left`/`.reveal-right`/`.stagger-children`
- No new image assets are introduced; all imagery is reused from `images/home/*` per the agreed scope
- Set `class="active"` on the "Collections" nav link; set `data-header-scheme="dark"` on the hero section only
- `index.html#collection` (confirmed at `index.html:2305`) anchors the homepage's "Explore the Collection" product carousel — a distinct feature from this new page. The carousel section itself stays untouched.
- Repoint the site-wide nav "Collections" link (currently `<a href="index.html#collection">Collections</a>`, present in the header markup of `_template.html`, `index.html`, `about.html`, and `contact.html`) to `collections.html` in all four files, since that label more naturally targets a dedicated overview page. The homepage carousel remains reachable by scrolling/internal links; it's just no longer the global nav target for "Collections".

## Out of Scope

- No new photography/asset sourcing (per user decision: reuse existing imagery)
- No individual collection detail pages/routes — this is a single overview/index page
- No filtering/sorting UI (source page has none; Obsidian Assembly's filtering is minimal/absent too)
- No custom letter-scramble text engine — word/line reveal reuses the template's existing animation system
