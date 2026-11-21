// safetyGuard. Port of backend/reference/safety.py. Pure. Rules come only from the bundle.
import { HEAT_STEPS } from "./config";
import { treatmentSteps } from "./processing";
// Messages are each rule's user_text; review status is kept apart in `rules`.
import { AppliedRule, Bundle, GuardResult, PlateResult, ProcessingOption, ProcessingResult, SafetyCtx, SafetyRule } from "./types";

export const UNHEATED = "legume_processing_without_heat";
const HEAT = new Set<string>(HEAT_STEPS);

function note(applied: AppliedRule[], rule: SafetyRule) {
  if (!applied.some((a) => a.id === rule.id)) applied.push({ id: rule.id, severity: rule.severity, reviewed: !!rule.reviewed });
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
  const applied: AppliedRule[] = [];

  const userAllergens = new Set(ctx.allergens ?? []);
  for (const iid of ids) {
    const ing = bundle.ingredients[iid] ?? bundle.sides[iid];
    const hit = [...new Set(ing?.allergen_tags ?? [])].filter((t) => userAllergens.has(t)).sort();
    if (hit.length) add(blocked, `${iid}: matches your allergen list (${hit.join(", ")}).`);
  }
  for (const rule of rules) {
    if (rule.applies_to.some((t) => ids.includes(t))) {
      add(rule.severity === "block" ? blocked : warnings, rule.user_text);
      note(applied, rule);
    }
  }
  if (blocked.length) return { allowed: false, warnings, blocked, rules: applied, result: null };
  if (!("options" in result)) return { allowed: true, warnings, blocked, rules: applied, result };

  const kept: ProcessingOption[] = [];
  for (const opt of result.options) {
    const { tags, heated } = optionTags(opt);
    let withheld = false;
    for (const rule of rules) {
      if (!matches(rule, tags, heated)) continue;
      note(applied, rule);
      if (rule.severity === "block") {
        withheld = true;
        add(blocked, `Withheld "${opt.instruction}": ${rule.user_text}`);
      } else {
        add(warnings, rule.user_text);
      }
    }
    if (!withheld) kept.push(opt);
  }
  const allowed = kept.length > 0 || result.options.length === 0;
  return { allowed, warnings, blocked, rules: applied, result: allowed ? ({ ...result, options: kept } as T) : null };
}
