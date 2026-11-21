"""Optional online layer. The app never needs it: everything works offline from the bundled copy.

Run: uvicorn service.main:app --port 8000      (from backend/)
  GET  /health              status and bundle version
  GET  /bundle/latest       {version, sha256, url}: sha256 is of manifest.json; manifest lists each file's sha256
  GET  /bundle/files/{name} a file listed in the manifest (or the manifest itself)
  POST /explain             {"result": <engine output>} -> {text, source, rejected}
  POST /ask                 {"context": <prepare-screen content>, "history": [...], "question": "..."}
                            -> {answer, source: "llm" | "template", rejected}  (Popo, see service/popo.py)

No accounts, no analytics, request bodies are not logged. /explain takes engine output only
(ingredient ids and numbers, never personal data). No LLM is wired in: get_rewriter() returns None,
so /explain returns the template sentence. To add one, return a callable (engine output -> text)
from get_rewriter(); its text is always passed through the guard.
"""
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Callable, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from service.guard import check_text, ingredient_vocabulary, template_sentence
from service.popo import FALLBACK_TEXT, MAX_HISTORY_TURNS, MAX_QUESTION_CHARS, PopoUnavailable, check_answer, make_claude_asker

ROOT = Path(__file__).resolve().parent.parent
BUNDLE_DIR = Path(os.environ.get("PP_BUNDLE_DIR", ROOT / "mobile" / "assets" / "bundle"))

app = FastAPI(title="ProteinPath optional service", docs_url=None, redoc_url=None)


def _manifest_bytes() -> bytes:
    p = BUNDLE_DIR / "manifest.json"
    if not p.exists():
        raise HTTPException(503, "no bundle built")
    return p.read_bytes()


def _vocab() -> dict[str, str]:
    rows = []
    for name in ("ingredients.json", "sides.json"):
        p = BUNDLE_DIR / name
        if p.exists():
            rows += json.loads(p.read_text(encoding="utf-8"))
    return ingredient_vocabulary(rows)


def get_rewriter() -> Optional[Callable[[dict], str]]:
    return None


class ExplainIn(BaseModel):
    result: dict[str, Any]


def get_asker() -> Optional[Callable[[dict, list[dict], str], str]]:
    return make_claude_asker()


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=2000)


class AskIn(BaseModel):
    context: dict[str, Any]
    history: list[Turn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS * 2)
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)


@app.get("/health")
def health():
    try:
        version = json.loads(_manifest_bytes())["version"]
    except HTTPException:
        version = None
    return {"status": "ok", "bundleVersion": version}


@app.get("/bundle/latest")
def bundle_latest(request: Request):
    b = _manifest_bytes()
    return {"version": json.loads(b)["version"], "sha256": hashlib.sha256(b).hexdigest(),
            "url": str(request.url_for("bundle_file", name="manifest.json"))}


@app.get("/bundle/files/{name}", name="bundle_file")
def bundle_file(name: str):
    allowed = set(json.loads(_manifest_bytes())["files"]) | {"manifest.json"}
    if name not in allowed:
        raise HTTPException(404, "not in manifest")
    return Response((BUNDLE_DIR / name).read_bytes(), media_type="application/json")


@app.post("/explain")
def explain(body: ExplainIn, rewriter: Optional[Callable[[dict], str]] = Depends(get_rewriter)):
    fallback = template_sentence(body.result)
    if rewriter is None:
        return {"text": fallback, "source": "template", "rejected": []}
    try:
        text = rewriter(body.result)
    except Exception:
        return {"text": fallback, "source": "template", "rejected": ["rewriter failed"]}
    reasons = check_text(text, body.result, _vocab())
    if reasons:
        return {"text": fallback, "source": "template", "rejected": reasons}
    return {"text": text, "source": "llm", "rejected": []}


@app.post("/ask")
def ask(body: AskIn, asker: Optional[Callable[[dict, list[dict], str], str]] = Depends(get_asker)):
    """Popo. Answers only from the given context; every answer passes the guard or is replaced."""
    if asker is None:
        return {"answer": FALLBACK_TEXT, "source": "template", "rejected": ["Popo is not connected to Claude on this service"]}
    try:
        answer = asker(body.context, [t.model_dump() for t in body.history], body.question.strip())
    except PopoUnavailable as e:
        return {"answer": FALLBACK_TEXT, "source": "template", "rejected": [str(e)]}
    if not answer:
        return {"answer": FALLBACK_TEXT, "source": "template", "rejected": ["empty answer"]}
    reasons = check_answer(answer, body.context, _vocab())
    if reasons:
        return {"answer": FALLBACK_TEXT, "source": "template", "rejected": reasons}
    return {"answer": answer, "source": "llm", "rejected": []}
