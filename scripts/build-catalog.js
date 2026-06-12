const fs = require('fs');
const path = require('path');
const { readCatalog } = require('./lib/read-catalog');
const { renderCollectionPage } = require('./lib/render-collection');
const { renderProductPage } = require('./lib/render-product');
const { renderSitemap, renderRobots } = require('./lib/render-sitemap');

// Placeholder value — update to the live domain once available (e.g. GoDaddy domain).
const SITE_BASE_URL = 'https://ipmbathfittings.github.io';

const ROOT = path.join(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'product catalogue.xlsx');

function writeFile(outPath, content) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
}

function main() {
  const result = readCatalog(CATALOG_FILE);
  const { collections, productGroups, warnings, errors, missingImages } = result;

  if (errors.length) {
    console.error('Build failed with errors:');
    errors.forEach(e => console.error(`  ERROR: ${e}`));
    process.exit(1);
  }

  if (warnings.length) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  WARN: ${w}`));
  }

  let collectionPages = 0;
  let productPages = 0;

  for (const collection of collections) {
    const groupsInCollection = productGroups.filter(g => g.collectionSlug === collection.slug);
    if (groupsInCollection.length === 0) continue; // skip empty collections for this phase

    const html = renderCollectionPage(collection, productGroups, collections, { siteBaseUrl: SITE_BASE_URL });
    const outPath = path.join(ROOT, 'collections', collection.slug, 'index.html');
    writeFile(outPath, html);
    collectionPages++;

    for (const group of groupsInCollection) {
      const productHtml = renderProductPage(group, collection, { siteBaseUrl: SITE_BASE_URL });
      const productOutPath = path.join(ROOT, 'collections', group.collectionSlug, group.groupSlug, 'index.html');
      writeFile(productOutPath, productHtml);
      productPages++;
    }
  }

  // Sitemap + robots.txt (only for collections/products actually generated)
  const generatedCollections = collections.filter(c => productGroups.some(g => g.collectionSlug === c.slug));
  const sitemap = renderSitemap(generatedCollections, productGroups, SITE_BASE_URL);
  writeFile(path.join(ROOT, 'sitemap.xml'), sitemap);

  const robotsPath = path.join(ROOT, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    writeFile(robotsPath, renderRobots(SITE_BASE_URL));
  }

  if (missingImages.length) {
    console.log('\nMissing images (using fallbacks):');
    missingImages.forEach(m => console.log(`  ${m}`));
  }

  console.log(`\nGenerated ${collectionPages} collection page(s), ${productPages} product page(s). ${missingImages.length} missing image(s) (see above).`);
}

main();
