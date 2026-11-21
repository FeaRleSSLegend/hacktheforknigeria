"""Shared helpers for the ETL scripts: paths, bracket parsing, step logging.

Raw files in training/data/ are read-only. Nothing here writes there.
"""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "training" / "data"
CLEAN = ROOT / "training" / "clean"
REPORTS = ROOT / "training" / "reports"
MAPPINGS = ROOT / "training" / "mappings"
LOG = REPORTS / "etl_log.json"

_BRACKET = re.compile(r"^\s*\[\s*(.*?)\s*\]\s*$")


def parse_bracket(cell):
    """Parse a WAFCT/PulsesDM cell.

    Returns (value, imputed). Values in [square brackets] are imputed or borrowed in the
    source, so imputed is True and the brackets are stripped. Empty, 'tr' (trace) and
    non-numeric cells give (None, False) so they stay missing rather than becoming 0.
    """
    if cell is None:
        return None, False
    if isinstance(cell, (int, float)):
        if isinstance(cell, float) and math.isnan(cell):
            return None, False
        return float(cell), False
    s = str(cell).strip()
    if s == "":
        return None, False
    imputed = False
    m = _BRACKET.match(s)
    if m:
        s, imputed = m.group(1), True
    try:
        return float(s), imputed
    except ValueError:
        return None, False


def dm_to_as_sold(dm_value, water_g_per_100g):
    """Convert a dry-matter value to an as-sold value: dm * (1 - water/100).

    The result is a calculated number and must be labelled so.
    """
    if dm_value is None or water_g_per_100g is None:
        return None
    if not 0 <= water_g_per_100g < 100:
        raise ValueError("water_g_per_100g must be in [0, 100)")
    return dm_value * (1 - water_g_per_100g / 100.0)


def log_step(step, rows_in, rows_out, dropped=None, notes=""):
    """Append one step record to training/reports/etl_log.json and print it."""
    REPORTS.mkdir(parents=True, exist_ok=True)
    records = json.loads(LOG.read_text()) if LOG.exists() else []
    rec = {"step": step, "rows_in": rows_in, "dropped": dropped or {}, "rows_out": rows_out, "notes": notes}
    records = [r for r in records if r["step"] != step] + [rec]
    LOG.write_text(json.dumps(records, indent=2))
    drop_txt = ", ".join(f"{k}: {v}" for k, v in (dropped or {}).items()) or "none"
    print(f"[{step}] in={rows_in} dropped=({drop_txt}) out={rows_out}")
