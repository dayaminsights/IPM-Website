// Emits a flat JSON search index consumed by /search.html.
// Searchable fields: product name, SKU(s), collection, category.

function renderSearchIndex(collections, productGroups) {
  const items = productGroups.map(g => {
    const primary = g.variants[0];
    // Carry up to 6 variant images for cycling on search cards.
    // isColoured: true when any finish is not Chrome (i.e. has real coloured brass variants).
    // Ceramic sanitaryware has no brass finish at all (see resolveFinish's 'White'
    // placeholder) — exclude it so "Coloured Finishes" doesn't pull in white toilets/basins.
    const variantImages = g.variants
      .filter(v => v.image)
      .slice(0, 6)
      .map(v => ({ finish: v.finish, image: (v.image || '').replace(/^\//, ''), price: v.price || '', swatch: v.swatchClass || '' }));
    const isColoured = g.category !== 'Sanitaryware' && g.variants.some(v => v.finish !== 'Chrome');
    // swatches kept for backwards compat but dots now built from variantImages in search.html
    const swatches = variantImages.map(v => ({ finish: v.finish, swatch: v.swatch }));

    return {
      name: g.skuName,
      collection: g.collectionName,
      collectionSlug: g.collectionSlug,
      category: g.category,
      url: `collections/${g.collectionSlug}/${g.groupSlug}/`,
      image: (primary.image || '').replace(/^\//, ''),
      skus: g.variants.map(v => v.sku).join(' '),
      finishes: g.variants.map(v => v.finish).join(', '),
      finishCount: g.variants.length,
      price: primary.price || '',
      isColoured,
      variantImages,
      swatches,
    };
  });

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: items.length,
    collections: collections.map(c => ({ name: c.name, slug: c.slug })),
    items,
  });
}

module.exports = { renderSearchIndex };
