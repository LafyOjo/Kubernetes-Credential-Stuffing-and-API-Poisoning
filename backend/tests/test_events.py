import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.crud.users import create_user

client = TestClient(app)

def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username='alice', password_hash=get_password_hash('pw'))

def teardown_function(_):
    SessionLocal().close()


def test_login_event_logged():
    resp = client.post('/login', json={'username': 'alice', 'password': 'pw'})
    assert resp.status_code == 200
    token = resp.json()['access_token']
    resp = client.get('/api/events', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    events = resp.json()
    assert any(e['action'] == 'login' and e['success'] for e in events)
