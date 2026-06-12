// One-off: merge OPELL-PRIMA-006/007/008/009 — four product-group rows that
// are the same wall-mounted basin mixer upper-part assembly, photographed in
// four different finishes — into a single group with Finish variants.
// Follows the same mechanics as scripts/apply-cross-collection-merges.js.
// Run with: node scripts/merge-opell-prima-basin-mixer-variants.js

const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

// [Opell Prima] same wall-mounted basin mixer / upper-part assembly:
//   opell-prima-006 | "Basin Mixer Upper Part"               | photo: matte black body, gold trim
//   opell-prima-007 | "Basin Mixer Upper Parts"               | photo: matte white body, gold trim
//   opell-prima-008 | "Basin Mixer Wall Mounted"              | photo: matte beige body, gold trim
//   opell-prima-009 | "Basin Mixer Wall Mounted Upper Parts"  | photo: matte white body, white/gold trim
//
// opell-prima-006 (first in sheet order) is the survivor. Its own Finish is
// set to "Matt Black Gold" (matching its photo). The other three become
// additional Finish variants under opell-prima-006.
const FINISH_MERGES = [
  { survivor: 'opell-prima-006', absorbed: 'opell-prima-007', finish: 'Matt White Gold' },
  { survivor: 'opell-prima-006', absorbed: 'opell-prima-008', finish: 'Matt Beige Gold' },
  { survivor: 'opell-prima-006', absorbed: 'opell-prima-009', finish: 'Matt White' },
];

// Survivor SKU Name rename: "Basin Mixer Wall Mounted Upper Parts" is the
// most complete/descriptive of the four scraped names, so use it as the
// shared product name once additional finish variants are attached.
const SURVIVOR_RENAMES = [
  { group: 'opell-prima-006', skuName: 'Basin Mixer Wall Mounted Upper Parts', finish: 'Matt Black Gold' },
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

  const filteredRows = rows;

  // Re-sort so that for each Product Group, the survivor's original row comes
  // first (it carries the authoritative SKU Name/category/Description/etc. —
  // readProducts() uses "first row wins" for these fields), followed by the
  // absorbed/relabeled variant rows in their existing relative order. The
  // overall relative order of distinct Product Group blocks, as they first
  // appear in the (filtered) sheet, is preserved.
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
  const remainingOpellPrimaGroups = new Set(
    finalRows.filter(r => r['Collection Name'] === 'Opell Prima').map(r => r['Product Group'])
  );
  console.log(`Opell Prima groups remaining: ${remainingOpellPrimaGroups.size}`);
}

main();
