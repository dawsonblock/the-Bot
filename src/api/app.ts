import { ZodError } from "zod";
import Fastify from "fastify";
import { LLMProviderError } from "../llm/llm-errors.js";
import { LLMRouter } from "../llm/llm-router.js";
import { PlannerService } from "../planner/planner.service.js";
import { EventAppendService } from "../core/event_append_service.js";
import { EventRepository, TraceRepository } from "../db/index.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerTraceRoutes } from "./routes/traces.js";

export async function buildApp(
  dependencies?: {
    traces?: TraceRepository;
    events?: EventRepository;
    eventAppend?: EventAppendService;
    llm?: LLMRouter;
    planner?: PlannerService;
  }
) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "Invalid request", details: error.flatten() });
    }

    if (error instanceof LLMProviderError) {
      return reply.code(502).send({
        error: "LLM provider unavailable",
        provider: error.provider,
        details: error.message
      });
    }

    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });

  const traces = dependencies?.traces ?? new TraceRepository();
  const events = dependencies?.events ?? new EventRepository();
  const eventAppend = dependencies?.eventAppend ?? new EventAppendService();
  const llm = dependencies?.llm ?? new LLMRouter();
  const planner = dependencies?.planner ?? new PlannerService(traces, events, llm, eventAppend);

  await registerHealthRoute(app);
  await registerTraceRoutes(app, traces, events);
  await registerEventRoutes(app, events);
  await registerChatRoutes(app, { traces, events, eventAppend, planner, llm });

  return app;
}
