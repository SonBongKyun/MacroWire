import assert from "node:assert/strict";
import test from "node:test";
import {
  isPrivateIp,
  parsePublicHttpUrl,
  parseWebhookUrl,
} from "../src/lib/security/outbound-url";

test("private and loopback addresses are rejected", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.1.1", "192.168.1.1", "169.254.1.1", "::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateIp(address), true, address);
  }
  assert.throws(() => parsePublicHttpUrl("http://127.0.0.1/admin"));
  assert.throws(() => parsePublicHttpUrl("http://localhost:3000"));
});

test("public article URLs allow only HTTP and HTTPS", () => {
  assert.equal(parsePublicHttpUrl("https://example.com/news").hostname, "example.com");
  assert.throws(() => parsePublicHttpUrl("file:///etc/passwd"));
  assert.throws(() => parsePublicHttpUrl("https://user:pass@example.com"));
});

test("webhooks are restricted to supported HTTPS providers", () => {
  assert.equal(parseWebhookUrl("https://hooks.slack.com/services/a/b/c").hostname, "hooks.slack.com");
  assert.equal(parseWebhookUrl("https://discord.com/api/webhooks/1/token").hostname, "discord.com");
  assert.throws(() => parseWebhookUrl("http://hooks.slack.com/services/a/b/c"));
  assert.throws(() => parseWebhookUrl("https://example.com/webhook"));
});
