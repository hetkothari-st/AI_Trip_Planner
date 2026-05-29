import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env, hasAnthropic } from "@/lib/env";

/**
 * A minimal structured-generation interface. Implementations must return data that
 * conforms to the supplied zod schema (the caller validates). We keep it tiny so the
 * mock and the real provider stay in lockstep.
 */
export interface LLMProvider {
  readonly name: string;
  /** Generate a JSON object conforming to `schema`. `mock` is the fallback shape. */
  generate<T>(args: {
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    /** JSON-schema description of the tool the model must call. */
    jsonSchema: Record<string, unknown>;
    /** Deterministic fallback used by the mock provider / on parse failure. */
    mock: () => T;
  }): Promise<T>;
}

const MODEL = "claude-sonnet-4-6";

class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client = new Anthropic({ apiKey: env.anthropicKey });

  async generate<T>(args: {
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    jsonSchema: Record<string, unknown>;
    mock: () => T;
  }): Promise<T> {
    try {
      const res = await this.client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        // Cache the (stable) system prompt to cut cost/latency across calls.
        // Cast: cache_control is supported at runtime but not in this SDK's block types.
        system: [
          { type: "text", text: args.system, cache_control: { type: "ephemeral" } },
        ] as unknown as Anthropic.Messages.MessageCreateParams["system"],
        tools: [
          {
            name: "respond",
            description: "Return the structured result.",
            input_schema: args.jsonSchema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "respond" },
        messages: [{ role: "user", content: args.prompt }],
      });

      const toolUse = res.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("no tool_use block");
      return args.schema.parse(toolUse.input);
    } catch (err) {
      console.error(`[ai] anthropic generate failed, using mock:`, err);
      return args.mock();
    }
  }
}

class MockProvider implements LLMProvider {
  readonly name = "mock";
  async generate<T>(args: { mock: () => T }): Promise<T> {
    return args.mock();
  }
}

let cached: LLMProvider | null = null;

/** Returns the Anthropic provider when a key is set, otherwise the deterministic mock. */
export function getLLM(): LLMProvider {
  if (cached) return cached;
  cached = hasAnthropic() ? new AnthropicProvider() : new MockProvider();
  return cached;
}
