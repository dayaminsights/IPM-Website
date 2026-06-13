# Homepage Bestsellers Carousel — Real Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage "Bestsellers / Explore the Collection" carousel's 8 mocked placeholder cards with 7 real products (6 from Opell Prima, 1 from Aliva), each showing a real photo and linking to its real product page.

**Architecture:** Single-file change to `index.html`. Update the `PRODUCTS` data array (new shape: `img`/`link`/`collection` fields replace `cls`/`dim`), update the `cardHTML` template to wrap each card in an `<a>` and render an `<img>` instead of a gradient div, and remove now-unused shimmer/finish-dot CSS.

**Tech Stack:** Static HTML/CSS/vanilla JS (no build step for this file).

---

## File Structure

Only one file changes:

- Modify: `index.html`
  - `PRODUCTS` array (~line 2508) — new data
  - `FINISH_COLORS` map (~line 2518) — removed
  - `cardHTML` template (~line 2529-2544) — new markup
  - CSS: `.pcard .img .ph` (~line 870), `.pcard .finish-dot` (~line 912-923), `.pcard .dim` (~line 946-952), shimmer block (~line 972-980), `.pcard-enquire` click behavior (~line 1964-1987 region, JS handler added near carousel build)

No new files, no test framework in this repo (static site) — verification is via opening the page in a browser and checking the DOM/network/visual result.

---

### Task 1: Update `PRODUCTS` data array and remove `FINISH_COLORS`

**Files:**
- Modify: `index.html:2508-2523`

- [ ] **Step 1: Replace the `PRODUCTS` array and delete `FINISH_COLORS`**

Find this block (lines 2508-2523):

```js
const PRODUCTS = [
  { n:'Aliva Shower Head',       sku:'ALV-OHS-200', dim:'Dia: 200mm', fin:'Rich Gold',  cls:'c-richgold',  badge:'NEW' },
  { n:'Wall Mixer · Crutch',     sku:'OPP-WMC-101', dim:'H: 180mm',  fin:'Chrome',     cls:'c-chrome',    badge:''    },
  { n:'Wall Mixer 3-in-1',       sku:'ALV-WM3-115', dim:'H: 210mm',  fin:'Rose Gold',  cls:'c-rosegold',  badge:'NEW' },
  { n:'Swan Neck Pillar Tap',    sku:'CUB-SNP-090', dim:'H: 240mm',  fin:'Gun Metal',  cls:'c-gunmetal',  badge:''    },
  { n:'Single Lever Basin Mixer',sku:'ALV-SLB-130', dim:'H: 165mm',  fin:'Rich Gold',  cls:'c-richgold',  badge:''    },
  { n:'Floor-Mounted Bath Spout',sku:'OPP-FBS-450', dim:'H: 900mm',  fin:'Chrome',     cls:'c-chrome',    badge:'NEW' },
  { n:'Concealed Diverter',      sku:'CUB-CDV-075', dim:'120×120mm', fin:'Rose Gold',  cls:'c-rosegold',  badge:''    },
  { n:'Angle Valve',             sku:'ALV-ANV-045', dim:'H: 95mm',   fin:'Gun Metal',  cls:'c-gunmetal',  badge:''    }
];
const FINISH_COLORS = {
  'c-chrome':   'linear-gradient(135deg,#eef0f2,#9aa0a6 40%,#f4f6f8)',
  'c-richgold': 'linear-gradient(135deg,#f6e7b0,#caa53d 55%,#8a6d1e)',
  'c-rosegold': 'linear-gradient(135deg,#f3d3cf,#c98b88 55%,#9b5e5a)',
  'c-gunmetal': 'linear-gradient(135deg,#4a4f55,#23262a 60%,#0f1113)'
};
```

Replace it with:

```js
const PRODUCTS = [
  { n:'Basin Mixer Wall Mounted Upper Parts', sku:'OPELL-PRIMA-006', collection:'Opell Prima', fin:'Matt Black Gold', img:'images/products/opell-prima/opell-prima-006-main.png', link:'collections/opell-prima/opell-prima-006/', badge:''    },
  { n:'Bottle Trap',                          sku:'OPELL-PRIMA-011', collection:'Opell Prima', fin:'Rich Gold',       img:'images/products/opell-prima/opell-prima-011-main.png', link:'collections/opell-prima/opell-prima-011/', badge:''    },
  { n:'Diverter Body',                        sku:'OPELL-PRIMA-020', collection:'Opell Prima', fin:'Rose Gold',       img:'images/products/opell-prima/opell-prima-020-main.png', link:'collections/opell-prima/opell-prima-020/', badge:'NEW' },
  { n:'Square Shower Head',                   sku:'OPELL-PRIMA-027', collection:'Opell Prima', fin:'Rich Gold',       img:'images/products/opell-prima/opell-prima-027-main.png', link:'collections/opell-prima/opell-prima-027/', badge:''    },
  { n:'Hand Shower',                          sku:'OPELL-PRIMA-028', collection:'Opell Prima', fin:'Rose Gold',       img:'images/products/opell-prima/opell-prima-028-main.png', link:'collections/opell-prima/opell-prima-028/', badge:''    },
  { n:'Single Lever Basin Mixer Tall',        sku:'OPELL-PRIMA-038', collection:'Opell Prima', fin:'Matt Beige',      img:'images/products/opell-prima/opell-prima-038-main.png', link:'collections/opell-prima/opell-prima-038/', badge:''    },
  { n:'Aliva Basin Mixer',                    sku:'ALIVA-001-RGD',   collection:'Aliva',       fin:'Rich Gold',       img:'images/collections/cat-faucets.jpg',                    link:'collections/aliva/aliva-001/',             badge:'NEW' }
];
```

- [ ] **Step 2: Visually confirm the edit**

Open `index.html` in an editor and confirm the `PRODUCTS` array now has 7 entries with `img`/`link`/`collection` fields, and `FINISH_COLORS` no longer exists anywhere in the file. Run:

```bash
grep -n "FINISH_COLORS\|cls:" index.html
```

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace homepage carousel product data with real catalog products"
```

---

### Task 2: Update card template markup (`cardHTML`)

**Files:**
- Modify: `index.html:2529-2544` (exact line numbers will have shifted by the Task 1 diff — locate by content, the block starts with `const cardHTML = PRODUCTS.map(p => \``)

- [ ] **Step 1: Replace the card template**

Find this block:

```js
const cardHTML = PRODUCTS.map(p => `
  <article class="pcard" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
    <div class="img">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      <span class="fav">♡</span>
      <div class="finish-dot" style="background:${FINISH_COLORS[p.cls].split(',')[1] || '#aaa'}"></div>
      <div class="ph ${p.cls}"><span>${p.n}</span></div>
      <button class="pcard-enquire" type="button">Enquire</button>
    </div>
    <div class="meta">
      <div class="stock">In Stock · Ships Free</div>
      <div class="dim">${p.dim} · ${p.fin}</div>
      <h4>${p.n}</h4>
      <div class="sku">${p.sku}</div>
    </div>
  </article>`).join('');
```

Replace it with:

```js
const cardHTML = PRODUCTS.map(p => `
  <a class="pcard" href="${p.link}" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
    <div class="img">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      <span class="fav">♡</span>
      <img class="ph" src="${p.img}" alt="${p.n}" loading="lazy">
      <button class="pcard-enquire" type="button">Enquire</button>
    </div>
    <div class="meta">
      <div class="stock">In Stock · Ships Free</div>
      <div class="dim">${p.collection} · ${p.fin}</div>
      <h4>${p.n}</h4>
      <div class="sku">${p.sku}</div>
    </div>
  </a>`).join('');
```

Note: the root element changes from `<article>` to `<a>` — this makes the whole card a link to `p.link`.

- [ ] **Step 2: Add a guard so the Enquire button doesn't trigger navigation**

A `<button>` nested inside an `<a>` would otherwise navigate when clicked (invalid HTML nesting). Find this block right after `caroEl.innerHTML = ...` (a few lines below the template):

```js
caroEl.innerHTML = `<div class="caro-track">${cardHTML}</div>`;
```

Immediately after that line, add:

```js
caroEl.querySelectorAll('.pcard-enquire').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Render homepage carousel cards as links with real product photos"
```

---

### Task 3: Update CSS — image element, drop finish-dot/dim/shimmer rules

**Files:**
- Modify: `index.html` (CSS block within `.caro-section` styles, ~lines 851-980 before Task 1/2 edits — locate by selector name since line numbers shift)

- [ ] **Step 1: Make `.pcard` a block-level link and update `.ph` to size the `<img>`**

Find:

```css
.pcard {
  flex: 0 0 calc(15vw);
  min-width: 210px;
  max-width: 280px;
  cursor: pointer;
}
```

Replace with:

```css
.pcard {
  flex: 0 0 calc(15vw);
  min-width: 210px;
  max-width: 280px;
  cursor: pointer;
  display: block;
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 2: Update `.pcard .img .ph` to size an `<img>` instead of a gradient div**

Find:

```css
.pcard .img .ph {
  position: absolute;
  inset: 0;
  transition: transform .7s cubic-bezier(.2,.6,.2,1);
}
```

Replace with:

```css
.pcard .img .ph {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .7s cubic-bezier(.2,.6,.2,1);
}
```

(The `.pcard:hover .img .ph { transform: scale(1.06); }` rule directly below stays unchanged.)

- [ ] **Step 3: Remove the `.pcard .finish-dot` rule block**

Find and delete this entire block (including the `/* Finish dot */` comment):

```css
/* Finish dot */
.pcard .finish-dot {
  position: absolute;
  bottom: 14px;
  right: 14px;
  z-index: 2;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.55);
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
}

```

Leave the blank line structure tidy — the `.pcard .meta { padding-top: 16px; }` rule that follows should remain.

- [ ] **Step 4: Remove the `.pcard .dim` rule block**

Find and delete:

```css
.pcard .dim {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px;
  letter-spacing: .06em;
  color: var(--faint);
  margin-bottom: 7px;
}
```

This rule is no longer needed by name, but the template still uses `<div class="dim">` for the collection/finish line — re-add the same styling under the existing class so the line keeps its current look:

Immediately before `.pcard h4 {`, add:

```css
.pcard .dim {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px;
  letter-spacing: .06em;
  color: var(--faint);
  margin-bottom: 7px;
}
```

(Net effect: this step is a no-op relocation — skip deleting/re-adding and just leave `.pcard .dim` exactly where it is. **Do not delete this rule.** Only Steps 3 and 5 remove rules.)

- [ ] **Step 5: Remove the shimmer block**

Find and delete this entire block:

```css
/* Shimmer animation for gradient placeholders */
.c-chrome { background: linear-gradient(135deg,#eef0f2,#9aa0a6 40%,#f4f6f8 60%,#7f868d); background-size: 200% 200%; animation: shimmer 3s ease-in-out infinite; }
.c-richgold { background: linear-gradient(135deg,#f6e7b0,#caa53d 55%,#8a6d1e); background-size: 200% 200%; animation: shimmer 3s ease-in-out .5s infinite; }
.c-rosegold { background: linear-gradient(135deg,#f3d3cf,#c98b88 55%,#9b5e5a); background-size: 200% 200%; animation: shimmer 3s ease-in-out 1s infinite; }
.c-gunmetal { background: linear-gradient(135deg,#4a4f55,#23262a 60%,#0f1113); background-size: 200% 200%; animation: shimmer 3s ease-in-out 1.5s infinite; }
@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
}

```

- [ ] **Step 6: Verify no dangling references**

```bash
grep -n "finish-dot\|c-chrome\|c-richgold\|c-rosegold\|c-gunmetal\|shimmer" index.html
```

Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Update homepage carousel card styling for real product photos"
```

---

### Task 4: Manual verification in browser

**Files:** none (verification only)

- [ ] **Step 1: Serve the site locally**

```bash
npx serve .
```

(Or any static file server — e.g. `python -m http.server 8080`.)

- [ ] **Step 2: Open the homepage and check the carousel**

Navigate to `http://localhost:<port>/index.html`, scroll to the "Bestsellers / Explore the Collection" section, and verify:

- 7 cards render, each showing a real photo (not a gradient/shimmer block)
- Each card's meta line reads `<Collection> · <Finish>` (e.g., "Opell Prima · Rich Gold")
- "NEW" badge appears on the Diverter Body and Aliva Basin Mixer cards
- Auto-scroll and the prev/next (`#caroPrev`/`#caroNext`) buttons still work
- Hovering a card shows the "Enquire" button and zooms the image slightly

- [ ] **Step 3: Verify links navigate correctly**

Click each of the 7 cards (or open in new tabs) and confirm they load:

- `collections/opell-prima/opell-prima-006/`
- `collections/opell-prima/opell-prima-011/`
- `collections/opell-prima/opell-prima-020/`
- `collections/opell-prima/opell-prima-027/`
- `collections/opell-prima/opell-prima-028/`
- `collections/opell-prima/opell-prima-038/`
- `collections/aliva/aliva-001/`

All 7 should load their respective product pages without 404s.

- [ ] **Step 4: Verify the Enquire button doesn't navigate**

Hover a card so the "Enquire" button appears, then click directly on the button (not elsewhere on the card). Confirm the page does NOT navigate away (the `preventDefault`/`stopPropagation` handler from Task 2 Step 2 should stop it).

- [ ] **Step 5: No commit needed** — this task is verification-only. If any issue is found, return to the relevant earlier task, fix, and re-commit.

---

## Self-Review Notes

- **Spec coverage:** All 5 spec implementation points (PRODUCTS array shape, FINISH_COLORS removal, card template `<a>` wrapper + `<img>`, meta line using `collection`/`fin`, CSS updates including shimmer/finish-dot removal and `.ph` sizing) are covered across Tasks 1-3. The enquire-button nesting fix from the spec's addendum is covered in Task 2 Step 2.
- **`.pcard .dim` class name retained** — the template still emits `<div class="dim">${p.collection} · ${p.fin}</div>`, so the existing `.pcard .dim` CSS rule must NOT be deleted (Task 3 Step 4 clarifies this explicitly to avoid an over-eager removal).
- **Placeholder image for Aliva** — `images/collections/cat-faucets.jpg` is a wide category photo; `object-fit: cover` (Task 3 Step 2) will crop it to fit the 3:5 card aspect ratio, consistent with how `.coll-card` thumbnails use the same image elsewhere in the site.

## CORRECTION (discovered during execution, after Task 1)

The original plan missed an existing behavior: a click handler on `#caro`
(around line 2816, pre-edit) does `e.target.closest('.pcard')` →
`e.preventDefault()` → `openEnquiry(JSON.parse(card.dataset.product))`, which
opens a "Quick Enquiry" modal (`#enquiryModal`). This means **every click on a
card currently opens the modal**, not nothing — and `openEnquiry()` (~line 2779)
reads `product.cls` (for `FINISH_COLORS[product.cls]`, used as the modal
swatch background) and `product.dim` (shown in `#qmodalDim`), both of which
Task 1 removed from the data shape.

Resolution (per user decision): cards become real links to product pages.
The "Enquire" button becomes a real, clickable control that opens the existing
Quick Enquiry modal — it must `stopPropagation()` so it doesn't also trigger
the `<a>` navigation. The card-level click-to-open-modal handler on `#caro` is
removed (no longer needed since the card itself navigates). The modal's swatch
becomes a real image thumbnail (`<img>`, replacing the gradient `<div>`), and
the `#qmodalDim` line is repurposed to show `product.collection` instead of
`product.dim`.

### Task 2 (REVISED): Update cardHTML template, remove old card-click handler, wire Enquire button to modal

**Files:**
- Modify: `index.html` — `cardHTML` template (~line 2521-2536 after Task 1's edit)
- Modify: `index.html` — `#caro` click listener (~line 2816 pre-edit, search for `document.getElementById('caro').addEventListener('click'`)
- Modify: `index.html` — `openEnquiry()` function (~line 2779)
- Modify: `index.html` — `#qmodalSwatch` markup (~line 3008) and its CSS (~line 2043)

- [ ] **Step 1: Replace the card template**

Find:

```js
const cardHTML = PRODUCTS.map(p => `
  <article class="pcard" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
    <div class="img">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      <span class="fav">♡</span>
      <div class="finish-dot" style="background:${FINISH_COLORS[p.cls].split(',')[1] || '#aaa'}"></div>
      <div class="ph ${p.cls}"><span>${p.n}</span></div>
      <button class="pcard-enquire" type="button">Enquire</button>
    </div>
    <div class="meta">
      <div class="stock">In Stock · Ships Free</div>
      <div class="dim">${p.dim} · ${p.fin}</div>
      <h4>${p.n}</h4>
      <div class="sku">${p.sku}</div>
    </div>
  </article>`).join('');
```

Replace with:

```js
const cardHTML = PRODUCTS.map((p, i) => `
  <a class="pcard" href="${p.link}" data-index="${i}">
    <div class="img">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      <img class="ph" src="${p.img}" alt="${p.n}" loading="lazy">
      <button class="pcard-enquire" type="button" data-index="${i}">Enquire</button>
    </div>
    <div class="meta">
      <div class="stock">In Stock · Ships Free</div>
      <div class="dim">${p.collection} · ${p.fin}</div>
      <h4>${p.n}</h4>
      <div class="sku">${p.sku}</div>
    </div>
  </a>`).join('');
```

Notes:
- Root element is now `<a href="${p.link}">` — the card navigates to the real product page.
- `data-product='${JSON.stringify(p)...}'` is replaced with a simple `data-index="${i}"` (index into `PRODUCTS`) — simpler and avoids re-serializing/escaping the whole object.
- The `<span class="fav">♡</span>` (favorite heart icon) is dropped — it had no handler before and isn't part of this redesign's scope; removing it avoids an orphaned decorative element. (If you'd rather keep it for visual parity, leave it in — it's purely cosmetic and doesn't affect functionality.)
- `.finish-dot` div is removed (per original plan).

- [ ] **Step 2: Remove the old card-click-opens-modal handler**

Find this block (search for `document.getElementById('caro').addEventListener('click'`):

```js
document.getElementById('caro').addEventListener('click', e => {
  const card = e.target.closest('.pcard');
  if (!card) return;
  e.preventDefault();
  try {
    const product = JSON.parse(card.dataset.product);
    openEnquiry(product);
  } catch(err) {}
});
```

Delete it entirely. Card clicks now fall through to the `<a href>` and navigate normally.

- [ ] **Step 3: Add an Enquire-button click handler that opens the modal**

Place this near where `caroEl.innerHTML = ...` is set (after the carousel markup is built). Find:

```js
caroEl.innerHTML = `<div class="caro-track">${cardHTML}</div>`;
```

Immediately after it, add:

```js
caroEl.querySelectorAll('.pcard-enquire').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    openEnquiry(PRODUCTS[Number(btn.dataset.index)]);
  });
});
```

This replaces the Step 2 (old plan) "no-op guard" — the button now does
something real (opens the enquiry modal) instead of just preventing navigation.

- [ ] **Step 4: Update `openEnquiry()` to use the new data shape and an image swatch**

Find (~line 2779):

```js
function openEnquiry(product) {
  const grad = FINISH_COLORS[product.cls] || 'linear-gradient(135deg,#aaa,#ccc)';
  qSwatch.style.background = grad;
  qSku.textContent = product.sku;
  qTitle.textContent = product.n;
  qDim.textContent = product.dim;
  qFin.textContent = product.fin;
  qForm.hidden = false;
  qConfirm.hidden = true;
  qForm.reset();
  qModal.hidden = false;
  document.body.style.overflow = 'hidden';
  qClose.focus();
}
```

Replace with:

```js
function openEnquiry(product) {
  qSwatch.innerHTML = `<img src="${product.img}" alt="${product.n}">`;
  qSku.textContent = product.sku;
  qTitle.textContent = product.n;
  qDim.textContent = product.collection;
  qFin.textContent = product.fin;
  qForm.hidden = false;
  qConfirm.hidden = true;
  qForm.reset();
  qModal.hidden = false;
  document.body.style.overflow = 'hidden';
  qClose.focus();
}
```

- [ ] **Step 5: Update `#qmodalSwatch` CSS to size the new `<img>`**

Find (~line 2043):

```css
.qmodal-swatch {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  flex-shrink: 0;
}
```

Replace with:

```css
.qmodal-swatch {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  flex-shrink: 0;
  overflow: hidden;
}
.qmodal-swatch img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Render homepage carousel cards as product links with working Enquire modal"
```

### Task 3 adjustment

Task 3 Step 1 and Step 2 (CSS for `.pcard` link styling and `.pcard .img .ph`
sizing) are unchanged. **Skip nothing else** — proceed with Task 3 as written,
since the `<a class="pcard">` root element still needs `display:block;
text-decoration:none; color:inherit`, and `.ph` still needs to become an
`<img>`-sizing rule. The `.pcard .finish-dot`, `.pcard .dim` (do-not-delete),
and shimmer-block removals in Task 3 Steps 3-5 are unaffected by this
correction.

### Task 4 adjustment

Add to Task 4's manual verification:

- [ ] Click the "Enquire" button on a card (not the rest of the card) and
  confirm the Quick Enquiry modal opens, showing the product's real photo as
  a small thumbnail, correct SKU, name, collection (in place of dimensions),
  and finish. Confirm the page does NOT navigate when the modal opens.
- [ ] Click anywhere else on a card (image background, title, meta text) and
  confirm it navigates to the product's collection page.
