"""dishesForPlant: every dish where the plant is a candidate, ranked with the complete-coverage rule.

Pure function. For each dish the plant is ranked against the dish's other candidates by
rank_ingredients (sized to the dish portion). A plant missing a need of the dish is listed in
notEnoughData; one left out (for example an allergen) is listed in excluded.
"""
from .rank import rank_ingredients


def dishes_for_plant(plant_id: str, inp: dict, data: dict) -> dict:
    dishes, not_enough, excluded = [], [], []
    for dish in data["dishes"]:
        if plant_id not in dish["protein_slot_ids"] or dish["application_id"] not in data["applications"]:
            continue
        r = rank_ingredients(dish["application_id"], inp, data, dish["protein_slot_ids"],
                             dish["typical_dry_g_per_serving"])
        pos = next((k for k, i in enumerate(r["items"]) if i["ingredientId"] == plant_id), None)
        if pos is not None:
            it = r["items"][pos]
            dishes.append({
                "dishId": dish["id"], "name": dish["name"], "summaryLine": dish["summary_line"],
                "rankInDish": pos + 1, "candidatesRanked": len(r["items"]),
                "fit": it["fit"], "score": it["score"],
                "dryGPerServing": dish["typical_dry_g_per_serving"],
                "proteinPerPlateG": it["proteinPerPlateG"],
                "proteinCostPerPersonNgn": it["costPerPersonNgn"], "proteinCostNgn": it["costNgn"],
                "priceSource": it["priceSource"],
            })
            continue
        gap = next((n for n in r["notEnoughData"] if n["id"] == plant_id), None)
        if gap is not None:
            not_enough.append({"dishId": dish["id"], "name": dish["name"], "missingNeeds": gap["missingNeeds"]})
            continue
        why = next((e["reason"] for e in r["excluded"] if e["id"] == plant_id), "not ranked")
        excluded.append({"dishId": dish["id"], "name": dish["name"], "reason": why})
    dishes.sort(key=lambda d: (d["rankInDish"], -d["fit"], d["dishId"]))
    return {"plantId": plant_id, "dishes": dishes, "notEnoughData": not_enough, "excluded": excluded,
            "bundleVersion": data.get("version", "dev")}
