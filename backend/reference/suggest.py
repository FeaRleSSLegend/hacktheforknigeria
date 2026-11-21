"""suggestDishes: rank dishes for a pantry, budget and household size.

Input and output keys are camelCase so golden fixtures match the TypeScript engine.
Pure function: takes the loaded data dict, does no I/O.
"""
from .config import MONEY_DP
from .rank import PRICE_NEEDED, price_of, rank_ingredients, user_prices
from .sizing import cost_ngn

COST_NOTE = "cost excludes oil and spices"
COST_LABEL = "protein ingredient only, no oil or spices"


def suggest_dishes(inp: dict, data: dict) -> dict:
    mode = inp.get("mode", "pantry")
    pantry = set(inp.get("pantryIds", []))
    servings = inp["servings"]
    budget = inp["budgetNgn"]
    prices = user_prices(inp)

    dishes = data["dishes"]
    if mode == "dish":
        dishes = [d for d in dishes if d["id"] == inp.get("dishId")]

    suggestions, excluded = [], []
    for dish in dishes:
        if dish["application_id"] not in data["applications"]:
            excluded.append({"id": dish["id"], "reason": "unknown application"})
            continue

        dry = dish["typical_dry_g_per_serving"]
        ranked = rank_ingredients(dish["application_id"], inp, data, dish["protein_slot_ids"], dry)
        priced = [i for i in ranked["items"] if i["score"] is not None]
        if not priced:
            why = {e["id"]: e["reason"] for e in ranked["excluded"]}
            why.update({i["ingredientId"]: PRICE_NEEDED for i in ranked["items"]})
            excluded.append({"id": dish["id"], "reason": "no usable protein: " + "; ".join(
                f"{k} ({why[k]})" for k in dish["protein_slot_ids"] if k in why)})
            continue

        owned = [i for i in priced if i["ingredientId"] in pantry]
        best = (owned if (mode == "pantry" and owned) else priced)[0]

        missing, total_cost, total_pp, flags = [], best["costNgn"], best["costPerPersonNgn"], []
        if best["ingredientId"] not in pantry:
            missing.append({"id": best["ingredientId"], "costNgn": best["costNgn"]})
        for side in dish.get("side_items", []):
            ing = data["sides"].get(side["id"]) or data["ingredients"].get(side["id"])
            p = price_of(side["id"], ing, prices)[0] if ing is not None else None
            if p is None:
                flags.append(f"side {side['id']}: no price")
                continue
            c = round(cost_ngn(side["as_sold_g_per_serving"] * servings, p), MONEY_DP)
            total_cost += c
            total_pp += round(cost_ngn(side["as_sold_g_per_serving"], p), MONEY_DP)
            if side["id"] not in pantry:
                missing.append({"id": side["id"], "costNgn": c})
        missing_cost = sum(m["costNgn"] for m in missing)
        if missing_cost > budget:
            excluded.append({"id": dish["id"], "reason": f"over budget (need {round(missing_cost)} NGN to buy)"})
            continue

        if ranked["notEnoughData"]:
            flags.append("not enough data: " + ", ".join(n["id"] for n in ranked["notEnoughData"]))
        unpriced = [i["ingredientId"] for i in ranked["items"] if i["score"] is None]
        if unpriced:
            flags.append("price needed: " + ", ".join(unpriced))
        flags.append(COST_NOTE)

        suggestions.append({
            "dishId": dish["id"],
            "name": dish["name"],
            "summaryLine": dish["summary_line"],
            "protein": best,
            "alternatives": [i for i in ranked["items"] if i is not best],
            "missingItems": missing,
            "notEnoughData": ranked["notEnoughData"],
            "dryGPerServing": dry,
            "portionQuality": dish["typical_dry_g_quality"],
            "proteinPerPlateG": best["proteinPerPlateG"],
            "proteinTotalG": best["proteinTotalG"],
            "proteinCostPerPersonNgn": best["costPerPersonNgn"],
            "proteinCostNgn": best["costNgn"],
            "costLabel": COST_LABEL,
            "totalCostPerPersonNgn": round(total_pp, MONEY_DP),
            "totalCostNgn": round(total_cost, MONEY_DP),
            "playbookIds": list(dish.get("playbook_ids", [])),
            "flags": flags,
        })

    suggestions.sort(key=lambda s: (-s["protein"]["score"], s["dishId"]))
    return {"dishes": suggestions, "excluded": excluded, "bundleVersion": data.get("version", "dev")}
