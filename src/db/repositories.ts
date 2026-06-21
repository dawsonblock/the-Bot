import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { events, traces } from "./schema.js";
import { db } from "./db.js";
import { EventAppendService } from "../core/event_append_service.js";
import type { EventCreate, EventRead } from "../models/event.model.js";
import type { TraceCreate, TraceRead } from "../models/trace.model.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function eventFromSelect(row: Record<string, unknown>): EventRead {
  return {
    eventId: String(row.eventId),
    traceId: String(row.traceId),
    parentEventId: row.parentEventId ? String(row.parentEventId) : null,
    sequence: Number(row.sequence),
    schemaVersion: Number(row.schemaVersion),
    payloadHash: row.payloadHash ? String(row.payloadHash) : null,
    previousEventHash: row.previousEventHash ? String(row.previousEventHash) : null,
    eventHash: row.eventHash ? String(row.eventHash) : null,
    idempotencyKey: row.idempotencyKey ? String(row.idempotencyKey) : undefined,
    actor: String(row.actor),
    eventType: String(row.eventType),
    payload: row.payload as Record<string, unknown>,
    timestamp: row.timestamp as Date,
    createdAt: row.createdAt as Date
  };
}

export class TraceRepository {
  async createTrace(goal: string): Promise<TraceRead> {
    return db
      .insert(traces)
      .values({ goal })
      .returning({
        traceId: traces.traceId,
        goal: traces.goal,
        status: traces.status,
        outcome: traces.outcome,
        startTime: traces.startTime,
        endTime: traces.endTime,
        metrics: traces.metrics,
        createdAt: traces.createdAt
      })
      .then(([trace]) => {
        if (!trace) {
          throw new Error(`Trace not found: ${goal}`);
        }
        return {
          ...trace,
          metrics: asRecord(trace.metrics)
        };
      });
  }

  async getTrace(traceId: string): Promise<TraceRead | null> {
    return db
      .select({
        traceId: traces.traceId,
        goal: traces.goal,
        status: traces.status,
        outcome: traces.outcome,
        startTime: traces.startTime,
        endTime: traces.endTime,
        metrics: traces.metrics,
        createdAt: traces.createdAt
      })
      .from(traces)
      .where(eq(traces.traceId, traceId))
      .then(([trace]) => trace ? { ...trace, metrics: asRecord(trace.metrics) } : null);
  }

  async listTraces(limit = 50): Promise<TraceRead[]> {
    return db
      .select({
        traceId: traces.traceId,
        goal: traces.goal,
        status: traces.status,
        outcome: traces.outcome,
        startTime: traces.startTime,
        endTime: traces.endTime,
        metrics: traces.metrics,
        createdAt: traces.createdAt
      })
      .from(traces)
      .orderBy(sql`${traces.createdAt} DESC`)
      .limit(limit)
      .then((rows) => rows.map((trace) => ({ ...trace, metrics: asRecord(trace.metrics) })));
  }

  async completeTrace(traceId: string, outcome: string, metrics: Record<string, unknown> = {}): Promise<TraceRead> {
    return db
      .update(traces)
      .set({ status: "completed", outcome, metrics, endTime: sql`now()` })
      .where(eq(traces.traceId, traceId))
      .returning({
        traceId: traces.traceId,
        goal: traces.goal,
        status: traces.status,
        outcome: traces.outcome,
        startTime: traces.startTime,
        endTime: traces.endTime,
        metrics: traces.metrics,
        createdAt: traces.createdAt
      })
      .then(([trace]) => {
        if (!trace) {
          throw new Error(`Trace not found: ${traceId}`);
        }
        return {
          ...trace,
          metrics: asRecord(trace.metrics)
        };
      });
  }
}

export class EventRepository {
  async appendEvent(event: EventCreate): Promise<EventRead> {
    return db
      .insert(events)
      .values({
        ...event,
        parentEventId: event.parentEventId ?? null,
        sequence: 0,
        schemaVersion: 1,
        payloadHash: null,
        previousEventHash: null,
        eventHash: null
      })
      .returning({
        eventId: events.eventId,
        traceId: events.traceId,
        parentEventId: events.parentEventId,
        sequence: events.sequence,
        schemaVersion: events.schemaVersion,
        payloadHash: events.payloadHash,
        previousEventHash: events.previousEventHash,
        eventHash: events.eventHash,
        idempotencyKey: events.idempotencyKey,
        actor: events.actor,
        eventType: events.eventType,
        payload: events.payload,
        timestamp: events.timestamp,
        createdAt: events.createdAt
      })
      .then(([created]) => {
        if (!created) {
          throw new Error("Failed to create event");
        }
        return eventFromSelect(created as unknown as Record<string, unknown>);
      });
  }

  async getEventsForTrace(traceId: string): Promise<EventRead[]> {
    return db
      .select({
        eventId: events.eventId,
        traceId: events.traceId,
        parentEventId: events.parentEventId,
        sequence: events.sequence,
        schemaVersion: events.schemaVersion,
        payloadHash: events.payloadHash,
        previousEventHash: events.previousEventHash,
        eventHash: events.eventHash,
        idempotencyKey: events.idempotencyKey,
        actor: events.actor,
        eventType: events.eventType,
        payload: events.payload,
        timestamp: events.timestamp,
        createdAt: events.createdAt
      })
      .from(events)
      .where(eq(events.traceId, traceId))
      .orderBy(events.timestamp, events.createdAt, events.eventId)
      .then((rows) => rows.map((event) => eventFromSelect(event as unknown as Record<string, unknown>)));
  }

  async getEvent(eventId: string): Promise<EventRead | null> {
    return db
      .select({
        eventId: events.eventId,
        traceId: events.traceId,
        parentEventId: events.parentEventId,
        sequence: events.sequence,
        schemaVersion: events.schemaVersion,
        payloadHash: events.payloadHash,
        previousEventHash: events.previousEventHash,
        eventHash: events.eventHash,
        idempotencyKey: events.idempotencyKey,
        actor: events.actor,
        eventType: events.eventType,
        payload: events.payload,
        timestamp: events.timestamp,
        createdAt: events.createdAt
      })
      .from(events)
      .where(eq(events.eventId, eventId))
      .then(([event]) => event ? eventFromSelect(event as unknown as Record<string, unknown>) : null);
  }
}
