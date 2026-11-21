// dishesForPlant: every dish where the plant is a candidate, ranked with the complete-coverage rule.
// Pure. Mirrors backend/reference/plant.py; golden fixtures are the contract.
import { cmpTuple } from "./num";
import { rankIngredients } from "./rank";
import { Bundle, PlanInput } from "./types";

export interface PlantDish {
  dishId: string;
  name: string;
  summaryLine: string;
  rankInDish: number;
  candidatesRanked: number;
  fit: number;
  score: number | null;
  dryGPerServing: number;
  proteinPerPlateG: number;
  proteinCostPerPersonNgn: number | null;
  proteinCostNgn: number | null;
  priceSource: "user" | "bundled" | null;
}

export interface PlantDishes {
  plantId: string;
  dishes: PlantDish[];
  notEnoughData: { dishId: string; name: string; missingNeeds: string[] }[];
  excluded: { dishId: string; name: string; reason: string }[];
  bundleVersion: string;
}

export function dishesForPlant(plantId: string, input: PlanInput, bundle: Bundle): PlantDishes {
  const dishes: PlantDish[] = [];
  const notEnoughData: PlantDishes["notEnoughData"] = [];
  const excluded: PlantDishes["excluded"] = [];
  for (const dish of bundle.dishes) {
    if (!dish.protein_slot_ids.includes(plantId) || !(dish.application_id in bundle.applications)) continue;
    const r = rankIngredients(dish.application_id, input, bundle, dish.protein_slot_ids, dish.typical_dry_g_per_serving);
    const pos = r.items.findIndex((i) => i.ingredientId === plantId);
    if (pos >= 0) {
      const it = r.items[pos];
      dishes.push({
        dishId: dish.id,
        name: dish.name,
        summaryLine: dish.summary_line,
        rankInDish: pos + 1,
        candidatesRanked: r.items.length,
        fit: it.fit,
        score: it.score,
        dryGPerServing: dish.typical_dry_g_per_serving,
        proteinPerPlateG: it.proteinPerPlateG,
        proteinCostPerPersonNgn: it.costPerPersonNgn,
        proteinCostNgn: it.costNgn,
        priceSource: it.priceSource,
      });
      continue;
    }
    const gap = r.notEnoughData.find((n) => n.id === plantId);
    if (gap) {
      notEnoughData.push({ dishId: dish.id, name: dish.name, missingNeeds: gap.missingNeeds });
      continue;
    }
    excluded.push({ dishId: dish.id, name: dish.name, reason: r.excluded.find((e) => e.id === plantId)?.reason ?? "not ranked" });
  }
  dishes.sort((a, b) => cmpTuple([a.rankInDish, -a.fit, a.dishId], [b.rankInDish, -b.fit, b.dishId]));
  return { plantId, dishes, notEnoughData, excluded, bundleVersion: bundle.version };
}
