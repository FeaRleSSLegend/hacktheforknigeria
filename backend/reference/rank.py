"""rankIngredients: rank plant proteins for one application by functional fit, cost and density.

Pure function. Keys are camelCase to match PROJECT.md section 8.

Rules:
- Allergen matches and missing protein values are excluded with a reason.
- Complete coverage (PROJECT.md section 7, same rule as the root reference engine): a candidate is
  ranked only if it has a value for every need of the application. A candidate missing any need is
  not scored; it goes to notEnoughData with the needs it misses and is excluded with
  "not enough data: missing <needs>". Fit is scaled across the ranked candidates only.
- A candidate with no price is ranked by fit only: score and cost fields are null and it carries
  "price needed". Priced items always sort before unpriced ones, so an unpriced item is never the
  headline pick.
- inp["userPricesNgnPerKg"] (optional, id -> NGN per kg) overrides the bundled price.
- Sizing: with dry_g_per_serving (a dish's typical portion) the as-sold amount is that portion for each
  person; protein per plate follows from it. Without it (no dish), the amount is sized to
  inp["targetProteinG"] per person. Cost per gram of protein, used in the score, is the same either way.
"""
from .config import DEFAULT_FORM, DRIVER_TEXT, MONEY_DP, SCORE_DP
from .scoring import fit_scores, overall_scores
from .sizing import as_sold_g, cost_ngn

NOT_ENOUGH_DATA = "not enough data"
PRICE_NEEDED = "price needed"


def _r(v, dp):
    return None if v is None else round(v, dp)


def _driver_text(drivers: list[dict]) -> list[str]:
    return [DRIVER_TEXT[(d["name"], d["contribution"] > 0)] for d in drivers if abs(d["contribution"]) > 1e-9]


def _functional_quality(prop_rows: list[dict], cid: str, needs: list[str]) -> str:
    qs = sorted({r["quality"] for r in prop_rows
                 if r["ingredient_id"] == cid and r["property"] in needs and r.get("form") == DEFAULT_FORM})
    return "+".join(qs) if qs else "missing"


def user_prices(inp: dict) -> dict:
    prices = inp.get("userPricesNgnPerKg") or {}
    for k, v in prices.items():
        if not isinstance(v, (int, float)) or isinstance(v, bool) or v <= 0:
            raise ValueError(f"userPricesNgnPerKg[{k}] must be a positive number")
    return prices


def price_of(item_id: str, record: dict, prices: dict) -> tuple[float | None, str | None]:
    """(price per kg, 'user' | 'bundled' | None)."""
    if item_id in prices:
        return float(prices[item_id]), "user"
    if record.get("price_ngn_per_kg") is not None:
        return record["price_ngn_per_kg"], "bundled"
    return None, None


def rank_ingredients(application_id: str, inp: dict, data: dict, candidate_ids: list[str] | None = None,
                     dry_g_per_serving: float | None = None) -> dict:
    version = data.get("version", "dev")
    app = data["applications"].get(application_id)
    if app is None:
        return {"items": [], "excluded": [{"id": application_id, "reason": "unknown application"}], "notEnoughData": [],
                "bundleVersion": version}

    ids = list(candidate_ids) if candidate_ids is not None else list(data["ingredients"])
    allergens = set(inp.get("allergens", []))
    prices = user_prices(inp)
    servings = inp["servings"]

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
    ranked, not_enough = [], []
    for cid in cands:
        if fits[cid]["ranked"]:
            ranked.append(cid)
        else:
            missing = fits[cid]["missingNeeds"]
            not_enough.append({"id": cid, "missingNeeds": missing})
            excluded.append({"id": cid, "reason": f"{NOT_ENOUGH_DATA}: missing " + ", ".join(missing)})

    ing = data["ingredients"]
    if dry_g_per_serving is not None:
        per_person = {c: dry_g_per_serving for c in ranked}
        plate = {c: dry_g_per_serving * ing[c]["protein_g_per_100g"] / 100.0 for c in ranked}
    else:
        plate = {c: inp["targetProteinG"] for c in ranked}
        per_person = {c: as_sold_g(plate[c], ing[c]["protein_g_per_100g"]) for c in ranked}
    sold = {c: per_person[c] * servings for c in ranked}
    price = {c: price_of(c, ing[c], prices) for c in ranked}
    priced = [c for c in ranked if price[c][0] is not None]
    cost = {c: cost_ngn(sold[c], price[c][0]) for c in priced}
    cost_pp = {c: cost_ngn(per_person[c], price[c][0]) for c in priced}
    per_g = {c: cost[c] / (plate[c] * servings) for c in priced}
    scores = overall_scores(
        {c: fits[c]["fit"] for c in priced}, per_g, {c: ing[c]["protein_g_per_100g"] for c in priced}
    ) if priced else {}

    need_props = [n["property"] for n in app["needs"]]
    items = []
    for c in ranked:
        f = fits[c]
        flags = []
        is_priced = c in scores
        if not is_priced:
            flags.append(PRICE_NEEDED)
        items.append({
            "ingredientId": c,
            "score": _r(scores[c]["score"], SCORE_DP) if is_priced else None,
            "fit": _r(f["fit"], SCORE_DP),
            "fitRange": [_r(f["fitRange"][0], SCORE_DP), _r(f["fitRange"][1], SCORE_DP)],
            "costNgn": _r(cost.get(c), MONEY_DP),
            "costPerPersonNgn": _r(cost_pp.get(c), MONEY_DP),
            "costPerGProtein": _r(per_g.get(c), 4),
            "asSoldG": _r(sold[c], 1),
            "proteinPerPlateG": _r(plate[c], 1),
            "proteinTotalG": _r(plate[c] * servings, 1),
            "priceSource": price[c][1],
            "drivers": _driver_text(scores[c]["drivers"]) if is_priced else [],
            "flags": flags,
            "quality": {
                "composition": ing[c]["quality"],
                "price": ("entered by you" if price[c][1] == "user"
                          else f"published ({ing[c].get('price_month') or 'month not stated'})" if is_priced
                          else "missing"),
                "functional": _functional_quality(data["properties"], c, need_props),
                "weights": "estimated",
            },
        })

    items.sort(key=lambda i: (i["score"] is None, -(i["score"] or 0.0), -i["fit"], i["ingredientId"]))
    return {"items": items, "excluded": excluded, "notEnoughData": not_enough, "bundleVersion": version}
