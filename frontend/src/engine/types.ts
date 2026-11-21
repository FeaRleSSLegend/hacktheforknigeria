// Types mirror PROJECT.md section 8 plus the extra fields under Deviations in backend/AGENTS.md.

export type Quality = "measured" | "read_from_figure" | "calculated" | "estimated";

export interface CompositionRow {
  ingredient_id: string;
  name: string;
  local_names?: string;
  food_group?: string;
  form_sold: string;
  protein_g_per_100g: number | null;
  fat_g: number | null;
  energy_kcal: number | null;
  iron_mg: number | null;
  water_g: number | null;
  price_ngn_per_kg: number | null;
  price_month: string;
  price_source: string;
  allergen_tags: string[];
  quality: Quality;
  source: string;
  notes: string;
}

export interface PropertyRow {
  ingredient_id: string;
  property: string;
  value: number | null;
  unit: string;
  form: string;
  ph: string;
  method_note: string;
  paper_id: string;
  page: string;
  quote: string;
  quality: Quality;
}

export interface TreatmentRow {
  exp_id: string;
  crop_id: string;
  part: string;
  treatment: string;
  time_h: number | null;
  temp_c: number | null;
  ph: number | null;
  outcome_metric: string;
  baseline_value: number | null;
  treated_value: number | null;
  change_pct: number | null;
  paper_id: string;
  page: string;
  quote: string;
  method_note: string;
  quality: Quality;
  baseline_type: string;
  treatment_family: string;
  crop_group: string;
  in_ingredient_table: boolean | null;
  cumulative_from_raw: boolean | null;
  stage_order: number | null;
  route: string;
  stage_path: string;
}

export interface Need {
  property: string;
  direction: "higher" | "lower";
  weight: number;
}

export interface Application {
  id: string;
  name: string;
  needs: Need[];
  notes: string;
}

export interface Dish {
  id: string;
  name: string;
  application_id: string;
  protein_slot_ids: string[];
  side_items: { id: string; as_sold_g_per_serving: number; quality?: string; note?: string }[];
  playbook_ids: string[];
  notes?: string;
}

export interface PlaybookMetric {
  n_rows: number;
  min_pct: number;
  median_pct: number;
  max_pct: number;
}

export interface PlaybookEntry {
  id: string;
  crop_id: string;
  goal: string;
  steps: string[];
  conditions?: string;
  effect: { basis: string; metrics: Record<string, PlaybookMetric> };
  why?: string;
  evidence_level: string;
  sources: string[];
}

export interface SafetyRule {
  id: string;
  applies_to: string[];
  severity: "block" | "warn";
  text: string;
  source: string;
  reviewed: boolean;
}

/** One entry of a pooled table model (C3: key "treatment|metric"). */
export interface ModelTableEntry {
  value: number;
  n_rows: number;
  papers: string[];
  crops: string[];
  citations: string[];
  time_h: [number, number] | null;
  temp_c: [number, number] | null;
  cumulative_from_raw?: boolean;
}

/** A shipped model in bundle model.json["models"]. Only the parts the engine reads are typed. */
export interface ModelEntry {
  kind: string;
  key?: string;
  display_label?: string;
  ships_only_with_different_crop_rows?: boolean;
  entries?: Record<string, ModelTableEntry>;
}

export interface ModelFile {
  _stub?: boolean;
  generated?: string;
  note?: string;
  models?: Record<string, ModelEntry>;
}

export interface Manifest {
  schemaVersion: number;
  version: string;
  files: Record<string, { sha256: string; bytes: number }>;
  modelIsStub: boolean;
  notes: string[];
}

export interface UnitRow {
  unit: string;
  commodity: string;
  kg_per_unit: number | null;
  basis: string;
  confidence: string;
  source: string;
  use_in_app: string;
}

/** The engine's view of the bundle (same shape as the Python loader's dict). */
export interface Bundle {
  ingredients: Record<string, CompositionRow>;
  ingredientOrder: string[];
  sides: Record<string, CompositionRow>;
  properties: PropertyRow[];
  applications: Record<string, Application>;
  dishes: Dish[];
  treatments: TreatmentRow[];
  playbook: Record<string, PlaybookEntry>;
  safetyRules: SafetyRule[];
  model: ModelFile;
  units: UnitRow[];
  manifest: Manifest;
  version: string;
}

export interface PlanInput {
  mode: "pantry" | "dish";
  pantryIds: string[];
  dishId?: string;
  budgetNgn: number;
  servings: number;
  targetProteinG: number;
  allergens: string[];
}

export interface Excluded {
  id: string;
  reason: string;
}

export interface RankedItem {
  ingredientId: string;
  score: number | null;
  fit: number;
  fitRange: [number, number];
  costNgn: number | null;
  costPerGProtein: number | null;
  asSoldG: number;
  drivers: string[];
  flags: string[];
  quality: { composition: string; price: string; functional: string; weights: string };
}

export interface RankedResult {
  items: RankedItem[];
  excluded: Excluded[];
  bundleVersion: string;
}

export interface DishSuggestion {
  dishId: string;
  name: string;
  protein: RankedItem;
  alternatives: RankedItem[];
  missingItems: { id: string; costNgn: number }[];
  totalCostNgn: number;
  proteinPerPlateG: number;
  playbookIds: string[];
  flags: string[];
}

export interface SuggestResult {
  dishes: DishSuggestion[];
  excluded: Excluded[];
  bundleVersion: string;
}

export type OptionKind = "playbook" | "published_same_crop" | "published_other_crop" | "model";

export interface ProcessingOption {
  kind: OptionKind;
  playbookId?: string;
  cropId: string;
  pooledFrom?: string[];
  treatment: string;
  timeH: number | null;
  tempC: number | null;
  instruction: string;
  conditions: string | null;
  effect: string;
  effectRange: [number, number];
  nRows: number | null;
  sources: string[];
  evidence: string;
}

export interface ProcessingResult {
  mode: "model" | "fallback";
  ingredientId: string;
  goal: string;
  options: ProcessingOption[];
  note: string;
}

export interface PlateResult {
  totals: Record<string, number | null>;
  status: Record<string, "low" | "ok" | "high" | "unknown">;
  suggestedSides: string[];
  notes: string[];
  ingredientId?: string;
}

export interface SafetyCtx {
  ingredientId?: string;
  ingredientIds?: string[];
  allergens?: string[];
}

export interface GuardResult<T> {
  allowed: boolean;
  warnings: string[];
  blocked: string[];
  result: T | null;
}
