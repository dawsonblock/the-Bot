import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { events, traces } from "../db/schema.js";
import type { EventCreate, EventRead } from "../models/event.model.js";
import { hashEvent, hashPayload, toEventCreate, toEventReadFromSelect } from "./event_integrity.js";

export interface AppendEventInput extends Omit<EventCreate, "parentEventId"> {
  parentEventId?: string | null;
}

export interface LatestEventState {
  sequence: number;
  eventHash: string | null;
}

export class EventAppendService {
  constructor(private readonly database = db) {}

  async append(input: AppendEventInput): Promise<EventRead> {
    const event = toEventCreate({ ...input, parentEventId: input.parentEventId ?? null });
    const latest = await this.getLatestState(event.traceId);
    const parentEvent = event.parentEventId
      ? await this.getEventById(event.parentEventId)
      : null;

    if (event.parentEventId && (!parentEvent || parentEvent.traceId !== event.traceId)) {
      throw new Error(`Parent event ${event.parentEventId} does not belong to trace ${event.traceId}`);
    }

    const sequence = latest.sequence + 1;
    const parentEventId = event.parentEventId ?? null;
    const payloadHash = hashPayload(event.payload);
    const createdAt = new Date();
    const eventHash = hashEvent({
      schemaVersion: 1,
      traceId: event.traceId,
      sequence,
      parentEventId,
      actor: event.actor,
      eventType: event.eventType,
      payloadHash,
      previousEventHash: latest.eventHash,
      createdAt
    });

    return this.database
      .insert(events)
      .values({
        traceId: event.traceId,
        parentEventId,
        sequence,
        schemaVersion: 1,
        payloadHash,
        previousEventHash: latest.eventHash,
        eventHash,
        idempotencyKey: event.idempotencyKey,
        actor: event.actor,
        eventType: event.eventType,
        payload: event.payload,
        createdAt
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
        return toEventReadFromSelect(created);
      });
  }

  async appendBatch(traceId: string, batch: AppendEventInput[]): Promise<EventRead[]> {
    const appended: EventRead[] = [];

    for (const event of batch) {
      const parentEventId = appended.length > 0 ? appended.at(-1)!.eventId : event.parentEventId ?? null;
      appended.push(await this.append({
        ...event,
        traceId,
        parentEventId
      }));
    }

    return appended;
  }

  private async getLatestState(traceId: string): Promise<LatestEventState> {
    const [latest] = await this.database
      .select({
        sequence: events.sequence,
        eventHash: events.eventHash
      })
      .from(events)
      .where(eq(events.traceId, traceId))
      .orderBy(sql`${events.sequence} DESC`, sql`${events.createdAt} DESC`)
      .limit(1);

    return {
      sequence: latest?.sequence ?? 0,
      eventHash: latest?.eventHash ?? null
    };
  }

  private async getEventById(eventId: string) {
    const [event] = await this.database
      .select({
        traceId: events.traceId
      })
      .from(events)
      .where(eq(events.eventId, eventId))
      .limit(1);

    return event ?? null;
  }
}
