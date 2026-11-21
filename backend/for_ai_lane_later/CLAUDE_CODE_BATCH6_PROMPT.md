# Prompt for Claude Code: load applications, dishes, playbook and safety rules (drafts)

Put `applications.json`, `dishes.json`, `playbook.json` and `safety_rules.json` from this batch in `data/` ONLY IF the current files there are empty (`[]`). If any already has content, merge by `id` and tell me what clashed. Paste everything below the line from the repo root.

---

Read `AGENTS.md` and `PROJECT.md` again. Report briefly when done.

## 1. Validate and load
- Schemas are in PROJECT.md section 6. Check: every `application_id` in dishes exists; every `protein_slot_ids` entry is an `ingredients.csv` id; every `playbook_ids` entry exists in `playbook.json`; every application's weights sum to 1; every need `property` exists in `functional_properties.csv`; every safety rule has `source` and `reviewed`.
- `playbook.json` effect numbers were computed from the treatment rows in `treatment_experiments.csv` and the batch files (percent change vs untreated, min / median / max across rows). Recompute them from the merged table with your canonical metric names and fail if any differ by more than 0.1. I normalised `phytate_mg100g`, `wac_pct`, `oac_pct`, `lgc_pct`, `foam_capacity_pct`, `bulk_density_loose` to `phytate`, `water_absorption`, `oil_absorption`, `least_gelation`, `foam_capacity`, `bulk_density`; use whatever your merged names are.
- **Do not change any number or source text.** Do not add citations or steps that are not in the file.

## 2. Fill `side_items`
`dishes.json` has `side_items: []` on purpose. Using the ids in `data/sides.csv`, add one carbohydrate and one vegetable or sauce item per dish matching the "Side intent" in each dish's `notes`, with `as_sold_g_per_serving` as an estimate. List every portion you chose in `needs_human.md` as an estimate. If a side is not in `sides.csv`, leave it out and say so.

## 3. Check what the ranking does
Run the reference engine for each dish and report, per dish: ranked candidates, which needs have no data per candidate (flagged, not filled), and any dish where only one candidate can be scored. Known expected gaps: bambara has no flour functional values, so `akara`, `moin_moin` and `okpa` will show "no data" for bambara; `okpa` has one slot only. Do not invent values to fill gaps and do not change weights to change a ranking.

## 4. needs_human.md additions
- All application weights are team estimates; confirm with a mentor before the demo. The akara weights assume foaming, water holding and low flour oil absorption matter most; flour oil absorption is not frying oil uptake.
- Dish list and protein slots are judgement calls. Jack bean is deliberately not a slot in any dish.
- Safety rules are all `reviewed: false` and need a food scientist. Two need decisions: `sr_cook_thoroughly` is `block` (withholds soak-only, sprout-only or raw-flour results) and `sr_jack_bean_caution` is `warn` (consider `block`).
- Rules still without a source (not added): infants and young children, pregnancy, kidney-stone or oxalate-restricted diets, home-fermentation hygiene.
- `reference_values.json` is still empty: it needs a source for every number (for example the WHO/FAO/UNU protein requirement); hide labels without a source.
- ijarotimi2022 (batch 5): tannin and trypsin inhibitor show the same percent change for the cooked and the cooked-fermented sample (-34.4 and -29.3). Check Table 6 in the PDF.
- Playbook steps use the conditions of the study (times, temperatures) only as "as measured in the study"; the app must not present them as safety thresholds.

## 5. Do not do
No invented numbers or sources. No lowering the ship rule. Keep `reviewed: false` on every safety rule.
