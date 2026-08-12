import { OpenRouter } from "@openrouter/sdk";
import type { Tier } from "@prisma/client";

const DEFAULT_MODELS: Record<Tier, string> = {
  FREE: "anthropic/claude-haiku-4.5",
  PRO: "anthropic/claude-sonnet-4.5",
  ELITE: "anthropic/claude-opus-4.1",
};

const REQUEST_TIMEOUT_MS = 30_000;
let client: OpenRouter | null = null;
let clientKey: string | null = null;

export function isAiConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.OPENROUTER_API_KEY?.trim());
}

function getOpenRouterClient(): OpenRouter {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  if (!client || clientKey !== apiKey) {
    client = new OpenRouter({
      apiKey,
      httpReferer: process.env.NEXT_PUBLIC_SITE_URL || "https://macro-wire-psi.vercel.app",
      appTitle: "MacroWire",
      timeoutMs: REQUEST_TIMEOUT_MS,
      retryConfig: {
        strategy: "backoff",
        backoff: {
          initialInterval: 500,
          maxInterval: 4_000,
          exponent: 2,
          maxElapsedTime: 8_000,
        },
        retryConnectionErrors: true,
      },
    });
    clientKey = apiKey;
  }
  return client;
}

/**
 * OpenRouter model slugs are configurable per subscription tier. The defaults
 * preserve the previous quality/cost tiering, while deployers can select any model
 * in OpenRouter's catalogue without changing application code.
 */
export function modelForTier(
  tier: Tier,
  env: Record<string, string | undefined> = process.env,
): string {
  if (tier === "ELITE") return env.OPENROUTER_MODEL_ELITE?.trim() || DEFAULT_MODELS.ELITE;
  if (tier === "PRO") return env.OPENROUTER_MODEL_PRO?.trim() || DEFAULT_MODELS.PRO;
  return env.OPENROUTER_MODEL_FREE?.trim() || DEFAULT_MODELS.FREE;
}

export function modelCacheIdentity(
  tier: Tier,
  env: Record<string, string | undefined> = process.env,
): string {
  return `openrouter:${modelForTier(tier, env)}`;
}

export function extractOpenRouterText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const candidate = item as { type?: unknown; text?: unknown };
      return candidate.type === "text" && typeof candidate.text === "string"
        ? candidate.text
        : "";
    })
    .join("")
    .trim();
}

function statusCodeFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export function openRouterErrorCode(error: unknown): string {
  const status = statusCodeFromError(error);
  const name = error instanceof Error ? error.name : "";
  if (status === 401 || status === 403) return "AI_AUTH_FAILED";
  if (status === 402) return "AI_CREDITS_EXHAUSTED";
  if (status === 408 || status === 524 || name === "RequestTimeoutError") return "AI_TIMEOUT";
  if (status === 429) return "AI_RATE_LIMITED";
  if (
    status === 502
    || status === 503
    || status === 529
    || name === "ConnectionError"
  ) return "AI_PROVIDER_UNAVAILABLE";
  return "AI_REQUEST_FAILED";
}

export async function requestModelText(options: {
  tier: Tier;
  system: string;
  prompt: string;
  maxTokens: number;
}): Promise<string> {
  if (!isAiConfigured()) throw new Error("AI_NOT_CONFIGURED");
  const model = modelForTier(options.tier);

  try {
    const response = await getOpenRouterClient().chat.send({
      chatRequest: {
        model,
        maxTokens: options.maxTokens,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.prompt },
        ],
        temperature: 0.1,
        stream: false,
      },
    }, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      retryCodes: ["429", "502", "503", "529"],
    });

    if (!("choices" in response)) throw new Error("AI_BAD_RESPONSE");
    const text = extractOpenRouterText(response.choices[0]?.message.content);
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AI_")) throw error;
    const code = openRouterErrorCode(error);
    console.error(`[ai/openrouter] ${code}; model=${model}`);
    throw new Error(code);
  }
}

if (!isAiConfigured() && process.env.NODE_ENV === "production") {
  console.warn("[ai] OPENROUTER_API_KEY not set — optional AI endpoints are disabled");
}
