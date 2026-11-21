# PROJECT.md (project name to be decided at the end)

Single source of truth for the project. Agents: read this and `AGENTS.md` fully before acting. If the two conflict, ask one specific question. Version 2.1 (core flow: suggest dishes from what you have, then teach how to make them).

## 1. Event facts and rules

- Event: Hack the Fork Nigeria 2026, Nov 20-21, Veritas University, Abuja.
- Build window opened Day 1 at 1:50 PM WAT. Final submission is Day 2 at 12:30 PM WAT.
- The organisers' guide says teams build the concept during the event. Whether pre-written code is allowed was never confirmed in writing. Treat all product code as written during the event.
- Judging stresses real AI contribution (a chatbot over a manual process does not count), honesty about limits, one clear user and one decision, and a working testable prototype.
- Scope limits from the guide: no insect protein, no unsupported claims.
- **Track 1: Alternative Protein Product Innovation. Challenge 1:** an AI tool that identifies and ranks promising Nigerian protein ingredients for a defined application, based on their functional properties.
- Open item: confirm with an organiser or mentor that this merged concept counts as Challenge 1.

## 2. The product in plain words

A phone app for ordinary Nigerian households on a tight budget. The user says what they have (or can buy), their budget for the meal and how many people they are feeding. Or they skip the pantry and pick a dish. The app:

1. **Suggests dishes** they can make. It ranks each plant protein against each dish by published functional properties (binding, foaming, emulsifying, water holding, solubility), with cost per gram of protein as a secondary criterion and the budget as a filter.
2. **Teaches how to prepare** the chosen dish's protein (soak, dehull, ferment, cook) using a small model trained on published experiments, with ranges and citations. If the data is too thin it shows the closest published conditions instead of a prediction.
3. **Balances the plate** by pairing the protein with sides (carbohydrate, vegetable, iron-rich foods) and showing four numbers for the plate: protein, energy, iron, fat.
4. **Works offline.** Everything above runs on the phone. When online, the app can fetch newer data and show nicer wording.

**One user:** a home cook on a budget (phone, patchy data, mixed literacy).
**One decision:** "With what I have and my budget, what can I make, and how do I prepare it?"

Why not just ask a general chatbot: every number here comes from a table with a source and a quality flag. An LLM, if used, only rephrases numbers the engine already computed. The app works with the LLM off.

### Core flow (this is the product; everything else is an add-on)

1. **Input:** what you have or can buy, budget in naira for this meal, number of people. Or skip the pantry and pick a dish.
2. **Suggest:** ranked dishes. Each card shows the plant protein it would use, how well that plant suits the dish, protein per plate, the cost of anything you are missing, and flags. Budget is a filter and a number on the card.
3. **Prepare:** tap a dish to get sourced steps, expected effect with a range, evidence level and safety notes.
4. **Plate:** suggested sides and four numbers (protein, energy, iron, fat).
5. **Shopping list (add-on, only after the core works):** the "missing items" from step 2, added up and shareable.

This is still Challenge 1: the ranking is plant against dish by functional properties. "I have these, what can I make" is the same ranking read the other way round.

**One dish first.** Build the whole flow for one dish end to end (akara-style with cowpea or bambara: suggest, prepare, plate, offline) before adding dishes. Then add dishes one at a time. If the data lane runs behind, one complete flow is still demoable.

**Cost shown is protein and sides only.** Oil, pepper and spices are not in our price data, and the card says "excludes oil and spices".

## 3. Scope

**In:** dish suggestion, ranking, processing recommendation, plate balance, budget, allergen filter, safety guard, offline mode, limits panel, model card, evaluation report. After the core works: shopping list.

**Out (do not build):** store or restaurant finder, marketplace, accounts, payments, leaderboards or gamification, price-history charts, 3D or generated food images, insect protein, medical or health claims, diet plans for medical conditions, on-device LLM.

**Stretch (online only, cut first):** AI-written recipe text, photo of pantry to list ingredients (vision lists items, the user confirms, numbers still come from tables), Pidgin language option.

## 4. Architecture: offline-first and safety-first

```
 [Dev machine, offline pipeline]                [Phone, runs with no network]
  data/*.csv + data/*.json                        Expo React Native app (TypeScript)
        |                                          |-- bundle/*.json   (data + model + version)
  scripts/validate_data.py                         |-- engine/         (pure TS functions)
  scripts/train_processing.py  --> model.json      |     sizing, scoring, processing model,
  scripts/build_bundle.py      --> bundle/*.json   |     plate balance, safety guard
        |                                          |-- screens + design system
        +----- copied into app assets -----------> |-- local storage (prefs only)
                                                   |
 [Optional online service, FastAPI]  <--- only when network is available
   GET  /bundle/latest   newer data bundle (version + sha256)
   POST /explain         LLM wording of engine output (guarded)
   POST /recipes, /pantry-vision   (stretch)
```

### 4.1 Offline-first rules
- First launch with no network must work: all data and the trained model ship inside the app as JSON.
- The model is a regularised linear regression, so inference is a dot product in TypeScript. No ML runtime on the phone.
- No network call on the critical path. All network access goes through `src/lib/net.ts` with a short timeout and a clear offline state.
- Online adds only: (a) a newer data bundle, (b) friendlier wording of the same numbers, (c) stretch features. A badge shows "Offline: standard guidance" or "Online: enhanced".
- Bundle update: download, validate against the schema, verify sha256, then swap atomically. Any failure keeps the bundled copy. The checksum checks integrity only, not authorship; signing is out of scope.
- Demo check: every milestone is shown once in airplane mode.

### 4.2 Safety-first rules
- **Safety guard** (`engine/safety.ts`) runs on every result before display. Rules live in `safety_rules.json` with a source, severity (`block` or `warn`) and a `reviewed` flag. A `block` rule withholds the step and shows why.
- Starting rules (each needs a source, and a food scientist or mentor should review them): cook legumes thoroughly and never recommend raw or undercooked beans; apply the user's allergen list (soy, groundnut and others); basic hygiene for soaking and fermenting (clean containers, discard if it smells off or shows mould); infants, pregnancy and medical conditions: "ask a health worker".
- The app never states numeric safety thresholds (boil minutes, fermentation limits) unless a source supports them. Otherwise use plain wording such as "cook until fully soft".
- **No health claims.** Show numbers (for example fat per serving) and sourced steps. Never say a food causes or treats a condition.
- **Model gate:** a model ships for a given outcome metric only if it beats the baseline in grouped cross-validation. Otherwise that metric uses the fallback (nearest published rows). Predictions are only made inside the range of the training data.
- **LLM guard:** generated text may only mention ingredients and numbers that appear in the engine output. Anything else is discarded and a template sentence is used.
- **Privacy:** no accounts, no analytics. Body weight and preferences stay on the device. Online requests contain ingredient ids only, never weight or identity.

## 5. Screens

1. **Start:** tick what you have (or search plants), set budget in naira and number of people, optional body weight; or pick a dish directly. Offline badge.
2. **Suggestions:** ranked dish cards: dish and protein name, functional fit, protein per plate, missing items and their cost, a "why" line (top drivers), badges (measured or estimated, evidence strength), flags (allergen, missing data).
3. **Prepare:** steps for the chosen plant: treatment, time, temperature or "until soft", expected effect with range, sources, evidence level, safety notes. A "fallback" label when it shows published conditions instead of a prediction.
4. **Plate:** protein plus suggested sides; four numbers (protein, energy, iron, fat); simple low/ok/high labels against a stated guideline; legume-plus-grain pairing note.
5. **About and limits:** always one tap away and shown as a banner: what is measured, what is estimated, what is not validated in a lab, model card and backtest table.

All screens need loading, empty and error states, 48 dp touch targets, readable contrast, large-text support, and short plain wording.

## 6. Data tables (in `data/`)

Every row has a `source`, a `quality` flag (`measured`, `read_from_figure`, `calculated`, `estimated`) and, where it comes from a paper, `paper_id`, `page` and a short `quote`. Estimates need a reason in `notes`. Never invent a measured number. Missing values stay missing and the engine reports the exclusion.

| File | Purpose | Columns (key ones) |
|---|---|---|
| `ingredients.csv` | Composition and price | `ingredient_id, name, local_names, form_sold, protein_g_per_100g, fat_g, energy_kcal, iron_mg, water_g, price_ngn_per_kg, price_month, price_source, allergen_tags, quality, source` |
| `functional_properties.csv` | Published functional values | `ingredient_id, property, value, unit, form (flour/concentrate/isolate), ph, method_note, paper_id, page, quote, quality` |
| `applications.json` | What each use needs | `id, name, needs:[{property, direction(higher/lower), weight}], notes` (weights are expert-judgement estimates, labelled so) |
| `dishes.json` | Dishes the app can suggest (start with about 8; build one first) | `id, name, application_id, protein_slot_ids[], side_items[{id, as_sold_g_per_serving}] (portions are estimates), playbook_ids[], notes` |
| `treatment_experiments.csv` | Training table for the processing model | `exp_id, crop_id, part, treatment, time_h, temp_c, ph, outcome_metric, baseline_value, treated_value, change_pct, paper_id, page, quote, method_note, quality` |
| `playbook.json` | Sourced preparation steps | `id, crop_id, goal, steps[], conditions, effect, why (optional one sourced line on what the step does), evidence_level, sources[]` |
| `sides.csv` | Carbohydrate, vegetable, iron-rich sides | same composition columns as ingredients, plus `food_group` |
| `safety_rules.json` | Safety guard rules | `id, applies_to, severity, text, source, reviewed` |
| `units.csv` | Local measures | from `units_mudu.csv` |
| `SOURCES.md` | Every source, how used, caveats | free text |

Files already in hand (carry over): `wafct_protein_verified.csv` (FAO/INFOODS West African FCT 2012; 34 rows with protein, water, fat; boiled values are calculated, not measured), `nbs_prices_history.csv` (NBS monthly national averages for brown beans, boneless beef, frozen chicken; 66 table rows and 16 press-quote rows to verify), `units_mudu.csv` (1 mudu of beans or grains is about 1.5 kg, an estimate until someone weighs it).

Known gaps: WAFCT energy and iron columns for ingredients and sides; prices for soy, bambara, egusi, mushroom; functional values and treatment experiments (to be extracted from papers). Treatment outcomes are stored as percent change against the untreated sample in the same paper, because methods differ between papers.

## 7. Calculations (reference implementation in Python, ported to TypeScript, same fixtures)

**Protein sizing.** Target protein per meal `T` g: user choice, default one third of the daily guideline (0.8 g per kg body weight per day, a general estimate for adults, not medical advice). `as_sold_g = T / (protein_g_per_100g_as_sold / 100)`. `cost_ngn = as_sold_g / 1000 * price_ngn_per_kg`. `cost_per_g_protein = cost_ngn / T`. Without a body weight the app asks for `T` directly.

**Candidates.** Singles and, as a stretch, two-ingredient blends at 10% steps. Hard constraints: budget, allergens, missing required data (excluded with a reason).

**Dish suggestion.** For each dish: candidates are the ingredients in `protein_slot_ids` (in `pantry` mode, those the user has rank first and the rest are treated as items to buy; in `dish` mode the user picked the dish). Score each candidate for the dish's application as below. `missing_cost = sum(cost of items not in the pantry)`; `total_cost = protein cost + side costs`, all scaled to `servings`. The budget is money the user must spend, so drop dishes whose `missing_cost` exceeds the budget (listed under excluded with the reason). Rank dishes by the overall score of their best candidate. Cost excludes oil and spices.

**Shopping list (add-on).** Sum of `missing_items` for the chosen dishes, with prices and their source month.

**Functional fit.** For each need `k` in the application: take the ingredient's median value (and min-max range) for that property within one `form`. Scale across candidates to 0-1 (invert if direction is lower). `fit = sum(w_k * d_k)`. Ranges are carried through so uncertainty is shown. Ingredients with no value for a needed property are marked "no data" for that need and the fit is computed on the available needs with a visible flag.

**Overall score.** `0.50 * fit + 0.30 * cost_score + 0.20 * protein_density_score` (default weights, estimated, shown in the model card). **Drivers** = `w_k * (score_k - mean_k)`, the top two shown as plain text.

**Processing model.** For each outcome metric with enough rows (at least 30, to be checked at training time): features are crop (one-hot), treatment (one-hot), `time_h`, `temp_c`, `time_h^2`, `time_h x temp_c`; target is `change_pct`; model is `Ridge`. Validation is `GroupKFold` by `paper_id` (never split rows of one paper across train and test). Baseline is the mean `change_pct` per treatment. Report MAE for model and baseline, and R-squared. Interval is plus or minus 1.96 times residual SD from cross-validation. Recommendation = grid search over the observed range of time and temperature for that crop and treatment (no extrapolation), top 3 conditions, with intervals. A metric ships a model only if its grouped-CV MAE is lower than the baseline's. Otherwise it ships the fallback.

**Fallback.** Show the nearest published experiments (same crop and treatment, closest conditions) with citations and say "no prediction available".

**Plate balance.** Plate totals for protein, energy, iron, fat from the chosen protein plus up to two suggested sides, picked greedily to fill the biggest gap within the remaining budget. Compare against reference values stored in `data/reference_values.json` with a source for each. If a reference has no source, the label is hidden. A legume plus cereal pairing sets a "complementary proteins" note.

## 8. On-device interfaces (TypeScript, pure functions, no I/O)

```
suggestDishes(input: PlanInput, bundle: Bundle): SuggestResult
  PlanInput  = { mode: "pantry" | "dish", pantryIds: string[], dishId?: string, budgetNgn: number, servings: number, targetProteinG: number, allergens: string[] }
  SuggestResult = { dishes: DishSuggestion[], excluded: { id, reason }[], bundleVersion: string }
  DishSuggestion = { dishId, name, protein: RankedItem, missingItems: { id, costNgn }[], totalCostNgn, proteinPerPlateG, flags: string[] }

rankIngredients(applicationId: string, input: PlanInput, bundle: Bundle): RankedResult   // used inside suggestDishes
  RankedResult = { items: RankedItem[], excluded: { id, reason }[], bundleVersion }
  RankedItem = { ingredientId, score, fit, fitRange, costNgn, costPerGProtein, asSoldG, drivers: string[], flags: string[], quality: Record<string,string> }

recommendProcessing(ingredientId: string, goal: string, bundle: Bundle): ProcessingResult
  ProcessingResult = { mode: "model" | "fallback", options: { treatment, timeH?, tempC?, instruction, effect, effectRange, sources: string[], evidence: string }[], note: string }

checkPlate(plate: PlateInput, bundle: Bundle): PlateResult
  PlateResult = { totals: { proteinG, energyKcal, ironMg, fatG }, status: Record<string, "low"|"ok"|"high"|"unknown">, suggestedSides: string[], notes: string[] }

safetyGuard(result: ProcessingResult | PlateResult, ctx): { allowed: boolean, warnings: string[], blocked: string[] }
```

The Python reference engine uses the same camelCase keys as these interfaces in its inputs and outputs, so golden fixtures can be compared with the TypeScript output directly.

Optional online endpoints (FastAPI, never required): `GET /health`, `GET /bundle/latest`, `POST /explain` (input: engine output; output: reworded text, rejected if it adds facts), stretch `POST /recipes`, `POST /pantry-vision`.

## 9. Design system and UI stack

- React Native with Expo, TypeScript strict, `expo-router`.
- Components: **React Native Paper** (Material Design 3). Use `react-native-reusables` (shadcn-style for React Native) only if Paper blocks a specific need, and record it in `AGENTS.md` under Deviations.
- Icons: `@expo/vector-icons` (MaterialCommunityIcons).
- Animation: `react-native-reanimated` for transitions, bars and counters; `lottie-react-native` only for one or two small illustrations. Respect the reduced-motion setting.
- Design system: one theme file `src/theme/` with tokens (color roles for light and dark, type scale, spacing 4/8/12/16/24, radius, elevation) built on the Paper MD3 theme. An open-source React Native design system from GitHub may be used as reference only, and only with a permissive licence (MIT or Apache-2.0); read its LICENSE first and do not copy code with an unclear licence.
- Skills for agents: mobile (Expo, React Native), UI design, animation. Details in `AGENTS.md` section 5.

## 10. Evidence we show (also what the pitch uses)

- Processing model: grouped-CV table per metric (model MAE, baseline MAE, rows, papers) and which metrics shipped a model or the fallback. If regression does not beat the baseline, we say so.
- Data coverage: rows per crop and per metric, number of papers, share of values that are measured, read from a figure, or estimated.
- Sanity checks that must pass: soy ranks above cowpea on protein density; cost per gram of protein is reproducible by hand for three ingredients; every shown number has a source.
- Limits panel lists every estimated input category, the fact that nothing was lab-tested by the team, and that published values come from different methods.
- Wording rules: "predicted", "published", "estimated". Never "proven", "tastes like", "healthy", "cures".

## 11. Milestones, what each returns, and check loops

Order: M0 first. Then M1 (data) and M2 (reference engine in Python, including `suggestDishes`, and the processing model) in parallel; the data and AI lanes come first. The backend service (bundle builder, optional FastAPI) runs alongside. The mobile front end starts in the evening once M3 results exist; until then the fixtures are the contract. Then M3, M4, M6. M5 last and cuttable.

| # | Milestone | Time box | Returns (done when) |
|---|---|---|---|
| M0 | Foundations: Expo app boots on a phone, theme tokens, `data/` with carried-over files, bundle schema and loader, validation script | 1 h | App shows bundle version on a phone in Expo Go; `python scripts/validate_data.py` and `npm test` pass |
| M1 | Data lane (continuous): functional properties, treatment experiments, playbook, applications, safety rules, sides | until 9 PM, then overnight | Tables validate; `SOURCES.md` covers every row; coverage report prints rows per crop and metric |
| M2 | Reference engine in Python and processing model training | 3 h | Tests pass; `reports/metrics.json` with model vs baseline; `bundle/*.json` and golden fixtures written |
| M3 | TypeScript engine on device | 2 h | Jest passes; TS outputs match Python fixtures on all cases; safety guard tests pass |
| M4 | Screens: Start, Ranking, Prepare, Plate, About; states; offline badge; accessibility | 3 h | Full flow runs in Expo Go in airplane mode; no crashes; limits visible |
| M5 | Online extras: `/bundle/latest`, `/explain` with guard, optional stretch | 1.5 h | App works identically with the service off; guard rejects an injected unsupported number in a test |
| M6 | Evidence and polish: backtest slide table, animations, model card, README, demo script | rest | `npx tsc --noEmit` clean, tests green, 3-minute demo rehearsed offline |

**Loops (how agents work):**
- **Build loop (every task):** write the test first, implement, run, read the failure, fix. Two fixes at most for one error, then apply the cut list and report.
- **Milestone check loop:** run the milestone's checks (tests, type check, manual run on a phone), record the result in the report, then move on.
- **Data loop:** extract rows from a paper, validate, print coverage, then target the crop or metric with the fewest rows next.
- **Demo loop:** after every milestone, run the full user flow in airplane mode once.

**Cut list (in order):** online extras, photo input, animations, blends, sides suggestion (keep plate totals for the chosen protein only), processing model (keep fallback). The ranking engine, the honest labels, the safety guard and offline mode must survive every cut.

## 12. Team lanes

- **Data:** read papers, fill the tables (including the dish list and each dish's functional needs), keep `SOURCES.md`. This lane decides whether the product works, so it gets the most people.
- **AI (starts now):** Python reference engine (`suggestDishes`, ranking, sizing, plate), processing model training, grouped cross-validation, baseline, `model.json`, metrics report, golden fixtures, data validation.
- **Backend:** bundle builder and versioning (`build_bundle.py`), optional FastAPI service (`/bundle/latest`, `/explain` with the LLM guard), hosting. The TypeScript port of the engine follows the AI lane's fixtures.
- **Mobile (later this evening):** Expo app, design system, screens, offline behaviour, accessibility; consumes the bundle and the TypeScript engine.

## 13. Three-minute pitch outline

1. The problem: protein costs about 4 times more per gram from beef than from beans (our NBS-based calculation, to be re-checked), and many households cannot meet the guideline.
2. The user and decision: a home cook on a budget choosing a plant protein and how to prepare it.
3. Demo, offline: "I have beans and 1,500 naira": see the dish suggestions with reasons, open one and see the sourced preparation steps, then the plate balance.
4. The AI: ranking from published functional properties plus a model trained on published experiments, with a backtest against a simple baseline shown honestly.
5. Safety and honesty: offline, private, safety guard, limits panel, what is not validated in a lab.
6. Next: weigh local measures, add more crops, expert review of rules, lab validation.

## 14. Risks and open questions

- Track fit: confirm with organisers that this counts as Challenge 1.
- Pre-written code rule: unconfirmed.
- The organisers' resource pack may contain functional-property data. Check it first.
- Data thinness: papers on these crops are limited; methods differ. Mitigations: percent change within paper, grouped CV, fallback mode.
- Safety rules need a food scientist or mentor review. Until then they are labelled unreviewed.
- Reference values for energy and iron must be sourced before any low/ok/high label is shown.
- The 1.5 kg per mudu figure is a trade convention, not a measurement.
- A phone demo needs Expo Go on a device on the same network, or a built APK (optional, cut if it costs time).

- Dish list and each dish's functional needs are judgement calls. Agree them with a mentor and mark the weights as estimated.
