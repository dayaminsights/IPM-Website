// One-off: merge three more sets of OPELL-PRIMA color-variant duplicates
// identified by the user, into single product pages with Finish variants.
// Follows the same mechanics as scripts/merge-opell-prima-basin-mixer-variants.js.
// Run with: node scripts/merge-opell-prima-batch-2.js

const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

// [Opell Prima] Aliva Shower Head, same shape/assembly, 3 finishes:
//   opell-prima-003 | "Aliva Shower Head"  | photo: chrome
//   opell-prima-012 | "Beige Gold Alive"   | photo: beige body with gold profile edge
//   opell-prima-033 | "Matte Beige Alive"  | photo: beige body, no gold trim
//
// [Opell Prima] Single Lever High Flow Diverter, same assembly, 3 finishes:
//   opell-prima-024 | "Diverter Upper Part"                                    | photo: matt black
//   opell-prima-025 | "Diverter Upper Parts"                                    | photo: rich gold
//   opell-prima-026 | "Exposed Parts for Single Lever High Flow Diverter Body"  | photo: chrome (most descriptive name -> survivor's SKU Name)
//
// [Opell Prima] Tall Single Lever Basin Mixer, same assembly, 5 finishes:
//   opell-prima-038 | "Pillar Cock Extend"                       | photo: matt beige
//   opell-prima-039 | "Pillar Cock Extended"                      | photo: rose gold
//   opell-prima-048 | "Single Lever Basin Mixer Extended Body"    | photo: chrome
//   opell-prima-049 | "Single Lever Basin Mixer Tall"              | photo: matt white
//   opell-prima-050 | "Single Lever Basin Tall"                    | photo: matt beige gold (warmer beige)
const FINISH_MERGES = [
  { survivor: 'opell-prima-003', absorbed: 'opell-prima-012', finish: 'Profile Beige Gold' },
  { survivor: 'opell-prima-003', absorbed: 'opell-prima-033', finish: 'Matt Beige' },

  { survivor: 'opell-prima-024', absorbed: 'opell-prima-025', finish: 'Rich Gold' },
  { survivor: 'opell-prima-024', absorbed: 'opell-prima-026', finish: 'Chrome' },

  { survivor: 'opell-prima-038', absorbed: 'opell-prima-039', finish: 'Rose Gold' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-048', finish: 'Chrome' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-049', finish: 'Matt White' },
  { survivor: 'opell-prima-038', absorbed: 'opell-prima-050', finish: 'Matt Beige Gold' },
];

// Survivor SKU Name / Finish renames: use the most descriptive scraped name
// for each merged group, with the survivor's own Finish set to match its photo.
const SURVIVOR_RENAMES = [
  { group: 'opell-prima-003', skuName: 'Aliva Shower Head', finish: 'Chrome' },
  { group: 'opell-prima-024', skuName: 'Exposed Parts for Single Lever High Flow Diverter Body', finish: 'Matt Black' },
  { group: 'opell-prima-038', skuName: 'Single Lever Basin Mixer Tall', finish: 'Matt Beige' },
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
