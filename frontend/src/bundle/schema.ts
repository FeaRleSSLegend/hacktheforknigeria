// zod schemas for every bundle file. Strict: unknown keys fail validation.
import { z } from "zod";

const quality = z.enum(["measured", "read_from_figure", "calculated", "estimated"]);
const num = z.number().nullable();

const composition = z.object({
  ingredient_id: z.string().min(1),
  name: z.string().min(1),
  local_names: z.string().optional(),
  food_group: z.string().optional(),
  form_sold: z.string(),
  protein_g_per_100g: num,
  fat_g: num,
  energy_kcal: num,
  iron_mg: num,
  water_g: num,
  price_ngn_per_kg: num,
  price_month: z.string(),
  price_source: z.string(),
  allergen_tags: z.array(z.string()),
  quality,
  source: z.string().min(1),
  notes: z.string(),
}).strict();

const property = z.object({
  ingredient_id: z.string(),
  property: z.string(),
  value: num,
  unit: z.string(),
  form: z.string(),
  ph: z.string(), // carried as text by the backend (not parsed); currently always empty
  method_note: z.string(),
  paper_id: z.string().min(1),
  page: z.string(),
  quote: z.string(),
  quality,
}).strict();

const treatment = z.object({
  exp_id: z.string(),
  crop_id: z.string(),
  part: z.string(),
  treatment: z.string(),
  time_h: num,
  temp_c: num,
  ph: num,
  outcome_metric: z.string(),
  baseline_value: num,
  treated_value: num,
  change_pct: num,
  paper_id: z.string().min(1),
  page: z.string(),
  quote: z.string(),
  method_note: z.string(),
  quality,
}).strict();

const application = z.object({
  id: z.string(),
  name: z.string(),
  needs: z.array(z.object({ property: z.string(), direction: z.enum(["higher", "lower"]), weight: z.number().positive() }).strict()),
  notes: z.string(),
}).strict();

const dish = z.object({
  id: z.string(),
  name: z.string(),
  application_id: z.string(),
  protein_slot_ids: z.array(z.string()),
  side_items: z.array(z.object({ id: z.string(), as_sold_g_per_serving: z.number() }).strict()),
  playbook_ids: z.array(z.string()),
  notes: z.string().optional(),
}).strict();

const playbook = z.object({
  id: z.string(),
  crop_id: z.string(),
  goal: z.string(),
  steps: z.array(z.string()),
  conditions: z.string().optional(),
  effect: z.object({
    basis: z.string(),
    metrics: z.record(z.string(), z.object({ n_rows: z.number(), min_pct: z.number(), median_pct: z.number(), max_pct: z.number() }).strict()),
  }).strict(),
  why: z.string().optional(),
  evidence_level: z.string(),
  sources: z.array(z.string()).min(1),
}).strict();

const safetyRule = z.object({
  id: z.string(),
  applies_to: z.array(z.string()).min(1),
  severity: z.enum(["block", "warn"]),
  text: z.string().min(1),
  source: z.string().min(1),
  reviewed: z.boolean(),
}).strict();

const unit = z.object({
  unit: z.string(),
  commodity: z.string(),
  kg_per_unit: num,
  basis: z.string(),
  confidence: z.string(),
  source: z.string(),
  use_in_app: z.string(),
}).strict();

const modelMetric = z.object({
  ships: z.boolean().optional(),
  intercept: z.number().optional(),
  coef: z.record(z.string(), z.number()).optional(),
  residual_sd: z.number().optional(),
  ranges: z.record(z.string(), z.object({ time_h: z.tuple([z.number(), z.number()]), temp_c: z.tuple([z.number(), z.number()]) })).optional(),
  papers: z.array(z.string()).optional(),
  cv_mae: z.number().optional(),
  baseline_mae: z.number().optional(),
}).passthrough();

// model.json is owned by the AI lane, so unknown keys are allowed there; only the parts we read are typed.
const model = z.object({ _stub: z.boolean().optional(), note: z.string().optional(), metrics: z.record(z.string(), modelMetric).optional() }).passthrough();

const manifest = z.object({
  schemaVersion: z.literal(1),
  version: z.string().min(1),
  files: z.record(z.string(), z.object({ sha256: z.string().length(64), bytes: z.number() }).strict()),
  modelIsStub: z.boolean(),
  notes: z.array(z.string()),
}).strict();

export const bundleFilesSchema = z.object({
  "manifest.json": manifest,
  "ingredients.json": z.array(composition),
  "sides.json": z.array(composition),
  "functional_properties.json": z.array(property),
  "treatment_experiments.json": z.array(treatment),
  "applications.json": z.array(application),
  "dishes.json": z.array(dish),
  "playbook.json": z.array(playbook),
  "safety_rules.json": z.array(safetyRule),
  "units.json": z.array(unit),
  "reference_values.json": z.record(z.string(), z.unknown()),
  "model.json": model,
}).strict();

export type BundleFiles = z.infer<typeof bundleFilesSchema>;
