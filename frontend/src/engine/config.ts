// All engine constants in one place. Mirrors backend/reference/config.py exactly.

export const GUIDELINE_G_PER_KG = 0.8; // general adult guideline, not medical advice
export const MEALS_PER_DAY = 3;
export const WEIGHTS = { fit: 0.5, cost: 0.3, density: 0.2 } as const; // estimated defaults
export const WEIGHT_KEYS = ["fit", "cost", "density"] as const;
export type WeightKey = (typeof WEIGHT_KEYS)[number];
export const DEFAULT_FORM = "flour";
export const ALLOWED_QUALITY = ["measured", "read_from_figure", "calculated", "estimated"] as const;

export const SCORE_DP = 4;
export const MONEY_DP = 2;

export const DRIVER_TEXT: Record<WeightKey, { up: string; down: string }> = {
  fit: { up: "better functional fit for this dish", down: "weaker functional fit for this dish" },
  cost: { up: "cheaper per gram of protein", down: "costs more per gram of protein" },
  density: { up: "more protein per 100 g", down: "less protein per 100 g" },
};

export const METRIC_ALIASES: Record<string, string> = {
  phytate_mg100g: "phytate",
  oxalate_mg100g: "oxalate",
  trypsin_inhibitor_mg100g: "trypsin_inhibitor",
  foam_capacity_pct: "foam_capacity",
  wac_pct: "water_absorption",
  oac_pct: "oil_absorption",
  lgc_pct: "least_gelation",
};

export type Direction = "higher" | "lower";
export const DEFAULT_DIRECTION: Record<string, Direction> = {
  phytate: "lower",
  tannin: "lower",
  trypsin_inhibitor: "lower",
  oxalate: "lower",
  saponin: "lower",
  least_gelation: "lower",
};
export const FALLBACK_MAX_SAME_CROP = 3;
export const FALLBACK_MAX_OTHER_CROP = 2;
export const MODEL_TOP_K = 3;

export const HEAT_STEPS = [
  "boiling", "roasting", "autoclaving", "steaming", "frying", "deep_frying",
  "pressure_cooking", "toasting", "cooking",
] as const;

// Insertion order matters (it matches the Python dict order).
export const STEP_KEYWORDS: [string, string][] = [
  ["soak", "soaking"], ["dehull", "dehulling"], ["skins", "dehulling"], ["mill", "milling"],
  ["sprout", "germination"], ["germinat", "germination"], ["ferment", "fermentation"],
  ["boil", "boiling"], ["roast", "roasting"], ["steam", "steaming"], ["fry", "frying"],
  ["pressure-cook", "pressure_cooking"], ["cook", "cooking"], ["toast", "toasting"],
];

export const STEP_INSTRUCTIONS: Record<string, string> = {
  soaking: "Soak in clean water",
  dehulling: "remove the skins",
  wet_milling: "wet-mill to a paste",
  milling: "mill",
  germination: "let the seeds sprout",
  fermentation: "ferment in a clean, covered container",
  lactic: "",
  boiling: "boil until fully soft",
  roasting: "roast, stirring",
  toasting: "toast, stirring",
  steaming: "steam until fully cooked",
  deep_frying: "fry until fully cooked",
  frying: "fry until fully cooked",
  pressure_cooking: "pressure-cook until fully soft",
  autoclaving: "cook under pressure until fully soft",
  alkaline: "(alkaline soak water as in the study)",
};
