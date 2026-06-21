import { LLMProvider } from "../llm-provider.js";
import { LLMProviderError } from "../llm-errors.js";
import { DEFAULT_PROVIDER_TIMEOUT_MS, fetchWithTimeout } from "../fetch-with-timeout.js";

export class GroqProvider implements LLMProvider {
  readonly name = "groq";

  constructor(
    private readonly apiKey?: string,
    private readonly defaultModel?: string,
    private readonly timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS
  ) {}

  async generateJSON<T>(input: { system: string; prompt: string; schemaName: string }): Promise<T> {
    const text = await this.generateText(input);
    return JSON.parse(text) as T;
  }

  async generateText(input: { system: string; prompt: string }): Promise<string> {
    this.requireApiKey();

    const response = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel ?? "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.prompt }
          ],
          response_format: { type: "json_object" }
        })
      },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new LLMProviderError(`Groq API request failed: ${response.status}`, this.name);
    }

    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return body.choices?.[0]?.message?.content ?? "";
  }

  private requireApiKey() {
    if (!this.apiKey) {
      throw new LLMProviderError("Groq API key is not configured", this.name);
    }
  }
}
