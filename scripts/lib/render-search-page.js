'use strict';
const { rel, renderHead, renderHeader, renderFooter, renderPage } = require('./layout');

const CATEGORIES = ['Faucets', 'Kitchen Mixers', 'Shower'];

function renderSearchPage(collections, { siteBaseUrl }) {
  const depth = 0;

  const head = renderHead({
    title: 'Search — IPM Bath Fittings',
    description: 'Search the full IPM Bath Fittings catalogue by product name, SKU, collection or category.',
    canonicalPath: `${siteBaseUrl}/search.html`,
    ogImage: null,
    depth,
  });

  const collectionChips = collections.map(c =>
    `<button class="chip" data-filter="collection" data-c="${c.slug}">${c.name}</button>`
  ).join('\n        ');

  const categoryChips = CATEGORIES.map(c =>
    `<button class="chip" data-filter="category" data-c="${c}">${c}</button>`
  ).join('\n        ');

  const bodyContent = `${renderHeader(depth, 'search')}

<!-- ===== STICKY SEARCH (appears after hero scrolls past) ===== -->
<div class="sticky-search" id="stickySearch">
  <div class="wrap sticky-search-in">
    <svg class="ss-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
    <input id="stickyQ" type="search" placeholder="Search products, SKUs, collections…" autocomplete="off" spellcheck="false" aria-label="Search products" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="stickySuggest">
    <button class="ss-clear" id="stickyClear" hidden aria-label="Clear search">&#x2715;</button>
    <span class="ss-count" id="stickyCount"></span>
    <div class="search-suggest ss-suggest" id="stickySuggest" role="listbox" aria-label="Search suggestions"></div>
  </div>
</div>

<!-- ===== SEARCH HERO ===== -->
<div class="sh-hero">
  <img class="sh-hero-img" src="images/collections/hero.jpg" alt="IPM Bath Fittings catalogue" loading="eager">
  <div class="sh-hero-scrim"></div>
  <div class="sh-hero-content wrap">
    <div class="eyebrow reveal">Catalogue · 924 SKUs · 16 Finishes</div>
    <h1 class="serif sh-title reveal">Find your <em>fitting</em></h1>
    <div class="search-box reveal">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="searchQ" type="search" placeholder="Name, SKU, collection or finish…" autocomplete="off" spellcheck="false" aria-label="Search products" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="heroSuggest">
      <button class="search-clear" id="searchClear" hidden aria-label="Clear search">&#x2715;</button>
      <span class="search-hint" aria-hidden="true">Press <kbd>/</kbd> to focus</span>
      <div class="search-suggest" id="heroSuggest" role="listbox" aria-label="Search suggestions"></div>
    </div>
  </div>
</div>

<!-- ===== FILTERS ===== -->
<section class="sh-filters">
  <div class="wrap">
    <div class="filter-groups reveal">
      <div class="filter-group">
        <span class="filter-label">Category</span>
        <div class="chips" id="catChips">
          <button class="chip is-active" data-filter="category" data-c="">All</button>
          ${categoryChips}
          <button class="chip chip-coloured" data-filter="coloured" data-c="1">Coloured Finishes</button>
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Collection</span>
        <div class="chips" id="collChips">
          <button class="chip is-active" data-filter="collection" data-c="">All</button>
          ${collectionChips}
        </div>
      </div>
    </div>
  </div>
</section>

<div class="sec-divider" style="margin-top:40px"><span></span></div>

<!-- ===== RESULTS ===== -->
<section class="search-results-sec">
  <div class="wrap">
    <div class="search-meta-bar">
      <span class="search-meta" id="searchMeta"></span>
      <div class="sort-wrap">
        <label class="sort-label" for="sortSelect">Sort</label>
        <select id="sortSelect" class="sort-select" aria-label="Sort results">
          <option value="featured">Featured first</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="name-asc">Name: A → Z</option>
          <option value="name-desc">Name: Z → A</option>
        </select>
      </div>
    </div>
    <div class="search-grid" id="searchGrid"></div>
    <div class="search-empty" id="searchEmpty" hidden>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".3"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <p class="serif">No products found.</p>
      <p>Try a different term or clear a filter.</p>
      <a class="btn-gold" href="collections.html">Browse Collections</a>
    </div>
  </div>
</section>

${renderFooter(depth)}`;

  const pageCss = `
/* ── hero ── */
.sh-hero {
  position: relative; height: 62vh; min-height: 440px; max-height: 700px;
  overflow: hidden; display: flex; align-items: flex-end;
  margin-top: -80px;
}
.sh-hero-img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center 42%;
}
.sh-hero-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(12,10,6,.12) 0%, rgba(12,10,6,.78) 100%);
}
.sh-hero-content { position: relative; z-index: 1; padding-bottom: 56px; width: 100%; }
.sh-hero-content .eyebrow { color: rgba(255,255,255,.62); margin-bottom: 12px; }
.sh-hero-content .eyebrow::before { background: rgba(255,255,255,.45); }
.sh-title {
  font-size: clamp(48px, 7vw, 84px); color: #fff;
  line-height: 1.0; margin: 0 0 36px; font-weight: 400;
}
.sh-title em { color: var(--gold-2); font-style: italic; }

/* ── search box ── */
.search-box { position: relative; max-width: 600px; }
.search-box .search-icon {
  position: absolute; left: 22px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; stroke: var(--soft); pointer-events: none;
  transition: stroke .2s;
}
.search-box:focus-within .search-icon { stroke: var(--gold-2); }
.search-box input {
  width: 100%; padding: 18px 52px 18px 54px;
  font-family: 'DM Sans', sans-serif; font-size: 16px; color: var(--ink);
  background: var(--paper); border: 1.5px solid transparent;
  border-radius: 100px; outline: none;
  transition: border-color .22s, box-shadow .22s;
  box-shadow: 0 6px 40px rgba(0,0,0,.32);
}
.search-box input:focus {
  border-color: var(--gold-2);
  box-shadow: 0 0 0 4px rgba(196,155,90,.22), 0 6px 40px rgba(0,0,0,.32);
}
.search-clear {
  position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px; border-radius: 50%; border: 0;
  background: var(--cream-deep); color: var(--soft); cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: background .18s, color .18s;
}
.search-clear:hover { background: var(--gold); color: #fff; }
.search-hint {
  position: absolute; right: 60px; top: 50%; transform: translateY(-50%);
  font-size: 11px; color: rgba(99,94,82,.55); letter-spacing: .04em;
  pointer-events: none; white-space: nowrap; transition: opacity .2s;
}
.search-hint kbd {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 4px; font-size: 10px;
  border: 1px solid rgba(99,94,82,.3); background: rgba(99,94,82,.1);
  font-family: inherit; margin: 0 2px; color: var(--soft);
}
.search-box:focus-within .search-hint,
.search-box input:not(:placeholder-shown) + .search-clear + .search-hint { opacity: 0; }

/* ── search suggestions (typeahead dropdown) ── */
.search-suggest {
  position: absolute; top: calc(100% + 10px); left: 0; right: 0; z-index: 40;
  background: var(--paper); border: 1px solid var(--line);
  border-radius: 18px; box-shadow: var(--shadow-lg);
  padding: 6px; max-height: 64vh; overflow-y: auto;
  opacity: 0; transform: translateY(-8px) scale(.99); pointer-events: none;
  transition: opacity .2s cubic-bezier(.2,.6,.2,1), transform .2s cubic-bezier(.2,.6,.2,1);
}
.search-suggest.is-open { opacity: 1; transform: none; pointer-events: auto; }
.suggest-group-label {
  font-family: 'DM Sans', sans-serif; font-size: 9px; letter-spacing: .22em;
  text-transform: uppercase; color: var(--faint); padding: 13px 14px 6px;
}
.suggest-group-label:first-child { padding-top: 8px; }
.suggest-item {
  display: flex; align-items: center; gap: 13px; width: 100%;
  padding: 9px 12px; border: 0; background: transparent; cursor: pointer;
  border-radius: 12px; text-align: left; color: var(--ink);
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 300;
  transition: background .14s;
}
.suggest-item:hover, .suggest-item.is-active { background: var(--cream); }
.suggest-thumb {
  width: 40px; height: 40px; border-radius: 9px; flex-shrink: 0;
  background: var(--cream); object-fit: contain; padding: 3px;
  border: 1px solid var(--line);
}
[data-theme="light"] .suggest-thumb { mix-blend-mode: multiply; }
.suggest-ic {
  width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--gold-pale); color: var(--gold);
}
.suggest-ic svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.suggest-main { flex: 1; min-width: 0; line-height: 1.3; }
.suggest-name { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.suggest-name mark { background: var(--gold-pale); color: inherit; padding: 0 1px; border-radius: 2px; }
.suggest-sub {
  display: block; font-size: 11px; color: var(--soft);
  letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.suggest-kind {
  font-family: 'DM Sans', sans-serif; font-size: 9px; letter-spacing: .16em;
  text-transform: uppercase; color: var(--faint); flex-shrink: 0; padding-left: 6px;
}
.ss-suggest { top: calc(100% + 1px); left: 64px; right: 64px; border-radius: 0 0 18px 18px; }
@media (max-width: 860px) { .ss-suggest { left: 28px; right: 28px; } }
@media (max-width: 600px) { .ss-suggest { left: 16px; right: 16px; } }

/* ── filters ── */
/* ── sticky search (slides in when hero box scrolls away) ── */
.sticky-search {
  position: fixed; top: 80px; left: 0; right: 0; z-index: 55;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px) saturate(1.4); -webkit-backdrop-filter: blur(12px) saturate(1.4);
  border-bottom: 1px solid var(--line);
  transform: translateY(-130%);
  transition: transform .32s cubic-bezier(.2,.6,.2,1);
}
.sticky-search.is-visible { transform: translateY(0); }
.sticky-search-in { display: flex; align-items: center; gap: 14px; height: 64px; position: relative; }
.ss-icon { width: 18px; height: 18px; stroke: var(--soft); flex-shrink: 0; }
.sticky-search:focus-within .ss-icon { stroke: var(--gold-2); }
#stickyQ {
  flex: 1; border: 0; background: none; outline: none;
  font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--ink);
  min-width: 0; letter-spacing: .01em;
}
#stickyQ::placeholder { color: var(--soft); }
.ss-clear {
  width: 28px; height: 28px; border-radius: 50%; border: 0; flex-shrink: 0;
  background: var(--cream-deep); color: var(--soft); font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: background .18s, color .18s;
}
.ss-clear:hover { background: var(--gold); color: #fff; }
.ss-count {
  font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--soft); white-space: nowrap; flex-shrink: 0;
  padding: 6px 14px; border: 1px solid var(--line); border-radius: 100px;
  background: var(--cream); font-variant-numeric: tabular-nums;
}
@media (max-width: 600px) { .sticky-search { top: 60px; } .ss-count { display: none; } }

.sh-filters { padding: 36px 0 44px; }
.filter-groups { display: flex; flex-direction: column; gap: 20px; }
.filter-group { display: flex; align-items: flex-start; gap: 20px; }
.filter-label {
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  letter-spacing: .22em; text-transform: uppercase; color: var(--soft);
  padding-top: 9px; white-space: nowrap; min-width: 76px; flex-shrink: 0;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  font-family: 'DM Sans', sans-serif; font-size: 11.5px; letter-spacing: .04em;
  padding: 7px 16px; border-radius: 100px; cursor: pointer;
  border: 1px solid var(--line-2); background: transparent; color: var(--soft);
  transition: border-color .18s, background .18s, color .18s, transform .12s;
  white-space: nowrap;
}
.chip:hover { border-color: var(--gold-2); color: var(--ink); transform: translateY(-1px); }
.chip:active { transform: translateY(0); }
.chip.is-active { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.chip-coloured {
  border-color: var(--gold); color: var(--gold);
  background: linear-gradient(135deg, transparent, var(--gold-pale));
}
.chip-coloured:hover { background: linear-gradient(135deg, var(--gold-pale), var(--gold-pale)); border-color: var(--gold-2); color: var(--gold-2); }
.chip-coloured.is-active { background: var(--gold); color: var(--on-gold); border-color: var(--gold); }

/* ── results header ── */
.search-results-sec { padding-top: 40px; padding-bottom: 120px; }
.search-meta-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 20px; margin-bottom: 32px; min-height: 22px; flex-wrap: wrap;
}
.search-meta {
  font-family: 'DM Sans', sans-serif; font-size: 12px;
  letter-spacing: .14em; text-transform: uppercase; color: var(--soft);
  transition: opacity .2s;
}
.sort-wrap { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sort-label {
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  letter-spacing: .18em; text-transform: uppercase; color: var(--soft);
}
.sort-select {
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--ink);
  background: var(--paper); border: 1px solid var(--line-2); border-radius: 100px;
  padding: 7px 32px 7px 16px; cursor: pointer; outline: none;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23635e52' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  transition: border-color .18s;
}
.sort-select:focus { border-color: var(--gold-2); }

/* ── search grid ── */
.search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* ── search card ── */
.search-card {
  display: flex; flex-direction: column;
  border-radius: 18px; overflow: hidden;
  border: 1px solid var(--line); background: var(--paper);
  transition: transform .28s cubic-bezier(.2,.6,.2,1), box-shadow .28s, border-color .2s;
  text-decoration: none;
}
.search-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 56px -16px rgba(24,22,15,.42);
  border-color: var(--line-2);
}

/* image stage — finish cycling happens here */
.card-stage {
  position: relative; aspect-ratio: 4/3; overflow: hidden;
  background: var(--cream); flex-shrink: 0;
}
.card-stage img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: contain; padding: 5%; box-sizing: border-box;
  transition: opacity .38s ease;
}
.card-stage img.is-hidden { opacity: 0; pointer-events: none; }
.card-stage img.is-visible { opacity: 1; }

/* finish nav arrows */
.card-arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 3;
  width: 30px; height: 30px; border-radius: 50%; border: 0;
  background: rgba(18,14,8,.55); backdrop-filter: blur(6px);
  color: rgba(255,255,255,.85); font-size: 20px; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity .18s, background .18s, transform .18s;
  padding: 0 0 1px;
}
.card-arrow-prev { left: 8px; }
.card-arrow-next { right: 8px; }
.search-card:hover .card-arrow { opacity: 1; }
.card-arrow:hover { background: rgba(154,115,64,.75); transform: translateY(-50%) scale(1.08); }
.card-arrow:active { transform: translateY(-50%) scale(.95); }

/* finish swatch dots on the stage */
.card-swatches {
  position: absolute; bottom: 10px; left: 12px; z-index: 2;
  display: flex; gap: 5px; align-items: center;
}
.card-swatch-dot {
  width: 10px; height: 10px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,.55);
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
  transition: transform .15s, border-color .15s;
}
.card-swatch-dot.is-active {
  transform: scale(1.35);
  border-color: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.4);
}
.card-finish-count {
  font-family: 'DM Sans', sans-serif; font-size: 9px;
  letter-spacing: .12em; text-transform: uppercase;
  color: rgba(255,255,255,.7); margin-left: 4px;
}

/* card body — flex column so price always sits at bottom */
.card-body {
  display: flex; flex-direction: column;
  flex: 1; padding: 16px 18px 18px;
}
.card-coll {
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  letter-spacing: .2em; text-transform: uppercase; color: var(--gold);
  margin-bottom: 5px;
}
.card-name {
  font-family: 'Cormorant Garamond', serif; font-weight: 400;
  font-size: 20px; line-height: 1.2; color: var(--ink); flex: 1;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-meta {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 8px; margin-top: 14px; padding-top: 12px;
  border-top: 1px solid var(--line);
}
.card-cat { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: .06em; color: var(--soft); }
.card-price {
  font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--gold-2);
  font-variant-numeric: tabular-nums; white-space: nowrap; flex-shrink: 0;
}

mark { background: var(--gold-pale); color: inherit; border-radius: 2px; padding: 0 1px; }

/* empty state */
.search-empty {
  display: none; text-align: center; padding: 80px 0;
  flex-direction: column; align-items: center; gap: 14px;
}
.search-empty svg { display: block; margin: 0 auto 16px; }
.search-empty p.serif { font-size: clamp(26px, 4vw, 40px); color: var(--ink); }
.search-empty p { color: var(--soft); }
.search-empty .btn-gold { margin-top: 18px; }

/* responsive */
@media (max-width: 760px) {
  .sh-hero { height: 52vh; min-height: 360px; }
  .sh-hero-content { padding-bottom: 40px; }
  .sh-title { font-size: clamp(38px, 10vw, 56px); margin-bottom: 28px; }
  .sh-filters { padding: 28px 0 36px; }
  .filter-group { flex-direction: column; gap: 8px; }
  .filter-label { padding-top: 0; min-width: auto; }
  .search-hint { display: none; }
}
@media (max-width: 560px) {
  .search-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .card-body { padding: 12px 13px 14px; }
  .card-name { font-size: 16px; }
  .card-price { font-size: 17px; }
  .card-meta { padding-top: 9px; margin-top: 10px; }
}
`;

  const pageJs = `
(function () {
  const state = { q: '', collection: '', category: '', coloured: false, sort: 'featured' };
  // Featured order: Opell Prima + Zenith bubble to top, then rest by product count
  const FEATURED_ORDER = ['opell-prima', 'zenith', 'aliva', 'flora', 'fuzone', 'pebble', 'neo', 'para', 'jp', 'cube-prima', 'premium', 'allied'];
  function featuredScore(it) { const i = FEATURED_ORDER.indexOf(it.collectionSlug); return i === -1 ? 99 : i; }
  function priceNum(it) { return parseFloat(String(it.price).replace(/[^0-9.]/g, '')) || 0; }
  function sortItems(items) {
    if (state.sort === 'featured') return [...items].sort((a, b) => featuredScore(a) - featuredScore(b));
    if (state.sort === 'price-asc')  return [...items].sort((a, b) => priceNum(a) - priceNum(b));
    if (state.sort === 'price-desc') return [...items].sort((a, b) => priceNum(b) - priceNum(a));
    if (state.sort === 'name-asc')   return [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'name-desc')  return [...items].sort((a, b) => b.name.localeCompare(a.name));
    return items;
  }
  const grid       = document.getElementById('searchGrid');
  const metaEl     = document.getElementById('searchMeta');
  const emptyEl    = document.getElementById('searchEmpty');
  const sortHint   = document.getElementById('sortHint');
  const input      = document.getElementById('searchQ');
  const clearBtn   = document.getElementById('searchClear');
  const catChips   = document.getElementById('catChips');
  const collChips  = document.getElementById('collChips');
  const sortSelect = document.getElementById('sortSelect');
  const stickySearch = document.getElementById('stickySearch');
  const stickyInput  = document.getElementById('stickyQ');
  const stickyClear  = document.getElementById('stickyClear');
  const stickyCount  = document.getElementById('stickyCount');
  let data = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function highlight(text, q) {
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  /* ── card HTML ── */
  function cardHtml(it, q) {
    const isMulti = it.variantImages && it.variantImages.length > 1;
    const imgAttrs = isMulti ? 'class="is-visible"' : '';
    const mainImg  = \`<img \${imgAttrs} src="\${esc(it.image)}" alt="\${esc(it.name)}" loading="lazy">\`;
    const extraImgs = isMulti
      ? it.variantImages.slice(1).map(v =>
          \`<img class="is-hidden" src="\${esc(v.image)}" alt="\${esc(it.name)} in \${esc(v.finish)}" loading="lazy">\`
        ).join('')
      : '';
    const dots = it.swatches && it.swatches.length
      ? \`<div class="card-swatches" aria-hidden="true">\${
          it.swatches.slice(0,5).map(s =>
            \`<span class="card-swatch-dot \${esc(s.swatch)}" title="\${esc(s.finish)}"></span>\`
          ).join('')
        }\${it.finishCount > 2 ? \`<span class="card-finish-count">+\${it.finishCount - 1}</span>\` : ''}</div>\`
      : '';
    const arrows = isMulti ? \`
  <button class="card-arrow card-arrow-prev" aria-label="Previous finish" tabindex="-1">&#8249;</button>
  <button class="card-arrow card-arrow-next" aria-label="Next finish" tabindex="-1">&#8250;</button>\` : '';
    // Per-variant prices — embed as JSON so cycling JS can swap the displayed price
    const pricesAttr = isMulti
      ? \` data-prices='\${JSON.stringify(it.variantImages.map(v => v.price || it.price || '')).replace(/'/g, '&#39;')}'\`
      : '';
    return \`<a class="search-card" href="\${esc(it.url)}" data-multi="\${isMulti ? '1' : '0'}"\${pricesAttr}>
  <div class="card-stage">
    \${mainImg}\${extraImgs}\${dots}\${arrows}
  </div>
  <div class="card-body">
    <div class="card-coll">\${esc(it.collection)}</div>
    <div class="card-name">\${highlight(it.name, q)}</div>
    <div class="card-meta">
      <span class="card-cat">\${esc(it.category)}</span>
      \${it.price ? \`<span class="card-price">\${esc(it.price)}</span>\` : ''}
    </div>
  </div>
</a>\`;
  }

  /* ── filter + render ── */
  function render() {
    if (!data) return;
    const q = state.q.trim().toLowerCase();
    let items = data.items;
    if (state.coloured)    items = items.filter(it => it.isColoured);
    if (state.category)    items = items.filter(it => it.category === state.category);
    if (state.collection)  items = items.filter(it => it.collectionSlug === state.collection);
    if (q) {
      items = items.filter(it =>
        it.name.toLowerCase().includes(q) ||
        it.skus.toLowerCase().includes(q) ||
        it.collection.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        it.finishes.toLowerCase().includes(q)
      );
    }
    items = sortItems(items);
    const shown = items.slice(0, 300);
    const active = state.coloured || state.category || state.collection || q;
    metaEl.textContent = items.length + (items.length === 1 ? ' product' : ' products') + (active ? ' found' : ' in catalogue');
    if (stickyCount) stickyCount.textContent = items.length + (items.length === 1 ? ' result' : ' results');
    if (sortHint) sortHint.hidden = !state.coloured;
    if (!shown.length) {
      grid.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';
    grid.innerHTML = shown.map(it => cardHtml(it, q)).join('');
    initCycling();
  }

  /* ── finish-image cycling + arrow navigation on multi-variant cards ── */
  const cycleTimers = new Map();
  function initCycling() {
    cycleTimers.forEach(t => clearInterval(t));
    cycleTimers.clear();
    grid.querySelectorAll('.search-card[data-multi="1"]').forEach(card => {
      const imgs     = Array.from(card.querySelectorAll('.card-stage img'));
      const dots     = Array.from(card.querySelectorAll('.card-swatch-dot'));
      const prev     = card.querySelector('.card-arrow-prev');
      const next     = card.querySelector('.card-arrow-next');
      const priceEl  = card.querySelector('.card-price');
      const prices   = card.dataset.prices ? JSON.parse(card.dataset.prices) : null;
      if (imgs.length < 2) return;
      let idx = 0;

      function goTo(newIdx) {
        imgs[idx].classList.remove('is-visible'); imgs[idx].classList.add('is-hidden');
        if (dots[idx]) dots[idx].classList.remove('is-active');
        idx = (newIdx + imgs.length) % imgs.length;
        imgs[idx].classList.remove('is-hidden'); imgs[idx].classList.add('is-visible');
        if (dots[idx]) dots[idx].classList.add('is-active');
        // Swap price when it differs per finish
        if (priceEl && prices) {
          const p = prices[idx];
          if (p) priceEl.textContent = p;
        }
      }
      function advance() { goTo(idx + 1); }

      const delay = 2200 + Math.floor(Math.random() * 1400);
      const t = setInterval(advance, delay);
      cycleTimers.set(card, t);

      // Pause cycle on hover; resume when leaving
      card.addEventListener('mouseenter', () => { clearInterval(t); cycleTimers.delete(card); });

      // Arrow buttons — stop propagation so the card link doesn't fire
      if (prev) prev.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(idx - 1); });
      if (next) next.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(idx + 1); });
    });
  }

  /* ── chip helpers ── */
  function activateChip(group, value) {
    group.querySelectorAll('.chip').forEach(b => b.classList.toggle('is-active', b.dataset.c === value));
  }

  catChips.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    if (btn.dataset.filter === 'coloured') {
      const wasActive = btn.classList.contains('is-active');
      catChips.querySelectorAll('.chip').forEach(b => b.classList.remove('is-active'));
      if (!wasActive) { btn.classList.add('is-active'); state.coloured = true; state.category = ''; }
      else { state.coloured = false; catChips.querySelector('[data-c=""]').classList.add('is-active'); }
    } else {
      state.coloured = false;
      catChips.querySelectorAll('.chip').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.category = btn.dataset.c;
    }
    render();
  });
  collChips.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state.collection = btn.dataset.c;
    activateChip(collChips, state.collection);
    render();
  });

  /* ── search input (hero + sticky kept in sync) ── */
  function setQuery(v, fromSticky) {
    state.q = v;
    if (input.value !== v) input.value = v;
    if (stickyInput && stickyInput.value !== v) stickyInput.value = v;
    clearBtn.hidden = !v;
    if (stickyClear) stickyClear.hidden = !v;
    const hint = document.querySelector('.search-hint'); if (hint) hint.style.opacity = v ? '0' : '';
    render();
  }
  input.addEventListener('input', () => setQuery(input.value, false));
  if (stickyInput) stickyInput.addEventListener('input', () => setQuery(stickyInput.value, true));
  clearBtn.addEventListener('click', () => { setQuery(''); input.focus(); });
  if (stickyClear) stickyClear.addEventListener('click', () => { setQuery(''); stickyInput.focus(); });

  /* ── sticky bar appears when hero search box scrolls out of view ── */
  const heroBox = document.querySelector('.sh-hero .search-box');
  if (heroBox && stickySearch && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      stickySearch.classList.toggle('is-visible', !visible);
    }, { rootMargin: '-90px 0px 0px 0px' }).observe(heroBox);
  }

  /* ── sort ── */
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });

  /* ── typeahead suggestions ── */
  let suggestIdx = null;
  function buildSuggestIdx() {
    const colls = new Map(), cats = new Map(), fins = new Map();
    data.items.forEach(it => {
      if (it.collectionSlug) colls.set(it.collectionSlug, it.collection);
      if (it.category) cats.set(it.category, it.category);
      String(it.finishes || '').split(/,\\s*/).forEach(f => { f = f.trim(); if (f) fins.set(f.toLowerCase(), f); });
    });
    suggestIdx = {
      products: data.items,
      collections: [...colls].map(([slug, name]) => ({ slug, name })),
      categories: [...cats.values()],
      finishes: [...fins.values()]
    };
  }
  const KIND_ICON = {
    collection: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
    category:   '<svg viewBox="0 0 24 24"><path d="M3 5h7l11 11-7 7L3 12V5z"/><circle cx="7.5" cy="9.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
    finish:     '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>'
  };
  function getSuggestions(raw) {
    const q = String(raw).trim().toLowerCase();
    if (!q || !suggestIdx) return [];
    const rank = s => { const i = s.toLowerCase().indexOf(q); return i < 0 ? 999 : i; };
    const prods = suggestIdx.products
      .filter(p => p.name.toLowerCase().includes(q) || String(p.skus).toLowerCase().includes(q))
      .sort((a, b) => rank(a.name) - rank(b.name)).slice(0, 6)
      .map(p => ({ kind: 'product', label: p.name, sub: p.collection + ' · ' + p.category, url: p.url, image: p.image }));
    const colls = suggestIdx.collections.filter(c => c.name.toLowerCase().includes(q)).slice(0, 3)
      .map(c => ({ kind: 'collection', label: c.name, value: c.slug }));
    const cats = suggestIdx.categories.filter(c => c.toLowerCase().includes(q)).slice(0, 2)
      .map(c => ({ kind: 'category', label: c, value: c }));
    const fins = suggestIdx.finishes.filter(f => f.toLowerCase().includes(q)).slice(0, 3)
      .map(f => ({ kind: 'finish', label: f, value: f }));
    return [...prods, ...colls, ...cats, ...fins];
  }
  function suggestHtml(items, raw) {
    const q = raw.trim();
    const groups = [['product','Products'],['collection','Collections'],['category','Categories'],['finish','Finishes']];
    let html = '';
    groups.forEach(([k, lbl]) => {
      const g = items.filter(it => it.kind === k);
      if (!g.length) return;
      html += \`<div class="suggest-group-label">\${lbl}</div>\`;
      g.forEach((it, gi) => {
        const i = items.indexOf(it);
        const media = it.kind === 'product'
          ? \`<img class="suggest-thumb" src="\${esc(it.image)}" alt="" loading="lazy">\`
          : \`<span class="suggest-ic">\${KIND_ICON[it.kind] || ''}</span>\`;
        const sub  = it.sub ? \`<span class="suggest-sub">\${esc(it.sub)}</span>\` : '';
        const kind = it.kind !== 'product' ? \`<span class="suggest-kind">\${lbl.slice(0,-1)}</span>\` : '';
        html += \`<button type="button" class="suggest-item" role="option" data-i="\${i}">\${media}<span class="suggest-main"><span class="suggest-name">\${highlight(it.label, q)}</span>\${sub}</span>\${kind}</button>\`;
      });
    });
    return html;
  }
  function chooseSuggestion(items, idx) {
    const it = items[idx]; if (!it) return;
    suggesters.forEach(s => s.close());
    if (it.kind === 'product') { window.location.href = it.url; return; }
    if (it.kind === 'finish') { setQuery(it.label); }
    else {
      if (it.kind === 'collection') { state.collection = it.value; activateChip(collChips, it.value); }
      if (it.kind === 'category')   { state.coloured = false; state.category = it.value; activateChip(catChips, it.value); }
      setQuery('');
    }
    render();
    const sec = document.querySelector('.search-results-sec');
    if (sec) setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
  function makeSuggester(inp, box) {
    if (!inp || !box) return { close() {} };
    let items = [], active = -1;
    function open() {
      items = getSuggestions(inp.value); active = -1;
      if (!items.length) { close(); return; }
      box.innerHTML = suggestHtml(items, inp.value);
      box.classList.add('is-open'); inp.setAttribute('aria-expanded', 'true');
    }
    function close() { box.classList.remove('is-open'); inp.setAttribute('aria-expanded', 'false'); active = -1; }
    function move(d) {
      const btns = box.querySelectorAll('.suggest-item'); if (!btns.length) return;
      active = (active + d + btns.length) % btns.length;
      btns.forEach((b, i) => b.classList.toggle('is-active', i === active));
      btns[active].scrollIntoView({ block: 'nearest' });
    }
    inp.addEventListener('input', open);
    inp.addEventListener('focus', () => { if (inp.value.trim()) open(); });
    inp.addEventListener('keydown', e => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); chooseSuggestion(items, active); }
      else if (e.key === 'Escape') { e.stopPropagation(); close(); }
    });
    inp.addEventListener('blur', () => setTimeout(close, 130));
    box.addEventListener('mousedown', e => {
      const btn = e.target.closest('.suggest-item'); if (!btn) return;
      e.preventDefault(); chooseSuggestion(items, +btn.dataset.i);
    });
    return { close };
  }
  const suggesters = [];

  /* ── keyboard shortcut ── */
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== input && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault(); input.focus(); input.select();
    }
    if (e.key === 'Escape' && document.activeElement === input) { clearBtn.click(); input.blur(); }
  });

  /* ── pre-fill from URL ── */
  const params = new URLSearchParams(location.search);
  if (params.get('q'))          { input.value = params.get('q'); if (stickyInput) stickyInput.value = params.get('q'); state.q = params.get('q'); clearBtn.hidden = false; if (stickyClear) stickyClear.hidden = false; }
  if (params.get('category'))   { state.category   = params.get('category'); }
  if (params.get('collection')) { state.collection = params.get('collection'); }
  if (params.get('coloured'))   { state.coloured   = true; }

  /* ── load index ── */
  fetch('search-index.json')
    .then(r => r.json())
    .then(d => {
      data = d;
      buildSuggestIdx();
      suggesters.push(
        makeSuggester(input, document.getElementById('heroSuggest')),
        makeSuggester(stickyInput, document.getElementById('stickySuggest'))
      );
      // Activate chips matching URL state
      if (state.category)   activateChip(catChips,  state.category);
      else if (state.coloured) { catChips.querySelectorAll('.chip').forEach(b => b.classList.remove('is-active')); catChips.querySelector('.chip-coloured').classList.add('is-active'); }
      if (state.collection) activateChip(collChips, state.collection);
      render();
    })
    .catch(() => { metaEl.textContent = 'Search index unavailable — run the build.'; });
})();
`;

  return renderPage({ head, bodyContent, pageCss, pageJs });
}

module.exports = { renderSearchPage };
