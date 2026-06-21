import { LLMProvider } from "./llm-provider.js";
import { LLMProviderError } from "./llm-errors.js";
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

    this.providerName = providerName;
    this.provider = this.createProvider(providerName, env, defaultModel);
  }

  async generateJSON<T>(input: { system: string; prompt: string; schemaName: string }): Promise<T> {
    return this.provider.generateJSON(input);
  }

  async generateText(input: { system: string; prompt: string }): Promise<string> {
    return this.provider.generateText(input);
  }

  private createProvider(providerName: ProviderName, env: NodeJS.ProcessEnv, defaultModel?: string): LLMProvider {
    switch (providerName) {
      case "gemini":
        return new GeminiProvider(env.GEMINI_API_KEY, defaultModel);
      case "openrouter":
        return new OpenRouterProvider(env.OPENROUTER_API_KEY, defaultModel);
      case "groq":
        return new GroqProvider(env.GROQ_API_KEY, defaultModel);
      case "ollama":
        return new OllamaProvider(env.OLLAMA_BASE_URL, defaultModel);
      default:
        throw new LLMProviderError(`Unsupported LLM provider: ${providerName}`);
    }
  }
}
