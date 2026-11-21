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

164 rows, 11 papers, 9 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 41.68 | 41.68 | 34.4-65.7 | 0/11 | no | baseline |
| C1 | 24.52 | 41.68 | 15.1-75.3 | 10/11 | yes | passes the ship rule |
| C2 | 25.00 | 41.68 | 15.8-77.4 | 10/11 | yes | passes the ship rule |
| C3 | 20.75 | 41.68 | 9.9-69.3 | 10/11 | yes | passes the ship rule |
| C4 | 26.45 | 41.68 | 16.6-81.1 | 10/11 | yes | passes the ship rule (bin acc 0.38, direction acc 0.87; B0 bin acc 0.03) |
| C5 | 25.11 | 41.68 | 14.7-80.6 | 10/11 | yes | passes the ship rule (linear part used for 18% of rows) |

## bulk_density

51 rows, 8 papers, 5 crops. Chosen: **R**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 10.71 | 10.71 | 0.6-22.9 | 0/8 | no | baseline |
| C1 | 9.03 | 10.71 | 3.9-20.8 | 5/8 | yes | passes the ship rule |
| C2 | 8.97 | 10.71 | 3.8-20.8 | 5/8 | yes | passes the ship rule |
| C3 | 8.15 | 10.71 | 4.1-27.1 | 5/8 | yes | passes the ship rule |
| C4 | 8.41 | 10.71 | 4.4-24.9 | 5/8 | yes | passes the ship rule (bin acc 0.57, direction acc 0.63; B0 bin acc 0.25) |
| C5 | 8.46 | 10.71 | 3.7-20.8 | 5/8 | yes | passes the ship rule (linear part used for 33% of rows) |
| R | 7.99 | 10.71 | 2.9-26.4 | 5/8 | yes | passes the ship rule |

## emulsion_capacity

12 rows, 3 papers, 3 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 10.76 | 10.76 | 5.2-13.9 | 0/3 | no | baseline |
| C1 | 11.45 | 10.76 | 5.8-18.3 | 1/3 | no | 12 rows < 30; MAE 11.45 not <= 90% of B0 10.76; better than B0 on only 1 of 3 papers |
| C2 | 11.45 | 10.76 | 5.8-18.3 | 1/3 | no | 12 rows < 30; MAE 11.45 not <= 90% of B0 10.76; better than B0 on only 1 of 3 papers |
| C3 | 16.00 | 10.76 | 9.4-19.7 | 0/3 | no | 12 rows < 30; MAE 16.00 not <= 90% of B0 10.76; better than B0 on only 0 of 3 papers |
| C4 | 11.64 | 10.76 | 6.4-18.3 | 1/3 | no | 12 rows < 30; MAE 11.64 not <= 90% of B0 10.76; better than B0 on only 1 of 3 papers (bin acc 0.17, direction acc 0.17; B0 bin acc 0.42) |
| C5 | 11.45 | 10.76 | 5.8-18.3 | 1/3 | no | 12 rows < 30; MAE 11.45 not <= 90% of B0 10.76; better than B0 on only 1 of 3 papers (linear part used for 0% of rows) |
| R | 19.00 | 10.76 | 12.2-28.3 | 0/3 | no | 12 rows < 30; MAE 19.00 not <= 90% of B0 10.76; better than B0 on only 0 of 3 papers |

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

50 rows, 8 papers, 6 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 46.44 | 46.44 | 10.9-80.9 | 0/8 | no | baseline |
| C1 | 47.04 | 46.44 | 24.8-70.7 | 4/8 | no | MAE 47.04 not <= 90% of B0 46.44; better than B0 on only 4 of 8 papers |
| C2 | 49.88 | 46.44 | 24.9-76.9 | 4/8 | no | MAE 49.88 not <= 90% of B0 46.44; better than B0 on only 4 of 8 papers |
| C3 | 55.93 | 46.44 | 33.1-82.7 | 1/8 | no | MAE 55.93 not <= 90% of B0 46.44; better than B0 on only 1 of 8 papers |
| C4 | 66.52 | 46.44 | 24.9-104.5 | 2/8 | no | MAE 66.52 not <= 90% of B0 46.44; better than B0 on only 2 of 8 papers (bin acc 0.24, direction acc 0.48; B0 bin acc 0.10) |
| C5 | 47.04 | 46.44 | 24.8-70.7 | 4/8 | no | MAE 47.04 not <= 90% of B0 46.44; better than B0 on only 4 of 8 papers (linear part used for 0% of rows) |
| R | 54.04 | 46.44 | 17.8-113.1 | 3/8 | no | MAE 54.04 not <= 90% of B0 46.44; better than B0 on only 3 of 8 papers |

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

57 rows, 9 papers, 7 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 15.97 | 15.97 | 2.3-64.2 | 0/9 | no | baseline |
| C1 | 16.29 | 15.97 | 4.9-58.5 | 5/9 | no | MAE 16.29 not <= 90% of B0 15.97 |
| C2 | 15.86 | 15.97 | 4.1-63.5 | 4/9 | no | MAE 15.86 not <= 90% of B0 15.97; better than B0 on only 4 of 9 papers |
| C3 | 17.19 | 15.97 | 1.9-62.6 | 5/9 | no | MAE 17.19 not <= 90% of B0 15.97 |
| C4 | 18.09 | 15.97 | 4.6-66.0 | 4/9 | no | MAE 18.09 not <= 90% of B0 15.97; better than B0 on only 4 of 9 papers (bin acc 0.40, direction acc 0.56; B0 bin acc 0.33) |
| C5 | 16.28 | 15.97 | 4.9-58.5 | 5/9 | no | MAE 16.28 not <= 90% of B0 15.97 (linear part used for 2% of rows) |
| R | 17.28 | 15.97 | 2.4-65.7 | 2/9 | no | MAE 17.28 not <= 90% of B0 15.97; better than B0 on only 2 of 9 papers |

## oxalate

41 rows, 8 papers, 6 crops. Chosen: **R**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 48.34 | 48.34 | 28.1-70.3 | 0/8 | no | baseline |
| C1 | 40.55 | 48.34 | 21.0-73.8 | 4/8 | no | better than B0 on only 4 of 8 papers |
| C2 | 38.23 | 48.34 | 12.5-74.6 | 7/8 | yes | passes the ship rule |
| C3 | 36.15 | 48.34 | 8.7-69.1 | 7/8 | yes | passes the ship rule |
| C4 | 37.17 | 48.34 | 7.9-73.6 | 7/8 | yes | passes the ship rule (bin acc 0.22, direction acc 0.83; B0 bin acc 0.02) |
| C5 | 41.39 | 48.34 | 21.0-72.7 | 5/8 | yes | passes the ship rule (linear part used for 37% of rows) |
| R | 33.79 | 48.34 | 5.5-70.6 | 7/8 | yes | passes the ship rule |

## phytate

43 rows, 8 papers, 9 crops. Chosen: **C3**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 30.14 | 30.14 | 20.5-60.4 | 0/8 | no | baseline |
| C1 | 13.99 | 30.14 | 0.1-41.9 | 8/8 | yes | passes the ship rule |
| C2 | 13.47 | 30.14 | 4.0-42.6 | 8/8 | yes | passes the ship rule |
| C3 | 11.40 | 30.14 | 2.1-32.1 | 8/8 | yes | passes the ship rule |
| C4 | 17.12 | 30.14 | 4.5-47.7 | 8/8 | yes | passes the ship rule (bin acc 0.53, direction acc 0.93; B0 bin acc 0.05) |
| C5 | 14.38 | 30.14 | 5.8-41.9 | 8/8 | yes | passes the ship rule (linear part used for 21% of rows) |
| R | 13.57 | 30.14 | 5.6-34.2 | 7/8 | yes | passes the ship rule |

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

44 rows, 9 papers, 9 crops. Chosen: **R**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 46.33 | 46.33 | 27.9-67.3 | 0/9 | no | baseline |
| C1 | 20.08 | 46.33 | 10.2-43.1 | 8/9 | yes | passes the ship rule |
| C2 | 22.02 | 46.33 | 7.2-51.8 | 8/9 | yes | passes the ship rule |
| C3 | 17.26 | 46.33 | 9.7-26.0 | 9/9 | yes | passes the ship rule |
| C4 | 22.26 | 46.33 | 4.3-33.6 | 8/9 | yes | passes the ship rule (bin acc 0.30, direction acc 0.93; B0 bin acc 0.05) |
| C5 | 20.01 | 46.33 | 10.2-43.1 | 8/9 | yes | passes the ship rule (linear part used for 18% of rows) |
| R | 16.65 | 46.33 | 9.2-27.1 | 9/9 | yes | passes the ship rule |

## trypsin_inhibitor

24 rows, 6 papers, 7 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 54.80 | 54.80 | 27.4-72.7 | 0/6 | no | baseline |
| C1 | 22.40 | 54.80 | 10.1-46.9 | 5/6 | no | 24 rows < 30 |
| C2 | 22.77 | 54.80 | 11.2-47.4 | 5/6 | no | 24 rows < 30 |
| C3 | 21.99 | 54.80 | 3.6-36.0 | 5/6 | no | 24 rows < 30 |
| C4 | 23.41 | 54.80 | 12.4-48.0 | 5/6 | no | 24 rows < 30 (bin acc 0.67, direction acc 0.96; B0 bin acc 0.00) |
| C5 | 22.51 | 54.80 | 6.0-50.3 | 5/6 | no | 24 rows < 30 (linear part used for 8% of rows) |
| R | 19.67 | 54.80 | 0.2-30.0 | 5/6 | no | 24 rows < 30 |

## water_absorption

64 rows, 11 papers, 8 crops. Chosen: **none (fallback)**

| Candidate | MAE | B0 MAE | Per-paper MAE range | Papers < B0 | Passes | Reason |
|---|---|---|---|---|---|---|
| B0 | 19.14 | 19.14 | 5.7-56.1 | 0/11 | no | baseline |
| C1 | 22.70 | 19.14 | 2.9-56.5 | 4/11 | no | MAE 22.70 not <= 90% of B0 19.14; better than B0 on only 4 of 11 papers |
| C2 | 25.24 | 19.14 | 5.1-56.5 | 5/11 | no | MAE 25.24 not <= 90% of B0 19.14; better than B0 on only 5 of 11 papers |
| C3 | 19.34 | 19.14 | 2.6-52.3 | 8/11 | no | MAE 19.34 not <= 90% of B0 19.14 |
| C4 | 28.95 | 19.14 | 6.8-53.7 | 2/11 | no | MAE 28.95 not <= 90% of B0 19.14; better than B0 on only 2 of 11 papers (bin acc 0.11, direction acc 0.27; B0 bin acc 0.19) |
| C5 | 22.13 | 19.14 | 2.9-56.5 | 4/11 | no | MAE 22.13 not <= 90% of B0 19.14; better than B0 on only 4 of 11 papers (linear part used for 5% of rows) |
| R | 22.54 | 19.14 | 6.8-57.4 | 6/11 | no | MAE 22.54 not <= 90% of B0 19.14 |

Backtest caveat: held-out papers mostly use crops, treatments or times not seen in the training folds, so these errors describe transfer to a new paper; the app predicts only inside each entry's training range.
