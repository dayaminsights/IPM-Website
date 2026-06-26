'use strict';
// Stage B — Asset Integration (exact lookup).
// The client supplies the authoritative photo basename per row in column
// `Source Image File`. We index every file in the photo zip by normalized
// basename and copy the exact match into images/products/<collection>/.
// No fuzzy scoring. Variants with no source name (noPhoto) get image=null.
//
// Run:  node scripts/migrate/match-assets.js [--dry]

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const M = require('./lib-migrate');

const ROOT = path.join(__dirname, '..', '..');
const ZIP = path.join(ROOT, 'PICTURES FOR WEBSITE-20260626T155809Z-3-001.zip');
const MODEL = path.join(ROOT, 'catalog.model.json');
const REPORT = path.join(ROOT, 'reports', 'asset-match.md');
const PRODUCTS_DIR = path.join(ROOT, 'images', 'products');
const MAX_WIDTH = 1400;
const DRY = process.argv.includes('--dry');

function normalizeBasename(name) {
  return String(name || '')
    .replace(/\.(png|jpe?g)$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function listZip() {
  const out = execFileSync('unzip', ['-Z1', ZIP], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map(s => s.trim()).filter(s => /\.(png|jpe?g)$/i.test(s));
}

// Build normalized-basename -> zip entry path. First occurrence wins; collisions recorded.
function buildIndex(entries) {
  const index = new Map();
  const collisions = [];
  for (const e of entries) {
    const key = normalizeBasename(e.split('/').pop());
    if (index.has(key)) collisions.push({ key, kept: index.get(key), dropped: e });
    else index.set(key, e);
  }
  return { index, collisions };
}

async function main() {
  if (!fs.existsSync(ZIP)) { console.error(`Missing ${ZIP}`); process.exit(1); }
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));

  const entries = listZip();
  const { index, collisions } = buildIndex(entries);

  const variants = [];
  for (const g of model.groups) {
    for (const v of g.variants) {
      variants.push({ collectionSlug: g.collectionSlug, groupSlug: g.groupSlug, finish: v.finish, ref: v });
    }
  }

  const matched = [], noPhoto = [], unmatched = [];
  for (const v of variants) {
    const src = String(v.ref.sourceImage || '').trim();
    if (!src) { v.ref.noPhoto = true; v.ref.image = null; noPhoto.push(v); continue; }
    const hit = index.get(normalizeBasename(src));
    if (hit) { v.entry = hit; matched.push(v); }
    else { v.ref.noPhoto = true; v.ref.image = null; unmatched.push(v); }
  }

  let copied = 0; const copyErrors = [];
  if (!DRY) {
    const sharp = require('sharp');
    const TMP = path.join(ROOT, '.migrate-tmp');
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    execFileSync('unzip', ['-o', '-q', ZIP, '-d', TMP], { maxBuffer: 64 * 1024 * 1024 });
    for (const v of matched) {
      const ext = path.extname(v.entry).toLowerCase() === '.jpeg' ? '.jpg' : path.extname(v.entry).toLowerCase();
      const fname = `${v.groupSlug}-${M.slugify(v.finish)}${ext}`;
      const destDir = path.join(PRODUCTS_DIR, v.collectionSlug);
      fs.mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, fname);
      try {
        let pipe = sharp(path.join(TMP, v.entry)).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
        pipe = ext === '.jpg' ? pipe.jpeg({ quality: 82 }) : pipe.png({ compressionLevel: 9 });
        await pipe.toFile(dest);
        v.ref.image = fname;
        v.ref.noPhoto = false;
        copied++;
      } catch (e) { copyErrors.push(`${v.entry}: ${String(e.message).slice(0, 120)}`); }
    }
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.writeFileSync(MODEL, JSON.stringify(model, null, 2), 'utf8');
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, renderReport({ entries, variants, matched, noPhoto, unmatched, collisions, copied, copyErrors, dry: DRY }), 'utf8');

  console.log(`Stage B — match-assets${DRY ? ' (dry)' : ''}`);
  console.log(`  images=${entries.length} variants=${variants.length}`);
  console.log(`  matched=${matched.length} noPhoto=${noPhoto.length} unmatched=${unmatched.length} collisions=${collisions.length}`);
  if (!DRY) console.log(`  copied=${copied} copyErrors=${copyErrors.length}`);
  console.log(`  -> ${path.relative(ROOT, REPORT)}`);
}

function sec(title, items, fmt = x => x, lim = 200) {
  if (!items.length) return `### ${title}\n\n_None._\n\n`;
  const body = items.slice(0, lim).map(i => `- ${fmt(i)}`).join('\n');
  const more = items.length > lim ? `\n- …and ${items.length - lim} more` : '';
  return `### ${title} (${items.length})\n\n${body}${more}\n\n`;
}

function renderReport(d) {
  return `# Asset Match — Exact Lookup

_${d.dry ? 'DRY RUN — no files copied.' : 'Exact-name matches copied into images/products/<collection>/.'}_

| Metric | Value |
| --- | --- |
| Source images in zip | ${d.entries.length} |
| Catalog variants | ${d.variants.length} |
| Matched (image copied) | ${d.matched.length} |
| No-photo (blank source name) | ${d.noPhoto.length} |
| Unmatched (source name not in zip) | ${d.unmatched.length} |
| Basename collisions in zip | ${d.collisions.length} |
${d.dry ? '' : `| Copied | ${d.copied} |\n| Copy errors | ${d.copyErrors.length} |\n`}

${sec('Unmatched source names (client to correct — rendered as No Photo Available)', d.unmatched,
    v => `\`${v.ref.sourceImage}\` — ${v.ref.sku} (${v.collectionSlug}/${v.groupSlug} [${v.finish}])`)}
${sec('Basename collisions (first kept)', d.collisions, c => `\`${c.key}\` kept \`${c.kept}\`, dropped \`${c.dropped}\``)}
${d.copyErrors && d.copyErrors.length ? sec('Copy errors', d.copyErrors) : ''}`;
}

module.exports = { normalizeBasename, buildIndex };

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
