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

function renderProductPage(group, collection, { siteBaseUrl, sizeData = null }) {
  const depth = 3; // browser URL is /collections/<slug>/<group-slug>/ (3 path segments)
  const primary = group.variants[0];
  const hasMultipleVariants = group.variants.length > 1;
  const hasSizes = !!(sizeData && sizeData.sizes && sizeData.sizes.length > 1);

  const title = `${group.skuName} — ${collection.name} | IPM Bath Fittings`;
  const baseDesc = group.description ? group.description.slice(0, 120) : '';
  const description = group.metaDescription ||
    (baseDesc
      ? `${group.skuName} — ${baseDesc}`
      : `${group.skuName} from the ${collection.name} collection by IPM Bath Fittings. Premium solid brass, available in multiple finishes.`);
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
        <div class="arch product-shot" id="imageArch">
          <img id="mainImage" src="${rel(depth, primary.image.replace(/^\//, ''))}" alt="${escapeHtml(primary.alt)}">
          ${hasMultipleVariants ? '<div class="cycle-bar"><div class="cycle-progress" id="cycleProgress"></div></div>' : ''}
          <button class="zoom-btn" id="zoomBtn" aria-label="View full size">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
          </button>
        </div>
${galleryThumbsHtml}
      </div>

      <div id="lightbox" class="lb" hidden role="dialog" aria-modal="true">
        <div class="lb-scrim" id="lbScrim"></div>
        <button class="lb-close" id="lbClose" aria-label="Close">&#x2715;</button>
        <div class="lb-frame">
          <img class="lb-img" id="lbImg" src="" alt="">
        </div>
      </div>`;

  // Spec table — keep only non-redundant fields.
  // Collection = eyebrow, Material = trust badge, Finish = prominent display below swatches.
  const specRows = [];
  specRows.push(`        <div class="row"><span class="k">Category</span><span class="v">${escapeHtml(group.category)}</span></div>`);
  if (group.dimensions) {
    specRows.push(`        <div class="row"><span class="k">Dimensions</span><span class="v">${escapeHtml(group.dimensions)}</span></div>`);
  }
  const specTableHtml = `      <div class="spec-table">
${specRows.join('\n')}
      </div>`;

  // Size picker (shown when product has size variants)
  let sizeSectionHtml = '';
  if (hasSizes) {
    const sizePills = sizeData.sizes.map((s, i) =>
      `          <button class="size-pill${i === 0 ? ' is-active' : ''}" data-size-index="${i}">${escapeHtml(s.label)}</button>`
    ).join('\n');
    sizeSectionHtml = `      <div class="size-picker">
        <span class="fp-label">Available in ${sizeData.sizes.length} Sizes</span>
        <div class="size-pills">
${sizePills}
        </div>
      </div>`;
  }

  // Finish picker / static finish line
  let finishSectionHtml;
  if (hasMultipleVariants) {
    const swatchesHtml = group.variants.map((v, i) =>
      `          <button class="finish${i === 0 ? ' is-active' : ''}" data-index="${i}" aria-label="${escapeHtml(v.finish)}"><span class="swatch ${escapeHtml(v.swatchClass)}"></span></button>`
    ).join('\n');
    finishSectionHtml = `      <div class="finish-picker">
        <span class="fp-label">Available in ${group.variants.length} Finishes</span>
        <div class="finishes-row">
${swatchesHtml}
        </div>
        <div class="finish-display">
          <span class="fd-label">Currently viewing</span>
          <span class="fd-name serif" id="fp-selected">${escapeHtml(primary.finish)}${hasSizes ? ` · ${escapeHtml(sizeData.sizes[0].label)}` : ''}</span>
        </div>
      </div>`;
  } else if (hasSizes) {
    // Single finish but multiple sizes — show finish as static but size picker active
    finishSectionHtml = `      <div class="finish-display" style="margin-top:0">
          <span class="fd-label">Finish</span>
          <span class="fd-name serif" id="fp-selected">${escapeHtml(primary.finish)}</span>
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

  // Embedded variant data (per-finish for the current/primary size)
  const variantData = group.variants.map(v => ({
    finish: v.finish,
    sku: v.sku,
    price: v.price || '',
    swatchClass: v.swatchClass,
    image: rel(depth, (v.image || '').replace(/^\//, '')),
    alt: v.alt || `${group.skuName} in ${v.finish}`,
  }));

  // Size matrix: sizeMatrix[sizeIdx] = array of {finish,sku,price,image,alt} per finish.
  // sizeData.sizes[].variants[].image is a bare filename — must prefix with full collection path.
  // Size matrix: sizeMatrix[sizeIdx][finishIdx] = {finish,sku,price,image,alt}
  // ALL sizes get the SAME finish list (union across sizes), padded with empty SKU where
  // a size has no entry for that finish. Image is always the shared best-image per finish
  // (same product looks identical regardless of size — only SKU/price differ).
  const sizeMatrix = hasSizes ? (() => {
    const coll = sizeData.collectionSlug;
    function imgPath(filename) {
      if (!filename) return '';
      if (filename.startsWith('/') || filename.startsWith('images/')) return rel(depth, filename.replace(/^\//, ''));
      return rel(depth, `images/products/${coll}/${filename}`);
    }
    // Best image per finish across ALL sizes (shared)
    const finishImgMap = new Map();
    sizeData.sizes.forEach(sz => sz.variants.forEach(v => {
      if (v.image && !finishImgMap.has(v.finish)) finishImgMap.set(v.finish, v.image);
    }));
    // Canonical finish order: use the size that has the most variants (usually the primary)
    const richestSize = sizeData.sizes.reduce((best, s) => s.variants.length > best.variants.length ? s : best, sizeData.sizes[0]);
    const allFinishes = richestSize.variants.map(v => v.finish);
    // Pad every size to the full finish list
    return sizeData.sizes.map(s => {
      const byFinish = new Map(s.variants.map(v => [v.finish, v]));
      return allFinishes.map(finish => {
        const v   = byFinish.get(finish);
        const img = imgPath(finishImgMap.get(finish) || v?.image || '');
        return { finish, sku: v?.sku || '', price: v?.price || '', image: img, alt: `${group.skuName} ${s.label} in ${finish}` };
      });
    });
  })() : null;

  // Price (MRP). Shown when available; otherwise the Enquire CTA stands alone.
  const priceHtml = primary.price
    ? `      <div class="price-tag"><span id="current-price">${escapeHtml(primary.price)}</span><span class="price-note">MRP</span></div>`
    : '';

  // Enquire CTA
  const enquireParams = new URLSearchParams({
    product: group.skuName,
    collection: collection.name,
  });
  if (!hasMultipleVariants) enquireParams.set('finish', primary.finish);
  const enquireHref = `${rel(depth, 'contact.html')}?${enquireParams.toString()}`;

  const infoHtml = `      <div class="eyebrow"><a href="${rel(depth, `collections/${group.collectionSlug}/`)}">${escapeHtml(collection.name)} Collection</a></div>
      <h1 class="serif">${escapeHtml(group.skuName)}</h1>
      <div class="sku-trust">
        <span class="sku-tag">Product code: <span id="current-sku">${escapeHtml(primary.sku)}</span></span>
      </div>
      <span class="trust-badge">Solid Brass · Made in India</span>
${priceHtml}
${descParagraphs}
${sizeSectionHtml}
${finishSectionHtml}
${specTableHtml}
      <button class="btn-gold" id="enquireBtn" type="button">Enquire Now</button>`;

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

  const enquiryModalHtml = `
<div id="enquiryModal" class="qmodal" role="dialog" aria-modal="true" aria-labelledby="qmodal-title" hidden>
  <div class="qmodal-scrim" id="qmodalScrim"></div>
  <div class="qmodal-panel">
    <button class="qmodal-close" id="qmodalClose" aria-label="Close">&#x2715;</button>
    <div class="qmodal-product">
      <div class="qmodal-swatch" id="qmodalSwatch"></div>
      <div class="qmodal-info">
        <div class="eyebrow" id="qmodalSku"></div>
        <h3 class="serif" id="qmodal-title">${escapeHtml(group.skuName)}</h3>
        <p id="qmodalDim">${escapeHtml(collection.name)}</p>
        <span class="qmodal-finish" id="qmodalFin">${escapeHtml(primary.finish)}</span>
      </div>
    </div>
    <form class="qmodal-form" id="qmodalForm">
      <input type="text" name="name" placeholder="Your name" autocomplete="name" required>
      <input type="tel" name="phone" placeholder="Phone number" autocomplete="tel" required>
      <textarea name="message" placeholder="Any specific requirements?" rows="3"></textarea>
      <button type="submit" class="qmodal-submit">Send Enquiry</button>
    </form>
    <div class="qmodal-confirm" id="qmodalConfirm" hidden>
      <span class="qmodal-tick">&#10003;</span>
      <p class="serif">We&rsquo;ll be in touch within 24 hours.</p>
    </div>
  </div>
</div>`;

  const bodyContent = `${renderHeader(depth)}

${breadcrumbHtml}

${productMainHtml}

${relatedHtml ? `<div class="sec-divider"><span></span></div>\n\n${relatedHtml}\n\n` : ''}${renderFooter(depth)}

${enquiryModalHtml}`;

  const pageCss = `
/* ── product main ── */
.product-main-sec { padding-top: 56px; }
.gallery .arch { aspect-ratio: 1/1; background: var(--cream); }
.gallery .arch img { transition: opacity .4s ease; }
[data-theme="light"] .gallery .arch img { mix-blend-mode: multiply; }
.gallery .arch img.is-fading { opacity: 0; }

/* progress bar (auto-cycle) */
.cycle-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,.18); }
.cycle-progress { height: 100%; background: var(--gold); width: 0%; transition: width linear; }

/* ── info column ── */
.info .eyebrow a { transition: color .25s; }
.info .eyebrow a:hover { color: var(--gold-2); }
.info h1 { font-weight: 400; font-size: clamp(32px, 3.8vw, 52px); line-height: 1.05; margin: 12px 0 0; }
.info p { color: var(--soft); margin-top: 4px; font-size: 14px; }
.info p + p { margin-top: 10px; }

.sku-trust { margin-top: 10px; }
.sku-tag { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400; color: var(--soft); letter-spacing: .02em; }
.trust-badge {
  display: inline-block; margin-top: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  letter-spacing: .14em; text-transform: uppercase;
  color: var(--gold); border: 1px solid var(--gold-pale);
  background: var(--gold-pale); padding: 5px 12px; border-radius: 99px;
}

.price-tag { display: flex; align-items: baseline; gap: 8px; margin: 20px 0 6px; }
.price-tag #current-price { font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: clamp(26px, 2.8vw, 34px); color: var(--gold-2); line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.price-tag .price-note { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--soft); }

/* ── finish picker (product page) ── */
.finish-picker { margin: 24px 0 0; }
.fp-label {
  display: block; font-family: 'DM Sans', sans-serif; font-size: 10px;
  letter-spacing: .18em; text-transform: uppercase; color: var(--soft);
  font-weight: 400; margin-bottom: 14px;
}

/* prominent finish name display below swatches */
.finish-display {
  display: flex; align-items: baseline; gap: 14px;
  margin-top: 20px; padding: 16px 0 4px;
  border-top: 1px solid var(--line);
}
.fd-label {
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  letter-spacing: .2em; text-transform: uppercase; color: var(--soft);
  flex-shrink: 0; white-space: nowrap; padding-top: 4px;
}
.fd-name {
  font-family: 'Cormorant Garamond', serif; font-weight: 400;
  font-size: clamp(24px, 2.8vw, 32px); color: var(--ink);
  line-height: 1.1; transition: opacity .18s;
}
.fd-name.is-fading { opacity: 0; }
/* Override global finishes-row for the picker: compact uniform grid */
.finish-picker .finishes-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, 40px);
  gap: 10px;
  justify-content: start;
}
.finish-picker .finish {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; background: none; border: 0; padding: 3px;
  border-radius: 50%;
  transition: background .15s;
}
.finish-picker .finish:hover { background: var(--cream-deep); }
.finish-picker .finish .swatch {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--line-2);
  box-shadow: 0 1px 3px rgba(0,0,0,.12);
  transition: box-shadow .2s, transform .2s;
  display: block;
}
.finish-picker .finish.is-active { background: transparent; }
.finish-picker .finish.is-active .swatch {
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--gold);
  transform: scale(1.12);
}
.finish-picker .finish .label { display: none; } /* name shown in fp-selected */

.btn-gold { margin-top: 6px; width: 100%; justify-content: center; cursor: pointer; }
@media (min-width: 860px) { .btn-gold { width: auto; padding: 17px 48px; } }

/* ── size picker ── */
.size-picker { margin: 20px 0 4px; }
.size-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.size-pill {
  font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: .06em;
  padding: 7px 18px; border-radius: 100px; cursor: pointer;
  border: 1px solid var(--line-2); background: transparent; color: var(--soft);
  transition: border-color .18s, background .18s, color .18s;
}
.size-pill:hover { border-color: var(--gold-2); color: var(--ink); }
.size-pill.is-active { background: var(--ink); color: var(--bg); border-color: var(--ink); font-weight: 500; }

/* ── enquiry modal (matches home page qmodal) ── */
@keyframes qscrimIn { from { opacity:0; } to { opacity:1; } }
.qmodal { position:fixed; inset:0; z-index:200; display:flex; align-items:flex-end; justify-content:center; }
.qmodal[hidden] { display:none; }
.qmodal-scrim { position:absolute; inset:0; background:var(--scrim-2); backdrop-filter:blur(4px); animation:qscrimIn .3s ease forwards; }
.qmodal-panel { position:relative; background:var(--paper); border-radius:24px 24px 0 0; padding:48px 52px 52px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; animation:qpanelIn .4s cubic-bezier(.2,.6,.2,1) forwards; }
@keyframes qpanelIn { from{transform:translateY(100%);opacity:0;} to{transform:translateY(0);opacity:1;} }
.qmodal-close { position:absolute; top:20px; right:20px; width:36px; height:36px; border:1px solid var(--line-2); background:transparent; border-radius:50%; cursor:pointer; color:var(--soft); font-size:14px; display:flex; align-items:center; justify-content:center; transition:background .2s,color .2s; }
.qmodal-close:hover { background:var(--ink); color:var(--bg); }
.qmodal-product { display:flex; gap:20px; margin-bottom:32px; align-items:center; }
.qmodal-swatch { width:72px; height:72px; border-radius:12px; flex-shrink:0; overflow:hidden; background:var(--cream); }
.qmodal-swatch img { width:100%; height:100%; object-fit:contain; padding:4%; box-sizing:border-box; }
.qmodal-info .eyebrow { margin-bottom:6px; }
.qmodal-info h3 { font-size:22px; font-weight:400; margin-bottom:6px; line-height:1.2; }
.qmodal-info p { font-size:13px; color:var(--faint); margin-bottom:4px; }
.qmodal-finish { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); }
.qmodal-form { display:flex; flex-direction:column; gap:14px; }
.qmodal-form input, .qmodal-form textarea { background:var(--cream); border:1px solid var(--line); border-radius:10px; padding:14px 18px; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:300; color:var(--ink); outline:none; transition:border-color .25s,box-shadow .25s; resize:none; width:100%; }
.qmodal-form input:focus, .qmodal-form textarea:focus { border-color:var(--gold); box-shadow:0 0 0 3px var(--gold-pale); }
.qmodal-submit { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:.22em; text-transform:uppercase; background:var(--gold); color:var(--on-gold); border:0; border-radius:100px; padding:16px 32px; cursor:pointer; align-self:flex-start; transition:background .3s,transform .2s; }
.qmodal-submit:hover { background:var(--gold-2); }
.qmodal-submit:active { transform:scale(.97); }
.qmodal-confirm { text-align:center; padding:32px 0; display:flex; flex-direction:column; align-items:center; gap:14px; }
.qmodal-confirm[hidden] { display:none; }
.qmodal-tick { width:52px; height:52px; border-radius:50%; background:var(--gold-pale); border:1.5px solid var(--gold); display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--gold); }
.qmodal-confirm p { font-size:22px; color:var(--ink); }
@media (max-width:600px) { .qmodal-panel { padding:36px 24px 40px; } }

/* ── zoom button ── */
.arch { position: relative; overflow: hidden; }
.gallery .arch { cursor: zoom-in; }
.zoom-btn {
  position: absolute; bottom: 14px; right: 14px; z-index: 2;
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.28);
  background: rgba(24,22,15,.52);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.85);
  transition: opacity .22s, transform .22s, background .18s;
}
.arch:hover .zoom-btn,
.arch:focus-within .zoom-btn { opacity: 1; transform: scale(1); }
.zoom-btn:hover { background: rgba(154,115,64,.82); }

/* ── lightbox ── */
.lb {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  animation: lbIn .22s ease both;
}
.lb[hidden] { display: none; }
@keyframes lbIn { from { opacity: 0; } to { opacity: 1; } }
.lb-scrim {
  position: absolute; inset: 0;
  background: rgba(12,10,6,.88);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  cursor: zoom-out;
}
.lb-close {
  position: absolute; top: 20px; right: 24px; z-index: 1;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.22);
  background: rgba(24,22,15,.6); backdrop-filter: blur(8px);
  color: #fff; font-size: 18px; cursor: pointer; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  transition: background .18s;
}
.lb-close:hover { background: rgba(154,115,64,.75); }
.lb-frame {
  position: relative; z-index: 1;
  max-width: min(92vw, 900px); max-height: 90vh;
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,.7);
  animation: lbZoom .28s cubic-bezier(.2,.6,.2,1) both;
}
@keyframes lbZoom { from { transform: scale(.92); } to { transform: scale(1); } }
.lb-img { display: block; max-width: 100%; max-height: 90vh; object-fit: contain; background: var(--cream); }
`;

  const pageJs = hasMultipleVariants ? `
const variantData = ${JSON.stringify(variantData, null, 2)};
const mainImage    = document.getElementById('mainImage');
const currentSku   = document.getElementById('current-sku');
const fpSelected   = document.getElementById('fp-selected');
const currentPrice = document.getElementById('current-price');
const enquireBtn   = document.getElementById('enquireBtn');
const cycleProgress = document.getElementById('cycleProgress');
// Always live-query finish buttons so DOM replacements by sizeJs don't break references.
function liveFinishBtns() { return Array.from(document.querySelectorAll('.finish-picker .finish')); }

const CYCLE_MS = 3000;
let activeIdx = 0;
let cycleTimer = null;
let userPaused = false;
let resumeTimer = null;

function applyVariant(idx, crossfade) {
  const v = variantData[idx];
  activeIdx = idx;
  // Live query every time so highlighting works even after DOM updates by sizeJs.
  liveFinishBtns().forEach((b, k) => b.classList.toggle('is-active', k === idx));
  if (fpSelected) { fpSelected.classList.add('is-fading'); setTimeout(() => { fpSelected.textContent = v.finish${hasSizes ? " + (window._ipmActiveSize ? ' · ' + window._ipmActiveSize : '')" : ''}; fpSelected.classList.remove('is-fading'); }, 180); }
  if (currentSku) currentSku.textContent = v.sku;
  if (currentPrice && v.price) currentPrice.textContent = v.price;
  const url = new URL(enquireBtn.href, window.location.href);
  url.searchParams.set('finish', v.finish);
  enquireBtn.href = url.pathname + url.search;
  if (crossfade) {
    mainImage.classList.add('is-fading');
    setTimeout(() => { mainImage.src = v.image; mainImage.alt = v.alt; mainImage.onload = () => mainImage.classList.remove('is-fading'); }, 200);
  } else {
    mainImage.src = v.image; mainImage.alt = v.alt;
  }
}

function startProgress() {
  if (!cycleProgress) return;
  cycleProgress.style.transition = 'none'; cycleProgress.style.width = '0%';
  void cycleProgress.offsetWidth;
  cycleProgress.style.transition = 'width ' + CYCLE_MS + 'ms linear'; cycleProgress.style.width = '100%';
}
function stopProgress() {
  if (!cycleProgress) return;
  cycleProgress.style.transition = 'none'; cycleProgress.style.width = '0%';
}
function scheduleNext() {
  clearTimeout(cycleTimer); if (userPaused) return;
  startProgress();
  cycleTimer = setTimeout(() => { applyVariant((activeIdx + 1) % variantData.length, true); scheduleNext(); }, CYCLE_MS);
}
function pauseCycle(resumeAfter) {
  clearTimeout(cycleTimer); clearTimeout(resumeTimer); stopProgress();
  if (resumeAfter) resumeTimer = setTimeout(() => { userPaused = false; scheduleNext(); }, resumeAfter);
}
// Expose pauseCycle so sizeJs (separate closure) can reach it
window._ipmPauseCycle = pauseCycle;
window._ipmScheduleNext = scheduleNext;
window._ipmUserPaused = () => userPaused;
window._ipmSetPaused = (v) => { userPaused = v; };

${hasSizes ? '// Finish clicks managed by sizeJs for size-group pages.' : `
// Click to select — pause auto, resume after 8s
liveFinishBtns().forEach((btn, i) => {
  btn.addEventListener('click', () => { userPaused = true; pauseCycle(8000); applyVariant(i, true); });
});`}

// Hover over picker OR image — pause while hovering
const picker = document.querySelector('.finish-picker');
if (picker) {
  picker.addEventListener('mouseenter', () => pauseCycle(0));
  picker.addEventListener('mouseleave', () => { if (!userPaused) scheduleNext(); });
}
const imageArch = document.getElementById('imageArch');
if (imageArch) {
  imageArch.addEventListener('mouseenter', () => pauseCycle(0));
  imageArch.addEventListener('mouseleave', () => { if (!userPaused) scheduleNext(); });
}

setTimeout(scheduleNext, 1200);
` : '';

  // Size picker JS — no button cloning; uses event delegation + shared image per finish.
  const sizeJs = hasSizes ? `
(function() {
  const sizeMatrix  = ${JSON.stringify(sizeMatrix, null, 2)};
  const sizePills   = Array.from(document.querySelectorAll('.size-pill'));
  const mainImage   = document.getElementById('mainImage');
  const currentSku  = document.getElementById('current-sku');
  const currentPrice = document.getElementById('current-price');
  const fpSelected  = document.getElementById('fp-selected');
  const enquireBtn  = document.getElementById('enquireBtn');

  let activeSizeIdx   = 0;
  let activeFinishIdx = 0;

  // Build unified image map: one best image per finish shared across all sizes.
  const finishImages = {};
  sizeMatrix.forEach(sz => sz.forEach(v => { if (v.image && !finishImages[v.finish]) finishImages[v.finish] = v.image; }));

  function pause(ms) { if (window._ipmPauseCycle) { if (window._ipmSetPaused) window._ipmSetPaused(true); window._ipmPauseCycle(ms); } }
  function resume() { if (window._ipmScheduleNext && window._ipmUserPaused && !window._ipmUserPaused()) window._ipmScheduleNext(); }

  function setActiveFinish(fi) {
    activeFinishIdx = fi;
    // Live query — always correct even without cloning
    Array.from(document.querySelectorAll('.finish-picker .finish')).forEach((b, k) => b.classList.toggle('is-active', k === fi));
  }

  function applyCombo(si, fi, crossfade) {
    const sz = sizeMatrix[si]; if (!sz) return;
    const v  = sz[fi] || sz[0]; if (!v) return;
    const img = finishImages[v.finish] || v.image || '';
    const label = sizePills[si] ? sizePills[si].textContent : '';
    window._ipmActiveSize = label;
    if (currentSku) currentSku.textContent = v.sku;
    if (currentPrice && v.price) currentPrice.textContent = v.price;
    if (fpSelected) {
      fpSelected.classList.add('is-fading');
      setTimeout(() => { fpSelected.textContent = v.finish + (label ? ' · ' + label : ''); fpSelected.classList.remove('is-fading'); }, 180);
    }
    if (img && mainImage) {
      if (crossfade) {
        mainImage.classList.add('is-fading');
        setTimeout(() => { mainImage.src = img; mainImage.alt = v.alt; mainImage.onload = () => mainImage.classList.remove('is-fading'); }, 200);
      } else { mainImage.src = img; mainImage.alt = v.alt; }
    }
    if (enquireBtn) {
      try { const u = new URL(enquireBtn.href, window.location.href); u.searchParams.set('finish', v.finish); u.searchParams.set('size', label); enquireBtn.href = u.pathname + u.search; } catch(e) {}
    }
  }

  // Size pill clicks
  sizePills.forEach((btn, si) => {
    btn.addEventListener('click', () => {
      sizePills.forEach((p, k) => p.classList.toggle('is-active', k === si));
      activeSizeIdx = si; pause(8000);
      applyCombo(si, activeFinishIdx, false);
    });
  });

  // Finish clicks — event delegation on .finishes-row (works without cloning)
  const finishesRow = document.querySelector('.finishes-row');
  if (finishesRow) {
    finishesRow.addEventListener('click', e => {
      const btn = e.target.closest('.finish'); if (!btn) return;
      const fi  = parseInt(btn.dataset.index, 10); if (isNaN(fi)) return;
      pause(8000); setActiveFinish(fi); applyCombo(activeSizeIdx, fi, true);
    });
  }

  // Hover on picker or size-picker → pause cycle; leave → resume
  ['.finish-picker', '.size-picker'].forEach(sel => {
    const el = document.querySelector(sel); if (!el) return;
    el.addEventListener('mouseenter', () => { if (window._ipmPauseCycle) window._ipmPauseCycle(0); });
    el.addEventListener('mouseleave', () => resume());
  });

  // Set initial display state (35mm Chrome)
  window._ipmActiveSize = sizePills[0] ? sizePills[0].textContent : '';
  applyCombo(0, 0, false);
})();
` : '';

  const enquiryJs = `
(function() {
  const qModal   = document.getElementById('enquiryModal');
  const qScrim   = document.getElementById('qmodalScrim');
  const qClose   = document.getElementById('qmodalClose');
  const qForm    = document.getElementById('qmodalForm');
  const qConfirm = document.getElementById('qmodalConfirm');
  const qSwatch  = document.getElementById('qmodalSwatch');
  const qSku     = document.getElementById('qmodalSku');
  const qTitle   = document.getElementById('qmodal-title');
  const qDim     = document.getElementById('qmodalDim');
  const qFin     = document.getElementById('qmodalFin');
  const enquireBtn = document.getElementById('enquireBtn');
  const mainImage  = document.getElementById('mainImage');
  const currentSku = document.getElementById('current-sku');
  const fpSelected = document.getElementById('fp-selected');

  function openModal() {
    const img    = mainImage ? mainImage.src : '';
    const sku    = currentSku ? currentSku.textContent : '';
    const finish = fpSelected ? fpSelected.textContent : '';
    qSwatch.innerHTML = img ? '<img src="' + img + '" alt="">' : '';
    qSku.textContent  = sku;
    qFin.textContent  = finish;
    qForm.hidden      = false;
    qConfirm.hidden   = true;
    qForm.reset();
    qModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    qClose.focus();
  }
  function closeModal() {
    qModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  if (enquireBtn) enquireBtn.addEventListener('click', openModal);
  qClose.addEventListener('click', closeModal);
  qScrim.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !qModal.hidden) closeModal(); });

  qForm.addEventListener('submit', e => {
    e.preventDefault();
    const name  = qForm.elements['name'].value.trim();
    const phone = qForm.elements['phone'].value.trim();
    const msg   = qForm.elements['message'].value.trim();
    const prod  = qTitle.textContent;
    const fin   = qFin.textContent;
    const sku   = qSku.textContent;
    const subj  = encodeURIComponent('Enquiry: ' + prod + (fin ? ' — ' + fin : ''));
    const body  = encodeURIComponent('Name: ' + name + '\\nPhone: ' + phone + '\\nProduct: ' + prod + (sku ? ' (' + sku + ')' : '') + (fin ? '\\nFinish: ' + fin : '') + (msg ? '\\n\\n' + msg : ''));
    window.open('mailto:ipmbathfittings@gmail.com?subject=' + subj + '&body=' + body);
    qForm.hidden    = true;
    qConfirm.hidden = false;
  });
})();
`;

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

  const lightboxJs = `
(function() {
  const lb     = document.getElementById('lightbox');
  const lbImg  = document.getElementById('lbImg');
  const lbClose = document.getElementById('lbClose');
  const lbScrim = document.getElementById('lbScrim');
  const zoomBtn = document.getElementById('zoomBtn');
  const mainImg = document.getElementById('mainImage');
  if (!lb || !zoomBtn || !mainImg) return;

  function openLb() {
    lbImg.src = mainImg.src;
    lbImg.alt = mainImg.alt;
    lb.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }
  function closeLb() {
    lb.setAttribute('hidden', '');
    document.body.style.overflow = '';
    zoomBtn.focus();
  }

  // Click anywhere on image (or zoom button) opens lightbox
  imageArch.addEventListener('click', openLb);
  lbClose.addEventListener('click', closeLb);
  lbScrim.addEventListener('click', closeLb);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });
})();
`;

  return renderPage({ head, bodyContent, pageCss, pageJs: pageJs + sizeJs + galleryJs + lightboxJs + enquiryJs });
}

module.exports = { renderProductPage };
