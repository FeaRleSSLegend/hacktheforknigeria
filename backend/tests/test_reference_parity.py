"""The backend engine must rank like the root reference engine (the source of truth, PROJECT.md section 7).

Both engines run on the real repo-root data/. The root package is loaded under another name because
both packages are called "reference". Compared per dish: which plants are ranked and their fit, which
go to notEnoughData, and for priced plants the score, protein per plate and protein cost. (The engines
differ on purpose in one place: the backend never makes an unpriced plant the headline, so it lists
such a dish as excluded, while the root engine shows it with "price needed".)
"""
import importlib
import importlib.util
import sys
from pathlib import Path

import pytest

from reference.loader import load_data
from reference.rank import rank_ingredients

REPO = Path(__file__).resolve().parents[2]
INPUT = {"mode": "dish", "pantryIds": [], "budgetNgn": 100000, "servings": 4, "targetProteinG": 20, "allergens": []}


def _root(module: str):
    if "rootref" not in sys.modules:
        spec = importlib.util.spec_from_file_location("rootref", REPO / "reference" / "__init__.py",
                                                      submodule_search_locations=[str(REPO / "reference")])
        mod = importlib.util.module_from_spec(spec)
        sys.modules["rootref"] = mod
        spec.loader.exec_module(mod)
    return importlib.import_module(f"rootref.{module}")


@pytest.fixture(scope="module")
def engines():
    root_data = _root("loader").load_data(REPO / "data")
    return root_data, load_data(REPO / "data", REPO / "bundle" / "model.json")


def _r4(x):
    return None if x is None else round(x, 4)


@pytest.mark.parametrize("dish_id", ["akara", "moin_moin", "ekuru", "okpa", "gbegiri", "egusi_soup"])
def test_backend_ranks_like_root_reference(engines, dish_id):
    root_data, data = engines
    root = _root("suggest").suggest_dishes({**INPUT, "dishId": dish_id}, root_data)["dishes"][0]
    dish = next(d for d in data["dishes"] if d["id"] == dish_id)
    mine = rank_ingredients(dish["application_id"], INPUT, data, dish["protein_slot_ids"], dish["typical_dry_g_per_serving"])
    assert {x["ingredientId"]: _r4(x["fit"]) for x in root["ranked"]} == {i["ingredientId"]: i["fit"] for i in mine["items"]}
    assert root["notEnoughData"] == mine["notEnoughData"]
    root_priced = {x["ingredientId"]: x for x in root["ranked"] if x["score"] is not None}
    mine_priced = {i["ingredientId"]: i for i in mine["items"] if i["score"] is not None}
    assert set(root_priced) == set(mine_priced)
    for c, x in root_priced.items():
        assert mine_priced[c]["score"] == _r4(x["score"])
        assert mine_priced[c]["costNgn"] == x["costNgn"] and mine_priced[c]["costPerPersonNgn"] == x["costPerPersonNgn"]
        assert mine_priced[c]["proteinPerPlateG"] == x["proteinPerPlateG"]
