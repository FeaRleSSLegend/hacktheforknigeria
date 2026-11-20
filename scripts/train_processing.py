"""Train and gate the processing model per outcome metric.

Usage: python scripts/train_processing.py
Writes reports/metrics.json, reports/metrics.md and bundle/model.json. model.json lists
only shipped models; when none ship, its "models" object is empty and the app uses the
fallback (reference/processing_fallback.py) for every metric.
"""
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from training.processing_model import (  # noqa: E402
    MIN_PAPERS, MIN_ROWS, antinutrient_rows, evaluate, fit_final, recompute_change)

REPORTS = ROOT / "reports"
BUNDLE = ROOT / "bundle"


def fmt(v, nd=2):
    return "" if v is None else f"{v:.{nd}f}"


def write_markdown(metrics: dict, path: Path) -> None:
    lines = [
        "# Processing model: grouped cross-validation vs baselines",
        "",
        f"Generated {metrics['generated']}. Source: data/treatment_experiments.csv "
        f"({metrics['rows_used']} rows used; {metrics['rows_excluded_needs_human']} rows marked NEEDS_HUMAN excluded). "
        "Target: percent change against the untreated sample in the same paper; that sample's type (raw, dehulled, "
        "soaked, germinated) is a model feature. Validation: GroupKFold by paper (rows from one paper never split across "
        "train and test), alpha chosen by an inner grouped CV. B0 = predict no change. B1 = mean change of the same "
        "treatment in the training folds. MAE in percent points.",
        "",
        f"Ship rule: at least {MIN_ROWS} rows AND model MAE below the better baseline. A metric with fewer than "
        f"{MIN_PAPERS} papers cannot be cross-validated.",
        "",
        "In range = held-out rows whose crop, treatment, time and temperature were inside the training folds. "
        "The app predicts only for such inputs, so when it is 0 the backtest measures extrapolation the app would "
        "never do; the model error there can be very large.",
        "",
        "| Metric | Rows | Papers | Crops | Model MAE | B0 MAE | B1 MAE | In range | Shipped | Reason |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for name, m in metrics["per_metric"].items():
        lines.append(f"| {name} | {m['n_rows']} | {m['n_papers']} | {m['n_crops']} | {fmt(m.get('mae_model'))} | "
                     f"{fmt(m.get('mae_b0'))} | {fmt(m.get('mae_b1'))} | {m.get('n_test_in_training_range', '')} | "
                     f"{'yes' if m['shipped'] else 'no'} | {m['reason']} |")
    p = metrics["pooled_antinutrients_exploratory"]
    lines += ["", "Exploratory (not for shipping without approval): all antinutrient metrics pooled, metric as a feature. "
              f"{p['n_rows']} rows from {p['n_papers']} papers after exclusions "
              f"({p['n_rows_including_needs_human']} rows from {p['n_papers_including_needs_human']} papers including "
              "the NEEDS_HUMAN rows).",
              "", "| Pooled | Rows | Papers | Crops | Model MAE | B0 MAE | B1 MAE | In range | Shipped | Reason |",
              "|---|---|---|---|---|---|---|---|---|---|",
              f"| antinutrients | {p['n_rows']} | {p['n_papers']} | {p['n_crops']} | {fmt(p.get('mae_model'))} | "
              f"{fmt(p.get('mae_b0'))} | {fmt(p.get('mae_b1'))} | {p.get('n_test_in_training_range', '')} | "
              f"{'yes' if p['shipped'] else 'no'} | {p['reason']} |",
              "", f"**Shipped models: {len(metrics['shipped_metrics'])}.** "
              + ("Every metric uses the fallback: the nearest published rows with citations, no prediction."
                 if not metrics["shipped_metrics"] else "Other metrics use the fallback."),
              "", "All rows were transcribed from paper text and are not yet checked against the PDFs."]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    raw = pd.read_csv(ROOT / "data" / "treatment_experiments.csv")
    df, mismatches, undefined = recompute_change(raw)
    if mismatches:
        print("change_pct does not match baseline/treated:\n  " + "\n  ".join(mismatches))
        return 1
    print(f"change_pct recomputed for {len(df)} rows: all match within 0.01; undefined (zero baseline): {undefined}")
    df = df[df["change_pct"].notna()]
    baseline = pd.read_csv(ROOT / "training" / "mappings" / "paper_baseline.csv", dtype=str)
    df = df.merge(baseline[["paper_id", "baseline_type"]], on="paper_id", how="left")
    if df["baseline_type"].isna().any():
        print("papers without baseline_type:", sorted(df.loc[df["baseline_type"].isna(), "paper_id"].unique()))
        return 1
    excl = pd.read_csv(ROOT / "training" / "mappings" / "training_exclusions.csv", dtype=str)
    excl_mask = df.set_index(["paper_id", "outcome_metric"]).index.isin(
        list(zip(excl["paper_id"], excl["outcome_metric"])))
    df_all, df = df, df[~excl_mask].reset_index(drop=True)
    print(f"excluded from training (NEEDS_HUMAN, training_exclusions.csv): {int(excl_mask.sum())} rows")

    counts = df.groupby("outcome_metric").agg(rows=("exp_id", "size"), papers=("paper_id", "nunique"),
                                              crops=("crop_id", "nunique"))
    print(counts.to_string())

    per_metric, models = {}, {}
    for metric, g in df.groupby("outcome_metric"):
        res = evaluate(g.reset_index(drop=True))
        per_metric[metric] = res
        if res["shipped"]:
            models[metric] = fit_final(g.reset_index(drop=True), metric, residual_sd=res["residual_sd"])

    pooled = antinutrient_rows(df).reset_index(drop=True)
    pooled_all = antinutrient_rows(df_all)
    pooled_res = evaluate(pooled, use_metric=True)
    pooled_res["exploratory"] = True
    pooled_res["metrics_pooled"] = sorted(pooled["outcome_metric"].unique())
    pooled_res["n_rows_including_needs_human"] = len(pooled_all)
    pooled_res["n_papers_including_needs_human"] = int(pooled_all["paper_id"].nunique())
    if pooled_res["shipped"]:
        pooled_res["shipped"] = False
        pooled_res["reason"] += "; not shipped: pooling needs human approval"

    metrics = {
        "generated": date.today().isoformat(),
        "source": "data/treatment_experiments.csv",
        "rule": {"min_rows": MIN_ROWS, "min_papers": MIN_PAPERS, "must_beat": "min(B0, B1) grouped-CV MAE"},
        "rows_used": len(df), "rows_excluded_zero_baseline": undefined,
        "rows_excluded_needs_human": int(excl_mask.sum()),
        "features": "crop, treatment, baseline type (one-hot); time_h, temp_c, time^2, time x temp (standardised)",
        "per_metric": per_metric,
        "pooled_antinutrients_exploratory": pooled_res,
        "shipped_metrics": sorted(models),
    }
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "metrics.json").write_text(json.dumps(metrics, indent=2))
    write_markdown(metrics, REPORTS / "metrics.md")
    BUNDLE.mkdir(exist_ok=True)
    (BUNDLE / "model.json").write_text(json.dumps(
        {"generated": metrics["generated"], "models": models,
         "note": "Only metrics that beat the baseline in grouped CV appear here; all others use the fallback."},
        indent=2))
    for m, r in per_metric.items():
        print(f"  {m:28s} rows={r['n_rows']:3d} papers={r['n_papers']} shipped={r['shipped']}  {r['reason']}")
    print(f"  pooled antinutrients (exploratory): rows={pooled_res['n_rows']} papers={pooled_res['n_papers']} "
          f"shipped={pooled_res['shipped']}  {pooled_res['reason']}")
    print(f"shipped models: {sorted(models) or 'none'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
