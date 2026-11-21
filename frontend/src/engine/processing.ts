// recommendProcessing. Port of backend/reference/processing.py. Pure.
// "fallback" = published results only (never predictions); "model" only for a shipped metric in the
// documented linear format, inside the observed range for that crop and treatment.
import {
  DEFAULT_DIRECTION, Direction, FALLBACK_MAX_OTHER_CROP, FALLBACK_MAX_SAME_CROP, HEAT_STEPS, INTERVAL_Z,
  METRIC_ALIASES, MODEL_GRID_STEPS, MODEL_TOP_K, STEP_INSTRUCTIONS, STEP_KEYWORDS,
} from "./config";
import { cmpStr, cmpTuple, median, pyRound, signedFixed } from "./num";
import { Bundle, ModelMetricSpec, ProcessingOption, ProcessingResult, TreatmentRow } from "./types";

export const FALLBACK_NOTE = "No prediction available. These are published results from the cited papers, not predictions.";

const KNOWN_STEPS = [...new Set([...Object.keys(STEP_INSTRUCTIONS), ...HEAT_STEPS])].sort((a, b) => b.length - a.length);

const rowsText = (n: number) => (n === 1 ? `${n} row` : `${n} rows`);

export function canonicalMetric(metric: string): string {
  return METRIC_ALIASES[metric] ?? metric;
}

export function treatmentSteps(treatment: string): string[] {
  let s = treatment;
  const out: string[] = [];
  while (s) {
    const k = KNOWN_STEPS.find((k) => s === k || s.startsWith(k + "_"));
    if (k) {
      out.push(k);
      s = s.slice(k.length + 1);
    } else {
      const i = s.indexOf("_");
      out.push(i === -1 ? s : s.slice(0, i));
      s = i === -1 ? "" : s.slice(i + 1);
    }
  }
  return out;
}

export function stepsFromText(steps: string[]): string[] {
  const text = steps.join(" ").toLowerCase();
  const claimed = new Set<number>();
  const found: [number, string][] = [];
  const keywords = STEP_KEYWORDS.map((kv, i) => ({ kv, i })).sort((a, b) => b.kv[0].length - a.kv[0].length || a.i - b.i);
  for (const { kv: [kw, step] } of keywords) {
    let start = text.indexOf(kw);
    while (start !== -1) {
      let free = true;
      for (let p = start; p < start + kw.length; p++) if (claimed.has(p)) free = false;
      if (free) {
        for (let p = start; p < start + kw.length; p++) claimed.add(p);
        found.push([start, step]);
      }
      start = text.indexOf(kw, start + 1);
    }
  }
  found.sort((a, b) => cmpTuple(a, b));
  const out: string[] = [];
  for (const [, step] of found) if (!out.length || out[out.length - 1] !== step) out.push(step);
  return out;
}

export function instructionFor(treatment: string): string {
  const parts = treatmentSteps(treatment).map((s) => STEP_INSTRUCTIONS[s] ?? s.replace(/_/g, " "));
  const text = parts.filter((p) => p).join(", then ");
  return text ? text[0].toUpperCase() + text.slice(1) + "." : "";
}

function direction(goal: string, d?: Direction | null): Direction | undefined {
  return d === "higher" || d === "lower" ? d : DEFAULT_DIRECTION[goal];
}

function effectKey(d: Direction | undefined, med: number): number {
  if (d === "lower") return med;
  if (d === "higher") return -med;
  return 0;
}

function playbookOptions(ingredientId: string, goal: string, bundle: Bundle, d: Direction | undefined): ProcessingOption[] {
  const opts: { o: ProcessingOption; med: number }[] = [];
  for (const pid of Object.keys(bundle.playbook).sort(cmpStr)) {
    const p = bundle.playbook[pid];
    const m = p.effect?.metrics?.[goal];
    if (p.crop_id !== ingredientId || !m) continue;
    opts.push({
      med: m.median_pct,
      o: {
        kind: "playbook",
        playbookId: pid,
        cropId: ingredientId,
        treatment: stepsFromText(p.steps).join("_"),
        timeH: null,
        tempC: null,
        instruction: p.steps.join(" "),
        conditions: p.conditions ?? null,
        effect: `Published change: ${signedFixed(m.median_pct, 1)}% (median of ${rowsText(m.n_rows)})`,
        effectRange: [m.min_pct, m.max_pct],
        nRows: m.n_rows,
        sources: [...p.sources],
        evidence: p.evidence_level,
      },
    });
  }
  opts.sort((a, b) => cmpTuple([effectKey(d, a.med), a.o.playbookId as string], [effectKey(d, b.med), b.o.playbookId as string]));
  return opts.map((x) => x.o);
}

function rowGroups(rows: TreatmentRow[], ingredientId: string, d: Direction | undefined): ProcessingOption[] {
  const groups = new Map<string, { key: [string, string, number | null, number | null]; rs: TreatmentRow[] }>();
  for (const r of rows) {
    const key: [string, string, number | null, number | null] = [r.crop_id, r.treatment, r.time_h, r.temp_c];
    const k = JSON.stringify(key);
    if (!groups.has(k)) groups.set(k, { key, rs: [] });
    groups.get(k)?.rs.push(r);
  }
  const summaries: { o: ProcessingOption; med: number }[] = [];
  for (const { key: [crop, treatment, t, c], rs } of groups.values()) {
    const changes = rs.map((r) => r.change_pct as number);
    const papers = [...new Set(rs.map((r) => r.paper_id))].sort(cmpStr);
    const med = pyRound(median(changes), 1);
    const cumulative = rs.some((r) => (r.method_note || "").toLowerCase().includes("cumulative"));
    const same = crop === ingredientId;
    let evidence = `published rows, ${same ? "same crop" : "other crop"}, ${rowsText(rs.length)}, ${papers.length} paper(s)`;
    if (cumulative) evidence += "; cumulative stages from raw seed, not the effect of this step alone";
    if (!same) evidence += `; measured on ${crop}, not ${ingredientId}: estimated for this crop`;
    summaries.push({
      med,
      o: {
        kind: same ? "published_same_crop" : "published_other_crop",
        cropId: crop,
        treatment,
        timeH: t,
        tempC: c,
        instruction: instructionFor(treatment),
        conditions: null,
        effect: `Published change${same ? "" : " in " + crop}: ${signedFixed(med, 1)}% (median of ${rowsText(rs.length)})`,
        effectRange: [pyRound(Math.min(...changes), 1), pyRound(Math.max(...changes), 1)],
        nRows: rs.length,
        sources: papers,
        evidence,
      },
    });
  }
  const sortKey = (g: { o: ProcessingOption; med: number }) => [
    effectKey(d, g.med), -(g.o.nRows as number), g.o.cropId, g.o.treatment, g.o.timeH ?? -1, g.o.tempC ?? -1,
  ];
  summaries.sort((a, b) => cmpTuple(sortKey(a), sortKey(b)));
  const seen = new Set<string>();
  const picked: ProcessingOption[] = [];
  for (const { o } of summaries) {
    const k = `${o.cropId}|${o.treatment}`;
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(o);
  }
  return picked;
}

function grid(lo: number, hi: number): number[] {
  if (hi <= lo) return [lo];
  const step = (hi - lo) / (MODEL_GRID_STEPS - 1);
  return Array.from({ length: MODEL_GRID_STEPS }, (_, i) => lo + i * step);
}

function modelOptions(ingredientId: string, spec: ModelMetricSpec, d: Direction | undefined): ProcessingOption[] {
  const { intercept, coef, residual_sd: sd, ranges } = spec;
  if (intercept === undefined || !coef || sd === undefined || !ranges) return [];
  let evidence = "small linear model, validated on unseen papers";
  if (spec.cv_mae !== undefined && spec.baseline_mae !== undefined) {
    evidence += ` (grouped CV MAE ${spec.cv_mae} vs baseline ${spec.baseline_mae})`;
  }
  const best: { o: ProcessingOption; key: number }[] = [];
  for (const key of Object.keys(ranges).sort(cmpStr)) {
    const i = key.indexOf("|");
    const crop = i === -1 ? key : key.slice(0, i);
    const treatment = i === -1 ? "" : key.slice(i + 1);
    if (crop !== ingredientId) continue;
    const rng = ranges[key];
    let top: [number, number, number, number] | null = null;
    for (const t of grid(rng.time_h[0], rng.time_h[1])) {
      for (const c of grid(rng.temp_c[0], rng.temp_c[1])) {
        const x: Record<string, number> = {
          [`crop=${crop}`]: 1, [`treatment=${treatment}`]: 1, time_h: t, temp_c: c, "time_h^2": t * t, "time_h*temp_c": t * c,
        };
        let pred = intercept;
        for (const [k, v] of Object.entries(x)) pred += (coef[k] ?? 0) * v;
        const cand: [number, number, number, number] = [effectKey(d, pred), t, c, pred];
        if (top === null || cmpTuple(cand, top) < 0) top = cand;
      }
    }
    if (!top) continue;
    const [k, t, c, pred] = top;
    best.push({
      key: k,
      o: {
        kind: "model",
        cropId: crop,
        treatment,
        timeH: pyRound(t, 2),
        tempC: pyRound(c, 1),
        instruction: instructionFor(treatment),
        conditions: "inside the published range for this crop and treatment",
        effect: `Predicted change: ${signedFixed(pred, 1)}%`,
        effectRange: [pyRound(pred - INTERVAL_Z * sd, 1), pyRound(pred + INTERVAL_Z * sd, 1)],
        nRows: null,
        sources: [...(spec.papers ?? [])],
        evidence,
      },
    });
  }
  best.sort((a, b) => cmpTuple([a.key, a.o.treatment], [b.key, b.o.treatment]));
  return best.slice(0, MODEL_TOP_K).map((b) => b.o);
}

export function recommendProcessing(ingredientId: string, goalIn: string, bundle: Bundle, dir?: Direction | null): ProcessingResult {
  const goal = canonicalMetric(goalIn);
  const d = direction(goal, dir);
  const spec = bundle.model.metrics?.[goal] ?? {};
  let notePrefix = "";
  if (spec.ships === true) {
    const opts = modelOptions(ingredientId, spec, d);
    if (opts.length) {
      return {
        mode: "model", ingredientId, goal, options: opts,
        note: "Predicted by a small model inside the published range. Ranges are 95% intervals from cross-validation.",
      };
    }
    notePrefix = "The model does not cover this crop inside its training range. ";
  }
  const rows = bundle.treatments.filter((r) => canonicalMetric(r.outcome_metric) === goal && r.change_pct !== null);
  const same = rowGroups(rows.filter((r) => r.crop_id === ingredientId), ingredientId, d).slice(0, FALLBACK_MAX_SAME_CROP);
  const other = same.length < FALLBACK_MAX_SAME_CROP
    ? rowGroups(rows.filter((r) => r.crop_id !== ingredientId), ingredientId, d).slice(0, FALLBACK_MAX_OTHER_CROP)
    : [];
  const options = [...playbookOptions(ingredientId, goal, bundle, d), ...same, ...other];
  let note = notePrefix + FALLBACK_NOTE;
  if (other.length) note += ` Few published rows for ${ingredientId}; rows from other crops are labelled.`;
  if (!options.length) note += ` No published rows for ${goal}.`;
  return { mode: "fallback", ingredientId, goal, options, note };
}
