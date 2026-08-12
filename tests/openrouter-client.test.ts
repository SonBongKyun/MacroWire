import assert from "node:assert/strict";
import test from "node:test";
import {
  extractOpenRouterText,
  isAiConfigured,
  modelCacheIdentity,
  modelForTier,
  openRouterErrorCode,
} from "../src/lib/ai/client";

test("enables AI only when an OpenRouter key is present", () => {
  assert.equal(isAiConfigured({}), false);
  assert.equal(isAiConfigured({ OPENROUTER_API_KEY: "   " }), false);
  assert.equal(isAiConfigured({ OPENROUTER_API_KEY: "sk-or-v1-test" }), true);
  assert.equal(isAiConfigured({ ANTHROPIC_API_KEY: "sk-ant-ignored" }), false);
});

test("selects OpenRouter model slugs by tier and allows deployment overrides", () => {
  assert.equal(modelForTier("FREE", {}), "anthropic/claude-haiku-4.5");
  assert.equal(modelForTier("PRO", {}), "anthropic/claude-sonnet-4.5");
  assert.equal(modelForTier("ELITE", {}), "anthropic/claude-opus-4.1");
  assert.equal(
    modelForTier("PRO", { OPENROUTER_MODEL_PRO: "openai/gpt-5-mini" }),
    "openai/gpt-5-mini",
  );
  assert.equal(
    modelCacheIdentity("FREE", { OPENROUTER_MODEL_FREE: "google/gemini-2.5-flash" }),
    "openrouter:google/gemini-2.5-flash",
  );
});

test("extracts assistant text from OpenRouter response content", () => {
  assert.equal(extractOpenRouterText("  plain response  "), "plain response");
  assert.equal(extractOpenRouterText([
    { type: "text", text: "first " },
    { type: "image_url", imageUrl: "ignored" },
    { type: "text", text: "second" },
  ]), "first second");
  assert.equal(extractOpenRouterText(null), "");
});

test("maps OpenRouter and transport failures to stable public error codes", () => {
  assert.equal(openRouterErrorCode({ statusCode: 401 }), "AI_AUTH_FAILED");
  assert.equal(openRouterErrorCode({ statusCode: 402 }), "AI_CREDITS_EXHAUSTED");
  assert.equal(openRouterErrorCode({ statusCode: 429 }), "AI_RATE_LIMITED");
  assert.equal(openRouterErrorCode({ statusCode: 529 }), "AI_PROVIDER_UNAVAILABLE");
  assert.equal(openRouterErrorCode(Object.assign(new Error(), { name: "RequestTimeoutError" })), "AI_TIMEOUT");
  assert.equal(openRouterErrorCode(Object.assign(new Error(), { name: "ConnectionError" })), "AI_PROVIDER_UNAVAILABLE");
  assert.equal(openRouterErrorCode(new Error("unknown")), "AI_REQUEST_FAILED");
});
