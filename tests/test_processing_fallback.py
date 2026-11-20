"""Fallback tests. Rows are SYNTHETIC test inputs, not real data."""
import pytest

from reference.processing_fallback import (LABEL_DIFFERENT_CROP, LABEL_INTERPOLATED, LABEL_NONE,
                                           LABEL_RELATED, fallback_lookup)


def row(exp, crop, trt, t, change, paper="p1", temp="25", metric="phytate"):
    return {"exp_id": exp, "crop_id": crop, "treatment": trt, "time_h": t, "temp_c": temp,
            "outcome_metric": metric, "change_pct": change, "paper_id": paper, "page": "Table 1",
            "quote": f"q{exp}", "quality": "measured"}


ROWS = [
    row("A1", "bean_a", "germination", "24", "-10"),
    row("A2", "bean_a", "germination", "48", "-20"),
    row("A3", "bean_a", "germination", "96", "-40"),
    row("B1", "bean_b", "fermentation", "72", "-30", paper="p2", temp=""),
    row("C1", "bean_c", "boiling", "", "5", paper="p3", temp=""),
]


def test_nearest_in_time_first():
    r = fallback_lookup(ROWS, "bean_a", "germination", "phytate", time_h=90)
    assert r["mode"] == "interpolated"
    r = fallback_lookup(ROWS, "bean_a", "germination", "phytate")
    assert r["mode"] == "same_crop" and r["estimate"] is None
    assert [c["expId"] for c in r["rows"]] == ["A1", "A2", "A3"]
    assert all(c["paperId"] and c["page"] and c["quote"] for c in r["rows"])


def test_interpolates_between_published_points():
    r = fallback_lookup(ROWS, "bean_a", "germination", "phytate", time_h=36)
    assert r["label"] == LABEL_INTERPOLATED
    assert r["estimate"] == pytest.approx(-15.0)
    assert [c["expId"] for c in r["rows"][:2]] == ["A1", "A2"]


def test_exact_published_point():
    r = fallback_lookup(ROWS, "bean_a", "germination", "phytate", time_h=48)
    assert r["mode"] == "published_point" and r["estimate"] == -20.0


@pytest.mark.parametrize("t", [12, 120])
def test_never_extrapolates(t):
    r = fallback_lookup(ROWS, "bean_a", "germination", "phytate", time_h=t)
    assert r["mode"] == "same_crop" and r["estimate"] is None
    assert "no extrapolation" in r["reason"]


def test_no_interpolation_across_papers_or_temperatures():
    rows = [row("X1", "bean_a", "soak", "10", "0", paper="p1"), row("X2", "bean_a", "soak", "20", "-10", paper="p2"),
            row("Y1", "bean_a", "soak", "30", "0", paper="p3", temp="25"),
            row("Y2", "bean_a", "soak", "40", "-10", paper="p3", temp="35")]
    assert fallback_lookup(rows, "bean_a", "soak", "phytate", time_h=15)["estimate"] is None
    assert fallback_lookup(rows, "bean_a", "soak", "phytate", time_h=35)["estimate"] is None


def test_different_crop_has_no_point_estimate():
    r = fallback_lookup(ROWS, "bean_x", "fermentation", "phytate", time_h=72)
    assert r["label"] == LABEL_DIFFERENT_CROP and r["estimate"] is None
    assert [c["cropId"] for c in r["rows"]] == ["bean_b"]


def test_no_published_data():
    r = fallback_lookup(ROWS, "bean_a", "soaking", "phytate")
    assert r["label"] == LABEL_NONE and r["estimate"] is None and r["rows"] == []
    assert "soaking" in r["reason"]


def test_metric_must_match():
    r = fallback_lookup(ROWS, "bean_a", "germination", "oxalate")
    assert r["mode"] == "no_published_data"


def test_several_rows_at_asked_time_give_range_not_one_number():
    rows = [row("V1", "bean_a", "boil", "0.33", "-49"), row("V2", "bean_a", "boil", "0.33", "-50.4"),
            row("V3", "bean_a", "boil", "0.33", "-41.9")]
    r = fallback_lookup(rows, "bean_a", "boil", "phytate", time_h=0.33)
    assert r["mode"] == "published_range" and r["estimate"] is None
    assert r["range"] == [-50.4, -41.9]


def test_combined_treatment_returned_as_related_not_as_plain():
    rows = ROWS + [row("D1", "bean_a", "dehulling_soaking", "0.5", "-60"),
                   row("S1", "bean_b", "soaking", "12", "-20", paper="p4")]
    for asked in ("soaking", "dehulling"):
        r = fallback_lookup(rows, "bean_a", asked, "phytate")
        assert r["mode"] == "related_treatment" and r["label"] == LABEL_RELATED and r["estimate"] is None
        assert [c["treatment"] for c in r["rows"]] == ["dehulling_soaking"]
        assert "dehulling_soaking" in r["reason"]
    exact = fallback_lookup(rows, "bean_a", "dehulling_soaking", "phytate")
    assert exact["mode"] == "same_crop"
    other = fallback_lookup(rows, "bean_c", "soaking", "phytate")
    assert other["mode"] == "different_crop" and [c["cropId"] for c in other["rows"]] == ["bean_b"]


def test_needs_human_rows_are_marked():
    rows = [dict(row("N1", "bean_a", "fermentation", "24", "-10"), method_note="NEEDS_HUMAN: unit unclear; x")]
    r = fallback_lookup(rows, "bean_a", "fermentation", "phytate")
    assert r["rows"][0]["needsHuman"] is True
