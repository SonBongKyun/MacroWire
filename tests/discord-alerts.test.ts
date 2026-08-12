import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordWebhookPayload,
  createDiscordEventMemory,
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
    summary: "The Federal Reserve announced a policy decision.",
    tags: ["속보", "연준", "금리"],
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

test("collapses the same event reported by several outlets inside one alert burst", () => {
  const config = loadDiscordAlertConfig({ DISCORD_WEBHOOK_URL: webhookUrl });
  assert.ok(config);
  const { selected, suppressed } = selectDiscordAlertArticles([
    article({ id: "fed-a", sourceName: "Bloomberg Markets", sourceTier: "T1", title: "Federal Reserve cuts interest rates by 25 basis points" }),
    article({ id: "fed-b", sourceName: "CNBC Breaking", sourceTier: "T1", title: "Fed cuts interest rate by a quarter point" }),
    article({ id: "oil", sourceName: "CNBC Breaking", sourceTier: "T1", title: "WTI oil rises as OPEC supply tightens", tags: ["속보", "에너지"] }),
  ], config, now);

  assert.deepEqual(selected.map((item) => item.id), ["fed-a", "oil"]);
  assert.equal(suppressed, 1);
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
    eventMemory: createDiscordEventMemory(),
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
    eventMemory: createDiscordEventMemory(),
  });

  assert.equal(result.delivered, 0);
  assert.equal(result.attempts, 1);
  assert.match(result.error ?? "", /401/);
});

test("suppresses the same event across sequential worker deliveries", async () => {
  const eventMemory = createDiscordEventMemory();
  let deliveries = 0;
  const options = {
    env: { DISCORD_WEBHOOK_URL: webhookUrl },
    now: () => now,
    fetchImpl: async () => {
      deliveries += 1;
      return new Response(null, { status: 204 });
    },
    logger: { info() {}, warn() {}, error() {} },
    eventMemory,
  };

  const first = await deliverDiscordAlerts([
    article({ id: "fed-a", sourceName: "Bloomberg Markets", sourceTier: "T1" }),
  ], options);
  const second = await deliverDiscordAlerts([
    article({
      id: "fed-b",
      sourceName: "CNBC Breaking",
      sourceTier: "T1",
      title: "Federal Reserve cuts interest rates by 25 basis points",
    }),
  ], options);

  assert.equal(first.delivered, 1);
  assert.equal(second.delivered, 0);
  assert.equal(second.suppressed, 1);
  assert.equal(deliveries, 1);
});
