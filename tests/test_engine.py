from pathlib import Path

import pytest

from reference.loader import load_data
from reference.scoring import aggregate_property, fit_scores, scale_across
from reference.sizing import as_sold_g, cost_ngn, target_protein_per_meal
from reference.suggest import suggest_dishes

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture
def data():
    return load_data(FIX)


def base_input(**kw):
    inp = {"mode": "pantry", "pantryIds": [], "budgetNgn": 100000, "servings": 1, "targetProteinG": 20, "allergens": []}
    inp.update(kw)
    return inp


def test_sizing_by_hand():
    assert as_sold_g(20, 20) == pytest.approx(100.0)  # 20 g protein at 20 g/100 g -> 100 g
    assert cost_ngn(100, 2000) == pytest.approx(200.0)  # 100 g at 2000 NGN/kg
    assert target_protein_per_meal(60) == pytest.approx(16.0)  # 0.8 * 60 / 3


def test_sizing_rejects_bad_input():
    with pytest.raises(ValueError):
        as_sold_g(20, 0)
    with pytest.raises(ValueError):
        target_protein_per_meal(0)


def test_aggregate_uses_one_form_only(data):
    a = aggregate_property(data["properties"], "test_c", "foaming", "flour")
    assert a == (20.0, 20.0, 20.0, 1)  # isolate value 99 is not mixed in
    a = aggregate_property(data["properties"], "test_a", "foaming", "flour")
    assert a == (70.0, 60.0, 80.0, 2)  # median of 60 and 80, range kept
    assert aggregate_property(data["properties"], "test_a", "nope") is None


def test_scale_across():
    assert scale_across({"a": 0, "b": 10}) == {"a": 0.0, "b": 1.0}
    assert scale_across({"a": 0, "b": 10}, higher_is_better=False) == {"a": 1.0, "b": 0.0}
    assert scale_across({"a": 5, "b": 5}) == {"a": 0.5, "b": 0.5}
    assert scale_across({"a": None, "b": 3})["a"] is None


def test_fit_ranks_and_ranges(data):
    app = data["applications"]["test_app"]
    f = fit_scores(app, ["test_a", "test_b", "test_c"], data["properties"])
    assert f["test_a"]["fit"] == pytest.approx(0.75)  # foaming 1.0, wac 0.5, equal weights
    assert f["test_b"]["fit"] == pytest.approx(0.70)  # foaming 0.4, wac 1.0
    assert f["test_c"]["fit"] == pytest.approx(0.0)
    lo, hi = f["test_a"]["fitRange"]
    assert lo <= f["test_a"]["fit"] <= hi


def test_missing_property_is_flagged_not_guessed(data):
    app = data["applications"]["test_app"]
    f = fit_scores(app, ["test_a", "test_nodata"], data["properties"])
    assert f["test_nodata"]["fit"] is None and f["test_nodata"]["ranked"] is False
    assert set(f["test_nodata"]["missingNeeds"]) == {"foaming", "wac"}


def test_one_of_four_needs_is_not_ranked():
    app = {"id": "four", "needs": [{"property": p, "direction": "higher", "weight": 0.25}
                                   for p in ("foaming", "wac", "oac", "emulsion")]}
    rows = [{"ingredient_id": "full", "property": p, "value": v, "form": "flour"}
            for p, v in (("foaming", 10), ("wac", 2), ("oac", 1), ("emulsion", 30))]
    rows += [{"ingredient_id": "full2", "property": p, "value": v, "form": "flour"}
             for p, v in (("foaming", 5), ("wac", 1), ("oac", 2), ("emulsion", 20))]
    rows += [{"ingredient_id": "one_of_four", "property": "foaming", "value": 99, "form": "flour"}]
    f = fit_scores(app, ["full", "full2", "one_of_four"], rows)
    assert f["one_of_four"]["fit"] is None and f["one_of_four"]["ranked"] is False
    assert f["one_of_four"]["missingNeeds"] == ["wac", "oac", "emulsion"]
    assert f["full"]["ranked"] and f["full2"]["ranked"]
    assert f["full"]["fit"] == pytest.approx(0.75)  # foaming 1, wac 1, oac 0, emulsion 1


def test_unranked_candidate_does_not_shift_scaling(data):
    app = data["applications"]["test_app"]
    base = fit_scores(app, ["test_a", "test_b", "test_c"], data["properties"])
    more = fit_scores(app, ["test_a", "test_b", "test_c", "test_partial"], data["properties"])
    for c in ("test_a", "test_b", "test_c"):
        assert more[c]["fit"] == pytest.approx(base[c]["fit"])
    assert more["test_partial"]["missingNeeds"] == ["wac"]


def dish(r, dish_id):
    return next(d for d in r["dishes"] if d["dishId"] == dish_id)


def test_suggest_basic(data):
    r = suggest_dishes(base_input(), data)
    assert {d["dishId"] for d in r["dishes"]} == {"test_dish", "test_dish_noprice", "test_dish_mixed"}
    d = dish(r, "test_dish")
    assert d["protein"]["ingredientId"] in {"test_a", "test_b", "test_c"}
    assert d["proteinPerPlateG"] == 20.0
    assert "cost excludes oil and spices" in d["flags"]
    reasons = {e["id"]: e["reason"] for e in r["excluded"]}
    assert reasons["test_dish_nodata"] == "not enough functional data: test_nodata (missing foaming, wac)"


def test_partial_ingredient_goes_to_not_enough_data(data):
    d = dish(suggest_dishes(base_input(), data), "test_dish")
    assert d["protein"]["ingredientId"] != "test_partial"
    assert d["notEnoughData"] == [{"id": "test_partial", "missingNeeds": ["wac"]}]
    assert "not enough data: test_partial" in d["flags"]


def test_no_price_still_ranks_and_skips_budget_filter(data):
    r = suggest_dishes(base_input(budgetNgn=1), data)
    d = dish(r, "test_dish_noprice")
    p = d["protein"]
    assert p["ingredientId"] == "test_noprice" and p["fit"] is not None
    assert p["costNgn"] is None and p["costPerGProtein"] is None and p["priceSource"] is None
    assert p["flags"] == ["price needed"]
    assert d["missingItems"] == [{"id": "test_noprice", "costNgn": None}]
    assert d["totalCostNgn"] is None
    assert "budget check leaves out items with no price" in d["flags"]


def test_user_price_used_when_no_bundled_price(data):
    r = suggest_dishes(base_input(userPricesNgnPerKg={"test_noprice": 1500}), data)
    p = dish(r, "test_dish_noprice")["protein"]
    assert p["priceSource"] == "user"
    assert p["asSoldG"] == pytest.approx(80.0)  # 20 g protein at 25 g/100 g
    assert p["costNgn"] == pytest.approx(120.0)  # 80 g at 1500 NGN/kg
    assert p["flags"] == []


def test_user_price_overrides_bundled_price(data):
    r = suggest_dishes(base_input(pantryIds=["test_a"],
                                  userPricesNgnPerKg={"test_a": 4000}), data)
    p = dish(r, "test_dish")["protein"]
    assert p["ingredientId"] == "test_a" and p["priceSource"] == "user"
    assert p["costNgn"] == pytest.approx(400.0)  # 100 g at 4000 NGN/kg, not 2000


def test_user_price_applies_to_budget_filter(data):
    r = suggest_dishes(base_input(budgetNgn=100, userPricesNgnPerKg={"test_noprice": 1500}), data)
    assert any(e["id"] == "test_dish_noprice" and "over budget" in e["reason"] for e in r["excluded"])


def test_bad_user_price_rejected(data):
    for bad in (0, -5, "100", True):
        with pytest.raises(ValueError):
            suggest_dishes(base_input(userPricesNgnPerKg={"test_a": bad}), data)


def test_allergen_is_excluded_with_reason(data):
    r = suggest_dishes(base_input(allergens=["allergen_x"]), data)
    assert dish(r, "test_dish")["protein"]["ingredientId"] != "test_b"


def test_budget_filter(data):
    r = suggest_dishes(base_input(budgetNgn=1), data)
    assert [d["dishId"] for d in r["dishes"]] == ["test_dish_noprice"]  # unpriced, so not budget-filtered
    assert any(e["id"] == "test_dish" and "over budget" in e["reason"] for e in r["excluded"])


def test_pantry_preferred_and_free(data):
    r = suggest_dishes(base_input(pantryIds=["test_c", "test_side"], budgetNgn=1), data)
    d = dish(r, "test_dish")
    assert d["protein"]["ingredientId"] == "test_c"
    assert d["missingItems"] == []
    assert d["totalCostNgn"] > 0  # full cost still reported even when owned


def test_dish_mode_filters(data):
    r = suggest_dishes(base_input(mode="dish", dishId="test_dish"), data)
    assert len(r["dishes"]) == 1 and r["excluded"] == []


def test_deterministic(data):
    assert suggest_dishes(base_input(), data) == suggest_dishes(base_input(), data)


def test_unpriced_never_headline_when_priced_exists(data):
    d = dish(suggest_dishes(base_input(), data), "test_dish_mixed")
    assert d["protein"]["ingredientId"] == "test_c"  # priced, although test_noprice has the higher fit
    ranked = d["ranked"]
    assert [x["ingredientId"] for x in ranked] == ["test_c", "test_noprice"]
    assert ranked[1]["score"] is None and ranked[1]["flags"] == ["price needed"]
    assert ranked[1]["fit"] > ranked[0]["fit"]
    assert "price needed for lower-ranked options: test_noprice" in d["flags"]


def test_unpriced_pantry_item_is_not_headline(data):
    d = dish(suggest_dishes(base_input(pantryIds=["test_noprice"]), data), "test_dish_mixed")
    assert d["protein"]["ingredientId"] == "test_c"
    assert {"id": "test_c", "costNgn": d["protein"]["costNgn"]} in d["missingItems"]


def test_dishes_with_unpriced_headline_sort_last(data):
    r = suggest_dishes(base_input(), data)
    ids = [x["dishId"] for x in r["dishes"]]
    assert ids[-1] == "test_dish_noprice"
    assert all(x["protein"]["score"] is not None for x in r["dishes"][:-1])


def test_user_price_moves_item_into_scored_ranking(data):
    d = dish(suggest_dishes(base_input(userPricesNgnPerKg={"test_noprice": 100}), data), "test_dish_mixed")
    assert all(x["score"] is not None for x in d["ranked"])
    assert d["protein"]["ingredientId"] == "test_noprice"  # cheap and better fit once priced
