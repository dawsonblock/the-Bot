"""Pydantic models for append-only events."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    """Input model for appending an event."""

    trace_id: UUID
    parent_event_id: UUID | None = None
    actor: str
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)


class EventRead(EventCreate):
    """Read model for an event."""

    event_id: UUID
    timestamp: datetime
    created_at: datetime
