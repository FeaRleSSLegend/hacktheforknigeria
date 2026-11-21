# Processing-effect candidates vs no change (B0)

Grouped CV by paper (GroupKFold, n_splits = min(5, papers)); every paper is held out once. Ship rule: >= 30 rows, >= 3 papers, MAE <= 90% of B0 and better than B0 on more than half of the held-out papers; ridge must also beat B1; lowest-error passing candidate ships. MAE in percent points of change. Per-paper range = lowest and highest mean error over held-out papers. 'Papers < B0' = held-out papers where the candidate beats no change.

- **B0**: no change
- **C1**: mean per family x metric
- **C2**: median per family x metric
- **C3**: shrunk mean per treatment x metric
- **C4**: direction and size bin
- **C5**: linear in time, temp, crop group (in range only)
- **R**: ridge (crop, treatment, time^2, baseline type)

## Antinutrient family pooled (phytate, tannin, oxalate, trypsin inhibitor, saponin, polyphenols; report only)

256 rows, 12 papers, 9 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 48.77 | 48.77 | 34.4-65.7 | 0/12 | no | baseline |
| C1 | 30.21 | 48.77 | 12.5-69.8 | 10/12 | yes | passes the ship rule |
| C2 | 30.52 | 48.77 | 13.4-74.6 | 10/12 | yes | passes the ship rule |
| C3 | 25.07 | 48.77 | 11.9-69.5 | 11/12 | yes | passes the ship rule |
| C4 | 30.02 | 48.77 | 11.9-73.6 | 10/12 | yes | passes the ship rule (bin acc 0.36, direction acc 0.91; B0 bin acc 0.02) |
| C5 | 30.61 | 48.77 | 11.3-71.9 | 10/12 | yes | passes the ship rule (linear part used for 17% of rows) |

## bulk_density

53 rows, 8 papers, 5 crops. Chosen: **R**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 11.38 | 11.38 | 0.6-25.7 | 0/8 | no | baseline |
| C1 | 9.55 | 11.38 | 3.9-24.2 | 6/8 | yes | passes the ship rule |
| C2 | 9.52 | 11.38 | 3.8-24.6 | 6/8 | yes | passes the ship rule |
| C3 | 8.54 | 11.38 | 4.6-27.0 | 5/8 | yes | passes the ship rule |
| C4 | 8.66 | 11.38 | 4.4-24.3 | 6/8 | yes | passes the ship rule (bin acc 0.55, direction acc 0.58; B0 bin acc 0.25) |
| C5 | 9.10 | 11.38 | 4.1-23.3 | 6/8 | yes | passes the ship rule (linear part used for 34% of rows) |
| R | 8.47 | 11.38 | 4.5-25.3 | 5/8 | yes | passes the ship rule |

## emulsion_capacity

14 rows, 3 papers, 3 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 9.57 | 9.57 | 5.2-13.4 | 0/3 | no | baseline |
| C1 | 10.16 | 9.57 | 5.8-12.9 | 1/3 | no | 14 rows < 30; MAE 10.16 not <= 90% of B0 9.57; better than B0 on only 1 of 3 papers |
| C2 | 10.16 | 9.57 | 5.8-12.9 | 1/3 | no | 14 rows < 30; MAE 10.16 not <= 90% of B0 9.57; better than B0 on only 1 of 3 papers |
| C3 | 13.19 | 9.57 | 8.8-17.5 | 0/3 | no | 14 rows < 30; MAE 13.19 not <= 90% of B0 9.57; better than B0 on only 0 of 3 papers |
| C4 | 10.33 | 9.57 | 6.4-12.9 | 1/3 | no | 14 rows < 30; MAE 10.33 not <= 90% of B0 9.57; better than B0 on only 1 of 3 papers (bin acc 0.29, direction acc 0.29; B0 bin acc 0.50) |
| C5 | 10.16 | 9.57 | 5.8-12.9 | 1/3 | no | 14 rows < 30; MAE 10.16 not <= 90% of B0 9.57; better than B0 on only 1 of 3 papers (linear part used for 0% of rows) |
| R | 17.41 | 9.57 | 11.8-22.1 | 0/3 | no | 14 rows < 30; MAE 17.41 not <= 90% of B0 9.57; better than B0 on only 0 of 3 papers |

## emulsion_stability

23 rows, 3 papers, 2 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 28.25 | 28.25 | 23.2-32.6 | 0/3 | no | baseline |
| C1 | 36.70 | 28.25 | 14.3-48.6 | 2/3 | no | 23 rows < 30; MAE 36.70 not <= 90% of B0 28.25 |
| C2 | 36.34 | 28.25 | 14.3-48.6 | 2/3 | no | 23 rows < 30; MAE 36.34 not <= 90% of B0 28.25 |
| C3 | 36.44 | 28.25 | 27.1-39.7 | 1/3 | no | 23 rows < 30; MAE 36.44 not <= 90% of B0 28.25; better than B0 on only 1 of 3 papers |
| C4 | 58.47 | 28.25 | 14.3-88.8 | 2/3 | no | 23 rows < 30; MAE 58.47 not <= 90% of B0 28.25 (bin acc 0.22, direction acc 0.30; B0 bin acc 0.17) |
| C5 | 36.70 | 28.25 | 14.3-48.6 | 2/3 | no | 23 rows < 30; MAE 36.70 not <= 90% of B0 28.25 (linear part used for 0% of rows) |
| R | 63.62 | 28.25 | 35.0-84.8 | 0/3 | no | 23 rows < 30; MAE 63.62 not <= 90% of B0 28.25; better than B0 on only 0 of 3 papers |

## foam_capacity

52 rows, 8 papers, 6 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 44.85 | 44.85 | 10.9-80.9 | 0/8 | no | baseline |
| C1 | 44.82 | 44.85 | 24.6-70.7 | 4/8 | no | MAE 44.82 not <= 90% of B0 44.85; better than B0 on only 4 of 8 papers |
| C2 | 46.45 | 44.85 | 24.9-76.9 | 4/8 | no | MAE 46.45 not <= 90% of B0 44.85; better than B0 on only 4 of 8 papers |
| C3 | 53.94 | 44.85 | 24.6-82.8 | 1/8 | no | MAE 53.94 not <= 90% of B0 44.85; better than B0 on only 1 of 8 papers |
| C4 | 64.44 | 44.85 | 24.9-94.2 | 2/8 | no | MAE 64.44 not <= 90% of B0 44.85; better than B0 on only 2 of 8 papers (bin acc 0.25, direction acc 0.48; B0 bin acc 0.12) |
| C5 | 45.07 | 44.85 | 21.6-70.7 | 4/8 | no | MAE 45.07 not <= 90% of B0 44.85; better than B0 on only 4 of 8 papers (linear part used for 10% of rows) |
| R | 50.77 | 44.85 | 23.2-84.4 | 2/8 | no | MAE 50.77 not <= 90% of B0 44.85; better than B0 on only 2 of 8 papers |

## foam_stability

15 rows, 3 papers, 3 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 35.50 | 35.50 | 23.6-57.6 | 0/3 | no | baseline |
| C1 | 31.47 | 35.50 | 22.0-40.6 | 3/3 | no | 15 rows < 30 |
| C2 | 31.47 | 35.50 | 22.0-40.6 | 3/3 | no | 15 rows < 30 |
| C3 | 32.89 | 35.50 | 19.7-46.4 | 2/3 | no | 15 rows < 30; MAE 32.89 not <= 90% of B0 35.50 |
| C4 | 37.96 | 35.50 | 36.3-39.1 | 2/3 | no | 15 rows < 30; MAE 37.96 not <= 90% of B0 35.50 (bin acc 0.20, direction acc 0.47; B0 bin acc 0.13) |
| C5 | 31.47 | 35.50 | 22.0-40.6 | 3/3 | no | 15 rows < 30 (linear part used for 0% of rows) |
| R | 33.81 | 35.50 | 21.4-42.9 | 2/3 | no | 15 rows < 30; MAE 33.81 not <= 90% of B0 35.50 |

## least_gelation

13 rows, 3 papers, 3 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 16.60 | 16.60 | 6.7-25.0 | 0/3 | no | baseline |
| C1 | 23.01 | 16.60 | 16.0-31.7 | 0/3 | no | 13 rows < 30; MAE 23.01 not <= 90% of B0 16.60; better than B0 on only 0 of 3 papers |
| C2 | 21.99 | 16.60 | 16.0-30.0 | 0/3 | no | 13 rows < 30; MAE 21.99 not <= 90% of B0 16.60; better than B0 on only 0 of 3 papers |
| C3 | 23.80 | 16.60 | 17.2-29.5 | 0/3 | no | 13 rows < 30; MAE 23.80 not <= 90% of B0 16.60; better than B0 on only 0 of 3 papers |
| C4 | 18.14 | 16.60 | 6.7-30.0 | 0/3 | no | 13 rows < 30; MAE 18.14 not <= 90% of B0 16.60; better than B0 on only 0 of 3 papers (bin acc 0.46, direction acc 0.46; B0 bin acc 0.54) |
| C5 | 23.13 | 16.60 | 16.0-31.7 | 0/3 | no | 13 rows < 30; MAE 23.13 not <= 90% of B0 16.60; better than B0 on only 0 of 3 papers (linear part used for 38% of rows) |
| R | 20.95 | 16.60 | 11.0-27.4 | 0/3 | no | 13 rows < 30; MAE 20.95 not <= 90% of B0 16.60; better than B0 on only 0 of 3 papers |

## oil_absorption

59 rows, 9 papers, 7 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 15.79 | 15.79 | 2.3-64.2 | 0/9 | no | baseline |
| C1 | 14.95 | 15.79 | 4.2-60.2 | 5/9 | no | MAE 14.95 not <= 90% of B0 15.79 |
| C2 | 14.90 | 15.79 | 4.6-65.3 | 3/9 | no | MAE 14.90 not <= 90% of B0 15.79; better than B0 on only 3 of 9 papers |
| C3 | 17.52 | 15.79 | 0.8-66.3 | 2/9 | no | MAE 17.52 not <= 90% of B0 15.79; better than B0 on only 2 of 9 papers |
| C4 | 15.91 | 15.79 | 4.6-56.4 | 4/9 | no | MAE 15.91 not <= 90% of B0 15.79; better than B0 on only 4 of 9 papers (bin acc 0.41, direction acc 0.56; B0 bin acc 0.34) |
| C5 | 15.61 | 15.79 | 4.2-60.2 | 4/9 | no | MAE 15.61 not <= 90% of B0 15.79; better than B0 on only 4 of 9 papers (linear part used for 5% of rows) |
| R | 18.43 | 15.79 | 1.6-70.0 | 1/9 | no | MAE 18.43 not <= 90% of B0 15.79; better than B0 on only 1 of 9 papers |

## oxalate

43 rows, 8 papers, 6 crops. Chosen: **R**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 48.84 | 48.84 | 28.1-70.3 | 0/8 | no | baseline |
| C1 | 42.64 | 48.84 | 21.0-82.8 | 4/8 | no | better than B0 on only 4 of 8 papers |
| C2 | 39.21 | 48.84 | 12.5-74.6 | 7/8 | yes | passes the ship rule |
| C3 | 35.96 | 48.84 | 8.1-69.5 | 7/8 | yes | passes the ship rule |
| C4 | 38.07 | 48.84 | 14.5-73.6 | 7/8 | yes | passes the ship rule (bin acc 0.23, direction acc 0.79; B0 bin acc 0.02) |
| C5 | 42.57 | 48.84 | 21.0-71.9 | 4/8 | no | better than B0 on only 4 of 8 papers (linear part used for 37% of rows) |
| R | 31.90 | 48.84 | 4.8-70.7 | 7/8 | yes | passes the ship rule |

## phytate

73 rows, 9 papers, 9 crops. Chosen: **C3**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 43.73 | 43.73 | 20.4-66.3 | 0/9 | no | baseline |
| C1 | 26.97 | 43.73 | 7.3-44.8 | 8/9 | yes | passes the ship rule |
| C2 | 28.40 | 43.73 | 4.1-45.5 | 8/9 | yes | passes the ship rule |
| C3 | 22.84 | 43.73 | 9.0-37.2 | 8/9 | yes | passes the ship rule |
| C4 | 26.49 | 43.73 | 2.1-42.7 | 8/9 | yes | passes the ship rule (bin acc 0.40, direction acc 0.96; B0 bin acc 0.03) |
| C5 | 27.05 | 43.73 | 7.0-44.8 | 8/9 | yes | passes the ship rule (linear part used for 16% of rows) |
| R | 27.45 | 43.73 | 1.4-45.9 | 8/9 | yes | passes the ship rule |

## protein

8 rows, 3 papers, 4 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 8.03 | 8.03 | 1.9-17.1 | 0/3 | no | baseline |
| C1 | 9.29 | 8.03 | 4.6-17.1 | 1/3 | no | 8 rows < 30; MAE 9.29 not <= 90% of B0 8.03; better than B0 on only 1 of 3 papers |
| C2 | 9.38 | 8.03 | 4.6-17.1 | 1/3 | no | 8 rows < 30; MAE 9.38 not <= 90% of B0 8.03; better than B0 on only 1 of 3 papers |
| C3 | 12.87 | 8.03 | 2.5-15.5 | 2/3 | no | 8 rows < 30; MAE 12.87 not <= 90% of B0 8.03 |
| C4 | 9.38 | 8.03 | 4.6-17.1 | 1/3 | no | 8 rows < 30; MAE 9.38 not <= 90% of B0 8.03; better than B0 on only 1 of 3 papers (bin acc 0.00, direction acc 0.00; B0 bin acc 0.50) |
| C5 | 9.29 | 8.03 | 4.6-17.1 | 1/3 | no | 8 rows < 30; MAE 9.29 not <= 90% of B0 8.03; better than B0 on only 1 of 3 papers (linear part used for 0% of rows) |
| R | 13.52 | 8.03 | 2.5-17.4 | 1/3 | no | 8 rows < 30; MAE 13.52 not <= 90% of B0 8.03; better than B0 on only 1 of 3 papers |

## swelling_power

40 rows, 4 papers, 3 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 18.37 | 18.37 | 12.1-30.5 | 0/4 | no | baseline |
| C1 | 27.78 | 18.37 | 8.3-73.6 | 2/4 | no | MAE 27.78 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers |
| C2 | 27.35 | 18.37 | 7.3-73.6 | 2/4 | no | MAE 27.35 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers |
| C3 | 17.86 | 18.37 | 6.9-39.1 | 2/4 | no | MAE 17.86 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers |
| C4 | 27.67 | 18.37 | 7.0-73.6 | 2/4 | no | MAE 27.67 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers (bin acc 0.45, direction acc 0.50; B0 bin acc 0.10) |
| C5 | 27.78 | 18.37 | 8.3-73.6 | 2/4 | no | MAE 27.78 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers (linear part used for 0% of rows) |
| R | 26.53 | 18.37 | 7.7-68.2 | 2/4 | no | MAE 26.53 not <= 90% of B0 18.37; better than B0 on only 2 of 4 papers |

## tannin

74 rows, 10 papers, 9 crops. Chosen: **C3**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 54.98 | 54.98 | 27.9-70.3 | 0/10 | no | baseline |
| C1 | 30.39 | 54.98 | 12.3-44.2 | 9/10 | yes | passes the ship rule |
| C2 | 30.67 | 54.98 | 15.4-43.4 | 8/10 | yes | passes the ship rule |
| C3 | 21.37 | 54.98 | 0.1-30.9 | 10/10 | yes | passes the ship rule |
| C4 | 31.15 | 54.98 | 7.4-42.4 | 8/10 | yes | passes the ship rule (bin acc 0.32, direction acc 0.96; B0 bin acc 0.03) |
| C5 | 30.72 | 54.98 | 9.6-44.2 | 8/10 | yes | passes the ship rule (linear part used for 16% of rows) |
| R | 22.70 | 54.98 | 0.2-33.7 | 10/10 | yes | passes the ship rule |

## trypsin_inhibitor

54 rows, 7 papers, 7 crops. Chosen: **C3**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 54.09 | 54.09 | 29.5-72.7 | 0/7 | no | baseline |
| C1 | 30.42 | 54.09 | 3.7-48.9 | 6/7 | yes | passes the ship rule |
| C2 | 31.41 | 54.09 | 10.3-57.7 | 6/7 | yes | passes the ship rule |
| C3 | 27.83 | 54.09 | 8.3-36.2 | 6/7 | yes | passes the ship rule |
| C4 | 31.47 | 54.09 | 12.2-58.2 | 6/7 | yes | passes the ship rule (bin acc 0.46, direction acc 0.98; B0 bin acc 0.00) |
| C5 | 30.98 | 54.09 | 10.1-51.7 | 6/7 | yes | passes the ship rule (linear part used for 9% of rows) |
| R | 34.34 | 54.09 | 6.4-57.8 | 6/7 | yes | passes the ship rule |

## water_absorption

66 rows, 11 papers, 8 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 18.60 | 18.60 | 5.7-56.1 | 0/11 | no | baseline |
| C1 | 21.93 | 18.60 | 5.0-46.8 | 4/11 | no | MAE 21.93 not <= 90% of B0 18.60; better than B0 on only 4 of 11 papers |
| C2 | 22.88 | 18.60 | 3.5-49.9 | 4/11 | no | MAE 22.88 not <= 90% of B0 18.60; better than B0 on only 4 of 11 papers |
| C3 | 19.32 | 18.60 | 6.1-51.8 | 5/11 | no | MAE 19.32 not <= 90% of B0 18.60; better than B0 on only 5 of 11 papers |
| C4 | 32.16 | 18.60 | 6.8-53.7 | 1/11 | no | MAE 32.16 not <= 90% of B0 18.60; better than B0 on only 1 of 11 papers (bin acc 0.12, direction acc 0.18; B0 bin acc 0.21) |
| C5 | 22.16 | 18.60 | 8.3-46.8 | 3/11 | no | MAE 22.16 not <= 90% of B0 18.60; better than B0 on only 3 of 11 papers (linear part used for 6% of rows) |
| R | 21.63 | 18.60 | 9.8-51.1 | 5/11 | no | MAE 21.63 not <= 90% of B0 18.60; better than B0 on only 5 of 11 papers |

Backtest caveat: held-out papers mostly use crops, treatments or times not seen in the training folds, so these errors describe transfer to a new paper; the app predicts only inside each entry's training range.
