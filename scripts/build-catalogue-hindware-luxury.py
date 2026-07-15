"""Premium/editorial restyle of the Hindware-style landscape catalogue.
Design system (black + ivory + gold, Playfair Display / Inter) sourced via the
ui-ux-pro-max skill's --design-system query for a luxury print catalogue.
Same 2x3 grid geometry and data pipeline as build-catalogue-hindware.py — this
file only changes typography, color, and ornamentation.
"""
import os, sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalogue_common import (
    load_products, resolve_images, order_collections,
    paginate, write_report, _load_product_image, _wrap,
)
from reportlab.lib.utils import ImageReader
from PIL import Image
import io

PAGE_W, PAGE_H = 842, 595
COLS, ROWS = 2, 3
MARGIN_X = 50
FOOTER_H = 34

INK = HexColor("#1C1917")
IVORY = HexColor("#FAFAF9")
GOLD = HexColor("#A16207")
GOLD_LIGHT = HexColor("#C9A24B")
SLATE = HexColor("#44403C")
HAIRLINE = HexColor("#D6D3D1")
WHITE = HexColor("#FFFFFF")

FONT_DIR = Path(__file__).resolve().parent / "fonts"
LUX_FONTS = {
    "Playfair": "PlayfairDisplay-Regular.ttf",
    "Playfair-SemiBold": "PlayfairDisplay-SemiBold.ttf",
    "Playfair-Bold": "PlayfairDisplay-Bold.ttf",
    "Inter": "Inter-Regular.ttf",
    "Inter-Medium": "Inter-Medium.ttf",
    "Inter-SemiBold": "Inter-SemiBold.ttf",
    "Inter-Bold": "Inter-Bold.ttf",
}

def register_luxury_fonts():
    for name, fname in LUX_FONTS.items():
        p = FONT_DIR / fname
        if not p.exists():
            raise FileNotFoundError(f"Required font missing: {p}")
        pdfmetrics.registerFont(TTFont(name, str(p)))

def _fmt_price(mrp):
    return f"₹ {mrp:,}" if mrp else "Price on Request"

def _draw_tracked(c, x, y, text, font, size, char_space, color):
    """Real letter-spacing (PDF text-object char space), for editorial-style
    tracked small caps / eyebrow labels."""
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(char_space)
    t.setFillColor(color)
    t.textOut(text)
    c.drawText(t)

_INK_RGB = (0x1C, 0x19, 0x17)

def _build_cover_image(hero_path, px_w=1684, px_h=1190, scrim_frac=340 / PAGE_H):
    """Cover-fit crop the hero photo to the page aspect ratio and bake in a
    smooth bottom-to-top gradient (dark near the foot, clear at the top) so
    the title stays legible. Composited once in PIL to avoid PDF banding
    artifacts that stacked semi-transparent rects produce when rasterized."""
    if hero_path and os.path.exists(hero_path):
        im = Image.open(hero_path).convert("RGB")
        target_ratio = px_w / px_h
        iw, ih = im.size
        src_ratio = iw / ih
        if src_ratio > target_ratio:
            new_w = int(ih * target_ratio); x0 = (iw - new_w) // 2
            im = im.crop((x0, 0, x0 + new_w, ih))
        else:
            new_h = int(iw / target_ratio); y0 = (ih - new_h) // 2
            im = im.crop((0, y0, iw, y0 + new_h))
        im = im.resize((px_w, px_h), Image.LANCZOS)
    else:
        im = Image.new("RGB", (px_w, px_h), _INK_RGB)

    scrim_px = int(px_h * scrim_frac)
    overlay = Image.new("RGB", (px_w, px_h), _INK_RGB)
    mask = Image.new("L", (1, px_h), 0)
    top = px_h - scrim_px
    for y in range(px_h):
        if y < top:
            a = 0
        else:
            frac = (y - top) / scrim_px
            a = int(255 * min(1.0, 0.28 + 0.70 * (frac ** 1.3)))
        mask.putpixel((0, y), a)
    mask = mask.resize((px_w, px_h))
    im = Image.composite(overlay, im, mask)
    buf = io.BytesIO(); im.save(buf, format="JPEG", quality=90); buf.seek(0)
    return ImageReader(buf)

def draw_cover(c, hero_path, wef="01.04.2026", year="2026"):
    c.drawImage(_build_cover_image(hero_path), 0, 0, PAGE_W, PAGE_H, preserveAspectRatio=False, mask=None)

    scrim_h = 340
    c.setStrokeColor(GOLD); c.setLineWidth(1)
    c.line(MARGIN_X, scrim_h - 44, PAGE_W - MARGIN_X, scrim_h - 44)

    _draw_tracked(c, MARGIN_X, PAGE_H - 52, "IPM", "Playfair-Bold", 26, 3, WHITE)
    _draw_tracked(c, MARGIN_X, PAGE_H - 68, "BATH FITTINGS", "Inter-Medium", 7.5, 3.2, WHITE)

    _draw_tracked(c, MARGIN_X, scrim_h - 76, "THE COMPLETE COLLECTION", "Inter-Medium", 9, 3, GOLD_LIGHT)
    c.setFillColor(WHITE); c.setFont("Playfair-Bold", 38)
    c.drawString(MARGIN_X, scrim_h - 120, "India MRP List")
    c.setFont("Inter", 10.5); c.setFillColor(HexColor("#E7E5E4"))
    c.drawString(MARGIN_X, scrim_h - 142, f"Effective {wef}   ·   Edition {year}")
    c.showPage()

def draw_collection_header(c, collection_name):
    c.setFillColor(IVORY); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    _draw_tracked(c, MARGIN_X, PAGE_H - 40, "COLLECTION", "Inter-Medium", 8.5, 3, GOLD)
    c.setFillColor(INK); c.setFont("Playfair-Bold", 25)
    c.drawString(MARGIN_X, PAGE_H - 68, collection_name.title())
    c.setStrokeColor(GOLD); c.setLineWidth(1.2)
    c.line(MARGIN_X, PAGE_H - 78, MARGIN_X + 74, PAGE_H - 78)
    _draw_tracked(c, PAGE_W - MARGIN_X - 150, PAGE_H - 40, "IPM BATH FITTINGS", "Inter-Medium", 7.5, 2, SLATE)

def draw_footer(c, page_no):
    c.setStrokeColor(HAIRLINE); c.setLineWidth(0.75)
    c.line(MARGIN_X, FOOTER_H, PAGE_W - MARGIN_X, FOOTER_H)
    c.setFillColor(SLATE); c.setFont("Inter", 8)
    c.drawString(MARGIN_X, FOOTER_H - 16, "IPM BATH FITTINGS  ·  INDIA MRP LIST")
    c.setFillColor(INK); c.setFont("Inter-SemiBold", 9)
    c.drawRightString(PAGE_W - MARGIN_X, FOOTER_H - 16, str(page_no))

def draw_cell(c, x, y, w, h, product):
    img_w = w * 0.38
    plate_pad = 4
    c.setStrokeColor(HAIRLINE); c.setLineWidth(0.6)
    c.rect(x, y + plate_pad, img_w, h - 2 * plate_pad, fill=0, stroke=1)
    if product.get("image_path") and os.path.exists(product["image_path"]):
        try:
            ir, (iw, ih) = _load_product_image(product["image_path"])
            box_w, box_h = img_w - 16, h - 2 * plate_pad - 16
            scale = min(box_w / iw, box_h / ih)
            dw, dh = iw * scale, ih * scale
            c.drawImage(ir, x + (img_w - dw) / 2, y + (h - dh) / 2, dw, dh, preserveAspectRatio=True, mask="auto")
        except Exception as e:
            print(f"WARNING: failed to draw image for {product.get('item_code')} "
                  f"({product['image_path']}): {e}", file=sys.stderr)

    c.setStrokeColor(GOLD); c.setLineWidth(1)
    tx = x + img_w + 14
    c.line(tx, y + h * 0.22, tx, y + h * 0.78)

    tx2 = tx + 16
    text_w = w - img_w - 30
    c.setFillColor(INK); c.setFont("Inter-SemiBold", 10.5)
    name_lines = _wrap(c, product["name"], "Inter-SemiBold", 10.5, text_w)[:2]
    ty = y + h - 24
    for line in name_lines:
        c.drawString(tx2, ty, line); ty -= 13

    c.setFont("Inter", 7.5); c.setFillColor(SLATE)
    c.drawString(tx2, ty - 6, f"REF.  {product['item_code']}")

    c.setFont("Playfair-SemiBold", 13); c.setFillColor(GOLD)
    c.drawString(tx2, ty - 27, _fmt_price(product.get("mrp")))

def build_pdf(groups, out_path, hero_path):
    register_luxury_fonts()
    c = rl_canvas.Canvas(str(out_path), pagesize=(PAGE_W, PAGE_H))
    draw_cover(c, hero_path)
    pages = paginate(groups, per_page=COLS * ROWS)
    grid_top = PAGE_H - 100
    grid_bottom = FOOTER_H + 16
    cell_w = (PAGE_W - 2 * MARGIN_X) / COLS
    cell_h = (grid_top - grid_bottom) / ROWS
    for pno, (coll, items) in enumerate(pages, start=1):
        draw_collection_header(c, coll)
        for idx, product in enumerate(items):
            r, col = divmod(idx, COLS)
            x = MARGIN_X + col * cell_w
            y = grid_top - (r + 1) * cell_h
            draw_cell(c, x + 6, y + 6, cell_w - 12, cell_h - 12, product)
        draw_footer(c, pno)
        c.showPage()
    c.save()

import argparse

def main(argv=None):
    ap = argparse.ArgumentParser(description="Build IPM catalogue PDF (Hindware Luxury style)")
    ap.add_argument("--xlsx", default="ITEM MASTER FOR WEBSITE.xlsx")
    ap.add_argument("--images", default="images/products")
    ap.add_argument("--hero", default="images/home/hero.jpg")
    ap.add_argument("--out", default="IPM Catalogue (Hindware Luxury Style).pdf")
    ap.add_argument("--report", default="reports/catalogue-build-hindware-luxury.md")
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
