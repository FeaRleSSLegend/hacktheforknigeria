// suggestDishes. Port of backend/reference/suggest.py. Pure.
import { MONEY_DP } from "./config";
import { cmpTuple, pyRound, pyRoundInt, sum } from "./num";
import { NO_FUNCTIONAL_DATA, PRICE_NEEDED, rankIngredients } from "./rank";
import { costNgn } from "./scoring";
import { Bundle, DishSuggestion, Excluded, PlanInput, SuggestResult } from "./types";

export const COST_NOTE = "cost excludes oil and spices";

export function suggestDishes(input: PlanInput, bundle: Bundle): SuggestResult {
  const mode = input.mode ?? "pantry";
  const pantry = new Set(input.pantryIds);
  const { servings, budgetNgn: budget } = input;
  const target = input.targetProteinG;

  const dishes = mode === "dish" ? bundle.dishes.filter((d) => d.id === input.dishId) : bundle.dishes;
  const suggestions: DishSuggestion[] = [];
  const excluded: Excluded[] = [];

  for (const dish of dishes) {
    if (!(dish.application_id in bundle.applications)) {
      excluded.push({ id: dish.id, reason: "unknown application" });
      continue;
    }
    const ranked = rankIngredients(dish.application_id, input, bundle, dish.protein_slot_ids);
    const why = new Map<string, string>();
    for (const e of ranked.excluded) if (e.reason !== NO_FUNCTIONAL_DATA) why.set(e.id, e.reason);
    for (const cid of dish.protein_slot_ids) {
      const ing = bundle.ingredients[cid];
      if (!why.has(cid) && ing && ing.price_ngn_per_kg === null) why.set(cid, PRICE_NEEDED);
    }
    if (why.size === dish.protein_slot_ids.length) {
      excluded.push({ id: dish.id, reason: "no usable protein: " + [...why].map(([k, v]) => `${k} (${v})`).join("; ") });
      continue;
    }
    const priced = ranked.items.filter((i) => i.score !== null);
    if (!priced.length) {
      excluded.push({ id: dish.id, reason: NO_FUNCTIONAL_DATA });
      continue;
    }
    const owned = priced.filter((i) => pantry.has(i.ingredientId));
    const best = (mode === "pantry" && owned.length ? owned : priced)[0];

    const missing: { id: string; costNgn: number }[] = [];
    const flags: string[] = [];
    let totalCost = best.costNgn as number;
    if (!pantry.has(best.ingredientId)) missing.push({ id: best.ingredientId, costNgn: best.costNgn as number });
    for (const side of dish.side_items) {
      const ing = bundle.sides[side.id] ?? bundle.ingredients[side.id];
      if (!ing || ing.price_ngn_per_kg === null) {
        flags.push(`side ${side.id}: no price`);
        continue;
      }
      const c = pyRound(costNgn(side.as_sold_g_per_serving * servings, ing.price_ngn_per_kg), MONEY_DP);
      totalCost += c;
      if (!pantry.has(side.id)) missing.push({ id: side.id, costNgn: c });
    }
    const missingCost = sum(missing.map((m) => m.costNgn));
    if (missingCost > budget) {
      excluded.push({ id: dish.id, reason: `over budget (need ${pyRoundInt(missingCost)} NGN to buy)` });
      continue;
    }
    const noData = best.flags.filter((f) => f.startsWith("no data: ")).map((f) => f.slice("no data: ".length));
    if (noData.length) flags.push("partial functional data: " + noData.join(", "));
    const unpriced = ranked.items.filter((i) => i.score === null).map((i) => i.ingredientId);
    if (unpriced.length) flags.push("price needed: " + unpriced.join(", "));
    flags.push(COST_NOTE);

    suggestions.push({
      dishId: dish.id,
      name: dish.name,
      protein: best,
      alternatives: ranked.items.filter((i) => i !== best),
      missingItems: missing,
      totalCostNgn: pyRound(totalCost, MONEY_DP),
      proteinPerPlateG: pyRound(target, 1),
      playbookIds: [...dish.playbook_ids],
      flags,
    });
  }
  suggestions.sort((a, b) => cmpTuple([-(a.protein.score as number), a.dishId], [-(b.protein.score as number), b.dishId]));
  return { dishes: suggestions, excluded, bundleVersion: bundle.version };
}
