"""Build the app bundle: data/ + bundle/model.json -> mobile/assets/bundle/*.json + manifest.json.

Usage: python scripts/build_bundle.py [--data data] [--model bundle/model.json]
                                      [--out mobile/assets/bundle] [--date YYYY-MM-DD]

Strict: fails (exit 1, nothing written) on unknown or missing columns/keys, missing sources,
unknown quality values, bad numbers or broken cross-references. Values are carried unchanged
(quality, paper_id, page, quote, reviewed, evidence_level, notes); missing prices stay null.
Deterministic: same inputs and --date give byte-identical files. The version is the date plus a
short hash of the file hashes. The output folder is replaced atomically.
"""
import argparse
import csv
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from reference.config import ALLOWED_QUALITY  # noqa: E402
from reference.tables import (COMPOSITION_NUMERIC, PROPERTY_NUMERIC, TREATMENT_NUMERIC,  # noqa: E402
                              composition_rows, num, property_rows, treatment_rows)

SCHEMA_VERSION = 1
COMPOSITION_COLS = ["ingredient_id", "name", "local_names", "form_sold", "protein_g_per_100g", "fat_g", "energy_kcal",
                    "iron_mg", "water_g", "price_ngn_per_kg", "price_month", "price_source", "allergen_tags",
                    "quality", "source", "notes"]
CSV_SPECS = {
    "ingredients.csv": {
        "columns": COMPOSITION_COLS,
        "required": ["ingredient_id", "name", "protein_g_per_100g", "quality", "source"],
        "numeric": COMPOSITION_NUMERIC, "parse": composition_rows, "out": "ingredients.json",
    },
    "sides.csv": {
        "columns": COMPOSITION_COLS[:2] + ["food_group"] + COMPOSITION_COLS[3:],
        "required": ["ingredient_id", "name", "food_group", "quality", "source"],
        "numeric": COMPOSITION_NUMERIC, "parse": composition_rows, "out": "sides.json",
    },
    "functional_properties.csv": {
        "columns": ["ingredient_id", "property", "value", "unit", "form", "ph", "method_note", "paper_id", "page",
                    "quote", "quality"],
        "required": ["ingredient_id", "property", "value", "unit", "form", "paper_id", "page", "quote", "quality"],
        "numeric": PROPERTY_NUMERIC + ("ph",), "parse": property_rows, "out": "functional_properties.json",
    },
    "treatment_experiments.csv": {
        "columns": ["exp_id", "crop_id", "part", "treatment", "time_h", "temp_c", "ph", "outcome_metric",
                    "baseline_value", "treated_value", "change_pct", "paper_id", "page", "quote", "method_note",
                    "quality"],
        "required": ["exp_id", "crop_id", "treatment", "outcome_metric", "change_pct", "paper_id", "page", "quote",
                     "quality"],
        "numeric": TREATMENT_NUMERIC, "parse": treatment_rows, "out": "treatment_experiments.json",
    },
}
UNITS_COLS = ["unit", "commodity", "kg_per_unit", "basis", "confidence", "source", "use_in_app"]
FORMS = ("flour", "concentrate", "isolate")
JSON_KEYS = {
    "applications.json": ({"id", "name", "needs", "notes"}, {"id", "name", "needs", "notes"}),
    "dishes.json": ({"id", "name", "application_id", "protein_slot_ids", "side_items", "playbook_ids", "notes"},
                    {"id", "name", "application_id", "protein_slot_ids", "side_items", "playbook_ids"}),
    "playbook.json": ({"id", "crop_id", "goal", "steps", "conditions", "effect", "why", "evidence_level", "sources"},
                      {"id", "crop_id", "goal", "steps", "effect", "evidence_level", "sources"}),
    "safety_rules.json": ({"id", "applies_to", "severity", "text", "source", "reviewed"},
                          {"id", "applies_to", "severity", "text", "source", "reviewed"}),
}
NEED_KEYS = {"property", "direction", "weight"}
SIDE_KEYS = {"id", "as_sold_g_per_serving"}
EFFECT_KEYS = {"basis", "metrics"}
EFFECT_METRIC_KEYS = {"n_rows", "min_pct", "median_pct", "max_pct"}


class BundleError(Exception):
    def __init__(self, errors: list[str]):
        super().__init__(f"{len(errors)} error(s)")
        self.errors = errors


def _read_csv(path: Path) -> tuple[list[str], list[dict]]:
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def _check_keys(where: str, obj, allowed: set, required: set, errors: list):
    if not isinstance(obj, dict):
        errors.append(f"{where}: expected an object")
        return False
    for k in sorted(set(obj) - allowed):
        errors.append(f"{where}: unknown key '{k}'")
    for k in sorted(required - set(obj)):
        errors.append(f"{where}: missing key '{k}'")
    return True


def _csv_table(d: Path, name: str, spec: dict, errors: list) -> list[dict]:
    path = d / name
    if not path.exists():
        errors.append(f"{name}: file missing")
        return []
    header, rows = _read_csv(path)
    for c in header:
        if c not in spec["columns"]:
            errors.append(f"{name}: unknown column '{c}'")
    for c in spec["columns"]:
        if c not in header:
            errors.append(f"{name}: missing column '{c}'")
    for i, row in enumerate(rows, start=2):
        for c in spec["required"]:
            if not (row.get(c) or "").strip():
                errors.append(f"{name} line {i}: '{c}' is empty")
        if row.get("quality") not in ALLOWED_QUALITY:
            errors.append(f"{name} line {i}: quality '{row.get('quality')}' not in {ALLOWED_QUALITY}")
        for c in spec["numeric"]:
            try:
                num(row.get(c))
            except ValueError:
                errors.append(f"{name} line {i}: '{c}' value '{row.get(c)}' is not a number")
        if name in ("ingredients.csv", "sides.csv"):
            if row.get("quality") == "estimated" and not (row.get("notes") or "").strip():
                errors.append(f"{name} line {i}: estimated row needs a reason in notes")
            if (row.get("price_ngn_per_kg") or "").strip() and not (
                    (row.get("price_source") or "").strip() and (row.get("price_month") or "").strip()):
                errors.append(f"{name} line {i}: a price needs price_source and price_month")
        if name == "functional_properties.csv" and row.get("form") not in FORMS:
            errors.append(f"{name} line {i}: form '{row.get('form')}' not in {FORMS}")
    if any(e.startswith(name) for e in errors):
        return []
    return spec["parse"](rows)


def _units(d: Path, errors: list) -> list[dict]:
    path = d / "units.csv" if (d / "units.csv").exists() else d / "raw" / "units_mudu.csv"
    if not path.exists():
        return []
    header, rows = _read_csv(path)
    if header != UNITS_COLS:
        errors.append(f"{path.name}: columns must be {UNITS_COLS}")
        return []
    out = []
    for i, row in enumerate(rows, start=2):
        if not (row.get("source") or "").strip():
            errors.append(f"{path.name} line {i}: source is empty")
        try:
            out.append(dict(row, kg_per_unit=num(row["kg_per_unit"])))
        except ValueError:
            errors.append(f"{path.name} line {i}: kg_per_unit is not a number")
    return out


def _json_file(d: Path, name: str, errors: list):
    path = d / name
    if not path.exists():
        errors.append(f"{name}: file missing")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{name}: invalid JSON ({e})")
        return None


def _validate_json_tables(tables: dict, errors: list):
    for name, (allowed, required) in JSON_KEYS.items():
        items = tables.get(name)
        if items is None:
            continue
        if not isinstance(items, list):
            errors.append(f"{name}: expected a list")
            tables[name] = []
            continue
        ids = [x.get("id") for x in items if isinstance(x, dict)]
        for dup in sorted({i for i in ids if ids.count(i) > 1}):
            errors.append(f"{name}: duplicate id '{dup}'")
        for x in items:
            _check_keys(f"{name} {x.get('id') if isinstance(x, dict) else '?'}", x, allowed, required, errors)

    for a in tables.get("applications.json") or []:
        if not (a.get("notes") or "").strip():
            errors.append(f"applications.json {a.get('id')}: notes must explain the estimated weights")
        for n in a.get("needs", []):
            if _check_keys(f"applications.json {a.get('id')} need", n, NEED_KEYS, NEED_KEYS, errors):
                if n.get("direction") not in ("higher", "lower"):
                    errors.append(f"applications.json {a.get('id')}: direction must be higher or lower")
                if not isinstance(n.get("weight"), (int, float)) or n["weight"] <= 0:
                    errors.append(f"applications.json {a.get('id')}: weight must be a positive number")
    for p in tables.get("playbook.json") or []:
        if not p.get("sources"):
            errors.append(f"playbook.json {p.get('id')}: sources must not be empty")
        eff = p.get("effect")
        if _check_keys(f"playbook.json {p.get('id')} effect", eff, EFFECT_KEYS, EFFECT_KEYS, errors):
            for m, v in (eff.get("metrics") or {}).items():
                _check_keys(f"playbook.json {p.get('id')} effect.{m}", v, EFFECT_METRIC_KEYS, EFFECT_METRIC_KEYS, errors)
    for r in tables.get("safety_rules.json") or []:
        if not (r.get("source") or "").strip():
            errors.append(f"safety_rules.json {r.get('id')}: source is required")
        if r.get("severity") not in ("block", "warn"):
            errors.append(f"safety_rules.json {r.get('id')}: severity must be block or warn")
        if not isinstance(r.get("reviewed"), bool):
            errors.append(f"safety_rules.json {r.get('id')}: reviewed must be true or false")
        if not isinstance(r.get("applies_to"), list) or not r.get("applies_to"):
            errors.append(f"safety_rules.json {r.get('id')}: applies_to must be a non-empty list")
    refs = tables.get("reference_values.json")
    if refs is not None:
        if not isinstance(refs, dict):
            errors.append("reference_values.json: expected an object")
        else:
            for k, v in refs.items():
                if not isinstance(v, dict) or not (v.get("source") or "").strip():
                    errors.append(f"reference_values.json {k}: every reference value needs a source")


def _cross_refs(out: dict, errors: list):
    ing = {r["ingredient_id"] for r in out["ingredients.json"]}
    sides = {r["ingredient_id"] for r in out["sides.json"]}
    apps = {a["id"] for a in out["applications.json"]}
    pbs = {p["id"] for p in out["playbook.json"]}
    for r in out["functional_properties.json"]:
        if r["ingredient_id"] not in ing:
            errors.append(f"functional_properties.json: '{r['ingredient_id']}' not in ingredients")
    exp_ids = [r["exp_id"] for r in out["treatment_experiments.json"]]
    for dup in sorted({e for e in exp_ids if exp_ids.count(e) > 1}):
        errors.append(f"treatment_experiments.json: duplicate exp_id '{dup}'")
    for p in out["playbook.json"]:
        if p["crop_id"] not in ing:
            errors.append(f"playbook.json {p['id']}: crop '{p['crop_id']}' not in ingredients")
    for dish in out["dishes.json"]:
        if dish["application_id"] not in apps:
            errors.append(f"dishes.json {dish['id']}: unknown application_id '{dish['application_id']}'")
        for cid in dish["protein_slot_ids"]:
            if cid not in ing:
                errors.append(f"dishes.json {dish['id']}: protein '{cid}' not in ingredients")
        for s in dish["side_items"]:
            if _check_keys(f"dishes.json {dish['id']} side", s, SIDE_KEYS, SIDE_KEYS, errors) and s["id"] not in ing | sides:
                errors.append(f"dishes.json {dish['id']}: side '{s['id']}' not in sides or ingredients")
        for pid in dish["playbook_ids"]:
            if pid not in pbs:
                errors.append(f"dishes.json {dish['id']}: playbook id '{pid}' not in playbook")


def collect(data_dir: Path, model_path: Path) -> dict:
    """Read and validate everything. Returns {bundle file name: JSON value}. Raises BundleError."""
    errors: list[str] = []
    out = {spec["out"]: _csv_table(data_dir, name, spec, errors) for name, spec in CSV_SPECS.items()}
    tables = {name: _json_file(data_dir, name, errors) for name in (*JSON_KEYS, "reference_values.json")}
    _validate_json_tables(tables, errors)
    for name in JSON_KEYS:
        out[name] = tables[name] or []
    out["reference_values.json"] = tables["reference_values.json"] or {}
    out["units.json"] = _units(data_dir, errors)
    model = _json_file(model_path.parent, model_path.name, errors)
    if model is not None and not isinstance(model, dict):
        errors.append("model.json: expected a JSON object")
    out["model.json"] = model if isinstance(model, dict) else {}
    if not errors:
        _cross_refs(out, errors)
    if errors:
        raise BundleError(errors)
    return out


def _dump(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=1) + "\n").encode("utf-8")


def build(data_dir: Path, model_path: Path, out_dir: Path, date: str) -> dict:
    files = {name: _dump(v) for name, v in sorted(collect(data_dir, model_path).items())}
    hashes = {name: hashlib.sha256(b).hexdigest() for name, b in files.items()}
    short = hashlib.sha256("".join(f"{n}:{h}\n" for n, h in hashes.items()).encode()).hexdigest()[:8]
    model = json.loads(files["model.json"])
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "version": f"{date}-{short}",
        "files": {n: {"sha256": hashes[n], "bytes": len(files[n])} for n in files},
        "modelIsStub": bool(model.get("_stub")),
        "notes": [
            "Cost covers protein and sides only and excludes oil and spices.",
            "Application weights and dish portions are team estimates.",
            "Safety rules with reviewed=false have not been checked by an expert.",
            "Nothing here was lab-tested by the team.",
        ],
    }
    files["manifest.json"] = _dump(manifest)

    out_dir.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_dir.with_name(out_dir.name + ".tmp")
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    for name, b in files.items():
        (tmp / name).write_bytes(b)
    old = out_dir.with_name(out_dir.name + ".old")
    if old.exists():
        shutil.rmtree(old)
    if out_dir.exists():
        out_dir.rename(old)
    tmp.rename(out_dir)
    if old.exists():
        shutil.rmtree(old)
    return manifest


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", type=Path, default=ROOT / "data")
    ap.add_argument("--model", type=Path, default=ROOT / "bundle" / "model.json")
    ap.add_argument("--out", type=Path, default=ROOT / "mobile" / "assets" / "bundle")
    ap.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    args = ap.parse_args(argv)
    try:
        manifest = build(args.data, args.model, args.out, args.date)
    except BundleError as e:
        for err in e.errors:
            print("ERROR", err)
        print(f"Bundle NOT written: {len(e.errors)} error(s).")
        return 1
    print(f"Bundle {manifest['version']} written to {args.out} ({len(manifest['files'])} files + manifest)")
    if manifest["modelIsStub"]:
        print("WARN  model.json is a stub; processing runs in fallback mode until the AI lane's model arrives")
    return 0


if __name__ == "__main__":
    sys.exit(main())
