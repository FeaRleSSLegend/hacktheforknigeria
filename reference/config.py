"""All constants in one place. Defaults are estimates unless a source is noted."""

GUIDELINE_G_PER_KG = 0.8  # general adult protein guideline, not medical advice
MEALS_PER_DAY = 3
WEIGHTS = {"fit": 0.50, "cost": 0.30, "density": 0.20}  # estimated defaults, shown in the model card
DEFAULT_FORM = "flour"  # functional values are aggregated within one form only
ALLOWED_QUALITY = ("measured", "read_from_figure", "calculated", "estimated")
