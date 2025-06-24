import os
from datetime import datetime, timedelta

# Configure test database before importing app modules
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal
from app.models.alerts import Alert

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()


def test_block_after_five_failures():
    for i in range(5):
        resp = client.post('/score', json={'client_ip': '1.1.1.1', 'auth_result': 'failure', 'with_jwt': False})
        assert resp.status_code == 200
        body = resp.json()
        assert body['status'] == 'ok'
        assert body['fails_last_minute'] == i + 1

    resp = client.post('/score', json={'client_ip': '1.1.1.1', 'auth_result': 'failure', 'with_jwt': False})
    assert resp.status_code == 200
    body = resp.json()
    assert body['status'] == 'blocked'
    assert body['fails_last_minute'] == 6

    with SessionLocal() as db:
        assert db.query(Alert).count() == 6
        last = db.query(Alert).order_by(Alert.id.desc()).first()
        assert last.detail == 'Blocked: too many failures'


def test_old_failures_not_counted():
    old_time = datetime.utcnow() - timedelta(minutes=2)
    with SessionLocal() as db:
        for i in range(5):
            db.add(Alert(ip_address='2.2.2.2', total_fails=i+1, detail='old', timestamp=old_time))
        db.commit()

    resp = client.post('/score', json={'client_ip': '2.2.2.2', 'auth_result': 'failure', 'with_jwt': False})
    assert resp.status_code == 200
    body = resp.json()
    assert body['status'] == 'ok'
    assert body['fails_last_minute'] == 1


def test_custom_fail_limit(monkeypatch):
    monkeypatch.setenv('FAIL_LIMIT', '3')
    for i in range(3):
        resp = client.post('/score', json={'client_ip': '3.3.3.3', 'auth_result': 'failure', 'with_jwt': False})
        assert resp.status_code == 200
        body = resp.json()
        assert body['status'] == 'ok'

    resp = client.post('/score', json={'client_ip': '3.3.3.3', 'auth_result': 'failure', 'with_jwt': False})
    assert resp.status_code == 200
    body = resp.json()
    assert body['status'] == 'blocked'


def test_custom_window(monkeypatch):
    monkeypatch.setenv('FAIL_LIMIT', '1')
    monkeypatch.setenv('FAIL_WINDOW_SECONDS', '120')
    old_time = datetime.utcnow() - timedelta(seconds=90)
    with SessionLocal() as db:
        db.add(Alert(ip_address='4.4.4.4', total_fails=1, detail='old', timestamp=old_time))
        db.commit()

    resp = client.post('/score', json={'client_ip': '4.4.4.4', 'auth_result': 'failure', 'with_jwt': False})
    assert resp.status_code == 200
    body = resp.json()
    assert body['status'] == 'blocked'
