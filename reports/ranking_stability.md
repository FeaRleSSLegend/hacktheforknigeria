# Ranking stability: akara

Dish and needs from: **TEST FIXTURE (training/fixtures/), because data/applications.json or data/dishes.json is empty**.

Engine: reference/suggest.py and reference/scoring.py unchanged, default weights (0.50 fit, 0.30 cost, 0.20 protein density). Test input: dish mode, 1 serving, 20 g protein, budget 100000 NGN, no allergens.

Needs: foam_capacity (higher, w=0.25), foam_stability (higher, w=0.25), emulsion_capacity (higher, w=0.25), oil_absorption (lower, w=0.25)

## App output (suggest_dishes)

- Chosen protein: **cowpea**, score 0.438, fit 0.375 (range 0.179-0.450), cost 218.23 NGN, 88.5 g as sold, 10.9113 NGN per g protein
- Drivers: fit +0.000, cost +0.000
- Flags: price needed for lower-ranked options: bambara, pigeon_pea, jack_bean; not enough data: african_yam_bean, soybean; cost excludes oil and spices

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

All papers: bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27)

| Paper removed | Rows removed | Fit order | Same order? |
|---|---|---|---|
| abiodun2011 | 6 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| abioye2014 | 3 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| abulude2006 | 4 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| adediran2013 | 7 | bambara (0.62) > jack_bean (0.56) > pigeon_pea (0.38) > cowpea (0.34) | no |
| adeleke2018 | 18 | jack_bean (0.50) > cowpea (0.42) > pigeon_pea (0.25) | no (drops out: bambara) |
| akubor2017 | 7 | bambara (0.62) > jack_bean (0.53) > cowpea (0.47) > pigeon_pea (0.14) | yes |
| arawande2010 | 21 | bambara (0.50) > pigeon_pea (0.50) | no (drops out: jack_bean, cowpea) |
| ijarotimi2022 | 5 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| kanetro2021 | 2 | bambara (0.62) > jack_bean (0.46) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| makinde2020 | 6 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| mubaiwa2018 | 10 | jack_bean (0.50) > cowpea (0.42) > pigeon_pea (0.25) | no (drops out: bambara) |
| nzeagwu2018 | 3 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| odedeji2024 | 3 | bambara (0.62) > cowpea (0.43) > jack_bean (0.39) > pigeon_pea (0.33) | no |
| ogunyinka2017 | 4 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| okoye2021 | 4 | bambara (0.63) > jack_bean (0.45) > cowpea (0.39) > pigeon_pea (0.19) | yes |
| oloyo2005 | 6 | bambara (0.58) > jack_bean (0.44) > pigeon_pea (0.42) > cowpea (0.32) | no |
| onwuzurike2021 | 5 | bambara (0.62) > jack_bean (0.45) > cowpea (0.38) > pigeon_pea (0.27) | yes |
| sharma2019 | 7 | bambara (0.62) > jack_bean (0.50) > cowpea (0.43) > pigeon_pea (0.19) | yes |

Fit is min-max scaled across the ranked candidates, so a candidate entering or leaving the ranked set changes everyone's scaled scores. Weights were not tuned.
