# Cumulative Bolade stages: excluded vs included in model training

Shipped models come from the run WITHOUT the 102 cumulative household-stage rows (cumulative_from_raw = true), because a cumulative stage is not a single operation. The decision was made before seeing these numbers; both runs are shown either way. The cumulative rows remain in the data and in the cited fallback.

Rows used: 558 without, 660 with.

| Metric | Rows (without / with) | Chosen without | MAE / B0 without | Chosen with | MAE / B0 with | Change |
|---|---|---|---|---|---|---|
| bulk_density | 51 / 53 | R | 8.0 / 10.7 | R | 8.5 / 11.4 |  |
| emulsion_capacity | 12 / 14 | none | - / 10.8 | none | - / 9.6 |  |
| emulsion_stability | 23 / 23 | none | - / 28.2 | none | - / 28.2 |  |
| foam_capacity | 50 / 52 | none | - / 46.4 | none | - / 44.8 |  |
| foam_stability | 15 / 15 | none | - / 35.5 | none | - / 35.5 |  |
| least_gelation | 13 / 13 | none | - / 16.6 | none | - / 16.6 |  |
| oil_absorption | 57 / 59 | none | - / 16.0 | none | - / 15.8 |  |
| oxalate | 41 / 43 | R | 33.8 / 48.3 | R | 31.9 / 48.8 |  |
| phytate | 43 / 73 | C3 | 11.4 / 30.1 | C3 | 22.8 / 43.7 |  |
| protein | 8 / 8 | none | - / 8.0 | none | - / 8.0 |  |
| swelling_power | 40 / 40 | none | - / 18.4 | none | - / 18.4 |  |
| tannin | 44 / 74 | R | 16.6 / 46.3 | C3 | 21.4 / 55.0 | different model |
| trypsin_inhibitor | 24 / 54 | none | - / 54.8 | C3 | 27.8 / 54.1 | STOPS SHIPPING |
| water_absorption | 64 / 66 | none | - / 19.1 | none | - / 18.6 |  |
