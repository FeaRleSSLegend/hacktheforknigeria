import hashlib
import json
import shutil
from pathlib import Path

import pytest

from reference.loader import load_bundle
from scripts.build_bundle import BundleError, build

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "bundle" / "model.json"


@pytest.fixture
def data_copy(tmp_path):
    d = tmp_path / "data"
    shutil.copytree(ROOT / "data", d)
    return d


def _build(data_dir, out, date="2026-11-21"):
    return build(data_dir, MODEL, out, date)


def test_build_writes_manifest_with_matching_hashes(tmp_path):
    out = tmp_path / "bundle"
    m = _build(ROOT / "data", out)
    assert m["version"].startswith("2026-11-21-")
    for name, info in m["files"].items():
        b = (out / name).read_bytes()
        assert hashlib.sha256(b).hexdigest() == info["sha256"]
        assert len(b) == info["bytes"]
    assert load_bundle(out)["version"] == m["version"]


def test_build_is_deterministic(tmp_path):
    _build(ROOT / "data", tmp_path / "a")
    _build(ROOT / "data", tmp_path / "b")
    for f in (tmp_path / "a").iterdir():
        assert f.read_bytes() == (tmp_path / "b" / f.name).read_bytes()


def test_values_carried_unchanged(tmp_path):
    out = tmp_path / "bundle"
    _build(ROOT / "data", out)
    ing = {r["ingredient_id"]: r for r in json.loads((out / "ingredients.json").read_text(encoding="utf-8"))}
    assert ing["cowpea"]["price_ngn_per_kg"] == 2465.96
    assert ing["bambara"]["price_ngn_per_kg"] is None  # missing stays missing
    assert ing["soybean"]["allergen_tags"] == ["soy"]
    rules = json.loads((out / "safety_rules.json").read_text(encoding="utf-8"))
    assert rules and all(r["reviewed"] is False for r in rules)
    fp = json.loads((out / "functional_properties.json").read_text(encoding="utf-8"))
    assert all(r["paper_id"] and r["quote"] and r["page"] for r in fp)
    apps = json.loads((out / "applications.json").read_text(encoding="utf-8"))
    assert all("ESTIMATED" in a["notes"] for a in apps)


def _expect_error(data_dir, tmp_path, fragment):
    out = tmp_path / "out"
    with pytest.raises(BundleError) as e:
        _build(data_dir, out)
    assert any(fragment in err for err in e.value.errors), e.value.errors
    assert not out.exists()  # nothing written on failure


def test_unknown_column_fails(data_copy, tmp_path):
    p = data_copy / "ingredients.csv"
    lines = p.read_text(encoding="utf-8").splitlines()
    lines[0] += ",colour"
    lines[1:] = [ln + "," for ln in lines[1:]]
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    _expect_error(data_copy, tmp_path, "unknown column 'colour'")


def test_unknown_quality_fails(data_copy, tmp_path):
    p = data_copy / "functional_properties.csv"
    p.write_text(p.read_text(encoding="utf-8").replace(",measured\n", ",guessed\n", 1), encoding="utf-8")
    _expect_error(data_copy, tmp_path, "quality 'guessed'")


def test_missing_source_fails(data_copy, tmp_path):
    p = data_copy / "safety_rules.json"
    rules = json.loads(p.read_text(encoding="utf-8"))
    rules[0]["source"] = ""
    p.write_text(json.dumps(rules), encoding="utf-8")
    _expect_error(data_copy, tmp_path, "source is required")


def test_unknown_json_key_fails(data_copy, tmp_path):
    p = data_copy / "dishes.json"
    dishes = json.loads(p.read_text(encoding="utf-8"))
    dishes[0]["tastes_like"] = "meat"
    p.write_text(json.dumps(dishes), encoding="utf-8")
    _expect_error(data_copy, tmp_path, "unknown key 'tastes_like'")


def test_broken_playbook_reference_fails(data_copy, tmp_path):
    p = data_copy / "dishes.json"
    dishes = json.loads(p.read_text(encoding="utf-8"))
    dishes[0]["playbook_ids"].append("pb_does_not_exist")
    p.write_text(json.dumps(dishes), encoding="utf-8")
    _expect_error(data_copy, tmp_path, "pb_does_not_exist")


def test_failed_build_keeps_previous_bundle(data_copy, tmp_path):
    out = tmp_path / "bundle"
    first = _build(data_copy, out)
    (data_copy / "applications.json").write_text("not json", encoding="utf-8")
    with pytest.raises(BundleError):
        _build(data_copy, out)
    assert json.loads((out / "manifest.json").read_text(encoding="utf-8"))["version"] == first["version"]
