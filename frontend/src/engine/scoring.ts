// Functional fit, overall score and drivers. Port of backend/reference/scoring.py and sizing.py.
import { DEFAULT_FORM, WEIGHTS, WEIGHT_KEYS, WeightKey } from "./config";
import { median, sum } from "./num";
import { Application, PropertyRow } from "./types";

export type Agg = [number, number, number, number]; // median, lo, hi, n

export function aggregateProperty(rows: PropertyRow[], ingredientId: string, prop: string, form = DEFAULT_FORM): Agg | null {
  const vals: number[] = [];
  for (const r of rows) {
    if (r.ingredient_id === ingredientId && r.property === prop && (r.form ?? form) === form && r.value !== null) {
      vals.push(r.value);
    }
  }
  if (vals.length === 0) return null;
  return [median(vals), Math.min(...vals), Math.max(...vals), vals.length];
}

function scale(v: number, vmin: number, vmax: number): number {
  if (vmax === vmin) return 0.5;
  return Math.min(1, Math.max(0, (v - vmin) / (vmax - vmin)));
}

export function scaleAcross(values: Record<string, number | null>, higherIsBetter = true): Record<string, number | null> {
  const present = Object.values(values).filter((v): v is number => v !== null);
  const out: Record<string, number | null> = {};
  if (present.length === 0) {
    for (const k of Object.keys(values)) out[k] = null;
    return out;
  }
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  for (const [k, v] of Object.entries(values)) {
    if (v === null) out[k] = null;
    else {
      const s = scale(v, lo, hi);
      out[k] = higherIsBetter ? s : 1 - s;
    }
  }
  return out;
}

export interface Fit {
  fit: number | null;
  fitRange: [number, number] | null;
  missingNeeds: string[];
}

export function fitScores(app: Application, candidateIds: string[], rows: PropertyRow[], form = DEFAULT_FORM): Record<string, Fit> {
  const perNeed = new Map<string, { aggs: Record<string, Agg | null>; lo: number | null; hi: number | null; higher: boolean; w: number }>();
  for (const need of app.needs) {
    const aggs: Record<string, Agg | null> = {};
    for (const cid of candidateIds) aggs[cid] = aggregateProperty(rows, cid, need.property, form);
    const present = candidateIds.map((c) => aggs[c]).filter((a): a is Agg => a !== null).map((a) => a[0]);
    perNeed.set(need.property, {
      aggs,
      lo: present.length ? Math.min(...present) : null,
      hi: present.length ? Math.max(...present) : null,
      higher: need.direction === "higher",
      w: need.weight,
    });
  }
  const result: Record<string, Fit> = {};
  for (const cid of candidateIds) {
    let num = 0;
    let numLo = 0;
    let numHi = 0;
    let wsum = 0;
    const missing: string[] = [];
    for (const [prop, { aggs, lo, hi, higher, w }] of perNeed) {
      const a = aggs[cid];
      if (a === null || lo === null || hi === null) {
        missing.push(prop);
        continue;
      }
      let d = scale(a[0], lo, hi);
      let dLo = scale(a[1], lo, hi);
      let dHi = scale(a[2], lo, hi);
      if (!higher) [d, dLo, dHi] = [1 - d, 1 - dHi, 1 - dLo];
      num += w * d;
      numLo += w * dLo;
      numHi += w * dHi;
      wsum += w;
    }
    result[cid] = wsum === 0
      ? { fit: null, fitRange: null, missingNeeds: missing }
      : { fit: num / wsum, fitRange: [numLo / wsum, numHi / wsum], missingNeeds: missing };
  }
  return result;
}

export interface Driver {
  name: WeightKey;
  contribution: number;
}

export function overallScores(
  fit: Record<string, number>,
  costPerG: Record<string, number>,
  density: Record<string, number>,
): Record<string, { score: number; drivers: Driver[] }> {
  const costS = scaleAcross(costPerG, false);
  const densS = scaleAcross(density, true);
  const ids = Object.keys(fit);
  const comps: Record<WeightKey, Record<string, number>> = { fit: {}, cost: {}, density: {} };
  for (const i of ids) {
    comps.fit[i] = fit[i];
    comps.cost[i] = costS[i] as number;
    comps.density[i] = densS[i] as number;
  }
  const means = {} as Record<WeightKey, number>;
  for (const k of WEIGHT_KEYS) means[k] = sum(ids.map((i) => comps[k][i])) / ids.length;
  const out: Record<string, { score: number; drivers: Driver[] }> = {};
  for (const i of ids) {
    const score = sum(WEIGHT_KEYS.map((k) => WEIGHTS[k] * comps[k][i]));
    const drivers = WEIGHT_KEYS.map((k) => ({ name: k, contribution: WEIGHTS[k] * (comps[k][i] - means[k]) }));
    drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    out[i] = { score, drivers: drivers.slice(0, 2) };
  }
  return out;
}

export function asSoldG(targetProteinG: number, proteinPer100g: number): number {
  return targetProteinG / (proteinPer100g / 100);
}

export function costNgn(soldG: number, pricePerKg: number): number {
  return (soldG / 1000) * pricePerKg;
}

export function targetProteinPerMeal(weightKg: number, gPerKg: number, mealsPerDay: number): number {
  return (gPerKg * weightKg) / mealsPerDay;
}
