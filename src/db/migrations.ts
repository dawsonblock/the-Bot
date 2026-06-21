import { sql } from "drizzle-orm";
import type { Pool, PoolClient } from "pg";

type MigrationPool = Pick<Pool, "connect">;
type MigrationClient = Pick<PoolClient, "query" | "release">;

export const migrations = [
  {
    name: "001_event_integrity_fields",
    up: [
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS sequence BIGINT",
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1",
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS payload_hash TEXT",
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS previous_event_hash TEXT",
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS event_hash TEXT",
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS idempotency_key TEXT",
      "ALTER TABLE events ADD CONSTRAINT events_actor_nonempty CHECK (length(trim(actor)) > 0)",
      "ALTER TABLE events ADD CONSTRAINT events_type_nonempty CHECK (length(trim(event_type)) > 0)",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_trace_sequence ON events(trace_id, sequence)",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_idempotency ON events(trace_id, idempotency_key) WHERE idempotency_key IS NOT NULL",
      "CREATE INDEX IF NOT EXISTS idx_events_trace_created ON events(trace_id, created_at)"
    ],
    down: [
      "DROP INDEX IF EXISTS idx_events_trace_created",
      "DROP INDEX IF EXISTS idx_events_idempotency",
      "DROP INDEX IF EXISTS idx_events_trace_sequence",
      "ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_nonempty",
      "ALTER TABLE events DROP CONSTRAINT IF EXISTS events_actor_nonempty",
      "ALTER TABLE events DROP COLUMN IF EXISTS idempotency_key",
      "ALTER TABLE events DROP COLUMN IF EXISTS event_hash",
      "ALTER TABLE events DROP COLUMN IF EXISTS previous_event_hash",
      "ALTER TABLE events DROP COLUMN IF EXISTS payload_hash",
      "ALTER TABLE events DROP COLUMN IF EXISTS schema_version",
      "ALTER TABLE events DROP COLUMN IF EXISTS sequence"
    ]
  }
];

export async function runMigrations(pool: { query: (text: string, values?: unknown[]) => Promise<unknown> }) {
  for (const migration of migrations) {
    for (const statement of migration.up) {
      await pool.query(statement);
    }
  }
}

export async function rollbackMigrations(pool: { query: (text: string, values?: unknown[]) => Promise<unknown> }) {
  for (const migration of [...migrations].reverse()) {
    for (const statement of migration.down.reverse()) {
      await pool.query(statement);
    }
  }
}

export async function migrate(pool: MigrationPool) {
  const client = await pool.connect() as MigrationClient;
  try {
    await client.query("BEGIN");
    for (const migration of migrations) {
      for (const statement of migration.up) {
        await client.query(statement);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rollback(pool: MigrationPool) {
  const client = await pool.connect() as MigrationClient;
  try {
    await client.query("BEGIN");
    for (const migration of [...migrations].reverse()) {
      for (const statement of migration.down.reverse()) {
        await client.query(statement);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
