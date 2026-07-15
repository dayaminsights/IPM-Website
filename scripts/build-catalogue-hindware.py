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
