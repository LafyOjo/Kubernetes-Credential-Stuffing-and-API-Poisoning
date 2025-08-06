import os
from datetime import datetime, timedelta

os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
os.environ['SECRET_KEY'] = 'test-secret'

from app.core.db import Base, engine, SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.crud.users import create_user  # noqa: E402
from app.crud.events import get_user_activity  # noqa: E402
from app.models.events import Event  # noqa: E402


def setup_function(_):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_user(db, username='alice', password_hash=get_password_hash('pw'))
        create_user(db, username='bob', password_hash=get_password_hash('pw2'))


def teardown_function(_):
    SessionLocal().close()


def _seed_events(db):
    now = datetime.utcnow()
    events = [
        Event(username='alice', action='login', success=True, timestamp=now),
        Event(
            username='alice',
            action='login',
            success=False,
            timestamp=now - timedelta(minutes=1),
        ),
        Event(
            username='alice',
            action='logout',
            success=True,
            timestamp=now - timedelta(minutes=2),
        ),
        Event(
            username='bob',
            action='login',
            success=True,
            timestamp=now - timedelta(minutes=3),
        ),
    ]
    db.add_all(events)
    db.commit()
    return events


def test_user_activity_returns_login_events_in_desc_order():
    with SessionLocal() as db:
        _seed_events(db)
        events = get_user_activity(db, 'alice')
        assert len(events) == 2
        assert all(e.action == 'login' for e in events)
        assert events[0].timestamp > events[1].timestamp
        assert {e.success for e in events} == {True, False}


def test_user_activity_respects_limit():
    with SessionLocal() as db:
        _seed_events(db)
        events = get_user_activity(db, 'alice', limit=1)
        assert len(events) == 1
        assert events[0].success is True

