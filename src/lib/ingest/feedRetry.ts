const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);

function isRetryableFeedError(error: unknown): boolean {
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

      const delayMs = baseDelayMs * (2 ** attempt)
        + Math.floor(Math.random() * jitterMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
