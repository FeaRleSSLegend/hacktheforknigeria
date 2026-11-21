# Rows / papers per metric

NEEDS_HUMAN rows excluded throughout. 'Ingredient crops' = crops in data/ingredients.csv; the rest (mungbean, lentil, horse gram, black bean, lima bean, adzuki bean) are treatment-effect evidence from different crops. The models train on 'no cumulative (training set)'.

| Metric | all | no cumulative (training set) | ingredient crops only | ingredient crops, no cumulative |
|---|---|---|---|---|
| bulk_density | 53 / 8 | 51 / 8 | 49 / 7 | 47 / 7 |
| bulk_density_packed | 9 / 1 | 9 / 1 | 9 / 1 | 9 / 1 |
| dispersibility | 12 / 1 | 12 / 1 | 12 / 1 | 12 / 1 |
| emulsion_activity | 13 / 1 | 13 / 1 | 13 / 1 | 13 / 1 |
| emulsion_capacity | 14 / 3 | 12 / 3 | 10 / 2 | 8 / 2 |
| emulsion_stability | 23 / 3 | 23 / 3 | 23 / 3 | 23 / 3 |
| energy | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| fat | 4 / 2 | 4 / 2 | 4 / 2 | 4 / 2 |
| fibre | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| foam_capacity | 52 / 8 | 50 / 8 | 46 / 7 | 44 / 7 |
| foam_stability | 15 / 3 | 15 / 3 | 9 / 2 | 9 / 2 |
| iron | 4 / 1 | 4 / 1 | 4 / 1 | 4 / 1 |
| ivpd | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| least_gelation | 13 / 3 | 13 / 3 | 13 / 3 | 13 / 3 |
| oil_absorption | 59 / 9 | 57 / 9 | 49 / 7 | 47 / 7 |
| oxalate | 43 / 8 | 41 / 8 | 35 / 7 | 33 / 7 |
| phytate | 73 / 9 | 43 / 8 | 49 / 6 | 19 / 5 |
| polyphenols | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| protein | 8 / 3 | 8 / 3 | 8 / 3 | 8 / 3 |
| saponin | 11 / 2 | 11 / 2 | 3 / 1 | 3 / 1 |
| starch_solubility | 9 / 1 | 9 / 1 | 9 / 1 | 9 / 1 |
| swelling_capacity | 4 / 1 | 4 / 1 | 4 / 1 | 4 / 1 |
| swelling_index | 3 / 1 | 3 / 1 | 3 / 1 | 3 / 1 |
| swelling_power | 40 / 4 | 40 / 4 | 34 / 3 | 34 / 3 |
| tannin | 74 / 10 | 44 / 9 | 50 / 7 | 20 / 6 |
| trypsin_inhibitor | 54 / 7 | 24 / 6 | 44 / 6 | 14 / 5 |
| water_absorption | 66 / 11 | 64 / 11 | 56 / 9 | 54 / 9 |
