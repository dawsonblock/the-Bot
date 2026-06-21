import { z } from "zod";
import { PlanSchema } from "../schemas/plan.schema.js";

export const ChatRequestSchema = z.object({
  message: z.string().min(1).transform((value) => value.trim()).pipe(z.string().min(1)),
  traceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const ChatResponseSchema = z.object({
  traceId: z.string().uuid(),
  message: z.string(),
  requiresApproval: z.boolean().default(false),
  relatedEventIds: z.array(z.string().uuid()).default([]),
  plan: PlanSchema.optional(),
  createdAt: z.date()
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
