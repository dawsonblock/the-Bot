import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { events, traces } from "../db/schema.js";
import type { EventCreate, EventRead } from "../models/event.model.js";
import {
  hashEvent,
  hashPayload,
  toEventCreate,
  toEventReadFromSelect,
} from "./event_integrity.js";

export interface AppendEventInput extends Omit<EventCreate, "parentEventId"> {
  parentEventId?: string | null;
}

export interface LatestEventState {
  sequence: number;
  eventHash: string | null;
}

export type AppendDatabase = {
  transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  insert: any;
  select: any;
  execute: any;
};

export class EventAppendService {
  constructor(
    private readonly database: AppendDatabase = db as AppendDatabase,
  ) {}

  async append(input: AppendEventInput): Promise<EventRead> {
    return this.database.transaction(async (tx: any) =>
      this.appendInTransaction(input, tx),
    );
  }

  async appendBatch(
    traceId: string,
    batch: AppendEventInput[],
  ): Promise<EventRead[]> {
    if (batch.length === 0) {
      return [];
    }

    return this.database.transaction(async (tx: any) => {
      const appended: EventRead[] = [];

      for (const event of batch) {
        const parentEventId =
          appended.length > 0
            ? appended.at(-1)!.eventId
            : (event.parentEventId ?? null);
        appended.push(
          await this.appendInTransaction(
            {
              ...event,
              traceId,
              parentEventId,
            },
            tx,
          ),
        );
      }

      return appended;
    });
  }

  private async appendInTransaction(
    input: AppendEventInput,
    tx: any,
  ): Promise<EventRead> {
    const event = toEventCreate({
      ...input,
      parentEventId: input.parentEventId ?? null,
    });

    await this.lockTrace(tx, event.traceId);

    const parentEvent = event.parentEventId
      ? await this.getEventById(tx, event.parentEventId)
      : null;

    if (
      event.parentEventId &&
      (!parentEvent || parentEvent.traceId !== event.traceId)
    ) {
      throw new Error(
        `Parent event ${event.parentEventId} does not belong to trace ${event.traceId}`,
      );
    }

    const latest = await this.getLatestState(tx, event.traceId);
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
      createdAt,
    });

    return tx
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
        createdAt,
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
        createdAt: events.createdAt,
      })
      .then((createdRows: Record<string, unknown>[]) => {
        const [created] = createdRows;
        if (!created) {
          throw new Error("Failed to create event");
        }
        return toEventReadFromSelect(created);
      });
  }

  private async lockTrace(tx: any, traceId: string) {
    await tx.execute(
      sql`SELECT trace_id FROM traces WHERE trace_id = ${traceId} FOR UPDATE`,
    );
  }

  private async getLatestState(
    tx: any,
    traceId: string,
  ): Promise<LatestEventState> {
    const [latest] = await tx
      .select({
        sequence: events.sequence,
        eventHash: events.eventHash,
      })
      .from(events)
      .where(eq(events.traceId, traceId))
      .orderBy(sql`${events.sequence} DESC`, sql`${events.createdAt} DESC`)
      .limit(1);

    return {
      sequence: latest?.sequence ?? 0,
      eventHash: latest?.eventHash ?? null,
    };
  }

  private async getEventById(tx: any, eventId: string) {
    const [event] = await tx
      .select({
        traceId: events.traceId,
      })
      .from(events)
      .where(eq(events.eventId, eventId))
      .limit(1);

    return event ?? null;
  }
}
