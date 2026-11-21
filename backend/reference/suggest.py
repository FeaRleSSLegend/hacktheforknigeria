"""suggestDishes: rank dishes for a pantry, budget and household size.

Input and output keys are camelCase so golden fixtures match the TypeScript engine.
Pure function: takes the loaded data dict, does no I/O.
"""
from .scoring import fit_scores, overall_scores
from .sizing import as_sold_g, cost_ngn


def _spendable(ing: dict) -> str | None:
    if ing.get("protein_g_per_100g") in (None, 0):
        return "missing protein value"
    if ing.get("price_ngn_per_kg") is None:
        return "missing price"
    return None


def suggest_dishes(inp: dict, data: dict) -> dict:
    mode = inp.get("mode", "pantry")
    pantry = set(inp.get("pantryIds", []))
    allergens = set(inp.get("allergens", []))
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
            elif (why := _spendable(ing)):
                reasons[cid] = why
            else:
                cands.append(cid)
        if not cands:
            excluded.append({"id": dish["id"], "reason": "no usable protein: " + "; ".join(f"{k} ({v})" for k, v in reasons.items())})
            continue

        fits = fit_scores(app, cands, data["properties"])
        usable = [c for c in cands if fits[c]["fit"] is not None]
        if not usable:
            excluded.append({"id": dish["id"], "reason": "no functional data for this dish"})
            continue

        sold = {c: as_sold_g(total_protein_g, data["ingredients"][c]["protein_g_per_100g"]) for c in usable}
        cost = {c: cost_ngn(sold[c], data["ingredients"][c]["price_ngn_per_kg"]) for c in usable}
        per_g = {c: cost[c] / total_protein_g for c in usable}
        dens = {c: data["ingredients"][c]["protein_g_per_100g"] for c in usable}
        scores = overall_scores({c: fits[c]["fit"] for c in usable}, per_g, dens)

        have = [c for c in usable if c in pantry]
        pool = have if (mode == "pantry" and have) else usable
        best = max(pool, key=lambda c: scores[c]["score"])

        missing, total_cost, flags = [], cost[best], []
        if best not in pantry:
            missing.append({"id": best, "costNgn": round(cost[best], 2)})
        for side in dish.get("side_items", []):
            ing = data["sides"].get(side["id"]) or data["ingredients"].get(side["id"])
            if ing is None or ing.get("price_ngn_per_kg") is None:
                flags.append(f"side {side['id']}: no price")
                continue
            c = cost_ngn(side["as_sold_g_per_serving"] * servings, ing["price_ngn_per_kg"])
            total_cost += c
            if side["id"] not in pantry:
                missing.append({"id": side["id"], "costNgn": round(c, 2)})
        missing_cost = sum(m["costNgn"] for m in missing)
        if missing_cost > budget:
            excluded.append({"id": dish["id"], "reason": f"over budget (need {round(missing_cost)} NGN to buy)"})
            continue
        if fits[best]["missingNeeds"]:
            flags.append("partial functional data: " + ", ".join(fits[best]["missingNeeds"]))
        flags.append("cost excludes oil and spices")

        suggestions.append({
            "dishId": dish["id"],
            "name": dish["name"],
            "protein": {
                "ingredientId": best,
                "score": scores[best]["score"],
                "fit": fits[best]["fit"],
                "fitRange": list(fits[best]["fitRange"]),
                "costNgn": round(cost[best], 2),
                "costPerGProtein": round(per_g[best], 4),
                "asSoldG": round(sold[best], 1),
                "drivers": scores[best]["drivers"],
            },
            "missingItems": missing,
            "totalCostNgn": round(total_cost, 2),
            "proteinPerPlateG": round(target, 1),
            "flags": flags,
        })

    suggestions.sort(key=lambda s: s["protein"]["score"], reverse=True)
    return {"dishes": suggestions, "excluded": excluded, "bundleVersion": data.get("version", "dev")}
