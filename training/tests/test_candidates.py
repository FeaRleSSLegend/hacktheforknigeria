"""Candidate tests on SYNTHETIC rows (invented to exercise the code, not real data)."""
import numpy as np
import pandas as pd
import pytest

from reference.processing_model import predict_c5, predict_table
from training.candidates import (SHRINK_K, evaluate_candidates, export_c5, export_table, fit_c1, fit_c3,
                                 fit_c5, _c5_design)


def rows(n_papers=5, per=8, effect=-40.0, noise=3.0, seed=1):
    rng = np.random.default_rng(seed)
    out = []
    for p in range(n_papers):
        for i in range(per):
            fam, trt = ("wet_heat", "boiling") if i % 2 else ("soaking", "soaking")
            t = float(1 + i)
            y = (effect if fam == "wet_heat" else effect / 4) - 0.5 * t + rng.normal(0, noise)
            out.append({"exp_id": f"S{p}{i}", "paper_id": f"paper{p}", "crop_id": "crop_a" if p % 2 else "crop_b",
                        "treatment": trt, "treatment_family": fam, "outcome_metric": "phytate",
                        "time_h": t, "temp_c": 30.0, "crop_group": "legume", "in_ingredient_table": p != 4,
                        "cumulative_from_raw": fam == "wet_heat", "stage_path": "soak > boil" if fam == "wet_heat" else "",
                        "change_pct": y})
    return pd.DataFrame(out)


def test_c1_and_c3_by_hand():
    df = pd.DataFrame({"treatment": ["boil", "boil", "soak"], "treatment_family": ["wet", "wet", "soak"],
                       "outcome_metric": ["m", "m", "m"], "change_pct": [-10.0, -30.0, 5.0]})
    assert fit_c1(df) == {"wet|m": -20.0, "soak|m": 5.0}
    c3 = fit_c3(df)
    metric_mean = (-10 - 30 + 5) / 3
    assert c3["table"]["boil|m"] == pytest.approx((2 * -20.0 + SHRINK_K * metric_mean) / (2 + SHRINK_K))


def test_strong_effect_passes_and_beats_b0():
    res = evaluate_candidates(rows())
    c = res["candidates"]
    assert c["B0"]["passes"] is False
    assert c["C1"]["passes"] and c["C1"]["mae"] < 0.9 * c["B0"]["mae"]
    assert set(c["C1"]["per_paper_mae"]) == {f"paper{p}" for p in range(5)}


def test_tie_with_b0_does_not_pass():
    df = rows(effect=0.0, noise=0.0)
    df["change_pct"] = 0.0
    res = evaluate_candidates(df)
    assert not any(v["passes"] for v in res["candidates"].values())


def test_too_few_rows_or_papers():
    assert evaluate_candidates(rows(n_papers=2))["cv_run"] is False
    res = evaluate_candidates(rows(n_papers=3, per=6))
    assert all("rows <" in v["reason"] for k, v in res["candidates"].items() if k != "B0")


def test_table_export_and_lookup():
    df = rows()
    model = export_table(df, "C1")
    e = model["entries"]["wet_heat|phytate"]
    assert e["citations"] and e["from_crops_not_in_ingredient_table"] == ["crop_b"]
    assert e["cumulative_from_raw"] is True and e["stage_paths"] == ["soak > boil"]
    assert model["entries"]["soaking|phytate"]["cumulative_from_raw"] is False
    hit = predict_table(model, "boiling", "wet_heat", "phytate", time_h=4.0)
    assert hit["value"] == pytest.approx(e["value"]) and hit["citations"] == e["citations"]
    assert predict_table(model, "boiling", "wet_heat", "phytate", time_h=99.0) is None
    assert predict_table(model, "boiling", "dry_heat", "phytate") is None
    c3 = export_table(df, "C3")
    assert predict_table(c3, "boiling", "anything", "phytate")["value"] == pytest.approx(c3["entries"]["boiling|phytate"]["value"])


def test_c5_json_replay_matches_sklearn():
    df = rows()
    exported = export_c5(df, "phytate")
    pm = fit_c5(df)["per_metric"]["phytate"]
    sk = pm["reg"].predict(_c5_design(df, pm["stats"]))
    for i, r in df.iterrows():
        assert predict_c5(exported, r["treatment_family"], r["crop_group"], r["time_h"], r["temp_c"]) == \
            pytest.approx(sk[i], abs=1e-9)
    out = predict_c5(exported, "wet_heat", "legume", 99.0, 30.0)
    assert out == pytest.approx(exported["c1_fallback"]["wet_heat|phytate"])
