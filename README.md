# ProteinPath

An offline phone app for budget households in Nigeria. You tell it what you have (or the dish you want), your budget and how many people you are feeding. It suggests which local beans and seeds suit dishes like akara and moin-moin, shows how to prepare them, and says what the published evidence found.

Hack the Fork Nigeria 2026, Track 1 (Alternative Protein Product Innovation), Challenge 1: rank Nigerian protein ingredients for a defined application by their functional properties.

- **Ranking** compares published functional properties (foaming, water and oil holding, gelling, emulsifying) of each plant for each dish, plus cost per gram of protein and protein per 100 g.
- **Preparation steps** and their effects come from cited papers. Every result passes a safety guard before it is shown.
- **Offline first.** All data ships inside the app. Nothing in the demo needs a network.

## Run the app on your phone (about 5 minutes)

You need a current LTS version of [Node.js](https://nodejs.org) on your computer, and the **Expo Go** app on your phone (Play Store or App Store). The phone and the computer must be on the same Wi-Fi network.

```
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on Android, or with the Camera app on iPhone. The app opens on the Start screen.

**Try the demo flow:**
1. On Start, keep "What do I have?", tick **Ewa**, pick a **₦1,500** budget and **4** people.
2. Tap **Show what I can make**. You see ranked dishes, and below them the dishes that are not available yet, with the reason.
3. Tap **Akara** to see the sourced steps, "What the papers found" and the safety notes.
4. Tap the **i** button at the top of any screen for About and limits.
5. Turn on **airplane mode** and repeat steps 1 to 4. Everything still works.

If the QR code does not connect (for example on hotel or venue Wi-Fi), run `npx expo start --tunnel` instead.

## Check the app (tests)

```
cd frontend
npx tsc --noEmit      # type check
npx jest              # 28 tests: engine parity with Python (15 golden cases), screens, safety
```

## Rebuild the data and the Python engine (backend)

You need Python 3.10 or newer.

**Windows (PowerShell or Command Prompt):**
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/validate_data.py
python scripts/build_bundle.py --date 2026-11-21
python scripts/make_fixtures.py
python -m pytest -q
```

**macOS or Linux:** the same, but activate with `source .venv/bin/activate`.

| Command | What it does |
|---|---|
| `validate_data.py` | Checks every data table and writes a coverage report to `reports/coverage.json` |
| `build_bundle.py` | Builds the app data bundle in `backend/mobile/assets/bundle/`, with a sha256 per file. It refuses to build on unknown columns, missing sources or bad quality flags |
| `make_fixtures.py` | Writes the 15 golden test cases in `backend/tests/golden/` that the app must match exactly |
| `pytest` | 62 tests: engine, bundle checks, parity, the optional service |

**After rebuilding the bundle**, copy it into the app (this checks every sha256) and rerun the app tests:
```
cd frontend
node scripts/sync-bundle.js
npx jest
```

**Optional online service** (the app never needs it): from `backend/`, run `uvicorn service.main:app --port 8000`. It serves `/health`, `/bundle/latest` and `/explain`, which has a guard that rejects any number or ingredient not in the engine output.

## Project layout

```
backend/
  data/            data tables (CSV and JSON), each row with a source and a quality flag
  reference/       Python reference engine: rank, suggest, processing, safety
  scripts/         validate, build bundle, make fixtures
  service/         optional FastAPI service with the text guard
  tests/           pytest, plus golden/ fixtures shared with the app
  reports/         coverage and BACKEND_STATUS.md
frontend/
  src/app/         screens: Start, Suggestions, Prepare, About and limits
  src/engine/      TypeScript port of the engine (pure functions)
  src/bundle/      zod schemas and the bundle loader
  src/theme/       design tokens and the light and dark theme
  assets/bundle/   the data bundle that ships in the app (generated, do not edit)
  __tests__/       jest tests
PROJECT.md         product, formulas and interfaces
AGENTS.md          build rules and recorded deviations
```

## Honest limits

- Nothing here was tested in a lab by us. Every number comes from published papers, the FAO/INFOODS West African food composition table, or NBS market prices.
- Published values come from different labs and methods.
- Only cowpea has a market price today. Other plants are ranked by fit and marked "price needed".
- How much each property matters for each dish, the score weights and the portions are team estimates.
- All safety rules are **not yet reviewed by an expert**, and the app says so on every safety message.
- Preparation advice comes from published experiments, not a prediction. The model file in this branch is a placeholder until the AI lane's model is merged.
- No health claims. No accounts, no tracking: budget, body weight and choices stay on the phone.
- Plate balance (energy, iron, fat with sides) is not built yet, because the reference values are not sourced.

More detail: [backend/reports/BACKEND_STATUS.md](backend/reports/BACKEND_STATUS.md) and [frontend/FRONTEND_STATUS.md](frontend/FRONTEND_STATUS.md).
