import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_config_default():
    resp = client.get('/config')
    assert resp.status_code == 200
    assert resp.json()['fail_limit'] == 5


def test_config_env(monkeypatch):
    monkeypatch.setenv('FAIL_LIMIT', '7')
    resp = client.get('/config')
    assert resp.status_code == 200
    assert resp.json()['fail_limit'] == 7
