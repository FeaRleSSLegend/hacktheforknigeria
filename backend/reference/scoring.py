"""Functional-fit scoring, overall score and drivers. Pure functions, no I/O."""
from statistics import median
from typing import Optional

from .config import DEFAULT_FORM, WEIGHTS


def aggregate_property(rows: list[dict], ingredient_id: str, prop: str, form: str = DEFAULT_FORM):
    """Median and min-max of published values for one ingredient, one property, one form.

    Returns (median, lo, hi, n) or None when there is no value.
    """
    vals = []
    for r in rows:
        if r["ingredient_id"] == ingredient_id and r["property"] == prop and r.get("form", form) == form:
            try:
                vals.append(float(r["value"]))
            except (TypeError, ValueError):
                continue
    if not vals:
        return None
    return (median(vals), min(vals), max(vals), len(vals))


def _scale(v: float, vmin: float, vmax: float) -> float:
    if vmax == vmin:
        return 0.5
    return min(1.0, max(0.0, (v - vmin) / (vmax - vmin)))


def scale_across(values: dict[str, Optional[float]], higher_is_better: bool = True) -> dict[str, Optional[float]]:
    present = [v for v in values.values() if v is not None]
    if not present:
        return {k: None for k in values}
    lo, hi = min(present), max(present)
    out: dict[str, Optional[float]] = {}
    for k, v in values.items():
        if v is None:
            out[k] = None
        else:
            s = _scale(v, lo, hi)
            out[k] = s if higher_is_better else 1.0 - s
    return out


def fit_scores(application: dict, candidate_ids: list[str], prop_rows: list[dict], form: str = DEFAULT_FORM) -> dict[str, dict]:
    """Weighted functional fit per candidate, with a range and a record of missing needs.

    Needs with no value for a candidate are skipped for that candidate and flagged;
    the fit is renormalised over the needs that have data. A candidate with no data
    for any need gets fit None.
    """
    needs = application["needs"]
    per_need = {}
    for need in needs:
        prop = need["property"]
        aggs = {cid: aggregate_property(prop_rows, cid, prop, form) for cid in candidate_ids}
        meds = {cid: (a[0] if a else None) for cid, a in aggs.items()}
        present = [v for v in meds.values() if v is not None]
        higher = need["direction"] == "higher"
        if present:
            lo, hi = min(present), max(present)
        per_need[prop] = (aggs, lo if present else None, hi if present else None, higher, need["weight"])

    result: dict[str, dict] = {}
    for cid in candidate_ids:
        num = num_lo = num_hi = wsum = 0.0
        missing = []
        for prop, (aggs, lo, hi, higher, w) in per_need.items():
            a = aggs[cid]
            if a is None or lo is None:
                missing.append(prop)
                continue
            d = _scale(a[0], lo, hi)
            d_lo, d_hi = _scale(a[1], lo, hi), _scale(a[2], lo, hi)
            if not higher:
                d, d_lo, d_hi = 1 - d, 1 - d_hi, 1 - d_lo
            num += w * d
            num_lo += w * d_lo
            num_hi += w * d_hi
            wsum += w
        if wsum == 0:
            result[cid] = {"fit": None, "fitRange": None, "missingNeeds": missing}
        else:
            result[cid] = {
                "fit": num / wsum,
                "fitRange": (num_lo / wsum, num_hi / wsum),
                "missingNeeds": missing,
            }
    return result


def overall_scores(fit: dict[str, float], cost_per_g: dict[str, float], protein_density: dict[str, float]) -> dict[str, dict]:
    """Combine fit, cost score (cheaper is better) and protein density into one score, with drivers."""
    cost_s = scale_across(cost_per_g, higher_is_better=False)
    dens_s = scale_across(protein_density, higher_is_better=True)
    ids = list(fit.keys())
    comps = {"fit": {i: fit[i] for i in ids}, "cost": {i: cost_s[i] for i in ids}, "density": {i: dens_s[i] for i in ids}}
    means = {k: sum(v.values()) / len(v) for k, v in comps.items()}
    out = {}
    for i in ids:
        score = sum(WEIGHTS[k] * comps[k][i] for k in WEIGHTS)
        drivers = sorted(
            ({"name": k, "contribution": WEIGHTS[k] * (comps[k][i] - means[k])} for k in WEIGHTS),
            key=lambda d: abs(d["contribution"]),
            reverse=True,
        )
        out[i] = {"score": score, "drivers": drivers[:2], "parts": {k: comps[k][i] for k in WEIGHTS}}
    return out
