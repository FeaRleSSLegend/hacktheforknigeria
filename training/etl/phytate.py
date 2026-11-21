"""PhyFoodComp 1.0 -> training/clean/phytate.csv (crops we rank only).

The workbook opens normally (food names intact), so salvage.py is not needed. Values are
mg per 100 g edible portion, fresh weight as stated in the source. The three phytate
methods (indirect precipitation, direct precipitation, anion exchange) stay in separate
columns and are never averaged together.

Also writes training/reports/crosscheck_phytate_vs_wafct.csv: raw-seed values against the
WAFCT 2019 phytate for the same crop.
"""
import sys
import warnings
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import CLEAN, RAW, REPORTS, log_step, parse_bracket  # noqa: E402

SRC = RAW / "PhyFoodComp_1.0.xlsx"
SHEETS = ["03 Legumes and their products", "06 Seeds, nuts and their produc"]
# crop_id -> (lower-case name prefixes, WAFCT 2019 raw code)
CROPS = {
    "cowpea": (("cowpea",), "03_004"),
    "bambara": (("bambara",), "03_001"),
    "pigeon_pea": (("pigeon pea",), "03_032"),
    "african_yam_bean": (("african yam bean",), "03_010"),
    "jack_bean": (("jack bean",), "03_052"),
    "soybean": (("soybean", "soya bean", "soy bean"), "03_008"),
    "groundnut": (("groundnut", "peanut"), "06_010"),
    "melon_seed": (("melon", "egusi"), "06_013"),
    "african_locust_bean": (("african locust bean",), "03_009"),
}
VALUE_COLS = {"WATER(g)": "water_g", "FE(mg)": "iron_mg", "PHYTCPPI(mg)": "phytate_indirect_mg",
              "PHYTCPPD(mg)": "phytate_direct_mg", "PHYTCPP(mg)": "phytate_anion_exchange_mg"}
ID_COLS = {"Food item ID": "food_id", "Country, region": "country", "Food name in English": "name",
           "Processing / Influencing factors": "processing", "Species/Subspecies": "species",
           "Comments on data processing/methods": "data_note", "Biblioid ": "biblio_id"}


def crop_of(name) -> str | None:
    n = str(name).strip().lower()
    for cid, (prefixes, _) in CROPS.items():
        if n.startswith(prefixes):
            return cid
    return None


def is_raw(processing) -> bool:
    return str(processing).strip() in ("r", "d", "r/d", "d/r")


def main():
    warnings.filterwarnings("ignore")
    frames, rows_in, dropped = [], 0, {"crop not ranked": 0, "no phytate value": 0}
    for sh in SHEETS:
        df = pd.read_excel(SRC, sheet_name=sh, header=0, dtype=object).iloc[1:]
        df = df[df["Food item ID"].notna()]
        rows_in += len(df)
        missing = [c for c in list(ID_COLS) + list(VALUE_COLS) if c not in df.columns]
        if missing:
            raise SystemExit(f"{sh}: columns not found {missing}")
        df["crop_id"] = df["Food name in English"].map(crop_of)
        dropped["crop not ranked"] += int(df["crop_id"].isna().sum())
        df = df[df["crop_id"].notna()]
        out = df[list(ID_COLS) + ["crop_id"]].rename(columns=ID_COLS)
        for src, dst in VALUE_COLS.items():
            out[dst] = df[src].map(lambda v: parse_bracket(v)[0])
        out["sheet"] = sh
        frames.append(out)
    clean = pd.concat(frames, ignore_index=True)
    phy = ["phytate_indirect_mg", "phytate_direct_mg", "phytate_anion_exchange_mg"]
    has = clean[phy].notna().any(axis=1)
    dropped["no phytate value"] = int((~has).sum())
    clean = clean[has]
    clean["raw_seed"] = clean["processing"].map(is_raw)
    clean["source"] = "PhyFoodComp 1.0 (FAO/INFOODS), per 100 g EP"
    CLEAN.mkdir(parents=True, exist_ok=True)
    clean.to_csv(CLEAN / "phytate.csv", index=False)
    log_step("phytate", rows_in=rows_in, rows_out=len(clean), dropped=dropped,
             notes="names recovered without salvage.py; phytate methods kept in separate columns")

    wafct = pd.read_csv(CLEAN / "wafct2019.csv", dtype={"code": str}).set_index("code")
    rows = []
    for cid, (_, code) in CROPS.items():
        g = clean[(clean["crop_id"] == cid) & clean["raw_seed"]]
        row = {"crop_id": cid, "wafct_code": code, "wafct_phytate_mg": wafct.loc[code, "phytate_mg"],
               "wafct_imputed": bool(wafct.loc[code, "imputed_phytate_mg"]), "phyfoodcomp_raw_records": len(g)}
        for col in phy:
            v = g[col].dropna()
            row[f"{col}_n"] = len(v)
            row[f"{col}_min"] = v.min() if len(v) else None
            row[f"{col}_median"] = v.median() if len(v) else None
            row[f"{col}_max"] = v.max() if len(v) else None
        rows.append(row)
    pd.DataFrame(rows).to_csv(REPORTS / "crosscheck_phytate_vs_wafct.csv", index=False)
    print(f"  phytate crosscheck written for {len(rows)} crops")


if __name__ == "__main__":
    main()
