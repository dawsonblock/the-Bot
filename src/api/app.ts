import Fastify from "fastify";
import { LLMRouter } from "../llm/llm-router.js";
import { PlannerService } from "../planner/planner.service.js";
import { EventRepository, TraceRepository, db } from "../db/index.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerTraceRoutes } from "./routes/traces.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  const traces = new TraceRepository();
  const events = new EventRepository();
  const llm = new LLMRouter();
  const planner = new PlannerService(traces, events, llm);

  await registerHealthRoute(app);
  await registerTraceRoutes(app, traces);
  await registerEventRoutes(app, events);
  await registerChatRoutes(app, { traces, events, planner, llm });

  return app;
}
