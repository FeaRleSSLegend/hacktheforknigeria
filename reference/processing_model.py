"""Evaluate an exported processing model from its JSON alone. Pure functions, plain lists.

This is the contract the TypeScript engine copies: standardise, one-hot, dot product.
Change is relative to the paper's untreated sample, whose type (raw, dehulled, soaked,
germinated) is a feature when the model was trained with it. A prediction is returned only
for a known crop, treatment and baseline type and only inside the
published time/temperature range for that crop and treatment. Otherwise None, and the
caller uses the fallback (nearest published rows).
"""
from typing import Optional


def _in_range(value: Optional[float], rng: Optional[list]) -> bool:
    if rng is None:
        return value is None
    if value is None:
        return False
    return rng[0] <= value <= rng[1]


def feature_vector(model: dict, crop: str, treatment: str, time_h: Optional[float], temp_c: Optional[float],
                   metric: Optional[str] = None, baseline_type: Optional[str] = None) -> list[float]:
    """Build the feature vector in model['feature_names'] order."""
    means, stds = model["scaler_means"], model["scaler_stds"]
    raw = {
        "time_h": time_h,
        "temp_c": temp_c,
        "time_h_sq": None if time_h is None else time_h * time_h,
        "time_x_temp": None if time_h is None or temp_c is None else time_h * temp_c,
    }
    out = []
    for name in model["feature_names"]:
        if name in raw:
            v = raw[name]
            out.append(0.0 if v is None else (v - means[name]) / stds[name])
        elif name == "time_missing":
            out.append(1.0 if time_h is None else 0.0)
        elif name == "temp_missing":
            out.append(1.0 if temp_c is None else 0.0)
        elif name.startswith("crop="):
            out.append(1.0 if name[5:] == crop else 0.0)
        elif name.startswith("treatment="):
            out.append(1.0 if name[10:] == treatment else 0.0)
        elif name.startswith("metric="):
            out.append(1.0 if name[7:] == metric else 0.0)
        elif name.startswith("baseline="):
            out.append(1.0 if name[9:] == baseline_type else 0.0)
        else:
            raise ValueError(f"unknown feature {name}")
    return out


def predict(model: dict, crop: str, treatment: str, time_h: Optional[float], temp_c: Optional[float],
            metric: Optional[str] = None, baseline_type: Optional[str] = None) -> Optional[float]:
    """Predicted change_pct, or None when the inputs are outside what the model was trained on."""
    key = f"{crop}|{treatment}"
    ranges = model["training_ranges"].get(key)
    if ranges is None:
        return None
    if not _in_range(time_h, ranges["time_h"]) or not _in_range(temp_c, ranges["temp_c"]):
        return None
    if model.get("baseline_types") and baseline_type not in model["baseline_types"]:
        return None
    x = feature_vector(model, crop, treatment, time_h, temp_c, metric, baseline_type)
    return model["intercept"] + sum(c * v for c, v in zip(model["coefficients"], x))
