import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { authorizeCron } from "../src/lib/security/cron";

test("cron authorization fails closed when the secret is missing", () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  const response = authorizeCron(new NextRequest("https://example.com/api/cron"));
  assert.equal(response?.status, 503);
  if (previous) process.env.CRON_SECRET = previous;
});

test("cron authorization accepts only the configured bearer token", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";
  const denied = authorizeCron(new NextRequest("https://example.com/api/cron"));
  const allowed = authorizeCron(
    new NextRequest("https://example.com/api/cron", {
      headers: { authorization: "Bearer test-secret" },
    })
  );
  assert.equal(denied?.status, 401);
  assert.equal(allowed, null);
  if (previous) process.env.CRON_SECRET = previous;
  else delete process.env.CRON_SECRET;
});
