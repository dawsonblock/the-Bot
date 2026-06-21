import { z } from "zod";

export const TraceCreateSchema = z.object({
  goal: z.string().min(1)
});

export const TraceReadSchema = TraceCreateSchema.extend({
  traceId: z.string().uuid(),
  status: z.string(),
  outcome: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date().nullable(),
  metrics: z.record(z.unknown()).default({}),
  createdAt: z.date()
});

export type TraceCreate = z.infer<typeof TraceCreateSchema>;
export type TraceRead = z.infer<typeof TraceReadSchema>;
