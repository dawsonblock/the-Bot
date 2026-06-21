import { LLMProvider } from "./llm-provider.js";
import { LLMProviderError } from "./llm-errors.js";
import { parseProviderTimeout } from "./fetch-with-timeout.js";
import { GeminiProvider } from "./providers/gemini.provider.js";
import { OpenRouterProvider } from "./providers/openrouter.provider.js";
import { GroqProvider } from "./providers/groq.provider.js";
import { OllamaProvider } from "./providers/ollama.provider.js";

export type ProviderName = "gemini" | "openrouter" | "groq" | "ollama";

export interface LLMRouterOptions {
  provider?: ProviderName;
  defaultModel?: string;
  env?: NodeJS.ProcessEnv;
}

export class LLMRouter {
  readonly provider: LLMProvider;
  readonly providerName: ProviderName;

  constructor(options: LLMRouterOptions = {}) {
    const env = options.env ?? process.env;
    const providerName = (options.provider ?? env.LLM_PROVIDER ?? "ollama") as ProviderName;
    const defaultModel = options.defaultModel ?? env.DEFAULT_MODEL;
    const timeoutMs = parseProviderTimeout(env.LLM_PROVIDER_TIMEOUT_MS);

    this.providerName = providerName;
    this.provider = this.createProvider(providerName, env, defaultModel, timeoutMs);
  }

  async generateJSON<T>(input: { system: string; prompt: string; schemaName: string }): Promise<T> {
    return this.provider.generateJSON(input);
  }

  async generateText(input: { system: string; prompt: string }): Promise<string> {
    return this.provider.generateText(input);
  }

  private createProvider(providerName: ProviderName, env: NodeJS.ProcessEnv, defaultModel?: string, timeoutMs?: number): LLMProvider {
    switch (providerName) {
      case "gemini":
        return new GeminiProvider(env.GEMINI_API_KEY, defaultModel, timeoutMs);
      case "openrouter":
        return new OpenRouterProvider(env.OPENROUTER_API_KEY, defaultModel, timeoutMs);
      case "groq":
        return new GroqProvider(env.GROQ_API_KEY, defaultModel, timeoutMs);
      case "ollama":
        return new OllamaProvider(env.OLLAMA_BASE_URL, defaultModel, timeoutMs);
      default:
        throw new LLMProviderError(`Unsupported LLM provider: ${providerName}`);
    }
  }
}
