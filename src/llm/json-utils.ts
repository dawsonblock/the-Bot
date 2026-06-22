export class LLMOutputParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: unknown,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LLMOutputParseError";
  }
}

export function parseLLMJSON<T>(raw: unknown): T {
  if (typeof raw !== "string") {
    return raw as T;
  }

  const extracted = extractJson(raw);
  try {
    return JSON.parse(extracted) as T;
  } catch (error) {
    throw new LLMOutputParseError("Invalid JSON from LLM output", raw, error);
  }
}

export function extractJson(text: string): string {
  const trimmed = text.trim();

  if (looksLikeJson(trimmed)) {
    return trimmed;
  }

  const fenced = extractFencedJson(trimmed);
  if (fenced) {
    return fenced;
  }

  return trimmed;
}

function looksLikeJson(text: string): boolean {
  return text.startsWith("{") || text.startsWith("[");
}

function extractFencedJson(text: string): string | null {
  const jsonFence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(text);
  if (jsonFence?.[1]) {
    return jsonFence[1].trim();
  }

  const codeFence = /```\s*([\s\S]*?)```/.exec(text);
  if (codeFence?.[1]) {
    const candidate = codeFence[1].trim();
    return looksLikeJson(candidate) ? candidate : null;
  }

  return null;
}
