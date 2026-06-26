'use strict';
// Stage C — Workbook writer.
// Converts catalog.model.json (Stage A + Stage B output) into the 3-sheet workbook
// that the existing build pipeline (scripts/lib/read-catalog.js) consumes.
// Emits catalog.generated.xlsx at the repo root (image paths resolve relative to it).
//
// Run: node scripts/migrate/write-workbook.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const M = require('./lib-migrate');

const ROOT = path.join(__dirname, '..', '..');
const MODEL = path.join(ROOT, 'catalog.model.json');
const OUT = path.join(ROOT, 'catalog.generated.xlsx');

function main() {
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));

  // --- Products sheet: one row per variant (SKU). Headers must match read-catalog.js. ---
  const productRows = [];
  for (const g of model.groups) {
    g.variants.forEach((v, i) => {
      productRows.push({
        Status: 'Active',
        SKU: v.sku,
        'Collection Name': g.collectionName,
        'Product Group': g.baseCode,          // stable per group; slug comes from Product Slug
        'Product Slug': g.groupSlug,
        'SKU Name': g.skuName,
        category: g.category,
        dimensions: '',                        // GrossWeight left empty per PRD
        Description: '',                        // Description left empty per PRD
        'Meta Description': '',
        'Related Product Groups': '',           // auto-derived (same-collection siblings)
        image: v.image || '',                   // filename only; read-catalog prefixes the dir
        'No Photo': v.noPhoto ? 'yes' : '',
        'Gallery Images': '',
        Finish: v.finish,
        'Image Alt Text': `${g.skuName} in ${v.finish} finish`,
        price: v.price || '',
      });
    });
  }

  // --- Collections sheet. ---
  const collectionRows = model.collections.map(c => ({
    'Collection Name': c.name,
    'Collection Slug': c.slug,
    Tagline: `${c.productCount} designs · ${c.finishCount} finish${c.finishCount === 1 ? '' : 'es'}`,
    Description: '',                            // client marketing copy lives on the hub page
    Categories: c.categories.join(', '),
    'Hero Image': '',                          // auto-resolved from first product image
    'Is Signature': c.isSignature ? 'yes' : '',
    'Related Collections': '',
    'Brochure File': '',
  }));

  // --- Finishes sheet. ---
  const finishRows = model.finishes.map(f => ({
    'Finish Name': f.name,
    'Swatch Class': f.swatchClass,
    'Sort Order': f.sortOrder,
  }));

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(productRows), 'Products');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(collectionRows), 'Collections');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(finishRows), 'Finishes');
  xlsx.writeFile(wb, OUT);

  console.log('Stage C — write-workbook');
  console.log(`  Products=${productRows.length} Collections=${collectionRows.length} Finishes=${finishRows.length}`);
  console.log(`  -> ${path.relative(ROOT, OUT)}`);
}

main();
