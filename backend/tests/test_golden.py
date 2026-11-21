"""Parity: the Python engine must reproduce every golden case from the built bundle."""
import json
from pathlib import Path

import pytest

from reference.loader import load_bundle
from scripts.make_fixtures import run_case

ROOT = Path(__file__).resolve().parent.parent
GOLDEN = ROOT / "tests" / "golden"
BUNDLE = ROOT / "mobile" / "assets" / "bundle"
CASES = sorted(p for p in GOLDEN.glob("*.json") if p.name != "index.json")


@pytest.fixture(scope="module")
def bundle():
    return load_bundle(BUNDLE)


def test_golden_cases_exist():
    index = json.loads((GOLDEN / "index.json").read_text(encoding="utf-8"))
    assert sorted(index["cases"]) == sorted(p.stem for p in CASES)
    assert len(CASES) >= 10


@pytest.mark.parametrize("path", CASES, ids=[p.stem for p in CASES])
def test_python_reproduces_golden(path, bundle):
    case = json.loads(path.read_text(encoding="utf-8"))
    assert case["bundleVersion"] == bundle["version"], "bundle changed: run scripts/make_fixtures.py"
    got = json.loads(json.dumps(run_case(case["fn"], case["args"], bundle)))
    assert got == case["expected"]


def test_bundle_and_data_paths_agree(bundle):
    from reference.loader import load_data
    from reference.suggest import suggest_dishes

    dev = load_data(ROOT / "data", ROOT / "bundle" / "model.json")
    inp = {"mode": "pantry", "pantryIds": ["cowpea"], "budgetNgn": 1500, "servings": 4, "targetProteinG": 20, "allergens": []}
    a, b = suggest_dishes(inp, dev), suggest_dishes(inp, bundle)
    a.pop("bundleVersion"), b.pop("bundleVersion")
    assert a == b
