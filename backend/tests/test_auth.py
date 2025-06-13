import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()


def test_register_and_login():
    resp = client.post('/register', json={'username': 'alice', 'password': 'secret'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['username'] == 'alice'

    resp = client.post('/login', json={'username': 'alice', 'password': 'secret'})
    assert resp.status_code == 200
    token = resp.json()['access_token']
    assert token
