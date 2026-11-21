import fs from "fs";
import path from "path";

import { loadBundle } from "../src/bundle/loader";
import { safetyGuard } from "../src/engine/safety";
import { recommendProcessing } from "../src/engine/processing";
import { suggestDishes } from "../src/engine/suggest";
import { Bundle } from "../src/engine/types";
import { preparePlan } from "../src/lib/prepare";
import { effectSentence, naira, plainReason, plantLabel } from "../src/lib/words";

const BUNDLE = path.resolve(__dirname, "../assets/bundle");
function bundle(): Bundle {
  const raw: Record<string, unknown> = {};
  for (const f of fs.readdirSync(BUNDLE)) raw[f] = JSON.parse(fs.readFileSync(path.join(BUNDLE, f), "utf8"));
  const r = loadBundle(raw);
  if (!r.ok) throw new Error(r.error);
  return r.bundle;
}
const b = bundle();
const akara = b.dishes.find((d) => d.id === "akara");

test("akara with cowpea uses the sourced akara route and passes the guard", () => {
  const p = preparePlan(b, akara, "cowpea", []);
  expect(p.route?.id).toBe("pb_cowpea_akara_route");
  expect(p.steps).toEqual(b.playbook.pb_cowpea_akara_route.steps);
  expect(p.findings.map((f) => f.goal)).toEqual(["phytate", "tannin", "trypsin_inhibitor"]);
  expect(p.findings.every((f) => f.option.playbookId === "pb_cowpea_akara_route")).toBe(true);
  expect(p.hiddenCount).toBeGreaterThan(0); // the soak-only route is withheld
  const plain = b.safetyRules.map((r) => r.user_text);
  for (const r of p.hiddenReasons) expect(plain).toContain(r);
  expect(p.wholeBlocked).toEqual([]);
});

test("safety messages are plain user_text; review status is kept apart", () => {
  const p = preparePlan(b, b.dishes.find((d) => d.id === "egusi_soup"), "groundnut", []);
  expect(p.warnings.length).toBeGreaterThan(0);
  const plain = b.safetyRules.map((r) => r.user_text);
  for (const w of p.warnings) expect(plain).toContain(w);
  const g = safetyGuard(recommendProcessing("groundnut", "phytate", b), { allergens: [] }, b);
  expect(g.rules.length).toBeGreaterThan(0);
  expect(g.rules.every((r) => r.reviewed === false)).toBe(true);
});

test("a plant on the user's allergen list is withheld entirely", () => {
  const p = preparePlan(b, undefined, "groundnut", ["peanut"]);
  expect(p.wholeBlocked.length).toBeGreaterThan(0);
  expect(p.findings).toEqual([]);
  expect(p.steps).toEqual([]);
});

test("plain words for the known demo facts", () => {
  const r = suggestDishes({ mode: "pantry", pantryIds: [], budgetNgn: 1500, servings: 4, targetProteinG: 20, allergens: [] }, b);
  expect(r.dishes.every((d) => d.protein.ingredientId === "cowpea")).toBe(true);
  const okpa = r.excluded.find((e) => e.id === "okpa");
  expect(plainReason(b, okpa?.reason ?? "")).toBe("We do not have a market price for bambara groundnut yet.");
  expect(plainReason(b, "over budget (need 873 NGN to buy)")).toBe("Needs about ₦873 to buy, more than your budget.");
  expect(plantLabel(b, "cowpea")).toBe("Ewa (cowpea)");
  expect(naira(1500)).toBe("₦1,500");
  expect(effectSentence("Phytate", [-88.8, -84.6])).toBe("Phytate was 85 to 89% lower");
  expect(effectSentence("Tannin", [-93, 300.8])).toBe("Tannin ranged from 93% lower to 301% higher");
});
