// Parity: the TypeScript engine must reproduce EVERY golden fixture from the Python reference engine.
import fs from "fs";
import path from "path";

import { loadBundle } from "../src/bundle/loader";
import { dishesForPlant } from "../src/engine/plant";
import { recommendProcessing } from "../src/engine/processing";
import { rankIngredients } from "../src/engine/rank";
import { safetyGuard } from "../src/engine/safety";
import { suggestDishes } from "../src/engine/suggest";
import { Bundle, PlanInput, ProcessingResult, SafetyCtx } from "../src/engine/types";

const GOLDEN = path.resolve(__dirname, "../../backend/tests/golden");
const BUNDLE = path.resolve(__dirname, "../assets/bundle");

function readBundle(): Bundle {
  const raw: Record<string, unknown> = {};
  for (const f of fs.readdirSync(BUNDLE)) raw[f] = JSON.parse(fs.readFileSync(path.join(BUNDLE, f), "utf8"));
  const r = loadBundle(raw);
  if (!r.ok) throw new Error(r.error);
  return r.bundle;
}

interface Case {
  name: string;
  fn: string;
  args: Record<string, unknown>;
  expected: unknown;
  bundleVersion: string;
}

const cases: Case[] = fs
  .readdirSync(GOLDEN)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(GOLDEN, f), "utf8")));

function run(c: Case, b: Bundle): unknown {
  const a = c.args;
  switch (c.fn) {
    case "suggestDishes":
      return suggestDishes(a.input as PlanInput, b);
    case "dishesForPlant":
      return dishesForPlant(a.plantId as string, a.input as PlanInput, b);
    case "rankIngredients":
      return rankIngredients(a.applicationId as string, a.input as PlanInput, b, a.candidateIds as string[] | null);
    case "recommendProcessing":
      return recommendProcessing(a.ingredientId as string, a.goal as string, b);
    case "safetyGuard":
      return safetyGuard(a.result as ProcessingResult, a.ctx as SafetyCtx, b);
    default:
      throw new Error(`unknown fn ${c.fn}`);
  }
}

const bundle = readBundle();

test("every golden case is listed and loaded", () => {
  const index = JSON.parse(fs.readFileSync(path.join(GOLDEN, "index.json"), "utf8"));
  expect(cases.map((c) => c.name).sort()).toEqual([...index.cases].sort());
  expect(cases.length).toBeGreaterThanOrEqual(15);
});

test.each(cases.map((c) => [c.name, c] as const))("%s matches the Python engine", (_name, c) => {
  expect(c.bundleVersion).toBe(bundle.version);
  // JSON round trip, as the fixtures went through JSON on the Python side.
  expect(JSON.parse(JSON.stringify(run(c, bundle)))).toEqual(c.expected);
});
