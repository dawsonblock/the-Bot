"""Trace repository tests."""

from aeon.db.repositories import events as event_repo
from aeon.db.repositories import traces as trace_repo


def test_trace_can_be_created(db):
    trace = trace_repo.create_trace("Build AEON spine")

    assert str(trace.goal) == "Build AEON spine"
    assert trace.status == "running"
    assert trace.trace_id is not None


def test_trace_can_be_retrieved(db):
    trace = trace_repo.create_trace("Retrieve AEON trace")

    fetched = trace_repo.get_trace(trace.trace_id)

    assert fetched is not None
    assert fetched.trace_id == trace.trace_id
    assert fetched.goal == "Retrieve AEON trace"


def test_trace_has_trace_created_event(db):
    trace = trace_repo.create_trace("Create trace with event")
    trace_repo.append_trace_created_event(trace)

    events = event_repo.get_events_for_trace(trace.trace_id)

    assert len(events) == 1
    assert events[0].event_type == "trace_created"
    assert events[0].payload == {"goal": "Create trace with event"}


def test_trace_can_be_completed(db):
    trace = trace_repo.create_trace("Complete AEON trace")

    completed = trace_repo.complete_trace(trace.trace_id, "verified", {"steps": 1})

    assert completed.status == "completed"
    assert completed.outcome == "verified"
    assert completed.end_time is not None
    assert completed.metrics == {"steps": 1}
