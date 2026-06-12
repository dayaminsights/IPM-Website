# Collection Catalog Expansion + Signature Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape product names/categories/photos for the remaining 11 collections from ipmbathfittings.com (mirroring the completed Aliva/Flora pilot), append them to `product catalogue.xlsx`, and add a "Signature Showcase" section + real-photo hero to every generated `/collections/<slug>/index.html` page.

**Architecture:** Reuse the existing scrape pipeline (`scripts/scrape-reference-site.js` fetch+extract, `scripts/populate-from-scrape.js` normalize+download+xlsx-append), generalized to loop over a config table of all 13 collections. Scraping for the 11 new collections is parallelized across subagents (each writes only to its own JSON files + image folders — no concurrent xlsx writes). A single sequential pass then appends all new rows to the xlsx. Separately, `read-catalog.js` and `render-collection.js` gain hero-image and showcase-section logic, plus one new CSS component in `css/catalog.css`.

**Tech Stack:** Node.js, `xlsx` (SheetJS), vanilla HTML/CSS generation (existing build system).

---

## File Structure

- Modify: `scripts/scrape-reference-site.js` — generalize `COLLECTIONS` config to cover all 13 collections (11 new + existing aliva/flora kept for idempotency), parameterize the reference-site category slug separately from our internal slug.
- Modify: `scripts/populate-from-scrape.js` — generalize `EXISTING_GROUP_NUMBERS` and the `Collection Name` lookup to all 13 collections; extend `CATEGORY_RULES` for accessory-type keywords; loop over all collections' JSON files.
- Modify: `scripts/lib/read-catalog.js` — hero image resolution now prefers a real scraped product image over the category fallback (lines ~307-320).
- Modify: `scripts/lib/render-collection.js` — add `renderShowcase()`, call it between hero and story (lines ~58-90, ~190-200).
- Modify: `css/catalog.css` — add `.showcase` component block.
- Create (per subagent, gitignored): `scripts/scrape-output/<collection>-products.json` for each of the 11 new collections.
- New images: `images/products/<slug>/<group>-main.<ext>` for each new collection with results.

---

## Task 1: Generalize the scraper config for all 13 collections

**Files:**
- Modify: `scripts/scrape-reference-site.js`

- [ ] **Step 1: Replace the `COLLECTIONS` config with a full 13-collection table**

Open `scripts/scrape-reference-site.js`. Replace the existing `COLLECTIONS` constant (currently just `aliva` and `flora`, each with hardcoded listing-page URLs) with a config that separates "our slug" from "reference-site category slug", and generates listing URLs with pagination support up to a max page count discovered at runtime (the existing code already hardcodes `page/2/` for both — generalize to probe pages until a 404).

```js
const REFERENCE_CATEGORY_SLUG = {
  aliva: 'aliva-collection',
  flora: 'flora',
  'opell-prima': 'opell-prima',
  cube: 'cube-collection',
  'cube-prima': 'cube-prima',
  fuzone: 'fuzone',
  jp: 'jp',
  premium: 'premium',
  'para-collection': 'para-collection',
  allied: 'allied-collection',
  'zenith-collections': 'zenith-collections',
  'square-brass-accessories': 'square-brass-accessories',
  'round-brass-accessories': 'round-accessories',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Fetch all listing pages for a category (page 1, 2, 3... until a non-OK response)
async function fetchAllListingPages(refSlug) {
  const pages = [];
  for (let page = 1; page <= 10; page++) {
    const url = page === 1
      ? `https://ipmbathfittings.com/product-category/${refSlug}/`
      : `https://ipmbathfittings.com/product-category/${refSlug}/page/${page}/`;
    try {
      const html = await fetchHtml(url);
      pages.push(html);
    } catch (e) {
      break; // 404 or other error -> no more pages
    }
    await sleep(500);
  }
  return pages;
}
```

- [ ] **Step 2: Update `main()` to iterate over `REFERENCE_CATEGORY_SLUG` and use `fetchAllListingPages`**

Replace the body of `main()`'s outer loop (currently `for (const [collection, listingUrls] of Object.entries(COLLECTIONS))`) with:

```js
async function main() {
  const targets = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(REFERENCE_CATEGORY_SLUG);

  for (const collection of targets) {
    const refSlug = REFERENCE_CATEGORY_SLUG[collection];
    if (!refSlug) {
      console.log(`Unknown collection "${collection}", skipping`);
      continue;
    }
    console.log(`\n=== ${collection} (ref: ${refSlug}) ===`);

    const listingPages = await fetchAllListingPages(refSlug);
    const productUrls = new Set();
    for (const html of listingPages) {
      for (const u of extractProductUrls(html)) productUrls.add(u);
    }
    console.log(`Found ${productUrls.size} product URLs across ${listingPages.length} page(s)`);

    if (productUrls.size === 0) {
      fs.writeFileSync(path.join(OUT_DIR, `${collection}-products.json`), '[]\n', 'utf8');
      continue;
    }

    const results = [];
    for (const url of productUrls) {
      try {
        const html = await fetchHtml(url);
        const info = extractProductInfo(html);
        results.push({ url, ...info });
        console.log(`  ${info.title || '(no title)'} -> ${info.image || '(no image)'}`);
      } catch (e) {
        console.log(`  ERROR ${url}: ${e.message}`);
        results.push({ url, title: null, image: null, error: e.message });
      }
      await sleep(400);
    }

    fs.writeFileSync(
      path.join(OUT_DIR, `${collection}-products.json`),
      JSON.stringify(results, null, 2),
      'utf8'
    );
  }
}
```

This allows running `node scripts/scrape-reference-site.js opell-prima cube` to target specific collections (used by subagents to split work), or no args for all 13.

- [ ] **Step 3: Verify the script still runs for a single known-good collection**

Run: `node scripts/scrape-reference-site.js flora`
Expected: Output shows `=== flora (ref: flora) ===`, `Found 31 product URLs across 2 page(s)`, and `scripts/scrape-output/flora-products.json` is rewritten with the same 31 entries as before (re-scraping flora is idempotent and harmless — it overwrites the JSON, doesn't touch the xlsx).

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape-reference-site.js
git commit -m "Generalize reference-site scraper to cover all 13 collections"
```

---

## Task 2: Generalize `populate-from-scrape.js` for all 13 collections

**Files:**
- Modify: `scripts/populate-from-scrape.js`

- [ ] **Step 1: Replace `EXISTING_GROUP_NUMBERS` and add a `COLLECTION_NAMES` map**

The current code derives `Collection Name` via `collection.charAt(0).toUpperCase() + collection.slice(1)`, which breaks for multi-word names like "Cube Prima" or "Para Collection". Replace both constants:

```js
const COLLECTION_NAMES = {
  aliva: 'Aliva',
  flora: 'Flora',
  'opell-prima': 'Opell Prima',
  cube: 'Cube',
  'cube-prima': 'Cube Prima',
  fuzone: 'Fuzone',
  jp: 'JP',
  premium: 'Premium',
  'para-collection': 'Para Collection',
  allied: 'Allied',
  'zenith-collections': 'Zenith Collections',
  'square-brass-accessories': 'Square Brass Accessories',
  'round-brass-accessories': 'Round Brass Accessories',
};

// Existing Product Group numbers already used per collection (avoid collisions)
const EXISTING_GROUP_NUMBERS = {
  aliva: Array.from({ length: 28 }, (_, i) => i + 1),  // aliva-001..028 already populated
  flora: Array.from({ length: 32 }, (_, i) => i + 1).filter(n => n !== 2 || true), // flora-001..032 already populated
};
```

Note: since aliva (1-28) and flora (1-32) are now fully populated from the pilot, re-running the scraper for them would produce zero new rows anyway IF this script is re-run for them — but to be safe and explicit, the `EXISTING_GROUP_NUMBERS` above pre-fills all used numbers so `nextGroupNumber` would start at 29/33 if ever re-run. The other 11 collections start fresh (no entry needed — `EXISTING_GROUP_NUMBERS[collection] || []` defaults to empty, so numbering starts at `001`).

- [ ] **Step 2: Extend `CATEGORY_RULES` for accessory-type products**

The current rules only distinguish Showers and Faucets, defaulting everything else to Accessories. For collections like "Square Brass Accessories" / "Round Brass Accessories" this default is likely correct, but add explicit accessory keywords so products are categorized confidently rather than by exclusion:

```js
const CATEGORY_RULES = [
  { re: /shower/i, category: 'Showers' },
  { re: /mixer|cock|val[v|b]e|spout|diverter|swan neck|nozzle|flush|table top|long body/i, category: 'Faucets' },
  { re: /holder|hook|tray|dispenser|ring|rail|rod|bracket|tumbler|soap dish|robe|towel|paper/i, category: 'Accessories' },
];
```

(The third rule is redundant with the final `return 'Accessories'` fallback today, but makes intent explicit and keeps the function correct if a 4th category rule is ever inserted between Faucets and Accessories.)

- [ ] **Step 3: Update `main()` to read `COLLECTION_NAMES` and accept a collection list argument**

Replace:
```js
async function main() {
  const collections = ['aliva', 'flora'];
```
with:
```js
async function main() {
  const collections = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(COLLECTION_NAMES);
```

And replace:
```js
    const collectionName = collection.charAt(0).toUpperCase() + collection.slice(1);
```
with:
```js
    const collectionName = COLLECTION_NAMES[collection];
    if (!collectionName) {
      report.push(`SKIP collection "${collection}": not in COLLECTION_NAMES`);
      continue;
    }
```

- [ ] **Step 4: Handle missing/empty JSON files gracefully**

The current code does `JSON.parse(fs.readFileSync(jsonPath, 'utf8'))` which throws if the file doesn't exist. Since Task 1 writes `[]` for collections with zero scraped products (and a collection's JSON might not exist yet if a subagent hasn't run), wrap the read:

```js
    let products = [];
    try {
      products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      report.push(`SKIP collection "${collection}": no scrape data (${jsonPath} not found)`);
      continue;
    }
    if (products.length === 0) {
      report.push(`${collection}: 0 products scraped, nothing to add`);
      continue;
    }
```

(Place this where the existing `const products = JSON.parse(...)` line is, removing the old line.)

- [ ] **Step 5: Verify with a dry run on a collection with no JSON yet**

Run: `node scripts/populate-from-scrape.js opell-prima` (before Task 3 produces `opell-prima-products.json`)
Expected: Output includes `SKIP collection "opell-prima": no scrape data (...)`, and `Added 0 new product rows to "Products" sheet.` — confirms graceful handling, and confirms the xlsx is unchanged (re-check row count matches pre-run count).

- [ ] **Step 6: Commit**

```bash
git add scripts/populate-from-scrape.js
git commit -m "Generalize catalog population script for all 13 collections"
```

---

## Task 3: Scrape the 11 remaining collections (parallel subagents)

**Files:**
- Create: `scripts/scrape-output/<slug>-products.json` for each of the 11 collections below

This task is executed via `superpowers:dispatching-parallel-agents`. Split the 11 collections into 3 groups of ~3-4 and dispatch one subagent per group. Each subagent runs ONLY the scrape step (Task 1's script) for its assigned collections — it must NOT run `populate-from-scrape.js` or modify the xlsx (avoids concurrent-write conflicts).

- [ ] **Step 1: Dispatch subagent A — collections: `opell-prima`, `cube`, `cube-prima`, `fuzone`**

Subagent prompt: "Run `node scripts/scrape-reference-site.js opell-prima cube cube-prima fuzone` from the repo root (`c:\Users\USER\Documents\GitHub\IPM Website`). This fetches product listings + individual product pages from ipmbathfittings.com for these 4 collections and writes `scripts/scrape-output/<slug>-products.json` for each. Report the console output (product counts found per collection) when done. Do NOT run any other script or modify any file outside `scripts/scrape-output/`."

- [ ] **Step 2: Dispatch subagent B — collections: `jp`, `premium`, `para-collection`, `allied`**

Subagent prompt: "Run `node scripts/scrape-reference-site.js jp premium para-collection allied` from the repo root (`c:\Users\USER\Documents\GitHub\IPM Website`). This fetches product listings + individual product pages from ipmbathfittings.com for these 4 collections and writes `scripts/scrape-output/<slug>-products.json` for each. Report the console output (product counts found per collection) when done. Do NOT run any other script or modify any file outside `scripts/scrape-output/`."

- [ ] **Step 3: Dispatch subagent C — collections: `zenith-collections`, `square-brass-accessories`, `round-brass-accessories`**

Subagent prompt: "Run `node scripts/scrape-reference-site.js zenith-collections square-brass-accessories round-brass-accessories` from the repo root (`c:\Users\USER\Documents\GitHub\IPM Website`). This fetches product listings + individual product pages from ipmbathfittings.com for these 3 collections and writes `scripts/scrape-output/<slug>-products.json` for each. Report the console output (product counts found per collection) when done. Do NOT run any other script or modify any file outside `scripts/scrape-output/`."

- [ ] **Step 4: Verify all 11 JSON files exist**

Run: `ls scripts/scrape-output/*.json`
Expected: 13 files total (aliva, flora from before + 11 new: opell-prima, cube, cube-prima, fuzone, jp, premium, para-collection, allied, zenith-collections, square-brass-accessories, round-brass-accessories).

- [ ] **Step 5: Spot-check one or two JSON files for content**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('scripts/scrape-output/opell-prima-products.json','utf8')).length)"`
Expected: A number > 0 (or 0 with a clean `[]` if that category genuinely has no products on the reference site — acceptable per spec's "known risks" section).

No commit for this task (JSON files are gitignored per the existing `.gitignore` entry `scripts/scrape-output/`).

---

## Task 4: Populate xlsx + download images for all new collections

**Files:**
- Modify: `product catalogue.xlsx` (Products sheet — append rows)
- Create: `images/products/<slug>/<group>-main.<ext>` for each new collection's products

- [ ] **Step 1: Back up the xlsx before the run**

Run: `cp "product catalogue.xlsx" "product catalogue.xlsx.bak"`

- [ ] **Step 2: Run the population script for all 11 new collections**

Run: `node scripts/populate-from-scrape.js opell-prima cube cube-prima fuzone jp premium para-collection allied zenith-collections square-brass-accessories round-brass-accessories`

Expected: Console output ending with `Added N new product rows to "Products" sheet.` where N is the sum of products found across all 11 collections (each collection logs `OK <slug>-NNN: "<name>" (<category>) <- <image-url> (<bytes> bytes)` per product, or `SKIP`/`0 products scraped` for any empty category).

- [ ] **Step 3: Verify row counts per collection**

Run:
```bash
node -e "
const xlsx = require('xlsx');
const wb = xlsx.readFile('product catalogue.xlsx');
const rows = xlsx.utils.sheet_to_json(wb.Sheets['Products'], { defval: '' });
const byCollection = {};
for (const r of rows) {
  const c = r['Collection Name'];
  byCollection[c] = (byCollection[c] || 0) + new Set([r['Product Group']]).size;
}
const groups = {};
for (const r of rows) {
  const key = r['Collection Name'] + '::' + r['Product Group'];
  groups[key] = true;
}
const counts = {};
for (const key of Object.keys(groups)) {
  const c = key.split('::')[0];
  counts[c] = (counts[c] || 0) + 1;
}
console.log(counts);
"
```
Expected: An object showing product-group counts per collection name, e.g. `{ Aliva: 28, Flora: 32, 'Opell Prima': N, Cube: N, ... }` — every one of the 13 collections should have at least the pre-existing count, and most of the 11 new ones should have N > 0 (collections with 0 are acceptable if the reference site had nothing).

- [ ] **Step 4: Remove the backup once verified**

Run: `rm "product catalogue.xlsx.bak"`

No commit yet — the xlsx and new images will be committed together with the build output in Task 6.

---

## Task 5: Add real-photo hero resolution and "Signature Showcase" section

**Files:**
- Modify: `scripts/lib/read-catalog.js:307-320`
- Modify: `scripts/lib/render-collection.js`
- Modify: `css/catalog.css`

- [ ] **Step 1: Update hero image resolution in `read-catalog.js`**

Open `scripts/lib/read-catalog.js`. Find the block (around line 307-320):

```js
  for (const collection of collections) {
    if (collection.heroImage && !existingCollections.has(collection.heroImage)) {
      missing.push(`[missing-image] collection "${collection.slug}": hero image ${collection.heroImage} not found, using fallback`);
      collection.heroImage = '';
    }
    if (!collection.heroImage) {
      const primaryCategory = collection.categories[0];
      collection.resolvedHeroImage = primaryCategory
        ? `/images/collections/cat-${primaryCategory.toLowerCase()}.jpg`
        : '/images/collections/hero.jpg';
    } else {
      collection.resolvedHeroImage = `/images/collections/${collection.heroImage}`;
    }
  }
```

Replace with (this needs `productGroups` in scope — confirm by checking the enclosing function signature includes `productGroups`, which `readCollections(workbook, productGroups, warnings)` already does per its signature at line ~189):

```js
  for (const collection of collections) {
    if (collection.heroImage && !existingCollections.has(collection.heroImage)) {
      missing.push(`[missing-image] collection "${collection.slug}": hero image ${collection.heroImage} not found, using fallback`);
      collection.heroImage = '';
    }

    // Find this collection's product groups with a real (non-placeholder) image
    const collectionGroups = productGroups.filter(g => g.collectionSlug === collection.slug);
    const groupsWithRealImages = collectionGroups.filter(g =>
      g.variants[0] && g.variants[0].image && g.variants[0].image !== PLACEHOLDER_IMAGE
        && !g.variants[0].image.startsWith('/images/collections/cat-')
    );
    collection.showcaseGroups = groupsWithRealImages;

    if (!collection.heroImage) {
      if (groupsWithRealImages.length > 0) {
        collection.resolvedHeroImage = groupsWithRealImages[0].variants[0].image;
      } else {
        const primaryCategory = collection.categories[0];
        collection.resolvedHeroImage = primaryCategory
          ? `/images/collections/cat-${primaryCategory.toLowerCase()}.jpg`
          : '/images/collections/hero.jpg';
      }
    } else {
      collection.resolvedHeroImage = `/images/collections/${collection.heroImage}`;
    }
  }
```

- [ ] **Step 2: Verify `readCollections` is called with `productGroups` already resolved (image fallback already applied)**

Run: `grep -n "readCollections(" scripts/build-catalog.js scripts/lib/read-catalog.js`
Expected: One call site in `build-catalog.js` like `readCollections(workbook, productGroups, warnings)`, called AFTER `readProducts(...)` has already run its image-fallback post-pass (so `group.variants[0].image` is already a resolved path, not a raw filename, by the time `readCollections` runs). If the call order is reversed, this step's logic won't have resolved image paths to check — confirm order is products-then-collections before proceeding. (Based on the existing codebase this order is already correct since `collection.categories` auto-derivation already depends on `productGroups`.)

- [ ] **Step 3: Add `renderShowcase()` to `render-collection.js`**

Open `scripts/lib/render-collection.js`. Add this new function after `renderRelatedCollectionCard` (after line 32, before `renderCollectionPage`):

```js
function renderShowcaseTile(group, depth, sizeClass) {
  const primary = group.variants[0];
  const href = `${group.groupSlug}/`;
  return `        <a class="showcase-tile ${sizeClass}" href="${href}">
          <div class="arch"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
        </a>`;
}

function renderShowcase(collection, depth) {
  const groups = collection.showcaseGroups || [];
  if (groups.length === 0) return '';

  const isSignature = collection.isSignature;
  const eyebrowLabel = isSignature ? 'Signature Line' : 'The Range';
  const heading = isSignature
    ? `The <em>${escapeHtml(collection.name)}</em> Standard`
    : `Inside <em>${escapeHtml(collection.name)}</em>`;

  const main = groups[0];
  const supporting = groups.slice(1, 4);

  const mainSizeClass = isSignature ? 'showcase-main showcase-main-lg' : 'showcase-main';
  const mainTile = renderShowcaseTile(main, depth, mainSizeClass);
  const supportingTiles = supporting.map(g => renderShowcaseTile(g, depth, 'showcase-sub')).join('\n');

  const pullQuote = isSignature
    ? `\n      <p class="showcase-quote serif">"${escapeHtml(collection.tagline)}"</p>`
    : '';

  return `<section class="sec showcase-sec${isSignature ? ' is-signature' : ''}">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">${eyebrowLabel}</div>
      <h2 class="serif">${heading}</h2>${pullQuote}
    </div>
    <div class="showcase stagger-children">
${mainTile}
${supportingTiles}
    </div>
  </div>
</section>`;
}
```

- [ ] **Step 4: Wire `renderShowcase` into `renderCollectionPage`**

In `renderCollectionPage`, find the `bodyContent` template (around line 178-195):

```js
  const bodyContent = `${renderHeader(depth)}

${heroHtml}

${storyHtml}
```

Replace with:

```js
  const showcaseHtml = renderShowcase(collection, depth);

  const bodyContent = `${renderHeader(depth)}

${heroHtml}

${showcaseHtml ? `${showcaseHtml}\n\n<div class="sec-divider"><span></span></div>\n\n` : ''}${storyHtml}
```

- [ ] **Step 5: Add `.showcase` CSS to `css/catalog.css`**

Append to the end of `css/catalog.css`:

```css
/* ----------------------------------------------------------------
   SIGNATURE SHOWCASE
----------------------------------------------------------------- */
.showcase-quote {
  margin-top: 18px;
  font-size: clamp(20px, 2.2vw, 28px);
  font-style: italic;
  color: var(--ink);
  max-width: 640px;
}
.showcase {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 48px;
}
.showcase-tile { display: block; }
.showcase-tile .arch {
  aspect-ratio: 4/3;
  transition: transform .4s cubic-bezier(.2,.6,.2,1);
  will-change: transform;
}
.showcase-tile:hover .arch { transform: scale(1.02); }
.showcase-tile .arch img { transition: filter .6s cubic-bezier(.2,.6,.2,1); }
.showcase-tile:hover .arch img { filter: brightness(1.04) saturate(1.08); }
.showcase-tile .cc-name {
  font-family: 'Cormorant Garamond', serif; font-weight: 400;
  font-size: 20px; margin-top: 14px; color: var(--ink);
}
.showcase-main { grid-column: span 1; }
.showcase-sub { grid-column: span 1; }
.showcase.is-signature .showcase-main-lg {
  grid-column: span 2;
}
.showcase.is-signature .showcase-main-lg .arch { aspect-ratio: 16/10; }

@media (max-width: 860px) {
  .showcase { grid-template-columns: 1fr; }
  .showcase.is-signature .showcase-main-lg { grid-column: span 1; }
  .showcase.is-signature .showcase-main-lg .arch { aspect-ratio: 4/3; }
}
```

Note: `.showcase-sec.is-signature` selector isn't used directly in the CSS above — the `is-signature` class lives on `.showcase` (the grid div), not the section, matching the markup from Step 3 (`<div class="showcase stagger-children">` doesn't currently get the modifier — fix this: in Step 3's `renderShowcase`, the `is-signature` class is added to the `<section>` via `showcase-sec${isSignature ? ' is-signature' : ''}`, but the CSS modifier `.showcase.is-signature` targets the inner `.showcase` div. Fix the markup in Step 3 to also add the modifier to the inner div:

```js
  return `<section class="sec showcase-sec${isSignature ? ' is-signature' : ''}">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">${eyebrowLabel}</div>
      <h2 class="serif">${heading}</h2>${pullQuote}
    </div>
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}">
${mainTile}
${supportingTiles}
    </div>
  </div>
</section>`;
```

(Apply this corrected version in Step 3 instead of the first version — the only change is the `<div class="showcase ...">` line.)

- [ ] **Step 6: Rebuild and verify Aliva (signature) shows the showcase**

Run: `npm run build`
Expected: `Generated 13 collection page(s), N product page(s)` (13 = however many collections now have at least one product group — likely all 13 if every collection had a seed row or scraped products; 0 new errors).

Run: `grep -c "showcase-tile" collections/aliva/index.html`
Expected: A number ≥ 1 (4 if Aliva has ≥4 groups with real images, which it does — 28 groups).

Run: `grep "showcase-main-lg\|showcase-quote" collections/aliva/index.html`
Expected: Both classes present (Aliva `Is Signature = Yes`).

- [ ] **Step 7: Verify a non-signature collection (Flora) shows the compact showcase without the pull-quote**

Run: `grep -c "showcase-tile" collections/flora/index.html && grep -c "showcase-main-lg\|showcase-quote" collections/flora/index.html`
Expected: First count ≥ 1, second count = 0 (Flora `Is Signature` is not `Yes`).

- [ ] **Step 8: Verify a collection with zero scraped images degrades gracefully**

Pick any collection from Task 4 that ended with 0 new product rows (if any did). Run: `grep -c "showcase-sec" collections/<that-slug>/index.html`
Expected: `0` (the `renderShowcase` returns `''` when `showcaseGroups` is empty, so no `<section class="sec showcase-sec...">` appears) — and `grep "page-hero img" collections/<that-slug>/index.html` shows it still uses a `cat-*.jpg` fallback, not a broken path.

If every collection ended up with ≥1 scraped product, instead verify this code path doesn't crash by temporarily checking the logic against `read-catalog.js`'s existing single-variant groups (e.g. `flora-002`, which has only the placeholder/missing image) — confirm `flora-002` is correctly excluded from `showcaseGroups` (since its image resolves to the category fallback, not a real photo) by checking it does NOT appear among `collections/flora/index.html`'s `showcase-tile` hrefs:

Run: `grep "showcase-tile" collections/flora/index.html | grep -o 'href="[^"]*"'`
Expected: `flora-002/` is NOT in the list (its image is a category-fallback, filtered out by `groupsWithRealImages`).

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/read-catalog.js scripts/lib/render-collection.js css/catalog.css
git commit -m "Add real-photo collection heroes and Signature Showcase section"
```

---

## Task 6: Full rebuild, link verification, and final commit

**Files:**
- Generated: all `collections/<slug>/index.html` and `collections/<slug>/<group>/index.html`
- Generated: `sitemap.xml`

- [ ] **Step 1: Run a full build**

Run: `npm run build`
Expected: Output ends with `Generated 13 collection page(s), N product page(s). M missing image(s) (see above).` — note N and M for comparison; M should only include the pre-existing 8 missing-image warnings from `aliva-001`/`flora-002` plus possibly new entries for collections whose seed rows (if any) reference filenames that don't exist (acceptable, matches existing pattern).

- [ ] **Step 2: Run the link-resolution verification**

Recreate the verification script used in the Aliva/Flora pilot:

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

Run: `node scripts/verify-links.js`
Expected: `Total broken links: 0` — if any remain, they should ONLY be the 2 pre-existing pre-launch placeholders already known (the brochure PDF, e.g. `IPM Chrome Catalogue April 2026-2A.pdf`). Any broken `showcase-tile` or hero image link is a real bug — fix before proceeding.

- [ ] **Step 3: Delete the temporary verification script**

Run: `rm scripts/verify-links.js`

- [ ] **Step 4: Spot-check in browser via local server**

Run: `npx --yes serve -l 8080 .` (background)
Visit `http://localhost:8080/collections/aliva/` — confirm: hero shows a real Aliva product photo (not `cat-faucets.jpg`), a "Signature Line" showcase section appears below the hero with 1 large + up to 3 smaller product tiles and an italic tagline pull-quote, then "Collection Story" follows.
Visit `http://localhost:8080/collections/flora/` — confirm: hero shows a real Flora product photo, "The Range" showcase section appears (no pull-quote, more even tile sizing), then "Collection Story".
Visit `http://localhost:8080/collections/<a collection from Task 4 with 0 scraped products, if any>/` — confirm: hero falls back to `cat-*.jpg`, no showcase section appears, page still renders cleanly.

- [ ] **Step 5: Commit the generated output and new images/xlsx**

```bash
git add product catalogue.xlsx images/products collections sitemap.xml
git commit -m "Expand catalog with scraped products for remaining 11 collections; add Signature Showcase"
```

---

## Self-Review Notes

- **Spec coverage:** Part 1 (catalog expansion for all 11 collections, parallelized) → Tasks 1-4. Part 2 (real-photo hero + Signature Showcase, signature vs. non-signature variants, graceful degradation) → Task 5. Verification (build + link check + browser spot-check) → Task 6. ✅
- **Placeholder scan:** No TBD/TODO; all code blocks are complete and copy-pasteable.
- **Type/name consistency:** `collection.showcaseGroups` (set in Task 5 Step 1, read in Task 5 Step 3's `renderShowcase`); `renderShowcaseTile`/`renderShowcase` names consistent between definition and call site; `PLACEHOLDER_IMAGE` already exported from `read-catalog.js` (confirmed via existing `module.exports`).
- **Known follow-up (not blocking):** the corrected markup for the `is-signature` modifier is described as a "fix the previous version" within Task 5 Step 5 for clarity about *why* the CSS needs that class on the inner div — an implementer should write the corrected version directly in Step 3, not write-then-fix. This is a documentation-clarity tradeoff, not an ambiguity in the final code.
