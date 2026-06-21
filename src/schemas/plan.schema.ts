import { z } from "zod";

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export const ActionTypeSchema = z.enum(["inspect", "ask_user", "plan", "verify", "manual"]);

export const PlanStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  description: z.string().min(1),
  actionType: ActionTypeSchema,
  expectedResult: z.string().min(1),
  riskLevel: RiskLevelSchema,
  requiresApproval: z.boolean()
});

export const PlanSchema = z.object({
  goal: z.string().min(1),
  summary: z.string().min(1),
  steps: z.array(PlanStepSchema).min(1),
  assumptions: z.array(z.string()),
  risks: z.array(z.string())
});

export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;
