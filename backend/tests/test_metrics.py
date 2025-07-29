import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    pass


def test_metrics_exposed():
    client.get('/ping')
    resp = client.get('/metrics')
    body = resp.text
    assert 'api_cpu_percent' in body
    assert 'api_memory_bytes' in body
    assert 'api_request_latency_milliseconds' in body
