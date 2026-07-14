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

def test_order_collections():
    m = load_mod()
    def prod(coll): return {"item_code":"x","name":"n","collection":coll,"category":"","mrp":1,"image_filename":"f","image_path":"f"}
    prods = [prod("Aliva Collection"), prod("Opell Prima Collection"), prod("Zenith Collection"),
             prod("Para Collection"), prod("Aliva Collection"), prod("Zenith Rich Gold Collection")]
    groups = m.order_collections(prods)
    names = [g[0] for g in groups]
    assert names == ["Zenith Collection","Zenith Rich Gold Collection","Opell Prima Collection","Para Collection","Aliva Collection"]
    assert len(dict(groups)["Aliva Collection"]) == 2

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
