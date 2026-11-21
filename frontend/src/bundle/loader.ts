// Turns raw bundle files into the engine's Bundle. Pure: takes parsed JSON, returns a result.
import { Bundle, ModelFile } from "../engine/types";
import { bundleFilesSchema } from "./schema";

export type LoadResult = { ok: true; bundle: Bundle } | { ok: false; error: string };

export function loadBundle(raw: unknown): LoadResult {
  const parsed = bundleFilesSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `${first?.path.join(".") ?? "bundle"}: ${first?.message ?? "invalid"}` };
  }
  const f = parsed.data;
  const listed = Object.keys(f["manifest.json"].files).sort();
  const present = Object.keys(f).filter((k) => k !== "manifest.json").sort();
  if (listed.join() !== present.join()) return { ok: false, error: "bundle files do not match the manifest" };

  const byId = <T extends { ingredient_id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.ingredient_id, r]));
  return {
    ok: true,
    bundle: {
      ingredients: byId(f["ingredients.json"]),
      ingredientOrder: f["ingredients.json"].map((r) => r.ingredient_id),
      sides: byId(f["sides.json"]),
      properties: f["functional_properties.json"],
      applications: Object.fromEntries(f["applications.json"].map((a) => [a.id, a])),
      dishes: f["dishes.json"],
      treatments: f["treatment_experiments.json"],
      playbook: Object.fromEntries(f["playbook.json"].map((p) => [p.id, p])),
      safetyRules: f["safety_rules.json"],
      model: f["model.json"] as ModelFile,
      units: f["units.json"],
      manifest: f["manifest.json"],
      version: f["manifest.json"].version,
    },
  };
}
