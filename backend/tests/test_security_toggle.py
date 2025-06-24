import os

# Setup env before imports
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal
from app.api.security import SECURITY_ENABLED

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # reset flag for each test
    from app.api import security
    security.SECURITY_ENABLED = True


def teardown_function(_):
    SessionLocal().close()


def test_get_security_default():
    resp = client.get('/api/security')
    assert resp.status_code == 200
    assert resp.json()['enabled'] is True


def test_toggle_security():
    resp = client.post('/api/security', json={'enabled': False})
    assert resp.status_code == 200
    assert resp.json()['enabled'] is False
    resp = client.get('/api/security')
    assert resp.json()['enabled'] is False


def test_score_not_blocked_when_disabled():
    # disable security
    client.post('/api/security', json={'enabled': False})
    # Send failures exceeding threshold
    for i in range(6):
        resp = client.post('/score', json={'client_ip': '9.9.9.9', 'auth_result': 'failure'})
        assert resp.status_code == 200
        # should never be blocked
        assert resp.json()['status'] == 'ok'
