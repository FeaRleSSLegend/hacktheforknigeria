"""Run the reference engine for every dish in data/dishes.json and write reports/dish_ranking.md.

Shows per dish: the headline protein, the full ranked list (priced by score, then unpriced by
fit), the candidates with not enough functional data and the needs they miss, exclusions, and
whether only one candidate can be scored. Engine and weights are used unchanged.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from reference.loader import load_data  # noqa: E402
from reference.suggest import suggest_dishes  # noqa: E402

SERVINGS = 4
TEST_INPUT = {"mode": "dish", "pantryIds": [], "budgetNgn": 100000, "servings": SERVINGS, "targetProteinG": 20,
              "allergens": []}


def main():
    data = load_data(ROOT / "data")
    lines = ["# Dish ranking check (reference engine, unchanged weights)", "",
             f"Test input: dish mode, {SERVINGS} people, budget 100000 NGN, no allergens, no user prices. "
             "Portions (typical_dry_g_per_serving) and weights are team estimates (data/dishes.json, "
             "data/applications.json). Cost is the protein ingredient only, no oil or spices; "
             "the total adds the priced sides. Gaps are flagged, never filled.", ""]
    for dish in data["dishes"]:
        app = data["applications"][dish["application_id"]]
        res = suggest_dishes({**TEST_INPUT, "dishId": dish["id"]}, data)
        lines += [f"## {dish['name']} (`{dish['id']}`, application `{app['id']}`)", "",
                  "Needs: " + ", ".join(f"{n['property']} {n['direction']} {n['weight']}" for n in app["needs"]), ""]
        print(f"== {dish['id']}")
        if not res["dishes"]:
            for e in res["excluded"]:
                lines.append(f"- **Not suggested:** {e['reason']}")
                print(f"   not suggested: {e['reason']}")
            lines.append("")
            continue
        d = res["dishes"][0]
        scored = [x for x in d["ranked"] if x["score"] is not None]
        lines += [f"Portion: {d['dryGPerServing']} g dry per person (estimate, to confirm). "
                  f"Summary: {d['summaryLine']}", "",
                  "| Rank | Protein | Score | Fit (range) | Protein g per plate / group | Cost NGN per person / group | Flags |",
                  "|---|---|---|---|---|---|---|"]
        for i, x in enumerate(d["ranked"], 1):
            score = f"{x['score']:.3f}" if x["score"] is not None else "-"
            cost = (f"{x['costPerPersonNgn']} / {x['costNgn']}" if x["costNgn"] is not None else "price needed")
            lines.append(f"| {i} | {x['ingredientId']}{' (headline)' if x['ingredientId'] == d['protein']['ingredientId'] else ''} | "
                         f"{score} | {x['fit']:.3f} ({x['fitRange'][0]:.2f}-{x['fitRange'][1]:.2f}) | "
                         f"{x['proteinPerPlateG']} / {x['proteinTotalG']} | {cost} | {', '.join(x['flags']) or '-'} |")
            print(f"   {i}. {x['ingredientId']:18s} score={score:6s} fit={x['fit']:.3f} cost={cost}")
        for n in d["notEnoughData"]:
            lines.append(f"- Not enough data: **{n['id']}** missing {', '.join(n['missingNeeds'])}")
            print(f"   not enough data: {n['id']} missing {n['missingNeeds']}")
        if len(d["ranked"]) == 1:
            lines.append("- **Only one candidate can be ranked**, so fit scales to 0.5 and there is nothing to compare.")
            print("   only one candidate ranked")
        elif len(scored) <= 1:
            lines.append(f"- Only {len(scored)} priced candidate(s): cost and density cannot separate proteins.")
        total = (f"{d['totalCostPerPersonNgn']} per person, {d['totalCostNgn']} for the group"
                 if d["totalCostNgn"] is not None else "incomplete (price needed)")
        lines += [f"- Total with sides: {total}; "
                  f"flags: {'; '.join(d['flags'])}", ""]
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "dish_ranking.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
