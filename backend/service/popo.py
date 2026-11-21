"""Popo: the online helper on the Prepare screen.

Popo answers a cook's follow-up question using ONLY the preparation context the app already shows
(steps, cautions, published findings). Every answer then passes the guard: any number or ingredient
that is not in that context, or any health claim, rejects the answer and a safe template is returned
instead. The app works without Popo; this module is only used by the optional service.

The Claude call needs credentials on the service machine (ANTHROPIC_API_KEY, or an `ant auth login`
profile). Without them, or without the `anthropic` package, Popo answers from the template only.
"""
import json
import re
from typing import Callable, Optional

from service.guard import check_text

MODEL = "claude-opus-5-5"
MAX_QUESTION_CHARS = 400
MAX_HISTORY_TURNS = 6

SYSTEM = """You are Popo, a friendly cooking helper inside ProteinPath, an app for home cooks in Nigeria on a budget.

You answer follow-up questions about preparing ONE dish, using ONLY the preparation context given in the user's message (the dish, the plant, the steps, the cautions and the published findings). Treat that context as the single source of truth.

Rules you must follow:
- Use only facts in the context. If the answer is not in the context, say plainly that you don't have published information on that, and point to the closest step.
- Never add a number that is not in the context. Do not give cooking times, temperatures, soaking or fermenting durations, or amounts unless that exact number appears in the context. Say "cook until fully soft" instead of a time.
- Never mention an ingredient that is not in the context.
- No health claims: never say a food is healthy, cures, treats or prevents anything. For infants, pregnancy, allergies or medical conditions, say to ask a health worker.
- Keep answers short: at most 4 short sentences, plain words a home cook understands, no lists of more than 3 items, no markdown headings."""

CLAIM_WORDS = re.compile(r"\b(cures?|cured|treats?|prevents?|healthy|healthier|proven|tastes like)\b", re.IGNORECASE)

class PopoUnavailable(Exception):
    """Raised when Claude could not be reached or declined; the endpoint then returns the fallback."""


FALLBACK_TEXT = (
    "I can only answer from the published steps for this dish, and I don't have a reliable answer to that. "
    "Follow the steps above and cook beans until fully soft. For infants, pregnancy or a medical condition, ask a health worker."
)


def check_answer(text: str, context: dict, vocab: dict[str, str]) -> list[str]:
    """Reasons to reject an answer (empty means it passes): unsupported numbers or ingredients, or a health claim."""
    reasons = check_text(text, context, vocab)
    for m in CLAIM_WORDS.finditer(text):
        reasons.append(f"health or marketing claim: {m.group(0)}")
    return reasons


def _user_turn(context: dict, question: str) -> str:
    return "Preparation context (the only source you may use):\n" + json.dumps(context, ensure_ascii=False, sort_keys=True) + "\n\nQuestion: " + question


def make_claude_asker() -> Optional[Callable[[dict, list[dict], str], str]]:
    """Return a function that asks Claude, or None when the SDK or credentials are not available."""
    try:
        import anthropic
    except ImportError:
        return None
    try:
        client = anthropic.Anthropic(timeout=30.0, max_retries=1)
    except anthropic.AnthropicError:
        return None

    def ask(context: dict, history: list[dict], question: str) -> str:
        recent = history[-MAX_HISTORY_TURNS:]
        while recent and recent[0]["role"] != "user":  # the conversation must start with the cook
            recent = recent[1:]
        messages = [{"role": h["role"], "content": h["text"]} for h in recent]
        messages.append({"role": "user", "content": _user_turn(context, question)})
        try:
            response = client.beta.messages.create(
                model=MODEL,
                max_tokens=2000,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                output_config={"effort": "low"},
                system=SYSTEM,
                messages=messages,
            )
        except anthropic.AuthenticationError as e:
            raise PopoUnavailable("no valid Claude credentials on the service") from e
        except anthropic.RateLimitError as e:
            raise PopoUnavailable("rate limited") from e
        except anthropic.APIStatusError as e:
            raise PopoUnavailable(f"Claude API error {e.status_code}") from e
        except anthropic.APIConnectionError as e:
            raise PopoUnavailable("could not reach Claude") from e
        if response.stop_reason == "refusal":
            raise PopoUnavailable("declined")
        return "".join(b.text for b in response.content if b.type == "text").strip()

    return ask
