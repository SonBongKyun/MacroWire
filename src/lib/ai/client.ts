import Anthropic from "@anthropic-ai/sdk";
import type { Tier } from "@prisma/client";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && process.env.NODE_ENV === "production") {
  console.warn("[ai] ANTHROPIC_API_KEY not set — AI endpoints will 500");
}

export const anthropic = new Anthropic({ apiKey: apiKey ?? "sk-ant-placeholder" });

/**
 * Pick the model based on the caller's subscription tier.
 * ELITE → Opus (deepest synthesis), PRO → Sonnet, FREE → Haiku
 * Set via env so model upgrades don't require a redeploy.
 */
export function modelForTier(tier: Tier): string {
  if (tier === "ELITE") return process.env.ANTHROPIC_MODEL_ELITE ?? "claude-opus-4-1";
  if (tier === "PRO") return process.env.ANTHROPIC_MODEL_PRO ?? "claude-sonnet-4-5";
  return process.env.ANTHROPIC_MODEL_FREE ?? "claude-haiku-4-5";
}
