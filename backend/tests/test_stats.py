import os
from datetime import datetime

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.dialects import postgresql, sqlite  # noqa: E402
from app.main import app  # noqa: E402
from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.models.alerts import Alert  # noqa: E402
from app.core.security import create_access_token, get_password_hash  # noqa: E402
from app.crud.users import create_user  # noqa: E402
from app.core.time_buckets import bucket_time  # noqa: E402

client = TestClient(app)


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function(_):
    SessionLocal().close()


def test_stats_endpoint():
    token = create_access_token({"sub": "user"})
    with SessionLocal() as db:
        create_user(db, username='user', password_hash=get_password_hash('pw'))
        db.add(
            Alert(
                ip_address='1.1.1.1',
                total_fails=1,
                detail='Failed login',
                timestamp=datetime(2023, 1, 1, 0, 0, 0),
            )
        )
        db.add(
            Alert(
                ip_address='1.1.1.1',
                total_fails=2,
                detail='Blocked: too many failures',
                timestamp=datetime(2023, 1, 1, 0, 1, 0),
            )
        )
        db.commit()

    resp = client.get('/api/alerts/stats', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]['invalid'] == 1
    assert data[1]['blocked'] == 1


def test_bucket_time_generates_sql():
    expr_sqlite = bucket_time(Alert.timestamp, 'sqlite')
    sql_sqlite = str(expr_sqlite.compile(dialect=sqlite.dialect()))
    assert 'strftime' in sql_sqlite

    expr_pg = bucket_time(Alert.timestamp, 'postgresql')
    sql_pg = str(expr_pg.compile(dialect=postgresql.dialect()))
    assert 'date_trunc' in sql_pg
