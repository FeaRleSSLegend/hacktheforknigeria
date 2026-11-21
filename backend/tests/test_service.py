import hashlib
import json

import pytest
from fastapi.testclient import TestClient

from service.guard import check_text, ingredient_vocabulary
from service.main import BUNDLE_DIR, app, get_rewriter

ENGINE_OUT = {
    "dishes": [{"dishId": "akara", "name": "Akara", "protein": {"ingredientId": "cowpea", "costNgn": 872.91},
                "totalCostNgn": 872.91, "flags": ["cost excludes oil and spices"]}],
    "excluded": [], "bundleVersion": "x",
}
VOCAB = ingredient_vocabulary([
    {"ingredient_id": "cowpea", "name": "Cowpea (brown beans / ewa)", "local_names": "ewa, black-eyed pea"},
    {"ingredient_id": "groundnut", "name": "Groundnut (peanut)", "local_names": "epa"},
])


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_guard_accepts_faithful_text():
    assert check_text("Akara with brown beans costs about 873 naira (872.91).", ENGINE_OUT, VOCAB) == []


def test_guard_rejects_injected_number():
    reasons = check_text("Akara with cowpea costs 450 naira and cuts fat by 30%.", ENGINE_OUT, VOCAB)
    assert "number not in engine output: 450" in reasons and "number not in engine output: 30" in reasons


def test_guard_rejects_unlisted_ingredient():
    assert check_text("Add some peanut to the cowpea.", ENGINE_OUT, VOCAB) == ["ingredient not in engine output: peanut"]


def test_health_and_bundle_latest(client):
    assert client.get("/health").json()["status"] == "ok"
    latest = client.get("/bundle/latest").json()
    manifest = (BUNDLE_DIR / "manifest.json").read_bytes()
    assert latest["sha256"] == hashlib.sha256(manifest).hexdigest()
    assert latest["version"] == json.loads(manifest)["version"]
    files = client.get(latest["url"]).json()["files"]
    body = client.get("/bundle/files/ingredients.json").content
    assert hashlib.sha256(body).hexdigest() == files["ingredients.json"]["sha256"]
    assert client.get("/bundle/files/..%2Fsecret").status_code == 404


def test_explain_without_llm_uses_template(client):
    r = client.post("/explain", json={"result": ENGINE_OUT}).json()
    assert r["source"] == "template" and "873" in r["text"]
    assert check_text(r["text"], ENGINE_OUT, VOCAB) == []  # the template itself passes the guard


def test_explain_rejects_injected_unsupported_number(client):
    app.dependency_overrides[get_rewriter] = lambda: (lambda out: "Akara with cowpea costs only 99 naira.")
    r = client.post("/explain", json={"result": ENGINE_OUT}).json()
    assert r["source"] == "template" and "number not in engine output: 99" in r["rejected"]
    assert "99" not in r["text"]


def test_explain_passes_faithful_llm_text(client):
    app.dependency_overrides[get_rewriter] = lambda: (lambda out: "Akara made with cowpea: about 873 naira.")
    r = client.post("/explain", json={"result": ENGINE_OUT}).json()
    assert r == {"text": "Akara made with cowpea: about 873 naira.", "source": "llm", "rejected": []}
