"""NBS Selected Food Price Watch Feb 2025 -> training/clean/prices_feb2025.csv.

The NBS table has no unit column. Units are read from the label only:
  - a pack size in kg/g/cl/ml/l, a crate, or a count -> not per kg (per_kg_usable = False),
    except an exact 1 kg pack, which is per kg already;
  - 'whole' items and eggs with no unit -> priced per item, not per kg;
  - no unit at all -> assumed per kg (flagged for a human in needs_human.md).
Nothing is converted from volume, because no density source is cited.

Also writes training/clean/prices_history_combined.csv: nbs_prices_history.csv rows for the
items that appear there plus the matching months from the Feb 2025 table, one row per month,
with the status kept. Gaps are never filled from another month.
"""
import re
import sys
import warnings
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import CLEAN, MAPPINGS, RAW, REPORTS, log_step  # noqa: E402

SRC = RAW / "selected_food_table_Feb_25.xlsx"
SHEET = "Selected Food Feb. 2025"
SOURCE = "NBS Selected Food Price Watch Feb 2025 (selected_food_table_Feb_25.xlsx), national average"
MONTH_COLS = {"Average of feb-24": "2024-02", "Average of Jan-25": "2025-01", "Average of Feb-25": "2025-02"}
HISTORY_LABEL = {"cowpea_brown": "Beans Brown", "beef_boneless": "Beef Boneless", "chicken_frozen": "Chicken meat (Frozen)"}
_PACK = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|g|cl|ml|l)\b", re.IGNORECASE)


def classify_unit(label: str) -> tuple[str, bool, str]:
    """Return (unit, per_kg_usable, reason) from an NBS item label."""
    s = str(label).strip()
    low = s.lower()
    m = _PACK.search(low)
    if m:
        qty, unit = float(m.group(1)), m.group(2).lower()
        if unit == "kg" and qty == 1.0:
            return "1 kg pack", True, "pack is exactly 1 kg"
        if unit in ("cl", "ml", "l"):
            return f"{m.group(1)} {unit} pack", False, "sold by volume; no density source cited"
        return f"{m.group(1)} {unit} pack", False, "pack size is not 1 kg; not converted"
    if "crate" in low or "pieces" in low:
        return "crate", False, "sold by count"
    if "whole" in low:
        return "per item", False, "sold whole by the item"
    if "egg" in low:
        return "per item (unit not stated)", False, "eggs are not sold by weight"
    return "kg (assumed, no unit in label)", True, "no unit in label; NBS per-kg convention assumed"


def load_table() -> pd.DataFrame:
    df = pd.read_excel(SRC, sheet_name=SHEET, header=0, dtype=object)
    df = df[df["Item Labels"].notna()].copy()
    df["item_label"] = df["Item Labels"].astype(str).str.strip()
    return df


def main():
    warnings.filterwarnings("ignore")
    df = load_table()
    mapping = pd.read_csv(MAPPINGS / "nbs_item_to_id.csv", dtype=str)
    mapping["item_label"] = mapping["item_label"].str.strip()
    to_id = dict(zip(mapping["item_label"], mapping["target_id"]))

    rows, dropped = [], {"no Feb 2025 price": 0}
    for _, r in df.iterrows():
        price = r["Average of Feb-25"]
        if pd.isna(price):
            dropped["no Feb 2025 price"] += 1
            continue
        unit, usable, reason = classify_unit(r["item_label"])
        rows.append({"item_label": r["item_label"], "target_id": to_id.get(r["item_label"], ""),
                     "price_ngn": round(float(price), 2), "unit": unit, "per_kg_usable": usable,
                     "unit_reason": reason, "month": "2025-02", "source": SOURCE, "quality": "measured"})
    clean = pd.DataFrame(rows)
    CLEAN.mkdir(parents=True, exist_ok=True)
    clean.to_csv(CLEAN / "prices_feb2025.csv", index=False)
    unmapped = sorted(set(mapping["item_label"]) - set(clean["item_label"]))
    log_step("prices_feb2025", rows_in=len(df), rows_out=len(clean), dropped=dropped,
             notes=f"per_kg_usable: {int(clean['per_kg_usable'].sum())} of {len(clean)}; "
                   f"mapping labels not found in table: {unmapped}")

    hist = pd.read_csv(RAW / "nbs_prices_history.csv", dtype={"month": str})
    h_rows = []
    for _, h in hist.iterrows():
        h_rows.append({"history_id": h["ingredient_id"], "item_label": HISTORY_LABEL.get(h["ingredient_id"], ""),
                       "price_month": h["month"], "price_ngn_per_kg": h["price_ngn_per_kg"],
                       "status": h["status"], "verified": h["status"] == "nbs_table", "source": h["source"]})
    table = df.set_index("item_label")
    for hid, label in HISTORY_LABEL.items():
        for col, month in MONTH_COLS.items():
            v = table.loc[label, col]
            if pd.notna(v):
                h_rows.append({"history_id": hid, "item_label": label, "price_month": month,
                               "price_ngn_per_kg": round(float(v), 2), "status": "nbs_table_feb2025_xlsx",
                               "verified": True, "source": SOURCE})
    comb = pd.DataFrame(h_rows).sort_values(["history_id", "price_month", "status"])
    comb.to_csv(CLEAN / "prices_history_combined.csv", index=False)

    overlap = []
    for (hid, month), g in comb.groupby(["history_id", "price_month"]):
        if len(g) > 1:
            vals = g.set_index("status")["price_ngn_per_kg"].to_dict()
            spread = max(vals.values()) - min(vals.values())
            overlap.append({"history_id": hid, "price_month": month, **{f"price_{k}": v for k, v in vals.items()},
                            "abs_diff": round(spread, 2), "agree_within_1ngn": spread <= 1.0})
    pd.DataFrame(overlap).to_csv(REPORTS / "prices_overlap_check.csv", index=False)
    n_press = int((comb["status"] == "press_quote_verify").sum())
    log_step("prices_history_combined", rows_in=len(hist), rows_out=len(comb), dropped={},
             notes=f"added {len(comb) - len(hist)} months from the Feb 2025 table; {n_press} press quotes kept "
                   f"as unverified; overlapping months checked: {len(overlap)}, "
                   f"all agree within 1 NGN: {all(o['agree_within_1ngn'] for o in overlap)}")


if __name__ == "__main__":
    main()
