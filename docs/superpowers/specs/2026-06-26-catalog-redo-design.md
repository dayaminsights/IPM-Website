# Catalog Redo — Design Spec

_2026-06-26_

## Goal

Rebuild the entire generated catalog from the client's updated source files:

- **`ITEM MASTER FOR WEBSITE.xlsx`** — single sheet `Item Master + Images`, 1060 data rows. Each row carries an authoritative photo-name mapping in column `Source Image File`, and a **row font color** that encodes editorial intent:
  - **Red font** (`FFFF0000`) → remove this item from the website completely (238 rows).
  - **Blue font** (`FF00B0F0`) → if no photo name is present, show "No Photo Available" rather than any fallback image (48 rows).
  - Plain (black) → normal item (774 rows).
- **`PICTURES FOR WEBSITE-20260626T155809Z-3-001.zip`** — 761 product photos, organized into folders by finish/collection, mix of `.jpg` and `.png`.

The existing variant model — clubbing **finishes** and **sizes** into grouped products — is preserved unchanged. What changes: (1) rows are filtered/flagged by color, (2) image association switches from fuzzy name-matching to **exact** lookup of the client-supplied photo name, (3) missing photos render a "No Photo Available" card instead of a fallback image.

## Source File Facts (verified)

- Sheet name: `Item Master + Images`. Header row 1; data rows 2–1061.
- Columns: `ReferenceNo*`, `Item Name`, `ItemCode*`, `Collection Name`, `Category`, `MRP`, `DESCRIPTION`, `GrossWeight`, `Image Status`, `Source Image File`, `Site Image File`, `Match Score`, `Match Confidence`.
- **`Source Image File`** = authoritative photo basename (no extension), e.g. `25 Two Way Angle Valve ALIVA` → matches zip file `PICTURES FOR WEBSITE/ALIVA FOR WEBSITE/25 Two Way Angle Valve ALIVA.jpg`. Match is by **basename across all folders**; extension may be `.jpg` or `.png`.
- `Site Image File`, `Match Score`, `Match Confidence`, `Image Status` are artifacts of the previous fuzzy run — **ignored** in this redo.
- Colors are **font colors**, not cell fills. Style map (from `xl/styles.xml`):
  - Red font → `cellXfs` indices `{3,4,5,9,11,17,18}`.
  - Blue font → `cellXfs` indices `{13,14,15,16}`.
  - (Yellow fill exists on header/some cells; irrelevant to row intent.)
- SheetJS (`xlsx@0.18.5`, the installed lib) does not reliably expose per-cell font color, so color reading is done by parsing the unzipped `xl/worksheets/sheet1.xml` + `xl/styles.xml` directly.

## Row Tally (verified)

| Bucket | Count |
| --- | --- |
| Red (remove) | 238 |
| Blue (no-photo flag) | 48 — all 48 have blank `Source Image File` |
| Plain | 774 — 764 have a photo, 10 blank |
| **Kept after clean** | **822** |
| Kept with photo | 764 |
| Kept "No Photo Available" | 58 (48 blue + 10 plain blank) |

## Decisions

1. **No-photo scope:** The image fallback chain (category image → `_placeholder.jpg`) is **removed site-wide**. ANY kept variant whose group resolves to no image renders a "No Photo Available" card. (Not limited to blue rows.)
2. **Cleaned file delivery:** A **new** workbook `catalog.clean.xlsx` is written; the original `ITEM MASTER FOR WEBSITE.xlsx` is left untouched.
3. **Color-read method:** Direct XML parse (no new dependency). The xf→font-color map above is validated against the file.
4. **Image association:** Exact basename lookup of `Source Image File` against the zip. No fuzzy scoring, no typo-normalization heuristics. Unmatched names are reported for client correction, and that variant is treated as no-photo.

## Architecture

Five stages. Data contract between stages is `catalog.model.json` (extended with two new per-variant fields).

### Stage 0 — `scripts/migrate/clean-master.js` (NEW)

- Unzip `ITEM MASTER FOR WEBSITE.xlsx` in memory (or to a temp dir); parse `sheet1.xml` + `styles.xml` + `sharedStrings.xml`.
- For each data row, determine font color from the `s=` (style index) of its cells → `RED` / `BLUE` / `PLAIN`.
  - Detection rule: a row is RED if any of its cells use a red xf index; BLUE if any cell uses a blue xf index (and not red); else PLAIN.
- Drop all RED rows.
- For remaining rows, attach a `RowFlag` column value: `blue` or `plain`.
- Emit **`catalog.clean.xlsx`** (same columns + `RowFlag`, red rows removed) via the existing `xlsx` writer.
- Emit `reports/clean-report.md`: counts, list of removed (red) ItemCodes, list of blue ItemCodes, any rows whose color could not be classified.

**Interface:** reads `ITEM MASTER FOR WEBSITE.xlsx`; writes `catalog.clean.xlsx` + `reports/clean-report.md`. No dependency on other stages.

### Stage A — `scripts/migrate/transform-master.js` (MODIFIED)

- Change `MASTER_FILE` to read **`catalog.clean.xlsx`**.
- Unchanged grouping logic (`baseCode`, `resolveFinish`, `canonicalCollection`, `mapCategory`, finish + size clubbing).
- Per variant, add:
  - `sourceImage`: trimmed value of `Source Image File` (or `''`).
  - `noPhoto`: `true` when `sourceImage` is empty (covers all blue + the 10 plain blanks).
  - `rowFlag`: `blue` | `plain` (passthrough from clean stage, for reporting only).
- Output unchanged shape `catalog.model.json` plus those fields.

### Stage B — `scripts/migrate/match-assets.js` (REWRITTEN)

- Build an index: for every file in the extracted `PICTURES FOR WEBSITE/` tree, key = `basename without extension`, lowercased and whitespace-collapsed → file path. On duplicate basenames across folders, keep first and record a collision warning.
- For each variant:
  - `noPhoto === true` → leave `variant.image = null`; skip.
  - else exact-match `normalize(sourceImage)` against the index.
    - hit → copy file to `images/products/<collectionSlug>/<sku>.<ext>`, set `variant.image` to the site-relative path.
    - miss → `variant.image = null`, mark as unmatched (treated as no-photo downstream), add to report.
- `normalize` here is **whitespace/case only** — NOT the old finish/collection-stripping `normalizeName`. The client name must match the file name as given.
- Reports → `reports/asset-match.md`: matched count, unmatched `Source Image File` values (with ItemCode), basename collisions.
- `--dry` flag: report matches, copy nothing.

### Stage C — `merge-sizes.js` + `write-workbook.js` (UNCHANGED)

- Run as-is. `write-workbook.js` emits `catalog.generated.xlsx`. The `noPhoto` flag must survive into the generated workbook so the build can read it (add a column if the writer/reader don't already pass unknown fields through).

### Stage D — Build: `build-catalog.js` + `scripts/lib/*` (MODIFIED)

- **Remove** the fallback chain `variant → group primary → category image → _placeholder.jpg`. New chain: `variant image → group primary image → null`.
- `read-catalog.js`: read the `noPhoto` / image-null state per variant/group.
- `layout.js`: add a `.no-photo` card style + a small helper that renders the "No Photo Available" block (used wherever an `<img>` would go).
- `render-product.js` / `render-collection.js`: when the resolved image is null, render the no-photo card instead of `<img>`. Finish picker still works; a finish with no image shows the no-photo card in the main viewer.
- `render-search-index.js` / `render-sitemap.js`: products are still listed (no-photo products are not hidden); image field is empty/null for them.

## Data Contract (`catalog.model.json` per-variant)

```
variant = {
  finish, sku, price, rawName, rawCollection,
  sourceImage,   // NEW: client photo basename, or ''
  noPhoto,       // NEW: true when no photo should be shown
  image,         // path (Stage B) or null
}
```

`noPhoto` is set in Stage A (blank source) and may also become effectively true in Stage B (unmatched name → image null). The build treats "image is null" as the no-photo trigger; `noPhoto` is the explicit, reportable signal.

## Error Handling

- **Unclassifiable row color** → keep the row as PLAIN, log in clean-report. Never silently drop a non-red row.
- **Unmatched photo name** → no-photo card + report entry; never crash, never substitute a different image.
- **Basename collision in zip** → first wins, warn in report.
- **Missing input files** → fail fast with a clear message naming the missing path.

## Testing / Verification

- `clean-master.js`: assert removed count = 238, kept = 822, blue = 48; spot-check 3 known red ItemCodes are absent and 3 blue are present-with-flag.
- `match-assets.js --dry`: matched + no-photo must sum to 822; print unmatched list for client review (target: unmatched small; each is a client-side typo, not a code bug).
- Build: grep generated pages — no reference to `_placeholder.jpg` or `cat-*.jpg` fallback; "No Photo Available" appears on exactly the no-photo products.
- Final: `npm run build` clean; sitemap + search-index regenerate without error.

## Out of Scope

- Hand-authored pages (`index.html`, `about.html`, `contact.html`, `collections.html`).
- Finish/size grouping rules (kept identical).
- Background removal (`remove-white-bg.js`) — separate optional step, unchanged.

## Subagent Decomposition

Shared contract above lets three agents work in parallel after Stage A's field names are fixed:

- **Agent 1 — clean stage:** build `clean-master.js` + clean-report.
- **Agent 2 — image lookup:** rewrite `match-assets.js` to exact lookup + asset-match report.
- **Agent 3 — render layer:** no-photo card in `layout.js` + `render-product.js` + `render-collection.js`; remove fallback chain in `build-catalog.js` / `read-catalog.js`.

`transform-master.js` field additions (small) are done first on the main thread so all three agents code against the same field names. Wiring (`package.json` script order: clean → transform → match → merge → write) and final `npm run build` are integration steps on the main thread.
