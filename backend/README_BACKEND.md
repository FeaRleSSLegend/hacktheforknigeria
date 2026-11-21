# Engine and data pipeline (AI lane starter)

Read `PROJECT.md` and `AGENTS.md` first. This folder is the start of the repo layout in `AGENTS.md` section 3. It is the AI lane: scoring, dish suggestion, data checks. The backend service (bundle builder, FastAPI) is a separate lane.

## Run

```
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q                  # 12 tests, uses synthetic data in tests/fixtures (TEST ONLY)
python scripts/validate_data.py      # validates data/ and writes reports/coverage.json
```

## What exists

| Path | What it does |
|---|---|
| `data/` | Empty tables with the correct headers, plus `data/raw/` with the three carried-over files |
| `scripts/validate_data.py` | Checks headers, required fields, `quality` flags, numbers, cross-references; prints coverage (rows per ingredient, property, metric, crop; papers counted) |
| `reference/config.py` | All constants (guideline 0.8 g/kg, score weights 0.5 / 0.3 / 0.2) |
| `reference/sizing.py` | Protein sizing, cost |
| `reference/scoring.py` | Functional fit with ranges and missing-need flags, overall score, drivers |
| `reference/loader.py` | The only file that reads files |
| `reference/suggest.py` | `suggest_dishes`: pantry or dish mode, allergen and budget filters, pantry preference, missing items and cost |
| `tests/` | Unit tests; fixtures are synthetic and must never be copied into `data/` |

Inputs and outputs use camelCase keys so golden fixtures match the TypeScript engine (`PROJECT.md` section 8).

## Next, in this order

1. Fill `data/` (data lane). Run `validate_data.py` after every batch. The first dish to complete is akara-style with cowpea or bambara: ingredients, functional values for its needs, one application, one dish, playbook steps.
2. `reference/plate.py`: plate totals for protein, energy, iron, fat. Needs energy and iron columns filled and `reference_values.json` sourced.
3. `scripts/build_bundle.py`: write `mobile/assets/bundle/*.json` with a version and sha256, and `scripts/make_fixtures.py` for golden cases.
4. AI lane: `scripts/train_processing.py` (Ridge, GroupKFold by paper, baseline, `model.json`, `reports/metrics.json`) and `reference/processing.py` (grid search inside the training range, fallback to nearest published rows).
5. Backend lane: `scripts/build_bundle.py` and the optional `service/` FastAPI (`/health`, `/bundle/latest`, `/explain`).

## Rules that matter here

- Never invent a measured number. Missing stays missing; the engine reports why it excluded something.
- Do not mix flour, concentrate and isolate values for one ingredient (`form` is required on every functional value).
- Cost shown is protein and sides only; oil and spices are excluded and the card says so.
