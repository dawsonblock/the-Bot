import type { PlanStep, RiskLevel } from "../schemas/plan.schema.js";

export interface OutcomePrediction {
  predictedResult: string;
  riskLevel: RiskLevel;
  confidence: number;
  similarPastEvents: string[];
}

export class OutcomePredictorService {
  predict(step: PlanStep, traceHistory: Array<{ eventType: string; payload: Record<string, unknown> }>): OutcomePrediction {
    const riskLevel = this.riskForAction(step.actionType);
    const confidence = riskLevel === "high" ? 0.35 : riskLevel === "medium" ? 0.65 : 0.85;

    return {
      predictedResult: step.expectedResult,
      riskLevel,
      confidence,
      similarPastEvents: traceHistory
        .filter((event) => event.eventType === "verifier_result" || event.eventType === "planner_failed")
        .slice(-3)
        .map((event) => event.eventType)
    };
  }

  private riskForAction(actionType: string): RiskLevel {
    switch (actionType) {
      case "ask_user":
      case "inspect":
      case "verify":
        return "low";
      case "manual":
        return "medium";
      default:
        return "high";
    }
  }
}
