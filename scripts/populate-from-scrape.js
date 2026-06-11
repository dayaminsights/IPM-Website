// One-off: turn scrape-output/<collection>-products.json into new Products-sheet rows,
// download images into images/products/<collection>/, and append to product catalogue.xlsx.
// Run with: node scripts/populate-from-scrape.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..');
const SCRAPE_DIR = path.join(__dirname, 'scrape-output');
const XLSX_PATH = path.join(ROOT, 'product catalogue.xlsx');

const COLLECTION_NAMES = {
  aliva: 'Aliva',
  flora: 'Flora',
  'opell-prima': 'Opell Prima',
  cube: 'Cube',
  'cube-prima': 'Cube Prima',
  fuzone: 'Fuzone',
  jp: 'JP',
  premium: 'Premium',
  'para-collection': 'Para Collection',
  allied: 'Allied',
  'zenith-collections': 'Zenith Collections',
  'square-brass-accessories': 'Square Brass Accessories',
  'round-brass-accessories': 'Round Brass Accessories',
};

// Existing Product Group numbers already used per collection (avoid collisions)
const EXISTING_GROUP_NUMBERS = {
  aliva: Array.from({ length: 28 }, (_, i) => i + 1),  // aliva-001..028 already populated
  flora: Array.from({ length: 32 }, (_, i) => i + 1),  // flora-001..032 already populated
};

const CATEGORY_RULES = [
  { re: /shower/i, category: 'Showers' },
  { re: /mixer|cock|valve|spout|diverter|swan neck|nozzle|flush|table top|long body/i, category: 'Faucets' },
  { re: /holder|hook|tray|dispenser|ring|rail|rod|bracket|tumbler|soap dish|robe|towel|paper/i, category: 'Accessories' },
];

function inferCategory(name) {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(name)) return rule.category;
  }
  return 'Accessories';
}

// Convert a raw scraped title into a presentable product name.
// Aliva titles are mostly clean (just inconsistent casing).
// Flora titles are slugs (e.g. "single-lever-basin-mixer1") -> need de-sluggification.
function cleanName(rawTitle) {
  let s = rawTitle.trim();

  // If it looks like a slug (contains hyphens, no spaces, mostly lowercase)
  if (/-/.test(s) && !/\s/.test(s)) {
    s = s
      .replace(/-(flora|aliva)$/i, '') // drop trailing collection-name suffix
      .replace(/-?\d+$/, '')           // drop trailing version numbers e.g. "-1-1", "1"
      .replace(/-?\d+$/, '')           // run twice for "-1-1" style
      .replace(/[-_]+/g, ' ')
      .trim();
  }

  // Title-case every word, but keep short connector words lowercase (except first word)
  const lower = new Set(['in', 'with', 'and', 'of', 'for', 'to']);
  const words = s.split(/\s+/).filter(Boolean);
  const titled = words.map((w, i) => {
    const lw = w.toLowerCase();
    if (i > 0 && lower.has(lw)) return lw;
    // Keep acronym-like all-caps words (e.g. "S", "L") as-is if already uppercase and short
    if (/^[A-Z]{1,3}$/.test(w)) return w;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  });

  let result = titled.join(' ');
  // Fix known source-site typos
  result = result.replace(/\bBalve\b/g, 'Valve');
  return result;
}

function nextGroupNumber(usedNumbers, startAt) {
  let n = startAt;
  while (usedNumbers.has(n)) n++;
  usedNumbers.add(n);
  return n;
}

function imageExtFromUrl(url) {
  const m = url.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const collections = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(COLLECTION_NAMES);
  const newRows = [];
  const report = [];

  for (const collection of collections) {
    const collectionName = COLLECTION_NAMES[collection];
    if (!collectionName) {
      report.push(`SKIP collection "${collection}": not in COLLECTION_NAMES`);
      continue;
    }

    const jsonPath = path.join(SCRAPE_DIR, `${collection}-products.json`);
    let products;
    try {
      products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      report.push(`SKIP collection "${collection}": cannot read ${jsonPath} (${e.message})`);
      continue;
    }
    if (products.length === 0) {
      report.push(`${collection}: 0 products scraped, nothing to add`);
      continue;
    }

    // Dedupe by cleaned title — reference site lists some products multiple
    // times with different finish-variant photos; keep the first occurrence.
    const seenNames = new Set();
    const dedupedProducts = [];
    for (const product of products) {
      if (!product.title) {
        dedupedProducts.push(product); // let the existing no-title SKIP handle it
        continue;
      }
      const cleaned = cleanName(product.title);
      if (seenNames.has(cleaned)) continue;
      seenNames.add(cleaned);
      dedupedProducts.push(product);
    }

    const usedNumbers = new Set(EXISTING_GROUP_NUMBERS[collection] || []);
    let nextN = 1;

    const imgDir = path.join(ROOT, 'images', 'products', collection);
    fs.mkdirSync(imgDir, { recursive: true });

    for (const product of dedupedProducts) {
      if (!product.title) {
        report.push(`SKIP (no title): ${product.url}`);
        continue;
      }

      const name = cleanName(product.title);
      const category = inferCategory(name);

      nextN = nextGroupNumber(usedNumbers, nextN);
      const groupNum = String(nextN).padStart(3, '0');
      const groupSlug = `${collection}-${groupNum}`;
      const sku = `${collection.toUpperCase()}-${groupNum}`;

      let imageFile = '';
      if (product.image) {
        try {
          const ext = imageExtFromUrl(product.image);
          imageFile = `${groupSlug}-main.${ext}`;
          const destPath = path.join(imgDir, imageFile);
          const bytes = await downloadImage(product.image, destPath);
          report.push(`OK   ${groupSlug}: "${name}" (${category}) <- ${product.image} (${bytes} bytes)`);
        } catch (e) {
          imageFile = '';
          report.push(`IMG-FAIL ${groupSlug}: "${name}" <- ${product.image} (${e.message})`);
        }
        await sleep(200);
      } else {
        report.push(`NO-IMAGE ${groupSlug}: "${name}"`);
      }

      newRows.push({
        'Collection Name': collectionName,
        'Product Group': groupSlug,
        'SKU': sku,
        'SKU Name': name,
        'category': category,
        'Finish': '',
        'dimensions': '',
        'Description': '',
        'image': imageFile,
        'Gallery Images': '',
        'Image Alt Text': '',
        'price': '',
        'Related Product Groups': '',
        'Status': '',
        'Meta Description': '',
        'Product Slug': '',
        '_sourceUrl': product.url, // not written to xlsx, for the report only
      });
    }
  }

  // --- Write xlsx ---
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets['Products'];
  const existingRows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  const columns = Object.keys(existingRows[0]);

  const rowsForSheet = newRows.map(r => {
    const out = {};
    for (const col of columns) out[col] = r[col] !== undefined ? r[col] : '';
    return out;
  });

  const allRows = existingRows.concat(rowsForSheet);
  const newWs = xlsx.utils.json_to_sheet(allRows, { header: columns });
  wb.Sheets['Products'] = newWs;

  xlsx.writeFile(wb, XLSX_PATH);

  // --- Report ---
  const reportPath = path.join(SCRAPE_DIR, 'population-report.txt');
  fs.writeFileSync(reportPath, report.join('\n') + '\n', 'utf8');

  console.log(`Added ${newRows.length} new product rows to "Products" sheet.`);
  console.log(`Report written to ${reportPath}`);
  console.log('\n' + report.join('\n'));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
