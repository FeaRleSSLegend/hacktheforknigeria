"""ETL unit tests. All frames below are synthetic test inputs, not real data."""
import math

import pandas as pd
import pytest

from training.etl.common import dm_to_as_sold, parse_bracket
from training.etl.prices import classify_unit
from training.etl.pulses import ID_COLS, parse_two_row
from training.processing_model import recompute_change


@pytest.mark.parametrize("cell,expected", [
    ("[0.2]", (0.2, True)),
    (" [ 13.8 ] ", (13.8, True)),
    ("22.6", (22.6, False)),
    (2.8, (2.8, False)),
    ("", (None, False)),
    (None, (None, False)),
    (float("nan"), (None, False)),
    ("tr", (None, False)),
    ("[tr]", (None, False)),
])
def test_parse_bracket(cell, expected):
    assert parse_bracket(cell) == expected


def test_dm_to_as_sold():
    assert dm_to_as_sold(25.0, 11.0) == pytest.approx(22.25)
    assert dm_to_as_sold(10.0, 0.0) == 10.0
    assert dm_to_as_sold(None, 11.0) is None
    assert dm_to_as_sold(10.0, None) is None
    with pytest.raises(ValueError):
        dm_to_as_sold(10.0, 100.0)


def _two_row_sheet():
    """Mimics sheet 05: title, blank, tags, descriptions, then data/doc row pairs."""
    tags = ID_COLS + ["WATER(g)", "PROTCNT(g)", "FE(mg)", "LYS(mg)", "VITC(mg)"]
    width = len(tags)
    blank = [None] * width
    desc = ["Food Item ID"] + [None] * (width - 1)
    a = ["X001_DM", "", "Bean A, raw", "d/r", "Sp a", "", "ref1", 0, 25.0, "[6.0]", 1700, 1]
    a_doc = [None, "", "", "", "", "", "Value documentation", "c", "c", "a", "c", "r"]
    b = ["X002_DM", "Nigeria", "Bean B, raw", "d/r", "Sp b", "", "ref2", 0, 20.0, 4.0, "", "tr"]
    b_doc = [None, "", "", "", "", "", "Value documentation", "c", "a*", "a", "", "z"]
    return pd.DataFrame([["title"] + [None] * (width - 1), blank, tags, desc, a, a_doc, b, b_doc])


def test_two_row_parser_one_row_per_food():
    df, dropped = parse_two_row(_two_row_sheet())
    assert list(df["FoodID"]) == ["X001_DM", "X002_DM"]
    assert dropped["value documentation row (codes kept in doc_ columns)"] == 2
    assert not (df["BiblioID"] == "Value documentation").any()
    assert "vitc_mg" not in df.columns  # only kept tags
    a = df.iloc[0]
    assert a["protcnt_g"] == 25.0 and a["doc_protcnt_g"] == "c"
    assert a["fe_mg"] == 6.0 and a["doc_fe_mg"] == "a"  # brackets stripped
    b = df.iloc[1]
    assert b["doc_protcnt_g"] == "a*"
    assert b["lys_mg"] is None or math.isnan(b["lys_mg"])  # empty stays missing, not 0


@pytest.mark.parametrize("label,usable", [
    ("Beans Brown", True),
    ("Yam Tuber", True),
    ("Semovita, Prepacked (1kg)", True),
    ("Wheat Flour, Prepacked (2kg)", False),
    ("Vegetable Oil, 75cl", False),
    ("Groundnuts, roasted,75cl bottle", False),
    ("Bread (sliced), 450g", False),
    ("Tin Milk-Evaporated, Peak Milk, 150g", False),
    ("Agric hen eggs, (a Crate of 30 pieces)", False),
    ("Agric hen eggs, ", False),
    ("Watermelon whole, medium size fresh", False),
])
def test_nbs_per_kg_filter(label, usable):
    assert classify_unit(label)[1] is usable


def test_recompute_change_and_zero_baseline():
    df = pd.DataFrame({"exp_id": ["a", "b", "c"], "baseline_value": [10.0, 0.0, 4.0],
                       "treated_value": [5.0, 1.0, 5.0], "change_pct": [-50.0, 0.0, 25.0]})
    out, mismatches, undefined = recompute_change(df)
    assert mismatches == [] and undefined == 1
    assert math.isnan(out.loc[1, "change_pct"])
    bad = df.assign(change_pct=[-40.0, 0.0, 25.0])
    assert len(recompute_change(bad)[1]) == 1
