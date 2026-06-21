"""Event repository tests."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest

from aeon.db.repositories import events as event_repo
from aeon.db.repositories import traces as trace_repo
from aeon.models.event import EventCreate


def _append_event(db, trace_id: UUID, event_type: str, seconds_offset: int = 0):
    return event_repo.append_event(
        EventCreate(
            trace_id=trace_id,
            actor="tester",
            event_type=event_type,
            payload={"sequence": seconds_offset},
        )
    )


def test_event_can_be_appended(db):
    trace = trace_repo.create_trace("Append event")

    event = _append_event(db, trace.trace_id, "test_event")

    assert event.event_id is not None
    assert event.trace_id == trace.trace_id
    assert event.event_type == "test_event"


def test_event_can_be_retrieved(db):
    trace = trace_repo.create_trace("Retrieve event")
    event = _append_event(db, trace.trace_id, "test_event")

    fetched = event_repo.get_event(event.event_id)

    assert fetched is not None
    assert fetched.event_id == event.event_id
    assert fetched.event_type == "test_event"


def test_events_return_ordered_by_timestamp(db):
    trace = trace_repo.create_trace("Ordered events")
    first = _append_event(db, trace.trace_id, "first")
    second = _append_event(db, trace.trace_id, "second")

    events = event_repo.get_events_for_trace(trace.trace_id)

    assert [event.event_id for event in events] == [first.event_id, second.event_id]


def test_event_update_fails_at_database_level(db):
    trace = trace_repo.create_trace("Immutable event update")
    event = _append_event(db, trace.trace_id, "test_event")

    with pytest.raises(Exception, match="events table is append-only"):
        with db.cursor() as cursor:
            cursor.execute("UPDATE events SET actor = %s WHERE event_id = %s", ("changed", event.event_id))
            db.commit()


def test_event_delete_fails_at_database_level(db):
    trace = trace_repo.create_trace("Immutable event delete")
    event = _append_event(db, trace.trace_id, "test_event")

    with pytest.raises(Exception, match="events table is append-only"):
        with db.cursor() as cursor:
            cursor.execute("DELETE FROM events WHERE event_id = %s", (event.event_id,))
            db.commit()
