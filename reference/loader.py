"""File loading. The only module here that reads files."""
import csv
import json
from pathlib import Path


def _csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def load_data(data_dir: str | Path) -> dict:
    d = Path(data_dir)
    ingredients = _csv(d / "ingredients.csv")
    for r in ingredients:
        for k in ("protein_g_per_100g", "price_ngn_per_kg", "fat_g", "energy_kcal", "iron_mg", "water_g"):
            r[k] = _num(r.get(k))
        r["allergen_tags"] = [t for t in (r.get("allergen_tags") or "").split(";") if t]
    sides = _csv(d / "sides.csv")
    for r in sides:
        for k in ("protein_g_per_100g", "price_ngn_per_kg", "fat_g", "energy_kcal", "iron_mg", "water_g"):
            r[k] = _num(r.get(k))
        r["allergen_tags"] = [t for t in (r.get("allergen_tags") or "").split(";") if t]
    return {
        "ingredients": {r["ingredient_id"]: r for r in ingredients},
        "sides": {r["ingredient_id"]: r for r in sides},
        "properties": _csv(d / "functional_properties.csv"),
        "applications": {a["id"]: a for a in json.loads((d / "applications.json").read_text())},
        "dishes": json.loads((d / "dishes.json").read_text()),
        "version": "dev",
    }
