"""Validate data tables and print a coverage report.

Usage: python scripts/validate_data.py [data_dir]
Exit code 1 if any error is found. Empty templates pass with warnings.
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from reference.config import ALLOWED_QUALITY  # noqa: E402

CSV_SPECS = {
    "ingredients.csv": {
        "required": ["ingredient_id", "name", "protein_g_per_100g", "price_ngn_per_kg", "quality", "source"],
        "numeric": ["protein_g_per_100g", "fat_g", "energy_kcal", "iron_mg", "water_g", "price_ngn_per_kg"],
    },
    "sides.csv": {
        "required": ["ingredient_id", "name", "food_group", "quality", "source"],
        "numeric": ["protein_g_per_100g", "fat_g", "energy_kcal", "iron_mg", "water_g", "price_ngn_per_kg"],
    },
    "functional_properties.csv": {
        "required": ["ingredient_id", "property", "value", "unit", "form", "paper_id", "page", "quote", "quality"],
        "numeric": ["value"],
    },
    "treatment_experiments.csv": {
        "required": ["exp_id", "crop_id", "treatment", "outcome_metric", "change_pct", "paper_id", "page", "quote", "quality"],
        "numeric": ["time_h", "temp_c", "baseline_value", "treated_value", "change_pct"],
    },
}


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        return r.fieldnames or [], list(r)


def main(data_dir):
    d = Path(data_dir)
    errors, warnings, coverage = [], [], {}
    tables = {}
    for name, spec in CSV_SPECS.items():
        p = d / name
        if not p.exists():
            errors.append(f"{name}: file missing")
            continue
        header, rows = read_csv(p)
        tables[name] = rows
        for col in spec["required"]:
            if col not in header:
                errors.append(f"{name}: missing column {col}")
        if not rows:
            warnings.append(f"{name}: no rows yet")
        for i, row in enumerate(rows, start=2):
            for col in spec["required"]:
                if col in header and (row.get(col) or "").strip() == "":
                    if col in ("protein_g_per_100g", "price_ngn_per_kg") and name == "ingredients.csv":
                        warnings.append(f"{name} line {i}: {col} empty (ingredient will be excluded by the engine)")
                    else:
                        errors.append(f"{name} line {i}: {col} is empty")
            if row.get("quality") and row["quality"] not in ALLOWED_QUALITY:
                errors.append(f"{name} line {i}: quality '{row['quality']}' not in {ALLOWED_QUALITY}")
            if row.get("quality") == "estimated" and name in ("ingredients.csv", "sides.csv") and not (row.get("notes") or "").strip():
                errors.append(f"{name} line {i}: estimated value needs a reason in notes")
            for col in spec["numeric"]:
                v = (row.get(col) or "").strip()
                if v:
                    try:
                        float(v)
                    except ValueError:
                        errors.append(f"{name} line {i}: {col} '{v}' is not a number")

    json_tables = {}
    for name in ("applications.json", "dishes.json", "playbook.json", "safety_rules.json"):
        p = d / name
        if not p.exists():
            errors.append(f"{name}: file missing")
            continue
        try:
            json_tables[name] = json.loads(p.read_text())
        except json.JSONDecodeError as e:
            errors.append(f"{name}: invalid JSON ({e})")
            continue
        if not json_tables[name]:
            warnings.append(f"{name}: no entries yet")

    ing_ids = {r["ingredient_id"] for r in tables.get("ingredients.csv", [])}
    side_ids = {r["ingredient_id"] for r in tables.get("sides.csv", [])}
    app_ids = {a.get("id") for a in json_tables.get("applications.json", [])}
    for r in tables.get("functional_properties.csv", []):
        if r["ingredient_id"] not in ing_ids:
            errors.append(f"functional_properties.csv: ingredient_id '{r['ingredient_id']}' not in ingredients.csv")
    for a in json_tables.get("applications.json", []):
        for need in a.get("needs", []):
            if need.get("direction") not in ("higher", "lower"):
                errors.append(f"applications.json {a.get('id')}: direction must be higher or lower")
    for dish in json_tables.get("dishes.json", []):
        if dish.get("application_id") not in app_ids:
            errors.append(f"dishes.json {dish.get('id')}: unknown application_id")
        for cid in dish.get("protein_slot_ids", []):
            if cid not in ing_ids:
                errors.append(f"dishes.json {dish.get('id')}: protein_slot_id '{cid}' not in ingredients.csv")
        for s in dish.get("side_items", []):
            if s.get("id") not in side_ids | ing_ids:
                errors.append(f"dishes.json {dish.get('id')}: side '{s.get('id')}' not in sides.csv or ingredients.csv")
    for rule in json_tables.get("safety_rules.json", []):
        if not rule.get("source"):
            errors.append(f"safety_rules.json {rule.get('id')}: source is required")
        if not isinstance(rule.get("reviewed"), bool):
            errors.append(f"safety_rules.json {rule.get('id')}: reviewed must be true or false")
        elif rule["reviewed"]:
            warnings.append(f"safety_rules.json {rule.get('id')}: marked reviewed; confirm a human did this")
        if rule.get("severity") not in ("block", "warn"):
            errors.append(f"safety_rules.json {rule.get('id')}: severity must be block or warn")
    props = {r["property"] for r in tables.get("functional_properties.csv", [])}
    for a in json_tables.get("applications.json", []):
        wsum = sum(float(n.get("weight", 0)) for n in a.get("needs", []))
        if abs(wsum - 1.0) > 1e-9:
            errors.append(f"applications.json {a.get('id')}: weights sum to {wsum}, not 1")
        for need in a.get("needs", []):
            if need.get("property") not in props:
                errors.append(f"applications.json {a.get('id')}: property '{need.get('property')}' not in functional_properties.csv")
    playbook_ids = {p.get("id") for p in json_tables.get("playbook.json", [])}
    for dish in json_tables.get("dishes.json", []):
        for pid in dish.get("playbook_ids", []):
            if pid not in playbook_ids:
                errors.append(f"dishes.json {dish.get('id')}: playbook_id '{pid}' not in playbook.json")
    for p in json_tables.get("playbook.json", []):
        if p.get("crop_id") not in ing_ids:
            errors.append(f"playbook.json {p.get('id')}: crop_id '{p.get('crop_id')}' not in ingredients.csv")
        if not p.get("sources"):
            errors.append(f"playbook.json {p.get('id')}: sources required")

    fp = tables.get("functional_properties.csv", [])
    te = tables.get("treatment_experiments.csv", [])
    coverage["functional_values_per_ingredient"] = dict(Counter(r["ingredient_id"] for r in fp))
    coverage["functional_values_per_property"] = dict(Counter(r["property"] for r in fp))
    coverage["functional_papers"] = len({r["paper_id"] for r in fp})
    coverage["treatment_rows_per_metric"] = dict(Counter(r["outcome_metric"] for r in te))
    coverage["treatment_rows_per_crop"] = dict(Counter(r["crop_id"] for r in te))
    coverage["treatment_papers"] = len({r["paper_id"] for r in te})
    coverage["quality_mix"] = dict(Counter(r["quality"] for r in fp + te))
    coverage["totals"] = {"ingredients": len(ing_ids), "functional_values": len(fp), "treatment_rows": len(te)}

    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "coverage.json").write_text(json.dumps(coverage, indent=2))
    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print(json.dumps(coverage["totals"]))
    print(f"{len(errors)} error(s), {len(warnings)} warning(s). Coverage written to reports/coverage.json")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "data"))
