"""Write golden test cases from the Python reference engine, run on the built bundle.

Usage: python scripts/make_fixtures.py [--bundle mobile/assets/bundle] [--out tests/golden]

Each case file is {"name", "fn", "args", "expected", "bundleVersion"} with camelCase keys
(PROJECT.md section 8). The TypeScript engine must reproduce "expected" from "args" using the
same bundle. tests/test_golden.py checks the Python engine still reproduces every case.
Rebuild the bundle first; fixtures are pinned to the bundle version they were made from.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from reference.loader import load_bundle  # noqa: E402
from reference.processing import recommend_processing  # noqa: E402
from reference.rank import rank_ingredients  # noqa: E402
from reference.safety import safety_guard  # noqa: E402
from reference.suggest import suggest_dishes  # noqa: E402


def plan(**kw) -> dict:
    inp = {"mode": "pantry", "pantryIds": [], "budgetNgn": 1500, "servings": 4, "targetProteinG": 20, "allergens": []}
    inp.update(kw)
    return inp


CASES = [
    ("suggest_pantry_cowpea", "suggestDishes", {"input": plan(pantryIds=["cowpea"])}),
    ("suggest_pantry_empty", "suggestDishes", {"input": plan()}),
    ("suggest_dish_akara", "suggestDishes", {"input": plan(mode="dish", dishId="akara")}),
    ("suggest_dish_moin_moin", "suggestDishes", {"input": plan(mode="dish", dishId="moin_moin")}),
    ("suggest_dish_gbegiri", "suggestDishes", {"input": plan(mode="dish", dishId="gbegiri")}),
    ("suggest_user_price_okpa", "suggestDishes",
     {"input": plan(mode="dish", dishId="okpa", userPricesNgnPerKg={"bambara": 2000})}),
    ("suggest_budget_too_low", "suggestDishes", {"input": plan(budgetNgn=500)}),
    ("suggest_allergen_peanut_egusi", "suggestDishes",
     {"input": plan(mode="dish", dishId="egusi_soup", allergens=["peanut"])}),
    ("rank_akara_all_soy_allergen", "rankIngredients",
     {"applicationId": "akara_batter", "input": plan(allergens=["soy"]), "candidateIds": None}),
    ("rank_seed_soup_peanut_allergen", "rankIngredients",
     {"applicationId": "seed_soup_body", "input": plan(allergens=["peanut"]), "candidateIds": ["melon_seed", "groundnut"]}),
    ("processing_cowpea_phytate", "recommendProcessing", {"ingredientId": "cowpea", "goal": "phytate"}),
    ("processing_bambara_phytate_thin", "recommendProcessing", {"ingredientId": "bambara", "goal": "phytate"}),
    ("processing_melon_seed_tannin_no_data", "recommendProcessing", {"ingredientId": "melon_seed", "goal": "tannin"}),
    ("processing_melon_seed_phytate_no_pooled", "recommendProcessing", {"ingredientId": "melon_seed", "goal": "phytate"}),
    ("processing_ayb_oxalate_alias_goal", "recommendProcessing", {"ingredientId": "african_yam_bean", "goal": "oxalate_mg100g"}),
    ("processing_soybean_phytate_model", "recommendProcessing", {"ingredientId": "soybean", "goal": "phytate"}),
    ("processing_cowpea_tannin_model_not_used", "recommendProcessing", {"ingredientId": "cowpea", "goal": "tannin"}),
]
# safetyGuard cases take a processing result from the engine as input.
SAFETY_CASES = [
    ("safety_cowpea_phytate_block_option", "cowpea", "phytate", {"allergens": []}),
    ("safety_groundnut_phytate_warn", "groundnut", "phytate", {"allergens": []}),
    ("safety_groundnut_user_allergen_block", "groundnut", "phytate", {"allergens": ["peanut"]}),
    ("safety_bambara_phytate", "bambara", "phytate", {"allergens": []}),
    ("safety_soybean_phytate_model", "soybean", "phytate", {"allergens": []}),
]


def run_case(fn: str, args: dict, data: dict):
    if fn == "suggestDishes":
        return suggest_dishes(args["input"], data)
    if fn == "rankIngredients":
        return rank_ingredients(args["applicationId"], args["input"], data, args.get("candidateIds"))
    if fn == "recommendProcessing":
        return recommend_processing(args["ingredientId"], args["goal"], data, args.get("direction"))
    if fn == "safetyGuard":
        return safety_guard(args["result"], args["ctx"], data)
    raise ValueError(f"unknown fn {fn}")


def all_cases(data: dict) -> list[tuple[str, str, dict]]:
    cases = list(CASES)
    for name, iid, goal, ctx in SAFETY_CASES:
        cases.append((name, "safetyGuard", {"result": recommend_processing(iid, goal, data), "ctx": ctx}))
    return cases


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", type=Path, default=ROOT / "mobile" / "assets" / "bundle")
    ap.add_argument("--out", type=Path, default=ROOT / "tests" / "golden")
    args = ap.parse_args(argv)
    data = load_bundle(args.bundle)
    if args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True)
    index = []
    for name, fn, case_args in all_cases(data):
        case = {"name": name, "fn": fn, "args": case_args, "expected": run_case(fn, case_args, data),
                "bundleVersion": data["version"]}
        (args.out / f"{name}.json").write_text(json.dumps(case, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
                                               encoding="utf-8")
        index.append(name)
    (args.out / "index.json").write_text(json.dumps({"bundleVersion": data["version"], "cases": index}, indent=1) + "\n",
                                         encoding="utf-8")
    print(f"{len(index)} golden cases written to {args.out} (bundle {data['version']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
