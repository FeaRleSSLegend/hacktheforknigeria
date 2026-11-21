# Dish ranking check (reference engine, unchanged weights)

Test input: dish mode, 1 serving, 20 g protein, budget 100000 NGN, no allergens, no user prices. Weights are team estimates (data/applications.json). Gaps are flagged, never filled.

## Akara (`akara`, application `akara_batter`)

Needs: foam_capacity higher 0.35, foam_stability higher 0.15, water_absorption higher 0.3, oil_absorption lower 0.2

| Rank | Protein | Score | Fit (range) | Cost NGN | Flags |
|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.579 | 0.658 (0.11-0.71) | 218.23 | - |
| 2 | pigeon_pea | - | 0.423 (0.00-0.96) | price needed | price needed |
| 3 | bambara | - | 0.350 (0.29-0.48) | price needed | price needed |
- Not enough data: **african_yam_bean** missing foam_stability, oil_absorption
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total cost: 332.25; flags: price needed for lower-ranked options: bambara, pigeon_pea; not enough data: african_yam_bean; cost excludes oil and spices

## Moin-moin (`moin_moin`, application `steamed_bean_pudding`)

Needs: water_absorption higher 0.35, least_gelation lower 0.3, emulsion_capacity higher 0.2, foam_capacity higher 0.15

| Rank | Protein | Score | Fit (range) | Cost NGN | Flags |
|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.734 | 0.969 (0.44-0.97) | 218.23 | - |
| 2 | pigeon_pea | - | 0.488 (0.07-0.99) | price needed | price needed |
| 3 | bambara | - | 0.200 (0.19-0.49) | price needed | price needed |
- Not enough data: **african_yam_bean** missing least_gelation, emulsion_capacity
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total cost: 276.69; flags: price needed for lower-ranked options: bambara, pigeon_pea; not enough data: african_yam_bean; cost excludes oil and spices

## Ekuru (`ekuru`, application `steamed_bean_pudding`)

Needs: water_absorption higher 0.35, least_gelation lower 0.3, emulsion_capacity higher 0.2, foam_capacity higher 0.15

| Rank | Protein | Score | Fit (range) | Cost NGN | Flags |
|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.750 | 1.000 (0.20-1.00) | 218.23 | - |
| 2 | pigeon_pea | - | 0.000 (0.00-1.00) | price needed | price needed |
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total cost: 430.45; flags: price needed for lower-ranked options: pigeon_pea; cost excludes oil and spices

## Okpa (`okpa`, application `steamed_bean_pudding`)

Needs: water_absorption higher 0.35, least_gelation lower 0.3, emulsion_capacity higher 0.2, foam_capacity higher 0.15

| Rank | Protein | Score | Fit (range) | Cost NGN | Flags |
|---|---|---|---|---|---|
| 1 | bambara (headline) | - | 0.500 (0.50-0.50) | price needed | price needed |
- **Only one candidate can be ranked**, so fit scales to 0.5 and there is nothing to compare.
- Total cost: incomplete (price needed); flags: price needed: bambara; budget check leaves out items with no price; cost excludes oil and spices

## Gbegiri (bean soup) (`gbegiri`, application `bean_soup_body`)

Needs: water_absorption higher 0.4, emulsion_capacity higher 0.3, emulsion_stability higher 0.3

| Rank | Protein | Score | Fit (range) | Cost NGN | Flags |
|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.600 | 0.700 (0.30-0.70) | 218.23 | - |
| 2 | pigeon_pea | - | 0.300 (0.00-1.00) | price needed | price needed |
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total cost: 320.41; flags: price needed for lower-ranked options: pigeon_pea; cost excludes oil and spices

## Egusi soup (`egusi_soup`, application `seed_soup_body`)

Needs: oil_absorption higher 0.35, emulsion_capacity higher 0.3, water_absorption higher 0.35

| Rank | Protein | Score | Fit (range) | Cost NGN | Flags |
|---|---|---|---|---|---|
| 1 | groundnut (headline) | - | 0.500 (0.50-0.50) | price needed | price needed |
- Not enough data: **melon_seed** missing emulsion_capacity
- **Only one candidate can be ranked**, so fit scales to 0.5 and there is nothing to compare.
- Total cost: incomplete (price needed); flags: price needed: groundnut; budget check leaves out items with no price; not enough data: melon_seed; cost excludes oil and spices

