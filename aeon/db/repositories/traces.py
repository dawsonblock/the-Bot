"""Trace repository."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from aeon.db.session import get_connection
from aeon.models.event import EventCreate
from aeon.models.trace import TraceCreate, TraceRead


def _trace_from_row(row: tuple[Any, ...]) -> TraceRead:
    return TraceRead(
        trace_id=row[0],
        goal=row[1],
        status=row[2],
        outcome=row[3],
        start_time=row[4],
        end_time=row[5],
        metrics=row[6],
        created_at=row[7],
    )


def create_trace(goal: str) -> TraceRead:
    """Create a trace."""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO traces (goal)
                VALUES (%s)
                RETURNING trace_id, goal, status, outcome, start_time, end_time, metrics, created_at
                """,
                (goal,),
            )
            return _trace_from_row(cursor.fetchone())


def get_trace(trace_id: UUID) -> TraceRead | None:
    """Return a trace by id."""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT trace_id, goal, status, outcome, start_time, end_time, metrics, created_at
                FROM traces
                WHERE trace_id = %s
                """,
                (trace_id,),
            )
            row = cursor.fetchone()
            return _trace_from_row(row) if row else None


def list_traces(limit: int = 50) -> list[TraceRead]:
    """List traces in creation order."""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT trace_id, goal, status, outcome, start_time, end_time, metrics, created_at
                FROM traces
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return [_trace_from_row(row) for row in cursor.fetchall()]


def complete_trace(trace_id: UUID, outcome: str, metrics: dict[str, Any] | None = None) -> TraceRead:
    """Mark a trace complete."""

    metrics_payload = metrics or {}
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE traces
                SET status = 'completed', outcome = %s, metrics = %s, end_time = now()
                WHERE trace_id = %s
                RETURNING trace_id, goal, status, outcome, start_time, end_time, metrics, created_at
                """,
                (outcome, metrics_payload, trace_id),
            )
            row = cursor.fetchone()
            if row is None:
                raise KeyError(f"Trace {trace_id} not found")
            return _trace_from_row(row)


def append_trace_created_event(trace: TraceRead) -> None:
    """Append the mandatory trace_created event for a new trace."""

    event = EventCreate(
        trace_id=trace.trace_id,
        actor="system",
        event_type="trace_created",
        payload={"goal": trace.goal},
    )
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO events (trace_id, parent_event_id, actor, event_type, payload)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    event.trace_id,
                    event.parent_event_id,
                    event.actor,
                    event.event_type,
                    event.payload,
                ),
            )
