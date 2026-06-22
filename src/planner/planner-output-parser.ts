import { LLMProvider } from "./llm-provider.js";

export class PlannerOutputParser {
  parseJSON<T>(raw: unknown): T {
    if (typeof raw !== "string") {
      return raw as T;
    }

    const extracted = this.extractJson(raw);
    try {
      return JSON.parse(extracted) as T;
    } catch (error) {
      throw new PlannerOutputParseError(
        "Invalid JSON from LLM output",
        raw,
        error,
      );
    }
  }

  private extractJson(text: string): string {
    const trimmed = text.trim();

    if (this.looksLikeJson(trimmed)) {
      return trimmed;
    }

    const fenced = this.extractFencedJson(trimmed);
    if (fenced) {
      return fenced;
    }

    return trimmed;
  }

  private looksLikeJson(text: string): boolean {
    return text.startsWith("{") || text.startsWith("[");
  }

  private extractFencedJson(text: string): string | null {
    const jsonFence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(text);
    if (jsonFence?.[1]) {
      return jsonFence[1].trim();
    }

    const codeFence = /```\s*([\s\S]*?)```/.exec(text);
    if (codeFence?.[1]) {
      const candidate = codeFence[1].trim();
      return this.looksLikeJson(candidate) ? candidate : null;
    }

    return null;
  }
}

export class PlannerOutputParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: unknown,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PlannerOutputParseError";
  }
}

export function parsePlannerJSON<T>(raw: unknown): T {
  return new PlannerOutputParser().parseJSON<T>(raw);
}
