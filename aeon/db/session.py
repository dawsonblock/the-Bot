"""PostgreSQL connection helpers."""

from collections.abc import Iterator

import psycopg
from psycopg import Connection

from aeon.config import get_settings


def get_connection() -> Connection:
    """Open a psycopg connection using the configured DATABASE_URL."""

    settings = get_settings()
    return psycopg.connect(settings.DATABASE_URL)


def get_connection_context() -> Iterator[Connection]:
    """Yield a managed psycopg connection."""

    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()
