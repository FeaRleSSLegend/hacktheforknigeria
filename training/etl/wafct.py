"""WAFCT 2019 (salvaged xlsx) -> training/clean/wafct2019.csv.

Also writes:
  training/reports/wafct_2012_vs_2019.csv   differences against the 2012 extract (2019 is primary)
  training/reports/wafct_selected_diff.csv  differences against the earlier hand extract wafct_selected.csv
"""
import sys
import warnings
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import CLEAN, RAW, REPORTS, log_step, parse_bracket  # noqa: E402

SRC = RAW / "WAFCT_2019_salvaged.xlsx"
SHEET = "03 NV_sum_39 (per 100g EP)"
KEEP_GROUPS = ("Cereals", "Starchy roots", "Legumes", "Vegetables", "Nuts, seeds", "Fats and oils", "Soups and sauces")
# output field -> (INFOODS tagname in row 3, unit expected in the row-1 header)
FIELDS = {
    "kcal": ("ENERC", "(kcal)"),
    "water_g": ("WATER", "(g)"),
    "protein_g": ("PROTCNT", "(g)"),
    "fat_g": ("FAT", "(g)"),
    "carbs_g": ("CHOAVLDF", "(g)"),
    "fibre_g": ("FIBTG", "(g)"),
    "iron_mg": ("FE", "(mg)"),
    "phytate_mg": ("PHYTCPP", "(mg)"),
}


def locate_columns(header: list, tags: list) -> dict:
    """Find each field's column by tagname plus unit, so a shifted column fails loudly."""
    cols = {}
    for field, (tag, unit) in FIELDS.items():
        hits = [i for i, t in enumerate(tags) if str(t).strip() == tag and unit in str(header[i])]
        if len(hits) != 1:
            raise ValueError(f"{field}: expected one column tagged {tag} {unit}, found {hits}")
        cols[field] = hits[0]
    return cols


def parse(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    header, tags = list(raw.iloc[0]), list(raw.iloc[2])
    cols = locate_columns(header, tags)
    out, dropped, group = [], {"food group header row": 0, "food group not needed": 0}, None
    for _, r in raw.iloc[3:].iterrows():
        code, name = r[0], r[1]
        if pd.notna(code) and pd.isna(name):
            group = str(code).split("/")[0].strip()
            dropped["food group header row"] += 1
            continue
        if not group or not group.startswith(KEEP_GROUPS):
            dropped["food group not needed"] += 1
            continue
        row = {"code": str(code).strip(), "name": str(name).strip(), "food_group": group,
               "biblio": r[4] if pd.notna(r[4]) else "", "edible1": parse_bracket(r[5])[0]}
        for field, ci in cols.items():
            v, imp = parse_bracket(r[ci])
            row[field] = v
            row[f"imputed_{field}"] = imp
        row["is_recipe"] = "recipe" in str(row["biblio"]).lower()
        row["source"] = "FAO/INFOODS West African Food Composition Table 2019, sheet " + SHEET
        out.append(row)
    return pd.DataFrame(out), dropped


def compare_2012(clean: pd.DataFrame) -> pd.DataFrame:
    """2012 extract vs 2019, matched through sheet 11 (2012 code -> 2019 code)."""
    names = pd.read_excel(SRC, sheet_name="11 2012 vs 2019 names and codes", header=0, dtype=str)
    code_map = dict(zip(names["2012 Code"].str.strip(), names["2019 Code"].str.strip()))
    old = pd.read_csv(RAW / "wafct_protein_verified.csv", dtype={"wafct_code": str})
    idx = clean.set_index("code")
    rows = []
    for _, o in old.iterrows():
        c19 = code_map.get(o["wafct_code"])
        new = idx.loc[c19] if isinstance(c19, str) and c19 in idx.index else None
        row = {"code_2012": o["wafct_code"], "food_2012": o["food"], "value_type_2012": o["value_type"],
               "code_2019": c19 if isinstance(c19, str) else "", "name_2019": new["name"] if new is not None else ""}
        for f12, f19 in (("protein_g_per_100g", "protein_g"), ("water_g", "water_g"), ("fat_g", "fat_g")):
            v12 = o[f12]
            v19 = new[f19] if new is not None else None
            row[f"{f19}_2012"] = v12
            row[f"{f19}_2019"] = v19
            row[f"{f19}_diff"] = round(v19 - v12, 2) if v19 is not None and pd.notna(v19) and pd.notna(v12) else None
        row["note"] = "" if new is not None else "no 2019 match in the kept food groups or sheet 11"
        rows.append(row)
    return pd.DataFrame(rows)


def compare_selected(clean: pd.DataFrame) -> tuple[pd.DataFrame, str]:
    """Earlier hand extract vs the rebuild. Cells compared as parsed numbers."""
    sel = pd.read_csv(RAW / "wafct_selected.csv", dtype=str)
    pairs = {"kcal": "kcal", "water": "water_g", "protein": "protein_g", "fat": "fat_g", "carb": "carbs_g",
             "fibre": "fibre_g", "iron": "iron_mg", "phytate_mg": "phytate_mg"}
    idx = clean.set_index("code")
    diffs, missing = [], []
    for _, s in sel.iterrows():
        if s["code"] not in idx.index:
            missing.append(s["code"])
            continue
        n = idx.loc[s["code"]]
        for a, b in pairs.items():
            va, _ = parse_bracket(s[a])
            vb = n[b] if pd.notna(n[b]) else None
            if (va is None) != (vb is None) or (va is not None and abs(va - vb) > 1e-6):
                diffs.append({"code": s["code"], "field": b, "wafct_selected": s[a], "rebuild_2019": vb})
    d = pd.DataFrame(diffs, columns=["code", "field", "wafct_selected", "rebuild_2019"])
    by_field = d.groupby("field").size().to_dict() if len(d) else {}
    summary = (f"wafct_selected.csv rows: {len(sel)}; not in rebuild (food group dropped): {len(missing)}; "
               f"differing cells by field: {by_field}")
    return d, summary


def main():
    warnings.filterwarnings("ignore")
    raw = pd.read_excel(SRC, sheet_name=SHEET, header=None, dtype=object)
    clean, dropped = parse(raw)
    CLEAN.mkdir(parents=True, exist_ok=True)
    clean.to_csv(CLEAN / "wafct2019.csv", index=False)
    n_imp = {f: int(clean[f"imputed_{f}"].sum()) for f in FIELDS}
    log_step("wafct2019", rows_in=len(raw) - 3, rows_out=len(clean), dropped=dropped,
             notes=f"bracketed (imputed) cells per field: {n_imp}")
    cmp12 = compare_2012(clean)
    cmp12.to_csv(REPORTS / "wafct_2012_vs_2019.csv", index=False)
    print(f"  2012 vs 2019: {len(cmp12)} rows, {int((cmp12['protein_g_diff'].abs() > 0).sum())} protein differences")
    d, summary = compare_selected(clean)
    d.to_csv(REPORTS / "wafct_selected_diff.csv", index=False)
    print("  " + summary)


if __name__ == "__main__":
    main()
