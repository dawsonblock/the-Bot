"""Event API routes."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from aeon.db.repositories import events as event_repo
from aeon.models.event import EventRead

router = APIRouter()


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: UUID) -> EventRead:
    """Get a single event by id."""

    event = event_repo.get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
