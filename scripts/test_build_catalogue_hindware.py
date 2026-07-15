# scripts/test_build_catalogue_hindware.py
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent / "build-catalogue-hindware.py"

def load_mod():
    spec = importlib.util.spec_from_file_location("cathindware", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_constants_present():
    m = load_mod()
    assert (m.PAGE_W, m.PAGE_H) == (842, 595)
    assert m.COLS == 2 and m.ROWS == 3

def test_fmt_price():
    m = load_mod()
    assert m._fmt_price(None) == "Price on request"
    assert m._fmt_price(0) == "Price on request"
    assert m._fmt_price(1335) == "₹ 1,335/-"
