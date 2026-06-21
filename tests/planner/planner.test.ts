import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PlannerService } from "../../src/planner/planner.service.js";
import { EventAppendService } from "../../src/core/event_append_service.js";
import type { EventRead } from "../../src/models/event.model.js";
import type { TraceRead } from "../../src/models/trace.model.js";
import type { LLMRouter } from "../../src/llm/llm-router.js";
import type { Plan } from "../../src/schemas/plan.schema.js";

const trace: TraceRead = {
  traceId: randomUUID(),
  goal: "Build AEON planner",
  status: "running",
  outcome: null,
  startTime: new Date("2026-06-21T00:00:00.000Z"),
  endTime: null,
  metrics: {},
  createdAt: new Date("2026-06-21T00:00:00.000Z")
};

const validPlan: Plan = {
  goal: trace.goal,
  summary: "Inspect, plan, verify, and ask for approval where needed.",
  steps: [
    {
      stepNumber: 1,
      description: "Inspect current project structure",
      actionType: "inspect",
      expectedResult: "Project files and current state are understood.",
      riskLevel: "low",
      requiresApproval: false
    },
    {
      stepNumber: 2,
      description: "Ask user to confirm risky assumptions",
      actionType: "ask_user",
      expectedResult: "User confirms or corrects assumptions.",
      riskLevel: "low",
      requiresApproval: true
    },
    {
      stepNumber: 3,
      description: "Verify implementation with tests",
      actionType: "verify",
      expectedResult: "Tests pass and plan is trusted.",
      riskLevel: "low",
      requiresApproval: false
    }
  ],
  assumptions: ["No autonomous execution is allowed in this milestone."],
  risks: ["LLM may return an invalid plan schema."]
};

function createPlanner(llm: Partial<LLMRouter>, events: EventRead[] = []) {
  const traces = {
    getTrace: vi.fn().mockResolvedValue(trace)
  };

  const eventRepository = {
    getEventsForTrace: vi.fn().mockResolvedValue(events),
    appendEvent: vi.fn().mockImplementation(async (event: Omit<EventRead, "eventId" | "timestamp" | "created_at">) => ({
      ...event,
      eventId: randomUUID(),
      timestamp: new Date(),
      createdAt: new Date()
    }))
  };

  const planner = new PlannerService(
    traces as any,
    eventRepository as any,
    llm as LLMRouter,
    {} as EventAppendService
  );

  return { planner, traces, eventRepository };
}

describe("PlannerService", () => {
  it("creates a valid plan and writes plan events", async () => {
    const { planner, eventRepository } = createPlanner({
      generateJSON: vi.fn().mockResolvedValue(validPlan)
    });

    const plan = await planner.createPlanForTrace(trace.traceId);

    expect(plan.summary).toBe(validPlan.summary);
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "llm_call_requested" }));
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "llm_call_completed" }));
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "plan_created" }));
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "outcome_prediction_created" }));
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "plan_step_created" }));
  });

  it("rejects invalid LLM JSON", async () => {
    const { planner, eventRepository } = createPlanner({
      generateJSON: vi.fn().mockRejectedValue(new SyntaxError("invalid json"))
    });

    await expect(planner.createPlanForTrace(trace.traceId)).rejects.toThrow("invalid json");
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "planner_failed" }));
  });

  it("normalizes plan step order and renumbers safely", async () => {
    const shuffledPlan = {
      ...validPlan,
      steps: [
        { ...validPlan.steps[1], stepNumber: 3 },
        { ...validPlan.steps[0], stepNumber: 1 },
        { ...validPlan.steps[2], stepNumber: 2 }
      ]
    };

    const { planner } = createPlanner({
      generateJSON: vi.fn().mockResolvedValue(shuffledPlan)
    });

    const plan = await planner.createPlanForTrace(trace.traceId);

    expect(plan.steps.map((step) => [step.stepNumber, step.description])).toEqual([
      [1, validPlan.steps[0].description],
      [2, validPlan.steps[2].description],
      [3, validPlan.steps[1].description]
    ]);
  });

  it("rejects unsafe action types", async () => {
    const unsafePlan = {
      ...validPlan,
      steps: [
        {
          ...validPlan.steps[0],
          actionType: "shell"
        }
      ]
    };

    const { planner, eventRepository } = createPlanner({
      generateJSON: vi.fn().mockResolvedValue(unsafePlan)
    });

    await expect(planner.createPlanForTrace(trace.traceId)).rejects.toThrow();
    expect(eventRepository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "planner_failed" }));
  });
});
