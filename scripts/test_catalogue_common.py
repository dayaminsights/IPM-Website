# scripts/test_catalogue_common.py
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent / "catalogue_common.py"

def load_mod():
    spec = importlib.util.spec_from_file_location("catcommon", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def test_resolve_collection_hero_exact_match(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    (coll_dir / "Cube_Prima.jpg").write_bytes(b"x")
    hero = m.resolve_collection_hero("Cube Prima Collection", coll_dir, "Faucets", [])
    assert hero is not None and hero.endswith("Cube_Prima.jpg")

def test_resolve_collection_hero_progressive_and_line_prefix(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    (coll_dir / "line-opell-prima.jpg").write_bytes(b"x")
    hero = m.resolve_collection_hero("Opell Prima Matt Black Collection", coll_dir, "Faucets", [])
    assert hero is not None and hero.endswith("line-opell-prima.jpg")

def test_resolve_collection_hero_falls_back_to_product_photo(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    products = [{"item_code": "1", "image_path": str(tmp_path / "prod.png")}]
    (tmp_path / "prod.png").write_bytes(b"x")
    hero = m.resolve_collection_hero("Nonexistent Collection", coll_dir, "Faucets", products)
    assert hero == str(tmp_path / "prod.png")

def test_resolve_collection_hero_falls_back_to_category(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    (coll_dir / "cat-shower.jpg").write_bytes(b"x")
    hero = m.resolve_collection_hero("Nonexistent Collection", coll_dir, "Faucets/ Shower", [])
    assert hero is not None and hero.endswith("cat-shower.jpg")

def test_resolve_collection_hero_none_when_nothing_matches(tmp_path):
    m = load_mod()
    coll_dir = tmp_path / "collections"; coll_dir.mkdir()
    hero = m.resolve_collection_hero("Nonexistent Collection", coll_dir, "Faucets", [])
    assert hero is None
