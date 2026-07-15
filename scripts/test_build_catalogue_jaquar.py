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
