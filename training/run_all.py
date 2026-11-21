"""One command for the AI lane: python training/run_all.py

Order: inventory, batch ingest (data/treatment_experiments.csv, data/functional_properties.csv), ETL, build tables, validate, QC, train, fallback tests, ranking stability,
pytest -q, then the backend's build_bundle.py and make_fixtures.py if they exist.
Every step runs as `python -I <script>`; the first failure stops the run.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "training" / "reports" / "etl_log.json"

STEPS = [
    ("inventory", ["training/etl/inventory.py"]),
    ("ingest treatment and functional batches", ["training/etl/ingest_batches.py"]),
    ("etl: WAFCT 2019", ["training/etl/wafct.py"]),
    ("etl: PulsesDM", ["training/etl/pulses.py"]),
    ("etl: PhyFoodComp", ["training/etl/phytate.py"]),
    ("etl: NBS prices", ["training/etl/prices.py"]),
    ("etl: units", ["training/etl/units.py"]),
    ("build tables", ["scripts/build_tables.py"]),
    ("validate", ["scripts/validate_data.py"]),
    ("qc functional", ["training/etl/qc_functional.py"]),
    ("check playbook effects", ["training/etl/check_playbook.py"]),
    ("train processing", ["scripts/train_processing.py"]),
    ("fallback tests", ["-m", "pytest", "-q", "tests/test_processing_fallback.py"]),
    ("ranking stability", ["training/ranking_stability.py"]),
    ("dish ranking report", ["training/dish_report.py"]),
    ("pytest", ["-m", "pytest", "-q"]),
]
BACKEND = ["scripts/build_bundle.py", "scripts/make_fixtures.py"]


def run(name: str, args: list[str]) -> None:
    print(f"\n=== {name} ===", flush=True)
    r = subprocess.run([sys.executable, "-I", *args], cwd=ROOT)
    if r.returncode != 0:
        print(f"\nFAILED at step '{name}' (exit {r.returncode})")
        sys.exit(r.returncode)


def write_log_md() -> None:
    records = json.loads(LOG.read_text())
    lines = ["# ETL row counts", "", "| Step | Rows in | Dropped (reason: n) | Rows out | Notes |", "|---|---|---|---|---|"]
    for r in records:
        dropped = "; ".join(f"{k}: {v}" for k, v in r["dropped"].items()) or "none"
        lines.append(f"| {r['step']} | {r['rows_in']} | {dropped} | {r['rows_out']} | {r['notes']} |")
    LOG.with_suffix(".md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    if LOG.exists():
        LOG.unlink()
    for name, args in STEPS:
        run(name, args)
    write_log_md()
    missing = [s for s in BACKEND if not (ROOT / s).exists()]
    for s in BACKEND:
        if (ROOT / s).exists():
            run(s, [s])
    if missing:
        print(f"\nNot run (backend lane, not written yet): {', '.join(missing)}. Stopping here.")
    print("\nAI lane run complete. Reports: training/reports/, reports/metrics.md, reports/ranking_stability.md")


if __name__ == "__main__":
    main()
