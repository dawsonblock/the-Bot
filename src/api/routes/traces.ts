import { FastifyInstance } from "fastify";
import { EventRepository, TraceRepository } from "../../db/index.js";

export async function registerTraceRoutes(
  app: FastifyInstance,
  traces: TraceRepository,
  events?: EventRepository
) {
  app.get("/traces", async () => traces.listTraces());

  app.get("/traces/:traceId", async (request, reply) => {
    const traceId = String((request.params as Record<string, unknown>).traceId ?? "");
    const trace = await traces.getTrace(traceId);
    if (!trace) {
      return reply.code(404).send({ error: "Trace not found" });
    }
    return trace;
  });

  app.get("/traces/:traceId/events", async (request, reply) => {
    const traceId = String((request.params as Record<string, unknown>).traceId ?? "");
    const trace = await traces.getTrace(traceId);
    if (!trace) {
      return reply.code(404).send({ error: "Trace not found" });
    }

    if (!events) {
      return reply.code(500).send({ error: "Event repository is not registered" });
    }

    return events.getEventsForTrace(traceId);
  });
}
