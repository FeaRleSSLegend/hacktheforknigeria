"""suggestDishes: rank dishes for a pantry, budget and household size.

Input and output keys are camelCase so golden fixtures match the TypeScript engine.
Pure function: takes the loaded data dict, does no I/O.

Rules:
- Complete coverage: a protein is ranked for a dish only if it has a value for every
  functional need of the dish's application. Others go to the dish's notEnoughData list.
- Price: inp["userPricesNgnPerKg"] (optional, id -> NGN per kg) overrides the bundled price.
  A protein with neither is never the headline pick while any priced protein can be used:
  priced proteins are ranked first by overall score, unpriced ones below them by fit only
  (score null), flagged "price needed", and left out of the budget filter.
- Headline (dish["protein"]): the best priced protein in the pool (pantry items first in
  pantry mode), else the best priced protein overall, else (no priced protein at all) the
  best unpriced one by fit. Dishes whose headline is unpriced sort after all priced dishes.
"""
from typing import Optional

from .scoring import fit_scores, overall_scores
from .sizing import as_sold_g, cost_ngn

PRICE_NEEDED = "price needed"


def _price(item_id: str, record: dict, user_prices: dict) -> tuple[Optional[float], Optional[str]]:
    """(price per kg, source) with source 'user', 'bundled' or None."""
    if item_id in user_prices:
        return float(user_prices[item_id]), "user"
    if record.get("price_ngn_per_kg") is not None:
        return record["price_ngn_per_kg"], "bundled"
    return None, None


def _check_user_prices(user_prices: dict) -> None:
    for k, v in user_prices.items():
        if not isinstance(v, (int, float)) or isinstance(v, bool) or v <= 0:
            raise ValueError(f"userPricesNgnPerKg[{k}] must be a positive number")


def suggest_dishes(inp: dict, data: dict) -> dict:
    mode = inp.get("mode", "pantry")
    pantry = set(inp.get("pantryIds", []))
    allergens = set(inp.get("allergens", []))
    user_prices = inp.get("userPricesNgnPerKg") or {}
    _check_user_prices(user_prices)
    servings = inp["servings"]
    target = inp["targetProteinG"]  # grams per person per meal
    budget = inp["budgetNgn"]
    total_protein_g = target * servings

    dishes = data["dishes"]
    if mode == "dish":
        dishes = [d for d in dishes if d["id"] == inp.get("dishId")]

    suggestions, excluded = [], []
    for dish in dishes:
        app = data["applications"].get(dish["application_id"])
        if app is None:
            excluded.append({"id": dish["id"], "reason": "unknown application"})
            continue

        cands, reasons = [], {}
        for cid in dish["protein_slot_ids"]:
            ing = data["ingredients"].get(cid)
            if ing is None:
                reasons[cid] = "not in ingredients table"
            elif set(ing["allergen_tags"]) & allergens:
                reasons[cid] = "allergen"
            elif ing.get("protein_g_per_100g") in (None, 0):
                reasons[cid] = "missing protein value"
            else:
                cands.append(cid)
        if not cands:
            excluded.append({"id": dish["id"], "reason": "no usable protein: " + "; ".join(f"{k} ({v})" for k, v in reasons.items())})
            continue

        fits = fit_scores(app, cands, data["properties"])
        not_enough = [{"id": c, "missingNeeds": fits[c]["missingNeeds"]} for c in cands if not fits[c]["ranked"]]
        usable = [c for c in cands if fits[c]["ranked"]]
        if not usable:
            excluded.append({"id": dish["id"], "reason": "not enough functional data: " + "; ".join(
                f"{n['id']} (missing {', '.join(n['missingNeeds'])})" for n in not_enough)})
            continue

        price = {c: _price(c, data["ingredients"][c], user_prices) for c in usable}
        sold = {c: as_sold_g(total_protein_g, data["ingredients"][c]["protein_g_per_100g"]) for c in usable}
        cost = {c: (cost_ngn(sold[c], price[c][0]) if price[c][0] is not None else None) for c in usable}
        per_g = {c: (cost[c] / total_protein_g if cost[c] is not None else None) for c in usable}
        dens = {c: data["ingredients"][c]["protein_g_per_100g"] for c in usable}
        priced = [c for c in usable if cost[c] is not None]
        unpriced = [c for c in usable if cost[c] is None]
        scores = overall_scores({c: fits[c]["fit"] for c in priced}, {c: per_g[c] for c in priced},
                                {c: dens[c] for c in priced}) if priced else {}
        order = (sorted(priced, key=lambda c: -scores[c]["score"])
                 + sorted(unpriced, key=lambda c: -fits[c]["fit"]))

        have = [c for c in usable if c in pantry]
        pool = have if (mode == "pantry" and have) else usable
        pool_priced = [c for c in order if c in pool and c in priced]
        if pool_priced:
            best = pool_priced[0]
        elif priced:
            best = order[0]
        else:
            best = next(c for c in order if c in pool)

        def item(c: str) -> dict:
            return {
                "ingredientId": c,
                "score": scores[c]["score"] if c in scores else None,
                "fit": fits[c]["fit"],
                "fitRange": list(fits[c]["fitRange"]),
                "costNgn": round(cost[c], 2) if cost[c] is not None else None,
                "costPerGProtein": round(per_g[c], 4) if per_g[c] is not None else None,
                "priceSource": price[c][1],
                "asSoldG": round(sold[c], 1),
                "drivers": scores[c]["drivers"] if c in scores else [],
                "flags": [] if c in scores else [PRICE_NEEDED],
            }

        missing, flags = [], []
        total_cost: Optional[float] = cost[best]
        if cost[best] is None:
            flags.append(f"{PRICE_NEEDED}: {best}")
        if unpriced and best in priced:
            flags.append("price needed for lower-ranked options: " + ", ".join(unpriced))
        if best not in pantry:
            missing.append({"id": best, "costNgn": round(cost[best], 2) if cost[best] is not None else None})
        for side in dish.get("side_items", []):
            ing = data["sides"].get(side["id"]) or data["ingredients"].get(side["id"])
            p = _price(side["id"], ing, user_prices)[0] if ing is not None else None
            if p is None:
                flags.append(f"{PRICE_NEEDED}: {side['id']}")
                total_cost = None
                if side["id"] not in pantry:
                    missing.append({"id": side["id"], "costNgn": None})
                continue
            c = cost_ngn(side["as_sold_g_per_serving"] * servings, p)
            if total_cost is not None:
                total_cost += c
            if side["id"] not in pantry:
                missing.append({"id": side["id"], "costNgn": round(c, 2)})
        missing_cost = sum(m["costNgn"] for m in missing if m["costNgn"] is not None)
        if missing_cost > budget:
            excluded.append({"id": dish["id"], "reason": f"over budget (need {round(missing_cost)} NGN to buy)"})
            continue
        if any(m["costNgn"] is None for m in missing):
            flags.append("budget check leaves out items with no price")
        if not_enough:
            flags.append("not enough data: " + ", ".join(n["id"] for n in not_enough))
        flags.append("cost excludes oil and spices")

        suggestions.append({
            "dishId": dish["id"],
            "name": dish["name"],
            "protein": item(best),
            "ranked": [item(c) for c in order],
            "missingItems": missing,
            "totalCostNgn": round(total_cost, 2) if total_cost is not None else None,
            "proteinPerPlateG": round(target, 1),
            "notEnoughData": not_enough,
            "flags": flags,
        })

    suggestions.sort(key=lambda s: (s["protein"]["score"] is None,
                                    -(s["protein"]["score"] if s["protein"]["score"] is not None else s["protein"]["fit"])))
    return {"dishes": suggestions, "excluded": excluded, "bundleVersion": data.get("version", "dev")}
