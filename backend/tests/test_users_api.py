import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.core.security import create_access_token, get_password_hash  # noqa: E402
from app.crud.users import create_user  # noqa: E402
from app.crud.events import create_event  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username='alice', password_hash=get_password_hash('pw'))
        create_user(db, username='ben', password_hash=get_password_hash('pw'))
        for i in range(20):
            create_event(db, username='alice', action=f'a{i}', success=True)
        for i in range(12):
            create_event(db, username='ben', action=f'b{i}', success=False)


def teardown_function(_):
    SessionLocal().close()


def auth_header(username: str) -> dict[str, str]:
    token = create_access_token({'sub': username})
    return {'Authorization': f'Bearer {token}'}


def test_user_activity():
    resp = client.get('/api/users/alice/activity', headers=auth_header('alice'))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 15
    assert all(ev['username'] == 'alice' for ev in data)

    resp = client.get('/api/users/ben/activity', headers=auth_header('ben'))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 12
    assert all(ev['username'] == 'ben' for ev in data)


