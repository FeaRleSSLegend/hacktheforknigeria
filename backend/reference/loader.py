"""File loading. The only module in reference/ that reads files.

Two entry points return the same dict shape, so the engine does not care where data came from:
- load_data(data_dir): the dev path, reads data/*.csv and data/*.json.
- load_bundle(bundle_dir): the shipped path, reads the built bundle (mobile/assets/bundle).
"""
import csv
import json
from pathlib import Path

from .tables import composition_rows, property_rows, treatment_rows


def _csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _assemble(ingredients, sides, properties, applications, dishes, treatments, playbook, safety_rules, model, version):
    return {
        "ingredients": {r["ingredient_id"]: r for r in ingredients},
        "sides": {r["ingredient_id"]: r for r in sides},
        "properties": properties,
        "applications": {a["id"]: a for a in applications},
        "dishes": dishes,
        "treatments": treatments,
        "playbook": {p["id"]: p for p in playbook},
        "safetyRules": safety_rules,
        "model": model,
        "version": version,
    }


def load_data(data_dir: str | Path, model_path: str | Path | None = None) -> dict:
    d = Path(data_dir)
    te = d / "treatment_experiments.csv"
    return _assemble(
        composition_rows(_csv(d / "ingredients.csv")),
        composition_rows(_csv(d / "sides.csv")),
        property_rows(_csv(d / "functional_properties.csv")),
        _json(d / "applications.json", []),
        _json(d / "dishes.json", []),
        treatment_rows(_csv(te)) if te.exists() else [],
        _json(d / "playbook.json", []),
        _json(d / "safety_rules.json", []),
        _json(Path(model_path), {}) if model_path else {},
        "dev",
    )


def load_bundle(bundle_dir: str | Path) -> dict:
    b = Path(bundle_dir)
    manifest = _json(b / "manifest.json", None)
    if manifest is None:
        raise FileNotFoundError(f"no manifest.json in {b}; run scripts/build_bundle.py")
    return _assemble(
        _json(b / "ingredients.json", []),
        _json(b / "sides.json", []),
        _json(b / "functional_properties.json", []),
        _json(b / "applications.json", []),
        _json(b / "dishes.json", []),
        _json(b / "treatment_experiments.json", []),
        _json(b / "playbook.json", []),
        _json(b / "safety_rules.json", []),
        _json(b / "model.json", {}),
        manifest["version"],
    )
