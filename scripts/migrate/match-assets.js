'use strict';
// Stage B — Asset Integration.
// Matches the client photography (PICTURES FOR WEBSITE...zip) to catalog variants,
// copies (downscaled) winners into images/products/<collection>/, writes the chosen
// filename back into catalog.model.json, and emits reports/asset-audit.md.
//
// Run:  node scripts/migrate/match-assets.js [--dry]
//   --dry  compute matches + audit only; no image copy, no model write.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const M = require('./lib-migrate');

const ROOT = path.join(__dirname, '..', '..');
const ZIP = path.join(ROOT, 'PICTURES FOR WEBSITE-20260620T115329Z-3-001.zip');
const MODEL = path.join(ROOT, 'catalog.model.json');
const REPORT = path.join(ROOT, 'reports', 'asset-audit.md');
const MATCHMAP = path.join(ROOT, 'reports', 'asset-matches.json');
const PRODUCTS_DIR = path.join(ROOT, 'images', 'products');
const MAX_WIDTH = 1400;
const THRESH_HIGH = 0.5;    // >= confident
const THRESH_FUZZY = 0.34;  // >= fuzzy (logged); below => unmatched
const DRY = process.argv.includes('--dry');

// Finish folder tokens -> finish (most-specific first).
const FINISH_FOLDERS = [
  ['GUNMETAL BLACK GOLD', 'Gunmetal Black Gold'],
  ['MATT BLACK GOLD', 'Matt Black Gold'],
  ['MATT BEIGE GOLD', 'Matt Beige Gold'],
  ['MATT GREY GOLD', 'Matt Grey Gold'],
  ['MATT WHITE GOLD', 'Matt White Gold'],
  ['GUNMETAL BLACK', 'Gunmetal Black'],
  ['MATT BLACK', 'Matt Black'],
  ['MATT BEIGE', 'Matt Beige'],
  ['MATT GREY', 'Matt Grey'],
  ['MATT WHITE', 'Matt White'],
  ['RICH GOLD', 'Rich Gold'],
  ['ROSE GOLD', 'Rose Gold'],
];
const COLLECTION_FOLDERS = [
  ['OPELL PRIMA', 'opell-prima'], ['ZENITH', 'zenith'], ['JP COLLECTION', 'jp'],
  ['PARA', 'para'], ['NEO', 'neo'], ['PEBBLE', 'pebble'],
  ['CUBE PRIME', 'cube-prima'], ['CUBE PRIMA', 'cube-prima'], ['FUSION', 'fuzone'],
];
const KNOWN_SLUGS = new Set(['aliva', 'flora', 'fuzone', 'jp', 'para', 'premium', 'neo', 'pebble', 'cube-prima', 'opell-prima', 'zenith', 'allied']);

function listZip() {
  const out = execFileSync('unzip', ['-Z1', ZIP], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map(s => s.trim()).filter(s => /\.(png|jpe?g)$/i.test(s));
}

// { collScope, finish } for an image from folder path + filename.
function classifyImage(entry) {
  const up = entry.toUpperCase();
  const base = entry.split('/').pop();
  for (const [tok, slug] of COLLECTION_FOLDERS) {
    if (up.includes(tok)) {
      const ff = FINISH_FOLDERS.find(([t]) => up.includes(t));
      const finish = (slug === 'zenith' && ff) ? ff[1] : (M.phraseFinish(base) || 'Chrome');
      return { collScope: slug, finish };
    }
  }
  for (const [tok, finish] of FINISH_FOLDERS) {
    if (up.includes(tok)) {
      // Generic finish folders span Opell Prima / Allied / Zenith. If the filename
      // itself names a brand line, bind to it; else leave open (finish-scoped).
      const named = M.collectionFromText(base);
      return { collScope: up.includes('ZENITH') ? 'zenith' : named, finish };
    }
  }
  if (up.includes('PROFILE')) return { collScope: null, finish: '__profile__' };
  // Root-loose file: derive collection from the filename's brand word.
  return { collScope: M.collectionFromText(base), finish: M.phraseFinish(base) || 'Chrome' };
}

function pushIdx(map, key, val) { (map.get(key) || map.set(key, []).get(key)).push(val); }

async function main() {
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));

  const variants = [];
  for (const g of model.groups) {
    for (const v of g.variants) {
      variants.push({
        collectionSlug: g.collectionSlug, groupSlug: g.groupSlug, finish: v.finish,
        skuName: g.skuName, tokens: M.normalizeName(g.skuName), ref: v, image: null,
      });
    }
  }
  const vIndex = new Map();          // collectionSlug|finish -> [variant]
  const finishCollections = new Map(); // finish -> Set(collectionSlug)
  for (const v of variants) {
    pushIdx(vIndex, v.collectionSlug + '|' + v.finish, v);
    (finishCollections.get(v.finish) || finishCollections.set(v.finish, new Set()).get(v.finish)).add(v.collectionSlug);
  }

  const entries = listZip();
  const candidates = [];
  const imageInfo = new Map();
  const orphanProfile = [];
  for (const entry of entries) {
    const { collScope, finish } = classifyImage(entry);
    if (finish === '__profile__') { orphanProfile.push(entry); continue; }
    const tokens = M.normalizeName(entry.split('/').pop());
    imageInfo.set(entry, { collScope, finish, tokens });
    const colls = collScope ? [collScope] : Array.from(finishCollections.get(finish) || []);
    for (const cs of colls) {
      for (const v of (vIndex.get(cs + '|' + finish) || [])) {
        const score = M.tokenScore(tokens, v.tokens);
        if (score >= THRESH_FUZZY) candidates.push({ entry, variant: v, score });
      }
    }
  }

  // Greedy: best score first; one image per variant, one variant per image.
  candidates.sort((a, b) => b.score - a.score);
  const usedImages = new Set();
  const matches = [], duplicates = [], ambiguous = [];
  // Detect ambiguity: an image whose top-2 candidate scores tie closely across different variants.
  const byImage = new Map();
  for (const c of candidates) pushIdx(byImage, c.entry, c);
  for (const [entry, cs] of byImage) {
    if (cs.length >= 2) {
      const s = cs.slice().sort((a, b) => b.score - a.score);
      if (s[0].score - s[1].score < 0.08 && s[0].variant.groupSlug !== s[1].variant.groupSlug)
        ambiguous.push({ entry, a: s[0], b: s[1] });
    }
  }
  for (const c of candidates) {
    if (c.variant.image) { if (!usedImages.has(c.entry)) duplicates.push(c); continue; }
    if (usedImages.has(c.entry)) continue;
    c.variant.image = c.entry;
    usedImages.add(c.entry);
    matches.push(c);
  }

  const matchedVariants = variants.filter(v => v.image);
  const missingVariants = variants.filter(v => !v.image);
  const orphanImages = entries.filter(e => !usedImages.has(e)).concat(orphanProfile);
  const highN = matches.filter(m => m.score >= THRESH_HIGH).length;
  const fuzzyMatches = matches.filter(m => m.score < THRESH_HIGH);

  // Copy + resize winners (skip in --dry). Extract the zip once to a temp dir, then
  // read from disk (robust against unzip glob-pattern quirks in filenames).
  let copied = 0; const copyErrors = [];
  if (!DRY) {
    const sharp = require('sharp');
    const TMP = path.join(ROOT, '.migrate-tmp');
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    execFileSync('unzip', ['-o', '-q', ZIP, '-d', TMP], { maxBuffer: 64 * 1024 * 1024 });
    for (const v of matchedVariants) {
      const ext = path.extname(v.image).toLowerCase() === '.jpeg' ? '.jpg' : path.extname(v.image).toLowerCase();
      const fname = `${v.groupSlug}-${M.slugify(v.finish)}${ext}`;
      const destDir = path.join(PRODUCTS_DIR, v.collectionSlug);
      fs.mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, fname);
      try {
        let pipe = sharp(path.join(TMP, v.image)).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
        pipe = ext === '.jpg' ? pipe.jpeg({ quality: 82 }) : pipe.png({ compressionLevel: 9 });
        await pipe.toFile(dest);
        v.ref.image = fname;
        copied++;
      } catch (e) { copyErrors.push(`${v.image}: ${String(e.message).slice(0, 120)}`); }
    }
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.writeFileSync(MODEL, JSON.stringify(model, null, 2), 'utf8');
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, renderReport({
    entries, variants, matchedVariants, missingVariants, highN, fuzzyMatches,
    orphanImages, duplicates, ambiguous, copied, copyErrors, dry: DRY,
  }), 'utf8');
  fs.writeFileSync(MATCHMAP, JSON.stringify({
    matches: matches.map(m => ({ image: m.entry, to: `${m.variant.collectionSlug}/${m.variant.groupSlug}`, finish: m.variant.finish, score: +m.score.toFixed(2) })),
    missing: missingVariants.map(v => `${v.collectionSlug}/${v.groupSlug} [${v.finish}]`),
    orphans: orphanImages,
  }, null, 2), 'utf8');

  console.log(`Stage B — match-assets${DRY ? ' (dry)' : ''}`);
  console.log(`  images=${entries.length} variants=${variants.length}`);
  console.log(`  matched=${matchedVariants.length} (high=${highN} fuzzy=${fuzzyMatches.length}) missing=${missingVariants.length}`);
  console.log(`  orphanImages=${orphanImages.length} duplicates=${duplicates.length} ambiguous=${ambiguous.length}`);
  if (!DRY) console.log(`  copied=${copied} copyErrors=${copyErrors.length}`);
  console.log(`  -> ${path.relative(ROOT, REPORT)}  +  ${path.relative(ROOT, MATCHMAP)}`);
}

function sec(title, items, fmt = x => x, lim = 60) {
  if (!items.length) return `### ${title}\n\n_None._\n\n`;
  const body = items.slice(0, lim).map(i => `- ${fmt(i)}`).join('\n');
  const more = items.length > lim ? `\n- …and ${items.length - lim} more` : '';
  return `### ${title} (${items.length})\n\n${body}${more}\n\n`;
}

function renderReport(d) {
  const pct = d.variants.length ? ((d.matchedVariants.length / d.variants.length) * 100).toFixed(1) : '0';
  return `# Asset Audit — Image Matching

_${d.dry ? 'DRY RUN — no files copied.' : 'Images copied into images/products/<collection>/.'}_

## Summary

| Metric | Value |
| --- | --- |
| Source images | ${d.entries.length} |
| Catalog variants | ${d.variants.length} |
| Variants matched | ${d.matchedVariants.length} (${pct}%) |
| — high confidence (≥${THRESH_HIGH}) | ${d.highN} |
| — fuzzy (${THRESH_FUZZY}–${THRESH_HIGH}) | ${d.fuzzyMatches.length} |
| Variants missing image (category fallback) | ${d.missingVariants.length} |
| Orphan images (no product) | ${d.orphanImages.length} |
| Duplicate images (extra for matched product) | ${d.duplicates.length} |
| Ambiguous (image ~equal for 2 products) | ${d.ambiguous.length} |
${d.dry ? '' : `| Copied | ${d.copied} |\n| Copy errors | ${d.copyErrors.length} |\n`}

${sec('Fuzzy matches — review (image → product @score)', d.fuzzyMatches,
    m => `\`${m.entry.split('/').pop()}\` → ${m.variant.collectionSlug}/${m.variant.groupSlug} [${m.variant.finish}] @${m.score.toFixed(2)}`)}
${sec('Ambiguous matches', d.ambiguous,
    x => `\`${x.entry.split('/').pop()}\` → ${x.a.variant.groupSlug} @${x.a.score.toFixed(2)} vs ${x.b.variant.groupSlug} @${x.b.score.toFixed(2)}`)}
${sec('Missing assets (product, no image)', d.missingVariants,
    v => `${v.collectionSlug}/${v.groupSlug} [${v.finish}] — "${v.skuName}"`, 120)}
${sec('Orphan assets (image, no product)', d.orphanImages, e => `\`${e}\``, 120)}
${sec('Duplicate assets (extra images for a matched product)', d.duplicates,
    m => `\`${m.entry.split('/').pop()}\` ~ ${m.variant.groupSlug} [${m.variant.finish}] @${m.score.toFixed(2)}`)}
${d.copyErrors && d.copyErrors.length ? sec('Copy errors', d.copyErrors) : ''}`;
}

main().catch(e => { console.error(e); process.exit(1); });
