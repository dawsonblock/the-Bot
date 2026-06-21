import { LLMProvider } from "../llm-provider.js";
import { LLMProviderError } from "../llm-errors.js";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  constructor(private readonly baseUrl = "http://localhost:11434", private readonly defaultModel?: string) {}

  async generateJSON<T>(input: { system: string; prompt: string; schemaName: string }): Promise<T> {
    const text = await this.generateText(input);
    return JSON.parse(text) as T;
  }

  async generateText(input: { system: string; prompt: string }): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.defaultModel ?? "llama3.1",
        stream: false,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new LLMProviderError(`Ollama API request failed: ${response.status}`, this.name);
    }

    const body = await response.json() as { message?: { content?: string } };
    return body.message?.content ?? "";
  }
}
