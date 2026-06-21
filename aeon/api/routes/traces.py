"""Trace API routes."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from aeon.db.repositories import events as event_repo
from aeon.db.repositories import traces as trace_repo
from aeon.models.event import EventRead
from aeon.models.trace import TraceCreate, TraceRead

router = APIRouter()


@router.post("", response_model=TraceRead, status_code=201)
def create_trace(request: TraceCreate) -> TraceRead:
    """Create a trace and append its trace_created event."""

    trace = trace_repo.create_trace(request.goal)
    trace_repo.append_trace_created_event(trace)
    return trace


@router.get("", response_model=list[TraceRead])
def list_traces(limit: int = 50) -> list[TraceRead]:
    """List traces."""

    return trace_repo.list_traces(limit)


@router.get("/{trace_id}", response_model=TraceRead)
def get_trace(trace_id: UUID) -> TraceRead:
    """Get a trace by id."""

    trace = trace_repo.get_trace(trace_id)
    if trace is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    return trace


@router.get("/{trace_id}/events", response_model=list[EventRead])
def get_trace_events(trace_id: UUID) -> list[EventRead]:
    """Get events for a trace."""

    if trace_repo.get_trace(trace_id) is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    return event_repo.get_events_for_trace(trace_id)
