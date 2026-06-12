// Scraper: pull product names + main image URLs from ipmbathfittings.com
// for all 13 collections. Run with: node scripts/scrape-reference-site.js [collection ...]
// With no args, scrapes all collections in REFERENCE_CATEGORY_SLUG.
// Output: scripts/scrape-output/<collection>-products.json

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'scrape-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const REFERENCE_CATEGORY_SLUG = {
  aliva: 'aliva-collection',
  flora: 'flora',
  'opell-prima': 'opell-prima',
  cube: 'cube-collection',
  'cube-prima': 'cube-prima',
  fuzone: 'fuzone',
  jp: 'jp',
  premium: 'premium',
  'para-collection': 'para-collection',
  allied: 'allied-collection',
  'zenith-collections': 'zenith-collections',
  'square-brass-accessories': 'square-brass-accessories',
  'round-brass-accessories': 'round-accessories',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Fetch all listing pages for a category (page 1, 2, 3... until a non-OK response)
async function fetchAllListingPages(refSlug) {
  const pages = [];
  for (let page = 1; page <= 15; page++) {
    const url = page === 1
      ? `https://ipmbathfittings.com/product-category/${refSlug}/`
      : `https://ipmbathfittings.com/product-category/${refSlug}/page/${page}/`;
    try {
      const html = await fetchHtml(url);
      pages.push(html);
    } catch (e) {
      break; // 404 or other error -> no more pages
    }
    await sleep(500);
  }
  return pages;
}

function extractProductUrls(html) {
  const re = /<a href="(https:\/\/ipmbathfittings\.com\/product\/[^"]+)"/g;
  const urls = new Set();
  let m;
  while ((m = re.exec(html))) urls.add(m[1]);
  return [...urls];
}

function extractProductInfo(html) {
  const titleMatch = html.match(/<h1[^>]*class="product_title[^>]*>([^<]*)<\/h1>/);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const galleryMatch = html.match(/woocommerce-product-gallery__image"[^>]*>\s*<a[^>]*>\s*<img[^>]*data-large_image="([^"]+)"/);
  const image = galleryMatch ? galleryMatch[1] : null;

  return { title, image };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const targets = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(REFERENCE_CATEGORY_SLUG);

  for (const collection of targets) {
    const refSlug = REFERENCE_CATEGORY_SLUG[collection];
    if (!refSlug) {
      console.log(`Unknown collection "${collection}", skipping`);
      continue;
    }
    console.log(`\n=== ${collection} (ref: ${refSlug}) ===`);

    const listingPages = await fetchAllListingPages(refSlug);
    const productUrls = new Set();
    for (const html of listingPages) {
      for (const u of extractProductUrls(html)) productUrls.add(u);
    }
    console.log(`Found ${productUrls.size} product URLs across ${listingPages.length} page(s)`);

    if (productUrls.size === 0) {
      fs.writeFileSync(path.join(OUT_DIR, `${collection}-products.json`), '[]\n', 'utf8');
      continue;
    }

    const results = [];
    for (const url of productUrls) {
      try {
        const html = await fetchHtml(url);
        const info = extractProductInfo(html);
        results.push({ url, ...info });
        console.log(`  ${info.title || '(no title)'} -> ${info.image || '(no image)'}`);
      } catch (e) {
        console.log(`  ERROR ${url}: ${e.message}`);
        results.push({ url, title: null, image: null, error: e.message });
      }
      await sleep(400);
    }

    fs.writeFileSync(
      path.join(OUT_DIR, `${collection}-products.json`),
      JSON.stringify(results, null, 2),
      'utf8'
    );
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
