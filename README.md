# ProteinPath

Offline-first app that ranks Nigerian plant proteins for a dish by published functional properties. Product and rules: `PROJECT.md`, `AGENTS.md`.

## Data and model pipeline (AI lane)

```
python -m venv .venv && .venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install pandas numpy scikit-learn pytest openpyxl
python training/run_all.py
```

`run_all.py` runs, in order: inventory, ETL (WAFCT 2019, PulsesDM, PhyFoodComp, NBS prices, units), `scripts/build_tables.py`, `scripts/validate_data.py`, functional-property QC, `scripts/train_processing.py`, the fallback tests, the ranking stability check, and `pytest -q`. It stops at the first failure.

Raw inputs live in `training/data/` (read-only). Outputs:
- `training/clean/`: cleaned intermediates
- `training/reports/`: inventory, ETL row counts (`etl_log.md`), cross-checks, QC, `verify_checklist.csv`, `needs_human.md`
- `data/ingredients.csv`, `data/sides.csv`: generated tables
- `reports/metrics.md` / `metrics.json`: processing model vs baselines (grouped CV by paper)
- `reports/ranking_stability.md`, `reports/coverage.json`
- `bundle/model.json`: shipped processing models (empty until a metric beats its baseline)
