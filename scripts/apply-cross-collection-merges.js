// One-off: merge cross-collection color-variant duplicate product groups
// (found by scripts/find-color-variant-duplicates.js) into single groups
// with multiple Finish variants, following the same mechanics as
// scripts/merge-opell-prima-variants.js (Task 1).
// Run with: node scripts/apply-cross-collection-merges.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

// Finish-variant merges: absorbed group's row becomes a new variant row
// under the surviving group's Product Group slug, with the given Finish.
//
// [Zenith Collections] base="single lever basin mixer":
//   zenith-collections-001 | "Single Lever Basin Mixer Chrome"     | stripped color: chrome
//   zenith-collections-002 | "Single Lever Basin Mixer Matt Beige" | stripped color: matt beige
//   zenith-collections-003 | "Single Lever Basin Mixer Matt Black" | stripped color: matt black
//
// All three items had a color word stripped (none is `color: null`), so per
// the plan's guidance we pick the "default"/primary finish as the survivor.
// Chrome is the standard/default finish for bath fittings (and is the
// catalog-wide fallback finish), so zenith-collections-001 (Chrome) is the
// survivor; the Matt Beige and Matt Black rows become additional Finish
// variants under it.
const FINISH_MERGES = [
  { survivor: 'zenith-collections-001', absorbed: 'zenith-collections-002', finish: 'Matt Beige' },
  { survivor: 'zenith-collections-001', absorbed: 'zenith-collections-003', finish: 'Matt Black' },
];

// Survivor SKU Name renames: once a survivor row gains additional Finish
// variants, its own SKU Name should no longer single out one finish (e.g.
// "Single Lever Basin Mixer Chrome" would be misleading once Matt Beige and
// Matt Black variants are also present). Rename to the shared base name
// (the same "base" the analysis script computed by stripping the color word).
//
// Also set the survivor's own Finish to the color word that was stripped
// from its original SKU Name ("Chrome" — a valid Finishes-sheet entry), so
// the finish-picker's first variant gets a real swatch/label instead of
// "f-unspecified" with a blank label.
const SURVIVOR_RENAMES = [
  { group: 'zenith-collections-001', skuName: 'Single Lever Basin Mixer', finish: 'Chrome' },
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
  }

  // No gallery merges in this pass.
  const filteredRows = rows;

  // Re-sort so that for each Product Group, the survivor's original row comes
  // first (it carries the authoritative SKU Name/category/Description/etc. —
  // readProducts() uses "first row wins" for these fields), followed by the
  // absorbed/relabeled variant rows in their existing relative order. The
  // overall relative order of distinct Product Group blocks, as they first
  // appear in the (filtered) sheet, is preserved.
  //
  // The survivor's original row is identified by its SKU: the survivor slug
  // (e.g. "zenith-collections-001") is the lowercased form of that row's
  // original SKU (e.g. "ZENITH-COLLECTIONS-001").
  const survivorGroups = new Set(FINISH_MERGES.map(m => m.survivor));

  const groupOrder = [];
  const groupedRows = new Map();
  for (const row of filteredRows) {
    const pg = row['Product Group'];
    if (!groupedRows.has(pg)) {
      groupedRows.set(pg, []);
      groupOrder.push(pg);
    }
    groupedRows.get(pg).push(row);
  }

  const renameMap = new Map(SURVIVOR_RENAMES.map(r => [r.group, r]));

  const finalRows = [];
  for (const pg of groupOrder) {
    const groupRows = groupedRows.get(pg);
    if (survivorGroups.has(pg) && groupRows.length > 1) {
      const survivorIdx = groupRows.findIndex(
        r => String(r['SKU'] || '').trim().toLowerCase() === pg
      );
      if (survivorIdx > 0) {
        const [survivorRow] = groupRows.splice(survivorIdx, 1);
        groupRows.unshift(survivorRow);
      }
    }
    if (renameMap.has(pg)) {
      const { skuName, finish } = renameMap.get(pg);
      groupRows[0]['SKU Name'] = skuName;
      groupRows[0]['Finish'] = finish;
    }
    finalRows.push(...groupRows);
  }

  const rowsForSheet = finalRows.map(r => {
    const out = {};
    for (const col of columns) out[col] = r[col] !== undefined ? r[col] : '';
    return out;
  });

  const newWs = xlsx.utils.json_to_sheet(rowsForSheet, { header: columns });
  wb.Sheets['Products'] = newWs;
  xlsx.writeFile(wb, XLSX_PATH);

  console.log(`Rows before: ${rows.length}, after: ${finalRows.length}`);
  const remainingZenithGroups = new Set(
    finalRows.filter(r => r['Collection Name'] === 'Zenith Collections').map(r => r['Product Group'])
  );
  console.log(`Zenith Collections groups remaining: ${remainingZenithGroups.size}`);
}

main();
