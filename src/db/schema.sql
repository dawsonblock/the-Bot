-- Fresh database snapshot for AEON TypeScript Fastify spine.
-- Prefer npm run db:migrate for runtime migrations on existing databases.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS traces (
  trace_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  outcome TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id UUID NOT NULL REFERENCES traces(trace_id),
  parent_event_id UUID REFERENCES events(event_id),
  sequence BIGINT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  payload_hash TEXT,
  previous_event_hash TEXT,
  event_hash TEXT,
  idempotency_key TEXT,
  actor TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT events_actor_nonempty CHECK (length(trim(actor)) > 0),
  CONSTRAINT events_type_nonempty CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at);
CREATE INDEX IF NOT EXISTS idx_events_trace_id ON events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_trace_created ON events(trace_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_trace_sequence ON events(trace_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_idempotency ON events(trace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'events table is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_no_update ON events;
CREATE TRIGGER events_no_update
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION prevent_event_mutation();

DROP TRIGGER IF EXISTS events_no_delete ON events;
CREATE TRIGGER events_no_delete
BEFORE DELETE ON events
FOR EACH ROW EXECUTE FUNCTION prevent_event_mutation();
