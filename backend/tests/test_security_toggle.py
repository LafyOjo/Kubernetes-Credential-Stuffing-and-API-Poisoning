import os

# Setup env before imports
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.crud.users import create_user  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username="admin", password_hash=get_password_hash("pw"))


def _auth_headers(c):
    resp = c.post('/login', json={'username': 'admin', 'password': 'pw'})
    token = resp.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def teardown_function(_):
    SessionLocal().close()


def test_get_security_default():
    resp = client.get('/api/security', headers=_auth_headers(client))
    assert resp.status_code == 200
    assert resp.json()['enabled'] is True


def test_toggle_security():
    resp = client.post('/api/security', json={'enabled': False}, headers=_auth_headers(client))
    assert resp.status_code == 200
    assert resp.json()['enabled'] is False
    # New client should see the same state
    other = TestClient(app)
    resp = other.get('/api/security', headers=_auth_headers(other))
    assert resp.json()['enabled'] is False


def test_score_not_blocked_when_disabled():
    # disable security
    client.post('/api/security', json={'enabled': False}, headers=_auth_headers(client))
    # Send failures exceeding threshold
    for i in range(6):
        resp = client.post('/score', json={'client_ip': '9.9.9.9', 'auth_result': 'failure'})
        assert resp.status_code == 200
        # should never be blocked
        assert resp.json()['status'] == 'ok'


def test_chain_persists_across_clients():
    chain = client.get('/api/security/chain', headers=_auth_headers(client)).json()['chain']
    resp = client.post(
        '/score',
        json={'client_ip': '5.5.5.5', 'auth_result': 'success'},
        headers={'X-Chain-Password': chain},
    )
    assert resp.status_code == 200

    other = TestClient(app)
    new_chain = other.get('/api/security/chain', headers=_auth_headers(other)).json()['chain']
    assert new_chain != chain
    resp = other.post(
        '/score',
        json={'client_ip': '5.5.5.5', 'auth_result': 'success'},
        headers={'X-Chain-Password': chain},
    )
    assert resp.status_code == 401
