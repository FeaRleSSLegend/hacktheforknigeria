"""Fallback when no processing model ships: show published rows, never an uncited number.

Pure functions. Input rows are treatment_experiments records (dicts, values may be strings).
Order of answers:
  1. same crop, treatment and metric: published rows, nearest in time first. If the asked time
     lies strictly between two published time points of one paper (same temperature), a linear
     interpolation between those two points, labelled as such. Never beyond the published range.
     Several rows at exactly the asked time (e.g. varieties) give a range, not one number.
  2. same crop and metric, a combined treatment that includes the asked one (e.g. asked
     'soaking' or 'dehulling', published 'dehulling_soaking'): rows labelled 'related treatment'
     with the published treatment name, no point estimate.
  3. same treatment and metric on other crops: rows labelled 'different crop', no point estimate.
  4. nothing: 'no published data' with the reason.
Rows whose method_note starts with 'NEEDS_HUMAN:' are returned with needsHuman true.
Rows marked cumulative_from_raw (household stage series, e.g. Bolade akara) carry their stage
order and path; when every returned row is cumulative the label says so, because such a row is
the effect of all stages from raw seed, not of the last step alone. fromDifferentCrop is true
for any row whose crop is not the asked crop; such numbers are never the asked crop's own.
cumulative_route() returns a whole stage series (e.g. soak > dehull > soak > wet mill > fry).
"""
from typing import Optional

LABEL_PUBLISHED = "published"
LABEL_INTERPOLATED = "interpolated between published points"
LABEL_RELATED = "related treatment"
LABEL_DIFFERENT_CROP = "different crop"
LABEL_NONE = "no published data"
LABEL_CUMULATIVE = "published, cumulative from raw seed"


def _num(v) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f


def _truthy(v) -> bool:
    return str(v).strip().lower() in ("true", "1", "yes")


def _cite(r: dict, time_h: Optional[float], asked_crop: Optional[str] = None) -> dict:
    t = _num(r.get("time_h"))
    stage = _num(r.get("stage_order"))
    return {
        "expId": r.get("exp_id"), "cropId": r.get("crop_id"), "treatment": r.get("treatment"),
        "metric": r.get("outcome_metric"), "timeH": t, "tempC": _num(r.get("temp_c")),
        "changePct": _num(r.get("change_pct")), "paperId": r.get("paper_id"), "page": r.get("page"),
        "quote": r.get("quote"), "quality": r.get("quality"),
        "needsHuman": str(r.get("method_note") or "").startswith("NEEDS_HUMAN:"),
        "baselineType": r.get("baseline_type") or None, "treatmentFamily": r.get("treatment_family") or None,
        "cumulativeFromRaw": _truthy(r.get("cumulative_from_raw")),
        "stageOrder": int(stage) if stage is not None else None,
        "route": r.get("route") or None, "stagePath": r.get("stage_path") or None,
        "fromDifferentCrop": asked_crop is not None and r.get("crop_id") != asked_crop,
        "timeDistanceH": None if t is None or time_h is None else abs(t - time_h),
    }


def _sort_nearest(cites: list[dict]) -> list[dict]:
    return sorted(cites, key=lambda c: (c["timeDistanceH"] is None, c["timeDistanceH"] or 0.0,
                                        c["timeH"] is None, c["timeH"] or 0.0, c["expId"] or ""))


def _interpolate(cites: list[dict], time_h: float) -> Optional[dict]:
    """Bracket time_h with the closest published points of one paper at one temperature."""
    best = None
    by_key: dict = {}
    for c in cites:
        if c["timeH"] is not None and c["changePct"] is not None:
            by_key.setdefault((c["paperId"], c["tempC"]), []).append(c)
    for pts in by_key.values():
        lo = [p for p in pts if p["timeH"] < time_h]
        hi = [p for p in pts if p["timeH"] > time_h]
        if not lo or not hi:
            continue
        a = max(lo, key=lambda p: p["timeH"])
        b = min(hi, key=lambda p: p["timeH"])
        width = b["timeH"] - a["timeH"]
        if best is None or width < best[2]:
            best = (a, b, width)
    if best is None:
        return None
    a, b, width = best
    frac = (time_h - a["timeH"]) / width
    return {"value": a["changePct"] + frac * (b["changePct"] - a["changePct"]), "between": [a, b]}


def fallback_lookup(rows: list[dict], crop: str, treatment: str, metric: str,
                    time_h: Optional[float] = None) -> dict:
    """Return published evidence for one crop, treatment and metric. See module docstring."""
    same = [_cite(r, time_h, crop) for r in rows
            if r.get("crop_id") == crop and r.get("treatment") == treatment and r.get("outcome_metric") == metric]
    if same:
        same = _sort_nearest(same)
        published = LABEL_CUMULATIVE if all(c["cumulativeFromRaw"] for c in same) else LABEL_PUBLISHED
        if time_h is not None:
            exact = [c for c in same if c["timeH"] == time_h and c["changePct"] is not None]
            if len(exact) == 1:
                return {"mode": "published_point", "label": published, "estimate": exact[0]["changePct"],
                        "range": None, "rows": same, "reason": "one published row matches the asked time"}
            if exact:
                vals = [c["changePct"] for c in exact]
                return {"mode": "published_range", "label": published, "estimate": None,
                        "range": [min(vals), max(vals)], "rows": same,
                        "reason": f"{len(exact)} published rows match the asked time (e.g. varieties); range shown"}
            interp = _interpolate(same, time_h)
            if interp:
                return {"mode": "interpolated", "label": LABEL_INTERPOLATED, "estimate": interp["value"], "range": None,
                        "rows": interp["between"] + [c for c in same if c not in interp["between"]],
                        "reason": "asked time lies between two published time points of one paper"}
            times = [c["timeH"] for c in same if c["timeH"] is not None]
            reason = (f"asked time is outside the published range {min(times)}-{max(times)} h; no extrapolation"
                      if times else "published rows give no time; no estimate for a specific time")
        else:
            reason = "published rows for this crop and treatment; no time asked"
        return {"mode": "same_crop", "label": published, "estimate": None, "range": None, "rows": same,
                "reason": reason}

    related = [_cite(r, time_h, crop) for r in rows
               if r.get("crop_id") == crop and r.get("outcome_metric") == metric
               and r.get("treatment") != treatment and treatment in str(r.get("treatment") or "").split("_")]
    if related:
        names = sorted({c["treatment"] for c in related})
        return {"mode": "related_treatment", "label": LABEL_RELATED, "estimate": None, "range": None,
                "rows": _sort_nearest(related),
                "reason": f"no published rows for '{treatment}' alone on {crop}; shown: {', '.join(names)}, "
                          f"which includes {treatment}"}

    other = [_cite(r, time_h, crop) for r in rows
             if r.get("crop_id") != crop and r.get("treatment") == treatment and r.get("outcome_metric") == metric]
    if other:
        return {"mode": "different_crop", "label": LABEL_DIFFERENT_CROP, "estimate": None, "range": None,
                "rows": _sort_nearest(other),
                "reason": f"no published rows for {crop}; the same treatment on other crops is shown for reference only"}

    return {"mode": "no_published_data", "label": LABEL_NONE, "estimate": None, "range": None, "rows": [],
            "reason": f"no published rows for treatment '{treatment}' and metric '{metric}' on any crop"}


def cumulative_route(rows: list[dict], crop: str, metric: str, route: str) -> dict:
    """Stage series for one household route (e.g. 'akara'), from cumulative_from_raw rows.

    A stage belongs to the route if its route field names it or is 'shared'. Each stage gives
    its published rows (e.g. one per variety) and their range; every number is the change
    from raw seed through that stage, not the effect of that stage alone.
    """
    hits = [_cite(r, None, crop) for r in rows
            if r.get("crop_id") == crop and r.get("outcome_metric") == metric and _truthy(r.get("cumulative_from_raw"))
            and (route in str(r.get("route") or "") or str(r.get("route") or "") == "shared")]
    if not hits:
        return {"mode": "no_published_data", "label": LABEL_NONE, "stages": [],
                "reason": f"no cumulative stage rows for {crop}, {metric}, route '{route}'"}
    stages: dict = {}
    for c in hits:
        stages.setdefault((c["stageOrder"], c["treatment"]), []).append(c)
    out = []
    for (order, trt), cs in sorted(stages.items(), key=lambda kv: (kv[0][0] is None, kv[0][0] or 0, kv[0][1])):
        vals = [c["changePct"] for c in cs if c["changePct"] is not None]
        out.append({"stageOrder": order, "treatment": trt, "stagePath": cs[0]["stagePath"], "n": len(cs),
                    "range": [min(vals), max(vals)] if vals else None,
                    "rows": sorted(cs, key=lambda c: c["expId"] or "")})
    return {"mode": "cumulative_route", "label": LABEL_CUMULATIVE, "stages": out,
            "reason": "each stage is the change from raw seed through that stage, not the effect of the stage alone"}
