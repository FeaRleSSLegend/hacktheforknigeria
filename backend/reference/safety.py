"""safetyGuard: runs on every processing or plate result before display. Pure function.

safety_guard(result, ctx, data) -> {allowed, warnings, blocked, result}
  ctx = {"ingredientId"?: str, "ingredientIds"?: [str], "allergens": [str]}
  result: a ProcessingResult (has "options") or a PlateResult (no "options").

How rules apply (rules come from safety_rules.json, never from this file):
- Ingredient-level: a rule whose applies_to names the result's ingredient (or any plate ingredient)
  applies to the whole result. A block withholds the whole result; a warn is shown alongside it.
- The user's allergen list: an ingredient whose allergen_tags match it withholds the whole result.
- Option-level (processing): each option's tags are its treatment name, its steps, "milling" and
  "flour" when it mills, and "legume_processing_without_heat" when no step applies heat. A block
  withholds that option only; a warn is shown once.
- A rule that lists "legume_processing_without_heat" is about unheated preparations, so it never
  applies to an option that includes a heat step (sr_cook_thoroughly: "do not present a soak-only,
  sprout-only or raw-flour preparation as ready to eat").
- Every message says when the rule is not yet reviewed.
"""
from .config import HEAT_STEPS
from .processing import treatment_steps

UNHEATED = "legume_processing_without_heat"


def _label(rule: dict) -> str:
    return "" if rule.get("reviewed") else " (safety rule not yet reviewed by an expert)"


def _option_tags(option: dict) -> tuple[set, bool]:
    steps = treatment_steps(option.get("treatment") or "")
    tags = set(steps) | {option.get("treatment") or ""}
    if any(s in ("milling", "wet_milling") for s in steps):
        tags |= {"milling", "flour"}
    heated = any(s in HEAT_STEPS for s in steps)
    if not heated:
        tags.add(UNHEATED)
    return tags, heated


def _matches(rule: dict, tags: set, heated: bool) -> bool:
    applies = set(rule.get("applies_to", []))
    if UNHEATED in applies and heated:
        return False
    return bool(applies & tags)


def _add(lst: list, msg: str):
    if msg not in lst:
        lst.append(msg)


def safety_guard(result: dict, ctx: dict, data: dict) -> dict:
    rules = data.get("safetyRules", [])
    ids = [i for i in [result.get("ingredientId"), ctx.get("ingredientId"), *ctx.get("ingredientIds", [])] if i]
    ids = list(dict.fromkeys(ids))
    warnings, blocked = [], []

    user_allergens = set(ctx.get("allergens", []))
    for iid in ids:
        ing = data["ingredients"].get(iid) or data["sides"].get(iid) or {}
        hit = sorted(set(ing.get("allergen_tags", [])) & user_allergens)
        if hit:
            _add(blocked, f"{iid}: matches your allergen list ({', '.join(hit)}).")
    for rule in rules:
        if set(rule.get("applies_to", [])) & set(ids):
            msg = rule["text"] + _label(rule)
            _add(blocked if rule["severity"] == "block" else warnings, msg)
    if blocked:
        return {"allowed": False, "warnings": warnings, "blocked": blocked, "result": None}

    if "options" not in result:
        return {"allowed": True, "warnings": warnings, "blocked": blocked, "result": result}

    kept = []
    for opt in result["options"]:
        tags, heated = _option_tags(opt)
        withheld = False
        for rule in rules:
            if not _matches(rule, tags, heated):
                continue
            if rule["severity"] == "block":
                withheld = True
                _add(blocked, f"Withheld \"{opt['instruction']}\": {rule['text']}{_label(rule)}")
            else:
                _add(warnings, rule["text"] + _label(rule))
        if not withheld:
            kept.append(opt)

    filtered = dict(result, options=kept)
    allowed = bool(kept) or not result["options"]
    return {"allowed": allowed, "warnings": warnings, "blocked": blocked, "result": filtered if allowed else None}
