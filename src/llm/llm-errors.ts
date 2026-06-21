export class LLMProviderError extends Error {
  constructor(message: string, readonly provider?: string, readonly cause?: unknown) {
    super(message);
    this.name = "LLMProviderError";
  }
}
