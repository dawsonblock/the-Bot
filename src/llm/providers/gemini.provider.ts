import { LLMProvider } from "../llm-provider.js";
import { LLMProviderError } from "../llm-errors.js";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  constructor(private readonly apiKey?: string, private readonly defaultModel?: string) {}

  async generateJSON<T>(input: { system: string; prompt: string; schemaName: string }): Promise<T> {
    this.requireApiKey();
    const text = await this.generateText(input);
    return JSON.parse(text) as T;
  }

  async generateText(input: { system: string; prompt: string }): Promise<string> {
    this.requireApiKey();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel ?? "gemini-2.0-flash"}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${input.system}\n\n${input.prompt}` }
              ]
            }
          ],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      throw new LLMProviderError(`Gemini API request failed: ${response.status}`, this.name);
    }

    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  private requireApiKey() {
    if (!this.apiKey) {
      throw new LLMProviderError("Gemini API key is not configured", this.name);
    }
  }
}
