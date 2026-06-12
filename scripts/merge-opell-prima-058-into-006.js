// One-off: merge OPELL-PRIMA-058 (same wall-mounted basin mixer assembly,
// Chrome finish) into the opell-prima-006 group (already merged from
// 006/007/008/009 — Matt Black Gold / White Gold / Beige Gold / White), and
// make the Chrome variant the DEFAULT/first-displayed finish on the product
// page, per user request ("start with this colour on the product page").
//
// Mechanics: 058's row is relabeled to Product Group "opell-prima-006" with
// Finish "Chrome", then placed FIRST within the group's row block. Since
// readProducts() uses "first row wins" for group-level fields (SKU Name,
// category, etc.), the group-level metadata (title/h1/breadcrumb/Enquire
// link) is moved from the old 006 row onto the relabeled 058 row so the
// page's identity is preserved, while 058's own image/SKU/alt become the
// default-displayed variant (first in the finish picker, is-active on load).
//
// Run with: node scripts/merge-opell-prima-058-into-006.js

const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

const SURVIVOR_GROUP = 'opell-prima-006';
const ABSORBED_SKU = 'OPELL-PRIMA-058';
const ABSORBED_FINISH = 'Chrome';

function main() {
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets['Products'];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  const columns = Object.keys(rows[0]);

  const absorbedRow = rows.find(r => String(r['SKU']).trim() === ABSORBED_SKU);
  if (!absorbedRow) throw new Error(`Absorbed row "${ABSORBED_SKU}" not found`);

  const groupRows = rows.filter(r => r['Product Group'] === SURVIVOR_GROUP);
  if (groupRows.length === 0) throw new Error(`Survivor group "${SURVIVOR_GROUP}" not found`);

  // Current first row of the survivor group carries the group-level metadata.
  const currentFirst = groupRows[0];

  // Move group-level metadata fields onto the absorbed row, which becomes
  // the new first row (and therefore the default-displayed variant).
  const groupLevelFields = [
    'SKU Name', 'category', 'dimensions', 'Description', 'Gallery Images',
    'Related Product Groups', 'Meta Description', 'Product Slug',
  ];
  for (const field of groupLevelFields) {
    absorbedRow[field] = currentFirst[field];
    currentFirst[field] = '';
  }

  // Relabel the absorbed row into the survivor group with its own Finish.
  absorbedRow['Product Group'] = SURVIVOR_GROUP;
  absorbedRow['Finish'] = ABSORBED_FINISH;

  // Re-sort: place absorbedRow first within the survivor group's block,
  // followed by the existing group rows (now without group-level metadata
  // on the old first row), preserving overall group order elsewhere.
  const groupOrder = [];
  const groupedRows = new Map();
  for (const row of rows) {
    if (row === absorbedRow) continue; // re-inserted below
    const pg = row['Product Group'];
    if (!groupedRows.has(pg)) {
      groupedRows.set(pg, []);
      groupOrder.push(pg);
    }
    groupedRows.get(pg).push(row);
  }

  const finalRows = [];
  for (const pg of groupOrder) {
    const rowsForGroup = groupedRows.get(pg);
    if (pg === SURVIVOR_GROUP) {
      finalRows.push(absorbedRow, ...rowsForGroup);
    } else {
      finalRows.push(...rowsForGroup);
    }
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
