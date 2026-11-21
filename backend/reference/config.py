"""All constants in one place. Defaults are estimates unless a source is noted."""

GUIDELINE_G_PER_KG = 0.8  # general adult protein guideline, not medical advice
MEALS_PER_DAY = 3
WEIGHTS = {"fit": 0.50, "cost": 0.30, "density": 0.20}  # estimated defaults, shown in the model card
DEFAULT_FORM = "flour"  # functional values are aggregated within one form only
ALLOWED_QUALITY = ("measured", "read_from_figure", "calculated", "estimated")

# Output rounding so the Python and TypeScript engines compare exactly.
SCORE_DP = 4
MONEY_DP = 2

# Plain-text drivers. Key: (component, sign of contribution).
DRIVER_TEXT = {
    ("fit", True): "better functional fit for this dish",
    ("fit", False): "weaker functional fit for this dish",
    ("cost", True): "cheaper per gram of protein",
    ("cost", False): "costs more per gram of protein",
    ("density", True): "more protein per 100 g",
    ("density", False): "less protein per 100 g",
}

# Processing fallback.
# Dev data uses unit-suffixed metric names; percent change is unit-free, so they map to one metric.
METRIC_ALIASES = {
    "phytate_mg100g": "phytate",
    "oxalate_mg100g": "oxalate",
    "trypsin_inhibitor_mg100g": "trypsin_inhibitor",
    "foam_capacity_pct": "foam_capacity",
    "wac_pct": "water_absorption",
    "oac_pct": "oil_absorption",
    "lgc_pct": "least_gelation",
}
# Which way is better when the caller gives no direction. Team judgement: anti-nutrients and the
# least gelation concentration are better lower. Metrics not listed are ordered by evidence only.
DEFAULT_DIRECTION = {
    "phytate": "lower",
    "tannin": "lower",
    "trypsin_inhibitor": "lower",
    "oxalate": "lower",
    "saponin": "lower",
    "least_gelation": "lower",
}
FALLBACK_MAX_SAME_CROP = 3
FALLBACK_MAX_OTHER_CROP = 2
MODEL_GRID_STEPS = 5  # grid points per axis inside the observed range (no extrapolation)
MODEL_TOP_K = 3
INTERVAL_Z = 1.96

# Treatment steps that apply heat. Used by the safety guard and to word instructions.
HEAT_STEPS = ("boiling", "roasting", "autoclaving", "steaming", "frying", "deep_frying",
              "pressure_cooking", "toasting", "cooking")
# Keyword -> step, for playbook steps written in plain English.
STEP_KEYWORDS = {
    "soak": "soaking", "dehull": "dehulling", "skins": "dehulling", "mill": "milling",
    "sprout": "germination", "germinat": "germination", "ferment": "fermentation",
    "boil": "boiling", "roast": "roasting", "steam": "steaming", "fry": "frying",
    "pressure-cook": "pressure_cooking", "cook": "cooking", "toast": "toasting",
}
# Plain instructions. No numeric times or temperatures here: those come only from published rows.
STEP_INSTRUCTIONS = {
    "soaking": "Soak in clean water",
    "dehulling": "remove the skins",
    "wet_milling": "wet-mill to a paste",
    "milling": "mill",
    "germination": "let the seeds sprout",
    "fermentation": "ferment in a clean, covered container",
    "lactic": "",
    "boiling": "boil until fully soft",
    "roasting": "roast, stirring",
    "toasting": "toast, stirring",
    "steaming": "steam until fully cooked",
    "deep_frying": "fry until fully cooked",
    "frying": "fry until fully cooked",
    "pressure_cooking": "pressure-cook until fully soft",
    "autoclaving": "cook under pressure until fully soft",
    "alkaline": "(alkaline soak water as in the study)",
}
