import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from datetime import timedelta

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal
from app.core.config import settings
import app.api.auth as auth_module

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


def test_login_uses_expire_setting(monkeypatch):
    monkeypatch.setattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES', 5)

    captured = {}

    def fake_create(data, expires_delta):
        captured['delta'] = expires_delta
        return 'tok'

    monkeypatch.setattr(auth_module, 'create_access_token', fake_create)

    client.post('/register', json={'username': 'bob', 'password': 'pw'})
    resp = client.post('/login', json={'username': 'bob', 'password': 'pw'})
    assert resp.status_code == 200
    assert resp.json()['access_token'] == 'tok'
    assert captured['delta'] == timedelta(minutes=5)


def test_register_forward(monkeypatch):
    captured = {}

    def fake_post(url, json, timeout=3):
        captured['url'] = url
        captured['payload'] = json
        class R:
            status_code = 200
        return R()

    monkeypatch.setattr(auth_module.requests, 'post', fake_post)
    monkeypatch.setenv('REGISTER_WITH_SHOP', 'true')
    monkeypatch.setenv('SOCK_SHOP_URL', 'http://shop')

    resp = client.post('/register', json={'username': 'carol', 'password': 'pw'})
    assert resp.status_code == 200
    assert captured['url'] == 'http://shop/register'
    assert captured['payload'] == {'username': 'carol', 'password': 'pw'}
