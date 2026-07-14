# Product Catalogue PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable Python/reportlab script that renders `ITEM MASTER FOR WEBSITE.xlsx` + matched photos into a catalogue PDF replicating `IPM Chrome Catalogue April 2026-2A.pdf`, plus a discrepancy report.

**Architecture:** Pure data functions (`load_products`, `resolve_images`, `order_collections`, `paginate`) feed drawing primitives (`draw_cover/header/footer/cell`) and `build_pdf`. Data functions are unit-tested with temp fixtures; drawing is smoke-tested by page count. Everything lives in one script `scripts/build-catalogue-pdf.py` with tests in `scripts/test_build_catalogue.py`.

**Tech Stack:** Python 3.12, reportlab, openpyxl, Pillow (image desaturation), pytest. Fonts: Segoe UI (`C:\Windows\Fonts`).

---

## Data Contract (shared across tasks)

A **product** is a dict:
```python
{
  "item_code": "565",          # str, from ItemCode*
  "name": "2 Way Angle Valve With Flange",  # str, from Item Name
  "collection": "Aliva Collection",          # str, from Collection Name
  "category": "Faucets",       # str
  "mrp": 4069,                 # int or None
  "image_filename": "2-way-angle-valve-with-flange-chrome.png",  # str or None, from Site Image File
  "image_path": "C:/.../images/products/aliva/....png",          # added by resolve_images; str or None
}
```

Layout constants (top of script):
```python
PAGE_W, PAGE_H = 612, 810
TEAL = HexColor("#2E9AA6")       # tuned against sample during verification
GRAY_TAB = HexColor("#DADADA")
GRAY_TAB_TEXT = HexColor("#6E6E6E")
COLS, ROWS = 3, 4                # 12 cells/page
HEADER_H, FOOTER_H = 96, 30
MARGIN_X = 40
```

## File Structure

- Create: `scripts/build-catalogue-pdf.py` — the whole pipeline (data + draw + main/CLI).
- Create: `scripts/test_build_catalogue.py` — pytest unit + smoke tests.
- Output (runtime): `IPM Catalogue.pdf`, `reports/catalogue-build.md`.

---

### Task 1: Scaffold script + constants + font registration

**Files:**
- Create: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
# scripts/test_build_catalogue.py
import importlib.util, os
from pathlib import Path

SCRIPT = Path(__file__).parent / "build-catalogue-pdf.py"

def load_mod():
    spec = importlib.util.spec_from_file_location("catbuild", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_constants_present():
    m = load_mod()
    assert (m.PAGE_W, m.PAGE_H) == (612, 810)
    assert m.COLS == 3 and m.ROWS == 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue.py::test_constants_present -v`
Expected: FAIL (module/file not found).

- [ ] **Step 3: Write minimal implementation**

```python
# scripts/build-catalogue-pdf.py
"""Repeatable IPM product catalogue PDF builder. See docs/superpowers/specs/2026-07-14-product-catalogue-pdf-design.md"""
import os, sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

PAGE_W, PAGE_H = 612, 810
TEAL = HexColor("#2E9AA6")
GRAY_TAB = HexColor("#DADADA")
GRAY_TAB_TEXT = HexColor("#6E6E6E")
COLS, ROWS = 3, 4
HEADER_H, FOOTER_H = 96, 30
MARGIN_X = 40

FONT_DIR = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
FONTS = {"SegoeUI": "segoeui.ttf", "SegoeUI-Semibold": "seguisb.ttf", "SegoeUI-Bold": "segoeuib.ttf"}

def register_fonts():
    for name, fname in FONTS.items():
        p = FONT_DIR / fname
        if not p.exists():
            raise FileNotFoundError(f"Required font missing: {p}")
        pdfmetrics.registerFont(TTFont(name, str(p)))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_constants_present -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): scaffold PDF builder script + constants"
```

---

### Task 2: load_products — read Excel into product dicts

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
def _make_xlsx(tmp_path):
    import openpyxl
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Item Master + Images"
    ws.append(["ReferenceNo*","Item Name","ItemCode*","Collection Name","Category","MRP","DESCRIPTION","GrossWeight","Image Status","Source Image File","Site Image File","Match Score","Match Confidence"])
    ws.append(["", "Bib Cock", "181", "JP Collection", "Faucets", 1335, "", "", "Matched", "src.png", "bib-cock-chrome.png", 0.9, "High"])
    ws.append(["", "No Price Item", "999", "JP Collection", "Faucets", None, "", "", "", "", "no-img.png", "", ""])
    p = tmp_path / "m.xlsx"; wb.save(p); return p

def test_load_products(tmp_path):
    m = load_mod()
    prods = m.load_products(_make_xlsx(tmp_path))
    assert len(prods) == 2
    assert prods[0]["item_code"] == "181"
    assert prods[0]["name"] == "Bib Cock"
    assert prods[0]["mrp"] == 1335
    assert prods[0]["image_filename"] == "bib-cock-chrome.png"
    assert prods[1]["mrp"] is None          # blank MRP -> None
    assert prods[1]["image_filename"] == "no-img.png"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue.py::test_load_products -v`
Expected: FAIL (`load_products` not defined).

- [ ] **Step 3: Write minimal implementation** (append to script)

```python
import openpyxl

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_load_products -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): load_products reads Excel into product dicts"
```

---

### Task 3: resolve_images — map filenames to disk, partition, find orphans

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
def test_resolve_images(tmp_path):
    m = load_mod()
    root = tmp_path / "products"; (root / "jp").mkdir(parents=True)
    (root / "jp" / "bib-cock-chrome.png").write_bytes(b"x")
    (root / "jp" / "orphan.png").write_bytes(b"x")
    prods = [
        {"item_code":"1","name":"A","collection":"JP","category":"","mrp":10,"image_filename":"bib-cock-chrome.png","image_path":None},
        {"item_code":"2","name":"B","collection":"JP","category":"","mrp":None,"image_filename":"missing.png","image_path":None},
        {"item_code":"3","name":"C","collection":"JP","category":"","mrp":10,"image_filename":None,"image_path":None},
    ]
    included, no_image, broken, orphans = m.resolve_images(prods, root)
    assert [p["item_code"] for p in included] == ["1"]
    assert included[0]["image_path"].endswith("bib-cock-chrome.png")
    assert [p["item_code"] for p in no_image] == ["3"]
    assert [p["item_code"] for p in broken] == ["2"]
    assert "orphan.png" in orphans
    assert "bib-cock-chrome.png" not in orphans
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue.py::test_resolve_images -v`
Expected: FAIL (`resolve_images` not defined).

- [ ] **Step 3: Write minimal implementation**

```python
def _index_images(images_root):
    idx = {}
    for dirpath, _, files in os.walk(images_root):
        for f in files:
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                idx.setdefault(f, os.path.join(dirpath, f))
    return idx

def resolve_images(products, images_root):
    idx = _index_images(images_root)
    included, no_image, broken = [], [], []
    used = set()
    for p in products:
        fn = p["image_filename"]
        if not fn:
            no_image.append(p); continue
        path = idx.get(fn)
        if not path:
            broken.append(p); continue
        p["image_path"] = path
        used.add(fn)
        included.append(p)
    orphans = sorted(set(idx) - used)
    return included, no_image, broken, orphans
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_resolve_images -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): resolve_images partitions rows + finds orphans"
```

---

### Task 4: order_collections — signature lines first

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
def test_order_collections():
    m = load_mod()
    def prod(coll): return {"item_code":"x","name":"n","collection":coll,"category":"","mrp":1,"image_filename":"f","image_path":"f"}
    prods = [prod("Aliva Collection"), prod("Opell Prima Collection"), prod("Zenith Collection"),
             prod("Para Collection"), prod("Aliva Collection"), prod("Zenith Rich Gold Collection")]
    groups = m.order_collections(prods)
    names = [g[0] for g in groups]
    assert names == ["Zenith Collection","Zenith Rich Gold Collection","Opell Prima Collection","Para Collection","Aliva Collection"]
    assert len(dict(groups)["Aliva Collection"]) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue.py::test_order_collections -v`
Expected: FAIL (`order_collections` not defined).

- [ ] **Step 3: Write minimal implementation**

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_order_collections -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): order_collections puts signature lines first"
```

---

### Task 5: paginate — split groups into 12-per-page pages

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
def test_paginate():
    m = load_mod()
    def prods(n): return [{"item_code":str(i)} for i in range(n)]
    groups = [("A", prods(13)), ("B", prods(5))]
    pages = m.paginate(groups)
    # A -> 2 pages (12 + 1), B -> 1 page => 3 pages total
    assert len(pages) == 3
    assert pages[0][0] == "A" and len(pages[0][1]) == 12
    assert pages[1][0] == "A" and len(pages[1][1]) == 1
    assert pages[2][0] == "B" and len(pages[2][1]) == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue.py::test_paginate -v`
Expected: FAIL (`paginate` not defined).

- [ ] **Step 3: Write minimal implementation**

```python
def paginate(groups):
    per_page = COLS * ROWS
    pages = []
    for name, items in groups:
        for i in range(0, len(items), per_page):
            pages.append((name, items[i:i+per_page]))
    return pages
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_paginate -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): paginate groups into 12-per-page pages"
```

---

### Task 6: write_report — discrepancy report

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
def test_write_report(tmp_path):
    m = load_mod()
    rp = tmp_path / "rep.md"
    no_image = [{"item_code":"3","name":"C","collection":"JP"}]
    broken = [{"item_code":"2","name":"B","collection":"JP","image_filename":"missing.png"}]
    price_req = [{"item_code":"5","name":"E","collection":"JP"}]
    orphans = ["orphan.png"]
    m.write_report(rp, total=10, included=6, no_image=no_image, broken=broken, price_on_request=price_req, orphans=orphans)
    txt = rp.read_text(encoding="utf-8")
    assert "Included: 6" in txt
    assert "missing.png" in txt
    assert "Price on request" in txt
    assert "orphan.png" in txt
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest scripts/test_build_catalogue.py::test_write_report -v`
Expected: FAIL (`write_report` not defined).

- [ ] **Step 3: Write minimal implementation**

```python
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
    section("Orphan photos", [{"f":o} for o in orphans], lambda r: f"- {r['f']}")

    Path(report_path).write_text("\n".join(L), encoding="utf-8")
    print(f"Report: {report_path}  |  included={included} no_image={len(no_image)} broken={len(broken)} price_req={len(price_on_request)} orphans={len(orphans)}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_write_report -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): write_report emits discrepancy report"
```

---

### Task 7: Drawing primitives (cover, header, footer, cell)

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`

No unit test (pure drawing); verified via Task 8 smoke test + Task 9 visual check. Use Pillow to desaturate the cover.

- [ ] **Step 1: Implement drawing helpers** (append to script)

```python
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import io

def _draw_logo(c, x, y, scale=1.0):
    """Minimal IPM wordmark: 'IPM' + 4 right bars + 'BATH FITTINGS'."""
    c.setFillColor(HexColor("#111111"))
    c.setFont("SegoeUI-Bold", 26*scale)
    c.drawString(x, y, "IPM")
    bx = x + 52*scale
    c.setLineWidth(2.2*scale); c.setStrokeColor(HexColor("#111111"))
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

def draw_cover(c, hero_path, wef="01.04.2026"):
    if hero_path and os.path.exists(hero_path):
        c.drawImage(_desaturate(hero_path), 0, 0, PAGE_W, PAGE_H, preserveAspectRatio=False, mask=None)
        c.setFillColor(HexColor("#000000")); c.setFillAlpha(0.28)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0); c.setFillAlpha(1)
    else:
        c.setFillColor(HexColor("#2b2b2b")); c.rect(0,0,PAGE_W,PAGE_H,fill=1,stroke=0)
    c.saveState(); c.translate(PAGE_W-150, PAGE_H-80)
    c.setFillColor(HexColor("#ffffff")); c.setStrokeColor(HexColor("#ffffff"))
    c.setFont("SegoeUI-Bold", 26); c.drawString(0,0,"IPM")
    for i,w in enumerate([26,22,18,14]):
        yy = 18 - i*5.5; c.setLineWidth(2.2); c.line((26-w)+52, yy+0, 52+26, yy)
    c.setFont("SegoeUI", 6.5); c.drawString(0,-9,"B A T H   F I T T I N G S"); c.restoreState()
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("SegoeUI-Semibold", 20); c.drawCentredString(PAGE_W/2, 118, "F U L F I L L I N G   Y O U R   B A T H I N G   D E S I R E S")
    c.setFont("SegoeUI-Bold", 26); c.drawCentredString(PAGE_W/2, 70, "INDIA MRP LIST")
    c.setFont("SegoeUI-Semibold", 11); c.drawCentredString(PAGE_W/2, 48, f"W.E.F : {wef}")
    c.showPage()

def draw_header(c, collection):
    c.setFillColor(TEAL); c.rect(0, PAGE_H-HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    # white rounded plate cradling logo (left)
    c.setFillColor(HexColor("#ffffff"))
    c.roundRect(-20, PAGE_H-HEADER_H+8, 300, HEADER_H-16, 18, fill=1, stroke=0)
    _draw_logo(c, 34, PAGE_H-HEADER_H+40, scale=1.0)
    # gray tab (right) with collection name
    tab_x = PAGE_W*0.42
    c.setFillColor(GRAY_TAB); c.roundRect(tab_x, PAGE_H-HEADER_H+18, PAGE_W-tab_x-MARGIN_X, HEADER_H-36, 10, fill=1, stroke=0)
    c.setFillColor(GRAY_TAB_TEXT); c.setFont("SegoeUI-Bold", 18)
    c.drawRightString(PAGE_W-MARGIN_X-14, PAGE_H-HEADER_H+40, collection.upper())

def draw_footer(c, page_no):
    c.setFillColor(TEAL); c.rect(0, 0, PAGE_W, FOOTER_H, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff")); c.setFont("SegoeUI-Bold", 11)
    c.drawRightString(PAGE_W-MARGIN_X, 10, str(page_no))

def _fmt_price(mrp):
    return f"₹ : {mrp}/-" if mrp is not None else "Price on request"

def draw_cell(c, x, y, w, h, product):
    # code box (teal) top-left
    c.setFillColor(TEAL); c.rect(x, y+h-20, 42, 16, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff")); c.setFont("SegoeUI-Bold", 9)
    c.drawCentredString(x+21, y+h-16, str(product["item_code"]))
    # image area
    img_h = h*0.55
    if product.get("image_path") and os.path.exists(product["image_path"]):
        try:
            ir = ImageReader(product["image_path"]); iw, ih = ir.getSize()
            box_w, box_h = w*0.8, img_h
            scale = min(box_w/iw, box_h/ih)
            dw, dh = iw*scale, ih*scale
            c.drawImage(ir, x+(w-dw)/2, y+h-24-dh, dw, dh, preserveAspectRatio=True, mask="auto")
        except Exception:
            pass
    # name (uppercase, may wrap 2 lines)
    c.setFillColor(HexColor("#222222")); c.setFont("SegoeUI-Semibold", 8.5)
    name = product["name"].upper()
    ty = y + h - 24 - img_h - 8
    for line in _wrap(c, name, "SegoeUI-Semibold", 8.5, w-4)[:2]:
        c.drawString(x+2, ty, line); ty -= 11
    # price
    c.setFont("SegoeUI-Bold", 8.5); c.setFillColor(HexColor("#111111"))
    c.drawString(x+2, ty-1, _fmt_price(product.get("mrp")))

def _wrap(c, text, font, size, max_w):
    words = text.split(); lines=[]; cur=""
    for wd in words:
        t = (cur+" "+wd).strip()
        if c.stringWidth(t, font, size) <= max_w: cur=t
        else: lines.append(cur); cur=wd
    if cur: lines.append(cur)
    return lines or [""]
```

- [ ] **Step 2: Commit**

```bash
git add scripts/build-catalogue-pdf.py
git commit -m "feat(catalogue): drawing primitives for cover, header, footer, cell"
```

---

### Task 8: build_pdf — paginate + render, smoke-tested by page count

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`
- Test: `scripts/test_build_catalogue.py`

- [ ] **Step 1: Write the failing test**

```python
def test_build_pdf_page_count(tmp_path):
    m = load_mod(); m.register_fonts()
    def prod(i, coll): return {"item_code":str(i),"name":"Item","collection":coll,"category":"","mrp":10,"image_filename":None,"image_path":None}
    groups = [("Zenith Collection", [prod(i,"Zenith Collection") for i in range(13)])]  # 2 product pages
    out = tmp_path / "out.pdf"
    m.build_pdf(groups, out, hero_path=None)
    from pypdf import PdfReader
    n = len(PdfReader(str(out)).pages)
    assert n == 3   # cover + 2 product pages
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pip install pypdf -q && py -m pytest scripts/test_build_catalogue.py::test_build_pdf_page_count -v`
Expected: FAIL (`build_pdf` not defined).

- [ ] **Step 3: Write minimal implementation**

```python
def build_pdf(groups, out_path, hero_path):
    register_fonts()
    c = rl_canvas.Canvas(str(out_path), pagesize=(PAGE_W, PAGE_H))
    draw_cover(c, hero_path)
    pages = paginate(groups)
    grid_top = PAGE_H - HEADER_H - 8
    grid_bottom = FOOTER_H + 8
    cell_w = (PAGE_W - 2*MARGIN_X) / COLS
    cell_h = (grid_top - grid_bottom) / ROWS
    for pno, (coll, items) in enumerate(pages, start=1):
        draw_header(c, coll)
        for idx, product in enumerate(items):
            r, col = divmod(idx, COLS)
            x = MARGIN_X + col*cell_w
            y = grid_top - (r+1)*cell_h
            draw_cell(c, x+6, y+4, cell_w-12, cell_h-8, product)
        draw_footer(c, pno)
        c.showPage()
    c.save()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `py -m pytest scripts/test_build_catalogue.py::test_build_pdf_page_count -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py scripts/test_build_catalogue.py
git commit -m "feat(catalogue): build_pdf paginates and renders product grid"
```

---

### Task 9: main() + CLI wiring, run against real data, verify output

**Files:**
- Modify: `scripts/build-catalogue-pdf.py`

- [ ] **Step 1: Implement main()** (append to script)

```python
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

- [ ] **Step 2: Run full build against real data**

Run: `py scripts/build-catalogue-pdf.py`
Expected: prints `PDF: IPM Catalogue.pdf (~412 products, ~32 collections)` and a report summary line; `IPM Catalogue.pdf` and `reports/catalogue-build.md` exist.

- [ ] **Step 3: Verify page count + render sanity**

Run:
```bash
py -c "from pypdf import PdfReader; print('pages', len(PdfReader('IPM Catalogue.pdf').pages))"
py -c "import fitz; d=fitz.open('IPM Catalogue.pdf'); [d[i].get_pixmap(dpi=110).save(f'C:/Users/USER/AppData/Local/Temp/claude/c--Users-USER-Documents-GitHub-IPM-Website/ecd2f27d-0323-40ba-b094-a6800e239611/scratchpad/out{i}.png') for i in (0,1,2)]"
```
Then Read `scratchpad/out0.png` (cover), `out1.png`, `out2.png` and compare against the sample: header band, code boxes, images, prices, footer page number. Tune `TEAL`, spacing, font sizes if off. Re-run and re-check.

- [ ] **Step 4: Run full test suite**

Run: `py -m pytest scripts/test_build_catalogue.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-catalogue-pdf.py
git commit -m "feat(catalogue): main() CLI wiring + full build"
```

---

## Self-Review

**Spec coverage:**
- Cover → Task 7 `draw_cover` + Task 9. ✅
- 3×4 grid, header, footer, cell contents → Tasks 7–8. ✅
- Inclusion = valid on-disk image; omit + report → Tasks 3, 6. ✅
- Price on request → Task 7 `_fmt_price`, Task 9. ✅
- Code box = ItemCode → Task 7 `draw_cell`. ✅
- Signature-first ordering → Task 4. ✅
- Report (no-image, broken, price-req, orphans) → Task 6. ✅
- Repeatable CLI → Task 9. ✅
- Fonts Segoe UI w/ ₹ → Task 1. ✅

**Type consistency:** product dict keys (`item_code, name, collection, category, mrp, image_filename, image_path`) consistent across `load_products` → `resolve_images` → `draw_cell`. `resolve_images` returns 4-tuple `(included, no_image, broken, orphans)` — matches Tasks 3, 9. `write_report` kwargs match Task 9 call. ✅

**Placeholder scan:** no TBD/TODO; all steps carry real code. ✅

**Notes for executor:**
- The IPM logo in `_draw_logo`/cover is an approximation of the wordmark; acceptable for v1. If exact brand logo is needed, swap in `images/logo.svg` render later.
- `TEAL` (#2E9AA6) is a starting value — tune against the sample during Task 9 Step 3.
- Layout numbers (cell proportions, font sizes) are starting values — adjust in Task 9 visual check.
