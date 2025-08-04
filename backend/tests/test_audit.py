import os

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.models.audit_logs import AuditLog  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()


def test_audit_log_persists_event():
    resp = client.post('/api/audit/log', json={'event': 'user_login_success', 'username': 'alice'})
    assert resp.status_code == 200
    with SessionLocal() as db:
        rows = db.query(AuditLog).all()
        assert any(r.event == 'user_login_success' and r.username == 'alice' for r in rows)
