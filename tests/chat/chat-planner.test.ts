import { randomUUID } from "node:crypto";
import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/api/app.js";
import type {
  EventAppendService,
  EventRepository,
  TraceRepository,
} from "../../src/db/index.js";
import type { PlannerService } from "../../src/planner/planner.service.js";
import type { LLMRouter } from "../../src/llm/llm-router.js";
import type { Plan } from "../../src/schemas/plan.schema.js";

const validPlan: Plan = {
  goal: "Build AEON planner",
  summary: "Inspect, plan, verify, and ask for approval where needed.",
  steps: [
    {
      stepNumber: 1,
      description: "Inspect current project structure",
      actionType: "inspect",
      expectedResult: "Project files and current state are understood.",
      riskLevel: "low",
      requiresApproval: false,
    },
  ],
  assumptions: ["No autonomous execution is allowed in this milestone."],
  risks: ["LLM may return an invalid plan schema."],
};

async function createApp() {
  const traces = {
    createTrace: vi
      .fn()
      .mockResolvedValue({
        traceId: randomUUID(),
        goal: "Build AEON planner",
        status: "running",
        outcome: null,
        startTime: new Date(),
        endTime: null,
        metrics: {},
        createdAt: new Date(),
      }),
    getTrace: vi
      .fn()
      .mockResolvedValue({
        traceId: randomUUID(),
        goal: "Build AEON planner",
        status: "running",
        outcome: null,
        startTime: new Date(),
        endTime: null,
        metrics: {},
        createdAt: new Date(),
      }),
    listTraces: vi.fn().mockResolvedValue([]),
    completeTrace: vi.fn().mockResolvedValue(null),
  };

  const events = {
    getEventsForTrace: vi.fn().mockResolvedValue([]),
    getEvent: vi.fn().mockResolvedValue(null),
  };

  const eventAppend = {
    append: vi.fn().mockImplementation(async (event) => ({
      ...event,
      eventId: randomUUID(),
      traceId: event.traceId,
      parentEventId: event.parentEventId ?? null,
      sequence: 1,
      schemaVersion: 1,
      payloadHash: "payload-hash",
      previousEventHash: null,
      eventHash: "event-hash",
      timestamp: new Date(),
      createdAt: new Date(),
    })),
  };

  const planner = {
    createPlanForTrace: vi.fn().mockResolvedValue(validPlan),
  };

  const llm = {
    providerName: "ollama",
    provider: { name: "ollama" },
    generateText: vi.fn(),
    generateJSON: vi.fn(),
  };

  const app = await buildApp({
    traces: traces as unknown as TraceRepository,
    events: events as unknown as EventRepository,
    eventAppend: eventAppend as unknown as EventAppendService,
    planner: planner as unknown as PlannerService,
    llm: llm as unknown as LLMRouter,
  });

  return { app, traces, events, eventAppend, planner, llm };
}

describe("chat planner flow", () => {
  it("new chat creates trace and triggers planner", async () => {
    const { app, planner } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "Build AEON planner" },
    });

    expect(response.statusCode).toBe(200);
    expect(planner.createPlanForTrace).toHaveBeenCalledOnce();
    expect(response.json()).toMatchObject({
      message: `Plan created: ${validPlan.summary}`,
    });
  });

  it("show plan retrieves stored plan without calling LLM again", async () => {
    const { app, planner, events } = await createApp();
    const traceId = randomUUID();

    events.getEventsForTrace.mockResolvedValueOnce([
      {
        eventId: randomUUID(),
        traceId,
        parentEventId: null,
        actor: "system",
        eventType: "plan_created",
        payload: { plan: validPlan },
        timestamp: new Date(),
        createdAt: new Date(),
      },
    ]);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { traceId, message: "show plan" },
    });

    expect(response.statusCode).toBe(200);
    expect(planner.createPlanForTrace).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      message: validPlan.summary,
      requiresApproval: false,
      plan: validPlan,
    });
  });

  it("show plan reports approval when latest plan requires it", async () => {
    const { app, events } = await createApp();
    const traceId = randomUUID();
    const planWithApproval: Plan = {
      ...validPlan,
      steps: [{ ...validPlan.steps[0], requiresApproval: true }],
    };

    events.getEventsForTrace.mockResolvedValueOnce([
      {
        eventId: randomUUID(),
        traceId,
        parentEventId: null,
        actor: "system",
        eventType: "plan_created",
        payload: { plan: planWithApproval },
        timestamp: new Date(),
        createdAt: new Date(),
      },
    ]);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { traceId, message: "show plan" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: planWithApproval.summary,
      requiresApproval: true,
    });
  });

  it("show plan returns an assistant event when no plan is stored", async () => {
    const { app, events } = await createApp();
    const traceId = randomUUID();

    events.getEventsForTrace.mockResolvedValueOnce([]);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { traceId, message: "show plan" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "No stored plan found for this trace.",
      relatedEventIds: [expect.any(String)],
    });
  });

  it("show trace returns an assistant event id", async () => {
    const { app, events } = await createApp();
    const traceId = randomUUID();
    const eventId = randomUUID();

    events.getEventsForTrace.mockResolvedValueOnce([
      {
        eventId,
        traceId,
        parentEventId: null,
        actor: "system",
        eventType: "trace_created",
        payload: {},
        timestamp: new Date(),
        createdAt: new Date(),
      },
    ]);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { traceId, message: "show trace" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "1 event(s) recorded.",
      relatedEventIds: [expect.any(String)],
    });
  });

  it("rejects invalid chat requests with 400", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects whitespace-only chat messages", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "   " },
    });

    expect(response.statusCode).toBe(400);
  });
});
