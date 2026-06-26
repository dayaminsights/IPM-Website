# Catalog Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the generated catalog from the color-coded `ITEM MASTER FOR WEBSITE.xlsx` + new photo zip: drop red rows, flag blue rows, associate images by the client's exact `Source Image File` name, and render "No Photo Available" instead of any fallback image.

**Architecture:** Five-stage pipeline. New Stage 0 (`clean-master.js`) reads per-row font color via direct XML parse, drops red rows, flags blue, emits `catalog.clean.xlsx`. `transform-master.js` consumes the cleaned workbook and carries new `sourceImage`/`noPhoto` fields. `match-assets.js` is rewritten to exact-basename lookup (no fuzzy). The build's image-fallback chain is replaced with a "No Photo Available" card. Finish + size clubbing is unchanged.

**Tech Stack:** Node.js, `xlsx@0.18.5` (SheetJS), `sharp` (image resize), `unzip` CLI, `node:test` for tests. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-26-catalog-redo-design.md`

---

## Shared Constants (used across tasks — define once, reuse)

Font-color → meaning, from `xl/styles.xml` of the source file (verified):

```js
// scripts/migrate/clean-master.js — module-level
const RED_XF  = new Set([3, 4, 5, 9, 11, 17, 18]);   // font color FFFF0000 → remove
const BLUE_XF = new Set([13, 14, 15, 16]);            // font color FF00B0F0 → no-photo flag
```

Source file: `ITEM MASTER FOR WEBSITE.xlsx`, sheet `Item Master + Images`. Columns (0-based): A ReferenceNo*, B Item Name, C ItemCode*, D Collection Name, E Category, F MRP, G DESCRIPTION, H GrossWeight, I Image Status, **J Source Image File**, K Site Image File, L Match Score, M Match Confidence.

New zip: `PICTURES FOR WEBSITE-20260626T155809Z-3-001.zip`.

Per-variant model fields added this project:
```
sourceImage : string   // trimmed col J value, or ''
noPhoto     : boolean   // true when no image should ever be shown
rowFlag     : 'blue' | 'plain'
```

---

## Task 1: `clean-master.js` — color classify + cleaned workbook

**Files:**
- Create: `scripts/migrate/clean-master.js`
- Create: `test/clean-master.test.js`
- Output (runtime): `catalog.clean.xlsx`, `reports/clean-report.md`

- [ ] **Step 1: Write the failing test**

`test/clean-master.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { classifyRowColor, parseSheetColors } = require('../scripts/migrate/clean-master');

test('classifyRowColor: red xf wins', () => {
  assert.equal(classifyRowColor(new Set([0, 3])), 'red');
});
test('classifyRowColor: blue when no red', () => {
  assert.equal(classifyRowColor(new Set([0, 13])), 'blue');
});
test('classifyRowColor: plain when neither', () => {
  assert.equal(classifyRowColor(new Set([0, 1, 2])), 'plain');
});
test('parseSheetColors tallies the real file', () => {
  const { rows } = parseSheetColors('ITEM MASTER FOR WEBSITE.xlsx');
  const red = rows.filter(r => r.color === 'red').length;
  const blue = rows.filter(r => r.color === 'blue').length;
  assert.equal(rows.length, 1060);
  assert.equal(red, 238);
  assert.equal(blue, 48);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/clean-master.test.js`
Expected: FAIL — `Cannot find module '../scripts/migrate/clean-master'`.

- [ ] **Step 3: Implement `clean-master.js`**

```js
'use strict';
// Stage 0 — Clean. Reads per-row font color from the client's color-coded master,
// drops red rows (remove from site), flags blue rows (no-photo intent), and emits
// a cleaned workbook + report. Color is read by direct XML parse because SheetJS
// does not expose per-cell font color reliably.
//
// Run: node scripts/migrate/clean-master.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..', '..');
const MASTER = path.join(ROOT, 'ITEM MASTER FOR WEBSITE.xlsx');
const OUT = path.join(ROOT, 'catalog.clean.xlsx');
const REPORT = path.join(ROOT, 'reports', 'clean-report.md');

const RED_XF = new Set([3, 4, 5, 9, 11, 17, 18]);
const BLUE_XF = new Set([13, 14, 15, 16]);

function classifyRowColor(xfSet) {
  for (const s of xfSet) if (RED_XF.has(s)) return 'red';
  for (const s of xfSet) if (BLUE_XF.has(s)) return 'blue';
  return 'plain';
}

// Unzip the xlsx into a temp dir and read sheet1.xml + sharedStrings.xml.
function parseSheetColors(masterPath) {
  const abs = path.isAbsolute(masterPath) ? masterPath : path.join(ROOT, masterPath);
  const TMP = path.join(ROOT, '.clean-tmp');
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  execFileSync('unzip', ['-o', '-q', abs, '-d', TMP], { maxBuffer: 64 * 1024 * 1024 });
  const sheetXml = fs.readFileSync(path.join(TMP, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
  fs.rmSync(TMP, { recursive: true, force: true });

  const rows = [];
  for (const r of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = +r[1];
    if (rowNum === 1) continue; // header
    const xfSet = new Set();
    for (const c of r[2].matchAll(/<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g)) {
      const sm = c[1].match(/s="(\d+)"/);
      xfSet.add(sm ? +sm[1] : 0);
    }
    rows.push({ rowNum, color: classifyRowColor(xfSet) });
  }
  return { rows };
}

function main() {
  if (!fs.existsSync(MASTER)) { console.error(`Missing ${MASTER}`); process.exit(1); }
  const { rows: colorRows } = parseSheetColors(MASTER);
  const colorByRowNum = new Map(colorRows.map(r => [r.rowNum, r.color]));

  // Read data with SheetJS so we keep all column values. Row 1 = header => data starts at sheet row 2.
  const wb = xlsx.readFile(MASTER);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const kept = [];
  const removed = [];
  const blue = [];
  data.forEach((row, i) => {
    const sheetRowNum = i + 2;
    const color = colorByRowNum.get(sheetRowNum) || 'plain';
    const code = String(row['ItemCode*'] || '').trim();
    if (color === 'red') { removed.push(code); return; }
    if (color === 'blue') blue.push(code);
    kept.push({ ...row, RowFlag: color });
  });

  const outWb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(kept), 'Item Master + Images');
  xlsx.writeFile(outWb, OUT);

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, renderReport({ total: data.length, kept, removed, blue }), 'utf8');

  console.log('Stage 0 — clean-master');
  console.log(`  source rows=${data.length} removed(red)=${removed.length} kept=${kept.length} blue=${blue.length}`);
  console.log(`  -> ${path.relative(ROOT, OUT)}  +  ${path.relative(ROOT, REPORT)}`);
}

function renderReport(d) {
  const list = (arr) => arr.length ? arr.map(c => `- ${c}`).join('\n') : '_None._';
  return `# Clean Report — Catalog Redo

| Metric | Value |
| --- | --- |
| Source data rows | ${d.total} |
| Removed (red) | ${d.removed.length} |
| Kept | ${d.kept.length} |
| Blue (no-photo flag) | ${d.blue.length} |

## Removed ItemCodes (red)

${list(d.removed)}

## Blue ItemCodes (no-photo flag)

${list(d.blue)}
`;
}

module.exports = { classifyRowColor, parseSheetColors };

if (require.main === module) main();
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test test/clean-master.test.js`
Expected: PASS (4 tests). The real-file test asserts 1060 rows, 238 red, 48 blue.

- [ ] **Step 5: Run the script end-to-end**

Run: `node scripts/migrate/clean-master.js`
Expected stdout: `removed(red)=238 kept=822 blue=48`. Verify `catalog.clean.xlsx` exists and `reports/clean-report.md` lists 238 removed codes.

- [ ] **Step 6: Sanity-check the cleaned workbook**

Run:
```bash
node -e "const x=require('xlsx');const w=x.readFile('catalog.clean.xlsx');const r=x.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],{defval:''});console.log('rows',r.length,'hasRowFlag',Object.keys(r[0]).includes('RowFlag'),'blue',r.filter(z=>z.RowFlag==='blue').length)"
```
Expected: `rows 822 hasRowFlag true blue 48`.

- [ ] **Step 7: Commit**

```bash
git add scripts/migrate/clean-master.js test/clean-master.test.js
git commit -m "feat(migrate): clean-master.js — drop red rows, flag blue, emit catalog.clean.xlsx"
```

---

## Task 2: `transform-master.js` — read cleaned workbook + carry photo fields

**Files:**
- Modify: `scripts/migrate/transform-master.js`

- [ ] **Step 1: Point the reader at the cleaned workbook**

In `scripts/migrate/transform-master.js`, change line 16:
```js
const MASTER_FILE = path.join(ROOT, 'ITEM MASTER FOR WEBSITE.xls');
```
to:
```js
const MASTER_FILE = path.join(ROOT, 'catalog.clean.xlsx');
```
And change the `source:` string (line 137) from `'ITEM MASTER FOR WEBSITE.xls'` to `'catalog.clean.xlsx'`.

- [ ] **Step 2: Capture the photo name + flags per row**

Inside the `rows.forEach((row, idx) => {` body, after the existing `const mrp = row['MRP'];` line (≈line 47), add:
```js
    const sourceImage = String(row['Source Image File'] || '').trim();
    const rowFlag = String(row['RowFlag'] || 'plain').trim() || 'plain';
```

- [ ] **Step 3: Add the fields onto each pushed variant**

In the `g.variants.push({ ... })` block (≈lines 87-94), add three fields:
```js
    g.variants.push({
      finish: fin.finish,
      sku: code,
      price: M.formatPrice(mrp),
      rawName: itemName,
      rawCollection,
      sourceImage,
      noPhoto: !sourceImage,
      rowFlag,
      image: null,                 // populated in Stage B
    });
```

- [ ] **Step 4: Run transform + verify field presence**

Run: `node scripts/migrate/transform-master.js`
Then:
```bash
node -e "const m=require('./catalog.model.json');const vs=m.groups.flatMap(g=>g.variants);console.log('variants',vs.length,'noPhoto',vs.filter(v=>v.noPhoto).length,'withSource',vs.filter(v=>v.sourceImage).length)"
```
Expected: `noPhoto` ≈ 58, `withSource` ≈ 764 (sum = total variants kept). Counts may differ slightly from row counts because finish/size grouping does not change variant count — each kept row is still one variant.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate/transform-master.js
git commit -m "feat(migrate): transform reads catalog.clean.xlsx, carries sourceImage/noPhoto/rowFlag"
```

---

## Task 3: `match-assets.js` — exact basename lookup (rewrite)

**Files:**
- Rewrite: `scripts/migrate/match-assets.js`
- Create: `test/match-normalize.test.js`

- [ ] **Step 1: Write the failing test for the basename normalizer**

`test/match-normalize.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { normalizeBasename } = require('../scripts/migrate/match-assets');

test('strips extension, lowercases, collapses whitespace', () => {
  assert.equal(normalizeBasename('25 Two Way Angle Valve ALIVA.jpg'), '25 two way angle valve aliva');
});
test('handles a bare source name (no extension)', () => {
  assert.equal(normalizeBasename('  Sink Cock CUBE PRIMA '), 'sink cock cube prima');
});
test('handles .png', () => {
  assert.equal(normalizeBasename('TWO WAY ANGLE VALVE ROSE GOLD.png'), 'two way angle valve rose gold');
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/match-normalize.test.js`
Expected: FAIL — module/export not found.

- [ ] **Step 3: Rewrite `match-assets.js`**

Replace the entire file with:
```js
'use strict';
// Stage B — Asset Integration (exact lookup).
// The client supplies the authoritative photo basename per row in column
// `Source Image File`. We index every file in the photo zip by normalized
// basename and copy the exact match into images/products/<collection>/.
// No fuzzy scoring. Variants with no source name (noPhoto) get image=null.
//
// Run:  node scripts/migrate/match-assets.js [--dry]

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const M = require('./lib-migrate');

const ROOT = path.join(__dirname, '..', '..');
const ZIP = path.join(ROOT, 'PICTURES FOR WEBSITE-20260626T155809Z-3-001.zip');
const MODEL = path.join(ROOT, 'catalog.model.json');
const REPORT = path.join(ROOT, 'reports', 'asset-match.md');
const PRODUCTS_DIR = path.join(ROOT, 'images', 'products');
const MAX_WIDTH = 1400;
const DRY = process.argv.includes('--dry');

function normalizeBasename(name) {
  return String(name || '')
    .replace(/\.(png|jpe?g)$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function listZip() {
  const out = execFileSync('unzip', ['-Z1', ZIP], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map(s => s.trim()).filter(s => /\.(png|jpe?g)$/i.test(s));
}

// Build normalized-basename -> zip entry path. First occurrence wins; collisions recorded.
function buildIndex(entries) {
  const index = new Map();
  const collisions = [];
  for (const e of entries) {
    const key = normalizeBasename(e.split('/').pop());
    if (index.has(key)) collisions.push({ key, kept: index.get(key), dropped: e });
    else index.set(key, e);
  }
  return { index, collisions };
}

async function main() {
  if (!fs.existsSync(ZIP)) { console.error(`Missing ${ZIP}`); process.exit(1); }
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));

  const entries = listZip();
  const { index, collisions } = buildIndex(entries);

  const variants = [];
  for (const g of model.groups) {
    for (const v of g.variants) {
      variants.push({ collectionSlug: g.collectionSlug, groupSlug: g.groupSlug, finish: v.finish, ref: v });
    }
  }

  const matched = [], noPhoto = [], unmatched = [];
  for (const v of variants) {
    const src = String(v.ref.sourceImage || '').trim();
    if (!src) { v.ref.noPhoto = true; v.ref.image = null; noPhoto.push(v); continue; }
    const hit = index.get(normalizeBasename(src));
    if (hit) { v.entry = hit; matched.push(v); }
    else { v.ref.noPhoto = true; v.ref.image = null; unmatched.push(v); }
  }

  let copied = 0; const copyErrors = [];
  if (!DRY) {
    const sharp = require('sharp');
    const TMP = path.join(ROOT, '.migrate-tmp');
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    execFileSync('unzip', ['-o', '-q', ZIP, '-d', TMP], { maxBuffer: 64 * 1024 * 1024 });
    for (const v of matched) {
      const ext = path.extname(v.entry).toLowerCase() === '.jpeg' ? '.jpg' : path.extname(v.entry).toLowerCase();
      const fname = `${v.groupSlug}-${M.slugify(v.finish)}${ext}`;
      const destDir = path.join(PRODUCTS_DIR, v.collectionSlug);
      fs.mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, fname);
      try {
        let pipe = sharp(path.join(TMP, v.entry)).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
        pipe = ext === '.jpg' ? pipe.jpeg({ quality: 82 }) : pipe.png({ compressionLevel: 9 });
        await pipe.toFile(dest);
        v.ref.image = fname;
        v.ref.noPhoto = false;
        copied++;
      } catch (e) { copyErrors.push(`${v.entry}: ${String(e.message).slice(0, 120)}`); }
    }
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.writeFileSync(MODEL, JSON.stringify(model, null, 2), 'utf8');
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, renderReport({ entries, variants, matched, noPhoto, unmatched, collisions, copied, copyErrors, dry: DRY }), 'utf8');

  console.log(`Stage B — match-assets${DRY ? ' (dry)' : ''}`);
  console.log(`  images=${entries.length} variants=${variants.length}`);
  console.log(`  matched=${matched.length} noPhoto=${noPhoto.length} unmatched=${unmatched.length} collisions=${collisions.length}`);
  if (!DRY) console.log(`  copied=${copied} copyErrors=${copyErrors.length}`);
  console.log(`  -> ${path.relative(ROOT, REPORT)}`);
}

function sec(title, items, fmt = x => x, lim = 200) {
  if (!items.length) return `### ${title}\n\n_None._\n\n`;
  const body = items.slice(0, lim).map(i => `- ${fmt(i)}`).join('\n');
  const more = items.length > lim ? `\n- …and ${items.length - lim} more` : '';
  return `### ${title} (${items.length})\n\n${body}${more}\n\n`;
}

function renderReport(d) {
  return `# Asset Match — Exact Lookup

_${d.dry ? 'DRY RUN — no files copied.' : 'Exact-name matches copied into images/products/<collection>/.'}_

| Metric | Value |
| --- | --- |
| Source images in zip | ${d.entries.length} |
| Catalog variants | ${d.variants.length} |
| Matched (image copied) | ${d.matched.length} |
| No-photo (blank source name) | ${d.noPhoto.length} |
| Unmatched (source name not in zip) | ${d.unmatched.length} |
| Basename collisions in zip | ${d.collisions.length} |
${d.dry ? '' : `| Copied | ${d.copied} |\n| Copy errors | ${d.copyErrors.length} |\n`}

${sec('Unmatched source names (client to correct — rendered as No Photo Available)', d.unmatched,
    v => `\`${v.ref.sourceImage}\` — ${v.ref.sku} (${v.collectionSlug}/${v.groupSlug} [${v.finish}])`)}
${sec('Basename collisions (first kept)', d.collisions, c => `\`${c.key}\` kept \`${c.kept}\`, dropped \`${c.dropped}\``)}
${d.copyErrors && d.copyErrors.length ? sec('Copy errors', d.copyErrors) : ''}`;
}

module.exports = { normalizeBasename, buildIndex };

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test test/match-normalize.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Dry-run against the real model**

Run: `node scripts/migrate/match-assets.js --dry`
Expected: `matched` + `noPhoto` + `unmatched` = total variants. Open `reports/asset-match.md`; the "Unmatched" list is the client-typo set — should be small. Record the number; this is the signal to flag back to the client, not a code bug.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate/match-assets.js test/match-normalize.test.js
git commit -m "feat(migrate): rewrite match-assets to exact basename lookup, new zip, no fuzzy"
```

---

## Task 4: Pass `noPhoto` through workbook + remove fallback chain

**Files:**
- Modify: `scripts/migrate/write-workbook.js`
- Modify: `scripts/lib/read-catalog.js`

- [ ] **Step 1: Emit a `No Photo` column from the writer**

In `scripts/migrate/write-workbook.js`, in the `productRows.push({ ... })` block (≈lines 25-43), add one field after `image:`:
```js
        image: v.image || '',                   // filename only; read-catalog prefixes the dir
        'No Photo': v.noPhoto ? 'yes' : '',
```

- [ ] **Step 2: Read `No Photo` and drop the category fallback in `read-catalog.js`**

In `scripts/lib/read-catalog.js`, in the `group.variants.push({ ... })` block (≈lines 142-149), add a field:
```js
    group.variants.push({
      finish: finishName,
      sku,
      price: String(row['price'] || '').trim(),
      imageFile: String(row['image'] || '').trim() || null,
      noPhoto: String(row['No Photo'] || '').trim().toLowerCase() === 'yes',
      alt: altText,
      swatchClass,
    });
```

- [ ] **Step 3: Replace the per-variant fallback resolution**

In `read-catalog.js`, replace the image-resolution loop (≈lines 164-170):
```js
    for (const v of group.variants) {
      const file = v.imageFile || group.primaryImage;
      v.image = file
        ? `/images/products/${group.collectionSlug}/${file}`
        : categoryFallback;
      delete v.imageFile;
    }
```
with:
```js
    for (const v of group.variants) {
      const file = v.imageFile || group.primaryImage;
      v.image = (!v.noPhoto && file)
        ? `/images/products/${group.collectionSlug}/${file}`
        : null;            // no fallback image — render shows "No Photo Available"
      delete v.imageFile;
    }
```

- [ ] **Step 4: Stop substituting the category fallback in `resolveImageExistence`**

In `read-catalog.js`, in `resolveImageExistence`, replace the missing-image substitution (≈lines 280-289):
```js
    for (const v of group.variants) {
      if (!v.image) continue;
      if (v.image.startsWith('/images/products/')) {
        const rel = v.image.replace('/images/products/', '');
        if (!existing.has(rel)) {
          missing.push(`[missing-image] ${v.sku}: ${rel} not found, using fallback`);
          v.image = categoryFallback;
        }
      }
    }
```
with:
```js
    for (const v of group.variants) {
      if (!v.image) continue;
      if (v.image.startsWith('/images/products/')) {
        const rel = v.image.replace('/images/products/', '');
        if (!existing.has(rel)) {
          missing.push(`[missing-image] ${v.sku}: ${rel} not found, rendering No Photo Available`);
          v.image = null;
        }
      }
    }
```

- [ ] **Step 5: Fix the gallery fallback to tolerate null images**

Still in `resolveImageExistence`, replace (≈lines 302-304):
```js
    if (group.gallery.length === 0) {
      group.gallery = [group.variants[0] ? group.variants[0].image : categoryFallback];
    }
```
with:
```js
    if (group.gallery.length === 0) {
      const firstImg = group.variants.find(v => v.image);
      group.gallery = firstImg ? [firstImg.image] : [];
    }
```

- [ ] **Step 6: Smoke-test that read-catalog yields nulls, not fallbacks**

Run:
```bash
node -e "const {readCatalog}=require('./scripts/lib/read-catalog');const c=readCatalog('catalog.generated.xlsx');const vs=c.productGroups.flatMap(g=>g.variants);console.log('variants',vs.length,'null-image',vs.filter(v=>!v.image).length,'cat-fallback',vs.filter(v=>v.image&&v.image.includes('/cat-')).length)"
```
Expected: `cat-fallback 0`; `null-image` ≈ 58 (the no-photo set). (Requires Task 2/3 to have regenerated the model + a workbook first; if `catalog.generated.xlsx` is stale, this is re-verified in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add scripts/migrate/write-workbook.js scripts/lib/read-catalog.js
git commit -m "feat(catalog): pass noPhoto through workbook, replace image fallback with null"
```

---

## Task 5: Render "No Photo Available" instead of `<img>`

**Files:**
- Modify: `scripts/lib/layout.js` (add helper + CSS)
- Modify: `scripts/lib/render-product.js`
- Modify: `scripts/lib/render-collection.js`
- Modify: `scripts/lib/render-search-page.js`

The contract: any place that renders a product/variant `<img>` must, when the image is null/empty, render the no-photo card instead. Detail-page finish switching (JS) must toggle a no-photo state.

- [ ] **Step 1: Add the helper + CSS to `layout.js`**

In `scripts/lib/layout.js`, export a helper. Near the other exported helpers (end of file `module.exports`), add and export:
```js
// Renders an image OR a "No Photo Available" card when src is falsy.
// `src` must already be the resolved, depth-relative path (or '' / null).
function imgOrNoPhoto(src, alt, attrs = '') {
  if (src) return `<img src="${src}" alt="${alt}" ${attrs}>`;
  return `<div class="no-photo" role="img" aria-label="No photo available"><span>No Photo<br>Available</span></div>`;
}
```
Add to the `module.exports` object: `imgOrNoPhoto`.

Then add CSS to the shared `<style>` block (inside the big CSS template string, near the `.arch.product-shot` rules ≈line 359):
```css
.no-photo { width:100%; height:100%; display:flex; align-items:center; justify-content:center;
  background: var(--cream, #f4efe7); color: var(--ink-soft, #9a8f7d);
  font-family: var(--serif, Georgia, serif); font-size: clamp(12px, 1.4vw, 16px);
  letter-spacing:.08em; text-transform:uppercase; text-align:center; line-height:1.5; }
.no-photo span { opacity:.7; }
.card-stage .no-photo, .arch .no-photo { position:absolute; inset:0; }
```

- [ ] **Step 2: Product detail — primary shot + main viewer**

In `scripts/lib/render-product.js`:

Line 8 (collapsed/intro shot):
```js
          <div class="arch product-shot"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
```
→
```js
          <div class="arch product-shot">${imgOrNoPhoto(primary.image ? rel(depth, primary.image.replace(/^\//, '')) : '', escapeHtml(primary.alt), 'loading="lazy"')}</div>
```

Lines 54-55 (main image viewer):
```js
        <div class="arch product-shot" id="imageArch">
          <img id="mainImage" src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}">
```
→
```js
        <div class="arch product-shot${primary.image ? '' : ' is-no-photo'}" id="imageArch">
          <img id="mainImage" src="${primary.image ? rel(depth, primary.image.replace(/^\//, '')) : ''}" alt="${escapeHtml(primary.alt)}"${primary.image ? '' : ' hidden'}>
          <div class="no-photo" id="noPhotoCard"${primary.image ? ' hidden' : ''}><span>No Photo<br>Available</span></div>
```
Import `imgOrNoPhoto` at the top of the file alongside the existing layout imports (find the `require('./layout')` destructure and add `imgOrNoPhoto`).

- [ ] **Step 3: Product detail — gallery thumbnails**

In `render-product.js` line 49, the gallery map already guards on `group.gallery`; since Task 4 makes gallery `[]` when no images, the thumbnail strip renders empty. Wrap each thumb to skip falsy entries (defensive):
```js
${group.gallery.filter(Boolean).map((img, i) => `          <button data-image="${rel(depth, img.replace(/^\//, ''))}" class="${i === 0 ? 'is-active' : ''}"><img src="${rel(depth, img.replace(/^\//, ''))}" alt="${escapeHtml(group.skuName)} view ${i + 1}" loading="lazy"></button>`).join('\n')}
```

- [ ] **Step 4: Product detail — finish-switch JS toggles no-photo**

In `render-product.js`, the finish-switch handlers set `mainImage.src`. Update both spots so an empty image shows the card. Replace lines ≈471-473:
```js
    setTimeout(() => { mainImage.src = v.image; mainImage.alt = v.alt; mainImage.onload = () => mainImage.classList.remove('is-fading'); }, 200);
```
and the non-animated branch nearby — wrap the assignment in a helper defined once in the page JS. Add this function into the page `<script>` (near the top of the product JS block, before the first use):
```js
function applyMainImage(src, alt) {
  var card = document.getElementById('noPhotoCard');
  var arch = document.getElementById('imageArch');
  if (!src) {
    if (mainImage) { mainImage.hidden = true; mainImage.removeAttribute('src'); }
    if (card) card.hidden = false;
    if (arch) arch.classList.add('is-no-photo');
    return;
  }
  if (card) card.hidden = true;
  if (arch) arch.classList.remove('is-no-photo');
  if (mainImage) { mainImage.hidden = false; mainImage.src = src; mainImage.alt = alt; }
}
```
Then replace each `mainImage.src = X; mainImage.alt = Y;` assignment in the finish/size switch handlers (lines ≈471-473 and ≈553-566) with `applyMainImage(X, Y);`. For the size-picker branch (line ≈553 `const img = finishImages[v.finish] || v.image || '';`), keep building `img`, then call `applyMainImage(img, v.alt);` instead of the `if (img && mainImage) { ... }` block.

- [ ] **Step 5: Collection page — showcase tiles, related tiles, hero**

In `scripts/lib/render-collection.js`:

Line 18 + line 38 (showcase/related tile product shots) — same pattern:
```js
          <div class="arch product-shot"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
```
→
```js
          <div class="arch product-shot">${imgOrNoPhoto(primary.image ? rel(depth, primary.image.replace(/^\//, '')) : '', escapeHtml(primary.alt), 'loading="lazy"')}</div>
```
Import `imgOrNoPhoto` at the top alongside the other layout imports.

Note: `showcaseGroups` (read-catalog ≈line 315) already filters to groups whose primary image is a real product image, and now excludes nulls — so showcase tiles will generally have images. The hero (`resolvedHeroImage`, line 123) and related tiles (`related.resolvedHeroImage`, line 29) still resolve to a collection image and need no change. Leave hero/related-hero as-is.

- [ ] **Step 6: Search page cards**

In `scripts/lib/render-search-page.js`, line ≈350 builds `mainImg`:
```js
    const mainImg = '<img ' + (isMulti ? 'class="is-visible"' : '') + ' src="' + esc(rootPath(it.image)) + '" alt="' + esc(it.name) + '" loading="lazy">';
```
→
```js
    const mainImg = it.image
      ? '<img ' + (isMulti ? 'class="is-visible"' : '') + ' src="' + esc(rootPath(it.image)) + '" alt="' + esc(it.name) + '" loading="lazy">'
      : '<div class="no-photo"><span>No Photo<br>Available</span></div>';
```
And the extras map (line ≈351) — filter out variant images that are falsy:
```js
    const extras = isMulti ? it.variantImages.slice(1).filter(v => v.image).map(v => '<img class="is-hidden" src="' + esc(rootPath(v.image)) + '" alt="' + esc(it.name) + ' in ' + esc(v.finish) + '" loading="lazy">').join('') : '';
```
Check how the search index supplies `it.image` (see `render-search-index.js`): ensure a no-photo product still appears in the index with an empty/falsy `image`. If `render-search-index.js` drops products without images, change it to include them with `image: ''`. (Inspect and adjust in this step.)

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/layout.js scripts/lib/render-product.js scripts/lib/render-collection.js scripts/lib/render-search-page.js scripts/lib/render-search-index.js
git commit -m "feat(render): No Photo Available card replaces image fallback across catalog views"
```

---

## Task 6: Wire the pipeline + full rebuild + QA

**Files:**
- Modify: `package.json`
- Output: regenerated `/collections/**`, `sitemap.xml`, `search-index.json`

- [ ] **Step 1: Add clean-master to the migrate scripts**

In `package.json`, prepend `clean-master` to the `migrate` and `migrate:dry` and `migrate:data` scripts:
```json
    "migrate": "node scripts/migrate/clean-master.js && node scripts/migrate/transform-master.js && node scripts/migrate/match-assets.js && node scripts/migrate/merge-sizes.js && node scripts/migrate/write-workbook.js",
    "migrate:dry": "node scripts/migrate/clean-master.js && node scripts/migrate/transform-master.js && node scripts/migrate/match-assets.js --dry && node scripts/migrate/merge-sizes.js && node scripts/migrate/write-workbook.js",
    "migrate:data": "node scripts/migrate/clean-master.js && node scripts/migrate/transform-master.js && node scripts/migrate/merge-sizes.js && node scripts/migrate/write-workbook.js",
```

- [ ] **Step 2: Clear stale generated images + pages for a clean rebuild**

```bash
rm -rf images/products/* collections/*
```
(The migrate + build steps regenerate both. `images/products/_placeholder.jpg` is no longer used; removing it is fine.)

- [ ] **Step 3: Run the full migration**

Run: `npm run migrate`
Expected stages in order: clean (`removed(red)=238 kept=822`), transform, match (`matched`+`noPhoto`+`unmatched`=variants), merge-sizes, write-workbook. No errors.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: pages render, sitemap + search-index emit, no thrown errors. Note any warnings printed.

- [ ] **Step 5: Verify no fallback images leaked into output**

```bash
grep -rl "cat-faucets\|cat-shower\|cat-kitchen\|_placeholder" collections/ ; echo "exit:$?"
```
Expected: no product-tile/detail references to category fallback or placeholder (exit 1 = no matches). Hero images using `/images/collections/` are allowed — verify any hits are hero-only, not product shots.

- [ ] **Step 6: Verify No Photo cards appear where expected**

```bash
grep -rc "no-photo" collections/ | grep -v ':0' | head
```
Expected: `no-photo` class present on the generated product/collection pages corresponding to the ~58 no-photo variants. Open one known blue-row product page in a browser and confirm the card shows "No Photo Available" and the finish picker still switches correctly.

- [ ] **Step 7: Run all tests**

Run: `node --test test/`
Expected: all tests PASS.

- [ ] **Step 8: Commit the regenerated catalog**

```bash
git add -A
git commit -m "build: regenerate catalog from cleaned master + exact photo lookup + no-photo cards"
```

---

## Self-Review Notes

- **Spec coverage:** red-removal (Task 1), blue/no-photo flag (Tasks 1-4), exact photo lookup (Task 3), no-photo cards + fallback removal (Tasks 4-5), cleaned workbook delivered separately (Task 1), finish/size grouping unchanged (transform untouched except field additions), reports (Tasks 1, 3). All covered.
- **Type consistency:** `sourceImage`/`noPhoto`/`rowFlag` defined in Task 2, consumed in Tasks 3-4; `No Photo` column written in Task 4 Step 1, read in Task 4 Step 2; `imgOrNoPhoto` defined in Task 5 Step 1, used in Steps 2/5; `applyMainImage` defined and used within Task 5 Step 4.
- **Known follow-up:** the unmatched-source-name list from Task 3 Step 5 is a client data issue (typos in `Source Image File`), surfaced in `reports/asset-match.md` — not a code defect. Report the count to the user after the dry run.

## Subagent Parallelization

After Task 2 lands (field names fixed on main thread), Tasks 1/3/5 are independent and can be dispatched in parallel; Task 4 depends on 2+3 field/column names; Task 6 is integration on the main thread. Practical order: Task 1 → Task 2 (main) → dispatch Task 3 + Task 5 in parallel → Task 4 → Task 6.
