import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const traces = pgTable("traces", {
  traceId: uuid("trace_id").primaryKey().defaultRandom(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("running"),
  outcome: text("outcome"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  metrics: jsonb("metrics").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const events = pgTable("events", {
  eventId: uuid("event_id").primaryKey().defaultRandom(),
  traceId: uuid("trace_id")
    .notNull()
    .references(() => traces.traceId),
  parentEventId: uuid("parent_event_id").references((): any => events.eventId),
  actor: text("actor").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
