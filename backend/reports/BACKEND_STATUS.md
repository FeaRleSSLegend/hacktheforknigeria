# Backend status: Sat Nov 21 2026

Branch `backend-lane`. Everything below runs from `backend/` with the venv active.

## Rebuild everything (exact commands)

```
python -m venv .venv && .venv\Scripts\activate          # repo root; macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
python scripts/validate_data.py                         # repo root: validates data/ (0 errors, 8 price warnings)
cd backend
python scripts/build_bundle.py --date 2026-11-21        # ../data + ../bundle/model.json -> mobile/assets/bundle
python scripts/make_fixtures.py                         # -> tests/golden/*.json (18 cases)
python -m pytest -q                                     # 65 passed
cd ../frontend && node scripts/sync-bundle.js           # copy the bundle into the app, hashes checked
```

Or run everything from the repo root with `python training/run_all.py`.

Update, Nov 21 (integration): the bundle is now built from the real repo-root data and the AI lane's model.json; see the integration entry under Deviations in the root AGENTS.md. The stub-era notes below about `bundle/model.json` and empty `sides.csv` are out of date.

Optional service: `uvicorn service.main:app --port 8000`.

`--date` sets the version prefix. The same data and the same date always give byte-identical files. If you rebuild with a new date or new data, run `make_fixtures.py` again, because the fixtures are pinned to the bundle version and the parity test tells you when they are out of date.

## What passes

| Deliverable | State | Evidence |
|---|---|---|
| 1. `scripts/build_bundle.py` | Done | Strict checks: unknown or missing columns and keys, empty sources, unknown `quality`, bad numbers, broken cross-references (dish to application, playbook and sides; playbook to crop; duplicate ids). On any error nothing is written and the previous bundle stays. The folder swap is atomic, there is one sha256 per file, and the build is deterministic. `quality`, `paper_id`, `page`, `quote`, `reviewed`, `evidence_level` and the estimated-weights notes are carried unchanged. Missing prices stay `null`. `model.json` is copied as opaque JSON and `manifest.modelIsStub` says whether it is a stub. 9 tests in `tests/test_bundle.py`. |
| 2. `scripts/make_fixtures.py` | Done | 15 golden cases: suggest in pantry and dish modes, budget filter with excluded reasons, peanut allergen (egusi), "price needed" for unpriced plants, "no data" for a missing need (African yam bean), `rankIngredients` (soy allergen; seed soup with peanut allergen), `recommendProcessing` fallback (same crop; thin bambara with labelled other crops; melon seed with other crops only; metric alias), and `safetyGuard` (an option blocked by `sr_cook_thoroughly`, crop warnings, a whole result blocked by a user allergen). |
| New engine code | Done | `reference/rank.py` (`rank_ingredients`), `reference/processing.py` (`recommend_processing`, fallback in full, model path for a documented linear format), `reference/safety.py` (`safety_guard`). `suggest.py` now ranks through `rank_ingredients`. All pure. |
| 3. Parity tests | Done | `tests/test_golden.py` rebuilds every case from the bundle and compares exactly. It also checks that the data path (`data/`) and the bundle path give the same results. |
| 4. `service/main.py` | Done | `/health`, `/bundle/latest` (`{version, sha256 of manifest.json, url}`), `/bundle/files/{name}` (only files listed in the manifest), `/explain` with the guard. Tests show an injected "99 naira" is rejected and replaced by the template, an unlisted ingredient ("peanut") is rejected, and faithful text passes. |
| 5. `reference/plate.py` | **Cut** | `reference_values.json` is `{}` and `sides.csv` is empty. Per the handoff, no reference values were invented. |

## Behaviour the mobile lane needs to know

- **Unpriced plants** are ranked by functional fit but get `score: null` and `costNgn: null` and carry the `"price needed"` flag. They always sort after priced plants, so they never become the headline pick. With today's data cowpea is the only priced plant, so it is the headline pick for every bean dish. Okpa (bambara only) and egusi soup (melon seed or groundnut) are excluded as "no usable protein … (price needed)".
- Each dish card has `alternatives` (the rest of the ranking) and `playbookIds`.
- **Processing goal** is a metric id (`phytate`, `tannin`, `trypsin_inhibitor`, `oxalate`, `foam_capacity`, …). Options are ordered as follows: playbook entries for the crop, then published rows for the same crop (best per treatment, at most 3), then up to 2 labelled rows from other crops, used only when same-crop rows are thin. Rows that a paper reports as cumulative stages say so in `evidence`.
- **Safety guard**:
  - A `block` rule removes only the options it matches. `sr_cook_thoroughly` withholds soak-only, sprout-only and raw-flour options and never one that includes a heat step.
  - If the plant matches the user's allergen list, the whole result is withheld.
  - Plant-level rules (mould, peanut/soy, jack bean) appear as warnings.
  - Each message ends with "(safety rule not yet reviewed by an expert)" while `reviewed` is false.
- **Model path** (`mode: "model"`) runs only if `model.json → metrics.<metric>` has `ships: true` and the linear format documented at the top of `reference/processing.py`. Predictions use a grid inside the observed range for that crop and treatment only, with ±1.96 × residual SD. In every other case the result falls back. There are no model-mode fixtures yet because `bundle/model.json` is still a stub.
- Bundle updates: fetch `/bundle/latest`, download the manifest and check its sha256, then download each file and check its sha256, validate, and swap. On any failure, keep the bundled copy.

## Known gaps (reported, not filled)

- Prices are missing for 8 of 9 ingredients.
- `sides.csv` is empty, so dish `side_items` are empty and there are no side costs.
- `reference_values.json` is empty, so there is no plate balance.
- `bundle/model.json` is a stub. Swap in the AI lane's file, rebuild, and remake the fixtures. If its format differs from the documented linear one, processing stays in fallback mode until `_model_options` is adapted.
- The data is the dev copy (`data/SOURCES.md` DEV DATA NOTICE): names are not normalised and rows are not spot-checked against the PDFs.
- **The handoff's gap list is out of date:** bambara now has 28 flour functional values, so it ranks for akara and moin-moin and is held back only by its missing price.
- The bambara `fermentation_lactic` row is withheld by `sr_cook_thoroughly` because the treatment name has no heat step, although the paper cooked the seeds first. The playbook version ("Cook the seeds first…") is shown. This is conservative and is left for the rule reviewer.
- All safety rules have `reviewed: false`. Whether pre-written code is allowed is still unconfirmed.
