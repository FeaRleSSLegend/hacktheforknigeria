"""units_mudu.csv -> training/clean/units.csv, carrying the confidence as a quality flag.

Only the row marked default_until_weighed is usable by the app; it is a trade convention,
so its quality is 'estimated'. The 1962 lab rows are reference only. Rows marked
do_not_use are dropped.
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import CLEAN, RAW, log_step  # noqa: E402

QUALITY = {"estimated_trade_convention": "estimated", "measured_but_old_single_location": "measured"}


def main():
    raw = pd.read_csv(RAW / "units_mudu.csv")
    keep = raw[raw["use_in_app"] != "do_not_use"].copy()
    keep["quality"] = keep["confidence"].map(QUALITY)
    if keep["quality"].isna().any():
        raise SystemExit(f"unknown confidence values: {keep.loc[keep['quality'].isna(), 'confidence'].tolist()}")
    keep["notes"] = keep.apply(
        lambda r: "trade rule of thumb (50 kg bag is about 33 mudu); not weighed" if r["quality"] == "estimated"
        else "1962 lab measurement at one location; reference only", axis=1)
    keep.to_csv(CLEAN / "units.csv", index=False)
    log_step("units", rows_in=len(raw), rows_out=len(keep),
             dropped={"marked do_not_use in source": int((raw["use_in_app"] == "do_not_use").sum())})


if __name__ == "__main__":
    main()
