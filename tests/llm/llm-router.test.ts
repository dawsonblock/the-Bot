import { describe, expect, it } from "vitest";
import { LLMRouter } from "../../src/llm/llm-router.js";
import { LLMProviderError } from "../../src/llm/llm-errors.js";

describe("LLMRouter", () => {
  it("selects configured provider", () => {
    const router = new LLMRouter({ provider: "ollama", env: { OLLAMA_BASE_URL: "http://localhost:11434" } });

    expect(router.providerName).toBe("ollama");
    expect(router.provider.name).toBe("ollama");
  });

  it("missing API key fails cleanly", async () => {
    const router = new LLMRouter({ provider: "gemini", env: { LLM_PROVIDER: "gemini" } });

    await expect(router.generateText({ system: "system", prompt: "prompt" })).rejects.toMatchObject({
      name: "LLMProviderError",
      message: "Gemini API key is not configured"
    });
  });

  it("provider errors create failure result", async () => {
    const router = new LLMRouter({ provider: "gemini", env: { LLM_PROVIDER: "gemini" } });

    await expect(router.generateJSON({ system: "system", prompt: "prompt", schemaName: "Plan" })).rejects.toBeInstanceOf(LLMProviderError);
  });
});
