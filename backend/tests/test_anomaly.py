import os
import importlib
import time
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from app.core.db import Base, engine, SessionLocal  # noqa: E402

import app.main as main_module  # noqa: E402


def _reload_app() -> TestClient:
    importlib.reload(main_module)
    return TestClient(main_module.app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()


def test_anomalous_path_blocked_iforest(monkeypatch):
    monkeypatch.setenv('ANOMALY_DETECTION', 'true')
    monkeypatch.delenv('ANOMALY_MODEL', raising=False)
    client = _reload_app()

    path = '/a' + 'b' * 100
    resp = client.get(path)
    assert resp.status_code == 403

    monkeypatch.delenv('ANOMALY_DETECTION', raising=False)
    _reload_app()


def test_anomalous_path_blocked_lof(monkeypatch):
    monkeypatch.setenv('ANOMALY_DETECTION', 'true')
    monkeypatch.setenv('ANOMALY_MODEL', 'lof')
    client = _reload_app()

    path = '/a' + 'b' * 100
    resp = client.get(path)
    assert resp.status_code == 403

    monkeypatch.delenv('ANOMALY_MODEL', raising=False)
    monkeypatch.delenv('ANOMALY_DETECTION', raising=False)
    _reload_app()


def test_normal_path_allowed(monkeypatch):
    monkeypatch.setenv('ANOMALY_DETECTION', 'true')
    client = _reload_app()

    resp = client.get('/ping')
    assert resp.status_code == 200

    monkeypatch.delenv('ANOMALY_DETECTION', raising=False)
    _reload_app()


def test_model_initialized_once_concurrently(monkeypatch):
    monkeypatch.setenv('ANOMALY_DETECTION', 'true')
    client = _reload_app()

    # remove preloaded model to simulate first access race
    if hasattr(main_module.app.state, 'anomaly_model'):
        delattr(main_module.app.state, 'anomaly_model')

    from app.core import anomaly as anomaly_module

    count = {'n': 0}
    orig_init = anomaly_module._Model.__init__

    def counting_init(self, algo):
        time.sleep(0.1)
        orig_init(self, algo)
        count['n'] += 1

    monkeypatch.setattr(anomaly_module._Model, '__init__', counting_init)

    def do_request() -> None:
        resp = client.get('/ping')
        assert resp.status_code == 200

    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(lambda _: do_request(), range(5)))

    assert count['n'] == 1

    monkeypatch.delenv('ANOMALY_DETECTION', raising=False)
    _reload_app()
