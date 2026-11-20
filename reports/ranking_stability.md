# Ranking stability: akara

Dish and needs from: **TEST FIXTURE (training/fixtures/), because data/applications.json or data/dishes.json is empty**.

Engine: reference/suggest.py and reference/scoring.py unchanged, default weights (0.50 fit, 0.30 cost, 0.20 protein density). Test input: dish mode, 1 serving, 20 g protein, budget 100000 NGN, no allergens.

Needs: foam_capacity (higher, w=0.25), foam_stability (higher, w=0.25), emulsion_capacity (higher, w=0.25), oil_absorption (lower, w=0.25)

## App output (suggest_dishes)

- Chosen protein: **jack_bean**, score 0.712, fit 0.597 (range 0.593-0.602), cost None NGN, 83.0 g as sold, None NGN per g protein
- Drivers: density +0.102, fit +0.077
- Flags: price needed: jack_bean; budget check leaves out items with no price; not enough data: african_yam_bean, soybean; cost excludes oil and spices

Rules: only proteins with a value for every need are ranked (complete coverage); a protein with no price still ranks on fit and density and shows 'price needed'.

## Candidates and why they are excluded or flagged

| Ingredient | Status |
|---|---|
| cowpea | ranked; priced |
| bambara | ranked; price needed (no bundled price) |
| pigeon_pea | ranked; price needed (no bundled price) |
| african_yam_bean | not enough data, missing: foam_stability, emulsion_capacity, oil_absorption |
| jack_bean | ranked; price needed (no bundled price) |
| soybean | not enough data, missing: emulsion_capacity |

## Fit-only diagnostic (ignores price and density; ranked candidates only)

All papers: bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00)

| Paper removed | Rows removed | Fit order | Same order? |
|---|---|---|---|
| abiodun2011 | 6 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| abioye2014 | 3 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| abulude2006 | 4 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| adediran2013 | 7 | jack_bean (0.70) > bambara (0.64) > cowpea (0.48) > pigeon_pea (0.00) | no |
| adeleke2018 | 18 | jack_bean (0.84) > cowpea (0.81) > pigeon_pea (0.00) | no (drops out: bambara) |
| arawande2010 | 21 | bambara (0.50) | no (drops out: jack_bean, cowpea, pigeon_pea) |
| makinde2020 | 6 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| mubaiwa2018 | 10 | jack_bean (0.84) > cowpea (0.81) > pigeon_pea (0.00) | no (drops out: bambara) |
| nzeagwu2018 | 3 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| odedeji2024 | 3 | bambara (0.63) > jack_bean (0.59) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| ogunyinka2017 | 4 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |
| okoye2021 | 4 | bambara (0.68) > jack_bean (0.61) > cowpea (0.55) > pigeon_pea (0.00) | yes |
| oloyo2005 | 6 | bambara (0.58) > jack_bean (0.54) > cowpea (0.42) > pigeon_pea (0.20) | yes |
| onwuzurike2021 | 5 | bambara (0.63) > jack_bean (0.60) > cowpea (0.54) > pigeon_pea (0.00) | yes |

Fit is min-max scaled across the ranked candidates, so a candidate entering or leaving the ranked set changes everyone's scaled scores. Weights were not tuned.
