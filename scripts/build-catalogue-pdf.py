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

def paginate(groups):
    per_page = COLS * ROWS
    pages = []
    for name, items in groups:
        for i in range(0, len(items), per_page):
            pages.append((name, items[i:i+per_page]))
    return pages
