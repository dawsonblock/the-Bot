import { FastifyInstance } from "fastify";
import { EventRepository } from "../../db/index.js";

export async function registerEventRoutes(app: FastifyInstance, events: EventRepository) {
  app.get("/events/:eventId", async (request, reply) => {
    const eventId = String((request.params as Record<string, unknown>).eventId ?? "");
    const event = await events.getEvent(eventId);
    if (!event) {
      return reply.code(404).send({ error: "Event not found" });
    }
    return event;
  });
}
