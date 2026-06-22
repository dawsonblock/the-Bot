# AEON v0.1-alpha TypeScript spine

AEON is a local-first, event-sourced, verifier-driven AI task control-plane spine.

This is not yet an autonomous bot. The active implementation is the TypeScript Fastify backend. The archived Python FastAPI spine is retained only as historical reference under `archive/python-fastapi-spine/` and is not the active runtime path.

## Scope

Implemented in the TypeScript Fastify backend:

- Fastify API app
- PostgreSQL/Drizzle trace and event repositories
- Event-sourced trace creation and retrieval
- Event append service with payload/event hashing and hash-chain fields
- Parent-event trace validation
- Chat-to-plan flow for new goals
- `show plan`, `show trace`, and `show events` chat commands
- LLM provider abstraction
- Providers for Gemini, OpenRouter, Groq, and Ollama
- Provider selection through `LLM_PROVIDER` or constructor options
- Planner stub using JSON-only LLM responses
- Outcome predictor stub with rule-based risk mapping
- Plan and plan-step events written through the append service
- Vitest coverage for router, planner, chat planner flow, and trace/event routes
- Request validation, LLM provider timeout handling, and safer Gemini key transport
- Graceful Fastify shutdown and database pool cleanup
- Runtime migration scripts and PostgreSQL init SQL for the TypeScript path

Not implemented yet:

- Executor
- Verifier
- Memory retrieval
- Learning compiler
- Dashboard
- Autonomous tool execution

## Requirements

- Node.js 22+
- npm 10+
- PostgreSQL 16+ for runtime persistence
- Docker Compose for a local PostgreSQL instance

## Quick start

```bash
npm install
npm run typecheck
npm test
docker compose up -d
DATABASE_URL=postgresql://aeon:aeon@localhost:5432/aeon npm run db:migrate
npm run dev
```

Open <http://localhost:3000/health>.

## API examples

Create a chat trace and trigger planning:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Build the AEON planner"}'
```

Show the latest stored plan:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"traceId":"<trace_id>","message":"show plan"}'
```

Show trace events:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"traceId":"<trace_id>","message":"show trace"}'
```

List traces:

```bash
curl http://localhost:3000/traces
```

List events for a trace:

```bash
curl http://localhost:3000/traces/{trace_id}/events
```

## LLM router

The router exposes a small provider abstraction:

```ts
interface LLMProvider {
  generateText(input: { system: string; prompt: string }): Promise<string>;
  generateJSON<T>(input: {
    system: string;
    prompt: string;
    schemaName: string;
  }): Promise<T>;
}
```

Default provider:

```bash
DATABASE_URL=postgresql://aeon:aeon@localhost:5432/aeon LLM_PROVIDER=ollama npm run dev
```

Supported providers:

- `gemini`
- `openrouter`
- `groq`
- `ollama`

Provider timeout can be configured with `LLM_PROVIDER_TIMEOUT_MS` (milliseconds). Gemini API keys are sent with `x-goog-api-key`; OpenRouter and Groq use `Authorization: Bearer ...`.

## Planner flow

For a new trace, `POST /chat` performs the following event-sourced flow:

1. Create trace.
2. Append `trace_created`.
3. Append `user_message`.
4. Planner appends `llm_call_requested`.
5. Planner calls the configured LLM provider.
6. Planner appends `llm_call_completed`.
7. Planner validates JSON against the plan schema.
8. Planner appends `plan_created`.
9. Planner appends `outcome_prediction_created` for each step.
10. Planner appends `plan_step_created` for each step.
11. API appends `assistant_message`.
12. API returns the plan summary.

No autonomous tool execution is wired into this milestone.

## Verification

Required checks:

```bash
npm run typecheck
npm test
```

Current honest status after a clean local install:

```text
Test Files  4 passed
Tests       18 passed
```

Coverage is available with:

```bash
npm run test:coverage
```

## Archived Python FastAPI spine

The original Python FastAPI spine remains under `archive/python-fastapi-spine/` for historical continuity only. It is not the active runtime path, and the root Makefile no longer points `test` or `dev` at Python commands.
