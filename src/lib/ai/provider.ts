import "server-only";

import { ollamaProvider } from "./ollama";

export type JsonSchema = Record<string, unknown>;

export interface AiProvider {
  /** Model identifier saved with each result, e.g. "ollama:qwen2.5:7b" */
  readonly id: string;
  /** Returns the model's answer parsed as JSON, shaped by `schema` (validate it anyway). */
  generateJson(opts: { system: string; prompt: string; schema: JsonSchema }): Promise<unknown>;
}

export { AiUnavailableError } from "./errors";

// Single place to switch providers later (e.g. a hosted API) without touching the features.
export function getAiProvider(): AiProvider {
  return ollamaProvider;
}
