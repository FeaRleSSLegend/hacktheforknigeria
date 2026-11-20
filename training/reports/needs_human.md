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
