import os

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


def teardown_function(_):
    SessionLocal().close()


def test_user_call_counter():
    token = create_access_token({"sub": "alice"})
    with SessionLocal() as db:
        create_user(db, username='alice', password_hash=get_password_hash('pw'), role='admin')

    # call ping twice
    client.get('/ping', headers={'Authorization': f'Bearer {token}'})
    client.get('/ping', headers={'Authorization': f'Bearer {token}'})

    resp = client.get('/api/user-calls', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['alice'] >= 2
