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

    Complete-coverage rule: a candidate is ranked only if it has a value for every need of
    the application. A candidate missing any need gets fit None, ranked False and the missing
    needs named; fit is never computed over a subset of needs. Scaling to 0-1 uses only the
    ranked candidates, so an unranked one cannot move the others' scores.
    """
    needs = application["needs"]
    aggs = {n["property"]: {cid: aggregate_property(prop_rows, cid, n["property"], form) for cid in candidate_ids}
            for n in needs}
    missing = {cid: [n["property"] for n in needs if aggs[n["property"]][cid] is None] for cid in candidate_ids}
    ranked = [cid for cid in candidate_ids if not missing[cid]]
    wsum = sum(n["weight"] for n in needs)

    result: dict[str, dict] = {
        cid: {"fit": None, "fitRange": None, "missingNeeds": missing[cid], "ranked": False}
        for cid in candidate_ids if missing[cid]
    }
    if not ranked or wsum <= 0:
        for cid in ranked:
            result[cid] = {"fit": None, "fitRange": None, "missingNeeds": [], "ranked": False}
        return result
    acc = {cid: [0.0, 0.0, 0.0] for cid in ranked}
    for n in needs:
        prop, w, higher = n["property"], n["weight"], n["direction"] == "higher"
        meds = [aggs[prop][cid][0] for cid in ranked]
        lo, hi = min(meds), max(meds)
        for cid in ranked:
            med, vmin, vmax, _ = aggs[prop][cid]
            d, d_lo, d_hi = _scale(med, lo, hi), _scale(vmin, lo, hi), _scale(vmax, lo, hi)
            if not higher:
                d, d_lo, d_hi = 1 - d, 1 - d_hi, 1 - d_lo
            acc[cid][0] += w * d
            acc[cid][1] += w * d_lo
            acc[cid][2] += w * d_hi
    for cid in ranked:
        f, f_lo, f_hi = (v / wsum for v in acc[cid])
        result[cid] = {"fit": f, "fitRange": (f_lo, f_hi), "missingNeeds": [], "ranked": True}
    return result


def overall_scores(fit: dict[str, float], cost_per_g: dict[str, float],
                   protein_density: dict[str, float]) -> dict[str, dict]:
    """Combine fit, cost score (cheaper is better) and protein density into one score, with drivers.

    Only priced candidates are scored (every cost_per_g must be a number). Unpriced candidates
    are not scored; the caller ranks them below the priced ones by fit and flags "price needed".
    """
    if any(v is None for v in cost_per_g.values()):
        raise ValueError("overall_scores takes priced candidates only")
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
