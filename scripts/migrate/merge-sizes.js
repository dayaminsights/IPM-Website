'use strict';
// Stage A2 — Size-sibling merging.
// Runs AFTER match-assets.js (Stage B) so images are already populated.
// Detects groups whose skuName differs only by a trailing size spec
// (e.g. "Exposed Parts For Diverter 35mm" vs "40mm" vs "45mm") and
// collapses them into one merged group with a sizes[] array.
// The merged group shares images across sizes for each finish.
//
// Run: node scripts/migrate/merge-sizes.js

'use strict';
const fs   = require('fs');
const path = require('path');
const M    = require('./lib-migrate');

const ROOT  = path.join(__dirname, '..', '..');
const MODEL = path.join(ROOT, 'catalog.model.json');

function extractSizeSpec(name) {
  const m = name.match(/\s+(\d+(?:\s*mm|\s*x\s*\d+|\/\d+|"\s*|inch))\s*$/i);
  if (!m) return null;
  return { size: m[1].replace(/\s+/g, '').toLowerCase(), base: name.slice(0, m.index).trim() };
}
function sizeNum(s) {
  const mm   = s.match(/^(\d+(?:\.\d+)?)mm$/);         if (mm)   return +mm[1];
  const fr   = s.match(/^(\d+)\/(\d+)"?$/);             if (fr)   return +fr[1] / +fr[2];
  const dim  = s.match(/^(\d+)x/);                      if (dim)  return +dim[1];
  const inch = s.match(/^(\d+(?:\.\d+)?)"?(?:inch)?$/); if (inch) return +inch[1];
  return 999;
}

function assignImagesFromDisk(model) {
  // If variants don't have images yet (fresh transform run), look up files on disk.
  // Filename pattern: images/products/{collectionSlug}/{groupSlug}-{finishSlug}.{ext}
  const productsDir = path.join(ROOT, 'images', 'products');
  if (!fs.existsSync(productsDir)) return;

  // Pre-scan all existing image files per collection
  const diskFiles = new Map(); // collectionSlug → Set(filename)
  for (const entry of fs.readdirSync(productsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const files = new Set(fs.readdirSync(path.join(productsDir, entry.name)));
    diskFiles.set(entry.name, files);
  }

  let assigned = 0;
  for (const g of model.groups) {
    const files = diskFiles.get(g.collectionSlug);
    if (!files) continue;
    for (const v of g.variants) {
      if (v.image) continue;
      const finSlug = M.slugify(v.finish);
      // Try exact pattern: {groupSlug}-{finishSlug}.{ext}
      for (const ext of ['png', 'jpg', 'jpeg']) {
        const fname = `${g.groupSlug}-${finSlug}.${ext}`;
        if (files.has(fname)) { v.image = fname; assigned++; break; }
      }
    }
  }
  if (assigned) console.log(`  Assigned ${assigned} images from disk.`);
}

function main() {
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
  // Populate images from disk if not already present (avoids re-running match-assets.js)
  if (!model.groups.some(g => g.variants.some(v => v.image))) {
    assignImagesFromDisk(model);
  }
  const groups = model.groups;

  // Track slug namespace per collection to avoid collisions
  const slugSeen = new Map();
  groups.forEach(g => {
    const used = slugSeen.get(g.collectionSlug) || new Map();
    used.set(g.groupSlug, true);
    slugSeen.set(g.collectionSlug, used);
  });

  // Group size-siblings by (collection, baseName)
  const sizeMap = new Map();
  for (const g of groups) {
    if (g.isSizeGroup) continue; // already merged
    const spec = extractSizeSpec(g.skuName);
    if (!spec) continue;
    const key = `${g.collectionSlug}::${spec.base}`;
    (sizeMap.get(key) || sizeMap.set(key, []).get(key)).push({ spec, g });
  }

  const removeSet = new Set();
  const toAdd     = [];
  let mergedCount = 0;

  for (const [, entries] of sizeMap) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => sizeNum(a.spec.size) - sizeNum(b.spec.size));

    const primary      = entries[0].g;
    const baseName     = entries[0].spec.base;
    const collectionSlug = primary.collectionSlug;

    // Per-finish best image: scan all sizes, first non-null image wins.
    // Since same finish = same look regardless of size, any size's image works.
    const finishBest = new Map(); // finish → best {image, sku, price, swatchClass}
    for (const { g } of entries) {
      for (const v of g.variants) {
        if (!finishBest.has(v.finish)) finishBest.set(v.finish, { ...v });
        else if (!finishBest.get(v.finish).image && v.image) {
          const b = finishBest.get(v.finish);
          b.image = v.image; b.sku = v.sku; b.price = v.price;
        }
      }
    }

    // Enrich each size's variants with shared images where missing
    const sizes = entries.map(({ spec, g }) => ({
      label: spec.size,
      slug:  g.groupSlug,
      variants: g.variants.map(v => ({
        finish:      v.finish,
        sku:         v.sku,
        price:       v.price,
        image:       v.image || finishBest.get(v.finish)?.image || null,
        swatchClass: v.swatchClass || M.finishSwatch(v.finish),
        alt:         v.alt || `${baseName} in ${v.finish}`,
      })),
    }));

    // Master variant list for the workbook: union of all finishes, best image per finish
    const allFinishes = [...new Set(entries.flatMap(({ g }) => g.variants.map(v => v.finish)))];
    allFinishes.sort((a, b) => M.finishSort(a) - M.finishSort(b));
    const mergedVariants = allFinishes.map(finish => {
      const best = finishBest.get(finish) || {};
      return {
        finish,
        sku:         best.sku  || '',
        price:       best.price || '',
        image:       best.image || null,
        swatchClass: M.finishSwatch(finish),
        rawName:     baseName,
        rawCollection: primary.collectionName,
        alt:         `${baseName} in ${finish}`,
      };
    });

    // Merged slug = slugify(baseName), deduped
    let mergedSlug = M.slugify(baseName);
    const used = slugSeen.get(collectionSlug) || new Map();
    if (used.has(mergedSlug)) mergedSlug = `${mergedSlug}-group`;
    used.set(mergedSlug, true);
    slugSeen.set(collectionSlug, used);

    entries.forEach(({ g }) => removeSet.add(`${g.collectionSlug}::${g.groupSlug}`));

    toAdd.push({
      collectionName: primary.collectionName,
      collectionSlug,
      baseCode:  primary.baseCode,
      skuName:   baseName,
      category:  primary.category,
      groupSlug: mergedSlug,
      isSizeGroup: true,
      sizes,
      variants: mergedVariants,
    });
    mergedCount++;
  }

  const finalGroups = [
    ...groups.filter(g => !removeSet.has(`${g.collectionSlug}::${g.groupSlug}`)),
    ...toAdd,
  ];

  model.groups = finalGroups;
  model.counts.products   = finalGroups.length;
  model.counts.variants   = finalGroups.reduce((n, g) => n + g.variants.length, 0);
  model.counts.sizeGroups = mergedCount;

  fs.writeFileSync(MODEL, JSON.stringify(model, null, 2), 'utf8');
  const removed = removeSet.size;
  console.log(`Stage A2 — merge-sizes`);
  console.log(`  merged ${mergedCount} size groups (${removed} individual pages → ${mergedCount} combined)`);
  console.log(`  products: ${groups.length} → ${finalGroups.length} (saved ${groups.length - finalGroups.length} pages)`);
}

main();
