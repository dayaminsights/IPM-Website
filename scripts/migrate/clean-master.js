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
