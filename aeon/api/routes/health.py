"""Health endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
def get_health() -> dict[str, str]:
    """Return service health."""

    return {"status": "ok"}
