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
