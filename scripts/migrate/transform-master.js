'use strict';
// Stage A — Data Migration.
// Reads "ITEM MASTER FOR WEBSITE.xls" (the client's single source of truth),
// derives finish variants + canonical collections/categories, and emits:
//   - catalog.model.json   (clean grouped model, consumed by Stage B/C)
//   - reports/data-audit.md
//
// Run: node scripts/migrate/transform-master.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const M = require('./lib-migrate');

const ROOT = path.join(__dirname, '..', '..');
const MASTER_FILE = path.join(ROOT, 'catalog.clean.xlsx');
const MODEL_OUT = path.join(ROOT, 'catalog.model.json');
const REPORT_OUT = path.join(ROOT, 'reports', 'data-audit.md');

// Signature lines per brand reference.
const SIGNATURE = new Set(['Aliva', 'Opell Prima']);

function readMaster() {
  const wb = xlsx.readFile(MASTER_FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function main() {
  const rows = readMaster();
  const audit = {
    totalRows: rows.length,
    skippedNoName: [], skippedNoCode: [], missingCategory: [], missingCollection: [],
    missingPrice: [], duplicateCodes: [], duplicateVariant: [], chromeAssumed: [],
    finishMismatch: [],
  };

  const seenCodes = new Map();           // ItemCode -> first row index (duplicate detection)
  const groups = new Map();              // collectionSlug::baseCode -> group
  const collectionsMeta = new Map();     // slug -> { name, slug }

  rows.forEach((row, idx) => {
    const itemName = String(row['Item Name'] || '').trim();
    const code = String(row['ItemCode*'] || '').trim();
    const rawCollection = String(row['Collection Name'] || '').trim();
    const rawCategory = String(row['Category'] || '').trim();
    const mrp = row['MRP'];
    const sourceImage = String(row['Source Image File'] || '').trim();
    const rowFlag = String(row['RowFlag'] || 'plain').trim() || 'plain';

    if (!code) { audit.skippedNoCode.push(`row ${idx + 2}: "${itemName || '(no name)'}"`); return; }
    if (!itemName) { audit.skippedNoName.push(`row ${idx + 2}: code ${code}`); return; }
    if (!rawCollection) { audit.missingCollection.push(`${code} "${itemName}"`); }
    if (!rawCategory) { audit.missingCategory.push(`${code} "${itemName}"`); }
    if (!M.formatPrice(mrp)) { audit.missingPrice.push(`${code} "${itemName}"`); }

    if (seenCodes.has(code)) audit.duplicateCodes.push(`${code} (rows ${seenCodes.get(code) + 2} & ${idx + 2})`);
    else seenCodes.set(code, idx);

    const { name: collectionName, slug: collectionSlug } = M.canonicalCollection(rawCollection);
    collectionsMeta.set(collectionSlug, { name: collectionName, slug: collectionSlug });

    const category = M.mapCategory(rawCategory);
    const base = M.baseCode(code);
    const fin = M.resolveFinish(code, rawCollection);
    if (fin.source === 'default') audit.chromeAssumed.push(`${code} "${itemName}" -> Chrome`);
    if (fin.mismatch) audit.finishMismatch.push(`${code}: suffix=${fin.finish} vs collection="${fin.mismatch}"`);

    const key = `${collectionSlug}::${base}`;
    if (!groups.has(key)) {
      groups.set(key, {
        collectionName, collectionSlug, baseCode: base,
        skuName: M.cleanProductName(itemName),
        category,
        variants: [],
        _names: [],
      });
    }
    const g = groups.get(key);
    g._names.push(itemName);
    // Prefer a finish-free / shorter clean name for display (the Chrome base row).
    const clean = M.cleanProductName(itemName);
    if (fin.source === 'default' || clean.length < g.skuName.length) g.skuName = clean;

    // Duplicate (same finish twice in one group) — keep first, flag.
    if (g.variants.some(v => v.finish === fin.finish)) {
      audit.duplicateVariant.push(`${collectionSlug}/${base}: finish "${fin.finish}" repeated (${code})`);
    }
    g.variants.push({
      finish: fin.finish,
      sku: code,
      price: M.formatPrice(mrp),
      rawName: itemName,
      rawCollection,
      sourceImage,
      noPhoto: !sourceImage,
      rowFlag,
      image: null,                 // populated in Stage B
    });
  });

  // Finalise groups: order variants by finish sort, assign readable+unique slug per collection.
  const slugSeen = new Map(); // collectionSlug -> Map(slug -> count)
  const groupList = [];
  for (const g of groups.values()) {
    g.variants.sort((a, b) => M.finishSort(a.finish) - M.finishSort(b.finish));
    let slug = M.slugify(g.skuName) || M.slugify(g.baseCode);
    const used = slugSeen.get(g.collectionSlug) || new Map();
    if (used.has(slug)) slug = `${slug}-${M.slugify(g.baseCode)}`;
    used.set(slug, true);
    slugSeen.set(g.collectionSlug, used);
    g.groupSlug = slug;
    delete g._names;
    groupList.push(g);
  }

  // Collection summaries.
  const collections = [];
  for (const meta of collectionsMeta.values()) {
    const gs = groupList.filter(g => g.collectionSlug === meta.slug);
    const finishes = new Set();
    const cats = new Set();
    gs.forEach(g => { g.variants.forEach(v => finishes.add(v.finish)); cats.add(g.category); });
    collections.push({
      name: meta.name, slug: meta.slug,
      isSignature: SIGNATURE.has(meta.name),
      productCount: gs.length,
      finishCount: finishes.size,
      categories: Array.from(cats),
    });
  }
  collections.sort((a, b) => b.productCount - a.productCount);

  const finishesUsed = new Set();
  groupList.forEach(g => g.variants.forEach(v => finishesUsed.add(v.finish)));
  const finishes = M.FINISH_TABLE
    .filter(([n]) => finishesUsed.has(n))
    .map(([name, swatchClass, sortOrder]) => ({ name, swatchClass, sortOrder }));

  const model = {
    generatedAt: new Date().toISOString(),
    source: 'catalog.clean.xlsx',
    counts: {
      rows: rows.length,
      products: groupList.length,
      variants: groupList.reduce((n, g) => n + g.variants.length, 0),
      collections: collections.length,
      multiVariant: groupList.filter(g => g.variants.length > 1).length,
    },
    collections, finishes, groups: groupList,
  };

  fs.mkdirSync(path.dirname(MODEL_OUT), { recursive: true });
  fs.writeFileSync(MODEL_OUT, JSON.stringify(model, null, 2), 'utf8');
  fs.mkdirSync(path.dirname(REPORT_OUT), { recursive: true });
  fs.writeFileSync(REPORT_OUT, renderAudit(model, audit), 'utf8');

  console.log('Stage A — transform-master');
  console.log(`  rows=${rows.length} products=${groupList.length} variants=${model.counts.variants} collections=${collections.length}`);
  console.log(`  multi-variant groups=${model.counts.multiVariant}`);
  console.log(`  duplicateCodes=${audit.duplicateCodes.length} chromeAssumed=${audit.chromeAssumed.length} finishMismatch=${audit.finishMismatch.length}`);
  console.log(`  -> ${path.relative(ROOT, MODEL_OUT)}  +  ${path.relative(ROOT, REPORT_OUT)}`);
}

function section(title, items, fmt = x => x) {
  if (!items.length) return `### ${title}\n\n_None._\n\n`;
  const shown = items.slice(0, 80).map(i => `- ${fmt(i)}`).join('\n');
  const more = items.length > 80 ? `\n- …and ${items.length - 80} more` : '';
  return `### ${title} (${items.length})\n\n${shown}${more}\n\n`;
}

function renderAudit(model, a) {
  const c = model.counts;
  return `# Data Audit — Catalog Migration

_Generated ${model.generatedAt} from \`${model.source}\`._

## Summary

| Metric | Value |
| --- | --- |
| Source rows | ${c.rows} |
| Products (variant groups) | ${c.products} |
| Variants (SKUs) | ${c.variants} |
| Collections | ${c.collections} |
| Multi-variant products | ${c.multiVariant} |
| Duplicate ItemCodes | ${a.duplicateCodes.length} |
| Rows skipped (no code) | ${a.skippedNoCode.length} |
| Rows skipped (no name) | ${a.skippedNoName.length} |
| Missing price (MRP) | ${a.missingPrice.length} |
| Chrome finish assumed | ${a.chromeAssumed.length} |
| Suffix/collection finish mismatch | ${a.finishMismatch.length} |

## Collections

| Collection | Slug | Products | Finishes | Categories | Signature |
| --- | --- | --- | --- | --- | --- |
${model.collections.map(c => `| ${c.name} | ${c.slug} | ${c.productCount} | ${c.finishCount} | ${c.categories.join(', ')} | ${c.isSignature ? 'yes' : ''} |`).join('\n')}

## Issues

${section('Rows skipped — missing ItemCode', a.skippedNoCode)}
${section('Rows skipped — missing Item Name', a.skippedNoName)}
${section('Missing Category', a.missingCategory)}
${section('Missing Collection', a.missingCollection)}
${section('Missing Price (renders as “Enquire”)', a.missingPrice)}
${section('Duplicate ItemCodes', a.duplicateCodes)}
${section('Duplicate finish within a product group', a.duplicateVariant)}
${section('Finish assumed Chrome (un-suffixed base code — confirm with client)', a.chromeAssumed)}
${section('Suffix vs collection-name finish mismatch (used suffix)', a.finishMismatch)}
`;
}

main();
