// rankIngredients. Port of backend/reference/rank.py. Pure.
import { DEFAULT_FORM, DRIVER_TEXT, MONEY_DP, SCORE_DP } from "./config";
import { cmpTuple, pyRound } from "./num";
import { asSoldG, costNgn, Driver, fitScores, overallScores } from "./scoring";
import { Bundle, CompositionRow, Excluded, NotEnoughData, PlanInput, PropertyRow, RankedItem, RankedResult } from "./types";

export const NOT_ENOUGH_DATA = "not enough data";
export const PRICE_NEEDED = "price needed";

export function userPrices(input: PlanInput): Record<string, number> {
  const prices = input.userPricesNgnPerKg ?? {};
  for (const [k, v] of Object.entries(prices)) {
    if (typeof v !== "number" || !(v > 0)) throw new Error(`userPricesNgnPerKg[${k}] must be a positive number`);
  }
  return prices;
}

/** [price per kg, "user" | "bundled" | null]. */
export function priceOf(id: string, record: CompositionRow, prices: Record<string, number>): [number | null, "user" | "bundled" | null] {
  if (id in prices) return [prices[id], "user"];
  if (record.price_ngn_per_kg !== null) return [record.price_ngn_per_kg, "bundled"];
  return [null, null];
}

function driverText(drivers: Driver[]): string[] {
  return drivers
    .filter((d) => Math.abs(d.contribution) > 1e-9)
    .map((d) => (d.contribution > 0 ? DRIVER_TEXT[d.name].up : DRIVER_TEXT[d.name].down));
}

function functionalQuality(rows: PropertyRow[], cid: string, needs: string[]): string {
  const qs = new Set<string>();
  for (const r of rows) {
    if (r.ingredient_id === cid && needs.includes(r.property) && r.form === DEFAULT_FORM) qs.add(r.quality);
  }
  return qs.size ? [...qs].sort().join("+") : "missing";
}

export function rankIngredients(
  applicationId: string, input: PlanInput, bundle: Bundle, candidateIds?: string[] | null, dryGPerServing?: number | null,
): RankedResult {
  const version = bundle.version;
  const app = bundle.applications[applicationId];
  if (!app) return { items: [], excluded: [{ id: applicationId, reason: "unknown application" }], notEnoughData: [], bundleVersion: version };

  const ids = candidateIds ?? bundle.ingredientOrder;
  const allergens = new Set(input.allergens);
  const prices = userPrices(input);
  const servings = input.servings;

  const excluded: Excluded[] = [];
  const cands: string[] = [];
  for (const cid of ids) {
    const ing = bundle.ingredients[cid];
    const hit = ing ? [...new Set(ing.allergen_tags)].filter((t) => allergens.has(t)).sort() : [];
    if (!ing) excluded.push({ id: cid, reason: "not in ingredients table" });
    else if (hit.length) excluded.push({ id: cid, reason: "allergen: " + hit.join(", ") });
    else if (!ing.protein_g_per_100g) excluded.push({ id: cid, reason: "missing protein value" });
    else cands.push(cid);
  }

  const fits = cands.length ? fitScores(app, cands, bundle.properties) : {};
  const ranked: string[] = [];
  const notEnoughData: NotEnoughData[] = [];
  for (const cid of cands) {
    if (fits[cid].ranked) {
      ranked.push(cid);
    } else {
      const missing = fits[cid].missingNeeds;
      notEnoughData.push({ id: cid, missingNeeds: missing });
      excluded.push({ id: cid, reason: `${NOT_ENOUGH_DATA}: missing ${missing.join(", ")}` });
    }
  }

  const ing = bundle.ingredients;
  const perPerson: Record<string, number> = {};
  const plate: Record<string, number> = {};
  const sold: Record<string, number> = {};
  const price: Record<string, [number | null, "user" | "bundled" | null]> = {};
  for (const c of ranked) {
    const protein = ing[c].protein_g_per_100g as number;
    if (dryGPerServing !== undefined && dryGPerServing !== null) {
      perPerson[c] = dryGPerServing;
      plate[c] = (dryGPerServing * protein) / 100;
    } else {
      plate[c] = input.targetProteinG;
      perPerson[c] = asSoldG(plate[c], protein);
    }
    sold[c] = perPerson[c] * servings;
    price[c] = priceOf(c, ing[c], prices);
  }
  const priced = ranked.filter((c) => price[c][0] !== null);
  const cost: Record<string, number> = {};
  const costPP: Record<string, number> = {};
  const perG: Record<string, number> = {};
  const fitP: Record<string, number> = {};
  const dens: Record<string, number> = {};
  for (const c of priced) {
    cost[c] = costNgn(sold[c], price[c][0] as number);
    costPP[c] = costNgn(perPerson[c], price[c][0] as number);
    perG[c] = cost[c] / (plate[c] * servings);
    fitP[c] = fits[c].fit as number;
    dens[c] = ing[c].protein_g_per_100g as number;
  }
  const scores = priced.length ? overallScores(fitP, perG, dens) : {};

  const needProps = app.needs.map((n) => n.property);
  const items: RankedItem[] = ranked.map((c) => {
    const f = fits[c];
    const flags: string[] = [];
    const isPriced = c in scores;
    if (!isPriced) flags.push(PRICE_NEEDED);
    const range = f.fitRange as [number, number];
    return {
      ingredientId: c,
      score: isPriced ? pyRound(scores[c].score, SCORE_DP) : null,
      fit: pyRound(f.fit as number, SCORE_DP),
      fitRange: [pyRound(range[0], SCORE_DP), pyRound(range[1], SCORE_DP)],
      costNgn: isPriced ? pyRound(cost[c], MONEY_DP) : null,
      costPerPersonNgn: isPriced ? pyRound(costPP[c], MONEY_DP) : null,
      costPerGProtein: isPriced ? pyRound(perG[c], 4) : null,
      asSoldG: pyRound(sold[c], 1),
      proteinPerPlateG: pyRound(plate[c], 1),
      proteinTotalG: pyRound(plate[c] * servings, 1),
      priceSource: price[c][1],
      drivers: isPriced ? driverText(scores[c].drivers) : [],
      flags,
      quality: {
        composition: ing[c].quality,
        price: price[c][1] === "user" ? "entered by you" : isPriced ? `published (${ing[c].price_month || "month not stated"})` : "missing",
        functional: functionalQuality(bundle.properties, c, needProps),
        weights: "estimated",
      },
    };
  });

  items.sort((a, b) =>
    cmpTuple([a.score === null ? 1 : 0, -(a.score ?? 0), -a.fit, a.ingredientId], [b.score === null ? 1 : 0, -(b.score ?? 0), -b.fit, b.ingredientId]),
  );
  return { items, excluded, notEnoughData, bundleVersion: version };
}
