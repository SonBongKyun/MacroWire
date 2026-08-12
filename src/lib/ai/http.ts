import { NextResponse } from "next/server";

const STATUS_BY_CODE: Record<string, number> = {
  AI_NOT_CONFIGURED: 503,
  AI_AUTH_FAILED: 503,
  AI_CREDITS_EXHAUSTED: 503,
  AI_RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_BAD_RESPONSE: 502,
  AI_EMPTY_RESPONSE: 502,
  AI_BAD_JSON: 502,
  AI_BAD_OUTPUT: 502,
};

export function aiErrorResponse(context: string, error: unknown): NextResponse {
  const code = error instanceof Error && error.message.startsWith("AI_")
    ? error.message
    : "AI_REQUEST_FAILED";
  const status = STATUS_BY_CODE[code] ?? 502;
  console.error(`[${context}] ${code}`);
  return NextResponse.json({ error: code }, { status });
}
