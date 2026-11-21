# Dish ranking check (reference engine, unchanged weights)

Test input: dish mode, 4 people, budget 100000 NGN, no allergens, no user prices. Portions (typical_dry_g_per_serving) and weights are team estimates (data/dishes.json, data/applications.json). Cost is the protein ingredient only, no oil or spices; the total adds the priced sides. Gaps are flagged, never filled.

## Akara (`akara`, application `akara_batter`)

Needs: foam_capacity higher 0.35, foam_stability higher 0.15, water_absorption higher 0.3, oil_absorption lower 0.2

Portion: 50 g dry per person (estimate, to confirm). Summary: Ranked on foaming and water holding, key for light batter.

| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |
|---|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.579 | 0.658 (0.11-0.71) | 11.3 / 45.2 | 66.95 / 267.79 | - |
| 2 | pigeon_pea | - | 0.423 (0.00-0.96) | 10.4 / 41.6 | price needed | price needed |
| 3 | bambara | - | 0.350 (0.29-0.48) | 9.8 / 39.0 | price needed | price needed |
- Not enough data: **african_yam_bean** missing foam_stability, oil_absorption
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total with sides: 180.97 per person, 723.88 for the group; flags: price needed for lower-ranked options: bambara, pigeon_pea; not enough data: african_yam_bean; cost excludes oil and spices

## Moin-moin (`moin_moin`, application `steamed_bean_pudding`)

Needs: water_absorption higher 0.35, least_gelation lower 0.3, emulsion_capacity higher 0.2, foam_capacity higher 0.15

Portion: 70 g dry per person (estimate, to confirm). Summary: Ranked on water holding and gelling for a firm pudding.

| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |
|---|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.734 | 0.969 (0.44-0.97) | 15.8 / 63.3 | 93.73 / 374.9 | - |
| 2 | pigeon_pea | - | 0.488 (0.07-0.99) | 14.6 / 58.2 | price needed | price needed |
| 3 | bambara | - | 0.200 (0.19-0.49) | 13.7 / 54.6 | price needed | price needed |
- Not enough data: **african_yam_bean** missing least_gelation, emulsion_capacity
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total with sides: 152.19 per person, 608.76 for the group; flags: price needed for lower-ranked options: bambara, pigeon_pea; not enough data: african_yam_bean; cost excludes oil and spices

## Ekuru (`ekuru`, application `steamed_bean_pudding`)

Needs: water_absorption higher 0.35, least_gelation lower 0.3, emulsion_capacity higher 0.2, foam_capacity higher 0.15

Portion: 60 g dry per person (estimate, to confirm). Summary: Ranked on water holding and gelling for steamed paste.

| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |
|---|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.750 | 1.000 (0.20-1.00) | 13.6 / 54.2 | 80.34 / 321.34 | - |
| 2 | pigeon_pea | - | 0.000 (0.00-1.00) | 12.5 / 49.9 | price needed | price needed |
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total with sides: 292.55 per person, 1170.22 for the group; flags: price needed for lower-ranked options: pigeon_pea; cost excludes oil and spices

## Okpa (`okpa`, application `steamed_bean_pudding`)

Needs: water_absorption higher 0.35, least_gelation lower 0.3, emulsion_capacity higher 0.2, foam_capacity higher 0.15

Portion: 80 g dry per person (estimate, to confirm). Summary: Traditional base; ranked on water holding and gelling.

| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |
|---|---|---|---|---|---|---|
| 1 | bambara (headline) | - | 0.500 (0.50-0.50) | 15.6 / 62.4 | price needed | price needed |
- **Only one candidate can be ranked**, so fit scales to 0.5 and there is nothing to compare.
- Total with sides: incomplete (price needed); flags: price needed: bambara; budget check leaves out items with no price; cost excludes oil and spices

## Gbegiri (bean soup) (`gbegiri`, application `bean_soup_body`)

Needs: water_absorption higher 0.4, emulsion_capacity higher 0.3, emulsion_stability higher 0.3

Portion: 45 g dry per person (estimate, to confirm). Summary: Ranked on water holding and creaminess for a smooth soup.

| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |
|---|---|---|---|---|---|---|
| 1 | cowpea (headline) | 0.600 | 0.700 (0.30-0.70) | 10.2 / 40.7 | 60.25 / 241.01 | - |
| 2 | pigeon_pea | - | 0.300 (0.00-1.00) | 9.4 / 37.4 | price needed | price needed |
- Only 1 priced candidate(s): cost and density cannot separate proteins.
- Total with sides: 162.43 per person, 649.73 for the group; flags: price needed for lower-ranked options: pigeon_pea; cost excludes oil and spices

## Egusi soup (`egusi_soup`, application `seed_soup_body`)

Needs: oil_absorption higher 0.35, emulsion_capacity higher 0.3, water_absorption higher 0.35

Portion: 35 g dry per person (estimate, to confirm). Summary: Ranked on holding oil and water to thicken soup.

| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |
|---|---|---|---|---|---|---|
| 1 | groundnut (headline) | - | 0.500 (0.50-0.50) | 7.8 / 31.4 | price needed | price needed |
- Not enough data: **melon_seed** missing emulsion_capacity
- **Only one candidate can be ranked**, so fit scales to 0.5 and there is nothing to compare.
- Total with sides: incomplete (price needed); flags: price needed: groundnut; budget check leaves out items with no price; not enough data: melon_seed; cost excludes oil and spices

