"""Ranking sanity check on real rows, plus leave-one-paper-out stability.

Runs the backend reference engine unchanged (default weights from reference/config.py).
If data/applications.json or data/dishes.json is empty, the clearly named test fixture in
training/fixtures/ is used and the report says so.

Two views:
  - App output: suggest_dishes in dish mode (needs price, so only priced ingredients compete).
  - Fit-only diagnostic: functional fit for every protein slot, ignoring price. Not app output;
    it shows how the functional ranking would look once prices exist.
Writes reports/ranking_stability.md.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from reference.loader import load_data  # noqa: E402
from reference.scoring import fit_scores  # noqa: E402
from reference.suggest import suggest_dishes  # noqa: E402

FIXTURES = ROOT / "training" / "fixtures"
TEST_INPUT = {"mode": "dish", "pantryIds": [], "budgetNgn": 100000, "servings": 1, "targetProteinG": 20,
              "allergens": []}


def load() -> tuple[dict, str]:
    data = load_data(ROOT / "data")
    source = "data/applications.json and data/dishes.json"
    if not data["dishes"] or not data["applications"]:
        apps = json.loads((FIXTURES / "TEST_FIXTURE_applications.json").read_text())
        data["applications"] = {a["id"]: a for a in apps}
        data["dishes"] = json.loads((FIXTURES / "TEST_FIXTURE_dishes.json").read_text())
        source = "TEST FIXTURE (training/fixtures/), because data/applications.json or data/dishes.json is empty"
    return data, source


def akara_dish(data: dict) -> dict:
    hits = [d for d in data["dishes"] if "akara" in d["id"].lower()]
    if not hits:
        raise SystemExit("no akara dish found")
    return hits[0]


def fit_order(data: dict, dish: dict, props: list[dict]) -> list[tuple[str, float | None, list[str]]]:
    app = data["applications"][dish["application_id"]]
    f = fit_scores(app, dish["protein_slot_ids"], props)
    items = [(cid, f[cid]["fit"], f[cid]["missingNeeds"]) for cid in dish["protein_slot_ids"]]
    return sorted(items, key=lambda x: (x[1] is None, -(x[1] or 0)))


def exclusions(data: dict, dish: dict, props: list[dict]) -> list[tuple[str, str]]:
    app = data["applications"][dish["application_id"]]
    f = fit_scores(app, dish["protein_slot_ids"], props)
    out = []
    for cid in dish["protein_slot_ids"]:
        ing = data["ingredients"].get(cid)
        why = []
        if ing is None:
            why.append("not in ingredients table")
        elif not ing.get("protein_g_per_100g"):
            why.append("missing protein (excluded)")
        if not f[cid]["ranked"]:
            why.append("not enough data, missing: " + ", ".join(f[cid]["missingNeeds"]))
        elif ing is not None and ing.get("price_ngn_per_kg") is None:
            why.append("ranked; price needed (no bundled price)")
        out.append((cid, "; ".join(why) or "ranked; priced"))
    return out


def fmt_order(order) -> str:
    return " > ".join(f"{c} ({v:.2f})" for c, v, _ in order if v is not None)


def main():
    data, source = load()
    dish = akara_dish(data)
    props = data["properties"]
    app = data["applications"][dish["application_id"]]
    res = suggest_dishes({**TEST_INPUT, "dishId": dish["id"]}, data)

    lines = ["# Ranking stability: akara", "", f"Dish and needs from: **{source}**.", "",
             "Engine: reference/suggest.py and reference/scoring.py unchanged, default weights "
             "(0.50 fit, 0.30 cost, 0.20 protein density). Test input: dish mode, 1 serving, 20 g protein, "
             "budget 100000 NGN, no allergens.", "",
             "Needs: " + ", ".join(f"{n['property']} ({n['direction']}, w={n['weight']})" for n in app["needs"]), "",
             "## App output (suggest_dishes)", ""]
    print(f"needs from: {source}")
    if res["dishes"]:
        d = res["dishes"][0]
        p = d["protein"]
        drivers = ", ".join(f"{x['name']} {x['contribution']:+.3f}" for x in p["drivers"])
        lines += [f"- Chosen protein: **{p['ingredientId']}**, score {p['score']:.3f}, fit {p['fit']:.3f} "
                  f"(range {p['fitRange'][0]:.3f}-{p['fitRange'][1]:.3f}), cost {p['costNgn']} NGN, "
                  f"{p['asSoldG']} g as sold, {p['costPerGProtein']} NGN per g protein",
                  f"- Drivers: {drivers}", f"- Flags: {'; '.join(d['flags'])}"]
        print(f"app output: {p['ingredientId']} score={p['score']:.3f} fit={p['fit']:.3f} drivers: {drivers}")
    else:
        lines.append("- No dish suggested.")
    for e in res["excluded"]:
        lines.append(f"- Excluded {e['id']}: {e['reason']}")
    lines += ["", "Rules: only proteins with a value for every need are ranked (complete coverage); a protein with "
              "no price still ranks on fit and density and shows 'price needed'.", "",
              "## Candidates and why they are excluded or flagged", "", "| Ingredient | Status |", "|---|---|"]
    for cid, why in exclusions(data, dish, props):
        lines.append(f"| {cid} | {why} |")
        print(f"  {cid:18s} {why}")

    base = fit_order(data, dish, props)
    lines += ["", "## Fit-only diagnostic (ignores price and density; ranked candidates only)", "",
              f"All papers: {fmt_order(base)}", "", "| Paper removed | Rows removed | Fit order | Same order? |",
              "|---|---|---|---|"]
    print("fit-only, all papers: " + fmt_order(base))
    base_ids = [c for c, v, _ in base if v is not None]
    for paper in sorted({r["paper_id"] for r in props}):
        kept = [r for r in props if r["paper_id"] != paper]
        order = fit_order(data, dish, kept)
        ids = [c for c, v, _ in order if v is not None]
        same = "yes" if ids == base_ids else "no"
        if same == "no":
            dropped_out = [c for c in base_ids if c not in ids]
            if dropped_out:
                same += " (drops out: " + ", ".join(dropped_out) + ")"
        lines.append(f"| {paper} | {len(props) - len(kept)} | {fmt_order(order)} | {same} |")
        print(f"  without {paper:15s} {same:30s} {fmt_order(order)}")
    lines += ["", "Fit is min-max scaled across the ranked candidates, so a candidate entering or leaving the "
              "ranked set changes everyone's scaled scores. Weights were not tuned.", ""]
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "ranking_stability.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
