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
