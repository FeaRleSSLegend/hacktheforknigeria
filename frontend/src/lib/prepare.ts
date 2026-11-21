// Builds the Prepare screen from engine output. Every processing result passes safetyGuard first;
// only options the guard kept are used. Pure.
import { recommendProcessing } from "../engine/processing";
import { safetyGuard } from "../engine/safety";
import { Bundle, Dish, PlaybookEntry, ProcessingOption, SafetyRule } from "../engine/types";

export const PREPARE_GOALS = ["phytate", "tannin", "trypsin_inhibitor"] as const;

export interface Finding {
  goal: string;
  option: ProcessingOption;
}

export interface PreparePlan {
  steps: string[];
  route: PlaybookEntry | null;
  findings: Finding[];
  warnings: string[];
  hiddenCount: number;
  hiddenReasons: string[];
  wholeBlocked: string[];
  anyModel: boolean;
  /** Rules that fired (block first), so the UI can show each rule's plain user_text only. */
  firedRules: SafetyRule[];
}

export function preparePlan(bundle: Bundle, dish: Dish | undefined, plantId: string, allergens: string[]): PreparePlan {
  const kept = new Map<string, ProcessingOption[]>();
  const warnings: string[] = [];
  const hidden = new Set<string>();
  const hiddenReasons: string[] = [];
  const wholeBlocked: string[] = [];
  let anyModel = false;

  for (const goal of PREPARE_GOALS) {
    const g = safetyGuard(recommendProcessing(plantId, goal, bundle), { allergens }, bundle);
    for (const w of g.warnings) if (!warnings.includes(w)) warnings.push(w);
    for (const b of g.blocked) {
      const m = b.match(/^Withheld "(.*)": ([\s\S]*)$/);
      if (m) {
        hidden.add(m[1]);
        if (!hiddenReasons.includes(m[2])) hiddenReasons.push(m[2]);
      } else if (!wholeBlocked.includes(b)) {
        wholeBlocked.push(b);
      }
    }
    if (g.result) {
      kept.set(goal, g.result.options);
      if (g.result.mode === "model") anyModel = true;
    }
  }

  const keptPlaybook = new Set<string>();
  for (const opts of kept.values()) for (const o of opts) if (o.playbookId) keptPlaybook.add(o.playbookId);
  const dishRoute = (dish?.playbook_ids ?? []).find((id) => bundle.playbook[id]?.crop_id === plantId && keptPlaybook.has(id));
  const anyRoute = [...kept.values()].flat().find((o) => o.playbookId)?.playbookId;
  const routeId = dishRoute ?? anyRoute;
  const route = routeId ? bundle.playbook[routeId] : null;

  let steps: string[] = route ? route.steps : [];
  if (!steps.length) {
    const first = [...kept.values()].flat()[0];
    if (first) steps = [first.instruction];
  }

  const findings: Finding[] = [];
  for (const goal of PREPARE_GOALS) {
    const opts = kept.get(goal) ?? [];
    const option = opts.find((o) => route && o.playbookId === route.id) ?? opts[0];
    if (option) findings.push({ goal, option });
  }

  const messages = [...warnings, ...hiddenReasons, ...wholeBlocked];
  const firedRules = bundle.safetyRules
    .filter((r) => messages.some((m) => m.startsWith(r.text)))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "block" ? -1 : 1));
  return { steps, route, findings, warnings, hiddenCount: hidden.size, hiddenReasons, wholeBlocked, anyModel, firedRules };
}

const MAX_USER_TEXT_WORDS = 20;

/** The plain, user-facing sentence of a rule, or nothing if the data has none (or it is too long). */
export function userText(rule: SafetyRule | undefined): string | null {
  const t = rule?.user_text?.trim();
  if (!t || t.split(/\s+/).length > MAX_USER_TEXT_WORDS) return null;
  return t;
}
