"""Build data/treatment_experiments.csv and data/functional_properties.csv from the batch files.

Batches, in order (exp_ids after batch 1 are renumbered E### in this order):
  batch1  training/data/treatment_experiments.csv, functional_properties.csv
  batch2  training/data/new_rows/batch2/  (makinde2020; rebuilt from data/, see RECONSTRUCTED.txt)
  batch3  training/data/new_rows/batch3/  (abiodun2011, sobowale2025, mubaiwa2018, adeleke2018, ogunyinka2017)
  batch4  training/data/new_rows/batch4/  (bolade2015, akubor2017, sharma2019, kewuyemi2024, pokharel2024,
          ojha2020, gandhi2022, kanetro2021)
  batch5  training/data/new_rows/batch5/  (ijarotimi2022, nagessa2023, rizvi2024)
Derived columns appended to data/treatment_experiments.csv (from training/mappings/):
  baseline_type, treatment_family, crop_group, in_ingredient_table (crops we rank; other crops are
  treatment-effect evidence only), cumulative_from_raw, stage_order, route, stage_path (cumulative
  household stages, e.g. Bolade akara: soak > dehull > soak > wet mill > deep fry).
Steps: schema and quality checks, change_pct recompute, renames (mappings/metric_renames.csv),
vocabulary check, every paper must have a baseline type (mappings/paper_baseline.csv) and every
treatment a family (mappings/treatment_family.csv), rows listed in mappings/training_exclusions.csv
get a 'NEEDS_HUMAN:' note. Raw files are only read. data/ is overwritten only if it equals what
an earlier prefix of the batches produced (or the raw batch-1 copy), so a hand edit stops the run.
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from training.etl.common import MAPPINGS, RAW, ROOT, log_step  # noqa: E402
from training.processing_model import recompute_change  # noqa: E402

DATA = ROOT / "data"
NEW = RAW / "new_rows"
QUALITY = {"measured", "read_from_figure", "calculated", "estimated"}
BATCHES = [
    ("batch1", RAW / "treatment_experiments.csv", RAW / "functional_properties.csv"),
    ("batch2", NEW / "batch2" / "new_treatment_experiments.csv", NEW / "batch2" / "new_functional_properties.csv"),
    ("batch3", NEW / "batch3" / "new_treatment_experiments.csv", NEW / "batch3" / "new_functional_properties.csv"),
    ("batch4", NEW / "batch4" / "new_treatment_experiments.csv", NEW / "batch4" / "new_functional_properties.csv"),
    ("batch5", NEW / "batch5" / "new_treatment_experiments.csv", NEW / "batch5" / "new_functional_properties.csv"),
]
DERIVED = ["baseline_type", "treatment_family", "crop_group", "in_ingredient_table", "cumulative_from_raw",
           "stage_order", "route", "stage_path"]
# Final metric vocabulary. swelling_capacity (Abioye), swelling_power (Makinde, Sobowale) and
# swelling_index (Abiodun) are different methods and stay separate.
METRICS = {"water_absorption", "oil_absorption", "foam_capacity", "foam_stability", "emulsion_capacity",
           "emulsion_stability", "least_gelation", "bulk_density", "bulk_density_packed", "swelling_capacity",
           "swelling_power", "swelling_index", "starch_solubility", "dispersibility", "emulsion_activity",
           "phytate", "oxalate",
           "trypsin_inhibitor", "tannin", "polyphenols", "saponin", "ivpd", "protein", "fat", "fibre", "energy",
           "iron"}
NEEDS_HUMAN = "NEEDS_HUMAN: "


def check(df: pd.DataFrame, header: list[str], label: str) -> None:
    if list(df.columns) != header:
        raise SystemExit(f"{label}: header differs from batch 1: {list(df.columns)}")
    bad = sorted(set(df["quality"]) - QUALITY)
    if bad:
        raise SystemExit(f"{label}: unknown quality value(s) {bad}")


def renames() -> tuple[dict, dict]:
    m = pd.read_csv(MAPPINGS / "metric_renames.csv", dtype=str)
    return (dict(zip(m.loc[m["kind"] == "metric", "old_name"], m.loc[m["kind"] == "metric", "new_name"])),
            dict(zip(m.loc[m["kind"] == "treatment", "old_name"], m.loc[m["kind"] == "treatment", "new_name"])))


def build_treatments(batches: list) -> tuple[pd.DataFrame, dict]:
    metric_map, trt_map = renames()
    frames, header, info = [], None, {}
    for i, (label, path, _) in enumerate(batches):
        df = pd.read_csv(path, dtype={"exp_id": str, "page": str})
        header = header or list(df.columns)
        check(df, header, f"{label} treatments")
        _, mismatches, undefined = recompute_change(df)
        if mismatches:
            raise SystemExit(f"{label}: change_pct mismatch\n  " + "\n  ".join(mismatches))
        info[label] = {"rows": len(df), "papers": sorted(df["paper_id"].unique()), "zero_baseline": undefined}
        if i > 0:
            df["method_note"] = df["method_note"] + "; source file id " + df["exp_id"]
        frames.append(df)
    out = pd.concat(frames, ignore_index=True)
    out["outcome_metric"] = out["outcome_metric"].replace(metric_map)
    renamed_trt = out["treatment"].isin(trt_map.keys())
    out.loc[renamed_trt, "method_note"] = ("original treatment word: " + out.loc[renamed_trt, "treatment"]
                                           + "; " + out.loc[renamed_trt, "method_note"])
    out["treatment"] = out["treatment"].replace(trt_map)
    unknown = sorted(set(out["outcome_metric"]) - METRICS)
    if unknown:
        raise SystemExit(f"outcome metrics not in the vocabulary: {unknown}")
    baseline = pd.read_csv(MAPPINGS / "paper_baseline.csv", dtype=str)
    family = pd.read_csv(MAPPINGS / "treatment_family.csv", dtype=str)
    if missing := sorted(set(out["paper_id"]) - set(baseline["paper_id"])):
        raise SystemExit(f"papers without a baseline type in paper_baseline.csv: {missing}")
    if missing := sorted(set(out["treatment"]) - set(family["treatment"])):
        raise SystemExit(f"treatments without a family in treatment_family.csv: {missing}")
    excl = pd.read_csv(MAPPINGS / "training_exclusions.csv", dtype=str)
    for _, e in excl.iterrows():
        hit = (out["paper_id"] == e["paper_id"]) & (out["outcome_metric"] == e["outcome_metric"])
        out.loc[hit, "method_note"] = NEEDS_HUMAN + e["reason"] + "; " + out.loc[hit, "method_note"]
    n_first = info[batches[0][0]]["rows"]
    out.loc[n_first:, "exp_id"] = [f"E{n:03d}" for n in range(n_first + 1, len(out) + 1)]
    if out["exp_id"].duplicated().any():
        raise SystemExit("duplicate exp_id after renumbering")
    info["treatments_renamed"] = int(renamed_trt.sum())
    info["needs_human_rows"] = int(out["method_note"].str.startswith(NEEDS_HUMAN).sum())
    return add_derived(out, baseline, family), info


def add_derived(out: pd.DataFrame, baseline: pd.DataFrame, family: pd.DataFrame) -> pd.DataFrame:
    groups = pd.read_csv(MAPPINGS / "crop_group.csv", dtype=str)
    if missing := sorted(set(out["crop_id"]) - set(groups["crop_id"])):
        raise SystemExit(f"crops without a crop_group in crop_group.csv: {missing}")
    stages = pd.read_csv(MAPPINGS / "cumulative_stages.csv", dtype=str, keep_default_na=False)
    ingredients = set(pd.read_csv(DATA / "ingredients.csv", dtype=str)["ingredient_id"])
    out = out.copy()
    out["baseline_type"] = out["paper_id"].map(dict(zip(baseline["paper_id"], baseline["baseline_type"])))
    out["treatment_family"] = out["treatment"].map(dict(zip(family["treatment"], family["family"])))
    out["crop_group"] = out["crop_id"].map(dict(zip(groups["crop_id"], groups["crop_group"])))
    out["in_ingredient_table"] = out["crop_id"].isin(ingredients)
    st = {(r.paper_id, r.treatment): r for r in stages.itertuples()}
    keys = list(zip(out["paper_id"], out["treatment"]))
    out["cumulative_from_raw"] = [k in st for k in keys]
    out["stage_order"] = [st[k].stage_order if k in st else "" for k in keys]
    out["route"] = [st[k].route if k in st else "" for k in keys]
    out["stage_path"] = [st[k].stage_path if k in st else "" for k in keys]
    return out


def build_functional(batches: list) -> tuple[pd.DataFrame, dict]:
    frames, header, info = [], None, {}
    for label, _, path in batches:
        df = pd.read_csv(path, dtype={"page": str})
        header = header or list(df.columns)
        check(df, header, f"{label} functional")
        info[label] = {"rows": len(df), "papers": sorted(df["paper_id"].unique())}
        frames.append(df)
    return pd.concat(frames, ignore_index=True), info


def as_text(df: pd.DataFrame) -> str:
    return df.to_csv(index=False, lineterminator="\n")


def allowed_previous(name: str) -> set[str]:
    """Texts data/<name> may hold before overwrite: raw batch 1, or the output of any batch prefix."""
    raw1 = (BATCHES[0][1] if name == "treatment_experiments.csv" else BATCHES[0][2])
    texts = {raw1.read_text(encoding="utf-8").replace("\r\n", "\n")}
    for k in range(1, len(BATCHES) + 1):
        df = build_treatments(BATCHES[:k])[0] if name == "treatment_experiments.csv" else build_functional(BATCHES[:k])[0]
        texts.add(as_text(df))
        texts.add(as_text(df.drop(columns=[c for c in DERIVED if c in df.columns])))  # older builds had no derived columns
    return texts


def safe_write(df: pd.DataFrame, name: str) -> None:
    target = DATA / name
    if target.exists():
        current = target.read_text(encoding="utf-8").replace("\r\n", "\n")
        if current not in allowed_previous(name):
            raise SystemExit(f"data/{name} was edited by hand since the last build. Move those rows into a batch "
                             "file under training/data/ first, then re-run.")
    target.write_text(as_text(df), encoding="utf-8")


def main():
    te, t_info = build_treatments(BATCHES)
    fp, f_info = build_functional(BATCHES)
    safe_write(te, "treatment_experiments.csv")
    safe_write(fp, "functional_properties.csv")
    metric_map, trt_map = renames()
    baseline = pd.read_csv(MAPPINGS / "paper_baseline.csv", dtype=str)
    family = pd.read_csv(MAPPINGS / "treatment_family.csv", dtype=str)
    rows_in = sum(v["rows"] for v in t_info.values() if isinstance(v, dict))
    log_step("ingest_treatments", rows_in=rows_in, rows_out=len(te),
             notes=f"batches: {t_info}; metric renames: " + ", ".join(f"{a} -> {b}" for a, b in metric_map.items())
                   + "; treatment renames: " + ", ".join(f"{a} -> {b}" for a, b in trt_map.items())
                   + "; baseline_type by paper (not pooled as the same): "
                   + ", ".join(f"{r.paper_id}={r.baseline_type}" for r in baseline.itertuples())
                   + "; treatment_family (same unit operation family, names kept separate): "
                   + ", ".join(f"{f}: {'/'.join(g['treatment'])}" for f, g in family.groupby("family"))
                   + f"; rows marked NEEDS_HUMAN and excluded from training: {t_info['needs_human_rows']}"
                   + f"; crop_group x in_ingredient_table: {te.groupby(['crop_group', 'in_ingredient_table']).size().to_dict()}"
                   " (crops not in the ingredient table are treatment-effect evidence from a different crop only)"
                   + f"; cumulative_from_raw rows: {int(te['cumulative_from_raw'].sum())} ("
                   + "; ".join(sorted({f"{r.treatment} = {r.stage_path}" for r in te[te["cumulative_from_raw"]].itertuples()}))
                   + ")")
    log_step("ingest_functional", rows_in=sum(v["rows"] for v in f_info.values()), rows_out=len(fp),
             notes=f"batches: {f_info}")


if __name__ == "__main__":
    main()
