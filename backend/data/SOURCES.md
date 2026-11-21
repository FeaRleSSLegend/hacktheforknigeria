# SOURCES

One entry per source: what it is, which rows use it, quality, caveats.

## Carried over (in data/raw/)
- wafct_protein_verified.csv: FAO/INFOODS West African Food Composition Table 2012 (fao.org/3/i2698b/i2698b.pdf). Protein, water, fat. Boiled values are calculated from raw, not measured.
- nbs_prices_history.csv: NBS Selected Food Price Watch national averages (brown beans, boneless beef, frozen chicken). Rows with status press_quote_verify come from news reports and need checking against the NBS tables.
- units_mudu.csv: 1 mudu of beans or grains is about 1.5 kg (trade convention, estimated until someone weighs it).

## Added Nov 20 (data lane)
All paper rows were transcribed from open-access text (core.ac.uk, AJOL, publisher pages) by text extraction and are NOT yet checked against the PDF. Every row's method_note says so. A human must spot-check at least one row per paper before the demo. Page fields hold the table number where the page was not legible; fill in the page when you open the PDF.

### Composition (data/ingredients.csv)
- FAO/INFOODS West African Food Composition Table 2019 (WAFCT_2019.xlsx, sheet "03 NV_sum_39 (per 100g EP)"), dry raw values per 100 g. Values in square brackets in the source are imputed or borrowed, so rows with them are flagged `estimated` and the notes name the fields. It replaces the 2012 table in data/raw (e.g. cowpea protein 21.2 in 2012 vs 22.6 in 2019).
- Cowpea price: NBS Selected Food Price Watch, Feb 2025, 'Beans Brown' national average 2465.96 NGN/kg (white beans 2114.33). Other ingredients have no price yet.

### Functional properties of untreated flour (data/functional_properties.csv), 56 values
- arawande2010: Arawande & Borokini 2010, J. Emerging Trends Eng. Appl. Sci. 1(1):89-95. Jack bean, pigeon pea, cowpea, Table 3. Text and table disagree on one cowpea OAC value (113.50 vs 113.15); the table is used.
- oloyo2005: Oloyo & Akoja 2005, Tropical Agricultural Research and Extension, pigeon pea cv. IITA 8860. Volume and page range not confirmed (extracted text was garbled).
- okoye2021: Okoye-Okeke et al. 2021, Indonesian Food Sci. Technol. J. 5(1):26-33. Only the unsieved pigeon pea flour (P110) is used; sieved variants are particle-size experiments.
- adediran2013: Adediran et al. 2013, Croat. J. Food Technol. Biotechnol. Nutr. 8(3-4):102-110. Only the 100 % cowpea row.
- abulude2006: Abulude et al. 2006, Pak. J. Sci. Ind. Res. 49(6):427-430. Raw melon (Cucumeropsis edulis).
- nzeagwu2018: Nzeagwu & Raphael 2018, J. Dietitians Assoc. Nigeria 9:36-46. Sample 404 (100 % melon seed flour).
- onwuzurike2021: Onwuzurike et al. 2021, Niger. J. Biotechnol. 38(2):24-39. 100 % soybean flour. Header units g/mL look wrong for OAC/WAC (values 108 and 81), assumed %.
- odedeji2024: Odedeji et al. 2024, J. Underutilized Legumes 6(1):43-53. Unsprouted jack bean only; the sprouting-day labels in that paper are internally inconsistent so its germination rows were not used.
- abioye2014 (0 h row): see below.
- Unit handling: WAC and OAC printed as % are divided by 100 to g/g and flagged `calculated`. This assumes % means g absorbed per 100 g flour. Other properties keep the printed unit.
- Excluded: Okorie 2018 (white melon, Granthaalayah): bulk density 1.62 g/mL and foam capacity 0.03 % look implausible. Eshun 2022 thesis tables are literature ranges, not measurements. Audu & Aremu 2015 (black turtle bean) is not a target crop.

### Treatment experiments (data/treatment_experiments.csv), 58 rows
- abioye2014: Abioye, Adegbola & Onidare 2014, LAUTECH J. Eng. Technol. 8(2):176-181. African yam bean, soaked 9 h, germinated at 25 C for 24/48/72/96 h; baseline is the 0 h sample. 36 rows. Drying method not stated; the text and tables differ slightly on protein.
- chude2018: Chude, Amadi & Okoyeuzu 2018, Adv. Life Sci. Technol. 64:35-41. Bambara, 3-day lactic fermentation, 10 rows. Seeds were cooked before fermenting. Minor internal inconsistencies in the source.
- abulude2006: boiled / toasted / germinated vs raw melon seed, 12 rows. Times and temperatures not available.

### Still missing
- No functional-property values yet for bambara, groundnut or African locust bean. Chinma 2021 (LWT 140:110749, bambara germination) is paywalled; its abstract only gives protein and digestibility ranges.
- Prices for 8 of 9 ingredients.
- sides.csv, dishes.json, applications.json, playbook.json, safety_rules.json still empty.

## DEV DATA NOTICE (backend starter package)
data/functional_properties.csv and data/treatment_experiments.csv here are the raw batch 1-5 files simply concatenated (121 and 682 rows). They are NOT the cleaned ETL output of the AI lane (names are not normalised, cumulative rows are not flagged, nothing is spot-checked against the PDFs). Use them to develop and test the backend only. data/applications.json, dishes.json, playbook.json and safety_rules.json are batch 6 drafts (weights estimated, safety rules reviewed:false). Prices exist for 1 of 9 ingredients. Replace all of data/ and bundle/model.json with the AI lane's versions when they are available.
