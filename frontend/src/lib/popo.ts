// Popo helpers. Pure. Builds the context Popo may answer from (exactly what the Prepare screen shows)
// and an offline answer that quotes the matching steps when the service cannot be reached.
import { Bundle, Dish } from "../engine/types";
import { PreparePlan, userText } from "./prepare";
import { METRIC_WORDS, effectSentence, plantName, samplesText } from "./words";

export const FINAL_STEP = "Cook beans until fully soft.";
const MAX_STEPS = 5;

export interface PopoContext {
  dish: string;
  plant: string;
  steps: string[];
  cautions: string[];
  findings: string[];
  [key: string]: unknown;
}

export function popoContext(bundle: Bundle, dish: Dish, plantId: string, p: PreparePlan): PopoContext {
  return {
    dish: dish.name.split(" (")[0],
    plant: plantName(bundle, plantId).english.toLowerCase(),
    steps: p.steps.slice(0, MAX_STEPS),
    cautions: [FINAL_STEP, ...p.firedRules.map(userText).filter((t): t is string => !!t)],
    findings: p.findings.map((f) => `${effectSentence(METRIC_WORDS[f.goal]?.name ?? f.goal.replace(/_/g, " "), f.option.effectRange)} in ${samplesText(f.option, bundle)}.`),
  };
}

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "is", "it", "i", "do", "can", "my", "how", "why", "what", "if", "for", "in", "on", "with", "this", "that", "be", "should", "need", "you", "they", "them"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Offline: quote the steps that share words with the question (or all of them), then the caution. */
export function offlineAnswer(ctx: PopoContext, question: string): string {
  const q = new Set(words(question).map((w) => w.slice(0, 5)));
  const hits = ctx.steps.filter((s) => words(s).some((w) => q.has(w.slice(0, 5))));
  const quoted = (hits.length ? hits : ctx.steps).join(" ");
  return `I can't reach the internet right now, so here is what the published steps say: ${quoted} ${FINAL_STEP}`;
}
