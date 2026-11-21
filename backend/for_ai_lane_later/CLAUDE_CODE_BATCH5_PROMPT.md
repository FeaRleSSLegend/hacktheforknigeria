# Prompt for Claude Code: ingest batch 5 (last data batch), re-run the same rule

Put `new_treatment_experiments.csv` and `new_functional_properties.csv` from this batch in `training/data/new_rows/batch5/`. Do not overwrite batches 2, 3 or 4. Paste everything below the line from the repo root.

---

Read `AGENTS.md` and `PROJECT.md` again. Raw files stay read-only. Report briefly when done.

## A. Ingest batch 5 (3 papers, 78 treatment rows, 5 functional rows)

| paper_id | Crop | Treatments | Metrics | Rows |
|---|---|---|---|---|
| ijarotimi2022 | **groundnut** (Akure, Nigeria; a real ingredient) | boiling (30 min, 100 C), germination (4 days), boiling_fermentation, germination_boiling_fermentation | tannin, oxalate, phytate, trypsin_inhibitor, bulk_density, foam_capacity, oil_absorption, water_absorption, emulsion_capacity | 36 + 5 functional |
| nagessa2023 | black bean (Phaseolus vulgaris, Mozambique) | soaking, soaking_alkaline (0.05 % NaHCO3), germination 24 h and 48 h, soaking_boiling, soaking_pressure_cooking | phytate, tannin | 12 |
| rizvi2024 | lima bean (India) and adzuki bean (India) | soaking 12 h and 24 h, germination 24, 48, 72 h | phytate, tannin, trypsin_inhibitor | 30 |

Steps:
1. Same validation as before (schema, recompute `change_pct`, unknown quality values fail). `page` is a table label.
2. **Crops.** `black_bean`, `lima_bean`, `adzuki_bean` are not ingredients. Keep them as treatment-effect evidence from a different crop with `crop_group` legume, other, exactly like mungbean and lentil. Never show their numbers as an ingredient's values. `groundnut`: check `ingredients.csv`. If groundnut is an ingredient, these are same-crop rows and groundnut now has its own published antinutrient rows; show them first in the fallback. If it is not in the table, treat it like the others and tell me.
3. **Cumulative rows.** In ijarotimi2022, `boiling_fermentation` (FGN) and `germination_boiling_fermentation` (GCF) are cumulative from raw: mark `cumulative_from_raw = true` and exclude them from training, like Bolade. `boiling` (CGN) and `germination` (GGN) are single treatments and stay in training. In nagessa2023 `soaking_boiling` and `soaking_pressure_cooking` are named two-step recipes (soak 12 h then cook), the same kind as Pokharel's `soaking_boiling`; keep them in the soak-boil family, not cumulative.
4. Baselines (`baseline_type`): ijarotimi2022 raw kernel flour (RGN); nagessa2023 untreated raw bean flour; rizvi2024 raw grains 0 h. New treatment names: `soaking_alkaline`, `soaking_pressure_cooking`, `boiling_fermentation`, `germination_boiling_fermentation`. New metric: none (`emulsion_capacity` already exists).
5. Add the papers to `data/SOURCES.md` and the verify checklist. Add to `needs_human.md`:
   - **ijarotimi2022:** trypsin inhibitor unit is not printed (table caption says mg/g for the whole table); fermentation is given as 37 C 48 h and also "3 days" in the text; germination temperature not stated; foaming capacity of raw groundnut is only 4.07 %, as printed; WAC/OAC printed in % (functional rows divided by 100, `calculated`).
   - **nagessa2023:** cooking times printed as 1.47 h (ordinary) and 38 min (pressure); could be 1 h 47 min, check. Germination tannin reduction printed 66.69 % at 48 h but the table values give 62.5 %. The soaking time used for processing is 12 h (the paper also mentions a 16 h non-soaker test). I used the table values.
   - **rizvi2024:** the steeping time before germination is shown in Figure 1 only (soak-only samples are 12 and 24 h); I did not read the figure. Soak and germination rows are each versus raw grains.
   - Read but not used: "Unravelling the Impact of Dive..." review (not extracted, a review).
6. Re-run `python training/run_all.py`.

## B. Same models, same rule, no changes

Do not lower the bar and do not add candidates. The rule is unchanged: at least 30 rows, at least 3 papers, beats B0 clearly in leave-one-paper-out, ridge must also beat B1. Run C1 to C5 and the old ridge as before. Report:
- Rows and papers per metric now, with and without the different-crop rows, and with and without cumulative rows. (Phytate and tannin should rise by about 18 rows each if pooled across crops; trypsin inhibitor by about 12; oxalate by 2; same-crop groundnut rows are only 2 non-cumulative per metric.)
- For phytate, tannin, trypsin inhibitor, oxalate: does any candidate now ship under the unchanged rule? Give error, B0 error, rows, papers and the per-paper error range.
- If a metric ships only because of rows from a different crop, say so in the model JSON and in the report (`trained_on_crops`). The app must label the output "estimated from other legumes", never as the ingredient's own value.
- For groundnut: what the fallback now returns for boiling and germination of groundnut, and whether it shows the same-crop cited rows first.
- Any ranking change for any ingredient (groundnut especially).

## C. Do not do
- No invented numbers. No lowering the bar. No different-crop number shown as an ingredient's own value. No tuning of the rule to make a model ship.
