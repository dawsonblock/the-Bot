import { LLMProvider } from "../llm-provider.js";
import { LLMProviderError } from "../llm-errors.js";
import { DEFAULT_PROVIDER_TIMEOUT_MS, fetchWithTimeout } from "../fetch-with-timeout.js";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey?: string,
    private readonly defaultModel?: string,
    private readonly timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS
  ) {}

  async generateJSON<T>(input: { system: string; prompt: string; schemaName: string }): Promise<T> {
    this.requireApiKey();
    const text = await this.generateText(input);
    return JSON.parse(text) as T;
  }

  async generateText(input: { system: string; prompt: string }): Promise<string> {
    this.requireApiKey();

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel ?? "gemini-2.0-flash"}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey ?? ""
        },
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
      },
      this.timeoutMs
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
