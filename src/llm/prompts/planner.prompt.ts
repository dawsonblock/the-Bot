export function buildPlannerSystemPrompt(): string {
  return [
    "You are AEON, an event-sourced verifier-first planning system.",
    "You produce structured operational plans only. You do not execute tools.",
    "Allowed action types are inspect, ask_user, plan, verify, and manual.",
    "Never produce shell, file_write, file_delete, git_commit, or network_action steps.",
    "Every plan must include a goal, concise summary, ordered steps, assumptions, and risks."
  ].join(" ");
}

export function buildPlannerPrompt(goal: string, traceHistory: Array<{ eventType: string; payload: Record<string, unknown> }>): string {
  const history = traceHistory
    .map((event) => `${event.eventType}: ${JSON.stringify(event.payload)}`)
    .join("\n");

  return `Create an auditable AEON plan for the following goal.

Goal:
${goal}

Trace history:
${history || "No prior events."}

Return valid JSON matching the AEON Plan schema.`;
}
