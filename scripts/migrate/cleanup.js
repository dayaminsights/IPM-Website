'use strict';
// Stage E — Legacy cleanup.
// Removes everything superseded by the new catalog: scraped datasets, one-off merge
// scripts, the old hand-curated workbook, and stale generated dirs/images for
// collections/products/slugs that no longer exist. Emits reports/cleanup-report.md.
//
// Run:  node scripts/migrate/cleanup.js [--dry]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MODEL = path.join(ROOT, 'catalog.model.json');
const REPORT = path.join(ROOT, 'reports', 'cleanup-report.md');
const DRY = process.argv.includes('--dry');

const removed = { scripts: [], scrapeData: [], workbook: [], collectionDirs: [], productDirs: [], imageDirs: [], imageFiles: [] };

function rm(target) {
  if (!DRY) fs.rmSync(target, { recursive: true, force: true });
}

function main() {
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
  const validColls = new Set(model.collections.map(c => c.slug));
  const validProductDirs = new Set(model.groups.map(g => `${g.collectionSlug}/${g.groupSlug}`));
  const validImages = new Map(); // slug -> Set(filename)
  for (const g of model.groups) {
    for (const v of g.variants) {
      if (!v.image) continue;
      if (!validImages.has(g.collectionSlug)) validImages.set(g.collectionSlug, new Set());
      validImages.get(g.collectionSlug).add(v.image);
    }
  }

  // 1. Legacy one-off scripts (keep build-catalog.js + scripts/lib + scripts/migrate).
  const LEGACY_SCRIPTS = [
    'apply-cross-collection-merges.js', 'find-color-variant-duplicates.js',
    'merge-opell-prima-058-into-006.js', 'merge-opell-prima-basin-mixer-variants.js',
    'merge-opell-prima-batch-2.js', 'merge-opell-prima-full-rescrape.js',
    'merge-opell-prima-variants.js', 'populate-from-scrape.js', 'scrape-reference-site.js',
  ];
  for (const f of LEGACY_SCRIPTS) {
    const p = path.join(ROOT, 'scripts', f);
    if (fs.existsSync(p)) { removed.scripts.push(`scripts/${f}`); rm(p); }
  }

  // 2. Scraped dataset.
  const scrapeDir = path.join(ROOT, 'scripts', 'scrape-output');
  if (fs.existsSync(scrapeDir)) {
    for (const f of fs.readdirSync(scrapeDir)) removed.scrapeData.push(`scripts/scrape-output/${f}`);
    rm(scrapeDir);
  }

  // 3. Superseded hand-curated workbook.
  const oldWb = path.join(ROOT, 'product catalogue.xlsx');
  if (fs.existsSync(oldWb)) { removed.workbook.push('product catalogue.xlsx'); rm(oldWb); }

  // 4. Stale generated collection/product dirs.
  const collectionsRoot = path.join(ROOT, 'collections');
  if (fs.existsSync(collectionsRoot)) {
    for (const coll of fs.readdirSync(collectionsRoot, { withFileTypes: true })) {
      if (!coll.isDirectory()) continue;
      const collDir = path.join(collectionsRoot, coll.name);
      if (!validColls.has(coll.name)) { removed.collectionDirs.push(`collections/${coll.name}`); rm(collDir); continue; }
      for (const prod of fs.readdirSync(collDir, { withFileTypes: true })) {
        if (!prod.isDirectory()) continue;
        if (!validProductDirs.has(`${coll.name}/${prod.name}`)) {
          removed.productDirs.push(`collections/${coll.name}/${prod.name}`);
          rm(path.join(collDir, prod.name));
        }
      }
    }
  }

  // 5. Stale product image dirs + files.
  const productsRoot = path.join(ROOT, 'images', 'products');
  if (fs.existsSync(productsRoot)) {
    for (const entry of fs.readdirSync(productsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;             // keep _placeholder.jpg etc.
      const slug = entry.name;
      const dir = path.join(productsRoot, slug);
      if (!validColls.has(slug)) { removed.imageDirs.push(`images/products/${slug}`); rm(dir); continue; }
      const keep = validImages.get(slug) || new Set();
      for (const file of fs.readdirSync(dir)) {
        if (!keep.has(file)) { removed.imageFiles.push(`images/products/${slug}/${file}`); rm(path.join(dir, file)); }
      }
    }
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, renderReport(model), 'utf8');

  const total = Object.values(removed).reduce((n, a) => n + a.length, 0);
  console.log(`Stage E — cleanup${DRY ? ' (dry)' : ''}`);
  console.log(`  scripts=${removed.scripts.length} scrapeData=${removed.scrapeData.length} workbook=${removed.workbook.length}`);
  console.log(`  collectionDirs=${removed.collectionDirs.length} productDirs=${removed.productDirs.length} imageDirs=${removed.imageDirs.length} imageFiles=${removed.imageFiles.length}`);
  console.log(`  total ${total} item(s) ${DRY ? 'WOULD BE removed' : 'removed'} -> ${path.relative(ROOT, REPORT)}`);
}

function sec(title, items, lim = 80) {
  if (!items.length) return `### ${title}\n\n_None._\n\n`;
  const body = items.slice(0, lim).map(i => `- \`${i}\``).join('\n');
  const more = items.length > lim ? `\n- …and ${items.length - lim} more` : '';
  return `### ${title} (${items.length})\n\n${body}${more}\n\n`;
}

function renderReport(model) {
  const total = Object.values(removed).reduce((n, a) => n + a.length, 0);
  return `# Cleanup Report — Legacy Removal

_${DRY ? 'DRY RUN — nothing deleted.' : 'Removed.'} ${total} item(s). Catalog now sourced solely from ITEM MASTER FOR WEBSITE.xls._

## Summary

| Category | Count |
| --- | --- |
| Legacy scripts | ${removed.scripts.length} |
| Scraped data files | ${removed.scrapeData.length} |
| Old workbook | ${removed.workbook.length} |
| Stale collection dirs | ${removed.collectionDirs.length} |
| Stale product dirs | ${removed.productDirs.length} |
| Stale image dirs | ${removed.imageDirs.length} |
| Stale image files | ${removed.imageFiles.length} |

${sec('Legacy scripts (scrape + one-off merges)', removed.scripts)}
${sec('Scraped datasets', removed.scrapeData)}
${sec('Superseded workbook', removed.workbook)}
${sec('Stale collection directories (dropped collections)', removed.collectionDirs)}
${sec('Stale product directories (old slugs)', removed.productDirs)}
${sec('Stale image directories', removed.imageDirs)}
${sec('Stale image files (old build output)', removed.imageFiles)}
`;
}

main();
