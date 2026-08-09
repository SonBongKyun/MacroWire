/**
 * Cooldown for the client-driven breaking pulse.
 *
 * The open app asks the server to refresh the breaking queue while someone is
 * watching. That request has to be cheap to refuse: several tabs, several
 * subscribers and a background timer all point at the same endpoint, and each
 * real pulse costs two RSS fetches and a write to Neon.
 *
 * Module state is per serverless instance, not global, so this is a damper
 * rather than a hard lock — enough to collapse a burst from one client into one
 * fetch. The endpoint is session-gated on top of it.
 */

const DEFAULT_COOLDOWN_MS = 45_000;

interface GateState {
  lastRunAt: number;
  inFlight: Promise<unknown> | null;
}

const state: GateState = { lastRunAt: 0, inFlight: null };

export interface PulseDecision {
  /** Whether the caller should actually run the ingest. */
  run: boolean;
  /** Milliseconds until the next pulse is allowed. */
  retryInMs: number;
}

export function shouldPulse(
  now = Date.now(),
  cooldownMs = DEFAULT_COOLDOWN_MS
): PulseDecision {
  const elapsed = now - state.lastRunAt;
  if (elapsed >= cooldownMs) {
    return { run: true, retryInMs: 0 };
  }
  return { run: false, retryInMs: cooldownMs - elapsed };
}

export function markPulsed(now = Date.now()): void {
  state.lastRunAt = now;
}

/**
 * Run `task`, collapsing concurrent callers onto the same promise.
 *
 * Two tabs pulsing in the same second should produce one ingest, not two
 * racing writes.
 */
export async function withPulseLock<T>(task: () => Promise<T>): Promise<T> {
  if (state.inFlight) {
    return state.inFlight as Promise<T>;
  }
  const run = task().finally(() => {
    state.inFlight = null;
    markPulsed();
  });
  state.inFlight = run;
  return run;
}

/** Test seam. */
export function resetPulseGate(): void {
  state.lastRunAt = 0;
  state.inFlight = null;
}
