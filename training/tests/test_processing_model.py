"""Training pipeline tests on SYNTHETIC data (invented to exercise the code, not real)."""
import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import Ridge

from reference.processing_model import predict
from training.processing_model import Featurizer, evaluate, fit_final


def synthetic(n_papers=4, per_paper=10, seed=0, signal=True):
    rng = np.random.default_rng(seed)
    rows = []
    for p in range(n_papers):
        for i in range(per_paper):
            crop = "crop_a" if (p + i) % 2 else "crop_b"
            trt = "soak" if i % 3 else "ferment"
            t = float(6 * (1 + i % 8))
            temp = 25.0 if i % 2 else 30.0
            y = (-0.8 * t + (5 if crop == "crop_a" else -5) + rng.normal(0, 1)) if signal \
                else (10.0 if trt == "soak" else -20.0)
            rows.append({"exp_id": f"S{p}{i}", "paper_id": f"paper{p}", "crop_id": crop, "treatment": trt,
                         "outcome_metric": "synthetic_metric", "time_h": t, "temp_c": temp, "change_pct": y})
    return pd.DataFrame(rows)


def test_json_predictions_match_sklearn():
    df = synthetic()
    model = fit_final(df, "synthetic_metric")
    f = Featurizer().fit(df)
    sk = Ridge(alpha=model["alpha"]).fit(f.transform(df), df["change_pct"]).predict(f.transform(df))
    for i, r in df.iterrows():
        mine = predict(model, r["crop_id"], r["treatment"], r["time_h"], r["temp_c"])
        assert mine == pytest.approx(sk[i], abs=1e-9)


def test_json_refuses_outside_training_range():
    df = synthetic()
    model = fit_final(df, "synthetic_metric")
    lo, hi = model["training_ranges"]["crop_a|soak"]["time_h"]
    assert predict(model, "crop_a", "soak", hi + 1, 25.0) is None
    assert predict(model, "crop_a", "soak", lo - 1, 25.0) is None
    assert predict(model, "crop_zz", "soak", lo, 25.0) is None
    assert predict(model, "crop_a", "boil", lo, 25.0) is None


def test_missing_time_uses_indicator():
    df = synthetic()
    df.loc[df["treatment"] == "ferment", "time_h"] = np.nan
    model = fit_final(df, "synthetic_metric")
    assert model["training_ranges"]["crop_a|ferment"]["time_h"] is None
    assert predict(model, "crop_a", "ferment", None, 25.0) is not None
    assert predict(model, "crop_a", "ferment", 12.0, 25.0) is None


def test_ship_when_rows_and_beats_baseline():
    res = evaluate(synthetic())
    assert res["cv_run"] and res["n_rows"] == 40
    assert res["mae_model"] < min(res["mae_b0"], res["mae_b1"])
    assert res["shipped"] is True
    assert all(set(f["test_papers"]).isdisjoint({p for g in res["folds"] if g is not f for p in g["test_papers"]})
               for f in res["folds"])


def test_no_ship_below_30_rows():
    res = evaluate(synthetic(n_papers=3, per_paper=8))
    assert res["cv_run"] and not res["shipped"] and "at least 30" in res["reason"]


def test_no_ship_when_baseline_is_better():
    res = evaluate(synthetic(signal=False))  # target is exactly the per-treatment mean, so B1 is perfect
    assert res["mae_b1"] == pytest.approx(0.0)
    assert not res["shipped"] and "does not beat" in res["reason"]


def test_too_few_papers_not_cross_validated():
    res = evaluate(synthetic(n_papers=2, per_paper=20))
    assert res["cv_run"] is False and res["shipped"] is False and "needs at least 3" in res["reason"]


def test_in_range_count_reported():
    res = evaluate(synthetic())
    assert res["n_test_in_training_range"] == sum(f["n_test_in_training_range"] for f in res["folds"])
    assert 0 < res["n_test_in_training_range"] <= res["n_rows"]


def test_baseline_type_feature_round_trip():
    df = synthetic()
    df["baseline_type"] = np.where(df["paper_id"].isin(["paper0", "paper1"]), "raw", "germinated")
    model = fit_final(df, "synthetic_metric")
    assert model["baseline_types"] == ["germinated", "raw"]
    f = Featurizer().fit(df)
    sk = Ridge(alpha=model["alpha"]).fit(f.transform(df), df["change_pct"]).predict(f.transform(df))
    for i, r in df.iterrows():
        mine = predict(model, r["crop_id"], r["treatment"], r["time_h"], r["temp_c"], baseline_type=r["baseline_type"])
        assert mine == pytest.approx(sk[i], abs=1e-9)
    r = df.iloc[0]
    assert predict(model, r["crop_id"], r["treatment"], r["time_h"], r["temp_c"], baseline_type="dehulled") is None
