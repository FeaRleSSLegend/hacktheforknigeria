# HANDOFF: backend lane. Read this first, then `repo/PROJECT.md` and `repo/AGENTS.md`

Sat Nov 21 2026, about 07:15 WAT. **Submission is today at 12:30 PM WAT.** The AI/data lane owner has no working laptop and does not know what was last pushed to GitHub. So: **do not wait for or pull anything.** Everything you need to start is in this package (`repo/`). **You do not need to train a model.**

## Setup (5 minutes)
```
cd repo
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt pandas numpy pytest fastapi "uvicorn[standard]" pydantic httpx
python -m pytest -q            # 12 tests pass
python scripts/validate_data.py   # 0 errors, 9 warnings (prices missing)
```
Start a git repo here if there isn't one (`git init`), commit the starter as the first commit, and work on a branch. When the AI-lane owner's laptop is back, their work will be merged into yours or yours into theirs; keep your files separate (`scripts/build_bundle.py`, `scripts/make_fixtures.py`, `service/`, `tests/`) so merging is easy.

## What the product is (30 seconds)
Offline-first, safety-first Expo React Native app for budget households in Nigeria (Track 1 Alternative Protein, Challenge 1). The user says what they have, a budget and how many people (or picks a dish). The app ranks local plant proteins for each dish by published functional properties (foaming, water and oil absorption, emulsifying, gelation), shows sourced preparation steps with effects and ranges from published experiments, checks plate balance, and runs a safety guard on every result. Data and the small model ship inside the app as JSON; nothing on the critical path needs a network. Name undecided.

## What is in `repo/`
| Path | State |
|---|---|
| `PROJECT.md`, `AGENTS.md` | The product and rules. Interfaces are in PROJECT.md section 8. |
| `reference/` | Python reference engine: `loader.py`, `sizing.py`, `scoring.py`, `suggest.py` (`suggest_dishes`, pantry and dish modes, budget and allergen filters). Works on the data here. No plate or processing code in this starter. |
| `data/` | Real tables, DEV copies: 9 ingredients (price for cowpea only), 121 functional values, 682 treatment rows from about 40 papers, plus 4 JSON files from batch 6: 4 applications, 6 dishes (akara first), 18 playbook entries computed from cited rows, 5 safety rules (all `reviewed: false`). `sides.csv`, `reference_values.json` are empty. See the notice at the bottom of `data/SOURCES.md`. |
| `bundle/model.json` | **A stub.** The real model is trained by the AI lane. Treat model.json as an opaque JSON file: validate that it is JSON, copy it into the bundle, hash it. |
| `tests/fixtures/` | Synthetic, TEST ONLY. Never copy into `data/`. |
| `for_ai_lane_later/` | Prompts for the AI-lane owner. Ignore. |

## About the model (so you build around the right thing, without training it)
- It is small by design: a per-metric lookup or tiny linear model over "percent change versus untreated", evaluated on the phone as plain arithmetic. No ML runtime.
- A model **ships for a metric only if** it passes the rule (at least 30 rows, at least 3 papers, clearly beats the no-change baseline in leave-one-paper-out). Otherwise that metric uses the **fallback**: cited published rows, same crop first, then labelled rows from other crops.
- As of the last report two metrics ship a model (bulk density, oxalate); phytate, tannin and trypsin inhibitor use the fallback. This may change; your code must handle both modes.
- Contract: `recommendProcessing(ingredientId, goal, bundle) -> { mode: "model"|"fallback", options: [{treatment, timeH?, tempC?, instruction, effect, effectRange, sources[], evidence}], note }` (PROJECT.md section 8). **Build the fallback path fully now from `playbook.json` and `treatment_experiments.csv`; leave the model path as a clean interface that reads whatever `model.json` says.** Fixtures for the model path wait until the real model.json arrives.
- Honest claim for the pitch: two small models validated on unseen papers, a ranking engine with ranges and missing-data flags, and a fallback that cites published rows when data is thin. No more.

## Your deliverables, in this order (cut from the bottom)
1. **`scripts/build_bundle.py`** reads `data/*.csv`, `data/*.json`, `bundle/model.json` and writes `mobile/assets/bundle/*.json` plus `manifest.json` (`version` = date plus short hash; file list; sha256 per file). Deterministic. Validate each file; fail on unknown keys, missing sources or unknown `quality` values. Carry unchanged: `quality`, `paper_id`, `page`, `quote`, `reviewed`, `evidence_level`, the estimated-weights notes. Missing prices stay null.
2. **`scripts/make_fixtures.py`**: golden JSON cases from the Python engine, camelCase keys per PROJECT.md section 8. Cover: `suggestDishes` in pantry and dish modes; budget filter and the excluded-with-reason list; an allergen filter (groundnut or soy); an unpriced ingredient (shown as "price needed", never headline); a candidate missing a functional need ("no data" flag); `rankIngredients`; `recommendProcessing` in fallback mode (same-crop rows first, then labelled other-crop rows, cumulative rows labelled); `safetyGuard` with a `block` and a `warn` (`sr_cook_thoroughly` is a block). Write `reference/processing_step.py`-style fallback code and `reference/safety.py` if they don't exist; keep functions pure.
3. **Parity tests** that reload each fixture and check the Python engine reproduces it.
4. **`service/main.py`** (FastAPI, optional online layer): `GET /health`; `GET /bundle/latest` returns `{version, sha256, url}` from the manifest; `POST /explain` takes engine output and returns reworded text, and the **LLM guard** rejects any text that mentions an ingredient or number not in the engine output and falls back to a template sentence. No accounts or analytics; ids only. Test the guard with an injected fake number.
5. `reference/plate.py` only if `reference_values.json` is sourced (it is empty; labels without a source are hidden; do not invent values).

## Rules (from `AGENTS.md`, non-negotiable)
- Never invent a measured number, a source, or a safety threshold. Missing stays missing.
- No numeric boil or fermentation limits unless sourced; use "cook until fully soft".
- No health claims. Wording: "predicted", "published", "estimated"; never "proven", "healthy", "cures".
- Every safety rule is `reviewed: false`; the app shows them as unreviewed. Do not flip it.
- Application weights and dish portions are team estimates and are labelled estimated.
- Cost is protein plus sides only and says "excludes oil and spices".
- Engine functions are pure (no I/O). Commit small; no secrets.

## Known gaps (report, do not fill)
Prices for 8 of 9 ingredients; bambara has no flour functional values (shows "no data" for akara, moin-moin, okpa); dish `side_items` are empty until `sides.csv` is built; transcribed rows are not yet spot-checked against the PDFs; the organisers have not confirmed whether pre-written code is allowed.

## Finish
Write `reports/BACKEND_STATUS.md`: what passes, what is cut, the exact commands to rebuild the bundle and fixtures. If you are stuck for more than 15 minutes, stop and ask the human one specific question.
