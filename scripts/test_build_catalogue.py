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
