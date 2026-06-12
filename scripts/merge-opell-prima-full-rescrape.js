// One-off: full Opell Prima re-scrape merge pass (Phase 3 of
// docs/superpowers/specs/2026-06-13-opell-prima-full-rescrape-design.md).
//
// After Phase 2 wiped + re-populated Opell Prima from the 183-item re-scrape
// (74 fresh groups, opell-prima-001..074, all blank Finish), this script:
//  1. Drops 2 true-duplicate rows (022, 047, 048) that are redundant photos
//     of the same item/finish as another row already in the set.
//  2. Merges color/finish variants of the same physical product into single
//     groups via the established FINISH_MERGES / SURVIVOR_RENAMES pattern.
//
// Run with: node scripts/merge-opell-prima-full-rescrape.js

const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

// True-duplicate rows: near-identical photos of the same item+finish as
// another row in the set, carrying no unique info. Dropped entirely.
//  - opell-prima-022: 2nd Rich Gold photo of the same diverter-body rough-in
//    valve as opell-prima-021 (Rich Gold).
//  - opell-prima-047, opell-prima-048: 2nd/3rd Chrome photos of the same
//    "Tall Mixer Shape B" body as opell-prima-040 (Chrome).
const DROP_GROUPS = ['opell-prima-022', 'opell-prima-047', 'opell-prima-048'];

const FINISH_MERGES = [
  // Aliva/Alive Shower Head (leaf/eye-shaped tile, no visible arm), 4 finishes
  { survivor: 'opell-prima-003', absorbed: 'opell-prima-004', finish: 'Profile White Gold' },
  { survivor: 'opell-prima-003', absorbed: 'opell-prima-012', finish: 'Profile Beige Gold' },
  { survivor: 'opell-prima-003', absorbed: 'opell-prima-033', finish: 'Matt Beige' },

  // Square-tile shower head (sharp 90deg corners, distinct from Aliva leaf tile), 3 finishes
  { survivor: 'opell-prima-027', absorbed: 'opell-prima-013', finish: 'Profile Beige Gold' },
  { survivor: 'opell-prima-027', absorbed: 'opell-prima-074', finish: 'Profile White Gold' },

  // Basin Mixer Wall Mounted Upper Parts, 4 finishes
  { survivor: 'opell-prima-006', absorbed: 'opell-prima-007', finish: 'Matt White Gold' },
  { survivor: 'opell-prima-006', absorbed: 'opell-prima-008', finish: 'Matt Beige Gold' },
  { survivor: 'opell-prima-006', absorbed: 'opell-prima-009', finish: 'Matt White' },

  // Diverter Upper Parts (round wall-plate diverter), 3 finishes
  { survivor: 'opell-prima-024', absorbed: 'opell-prima-025', finish: 'Rich Gold' },
  { survivor: 'opell-prima-024', absorbed: 'opell-prima-026', finish: 'Chrome' },

  // Diverter Body (T-shaped rough-in valve body), 3 finishes (022 dropped as duplicate)
  { survivor: 'opell-prima-020', absorbed: 'opell-prima-021', finish: 'Rich Gold' },
  { survivor: 'opell-prima-020', absorbed: 'opell-prima-023', finish: 'Matt Beige Gold' },

  // Hand Shower, 3 finishes
  { survivor: 'opell-prima-028', absorbed: 'opell-prima-029', finish: 'Matt Black' },
  { survivor: 'opell-prima-028', absorbed: 'opell-prima-030', finish: 'Rich Gold' },

  // Shower Arm, 2 finishes
  { survivor: 'opell-prima-042', absorbed: 'opell-prima-043', finish: 'Matt Black Gold' },

  // Tall Single Lever Basin Mixer (flat-oval lever, smooth angular spout), 6 finishes
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-039', finish: 'Rose Gold' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-049', finish: 'Matt White' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-050', finish: 'Matt Beige Gold' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-059', finish: 'Profile White Gold' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-060', finish: 'Rich Gold' },

  // Wall Mount Basin Mixer Upper Parts (distinct body from 006-009 cluster), 2 finishes
  { survivor: 'opell-prima-069', absorbed: 'opell-prima-070', finish: 'Matt Beige' },

  // Waste Coupling, 3 finishes
  { survivor: 'opell-prima-071', absorbed: 'opell-prima-072', finish: 'Matt Beige Gold' },
  { survivor: 'opell-prima-071', absorbed: 'opell-prima-073', finish: 'Matt White' },

  // Bottle Trap, 4 finishes
  { survivor: 'opell-prima-011', absorbed: 'opell-prima-014', finish: 'Matt Black' },
  { survivor: 'opell-prima-011', absorbed: 'opell-prima-015', finish: 'Matt White' },
  { survivor: 'opell-prima-011', absorbed: 'opell-prima-016', finish: 'Matt Beige' },
];

// Survivor SKU Name / Finish renames: use the most descriptive scraped name
// for each merged group, with the survivor's own Finish set to match its photo.
const SURVIVOR_RENAMES = [
  { group: 'opell-prima-003', skuName: 'Aliva Shower Head', finish: 'Chrome' },
  { group: 'opell-prima-027', skuName: 'Square Shower Head', finish: 'Rich Gold' },
  { group: 'opell-prima-006', skuName: 'Basin Mixer Wall Mounted Upper Parts', finish: 'Matt Black Gold' },
  { group: 'opell-prima-024', skuName: 'Diverter Upper Parts', finish: 'Matt Black' },
  { group: 'opell-prima-020', skuName: 'Diverter Body', finish: 'Rose Gold' },
  { group: 'opell-prima-028', skuName: 'Hand Shower', finish: 'Rose Gold' },
  { group: 'opell-prima-042', skuName: 'Shower Arm', finish: 'Rich Gold' },
  { group: 'opell-prima-038', skuName: 'Single Lever Basin Mixer Tall', finish: 'Matt Beige' },
  { group: 'opell-prima-069', skuName: 'Wall Mount Basin Mixer Upper Parts', finish: 'Rich Gold' },
  { group: 'opell-prima-071', skuName: 'Waste Coupling', finish: 'Rich Gold' },
  { group: 'opell-prima-011', skuName: 'Bottle Trap', finish: 'Rich Gold' },
];

function main() {
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets['Products'];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  const columns = Object.keys(rows[0]);

  // Drop true-duplicate rows entirely.
  const dropSet = new Set(DROP_GROUPS);
  let rowsAfterDrop = rows.filter(r => !dropSet.has(r['Product Group']));

  const byGroup = new Map();
  for (const row of rowsAfterDrop) {
    const pg = row['Product Group'];
    if (!byGroup.has(pg)) byGroup.set(pg, []);
    byGroup.get(pg).push(row);
  }

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

  // Re-sort so that for each Product Group, the survivor's original row comes
  // first (it carries the authoritative SKU Name/category/Description/etc. —
  // readProducts() uses "first row wins" for these fields), followed by the
  // absorbed/relabeled variant rows in their existing relative order. The
  // overall relative order of distinct Product Group blocks, as they first
  // appear in the sheet, is preserved.
  const survivorGroups = new Set(FINISH_MERGES.map(m => m.survivor));

  const groupOrder = [];
  const groupedRows = new Map();
  for (const row of rowsAfterDrop) {
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
  const remainingOpellPrimaGroups = new Set(
    finalRows.filter(r => r['Collection Name'] === 'Opell Prima').map(r => r['Product Group'])
  );
  console.log(`Opell Prima groups remaining: ${remainingOpellPrimaGroups.size}`);
  console.log(`Dropped groups: ${DROP_GROUPS.join(', ')}`);
}

main();
