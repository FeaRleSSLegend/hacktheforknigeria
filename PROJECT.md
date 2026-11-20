# Swap & See: Project Reference

Read this when you are lost. It is the single source of truth for what we are building, why, and how the pieces fit. If this file and the code disagree, tell the human; do not silently pick one.

## 1. Event facts

- Event: Hack the Fork Nigeria 2026, Veritas University, Abuja. 20-21 November 2026.
- Build starts: Day 1, 1:50 PM (WAT). Hall closes 9 PM Day 1, reopens 8:30 AM Day 2. Teams may work online overnight.
- Final submission deadline: Day 2, 12:30 PM. Final pitches and demos: 12:30-1:30 PM. Jury evaluation after lunch.
- Mentor checkpoints: Day 1 2:50 PM and 4:50 PM (technical and evidence review). Day 2 final support is optional.
- Team size: 2 to 5.
- Scope rules from the organisers' guide:
  - Stay within alternative proteins, especially plant-based and relevant fermentation applications.
  - Do not drift into insect-based protein.
  - Do not claim experimental, market, or model performance that has not been demonstrated.
  - Do not make the solution depend on inaccessible proprietary data.
  - Do not build a generic AI product and attach an alternative-protein label to it.
  - Keep the prototype focused on one clear problem and one user decision.
- AI must be a meaningful part of the solution. A chatbot layer over a manual process does not count.
- Required deliverables (guide section 13): problem definition, working prototype, AI component explanation, evidence (tests, examples, benchmarks), user value, limitations, next step.
- Judging criteria: problem fit, AI contribution, evidence and technical quality, user value and feasibility, Nigeria/ecosystem relevance, prototype quality, clarity and communication.

## 2. What we are building

**Swap & See** helps a school cafeteria manager replace the meat or fish in a dish with a plant-based option, within a protein budget, and preview the result in 3D.

- **User:** a school cafeteria manager. Not a restaurant, not a street vendor. They are not technical.
- **Decision:** "For this dish, which plant-based swap should I serve, given my budget and what my students need?"
- **Track and challenge:** Track 2 (Commercialisation and Market Development), Challenge 2 (plant-based menu innovation). The price layer also speaks to Challenge 3 (where plant protein is actually cheaper).
- **Pitch line:** "One canteen, one budget, one decision, and you can see what you are serving before you cook it."

### Three views in the app

1. **Swaps:** ranked plant-based alternatives for one dish with cost, protein, similarity, drivers, flags, and a 3D preview.
2. **Price per protein:** naira per 100 g of protein, plant vs animal, so the cafeteria sees where plants are cheaper.
3. **Forecast:** price trend for one ingredient from a linear regression, with an uncertainty band and honest backtest numbers.

### In scope

- 3 to 5 dishes, 8 to 12 ingredients, one cafeteria user type.
- A scoring and optimisation engine (singles and two-ingredient blends).
- Linear regression price trend per ingredient, evaluated on a time-based hold-out.
- A procedural 3D plate driven by ingredient traits.
- A visible limitations panel and data-quality badges.

### Out of scope (do not build)

- Marketplace, vendor listings, checkout, payments, accounts, auth.
- Live text-to-3D or any external 3D generation API.
- Photo matching or image search.
- Claims about taste, student acceptance, health outcomes, or lab performance.
- Insect protein, cultivated meat.
- Deep learning.

## 3. How it works (flow)

1. User picks a dish, number of plates, protein budget (naira per plate for the protein part), allergens to avoid, and optional weights.
2. Backend loads the dish and its original animal protein from `data/`.
3. Candidates = all plant ingredients, minus allergen conflicts. Blends = every pair at 10% share steps, plus singles.
4. Hard constraints remove candidates: over budget, protein ratio below the minimum, allergen conflict, missing data. Removed items are returned in `excluded` with a reason.
5. Remaining candidates are scored. Top N are returned with a score breakdown and drivers.
6. Frontend shows the ranked list. Selecting one shows the 3D plate using that candidate's `render_traits`.
7. The forecast model can optionally supply a projected price instead of the latest price.

## 4. Data

All data lives in `data/`. Every row needs a source and a quality flag. If a value is estimated, say so. Never invent a measured value.

### `data/ingredients.csv`

| Column | Type | Meaning |
|---|---|---|
| id | string | snake_case, unique (e.g. `soy_chunks`) |
| name | string | Display name |
| type | string | `plant`, `fungi`, or `animal` |
| yield_factor | float | Cooked or rehydrated weight divided by as-sold weight (e.g. dry soy chunks about 2 to 3; fresh mushroom about 1) |
| price_ngn_per_kg | float | Latest price per kg as sold |
| price_date | YYYY-MM | When that price was observed |
| price_source | string | Market, report, or URL |
| price_quality | string | `measured` or `estimated` |
| protein_g_per_100g_cooked | float | Protein per 100 g of cooked weight |
| protein_source | string | Table name or URL |
| protein_quality | string | `measured` or `estimated` |
| fibrousness, firmness, moisture | float 0-1 | Texture traits (estimated unless a source exists) |
| umami, smoky, savoury, spice_carry | float 0-1 | Flavour traits (estimated) |
| browning | float 0-1 | How much it browns when cooked (feeds 3D) |
| prep_effort | float 0-1 | 0 = trivial, 1 = very hard in a canteen kitchen |
| colour_hex | string | Cooked colour for 3D |
| allergens | string | Pipe-separated (e.g. `soy|`, `groundnut|`); empty if none |
| trait_quality | string | `estimated` unless sourced |
| notes | string | Rationale for any estimated trait |

Animal rows (chicken, beef, fish) use the same columns, so originals and swaps are scored on the same scale.

### `data/dishes.json`

List of objects: `id`, `name`, `animal_ingredient_id`, `portion_cooked_g` (cooked weight of the protein part per plate), `notes`. Start with three dishes: jollof rice with chicken, suya-style beef, egusi soup with beef. Replace or extend if the organisers' resource pack provides examples.

### `data/prices_history.csv`

Columns: `ingredient_id`, `month` (YYYY-MM), `market`, `price_ngn_per_kg`, `source`. One row per ingredient per month per market. The forecast uses a monthly series per ingredient (average across markets).

### `data/SOURCES.md`

One line per source: what it is, URL, date accessed, what we took from it. Any estimated value must be listed here with the reason.

### Where to look (verify each before use)

- Protein composition: FAO/INFOODS West African Food Composition Table; USDA FoodData Central as a cross-check.
- Prices: WFP market price monitoring for Nigeria (check the Humanitarian Data Exchange), NBS food price reports, plus a small hand-collected table from local markets.
- Population or household context (optional): NBS publications.

If a source cannot be reached from the workspace, ask the human to download and upload the file. Do not guess numbers.

## 5. Calculations

Notation: for a candidate made of components `i` with shares `s_i` that sum to 1.

- `as_sold_g = portion_cooked_g * s_i / yield_factor_i`
- `cost_ngn_per_plate = sum( as_sold_g / 1000 * price_ngn_per_kg_i )` (use forecast price if requested)
- `protein_g = sum( portion_cooked_g * s_i * protein_g_per_100g_cooked_i / 100 )`
- `protein_ratio = protein_g / original_protein_g`
- `cost_per_100g_protein = cost_ngn_per_plate / protein_g * 100`
- Traits of a blend are the share-weighted average of component traits. This assumes linear mixing; state it as an assumption in the UI.
- `flavour_similarity = 1 - mean(|candidate_t - original_t|)` over umami, smoky, savoury, spice_carry.
- `texture_similarity = 1 - mean(|candidate_t - original_t|)` over fibrousness, firmness, moisture.
- `prep_effort` of a blend = max over components.

### Hard constraints (candidate excluded if violated)

- `cost_ngn_per_plate <= protein_budget_ngn`
- `protein_ratio >= min_protein_ratio` (default 0.8)
- No component allergen is in the user's avoid list.
- All required fields present.

### Score

Each sub-score is in 0..1:

- `cost_score = clamp(1 - cost_ngn_per_plate / protein_budget_ngn, 0, 1)`
- `protein_score = clamp(protein_ratio, 0, 1)`
- `flavour_score = flavour_similarity`
- `texture_score = texture_similarity`
- `prep_score = 1 - prep_effort`

`score = sum(w_k * score_k)` with weights summing to 1. Default weights: cost 0.30, protein 0.25, flavour 0.20, texture 0.15, prep 0.10. If the user sets weights, normalise them to sum to 1.

### Drivers (explanation)

For each returned candidate, `driver_k = w_k * (score_k - mean_k)` where `mean_k` is the mean of that sub-score across all feasible candidates. Return the two largest positive drivers as plain-language strings (e.g. "Much cheaper than other options"). If no driver is positive, say the candidate is average on all factors.

### Default protein budget

If the user does not enter one, use the original animal protein's cost per plate.

## 6. Models (what is trained, and how we prove it)

### Price trend (the one trained model)

- Model: scikit-learn `LinearRegression`, one per ingredient, fit on `y = price` vs `x = month index`.
- Optional seasonality: add month-of-year dummies only if an ingredient has 24 or more monthly points. Otherwise trend only.
- Minimum data: 6 monthly points. Below that, return `low_confidence: true` and no forecast.
- Evaluation: time-based split. If n >= 9, hold out the last 3 months. Report MAE, MAPE, R-squared on the hold-out, and a naive baseline (carry the last training value forward). If the regression does not beat the baseline, say so in the UI.
- Interval: forecast plus or minus 1.96 times the residual standard deviation. Label it as approximate.
- Output: `backend/models/forecast.joblib` and `reports/metrics.json`, produced by `scripts/train_forecast.py`.

### Not trained (deliberately)

- The similarity scoring and optimiser are transparent formulas, not learned models. Judges can inspect them, and with this little data a learned model would overfit.
- An LLM, if used, only turns the numbers into plain sentences. It never chooses a swap, never edits a number, and the app must work with the LLM off (template text).

### Stretch only (do not start before the core is done)

- Survey logistic regression: if the team collects 100 or more consented survey responses on willingness to switch, fit scikit-learn `LogisticRegression` and show an acceptance estimate with the survey size beside it.

### Evidence to produce for the pitch

1. Backtest table: regression vs naive baseline on hold-out months.
2. Baseline comparison: our top swap vs "cheapest only" on cost, protein, similarity.
3. Sanity checks: at least 3 swaps reviewed against domain knowledge; record the mentor's comments at checkpoint 2.
4. A limitations slide listing every estimated input.

## 7. API contract

Base URL `http://localhost:8000`. JSON. CORS allows `http://localhost:5173`. All errors return `{"detail": "..."}` with a correct status code.

- `GET /health` returns `{"status": "ok"}`.
- `GET /dishes` returns a list of `{id, name, animal_ingredient_id, portion_cooked_g, original_protein_g, original_cost_ngn}`.
- `GET /ingredients` returns every ingredient row with provenance fields.
- `POST /swap`
  - Request: `{dish_id, plates (int), protein_budget_ngn (float or null), allergens ([str]), weights ({cost, protein, flavour, texture, prep} or null), min_protein_ratio (float, default 0.8), use_forecast (bool, default false), horizon_months (int 0-3, default 0), max_results (int, default 5)}`
  - Response: `{dish, original: {cost_ngn, protein_g, traits}, candidates: [...], excluded: [{ingredient_id, reason}], limitations: [str], generated_at}`
  - Each candidate: `{rank, label, components: [{ingredient_id, share}], cost_ngn_per_plate, cost_ngn_total, protein_g, protein_ratio, flavour_similarity, texture_similarity, prep_effort, score, score_breakdown: {cost, protein, flavour, texture, prep}, drivers: [str], flags: [str], render_traits: {fibrousness, firmness, moisture, browning, colour_hex}, data_quality: "measured" | "mixed" | "estimated"}`
- `GET /price-per-protein` returns `[{ingredient_id, name, type, cost_ngn_per_100g_protein, data_quality}]`, sorted ascending.
- `GET /forecast/{ingredient_id}?horizon=3` returns `{history: [{month, price}], fitted: [{month, price}], forecast: [{month, price, low, high}], metrics: {n, mae, mape, r2, naive_mae} or null, low_confidence}`.
- `POST /explain` (optional) takes one candidate and returns `{text}`. Template text by default; LLM only if `ANTHROPIC_API_KEY` is set, and numbers must be passed in and never changed.

`data_quality` is `measured` only if every used price and protein value is measured, `estimated` if all are estimated, otherwise `mixed`. Trait estimates are always disclosed separately in `limitations`.

## 8. Frontend

- Stack: Vite, React, TypeScript, Tailwind, shadcn/ui. (Material UI only if shadcn setup fails and cannot be fixed in 15 minutes.)
- Layout: left control panel, right results area with tabs (Swaps, Price per protein, Forecast).
- Controls: dish select, plates input, protein budget input (placeholder shows the default), allergen checkboxes (soy, groundnut, others from data), weight sliders, "use forecast price" switch.
- Results: ranked cards with rank, label, cost per plate and total, protein ratio, two similarity bars, drivers, flags, data-quality badge. Selecting a card updates the 3D panel.
- A persistent alert: "Prices and protein are marked measured or estimated. Flavour, texture and appearance are estimates. Not taste-tested."
- Loading: skeletons. Errors: readable message with a retry. Empty result: explain which constraints removed everything and offer to relax them.
- Mobile-friendly is nice, desktop projector view is the priority. High contrast, large text for demo.

## 9. 3D preview

- Libraries: three, @react-three/fiber, @react-three/drei.
- Procedural only. No external model files, no generation APIs.
- Scene: plate, a starch mound (rice or soup base) built with instancing, and protein pieces.
- Mapping from `render_traits`:
  - `colour_hex` sets the base colour; `browning` darkens edges.
  - `fibrousness` sets stripe frequency and contrast of a generated canvas bump/normal texture.
  - `moisture` lowers roughness (shinier) as it rises.
  - `firmness` sets piece corner roundness and count (firmer means crisper edges).
- OrbitControls, soft lighting, an environment preset, limited triangle count (under about 200k).
- Always show the caption: "Predicted appearance, not a photo."
- Fallback if WebGL fails: a static SVG plate with colour only.

## 10. Honesty rules (these protect our score)

- Label every input measured or estimated. Show it.
- Say "predicted similarity", never "tastes like".
- Say "estimated from a small price history" on forecasts. Show the backtest, including when it is poor.
- No claims about health, acceptance, or lab validation.
- If data is missing, exclude the candidate and say why. Do not fill silently.

## 11. Milestones and the cut list

| Milestone | Done when |
|---|---|
| M0 Repo and data | Folders exist, three CSV/JSON files load without errors, SOURCES.md filled for every row |
| M1 Engine | `POST /swap` returns ranked candidates for all dishes; unit tests pass |
| M2 Forecast | `train_forecast.py` writes metrics; `/forecast` and `/price-per-protein` work |
| M3 UI | Controls and Swaps tab work end to end against the live API |
| M4 3D and charts | 3D plate reacts to the selected candidate; Forecast and Price tabs render |
| M5 Polish and evidence | Limitations panel, backtest table, baseline comparison, pitch deck notes |

If time runs short, cut in this order: (1) 3D becomes the SVG plate, (2) forecast tab becomes a table, (3) blends become singles only, (4) drop the optional endpoints. The ranking engine and the honest labels must survive every cut.

## 12. Pitch outline (3 minutes)

1. Problem (20 s): cafeterias want plant-based options but cannot tell what fits their budget.
2. Live demo (60 s): pick a dish, set a budget, see ranked swaps, click one, see the 3D plate.
3. The AI (40 s): optimiser and similarity scoring; regression price trend; why not an LLM for the numbers.
4. Evidence (30 s): backtest vs naive baseline, comparison with "cheapest only".
5. Limits (15 s): what is estimated, what is not claimed.
6. Next step (15 s): pilot with one school cafeteria and a tasting panel.

## 13. Open questions for the human

- Are pre-written files and code allowed before the build starts? Has the organisers' resource pack arrived?
- Which three dishes does the team want first?
- Which cities or markets will the price data cover?
