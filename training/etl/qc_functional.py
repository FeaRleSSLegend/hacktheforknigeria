"""QC of data/functional_properties.csv. Flags, never deletes; data/ is not changed.

Writes:
  training/clean/functional_qc.csv          original rows plus a qc_flag column
  training/reports/functional_summary.csv   n, median, min, max, papers per ingredient and property
  training/reports/functional_duplicates.csv
  training/reports/verify_checklist.csv     one row per paper for a human to check against the PDF
  training/reports/functional_missing.csv   crops with no values and the needs they lack
Fails (exit 1) if a property has two units or an ingredient-property group mixes forms.
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import CLEAN, REPORTS, ROOT, log_step  # noqa: E402

DATA = ROOT / "data"
FIXTURES = ROOT / "training" / "fixtures"
EXPECTED_UNIT = {"water_absorption": "g/g", "oil_absorption": "g/g", "bulk_density": "g/mL",
                 "foam_capacity": "%", "foam_stability": "%", "emulsion_capacity": "%",
                 "emulsion_stability": "%", "least_gelation": "% w/v", "swelling_capacity": "ratio",
                 "swelling_power": "g/g", "emulsion_activity": "%"}
MAX_PLAUSIBLE_G_PER_G = 10.0  # a printed % that slipped through undivided would be about 100x larger
DISAGREEMENT_RATIO = 3.0
OUTLIER_FACTOR = 2.0  # a value below median/2 or above median*2 in a group of 3 or more
PROCESSED_WORDS = ("fermented", "germinated", "roasted", "boiled", "not raw")


def unit_checks(fp: pd.DataFrame) -> list[str]:
    errors = []
    by_prop = fp.groupby("property")["unit"].unique()
    print("unit by property:")
    for prop, units in by_prop.items():
        print(f"  {prop:20s} {', '.join(units)}")
        if len(units) > 1:
            errors.append(f"{prop}: more than one unit {list(units)}")
        exp = EXPECTED_UNIT.get(prop)
        if exp is None:
            errors.append(f"{prop}: no expected unit defined")
        elif units[0] != exp:
            errors.append(f"{prop}: unit {units[0]} but expected {exp}")
    forms = fp.groupby(["ingredient_id", "property"])["form"].nunique()
    for (ing, prop), n in forms.items():
        if n > 1:
            errors.append(f"{ing}/{prop}: {n} forms mixed in one group")
    return errors


def summarise(fp: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (ing, prop, form), g in fp.groupby(["ingredient_id", "property", "form"]):
        v = g["value"].astype(float)
        flags = []
        if len(g) == 1 or g["paper_id"].nunique() == 1:
            flags.append("single_source")
        if v.min() > 0 and v.max() / v.min() > DISAGREEMENT_RATIO:
            flags.append("high_disagreement")
        med = v.median()
        if len(v) >= 3 and ((v < med / OUTLIER_FACTOR) | (v > med * OUTLIER_FACTOR)).any():
            flags.append("outlier_vs_median")
        rows.append({"ingredient_id": ing, "property": prop, "form": form, "unit": g["unit"].iloc[0], "n": len(g),
                     "median": v.median(), "min": v.min(), "max": v.max(),
                     "max_over_min": round(v.max() / v.min(), 2) if v.min() > 0 else None,
                     "n_papers": g["paper_id"].nunique(), "papers": ";".join(sorted(g["paper_id"].unique())),
                     "flags": ";".join(flags)})
    return pd.DataFrame(rows)


def row_flags(fp: pd.DataFrame, summary: pd.DataFrame) -> pd.Series:
    key = summary.set_index(["ingredient_id", "property", "form"])["flags"]
    out = []
    for _, r in fp.iterrows():
        f = [x for x in key.loc[(r["ingredient_id"], r["property"], r["form"])].split(";") if x]
        if r["unit"] == "g/g" and float(r["value"]) > MAX_PLAUSIBLE_G_PER_G:
            f.append("possible_percent_not_divided")
        if "verify against the PDF" in str(r["method_note"]):
            f.append("not_checked_against_pdf")
        if any(w in str(r["method_note"]).lower() for w in PROCESSED_WORDS):
            f.append("processed_flour")
        med = summary.set_index(["ingredient_id", "property", "form"]).loc[(r["ingredient_id"], r["property"], r["form"]), "median"]
        n = summary.set_index(["ingredient_id", "property", "form"]).loc[(r["ingredient_id"], r["property"], r["form"]), "n"]
        v = float(r["value"])
        if n >= 3 and (v < med / OUTLIER_FACTOR or v > med * OUTLIER_FACTOR):
            f.append("this_value_outlier")
        out.append(";".join(f))
    return pd.Series(out, index=fp.index)


def verify_checklist(fp: pd.DataFrame, te: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for table, df, cols in (("functional_properties", fp, "property"), ("treatment_experiments", te, "outcome_metric")):
        for paper, g in df.groupby("paper_id"):
            rows.append({"paper_id": paper, "table": table, "pages_or_tables": ";".join(sorted(g["page"].astype(str).unique())),
                         "rows_to_check": len(g), "fields": ";".join(sorted(g[cols].unique())),
                         "checked_by_initials": "", "checked_date": "", "result": ""})
    return pd.DataFrame(rows)


def missing_table(fp: pd.DataFrame) -> pd.DataFrame:
    ing = pd.read_csv(DATA / "ingredients.csv")
    apps = json.loads((DATA / "applications.json").read_text())
    source = "data/applications.json"
    if not apps:
        apps = json.loads((FIXTURES / "TEST_FIXTURE_applications.json").read_text())
        source = "TEST FIXTURE (data/applications.json is empty)"
    rows = []
    for app in apps:
        needs = [n["property"] for n in app["needs"]]
        for cid in ing["ingredient_id"]:
            have = set(fp.loc[fp["ingredient_id"] == cid, "property"])
            lacking = [p for p in needs if p not in have]
            rows.append({"application_id": app["id"], "needs_source": source, "ingredient_id": cid,
                         "n_functional_values": int((fp["ingredient_id"] == cid).sum()),
                         "needs_with_data": ";".join(p for p in needs if p in have), "needs_missing": ";".join(lacking),
                         "engine_effect": "excluded (no functional data)" if len(lacking) == len(needs)
                         else ("partial data flag" if lacking else "complete")})
    return pd.DataFrame(rows)


def main():
    fp = pd.read_csv(DATA / "functional_properties.csv")
    te = pd.read_csv(DATA / "treatment_experiments.csv")
    errors = unit_checks(fp)
    summary = summarise(fp)
    qc = fp.copy()
    qc["qc_flag"] = row_flags(fp, summary)
    CLEAN.mkdir(parents=True, exist_ok=True)
    qc.to_csv(CLEAN / "functional_qc.csv", index=False)
    summary.to_csv(REPORTS / "functional_summary.csv", index=False)
    # several rows per paper are normal for multi-variety papers (the variety is in method_note)
    dupes = fp[fp.duplicated(["ingredient_id", "property", "paper_id", "form", "method_note"], keep=False)]
    dupes.to_csv(REPORTS / "functional_duplicates.csv", index=False)
    verify_checklist(fp, te).to_csv(REPORTS / "verify_checklist.csv", index=False)
    missing = missing_table(fp)
    missing.to_csv(REPORTS / "functional_missing.csv", index=False)

    pd.set_option("display.width", 200)
    print(summary[["ingredient_id", "property", "unit", "n", "median", "min", "max", "n_papers", "flags"]].to_string(index=False))
    print(f"duplicates (same ingredient, property, paper, form, method note): {len(dupes)} rows")
    flagged = summary["flags"].str.contains("high_disagreement")
    log_step("qc_functional", rows_in=len(fp), rows_out=len(qc),
             notes=f"groups: {len(summary)}; single_source: {int(summary['flags'].str.contains('single_source').sum())}; "
                   f"high_disagreement: {summary.loc[flagged, ['ingredient_id', 'property']].values.tolist()}; "
                   f"duplicates: {len(dupes)}; unit/form errors: {len(errors)}")
    for e in errors:
        print("ERROR", e)
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
