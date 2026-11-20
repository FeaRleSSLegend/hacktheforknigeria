"""Processing model training: Ridge per outcome metric, nested grouped CV by paper, baselines.

Ship rule (AGENTS.md, PROJECT.md): at least 30 rows AND grouped-CV MAE lower than the better
of B0 (predict 0 change) and B1 (mean change of the same treatment in the training folds).
A metric with fewer than 3 papers cannot be cross-validated and does not ship.
"""
import math
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import GroupKFold

ALPHAS = (0.01, 0.1, 1.0, 10.0, 100.0)
MIN_ROWS = 30
MIN_PAPERS = 3
NUMERIC = ("time_h", "temp_c", "time_h_sq", "time_x_temp")
ANTINUTRIENT_PREFIXES = ("phytate", "oxalate", "trypsin_inhibitor", "tannin", "polyphenols")


def recompute_change(df: pd.DataFrame, tol: float = 0.01) -> tuple[pd.DataFrame, list[str], int]:
    """Recompute change_pct from baseline and treated values.

    tol is in percent points (stored values are rounded to 2 decimals). Rows with a zero or
    missing baseline get change_pct NaN and are excluded. Returns (df, mismatches, n_undefined).
    """
    out = df.copy()
    base, treated = out["baseline_value"].astype(float), out["treated_value"].astype(float)
    undefined = (base == 0) | base.isna() | treated.isna()
    recomputed = (treated - base) / base * 100
    recomputed[undefined] = np.nan
    mismatches = []
    for i in out.index[~undefined]:
        if abs(recomputed[i] - float(out.loc[i, "change_pct"])) > tol:
            mismatches.append(f"{out.loc[i, 'exp_id']}: stored {out.loc[i, 'change_pct']} recomputed {recomputed[i]:.4f}")
    out["change_pct"] = recomputed
    return out, mismatches, int(undefined.sum())


class Featurizer:
    """Fitted on training rows only. Standardises numeric features; missing -> indicator + 0."""

    def __init__(self, use_metric: bool = False):
        self.use_metric = use_metric

    @staticmethod
    def _numeric(df: pd.DataFrame) -> pd.DataFrame:
        t, c = df["time_h"].astype(float), df["temp_c"].astype(float)
        return pd.DataFrame({"time_h": t, "temp_c": c, "time_h_sq": t * t, "time_x_temp": t * c}, index=df.index)

    def fit(self, df: pd.DataFrame) -> "Featurizer":
        num = self._numeric(df)
        self.means, self.stds = {}, {}
        for k in NUMERIC:
            v = num[k].dropna()
            self.means[k] = float(v.mean()) if len(v) else 0.0
            sd = float(v.std(ddof=0)) if len(v) else 0.0
            self.stds[k] = sd if sd > 0 else 1.0
        self.crops = sorted(df["crop_id"].unique())
        self.treatments = sorted(df["treatment"].unique())
        self.metrics = sorted(df["outcome_metric"].unique()) if self.use_metric else []
        self.baselines = sorted(df["baseline_type"].unique()) if "baseline_type" in df.columns else []
        self.feature_names = (list(NUMERIC) + ["time_missing", "temp_missing"]
                              + [f"crop={c}" for c in self.crops] + [f"treatment={t}" for t in self.treatments]
                              + [f"metric={m}" for m in self.metrics]
                              + [f"baseline={b}" for b in self.baselines])
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        num = self._numeric(df)
        cols = []
        for k in NUMERIC:
            z = (num[k] - self.means[k]) / self.stds[k]
            cols.append(z.fillna(0.0).to_numpy())
        cols.append(df["time_h"].isna().astype(float).to_numpy())
        cols.append(df["temp_c"].isna().astype(float).to_numpy())
        for c in self.crops:
            cols.append((df["crop_id"] == c).astype(float).to_numpy())
        for t in self.treatments:
            cols.append((df["treatment"] == t).astype(float).to_numpy())
        for m in self.metrics:
            cols.append((df["outcome_metric"] == m).astype(float).to_numpy())
        for b in self.baselines:
            cols.append((df["baseline_type"] == b).astype(float).to_numpy())
        return np.column_stack(cols)


def _choose_alpha(train: pd.DataFrame, use_metric: bool) -> float:
    """Inner grouped CV (by paper) over the fixed alpha grid. Never sees the outer test fold."""
    groups = train["paper_id"].to_numpy()
    n_inner = min(5, len(set(groups)))
    if n_inner < 2:
        return 1.0
    best, best_mae = ALPHAS[0], math.inf
    for a in ALPHAS:
        errs = []
        for tr, te in GroupKFold(n_splits=n_inner).split(train, groups=groups):
            f = Featurizer(use_metric).fit(train.iloc[tr])
            m = Ridge(alpha=a).fit(f.transform(train.iloc[tr]), train["change_pct"].iloc[tr])
            errs.extend(np.abs(m.predict(f.transform(train.iloc[te])) - train["change_pct"].iloc[te]))
        mae = float(np.mean(errs))
        if mae < best_mae:
            best, best_mae = a, mae
    return best


def b1_predict(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    """Mean change of the same treatment in the training folds; 0 (= B0) for an unseen treatment."""
    means = train.groupby("treatment")["change_pct"].mean()
    return test["treatment"].map(means).fillna(0.0).to_numpy()


def in_training_range(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    """True where the app would predict: crop|treatment seen in training and time/temp inside its range."""
    out = []
    groups = {k: g for k, g in train.groupby(["crop_id", "treatment"])}
    for _, r in test.iterrows():
        g = groups.get((r["crop_id"], r["treatment"]))
        ok = g is not None
        for col in ("time_h", "temp_c"):
            if not ok:
                break
            if g[col].notna().all():
                ok = pd.notna(r[col]) and g[col].min() <= r[col] <= g[col].max()
            else:
                ok = pd.isna(r[col])
        out.append(ok)
    return np.array(out, dtype=bool)


def evaluate(df: pd.DataFrame, use_metric: bool = False) -> dict:
    """Outer GroupKFold by paper with nested alpha choice. df rows must have change_pct."""
    n_papers = df["paper_id"].nunique()
    res = {"n_rows": len(df), "n_papers": n_papers, "n_crops": df["crop_id"].nunique(),
           "rows_missing_time": int(df["time_h"].isna().sum()), "rows_missing_temp": int(df["temp_c"].isna().sum())}
    if n_papers < MIN_PAPERS:
        res.update(cv_run=False, shipped=False,
                   reason=f"{n_papers} paper(s); grouped cross-validation needs at least {MIN_PAPERS}")
        return res
    groups = df["paper_id"].to_numpy()
    y = df["change_pct"].to_numpy()
    oof = {"model": np.zeros(len(df)), "b0": np.zeros(len(df)), "b1": np.zeros(len(df))}
    folds = []
    in_range = np.zeros(len(df), dtype=bool)
    for tr, te in GroupKFold(n_splits=min(5, n_papers)).split(df, groups=groups):
        train, test = df.iloc[tr], df.iloc[te]
        alpha = _choose_alpha(train, use_metric)
        f = Featurizer(use_metric).fit(train)
        m = Ridge(alpha=alpha).fit(f.transform(train), train["change_pct"])
        oof["model"][te] = m.predict(f.transform(test))
        oof["b1"][te] = b1_predict(train, test)
        in_range[te] = in_training_range(train, test)
        folds.append({"test_papers": sorted(set(groups[te])), "alpha": alpha, "n_test": len(te),
                      "n_test_in_training_range": int(in_range[te].sum()),
                      **{f"mae_{k}": float(np.mean(np.abs(v[te] - y[te]))) for k, v in oof.items()}})
    mae = {k: float(np.mean(np.abs(v - y))) for k, v in oof.items()}
    resid = oof["model"] - y
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    better_baseline = min(mae["b0"], mae["b1"])
    ok_rows = len(df) >= MIN_ROWS
    wins = mae["model"] < better_baseline
    if not ok_rows:
        reason = f"{len(df)} rows; at least {MIN_ROWS} needed"
    elif not wins:
        reason = f"model MAE {mae['model']:.2f} does not beat the better baseline {better_baseline:.2f}"
    else:
        reason = "beats the better baseline in grouped cross-validation"
    res.update(cv_run=True, mae_model=mae["model"], mae_b0=mae["b0"], mae_b1=mae["b1"],
               r2_model=1 - float(np.sum(resid ** 2)) / ss_tot if ss_tot > 0 else None,
               residual_sd=float(np.std(resid, ddof=1)) if len(resid) > 1 else None,
               n_test_in_training_range=int(in_range.sum()),
               folds=folds, shipped=bool(ok_rows and wins), reason=reason)
    return res


def fit_final(df: pd.DataFrame, metric: str, use_metric: bool = False, residual_sd: Optional[float] = None) -> dict:
    """Fit on all rows (alpha by grouped CV) and export plain lists for the JSON bundle."""
    alpha = _choose_alpha(df, use_metric)
    f = Featurizer(use_metric).fit(df)
    m = Ridge(alpha=alpha).fit(f.transform(df), df["change_pct"])
    ranges = {}
    for (crop, trt), g in df.groupby(["crop_id", "treatment"]):
        ranges[f"{crop}|{trt}"] = {
            k: ([float(g[k].min()), float(g[k].max())] if g[k].notna().all() else None) for k in ("time_h", "temp_c")
        }
    return {"metric": metric, "alpha": alpha, "feature_names": f.feature_names,
            "scaler_means": f.means, "scaler_stds": f.stds,
            "coefficients": [float(c) for c in m.coef_], "intercept": float(m.intercept_),
            "training_ranges": ranges, "crops": f.crops, "treatments": f.treatments, "baseline_types": f.baselines,
            "residual_sd": residual_sd, "n_rows": len(df), "n_papers": int(df["paper_id"].nunique())}


def antinutrient_rows(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["outcome_metric"].str.startswith(ANTINUTRIENT_PREFIXES)]
