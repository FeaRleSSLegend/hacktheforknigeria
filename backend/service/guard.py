"""LLM guard: generated text may only mention ingredients and numbers present in the engine output.

Pure functions. Anything else is rejected and a template sentence built from the engine output is
used instead (PROJECT.md section 4.2).
"""
import re

NUM_RE = re.compile(r"(?<![\w.])[-+]?\d[\d,]*(?:\.\d+)?")


def _walk(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _walk(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            yield from _walk(v)
    else:
        yield obj


def engine_numbers(output) -> list[float]:
    nums = []
    for v in _walk(output):
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            nums.append(float(v))
        elif isinstance(v, str):
            nums.extend(float(t.replace(",", "")) for t in NUM_RE.findall(v))
    return nums


def _number_allowed(token: str, allowed: list[float]) -> bool:
    clean = token.replace(",", "")
    v = float(clean)
    dp = len(clean.split(".")[1]) if "." in clean else 0
    return any(round(abs(a), dp) == abs(v) for a in allowed)


def ingredient_vocabulary(ingredients: list[dict]) -> dict[str, str]:
    """Lower-case term -> ingredient id, from ids, names and local names."""
    vocab = {}
    for r in ingredients:
        iid = r["ingredient_id"]
        name = r.get("name") or ""
        terms = {iid, iid.replace("_", " "), name, name.split("(")[0]}
        terms |= set(re.split(r"[/,]", name[name.find("(") + 1:name.rfind(")")])) if "(" in name else set()
        terms |= set((r.get("local_names") or "").split(","))
        for t in terms:
            t = t.strip().lower()
            if len(t) >= 3:
                vocab[t] = iid
    return vocab


def _ids_in_output(output, known_ids: set[str]) -> set[str]:
    found = set()
    for v in _walk(output):
        if isinstance(v, str):
            for iid in known_ids:
                if re.search(rf"(?<![a-z_]){re.escape(iid)}(?![a-z_])", v):
                    found.add(iid)
    return found


def check_text(text: str, output, vocab: dict[str, str]) -> list[str]:
    """Return the reasons the text is rejected (empty list means it passes)."""
    reasons = []
    allowed_nums = engine_numbers(output)
    for tok in NUM_RE.findall(text):
        if not _number_allowed(tok, allowed_nums):
            reasons.append(f"number not in engine output: {tok}")
    allowed_ids = _ids_in_output(output, set(vocab.values()))
    low = text.lower()
    for term, iid in sorted(vocab.items()):
        if iid not in allowed_ids and re.search(rf"(?<![a-z]){re.escape(term)}(?![a-z])", low):
            reasons.append(f"ingredient not in engine output: {term}")
    return reasons


def template_sentence(output: dict) -> str:
    if "dishes" in output:
        if not output["dishes"]:
            return "No dish fits these inputs. See the reasons listed."
        d = output["dishes"][0]
        return (f"{d['name']}: uses {d['protein']['ingredientId']}, about {round(d['totalCostNgn'])} naira "
                f"(excludes oil and spices).")
    if "options" in output:
        return f"{len(output['options'])} preparation option(s) for {output.get('ingredientId', 'this ingredient')}. {output.get('note', '')}".strip()
    return "See the numbers shown."
