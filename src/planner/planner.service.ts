import { EventRepository, TraceRepository } from "../db/index.js";
import { LLMProviderError } from "../llm/llm-errors.js";
import { LLMRouter } from "../llm/llm-router.js";
import { buildPlannerPrompt, buildPlannerSystemPrompt } from "../llm/prompts/planner.prompt.js";
import { PlanSchema, type Plan } from "../schemas/plan.schema.js";
import { OutcomePredictorService } from "./outcome-predictor.service.js";

export class PlannerService {
  constructor(
    private readonly traces: TraceRepository,
    private readonly events: EventRepository,
    private readonly llm: LLMRouter,
    private readonly outcomePredictor = new OutcomePredictorService()
  ) {}

  async createPlanForTrace(traceId: string): Promise<Plan> {
    const trace = await this.traces.getTrace(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const history = await this.events.getEventsForTrace(traceId);
    const system = buildPlannerSystemPrompt();
    const prompt = buildPlannerPrompt(trace.goal, history);

    try {
      await this.events.appendEvent({
        traceId,
        actor: "planner",
        eventType: "llm_call_requested",
        payload: { schemaName: "Plan" }
      });

      const rawPlan = await this.llm.generateJSON<unknown>({
        system,
        prompt,
        schemaName: "Plan"
      });

      await this.events.appendEvent({
        traceId,
        actor: "planner",
        eventType: "llm_call_completed",
        payload: { schemaName: "Plan" }
      });

      const plan = PlanSchema.parse(rawPlan);
      const normalizedPlan = this.normalizePlan(trace.goal, plan);

      await this.events.appendEvent({
        traceId,
        actor: "planner",
        eventType: "plan_created",
        payload: { plan: normalizedPlan }
      });

      for (const step of normalizedPlan.steps) {
        const prediction = this.outcomePredictor.predict(step, history);
        await this.events.appendEvent({
          traceId,
          actor: "planner",
          eventType: "outcome_prediction_created",
          payload: { stepNumber: step.stepNumber, prediction }
        });

        await this.events.appendEvent({
          traceId,
          actor: "planner",
          eventType: "plan_step_created",
          payload: { step }
        });
      }

      return normalizedPlan;
    } catch (error) {
      await this.events.appendEvent({
        traceId,
        actor: "planner",
        eventType: error instanceof LLMProviderError ? "llm_call_failed" : "planner_failed",
        payload: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  private normalizePlan(goal: string, plan: Plan): Plan {
    const steps = plan.steps
      .map((step, index) => ({
        ...step,
        stepNumber: index + 1
      }))
      .sort((a, b) => a.stepNumber - b.stepNumber);

    return PlanSchema.parse({
      ...plan,
      goal,
      steps
    });
  }
}
