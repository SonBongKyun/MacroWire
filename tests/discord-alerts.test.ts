import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordWebhookPayload,
  deliverDiscordAlerts,
  loadDiscordAlertConfig,
  selectDiscordAlertArticles,
  type DiscordAlertArticle,
} from "../src/lib/alerts/discord";

const webhookUrl = "https://discord.com/api/webhooks/123456789/test-token";
const now = new Date("2026-08-11T12:00:00.000Z");

function article(overrides: Partial<DiscordAlertArticle> = {}): DiscordAlertArticle {
  return {
    id: "article-1",
    title: "Federal Reserve cuts rates by 25 basis points",
    url: "https://example.com/fed",
    sourceName: "Federal Reserve",
    sourceTier: "T0",
    publishedAt: "2026-08-11T11:55:00.000Z",
    importanceTier: "critical",
    importanceScore: 84,
    importanceReasons: ["공식 발표", "금리 정책", "30분 이내"],
    ...overrides,
  };
}

test("loads a Discord-only webhook config without exposing unrelated hosts", () => {
  const config = loadDiscordAlertConfig({ DISCORD_WEBHOOK_URL: webhookUrl });
  assert.ok(config);
  assert.deepEqual([...config.sourceTiers], ["T0", "T1"]);
  assert.equal(config.minScore, 55);
  assert.equal(config.maxArticles, 5);
  assert.throws(
    () => loadDiscordAlertConfig({ DISCORD_WEBHOOK_URL: "https://hooks.slack.com/services/test" }),
    /Discord incoming webhook URL/,
  );
});

test("selects only fresh high-signal configured tiers and caps bursts", () => {
  const config = loadDiscordAlertConfig({
    DISCORD_WEBHOOK_URL: webhookUrl,
    DISCORD_ALERT_MAX_ARTICLES: "2",
  });
  assert.ok(config);

  const { selected, suppressed } = selectDiscordAlertArticles([
    article(),
    article({ id: "article-2", title: "Breaking CPI", sourceTier: "T1", importanceScore: 72 }),
    article({ id: "article-3", title: "ECB statement", importanceScore: 60 }),
    article({ id: "old", publishedAt: "2026-08-11T10:00:00.000Z" }),
    article({ id: "low", importanceScore: 20 }),
    article({ id: "borderline", importanceScore: 54 }),
    article({ id: "background", sourceTier: "T3" }),
  ], config, now);

  assert.deepEqual(selected.map((item) => item.id), ["article-1", "article-2"]);
  assert.equal(suppressed, 1);
});

test("builds mention-safe Discord embeds with source and importance context", () => {
  const config = loadDiscordAlertConfig({ DISCORD_WEBHOOK_URL: webhookUrl });
  assert.ok(config);
  const payload = buildDiscordWebhookPayload([article({ title: "@everyone Fed decision" })], config);

  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.equal(payload.embeds[0].url, "https://example.com/fed");
  assert.match(payload.embeds[0].fields[1].value, /84점/);
  assert.match(payload.embeds[0].fields[2].value, /공식 발표/);
});

test("retries Discord rate limits and succeeds without delaying tests", async () => {
  const responses = [
    new Response(JSON.stringify({ retry_after: 0.01 }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }),
    new Response(null, { status: 204 }),
  ];
  const delays: number[] = [];
  const logs: string[] = [];

  const result = await deliverDiscordAlerts([article()], {
    env: { DISCORD_WEBHOOK_URL: webhookUrl },
    now: () => now,
    fetchImpl: async () => responses.shift()!,
    sleep: async (delay) => { delays.push(delay); },
    logger: {
      info: (message) => logs.push(String(message)),
      warn: (message) => logs.push(String(message)),
      error: (message) => logs.push(String(message)),
    },
  });

  assert.equal(result.delivered, 1);
  assert.equal(result.attempts, 2);
  assert.deepEqual(delays, [250]);
  assert.ok(logs.every((entry) => !entry.includes("test-token")));
});

test("keeps ingestion callers alive when Discord rejects a request", async () => {
  const result = await deliverDiscordAlerts([article()], {
    env: { DISCORD_WEBHOOK_URL: webhookUrl },
    now: () => now,
    fetchImpl: async () => new Response(null, { status: 401 }),
    sleep: async () => {},
    logger: { info() {}, warn() {}, error() {} },
  });

  assert.equal(result.delivered, 0);
  assert.equal(result.attempts, 1);
  assert.match(result.error ?? "", /401/);
});
