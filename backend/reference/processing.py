"""recommendProcessing: preparation options for one ingredient and one outcome metric (the goal).

Pure function. Two modes (PROJECT.md sections 7 and 8):

- "fallback": published results, never predictions. Order: playbook entries for this crop, then
  grouped published rows for this crop, then (only when same-crop rows are thin) labelled rows from
  other crops. Rows the paper reports as cumulative stages are labelled so.
- Crop group: a plant only borrows evidence (pooled estimates or other-crop rows) from crops of its
  own group (ingredients.csv crop_group, e.g. legume). Melon seed is an oilseed and the evidence is
  from legumes, so it gets "No published data for this plant." instead of legume numbers.
- "model": only when the crop has NO same-crop published evidence for the goal (no playbook entry,
  no row) and bundle model.json["models"][goal] covers it. Same-crop rows always come first and a
  pooled prediction is never shown next to them (team decision, Nov 20). Model options are followed
  by labelled other-crop rows as supporting evidence.

model.json format (written by scripts/train_processing.py at the repo root):
  {"models": {"<metric>": entry}}. Read here: tables keyed "treatment|metric" (C3), entries
  {"<treatment>|<metric>": {"value", "n_rows", "papers", "crops", "citations", "time_h", "temp_c",
  "cumulative_from_raw"}}: a pooled published change across the listed crops, never one crop's own
  number; the range shown is the min and max of the cited rows. Labelled with the crops and, when
  "ships_only_with_different_crop_rows" is true, "estimated from other legumes".
  Ridge entries predict only for a crop and treatment they were trained on; those pairs always have
  same-crop rows, so under the same-crop-first rule a ridge never surfaces here and is not read.
  Other kinds (C1, C2, C4 family tables, C5) are not read either; the result falls back.
"""
from statistics import median

from .config import (DEFAULT_DIRECTION, FALLBACK_MAX_OTHER_CROP, FALLBACK_MAX_SAME_CROP, HEAT_STEPS,
                     METRIC_ALIASES, MODEL_TOP_K, STEP_INSTRUCTIONS, STEP_KEYWORDS)

def _rows(n: int) -> str:
    return f"{n} row" if n == 1 else f"{n} rows"


FALLBACK_NOTE = "No prediction available. These are published results from the cited papers, not predictions."
NO_DATA_NOTE = "No published data for this plant."
MODEL_NOTE = ("Estimated from published experiments on the crops named, inside their published range. "
              "Not measured on this crop.")
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
        cumulative = any(r.get("cumulative_from_raw") is True
                         or "cumulative" in (r.get("method_note") or "").lower() for r in rs)
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


def _model_label(spec: dict, crops: list[str]) -> str:
    pooled = ", ".join(crops)
    if spec.get("ships_only_with_different_crop_rows"):
        return f"estimated from other legumes (pooled from {pooled})"
    return f"predicted, pooled from {pooled}"


def _range_text(name: str, rng: list | None, unit: str) -> str | None:
    if rng is None:
        return None
    lo, hi = rng
    return f"{name} {lo:g} {unit}" if lo == hi else f"{name} {lo:g} to {hi:g} {unit}"


def _table_options(ingredient_id: str, goal: str, spec: dict, rows: list[dict],
                   direction: str | None, group: str | None, groups: dict) -> list[dict]:
    if not str(spec.get("key", "")).startswith("treatment|"):
        return []
    change = {r["exp_id"]: r["change_pct"] for r in rows}
    opts = []
    for key in sorted(spec.get("entries", {})):
        treatment, _, metric = key.partition("|")
        if metric != goal:
            continue
        e = spec["entries"][key]
        if not group or any(groups.get(c) != group for c in e["crops"]):
            continue
        cited = [change[x] for x in e["citations"] if change.get(x) is not None]
        value = e["value"]
        rng = [round(min(cited), 1), round(max(cited), 1)] if cited else [round(value, 1), round(value, 1)]
        crops = list(e["crops"])
        evidence = (f"{_model_label(spec, crops)}; not measured on {ingredient_id}; {_rows(e['n_rows'])}; "
                    f"range is the published rows; the estimate is pulled toward the average over all treatments "
                    f"for {goal}, so it can sit outside that range")
        if e.get("cumulative_from_raw"):
            evidence += "; includes cumulative stages from raw seed"
        conditions = "; ".join(x for x in (_range_text("time", e.get("time_h"), "h"),
                                            _range_text("temperature", e.get("temp_c"), "C")) if x)
        opts.append({
            "kind": "model",
            "cropId": ingredient_id,
            "pooledFrom": crops,
            "treatment": treatment,
            "timeH": None,
            "tempC": None,
            "instruction": instruction_for(treatment),
            "conditions": f"published range in the pooled rows: {conditions}" if conditions else None,
            "effect": f"Estimated change: {value:+.1f}% (pooled from {', '.join(crops)})",
            "effectRange": rng,
            "nRows": e["n_rows"],
            "sources": list(e["papers"]),
            "evidence": evidence,
            "_key": _effect_key(direction, value),
        })
    return opts


def _model_options(ingredient_id: str, goal: str, spec: dict, rows: list[dict],
                   direction: str | None, group: str | None, groups: dict) -> list[dict]:
    opts = _table_options(ingredient_id, goal, spec, rows, direction, group, groups)
    opts.sort(key=lambda o: (o["_key"], o["treatment"]))
    for o in opts:
        del o["_key"]
    return opts[:MODEL_TOP_K]


def recommend_processing(ingredient_id: str, goal: str, data: dict, direction: str | None = None) -> dict:
    goal = canonical_metric(goal)
    d = _direction(goal, direction)
    rows = [r for r in data.get("treatments", [])
            if canonical_metric(r["outcome_metric"]) == goal and r.get("change_pct") is not None]
    playbook = _playbook_options(ingredient_id, goal, data, d)
    same = _row_groups([r for r in rows if r["crop_id"] == ingredient_id], ingredient_id, d)[:FALLBACK_MAX_SAME_CROP]
    group = (data["ingredients"].get(ingredient_id) or {}).get("crop_group") or None
    groups = {r["crop_id"]: r.get("crop_group") for r in data.get("treatments", [])}
    other = []
    if len(same) < FALLBACK_MAX_SAME_CROP and group:
        kin = [r for r in rows if r["crop_id"] != ingredient_id and r.get("crop_group") == group]
        other = _row_groups(kin, ingredient_id, d)[:FALLBACK_MAX_OTHER_CROP]

    spec = ((data.get("model") or {}).get("models") or {}).get(goal)
    if spec and not playbook and not same:
        opts = _model_options(ingredient_id, goal, spec, rows, d, group, groups)
        if opts:
            note = f"No published rows for {ingredient_id}. {MODEL_NOTE}"
            if other:
                note += " Rows from other crops are labelled."
            return {"mode": "model", "ingredientId": ingredient_id, "goal": goal, "options": opts + other,
                    "note": note}

    options = playbook + same + other
    note = FALLBACK_NOTE
    if other:
        note += f" Few published rows for {ingredient_id}; rows from other crops are labelled."
    if not options:
        note = NO_DATA_NOTE
    return {"mode": "fallback", "ingredientId": ingredient_id, "goal": goal, "options": options, "note": note}
