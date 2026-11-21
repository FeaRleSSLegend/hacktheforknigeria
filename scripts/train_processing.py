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
from training.candidates import CLEAR_MARGIN, NAMES, evaluate_candidates, export_c5, export_table  # noqa: E402
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


def write_candidates_md(metrics: dict, path: Path) -> None:
    lines = ["# Processing-effect candidates vs no change (B0)", "",
             f"Grouped CV by paper (GroupKFold, n_splits = min(5, papers)); every paper is held out once. "
             f"Ship rule: {metrics['ship_rule']}. MAE in percent points of change. "
             "Per-paper range = lowest and highest mean error over held-out papers. "
             "'Papers < B0' = held-out papers where the candidate beats no change.", ""]
    for k, v in NAMES.items():
        lines.append(f"- **{k}**: {v}")

    def block(title, c):
        out = ["", f"## {title}", ""]
        if not c.get("cv_run"):
            return out + [f"{c['n_rows']} rows, {c['n_papers']} papers: {c['reason']}"]
        out += [f"{c['n_rows']} rows, {c['n_papers']} papers, {c['n_crops']} crops. Chosen: "
                f"**{c.get('chosen') or 'none (fallback)'}**", "",
                "| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |", "|---|---|---|---|---|---|---|"]
        b0 = c["candidates"]["B0"]["mae"]
        for k, r in c["candidates"].items():
            lo, hi = r["per_paper_mae_range"]
            extra = ""
            if k == "C4":
                extra = (f" (bin acc {r['bin_accuracy']:.2f}, direction acc {r['direction_accuracy']:.2f}; "
                         f"B0 bin acc {c['candidates']['B0']['bin_accuracy']:.2f})")
            if k == "C5":
                extra = f" (linear part used for {r['share_predicted_by_linear_part']:.0%} of rows)"
            out.append(f"| {k} | {r['mae']:.2f} | {b0:.2f} | {lo:.1f}-{hi:.1f} | {r['papers_better_than_b0']}/{c['n_papers']} | "
                       f"{'yes' if r['passes'] else 'no'} | {r['reason']}{extra} |")
        return out

    lines += block("Antinutrient family pooled (phytate, tannin, oxalate, trypsin inhibitor, saponin, polyphenols; report only)",
                   metrics["candidates_antinutrient_family"])
    for m, c in metrics["candidates_per_metric"].items():
        lines += block(m, c)
    lines += ["", "Backtest caveat: held-out papers mostly use crops, treatments or times not seen in the training folds, "
              "so these errors describe transfer to a new paper; the app predicts only inside each entry's training range."]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _passes_on(g: pd.DataFrame, chosen: str) -> bool:
    """Would the chosen candidate still pass the unchanged rule on these rows alone?"""
    if g["paper_id"].nunique() < MIN_PAPERS:
        return False
    res = evaluate(g)
    oof = res.pop("oof", None)
    if not res["cv_run"]:
        return False
    c = evaluate_candidates(g, ridge_oof=oof["model"])
    ok = c["candidates"][chosen]["passes"]
    if chosen == "R":
        ok = ok and res["mae_model"] < res["mae_b1"]
    return bool(ok)


def crop_provenance(g: pd.DataFrame, chosen: str) -> dict:
    """Which crops a shipped model was trained on, and whether it ships only thanks to other crops."""
    in_table = g["in_ingredient_table"].astype(str).str.lower().eq("true")
    others = sorted(g.loc[~in_table, "crop_id"].unique())
    only = bool(others) and not _passes_on(g[in_table].reset_index(drop=True), chosen)
    return {"trained_on_crops": sorted(g["crop_id"].unique()),
            "trained_on_crops_not_in_ingredient_table": others,
            "trained_on_rows_from_other_crops": int((~in_table).sum()),
            "ships_only_with_different_crop_rows": only,
            "display_label": "estimated from other legumes" if only else "predicted, pooled from listed crops"}


def write_row_counts_md(df_clean: pd.DataFrame, path: Path) -> None:
    """Rows and papers per metric with and without different-crop rows and cumulative rows (NEEDS_HUMAN excluded)."""
    cum = df_clean["cumulative_from_raw"].astype(str).str.lower().eq("true")
    own = df_clean["in_ingredient_table"].astype(str).str.lower().eq("true")
    variants = {"all": df_clean, "no cumulative (training set)": df_clean[~cum],
                "ingredient crops only": df_clean[own], "ingredient crops, no cumulative": df_clean[own & ~cum]}
    metrics = sorted(df_clean["outcome_metric"].unique())
    lines = ["# Rows / papers per metric", "",
             "NEEDS_HUMAN rows excluded throughout. 'Ingredient crops' = crops in data/ingredients.csv; the rest "
             "(mungbean, lentil, horse gram, black bean, lima bean, adzuki bean) are treatment-effect evidence from "
             "different crops. The models train on 'no cumulative (training set)'.", "",
             "| Metric | " + " | ".join(variants) + " |", "|---|" + "---|" * len(variants)]
    for m in metrics:
        cells = []
        for v in variants.values():
            g = v[v["outcome_metric"] == m]
            cells.append(f"{len(g)} / {g['paper_id'].nunique()}")
        lines.append(f"| {m} | " + " | ".join(cells) + " |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def select(df: pd.DataFrame, df_all: pd.DataFrame) -> dict:
    """Ridge + candidates per metric, ship rule, chosen model per metric, family report."""
    per_metric, cand, models = {}, {}, {}
    for metric, g in df.groupby("outcome_metric"):
        g = g.reset_index(drop=True)
        res = evaluate(g)
        oof = res.pop("oof", None)
        per_metric[metric] = res
        if not res["cv_run"]:
            continue
        c = evaluate_candidates(g, ridge_oof=oof["model"])
        r = c["candidates"]["R"]
        if r["passes"] and not res["mae_model"] < res["mae_b1"]:
            r.update(passes=False, reason=f"does not beat B1 ({res['mae_b1']:.2f})")
        passing = {k: v for k, v in c["candidates"].items() if v["passes"]}
        chosen = min(passing, key=lambda k: passing[k]["mae"]) if passing else None
        c["chosen"] = chosen
        cand[metric] = c
        res["shipped"] = chosen == "R"
        if chosen is None:
            res["reason"] = "no candidate passes: " + r["reason"] if res["n_rows"] >= MIN_ROWS else res["reason"]
        elif chosen == "R":
            res["reason"] = "ridge passes the ship rule and has the lowest error"
            models[metric] = {"kind": "ridge", **fit_final(g, metric, residual_sd=res["residual_sd"])}
        else:
            res["reason"] = f"{chosen} ({NAMES[chosen]}) ships instead: lower error"
            models[metric] = export_c5(g, metric) if chosen == "C5" else export_table(g, chosen)
        if chosen:
            models[metric].update(crop_provenance(g, chosen))
            c["crop_provenance"] = {k: v for k, v in models[metric].items() if k.startswith(("trained_on", "ships_only", "display"))}

    family_df = antinutrient_rows(df).reset_index(drop=True)
    family_cand = evaluate_candidates(family_df)

    pooled_all = antinutrient_rows(df_all)
    pooled_res = evaluate(family_df, use_metric=True)
    pooled_res.pop("oof", None)
    pooled_res["exploratory"] = True
    pooled_res["metrics_pooled"] = sorted(family_df["outcome_metric"].unique())
    pooled_res["n_rows_including_needs_human"] = len(pooled_all)
    pooled_res["n_papers_including_needs_human"] = int(pooled_all["paper_id"].nunique())
    if pooled_res["shipped"]:
        pooled_res["shipped"] = False
        pooled_res["reason"] += "; not shipped: pooling needs human approval"

    return {"per_metric": per_metric, "cand": cand, "models": models, "family_cand": family_cand,
            "pooled_res": pooled_res, "rows": len(df)}


def write_comparison_md(primary: dict, with_cum: dict, n_cum: int, path: Path) -> None:
    lines = ["# Cumulative Bolade stages: excluded vs included in model training", "",
             f"Shipped models come from the run WITHOUT the {n_cum} cumulative household-stage rows "
             "(cumulative_from_raw = true), because a cumulative stage is not a single operation. The decision was "
             "made before seeing these numbers; both runs are shown either way. The cumulative rows remain in the "
             "data and in the cited fallback.", "",
             f"Rows used: {primary['rows']} without, {with_cum['rows']} with.", "",
             "| Metric | Rows (without / with) | Chosen without | MAE / B0 without | Chosen with | MAE / B0 with | Change |",
             "|---|---|---|---|---|---|---|"]
    metrics = sorted(set(primary["cand"]) | set(with_cum["cand"]))
    for m in metrics:
        a, b = primary["cand"].get(m), with_cum["cand"].get(m)

        def cell(c):
            if not c:
                return "not cross-validated", ""
            ch = c["chosen"]
            b0 = c["candidates"]["B0"]["mae"]
            return (ch or "none"), (f"{c['candidates'][ch]['mae']:.1f} / {b0:.1f}" if ch else f"- / {b0:.1f}")
        ca, ma = cell(a)
        cb, mb = cell(b)
        na = a["n_rows"] if a else primary["per_metric"].get(m, {}).get("n_rows", 0)
        nb = b["n_rows"] if b else with_cum["per_metric"].get(m, {}).get("n_rows", 0)
        ship_a, ship_b = ca not in ("none", "not cross-validated"), cb not in ("none", "not cross-validated")
        change = ("STOPS SHIPPING" if ship_b and not ship_a else "starts shipping" if ship_a and not ship_b
                  else "different model" if ship_a and ca != cb else "")
        lines.append(f"| {m} | {na} / {nb} | {ca} | {ma} | {cb} | {mb} | {change} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    raw = pd.read_csv(ROOT / "data" / "treatment_experiments.csv")
    df, mismatches, undefined = recompute_change(raw)
    if mismatches:
        print("change_pct does not match baseline/treated:\n  " + "\n  ".join(mismatches))
        return 1
    print(f"change_pct recomputed for {len(df)} rows: all match within 0.01; undefined (zero baseline): {undefined}")
    df = df[df["change_pct"].notna()]
    if "baseline_type" not in df.columns:  # written by training/etl/ingest_batches.py
        print("data/treatment_experiments.csv has no baseline_type column; run ingest_batches.py first")
        return 1
    if df["baseline_type"].isna().any():
        print("papers without baseline_type:", sorted(df.loc[df["baseline_type"].isna(), "paper_id"].unique()))
        return 1
    excl = pd.read_csv(ROOT / "training" / "mappings" / "training_exclusions.csv", dtype=str)
    excl_mask = df.set_index(["paper_id", "outcome_metric"]).index.isin(
        list(zip(excl["paper_id"], excl["outcome_metric"])))
    df_all, df = df, df[~excl_mask].reset_index(drop=True)
    print(f"excluded from training (NEEDS_HUMAN, training_exclusions.csv): {int(excl_mask.sum())} rows")

    write_row_counts_md(df, REPORTS / "metric_row_counts.md")
    cum = df["cumulative_from_raw"].astype(str).str.lower().eq("true")
    n_cum = int(cum.sum())
    print(f"cumulative household-stage rows excluded from model training: {n_cum} (kept in data and fallback)")
    with_cum = select(df, df_all)
    df = df[~cum].reset_index(drop=True)
    df_all = df_all[~df_all["cumulative_from_raw"].astype(str).str.lower().eq("true")]
    counts = df.groupby("outcome_metric").agg(rows=("exp_id", "size"), papers=("paper_id", "nunique"),
                                              crops=("crop_id", "nunique"))
    print(counts.to_string())
    run = select(df, df_all)
    per_metric, cand, models = run["per_metric"], run["cand"], run["models"]
    family_cand, pooled_res = run["family_cand"], run["pooled_res"]

    metrics = {
        "generated": date.today().isoformat(),
        "source": "data/treatment_experiments.csv",
        "rule": {"min_rows": MIN_ROWS, "min_papers": MIN_PAPERS, "must_beat": "min(B0, B1) grouped-CV MAE"},
        "rows_used": len(df), "rows_excluded_zero_baseline": undefined,
        "rows_excluded_needs_human": int(excl_mask.sum()),
        "rows_excluded_cumulative_stages": n_cum,
        "features": "crop, treatment, baseline type (one-hot); time_h, temp_c, time^2, time x temp (standardised)",
        "per_metric": per_metric,
        "candidates_per_metric": cand,
        "candidates_antinutrient_family": family_cand,
        "ship_rule": f">= {MIN_ROWS} rows, >= {MIN_PAPERS} papers, MAE <= {CLEAR_MARGIN:.0%} of B0 and better than B0 on more "
                     "than half of the held-out papers; ridge must also beat B1; lowest-error passing candidate ships",
        "pooled_antinutrients_exploratory": pooled_res,
        "shipped_metrics": sorted(models),
        "comparison_with_cumulative_rows": {
            "rows": with_cum["rows"],
            "chosen": {m: c["chosen"] for m, c in with_cum["cand"].items()},
            "mae_chosen": {m: (c["candidates"][c["chosen"]]["mae"] if c["chosen"] else None) for m, c in with_cum["cand"].items()},
            "mae_b0": {m: c["candidates"]["B0"]["mae"] for m, c in with_cum["cand"].items()},
        },
    }
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "metrics.json").write_text(json.dumps(metrics, indent=2))
    write_markdown(metrics, REPORTS / "metrics.md")
    write_candidates_md(metrics, REPORTS / "candidates.md")
    write_candidates_md({**metrics, "candidates_per_metric": with_cum["cand"],
                         "candidates_antinutrient_family": with_cum["family_cand"]},
                        REPORTS / "candidates_with_cumulative_rows.md")
    write_comparison_md(run, with_cum, n_cum, REPORTS / "cumulative_exclusion_comparison.md")
    BUNDLE.mkdir(exist_ok=True)
    (BUNDLE / "model.json").write_text(json.dumps(
        {"generated": metrics["generated"], "models": models,
         "note": "Only metrics whose model passes the ship rule appear here; predict only inside each entry's "
                 "training range, show its citations, and use the fallback (cited published rows) otherwise."},
        indent=2))
    for m, r in per_metric.items():
        print(f"  {m:28s} rows={r['n_rows']:3d} papers={r['n_papers']} shipped={r['shipped']}  {r['reason']}")
    print(f"  pooled antinutrients (exploratory): rows={pooled_res['n_rows']} papers={pooled_res['n_papers']} "
          f"shipped={pooled_res['shipped']}  {pooled_res['reason']}")
    for m, c in cand.items():
        print(f"  candidates {m:20s} B0={c['candidates']['B0']['mae']:.1f} " + " ".join(
            f"{k}={v['mae']:.1f}{'*' if v['passes'] else ''}" for k, v in c['candidates'].items() if k != 'B0')
              + f"  -> {c['chosen'] or 'none'}")
    print("with cumulative rows (comparison only): " + ", ".join(
        f"{m}->{c['chosen'] or 'none'}" for m, c in with_cum["cand"].items() if c["chosen"]))
    print(f"shipped models: {sorted((m, v['kind']) for m, v in models.items()) or 'none'}")
    for m, v in models.items():
        print(f"  {m}: trained on {v['trained_on_crops']}; ships only with different-crop rows: "
              f"{v['ships_only_with_different_crop_rows']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
