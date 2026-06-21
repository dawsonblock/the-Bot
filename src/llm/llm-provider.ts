export interface LLMProvider {
  name: string;
  generateJSON<T>(input: {
    system: string;
    prompt: string;
    schemaName: string;
  }): Promise<T>;
  generateText(input: {
    system: string;
    prompt: string;
  }): Promise<string>;
}
