import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
  bigint,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const traces = pgTable(
  "traces",
  {
    traceId: uuid("trace_id").primaryKey().defaultRandom(),
    goal: text("goal").notNull(),
    status: text("status").notNull().default("running"),
    outcome: text("outcome"),
    startTime: timestamp("start_time", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endTime: timestamp("end_time", { withTimezone: true }),
    metrics: jsonb("metrics").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_traces_created_at").on(table.createdAt)],
);

export const events = pgTable(
  "events",
  {
    eventId: uuid("event_id").primaryKey().defaultRandom(),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.traceId),
    parentEventId: uuid("parent_event_id").references(
      (): any => events.eventId,
    ),
    sequence: bigint("sequence", { mode: "number" }).notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    payloadHash: text("payload_hash"),
    previousEventHash: text("previous_event_hash"),
    eventHash: text("event_hash"),
    idempotencyKey: text("idempotency_key"),
    actor: text("actor").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_events_trace_id").on(table.traceId),
    index("idx_events_event_type").on(table.eventType),
    index("idx_events_actor").on(table.actor),
    index("idx_events_timestamp").on(table.timestamp),
    index("idx_events_parent_event_id").on(table.parentEventId),
    index("idx_events_trace_created").on(table.traceId, table.createdAt),
    uniqueIndex("idx_events_trace_sequence").on(table.traceId, table.sequence),
  ],
);
