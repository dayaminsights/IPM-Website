const { rel, renderHead, renderHeader, renderFooter, renderPage } = require('./layout');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCollectionCard(group, depth) {
  const primary = group.variants[0];
  // depth is always 1 here (/collections/<slug>/index.html); the product page
  // lives one level down at /collections/<slug>/<group-slug>/, so it's a
  // direct child of the current directory.
  const href = `${group.groupSlug}/`;
  return `        <a class="coll-card" href="${href}" data-category="${escapeHtml(group.category)}">
          <div class="arch"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
          <span class="cat-tag">${escapeHtml(group.category)}</span>
        </a>`;
}

function renderRelatedCollectionCard(related, depth) {
  // depth is always 1 here (/collections/<slug>/index.html); sibling
  // collections live at /collections/<related-slug>/, one level up then in.
  const href = `../${related.slug}/`;
  return `        <a class="coll-card" href="${href}">
          <div class="arch"><img src="${rel(depth, related.resolvedHeroImage.replace(/^\//, ''))}" alt="${escapeHtml(related.name)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(related.name)}</div>
        </a>`;
}

function renderShowcaseTile(group, depth, sizeClass) {
  const primary = group.variants[0];
  const href = `${group.groupSlug}/`;
  return `        <a class="showcase-tile ${sizeClass}" href="${href}">
          <div class="arch"><img src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}" loading="lazy"></div>
          <div class="cc-name serif">${escapeHtml(group.skuName)}</div>
        </a>`;
}

function renderShowcase(collection, depth) {
  const groups = collection.showcaseGroups || [];
  if (groups.length === 0) return '';

  const isSignature = collection.isSignature;
  const eyebrowLabel = isSignature ? 'Signature Line' : 'The Range';
  const heading = isSignature
    ? `The <em>${escapeHtml(collection.name)}</em> Standard`
    : `Inside <em>${escapeHtml(collection.name)}</em>`;

  const main = groups[0];
  const supporting = groups.slice(1, 4);

  const mainSizeClass = isSignature ? 'showcase-main showcase-main-lg' : 'showcase-main';
  const mainTile = renderShowcaseTile(main, depth, mainSizeClass);
  const supportingTiles = supporting.map(g => renderShowcaseTile(g, depth, 'showcase-sub')).join('\n');

  const taglineLine = isSignature
    ? `\n      <p class="showcase-quote serif">"${escapeHtml(collection.tagline)}"</p>`
    : `\n      <p class="showcase-tagline">${escapeHtml(collection.tagline)}</p>`;

  return `<section class="sec">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">${eyebrowLabel}</div>
      <h2 class="serif">${heading}</h2>${taglineLine}
    </div>
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}">
${mainTile}
${supportingTiles}
    </div>
  </div>
</section>`;
}

function renderCollectionPage(collection, productGroups, allCollections, { siteBaseUrl }) {
  const depth = 2; // browser URL is /collections/<slug>/ (2 path segments)
  const groups = productGroups.filter(g => g.collectionSlug === collection.slug);

  const title = `${collection.name} Collection — IPM Bath Fittings`;
  const description = collection.tagline || collection.description.slice(0, 155);
  const canonicalPath = `${siteBaseUrl}/collections/${collection.slug}/`;

  const head = renderHead({
    title,
    description: escapeHtml(description),
    canonicalPath,
    ogImage: collection.resolvedHeroImage,
    depth,
  });

  const eyebrowLabel = collection.isSignature ? 'Signature Line' : 'Collection';

  // Hero
  const words = collection.name.split(' ');
  const heroWordsHtml = words.map((w, i) =>
    `          <span class="word"><span style="animation-delay:${(0.55 + i * 0.12).toFixed(2)}s">${escapeHtml(w)}</span></span>`
  ).join('\n');

  const heroHtml = `<section class="page-hero" data-header-scheme="dark">
  <img src="${rel(depth, collection.resolvedHeroImage.replace(/^\//, ''))}" alt="${escapeHtml(collection.name)}" id="heroImg">
  <div class="scrim"></div>
  <div class="copy">
    <div class="crumb">
      <a href="${rel(depth, 'index.html')}">Home</a><span class="sep">/</span>
      <a href="${rel(depth, 'collections.html')}">Collections</a><span class="sep">/</span>
      <span>${escapeHtml(collection.name)}</span>
    </div>
    <span class="e">${eyebrowLabel}</span>
    <h1>
${heroWordsHtml}
    </h1>
    <p class="sub">${escapeHtml(collection.tagline)}</p>
  </div>
</section>`;

  // Collection story
  const storyParagraphs = collection.description
    .split(/\n+/)
    .filter(Boolean)
    .map(p => `      <p>${escapeHtml(p)}</p>`)
    .join('\n');

  const storyHtml = `<section class="sec">
  <div class="wrap">
    <div class="coll-story reveal">
      <div class="eyebrow">Collection Story</div>
      <h2 class="serif">The ${escapeHtml(collection.name)} <em>Standard</em></h2>
${storyParagraphs}
    </div>
  </div>
</section>`;

  // Product grid
  const showFilters = collection.categories.length > 1;
  const filterTabsHtml = showFilters
    ? `    <div class="filter-tabs">
      <button class="filter-tab is-active" data-filter="all">All</button>
${collection.categories.map(c => `      <button class="filter-tab" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('\n')}
    </div>\n`
    : '';

  const cardsHtml = groups.map(g => renderCollectionCard(g, depth)).join('\n');

  const gridHtml = `<section class="sec">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">The Range</div>
      <h2 class="serif">${groups.length} ${groups.length === 1 ? 'Piece' : 'Pieces'}, One Standard <em>of Craft</em></h2>
    </div>
${filterTabsHtml}    <div class="coll-grid stagger-children">
${cardsHtml}
    </div>
  </div>
</section>`;

  // Finishes strip (verbatim, unfiltered, 16 swatches)
  const finishesHtml = `<section class="sec finishes-section">
  <div class="wrap">
    <div class="finishes-head reveal">
      <div class="eyebrow">Available In</div>
      <h2 class="serif">Sixteen Hand-Perfected <em>Finishes</em></h2>
      <p>Every collection can be ordered in the full IPM finish palette — from warm brass tones to deep matte profiles.</p>
    </div>
    <div class="finishes-row">
      <div class="finish"><span class="swatch f-rich-gold" aria-hidden="true"></span><span class="label">Rich Gold</span></div>
      <div class="finish"><span class="swatch f-rose-gold" aria-hidden="true"></span><span class="label">Rose Gold</span></div>
      <div class="finish"><span class="swatch f-gunmetal" aria-hidden="true"></span><span class="label">Polished Gun Metal Black</span></div>
      <div class="finish"><span class="swatch f-matt-white-gold" aria-hidden="true"></span><span class="label">Matt White Gold</span></div>
      <div class="finish"><span class="swatch f-matt-black-gold" aria-hidden="true"></span><span class="label">Matt Black Gold</span></div>
      <div class="finish"><span class="swatch f-matt-beige-gold" aria-hidden="true"></span><span class="label">Matt Beige Gold</span></div>
      <div class="finish"><span class="swatch f-matt-grey-gold" aria-hidden="true"></span><span class="label">Matt Grey Gold</span></div>
      <div class="finish"><span class="swatch f-matt-white" aria-hidden="true"></span><span class="label">Matt White</span></div>
      <div class="finish"><span class="swatch f-matt-black" aria-hidden="true"></span><span class="label">Matt Black</span></div>
      <div class="finish"><span class="swatch f-matt-beige" aria-hidden="true"></span><span class="label">Matt Beige</span></div>
      <div class="finish"><span class="swatch f-matt-grey" aria-hidden="true"></span><span class="label">Matt Grey</span></div>
      <div class="finish"><span class="swatch f-profile-white-gold" aria-hidden="true"></span><span class="label">Profile White Gold</span></div>
      <div class="finish"><span class="swatch f-profile-black-gold" aria-hidden="true"></span><span class="label">Profile Black Gold</span></div>
      <div class="finish"><span class="swatch f-profile-beige-gold" aria-hidden="true"></span><span class="label">Profile Beige Gold</span></div>
      <div class="finish"><span class="swatch f-profile-grey-gold" aria-hidden="true"></span><span class="label">Profile Grey Gold</span></div>
      <div class="finish"><span class="swatch f-chrome" aria-hidden="true"></span><span class="label">Chrome</span></div>
    </div>
  </div>
</section>`;

  // Related collections
  const relatedCollections = collection.relatedCollections
    .map(name => allCollections.find(c => c.name === name))
    .filter(Boolean)
    .slice(0, 3);

  const relatedHtml = relatedCollections.length ? `<section class="sec">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">Explore Further</div>
      <h2 class="serif">Related <em>Collections</em></h2>
    </div>
    <div class="related-collections stagger-children">
${relatedCollections.map(c => renderRelatedCollectionCard(c, depth)).join('\n')}
    </div>
  </div>
</section>` : '';

  // CTA close
  const brochureHref = collection.brochureFile
    ? rel(depth, collection.brochureFile)
    : rel(depth, 'IPM Chrome Catalogue April 2026-2A.pdf');
  const enquireHref = `${rel(depth, 'contact.html')}?collection=${encodeURIComponent(collection.name)}`;

  const ctaHtml = `<section class="sec cta-close">
  <div class="wrap">
    <div class="cta-close-in reveal">
      <div class="eyebrow">Take It Further</div>
      <h2 class="serif">Find the piece that <em>fits your space.</em></h2>
      <div class="cta-close-row">
        <a href="${brochureHref}" download class="link-arrow">Request the ${escapeHtml(collection.name)} Catalogue</a>
        <a href="${enquireHref}" class="link-arrow">Enquire About ${escapeHtml(collection.name)}</a>
      </div>
    </div>
  </div>
</section>`;

  const showcaseHtml = renderShowcase(collection, depth);

  const bodyContent = `${renderHeader(depth)}

${heroHtml}

${showcaseHtml ? `${showcaseHtml}\n\n<div class="sec-divider"><span></span></div>\n\n` : ''}${storyHtml}

<div class="sec-divider"><span></span></div>

${gridHtml}

<div class="sec-divider"><span></span></div>

${finishesHtml}

${relatedHtml ? `<div class="sec-divider"><span></span></div>\n\n${relatedHtml}\n\n` : ''}<div class="sec-divider"><span></span></div>

${ctaHtml}

${renderFooter(depth)}`;

  const pageCss = `.coll-story h2 { margin: 16px 0 18px; }`;

  return renderPage({ head, bodyContent, pageCss });
}

module.exports = { renderCollectionPage, escapeHtml };
