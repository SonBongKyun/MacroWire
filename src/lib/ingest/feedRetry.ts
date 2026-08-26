const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);

export class FeedHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "FeedHttpError";
  }
}

export function parseRetryAfterMs(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30 * 60_000);
  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, Math.min(dateMs - now, 30 * 60_000));
}

function retryAfterFromError(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("retryAfterMs" in error)) return null;
  const value = Number((error as { retryAfterMs?: unknown }).retryAfterMs);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function isRetryableFeedError(error: unknown): boolean {
  if (error instanceof FeedHttpError) {
    return error.status >= 500 || RETRYABLE_HTTP_STATUSES.has(error.status);
  }
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/Status code (\d{3})/i);
  if (!status) return true;

  const code = Number(status[1]);
  return code >= 500 || RETRYABLE_HTTP_STATUSES.has(code);
}

export async function withFeedRetry<T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    baseDelayMs = 750,
    jitterMs = 500,
  }: {
    attempts?: number;
    baseDelayMs?: number;
    jitterMs?: number;
  } = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isRetryableFeedError(error)) throw error;

      const backoffMs = baseDelayMs * (2 ** attempt)
        + Math.floor(Math.random() * Math.max(0, jitterMs));
      const retryAfterMs = retryAfterFromError(error) ?? 0;
      const delayMs = Math.max(backoffMs, retryAfterMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
