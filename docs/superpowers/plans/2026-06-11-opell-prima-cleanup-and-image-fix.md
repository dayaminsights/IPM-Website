# Opell Prima Variant Merge, Product Image Fix, and Collection Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Autonomous execution note:** This plan is designed to run unattended overnight. Each task ends with a commit so the repo is always in a buildable, committed state. If the session is interrupted (e.g. token limit), resume from the first unchecked task — `git log` shows which commits already landed.

**Goal:** Merge Opell Prima's color-variant duplicate product listings into single product pages with finish pickers, fix product photo cropping site-wide, audit all generated links, and add subtle per-collection visual polish.

**Architecture:** Part 1 is a one-time data edit to `product catalogue.xlsx` (Products sheet) via a Node script — no schema or build-script changes, since the existing variant-row + "first row wins" grouping model (`scripts/lib/read-catalog.js`) and finish-picker/gallery-thumbnail rendering (`scripts/lib/render-product.js`) already support multi-finish and multi-image groups. Part 2 is a CSS-only change (`scripts/lib/layout.js` + render functions add a `product-shot` modifier class). Part 3 is a verification script + small CSS/template additions for per-collection variation.

**Tech Stack:** Node.js, `xlsx` (SheetJS), existing `scripts/lib/*.js` build pipeline, CSS (`css/catalog.css`, `scripts/lib/layout.js`).

---

## File Structure

- **Modify:** `product catalogue.xlsx` (Products sheet) — Opell Prima merge edits (Task 1), any other-collection merges (Task 2).
- **Create (temporary):** `scripts/merge-opell-prima-variants.js` — one-off data-edit script for Task 1 (kept in repo as a record of the transformation, like `populate-from-scrape.js`).
- **Create (temporary):** `scripts/find-color-variant-duplicates.js` — analysis script for Task 2, writes findings to `scripts/scrape-output/variant-merge-report.txt`.
- **Modify:** `scripts/lib/layout.js` — add `.arch.product-shot img { object-fit: contain; padding: 6%; }` (Task 3).
- **Modify:** `scripts/lib/render-collection.js` — apply `product-shot` class to collection-card and showcase-tile `<div class="arch">` wrappers (Task 3).
- **Modify:** `scripts/lib/render-product.js` — apply `product-shot` class to gallery main image, gallery thumbnails, and related-product cards (Task 3).
- **Create (temporary):** `scripts/verify-links.js` — link audit (Task 5), same as prior pass.
- **Modify:** `css/catalog.css` — per-collection polish CSS (Task 6).
- **Modify:** `scripts/lib/render-collection.js` — per-collection polish template branches (Task 6).
- **Generated (committed each task):** `/collections/**/index.html`, `sitemap.xml`.

---

## Task 1: Merge Opell Prima color-variant duplicates

**Files:**
- Create: `scripts/merge-opell-prima-variants.js`
- Modify: `product catalogue.xlsx` (Products sheet, run via the script)

**Background:** Opell Prima has 61 product-group rows (`opell-prima-001` .. `opell-prima-061`). Several are color/finish duplicates of the same physical product, or duplicate listings with a typo'd name and a different photo of the same item. Per the approved spec (`docs/superpowers/specs/2026-06-11-opell-prima-cleanup-and-image-fix-design.md`, Part 1), merge these using the existing variant-row model: absorbed rows become additional `Finish` variants (or additional `Gallery Images` entries) under the surviving group's `Product Group` slug, and the absorbed group's standalone row is removed.

**Exact merge table** (group -> action):

| Surviving group (Product Group, SKU Name after merge) | Absorbed group(s) | Absorbed row's new `Finish` | Absorbed row's `image` (own file, kept) |
|---|---|---|---|
| `opell-prima-015` "Bottle Trap" (own `image`=`opell-prima-015-main.png`, set `Finish`="Matt White" since 015's photo is white-ish per visual spot-check, OR leave 015's Finish blank — see Step 1 note) | `opell-prima-016` "Bottle Trap White" | (absorbed as 2nd variant) "Matt White" | `opell-prima-016-main.png` |
| | `opell-prima-014` "Black Bottle Trap" | "Matt Black" | `opell-prima-014-main.png` |
| | `opell-prima-011` "Beige Bottle Traps" | "Matt Beige" | `opell-prima-011-main.png` |
| `opell-prima-020` "Diverter Body" | `opell-prima-022` "Diverter Body Gold" | "Rich Gold" | `opell-prima-022-main.png` |
| | `opell-prima-023` "Diverter Body Matt Beige" | "Matt Beige" | `opell-prima-023-main.png` |
| `opell-prima-044` "Shower Head" | `opell-prima-045` "Shower Head Beige" | "Matt Beige" | `opell-prima-045-main.png` |
| `opell-prima-029` "Hand Shower" | `opell-prima-030` "Hand Shower Gold" | "Rich Gold" | `opell-prima-030-main.png` |
| | `opell-prima-028` "Hand Shoer Rose Gold" (typo of "Hand Shower Rose Gold") | "Rose Gold" | `opell-prima-028-main.png` |
| `opell-prima-042` "Shower ARM" | `opell-prima-043` "Shower ARM Black Gold" | "Matt Black Gold" | `opell-prima-043-main.png` |
| `opell-prima-003` "Aliva Shower Head" (gallery merge — append to `Gallery Images`, not a Finish variant) | `opell-prima-004` "Alive Shower Head" (typo, same product different photo) | N/A | `opell-prima-004-main.png` -> appended to `opell-prima-003`'s `Gallery Images` |
| `opell-prima-047` "Single Lever Basin Mixer" (gallery merge) | `opell-prima-059` "Single Liver Basin Mixer" (typo, same product different photo) | N/A | `opell-prima-059-main.png` -> appended to `opell-prima-047`'s `Gallery Images` |
| `opell-prima-049` "Single Lever Basin Mixer Tall" (gallery merge) | `opell-prima-060` "Single Liver Basin Mixer Tall" (typo, same product different photo) | N/A | `opell-prima-060-main.png` -> appended to `opell-prima-049`'s `Gallery Images` |

`opell-prima-021` "Diverter Body for ALL Colour and Gold Combination" stays separate (distinct catalog entry, not a color variant of `opell-prima-020`).

This removes 10 standalone groups (016, 014, 011, 022, 023, 045, 030, 028, 004, 059, 060), leaving **51 product groups** for Opell Prima (61 - 10).

For **gallery-merge** rows (003/004, 047/059, 049/060): the surviving row's `Gallery Images` must list its OWN image FIRST, then the absorbed image, so the gallery thumbnail rail (which renders `group.gallery` in order, main image = `group.gallery[0]` is NOT used for `mainImage` — `mainImage` is always `primary.image`; thumbnails are `group.gallery` in full including index 0) shows both photos. Concretely:
- `opell-prima-003`'s `Gallery Images` = `opell-prima-003-main.png,opell-prima-004-main.png`
- `opell-prima-047`'s `Gallery Images` = `opell-prima-047-main.jpg,opell-prima-059-main.png`
- `opell-prima-049`'s `Gallery Images` = `opell-prima-049-main.png,opell-prima-060-main.png`

- [ ] **Step 1: Write the merge script**

Create `scripts/merge-opell-prima-variants.js`:

```js
// One-off: merge Opell Prima color-variant duplicate product groups into
// single groups with multiple Finish variants (or gallery images for
// same-product/different-photo duplicates with no color difference).
// Run with: node scripts/merge-opell-prima-variants.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

// Finish-variant merges: absorbed group's row becomes a new variant row
// under the surviving group's Product Group slug, with the given Finish.
const FINISH_MERGES = [
  { survivor: 'opell-prima-015', absorbed: 'opell-prima-016', finish: 'Matt White' },
  { survivor: 'opell-prima-015', absorbed: 'opell-prima-014', finish: 'Matt Black' },
  { survivor: 'opell-prima-015', absorbed: 'opell-prima-011', finish: 'Matt Beige' },
  { survivor: 'opell-prima-020', absorbed: 'opell-prima-022', finish: 'Rich Gold' },
  { survivor: 'opell-prima-020', absorbed: 'opell-prima-023', finish: 'Matt Beige' },
  { survivor: 'opell-prima-044', absorbed: 'opell-prima-045', finish: 'Matt Beige' },
  { survivor: 'opell-prima-029', absorbed: 'opell-prima-030', finish: 'Rich Gold' },
  { survivor: 'opell-prima-029', absorbed: 'opell-prima-028', finish: 'Rose Gold' },
  { survivor: 'opell-prima-042', absorbed: 'opell-prima-043', finish: 'Matt Black Gold' },
];

// Gallery merges: absorbed group's image is appended to survivor's
// Gallery Images (along with the survivor's own image as the first entry),
// and the absorbed group's row is dropped entirely.
const GALLERY_MERGES = [
  { survivor: 'opell-prima-003', absorbed: 'opell-prima-004' },
  { survivor: 'opell-prima-047', absorbed: 'opell-prima-059' },
  { survivor: 'opell-prima-049', absorbed: 'opell-prima-060' },
];

function main() {
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets['Products'];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  const columns = Object.keys(rows[0]);

  const byGroup = new Map();
  for (const row of rows) {
    const pg = row['Product Group'];
    if (!byGroup.has(pg)) byGroup.set(pg, []);
    byGroup.get(pg).push(row);
  }

  const absorbedGroups = new Set();

  // Finish-variant merges
  for (const { survivor, absorbed, finish } of FINISH_MERGES) {
    const absorbedRows = byGroup.get(absorbed);
    if (!absorbedRows || absorbedRows.length === 0) {
      throw new Error(`Absorbed group "${absorbed}" not found`);
    }
    if (!byGroup.has(survivor)) {
      throw new Error(`Survivor group "${survivor}" not found`);
    }
    for (const row of absorbedRows) {
      row['Product Group'] = survivor;
      row['Finish'] = finish;
      // Clear group-level fields so the survivor's first row remains authoritative
      row['SKU Name'] = '';
      row['category'] = '';
      row['dimensions'] = '';
      row['Description'] = '';
      row['Gallery Images'] = '';
      row['Related Product Groups'] = '';
      row['Meta Description'] = '';
      row['Product Slug'] = '';
    }
    absorbedGroups.add(absorbed);
  }

  // Gallery merges
  for (const { survivor, absorbed } of GALLERY_MERGES) {
    const survivorRows = byGroup.get(survivor);
    const absorbedRows = byGroup.get(absorbed);
    if (!survivorRows || survivorRows.length === 0) {
      throw new Error(`Survivor group "${survivor}" not found`);
    }
    if (!absorbedRows || absorbedRows.length === 0) {
      throw new Error(`Absorbed group "${absorbed}" not found`);
    }
    const survivorPrimary = survivorRows[0];
    const survivorImage = survivorPrimary['image'];
    const absorbedImage = absorbedRows[0]['image'];
    survivorPrimary['Gallery Images'] = `${survivorImage},${absorbedImage}`;
    absorbedGroups.add(absorbed);
  }

  // Rebuild row list: drop rows whose Product Group is now an absorbed-and-removed
  // group AND was not relabeled to a survivor (gallery-merge absorbed rows are
  // dropped entirely; finish-merge absorbed rows were relabeled above and kept).
  const finalRows = rows.filter(row => {
    const pg = row['Product Group'];
    // Finish-merge absorbed rows: pg was already rewritten to the survivor slug above,
    // so they no longer match their original "absorbed" key — keep them.
    // Gallery-merge absorbed rows: pg still equals the absorbed slug — drop them.
    return !GALLERY_MERGES.some(m => m.absorbed === pg);
  });

  const rowsForSheet = finalRows.map(r => {
    const out = {};
    for (const col of columns) out[col] = r[col] !== undefined ? r[col] : '';
    return out;
  });

  const newWs = xlsx.utils.json_to_sheet(rowsForSheet, { header: columns });
  wb.Sheets['Products'] = newWs;
  xlsx.writeFile(wb, XLSX_PATH);

  console.log(`Rows before: ${rows.length}, after: ${finalRows.length}`);
  const remainingOpellGroups = new Set(
    finalRows.filter(r => r['Collection Name'] === 'Opell Prima').map(r => r['Product Group'])
  );
  console.log(`Opell Prima groups remaining: ${remainingOpellGroups.size}`);
}

main();
```

- [ ] **Step 2: Run the script**

Run: `node scripts/merge-opell-prima-variants.js`

Expected output:
```
Rows before: 318, after: 315
Opell Prima groups remaining: 50
```

(Row count drops by 3 — the gallery-merge absorbed rows opell-prima-004, opell-prima-059, opell-prima-060 are deleted entirely. Finish-merge absorbed rows (016,014,011,022,023,045,030,028) are kept but relabeled to their survivor's `Product Group`, so they don't reduce the row count. Group count drops by 11 — the 8 finish-merge-absorbed groups plus the 3 gallery-merge-absorbed groups: 61 - 11 = 50.)

- [ ] **Step 3: Verify the merged groups by inspecting the xlsx**

Run:
```bash
node -e "
const xlsx = require('xlsx');
const wb = xlsx.readFile('product catalogue.xlsx');
const ws = wb.Sheets['Products'];
const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
const bottleTrap = rows.filter(r => r['Product Group'] === 'opell-prima-015');
console.log('Bottle Trap variants:', bottleTrap.map(r => ({ sku: r['SKU'], name: r['SKU Name'], finish: r['Finish'], image: r['image'] })));
const aliva = rows.filter(r => r['Product Group'] === 'opell-prima-003');
console.log('Aliva Shower Head:', aliva.map(r => ({ sku: r['SKU'], name: r['SKU Name'], gallery: r['Gallery Images'] })));
"
```
Expected:
- `Bottle Trap variants` shows 4 rows: `opell-prima-015` (SKU Name="Bottle Trap", Finish="" or unset), `OPELL-PRIMA-016` (Finish="Matt White"), `OPELL-PRIMA-014` (Finish="Matt Black"), `OPELL-PRIMA-011` (Finish="Matt Beige") — all with `Product Group=opell-prima-015`, each retaining its own `image`.
- `Aliva Shower Head` shows 1 row with `Gallery Images = "opell-prima-003-main.png,opell-prima-004-main.png"`.

- [ ] **Step 4: Rebuild and verify Opell Prima page count**

Run: `npm run build`
Expected: build succeeds with 0 errors. Then run:
```bash
ls collections/opell-prima | grep -v index.html | wc -l
```
Expected: `50` (50 product subdirectories).

- [ ] **Step 5: Spot-check the merged "Bottle Trap" product page**

Run:
```bash
grep -c "finish-picker\|finish-static" collections/opell-prima/opell-prima-015/index.html
grep "Available in" collections/opell-prima/opell-prima-015/index.html
```
Expected: `finish-picker` present (1 match), and `Available in 4 Finishes` (1 surviving variant + 3 absorbed = 4).

Also verify the gallery-merge result:
```bash
grep -c "gallery-thumbs" collections/opell-prima/opell-prima-003/index.html
```
Expected: `1` (gallery thumbnail rail rendered, since `group.gallery.length > 1`).

- [ ] **Step 6: Commit**

```bash
git add product catalogue.xlsx scripts/merge-opell-prima-variants.js collections sitemap.xml
git commit -m "Merge Opell Prima color-variant duplicate products into single pages with finish pickers"
```

---

## Task 2: Cross-collection color-variant duplicate check

**Files:**
- Create: `scripts/find-color-variant-duplicates.js`
- Modify: `product catalogue.xlsx` (Products sheet) — only if matches found
- Create: `scripts/scrape-output/variant-merge-report.txt` (gitignored — confirm `scripts/scrape-output/` is in `.gitignore`)

**Background:** Per spec Part 1 "Validation pass for other collections" — check all 13 collections (not just Opell Prima) for the same color-variant duplicate pattern (two product groups whose `SKU Name`, with a recognized finish/color word stripped, produce the same base name).

- [ ] **Step 1: Write the analysis script**

Create `scripts/find-color-variant-duplicates.js`:

```js
// Analysis: find product groups within each collection whose SKU Name,
// with a known finish/color word stripped, matches another group's SKU Name.
// Read-only — writes findings to scripts/scrape-output/variant-merge-report.txt.
// Run with: node scripts/find-color-variant-duplicates.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');
const OUT_DIR = path.join(__dirname, 'scrape-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Color/finish words that map to a real Finishes-sheet entry (or are
// unambiguous synonyms of one). Order matters: longer phrases first.
const COLOR_WORDS = [
  'matt beige gold', 'matt black gold', 'matt grey gold', 'matt white gold',
  'profile white gold', 'profile black gold', 'profile beige gold', 'profile grey gold',
  'polished gun metal black', 'gun metal black', 'rose gold',
  'matt beige', 'matt black', 'matt white', 'matt grey',
  'beige gold', 'black gold', 'white gold', 'grey gold',
  'gold', 'beige', 'black', 'white', 'grey', 'chrome',
];

function stripColorWord(name) {
  const lower = name.toLowerCase().trim();
  for (const word of COLOR_WORDS) {
    // Match the color word at the end of the name, possibly with trailing 's'
    const re = new RegExp(`\\s+${word}s?$`, 'i');
    if (re.test(lower)) {
      return { base: lower.replace(re, '').trim(), color: word };
    }
    // Or at the start
    const reStart = new RegExp(`^${word}\\s+`, 'i');
    if (reStart.test(lower)) {
      return { base: lower.replace(reStart, '').trim(), color: word };
    }
  }
  return { base: lower, color: null };
}

function main() {
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets['Products'];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

  const byCollection = new Map();
  for (const row of rows) {
    const coll = row['Collection Name'];
    if (!byCollection.has(coll)) byCollection.set(coll, new Map());
    const groups = byCollection.get(coll);
    const pg = row['Product Group'];
    if (!groups.has(pg)) groups.set(pg, row['SKU Name']);
  }

  const lines = [];
  for (const [collection, groups] of byCollection) {
    if (collection === 'Opell Prima') continue; // already handled in Task 1
    const entries = [...groups.entries()]; // [productGroup, skuName]
    const baseMap = new Map(); // base name -> [{pg, name, color}]
    for (const [pg, name] of entries) {
      const { base, color } = stripColorWord(name);
      if (!baseMap.has(base)) baseMap.set(base, []);
      baseMap.get(base).push({ pg, name, color });
    }
    for (const [base, items] of baseMap) {
      if (items.length < 2) continue;
      // Only flag if at least one item had a color word stripped
      // (otherwise it's just two groups that happen to share a base name with no color difference)
      if (!items.some(i => i.color)) continue;
      lines.push(`[${collection}] base="${base}":`);
      for (const item of items) {
        lines.push(`  ${item.pg} | "${item.name}" | stripped color: ${item.color || '(none)'}`);
      }
    }
  }

  const reportPath = path.join(OUT_DIR, 'variant-merge-report.txt');
  fs.writeFileSync(reportPath, lines.length ? lines.join('\n') + '\n' : 'No candidates found.\n', 'utf8');
  console.log(`Found ${lines.filter(l => l.startsWith('[')).length} candidate group(s) (excluding Opell Prima).`);
  console.log(`Report: ${reportPath}`);
  console.log('\n' + lines.join('\n'));
}

main();
```

- [ ] **Step 2: Run the analysis**

Run: `node scripts/find-color-variant-duplicates.js`

This will print candidate groups (if any) to stdout and to `scripts/scrape-output/variant-merge-report.txt`.

- [ ] **Step 3: Apply merges for any HIGH-CONFIDENCE candidates found**

For each candidate group printed in Step 2, apply the SAME merge mechanics as Task 1 (finish-variant merge: absorbed row gets `Product Group` rewritten to the survivor's slug, `Finish` set to the mapped color, group-level fields cleared; OR if no color word was stripped from EITHER item in a pair — i.e. `stripColorWord` returned `color: null` for one of them — do NOT merge that pair, since the script flags the pair as long as at least one item has a color word, but the OTHER item with `color: null` is the survivor and is correct as-is).

Write a small one-off script `scripts/apply-cross-collection-merges.js` following the exact same pattern as `scripts/merge-opell-prima-variants.js` (Task 1, Step 1) — a `FINISH_MERGES` array of `{ survivor, absorbed, finish }` entries derived from the report, where:
- `survivor` = the `pg` of the item with `color: null` (or, if all items in the group have a color word, the item whose color is most likely the "default"/primary — use judgment, document the choice in a comment).
- `absorbed` = the `pg` of each other item in the group.
- `finish` = the mapped Finishes-sheet name for that item's stripped color word (use the same mapping table as Task 1: "gold"->"Rich Gold", "beige"->"Matt Beige", "black"->"Matt Black", "white"->"Matt White", "grey"->"Matt Grey", "rose gold"->"Rose Gold", "beige gold"->"Matt Beige Gold", "black gold"->"Matt Black Gold", "white gold"->"Matt White Gold", "grey gold"->"Matt Grey Gold", "matt beige"->"Matt Beige", "matt black"->"Matt Black", "matt white"->"Matt White", "matt grey"->"Matt Grey", "chrome"->"Chrome", "polished gun metal black"/"gun metal black"->"Polished Gun Metal Black", "matt beige gold"->"Matt Beige Gold", "matt black gold"->"Matt Black Gold", "matt grey gold"->"Matt Grey Gold", "matt white gold"->"Matt White Gold", "profile *"->"Profile * Gold" variants).

If the report is empty (`No candidates found.`), skip this step entirely — write a one-line note in the commit message instead (Step 5).

- [ ] **Step 4: Rebuild and verify**

Run: `npm run build` — expect 0 errors. If merges were applied, spot-check one merged group's product page the same way as Task 1 Step 5 (`finish-picker` present, `Available in N Finishes` matches variant count).

- [ ] **Step 5: Commit**

If merges were applied:
```bash
git add product catalogue.xlsx scripts/find-color-variant-duplicates.js scripts/apply-cross-collection-merges.js collections sitemap.xml
git commit -m "Merge color-variant duplicate products in other collections (cross-collection pass)"
```

If no merges were needed:
```bash
git add scripts/find-color-variant-duplicates.js
git commit -m "Add cross-collection variant-duplicate analysis script (no merges needed)"
```

---

## Task 3: Fix product image cropping with `object-fit: contain`

**Files:**
- Modify: `scripts/lib/layout.js` (add `.arch.product-shot` CSS rule)
- Modify: `scripts/lib/render-collection.js` (apply `product-shot` class to product-photo `.arch` wrappers)
- Modify: `scripts/lib/render-product.js` (apply `product-shot` class to gallery + related-product `.arch` wrappers)

**Background:** Per spec Part 2, `.arch img { object-fit: cover }` (defined in `scripts/lib/layout.js:330`) crops product photos of inconsistent aspect ratios. Add a `.arch.product-shot` modifier using `object-fit: contain` for all PRODUCT photo contexts (collection-card thumbnails, showcase tiles, product gallery, related-product cards). Collection HERO images keep `cover` (unchanged) per the spec's decision.

**REQUIRED SUB-SKILL for this task:** Use `/frontend-design` to review the final CSS values (padding %, background) for visual quality before committing — but the mechanical class-application changes below are precise and can be done directly first, then handed to `/frontend-design` for a quick visual pass.

- [ ] **Step 1: Add the `product-shot` CSS rule**

Open `scripts/lib/layout.js`. Find (around line 330):

```js
.arch img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

Add immediately after it:

```js
.arch.product-shot img { object-fit: contain; padding: 6%; box-sizing: border-box; }
```

- [ ] **Step 2: Apply `product-shot` to collection-card images in `render-collection.js`**

Open `scripts/lib/render-collection.js`. Find `renderCollectionCard` (around line 11-22):

```js
function renderCollectionCard(group, depth) {
  const primary = group.variants[0];
  const href = `${group.groupSlug}/`;
  return `        <a class="coll-card" href="${href}">
          <div class="arch"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
          <span class="cat-tag">${escapeHtml(group.category)}</span>
        </a>`;
}
```

Change `<div class="arch">` to `<div class="arch product-shot">`:

```js
function renderCollectionCard(group, depth) {
  const primary = group.variants[0];
  const href = `${group.groupSlug}/`;
  return `        <a class="coll-card" href="${href}">
          <div class="arch product-shot"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
          <span class="cat-tag">${escapeHtml(group.category)}</span>
        </a>`;
}
```

Do NOT change `renderRelatedCollectionCard` (around line 24-32) — it shows COLLECTION hero images, not product photos, and keeps `cover`.

- [ ] **Step 3: Apply `product-shot` to showcase tiles**

In the same file, find `renderShowcaseTile`:

```js
function renderShowcaseTile(group, depth, sizeClass) {
  const primary = group.variants[0];
  const href = `${group.groupSlug}/`;
  return `        <a class="showcase-tile ${sizeClass}" href="${href}">
          <div class="arch"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
        </a>`;
}
```

Change to:

```js
function renderShowcaseTile(group, depth, sizeClass) {
  const primary = group.variants[0];
  const href = `${group.groupSlug}/`;
  return `        <a class="showcase-tile ${sizeClass}" href="${href}">
          <div class="arch product-shot"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
        </a>`;
}
```

- [ ] **Step 4: Apply `product-shot` to product page gallery and related-product cards in `render-product.js`**

Open `scripts/lib/render-product.js`. Find `renderRelatedProductCard` (lines 4-12):

```js
function renderRelatedProductCard(related, depth) {
  const primary = related.variants[0];
  const href = rel(depth, `collections/${related.collectionSlug}/${related.groupSlug}/`);
  return `        <a class="coll-card" href="${href}">
          <div class="arch"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(related.skuName)}</div>
          <span class="cat-tag">${escapeHtml(related.category)}</span>
        </a>`;
}
```

Change `<div class="arch">` to `<div class="arch product-shot">`.

Find the `galleryHtml` block (around line 49-54):

```js
  const galleryHtml = `      <div class="gallery">
        <div class="arch">
          <img id="mainImage" src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}">
        </div>
${galleryThumbsHtml}
      </div>`;
```

Change `<div class="arch">` to `<div class="arch product-shot">`:

```js
  const galleryHtml = `      <div class="gallery">
        <div class="arch product-shot">
          <img id="mainImage" src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}">
        </div>
${galleryThumbsHtml}
      </div>`;
```

Note: `gallery-thumbs button img` (the small thumbnail rail) already uses `object-fit: cover` via its own rule (`css/catalog.css:100`) — leave this as-is; thumbnails are small enough that cropping is acceptable and changing it isn't part of this task's scope.

- [ ] **Step 5: Rebuild**

Run: `npm run build` — expect 0 errors.

- [ ] **Step 6: Verify the CSS rule is present in generated output**

Run:
```bash
grep -c "product-shot" collections/opell-prima/index.html
grep -c "arch.product-shot img" collections/opell-prima/index.html
```
Expected: first count > 0 (collection cards + showcase tiles use the class), second count = 1 (the CSS rule itself, embedded once per page via `layout.js`'s shared `<style>` block).

- [ ] **Step 7: Visual spot-check via `/frontend-design`**

Dispatch a `/frontend-design` review (or perform directly): start a local server (`npx --yes serve -l 8080 .`), open `http://localhost:8080/collections/opell-prima/opell-prima-029/` (Hand Shower — previously a portrait image that would have been cropped under `cover`). Confirm the FULL hand shower (head + handle + hose end) is visible in the gallery `.arch` frame, letterboxed with `var(--cream)` background, not cropped at top/bottom. Also check `http://localhost:8080/collections/opell-prima/opell-prima-042/` (Shower Arm — wide image) renders fully visible without being cropped left/right.

If the `padding: 6%` value looks too tight or too loose, adjust it (a single-line CSS value change in `scripts/lib/layout.js` Step 1) and rebuild.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/layout.js scripts/lib/render-collection.js scripts/lib/render-product.js collections sitemap.xml
git commit -m "Fix product photo cropping: use object-fit contain for product images"
```

---

## Task 4: Site-wide link audit

**Files:**
- Create (temporary): `scripts/verify-links.js`

**Background:** After Tasks 1-3 changed the set of generated pages (Opell Prima group count dropped from 61 to 50, possibly more collections affected by Task 2), re-run the link-resolution check to confirm no broken internal links/images.

- [ ] **Step 1: Create the verification script**

Create `scripts/verify-links.js`:

```js
// scripts/verify-links.js (temporary, delete after use)
const fs = require('fs');
const path = require('path');

function checkPage(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const docDir = path.dirname(filePath);
  const relPath = path.relative(process.cwd(), docDir).split(path.sep).join('/');
  const baseUrl = new URL('https://example.com/' + relPath + '/');
  const attrs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  let broken = 0;
  for (const attr of attrs) {
    if (/^(https?:|mailto:|tel:|#|javascript:)/.test(attr)) continue;
    const resolved = new URL(attr, baseUrl).pathname;
    let fsPath = path.join(process.cwd(), resolved.replace(/^\//, ''));
    let exists = fs.existsSync(fsPath);
    if (!exists && !path.extname(fsPath)) {
      exists = fs.existsSync(path.join(fsPath, 'index.html'));
    }
    if (!exists) {
      broken++;
      console.log('BROKEN', filePath, '->', attr, '=>', resolved);
    }
  }
  return broken;
}

let total = 0;
for (const entry of fs.readdirSync('collections', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = path.join('collections', entry.name);
  for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
    if (sub.isDirectory()) {
      total += checkPage(path.join(dir, sub.name, 'index.html'));
    } else if (sub.name === 'index.html') {
      total += checkPage(path.join(dir, 'index.html'));
    }
  }
}
console.log('Total broken links:', total);
```

- [ ] **Step 2: Run it**

Run: `node scripts/verify-links.js`

Expected: `Total broken links: <=13`, and EVERY broken-link line printed must reference `IPM Chrome Catalogue April 2026-2A.pdf` (the known pre-launch brochure placeholder, one per collection page = up to 13). If any broken link references an `opell-prima-016`, `opell-prima-014`, `opell-prima-011`, `opell-prima-022`, `opell-prima-023`, `opell-prima-045`, `opell-prima-030`, `opell-prima-028`, `opell-prima-004`, `opell-prima-059`, or `opell-prima-060` path (the absorbed groups from Task 1), or any image filename, that's a real bug — investigate and fix:
- A broken link to an absorbed group's OLD page path means something still has a `Related Product Groups` reference to that slug — find it with `grep -rn "opell-prima-016\|opell-prima-014" "product catalogue.xlsx"` is not possible (binary file), instead re-run `node -e "..."` against the xlsx to search all `Related Product Groups` cells for the absorbed slugs, and if found, replace with the survivor's slug (e.g. `opell-prima-015`), then re-run `npm run build`.
- A broken IMAGE link means a `Gallery Images` or `image` cell references a filename that doesn't exist in `images/products/opell-prima/` — verify the filename against `ls images/products/opell-prima/`.

- [ ] **Step 3: Delete the temporary script**

Run: `rm scripts/verify-links.js`

- [ ] **Step 4: Commit (only if fixes were needed)**

If Step 2 required fixes:
```bash
git add product catalogue.xlsx collections sitemap.xml
git commit -m "Fix broken links introduced by Opell Prima variant merge"
```

If no fixes were needed, no commit for this task (verify-links.js was temporary and already removed — `git status` should be clean).

---

## Task 5: Per-collection visual polish (subtle accents)

**Files:**
- Modify: `css/catalog.css`
- Modify: `scripts/lib/render-collection.js`

**REQUIRED SUB-SKILL for this task:** Use `/frontend-design` for the CSS values (hue-rotate degrees, spacing) — the mechanics below set up the data-driven hooks; `/frontend-design` tunes the actual visual values.

**Background:** Per spec Part 3 "Per-collection polish", add data-driven micro-variation so the 13 collection pages don't feel identical, while keeping the shared structure. Three independent, droppable mechanisms.

- [ ] **Step 1: Showcase tile arrangement variant based on category count**

Open `scripts/lib/render-collection.js`. In `renderShowcase` (added in the prior plan), find:

```js
  return `<section class="sec">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">${eyebrowLabel}</div>
      <h2 class="serif">${heading}</h2>${taglineLine}
    </div>
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}">
${mainTile}
${supportingTiles}
    </div>
  </div>
</section>`;
```

Add a category-count-derived modifier class. Insert before the `return` statement:

```js
  const rangeModifier = collection.categories.length >= 3 ? ' showcase--wide-range' : ' showcase--focused';
```

Then change the showcase div's class to include it:

```js
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}${rangeModifier}">
```

In `css/catalog.css`, after the existing `.showcase` rules (find the block ending around the `@media (max-width: 860px)` rule for `.showcase`), add:

```css
.showcase--wide-range .showcase-sub { gap: 24px; }
.showcase--wide-range.showcase { grid-template-columns: repeat(3, 1fr); }
.showcase--focused.showcase { grid-template-columns: repeat(3, 1fr); }
.showcase--focused .showcase-main:not(.showcase-main-lg) { grid-column: span 2; }
.showcase--focused .showcase-sub:nth-of-type(n+3) { display: none; }
```

This makes "focused" (1-2 category) collections show a larger main tile (2/3 width) with only 1 supporting tile, while "wide-range" (3 category) collections keep the existing 1-main + up to 3-supporting layout.

- [ ] **Step 2: Run build and check both variants render**

Run: `npm run build`

Then check:
```bash
node -e "
const xlsx = require('xlsx');
const wb = xlsx.readFile('product catalogue.xlsx');
const ws = wb.Sheets['Collections'];
const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
rows.forEach(r => console.log(r['Collection Name'], '|', r['Categories']));
"
```
This shows each collection's category list (comma-separated). Pick one collection with 1 category (e.g. an accessories-only collection) and confirm:
```bash
grep -o "showcase--wide-range\|showcase--focused" collections/<that-slug>/index.html
```
shows `showcase--focused`. Pick a collection spanning 3 categories (e.g. Aliva, which has Faucets/Showers/Accessories) and confirm it shows `showcase--wide-range`.

- [ ] **Step 3: Hover-tint accent (per-collection hue-rotate)**

This step is OPTIONAL per the spec ("if it proves visually awkward... can be dropped without affecting the others"). Implement it as follows, and SKIP it (do not add the CSS) if `/frontend-design` review in Step 5 finds it makes gold/brass fixtures look off.

In `scripts/lib/render-collection.js`, in `renderCollectionPage`, add a small lookup near the top of the function:

```js
  const HUE_ACCENTS = {
    flora: 3, cube: -2, 'cube-prima': -3, fuzone: 2, jp: -2, premium: 2,
    'para-collection': -3, allied: 3, 'zenith-collections': -2,
    'square-brass-accessories': 2, 'round-brass-accessories': -2,
    // aliva and opell-prima intentionally omitted (signature gold lines, no hue shift)
  };
  const hueAccent = HUE_ACCENTS[collection.slug];
```

In `css/catalog.css`, the existing hover rule is:
```css
.coll-card:hover .arch img { filter: brightness(1.04) saturate(1.08); }
```

Add a per-collection override mechanism — in `render-collection.js`, add a small `<style>` snippet to the page's CSS only when `hueAccent` is set. Find where `renderCollectionPage` assembles its returned object (look for a `pageCss` or similar variable passed to `renderPage`). Add:

```js
  const accentCss = hueAccent
    ? `.coll-card:hover .arch img, .showcase-tile:hover .arch img { filter: brightness(1.04) saturate(1.08) hue-rotate(${hueAccent}deg); }`
    : '';
```

Append `accentCss` to whatever CSS string is passed to `renderPage` for this page (concatenate with the existing page CSS string using a newline).

- [ ] **Step 4: Tagline placement variation (alternate caption position)**

In `scripts/lib/render-collection.js`'s `renderShowcase`, the non-signature `taglineLine` is currently:

```js
  const taglineLine = isSignature
    ? `\n      <p class="showcase-quote serif">"${escapeHtml(collection.tagline)}"</p>`
    : `\n      <p class="showcase-tagline">${escapeHtml(collection.tagline)}</p>`;
```

Change to alternate placement based on the collection's primary category:

```js
  const captionUnderTile = !isSignature && collection.categories[0] === 'Accessories';
  const taglineLine = isSignature
    ? `\n      <p class="showcase-quote serif">"${escapeHtml(collection.tagline)}"</p>`
    : (captionUnderTile ? '' : `\n      <p class="showcase-tagline">${escapeHtml(collection.tagline)}</p>`);
```

Then in the section's return template, after `${supportingTiles}` and before the closing `</div>` of `.showcase`, conditionally add a caption:

```js
  const underTileCaption = captionUnderTile
    ? `\n      <p class="showcase-tagline showcase-tagline--caption">${escapeHtml(collection.tagline)}</p>`
    : '';
```

And in the returned template string, change:
```js
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}${rangeModifier}">
${mainTile}
${supportingTiles}
    </div>
  </div>
</section>`;
```//
to:
```js
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}${rangeModifier}">
${mainTile}
${supportingTiles}
    </div>${underTileCaption}
  </div>
</section>`;
```

In `css/catalog.css`, add:
```css
.showcase-tagline--caption { margin-top: 24px; text-align: center; }
```

- [ ] **Step 5: Build, then `/frontend-design` visual review**

Run: `npm run build`

Dispatch `/frontend-design` (or review directly via local server) to check:
- A "wide-range" collection (e.g. Aliva) and a "focused" collection (e.g. Square Brass Accessories or Round Brass Accessories — both likely Accessories-only) render their respective showcase layouts cleanly, no overlapping/cut-off tiles.
- If hue-rotate accents were added (Step 3), hover over product cards in 2-3 different collections and confirm gold/brass fixtures still look like gold/brass (not green/blue-tinted). If ANY collection's hover looks off, remove that collection's entry from `HUE_ACCENTS` (or remove the whole feature if multiple look off).
- An Accessories-primary non-signature collection (caption-under-tile, Step 4) renders the tagline centered below the showcase grid, not awkwardly placed.

Make any small CSS value adjustments found necessary (spacing, hue degrees) directly, then rebuild.

- [ ] **Step 6: Commit**

```bash
git add css/catalog.css scripts/lib/render-collection.js collections sitemap.xml
git commit -m "Add subtle per-collection visual variation to Signature Showcase sections"
```

---

## Task 6: Final full rebuild and summary

**Files:** none (verification only)

- [ ] **Step 1: Full rebuild**

Run: `npm run build`
Expected: `Generated 13 collection page(s), N product page(s). M missing image(s) (see above).` with 0 errors. N should be `316 - 11` = `305` (assuming only Task 1's 11-group reduction; if Task 2 found additional merges, N will be lower accordingly — note the actual N).

- [ ] **Step 2: Final link audit**

Recreate and run `scripts/verify-links.js` (same content as Task 4, Step 1) one more time, confirm `Total broken links` only includes the brochure-PDF placeholders, then delete it again (`rm scripts/verify-links.js`).

- [ ] **Step 3: Confirm working tree is clean**

Run: `git status --porcelain`
Expected: empty (all generated output committed in prior tasks).

- [ ] **Step 4: Final commit if any stragglers**

If Step 1's rebuild produced any diffs not yet committed (e.g. minor whitespace changes from re-running build), commit them:
```bash
git add collections sitemap.xml
git commit -m "Final rebuild after Opell Prima cleanup and image fixes"
```

---

## Self-Review Notes

- **Spec coverage:** Part 1 (Opell Prima merge, exact table) -> Task 1. Part 1 "validation pass for other collections" -> Task 2. Part 2 (image fix) -> Task 3. Part 3 link audit -> Tasks 4 & 6 (re-check). Part 3 per-collection polish (3 mechanisms, each droppable) -> Task 5. ✅
- **Placeholder scan:** No TBD/TODO. All scripts are complete, copy-pasteable. Task 1's Step 2 expected-output arithmetic was double-checked and corrected inline (315 rows / 50 groups).
- **Type/name consistency:** `collection.showcaseGroups`, `renderShowcaseTile`, `renderShowcase`, `taglineLine`, `collection.categories`, `collection.slug`, `collection.tagline` all match names established in the prior plan/commits (`68a186a`, `c9bf98c`, `6fd7053`). New names introduced here (`product-shot`, `HUE_ACCENTS`, `rangeModifier`, `captionUnderTile`, `underTileCaption`, `accentCss`) are used consistently within their introducing task only.
- **Autonomous-safety:** every task ends with a commit (or an explicit "no commit needed" note), so an interrupted run can resume from `git log` + this checklist without redoing completed work. Tasks 3 and 5 explicitly call out `/frontend-design` per user instruction; Task 1/2's data scripts are kept in the repo (not deleted) as a record, matching the existing `populate-from-scrape.js` convention.
