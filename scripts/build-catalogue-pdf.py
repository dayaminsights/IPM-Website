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
