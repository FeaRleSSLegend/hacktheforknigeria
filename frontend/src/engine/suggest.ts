// suggestDishes. Port of backend/reference/suggest.py. Pure.
import { MONEY_DP } from "./config";
import { cmpTuple, pyRound, pyRoundInt, sum } from "./num";
import { NO_FUNCTIONAL_DATA, PRICE_NEEDED, priceOf, rankIngredients, userPrices } from "./rank";
import { costNgn } from "./scoring";
import { Bundle, DishSuggestion, Excluded, PlanInput, SuggestResult } from "./types";

export const COST_NOTE = "cost excludes oil and spices";
export const COST_LABEL = "protein ingredient only, no oil or spices";

export function suggestDishes(input: PlanInput, bundle: Bundle): SuggestResult {
  const mode = input.mode ?? "pantry";
  const pantry = new Set(input.pantryIds);
  const { servings, budgetNgn: budget } = input;
  const prices = userPrices(input);

  const dishes = mode === "dish" ? bundle.dishes.filter((d) => d.id === input.dishId) : bundle.dishes;
  const suggestions: DishSuggestion[] = [];
  const excluded: Excluded[] = [];

  for (const dish of dishes) {
    if (!(dish.application_id in bundle.applications)) {
      excluded.push({ id: dish.id, reason: "unknown application" });
      continue;
    }
    const dry = dish.typical_dry_g_per_serving;
    const ranked = rankIngredients(dish.application_id, input, bundle, dish.protein_slot_ids, dry);
    const why = new Map<string, string>();
    for (const e of ranked.excluded) if (e.reason !== NO_FUNCTIONAL_DATA) why.set(e.id, e.reason);
    for (const cid of dish.protein_slot_ids) {
      const ing = bundle.ingredients[cid];
      if (!why.has(cid) && ing && priceOf(cid, ing, prices)[0] === null) why.set(cid, PRICE_NEEDED);
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
    let totalPP = best.costPerPersonNgn as number;
    if (!pantry.has(best.ingredientId)) missing.push({ id: best.ingredientId, costNgn: best.costNgn as number });
    for (const side of dish.side_items) {
      const ing = bundle.sides[side.id] ?? bundle.ingredients[side.id];
      const p = ing ? priceOf(side.id, ing, prices)[0] : null;
      if (p === null) {
        flags.push(`side ${side.id}: no price`);
        continue;
      }
      const c = pyRound(costNgn(side.as_sold_g_per_serving * servings, p), MONEY_DP);
      totalCost += c;
      totalPP += pyRound(costNgn(side.as_sold_g_per_serving, p), MONEY_DP);
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
      summaryLine: dish.summary_line,
      protein: best,
      alternatives: ranked.items.filter((i) => i !== best),
      missingItems: missing,
      dryGPerServing: dry,
      portionQuality: dish.typical_dry_g_quality,
      proteinPerPlateG: best.proteinPerPlateG,
      proteinTotalG: best.proteinTotalG,
      proteinCostPerPersonNgn: best.costPerPersonNgn,
      proteinCostNgn: best.costNgn,
      costLabel: COST_LABEL,
      totalCostPerPersonNgn: pyRound(totalPP, MONEY_DP),
      totalCostNgn: pyRound(totalCost, MONEY_DP),
      playbookIds: [...dish.playbook_ids],
      flags,
    });
  }
  suggestions.sort((a, b) => cmpTuple([-(a.protein.score as number), a.dishId], [-(b.protein.score as number), b.dishId]));
  return { dishes: suggestions, excluded, bundleVersion: bundle.version };
}
