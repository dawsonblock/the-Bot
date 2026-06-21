"""Pydantic models for chat interactions."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Input model for chat messages."""

    message: str
    trace_id: UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    """Response model for chat messages."""

    trace_id: UUID
    message: str
    requires_approval: bool = False
    related_event_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime
