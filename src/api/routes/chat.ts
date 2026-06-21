import { FastifyInstance } from "fastify";
import { EventRepository, TraceRepository } from "../../db/index.js";
import { EventAppendService } from "../../core/event_append_service.js";
import { LLMRouter } from "../../llm/llm-router.js";
import { ChatRequestSchema, ChatResponseSchema } from "../../models/chat.model.js";
import { PlannerService } from "../../planner/planner.service.js";
import { PlanSchema } from "../../schemas/plan.schema.js";

export async function registerChatRoutes(
  app: FastifyInstance,
  dependencies: {
    traces: TraceRepository;
    events: EventRepository;
    eventAppend: EventAppendService;
    planner: PlannerService;
    llm: LLMRouter;
  }
) {
  app.post("/chat", async (request, reply) => {
    const parsed = ChatRequestSchema.parse(request.body);
    const traceId = parsed.traceId;
    const message = parsed.message.trim();
    const normalizedCommand = message.toLowerCase();

    if (traceId && await dependencies.traces.getTrace(traceId) === null) {
      return reply.code(404).send({ error: "Trace not found" });
    }

    const createdTraceId = traceId ?? (await dependencies.traces.createTrace(message)).traceId;

    if (!traceId) {
      await dependencies.eventAppend.append({
        traceId: createdTraceId,
        actor: "system",
        eventType: "trace_created",
        payload: { goal: message }
      });
    }

    await dependencies.eventAppend.append({
      traceId: createdTraceId,
      actor: "user",
      eventType: "user_message",
      payload: { message, metadata: parsed.metadata }
    });

    if (normalizedCommand === "show plan") {
      const events = await dependencies.events.getEventsForTrace(createdTraceId);
      const planEvents = events.filter((event) => event.eventType === "plan_created");
      const latestPlanEvent = planEvents.at(-1);
      const latestPlanPayload = latestPlanEvent?.payload.plan;

      if (!latestPlanPayload) {
        const assistantEvent = await dependencies.eventAppend.append({
          traceId: createdTraceId,
          actor: "assistant",
          eventType: "assistant_message",
          payload: { message: "No stored plan found for this trace." }
        });

        return ChatResponseSchema.parse({
          traceId: createdTraceId,
          message: "No stored plan found for this trace.",
          requiresApproval: false,
          relatedEventIds: [assistantEvent.eventId],
          createdAt: new Date()
        });
      }

      const latestPlan = PlanSchema.parse(latestPlanPayload);
      const requiresApproval = latestPlan.steps.some((step) => step.requiresApproval);
      const message = latestPlan.summary;
      const assistantEvent = await dependencies.eventAppend.append({
        traceId: createdTraceId,
        actor: "assistant",
        eventType: "assistant_message",
        payload: { message, plan: latestPlan }
      });

      return ChatResponseSchema.parse({
        traceId: createdTraceId,
        message,
        requiresApproval,
        relatedEventIds: [latestPlanEvent!.eventId, assistantEvent.eventId],
        plan: latestPlan,
        createdAt: new Date()
      });
    }

    if (normalizedCommand === "show trace" || normalizedCommand === "show events") {
      const events = await dependencies.events.getEventsForTrace(createdTraceId);
      const message = `${events.length} event(s) recorded.`;
      const assistantEvent = await dependencies.eventAppend.append({
        traceId: createdTraceId,
        actor: "assistant",
        eventType: "assistant_message",
        payload: { message }
      });

      return ChatResponseSchema.parse({
        traceId: createdTraceId,
        message,
        requiresApproval: false,
        relatedEventIds: [assistantEvent.eventId],
        createdAt: new Date()
      });
    }

    if (!traceId) {
      const plan = await dependencies.planner.createPlanForTrace(createdTraceId);
      const assistantMessage = `Plan created: ${plan.summary}`;
      const assistantEvent = await dependencies.eventAppend.append({
        traceId: createdTraceId,
        actor: "assistant",
        eventType: "assistant_message",
        payload: { message: assistantMessage, plan }
      });

      return ChatResponseSchema.parse({
        traceId: createdTraceId,
        message: assistantMessage,
        requiresApproval: false,
        relatedEventIds: [assistantEvent.eventId],
        plan,
        createdAt: new Date()
      });
    }

    const assistantEvent = await dependencies.eventAppend.append({
      traceId: createdTraceId,
      actor: "assistant",
      eventType: "assistant_message",
      payload: { message: "Message recorded." }
    });

    return ChatResponseSchema.parse({
      traceId: createdTraceId,
      message: "Message recorded.",
      requiresApproval: false,
      relatedEventIds: [assistantEvent.eventId],
      createdAt: new Date()
    });
  });
}
