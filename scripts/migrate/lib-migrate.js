'use strict';
// Shared helpers for the catalog migration (ITEM MASTER FOR WEBSITE.xls -> build pipeline).
// Pure functions only — no I/O — so transform-master.js and match-assets.js can both use them.

const { slugify } = require('../lib/slugify');

// ---------------------------------------------------------------------------
// Finishes
// ---------------------------------------------------------------------------
// ItemCode finish suffixes -> canonical finish name. Order matters: the regex
// alternation must try LONGER suffixes first (GMBG before GMB, MBG before MB...).
// Verified against the full ItemCode vocabulary. GLD=Rich Gold, RGLD=Rose Gold
// (confirmed via the Rich/Rose Gold collection names). Non-finish suffixes
// (EXP, SL, EXPDM, EXPSH, HK, R, numeric sizes) are intentionally absent so
// size/type variants stay as separate products (finish-only grouping).
const FINISH_SUFFIXES = [
  ['GMBG', 'Gunmetal Black Gold'],
  ['MBEG', 'Matt Beige Gold'],
  ['MGRG', 'Matt Grey Gold'],
  ['RGLD', 'Rose Gold'],
  ['MWG', 'Matt White Gold'],
  ['MBG', 'Matt Black Gold'],
  ['GLD', 'Rich Gold'],
  ['GMB', 'Gunmetal Black'],
  ['MBE', 'Matt Beige'],
  ['MGR', 'Matt Grey'],
  ['MW', 'Matt White'],
  ['MB', 'Matt Black'],
];
const FINISH_SUFFIX_RE = new RegExp('-(' + FINISH_SUFFIXES.map(p => p[0]).join('|') + ')$', 'i');
const SUFFIX_TO_FINISH = new Map(FINISH_SUFFIXES.map(([s, f]) => [s.toUpperCase(), f]));

// Finish phrases that can appear inside Collection Names / Item Names. Longest first.
const FINISH_PHRASES = [
  'Gunmetal Black Gold', 'Matt Beige Gold', 'Matt Black Gold', 'Matt Grey Gold',
  'Matt White Gold', 'Gunmetal Black', 'Rich Gold', 'Rose Gold',
  'Matt Beige', 'Matt Black', 'Matt Grey', 'Matt White', 'Chrome',
];
const FINISH_PHRASE_RE = new RegExp('\\b(' + FINISH_PHRASES.join('|') + ')\\b', 'i');

// Canonical finish ordering + swatch class for the Finishes sheet.
const FINISH_TABLE = [
  ['Chrome', 'f-chrome', 1],
  ['Rich Gold', 'f-rich-gold', 2],
  ['Rose Gold', 'f-rose-gold', 3],
  ['Gunmetal Black', 'f-gunmetal', 4],
  ['Gunmetal Black Gold', 'f-gunmetal-black-gold', 5],
  ['Matt Black', 'f-matt-black', 6],
  ['Matt Black Gold', 'f-matt-black-gold', 7],
  ['Matt White', 'f-matt-white', 8],
  ['Matt White Gold', 'f-matt-white-gold', 9],
  ['Matt Beige', 'f-matt-beige', 10],
  ['Matt Beige Gold', 'f-matt-beige-gold', 11],
  ['Matt Grey', 'f-matt-grey', 12],
  ['Matt Grey Gold', 'f-matt-grey-gold', 13],
];
const FINISH_SWATCH = new Map(FINISH_TABLE.map(([n, c]) => [n, c]));
const FINISH_SORT = new Map(FINISH_TABLE.map(([n, , o]) => [n, o]));

function finishSwatch(name) { return FINISH_SWATCH.get(name) || 'f-unspecified'; }
function finishSort(name) { return FINISH_SORT.has(name) ? FINISH_SORT.get(name) : 99; }

// Strip a finish suffix off an ItemCode -> base code that groups variants together.
function baseCode(code) {
  const c = String(code).trim();
  const m = c.match(FINISH_SUFFIX_RE);
  return m ? c.slice(0, m.index) : c;
}
function suffixFinish(code) {
  const m = String(code).trim().match(FINISH_SUFFIX_RE);
  return m ? SUFFIX_TO_FINISH.get(m[1].toUpperCase()) : null;
}
function phraseFinish(text) {
  const m = String(text || '').match(FINISH_PHRASE_RE);
  if (!m) return null;
  // Normalise to the canonical casing in FINISH_PHRASES.
  const hit = m[1].toLowerCase();
  return FINISH_PHRASES.find(p => p.toLowerCase() === hit) || null;
}

// Resolve the finish for a single row. Priority: code suffix > collection phrase > Chrome.
// Returns { finish, source, mismatch } where mismatch flags suffix/collection disagreement.
function resolveFinish(code, collectionName, category) {
  const fromSuffix = suffixFinish(code);
  const fromCollection = phraseFinish(collectionName);
  if (fromSuffix) {
    const mismatch = fromCollection && fromCollection !== fromSuffix ? fromCollection : null;
    return { finish: fromSuffix, source: 'suffix', mismatch };
  }
  if (fromCollection) return { finish: fromCollection, source: 'collection', mismatch: null };
  // Ceramic sanitaryware has no brass finish — don't default it to "Chrome".
  if (category === 'Sanitaryware') return { finish: 'White', source: 'default', mismatch: null };
  return { finish: 'Chrome', source: 'default', mismatch: null };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
function mapCategory(raw) {
  const v = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (v.includes('kithchen') || v.includes('kitchen')) return 'Kitchen Mixers';
  if (v.includes('shower')) return 'Shower';
  if (v.includes('sanitary')) return 'Sanitaryware';
  if (v.includes('faucet')) return 'Faucets';
  return 'Faucets';
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
// Brand "line" words that appear in collection names AND product names. Longest first.
const COLLECTION_WORDS = [
  'Opell Prima', 'Cube Prima', 'Allied', 'Aliva', 'Flora', 'Fuzone',
  'Zenith', 'Premium', 'Pebble', 'Para', 'Neo', 'JP',
];

// Map a raw Collection Name to a canonical { name, slug }.
function canonicalCollection(raw) {
  const r = String(raw || '').trim();
  const low = r.toLowerCase();
  let name;
  if (low.startsWith('opell prima')) name = 'Opell Prima';
  else if (low.startsWith('zenith')) name = 'Zenith';
  else if (low.startsWith('allied')) name = 'Allied';
  else if (low === 'jp collection' || low === 'jp' || low.startsWith('jp ')) name = 'JP';
  else {
    // Strip trailing "Collection"/"Items" and any finish phrase, then title-normalise.
    let s = r.replace(/\b(collection|items)\b/ig, '').replace(FINISH_PHRASE_RE, '').replace(/\s+/g, ' ').trim();
    name = s || r;
  }
  return { name, slug: slugify(name) };
}

// Detect which brand line a free-text string (e.g. an image filename) belongs to.
// Returns a collection slug or null. Longest words first so "Cube Prima" beats "Cube".
const COLLECTION_WORD_TO_SLUG = [
  ['Opell Prima', 'opell-prima'], ['Cube Prima', 'cube-prima'], ['Allied', 'allied'],
  ['Aliva', 'aliva'], ['Flora', 'flora'], ['Fuzone', 'fuzone'], ['Fusion', 'fuzone'],
  ['Zenith', 'zenith'], ['Premium', 'premium'], ['Pebble', 'pebble'], ['Para', 'para'],
  ['Neo', 'neo'], ['JP', 'jp'],
];
function collectionFromText(text) {
  const t = ' ' + String(text || '').toUpperCase() + ' ';
  for (const [word, slug] of COLLECTION_WORD_TO_SLUG) {
    if (new RegExp('\\b' + word.toUpperCase() + '\\b').test(t)) return slug;
  }
  return null;
}

// Strip collection line-words + finish phrases + trailing Collection/Items off a product
// name to get a clean display name (SKU Name).
const COLLECTION_WORD_RE = new RegExp('\\b(' + COLLECTION_WORDS.join('|') + ')\\b', 'ig');
function cleanProductName(itemName, category) {
  // COLLECTION_WORDS are brass line names (Neo, Allied, Zenith...) that are safe to
  // strip as redundant self-references in faucet/mixer/shower names. Sanitaryware
  // product names never reference those lines, so a name like "... Neo" is the
  // product's own name, not a redundant brand mention — don't strip it there.
  let s = String(itemName || '').replace(FINISH_PHRASE_RE, ' ');
  if (category !== 'Sanitaryware') s = s.replace(COLLECTION_WORD_RE, ' ');
  s = s.replace(/\b(collection|items)\b/ig, ' ').replace(/\s+/g, ' ').trim();
  return s || String(itemName || '').trim();
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------
function formatPrice(mrp) {
  const n = Number(String(mrp).replace(/[^0-9.]/g, ''));
  if (!n || Number.isNaN(n)) return '';
  return '₹' + n.toLocaleString('en-IN');
}

// ---------------------------------------------------------------------------
// Image-name normalisation (used by match-assets.js)
// ---------------------------------------------------------------------------
const TYPO_MAP = [
  [/concelaed/ig, 'concealed'],
  [/conceled/ig, 'concealed'],
  [/\bbob\b/ig, 'bib'],
  [/kithchen/ig, 'kitchen'],
  [/mutli/ig, 'multi'],
  [/\bdeusch\b/ig, 'deutsch'],
];
// Tokens to drop entirely from image filenames before matching.
const IMG_STOP = ['website', 'edited', 'pictures', 'png', 'jpg', 'jpeg', 'final', 'new', 'copy'];

// Normalise an arbitrary product/image string to a comparable token signature.
function normalizeName(text) {
  let s = String(text || '');
  for (const [re, to] of TYPO_MAP) s = s.replace(re, to);
  s = s
    .replace(FINISH_PHRASE_RE, ' ')
    .replace(COLLECTION_WORD_RE, ' ')
    .replace(/\b(collection|items)\b/ig, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(\d+)\s*mm\b/g, '$1mm')
    .trim();
  const tokens = s.split(/\s+/).filter(t => t && !IMG_STOP.includes(t));
  return tokens;
}

// Jaccard-ish token overlap score in [0,1].
function tokenScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const a = new Set(aTokens), b = new Set(bTokens);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = new Set([...a, ...b]).size;
  return inter / union;
}

module.exports = {
  slugify,
  FINISH_TABLE, FINISH_PHRASES, finishSwatch, finishSort,
  baseCode, suffixFinish, phraseFinish, resolveFinish,
  mapCategory, canonicalCollection, collectionFromText, cleanProductName, formatPrice,
  normalizeName, tokenScore,
};
