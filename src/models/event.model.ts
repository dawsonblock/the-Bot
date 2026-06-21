import { z } from "zod";

export const EventCreateSchema = z.object({
  traceId: z.string().uuid(),
  parentEventId: z.string().uuid().nullable().optional(),
  actor: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().optional()
});

export const EventReadSchema = EventCreateSchema.extend({
  eventId: z.string().uuid(),
  timestamp: z.date(),
  createdAt: z.date(),
  sequence: z.number().int().nonnegative(),
  schemaVersion: z.number().int().positive(),
  payloadHash: z.string().nullable(),
  previousEventHash: z.string().nullable(),
  eventHash: z.string().nullable()
});

export type EventCreate = {
  traceId: string;
  parentEventId?: string | null;
  actor: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};

export type EventRead = {
  eventId: string;
  traceId: string;
  parentEventId: string | null;
  sequence: number;
  schemaVersion: number;
  payloadHash: string | null;
  previousEventHash: string | null;
  eventHash: string | null;
  idempotencyKey?: string;
  actor: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
};
