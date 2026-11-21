"""Build data/ingredients.csv and data/sides.csv from the clean ETL outputs.

Composition: training/clean/wafct2019.csv via training/mappings/wafct_code_to_id.csv.
Price: training/clean/prices_feb2025.csv via training/mappings/nbs_item_to_id.csv, only for
items marked per_kg_usable, then training/mappings/price_overrides.csv (a newer price chosen by the
team, with its source and unit check). Missing prices stay empty; nothing is estimated.
Crop group (ingredients only): training/mappings/crop_group.csv (legume or oilseed).
Descriptive columns of ingredients.csv (name, local names, form sold, allergen tags) are kept
from the current file. functional_properties.csv is not touched.
"""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from training.etl.common import CLEAN, MAPPINGS, log_step  # noqa: E402

DATA = ROOT / "data"
COLUMNS = ["ingredient_id", "name", "local_names", "form_sold", "protein_g_per_100g", "fat_g", "energy_kcal",
           "iron_mg", "water_g", "price_ngn_per_kg", "price_month", "price_source", "allergen_tags", "crop_group",
           "quality", "source", "notes"]
SIDE_COLUMNS = ["ingredient_id", "name", "food_group", "form_sold", "protein_g_per_100g", "fat_g", "energy_kcal",
                "iron_mg", "water_g", "price_ngn_per_kg", "price_month", "price_source", "allergen_tags", "quality",
                "source", "notes"]
COMP = {"protein_g_per_100g": "protein_g", "fat_g": "fat_g", "energy_kcal": "kcal", "iron_mg": "iron_mg", "water_g": "water_g"}
FLAG_FIELDS = {"protein": "protein_g", "fat": "fat_g", "energy": "kcal", "iron": "iron_mg"}
WAFCT_SOURCE = "FAO/INFOODS West African Food Composition Table 2019 (per 100 g edible portion)"
INGREDIENT_SOURCE = "FAO/INFOODS West African Food Composition Table 2019 (dry raw, per 100 g edible portion)"
SIDE_NAMES = {"rice_local": ("Rice, local", "dry grain"), "rice_imported": ("Rice, imported long grain", "dry grain"),
              "garri_white": ("Garri, white", "dry granules"), "yam": ("Yam", "fresh tuber"),
              "plantain_unripe": ("Plantain, unripe", "fresh"), "plantain_ripe": ("Plantain, ripe", "fresh"),
              "maize_white": ("Maize, white", "dry grain"), "tomato": ("Tomato", "fresh"), "onion": ("Onion", "fresh")}


def price_lookup() -> dict:
    prices = pd.read_csv(CLEAN / "prices_feb2025.csv", dtype=str)
    mapping = pd.read_csv(MAPPINGS / "nbs_item_to_id.csv", dtype=str)
    usable = prices[prices["per_kg_usable"] == "True"]
    out = {}
    for _, m in mapping[mapping["table"].isin(["ingredients", "sides"])].iterrows():
        hit = usable[usable["item_label"] == m["item_label"].strip()]
        if len(hit) == 1:
            h = hit.iloc[0]
            out[m["target_id"]] = {"price": float(h["price_ngn"]), "month": h["month"], "label": h["item_label"],
                                   "unit": h["unit"], "confidence": m["confidence"]}
    for _, o in pd.read_csv(MAPPINGS / "price_overrides.csv", dtype=str).iterrows():
        out[o["ingredient_id"]] = {"price": float(o["price_ngn_per_kg"]), "month": o["price_month"],
                                   "source": o["price_source"], "unit": "kg", "override": True}
    return out


def composition(code: str, wafct: pd.DataFrame) -> tuple[dict, list[str]]:
    w = wafct.loc[code]
    vals = {k: (None if pd.isna(w[v]) else w[v]) for k, v in COMP.items()}
    imputed = [label for label, f in FLAG_FIELDS.items() if bool(w[f"imputed_{f}"])]
    return vals, imputed


def build_row(base: dict, code: str, wafct: pd.DataFrame, prices: dict, extra_notes: list[str],
              source: str = WAFCT_SOURCE) -> dict:
    vals, imputed = composition(code, wafct)
    row = {**base, **vals}
    notes = [f"WAFCT 2019 {code}: {wafct.loc[code, 'name']}."]
    row["quality"] = "estimated" if imputed else "measured"
    if imputed:
        notes.append("Imputed or borrowed in WAFCT (square brackets): " + ", ".join(imputed) + ".")
    p = prices.get(base["ingredient_id"])
    if p and p.get("override"):
        row.update(price_ngn_per_kg=round(p["price"], 2), price_month=p["month"], price_source=p["source"])
        notes.append("Price from training/mappings/price_overrides.csv (newer than the Feb 2025 NBS file).")
    elif p:
        row.update(price_ngn_per_kg=round(p["price"], 2), price_month=p["month"],
                   price_source=f"NBS Selected Food Price Watch Feb 2025, item '{p['label']}' (national average)")
        if p["unit"].startswith("kg (assumed"):
            notes.append("Price unit assumed per kg (no unit in the NBS label).")
    else:
        row.update(price_ngn_per_kg=None, price_month="", price_source="")
        notes.append("Price missing: needs a verified per-kg market price before this item can be costed.")
    row["source"] = source
    row["notes"] = " ".join(notes + extra_notes)
    return row


def main():
    wafct = pd.read_csv(CLEAN / "wafct2019.csv", dtype={"code": str}).set_index("code")
    codes = pd.read_csv(MAPPINGS / "wafct_code_to_id.csv", dtype=str)
    prices = price_lookup()
    groups = pd.read_csv(MAPPINGS / "crop_group.csv", dtype=str).set_index("crop_id")["crop_group"].to_dict()

    current = pd.read_csv(DATA / "ingredients.csv", dtype=str, keep_default_na=False).set_index("ingredient_id")
    ing_rows = []
    for _, c in codes[codes["table"] == "ingredients"].iterrows():
        cur = current.loc[c["target_id"]] if c["target_id"] in current.index else {}
        base = {"ingredient_id": c["target_id"], "name": cur.get("name", c["target_id"]),
                "local_names": cur.get("local_names", ""), "form_sold": cur.get("form_sold", ""),
                "allergen_tags": cur.get("allergen_tags", ""), "crop_group": groups.get(c["target_id"], "")}
        extra = ["Papers rarely state the cowpea variety."] if c["target_id"] == "cowpea" else []
        ing_rows.append(build_row(base, c["wafct_code"], wafct, prices, extra, source=INGREDIENT_SOURCE))
    ing = pd.DataFrame(ing_rows, columns=COLUMNS)
    ing.to_csv(DATA / "ingredients.csv", index=False)
    log_step("build_ingredients", rows_in=len(current), rows_out=len(ing),
             notes=f"priced: {int(ing['price_ngn_per_kg'].notna().sum())}; estimated: {int((ing['quality'] == 'estimated').sum())}")

    side_rows = []
    for _, c in codes[codes["table"] == "sides"].iterrows():
        name, form = SIDE_NAMES[c["target_id"]]
        base = {"ingredient_id": c["target_id"], "name": name, "food_group": c["food_group"], "form_sold": form,
                "allergen_tags": ""}
        extra = []
        edible = wafct.loc[c["wafct_code"], "edible1"]
        if pd.notna(edible) and edible < 1:
            extra.append(f"WAFCT edible portion coefficient {edible}: composition is per edible portion, price is as sold.")
        if c["confidence"] == "unsure":
            extra.append("Composition row choice is a judgement (see training/reports/needs_human.md).")
        side_rows.append(build_row(base, c["wafct_code"], wafct, prices, extra))
    sides = pd.DataFrame(side_rows, columns=SIDE_COLUMNS)
    sides.to_csv(DATA / "sides.csv", index=False)
    log_step("build_sides", rows_in=int((codes["table"] == "sides").sum()), rows_out=len(sides),
             notes=f"priced: {int(sides['price_ngn_per_kg'].notna().sum())}; vegetable oil left out of costing")


if __name__ == "__main__":
    main()
