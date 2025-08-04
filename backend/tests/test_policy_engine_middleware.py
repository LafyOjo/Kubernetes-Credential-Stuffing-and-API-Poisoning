import os

# Configure test database before importing app modules
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.models.alerts import Alert  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for _ in range(5):
            db.add(Alert(ip_address='testclient', total_fails=1, detail='fail'))
        db.commit()


def teardown_function(_):
    SessionLocal().close()


def test_register_and_login_not_blocked_by_policy_engine():
    # Confirm other endpoints are blocked
    resp = client.get('/ping')
    assert resp.status_code == 403

    # /register should bypass policy engine
    resp = client.post('/register', json={'username': 'newuser', 'password': 'pw'})
    assert resp.status_code == 200

    # /login should also bypass policy engine
    resp = client.post('/login', json={'username': 'newuser', 'password': 'pw'})
    assert resp.status_code == 200

    # Failed login should return 401, not 403
    resp = client.post('/login', json={'username': 'newuser', 'password': 'wrong'})
    assert resp.status_code == 401
