'use strict';
// Removes white/near-white backgrounds from product images using flood-fill
// from image corners. Saves as PNG with transparency.
// Run: node scripts/migrate/remove-white-bg.js [--dry] [--dir images/products/aliva]
//
// Safe for chrome/metallic products: only corner-reachable white pixels
// are removed, so white highlights on the product itself are preserved.

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT    = path.join(__dirname, '..', '..');
const PROD_DIR = path.join(ROOT, 'images', 'products');
const DRY     = process.argv.includes('--dry');
// Allow targeting a specific subdirectory for testing
const dirIdx  = process.argv.indexOf('--dir');
const TARGET  = process.argv.find(a => a.startsWith('--dir='))?.slice(6)
              || (dirIdx !== -1 ? process.argv[dirIdx + 1] : null);

const THRESHOLD = 238; // pixels >= this on all channels are considered background
const TOLERANCE = 28;  // flood-fill: adjacent pixel within this range of seed colour

async function processImage(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const px = (x, y) => (y * width + x) * 4;
  const buf = Buffer.from(data);

  // Sample background colour from top-left corner (most reliable)
  const seedR = buf[px(0, 0)], seedG = buf[px(0, 0) + 1], seedB = buf[px(0, 0) + 2];
  // If the corner isn't white-ish, image probably has no white bg — skip
  if (seedR < THRESHOLD || seedG < THRESHOLD || seedB < THRESHOLD) return false;

  // Flood fill from all four edges (not just corners) so enclosed background
  // pockets between product parts are also reachable.
  const visited = new Uint8Array(width * height);
  const queue   = [];
  const seed = (x, y) => {
    const idx = y * width + x;
    if (!visited[idx]) { visited[idx] = 1; queue.push([x, y]); }
  };
  for (let x = 0; x < width; x++)  { seed(x, 0); seed(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { seed(0, y); seed(width - 1, y); }

  function isBackground(x, y) {
    const i = px(x, y);
    const r = buf[i], g = buf[i+1], b = buf[i+2];
    return Math.abs(r - seedR) <= TOLERANCE
        && Math.abs(g - seedG) <= TOLERANCE
        && Math.abs(b - seedB) <= TOLERANCE
        && r >= THRESHOLD - TOLERANCE && g >= THRESHOLD - TOLERANCE && b >= THRESHOLD - TOLERANCE;
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    if (!isBackground(x, y)) continue;
    buf[px(x, y) + 3] = 0; // transparent
    const neighbours = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (!visited[ni]) { visited[ni] = 1; queue.push([nx, ny]); }
    }
  }

  // Fringe erosion: remove near-white pixels stranded at the transparent border
  // (anti-aliased edge pixels that the fill couldn't reach through dark neighbours).
  // Safe for chrome highlights — those are interior to the product, surrounded
  // by opaque non-white pixels, so they'll never have 2+ transparent neighbours.
  const FRINGE_THRESHOLD = THRESHOLD - 15; // 223 — slightly looser than main threshold
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = px(x, y);
        if (buf[i + 3] === 0) continue;
        if (buf[i] < FRINGE_THRESHOLD || buf[i+1] < FRINGE_THRESHOLD || buf[i+2] < FRINGE_THRESHOLD) continue;
        let transparentNeighbours = 0;
        for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) { transparentNeighbours++; continue; }
          if (buf[px(nx, ny) + 3] === 0) transparentNeighbours++;
        }
        if (transparentNeighbours >= 2) { buf[i + 3] = 0; changed = true; }
      }
    }
    if (!changed) break;
  }

  // Save as PNG (preserves transparency)
  const outPath = filePath.replace(/\.(jpe?g|jpg|png)$/i, '.png');
  if (!DRY) {
    await sharp(buf, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath + '.tmp');
    fs.renameSync(outPath + '.tmp', outPath);
    // Remove original jpg if saved as png under different name
    if (outPath !== filePath) fs.unlinkSync(filePath);
  }
  return outPath;
}

async function main() {
  const searchDir = TARGET ? path.resolve(ROOT, TARGET) : PROD_DIR;
  const exts = /\.(png|jpe?g|jpg)$/i;

  function walk(dir) {
    const entries = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) entries.push(...walk(full));
      else if (exts.test(e.name) && e.name !== '_placeholder.jpg') entries.push(full);
    }
    return entries;
  }

  const files = walk(searchDir);
  let processed = 0, skipped = 0, errors = 0;
  const renames = []; // [oldBasename, newBasename] pairs for model patching

  for (const f of files) {
    try {
      const out = await processImage(f);
      if (out) {
        processed++;
        if (!DRY) {
          console.log('  ✓', path.relative(ROOT, f));
          if (out !== f) renames.push([path.basename(f), path.basename(out)]);
        }
      } else skipped++;
    } catch (e) {
      errors++;
      console.error('  ERR', path.relative(ROOT, f), e.message.slice(0, 80));
    }
  }

  console.log(`\nDone${DRY ? ' (dry)' : ''}: ${processed} processed, ${skipped} skipped (no white bg), ${errors} errors`);

  // Patch catalog.model.json: replace renamed .jpg → .png image references
  if (!DRY && renames.length) {
    const modelPath = path.join(ROOT, 'catalog.model.json');
    if (fs.existsSync(modelPath)) {
      let modelText = fs.readFileSync(modelPath, 'utf8');
      for (const [from, to] of renames) modelText = modelText.split(from).join(to);
      fs.writeFileSync(modelPath, modelText, 'utf8');
      console.log('Patched catalog.model.json with', renames.length, 'filename changes.');
      // Regenerate workbook so build picks up new filenames
      require('./write-workbook');
      console.log('Regenerated catalog.generated.xlsx.');
    }
  }
  console.log('Run npm run build to regenerate pages with updated image paths.');
}

main().catch(e => { console.error(e); process.exit(1); });
