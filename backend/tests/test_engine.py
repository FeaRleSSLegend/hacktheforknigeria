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
    assert f["test_nodata"]["fit"] is None
    assert set(f["test_nodata"]["missingNeeds"]) == {"foaming", "wac"}


def test_suggest_basic(data):
    r = suggest_dishes(base_input(), data)
    assert [d["dishId"] for d in r["dishes"]] == ["test_dish"]
    d = r["dishes"][0]
    assert d["protein"]["ingredientId"] in {"test_a", "test_b", "test_c"}
    protein = {"test_a": 20, "test_b": 30, "test_c": 10}[d["protein"]["ingredientId"]]
    assert d["dryGPerServing"] == 100 and d["proteinPerPlateG"] == protein  # 100 g portion x protein per 100 g
    assert d["proteinCostNgn"] == d["protein"]["costNgn"] and d["costLabel"] == "protein ingredient only, no oil or spices"
    assert "cost excludes oil and spices" in d["flags"]
    reasons = {e["id"]: e["reason"] for e in r["excluded"]}
    assert reasons["test_dish_nodata"] == ("no usable protein: test_nodata (not enough data: missing foaming, wac); "
                                          "test_noprice (not enough data: missing foaming, wac)")
    assert "no usable protein" in reasons["test_dish_noprice"]


def test_allergen_is_excluded_with_reason(data):
    r = suggest_dishes(base_input(allergens=["allergen_x"]), data)
    assert r["dishes"][0]["protein"]["ingredientId"] != "test_b"


def test_budget_filter(data):
    r = suggest_dishes(base_input(budgetNgn=1), data)
    assert r["dishes"] == []
    assert any(e["id"] == "test_dish" and "over budget" in e["reason"] for e in r["excluded"])


def test_pantry_preferred_and_free(data):
    r = suggest_dishes(base_input(pantryIds=["test_c", "test_side"], budgetNgn=1), data)
    d = r["dishes"][0]
    assert d["protein"]["ingredientId"] == "test_c"
    assert d["missingItems"] == []
    assert d["totalCostNgn"] > 0  # full cost still reported even when owned


def test_dish_mode_filters(data):
    r = suggest_dishes(base_input(mode="dish", dishId="test_dish"), data)
    assert len(r["dishes"]) == 1 and r["excluded"] == []


def test_deterministic(data):
    assert suggest_dishes(base_input(), data) == suggest_dishes(base_input(), data)
