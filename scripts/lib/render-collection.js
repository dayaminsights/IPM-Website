const { rel, imgOrNoPhoto, renderHead, renderHeader, renderFooter, renderPage } = require('./layout');

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
          <div class="arch product-shot">${imgOrNoPhoto(primary.image ? rel(depth, primary.image.replace(/^\//, '')) : '', escapeHtml(primary.alt), 'loading="lazy"')}</div>
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
          <div class="arch product-shot">${imgOrNoPhoto(primary.image ? rel(depth, primary.image.replace(/^\//, '')) : '', escapeHtml(primary.alt), 'loading="lazy"')}</div>
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

  const captionUnderTile = !isSignature && collection.categories[0] === 'Accessories';
  const taglineLine = isSignature
    ? `\n      <p class="showcase-quote serif">"${escapeHtml(collection.tagline)}"</p>`
    : (captionUnderTile ? '' : `\n      <p class="showcase-tagline">${escapeHtml(collection.tagline)}</p>`);

  const underTileCaption = captionUnderTile
    ? `\n      <p class="showcase-tagline showcase-tagline--caption">${escapeHtml(collection.tagline)}</p>`
    : '';

  const rangeModifier = collection.categories.length >= 3 ? ' showcase--wide-range' : ' showcase--focused';

  return `<section class="sec">
  <div class="wrap">
    <div class="sec-title reveal">
      <div class="eyebrow">${eyebrowLabel}</div>
      <h2 class="serif">${heading}</h2>${taglineLine}
    </div>
    <div class="showcase stagger-children${isSignature ? ' is-signature' : ''}${rangeModifier}">
${mainTile}
${supportingTiles}
    </div>${underTileCaption}
  </div>
</section>`;
}

const HUE_ACCENTS = {
  flora: 3, cube: -2, 'cube-prima': -3, fuzone: 2, jp: -2, premium: 2,
  'para-collection': -3, allied: 3, 'zenith-collections': -2,
  'square-brass-accessories': 2, 'round-brass-accessories': -2,
  // aliva and opell-prima intentionally omitted (signature gold lines, no hue shift)
};

function renderCollectionPage(collection, productGroups, allCollections, { siteBaseUrl }) {
  const depth = 2; // browser URL is /collections/<slug>/ (2 path segments)
  const groups = productGroups.filter(g => g.collectionSlug === collection.slug);
  const hueAccent = HUE_ACCENTS[collection.slug];

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

  // Collection page redirects to the search page with this collection pre-filtered.
  // All existing links to /collections/<slug>/ auto-redirect — no link updates needed.
  const searchUrl = rel(depth, `search.html?collection=${encodeURIComponent(collection.slug)}`);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><meta http-equiv="refresh" content="0;url=${searchUrl}"><link rel="canonical" href="${canonicalPath}"><script>window.location.replace('${searchUrl}');</script></head><body></body></html>`;

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

  // Product grid — search-page card experience, pre-filtered to this collection.
  const collectionCategories = collection.categories || [];
  const catChipsHtml = collectionCategories.length > 1
    ? `      <div class="coll-cat-chips">
        <button class="chip is-active" data-cat="">All</button>
${collectionCategories.map(c => `        <button class="chip" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('\n')}
      </div>`
    : '';

  const gridHtml = `<section class="sec coll-browse-sec">
  <div class="wrap">
    <div class="coll-browse-hd reveal">
      <div>
        <div class="eyebrow">The Range</div>
        <h2 class="serif">${groups.length} ${groups.length === 1 ? 'Piece' : 'Pieces'}, One Standard <em>of Craft</em></h2>
      </div>
      <div class="sort-wrap">
        <label class="sort-label" for="collSort">Sort</label>
        <select id="collSort" class="sort-select" aria-label="Sort products">
          <option value="default">Default</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="name-asc">Name: A → Z</option>
        </select>
      </div>
    </div>
${catChipsHtml}
    <div class="search-meta" id="collMeta"></div>
    <div class="search-grid" id="collGrid"></div>
    <div class="search-empty" id="collEmpty" hidden>
      <p class="serif">No products found.</p>
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

  const accentCss = hueAccent
    ? `.showcase-tile:hover .arch img { filter: brightness(1.04) saturate(1.08) hue-rotate(${hueAccent}deg); }`
    : '';

  const pageCss = `
.coll-story h2 { margin: 16px 0 18px; }
${accentCss || ''}

/* ── browse header + sort (match search page) ── */
.coll-browse-hd { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
.coll-browse-hd h2 { margin: 8px 0 0; }
.sort-wrap { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.sort-label { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--soft); }
.sort-select { font-family:'DM Sans',sans-serif; font-size:12px; color:var(--ink); background:var(--paper); border:1px solid var(--line-2); border-radius:100px; padding:7px 32px 7px 16px; cursor:pointer; outline:none; appearance:none; -webkit-appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23635e52' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; transition:border-color .18s; }
.sort-select:focus { border-color:var(--gold-2); }
/* category chips */
.coll-cat-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
.chip { font-family:'DM Sans',sans-serif; font-size:11.5px; letter-spacing:.04em; padding:7px 16px; border-radius:100px; cursor:pointer; border:1px solid var(--line-2); background:transparent; color:var(--soft); transition:border-color .18s,background .18s,color .18s; }
.chip:hover { border-color:var(--gold-2); color:var(--ink); }
.chip.is-active { background:var(--ink); color:var(--bg); border-color:var(--ink); }
.search-meta { font-family:'DM Sans',sans-serif; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin-bottom:28px; min-height:18px; }

/* ── search-style card grid (shared with search.html) ── */
.search-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:24px; }
.search-card { display:flex; flex-direction:column; border-radius:18px; overflow:hidden; border:1px solid var(--line); background:var(--paper); transition:transform .28s cubic-bezier(.2,.6,.2,1),box-shadow .28s,border-color .2s; text-decoration:none; }
.search-card:hover { transform:translateY(-6px); box-shadow:0 24px 56px -16px rgba(24,22,15,.42); border-color:var(--line-2); }
.card-stage { position:relative; aspect-ratio:4/3; overflow:hidden; background:var(--cream); flex-shrink:0; }
.card-stage img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:5%; box-sizing:border-box; transition:opacity .38s ease; mix-blend-mode:multiply; }
[data-theme="light"] .card-stage img { mix-blend-mode:multiply; }
.card-stage img.is-hidden { opacity:0; pointer-events:none; }
.card-stage img.is-visible { opacity:1; }
.card-swatches { position:absolute; bottom:10px; left:12px; z-index:2; display:flex; gap:5px; align-items:center; }
.card-swatch-dot { width:10px; height:10px; border-radius:50%; border:1.5px solid rgba(255,255,255,.55); box-shadow:0 1px 3px rgba(0,0,0,.2); transition:transform .15s,border-color .15s; }
.card-swatch-dot.is-active { transform:scale(1.35); border-color:#fff; box-shadow:0 1px 6px rgba(0,0,0,.4); }
.card-finish-count { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.7); margin-left:4px; }
.card-arrow { position:absolute; top:50%; transform:translateY(-50%); z-index:3; width:30px; height:30px; border-radius:50%; border:0; background:rgba(18,14,8,.55); backdrop-filter:blur(6px); color:rgba(255,255,255,.85); font-size:20px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .18s,background .18s,transform .18s; padding:0 0 1px; }
.card-arrow-prev { left:8px; }
.card-arrow-next { right:8px; }
.search-card:hover .card-arrow { opacity:1; }
.card-arrow:hover { background:rgba(154,115,64,.75); transform:translateY(-50%) scale(1.08); }
.card-body { display:flex; flex-direction:column; flex:1; padding:16px 18px 18px; }
.card-coll { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--gold); margin-bottom:5px; }
.card-name { font-family:'Cormorant Garamond',serif; font-weight:400; font-size:20px; line-height:1.2; color:var(--ink); flex:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.card-meta { display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-top:14px; padding-top:12px; border-top:1px solid var(--line); }
.card-cat { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:.06em; color:var(--soft); }
.card-price { font-family:'DM Sans',sans-serif; font-weight:600; font-size:15px; color:var(--gold-2); font-variant-numeric:tabular-nums; letter-spacing:-0.01em; white-space:nowrap; flex-shrink:0; }
.search-empty { text-align:center; padding:60px 0; color:var(--soft); display:none; }
.search-empty p.serif { font-size:clamp(24px,3.5vw,36px); color:var(--ink); margin-bottom:12px; }
@media (max-width:560px) { .search-grid { grid-template-columns:repeat(2,1fr); gap:12px; } .card-body { padding:10px 12px 14px; } .card-name { font-size:16px; } }
`;

  const pageJs = `
(function() {
  const COLL_SLUG = '${collection.slug}';
  const SEARCH_INDEX = '${rel(depth, 'search-index.json')}';
  const grid   = document.getElementById('collGrid');
  const meta   = document.getElementById('collMeta');
  const empty  = document.getElementById('collEmpty');
  const sortEl = document.getElementById('collSort');
  const catChips = document.querySelectorAll('.coll-cat-chips .chip');
  let data = null, activeCategory = '', activeSort = 'default';

  function esc(s) { return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // Search index stores root-relative paths (images/products/..., collections/...).
  // Collection page is depth=2, so prepend ../../ to resolve correctly.
  const BASE = '../../';
  function rootPath(p) { if (!p) return ''; return p.startsWith('http') || p.startsWith('/') ? p : BASE + p; }

  function cardHtml(it) {
    const isMulti = it.variantImages && it.variantImages.length > 1;
    const mainImg = it.image
      ? '<img ' + (isMulti ? 'class="is-visible"' : '') + ' src="' + esc(rootPath(it.image)) + '" alt="' + esc(it.name) + '" loading="lazy">'
      : '<div class="no-photo"><span>No Photo<br>Available</span></div>';
    const extras = isMulti ? it.variantImages.slice(1).filter(v => v.image).map(v => '<img class="is-hidden" src="' + esc(rootPath(v.image)) + '" alt="' + esc(it.name) + ' in ' + esc(v.finish) + '" loading="lazy">').join('') : '';
    const dots = it.swatches && it.swatches.length
      ? '<div class="card-swatches" aria-hidden="true">' + it.swatches.slice(0,5).map(s => '<span class="card-swatch-dot ' + esc(s.swatch) + '" title="' + esc(s.finish) + '"></span>').join('') + (it.finishCount > 2 ? '<span class="card-finish-count">+' + (it.finishCount-1) + '</span>' : '') + '</div>' : '';
    const arrows = isMulti ? '<button class="card-arrow card-arrow-prev" aria-label="Prev finish" tabindex="-1">&#8249;</button><button class="card-arrow card-arrow-next" aria-label="Next finish" tabindex="-1">&#8250;</button>' : '';
    return '<a class="search-card" href="' + esc(rootPath(it.url)) + '" data-multi="' + (isMulti ? '1' : '0') + '"><div class="card-stage">' + mainImg + extras + dots + arrows + '</div><div class="card-body"><div class="card-coll">' + esc(it.collection) + '</div><div class="card-name">' + esc(it.name) + '</div><div class="card-meta"><span class="card-cat">' + esc(it.category) + '</span>' + (it.price ? '<span class="card-price">' + esc(it.price) + '</span>' : '') + '</div></div></a>';
  }

  function priceNum(p) { return parseFloat(String(p).replace(/[^0-9.]/g,'')) || 0; }
  function sortItems(items) {
    if (activeSort === 'price-asc')  return [...items].sort((a,b) => priceNum(a.price)-priceNum(b.price));
    if (activeSort === 'price-desc') return [...items].sort((a,b) => priceNum(b.price)-priceNum(a.price));
    if (activeSort === 'name-asc')   return [...items].sort((a,b) => a.name.localeCompare(b.name));
    return items;
  }

  const cycleTimers = new Map();
  function initCycling() {
    cycleTimers.forEach(t => clearInterval(t)); cycleTimers.clear();
    grid.querySelectorAll('.search-card[data-multi="1"]').forEach(card => {
      const imgs = Array.from(card.querySelectorAll('.card-stage img'));
      const dots = Array.from(card.querySelectorAll('.card-swatch-dot'));
      const prev = card.querySelector('.card-arrow-prev');
      const next = card.querySelector('.card-arrow-next');
      if (imgs.length < 2) return;
      let idx = 0;
      function goTo(n) {
        imgs[idx].classList.remove('is-visible'); imgs[idx].classList.add('is-hidden');
        if (dots[idx]) dots[idx].classList.remove('is-active');
        idx = (n + imgs.length) % imgs.length;
        imgs[idx].classList.remove('is-hidden'); imgs[idx].classList.add('is-visible');
        if (dots[idx]) dots[idx].classList.add('is-active');
      }
      const delay = 2200 + Math.floor(Math.random() * 1400);
      const t = setInterval(() => goTo(idx+1), delay);
      cycleTimers.set(card, t);
      card.addEventListener('mouseenter', () => { clearInterval(t); cycleTimers.delete(card); });
      if (prev) prev.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(idx-1); });
      if (next) next.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(idx+1); });
    });
  }

  function render() {
    if (!data) return;
    let items = data.items.filter(it => it.collectionSlug === COLL_SLUG);
    if (activeCategory) items = items.filter(it => it.category === activeCategory);
    items = sortItems(items);
    meta.textContent = items.length + (items.length === 1 ? ' product' : ' products');
    if (!items.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = items.map(cardHtml).join('');
    initCycling();
  }

  // Category chips
  catChips.forEach(btn => {
    btn.addEventListener('click', () => {
      catChips.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCategory = btn.dataset.cat;
      render();
    });
  });

  // Sort
  if (sortEl) sortEl.addEventListener('change', () => { activeSort = sortEl.value; render(); });

  fetch(SEARCH_INDEX).then(r => r.json()).then(d => { data = d; render(); })
    .catch(() => { meta.textContent = 'Could not load products.'; });
})();
`;

  return renderPage({ head, bodyContent, pageCss, pageJs });
}

module.exports = { renderCollectionPage, escapeHtml };
