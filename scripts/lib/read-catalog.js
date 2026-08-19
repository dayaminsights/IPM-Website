const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { slugify } = require('./slugify');

const KNOWN_CATEGORIES = ['Faucets', 'Kitchen Mixers', 'Shower', 'Accessories', 'Sanitaryware'];
const PLACEHOLDER_IMAGE = '/images/products/_placeholder.jpg';

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,|]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function readFinishes(workbook, warnings) {
  const rows = sheetToRows(workbook, 'Finishes');
  const finishMap = new Map();
  rows.forEach((row, i) => {
    const name = String(row['Finish Name'] || '').trim();
    if (!name) return;
    const swatchClass = String(row['Swatch Class'] || '').trim() || 'f-unspecified';
    const sortOrder = Number(row['Sort Order']) || (i + 1);
    finishMap.set(name, { name, swatchClass, sortOrder });
  });
  return finishMap;
}

function checkAndWarn(group, row, field, label, warnings) {
  const incoming = String(row[label] || '').trim();
  const current = String(group[field] || '').trim();
  if (incoming && incoming !== current) {
    warnings.push(
      `Product Group "${group.groupSlug}": "${label}" differs across rows ` +
      `(using "${current}" from primary variant; row SKU ${row.SKU} has "${incoming}")`
    );
  }
}

function readProducts(workbook, finishMap, warnings, errors) {
  const rows = sheetToRows(workbook, 'Products');
  const groups = new Map(); // key: collectionSlug::groupSlug

  for (const row of rows) {
    const status = String(row['Status'] || 'Active').trim() || 'Active';
    if (status === 'Draft') continue;

    const sku = String(row['SKU'] || '').trim();
    const collectionName = String(row['Collection Name'] || '').trim();
    const productGroupRaw = String(row['Product Group'] || '').trim();

    if (!sku) {
      errors.push('A row is missing SKU — skipping');
      continue;
    }
    if (!productGroupRaw) {
      errors.push(`Row with SKU ${sku} is missing Product Group`);
      continue;
    }
    if (!collectionName) {
      errors.push(`Row with SKU ${sku} is missing Collection Name`);
      continue;
    }

    const productSlugRaw = String(row['Product Slug'] || '').trim();
    const groupSlug = slugify(productSlugRaw || productGroupRaw);
    const collectionSlug = slugify(collectionName);
    const key = `${collectionSlug}::${groupSlug}`;

    if (!groups.has(key)) {
      groups.set(key, {
        groupSlug,
        collectionSlug,
        collectionName,
        skuName: String(row['SKU Name'] || '').trim(),
        category: String(row['category'] || '').trim(),
        dimensions: String(row['dimensions'] || '').trim(),
        description: String(row['Description'] || '').trim(),
        status,
        metaDescription: String(row['Meta Description'] || '').trim(),
        relatedGroups: parseList(row['Related Product Groups']).map(slugify),
        primaryImage: String(row['image'] || '').trim(),
        galleryImages: parseList(row['Gallery Images']),
        variants: [],
      });
    }

    const group = groups.get(key);

    // Cross-row consistency checks (warn, first-row wins)
    checkAndWarn(group, row, 'skuName', 'SKU Name', warnings);
    checkAndWarn(group, row, 'category', 'category', warnings);
    checkAndWarn(group, row, 'dimensions', 'dimensions', warnings);
    checkAndWarn(group, row, 'description', 'Description', warnings);
    checkAndWarn(group, row, 'status', 'Status', warnings);

    // ERROR: a Product Group must not span multiple collections
    if (collectionSlug !== group.collectionSlug) {
      errors.push(
        `Product Group "${productGroupRaw}" spans multiple collections ` +
        `(${group.collectionName} vs ${collectionName}) — SKU ${sku}`
      );
      continue;
    }

    // Validate category
    let category = String(row['category'] || group.category || '').trim();
    if (!KNOWN_CATEGORIES.includes(category)) {
      warnings.push(`SKU ${sku}: unknown category "${category}", falling back to "Accessories"`);
      category = 'Accessories';
      if (group.variants.length === 0) group.category = category;
    }

    const finishName = String(row['Finish'] || '').trim();
    let swatchClass = 'f-unspecified';
    if (finishName) {
      const finish = finishMap.get(finishName);
      if (finish) {
        swatchClass = finish.swatchClass;
      } else {
        warnings.push(`SKU ${sku}: Finish "${finishName}" not found in Finishes sheet, using fallback swatch`);
      }
    } else {
      warnings.push(`SKU ${sku}: missing Finish value`);
    }

    const altText = String(row['Image Alt Text'] || '').trim() ||
      `${group.skuName || productGroupRaw} in ${finishName || 'standard'} finish`;

    group.variants.push({
      finish: finishName,
      sku,
      price: String(row['price'] || '').trim(),
      imageFile: String(row['image'] || '').trim() || null,
      noPhoto: String(row['No Photo'] || '').trim().toLowerCase() === 'yes',
      alt: altText,
      swatchClass,
    });
  }

  // Post-pass: image fallback resolution + warnings about unmatched finishes / single-variant groups
  for (const group of groups.values()) {
    const known = group.variants.filter(v => v.swatchClass !== 'f-unspecified');
    if (known.length === 0) {
      warnings.push(`Product Group "${group.groupSlug}": no Finish values matched the Finishes lookup sheet`);
    }
    if (group.variants.length === 1) {
      // Informational only — valid single-variant group
    }

    for (const v of group.variants) {
      const file = v.imageFile || group.primaryImage;
      v.image = (!v.noPhoto && file)
        ? `/images/products/${group.collectionSlug}/${file}`
        : null;            // no fallback image — render shows "No Photo Available"
      delete v.imageFile;
    }

    // Resolve gallery images (primary variant only)
    group.gallery = group.galleryImages.length
      ? group.galleryImages.map(f => `/images/products/${group.collectionSlug}/${f}`)
      : [];
  }

  // ERROR: duplicate group slug within the same collection (Map key already prevents true dupes,
  // but guard against case where Product Slug and Product Group resolve to the same key from
  // different rows that *should* have been distinct groups — Map collapses these silently above,
  // so instead we detect here by checking groupSlug uniqueness per collectionSlug explicitly)
  const seen = new Map();
  for (const group of groups.values()) {
    const dupKey = `${group.collectionSlug}::${group.groupSlug}`;
    if (seen.has(dupKey)) {
      errors.push(`Duplicate Product Group slug "${group.groupSlug}" in collection "${group.collectionName}"`);
    }
    seen.set(dupKey, true);
  }

  return Array.from(groups.values());
}

function readCollections(workbook, productGroups, warnings) {
  const rows = sheetToRows(workbook, 'Collections');
  const collections = [];
  const byName = new Map();

  for (const row of rows) {
    const name = String(row['Collection Name'] || '').trim();
    if (!name) continue;
    const slug = slugify(String(row['Collection Slug'] || '').trim() || name);
    const categories = parseList(row['Categories']);
    const collection = {
      name,
      slug,
      tagline: String(row['Tagline'] || '').trim(),
      description: String(row['Description'] || '').trim(),
      heroImage: String(row['Hero Image'] || '').trim(),
      categories,
      isSignature: String(row['Is Signature'] || '').trim().toLowerCase() === 'yes',
      relatedCollections: parseList(row['Related Collections']),
      brochureFile: String(row['Brochure File'] || '').trim(),
    };
    collections.push(collection);
    byName.set(name, collection);
  }

  // Auto-derive categories from products if blank
  for (const collection of collections) {
    if (collection.categories.length === 0) {
      const cats = new Set();
      for (const group of productGroups) {
        if (group.collectionName === collection.name && group.category) {
          cats.add(group.category);
        }
      }
      collection.categories = Array.from(cats);
    }
  }

  // Auto-fill related collections if blank
  for (const collection of collections) {
    if (collection.relatedCollections.length === 0) {
      collection.relatedCollections = collections
        .filter(c => c.name !== collection.name)
        .slice(0, 3)
        .map(c => c.name);
    }
  }

  // Validate product->collection references
  const collectionNames = new Set(collections.map(c => c.name));
  for (const group of productGroups) {
    if (!collectionNames.has(group.collectionName)) {
      warnings.push(`Product Group "${group.groupSlug}": Collection Name "${group.collectionName}" not found in Collections sheet`);
    }
  }

  return collections;
}

function resolveImageExistence(productGroups, collections, baseDir) {
  // Pre-scan images/products/** once
  const productsDir = path.join(baseDir, 'images', 'products');
  const existing = new Set();
  function walk(dir, prefix) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else existing.add(rel);
    }
  }
  walk(productsDir, '');

  const collectionsDir = path.join(baseDir, 'images', 'collections');
  const existingCollections = new Set();
  if (fs.existsSync(collectionsDir)) {
    for (const entry of fs.readdirSync(collectionsDir, { withFileTypes: true })) {
      if (entry.isFile()) existingCollections.add(entry.name);
    }
  }

  const missing = [];

  for (const group of productGroups) {
    for (const v of group.variants) {
      if (!v.image) continue;
      if (v.image.startsWith('/images/products/')) {
        const rel = v.image.replace('/images/products/', '');
        if (!existing.has(rel)) {
          missing.push(`[missing-image] ${v.sku}: ${rel} not found, rendering No Photo Available`);
          v.image = null;
        }
      }
    }

    group.gallery = (group.gallery || []).filter(img => {
      if (img.startsWith('/images/products/')) {
        const rel = img.replace('/images/products/', '');
        if (!existing.has(rel)) {
          missing.push(`[missing-image] ${group.groupSlug}: gallery image ${rel} not found, skipping`);
          return false;
        }
      }
      return true;
    });

    if (group.gallery.length === 0) {
      const firstImg = group.variants.find(v => v.image);
      group.gallery = firstImg ? [firstImg.image] : [];
    }
  }

  for (const collection of collections) {
    if (collection.heroImage && !existingCollections.has(collection.heroImage)) {
      missing.push(`[missing-image] collection "${collection.slug}": hero image ${collection.heroImage} not found, using fallback`);
      collection.heroImage = '';
    }

    // Find this collection's product groups with a real (non-category-fallback) image
    const collectionGroups = productGroups.filter(g => g.collectionSlug === collection.slug);
    const groupsWithRealImages = collectionGroups.filter(g =>
      g.variants[0] && g.variants[0].image && !g.variants[0].image.startsWith('/images/collections/cat-')
    );
    collection.showcaseGroups = groupsWithRealImages;

    if (!collection.heroImage) {
      if (groupsWithRealImages.length > 0) {
        collection.resolvedHeroImage = groupsWithRealImages[0].variants[0].image;
      } else {
        const primaryCategory = collection.categories[0];
        collection.resolvedHeroImage = primaryCategory
          ? `/images/collections/cat-${primaryCategory.toLowerCase()}.jpg`
          : '/images/collections/hero.jpg';
      }
    } else {
      collection.resolvedHeroImage = `/images/collections/${collection.heroImage}`;
    }
  }

  return missing;
}

function resolveRelatedGroups(productGroups, warnings) {
  const bySlugCollection = new Map();
  for (const group of productGroups) {
    bySlugCollection.set(`${group.collectionSlug}::${group.groupSlug}`, group);
  }
  const allBySlug = new Map();
  for (const group of productGroups) {
    if (!allBySlug.has(group.groupSlug)) allBySlug.set(group.groupSlug, []);
    allBySlug.get(group.groupSlug).push(group);
  }

  for (const group of productGroups) {
    if (group.relatedGroups.length === 0) {
      group.related = productGroups
        .filter(g => g.collectionName === group.collectionName && g.groupSlug !== group.groupSlug)
        .slice(0, 4);
      continue;
    }
    const resolved = [];
    for (const refSlug of group.relatedGroups) {
      const candidates = allBySlug.get(refSlug);
      if (!candidates || candidates.length === 0) {
        warnings.push(`Product Group "${group.groupSlug}": Related Product Group "${refSlug}" does not resolve to any group`);
        continue;
      }
      resolved.push(candidates[0]);
    }
    group.related = resolved;
  }
}

function readCatalog(filePath) {
  const baseDir = path.dirname(filePath);
  const workbook = xlsx.readFile(filePath);
  const warnings = [];
  const errors = [];

  const finishMap = readFinishes(workbook, warnings);
  const finishes = Array.from(finishMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);

  const productGroups = readProducts(workbook, finishMap, warnings, errors);
  const collections = readCollections(workbook, productGroups, warnings);

  resolveRelatedGroups(productGroups, warnings);
  const missingImages = resolveImageExistence(productGroups, collections, baseDir);

  return {
    collections,
    productGroups,
    finishes,
    warnings,
    errors,
    missingImages,
  };
}

module.exports = {
  readCatalog,
  parseList,
  KNOWN_CATEGORIES,
  PLACEHOLDER_IMAGE,
};
