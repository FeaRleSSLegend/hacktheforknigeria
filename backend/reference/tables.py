"""Typed parsing of CSV rows. Pure: takes rows (lists of dicts of strings), returns typed rows.

Shared by the loader (dev path, reads data/) and scripts/build_bundle.py (writes the bundle),
so the engine sees the same values from either path.
"""

COMPOSITION_NUMERIC = ("protein_g_per_100g", "fat_g", "energy_kcal", "iron_mg", "water_g", "price_ngn_per_kg")
PROPERTY_NUMERIC = ("value",)
TREATMENT_NUMERIC = ("time_h", "temp_c", "ph", "baseline_value", "treated_value", "change_pct", "stage_order")
TREATMENT_BOOL = ("in_ingredient_table", "cumulative_from_raw")


def num(v):
    """'' or None -> None; numeric string -> float. Raises ValueError on anything else."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s == "":
        return None
    return float(s)


def tags(v) -> list[str]:
    if isinstance(v, list):
        return v
    return [t.strip() for t in (v or "").split(";") if t.strip()]


def composition_rows(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        t = dict(r)
        for k in COMPOSITION_NUMERIC:
            t[k] = num(t.get(k))
        t["allergen_tags"] = tags(t.get("allergen_tags"))
        out.append(t)
    return out


def _numeric_rows(rows: list[dict], cols: tuple) -> list[dict]:
    out = []
    for r in rows:
        t = dict(r)
        for k in cols:
            if k in t:
                t[k] = num(t[k])
        out.append(t)
    return out


def property_rows(rows: list[dict]) -> list[dict]:
    return _numeric_rows(rows, PROPERTY_NUMERIC)


def flag(v):
    """'True'/'False' (pandas CSV output) -> bool; '' or None -> None. Raises ValueError otherwise."""
    if v is None or isinstance(v, bool):
        return v
    s = str(v).strip()
    if s == "":
        return None
    if s in ("True", "true"):
        return True
    if s in ("False", "false"):
        return False
    raise ValueError(f"not a true/false value: {v!r}")


def treatment_rows(rows: list[dict]) -> list[dict]:
    out = _numeric_rows(rows, TREATMENT_NUMERIC)
    for t in out:
        for k in TREATMENT_BOOL:
            if k in t:
                t[k] = flag(t[k])
    return out
