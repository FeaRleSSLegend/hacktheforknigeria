"""Unit tests for rank, processing and safety on small synthetic data (TEST ONLY values)."""
import pytest

from reference.loader import load_data
from reference.processing import instruction_for, recommend_processing, steps_from_text, treatment_steps
from reference.rank import rank_ingredients
from reference.safety import safety_guard
from tests.test_engine import FIX, base_input


@pytest.fixture
def data():
    return load_data(FIX)


def row(exp, crop, treatment, change, paper="p1", t=None, c=None, metric="phytate", note=""):
    return {"exp_id": exp, "crop_id": crop, "treatment": treatment, "time_h": t, "temp_c": c,
            "outcome_metric": metric, "change_pct": change, "paper_id": paper, "method_note": note, "quality": "measured"}


RULES = [
    {"id": "cook", "applies_to": ["legume_processing_without_heat", "soaking", "germination"], "severity": "block",
     "text": "Cook fully.", "source": "s", "reviewed": False},
    {"id": "ferm", "applies_to": ["fermentation"], "severity": "warn", "text": "Fermentation varies.", "source": "s",
     "reviewed": False},
    {"id": "crop", "applies_to": ["test_a"], "severity": "warn", "text": "Crop caution.", "source": "s", "reviewed": True},
]


def proc_data(data, rows, model=None):
    return dict(data, treatments=rows, playbook={}, safetyRules=RULES, model=model or {})


# rankIngredients

def test_rank_unpriced_is_never_headline(data):
    r = rank_ingredients("test_app", base_input(), data, ["test_noprice", "test_a", "test_nodata"])
    assert [i["ingredientId"] for i in r["items"]] == ["test_a"]
    assert {e["id"]: e["reason"] for e in r["excluded"]} == {
        "test_noprice": "no functional data for this dish", "test_nodata": "no functional data for this dish"}


def test_rank_unpriced_with_data_flagged_price_needed(data):
    data = dict(data, ingredients=dict(data["ingredients"]))
    data["ingredients"]["test_b"] = dict(data["ingredients"]["test_b"], price_ngn_per_kg=None)
    r = rank_ingredients("test_app", base_input(), data, ["test_c", "test_b"])
    assert r["items"][0]["ingredientId"] == "test_c"
    b = r["items"][1]
    assert b["score"] is None and b["costNgn"] is None and "price needed" in b["flags"]
    assert b["fit"] > r["items"][0]["fit"]  # better fit still sorts after the priced item


def test_rank_drivers_are_plain_text(data):
    r = rank_ingredients("test_app", base_input(), data, ["test_a", "test_b", "test_c"])
    for i in r["items"]:
        assert all(isinstance(d, str) for d in i["drivers"])
    assert r["items"][0]["quality"]["weights"] == "estimated"


def test_rank_unknown_application(data):
    r = rank_ingredients("nope", base_input(), data)
    assert r["items"] == [] and r["excluded"][0]["reason"] == "unknown application"


# recommendProcessing

def test_treatment_parsing():
    assert treatment_steps("soaking_deep_frying") == ["soaking", "deep_frying"]
    assert treatment_steps("wet_milling") == ["wet_milling"]
    assert steps_from_text(["Soak, then pressure-cook until soft."]) == ["soaking", "pressure_cooking"]
    assert instruction_for("soaking_boiling") == "Soak in clean water, then boil until fully soft."


def test_fallback_same_crop_first_then_labelled_other_crop(data):
    rows = [row("1", "test_a", "boiling", -40), row("2", "test_a", "boiling", -60, paper="p2"),
            row("3", "other", "soaking", -90), row("4", "test_a", "x", 5, metric="tannin")]
    r = recommend_processing("test_a", "phytate", proc_data(data, rows))
    assert r["mode"] == "fallback" and "not predictions" in r["note"]
    first, second = r["options"]
    assert first["kind"] == "published_same_crop" and first["effectRange"] == [-60, -40]
    assert first["sources"] == ["p1", "p2"] and first["nRows"] == 2
    assert second["kind"] == "published_other_crop" and "measured on other" in second["evidence"]


def test_fallback_cumulative_rows_labelled_and_aliases(data):
    rows = [row("1", "test_a", "steaming", -80, note="cumulative from raw", metric="phytate_mg100g")]
    r = recommend_processing("test_a", "phytate", proc_data(data, rows))
    assert "cumulative" in r["options"][0]["evidence"]


def test_fallback_orders_lower_is_better_for_antinutrients(data):
    rows = [row("1", "test_a", "boiling", -10), row("2", "test_a", "roasting", -50), row("3", "test_a", "steaming", -30)]
    r = recommend_processing("test_a", "phytate", proc_data(data, rows))
    assert [o["treatment"] for o in r["options"]] == ["roasting", "steaming", "boiling"]


def test_no_rows_says_so(data):
    r = recommend_processing("test_a", "phytate", proc_data(data, []))
    assert r["options"] == [] and "No published rows" in r["note"]


# Synthetic model.json in the AI lane's format (TEST ONLY values).
TABLE = {"models": {"phytate": {
    "kind": "C3", "key": "treatment|outcome_metric", "display_label": "estimated from other legumes",
    "ships_only_with_different_crop_rows": True,
    "entries": {"boiling|phytate": {"value": -30.0, "n_rows": 2, "papers": ["p1", "p2"], "crops": ["test_b", "other"],
                                    "citations": ["1", "2"], "time_h": [0.5, 1.0], "temp_c": [100.0, 100.0],
                                    "cumulative_from_raw": False},
                "soaking|phytate": {"value": -10.0, "n_rows": 1, "papers": ["p1"], "crops": ["test_b"],
                                    "citations": ["3"], "time_h": [12.0, 12.0], "temp_c": None,
                                    "cumulative_from_raw": True},
                "boiling|tannin": {"value": -99.0, "n_rows": 1, "papers": ["p9"], "crops": ["test_b"],
                                   "citations": ["9"], "time_h": None, "temp_c": None, "cumulative_from_raw": False}}}}}
OTHER = [row("1", "test_b", "boiling", -40, t=0.5, c=100), row("2", "test_b", "boiling", -20, paper="p2", t=1, c=100),
         row("3", "test_b", "soaking", -10, t=12)]


def test_table_model_used_only_without_same_crop_rows(data):
    r = recommend_processing("test_a", "phytate", proc_data(data, OTHER, TABLE))
    assert r["mode"] == "model" and "Not measured on this crop" in r["note"]
    first, second = r["options"][0], r["options"][1]
    assert first["kind"] == "model" and first["treatment"] == "boiling" and first["cropId"] == "test_a"
    assert first["pooledFrom"] == ["test_b", "other"]
    assert first["effect"] == "Estimated change: -30.0% (pooled from test_b, other)"
    assert first["effectRange"] == [-40.0, -20.0]  # min and max of the cited published rows
    assert first["evidence"].startswith("estimated from other legumes (pooled from test_b, other); not measured on test_a")
    assert first["conditions"] == "published range in the pooled rows: time 0.5 to 1 h; temperature 100 C"
    assert "cumulative" in second["evidence"]
    assert all(o["kind"] != "model" or "tannin" not in o["effect"] for o in r["options"])
    assert r["options"][-1]["kind"] == "published_other_crop"


def test_same_crop_rows_win_over_model(data):
    rows = OTHER + [row("4", "test_a", "roasting", -5)]
    r = recommend_processing("test_a", "phytate", proc_data(data, rows, TABLE))
    assert r["mode"] == "fallback" and r["options"][0]["kind"] == "published_same_crop"


def test_unread_model_kinds_fall_back(data):
    for spec in ({"kind": "ridge", "training_ranges": {}}, {"kind": "C1", "key": "treatment_family|outcome_metric",
                                                             "entries": TABLE["models"]["phytate"]["entries"]}):
        r = recommend_processing("test_a", "phytate", proc_data(data, OTHER, {"models": {"phytate": spec}}))
        assert r["mode"] == "fallback"



# safetyGuard

def test_guard_blocks_unheated_option_only(data):
    rows = [row("1", "test_c", "soaking", -20), row("2", "test_c", "soaking_boiling", -50)]
    d = proc_data(data, rows)
    g = safety_guard(recommend_processing("test_c", "phytate", d), {"allergens": []}, d)
    assert g["allowed"] is True
    assert [o["treatment"] for o in g["result"]["options"]] == ["soaking_boiling"]
    assert len(g["blocked"]) == 1 and "Cook fully." in g["blocked"][0] and "not yet reviewed" in g["blocked"][0]


def test_guard_warns_and_labels_unreviewed(data):
    rows = [row("1", "test_c", "boiling_fermentation", -20)]
    d = proc_data(data, rows)
    g = safety_guard(recommend_processing("test_c", "phytate", d), {"allergens": []}, d)
    assert g["allowed"] and g["warnings"] == ["Fermentation varies. (safety rule not yet reviewed by an expert)"]


def test_guard_crop_rule_and_user_allergen(data):
    d = proc_data(data, [row("1", "test_b", "boiling", -20)])
    res = recommend_processing("test_b", "phytate", d)
    g = safety_guard(res, {"allergens": ["allergen_x"]}, d)
    assert g["allowed"] is False and g["result"] is None and "allergen_x" in g["blocked"][0]
    g = safety_guard(recommend_processing("test_a", "phytate", d), {"allergens": []}, d)
    assert "Crop caution." in g["warnings"]  # reviewed rule: no unreviewed label


def test_guard_all_options_blocked_is_not_allowed(data):
    d = proc_data(data, [row("1", "test_c", "germination", -20)])
    g = safety_guard(recommend_processing("test_c", "phytate", d), {"allergens": []}, d)
    assert g["allowed"] is False and g["result"] is None


def test_guard_plate_result_uses_ingredient_rules(data):
    d = proc_data(data, [])
    plate = {"totals": {"proteinG": 20}, "status": {}, "suggestedSides": [], "notes": []}
    g = safety_guard(plate, {"ingredientIds": ["test_a", "test_side"], "allergens": []}, d)
    assert g["allowed"] and g["warnings"] == ["Crop caution."] and g["result"] is plate
