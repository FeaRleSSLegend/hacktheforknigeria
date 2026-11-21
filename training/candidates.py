"""Simple processing-effect candidates, evaluated on the same grouped folds as the ridge.

Target: change_pct (percent change against the paper's own untreated sample).
  B0  no change (0).
  C1  mean change per (treatment_family, metric), ignoring crop.
  C2  median change per (treatment_family, metric).
  C3  per-(treatment, metric) mean shrunk toward the metric mean:
      (n * mean_tm + K * mean_m) / (n + K), K = SHRINK_K rows (fixed, not tuned).
  C4  direction-and-size classifier: the most common change bin per (treatment_family, metric);
      the estimate is the median of the training rows of that key in that bin.
  C5  linear model per metric (monotone: time and temperature enter linearly, no squares):
      family one-hot, time_h, temp_c, crop_group; used only when the row's time and temperature
      lie inside the training range for its (family, metric); otherwise the C1 value.
A key not seen in the training folds gets 0 (= B0), except C3, which uses the metric mean.

Ship rule: >= 30 rows, >= 3 papers, MAE <= CLEAR_MARGIN * B0 MAE, and lower error than B0 on
more than half of the held-out papers. A tie with B0 does not ship.
"""
import math

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import GroupKFold

SHRINK_K = 5.0
CLEAR_MARGIN = 0.90
MIN_ROWS = 30
MIN_PAPERS = 3
BIN_EDGES = [-math.inf, -50, -20, -5, 5, 20, 50, math.inf]
BIN_LABELS = ["down >50%", "down 20-50%", "down 5-20%", "about no change", "up 5-20%", "up 20-50%", "up >50%"]
NAMES = {"B0": "no change", "C1": "mean per family x metric", "C2": "median per family x metric",
         "C3": "shrunk mean per treatment x metric", "C4": "direction and size bin",
         "C5": "linear in time, temp, crop group (in range only)", "R": "ridge (crop, treatment, time^2, baseline type)"}


def _bin(v: float) -> int:
    for i in range(len(BIN_EDGES) - 1):
        if BIN_EDGES[i] <= v < BIN_EDGES[i + 1]:
            return i
    return len(BIN_LABELS) - 1


def _key(df: pd.DataFrame, a: str, b: str = "outcome_metric") -> pd.Series:
    return df[a].astype(str) + "|" + df[b].astype(str)


def fit_c1(train: pd.DataFrame, stat: str = "mean") -> dict:
    g = train.groupby(_key(train, "treatment_family"))["change_pct"]
    return (g.mean() if stat == "mean" else g.median()).to_dict()


def fit_c3(train: pd.DataFrame) -> dict:
    metric_mean = train.groupby("outcome_metric")["change_pct"].mean().to_dict()
    tm = train.groupby(["treatment", "outcome_metric"])["change_pct"].agg(["mean", "size"])
    table = {f"{t}|{m}": (r["size"] * r["mean"] + SHRINK_K * metric_mean[m]) / (r["size"] + SHRINK_K)
             for (t, m), r in tm.iterrows()}
    return {"table": table, "metric_mean": metric_mean}


def predict_c3(model: dict, test: pd.DataFrame) -> np.ndarray:
    keys = _key(test, "treatment")
    return np.array([model["table"].get(k, model["metric_mean"].get(m, 0.0))
                     for k, m in zip(keys, test["outcome_metric"])])


def fit_c4(train: pd.DataFrame) -> dict:
    t = train.assign(key=_key(train, "treatment_family"), bin=train["change_pct"].map(_bin))
    out = {}
    for k, g in t.groupby("key"):
        counts = g["bin"].value_counts()
        b = int(counts.index[counts.values == counts.values.max()].min())  # ties -> the lower bin, deterministic
        out[k] = {"bin": b, "value": float(g.loc[g["bin"] == b, "change_pct"].median())}
    return out


def predict_c4(model: dict, test: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    keys = _key(test, "treatment_family")
    none_bin = BIN_LABELS.index("about no change")
    vals = np.array([model[k]["value"] if k in model else 0.0 for k in keys])
    bins = np.array([model[k]["bin"] if k in model else none_bin for k in keys])
    return vals, bins


def _c5_design(df: pd.DataFrame, stats: dict) -> np.ndarray:
    cols = []
    for c in ("time_h", "temp_c"):
        v = df[c].astype(float)
        cols.append(((v - stats[c][0]) / stats[c][1]).fillna(0.0).to_numpy())
        cols.append(v.isna().astype(float).to_numpy())
    for f in stats["families"]:
        cols.append((df["treatment_family"] == f).astype(float).to_numpy())
    for g in stats["groups"]:
        cols.append((df["crop_group"] == g).astype(float).to_numpy())
    return np.column_stack(cols)


def fit_c5(train: pd.DataFrame) -> dict:
    """One small linear model per metric, plus the training ranges per (family, metric)."""
    out = {"c1": fit_c1(train), "per_metric": {}}
    for m, g in train.groupby("outcome_metric"):
        stats = {"families": sorted(g["treatment_family"].unique()), "groups": sorted(g["crop_group"].unique())}
        for c in ("time_h", "temp_c"):
            v = g[c].astype(float).dropna()
            sd = float(v.std(ddof=0)) if len(v) else 0.0
            stats[c] = (float(v.mean()) if len(v) else 0.0, sd if sd > 0 else 1.0)
        reg = Ridge(alpha=1.0).fit(_c5_design(g, stats), g["change_pct"])
        ranges = {}
        for f, gf in g.groupby("treatment_family"):
            ranges[f] = {c: ([float(gf[c].min()), float(gf[c].max())] if gf[c].notna().all() else None)
                         for c in ("time_h", "temp_c")}
        out["per_metric"][m] = {"stats": stats, "reg": reg, "ranges": ranges}
    return out


def _inside(v, rng) -> bool:
    if rng is None:
        return pd.isna(v)
    return pd.notna(v) and rng[0] <= v <= rng[1]


def predict_c5(model: dict, test: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    c1 = model["c1"]
    vals, used = [], []
    for _, r in test.iterrows():
        pm = model["per_metric"].get(r["outcome_metric"])
        rng = pm["ranges"].get(r["treatment_family"]) if pm else None
        if pm and rng and _inside(r["time_h"], rng["time_h"]) and _inside(r["temp_c"], rng["temp_c"]):
            vals.append(float(pm["reg"].predict(_c5_design(r.to_frame().T, pm["stats"]))[0]))
            used.append(True)
        else:
            vals.append(c1.get(f"{r['treatment_family']}|{r['outcome_metric']}", 0.0))
            used.append(False)
    return np.array(vals), np.array(used)


def evaluate_candidates(df: pd.DataFrame, ridge_oof: list | None = None) -> dict:
    """Out-of-fold predictions for every candidate on GroupKFold(min(5, papers)) by paper."""
    df = df.reset_index(drop=True)
    n_papers = df["paper_id"].nunique()
    base = {"n_rows": len(df), "n_papers": n_papers, "n_crops": int(df["crop_id"].nunique())}
    if n_papers < MIN_PAPERS:
        return {**base, "cv_run": False, "reason": f"{n_papers} paper(s); needs at least {MIN_PAPERS}"}
    y = df["change_pct"].to_numpy()
    groups = df["paper_id"].to_numpy()
    oof = {k: np.zeros(len(df)) for k in ("B0", "C1", "C2", "C3", "C4", "C5")}
    c4_bins, c5_used = np.zeros(len(df), dtype=int), np.zeros(len(df), dtype=bool)
    for tr, te in GroupKFold(n_splits=min(5, n_papers)).split(df, groups=groups):
        train, test = df.iloc[tr], df.iloc[te]
        keys = _key(test, "treatment_family")
        c1, c2 = fit_c1(train, "mean"), fit_c1(train, "median")
        oof["C1"][te] = [c1.get(k, 0.0) for k in keys]
        oof["C2"][te] = [c2.get(k, 0.0) for k in keys]
        oof["C3"][te] = predict_c3(fit_c3(train), test)
        oof["C4"][te], c4_bins[te] = predict_c4(fit_c4(train), test)
        oof["C5"][te], c5_used[te] = predict_c5(fit_c5(train), test)
    if ridge_oof is not None:
        oof["R"] = np.array(ridge_oof)
    results = {}
    for name, pred in oof.items():
        err = np.abs(pred - y)
        per_paper = pd.Series(err).groupby(groups).mean()
        b0_paper = pd.Series(np.abs(y)).groupby(groups).mean()
        results[name] = {"label": NAMES[name], "mae": float(err.mean()),
                         "per_paper_mae": {p: round(float(v), 2) for p, v in per_paper.items()},
                         "per_paper_mae_range": [float(per_paper.min()), float(per_paper.max())],
                         "papers_better_than_b0": int((per_paper < b0_paper).sum())}
    true_bins = np.array([_bin(v) for v in y])
    results["C4"]["bin_accuracy"] = float((c4_bins == true_bins).mean())
    results["C4"]["direction_accuracy"] = float((np.sign(c4_bins - 3) == np.sign(true_bins - 3)).mean())
    results["B0"]["bin_accuracy"] = float((true_bins == 3).mean())
    results["C5"]["share_predicted_by_linear_part"] = float(c5_used.mean())
    b0 = results["B0"]["mae"]
    for name, r in results.items():
        if name == "B0":
            r.update(passes=False, reason="baseline")
            continue
        fails = []
        if len(df) < MIN_ROWS:
            fails.append(f"{len(df)} rows < {MIN_ROWS}")
        if r["mae"] > CLEAR_MARGIN * b0:
            fails.append(f"MAE {r['mae']:.2f} not <= {CLEAR_MARGIN:.0%} of B0 {b0:.2f}")
        if r["papers_better_than_b0"] * 2 <= n_papers:
            fails.append(f"better than B0 on only {r['papers_better_than_b0']} of {n_papers} papers")
        r.update(passes=not fails, reason="; ".join(fails) or "passes the ship rule")
    return {**base, "cv_run": True, "candidates": results}


def export_table(df: pd.DataFrame, name: str) -> dict:
    """Fit a table candidate (C1-C4) on all rows and export it with training ranges and citations."""
    keycol = "treatment" if name == "C3" else "treatment_family"
    if name == "C1":
        values = fit_c1(df, "mean")
    elif name == "C2":
        values = fit_c1(df, "median")
    elif name == "C3":
        values = fit_c3(df)["table"]
    else:
        values = {k: v["value"] for k, v in fit_c4(df).items()}
    entries = {}
    for k, g in df.groupby(_key(df, keycol)):
        entries[k] = {
            "value": float(values[k]),
            "n_rows": len(g), "papers": sorted(g["paper_id"].unique()), "crops": sorted(g["crop_id"].unique()),
            "from_crops_not_in_ingredient_table": sorted(g.loc[~g["in_ingredient_table"].astype(bool), "crop_id"].unique()),
            "time_h": [float(g["time_h"].min()), float(g["time_h"].max())] if g["time_h"].notna().any() else None,
            "temp_c": [float(g["temp_c"].min()), float(g["temp_c"].max())] if g["temp_c"].notna().any() else None,
            "citations": sorted(g["exp_id"].astype(str)),
            "cumulative_from_raw": bool(g["cumulative_from_raw"].astype(str).str.lower().eq("true").all()),
            "stage_paths": sorted({str(x) for x in g["stage_path"] if isinstance(x, str) and x}),
        }
    return {"kind": name, "label": NAMES[name], "key": f"{keycol}|outcome_metric", "entries": entries,
            "note": "Value is a pooled published percent change for the key, not crop-specific; show with its "
                    "citations and the crops it comes from. cumulative_from_raw entries are the change from raw seed "
                    "through all stages in stage_paths, not the last step alone. Unknown key: use the fallback."}


def export_c5(df: pd.DataFrame, metric: str) -> dict:
    """Fit C5 for one metric on all rows; plain lists so reference/processing_model.py can replay it."""
    model = fit_c5(df)
    pm = model["per_metric"][metric]
    st = pm["stats"]
    names = ["time_z", "time_missing", "temp_z", "temp_missing"] \
        + [f"family={f}" for f in st["families"]] + [f"crop_group={g}" for g in st["groups"]]
    cites = {f: sorted(g["exp_id"].astype(str)) for f, g in df.groupby("treatment_family")}
    crops = {f: sorted(g["crop_id"].unique()) for f, g in df.groupby("treatment_family")}
    other = {f: sorted(g.loc[~g["in_ingredient_table"].astype(bool), "crop_id"].unique())
             for f, g in df.groupby("treatment_family")}
    return {"kind": "C5", "label": NAMES["C5"], "metric": metric, "feature_names": names,
            "scaler": {"time_h": list(st["time_h"]), "temp_c": list(st["temp_c"])},
            "coefficients": [float(c) for c in pm["reg"].coef_], "intercept": float(pm["reg"].intercept_),
            "ranges": pm["ranges"], "c1_fallback": {k: float(v) for k, v in model["c1"].items()},
            "citations": cites, "crops": crops, "from_crops_not_in_ingredient_table": other,
            "note": "Linear part only inside the (family, metric) training range; otherwise the C1 pooled mean."}
