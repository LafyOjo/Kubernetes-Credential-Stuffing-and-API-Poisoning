import os
import importlib

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient
import app.main as main_module
from app.core.db import Base, engine, SessionLocal

client = None


def setup_function(_):
    os.environ['ANOMALY_DETECTION'] = 'true'
    importlib.reload(main_module)
    global client
    client = TestClient(main_module.app)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()
    os.environ.pop('ANOMALY_DETECTION', None)
    importlib.reload(main_module)


def test_anomalous_path_blocked():
    path = '/a' + 'b' * 100
    resp = client.get(path)
    assert resp.status_code == 403


def test_normal_path_allowed():
    resp = client.get('/ping')
    assert resp.status_code == 200
