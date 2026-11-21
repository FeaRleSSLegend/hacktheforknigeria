"""PulsesDM 1.0 (xlsx, sheet 05 NV_doc) -> training/clean/pulses_dm.csv.

Sheet 05 holds two rows per food: the data row, then a 'Value documentation' row of source
codes. We keep one row per food with the codes in doc_<field> columns. Every value is per
100 g edible portion on a dry-matter basis (EPDM). Units are read from the header tags.

Also writes:
  training/reports/crosscheck_pulses_vs_wafct.csv  DM converted to as-sold (calculated) vs WAFCT 2019
  training/reports/pulses_spread.csv               range across records of one crop (DM basis)
Amino acids stay in training/clean/ only; they are not for the bundle or the app.
"""
import re
import sys
import warnings
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import CLEAN, RAW, REPORTS, dm_to_as_sold, log_step, parse_bracket  # noqa: E402

SRC = RAW / "PulsesDM1.0.xlsx"
DOC_SHEET = "05 NV_doc (per 100 g EPDM)"
SUM_SHEET = "04 NV_sum (per 100 g EPDM)"
ID_COLS = ["FoodID", "Country, region", "Food name in English", "Processing", "Species/Subspecies",
           "Cultivar/Variety/Accession Name", "BiblioID"]
KEEP_TAGS = ["WATER", "PROTCNT", "FATCE", "CHOAVLDF", "FIBTG", "FE", "ZN",
             "ALA", "ARG", "ASP", "CYS", "GLU", "GLY", "HIS", "ILE", "LEU", "LYS", "MET", "PHE", "PRO",
             "SER", "THR", "TRP", "TYR", "VAL"]
CROPS = {"cowpea": ("Cowpea", "03_004"), "pigeon_pea": ("Pigeon pea", "03_032"), "bambara": ("Bambara", "03_001")}
CROSSCHECK = {"protein": ("protcnt_g", "protein_g"), "fat": ("fatce_g", "fat_g"), "iron": ("fe_mg", "iron_mg")}
FLAG_REL_DIFF = 0.15
_TAG = re.compile(r"^([A-Z_0-9]+)\((.+)\)$")


def split_tag(header: str) -> tuple[str, str]:
    m = _TAG.match(str(header).strip())
    if not m:
        raise ValueError(f"header '{header}' is not TAG(unit)")
    return m.group(1), m.group(2)


def parse_two_row(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """raw: sheet read with header=None. Row 2 holds tags, row 3 descriptions, data from row 4.

    A data row has a FoodID. The next row, with no FoodID and 'Value documentation' in the
    BiblioID column, carries the source codes for that food.
    """
    header = [str(h).strip() if pd.notna(h) else "" for h in raw.iloc[2]]
    col = {h: i for i, h in enumerate(header)}
    value_cols = {}
    for h in header[len(ID_COLS):]:
        if not h:
            continue
        tag, unit = split_tag(h)
        if tag in KEEP_TAGS:
            value_cols[f"{tag.lower()}_{unit}"] = col[h]
    out, dropped, pending = [], {"value documentation row (codes kept in doc_ columns)": 0, "blank row": 0}, None
    for i in range(4, len(raw)):
        r = raw.iloc[i]
        fid = r[col["FoodID"]]
        if pd.notna(fid) and str(fid).strip():
            if pending is not None:
                out.append(pending)
            pending = {c: (r[col[c]] if pd.notna(r[col[c]]) else "") for c in ID_COLS}
            for name, ci in value_cols.items():
                pending[name] = parse_bracket(r[ci])[0]
                pending[f"doc_{name}"] = ""
        elif str(r[col["BiblioID"]]).strip() == "Value documentation" and pending is not None:
            for name, ci in value_cols.items():
                pending[f"doc_{name}"] = str(r[ci]).strip() if pd.notna(r[ci]) else ""
            out.append(pending)
            pending = None
            dropped["value documentation row (codes kept in doc_ columns)"] += 1
        else:
            dropped["blank row"] += 1
    if pending is not None:
        out.append(pending)
    df = pd.DataFrame(out)
    df.insert(0, "basis", "per 100 g edible portion, dry matter (EPDM)")
    return df, dropped


def check_against_sum(clean: pd.DataFrame) -> tuple[int, list[str]]:
    """Each parsed value must equal sheet 04 (one row per food, same order).

    Compared by position because the source reuses some FoodIDs for different foods.
    Returns (mismatching cells, duplicated FoodIDs).
    """
    s = pd.read_excel(SRC, sheet_name=SUM_SHEET, header=2, dtype=object).iloc[1:]
    s = s[s["FoodID"].notna()].reset_index(drop=True)
    if len(s) != len(clean):
        return abs(len(s) - len(clean)), []
    dupes = sorted(s.loc[s["FoodID"].duplicated(), "FoodID"].unique())
    value_names = [c for c in clean.columns if c.split("_")[0].upper() in KEEP_TAGS and not c.startswith("doc_")]
    bad = 0
    for i, r in clean.iterrows():
        if r["FoodID"] != s.loc[i, "FoodID"]:
            bad += 1
            continue
        for name in value_names:
            tag, unit = name.split("_", 1)
            v = parse_bracket(s.loc[i, f"{tag.upper()}({unit})"])[0]
            a = r[name]
            if (v is None) != (a is None or pd.isna(a)) or (v is not None and abs(v - a) > 1e-9):
                bad += 1
    return bad, dupes


def crop_of(name: str) -> str | None:
    for cid, (label, _) in CROPS.items():
        if str(name).startswith(label):
            return cid
    return None


def crosscheck(clean: pd.DataFrame, wafct: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    w = wafct.set_index("code")
    raw_rows = clean[clean["Processing"].astype(str).str.strip() == "d/r"].copy()
    raw_rows["crop_id"] = raw_rows["Food name in English"].map(crop_of)
    raw_rows = raw_rows[raw_rows["crop_id"].notna()]
    checks, spread = [], []
    for _, r in raw_rows.iterrows():
        code = CROPS[r["crop_id"]][1]
        water = w.loc[code, "water_g"]
        for metric, (dm_col, w_col) in CROSSCHECK.items():
            as_sold = dm_to_as_sold(r[dm_col], water)
            ref = w.loc[code, w_col]
            rel = (as_sold - ref) / ref if as_sold is not None and ref else None
            checks.append({
                "crop_id": r["crop_id"], "pulses_food_id": r["FoodID"], "country": r["Country, region"] or "generic",
                "metric": metric, "dm_value": round(r[dm_col], 3), "doc_code": r[f"doc_{dm_col}"],
                "wafct_code": code, "wafct_water_g": water,
                "as_sold_value": round(as_sold, 3) if as_sold is not None else None, "as_sold_quality": "calculated",
                "wafct_value": ref, "wafct_imputed": bool(w.loc[code, f"imputed_{w_col}"]),
                "rel_diff": round(rel, 4) if rel is not None else None,
                "flag_over_15pct": bool(rel is not None and abs(rel) > FLAG_REL_DIFF),
            })
    for (crop, metric), g in pd.DataFrame(checks).groupby(["crop_id", "metric"]):
        spread.append({"crop_id": crop, "metric": metric, "n_records": len(g), "countries": ";".join(g["country"]),
                       "dm_min": g["dm_value"].min(), "dm_max": g["dm_value"].max(),
                       "as_sold_min": g["as_sold_value"].min(), "as_sold_max": g["as_sold_value"].max(),
                       "wafct_value": g["wafct_value"].iloc[0]})
    return pd.DataFrame(checks), pd.DataFrame(spread)


def main():
    warnings.filterwarnings("ignore")
    raw = pd.read_excel(SRC, sheet_name=DOC_SHEET, header=None, dtype=object)
    clean, dropped = parse_two_row(raw)
    CLEAN.mkdir(parents=True, exist_ok=True)
    clean.to_csv(CLEAN / "pulses_dm.csv", index=False)
    mismatches, dupes = check_against_sum(clean)
    log_step("pulses_dm", rows_in=len(raw) - 4, rows_out=len(clean), dropped=dropped,
             notes=f"one row per food; cross-check against sheet 04 NV_sum: {mismatches} mismatching cells; "
                   f"FoodIDs reused for different foods in the source: {dupes}")
    if mismatches:
        raise SystemExit("PulsesDM parser disagrees with sheet 04; stop and inspect")
    wafct = pd.read_csv(CLEAN / "wafct2019.csv", dtype={"code": str})
    checks, spread = crosscheck(clean, wafct)
    checks.to_csv(REPORTS / "crosscheck_pulses_vs_wafct.csv", index=False)
    spread.to_csv(REPORTS / "pulses_spread.csv", index=False)
    print(f"  crosscheck: {len(checks)} comparisons, {int(checks['flag_over_15pct'].sum())} over 15 percent")


if __name__ == "__main__":
    main()
