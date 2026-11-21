import "server-only";

import { AiUnavailableError } from "./errors";
import type { AiProvider } from "./provider";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
const TIMEOUT_MS = 180_000; // a 7B model on a laptop can take a minute or two

export const ollamaProvider: AiProvider = {
  id: `ollama:${OLLAMA_MODEL}`,

  async generateJson({ system, prompt, schema }) {
    let res: Response;
    try {
      res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          keep_alive: "30m",
          format: schema, // structured output: the reply must match this JSON schema
          options: { temperature: 0.4, num_ctx: 8192 },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      throw new AiUnavailableError(
        timedOut
          ? "The AI model took too long to answer. Try again in a moment."
          : `Could not reach Ollama at ${OLLAMA_URL}. Make sure it is running (ollama serve).`,
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AiUnavailableError(
        res.status === 404
          ? `The model "${OLLAMA_MODEL}" is not installed. Run: ollama pull ${OLLAMA_MODEL}`
          : `Ollama returned an error (${res.status}). ${detail.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    try {
      return JSON.parse(data.message?.content ?? "");
    } catch {
      throw new AiUnavailableError("The AI model returned an unreadable answer. Try again.");
    }
  },
};
