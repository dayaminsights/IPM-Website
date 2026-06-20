'use strict';
// QA — Production readiness checks over the generated site.
// Validates counts, page existence, image integrity, finish-picker rendering,
// dynamic categories, search index, and absence of legacy references.
// Emits reports/qa-report.md. Exit code 1 if any hard check fails.
//
// Run: node scripts/migrate/qa-check.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MODEL = path.join(ROOT, 'catalog.model.json');
const REPORT = path.join(ROOT, 'reports', 'qa-report.md');

const checks = []; // { name, pass, detail }
function check(name, pass, detail = '') { checks.push({ name, pass: !!pass, detail }); }

function main() {
  const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));

  // 1. Counts
  const expectProducts = model.groups.length;
  const expectVariants = model.groups.reduce((n, g) => n + g.variants.length, 0);
  check('Source rows == variants (924)', expectVariants === 924, `${expectVariants} variants`);
  check('Collections == 12', model.collections.length === 12, `${model.collections.length}`);

  // 2. Every product + collection page exists; image integrity; finish pickers
  let pagesOk = 0, pagesMissing = 0, imgMissing = 0, pickerOk = 0, pickerMissing = 0, imgChecked = 0;
  const missingPagesList = [], missingImgList = [], missingPickerList = [];
  for (const g of model.groups) {
    const pageDir = path.join(ROOT, 'collections', g.collectionSlug, g.groupSlug);
    const page = path.join(pageDir, 'index.html');
    if (!fs.existsSync(page)) { pagesMissing++; missingPagesList.push(`${g.collectionSlug}/${g.groupSlug}`); continue; }
    pagesOk++;
    const html = fs.readFileSync(page, 'utf8');
    // image integrity: resolve every <img src="..."> relative to the page dir
    for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      const src = m[1];
      if (/^https?:/.test(src)) continue;
      imgChecked++;
      const resolved = path.resolve(pageDir, src);
      if (!fs.existsSync(resolved)) { imgMissing++; if (missingImgList.length < 40) missingImgList.push(`${g.groupSlug}: ${src}`); }
    }
    // finish picker for multi-variant
    if (g.variants.length > 1) {
      if (html.includes('finish-picker')) pickerOk++;
      else { pickerMissing++; missingPickerList.push(`${g.collectionSlug}/${g.groupSlug}`); }
    }
  }
  for (const c of model.collections) {
    if (!fs.existsSync(path.join(ROOT, 'collections', c.slug, 'index.html'))) { pagesMissing++; missingPagesList.push(`${c.slug} (collection)`); }
  }
  check('All product pages exist', pagesMissing === 0, `${pagesOk} present, ${pagesMissing} missing`);
  check('All referenced images resolve', imgMissing === 0, `${imgChecked} checked, ${imgMissing} missing`);
  check('Multi-variant products render finish picker', pickerMissing === 0, `${pickerOk} ok, ${pickerMissing} missing`);

  // 3. Dynamic categories
  const cats = new Set(model.groups.map(g => g.category));
  const expectedCats = ['Faucets', 'Kitchen Mixers', 'Shower'];
  check('Categories are the 3 expected', expectedCats.every(c => cats.has(c)) && cats.size === 3, [...cats].join(', '));

  // 4. Opell Prima & Zenith are single collections with finish variants
  const op = model.collections.find(c => c.slug === 'opell-prima');
  const ze = model.collections.find(c => c.slug === 'zenith');
  check('Opell Prima single collection w/ multi-finish', op && op.finishCount > 1, op ? `${op.finishCount} finishes` : 'missing');
  check('Zenith single collection w/ multi-finish', ze && ze.finishCount > 1, ze ? `${ze.finishCount} finishes` : 'missing');

  // 5. Search index
  const siPath = path.join(ROOT, 'search-index.json');
  let si = null;
  if (fs.existsSync(siPath)) si = JSON.parse(fs.readFileSync(siPath, 'utf8'));
  check('Search index exists & matches product count', si && si.count === expectProducts, si ? `${si.count} items` : 'missing');

  // 6. Search nav link present in a generated page
  const sampleProduct = model.groups[0];
  const samplePage = fs.existsSync(path.join(ROOT, 'collections', sampleProduct.collectionSlug, sampleProduct.groupSlug, 'index.html'))
    ? fs.readFileSync(path.join(ROOT, 'collections', sampleProduct.collectionSlug, sampleProduct.groupSlug, 'index.html'), 'utf8') : '';
  check('Generated nav includes Search link', /search\.html/.test(samplePage));

  // 7. No legacy references remain
  const scanFiles = ['index.html', 'collections.html', 'about.html', 'contact.html', '_template.html', 'search.html'];
  const legacyTokens = ['scrape-output', 'product catalogue.xlsx', 'para-collection/', 'zenith-collections/', 'round-brass-accessories', 'square-brass-accessories', 'collections/cube/'];
  const legacyHits = [];
  for (const f of scanFiles) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    for (const tok of legacyTokens) if (txt.includes(tok)) legacyHits.push(`${f}: "${tok}"`);
  }
  const mergeScripts = fs.readdirSync(path.join(ROOT, 'scripts')).filter(f => /^merge-|populate-from-scrape|scrape-reference/.test(f));
  check('No legacy refs in core HTML', legacyHits.length === 0, legacyHits.join('; '));
  check('No legacy scripts remain', mergeScripts.length === 0, mergeScripts.join(', '));
  check('Old workbook removed', !fs.existsSync(path.join(ROOT, 'product catalogue.xlsx')));
  check('Scrape output removed', !fs.existsSync(path.join(ROOT, 'scripts', 'scrape-output')));

  // Image coverage (informational)
  const withImg = model.groups.filter(g => g.variants.some(v => v.image)).length;
  const coverage = ((withImg / expectProducts) * 100).toFixed(0);

  const report = renderReport(model, { expectProducts, expectVariants, pagesOk, imgChecked, withImg, coverage, cats: [...cats] });
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, report, 'utf8');

  const failed = checks.filter(c => !c.pass);
  console.log('QA — production readiness');
  checks.forEach(c => console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.detail ? ' — ' + c.detail : ''}`));
  console.log(`  ${checks.length - failed.length}/${checks.length} checks passed -> ${path.relative(ROOT, REPORT)}`);
  if (failed.length) process.exit(1);
}

function renderReport(model, s) {
  const rows = checks.map(c => `| ${c.pass ? '✅' : '❌'} | ${c.name} | ${c.detail || ''} |`).join('\n');
  return `# QA Report — Production Readiness

_Generated ${new Date().toISOString()}._

## Checks

| | Check | Detail |
| --- | --- | --- |
${rows}

## Catalog at a glance

| Metric | Value |
| --- | --- |
| Products | ${s.expectProducts} |
| Variants (SKUs) | ${s.expectVariants} |
| Collections | ${model.collections.length} |
| Categories | ${s.cats.join(', ')} |
| Product pages verified | ${s.pagesOk} |
| Images checked | ${s.imgChecked} |
| Products with real photography | ${s.withImg} (${s.coverage}%) |

## Collections

| Collection | Products | Finishes | Signature |
| --- | --- | --- | --- |
${model.collections.map(c => `| ${c.name} | ${c.productCount} | ${c.finishCount} | ${c.isSignature ? 'yes' : ''} |`).join('\n')}

> Image coverage below 100% is expected: many catalogued SKUs (exposed/concealed parts,
> size variants, Chrome-only accessories) have no dedicated photography in the client set.
> Those products fall back to category imagery — see \`asset-audit.md\` for the full gap list.
`;
}

main();
