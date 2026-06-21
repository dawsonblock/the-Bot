import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerEventRoutes } from "../../src/api/routes/events.js";
import { registerTraceRoutes } from "../../src/api/routes/traces.js";
import type { EventRepository, TraceRepository } from "../../src/db/index.js";

function createTrace() {
  return {
    traceId: randomUUID(),
    goal: "Build AEON planner",
    status: "running",
    outcome: null,
    startTime: new Date(),
    endTime: null,
    metrics: {},
    createdAt: new Date()
  };
}

function createEvent(traceId: string) {
  return {
    eventId: randomUUID(),
    traceId,
    parentEventId: null,
    actor: "system",
    eventType: "trace_created",
    payload: {},
    timestamp: new Date(),
    createdAt: new Date()
  };
}

describe("trace and event routes", () => {
  it("returns trace events by trace id", async () => {
    const trace = createTrace();
    const event = createEvent(trace.traceId);
    const traces = {
      getTrace: vi.fn().mockResolvedValue(trace),
      listTraces: vi.fn().mockResolvedValue([]),
      completeTrace: vi.fn().mockResolvedValue(null)
    };
    const events = {
      getEventsForTrace: vi.fn().mockResolvedValue([event]),
      getEvent: vi.fn().mockResolvedValue(null),
      appendEvent: vi.fn().mockResolvedValue(event)
    };

    const app = Fastify({ logger: false });
    await registerTraceRoutes(app, traces as unknown as TraceRepository, events as unknown as EventRepository);

    const response = await app.inject({
      method: "GET",
      url: `/traces/${trace.traceId}/events`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        ...event,
        timestamp: event.timestamp.toISOString(),
        createdAt: event.createdAt.toISOString()
      }
    ]);
    expect(events.getEventsForTrace).toHaveBeenCalledWith(trace.traceId);
  });

  it("returns a single event by event id", async () => {
    const event = createEvent(randomUUID());
    const events = {
      getEvent: vi.fn().mockResolvedValue(event),
      getEventsForTrace: vi.fn().mockResolvedValue([]),
      appendEvent: vi.fn().mockResolvedValue(event)
    };

    const app = Fastify({ logger: false });
    await registerEventRoutes(app, events as unknown as EventRepository);

    const response = await app.inject({
      method: "GET",
      url: `/events/${event.eventId}`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ...event,
      timestamp: event.timestamp.toISOString(),
      createdAt: event.createdAt.toISOString()
    });
  });

  it("returns 404 for unknown trace", async () => {
    const traceId = randomUUID();
    const traces = {
      getTrace: vi.fn().mockResolvedValue(null),
      listTraces: vi.fn().mockResolvedValue([]),
      completeTrace: vi.fn().mockResolvedValue(null)
    };

    const app = Fastify({ logger: false });
    await registerTraceRoutes(app, traces as unknown as TraceRepository);

    const response = await app.inject({
      method: "GET",
      url: `/traces/${traceId}/events`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Trace not found" });
  });

  it("returns 404 for unknown event", async () => {
    const eventId = randomUUID();
    const events = {
      getEvent: vi.fn().mockResolvedValue(null),
      getEventsForTrace: vi.fn().mockResolvedValue([]),
      appendEvent: vi.fn().mockResolvedValue(createEvent(randomUUID()))
    };

    const app = Fastify({ logger: false });
    await registerEventRoutes(app, events as unknown as EventRepository);

    const response = await app.inject({
      method: "GET",
      url: `/events/${eventId}`
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Event not found" });
  });
});
