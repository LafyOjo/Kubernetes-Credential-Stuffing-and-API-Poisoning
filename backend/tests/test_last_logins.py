import os
from datetime import datetime

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.crud.users import create_user

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username='alice', password_hash=get_password_hash('pw'))
        create_user(db, username='ben', password_hash=get_password_hash('pw2'))


def teardown_function(_):
    SessionLocal().close()


def test_last_login_endpoint():
    client.post('/login', json={'username': 'alice', 'password': 'pw'})
    client.post('/login', json={'username': 'ben', 'password': 'pw2'})

    token = create_access_token({"sub": "alice"})
    resp = client.get('/api/last-logins', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    data = resp.json()
    assert 'alice' in data and 'ben' in data
    assert isinstance(data['alice'], str)
