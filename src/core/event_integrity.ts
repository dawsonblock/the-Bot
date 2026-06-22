import { createHash } from "node:crypto";
import type { EventCreate, EventRead } from "../models/event.model.js";

export interface HashInputs {
  schemaVersion: number;
  traceId: string;
  sequence: number;
  parentEventId: string | null;
  actor: string;
  eventType: string;
  payloadHash: string;
  previousEventHash: string | null;
  createdAt: Date;
}

export function canonicalizePayload(payload: unknown): string {
  return JSON.stringify(stableSerialize(payload));
}

export function stableSerialize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stableSerialize(item));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableSerialize(item)]),
  );
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashPayload(payload: unknown): string {
  return sha256(canonicalizePayload(payload));
}

export function hashEvent(inputs: HashInputs): string {
  const createdAt = inputs.createdAt.toISOString();
  const parts = [
    String(inputs.schemaVersion),
    inputs.traceId,
    String(inputs.sequence),
    inputs.parentEventId ?? "",
    inputs.actor,
    inputs.eventType,
    inputs.payloadHash,
    inputs.previousEventHash ?? "",
    createdAt,
  ];

  return sha256(parts.join("|"));
}

export function verifyPayloadHash(event: EventRead): boolean {
  return event.payloadHash === hashPayload(event.payload);
}

export function verifyEventHash(
  event: EventRead,
  previousEventHash: string | null,
): boolean {
  const expectedEventHash = hashEvent({
    schemaVersion: event.schemaVersion,
    traceId: event.traceId,
    sequence: event.sequence,
    parentEventId: event.parentEventId,
    actor: event.actor,
    eventType: event.eventType,
    payloadHash: hashPayload(event.payload),
    previousEventHash,
    createdAt: event.createdAt,
  });

  return event.eventHash === expectedEventHash;
}

export function verifyHashChain(events: EventRead[]): boolean {
  let previousEventHash: string | null = null;

  return events.every((event, index) => {
    const expectedPreviousEventHash =
      index === 0 ? null : events[index - 1].eventHash;
    const validPreviousLink =
      event.previousEventHash === expectedPreviousEventHash;
    const validPayloadHash = verifyPayloadHash(event);
    const validEventHash = verifyEventHash(event, previousEventHash);
    previousEventHash = event.eventHash;
    return validPreviousLink && validPayloadHash && validEventHash;
  });
}

export function toEventRead(row: Record<string, unknown>): EventRead {
  return {
    eventId: String(row.event_id),
    traceId: String(row.trace_id),
    parentEventId: row.parent_event_id ? String(row.parent_event_id) : null,
    sequence: Number(row.sequence),
    schemaVersion: Number(row.schema_version),
    payloadHash: row.payload_hash ? String(row.payload_hash) : null,
    previousEventHash: row.previous_event_hash
      ? String(row.previous_event_hash)
      : null,
    eventHash: row.event_hash ? String(row.event_hash) : null,
    idempotencyKey: row.idempotency_key
      ? String(row.idempotency_key)
      : undefined,
    actor: String(row.actor),
    eventType: String(row.event_type),
    payload: row.payload as Record<string, unknown>,
    timestamp: row.timestamp as Date,
    createdAt: row.created_at as Date,
  };
}

export function toEventReadFromSelect(row: Record<string, unknown>): EventRead {
  return {
    eventId: String(row.eventId),
    traceId: String(row.traceId),
    parentEventId: row.parentEventId ? String(row.parentEventId) : null,
    sequence: Number(row.sequence),
    schemaVersion: Number(row.schemaVersion),
    payloadHash: row.payloadHash ? String(row.payloadHash) : null,
    previousEventHash: row.previousEventHash
      ? String(row.previousEventHash)
      : null,
    eventHash: row.eventHash ? String(row.eventHash) : null,
    idempotencyKey: row.idempotencyKey ? String(row.idempotencyKey) : undefined,
    actor: String(row.actor),
    eventType: String(row.eventType),
    payload: row.payload as Record<string, unknown>,
    timestamp: row.timestamp as Date,
    createdAt: row.createdAt as Date,
  };
}

export function toEventCreate(input: EventCreate): EventCreate {
  return {
    traceId: input.traceId,
    parentEventId: input.parentEventId ?? null,
    actor: input.actor,
    eventType: input.eventType,
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
  };
}
