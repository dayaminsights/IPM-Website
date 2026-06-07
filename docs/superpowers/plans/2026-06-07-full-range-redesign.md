# Full Range Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 4-column "Full Range" grid in `collections.html` with a two-part scroll-driven showcase — three flagship collections in alternating editorial rows with morphing arch reveals, followed by a pinned, scroll-scrubbed morphing-viewport index for the remaining eight collections.

**Architecture:** Pure HTML/CSS/JS additions to the existing single-file `collections.html`, following the page's established patterns exactly: GSAP + ScrollTrigger + MorphSVGPlugin + SplitText for choreography, Lenis for smooth scroll (already initialized), `clipPath` SVG defs for shape morphing, `ScrollTrigger.batch` for staggered grid reveals, and the existing `reduceMotion` guard for accessibility fallback. No new dependencies, no new files — this is a like-for-like replacement of the existing `<!-- ===== THE FULL RANGE ===== -->` section (currently `collections.html:824-889`) plus its associated CSS (`collections.html:576-597`) and JS (`collections.html:1254-1273`).

**Tech Stack:** GSAP 3.15 (+ ScrollTrigger, MorphSVGPlugin, SplitText), Lenis 1.3.23, vanilla JS, CSS custom properties — all already loaded on this page.

---

## Important Context for the Engineer

- This is a **static site with no build step and no test framework**. "Tests" in this plan are manual verification steps: open the page in a browser (e.g. via VS Code Live Server or simply opening the file), scroll through the section, and visually confirm the described behavior. There is no `npm test` to run.
- All work happens in **one file**: `collections.html`. It has three zones — a `<style>` block (CSS), the page `<body>` (HTML), and a `<script>` block (JS) — each with a marked "ADD ABOVE/BELOW THIS LINE" insertion point. Follow those markers; do not reorganize the file.
- The page already initializes GSAP, ScrollTrigger, MorphSVGPlugin, SplitText, Lenis, and a `reduceMotion` flag inside `if (!reduceMotion && window.gsap && window.ScrollTrigger) { ... }` starting at `collections.html:1143`. New scroll-driven JS must live inside that block, in the same style as the existing `.sig-block` and `.range-tile` handlers.
- Existing CSS custom properties you'll use: `--ink`, `--soft`, `--gold`, `--gold-2`, `--line-2`, `--shadow-sm` (defined per-page in the `<style>` block's token section — search for `--gold:` to find them).
- Reuse existing image assets only: `images/home/cat-faucets.jpg`, `cat-mixers.jpg`, `cat-showers.jpg`, `cat-coloured.jpg`, `cat-accessories.jpg` (the same five category photos the current grid already cycles through — there are no per-collection photos).
- All collection links remain `href="#"` placeholders (collection detail pages don't exist yet — this matches the current code).

---

## File Structure

Single file modified: `collections.html`

| Zone | What changes |
|---|---|
| `<style>` block, lines ~576-597 (`.range-grid` rules) | Replaced with new rules for `.range-feature` (Part A rows) and `.range-index` (Part B pinned index), plus their sub-elements |
| `<style>` block, line ~642 (responsive override `.range-grid {...}`) | Replaced with mobile rules for `.range-feature` and `.range-index` |
| `<body>`, lines 824-889 (`<!-- ===== THE FULL RANGE ===== -->` section) | Replaced with new markup: 3 `.range-feature` rows + `.range-index` pinned block, plus a small inline `<svg>` clipPath defs block (mirroring the pattern at lines 778-787) |
| `<script>` block, lines 1254-1273 (`FULL RANGE GRID` handler) | Replaced with new handlers: Part A row choreography (morph + SplitText + parallax) and Part B pinned scroll-scrub timeline, plus mobile/reduced-motion fallbacks |

---

## Task 1: Replace Full Range CSS — Part A (Featured rows) and shared tokens

**Files:**
- Modify: `collections.html:576-597` (replace `.range-grid` block entirely)

- [ ] **Step 1: Read the current block to confirm line numbers haven't shifted**

Open `collections.html` and locate the comment `COLLECTIONS PAGE — FULL RANGE GRID` (search for it). Confirm it's immediately followed by `.range-grid { ... }` and the related `.range-tile` rules, ending just before the `COLLECTIONS PAGE — FINISHES STRIP` comment.

- [ ] **Step 2: Replace the `.range-grid` CSS block with `.range-feature` (Part A) rules**

Replace the entire block (from `/* ===... FULL RANGE GRID ===*/` comment through the last `.range-tile:hover .underline { width: 60px; ... }` rule) with:

```css
/* ================================================================
   COLLECTIONS PAGE — FULL RANGE: FEATURED SHOWCASE (Part A)
================================================================ */
.range-feature {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  margin-bottom: 76px;
}
.range-feature:last-of-type { margin-bottom: 0; }
.range-feature .arch { aspect-ratio: 4/3; }
.range-feature .arch img { transform: scale(1.18); transform-origin: 50% 50%; }
.range-feature-copy .eyebrow { display: flex; align-items: center; gap: 10px; }
.range-feature-copy .eyebrow .mark {
  display: inline-block; width: 9px; height: 9px;
  border: 1px solid var(--gold); transform: rotate(45deg);
}
.range-feature-copy h3 { font-weight: 400; font-size: clamp(34px, 4vw, 50px); line-height: 1.05; margin: 12px 0 16px; }
.range-feature-copy p { color: var(--soft); max-width: 420px; margin-bottom: 24px; }

/* ================================================================
   COLLECTIONS PAGE — FULL RANGE: MORPHING INDEX (Part B)
================================================================ */
.range-index {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 72px;
  align-items: center;
  padding: 64px 0;
}
.range-index-list { display: flex; flex-direction: column; gap: 4px; }
.range-index-item {
  display: flex; align-items: baseline; gap: 16px;
  padding: 14px 0; cursor: default;
  border-bottom: 1px solid var(--line-2);
}
.range-index-item .num {
  font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: .08em;
  color: var(--soft); opacity: .55; min-width: 28px;
}
.range-index-item .name {
  font-family: 'Fraktion Serif', Georgia, serif; font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 400; color: var(--soft); transition: color .4s, transform .4s;
}
.range-index-item.is-active .name { color: var(--gold); transform: translateX(8px); }
.range-index-item .underline {
  display: block; width: 0; height: 1px; background: var(--gold-2);
  margin-top: 6px; transition: width .4s cubic-bezier(.4,0,.2,1);
}
.range-index-item.is-active .underline { width: 48px; }

.range-index-stage {
  position: relative; aspect-ratio: 1/1; max-width: 520px; margin: 0 auto;
}
.range-index-stage svg.morph-host { position: absolute; inset: 0; width: 100%; height: 100%; }
.range-index-stage .stage-img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; clip-path: url(#rangeIndexClip);
  opacity: 0;
}
.range-index-stage .stage-img.is-active { opacity: 1; }
```

- [ ] **Step 3: Locate the responsive override and replace `.range-grid` rule there**

Search for `.range-grid { grid-template-columns: repeat(2, 1fr);` inside the `@media (max-width: 860px)` block (around the line that also sets `.sig-block { grid-template-columns: 1fr; ...}`).

Replace that single `.range-grid { ... }` line with:

```css
  .range-feature { grid-template-columns: 1fr; gap: 24px; margin-bottom: 52px; }
  .range-index { grid-template-columns: 1fr; gap: 0; padding: 0; }
  .range-index-stage { display: none; }
  .range-index-item { border-bottom: none; padding: 0; }
  .range-index-card {
    margin-bottom: 36px; padding-bottom: 28px; border-bottom: 1px solid var(--line-2);
  }
  .range-index-card:last-child { margin-bottom: 0; border-bottom: none; }
  .range-index-card .arch {
    aspect-ratio: 4/3; margin-top: 14px; clip-path: url(#rangeIndexClip);
  }
```

- [ ] **Step 4: Save and visually scan**

Open `collections.html` in a browser (no server needed — open the file directly, or use a local static server if the project has one). Confirm the page still loads without console CSS errors (the markup hasn't changed yet, so the Full Range section will look broken/empty — that's expected until Task 2).

- [ ] **Step 5: Commit**

```bash
git add collections.html
git commit -m "Replace Full Range grid CSS with featured-row and morphing-index styles"
```

---

## Task 2: Replace Full Range HTML — Part A rows + Part B index markup

**Files:**
- Modify: `collections.html:824-889` (replace the `<!-- ===== THE FULL RANGE ===== -->` section)

- [ ] **Step 1: Locate the section to replace**

Find `<!-- ===== THE FULL RANGE ===== -->` and select through the closing `</section>` that follows the `range-grid` div (just before the next `<div class="sec-divider">`).

- [ ] **Step 2: Replace with new markup**

Replace the entire `<section class="sec range-section">...</section>` block with:

```html
<!-- ===== THE FULL RANGE ===== -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <clipPath id="rangeArchClip0" clipPathUnits="objectBoundingBox">
      <path id="rangeArchPath0" d="M0,0.3 L0.16,0.06 L0.84,0.06 L1,0.3 L1,1 L0,1 Z"/>
    </clipPath>
    <clipPath id="rangeArchClip1" clipPathUnits="objectBoundingBox">
      <path id="rangeArchPath1" d="M0,0.3 L0.16,0.06 L0.84,0.06 L1,0.3 L1,1 L0,1 Z"/>
    </clipPath>
    <clipPath id="rangeIndexClip" clipPathUnits="objectBoundingBox">
      <path id="rangeIndexPath" d="M0.5,0 C0.78,0 1,0.22 1,0.5 C1,0.78 0.78,1 0.5,1 C0.22,1 0,0.78 0,0.5 C0,0.22 0.22,0 0.5,0 Z"/>
    </clipPath>
  </defs>
</svg>

<section class="sec range-section">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">The Full Range</div>
      <h2 class="serif">Eleven collections, <em>one standard of craft.</em></h2>
    </div>

    <!-- Part A: Featured Showcase -->
    <div class="range-feature">
      <div class="range-feature-vis">
        <div class="arch"><img src="images/home/cat-faucets.jpg" alt="Cube collection — geometric brass fittings"></div>
      </div>
      <div class="range-feature-copy">
        <div class="eyebrow"><span class="mark" aria-hidden="true"></span>Cube</div>
        <h3 class="serif">Geometry, perfected in brass.</h3>
        <p>Crisp angles and confident proportions — Cube brings an architectural precision to faucets, mixers and accessories built for considered spaces.</p>
        <a href="#" class="link-arrow">Explore Cube</a>
      </div>
    </div>

    <div class="range-feature">
      <div class="range-feature-copy">
        <div class="eyebrow"><span class="mark" aria-hidden="true"></span>Cube Prima</div>
        <h3 class="serif">The Cube standard, elevated.</h3>
        <p>Every Cube proportion, refined further — Prima adds depth of finish and detail for spaces that ask a little more of their fittings.</p>
        <a href="#" class="link-arrow">Explore Cube Prima</a>
      </div>
      <div class="range-feature-vis">
        <div class="arch"><img src="images/home/cat-mixers.jpg" alt="Cube Prima collection — refined geometric brass fittings"></div>
      </div>
    </div>

    <div class="range-feature">
      <div class="range-feature-vis">
        <div class="arch"><img src="images/home/cat-showers.jpg" alt="Fuzone collection — brass shower fittings"></div>
      </div>
      <div class="range-feature-copy">
        <div class="eyebrow"><span class="mark" aria-hidden="true"></span>Fuzone</div>
        <h3 class="serif">Where form meets flow.</h3>
        <p>Engineered for the shower space — Fuzone pairs clean silhouettes with the kind of finish-grade detail that holds up to daily ritual.</p>
        <a href="#" class="link-arrow">Explore Fuzone</a>
      </div>
    </div>

    <!-- Part B: Morphing Index -->
    <div class="range-index">
      <div class="range-index-list">
        <div class="range-index-item is-active" data-img="images/home/cat-coloured.jpg" data-alt="Flora collection">
          <span class="num">01</span>
          <span class="name serif">Flora</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-faucets.jpg" data-alt="JP collection">
          <span class="num">02</span>
          <span class="name serif">JP</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-mixers.jpg" data-alt="Premium collection">
          <span class="num">03</span>
          <span class="name serif">Premium</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-showers.jpg" data-alt="Para Collection">
          <span class="num">04</span>
          <span class="name serif">Para Collection</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-faucets.jpg" data-alt="Allied collection">
          <span class="num">05</span>
          <span class="name serif">Allied</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-coloured.jpg" data-alt="Zenith Collections">
          <span class="num">06</span>
          <span class="name serif">Zenith Collections</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-accessories.jpg" data-alt="Square Brass Accessories collection">
          <span class="num">07</span>
          <span class="name serif">Square Brass Accessories</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
        <div class="range-index-item" data-img="images/home/cat-accessories.jpg" data-alt="Round Brass Accessories collection">
          <span class="num">08</span>
          <span class="name serif">Round Brass Accessories</span>
          <span class="underline" aria-hidden="true"></span>
        </div>
      </div>

      <div class="range-index-stage" aria-hidden="true">
        <img class="stage-img is-active" src="images/home/cat-coloured.jpg" alt="">
        <img class="stage-img" src="images/home/cat-faucets.jpg" alt="">
      </div>
    </div>

    <!-- Mobile-only fallback cards (hidden on desktop via .range-index-card { display:none } default; shown ≤860px) -->
    <div class="range-index-mobile">
      <div class="range-index-card">
        <span class="name serif">Flora</span>
        <div class="arch"><img src="images/home/cat-coloured.jpg" alt="Flora collection"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">JP</span>
        <div class="arch"><img src="images/home/cat-faucets.jpg" alt="JP collection"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">Premium</span>
        <div class="arch"><img src="images/home/cat-mixers.jpg" alt="Premium collection"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">Para Collection</span>
        <div class="arch"><img src="images/home/cat-showers.jpg" alt="Para Collection"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">Allied</span>
        <div class="arch"><img src="images/home/cat-faucets.jpg" alt="Allied collection"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">Zenith Collections</span>
        <div class="arch"><img src="images/home/cat-coloured.jpg" alt="Zenith Collections"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">Square Brass Accessories</span>
        <div class="arch"><img src="images/home/cat-accessories.jpg" alt="Square Brass Accessories collection"></div>
      </div>
      <div class="range-index-card">
        <span class="name serif">Round Brass Accessories</span>
        <div class="arch"><img src="images/home/cat-accessories.jpg" alt="Round Brass Accessories collection"></div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add the desktop/mobile visibility split for the two index variants**

The `.range-index` (desktop pinned version) and `.range-index-mobile` (card fallback) must not both show at once. In the `<style>` block, find the `.range-index-stage .stage-img.is-active { opacity: 1; }` rule (added in Task 1, Step 2) and insert these two rules directly after it:

```css
.range-index-mobile { display: none; }
@media (max-width: 860px) {
  .range-index { display: none; }
  .range-index-mobile { display: block; }
}
```

- [ ] **Step 4: Visual check**

Open the page in a browser. The Full Range section should now show: 3 alternating image/copy rows (images at full opacity, no morph yet — that's Task 3), then a two-column list+image area, then (if you resize to mobile width) a stacked card list. Confirm no broken images (all five `cat-*.jpg` files exist in `images/home/`).

- [ ] **Step 5: Commit**

```bash
git add collections.html
git commit -m "Replace Full Range markup with featured rows and morphing index sections"
```

---

## Task 3: Part A choreography — morph-open arch reveal, SplitText headline, parallax

**Files:**
- Modify: `collections.html:1254-1273` (replace the `FULL RANGE GRID` JS handler)

This mirrors the existing `.sig-block` handler (`collections.html:1199-1252`) almost exactly, but targets `.range-feature` and uses the new `rangeArchClip0`/`rangeArchClip1` defs added in Task 2.

- [ ] **Step 1: Locate the handler to replace**

Find the comment `/* ---- FULL RANGE GRID: staggered tilt + scale-in, underline draws in behind ---- */` (currently `collections.html:1254`) and select through the end of its `ScrollTrigger.batch(...)` call (the line `});` that closes it, just before the `FINISHES STRIP` comment).

- [ ] **Step 2: Replace with the Part A + Part B handler shell**

Replace that whole block with:

```javascript
  /* ---- FULL RANGE — PART A: featured rows morph open + SplitText + parallax ---- */
  const RANGE_SLIVER   = 'M0.42,0.5 C0.42,0.46 0.58,0.46 0.58,0.5 L0.58,1 L0.42,1 Z';
  const RANGE_ARCH     = 'M0,0.3 L0.16,0.06 L0.84,0.06 L1,0.3 L1,1 L0,1 Z';
  const rangeClipPaths = [document.querySelector('#rangeArchPath0'), document.querySelector('#rangeArchPath1')];

  gsap.utils.toArray('.range-feature').forEach((block, i) => {
    const img    = block.querySelector('.arch img');
    const vis    = block.querySelector('.range-feature-vis');
    const copy   = block.querySelector('.range-feature-copy');
    const h3     = block.querySelector('.range-feature-copy h3');
    const fromX  = i % 2 === 0 ? -36 : 36;
    const clipEl = rangeClipPaths[i % 2];
    const clipId = i % 2 === 0 ? 'rangeArchClip0' : 'rangeArchClip1';

    let h3Split = null;
    if (window.SplitText && h3) {
      h3Split = new SplitText(h3, { type: 'words' });
      gsap.set(h3Split.words, { opacity: 0, y: '55%' });
    }

    gsap.set(img,    { clipPath: `url(#${clipId})` });
    gsap.set(clipEl, { morphSVG: RANGE_SLIVER });
    gsap.set(vis,    { opacity: 0, x: fromX });
    gsap.set(copy,   { opacity: 0, y: 28 });

    /* Arch morphs open as the row scrolls into view — same scroll-bound aperture
       technique as .sig-block, but a sharper/angular silhouette to differentiate
       this "next tier" showcase from the rounded Signature Lines apertures. */
    gsap.to(clipEl, {
      morphSVG: RANGE_ARCH, ease: 'none',
      scrollTrigger: { trigger: block, start: 'top 95%', end: 'top 35%', scrub: .6 }
    });

    ScrollTrigger.create({
      trigger: block, start: 'top 80%', once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        tl.to(vis, {
            opacity: 1, x: 0, duration: .85, ease: 'power3.out',
            onComplete: () => gsap.set(vis, { clearProps: 'opacity,transform' })
          })
          .to(copy, {
            opacity: 1, y: 0, duration: .75, ease: 'power3.out',
            onComplete: () => gsap.set(copy, { clearProps: 'opacity,transform' })
          }, '<.12');
        if (h3Split) {
          tl.to(h3Split.words, {
            opacity: 1, y: '0%', duration: .65, stagger: .055, ease: 'power3.out',
            onComplete: () => gsap.set(h3Split.words, { clearProps: 'all' })
          }, '<');
        }
      }
    });

    gsap.to(img, {
      yPercent: -7, ease: 'none',
      scrollTrigger: { trigger: block, start: 'top bottom', end: 'bottom top', scrub: .8 }
    });
  });
```

- [ ] **Step 3: Verify the morph shapes are valid SVG path data**

`MorphSVGPlugin` requires both the `from` and `to` shapes to be compatible path strings. `RANGE_SLIVER` and `RANGE_ARCH` both use `objectBoundingBox` coordinates (0–1 range) consistent with the `rangeArchClip0`/`rangeArchClip1` defs from Task 2 (which start life as the same `RANGE_ARCH` "open" path — the plugin morphs *from* the sliver *to* this shape). This mirrors exactly how `SIG_SLIVER_L`/`SIG_ARCH_FULL` relate to `sigPath0`/`sigPath1` in the existing code (`collections.html:1194-1196, 1215, 1222-1225`).

- [ ] **Step 4: Test in browser**

Reload `collections.html`, scroll to the Full Range section. Confirm for each of the 3 featured rows:
- The image starts hidden behind a narrow vertical sliver shape and morphs open into an angular arch as you scroll the row into view (and narrows again scrolling back up — scrub is bidirectional)
- The headline words rise and fade in word-by-word
- The copy and link fade up shortly after
- The image drifts slightly (parallax) as you continue scrolling past the row

If `SplitText` or `MorphSVGPlugin` throws a console error, confirm the CDN script tags at `collections.html:1015-1019` loaded successfully (check Network tab) — these are the same plugins the Signature Lines section already depends on, so if those work, this will too.

- [ ] **Step 5: Commit**

```bash
git add collections.html
git commit -m "Add morph-open arch reveal and SplitText choreography to Full Range featured rows"
```

---

## Task 4: Part B — pinned scroll-scrubbed morphing index (desktop)

**Files:**
- Modify: `collections.html` — append directly after the Part A `forEach` block written in Task 3 (inside the same `if (!reduceMotion && ...)` guard)

- [ ] **Step 1: Add the morphing-index timeline code**

Immediately after the closing `});` of the `.range-feature` `forEach` loop from Task 3, add:

```javascript

  /* ---- FULL RANGE — PART B: pinned, scroll-scrubbed morphing index ---- */
  const rangeIndex = document.querySelector('.range-index');
  if (rangeIndex && window.matchMedia('(min-width: 861px)').matches) {
    const items      = gsap.utils.toArray('.range-index-item');
    const stage      = rangeIndex.querySelector('.range-index-stage');
    const stageImgs  = gsap.utils.toArray('.stage-img');
    const indexClip  = document.querySelector('#rangeIndexPath');
    const n          = items.length;

    /* Three-shape cycle echoing the brand's geometric vocabulary; consecutive
       collections always land on a different shape so the morph reads clearly. */
    const SHAPE_CIRCLE = 'M0.5,0 C0.78,0 1,0.22 1,0.5 C1,0.78 0.78,1 0.5,1 C0.22,1 0,0.78 0,0.5 C0,0.22 0.22,0 0.5,0 Z';
    const SHAPE_ARCH   = 'M0,0.3 L0.16,0.06 L0.84,0.06 L1,0.3 L1,1 L0,1 Z';
    const SHAPE_HEX    = 'M0.5,0 L1,0.27 L1,0.73 L0.5,1 L0,0.73 L0,0.27 Z';
    const shapeCycle   = [SHAPE_CIRCLE, SHAPE_ARCH, SHAPE_HEX];

    gsap.set(indexClip, { morphSVG: shapeCycle[0] });

    const master = gsap.timeline({
      scrollTrigger: {
        trigger: rangeIndex,
        start: 'top top',
        end: () => `+=${n * 420}`,
        scrub: .7,
        pin: true,
        anticipatePin: 1
      }
    });

    for (let idx = 1; idx < n; idx++) {
      const segmentLabel = `to${idx}`;
      master.addLabel(segmentLabel, idx - 1);

      master.to(indexClip, { morphSVG: shapeCycle[idx % shapeCycle.length], duration: 1, ease: 'power2.inOut' }, segmentLabel);

      master.to(stageImgs[(idx - 1) % 2], { opacity: 0, scale: 1.05, duration: 1, ease: 'power2.inOut' }, segmentLabel);
      master.set(stageImgs[idx % 2], { attr: { src: items[idx].dataset.img, alt: items[idx].dataset.alt } }, segmentLabel);
      master.to(stageImgs[idx % 2], { opacity: 1, scale: 1, duration: 1, ease: 'power2.inOut' }, segmentLabel);

      master.call(() => {
        items[idx - 1].classList.remove('is-active');
        items[idx].classList.add('is-active');
      }, null, segmentLabel);
    }

    /* Returning upward through the pinned section reverses the active state too. */
    master.eventCallback('onUpdate', () => {
      const p = master.progress();
      const active = Math.min(n - 1, Math.round(p * (n - 1)));
      items.forEach((it, k) => it.classList.toggle('is-active', k === active));
    });
  }
```

- [ ] **Step 2: Test in browser — desktop width**

Resize the browser to ≥861px wide. Scroll into the Full Range section's index area. Confirm:
- The section **pins** (stays fixed in the viewport) while you continue scrolling
- As you scroll, list items light up in gold sequence (01 Flora → 02 JP → ... → 08 Round Brass Accessories), each with an underline draw-in, while the previous item dims back to neutral
- The stage image crossfades to the next collection's photo in sync with the active item changing
- The clip-path shape morphs through circle → arch → hexagon → circle... at each transition (you'll see the visible silhouette of the stage change shape, not just the photo change)
- Scrolling back up reverses the sequence smoothly
- After the last item (08), continued scrolling un-pins the section and moves on to the Finishes section below

- [ ] **Step 3: Tune pacing if needed**

If the pin feels too long or too short, adjust the `420` multiplier in `end: () => \`+=${n * 420}\`` — larger number = more scroll distance per collection (slower pacing), smaller = faster. Re-test after any change. This is a feel-based tuning step; there's no "correct" number, just choose what feels right when scrolling at a normal pace.

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add pinned scroll-scrubbed morphing viewport for Full Range index"
```

---

## Task 5: Mobile fallback reveal + reduced-motion fallback

**Files:**
- Modify: `collections.html` — append after the Part B block from Task 4 (still inside the `if (!reduceMotion && ...)` guard), and add one small block outside that guard for the reduced-motion case

- [ ] **Step 1: Add `ScrollTrigger.batch` reveal for the mobile index cards**

This follows the exact same pattern as the existing `.finish` reveal (`collections.html:1276-1295`). Append immediately after the Part B block from Task 4 (still inside the `if (!reduceMotion ...)` block):

```javascript

  /* ---- FULL RANGE — PART B mobile fallback: per-card reveal with one-shot shape clip ---- */
  const indexCards = gsap.utils.toArray('.range-index-card');
  if (indexCards.length) {
    gsap.set(indexCards, { opacity: 0, y: 36 });
    ScrollTrigger.batch('.range-index-card', {
      start: 'top 90%', once: true,
      onEnter: batch => {
        gsap.to(batch, {
          opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .08,
          onComplete: () => gsap.set(batch, { clearProps: 'opacity,transform' })
        });
      }
    });
  }
```

Note: the mobile cards already get the hexagon-style clip via the shared `clip-path: url(#rangeIndexClip)` rule added in Task 1 Step 3 (`.range-index-card .arch`) — so they display with the same geometric silhouette language without needing their own morph timeline. This keeps the mobile experience visually connected to desktop without the complexity of pin-scrub on small viewports.

- [ ] **Step 2: Verify the reduced-motion fallback already works**

The entire Part A/B JS in Tasks 3-4 lives inside `if (!reduceMotion && window.gsap && window.ScrollTrigger)`. When `reduceMotion` is `true` (OS-level "reduce motion" preference), none of this runs — `gsap.set` calls that hide elements (`opacity: 0`, clip-paths, etc.) never execute, so elements stay at their natural CSS state (fully visible, no morph, no pin). This matches how the existing Signature Lines and Finishes sections already degrade.

To verify: in Chrome DevTools, open the Command Palette (Ctrl+Shift+P), run "Show Rendering", and set "Emulate CSS prefers-reduced-motion" to "reduce". Reload the page. Confirm the Full Range section displays all rows and index items immediately, fully visible, with no pinning or morphing — just the static CSS layout.

- [ ] **Step 3: Test mobile width end-to-end**

Resize browser to ≤860px (or use device emulation for a phone viewport). Confirm:
- The 3 featured rows stack vertically (image above copy, single column)
- The desktop `.range-index` (pinned list+stage) is hidden
- The `.range-index-mobile` card list is visible, each card showing a name + image with a soft hexagonal clip silhouette
- Cards fade/rise into view staggered as you scroll down, matching the `.finish` reveal feel

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add mobile card fallback reveal for Full Range morphing index"
```

---

## Task 6: Full end-to-end verification pass

**Files:** None modified — verification only.

- [ ] **Step 1: Desktop full-section scroll-through**

Starting from the Signature Lines section above, scroll continuously down through: 3 featured rows (morph-open + text reveal + parallax) → pinned morphing index (8 collections cycling) → Finishes strip. Confirm transitions feel continuous and the page doesn't jump or stutter at the section boundaries (entering/exiting the pin).

- [ ] **Step 2: Scroll-back (reverse) check**

From partway through the morphing index, scroll back up through the index and through the 3 featured rows to Signature Lines. Confirm: index items/shapes/images reverse correctly, featured-row arches narrow back to slivers, and nothing "snaps" or skips.

- [ ] **Step 3: Cross-check against the spec**

Open `docs/superpowers/specs/2026-06-07-full-range-redesign-design.md` and confirm each requirement is met:
- [ ] Part A: 3 alternating rows (Cube, Cube Prima, Fuzone) with angular morph-open arch, SplitText headline, parallax — ✓ Tasks 2-3
- [ ] Part B: pinned scroll-scrubbed viewport cycling through 8 remaining collections with arch→circle→hexagon shape morph and crossfade — ✓ Tasks 2, 4
- [ ] List-item highlight (gold + underline) synced to active collection — ✓ Task 4
- [ ] Mobile fallback: no pin, compact cards with one-shot reveal — ✓ Task 5
- [ ] Reduced-motion fallback: static, fully visible, no morph/pin — ✓ Task 5 Step 2
- [ ] No new dependencies, reuses existing image assets — ✓ confirm by checking no new `<script src>` tags were added and only `cat-*.jpg` files are referenced

- [ ] **Step 4: Browser console check**

Open DevTools console, reload, scroll through the entire section. Confirm zero JavaScript errors or warnings related to GSAP, ScrollTrigger, MorphSVGPlugin, or SplitText.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

If verification surfaced any small fixes, commit them individually with descriptive messages. If everything passed without changes, no commit is needed for this task.

---

## Notes for Future Work (do not implement now)

- True video-to-video morphing was considered during design but requires per-collection video clips that don't currently exist (only one generic homepage video at `images/home/ipm home page video.mp4`). The `.range-index-stage` is built around `<img>` elements specifically so that swapping to `<video>` later requires only changing the element type and `data-img` → `data-src` wiring in Task 4 Step 1 — the morph/crossfade timeline structure would not need to change.
- Collection links (`href="#"`) remain placeholders until detail pages exist, consistent with the rest of this page's current state.
