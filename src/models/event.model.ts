import { z } from "zod";

export const EventCreateSchema = z.object({
  traceId: z.string().uuid(),
  parentEventId: z.string().uuid().optional(),
  actor: z.string(),
  eventType: z.string(),
  payload: z.record(z.unknown()).default({})
});

export const EventReadSchema = EventCreateSchema.extend({
  eventId: z.string().uuid(),
  timestamp: z.date(),
  createdAt: z.date()
});

export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventRead = z.infer<typeof EventReadSchema>;
