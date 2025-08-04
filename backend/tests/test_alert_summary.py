from fastapi.testclient import TestClient
from app.main import app
from app.core.db import Base, engine, SessionLocal
from app.models.alerts import Alert
from app.crud.users import create_user
from app.core.security import get_password_hash

client = TestClient(app)

def _auth_headers():
    resp = client.post('/login', json={'username': 'admin', 'password': 'pw'})
    token = resp.json()['access_token']
    return {'Authorization': f'Bearer {token}'}

def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username='admin', password_hash=get_password_hash('pw'), role='admin')
        db.add(Alert(ip_address='1.1.1.1', total_fails=1, detail='Failed login'))
        db.add(Alert(ip_address='1.1.1.1', total_fails=2, detail='Failed login'))
        db.add(Alert(ip_address='1.1.1.1', total_fails=3, detail='Blocked: too many failures'))
        db.commit()

def teardown_function(_):
    SessionLocal().close()

def test_alert_summary():
    resp = client.get('/api/alerts/summary', headers=_auth_headers())
    assert resp.status_code == 200
    data = resp.json()
    assert data['total'] == 3
    assert data['blocked'] == 1
    assert data['wrong_password'] == 2
    assert data['credential_stuffing'] == 1
