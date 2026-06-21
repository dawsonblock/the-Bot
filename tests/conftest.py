"""Test support fixtures."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
import psycopg
from psycopg import Connection

from aeon.config import get_settings


@pytest.fixture(scope="session", autouse=True)
def database() -> Iterator[None]:
    """Ensure the database schema exists before tests run."""

    settings = get_settings()
    with psycopg.connect(settings.DATABASE_URL, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            schema_path = "aeon/db/schema.sql"
            with open(schema_path, encoding="utf-8") as schema_file:
                cursor.execute(schema_file.read())


@pytest.fixture()
def db() -> Iterator[Connection]:
    """Provide an isolated connection that rolls back after each test."""

    connection = psycopg.connect(get_settings().DATABASE_URL)
    try:
        yield connection
        connection.rollback()
    finally:
        connection.close()
