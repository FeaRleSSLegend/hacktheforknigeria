"""recommendProcessing: preparation options for one ingredient and one outcome metric (the goal).

Pure function. Two modes (PROJECT.md sections 7 and 8):

- "model": only when model.json marks the metric as shipped AND the entry has the linear format
  below AND the crop has a training range. Grid search inside the observed range (no extrapolation),
  top options with +-1.96 x residual SD intervals.
- "fallback": published results, never predictions. Order: playbook entries for this crop, then
  grouped published rows for this crop, then (only when same-crop rows are thin) labelled rows from
  other crops. Rows the paper reports as cumulative stages are labelled so.

Expected model.json metric entry (anything else falls back safely):
  {"ships": true, "intercept": float, "coef": {"crop=<id>": f, "treatment=<t>": f, "time_h": f,
   "temp_c": f, "time_h^2": f, "time_h*temp_c": f}, "residual_sd": float,
   "ranges": {"<crop>|<treatment>": {"time_h": [lo, hi], "temp_c": [lo, hi]}},
   optional "papers": [..], "cv_mae": f, "baseline_mae": f}
"""
from statistics import median

from .config import (DEFAULT_DIRECTION, FALLBACK_MAX_OTHER_CROP, FALLBACK_MAX_SAME_CROP, HEAT_STEPS,
                     INTERVAL_Z, METRIC_ALIASES, MODEL_GRID_STEPS, MODEL_TOP_K, STEP_INSTRUCTIONS, STEP_KEYWORDS)

def _rows(n: int) -> str:
    return f"{n} row" if n == 1 else f"{n} rows"


FALLBACK_NOTE = "No prediction available. These are published results from the cited papers, not predictions."
_KNOWN_STEPS = sorted(set(STEP_INSTRUCTIONS) | set(HEAT_STEPS), key=len, reverse=True)


def canonical_metric(metric: str) -> str:
    return METRIC_ALIASES.get(metric, metric)


def treatment_steps(treatment: str) -> list[str]:
    """Split a compound treatment name into known steps, e.g. 'soaking_deep_frying' -> [soaking, deep_frying]."""
    s, out = treatment, []
    while s:
        for k in _KNOWN_STEPS:
            if s == k or s.startswith(k + "_"):
                out.append(k)
                s = s[len(k) + 1:]
                break
        else:
            head, _, s = s.partition("_")
            out.append(head)
    return out


def steps_from_text(steps: list[str]) -> list[str]:
    """Steps named in plain-English playbook text, in order of appearance."""
    text = " ".join(steps).lower()
    claimed, found = set(), []
    for kw in sorted(STEP_KEYWORDS, key=len, reverse=True):
        start = text.find(kw)
        while start != -1:
            span = set(range(start, start + len(kw)))
            if not span & claimed:
                claimed |= span
                found.append((start, STEP_KEYWORDS[kw]))
            start = text.find(kw, start + 1)
    out = []
    for _, step in sorted(found):
        if not out or out[-1] != step:
            out.append(step)
    return out


def instruction_for(treatment: str) -> str:
    parts = [STEP_INSTRUCTIONS.get(s, s.replace("_", " ")) for s in treatment_steps(treatment)]
    text = ", then ".join(p for p in parts if p)
    return text[:1].upper() + text[1:] + "." if text else ""


def _direction(goal: str, direction: str | None) -> str | None:
    return direction if direction in ("higher", "lower") else DEFAULT_DIRECTION.get(goal)


def _effect_key(direction: str | None, med: float) -> float:
    if direction == "lower":
        return med
    if direction == "higher":
        return -med
    return 0.0


def _playbook_options(ingredient_id: str, goal: str, data: dict, direction: str | None) -> list[dict]:
    opts = []
    for pid in sorted(data.get("playbook", {})):
        p = data["playbook"][pid]
        m = (p.get("effect") or {}).get("metrics", {}).get(goal)
        if p["crop_id"] != ingredient_id or not m:
            continue
        opts.append({
            "kind": "playbook",
            "playbookId": pid,
            "cropId": ingredient_id,
            "treatment": "_".join(steps_from_text(p["steps"])),
            "timeH": None,
            "tempC": None,
            "instruction": " ".join(p["steps"]),
            "conditions": p.get("conditions"),
            "effect": f"Published change: {m['median_pct']:+.1f}% (median of {_rows(m['n_rows'])})",
            "effectRange": [m["min_pct"], m["max_pct"]],
            "nRows": m["n_rows"],
            "sources": list(p["sources"]),
            "evidence": p["evidence_level"],
            "_med": m["median_pct"],
        })
    opts.sort(key=lambda o: (_effect_key(direction, o["_med"]), o["playbookId"]))
    for o in opts:
        del o["_med"]
    return opts


def _row_groups(rows: list[dict], ingredient_id: str, direction: str | None) -> list[dict]:
    groups: dict[tuple, list[dict]] = {}
    for r in rows:
        groups.setdefault((r["crop_id"], r["treatment"], r.get("time_h"), r.get("temp_c")), []).append(r)
    summaries = []
    for (crop, treatment, t, c), rs in groups.items():
        changes = [r["change_pct"] for r in rs]
        papers = sorted({r["paper_id"] for r in rs})
        med = round(median(changes), 1)
        cumulative = any("cumulative" in (r.get("method_note") or "").lower() for r in rs)
        same = crop == ingredient_id
        evidence = f"published rows, {'same crop' if same else 'other crop'}, {_rows(len(rs))}, {len(papers)} paper(s)"
        if cumulative:
            evidence += "; cumulative stages from raw seed, not the effect of this step alone"
        if not same:
            evidence += f"; measured on {crop}, not {ingredient_id}: estimated for this crop"
        summaries.append({
            "kind": "published_same_crop" if same else "published_other_crop",
            "cropId": crop,
            "treatment": treatment,
            "timeH": t,
            "tempC": c,
            "instruction": instruction_for(treatment),
            "conditions": None,
            "effect": f"Published change{'' if same else ' in ' + crop}: {med:+.1f}% (median of {_rows(len(rs))})",
            "effectRange": [round(min(changes), 1), round(max(changes), 1)],
            "nRows": len(rs),
            "sources": papers,
            "evidence": evidence,
            "_med": med,
        })
    summaries.sort(key=lambda g: (_effect_key(direction, g["_med"]), -g["nRows"], g["cropId"], g["treatment"],
                                  g["timeH"] if g["timeH"] is not None else -1.0,
                                  g["tempC"] if g["tempC"] is not None else -1.0))
    seen, picked = set(), []
    for g in summaries:
        if (g["cropId"], g["treatment"]) in seen:
            continue
        seen.add((g["cropId"], g["treatment"]))
        del g["_med"]
        picked.append(g)
    return picked


def _grid(lo: float, hi: float) -> list[float]:
    if hi <= lo:
        return [lo]
    step = (hi - lo) / (MODEL_GRID_STEPS - 1)
    return [lo + i * step for i in range(MODEL_GRID_STEPS)]


def _model_options(ingredient_id: str, spec: dict, direction: str | None) -> list[dict]:
    if not all(k in spec for k in ("intercept", "coef", "residual_sd", "ranges")):
        return []
    coef, sd = spec["coef"], spec["residual_sd"]
    evidence = "small linear model, validated on unseen papers"
    if "cv_mae" in spec and "baseline_mae" in spec:
        evidence += f" (grouped CV MAE {spec['cv_mae']} vs baseline {spec['baseline_mae']})"
    best_per_treatment = []
    for key in sorted(spec["ranges"]):
        crop, _, treatment = key.partition("|")
        if crop != ingredient_id:
            continue
        rng = spec["ranges"][key]
        cands = []
        for t in _grid(*rng["time_h"]):
            for c in _grid(*rng["temp_c"]):
                x = {f"crop={crop}": 1.0, f"treatment={treatment}": 1.0, "time_h": t, "temp_c": c,
                     "time_h^2": t * t, "time_h*temp_c": t * c}
                pred = spec["intercept"] + sum(coef.get(k, 0.0) * v for k, v in x.items())
                cands.append((_effect_key(direction, pred), t, c, pred))
        _, t, c, pred = min(cands)
        best_per_treatment.append({
            "kind": "model",
            "cropId": crop,
            "treatment": treatment,
            "timeH": round(t, 2),
            "tempC": round(c, 1),
            "instruction": instruction_for(treatment),
            "conditions": "inside the published range for this crop and treatment",
            "effect": f"Predicted change: {pred:+.1f}%",
            "effectRange": [round(pred - INTERVAL_Z * sd, 1), round(pred + INTERVAL_Z * sd, 1)],
            "nRows": None,
            "sources": list(spec.get("papers", [])),
            "evidence": evidence,
            "_key": _effect_key(direction, pred),
        })
    best_per_treatment.sort(key=lambda o: (o["_key"], o["treatment"]))
    for o in best_per_treatment:
        del o["_key"]
    return best_per_treatment[:MODEL_TOP_K]


def recommend_processing(ingredient_id: str, goal: str, data: dict, direction: str | None = None) -> dict:
    goal = canonical_metric(goal)
    d = _direction(goal, direction)
    spec = (data.get("model") or {}).get("metrics", {}).get(goal) or {}
    note_prefix = ""
    if spec.get("ships") is True:
        opts = _model_options(ingredient_id, spec, d)
        if opts:
            return {"mode": "model", "ingredientId": ingredient_id, "goal": goal, "options": opts,
                    "note": "Predicted by a small model inside the published range. Ranges are 95% intervals from cross-validation."}
        note_prefix = "The model does not cover this crop inside its training range. "

    rows = [r for r in data.get("treatments", [])
            if canonical_metric(r["outcome_metric"]) == goal and r.get("change_pct") is not None]
    same = _row_groups([r for r in rows if r["crop_id"] == ingredient_id], ingredient_id, d)[:FALLBACK_MAX_SAME_CROP]
    other = []
    if len(same) < FALLBACK_MAX_SAME_CROP:
        other = _row_groups([r for r in rows if r["crop_id"] != ingredient_id], ingredient_id, d)[:FALLBACK_MAX_OTHER_CROP]
    options = _playbook_options(ingredient_id, goal, data, d) + same + other
    note = note_prefix + FALLBACK_NOTE
    if other:
        note += f" Few published rows for {ingredient_id}; rows from other crops are labelled."
    if not options:
        note += f" No published rows for {goal}."
    return {"mode": "fallback", "ingredientId": ingredient_id, "goal": goal, "options": options, "note": note}
