# Ranking stability: akara

Dish and needs from: **data/applications.json and data/dishes.json**.

Engine: reference/suggest.py and reference/scoring.py unchanged, default weights (0.50 fit, 0.30 cost, 0.20 protein density). Test input: dish mode, 1 serving, 20 g protein, budget 100000 NGN, no allergens.

Needs: foam_capacity (higher, w=0.35), foam_stability (higher, w=0.15), water_absorption (higher, w=0.3), oil_absorption (lower, w=0.2)

## App output (suggest_dishes)

- Chosen protein: **cowpea**, score 0.579, fit 0.658 (range 0.107-0.715), cost 218.23 NGN, 88.5 g as sold, 10.9113 NGN per g protein
- Drivers: fit +0.000, cost +0.000
- Flags: price needed for lower-ranked options: bambara, pigeon_pea; not enough data: african_yam_bean; cost excludes oil and spices

Rules: only proteins with a value for every need are ranked (complete coverage); a protein with no price still ranks on fit and density and shows 'price needed'.

## Candidates and why they are excluded or flagged

| Ingredient | Status |
|---|---|
| cowpea | ranked; priced |
| bambara | ranked; price needed (no bundled price) |
| pigeon_pea | ranked; price needed (no bundled price) |
| african_yam_bean | not enough data, missing: foam_stability, oil_absorption |

## Fit-only diagnostic (ignores price and density; ranked candidates only)

All papers: cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35)

| Paper removed | Rows removed | Fit order | Same order? |
|---|---|---|---|
| abiodun2011 | 6 | cowpea (0.66) > pigeon_pea (0.48) > bambara (0.35) | yes |
| abioye2014 | 3 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| abulude2006 | 4 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| adediran2013 | 7 | pigeon_pea (0.55) > cowpea (0.55) > bambara (0.35) | no |
| adeleke2018 | 18 | cowpea (0.85) > pigeon_pea (0.15) | no (drops out: bambara) |
| akubor2017 | 7 | cowpea (0.73) > pigeon_pea (0.45) > bambara (0.35) | yes |
| arawande2010 | 21 | cowpea (0.65) > pigeon_pea (0.46) > bambara (0.32) | yes |
| ijarotimi2022 | 5 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| kanetro2021 | 2 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| makinde2020 | 6 | cowpea (0.61) > pigeon_pea (0.57) > bambara (0.35) | yes |
| mubaiwa2018 | 10 | cowpea (0.66) > pigeon_pea (0.44) > bambara (0.35) | yes |
| nzeagwu2018 | 3 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| odedeji2024 | 3 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| ogunyinka2017 | 4 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| okoye2021 | 4 | cowpea (0.66) > bambara (0.35) > pigeon_pea (0.22) | no |
| oloyo2005 | 6 | cowpea (0.65) > pigeon_pea (0.49) > bambara (0.35) | yes |
| onwuzurike2021 | 5 | cowpea (0.66) > pigeon_pea (0.42) > bambara (0.35) | yes |
| sharma2019 | 7 | cowpea (0.70) > pigeon_pea (0.41) > bambara (0.35) | yes |

Fit is min-max scaled across the ranked candidates, so a candidate entering or leaving the ranked set changes everyone's scaled scores. Weights were not tuned.
