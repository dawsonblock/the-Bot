"""HTTP client fixture."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from aeon.api.app import create_app


@pytest.fixture()
def client() -> Iterator[TestClient]:
    """Create a FastAPI test client."""

    with TestClient(create_app()) as test_client:
        yield test_client
