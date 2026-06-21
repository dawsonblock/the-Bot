"""Pydantic models for traces."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TraceCreate(BaseModel):
    """Input model for creating a trace."""

    goal: str


class TraceRead(BaseModel):
    """Read model for a trace."""

    trace_id: UUID
    goal: str
    status: str
    outcome: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    metrics: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
