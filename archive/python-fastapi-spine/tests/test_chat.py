"""Chat API tests."""

from aeon.db.repositories import events as event_repo
from aeon.db.repositories import traces as trace_repo
from aeon.api.app import create_app


def test_chat_without_trace_creates_trace(client):
    response = client.post("/chat", json={"message": "Build AEON"})

    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Trace created. I will plan next."
    assert body["requires_approval"] is False
    assert len(body["related_event_ids"]) == 2


def test_chat_without_trace_creates_user_message_event(client):
    response = client.post("/chat", json={"message": "Record user message"})
    trace_id = response.json()["trace_id"]

    events = event_repo.get_events_for_trace(trace_id)

    assert any(event.event_type == "user_message" for event in events)
    assert events[0].actor == "system"
    assert events[1].actor == "user"
    assert events[1].payload["message"] == "Record user message"


def test_chat_without_trace_creates_assistant_message_event(client):
    response = client.post("/chat", json={"message": "Record assistant message"})
    trace_id = response.json()["trace_id"]

    events = event_repo.get_events_for_trace(trace_id)

    assert any(event.event_type == "assistant_message" for event in events)
    assert events[2].actor == "assistant"
    assert events[2].payload["message"] == "Trace created. I will plan next."


def test_chat_with_existing_trace_appends_events_to_same_trace(client):
    trace = trace_repo.create_trace("Existing trace")
    trace_repo.append_trace_created_event(trace)

    response = client.post("/chat", json={"message": "Continue trace", "trace_id": str(trace.trace_id)})

    assert response.status_code == 200
    events = event_repo.get_events_for_trace(trace.trace_id)
    assert len(events) == 3
    assert events[1].event_type == "user_message"
    assert events[2].event_type == "assistant_message"
    assert events[2].payload["message"] == "Message recorded."


def test_chat_with_missing_trace_returns_404(client):
    missing_trace_id = "00000000-0000-0000-0000-000000000000"

    response = client.post("/chat", json={"message": "Missing trace", "trace_id": missing_trace_id})

    assert response.status_code == 404
