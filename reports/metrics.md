# Processing model: grouped cross-validation vs baselines

Generated 2026-11-20. Source: data/treatment_experiments.csv (283 rows used; 22 rows marked NEEDS_HUMAN excluded). Target: percent change against the untreated sample in the same paper; that sample's type (raw, dehulled, soaked, germinated) is a model feature. Validation: GroupKFold by paper (rows from one paper never split across train and test), alpha chosen by an inner grouped CV. B0 = predict no change. B1 = mean change of the same treatment in the training folds. MAE in percent points.

Ship rule: at least 30 rows AND model MAE below the better baseline. A metric with fewer than 3 papers cannot be cross-validated.

In range = held-out rows whose crop, treatment, time and temperature were inside the training folds. The app predicts only for such inputs, so when it is 0 the backtest measures extrapolation the app would never do; the model error there can be very large.

| Metric | Rows | Papers | Crops | Model MAE | B0 MAE | B1 MAE | In range | Shipped | Reason |
|---|---|---|---|---|---|---|---|---|---|
| bulk_density | 28 | 4 | 3 | 16.40 | 8.50 | 8.50 | 0 | no | 28 rows; at least 30 needed |
| bulk_density_packed | 9 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| dispersibility | 12 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| emulsion_capacity | 6 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| emulsion_stability | 6 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| energy | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| fat | 4 | 2 | 4 |  |  |  |  | no | 2 paper(s); grouped cross-validation needs at least 3 |
| fibre | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| foam_capacity | 25 | 4 | 4 | 35.99 | 33.63 | 32.08 | 0 | no | 25 rows; at least 30 needed |
| foam_stability | 6 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| iron | 4 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| ivpd | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| least_gelation | 9 | 2 | 2 |  |  |  |  | no | 2 paper(s); grouped cross-validation needs at least 3 |
| oil_absorption | 24 | 3 | 3 | 327920.52 | 19.95 | 31.11 | 0 | no | 24 rows; at least 30 needed |
| oxalate | 29 | 5 | 4 | 63.81 | 47.90 | 47.90 | 0 | no | 29 rows; at least 30 needed |
| phytate | 17 | 4 | 4 | 58.10 | 33.00 | 33.00 | 0 | no | 17 rows; at least 30 needed |
| polyphenols | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| protein | 8 | 3 | 4 | 13.52 | 8.03 | 8.03 | 0 | no | 8 rows; at least 30 needed |
| saponin | 3 | 1 | 3 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| starch_solubility | 9 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| swelling_capacity | 4 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| swelling_index | 3 | 1 | 3 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| swelling_power | 21 | 2 | 2 |  |  |  |  | no | 2 paper(s); grouped cross-validation needs at least 3 |
| tannin | 13 | 3 | 4 | 13389.52 | 54.64 | 54.64 | 0 | no | 13 rows; at least 30 needed |
| trypsin_inhibitor | 8 | 3 | 4 | 23.68 | 61.77 | 61.77 | 0 | no | 8 rows; at least 30 needed |
| water_absorption | 31 | 5 | 4 | 31.81 | 19.75 | 30.37 | 0 | no | model MAE 31.81 does not beat the better baseline 19.75 |

Exploratory (not for shipping without approval): all antinutrient metrics pooled, metric as a feature. 68 rows from 5 papers after exclusions (90 rows from 5 papers including the NEEDS_HUMAN rows).

| Pooled | Rows | Papers | Crops | Model MAE | B0 MAE | B1 MAE | In range | Shipped | Reason |
|---|---|---|---|---|---|---|---|---|---|
| antinutrients | 68 | 5 | 4 | 128.01 | 47.21 | 47.21 | 0 | no | model MAE 128.01 does not beat the better baseline 47.21 |

**Shipped models: 0.** Every metric uses the fallback: the nearest published rows with citations, no prediction.

All rows were transcribed from paper text and are not yet checked against the PDFs.
