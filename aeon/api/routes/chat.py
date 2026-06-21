"""Chat API route."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException

from aeon.db.repositories import events as event_repo
from aeon.db.repositories import traces as trace_repo
from aeon.models.chat import ChatRequest, ChatResponse
from aeon.models.event import EventCreate

router = APIRouter()


def _record_message(trace_id: UUID, actor: str, event_type: str, message: str) -> EventCreate:
    return event_repo.append_event(
        EventCreate(
            trace_id=trace_id,
            actor=actor,
            event_type=event_type,
            payload={"message": message},
        )
    )


@router.post("", response_model=ChatResponse)
def post_chat(request: ChatRequest) -> ChatResponse:
    """Record chat messages as immutable events.

    If no trace_id is provided, a new trace is created using the chat message as
    the goal. This route is intentionally not an intelligence layer.
    """

    if request.trace_id is None:
        trace = trace_repo.create_trace(request.message)
        trace_repo.append_trace_created_event(trace)
        trace_id = trace.trace_id
    else:
        trace_id = request.trace_id
        if trace_repo.get_trace(trace_id) is None:
            raise HTTPException(status_code=404, detail="Trace not found")

    user_event = _record_message(
        trace_id=trace_id,
        actor="user",
        event_type="user_message",
        message=request.message,
    )

    if request.trace_id is None:
        assistant_message = "Trace created. I will plan next."
    else:
        assistant_message = "Message recorded."

    assistant_event = _record_message(
        trace_id=trace_id,
        actor="assistant",
        event_type="assistant_message",
        message=assistant_message,
    )

    return ChatResponse(
        trace_id=trace_id,
        message=assistant_message,
        requires_approval=False,
        related_event_ids=[user_event.event_id, assistant_event.event_id],
        created_at=datetime.now(tz=UTC),
    )
