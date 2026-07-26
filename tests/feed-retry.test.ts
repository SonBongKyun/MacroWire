import assert from "node:assert/strict";
import test from "node:test";
import { withFeedRetry } from "../src/lib/ingest/feedRetry";

const instantRetry = { attempts: 3, baseDelayMs: 0, jitterMs: 0 };

test("feed retry recovers from transient failures", async () => {
  let attempts = 0;
  const result = await withFeedRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error("read ECONNRESET");
    return "ok";
  }, instantRetry);

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("feed retry retries HTTP 429 but not HTTP 403", async () => {
  let rateLimitedAttempts = 0;
  await assert.rejects(
    withFeedRetry(async () => {
      rateLimitedAttempts++;
      throw new Error("Status code 429");
    }, instantRetry),
  );
  assert.equal(rateLimitedAttempts, 3);

  let forbiddenAttempts = 0;
  await assert.rejects(
    withFeedRetry(async () => {
      forbiddenAttempts++;
      throw new Error("Status code 403");
    }, instantRetry),
  );
  assert.equal(forbiddenAttempts, 1);
});
