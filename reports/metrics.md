# Processing model: grouped cross-validation vs baselines

Generated 2026-11-21. Source: data/treatment_experiments.csv (558 rows used; 22 rows marked NEEDS_HUMAN excluded). Target: percent change against the untreated sample in the same paper; that sample's type (raw, dehulled, soaked, germinated) is a model feature. Validation: GroupKFold by paper (rows from one paper never split across train and test), alpha chosen by an inner grouped CV. B0 = predict no change. B1 = mean change of the same treatment in the training folds. MAE in percent points.

Ship rule: at least 30 rows AND model MAE below the better baseline. A metric with fewer than 3 papers cannot be cross-validated.

In range = held-out rows whose crop, treatment, time and temperature were inside the training folds. The app predicts only for such inputs, so when it is 0 the backtest measures extrapolation the app would never do; the model error there can be very large.

| Metric | Rows | Papers | Crops | Model MAE | B0 MAE | B1 MAE | In range | Shipped | Reason |
|---|---|---|---|---|---|---|---|---|---|
| bulk_density | 51 | 8 | 5 | 7.99 | 10.71 | 8.46 | 0 | yes | ridge passes the ship rule and has the lowest error |
| bulk_density_packed | 9 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| dispersibility | 12 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| emulsion_activity | 13 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| emulsion_capacity | 12 | 3 | 3 | 19.00 | 10.76 | 11.45 | 0 | no | 12 rows; at least 30 needed |
| emulsion_stability | 23 | 3 | 2 | 63.62 | 28.25 | 18.51 | 0 | no | 23 rows; at least 30 needed |
| energy | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| fat | 4 | 2 | 4 |  |  |  |  | no | 2 paper(s); grouped cross-validation needs at least 3 |
| fibre | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| foam_capacity | 50 | 8 | 6 | 54.04 | 46.44 | 57.10 | 0 | no | no candidate passes: MAE 54.04 not <= 90% of B0 46.44; better than B0 on only 3 of 8 papers |
| foam_stability | 15 | 3 | 3 | 33.81 | 35.50 | 30.32 | 0 | no | 15 rows; at least 30 needed |
| iron | 4 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| ivpd | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| least_gelation | 13 | 3 | 3 | 20.95 | 16.60 | 28.82 | 0 | no | 13 rows; at least 30 needed |
| oil_absorption | 57 | 9 | 7 | 17.28 | 15.97 | 17.88 | 0 | no | no candidate passes: MAE 17.28 not <= 90% of B0 15.97; better than B0 on only 2 of 9 papers |
| oxalate | 41 | 8 | 6 | 33.79 | 48.34 | 39.76 | 0 | yes | ridge passes the ship rule and has the lowest error |
| phytate | 43 | 8 | 9 | 13.57 | 30.14 | 16.75 | 0 | no | C3 (shrunk mean per treatment x metric) ships instead: lower error |
| polyphenols | 1 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| protein | 8 | 3 | 4 | 13.52 | 8.03 | 8.03 | 0 | no | 8 rows; at least 30 needed |
| saponin | 11 | 2 | 4 |  |  |  |  | no | 2 paper(s); grouped cross-validation needs at least 3 |
| starch_solubility | 9 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| swelling_capacity | 4 | 1 | 1 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| swelling_index | 3 | 1 | 3 |  |  |  |  | no | 1 paper(s); grouped cross-validation needs at least 3 |
| swelling_power | 40 | 4 | 3 | 26.53 | 18.37 | 23.14 | 0 | no | no candidate passes: MAE 26.53 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers |
| tannin | 44 | 9 | 9 | 16.65 | 46.33 | 27.04 | 0 | yes | ridge passes the ship rule and has the lowest error |
| trypsin_inhibitor | 24 | 6 | 7 | 19.67 | 54.80 | 31.44 | 0 | no | 24 rows; at least 30 needed |
| water_absorption | 64 | 11 | 8 | 22.54 | 19.14 | 20.75 | 0 | no | no candidate passes: MAE 22.54 not <= 90% of B0 19.14 |

Exploratory (not for shipping without approval): all antinutrient metrics pooled, metric as a feature. 164 rows from 11 papers after exclusions (186 rows from 11 papers including the NEEDS_HUMAN rows).

| Pooled | Rows | Papers | Crops | Model MAE | B0 MAE | B1 MAE | In range | Shipped | Reason |
|---|---|---|---|---|---|---|---|---|---|
| antinutrients | 164 | 11 | 9 | 22.26 | 41.68 | 27.70 | 0 | no | beats the better baseline in grouped cross-validation; not shipped: pooling needs human approval |

**Shipped models: 4.** Other metrics use the fallback.

All rows were transcribed from paper text and are not yet checked against the PDFs.
