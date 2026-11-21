"""Recompute every playbook effect number from data/treatment_experiments.csv. Read-only check.

Each playbook entry's rows are selected by training/mappings/playbook_row_filters.csv (crop,
treatments, papers). For every metric listed in the entry: n_rows must match, and min, median
and max of percent change recomputed from baseline_value and treated_value (rounded to 0.1) must agree within TOL. Metrics present in the source rows
but not listed in the entry are reported, not failed (the authors chose which metrics to show).
Writes training/reports/playbook_check.csv; exits 1 on any mismatch. Changes no data.
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import MAPPINGS, REPORTS, ROOT, log_step  # noqa: E402

TOL = 0.1  # percent points; plus 1e-9 for float rounding


def main():
    pb = json.loads((ROOT / "data" / "playbook.json").read_text(encoding="utf-8"))
    te = pd.read_csv(ROOT / "data" / "treatment_experiments.csv")
    filt = pd.read_csv(MAPPINGS / "playbook_row_filters.csv", dtype=str).set_index("playbook_id")
    rows, problems = [], []
    for entry in pb:
        pid = entry["id"]
        if pid not in filt.index:
            problems.append(f"{pid}: no row filter in playbook_row_filters.csv")
            continue
        f = filt.loc[pid]
        if f["crop_id"] != entry["crop_id"]:
            problems.append(f"{pid}: crop_id {entry['crop_id']} vs filter {f['crop_id']}")
        sel = te[(te["crop_id"] == f["crop_id"]) & te["treatment"].isin(f["treatments"].split(";"))
                 & te["paper_id"].isin(f["papers"].split(";"))]
        listed = entry["effect"]["metrics"]
        for metric, want in listed.items():
            m = sel[sel["outcome_metric"] == metric]
            base, treated = m["baseline_value"].astype(float), m["treated_value"].astype(float)
            v = ((treated - base) / base * 100).dropna()  # from the raw values, not the rounded change_pct
            got = {"n_rows": len(v), "min_pct": round(v.min(), 1) if len(v) else None,
                   "median_pct": round(v.median(), 1) if len(v) else None,
                   "max_pct": round(v.max(), 1) if len(v) else None}
            ok = got["n_rows"] == want["n_rows"] and all(
                got[k] is not None and abs(got[k] - want[k]) <= TOL + 1e-9 for k in ("min_pct", "median_pct", "max_pct"))
            rows.append({"playbook_id": pid, "metric": metric, **{f"file_{k}": want[k] for k in got},
                         **{f"recomputed_{k}": got[k] for k in got}, "ok": ok})
            if not ok:
                problems.append(f"{pid}/{metric}: file {want} vs recomputed {got}")
        unlisted = sorted(set(sel["outcome_metric"]) - set(listed))
        if unlisted:
            rows.append({"playbook_id": pid, "metric": "(not listed in playbook: " + ", ".join(unlisted) + ")",
                         "ok": True})
    REPORTS.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(REPORTS / "playbook_check.csv", index=False)
    checked = sum(1 for r in rows if not str(r["metric"]).startswith("("))
    log_step("check_playbook", rows_in=len(pb), rows_out=checked,
             notes=f"{checked} entry-metric effect blocks recomputed; mismatches: {len(problems)}")
    for p in problems:
        print("MISMATCH", p)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
