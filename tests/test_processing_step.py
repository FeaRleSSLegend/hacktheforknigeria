"""Step evidence order tests. Rows and model are SYNTHETIC test inputs, not real data."""
from reference.processing_step import step_evidence


def r(exp, crop, trt, fam, change, metric="phytate", in_table=True):
    return {"exp_id": exp, "crop_id": crop, "treatment": trt, "treatment_family": fam, "time_h": "", "temp_c": "",
            "outcome_metric": metric, "change_pct": change, "paper_id": f"p_{exp}", "page": "T1", "quote": "q",
            "quality": "measured", "crop_group": "legume", "in_ingredient_table": str(in_table)}


ROWS = [
    r("A1", "cowpea", "boiling", "wet_heat", "-40"),
    r("B1", "mungbean", "boiling", "wet_heat", "-60", in_table=False),
    r("B2", "mungbean", "soaking", "soaking", "-30", in_table=False),
    r("C1", "pigeon_pea", "soaking", "soaking", "-20"),
]
MODELS = {"phytate": {"kind": "C1", "key": "treatment_family|outcome_metric", "entries": {
    "wet_heat|phytate": {"value": -50.0, "crops": ["cowpea", "mungbean"], "citations": ["A1", "B1"], "papers": [],
                         "from_crops_not_in_ingredient_table": ["mungbean"], "time_h": None, "temp_c": None},
    "soaking|phytate": {"value": -25.0, "crops": ["mungbean", "pigeon_pea"], "citations": ["B2", "C1"], "papers": [],
                        "from_crops_not_in_ingredient_table": ["mungbean"], "time_h": None, "temp_c": None}}}}


def test_same_crop_rows_first_and_no_prediction():
    out = step_evidence(ROWS, MODELS, "cowpea", "boiling", "phytate")
    assert out["show"] == "published" and out["prediction"] is None
    assert [c["expId"] for c in out["published"]["rows"]] == ["A1"]


def test_prediction_only_without_same_crop_rows_and_labelled_with_crops():
    out = step_evidence(ROWS, MODELS, "cowpea", "soaking", "phytate")
    assert out["show"] == "prediction" and out["published"] is None
    p = out["prediction"]
    assert p["value"] == -25.0 and p["label"] == "predicted, pooled from mungbean, pigeon_pea"
    assert p["fromCropsNotInIngredientTable"] == ["mungbean"] and p["citations"] == ["B2", "C1"]
    assert out["otherEvidence"]["mode"] == "different_crop"
    assert all(c["fromDifferentCrop"] for c in out["otherEvidence"]["rows"])


def test_no_model_falls_back():
    out = step_evidence(ROWS, {}, "cowpea", "soaking", "phytate")
    assert out["show"] == "fallback" and out["prediction"] is None
    assert out["otherEvidence"]["mode"] == "different_crop"


def test_other_legumes_label_when_model_ships_only_thanks_to_other_crops():
    models = {"phytate": dict(MODELS["phytate"], ships_only_with_different_crop_rows=True)}
    p = step_evidence(ROWS, models, "cowpea", "soaking", "phytate")["prediction"]
    assert p["label"] == "estimated from other legumes (pooled from mungbean, pigeon_pea)"
    assert p["shipsOnlyWithDifferentCropRows"] is True
