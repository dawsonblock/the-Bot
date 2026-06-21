"""Append-only event repository."""

from __future__ import annotations

from uuid import UUID

from aeon.db.session import get_connection
from aeon.models.event import EventCreate, EventRead


def _event_from_row(row: tuple[object, ...]) -> EventRead:
    return EventRead(
        event_id=row[0],
        trace_id=row[1],
        parent_event_id=row[2],
        actor=row[3],
        event_type=row[4],
        payload=row[5],
        timestamp=row[6],
        created_at=row[7],
    )


def append_event(event: EventCreate) -> EventRead:
    """Append an immutable event."""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO events (trace_id, parent_event_id, actor, event_type, payload)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING event_id, trace_id, parent_event_id, actor, event_type, payload, timestamp, created_at
                """,
                (
                    event.trace_id,
                    event.parent_event_id,
                    event.actor,
                    event.event_type,
                    event.payload,
                ),
            )
            return _event_from_row(cursor.fetchone())


def get_events_for_trace(trace_id: UUID) -> list[EventRead]:
    """Return events for a trace ordered by timestamp."""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT event_id, trace_id, parent_event_id, actor, event_type, payload, timestamp, created_at
                FROM events
                WHERE trace_id = %s
                ORDER BY timestamp ASC, created_at ASC, event_id ASC
                """,
                (trace_id,),
            )
            return [_event_from_row(row) for row in cursor.fetchall()]


def get_event(event_id: UUID) -> EventRead | None:
    """Return an event by id."""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT event_id, trace_id, parent_event_id, actor, event_type, payload, timestamp, created_at
                FROM events
                WHERE event_id = %s
                """,
                (event_id,),
            )
            row = cursor.fetchone()
            return _event_from_row(row) if row else None
