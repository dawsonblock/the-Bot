# AEON v0.1-alpha

AEON is a local-first, event-sourced, verifier-driven AI operating spine. This repository currently implements the first working milestone: the database and API spine.

## Scope

Implemented:

- FastAPI backend
- PostgreSQL 16 with `pgvector` and `pgcrypto`
- Append-only `events` table enforced by database triggers
- Trace creation and retrieval
- Chat messages stored as events
- Trace and event API routes
- Health endpoint

Not implemented yet:

- Planner
- Executor
- Verifier
- Memory retrieval
- Learning compiler
- Dashboard
- Autonomous tool use

## Requirements

- Python 3.11+
- Docker Compose

## Quick start

```bash
cp .env.example .env
make dev-db
pytest
make dev
```

Open <http://localhost:8000/health>.

## API examples

Create a chat trace:

```bash
curl -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Build the AEON event spine"}'
```

List traces:

```bash
curl http://localhost:8000/traces
```

List events for a trace:

```bash
curl http://localhost:8000/traces/{trace_id}/events
```

## Database spine

The schema includes:

- `traces`
- `events`
- append-only update/delete triggers on `events`
- indexes for trace, event type, actor, and timestamp lookups

## Verification

Required checks:

```bash
docker compose up -d
pytest
uvicorn aeon.main:app --reload
curl http://localhost:8000/health
```

Expected health response:

```json
{"status":"ok"}
```
