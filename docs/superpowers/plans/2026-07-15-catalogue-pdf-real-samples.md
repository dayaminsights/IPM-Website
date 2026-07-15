# Catalogue PDF Real-Sample Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the existing catalogue data pipeline into a shared module, then build two new PDF renderers — `build-catalogue-hindware.py` (landscape, styled after `sample catalogue 1.pdf`) and `build-catalogue-jaquar.py` (portrait, styled after `sample catalogue 2.pdf`) — without touching the working `build-catalogue-pdf.py` output.

**Architecture:** `scripts/catalogue_common.py` holds all data-layer functions (Excel loading, image resolution, collection ordering/pagination, report writing) plus page-size-agnostic drawing helpers (logo mark, image downscaling, text wrapping, collection-hero-image resolution). `build-catalogue-pdf.py` is refactored to import from it (net-zero behavior change — same 9 tests must stay green). The two new scripts import the same common module and add their own page geometry and `draw_*` primitives.

**Tech Stack:** Python 3.12 (`py`), reportlab, openpyxl, Pillow, pytest, pypdf (for smoke tests).

---

## Task 1: Extract shared data layer into `catalogue_common.py`

**Files:**
- Create: `scripts/catalogue_common.py`
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py` (must pass unchanged — no edits in this task)

- [ ] **Step 1: Create `scripts/catalogue_common.py`**

```python
"""Shared data-layer + drawing helpers for the IPM catalogue PDF builders.
Used by build-catalogue-pdf.py, build-catalogue-hindware.py, build-catalogue-jaquar.py.
"""
import os, re, io
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image
import openpyxl

FONT_DIR = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
FONTS = {"SegoeUI": "segoeui.ttf", "SegoeUI-Semibold": "seguisb.ttf", "SegoeUI-Bold": "segoeuib.ttf"}

def register_fonts():
    for name, fname in FONTS.items():
        p = FONT_DIR / fname
        if not p.exists():
            raise FileNotFoundError(f"Required font missing: {p}")
        pdfmetrics.registerFont(TTFont(name, str(p)))

SHEET = "Item Master + Images"

def _clean(v):
    if v is None: return None
    s = str(v).strip()
    return s if s else None

def load_products(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb[SHEET] if SHEET in wb.sheetnames else wb.worksheets[0]
    rows = ws.iter_rows(min_row=2, values_only=True)
    # column indexes by header order (fixed schema)
    NAME, CODE, COLL, CAT, MRP, SITE = 1, 2, 3, 4, 5, 10
    out = []
    for r in rows:
        if r is None or all(c is None or str(c).strip()=="" for c in r):
            continue
        code = _clean(r[CODE]); name = _clean(r[NAME])
        if not code or not name:
            continue
        mrp_raw = r[MRP]
        try:
            mrp = int(float(mrp_raw)) if mrp_raw not in (None, "") else None
        except (ValueError, TypeError):
            mrp = None
        if mrp == 0:            # 0 is not a real price -> treat as missing
            mrp = None
        out.append({
            "item_code": code,
            "name": name,
            "collection": _clean(r[COLL]) or "Uncategorised",
            "category": _clean(r[CAT]) or "",
            "mrp": mrp,
            "image_filename": _clean(r[SITE]),
            "image_path": None,
        })
    return out

def _index_images(images_root):
    # filename -> list of every full path carrying that name (dupes across folders)
    idx = {}
    for dirpath, _, files in os.walk(images_root):
        for f in files:
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                idx.setdefault(f, []).append(os.path.join(dirpath, f))
    return idx

def _collection_slug(name):
    """'Zenith Gunmetal Black Collection' -> 'zenith-gunmetal-black'."""
    s = (name or "").lower().replace("collection", "")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def _choose_path(paths, collection):
    """Prefer the copy whose folder name matches the product's collection slug;
    fall back to the first path when nothing matches."""
    if len(paths) == 1:
        return paths[0]
    slug = _collection_slug(collection)
    for p in paths:
        if os.path.basename(os.path.dirname(p)) == slug:
            return p
    return paths[0]

def resolve_images(products, images_root):
    idx = _index_images(images_root)
    included, no_image, broken = [], [], []
    used_paths = set()
    for p in products:
        fn = p["image_filename"]
        if not fn:
            no_image.append(p); continue
        paths = idx.get(fn)
        if not paths:
            broken.append(p); continue
        chosen = _choose_path(paths, p["collection"])
        p["image_path"] = chosen
        used_paths.add(chosen)
        included.append(p)
    # Orphans = physical files never chosen. One basename entry per unreferenced
    # physical file so len(orphans) reflects the true physical count; the report
    # dedups basenames only for display.
    all_paths = [pp for paths in idx.values() for pp in paths]
    orphans = sorted(os.path.basename(pp) for pp in all_paths if pp not in used_paths)
    return included, no_image, broken, orphans

SIGNATURE_PREFIXES = ["Zenith", "Opell Prima", "Para"]

def order_collections(products):
    # preserve first-appearance order of collections
    seen = []
    buckets = {}
    for p in products:
        c = p["collection"]
        if c not in buckets:
            buckets[c] = []; seen.append(c)
        buckets[c].append(p)

    def rank(name):
        for i, pre in enumerate(SIGNATURE_PREFIXES):
            if name.startswith(pre):
                return (i, seen.index(name))
        return (len(SIGNATURE_PREFIXES), seen.index(name))

    ordered_names = sorted(seen, key=rank)
    return [(name, buckets[name]) for name in ordered_names]

def paginate(groups, per_page=12):
    pages = []
    for name, items in groups:
        for i in range(0, len(items), per_page):
            pages.append((name, items[i:i+per_page]))
    return pages

def _fmt_price(mrp):
    # 0 is not a real price -> treat like missing (IPM-style formatting: "₹ : n/-")
    return f"₹ : {mrp}/-" if mrp else "Price on request"

def write_report(report_path, total, included, no_image, broken, price_on_request, orphans):
    Path(report_path).parent.mkdir(parents=True, exist_ok=True)
    L = []
    L.append("# Catalogue Build Report\n")
    L.append(f"- Total rows: {total}")
    L.append(f"- Included: {included}")
    L.append(f"- Omitted (no image): {len(no_image)}")
    L.append(f"- Omitted (broken image ref): {len(broken)}")
    L.append(f"- Price on request: {len(price_on_request)}")
    L.append(f"- Orphan photos (on disk, no included row): {len(orphans)}\n")

    def section(title, rows, fmt):
        L.append(f"\n## {title} ({len(rows)})\n")
        if not rows: L.append("_none_"); return
        for r in rows: L.append(fmt(r))

    section("Omitted — no image", no_image, lambda r: f"- {r['item_code']} — {r['name']} ({r['collection']})")
    section("Omitted — broken image reference", broken, lambda r: f"- {r['item_code']} — {r['name']} → {r.get('image_filename')}")
    section("Price on request", price_on_request, lambda r: f"- {r['item_code']} — {r['name']} ({r['collection']})")
    # dedup basenames for display; the summary count above stays physical (len(orphans))
    orphan_display = list(dict.fromkeys(orphans))
    section("Orphan photos", [{"f":o} for o in orphan_display], lambda r: f"- {r['f']}")

    Path(report_path).write_text("\n".join(L), encoding="utf-8")
    print(f"Report: {report_path}  |  included={included} no_image={len(no_image)} broken={len(broken)} price_req={len(price_on_request)} orphans={len(orphans)}")

def _draw_logo(c, x, y, scale=1.0, color="#111111"):
    """Minimal IPM wordmark: 'IPM' + 4 right bars + 'BATH FITTINGS'."""
    col = HexColor(color)
    c.setFillColor(col)
    c.setFont("SegoeUI-Bold", 26*scale)
    c.drawString(x, y, "IPM")
    bx = x + 52*scale
    c.setLineWidth(2.2*scale); c.setStrokeColor(col)
    for i, w in enumerate([26, 22, 18, 14]):
        yy = y + 18*scale - i*5.5*scale
        c.line(bx + (26-w)*scale, yy, bx + 26*scale, yy)
    c.setFont("SegoeUI", 6.5*scale)
    c.drawString(x, y - 9*scale, "B A T H   F I T T I N G S")

def _desaturate(path):
    im = Image.open(path).convert("RGB")
    g = im.convert("L").convert("RGB")
    buf = io.BytesIO(); g.save(buf, format="JPEG", quality=88); buf.seek(0)
    return ImageReader(buf)

# Cache downscaled product images by absolute source path so the same file is
# only decoded/resized once even if it appears on multiple pages (or in both
# a Hindware-style and Jaquar-style build run back to back).
_PRODUCT_IMG_CACHE = {}
PRODUCT_IMG_MAX_PX = 320

def _load_product_image(path):
    """Return (ImageReader, (w, h)) for a downscaled, transparency-preserving copy
    of the product photo. Cached by absolute path."""
    key = os.path.abspath(path)
    cached = _PRODUCT_IMG_CACHE.get(key)
    if cached is not None:
        return cached
    im = Image.open(path)
    im = im.convert("RGBA")  # keep transparency
    im.thumbnail((PRODUCT_IMG_MAX_PX, PRODUCT_IMG_MAX_PX), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, format="PNG", optimize=True); buf.seek(0)
    reader = ImageReader(buf)
    result = (reader, im.size)
    _PRODUCT_IMG_CACHE[key] = result
    return result

def _wrap(c, text, font, size, max_w):
    words = text.split(); lines=[]; cur=""
    for wd in words:
        t = (cur+" "+wd).strip()
        if c.stringWidth(t, font, size) <= max_w: cur=t
        else: lines.append(cur); cur=wd
    if cur: lines.append(cur)
    return lines or [""]

# --- Collection hero-image resolution (for the Hindware/Jaquar-style collection
# opening pages, which use a real lifestyle/product photo per collection instead
# of a plain colored header band). ---

def _normalize_collection_filename(fname):
    """'Cube_Prima.jpg' -> 'cube-prima'; 'line-opell-prima.jpg' -> 'opell-prima';
    'NEO_COLLECTION.png' -> 'neo'."""
    stem = os.path.splitext(fname)[0]
    s = stem.lower().replace("_", "-").replace(" ", "-")
    s = re.sub(r"[^a-z0-9-]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    if s.startswith("line-"):
        s = s[len("line-"):]
    if s.endswith("-collection"):
        s = s[: -len("-collection")]
    return s

def _index_collection_heroes(images_collections_dir):
    idx = {}
    for f in sorted(os.listdir(images_collections_dir)):
        full = os.path.join(images_collections_dir, f)
        if not os.path.isfile(full):
            continue
        low = f.lower()
        if low.startswith("cat-") or low == "hero.jpg":
            continue
        if not low.endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        key = _normalize_collection_filename(f)
        idx.setdefault(key, full)  # first match wins
    return idx

def _category_fallback_path(images_collections_dir, category):
    c = (category or "").lower()
    if "shower" in c:
        candidates = ["cat-shower.jpg", "cat-showers.jpg"]
    elif "mixer" in c or "kitchen" in c:
        candidates = ["cat-kitchen-mixers.jpg", "cat-mixers.jpg"]
    elif "accessor" in c:
        candidates = ["cat-accessories.jpg"]
    else:
        candidates = ["cat-faucets.jpg"]
    for name in candidates:
        p = os.path.join(images_collections_dir, name)
        if os.path.exists(p):
            return p
    return None

def resolve_collection_hero(collection_name, images_collections_dir, category, included_products_for_collection):
    """3-step fallback: (1) a known hero file matching the collection name
    (progressively shortened, e.g. 'zenith-gunmetal-black' -> 'zenith-gunmetal'
    -> 'zenith'), (2) the first included product's own photo, (3) the category
    fallback image. Returns an absolute path or None."""
    idx = _index_collection_heroes(images_collections_dir)
    slug = _collection_slug(collection_name)
    segments = [s for s in slug.split("-") if s]
    for n in range(len(segments), 0, -1):
        candidate = "-".join(segments[:n])
        if candidate in idx:
            return idx[candidate]
    for p in included_products_for_collection:
        if p.get("image_path") and os.path.exists(p["image_path"]):
            return p["image_path"]
    return _category_fallback_path(images_collections_dir, category)
```

- [ ] **Step 2: Sanity-check nothing is broken yet (common module unused so far)**

Run: `py -m pytest scripts/test_build_catalogue.py -v`
Expected: 9 passed (unchanged — `build-catalogue-pdf.py` hasn't been touched yet).

- [ ] **Step 3: Rewrite `scripts/build-catalogue-pdf.py` to import from `catalogue_common`**

Replace the entire file with:

```python
"""Repeatable IPM product catalogue PDF builder. See docs/superpowers/specs/2026-07-14-product-catalogue-pdf-design.md"""
import os, sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalogue_common import (
    register_fonts, load_products, resolve_images, order_collections,
    paginate, write_report, _fmt_price, _draw_logo, _desaturate,
    _load_product_image, _wrap,
)

PAGE_W, PAGE_H = 612, 810
TEAL = HexColor("#2E9AA6")
GRAY_TAB = HexColor("#DADADA")
GRAY_TAB_TEXT = HexColor("#6E6E6E")
COLS, ROWS = 3, 4
HEADER_H, FOOTER_H = 96, 30
MARGIN_X = 40

def draw_cover(c, hero_path, wef="01.04.2026"):
    if hero_path and os.path.exists(hero_path):
        c.drawImage(_desaturate(hero_path), 0, 0, PAGE_W, PAGE_H, preserveAspectRatio=False, mask=None)
        c.setFillColor(HexColor("#000000")); c.setFillAlpha(0.28)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0); c.setFillAlpha(1)
    else:
        c.setFillColor(HexColor("#2b2b2b")); c.rect(0,0,PAGE_W,PAGE_H,fill=1,stroke=0)
    _draw_logo(c, PAGE_W-150, PAGE_H-80, scale=1.0, color="#ffffff")
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("SegoeUI-Semibold", 20); c.drawCentredString(PAGE_W/2, 118, "F U L F I L L I N G   Y O U R   B A T H I N G   D E S I R E S")
    c.setFont("SegoeUI-Bold", 26); c.drawCentredString(PAGE_W/2, 70, "INDIA MRP LIST")
    c.setFont("SegoeUI-Semibold", 11); c.drawCentredString(PAGE_W/2, 48, f"W.E.F : {wef}")
    c.showPage()

def draw_header(c, collection):
    c.setFillColor(TEAL); c.rect(0, PAGE_H-HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff"))
    c.roundRect(-20, PAGE_H-HEADER_H+8, 300, HEADER_H-16, 18, fill=1, stroke=0)
    _draw_logo(c, 34, PAGE_H-HEADER_H+40, scale=1.0)
    tab_x = PAGE_W*0.42
    c.setFillColor(GRAY_TAB); c.roundRect(tab_x, PAGE_H-HEADER_H+18, PAGE_W-tab_x-MARGIN_X, HEADER_H-36, 10, fill=1, stroke=0)
    c.setFillColor(GRAY_TAB_TEXT); c.setFont("SegoeUI-Bold", 18)
    c.drawRightString(PAGE_W-MARGIN_X-14, PAGE_H-HEADER_H+40, collection.upper())

def draw_footer(c, page_no):
    c.setFillColor(TEAL); c.rect(0, 0, PAGE_W, FOOTER_H, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff")); c.setFont("SegoeUI-Bold", 11)
    c.drawRightString(PAGE_W-MARGIN_X, 10, str(page_no))

def draw_cell(c, x, y, w, h, product):
    code = str(product["item_code"])
    code_font, code_size, code_pad = "SegoeUI-Bold", 9, 8
    box_w = max(42, c.stringWidth(code, code_font, code_size) + 2*code_pad)
    c.setFillColor(TEAL); c.rect(x, y+h-20, box_w, 16, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff")); c.setFont(code_font, code_size)
    c.drawCentredString(x+box_w/2, y+h-16, code)
    img_h = h*0.55
    if product.get("image_path") and os.path.exists(product["image_path"]):
        try:
            ir, (iw, ih) = _load_product_image(product["image_path"])
            img_box_w, img_box_h = w*0.8, img_h
            scale = min(img_box_w/iw, img_box_h/ih)
            dw, dh = iw*scale, ih*scale
            c.drawImage(ir, x+(w-dw)/2, y+h-24-dh, dw, dh, preserveAspectRatio=True, mask="auto")
        except Exception as e:
            print(f"WARNING: failed to draw image for {product.get('item_code')} "
                  f"({product['image_path']}): {e}", file=sys.stderr)
    c.setFillColor(HexColor("#222222")); c.setFont("SegoeUI-Semibold", 8.5)
    name = product["name"].upper()
    ty = y + h - 24 - img_h - 8
    for line in _wrap(c, name, "SegoeUI-Semibold", 8.5, w-4)[:2]:
        c.drawString(x+2, ty, line); ty -= 11
    c.setFont("SegoeUI-Bold", 8.5); c.setFillColor(HexColor("#111111"))
    c.drawString(x+2, ty-1, _fmt_price(product.get("mrp")))

DIVIDER_GRAY = HexColor("#BFBFBF")

def draw_grid_dividers(c, grid_top, grid_bottom, cell_w, cell_h):
    """Subtle separators within the product grid: dotted vertical lines between
    columns, dashed horizontal lines between rows. Not over header/footer."""
    left = MARGIN_X
    right = MARGIN_X + COLS*cell_w
    c.saveState()
    c.setStrokeColor(DIVIDER_GRAY); c.setLineWidth(0.6)
    c.setDash(1, 2)
    for col in range(1, COLS):
        vx = left + col*cell_w
        c.line(vx, grid_bottom, vx, grid_top)
    c.setDash(3, 2)
    for row in range(1, ROWS):
        hy = grid_top - row*cell_h
        c.line(left, hy, right, hy)
    c.restoreState()

def build_pdf(groups, out_path, hero_path):
    register_fonts()
    c = rl_canvas.Canvas(str(out_path), pagesize=(PAGE_W, PAGE_H))
    draw_cover(c, hero_path)
    pages = paginate(groups, per_page=COLS*ROWS)
    grid_top = PAGE_H - HEADER_H - 8
    grid_bottom = FOOTER_H + 8
    cell_w = (PAGE_W - 2*MARGIN_X) / COLS
    cell_h = (grid_top - grid_bottom) / ROWS
    for pno, (coll, items) in enumerate(pages, start=1):
        draw_header(c, coll)
        draw_grid_dividers(c, grid_top, grid_bottom, cell_w, cell_h)
        for idx, product in enumerate(items):
            r, col = divmod(idx, COLS)
            x = MARGIN_X + col*cell_w
            y = grid_top - (r+1)*cell_h
            draw_cell(c, x+6, y+4, cell_w-12, cell_h-8, product)
        draw_footer(c, pno)
        c.showPage()
    c.save()

import argparse

def main(argv=None):
    ap = argparse.ArgumentParser(description="Build IPM catalogue PDF")
    ap.add_argument("--xlsx", default="ITEM MASTER FOR WEBSITE.xlsx")
    ap.add_argument("--images", default="images/products")
    ap.add_argument("--hero", default="images/home/hero.jpg")
    ap.add_argument("--out", default="IPM Catalogue.pdf")
    ap.add_argument("--report", default="reports/catalogue-build.md")
    args = ap.parse_args(argv)

    products = load_products(args.xlsx)
    included, no_image, broken, orphans = resolve_images(products, args.images)
    price_req = [p for p in included if p["mrp"] is None]
    groups = order_collections(included)
    build_pdf(groups, args.out, args.hero)
    write_report(args.report, total=len(products), included=len(included),
                 no_image=no_image, broken=broken, price_on_request=price_req, orphans=orphans)
    print(f"PDF: {args.out}  ({len(included)} products, {len(groups)} collections)")

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the existing test suite — must be unchanged**

Run: `py -m pytest scripts/test_build_catalogue.py -v`
Expected: 9 passed (same 9 tests as before, zero edits to the test file).

- [ ] **Step 5: Run the real build — counts must match the pre-refactor run**

Run: `py "scripts/build-catalogue-pdf.py"`
Expected stdout contains `included=431 no_image=610 broken=19 price_req=7 orphans=392` and `(431 products, 27 collections)`. If any number differs, the refactor introduced a behavior change — stop and diff against the Task-1-Step-1 source before proceeding.

- [ ] **Step 6: Commit**

```bash
git add scripts/catalogue_common.py scripts/build-catalogue-pdf.py
git commit -m "refactor(catalogue): extract shared data layer into catalogue_common.py"
```

---

## Task 2: Test `resolve_collection_hero`

**Files:**
- Create: `scripts/test_catalogue_common.py`
- Modify: `scripts/catalogue_common.py` (already has the implementation from Task 1 — this task only adds tests; if a test reveals a bug, fix it here)

- [ ] **Step 1: Write the tests**

```python
# scripts/test_catalogue_common.py
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent / "catalogue_common.py"

def load_mod():
    spec = importlib.util.spec_from_file_location("catcommon", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_resolve_collection_hero_exact_match(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    (coll_dir / "Cube_Prima.jpg").write_bytes(b"x")
    hero = m.resolve_collection_hero("Cube Prima Collection", coll_dir, "Faucets", [])
    assert hero is not None and hero.endswith("Cube_Prima.jpg")

def test_resolve_collection_hero_progressive_and_line_prefix(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    (coll_dir / "line-opell-prima.jpg").write_bytes(b"x")
    hero = m.resolve_collection_hero("Opell Prima Matt Black Collection", coll_dir, "Faucets", [])
    assert hero is not None and hero.endswith("line-opell-prima.jpg")

def test_resolve_collection_hero_falls_back_to_product_photo(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    products = [{"item_code": "1", "image_path": str(tmp_path / "prod.png")}]
    (tmp_path / "prod.png").write_bytes(b"x")
    hero = m.resolve_collection_hero("Nonexistent Collection", coll_dir, "Faucets", products)
    assert hero == str(tmp_path / "prod.png")

def test_resolve_collection_hero_falls_back_to_category(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    (coll_dir / "cat-shower.jpg").write_bytes(b"x")
    hero = m.resolve_collection_hero("Nonexistent Collection", coll_dir, "Faucets/ Shower", [])
    assert hero is not None and hero.endswith("cat-shower.jpg")

def test_resolve_collection_hero_none_when_nothing_matches(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    hero = m.resolve_collection_hero("Nonexistent Collection", coll_dir, "Faucets", [])
    assert hero is None
```

- [ ] **Step 2: Run and confirm all pass**

Run: `py -m pytest scripts/test_catalogue_common.py -v`
Expected: 5 passed. (These exercise code already written in Task 1; if any fails, fix the implementation in `catalogue_common.py`, not the test.)

- [ ] **Step 3: Commit**

```bash
git add scripts/test_catalogue_common.py
git commit -m "test(catalogue): cover resolve_collection_hero fallback chain"
```

---

## Task 3: Hindware-style renderer — scaffold, cover, header, footer, cell

**Files:**
- Create: `scripts/build-catalogue-hindware.py`
- Test: `scripts/test_build_catalogue_hindware.py`

- [ ] **Step 1: Write the failing test**

```python
# scripts/test_build_catalogue_hindware.py
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent / "build-catalogue-hindware.py"

def load_mod():
    spec = importlib.util.spec_from_file_location("cathindware", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_constants_present():
    m = load_mod()
    assert (m.PAGE_W, m.PAGE_H) == (842, 595)
    assert m.COLS == 2 and m.ROWS == 3

def test_fmt_price():
    m = load_mod()
    assert m._fmt_price(None) == "Price on request"
    assert m._fmt_price(0) == "Price on request"
    assert m._fmt_price(1335) == "₹ 1,335/-"
```

- [ ] **Step 2: Run to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue_hindware.py -v`
Expected: FAIL (file doesn't exist yet).

- [ ] **Step 3: Create `scripts/build-catalogue-hindware.py`**

```python
"""Landscape catalogue PDF styled after 'sample catalogue 1.pdf' (Hindware Italian
Collection layout): 2x3 product grid, feature-icon/QR/size fields omitted (not
present in our source data — see docs/superpowers/specs/2026-07-15-catalogue-pdf-real-samples-design.md).
"""
import os, sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalogue_common import (
    register_fonts, load_products, resolve_images, order_collections,
    paginate, write_report, _draw_logo, _load_product_image, _wrap,
)

PAGE_W, PAGE_H = 842, 595
COLS, ROWS = 2, 3
MARGIN_X = 40
FOOTER_H = 30
TICK_COLOR = HexColor("#0F3D2E")
BAND_H = 170
BAND_COLOR = "#12332B"

def _fmt_price(mrp):
    return f"₹ {mrp:,}/-" if mrp else "Price on request"

def draw_cover(c, hero_path, wef="01.04.2026"):
    if hero_path and os.path.exists(hero_path):
        c.drawImage(ImageReader(hero_path), 0, 0, PAGE_W, PAGE_H, preserveAspectRatio=False, mask=None)
    else:
        c.setFillColor(HexColor("#2b2b2b")); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(HexColor(BAND_COLOR)); c.setFillAlpha(0.92)
    c.rect(0, 0, PAGE_W, BAND_H, fill=1, stroke=0); c.setFillAlpha(1)
    _draw_logo(c, 40, PAGE_H-70, scale=1.1, color="#ffffff")
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("SegoeUI-Semibold", 15)
    c.drawCentredString(PAGE_W/2, BAND_H-60, "F U L F I L L I N G   Y O U R   B A T H I N G   D E S I R E S")
    c.setFont("SegoeUI-Bold", 30)
    c.drawCentredString(PAGE_W/2, BAND_H-100, "INDIA MRP LIST")
    c.setFont("SegoeUI-Semibold", 11)
    c.drawCentredString(PAGE_W/2, BAND_H-125, f"W.E.F : {wef}")
    c.showPage()

def draw_collection_header(c, collection_name):
    lines = _wrap(c, collection_name.upper(), "SegoeUI-Bold", 20, PAGE_W*0.45)[:2]
    y = PAGE_H - 45
    c.setFillColor(HexColor("#1A1A1A"))
    for line in lines:
        c.setFont("SegoeUI-Bold", 20)
        c.drawString(MARGIN_X, y, line)
        y -= 24
    _draw_logo(c, PAGE_W-190, PAGE_H-55, scale=0.85, color="#1A1A1A")

def draw_footer(c, page_no):
    c.setFillColor(HexColor("#EFEFEF"))
    c.roundRect(PAGE_W-70, 14, 30, 16, 4, fill=1, stroke=0)
    c.setFillColor(HexColor("#1A1A1A")); c.setFont("SegoeUI-Bold", 9)
    c.drawCentredString(PAGE_W-55, 19, str(page_no))

def draw_cell(c, x, y, w, h, product):
    img_w = w*0.36
    if product.get("image_path") and os.path.exists(product["image_path"]):
        try:
            ir, (iw, ih) = _load_product_image(product["image_path"])
            box_w, box_h = img_w, h*0.8
            scale = min(box_w/iw, box_h/ih)
            dw, dh = iw*scale, ih*scale
            c.drawImage(ir, x+(img_w-dw)/2, y+(h-dh)/2, dw, dh, preserveAspectRatio=True, mask="auto")
        except Exception as e:
            print(f"WARNING: failed to draw image for {product.get('item_code')} "
                  f"({product['image_path']}): {e}", file=sys.stderr)
    c.setStrokeColor(TICK_COLOR); c.setLineWidth(2)
    tx = x + img_w + 10
    c.line(tx, y+h*0.3, tx, y+h*0.7)
    tx2 = tx + 14
    text_w = w - img_w - 24
    c.setFillColor(HexColor("#1A1A1A")); c.setFont("SegoeUI-Bold", 11)
    name_lines = _wrap(c, product["name"].upper(), "SegoeUI-Bold", 11, text_w)[:2]
    ty = y+h-22
    for line in name_lines:
        c.drawString(tx2, ty, line); ty -= 13
    c.setFont("SegoeUI", 8); c.setFillColor(HexColor("#555555"))
    c.drawString(tx2, ty-6, f"Code: {product['item_code']}")
    c.setFont("SegoeUI-Bold", 11); c.setFillColor(HexColor("#1A1A1A"))
    c.drawString(tx2, ty-22, _fmt_price(product.get("mrp")))
```

- [ ] **Step 4: Run to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue_hindware.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-hindware.py scripts/test_build_catalogue_hindware.py
git commit -m "feat(catalogue): Hindware-style renderer scaffold + drawing primitives"
```

---

## Task 4: Hindware-style renderer — build_pdf, main, real-data run

**Files:**
- Modify: `scripts/build-catalogue-hindware.py`
- Test: `scripts/test_build_catalogue_hindware.py`

- [ ] **Step 1: Write the failing test**

```python
def test_build_pdf_page_count(tmp_path):
    m = load_mod(); m.register_fonts()
    def prod(i, coll): return {"item_code":str(i),"name":"Item","collection":coll,"category":"","mrp":10,"image_filename":None,"image_path":None}
    groups = [("Zenith Collection", [prod(i,"Zenith Collection") for i in range(7)])]  # 6/page -> 2 pages
    out = tmp_path / "out.pdf"
    m.build_pdf(groups, out, hero_path=None)
    from pypdf import PdfReader
    n = len(PdfReader(str(out)).pages)
    assert n == 3   # cover + 2 product pages
```

- [ ] **Step 2: Run to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue_hindware.py::test_build_pdf_page_count -v`
Expected: FAIL (`build_pdf` not defined).

- [ ] **Step 3: Append `build_pdf` and `main` to `scripts/build-catalogue-hindware.py`**

```python
def build_pdf(groups, out_path, hero_path):
    register_fonts()
    c = rl_canvas.Canvas(str(out_path), pagesize=(PAGE_W, PAGE_H))
    draw_cover(c, hero_path)
    pages = paginate(groups, per_page=COLS*ROWS)
    grid_top = PAGE_H - 95
    grid_bottom = FOOTER_H + 15
    cell_w = (PAGE_W - 2*MARGIN_X) / COLS
    cell_h = (grid_top - grid_bottom) / ROWS
    for pno, (coll, items) in enumerate(pages, start=1):
        draw_collection_header(c, coll)
        for idx, product in enumerate(items):
            r, col = divmod(idx, COLS)
            x = MARGIN_X + col*cell_w
            y = grid_top - (r+1)*cell_h
            draw_cell(c, x+6, y+6, cell_w-12, cell_h-12, product)
        draw_footer(c, pno)
        c.showPage()
    c.save()

import argparse

def main(argv=None):
    ap = argparse.ArgumentParser(description="Build IPM catalogue PDF (Hindware style)")
    ap.add_argument("--xlsx", default="ITEM MASTER FOR WEBSITE.xlsx")
    ap.add_argument("--images", default="images/products")
    ap.add_argument("--hero", default="images/home/hero.jpg")
    ap.add_argument("--out", default="IPM Catalogue (Hindware Style).pdf")
    ap.add_argument("--report", default="reports/catalogue-build-hindware.md")
    args = ap.parse_args(argv)

    products = load_products(args.xlsx)
    included, no_image, broken, orphans = resolve_images(products, args.images)
    price_req = [p for p in included if p["mrp"] is None]
    groups = order_collections(included)
    build_pdf(groups, args.out, args.hero)
    write_report(args.report, total=len(products), included=len(included),
                 no_image=no_image, broken=broken, price_on_request=price_req, orphans=orphans)
    print(f"PDF: {args.out}  ({len(included)} products, {len(groups)} collections)")

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue_hindware.py -v`
Expected: 3 passed.

- [ ] **Step 5: Run against real data**

Run: `py "scripts/build-catalogue-hindware.py"`
Expected: stdout shows `included=431 ... (431 products, 27 collections)` (same product/collection counts as the original build — same data layer). Confirm `IPM Catalogue (Hindware Style).pdf` and `reports/catalogue-build-hindware.md` exist.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-catalogue-hindware.py scripts/test_build_catalogue_hindware.py
git commit -m "feat(catalogue): Hindware-style build_pdf + CLI wiring"
```

---

## Task 5: Jaquar-style renderer — scaffold, cover, banner, footer, cell

**Files:**
- Create: `scripts/build-catalogue-jaquar.py`
- Test: `scripts/test_build_catalogue_jaquar.py`

- [ ] **Step 1: Write the failing test**

```python
# scripts/test_build_catalogue_jaquar.py
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent / "build-catalogue-jaquar.py"

def load_mod():
    spec = importlib.util.spec_from_file_location("catjaquar", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_constants_present():
    m = load_mod()
    assert (m.PAGE_W, m.PAGE_H) == (595, 842)
    assert m.COLS == 3

def test_fmt_price():
    m = load_mod()
    assert m._fmt_price(None) == "Price on request"
    assert m._fmt_price(0) == "Price on request"
    assert m._fmt_price(1335) == "Rs. 1,335"
```

- [ ] **Step 2: Run to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue_jaquar.py -v`
Expected: FAIL (file doesn't exist yet).

- [ ] **Step 3: Create `scripts/build-catalogue-jaquar.py`**

```python
"""Portrait catalogue PDF styled after 'sample catalogue 2.pdf' (Jaquar minimal
layout): 3-column grid with inline category sub-headings, finish-swatch rows and
QR codes omitted (not present in our source data — see
docs/superpowers/specs/2026-07-15-catalogue-pdf-real-samples-design.md).
"""
import os, sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalogue_common import (
    register_fonts, load_products, resolve_images, order_collections,
    write_report, _draw_logo, _load_product_image, _wrap, resolve_collection_hero,
)

PAGE_W, PAGE_H = 595, 842
COLS = 3
MARGIN_X = 40
FOOTER_H = 30
ROW_H = 150
SUB_H = 24
BANNER_H = 210
GRID_BOTTOM = 50

GRAY_HEAD = HexColor("#8A8A8A")
TEXT_DARK = HexColor("#1A1A1A")
TEXT_GRAY = HexColor("#6E6E6E")

def _fmt_price(mrp):
    return f"Rs. {mrp:,}" if mrp else "Price on request"

def draw_cover(c, hero_path, year="2026"):
    c.setStrokeColor(HexColor("#1A1A1A")); c.setLineWidth(0.8)
    c.rect(MARGIN_X, PAGE_H-90, 120, 50, fill=0, stroke=1)
    c.setFillColor(HexColor("#1A1A1A")); c.setFont("SegoeUI-Semibold", 11)
    c.drawString(MARGIN_X+10, PAGE_H-52, "PRODUCT")
    c.drawString(MARGIN_X+10, PAGE_H-64, "CATALOGUE")
    c.setFont("SegoeUI", 9)
    c.drawString(MARGIN_X+10, PAGE_H-80, year)
    _draw_logo(c, PAGE_W-190, PAGE_H-60, scale=0.85, color="#1A1A1A")
    photo_top = PAGE_H - 110
    photo_h = photo_top - 90
    if hero_path and os.path.exists(hero_path):
        c.drawImage(ImageReader(hero_path), MARGIN_X, photo_top-photo_h, PAGE_W-2*MARGIN_X, photo_h, preserveAspectRatio=False, mask=None)
    else:
        c.setFillColor(HexColor("#2b2b2b"))
        c.rect(MARGIN_X, photo_top-photo_h, PAGE_W-2*MARGIN_X, photo_h, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff")); c.setFont("SegoeUI-Semibold", 13)
    c.drawString(MARGIN_X+14, photo_top-photo_h+18, "FULFILLING YOUR BATHING DESIRES")
    c.showPage()

def draw_collection_banner(c, collection_name, hero_path):
    if hero_path and os.path.exists(hero_path):
        c.drawImage(ImageReader(hero_path), 0, PAGE_H-BANNER_H, PAGE_W, BANNER_H, preserveAspectRatio=False, mask=None)
    else:
        c.setFillColor(HexColor("#D9D9D9"))
        c.rect(0, PAGE_H-BANNER_H, PAGE_W, BANNER_H, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff")); c.setFont("SegoeUI-Bold", 20)
    lines = _wrap(c, collection_name.upper(), "SegoeUI-Bold", 20, PAGE_W*0.6)[:2]
    ty = PAGE_H - 40
    for line in lines:
        c.drawString(MARGIN_X, ty, line); ty -= 24

def draw_collection_heading_small(c, collection_name):
    c.setFillColor(GRAY_HEAD); c.setFont("SegoeUI-Semibold", 15)
    c.drawString(MARGIN_X, PAGE_H-50, collection_name.upper())

def draw_category_subheading(c, category, y):
    c.setFillColor(TEXT_DARK); c.setFont("SegoeUI-Bold", 10)
    c.drawString(MARGIN_X, y, (category or "OTHER").upper())

def draw_footer(c, page_no):
    c.setFillColor(TEXT_GRAY); c.setFont("SegoeUI", 9)
    c.drawString(MARGIN_X, 20, "ipmbathfittings.com")
    c.setFillColor(HexColor("#DADADA"))
    c.roundRect(PAGE_W-70, 14, 30, 16, 3, fill=1, stroke=0)
    c.setFillColor(TEXT_DARK); c.setFont("SegoeUI-Bold", 9)
    c.drawCentredString(PAGE_W-55, 19, str(page_no))

def draw_cell(c, x, y, w, h, product):
    img_h = h*0.55
    if product.get("image_path") and os.path.exists(product["image_path"]):
        try:
            ir, (iw, ih) = _load_product_image(product["image_path"])
            box_w, box_h = w*0.8, img_h
            scale = min(box_w/iw, box_h/ih)
            dw, dh = iw*scale, ih*scale
            c.drawImage(ir, x+(w-dw)/2, y+h-dh-4, dw, dh, preserveAspectRatio=True, mask="auto")
        except Exception as e:
            print(f"WARNING: failed to draw image for {product.get('item_code')} "
                  f"({product['image_path']}): {e}", file=sys.stderr)
    ty = y + h - img_h - 16
    c.setFillColor(TEXT_DARK); c.setFont("SegoeUI-Bold", 9)
    c.drawString(x+2, ty, str(product["item_code"]))
    ty -= 12
    c.setFillColor(TEXT_GRAY); c.setFont("SegoeUI", 7.5)
    for line in _wrap(c, product["name"], "SegoeUI", 7.5, w-6)[:2]:
        c.drawString(x+2, ty, line); ty -= 10
    c.setFillColor(TEXT_DARK); c.setFont("SegoeUI-Bold", 9)
    c.drawString(x+2, ty-2, _fmt_price(product.get("mrp")))
```

- [ ] **Step 4: Run to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue_jaquar.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-jaquar.py scripts/test_build_catalogue_jaquar.py
git commit -m "feat(catalogue): Jaquar-style renderer scaffold + drawing primitives"
```

---

## Task 6: Jaquar-style renderer — category-aware block pagination (pure functions)

**Files:**
- Modify: `scripts/build-catalogue-jaquar.py`
- Test: `scripts/test_build_catalogue_jaquar.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_collection_blocks_groups_by_category():
    m = load_mod()
    def prod(i, cat): return {"item_code": str(i), "category": cat}
    items = [prod(1,"Faucets"), prod(2,"Faucets"), prod(3,"Faucets"), prod(4,"Faucets"),
             prod(5,"Shower"), prod(6,"Shower")]
    blocks = m._collection_blocks(items)
    kinds = [k for k, _ in blocks]
    assert kinds == ["sub", "row", "row", "sub", "row"]
    # first category run: 4 items -> row of 3, then row of 1
    assert len(blocks[1][1]) == 3
    assert len(blocks[2][1]) == 1
    assert blocks[0][1] == "Faucets"
    assert blocks[3][1] == "Shower"
    assert len(blocks[4][1]) == 2

def test_paginate_blocks_splits_on_budget():
    m = load_mod()
    blocks = [("sub", "A"), ("row", [1,2,3]), ("row", [4,5,6]), ("row", [7,8,9])]
    # SUB_H=24, ROW_H=150 -> first block set: 24+150+150=324 fits in budget 400,
    # but the third row (474 total) doesn't fit a 400 budget -> new page
    pages = m._paginate_blocks(blocks, first_page_budget=400, cont_page_budget=500)
    assert len(pages) == 2
    assert len(pages[0]) == 3   # sub + 2 rows
    assert len(pages[1]) == 1   # 1 row on the continuation page
```

- [ ] **Step 2: Run to verify they fail**

Run: `py -m pytest scripts/test_build_catalogue_jaquar.py -k "blocks" -v`
Expected: FAIL (`_collection_blocks` not defined).

- [ ] **Step 3: Append to `scripts/build-catalogue-jaquar.py`**

```python
def _collection_blocks(items):
    """Group consecutive same-category items into 'row' blocks of up to COLS
    items, inserting a 'sub' (category heading) block whenever the category
    changes."""
    blocks = []
    last_cat = None
    buf = []
    for p in items:
        cat = p.get("category") or ""
        if cat != last_cat:
            if buf:
                blocks.append(("row", buf)); buf = []
            blocks.append(("sub", cat))
            last_cat = cat
        buf.append(p)
        if len(buf) == COLS:
            blocks.append(("row", buf)); buf = []
    if buf:
        blocks.append(("row", buf))
    return blocks

def _paginate_blocks(blocks, first_page_budget, cont_page_budget):
    """Pack blocks into pages using a vertical-space budget (points). The first
    page has less room (a lifestyle banner sits above the grid); continuation
    pages only have a small text heading."""
    pages = []
    current = []
    budget = first_page_budget
    used = 0
    for kind, payload in blocks:
        h = SUB_H if kind == "sub" else ROW_H
        if used + h > budget and current:
            pages.append(current)
            current = []
            budget = cont_page_budget
            used = 0
        current.append((kind, payload))
        used += h
    if current:
        pages.append(current)
    return pages
```

- [ ] **Step 4: Run to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue_jaquar.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-jaquar.py
git commit -m "feat(catalogue): Jaquar-style category-aware block pagination"
```

---

## Task 7: Jaquar-style renderer — build_pdf, main, real-data run

**Files:**
- Modify: `scripts/build-catalogue-jaquar.py`
- Test: `scripts/test_build_catalogue_jaquar.py`

- [ ] **Step 1: Write the failing test**

```python
def test_build_pdf_page_count(tmp_path):
    m = load_mod(); m.register_fonts()
    def prod(i, coll): return {"item_code":str(i),"name":"Item","collection":coll,"category":"Faucets","mrp":10,"image_filename":None,"image_path":None}
    items = [prod(i, "Zenith Collection") for i in range(6)]
    groups = [("Zenith Collection", items)]
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    out = tmp_path / "out.pdf"
    m.build_pdf(groups, out, hero_path=None, images_collections_dir=coll_dir)

    # Compute expected page count the same way build_pdf does, so this test
    # stays correct if ROW_H/SUB_H/budgets change later.
    blocks = m._collection_blocks(items)
    first_budget = (m.PAGE_H - m.BANNER_H - 20) - m.GRID_BOTTOM
    cont_budget = (m.PAGE_H - 70) - m.GRID_BOTTOM
    expected_pages = len(m._paginate_blocks(blocks, first_budget, cont_budget))

    from pypdf import PdfReader
    n = len(PdfReader(str(out)).pages)
    assert n == 1 + expected_pages   # cover + collection pages
```

- [ ] **Step 2: Run to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue_jaquar.py::test_build_pdf_page_count -v`
Expected: FAIL (`build_pdf` not defined).

- [ ] **Step 3: Append `build_pdf` and `main` to `scripts/build-catalogue-jaquar.py`**

```python
def build_pdf(groups, out_path, hero_path, images_collections_dir):
    register_fonts()
    c = rl_canvas.Canvas(str(out_path), pagesize=(PAGE_W, PAGE_H))
    draw_cover(c, hero_path)
    cell_w = (PAGE_W - 2*MARGIN_X) / COLS
    page_no = 1
    for collection, items in groups:
        blocks = _collection_blocks(items)
        top_first = PAGE_H - BANNER_H - 20
        top_cont = PAGE_H - 70
        first_budget = top_first - GRID_BOTTOM
        cont_budget = top_cont - GRID_BOTTOM
        pages = _paginate_blocks(blocks, first_budget, cont_budget)
        category = items[0]["category"] if items else ""
        hero = resolve_collection_hero(collection, images_collections_dir, category, items)
        for i, page_blocks in enumerate(pages):
            if i == 0:
                draw_collection_banner(c, collection, hero)
                cursor_y = top_first
            else:
                draw_collection_heading_small(c, collection)
                cursor_y = top_cont
            for kind, payload in page_blocks:
                if kind == "sub":
                    draw_category_subheading(c, payload, cursor_y)
                    cursor_y -= SUB_H
                else:
                    row_top = cursor_y
                    for ci, product in enumerate(payload):
                        x = MARGIN_X + ci*cell_w
                        draw_cell(c, x+4, row_top-ROW_H+6, cell_w-8, ROW_H-10, product)
                    cursor_y -= ROW_H
            draw_footer(c, page_no)
            c.showPage()
            page_no += 1
    c.save()

import argparse

def main(argv=None):
    ap = argparse.ArgumentParser(description="Build IPM catalogue PDF (Jaquar style)")
    ap.add_argument("--xlsx", default="ITEM MASTER FOR WEBSITE.xlsx")
    ap.add_argument("--images", default="images/products")
    ap.add_argument("--collections-images", default="images/collections")
    ap.add_argument("--hero", default="images/collections/hero.jpg")
    ap.add_argument("--out", default="IPM Catalogue (Jaquar Style).pdf")
    ap.add_argument("--report", default="reports/catalogue-build-jaquar.md")
    args = ap.parse_args(argv)

    products = load_products(args.xlsx)
    included, no_image, broken, orphans = resolve_images(products, args.images)
    price_req = [p for p in included if p["mrp"] is None]
    groups = order_collections(included)
    build_pdf(groups, args.out, args.hero, args.collections_images)
    write_report(args.report, total=len(products), included=len(included),
                 no_image=no_image, broken=broken, price_on_request=price_req, orphans=orphans)
    print(f"PDF: {args.out}  ({len(included)} products, {len(groups)} collections)")

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue_jaquar.py -v`
Expected: 5 passed.

- [ ] **Step 5: Run against real data**

Run: `py "scripts/build-catalogue-jaquar.py"`
Expected: stdout shows `included=431 ... (431 products, 27 collections)`. Confirm `IPM Catalogue (Jaquar Style).pdf` and `reports/catalogue-build-jaquar.md` exist.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-catalogue-jaquar.py scripts/test_build_catalogue_jaquar.py
git commit -m "feat(catalogue): Jaquar-style build_pdf + CLI wiring"
```

---

## Task 8: Full test suite + visual verification against both real samples

**Files:** none (verification task)

- [ ] **Step 1: Run the entire test suite**

Run: `py -m pytest scripts/ -v`
Expected: all tests across `test_build_catalogue.py`, `test_catalogue_common.py`,
`test_build_catalogue_hindware.py`, `test_build_catalogue_jaquar.py` pass (9 + 5 + 3 + 5 = 22).

- [ ] **Step 2: Render and compare pages side-by-side with the real samples**

Use PyMuPDF (`fitz`) to render page 0 (cover) and the first product page of each new
PDF to PNG, plus the corresponding pages from `sample catalogue 1.pdf` /
`sample catalogue 2.pdf`, and visually compare: page orientation, grid column/row
count, price format, header/footer placement, collection banner presence. Tune
colors/spacing/font sizes in the relevant `draw_*` function if something reads
wrong, then re-run the affected build script and re-render.

- [ ] **Step 3: Confirm file sizes are reasonable**

Run: `ls -lh "IPM Catalogue (Hindware Style).pdf" "IPM Catalogue (Jaquar Style).pdf"`
Expected: both well under ~30 MB (same downscaled-image caching as the original
script, reused via `catalogue_common._load_product_image`).

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-15-catalogue-pdf-real-samples-design.md`):
- Shared data layer extraction, old script untouched behaviorally → Task 1. ✅
- Collection hero-image 3-step fallback → Task 2. ✅
- Hindware-style: landscape, 2×3 grid, code/name/price only, brand mark, collection heading → Tasks 3–4. ✅
- Jaquar-style: portrait, 3-col grid, category sub-headings, collection banner, code/desc/price → Tasks 5–7. ✅
- Two separate reports → Tasks 4, 7 (`--report` defaults differ). ✅
- Non-goals (icons, QR, swatches, size, arched divider pages) → none implemented, consistent with plan. ✅
- Repeatable CLIs → Tasks 4, 7 `main()`. ✅

**Type consistency:** product dict keys unchanged from the original pipeline
(`item_code, name, collection, category, mrp, image_filename, image_path`) — both
new `draw_cell` functions consume the same keys. `resolve_collection_hero` signature
(`collection_name, images_collections_dir, category, included_products_for_collection`)
matches its Task 2 test calls and its Task 7 call site. `_paginate_blocks` signature
(`blocks, first_page_budget, cont_page_budget`) matches Task 6 tests and Task 7 call site.

**Placeholder scan:** no TBD/TODO; every step has complete code.

**Notes for executor:**
- Layout numbers (BAND_H, ROW_H, SUB_H, BANNER_H, font sizes, etc.) are starting values — Task 8 is where visual fidelity gets tuned against the real samples.
- Do not modify `scripts/build-catalogue-pdf.py`'s behavior beyond the Task 1 refactor — its output (`IPM Catalogue.pdf`) stays as previously approved.
