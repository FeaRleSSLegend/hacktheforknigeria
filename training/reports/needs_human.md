# Needs a human decision (AI lane, Nov 20)

Each item: the question, what the pipeline does now, and the options. Nothing below was decided silently.

## Blocking for the akara demo

1. **Cowpea now has boiling, roasting and autoclaving rows (makinde2020), but still no soaking or dehulling rows.** All Makinde rows start from dehulled seed, so they say nothing about dehulling itself. For akara, the soak-and-dehull step still returns `no published data`.
   Options: (a) the data lane finds a cowpea soaking or dehulling paper; (b) the demo shows that state honestly and the cooking rows.
2. **The akara definition is a test fixture.** `data/applications.json` and `data/dishes.json` are empty, so the ranking check used `training/fixtures/TEST_FIXTURE_*.json` (foam capacity, foam stability, emulsion capacity higher; oil absorption lower; equal weights). Those needs and weights are placeholders, not expert judgement. The data lane must write the real definition with a mentor.
3. **Only cowpea has a price**, so the app ranking for akara has one competitor (score 0.5, drivers 0). Prices for bambara, soybean, pigeon pea, African yam bean, jack bean, groundnut, egusi and locust bean are not in the NBS table. Options: find verified market prices; or demo with cowpea only.
4. **Every paper row must be checked against the PDF before the demo.** `training/reports/verify_checklist.csv` lists 12 paper/table pairs (56 functional and 58 treatment rows) with columns for initials.

## Engine behaviour (backend lane)

5. **Resolved: the complete-coverage rule is implemented.** New consequence to check: a protein with no price is scored on fit and density only (weights renormalised), so it can outrank a priced one. With the akara test fixture, jack bean (no price, score 0.88) now beats cowpea (priced). Is that what you want, or should an unpriced protein rank below priced ones until the user enters a price?
5b. **Cowpea water absorption mixes whole and dehulled flour.** Makinde's 3 rows are dehulled flour; Arawande and Adediran do not say they dehulled. All are `form = flour`, so they share one median (2.12 g/g, range 1.65-2.51). Keep, or add a dehulled form?
5c. **Makinde tannin unit.** The quote says g/kg (raw 121.8 g/kg = 12 %), which is implausibly high for cowpea tannin. Percent change is unaffected, but check the unit against the PDF.

## Prices and units

6. **NBS labels without a unit are assumed per kg.** That includes Beans Brown (the cowpea price, 2465.96), all sides and the beef/chicken comparison. The xlsx has no unit column. Confirm from the NBS report text that items are per kg unless stated. If not confirmed, every price is unusable.
7. **Yam and plantain: price as sold vs composition per edible portion.** The WAFCT edible-portion coefficients are 0.83 (yam), 0.52 (unripe plantain) and 0.61 (ripe plantain). The price is per kg with peel. Options: (a) divide the as-sold grams by the coefficient when costing (calculated, cited to WAFCT); (b) leave it and flag (current); (c) drop yam and plantain from costing.
8. **Rice composition row.** `rice_local` uses WAFCT 01_037 (Rice, white, raw) and `rice_imported` uses 01_036 (white, polished, raw). Local rice is often parboiled. Confirm or choose another row.
9. **Garri yellow** has an NBS price but no WAFCT row. Left out. Option: reuse the white gari composition labelled `estimated`.
10. **Beans white** (2114.33) and **Local Rice (Broken)** (2564.95) are mapped but unused. Confirm.
11. **Mudu** is 1.52 kg in `units_mudu.csv` (50 kg / 33), not 1.5 as the docs say. Which number to show? Both are trade conventions (`estimated`).

## Composition cross-checks (no change made; WAFCT 2019 stays primary)

12. **WAFCT phytate unit is mg/100 g. This is resolved, but please confirm.** Sheet `02 Components` says mg, and raw cowpea (779 mg) matches PhyFoodComp anion exchange (median 752 mg). The "looks like g" values came from `wafct_selected.csv`, whose `phytate_mg` column actually holds alpha-linolenic acid (shifted one column). Do not use that file's phytate.
13. **PulsesDM vs WAFCT fat and iron differ by more than 15 % in 9 of 24 comparisons** (`training/reports/crosscheck_pulses_vs_wafct.csv`). Protein agrees within 15 % everywhere. Largest: pigeon pea Nigeria iron +49 %, cowpea India fat +69 % (small absolute numbers), cowpea Nigeria iron -24 %. Keep WAFCT and show the range? Or say nothing?
14. **Suspicious PhyFoodComp values:** soybean anion-exchange minimum 0.81 mg/100 g and bambara direct-precipitation 12.3 mg/100 g, against about 1000 mg elsewhere. These could be unit slips in the source. They are kept as published and used only for the cross-check.

## Processing model

15. **Nothing ships after batch 2.** Oxalate, phytate and water absorption now have 3 papers and a backtest, but 14-16 rows each, short of 30. Oxalate's model beats both baselines (MAE 28.6 vs 33.9) but fails the row rule. The pooled antinutrient run (44 rows, 3 papers) loses: model MAE 94.0 vs 40.2. In every fold the held-out paper has crops, treatments and times that the training folds never saw (0 held-out rows in training range), so the backtest measures extrapolation the app would never do. Pooling approval is moot while it loses. A useful next paper overlaps an existing crop and treatment (e.g. cowpea boiling at other times, or African yam bean germination from another lab).

## Batch 3 (Nov 20)

16. **Batch 2 originals were overwritten.** The batch-3 files were saved over `training/data/new_rows/new_*.csv`. Batch 2 (makinde2020) was rebuilt from `data/` into `new_rows/batch2/`; the rebuild reproduces the previous 139 treatment rows exactly. If you still have the original batch-2 files, put them in `new_rows/batch2/`. The top-level `new_rows/new_*.csv` files are now unused copies of batch 3 and can be deleted.
17. **Sobowale 2025 Table 5:** the bran tannin rows at 48 and 72 h look copied (left out). Phytate of about 1 mg/100 g may really be mg/g or g/100 g. Tannin jumps between hours. All 22 Sobowale tannin and phytate rows are marked NEEDS_HUMAN and excluded from training until someone checks the PDF. The 12 Sobowale oxalate rows come from the same table and are NOT excluded, because the brief only named tannin and phytate. Exclude them too? The whole-grain series (UWGF, WGFF24 to WGFF72) was not added.
18. **Abiodun 2011 cowpea water absorption** (0.9 mL/g) sits in the same median as Makinde's 2.33 g/g and is flagged `this_value_outlier`. It is probably a different method. Keep it in the median, or exclude it from the ranking median? Antinutrient units differ between papers (mg/kg, g/kg, mg/100 g), which is fine for percent change. Trypsin inhibitor change is coarse (one decimal).
19. **Mubaiwa 2018:** check the OCR'd least gelation integers. Soaking time and roasting temperature are missing, and water and oil absorption were not read.
20. **Ogunyinka 2017:** African locust bean values come from fermented-seed flour, flagged `processed_flour`. Locust bean is not in any dish yet. Before it is, decide whether fermented flour may stand in for raw flour.
21. **African yam bean and African locust bean are already in ingredients.csv** (WAFCT composition, no price), so no ingredient was added. African yam bean still lacks foam stability, emulsion capacity and oil absorption for the akara test fixture. Locust bean lacks least gelation, oil and water absorption, and emulsion stability.
22. **Bambara cultivars differ a lot.** Least gelation is 6-20 % (Adeleke 9-20 %, Mubaiwa 6-8 %; flagged `high_disagreement`) and foam stability 42-79 %. The median pools cultivars within a paper, so Adeleke's 3 cultivars outweigh Mubaiwa's 2. Bambara bulk density, oil and water absorption come from Adeleke only. Weight papers equally instead of rows?
23. **Bambara now ranks for akara (test fixture), above jack bean and cowpea on fit.** It has no price. The app pick for akara is jack bean (no price, score 0.71). This repeats item 5: unpriced proteins can outrank priced cowpea.
24. **Still no model:** water absorption (31 rows, 5 papers) loses to B0 (31.8 vs 19.8). Oxalate has 29 rows, one short of the rule, and its model loses anyway (63.8 vs 47.9). In every fold, 0 held-out rows fall inside the training range.

## Batch 4 (Nov 20)

25. **Akubor 2017:** boiled tannin printed "25 +0.4" (probably 2.5) was left out, as was toasted foam stability "2. 0e". Germinated trypsin inhibitor "0.08 +0.7" has an SD larger than the mean; keep it?
26. **Pokharel 2024 soaking time:** the methods say 18 h, the abstract and other sections 12 h; 12 h was used. Which is right?
27. **Ojha 2020:** water and oil absorption units are not printed (assumed g/g). Antinutrients exist only as a bar chart plus text percentages (fermentation phytate -69.5, tannin -69.3, oxalate -66.7; germination -61.6, -54.6, -61.6); these were not added. Add them as percent-only rows?
28. **Kanetro 2021 jack bean:** printed as % but the method gives g/g. Control flour moisture is 13.3 % vs 7 % treated, so part of the change may be moisture. Emulsion and foaming values were left out.
29. **Sharma 2019:** the text's emulsion activity range does not match the table, and foam stability was left out.
30. **Gandhi 2022:** emulsion was not determined for boiled samples, and tannin and phytate exist only in a figure.
31. **Bolade 2015:** values are means of three households, and the tannin units look large. Pressure cooking (gbegiri): the exact preceding stage is not stated (stage_order left blank).
32. **Models now ship (C3 for tannin, phytate and trypsin inhibitor; ridge for oxalate; C5 for bulk density).** Please review before the demo:
    - C3 pulls each treatment's mean toward the metric's overall mean (K = 5 rows), which distorts single-paper entries. The cumulative Bolade stages suffer most: `deep_frying|phytate` is -66.6 while all 4 cited rows are -85 to -89. `soaking|phytate` is -35.5, pooled from cowpea and mungbean, while cowpea's own Bolade soak rows are -15 to -21. Recommendation: when same-crop published rows exist for the asked treatment, the app shows those first (fallback rows) and the pooled prediction second, labelled "predicted, pooled from <crops>". Alternatively, keep cumulative-stage rows out of model training. Decide which.
    - Pooled values include different crops (mungbean, lentil, horse gram). Each entry lists its crops and `from_crops_not_in_ingredient_table`. The app must name them and never present the value as cowpea's own.
    - Ridge (oxalate): 0 held-out rows fell inside the training range, so the backtest measures transfer to new papers. It lost to B0 on Sobowale (72 vs 66).
    - Choosing the lowest-error candidate out of 6 on the same folds slightly flatters the winner; phytate C3 (27.8) and ridge (28.6) are close.
    - "Beats B0 clearly" was defined as MAE at most 90 % of B0 AND lower error than B0 on more than half of the held-out papers. Confirm this definition.
33. **Functional metrics still have no model:** water and oil absorption, foam capacity, swelling power and emulsion stability all fail; most do not beat "no change" on half the papers.
34. **Akara (test fixture):** pigeon pea gained functional rows (Akubor, Sharma). Fit order: bambara 0.62 > jack bean 0.45 > cowpea 0.38 > pigeon pea 0.27 (pigeon pea was 0.00). The app pick is still jack bean (no price). The real akara definition is still missing.

## Decisions taken (Nov 20)
- Items 5, 23 and 32 resolved: same-crop published rows first, pooled prediction only without them; cumulative stages excluded from training; unpriced proteins never headline; ship rule accepted.
- Consequence: with cumulative stages excluded, phytate (25 rows), tannin (26) and trypsin inhibitor (12) fall below 30 rows and STOP SHIPPING, although their best candidates still beat B0 by a wide margin (see reports/cumulative_exclusion_comparison.md). Only bulk density (C5) and oxalate (ridge) ship. More single-operation rows for these three metrics would bring them back.
- Edge case to confirm: in pantry mode, if the cook owns only unpriced proteins, the headline is a priced protein they must buy (the rule says unpriced is never headline). Entering a price for the owned item fixes it.

## Batch 5 (Nov 21, last data batch)

35. **Ijarotimi 2022 (groundnut):**
    - The trypsin inhibitor unit is not printed (the caption says mg/g).
    - Fermentation is 37 C 48 h in one place and "3 days" in the text.
    - Germination temperature is not stated.
    - Raw foaming capacity is 4.07 % as printed.
    - WAC and OAC were printed in %. Divided by 100 (`calculated`) they give 0.30 and 0.29 g/g, very low for a flour; check whether they are really % or g/g.
36. **Nagessa 2023 (black bean):** cooking times are printed as 1.47 h and 38 min; 1.47 h could mean 1 h 47 min. The germination tannin reduction is printed as 66.69 % at 48 h, but the table values give 62.5 %; table values were used. Soaking time used: 12 h (the paper also mentions a 16 h non-soaker test).
37. **Rizvi 2024:** the steeping time before germination is only in Figure 1, which was not read. Soak and germination rows are each against raw grains.
38. **Read but not used:** the "Unravelling the Impact of Dive..." review.
39. **Models that pass only thanks to other crops.** Under the unchanged rule, phytate (C3), tannin (ridge) and bulk density (ridge) ship, but none of them would pass on ingredient-crop rows alone (`ships_only_with_different_crop_rows: true`). The app labels their output "estimated from other legumes". Oxalate (ridge) also passes on ingredient crops alone. Trypsin inhibitor still has too few non-cumulative rows (24) to ship.

## Batch 6: applications, dishes, playbook, safety rules (Nov 21)

40. **All application weights are team estimates**; confirm them with a mentor before the demo. The akara weights assume foaming, water holding and low flour oil absorption matter most. Flour oil absorption is not frying oil uptake.
41. **Dish list and protein slots are judgement calls.** Jack bean is deliberately not a slot in any dish.
42. **Safety rules are all `reviewed: false`** and need a food scientist. Two need decisions:
    - `sr_cook_thoroughly` is `block` (it withholds soak-only, sprout-only or raw-flour results).
    - `sr_jack_bean_caution` is `warn` (consider `block`).
    - Also: `sr_fermentation_not_guaranteed` cites the Sobowale tannin range (-93.0 to +300.8 %). Those rows are marked NEEDS_HUMAN and excluded from training (item 17). The rule's own source text says they are not spot-checked; keep or replace that citation once the PDF is checked.
43. **Rules still without a source (not added):** infants and young children, pregnancy, kidney-stone or oxalate-restricted diets, home-fermentation hygiene.
44. **`reference_values.json` is still empty.** It needs a source for every number (for example the WHO/FAO/UNU protein requirement). Hide any label without a source.
45. **ijarotimi2022 Table 6:** tannin and trypsin inhibitor show the same percent change within the cooked sample (-34.42 vs -34.43) and within the cooked-fermented sample (-29.28 vs -29.27), as if one column were copied. Check Table 6 in the PDF.
46. **Playbook conditions** (times, temperatures) are shown only as "as measured in the study"; the app must not present them as safety thresholds.
47. **Side portions are estimates by the AI lane** (each side item carries `quality: estimated` and a note); confirm them:
    - akara: maize_white 50 g (dry maize for pap/ogi), tomato 50 g (tomato-pepper sauce)
    - moin_moin: maize_white 50 g (pap/ogi); the intent names no vegetable or sauce, so none was added
    - ekuru: rice_local 75 g dry (the starch), tomato 50 g (stew or pepper-sauce base)
    - gbegiri: garri_white 80 g dry (eba); the intent names no vegetable, so none was added
    - egusi_soup: yam 250 g fresh tuber as sold (pounded yam)
    - okpa: no side; its notes give no side intent
    - Not in sides.csv, so left out: bread and amala (yam flour), and leafy vegetables for egusi soup (intent "plus vegetables").
48. **The batch-6 prompt's expected gaps are out of date.** Bambara now has flour functional values (adeleke2018, mubaiwa2018), so akara, moin-moin and okpa rank bambara (with "price needed"); it is not a "no data" case. What remains:
    - African yam bean lacks foam stability and oil absorption (akara) and least gelation and emulsion capacity (moin-moin).
    - Melon seed lacks emulsion capacity, so egusi soup ranks groundnut alone. Groundnut's water and oil absorption (0.30 and 0.29 g/g, item 35) look implausibly low; check before trusting that dish.
    - Only one candidate can be ranked for okpa (single slot) and egusi soup.
    - In every dish only cowpea is priced; the other ranked proteins show "price needed".
