// rankIngredients. Port of backend/reference/rank.py. Pure.
import { DEFAULT_FORM, DRIVER_TEXT, MONEY_DP, SCORE_DP } from "./config";
import { cmpTuple, pyRound } from "./num";
import { asSoldG, costNgn, Driver, fitScores, overallScores } from "./scoring";
import { Bundle, Excluded, PlanInput, PropertyRow, RankedItem, RankedResult } from "./types";

export const NO_FUNCTIONAL_DATA = "no functional data for this dish";
export const PRICE_NEEDED = "price needed";

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

export function rankIngredients(applicationId: string, input: PlanInput, bundle: Bundle, candidateIds?: string[] | null): RankedResult {
  const version = bundle.version;
  const app = bundle.applications[applicationId];
  if (!app) return { items: [], excluded: [{ id: applicationId, reason: "unknown application" }], bundleVersion: version };

  const ids = candidateIds ?? bundle.ingredientOrder;
  const allergens = new Set(input.allergens);
  const totalProteinG = input.targetProteinG * input.servings;

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
  for (const cid of cands) {
    if (fits[cid].fit === null) excluded.push({ id: cid, reason: NO_FUNCTIONAL_DATA });
    else ranked.push(cid);
  }

  const ing = bundle.ingredients;
  const sold: Record<string, number> = {};
  for (const c of ranked) sold[c] = asSoldG(totalProteinG, ing[c].protein_g_per_100g as number);
  const priced = ranked.filter((c) => ing[c].price_ngn_per_kg !== null);
  const cost: Record<string, number> = {};
  const perG: Record<string, number> = {};
  const fitP: Record<string, number> = {};
  const dens: Record<string, number> = {};
  for (const c of priced) {
    cost[c] = costNgn(sold[c], ing[c].price_ngn_per_kg as number);
    perG[c] = cost[c] / totalProteinG;
    fitP[c] = fits[c].fit as number;
    dens[c] = ing[c].protein_g_per_100g as number;
  }
  const scores = priced.length ? overallScores(fitP, perG, dens) : {};

  const needProps = app.needs.map((n) => n.property);
  const items: RankedItem[] = ranked.map((c) => {
    const f = fits[c];
    const flags = f.missingNeeds.map((p) => `no data: ${p}`);
    const isPriced = c in scores;
    if (!isPriced) flags.push(PRICE_NEEDED);
    const range = f.fitRange as [number, number];
    return {
      ingredientId: c,
      score: isPriced ? pyRound(scores[c].score, SCORE_DP) : null,
      fit: pyRound(f.fit as number, SCORE_DP),
      fitRange: [pyRound(range[0], SCORE_DP), pyRound(range[1], SCORE_DP)],
      costNgn: isPriced ? pyRound(cost[c], MONEY_DP) : null,
      costPerGProtein: isPriced ? pyRound(perG[c], 4) : null,
      asSoldG: pyRound(sold[c], 1),
      drivers: isPriced ? driverText(scores[c].drivers) : [],
      flags,
      quality: {
        composition: ing[c].quality,
        price: isPriced ? `published (${ing[c].price_month || "month not stated"})` : "missing",
        functional: functionalQuality(bundle.properties, c, needProps),
        weights: "estimated",
      },
    };
  });

  items.sort((a, b) =>
    cmpTuple([a.score === null ? 1 : 0, -(a.score ?? 0), -a.fit, a.ingredientId], [b.score === null ? 1 : 0, -(b.score ?? 0), -b.fit, b.ingredientId]),
  );
  return { items, excluded, bundleVersion: version };
}
