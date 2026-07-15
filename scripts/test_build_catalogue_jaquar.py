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
