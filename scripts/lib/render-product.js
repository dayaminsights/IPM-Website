const { rel, renderHead, renderHeader, renderFooter, renderPage } = require('./layout');
const { escapeHtml } = require('./render-collection');

function renderRelatedProductCard(related, depth) {
  const primary = related.variants[0];
  const href = rel(depth, `collections/${related.collectionSlug}/${related.groupSlug}/`);
  return `        <a class="coll-card" href="${href}">
          <div class="arch product-shot"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(related.skuName)}</div>
          <span class="cat-tag">${escapeHtml(related.category)}</span>
        </a>`;
}

function renderProductPage(group, collection, { siteBaseUrl }) {
  const depth = 3; // browser URL is /collections/<slug>/<group-slug>/ (3 path segments)
  const primary = group.variants[0];
  const hasMultipleVariants = group.variants.length > 1;

  const title = `${group.skuName} — ${collection.name} | IPM Bath Fittings`;
  const description = group.metaDescription ||
    `${group.skuName} — ${group.description.slice(0, 120)}`;
  const canonicalPath = `${siteBaseUrl}/collections/${group.collectionSlug}/${group.groupSlug}/`;

  const head = renderHead({
    title,
    description: escapeHtml(description),
    canonicalPath,
    ogImage: primary.image,
    depth,
  });

  // Breadcrumb bar
  const breadcrumbHtml = `<div class="wrap">
  <div class="breadcrumb">
    <a href="${rel(depth, 'index.html')}">Home</a><span class="sep">/</span>
    <a href="${rel(depth, 'collections.html')}">Collections</a><span class="sep">/</span>
    <a href="${rel(depth, `collections/${group.collectionSlug}/`)}">${escapeHtml(collection.name)}</a><span class="sep">/</span>
    <span class="current">${escapeHtml(group.skuName)}</span>
  </div>
</div>`;

  // Gallery
  const galleryThumbsHtml = group.gallery.length > 1
    ? `        <div class="gallery-thumbs">
${group.gallery.map((img, i) => `          <button data-image="${rel(depth, img.replace(/^\//, ''))}" class="${i === 0 ? 'is-active' : ''}"><img src="${rel(depth, img.replace(/^\//, ''))}" alt="${escapeHtml(group.skuName)} view ${i + 1}" loading="lazy"></button>`).join('\n')}
        </div>`
    : '';

  const galleryHtml = `      <div class="gallery">
        <div class="arch product-shot">
          <img id="mainImage" src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}">
        </div>
${galleryThumbsHtml}
      </div>`;

  // Spec table
  const specRows = [];
  specRows.push(`        <div class="row"><span class="k">Category</span><span class="v">${escapeHtml(group.category)}</span></div>`);
  if (group.dimensions) {
    specRows.push(`        <div class="row"><span class="k">Dimensions</span><span class="v">${escapeHtml(group.dimensions)}</span></div>`);
  }
  specRows.push(`        <div class="row"><span class="k">Currently Viewing</span><span class="v" id="current-finish">${escapeHtml(primary.finish || 'Not specified')}</span></div>`);
  const specTableHtml = `      <div class="spec-table">
${specRows.join('\n')}
      </div>`;

  // Finish picker / static finish line
  let finishSectionHtml;
  if (hasMultipleVariants) {
    const swatchesHtml = group.variants.map((v, i) =>
      `          <button class="finish${i === 0 ? ' is-active' : ''}" data-index="${i}"><span class="swatch ${escapeHtml(v.swatchClass)}" aria-hidden="true"></span><span class="label">${escapeHtml(v.finish)}</span></button>`
    ).join('\n');
    finishSectionHtml = `      <div class="finish-picker">
        <h4>Available in ${group.variants.length} Finishes</h4>
        <div class="finishes-row">
${swatchesHtml}
        </div>
      </div>`;
  } else {
    finishSectionHtml = `      <p class="finish-static">Finish: ${escapeHtml(primary.finish || 'Not specified')}</p>`;
  }

  // Description paragraphs
  const descParagraphs = group.description
    .split(/\n+/)
    .filter(Boolean)
    .map(p => `      <p>${escapeHtml(p)}</p>`)
    .join('\n');

  // Embedded variant data
  const variantData = group.variants.map(v => ({
    finish: v.finish,
    sku: v.sku,
    swatchClass: v.swatchClass,
    image: rel(depth, v.image.replace(/^\//, '')),
    alt: v.alt,
  }));

  // Enquire CTA
  const enquireParams = new URLSearchParams({
    product: group.skuName,
    collection: collection.name,
  });
  if (!hasMultipleVariants) enquireParams.set('finish', primary.finish);
  const enquireHref = `${rel(depth, 'contact.html')}?${enquireParams.toString()}`;

  const infoHtml = `      <div class="eyebrow"><a href="${rel(depth, `collections/${group.collectionSlug}/`)}">${escapeHtml(collection.name)} Collection</a></div>
      <h1 class="serif">${escapeHtml(group.skuName)}</h1>
      <span class="sku-tag">SKU: <span id="current-sku">${escapeHtml(primary.sku)}</span></span>
${descParagraphs}
${specTableHtml}
${finishSectionHtml}
      <a class="btn-gold" id="enquireBtn" href="${enquireHref}">Enquire for Pricing</a>`;

  const productMainHtml = `<section class="sec product-main-sec">
  <div class="wrap">
    <div class="product-main">
${galleryHtml}
      <div class="info">
${infoHtml}
      </div>
    </div>
  </div>
</section>`;

  // Related products
  const related = (group.related || []).slice(0, 4);
  const relatedHtml = related.length ? `<section class="sec">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">You May Also Like</div>
      <h2 class="serif">Related <em>Products</em></h2>
    </div>
    <div class="related-products stagger-children">
${related.map(r => renderRelatedProductCard(r, depth)).join('\n')}
    </div>
  </div>
</section>` : '';

  const bodyContent = `${renderHeader(depth)}

${breadcrumbHtml}

${productMainHtml}

${relatedHtml ? `<div class="sec-divider"><span></span></div>\n\n${relatedHtml}\n\n` : ''}${renderFooter(depth)}`;

  const pageCss = `.product-main-sec { padding-top: 56px; }
.info .eyebrow a { transition: color .25s; }
.info .eyebrow a:hover { color: var(--gold-2); }
.info h1 { font-weight: 400; font-size: clamp(36px, 4.4vw, 56px); line-height: 1.05; margin: 14px 0 0; }
.info p { color: var(--soft); margin-top: 4px; }
.info p + p { margin-top: 12px; }`;

  const pageJs = hasMultipleVariants ? `
const variantData = ${JSON.stringify(variantData, null, 2)};
const mainImage = document.getElementById('mainImage');
const currentSku = document.getElementById('current-sku');
const currentFinish = document.getElementById('current-finish');
const enquireBtn = document.getElementById('enquireBtn');
const finishButtons = document.querySelectorAll('.finish-picker .finish');

finishButtons.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    const v = variantData[i];
    finishButtons.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    mainImage.src = v.image;
    mainImage.alt = v.alt;
    currentSku.textContent = v.sku;
    currentFinish.textContent = v.finish;
    const url = new URL(enquireBtn.href, window.location.href);
    url.searchParams.set('finish', v.finish);
    enquireBtn.href = url.pathname + url.search;
  });
});
` : '';

  const galleryJs = group.gallery.length > 1 ? `
const thumbButtons = document.querySelectorAll('.gallery-thumbs button');
thumbButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    thumbButtons.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById('mainImage').src = btn.dataset.image;
  });
});
` : '';

  return renderPage({ head, bodyContent, pageCss, pageJs: pageJs + galleryJs });
}

module.exports = { renderProductPage };
