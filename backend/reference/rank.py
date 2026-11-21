"""rankIngredients: rank plant proteins for one application by functional fit, cost and density.

Pure function. Keys are camelCase to match PROJECT.md section 8.

Rules:
- Allergen matches and missing protein values are excluded with a reason.
- A candidate with no functional value for any need is excluded ("no functional data for this dish").
- A candidate with some needs missing is kept, its fit is computed on the needs that have data,
  and it carries a "no data: <property>" flag per missing need.
- A candidate with no price is ranked by fit only: score and cost fields are null and it carries
  "price needed". Priced items always sort before unpriced ones, so an unpriced item is never the
  headline pick.
"""
from .config import DEFAULT_FORM, DRIVER_TEXT, MONEY_DP, SCORE_DP
from .scoring import fit_scores, overall_scores
from .sizing import as_sold_g, cost_ngn

NO_FUNCTIONAL_DATA = "no functional data for this dish"
PRICE_NEEDED = "price needed"


def _r(v, dp):
    return None if v is None else round(v, dp)


def _driver_text(drivers: list[dict]) -> list[str]:
    return [DRIVER_TEXT[(d["name"], d["contribution"] > 0)] for d in drivers if abs(d["contribution"]) > 1e-9]


def _functional_quality(prop_rows: list[dict], cid: str, needs: list[str]) -> str:
    qs = sorted({r["quality"] for r in prop_rows
                 if r["ingredient_id"] == cid and r["property"] in needs and r.get("form") == DEFAULT_FORM})
    return "+".join(qs) if qs else "missing"


def rank_ingredients(application_id: str, inp: dict, data: dict, candidate_ids: list[str] | None = None) -> dict:
    version = data.get("version", "dev")
    app = data["applications"].get(application_id)
    if app is None:
        return {"items": [], "excluded": [{"id": application_id, "reason": "unknown application"}], "bundleVersion": version}

    ids = list(candidate_ids) if candidate_ids is not None else list(data["ingredients"])
    allergens = set(inp.get("allergens", []))
    total_protein_g = inp["targetProteinG"] * inp["servings"]

    excluded, cands = [], []
    for cid in ids:
        ing = data["ingredients"].get(cid)
        if ing is None:
            excluded.append({"id": cid, "reason": "not in ingredients table"})
        elif set(ing["allergen_tags"]) & allergens:
            excluded.append({"id": cid, "reason": "allergen: " + ", ".join(sorted(set(ing["allergen_tags"]) & allergens))})
        elif not ing.get("protein_g_per_100g"):
            excluded.append({"id": cid, "reason": "missing protein value"})
        else:
            cands.append(cid)

    fits = fit_scores(app, cands, data["properties"]) if cands else {}
    ranked = []
    for cid in cands:
        if fits[cid]["fit"] is None:
            excluded.append({"id": cid, "reason": NO_FUNCTIONAL_DATA})
        else:
            ranked.append(cid)

    ing = data["ingredients"]
    sold = {c: as_sold_g(total_protein_g, ing[c]["protein_g_per_100g"]) for c in ranked}
    priced = [c for c in ranked if ing[c]["price_ngn_per_kg"] is not None]
    cost = {c: cost_ngn(sold[c], ing[c]["price_ngn_per_kg"]) for c in priced}
    per_g = {c: cost[c] / total_protein_g for c in priced}
    scores = overall_scores(
        {c: fits[c]["fit"] for c in priced}, per_g, {c: ing[c]["protein_g_per_100g"] for c in priced}
    ) if priced else {}

    need_props = [n["property"] for n in app["needs"]]
    items = []
    for c in ranked:
        f = fits[c]
        flags = [f"no data: {p}" for p in f["missingNeeds"]]
        is_priced = c in scores
        if not is_priced:
            flags.append(PRICE_NEEDED)
        items.append({
            "ingredientId": c,
            "score": _r(scores[c]["score"], SCORE_DP) if is_priced else None,
            "fit": _r(f["fit"], SCORE_DP),
            "fitRange": [_r(f["fitRange"][0], SCORE_DP), _r(f["fitRange"][1], SCORE_DP)],
            "costNgn": _r(cost.get(c), MONEY_DP),
            "costPerGProtein": _r(per_g.get(c), 4),
            "asSoldG": _r(sold[c], 1),
            "drivers": _driver_text(scores[c]["drivers"]) if is_priced else [],
            "flags": flags,
            "quality": {
                "composition": ing[c]["quality"],
                "price": f"published ({ing[c].get('price_month') or 'month not stated'})" if is_priced else "missing",
                "functional": _functional_quality(data["properties"], c, need_props),
                "weights": "estimated",
            },
        })

    items.sort(key=lambda i: (i["score"] is None, -(i["score"] or 0.0), -i["fit"], i["ingredientId"]))
    return {"items": items, "excluded": excluded, "bundleVersion": version}
