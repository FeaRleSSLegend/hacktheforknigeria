// recommendProcessing. Port of backend/reference/processing.py. Pure.
// "fallback" = published results only (never predictions). "model" only when the crop has no
// same-crop published evidence for the goal and a shipped pooled table (C3) covers it; the
// pooled value names its crops and is never shown next to same-crop rows.
import {
  DEFAULT_DIRECTION, Direction, FALLBACK_MAX_OTHER_CROP, FALLBACK_MAX_SAME_CROP, HEAT_STEPS,
  METRIC_ALIASES, MODEL_TOP_K, STEP_INSTRUCTIONS, STEP_KEYWORDS,
} from "./config";
import { cmpStr, cmpTuple, median, pyG, pyRound, signedFixed } from "./num";
import { Bundle, ModelEntry, ProcessingOption, ProcessingResult, TreatmentRow } from "./types";

export const FALLBACK_NOTE = "No prediction available. These are published results from the cited papers, not predictions.";
export const NO_DATA_NOTE = "No published data for this plant.";
export const MODEL_NOTE = "Estimated from published experiments on the crops named, inside their published range. Not measured on this crop.";

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
    const cumulative = rs.some((r) => r.cumulative_from_raw === true || (r.method_note || "").toLowerCase().includes("cumulative"));
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

function modelLabel(spec: ModelEntry, crops: string[]): string {
  const pooled = crops.join(", ");
  return spec.ships_only_with_different_crop_rows
    ? `estimated from other legumes (pooled from ${pooled})`
    : `predicted, pooled from ${pooled}`;
}

function rangeText(name: string, rng: [number, number] | null | undefined, unit: string): string | null {
  if (!rng) return null;
  const [lo, hi] = rng;
  return lo === hi ? `${name} ${pyG(lo)} ${unit}` : `${name} ${pyG(lo)} to ${pyG(hi)} ${unit}`;
}

function modelOptions(
  ingredientId: string, goal: string, spec: ModelEntry, rows: TreatmentRow[], d: Direction | undefined,
  group: string | null, groups: Map<string, string>,
): ProcessingOption[] {
  if (!(spec.key ?? "").startsWith("treatment|")) return [];
  const change = new Map<string, number | null>(rows.map((r) => [r.exp_id, r.change_pct]));
  const entries = spec.entries ?? {};
  const opts: { o: ProcessingOption; key: number }[] = [];
  for (const k of Object.keys(entries).sort(cmpStr)) {
    const i = k.indexOf("|");
    const treatment = i === -1 ? k : k.slice(0, i);
    const metric = i === -1 ? "" : k.slice(i + 1);
    if (metric !== goal) continue;
    const e = entries[k];
    if (!group || e.crops.some((c) => groups.get(c) !== group)) continue;
    const cited = e.citations.map((x) => change.get(x)).filter((v): v is number => v !== undefined && v !== null);
    const effectRange: [number, number] = cited.length
      ? [pyRound(Math.min(...cited), 1), pyRound(Math.max(...cited), 1)]
      : [pyRound(e.value, 1), pyRound(e.value, 1)];
    const crops = [...e.crops];
    let evidence = `${modelLabel(spec, crops)}; not measured on ${ingredientId}; ${rowsText(e.n_rows)}; `
      + `range is the published rows; the estimate is pulled toward the average over all treatments for ${goal}, so it can sit outside that range`;
    if (e.cumulative_from_raw) evidence += "; includes cumulative stages from raw seed";
    const conditions = [rangeText("time", e.time_h, "h"), rangeText("temperature", e.temp_c, "C")].filter((x): x is string => !!x).join("; ");
    opts.push({
      key: effectKey(d, e.value),
      o: {
        kind: "model",
        cropId: ingredientId,
        pooledFrom: crops,
        treatment,
        timeH: null,
        tempC: null,
        instruction: instructionFor(treatment),
        conditions: conditions ? `published range in the pooled rows: ${conditions}` : null,
        effect: `Estimated change: ${signedFixed(e.value, 1)}% (pooled from ${crops.join(", ")})`,
        effectRange,
        nRows: e.n_rows,
        sources: [...e.papers],
        evidence,
      },
    });
  }
  opts.sort((a, b) => cmpTuple([a.key, a.o.treatment], [b.key, b.o.treatment]));
  return opts.slice(0, MODEL_TOP_K).map((x) => x.o);
}

export function recommendProcessing(ingredientId: string, goalIn: string, bundle: Bundle, dir?: Direction | null): ProcessingResult {
  const goal = canonicalMetric(goalIn);
  const d = direction(goal, dir);
  const rows = bundle.treatments.filter((r) => canonicalMetric(r.outcome_metric) === goal && r.change_pct !== null);
  const playbook = playbookOptions(ingredientId, goal, bundle, d);
  const same = rowGroups(rows.filter((r) => r.crop_id === ingredientId), ingredientId, d).slice(0, FALLBACK_MAX_SAME_CROP);
  const group = bundle.ingredients[ingredientId]?.crop_group || null;
  const groups = new Map<string, string>();
  for (const r of bundle.treatments) groups.set(r.crop_id, r.crop_group);
  const other = same.length < FALLBACK_MAX_SAME_CROP && group
    ? rowGroups(rows.filter((r) => r.crop_id !== ingredientId && r.crop_group === group), ingredientId, d).slice(0, FALLBACK_MAX_OTHER_CROP)
    : [];

  const spec = bundle.model.models?.[goal];
  if (spec && !playbook.length && !same.length) {
    const opts = modelOptions(ingredientId, goal, spec, rows, d, group, groups);
    if (opts.length) {
      let note = `No published rows for ${ingredientId}. ${MODEL_NOTE}`;
      if (other.length) note += " Rows from other crops are labelled.";
      return { mode: "model", ingredientId, goal, options: [...opts, ...other], note };
    }
  }

  const options = [...playbook, ...same, ...other];
  let note = FALLBACK_NOTE;
  if (other.length) note += ` Few published rows for ${ingredientId}; rows from other crops are labelled.`;
  if (!options.length) note = NO_DATA_NOTE;
  return { mode: "fallback", ingredientId, goal, options, note };
}
