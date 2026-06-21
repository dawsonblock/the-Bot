"""FastAPI application assembly."""

from fastapi import FastAPI

from aeon.api.routes import chat, events, health, traces


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(title="AEON v0.1-alpha", version="0.1.0")
    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(chat.router, prefix="/chat", tags=["chat"])
    app.include_router(traces.router, prefix="/traces", tags=["traces"])
    app.include_router(events.router, prefix="/events", tags=["events"])
    return app
