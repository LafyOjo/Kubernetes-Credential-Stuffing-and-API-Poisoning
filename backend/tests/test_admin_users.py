import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.crud.users import create_user, get_user_by_username  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()


def test_admin_can_create_and_delete_user():
    db = SessionLocal()
    create_user(db, username='admin', password_hash=get_password_hash('pw'), role='admin')
    db.close()

    resp = client.post('/login', json={'username': 'admin', 'password': 'pw'})
    assert resp.status_code == 200
    token = resp.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'username': 'bob',
        'password': 'StrongPass!1',
        'two_factor': True,
        'security_question': True,
    }
    resp = client.post('/admin/users', json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data['username'] == 'bob'
    assert 0 < data['security_score'] <= 100

    resp = client.delete('/admin/users/bob', headers=headers)
    assert resp.status_code == 200

    db = SessionLocal()
    assert get_user_by_username(db, 'bob') is None
    db.close()
