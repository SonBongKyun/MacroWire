import { parseWebhookUrl } from "../security/outbound-url";
import type { ImportanceTier } from "../news/importance";
import type { WireSourceTier } from "../ingest/sourceTiers";
import { isBreakingArticle } from "../news/signal";
import { extractKeywords, isStrongKeyword } from "../clustering/cluster";

const DEFAULT_TIERS: readonly WireSourceTier[] = ["T0", "T1"];
const DEFAULT_MIN_SCORE = 55;
const DEFAULT_MAX_AGE_MINUTES = 30;
const DEFAULT_MAX_ARTICLES = 5;
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;

export interface DiscordAlertArticle {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceTier: WireSourceTier;
  publishedAt: string;
  importanceTier: ImportanceTier;
  importanceScore: number;
  importanceReasons: string[];
  summary: string | null;
  tags: string[];
}

export interface DiscordAlertConfig {
  webhookUrl: URL;
  sourceTiers: Set<WireSourceTier>;
  minScore: number;
  maxAgeMinutes: number;
  maxArticles: number;
  username: string;
}

export interface DiscordDeliveryResult {
  configured: boolean;
  considered: number;
  selected: number;
  delivered: number;
  suppressed: number;
  attempts: number;
  error?: string;
}

export interface DiscordEventMemory {
  recent: Array<{ article: DiscordAlertArticle; reservedAt: number }>;
}

interface DeliveryOptions {
  env?: Record<string, string | undefined>;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  sleep?: (delayMs: number) => Promise<void>;
  logger?: Pick<Console, "info" | "warn" | "error">;
  eventMemory?: DiscordEventMemory;
}

interface DiscordWebhookPayload {
  username: string;
  content: string;
  allowed_mentions: { parse: string[] };
  embeds: Array<{
    title: string;
    url: string;
    color: number;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    timestamp: string;
    footer: { text: string };
  }>;
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function parseSourceTiers(raw: string | undefined): Set<WireSourceTier> {
  const allowed = new Set<WireSourceTier>();
  const values = raw?.split(",") ?? DEFAULT_TIERS;
  for (const value of values) {
    const tier = value.trim().toUpperCase();
    if (tier === "T0" || tier === "T1" || tier === "T2" || tier === "T3") {
      allowed.add(tier);
    }
  }
  return allowed.size > 0 ? allowed : new Set(DEFAULT_TIERS);
}

function validateDiscordWebhookUrl(raw: string): URL {
  const url = parseWebhookUrl(raw);
  if (!/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[^/]+\/?$/.test(url.pathname)) {
    throw new Error("DISCORD_WEBHOOK_URL must be a Discord incoming webhook URL");
  }
  return url;
}

export function loadDiscordAlertConfig(
  env: Record<string, string | undefined> = process.env,
): DiscordAlertConfig | null {
  const rawUrl = env.DISCORD_WEBHOOK_URL?.trim();
  if (!rawUrl || env.DISCORD_ALERTS_ENABLED?.trim().toLowerCase() === "false") return null;

  return {
    webhookUrl: validateDiscordWebhookUrl(rawUrl),
    sourceTiers: parseSourceTiers(env.DISCORD_ALERT_SOURCE_TIERS),
    minScore: boundedInteger(env.DISCORD_ALERT_MIN_SCORE, DEFAULT_MIN_SCORE, 0, 100),
    maxAgeMinutes: boundedInteger(
      env.DISCORD_ALERT_MAX_AGE_MINUTES,
      DEFAULT_MAX_AGE_MINUTES,
      1,
      24 * 60,
    ),
    maxArticles: boundedInteger(env.DISCORD_ALERT_MAX_ARTICLES, DEFAULT_MAX_ARTICLES, 1, 10),
    username: env.DISCORD_WEBHOOK_USERNAME?.trim().slice(0, 80) || "MacroWire",
  };
}

function importanceRank(tier: ImportanceTier): number {
  if (tier === "critical") return 2;
  if (tier === "major") return 1;
  return 0;
}

const EVENT_WINDOW_MS = 30 * 60_000;
const defaultEventMemory: DiscordEventMemory = { recent: [] };

export function createDiscordEventMemory(): DiscordEventMemory {
  return { recent: [] };
}

function sameAlertEvent(left: DiscordAlertArticle, right: DiscordAlertArticle): boolean {
  const leftTime = new Date(left.publishedAt).getTime();
  const rightTime = new Date(right.publishedAt).getTime();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime) || Math.abs(leftTime - rightTime) > EVENT_WINDOW_MS) {
    return false;
  }
  const leftTags = new Set(left.tags.filter((tag) => tag !== "속보"));
  const sharedTags = right.tags.filter((tag) => tag !== "속보" && leftTags.has(tag));
  const leftWords = extractKeywords(left.title);
  const sharedWords = [...extractKeywords(right.title)].filter((word) => leftWords.has(word) && isStrongKeyword(word));
  return sharedWords.length >= 3 || (sharedTags.length > 0 && sharedWords.length >= 1);
}

function reserveDiscordEvents(
  articles: DiscordAlertArticle[],
  memory: DiscordEventMemory,
  now: Date,
): { reserved: DiscordAlertArticle[]; suppressed: number } {
  const cutoff = now.getTime() - EVENT_WINDOW_MS;
  memory.recent = memory.recent.filter((entry) => entry.reservedAt >= cutoff);
  const reserved: DiscordAlertArticle[] = [];

  for (const article of articles) {
    if (memory.recent.some((entry) => sameAlertEvent(entry.article, article))) continue;
    memory.recent.push({ article, reservedAt: now.getTime() });
    reserved.push(article);
  }

  return { reserved, suppressed: articles.length - reserved.length };
}

function releaseDiscordEvents(memory: DiscordEventMemory, articles: DiscordAlertArticle[]): void {
  const ids = new Set(articles.map((article) => article.id));
  memory.recent = memory.recent.filter((entry) => !ids.has(entry.article.id));
}

export function selectDiscordAlertArticles(
  articles: DiscordAlertArticle[],
  config: DiscordAlertConfig,
  now = new Date(),
): { selected: DiscordAlertArticle[]; suppressed: number } {
  const cutoff = now.getTime() - config.maxAgeMinutes * 60_000;
  const unique = new Map<string, DiscordAlertArticle>();

  for (const article of articles) {
    const publishedAt = new Date(article.publishedAt).getTime();
    if (
      unique.has(article.id) ||
      !config.sourceTiers.has(article.sourceTier) ||
      !isBreakingArticle(article) ||
      article.importanceScore < config.minScore ||
      !Number.isFinite(publishedAt) ||
      publishedAt < cutoff
    ) {
      continue;
    }
    unique.set(article.id, article);
  }

  const eligible = [...unique.values()].sort((a, b) =>
    importanceRank(b.importanceTier) - importanceRank(a.importanceTier) ||
    b.importanceScore - a.importanceScore ||
    b.publishedAt.localeCompare(a.publishedAt),
  );

  const collapsed: DiscordAlertArticle[] = [];
  for (const article of eligible) {
    if (collapsed.some((existing) => sameAlertEvent(existing, article))) continue;
    collapsed.push(article);
  }

  return {
    selected: collapsed.slice(0, config.maxArticles),
    suppressed: Math.max(0, eligible.length - Math.min(collapsed.length, config.maxArticles)),
  };
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function importanceLabel(tier: ImportanceTier): string {
  if (tier === "critical") return "긴급";
  if (tier === "major") return "주요";
  return "일반";
}

function importanceColor(tier: ImportanceTier): number {
  if (tier === "critical") return 0xef4444;
  if (tier === "major") return 0xf59e0b;
  return 0x72aef8;
}

export function buildDiscordWebhookPayload(
  articles: DiscordAlertArticle[],
  config: Pick<DiscordAlertConfig, "username">,
  suppressed = 0,
): DiscordWebhookPayload {
  const countLabel = articles.length === 1 ? "새 속보 1건" : `새 속보 ${articles.length}건`;
  const suppressedLabel = suppressed > 0 ? ` · 우선순위 밖 ${suppressed}건 생략` : "";

  return {
    username: config.username,
    content: `⚡ **MacroWire ${countLabel}**${suppressedLabel}`,
    allowed_mentions: { parse: [] },
    embeds: articles.map((article) => ({
      title: truncate(article.title, 256),
      url: article.url,
      color: importanceColor(article.importanceTier),
      fields: [
        { name: "출처", value: truncate(article.sourceName, 256), inline: true },
        {
          name: "중요도",
          value: `${importanceLabel(article.importanceTier)} · ${article.importanceScore}점`,
          inline: true,
        },
        {
          name: "판단 근거",
          value: truncate(article.importanceReasons.join(" · ") || "MacroWire 분류 규칙", 1_024),
          inline: false,
        },
      ],
      timestamp: article.publishedAt,
      footer: { text: `${article.sourceTier} · 새 기사만 전송` },
    })),
  };
}

async function retryDelayMs(response: Response | null, attempt: number): Promise<number> {
  if (response?.status === 429) {
    const retryAfterHeader = Number(response.headers.get("retry-after"));
    if (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0) {
      return Math.min(10_000, Math.max(250, retryAfterHeader * 1_000));
    }
    try {
      const body = await response.clone().json() as { retry_after?: number };
      if (Number.isFinite(body.retry_after) && Number(body.retry_after) > 0) {
        return Math.min(10_000, Math.max(250, Number(body.retry_after) * 1_000));
      }
    } catch {
      // Fall through to exponential backoff when Discord did not return JSON.
    }
  }
  return 750 * 2 ** (attempt - 1);
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function deliverDiscordAlerts(
  articles: DiscordAlertArticle[],
  options: DeliveryOptions = {},
): Promise<DiscordDeliveryResult> {
  const logger = options.logger ?? console;
  let config: DiscordAlertConfig | null;
  try {
    config = loadDiscordAlertConfig(options.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Discord alert configuration";
    logger.error(`[discord] ${message}`);
    return {
      configured: true,
      considered: articles.length,
      selected: 0,
      delivered: 0,
      suppressed: 0,
      attempts: 0,
      error: message,
    };
  }

  if (!config) {
    return {
      configured: false,
      considered: articles.length,
      selected: 0,
      delivered: 0,
      suppressed: 0,
      attempts: 0,
    };
  }

  const now = options.now?.() ?? new Date();
  const selection = selectDiscordAlertArticles(
    articles,
    config,
    now,
  );
  const eventMemory = options.eventMemory ?? defaultEventMemory;
  const reservation = reserveDiscordEvents(selection.selected, eventMemory, now);
  const selected = reservation.reserved;
  const suppressed = selection.suppressed + reservation.suppressed;
  if (selected.length === 0) {
    return {
      configured: true,
      considered: articles.length,
      selected: 0,
      delivered: 0,
      suppressed,
      attempts: 0,
    };
  }

  const payload = buildDiscordWebhookPayload(selected, config, suppressed);
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    let response: Response | null = null;
    try {
      response = await fetchImpl(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (response.ok) {
        logger.info(`[discord] delivered ${selected.length} alert(s) in ${attempts} attempt(s)`);
        return {
          configured: true,
          considered: articles.length,
          selected: selected.length,
          delivered: selected.length,
          suppressed,
          attempts,
        };
      }
      if (!shouldRetry(response.status) || attempt === MAX_ATTEMPTS) {
        throw new Error(`Discord webhook rejected the request (${response.status})`);
      }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS || (response && !shouldRetry(response.status))) {
        const message = error instanceof Error ? error.message : "Discord webhook request failed";
        releaseDiscordEvents(eventMemory, selected);
        logger.error(`[discord] delivery failed after ${attempts} attempt(s): ${message}`);
        return {
          configured: true,
          considered: articles.length,
          selected: selected.length,
          delivered: 0,
          suppressed,
          attempts,
          error: message,
        };
      }
      logger.warn(`[discord] transient delivery failure; retrying (${attempt}/${MAX_ATTEMPTS})`);
    }

    await sleep(await retryDelayMs(response, attempt));
  }

  releaseDiscordEvents(eventMemory, selected);
  return {
    configured: true,
    considered: articles.length,
    selected: selected.length,
    delivered: 0,
    suppressed,
    attempts,
    error: "Discord webhook request failed",
  };
}
