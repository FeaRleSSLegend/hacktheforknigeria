import fs from "fs";
import path from "path";

import { loadBundle } from "../src/bundle/loader";
import { pyFixed, pyRound, signedFixed } from "../src/engine/num";
import { instructionFor, stepsFromText, treatmentSteps } from "../src/engine/processing";

const BUNDLE = path.resolve(__dirname, "../assets/bundle");
const rawBundle = () => {
  const raw: Record<string, unknown> = {};
  for (const f of fs.readdirSync(BUNDLE)) raw[f] = JSON.parse(fs.readFileSync(path.join(BUNDLE, f), "utf8"));
  return raw;
};

test("python-style rounding: ties to even on the exact binary value", () => {
  expect(pyRound(0.125, 2)).toBe(0.12);
  expect(pyRound(0.375, 2)).toBe(0.38);
  expect(pyRound(2.5, 0)).toBe(2);
  expect(pyRound(1.005, 2)).toBe(1); // 1.005 is really 1.00499...
  expect(pyFixed(-0.04, 1)).toBe("-0.0");
  expect(signedFixed(86.7, 1)).toBe("+86.7");
  expect(Object.is(pyRound(-0.04, 1), -0)).toBe(true);
});

test("treatment parsing matches the Python engine", () => {
  expect(treatmentSteps("soaking_deep_frying")).toEqual(["soaking", "deep_frying"]);
  expect(treatmentSteps("wet_milling")).toEqual(["wet_milling"]);
  expect(stepsFromText(["Soak, then pressure-cook until soft."])).toEqual(["soaking", "pressure_cooking"]);
  expect(instructionFor("soaking_boiling")).toBe("Soak in clean water, then boil until fully soft.");
});

test("the shipped bundle validates", () => {
  const r = loadBundle(rawBundle());
  expect(r.ok).toBe(true);
});

test("a broken bundle fails calmly instead of throwing", () => {
  const raw = rawBundle();
  (raw["safety_rules.json"] as { source: string }[])[0].source = "";
  const r = loadBundle(raw);
  expect(r.ok).toBe(false);
  const extra = rawBundle();
  (extra["dishes.json"] as Record<string, unknown>[])[0].tastes_like = "meat";
  expect(loadBundle(extra).ok).toBe(false);
  expect(loadBundle(null).ok).toBe(false);
});
