"""suggestDishes: rank dishes for a pantry, budget and household size.

Input and output keys are camelCase so golden fixtures match the TypeScript engine.
Pure function: takes the loaded data dict, does no I/O.
"""
from .config import MONEY_DP
from .rank import NO_FUNCTIONAL_DATA, PRICE_NEEDED, rank_ingredients
from .sizing import cost_ngn

COST_NOTE = "cost excludes oil and spices"


def suggest_dishes(inp: dict, data: dict) -> dict:
    mode = inp.get("mode", "pantry")
    pantry = set(inp.get("pantryIds", []))
    servings = inp["servings"]
    target = inp["targetProteinG"]  # grams per person per meal
    budget = inp["budgetNgn"]

    dishes = data["dishes"]
    if mode == "dish":
        dishes = [d for d in dishes if d["id"] == inp.get("dishId")]

    suggestions, excluded = [], []
    for dish in dishes:
        if dish["application_id"] not in data["applications"]:
            excluded.append({"id": dish["id"], "reason": "unknown application"})
            continue

        ranked = rank_ingredients(dish["application_id"], inp, data, dish["protein_slot_ids"])
        why = {e["id"]: e["reason"] for e in ranked["excluded"] if e["reason"] != NO_FUNCTIONAL_DATA}
        for cid in dish["protein_slot_ids"]:
            ing = data["ingredients"].get(cid)
            if cid not in why and ing is not None and ing["price_ngn_per_kg"] is None:
                why[cid] = PRICE_NEEDED
        if len(why) == len(dish["protein_slot_ids"]):
            excluded.append({"id": dish["id"], "reason": "no usable protein: " + "; ".join(f"{k} ({v})" for k, v in why.items())})
            continue

        priced = [i for i in ranked["items"] if i["score"] is not None]
        if not priced:
            excluded.append({"id": dish["id"], "reason": NO_FUNCTIONAL_DATA})
            continue

        owned = [i for i in priced if i["ingredientId"] in pantry]
        best = (owned if (mode == "pantry" and owned) else priced)[0]

        missing, total_cost, flags = [], best["costNgn"], []
        if best["ingredientId"] not in pantry:
            missing.append({"id": best["ingredientId"], "costNgn": best["costNgn"]})
        for side in dish.get("side_items", []):
            ing = data["sides"].get(side["id"]) or data["ingredients"].get(side["id"])
            if ing is None or ing.get("price_ngn_per_kg") is None:
                flags.append(f"side {side['id']}: no price")
                continue
            c = round(cost_ngn(side["as_sold_g_per_serving"] * servings, ing["price_ngn_per_kg"]), MONEY_DP)
            total_cost += c
            if side["id"] not in pantry:
                missing.append({"id": side["id"], "costNgn": c})
        missing_cost = sum(m["costNgn"] for m in missing)
        if missing_cost > budget:
            excluded.append({"id": dish["id"], "reason": f"over budget (need {round(missing_cost)} NGN to buy)"})
            continue

        no_data = [f.removeprefix("no data: ") for f in best["flags"] if f.startswith("no data: ")]
        if no_data:
            flags.append("partial functional data: " + ", ".join(no_data))
        unpriced = [i["ingredientId"] for i in ranked["items"] if i["score"] is None]
        if unpriced:
            flags.append("price needed: " + ", ".join(unpriced))
        flags.append(COST_NOTE)

        suggestions.append({
            "dishId": dish["id"],
            "name": dish["name"],
            "protein": best,
            "alternatives": [i for i in ranked["items"] if i is not best],
            "missingItems": missing,
            "totalCostNgn": round(total_cost, MONEY_DP),
            "proteinPerPlateG": round(target, 1),
            "playbookIds": list(dish.get("playbook_ids", [])),
            "flags": flags,
        })

    suggestions.sort(key=lambda s: (-s["protein"]["score"], s["dishId"]))
    return {"dishes": suggestions, "excluded": excluded, "bundleVersion": data.get("version", "dev")}
