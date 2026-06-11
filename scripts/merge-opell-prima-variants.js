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
  const filteredRows = rows.filter(row => {
    const pg = row['Product Group'];
    // Finish-merge absorbed rows: pg was already rewritten to the survivor slug above,
    // so they no longer match their original "absorbed" key — keep them.
    // Gallery-merge absorbed rows: pg still equals the absorbed slug — drop them.
    return !GALLERY_MERGES.some(m => m.absorbed === pg);
  });

  // Re-sort so that for each Product Group, the survivor's original row comes
  // first (it carries the authoritative SKU Name/category/Description/etc. —
  // readProducts() uses "first row wins" for these fields), followed by the
  // absorbed/relabeled variant rows in their existing relative order. The
  // overall relative order of distinct Product Group blocks, as they first
  // appear in the (filtered) sheet, is preserved.
  //
  // The survivor's original row is identified by its SKU: the survivor slug
  // (e.g. "opell-prima-015") is the lowercased form of that row's original
  // SKU (e.g. "OPELL-PRIMA-015").
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
  const remainingOpellGroups = new Set(
    finalRows.filter(r => r['Collection Name'] === 'Opell Prima').map(r => r['Product Group'])
  );
  console.log(`Opell Prima groups remaining: ${remainingOpellGroups.size}`);
}

main();
