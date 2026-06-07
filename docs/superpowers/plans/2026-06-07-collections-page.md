# Collections Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `collections.html` page presenting IPM's 13 named collections plus its 16-finish palette, in an editorial style inspired by Obsidian Assembly, fully expressed through the existing `_template.html` design system — and wire it into site-wide navigation.

**Architecture:** Single new static HTML file (`collections.html`), copied from `_template.html` and filled in only inside its marked PAGE-SPECIFIC blocks. Six content sections (hero, intro, signature lines, full range grid, finishes strip, CTA close) are each its own `<section class="sec">`, separated by thin gradient dividers, using only existing CSS custom-property tokens and existing utility/animation classes (`.serif`, `.eyebrow`, `.wrap`, `.sec`, `.sec-title`, `.link-arrow`, `.reveal`/`.reveal-left`/`.reveal-right`/`.stagger-children`). New page-specific classes (`.arch`, `.sig-block`, `.range-tile`, `.finish`, `.sec-divider`, etc.) are added inside the page's own PAGE-SPECIFIC CSS block — following the same pattern `index.html` and `about.html` use for their unique components.

**Tech Stack:** Plain HTML + CSS (custom properties) + vanilla JS (already provided by `_template.html` — theme toggle, scroll-reveal `IntersectionObserver`, hero image zoom, header sync). No build step, no test framework — this is a static site, so verification is done by opening the page in a browser and visually checking the rendered result against the spec.

**Spec:** `docs/superpowers/specs/2026-06-07-collections-page-design.md`

---

## File Structure

- **Create:** `collections.html` — the new page (≈ template's 824 lines + new content/CSS/JS filled into the marked blocks)
- **Modify:** `_template.html:558` — repoint the "Collections" nav link
- **Modify:** `index.html:2181` — repoint the "Collections" nav link (currently a same-page anchor)
- **Modify:** `about.html:1023` and `about.html:1361` — repoint the "Collections" nav link and the "Browse Collections" CTA button
- **Modify:** `contact.html:802` — repoint the "Collections" nav link

No new image assets are added — all imagery is reused from `images/home/*` per the approved spec scope.

---

## Reference: collection & finish names used in this plan

**Signature lines (featured):** Aliva, Opell Prima

**Full range (grid, 11 names):** Cube, Cube Prima, Fuzone, Flora, JP, Premium, Para Collection, Allied, Zenith Collections, Square Brass Accessories, Round Brass Accessories

**Finishes (16, swatch strip — 15 named on the reference site, brand copy rounds to "sixteen"):** Rich Gold, Rose Gold, Polished Gun Metal Black, Matt White Gold, Matt Black Gold, Matt Beige Gold, Matt Grey Gold, Matt White, Matt Black, Matt Beige, Matt Grey, Profile White Gold, Profile Black Gold, Profile Beige Gold, Profile Grey Gold

---

### Task 1: Scaffold the page from the template

**Files:**
- Create: `collections.html` (copy of `_template.html`)

- [ ] **Step 1: Copy the template file**

```bash
cp "_template.html" "collections.html"
```

- [ ] **Step 2: Update the `<title>` and meta description**

In `collections.html`, find (originally around line 42-43):

```html
<title>Page Title — IPM Bath Fittings</title>
<meta name="description" content="IPM Bath Fittings – premium brass bathroom fittings, crafted in India since 1966.">
```

Replace with:

```html
<title>Collections — IPM Bath Fittings</title>
<meta name="description" content="Explore IPM Bath Fittings' full range of collections — Aliva, Opell Prima, Cube and more — solid brass fittings crafted in Delhi across sixteen hand-perfected finishes.">
```

- [ ] **Step 3: Set the active nav link**

Find the nav block (originally lines 557-561):

```html
    <nav class="nav-left">
      <a href="index.html">Home</a>
      <a href="index.html#collection">Collections</a>
      <a href="index.html#dealers">Dealers Network</a>
      <a href="about.html">About Us</a>
      <a href="contact.html">Contact Us</a>
    </nav>
```

Replace with:

```html
    <nav class="nav-left">
      <a href="index.html">Home</a>
      <a href="collections.html" class="active">Collections</a>
      <a href="index.html#dealers">Dealers Network</a>
      <a href="about.html">About Us</a>
      <a href="contact.html">Contact Us</a>
    </nav>
```

- [ ] **Step 4: Verify the scaffold opens correctly**

Open `collections.html` directly in a browser (double-click it, or `start collections.html` on Windows). Confirm:
- Tab title reads "Collections — IPM Bath Fittings"
- The header renders with utility bar, logo, and theme toggle
- "Collections" in the nav is underlined/highlighted as the active link
- The page is otherwise just header + empty body + footer (no content yet — that's expected)

- [ ] **Step 5: Commit**

```bash
git add collections.html
git commit -m "Scaffold collections.html from page template"
```

---

### Task 2: Build the hero section

**Files:**
- Modify: `collections.html` (PAGE CONTENT block — add as the first section)

- [ ] **Step 1: Add the hero markup**

Inside the `<!-- PAGE CONTENT — ADD BELOW THIS LINE -->` comment block, add:

```html
<!-- ===== HERO ===== -->
<section class="page-hero" data-header-scheme="dark">
  <img src="images/home/hero.jpg" alt="Solid brass fittings from the IPM 2026 collection" id="heroImg">
  <div class="scrim"></div>
  <div class="copy">
    <span class="e">The 2026 Collection</span>
    <h1>
      <span class="word"><span style="animation-delay:.45s">The</span></span>
      <span class="word"><span style="animation-delay:.62s">Collections</span></span>
    </h1>
    <p class="sub">Thirteen named lines, each shaped by fifty years of solid-brass craft in Patparganj, Delhi.</p>
  </div>
</section>
```

- [ ] **Step 2: Verify in the browser**

Reload `collections.html`. Confirm:
- A full-bleed hero image fills ~68% of the viewport height with rounded bottom corners
- "The Collections" animates in word-by-word, the eyebrow and italic subtitle fade up after it
- The header is transparent/over-dark at the top and becomes opaque once you scroll past the hero (this is the template's existing `data-header-scheme` behavior — confirms the hero is wired correctly)

- [ ] **Step 3: Commit**

```bash
git add collections.html
git commit -m "Add hero section to collections page"
```

---

### Task 3: Build the intro section + shared divider

**Files:**
- Modify: `collections.html` (PAGE-SPECIFIC CSS block + PAGE CONTENT block)

- [ ] **Step 1: Add the page-specific CSS**

Inside the `PAGE-SPECIFIC CSS — ADD BELOW THIS LINE` block, add:

```css
/* ================================================================
   COLLECTIONS PAGE — INTRO + SHARED DIVIDER
================================================================ */
.coll-intro { padding-bottom: 56px; }
.intro-copy { max-width: 680px; margin: 0 auto; text-align: center; }
.intro-copy h2 { margin: 18px 0 22px; }
.intro-copy p { color: var(--soft); font-size: 16px; }

.sec-divider { display: flex; justify-content: center; padding: 0 64px; }
.sec-divider span {
  display: block; width: 100%; max-width: 1100px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-2), transparent);
  opacity: .45;
}
```

- [ ] **Step 2: Add the intro section markup**

Directly below the hero `</section>`, add:

```html
<!-- ===== INTRO ===== -->
<section class="sec coll-intro">
  <div class="wrap">
    <div class="intro-copy reveal">
      <div class="eyebrow">A Range, Considered</div>
      <h2 class="serif">Fifty years of brass, <em>poured into thirteen lines.</em></h2>
      <p>From the everyday Cube to the sculptural Aliva, every IPM collection is designed, machined and finished under one roof — solid brass, never plated zinc, in sixteen hand-perfected finishes.</p>
    </div>
  </div>
</section>

<div class="sec-divider"><span></span></div>
```

- [ ] **Step 3: Verify in the browser**

Reload. Confirm:
- Below the hero, a centered eyebrow + serif heading + paragraph fades up as you scroll to it
- A thin horizontal gold-gradient line (fading to transparent at both ends) appears below the intro, centered in the page

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add intro section and shared divider to collections page"
```

---

### Task 4: Build the Signature Lines section

**Files:**
- Modify: `collections.html` (PAGE-SPECIFIC CSS block + PAGE CONTENT block)

- [ ] **Step 1: Add the page-specific CSS**

Append to the PAGE-SPECIFIC CSS block:

```css
/* ================================================================
   COLLECTIONS PAGE — ARCH IMAGE FRAME (shared)
================================================================ */
.arch {
  border-radius: 50% 50% 10px 10px / 26% 26% 10px 10px;
  overflow: hidden;
  position: relative;
  background: var(--cream);
}
.arch img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ================================================================
   COLLECTIONS PAGE — SIGNATURE LINES
================================================================ */
.sig-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  margin-bottom: 88px;
}
.sig-block:last-child { margin-bottom: 0; }
.sig-vis .arch { aspect-ratio: 4/3; }
.sig-vis img { transition: transform .9s cubic-bezier(.2,.6,.2,1); }
.sig-block:hover .sig-vis img { transform: scale(1.05); }
.sig-copy h3 { font-weight: 400; font-size: clamp(36px, 4.4vw, 54px); line-height: 1; margin: 14px 0 18px; }
.sig-copy p { color: var(--soft); max-width: 440px; margin-bottom: 26px; }
```

- [ ] **Step 2: Add the section markup**

Below the divider added in Task 3, add:

```html
<!-- ===== SIGNATURE LINES ===== -->
<section class="sec sig-section">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">Signature Lines</div>
      <h2 class="serif">Two collections, <em>defined by detail.</em></h2>
    </div>

    <div class="sig-block reveal-left">
      <div class="sig-vis">
        <div class="arch"><img src="images/home/line-aliva.jpg" alt="Aliva collection — sculpted brass fittings"></div>
      </div>
      <div class="sig-copy">
        <div class="e eyebrow">Signature Line</div>
        <h3 class="serif">Aliva</h3>
        <p>Soft, sculptural curves and a satin-smooth hand-finish — Aliva brings a quiet, contemporary warmth to faucets, showers and accessories alike.</p>
        <a href="#" class="link-arrow">Discover Aliva</a>
      </div>
    </div>

    <div class="sig-block reveal-right">
      <div class="sig-copy">
        <div class="e eyebrow">Signature Line</div>
        <h3 class="serif">Opell Prima</h3>
        <p>Sharp geometry and a confident, architectural silhouette — Opell Prima is built for spaces that favour clean lines and considered detail.</p>
        <a href="#" class="link-arrow">Discover Opell Prima</a>
      </div>
      <div class="sig-vis">
        <div class="arch"><img src="images/home/line-opell-prima.jpg" alt="Opell Prima collection — geometric brass fittings"></div>
      </div>
    </div>
  </div>
</section>

<div class="sec-divider"><span></span></div>
```

- [ ] **Step 3: Verify in the browser**

Reload. Confirm:
- Section heading "Two collections, defined by detail." reveals on scroll
- Aliva block: image on the left with an arched top (rounded like a doorway/niche, square-ish bottom corners), copy on the right; slides in from the left as you scroll to it
- Opell Prima block: copy on the left, image on the right (mirrored layout); slides in from the right
- Hovering either image block slowly zooms the photo (≈5% over ~0.9s)

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add Signature Lines section to collections page"
```

---

### Task 5: Build the Full Range grid

**Files:**
- Modify: `collections.html` (PAGE-SPECIFIC CSS block + PAGE CONTENT block)

- [ ] **Step 1: Add the page-specific CSS**

Append to the PAGE-SPECIFIC CSS block:

```css
/* ================================================================
   COLLECTIONS PAGE — FULL RANGE GRID
================================================================ */
.range-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 36px 28px;
}
.range-tile { display: block; }
.range-tile .arch { aspect-ratio: 3/4; }
.range-tile .arch img { transition: transform .8s cubic-bezier(.2,.6,.2,1); }
.range-tile:hover .arch img { transform: scale(1.06); }
.range-tile .name {
  display: block; margin-top: 18px; font-size: 22px; font-weight: 400;
  color: var(--ink); transition: color .3s;
}
.range-tile:hover .name { color: var(--gold); }
.range-tile .underline {
  display: block; width: 26px; height: 1px; background: var(--gold);
  margin-top: 10px; transition: width .4s cubic-bezier(.4,0,.2,1), background .4s;
}
.range-tile:hover .underline { width: 60px; background: var(--gold-2); }
```

- [ ] **Step 2: Add the section markup**

Below the divider added in Task 4, add:

```html
<!-- ===== THE FULL RANGE ===== -->
<section class="sec range-section">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">The Full Range</div>
      <h2 class="serif">Eleven more collections, <em>one standard of craft.</em></h2>
    </div>
    <div class="range-grid stagger-children">
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-faucets.jpg" alt="Cube collection"></div>
        <span class="name serif">Cube</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-mixers.jpg" alt="Cube Prima collection"></div>
        <span class="name serif">Cube Prima</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-showers.jpg" alt="Fuzone collection"></div>
        <span class="name serif">Fuzone</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-coloured.jpg" alt="Flora collection"></div>
        <span class="name serif">Flora</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-faucets.jpg" alt="JP collection"></div>
        <span class="name serif">JP</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-mixers.jpg" alt="Premium collection"></div>
        <span class="name serif">Premium</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-showers.jpg" alt="Para Collection"></div>
        <span class="name serif">Para Collection</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-faucets.jpg" alt="Allied collection"></div>
        <span class="name serif">Allied</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-coloured.jpg" alt="Zenith Collections"></div>
        <span class="name serif">Zenith Collections</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-accessories.jpg" alt="Square Brass Accessories collection"></div>
        <span class="name serif">Square Brass Accessories</span>
        <span class="underline"></span>
      </a>
      <a href="#" class="range-tile">
        <div class="arch"><img src="images/home/cat-accessories.jpg" alt="Round Brass Accessories collection"></div>
        <span class="name serif">Round Brass Accessories</span>
        <span class="underline"></span>
      </a>
    </div>
  </div>
</section>

<div class="sec-divider"><span></span></div>
```

- [ ] **Step 3: Verify in the browser**

Reload. Confirm:
- A 4-column grid of 11 tiles appears, each with an arched-top image, a serif collection name below it, and a thin gold underline
- Tiles cascade into view (staggered fade/slide) as you scroll to the grid
- Hovering a tile: image zooms slightly, the name turns gold, and the underline grows from ~26px to ~60px and brightens

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add Full Range grid to collections page"
```

---

### Task 6: Build the Finishes strip

**Files:**
- Modify: `collections.html` (PAGE-SPECIFIC CSS block + PAGE CONTENT block)

- [ ] **Step 1: Add the page-specific CSS**

Append to the PAGE-SPECIFIC CSS block:

```css
/* ================================================================
   COLLECTIONS PAGE — FINISHES STRIP
================================================================ */
.finishes-head { text-align: center; max-width: 620px; margin: 0 auto 52px; }
.finishes-head h2 { margin: 16px 0 16px; }
.finishes-head p { color: var(--soft); font-size: 15px; }
.finishes-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 30px 38px; }
.finish { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 128px; text-align: center; }
.finish .swatch {
  width: 54px; height: 54px; border-radius: 50%;
  border: 1px solid var(--line-2); box-shadow: var(--shadow-sm);
  transition: transform .35s cubic-bezier(.2,.6,.2,1);
}
.finish:hover .swatch { transform: translateY(-4px) scale(1.06); }
.finish .label { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: .08em; color: var(--soft); line-height: 1.4; }

.f-rich-gold          { background: linear-gradient(135deg,#ecd6a6,#a9762f); }
.f-rose-gold          { background: linear-gradient(135deg,#f1cdbe,#bd7c63); }
.f-gunmetal           { background: linear-gradient(135deg,#75787d,#202225); }
.f-matt-white-gold    { background: linear-gradient(135deg,#f6efdc,#dac89c); }
.f-matt-black-gold    { background: linear-gradient(135deg,#4b463d,#8a6f3c); }
.f-matt-beige-gold    { background: linear-gradient(135deg,#ecdfc6,#c5ab7c); }
.f-matt-grey-gold     { background: linear-gradient(135deg,#d3cdc0,#ad9a6c); }
.f-matt-white         { background: linear-gradient(135deg,#fcfaf5,#e3ddd1); }
.f-matt-black         { background: linear-gradient(135deg,#5d584f,#27241f); }
.f-matt-beige         { background: linear-gradient(135deg,#eee4d4,#cdbfa6); }
.f-matt-grey          { background: linear-gradient(135deg,#d8d3ca,#aca697); }
.f-profile-white-gold { background: linear-gradient(135deg,#f8f1e3,#dac794); }
.f-profile-black-gold { background: linear-gradient(135deg,#4d473d,#9e7e44); }
.f-profile-beige-gold { background: linear-gradient(135deg,#eee0c9,#caab7a); }
.f-profile-grey-gold  { background: linear-gradient(135deg,#d4cfc2,#b09868); }
```

- [ ] **Step 2: Add the section markup**

Below the divider added in Task 5, add:

```html
<!-- ===== FINISHES ===== -->
<section class="sec finishes-section">
  <div class="wrap">
    <div class="finishes-head reveal">
      <div class="eyebrow">Available In</div>
      <h2 class="serif">Sixteen Hand-Perfected <em>Finishes</em></h2>
      <p>Every collection can be ordered in the full IPM finish palette — from warm brass tones to deep matte profiles.</p>
    </div>
    <div class="finishes-row stagger-children">
      <div class="finish"><span class="swatch f-rich-gold"></span><span class="label">Rich Gold</span></div>
      <div class="finish"><span class="swatch f-rose-gold"></span><span class="label">Rose Gold</span></div>
      <div class="finish"><span class="swatch f-gunmetal"></span><span class="label">Polished Gun Metal Black</span></div>
      <div class="finish"><span class="swatch f-matt-white-gold"></span><span class="label">Matt White Gold</span></div>
      <div class="finish"><span class="swatch f-matt-black-gold"></span><span class="label">Matt Black Gold</span></div>
      <div class="finish"><span class="swatch f-matt-beige-gold"></span><span class="label">Matt Beige Gold</span></div>
      <div class="finish"><span class="swatch f-matt-grey-gold"></span><span class="label">Matt Grey Gold</span></div>
      <div class="finish"><span class="swatch f-matt-white"></span><span class="label">Matt White</span></div>
      <div class="finish"><span class="swatch f-matt-black"></span><span class="label">Matt Black</span></div>
      <div class="finish"><span class="swatch f-matt-beige"></span><span class="label">Matt Beige</span></div>
      <div class="finish"><span class="swatch f-matt-grey"></span><span class="label">Matt Grey</span></div>
      <div class="finish"><span class="swatch f-profile-white-gold"></span><span class="label">Profile White Gold</span></div>
      <div class="finish"><span class="swatch f-profile-black-gold"></span><span class="label">Profile Black Gold</span></div>
      <div class="finish"><span class="swatch f-profile-beige-gold"></span><span class="label">Profile Beige Gold</span></div>
      <div class="finish"><span class="swatch f-profile-grey-gold"></span><span class="label">Profile Grey Gold</span></div>
    </div>
  </div>
</section>

<div class="sec-divider"><span></span></div>
```

- [ ] **Step 3: Verify in the browser**

Reload. Confirm:
- A centered heading "Sixteen Hand-Perfected Finishes" appears above a wrapping row of 15 circular swatches
- Each swatch shows a distinct gold/brass/grey/black gradient and a name label beneath it (e.g. "Rich Gold", "Polished Gun Metal Black", "Matt White Gold"…)
- Hovering a swatch lifts and slightly enlarges it
- The row wraps cleanly without overlap at both desktop and narrow widths

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add Finishes strip to collections page"
```

---

### Task 7: Build the CTA close section

**Files:**
- Modify: `collections.html` (PAGE-SPECIFIC CSS block + PAGE CONTENT block)

- [ ] **Step 1: Add the page-specific CSS**

Append to the PAGE-SPECIFIC CSS block:

```css
/* ================================================================
   COLLECTIONS PAGE — CTA CLOSE
================================================================ */
.cta-close-in { text-align: center; max-width: 640px; margin: 0 auto; }
.cta-close-in h2 { margin: 16px 0 32px; }
.cta-close-row { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
```

- [ ] **Step 2: Add the section markup**

Below the divider added in Task 6 (this is the last content section, directly above the `<!-- PAGE CONTENT — ADD ABOVE THIS LINE -->` comment), add:

```html
<!-- ===== CTA CLOSE ===== -->
<section class="sec cta-close">
  <div class="wrap">
    <div class="cta-close-in reveal">
      <div class="eyebrow">Take It Further</div>
      <h2 class="serif">Find the line that <em>fits your space.</em></h2>
      <div class="cta-close-row">
        <a href="IPM Chrome Catalogue April 2026-2A.pdf" download="IPM Chrome Catalogue 2026.pdf" class="link-arrow">Request the 2026 Catalogue</a>
        <a href="contact.html" class="link-arrow">Book a Showroom Visit</a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Verify in the browser**

Reload. Confirm:
- A centered closing block reads "Find the line that fits your space." with two animated-arrow links below it
- "Request the 2026 Catalogue" downloads the existing PDF (`IPM Chrome Catalogue April 2026-2A.pdf`) when clicked
- "Book a Showroom Visit" navigates to `contact.html`
- Both links show the gold underline-grow animation on hover (existing `.link-arrow` behavior)

- [ ] **Step 4: Commit**

```bash
git add collections.html
git commit -m "Add CTA close section to collections page"
```

---

### Task 8: Add responsive overrides for the new components

**Files:**
- Modify: `collections.html` (PAGE-SPECIFIC CSS block)

- [ ] **Step 1: Add the responsive rules**

Append to the very end of the PAGE-SPECIFIC CSS block (still above the `PAGE-SPECIFIC CSS — ADD ABOVE THIS LINE` marker):

```css
/* ================================================================
   COLLECTIONS PAGE — RESPONSIVE OVERRIDES
================================================================ */
@media (max-width: 860px) {
  .sig-block { grid-template-columns: 1fr; gap: 28px; margin-bottom: 56px; }
  .sig-block .sig-vis { order: 0 !important; }
  .range-grid { grid-template-columns: repeat(2, 1fr); gap: 28px 20px; }
  .finishes-row { gap: 22px 26px; }
  .finish { width: 104px; }
  .cta-close-row { gap: 24px; }
}
```

- [ ] **Step 2: Verify in the browser at a narrow width**

Resize the browser window to ≈ 600-800px wide (or open dev tools device toolbar at e.g. 390×844). Reload and confirm:
- Both Signature Lines blocks stack into a single column with the image always above the copy (the `Opell Prima` block no longer shows copy first)
- The Full Range grid becomes 2 columns
- The finishes row and CTA links remain readable and wrap without overflow
- No horizontal scrollbar appears anywhere on the page

- [ ] **Step 3: Commit**

```bash
git add collections.html
git commit -m "Add responsive overrides for collections page components"
```

---

### Task 9: Repoint the site-wide "Collections" links to the new page

**Files:**
- Modify: `_template.html:558`
- Modify: `index.html:2181`
- Modify: `about.html:1023`, `about.html:1361`
- Modify: `contact.html:802`

- [ ] **Step 1: Update `_template.html`**

Find (line 558):

```html
      <a href="index.html#collection">Collections</a>
```

Replace with:

```html
      <a href="collections.html">Collections</a>
```

- [ ] **Step 2: Update `index.html`**

Find (line 2181 — note this is a same-page anchor, not a path to `index.html`):

```html
      <a href="#collection">Collections</a>
```

Replace with:

```html
      <a href="collections.html">Collections</a>
```

- [ ] **Step 3: Update `about.html`**

Find (line 1023):

```html
      <a href="index.html#collection">Collections</a>
```

Replace with:

```html
      <a href="collections.html">Collections</a>
```

Then find the "Browse Collections" CTA button (around line 1361):

```html
        <a href="index.html#collection" class="cta-btn-secondary">Browse Collections</a>
```

Replace with:

```html
        <a href="collections.html" class="cta-btn-secondary">Browse Collections</a>
```

- [ ] **Step 4: Update `contact.html`**

Find (line 802):

```html
      <a href="index.html#collection">Collections</a>
```

Replace with:

```html
      <a href="collections.html">Collections</a>
```

- [ ] **Step 5: Verify the links across the site**

Open `index.html`, `about.html`, and `contact.html` in turn. On each page:
- Click the "Collections" nav link — confirm it lands on `collections.html` with "Collections" shown as the active nav item
- On `about.html`, also click "Browse Collections" in its CTA section — confirm it lands on `collections.html`

Then confirm the homepage's product carousel is untouched: on `index.html`, scroll to the "Explore the Collection" carousel section (anchor `#collection`) and confirm it still renders and works as before — it's simply no longer the nav's "Collections" target.

- [ ] **Step 6: Commit**

```bash
git add _template.html index.html about.html contact.html
git commit -m "Point site-wide Collections links to the new collections page"
```

---

### Task 10: Full page walkthrough (final verification)

**Files:** none (verification-only)

- [ ] **Step 1: Walk the page top to bottom in Light theme**

Open `collections.html`. Scroll from top to bottom and confirm every section described in the spec appears in order and animates as expected: Hero → Intro → divider → Signature Lines (Aliva, then Opell Prima) → divider → Full Range grid (11 tiles) → divider → Finishes strip (15 swatches) → divider → CTA close → Footer.

- [ ] **Step 2: Toggle to Dark theme and re-check**

Click the theme toggle in the header. Confirm:
- All text remains legible (no dark-text-on-dark-background or light-text-on-light-background)
- The gold-gradient dividers, swatches, and hover states still read clearly
- The hero's `data-header-scheme="dark"` transparency-over-image behavior still works correctly

- [ ] **Step 3: Spot-check interactions**

- Scroll back to the top and confirm the "Back to top" button and floating "Book a Visit" CTA appear/disappear at the same scroll thresholds as on other pages
- Hover every interactive element added in this plan (Signature Line images, Full Range tiles, Finish swatches, CTA links) and confirm each has a smooth, intentional hover state — nothing jumps or flickers

- [ ] **Step 4: Confirm no console errors**

Open the browser's developer console, reload the page, and confirm there are no JavaScript errors or 404s for any of the reused images.

- [ ] **Step 5: Final commit (if any fixes were needed)**

If Steps 1-4 surfaced any issues and you made fixes, commit them:

```bash
git add collections.html
git commit -m "Fix issues found in collections page walkthrough"
```

If no fixes were needed, this task requires no commit — the page is complete.

---

## Self-Review Notes

- **Spec coverage:** All six sections from the spec (hero, intro, signature lines, full range, finishes, CTA) are covered (Tasks 2-7), plus the editorial flourishes (arch framing — Task 4/5, gradient dividers — Task 3, word-reveal — Task 2, hover underline/zoom — Tasks 4/5/6), responsive behavior (Task 8), and nav repointing (Task 9).
- **Out-of-scope items confirmed absent:** no new photography, no per-collection detail pages, no filter/sort UI, no custom letter-scramble engine — all per spec.
- **Consistency check:** class names introduced in earlier tasks (`.arch` in Task 4, `.sec-divider` in Task 3) are reused verbatim in later tasks (Task 5's `.range-tile .arch`); the nav "active" pattern matches the convention already used in `about.html`.
