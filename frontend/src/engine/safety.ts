// safetyGuard. Port of backend/reference/safety.py. Pure. Rules come only from the bundle.
import { HEAT_STEPS } from "./config";
import { treatmentSteps } from "./processing";
import { Bundle, GuardResult, PlateResult, ProcessingOption, ProcessingResult, SafetyCtx, SafetyRule } from "./types";

export const UNHEATED = "legume_processing_without_heat";
export const UNREVIEWED_LABEL = " (safety rule not yet reviewed by an expert)";
const HEAT = new Set<string>(HEAT_STEPS);

function label(rule: SafetyRule): string {
  return rule.reviewed ? "" : UNREVIEWED_LABEL;
}

function optionTags(o: ProcessingOption): { tags: Set<string>; heated: boolean } {
  const steps = treatmentSteps(o.treatment || "");
  const tags = new Set<string>([...steps, o.treatment || ""]);
  if (steps.some((s) => s === "milling" || s === "wet_milling")) {
    tags.add("milling");
    tags.add("flour");
  }
  const heated = steps.some((s) => HEAT.has(s));
  if (!heated) tags.add(UNHEATED);
  return { tags, heated };
}

function matches(rule: SafetyRule, tags: Set<string>, heated: boolean): boolean {
  if (rule.applies_to.includes(UNHEATED) && heated) return false;
  return rule.applies_to.some((t) => tags.has(t));
}

function add(list: string[], msg: string) {
  if (!list.includes(msg)) list.push(msg);
}

export function safetyGuard<T extends ProcessingResult | PlateResult>(result: T, ctx: SafetyCtx, bundle: Bundle): GuardResult<T> {
  const rules = bundle.safetyRules;
  const ids = [...new Set([result.ingredientId, ctx.ingredientId, ...(ctx.ingredientIds ?? [])].filter((i): i is string => !!i))];
  const warnings: string[] = [];
  const blocked: string[] = [];

  const userAllergens = new Set(ctx.allergens ?? []);
  for (const iid of ids) {
    const ing = bundle.ingredients[iid] ?? bundle.sides[iid];
    const hit = [...new Set(ing?.allergen_tags ?? [])].filter((t) => userAllergens.has(t)).sort();
    if (hit.length) add(blocked, `${iid}: matches your allergen list (${hit.join(", ")}).`);
  }
  for (const rule of rules) {
    if (rule.applies_to.some((t) => ids.includes(t))) {
      add(rule.severity === "block" ? blocked : warnings, rule.text + label(rule));
    }
  }
  if (blocked.length) return { allowed: false, warnings, blocked, result: null };
  if (!("options" in result)) return { allowed: true, warnings, blocked, result };

  const kept: ProcessingOption[] = [];
  for (const opt of result.options) {
    const { tags, heated } = optionTags(opt);
    let withheld = false;
    for (const rule of rules) {
      if (!matches(rule, tags, heated)) continue;
      if (rule.severity === "block") {
        withheld = true;
        add(blocked, `Withheld "${opt.instruction}": ${rule.text}${label(rule)}`);
      } else {
        add(warnings, rule.text + label(rule));
      }
    }
    if (!withheld) kept.push(opt);
  }
  const allowed = kept.length > 0 || result.options.length === 0;
  return { allowed, warnings, blocked, result: allowed ? ({ ...result, options: kept } as T) : null };
}
