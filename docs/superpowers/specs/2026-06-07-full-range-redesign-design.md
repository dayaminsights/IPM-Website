# Full Range Section Redesign — Design Spec

**Page:** `collections.html` — "The Full Range" section (currently lines ~824-889)
**Date:** 2026-06-07
**Status:** Approved for planning

## Problem

The current Full Range section is a flat 4-column grid of 11 identical arch-tiles
(image + name + underline). Compared to the rest of the page — which uses morphing
apertures, scroll-bound parallax, and choreographed reveals (Lenis + GSAP +
ScrollTrigger + MorphSVGPlugin) — this section feels static, repetitive, and empty.
It reads as a placeholder grid bolted onto a rich page.

## Goal

Redesign the section into a scroll-driven showcase that:
- Feels as rich and "alive" as the Signature Lines and hero sections
- Builds in morph-driven interaction (per user request — using the page's existing
  `morphSVG`/clip-path technique, since true video-to-video morphing would require
  per-collection video assets that don't currently exist)
- Minimizes clicks — the experience advances passively via scroll
- Avoids simply repeating 11x the rhythm of the Signature Lines section above it

## Approach: Two-Part Showcase

Replace the single flat grid with two distinct sub-sections that together cover
all 11 collections, paced to avoid monotony and excessive scroll length.

### Part A — Featured Showcase (Cube, Cube Prima, Fuzone)

Three flagship collections get a full editorial treatment.

**Layout:**
- Alternating two-column rows (image | copy), alternating sides per row — built on
  a new `.range-feature` block (NOT reusing `.sig-block` directly, to avoid visual
  duplication; shares the underlying alternating-grid skeleton but gets distinct
  styling)
- Slightly more compact row height than `.sig-block` (these are secondary to
  Aliva/Opell Prima)

**Image treatment:**
- Wrapped in an SVG clip-path that morphs from a narrow sliver into a tall
  **angular/faceted arch** silhouette as the row scrolls into view (new
  `RANGE_ARCH` morph shape — visually related to but distinct from
  `SIG_ARCH_FULL`, more geometric/faceted to echo "Cube" and signal "next tier")
- Same scroll-bound parallax drift pattern as `.sig-block img`
  (`gsap.to(img, { yPercent, scrollTrigger: { scrub: true } })`)

**Copy block (per row):**
- Eyebrow label with small geometric accent mark (a recurring motif across all
  three rows, echoing the "Cube" geometric language)
- Serif headline, SplitText word-reveal on scroll-enter:
  - Cube → "Geometry, perfected in brass."
  - Cube Prima → "The Cube standard, elevated."
  - Fuzone → "Where form meets flow."
- One-line descriptor (material/use-case framing, brand voice)
- Restrained text-link "Explore [Name] →" (not a button — keeps interaction
  low-pressure, matches existing CTA language; `href="#"` placeholder until
  collection pages exist)

**Entrance choreography:**
- `ScrollTrigger.create` + timeline per block: clip-path morph open → SplitText
  words rise+fade → copy/link fade+rise — mirrors the existing `.sig-block`
  `onEnter` timeline pattern so it feels native to the page

### Part B — Morphing Index (remaining 8 collections)

Flora, JP, Premium, Para Collection, Allied, Zenith Collections,
Square Brass Accessories, Round Brass Accessories.

**Desktop layout (pinned, scroll-scrubbed):**
- `ScrollTrigger.create({ pin: true, scrub: true })` over a section sized to give
  each of the 8 collections an even scroll segment
- Left column: vertical list of 8 collection names (serif, generous spacing)
- Right column: single large viewport — an SVG `clipPath` wrapping a stack of
  `<img>` elements (one per collection)

**Morph mechanics (driven by master timeline + scrub progress):**
1. Crossfade active image → next (`opacity` swap + slight scale pulse)
2. Morph the clip-path shape through a repeating cycle of the brand's geometric
   vocabulary: **arch → circle → hexagon → arch → circle → hexagon...** — using
   `MorphSVGPlugin` exactly as in the hero reveal and signature apertures.
   Consecutive collections always land on different shapes from the cycle so the
   morph is visually evident at every transition
3. Update the active list item: gold color shift + underline draw-in + weight/scale
   emphasis (mirrors existing `.range-tile:hover` language); previous active item
   resets to neutral

**Progress mapping:**
- Section scroll progress (0→1) split into 8 even segments on a master GSAP
  timeline with labels; each segment's boundary triggers that collection's
  crossfade + shape morph + list highlight via timeline position parameters
  (not per-frame `onUpdate` math — keeps it declarative and consistent with how
  `.sig-block` apertures are scroll-bound)

**Mobile/touch fallback (≤860px, matches existing breakpoint):**
- No pinning (pin-scrub is unreliable on small viewports / with mobile browser
  chrome resizing)
- Each list item becomes its own compact card with a small morphing-shape
  thumbnail (single shape per card, animates once on scroll-enter via
  `ScrollTrigger.batch`, same pattern as `.range-tile`/`.finish` reveals)

**Reduced motion:**
- Respects the existing `reduceMotion` media-query check used throughout the page
- Falls back to a static list + simple image grid with plain fades (no pin, no
  morph) — consistent with how hero/signature sections already degrade

## Visual Differentiation Summary

| Element | Signature Lines (existing) | Part A Featured | Part B Index |
|---|---|---|---|
| Layout | Alternating image/copy rows | Alternating image/copy rows (compact) | Pinned list + single morphing viewport |
| Morph shape | Rounded arch aperture | Angular/faceted arch | Cycling arch/circle/hexagon |
| Driver | Scroll-bound clip morph | Scroll-bound clip morph | Scroll-scrubbed master timeline |
| Click need | "Explore" link | "Explore [Name]" link | None (pure scroll-advance; click only to navigate, future) |

## Technical Notes

- All animation reuses the page's existing stack: Lenis (smooth scroll) + GSAP +
  ScrollTrigger + MorphSVGPlugin + SplitText + Flip — no new dependencies
- New morph shape path data (`RANGE_ARCH`, cycling shapes for Part B) need to be
  authored as SVG path strings, following the same format as existing
  `SIG_ARCH_FULL` / `ARCH_OPEN` constants near the top of the script block
- Image assets: reuse existing `images/home/cat-*.jpg` category images already
  referenced in the current grid (no new image assets required for this redesign)
- **Future content task (out of scope for this spec):** true video-to-video
  morphing was considered but requires per-collection video clips that don't
  exist (only one generic homepage video is available). The Part B viewport is
  built around an `<img>` stack so it can be swapped for `<video>` elements later
  with minimal structural rework, once such assets are produced.

## Out of Scope

- Producing/sourcing per-collection video assets
- Building actual collection detail pages (links remain `href="#"` placeholders,
  consistent with current state)
- Rewriting Signature Lines or other sections
