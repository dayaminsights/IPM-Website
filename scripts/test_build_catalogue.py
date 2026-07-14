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
