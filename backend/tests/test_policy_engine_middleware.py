import os

# Configure test database before importing app modules
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

import pytest
from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.models.alerts import Alert  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for _ in range(5):
            db.add(Alert(ip_address='testclient', total_fails=1, detail='fail'))
        db.commit()


def teardown_function(_):
    SessionLocal().close()


@pytest.mark.parametrize("endpoint", ["/register", "/login"])
def test_auth_endpoints_bypass_policy_engine(endpoint):
    if endpoint == "/login":
        client.post('/register', json={'username': 'newuser', 'password': 'pw'})
    resp = client.post(endpoint, json={'username': 'newuser', 'password': 'pw'})
    assert resp.status_code == 200


def test_policy_engine_blocks_other_endpoints():
    resp = client.get('/ping')
    assert resp.status_code == 403


def test_failed_login_returns_401_not_403():
    client.post('/register', json={'username': 'newuser', 'password': 'pw'})
    resp = client.post('/login', json={'username': 'newuser', 'password': 'wrong'})
    assert resp.status_code == 401
