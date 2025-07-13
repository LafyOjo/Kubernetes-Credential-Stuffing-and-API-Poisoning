import importlib
import os

from fastapi.testclient import TestClient
from app.core.db import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.crud.users import create_user


def _reload_app():
    import app.core.re_auth
    import app.main
    importlib.reload(app.core.re_auth)
    importlib.reload(app.main)
    return TestClient(app.main.app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username="alice", password_hash=get_password_hash("pw"))


def teardown_function(_):
    SessionLocal().close()


def test_missing_password_header(monkeypatch):
    monkeypatch.setenv("REAUTH_PER_REQUEST", "true")
    client = _reload_app()

    token = client.post("/login", json={"username": "alice", "password": "pw"}).json()["access_token"]
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Password required"

    monkeypatch.setenv("REAUTH_PER_REQUEST", "false")
    _reload_app()


def test_reauth_success(monkeypatch):
    monkeypatch.setenv("REAUTH_PER_REQUEST", "true")
    client = _reload_app()

    token = client.post("/login", json={"username": "alice", "password": "pw"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Reauth-Password": "pw"}
    resp = client.get("/api/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"

    monkeypatch.setenv("REAUTH_PER_REQUEST", "false")
    _reload_app()

