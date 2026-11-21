"""Evidence for one dish step (crop, treatment, metric). Pure function, no I/O.

Display order (decided Nov 20):
  1. Same-crop published rows for the asked treatment, with citations. When they exist, no
     pooled prediction is shown.
  2. Only when no same-crop rows exist: the shipped pooled prediction for the metric, if it
     covers the step, labelled "predicted, pooled from <crops>" with its citations, or
     "estimated from other legumes (pooled from <crops>)" when the model only passes the ship
     rule thanks to rows from crops that are not ingredients.
  3. Otherwise, or as supporting evidence after a prediction: the fallback (related treatment
     on the same crop, the same treatment on a different crop, or "no published data").
Crop-specific models (ridge) only predict for crop and treatment pairs they were trained on,
which always have same-crop rows, so in practice step 2 shows pooled table or C5 values.
The cook's starting point is taken as raw seed (baseline_type "raw") for the ridge.
"""
from typing import Optional

from .processing_fallback import fallback_lookup
from .processing_model import predict, predict_c5, predict_table

SAME_CROP_MODES = ("same_crop", "published_point", "published_range", "interpolated")


def _attr(rows: list[dict], key: str, value: str, field: str) -> Optional[str]:
    for r in rows:
        if r.get(key) == value and r.get(field):
            return r[field]
    return None


def _pooled_prediction(models: dict, rows: list[dict], crop: str, treatment: str, metric: str,
                       time_h: Optional[float], temp_c: Optional[float], baseline_type: str) -> Optional[dict]:
    m = models.get(metric)
    if not m:
        return None
    family = _attr(rows, "treatment", treatment, "treatment_family")
    kind = m.get("kind")
    if kind == "ridge":
        v = predict(m, crop, treatment, time_h, temp_c, baseline_type=baseline_type)
        if v is None:
            return None
        rng = m["training_ranges"][f"{crop}|{treatment}"]
        crops, cites, other = [crop], rng.get("citations", []), []
    elif kind == "C5":
        if family is None:
            return None
        v = predict_c5(m, family, _attr(rows, "crop_id", crop, "crop_group") or "", time_h, temp_c)
        if v is None:
            return None
        crops, cites = m["crops"].get(family, []), m["citations"].get(family, [])
        other = m["from_crops_not_in_ingredient_table"].get(family, [])
    else:
        hit = predict_table(m, treatment, family or "", metric, time_h, temp_c)
        if hit is None:
            return None
        key = (treatment if m["key"].startswith("treatment|") else family) + "|" + metric
        v, crops, cites = hit["value"], hit["crops"], hit["citations"]
        other = m["entries"][key].get("from_crops_not_in_ingredient_table", [])
    pooled = ", ".join(crops)
    label = (f"estimated from other legumes (pooled from {pooled})" if m.get("ships_only_with_different_crop_rows")
             else f"predicted, pooled from {pooled}")
    return {"value": v, "kind": kind, "crops": crops, "fromCropsNotInIngredientTable": other,
            "citations": cites, "label": label,
            "shipsOnlyWithDifferentCropRows": bool(m.get("ships_only_with_different_crop_rows"))}


def step_evidence(rows: list[dict], models: dict, crop: str, treatment: str, metric: str,
                  time_h: Optional[float] = None, temp_c: Optional[float] = None,
                  baseline_type: str = "raw") -> dict:
    """See module docstring. `models` is bundle/model.json["models"]."""
    fb = fallback_lookup(rows, crop, treatment, metric, time_h)
    if fb["mode"] in SAME_CROP_MODES:
        return {"show": "published", "published": fb, "prediction": None, "otherEvidence": None,
                "note": "same-crop published rows shown; no pooled prediction"}
    pred = _pooled_prediction(models, rows, crop, treatment, metric, time_h, temp_c, baseline_type)
    return {"show": "prediction" if pred else "fallback", "published": None, "prediction": pred,
            "otherEvidence": fb,
            "note": ("no same-crop rows; pooled prediction shown with its crops, then other published evidence"
                     if pred else "no same-crop rows and no prediction; other published evidence only")}
